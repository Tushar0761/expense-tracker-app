import { cn } from '@/lib/utils';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import * as React from 'react';
import { createPortal } from 'react-dom';

interface OptionItem {
  id: number;
  name: string;
  parentName?: string | null;
}

interface SearchableSelectProps {
  value: number | null;
  onChange: (value: number) => void;
  options: OptionItem[];
  placeholder?: string;
  error?: string;
  className?: string;
}

export const SearchableSelect = React.forwardRef<
  HTMLDivElement,
  SearchableSelectProps
>(
  (
    { value, onChange, options, placeholder = 'Select...', error, className },
    ref,
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const containerRef = React.useRef<HTMLDivElement>(null);
    const searchInputRef = React.useRef<HTMLInputElement>(null);
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const [dropdownPosition, setDropdownPosition] = React.useState<{
      top: number;
      left: number;
      width: number;
    } | null>(null);

    React.useImperativeHandle(ref, () => containerRef.current!);

    const selectedOption = options.find((opt) => opt.id === value);

    const filteredOptions = React.useMemo(() => {
      if (!search.trim()) return options;
      const searchLower = search.toLowerCase();
      return options.filter(
        (opt) =>
          opt.name.toLowerCase().includes(searchLower) ||
          (opt.parentName &&
            opt.parentName.toLowerCase().includes(searchLower)),
      );
    }, [options, search]);

    const updateDropdownPosition = React.useCallback(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
    }, []);

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node)
        ) {
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

    React.useEffect(() => {
      if (isOpen && searchInputRef.current) {
        searchInputRef.current.focus();
        updateDropdownPosition();
      }
    }, [isOpen, updateDropdownPosition]);

    React.useEffect(() => {
      if (isOpen) {
        window.addEventListener('scroll', updateDropdownPosition, true);
        window.addEventListener('resize', updateDropdownPosition);
        return () => {
          window.removeEventListener('scroll', updateDropdownPosition, true);
          window.removeEventListener('resize', updateDropdownPosition);
        };
      }
    }, [isOpen, updateDropdownPosition]);

    const handleSelect = (id: number, e: React.MouseEvent) => {
      e.stopPropagation();
      console.log('handleSelect called with id:', id);
      onChange(id);
      setIsOpen(false);
      setSearch('');
    };

    const toggleOpen = () => {
      if (!isOpen) {
        updateDropdownPosition();
      }
      setIsOpen(!isOpen);
    };

    const dropdownContent =
      isOpen && dropdownPosition ? (
        <div
          className="fixed z-[100] rounded-md border bg-popover p-0 shadow-lg outline-none animate-in fade-in-0 zoom-in-95"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
          }}
        >
          <div className="flex items-center border-b px-2 py-1.5">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-9 w-full rounded-md bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsOpen(false);
                  setSearch('');
                }
              }}
            />
            {search && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearch('');
                  searchInputRef.current?.focus();
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
                  onClick={(e) => handleSelect(option.id, e)}
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
                    >
                      {option.name}
                    </span>
                    {option.parentName && (
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
      ) : null;

    return (
      <div ref={containerRef} className={cn('relative', className)}>
        <button
          ref={triggerRef}
          type="button"
          onClick={toggleOpen}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus:ring-red-500',
          )}
        >
          {selectedOption ? (
            <span className="flex flex-col items-start">
              <span className="font-medium">{selectedOption.name}</span>
              {selectedOption.parentName && (
                <span className="text-xs text-muted-foreground font-normal">
                  {selectedOption.parentName}
                </span>
              )}
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

        {typeof document !== 'undefined' &&
          createPortal(dropdownContent, document.body)}
      </div>
    );
  },
);

SearchableSelect.displayName = 'SearchableSelect';
