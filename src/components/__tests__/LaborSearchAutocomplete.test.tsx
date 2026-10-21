import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LaborSearchAutocomplete } from '../LaborSearchAutocomplete';
import type { Material } from '../../services/inventoryService';

describe('Component: LaborSearchAutocomplete', () => {
  const mockLaborMaterials: Material[] = [
    {
      id: 'mat-labor-1',
      name: 'TUKANG LAS STRUKTUR SASIS',
      category: 'jasa',
      unit: 'jam',
      unit_price: 150000,
      selling_price: 150000,
      cost_price: 120000,
      current_stock: 99,
      waste_factor_percentage: 0,
      minimum_stock: 0,
    },
    {
      id: 'mat-labor-2',
      name: 'TUKANG CAT FINISHING POLISH',
      category: 'labor',
      unit: 'jam',
      unit_price: 200000,
      selling_price: 200000,
      cost_price: 160000,
      current_stock: 50,
      waste_factor_percentage: 0,
      minimum_stock: 0,
    },
    {
      id: 'mat-labor-3',
      name: 'JASA BONGKAR KAROSERI LAMA',
      category: 'jasa',
      unit: 'jam',
      unit_price: 100000,
      selling_price: 100000,
      cost_price: 80000,
      current_stock: 20,
      waste_factor_percentage: 0,
      minimum_stock: 0,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders input with placeholder and initial state', () => {
    render(
      <LaborSearchAutocomplete
        laborMaterials={mockLaborMaterials}
        value=""
        onSelectLabor={vi.fn()}
        onCustomLabor={vi.fn()}
        placeholder="Cari jasa / tukang..."
      />
    );

    const input = screen.getByPlaceholderText('Cari jasa / tukang...');
    expect(input).toBeInTheDocument();
    expect(screen.getByTestId('badge-catalog-labor')).toHaveTextContent('Katalog');
  });

  it('displays floating suggestions filtered by search query with price and HPP', async () => {
    render(
      <LaborSearchAutocomplete
        laborMaterials={mockLaborMaterials}
        value=""
        onSelectLabor={vi.fn()}
        onCustomLabor={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Misal: Jasa las struktur tambahan');
    fireEvent.change(input, { target: { value: 'las' } });

    await waitFor(() => {
      expect(screen.getByTestId('labor-suggestions-dropdown')).toBeInTheDocument();
    });

    // Should match "TUKANG LAS STRUKTUR SASIS"
    expect(screen.getByText('TUKANG LAS STRUKTUR SASIS')).toBeInTheDocument();
    expect(screen.getByText('Rp 150.000')).toBeInTheDocument();
    expect(screen.getByText('HPP: Rp 120.000')).toBeInTheDocument();

    // Should NOT match "TUKANG CAT FINISHING POLISH"
    expect(screen.queryByText('TUKANG CAT FINISHING POLISH')).not.toBeInTheDocument();
  });

  it('navigates suggestions using keyboard ArrowDown, ArrowUp, and Enter to select', async () => {
    const handleSelectLabor = vi.fn();
    const handleCustomLabor = vi.fn();

    render(
      <LaborSearchAutocomplete
        laborMaterials={mockLaborMaterials}
        value=""
        onSelectLabor={handleSelectLabor}
        onCustomLabor={handleCustomLabor}
      />
    );

    const input = screen.getByPlaceholderText('Misal: Jasa las struktur tambahan');
    
    // Focus and press ArrowDown to open dropdown
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    expect(screen.getByTestId('labor-suggestions-dropdown')).toBeInTheDocument();

    // Navigate to second option: ArrowDown
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    // Press Enter to select
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(handleSelectLabor).toHaveBeenCalledTimes(1);
    expect(handleSelectLabor).toHaveBeenCalledWith(mockLaborMaterials[1]); // TUKANG CAT
  });

  it('selects suggestion when clicked via mouse', async () => {
    const handleSelectLabor = vi.fn();

    render(
      <LaborSearchAutocomplete
        laborMaterials={mockLaborMaterials}
        value=""
        onSelectLabor={handleSelectLabor}
        onCustomLabor={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Misal: Jasa las struktur tambahan');
    fireEvent.change(input, { target: { value: 'bongkar' } });

    const option = await screen.findByTestId('labor-item-option-mat-labor-3');
    fireEvent.mouseDown(option);

    expect(handleSelectLabor).toHaveBeenCalledWith(mockLaborMaterials[2]);
    expect(input).toHaveValue('JASA BONGKAR KAROSERI LAMA');
  });

  it('supports custom freeform text when no match is found and user presses Enter', async () => {
    const handleSelectLabor = vi.fn();
    const handleCustomLabor = vi.fn();

    render(
      <LaborSearchAutocomplete
        laborMaterials={mockLaborMaterials}
        value=""
        onSelectLabor={handleSelectLabor}
        onCustomLabor={handleCustomLabor}
      />
    );

    const input = screen.getByPlaceholderText('Misal: Jasa las struktur tambahan');
    fireEvent.change(input, { target: { value: 'jasa borong bongkar tangki darurat' } });

    expect(screen.getByText(/Tidak ditemukan di master inventaris jasa/i)).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Enter' });

    // Should not call select from catalog
    expect(handleSelectLabor).not.toHaveBeenCalled();
    // Should call onCustomLabor with freeform text
    expect(handleCustomLabor).toHaveBeenCalledWith('jasa borong bongkar tangki darurat');
    // Dropdown should close
    expect(screen.queryByTestId('labor-suggestions-dropdown')).not.toBeInTheDocument();
  });

  it('displays Master badge when materialId is provided', () => {
    render(
      <LaborSearchAutocomplete
        laborMaterials={mockLaborMaterials}
        value="TUKANG LAS STRUKTUR SASIS"
        materialId="mat-labor-1"
        onSelectLabor={vi.fn()}
        onCustomLabor={vi.fn()}
      />
    );

    expect(screen.getByTestId('badge-master-labor')).toHaveTextContent('Master');
  });

  it('closes suggestions when Escape key is pressed', async () => {
    render(
      <LaborSearchAutocomplete
        laborMaterials={mockLaborMaterials}
        value=""
        onSelectLabor={vi.fn()}
        onCustomLabor={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Misal: Jasa las struktur tambahan');
    fireEvent.focus(input);
    expect(screen.getByTestId('labor-suggestions-dropdown')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByTestId('labor-suggestions-dropdown')).not.toBeInTheDocument();
  });
});
