import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { RabPerubahanTab } from '../RabPerubahanTab';
import * as exportUtils from '../../../utils/rabPerubahanExport';

// Mock export utilities
vi.spyOn(exportUtils, 'exportRabPerubahanToExcel');
vi.spyOn(exportUtils, 'printRabPerubahanReport');

// Mock spkService
const mockChangeOrders = [
  {
    id: 'co-101',
    spk_id: 'spk-999',
    co_number: 'CO-2026-001',
    status: 'APPROVED',
    items: [
      {
        id: 'co-item-1',
        change_order_id: 'co-101',
        wbs_stage: 'WBS 4: Pengecatan',
        item_type: 'MATERIAL',
        item_name: 'Cat Anti Karat Tambahan',
        quantity: 2,
        unit: 'pail',
        cost_price: 250000,
        unit_price: 400000,
        subtotal: 800000,
        package_name: null,
      },
      {
        id: 'co-item-2',
        change_order_id: 'co-101',
        wbs_stage: 'WBS 4: Pengecatan',
        item_type: 'LABOR',
        item_name: 'Jasa Semprot Anti Karat',
        quantity: 1,
        unit: 'lot',
        cost_price: 200000,
        unit_price: 350000,
        subtotal: 350000,
        package_name: null,
      },
    ],
  },
  {
    id: 'co-draft',
    spk_id: 'spk-999',
    co_number: 'CO-DRAFT-099',
    status: 'DRAFT', // Should NOT be included in consolidated items
    items: [
      {
        id: 'co-draft-item',
        item_name: 'Item Draft Yang Dikecualikan',
        quantity: 99,
        unit_price: 999999,
      },
    ],
  },
];

vi.mock('../../../services/spkService', () => ({
  spkService: {
    getChangeOrders: vi.fn(async () => mockChangeOrders),
  },
}));

// Mock Supabase tables
const mockRabItems = [
  {
    id: 'rab-item-1',
    rab_estimation_id: 'est-999',
    spk_id: 'spk-999',
    wbs_category: 'Pembongkaran',
    wbs_stage: 'WBS 1: Pembongkaran',
    item_type: 'MATERIAL',
    material_name: 'Besi Plat Siku 50x50',
    description: 'Besi Plat Siku 50x50',
    package_name: 'BAK DUMP PREMIUM',
    quantity: 5,
    unit: 'btg',
    cost_price: 150000,
    unit_price: 250000,
    subtotal: 1250000,
    material_id: 'mat-siku-1',
  },
  {
    id: 'rab-item-2',
    rab_estimation_id: 'est-999',
    spk_id: 'spk-999',
    wbs_category: 'Sasis/Rangka',
    wbs_stage: 'WBS 2: Sasis/Rangka',
    item_type: 'MATERIAL',
    material_name: 'Baut Chassis M16',
    description: 'Baut Chassis M16',
    package_name: null,
    quantity: 20,
    unit: 'pcs',
    cost_price: 10000,
    unit_price: 18000,
    subtotal: 360000,
    material_id: 'mat-baut-1',
  },
  {
    id: 'rab-item-3',
    rab_estimation_id: 'est-999',
    spk_id: 'spk-999',
    wbs_category: 'Dinding/Fabrikasi',
    wbs_stage: 'WBS 3: Dinding/Fabrikasi',
    item_type: 'OVERHEAD',
    description: 'Sewa Alat Las Titik & Genset',
    package_name: null,
    quantity: 3,
    unit: 'hari',
    cost_price: 100000,
    unit_price: 150000,
    subtotal: 450000,
  },
];

// Requisition items: rab-item-1 is issued/approved, rab-item-2 is not
const mockRequisitions = [
  {
    id: 'req-1',
    spk_id: 'spk-999',
    status: 'APPROVED',
    material_requisition_items: [
      {
        id: 'mri-1',
        material_id: 'mat-siku-1',
        rab_item_id: 'rab-item-1',
        material_name: 'Besi Plat Siku 50x50',
        quantity: 5,
        issued_qty: 5,
        status: 'ISSUED',
      },
    ],
  },
];

// SPK Borongan for Labor: co-item-2 is active
const mockSpkBorongan = [
  {
    id: 'spkb-1',
    spk_id: 'spk-999',
    status: 'ACTIVE',
    change_order_item_id: 'co-item-2',
    task_description: 'Jasa Semprot Anti Karat',
  },
];

