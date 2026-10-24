import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { FinancialAuditPanel } from '../FinancialAuditPanel';
import { financialReportsService } from '../../../services/financialReportsService';

describe('Component: FinancialAuditPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "0 ANOMALI TERDETEKSI" and healthy status when no anomalies exist', async () => {
    vi.spyOn(financialReportsService, 'getSanityAudit').mockResolvedValue({
      is_healthy: true,
      over_budget_count: 0,
      over_budget_items: [],
      negative_margin_count: 0,
      negative_margin_items: [],
      unbilled_completed_count: 0,
      unbilled_completed_items: [],
      critical_receivables_count: 0,
      critical_receivables_items: [],
    });

    render(<FinancialAuditPanel />);

    await waitFor(() => {
      expect(screen.getByText(/SISTEM SEHAT \(0 ANOMALI\)/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Over-Budget Material/i)).toBeInTheDocument();
    expect(screen.getByText(/Margin Negatif/i)).toBeInTheDocument();
  });

  it('renders clean error banner if audit execution fails', async () => {
    vi.spyOn(financialReportsService, 'getSanityAudit').mockRejectedValue(
      new Error('Gagal menjalankan audit integritas keuangan: connection lost')
    );

    render(<FinancialAuditPanel />);

    await waitFor(() => {
      expect(screen.getByText(/Gagal menjalankan audit integritas keuangan: connection lost/i)).toBeInTheDocument();
    });
  });
});
