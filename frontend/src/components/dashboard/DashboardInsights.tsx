import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  fetchExpenses,
  type ExpenseListResponse,
  type ExpenseRow,
} from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import {
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  getDay,
  parseISO,
} from 'date-fns';
import {
  Award,
  CalendarDays,
  Coffee,
  Flame,
  Gauge,
  Layers,
  Lightbulb,
  PiggyBank,
  Repeat,
  Sparkles,
  Sun,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface DashboardInsightsProps {
  startDate?: string;
  endDate?: string;
  /** "all" | "month" | "custom" — used purely for labelling. */
  filterType: 'all' | 'month' | 'custom';
}

const inr = (v: number) =>
  `₹${Math.round(v).toLocaleString('en-IN')}`;
const inrCompact = (v: number) =>
  v >= 100000
    ? `₹${(v / 100000).toFixed(1)}L`
    : v >= 1000
      ? `₹${(v / 1000).toFixed(1)}k`
      : `₹${Math.round(v)}`;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Keywords that hint a discretionary / trimmable category for savings tips. */
const TRIMMABLE = [
  'food',
  'dining',
  'restaurant',
  'delivery',
  'swiggy',
  'zomato',
  'eat',
  'snack',
  'coffee',
  'cafe',
  'entertainment',
  'movie',
  'shopping',
  'subscription',
  'ott',
  'gaming',
  'alcohol',
  'party',
  'cab',
  'uber',
  'ola',
];

function isTrimmable(name: string) {
  const n = name.toLowerCase();
  return TRIMMABLE.some((k) => n.includes(k));
}

export function DashboardInsights({
  startDate,
  endDate,
  filterType,
}: DashboardInsightsProps) {
  // Pull every expense in the active period in one shot, then derive
  // everything client-side. No backend changes needed.
  const { data, isLoading } = useQuery<ExpenseListResponse>({
    queryKey: ['insights-all-expenses', startDate, endDate],
    queryFn: () =>
      fetchExpenses({
        startDate,
        endDate,
        limit: 100000,
        sortBy: 'date',
        sortOrder: 'asc',
      }),
  });

  const analytics = useMemo(() => {
    const rows: ExpenseRow[] = data?.data ?? [];
    if (rows.length === 0) return null;

    const total = rows.reduce((s, r) => s + r.amount, 0);

    // Date span of the period (derive from data if "all time").
    const dates = rows.map((r) => parseISO(r.date));
    const minDate = startDate ? parseISO(startDate) : dates[0];
    const maxDate = endDate ? parseISO(endDate) : dates[dates.length - 1];
    const spanDays = Math.max(1, differenceInCalendarDays(maxDate, minDate) + 1);

    // ── Per-day totals ──
    const perDay = new Map<string, number>();
    for (const r of rows) {
      perDay.set(r.date, (perDay.get(r.date) ?? 0) + r.amount);
    }
    const activeDays = perDay.size;
    const noSpendDays = Math.max(0, spanDays - activeDays);

    // ── Day-of-week distribution ──
    const dow = Array.from({ length: 7 }, () => ({ total: 0, count: 0 }));
    for (const r of rows) {
      const d = getDay(parseISO(r.date));
      dow[d].total += r.amount;
      dow[d].count += 1;
    }
    const dowData = WEEKDAYS.map((label, i) => ({
      day: label,
      amount: Math.round(dow[i].total),
      count: dow[i].count,
    }));
    const busiestDow = dowData.reduce((a, b) => (b.amount > a.amount ? b : a));

    // ── Weekday vs weekend ──
    let weekendTotal = 0;
    let weekdayTotal = 0;
    for (const r of rows) {
      const d = getDay(parseISO(r.date));
      if (d === 0 || d === 6) weekendTotal += r.amount;
      else weekdayTotal += r.amount;
    }

    // ── Calendar heatmap cells (only when span is reasonable) ──
    let heatmap: { date: string; amount: number; label: string }[] = [];
    if (spanDays <= 92) {
      heatmap = eachDayOfInterval({ start: minDate, end: maxDate }).map((d) => {
        const key = format(d, 'yyyy-MM-dd');
        return {
          date: key,
          amount: perDay.get(key) ?? 0,
          label: format(d, 'dd MMM'),
        };
      });
    }
    const maxDayAmount = Math.max(...Array.from(perDay.values()), 0);

    // ── Cumulative burn-down (sorted by date) ──
    const sortedDayKeys = Array.from(perDay.keys()).sort();
    let running = 0;
    const cumulative = sortedDayKeys.map((key) => {
      running += perDay.get(key) ?? 0;
      return {
        date: format(parseISO(key), 'dd MMM'),
        cumulative: Math.round(running),
      };
    });

    // ── Top transactions ──
    const topTx = [...rows].sort((a, b) => b.amount - a.amount).slice(0, 10);

    // ── Account mix ──
    const accMap = new Map<string, number>();
    for (const r of rows) {
      const name = r.accountName ?? 'Unlinked';
      accMap.set(name, (accMap.get(name) ?? 0) + r.amount);
    }
    const accData = Array.from(accMap.entries())
      .map(([name, amount]) => ({ name, amount: Math.round(amount) }))
      .sort((a, b) => b.amount - a.amount);

    // ── Category totals (for insights + savings) ──
    const catMap = new Map<string, { total: number; count: number }>();
    for (const r of rows) {
      const c = catMap.get(r.categoryName) ?? { total: 0, count: 0 };
      c.total += r.amount;
      c.count += 1;
      catMap.set(r.categoryName, c);
    }
    const catList = Array.from(catMap.entries())
      .map(([name, v]) => ({ name, total: v.total, count: v.count }))
      .sort((a, b) => b.total - a.total);

    // ── Recurring merchants / remarks (frequency) ──
    const merchantMap = new Map<string, { total: number; count: number }>();
    for (const r of rows) {
      const key = (r.remarks ?? r.userName ?? '').trim().toLowerCase();
      if (!key) continue;
      const m = merchantMap.get(key) ?? { total: 0, count: 0 };
      m.total += r.amount;
      m.count += 1;
      merchantMap.set(key, m);
    }
    const recurring = Array.from(merchantMap.entries())
      .map(([name, v]) => ({ name, total: v.total, count: v.count }))
      .filter((m) => m.count >= 3)
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    // ── Velocity / projection ──
    const dailyAvg = total / spanDays;
    const elapsedDays = Math.max(
      1,
      differenceInCalendarDays(
        dates[dates.length - 1] < maxDate ? dates[dates.length - 1] : maxDate,
        minDate,
      ) + 1,
    );
    const runRate = total / elapsedDays;
    const projected = runRate * spanDays;

    // ── Savings opportunities ──
    const trimmable = catList.filter((c) => isTrimmable(c.name));
    const trimmableTotal = trimmable.reduce((s, c) => s + c.total, 0);

    return {
      total,
      spanDays,
      activeDays,
      noSpendDays,
      dowData,
      busiestDow,
      weekendTotal,
      weekdayTotal,
      heatmap,
      maxDayAmount,
      cumulative,
      topTx,
      accData,
      catList,
      recurring,
      dailyAvg,
      runRate,
      projected,
      elapsedDays,
      trimmable,
      trimmableTotal,
      txCount: rows.length,
    };
  }, [data, startDate, endDate]);

  // ── Auto-generated textual insights ──
  const smartInsights = useMemo(() => {
    if (!analytics) return [];
    const out: { icon: React.ReactNode; text: React.ReactNode }[] = [];
    const a = analytics;

    if (a.catList.length > 0) {
      const top = a.catList[0];
      const pct = Math.round((top.total / a.total) * 100);
      out.push({
        icon: <Layers className="h-3.5 w-3.5 text-indigo-500" />,
        text: (
          <>
            <strong>{top.name}</strong> is your biggest category at{' '}
            <strong>{inr(top.total)}</strong> ({pct}% of all spend).
          </>
        ),
      });
    }

    out.push({
      icon: <CalendarDays className="h-3.5 w-3.5 text-rose-500" />,
      text: (
        <>
          You spend the most on <strong>{a.busiestDow.day}</strong> —{' '}
          {inr(a.busiestDow.amount)} across {a.busiestDow.count} transactions.
        </>
      ),
    });

    const weekendShare = a.total > 0 ? (a.weekendTotal / a.total) * 100 : 0;
    if (weekendShare > 0) {
      out.push({
        icon: <Sun className="h-3.5 w-3.5 text-amber-500" />,
        text: (
          <>
            <strong>{weekendShare.toFixed(0)}%</strong> of your spend happens on
            weekends ({inr(a.weekendTotal)}).
          </>
        ),
      });
    }

    if (a.noSpendDays > 0) {
      out.push({
        icon: <PiggyBank className="h-3.5 w-3.5 text-emerald-500" />,
        text: (
          <>
            You had <strong>{a.noSpendDays}</strong> no-spend day
            {a.noSpendDays > 1 ? 's' : ''} this period — nice discipline.
          </>
        ),
      });
    }

    if (a.recurring.length > 0) {
      const r = a.recurring[0];
      out.push({
        icon: <Repeat className="h-3.5 w-3.5 text-cyan-500" />,
        text: (
          <>
            <strong>{r.name}</strong> recurs <strong>{r.count}×</strong> totalling{' '}
            {inr(r.total)} — a likely subscription or habit.
          </>
        ),
      });
    }

    out.push({
      icon: <Gauge className="h-3.5 w-3.5 text-violet-500" />,
      text: (
        <>
          Your burn rate is <strong>{inr(a.runRate)}/day</strong>
          {filterType !== 'all' && (
            <>
              {' '}
              — on pace for <strong>{inr(a.projected)}</strong> this period
            </>
          )}
          .
        </>
      ),
    });

    return out;
  }, [analytics, filterType]);

  // ── Auto-generated savings tips ──
  const savingsTips = useMemo(() => {
    if (!analytics) return [];
    const a = analytics;
    const tips: { saving: number; text: React.ReactNode }[] = [];

    // Trim discretionary categories by 20%
    for (const c of a.trimmable.slice(0, 3)) {
      const saving = c.total * 0.2;
      if (saving < 1) continue;
      tips.push({
        saving,
        text: (
          <>
            Cut <strong>{c.name}</strong> by just 20% and save{' '}
            <strong>{inr(saving)}</strong> per period.
          </>
        ),
      });
    }

    // Recurring habit → annualise
    if (a.recurring.length > 0) {
      const r = a.recurring[0];
      const annual = r.total * (filterType === 'month' ? 12 : 1);
      tips.push({
        saving: r.total,
        text: (
          <>
            <strong>{r.name}</strong> costs you {inr(r.total)}
            {filterType === 'month' && (
              <>
                {' '}
                — that's <strong>{inr(annual)}/year</strong>
              </>
            )}
            . Worth reviewing if you still need it.
          </>
        ),
      });
    }

    // Daily-average framing
    tips.push({
      saving: a.dailyAvg * 0.1,
      text: (
        <>
          Trimming your daily average of <strong>{inr(a.dailyAvg)}</strong> by
          ₹100/day adds up to <strong>{inr(100 * a.spanDays)}</strong> over this
          period.
        </>
      ),
    });

    // Top single splurge
    if (a.topTx.length > 0) {
      const t = a.topTx[0];
      const share = a.total > 0 ? (t.amount / a.total) * 100 : 0;
      if (share > 8) {
        tips.push({
          saving: t.amount,
          text: (
            <>
              Your single largest spend ({t.remarks || t.categoryName},{' '}
              {inr(t.amount)}) was <strong>{share.toFixed(0)}%</strong> of the
              total. Big one-offs are the easiest wins.
            </>
          ),
        });
      }
    }

    return tips.sort((x, y) => y.saving - x.saving).slice(0, 4);
  }, [analytics, filterType]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[240px] rounded-xl" />
        ))}
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card className="shadow-sm border-border/50 bg-card/30">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No expenses in this period to analyse.
        </CardContent>
      </Card>
    );
  }

  const a = analytics;
  const weekendShare = a.total > 0 ? (a.weekendTotal / a.total) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pt-2">
        <Sparkles className="h-4 w-4 text-amber-500" />
        <h2 className="text-base font-bold tracking-tight section-title">
          Deep Insights
        </h2>
        <span className="text-[11px] text-muted-foreground">
          {a.txCount} transactions · {a.spanDays} days
        </span>
      </div>

      {/* ── Velocity KPI strip ── */}
      <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
        <MiniStat
          icon={<Gauge size={15} className="text-violet-500" />}
          label="Burn rate"
          value={`${inr(a.runRate)}/day`}
          sub={`over ${a.elapsedDays} active days`}
        />
        <MiniStat
          icon={<Wallet size={15} className="text-blue-500" />}
          label="Daily avg"
          value={`${inr(a.dailyAvg)}`}
          sub={`across ${a.spanDays} days`}
        />
        <MiniStat
          icon={<PiggyBank size={15} className="text-emerald-500" />}
          label="No-spend days"
          value={`${a.noSpendDays}`}
          sub={`${a.activeDays} active days`}
        />
        <MiniStat
          icon={<TrendingUp size={15} className="text-rose-500" />}
          label={filterType === 'all' ? 'Avg / txn' : 'Projected'}
          value={
            filterType === 'all'
              ? inr(a.total / a.txCount)
              : inr(a.projected)
          }
          sub={filterType === 'all' ? `${a.txCount} txns` : 'at current pace'}
        />
      </div>

      {/* ── Smart insights + Savings tips ── */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card className="shadow-sm border-border/50 bg-card/30">
          <CardHeader className="px-4 py-2 pb-0">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              What your data is telling you
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-3 space-y-2.5">
            {smartInsights.map((ins, i) => (
              <div key={i} className="flex items-start gap-2 text-xs leading-relaxed">
                <span className="mt-0.5 shrink-0">{ins.icon}</span>
                <span className="text-muted-foreground">{ins.text}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-900/10">
          <CardHeader className="px-4 py-2 pb-0">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <PiggyBank className="h-4 w-4 text-emerald-500" />
              Saving opportunities
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-3 space-y-2.5">
            {savingsTips.length > 0 ? (
              savingsTips.map((tip, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-xs leading-relaxed"
                >
                  <Coffee className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  <span className="text-muted-foreground">{tip.text}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">
                Spending looks lean — no obvious cuts. Keep it up!
              </p>
            )}
            {a.trimmableTotal > 0 && (
              <p className="text-[11px] pt-1 border-t border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium">
                Discretionary spend (food, shopping, entertainment, rides) ≈{' '}
                {inr(a.trimmableTotal)} (
                {Math.round((a.trimmableTotal / a.total) * 100)}% of total).
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Spending by day-of-week + Weekday/Weekend ── */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card className="shadow-sm border-border/50 bg-card/30 md:col-span-2">
          <CardHeader className="px-4 py-2 pb-0">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-rose-500" />
              Spending by day of week
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 py-2">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={a.dowData}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  fontSize={11}
                  tick={{ fill: 'var(--muted-foreground)' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  fontSize={10}
                  width={45}
                  tickFormatter={(v) => inrCompact(v)}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(244,63,94,0.08)' }}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    fontSize: 12,
                  }}
                  formatter={(
                    v: number,
                    _n: string,
                    p: { payload?: { count?: number } },
                  ) => [
                    `${inr(v)} · ${p.payload?.count ?? 0} txns`,
                    'Spend',
                  ]}
                />
                <Bar dataKey="amount" radius={[5, 5, 0, 0]} maxBarSize={42}>
                  {a.dowData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={
                        d.day === 'Sat' || d.day === 'Sun'
                          ? '#f59e0b'
                          : '#f43f5e'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50 bg-card/30">
          <CardHeader className="px-4 py-2 pb-0">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Sun className="h-4 w-4 text-amber-500" />
              Weekday vs Weekend
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-3 space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium">Weekdays</span>
                <span className="tabular-nums text-muted-foreground">
                  {inr(a.weekdayTotal)} · {(100 - weekendShare).toFixed(0)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full"
                  style={{ width: `${100 - weekendShare}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium">Weekends</span>
                <span className="tabular-nums text-muted-foreground">
                  {inr(a.weekendTotal)} · {weekendShare.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${weekendShare}%` }}
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground pt-1">
              Avg weekend day spend is{' '}
              <strong className="text-foreground">
                {inr(a.weekendTotal / Math.max(1, Math.round(a.spanDays * (2 / 7))))}
              </strong>{' '}
              vs {inr(a.weekdayTotal / Math.max(1, Math.round(a.spanDays * (5 / 7))))}{' '}
              on weekdays.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Cumulative burn-down ── */}
      {a.cumulative.length > 1 && (
        <Card className="shadow-sm border-border/50 bg-card/30">
          <CardHeader className="px-4 py-2 pb-0">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-violet-500" />
              Cumulative spend over time
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 py-2">
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart
                data={a.cumulative}
                margin={{ top: 10, right: 12, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  fontSize={10}
                  tick={{ fill: 'var(--muted-foreground)' }}
                  minTickGap={20}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  fontSize={10}
                  width={48}
                  tickFormatter={(v) => inrCompact(v)}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [inr(v), 'Total so far']}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fill="url(#cumGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Calendar heatmap ── */}
      {a.heatmap.length > 0 && (
        <Card className="shadow-sm border-border/50 bg-card/30">
          <CardHeader className="px-4 py-2 pb-0">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-orange-500" />
              Daily spending heatmap
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-3">
            <div className="flex flex-wrap gap-1">
              {a.heatmap.map((cell) => {
                const intensity =
                  a.maxDayAmount > 0 ? cell.amount / a.maxDayAmount : 0;
                return (
                  <div
                    key={cell.date}
                    title={`${cell.label}: ${inr(cell.amount)}`}
                    className="h-5 w-5 rounded-[3px] border border-border/40"
                    style={{
                      backgroundColor:
                        cell.amount === 0
                          ? 'var(--muted)'
                          : `rgba(249, 115, 22, ${0.18 + intensity * 0.82})`,
                    }}
                  />
                );
              })}
            </div>
            <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
              <span>Less</span>
              {[0.18, 0.4, 0.6, 0.8, 1].map((o) => (
                <div
                  key={o}
                  className="h-3 w-3 rounded-[2px]"
                  style={{ backgroundColor: `rgba(249,115,22,${o})` }}
                />
              ))}
              <span>More</span>
              <span className="ml-auto">
                Peak day: {inr(a.maxDayAmount)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Top transactions + Account mix ── */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card className="shadow-sm border-border/50 bg-card/30">
          <CardHeader className="px-4 py-2 pb-0">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Award className="h-4 w-4 text-amber-500" />
              Biggest transactions
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-2 space-y-1">
            {a.topTx.map((t, i) => (
              <div
                key={t.id}
                className="flex items-center gap-2 text-xs py-1 border-b border-border/20 last:border-0"
              >
                <span className="w-4 text-muted-foreground tabular-nums">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">
                    {t.remarks || t.categoryName}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {format(parseISO(t.date), 'dd MMM yy')} · {t.categoryName}
                  </p>
                </div>
                <span className="font-bold text-rose-500 tabular-nums shrink-0">
                  {inr(t.amount)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50 bg-card/30">
          <CardHeader className="px-4 py-2 pb-0">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Wallet className="h-4 w-4 text-blue-500" />
              Where you pay from
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-3 space-y-2.5">
            {a.accData.map((acc) => {
              const pct = a.total > 0 ? (acc.amount / a.total) * 100 : 0;
              return (
                <div key={acc.name} className="space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium truncate max-w-[55%]">
                      {acc.name}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {inr(acc.amount)}
                      <span className="ml-1 text-[10px] font-bold text-blue-500">
                        {pct.toFixed(0)}%
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* ── Recurring habits ── */}
      {a.recurring.length > 0 && (
        <Card className="shadow-sm border-border/50 bg-card/30">
          <CardHeader className="px-4 py-2 pb-0">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Repeat className="h-4 w-4 text-cyan-500" />
              Recurring spends (3+ times)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {a.recurring.map((r) => (
                <div
                  key={r.name}
                  className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate capitalize">{r.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {r.count}× · avg {inr(r.total / r.count)}
                    </p>
                  </div>
                  <span className="font-bold tabular-nums text-cyan-600 dark:text-cyan-400 shrink-0">
                    {inr(r.total)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card className="p-1 px-2 bg-card/50 border-border/50 shadow-sm">
      <CardContent className="px-2 py-2">
        <div className="flex items-center gap-1.5 mb-1">
          {icon}
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
        </div>
        <p className="text-base font-bold tracking-tight tabular-nums">
          {value}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}
