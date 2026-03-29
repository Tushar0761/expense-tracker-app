import { AddExpenseForm } from '@/components/AddExpenseForm';
import { BulkExpenseForm } from '@/components/BulkExpenseForm';
import { BulkUpload } from '@/components/BulkUpload';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  deleteExpense,
  fetchCategoriesFlat,
  fetchExpenses,
  type CategoryFlat,
  type ExpenseListResponse,
  type ExpenseQueryParams,
  type ExpenseRow,
} from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Edit2,
  Filter,
  List,
  PieChartIcon,
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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRow | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(true);

  // Build query params
  const queryParams: ExpenseQueryParams = useMemo(
    () => ({
      page,
      limit: ROWS_PER_PAGE,
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      ...(categoryFilter && { categoryId: Number(categoryFilter) }),
      ...(search && { search }),
    }),
    [page, startDate, endDate, categoryFilter, search],
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
  const pagination = expenseData?.pagination;

  // Compute KPIs
  const kpis = useMemo(() => {
    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
    const numTransactions = pagination?.total ?? expenses.length;

    const categoryTotals: Record<string, number> = {};
    expenses.forEach((t) => {
      if (t.categoryName) {
        categoryTotals[t.categoryName] =
          (categoryTotals[t.categoryName] || 0) + t.amount;
      }
    });
    const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

    return {
      totalExpense: Math.round(totalExpense * 100) / 100,
      numTransactions,
      topCategories: sorted.slice(0, 3).map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100,
      })),
    };
  }, [expenses, pagination]);

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

  React.useEffect(() => {
    setPage(1);
  }, [categoryFilter, startDate, endDate, search]);

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
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border rounded h-7 px-2 text-[11px] bg-background w-[110px] pr-6"
                  />
                </div>
                <span className="text-muted-foreground text-[10px]">to</span>
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border rounded h-7 px-2 text-[11px] bg-background w-[110px] pr-6"
                  />
                </div>
              </div>
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

            {(startDate || endDate || categoryFilter || search) && (
              <div className="pt-5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setCategoryFilter('');
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

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/30">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
            <CardTitle className="text-[11px] font-bold text-muted-foreground uppercase">
              Total (Page)
            </CardTitle>
            <div className="h-6 w-6 rounded-full bg-rose-500/10 flex items-center justify-center">
              <Trash2 className="h-3 w-3 text-rose-600 opacity-20" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold text-rose-600 tracking-tight">
              ₹{kpis.totalExpense.toLocaleString()}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {kpis.numTransactions} transactions found
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 bg-card/30">
          <CardHeader className="p-3 pb-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[11px] font-bold text-muted-foreground uppercase">
                Spending by Category
              </CardTitle>
              <PieChartIcon className="h-3 w-3 text-primary opacity-40" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="flex gap-3 flex-wrap">
              {kpis.topCategories.length > 0 ? (
                kpis.topCategories.map((cat) => (
                  <div
                    key={cat.name}
                    className="flex-1 min-w-[100px] bg-muted/20 px-2.5 py-1.5 rounded-lg border border-border/30"
                  >
                    <p className="text-[9px] uppercase font-bold text-muted-foreground leading-tight">
                      {cat.name}
                    </p>
                    <p className="text-sm font-bold tracking-tight">
                      ₹{cat.value.toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">
                  No data for current filters
                </p>
              )}
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
                      colSpan={6}
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
            <div className="p-4 border-t flex justify-between items-center bg-muted/10">
              <span className="text-xs text-muted-foreground">
                Showing {expenses.length} of {pagination.total} entries
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() =>
                    setPage((p) => Math.min(pagination.totalPages, p + 1))
                  }
                  disabled={page >= pagination.totalPages}
                >
                  Next
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
