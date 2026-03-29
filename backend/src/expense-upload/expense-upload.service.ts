import { BadRequestException, Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';

export interface ValidationError {
  rowNumber: number;
  field: string;
  value: string;
  error: string;
}

export interface ParsedRow {
  rowNumber: number;
  id: string;
  date: string;
  amount: string;
  account: string;
  category: string;
  note: string;
  userName: string;
  delete: string;
}

@Injectable()
export class ExpenseUploadService {
  constructor(private prisma: PrismaService) {}

  private async getLeafCategoriesWithFullPath() {
    const categories = await this.prisma.category_master.findMany({
      select: {
        id: true,
        name: true,
        level: true,
        parentId: true,
        children: {
          select: { id: true },
        },
        parent: {
          select: {
            id: true,
            name: true,
            level: true,
            parent: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return categories
      .filter((cat) => cat.children.length === 0)
      .map((cat) => {
        let fullPath: string | null = null;

        if (cat.parent) {
          if (cat.parent.level === 1) {
            fullPath = `${cat.parent.name} > ${cat.name}`;
          } else if (cat.parent.level === 2 && cat.parent.parent) {
            fullPath = `${cat.parent.parent.name} > ${cat.parent.name} > ${cat.name}`;
          } else if (cat.parent.level === 2) {
            fullPath = `${cat.parent.name} > ${cat.name}`;
          }
        } else {
          fullPath = cat.name;
        }

        return {
          id: cat.id,
          name: cat.name,
          level: cat.level,
          parentId: cat.parentId,
          fullPath,
        };
      });
  }

  async generateTemplate(year?: number, month?: number): Promise<Buffer> {
    const [accounts, leafCategories] = await Promise.all([
      this.prisma.account_master.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.getLeafCategoriesWithFullPath(),
    ]);

    const accountMap = new Map(
      accounts.map((a) => [a.id, `${a.name}--${a.id}`]),
    );
    const categoryMap = new Map(
      leafCategories.map((c) => [c.id, `${c.fullPath}--${c.id}`]),
    );

    let expenses: {
      id: number;
      date: Date;
      amount: number;
      accountId: number | null;
      categoryId: number;
      remarks: string | null;
      userName: string | null;
    }[] = [];

    if (year && month) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      expenses = await this.prisma.expenses_data_master.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          date: true,
          amount: true,
          accountId: true,
          categoryId: true,
          remarks: true,
          userName: true,
        },
        orderBy: { date: 'asc' },
      });
    }

    const workbook = new ExcelJS.Workbook();

    const dataSheet = workbook.addWorksheet('Expenses');
    const listsSheet = workbook.addWorksheet('Lists');

    listsSheet.columns = [
      { header: 'AccountName--AccountId', key: 'account', width: 40 },
      { header: 'CategoryName--CategoryId', key: 'category', width: 50 },
    ];

    const accountOptions = accounts.map((a) => `${a.name}--${a.id}`);
    const categoryOptions = leafCategories.map((c) => `${c.fullPath}--${c.id}`);

    let rowNum = 2;
    const maxOptions = Math.max(accountOptions.length, categoryOptions.length);
    for (let i = 0; i < maxOptions; i++) {
      if (i < accountOptions.length) {
        listsSheet.getCell(`A${rowNum}`).value = accountOptions[i];
      }
      if (i < categoryOptions.length) {
        listsSheet.getCell(`B${rowNum}`).value = categoryOptions[i];
      }
      rowNum++;
    }

    listsSheet.getColumn(1).width = 40;
    listsSheet.getColumn(2).width = 50;

    dataSheet.columns = [
      { header: 'id', key: 'id', width: 15 },
      { header: 'date', key: 'date', width: 15 },
      { header: 'amount', key: 'amount', width: 15 },
      { header: 'account', key: 'account', width: 30 },
      { header: 'category', key: 'category', width: 40 },
      { header: 'note', key: 'note', width: 30 },
      { header: 'userName', key: 'userName', width: 25 },
      { header: 'delete', key: 'delete', width: 10 },
    ];

    const headerRow = dataSheet.getRow(1);
    headerRow.font = { bold: true, size: 12 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9D9D9' },
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 25;

    dataSheet.getCell('A1').value = 'id (blank=new, filled=update)';
    dataSheet.getCell('F1').value = 'note';
    dataSheet.getCell('G1').value = 'userName (who you sent money to)';
    dataSheet.getCell('H1').value = 'delete (yes=delete if id provided)';

    dataSheet.views = [{ state: 'frozen', ySplit: 1 }];

    const startRow = 2;
    expenses.forEach((expense, index) => {
      const rowIndex = startRow + index;
      dataSheet.getCell(`A${rowIndex}`).value = expense.id;
      dataSheet.getCell(`B${rowIndex}`).value = expense.date
        .toISOString()
        .split('T')[0];
      dataSheet.getCell(`C${rowIndex}`).value = expense.amount;
      dataSheet.getCell(`D${rowIndex}`).value = expense.accountId
        ? accountMap.get(expense.accountId) || ''
        : '';
      dataSheet.getCell(`E${rowIndex}`).value = expense.categoryId
        ? categoryMap.get(expense.categoryId) || ''
        : '';
      dataSheet.getCell(`F${rowIndex}`).value = expense.remarks || '';
      dataSheet.getCell(`G${rowIndex}`).value = expense.userName || '';
    });

    const totalRows = Math.max(startRow + expenses.length, 100);
    for (let row = startRow + expenses.length; row <= totalRows; row++) {
      // Column B: date - date validation
      const dateCell = dataSheet.getCell(`B${row}`);
      dateCell.dataValidation = {
        type: 'date',
        operator: 'greaterThan',
        formulae: ['1900-01-01'],
        allowBlank: true,
      };

      // Column D: account - list validation
      const accountCell = dataSheet.getCell(`D${row}`);
      accountCell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['Lists!$A$2:$A$' + (accounts.length + 1)],
        showErrorMessage: true,
        errorTitle: 'Invalid Entry',
        error: 'Please select an account from the dropdown.',
      };

      // Column E: category - list validation
      const categoryCell = dataSheet.getCell(`E${row}`);
      categoryCell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['Lists!$B$2:$B$' + (leafCategories.length + 1)],
        showErrorMessage: true,
        errorTitle: 'Invalid Entry',
        error: 'Please select a category from the dropdown.',
      };

      // Column H: delete - list validation (yes/no)
      const deleteCell = dataSheet.getCell(`H${row}`);
      deleteCell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"yes,"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Entry',
        error: 'Enter "yes" to delete or leave blank.',
      };

      // Initialize empty cells
      dataSheet.getCell(`F${row}`).value = '';
      dataSheet.getCell(`G${row}`).value = '';
    }

    for (let row = startRow; row <= startRow + expenses.length - 1; row++) {
      // Column B: date - date validation
      const dateCell = dataSheet.getCell(`B${row}`);
      dateCell.dataValidation = {
        type: 'date',
        operator: 'greaterThan',
        formulae: ['1900-01-01'],
        allowBlank: true,
      };

      // Column D: account - list validation
      const accountCell = dataSheet.getCell(`D${row}`);
      accountCell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['Lists!$A$2:$A$' + (accounts.length + 1)],
        showErrorMessage: true,
        errorTitle: 'Invalid Entry',
        error: 'Please select an account from the dropdown.',
      };

      // Column E: category - list validation
      const categoryCell = dataSheet.getCell(`E${row}`);
      categoryCell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['Lists!$B$2:$B$' + (leafCategories.length + 1)],
        showErrorMessage: true,
        errorTitle: 'Invalid Entry',
        error: 'Please select a category from the dropdown.',
      };

      // Column H: delete - list validation (yes/no)
      const deleteCell = dataSheet.getCell(`H${row}`);
      deleteCell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"yes,"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Entry',
        error: 'Enter "yes" to delete or leave blank.',
      };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer as ArrayBuffer);
  }

  async parseAndValidate(fileBuffer: Buffer): Promise<{
    success: boolean;
    errors: ValidationError[];
    validRows: ParsedRow[];
  }> {
    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.load(fileBuffer as unknown as ArrayBuffer);

    const dataSheet = workbook.getWorksheet('Expenses');
    if (!dataSheet) {
      throw new BadRequestException('Expenses sheet not found in the file');
    }

    const [accounts, leafCategories, existingExpenses] = await Promise.all([
      this.prisma.account_master.findMany({
        select: { id: true, name: true },
      }),
      this.getLeafCategoriesWithFullPath(),
      this.prisma.expenses_data_master.findMany({
        select: { id: true },
      }),
    ]);

    const accountIds = new Set(accounts.map((a) => String(a.id)));
    const categoryIds = new Set(leafCategories.map((c) => String(c.id)));
    const expenseIds = new Set(existingExpenses.map((e) => e.id));

    const errors: ValidationError[] = [];
    const validRows: ParsedRow[] = [];
    const usedIds = new Set<number>();

    const colIndex = new Map<string, number>();
    const validColNames = [
      'id',
      'date',
      'amount',
      'account',
      'category',
      'note',
      'username', // lowercase for matching
      'delete',
    ];
    const headerRow = dataSheet.getRow(1);
    const headerValues = headerRow.values as
      | (string | number | null | undefined)[]
      | undefined;
    console.log('Header values:', headerValues);
    if (headerValues) {
      headerValues.forEach((val, idx) => {
        if (val && typeof val === 'string') {
          const colName = val.toLowerCase().split('(')[0].trim();
          console.log(`Column ${idx}: "${val}" -> "${colName}"`);
          if (validColNames.includes(colName)) {
            colIndex.set(colName, idx);
          }
        }
      });
    }
    console.log('Column index map:', Object.fromEntries(colIndex));

    const getCellValue = (
      cells: (string | number | null | undefined)[],
      colName: string,
    ): string => {
      const idx = colIndex.get(colName);
      if (idx === undefined) return '';
      return String(cells[idx] || '').trim();
    };

    const rows = dataSheet.getRows(2, dataSheet.rowCount - 1) || [];

    for (const row of rows) {
      const rowNumber = row.number;
      const cells = row.values as (string | number | null | undefined)[];

      const isBlank = cells.every(
        (c) => c === null || c === undefined || c === '',
      );
      if (isBlank) continue;

      const id = getCellValue(cells, 'id');
      const date = getCellValue(cells, 'date');
      const amount = getCellValue(cells, 'amount');
      const account = getCellValue(cells, 'account');
      const category = getCellValue(cells, 'category');
      const note = getCellValue(cells, 'note');
      // Try both 'username' and 'userName' (case insensitive)
      const userName = getCellValue(cells, 'username') || getCellValue(cells, 'userName');
      const deleteFlag = getCellValue(cells, 'delete').toLowerCase();

      const parsedRow: ParsedRow = {
        rowNumber,
        id,
        date,
        amount,
        account,
        category,
        note,
        userName,
        delete: deleteFlag,
      };

      if (id) {
        const numericId = parseInt(id, 10);
        if (isNaN(numericId) || !expenseIds.has(numericId)) {
          errors.push({
            rowNumber,
            field: 'id',
            value: id,
            error: 'Expense ID not found in database',
          });
        } else if (usedIds.has(numericId)) {
          errors.push({
            rowNumber,
            field: 'id',
            value: id,
            error: 'Duplicate ID in file',
          });
        } else {
          usedIds.add(numericId);
        }
      }

      if (!date) {
        errors.push({
          rowNumber,
          field: 'date',
          value: '',
          error: 'Date is required',
        });
      } else {
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
          errors.push({
            rowNumber,
            field: 'date',
            value: date,
            error: 'Invalid date format. Use YYYY-MM-DD',
          });
        } else if (dateObj > new Date()) {
          errors.push({
            rowNumber,
            field: 'date',
            value: date,
            error: 'Date cannot be in the future',
          });
        }
      }

      if (!id && !amount) {
        errors.push({
          rowNumber,
          field: 'amount',
          value: '',
          error: 'Amount is required for new entries',
        });
      } else if (amount) {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount)) {
          errors.push({
            rowNumber,
            field: 'amount',
            value: amount,
            error: 'Amount must be a valid number',
          });
        } else if (parsedAmount < 0) {
          errors.push({
            rowNumber,
            field: 'amount',
            value: amount,
            error: 'Amount cannot be negative',
          });
        }
      }

      if (!account) {
        errors.push({
          rowNumber,
          field: 'account',
          value: '',
          error: 'Account is required',
        });
      } else if (!account.includes('--')) {
        errors.push({
          rowNumber,
          field: 'account',
          value: account,
          error: 'Invalid account format. Use dropdown value.',
        });
      } else {
        const accountId = account.split('--').pop() || '';
        if (!accountIds.has(accountId)) {
          errors.push({
            rowNumber,
            field: 'account',
            value: account,
            error: 'Account ID not found in database',
          });
        }
      }

      if (!category) {
        errors.push({
          rowNumber,
          field: 'category',
          value: '',
          error: 'Category is required',
        });
      } else if (!category.includes('--')) {
        errors.push({
          rowNumber,
          field: 'category',
          value: category,
          error: 'Invalid category format. Use dropdown value.',
        });
      } else {
        const categoryId = category.split('--').pop() || '';
        if (!categoryIds.has(categoryId)) {
          errors.push({
            rowNumber,
            field: 'category',
            value: category,
            error: 'Category ID not found in database',
          });
        }
      }

      if (note.length > 500) {
        errors.push({
          rowNumber,
          field: 'note',
          value: note.substring(0, 50) + '...',
          error: 'Note exceeds maximum length of 500 characters',
        });
      }

      if (userName.length > 100) {
        errors.push({
          rowNumber,
          field: 'userName',
          value: userName.substring(0, 50) + '...',
          error: 'UserName exceeds maximum length of 100 characters',
        });
      }

      if (deleteFlag && deleteFlag !== 'yes') {
        errors.push({
          rowNumber,
          field: 'delete',
          value: deleteFlag,
          error: 'Delete must be "yes" or blank',
        });
      }

      if (errors.filter((e) => e.rowNumber === rowNumber).length === 0) {
        validRows.push(parsedRow);
      }
    }

    return {
      success: errors.length === 0,
      errors,
      validRows,
    };
  }

  async processUpload(fileBuffer: Buffer): Promise<{
    inserted: number;
    updated: number;
    deleted: number;
    errors: ValidationError[];
  }> {
    const { success, errors, validRows } =
      await this.parseAndValidate(fileBuffer);

    if (!success) {
      return { inserted: 0, updated: 0, deleted: 0, errors };
    }

    const accounts = await this.prisma.account_master.findMany({
      select: { id: true, name: true },
    });
    const leafCategories = await this.getLeafCategoriesWithFullPath();

    const accountMap = new Map(
      accounts.map((a) => [`${a.name}--${a.id}`, a.id]),
    );
    const categoryMap = new Map(
      leafCategories.map((c) => [`${c.fullPath}--${c.id}`, c.id]),
    );

    let inserted = 0;
    let updated = 0;
    let deleted = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const row of validRows) {
        const accountId = accountMap.get(row.account);
        const categoryId = categoryMap.get(row.category);

        if (row.id && row.delete === 'yes') {
          await tx.expenses_data_master.delete({
            where: { id: parseInt(row.id, 10) },
          });
          deleted++;
        } else if (row.id) {
          await tx.expenses_data_master.update({
            where: { id: parseInt(row.id, 10) },
            data: {
              date: new Date(row.date),
              amount: row.amount ? parseFloat(row.amount) : undefined,
              accountId: accountId || null,
              categoryId: categoryId!,
              remarks: row.note || null,
              userName: row.userName || null,
            },
          });
          updated++;
        } else {
          await tx.expenses_data_master.create({
            data: {
              date: new Date(row.date),
              amount: row.amount ? parseFloat(row.amount) : 0,
              accountId: accountId || null,
              categoryId: categoryId!,
              remarks: row.note || null,
              userName: row.userName || null,
            },
          });
          inserted++;
        }
      }
    });

    return { inserted, updated, deleted, errors };
  }
}
