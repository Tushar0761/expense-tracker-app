import { Skeleton } from '@/components/ui/skeleton';
import { useCategoryDrill } from '@/hooks/use-category-drill';
import {
  fetchAccountTotals,
  fetchHierarchicalCategoryTotals,
  type AccountTotal,
  type CategoryNode,
  type SpendTypeFilter,
} from '@/lib/api';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface DrillDownPieChartProps {
  startDate?: string;
  endDate?: string;
  className?: string;
  onFilterChange?: () => void;
  onCategoryChange?: (categoryId: number | null, categoryName: string | null) => void;
  spendTypeFilter?: SpendTypeFilter;
  excludeCategoryIds?: number[];
}

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

const ACC_COLORS = [
  '#3b82f6', // blue
  '#14b8a6', // teal
  '#a855f7', // purple
  '#f97316', // orange
  '#64748b', // slate
  '#22c55e', // green
];

const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`;

function PieTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
  total: number;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg px-3 py-2.5 text-sm pointer-events-none">
      <p className="font-semibold text-foreground mb-0.5 truncate max-w-[180px]">{item.name}</p>
      <p className="text-primary font-bold">{fmt(item.value)}</p>
      <p className="text-muted-foreground text-xs">{pct}% of total</p>
    </div>
  );
}

export function DrillDownPieChart({
  startDate,
  endDate,
  className,
  onFilterChange,
  onCategoryChange,
  spendTypeFilter,
  excludeCategoryIds,
}: DrillDownPieChartProps) {
  const { data: rootData = [], isLoading: catLoading } = useQuery<CategoryNode[]>({
    queryKey: ['category-hierarchical-totals', startDate, endDate, spendTypeFilter, excludeCategoryIds],
    queryFn: () =>
      fetchHierarchicalCategoryTotals(startDate, endDate, spendTypeFilter, excludeCategoryIds),
  });

  const { data: accountData = [], isLoading: accLoading } = useQuery<AccountTotal[]>({
    queryKey: ['account-totals', startDate, endDate],
    queryFn: () => fetchAccountTotals({ startDate, endDate }),
  });

  const isLoading = catLoading || accLoading;

  const { currentNodes, drillPath, drillInto, drillBack, canDrillInto } =
    useCategoryDrill(rootData);

  const prevDateRef = { startDate, endDate };
  useEffect(() => {
    if (startDate !== prevDateRef.startDate || endDate !== prevDateRef.endDate) {
      prevDateRef.startDate = startDate;
      prevDateRef.endDate = endDate;
      onFilterChange?.();
    }
  }, [startDate, endDate, onFilterChange]);

  const handleBreadcrumbClick = useCallback((i: number) => drillBack(i), [drillBack]);

  const handleSliceClick = useCallback(
    (data: { id: number }) => { if (canDrillInto(data.id)) drillInto(data.id); },
    [canDrillInto, drillInto],
  );

  useEffect(() => {
    const current = drillPath[drillPath.length - 1];
    if (current) onCategoryChange?.(current.id, current.id === null ? null : current.name);
  }, [drillPath, onCategoryChange]);

  const catData = currentNodes
    .filter((n) => n.total > 0)
    .map((n) => ({
      id: n.id,
      name: n.name,
      value: n.total,
      hasChildren: n.children.length > 0 && n.children.some((c) => c.total > 0),
    }));

  const accData = accountData
    .filter((a) => a.total > 0)
    .map((a) => ({ id: a.id, name: a.name, value: a.total }));

  const catTotal = catData.reduce((s, i) => s + i.value, 0);
  const accTotal = accData.reduce((s, i) => s + i.value, 0);

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-[260px] rounded-xl" />
          <Skeleton className="h-[260px] rounded-xl" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (catData.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-10', className)}>
        <p className="text-muted-foreground text-sm">No expenses found for this period.</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Breadcrumb */}
      {drillPath.length > 1 && (
        <div className="flex items-center gap-1 flex-wrap text-sm">
          {drillPath.map((item, index) => (
            <span key={index} className="flex items-center">
              {index > 0 && <span className="mx-1.5 text-muted-foreground">›</span>}
              <button
                onClick={() => handleBreadcrumbClick(index)}
                className={cn(
                  'transition-colors hover:underline',
                  index === drillPath.length - 1
                    ? 'font-semibold text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {item.name}
                {index === drillPath.length - 1 && ` (${fmt(catTotal)})`}
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Side-by-side charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ── Left: Category pie ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">By Category</p>
            <p className="text-sm font-bold text-primary">{fmt(catTotal)}</p>
          </div>

          <div className="relative h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  key={drillPath.length}
                  data={catData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  onClick={(data) => handleSliceClick(data as unknown as { id: number })}
                  animationBegin={0}
                  animationDuration={700}
                  animationEasing="ease-out"
                >
                  {catData.map((entry, i) => (
                    <Cell
                      key={`cat-${entry.id}`}
                      fill={CAT_COLORS[i % CAT_COLORS.length]}
                      stroke="transparent"
                      className={cn(
                        'transition-opacity duration-150',
                        entry.hasChildren ? 'cursor-pointer hover:opacity-70' : '',
                      )}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => (
                    <PieTooltip active={active} payload={payload as any} total={catTotal} />
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Centre label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                {drillPath.length > 1 ? drillPath[drillPath.length - 1].name : 'Total'}
              </p>
              <p className="text-base font-bold tabular-nums">{fmt(catTotal)}</p>
            </div>
          </div>

          {/* Category legend list */}
          <div className="space-y-1 max-h-[160px] overflow-y-auto pr-1">
            {catData
              .slice()
              .sort((a, b) => b.value - a.value)
              .map((item) => {
                const idx = catData.indexOf(item);
                return (
                  <button
                    key={item.id}
                    onClick={() => item.hasChildren && handleSliceClick({ id: item.id })}
                    disabled={!item.hasChildren}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all duration-150 text-sm',
                      item.hasChildren
                        ? 'hover:bg-primary/5 hover:border-primary/20 cursor-pointer'
                        : 'cursor-default opacity-80',
                    )}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: CAT_COLORS[idx % CAT_COLORS.length] }}
                    />
                    <span className="flex-1 truncate font-medium">{item.name}</span>
                    <span className="text-muted-foreground tabular-nums text-xs shrink-0">{fmt(item.value)}</span>
                    <span className="font-bold text-xs w-10 text-right shrink-0">
                      {catTotal > 0 ? ((item.value / catTotal) * 100).toFixed(1) : 0}%
                    </span>
                    {item.hasChildren && <span className="text-muted-foreground shrink-0">›</span>}
                  </button>
                );
              })}
          </div>
        </div>

        {/* ── Right: Account pie ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">By Account</p>
            <p className="text-sm font-bold text-blue-500">{fmt(accTotal)}</p>
          </div>

          <div className="relative h-[220px]">
            {accData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={accData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={700}
                    animationEasing="ease-out"
                  >
                    {accData.map((entry, i) => (
                      <Cell
                        key={`acc-${entry.id ?? i}`}
                        fill={ACC_COLORS[i % ACC_COLORS.length]}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => (
                      <PieTooltip active={active} payload={payload as any} total={accTotal} />
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-muted-foreground text-sm">No account data</p>
              </div>
            )}
            {accData.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Total</p>
                <p className="text-base font-bold tabular-nums">{fmt(accTotal)}</p>
              </div>
            )}
          </div>

          {/* Account legend list */}
          <div className="space-y-1 max-h-[160px] overflow-y-auto pr-1">
            {accData
              .slice()
              .sort((a, b) => b.value - a.value)
              .map((acc) => {
                const idx = accData.indexOf(acc);
                return (
                  <div
                    key={acc.id ?? idx}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: ACC_COLORS[idx % ACC_COLORS.length] }}
                    />
                    <span className="flex-1 truncate font-medium">{acc.name}</span>
                    <span className="text-muted-foreground tabular-nums text-xs shrink-0">{fmt(acc.value)}</span>
                    <span className="font-bold text-xs w-10 text-right shrink-0">
                      {accTotal > 0 ? ((acc.value / accTotal) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

      </div>
    </div>
  );
}
