import React, { useState, useEffect, useRef } from 'react';
import type { Material } from '../services/inventoryService';

interface MaterialAutocompleteProps {
  materials: Material[];
  onSelect: (material: Material) => void;
  placeholder?: string;
  initialValue?: string;
}

export const MaterialAutocomplete: React.FC<MaterialAutocompleteProps> = ({
  materials,
  onSelect,
  placeholder = 'Cari material...',
  initialValue = ''
}) => {
  const [query, setQuery] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter materials based on query
  const filteredMaterials = query
    ? materials.filter(m => m.name.toLowerCase().includes(query.toLowerCase()))
    : materials;

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
        // Option 1: activeItem.scrollIntoView({ block: 'nearest' });
        // But scrollIntoView can sometimes scroll the whole page if not careful.
        // Option 2: manual scroll adjustment
        const ul = listRef.current;
        if (activeItem.offsetTop < ul.scrollTop) {
          ul.scrollTop = activeItem.offsetTop;
        } else if (activeItem.offsetTop + activeItem.offsetHeight > ul.scrollTop + ul.offsetHeight) {
          ul.scrollTop = activeItem.offsetTop + activeItem.offsetHeight - ul.offsetHeight;
        }
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
    } else if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission
      if (highlightedIndex >= 0 && highlightedIndex < filteredMaterials.length) {
        handleSelect(filteredMaterials[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (material: Material) => {
    setQuery(material.name);
    setIsOpen(false);
    onSelect(material);
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
                onClick={() => handleSelect(material)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`px-3 py-2 cursor-pointer border-b border-border last:border-b-0 transition-colors ${
                  isHighlighted ? 'bg-primary/20 text-primary font-medium' : 'text-text hover:bg-surface-hover'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span>{material.name}</span>
                  <span className="text-xs text-text-muted font-mono bg-background px-1.5 py-0.5 rounded">
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
