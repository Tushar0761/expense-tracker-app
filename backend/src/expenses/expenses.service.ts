import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, spend_type } from '@prisma/client';
import {
  endOfDay,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateExpenseDto,
  ExpenseQueryDto,
  ExpenseSummaryQueryDto,
  SpendTypeFilter,
  SplitExpenseDto,
  UpdateExpenseDto,
} from './expenses.dto';

export type ExpenseRow = {
  id: number;
  date: string;
  amount: number;
  remarks: string | null;
  userName: string | null;
  accountId: number | null;
  accountName: string | null;
  categoryId: number;
  categoryName: string;
  spendType: spend_type | null;
  effectiveSpendType: spend_type;
  addedBy: string | null;
  createdAt: Date;
};

export const ADDED_BY = {
  SINGLE_ADD: 'SingleAdd',
  BULK_ADD: 'BulkAdd',
  EXCEL_UPLOAD: 'ExcelUpload',
} as const;

/** Builds "ExcelUpload:Bob" style values; falls back to "ExcelUpload:Unknown" for a blank source. */
export function buildExcelUploadAddedBy(source: string | null | undefined): string {
  const trimmed = source?.trim();
  if (!trimmed) return `${ADDED_BY.EXCEL_UPLOAD}:Unknown`;
  const normalized = trimmed[0].toUpperCase() + trimmed.slice(1).toLowerCase();
  return `${ADDED_BY.EXCEL_UPLOAD}:${normalized}`;
}

function resolveSpendType(
  expenseSpendType: spend_type | null | undefined,
  categorySpendType: spend_type | undefined,
): spend_type {
  return expenseSpendType ?? categorySpendType ?? 'DISCRETIONARY';
}

