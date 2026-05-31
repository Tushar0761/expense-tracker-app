/**
 * MerchantSuggestionPanel
 *
 * Compact suggestion chips rendered below a merchant/userName input.
 * Accepts suggestions from useMerchantSuggestion and fires callbacks
 * when the user clicks a chip to apply category or remark.
 *
 * Usage:
 *   const suggestions = useMerchantSuggestion(watchedUserName);
 *   <MerchantSuggestionPanel
 *     suggestions={suggestions}
 *     onSelectCategory={(id) => setValue('categoryId', id)}
 *     onSelectRemark={(r) => setValue('remarks', r)}
 *   />
 */

import type { MerchantSuggestionResult } from '@/hooks/use-merchant-suggestion';

type Props = {
  suggestions: MerchantSuggestionResult;
  onSelectCategory: (categoryId: number, categoryName: string) => void;
  onSelectRemark: (remark: string) => void;
  /** Compact mode — smaller padding, no section header */
  compact?: boolean;
};

export function MerchantSuggestionPanel({
  suggestions,
  onSelectCategory,
  onSelectRemark,
  compact = false,
}: Props) {
  const { categories, remarks, merchantName } = suggestions;

  if (!merchantName || (categories.length === 0 && remarks.length === 0)) {
    return null;
  }

  return (
    <div
      className={`rounded-md border border-border/40 bg-muted/20 space-y-1.5 ${
        compact ? 'px-2 py-1.5' : 'px-3 py-2'
      }`}
    >
      {!compact && (
        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">
          Suggestions for &ldquo;{merchantName}&rdquo;
        </p>
      )}

      {categories.length > 0 && (
        <div className="space-y-0.5">
          {!compact && (
            <p className="text-[10px] text-muted-foreground font-medium">Categories</p>
          )}
          <div className="flex flex-wrap gap-1">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectCategory(c.id, c.name)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                  c.source === 'merchant-map'
                    ? 'border-blue-300 bg-blue-50/60 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700'
                    : 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10'
                }`}
                title={
                  c.source === 'merchant-map'
                    ? `Merchant rule match`
                    : `Used ${c.count} time${c.count === 1 ? '' : 's'}`
                }
              >
                {c.name}
                {c.source === 'history' && (
                  <span className="opacity-50 ml-0.5">×{c.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {remarks.length > 0 && (
        <div className="space-y-0.5">
          {!compact && (
            <p className="text-[10px] text-muted-foreground font-medium">Recent notes</p>
          )}
          <div className="flex flex-wrap gap-1">
            {remarks.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onSelectRemark(r)}
                className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-muted/40 text-muted-foreground hover:bg-muted transition-colors max-w-[160px] truncate"
                title={r}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
