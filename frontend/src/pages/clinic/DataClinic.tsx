import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  confirmGpayImport,
  downloadGpayCsvTemplate,
  fetchCategoriesFlat,
  fetchInconsistencies,
  fetchNameVariants,
  fixInconsistency,
  previewGpayImport,
  type CategoryFlat,
  type CategoryInconsistency,
  type GpayConfirmRow,
  type GpayPreviewRow,
  type NameVariant,
} from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileUp,
  Loader2,
  Search,
  Stethoscope,
  Users,
  Wrench,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

type Tab = 'import' | 'names' | 'inconsistencies';

export function DataClinic() {
  const [tab, setTab] = useState<Tab>('import');

  return (
    <div className="space-y-4 animate-in fade-in duration-500 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Stethoscope className="h-6 w-6 text-blue-500" />
          Data Clinic
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Import GPay transactions with smart category auto-assignment, and find
          duplicate merchant names in your history.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b">
        <TabBtn active={tab === 'import'} onClick={() => setTab('import')} icon={<FileUp className="h-3.5 w-3.5" />}>
          GPay Import
        </TabBtn>
        <TabBtn active={tab === 'names'} onClick={() => setTab('names')} icon={<Users className="h-3.5 w-3.5" />}>
          Name Variants
        </TabBtn>
        <TabBtn active={tab === 'inconsistencies'} onClick={() => setTab('inconsistencies')} icon={<AlertTriangle className="h-3.5 w-3.5" />}>
          Fix Inconsistencies
        </TabBtn>
      </div>

      {tab === 'import' && <GpayImportTab />}
      {tab === 'names' && <NameVariantsTab />}
      {tab === 'inconsistencies' && <InconsistenciesTab />}
    </div>
  );
}

// ── Tab button ──────────────────────────────────────────────────────────────

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

// ── GPay Import Tab ─────────────────────────────────────────────────────────

type GpayPreviewRowWithSkip = GpayPreviewRow & { skip?: boolean };

