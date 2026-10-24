import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { KasirDashboard } from '../../pages/KasirDashboard';
import { supabase } from '../../lib/supabaseClient';
import * as billingService from '../../services/billingService';
import * as invoiceExport from '../../utils/invoiceExport';
import { packageService } from '../../services/packageService';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'kasir-user-id', email: 'kasir@robelkaroseri.com' },
    profile: { id: 'kasir-user-id', full_name: 'Dewi Kasir', role: 'kasir' },
    signOut: vi.fn(),
  }),
}));

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../../services/packageService', () => ({
  packageService: {
    getPackages: vi.fn().mockResolvedValue([]),
  },
}));

describe('Component: KasirDashboard (Approved Change Order Itemized Breakdown & Accordion)', () => {
  const spkDbId = 'spk-uuid-2668';

  const mockSpkData = [
    {
      id: spkDbId,
      spk_no: 'SPK-2668',
      customer_name: 'PT Sumber Makmur Logistik',
      vehicle_plate: 'B 2668 SML',
      vehicle_vin: 'MHFC2668XYZ123456',
      vehicle_number: 'B 2668 SML',
      vehicle_engine: 'ENG-2668',
      status: 'ACTIVE',
      dp_amount: 10000000,
      total_estimated_cost: 50000000,
      qc_status: 'PASS',
      allocation_status: 'FULL',
      qc_inspections: [{ status: 'PASS', inspected_at: '2026-10-19T10:00:00Z' }],
      invoices: [{ status: 'UNPAID', created_at: '2026-10-19T11:00:00Z' }],
      inventory_transactions: [],
      spk_amendments: [
        {
          status: 'APPROVED',
          cost_adjustment: 3200000,
        },
      ],
    },
  ];

  const mockApprovedChangeOrders: billingService.ApprovedChangeOrder[] = [
    {
      id: 'co-101',
      order_number: 'CO-SPK2668-01',
      co_number: 'CO-SPK2668-01',
      description: 'Upgrade Plat Dinding & Pintu Samping',
      wbs_stage: 'WBS 3: Dinding/Fabrikasi',
      total_amount: 3200000,
      created_at: '2026-10-18T10:00:00Z',
      approved_at: '2026-10-19T09:00:00Z',
      approved_by: 'supervisor-1',
      change_order_items: [
        {
          id: 'item-1',
          item_name: 'Plat Bordes Aluminium 2mm',
          item_type: 'MATERIAL',
          wbs_stage: 'WBS 3: Dinding/Fabrikasi',
          quantity: 2,
          unit: 'lembar',
          unit_price: 1000000,
          cost_price: 750000,
          subtotal: 2000000,
          notes: 'Anti slip bordes',
        },
        {
          id: 'item-2',
          item_name: 'Jasa Las & Engsel Heavy Duty',
          item_type: 'LABOR',
          wbs_stage: 'WBS 3: Dinding/Fabrikasi',
          quantity: 1,
          unit: 'paket',
          unit_price: 1200000,
          cost_price: 800000,
          subtotal: 1200000,
          notes: null,
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock packageService
    vi.mocked(packageService.getPackages).mockResolvedValue([]);

    // Mock supabase.from queries for KasirDashboard initial fetch
    const mockSupabaseFrom = vi.fn((table: string) => {
      if (table === 'rab_estimations') {
        return {
          select: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'est-1',
                spk_id: spkDbId,
                total_labor_cost: 15000000,
                total_overhead_cost: 5000000,
                total_estimated_cost: 50000000,
              },
            ],
            error: null,
          }),
        };
      }
      if (table === 'rab_items') {
        return {
          select: vi.fn().mockResolvedValue({
            data: [
              {
                rab_estimation_id: 'est-1',
                item_total: 30000000,
                package_id: null,
              },
            ],
            error: null,
          }),
        };
      }
      if (table === 'spk') {
        return {
          select: vi.fn().mockReturnValue({
            neq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockSpkData,
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });

    vi.mocked(supabase.from).mockImplementation(mockSupabaseFrom as any);

    // Mock billingService.fetchApprovedChangeOrders
    vi.spyOn(billingService, 'fetchApprovedChangeOrders').mockResolvedValue(mockApprovedChangeOrders);
  });

  it('renders SPK in Pelunasan Akhir, fetches change orders, and toggles itemized accordion with legal dispute details', async () => {
    render(<KasirDashboard />);

    // 1. Switch to "Pelunasan Akhir" (FINAL tab)
    const finalTabButton = screen.getByRole('button', { name: /Pelunasan Akhir/i });
    fireEvent.click(finalTabButton);

    // 2. Wait for SPK-2668 card to appear in the list
    await waitFor(() => {
      expect(screen.getByText('SPK-2668')).toBeInTheDocument();
    });

    // 3. Click the SPK card to select it
    fireEvent.click(screen.getByText('SPK-2668'));

    // 4. Verify billingService.fetchApprovedChangeOrders is invoked with spkDbId
    await waitFor(() => {
      expect(billingService.fetchApprovedChangeOrders).toHaveBeenCalledWith(spkDbId);
    });

    // 5. Verify Customer Billing displays Change Orders (Addendum) and toggle button
    await waitFor(() => {
      expect(screen.getByText(/Change Orders \(Addendum\)/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Lihat Rincian/i })).toBeInTheDocument();
    });

    // 6. Accordion should initially be collapsed (Rincian Pekerjaan Tambahan not visible)
    const toggleButton = screen.getByRole('button', { name: /Lihat Rincian \(1\)/i });
    expect(toggleButton).toBeInTheDocument();
    expect(screen.queryByText(/Rincian Pekerjaan Tambahan \(Di Luar Kontrak Awal\)/i)).not.toBeInTheDocument();

    // 7. Click "Lihat Rincian (1)" to expand accordion
    fireEvent.click(toggleButton);

    // 8. Verify sub-panel header and change order metadata
    expect(screen.getByText(/Rincian Pekerjaan Tambahan \(Di Luar Kontrak Awal\)/i)).toBeInTheDocument();
    expect(screen.getByText('1 Item Disetujui')).toBeInTheDocument();
    expect(screen.getByText('Upgrade Plat Dinding & Pintu Samping')).toBeInTheDocument();
    expect(screen.getByText(/Tahap: WBS 3: Dinding\/Fabrikasi/i)).toBeInTheDocument();
    expect(screen.getAllByText(/\+ Rp 3\.200\.000/i).length).toBeGreaterThanOrEqual(1);

    // 9. Verify sub-item list items
    expect(screen.getByText(/Plat Bordes Aluminium 2mm \(2x @ Rp 1\.000\.000\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Jasa Las & Engsel Heavy Duty \(1x @ Rp 1\.200\.000\)/i)).toBeInTheDocument();

    // 10. Button text should update to "Tutup Rincian"
    const closeToggleButton = screen.getByRole('button', { name: /Tutup Rincian/i });
    expect(closeToggleButton).toBeInTheDocument();

    // 11. Click "Tutup Rincian" and verify it collapses
    fireEvent.click(closeToggleButton);
    expect(screen.queryByText(/Rincian Pekerjaan Tambahan \(Di Luar Kontrak Awal\)/i)).not.toBeInTheDocument();
  });

  it('triggers Cetak Invoice with mapped itemized change order payload when clicked', async () => {
    const printSpy = vi.spyOn(invoiceExport, 'printFinalInvoice').mockImplementation(() => {});

    render(<KasirDashboard />);

    // Switch to FINAL tab and select SPK
    fireEvent.click(screen.getByRole('button', { name: /Pelunasan Akhir/i }));
    await waitFor(() => {
      expect(screen.getByText('SPK-2668')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('SPK-2668'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Lihat Rincian/i })).toBeInTheDocument();
    });

    // Verify "Cetak Invoice" action button is rendered for UNPAID status
    const cetakInvoiceBtn = screen.getByRole('button', { name: /Cetak Invoice/i });
    expect(cetakInvoiceBtn).toBeInTheDocument();

    fireEvent.click(cetakInvoiceBtn);

    // Verify printFinalInvoice was called with the mapped payload
    expect(printSpy).toHaveBeenCalled();
    const payloadPassed = printSpy.mock.calls[0][0];
    expect(payloadPassed.spkNo).toBe('SPK-2668');
    expect(payloadPassed.customerName).toBe('PT Sumber Makmur Logistik');
    expect(payloadPassed.approvedChangeOrders).toHaveLength(1);
    expect(payloadPassed.approvedChangeOrders[0].order_number).toBe('CO-SPK2668-01');
    expect(payloadPassed.approvedChangeOrders[0].change_order_items).toHaveLength(2);
  });

  it('correctly reconciles SPK-3093 financial figures: Total Harga Jual (Rp 5.321.998), Total Modal HPP (Rp 3.065.264), and Estimasi Laba Kotor (Rp 2.256.734)', async () => {
    const spk3093DbId = 'spk-uuid-3093';

    // Mock Package Catalog for SPK-3093
    vi.mocked(packageService.getPackages).mockResolvedValueOnce([
      {
        id: 'pkg-dump-3093',
        name: 'Paket Dump Truck Karoseri',
        selling_price: 2000000,
        items: [],
      } as any,
    ]);

    // Mock Approved Change Orders for SPK-3093
    const spk3093ApprovedCos: billingService.ApprovedChangeOrder[] = [
      {
        id: 'co-3093-1',
        order_number: 'CO-3093-01',
        co_number: 'CO-3093-01',
        description: 'Pekerjaan Tambahan Sasis & Hidrolik',
        wbs_stage: 'WBS 2: Sasis/Rangka',
        total_amount: 3004998,
        created_at: '2026-10-24T08:00:00Z',
        approved_at: '2026-10-24T09:00:00Z',
        approved_by: 'supervisor-1',
        change_order_items: [
          {
            id: 'item-co-mat',
            item_name: 'Plat Tambahan Bordes Sasis',
            item_type: 'MATERIAL',
            wbs_stage: 'WBS 2: Sasis/Rangka',
            quantity: 1,
            unit: 'lot',
            unit_price: 1804998,
            cost_price: 1154934,
            subtotal: 1804998,
          },
          {
            id: 'item-co-labor',
            item_name: 'Jasa Pemasangan Hidrolik Tambahan',
            item_type: 'LABOR',
            wbs_stage: 'WBS 3: Fabrikasi',
            quantity: 1,
            unit: 'ls',
            unit_price: 1200000,
            cost_price: 950000,
            subtotal: 1200000,
          },
        ],
      },
    ];
    vi.spyOn(billingService, 'fetchApprovedChangeOrders').mockResolvedValueOnce(spk3093ApprovedCos);

    const mockSpk3093Data = [
      {
        id: spk3093DbId,
        spk_no: 'SPK-3093',
        customer_name: 'PT Karoseri Mitra Mandiri',
        vehicle_plate: 'B 3093 TXX',
        vehicle_vin: 'MHF3093TXX001',
        vehicle_number: 'B 3093 TXX',
        vehicle_engine: 'ENG-3093',
        status: 'ACTIVE',
        dp_amount: 1500000,
        total_estimated_cost: 960330,
        qc_status: 'PASS',
        allocation_status: 'FULL',
        qc_inspections: [{ status: 'PASS', inspected_at: '2026-10-24T10:00:00Z' }],
        invoices: [{ status: 'UNPAID', created_at: '2026-10-24T11:00:00Z' }],
        inventory_transactions: [],
        spk_amendments: [],
      },
    ];

    const mockSupabaseFrom = vi.fn((table: string) => {
      if (table === 'rab_estimations') {
        return {
          select: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'est-3093',
                spk_id: spk3093DbId,
                total_labor_cost: 250000,
                total_overhead_cost: 0,
                total_estimated_cost: 960330,
              },
            ],
            error: null,
          }),
        };
      }
      if (table === 'rab_items') {
        return {
          select: vi.fn().mockResolvedValue({
            data: [
              {
                rab_estimation_id: 'est-3093',
                item_total: 400000,
                package_id: 'pkg-dump-3093',
              },
              {
                rab_estimation_id: 'est-3093',
                item_total: 310330,
                package_id: 'pkg-dump-3093',
              },
              {
                rab_estimation_id: 'est-3093',
                item_total: 317000,
                package_id: null,
              },
            ],
            error: null,
          }),
        };
      }
      if (table === 'spk') {
        return {
          select: vi.fn().mockReturnValue({
            neq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockSpk3093Data,
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });

    vi.mocked(supabase.from).mockImplementation(mockSupabaseFrom as any);

    render(<KasirDashboard />);

    // 1. Switch to "Pelunasan Akhir" (FINAL tab)
    const finalTabButton = screen.getByRole('button', { name: /Pelunasan Akhir/i });
    fireEvent.click(finalTabButton);

    // 2. Wait for SPK-3093 card to appear and click it
    await waitFor(() => {
      expect(screen.getByText('SPK-3093')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('SPK-3093'));

    // 3. Wait for Change Orders to be fetched and Billing Calculator to display
    await waitFor(() => {
      expect(screen.getByText(/Change Orders \(Addendum\)/i)).toBeInTheDocument();
    });

    // 4. Verify Customer Billing figures
    // Paket Assembly List: Rp 2.000.000
    // Extra Item (Luar Paket): Rp 317.000
    // Change Orders (Addendum): + Rp 3.004.998
    // Total Harga Jual: Rp 5.321.998
    expect(screen.getByText(/Rp\s*2\.000\.000/)).toBeInTheDocument();
    expect(screen.getByText(/Rp\s*317\.000/)).toBeInTheDocument();
    expect(screen.getByText(/\+\s*Rp\s*3\.004\.998/)).toBeInTheDocument();
    expect(screen.getByText(/Rp\s*5\.321\.998/)).toBeInTheDocument();

    // 5. Verify Internal Cost (Modal) figures
    // Actual Material Cost: 710.330 + 1.154.934 = 1.865.264
    // Actual Labor Cost: 250.000 + 950.000 = 1.200.000
    // Actual Overhead Cost: 0
    // Total Modal (HPP): 3.065.264
    expect(screen.getByText(/Termasuk CO:\s*\+Rp\s*2\.104\.934/)).toBeInTheDocument();
    expect(screen.getByText(/Rp\s*1\.865\.264/)).toBeInTheDocument();
    expect(screen.getByText(/Rp\s*1\.200\.000/)).toBeInTheDocument();
    expect(screen.getByText(/Rp\s*3\.065\.264/)).toBeInTheDocument();

    // 6. Verify Estimasi Laba Kotor (Gross Profit)
    // Gross Profit: 5.321.998 - 3.065.264 = 2.256.734
    // Margin: 2.256.734 / 5.321.998 * 100 = 42.4%
    expect(screen.getByText(/Rp\s*2\.256\.734/)).toBeInTheDocument();
    expect(screen.getByText(/\(42\.4%\)/)).toBeInTheDocument();

    // 7. Verify Final Bill to Customer: 5.321.998 - 1.500.000 = 3.821.998
    expect(screen.getByText(/Rp\s*3\.821\.998/)).toBeInTheDocument();
  });
});
