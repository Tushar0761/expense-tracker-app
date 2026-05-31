import { MerchantSuggestionPanel } from '@/components/MerchantSuggestionPanel';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  fetchCategoriesFlat,
  scanReceipt,
  splitExpense,
  type CategoryFlat,
  type ExpenseRow,
} from '@/lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useMerchantSuggestion } from '@/hooks/use-merchant-suggestion';
import { Camera, Loader2, Plus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

type CategoryPrediction = {
  categoryId: number;
  categoryName: string;
  confidence: number;
};

type SplitRow = {
  id: string;
  name: string;
  amount: string;
  categoryId: string;
  remarks: string;
  predictions?: CategoryPrediction[];
};

function makeRow(overrides: Partial<SplitRow> = {}): SplitRow {
  return {
    id: Math.random().toString(36).slice(2),
    name: '',
    amount: '',
    categoryId: '',
    remarks: '',
    ...overrides,
  };
}

type Props = {
  expense: ExpenseRow | null;
  isOpen: boolean;
  onClose: () => void;
};

export function SplitExpenseDialog({ expense, isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<SplitRow[]>([makeRow(), makeRow()]);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);

  const activeRemarks = rows.find((r) => r.id === activeRowId)?.remarks ?? '';
  const splitSuggestions = useMerchantSuggestion(activeRemarks);

  const { data: categories = [] } = useQuery<CategoryFlat[]>({
    queryKey: ['categories-flat'],
    queryFn: fetchCategoriesFlat,
  });

  const sortedCategories = [...categories].sort((a, b) => {
    const na = a.parentName ? `${a.parentName} > ${a.name}` : a.name;
    const nb = b.parentName ? `${b.parentName} > ${b.name}` : b.name;
    return na.localeCompare(nb);
  });

  const rowsTotal = rows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  const originalAmount = expense?.amount ?? 0;
  const diff = Math.round((rowsTotal - originalAmount) * 100) / 100;
  const isBalanced = Math.abs(diff) < 0.01;

  function handleRowChange(id: string, field: keyof SplitRow, value: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, makeRow()]);
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function distributeRemaining() {
    const emptyRows = rows.filter((r) => !r.amount || parseFloat(r.amount) === 0);
    if (emptyRows.length === 0) return;
    const filledTotal = rows
      .filter((r) => r.amount && parseFloat(r.amount) > 0)
      .reduce((sum, r) => sum + parseFloat(r.amount), 0);
    const remaining = Math.max(0, originalAmount - filledTotal);
    const perRow = Math.round((remaining / emptyRows.length) * 100) / 100;
    setRows((prev) =>
      prev.map((r) =>
        !r.amount || parseFloat(r.amount) === 0 ? { ...r, amount: String(perRow) } : r,
      ),
    );
  }

  function applyOcrItems(items: { name: string; amount: number; predictions?: CategoryPrediction[] }[]) {
    if (items.length === 0) return;
    setRows(
      items.map((item) =>
        makeRow({
          name: item.name,
          amount: String(item.amount),
          remarks: item.name,
          // Auto-select the top prediction if confidence is decent
          categoryId:
            (item.predictions?.[0]?.confidence ?? 0) > 0.3
              ? String(item.predictions![0].categoryId)
              : '',
          predictions: item.predictions,
        }),
      ),
    );
  }

  async function handleScanReceipt(file: File) {
    setScanning(true);
    try {
      const result = await scanReceipt(file);
      if (result.items.length === 0) {
        toast.warning('No line items found in the receipt. You can enter them manually.');
        return;
      }
      applyOcrItems(result.items as { name: string; amount: number; predictions?: CategoryPrediction[] }[]);
      toast.success(`Found ${result.items.length} items from the receipt`);
    } catch {
      toast.error('Could not scan receipt. Check that the OCR service is running on port 8000.');
    } finally {
      setScanning(false);
    }
  }

  async function handleSave() {
    if (!expense) return;
    if (!isBalanced) {
      toast.error(`Items total ₹${rowsTotal.toFixed(2)} doesn't match original ₹${originalAmount}`);
      return;
    }
    const invalid = rows.filter((r) => !r.amount || !r.categoryId);
    if (invalid.length > 0) {
      toast.error('Every row needs an amount and a category');
      return;
    }
    setSaving(true);
    try {
      const items = rows.map((r) => ({
        amount: parseFloat(r.amount),
        categoryId: parseInt(r.categoryId),
        remarks: r.remarks || r.name || undefined,
        accountId: expense.accountId ?? undefined,
        date: expense.date,
      }));
      await splitExpense(expense.id, items);
      toast.success(`Split into ${rows.length} expenses`);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['category-totals'] });
      handleClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg || 'Failed to split expense');
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setRows([makeRow(), makeRow()]);
    onClose();
  }

  if (!expense) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            Split Expense
          </DialogTitle>
        </DialogHeader>

        {/* Original expense summary */}
        <div className="rounded-lg bg-muted/40 border px-4 py-3 text-sm space-y-0.5">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Original</span>
            <span className="font-bold text-rose-500">₹{originalAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{expense.categoryName}</span>
            <span>{format(new Date(expense.date), 'dd MMM yyyy')}</span>
          </div>
          {expense.remarks && (
            <p className="text-xs text-muted-foreground truncate">{expense.remarks}</p>
          )}
        </div>

        {/* OCR scan button */}
        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleScanReceipt(file);
              e.target.value = '';
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            disabled={scanning}
            onClick={() => fileRef.current?.click()}
          >
            {scanning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
            {scanning ? 'Scanning receipt…' : 'Scan Receipt (OCR)'}
          </Button>
          <span className="text-xs text-muted-foreground">
            Upload a receipt photo to auto-fill line items
          </span>
        </div>

        {/* Line items table */}
        <div className="space-y-2">
          <div className="grid grid-cols-[2fr_1fr_2fr_auto] gap-2 text-[10px] font-semibold uppercase text-muted-foreground px-1">
            <span>Item / Remarks</span>
            <span>Amount (₹)</span>
            <span>Category</span>
            <span />
          </div>

          {rows.map((row, idx) => (
            <div key={row.id} className="space-y-1">
              <div className="grid grid-cols-[2fr_1fr_2fr_auto] gap-2 items-center">
                <Input
                  value={row.remarks}
                  onChange={(e) => handleRowChange(row.id, 'remarks', e.target.value)}
                  onFocus={() => setActiveRowId(row.id)}
                  placeholder={`Item ${idx + 1}`}
                  className="h-8 text-xs"
                />
                <Input
                  type="number"
                  value={row.amount}
                  onChange={(e) => handleRowChange(row.id, 'amount', e.target.value)}
                  placeholder="0.00"
                  className="h-8 text-xs"
                />
                <div className="space-y-1">
                  <select
                    value={row.categoryId}
                    onChange={(e) => handleRowChange(row.id, 'categoryId', e.target.value)}
                    className="border rounded-md h-8 px-2 text-xs bg-background w-full"
                  >
                    <option value="">Select category…</option>
                    {sortedCategories.map((cat) => (
                      <option key={cat.id} value={String(cat.id)}>
                        {cat.parentName ? `${cat.parentName} > ${cat.name}` : cat.name}
                      </option>
                    ))}
                  </select>
                  {/* ML prediction hints — show if OCR found predictions and no category is selected yet */}
                  {row.predictions && row.predictions.length > 0 && !row.categoryId && (
                    <div className="flex gap-1 flex-wrap">
                      {row.predictions.slice(0, 2).map((p) => (
                        <button
                          key={p.categoryId}
                          type="button"
                          onClick={() => handleRowChange(row.id, 'categoryId', String(p.categoryId))}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 transition-colors border border-blue-200 dark:border-blue-800"
                          title={`ML confidence: ${(p.confidence * 100).toFixed(0)}%`}
                        >
                          {p.categoryName} ({(p.confidence * 100).toFixed(0)}%)
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-rose-400 hover:text-rose-600"
                  onClick={() => removeRow(row.id)}
                  disabled={rows.length === 1}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              {/* History-based suggestions when this row is focused */}
              {activeRowId === row.id && (
                <MerchantSuggestionPanel
                  suggestions={splitSuggestions}
                  compact
                  onSelectCategory={(id) => handleRowChange(row.id, 'categoryId', String(id))}
                  onSelectRemark={(r) => handleRowChange(row.id, 'remarks', r)}
                />
              )}
            </div>
          ))}
        </div>

        {/* Add row + distribute */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={addRow}>
            <Plus className="h-3.5 w-3.5" /> Add row
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 text-blue-600"
            onClick={distributeRemaining}
          >
            Distribute remaining
          </Button>
        </div>

        {/* Balance indicator */}
        <div className="flex items-center justify-between rounded-md border px-4 py-2 text-sm">
          <div className="flex gap-6">
            <div>
              <Label className="text-[10px] text-muted-foreground uppercase">Original</Label>
              <p className="font-semibold">₹{originalAmount.toLocaleString()}</p>
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground uppercase">Items total</Label>
              <p className={`font-semibold ${isBalanced ? 'text-emerald-600' : 'text-rose-500'}`}>
                ₹{rowsTotal.toFixed(2)}
              </p>
            </div>
            {!isBalanced && (
              <div>
                <Label className="text-[10px] text-muted-foreground uppercase">Difference</Label>
                <p className="font-semibold text-rose-500">
                  {diff > 0 ? '+' : ''}₹{diff.toFixed(2)}
                </p>
              </div>
            )}
          </div>
          <div
            className={`text-xs font-medium px-2 py-1 rounded ${
              isBalanced
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
            }`}
          >
            {isBalanced ? 'Balanced' : 'Not balanced'}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !isBalanced}
            className="gap-1.5"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? 'Splitting…' : `Split into ${rows.length} expenses`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