function GpayImportTab() {
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const [rows, setRows] = useState<GpayPreviewRowWithSkip[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterReview, setFilterReview] = useState(false);
  const [search, setSearch] = useState('');

  const { data: categories = [] } = useQuery<CategoryFlat[]>({
    queryKey: ['categories-flat'],
    queryFn: fetchCategoriesFlat,
  });

  const sortedCats = [...categories].sort((a, b) => {
    const na = a.parentName ? `${a.parentName} > ${a.name}` : a.name;
    const nb = b.parentName ? `${b.parentName} > ${b.name}` : b.name;
    return na.localeCompare(nb);
  });

  // Enrich categoryName from categories list
  const enriched = rows.map((r) => ({
    ...r,
    categoryName:
      r.categoryId
        ? (categories.find((c) => c.id === r.categoryId)?.name ?? null)
        : null,
  }));

  const visible = enriched.filter((r) => {
    if (filterReview && !r.needsReview) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        r.userName.toLowerCase().includes(s) ||
        (r.remarks ?? '').toLowerCase().includes(s) ||
        (r.canonicalName ?? '').toLowerCase().includes(s)
      );
    }
    return true;
  });

  const reviewCount = enriched.filter((r) => r.needsReview && !r.skip).length;
  const skipCount = enriched.filter((r) => r.skip).length;
  const readyCount = enriched.filter((r) => !r.skip && r.categoryId).length;

  function updateRow(idx: number, patch: Partial<GpayPreviewRowWithSkip>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  async function handleFile(file: File) {
    setLoading(true);
    setRows([]);
    try {
      const result = await previewGpayImport(file);
      setRows(result);
      toast.success(`Loaded ${result.length} rows. ${result.filter((r) => r.needsReview).length} need review.`);
    } catch {
      toast.error('Could not parse the CSV file');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload: GpayConfirmRow[] = rows.map((r) => ({
        date: r.date,
        amount: r.amount,
        account: r.account,
        accountId: r.accountId ?? undefined,
        note: r.note,
        userName: r.userName,
        categoryId: r.categoryId ?? undefined,
        remarks: r.remarks ?? undefined,
        skip: (r as any).skip ?? false,
      }));
      const result = await confirmGpayImport(payload);
      toast.success(`Imported ${result.inserted} expenses. Skipped ${result.skipped}.`);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      setRows([]);
    } catch {
      toast.error('Import failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Template download + upload area */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs h-8"
          onClick={downloadGpayCsvTemplate}
        >
          <Download className="h-3.5 w-3.5" />
          Download CSV Template
        </Button>
        <span className="text-xs text-muted-foreground">
          Fill in this template, then upload below
        </span>
      </div>

      {/* Upload area */}
      <Card className="border-dashed border-2 border-border/60 hover:border-primary/40 transition-colors cursor-pointer bg-muted/10"
        onClick={() => fileRef.current?.click()}>
        <CardContent className="flex flex-col items-center justify-center py-8 gap-2">
          <FileUp className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Upload GPay CSV export</p>
          <p className="text-xs text-muted-foreground">
            Format: id, date, amount, account, category, note, userName
          </p>
          {loading && <Loader2 className="h-5 w-5 animate-spin text-primary mt-1" />}
        </CardContent>
      </Card>
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />

      {rows.length > 0 && (
        <>
          {/* Summary bar */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="text-muted-foreground">{rows.length} rows loaded</span>
            <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-300">
              <CheckCircle2 className="h-3 w-3" /> {readyCount} ready
            </Badge>
            {reviewCount > 0 && (
              <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                <AlertCircle className="h-3 w-3" /> {reviewCount} need review
              </Badge>
            )}
            {skipCount > 0 && (
              <Badge variant="outline" className="text-muted-foreground">
                {skipCount} skipped
              </Badge>
            )}
            <div className="flex-1" />
            <Button
              variant={filterReview ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setFilterReview((v) => !v)}
            >
              <AlertCircle className="h-3 w-3" />
              {filterReview ? 'Show all' : 'Show needs-review only'}
            </Button>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search merchant…"
                className="border rounded h-7 pl-6 pr-2 text-xs bg-background w-40"
              />
            </div>
          </div>

          {/* Table */}
          <Card className="overflow-hidden border border-border/50">
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-muted/80 border-b z-10">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Date</th>
                    <th className="px-3 py-2 font-semibold">Merchant (userName)</th>
                    <th className="px-3 py-2 font-semibold text-right">Amount</th>
                    <th className="px-3 py-2 font-semibold">Remarks</th>
                    <th className="px-3 py-2 font-semibold min-w-[180px]">Category</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold text-center">Skip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {visible.map((row) => {
                    const isSkipped = (row as any).skip;
                    return (
                      <tr
                        key={row.rowIndex}
                        className={`transition-colors ${
                          isSkipped
                            ? 'opacity-40 bg-muted/20'
                            : row.needsReview
                              ? 'bg-amber-50/30 dark:bg-amber-900/5'
                              : ''
                        }`}
                      >
                        <td className="px-3 py-1.5 tabular-nums text-muted-foreground whitespace-nowrap">
                          {format(new Date(row.date), 'dd MMM')}
                        </td>
                        <td className="px-3 py-1.5 max-w-[200px]">
                          <div className="font-medium truncate" title={row.userName}>
                            {row.canonicalName ?? row.userName}
                          </div>
                          {row.canonicalName && row.canonicalName !== row.userName && (
                            <div className="text-[9px] text-muted-foreground truncate" title={row.userName}>
                              {row.userName}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right font-bold text-rose-500 whitespace-nowrap tabular-nums">
                          ₹{row.amount.toLocaleString()}
                        </td>
                        <td className="px-3 py-1.5 max-w-[140px]">
                          <input
                            value={row.remarks ?? ''}
                            onChange={(e) =>
                              updateRow(row.rowIndex, { remarks: e.target.value })
                            }
                            className="border rounded h-6 px-1.5 text-xs bg-background w-full"
                            placeholder="Remarks…"
                            disabled={isSkipped}
                          />
                        </td>
                        <td className="px-3 py-1.5 min-w-[180px]">
                          <select
                            value={row.categoryId ?? ''}
                            onChange={(e) =>
                              updateRow(row.rowIndex, {
                                categoryId: e.target.value ? Number(e.target.value) : null,
                                needsReview: !e.target.value,
                              })
                            }
                            disabled={isSkipped}
                            className={`border rounded h-6 px-1 text-xs bg-background w-full ${
                              !row.categoryId && !isSkipped ? 'border-amber-400' : ''
                            }`}
                          >
                            <option value="">Select category…</option>
                            {sortedCats.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.parentName ? `${c.parentName} > ${c.name}` : c.name}
                              </option>
                            ))}
                          </select>
                          {row.confidence && (
                            <span
                              className={`text-[9px] ml-0.5 ${
                                row.confidence === 'high'
                                  ? 'text-emerald-600'
                                  : row.confidence === 'medium'
                                    ? 'text-amber-600'
                                    : 'text-muted-foreground'
                              }`}
                            >
                              {row.confidence} confidence
                              {row.isTransfer && ' · finance'}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 max-w-[140px]">
                          {row.needsReview && !isSkipped ? (
                            <span className="text-[9px] text-amber-600 flex items-center gap-1">
                              <AlertCircle className="h-2.5 w-2.5 shrink-0" />
                              {row.reviewReason}
                            </span>
                          ) : isSkipped ? (
                            <span className="text-[9px] text-muted-foreground">Skipped</span>
                          ) : (
                            <span className="text-[9px] text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="h-2.5 w-2.5" /> Ready
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <input
                            type="checkbox"
                            checked={(row as any).skip ?? false}
                            onChange={(e) =>
                              updateRow(row.rowIndex, { skip: e.target.checked } as any)
                            }
                            className="h-3.5 w-3.5 cursor-pointer"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Save bar */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setRows([])}>
              Clear
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || readyCount === 0}
              className="gap-1.5"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {saving ? 'Importing…' : `Import ${readyCount} expenses`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Name Variants Tab ────────────────────────────────────────────────────────

function NameVariantsTab() {
  const [search, setSearch] = useState('');

  const { data: variants = [], isLoading } = useQuery<NameVariant[]>({
    queryKey: ['name-variants'],
    queryFn: fetchNameVariants,
  });

  const { data: categories = [] } = useQuery<CategoryFlat[]>({
    queryKey: ['categories-flat'],
    queryFn: fetchCategoriesFlat,
  });

  // Group variants: those with same canonicalName are variants of each other
  const grouped = new Map<string, NameVariant[]>();
  const ungrouped: NameVariant[] = [];

  for (const v of variants) {
    if (v.canonicalName) {
      const key = v.canonicalName;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(v);
    } else {
      ungrouped.push(v);
    }
  }

  const filtered = search
    ? variants.filter(
        (v) =>
          v.userName.toLowerCase().includes(search.toLowerCase()) ||
          (v.canonicalName ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : null;

  const getCatName = (id: number | null) =>
    id ? (categories.find((c) => c.id === id)?.name ?? `ID ${id}`) : null;

  return (
    <div className="space-y-4">
      <Card className="border border-border/50">
        <CardHeader className="px-4 py-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            Merchant Name Variants
            <span className="text-xs font-normal text-muted-foreground ml-1">
              — same merchant, different spellings in GPay
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="relative w-60">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search merchants…"
              className="border rounded h-7 pl-7 pr-2 text-xs bg-background w-full"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : filtered ? (
            <VariantTable rows={filtered} getCatName={getCatName} />
          ) : (
            <div className="space-y-3">
              {/* Groups: same canonical name = different spellings of same merchant */}
              {Array.from(grouped.entries())
                .filter(([, rows]) => rows.length > 1)
                .sort((a, b) => b[1].length - a[1].length)
                .map(([canonical, rows]) => (
                  <div key={canonical} className="border rounded-lg overflow-hidden">
                    <div className="bg-blue-50/50 dark:bg-blue-900/10 px-3 py-1.5 flex items-center justify-between">
                      <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                        {canonical}
                      </span>
                      <span className="text-[10px] text-blue-500">
                        {rows.length} name variants
                        {rows[0].categoryId && (
                          <> · {getCatName(rows[0].categoryId)}</>
                        )}
                      </span>
                    </div>
                    <VariantTable rows={rows} getCatName={getCatName} compact />
                  </div>
                ))}
              {/* Unrecognised merchants */}
              {ungrouped.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/30 px-3 py-1.5">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Unrecognised / No canonical match ({ungrouped.length})
                    </span>
                  </div>
                  <VariantTable rows={ungrouped} getCatName={getCatName} compact />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function VariantTable({
  rows,
  getCatName,
  compact = false,
}: {
  rows: NameVariant[];
  getCatName: (id: number | null) => string | null;
  compact?: boolean;
}) {
  return (
    <table className="w-full text-xs">
      {!compact && (
        <thead>
          <tr className="bg-muted/20 border-b">
            <th className="px-3 py-1.5 text-left font-semibold">userName (raw)</th>
            <th className="px-3 py-1.5 text-left font-semibold">Canonical Name</th>
            <th className="px-3 py-1.5 text-left font-semibold">Category</th>
            <th className="px-3 py-1.5 text-right font-semibold">Txns</th>
          </tr>
        </thead>
      )}
      <tbody className="divide-y divide-border/10">
        {rows.map((v) => (
          <tr key={v.userName} className="hover:bg-muted/20 transition-colors">
            <td className="px-3 py-1 font-mono text-[10px] text-muted-foreground max-w-[250px] truncate">
              {v.userName}
            </td>
            <td className="px-3 py-1 font-medium">
              {v.canonicalName ?? <span className="text-muted-foreground italic">—</span>}
            </td>
            <td className="px-3 py-1">
              {v.categoryId ? (
                <Badge variant="secondary" className="text-[9px] h-3.5 py-0 px-1">
                  {getCatName(v.categoryId)}
                </Badge>
              ) : (
                <span className="text-muted-foreground text-[10px]">—</span>
              )}
            </td>
            <td className="px-3 py-1 text-right tabular-nums text-muted-foreground">
              {v.count}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Inconsistencies Tab ──────────────────────────────────────────────────────

function InconsistenciesTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  const { data: inconsistencies = [], isLoading, refetch } = useQuery<CategoryInconsistency[]>({
    queryKey: ['inconsistencies'],
    queryFn: fetchInconsistencies,
  });

  const { data: categories = [] } = useQuery<CategoryFlat[]>({
    queryKey: ['categories-flat'],
    queryFn: fetchCategoriesFlat,
  });

  const sortedCats = [...categories].sort((a, b) => {
    const na = a.parentName ? `${a.parentName} > ${a.name}` : a.name;
    const nb = b.parentName ? `${b.parentName} > ${b.name}` : b.name;
    return na.localeCompare(nb);
  });

  const fixMutation = useMutation({
    mutationFn: ({ userName, categoryId }: { userName: string; categoryId: number }) =>
      fixInconsistency(userName, categoryId),
    onSuccess: (data, variables) => {
      toast.success(`Updated ${data.updated} expenses for "${variables.userName}"`);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['inconsistencies'] });
      queryClient.invalidateQueries({ queryKey: ['category-totals'] });
      refetch();
    },
    onError: () => toast.error('Failed to fix inconsistency'),
  });

  const fixAll = async () => {
    const toFix = inconsistencies.filter(
      (i) => i.recommendedCategoryId !== null,
    );
    for (const item of toFix) {
      const catId = overrides[item.userName] ?? item.recommendedCategoryId!;
      await fixInconsistency(item.userName, catId);
    }
    toast.success(`Fixed ${toFix.length} merchants`);
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    queryClient.invalidateQueries({ queryKey: ['inconsistencies'] });
    refetch();
  };

  const filtered = search
    ? inconsistencies.filter(
        (i) =>
          i.userName.toLowerCase().includes(search.toLowerCase()) ||
          (i.canonicalName ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : inconsistencies;

  return (
    <div className="space-y-4">
      <Card className="border border-border/50">
        <CardHeader className="px-4 py-3 pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wrench className="h-4 w-4 text-amber-500" />
              Category Inconsistencies
              <span className="text-xs font-normal text-muted-foreground ml-1">
                — same merchant, different categories across transactions
              </span>
            </CardTitle>
            {inconsistencies.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 gap-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                onClick={fixAll}
                disabled={fixMutation.isPending}
              >
                <CheckCircle2 className="h-3 w-3" />
                Fix All ({inconsistencies.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative w-60">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search merchants…"
                className="border rounded h-7 pl-7 pr-2 text-xs bg-background w-full"
              />
            </div>
            {!isLoading && (
              <span className="text-xs text-muted-foreground">
                {filtered.length} merchant{filtered.length !== 1 ? 's' : ''} with inconsistent categories
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Analysing your expense history…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600 py-6">
              <CheckCircle2 className="h-5 w-5" />
              All merchants are consistently categorised.
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((item) => {
                const selectedCatId = overrides[item.userName] ?? item.recommendedCategoryId;
                return (
                  <div key={item.userName} className="border rounded-lg overflow-hidden">
                    {/* Header row */}
                    <div className="flex items-center justify-between gap-3 px-3 py-2 bg-amber-50/40 dark:bg-amber-900/10 border-b flex-wrap">
                      <div className="min-w-0">
                        <div className="font-medium text-xs">
                          {item.canonicalName ?? item.userName}
                        </div>
                        {item.canonicalName && item.canonicalName !== item.userName && (
                          <div className="text-[9px] text-muted-foreground font-mono truncate">
                            {item.userName}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">
                          {item.totalExpenses} transactions across {item.categories.length} categories
                        </span>
                        {/* Category picker */}
                        <select
                          value={selectedCatId ?? ''}
                          onChange={(e) =>
                            setOverrides((prev) => ({
                              ...prev,
                              [item.userName]: Number(e.target.value),
                            }))
                          }
                          className="border rounded h-6 px-1 text-[10px] bg-background max-w-[220px]"
                        >
                          <option value="">Select correct category…</option>
                          {sortedCats.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.parentName ? `${c.parentName} > ${c.name}` : c.name}
                            </option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          className="h-6 text-[10px] px-2 gap-1 bg-amber-600 hover:bg-amber-700"
                          disabled={!selectedCatId || fixMutation.isPending}
                          onClick={() =>
                            fixMutation.mutate({
                              userName: item.userName,
                              categoryId: selectedCatId!,
                            })
                          }
                        >
                          <Wrench className="h-2.5 w-2.5" />
                          Fix
                        </Button>
                      </div>
                    </div>
                    {/* Category breakdown */}
                    <div className="flex flex-wrap gap-2 px-3 py-2">
                      {item.categories.map((c) => (
                        <div
                          key={c.categoryId}
                          className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border ${
                            c.categoryId === selectedCatId
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-300'
                              : 'bg-muted/30 border-border text-muted-foreground'
                          }`}
                        >
                          {c.categoryId === selectedCatId && (
                            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                          )}
                          {c.categoryName}
                          <span className="opacity-60 ml-0.5">×{c.count}</span>
                        </div>
                      ))}
                      {item.recommendedCategoryId && (
                        <span className="text-[9px] text-blue-500 self-center ml-1">
                          ← recommended
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
