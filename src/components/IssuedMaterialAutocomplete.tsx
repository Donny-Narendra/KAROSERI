import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, X, Package } from 'lucide-react';

export interface IssuedMaterialItem {
  material_id: string;
  name: string;
  total_issued: number;
  unit?: string;
}

interface IssuedMaterialAutocompleteProps {
  materials: IssuedMaterialItem[];
  selectedMaterialId: string;
  onSelect: (material: IssuedMaterialItem | null) => void;
  disabled?: boolean;
  placeholder?: string;
  onEnterFocusNext?: () => void;
}

export const IssuedMaterialAutocomplete: React.FC<IssuedMaterialAutocompleteProps> = ({
  materials,
  selectedMaterialId,
  onSelect,
  disabled = false,
  placeholder = 'Ketik nama material yang telah dikeluarkan...',
  onEnterFocusNext
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync searchQuery when selectedMaterialId changes externally or on init
  useEffect(() => {
    if (selectedMaterialId) {
      const match = materials.find((m) => m.material_id === selectedMaterialId);
      if (match) {
        setSearchQuery(match.name);
      }
    } else {
      setSearchQuery('');
    }
  }, [selectedMaterialId, materials]);

  // Real-time case-insensitive filter
  const filteredMaterials = searchQuery
    ? materials.filter((m) =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : materials;

  // Reset highlight index when query changes or list opens/closes
  useEffect(() => {
    setHighlightedIndex(filteredMaterials.length > 0 ? 0 : -1);
  }, [searchQuery, isOpen, filteredMaterials.length]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        // If input has text but doesn't match selected material, sync back to selected
        const currentMatch = materials.find((m) => m.material_id === selectedMaterialId);
        if (currentMatch) {
          setSearchQuery(currentMatch.name);
        } else if (!selectedMaterialId) {
          setSearchQuery('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedMaterialId, materials]);

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

  const handleSelectMaterial = (item: IssuedMaterialItem) => {
    setSearchQuery(item.name);
    setIsOpen(false);
    setHighlightedIndex(-1);
    onSelect(item);
    if (onEnterFocusNext) {
      onEnterFocusNext();
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchQuery('');
    setHighlightedIndex(-1);
    setIsOpen(false);
    onSelect(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredMaterials.length > 0) {
        setHighlightedIndex((prev) => (prev + 1) % filteredMaterials.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredMaterials.length > 0) {
        setHighlightedIndex(
          (prev) => (prev - 1 + filteredMaterials.length) % filteredMaterials.length
        );
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (
        highlightedIndex >= 0 &&
        highlightedIndex < filteredMaterials.length
      ) {
        handleSelectMaterial(filteredMaterials[highlightedIndex]);
      } else if (filteredMaterials.length === 1) {
        handleSelectMaterial(filteredMaterials[0]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setHighlightedIndex(-1);
      // Revert search query to selected material name if exists
      const match = materials.find((m) => m.material_id === selectedMaterialId);
      if (match) {
        setSearchQuery(match.name);
      } else {
        setSearchQuery('');
      }
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          disabled={disabled}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Pilih SPK terlebih dahulu...' : placeholder}
          autoComplete="off"
          className="w-full bg-background border border-border rounded pl-9 pr-14 py-2 text-text text-sm placeholder:text-text-muted focus:border-primary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition"
        />

        <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
          {searchQuery && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-200 rounded transition"
              title="Bersihkan pilihan"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                setIsOpen(!isOpen);
                inputRef.current?.focus();
              }
            }}
            className="p-1 text-slate-400 hover:text-slate-200 rounded transition disabled:opacity-50"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-primary' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Floating Autocomplete Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {filteredMaterials.length > 0 ? (
            <ul
              ref={listRef}
              className="max-h-60 overflow-y-auto divide-y divide-slate-800/80"
              role="listbox"
            >
              {filteredMaterials.map((mat, index) => {
                const isHighlighted = index === highlightedIndex;
                const isSelected = mat.material_id === selectedMaterialId;

                return (
                  <li
                    key={mat.material_id}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent blurring input before selecting
                      handleSelectMaterial(mat);
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`px-3 py-2.5 cursor-pointer select-none transition-colors flex items-center justify-between gap-3 ${
                      isHighlighted
                        ? 'bg-orange-500/20 text-orange-300 border-l-2 border-orange-500'
                        : isSelected
                        ? 'bg-slate-800 text-orange-200'
                        : 'text-slate-200 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Package
                        className={`w-4 h-4 shrink-0 ${
                          isHighlighted || isSelected
                            ? 'text-orange-400'
                            : 'text-slate-400'
                        }`}
                      />
                      <div className="truncate">
                        <span className="font-medium text-sm block truncate">
                          {mat.name}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-orange-300/90 border border-slate-700/80">
                        Issued: {mat.total_issued} {mat.unit || 'unit'}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="p-4 text-center text-sm text-slate-400">
              {materials.length === 0 ? (
                <span>Tidak ada riwayat material yang dikeluarkan untuk SPK ini.</span>
              ) : (
                <span>
                  Tidak ada material yang cocok dengan "
                  <strong className="text-slate-200">{searchQuery}</strong>"
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
