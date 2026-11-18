import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MaterialRequisitionForm } from '../MaterialRequisitionForm';
import { SpkBoronganPanel } from '../SpkBoronganPanel';
import { WbsPendingMaterialModal } from '../WbsPendingMaterialModal';
import { SpkOverheadModal } from '../SpkOverheadModal';
import { setCachedStageAliases, DEFAULT_STAGE_NAMES } from '../../hooks/useStageSettings';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'sa@karoseri.com' },
  }),
}));

vi.mock('../../services/financialReportsService', () => ({
  financialReportsService: {
    getSpkOverheadLogs: vi.fn().mockResolvedValue([]),
  },
}));

const createSupabaseChain = (resolvedData: any = []) => {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: resolvedData, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: resolvedData, error: null }),
    then: (resolve: any) => Promise.resolve({ data: resolvedData, error: null }).then(resolve),
  };
  return chain;
};

describe('WBS Modals Stage Display Consistency (stage_aliases)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCachedStageAliases({
      ...DEFAULT_STAGE_NAMES,
      '3': 'Pendempulan',
    });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'workshop_settings') {
        return createSupabaseChain({
          stage_aliases: {
            ...DEFAULT_STAGE_NAMES,
            '3': 'Pendempulan',
          },
        });
      }
      if (table === 'spk') {
        return createSupabaseChain({
          spk_no: 'SPK-3538',
          vehicles: { license_plate: 'B 1234 XYZ' },
          customers: { name: 'PT Maju' },
        });
      }
      return createSupabaseChain([]);
    });
  });

  it('MaterialRequisitionForm header renders custom stage alias without duplicate "Tahapan:" prefix', async () => {
    render(
      <MaterialRequisitionForm
        spkId="spk-3538"
        wbsCategory="Dinding/Fabrikasi"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Tahapan 3: Pendempulan')).toBeInTheDocument();
    });
    expect(screen.queryByText(/Tahapan:\s*Dinding\/Fabrikasi/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Tahapan:\s*Tahapan 3:/i)).not.toBeInTheDocument();
  });

  it('SpkBoronganPanel header renders custom stage alias without duplicate "Tahapan:" prefix', async () => {
    render(
      <SpkBoronganPanel
        spkId="spk-3538"
        wbsCategory="Dinding/Fabrikasi"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Tahapan 3: Pendempulan')).toBeInTheDocument();
    });
    expect(screen.queryByText(/Tahapan:\s*Tahapan 3:/i)).not.toBeInTheDocument();
  });

  it('WbsPendingMaterialModal header renders custom stage alias without duplicate "Tahapan:" prefix', async () => {
    render(
      <WbsPendingMaterialModal
        isOpen={true}
        onClose={vi.fn()}
        category="Dinding/Fabrikasi"
        categoryLabel="Tahapan 3: Pendempulan"
        pendingMaterials={[]}
        onOpenRequisition={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Tahapan 3: Pendempulan')).toBeInTheDocument();
    });
    expect(screen.queryByText(/Tahapan:\s*Tahapan 3:/i)).not.toBeInTheDocument();
  });

  it('SpkOverheadModal header and preset section render custom stage alias', async () => {
    render(
      <SpkOverheadModal
        isOpen={true}
        onClose={vi.fn()}
        spkId="spk-3538"
        spkNumber="SPK-3538"
        defaultCategory="Dinding/Fabrikasi"
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText('Tahapan 3: Pendempulan').length).toBeGreaterThanOrEqual(1);
    });
    expect(
      screen.getByText(/Alokasi Overhead dari RAB & Change Orders \(Tahapan 3: Pendempulan\)/i)
    ).toBeInTheDocument();
  });
});
