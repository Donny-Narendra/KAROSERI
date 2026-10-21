import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChangeOrderPackageModal } from '../ChangeOrderPackageModal';
import { packageService } from '../../services/packageService';
import type { ProductPackage } from '../../types/package';

vi.mock('../../services/packageService', () => ({
  packageService: {
    getPackages: vi.fn(),
  },
}));

describe('Component: ChangeOrderPackageModal (Product Package BOM Explosion in Change Order)', () => {
  const mockPackages: ProductPackage[] = [
    {
      id: 'pkg-1',
      name: 'Paket Variasi Slebor Komplit',
      selling_price: 2500000,
      items: [
        {
          id: 'pi-1',
          item_type: 'MATERIAL',
          material_id: 'mat-plat-1',
          labor_name: null,
          quantity: 2,
          cost_per_unit: 400000,
          material: {
            id: 'mat-plat-1',
            name: 'Plat Besi Slebor 2.5mm',
            unit: 'lembar',
            unit_price: 500000,
            selling_price: 500000,
            cost_price: 400000,
            current_stock: 20,
            minimum_stock: 0,
            waste_factor_percentage: 0,
            category: 'RAW_MATERIAL',
            item_type: 'MATERIAL',
          },
          default_wbs_allocation: {
            'Sasis/Rangka': 2,
          },
        },
        {
          id: 'pi-2',
          item_type: 'LABOR',
          material_id: 'mat-labor-1',
          labor_name: 'Tukang Las Slebor',
          quantity: 3,
          cost_per_unit: 100000,
          material: {
            id: 'mat-labor-1',
            name: 'Tukang Las Slebor',
            unit: 'jam',
            unit_price: 150000,
            selling_price: 150000,
            cost_price: 100000,
            current_stock: 99,
            minimum_stock: 0,
            waste_factor_percentage: 0,
            category: 'labor',
            item_type: 'LABOR',
          },
          default_wbs_allocation: {
            'Dinding/Fabrikasi': 3,
          },
        },
      ],
    },
    {
      id: 'pkg-2',
      name: 'Paket Hidrolik Tambahan',
      selling_price: 7000000,
      items: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render anything when isOpen is false', () => {
    const { container } = render(
      <ChangeOrderPackageModal
        isOpen={false}
        onClose={vi.fn()}
        onApply={vi.fn()}
        packages={mockPackages}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders modal with title, package selector, and BOM preview when isOpen is true', () => {
    render(
      <ChangeOrderPackageModal
        isOpen={true}
        onClose={vi.fn()}
        onApply={vi.fn()}
        packages={mockPackages}
      />
    );

    expect(screen.getByText('Tambah Paket Barang Jadi (Assembly List)')).toBeInTheDocument();
    expect(screen.getByText('BOM Explosion')).toBeInTheDocument();
    expect(screen.getAllByText(/Paket Variasi Slebor Komplit/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Plat Besi Slebor 2.5mm')).toBeInTheDocument();
    expect(screen.getByText('Tukang Las Slebor')).toBeInTheDocument();
  });

  it('fetches packages via packageService if packages prop is not supplied', async () => {
    vi.mocked(packageService.getPackages).mockResolvedValue(mockPackages);

    render(
      <ChangeOrderPackageModal
        isOpen={true}
        onClose={vi.fn()}
        onApply={vi.fn()}
      />
    );

    expect(packageService.getPackages).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getAllByText(/Paket Variasi Slebor Komplit/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('supports switching between Single WBS Target and Multi-WBS distribution', () => {
    render(
      <ChangeOrderPackageModal
        isOpen={true}
        onClose={vi.fn()}
        onApply={vi.fn()}
        packages={mockPackages}
      />
    );

    // Default mode is Single WBS Target
    expect(screen.getByText('Single WBS Target')).toHaveClass('bg-primary');
    // In Single WBS mode, all preview items should show the single stage
    const singleStageDropdown = screen.getByDisplayValue('WBS 2: Sasis/Rangka');
    expect(singleStageDropdown).toBeInTheDocument();

    // Click Multi-WBS
    const multiBtn = screen.getByText('Multi-WBS (Distribusi Otomatis)');
    fireEvent.click(multiBtn);

    expect(multiBtn).toHaveClass('bg-primary');
    expect(screen.getByText(/Mode Multi-WBS Aktif/)).toBeInTheDocument();
    // In Multi-WBS mode, Plat is in WBS 2 and Labor is in WBS 3 (Dinding/Fabrikasi)
    expect(screen.getByText('WBS 3: Dinding/Fabrikasi')).toBeInTheDocument();
  });

  it('updates quantities when package multiplier changes', () => {
    render(
      <ChangeOrderPackageModal
        isOpen={true}
        onClose={vi.fn()}
        onApply={vi.fn()}
        packages={mockPackages}
      />
    );

    const qtyInput = screen.getByRole('spinbutton');
    fireEvent.change(qtyInput, { target: { value: '2' } });

    // Multiplier is 2, so Plat quantity becomes 2 * 2 = 4, Labor quantity becomes 3 * 2 = 6
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('calls onApply with exploded draft items when clicking "Terapkan ke Change Order"', () => {
    const handleApply = vi.fn();
    const handleClose = vi.fn();

    render(
      <ChangeOrderPackageModal
        isOpen={true}
        onClose={handleClose}
        onApply={handleApply}
        packages={mockPackages}
      />
    );

    const applyButton = screen.getByRole('button', { name: /Terapkan.*ke Change Order/i });
    expect(applyButton).toBeEnabled();

    fireEvent.click(applyButton);

    expect(handleApply).toHaveBeenCalledTimes(1);
    const appliedItems = handleApply.mock.calls[0][0];
    expect(appliedItems).toHaveLength(2);
    expect(appliedItems[0].item_name).toBe('Plat Besi Slebor 2.5mm');
    expect(appliedItems[0].item_type).toBe('MATERIAL');
    expect(appliedItems[0].quantity).toBe(2);
    expect(appliedItems[1].item_name).toBe('Tukang Las Slebor');
    expect(appliedItems[1].item_type).toBe('LABOR');
    expect(appliedItems[1].quantity).toBe(3);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('closes modal when Batal or X button is clicked', () => {
    const handleClose = vi.fn();

    render(
      <ChangeOrderPackageModal
        isOpen={true}
        onClose={handleClose}
        onApply={vi.fn()}
        packages={mockPackages}
      />
    );

    const batalButton = screen.getByRole('button', { name: 'Batal' });
    fireEvent.click(batalButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('closes modal when Escape key is pressed', () => {
    const handleClose = vi.fn();

    render(
      <ChangeOrderPackageModal
        isOpen={true}
        onClose={handleClose}
        onApply={vi.fn()}
        packages={mockPackages}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
