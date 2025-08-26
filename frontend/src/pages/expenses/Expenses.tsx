import { AddExpenseForm } from "@/components/AddExpenseForm";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Filter, PieChartIcon, Plus } from "lucide-react";
import React, { useState } from "react"; // Added missing import for React

// Types
interface Transaction {
    date: string;
    description: string;
    amount: number;
    category: string;
}

// Placeholder data
const allTransactions: Transaction[] = [
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
    {
        date: "2024-06-06",
        description: "Bus Pass",
        amount: -300,
        category: "Transport",
    },
    {
        date: "2024-06-07",
        description: "Freelance",
        amount: 8000,
        category: "Income",
    },
    {
        date: "2024-06-08",
        description: "Restaurant",
        amount: -900,
        category: "Food",
    },
    {
        date: "2024-06-09",
        description: "Internet Bill",
        amount: -1200,
        category: "Bills",
    },
    {
        date: "2024-06-10",
        description: "Shopping",
        amount: -2500,
        category: "Shopping",
    },
    {
        date: "2024-06-11",
        description: "Coffee",
        amount: -200,
        category: "Food",
    },
    {
        date: "2024-06-12",
        description: "Book Sale",
        amount: 500,
        category: "Income",
    },
    {
        date: "2024-06-13",
        description: "Gym",
        amount: -700,
        category: "Health",
    },
    {
        date: "2024-06-14",
        description: "Taxi",
        amount: -350,
        category: "Transport",
    },
    {
        date: "2024-06-15",
        description: "Gift",
        amount: 1000,
        category: "Income",
    },
];

const categories = [
    "All",
    "Food",
    "Transport",
    "Investments",
    "Bills",
    "Health",
    "Shopping",
    "Income",
];

type KPIs = {
    totalIncome: number;
    totalExpense: number;
    netSavings: number;
    numTransactions: number;
    highestExpenseCategory: string;
};

function getKPIs(transactions: Transaction[]): KPIs {
    const totalIncome = transactions
        .filter((t) => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions
        .filter((t) => t.amount < 0)
        .reduce((sum, t) => sum + t.amount, 0);
    const netSavings = totalIncome + totalExpense;
    const numTransactions = transactions.length;
    const expenseCategories: Record<string, number> = transactions
        .filter((t) => t.amount < 0)
        .reduce((acc: Record<string, number>, t) => {
            acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
            return acc;
        }, {});
    const sortedCategories = Object.entries(expenseCategories).sort(
        (a, b) => b[1] - a[1]
    );
    const highestExpenseCategory =
        sortedCategories.length > 0 ? sortedCategories[0][0] : "-";
    return {
        totalIncome,
        totalExpense: Math.abs(totalExpense),
        netSavings,
        numTransactions,
        highestExpenseCategory,
    };
}

const ROWS_PER_PAGE = 5;
const lastMonthCategories = [
    { name: "Food", value: 1200 },
    { name: "Transport", value: 900 },
    { name: "Shopping", value: 700 },
];

export function Expenses() {
    const [category, setCategory] = useState("All");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    // Filter transactions
    const filtered = allTransactions.filter((t) => {
        const inCategory = category === "All" || t.category === category;
        const inStart = !startDate || t.date >= startDate;
        const inEnd = !endDate || t.date <= endDate;
        const inSearch = t.description
            .toLowerCase()
            .includes(search.toLowerCase());
        return inCategory && inStart && inEnd && inSearch;
    });
    const kpis = getKPIs(filtered);

    // Pagination logic
    const totalPages = Math.ceil(filtered.length / ROWS_PER_PAGE) || 1;
    const paginated = filtered.slice(
        (page - 1) * ROWS_PER_PAGE,
        page * ROWS_PER_PAGE
    );

    // Reset to page 1 if filters/search change
    React.useEffect(() => {
        setPage(1);
    }, [category, startDate, endDate, search]);

    const handleAddExpense = (data: any) => {
        console.log("New expense:", data);
        // Here you would typically send the data to your backend
        // For now, we'll just log it
        alert(`Expense added: ${data.description} - ₹${data.amount}`);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <h1 className="text-3xl font-bold">Expenses</h1>
                <div className="flex gap-2 flex-wrap items-center">
                    <Button
                        variant="outline"
                        className="flex items-center gap-2"
                    >
                        <Filter size={16} /> Filters
                    </Button>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="border rounded px-2 py-1 text-sm"
                        placeholder="Start date"
                    />
                    <span>-</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="border rounded px-2 py-1 text-sm"
                        placeholder="End date"
                    />
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="border rounded px-2 py-1 text-sm"
                    >
                        {categories.map((cat) => (
                            <option key={cat} value={cat}>
                                {cat}
                            </option>
                        ))}
                    </select>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="border rounded px-2 py-1 text-sm"
                        placeholder="Search description..."
                        style={{ minWidth: 180 }}
                    />
                    <Button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2"
                    >
                        <Plus size={16} /> Add Expense
                    </Button>
                </div>
            </div>

            <div className="flex gap-4 mb-6">
                <div className="flex-1 min-w-0">
                    <Card className="p-2 bg-card/80 border border-border shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-1 px-3 pt-3">
                            <CardTitle className="text-sm font-medium">
                                Highest Expense Category
                            </CardTitle>
                            <PieChartIcon className="text-purple-500 w-4 h-4" />
                        </CardHeader>
                        <CardContent className="px-3 pb-3 pt-1">
                            <p className="text-lg font-bold mb-1">
                                {lastMonthCategories[0].name}
                            </p>
                            <CardDescription className="text-xs mb-2">
                                ₹{lastMonthCategories[0].value} this month
                            </CardDescription>
                            <div className="text-xs text-muted-foreground">
                                <div className="font-semibold mb-1">
                                    Top Categories
                                </div>
                                <ul className="space-y-1">
                                    {lastMonthCategories.map((cat, i) => (
                                        <li
                                            key={cat.name}
                                            className="flex justify-between"
                                        >
                                            <span>
                                                {i + 1}. {cat.name}
                                            </span>
                                            <span className="font-bold text-red-500">
                                                ₹{cat.value}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="flex-2 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ">
                    <Card>
                        <CardHeader>
                            <CardTitle>Total Income</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-green-600">
                                ₹{kpis.totalIncome}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Total Expenses</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-red-500">
                                ₹{kpis.totalExpense}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Net Savings</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p
                                className={`text-2xl font-bold ${
                                    kpis.netSavings >= 0
                                        ? "text-green-600"
                                        : "text-red-500"
                                }`}
                            >
                                ₹{kpis.netSavings}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Transactions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">
                                {kpis.numTransactions}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
            {/* KPI Cards */}

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="py-2 px-4">Date</th>
                                    <th className="py-2 px-4">Description</th>
                                    <th className="py-2 px-4">Category</th>
                                    <th className="py-2 px-4">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map((tx, idx) => (
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
                                                    : "text-green-600"
                                            }`}
                                        >
                                            {tx.amount < 0 ? "-" : "+"}₹
                                            {Math.abs(tx.amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {paginated.length === 0 && (
                            <div className="text-center text-gray-500 py-8">
                                No transactions found for selected filters.
                            </div>
                        )}
                    </div>
                    {/* Pagination Controls */}
                    <div className="flex justify-between items-center mt-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            Page {page} of {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setPage((p) => Math.max(1, p - 1))
                                }
                                disabled={page === 1}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setPage((p) => Math.min(totalPages, p + 1))
                                }
                                disabled={page === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Add Expense Modal */}
            <AddExpenseForm
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onSubmit={handleAddExpense}
            />
        </div>
    );
}
