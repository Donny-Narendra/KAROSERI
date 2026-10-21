import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Material } from '../services/inventoryService';

export interface LaborSearchAutocompleteProps {
  laborMaterials: Material[];
  value: string;
  materialId?: string | null;
  onSelectLabor: (material: Material) => void;
  onCustomLabor: (name: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const LaborSearchAutocomplete: React.FC<LaborSearchAutocompleteProps> = ({
  laborMaterials,
  value,
  materialId,
  onSelectLabor,
  onCustomLabor,
  placeholder = 'Misal: Jasa las struktur tambahan',
  required = false,
  disabled = false,
  className = '',
}) => {
  const [query, setQuery] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync external value changes into local query state
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Real-time filter based on user typing
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return laborMaterials;
    return laborMaterials.filter(item => item.name.toLowerCase().includes(q));
  }, [laborMaterials, query]);

  // Auto-scroll list when highlighted item changes
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeEl) {
        const parent = listRef.current;
        if (activeEl.offsetTop < parent.scrollTop) {
          parent.scrollTop = activeEl.offsetTop;
        } else if (
          activeEl.offsetTop + activeEl.offsetHeight >
          parent.scrollTop + parent.offsetHeight
        ) {
          parent.scrollTop =
            activeEl.offsetTop + activeEl.offsetHeight - parent.offsetHeight;
        }
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (item: Material) => {
    setQuery(item.name);
    setIsOpen(false);
    setHighlightedIndex(-1);
    onSelectLabor(item);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    setQuery(nextVal);
    setIsOpen(true);
    setHighlightedIndex(-1);
    // Notify parent immediately with custom text & reset material_id
    onCustomLabor(nextVal);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(filteredItems.length > 0 ? 0 : -1);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredItems.length > 0) {
        setHighlightedIndex(prev => prev < 0 ? 0 : (prev + 1) % filteredItems.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredItems.length > 0) {
        setHighlightedIndex(prev => prev <= 0 ? filteredItems.length - 1 : prev - 1);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission
      if (highlightedIndex >= 0 && highlightedIndex < filteredItems.length) {
        handleSelect(filteredItems[highlightedIndex]);
      } else {
        // Fallback to custom non-inventory labor
        setIsOpen(false);
        setHighlightedIndex(-1);
        onCustomLabor(query);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const handleBlur = () => {
    // Delay closing to let onMouseDown fire on suggestion items
    setTimeout(() => {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }, 200);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          required={required}
          disabled={disabled}
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full bg-surface border border-border rounded pl-2.5 pr-20 py-1.5 text-xs text-text focus:outline-none focus:border-sky-500 transition ${className}`}
          autoComplete="off"
        />

        {/* Status Badge */}
        {materialId ? (
          <span 
            data-testid="badge-master-labor"
            className="absolute right-2 top-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 pointer-events-none"
          >
            Master
          </span>
        ) : query.trim() ? (
          <span 
            data-testid="badge-custom-labor"
            className="absolute right-2 top-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 pointer-events-none"
          >
            Kustom
          </span>
        ) : laborMaterials.length > 0 ? (
          <span 
            data-testid="badge-catalog-labor"
            className="absolute right-2 top-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 pointer-events-none"
          >
            Katalog
          </span>
        ) : null}
      </div>

      {/* Floating Suggestions Dropdown */}
      {isOpen && (
        <div 
          data-testid="labor-suggestions-dropdown"
          className="absolute z-50 left-0 right-0 top-full mt-1 bg-surface border border-border rounded-lg shadow-2xl max-h-60 overflow-y-auto"
        >
          {filteredItems.length > 0 ? (
            <ul ref={listRef} className="divide-y divide-border/60">
              {filteredItems.map((item, index) => {
                const standardRate = Number(item.selling_price || item.unit_price || 0);
                const costRate = item.cost_price !== undefined && Number(item.cost_price) > 0
                  ? Number(item.cost_price)
                  : Math.round(standardRate * 0.8);
                const isHighlighted = index === highlightedIndex;

                return (
                  <li
                    key={item.id}
                    data-testid={`labor-item-option-${item.id}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(item);
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`p-2.5 cursor-pointer text-xs transition-colors flex items-center justify-between gap-2 ${
                      isHighlighted
                        ? 'bg-sky-500/15 text-sky-300'
                        : 'text-text hover:bg-surface-hover'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 shrink-0">
                        JASA
                      </span>
                      <span className="font-medium truncate">{item.name}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-sky-400">
                        Rp {standardRate.toLocaleString('id-ID')}
                      </div>
                      <div className="text-[10px] text-text-muted">
                        HPP: Rp {costRate.toLocaleString('id-ID')}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="p-3 text-center text-xs text-text-muted font-mono">
              Tidak ditemukan di master inventaris jasa. Tekan Enter untuk gunakan nama kustom.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
