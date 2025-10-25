import axios from "axios";

export type LoanGraphPoint = {
    month: string;
    principalPaid: number;
    interestPaid: number;
    principalPending: number;
    interestPending: number;
};

export type LoanTableRow = {
    id: number;
    borrowerName: string;
    totalAmount: number;
    loanDate: string;
    status: "active" | "closed" | "defaulted";
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
