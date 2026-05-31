import { Skeleton } from '@/components/ui/skeleton';
import { useCategoryDrill } from '@/hooks/use-category-drill';
import {
  fetchAccountTotals,
  fetchHierarchicalCategoryTotals,
  type AccountTotal,
  type CategoryNode,
} from '@/lib/api';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  type LegendPayload,
} from 'recharts';

interface DrillDownPieChartProps {
  startDate?: string;
  endDate?: string;
  className?: string;
  onFilterChange?: () => void;
  onCategoryChange?: (categoryId: number | null, categoryName: string | null) => void;
}

// Outer ring — category colours
const CAT_COLORS = [
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f43f5e', // rose
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
];

// Inner ring — account colours (distinct, muted)
const ACC_COLORS = [
  '#3b82f6', // blue
  '#14b8a6', // teal
  '#a855f7', // purple
  '#f97316', // orange
  '#64748b', // slate
  '#22c55e', // green
];

const DIRECT_COLOR = '#94a3b8';

export function DrillDownPieChart({
  startDate,
  endDate,
  className,
  onFilterChange,
  onCategoryChange,
}: DrillDownPieChartProps) {
  const { data: rootData = [], isLoading: catLoading } = useQuery<CategoryNode[]>({
    queryKey: ['category-hierarchical-totals', startDate, endDate],
    queryFn: () => fetchHierarchicalCategoryTotals(startDate, endDate),
  });

  const { data: accountData = [], isLoading: accLoading } = useQuery<AccountTotal[]>({
    queryKey: ['account-totals', startDate, endDate],
    queryFn: () => fetchAccountTotals({ startDate, endDate }),
  });

  const isLoading = catLoading || accLoading;

  const { currentNodes, drillPath, drillInto, drillBack, canDrillInto, isRoot } =
    useCategoryDrill(rootData);

  // Reset drill on date change
  const prevDateRef = { startDate, endDate };
  useEffect(() => {
    if (startDate !== prevDateRef.startDate || endDate !== prevDateRef.endDate) {
      prevDateRef.startDate = startDate;
      prevDateRef.endDate = endDate;
      onFilterChange?.();
    }
  }, [startDate, endDate, onFilterChange]);

  const handleBreadcrumbClick = useCallback((index: number) => drillBack(index), [drillBack]);

  const handleSliceClick = useCallback(
    (data: { id: number }) => { if (canDrillInto(data.id)) drillInto(data.id); },
    [canDrillInto, drillInto],
  );

  useEffect(() => {
    const current = drillPath[drillPath.length - 1];
    if (current) onCategoryChange?.(current.id, current.id === null ? null : current.name);
  }, [drillPath, onCategoryChange]);

  const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`;

  // Outer ring data (categories)
  const outerData = (() => {
    const filtered = currentNodes.filter((n) => n.total > 0);
    return filtered.map((n) => ({
      id: n.id,
      name: n.name,
      value: n.total,
      selfTotal: n.selfTotal,
      hasChildren: n.children.length > 0 && n.children.some((c) => c.total > 0),
      isDirect: false as boolean,
    }));
  })();

  // Inner ring data (accounts)
  const innerData = accountData
    .filter((a) => a.total > 0)
    .map((a) => ({ id: a.id, name: a.name, value: a.total }));

  const outerTotal = outerData.reduce((s, i) => s + i.value, 0);
  const innerTotal = innerData.reduce((s, i) => s + i.value, 0);

  // Custom tooltip — shows whichever ring is hovered
  const CustomTooltip = useCallback(
    ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload?: { isAccount?: boolean } }> }) => {
      if (!active || !payload?.length) return null;
      const item = payload[0];
      const total = item.payload?.isAccount ? innerTotal : outerTotal;
      const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
      return (
        <div className="bg-card border border-border rounded-xl shadow-lg px-4 py-3 text-sm">
          <p className="font-semibold text-foreground mb-1">{item.name}</p>
          <p className="text-primary font-bold text-lg">{fmt(item.value)}</p>
          <p className="text-muted-foreground text-xs">{pct}% of total</p>
        </div>
      );
    },
    [outerTotal, innerTotal],
  );

  if (isLoading) {
    return (
      <div className={cn('flex flex-col gap-4', className)}>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-[320px] w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (outerData.length === 0) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <p className="text-muted-foreground text-sm">No expenses found for this period.</p>
      </div>
    );
  }

  if (!isRoot && currentNodes.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center p-8', className)}>
        <Breadcrumb drillPath={drillPath} onBreadcrumbClick={handleBreadcrumbClick} total={outerTotal} fmt={fmt} />
        <p className="text-muted-foreground text-sm mt-4">No expenses in this category.</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <Breadcrumb drillPath={drillPath} onBreadcrumbClick={handleBreadcrumbClick} total={outerTotal} fmt={fmt} />

      {/* Dual-ring chart */}
      <div className="relative" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            {/* Inner ring — accounts */}
            <Pie
              data={innerData.map((d) => ({ ...d, isAccount: true }))}
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={68}
              paddingAngle={2}
              dataKey="value"
              animationBegin={0}
              animationDuration={600}
            >
              {innerData.map((entry, i) => (
                <Cell
                  key={`acc-${entry.id ?? i}`}
                  fill={ACC_COLORS[i % ACC_COLORS.length]}
                  stroke="transparent"
                  opacity={0.85}
                />
              ))}
            </Pie>

            {/* Outer ring — categories */}
            <Pie
              key={drillPath.length}
              data={outerData}
              cx="50%"
              cy="50%"
              innerRadius={74}
              outerRadius={118}
              paddingAngle={2}
              dataKey="value"
              onClick={(data) => handleSliceClick(data as unknown as { id: number })}
              animationBegin={0}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {outerData.map((entry, i) => (
                <Cell
                  key={`cat-${entry.id}`}
                  fill={entry.isDirect ? DIRECT_COLOR : CAT_COLORS[i % CAT_COLORS.length]}
                  stroke="transparent"
                  className={cn(
                    'transition-opacity duration-150',
                    entry.hasChildren ? 'cursor-pointer hover:opacity-75' : '',
                  )}
                />
              ))}
            </Pie>

            <Tooltip content={<CustomTooltip />} />

            {/* Legend — only for outer ring */}
            <Legend
              verticalAlign="bottom"
              height={40}
              content={({ payload }) => (
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {(payload as LegendPayload[])
                    .sort((a, b) => (b.payload?.value ?? 0) - (a.payload?.value ?? 0))
                    .map((entry, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                        <span className="text-xs text-muted-foreground">{entry.value}</span>
                        <span className="text-xs font-bold">
                          {outerTotal > 0 ? ((entry.payload?.value / outerTotal) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    ))}
                </div>
              )}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Centre label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: 0, bottom: 40 }}>
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Total</p>
          <p className="text-lg font-bold text-foreground tabular-nums">{fmt(outerTotal)}</p>
        </div>
      </div>

      {/* Account ring legend */}
      {innerData.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {innerData.map((acc, i) => (
            <div key={acc.id ?? i} className="flex items-center gap-1.5 text-xs">
              <div
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: ACC_COLORS[i % ACC_COLORS.length] }}
              />
              <span className="text-muted-foreground">{acc.name}</span>
              <span className="font-semibold">{fmt(acc.value)}</span>
              <span className="text-muted-foreground">
                ({innerTotal > 0 ? ((acc.value / innerTotal) * 100).toFixed(1) : 0}%)
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Category grid */}
      <div className="grid grid-cols-2 gap-2">
        {outerData.map((item, i) => (
          <button
            key={item.id}
            onClick={() => item.hasChildren && handleSliceClick({ id: item.id })}
            disabled={!item.hasChildren}
            className={cn(
              'flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all duration-150',
              item.hasChildren
                ? 'hover:bg-primary/5 hover:border-primary/30 hover:shadow-sm cursor-pointer'
                : 'opacity-70 cursor-default',
            )}
          >
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: item.isDirect ? DIRECT_COLOR : CAT_COLORS[i % CAT_COLORS.length] }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                {fmt(item.value)}
                <span className="ml-2 font-bold text-foreground">
                  {outerTotal > 0 ? ((item.value / outerTotal) * 100).toFixed(1) : 0}%
                </span>
              </p>
            </div>
            {item.hasChildren && <span className="text-muted-foreground text-sm shrink-0">›</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Breadcrumb helper ────────────────────────────────────────────────────────
function Breadcrumb({
  drillPath,
  onBreadcrumbClick,
  total,
  fmt,
}: {
  drillPath: { id: number | null; name: string }[];
  onBreadcrumbClick: (i: number) => void;
  total: number;
  fmt: (v: number) => string;
}) {
  if (drillPath.length <= 1) return null;
  return (
    <div className="flex items-center gap-1 flex-wrap text-sm">
      {drillPath.map((item, index) => (
        <span key={index} className="flex items-center">
          {index > 0 && <span className="mx-1.5 text-muted-foreground">›</span>}
          <button
            onClick={() => onBreadcrumbClick(index)}
            className={cn(
              'transition-colors hover:underline',
              index === drillPath.length - 1
                ? 'font-semibold text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {item.name}
            {index === drillPath.length - 1 && ` (${fmt(total)})`}
          </button>
        </span>
      ))}
    </div>
  );
}
