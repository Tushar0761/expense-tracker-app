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
import {
  fetchFuturePayments,
  markFuturePaymentRepaid,
  updateFuturePayment,
  type FuturePaymentRow,
} from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  CalendarClock,
  CheckCircle2,
  Loader2,
  Pencil,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { PlanFuturePaymentDialog } from './forms';

interface FuturePaymentsTableProps {
  borrowers: { id: string; borrowerName: string }[];
}

const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
  completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelled: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-300',
};

const FuturePaymentsTable = ({ borrowers }: FuturePaymentsTableProps) => {
  const queryClient = useQueryClient();
  const [editRow, setEditRow] = useState<FuturePaymentRow | null>(null);
  const [repaidRow, setRepaidRow] = useState<FuturePaymentRow | null>(null);

  // Edit form state
  const [editAmount, setEditAmount] = useState('');
  const [editPrincipal, setEditPrincipal] = useState('');
  const [editInterest, setEditInterest] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Repaid form state
  const [repaidAmount, setRepaidAmount] = useState('');
  const [repaidMethod, setRepaidMethod] = useState('upi');
  const [repaidNotes, setRepaidNotes] = useState('');

  const { data: futurePayments, isLoading } = useQuery<FuturePaymentRow[]>({
    queryKey: ['loans-future-payments'],
    queryFn: fetchFuturePayments,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['loans-future-payments'] });
    queryClient.invalidateQueries({ queryKey: ['loans-graph'] });
    queryClient.invalidateQueries({ queryKey: ['loans-insight'] });
    queryClient.invalidateQueries({ queryKey: ['loans-table'] });
  };

  const editMutation = useMutation({
    mutationFn: () =>
      updateFuturePayment(editRow!.id, {
        totalAmount: editAmount ? Number(editAmount) : undefined,
        principalAmount: editPrincipal ? Number(editPrincipal) : undefined,
        interestAmount: editInterest ? Number(editInterest) : undefined,
        plannedDate: editDate || undefined,
        notes: editNotes || undefined,
      }),
    onSuccess: () => {
      toast.success('Payment updated');
      invalidate();
      setEditRow(null);
    },
    onError: () => toast.error('Failed to update'),
  });

  const repaidMutation = useMutation({
    mutationFn: () =>
      markFuturePaymentRepaid(repaidRow!.id, {
        totalAmount: repaidAmount ? Number(repaidAmount) : undefined,
        paymentMethod: repaidMethod,
        notes: repaidNotes || undefined,
      }),
    onSuccess: (data) => {
      if (data.nextPayment) {
        toast.success(
          `Marked as repaid. Next payment of ₹${data.nextPayment.totalAmount.toLocaleString()} scheduled for ${data.nextPayment.plannedDate}.`,
          { duration: 5000 },
        );
      } else {
        toast.success(`Marked as repaid. Loan fully settled!`);
      }
      invalidate();
      setRepaidRow(null);
    },
    onError: () => toast.error('Failed to mark as repaid'),
  });

  const openEdit = (row: FuturePaymentRow) => {
    setEditRow(row);
    setEditAmount(String(row.totalAmount));
    setEditPrincipal(String(row.principalAmount));
    setEditInterest(String(row.interestAmount));
    // plannedDate comes as "dd MMM yyyy" — parse back for the date input
    try {
      const d = new Date(row.plannedDate);
      setEditDate(isNaN(d.getTime()) ? '' : format(d, 'yyyy-MM-dd'));
    } catch {
      setEditDate('');
    }
    setEditNotes(row.notes ?? '');
  };

  const openRepaid = (row: FuturePaymentRow) => {
    setRepaidRow(row);
    setRepaidAmount(String(row.totalAmount));
    setRepaidMethod('upi');
    setRepaidNotes('');
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4 text-amber-500" />
            Upcoming Payments
          </CardTitle>
          <PlanFuturePaymentDialog borrowers={borrowers} />
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          )}
          {futurePayments && futurePayments.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No upcoming payments in the next 3 months.
            </p>
          )}
          {futurePayments && futurePayments.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left">Date</th>
                    <th className="text-left">Borrower</th>
                    <th className="text-right">Principal</th>
                    <th className="text-right">Interest</th>
                    <th className="text-right">Total</th>
                    <th className="text-center">Status</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {futurePayments.map((p) => (
                    <tr key={p.id} className="group">
                      <td className="font-medium whitespace-nowrap">{p.plannedDate}</td>
                      <td className="text-muted-foreground">{p.borrowerName}</td>
                      <td className="text-right tabular-nums">₹{p.principalAmount.toLocaleString()}</td>
                      <td className="text-right tabular-nums text-muted-foreground">₹{p.interestAmount.toLocaleString()}</td>
                      <td className="text-right tabular-nums font-bold text-foreground">₹{p.totalAmount.toLocaleString()}</td>
                      <td className="text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_STYLES[p.status] ?? ''}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="text-center">
                        {p.status === 'pending' && (
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => openEdit(p)}
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => openRepaid(p)}
                              title="Mark as repaid"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Upcoming Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Total Amount (₹)</Label>
                <Input value={editAmount} onChange={(e) => setEditAmount(e.target.value)} type="number" className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Planned Date</Label>
                <Input value={editDate} onChange={(e) => setEditDate(e.target.value)} type="date" className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Principal (₹)</Label>
                <Input value={editPrincipal} onChange={(e) => setEditPrincipal(e.target.value)} type="number" className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Interest (₹)</Label>
                <Input value={editInterest} onChange={(e) => setEditInterest(e.target.value)} type="number" className="h-9" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Optional notes…" className="h-9" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditRow(null)} className="flex-1 h-9">Cancel</Button>
            <Button
              onClick={() => editMutation.mutate()}
              disabled={editMutation.isPending}
              className="flex-1 h-9 bg-blue-600 hover:bg-blue-700"
            >
              {editMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Repaid Dialog */}
      <Dialog open={!!repaidRow} onOpenChange={(o) => !o && setRepaidRow(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Mark as Repaid
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {repaidRow && (
              <div className="rounded-lg bg-muted/40 border px-3 py-2 text-sm space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Borrower</span>
                  <span className="font-medium">{repaidRow.borrowerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Planned date</span>
                  <span>{repaidRow.plannedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Planned amount</span>
                  <span className="font-bold text-rose-500">₹{repaidRow.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Actual Amount (₹)</Label>
                <Input value={repaidAmount} onChange={(e) => setRepaidAmount(e.target.value)} type="number" className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Payment Method</Label>
                <select
                  value={repaidMethod}
                  onChange={(e) => setRepaidMethod(e.target.value)}
                  className="w-full border rounded-md h-9 px-2 text-sm bg-background"
                >
                  {['upi', 'cash', 'bank_transfer', 'cheque', 'other'].map((m) => (
                    <option key={m} value={m}>{m.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Input value={repaidNotes} onChange={(e) => setRepaidNotes(e.target.value)} placeholder="Optional notes…" className="h-9" />
            </div>
            <p className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-900/20 rounded-md px-3 py-2 border border-blue-100 dark:border-blue-800">
              If the loan has remaining balance, a new upcoming payment will be automatically scheduled one month later.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRepaidRow(null)} className="flex-1 h-9">Cancel</Button>
            <Button
              onClick={() => repaidMutation.mutate()}
              disabled={repaidMutation.isPending}
              className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700"
            >
              {repaidMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
              Confirm Repaid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FuturePaymentsTable;
