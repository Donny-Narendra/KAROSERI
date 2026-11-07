import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InventoryManager } from '../InventoryManager';
import { inventoryService } from '../../services/inventoryService';

vi.mock('../../services/inventoryService', () => ({
  inventoryService: {
    getMaterials: vi.fn(),
    addMaterial: vi.fn(),
    updateMaterial: vi.fn(),
    deleteMaterial: vi.fn(),
    checkMaterialUsage: vi.fn(),
    bulkDeleteMaterials: vi.fn(),
  },
}));

describe('Component: InventoryManager (Barcode Field Integration)', () => {
  const mockMaterials = [
    {
      id: 'mat-1',
      name: 'BAUT 12 3CM',
      barcode: '899000123',
      unit: 'pcs',
      current_stock: 100,
      minimum_stock: 10,
      unit_price: 2500,
      cost_price: 1800,
      selling_price: 2500,
      waste_factor_percentage: 2,
      item_type: 'MATERIAL' as const,
    },
    {
      id: 'mat-2',
      name: 'PLAT BESI 1.2MM',
      barcode: null,
      unit: 'lembar',
      current_stock: 15,
      minimum_stock: 2,
      unit_price: 320000,
      cost_price: 270000,
      selling_price: 320000,
      waste_factor_percentage: 5,
      item_type: 'MATERIAL' as const,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (inventoryService.getMaterials as any).mockResolvedValue(mockMaterials);
  });

  it('renders barcode badge in inventory table when item has barcode', async () => {
    render(<InventoryManager />);

    await waitFor(() => {
      expect(screen.getByText('BAUT 12 3CM')).toBeInTheDocument();
    });

    expect(screen.getByText('899000123')).toBeInTheDocument();
    expect(screen.getByText('BARCODE:')).toBeInTheDocument();
  });

  it('filters table by barcode search term', async () => {
    render(<InventoryManager />);

    await waitFor(() => {
      expect(screen.getByText('BAUT 12 3CM')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Cari material...');
    fireEvent.change(searchInput, { target: { value: '899000123' } });

    expect(screen.getByText('BAUT 12 3CM')).toBeInTheDocument();
    expect(screen.queryByText('PLAT BESI 1.2MM')).not.toBeInTheDocument();
  });

  it('submits new material with barcode to inventoryService.addMaterial', async () => {
    (inventoryService.addMaterial as any).mockResolvedValue({
      id: 'mat-new',
      name: 'ENGSEL BESI',
      barcode: '899999000',
    });

    render(<InventoryManager />);

    await waitFor(() => {
      expect(screen.getByText('BAUT 12 3CM')).toBeInTheDocument();
    });

    // Click Tambah button
    const tambahBtn = screen.getByRole('button', { name: /tambah/i });
    fireEvent.click(tambahBtn);

    // Modal opens
    expect(screen.getByText('Tambah Material Baru')).toBeInTheDocument();

    const barcodeInput = screen.getByPlaceholderText('Contoh: 899123456789 atau BRG-001');
    const nameInput = screen.getByLabelText(/Nama Barang \/ Jasa/i);

    fireEvent.change(barcodeInput, { target: { value: '899999000' } });
    fireEvent.change(nameInput, { target: { value: 'ENGSEL BESI' } });

    const form = barcodeInput.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(inventoryService.addMaterial).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ENGSEL BESI',
          barcode: '899999000',
        })
      );
    });
  });

  it('populates barcode in edit modal and updates via inventoryService.updateMaterial', async () => {
    (inventoryService.updateMaterial as any).mockResolvedValue({
      ...mockMaterials[0],
      barcode: '899000999',
    });

    render(<InventoryManager />);

    await waitFor(() => {
      expect(screen.getByText('BAUT 12 3CM')).toBeInTheDocument();
    });

    // Click Edit button for first item
    const editBtns = screen.getAllByTitle('Edit');
    fireEvent.click(editBtns[0]);

    expect(screen.getByText('Edit Material')).toBeInTheDocument();

    const barcodeInput = screen.getByPlaceholderText('Contoh: 899123456789 atau BRG-001') as HTMLInputElement;
    expect(barcodeInput.value).toBe('899000123');

    fireEvent.change(barcodeInput, { target: { value: '899000999' } });

    const form = barcodeInput.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(inventoryService.updateMaterial).toHaveBeenCalledWith(
        'mat-1',
        expect.objectContaining({
          barcode: '899000999',
        })
      );
    });
  });
});
