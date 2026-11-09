import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ServiceAdvisorDashboard } from '../ServiceAdvisorDashboard';
import { supabase } from '../../lib/supabaseClient';

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'sa-user-1', full_name: 'Budi Advisor', role: 'service_advisor' },
    signOut: vi.fn(),
  }),
}));

// Mock child components that are not under direct test to keep test isolated and fast
vi.mock('../../components/SpkForm', () => ({
  SpkForm: () => <div data-testid="spk-form">Spk Form</div>,
}));

vi.mock('../../components/RabCalculator', () => ({
  RabCalculator: () => <div data-testid="rab-calculator">RAB Calculator</div>,
}));

vi.mock('../../components/AmendmentManager', () => ({
  AmendmentManager: () => <div data-testid="amendment-manager">Amendment Manager</div>,
}));

vi.mock('../../components/service_advisor/RabPerubahanTab', () => ({
  RabPerubahanTab: () => <div data-testid="rab-perubahan-tab">RAB Perubahan Tab</div>,
}));

vi.mock('../../components/WbsChecklist', () => ({
  WbsChecklist: () => <div data-testid="wbs-checklist">WBS Checklist</div>,
}));

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Page: ServiceAdvisorDashboard (Exclusion of Hidden & Test SPKs)', () => {
  const operationalSpks = [
    {
      id: 'spk-8061',
      spk_no: 'SPK-8061',
      customer_name: 'PT Karoseri Maju',
      vehicle_plate: 'B 8061 ABC',
      status: 'ACTIVE',
      target_date: '2026-12-01',
      is_hidden: false,
      is_test: false,
    },
    {
      id: 'spk-2537',
      spk_no: 'SPK-2537',
      customer_name: 'CV Armada Sukses',
      vehicle_plate: 'D 2537 XYZ',
      status: 'ACTIVE',
      target_date: '2026-11-20',
      is_hidden: false,
      is_test: false,
    },
    {
      id: 'spk-8017',
      spk_no: 'SPK-8017',
      customer_name: 'Bpk. Ahmad 8017',
      vehicle_plate: 'L 8017 AA',
      status: 'CANCELLED',
      target_date: '2026-11-15',
      is_hidden: false,
      is_test: false,
    },
  ];

  const hiddenOrTestSpks = [
    {
      id: 'spk-8209',
      spk_no: 'SPK-8209',
      customer_name: 'PT Sandbox Uji 8209',
      vehicle_plate: 'L 8209 TEST',
      status: 'ACTIVE',
      is_hidden: true,
      is_test: false,
    },
    {
      id: 'spk-3093',
      spk_no: 'SPK-3093',
      customer_name: 'CV Dummy Test 3093',
      vehicle_plate: 'B 3093 TEST',
      status: 'CANCELLED',
      is_hidden: false,
      is_test: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries spk table with is_hidden = false and is_test = false filters', async () => {
    const eqMock = vi.fn().mockReturnThis();
    const orderMock = vi.fn().mockResolvedValue({
      data: operationalSpks,
      error: null,
    });
    const selectMock = vi.fn().mockReturnValue({
      eq: eqMock,
    });
    eqMock.mockReturnValue({
      eq: eqMock,
      order: orderMock,
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'spk') {
        return {
          select: selectMock,
        } as any;
      }
      if (table === 'material_requisitions') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
          }),
        } as any;
      }
      return {
        select: vi.fn().mockReturnThis(),
      } as any;
    });

    render(<ServiceAdvisorDashboard />);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('spk');
    });

    expect(selectMock).toHaveBeenCalledWith('*');
    expect(eqMock).toHaveBeenCalledWith('is_hidden', false);
    expect(eqMock).toHaveBeenCalledWith('is_test', false);
  });

  it('renders operational SPKs and strictly excludes hidden/test SPKs from active table', async () => {
    // Simulate Supabase returning a mixed list if filter was bypassed or mocked
    const allMixed = [...operationalSpks, ...hiddenOrTestSpks];

    const eqMock = vi.fn().mockReturnThis();
    const orderMock = vi.fn().mockResolvedValue({
      data: allMixed,
      error: null,
    });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    eqMock.mockReturnValue({ eq: eqMock, order: orderMock });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'spk') {
        return { select: selectMock } as any;
      }
      if (table === 'material_requisitions') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
          }),
        } as any;
      }
      return { select: vi.fn().mockReturnThis() } as any;
    });

    render(<ServiceAdvisorDashboard />);

    // Wait for table to load
    await waitFor(() => {
      expect(screen.getByText('SPK-8061')).toBeInTheDocument();
    });

    // Operational active SPKs must appear
    expect(screen.getByText('SPK-8061')).toBeInTheDocument();
    expect(screen.getByText('PT Karoseri Maju')).toBeInTheDocument();
    expect(screen.getByText('SPK-2537')).toBeInTheDocument();
    expect(screen.getByText('CV Armada Sukses')).toBeInTheDocument();

    // Hidden / Test SPKs MUST NOT appear
    expect(screen.queryByText('SPK-8209')).not.toBeInTheDocument();
    expect(screen.queryByText('PT Sandbox Uji 8209')).not.toBeInTheDocument();
    expect(screen.queryByText('SPK-3093')).not.toBeInTheDocument();
  });

  it('excludes hidden/test SPKs when switching to Cancelled tab', async () => {
    const allMixed = [...operationalSpks, ...hiddenOrTestSpks];

    const eqMock = vi.fn().mockReturnThis();
    const orderMock = vi.fn().mockResolvedValue({
      data: allMixed,
      error: null,
    });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    eqMock.mockReturnValue({ eq: eqMock, order: orderMock });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'spk') {
        return { select: selectMock } as any;
      }
      if (table === 'material_requisitions') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
          }),
        } as any;
      }
      return { select: vi.fn().mockReturnThis() } as any;
    });

    render(<ServiceAdvisorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('SPK-8061')).toBeInTheDocument();
    });

    // Switch to Cancelled tab
    const cancelledTabBtn = screen.getByRole('button', { name: 'Cancelled' });
    fireEvent.click(cancelledTabBtn);

    // Cancelled operational SPK must appear
    await waitFor(() => {
      expect(screen.getByText('SPK-8017')).toBeInTheDocument();
    });
    expect(screen.getByText('Bpk. Ahmad 8017')).toBeInTheDocument();

    // Cancelled test SPK (SPK-3093 with is_test = true) must NOT appear
    expect(screen.queryByText('SPK-3093')).not.toBeInTheDocument();
    expect(screen.queryByText('CV Dummy Test 3093')).not.toBeInTheDocument();
  });

  it('excludes hidden/test SPKs from pending requisitions count in warehouse backup view', async () => {
    const mockRequisitions = [
      {
        id: 'req-1',
        status: 'PENDING',
        spk: {
          id: 'spk-8061',
          spk_no: 'SPK-8061',
          customer_name: 'PT Karoseri Maju',
          vehicle_plate: 'B 8061 ABC',
          sub_tasks: ['Pengecatan'],
          is_hidden: false,
          is_test: false,
        },
      },
      {
        id: 'req-2',
        status: 'PENDING',
        spk: {
          id: 'spk-8209',
          spk_no: 'SPK-8209',
          customer_name: 'PT Sandbox Uji 8209',
          vehicle_plate: 'L 8209 TEST',
          sub_tasks: ['Uji Sandbox'],
          is_hidden: true,
          is_test: false,
        },
      },
    ];

    const eqMock = vi.fn().mockReturnThis();
    const orderMock = vi.fn().mockResolvedValue({
      data: operationalSpks,
      error: null,
    });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    eqMock.mockReturnValue({ eq: eqMock, order: orderMock });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'spk') {
        return { select: selectMock } as any;
      }
      if (table === 'material_requisitions') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: mockRequisitions, count: 2, error: null }),
          }),
        } as any;
      }
      return { select: vi.fn().mockReturnThis() } as any;
    });

    render(<ServiceAdvisorDashboard />);

    // In the header, the Operasional Gudang (Backup) badge should show 1 (excluding req-2 on SPK-8209)
    await waitFor(() => {
      expect(screen.getByText('Operasional Gudang (Backup)')).toBeInTheDocument();
    });

    // Count badge should show '1' not '2'
    const badge = screen.getByText('1');
    expect(badge).toBeInTheDocument();
  });
});
