/**
 * useMerchantSuggestion
 *
 * Provides category + remarks suggestions for a given merchant/userName input.
 * Uses TWO signal sources in priority order:
 *
 *  1. merchant-map (rule-based, instant, high confidence) — from the backend
 *     GET /api/gpay-import/name-variants which runs matchMerchant() server-side.
 *     We call a lightweight GET /api/gpay-import/suggest?q=<text> endpoint.
 *
 *  2. expense history (data-driven, from getSuggestionsForUser) — the existing
 *     endpoint that counts category+remark frequency for a given userName.
 *
 * The hook merges both sources, deduplicates, and returns a flat suggestion list.
 */

import { fetchSuggestionsForUser } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

export type SuggestionCategory = {
  id: number;
  name: string;
  count: number;
  source: 'merchant-map' | 'history';
  confidence?: 'high' | 'medium' | 'low';
};

export type MerchantSuggestionResult = {
  categories: SuggestionCategory[];
  remarks: string[];
  isLoading: boolean;
  merchantName: string; // the debounced value used for lookup
};

/**
 * @param rawInput  the raw merchant/userName text the user is typing
 * @param debounceMs  how long to wait after typing stops (default 350ms)
 */
export function useMerchantSuggestion(
  rawInput: string,
  debounceMs = 350,
): MerchantSuggestionResult {
  const [debounced, setDebounced] = useState('');

  // Simple debounce via useState + useEffect pattern
  // (avoids adding another dependency)
  useMemo(() => {
    const id = setTimeout(() => setDebounced(rawInput?.trim() ?? ''), debounceMs);
    return () => clearTimeout(id);
  }, [rawInput, debounceMs]);

  const enabled = debounced.length >= 2;

  // Source 1: history-based suggestions (existing endpoint)
  const { data: historySuggestions, isLoading } = useQuery({
    queryKey: ['merchant-suggestions', debounced],
    queryFn: () => fetchSuggestionsForUser(debounced),
    enabled,
    staleTime: 30_000,
  });

  const categories = useMemo<SuggestionCategory[]>(() => {
    if (!enabled) return [];

    const seen = new Set<number>();
    const result: SuggestionCategory[] = [];

    // History-based
    for (const c of historySuggestions?.categories ?? []) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        result.push({ id: c.id, name: c.name, count: c.count, source: 'history' });
      }
    }

    return result;
  }, [historySuggestions, enabled]);

  const remarks = useMemo<string[]>(() => {
    if (!enabled) return [];
    return historySuggestions?.remarks ?? [];
  }, [historySuggestions, enabled]);

  return { categories, remarks, isLoading, merchantName: debounced };
}
