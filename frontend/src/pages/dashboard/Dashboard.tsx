import { DashboardInsights } from '@/components/dashboard/DashboardInsights';
import { DatePickerInput } from '@/components/DatePickerInput';
import { DrillDownPieChart } from '@/components/DrillDownPieChart';
import { KpiCard } from '@/components/KPICard/KpiCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MultiSelectCategories } from '@/components/ui/multi-select-categories';
import {
  fetchBudget,
  fetchCategoriesFlat,
  fetchCategoryTotals,
  fetchDashboardKPIs,
  fetchExpenseSummary,
  fetchExpenses,
  updateBudget,
  type Budget,
  type CategoryFlat,
  type CategoryTotal,
  type DashboardKPIs,
  type ExpenseListResponse,
  type ExpenseSummaryPoint,
  type SpendTypeFilter,
} from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import {
  AlertCircle,
  ArrowRightLeft,
  Calendar,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Hash,
  Lightbulb,
  Tag,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type DateFilterType = 'all' | 'month' | 'custom';
type GranularityType = 'day' | 'week' | 'month' | 'year';

export function Dashboard() {
  const today = new Date();

  // Date filter state
  const [filterType, setFilterType] = useState<DateFilterType>('all');

  // Spend type filter state
  const [spendTypeFilter, setSpendTypeFilter] = useState<SpendTypeFilter>('ALL');
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  // Excluded categories — ignored across the whole dashboard when set
  const [excludeCategoryIds, setExcludeCategoryIds] = useState<number[]>([]);

  const { data: allCategories = [] } = useQuery<CategoryFlat[]>({
    queryKey: ['categories-flat'],
    queryFn: fetchCategoriesFlat,
  });

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

  // Chart granularity state
  const [granularity, setGranularity] = useState<GranularityType>('week');

  // Chart data points limit - default values per granularity (4 on mobile, 12 on desktop)
  const [dataPointsLimit, setDataPointsLimit] = useState<string>(
    () => (window.innerWidth < 640 ? '4' : '12'),
  );

  // Comparison state
  const [showCompare, setShowCompare] = useState(false);
  const [compareFilterType, setCompareFilterType] =
    useState<DateFilterType>('month');
  const [compareSelectedMonth, setCompareSelectedMonth] = useState<string>(
    format(startOfMonth(today), 'yyyy-MM'),
  );
  const [compareStartDate, setCompareStartDate] = useState<string>(
    format(startOfMonth(today), 'yyyy-MM-dd'),
  );
  const [compareEndDate, setCompareEndDate] = useState<string>(
    format(today, 'yyyy-MM-dd'),
  );

  // Selected category from pie chart for filtering recent transactions
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [selectedCategoryName, setSelectedCategoryName] = useState<
    string | null
  >(null);

  // Get default limit based on granularity
  const getDefaultLimit = (g: GranularityType): number => {
    switch (g) {
      case 'day':
        return 30;
      case 'week':
        return 12;
      case 'month':
        return 12;
      case 'year':
        return 5;
      default:
        return 12;
    }
  };

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

  // Calculate comparison date range based on filter type
  const compareDateRange = useMemo(() => {
    switch (compareFilterType) {
      case 'all':
        return { startDate: undefined, endDate: undefined };
      case 'month': {
        let [year, month] = compareSelectedMonth.split('-').map(Number);
        
        
  const today = new Date();

  if (
    today.getDate() < 15 &&
    year === today.getFullYear() &&
    month === today.getMonth() + 1
  ) {
    const previousMonth = new Date(year, month - 2, 1);

    year = previousMonth.getFullYear();
    month = previousMonth.getMonth() + 1;
  }

        
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = endOfMonth(monthStart);
        return {
          startDate: format(monthStart, 'yyyy-MM-dd'),
          endDate: format(monthEnd, 'yyyy-MM-dd'),
        };
      }
      case 'custom':
        return {
          startDate: compareStartDate,
          endDate: compareEndDate,
        };
      default:
        return { startDate: undefined, endDate: undefined };
    }
  }, [
    compareFilterType,
    compareSelectedMonth,
    compareStartDate,
    compareEndDate,
  ]);

  // Fetch dashboard KPIs with date filter
  const { data: kpis } = useQuery<DashboardKPIs>({
    queryKey: [
      'dashboard-kpis',
      dateRange.startDate,
      dateRange.endDate,
      filterType,
      spendTypeFilter,
      excludeCategoryIds,
    ],
    queryFn: () =>
      fetchDashboardKPIs(
        dateRange.startDate,
        dateRange.endDate,
        filterType,
        spendTypeFilter,
        excludeCategoryIds,
      ),
  });

  // Fetch category-wise totals with date filter
  const { data: categoryTotals } = useQuery<CategoryTotal[]>({
    queryKey: [
      'category-totals',
      dateRange.startDate,
      dateRange.endDate,
      spendTypeFilter,
      excludeCategoryIds,
    ],
    queryFn: () =>
      fetchCategoryTotals({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        spendTypeFilter,
        excludeCategoryIds,
      }),
  });

  // Fetch expense summary based on granularity
  const { data: expenseSummary } = useQuery<ExpenseSummaryPoint[]>({
    queryKey: [
      'expenses-summary',
      granularity,
      dateRange.startDate,
      dateRange.endDate,
      spendTypeFilter,
      excludeCategoryIds,
    ],
    queryFn: () =>
      fetchExpenseSummary({
        granularity,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        spendTypeFilter,
        excludeCategoryIds,
      }),
  });

  // Fetch filtered expenses for recent transactions (sorted by amount desc)
  const { data: recentExpenses } = useQuery<ExpenseListResponse>({
    queryKey: [
      'recent-expenses',
      dateRange.startDate,
      dateRange.endDate,
      selectedCategoryId,
      spendTypeFilter,
      excludeCategoryIds,
    ],
    queryFn: () =>
      fetchExpenses({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        categoryId: selectedCategoryId ?? undefined,
        spendTypeFilter,
        excludeCategoryIds,
        limit: 10,
        sortBy: selectedCategoryId ? 'amount' : 'date',
        sortOrder: 'desc',
      }),
  });

  // Budget query + mutation
  const queryClient = useQueryClient();
  const { data: budget } = useQuery<Budget | null>({
    queryKey: ['budget'],
    queryFn: fetchBudget,
  });
  const budgetMutation = useMutation({
    mutationFn: (value: number) => updateBudget(value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget'] });
      setIsEditingBudget(false);
    },
  });

  const discretionarySpent = useMemo(() => {
    if (!kpis) return 0;
    return filterType === 'all' ? kpis.overall.total : kpis.thisMonth.total;
  }, [kpis, filterType]);

  // Prepare bar chart data from expense summary
  const barData = useMemo(() => {
    if (!expenseSummary) return [];

    // Parse limit - if empty or 0, show all (no slice)
    const limit = dataPointsLimit ? parseInt(dataPointsLimit, 10) : 0;
    const dataPoints = limit > 0 ? limit : expenseSummary.length;

    return expenseSummary.slice(-dataPoints).map((s) => ({
      period: s.period,
      amount: s.totalAmount,
    }));
  }, [expenseSummary, dataPointsLimit]);

  // Month-over-month change
  const monthChange = useMemo(() => {
    if (!kpis) return 0;
    if (kpis.lastMonth.total === 0) return 0;
    return (
      ((kpis.thisMonth.total - kpis.lastMonth.total) / kpis.lastMonth.total) *
      100
    );
  }, [kpis]);

  // Spending insights derived from category totals + summary
  const insights = useMemo(() => {
    if (!categoryTotals || categoryTotals.length === 0) return null;
    const total = categoryTotals.reduce((s, c) => s + c.total, 0);
    if (total === 0) return null;

    // Top 3 categories and their share
    const topCats = categoryTotals.slice(0, 3).map((c) => ({
      name: c.name,
      total: c.total,
      pct: Math.round((c.total / total) * 100),
    }));

    // Biggest single-day spike from summary
    let spikePeriod: string | null = null;
    let spikeAmount = 0;
    if (expenseSummary && expenseSummary.length > 1) {
      const avg = expenseSummary.reduce((s, p) => s + p.totalAmount, 0) / expenseSummary.length;
      for (const p of expenseSummary) {
        if (p.totalAmount > avg * 1.8 && p.totalAmount > spikeAmount) {
          spikeAmount = p.totalAmount;
          spikePeriod = p.period;
        }
      }
    }

    // Avg per transaction for current period
    const txCount = kpis ? (filterType === 'all' ? kpis.overall.count : kpis.thisMonth.count) : 0;
    const periodTotal = kpis ? (filterType === 'all' ? kpis.overall.total : kpis.thisMonth.total) : 0;
    const avgPerTx = txCount > 0 ? Math.round(periodTotal / txCount) : 0;

    // MoM direction
    const momUp = monthChange > 5;
    const momDown = monthChange < -5;

    return { topCats, spikePeriod, spikeAmount, avgPerTx, momUp, momDown, total, periodTotal, txCount };
  }, [categoryTotals, expenseSummary, kpis, monthChange, filterType]);

  return (
    <div className="space-y-4 animate-in fade-in duration-700 max-w-6xl mx-auto">
      {/* Header with Filter */}
      <div className="flex flex-col gap-3">
        <h1 className="text-xl font-bold tracking-tight md:text-2xl section-title">Financial Overview</h1>

        {/* Date Filter */}
        <div className="flex gap-5 [&>*]:border [&>*]:px-1">
          <div className="flex flex-wrap items-center gap-2 bg-muted/30 p-1 rounded-lg self-start">
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
                <DatePickerInput
                  type="month"
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                />
              </div>
            )}
            {filterType === 'custom' && (
              <div className="flex items-center gap-1 ml-2">
                <DatePickerInput
                  type="date"
                  value={customStartDate}
                  onChange={setCustomStartDate}
                />
                <span className="text-xs text-muted-foreground">to</span>
                <DatePickerInput
                  type="date"
                  value={customEndDate}
                  onChange={setCustomEndDate}
                />
              </div>
            )}
          </div>
          {/* Spend Type Filter */}
          <div className="flex flex-wrap items-center gap-2 bg-muted/30 p-1 rounded-lg self-start">
            <Button
              variant={spendTypeFilter === 'ALL' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSpendTypeFilter('ALL')}
              className="text-xs"
            >
              All
            </Button>
            <Button
              variant={spendTypeFilter === 'DISCRETIONARY' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSpendTypeFilter('DISCRETIONARY')}
              className="text-xs"
            >
              Discretionary
            </Button>
            <Button
              variant={spendTypeFilter === 'FIXED' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSpendTypeFilter('FIXED')}
              className="text-xs"
            >
              Fixed
            </Button>
          </div>
          {/* Exclude Categories */}
          <MultiSelectCategories
            value={excludeCategoryIds}
            onChange={setExcludeCategoryIds}
            options={allCategories}
            className="max-w-xs"
          />
        </div>
      </div>

      {/* KPI Cards Row - compact */}
      <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4 card-grid">
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

      {/* Discretionary Budget Burn-down */}
      {spendTypeFilter !== 'FIXED' && (
        <Card className="shadow-sm border-border/50 bg-card/30">
          <CardHeader className="px-4 py-2 pb-0">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Wallet className="h-4 w-4 text-emerald-500" />
              Discretionary Budget
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-3">
            {!budget?.discretionaryBudget && !isEditingBudget ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsEditingBudget(true);
                  setBudgetInput('');
                }}
              >
                Set a discretionary budget
              </Button>
            ) : isEditingBudget ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  autoFocus
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  placeholder="e.g. 25000"
                  className="border rounded h-8 px-2 text-sm bg-background w-32"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const val = Number(budgetInput);
                    if (val > 0) budgetMutation.mutate(val);
                  }}
                  disabled={budgetMutation.isPending || !budgetInput}
                >
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditingBudget(false)}>
                  Cancel
                </Button>
              </div>
            ) : budget ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <button
                    className="font-medium hover:underline"
                    onClick={() => {
                      setIsEditingBudget(true);
                      setBudgetInput(String(budget.discretionaryBudget));
                    }}
                  >
                    ₹{discretionarySpent.toLocaleString('en-IN')} of ₹
                    {budget.discretionaryBudget.toLocaleString('en-IN')}
                  </button>
                  <span className="text-muted-foreground">
                    {Math.max(
                      0,
                      budget.discretionaryBudget - discretionarySpent,
                    ).toLocaleString('en-IN')}{' '}
                    remaining
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      discretionarySpent > budget.discretionaryBudget
                        ? 'bg-rose-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (discretionarySpent / budget.discretionaryBudget) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Monthly Trends Chart - Full Width */}
      <Card className="shadow-sm border-border/50 bg-card/30">
        <CardHeader className="px-4 py-1 pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-1">
              <TrendingDown className="h-4 w-4 text-primary" />
              Trends
            </CardTitle>
            <div className="flex items-center gap-2">
              <select
                value={granularity}
                onChange={(e) => {
                  const newGranularity = e.target.value as GranularityType;
                  setGranularity(newGranularity);
                  // Set default limit when granularity changes
                  setDataPointsLimit(String(getDefaultLimit(newGranularity)));
                }}
                className="border rounded h-7 px-2 text-xs bg-background"
              >
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
              </select>
              <input
                type="number"
                min={1}
                value={dataPointsLimit}
                onChange={(e) => setDataPointsLimit(e.target.value)}
                placeholder="All"
                className="border rounded h-7 px-2 text-xs bg-background w-[70px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 py-0">
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart
                data={barData}
                margin={{ top: 30, right: 15, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="9 9" />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="period"
                  axisLine={false}
                  tickLine={false}
                  fontSize={10}
                  tick={{ fill: 'var(--muted-foreground)' }}
                  dy={5}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  fontSize={10}
                  tickFormatter={(v) =>
                    `₹${v >= 1000 ? `${(v / 1000).toLocaleString()}k` : v}`
                  }
                  dx={-5}
                  width={45}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(139, 92, 246, 0.08)' }}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value: number) => [
                    `${value.toLocaleString()} ₹`,
                    'Amount',
                  ]}
                  labelStyle={{ fontWeight: 600, marginBottom: '4px' }}
                />
                <Bar
                  dataKey="amount"
                  fill="url(#barGradient)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={barData.length > 10 ? 30 : 40}
                  minPointSize={5}
                >
                  <LabelList
                    dataKey="amount"
                    position="top"
                    fontSize={12}
                    // fill="var(--muted-foreground)"
                  />
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-xs text-muted-foreground py-8 text-center">
              No data found.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Spending Insights */}
      {insights && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {/* Top categories */}
          <Card className="shadow-sm border-border/50 bg-card/30 md:col-span-2">
            <CardHeader className="px-4 py-2 pb-0">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-amber-500" />
                Where your money goes
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-3 space-y-2">
              {insights.topCats.map((c) => (
                <div key={c.name} className="space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium truncate max-w-[60%]">{c.name}</span>
                    <span className="text-muted-foreground tabular-nums">
                      ₹{c.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      <span className="ml-1 text-[10px] font-bold text-amber-500">{c.pct}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all duration-500"
                      style={{ width: `${c.pct}%` }}
                    />
                  </div>
                </div>
              ))}
              {insights.topCats.length > 0 && (
                <p className="text-[11px] text-muted-foreground pt-1">
                  Top {insights.topCats.length} categories account for{' '}
                  <span className="font-semibold text-foreground">
                    {insights.topCats.reduce((s, c) => s + c.pct, 0)}%
                  </span>{' '}
                  of total spend.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quick stats + tip */}
          <div className="flex flex-col gap-3">
            {/* Avg per transaction */}
            <Card className="shadow-sm border-border/50 bg-card/30 flex-1">
              <CardContent className="px-4 py-3 space-y-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide flex items-center gap-1">
                  <Hash className="h-3 w-3" /> Avg per transaction
                </p>
                <p className="text-xl font-bold tabular-nums">
                  ₹{insights.avgPerTx.toLocaleString('en-IN')}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  across {insights.txCount} transactions
                </p>
              </CardContent>
            </Card>

            {/* MoM insight / spike */}
            <Card className={`shadow-sm border-border/50 flex-1 ${
              insights.momUp ? 'bg-rose-50/40 dark:bg-rose-900/10' :
              insights.momDown ? 'bg-emerald-50/40 dark:bg-emerald-900/10' :
              'bg-card/30'
            }`}>
              <CardContent className="px-4 py-3 space-y-1">
                {insights.spikePeriod ? (
                  <>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 text-rose-500" /> Spike detected
                    </p>
                    <p className="text-sm font-semibold">{insights.spikePeriod}</p>
                    <p className="text-[11px] text-muted-foreground">
                      ₹{insights.spikeAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })} — well above average
                    </p>
                  </>
                ) : insights.momUp ? (
                  <>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-rose-500" /> Spending up
                    </p>
                    <p className="text-xl font-bold text-rose-500">+{monthChange.toFixed(1)}%</p>
                    <p className="text-[11px] text-muted-foreground">vs previous period — review top categories</p>
                  </>
                ) : insights.momDown ? (
                  <>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide flex items-center gap-1">
                      <TrendingDown className="h-3 w-3 text-emerald-500" /> Spending down
                    </p>
                    <p className="text-xl font-bold text-emerald-500">{monthChange.toFixed(1)}%</p>
                    <p className="text-[11px] text-muted-foreground">vs previous period — great progress!</p>
                  </>
                ) : (
                  <>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide flex items-center gap-1">
                      <Lightbulb className="h-3 w-3 text-blue-500" /> Tip
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Use <strong>Refine</strong> to unify merchant name variants (e.g. "Zepto", "ZEPTO") so category reports are accurate.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Category Pie Chart - Full Width */}
      <Card
        className={`shadow-sm border-border/50 bg-card/30 ${showCompare ? 'w-50%' : ''} `}
      >
        <CardHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Tag className="h-4 w-4 text-amber-500" />
              Category Distribution
            </CardTitle>
            <Button
              variant={showCompare ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowCompare(!showCompare)}
              className="text-xs gap-1"
            >
              {showCompare ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
              Compare
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <DrillDownPieChart
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            className="mt-2"
            spendTypeFilter={spendTypeFilter}
            excludeCategoryIds={excludeCategoryIds}
            onCategoryChange={(categoryId, categoryName) => {
              setSelectedCategoryId(categoryId);
              setSelectedCategoryName(categoryName);
            }}
          />
        </CardContent>
      </Card>

      {/* Comparison Pie Chart */}
      {showCompare && (
        <Card className="shadow-sm border-border/50 bg-card/30">
          <CardHeader className="p-4 pb-0">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Tag className="h-4 w-4 text-blue-500" />
                Compare: Category Distribution
              </CardTitle>
              <div className="flex items-center gap-2">
                <select
                  value={compareFilterType}
                  onChange={(e) =>
                    setCompareFilterType(e.target.value as DateFilterType)
                  }
                  className="border rounded h-7 px-2 text-xs bg-background"
                >
                  <option value="month">Month</option>
                  <option value="all">All Time</option>
                  <option value="custom">Custom</option>
                </select>
                {compareFilterType === 'month' && (
                  <DatePickerInput
                    type="month"
                    value={compareSelectedMonth}
                    onChange={setCompareSelectedMonth}
                  />
                )}
                {compareFilterType === 'custom' && (
                  <div className="flex items-center gap-1">
                    <DatePickerInput
                      type="date"
                      value={compareStartDate}
                      onChange={setCompareStartDate}
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <DatePickerInput
                      type="date"
                      value={compareEndDate}
                      onChange={setCompareEndDate}
                    />
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <DrillDownPieChart
              startDate={compareDateRange.startDate}
              endDate={compareDateRange.endDate}
              className="mt-2"
              spendTypeFilter={spendTypeFilter}
              excludeCategoryIds={excludeCategoryIds}
            />
          </CardContent>
        </Card>
      )}

      {/* Deep Insights — derived analytics, charts & savings tips */}
      <DashboardInsights
        startDate={dateRange.startDate}
        endDate={dateRange.endDate}
        filterType={filterType}
        spendTypeFilter={spendTypeFilter}
        excludeCategoryIds={excludeCategoryIds}
      />

      {/* Recent Transactions */}
      <Card className="border border-border/50 shadow-sm overflow-hidden bg-card/20">
        <CardHeader className="py-3 px-4 bg-muted/20 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-blue-500" />
              Recent Spending
            </CardTitle>
            {(selectedCategoryName || selectedCategoryId) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground"
                onClick={() => {
                  setSelectedCategoryId(null);
                  setSelectedCategoryName(null);
                }}
              >
                Clear filter: {selectedCategoryName}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[300px]">
              <thead>
                <tr className="border-b bg-muted/10">
                  <th className="py-2 px-3 text-xs font-semibold">Date</th>
                  {/* Mobile: Remarks + Username | Desktop: Category */}
                  <th className="py-2 px-3 text-xs font-semibold sm:hidden">Remarks / Sent To</th>
                  <th className="py-2 px-3 text-xs font-semibold hidden sm:table-cell">Category</th>
                  <th className="py-2 px-3 text-xs font-semibold hidden sm:table-cell">Remarks</th>
                  <th className="py-2 px-3 text-xs font-semibold hidden sm:table-cell">Sent To</th>
                  <th className="py-2 px-3 text-xs font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {(recentExpenses?.data ?? []).map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-3 text-muted-foreground tabular-nums text-xs whitespace-nowrap">
                      {format(new Date(tx.date), 'dd MMM yy')}
                    </td>
                    {/* Mobile: stacked remarks + username */}
                    <td className="py-2 px-3 sm:hidden max-w-[160px]">
                      <div className="text-xs font-medium truncate">{tx.remarks || '—'}</div>
                      {tx.userName && (
                        <div className="text-[10px] text-muted-foreground truncate">{tx.userName}</div>
                      )}
                    </td>
                    {/* Desktop: category badge */}
                    <td className="py-2 px-3 hidden sm:table-cell">
                      <Badge
                        variant="secondary"
                        className={`text-[9px] py-0 px-1 h-3.5 font-normal ${tx.categoryName === 'Unknown' ? 'bg-red-500 text-white hover:bg-red-500' : ''}`}
                      >
                        {tx.categoryName}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 truncate max-w-[120px] text-xs text-muted-foreground hidden sm:table-cell">
                      {tx.remarks || '—'}
                    </td>
                    <td className="py-2 px-3 truncate max-w-[100px] text-xs text-muted-foreground hidden sm:table-cell">
                      {tx.userName || '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-rose-500 tabular-nums text-sm whitespace-nowrap">
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
