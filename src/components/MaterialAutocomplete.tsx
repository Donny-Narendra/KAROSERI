import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Material } from '../services/inventoryService';
import { searchMaterials, findExactBarcodeMatch } from '../utils/materialSearch';

interface MaterialAutocompleteProps {
  materials: Material[];
  onSelect: (material: Material) => void;
  placeholder?: string;
  initialValue?: string;
  clearOnSelect?: boolean;
}

export const MaterialAutocomplete: React.FC<MaterialAutocompleteProps> = ({
  materials,
  onSelect,
  placeholder = 'Cari material...',
  initialValue = '',
  clearOnSelect = false
}) => {
  const [query, setQuery] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter materials based on query (name or barcode) using universal helper
  const filteredMaterials = useMemo(() => {
    return searchMaterials(materials, query);
  }, [materials, query]);

  useEffect(() => {
    // Sync initial value changes
    setQuery(initialValue);
  }, [initialValue]);

  useEffect(() => {
    // Reset highlight when query changes
    setHighlightedIndex(-1);
  }, [query]);

  // Scroll into view logic
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const activeItem = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeItem) {
        const ul = listRef.current;
        if (activeItem.offsetTop < ul.scrollTop) {
          ul.scrollTop = activeItem.offsetTop;
        } else if (activeItem.offsetTop + activeItem.offsetHeight > ul.scrollTop + ul.offsetHeight) {
          ul.scrollTop = activeItem.offsetTop + activeItem.offsetHeight - ul.offsetHeight;
        }
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (material: Material) => {
    if (clearOnSelect) {
      setQuery('');
    } else {
      setQuery(material.name);
    }
    setIsOpen(false);
    onSelect(material);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Cek apakah query persis sama dengan salah satu barcode material (instant scanner match)
      const exactBarcodeMatch = findExactBarcodeMatch(materials, query);
      if (exactBarcodeMatch) {
        e.preventDefault();
        handleSelect(exactBarcodeMatch);
        return;
      }

      // Fallback navigasi keyboard biasa
      if (isOpen && highlightedIndex >= 0 && filteredMaterials[highlightedIndex]) {
        e.preventDefault();
        handleSelect(filteredMaterials[highlightedIndex]);
        return;
      } else if (isOpen && filteredMaterials.length === 1) {
        e.preventDefault();
        handleSelect(filteredMaterials[0]);
        return;
      }
    }

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % filteredMaterials.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + filteredMaterials.length) % filteredMaterials.length);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleBlur = () => {
    // Use timeout to allow click event on list item to fire before closing
    setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full bg-background border border-border rounded px-2 py-1 text-sm focus:border-primary focus:outline-none"
        autoComplete="off"
      />

      {isOpen && filteredMaterials.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-[100] top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-surface border border-border rounded shadow-xl"
        >
          {filteredMaterials.map((material, index) => {
            const isHighlighted = index === highlightedIndex;
            return (
              <li
                key={material.id}
                data-testid={`material-option-${material.id}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(material);
                }}
                onClick={() => {
                  handleSelect(material);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`w-full block cursor-pointer select-none px-3 py-2 border-b border-border last:border-b-0 transition-colors ${
                  isHighlighted ? 'bg-primary/20 text-primary font-medium' : 'text-text hover:bg-surface-hover'
                }`}
              >
                <div className="flex justify-between items-center py-2 px-3">
                  <div>
                    <span className="font-semibold text-slate-100 block">{material.name}</span>
                    {material.barcode && (
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                        BARCODE: {material.barcode}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Stok: {material.current_stock} {material.unit}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {isOpen && filteredMaterials.length === 0 && (
        <div className="absolute z-[100] top-full left-0 right-0 mt-1 bg-surface border border-border rounded shadow-xl p-3 text-sm text-text-muted text-center">
          Material tidak ditemukan.
        </div>
      )}
    </div>
  );
};
