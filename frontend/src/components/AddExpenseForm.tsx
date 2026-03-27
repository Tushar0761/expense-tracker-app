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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createCategory,
  createExpense,
  fetchAccounts,
  fetchLeafCategories,
  updateExpense,
  type Account,
  type CategoryFlat,
  type CreateExpensePayload,
  type ExpenseRow,
} from '@/lib/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, format, subDays } from 'date-fns';
import { Calendar, Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const expenseSchema = z.object({
  date: z.date({ required_error: 'Date is required' }),
  amount: z.coerce
    .number({ invalid_type_error: 'Amount must be a number' })
    .positive({ message: 'Amount must be greater than zero' }),
  remarks: z.string().optional(),
  accountId: z.coerce.number().min(1, { message: 'Account is required' }),
  categoryId: z.coerce.number().min(1, { message: 'Category is required' }),
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface AddExpenseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  expense?: ExpenseRow | null;
}

export function AddExpenseForm({
  isOpen,
  onClose,
  onSuccess,
  expense,
}: AddExpenseFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!expense;

  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [isCreatingCat, setIsCreatingCat] = useState(false);

  const firstAccountIdRef = useRef<number | null>(null);

  const { data: categories = [] } = useQuery<CategoryFlat[]>({
    queryKey: ['categories-leaf'],
    queryFn: fetchLeafCategories,
    enabled: isOpen,
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
    enabled: isOpen,
  });

  useEffect(() => {
    if (accounts.length > 0 && firstAccountIdRef.current === null) {
      firstAccountIdRef.current = accounts[0].id;
    }
  }, [accounts]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: new Date(),
      amount: 0,
      remarks: '',
      accountId: 0,
      categoryId: 0,
    },
  });

  const watchedDate = watch('date');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    reset(
      expense
        ? {
            date: new Date(expense.date),
            amount: expense.amount,
            remarks: expense.remarks || '',
            accountId: expense.accountId || 0,
            categoryId: expense.categoryId,
          }
        : {
            date: new Date(),
            amount: 0,
            remarks: '',
            accountId: firstAccountIdRef.current || 0,
            categoryId: 0,
          },
    );
  }, [isOpen, expense, reset]);

  const setDate = (d: Date) => setValue('date', d, { shouldValidate: true });
  const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) setDate(new Date(e.target.value));
  };

  const mutation = useMutation({
    mutationFn: (payload: CreateExpensePayload) =>
      isEditing && expense
        ? updateExpense(expense.id, payload)
        : createExpense(payload),
    onSuccess: () => {
      toast.success(isEditing ? 'Expense updated' : 'Expense added');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      onClose();
      onSuccess?.();
      reset();
      firstAccountIdRef.current = null;
    },
    onError: (error: Error) => toast.error(`Error: ${error.message}`),
  });

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    setIsCreatingCat(true);
    try {
      const newCat = await createCategory({ name: newCatName });
      toast.success('Category created');
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      await queryClient.invalidateQueries({ queryKey: ['categories-leaf'] });
      setValue('categoryId', newCat.id, { shouldValidate: true });
      setIsAddCategoryOpen(false);
      setNewCatName('');
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create category',
      );
    } finally {
      setIsCreatingCat(false);
    }
  };

  const onSubmit = (data: ExpenseFormValues) => {
    mutation.mutate({
      date: format(data.date, 'yyyy-MM-dd'),
      amount: data.amount,
      remarks: data.remarks || undefined,
      accountId: data.accountId,
      categoryId: data.categoryId,
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-2xl shadow-2xl border-border/50 bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 py-3 px-5">
          <div>
            <CardTitle className="text-lg font-bold tracking-tight">
              {isEditing ? 'Edit Expense' : 'New Transaction'}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEditing
                ? 'Update transaction details'
                : 'Record a new expense'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Row 1: Date + Amount */}
            <div className="grid grid-cols-2 gap-4">
              {/* Date */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Date
                </Label>
                <div className="relative">
                  <Input
                    type="date"
                    className="h-10 pr-9 text-sm font-medium cursor-pointer"
                    value={watchedDate ? format(watchedDate, 'yyyy-MM-dd') : ''}
                    onChange={handleDateInput}
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                </div>
                {/* Date shortcuts */}
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs flex-1 px-2"
                    onClick={() => setDate(subDays(new Date(), 1))}
                  >
                    Yesterday
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs flex-1 px-2"
                    onClick={() => setDate(new Date())}
                  >
                    Today
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() =>
                      setDate(addDays(watchedDate || new Date(), -1))
                    }
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() =>
                      setDate(addDays(watchedDate || new Date(), 1))
                    }
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {errors.date && (
                  <p className="text-xs text-red-500">{errors.date.message}</p>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="amount"
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Amount (₹)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">
                    ₹
                  </span>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    className="pl-7 h-10 text-base font-bold"
                    {...register('amount')}
                  />
                </div>
                {errors.amount && (
                  <p className="text-xs text-red-500">
                    {errors.amount.message}
                  </p>
                )}
              </div>
            </div>

            {/* Row 2: Account + Category */}
            <div className="grid grid-cols-2 gap-4">
              {/* Account */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Account
                </Label>
                <Controller
                  name="accountId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      key={`account-${accounts.length}-${field.value}`}
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={String(acc.id)}>
                            <span className="font-medium">{acc.name}</span>
                            <span className="ml-2 text-muted-foreground text-xs">
                              ₹{acc.balance.toLocaleString()}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.accountId && (
                  <p className="text-xs text-red-500">
                    {errors.accountId.message}
                  </p>
                )}
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Category
                  </Label>
                  <button
                    type="button"
                    onClick={() => setIsAddCategoryOpen(true)}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    + New
                  </button>
                </div>
                <Controller
                  name="categoryId"
                  control={control}
                  render={({ field }) => (
                    <SearchableSelect
                      value={field.value === 0 ? null : field.value}
                      onChange={field.onChange}
                      options={categories}
                      placeholder="Select category"
                      error={errors.categoryId?.message}
                      showFullPath
                    />
                  )}
                />
              </div>
            </div>

            {/* Row 3: Notes */}
            <div className="space-y-1.5">
              <Label
                htmlFor="remarks"
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Notes
              </Label>
              <Input
                id="remarks"
                placeholder="Add a note about this expense..."
                className="h-10 text-sm"
                {...register('remarks')}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 h-10 text-sm font-medium"
              >
                <X className="w-4 h-4 mr-1.5" />
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 h-10 text-sm font-bold bg-green-600 hover:bg-green-700"
                disabled={isSubmitting || mutation.isPending}
              >
                <Check className="w-4 h-4 mr-1.5" />
                {mutation.isPending
                  ? 'Saving...'
                  : isEditing
                    ? 'Update'
                    : 'Confirm'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Add Category Dialog */}
      <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-3">
            <Label htmlFor="newCategory" className="text-sm font-medium">
              Category Name
            </Label>
            <Input
              id="newCategory"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g. Groceries, Entertainment"
              className="h-10 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddCategoryOpen(false);
                setNewCatName('');
              }}
              className="flex-1 h-9"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCategory}
              disabled={isCreatingCat || !newCatName.trim()}
              className="flex-1 h-9 bg-green-600 hover:bg-green-700"
            >
              <Check className="w-3.5 h-3.5 mr-1.5" />
              {isCreatingCat ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
