// src/components/loans/CreateLoanDialog.tsx
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createLoan } from "@/lib/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { Label } from "@radix-ui/react-label";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { AddBorrowerDialog } from "./AddBorrowerDialog";
import { loanSchema, type LoanFormValues } from "./schema";

interface CreateLoanDialogProps {
    borrowers: { id: string; borrowerName: string }[];
    onSubmit: (data: LoanFormValues) => Promise<void> | void;
    onBorrowerAdded?: (newBorrower: {
        id: number;
        borrowerName: string;
    }) => void;
}

export const CreateLoanFormDialog = ({
    borrowers,
    onSubmit,
    onBorrowerAdded,
}: CreateLoanDialogProps) => {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<LoanFormValues>({
        resolver: zodResolver(loanSchema),
        mode: "onChange", // Enable real-time validation
        defaultValues: {
            borrowerId: "",
            status: "PENDING",
            notes: "",
            initialAmount: 0,
            interestRate: 0,
            totalAmount: 0,
            loanDate: new Date(),
        },
    });

    const handleSubmit = async (values: LoanFormValues) => {
        try {
            setIsLoading(true);
            console.log({ values });

            // Call the API to create the loan
            const newLoan = await createLoan(values);
            console.log("Loan created successfully:", newLoan);

            // Show success toast
            toast.success("Loan created successfully!", {
                description: `Loan for ${values.totalAmount} has been created.`,
            });

            // Call the parent onSubmit if provided
            await onSubmit(values);

            // Close dialog and reset form on success
            setOpen(false);
            form.reset();
        } catch (error) {
            console.error("Failed to create loan:", error);

            // Show error toast with details
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "An unexpected error occurred";

            toast.error("Failed to create loan", {
                description: errorMessage,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                    <Plus size={16} /> Add Loan
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Create New Loan</DialogTitle>
                </DialogHeader>

                <form
                    onSubmit={form.handleSubmit(handleSubmit)}
                    className="space-y-4 mt-4"
                >
                    {/* Borrower */}
                    <div>
                        <Label>Borrower</Label>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <Controller
                                    name="borrowerId"
                                    control={form.control}
                                    render={({ field }) => (
                                        <Select
                                            value={field.value}
                                            onValueChange={(val) => {
                                                console.log({
                                                    valfromValueChange: val,
                                                });
                                                field.onChange(val);
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Borrower" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {borrowers.map((b) => (
                                                    <SelectItem
                                                        key={b.id}
                                                        value={String(b.id)}
                                                    >
                                                        {b.borrowerName}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <AddBorrowerDialog
                                onSuccess={(newBorrower) => {
                                    if (onBorrowerAdded) {
                                        onBorrowerAdded(newBorrower);
                                    }
                                    form.setValue(
                                        "borrowerId",
                                        String(newBorrower.id),
                                    );
                                }}
                            />
                        </div>
                        {form.formState.errors.borrowerId && (
                            <p className="text-red-500 text-xs mt-1">
                                {form.formState.errors.borrowerId.message}
                            </p>
                        )}
                    </div>

                    {/* Status */}
                    <div>
                        <Label>Status</Label>
                        <Select
                            onValueChange={(val) =>
                                form.setValue(
                                    "status",
                                    val as LoanFormValues["status"],
                                )
                            }
                            value="ACTIVE"
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                                <SelectItem value="CLOSED">Closed</SelectItem>
                                <SelectItem value="DEFAULTED">
                                    Defaulted
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        {form.formState.errors.status?.message && (
                            <p className="text-red-500 text-xs">
                                {form.formState.errors.status.message}
                            </p>
                        )}
                    </div>

                    {/* Amounts */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Initial Amount</Label>
                            <Input
                                type="number"
                                {...form.register("initialAmount", {
                                    valueAsNumber: true,
                                })}
                            />{" "}
                            {form.formState.errors.initialAmount?.message && (
                                <p className="text-red-500 text-xs">
                                    {
                                        form.formState.errors.initialAmount
                                            .message
                                    }
                                </p>
                            )}
                        </div>

                        <div>
                            <Label>Interest Rate (%)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                {...form.register("interestRate", {
                                    valueAsNumber: true,
                                })}
                            />
                            {form.formState.errors.interestRate?.message && (
                                <p className="text-red-500 text-xs">
                                    {form.formState.errors.interestRate.message}
                                </p>
                            )}
                        </div>
                    </div>

                    <div>
                        <Label>Total Amount</Label>
                        <Input
                            type="number"
                            {...form.register("totalAmount", {
                                valueAsNumber: true,
                            })}
                        />
                        {form.formState.errors.totalAmount?.message && (
                            <p className="text-red-500 text-xs">
                                {form.formState.errors.totalAmount.message}
                            </p>
                        )}
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-sm font-medium">
                                Loan Date
                            </Label>
                            <Controller
                                name="loanDate"
                                control={form.control}
                                render={({ field }) => (
                                    <Input
                                        type="date"
                                        className="h-10"
                                        value={
                                            field.value instanceof Date
                                                ? format(
                                                      field.value,
                                                      "yyyy-MM-dd",
                                                  )
                                                : field.value || ""
                                        }
                                        onChange={(e) =>
                                            field.onChange(
                                                e.target.value
                                                    ? new Date(e.target.value)
                                                    : undefined,
                                            )
                                        }
                                    />
                                )}
                            />
                            {form.formState.errors.loanDate?.message && (
                                <p className="text-red-500 text-[10px] font-medium mt-1">
                                    {form.formState.errors.loanDate.message}
                                </p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <Label className="text-sm font-medium">
                                Due Date (Optional)
                            </Label>
                            <Controller
                                name="dueDate"
                                control={form.control}
                                render={({ field }) => (
                                    <Input
                                        type="date"
                                        className="h-10"
                                        value={
                                            field.value instanceof Date
                                                ? format(
                                                      field.value,
                                                      "yyyy-MM-dd",
                                                  )
                                                : field.value || ""
                                        }
                                        onChange={(e) =>
                                            field.onChange(
                                                e.target.value
                                                    ? new Date(e.target.value)
                                                    : undefined,
                                            )
                                        }
                                    />
                                )}
                            />
                            {form.formState.errors.dueDate?.message && (
                                <p className="text-red-500 text-[10px] font-medium mt-1">
                                    {form.formState.errors.dueDate.message}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <Label>Notes</Label>
                        <Input type="text" {...form.register("notes")} />
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading || !form.formState.isValid}
                    >
                        {isLoading ? "Creating..." : "Save Loan"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};
