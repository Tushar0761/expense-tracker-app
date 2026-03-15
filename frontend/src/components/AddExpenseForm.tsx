import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
    createCategory,
    createExpense,
    updateExpense,
    fetchCategoriesFlat,
    fetchAccounts,
    type CategoryFlat,
    type CreateExpensePayload,
    type ExpenseRow,
    type Account
} from "@/lib/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { X, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const expenseSchema = z.object({
    date: z.date({ required_error: "Date is required" }),
    amount: z.coerce
        .number({ invalid_type_error: "Amount must be a number" })
        .positive({ message: "Amount must be greater than zero" }),
    remarks: z.string().optional(),
    accountId: z.coerce.number().min(1, { message: "Account is required" }),
    categoryIds: z.array(z.number()).min(1, { message: "At least one category is required" }),
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface AddExpenseFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    expense?: ExpenseRow | null; // For editing
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
    const [newCatName, setNewCatName] = useState("");
    const [isCreatingCat, setIsCreatingCat] = useState(false);

    // Fetch data
    const { data: categories = [] } = useQuery<CategoryFlat[]>({
        queryKey: ["categories-flat"],
        queryFn: fetchCategoriesFlat,
        enabled: isOpen,
    });

    const { data: accounts = [] } = useQuery<Account[]>({
        queryKey: ["accounts"],
        queryFn: fetchAccounts,
        enabled: isOpen,
    });

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
            remarks: "",
            accountId: 0,
            categoryIds: [],
        },
    });

    const selectedCategoryIds = watch("categoryIds") || [];

    // Initialize form when editing
    useEffect(() => {
        if (expense && isOpen) {
            reset({
                date: new Date(expense.date),
                amount: expense.amount,
                remarks: expense.remarks || "",
                accountId: expense.accountId || 0,
                categoryIds: expense.categories.map(c => c.id),
            });
        } else if (isOpen) {
            reset({
                date: new Date(),
                amount: 0,
                remarks: "",
                accountId: accounts[0]?.id || 0,
                categoryIds: [],
            });
        }
    }, [expense, isOpen, reset, accounts]);

    const mutation = useMutation({
        mutationFn: (payload: CreateExpensePayload) => 
            isEditing && expense ? updateExpense(expense.id, payload) : createExpense(payload),
        onSuccess: () => {
            toast.success(isEditing ? "Expense updated" : "Expense added");
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
            queryClient.invalidateQueries({ queryKey: ["accounts"] });
            onClose();
            onSuccess?.();
            reset();
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
            toast.success("Category created");
            await queryClient.invalidateQueries({ queryKey: ["categories-flat"] });
            setValue("categoryIds", [...selectedCategoryIds, newCat.id]);
            setIsAddCategoryOpen(false);
            setNewCatName("");
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to create category");
        } finally {
            setIsCreatingCat(false);
        }
    };

    const toggleCategory = (id: number) => {
        const current = [...selectedCategoryIds];
        const index = current.indexOf(id);
        if (index > -1) {
            current.splice(index, 1);
        } else {
            current.push(id);
        }
        setValue("categoryIds", current);
    };

    const onSubmit = (data: ExpenseFormValues) => {
        const payload: CreateExpensePayload = {
            date: format(data.date, "yyyy-MM-dd"),
            amount: data.amount,
            remarks: data.remarks || undefined,
            accountId: data.accountId,
            categoryIds: data.categoryIds,
        };
        mutation.mutate(payload);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 backdrop-blur-[2px] animate-in fade-in duration-300">
            <Card className="w-full max-w-md shadow-2xl border-border/50 overflow-hidden bg-card/95">
                <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 py-3 px-4">
                    <div>
                        <CardTitle className="text-lg font-bold tracking-tight">
                            {isEditing ? "Edit Expense" : "New Transaction"}
                        </CardTitle>
                        <p className="text-[11px] text-muted-foreground">
                            {isEditing ? "Update details" : "Record a new entry"}
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8">
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent className="p-4">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="date" className="text-[11px] font-bold uppercase text-muted-foreground ml-0.5">Date</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    className="h-9 text-xs"
                                    {...register("date", {
                                        setValueAs: (v: string) => v ? new Date(v) : undefined,
                                    })}
                                    defaultValue={format(expense ? new Date(expense.date) : new Date(), "yyyy-MM-dd")}
                                />
                                {errors.date && <p className="text-[9px] text-red-500">{errors.date.message}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="amount" className="text-[11px] font-bold uppercase text-muted-foreground ml-0.5">Amount (₹)</Label>
                                <div className="relative">
                                    <span className="absolute left-2.5 top-2 text-muted-foreground text-xs">₹</span>
                                    <Input
                                        id="amount"
                                        type="number"
                                        placeholder="0.00"
                                        step="0.01"
                                        className="pl-6 h-9 font-bold text-xs"
                                        {...register("amount")}
                                    />
                                </div>
                                {errors.amount && <p className="text-[9px] text-red-500">{errors.amount.message}</p>}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="accountId" className="text-[11px] font-bold uppercase text-muted-foreground ml-0.5">Payment Account</Label>
                            <Controller
                                name="accountId"
                                control={control}
                                render={({ field }) => (
                                    <Select value={String(field.value)} onValueChange={v => field.onChange(Number(v))}>
                                        <SelectTrigger className="h-9 text-xs">
                                            <SelectValue placeholder="Select an account" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {accounts.map(acc => (
                                                <SelectItem key={acc.id} value={String(acc.id)}>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span>{acc.name}</span>
                                                        <span className="text-[9px] opacity-50 tabular-nums">₹{acc.balance.toLocaleString()}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {errors.accountId && <p className="text-[9px] text-red-500">{errors.accountId.message}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label className="text-[11px] font-bold uppercase text-muted-foreground ml-0.5">Categories</Label>
                                <Button type="button" variant="ghost" size="sm" className="h-6 text-primary text-[10px] font-bold px-1" onClick={() => setIsAddCategoryOpen(true)}>
                                    + ADD NEW
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-1.5 p-2 bg-muted/10 border rounded-lg min-h-[70px] max-h-[100px] overflow-y-auto">
                                {categories.map(cat => (
                                    <Badge 
                                        key={cat.id} 
                                        variant={selectedCategoryIds.includes(cat.id) ? "default" : "outline"}
                                        className={`cursor-pointer transition-all duration-200 select-none py-0.5 px-2 text-[10px] font-medium rounded-md ${
                                            selectedCategoryIds.includes(cat.id) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                                        }`}
                                        onClick={() => toggleCategory(cat.id)}
                                    >
                                        {cat.name}
                                        {selectedCategoryIds.includes(cat.id) && <Check className="ml-1 h-2.5 w-2.5" />}
                                    </Badge>
                                ))}
                            </div>
                            {errors.categoryIds && <p className="text-[9px] text-red-500">{errors.categoryIds.message}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="remarks" className="text-[11px] font-bold uppercase text-muted-foreground ml-0.5">Notes / Remarks</Label>
                            <Input
                                id="remarks"
                                placeholder="..."
                                className="h-9 text-xs"
                                {...register("remarks")}
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-md h-9 text-xs font-semibold">
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1 rounded-md h-9 text-xs font-bold" disabled={isSubmitting || mutation.isPending}>
                                {mutation.isPending ? "..." : isEditing ? "Update" : "Confirm"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Quick Add Category</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <Label htmlFor="newCategory">Category Name</Label>
                        <Input
                            id="newCategory"
                            value={newCatName}
                            onChange={e => setNewCatName(e.target.value)}
                            placeholder="e.g. Travel, Entertainment"
                            onKeyDown={e => e.key === "Enter" && handleCreateCategory()}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddCategoryOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateCategory} disabled={isCreatingCat || !newCatName.trim()}>
                            {isCreatingCat ? "Saving..." : "Create & Add"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
