import { KpiCard } from "@/components/KPICard/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, DollarSign, TrendingDown } from "lucide-react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

// Fake data for now
const monthlyExpenses = [
    { month: "Jan", amount: 1200 },
    { month: "Feb", amount: 950 },
    { month: "Mar", amount: 1300 },
    { month: "Apr", amount: 1100 },
    { month: "May", amount: 1400 },
    { month: "Jun", amount: 1000 },
];

const categoryData = [
    { name: "Food", value: 400 },
    { name: "Transport", value: 300 },
    { name: "Investments", value: 500 },
    { name: "Bills", value: 200 },
    { name: "Shopping", value: 350 },
    { name: "Health", value: 150 },
];
const COLORS = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff8042",
    "#00C49F",
    "#FFBB28",
];

const netWorthData = [
    { month: "Jan", netWorth: 800000 },
    { month: "Feb", netWorth: 815000 },
    { month: "Mar", netWorth: 830000 },
    { month: "Apr", netWorth: 845000 },
    { month: "May", netWorth: 860000 },
    { month: "Jun", netWorth: 875000 },
];

const savingsRateData = [
    { month: "Jan", rate: 28 },
    { month: "Feb", rate: 30 },
    { month: "Mar", rate: 32 },
    { month: "Apr", rate: 29 },
    { month: "May", rate: 31 },
    { month: "Jun", rate: 33 },
];

const assetAllocation = [
    { name: "Stocks", value: 400000 },
    { name: "Bonds", value: 200000 },
    { name: "Cash", value: 100000 },
    { name: "Real Estate", value: 150000 },
];

const recentTransactions = [
    {
        date: "2024-06-01",
        description: "Groceries",
        amount: -1200,
        category: "Food",
    },
    {
        date: "2024-06-02",
        description: "Salary",
        amount: 50000,
        category: "Income",
    },
    {
        date: "2024-06-03",
        description: "Electricity Bill",
        amount: -1500,
        category: "Bills",
    },
    {
        date: "2024-06-04",
        description: "Stocks Dividend",
        amount: 2000,
        category: "Investments",
    },
    {
        date: "2024-06-05",
        description: "Pharmacy",
        amount: -400,
        category: "Health",
    },
];

// Helper to get last 3 categories with spend in last month (assume last month is 'May')
const lastMonthCategories = [
    { name: "Food", value: 1200 },
    { name: "Transport", value: 900 },
    { name: "Shopping", value: 700 },
];

export function Dashboard() {
    return (
        <div className="space-y-10">
            {/* KPI Cards - smaller and more aesthetic */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
                {[
                    {
                        title: "Income This Month",
                        value: "₹50,000",
                        description: "+₹2,000 vs last month",
                        Icon: (
                            <DollarSign size={16} className="text-green-500" />
                        ),
                        indicatorColor: "green" as const,
                    },
                    {
                        title: "Expense This Month",
                        value: "₹18,000",
                        description:
                            "36% of income spent, 64% saved (33,000 left)",
                        Icon: <CreditCard size={16} className="text-red-500" />,
                        indicatorColor: "red" as const,
                    },
                    {
                        title: "Emergency Fund",
                        value: "₹1,20,000",
                        description: "6 months of expenses",
                        Icon: (
                            <TrendingDown
                                size={16}
                                className="text-orange-500"
                            />
                        ),
                        indicatorColor: "neutral" as const,
                    },
                ].map((kpi) => (
                    <KpiCard
                        key={kpi.title}
                        title={kpi.title}
                        value={kpi.value}
                        description={kpi.description}
                        Icon={kpi.Icon}
                        indicatorColor={kpi.indicatorColor}
                    />
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Bar Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Monthly Expenses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={monthlyExpenses}>
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Bar
                                    dataKey="amount"
                                    fill="#8884d8"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                {/* Pie Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Expense Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    dataKey="value"
                                    nameKey="name"
                                    outerRadius={90}
                                    label={({ value, name }) =>
                                        `${value} (${name})`
                                    }
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                {/* Line Chart */}

                {/* Area Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Savings Rate Over Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={savingsRateData}>
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Area
                                    type="monotone"
                                    dataKey="rate"
                                    stroke="#facc15"
                                    fill="#fde68a"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                {/* Donut Chart */}
            </div>

            {/* Recent Transactions Table + Top Categories Table */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Transactions Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="py-2 px-4">Date</th>
                                        <th className="py-2 px-4">
                                            Description
                                        </th>
                                        <th className="py-2 px-4">Category</th>
                                        <th className="py-2 px-4">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentTransactions.map((tx, idx) => (
                                        <tr
                                            key={idx}
                                            className="border-b last:border-0"
                                        >
                                            <td className="py-2 px-4 whitespace-nowrap">
                                                {tx.date}
                                            </td>
                                            <td className="py-2 px-4 whitespace-nowrap">
                                                {tx.description}
                                            </td>
                                            <td className="py-2 px-4 whitespace-nowrap">
                                                {tx.category}
                                            </td>
                                            <td
                                                className={`py-2 px-4 whitespace-nowrap font-bold ${
                                                    tx.amount < 0
                                                        ? "text-red-500"
                                                        : "text-green-500"
                                                }`}
                                            >
                                                {tx.amount < 0 ? "-" : "+"}₹
                                                {Math.abs(tx.amount)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
                {/* Top Categories Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top Categories (Last Month)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="py-2 px-4">#</th>
                                        <th className="py-2 px-4">Category</th>
                                        <th className="py-2 px-4">
                                            Total Spend
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lastMonthCategories.map((cat, i) => (
                                        <tr
                                            key={cat.name}
                                            className="border-b last:border-0"
                                        >
                                            <td className="py-2 px-4 whitespace-nowrap">
                                                {i + 1}
                                            </td>
                                            <td className="py-2 px-4 whitespace-nowrap">
                                                {cat.name}
                                            </td>
                                            <td className="py-2 px-4 whitespace-nowrap font-bold text-red-500">
                                                ₹{cat.value}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
