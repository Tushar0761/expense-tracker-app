import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addMonths, format, parseISO } from "date-fns";
import React, { useState } from "react";
import {
    Bar,
    BarChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { loansData } from "../dashboard/Dashboard";

// Re-use types and mock data

export default function LoansPage() {
    const [showAdd, setShowAdd] = useState(false);
    // In real logic, would have separated paidEmis/transaction history—here just mock

    // KPIs - similar as Dashboard, but could expand further

    // EMI Graph
    const next6Months = Array.from({ length: 6 }, (_, i) =>
        format(addMonths(new Date(), i), "MMM yyyy")
    );
    const emiGraphData = next6Months.map((month) => {
        const totalDue = loansData
            .filter((ld) => {
                if (ld.status === "paid") return false;
                const due = format(parseISO(ld.dueDate), "MMM yyyy");
                return due === month;
            })
            .reduce(
                (sum, l) => sum + (l.emiAmount ? l.emiAmount : l.pendingAmount),
                0
            );
        return { month, amount: totalDue };
    });

    // Render detailed row expansion (mocked)
    const [expandedId, setExpandedId] = useState<number | null>(null);

    return (
        <div className="pb-10">
            <div className="flex items-center justify-end mb-6">
                <button
                    onClick={() => setShowAdd(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded shadow font-semibold hover:bg-blue-600"
                >
                    + Add Loan
                </button>
            </div>
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>
                        Upcoming EMI/Loan Dues (Next 6 Months)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={emiGraphData}>
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Bar
                                dataKey="amount"
                                fill="#f59e42"
                                radius={[3, 3, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>All Loans, EMIs and Udhar</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="py-2 px-4">Type</th>
                                    <th className="py-2 px-4">
                                        Lender/Borrower
                                    </th>
                                    <th className="py-2 px-4">Principal</th>
                                    <th className="py-2 px-4">EMI</th>
                                    <th className="py-2 px-4">Pending</th>
                                    <th className="py-2 px-4">Due Date</th>
                                    <th className="py-2 px-4">Status</th>
                                    <th className="py-2 px-4">Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loansData.map((row) => (
                                    <React.Fragment key={row.id}>
                                        <tr className="border-b last:border-0">
                                            <td className="py-2 px-4 whitespace-nowrap">
                                                {row.type}
                                            </td>
                                            <td className="py-2 px-4 whitespace-nowrap">
                                                {row.lender}
                                            </td>
                                            <td className="py-2 px-4 whitespace-nowrap">
                                                ₹
                                                {row.principal.toLocaleString()}
                                            </td>
                                            <td className="py-2 px-4 whitespace-nowrap">
                                                {row.emiAmount
                                                    ? `₹${row.emiAmount}`
                                                    : "-"}
                                            </td>
                                            <td className="py-2 px-4 whitespace-nowrap">
                                                ₹
                                                {row.pendingAmount.toLocaleString()}
                                            </td>
                                            <td className="py-2 px-4 whitespace-nowrap">
                                                {row.dueDate}
                                            </td>
                                            <td
                                                className={
                                                    "py-2 px-4 whitespace-nowrap font-bold " +
                                                    (row.status === "pending"
                                                        ? "text-yellow-600"
                                                        : row.status === "paid"
                                                        ? "text-green-600"
                                                        : "text-red-500")
                                                }
                                            >
                                                {row.status
                                                    .charAt(0)
                                                    .toUpperCase() +
                                                    row.status.slice(1)}
                                            </td>
                                            <td className="py-2 px-4 whitespace-nowrap">
                                                <button
                                                    className="underline text-blue-600 hover:text-blue-800"
                                                    onClick={() =>
                                                        setExpandedId(
                                                            expandedId ===
                                                                row.id
                                                                ? null
                                                                : row.id
                                                        )
                                                    }
                                                >
                                                    {expandedId === row.id
                                                        ? "Hide"
                                                        : "Show"}
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedId === row.id && (
                                            <tr className="bg-gray-50">
                                                <td
                                                    colSpan={8}
                                                    className="px-6 py-3"
                                                >
                                                    <div>
                                                        <div className="font-semibold mb-1">
                                                            Loan Details
                                                        </div>
                                                        <div>
                                                            Description:{" "}
                                                            {row.notes ||
                                                                "No notes"}
                                                        </div>
                                                        <div>
                                                            Status: {row.status}
                                                        </div>
                                                        <div>
                                                            Next Due Date:{" "}
                                                            {row.dueDate}
                                                        </div>
                                                        <div>
                                                            Borrower/Lender:{" "}
                                                            {row.lender}
                                                        </div>
                                                        <div>
                                                            Principal: ₹
                                                            {row.principal.toLocaleString()}
                                                        </div>
                                                        <div>
                                                            EMI Amount:{" "}
                                                            {row.emiAmount
                                                                ? `₹${row.emiAmount}`
                                                                : "-"}
                                                        </div>
                                                        <div>
                                                            Pending Amount: ₹
                                                            {row.pendingAmount.toLocaleString()}
                                                        </div>
                                                        {/* Paid EMI/Payment history could go here (mock) */}
                                                        {/* ... */}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
            {/* Add Loan Modal (placeholder, functional composition not included for brevity) */}
            {showAdd && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded shadow w-full max-w-xl">
                        <h2 className="text-lg font-bold mb-2">
                            Add Loan / EMI / Udhar
                        </h2>
                        {/* Add form fields here for: type, lender, principal, emiAmount, dueDate, status, notes */}
                        <button
                            className="mt-4 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                            onClick={() => setShowAdd(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
