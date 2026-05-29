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
import { AlertTriangle, CheckCircle2, Trash2, Wallet } from 'lucide-react';
import { useState } from 'react';
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

export function DuplicateExpenses() {
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissed);
  const [showDismissed, setShowDismissed] = useState(false);
  const [criteria, setCriteria] = useState<DuplicateCriteria>({
    byDate: true,
    byAmount: true,
    byName: true,
  });

  const toggleCriteria = (key: keyof DuplicateCriteria) => {
    setCriteria((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const { data: groups = [], isLoading } = useQuery<ExpenseRow[][]>({
    queryKey: ['duplicate-expenses', criteria],
    queryFn: () => fetchDuplicateExpenses(criteria),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteExpense(id),
    onSuccess: () => {
      toast.success('Expense deleted');
      queryClient.invalidateQueries({ queryKey: ['duplicate-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: () => toast.error('Failed to delete expense'),
  });

  const handleDelete = (id: number) => {
    if (window.confirm('Delete this expense?')) deleteMutation.mutate(id);
  };

  const dismiss = (group: ExpenseRow[]) => {
    const next = new Set(dismissed);
    next.add(groupKey(group));
    setDismissed(next);
    saveDismissed(next);
    toast.success('Marked as not a duplicate');
  };

  const undoDismiss = (key: string) => {
    const next = new Set(dismissed);
    next.delete(key);
    setDismissed(next);
    saveDismissed(next);
  };

  const activeGroups = groups.filter((g) => !dismissed.has(groupKey(g)));
  const dismissedGroups = groups.filter((g) => dismissed.has(groupKey(g)));

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Duplicate Transactions</h1>
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
            {showDismissed ? 'Hide' : `Show`} skipped ({dismissedGroups.length})
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
                    criteria[key]
                      ? 'bg-primary border-primary'
                      : 'border-border bg-background'
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
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-medium">{label}</span>
              </label>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Uncheck <strong>Name</strong> to find same-day same-amount entries regardless of recipient — useful when the same transaction appears in both a bank statement and Google Pay import with different names.
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
          </div>

          <div className="space-y-4">
            {activeGroups.map((group, idx) => (
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
                      className="h-6 text-[10px] border-amber-300 text-amber-700 hover:bg-amber-100 dark:text-amber-400"
                      onClick={() => dismiss(group)}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Skip — Not a duplicate
                    </Button>
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-muted/20 border-b">
                        <th className="py-1.5 px-3 text-xs font-semibold">Date</th>
                        <th className="py-1.5 px-3 text-xs font-semibold">Account</th>
                        <th className="py-1.5 px-3 text-xs font-semibold">Category</th>
                        <th className="py-1.5 px-3 text-xs font-semibold">Sent To</th>
                        <th className="py-1.5 px-3 text-xs font-semibold">Remarks</th>
                        <th className="py-1.5 px-3 text-xs font-semibold text-right">Amount</th>
                        <th className="py-1.5 px-3 text-xs font-semibold text-center">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {group.map((tx) => (
                        <tr
                          key={tx.id}
                          className="hover:bg-amber-50/30 dark:hover:bg-amber-900/10 transition-colors group border-b border-border/10"
                        >
                          <td className="py-1.5 px-3 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                            {format(new Date(tx.date), 'dd MMM yy, E')}
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
                              {tx.categoryName || '—'}
                            </Badge>
                          </td>
                          <td className="py-1.5 px-3 text-xs text-muted-foreground max-w-[100px] truncate">
                            {tx.userName || '—'}
                          </td>
                          <td className="py-1.5 px-3 text-xs text-muted-foreground max-w-[160px] truncate">
                            {tx.remarks || '—'}
                          </td>
                          <td className="py-1.5 px-3 text-right font-bold text-rose-500 whitespace-nowrap tabular-nums text-sm">
                            ₹{tx.amount.toLocaleString()}
                          </td>
                          <td className="py-1.5 px-3 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-rose-500 hover:text-rose-700 hover:bg-rose-50/50"
                              disabled={deleteMutation.isPending}
                              onClick={() => handleDelete(tx.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
