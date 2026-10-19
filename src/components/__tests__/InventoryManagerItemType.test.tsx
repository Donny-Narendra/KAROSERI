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

describe('Component: InventoryManager (Item Type Configuration & Persistence)', () => {
  const mockMaterials = [
    {
      id: 'mat-1',
      name: 'Besi UNP 100',
      unit: 'batang',
      current_stock: 50,
      minimum_stock: 10,
      unit_price: 350000,
      cost_price: 280000,
      selling_price: 350000,
      waste_factor_percentage: 5,
      item_type: 'MATERIAL' as const,
    },
    {
      id: 'mat-2',
      name: 'Tukang Cat Body Halus',
      unit: 'lot',
      current_stock: 0,
      minimum_stock: 0,
      unit_price: 850000,
      cost_price: 850000,
      selling_price: 850000,
      waste_factor_percentage: 0,
      item_type: 'LABOR' as const,
    },
    {
      id: 'mat-3',
      name: 'Listrik & Kompresor Workshop',
      unit: 'hari',
      current_stock: 0,
      minimum_stock: 0,
      unit_price: 150000,
      cost_price: 150000,
      selling_price: 150000,
      waste_factor_percentage: 0,
      item_type: 'OVERHEAD' as const,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (inventoryService.getMaterials as any).mockResolvedValue(mockMaterials);
  });

  it('renders inventory table with item_type badges for Material, Jasa, and Overhead', async () => {
    render(<InventoryManager />);

    await waitFor(() => {
      expect(screen.getByText('Besi UNP 100')).toBeInTheDocument();
    });

    expect(screen.getByText('Tukang Cat Body Halus')).toBeInTheDocument();
    expect(screen.getByText('Listrik & Kompresor Workshop')).toBeInTheDocument();

    // Badges in table
    expect(screen.getByText('Material')).toBeInTheDocument();
    expect(screen.getByText('Jasa (Labor)')).toBeInTheDocument();
    expect(screen.getByText('Overhead')).toBeInTheDocument();
  });

  it('provides Tipe Item dropdown with [ Material (Fisik) | Jasa (Labor) | Overhead (Utilitas/Bay) ] when creating new material', async () => {
    render(<InventoryManager />);

    await waitFor(() => {
      expect(screen.getByText('Besi UNP 100')).toBeInTheDocument();
    });

    // Click Tambah button
    const tambahBtn = screen.getByRole('button', { name: /Tambah/i });
    fireEvent.click(tambahBtn);

    // Modal title
    expect(screen.getByText('Tambah Material Baru')).toBeInTheDocument();

    // Tipe Item select dropdown
    const select = screen.getByLabelText('Tipe Item') as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe('MATERIAL');

    // Verify all 3 options exist
    const options = Array.from(select.options).map(opt => ({ value: opt.value, text: opt.text }));
    expect(options).toEqual([
      { value: 'MATERIAL', text: 'Material (Fisik)' },
      { value: 'LABOR', text: 'Jasa (Labor)' },
      { value: 'OVERHEAD', text: 'Overhead (Utilitas/Bay)' },
    ]);

    // Select Jasa (Labor)
    fireEvent.change(select, { target: { value: 'LABOR' } });
    expect(select.value).toBe('LABOR');

    // Fill other required fields
    const nameInput = screen.getByLabelText(/Nama Barang \/ Jasa/i);
    fireEvent.change(nameInput, { target: { value: 'Tukang Fabrikasi Sasis' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Simpan/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(inventoryService.addMaterial).toHaveBeenCalledTimes(1);
    });

    const submittedData = (inventoryService.addMaterial as any).mock.calls[0][0];
    expect(submittedData.name).toBe('Tukang Fabrikasi Sasis');
    expect(submittedData.item_type).toBe('LABOR');
  });

  it('pre-populates existing item_type when editing and saves updated item_type to materials.item_type', async () => {
    render(<InventoryManager />);

    await waitFor(() => {
      expect(screen.getByText('Listrik & Kompresor Workshop')).toBeInTheDocument();
    });

    // Find the edit button for 'Listrik & Kompresor Workshop'
    const editBtns = screen.getAllByTitle('Edit');
    // Third row is mat-3 (OVERHEAD)
    fireEvent.click(editBtns[2]);

    expect(screen.getByText('Edit Material')).toBeInTheDocument();

    const select = screen.getByLabelText('Tipe Item') as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe('OVERHEAD');

    // Change to Jasa (Labor)
    fireEvent.change(select, { target: { value: 'LABOR' } });
    expect(select.value).toBe('LABOR');

    // Submit edit
    const submitBtn = screen.getByRole('button', { name: /Simpan/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(inventoryService.updateMaterial).toHaveBeenCalledTimes(1);
    });

    const [updatedId, updatedData] = (inventoryService.updateMaterial as any).mock.calls[0];
    expect(updatedId).toBe('mat-3');
    expect(updatedData.item_type).toBe('LABOR');
  });
});
