import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Package, Ban } from 'lucide-react';
import type { DashboardSpkItem } from '../services/dashboardService';
import { calculateSpkFinancialMetrics } from '../services/dashboardService';

export interface ActiveSpkTableProps {
  spks: DashboardSpkItem[];
  loading?: boolean;
  onSelectWbsSpkId: (spkId: string) => void;
  onCancelSpk: (spk: DashboardSpkItem) => void;
}

export const ActiveSpkTable: React.FC<ActiveSpkTableProps> = ({
  spks,
  loading = false,
  onSelectWbsSpkId,
  onCancelSpk,
}) => {
  const { t } = useTranslation();

  return (
    <div className="overflow-x-auto" data-testid="active-spk-table-container">
      <table className="w-full text-left text-sm text-text" data-testid="active-spk-table">
        <thead className="bg-background text-text-muted font-mono text-xs uppercase border-b border-border">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">{t('admin.spk_no', 'No. SPK')}</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">{t('admin.client', 'Klien')}</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider" data-testid="th-total-hpp">
              TOTAL HPP
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider" data-testid="th-total-tagihan">
              TOTAL TAGIHAN
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider" data-testid="th-realisasi-aktual">
              REALISASI BIAYA AKTUAL
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">{t('admin.qc_status', 'Status QC')}</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">{t('admin.handover', 'Serah Terima')}</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">{t('admin.managerial_actions', 'Aksi Manajerial')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {loading ? (
            <tr>
              <td colSpan={8} className="px-5 py-12 text-center text-text-muted">
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-mono">Memuat data monitoring SPK...</span>
                </div>
              </td>
            </tr>
          ) : spks.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-5 py-8 text-center text-text-muted text-sm">
                Tidak ada data SPK yang sesuai dengan filter pencarian.
              </td>
            </tr>
          ) : (
            spks.map((spk) => {
              const fin = spk.financials || calculateSpkFinancialMetrics(spk);
              const totalHpp = fin.totalHpp;
              const coHpp = fin.coHpp;
              const totalTagihan = fin.totalTagihan;
              const materialIssuedCost = fin.materialIssuedCost;
              const laborActualCost = fin.laborActualCost;
              const fohActualCost = fin.fohActualCost;
              const totalRealisasiAktual = fin.totalRealisasiAktual;

              return (
                <tr 
                  key={spk.id} 
                  className="hover:bg-surface-hover/50 transition"
                  data-testid={`spk-row-${spk.spk_no}`}
                >
                  {/* 1. SPK No & Plat */}
                  <td className="px-4 py-3 font-mono font-medium">
                    <div className="text-text font-bold">{spk.spk_no}</div>
                    {spk.vehicle_plate && (
                      <div className="text-xs text-text-muted font-normal mt-0.5">{spk.vehicle_plate}</div>
                    )}
                  </td>

                  {/* 2. Client */}
                  <td className="px-4 py-3">
                    <div className="font-medium text-text">{spk.customer_name}</div>
                  </td>

                  {/* 3. TOTAL HPP */}
                  <td className="px-4 py-3 text-left" data-testid={`cell-hpp-${spk.spk_no}`}>
                    <div className="font-mono font-bold text-slate-100 text-xs">
                      Rp {totalHpp.toLocaleString('id-ID')}
                    </div>
                    {coHpp > 0 && (
                      <div className="text-[10px] text-purple-400">
                        Termasuk CO: +Rp {coHpp.toLocaleString('id-ID')}
                      </div>
                    )}
                  </td>

                  {/* 4. TOTAL TAGIHAN */}
                  <td className="px-4 py-3 text-left" data-testid={`cell-tagihan-${spk.spk_no}`}>
                    <div className="font-mono font-bold text-amber-400 text-xs">
                      Rp {totalTagihan.toLocaleString('id-ID')}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <span>DP: Rp {(spk.dp_amount || 0).toLocaleString('id-ID')}</span>
                      <span className={spk.payment_status === 'PAID' ? 'text-emerald-400' : 'text-slate-500'}>
                        • {spk.payment_status || 'UNPAID'}
                      </span>
                    </div>
                  </td>

                  {/* 5. REALISASI BIAYA AKTUAL */}
                  <td className="px-4 py-3 text-left" data-testid={`cell-aktual-${spk.spk_no}`}>
                    <div className="font-mono font-bold text-xs flex items-center gap-1.5">
                      <span className={totalRealisasiAktual > totalHpp ? 'text-rose-400' : 'text-emerald-400'}>
                        Rp {totalRealisasiAktual.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Mat: Rp {materialIssuedCost.toLocaleString('id-ID')} | Jasa+FOH: Rp {(laborActualCost + fohActualCost).toLocaleString('id-ID')}
                    </div>
                  </td>

                  {/* 6. QC Status */}
                  <td className="px-4 py-3">
                    <span className={spk.status === 'CANCELLED' ? 'text-status-danger' : 'text-status-idle'}>
                      {spk.status}
                    </span>
                  </td>

                  {/* 7. Serah Terima (Handover) */}
                  <td className="px-4 py-3">
                    {spk.status === 'COMPLETED' ? (
                      <span className="text-status-success font-medium flex items-center gap-1 text-xs">
                        <ShieldCheck className="w-4 h-4"/> Selesai
                      </span>
                    ) : (
                      <span className="text-status-danger font-medium flex items-center gap-1 text-xs">
                        <Package className="w-4 h-4"/> Locked
                      </span>
                    )}
                  </td>

                  {/* 8. Aksi Manajerial */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectWbsSpkId(spk.id)}
                        className="text-primary hover:text-primary-hover text-xs font-semibold px-2.5 py-1 rounded hover:bg-primary/10 transition"
                      >
                        WBS & QC
                      </button>
                      {spk.status !== 'CANCELLED' && spk.status !== 'COMPLETED' && (
                        <button
                          type="button"
                          onClick={() => onCancelSpk(spk)}
                          className="text-status-danger hover:text-red-400 text-xs font-semibold px-2 py-1 rounded hover:bg-status-danger/10 transition flex items-center gap-1"
                          title="Batalkan SPK Langsung"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Batalkan</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
