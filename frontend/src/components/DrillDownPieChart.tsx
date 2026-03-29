import { Skeleton } from '@/components/ui/skeleton';
import { useCategoryDrill } from '@/hooks/use-category-drill';
import { fetchHierarchicalCategoryTotals, type CategoryNode } from '@/lib/api';
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
} from 'recharts';

interface DrillDownPieChartProps {
  startDate?: string;
  endDate?: string;
  className?: string;
  onFilterChange?: () => void; // callback to reset drill state when date changes
}

// Color palette for pie slices
const COLORS = [
  '#38bdf8', // sky-400
  '#818cf8', // indigo-400
  '#f472b6', // pink-400
  '#34d399', // emerald-400
  '#facc15', // yellow-400
  '#fb923c', // orange-400
  '#a78bfa', // violet-400
  '#22d3ee', // cyan-400
];

// Color for "Direct" slice
const DIRECT_COLOR = '#94a3b8'; // slate-400

export function DrillDownPieChart({
  startDate,
  endDate,
  className,
  onFilterChange,
}: DrillDownPieChartProps) {
  // Fetch hierarchical data
  const { data: rootData = [], isLoading } = useQuery<CategoryNode[]>({
    queryKey: ['category-hierarchical-totals', startDate, endDate],
    queryFn: () => fetchHierarchicalCategoryTotals(startDate, endDate),
  });

  // Use the drill hook
  const {
    currentNodes,
    drillPath,
    drillInto,
    drillBack,
    canDrillInto,
    isRoot,
  } = useCategoryDrill(rootData);

  // Reset drill state when date filter changes
  const prevDateRef = { startDate, endDate };
  useEffect(() => {
    if (
      startDate !== prevDateRef.startDate ||
      endDate !== prevDateRef.endDate
    ) {
      prevDateRef.startDate = startDate;
      prevDateRef.endDate = endDate;
      onFilterChange?.();
    }
  }, [startDate, endDate, onFilterChange]);

  // Handle breadcrumb click
  const handleBreadcrumbClick = useCallback(
    (index: number) => {
      drillBack(index);
    },
    [drillBack],
  );

  // Handle slice click
  const handleSliceClick = useCallback(
    (data: { id: number }) => {
      if (canDrillInto(data.id)) {
        drillInto(data.id);
      }
    },
    [canDrillInto, drillInto],
  );

  // Format currency
  const formatCurrency = (value: number) => `₹${value.toLocaleString('en-IN')}`;
  const chartData = (() => {
    const filteredNodes = currentNodes.filter((node) => node.total > 0);
    const data: Array<{
      id: number;
      name: string;
      value: number;
      selfTotal: number;
      hasChildren: boolean;
      isDirect?: boolean;
    }> = [];

    for (const node of filteredNodes) {
      const hasDrillableChildren =
        node.children.length > 0 && node.children.some((c) => c.total > 0);
      // Add the actual category node (its total includes direct + children)
      data.push({
        id: node.id,
        name: node.name,
        value: node.total,
        selfTotal: node.selfTotal,
        hasChildren: hasDrillableChildren,
      });
    }

    return data;
  })();

  // Calculate total for center display
  const currentTotal = chartData.reduce((sum, item) => sum + item.value, 0);

  // Get the current category name for display
  const currentCategoryName = isRoot
    ? 'Total'
    : drillPath[drillPath.length - 1]?.name || 'Total';

  // Custom tooltip
  const CustomTooltip = useCallback(
    ({
      active,
      payload,
    }: {
      active?: boolean;
      payload?: Array<{ name: string; value: number }>;
    }) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-card border border-border rounded-lg shadow-lg p-3">
            <p className="font-medium text-sm">{payload[0].name}</p>
            <p className="text-primary font-semibold text-lg">
              {formatCurrency(payload[0].value)}
            </p>
            <p className="text-primary font-semibold text-lg">
              {((payload[0].value / currentTotal) * 100).toPrecision(3)} %
            </p>
          </div>
        );
      }
      return null;
    },
    [currentTotal],
  );

  // Prepare chart data
  // 1. Filter out nodes where total === 0
  // 2. If a node has selfTotal > 0 AND children, inject synthetic "Direct" slice

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex flex-col gap-4', className)}>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-[300px] w-full rounded-lg" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (chartData.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center p-8',
          className,
        )}
      >
        <p className="text-muted-foreground text-center">
          No expenses found for this period.
        </p>
      </div>
    );
  }

  // Show empty state message if trying to drill into leaf
  if (!isRoot && currentNodes.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center p-8',
          className,
        )}
      >
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 mb-4 flex-wrap">
          {drillPath.map((item, index) => (
            <span key={index} className="flex items-center">
              {index > 0 && (
                <span className="mx-2 text-muted-foreground">›</span>
              )}
              <button
                onClick={() => handleBreadcrumbClick(index)}
                className={cn(
                  'text-sm hover:underline',
                  index === drillPath.length - 1
                    ? 'font-semibold text-primary'
                    : 'text-muted-foreground',
                )}
              >
                {item.name}
              </button>
            </span>
          ))}
        </div>
        <p className="text-muted-foreground text-center">
          No expenses in this category.
        </p>
      </div>
    );
  }

  // Calculate total for center display

  // Get the current category name for display

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 flex-wrap">
        {drillPath.map((item, index) => (
          <span key={index} className="flex items-center">
            {index > 0 && <span className="mx-2 text-muted-foreground">›</span>}
            <button
              onClick={() => handleBreadcrumbClick(index)}
              className={cn(
                'text-sm hover:underline transition-colors',
                index === drillPath.length - 1
                  ? 'font-semibold text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {item.name}
              {drillPath.length - 1 === index &&
                ` ( ${formatCurrency(currentTotal)} )`}
            </button>
          </span>
        ))}
      </div>

      {/* Pie Chart */}
      <div className="h-[300px] w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              key={drillPath.length}
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              onClick={(data) =>
                handleSliceClick(data as unknown as { id: number })
              }
              animationBegin={0}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${entry.id}`}
                  fill={
                    entry.isDirect
                      ? DIRECT_COLOR
                      : COLORS[index % COLORS.length]
                  }
                  stroke="transparent"
                  className={cn(
                    'transition-opacity duration-200',
                    entry.hasChildren ? 'cursor-pointer hover:opacity-80' : '',
                  )}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              content={({ payload }) => (
                <div className="flex flex-wrap justify-center gap-4 mt-2">
                  {payload?.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {entry.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend Grid - mobile: single column */}
      <div className="grid grid-cols-2 md:grid-cols-2 gap-2">
        {chartData.map((item, index) => (
          <button
            key={item.id}
            onClick={() =>
              item.hasChildren && handleSliceClick({ id: item.id })
            }
            disabled={!item.hasChildren}
            className={cn(
              'flex items-center gap-2 p-2 rounded-lg border transition-colors text-left',
              item.hasChildren
                ? 'hover:bg-accent cursor-pointer'
                : 'opacity-70 cursor-default',
            )}
          >
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{
                backgroundColor: item.isDirect
                  ? DIRECT_COLOR
                  : COLORS[index % COLORS.length],
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {item.isDirect
                  ? `${item.name} (${chartData.find((c) => c.id === Math.abs(item.id))?.name})`
                  : item.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(item.value)}
              </p>
            </div>
            {item.hasChildren && (
              <span className="text-xs text-muted-foreground">›</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
