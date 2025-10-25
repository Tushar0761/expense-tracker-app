import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchFuturePayments, type FuturePaymentRow } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const FuturePaymentsTable = () => {
    const {
        data: futurePayments,
        isLoading: futureLoading,
        error: futureError,
    } = useQuery<FuturePaymentRow[]>({
        queryKey: ["loans-future-payments"],
        queryFn: fetchFuturePayments,
    });
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    Upcoming Payments
                </CardTitle>
            </CardHeader>
            <CardContent>
                {futureLoading && (
                    <div className="text-sm text-muted-foreground">
                        Loading future payments...
                    </div>
                )}
                {futureError && (
                    <div className="text-sm text-red-500">
                        Failed to load future payments
                    </div>
                )}
                {futurePayments && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="py-2 px-4">Planned Date</th>
                                    <th className="py-2 px-4">Borrower</th>
                                    <th className="py-2 px-4">Principal</th>
                                    <th className="py-2 px-4">Interest</th>
                                    <th className="py-2 px-4">Total</th>
                                    <th className="py-2 px-4">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {futurePayments.map((payment) => (
                                    <tr
                                        key={payment.id}
                                        className="border-b last:border-0"
                                    >
                                        <td className="py-2 px-4 whitespace-nowrap">
                                            {payment.plannedDate}{" "}
                                        </td>
                                        <td className="py-2 px-4 whitespace-nowrap">
                                            {payment.borrowerName}
                                        </td>
                                        <td className="py-2 px-4 whitespace-nowrap">
                                            ₹
                                            {payment.principalAmount.toLocaleString()}
                                        </td>
                                        <td className="py-2 px-4 whitespace-nowrap">
                                            ₹
                                            {payment.interestAmount.toLocaleString()}
                                        </td>
                                        <td className="py-2 px-4 whitespace-nowrap font-bold">
                                            ₹
                                            {payment.totalAmount.toLocaleString()}
                                        </td>
                                        <td className="py-2 px-4 whitespace-nowrap">
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    payment.status === "pending"
                                                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                                        : payment.status ===
                                                          "completed"
                                                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                                }`}
                                            >
                                                {payment.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default FuturePaymentsTable;
