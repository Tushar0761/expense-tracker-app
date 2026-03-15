import EmiPaymentsTable from "@/components/loans/EmiPaymentsTable";
import {
    CreateLoanFormDialog,
    RecordPaymentFormDialog,
} from "@/components/loans/forms";
import FuturePaymentsTable from "@/components/loans/FuturePaymentsTable";
import LoansSummaryCards from "@/components/loans/LoansSummaryCards";
import LoansTable from "@/components/loans/LoansTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    fetchBorrowersList,
    fetchLoansGraph,
    fetchLoansInsight,
    fetchLoansTable,
    type borrowersData,
    type LoanGraphPoint,
    type LoanTableRow,
} from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
    const queryClient = useQueryClient();
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

    const { data: borrowers } = useQuery<borrowersData[]>({
        queryKey: ["loans-borrowers"],
        queryFn: fetchBorrowersList,
    });
    console.log({ borrowers });

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

    // Prepare formatted borrowers list for the form
    const formattedBorrowers = useMemo(() => {
        return (
            borrowers?.map((b) => ({
                id: String(b.id),
                borrowerName: b.borrowerName,
            })) || []
        );
    }, [borrowers]);

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <h1 className="text-3xl font-bold">Loans Management</h1>
                <div className="flex gap-2">
                    <CreateLoanFormDialog
                        onSubmit={() => {}}
                        borrowers={formattedBorrowers}
                        onBorrowerAdded={() => {
                            queryClient.invalidateQueries({
                                queryKey: ["loans-borrowers"],
                            });
                        }}
                    />

                    <RecordPaymentFormDialog borrowers={formattedBorrowers} />
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
                                <BarChart
                                    data={graphData}
                                    margin={{
                                        top: 20,
                                        right: 30,
                                        left: 20,
                                        bottom: 5,
                                    }}
                                    barGap={8}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                        stroke="#f1f5f9"
                                    />
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: "#64748b", fontSize: 12 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: "#64748b", fontSize: 12 }}
                                        tickFormatter={(value) =>
                                            `₹${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`
                                        }
                                    />
                                    <Tooltip
                                        cursor={{ fill: "#f8fafc" }}
                                        formatter={(value: number) =>
                                            `₹${value.toLocaleString()}`
                                        }
                                        contentStyle={{
                                            borderRadius: "12px",
                                            border: "1px solid #e2e8f0",
                                            boxShadow:
                                                "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                                            padding: "12px",
                                        }}
                                    />
                                    <Legend
                                        verticalAlign="top"
                                        align="right"
                                        iconType="circle"
                                        wrapperStyle={{ paddingBottom: "20px" }}
                                    />

                                    <Bar
                                        dataKey="totalPlanned"
                                        fill="#ff8042"
                                        name="Total Planned"
                                        radius={[4, 4, 0, 0]}
                                        barSize={32}
                                    />
                                    <Bar
                                        dataKey="totalPaid"
                                        fill="#10b981"
                                        name="Total Paid"
                                        radius={[4, 4, 0, 0]}
                                        barSize={32}
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
                                        {pieData.map((_, index) => (
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
                <FuturePaymentsTable borrowers={formattedBorrowers} />
            </div>
        </div>
    );
}
