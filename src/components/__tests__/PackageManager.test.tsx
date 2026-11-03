import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PackageManager } from '../PackageManager';
import { packageService } from '../../services/packageService';
import { inventoryService } from '../../services/inventoryService';

vi.mock('../../services/packageService', () => ({
  packageService: {
    getPackages: vi.fn(),
    createPackageWithItems: vi.fn(),
    updatePackageWithItems: vi.fn(),
    deletePackage: vi.fn(),
  },
}));

vi.mock('../../services/inventoryService', () => ({
  inventoryService: {
    getMaterials: vi.fn(),
  },
}));

describe('Component: PackageManager (HPP vs Selling Price Synchronization)', () => {
  const mockMaterials = [
    {
      id: 'mat-baut-12',
      name: 'BAUT 12 3CM',
      unit: 'pcs',
      unit_price: 1500,
      cost_price: 1000,
      selling_price: 1500,
      item_type: 'MATERIAL' as const,
      current_stock: 100,
      minimum_stock: 10,
      waste_factor_percentage: 0,
    },
    {
      id: 'mat-pipa-galvanis',
      name: 'PIPA GALVANIS 1,5 INS',
      unit: 'btg',
      unit_price: 190000,
      cost_price: 170000,
      selling_price: 190000,
      item_type: 'MATERIAL' as const,
      current_stock: 50,
      minimum_stock: 5,
      waste_factor_percentage: 0,
    },
  ];

  const mockPackages = [
    {
      id: 'pkg-slebor',
      name: 'SLEBOR HEREX STAINLESS',
      selling_price: 1600000,
      calculated_cogs: 1375247,
      items: [
        {
          id: 'item-baut',
          package_id: 'pkg-slebor',
          item_type: 'MATERIAL' as const,
          material_id: 'mat-baut-12',
          quantity: 18,
          cost_per_unit: 1000,
          material: mockMaterials[0],
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(packageService.getPackages).mockResolvedValue(mockPackages as any);
    vi.mocked(inventoryService.getMaterials).mockResolvedValue(mockMaterials as any);
  });

  it('renders package items with correct HPP cost_price and table header "Biaya Satuan (HPP Modal)"', async () => {
    render(<PackageManager />);

    await waitFor(() => {
      expect(screen.getByText('SLEBOR HEREX STAINLESS')).toBeInTheDocument();
    });

    // Open edit modal for the package
    const editBtn = screen.getByTitle('Edit');
    fireEvent.click(editBtn);

    // Verify modal header is visible
    expect(screen.getByText('Edit Paket (Assembly List)')).toBeInTheDocument();

    // Verify table header label
    expect(screen.getByText('Biaya Satuan (HPP Modal)')).toBeInTheDocument();

    // Verify the component row displays unit cost of 1000 (not 1500)
    const costInput = screen.getByDisplayValue('1000') as HTMLInputElement;
    expect(costInput).toBeInTheDocument();

    // Subtotal should be 18 * 1000 = 18.000 (rendered in table and modal)
    expect(screen.getAllByText('18.000').length).toBeGreaterThanOrEqual(1);
  });

  it('strictly maps material.cost_price (HPP) when adding material from autocomplete', async () => {
    render(<PackageManager />);

    await waitFor(() => {
      expect(screen.getByText('SLEBOR HEREX STAINLESS')).toBeInTheDocument();
    });

    // Open "Buat Paket Baru"
    const createBtn = screen.getByText('Buat Paket Baru');
    fireEvent.click(createBtn);

    expect(screen.getByText('Buat Paket Baru (Assembly List)')).toBeInTheDocument();

    // Type in autocomplete to find PIPA GALVANIS
    const autocompleteInput = screen.getByPlaceholderText('Ketik & pilih bahan baku...');
    fireEvent.change(autocompleteInput, { target: { value: 'PIPA' } });

    // Click the autocomplete option
    const option = await screen.findByTestId('material-option-mat-pipa-galvanis');
    fireEvent.click(option);

    // Verify the unit cost is locked to cost_price (170000), not unit_price or selling_price (190000)
    const costInput = screen.getByDisplayValue('170000') as HTMLInputElement;
    expect(costInput).toBeInTheDocument();
    expect(screen.queryByDisplayValue('190000')).not.toBeInTheDocument();
  });
});
