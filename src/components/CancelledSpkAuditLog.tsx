import React, { useState, useEffect, useMemo } from 'react';
import { 
  Ban, Search, RotateCcw, FileSpreadsheet, Eye, X, Calendar, 
  User, Car, DollarSign, Clock, ShieldAlert, AlertTriangle, RefreshCw
} from 'lucide-react';
import { spkService, type CancelledSpkAuditRecord } from '../services/spkService';

interface CancelledSpkAuditLogProps {
  initialRecords?: CancelledSpkAuditRecord[];
  onRefreshParent?: () => void;
}

export const CancelledSpkAuditLog: React.FC<CancelledSpkAuditLogProps> = ({
  initialRecords,
  onRefreshParent,
}) => {
  const [records, setRecords] = useState<CancelledSpkAuditRecord[]>(initialRecords || []);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<CancelledSpkAuditRecord | null>(null);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const data = await spkService.fetchCancelledSpkAuditLogs();
      setRecords(data);
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      console.error('Failed to load cancelled SPK audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialRecords) {
      loadAuditLogs();
    } else {
      setRecords(initialRecords);
    }
  }, [initialRecords]);

  // Filter records based on search query
  const filteredRecords = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return records;
    return records.filter((r) => {
      const spkNo = r.spk_no?.toLowerCase() || '';
      const client = r.customer_name?.toLowerCase() || '';
      const plate = r.vehicle_plate?.toLowerCase() || '';
      const reason = r.cancellation_reason?.toLowerCase() || '';
      const canceller = r.cancelled_by_profile?.full_name?.toLowerCase() || '';
      return spkNo.includes(q) || client.includes(q) || plate.includes(q) || reason.includes(q) || canceller.includes(q);
    });
  }, [records, searchQuery]);

  // Executive KPI summary metrics
  const totalCancelled = records.length;
  const totalEstimatedLost = useMemo(() => {
    return records.reduce((acc, curr) => acc + (Number(curr.total_estimated_cost) || 0), 0);
  }, [records]);

  const cancelledLast30Days = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return records.filter((r) => {
      const date = new Date(r.cancelled_at);
      return date >= thirtyDaysAgo;
    }).length;
  }, [records]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const handleExportCsv = () => {
    if (filteredRecords.length === 0) return;

    const exportRows = filteredRecords.map((r, idx) => ({
      No: idx + 1,
      'No SPK': r.spk_no,
      'Nama Konsumen': r.customer_name,
      'No Telepon': r.customer_phone || '-',
      'No Polisi': r.vehicle_plate || '-',
      'No Rangka / VIN': r.vehicle_vin || '-',
      'Waktu Dibatalkan': formatDate(r.cancelled_at),
      'Dibatalkan Oleh': r.cancelled_by_profile?.full_name ? `${r.cancelled_by_profile.full_name} (${r.cancelled_by_profile.role})` : 'System / Admin',
      'Alasan Pembatalan': r.cancellation_reason,
      'Nilai Estimasi (IDR)': r.total_estimated_cost,
    }));

    const headers = Object.keys(exportRows[0]).join(',');
    const rows = exportRows
      .map((row) =>
        Object.values(row)
          .map((val) => `"${String(val).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + `${headers}\n${rows}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Audit_Log_SPK_Batal_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total SPK Batal */}
        <div className="bg-surface border border-border rounded-lg p-5 relative overflow-hidden">
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-text-muted">Total SPK Dibatalkan</p>
              <p className="text-3xl font-bold font-display text-status-danger mt-1.5" data-testid="kpi-total-cancelled">
                {totalCancelled}
              </p>
              <p className="text-xs text-text-muted mt-1">Status resmi CANCELLED (All-time)</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-status-danger/10 border border-status-danger/20 flex items-center justify-center text-status-danger shrink-0">
              <Ban className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 2: Total Nilai Estimasi */}
        <div className="bg-surface border border-border rounded-lg p-5 relative overflow-hidden">
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-text-muted">Estimasi Nilai Terbatalkan</p>
              <p className="text-2xl font-bold font-display text-text mt-1.5" data-testid="kpi-total-lost">
                {formatCurrency(totalEstimatedLost)}
              </p>
              <p className="text-xs text-text-muted mt-1">Total potensi omzet pra-pengerjaan</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 3: 30 Hari Terakhir */}
        <div className="bg-surface border border-border rounded-lg p-5 relative overflow-hidden">
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-text-muted">Pembatalan 30 Hari Terakhir</p>
              <p className="text-3xl font-bold font-display text-text mt-1.5" data-testid="kpi-last-30-days">
                {cancelledLast30Days} <span className="text-sm font-normal text-text-muted">unit</span>
              </p>
              <p className="text-xs text-text-muted mt-1">Frekuensi pembatalan periode berjalan</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Audit Table Card */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden shadow-xs">
        {/* Header Toolbar */}
        <div className="px-5 py-4 border-b border-border bg-surface-hover flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-text font-display flex items-center gap-2 text-base">
              <ShieldAlert className="w-4 h-4 text-status-danger" />
              Audit Log Pembatalan SPK (Void Tracking)
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Menampilkan {filteredRecords.length} dari total {records.length} pembatalan tercatat dengan jejak audit akuntabel
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Cari SPK / Client / Nopol / Alasan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-text focus:outline-none focus:border-primary transition"
                aria-label="Cari SPK Dibatalkan"
              />
            </div>

            {/* Reset Button */}
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-2.5 py-1.5 rounded-lg border border-border text-xs text-text-muted hover:text-text hover:bg-background transition flex items-center gap-1.5"
                title="Reset pencarian"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}

            {/* Refresh Button */}
            <button
              type="button"
              onClick={loadAuditLogs}
              disabled={loading}
              className="p-1.5 rounded-lg border border-border text-text-muted hover:text-text hover:bg-background transition"
              title="Muat ulang audit log"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
            </button>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredRecords.length === 0}
              className="px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-primary/50 text-xs font-medium text-text hover:text-primary transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 disabled:pointer-events-none"
              title="Ekspor Audit Log Pembatalan ke CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-status-success" />
              <span>Ekspor Audit CSV</span>
            </button>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-text">
            <thead className="bg-background text-text-muted font-mono text-xs uppercase">
              <tr>
                <th className="px-5 py-3">No. SPK & Kendaraan</th>
                <th className="px-5 py-3">Konsumen</th>
                <th className="px-5 py-3">Waktu Batal</th>
                <th className="px-5 py-3">Dibatalkan Oleh</th>
                <th className="px-5 py-3">Alasan Formal Pembatalan</th>
                <th className="px-5 py-3 text-right">Nilai Estimasi</th>
                <th className="px-5 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-text-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center text-text-muted">
                        <Ban className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-medium text-text">Tidak ada audit log SPK yang ditemukan.</p>
                      <p className="text-xs text-text-muted">
                        {searchQuery ? 'Coba ubah kata kunci pencarian Anda.' : 'Belum ada data SPK yang dibatalkan pada sistem.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-surface-hover/50 transition">
                    {/* SPK & Vehicle */}
                    <td className="px-5 py-4 font-mono">
                      <div className="font-bold text-text flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-status-danger shrink-0"></span>
                        {record.spk_no}
                      </div>
                      <div className="text-xs text-text-muted font-sans flex items-center gap-1 mt-0.5">
                        <Car className="w-3 h-3" />
                        {record.vehicle_plate || 'Tanpa Nopol'}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-5 py-4">
                      <div className="font-medium text-text">{record.customer_name}</div>
                      {record.customer_phone && (
                        <div className="text-xs text-text-muted font-mono">{record.customer_phone}</div>
                      )}
                    </td>

                    {/* Cancellation Date */}
                    <td className="px-5 py-4 text-xs font-mono text-text-muted whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-text-muted" />
                        {formatDate(record.cancelled_at)}
                      </div>
                    </td>

                    {/* Cancelled By (Attribution) */}
                    <td className="px-5 py-4">
                      {record.cancelled_by_profile ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-surface-active border border-border flex items-center justify-center text-xs font-bold text-text shrink-0">
                            {record.cancelled_by_profile.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-text leading-tight">
                              {record.cancelled_by_profile.full_name}
                            </div>
                            <span className="inline-block mt-0.5 text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-surface-active text-text-muted border border-border">
                              {record.cancelled_by_profile.role}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-text-muted">
                          <User className="w-3.5 h-3.5" />
                          <span>Owner / Administrator</span>
                        </div>
                      )}
                    </td>

                    {/* Cancellation Reason */}
                    <td className="px-5 py-4 max-w-xs">
                      <div 
                        className="text-xs text-text line-clamp-2 bg-status-danger/5 border border-status-danger/20 rounded-md px-2.5 py-1.5 italic"
                        title={record.cancellation_reason}
                      >
                        "{record.cancellation_reason}"
                      </div>
                    </td>

                    {/* Total Estimated Cost */}
                    <td className="px-5 py-4 text-right font-mono text-xs font-bold text-text whitespace-nowrap">
                      {formatCurrency(record.total_estimated_cost)}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedRecord(record)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-primary hover:text-primary-hover hover:bg-primary/10 transition border border-transparent hover:border-primary/20"
                        title="Lihat Detail Audit Pembatalan"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detail</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-border rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border bg-surface-hover flex items-center justify-between">
              <div className="flex items-center gap-2 text-status-danger font-bold text-base font-display">
                <AlertTriangle className="w-5 h-5 text-status-danger" />
                <span>Rincian Audit Pembatalan SPK</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="text-text-muted hover:text-text transition p-1 rounded-md hover:bg-surface-active"
                aria-label="Tutup Detail"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Status Header Badge */}
              <div className="flex items-center justify-between bg-status-danger/10 border border-status-danger/20 rounded-lg p-3.5">
                <div>
                  <span className="text-[10px] font-mono text-status-danger font-bold uppercase tracking-wider block">Status Berkas</span>
                  <span className="text-base font-bold font-mono text-status-danger">CANCELLED (Dibatalkan)</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider block">Nomor Berkas</span>
                  <span className="text-base font-bold font-mono text-text">{selectedRecord.spk_no}</span>
                </div>
              </div>

              {/* Reason Box */}
              <div>
                <label className="text-xs font-mono uppercase text-text-muted font-bold block mb-1.5">
                  Alasan Formal Pembatalan
                </label>
                <div className="bg-background border border-status-danger/30 rounded-lg p-3.5 text-sm text-text leading-relaxed">
                  "{selectedRecord.cancellation_reason}"
                </div>
              </div>

              {/* Two-Column Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-background border border-border rounded-lg p-3 space-y-1">
                  <span className="text-text-muted font-mono block text-[10px] uppercase">Waktu Pembatalan</span>
                  <span className="font-semibold text-text block font-mono">{formatDate(selectedRecord.cancelled_at)}</span>
                </div>

                <div className="bg-background border border-border rounded-lg p-3 space-y-1">
                  <span className="text-text-muted font-mono block text-[10px] uppercase">Dibatalkan Oleh</span>
                  <span className="font-semibold text-text block">
                    {selectedRecord.cancelled_by_profile ? `${selectedRecord.cancelled_by_profile.full_name} (${selectedRecord.cancelled_by_profile.role})` : 'Owner / Administrator'}
                  </span>
                </div>

                <div className="bg-background border border-border rounded-lg p-3 space-y-1">
                  <span className="text-text-muted font-mono block text-[10px] uppercase">Pelanggan</span>
                  <span className="font-semibold text-text block">{selectedRecord.customer_name}</span>
                  {selectedRecord.customer_phone && (
                    <span className="text-text-muted block font-mono text-[11px]">{selectedRecord.customer_phone}</span>
                  )}
                </div>

                <div className="bg-background border border-border rounded-lg p-3 space-y-1">
                  <span className="text-text-muted font-mono block text-[10px] uppercase">Nomor Polisi</span>
                  <span className="font-semibold text-text block font-mono">{selectedRecord.vehicle_plate || '-'}</span>
                </div>

                <div className="bg-background border border-border rounded-lg p-3 space-y-1">
                  <span className="text-text-muted font-mono block text-[10px] uppercase">No. Rangka / VIN</span>
                  <span className="font-semibold text-text block font-mono">{selectedRecord.vehicle_vin || '-'}</span>
                </div>

                <div className="bg-background border border-border rounded-lg p-3 space-y-1">
                  <span className="text-text-muted font-mono block text-[10px] uppercase">Estimasi Biaya Terbatalkan</span>
                  <span className="font-bold text-amber-400 block font-mono text-sm">
                    {formatCurrency(selectedRecord.total_estimated_cost)}
                  </span>
                </div>
              </div>

              {/* Regulatory Notice */}
              <div className="text-[11px] text-text-muted bg-surface-hover border border-border rounded-lg p-3 leading-normal">
                Sesuai kebijakan bengkel, pembatalan SPK hanya diperbolehkan sebelum penerimaan Uang Muka (DP) dan sebelum material dikeluarkan dari gudang. Riwayat ini tersimpan permanen untuk kepatuhan audit.
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-border bg-surface-hover flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-1.5 rounded-lg font-medium text-xs text-text bg-surface-active hover:bg-surface border border-border transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
