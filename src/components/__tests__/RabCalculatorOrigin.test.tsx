import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { RabCalculator } from '../RabCalculator';

const mockRabItemsWithOrigin = [
  {
    id: 'item-pkg-1',
    wbs_category: 'Pembongkaran',
    item_type: 'MATERIAL',
    material_name: 'Pipa Seamless 2 inch',
    package_name: 'Paket Box Besi Standar',
    quantity: 10,
    unit_price: 150000,
    cost_price: 120000,
    item_total: 1500000,
  },
  {
    id: 'item-pkg-notes',
    wbs_category: 'Sasis/Rangka',
    item_type: 'LABOR',
    material_name: 'Jasa Las Sasis',
    notes: 'Paket: DUMP TRUCK HEAVY',
    quantity: 1,
    unit_price: 800000,
    cost_price: 600000,
    item_total: 800000,
  },
  {
    id: 'item-pkg-rel',
    wbs_category: 'Cat/Finishing',
    item_type: 'MATERIAL',
    material_name: 'Cat Epoxy Primer',
    package_id: 'pkg-cat-oven',
    quantity: 3,
    unit_price: 200000,
    cost_price: 160000,
    item_total: 600000,
  },
  {
    id: 'item-granular-1',
    wbs_category: 'Dinding/Fabrikasi',
    item_type: 'MATERIAL',
    material_name: 'Baut Hex 12mm',
    package_name: null,
    package_id: null,
    quantity: 50,
    unit_price: 2500,
    cost_price: 2000,
    item_total: 125000,
  },
];

const createDefaultFromMock = (table: string) => {
  if (table === 'workshop_settings') {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { bay_hourly_rate: 25000 }, error: null }),
    };
  }
  if (table === 'rab_estimations') {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'est-test-origin',
          total_material_cost: 2225000,
          total_labor_cost: 800000,
          total_overhead_cost: 0,
          total_estimated_cost: 3025000,
        },
        error: null,
      }),
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'est-test-origin' }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    };
  }
  if (table === 'spk') {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'spk-test-origin',
          spk_no: 'SPK-ORIGIN-001',
          customer_name: 'PT Karoseri Maju Bersama',
          vehicle_plate: 'B 8888 ABC',
          status: 'DRAFT',
          is_pricing_locked: false,
        },
        error: null,
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    };
  }
  if (table === 'rab_items') {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: mockRabItemsWithOrigin,
        error: null,
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    };
  }
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
};

vi.mock('../../lib/supabaseClient', () => {
  return {
    supabase: {
      from: vi.fn((table: string) => createDefaultFromMock(table)),
    },
  };
});

vi.mock('../../services/inventoryService', () => ({
  inventoryService: {
    getMaterials: vi.fn().mockResolvedValue([
      { id: 'mat-1', name: 'Pipa Seamless 2 inch', unit_price: 150000, cost_price: 120000, category: 'BAHAN BAKU' },
      { id: 'mat-2', name: 'Cat Epoxy Primer', unit_price: 200000, cost_price: 160000, category: 'CAT' },
      { id: 'mat-3', name: 'Baut Hex 12mm', unit_price: 2500, cost_price: 2000, category: 'CONSUMABLE' },
    ]),
  },
}));

vi.mock('../../services/packageService', () => ({
  packageService: {
    getPackages: vi.fn().mockResolvedValue([
      {
        id: 'pkg-cat-oven',
        name: 'PAKET PENGECATAN OVEN',
        selling_price: 600000,
        items: [],
      },
    ]),
    updatePackageItemDefaultAllocation: vi.fn().mockResolvedValue(true),
  },
}));

