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

  const selectedOption = options.find((opt) => opt.id === value);

  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return options;
    const searchLower = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.name.toLowerCase().includes(searchLower) ||
        (opt.parentName &&
          opt.parentName.toLowerCase().includes(searchLower)) ||
        (opt.fullPath && opt.fullPath.toLowerCase().includes(searchLower)),
    );
  }, [options, search]);

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (id: number) => {
    onChange(id);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-red-500 focus:ring-red-500',
        )}
      >
        {selectedOption ? (
          <span className="flex flex-col items-start truncate w-full">
            <span className="font-medium truncate">
              {showFullPath && selectedOption.fullPath
                ? selectedOption.fullPath
                : selectedOption.parentName
                  ? `${selectedOption.parentName} > ${selectedOption.name}`
                  : selectedOption.name}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown
          className={cn(
            'h-4 w-4 opacity-50 transition-transform shrink-0 ml-2',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-0 shadow-lg animate-in fade-in-0 zoom-in-95">
          <div className="flex items-center border-b px-2 py-1.5">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-9 w-full rounded-md bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearch('');
                }}
                className="p-1 hover:bg-accent rounded"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="max-h-[250px] overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No results found
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(option.id)}
                  className={cn(
                    'relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 px-3 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                    option.id === value && 'bg-accent/50',
                  )}
                >
                  <div className="flex flex-col items-start flex-1">
                    <span
                      className={cn(
                        'font-medium',
                        option.id === value && 'text-primary',
                      )}
                      style={{
                        paddingLeft: option.level ? ((option.level - 1) * 16) : 0,
                      }}
                    >
                      {showFullPath && option.fullPath
                        ? option.fullPath
                        : option.name}
                    </span>
                    {option.parentName && !showFullPath && (
                      <span className="text-xs text-muted-foreground">
                        {option.parentName}
                      </span>
                    )}
                  </div>
                  {option.id === value && (
                    <Check className="h-4 w-4 text-primary ml-2 shrink-0" />
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
