import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, 
  Download, 
  RefreshCw, 
  AlertTriangle,
  MessageCircle,
  Clock,
  Car,
  ShieldCheck,
  ShieldAlert,
  ArrowUpDown
} from 'lucide-react';
import { financialReportsService } from '../../../services/financialReportsService';
import type { ProjectReceivable } from '../../../types/financialReports';

interface ReceivablesAgingTabProps {
  globalSearch?: string;
  refreshTrigger?: number;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

export const ReceivablesAgingTab: React.FC<ReceivablesAgingTabProps> = ({
  globalSearch = '',
  refreshTrigger,
}) => {
  const [data, setData] = useState<ProjectReceivable[]>([]);
  const [unpaidOnly, setUnpaidOnly] = useState(true);
  const [clearanceFilter, setClearanceFilter] = useState<string>('ALL');
  const [minAgingDays, setMinAgingDays] = useState<number>(0);
  const [localSearch, setLocalSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<'aging' | 'balance' | 'billing'>('aging');
  const [sortAsc, setSortAsc] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const activeSearch = localSearch.trim() || globalSearch.trim();
      const result = await financialReportsService.getProjectReceivables({
        unpaidOnly: unpaidOnly,
        handoverClearanceStatus: clearanceFilter !== 'ALL' ? clearanceFilter : undefined,
        minAgingDays: minAgingDays > 0 ? minAgingDays : undefined,
        searchQuery: activeSearch || undefined,
      });
      setData(result);
    } catch (err: any) {
      console.error('ReceivablesAgingTab fetch error:', err);
      setError(err.message || 'Gagal memuat daftar piutang proyek.');
    } finally {
      setLoading(false);
    }
  }, [unpaidOnly, clearanceFilter, minAgingDays, localSearch, globalSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);

