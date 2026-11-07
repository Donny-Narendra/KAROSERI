import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  MaterialSearchAutocomplete,
  type MaterialOption,
} from '../MaterialSearchAutocomplete';

describe('Component: MaterialSearchAutocomplete (Dual-Mode Search & Scanner Enter)', () => {
  const mockMaterials: MaterialOption[] = [
    {
      id: 'mat-1',
      name: 'AKRILIK HEREX 3MM',
      barcode: '899000111',
      unit: 'lembar',
      current_stock: 12,
    },
    {
      id: 'mat-2',
      name: 'PIPA GALVANIS 2 INCH',
      barcode: '899000222',
      unit: 'batang',
      current_stock: 45,
    },
    {
      id: 'mat-3',
      name: 'BAUT ROOFING 5CM',
      barcode: '899000333',
      unit: 'pcs',
      current_stock: 500,
      has_been_issued: true,
    },
  ];

  it('filters material by barcode query and renders [BARCODE: xxx] badge', () => {
    const handleSelect = vi.fn();
    render(
      <MaterialSearchAutocomplete
        materials={mockMaterials}
        selectedMaterialId=""
        onSelect={handleSelect}
        placeholder="Cari material..."
      />
    );

    const input = screen.getByPlaceholderText('Cari material...');
    fireEvent.change(input, { target: { value: '899000111' } });

    expect(screen.getByText('AKRILIK HEREX 3MM')).toBeInTheDocument();
    expect(screen.getByText('BARCODE: 899000111')).toBeInTheDocument();
    expect(screen.queryByText('PIPA GALVANIS 2 INCH')).not.toBeInTheDocument();
  });

  it('filters material by name query', () => {
    const handleSelect = vi.fn();
    render(
      <MaterialSearchAutocomplete
        materials={mockMaterials}
        selectedMaterialId=""
        onSelect={handleSelect}
        placeholder="Cari material..."
      />
    );

    const input = screen.getByPlaceholderText('Cari material...');
    fireEvent.change(input, { target: { value: 'GALVANIS' } });

    expect(screen.getByText('PIPA GALVANIS 2 INCH')).toBeInTheDocument();
    expect(screen.queryByText('AKRILIK HEREX 3MM')).not.toBeInTheDocument();
  });

  it('instantly selects exact barcode match on Enter key (scanner gun simulation)', () => {
    const handleSelect = vi.fn();
    render(
      <MaterialSearchAutocomplete
        materials={mockMaterials}
        selectedMaterialId=""
        onSelect={handleSelect}
        placeholder="Cari material..."
      />
    );

    const input = screen.getByPlaceholderText('Cari material...');
    fireEvent.change(input, { target: { value: '899000111' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'mat-1',
        name: 'AKRILIK HEREX 3MM',
        barcode: '899000111',
      })
    );
  });

  it('supports ArrowDown / ArrowUp keyboard navigation', () => {
    const handleSelect = vi.fn();
    render(
      <MaterialSearchAutocomplete
        materials={mockMaterials}
        selectedMaterialId=""
        onSelect={handleSelect}
        placeholder="Cari material..."
      />
    );

    const input = screen.getByPlaceholderText('Cari material...');
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' }); // index 1 (mat-2)
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'mat-2',
      })
    );
  });
});