export type ExpenseSummaryPoint = {
  period: string;
  totalAmount: number;
  count: number;
};

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async createExpense(payload: CreateExpenseDto) {
    return this.prisma.$transaction(async (tx) => {
      const expense = await tx.expenses_data_master.create({
        data: {
          date: new Date(payload.date),
          amount: payload.amount,
          remarks: payload.remarks,
          accountId: payload.accountId,
          categoryId: payload.categoryId,
          userName: payload.userName,
          emiPaymentId: payload.emiPaymentId,
          spendType: payload.spendType,
          addedBy: ADDED_BY.SINGLE_ADD,
        },
        include: {
          category_master: true,
          account: true,
        },
      });

      return expense;
    });
  }

  async bulkCreateExpenses(payloads: CreateExpenseDto[]) {
    return this.prisma.$transaction(async (tx) => {
      const results = await Promise.all(
        payloads.map((payload) =>
          tx.expenses_data_master.create({
            data: {
              date: new Date(payload.date),
              amount: payload.amount,
              remarks: payload.remarks,
              accountId: payload.accountId,
              categoryId: payload.categoryId,
              userName: payload.userName,
              addedBy: ADDED_BY.BULK_ADD,
            },
          }),
        ),
      );
      return results;
    });
  }

  async getExpenses(query: ExpenseQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.expenses_data_masterWhereInput = {};

    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) where.date.gte = new Date(query.startDate);
      if (query.endDate) where.date.lte = endOfDay(new Date(query.endDate));
    }

    if (query.categoryId) {
      const categoryId = Number(query.categoryId);

      where.OR = [
        // Level 1 (selected)
        { categoryId },

        // Level 2 (children)
        {
          category_master: {
            parentId: categoryId,
          },
        },

        // Level 3 (grandchildren)
        {
          category_master: {
            parent: {
              parentId: categoryId,
            },
          },
        },
      ];
    }

    if (query.accountId) {
      where.accountId = Number(query.accountId);
    }

    if (query.userName) {
      where.userName = { contains: query.userName };
    }

    if (query.search) {
      where.remarks = { contains: query.search };
    }

    if (query.amountMin !== undefined || query.amountMax !== undefined) {
      where.amount = {};
      if (query.amountMin !== undefined) where.amount.gte = query.amountMin;
      if (query.amountMax !== undefined) where.amount.lte = query.amountMax;
    }

    const spendTypeWhere = this.buildSpendTypeWhere(query.spendTypeFilter);
    const excludeCategoryWhere = await this.buildExcludeCategoryWhere(
      query.excludeCategoryIds,
    );
    const extraFilters = [spendTypeWhere, excludeCategoryWhere].filter(
      (w) => Object.keys(w).length > 0,
    );
    if (extraFilters.length > 0) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        ...extraFilters,
      ];
    }

    const [data, total, sumOfExpense] = await Promise.all([
      this.prisma.expenses_data_master.findMany({
        where,
        include: {
          category_master: true,
          account: true,
        },
        orderBy: {
          [query.sortBy === 'amount' ? 'amount' : 'date']:
            query.sortOrder || 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.expenses_data_master.count({ where }),
      this.prisma.expenses_data_master.aggregate({
        where,
        _sum: { amount: true },
      }),
    ]);

    const rows: ExpenseRow[] = data.map((exp) => ({
      id: exp.id,
      date: format(exp.date, 'yyyy-MM-dd'),
      amount: exp.amount,
      remarks: exp.remarks,
      userName: exp.userName,
      accountId: exp.accountId,
      accountName: exp.account?.name ?? null,
      categoryId: exp.categoryId,
      categoryName: exp.category_master?.name ?? 'Unknown',
      spendType: exp.spendType,
      effectiveSpendType: resolveSpendType(exp.spendType, exp.category_master?.spendType),
      addedBy: exp.addedBy,
      createdAt: exp.createdAt,
    }));

    return {
      data: rows,
      sumOfExpense: sumOfExpense._sum.amount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getExpenseById(id: number) {
    const expense = await this.prisma.expenses_data_master.findUnique({
      where: { id },
      include: {
        category_master: true,
        account: true,
      },
    });
    if (!expense) throw new NotFoundException(`Expense #${id} not found`);
    return expense;
  }

  async updateExpense(id: number, payload: UpdateExpenseDto) {
    return this.prisma.$transaction(async (tx) => {
      const oldExpense = await tx.expenses_data_master.findUnique({
        where: { id },
      });
      if (!oldExpense) throw new NotFoundException('Expense not found');

      // Note: Account balance is manual - expenses do NOT auto-update balance

      // Update the expense record
      return tx.expenses_data_master.update({
        where: { id },
        data: {
          date: payload.date ? new Date(payload.date) : undefined,
          amount: payload.amount,
          remarks: payload.remarks,
          accountId: payload.accountId,
          categoryId: payload.categoryId,
          userName: payload.userName,
          spendType: payload.spendType,
        },
      });
    });
  }

  async deleteExpense(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const expense = await tx.expenses_data_master.findUnique({
        where: { id },
      });
      if (!expense) throw new NotFoundException('Expense not found');

      // Note: Account balance is manual - expenses do NOT auto-update balance

      return tx.expenses_data_master.delete({ where: { id } });
    });
  }

  async getExpenseSummary(
    query: ExpenseSummaryQueryDto,
  ): Promise<ExpenseSummaryPoint[]> {
    const where: Prisma.expenses_data_masterWhereInput = {};
    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) where.date.gte = new Date(query.startDate);
      if (query.endDate) where.date.lte = endOfDay(new Date(query.endDate));
    }
    const spendTypeWhere = this.buildSpendTypeWhere(query.spendTypeFilter);
    const excludeCategoryWhere = await this.buildExcludeCategoryWhere(
      query.excludeCategoryIds,
    );
    const extraFilters = [spendTypeWhere, excludeCategoryWhere].filter(
      (w) => Object.keys(w).length > 0,
    );
    if (extraFilters.length > 0) where.AND = extraFilters;

    const expenses = await this.prisma.expenses_data_master.findMany({
      where,
      select: { date: true, amount: true },
      orderBy: { date: 'asc' },
    });

    const grouped = new Map<string, { totalAmount: number; count: number }>();
    for (const exp of expenses) {
      const key = this.getPeriodKey(exp.date, query.granularity || 'month');
      const existing = grouped.get(key) || { totalAmount: 0, count: 0 };
      existing.totalAmount += exp.amount;
      existing.count += 1;
      grouped.set(key, existing);
    }

    return Array.from(grouped.entries()).map(([period, val]) => ({
      period,
      totalAmount: Math.round(val.totalAmount * 100) / 100,
      count: val.count,
    }));
  }

  private getPeriodKey(date: Date, granularity: string): string {
    switch (granularity) {
      case 'day':
        return format(startOfDay(date), 'yyyy-MM-dd');
      case 'week': {
        const s = startOfWeek(date, { weekStartsOn: 1 });
        return `Week ${format(s, 'dd MMM')}`;
      }
      case 'month':
        return format(startOfMonth(date), 'yyyy-MM');
      case 'year':
        return format(startOfYear(date), 'yyyy');
      default:
        return format(startOfMonth(date), 'yyyy-MM');
    }
  }

  private buildSpendTypeWhere(
    filter?: SpendTypeFilter,
  ): Prisma.expenses_data_masterWhereInput {
    if (!filter || filter === 'ALL') return {};
    if (filter === 'FIXED') {
      return {
        OR: [
          { spendType: 'FIXED' },
          { spendType: null, category_master: { spendType: 'FIXED' } },
        ],
      };
    }
    return {
      OR: [
        { spendType: 'DISCRETIONARY' },
        { spendType: null, category_master: { spendType: 'DISCRETIONARY' } },
      ],
    };
  }

  /**
   * Excludes a category and its full subtree (children + grandchildren).
   *
   * Resolves to concrete categoryIds and filters with `categoryId: { notIn }`
   * rather than `NOT: { category_master: { parentId: ... } } }` — Prisma
   * evaluates a NOT-wrapped nullable-relation field filter as "the relation
   * exists AND doesn't match", which silently drops every row whose category
   * has no parent (parentId: null) instead of keeping it. Resolving IDs
   * up front and filtering directly on the scalar `categoryId` column avoids
   * that relation-filter/NOT interaction entirely.
   */
  private async buildExcludeCategoryWhere(
    excludeCategoryIds?: number[],
  ): Promise<Prisma.expenses_data_masterWhereInput> {
    if (!excludeCategoryIds || excludeCategoryIds.length === 0) return {};

    const allCategories = await this.prisma.category_master.findMany({
      select: { id: true, parentId: true },
    });
    const byParent = new Map<number, number[]>();
    for (const cat of allCategories) {
      if (cat.parentId !== null) {
        if (!byParent.has(cat.parentId)) byParent.set(cat.parentId, []);
        byParent.get(cat.parentId)!.push(cat.id);
      }
    }

    const excludedIds = new Set<number>();
    const collectSubtree = (id: number) => {
      excludedIds.add(id);
      for (const childId of byParent.get(id) ?? []) collectSubtree(childId);
    };
    excludeCategoryIds.forEach(collectSubtree);

    return { categoryId: { notIn: Array.from(excludedIds) } };
  }

  async getCategoryWiseTotals(
    startDate?: string,
    endDate?: string,
    spendTypeFilter?: SpendTypeFilter,
    excludeCategoryIds?: number[],
  ) {
    const where: Prisma.expenses_data_masterWhereInput = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = endOfDay(new Date(endDate));
    }
    const spendTypeWhere = this.buildSpendTypeWhere(spendTypeFilter);
    const excludeCategoryWhere = await this.buildExcludeCategoryWhere(excludeCategoryIds);
    const extraFilters = [spendTypeWhere, excludeCategoryWhere].filter(
      (w) => Object.keys(w).length > 0,
    );
    if (extraFilters.length > 0) where.AND = extraFilters;

    const expenses = await this.prisma.expenses_data_master.findMany({
      where,
      include: {
        category_master: true,
      },
    });

    const categoryMap = new Map<number, { name: string; total: number }>();
    for (const exp of expenses) {
      const cat = exp.category_master;
      if (cat) {
        const current = categoryMap.get(cat.id) || { name: cat.name, total: 0 };
        current.total += exp.amount;
        categoryMap.set(cat.id, current);
      }
    }

    return Array.from(categoryMap.entries())
      .map(([id, val]) => ({
        id,
        name: val.name,
        total: Math.round(val.total * 100) / 100,
      }))
      .sort((a, b) => b.total - a.total);
  }

  async getDuplicates(criteria: {
    byDate: boolean;
    byAmount: boolean;
    byName: boolean;
  }): Promise<ExpenseRow[][]> {
    if (!criteria.byDate && !criteria.byAmount && !criteria.byName) return [];

    const all = await this.prisma.expenses_data_master.findMany({
      include: {
        category_master: true,
        account: true,
      },
      orderBy: { date: 'desc' },
    });

    const groups = new Map<string, typeof all>();
    for (const expense of all) {
      // Account is always part of the match — a debit from one account can
      // never be a duplicate of a debit from a different account, so this
      // isn't an optional criterion like date/amount/name.
      const parts: string[] = [
        expense.accountId !== null ? String(expense.accountId) : '__NO_ACCOUNT__',
      ];
      if (criteria.byDate) parts.push(format(expense.date, 'yyyy-MM-dd'));
      if (criteria.byAmount) parts.push(String(expense.amount));
      if (criteria.byName) parts.push(expense.userName ?? '__NULL__');
      const key = parts.join('|');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(expense);
    }

    return Array.from(groups.values())
      .filter((g) => g.length > 1)
      .map((group) =>
        group.map((exp) => ({
          id: exp.id,
          date: format(exp.date, 'yyyy-MM-dd'),
          amount: exp.amount,
          remarks: exp.remarks,
          userName: exp.userName,
          accountId: exp.accountId,
          accountName: exp.account?.name ?? null,
          categoryId: exp.categoryId,
          categoryName: exp.category_master?.name ?? 'Unknown',
          spendType: exp.spendType,
          effectiveSpendType: resolveSpendType(exp.spendType, exp.category_master?.spendType),
          addedBy: exp.addedBy,
          createdAt: exp.createdAt,
        })),
      );
  }

  async getAccountWiseTotals(startDate?: string, endDate?: string) {
    const where: Prisma.expenses_data_masterWhereInput = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = endOfDay(new Date(endDate));
    }

    const expenses = await this.prisma.expenses_data_master.findMany({
      where,
      select: { amount: true, accountId: true, account: { select: { name: true } } },
    });

    const accountMap = new Map<string, { name: string; total: number }>();
    for (const exp of expenses) {
      const key = exp.accountId != null ? String(exp.accountId) : '__none__';
      const name = exp.account?.name ?? 'Unlinked';
      const cur = accountMap.get(key) ?? { name, total: 0 };
      cur.total += exp.amount;
      accountMap.set(key, cur);
    }

    return Array.from(accountMap.entries())
      .map(([id, v]) => ({
        id: id === '__none__' ? null : Number(id),
        name: v.name,
        total: Math.round(v.total * 100) / 100,
      }))
      .sort((a, b) => b.total - a.total);
  }

  async splitExpense(id: number, dto: SplitExpenseDto) {
    return this.prisma.$transaction(async (tx) => {
      const original = await tx.expenses_data_master.findUnique({
        where: { id },
      });
      if (!original) throw new NotFoundException(`Expense #${id} not found`);

      const itemsTotal = dto.items.reduce((sum, i) => sum + i.amount, 0);
      const rounded = Math.round(itemsTotal * 100) / 100;
      const originalRounded = Math.round(original.amount * 100) / 100;
      if (Math.abs(rounded - originalRounded) > 0.01) {
        throw new BadRequestException(
          `Split items total (${rounded}) must equal the original amount (${originalRounded})`,
        );
      }

      await tx.expenses_data_master.delete({ where: { id } });

      const created = await Promise.all(
        dto.items.map((item) =>
          tx.expenses_data_master.create({
            data: {
              date: item.date ? new Date(item.date) : original.date,
              amount: item.amount,
              remarks: item.remarks ?? original.remarks,
              accountId: item.accountId ?? original.accountId,
              categoryId: item.categoryId,
              userName: original.userName,
              addedBy: original.addedBy,
            },
            include: { category_master: true, account: true },
          }),
        ),
      );

      return created.map((exp) => ({
        id: exp.id,
        date: format(exp.date, 'yyyy-MM-dd'),
        amount: exp.amount,
        remarks: exp.remarks,
        userName: exp.userName,
        accountId: exp.accountId,
        accountName: exp.account?.name ?? null,
        categoryId: exp.categoryId,
        categoryName: exp.category_master?.name ?? 'Unknown',
        spendType: exp.spendType,
        effectiveSpendType: resolveSpendType(exp.spendType, exp.category_master?.spendType),
        addedBy: exp.addedBy,
        createdAt: exp.createdAt,
      }));
    });
  }

  async bulkUpdateExpenses(
    ids: number[],
    data: {
      categoryId?: number;
      remarks?: string;
      userName?: string;
      spendType?: spend_type;
    },
  ) {
    return this.prisma.expenses_data_master.updateMany({
      where: { id: { in: ids } },
      data: {
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.remarks !== undefined && { remarks: data.remarks }),
        ...(data.userName !== undefined && { userName: data.userName }),
        ...(data.spendType !== undefined && { spendType: data.spendType }),
      },
    });
  }

  async getSuggestionsForUser(userName: string) {
    if (!userName?.trim()) return { categories: [], remarks: [] };

    const expenses = await this.prisma.expenses_data_master.findMany({
      where: { userName: { contains: userName } },
      select: {
        categoryId: true,
        remarks: true,
        category_master: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
      take: 200,
    });

    const catMap = new Map<number, { name: string; count: number }>();
    const remarkCounts = new Map<string, number>();

    for (const e of expenses) {
      if (e.categoryId && e.category_master) {
        const curr = catMap.get(e.categoryId) ?? {
          name: e.category_master.name,
          count: 0,
        };
        curr.count++;
        catMap.set(e.categoryId, curr);
      }
      if (e.remarks?.trim()) {
        remarkCounts.set(e.remarks, (remarkCounts.get(e.remarks) ?? 0) + 1);
      }
    }

    return {
      categories: Array.from(catMap.entries())
        .map(([id, v]) => ({ id, name: v.name, count: v.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      remarks: Array.from(remarkCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([r]) => r)
        .slice(0, 8),
    };
  }

  async getDashboardKPIs(
    startDate?: string,
    endDate?: string,
    type?: 'all' | 'month' | 'custom',
    spendTypeFilter?: SpendTypeFilter,
    excludeCategoryIds?: number[],
  ) {
    const now = new Date();

    // Build date filters
    const thisMonthStart = startOfMonth(now);

    let dateFilter: { date: { gte?: Date; lte?: Date } } | undefined;
    if (startDate || endDate) {
      dateFilter = { date: {} };
      if (startDate) dateFilter.date.gte = new Date(startDate);
      if (endDate) dateFilter.date.lte = endOfDay(new Date(endDate));
    }

    let comparisonDateFilter:
      | { date: { gte?: Date; lte?: Date; lt?: Date } }
      | undefined;
    if (startDate && endDate) {
      if (type === 'custom') {
        const start = new Date(startDate);
        const end = new Date(endDate);
        // Calculate inclusive days (add 1 to include both start and end dates)
        const rangeDays =
          Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
          1;
        // Always compare with the full previous month
        // This ensures Feb 1-28 compares with Jan 1-31 (full month)

        // Comparison period is same duration before start date
        comparisonDateFilter = {
          date: {
            gte: new Date(start.getTime() - rangeDays * 24 * 60 * 60 * 1000),
            lte: endOfDay(new Date(start.getTime() - 24 * 60 * 60 * 1000)),
          },
        };
      } else if (type === 'month') {
        // clone first
        const [year, month] = startDate.split('-').map(Number);

        // Start of target month (IST safe)
        const startOfMonth = new Date(year, month - 2, 1);

        // Start of next month
        const nextMonthStart = new Date(year, month - 1, 1);

        comparisonDateFilter = {
          date: {
            gte: startOfMonth,
            lt: nextMonthStart, // 👈 NOT lte
          },
        };
      } else {
        comparisonDateFilter = { date: { gte: thisMonthStart } };
      }
    }

    const spendTypeWhere = this.buildSpendTypeWhere(spendTypeFilter);
    const excludeCategoryWhere = await this.buildExcludeCategoryWhere(excludeCategoryIds);
    const extraFilters = [spendTypeWhere, excludeCategoryWhere].filter(
      (w) => Object.keys(w).length > 0,
    );
    const withSpendType = (
      base: Prisma.expenses_data_masterWhereInput | undefined,
    ): Prisma.expenses_data_masterWhereInput | undefined =>
      extraFilters.length > 0 ? { AND: [base ?? {}, ...extraFilters] } : base;

    const [thisPeriod, lastPeriod, overall, recent, accounts] =
      await Promise.all([
        this.prisma.expenses_data_master.aggregate({
          where: withSpendType(
            dateFilter ? dateFilter : { date: { gte: thisMonthStart } },
          ),
          _sum: { amount: true },
          _count: true,
        }),
        this.prisma.expenses_data_master.aggregate({
          where: withSpendType(comparisonDateFilter),
          _sum: { amount: true },
          _count: true,
        }),
        this.prisma.expenses_data_master.aggregate({
          where: withSpendType(undefined),
          _sum: { amount: true },
          _count: true,
        }),
        this.prisma.expenses_data_master.findMany({
          where: withSpendType(undefined),
          orderBy: { date: 'desc' },
          take: 10,
          include: {
            category_master: true,
          },
        }),
        this.prisma.account_master.findMany(),
      ]);

    return {
      thisMonth: {
        total: thisPeriod._sum.amount || 0,
        count: thisPeriod._count,
      },
      lastMonth: {
        total: lastPeriod._sum.amount || 0,
        count: lastPeriod._count,
      },
      overall: {
        total: overall._sum.amount || 0,
        count: overall._count,
      },
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        balance: a.balance,
      })),
      recentTransactions: recent.map((e) => ({
        id: e.id,
        date: format(e.date, 'yyyy-MM-dd'),
        amount: e.amount,
        remarks: e.remarks,
        categories: e.category_master ? [e.category_master.name] : [],
      })),
    };
  }
}