describe('Component: RabCalculator (Source Package / Granular Origin Column)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the new SUMBER / PAKET table header after DESCRIPTION', async () => {
    render(<RabCalculator spkId="spk-test-origin" />);

    await waitFor(() => {
      expect(screen.getByText(/SUMBER \/ PAKET/i)).toBeInTheDocument();
    });

    const tables = screen.getAllByRole('table');
    const estimationTable = tables[tables.length - 1];
    const headers = within(estimationTable).getAllByRole('columnheader');
    const headerTexts = headers.map(h => h.textContent?.trim());
    
    // Header order: No, Description, Sumber / Paket, Type, WBS, Qty, Harga Satuan, Harga Modal (HPP), Subtotal, Aksi / Status
    expect(headerTexts[0]).toMatch(/No/i);
    expect(headerTexts[1]).toMatch(/Description/i);
    expect(headerTexts[2]).toMatch(/Sumber \/ Paket/i);
    expect(headerTexts[3]).toMatch(/Type/i);
    expect(headerTexts[4]).toMatch(/WBS/i);
    expect(headerTexts[5]).toMatch(/Qty/i);
    expect(headerTexts[6]).toMatch(/Harga Satuan/i);
    expect(headerTexts[7]).toMatch(/Harga Modal \(HPP\)/i);
    expect(headerTexts[8]).toMatch(/Subtotal/i);
    expect(headerTexts[9]).toMatch(/Aksi \/ Status/i);
  });

  it('renders [ 📦 Paket: Nama Paket ] badge with amber theme when item has package_name', async () => {
    render(<RabCalculator spkId="spk-test-origin" />);

    await waitFor(() => {
      expect(screen.getByText('Pipa Seamless 2 inch')).toBeInTheDocument();
    });

    const pkgBadge = screen.getByTestId('badge-package-item-pkg-1');
    expect(pkgBadge).toBeInTheDocument();
    expect(pkgBadge).toHaveTextContent('📦');
    expect(pkgBadge).toHaveTextContent('Paket: Paket Box Besi Standar');
    expect(pkgBadge.className).toContain('text-amber-400');
    expect(pkgBadge.className).toContain('bg-amber-950/70');
  });

  it('renders [ 📦 Paket: ... ] badge when package is resolved from notes fallback', async () => {
    render(<RabCalculator spkId="spk-test-origin" />);

    await waitFor(() => {
      expect(screen.getByText('Jasa Las Sasis')).toBeInTheDocument();
    });

    const pkgBadge = screen.getByTestId('badge-package-item-pkg-notes');
    expect(pkgBadge).toBeInTheDocument();
    expect(pkgBadge).toHaveTextContent('📦');
    expect(pkgBadge).toHaveTextContent('Paket: DUMP TRUCK HEAVY');
  });

  it('renders [ 📦 Paket: ... ] badge when package is resolved from package_id relational lookup', async () => {
    render(<RabCalculator spkId="spk-test-origin" />);

    await waitFor(() => {
      expect(screen.getByText('Cat Epoxy Primer')).toBeInTheDocument();
    });

    const pkgBadge = screen.getByTestId('badge-package-item-pkg-rel');
    expect(pkgBadge).toBeInTheDocument();
    expect(pkgBadge).toHaveTextContent('📦');
    expect(pkgBadge).toHaveTextContent('Paket: PAKET PENGECATAN OVEN');
  });

  it('renders [ 📋 Granular ] badge with slate/cyan theme when item has no package metadata', async () => {
    render(<RabCalculator spkId="spk-test-origin" />);

    await waitFor(() => {
      expect(screen.getByText('Baut Hex 12mm')).toBeInTheDocument();
    });

    const granularBadge = screen.getByTestId('badge-granular-item-granular-1');
    expect(granularBadge).toBeInTheDocument();
    expect(granularBadge).toHaveTextContent('📋');
    expect(granularBadge).toHaveTextContent('Granular');
    expect(granularBadge.className).toContain('text-slate-300');
    expect(granularBadge.className).toContain('bg-slate-800/80');
  });

  it('renders [ 📋 Granular ] badge on newly added manual labor item', async () => {
    render(<RabCalculator spkId="spk-test-origin" />);

    await waitFor(() => {
      expect(screen.getByText('Baut Hex 12mm')).toBeInTheDocument();
    });

    // Switch to Labor mode
    fireEvent.click(screen.getByRole('button', { name: /Jasa \/ Tukang/i }));

    // Fill labor name & price
    const nameInput = screen.getByPlaceholderText(/misal: Jasa Tukang Las Sasis/i);
    fireEvent.change(nameInput, { target: { value: 'Jasa Pasang Engsel Manual' } });

    const priceInput = screen.getByPlaceholderText(/Tarif yang ditagihkan di SPK/i);
    fireEvent.change(priceInput, { target: { value: '350000' } });

    // Click submit
    fireEvent.click(screen.getByRole('button', { name: /Tambah Jasa ke RAB/i }));

    await waitFor(() => {
      expect(screen.getByText('Jasa Pasang Engsel Manual')).toBeInTheDocument();
    });

    const row = screen.getByText('Jasa Pasang Engsel Manual').closest('tr')!;
    const granularBadge = within(row).getByText(/Granular/i);
    expect(granularBadge).toBeInTheDocument();
    expect(within(row).getByText('📋')).toBeInTheDocument();
  });

  it('renders segregated 3-pillar profit breakdown in the financial footer below Margin (Profit)', async () => {
    render(<RabCalculator spkId="spk-test-origin" />);

    await waitFor(() => {
      expect(screen.getByText('Baut Hex 12mm')).toBeInTheDocument();
    });

    // Check financial footer segregated profit labels
    expect(screen.getByText(/Profit Paket Barang Jadi \(Karya Assembly\):/i)).toBeInTheDocument();
    expect(screen.getByText(/Profit Penjualan Material Granular:/i)).toBeInTheDocument();
    expect(screen.getByText(/Profit Jasa & Overhead Bebas:/i)).toBeInTheDocument();
    expect(screen.getByText(/TOTAL MARGIN \(PROFIT GABUNGAN\):/i)).toBeInTheDocument();

    // Check values rendered
    expect(screen.getAllByText(/620\.000/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('(21.4%)')).toBeInTheDocument();

    expect(screen.getAllByText(/25\.000/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('(20.0%)')).toBeInTheDocument();

    expect(screen.getAllByText(/645\.000/).length).toBeGreaterThanOrEqual(1);
  });
});

