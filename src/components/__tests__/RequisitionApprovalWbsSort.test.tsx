import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RequisitionApproval } from '../RequisitionApproval';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123' },
    profile: { id: 'test-user-123', full_name: 'Budi Gudang', role: 'petugas_gudang' },
  }),
}));

describe('Component: RequisitionApproval (WBS Column & Ascending Sorting)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders WBS column in the Pending Requisitions table header and displays formatted WBS badges for items', async () => {
    const mockRequisitions = [
      {
        id: 'req-wbs-test',
        spk_id: 'spk-1',
        wbs_category: 'Pembongkaran',
        status: 'PENDING',
        notes: 'Permintaan material WBS',
        created_at: '2026-10-22T08:00:00Z',
        spk: {
          id: 'spk-1',
          spk_no: 'SPK-9001',
          customer_name: 'PT Karoseri Jaya',
          vehicle_plate: 'B 1234 ABC',
          sub_tasks: [],
          total_estimated_cost: 5000000,
        },
        profiles: { full_name: 'Mandor Anto' },
        material_requisition_items: [
          {
            id: 'item-1',
            material_id: 'mat-1',
            quantity: 5,
            status: 'PENDING',
            material_name: 'Plat Besi',
            unit: 'Lembar',
            unit_price: 200000,
            subtotal: 1000000,
            wbs_stage: 'WBS 1: Pembongkaran',
            materials: { id: 'mat-1', name: 'Plat Besi', unit: 'Lembar', unit_price: 200000 },
          },
        ],
      },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'material_requisitions') {
        const queryObj: any = {};
        queryObj.select = vi.fn().mockReturnValue(queryObj);
        queryObj.in = vi.fn().mockReturnValue(queryObj);
        queryObj.order = vi.fn().mockResolvedValue({
          data: mockRequisitions,
          error: null,
        });
        return queryObj;
      }
      if (table === 'materials') {
        return {
          select: vi.fn().mockResolvedValue({
            data: [{ id: 'mat-1', name: 'Plat Besi', unit: 'Lembar', unit_price: 200000 }],
            error: null,
          }),
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
            is: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      } as any;
    });

    render(<RequisitionApproval />);

    await waitFor(() => {
      // 1. Check table header contains WBS
      const headers = screen.getAllByRole('columnheader');
      const headerTexts = headers.map(h => h.textContent?.trim());
      expect(headerTexts).toEqual([
        'WBS',
        'SUMBER / PAKET',
        'MATERIAL',
        'JUMLAH DIMINTA',
        'ESTIMASI HARGA (RP)',
        'SUBTOTAL (RP)',
        'AKSI / STATUS'
      ]);

      // 2. Check item row displays formatted WBS badge
      expect(screen.getByText('WBS 1: Pembongkaran')).toBeInTheDocument();
      expect(screen.getByText('Plat Besi')).toBeInTheDocument();
      expect(screen.getByText('5 Lembar')).toBeInTheDocument();
    });
  });

  it('sorts requisition items within a ticket ascending by WBS order weight (WBS 1 -> WBS 2 -> WBS 3)', async () => {
    // A single requisition containing items belonging to different WBS stages in random order
    const mockRequisitionWithMultipleItems = [
      {
        id: 'req-multi-item',
        spk_id: 'spk-1',
        wbs_category: 'Pembongkaran',
        status: 'PENDING',
        notes: 'Permintaan paket multi-wbs',
        created_at: '2026-10-22T08:00:00Z',
        spk: {
          id: 'spk-1',
          spk_no: 'SPK-9002',
          customer_name: 'PT Karoseri Jaya',
        },
        profiles: { full_name: 'Mandor Anto' },
        material_requisition_items: [
          {
            id: 'item-stage-3',
            material_id: 'mat-3',
            quantity: 2,
            status: 'PENDING',
            material_name: 'Plat Galvanil Dinding',
            unit: 'Lembar',
            unit_price: 300000,
            subtotal: 600000,
            wbs_stage: 'Dinding/Fabrikasi', // Weight 3
            materials: { id: 'mat-3', name: 'Plat Galvanil Dinding', unit: 'Lembar', unit_price: 300000 },
          },
          {
            id: 'item-stage-1',
            material_id: 'mat-1',
            quantity: 10,
            status: 'PENDING',
            material_name: 'Mata Gerinda Potong',
            unit: 'PCS',
            unit_price: 15000,
            subtotal: 150000,
            wbs_stage: 'Pembongkaran', // Weight 1
            materials: { id: 'mat-1', name: 'Mata Gerinda Potong', unit: 'PCS', unit_price: 15000 },
          },
          {
            id: 'item-stage-2',
            material_id: 'mat-2',
            quantity: 4,
            status: 'PENDING',
            material_name: 'Besi UNP Sasis',
            unit: 'Batang',
            unit_price: 250000,
            subtotal: 1000000,
            wbs_stage: 'Sasis/Rangka', // Weight 2
            materials: { id: 'mat-2', name: 'Besi UNP Sasis', unit: 'Batang', unit_price: 250000 },
          },
        ],
      },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'material_requisitions') {
        const queryObj: any = {};
        queryObj.select = vi.fn().mockReturnValue(queryObj);
        queryObj.in = vi.fn().mockReturnValue(queryObj);
        queryObj.order = vi.fn().mockResolvedValue({
          data: mockRequisitionWithMultipleItems,
          error: null,
        });
        return queryObj;
      }
      if (table === 'materials') {
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
            is: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      } as any;
    });

    render(<RequisitionApproval />);

    await waitFor(() => {
      expect(screen.getByText('Mata Gerinda Potong')).toBeInTheDocument();
      expect(screen.getByText('Besi UNP Sasis')).toBeInTheDocument();
      expect(screen.getByText('Plat Galvanil Dinding')).toBeInTheDocument();
    });

    const rows = screen.getAllByRole('row');
    // Row 0 is the table header
    // Row 1 should be WBS 1: Pembongkaran (Mata Gerinda Potong)
    expect(rows[1]).toHaveTextContent('WBS 1: Pembongkaran');
    expect(rows[1]).toHaveTextContent('Mata Gerinda Potong');

    // Row 2 should be WBS 2: Sasis/Rangka (Besi UNP Sasis)
    expect(rows[2]).toHaveTextContent('WBS 2: Sasis/Rangka');
    expect(rows[2]).toHaveTextContent('Besi UNP Sasis');

    // Row 3 should be WBS 3: Dinding/Fabrikasi (Plat Galvanil Dinding)
    expect(rows[3]).toHaveTextContent('WBS 3: Dinding/Fabrikasi');
    expect(rows[3]).toHaveTextContent('Plat Galvanil Dinding');
  });

  it('sorts multiple requisition cards ascending by WBS order weight', async () => {
    // 3 separate requisition cards in unsorted order (Cat -> Pembongkaran -> Sasis)
    const mockMultiRequisitions = [
      {
        id: 'req-stage-4',
        spk_id: 'spk-1',
        wbs_category: 'Cat/Finishing', // Weight 4
        status: 'PENDING',
        created_at: '2026-10-22T08:00:00Z',
        spk: { id: 'spk-1', spk_no: 'SPK-9004' },
        profiles: { full_name: 'Mandor Cat' },
        material_requisition_items: [
          {
            id: 'item-cat',
            material_name: 'Thinner A',
            quantity: 5,
            status: 'PENDING',
            unit_price: 40000,
            subtotal: 200000,
            wbs_stage: 'WBS 4: Pengecatan',
          },
        ],
      },
      {
        id: 'req-stage-1',
        spk_id: 'spk-1',
        wbs_category: 'Pembongkaran', // Weight 1
        status: 'PENDING',
        created_at: '2026-10-22T08:00:00Z',
        spk: { id: 'spk-1', spk_no: 'SPK-9001' },
        profiles: { full_name: 'Mandor Bongkar' },
        material_requisition_items: [
          {
            id: 'item-bongkar',
            material_name: 'Mata Potong',
            quantity: 10,
            status: 'PENDING',
            unit_price: 20000,
            subtotal: 200000,
            wbs_stage: 'Pembongkaran',
          },
        ],
      },
      {
        id: 'req-stage-2',
        spk_id: 'spk-1',
        wbs_category: 'Sasis/Rangka', // Weight 2
        status: 'PENDING',
        created_at: '2026-10-22T08:00:00Z',
        spk: { id: 'spk-1', spk_no: 'SPK-9002' },
        profiles: { full_name: 'Mandor Sasis' },
        material_requisition_items: [
          {
            id: 'item-sasis',
            material_name: 'Plat Rangka',
            quantity: 3,
            status: 'PENDING',
            unit_price: 150000,
            subtotal: 450000,
            wbs_stage: 'Sasis/Rangka',
          },
        ],
      },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'material_requisitions') {
        const queryObj: any = {};
        queryObj.select = vi.fn().mockReturnValue(queryObj);
        queryObj.in = vi.fn().mockReturnValue(queryObj);
        queryObj.order = vi.fn().mockResolvedValue({
          data: mockMultiRequisitions,
          error: null,
        });
        return queryObj;
      }
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
            is: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      } as any;
    });

    render(<RequisitionApproval />);

    await waitFor(() => {
      expect(screen.getByText('Mata Potong')).toBeInTheDocument();
      expect(screen.getByText('Plat Rangka')).toBeInTheDocument();
      expect(screen.getByText('Thinner A')).toBeInTheDocument();
    });

    // Check that SPK-9001 (WBS 1) appears before SPK-9002 (WBS 2) and SPK-9004 (WBS 4)
    const spkBadges = screen.getAllByText(/^SPK-900[124]$/);
    expect(spkBadges[0]).toHaveTextContent('SPK-9001'); // WBS 1
    expect(spkBadges[1]).toHaveTextContent('SPK-9002'); // WBS 2
    expect(spkBadges[2]).toHaveTextContent('SPK-9004'); // WBS 4
  });

  it('renders SUMBER / PAKET badges correctly for Package, Change Order, and initial RAB items', async () => {
    const mockRequisition = [
      {
        id: 'req-sources-test',
        spk_id: 'spk-source-1',
        wbs_category: 'Sasis/Rangka',
        status: 'PENDING',
        notes: 'Uji sumber item',
        created_at: '2026-10-22T08:00:00Z',
        spk: {
          id: 'spk-source-1',
          spk_no: 'SPK-9005',
          customer_name: 'PT Karoseri Sumber',
        },
        profiles: { full_name: 'Mandor Anto' },
        material_requisition_items: [
          {
            id: 'item-pkg',
            material_id: 'mat-pkg',
            quantity: 2,
            status: 'PENDING',
            material_name: 'Dudukan Slebor',
            unit: 'Set',
            unit_price: 350000,
            subtotal: 700000,
            wbs_stage: 'WBS 2: Sasis/Rangka',
            package_name: 'HPP DUDUKAN SLEBOR',
            rab_items: {
              id: 'rab-pkg',
              product_packages: { name: 'HPP DUDUKAN SLEBOR' },
            },
          },
          {
            id: 'item-co',
            material_id: 'mat-co',
            quantity: 1,
            status: 'PENDING',
            material_name: 'Plat Adendum',
            unit: 'Lembar',
            unit_price: 250000,
            subtotal: 250000,
            wbs_stage: 'WBS 3: Dinding/Fabrikasi',
            change_order_item_id: 'co-item-1',
            change_order_items: { id: 'co-item-1', item_name: 'Plat Adendum' },
          },
          {
            id: 'item-rab',
            material_id: 'mat-rab',
            quantity: 10,
            status: 'PENDING',
            material_name: 'Baut 12mm',
            unit: 'Pcs',
            unit_price: 5000,
            subtotal: 50000,
            wbs_stage: 'WBS 1: Pembongkaran',
            rab_item_id: 'rab-item-std',
          },
        ],
      },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'material_requisitions') {
        const queryObj: any = {};
        queryObj.select = vi.fn().mockReturnValue(queryObj);
        queryObj.in = vi.fn().mockReturnValue(queryObj);
        queryObj.order = vi.fn().mockResolvedValue({
          data: mockRequisition,
          error: null,
        });
        return queryObj;
      }
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
            is: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      } as any;
    });

    render(<RequisitionApproval />);

    await waitFor(() => {
      expect(screen.getByText('Dudukan Slebor')).toBeInTheDocument();
      expect(screen.getByText('Plat Adendum')).toBeInTheDocument();
      expect(screen.getByText('Baut 12mm')).toBeInTheDocument();
    });

    // 1. Verify Package Badge with orange styling
    const pkgBadge = screen.getByText('📦 Paket: HPP DUDUKAN SLEBOR');
    expect(pkgBadge).toBeInTheDocument();
    expect(pkgBadge.className).toContain('text-orange-400');

    // 2. Verify Change Order Badge with purple styling
    const coBadge = screen.getByText('🔄 Change Order');
    expect(coBadge).toBeInTheDocument();
    expect(coBadge.className).toContain('text-purple-400');

    // 3. Verify standard RAB Badge with blue styling
    const rabBadge = screen.getByText('📋 RAB');
    expect(rabBadge).toBeInTheDocument();
    expect(rabBadge.className).toContain('text-blue-400');
  });
});
