import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MandorDashboard } from '../MandorDashboard';
import { SpkSelector } from '../../components/SpkSelector';
import { supabase } from '../../lib/supabaseClient';
import type { Spk } from '../../types/spk';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'mandor-1', email: 'mandor@robelkaroseri.com' },
    profile: { id: 'mandor-1', full_name: 'Pak Mandor Joko', role: 'mandor' },
    signOut: vi.fn(),
  }),
}));

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock sub-components inside WbsChecklist if needed
vi.mock('../../components/WbsChecklist', () => ({
  WbsChecklist: ({ spkId }: { spkId: string }) => (
    <div data-testid="wbs-checklist-panel">
      <span>WBS Checklist Taskboard for SPK {spkId}</span>
      <button>Minta Material</button>
      <button>SPK Borongan</button>
    </div>
  ),
}));

vi.mock('../../components/QcInspectionForm', () => ({
  QcInspectionForm: ({ spkId }: { spkId: string }) => (
    <div data-testid="qc-inspection-panel">
      <span>QC Inspection Form for SPK {spkId}</span>
    </div>
  ),
}));

describe('Mandor Terminal - SPK Isolation (Exclude Hidden and Test SPKs)', () => {
  const mockMixedSpks: Spk[] = [
    // 1. Valid Operational SPK 1
    {
      id: 'spk-valid-1',
      spk_no: 'SPK-7001',
      spk_number: 'SPK-7001',
      customer_name: 'ROBEL STOK JUMIN CANTER',
      vehicle_plate: 'AD 1234 AB',
      vehicle_number: 'AD 1234 AB',
      status: 'ACTIVE',
      qc_status: 'PENDING',
      sub_tasks: ['Dump Truk', 'Pengecatan'],
      created_at: '2026-11-01T08:00:00Z',
      is_hidden: false,
      is_test: false,
    },
    // 2. Valid Operational SPK 2
    {
      id: 'spk-valid-2',
      spk_no: 'SPK-7002',
      spk_number: 'SPK-7002',
      customer_name: 'STOK SLEBOR HEREK',
      vehicle_plate: 'AE 9876 CD',
      vehicle_number: 'AE 9876 CD',
      status: 'ACTIVE',
      qc_status: 'PASS',
      sub_tasks: ['Bak Besi'],
      created_at: '2026-11-02T08:00:00Z',
      is_hidden: false,
      is_test: false,
    },
    // 3. Hidden / Isolated Test SPK (e.g. SPK-8209 / TES 1)
    {
      id: 'spk-hidden-test-8209',
      spk_no: 'SPK-8209',
      spk_number: 'SPK-8209',
      customer_name: 'TES 1',
      vehicle_plate: 'AE 4566 SDD',
      vehicle_number: 'AE 4566 SDD',
      status: 'ACTIVE',
      qc_status: 'PENDING',
      sub_tasks: ['Uji Coba Sistem'],
      created_at: '2026-11-03T08:00:00Z',
      is_hidden: true,
      is_test: true,
    },
    // 4. Another hidden SPK (archived)
    {
      id: 'spk-hidden-archived',
      spk_no: 'SPK-9999',
      spk_number: 'SPK-9999',
      customer_name: 'SPK Arsip Lama',
      vehicle_plate: 'B 1111 AR',
      vehicle_number: 'B 1111 AR',
      status: 'ACTIVE',
      qc_status: 'PENDING',
      sub_tasks: [],
      created_at: '2026-11-04T08:00:00Z',
      is_hidden: true,
      is_test: false,
    },
    // 5. Another test sandbox SPK
    {
      id: 'spk-sandbox-test',
      spk_no: 'SPK-TEST-99',
      spk_number: 'SPK-TEST-99',
      customer_name: 'Tester Developer Sandbox',
      vehicle_plate: 'N 0000 DEV',
      vehicle_number: 'N 0000 DEV',
      status: 'ACTIVE',
      qc_status: 'PENDING',
      sub_tasks: [],
      created_at: '2026-11-05T08:00:00Z',
      is_hidden: false,
      is_test: true,
    },
  ];

  let capturedQueryFilters: Array<{ col: string; val: any }>;

  beforeEach(() => {
    vi.clearAllMocks();
    capturedQueryFilters = [];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'spk') {
        const queryChain: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((col: string, val: any) => {
            capturedQueryFilters.push({ col, val });
            return queryChain;
          }),
          order: vi.fn().mockImplementation(() => {
            // Filter data according to captured query filters to simulate real Supabase behavior
            let result = [...mockMixedSpks];
            for (const filter of capturedQueryFilters) {
              result = result.filter((item: any) => item[filter.col] === filter.val);
            }
            return Promise.resolve({ data: result, error: null });
          }),
        };
        return queryChain;
      }

      if (table === 'material_requisitions') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [
              { id: 'req-1', spk_id: 'spk-valid-1' },
            ],
            error: null,
          }),
        } as any;
      }

      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any;
    });
  });

  it('queries Supabase with is_hidden = false and is_test = false filters', async () => {
    render(
      <MemoryRouter initialEntries={['/mandor']}>
        <MandorDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('ROBEL STOK JUMIN CANTER')).toBeInTheDocument();
    });

    // Check captured filters
    const hiddenFilter = capturedQueryFilters.find((f) => f.col === 'is_hidden');
    const testFilter = capturedQueryFilters.find((f) => f.col === 'is_test');
    const statusFilter = capturedQueryFilters.find((f) => f.col === 'status');

    expect(statusFilter).toBeDefined();
    expect(statusFilter?.val).toBe('ACTIVE');

    expect(hiddenFilter).toBeDefined();
    expect(hiddenFilter?.val).toBe(false);

    expect(testFilter).toBeDefined();
    expect(testFilter?.val).toBe(false);
  });

  it('excludes hidden and test SPKs (like SPK-8209 / TES 1) from the active list', async () => {
    render(
      <MemoryRouter initialEntries={['/mandor']}>
        <MandorDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('ROBEL STOK JUMIN CANTER')).toBeInTheDocument();
      expect(screen.getByText('STOK SLEBOR HEREK')).toBeInTheDocument();
    });

    // SPK-8209 and TES 1 must NOT appear
    expect(screen.queryByText('SPK-8209')).not.toBeInTheDocument();
    expect(screen.queryByText('TES 1')).not.toBeInTheDocument();
    expect(screen.queryByText('[ AE 4566 SDD ]')).not.toBeInTheDocument();

    // Other test / archived SPKs must not appear
    expect(screen.queryByText('SPK-9999')).not.toBeInTheDocument();
    expect(screen.queryByText('Tester Developer Sandbox')).not.toBeInTheDocument();
  });

  it('displays the synchronized badge counter showing only operational SPK count', async () => {
    render(
      <MemoryRouter initialEntries={['/mandor']}>
        <MandorDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('2 SPK Aktif')).toBeInTheDocument();
    });
  });

  it('resets selection and shows placeholder if URL param points to an isolated SPK', async () => {
    // Initial route points to the hidden SPK id
    render(
      <MemoryRouter initialEntries={['/mandor?spkId=spk-hidden-test-8209']}>
        <MandorDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Belum Ada SPK Dipilih')).toBeInTheDocument();
    });

    // WBS and QC panels must not be rendered for the hidden SPK
    expect(screen.queryByTestId('wbs-checklist-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('qc-inspection-panel')).not.toBeInTheDocument();
    expect(
      screen.getByText(/Pilih salah satu SPK aktif dari daftar di sebelah kiri/i)
    ).toBeInTheDocument();
  });

  it('allows clicking an operational SPK to open taskboard and QC inspection', async () => {
    render(
      <MemoryRouter initialEntries={['/mandor']}>
        <MandorDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('ROBEL STOK JUMIN CANTER')).toBeInTheDocument();
    });

    // Initially placeholder is visible
    expect(screen.getByText('Belum Ada SPK Dipilih')).toBeInTheDocument();

    // Click operational SPK
    fireEvent.click(screen.getByText('ROBEL STOK JUMIN CANTER'));

    // Taskboard and QC panel should now appear
    await waitFor(() => {
      expect(screen.getByTestId('wbs-checklist-panel')).toBeInTheDocument();
      expect(screen.getByTestId('qc-inspection-panel')).toBeInTheDocument();
    });

    expect(screen.getByText('WBS Checklist Taskboard for SPK spk-valid-1')).toBeInTheDocument();
  });
});

