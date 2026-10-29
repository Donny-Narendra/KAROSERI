import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { RecentMaterialIssues } from '../RecentMaterialIssues';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('../../services/inventoryService', () => ({
  inventoryService: {
    voidMaterialIssue: vi.fn(),
    updateMaterialIssue: vi.fn(),
  },
}));

describe('Component: RecentMaterialIssues', () => {
  const mockTransactions = [
    {
      id: 'tx-1',
      spk_id: 'spk-uuid-7080',
      material_id: 'mat-1',
      quantity_issued: 5,
      custom_unit_price: null,
      issued_at: '2026-10-22T08:30:00Z',
      issued_by_name: 'Budi Gudang',
      issued_by_role: 'petugas_gudang',
      audit_notes: 'Pengeluaran plat dasar',
      stock_before: 50,
      stock_after: 45,
      spk: { id: 'spk-uuid-7080', spk_no: 'SPK-7080', spk_number: 'SPK-7080', status: 'IN_PROGRESS' },
      materials: { name: 'Plat Besi 3mm', unit: 'Lembar', unit_price: 450000 },
    },
    {
      id: 'tx-2',
      spk_id: 'spk-uuid-7080',
      material_id: 'mat-2',
      quantity_issued: 20,
      custom_unit_price: 15000,
      issued_at: '2026-10-22T09:15:00Z',
      issued_by_name: 'Donny SA',
      issued_by_role: 'service_advisor',
      audit_notes: 'Baut tambahan',
      stock_before: 200,
      stock_after: 180,
      spk: { id: 'spk-uuid-7080', spk_no: 'SPK-7080', spk_number: 'SPK-7080', status: 'IN_PROGRESS' },
      materials: { name: 'Baut Baja 12mm', unit: 'PCS', unit_price: 12000 },
    },
  ];

  let lastQueryOrderCol: string | null = null;
  let lastQueryOrderAsc: boolean | null = null;
  let lastFilteredSpkId: string | null = null;
  let lastQueryLimit: number | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    lastQueryOrderCol = null;
    lastQueryOrderAsc = null;
    lastFilteredSpkId = null;
    lastQueryLimit = null;

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'spk') {
        return {
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'spk-uuid-7080', spk_no: 'SPK-7080', spk_number: 'SPK-7080' },
                error: null,
              }),
            }),
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'spk-uuid-7080', spk_no: 'SPK-7080', spk_number: 'SPK-7080' },
                error: null,
              }),
            }),
            ilike: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'spk-uuid-7080', spk_no: 'SPK-7080', spk_number: 'SPK-7080' },
                error: null,
              }),
            }),
          }),
        } as any;
      }

      if (table === 'inventory_transactions') {
        const queryObj: any = {};
        queryObj.select = vi.fn().mockImplementation(() => queryObj);
        queryObj.eq = vi.fn().mockImplementation((col: string, val: string) => {
          if (col === 'spk_id') {
            lastFilteredSpkId = val;
          }
          return queryObj;
        });
        queryObj.gt = vi.fn().mockImplementation(() => queryObj);
        queryObj.limit = vi.fn().mockImplementation((n: number) => {
          lastQueryLimit = n;
          return queryObj;
        });
        queryObj.order = vi.fn().mockImplementation((col: string, opts: { ascending: boolean }) => {
          lastQueryOrderCol = col;
          lastQueryOrderAsc = opts.ascending;
          return Promise.resolve({
            data: mockTransactions,
            error: null,
          });
        });
        return queryObj as any;
      }

      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      } as any;
    });
  });

  it('fetches latest transactions ordered descending by issued_at when no active SPK is selected', async () => {
    render(<RecentMaterialIssues selectedSpkFilter="ALL" refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('Plat Besi 3mm')).toBeInTheDocument();
      expect(screen.getByText('Baut Baja 12mm')).toBeInTheDocument();
    });

    expect(lastQueryOrderCol).toBe('issued_at');
    expect(lastQueryOrderAsc).toBe(false);
    expect(lastFilteredSpkId).toBeNull();
    expect(lastQueryLimit).toBe(50);

    const searchInput = screen.getByPlaceholderText('Cari material...');
    expect(searchInput).not.toBeDisabled();
  });

  it('filters by spk_id === selectedSpkId and orders descending by issued_at when SPK is selected', async () => {
    render(<RecentMaterialIssues selectedSpkFilter="SPK-7080" selectedSpkId="spk-uuid-7080" refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('SPK: SPK-7080')).toBeInTheDocument();
      expect(screen.getByText('Plat Besi 3mm')).toBeInTheDocument();
      expect(screen.getByText('Baut Baja 12mm')).toBeInTheDocument();
    });

    expect(lastFilteredSpkId).toBe('spk-uuid-7080');
    expect(lastQueryOrderCol).toBe('issued_at');
    expect(lastQueryOrderAsc).toBe(false);

    expect(screen.getByText('5 Lembar')).toBeInTheDocument();
    expect(screen.getByText('20 PCS')).toBeInTheDocument();
    expect(screen.getByText('SA (Backup)')).toBeInTheDocument();
  });

  it('filters material rows reactively when typing in the search box', async () => {
    render(<RecentMaterialIssues selectedSpkFilter="SPK-7080" selectedSpkId="spk-uuid-7080" refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('Plat Besi 3mm')).toBeInTheDocument();
      expect(screen.getByText('Baut Baja 12mm')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Cari material...');
    fireEvent.change(searchInput, { target: { value: 'Baut' } });

    expect(screen.queryByText('Plat Besi 3mm')).not.toBeInTheDocument();
    expect(screen.getByText('Baut Baja 12mm')).toBeInTheDocument();

    // Query non-matching
    fireEvent.change(searchInput, { target: { value: 'Cat Epoxy' } });
    expect(screen.getByText(/Tidak ada material yang cocok dengan "Cat Epoxy"/i)).toBeInTheDocument();
  });

  it('renders "Belum ada pengeluaran material untuk SPK ini" when selected SPK has 0 issues', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'inventory_transactions') {
        const queryObj: any = {};
        queryObj.select = vi.fn().mockReturnValue(queryObj);
        queryObj.eq = vi.fn().mockReturnValue(queryObj);
        queryObj.gt = vi.fn().mockReturnValue(queryObj);
        queryObj.limit = vi.fn().mockReturnValue(queryObj);
        queryObj.order = vi.fn().mockResolvedValue({ data: [], error: null });
        return queryObj;
      }
      return {
        select: vi.fn().mockReturnValue({
          ilike: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'spk-uuid-empty', spk_no: 'SPK-EMPTY' },
              error: null,
            }),
          }),
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'spk-uuid-empty', spk_no: 'SPK-EMPTY' },
              error: null,
            }),
          }),
        }),
      } as any;
    });

    render(<RecentMaterialIssues selectedSpkFilter="SPK-EMPTY" selectedSpkId="spk-uuid-empty" refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('Belum ada pengeluaran material untuk SPK ini.')).toBeInTheDocument();
    });
  });

  it('tolerates object SPK prop { id: "spk-uuid-7080", spk_no: "SPK-7080" } directly', async () => {
    render(
      <RecentMaterialIssues 
        selectedSpk={{ id: 'spk-uuid-7080', spk_no: 'SPK-7080' }} 
        refreshKey={0} 
      />
    );

    await waitFor(() => {
      expect(screen.getByText('SPK: SPK-7080')).toBeInTheDocument();
      expect(screen.getByText('Plat Besi 3mm')).toBeInTheDocument();
      expect(screen.getByText('Baut Baja 12mm')).toBeInTheDocument();
    });

    expect(lastFilteredSpkId).toBe('spk-uuid-7080');
  });

  it('resolves targetSpkId from spk table when only SPK number string is passed (no UUID passed)', async () => {
    // Only pass selectedSpkFilter="SPK-7080", no selectedSpkId
    render(<RecentMaterialIssues selectedSpkFilter="SPK-7080" refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('SPK: SPK-7080')).toBeInTheDocument();
      expect(screen.getByText('Plat Besi 3mm')).toBeInTheDocument();
      expect(screen.getByText('Baut Baja 12mm')).toBeInTheDocument();
    });

    // Verify it looked up the SPK table by spk_no and queried inventory_transactions with spk-uuid-7080
    expect(lastFilteredSpkId).toBe('spk-uuid-7080');
  });

  it('correctly displays material issues for SPK-7080 including Mata Gerinda Potong and Amplas', async () => {
    const spk7080Transactions = [
      {
        id: 'tx-7080-1',
        spk_id: 'spk-uuid-7080',
        material_id: 'mat-gerinda',
        quantity_issued: 4,
        custom_unit_price: 15000,
        issued_at: '2026-10-22T08:00:00Z',
        issued_by_name: 'Pak Gudang',
        issued_by_role: 'petugas_gudang',
        audit_notes: 'Rilis pemotongan chasis',
        spk: { id: 'spk-uuid-7080', spk_no: 'SPK-7080', status: 'IN_PROGRESS' },
        materials: { name: 'Mata Gerinda Potong', unit: 'pcs', unit_price: 15000 },
      },
      {
        id: 'tx-7080-2',
        spk_id: 'spk-uuid-7080',
        material_id: 'mat-amplas150',
        quantity_issued: 1,
        custom_unit_price: 8000,
        issued_at: '2026-10-22T08:15:00Z',
        issued_by_name: 'Pak Gudang',
        issued_by_role: 'petugas_gudang',
        audit_notes: 'Rilis amplas halus',
        spk: { id: 'spk-uuid-7080', spk_no: 'SPK-7080', status: 'IN_PROGRESS' },
        materials: { name: 'Amplas 150', unit: 'lbr', unit_price: 8000 },
      },
      {
        id: 'tx-7080-3',
        spk_id: 'spk-uuid-7080',
        material_id: 'mat-amplas100',
        quantity_issued: 0.75,
        custom_unit_price: 12000,
        issued_at: '2026-10-22T08:30:00Z',
        issued_by_name: 'Pak Gudang',
        issued_by_role: 'petugas_gudang',
        audit_notes: 'Rilis amplas kasar',
        spk: { id: 'spk-uuid-7080', spk_no: 'SPK-7080', status: 'IN_PROGRESS' },
        materials: { name: 'Amplas 100', unit: 'mtr', unit_price: 12000 },
      },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'inventory_transactions') {
        const queryObj: any = {};
        queryObj.select = vi.fn().mockReturnValue(queryObj);
        queryObj.eq = vi.fn().mockReturnValue(queryObj);
        queryObj.gt = vi.fn().mockReturnValue(queryObj);
        queryObj.limit = vi.fn().mockReturnValue(queryObj);
        queryObj.order = vi.fn().mockResolvedValue({
          data: spk7080Transactions,
          error: null,
        });
        return queryObj;
      }
      return {
        select: vi.fn().mockReturnValue({
          ilike: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'spk-uuid-7080', spk_no: 'SPK-7080' },
              error: null,
            }),
          }),
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'spk-uuid-7080', spk_no: 'SPK-7080' },
              error: null,
            }),
          }),
        }),
      } as any;
    });

    render(<RecentMaterialIssues selectedSpkFilter="SPK-7080" selectedSpkId="spk-uuid-7080" refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('Mata Gerinda Potong')).toBeInTheDocument();
      expect(screen.getByText('4 pcs')).toBeInTheDocument();
      expect(screen.getByText('Amplas 150')).toBeInTheDocument();
      expect(screen.getByText('1 lbr')).toBeInTheDocument();
      expect(screen.getByText('Amplas 100')).toBeInTheDocument();
      expect(screen.getByText('0.75 mtr')).toBeInTheDocument();
    });
  });

  it('falls back gracefully to material_issues if inventory_transactions fails completely', async () => {
    const fallbackIssues = [
      {
        id: 'mi-1',
        spk_id: 'spk-uuid-7080',
        material_id: 'mat-cat',
        quantity: 2,
        unit_price: 75000,
        created_at: '2026-10-22T10:00:00Z',
        issued_by_name: 'Donny SA',
        issued_by_role: 'service_advisor',
        audit_notes: 'Cat Dasar Epoxy',
        spk: { id: 'spk-uuid-7080', spk_no: 'SPK-7080' },
        materials: { name: 'Cat Epoxy Primer', unit: 'Kaleng', unit_price: 75000 },
      },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'inventory_transactions') {
        const queryObj: any = {};
        queryObj.select = vi.fn().mockReturnValue(queryObj);
        queryObj.eq = vi.fn().mockReturnValue(queryObj);
        queryObj.gt = vi.fn().mockReturnValue(queryObj);
        queryObj.limit = vi.fn().mockReturnValue(queryObj);
        queryObj.order = vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Column not found or schema mismatch' },
        });
        return queryObj;
      }
      if (table === 'material_issues') {
        const queryObj: any = {};
        queryObj.select = vi.fn().mockReturnValue(queryObj);
        queryObj.eq = vi.fn().mockReturnValue(queryObj);
        queryObj.limit = vi.fn().mockReturnValue(queryObj);
        queryObj.order = vi.fn().mockResolvedValue({
          data: fallbackIssues,
          error: null,
        });
        return queryObj;
      }
      return {
        select: vi.fn().mockReturnValue({
          ilike: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'spk-uuid-7080', spk_no: 'SPK-7080' },
              error: null,
            }),
          }),
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'spk-uuid-7080', spk_no: 'SPK-7080' },
              error: null,
            }),
          }),
        }),
      } as any;
    });

    render(<RecentMaterialIssues selectedSpkFilter="SPK-7080" selectedSpkId="spk-uuid-7080" refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('Cat Epoxy Primer')).toBeInTheDocument();
      expect(screen.getByText('2 Kaleng')).toBeInTheDocument();
      expect(screen.getByText('SA (Backup)')).toBeInTheDocument();
    });
  });

  it('renders WBS column in table header and displays formatted WBS badge per row', async () => {
    const transactionsWithWbs = [
      {
        id: 'tx-wbs-1',
        spk_id: 'spk-uuid-7080',
        material_id: 'mat-1',
        quantity_issued: 10,
        custom_unit_price: 50000,
        issued_at: '2026-10-22T08:00:00Z',
        issued_by_name: 'Budi Gudang',
        issued_by_role: 'petugas_gudang',
        material_requisitions: { id: 'req-1', wbs_category: 'Pembongkaran' },
        material_requisition_items: { id: 'req-item-1', wbs_stage: 'WBS 1: Pembongkaran' },
        spk: { id: 'spk-uuid-7080', spk_no: 'SPK-7080' },
        materials: { name: 'Mata Gerinda', unit: 'PCS', unit_price: 50000 },
      },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'inventory_transactions') {
        const queryObj: any = {};
        queryObj.select = vi.fn().mockReturnValue(queryObj);
        queryObj.eq = vi.fn().mockReturnValue(queryObj);
        queryObj.gt = vi.fn().mockReturnValue(queryObj);
        queryObj.limit = vi.fn().mockReturnValue(queryObj);
        queryObj.order = vi.fn().mockResolvedValue({
          data: transactionsWithWbs,
          error: null,
        });
        return queryObj;
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'spk-uuid-7080', spk_no: 'SPK-7080' },
              error: null,
            }),
          }),
        }),
      } as any;
    });

    render(<RecentMaterialIssues selectedSpk="SPK-7080" refreshKey={0} />);

    await waitFor(() => {
      // 1. Table Header contains WBS/Tahapan column
      expect(screen.getByRole('columnheader', { name: /(?:WBS|Tahapan)/i })).toBeInTheDocument();
      // 2. Row displays formatted WBS/Tahapan badge
      expect(screen.getByText(/(?:WBS|Tahapan) 1: Pembongkaran/)).toBeInTheDocument();
      expect(screen.getByText('Mata Gerinda')).toBeInTheDocument();
    });
  });

  it('sorts issues strictly in ascending WBS stage order (WBS 1 -> WBS 2 -> WBS 3 -> WBS 4 -> WBS 5)', async () => {
    const unsortedTransactions = [
      {
        id: 'tx-stage-4',
        spk_id: 'spk-uuid-7080',
        material_id: 'mat-cat',
        quantity_issued: 2,
        custom_unit_price: 100000,
        issued_at: '2026-10-22T10:00:00Z',
        wbs_stage: 'WBS 4: Pengecatan',
        spk: { id: 'spk-uuid-7080', spk_no: 'SPK-7080' },
        materials: { name: 'Cat Finishing Gloss', unit: 'Kaleng', unit_price: 100000 },
      },
      {
        id: 'tx-stage-1',
        spk_id: 'spk-uuid-7080',
        material_id: 'mat-bongkar',
        quantity_issued: 4,
        custom_unit_price: 25000,
        issued_at: '2026-10-22T08:00:00Z',
        wbs_stage: 'Pembongkaran',
        spk: { id: 'spk-uuid-7080', spk_no: 'SPK-7080' },
        materials: { name: 'Mata Potong Besi', unit: 'PCS', unit_price: 25000 },
      },
      {
        id: 'tx-stage-3',
        spk_id: 'spk-uuid-7080',
        material_id: 'mat-dinding',
        quantity_issued: 1,
        custom_unit_price: 800000,
        issued_at: '2026-10-22T09:30:00Z',
        wbs_stage: 'WBS 3: Dinding/Fabrikasi',
        spk: { id: 'spk-uuid-7080', spk_no: 'SPK-7080' },
        materials: { name: 'Plat Galvanil 2mm', unit: 'Lembar', unit_price: 800000 },
      },
      {
        id: 'tx-stage-2',
        spk_id: 'spk-uuid-7080',
        material_id: 'mat-sasis',
        quantity_issued: 6,
        custom_unit_price: 150000,
        issued_at: '2026-10-22T09:00:00Z',
        wbs_stage: 'Sasis/Rangka',
        spk: { id: 'spk-uuid-7080', spk_no: 'SPK-7080' },
        materials: { name: 'Besi UNP 100', unit: 'Batang', unit_price: 150000 },
      },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'inventory_transactions') {
        const queryObj: any = {};
        queryObj.select = vi.fn().mockReturnValue(queryObj);
        queryObj.eq = vi.fn().mockReturnValue(queryObj);
        queryObj.gt = vi.fn().mockReturnValue(queryObj);
        queryObj.limit = vi.fn().mockReturnValue(queryObj);
        queryObj.order = vi.fn().mockResolvedValue({
          data: unsortedTransactions,
          error: null,
        });
        return queryObj;
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'spk-uuid-7080', spk_no: 'SPK-7080' },
              error: null,
            }),
          }),
        }),
      } as any;
    });

    render(<RecentMaterialIssues selectedSpk="SPK-7080" refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('Mata Potong Besi')).toBeInTheDocument();
      expect(screen.getByText('Besi UNP 100')).toBeInTheDocument();
      expect(screen.getByText('Plat Galvanil 2mm')).toBeInTheDocument();
      expect(screen.getByText('Cat Finishing Gloss')).toBeInTheDocument();
    });

    // Verify rows are strictly rendered in ascending WBS sequence (WBS 1 -> WBS 2 -> WBS 3 -> WBS 4)
    const rows = screen.getAllByRole('row');
    // Index 0 is the table header row
    expect(rows[1]).toHaveTextContent(/(?:WBS|Tahapan) 1: Pembongkaran/);
    expect(rows[1]).toHaveTextContent('Mata Potong Besi');

    expect(rows[2]).toHaveTextContent(/(?:WBS|Tahapan) 2: Sasis\/Rangka/);
    expect(rows[2]).toHaveTextContent('Besi UNP 100');

    expect(rows[3]).toHaveTextContent(/(?:WBS|Tahapan) 3: Dinding\/Fabrikasi/);
    expect(rows[3]).toHaveTextContent('Plat Galvanil 2mm');

    expect(rows[4]).toHaveTextContent(/(?:WBS|Tahapan) 4: Pengecatan/);
    expect(rows[4]).toHaveTextContent('Cat Finishing Gloss');
  });

  it('renders exact Task 3 table header columns and badge styling with secondary timestamp sorting', async () => {
    const multiIssuesWithSameWbs = [
      {
        id: 'tx-wbs2-older',
        spk_id: 'spk-uuid-7080',
        material_id: 'mat-old',
        quantity_issued: 3,
        issued_at: '2026-10-22T08:00:00Z',
        wbs_stage: 'WBS 2: Sasis/Rangka',
        spk: { id: 'spk-uuid-7080', spk_no: 'SPK-7080' },
        materials: { name: 'Besi UNP Lama', unit: 'Batang', unit_price: 100000 },
      },
      {
        id: 'tx-wbs1',
        spk_id: 'spk-uuid-7080',
        material_id: 'mat-wbs1',
        quantity_issued: 2,
        issued_at: '2026-10-22T08:30:00Z',
        wbs_stage: 'Pembongkaran',
        spk: { id: 'spk-uuid-7080', spk_no: 'SPK-7080' },
        materials: { name: 'Mata Gerinda', unit: 'PCS', unit_price: 20000 },
      },
      {
        id: 'tx-wbs2-newer',
        spk_id: 'spk-uuid-7080',
        material_id: 'mat-new',
        quantity_issued: 5,
        issued_at: '2026-10-22T10:00:00Z',
        wbs_stage: 'WBS 2: Sasis/Rangka',
        spk: { id: 'spk-uuid-7080', spk_no: 'SPK-7080' },
        materials: { name: 'Besi UNP Baru', unit: 'Batang', unit_price: 120000 },
      },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'inventory_transactions') {
        const queryObj: any = {};
        queryObj.select = vi.fn().mockReturnValue(queryObj);
        queryObj.eq = vi.fn().mockReturnValue(queryObj);
        queryObj.gt = vi.fn().mockReturnValue(queryObj);
        queryObj.limit = vi.fn().mockReturnValue(queryObj);
        queryObj.order = vi.fn().mockResolvedValue({
          data: multiIssuesWithSameWbs,
          error: null,
        });
        return queryObj;
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'spk-uuid-7080', spk_no: 'SPK-7080' },
              error: null,
            }),
          }),
        }),
      } as any;
    });

    render(<RecentMaterialIssues selectedSpk="SPK-7080" refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('Mata Gerinda')).toBeInTheDocument();
      expect(screen.getByText('Besi UNP Baru')).toBeInTheDocument();
      expect(screen.getByText('Besi UNP Lama')).toBeInTheDocument();
    });

    // 1. Verify table header columns order
    const tableHeader = screen.getAllByRole('row')[0];
    const headerCells = tableHeader.querySelectorAll('th');
    expect(headerCells).toHaveLength(10);
    expect(headerCells[0]).toHaveTextContent(''); // Checkbox
    expect(headerCells[1]).toHaveTextContent(/(?:WBS|Tahapan)/);
    expect(headerCells[2]).toHaveTextContent('SUMBER / PAKET');
    expect(headerCells[3]).toHaveTextContent('TIME');
    expect(headerCells[4]).toHaveTextContent('SPK NO.');
    expect(headerCells[5]).toHaveTextContent('MATERIAL');
    expect(headerCells[6]).toHaveTextContent('QTY');
    expect(headerCells[7]).toHaveTextContent('HARGA (RP)');
    expect(headerCells[8]).toHaveTextContent('EKSEKUTOR / AUDIT');
    expect(headerCells[9]).toHaveTextContent('AKSI');

    // 2. Verify sorted rows: WBS 1 first, then WBS 2 (newer timestamp 10:00 before older timestamp 08:00)
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Mata Gerinda'); // WBS 1
    expect(rows[2]).toHaveTextContent('Besi UNP Baru'); // WBS 2 (newer)
    expect(rows[3]).toHaveTextContent('Besi UNP Lama'); // WBS 2 (older)

    // 3. Verify badge styling classes on WBS cell
    const wbsBadge = rows[1].querySelector('span.bg-slate-800');
    expect(wbsBadge).toBeInTheDocument();
    expect(wbsBadge?.className).toContain('text-amber-300');
    expect(wbsBadge).toHaveTextContent(/(?:WBS|Tahapan) 1: Pembongkaran/);
  });

  it('renders correct source origin badges for Package, Change Order, and RAB items in Recent Material Issues', async () => {
    const issuesWithSources = [
      {
        id: 'tx-pkg',
        spk_id: 'spk-uuid-7080',
        material_id: 'mat-pkg',
        quantity_issued: 2,
        custom_unit_price: 350000,
        issued_at: '2026-10-22T08:00:00Z',
        wbs_stage: 'WBS 2: Sasis/Rangka',
        spk: { id: 'spk-uuid-7080', spk_no: 'SPK-7080' },
        materials: { name: 'Dudukan Slebor Besi', unit: 'Set', unit_price: 350000 },
        material_requisition_items: {
          id: 'mri-pkg',
          wbs_stage: 'WBS 2: Sasis/Rangka',
          package_name: 'HPP DUDUKAN SLEBOR',
          rab_items: {
            id: 'rab-pkg',
            product_packages: { name: 'HPP DUDUKAN SLEBOR' },
          },
        },
      },
      {
        id: 'tx-co',
        spk_id: 'spk-uuid-7080',
        material_id: 'mat-co',
        quantity_issued: 1,
        custom_unit_price: 150000,
        issued_at: '2026-10-22T08:30:00Z',
        wbs_stage: 'WBS 3: Dinding/Fabrikasi',
        spk: { id: 'spk-uuid-7080', spk_no: 'SPK-7080' },
        materials: { name: 'Plat Adendum Tambahan', unit: 'Lembar', unit_price: 150000 },
        material_requisition_items: {
          id: 'mri-co',
          wbs_stage: 'WBS 3: Dinding/Fabrikasi',
          change_order_item_id: 'co-item-1',
          change_order_items: { id: 'co-item-1', item_name: 'Plat Adendum Tambahan' },
        },
      },
      {
        id: 'tx-rab',
        spk_id: 'spk-uuid-7080',
        material_id: 'mat-rab',
        quantity_issued: 4,
        custom_unit_price: 25000,
        issued_at: '2026-10-22T09:00:00Z',
        wbs_stage: 'WBS 1: Pembongkaran',
        spk: { id: 'spk-uuid-7080', spk_no: 'SPK-7080' },
        materials: { name: 'Mata Gerinda Pemotong', unit: 'PCS', unit_price: 25000 },
        material_requisition_items: {
          id: 'mri-rab',
          wbs_stage: 'WBS 1: Pembongkaran',
          rab_item_id: 'rab-item-1',
        },
      },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'inventory_transactions') {
        const queryObj: any = {};
        queryObj.select = vi.fn().mockReturnValue(queryObj);
        queryObj.eq = vi.fn().mockReturnValue(queryObj);
        queryObj.gt = vi.fn().mockReturnValue(queryObj);
        queryObj.limit = vi.fn().mockReturnValue(queryObj);
        queryObj.order = vi.fn().mockResolvedValue({
          data: issuesWithSources,
          error: null,
        });
        return queryObj;
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'spk-uuid-7080', spk_no: 'SPK-7080' },
              error: null,
            }),
          }),
        }),
      } as any;
    });

    render(<RecentMaterialIssues selectedSpk="SPK-7080" refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('Dudukan Slebor Besi')).toBeInTheDocument();
      expect(screen.getByText('Plat Adendum Tambahan')).toBeInTheDocument();
      expect(screen.getByText('Mata Gerinda Pemotong')).toBeInTheDocument();
    });

    // Verify package badge
    const pkgText = screen.getByText('RAB • Paket: HPP DUDUKAN SLEBOR');
    const pkgBadge = pkgText.closest('span[class*="rounded"]') || pkgText;
    expect(pkgText).toBeInTheDocument();
    expect(pkgBadge.className).toContain('text-amber-300');
    expect(pkgBadge.className).toContain('bg-amber-950/70');

    // Verify change order badge
    const coText = screen.getByText('Change Order • Granular');
    const coBadge = coText.closest('span[class*="rounded"]') || coText;
    expect(coText).toBeInTheDocument();
    expect(coBadge.className).toContain('text-indigo-300');
    expect(coBadge.className).toContain('bg-indigo-950/70');

    // Verify RAB badge
    const rabText = screen.getByText('RAB • Granular');
    const rabBadge = rabText.closest('span[class*="rounded"]') || rabText;
    expect(rabText).toBeInTheDocument();
    expect(rabBadge.className).toContain('text-blue-300');
    expect(rabBadge.className).toContain('bg-blue-950/70');
  });

  it('renders direct source_type, change_order_id, and package_name at table cell index 2', async () => {
    const directFieldTransactions = [
      {
        id: 'tx-direct-fields',
        spk_id: 'spk-uuid-7080',
        material_id: 'mat-pkg-direct',
        quantity_issued: 2,
        custom_unit_price: 350000,
        source_type: 'PACKAGE',
        package_name: 'BAK DUMP TRUCK',
        change_order_id: null,
        issued_at: '2026-10-22T08:00:00Z',
        wbs_stage: 'WBS 3: Dinding/Fabrikasi',
        spk: { id: 'spk-uuid-7080', spk_no: 'SPK-7080' },
        materials: { name: 'Dinding Samping Bak', unit: 'Set', unit_price: 350000 },
      },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'inventory_transactions') {
        const queryObj: any = {};
        queryObj.select = vi.fn().mockReturnValue(queryObj);
        queryObj.eq = vi.fn().mockReturnValue(queryObj);
        queryObj.gt = vi.fn().mockReturnValue(queryObj);
        queryObj.limit = vi.fn().mockReturnValue(queryObj);
        queryObj.order = vi.fn().mockResolvedValue({
          data: directFieldTransactions,
          error: null,
        });
        return queryObj;
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'spk-uuid-7080', spk_no: 'SPK-7080' },
              error: null,
            }),
          }),
        }),
      } as any;
    });

    render(<RecentMaterialIssues selectedSpk="SPK-7080" refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('Dinding Samping Bak')).toBeInTheDocument();
    });

    const rows = screen.getAllByRole('row');
    const dataRow = rows[1];
    const cells = dataRow.querySelectorAll('td');

    // Index 0: Checkbox
    // Index 1: WBS/Tahapan badge
    expect(cells[1]).toHaveTextContent(/(?:WBS|Tahapan) 3: Dinding\/Fabrikasi/);
    // Index 2: SUMBER / PAKET badge
    expect(cells[2]).toHaveTextContent('RAB • Paket: BAK DUMP TRUCK');
    // Index 3: TIME
    // Index 4: SPK NO.
    expect(cells[4]).toHaveTextContent('SPK-7080');
    // Index 5: MATERIAL
    expect(cells[5]).toHaveTextContent('Dinding Samping Bak');
  });

  it('resolves package name from SPK active rab_items fallback when transaction package_name is NULL (SPK-7080 WBS 1 bug fix)', async () => {
    const issuesWithoutPackageField = [
      {
        id: 'tx-pkg-fallback',
        spk_id: 'spk-uuid-7080',
        material_id: 'mat-winglet-1',
        quantity_issued: 2,
        custom_unit_price: 250000,
        package_name: null,
        source_type: null,
        issued_at: '2026-10-22T08:00:00Z',
        wbs_stage: 'WBS 1: Pembongkaran',
        spk: { id: 'spk-uuid-7080', spk_no: 'SPK-7080' },
        materials: { name: 'WINGLET DEPAN', unit: 'Set', unit_price: 250000 },
        material_requisition_items: {
          id: 'mri-winglet',
          wbs_stage: 'WBS 1: Pembongkaran',
          package_name: null,
          rab_item_id: null,
        },
      },
      {
        id: 'tx-truly-granular',
        spk_id: 'spk-uuid-7080',
        material_id: 'mat-loose-screw',
        quantity_issued: 10,
        custom_unit_price: 1500,
        package_name: null,
        source_type: null,
        issued_at: '2026-10-22T08:15:00Z',
        wbs_stage: 'WBS 1: Pembongkaran',
        spk: { id: 'spk-uuid-7080', spk_no: 'SPK-7080' },
        materials: { name: 'Sekrup Lepas 5mm', unit: 'PCS', unit_price: 1500 },
        material_requisition_items: {
          id: 'mri-screw',
          wbs_stage: 'WBS 1: Pembongkaran',
          package_name: null,
          rab_item_id: null,
        },
      },
    ];

    const mockRabItemsWithPackage = [
      {
        material_id: 'mat-winglet-1',
        wbs_stage: 'WBS 1: Pembongkaran',
        wbs_category: 'Pembongkaran',
        package_id: 'pkg-winglet-assy',
        product_packages: { id: 'pkg-winglet-assy', name: 'PAKET PERAKITAN WINGLET' },
      },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'inventory_transactions') {
        const queryObj: any = {};
        queryObj.select = vi.fn().mockReturnValue(queryObj);
        queryObj.eq = vi.fn().mockReturnValue(queryObj);
        queryObj.gt = vi.fn().mockReturnValue(queryObj);
        queryObj.limit = vi.fn().mockReturnValue(queryObj);
        queryObj.order = vi.fn().mockResolvedValue({
          data: issuesWithoutPackageField,
          error: null,
        });
        return queryObj;
      }
      if (table === 'rab_items') {
        const queryObj: any = {};
        queryObj.select = vi.fn().mockReturnValue(queryObj);
        queryObj.eq = vi.fn().mockReturnValue(queryObj);
        queryObj.not = vi.fn().mockResolvedValue({
          data: mockRabItemsWithPackage,
          error: null,
        });
        return queryObj;
      }
      if (table === 'rab_estimations') {
        const queryObj: any = {};
        queryObj.select = vi.fn().mockReturnValue(queryObj);
        queryObj.eq = vi.fn().mockResolvedValue({
          data: [{ id: 'est-7080' }],
          error: null,
        });
        return queryObj;
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'spk-uuid-7080', spk_no: 'SPK-7080' },
              error: null,
            }),
          }),
        }),
      } as any;
    });

    render(<RecentMaterialIssues selectedSpk="SPK-7080" refreshKey={0} />);

    await waitFor(() => {
      expect(screen.getByText('WINGLET DEPAN')).toBeInTheDocument();
      expect(screen.getByText('Sekrup Lepas 5mm')).toBeInTheDocument();
    });

    // 1. WINGLET DEPAN must resolve to package name from rab_items, NOT Granular
    expect(screen.getByText('RAB • Paket: PAKET PERAKITAN WINGLET')).toBeInTheDocument();

    // 2. Sekrup Lepas 5mm (truly loose) must fallback to Granular
    expect(screen.getByText('RAB • Granular')).toBeInTheDocument();
  });
});

