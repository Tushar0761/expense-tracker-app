import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchEmiPayments, type EmiPaymentRow } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const EmiPaymentsTable = () => {
    const {
        data: emiPayments,
        isLoading: emiLoading,
        error: emiError,
    } = useQuery<EmiPaymentRow[]>({
        queryKey: ["loans-payments"],
        queryFn: fetchEmiPayments,
    });
    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
            </CardHeader>
            <CardContent>
                {emiLoading && (
                    <div className="text-sm text-muted-foreground">
                        Loading payments data...
                    </div>
                )}
                {emiError && (
                    <div className="text-sm text-red-500">
                        Failed to load payments data
                    </div>
                )}
                {emiPayments && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="py-2 px-4">Date</th>
                                    <th className="py-2 px-4">Borrower</th>
                                    <th className="py-2 px-4">Amount</th>
                                    <th className="py-2 px-4">Method</th>
                                </tr>
                            </thead>
                            <tbody>
                                {emiPayments.map((payment) => (
                                    <tr
                                        key={payment.id}
                                        className="border-b last:border-0"
                                    >
                                        <td className="py-2 px-4 whitespace-nowrap">
                                            {payment.paymentDate}
                                        </td>
                                        <td className="py-2 px-4 whitespace-nowrap">
                                            {payment.borrowerName}
                                        </td>
                                        <td className="py-2 px-4 whitespace-nowrap font-bold text-green-600">
                                            ₹
                                            {payment.totalAmount.toLocaleString()}
                                        </td>
                                        <td className="py-2 px-4 whitespace-nowrap">
                                            <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                {payment.paymentMethod}
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

export default EmiPaymentsTable;
