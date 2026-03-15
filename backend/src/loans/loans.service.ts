import { Injectable } from '@nestjs/common';
import { future_payment_data_master_status } from '@prisma/client';
import {
  addMonths,
  format,
  isSameMonth,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  BulkCreateFuturePaymentDto,
  CreateLoanDto,
  RecordPaymentDto,
} from './loans.dto';

export type LoanGraphPoint = {
  month: string;
  totalPaid: number;
  totalPlanned: number;
};

export type LoanTableRow = {
  id: number;
  borrowerName: string;
  borrowerId: number | null;
  totalAmount: number;
  loanDate: string | Date; // ISO date
  status: 'active' | 'closed' | 'defaulted';
  notes?: string | null;
  paidAmount: number; // Total amount paid so far
  remainingAmount: number; // Amount still pending
};

export type EmiPaymentRow = {
  id: number;
  borrowerName: string; // From loan relation
  paymentDate: string;
  totalAmount: number;
  paymentMethod: string;
};

export type FuturePaymentRow = {
  id: number;
  borrowerName: string; // From loan relation
  plannedDate: string;
  totalAmount: number;
  status: string;
};

@Injectable()
export class LoansService {
  constructor(private prisma: PrismaService) {}

  async getLoanPlanningSummary(loanId: number) {
    const loan = await this.prisma.loans_master.findUnique({
      where: { id: loanId },
      include: {
        emi_payment_data: {
          select: { totalAmount: true },
        },
        future_payment_data_master: {
          where: { status: 'pending' },
          select: { totalAmount: true },
        },
      },
    });

    if (!loan) throw new Error('Loan not found');

    const totalAmount = loan.totalAmount;
    const paidAmount = loan.emi_payment_data.reduce(
      (sum, p) => sum + p.totalAmount,
      0,
    );
    const plannedAmount = loan.future_payment_data_master.reduce(
      (sum, p) => sum + p.totalAmount,
      0,
    );
    const unplannedAmount = totalAmount - paidAmount - plannedAmount;

    return {
      totalAmount,
      paidAmount,
      plannedAmount,
      unplannedAmount,
      loanId: loan.id,
      notes: loan.notes,
      loanDate: format(loan.loanDate, 'dd MMM yyyy'),
    };
  }

  async bulkCreateFuturePayments(payload: BulkCreateFuturePaymentDto) {
    const data = payload.items.map((item) => ({
      loanId: payload.loanId,
      plannedDate: new Date(item.plannedDate),
      totalAmount: item.totalAmount,
      principalAmount: item.principalAmount || item.totalAmount,
      interestAmount: item.interestAmount || 0,
      status: future_payment_data_master_status.pending,
    }));

    return this.prisma.future_payment_data_master.createMany({
      data,
    });
  }

  async createLoanService(payload: CreateLoanDto) {
    return this.prisma.loans_master.create({
      data: {
        initialAmount: payload.initialAmount,
        interestRate: payload.interestRate,
        loanDate: new Date(payload.loanDate),
        totalAmount: payload.totalAmount,
        borrowerId: payload.borrowerId,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        notes: payload.notes,
        status: payload.status,
      },
    });
  }

  async addBorrower(payload: { borrowerName: string }) {
    return this.prisma.borrower_master.create({
      data: {
        borrowerName: payload.borrowerName,
      },
    });
  }

