import axios from 'axios';
import { format } from 'date-fns';

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
  status: 'PENDING' | 'ACTIVE' | 'CLOSED' | 'DEFAULTED';
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
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  borrowerName: string;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export async function fetchLoansGraph(): Promise<LoanGraphPoint[]> {
  const response = await api.get('/api/loans/graph');
  return response.data;
}

export async function fetchLoansInsight() {
  const response = await api.get('/api/loans/insight');
  return response.data;
}

export async function fetchLoansTable(): Promise<LoanTableRow[]> {
  const response = await api.get('/api/loans/table');
  return response.data;
}

export async function fetchEmiPayments(): Promise<EmiPaymentRow[]> {
  const response = await api.get('/api/loans/payments');
  return response.data;
}

export async function fetchFuturePayments(): Promise<FuturePaymentRow[]> {
  const response = await api.get('/api/loans/future-payments');
  return response.data;
}
export async function fetchBorrowersList(): Promise<
  { id: number; borrowerName: string }[]
> {
  const response = await api.get('/api/loans/borrowers');
  return response.data;
}

export type LoanFormValues = {
  borrowerId: string;
  status: 'ACTIVE' | 'CLOSED' | 'DEFAULTED';
  initialAmount: number;
  interestRate: number;
  loanDate: Date;
  totalAmount: number;
  dueDate?: Date;
  notes?: string;
};

export async function createLoan(data: LoanFormValues): Promise<LoanTableRow> {
  if (!data.loanDate) {
    throw new Error('Loan date is required');
  }

  const payload = {
    borrowerId: Number(data.borrowerId),
    status: data.status?.toLowerCase(),
    initialAmount: data.initialAmount,
    interestRate: data.interestRate,
    loanDate: format(data.loanDate, 'yyyy-MM-dd'),
    totalAmount: data.totalAmount,
    dueDate: data.dueDate ? format(data.dueDate, 'yyyy-MM-dd') : undefined,
    notes: data.notes,
  };

  const response = await api.post('/api/loans/create', payload);
  return response.data;
}

export async function addBorrower(
  borrowerName: string,
): Promise<borrowersData> {
  const response = await api.post('/api/loans/add-borrower', {
    borrowerName,
  });
  return response.data;
}

export type RecordPaymentValues = {
  loanId: number;
  paymentDate: Date;
  totalAmount: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'upi' | 'cheque' | 'other';
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
    paymentDate: format(data.paymentDate, 'yyyy-MM-dd'),
  };

  const response = await api.post('/api/loans/record-payment', payload);
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
  const response = await api.post('/api/loans/bulk-future-payments', payload);
  return response.data;
}

// ==================== ACCOUNT TYPES ====================

export type AccountType = 'CASH' | 'BANK' | 'CREDIT';

export type Account = {
  id: number;
  name: string;
  type: AccountType;
  balance: number;
  creditLimit?: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateAccountPayload = {
  name: string;
  type: AccountType;
  balance?: number;
  creditLimit?: number;
};

// ==================== TRANSFER TYPES ====================

export type Transfer = {
  id: number;
  date: string;
  amount: number;
  fromAccountId: number;
  toAccountId: number;
  remarks?: string;
  fromAccount?: Account;
  toAccount?: Account;
};

export type CreateTransferPayload = {
  date: string;
  amount: number;
  fromAccountId: number;
  toAccountId: number;
  remarks?: string;
};

// ==================== EXPENSE TYPES ====================

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
  createdAt: string;
};

