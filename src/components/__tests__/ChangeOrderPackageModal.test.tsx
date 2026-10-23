import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChangeOrderPackageModal } from '../ChangeOrderPackageModal';
import { packageService } from '../../services/packageService';
import type { ProductPackage } from '../../types/package';

vi.mock('../../services/packageService', () => ({
  packageService: {
    getPackages: vi.fn(),
    updatePackageItemDefaultAllocation: vi.fn(),
  },
}));

describe('Component: ChangeOrderPackageModal (Per-Component WBS Allocation Matrix)', () => {
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
      name: 'PAKET MATERIAL EX CUBE',
      selling_price: 7000000,
      items: [
        {
          id: 'pi-cube-1',
          item_type: 'MATERIAL',
          material_id: 'mat-tes-2',
          quantity: 5,
          cost_per_unit: 200000,
          material: {
            id: 'mat-tes-2',
            name: 'material tes 2',
            unit: 'pcs',
            unit_price: 300000,
            selling_price: 300000,
            cost_price: 200000,
            current_stock: 50,
            minimum_stock: 0,
            waste_factor_percentage: 0,
            category: 'RAW_MATERIAL',
            item_type: 'MATERIAL',
          },
          default_wbs_allocation: {},
        },
      ],
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

  it('renders modal with title, package selector, and WBS allocation matrix when isOpen is true', () => {
    render(
      <ChangeOrderPackageModal
        isOpen={true}
        onClose={vi.fn()}
        onApply={vi.fn()}
        packages={mockPackages}
      />
    );

    expect(screen.getByText('Tambah Paket Barang Jadi (Assembly List)')).toBeInTheDocument();
    expect(screen.getByText('Matriks Alokasi WBS')).toBeInTheDocument();
    expect(screen.getAllByText(/Paket Variasi Slebor Komplit/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Plat Besi Slebor 2.5mm')).toBeInTheDocument();
    expect(screen.getByText('Tukang Las Slebor')).toBeInTheDocument();

    // Verify WBS headers 1 through 5
    expect(screen.getByText('WBS 1')).toBeInTheDocument();
    expect(screen.getByText('WBS 2')).toBeInTheDocument();
    expect(screen.getByText('WBS 3')).toBeInTheDocument();
    expect(screen.getByText('WBS 4')).toBeInTheDocument();
    expect(screen.getByText('WBS 5')).toBeInTheDocument();
    expect(screen.getByText('Sisa')).toBeInTheDocument();
  });

  it('preselects package matching selectedPackageId prop instead of defaulting to first package', () => {
    render(
      <ChangeOrderPackageModal
        isOpen={true}
        onClose={vi.fn()}
        onApply={vi.fn()}
        packages={mockPackages}
        selectedPackageId="pkg-2"
      />
    );

    const select = screen.getByLabelText(/Pilih Paket Barang Jadi \(Master BOM\)/i) as HTMLSelectElement;
    expect(select.value).toBe('pkg-2');

    // Content of pkg-2 should be rendered
    expect(screen.getByText('material tes 2')).toBeInTheDocument();
  });

  it('fetches packages via packageService if packages prop is not supplied', async () => {
    vi.mocked(packageService.getPackages).mockResolvedValue(mockPackages);

    render(
      <ChangeOrderPackageModal
        isOpen={true}
        onClose={vi.fn()}
        onApply={vi.fn()}
        selectedPackageId="pkg-2"
      />
    );

    expect(packageService.getPackages).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByText('material tes 2')).toBeInTheDocument();
    });
  });

  it('prepopulates allocations from default_wbs_allocation template', () => {
    render(
      <ChangeOrderPackageModal
        isOpen={true}
        onClose={vi.fn()}
        onApply={vi.fn()}
        packages={mockPackages}
        selectedPackageId="pkg-1"
      />
    );

    // Plat has default_wbs_allocation of 2 in Sasis/Rangka (WBS 2)
    const platWbs2Input = screen.getByLabelText('Plat Besi Slebor 2.5mm WBS 2') as HTMLInputElement;
    expect(platWbs2Input.value).toBe('2');

    // Tukang Las has default_wbs_allocation of 3 in Dinding/Fabrikasi (WBS 3)
    const laborWbs3Input = screen.getByLabelText('Tukang Las Slebor WBS 3') as HTMLInputElement;
    expect(laborWbs3Input.value).toBe('3');

    // Both are fully allocated so status badges show PASSED
    const passedBadges = screen.getAllByText('PASSED');
    expect(passedBadges).toHaveLength(2);
  });

  it('updates total quota and scales allocations when package multiplier changes', () => {
    render(
      <ChangeOrderPackageModal
        isOpen={true}
        onClose={vi.fn()}
        onApply={vi.fn()}
        packages={mockPackages}
        selectedPackageId="pkg-1"
      />
    );

    const multiplierInput = screen.getByLabelText(/Jumlah \/ Paket Qty/i);
    fireEvent.change(multiplierInput, { target: { value: '2' } });

    // Plat: base 2 * 2 = 4; Labor: base 3 * 2 = 6
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();

    const platWbs2Input = screen.getByLabelText('Plat Besi Slebor 2.5mm WBS 2') as HTMLInputElement;
    expect(platWbs2Input.value).toBe('4');

    const laborWbs3Input = screen.getByLabelText('Tukang Las Slebor WBS 3') as HTMLInputElement;
    expect(laborWbs3Input.value).toBe('6');
  });

  it('explodes component across multiple WBS stages into separate Change Order items on apply', () => {
    const handleApply = vi.fn();
    const handleClose = vi.fn();

    render(
      <ChangeOrderPackageModal
        isOpen={true}
        onClose={handleClose}
        onApply={handleApply}
        packages={mockPackages}
        selectedPackageId="pkg-2"
      />
    );

    // pkg-2 has 'material tes 2' with quota 5 and no default allocation
    // Initially sisa is 5.00
    expect(screen.getByText('Sisa: 5.00')).toBeInTheDocument();

    // Allocate 2 to WBS 2 and 3 to WBS 3
    const wbs2Input = screen.getByLabelText('material tes 2 WBS 2');
    const wbs3Input = screen.getByLabelText('material tes 2 WBS 3');

    fireEvent.change(wbs2Input, { target: { value: '2' } });
    fireEvent.change(wbs3Input, { target: { value: '3' } });

    // Now Sisa should be 0 and badge PASSED
    expect(screen.getByText('PASSED')).toBeInTheDocument();

    // Click "Terapkan Item ke Change Order"
    const applyButton = screen.getByRole('button', { name: /Terapkan.*ke Change Order/i });
    expect(applyButton).toBeEnabled();

    fireEvent.click(applyButton);

    expect(handleApply).toHaveBeenCalledTimes(1);
    const appliedItems = handleApply.mock.calls[0][0];

    // Should explode into 2 items for material tes 2
    expect(appliedItems).toHaveLength(2);

    expect(appliedItems[0].item_name).toBe('material tes 2');
    expect(appliedItems[0].wbs_stage).toBe('WBS 2: Sasis/Rangka');
    expect(appliedItems[0].quantity).toBe(2);
    expect(appliedItems[0].item_type).toBe('MATERIAL');
    expect(appliedItems[0].package_source_id).toBe('pkg-2');

    expect(appliedItems[1].item_name).toBe('material tes 2');
    expect(appliedItems[1].wbs_stage).toBe('WBS 3: Dinding/Fabrikasi');
    expect(appliedItems[1].quantity).toBe(3);
    expect(appliedItems[1].item_type).toBe('MATERIAL');
    expect(appliedItems[1].package_source_id).toBe('pkg-2');

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('prevents applying when any component is over-allocated', () => {
    render(
      <ChangeOrderPackageModal
        isOpen={true}
        onClose={vi.fn()}
        onApply={vi.fn()}
        packages={mockPackages}
        selectedPackageId="pkg-2"
      />
    );

    // Over-allocate: quota is 5, but enter 6
    const wbs1Input = screen.getByLabelText('material tes 2 WBS 1');
    fireEvent.change(wbs1Input, { target: { value: '6' } });

    expect(screen.getByText('Over: 1.00')).toBeInTheDocument();
    expect(screen.getByText(/Terdapat item yang dialokasikan melebihi kuota/i)).toBeInTheDocument();

    const applyButton = screen.getByRole('button', { name: /Terapkan.*ke Change Order/i });
    expect(applyButton).toBeDisabled();
  });

  it('assigns unique package_instance_id and generates distinct item IDs on apply', () => {
    const handleApply = vi.fn();
    render(
      <ChangeOrderPackageModal
        isOpen={true}
        onClose={vi.fn()}
        onApply={handleApply}
        packages={mockPackages}
        selectedPackageId="pkg-1"
      />
    );

    const applyButton = screen.getByRole('button', { name: /Terapkan.*ke Change Order/i });
    expect(applyButton).toBeEnabled();

    fireEvent.click(applyButton);

    expect(handleApply).toHaveBeenCalledTimes(1);
    const appliedItems = handleApply.mock.calls[0][0];
    expect(appliedItems).toHaveLength(2);

    // Verify package_instance_id is set and identical across all items in this session
    expect(appliedItems[0].package_instance_id).toBeDefined();
    expect(typeof appliedItems[0].package_instance_id).toBe('string');
    expect(appliedItems[0].package_instance_id).toBe(appliedItems[1].package_instance_id);

    // Verify distinct individual item IDs
    expect(appliedItems[0].id).toBeDefined();
    expect(appliedItems[1].id).toBeDefined();
    expect(appliedItems[0].id).not.toBe(appliedItems[1].id);

    // Verify package metadata
    expect(appliedItems[0].package_source_id).toBe('pkg-1');
    expect(appliedItems[0].package_name).toBe('Paket Variasi Slebor Komplit');
    expect(appliedItems[0].notes).toContain('Paket Variasi Slebor Komplit');
  });

  it('enforces double-click guard and disables button showing "Memproses..." while applying', async () => {
    let finishAsyncApply: () => void = () => {};
    const asyncPromise = new Promise<void>((resolve) => {
      finishAsyncApply = resolve;
    });
    const handleApply = vi.fn().mockImplementation(() => asyncPromise);

    render(
      <ChangeOrderPackageModal
        isOpen={true}
        onClose={vi.fn()}
        onApply={handleApply}
        packages={mockPackages}
        selectedPackageId="pkg-1"
      />
    );

    const applyButton = screen.getByRole('button', { name: /Terapkan.*ke Change Order/i });
    expect(applyButton).toBeEnabled();

    // First click initiates apply
    fireEvent.click(applyButton);

    // Immediate second click must be guarded
    fireEvent.click(applyButton);

    // Button should now show loading text and be disabled
    expect(screen.getByText('Memproses...')).toBeInTheDocument();
    expect(applyButton).toBeDisabled();

    // Resolve the async operation
    finishAsyncApply();
    await waitFor(() => {
      expect(handleApply).toHaveBeenCalledTimes(1);
    });
  });

  it('ensures all product packages in dropdown remain enabled and selectable', () => {
    render(
      <ChangeOrderPackageModal
        isOpen={true}
        onClose={vi.fn()}
        onApply={vi.fn()}
        packages={mockPackages}
        selectedPackageId="pkg-1"
      />
    );

    const select = screen.getByLabelText(/Pilih Paket Barang Jadi/i) as HTMLSelectElement;
    const options = Array.from(select.querySelectorAll('option:not([disabled])'));
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveValue('pkg-1');
    expect(options[1]).toHaveValue('pkg-2');
    options.forEach(opt => {
      expect((opt as HTMLOptionElement).disabled).toBe(false);
    });
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
