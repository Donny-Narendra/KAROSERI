import React from 'react';
import { Printer, Copy, ExternalLink, Check } from 'lucide-react';
import type { DPHistoryRecord } from '../services/billingService';

interface DpHistoryListProps {
  history: DPHistoryRecord[];
  loading: boolean;
}

export const DpHistoryList: React.FC<DpHistoryListProps> = ({ history, loading }) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  if (loading) {
    return (
      <div className="text-center p-6 border border-dashed border-surface-border rounded-lg text-text-muted">
        Memuat riwayat DP...
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center p-6 border border-dashed border-surface-border rounded-lg text-text-muted">
        Tidak ada riwayat pembayaran DP.
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  const handlePrintReceipt = (record: DPHistoryRecord) => {
    alert(`Mencetak kuitansi DP untuk SPK: ${record.spk_no}\nNominal: ${formatCurrency(record.dp_amount)}\n\n(Preview Cetak)`);
    window.print();
  };

  const handleCopyLink = (spkNo: string) => {
    const url = `${window.location.origin}/tracking/${spkNo}`;
    navigator.clipboard.writeText(url);
    setCopiedId(spkNo);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      {history.map((record) => (
        <div key={record.spk_id} className="bg-surface border border-surface-border rounded-lg p-5 hover:border-primary/50 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-text-primary">{record.spk_no}</h3>
                <span className="bg-status-success/20 text-status-success text-xs px-2 py-0.5 rounded-full font-medium">
                  DP LUNAS
                </span>
              </div>
              <p className="text-sm text-text-muted">{record.customer_name} — {record.vehicle_plate}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-muted mb-1">Tanggal Pembayaran</p>
              <p className="text-sm font-medium">{new Date(record.payment_date).toLocaleString('id-ID')}</p>
            </div>
          </div>

          <div className="bg-background rounded p-3 border border-surface-border grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-text-muted uppercase mb-1">Nominal DP Terbayar</p>
              <p className="font-semibold text-lg text-secondary">{formatCurrency(record.dp_amount)}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase mb-1">Metode & Referensi</p>
              <p className="font-medium text-sm">{record.payment_method}</p>
              <p className="text-xs text-text-muted truncate">{record.notes}</p>
            </div>
          </div>

          <div className="flex justify-between items-center mt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted font-medium">Pelacakan Progres:</span>
              <button
                onClick={() => handleCopyLink(record.spk_no)}
                className="flex items-center gap-1.5 text-xs bg-secondary/10 hover:bg-secondary/20 text-secondary px-2.5 py-1.5 rounded transition-colors border border-secondary/20"
                title="Salin Tautan Pelacakan"
              >
                {copiedId === record.spk_no ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Tersalin!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Salin Tautan
                  </>
                )}
              </button>
              <a
                href={`/tracking/${record.spk_no}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs bg-surface-border hover:bg-surface-border/80 text-text-primary px-2.5 py-1.5 rounded transition-colors"
                title="Buka Laporan Progres"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Buka
              </a>
            </div>

            <button
              onClick={() => handlePrintReceipt(record)}
              className="flex items-center gap-2 text-sm bg-surface-border hover:bg-surface-border/80 text-text-primary px-4 py-2 rounded transition-colors"
            >
              <Printer className="w-4 h-4" />
              Cetak Kuitansi DP
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
