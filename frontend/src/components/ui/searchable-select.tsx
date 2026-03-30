import { cn } from '@/lib/utils';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import * as React from 'react';
import { createPortal } from 'react-dom';

interface OptionItem {
  id: number;
  name: string;
  parentName?: string | null;
  level?: number;
  fullPath?: string;
}

interface SearchableSelectProps {
  value: number | null;
  onChange: (value: number) => void;
  options: OptionItem[];
  placeholder?: string;
  error?: string;
  className?: string;
  showFullPath?: boolean;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  error,
  className,
  showFullPath,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [rect, setRect] = React.useState<DOMRect | null>(null);

  const selectedOption = options.find((opt) => opt.id === value);

  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.name.toLowerCase().includes(q) ||
        opt.parentName?.toLowerCase().includes(q) ||
        opt.fullPath?.toLowerCase().includes(q),
    );
  }, [options, search]);

  // Height the dropdown can reach: search bar (~41px) + up to 220px list + 2px borders
  const DROPDOWN_MAX_HEIGHT = 270;
  const DROPDOWN_GAP = 4;

  const open = () => {
    if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
    setIsOpen(true);
  };

  const close = React.useCallback(() => {
    setIsOpen(false);
    setSearch('');
  }, []);

  // Close on outside click
  React.useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (!triggerRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, close]);

  // Update rect on scroll/resize while open
  React.useEffect(() => {
    if (!isOpen) return;
    const update = () => {
      if (triggerRef.current)
        setRect(triggerRef.current.getBoundingClientRect());
    };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [isOpen]);

  const handleSelect = (id: number) => {
    onChange(id);
    close();
  };

  const displayLabel = selectedOption
    ? showFullPath && selectedOption.fullPath
      ? selectedOption.fullPath
      : selectedOption.parentName
        ? `${selectedOption.parentName} > ${selectedOption.name}`
        : selectedOption.name
    : null;

  const dropdown =
    isOpen && rect
      ? createPortal(
          <DropdownPanel
            rect={rect}
            dropdownMaxHeight={DROPDOWN_MAX_HEIGHT}
            gap={DROPDOWN_GAP}
            search={search}
            setSearch={setSearch}
            filteredOptions={filteredOptions}
            value={value}
            showFullPath={showFullPath}
            handleSelect={handleSelect}
            close={close}
          />,
          document.body,
        )
      : null;

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (isOpen ? close() : open())}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-red-500 focus:ring-red-500',
        )}
      >
        <span
          className={cn('truncate', !displayLabel && 'text-muted-foreground')}
        >
          {displayLabel ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            'ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {dropdown}
    </div>
  );
}

// ─── Separate component so it can measure viewport after mount ───────────────
interface DropdownPanelProps {
  rect: DOMRect;
  dropdownMaxHeight: number;
  gap: number;
  search: string;
  setSearch: (v: string) => void;
  filteredOptions: OptionItem[];
  value: number | null;
  showFullPath?: boolean;
  handleSelect: (id: number) => void;
  close: () => void;
}

function DropdownPanel({
  rect,
  dropdownMaxHeight,
  gap,
  search,
  setSearch,
  filteredOptions,
  value,
  showFullPath,
  handleSelect,
}: DropdownPanelProps) {
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  const openUpward = spaceBelow < dropdownMaxHeight && spaceAbove > spaceBelow;

  // Cap list height to available space (minus search bar ~41px + borders ~2px)
  const availableSpace = openUpward ? spaceAbove - gap : spaceBelow - gap;
  const listMaxHeight = Math.min(220, availableSpace - 43);

  const style: React.CSSProperties = {
    position: 'fixed',
    left: rect.left,
    width: rect.width,
    zIndex: 1000,
    ...(openUpward
      ? { bottom: window.innerHeight - rect.top + gap }
      : { top: rect.bottom + gap }),
  };

  return (
    <div
      className="rounded-md border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95"
      style={style}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Search */}
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Search className="h-4 w-4 shrink-0 opacity-40" />
        <input
          autoFocus
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="rounded p-0.5 hover:bg-accent"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Options */}
      <div
        style={{ maxHeight: listMaxHeight, overflowY: 'auto' }}
        className="py-1"
      >
        {filteredOptions.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No results found
          </p>
        ) : (
          filteredOptions
            .sort((a, b) => {
              const nameA = a.parentName
                ? `${a.parentName} > ${a.name}`
                : a.name;
              const nameB = b.parentName
                ? `${b.parentName} > ${b.name}`
                : b.name;
              return nameA.localeCompare(nameB);
            })
            .map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelect(opt.id)}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground',
                  opt.id === value &&
                    'bg-emerald-800/40  hover:bg-emerald-500/40 ',
                )}
              >
                <span
                  className={cn(
                    'flex-1 text-left',
                    opt.id === value && 'font-medium text-primary',
                  )}
                  // style={{ paddingLeft: opt.level ? (opt.level - 1) * 14 : 0 }}
                >
                  {showFullPath && opt.parentName
                    ? `${opt.parentName} > ${opt.name}`
                    : opt.name}
                  {opt.parentName && !showFullPath && (
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {opt.parentName}
                    </span>
                  )}
                </span>
                {opt.id === value && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                )}
              </button>
            ))
        )}
      </div>
    </div>
  );
}
