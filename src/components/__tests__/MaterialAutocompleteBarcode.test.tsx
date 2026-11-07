import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MaterialAutocomplete } from '../MaterialAutocomplete';
import type { Material } from '../../services/inventoryService';

describe('Component: MaterialAutocomplete (Barcode Field & Instant Scan Detection)', () => {
  const mockMaterials: Material[] = [
    {
      id: 'mat-1',
      name: 'BAUT 12 3CM',
      barcode: '899000123',
      unit: 'pcs',
      unit_price: 1500,
      cost_price: 1000,
      selling_price: 1500,
      waste_factor_percentage: 2,
      current_stock: 500,
      minimum_stock: 50,
      item_type: 'MATERIAL',
    },
    {
      id: 'mat-2',
      name: 'PLAT BESI 2MM',
      barcode: '899000456',
      unit: 'lembar',
      unit_price: 450000,
      cost_price: 380000,
      selling_price: 450000,
      waste_factor_percentage: 5,
      current_stock: 20,
      minimum_stock: 5,
      item_type: 'MATERIAL',
    },
    {
      id: 'mat-3',
      name: 'CAT DUCO HITAM GLOSS',
      barcode: null,
      unit: 'kaleng',
      unit_price: 120000,
      cost_price: 95000,
      selling_price: 120000,
      waste_factor_percentage: 0,
      current_stock: 15,
      minimum_stock: 3,
      item_type: 'MATERIAL',
    },
  ];

  it('filters material by barcode query and renders barcode badge in option list', () => {
    const handleSelect = vi.fn();
    render(
      <MaterialAutocomplete
        materials={mockMaterials}
        onSelect={handleSelect}
        placeholder="Cari material..."
      />
    );

    const input = screen.getByPlaceholderText('Cari material...');
    fireEvent.change(input, { target: { value: '899000123' } });

    // Option should be visible
    expect(screen.getByText('BAUT 12 3CM')).toBeInTheDocument();
    expect(screen.getByText('BARCODE: 899000123')).toBeInTheDocument();
    // Non-matching item should not be visible
    expect(screen.queryByText('PLAT BESI 2MM')).not.toBeInTheDocument();
  });

  it('filters material by name query as usual', () => {
    const handleSelect = vi.fn();
    render(
      <MaterialAutocomplete
        materials={mockMaterials}
        onSelect={handleSelect}
        placeholder="Cari material..."
      />
    );

    const input = screen.getByPlaceholderText('Cari material...');
    fireEvent.change(input, { target: { value: 'CAT DUCO' } });

    expect(screen.getByText('CAT DUCO HITAM GLOSS')).toBeInTheDocument();
    expect(screen.queryByText('BAUT 12 3CM')).not.toBeInTheDocument();
  });

  it('instantly selects exact barcode match on Enter key (barcode scanner gun simulation)', () => {
    const handleSelect = vi.fn();
    render(
      <MaterialAutocomplete
        materials={mockMaterials}
        onSelect={handleSelect}
        placeholder="Cari material..."
      />
    );

    const input = screen.getByPlaceholderText('Cari material...');
    // Scanner types barcode and sends Enter
    fireEvent.change(input, { target: { value: '899000123' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'mat-1',
        name: 'BAUT 12 3CM',
        barcode: '899000123',
      })
    );
  });

  it('clears query on select when clearOnSelect is true', () => {
    const handleSelect = vi.fn();
    render(
      <MaterialAutocomplete
        materials={mockMaterials}
        onSelect={handleSelect}
        clearOnSelect={true}
        placeholder="Cari material..."
      />
    );

    const input = screen.getByPlaceholderText('Cari material...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '899000456' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'mat-2',
        barcode: '899000456',
      })
    );
    expect(input.value).toBe('');
  });
});
