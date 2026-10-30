import React, { useState, useEffect } from 'react';
import { Printer, Copy, ExternalLink, Check, CheckCircle, Pencil, History, AlertTriangle } from 'lucide-react';
import type { DPHistoryRecord, DpAdjustment } from '../services/billingService';
import { fetchDpAdjustments } from '../services/billingService';
import { checkTrackingExpiration } from '../utils/trackingExpiration';
import { ConfirmationModal, type ConfirmationModalVariant } from './ConfirmationModal';
import { DpReceiptPrintModal, type DpReceiptData } from './finance/DpReceiptPrintModal';
import { EditDpModal } from './finance/EditDpModal';

interface DpHistoryListProps {
  history: DPHistoryRecord[];
  loading: boolean;
  onEditDp?: (record: DPHistoryRecord) => void;
  adjustments?: DpAdjustment[];
  onRefresh?: () => void;
}

export const DpHistoryList: React.FC<DpHistoryListProps> = ({
  history,
  loading,
  onEditDp,
  adjustments,
  onRefresh,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<DpReceiptData | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [internalAdjustments, setInternalAdjustments] = useState<DpAdjustment[]>([]);
  const [selectedEditRecord, setSelectedEditRecord] = useState<DPHistoryRecord | null>(null);
  const [isInternalEditModalOpen, setIsInternalEditModalOpen] = useState(false);
  const [localHistoryOverrides, setLocalHistoryOverrides] = useState<Record<string, number>>({});

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message?: string;
    variant?: ConfirmationModalVariant;
    confirmText?: string;
    cancelText?: string;
    hideCancel?: boolean;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
  });

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  useEffect(() => {
    // If parent didn't supply adjustments, fetch automatically
    if (!adjustments) {
      let isMounted = true;
      fetchDpAdjustments().then((data) => {
        if (isMounted) setInternalAdjustments(data);
      });
      return () => {
        isMounted = false;
      };
    }
  }, [adjustments]);

  const effectiveAdjustments = adjustments || internalAdjustments;

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

  const handlePrintReceipt = (record: DPHistoryRecord) => {
    const currentAmount = localHistoryOverrides[record.spk_id] ?? record.dp_amount;
    const receiptData: DpReceiptData = {
      spkNo: record.spk_no,
      customerName: record.customer_name,
      vehiclePlate: record.vehicle_plate,
      vehicleModel: record.vehicle_model || record.vehicle_plate,
      vehicleVin: record.vehicle_vin || '-',
      paymentDate: record.payment_date,
      totalContractEstimate: record.total_contract_estimate || 0,
      dpAmount: currentAmount,
      paymentMethod: record.payment_method,
      notes: record.notes,
    };
    setSelectedReceipt(receiptData);
    setIsReceiptModalOpen(true);
  };

  const handleCopyLink = (spkNo: string) => {
    const url = `${window.location.origin}/tracking/${spkNo}`;
    navigator.clipboard.writeText(url);
    setCopiedId(spkNo);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInternalEditSuccess = (newAmount: number, newAdj: DpAdjustment) => {
    if (selectedEditRecord) {
      setLocalHistoryOverrides(prev => ({
        ...prev,
        [selectedEditRecord.spk_id]: newAmount,
        [selectedEditRecord.spk_no]: newAmount,
      }));
    }
    setInternalAdjustments(prev => [newAdj, ...prev]);
    if (onRefresh) onRefresh();
  };

  return (
    <div className="space-y-4">
      {history.map((record) => {
        const recordAmount = localHistoryOverrides[record.spk_id] ?? localHistoryOverrides[record.spk_no] ?? record.dp_amount;
        const recordAdjustments = effectiveAdjustments.filter(
          adj => adj.spk_id === record.spk_id || adj.spk_no === record.spk_no
        );

        return (
          <div key={record.spk_id} className="bg-surface border border-surface-border rounded-lg p-5 hover:border-primary/50 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-medium text-text-primary">{record.spk_no}</h3>
                  <span className="bg-status-success/20 text-status-success text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-status-success" />
                    DITERIMA / AKTIF
                  </span>
                  {recordAdjustments.length > 0 && (
                    <span 
                      className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1 shadow-sm"
                      title={`Telah dikoreksi sebanyak ${recordAdjustments.length} kali`}
                    >
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                      Terkoreksi ({recordAdjustments.length}x)
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-muted">{record.customer_name} — {record.vehicle_plate}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-text-muted mb-1">Tanggal Pembayaran</p>
                <p className="text-sm font-medium">{new Date(record.payment_date).toLocaleString('id-ID')}</p>
              </div>
            </div>

            {/* Kartu Rincian DP Terbayar & Koreksi DP */}
            <div className="bg-background rounded p-3 border border-surface-border grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">NOMINAL DP TERBAYAR</span>
                    <span className="font-mono text-xl font-black text-amber-400">
                      Rp {Number(recordAmount || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onEditDp) {
                        onEditDp({ ...record, dp_amount: recordAmount });
                      } else {
                        setSelectedEditRecord({ ...record, dp_amount: recordAmount });
                        setIsInternalEditModalOpen(true);
                      }
                    }}
                    className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-lg flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                    title="Koreksi kesalahan input nominal DP"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Koreksi DP</span>
                  </button>
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">METODE & REFERENSI</span>
                <p className="font-medium text-sm text-text-primary">{record.payment_method}</p>
                <p className="text-xs text-text-muted truncate">{record.notes}</p>
              </div>
            </div>

            {/* Audit Log Viewer Panel */}
            {recordAdjustments.length > 0 && (
              <div className="mb-4 p-3 bg-slate-950/80 border border-amber-500/30 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    Riwayat Koreksi Nominal DP ({recordAdjustments.length}x)
                  </span>
                </div>
                <div className="space-y-2">
                  {recordAdjustments.map((adj) => (
                    <div key={adj.id} className="text-xs p-2.5 bg-slate-900 border border-slate-800 rounded-lg space-y-1.5">
                      <div className="flex justify-between text-slate-400 text-[10px]">
                        <span>Oleh: <strong className="text-slate-200">{adj.adjusted_by_name}</strong> ({adj.adjusted_by_role})</span>
                        <span>{new Date(adj.created_at).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="text-slate-400 line-through">Rp {Number(adj.old_amount).toLocaleString('id-ID')}</span>
                        <span className="text-slate-500">➔</span>
                        <span className="text-emerald-400 font-bold">Rp {Number(adj.new_amount).toLocaleString('id-ID')}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 italic bg-slate-950/50 p-1.5 rounded border border-slate-800">
                        "{adj.reason}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mt-2 flex-wrap gap-2">
              {(() => {
                const trackingExp = checkTrackingExpiration(record.released_at);
                return (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-text-muted font-medium">Pelacakan Progres:</span>
                    {trackingExp.isExpired ? (
                      <span 
                        className="text-xs text-text-muted"
                        title="Masa aktif dokumentasi teknis WBS telah berakhir (7 hari pasca BAST)"
                      >
                        Tautan Pelacakan Kedaluwarsa (&gt;7 Hari)
                      </span>
                    ) : (
                      <>
                        {trackingExp.isReleased && (
                          <span 
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            title={`Aktif hingga ${trackingExp.formattedExpiresDate}`}
                          >
                            {trackingExp.daysRemaining}h Aktif
                          </span>
                        )}
                        <button
                          onClick={() => handleCopyLink(record.spk_no)}
                          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded transition-colors border cursor-pointer bg-secondary/10 hover:bg-secondary/20 text-secondary border-secondary/20"
                          title="Salin link tracking"
                        >
                          {copiedId === record.spk_no ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-status-success" />
                              Tersalin!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Salin Link Tracking
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
                      </>
                    )}
                  </div>
                );
              })()}

              <button
                onClick={() => handlePrintReceipt(record)}
                className="flex items-center gap-2 text-sm bg-surface-border hover:bg-surface-border/80 text-text-primary px-4 py-2 rounded transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Cetak Kuitansi DP
              </button>
            </div>
          </div>
        );
      })}

      {/* Modal Dialog Konfirmasi */}
      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        variant={modalConfig.variant}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        hideCancel={modalConfig.hideCancel}
        onConfirm={modalConfig.onConfirm || closeModal}
        onCancel={closeModal}
      />

      {/* Printable DP Receipt Modal */}
      <DpReceiptPrintModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        data={selectedReceipt}
      />

      {/* Internal Edit DP Modal if not delegated to parent */}
      {selectedEditRecord && (
        <EditDpModal
          isOpen={isInternalEditModalOpen}
          onClose={() => {
            setIsInternalEditModalOpen(false);
            setSelectedEditRecord(null);
          }}
          spkId={selectedEditRecord.spk_id}
          spkNo={selectedEditRecord.spk_no}
          customerName={selectedEditRecord.customer_name}
          currentDp={localHistoryOverrides[selectedEditRecord.spk_id] ?? selectedEditRecord.dp_amount}
          onSuccess={handleInternalEditSuccess}
        />
      )}
    </div>
  );
};
