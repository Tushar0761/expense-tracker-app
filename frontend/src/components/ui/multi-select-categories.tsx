import { cn } from '@/lib/utils';
import { ChevronDown, Search, X } from 'lucide-react';
import * as React from 'react';

interface CategoryOption {
  id: number;
  name: string;
  parentName?: string | null;
  fullPath?: string;
}

interface MultiSelectCategoriesProps {
  value: number[];
  onChange: (value: number[]) => void;
  options: CategoryOption[];
  placeholder?: string;
  className?: string;
}

export function MultiSelectCategories({
  value,
  onChange,
  options,
  placeholder = 'Exclude categories...',
  className,
}: MultiSelectCategoriesProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

  const selectedSet = React.useMemo(() => new Set(value), [value]);

  const sortedOptions = React.useMemo(
    () =>
      [...options].sort((a, b) => {
        const na = a.fullPath ?? (a.parentName ? `${a.parentName} > ${a.name}` : a.name);
        const nb = b.fullPath ?? (b.parentName ? `${b.parentName} > ${b.name}` : b.name);
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
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  const close = React.useCallback(() => {
    setIsOpen(false);
    setSearch('');
  }, []);

  const handleBlur = (e: React.FocusEvent) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      close();
    }
  };

  const toggle = (id: number) => {
    if (selectedSet.has(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const selectedNames = value
    .map((id) => options.find((o) => o.id === id)?.name)
    .filter((n): n is string => !!n);

  return (
    <div ref={containerRef} className={cn('relative', className)} onBlur={handleBlur}>
      <button
        type="button"
        onClick={() => (isOpen ? close() : open())}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <span className={cn('truncate text-left', selectedNames.length === 0 && 'text-muted-foreground')}>
          {selectedNames.length === 0
            ? placeholder
            : selectedNames.length === 1
              ? `Excluding: ${selectedNames[0]}`
              : `Excluding ${selectedNames.length} categories`}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {selectedNames.length > 0 && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={clearAll}
              className="rounded p-0.5 hover:bg-accent"
              title="Clear exclusions"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 opacity-50 transition-transform duration-150',
              isOpen && 'rotate-180',
            )}
          />
        </div>
      </button>

      {isOpen && (
        <div
          className="absolute left-0 right-0 top-full z-[200] mt-1 rounded-md border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95"
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-4 w-4 shrink-0 opacity-40" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search categories..."
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

          <div className="max-h-56 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No results found</p>
            ) : (
              filteredOptions.map((opt) => {
                const checked = selectedSet.has(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => toggle(opt.id)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground',
                      checked && 'bg-rose-800/20 hover:bg-rose-500/25',
                    )}
                  >
                    <div
                      className={cn(
                        'h-4 w-4 shrink-0 rounded border flex items-center justify-center',
                        checked ? 'bg-rose-500 border-rose-500' : 'border-input',
                      )}
                    >
                      {checked && <X className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <span className={cn('flex-1 text-left', checked && 'font-medium')}>
                      {opt.fullPath ?? (opt.parentName ? `${opt.parentName} > ${opt.name}` : opt.name)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
