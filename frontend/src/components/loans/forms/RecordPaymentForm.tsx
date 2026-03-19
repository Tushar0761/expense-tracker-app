import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  fetchFuturePaymentsByLoan,
  fetchLoansByBorrower,
  recordPayment,
  type FuturePaymentRow,
  type LoanTableRow,
} from '@/lib/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from '@radix-ui/react-label';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Info,
  Loader2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { paymentSchema, type PaymentFormValues } from './schema';

interface RecordPaymentDialogProps {
  borrowers: { id: string; borrowerName: string }[];
  onSuccess?: () => void;
}

export const RecordPaymentFormDialog = ({
  borrowers,
  onSuccess,
}: RecordPaymentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string>('');
  const queryClient = useQueryClient();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      loanId: '',
      paymentMethod: 'upi',
      totalAmount: 0,
      paymentDate: new Date(),
      notes: '',
      principalAmount: 0,
      interestAmount: 0,
    },
  });

  const selectedLoanId = form.watch('loanId');

  // Fetch loans for selected borrower
  const { data: loans, isLoading: loansLoading } = useQuery<LoanTableRow[]>({
    queryKey: ['loans-by-borrower', selectedBorrowerId],
    queryFn: () => fetchLoansByBorrower(Number(selectedBorrowerId)),
    enabled: !!selectedBorrowerId && open,
  });

  // Fetch future payments for selected loan
  const { data: futurePayments, isLoading: fpLoading } = useQuery<
    FuturePaymentRow[]
  >({
    queryKey: ['future-payments-by-loan', selectedLoanId],
    queryFn: () => fetchFuturePaymentsByLoan(Number(selectedLoanId)),
    enabled: !!selectedLoanId && open,
  });

  const selectedLoan = useMemo(
    () => loans?.find((l) => String(l.id) === selectedLoanId),
    [loans, selectedLoanId],
  );

  // Reset loanId when borrower changes
  useEffect(() => {
    if (selectedBorrowerId) {
      form.setValue('loanId', '');
    }
  }, [selectedBorrowerId, form]);

  const handleFuturePaymentSelect = (fp: FuturePaymentRow) => {
    form.setValue('futurePaymentId', String(fp.id));
    form.setValue('totalAmount', fp.totalAmount);
    form.setValue('principalAmount', fp.principalAmount);
    form.setValue('interestAmount', fp.interestAmount);
    form.setValue('notes', `EMI for ${fp.plannedDate}`);

    toast.info(`Selected EMI for ${fp.plannedDate}`, {
      description: 'Form pre-filled based on selected plan.',
      duration: 2000,
    });
  };

  const handleSubmit = async (values: PaymentFormValues) => {
    try {
      setIsSubmitting(true);

      const payload = {
        ...values,
        loanId: Number(values.loanId),
        futurePaymentId: values.futurePaymentId
          ? Number(values.futurePaymentId)
          : undefined,
      };

      await recordPayment(payload);

      toast.success('Payment recorded successfully!');

      queryClient.invalidateQueries({ queryKey: ['loans-table'] });
      queryClient.invalidateQueries({ queryKey: ['loans-insight-data'] });
      queryClient.invalidateQueries({ queryKey: ['loans-graph'] });
      queryClient.invalidateQueries({ queryKey: ['loans-payments'] });
      queryClient.invalidateQueries({
        queryKey: ['loans-future-payments'],
      });
      queryClient.invalidateQueries({
        queryKey: ['future-payments-by-loan', selectedLoanId],
      });

      if (onSuccess) onSuccess();
      setOpen(false);
      form.reset();
      setSelectedBorrowerId('');
    } catch (error) {
      console.error('Failed to record payment:', error);
      toast.error('Failed to record payment', {
        description:
          error instanceof Error ? error.message : 'Unexpected error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 hover:bg-primary hover:text-primary-foreground transition-all"
        >
          <CreditCard size={16} /> Record Payment
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto p-0 border-none shadow-2xl">
        <div className="sticky top-0 z-10 bg-slate-900 text-white p-6 rounded-t-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <CreditCard className="h-6 w-6 text-blue-400" />
              </div>
              Record Loan Payment
            </DialogTitle>
            <p className="text-slate-400 text-sm mt-1">
              Link a new payment to an existing loan and mark planned EMIs as
              completed.
            </p>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-10">
          {/* SECTION 1: SELECTION */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-900 font-bold text-sm">
                1
              </span>
              <h3 className="text-lg font-semibold text-slate-800">
                Select Loan Account
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-600">
                  Borrower
                </Label>
                <Select
                  value={selectedBorrowerId}
                  onValueChange={setSelectedBorrowerId}
                >
                  <SelectTrigger className="h-11 border-slate-200">
                    <SelectValue placeholder="Choose a borrower" />
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

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-600">
                  Loan Offer / ID
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
                      <SelectTrigger className="h-11 border-slate-200 disabled:bg-slate-50">
                        {loansLoading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Loading loans...</span>
                          </div>
                        ) : (
                          <SelectValue
                            placeholder={
                              selectedBorrowerId
                                ? 'Choose a loan account'
                                : 'Select borrower first'
                            }
                          />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {loans?.map((loan) => (
                          <SelectItem key={loan.id} value={String(loan.id)}>
                            ₹{loan.totalAmount.toLocaleString()} •{' '}
                            {format(new Date(loan.loanDate), 'dd MMM yyyy')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.loanId && (
                  <p className="text-red-500 text-xs mt-1">
                    {form.formState.errors.loanId.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: LOAN SUMMARY & EMIs */}
          {selectedLoan && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-900 font-bold text-sm">
                  2
                </span>
                <h3 className="text-lg font-semibold text-slate-800">
                  Account Summary & Planned EMIs
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-50 border-none shadow-sm overflow-hidden">
                  <CardContent className="p-4 flex flex-col justify-center border-l-4 border-slate-400">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">
                      Total Principal
                    </span>
                    <span className="text-xl font-bold text-slate-900">
                      ₹{selectedLoan.totalAmount.toLocaleString()}
                    </span>
                  </CardContent>
                </Card>
                <Card className="bg-green-50/50 border-none shadow-sm overflow-hidden">
                  <CardContent className="p-4 flex flex-col justify-center border-l-4 border-green-500">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-green-600 mb-1">
                      Amount Paid
                    </span>
                    <span className="text-xl font-bold text-green-700">
                      ₹{selectedLoan.paidAmount.toLocaleString()}
                    </span>
                  </CardContent>
                </Card>
                <Card className="bg-red-50/50 border-none shadow-sm overflow-hidden">
                  <CardContent className="p-4 flex flex-col justify-center border-l-4 border-red-500">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-red-600 mb-1">
                      Outstanding
                    </span>
                    <span className="text-xl font-bold text-red-700">
                      ₹{selectedLoan.remainingAmount.toLocaleString()}
                    </span>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-bold text-slate-700">
                      Select Planned EMI Record
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-white text-[10px] font-bold text-slate-500"
                  >
                    Pending Collections: {futurePayments?.length || 0}
                  </Badge>
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                  {fpLoading ? (
                    <div className="p-10 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500" />
                      <p className="text-sm text-slate-500 font-medium mt-3">
                        Syncing current plans...
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="bg-slate-50/50 sticky top-0 backdrop-blur-sm">
                        <TableRow className="hover:bg-transparent border-slate-200">
                          <TableHead className="py-3 px-5 text-xs text-slate-500 uppercase tracking-wider">
                            Due Date
                          </TableHead>
                          <TableHead className="py-3 px-5 text-right text-xs text-slate-500 uppercase tracking-wider">
                            Amount
                          </TableHead>
                          <TableHead className="py-3 px-5 text-right text-xs text-slate-500 uppercase tracking-wider">
                            Action
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {futurePayments && futurePayments.length > 0 ? (
                          futurePayments.map((fp) => (
                            <TableRow
                              key={fp.id}
                              className="group hover:bg-blue-50/30 transition-colors border-slate-100"
                            >
                              <TableCell className="py-4 px-5 text-sm font-medium text-slate-700">
                                {fp.plannedDate}
                              </TableCell>
                              <TableCell className="py-4 px-5 text-right font-bold text-slate-900 tracking-tight">
                                ₹{fp.totalAmount.toLocaleString()}
                              </TableCell>
                              <TableCell className="py-4 px-5 text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-4 text-xs font-bold border-slate-200 hover:border-blue-500 hover:text-blue-600 transition-all rounded-full group-hover:bg-white"
                                  onClick={() => handleFuturePaymentSelect(fp)}
                                >
                                  Map Payment
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={3}
                              className="text-center py-10 px-5"
                            >
                              <div className="flex flex-col items-center gap-2 opacity-40">
                                <CheckCircle2 className="h-8 w-8 text-green-500" />
                                <p className="text-sm text-slate-900 font-bold">
                                  No Pending Plans
                                </p>
                                <p className="text-xs text-slate-500">
                                  All scheduled EMIs for this loan are
                                  completed.
                                </p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: PAYMENT FORM */}
          {selectedLoan && (
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-900 font-bold text-sm">
                  3
                </span>
                <h3 className="text-lg font-semibold text-slate-800">
                  Transaction Details
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                {/* Left side fields */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-600 tracking-tight">
                      Transaction Date
                    </Label>
                    <Input
                      type="date"
                      className="h-11 border-slate-200 focus:ring-blue-500 transition-all"
                      {...form.register('paymentDate', {
                        setValueAs: (v) => (v ? new Date(v) : undefined),
                      })}
                      defaultValue={format(new Date(), 'yyyy-MM-dd')}
                    />
                    {form.formState.errors.paymentDate && (
                      <p className="text-red-500 text-xs font-medium">
                        {form.formState.errors.paymentDate.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-600 tracking-tight">
                      Channel / Method
                    </Label>
                    <Controller
                      name="paymentMethod"
                      control={form.control}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger className="h-11 border-slate-200 capitalize">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="upi" className="capitalize">
                              UPI / Instant Pay
                            </SelectItem>
                            <SelectItem
                              value="bank_transfer"
                              className="capitalize"
                            >
                              Bank Transfer / NEFT
                            </SelectItem>
                            <SelectItem value="cash" className="capitalize">
                              Physical Cash
                            </SelectItem>
                            <SelectItem value="cheque" className="capitalize">
                              Account Cheque
                            </SelectItem>
                            <SelectItem value="other" className="capitalize">
                              Other Medium
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-600 tracking-tight">
                      Memo / Notes
                    </Label>
                    <Input
                      className="h-11 border-slate-200 placeholder:text-slate-400"
                      {...form.register('notes')}
                      placeholder="Purpose of this payment..."
                    />
                  </div>
                </div>

                {/* Right side fields: Amounts */}
                <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-slate-700 tracking-tight flex justify-between items-center">
                      Total Amount Received
                      <span className="text-[10px] text-blue-600 font-extrabold bg-blue-50 px-2 py-0.5 rounded-full uppercase">
                        Required
                      </span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                        ₹
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        className="h-14 pl-8 text-xl font-bold border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all rounded-xl"
                        {...form.register('totalAmount', {
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                    {form.formState.errors.totalAmount && (
                      <p className="text-red-500 text-xs font-semibold">
                        {form.formState.errors.totalAmount.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-center md:text-left">
                      <Label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest pl-1">
                        Principal
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                          ₹
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          className="h-11 pl-7 font-bold border-slate-200 bg-white"
                          {...form.register('principalAmount', {
                            valueAsNumber: true,
                          })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2 text-center md:text-left">
                      <Label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest pl-1">
                        Interest
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                          ₹
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          className="h-11 pl-7 font-bold border-slate-200 bg-white"
                          {...form.register('interestAmount', {
                            valueAsNumber: true,
                          })}
                        />
                      </div>
                    </div>
                  </div>

                  {form.watch('futurePaymentId') && (
                    <div className="pt-2">
                      <Badge
                        variant="secondary"
                        className="w-full flex justify-center py-2 px-4 gap-2 border-slate-300 border bg-white rounded-lg text-slate-600 font-medium"
                      >
                        <CheckCircle2 size={14} className="text-green-500" />
                        Mapping to Plan ID: {form.watch('futurePaymentId')}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              <div className="sticky bottom-0 bg-white/80 backdrop-blur-md pt-6 pb-2 border-t mt-12 flex flex-col gap-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Net Payable Now
                    </span>
                    <span className="text-2xl font-black text-slate-900 leading-none">
                      ₹{Number(form.watch('totalAmount') || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setOpen(false)}
                      className="font-bold text-slate-500 hover:text-slate-900"
                    >
                      Discard
                    </Button>
                    <Button
                      type="submit"
                      className="h-12 px-8 bg-slate-900 hover:bg-black text-white font-bold text-lg rounded-xl shadow-xl shadow-slate-200 group active:scale-95 transition-all"
                      disabled={
                        isSubmitting ||
                        !form.formState.isValid ||
                        !selectedLoanId
                      }
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Confirm Record
                          <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <p className="text-[10px] text-center text-slate-400 font-medium pb-2">
                  By clicking Confirm, you are updating the ledger for this loan
                  account. This action cannot be undone.
                </p>
              </div>
            </form>
          )}

          {!selectedLoan && !selectedBorrowerId && (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 rounded-3xl border-2 border-dashed border-slate-100 bg-slate-50/30">
              <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                <Info className="h-10 w-10 text-blue-200" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-bold text-slate-800">
                  Ready to record a receipt?
                </h4>
                <p className="text-slate-500 max-w-[280px] mx-auto text-sm">
                  Select a borrower and active loan from the section above to
                  continue.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
