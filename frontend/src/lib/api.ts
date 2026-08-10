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

export type SpendType = 'FIXED' | 'DISCRETIONARY';
export type SpendTypeFilter = 'ALL' | 'FIXED' | 'DISCRETIONARY';

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

export async function updateFuturePayment(
  id: number,
  data: {
    totalAmount?: number;
    principalAmount?: number;
    interestAmount?: number;
    plannedDate?: string;
    notes?: string;
  },
): Promise<FuturePaymentRow> {
  const response = await api.put(`/api/loans/future-payment/${id}`, data);
  return response.data;
}

export async function markFuturePaymentRepaid(
  id: number,
  data?: { totalAmount?: number; paymentMethod?: string; notes?: string },
): Promise<{ emiId: number; remaining: number; nextPayment: FuturePaymentRow | null }> {
  const response = await api.post(`/api/loans/future-payment/${id}/mark-repaid`, data ?? {});
  return response.data;
}

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
  spendType: SpendType | null;
  effectiveSpendType: SpendType;
  addedBy: string | null;
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
  sortBy?: 'date' | 'amount';
  sortOrder?: 'asc' | 'desc';
  amountMin?: number;
  amountMax?: number;
  spendTypeFilter?: SpendTypeFilter;
  excludeCategoryIds?: number[];
};

export type CreateExpensePayload = {
  date: string; // yyyy-MM-dd
  amount: number;
  remarks?: string;
  userName?: string;
  accountId: number;
  categoryId: number;
  emiPaymentId?: number;
  spendType?: SpendType;
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
  spendTypeFilter?: SpendTypeFilter;
  excludeCategoryIds?: number[];
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
  spendType: SpendType;
  parentName?: string | null;
  fullPath?: string;
  subCategories: SubCategory[];
};

