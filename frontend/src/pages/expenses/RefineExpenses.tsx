import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  bulkUpdateExpenses,
  fetchCategoriesFlat,
  fetchExpenses,
  type CategoryFlat,
  type ExpenseRow,
} from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ArrowDownUp,
  ChevronDown,
  ChevronRight,
  IndianRupee,
  Layers,
  StickyNote,
  Tag,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

type Mode = 'username' | 'category';
type SortBy = 'count' | 'amount';

interface Group {
  key: string;
  label: string;
  expenses: ExpenseRow[];
  totalAmount: number;
}

export function RefineExpenses() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>('username');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showCatDialog, setShowCatDialog] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const [bulkNotes, setBulkNotes] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('count');

  const { data: expenseData, isLoading } = useQuery({
    queryKey: ['all-expenses-refine'],
    queryFn: () => fetchExpenses({ limit: 5000, sortBy: 'date', sortOrder: 'desc' }),
  });

  const { data: categories = [] } = useQuery<CategoryFlat[]>({
    queryKey: ['categories-flat'],
    queryFn: fetchCategoriesFlat,
  });

  const bulkMutation = useMutation({
    mutationFn: (data: { categoryId?: number; remarks?: string }) =>
      bulkUpdateExpenses(Array.from(selected), data),
    onSuccess: (_, vars) => {
      const parts = [];
      if (vars.categoryId) parts.push('category');
      if (vars.remarks !== undefined) parts.push('notes');
      toast.success(`Updated ${selected.size} expense${selected.size !== 1 ? 's' : ''} (${parts.join(' & ')})`);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ['all-expenses-refine'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: () => toast.error('Bulk update failed'),
  });

  const allExpenses = expenseData?.data ?? [];

  const groups: Group[] = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    const map = new Map<string, ExpenseRow[]>();

    for (const exp of allExpenses) {
      const key =
        mode === 'username'
          ? (exp.userName ?? '__NO_NAME__')
          : String(exp.categoryId);

      if (lowerSearch) {
        const label =
          mode === 'username'
            ? (exp.userName ?? '').toLowerCase()
            : exp.categoryName.toLowerCase();
        if (!label.includes(lowerSearch)) continue;
      }

      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(exp);
    }

    return Array.from(map.entries())
      .map(([key, exps]) => {
        const totalAmount = exps.reduce((s, e) => s + e.amount, 0);
        return {
          key,
          label:
            mode === 'username'
              ? key === '__NO_NAME__'
                ? 'No Recipient'
                : key
              : exps[0].categoryName,
          expenses: [...exps].sort(
            (a, b) =>
              a.categoryName.localeCompare(b.categoryName) ||
              b.amount - a.amount,
          ),
          totalAmount,
        };
      })
      .sort((a, b) =>
        sortBy === 'amount'
          ? b.totalAmount - a.totalAmount
          : b.expenses.length - a.expenses.length,
      );
  }, [allExpenses, mode, search, sortBy]);

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleRow = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectGroup = (group: Group, select: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const e of group.expenses) {
        if (select) next.add(e.id);
        else next.delete(e.id);
      }
      return next;
    });
    if (select) {
      setExpanded((prev) => new Set([...prev, group.key]));
    }
  };

  const clearSelection = () => setSelected(new Set());

  // Breakdown of categories and remarks among currently selected expenses
  const selectedExpenses = useMemo(
    () => allExpenses.filter((e) => selected.has(e.id)),
    [allExpenses, selected],
  );

  const categoryBreakdown = useMemo(() => {
    const map = new Map<number, { name: string; count: number }>();
    for (const e of selectedExpenses) {
      const cur = map.get(e.categoryId) ?? { name: e.categoryName, count: 0 };
      cur.count++;
      map.set(e.categoryId, cur);
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, name: v.name, count: v.count }))
      .sort((a, b) => b.count - a.count);
  }, [selectedExpenses]);

  const remarksBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of selectedExpenses) {
      if (e.remarks?.trim()) {
        map.set(e.remarks, (map.get(e.remarks) ?? 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([remark, count]) => ({ remark, count }))
      .sort((a, b) => b.count - a.count);
  }, [selectedExpenses]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setSelected(new Set());
    setExpanded(new Set());
    setSearch('');
  };

  const handleBulkCategory = () => {
    if (!bulkCategoryId) return;
    bulkMutation.mutate({ categoryId: Number(bulkCategoryId) });
    setShowCatDialog(false);
    setBulkCategoryId('');
  };

  const handleBulkNotes = () => {
    bulkMutation.mutate({ remarks: bulkNotes });
    setShowNotesDialog(false);
    setBulkNotes('');
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Refine & Bulk Edit</h1>
          <p className="text-[13px] text-muted-foreground">
            Bulk-assign categories or notes to similar transactions.
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center bg-muted rounded-lg p-1 gap-1 self-start">
          <button
            onClick={() => switchMode('username')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === 'username'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <User className="h-3 w-3" />
            By Username
          </button>
          <button
            onClick={() => switchMode('category')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === 'category'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Tag className="h-3 w-3" />
            By Category
          </button>
        </div>
      </div>

      {/* Search + sort */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={mode === 'username' ? 'Filter by username…' : 'Filter by category…'}
            className="w-full border rounded-md h-9 px-3 text-sm bg-background pr-8"
          />
          {search && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearch('')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {/* Sort toggle */}
        <div className="flex items-center gap-1 border rounded-md overflow-hidden text-xs font-medium shrink-0">
          <button
            onClick={() => setSortBy('count')}
            className={`flex items-center gap-1 px-2.5 h-9 transition-colors ${
              sortBy === 'count'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-muted'
            }`}
          >
            <ArrowDownUp className="h-3 w-3" />
            Count
          </button>
          <button
            onClick={() => setSortBy('amount')}
            className={`flex items-center gap-1 px-2.5 h-9 transition-colors ${
              sortBy === 'amount'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-muted'
            }`}
          >
            <IndianRupee className="h-3 w-3" />
            Amount
          </button>
        </div>
      </div>

      {/* Floating action bar */}
      {selected.size > 0 && (
        <div className="sticky top-16 z-30 flex items-center gap-2 flex-wrap bg-primary text-primary-foreground rounded-lg px-4 py-2.5 shadow-lg">
          <Layers className="h-4 w-4 shrink-0" />
          <span className="text-sm font-semibold flex-1">
            {selected.size} expense{selected.size !== 1 ? 's' : ''} selected
          </span>
          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-xs gap-1.5"
            onClick={() => setShowCatDialog(true)}
          >
            <Tag className="h-3 w-3" />
            Assign Category
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-xs gap-1.5"
            onClick={() => setShowNotesDialog(true)}
          >
            <StickyNote className="h-3 w-3" />
            Set Notes
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs opacity-70 hover:opacity-100"
            onClick={clearSelection}
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        </div>
      )}

      {/* Groups */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground animate-pulse py-12 text-center">
          Loading transactions…
        </p>
      ) : groups.length === 0 ? (
        <Card className="border border-border/50">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No groups found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => {
            const isExpanded = expanded.has(group.key);
            const groupSelected = group.expenses.filter((e) => selected.has(e.id)).length;
            const allGroupSelected = groupSelected === group.expenses.length;

            return (
              <Card key={group.key} className="border border-border/50 shadow-sm overflow-hidden">
                <CardHeader
                  className="py-2 px-4 bg-muted/20 border-b cursor-pointer select-none"
                  onClick={() => toggleExpand(group.key)}
                >
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="flex-1 truncate">{group.label}</span>
                    {groupSelected > 0 && (
                      <Badge variant="default" className="text-[10px] h-4 px-1.5">
                        {groupSelected} selected
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0">
                      {group.expenses.length} txn
                    </Badge>
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0 text-rose-500 border-rose-200">
                      ₹{group.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectGroup(group, !allGroupSelected);
                      }}
                    >
                      {allGroupSelected ? 'Deselect all' : 'Select all'}
                    </Button>
                  </CardTitle>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="p-0">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-muted/10 border-b">
                          <th className="py-1.5 px-3 w-8" />
                          <th className="py-1.5 px-3 text-xs font-semibold">Date</th>
                          <th className="py-1.5 px-3 text-xs font-semibold">Account</th>
                          {mode === 'username' ? (
                            <th className="py-1.5 px-3 text-xs font-semibold">Category</th>
                          ) : (
                            <th className="py-1.5 px-3 text-xs font-semibold">Sent To</th>
                          )}
                          <th className="py-1.5 px-3 text-xs font-semibold">Remarks</th>
                          <th className="py-1.5 px-3 text-xs font-semibold text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {group.expenses.map((tx) => (
                          <tr
                            key={tx.id}
                            onClick={() => toggleRow(tx.id)}
                            className={`cursor-pointer transition-colors border-b border-border/10 ${
                              selected.has(tx.id)
                                ? 'bg-primary/5'
                                : 'hover:bg-muted/20'
                            }`}
                          >
                            <td className="py-1.5 px-3">
                              <input
                                type="checkbox"
                                readOnly
                                checked={selected.has(tx.id)}
                                className="h-3.5 w-3.5 accent-primary"
                              />
                            </td>
                            <td className="py-1.5 px-3 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                              {format(new Date(tx.date), 'dd MMM yy')}
                            </td>
                            <td className="py-1.5 px-3">
                              <div className="flex items-center gap-1.5">
                                <Wallet className="h-3 w-3 text-primary/60" />
                                <span className="text-[11px] font-medium">
                                  {tx.accountName || 'Unlinked'}
                                </span>
                              </div>
                            </td>
                            {mode === 'username' ? (
                              <td className="py-1.5 px-3">
                                <Badge
                                  variant="secondary"
                                  className="text-[9px] py-0 px-1 h-3.5 font-normal"
                                >
                                  {tx.categoryName || '—'}
                                </Badge>
                              </td>
                            ) : (
                              <td className="py-1.5 px-3 text-xs text-muted-foreground max-w-[120px] truncate">
                                {tx.userName || '—'}
                              </td>
                            )}
                            <td className="py-1.5 px-3 text-xs text-muted-foreground max-w-[180px] truncate">
                              {tx.remarks || '—'}
                            </td>
                            <td className="py-1.5 px-3 text-right font-bold text-rose-500 tabular-nums text-sm whitespace-nowrap">
                              ₹{tx.amount.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Bulk Category Dialog */}
      <Dialog open={showCatDialog} onOpenChange={(open) => { setShowCatDialog(open); if (!open) setBulkCategoryId(''); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {/* Current category breakdown — clickable chips */}
            {categoryBreakdown.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">
                  Current across {selected.size} selected
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {categoryBreakdown.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setBulkCategoryId(String(c.id))}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors ${
                        bulkCategoryId === String(c.id)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/40 border-border hover:bg-muted text-foreground'
                      }`}
                    >
                      <span>{c.name}</span>
                      <span className={`text-[10px] font-bold px-1 rounded ${
                        bulkCategoryId === String(c.id)
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {c.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Or search for a different category
              </Label>
              <SearchableSelect
                value={bulkCategoryId ? Number(bulkCategoryId) : null}
                onChange={(v) => setBulkCategoryId(v ? String(v) : '')}
                options={categories}
                placeholder="Search category…"
                showFullPath
              />
            </div>
            {bulkCategoryId && (
              <p className="text-xs text-muted-foreground">
                Will assign <span className="font-semibold text-foreground">
                  {categories.find(c => c.id === Number(bulkCategoryId))?.name ?? '—'}
                </span> to all {selected.size} expense{selected.size !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCatDialog(false)} className="flex-1 h-9">
              Cancel
            </Button>
            <Button
              onClick={handleBulkCategory}
              disabled={!bulkCategoryId || bulkMutation.isPending}
              className="flex-1 h-9 bg-green-600 hover:bg-green-700"
            >
              {bulkMutation.isPending ? 'Saving…' : `Apply to ${selected.size}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Notes Dialog */}
      <Dialog open={showNotesDialog} onOpenChange={(open) => { setShowNotesDialog(open); if (!open) setBulkNotes(''); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Notes</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {/* Existing remarks breakdown — clickable chips */}
            {remarksBreakdown.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">
                  Current notes across {selected.size} selected
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {remarksBreakdown.map((r) => (
                    <button
                      key={r.remark}
                      type="button"
                      onClick={() => setBulkNotes(r.remark)}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors max-w-[200px] ${
                        bulkNotes === r.remark
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/40 border-border hover:bg-muted text-foreground'
                      }`}
                    >
                      <span className="truncate">{r.remark}</span>
                      <span className={`text-[10px] font-bold px-1 rounded shrink-0 ${
                        bulkNotes === r.remark
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {r.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                {remarksBreakdown.length > 0 ? 'Or type a new note' : `Notes for ${selected.size} expense${selected.size !== 1 ? 's' : ''}`}
              </Label>
              <Input
                value={bulkNotes}
                onChange={(e) => setBulkNotes(e.target.value)}
                placeholder="Enter notes…"
                className="h-10 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleBulkNotes()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowNotesDialog(false)} className="flex-1 h-9">
              Cancel
            </Button>
            <Button
              onClick={handleBulkNotes}
              disabled={bulkMutation.isPending}
              className="flex-1 h-9 bg-green-600 hover:bg-green-700"
            >
              {bulkMutation.isPending ? 'Saving…' : `Apply to ${selected.size}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
