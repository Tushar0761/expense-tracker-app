import { MerchantSuggestionPanel } from '@/components/MerchantSuggestionPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useMerchantSuggestion } from '@/hooks/use-merchant-suggestion';
import {
  bulkCreateExpenses,
  fetchLeafCategories,
  fetchAccounts,
  type CategoryFlat,
  type CreateExpensePayload,
  type Account,
} from '@/lib/api';
import { useMutation, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { X, Plus, Copy, Trash2, Check, Loader2 } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface BulkExpenseRow {
  id: string;
  date: string;
  description: string;
  userName: string;
  categoryId: number | null;
  amount: number | null;
  accountId: number | null;
  hasError: boolean;
}

interface BulkExpenseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultAccountId?: number;
  inline?: boolean;
}

export function BulkExpenseForm({
  isOpen,
  onClose,
  onSuccess,
  defaultAccountId,
  inline = false,
}: BulkExpenseFormProps) {
  const [rows, setRows] = useState<BulkExpenseRow[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);

  const { data: categories = [] } = useQuery<CategoryFlat[]>({
    queryKey: ['categories-leaf'],
    queryFn: fetchLeafCategories,
    enabled: isOpen,
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
    enabled: isOpen,
  });

  const activeUserName =
    activeRowIndex !== null ? (rows[activeRowIndex]?.userName ?? '') : '';
  const suggestions = useMerchantSuggestion(activeUserName);

  const createEmptyRow = useCallback<() => BulkExpenseRow>(
    () => ({
      id: crypto.randomUUID(),
      date: format(new Date(), 'yyyy-MM-dd'),
      description: '',
      userName: '',
      categoryId: null,
      amount: null,
      accountId: defaultAccountId ?? accounts[0]?.id ?? null,
      hasError: false,
    }),
    [defaultAccountId, accounts],
  );

  useEffect(() => {
    if (isOpen && accounts.length > 0) {
      setRows([createEmptyRow()]);
      setHasSubmitted(false);
    }
  }, [isOpen, accounts, createEmptyRow]);

  const duplicateRow = (index: number) => {
    const sourceRow = rows[index];
    const newRow: BulkExpenseRow = {
      ...sourceRow,
      id: crypto.randomUUID(),
    };
    const newRows = [...rows];
    newRows.splice(index + 1, 0, newRow);
    setRows(newRows);
  };

  const deleteRow = (index: number) => {
    if (rows.length > 1) {
      setRows(rows.filter((_, i) => i !== index));
    }
  };

  const updateRow = (
    index: number,
    field: 'categoryId' | 'accountId' | 'date' | 'description' | 'userName' | 'amount',
    value: string | number | null,
  ) => {
    console.log('updateRow called:', {
      index,
      field,
      value,
      currentRows: rows.length,
    });
    const newRows = [...rows];
    newRows[index] = {
      ...newRows[index],
      [field]: value,
      hasError: false,
    };
    console.log('newRows after update:', newRows[index]);
    setRows(newRows);
  };

  const addNewRow = () => {
    const newRow: BulkExpenseRow = {
      id: crypto.randomUUID(),
      date: format(new Date(), 'yyyy-MM-dd'),
      description: '',
      userName: '',
      categoryId: null,
      amount: null,
      accountId: defaultAccountId ?? accounts[0]?.id ?? null,
      hasError: false,
    };
    setRows((prev) => [...prev, newRow]);
  };

  const validateRows = (): boolean => {
    let isValid = true;
    const validatedRows = rows.map((row) => {
      const hasError =
        !row.date ||
        !row.amount ||
        row.amount <= 0 ||
        !row.categoryId ||
        !row.accountId;
      if (hasError) isValid = false;
      return { ...row, hasError };
    });
    setRows(validatedRows);
    return isValid;
  };

  const mutation = useMutation({
    mutationFn: (data: CreateExpensePayload[]) => bulkCreateExpenses(data),
    onSuccess: (data) => {
      toast.success(`${data.length} expenses added successfully`);
      onClose();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    setHasSubmitted(true);
    if (!validateRows()) {
      toast.error('Please fill in all required fields');
      return;
    }

    const validRows = rows.filter(
      (row) =>
        row.date &&
        row.amount &&
        row.amount > 0 &&
        row.categoryId &&
        row.accountId,
    );

    if (validRows.length === 0) {
      toast.error('No valid expenses to save');
      return;
    }

    const payload: CreateExpensePayload[] = validRows.map((row) => ({
      date: row.date,
      amount: row.amount!,
      remarks: row.description || undefined,
      userName: row.userName || undefined,
      categoryId: row.categoryId!,
      accountId: row.accountId!,
    }));

    mutation.mutate(payload);
  };

  if (!isOpen) return null;

  const inner = (
      <div
        className={inline ? 'w-full flex flex-col border border-border/60 rounded-xl overflow-hidden bg-card shadow-sm' : 'w-full sm:max-w-5xl max-h-[95dvh] sm:max-h-none sm:my-8 flex flex-col shadow-2xl border-border/50 rounded-t-2xl sm:rounded-xl overflow-hidden bg-card'}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-row items-center justify-between border-b bg-muted/30 py-3 px-4 sm:py-4 sm:px-6 shrink-0">
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              Bulk Add Expenses
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Add multiple expenses at once
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full h-9 w-9"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="overflow-auto flex-1">
            <table className="w-full min-w-[900px]">
              <thead className="sticky top-0 z-10">
                <tr className="border-b bg-muted/50">
                  <th className="text-center text-xs font-semibold uppercase tracking-wider px-3 py-3 w-14 bg-muted/50">
                    #
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-3 py-3 w-28">
                    Date
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-3 py-3">
                    Description
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-3 py-3">
                    Sent To
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-3 py-3 w-44">
                    Category
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-3 py-3 w-36">
                    Account
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-3 py-3 w-28">
                    Amount
                  </th>
                  <th className="text-center text-xs font-semibold uppercase tracking-wider px-3 py-3 w-20">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <React.Fragment key={row.id}>
                  <tr
                    className={`border-b border-border/40 ${
                      row.hasError && hasSubmitted
                        ? 'bg-red-50 dark:bg-red-950/20'
                        : ''
                    }`}
                  >
                    <td className="px-3 py-2 text-center text-sm text-muted-foreground font-medium">
                      {index + 1}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="date"
                        value={row.date}
                        onChange={(e) =>
                          updateRow(index, 'date', e.target.value)
                        }
                        className={`h-9 text-sm ${row.hasError && hasSubmitted && !row.date ? 'border-red-500' : ''}`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        placeholder="Description..."
                        value={row.description}
                        onChange={(e) =>
                          updateRow(index, 'description', e.target.value)
                        }
                        className="h-9 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        placeholder="Sent To..."
                        value={row.userName}
                        onChange={(e) =>
                          updateRow(index, 'userName', e.target.value)
                        }
                        onFocus={() => setActiveRowIndex(index)}
                        className="h-9 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <SearchableSelect
                        value={row.categoryId}
                        onChange={(value) =>
                          updateRow(index, 'categoryId', value)
                        }
                        options={categories}
                        placeholder="Select..."
                        error={
                          row.hasError && hasSubmitted && !row.categoryId
                            ? 'Required'
                            : undefined
                        }
                        className="text-sm"
                        showFullPath
                      />
                    </td>
                    <td className="px-3 py-2">
                      <SearchableSelect
                        value={row.accountId}
                        onChange={(value) =>
                          updateRow(index, 'accountId', value)
                        }
                        options={accounts.map((a) => ({
                          id: a.id,
                          name: a.name,
                        }))}
                        placeholder="Select..."
                        error={
                          row.hasError && hasSubmitted && !row.accountId
                            ? 'Required'
                            : undefined
                        }
                        className="text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          ₹
                        </span>
                        <Input
                          type="number"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          value={row.amount ?? ''}
                          onChange={(e) =>
                            updateRow(
                              index,
                              'amount',
                              e.target.value
                                ? parseFloat(e.target.value)
                                : null,
                            )
                          }
                          className={`pl-6 h-9 text-sm font-medium ${row.hasError && hasSubmitted && (!row.amount || row.amount <= 0) ? 'border-red-500' : ''}`}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => duplicateRow(index)}
                          title="Duplicate row"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteRow(index)}
                          title="Delete row"
                          disabled={rows.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {/* Suggestion row — only for the focused row */}
                  {activeRowIndex === index &&
                    (suggestions.categories.length > 0 || suggestions.remarks.length > 0) && (
                      <tr>
                        <td colSpan={8} className="px-3 pb-2 pt-0">
                          <MerchantSuggestionPanel
                            suggestions={suggestions}
                            compact
                            onSelectCategory={(id) => {
                              updateRow(index, 'categoryId', id);
                            }}
                            onSelectRemark={(r) => {
                              updateRow(index, 'description', r);
                            }}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border-t bg-muted/10 px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={addNewRow}
              className="h-10"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Row
            </Button>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="destructive"
                onClick={onClose}
                className="h-12 px-6"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={mutation.isPending}
                className="h-12 px-6 bg-green-600 hover:bg-green-700"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Save All ({rows.length})
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
  );

  if (inline) return inner;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm animate-in fade-in duration-200 flex items-end sm:items-start sm:overflow-y-auto justify-center sm:p-4"
      onClick={onClose}
    >
      {inner}
    </div>
  );
}