export type CategoryFlat = {
  id: number;
  name: string;
  level: number;
  parentId: number | null;
  spendType: SpendType;
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
  const response = await api.get('/api/expenses', {
    params: {
      ...params,
      excludeCategoryIds: params?.excludeCategoryIds?.join(','),
    },
  });
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

export type DuplicateCriteria = {
  byDate?: boolean;
  byAmount?: boolean;
  byName?: boolean;
};

export async function fetchDuplicateExpenses(
  criteria?: DuplicateCriteria,
): Promise<ExpenseRow[][]> {
  const params: Record<string, string> = {};
  if (criteria?.byDate === false) params.byDate = 'false';
  if (criteria?.byAmount === false) params.byAmount = 'false';
  if (criteria?.byName === false) params.byName = 'false';
  const response = await api.get('/api/expenses/duplicates', { params });
  return response.data;
}

export type SuggestionsResult = {
  categories: { id: number; name: string; count: number }[];
  remarks: string[];
};

export async function fetchSuggestionsForUser(userName: string): Promise<SuggestionsResult> {
  const response = await api.get('/api/expenses/suggestions', { params: { userName } });
  return response.data;
}

// ==================== SPLIT EXPENSE ====================

export type SplitItem = {
  amount: number;
  categoryId: number;
  remarks?: string;
  accountId?: number;
  date?: string;
};

export async function splitExpense(
  id: number,
  items: SplitItem[],
): Promise<ExpenseRow[]> {
  const response = await api.post(`/api/expenses/${id}/split`, { items });
  return response.data;
}

// ==================== OCR RECEIPT ====================

export type OcrCategoryPrediction = {
  categoryId: number;
  categoryName: string;
  confidence: number;
};

export type OcrLineItem = {
  name: string;
  amount: number;
  predictions?: OcrCategoryPrediction[];
};

export type OcrReceiptResult = {
  items: OcrLineItem[];
  total: number | null;
  rawText: string;
};

const OCR_BASE_URL =
  import.meta.env.VITE_OCR_SERVICE_URL || 'http://localhost:8000';

export async function scanReceipt(file: File): Promise<OcrReceiptResult> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axios.post<OcrReceiptResult>(
    `${OCR_BASE_URL}/ocr/receipt`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return response.data;
}

// ==================== GPAY IMPORT ====================

export type GpayPreviewRow = {
  rowIndex: number;
  date: string;
  amount: number;
  account: string;
  accountId: number | null;
  note: string;
  userName: string;
  categoryId: number | null;
  categoryName: string | null;
  remarks: string | null;
  canonicalName: string | null;
  confidence: 'high' | 'medium' | 'low' | null;
  isTransfer: boolean;
  financeSubtype: string | null;
  needsReview: boolean;
  reviewReason: string | null;
};

export type GpayConfirmRow = {
  date: string;
  amount: number;
  account: string;
  accountId?: number;
  note?: string;
  userName: string;
  categoryId?: number;
  remarks?: string;
  skip?: boolean;
};

export type GpayImportResult = {
  inserted: number;
  skipped: number;
};

export type NameVariant = {
  userName: string;
  count: number;
  canonicalName: string | null;
  categoryId: number | null;
};

export async function previewGpayImport(file: File): Promise<GpayPreviewRow[]> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post<GpayPreviewRow[]>(
    '/api/gpay-import/preview',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return response.data;
}

export async function confirmGpayImport(
  rows: GpayConfirmRow[],
): Promise<GpayImportResult> {
  const response = await api.post<GpayImportResult>('/api/gpay-import/confirm', {
    rows,
  });
  return response.data;
}

export async function fetchNameVariants(): Promise<NameVariant[]> {
  const response = await api.get<NameVariant[]>('/api/gpay-import/name-variants');
  return response.data;
}

export function downloadGpayCsvTemplate(): void {
  const url = `${API_BASE_URL}/api/gpay-import/template`;
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gpay_import_template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export type CategoryInconsistency = {
  userName: string;
  canonicalName: string | null;
  categories: { categoryId: number; categoryName: string; count: number }[];
  recommendedCategoryId: number | null;
  recommendedCategoryName: string | null;
  totalExpenses: number;
};

export async function fetchInconsistencies(): Promise<CategoryInconsistency[]> {
  const response = await api.get<CategoryInconsistency[]>('/api/gpay-import/inconsistencies');
  return response.data;
}

export async function fixInconsistency(
  userName: string,
  categoryId: number,
): Promise<{ updated: number }> {
  const response = await api.put(`/api/gpay-import/fix-inconsistency/${encodeURIComponent(userName)}`, {
    categoryId,
  });
  return response.data;
}

export async function trainOcrModel(): Promise<{
  status: string;
  count?: number;
  categories?: number;
  message?: string;
}> {
  const response = await axios.post(`${OCR_BASE_URL}/ocr/train`);
  return response.data;
}

export async function bulkUpdateExpenses(
  ids: number[],
  data: { categoryId?: number; remarks?: string; userName?: string; spendType?: SpendType },
): Promise<{ count: number }> {
  const response = await api.put('/api/expenses/bulk-update', { ids, ...data });
  return response.data;
}

export async function fetchExpenseSummary(
  params: ExpenseSummaryParams,
): Promise<ExpenseSummaryPoint[]> {
  const response = await api.get('/api/expenses/summary', {
    params: {
      ...params,
      excludeCategoryIds: params.excludeCategoryIds?.join(','),
    },
  });
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
  spendTypeFilter?: SpendTypeFilter,
  excludeCategoryIds?: number[],
): Promise<CategoryNode[]> {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  if (spendTypeFilter) params.set('spendTypeFilter', spendTypeFilter);
  if (excludeCategoryIds && excludeCategoryIds.length > 0) {
    params.set('excludeCategoryIds', excludeCategoryIds.join(','));
  }

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
  spendType?: SpendType;
}): Promise<CategoryFlat> {
  const response = await api.post('/api/categories', data);
  return response.data;
}

export async function updateCategory(
  id: number,
  data: { name: string; spendType?: SpendType },
): Promise<CategoryFlat> {
  const response = await api.put(`/api/categories/${id}`, data);
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

export type AccountTotal = {
  id: number | null;
  name: string;
  total: number;
};

export async function fetchAccountTotals(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<AccountTotal[]> {
  const response = await api.get('/api/expenses/account-totals', { params });
  return response.data;
}

export async function fetchCategoryTotals(params?: {
  startDate?: string;
  endDate?: string;
  spendTypeFilter?: SpendTypeFilter;
  excludeCategoryIds?: number[];
}): Promise<CategoryTotal[]> {
  const response = await api.get('/api/expenses/category-totals', {
    params: {
      ...params,
      excludeCategoryIds: params?.excludeCategoryIds?.join(','),
    },
  });
  return response.data;
}

export async function fetchDashboardKPIs(
  startDate?: string,
  endDate?: string,
  type?: string,
  spendTypeFilter?: SpendTypeFilter,
  excludeCategoryIds?: number[],
): Promise<DashboardKPIs> {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  if (type) params.set('type', type);
  if (spendTypeFilter) params.set('spendTypeFilter', spendTypeFilter);
  if (excludeCategoryIds && excludeCategoryIds.length > 0) {
    params.set('excludeCategoryIds', excludeCategoryIds.join(','));
  }
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

// ==================== BUDGET ====================

export type Budget = {
  id: number;
  discretionaryBudget: number;
  updatedAt: string;
};

export async function fetchBudget(): Promise<Budget | null> {
  const response = await api.get('/api/budget');
  return response.data;
}

export async function updateBudget(discretionaryBudget: number): Promise<Budget> {
  const response = await api.put('/api/budget', { discretionaryBudget });
  return response.data;
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
