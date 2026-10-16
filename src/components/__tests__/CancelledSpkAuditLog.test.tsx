import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CancelledSpkAuditLog } from '../CancelledSpkAuditLog';
import type { CancelledSpkAuditRecord } from '../../services/spkService';

describe('Component: CancelledSpkAuditLog', () => {
  const mockRecords: CancelledSpkAuditRecord[] = [
    {
      id: 'spk-uuid-1',
      spk_no: 'SPK-2026-001',
      customer_name: 'PT Maju Terus',
      customer_phone: '081234567890',
      vehicle_plate: 'B 1234 ABC',
      vehicle_vin: 'MHK123456789',
      vehicle_engine: 'ENG-998877',
      status: 'CANCELLED',
      total_estimated_cost: 25000000,
      cancellation_reason: 'Konsumen membatalkan pemesanan sebelum DP',
      cancelled_at: '2026-10-15T10:30:00.000Z',
      cancelled_by: 'user-uuid-1',
      cancelled_by_profile: {
        id: 'user-uuid-1',
        full_name: 'Donny Narendra',
        role: 'owner',
        email: 'donny@robelkaroseri.com',
      },
      created_at: '2026-10-10T08:00:00.000Z',
      updated_at: '2026-10-15T10:30:00.000Z',
    },
    {
      id: 'spk-uuid-2',
      spk_no: 'SPK-2026-002',
      customer_name: 'CV Berkah Mandiri',
      customer_phone: '089876543210',
      vehicle_plate: 'D 5678 XYZ',
      vehicle_vin: 'MHK987654321',
      vehicle_engine: 'ENG-112233',
      status: 'CANCELLED',
      total_estimated_cost: 40000000,
      cancellation_reason: 'Perubahan armada bisnis ke tipe lain',
      cancelled_at: '2026-10-16T14:15:00.000Z',
      cancelled_by: 'user-uuid-2',
      cancelled_by_profile: {
        id: 'user-uuid-2',
        full_name: 'Budi Santoso',
        role: 'service_advisor',
        email: 'budi@robelkaroseri.com',
      },
      created_at: '2026-10-11T09:00:00.000Z',
      updated_at: '2026-10-16T14:15:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state correctly when there are no cancelled records', () => {
    render(<CancelledSpkAuditLog initialRecords={[]} />);

    expect(screen.getByText(/Total SPK Dibatalkan/i)).toBeInTheDocument();
    expect(screen.getByTestId('kpi-total-cancelled')).toHaveTextContent('0');
    expect(screen.getByText('Tidak ada audit log SPK yang ditemukan.')).toBeInTheDocument();
  });

  it('renders executive KPI cards with aggregated counts and lost values', () => {
    render(<CancelledSpkAuditLog initialRecords={mockRecords} />);

    expect(screen.getByTestId('kpi-total-cancelled')).toHaveTextContent('2');
    // Total lost: 25.000.000 + 40.000.000 = 65.000.000
    expect(screen.getByTestId('kpi-total-lost')).toHaveTextContent(/65\.000\.000/);
    expect(screen.getByTestId('kpi-last-30-days')).toHaveTextContent('2');
  });

  it('renders all table rows with customer, vehicle, executor, and cancellation reason', () => {
    render(<CancelledSpkAuditLog initialRecords={mockRecords} />);

    // Row 1
    expect(screen.getByText('SPK-2026-001')).toBeInTheDocument();
    expect(screen.getByText('PT Maju Terus')).toBeInTheDocument();
    expect(screen.getByText('B 1234 ABC')).toBeInTheDocument();
    expect(screen.getByText('Donny Narendra')).toBeInTheDocument();
    expect(screen.getByText('owner')).toBeInTheDocument();
    expect(screen.getByText(/"Konsumen membatalkan pemesanan sebelum DP"/i)).toBeInTheDocument();

    // Row 2
    expect(screen.getByText('SPK-2026-002')).toBeInTheDocument();
    expect(screen.getByText('CV Berkah Mandiri')).toBeInTheDocument();
    expect(screen.getByText('D 5678 XYZ')).toBeInTheDocument();
    expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
    expect(screen.getByText('service_advisor')).toBeInTheDocument();
    expect(screen.getByText(/"Perubahan armada bisnis ke tipe lain"/i)).toBeInTheDocument();
  });

  it('filters records dynamically when typing into search input', () => {
    render(<CancelledSpkAuditLog initialRecords={mockRecords} />);

    const searchInput = screen.getByLabelText('Cari SPK Dibatalkan');
    fireEvent.change(searchInput, { target: { value: 'Berkah' } });

    // Should only show Row 2
    expect(screen.getByText('SPK-2026-002')).toBeInTheDocument();
    expect(screen.getByText('CV Berkah Mandiri')).toBeInTheDocument();
    expect(screen.queryByText('SPK-2026-001')).not.toBeInTheDocument();
    expect(screen.queryByText('PT Maju Terus')).not.toBeInTheDocument();

    // Clicking reset restores both
    const resetButton = screen.getByTitle('Reset pencarian');
    fireEvent.click(resetButton);
    expect(screen.getByText('SPK-2026-001')).toBeInTheDocument();
    expect(screen.getByText('SPK-2026-002')).toBeInTheDocument();
  });

  it('opens and closes the detail modal when clicking Detail action button', () => {
    render(<CancelledSpkAuditLog initialRecords={mockRecords} />);

    const detailButtons = screen.getAllByTitle('Lihat Detail Audit Pembatalan');
    fireEvent.click(detailButtons[0]);

    // Modal opens
    expect(screen.getByText('Rincian Audit Pembatalan SPK')).toBeInTheDocument();
    expect(screen.getByText('CANCELLED (Dibatalkan)')).toBeInTheDocument();
    expect(screen.getByText('MHK123456789')).toBeInTheDocument();
    expect(screen.getAllByText(/081234567890/).length).toBeGreaterThanOrEqual(1);

    // Close modal
    const closeButton = screen.getByRole('button', { name: 'Tutup' });
    fireEvent.click(closeButton);

    expect(screen.queryByText('Rincian Audit Pembatalan SPK')).not.toBeInTheDocument();
  });

  it('triggers CSV export when clicking Ekspor Audit CSV button', () => {
    render(<CancelledSpkAuditLog initialRecords={mockRecords} />);

    const exportButton = screen.getByTitle('Ekspor Audit Log Pembatalan ke CSV');
    expect(exportButton).not.toBeDisabled();

    // Mock document.createElement and click
    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName);
      if (tagName === 'a') {
        el.click = clickSpy;
      }
      return el;
    });

    fireEvent.click(exportButton);
    expect(clickSpy).toHaveBeenCalled();
  });
});
