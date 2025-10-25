// src/lib/validations/loanSchema.ts
import { z } from "zod";

export const loanSchema = z.object({
    borrowerId: z.string().min(1, { message: "Borrower is required" }),
    dueDate: z.date({ required_error: "Due date is required" }),
    status: z.enum(["PENDING", "APPROVED", "PAID"], {
        required_error: "Status is required",
    }),
    notes: z.string().optional(),
    initialAmount: z
        .number({ invalid_type_error: "Initial amount must be a number" })
        .positive({ message: "Amount must be greater than zero" }),
    interestRate: z
        .number({ invalid_type_error: "Interest rate must be a number" })
        .min(0, { message: "Interest rate must be non-negative" }),
    loanDate: z.date({ required_error: "Loan date is required" }),
    totalAmount: z
        .number({ invalid_type_error: "Total amount must be a number" })
        .positive({ message: "Total must be greater than zero" }),
});

export type LoanFormValues = z.infer<typeof loanSchema>;