describe('SpkSelector Component In-Memory Isolation Defense', () => {
  const dummySpks: Spk[] = [
    {
      id: 'op-1',
      spk_no: 'SPK-100',
      customer_name: 'Customer 100',
      vehicle_plate: 'B 100 AA',
      vehicle_number: 'B 100 AA',
      status: 'ACTIVE',
      created_at: '2026-11-01',
      is_hidden: false,
      is_test: false,
    },
    {
      id: 'op-2',
      spk_no: 'SPK-200',
      customer_name: 'Customer 200',
      vehicle_plate: 'B 200 BB',
      vehicle_number: 'B 200 BB',
      status: 'ACTIVE',
      created_at: '2026-11-02',
      is_hidden: false,
      is_test: false,
    },
    {
      id: 'hidden-3',
      spk_no: 'SPK-8209',
      customer_name: 'TES 1',
      vehicle_plate: 'AE 4566 SDD',
      vehicle_number: 'AE 4566 SDD',
      status: 'ACTIVE',
      created_at: '2026-11-03',
      is_hidden: true,
      is_test: true,
    },
  ];

  it('in-memory defense filters out hidden/test SPKs and computes accurate badge counter', () => {
    const handleSelect = vi.fn();

    render(
      <SpkSelector
        spks={dummySpks}
        selectedSpkId=""
        onSelectSpk={handleSelect}
      />
    );

    // Badge shows only 2 operational SPKs, not 3
    expect(screen.getByText('2 SPK Aktif')).toBeInTheDocument();

    // Cards
    expect(screen.getByText('SPK-100')).toBeInTheDocument();
    expect(screen.getByText('SPK-200')).toBeInTheDocument();
    expect(screen.queryByText('SPK-8209')).not.toBeInTheDocument();
    expect(screen.queryByText('TES 1')).not.toBeInTheDocument();
  });

  it('triggers onSelectSpk("") if selectedSpkId points to a hidden SPK', () => {
    const handleSelect = vi.fn();

    render(
      <SpkSelector
        spks={dummySpks}
        selectedSpkId="hidden-3"
        onSelectSpk={handleSelect}
      />
    );

    expect(handleSelect).toHaveBeenCalledWith('');
  });

  it('search box only filters among operational SPKs', () => {
    const handleSelect = vi.fn();

    render(
      <SpkSelector
        spks={dummySpks}
        selectedSpkId=""
        onSelectSpk={handleSelect}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Cari SPK, customer, plat, sub-task.../i);
    fireEvent.change(searchInput, { target: { value: 'Customer 100' } });

    expect(screen.getByText('1 dari 2 SPK')).toBeInTheDocument();
    expect(screen.getByText('SPK-100')).toBeInTheDocument();
    expect(screen.queryByText('SPK-200')).not.toBeInTheDocument();

    // Searching for hidden SPK yields no results
    fireEvent.change(searchInput, { target: { value: 'TES 1' } });
    expect(screen.getByText('0 dari 2 SPK')).toBeInTheDocument();
    expect(screen.getByText(/Tidak ada SPK yang cocok/i)).toBeInTheDocument();
  });
});

