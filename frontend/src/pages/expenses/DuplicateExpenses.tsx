import { AddExpenseForm } from '@/components/AddExpenseForm';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  deleteExpense,
  fetchDuplicateExpenses,
  type DuplicateCriteria,
  type ExpenseRow,
} from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle2, Pencil, Trash2, Wallet, X } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

const LS_KEY = 'dismissed-duplicate-keys';

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveDismissed(keys: Set<string>) {
  localStorage.setItem(LS_KEY, JSON.stringify(Array.from(keys)));
}

function groupKey(group: ExpenseRow[]): string {
  const f = group[0];
  return `${f.date}|${f.amount}|${f.userName ?? '__NULL__'}`;
}

function groupLabel(group: ExpenseRow[]): string {
  const first = group[0];
  const date = format(new Date(first.date), 'dd MMM yyyy');
  const user = first.userName ? ` · Sent to: ${first.userName}` : '';
  return `₹${first.amount.toLocaleString()} on ${date}${user}`;
}

type ConfirmState =
  | { type: 'single'; id: number }
  | { type: 'group'; ids: number[]; label: string }
  | { type: 'selection'; ids: number[] }
  | null;

/* Indeterminate checkbox rendered manually since shadcn doesn't ship one */
function Checkbox({
  checked,
  indeterminate,
  onChange,
  className = '',
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (v: boolean) => void;
  className?: string;
}) {
  const active = checked || indeterminate;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      onClick={() => onChange(!checked)}
      className={`h-4 w-4 rounded border flex items-center justify-center transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        active ? 'bg-primary border-primary' : 'border-border bg-background'
      } ${className}`}
    >
      {indeterminate && !checked ? (
        <span className="block h-[2px] w-2 bg-primary-foreground rounded-full" />
      ) : checked ? (
        <svg
          className="h-2.5 w-2.5 text-primary-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : null}
    </button>
  );
}

export function DuplicateExpenses() {
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissed);
  const [showDismissed, setShowDismissed] = useState(false);
  const [criteria, setCriteria] = useState<DuplicateCriteria>({
    byDate: true,
    byAmount: true,
    byName: true,
  });
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [editExpense, setEditExpense] = useState<ExpenseRow | null>(null);
  // selected is a Set of expense IDs
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggleCriteria = (key: keyof DuplicateCriteria) => {
    setCriteria((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const { data: groups = [], isLoading } = useQuery<ExpenseRow[][]>({
    queryKey: ['duplicate-expenses', criteria],
    queryFn: () => fetchDuplicateExpenses(criteria),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['duplicate-expenses'] });
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
  };

  const deleteMutation = useMutation({
    mutationFn: (ids: number[]) => Promise.all(ids.map((id) => deleteExpense(id))),
    onSuccess: (_data, ids) => {
      const n = ids.length;
      toast.success(n === 1 ? 'Expense deleted' : `${n} expenses deleted`);
      setSelected(new Set());
      invalidate();
    },
    onError: () => toast.error('Failed to delete some expenses'),
  });

  const handleConfirm = () => {
    if (!confirmState) return;
    if (confirmState.type === 'single') {
      deleteMutation.mutate([confirmState.id]);
    } else {
      deleteMutation.mutate(confirmState.ids);
    }
  };

  const dismiss = (group: ExpenseRow[]) => {
    const next = new Set(dismissed);
    next.add(groupKey(group));
    setDismissed(next);
    saveDismissed(next);
    // deselect any IDs from this group
    const next2 = new Set(selected);
    group.forEach((tx) => next2.delete(tx.id));
    setSelected(next2);
    toast.success('Marked as not a duplicate');
  };

  const undoDismiss = (key: string) => {
    const next = new Set(dismissed);
    next.delete(key);
    setDismissed(next);
    saveDismissed(next);
  };

  const toggleRow = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleGroup = (group: ExpenseRow[], allChecked: boolean) => {
    const next = new Set(selected);
    if (allChecked) {
      group.forEach((tx) => next.delete(tx.id));
    } else {
      group.forEach((tx) => next.add(tx.id));
    }
    setSelected(next);
  };

  const clearSelection = () => setSelected(new Set());

  const activeGroups = groups
    .filter((g) => !dismissed.has(groupKey(g)))
    .sort((a, b) => b[0].amount - a[0].amount);
  const dismissedGroups = groups.filter((g) => dismissed.has(groupKey(g)));

  const isBusy = deleteMutation.isPending;
  const selectedCount = selected.size;

  // confirmation dialog display text
  const confirmTitle =
    confirmState?.type === 'single'
      ? 'Delete this expense?'
      : confirmState?.type === 'group'
        ? `Delete all ${confirmState.ids.length} in this group?`
        : `Delete ${(confirmState as { type: 'selection'; ids: number[] } | null)?.ids.length ?? 0} selected expenses?`;

  const confirmDescription =
    confirmState?.type === 'single'
      ? 'This expense will be permanently deleted. This cannot be undone.'
      : confirmState?.type === 'group'
        ? `All ${confirmState.ids.length} entries for "${confirmState.label}" will be permanently deleted. This cannot be undone.`
        : `${(confirmState as { type: 'selection'; ids: number[] } | null)?.ids.length ?? 0} selected expenses will be permanently deleted. This cannot be undone.`;

  const confirmLabel =
    confirmState?.type === 'single'
      ? 'Delete'
      : confirmState?.type === 'group'
        ? `Delete all ${confirmState.ids.length}`
        : `Delete ${(confirmState as { type: 'selection'; ids: number[] } | null)?.ids.length ?? 0} selected`;

  return (
    <div className="space-y-4 animate-in fade-in duration-500 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight section-title">Duplicate Transactions</h1>
          <p className="text-[13px] text-muted-foreground">
            Suspected duplicates — same date, amount &amp; recipient. Delete extras or skip if intentional.
          </p>
        </div>
        {dismissedGroups.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs shrink-0"
            onClick={() => setShowDismissed((v) => !v)}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-green-500" />
            {showDismissed ? 'Hide' : 'Show'} skipped ({dismissedGroups.length})
          </Button>
        )}
      </div>

      {/* Criteria selector */}
      <Card className="border border-border/50 bg-muted/20">
        <CardContent className="px-4 py-3 space-y-2">
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">
            Match duplicates by
          </p>
          <div className="flex flex-wrap gap-4">
            {(
              [
                { key: 'byDate', label: 'Date' },
                { key: 'byAmount', label: 'Amount' },
                { key: 'byName', label: 'Name (Recipient)' },
              ] as { key: keyof DuplicateCriteria; label: string }[]
            ).map(({ key, label }) => (
              <label
                key={key}
                className="flex items-center gap-2 cursor-pointer select-none"
                onClick={() => toggleCriteria(key)}
              >
                <div
                  className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                    criteria[key] ? 'bg-primary border-primary' : 'border-border bg-background'
                  }`}
                >
                  {criteria[key] && (
                    <svg
                      className="h-2.5 w-2.5 text-primary-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-medium">{label}</span>
              </label>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Uncheck <strong>Name</strong> to find same-day same-amount entries regardless of
            recipient — useful when the same transaction appears in both a bank statement and Google
            Pay import with different names.
          </p>
        </CardContent>
      </Card>

      {/* Dismissed list */}
      {showDismissed && dismissedGroups.length > 0 && (
        <Card className="border border-green-200 dark:border-green-800/40">
          <CardHeader className="py-2 px-4 bg-green-50/60 dark:bg-green-900/10 border-b border-green-100 dark:border-green-800/30">
            <CardTitle className="text-xs font-semibold text-green-700 dark:text-green-400">
              Skipped groups (confirmed not duplicates)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {dismissedGroups.map((group, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-2 text-xs border-b last:border-0"
              >
                <span className="text-muted-foreground">{groupLabel(group)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px]"
                  onClick={() => undoDismiss(groupKey(group))}
                >
                  Undo skip
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Main content */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground animate-pulse py-12 text-center">
          Scanning for duplicates…
        </p>
      ) : activeGroups.length === 0 ? (
        <Card className="border border-border/50 shadow-sm">
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="font-semibold text-sm">No duplicates to review</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              All transactions look unique or have been skipped.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium">
              {activeGroups.length} duplicate group{activeGroups.length !== 1 ? 's' : ''} found
            </span>
            <span className="text-xs text-muted-foreground ml-1">
              — check rows to select, then delete in bulk
            </span>
          </div>

          <div className="space-y-4">
            {activeGroups.map((group, idx) => {
              const groupIds = group.map((tx) => tx.id);
              const checkedInGroup = groupIds.filter((id) => selected.has(id));
              const allGroupChecked = checkedInGroup.length === groupIds.length;
              const someGroupChecked =
                checkedInGroup.length > 0 && checkedInGroup.length < groupIds.length;

              return (
                <Card
                  key={idx}
                  className="border border-amber-200 dark:border-amber-800/40 shadow-sm"
                >
                  <CardHeader className="py-2 px-4 bg-amber-50/60 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-800/30">
                    <CardTitle className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2 flex-wrap">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1">{groupLabel(group)}</span>
                      <Badge
                        variant="outline"
                        className="text-[10px] border-amber-300 text-amber-600 dark:text-amber-400"
                      >
                        {group.length} entries
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] border-rose-300 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
                        disabled={isBusy}
                        onClick={() =>
                          setConfirmState({
                            type: 'group',
                            ids: groupIds,
                            label: groupLabel(group),
                          })
                        }
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete all
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] border-amber-300 text-amber-700 hover:bg-amber-100 dark:text-amber-400"
                        onClick={() => dismiss(group)}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Skip — Not a duplicate
                      </Button>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[460px]">
                        <thead>
                          <tr className="bg-muted/20 border-b">
                            <th className="py-1.5 pl-3 pr-1 text-xs font-semibold w-8">
                              <Checkbox
                                checked={allGroupChecked}
                                indeterminate={someGroupChecked}
                                onChange={() => toggleGroup(group, allGroupChecked)}
                              />
                            </th>
                            <th className="py-1.5 px-3 text-xs font-semibold">Date</th>
                            <th className="py-1.5 px-3 text-xs font-semibold hidden sm:table-cell">Account</th>
                            <th className="py-1.5 px-3 text-xs font-semibold">Category</th>
                            <th className="py-1.5 px-3 text-xs font-semibold hidden md:table-cell">Sent To</th>
                            <th className="py-1.5 px-3 text-xs font-semibold hidden md:table-cell">Remarks</th>
                            <th className="py-1.5 px-3 text-xs font-semibold text-right">Amount</th>
                            <th className="py-1.5 px-3 text-xs font-semibold text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {[...group].sort((a, b) => b.amount - a.amount).map((tx) => {
                            const isChecked = selected.has(tx.id);
                            return (
                              <tr
                                key={tx.id}
                                onClick={() => toggleRow(tx.id)}
                                className={`transition-colors cursor-pointer border-b border-border/10 ${
                                  isChecked
                                    ? 'bg-rose-50/60 dark:bg-rose-900/10'
                                    : 'hover:bg-amber-50/30 dark:hover:bg-amber-900/10'
                                }`}
                              >
                                <td
                                  className="py-1.5 pl-3 pr-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    onChange={() => toggleRow(tx.id)}
                                  />
                                </td>
                                <td className="py-1.5 px-3 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                                  {format(new Date(tx.date), 'dd MMM yy')}
                                </td>
                                <td className="py-1.5 px-3 hidden sm:table-cell">
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
                                    {tx.categoryName || '—'}
                                  </Badge>
                                </td>
                                <td className="py-1.5 px-3 text-xs text-foreground max-w-[100px] truncate hidden md:table-cell">
                                  {tx.userName || '—'}
                                </td>
                                <td className="py-1.5 px-3 text-xs text-foreground max-w-[160px] truncate hidden md:table-cell">
                                  {tx.remarks || '—'}
                                </td>
                                <td className="py-1.5 px-3 text-right font-bold text-rose-500 whitespace-nowrap tabular-nums text-sm">
                                  ₹{tx.amount.toLocaleString()}
                                </td>
                                <td
                                  className="py-1.5 px-3 text-center"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex items-center justify-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-blue-500 hover:text-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/20"
                                      onClick={() => setEditExpense(tx)}
                                      title="Edit expense"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-rose-500 hover:text-rose-700 hover:bg-rose-50/50"
                                      disabled={isBusy}
                                      onClick={() =>
                                        setConfirmState({ type: 'single', id: tx.id })
                                      }
                                      title="Delete expense"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Floating bulk-action bar — rendered via portal so ancestor transforms don't trap fixed positioning */}
      {selectedCount > 0 && createPortal(
        <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-200 pointer-events-none w-full flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-3 bg-background border border-border shadow-xl rounded-full px-4 py-2.5 text-sm font-medium">
            <span className="text-muted-foreground">
              <span className="text-foreground font-semibold">{selectedCount}</span>{' '}
              {selectedCount === 1 ? 'expense' : 'expenses'} selected
            </span>
            <div className="h-4 w-px bg-border" />
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-xs rounded-full px-3"
              disabled={isBusy}
              onClick={() =>
                setConfirmState({ type: 'selection', ids: Array.from(selected) })
              }
            >
              <Trash2 className="h-3 w-3 mr-1.5" />
              Delete selected
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
              onClick={clearSelection}
              title="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>,
        document.body,
      )}

      {/* Confirm dialog */}
      <ConfirmDialog
        open={confirmState !== null}
        onOpenChange={(open) => !open && setConfirmState(null)}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={confirmLabel}
        onConfirm={handleConfirm}
      />

      {/* Edit dialog */}
      <AddExpenseForm
        isOpen={editExpense !== null}
        onClose={() => setEditExpense(null)}
        onSuccess={() => {
          setEditExpense(null);
          invalidate();
        }}
        expense={editExpense}
      />
    </div>
  );
}
