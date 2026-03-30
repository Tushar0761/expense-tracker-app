import { DrillDownPieChart } from '@/components/DrillDownPieChart';
import { KpiCard } from '@/components/KPICard/KpiCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  fetchCategoryTotals,
  fetchDashboardKPIs,
  fetchExpenseSummary,
  type CategoryTotal,
  type DashboardKPIs,
  type ExpenseSummaryPoint,
} from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import {
  ArrowRightLeft,
  Calendar,
  CreditCard,
  Hash,
  Tag,
  TrendingDown,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type DateFilterType = 'all' | 'month' | 'custom';

export function Dashboard() {
  const today = new Date();

  // Date filter state
  const [filterType, setFilterType] = useState<DateFilterType>('month');

  // Month picker state - default to current month
  const [selectedMonth, setSelectedMonth] = useState<string>(
    format(today, 'yyyy-MM'),
  );

  const [customStartDate, setCustomStartDate] = useState<string>(
    format(startOfMonth(today), 'yyyy-MM-dd'),
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    format(today, 'yyyy-MM-dd'),
  );

  // Calculate date range based on filter type
  const dateRange = useMemo(() => {
    switch (filterType) {
      case 'all':
        return { startDate: undefined, endDate: undefined };
      case 'month': {
        // Use selected month to calculate start and end dates
        const [year, month] = selectedMonth.split('-').map(Number);
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = endOfMonth(monthStart);
        return {
          startDate: format(monthStart, 'yyyy-MM-dd'),
          endDate: format(monthEnd, 'yyyy-MM-dd'),
        };
      }
      case 'custom':
        return {
          startDate: customStartDate,
          endDate: customEndDate,
        };
      default:
        return { startDate: undefined, endDate: undefined };
    }
  }, [filterType, selectedMonth, customStartDate, customEndDate]);

  // Fetch dashboard KPIs with date filter
  const { data: kpis } = useQuery<DashboardKPIs>({
    queryKey: [
      'dashboard-kpis',
      dateRange.startDate,
      dateRange.endDate,
      filterType,
    ],
    queryFn: () =>
      fetchDashboardKPIs(dateRange.startDate, dateRange.endDate, filterType),
  });

  // Fetch category-wise totals with date filter
  const { data: categoryTotals } = useQuery<CategoryTotal[]>({
    queryKey: ['category-totals', dateRange.startDate, dateRange.endDate],
    queryFn: () =>
      fetchCategoryTotals({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      }),
  });

  // Fetch monthly expense summary (last 12 months) - always from start for chart
  const { data: monthlySummary } = useQuery<ExpenseSummaryPoint[]>({
    queryKey: [
      'expenses-summary-monthly',
      dateRange.startDate,
      dateRange.endDate,
    ],
    queryFn: () =>
      fetchExpenseSummary({
        granularity: 'month',
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      }),
  });

  // Prepare bar chart data from monthly summary
  const barData = useMemo(() => {
    if (!monthlySummary) return [];
    return monthlySummary.slice(-12).map((s) => ({
      month: s.period,
      amount: s.totalAmount,
    }));
  }, [monthlySummary]);

  // Month-over-month change
  const monthChange = useMemo(() => {
    if (!kpis) return 0;
    if (kpis.lastMonth.total === 0) return 0;
    return (
      ((kpis.thisMonth.total - kpis.lastMonth.total) / kpis.lastMonth.total) *
      100
    );
  }, [kpis]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700 max-w-6xl mx-auto">
      {/* Header with Filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Financial Overview
          </h1>
          <p className="text-[13px] text-muted-foreground">
            Keep track of your spending and balances at a glance.
          </p>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg">
          <Button
            variant={filterType === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilterType('all')}
            className="text-xs"
          >
            All Time
          </Button>
          <Button
            variant={filterType === 'month' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilterType('month')}
            className="text-xs gap-1"
          >
            <Calendar size={12} />
            Month
          </Button>
          <Button
            variant={filterType === 'custom' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilterType('custom')}
            className="text-xs"
          >
            Custom
          </Button>

          {/* Month Picker */}
          {filterType === 'month' && (
            <div className="flex items-center gap-1 ml-2">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border rounded h-7 px-2 text-xs bg-background"
              />
            </div>
          )}

          {filterType === 'custom' && (
            <div className="flex items-center gap-1 ml-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="border rounded h-7 px-2 text-xs bg-background"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="border rounded h-7 px-2 text-xs bg-background"
              />
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Row - compact */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title={
            filterType === 'all'
              ? 'Total Expenses'
              : filterType === 'month'
                ? format(new Date(selectedMonth + '-01'), 'MMMM yyyy')
                : 'This Period'
          }
          value={`₹${((filterType === 'all' ? kpis?.overall.total : kpis?.thisMonth.total) ?? 0).toLocaleString()}`}
          description={`${(filterType === 'all' ? kpis?.overall.count : kpis?.thisMonth.count) ?? 0} transactions`}
          Icon={<CreditCard size={16} className="text-rose-500" />}
          indicatorColor="red"
        />
        <KpiCard
          title="Change"
          value={`${monthChange >= 0 ? '+' : ''}${monthChange.toFixed(1)}%`}
          description={
            monthChange > 0
              ? 'Increased'
              : monthChange < 0
                ? 'Decreased'
                : 'No change'
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
          title="Comparison"
          value={`₹${(kpis?.lastMonth.total ?? 0).toLocaleString()}`}
          description={
            filterType === 'all'
              ? 'Last period'
              : filterType === 'month'
                ? `vs ${format(new Date(new Date(selectedMonth + '-01').getTime() - 86400000), 'MMM yyyy')}`
                : 'vs Previous period'
          }
          Icon={<Hash size={16} className="text-blue-500" />}
          indicatorColor="neutral"
        />
        <KpiCard
          title="Top Category"
          value={categoryTotals?.[0]?.name ?? '-'}
          description={`₹${(categoryTotals?.[0]?.total ?? 0).toLocaleString()}`}
          Icon={<Tag size={16} className="text-amber-500" />}
          indicatorColor="neutral"
        />
      </div>

      {/* Monthly Trends Chart - Full Width */}
      <Card className="shadow-sm border-border/50 bg-card/30">
        <CardHeader className="p-4 pb-0">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-primary" />
            Monthly Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-4">
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
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

      {/* Category Pie Chart - Full Width */}
      <Card className="shadow-sm border-border/50 bg-card/30">
        <CardHeader className="p-4 pb-0">
          <CardTitle className="text-sm flex items-center gap-2">
            <Tag className="h-4 w-4 text-amber-500" />
            Category Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <DrillDownPieChart
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            className="mt-2"
          />
        </CardContent>
      </Card>

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
