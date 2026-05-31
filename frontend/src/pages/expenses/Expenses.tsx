import { AddExpenseForm } from '@/components/AddExpenseForm';
import { BulkExpenseForm } from '@/components/BulkExpenseForm';
import { BulkUpload } from '@/components/BulkUpload';
import { SplitExpenseDialog } from '@/components/SplitExpenseDialog';
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
  ArrowDownUp,
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  Edit2,
  Filter,
  IndianRupee,
  List,
  LucideChevronLeft,
  LucideChevronRight,
  Plus,
  ScissorsLineDashed,
  Search,
  Tag,
  Trash2,
  Upload,
  User,
  Wallet,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';

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
  const [splittingExpense, setSplittingExpense] = useState<ExpenseRow | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(true);
  const [jumpToPage, setJumpToPage] = useState('');
  const [amountType, setAmountType] = useState<'' | 'gt' | 'lt' | 'between'>('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const hasActiveFilters =
    !!(startDate || endDate || categoryFilter || accountFilter || userNameFilter || search || amountType);

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setCategoryFilter('');
    setAccountFilter('');
    setUserNameFilter('');
    setSearch('');
    setAmountType('');
    setAmountMin('');
    setAmountMax('');
  };

  // Build query params
  const queryParams: ExpenseQueryParams = useMemo(
    () => ({
      page,
      limit: rowsPerPage,
      sortBy,
      sortOrder,
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      ...(categoryFilter && { categoryId: Number(categoryFilter) }),
      ...(accountFilter && { accountId: Number(accountFilter) }),
      ...(userNameFilter && { userName: userNameFilter }),
      ...(search && { search }),
      ...(amountType === 'gt' && amountMin ? { amountMin: Number(amountMin) } : {}),
      ...(amountType === 'lt' && amountMax ? { amountMax: Number(amountMax) } : {}),
      ...(amountType === 'between' && amountMin ? { amountMin: Number(amountMin) } : {}),
      ...(amountType === 'between' && amountMax ? { amountMax: Number(amountMax) } : {}),
    }),
    [page, rowsPerPage, startDate, endDate, categoryFilter, accountFilter, userNameFilter, search, amountType, amountMin, amountMax, sortBy, sortOrder],
  );

  const { data: expenseData, isLoading } = useQuery<ExpenseListResponse>({
    queryKey: ['expenses', queryParams],
    queryFn: () => fetchExpenses(queryParams),
  });

  const { data: categories = [] } = useQuery<CategoryFlat[]>({
    queryKey: ['categories-flat'],
    queryFn: fetchCategoriesFlat,
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteExpense(id),
    onSuccess: () => {
      toast.success('Expense deleted');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
    onError: () => toast.error('Failed to delete expense'),
  });

  const expenses = useMemo(() => expenseData?.data ?? [], [expenseData]);
  const sumOfExpense = useMemo(() => expenseData?.sumOfExpense ?? 0, [expenseData]);
  const pagination = expenseData?.pagination;
  const totalEntries = pagination?.total ?? 0;

  const handleEdit = (expense: ExpenseRow) => { setEditingExpense(expense); setShowModal(true); };
  const handleAdd = () => { setEditingExpense(null); setShowModal(true); };
  const handleCloseModal = () => { setShowModal(false); setEditingExpense(null); };

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
  }, [categoryFilter, accountFilter, userNameFilter, startDate, endDate, search, amountType, amountMin, amountMax, rowsPerPage]);

  const sortedCategories = useMemo(
    () =>
      [...categories].sort((a, b) => {
        const nameA = a.parentName ? `${a.parentName} > ${a.name}` : a.name;
        const nameB = b.parentName ? `${b.parentName} > ${b.name}` : b.name;
        return nameA.localeCompare(nameB);
      }),
    [categories],
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-500 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
          <p className="text-[13px] text-muted-foreground">Track and manage your daily spendings.</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Button
            size="sm"
            variant={showFilters ? 'default' : 'outline'}
            className="gap-1.5 h-8 text-xs"
            onClick={() => setShowFilters((v) => !v)}
          >
            <Filter size={13} /> Filters
            {hasActiveFilters && (
              <span className="ml-0.5 h-4 w-4 rounded-full bg-amber-400 text-[9px] font-bold text-amber-900 flex items-center justify-center">
                !
              </span>
            )}
          </Button>
          <Button size="sm" onClick={handleAdd} className="gap-1.5 h-8 text-xs bg-green-600 hover:bg-green-700">
            <Plus size={13} /> Add Expense
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowBulkModal(true)} className="gap-1.5 h-8 text-xs">
            <List size={13} /> Bulk Add
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowUploadModal(true)} className="gap-1.5 h-8 text-xs">
            <Upload size={13} /> Bulk Upload
          </Button>
        </div>
      </div>

      {/* ── FILTER PANEL ── */}
      {showFilters && (
        <Card className="border border-border/60 overflow-hidden shadow-sm">
          {/* Row 1: Date · Account · Category · Sent To · Search */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 px-4 py-3 border-b border-border/20 bg-muted/10">
            {/* Date Range */}
            <div className="space-y-1.5 col-span-2 md:col-span-1 lg:col-span-1">
              <p className="text-[9px] uppercase font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 tracking-wider">
                <CalendarDays className="h-2.5 w-2.5" /> Date Range
              </p>
              <div className="flex items-center gap-1">
                <DatePickerInput
                  type="date"
                  value={startDate}
                  onChange={setStartDate}
                  className={`flex-1 min-w-0 ${startDate ? 'border-blue-400' : ''}`}
                />
                <span className="text-[9px] text-muted-foreground shrink-0">–</span>
                <DatePickerInput
                  type="date"
                  value={endDate}
                  onChange={setEndDate}
                  className={`flex-1 min-w-0 ${endDate ? 'border-blue-400' : ''}`}
                />
              </div>
            </div>

            {/* Account */}
            <div className="space-y-1.5">
              <p className="text-[9px] uppercase font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 tracking-wider">
                <Wallet className="h-2.5 w-2.5" /> Account
              </p>
              <select
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                className={`w-full border rounded-md h-7 px-2 text-[11px] bg-background transition-colors ${accountFilter ? 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/10' : ''}`}
              >
                <option value="">All Accounts</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={String(acc.id)}>{acc.name}</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <p className="text-[9px] uppercase font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 tracking-wider">
                <Tag className="h-2.5 w-2.5" /> Category
              </p>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={`w-full border rounded-md h-7 px-2 text-[11px] bg-background transition-colors ${categoryFilter ? 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/10' : ''}`}
              >
                <option value="">All Categories</option>
                {sortedCategories.map((cat) => (
                  <option key={cat.id} value={String(cat.id)}>
                    {cat.parentName ? `${cat.parentName} > ${cat.name}` : cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sent To */}
            <div className="space-y-1.5">
              <p className="text-[9px] uppercase font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1 tracking-wider">
                <User className="h-2.5 w-2.5" /> Sent To
              </p>
              <input
                type="text"
                value={userNameFilter}
                onChange={(e) => setUserNameFilter(e.target.value)}
                className={`w-full border rounded-md h-7 px-2 text-[11px] bg-background transition-colors ${userNameFilter ? 'border-violet-400 bg-violet-50/30 dark:bg-violet-900/10' : ''}`}
                placeholder="Recipient name…"
              />
            </div>

            {/* Search */}
            <div className="space-y-1.5">
              <p className="text-[9px] uppercase font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1 tracking-wider">
                <Search className="h-2.5 w-2.5" /> Search
              </p>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full border rounded-md h-7 px-2 text-[11px] bg-background transition-colors ${search ? 'border-violet-400 bg-violet-50/30 dark:bg-violet-900/10' : ''}`}
                placeholder="Search remarks…"
              />
            </div>
          </div>

          {/* Row 2: Amount · Sort · Reset */}
          <div className="px-4 py-3 flex flex-wrap items-end gap-5 bg-background">
            {/* Amount filter */}
            <div className="space-y-1.5">
              <p className="text-[9px] uppercase font-bold text-amber-600 dark:text-amber-500 flex items-center gap-1 tracking-wider">
                <IndianRupee className="h-2.5 w-2.5" /> Amount
              </p>
              <div className="flex items-center gap-2">
                {/* Toggle pill group */}
                <div className="flex rounded-md overflow-hidden border border-border divide-x divide-border">
                  {(
                    [
                      ['', 'Any'],
                      ['gt', '›'],
                      ['lt', '‹'],
                      ['between', '↔'],
                    ] as [string, string][]
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => {
                        setAmountType(val as '' | 'gt' | 'lt' | 'between');
                        setAmountMin('');
                        setAmountMax('');
                      }}
                      className={`px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        amountType === val
                          ? 'bg-amber-500 text-white'
                          : 'bg-background text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Fixed-width inputs area — prevents layout shift */}
                <div className="flex items-center gap-1 w-[140px]">
                  {(amountType === 'gt' || amountType === 'between') && (
                    <input
                      type="number"
                      value={amountMin}
                      onChange={(e) => setAmountMin(e.target.value)}
                      placeholder={amountType === 'between' ? 'Min' : '₹'}
                      className="border rounded-md h-7 px-2 text-[11px] bg-background border-amber-300 w-full"
                    />
                  )}
                  {amountType === 'between' && (
                    <span className="text-[10px] text-muted-foreground shrink-0">–</span>
                  )}
                  {(amountType === 'lt' || amountType === 'between') && (
                    <input
                      type="number"
                      value={amountMax}
                      onChange={(e) => setAmountMax(e.target.value)}
                      placeholder={amountType === 'between' ? 'Max' : '₹'}
                      className="border rounded-md h-7 px-2 text-[11px] bg-background border-amber-300 w-full"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="h-8 w-px bg-border hidden sm:block" />

            {/* Sort */}
            <div className="space-y-1.5">
              <p className="text-[9px] uppercase font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1 tracking-wider">
                <ArrowDownUp className="h-2.5 w-2.5" /> Sort
              </p>
              <div className="flex items-center gap-2">
                {/* Sort field toggle */}
                <div className="flex rounded-md overflow-hidden border border-border divide-x divide-border">
                  {(['date', 'amount'] as const).map((field) => (
                    <button
                      key={field}
                      onClick={() => setSortBy(field)}
                      className={`px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        sortBy === field
                          ? 'bg-sky-500 text-white'
                          : 'bg-background text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {field === 'date' ? 'Date' : 'Amount'}
                    </button>
                  ))}
                </div>
                {/* Direction toggle */}
                <button
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                  className="flex items-center gap-1 px-2.5 h-7 text-[11px] font-semibold rounded-md border border-border bg-background hover:bg-muted transition-colors text-muted-foreground"
                >
                  {sortOrder === 'desc'
                    ? sortBy === 'date' ? '↓ Newest' : '↓ High'
                    : sortBy === 'date' ? '↑ Oldest' : '↑ Low'}
                </button>
              </div>
            </div>

            {/* Spacer + Reset */}
            <div className="flex-1" />
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-7 text-[11px] text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 gap-1"
              >
                <X className="h-3 w-3" /> Reset filters
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="border shadow-none bg-muted/20">
          <CardContent className="px-2.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-medium text-muted-foreground tracking-wide">Total Sum</p>
              <p className="text-base font-semibold">₹{sumOfExpense.toLocaleString()}</p>
            </div>
            <div className="h-8 w-8 rounded-md bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-sm font-bold text-rose-600 dark:text-rose-400">₹</div>
          </CardContent>
        </Card>
        <Card className="border shadow-none bg-muted/20">
          <CardContent className="px-2.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-medium text-muted-foreground tracking-wide">Total Entries</p>
              <p className="text-base font-semibold">{totalEntries.toLocaleString()}</p>
            </div>
            <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">#</div>
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
                  <th className="py-1.5 px-3 text-xs font-semibold">Category</th>
                  <th className="py-1.5 px-3 text-xs font-semibold">Remarks</th>
                  <th className="py-1.5 px-3 text-xs font-semibold">Sent To</th>
                  <th className="py-1.5 px-3 text-xs font-semibold text-right">Amount</th>
                  <th className="py-1.5 px-3 text-xs font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground animate-pulse text-sm">
                      Loading…
                    </td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground text-sm">
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
                        {format(new Date(tx.date), 'dd MMM yy, E')}
                      </td>
                      <td className="py-1.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center">
                            <Wallet className="h-2.5 w-2.5 text-primary" />
                          </div>
                          <span className="font-semibold text-[11px]">{tx.accountName || 'Unlinked'}</span>
                        </div>
                      </td>
                      <td className="py-1.5 px-3">
                        <Badge variant="secondary" className="text-[9px] py-0 px-1 h-3.5 font-normal">
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
                            onClick={() => handleEdit(tx)}
                            title="Edit"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-amber-500 hover:text-amber-700 hover:bg-amber-50/50"
                            onClick={() => setSplittingExpense(tx)}
                            title="Split expense"
                          >
                            <ScissorsLineDashed className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-rose-500 hover:text-rose-700 hover:bg-rose-50/50"
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this expense?')) {
                                deleteMutation.mutate(tx.id);
                              }
                            }}
                            title="Delete"
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

          {/* Pagination + Rows per page */}
          <div className="px-3 py-2 border-t flex flex-wrap justify-between items-center gap-3 bg-muted/10">
            {/* Left: rows per page + entry count */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground font-medium mr-0.5">Rows:</span>
                {[10, 20, 50, 100].map((n) => (
                  <button
                    key={n}
                    onClick={() => { setRowsPerPage(n); setPage(1); }}
                    className={`h-6 min-w-[28px] px-1.5 text-[11px] font-medium rounded border transition-colors ${
                      rowsPerPage === n
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border bg-background hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {pagination && (
                <span className="text-[11px] text-muted-foreground">
                  {((page - 1) * rowsPerPage + 1).toLocaleString()}–
                  {Math.min(page * rowsPerPage, pagination.total).toLocaleString()} of{' '}
                  {pagination.total.toLocaleString()}
                </span>
              )}
            </div>

            {/* Right: page navigation */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <form onSubmit={handleJumpToPage} className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={pagination.totalPages}
                    value={jumpToPage}
                    onChange={(e) => setJumpToPage(e.target.value)}
                    placeholder="#"
                    className="w-11 h-6 text-xs border rounded px-1.5 bg-background"
                  />
                  <Button type="submit" variant="ghost" size="sm" className="h-6 px-2 text-xs">
                    Go
                  </Button>
                </form>
                <div className="h-4 w-px bg-border" />
                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => setPage(1)} disabled={page === 1}>
                  <ChevronsLeft className="h-3 w-3" />
                </Button>
                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <LucideChevronLeft className="h-3 w-3" />
                </Button>
                <span className="text-xs px-1 min-w-[50px] text-center tabular-nums">
                  {page} / {pagination.totalPages}
                </span>
                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages}>
                  <LucideChevronRight className="h-3 w-3" />
                </Button>
                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => setPage(pagination.totalPages)} disabled={page >= pagination.totalPages}>
                  <ChevronsRight className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <SplitExpenseDialog
        expense={splittingExpense}
        isOpen={!!splittingExpense}
        onClose={() => setSplittingExpense(null)}
      />
      <AddExpenseForm isOpen={showModal} onClose={handleCloseModal} expense={editingExpense} />
      <BulkExpenseForm
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['expenses'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
        }}
      />
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
