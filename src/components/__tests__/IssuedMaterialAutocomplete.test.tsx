import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  IssuedMaterialAutocomplete,
  type IssuedMaterialItem,
} from '../IssuedMaterialAutocomplete';

describe('Component: IssuedMaterialAutocomplete (Return Material Dual-Mode Search)', () => {
  const mockIssued: IssuedMaterialItem[] = [
    {
      material_id: 'mat-10',
      name: 'BAUT M10 STAINLESS',
      barcode: '899000888',
      total_issued: 20,
      unit: 'pcs',
    },
    {
      material_id: 'mat-20',
      name: 'PLAT STRIP 3X25',
      barcode: '899000999',
      total_issued: 5,
      unit: 'batang',
    },
  ];

  it('filters return material by barcode query and renders barcode badge', () => {
    const handleSelect = vi.fn();
    render(
      <IssuedMaterialAutocomplete
        materials={mockIssued}
        selectedMaterialId=""
        onSelect={handleSelect}
        placeholder="Ketik nama atau scan barcode material..."
      />
    );

    const input = screen.getByPlaceholderText('Ketik nama atau scan barcode material...');
    fireEvent.change(input, { target: { value: '899000888' } });

    expect(screen.getByText('BAUT M10 STAINLESS')).toBeInTheDocument();
    expect(screen.getByText('BARCODE: 899000888')).toBeInTheDocument();
    expect(screen.queryByText('PLAT STRIP 3X25')).not.toBeInTheDocument();
  });

  it('filters return material by name query', () => {
    const handleSelect = vi.fn();
    render(
      <IssuedMaterialAutocomplete
        materials={mockIssued}
        selectedMaterialId=""
        onSelect={handleSelect}
        placeholder="Ketik nama atau scan barcode material..."
      />
    );

    const input = screen.getByPlaceholderText('Ketik nama atau scan barcode material...');
    fireEvent.change(input, { target: { value: 'STRIP' } });

    expect(screen.getByText('PLAT STRIP 3X25')).toBeInTheDocument();
    expect(screen.queryByText('BAUT M10 STAINLESS')).not.toBeInTheDocument();
  });

  it('instantly selects exact barcode match on Enter (scanner gun)', () => {
    const handleSelect = vi.fn();
    render(
      <IssuedMaterialAutocomplete
        materials={mockIssued}
        selectedMaterialId=""
        onSelect={handleSelect}
        placeholder="Ketik nama atau scan barcode material..."
      />
    );

    const input = screen.getByPlaceholderText('Ketik nama atau scan barcode material...');
    fireEvent.change(input, { target: { value: '899000999' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        material_id: 'mat-20',
        name: 'PLAT STRIP 3X25',
        barcode: '899000999',
      })
    );
  });
});
