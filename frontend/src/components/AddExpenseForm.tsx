import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  createCategory,
  createExpense,
  updateExpense,
  fetchCategoriesFlat,
  fetchAccounts,
  type CategoryFlat,
  type CreateExpensePayload,
  type ExpenseRow,
  type Account,
} from '@/lib/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, subDays, addDays } from 'date-fns';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Check,
  Trash2,
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
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
    queryKey: ['categories-flat'],
    queryFn: fetchCategoriesFlat,
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
    if (!isOpen) return;

    if (expense) {
      reset({
        date: new Date(expense.date),
        amount: expense.amount,
        remarks: expense.remarks || '',
        accountId: expense.accountId || 0,
        categoryId: expense.categoryId,
      });
    } else {
      reset({
        date: new Date(),
        amount: 0,
        remarks: '',
        accountId: firstAccountIdRef.current || 0,
        categoryId: 0,
      });
    }
  }, [isOpen, expense, reset]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      setValue('date', new Date(value), { shouldValidate: true });
    }
  };

  const handleYesterday = () => {
    const yesterday = subDays(new Date(), 1);
    setValue('date', yesterday, { shouldValidate: true });
  };

  const handleToday = () => {
    setValue('date', new Date(), { shouldValidate: true });
  };

  const handlePrevDay = () => {
    const current = watchedDate || new Date();
    const newDate = addDays(current, -1);
    setValue('date', newDate, { shouldValidate: true });
  };

  const handleNextDay = () => {
    const current = watchedDate || new Date();
    const newDate = addDays(current, 1);
    setValue('date', newDate, { shouldValidate: true });
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
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    setIsCreatingCat(true);
    try {
      const newCat = await createCategory({ name: newCatName });
      toast.success('Category created');
      await queryClient.invalidateQueries({ queryKey: ['categories-flat'] });
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
    const payload: CreateExpensePayload = {
      date: format(data.date, 'yyyy-MM-dd'),
      amount: data.amount,
      remarks: data.remarks || undefined,
      accountId: data.accountId,
      categoryId: data.categoryId,
    };
    mutation.mutate(payload);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-lg shadow-2xl border-border/50 overflow-hidden bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 py-4 px-6">
          <div>
            <CardTitle className="text-xl font-bold tracking-tight">
              {isEditing ? 'Edit Expense' : 'New Transaction'}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isEditing
                ? 'Update transaction details'
                : 'Record a new expense'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full h-9 w-9"
          >
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">
                  Date
                </Label>
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      type="date"
                      className="h-11 pr-10 text-sm font-medium cursor-pointer"
                      value={
                        watchedDate ? format(watchedDate, 'yyyy-MM-dd') : ''
                      }
                      onChange={handleDateChange}
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-sm font-medium flex-1"
                      onClick={handleYesterday}
                    >
                      Yesterday
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-sm font-medium flex-1"
                      onClick={handleToday}
                    >
                      Today
                    </Button>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handlePrevDay}
                        title="Previous day"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleNextDay}
                        title="Next day"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                {errors.date && (
                  <p className="text-xs text-red-500">{errors.date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="amount"
                  className="text-sm font-semibold text-foreground"
                >
                  Amount (₹)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-base font-medium">
                    ₹
                  </span>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    className="pl-8 h-11 text-base font-bold"
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

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">
                Payment Account
              </Label>
              <Controller
                name="accountId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger className="h-11 text-sm">
                      <SelectValue placeholder="Select payment account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={String(acc.id)}>
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium">{acc.name}</span>
                            <span className="text-muted-foreground ml-2">
                              ₹{acc.balance.toLocaleString()}
                            </span>
                          </div>
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-foreground">
                  Category
                </Label>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-7 text-sm font-semibold text-primary p-0"
                  onClick={() => setIsAddCategoryOpen(true)}
                >
                  + Add New
                </Button>
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
                  />
                )}
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="remarks"
                className="text-sm font-semibold text-foreground"
              >
                Notes / Remarks
              </Label>
              <Input
                id="remarks"
                placeholder="Add notes about this expense..."
                className="h-11 text-sm"
                {...register('remarks')}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="destructive"
                onClick={onClose}
                className="flex-1 rounded-lg h-12 text-base font-medium"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 rounded-lg h-12 text-base font-bold bg-green-600 hover:bg-green-700"
                disabled={isSubmitting || mutation.isPending}
              >
                <Check className="w-4 h-4 mr-2" />
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

      <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Add New Category</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newCategory" className="text-sm font-medium">
                Category Name
              </Label>
              <Input
                id="newCategory"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Groceries, Entertainment"
                className="h-11 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={() => {
                setIsAddCategoryOpen(false);
                setNewCatName('');
              }}
              className="flex-1 h-10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleCreateCategory}
              disabled={isCreatingCat || !newCatName.trim()}
              className="flex-1 h-10 bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4 mr-2" />
              {isCreatingCat ? 'Creating...' : 'Create & Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
