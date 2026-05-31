import { cn } from '@/lib/utils';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import * as React from 'react';

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
  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.id === value);

  const sortedOptions = React.useMemo(
    () =>
      [...options].sort((a, b) => {
        const na = a.parentName ? `${a.parentName} > ${a.name}` : a.name;
        const nb = b.parentName ? `${b.parentName} > ${b.name}` : b.name;
        return na.localeCompare(nb);
      }),
    [options],
  );

  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return sortedOptions;
    const q = search.toLowerCase();
    return sortedOptions.filter(
      (opt) =>
        opt.name.toLowerCase().includes(q) ||
        opt.parentName?.toLowerCase().includes(q) ||
        opt.fullPath?.toLowerCase().includes(q),
    );
  }, [sortedOptions, search]);

  const open = () => {
    setIsOpen(true);
    // Let the DOM paint, then focus the search input
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  const close = React.useCallback(() => {
    setIsOpen(false);
    setSearch('');
  }, []);

  // Close when focus leaves the entire component
  const handleBlur = (e: React.FocusEvent) => {
    // relatedTarget is the element receiving focus next
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      close();
    }
  };

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

  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
      onBlur={handleBlur}
    >
      {/* Trigger */}
      <button
        type="button"
        onClick={() => (isOpen ? close() : open())}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-red-500 focus:ring-red-500',
        )}
      >
        <span className={cn('truncate text-left', !displayLabel && 'text-muted-foreground')}>
          {displayLabel ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            'ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform duration-150',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      {/* Dropdown — rendered inline (not portalled) so it stays inside any parent dialog */}
      {isOpen && (
        <div
          className="absolute left-0 right-0 top-full z-[200] mt-1 rounded-md border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95"
          // Prevent the blur handler from firing when clicking inside the panel
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* Search input */}
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-4 w-4 shrink-0 opacity-40" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {search && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setSearch('')}
                className="rounded p-0.5 hover:bg-accent"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Options list */}
          <div className="max-h-56 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No results found
              </p>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(opt.id)}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground',
                    opt.id === value && 'bg-emerald-800/40 hover:bg-emerald-500/40',
                  )}
                >
                  <span
                    className={cn(
                      'flex-1 text-left',
                      opt.id === value && 'font-medium text-primary',
                    )}
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
      )}
    </div>
  );
}
