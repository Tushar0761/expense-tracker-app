import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
  createdAt: Date;
};

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
      where.categoryId = Number(query.categoryId);
    }

    if (query.accountId) {
      where.accountId = Number(query.accountId);
    }

    if (query.search) {
      where.remarks = { contains: query.search };
    }

    const [data, total] = await Promise.all([
      this.prisma.expenses_data_master.findMany({
        where,
        include: {
          category_master: true,
          account: true,
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.expenses_data_master.count({ where }),
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
      createdAt: exp.createdAt,
    }));

    return {
      data: rows,
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

  async getCategoryWiseTotals(startDate?: string, endDate?: string) {
    const where: Prisma.expenses_data_masterWhereInput = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = endOfDay(new Date(endDate));
    }

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

  async getDashboardKPIs() {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(
      new Date(now.getFullYear(), now.getMonth() - 1, 1),
    );
    const lastMonthEnd = endOfDay(
      new Date(now.getFullYear(), now.getMonth(), 0),
    );

    const [thisMonth, lastMonth, overall, recent, accounts] = await Promise.all(
      [
        this.prisma.expenses_data_master.aggregate({
          where: { date: { gte: thisMonthStart } },
          _sum: { amount: true },
          _count: true,
        }),
        this.prisma.expenses_data_master.aggregate({
          where: { date: { gte: lastMonthStart, lte: lastMonthEnd } },
          _sum: { amount: true },
          _count: true,
        }),
        this.prisma.expenses_data_master.aggregate({
          _sum: { amount: true },
          _count: true,
        }),
        this.prisma.expenses_data_master.findMany({
          orderBy: { date: 'desc' },
          take: 10,
          include: {
            category_master: true,
          },
        }),
        this.prisma.account_master.findMany(),
      ],
    );

    return {
      thisMonth: {
        total: thisMonth._sum.amount || 0,
        count: thisMonth._count,
      },
      lastMonth: {
        total: lastMonth._sum.amount || 0,
        count: lastMonth._count,
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
