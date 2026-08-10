# OpenCode Task Plan

## Task: Add "Unknown only" filter to Refine & Bulk Edit page

Frontend-only change in `frontend/src/pages/expenses/RefineExpenses.tsx`. No API/DB changes.
Behavior: a toolbar toggle that, when ON, shows only group cards containing at least one expense row with `categoryName === 'Unknown'`. Composes with mode grouping + search + sort. Selection / expansion / bulk-edit logic untouched. Unknown rows are already visually marked by the red badge on line 524 — no extra highlight or auto-expand needed.

- [ ] 1. Add filter state + group filtering logic — In `frontend/src/pages/expenses/RefineExpenses.tsx`: (a) declare `const [unknownOnly, setUnknownOnly] = useState(false);` next to the `sortBy` state (line 64); (b) in the `groups` useMemo (lines 88–146), when `unknownOnly` is true keep only groups where `exps.some((e) => e.categoryName === 'Unknown')` — apply via `.filter()` on the array at the end of the chain (after the `.sort()` on lines 141–145, before the useMemo closes) or inside the `.map()` on lines 117–140; (c) add `unknownOnly` to the useMemo dependency array (line 146). Reuse the exact string `'Unknown'` (same comparison as the red badge on line 524). Do not touch selection, expansion, or bulk-edit code. Only this one file.

- [x] 2. Add "Unknown" toggle button to the toolbar — In the same file, inside the "Search + sort" toolbar `<div>` (lines 335–389), add a toggle button next to the sort segmented control: label "Unknown" (a lucide icon such as `CircleAlert`/`HelpCircle` is optional), `onClick={() => setUnknownOnly((v) => !v)}`; active styling `bg-primary text-primary-foreground` (mirroring the active sort buttons on lines 357–364), inactive `bg-background text-muted-foreground hover:bg-muted`. Do NOT add it to `switchMode`'s reset (lines 222–227) — it should persist across mode switches, consistent with `sortBy`. Only this one file.

- [ ] 3. Verify build — Run `npm run build` in `frontend/` to confirm TypeScript compiles cleanly with the new state, filter logic, and toggle (or leave to reviewer if no local run is desired).