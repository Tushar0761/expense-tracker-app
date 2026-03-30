import { AddExpenseForm } from '@/components/AddExpenseForm';
import { BulkExpenseForm } from '@/components/BulkExpenseForm';
import { BulkUpload } from '@/components/BulkUpload';
import { DatePickerInput } from '@/components/DatePickerInput';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  deleteExpense,
  fetchAccounts,
  fetchCategoriesFlat,
  fetchExpenses,
  type Account,
  type CategoryFlat,
  type ExpenseListResponse,
  type ExpenseQueryParams,
  type ExpenseRow,
} from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ChevronsLeft,
  ChevronsRight,
  Edit2,
  Filter,
  List,
  LucideChevronLeft,
  LucideChevronRight,
  Plus,
  Trash2,
  Upload,
  Wallet,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';

const ROWS_PER_PAGE = 10;

export function Expenses() {
  const queryClient = useQueryClient();

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [userNameFilter, setUserNameFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRow | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(true);
  const [jumpToPage, setJumpToPage] = useState('');

  // Build query params
  const queryParams: ExpenseQueryParams = useMemo(
    () => ({
      page,
      limit: ROWS_PER_PAGE,
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      ...(categoryFilter && { categoryId: Number(categoryFilter) }),
      ...(accountFilter && { accountId: Number(accountFilter) }),
      ...(userNameFilter && { userName: userNameFilter }),
      ...(search && { search }),
    }),
    [
      page,
      startDate,
      endDate,
      categoryFilter,
      accountFilter,
      userNameFilter,
      search,
    ],
  );

  // Fetch expenses from API
  const { data: expenseData, isLoading } = useQuery<ExpenseListResponse>({
    queryKey: ['expenses', queryParams],
    queryFn: () => fetchExpenses(queryParams),
  });

  // Fetch categories for filter dropdown
  const { data: categories = [] } = useQuery<CategoryFlat[]>({
    queryKey: ['categories-flat'],
    queryFn: fetchCategoriesFlat,
  });

  // Fetch accounts for filter dropdown
  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
  });

  // Delete expense mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteExpense(id),
    onSuccess: () => {
      toast.success('Expense deleted');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
    onError: () => {
      toast.error('Failed to delete expense');
    },
  });

  const expenses = useMemo(() => expenseData?.data ?? [], [expenseData]);
  const sumOfExpense = useMemo(
    () => expenseData?.sumOfExpense ?? 0,
    [expenseData],
  );
  const pagination = expenseData?.pagination;

  // Total entries from current filtered data
  const totalEntries = pagination?.total ?? 0;

  const handleEdit = (expense: ExpenseRow) => {
    setEditingExpense(expense);
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingExpense(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingExpense(null);
  };

  const handleJumpToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpToPage, 10);
    if (pageNum && pageNum >= 1 && pageNum <= (pagination?.totalPages ?? 1)) {
      setPage(pageNum);
      setJumpToPage('');
    }
  };

  React.useEffect(() => {
    setPage(1);
  }, [
    categoryFilter,
    accountFilter,
    userNameFilter,
    startDate,
    endDate,
    search,
  ]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
          <p className="text-[13px] text-muted-foreground">
            Track and manage your daily spendings.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Button
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={() => setShowFilters((v) => !v)}
          >
            <Filter size={14} /> Filters
          </Button>

          <Button size="sm" onClick={handleAdd} className="gap-1.5 h-8 text-xs">
            <Plus size={14} /> Add Expense
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowBulkModal(true)}
            className="gap-1.5 h-8 text-xs"
          >
            <List size={14} /> Bulk Add
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowUploadModal(true)}
            className="gap-1.5 h-8 text-xs"
          >
            <Upload size={14} /> Bulk Upload
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="p-3 bg-muted/20 border-border/40">
          <div className="flex gap-4 flex-wrap items-center">
            <div className="grid gap-1">
              <span className="text-[9px] uppercase font-bold text-muted-foreground ml-0.5">
                Range
              </span>
              <div className="flex items-center gap-1">
                <DatePickerInput
                  type="date"
                  value={startDate}
                  onChange={setStartDate}
                  className="w-[110px]"
                />
                <span className="text-muted-foreground text-[10px]">to</span>
                <DatePickerInput
                  type="date"
                  value={endDate}
                  onChange={setEndDate}
                  className="w-[110px]"
                />
              </div>
            </div>

            <div className="grid gap-1">
              <span className="text-[9px] uppercase font-bold text-muted-foreground ml-0.5">
                Account
              </span>
              <select
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                className="border rounded h-7 px-2 text-[11px] bg-background min-w-[130px]"
              >
                <option value="">All Accounts</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={String(acc.id)}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-1">
              <span className="text-[9px] uppercase font-bold text-muted-foreground ml-0.5">
                Category
              </span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border rounded h-7 px-2 text-[11px] bg-background min-w-[130px]"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={String(cat.id)}>
                    {cat.parentName
                      ? `${cat.name} (${cat.parentName})`
                      : cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-1">
              <span className="text-[9px] uppercase font-bold text-muted-foreground ml-0.5">
                Sent To
              </span>
              <input
                type="text"
                value={userNameFilter}
                onChange={(e) => setUserNameFilter(e.target.value)}
                className="border rounded h-7 px-2 text-[11px] bg-background w-[100px]"
                placeholder="Username..."
              />
            </div>

            <div className="grid gap-1 flex-1">
              <span className="text-[9px] uppercase font-bold text-muted-foreground ml-0.5">
                Search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border rounded h-7 px-2 text-[11px] bg-background w-full"
                placeholder="Search remarks..."
              />
            </div>

            {(startDate ||
              endDate ||
              categoryFilter ||
              accountFilter ||
              userNameFilter ||
              search) && (
              <div className="pt-5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setCategoryFilter('');
                    setAccountFilter('');
                    setUserNameFilter('');
                    setSearch('');
                  }}
                >
                  Reset
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Card className="border shadow-none  bg-muted/20 ">
          <CardContent className="px-2.5 flex items-center justify-between">
            <div className="">
              <p className="text-[10px] uppercase font-medium text-muted-foreground tracking-wide">
                Total Sum
              </p>
              <p className="text-base font-semibold">
                ₹{sumOfExpense.toLocaleString()}
              </p>
            </div>

            <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
              ₹
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-none  bg-muted/20 ">
          <CardContent className="px-2.5 flex items-center justify-between">
            <div className="">
              <p className="text-[10px] uppercase font-medium text-muted-foreground tracking-wide">
                Total Entries
              </p>
              <p className="text-base font-semibold">
                {totalEntries.toLocaleString()}
              </p>
            </div>

            <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
              #
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="overflow-hidden border border-border/50 shadow-sm bg-card/20">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/30 border-b">
                  <th className="py-1.5 px-3 text-xs font-semibold">Date</th>
                  <th className="py-1.5 px-3 text-xs font-semibold">Account</th>
                  <th className="py-1.5 px-3 text-xs font-semibold">
                    Categories
                  </th>
                  <th className="py-1.5 px-3 text-xs font-semibold">Remarks</th>
                  <th className="py-1.5 px-3 text-xs font-semibold">Sent To</th>
                  <th className="py-1.5 px-3 text-xs font-semibold text-right">
                    Amount
                  </th>
                  <th className="py-1.5 px-3 text-xs font-semibold text-center">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-muted-foreground animate-pulse"
                    >
                      Loading amazing data...
                    </td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-muted-foreground"
                    >
                      No expenses found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  expenses.map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-primary/[0.02] transition-colors group border-b border-border/10"
                    >
                      <td className="py-1.5 px-3 font-medium whitespace-nowrap text-muted-foreground tabular-nums text-xs">
                        {format(new Date(tx.date), 'dd MMM yy')}
                      </td>
                      <td className="py-1.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center">
                            <Wallet className="h-2.5 w-2.5 text-primary" />
                          </div>
                          <span className="font-semibold text-[11px]">
                            {tx.accountName || 'Unlinked'}
                          </span>
                        </div>
                      </td>
                      <td className="py-1.5 px-3">
                        <Badge
                          variant="secondary"
                          className="text-[9px] py-0 px-1 h-3.5 font-normal"
                        >
                          {tx.categoryName || '-'}
                        </Badge>
                      </td>
                      <td className="py-1.5 px-3 max-w-[180px] truncate text-xs text-muted-foreground">
                        {tx.remarks || '—'}
                      </td>
                      <td className="py-1.5 px-3 max-w-[120px] truncate text-xs text-muted-foreground">
                        {tx.userName || '—'}
                      </td>
                      <td className="py-1.5 px-3 text-right font-bold text-rose-500 whitespace-nowrap tabular-nums text-sm">
                        ₹{tx.amount.toLocaleString()}
                      </td>
                      <td className="py-1.5 px-3">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-blue-500 hover:text-blue-700 hover:bg-blue-50/50"
                            onClick={() => {
                              console.log('editing', tx);

                              return handleEdit(tx);
                            }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-rose-500 hover:text-rose-700 hover:bg-rose-50/50"
                            onClick={() => {
                              if (
                                window.confirm(
                                  'Are you sure you want to delete this expense?',
                                )
                              ) {
                                deleteMutation.mutate(tx.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="p-3 border-t flex justify-between items-center bg-muted/10">
              <span className="text-xs text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} •{' '}
                {pagination.total} entries
              </span>

              <div className="flex items-center gap-2">
                {/* Jump to page */}
                <form
                  onSubmit={handleJumpToPage}
                  className="flex items-center gap-1"
                >
                  <input
                    type="number"
                    min={1}
                    max={pagination.totalPages}
                    value={jumpToPage}
                    onChange={(e) => setJumpToPage(e.target.value)}
                    placeholder="#"
                    className="w-12 h-7 text-xs border rounded px-1 bg-background"
                  />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                  >
                    Go
                  </Button>
                </form>

                <div className="h-4 w-px bg-border mx-1" />

                {/* First */}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  <ChevronsLeft className="h-3 w-3" />
                </Button>

                {/* Previous */}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <LucideChevronLeft className="h-3 w-3" />
                </Button>

                {/* Page indicator */}
                <span className="text-xs px-2 min-w-[60px] text-center">
                  {page} / {pagination.totalPages}
                </span>

                {/* Next */}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() =>
                    setPage((p) => Math.min(pagination.totalPages, p + 1))
                  }
                  disabled={page >= pagination.totalPages}
                >
                  <LucideChevronRight className="h-3 w-3" />
                </Button>

                {/* Last */}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setPage(pagination.totalPages)}
                  disabled={page >= pagination.totalPages}
                >
                  <ChevronsRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <AddExpenseForm
        isOpen={showModal}
        onClose={handleCloseModal}
        expense={editingExpense}
      />

      {/* Bulk Add Modal */}
      <BulkExpenseForm
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['expenses'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
        }}
      />

      {/* Bulk Upload Modal */}
      <BulkUpload
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['expenses'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
        }}
      />
    </div>
  );
}
