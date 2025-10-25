import { Injectable } from '@nestjs/common';
import { addMonths, format, startOfMonth, subMonths } from 'date-fns';
import { PrismaService } from 'src/prisma/prisma.service';

export type LoanGraphPoint = {
  month: string; // e.g. 'Oct'
  principalPaid: number; // Amount of principal paid in that month
  interestPaid: number; // Interest paid
  principalPending: number; // Future principal scheduled
  interestPending: number; // Future interest scheduled
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
      amountPending: data.totalPrincipal + data.totalInterest - data.amountPaid,
    };
  }

  // Mock data for now - will be replaced with Prisma queries
  getGraphData(): LoanGraphPoint[] {
    const date = new Date();
    const threeMonthsBack = subMonths(date, 3);

    const months = Array.from({ length: 9 }, (_, i) =>
      addMonths(threeMonthsBack, i),
    );

    return months.map((month) => {
      const monthStr = format(month, 'MMM');

      // Mock calculations - replace with actual DB queries
      const principalPaid = this.calculatePrincipalPaid(month);
      const interestPaid = this.calculateInterestPaid(month);
      const principalPending = this.calculatePrincipalPending(month);
      const interestPending = this.calculateInterestPending(month);

      return {
        month: monthStr,
        principalPaid,
        interestPaid,
        principalPending,
        interestPending,
      };
    });
  }

  async getTableData(): Promise<LoanTableRow[]> {
    // Mock data - will be replaced with Prisma queries
    // const result = await this.prisma.loans_master.findMany({
    //   include: {
    //     borrower_master: true,
    //     emi_payment_data: true,
    //   },
    // });

    // const allData: LoanTableRow[] = result.map((d) => {
    //   const totalPaid = d.emi_payment_data.reduce((prev, { totalAmount }) => {
    //     return prev + totalAmount;
    //   }, 0);

    //   return {
    //     ...d,
    //     borrowerName: d.borrower_master?.borrowerName ?? '',
    //     borrowerId: d.borrowerId,
    //     paidAmount: totalPaid,
    //     remainingAmount: d.totalAmount - totalPaid,
    //   };
    // });
    const result = await this.prisma.$queryRaw<LoanTableRow[]>`
    SELECT
	bm.id,
	bm.borrowerName,
	min(lm.loanDate) AS loanDate,
	sum(lm.totalAmount) AS totalAmount,
	coalesce(sum(epd.totalAmount), 0) AS paidAmount,
	(
		sum(lm.totalAmount) - coalesce(sum(epd.totalAmount), 0)
	) AS remainingAmount,
	GROUP_CONCAT(
		CONCAT(lm.notes, ' -- ', lm.totalAmount) SEPARATOR '; '
	) AS notes
FROM
	borrower_master bm
	JOIN loans_master lm ON lm.borrowerId = bm.id
	LEFT JOIN emi_payment_data epd ON epd.loanId = lm.id
GROUP BY
	bm.id
	order by loanDate
  `;

    return result;
  }

  async getEmiPayments(): Promise<EmiPaymentRow[]> {
    const result = await this.prisma.emi_payment_data.findMany({
      where: {
        paymentDate: {
          gte: subMonths(new Date(), 2),
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
    });

    const data: EmiPaymentRow[] = result.map(
      ({ id, loans_master, paymentDate, totalAmount, paymentMethod }) => ({
        borrowerName: loans_master.borrower_master?.borrowerName ?? '-',
        id,
        paymentDate: format(paymentDate, 'dd MMM yyyy'),
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
          gte: startOfMonth(new Date()),
        },
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

  // Helper methods for calculations
  private calculatePrincipalPaid(month: Date): number {
    return (month.getMonth() + 1) * 1000 * Math.floor(Math.random() * 10);
  }

  private calculateInterestPaid(month: Date): number {
    return (month.getMonth() + 1) * 1000 * Math.floor(Math.random() * 10);
  }

  private calculatePrincipalPending(month: Date): number {
    return (month.getMonth() + 1) * 1000 * Math.floor(Math.random() * 10);
  }

  private calculateInterestPending(month: Date): number {
    return (month.getMonth() + 1) * 1000 * Math.floor(Math.random() * 10);
  }
}
