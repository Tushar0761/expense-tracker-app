// src/lib/validations/loanSchema.ts
import { z } from 'zod';

export const loanSchema = z.object({
  borrowerId: z.string().min(1, { message: 'Borrower is required' }),
  dueDate: z.date({ required_error: 'Due date is required' }).optional(),
  status: z.enum(['ACTIVE', 'CLOSED', 'DEFAULTED'], {
    required_error: 'Status is required',
  }),
  notes: z.string().optional(),
  initialAmount: z
    .number({ invalid_type_error: 'Initial amount must be a number' })
    .positive({ message: 'Amount must be greater than zero' }),
  interestRate: z
    .number({ invalid_type_error: 'Interest rate must be a number' })
    .min(0, { message: 'Interest rate must be non-negative' }),
  loanDate: z.date({ required_error: 'Loan date is required' }),
  totalAmount: z
    .number({ invalid_type_error: 'Total amount must be a number' })
    .positive({ message: 'Total must be greater than zero' }),
});

export type LoanFormValues = z.infer<typeof loanSchema>;

export const paymentSchema = z.object({
  loanId: z.string().min(1, { message: 'Loan is required' }),
  paymentDate: z.date({ required_error: 'Payment date is required' }),
  totalAmount: z.coerce
    .number({ invalid_type_error: 'Total amount must be a number' })
    .positive({ message: 'Amount must be greater than zero' }),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'upi', 'cheque', 'other'], {
    required_error: 'Payment method is required',
  }),
  futurePaymentId: z.string().optional(),
  notes: z.string().optional(),
  principalAmount: z.coerce.number().optional(),
  interestAmount: z.coerce.number().optional(),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;

export const futurePaymentPlanningSchema = z.object({
  loanId: z.string().min(1, { message: 'Loan account is required' }),
  items: z
    .array(
      z.object({
        plannedDate: z.date({ required_error: 'Date is required' }),
        totalAmount: z.coerce
          .number()
          .positive({ message: 'Amount must be positive' }),
        principalAmount: z.coerce.number().optional(),
        interestAmount: z.coerce.number().optional(),
      }),
    )
    .min(1, { message: 'At least one plan required' }),
});

export type FuturePaymentPlanningValues = z.infer<
  typeof futurePaymentPlanningSchema
>;
