import { KpiCard } from '@/components/KPICard/KpiCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  fetchCategoryTotals,
  fetchDashboardKPIs,
  fetchExpenseSummary,
  type CategoryTotal,
  type DashboardKPIs,
  type ExpenseSummaryPoint,
} from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  CreditCard,
  Hash,
  TrendingDown,
  Building2,
  Wallet,
  PiggyBank,
  ArrowRightLeft,
  Tag,
} from 'lucide-react';
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const COLORS = [
  '#8b5cf6',
  '#06b6d4',
  '#f59e0b',
  '#ef4444',
  '#10b981',
  '#ec4899',
  '#6366f1',
  '#14b8a6',
  '#f97316',
  '#84cc16',
];

export function Dashboard() {
  // Fetch dashboard KPIs
  const { data: kpis } = useQuery<DashboardKPIs>({
    queryKey: ['dashboard-kpis'],
    queryFn: fetchDashboardKPIs,
  });

  // Fetch monthly expense summary (last 12 months)
  const { data: monthlySummary } = useQuery<ExpenseSummaryPoint[]>({
    queryKey: ['expenses-summary-monthly'],
    queryFn: () => fetchExpenseSummary({ granularity: 'month' }),
  });

  // Fetch category-wise totals
  const { data: categoryTotals } = useQuery<CategoryTotal[]>({
    queryKey: ['category-totals'],
    queryFn: () => fetchCategoryTotals(),
  });

  // Prepare bar chart data from monthly summary
  const barData = useMemo(() => {
    if (!monthlySummary) return [];
    return monthlySummary.slice(-12).map((s) => ({
      month: s.period,
      amount: s.totalAmount,
    }));
  }, [monthlySummary]);

  // Prepare pie chart data from category totals
  const pieData = useMemo(() => {
    if (!categoryTotals) return [];
    return categoryTotals.map((cat) => ({
      name: cat.name,
      value: cat.total,
      id: cat.id,
    }));
  }, [categoryTotals]);

  // Month-over-month change
  const monthChange = useMemo(() => {
    if (!kpis) return 0;
    if (kpis.lastMonth.total === 0) return 0;
    return (
      ((kpis.thisMonth.total - kpis.lastMonth.total) / kpis.lastMonth.total) *
      100
    );
  }, [kpis]);

  const totalBankBalance = useMemo(() => {
    if (!kpis?.accounts) return 0;
    return kpis.accounts.reduce(
      (sum, acc) =>
        acc.type === 'CREDIT' ? sum - acc.balance : sum + acc.balance,
      0,
    );
  }, [kpis?.accounts]);

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'CASH':
        return <Wallet className="h-4 w-4 text-emerald-500" />;
      case 'BANK':
        return <Building2 className="h-4 w-4 text-blue-500" />;
      case 'CREDIT':
        return <CreditCard className="h-4 w-4 text-rose-500" />;
      default:
        return <PiggyBank className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Financial Overview
          </h1>
          <p className="text-[13px] text-muted-foreground">
            Keep track of your spending and balances at a glance.
          </p>
        </div>
        <div className="bg-primary/5 border border-primary/10 rounded-xl px-4 py-2 flex gap-3 items-center">
          <div className="text-right">
            <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">
              Net Liquidity
            </p>
            <p
              className={`text-lg font-black ${totalBankBalance >= 0 ? 'text-primary' : 'text-rose-600'}`}
            >
              ₹{totalBankBalance.toLocaleString()}
            </p>
          </div>
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <PiggyBank className="h-4 w-4 text-primary" />
          </div>
        </div>
      </div>

      {/* Account Balances Row */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        {(kpis?.accounts ?? []).map((acc) => (
          <Card
            key={acc.id}
            className="overflow-hidden group hover:border-primary/40 transition-all bg-card/40"
          >
            <CardHeader className="p-3 pb-1.5 space-y-0 flex flex-row items-center justify-between">
              <span className="text-[9px] uppercase font-bold text-muted-foreground">
                {acc.type}
              </span>
              {getAccountIcon(acc.type)}
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <h3 className="text-xs font-semibold truncate mb-0.5">
                {acc.name}
              </h3>
              <p
                className={`text-base font-bold ${acc.type === 'CREDIT' ? 'text-rose-500' : 'text-emerald-500'}`}
              >
                ₹{acc.balance.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title="Spending This Month"
          value={`₹${(kpis?.thisMonth.total ?? 0).toLocaleString()}`}
          description={`${kpis?.thisMonth.count ?? 0} transactions`}
          Icon={<CreditCard size={16} className="text-rose-500" />}
          indicatorColor="red"
        />
        <KpiCard
          title="M-o-M Change"
          value={`${monthChange >= 0 ? '+' : ''}${monthChange.toFixed(1)}%`}
          description={
            monthChange > 0 ? 'Increased spending' : 'Decreased spending'
          }
          Icon={
            <TrendingDown
              size={16}
              className={monthChange > 0 ? 'text-rose-500' : 'text-emerald-500'}
            />
          }
          indicatorColor={monthChange > 0 ? 'red' : 'green'}
        />
        <KpiCard
          title="All-Time Expenses"
          value={`₹${(kpis?.overall.total ?? 0).toLocaleString()}`}
          description={`${kpis?.overall.count ?? 0} total entries`}
          Icon={<Hash size={16} className="text-blue-500" />}
          indicatorColor="neutral"
        />
        <KpiCard
          title="Top Budget Burner"
          value={categoryTotals?.[0]?.name ?? '-'}
          description={`₹${(categoryTotals?.[0]?.total ?? 0).toLocaleString()}`}
          Icon={<Tag size={16} className="text-amber-500" />}
          indicatorColor="neutral"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Expenses Bar Chart */}
        <Card className="lg:col-span-2 shadow-sm border-border/50 bg-card/30">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-primary" />
              Monthly Trends
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-4">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={barData}
                  margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                >
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    fontSize={10}
                    tick={{ fill: 'var(--muted-foreground)' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    fontSize={10}
                    tick={{ fill: 'var(--muted-foreground)' }}
                    tickFormatter={(v) =>
                      `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`
                    }
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [
                      `₹${value.toLocaleString()}`,
                      'Amount',
                    ]}
                  />
                  <Bar
                    dataKey="amount"
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-muted-foreground py-8 text-center">
                No data found.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Pie Chart */}
        <Card className="shadow-sm border-border/50 bg-card/30">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <Tag className="h-4 w-4 text-amber-500" />
              Category Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {pieData.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                    >
                      {pieData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        fontSize: '11px',
                      }}
                      formatter={(value: number) =>
                        `₹${value.toLocaleString()}`
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 w-full mt-2">
                  {pieData.slice(0, 4).map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1.5">
                      <div
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                      <span className="text-[10px] truncate leading-tight text-muted-foreground">
                        {entry.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground py-8 text-center">
                No category data.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="border border-border/50 shadow-sm overflow-hidden bg-card/20">
        <CardHeader className="py-3 px-4 bg-muted/20 border-b">
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-blue-500" />
            Recent Spending
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b bg-muted/10">
                  <th className="py-2 px-4 font-semibold">Date</th>
                  <th className="py-2 px-4 font-semibold">Categories</th>
                  <th className="py-2 px-4 font-semibold">Remarks</th>
                  <th className="py-2 px-4 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {(kpis?.recentTransactions ?? []).map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-2 px-4 text-muted-foreground tabular-nums">
                      {format(new Date(tx.date), 'dd MMM yy')}
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex gap-1 flex-wrap">
                        {tx.categories.map((c, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="text-[9px] py-0 px-1 h-3.5 font-normal"
                          >
                            {c}
                          </Badge>
                        ))}
                        {tx.categories.length === 0 && (
                          <span className="text-[10px] text-muted-foreground italic">
                            -
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-4 truncate max-w-[150px] text-xs">
                      {tx.remarks || '-'}
                    </td>
                    <td className="py-2 px-4 text-right font-bold text-rose-500 tabular-nums">
                      ₹{tx.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