  // Sorting
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let diff = 0;
      if (sortBy === 'aging') {
        diff = a.receivable_aging_days - b.receivable_aging_days;
      } else if (sortBy === 'balance') {
        diff = a.outstanding_balance - b.outstanding_balance;
      } else if (sortBy === 'billing') {
        diff = a.total_billing_amount - b.total_billing_amount;
      }
      return sortAsc ? diff : -diff;
    });
  }, [data, sortBy, sortAsc]);

  const toggleSort = (column: 'aging' | 'balance' | 'billing') => {
    if (sortBy === column) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(column);
      setSortAsc(false);
    }
  };

  const handleExportCsv = () => {
    if (!sortedData.length) return;
    const headers = [
      'No SPK',
      'Pelanggan',
      'No Telp',
      'Plat Kendaraan',
      'No Faktur',
      'Total Tagihan (Rp)',
      'DP Diterima (Rp)',
      'Pembayaran Tambahan (Rp)',
      'Sisa Piutang (Rp)',
      'Umur Piutang (Hari)',
      'Status Bayar',
      'Status Serah Terima',
    ].join(',');

    const rows = sortedData.map(row => [
      `"${row.spk_number}"`,
      `"${row.customer_name}"`,
      `"${row.customer_phone || '-'}"`,
      `"${row.vehicle_plate || '-'}"`,
      `"${row.invoice_number}"`,
      row.total_billing_amount,
      row.dp_paid,
      row.additional_paid,
      row.outstanding_balance,
      row.receivable_aging_days,
      `"${row.payment_status}"`,
      `"${row.handover_clearance_status}"`,
    ].join(',')).join('\n');

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + `${headers}\n${rows}`;
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `Laporan_Piutang_Aging_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openWhatsAppReminder = (row: ProjectReceivable) => {
    if (!row.customer_phone) {
      alert(`Nomor telepon pelanggan untuk SPK ${row.spk_number} belum terdata.`);
      return;
    }

    // Clean phone number: replace 08 with 628, remove non-digits
    let phone = row.customer_phone.replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '62' + phone.slice(1);
    } else if (!phone.startsWith('62')) {
      phone = '62' + phone;
    }

    const message = `Halo Bapak/Ibu ${row.customer_name},\n\nKami dari bagian Keuangan & Kasir Karoseri perihal pengerjaan unit dengan No. SPK: *${row.spk_number}*${row.vehicle_plate ? ` (Plat: *${row.vehicle_plate}*)` : ''}.\n\nTotal sisa tagihan Anda saat ini tercatat sebesar *${formatCurrency(row.outstanding_balance)}* (Umur piutang: ${row.receivable_aging_days} hari).\n\nMohon konfirmasi atau melakukan penyelesaian pembayaran sebelum proses serah terima fisik unit kendaraan.\n\nTerima kasih atas perhatian dan kerjasamanya.`;

    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // Aggregates
  const totalBilling = sortedData.reduce((acc, curr) => acc + curr.total_billing_amount, 0);
  const totalDp = sortedData.reduce((acc, curr) => acc + curr.dp_paid, 0);
  const totalAdditional = sortedData.reduce((acc, curr) => acc + curr.additional_paid, 0);
  const totalOutstanding = sortedData.reduce((acc, curr) => acc + curr.outstanding_balance, 0);
  const blockedUnits = sortedData.filter(d => d.handover_clearance_status === 'UNIT SELESAI (TERTAHAN PELUNASAN)').length;

  return (
    <div className="space-y-4">
      {/* Filters Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-surface/60 p-4 rounded-xl border border-border">
        <div className="flex flex-wrap items-center gap-3">
          {/* Clearance Status Filter */}
          <select
            value={clearanceFilter}
            onChange={(e) => setClearanceFilter(e.target.value)}
            className="bg-background/80 border border-border rounded-lg px-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary"
          >
            <option value="ALL">Semua Status Serah Terima</option>
            <option value="LUNAS (SIAP HANDOVER)">Lunas (Siap Handover)</option>
            <option value="UNIT SELESAI (TERTAHAN PELUNASAN)">Unit Selesai (Tertahan Pelunasan)</option>
            <option value="PENGERJAAN BERJALAN">Pengerjaan Berjalan</option>
          </select>

          {/* Aging Filter */}
          <select
            value={minAgingDays}
            onChange={(e) => setMinAgingDays(Number(e.target.value))}
            className="bg-background/80 border border-border rounded-lg px-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary"
          >
            <option value={0}>Semua Umur Piutang</option>
            <option value={15}>Aging &gt; 15 Hari</option>
            <option value={30}>Aging &gt; 30 Hari</option>
            <option value={60}>Aging &gt; 60 Hari (Kritis)</option>
          </select>

          {/* Search Box */}
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Cari SPK / Cust / Faktur..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-background/80 border border-border rounded-lg pl-9 pr-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary"
            />
          </div>

          {/* Unpaid Only Toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm text-text select-none bg-background/60 px-3 py-1.5 rounded-lg border border-border hover:bg-surface-hover transition">
            <input
              type="checkbox"
              checked={unpaidOnly}
              onChange={(e) => setUnpaidOnly(e.target.checked)}
              className="accent-primary rounded"
            />
            <span className="text-rose-400 font-medium">Hanya Belum Lunas (Outstanding &gt; 0)</span>
          </label>
        </div>

        <div className="flex items-center gap-2 self-end lg:self-auto">
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-hover hover:bg-surface-active text-text rounded-lg border border-border text-sm font-medium transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
          <button
            onClick={handleExportCsv}
            disabled={!sortedData.length}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Blocked Handover Alert Banner */}
      {blockedUnits > 0 && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 shrink-0 text-rose-400" />
            <div>
              <span className="font-bold">Peringatan Serah Terima: </span>
              <span>Terdapat <strong>{blockedUnits} unit selesai</strong> yang tertahan serah terima fisiknya karena belum menyelesaikan pelunasan faktur.</span>
            </div>
          </div>
        </div>
      )}

      {/* Error Notice */}
      {error && (
        <div className="p-4 bg-status-danger/10 border border-status-danger/30 rounded-xl text-status-danger text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-surface-hover/80 text-text-muted font-mono uppercase text-[11px] border-b border-border">
              <tr>
                <th className="py-3 px-4">No. SPK & Customer</th>
                <th className="py-3 px-4">Faktur / Tgl</th>
                <th 
                  className="py-3 px-4 text-right cursor-pointer hover:text-text transition"
                  onClick={() => toggleSort('billing')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Total Tagihan</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right">DP / Titipan</th>
                <th 
                  className="py-3 px-4 text-right cursor-pointer hover:text-text transition"
                  onClick={() => toggleSort('balance')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Sisa Piutang</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  className="py-3 px-4 text-center cursor-pointer hover:text-text transition"
                  onClick={() => toggleSort('aging')}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Umur Piutang</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Status Clearance Handover</th>
                <th className="py-3 px-4 text-center">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-text-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                      <span>Memuat catatan piutang dan aging...</span>
                    </div>
                  </td>
                </tr>
              ) : sortedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-text-muted">
                    Tidak ada catatan piutang yang memenuhi kriteria filter.
                  </td>
                </tr>
              ) : (
                sortedData.map((row) => {
                  const isBlocked = row.handover_clearance_status === 'UNIT SELESAI (TERTAHAN PELUNASAN)';
                  const isReady = row.handover_clearance_status === 'LUNAS (SIAP HANDOVER)';

                  // Aging badge
                  let agingBadgeClass = 'bg-surface-hover text-text-muted border-border';
                  if (row.receivable_aging_days > 60) {
                    agingBadgeClass = 'bg-rose-500/20 text-rose-400 border-rose-500/40 font-bold';
                  } else if (row.receivable_aging_days > 30) {
                    agingBadgeClass = 'bg-amber-500/20 text-amber-400 border-amber-500/40';
                  }

                  return (
                    <tr 
                      key={`${row.spk_id}-${row.invoice_number}`} 
                      className={`hover:bg-surface-hover/50 transition-colors ${
                        isBlocked ? 'bg-rose-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-mono font-semibold text-text">
                          {row.spk_number}
                        </div>
                        <div className="text-xs text-text-muted">
                          {row.customer_name} {row.vehicle_plate && `• ${row.vehicle_plate}`}
                        </div>
                        {row.customer_phone && (
                          <div className="text-[11px] font-mono text-text-muted/80 mt-0.5">
                            Telp: {row.customer_phone}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-xs text-text">
                          {row.invoice_number}
                        </div>
                        <div className="text-[11px] text-text-muted">
                          {new Date(row.invoice_date).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-text">
                        {formatCurrency(row.total_billing_amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-text-muted">
                        {formatCurrency(row.dp_paid + row.additional_paid)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-400">
                        {formatCurrency(row.outstanding_balance)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 font-mono text-xs px-2.5 py-0.5 rounded-full border ${agingBadgeClass}`}>
                          <Clock className="w-3 h-3" />
                          <span>{row.receivable_aging_days} Hari</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full border ${
                          isReady 
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : isBlocked
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                            : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                        }`}>
                          {isReady ? (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>LUNAS (SIAP HANDOVER)</span>
                            </>
                          ) : isBlocked ? (
                            <>
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>TERTAHAN PELUNASAN</span>
                            </>
                          ) : (
                            <>
                              <Car className="w-3.5 h-3.5" />
                              <span>PENGERJAAN BERJALAN</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {row.outstanding_balance > 0 ? (
                          <button
                            onClick={() => openWhatsAppReminder(row)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 text-xs font-medium transition"
                            title="Kirim pesan penagihan WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </button>
                        ) : (
                          <span className="text-text-muted text-xs font-mono">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer */}
            {sortedData.length > 0 && (
              <tfoot className="bg-surface-hover/90 font-mono font-bold text-xs border-t-2 border-border">
                <tr>
                  <td colSpan={2} className="py-3 px-4 text-text uppercase">
                    Total Akumulasi ({sortedData.length} Invoice):
                  </td>
                  <td className="py-3 px-4 text-right text-text">
                    {formatCurrency(totalBilling)}
                  </td>
                  <td className="py-3 px-4 text-right text-text-muted">
                    {formatCurrency(totalDp + totalAdditional)}
                  </td>
                  <td className="py-3 px-4 text-right text-rose-400 text-sm">
                    {formatCurrency(totalOutstanding)}
                  </td>
                  <td colSpan={3} className="py-3 px-4 text-center text-text-muted">
                    {blockedUnits} Unit Siap Fisik Tertahan Pelunasan
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
