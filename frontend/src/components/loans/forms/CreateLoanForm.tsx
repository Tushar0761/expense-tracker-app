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
import { zodResolver } from "@hookform/resolvers/zod";
import { Label } from "@radix-ui/react-label";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { loanSchema, type LoanFormValues } from "./schema";

interface CreateLoanDialogProps {
    borrowers: { id: string; name: string }[];
    onSubmit: (data: LoanFormValues) => Promise<void> | void;
}

export const CreateLoanFormDialog = ({
    borrowers,
    onSubmit,
}: CreateLoanDialogProps) => {
    const [open, setOpen] = useState(false);

    const form = useForm<LoanFormValues>({
        resolver: zodResolver(loanSchema),
        defaultValues: {
            borrowerId: "",
            status: "PENDING",
            notes: "",
            initialAmount: 0,
            interestRate: 0,
            totalAmount: 0,
        },
    });

    const handleSubmit = async (values: LoanFormValues) => {
        await onSubmit(values);
        setOpen(false);
        form.reset();
    };
    console.log("====================================");
    console.log({ error: form.formState.errors });
    console.log("====================================");
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
                        <Select
                            onValueChange={(val) =>
                                form.setValue("borrowerId", val)
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Borrower" />
                            </SelectTrigger>
                            <SelectContent>
                                {borrowers.map((b) => (
                                    <SelectItem key={b.id} value={b.id}>
                                        {b.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {form.formState.errors.borrowerId && (
                            <p className="text-red-500 text-xs">
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
                                    val as LoanFormValues["status"]
                                )
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="PENDING">Pending</SelectItem>
                                <SelectItem value="APPROVED">
                                    Approved
                                </SelectItem>
                                <SelectItem value="PAID">Paid</SelectItem>
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
                        <div>
                            <Label>Loan Date</Label>
                            <Input
                                type="date"
                                {...form.register("loanDate", {
                                    setValueAs: (v) =>
                                        v ? new Date(v) : undefined,
                                })}
                            />{" "}
                            {form.formState.errors.loanDate?.message && (
                                <p className="text-red-500 text-xs">
                                    {form.formState.errors.loanDate.message}
                                </p>
                            )}{" "}
                        </div>
                        <div>
                            <Label>Due Date</Label>
                            <Input
                                type="date"
                                {...form.register("dueDate", {
                                    setValueAs: (v) =>
                                        v ? new Date(v) : undefined,
                                })}
                            />{" "}
                            {form.formState.errors.dueDate?.message && (
                                <p className="text-red-500 text-xs">
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

                    <Button type="submit" className="w-full">
                        Save Loan
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};