export type ExpenseListResponse = {
  data: ExpenseRow[];
  sumOfExpense: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type ExpenseQueryParams = {
  startDate?: string;
  endDate?: string;
  categoryId?: number;
  accountId?: number;
  userName?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type CreateExpensePayload = {
  date: string; // yyyy-MM-dd
  amount: number;
  remarks?: string;
  userName?: string;
  accountId: number;
  categoryId: number;
  emiPaymentId?: number;
};

export type UpdateExpensePayload = Partial<CreateExpensePayload>;

export type ExpenseSummaryPoint = {
  period: string;
  totalAmount: number;
  count: number;
};

export type ExpenseSummaryParams = {
  granularity: 'day' | 'week' | 'month' | 'year';
  startDate?: string;
  endDate?: string;
};

// ==================== CATEGORY TYPES ====================

export interface CategoryNode {
  id: number;
  name: string;
  level: number;
  parentId: number | null;
  selfTotal: number;
  total: number;
  children: CategoryNode[];
}

export type CategoryWithSubs = {
  id: number;
  name: string;
  level: number;
  parentId: number | null;
  parentName?: string | null;
  fullPath?: string;
  subCategories: SubCategory[];
};

export type CategoryFlat = {
  id: number;
  name: string;
  level: number;
  parentId: number | null;
  parentName?: string | null;
  fullPath?: string;
};

export type SubCategory = {
  id: number;
  name: string;
  level: number;
  parentId?: number;
  subCategories?: SubCategory[];
};

// ==================== ACCOUNT API FUNCTIONS ====================

export async function fetchAccounts(): Promise<Account[]> {
  const response = await api.get('/api/accounts');
  return response.data;
}

export async function createAccount(
  data: CreateAccountPayload,
): Promise<Account> {
  const response = await api.post('/api/accounts', data);
  return response.data;
}

export async function updateAccount(
  id: number,
  data: Partial<CreateAccountPayload>,
): Promise<Account> {
  const response = await api.put(`/api/accounts/${id}`, data);
  return response.data;
}

export async function deleteAccount(id: number): Promise<void> {
  await api.delete(`/api/accounts/${id}`);
}

export async function updateAccountBalance(
  id: number,
  balance: number,
): Promise<Account> {
  const response = await api.put(`/api/accounts/${id}/balance`, { balance });
  return response.data;
}

// ==================== TRANSFER API FUNCTIONS ====================

export async function fetchTransfers(): Promise<Transfer[]> {
  const response = await api.get('/api/transfers');
  return response.data;
}

export async function createTransfer(
  data: CreateTransferPayload,
): Promise<Transfer> {
  const response = await api.post('/api/transfers', data);
  return response.data;
}

export async function deleteTransfer(id: number): Promise<void> {
  await api.delete(`/api/transfers/${id}`);
}

// ==================== EXPENSE API FUNCTIONS ====================

export async function fetchExpenses(
  params?: ExpenseQueryParams,
): Promise<ExpenseListResponse> {
  const response = await api.get('/api/expenses', { params });
  return response.data;
}

export async function fetchExpenseById(id: number): Promise<ExpenseRow> {
  const response = await api.get(`/api/expenses/${id}`);
  return response.data;
}

export async function createExpense(
  data: CreateExpensePayload,
): Promise<ExpenseRow> {
  const response = await api.post('/api/expenses/create', data);
  return response.data;
}

export async function bulkCreateExpenses(
  data: CreateExpensePayload[],
): Promise<ExpenseRow[]> {
  const response = await api.post('/api/expenses/bulk-create', data);
  return response.data;
}

export async function updateExpense(
  id: number,
  data: UpdateExpensePayload,
): Promise<ExpenseRow> {
  const response = await api.put(`/api/expenses/${id}`, data);
  return response.data;
}

export async function deleteExpense(id: number): Promise<void> {
  await api.delete(`/api/expenses/${id}`);
}

export async function fetchExpenseSummary(
  params: ExpenseSummaryParams,
): Promise<ExpenseSummaryPoint[]> {
  const response = await api.get('/api/expenses/summary', { params });
  return response.data;
}

// ==================== CATEGORY API FUNCTIONS ====================

export async function fetchCategories(): Promise<CategoryWithSubs[]> {
  const response = await api.get('/api/categories');
  return response.data;
}

export async function fetchCategoriesFlat(): Promise<CategoryFlat[]> {
  const response = await api.get('/api/categories/flat');
  return response.data;
}

export async function fetchCategoriesTree(): Promise<any> {
  const response = await api.get('/api/categories/tree');
  return response.data;
}

export async function fetchLeafCategories(): Promise<CategoryFlat[]> {
  const response = await api.get('/api/categories/leaf');
  return response.data;
}

export async function fetchCategoryStats(query: {
  level?: number;
  parentId?: number;
  dateFrom?: string;
  dateTo?: string;
}): Promise<any> {
  const params = new URLSearchParams();
  if (query.level !== undefined) params.set('level', query.level.toString());
  if (query.parentId !== undefined)
    params.set('parentId', query.parentId.toString());
  if (query.dateFrom !== undefined) params.set('dateFrom', query.dateFrom);
  if (query.dateTo !== undefined) params.set('dateTo', query.dateTo);

  const queryString = params.toString();
  const url = `/api/categories/stats${queryString ? `?${queryString}` : ''}`;

  const response = await api.get(url);
  return response.data;
}

export async function fetchHierarchicalCategoryTotals(
  startDate?: string,
  endDate?: string,
): Promise<CategoryNode[]> {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);

  const queryString = params.toString();
  const url = `/api/categories/hierarchical-totals${
    queryString ? `?${queryString}` : ''
  }`;

  const response = await api.get(url);
  return response.data;
}

export async function createCategory(data: {
  name: string;
  parentId?: number;
  level?: number;
}): Promise<CategoryFlat> {
  const response = await api.post('/api/categories', data);
  return response.data;
}

export async function deleteCategory(id: number): Promise<any> {
  await api.delete(`/api/categories/${id}`);
}

// ==================== DASHBOARD + CATEGORY TOTALS ====================

export type CategoryTotal = {
  id: number;
  name: string;
  total: number;
  count?: number;
};

export type DashboardKPIs = {
  thisMonth: { total: number; count: number };
  lastMonth: { total: number; count: number };
  overall: { total: number; count: number };
  accounts: {
    id: number;
    name: string;
    type: AccountType;
    balance: number;
  }[];
  recentTransactions: {
    id: number;
    date: string;
    amount: number;
    remarks: string | null;
    categories: string[];
  }[];
};

export async function fetchCategoryTotals(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<CategoryTotal[]> {
  const response = await api.get('/api/expenses/category-totals', { params });
  return response.data;
}

export async function fetchDashboardKPIs(
  startDate?: string,
  endDate?: string,
): Promise<DashboardKPIs> {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  const queryString = params.toString();
  const url = `/api/expenses/dashboard${queryString ? `?${queryString}` : ''}`;
  const response = await api.get(url);
  return response.data;
}

export interface UploadValidationError {
  rowNumber: number;
  field: string;
  value: string;
  error: string;
}

export interface UploadResult {
  inserted: number;
  updated: number;
  deleted: number;
  errors: UploadValidationError[];
}

export async function downloadExpenseTemplate(
  year?: number,
  month?: number,
): Promise<void> {
  const params = new URLSearchParams();
  if (year) params.set('year', year.toString());
  if (month) params.set('month', month.toString());

  const queryString = params.toString();
  const url = `${API_BASE_URL}/api/expense-excel/template${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Failed to download template (${response.status})`,
    );
  }

  const contentType = response.headers.get('content-type');
  if (
    !contentType?.includes('spreadsheet') &&
    !contentType?.includes('excel') &&
    !contentType?.includes('application/vnd')
  ) {
    const text = await response.text();
    throw new Error(`Invalid response: ${text.substring(0, 200)}`);
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download =
    year && month
      ? `expenses_${year}_${month.toString().padStart(2, '0')}.xlsx`
      : 'expense_template.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(downloadUrl);
}

export async function uploadExpenseFile(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<UploadResult>(
    '/api/expense-excel/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );
  return response.data;
}
