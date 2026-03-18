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
import { X, ChevronLeft, ChevronRight, Calendar, Search } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { subDays } from "date-fns";
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
    categoryId: z.coerce.number().min(1, { message: "Category is required" }),
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

    const [categorySearch, setCategorySearch] = useState("");

    const filteredCategories = useMemo(() => {
        if (!categorySearch.trim()) return categories;
        const search = categorySearch.toLowerCase();
        return categories.filter(cat => cat.name.toLowerCase().includes(search));
    }, [categories, categorySearch]);

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
            categoryId: 0,
        },
    });

    // Initialize form when editing
    useEffect(() => {
        if (expense && isOpen) {
            reset({
                date: new Date(expense.date),
                amount: expense.amount,
                remarks: expense.remarks || "",
                accountId: expense.accountId || 0,
                categoryId: expense.categoryId,
            });
        } else if (isOpen) {
            reset({
                date: new Date(),
                amount: 0,
                remarks: "",
                accountId: accounts[0]?.id || 0,
                categoryId: 0,
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
            setValue("categoryId", newCat.id);
            setIsAddCategoryOpen(false);
            setNewCatName("");
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to create category");
        } finally {
            setIsCreatingCat(false);
        }
    };

    const onSubmit = (data: ExpenseFormValues) => {
        const payload: CreateExpensePayload = {
            date: format(data.date, "yyyy-MM-dd"),
            amount: data.amount,
            remarks: data.remarks || undefined,
            accountId: data.accountId,
            categoryId: data.categoryId,
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
                                <Label className="text-[11px] font-bold uppercase text-muted-foreground ml-0.5">Date</Label>
                                <div className="flex items-center gap-1">
                                    <div className="relative flex-1">
                                        <Input
                                            type="date"
                                            className="h-9 text-xs pr-8"
                                            {...register("date", {
                                                setValueAs: (v: string) => v ? new Date(v) : undefined,
                                            })}
                                            defaultValue={format(expense ? new Date(expense.date) : new Date(), "yyyy-MM-dd")}
                                        />
                                        <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-6 text-[10px] px-2 font-medium"
                                        onClick={() => {
                                            const yesterday = subDays(new Date(), 1);
                                            setValue("date", yesterday);
                                        }}
                                    >
                                        Yesterday
                                    </Button>
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-6 text-[10px] px-2 font-medium"
                                        onClick={() => {
                                            setValue("date", new Date());
                                        }}
                                    >
                                        Today
                                    </Button>
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                        onClick={() => {
                                            const currentValue = watch("date");
                                            const date = currentValue || new Date();
                                            const newDate = new Date(date.getFullYear(), date.getMonth() - 1, date.getDate());
                                            setValue("date", newDate);
                                        }}
                                    >
                                        <ChevronLeft className="h-3 w-3" />
                                    </Button>
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                        onClick={() => {
                                            const date = watch("date") || new Date();
                                            const newDate = new Date(date.getFullYear(), date.getMonth() + 1, date.getDate());
                                            setValue("date", newDate);
                                        }}
                                    >
                                        <ChevronRight className="h-3 w-3" />
                                    </Button>
                                </div>
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
                                <Label className="text-[11px] font-bold uppercase text-muted-foreground ml-0.5">Category</Label>
                                <Button type="button" variant="ghost" size="sm" className="h-6 text-primary text-[10px] font-bold px-1" onClick={() => setIsAddCategoryOpen(true)}>
                                    + ADD NEW
                                </Button>
                            </div>
                            <Controller
                                name="categoryId"
                                control={control}
                                render={({ field }) => (
                                    <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value?.toString() || ""}>
                                        <SelectTrigger className="h-9 text-xs">
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[200px]">
                                            <div className="p-2 border-b">
                                                <div className="relative">
                                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                                    <Input
                                                        placeholder="Search categories..."
                                                        value={categorySearch}
                                                        onChange={(e) => setCategorySearch(e.target.value)}
                                                        className="h-7 text-xs pl-7"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </div>
                                            {filteredCategories.map(cat => (
                                                <SelectItem key={cat.id} value={cat.id.toString()} className="text-xs">
                                                    {cat.name}
                                                </SelectItem>
                                            ))}
                                            {filteredCategories.length === 0 && (
                                                <div className="p-2 text-xs text-muted-foreground text-center">No categories found</div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {errors.categoryId && <p className="text-[9px] text-red-500">{errors.categoryId.message}</p>}
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