  async recordPaymentService(payload: RecordPaymentDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Create the EMI payment record
      const emiPayment = await tx.emi_payment_data.create({
        data: {
          loanId: payload.loanId,
          paymentDate: new Date(payload.paymentDate),
          totalAmount: payload.totalAmount,
          paymentMethod: payload.paymentMethod,
          notes: payload.notes,
          principalAmount: payload.principalAmount ?? 0,
          interestAmount: payload.interestAmount ?? 0,
          futurePaymentId: payload.futurePaymentId,
        },
      });

      // 2. If it's linked to a future payment, update its status
      if (payload.futurePaymentId) {
        await tx.future_payment_data_master.update({
          where: { id: payload.futurePaymentId },
          data: {
            status: 'completed',
            emiPaymentId: emiPayment.id,
            updatedAt: new Date(),
          },
        });
      }

      return emiPayment;
    });
  }

  async getInsightData() {
    const result = await this.prisma.loans_master.findMany({
      include: {
        emi_payment_data: true,
      },
    });

    const data = result.reduce(
      ({ amountPaid, totalInterest, totalPrincipal }, current) => {
        return {
          totalPrincipal: totalPrincipal + current.initialAmount,
          totalInterest:
            totalInterest + current.totalAmount - current.initialAmount,
          amountPaid:
            amountPaid +
            current.emi_payment_data.reduce(
              (prev, current) => prev + current.totalAmount,
              0,
            ),
        };
      },
      {
        totalPrincipal: 0,
        totalInterest: 0,
        amountPaid: 0,
      },
    );

    return {
      ...data,
      paidPercentage: (data.amountPaid / data.totalPrincipal).toFixed(3),
      amountPending: data.totalPrincipal + data.totalInterest - data.amountPaid,
    };
  }

  // Mock data for now - will be replaced with Prisma queries
  async getGraphData(): Promise<LoanGraphPoint[]> {
    const date = new Date();
    const threeMonthsBack = subMonths(startOfMonth(date), 2);

    const months = Array.from({ length: 24 }, (_, i) =>
      addMonths(threeMonthsBack, i),
    );

    const monthWisePaidAmountData = await this.prisma.$queryRaw<
      {
        month: Date;
        paidAmount: number;
        paidPrincipal: number;
        paidInterest: number;
      }[]
    >`select
	last_day(epd.paymentDate) as month,
	sum(epd.totalAmount) as paidAmount,
  sum(epd.principalAmount) as paidPrincipal,
  sum(epd.interestAmount) as paidInterest
from
	emi_payment_data epd
	group by last_day(epd.paymentDate)`;

    const monthWisePlannedAmountData = await this.prisma.$queryRaw<
      {
        month: Date;
        planningAmount: number;
        plannedPrincipal: number;
        plannedInterest: number;
      }[]
    >`select
	last_day(fpdm.plannedDate) as month,
	sum(fpdm.totalAmount) as planningAmount,
  sum(fpdm.principalAmount) as plannedPrincipal,
  sum(fpdm.interestAmount) as plannedInterest
from
	future_payment_data_master fpdm
group by
	last_day(fpdm.plannedDate)`;

    return months.map((allMonth) => {
      const monthStr = format(allMonth, 'MMM-yy');

      const paidData = monthWisePaidAmountData.find(({ month }) =>
        isSameMonth(month, allMonth),
      );

      const plannedData = monthWisePlannedAmountData.find(({ month }) =>
        isSameMonth(month, allMonth),
      );

      return {
        month: monthStr,
        totalPaid: Number(paidData?.paidAmount || 0),
        totalPlanned: Number(plannedData?.planningAmount || 0),
      };
    });
  }

  async getTableData(): Promise<LoanTableRow[]> {
    const result = await this.prisma.$queryRaw<LoanTableRow[]>`
    SELECT
      bm.id,
      bm.borrowerName,
      MIN(lm.loanDate) AS loanDate,
      SUM(lm.totalAmount) AS totalAmount,
      COALESCE(SUM(payloads.paidAmount), 0) AS paidAmount,
      (SUM(lm.totalAmount) - COALESCE(SUM(payloads.paidAmount), 0)) AS remainingAmount,
      GROUP_CONCAT(CONCAT(lm.notes, ' -- ', lm.totalAmount) SEPARATOR '; ') AS notes
    FROM
      borrower_master bm
    JOIN 
      loans_master lm ON lm.borrowerId = bm.id
    LEFT JOIN (
      SELECT loanId, SUM(totalAmount) AS paidAmount
      FROM emi_payment_data
      GROUP BY loanId
    ) payloads ON payloads.loanId = lm.id
    GROUP BY
      bm.id, bm.borrowerName
    ORDER BY 
      remainingAmount DESC
  `;

    return result;
  }

  async getEmiPayments(): Promise<EmiPaymentRow[]> {
    const result = await this.prisma.emi_payment_data.findMany({
      where: {
        paymentDate: {
          gte: subMonths(new Date(), 3),
        },
      },
      select: {
        id: true,
        totalAmount: true,
        paymentDate: true,
        paymentMethod: true,
        loans_master: {
          select: {
            borrower_master: {
              select: {
                borrowerName: true,
              },
            },
          },
        },
      },
      orderBy: {
        paymentDate: 'desc',
      },
    });

    const data: EmiPaymentRow[] = result.map(
      ({ id, loans_master, paymentDate, totalAmount, paymentMethod }) => ({
        borrowerName: loans_master.borrower_master?.borrowerName ?? '-',
        id,
        paymentDate: format(paymentDate, 'MMM-yyyy'),
        paymentMethod,
        totalAmount,
      }),
    );
    return data;
    // Mock EMI payment data
  }

  async getFuturePayments(): Promise<FuturePaymentRow[]> {
    // Mock future payment data
    const result = await this.prisma.future_payment_data_master.findMany({
      where: {
        plannedDate: {
          lte: addMonths(new Date(), 3),
        },
        status: 'pending',
      },
      select: {
        id: true,
        plannedDate: true,
        principalAmount: true,
        interestAmount: true,
        totalAmount: true,
        status: true,
        loans_master: {
          select: {
            borrower_master: {
              select: {
                borrowerName: true,
              },
            },
          },
        },
      },
      orderBy: {
        plannedDate: 'asc',
      },
    });

    const data: FuturePaymentRow[] = result.map(
      ({
        id,
        loans_master,
        plannedDate,
        totalAmount,
        status,
        interestAmount,
        principalAmount,
      }) => ({
        id,
        loans_master,
        plannedDate: format(plannedDate, 'dd MMM yyyy'),
        totalAmount,
        borrowerName: loans_master.borrower_master?.borrowerName ?? '-',
        status,
        interestAmount,
        principalAmount,
      }),
    );
    return data;
  }

  async getBorrowers(): Promise<
    {
      id: number;
      borrowerName: string;
    }[]
  > {
    // Mock future payment data
    const result = await this.prisma.borrower_master.findMany({
      select: {
        id: true,
        borrowerName: true,
      },
    });
    return result;
  }

  async getLoansByBorrower(borrowerId: number) {
    const result = await this.prisma.loans_master.findMany({
      where: { borrowerId },
      include: {
        emi_payment_data: true,
      },
    });

    return result.map((loan) => {
      const paidAmount = loan.emi_payment_data.reduce(
        (sum, p) => sum + p.totalAmount,
        0,
      );
      return {
        ...loan,
        paidAmount,
        remainingAmount: loan.totalAmount - paidAmount,
      };
    });
  }

  async getFuturePaymentsByLoan(loanId: number) {
    const result = await this.prisma.future_payment_data_master.findMany({
      where: { loanId, status: 'pending' },
      orderBy: { plannedDate: 'asc' },
    });

    return result.map((fp) => ({
      ...fp,
      plannedDate: format(fp.plannedDate, 'dd MMM yyyy'),
    }));
  }

  // Helper methods for calculations
  private calculatePrincipalPaid(month: Date): number {
    return (month.getMonth() + 1) * 1000 * Math.floor(Math.random() * 10);
  }

  private calculateThisMonthPaid(month: Date): number {
    return (month.getMonth() + 1) * 1000 * Math.floor(Math.random() * 10);
  }

  private calculatePrincipalPending(month: Date): number {
    return (month.getMonth() + 1) * 1000 * Math.floor(Math.random() * 10);
  }

  private calculateThisMonthPending(month: Date): number {
    return (month.getMonth() + 1) * 1000 * Math.floor(Math.random() * 10);
  }
}