// SPK Overhead logs: rab-item-3 is logged
const mockOverheadLogs = [
  {
    id: 'ovh-1',
    spk_id: 'spk-999',
    rab_item_id: 'rab-item-3',
    overhead_name: 'Sewa Alat Las Titik & Genset',
    total_amount: 300000,
  },
];

vi.mock('../../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'rab_estimations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'est-999', spk_id: 'spk-999' },
            error: null,
          }),
        };
      }
      if (table === 'rab_items') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: mockRabItems,
            error: null,
          }),
        };
      }
      if (table === 'material_issues') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        };
      }
      if (table === 'material_requisitions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: mockRequisitions,
            error: null,
          }),
        };
      }
      if (table === 'spk_borongan') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: mockSpkBorongan,
            error: null,
          }),
        };
      }
      if (table === 'spk_overhead_logs') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: mockOverheadLogs,
            error: null,
          }),
        };
      }
      if (table === 'change_orders') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: mockChangeOrders,
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    }),
  },
}));

describe('RabPerubahanTab Component', () => {
  const defaultSpk = {
    id: 'spk-999',
    spk_no: 'SPK-3093',
    customer_name: 'PT Karoseri Prima',
    vehicle_plate: 'B 3093 TXX',
    vehicle_model: 'Mitsubishi Canter',
    status: 'IN_PROGRESS',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders consolidated items from both RAB and approved Change Orders', async () => {
    render(<RabPerubahanTab spkId="spk-999" spk={defaultSpk} />);

    // Wait until loading finishes and table renders
    await waitFor(() => {
      expect(screen.getByText('Konsolidasi Estimasi Biaya & Audit Realisasi Lapangan')).toBeInTheDocument();
    });

    // Check header and SPK identifier
    expect(screen.getByText(/SPK-3093/)).toBeInTheDocument();
    expect(screen.getByText(/B 3093 TXX/)).toBeInTheDocument();

    // Verify items from RAB appear
    expect(screen.getByText('Besi Plat Siku 50x50')).toBeInTheDocument();
    expect(screen.getByText('Baut Chassis M16')).toBeInTheDocument();
    expect(screen.getByText('Sewa Alat Las Titik & Genset')).toBeInTheDocument();

    // Verify items from approved Change Order appear
    expect(screen.getByText('Cat Anti Karat Tambahan')).toBeInTheDocument();
    expect(screen.getByText('Jasa Semprot Anti Karat')).toBeInTheDocument();

    // Verify DRAFT Change Order item does NOT appear
    expect(screen.queryByText('Item Draft Yang Dikecualikan')).not.toBeInTheDocument();
  });

  it('displays correct badges for source origin and entry method', async () => {
    render(<RabPerubahanTab spkId="spk-999" spk={defaultSpk} />);

    await waitFor(() => {
      expect(screen.getByText('Besi Plat Siku 50x50')).toBeInTheDocument();
    });

    // Origin badges
    const rabBadges = screen.getAllByText('📋 RAB');
    expect(rabBadges.length).toBe(3); // 3 RAB items

    const coBadges = screen.getAllByText('🔄 Change Order');
    expect(coBadges.length).toBe(2); // 2 approved Change Order items

    // Entry method badges
    expect(screen.getByText('📦 Paket: BAK DUMP PREMIUM')).toBeInTheDocument();
    const granularBadges = screen.getAllByText('📋 Granular');
    expect(granularBadges.length).toBe(4); // remaining 4 items are granular
  });

  it('evaluates and displays warehouse fulfillment badges accurately', async () => {
    render(<RabPerubahanTab spkId="spk-999" spk={defaultSpk} />);

    await waitFor(() => {
      expect(screen.getByText('Besi Plat Siku 50x50')).toBeInTheDocument();
    });

    // rab-item-1 (Besi Plat Siku) is in approved requisitions -> "Sudah Diambil"
    // co-item-1 (Cat Anti Karat) is NOT in requisitions -> "Belum Diambil"
    // rab-item-2 (Baut Chassis) is NOT in requisitions -> "Belum Diambil"
    expect(screen.getByText('Sudah Diambil')).toBeInTheDocument();
    const pendingMaterials = screen.getAllByText('Belum Diambil');
    expect(pendingMaterials.length).toBe(2);

    // co-item-2 (Labor) has active SPK Borongan -> "Terbit SPK-B"
    expect(screen.getByText('Terbit SPK-B')).toBeInTheDocument();

    // rab-item-3 (Overhead) has log recorded -> "Dicatat FOH"
    expect(screen.getByText('Dicatat FOH')).toBeInTheDocument();
  });

  it('renders 4-pillar segregated margins in summary banner', async () => {
    render(<RabPerubahanTab spkId="spk-999" spk={defaultSpk} />);

    await waitFor(() => {
      expect(screen.getByText('Rincian Pemisahan Profit 4 Pilar (Segregated Margins)')).toBeInTheDocument();
    });

    // Check 4 pillar titles
    expect(screen.getByText(/Paket Barang Jadi/)).toBeInTheDocument();
    expect(screen.getByText(/Material Granular/)).toBeInTheDocument();
    expect(screen.getByText(/Labor \(Jasa Mandor\)/)).toBeInTheDocument();
    expect(screen.getByText(/Overhead Pabrik \(FOH\)/)).toBeInTheDocument();

    // Calculations:
    // 1. Package (rab-item-1): Rev 1.25M, Cost 750k -> Profit 500.000
    // 2. Granular Material (rab-item-2 + co-item-1):
    //    rab-item-2: Rev 360k, Cost 200k
    //    co-item-1: Rev 800k, Cost 500k
    //    Total Granular Mat Rev = 1.160.000, Cost = 700.000, Profit = 460.000
    // 3. Labor (co-item-2): Rev 350k, Cost 200k -> Profit 150.000
    // 4. Overhead (rab-item-3): Rev 450k, Cost 300k -> Profit 150.000
    expect(screen.getByText('Rp 500.000')).toBeInTheDocument(); // Package profit
    expect(screen.getByText('Rp 460.000')).toBeInTheDocument(); // Granular material profit
    expect(screen.getAllByText('Rp 150.000').length).toBeGreaterThanOrEqual(2); // Labor & Overhead profit
  });

  it('filters items dynamically by Category and Search keyword', async () => {
    render(<RabPerubahanTab spkId="spk-999" spk={defaultSpk} />);

    await waitFor(() => {
      expect(screen.getByText('Besi Plat Siku 50x50')).toBeInTheDocument();
    });

    // Filter by type: LABOR
    const typeSelect = screen.getByLabelText(/Filter Tipe/i);
    fireEvent.change(typeSelect, { target: { value: 'LABOR' } });

    expect(screen.getByText('Jasa Semprot Anti Karat')).toBeInTheDocument();
    expect(screen.queryByText('Besi Plat Siku 50x50')).not.toBeInTheDocument();
    expect(screen.queryByText('Sewa Alat Las Titik & Genset')).not.toBeInTheDocument();

    // Reset and search by text
    const searchInput = screen.getByPlaceholderText(/Cari deskripsi item/i);
    fireEvent.change(typeSelect, { target: { value: 'ALL' } });
    fireEvent.change(searchInput, { target: { value: 'Baut Chassis' } });

    expect(screen.getByText('Baut Chassis M16')).toBeInTheDocument();
    expect(screen.queryByText('Besi Plat Siku 50x50')).not.toBeInTheDocument();
  });

  it('calculates Labor summary card and reactive filter subtotal badge accurately when filtered to LABOR', async () => {
    render(<RabPerubahanTab spkId="spk-999" spk={defaultSpk} />);

    await waitFor(() => {
      expect(screen.getByText('Konsolidasi Estimasi Biaya & Audit Realisasi Lapangan')).toBeInTheDocument();
    });

    // Check Labor card rendered with totalLaborMargin (150.000), Jual (350.000), Modal (200.000)
    const laborCard = screen.getByTestId('pillar-labor-card');
    expect(within(laborCard).getByText('🔧 Labor (Jasa Mandor)')).toBeInTheDocument();
    expect(within(laborCard).getByText('Rp 150.000')).toBeInTheDocument();
    expect(within(laborCard).getByText('Rp 350.000')).toBeInTheDocument();
    expect(within(laborCard).getByText('Rp 200.000')).toBeInTheDocument();

    // Select Labor filter
    const typeSelect = screen.getByLabelText(/Filter Tipe/i);
    fireEvent.change(typeSelect, { target: { value: 'LABOR' } });

    // Badge Subtotal Filter should show Rp 350.000
    expect(screen.getByText(/Subtotal Filter: Rp 350.000/)).toBeInTheDocument();
  });

  it('aggregates all labor items including package assembly components and matches empirical totals', async () => {
    // 4 labor items: 80k+100k, 900k+1.247.113, 120k+150k, 1M+1.385.681
    // Total modal: 2.100.000, Total jual: 2.882.794, Margin: 782.794
    const fourLaborItems = [
      {
        id: 'rab-l1',
        rab_estimation_id: 'est-four',
        spk_id: 'spk-four',
        wbs_stage: 'WBS 1: Pembongkaran',
        item_type: 'LABOR',
        description: 'Jasa Las Dasar (Paket)',
        package_name: 'BAK DUMP STANDAR',
        quantity: 1,
        unit: 'lot',
        cost_price: 80000,
        unit_price: 100000,
        subtotal: 100000,
      },
      {
        id: 'rab-l2',
        rab_estimation_id: 'est-four',
        spk_id: 'spk-four',
        wbs_stage: 'WBS 2: Sasis/Rangka',
        item_type: 'LABOR',
        description: 'Jasa Rangka Utama (Paket)',
        package_name: 'BAK DUMP STANDAR',
        quantity: 1,
        unit: 'lot',
        cost_price: 900000,
        unit_price: 1247113,
        subtotal: 1247113,
      },
      {
        id: 'rab-l3',
        rab_estimation_id: 'est-four',
        spk_id: 'spk-four',
        wbs_stage: 'WBS 3: Dinding/Fabrikasi',
        item_type: 'LABOR',
        description: 'Jasa Pasang Engsel Granular',
        package_name: null,
        quantity: 1,
        unit: 'lot',
        cost_price: 120000,
        unit_price: 150000,
        subtotal: 150000,
      },
      {
        id: 'rab-l4',
        rab_estimation_id: 'est-four',
        spk_id: 'spk-four',
        wbs_stage: 'WBS 5: Kelistrikan/Hidrolik',
        item_type: 'LABOR',
        description: 'Jasa Instalasi Pompa Hidrolik (Paket)',
        package_name: 'PAKET HIDROLIK',
        quantity: 1,
        unit: 'lot',
        cost_price: 1000000,
        unit_price: 1385681,
        subtotal: 1385681,
      },
    ];

    const supabaseMock = await import('../../../lib/supabaseClient');
    const originalFrom = supabaseMock.supabase.from;
    (supabaseMock.supabase.from as any) = vi.fn((table: string) => {
      if (table === 'rab_estimations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'est-four', spk_id: 'spk-four' },
            error: null,
          }),
        };
      }
      if (table === 'rab_items') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: fourLaborItems,
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    const spkServiceMock = await import('../../../services/spkService');
    vi.spyOn(spkServiceMock.spkService, 'getChangeOrders').mockResolvedValueOnce([]);

    try {
      render(<RabPerubahanTab spkId="spk-four" spk={{ id: 'spk-four', spk_no: 'SPK-FOUR' }} />);

      await waitFor(() => {
        expect(screen.getByText('Jasa Las Dasar (Paket)')).toBeInTheDocument();
      });

      // Verify Labor card numbers
      // Jual: Rp 2.882.794
      // Modal: Rp 2.100.000
      // Margin: Rp 782.794
      const laborCard = screen.getByTestId('pillar-labor-card');
      expect(within(laborCard).getByText('Rp 782.794')).toBeInTheDocument();
      expect(within(laborCard).getByText('Rp 2.882.794')).toBeInTheDocument();
      expect(within(laborCard).getByText('Rp 2.100.000')).toBeInTheDocument();

      // Filter by type: LABOR
      const typeSelect = screen.getByLabelText(/Filter Tipe/i);
      fireEvent.change(typeSelect, { target: { value: 'LABOR' } });

      // Badge Subtotal Filter should show exactly Rp 2.882.794
      expect(screen.getByText(/Subtotal Filter: Rp 2.882.794/)).toBeInTheDocument();
    } finally {
      (supabaseMock.supabase.from as any) = originalFrom;
    }
  });

  it('triggers export functions when clicking Export XLSX and Export PDF buttons', async () => {
    render(<RabPerubahanTab spkId="spk-999" spk={defaultSpk} />);

    await waitFor(() => {
      expect(screen.getByText('Export XLSX')).toBeInTheDocument();
    });

    // Click Export XLSX
    const excelBtn = screen.getByText('Export XLSX');
    fireEvent.click(excelBtn);
    expect(exportUtils.exportRabPerubahanToExcel).toHaveBeenCalledTimes(1);

    // Click Export PDF
    const pdfBtn = screen.getByText('Export PDF / Cetak');
    fireEvent.click(pdfBtn);
    expect(exportUtils.printRabPerubahanReport).toHaveBeenCalledTimes(1);
  });
});
