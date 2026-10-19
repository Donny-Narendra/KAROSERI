import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PackageAllocationModal } from '../PackageAllocationModal';
import type { ProductPackage } from '../../types/package';

describe('Component: PackageAllocationModal (Assembly Package item_type Propagation)', () => {
  const mockPackage: ProductPackage = {
    id: 'pkg-1',
    name: 'Paket Box Besi Standar',
    selling_price: 35000000,
    items: [
      {
        id: 'pi-1',
        package_id: 'pkg-1',
        item_type: 'MATERIAL',
        material_id: 'mat-1',
        labor_name: null,
        quantity: 10,
        cost_per_unit: 150000,
        material: {
          id: 'mat-1',
          name: 'Pipa Seamless 2 inch',
          unit: 'btg',
          unit_price: 150000,
          category: 'Bahan Besi',
          waste_factor_percentage: 5,
          current_stock: 50,
          minimum_stock: 10,
          item_type: 'MATERIAL',
        },
      },
      {
        id: 'pi-2',
        package_id: 'pkg-1',
        item_type: 'LABOR',
        material_id: 'mat-2',
        labor_name: null,
        quantity: 1,
        cost_per_unit: 900000,
        material: {
          id: 'mat-2',
          name: 'TUKANG CAT BAK',
          unit: 'lot',
          unit_price: 900000,
          category: 'General',
          waste_factor_percentage: 0,
          current_stock: 0,
          minimum_stock: 0,
          item_type: 'LABOR',
        },
      },
      {
        id: 'pi-3',
        package_id: 'pkg-1',
        item_type: 'LABOR',
        material_id: 'mat-3',
        labor_name: null,
        quantity: 1,
        cost_per_unit: 1000000,
        material: {
          id: 'mat-3',
          name: 'TUKANG RANGKA BAK',
          unit: 'lot',
          unit_price: 1000000,
          category: 'General',
          waste_factor_percentage: 0,
          current_stock: 0,
          minimum_stock: 0,
          item_type: 'LABOR',
        },
      },
      {
        id: 'pi-4',
        package_id: 'pkg-1',
        item_type: 'OVERHEAD',
        material_id: 'mat-4',
        labor_name: null,
        quantity: 2,
        cost_per_unit: 150000,
        material: {
          id: 'mat-4',
          name: 'LISTRIK WORKSHOP',
          unit: 'hari',
          unit_price: 150000,
          category: 'Overhead',
          waste_factor_percentage: 0,
          current_stock: 0,
          minimum_stock: 0,
          item_type: 'OVERHEAD',
        },
      },
    ],
  };

  it('renders all package components with accurate item names and type labels', () => {
    render(
      <PackageAllocationModal
        packageData={mockPackage}
        isOpen={true}
        onClose={vi.fn()}
        onApply={vi.fn()}
      />
    );

    expect(screen.getByText('Paket Box Besi Standar')).toBeInTheDocument();
    expect(screen.getByText('Pipa Seamless 2 inch')).toBeInTheDocument();
    expect(screen.getByText('TUKANG CAT BAK')).toBeInTheDocument();
    expect(screen.getByText('TUKANG RANGKA BAK')).toBeInTheDocument();
    expect(screen.getByText('LISTRIK WORKSHOP')).toBeInTheDocument();

    // Check type labels
    expect(screen.getByText('MATERIAL')).toBeInTheDocument();
    expect(screen.getAllByText('LABOR').length).toBe(2);
    expect(screen.getByText('OVERHEAD')).toBeInTheDocument();
  });

  it('correctly maps allocated labor items to type = "labor" and strips materialId', () => {
    const handleApply = vi.fn();

    render(
      <PackageAllocationModal
        packageData={mockPackage}
        isOpen={true}
        onClose={vi.fn()}
        onApply={handleApply}
      />
    );

    // Get input fields for all items
    // Row 0: Pipa Seamless (10 qty) -> allocate 10 to WBS 1 (Pembongkaran)
    // Row 1: TUKANG CAT BAK (1 qty) -> allocate 1 to WBS 4 (Cat/Finishing)
    // Row 2: TUKANG RANGKA BAK (1 qty) -> allocate 1 to WBS 2 (Sasis/Rangka)
    // Row 3: LISTRIK WORKSHOP (2 qty) -> allocate 2 to WBS 3 (Dinding/Fabrikasi)
    const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    
    // There are 4 items * 5 WBS categories = 20 inputs
    expect(inputs.length).toBe(20);

    // Allocate Row 0: WBS 1 (index 0) = 10
    fireEvent.change(inputs[0], { target: { value: '10' } });
    // Allocate Row 1: WBS 4 (index 8 = 1*5 + 3) = 1
    fireEvent.change(inputs[8], { target: { value: '1' } });
    // Allocate Row 2: WBS 2 (index 11 = 2*5 + 1) = 1
    fireEvent.change(inputs[11], { target: { value: '1' } });
    // Allocate Row 3: WBS 3 (index 17 = 3*5 + 2) = 2
    fireEvent.change(inputs[17], { target: { value: '2' } });

    // Click apply button
    const applyButton = screen.getByRole('button', { name: /Terapkan ke RAB/i });
    fireEvent.click(applyButton);

    expect(handleApply).toHaveBeenCalledTimes(1);
    const [payloads, isComplete] = handleApply.mock.calls[0];

    expect(isComplete).toBe(true);
    expect(payloads.length).toBe(4);

    // Material item
    const matPayload = payloads.find((p: any) => p.description === 'Pipa Seamless 2 inch');
    expect(matPayload).toBeDefined();
    expect(matPayload.type).toBe('material');
    expect(matPayload.materialId).toBe('mat-1');
    expect(matPayload.qty).toBe(10);
    expect(matPayload.wbsCategory).toBe('Pembongkaran');

    // Labor item 1: TUKANG CAT BAK
    const catPayload = payloads.find((p: any) => p.description === 'TUKANG CAT BAK');
    expect(catPayload).toBeDefined();
    expect(catPayload.type).toBe('labor');
    expect(catPayload.materialId).toBeUndefined(); // Must not bind physical materialId
    expect(catPayload.qty).toBe(1);
    expect(catPayload.wbsCategory).toBe('Cat/Finishing');

    // Labor item 2: TUKANG RANGKA BAK
    const rangkaPayload = payloads.find((p: any) => p.description === 'TUKANG RANGKA BAK');
    expect(rangkaPayload).toBeDefined();
    expect(rangkaPayload.type).toBe('labor');
    expect(rangkaPayload.materialId).toBeUndefined();
    expect(rangkaPayload.qty).toBe(1);
    expect(rangkaPayload.wbsCategory).toBe('Sasis/Rangka');

    // Overhead item: LISTRIK WORKSHOP
    const overheadPayload = payloads.find((p: any) => p.description === 'LISTRIK WORKSHOP');
    expect(overheadPayload).toBeDefined();
    expect(overheadPayload.type).toBe('overhead');
    expect(overheadPayload.materialId).toBeUndefined();
    expect(overheadPayload.qty).toBe(2);
    expect(overheadPayload.wbsCategory).toBe('Dinding/Fabrikasi');
  });

  it('heurstically resolves labor item_type if package item had legacy MATERIAL item_type', () => {
    const handleApply = vi.fn();
    const legacyPackage: ProductPackage = {
      id: 'pkg-legacy',
      name: 'Legacy Package',
      selling_price: 10000000,
      items: [
        {
          id: 'pi-leg-1',
          package_id: 'pkg-legacy',
          item_type: 'MATERIAL', // Old corrupt value!
          material_id: 'mat-tukang-las',
          labor_name: null,
          quantity: 1,
          cost_per_unit: 450000,
          material: {
            id: 'mat-tukang-las',
            name: 'TUKANG LAS RANGKA',
            unit: 'lot',
            unit_price: 450000,
            category: 'General',
            waste_factor_percentage: 0,
            current_stock: 0,
            minimum_stock: 0,
          },
        },
      ],
    };

    render(
      <PackageAllocationModal
        packageData={legacyPackage}
        isOpen={true}
        onClose={vi.fn()}
        onApply={handleApply}
      />
    );

    const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    fireEvent.change(inputs[1], { target: { value: '1' } }); // WBS 2

    const applyButton = screen.getByRole('button', { name: /Terapkan ke RAB/i });
    fireEvent.click(applyButton);

    expect(handleApply).toHaveBeenCalledTimes(1);
    const [payloads] = handleApply.mock.calls[0];

    expect(payloads[0].type).toBe('labor');
    expect(payloads[0].description).toBe('TUKANG LAS RANGKA');
    expect(payloads[0].materialId).toBeUndefined();
  });
});
