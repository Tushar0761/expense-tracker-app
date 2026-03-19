import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  bulkCreateFuturePayments,
  fetchLoanPlanningSummary,
  fetchLoansByBorrower,
  type LoanPlanningSummary,
  type LoanTableRow,
} from '@/lib/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from '@radix-ui/react-label';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Calendar,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
  Wallet,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  futurePaymentPlanningSchema,
  type FuturePaymentPlanningValues,
} from './schema';

interface PlanFuturePaymentDialogProps {
  borrowers: { id: string; borrowerName: string }[];
  onSuccess?: () => void;
}

export const PlanFuturePaymentDialog = ({
  borrowers,
  onSuccess,
}: PlanFuturePaymentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string>('');
  const queryClient = useQueryClient();

  const form = useForm<FuturePaymentPlanningValues>({
    resolver: zodResolver(futurePaymentPlanningSchema),
    defaultValues: {
      loanId: '',
      items: [{ plannedDate: new Date(), totalAmount: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const selectedLoanId = form.watch('loanId');

  // Fetch loans for selected borrower
  const { data: loans, isLoading: loansLoading } = useQuery<LoanTableRow[]>({
    queryKey: ['loans-by-borrower', selectedBorrowerId],
    queryFn: () => fetchLoansByBorrower(Number(selectedBorrowerId)),
    enabled: !!selectedBorrowerId && open,
  });

  // Fetch planning summary for selected loan
  const { data: summary } = useQuery<LoanPlanningSummary>({
    queryKey: ['loan-planning-summary', selectedLoanId],
    queryFn: () => fetchLoanPlanningSummary(Number(selectedLoanId)),
    enabled: !!selectedLoanId && open,
  });

  // Reset items when loan changes
  useEffect(() => {
    if (selectedBorrowerId) {
      form.setValue('loanId', '');
    }
  }, [selectedBorrowerId, form]);

  const handleSubmit = async (values: FuturePaymentPlanningValues) => {
    try {
      setIsSubmitting(true);

      const payload = {
        loanId: Number(values.loanId),
        items: values.items.map((item) => ({
          ...item,
          plannedDate: format(item.plannedDate, 'yyyy-MM-dd'),
          principalAmount: 0,
          interestAmount: 0,
        })),
      };

      await bulkCreateFuturePayments(payload);

      toast.success('Future payments planned successfully!');

      queryClient.invalidateQueries({
        queryKey: ['loans-future-payments'],
      });
      queryClient.invalidateQueries({
        queryKey: ['future-payments-by-loan', selectedLoanId],
      });
      queryClient.invalidateQueries({
        queryKey: ['loan-planning-summary', selectedLoanId],
      });

      if (onSuccess) onSuccess();
      setOpen(false);
      form.reset();
      setSelectedBorrowerId('');
    } catch (error) {
      console.error('Failed to plan payments:', error);
      toast.error('Process failed', {
        description:
          error instanceof Error ? error.message : 'Unexpected error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPlannedInForm =
    form
      .watch('items')
      ?.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0) || 0;
  const remainingToPlan = (summary?.unplannedAmount || 0) - totalPlannedInForm;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 hover:bg-slate-50 border-blue-200 text-blue-700 bg-blue-50/30"
        >
          <Calendar size={14} /> Plan Future Payments
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl bg-white">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-400" />
              Plan Future Installments
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left: Metadata & Selection */}
          <div className="w-full md:w-1/3 border-r bg-slate-50/50 p-6 overflow-y-auto space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px]">
                  1
                </span>
                Loan Selection
              </h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                    Borrower
                  </Label>
                  <Select
                    value={selectedBorrowerId}
                    onValueChange={setSelectedBorrowerId}
                  >
                    <SelectTrigger className="h-9 text-sm bg-white border-slate-200">
                      <SelectValue placeholder="Select borrower" />
                    </SelectTrigger>
                    <SelectContent>
                      {borrowers.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.borrowerName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                    Loan Account
                  </Label>
                  <Controller
                    name="loanId"
                    control={form.control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={!selectedBorrowerId || loansLoading}
                      >
                        <SelectTrigger className="h-9 text-sm bg-white border-slate-200 shadow-sm disabled:opacity-50">
                          {loansLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-2" />
                          ) : (
                            <SelectValue placeholder="Select account" />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {loans?.map((loan) => (
                            <SelectItem key={loan.id} value={String(loan.id)}>
                              ₹{loan.totalAmount.toLocaleString()} •{' '}
                              {format(new Date(loan.loanDate), 'dd MMM yy')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            </div>

            {summary && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px]">
                    2
                  </span>
                  Planning Status
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center">
                    <p className="text-[10px] uppercase font-bold text-slate-400">
                      Total Loan
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      ₹{summary.totalAmount.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center">
                    <p className="text-[10px] uppercase font-bold text-green-500">
                      Already Paid
                    </p>
                    <p className="text-sm font-bold text-green-600">
                      ₹{summary.paidAmount.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center">
                    <p className="text-[10px] uppercase font-bold text-blue-500">
                      Planned EMIs
                    </p>
                    <p className="text-sm font-bold text-blue-600">
                      ₹{summary.plannedAmount.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 shadow-sm flex flex-col gap-1 items-center justify-center border-l-4 border-l-orange-400">
                    <p className="text-[11px] uppercase font-black text-orange-600">
                      Unplanned Balance
                    </p>
                    <p className="text-2xl font-black text-orange-700 tracking-tight">
                      ₹{summary.unplannedAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Distribution Form */}
          <div className="flex-1 p-6 overflow-y-auto">
            {!selectedLoanId ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                <Wallet className="h-16 w-16 mb-4 stroke-1 text-slate-400" />
                <h4 className="text-lg font-bold text-slate-600">
                  Select a loan
                </h4>
                <p className="text-sm text-slate-500">
                  Choose an account on the left to start planning installments.
                </p>
              </div>
            ) : (
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-6 h-full flex flex-col"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px]">
                      3
                    </span>
                    Distribute Installments
                  </h3>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1 text-[10px] font-bold uppercase border-slate-300"
                    onClick={() =>
                      append({
                        plannedDate: new Date(),
                        totalAmount: 0,
                      })
                    }
                  >
                    <Plus size={12} /> Add Row
                  </Button>
                </div>

                <div className="flex-1 space-y-3">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-12 gap-3 items-end bg-slate-50/50 p-3 rounded-xl border border-slate-100 animate-in slide-in-from-right-2 duration-300"
                    >
                      <div className="col-span-6 space-y-1">
                        <Label className="text-[9px] font-extrabold text-slate-500 uppercase px-1">
                          Planned Date
                        </Label>
                        <Input
                          type="date"
                          className="h-9 text-xs border-slate-200"
                          {...form.register(
                            `items.${index}.plannedDate` as const,
                            {
                              setValueAs: (v) => (v ? new Date(v) : undefined),
                            },
                          )}
                          defaultValue={format(new Date(), 'yyyy-MM-dd')}
                        />
                      </div>
                      <div className="col-span-5 space-y-1">
                        <Label className="text-[9px] font-extrabold text-slate-500 uppercase px-1">
                          EMI Amount
                        </Label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">
                            ₹
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            className="h-9 pl-6 text-xs font-bold border-slate-200"
                            {...form.register(
                              `items.${index}.totalAmount` as const,
                              {
                                valueAsNumber: true,
                              },
                            )}
                          />
                        </div>
                      </div>
                      <div className="col-span-1 pb-0.5 flex justify-center">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-slate-300 hover:text-red-600 hover:bg-red-50"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-6 border-t mt-auto flex items-center justify-between sticky bottom-0 bg-white/50 backdrop-blur-sm">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
                      Total Planned Now
                    </span>
                    <span
                      className={`text-xl font-black tracking-tight ${remainingToPlan < 0 ? 'text-red-500' : 'text-slate-900'}`}
                    >
                      ₹{totalPlannedInForm.toLocaleString()}
                    </span>
                    {summary && remainingToPlan !== 0 && (
                      <span
                        className={`text-[9px] font-bold ${remainingToPlan < 0 ? 'text-red-400' : 'text-slate-400'}`}
                      >
                        {remainingToPlan > 0
                          ? `₹${remainingToPlan.toLocaleString()} still left to plan`
                          : `₹${Math.abs(remainingToPlan).toLocaleString()} over total amount!`}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      className="font-bold text-slate-500"
                      onClick={() => setOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="h-11 px-6 bg-slate-900 hover:bg-black text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all group"
                      disabled={
                        isSubmitting ||
                        !form.formState.isValid ||
                        !selectedLoanId ||
                        remainingToPlan < 0 ||
                        totalPlannedInForm <= 0
                      }
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Confirm Plan{' '}
                          <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
