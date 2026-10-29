import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActiveSpkTable } from '../ActiveSpkTable';
import type { DashboardSpkItem } from '../../services/dashboardService';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => {
      const map: Record<string, string> = {
        'admin.spk_no': 'No. SPK',
        'admin.client': 'Klien',
        'admin.total_hpp': 'TOTAL HPP',
        'admin.total_tagihan': 'TOTAL TAGIHAN',
        'admin.realisasi_biaya_aktual': 'REALISASI BIAYA AKTUAL',
        'admin.qc_status': 'Status QC',
        'admin.handover': 'Serah Terima',
        'admin.managerial_actions': 'Aksi Manajerial',
      };
      return map[key] || defaultValue || key;
    },
  }),
}));

describe('Component: ActiveSpkTable (Financial Metrics Replacement)', () => {
  const mockSpks: DashboardSpkItem[] = [
    {
      id: 'spk-001',
      spk_no: 'SPK-2026-001',
      customer_name: 'PT Karoseri Indonesia',
      vehicle_plate: 'B 1234 ABC',
      status: 'ACTIVE',
      qc_status: 'PASSED',
      created_at: '2026-10-01T00:00:00Z',
      dp_amount: 15000000,
      payment_status: 'PAID',
      total_hpp: 50000000,
      total_tagihan: 75000000,
      total_realisasi_aktual: 35000000,
      financials: {
        rabHpp: 45000000,
        coHpp: 5000000,
        totalHpp: 50000000,
        sellingPriceAwal: 65000000,
        coRevenue: 10000000,
        totalTagihan: 75000000,
        materialIssuedCost: 20000000,
        laborActualCost: 12000000,
        fohActualCost: 3000000,
        totalRealisasiAktual: 35000000,
        varianceAmount: 15000000,
        variancePercentage: -30,
        isOverbudget: false,
      },
    },
    {
      id: 'spk-002',
      spk_no: 'SPK-2026-002',
      customer_name: 'CV Makmur Logistik',
      vehicle_plate: 'L 9999 XYZ',
      status: 'ACTIVE',
      qc_status: 'PENDING',
      created_at: '2026-10-05T00:00:00Z',
      dp_amount: 0,
      payment_status: 'UNPAID',
      total_hpp: 40000000,
      total_tagihan: 55000000,
      total_realisasi_aktual: 48000000,
      financials: {
        rabHpp: 40000000,
        coHpp: 0,
        totalHpp: 40000000,
        sellingPriceAwal: 55000000,
        coRevenue: 0,
        totalTagihan: 55000000,
        materialIssuedCost: 28000000,
        laborActualCost: 16000000,
        fohActualCost: 4000000,
        totalRealisasiAktual: 48000000,
        varianceAmount: -8000000,
        variancePercentage: 20,
        isOverbudget: true,
      },
    },
  ];

  it('renders replaced financial column headers (TOTAL HPP, TOTAL TAGIHAN, REALISASI BIAYA AKTUAL) and excludes operational headers', () => {
    render(
      <ActiveSpkTable
        spks={mockSpks}
        onSelectWbsSpkId={vi.fn()}
        onCancelSpk={vi.fn()}
      />
    );

    // Verify presence of financial metric headers
    expect(screen.getByTestId('th-total-hpp')).toHaveTextContent('TOTAL HPP');
    expect(screen.getByTestId('th-total-tagihan')).toHaveTextContent('TOTAL TAGIHAN');
    expect(screen.getByTestId('th-realisasi-aktual')).toHaveTextContent('REALISASI BIAYA AKTUAL');

    // Verify operational headers are absent
    expect(screen.queryByText(/WBS PHASE/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/DP STATUS/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/MATERIAL GATE/i)).not.toBeInTheDocument();
  });

  it('renders Total HPP and Total Tagihan with breakdown subtext for each SPK', () => {
    render(
      <ActiveSpkTable
        spks={mockSpks}
        onSelectWbsSpkId={vi.fn()}
        onCancelSpk={vi.fn()}
      />
    );

    // Check SPK-2026-001 HPP: 50.000.000 (Termasuk CO: +Rp 5.000.000)
    const hppCell1 = screen.getByTestId('cell-hpp-SPK-2026-001');
    expect(hppCell1).toHaveTextContent(/50\.000\.000/);
    expect(hppCell1).toHaveTextContent(/Termasuk CO: \+Rp\s*5\.000\.000/);

    // Check SPK-2026-001 Tagihan: 75.000.000 and DP + payment status
    const tagihanCell1 = screen.getByTestId('cell-tagihan-SPK-2026-001');
    expect(tagihanCell1).toHaveTextContent(/75\.000\.000/);
    expect(tagihanCell1).toHaveTextContent(/DP: Rp\s*15\.000\.000/);
    expect(tagihanCell1).toHaveTextContent(/PAID/);
  });

  it('displays Realisasi Biaya Aktual with 3-pillar breakdown and color coding based on HPP threshold', () => {
    render(
      <ActiveSpkTable
        spks={mockSpks}
        onSelectWbsSpkId={vi.fn()}
        onCancelSpk={vi.fn()}
      />
    );

    // SPK-001 is within budget: 35.000.000 < 50.000.000 -> text-emerald-400
    const cellAktual1 = screen.getByTestId('cell-aktual-SPK-2026-001');
    expect(cellAktual1).toHaveTextContent(/35\.000\.000/);
    expect(cellAktual1).toHaveTextContent(/Mat: Rp\s*20\.000\.000 \| Jasa\+FOH: Rp\s*15\.000\.000/);
    const emeraldSpan = cellAktual1.querySelector('.text-emerald-400');
    expect(emeraldSpan).toBeInTheDocument();

    // SPK-002 is overbudget: 48.000.000 > 40.000.000 -> text-rose-400
    const cellAktual2 = screen.getByTestId('cell-aktual-SPK-2026-002');
    expect(cellAktual2).toHaveTextContent(/48\.000\.000/);
    expect(cellAktual2).toHaveTextContent(/Mat: Rp\s*28\.000\.000 \| Jasa\+FOH: Rp\s*20\.000\.000/);
    const roseSpan = cellAktual2.querySelector('.text-rose-400');
    expect(roseSpan).toBeInTheDocument();
  });

  it('handles loading state with spinner', () => {
    render(
      <ActiveSpkTable
        spks={[]}
        loading={true}
        onSelectWbsSpkId={vi.fn()}
        onCancelSpk={vi.fn()}
      />
    );

    expect(screen.getByText(/Memuat data monitoring SPK/i)).toBeInTheDocument();
  });

  it('handles empty data state', () => {
    render(
      <ActiveSpkTable
        spks={[]}
        loading={false}
        onSelectWbsSpkId={vi.fn()}
        onCancelSpk={vi.fn()}
      />
    );

    expect(screen.getByText(/Tidak ada data SPK yang sesuai dengan filter pencarian/i)).toBeInTheDocument();
  });

  it('triggers onSelectWbsSpkId and onCancelSpk callbacks', () => {
    const handleSelectWbs = vi.fn();
    const handleCancel = vi.fn();

    render(
      <ActiveSpkTable
        spks={mockSpks}
        onSelectWbsSpkId={handleSelectWbs}
        onCancelSpk={handleCancel}
      />
    );

    // Click Tahapan & QC button on first row
    const wbsButtons = screen.getAllByRole('button', { name: /(?:WBS|Tahapan) & QC/i });
    fireEvent.click(wbsButtons[0]);
    expect(handleSelectWbs).toHaveBeenCalledWith('spk-001');

    // Click Batalkan button on first row
    const cancelButtons = screen.getAllByRole('button', { name: /Batalkan/i });
    fireEvent.click(cancelButtons[0]);
    expect(handleCancel).toHaveBeenCalledWith(mockSpks[0]);
  });
});
