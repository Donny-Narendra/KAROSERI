import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SAInventoryPanel } from '../SAInventoryPanel';
import { inventoryService } from '../../services/inventoryService';

vi.mock('../../services/inventoryService', () => ({
  inventoryService: {
    getMaterials: vi.fn(),
    getMaterialAuditLogs: vi.fn(),
    updateMaterialWithAudit: vi.fn(),
  },
}));

describe('Component: SAInventoryPanel (Barcode Field Integration)', () => {
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
    (inventoryService.getMaterialAuditLogs as any).mockResolvedValue([]);
  });

  it('renders BARCODE header and displays barcode badge or dash in table', async () => {
    render(<SAInventoryPanel />);

    await waitFor(() => {
      expect(screen.getByText('BAUT 12 3CM')).toBeInTheDocument();
    });

    expect(screen.getByText('BARCODE')).toBeInTheDocument();
    expect(screen.getByText('899000123')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('populates barcode in edit modal and updates via inventoryService.updateMaterialWithAudit', async () => {
    (inventoryService.updateMaterialWithAudit as any).mockResolvedValue({
      ...mockMaterials[0],
      barcode: '899000999',
    });

    render(<SAInventoryPanel />);

    await waitFor(() => {
      expect(screen.getByText('BAUT 12 3CM')).toBeInTheDocument();
    });

    // Click Edit button on the first item
    const editBtns = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editBtns[0]);

    expect(screen.getByText('Edit Material')).toBeInTheDocument();

    const barcodeInput = screen.getByPlaceholderText('Contoh: 899123456789 atau BRG-001') as HTMLInputElement;
    expect(barcodeInput.value).toBe('899000123');

    fireEvent.change(barcodeInput, { target: { value: '899000999' } });

    const notesInput = screen.getByPlaceholderText(/Stok diubah setelah opname fisik/i);
    fireEvent.change(notesInput, { target: { value: 'Update barcode' } });

    const simpanBtn = screen.getByRole('button', { name: /Simpan & Catat Audit/i });
    fireEvent.click(simpanBtn);

    await waitFor(() => {
      expect(inventoryService.updateMaterialWithAudit).toHaveBeenCalledWith(
        'mat-1',
        expect.objectContaining({
          barcode: '899000999',
        }),
        expect.any(String),
        'Update barcode',
        expect.objectContaining({
          barcode: '899000123',
        })
      );
    });
  });
});
