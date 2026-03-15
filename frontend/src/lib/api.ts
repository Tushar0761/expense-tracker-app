import axios from "axios";
import { format } from "date-fns";

export type LoanGraphPoint = {
    month: string;
    totalPaid: number;
    totalPlanned: number;
};

export type borrowersData = {
    id: number;
    borrowerName: string;
};
export type LoanTableRow = {
    id: number;
    borrowerName: string;
    totalAmount: number;
    loanDate: string;
    status: "PENDING" | "ACTIVE" | "CLOSED" | "DEFAULTED";
    notes?: string;
    paidAmount: number;
    remainingAmount: number;
};

export type EmiPaymentRow = {
    id: number;
    loanId: number;
    paymentDate: string;
    principalAmount: number;
    interestAmount: number;
    totalAmount: number;
    paymentMethod: string;
    notes?: string;
    borrowerName: string;
};

export type FuturePaymentRow = {
    id: number;
    loanId: number;
    plannedDate: string;
    principalAmount: number;
    interestAmount: number;
    totalAmount: number;
    status: "pending" | "completed" | "cancelled";
    notes?: string;
    borrowerName: string;
};

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
});

export async function fetchLoansGraph(): Promise<LoanGraphPoint[]> {
    const response = await api.get("/api/loans/graph");
    return response.data;
}

export async function fetchLoansInsight() {
    const response = await api.get("/api/loans/insight");
    return response.data;
}

export async function fetchLoansTable(): Promise<LoanTableRow[]> {
    const response = await api.get("/api/loans/table");
    return response.data;
}

export async function fetchEmiPayments(): Promise<EmiPaymentRow[]> {
    const response = await api.get("/api/loans/payments");
    return response.data;
}

export async function fetchFuturePayments(): Promise<FuturePaymentRow[]> {
    const response = await api.get("/api/loans/future-payments");
    return response.data;
}
export async function fetchBorrowersList(): Promise<
    { id: number; borrowerName: string }[]
> {
    const response = await api.get("/api/loans/borrowers");
    return response.data;
}

export type LoanFormValues = {
    borrowerId: string;
    status: "PENDING" | "APPROVED" | "PAID";
    initialAmount: number;
    interestRate: number;
    loanDate: Date;
    totalAmount: number;
    dueDate?: Date;
    notes?: string;
};

export async function createLoan(data: LoanFormValues): Promise<LoanTableRow> {
    // Validate required date field
    if (!data.loanDate) {
        throw new Error("Loan date is required");
    }

    // Transform the data to match the backend DTO format
    const payload = {
        borrowerId: Number(data.borrowerId),
        status: data.status?.toLowerCase(),
        initialAmount: data.initialAmount,
        interestRate: data.interestRate,
        loanDate: format(data.loanDate, "yyyy-MM-dd"),
        totalAmount: data.totalAmount,
        dueDate: data.dueDate ? format(data.dueDate, "yyyy-MM-dd") : undefined,
        notes: data.notes,
    };

    const response = await api.post("/api/loans/create", payload);
    return response.data;
}

export async function addBorrower(
    borrowerName: string,
): Promise<borrowersData> {
    const response = await api.post("/api/loans/add-borrower", {
        borrowerName,
    });
    return response.data;
}

export type RecordPaymentValues = {
    loanId: number;
    paymentDate: Date;
    totalAmount: number;
    paymentMethod: "cash" | "bank_transfer" | "upi" | "cheque" | "other";
    futurePaymentId?: number;
    notes?: string;
    principalAmount?: number;
    interestAmount?: number;
};

export async function recordPayment(
    data: RecordPaymentValues,
): Promise<{ id: number }> {
    const payload = {
        ...data,
        paymentDate: format(data.paymentDate, "yyyy-MM-dd"),
    };

    const response = await api.post("/api/loans/record-payment", payload);
    return response.data;
}

export async function fetchLoansByBorrower(
    borrowerId: number,
): Promise<LoanTableRow[]> {
    const response = await api.get(`/api/loans/borrower/${borrowerId}`);
    return response.data;
}

export async function fetchFuturePaymentsByLoan(
    loanId: number,
): Promise<FuturePaymentRow[]> {
    const response = await api.get(`/api/loans/${loanId}/future-payments`);
    return response.data;
}

export type LoanPlanningSummary = {
    totalAmount: number;
    paidAmount: number;
    plannedAmount: number;
    unplannedAmount: number;
    loanId: number;
    notes: string | null;
    loanDate: string;
};

export async function fetchLoanPlanningSummary(
    loanId: number,
): Promise<LoanPlanningSummary> {
    const response = await api.get(`/api/loans/${loanId}/planning-summary`);
    return response.data;
}

export type FuturePaymentItem = {
    plannedDate: string;
    totalAmount: number;
    principalAmount?: number;
    interestAmount?: number;
};

export type BulkCreateFuturePaymentPayload = {
    loanId: number;
    items: FuturePaymentItem[];
};

export async function bulkCreateFuturePayments(
    payload: BulkCreateFuturePaymentPayload,
): Promise<{ count: number }> {
    const response = await api.post("/api/loans/bulk-future-payments", payload);
    return response.data;
}
