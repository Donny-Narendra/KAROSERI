import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Material } from '../services/inventoryService';

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

  // Filter materials based on query (name or barcode)
  const filteredMaterials = useMemo(() => {
    if (!query.trim()) return materials.slice(0, 50);
    const q = query.toLowerCase().trim();
    const matched = materials.filter(m => 
      m.name?.toLowerCase().includes(q) || 
      (m.barcode && m.barcode.toLowerCase().includes(q))
    );

    // Sort so exact barcode match or barcode prefix match appears first
    return matched.sort((a, b) => {
      const aBarcodeExact = a.barcode && a.barcode.toLowerCase() === q;
      const bBarcodeExact = b.barcode && b.barcode.toLowerCase() === q;
      if (aBarcodeExact && !bBarcodeExact) return -1;
      if (!aBarcodeExact && bBarcodeExact) return 1;

      const aBarcodeStarts = a.barcode && a.barcode.toLowerCase().startsWith(q);
      const bBarcodeStarts = b.barcode && b.barcode.toLowerCase().startsWith(q);
      if (aBarcodeStarts && !bBarcodeStarts) return -1;
      if (!aBarcodeStarts && bBarcodeStarts) return 1;

      return 0;
    });
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
      const q = query.toLowerCase().trim();
      // Cek apakah query persis sama dengan salah satu barcode material
      const exactBarcodeMatch = materials.find(
        m => m.barcode && m.barcode.toLowerCase() === q
      );
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
                <div className="flex justify-between items-center py-0.5">
                  <div>
                    <span className="font-medium text-slate-200 block">{material.name}</span>
                    {material.barcode && (
                      <span className="text-[10px] font-mono text-amber-400 block mt-0.5">
                        Kode: {material.barcode}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-text-muted font-mono bg-background px-1.5 py-0.5 rounded shrink-0">
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
