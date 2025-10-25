import EmiPaymentsTable from "@/components/loans/EmiPaymentsTable";
import { CreateLoanFormDialog } from "@/components/loans/forms";
import FuturePaymentsTable from "@/components/loans/FuturePaymentsTable";
import LoansSummaryCards from "@/components/loans/LoansSummaryCards";
import LoansTable from "@/components/loans/LoansTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    fetchLoansGraph,
    fetchLoansInsight,
    fetchLoansTable,
    type LoanGraphPoint,
    type LoanTableRow,
} from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { CreditCard } from "lucide-react";
import { useMemo } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
const COLORS = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff8042",
    "#00C49F",
    "#FFBB28",
];

export function LoansPage() {
    const { data: loansInsight } = useQuery({
        queryKey: ["loans-insight-data"],
        queryFn: fetchLoansInsight,
    });

    const {
        data: tableData,
        isLoading: tableLoading,
        error: tableError,
    } = useQuery<LoanTableRow[]>({
        queryKey: ["loans-table"],
        queryFn: fetchLoansTable,
    });
    // Calculate summary stats
    const {
        data: graphData,
        isLoading: graphLoading,
        error: graphError,
    } = useQuery<LoanGraphPoint[]>({
        queryKey: ["loans-graph"],
        queryFn: fetchLoansGraph,
    });

    // Prepare pie chart data
    const pieData = useMemo(() => {
        if (!tableData) {
            return [];
        }
        const result: {
            name: string;
            value: string | number;
        }[] = [];

        tableData.forEach(({ borrowerName, totalAmount }) => {
            result.push({
                name: borrowerName,
                value: totalAmount,
            });
        });

        return result;
    }, [tableData]);

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <h1 className="text-3xl font-bold">Loans Management</h1>
                <div className="flex gap-2">
                    <CreateLoanFormDialog
                        onSubmit={() => {}}
                        borrowers={[{ id: "asd", name: "Tusahar" }]}
                    />

                    <Button
                        variant="outline"
                        className="flex items-center gap-2"
                    >
                        <CreditCard size={16} /> Record Payment
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}

            <LoansSummaryCards loansInsight={loansInsight} />

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Bar Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Loans Over Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {graphLoading && (
                            <div className="text-sm text-muted-foreground">
                                Loading chart data...
                            </div>
                        )}
                        {graphError && (
                            <div className="text-sm text-red-500">
                                Failed to load chart data
                            </div>
                        )}
                        {graphData && (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={graphData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar
                                        dataKey="principalPaid"
                                        stackId="paid"
                                        fill="#34d399"
                                        name="Principal Paid"
                                    />
                                    <Bar
                                        dataKey="interestPaid"
                                        stackId="paid"
                                        fill="#60a5fa"
                                        name="Interest Paid"
                                    />
                                    <Bar
                                        dataKey="principalPending"
                                        stackId="pending"
                                        fill="#fbbf24"
                                        name="Principal Pending"
                                    />
                                    <Bar
                                        dataKey="interestPending"
                                        stackId="pending"
                                        fill="#f87171"
                                        name="Interest Pending"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Pie Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Loan Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {graphLoading && (
                            <div className="text-sm text-muted-foreground">
                                Loading chart data...
                            </div>
                        )}
                        {graphError && (
                            <div className="text-sm text-red-500">
                                Failed to load chart data
                            </div>
                        )}
                        {graphData && (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        dataKey="value"
                                        nameKey="name"
                                        outerRadius={90}
                                        label={({ name, percent }) =>
                                            `${name} ${(
                                                (percent ?? 0) * 100
                                            ).toFixed(0)}%`
                                        }
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={
                                                    COLORS[
                                                        index % COLORS.length
                                                    ]
                                                }
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            <LoansTable LoansData={{ tableData, tableError, tableLoading }} />
            <div className="grid grid-cols-1 lg:grid-cols-2  gap-8 mb-8">
                <EmiPaymentsTable />
                <FuturePaymentsTable />
            </div>
        </div>
    );
}
