import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Check, X, ClipboardList, Loader2, AlertTriangle, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';
import type { StockAuditItem } from './RecentApprovedMaterials';

export interface SpkSummaryItem {
  spkId: string;
  spkNo: string;
  customerName: string;
  count: number;
}
export const SpkSummaryItem = {};

interface RequisitionApprovalProps {
  onSuccess?: () => void;
  refreshKey?: number;
  selectedSpkFilter?: string;
  onResetFilter?: () => void;
  onSpkSummaryChange?: (summary: SpkSummaryItem[]) => void;
  onApprovalRecorded?: (audits: StockAuditItem[]) => void;
}

export const RequisitionApproval: React.FC<RequisitionApprovalProps> = ({
  onSuccess,
  refreshKey,
  selectedSpkFilter = 'ALL',
  onResetFilter,
  onSpkSummaryChange,
  onApprovalRecorded,
}) => {
  const { user } = useAuth();
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Ekstrak daftar SPK unik yang memiliki antrean requisition pending beserta jumlahnya
  const spkSummary = useMemo(() => {
    const map = new Map<string, SpkSummaryItem>();
    requisitions.forEach(req => {
      const spkNo = req.spk?.spk_no || 'Tanpa SPK';
      const spkId = req.spk?.id || '';
      const customerName = req.spk?.customer_name || 'Pelanggan Umum';
      const existing = map.get(spkNo);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(spkNo, {
          spkId,
          spkNo,
          customerName,
          count: 1
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.spkNo.localeCompare(b.spkNo));
  }, [requisitions]);

  useEffect(() => {
    onSpkSummaryChange?.(spkSummary);
  }, [spkSummary, onSpkSummaryChange]);

  // Saring daftar antrean yang di-render berdasarkan nomor SPK yang dipilih
  const filteredRequisitions = useMemo(() => {
    if (!selectedSpkFilter || selectedSpkFilter === 'ALL') {
      return requisitions;
    }
    return requisitions.filter(req => 
      (req.spk?.spk_no || 'Tanpa SPK') === selectedSpkFilter ||
      req.spk?.id === selectedSpkFilter
    );
  }, [requisitions, selectedSpkFilter]);

  // State Paginasi (Client-side)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);

  // Reset currentPage kembali ke halaman 1 setiap kali filter SPK berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSpkFilter]);

  const totalItems = filteredRequisitions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // Sesuaikan currentPage jika data berkurang akibat approval/reject
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRequisitions = useMemo(() => {
    return filteredRequisitions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRequisitions, startIndex, itemsPerPage]);

  // Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'APPROVE' | 'REJECT';
    requisition: any;
    title: string;
    message: string;
    confirmText: string;
    variant: 'info' | 'danger';
  } | null>(null);

  const [feedbackDialog, setFeedbackDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'success' | 'danger' | 'info';
  } | null>(null);

  const fetchRequisitions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('material_requisitions')
        .select(`
          id,
          wbs_category,
          status,
          notes,
          created_at,
          spk ( id, spk_no, customer_name ),
          profiles ( full_name ),
          material_requisition_items (
            id,
            material_id,
            quantity,
            rab_item_id,
            material_name,
            unit,
            materials ( name, unit )
          )
        `)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequisitions(data || []);
    } catch (err) {
      console.error('Error fetching requisitions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequisitions();
  }, [refreshKey]);

  const handleRequestApprove = (requisition: any) => {
    setConfirmDialog({
      isOpen: true,
      type: 'APPROVE',
      requisition,
      title: 'Setujui Permintaan Material',
      message: `Apakah Anda yakin ingin menyetujui permintaan material untuk SPK ${requisition.spk?.spk_no || '-'} dan mengeluarkan material terkait?\n\nKuantitas material akan otomatis dicatat pada transaksi inventaris gudang dan stok fisik akan disesuaikan.`,
      confirmText: 'Ya, Setujui & Keluarkan',
      variant: 'info',
    });
  };

  const handleRequestReject = (requisition: any) => {
    setConfirmDialog({
      isOpen: true,
      type: 'REJECT',
      requisition,
      title: 'Tolak Permintaan Material',
      message: `Apakah Anda yakin ingin menolak permintaan material untuk SPK ${requisition.spk?.spk_no || '-'}?\n\nStatus permintaan ini akan diubah menjadi REJECTED.`,
      confirmText: 'Ya, Tolak Permintaan',
      variant: 'danger',
    });
  };

  const executeConfirmedAction = async () => {
    if (!confirmDialog) return;
    const { type, requisition } = confirmDialog;
    setConfirmDialog(null);

    if (type === 'APPROVE') {
      if (!user) return;
      setProcessingId(requisition.id);
      try {
        const recordedAudits: StockAuditItem[] = [];
        const itemsWithMat = (requisition.material_requisition_items || [])
          .filter((item: any) => Boolean(item.material_id));

        // 1. Ambil stok saat ini dan hitung snapshot sebelum/sesudah untuk tiap material
        const stockSnapshots: Record<string, { before: number; after: number; name: string; unit: string }> = {};

        for (const item of itemsWithMat) {
          const { data: mat } = await supabase
            .from('materials')
            .select('name, unit, current_stock')
            .eq('id', item.material_id)
            .single();

          const stockBefore = Number(mat?.current_stock || 0);
          const qty = Number(item.quantity || 0);
          const stockAfter = Math.max(0, stockBefore - qty);
          const matName = mat?.name || item.material_name || 'Material Non-Stok';
          const matUnit = mat?.unit || item.unit || 'pcs';

          stockSnapshots[item.material_id] = {
            before: stockBefore,
            after: stockAfter,
            name: matName,
            unit: matUnit
          };

          // Kurangi current_stock pada tabel materials untuk menjaga saldo fisik
          await supabase
            .from('materials')
            .update({ current_stock: stockAfter })
            .eq('id', item.material_id);

          recordedAudits.push({
            id: `${item.id}-${Date.now()}`,
            materialName: matName,
            unit: matUnit,
            spkNo: requisition.spk?.spk_no || 'Tanpa SPK',
            wbsCategory: requisition.wbs_category,
            stockBefore,
            quantityApproved: qty,
            stockAfter,
            approvedAt: new Date().toISOString(),
            isNew: true
          });
        }

        // 2. Siapkan transaksi pengeluaran material dengan snapshot stok
        const transactions = itemsWithMat.map((item: any) => {
          const snap = stockSnapshots[item.material_id];
          return {
            spk_id: requisition.spk?.id || requisition.spk_id,
            material_id: item.material_id,
            quantity_issued: item.quantity,
            issued_by: user.id,
            requisition_id: requisition.id,
            requisition_item_id: item.id,
            stock_before: snap ? snap.before : 0,
            stock_after: snap ? snap.after : 0
          };
        });

        if (transactions.length > 0) {
          const { error: txError } = await supabase
            .from('inventory_transactions')
            .insert(transactions);
            
          if (txError) {
            console.warn('Gagal insert dengan kolom snapshot stok, mencoba fallback transaksi:', txError.message);
            // Defensive fallback jika kolom stock_before / stock_after belum dieksekusi di database
            const fallbackTransactions = transactions.map(({ stock_before, stock_after, ...rest }) => rest);
            const { error: retryError } = await supabase
              .from('inventory_transactions')
              .insert(fallbackTransactions);
              
            if (retryError) {
              const minimalTransactions = fallbackTransactions.map(({ requisition_id, requisition_item_id, ...rest }) => rest);
              const { error: minimalError } = await supabase
                .from('inventory_transactions')
                .insert(minimalTransactions);
              if (minimalError) throw minimalError;
            }
          }
        }

        // Kabari parent (WarehouseDashboard) untuk real-time audit update
        if (recordedAudits.length > 0 && onApprovalRecorded) {
          onApprovalRecorded(recordedAudits);
        }

        // 2. Update requisition status
        const { error: reqError } = await supabase
          .from('material_requisitions')
          .update({ status: 'APPROVED' })
          .eq('id', requisition.id);

        if (reqError) throw reqError;

        setFeedbackDialog({
          isOpen: true,
          title: 'Persetujuan Berhasil',
          message: 'Permintaan material telah disetujui, transaksi pengeluaran barang tercatat, dan stok gudang telah dikurangi.',
          variant: 'success'
        });
        if (onSuccess) onSuccess();
        fetchRequisitions();
      } catch (error: any) {
        console.error('Error approving requisition:', error);
        setFeedbackDialog({
          isOpen: true,
          title: 'Gagal Menyetujui Permintaan',
          message: `Terjadi kendala saat memproses persetujuan: ${error.message || 'Kesalahan sistem'}`,
          variant: 'danger'
        });
      } finally {
        setProcessingId(null);
      }
    } else if (type === 'REJECT') {
      setProcessingId(requisition.id);
      try {
        const { error } = await supabase
          .from('material_requisitions')
          .update({ status: 'REJECTED' })
          .eq('id', requisition.id);

        if (error) throw error;

        setFeedbackDialog({
          isOpen: true,
          title: 'Permintaan Ditolak',
          message: 'Permintaan material telah berhasil ditolak (status diubah menjadi REJECTED).',
          variant: 'info'
        });
        if (onSuccess) onSuccess();
        fetchRequisitions();
      } catch (error: any) {
        console.error('Error rejecting requisition:', error);
        setFeedbackDialog({
          isOpen: true,
          title: 'Gagal Menolak Permintaan',
          message: `Terjadi kendala saat menolak permintaan: ${error.message || 'Kesalahan sistem'}`,
          variant: 'danger'
        });
      } finally {
        setProcessingId(null);
      }
    }
  };

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-surface-hover flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary shrink-0" />
          <h3 className="font-bold text-text font-display">
            Pending Requisitions (Mandor)
          </h3>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
            {requisitions.length}
          </span>
        </div>

        {selectedSpkFilter && selectedSpkFilter !== 'ALL' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-text-muted">Filter SPK:</span>
            <span className="font-mono font-bold text-primary px-2 py-0.5 bg-primary/10 border border-primary/30 rounded">
              {selectedSpkFilter}
            </span>
            {onResetFilter && (
              <button
                type="button"
                onClick={onResetFilter}
                className="text-text-muted hover:text-text hover:underline transition"
                title="Tampilkan Semua SPK"
              >
                (Reset)
              </button>
            )}
          </div>
        )}
      </div>

      <div className="p-0">
        {loading ? (
          <div className="flex justify-center items-center py-8 text-text-muted">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading requisitions...
          </div>
        ) : requisitions.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            No pending material requisitions.
          </div>
        ) : filteredRequisitions.length === 0 ? (
          <div className="text-center py-10 px-4">
            <p className="text-text-muted text-sm mb-3">
              Tidak ada permintaan pending untuk SPK <span className="font-mono font-bold text-primary">{selectedSpkFilter}</span>.
            </p>
            {onResetFilter && (
              <button
                type="button"
                onClick={onResetFilter}
                className="px-3 py-1.5 text-xs bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 rounded font-medium transition"
              >
                Tampilkan Semua SPK
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {paginatedRequisitions.map((req) => (
              <div key={req.id} className="p-5 hover:bg-surface-hover/30 transition">
                <div className="flex flex-col lg:flex-row justify-between gap-4">
                  {/* Info Section */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-primary font-bold">
                        {req.spk?.spk_no}
                      </span>
                      <span className="bg-background border border-border px-2 py-0.5 rounded text-xs font-medium">
                        {req.wbs_category}
                      </span>
                      <span className="text-xs text-text-muted">
                        Requested by: {req.profiles?.full_name}
                      </span>
                    </div>
                    
                    <div className="text-sm text-text-muted mb-4">
                      {new Date(req.created_at).toLocaleString()}
                      {req.notes && <p className="mt-1">Notes: {req.notes}</p>}
                    </div>

                    {/* Items Table */}
                    <div className="bg-background border border-border rounded overflow-hidden">
                      <table className="w-full text-left text-sm text-text">
                        <thead className="bg-surface-hover text-text-muted font-mono text-xs uppercase">
                          <tr>
                            <th className="px-4 py-2">Material</th>
                            <th className="px-4 py-2 text-right">Requested Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {req.material_requisition_items?.map((item: any) => (
                            <tr key={item.id}>
                              <td className="px-4 py-2">
                                {item.materials?.name || item.material_name || 'Material Non-Stok'}
                              </td>
                              <td className="px-4 py-2 text-right font-medium">
                                {item.quantity} {item.materials?.unit || item.unit || 'pcs'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="mt-3 flex items-start gap-2 text-xs text-status-warning bg-status-warning/10 p-2 rounded">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>
                        Note: Approving this requisition will bypass Gate 2 (RAB vs Actual) limit checks for now. 
                        Make sure the requested amount is within budget.
                      </p>
                    </div>
                  </div>

                  {/* Actions Section */}
                  <div className="flex lg:flex-col justify-end gap-2 lg:min-w-[120px]">
                    <button
                      onClick={() => handleRequestApprove(req)}
                      disabled={processingId !== null}
                      className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-status-success hover:bg-status-success/90 text-white px-4 py-2 rounded transition disabled:opacity-50"
                    >
                      {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Approve
                    </button>
                    <button
                      onClick={() => handleRequestReject(req)}
                      disabled={processingId !== null}
                      className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-surface hover:bg-status-danger/10 text-status-danger border border-border hover:border-status-danger/30 px-4 py-2 rounded transition disabled:opacity-50"
                    >
                      {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kontrol Navigasi Paginasi */}
      {!loading && filteredRequisitions.length > 0 && (
        <div className="px-5 py-3.5 border-t border-border bg-surface-hover/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          {/* Informasi ringkas & pemilih ukuran halaman */}
          <div className="flex items-center gap-3 text-text-muted text-xs">
            <span>
              Menampilkan <span className="font-mono font-medium text-text">{startIndex + 1}</span> - <span className="font-mono font-medium text-text">{Math.min(startIndex + itemsPerPage, totalItems)}</span> dari <span className="font-mono font-medium text-text">{totalItems}</span> Permintaan
            </span>
            <div className="flex items-center gap-1.5 border-l border-border pl-3">
              <span>Per hal:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-300 focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
              </select>
            </div>
          </div>

          {/* Tombol Navigasi Paginasi */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="flex items-center gap-1 bg-slate-800 text-slate-300 hover:bg-slate-700 active:bg-primary disabled:opacity-40 disabled:cursor-not-allowed rounded-md px-2.5 py-1 text-xs border border-slate-700 transition"
              title="Halaman Pertama"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Pertama</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 bg-slate-800 text-slate-300 hover:bg-slate-700 active:bg-primary disabled:opacity-40 disabled:cursor-not-allowed rounded-md px-2.5 py-1 text-xs border border-slate-700 transition"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sebelumnya</span>
            </button>

            <div className="px-2.5 text-xs font-mono text-text-muted">
              Halaman <span className="font-bold text-primary">{currentPage}</span> dari <span className="font-bold text-text">{totalPages}</span>
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || totalItems === 0}
              className="flex items-center gap-1 bg-slate-800 text-slate-300 hover:bg-slate-700 active:bg-primary disabled:opacity-40 disabled:cursor-not-allowed rounded-md px-2.5 py-1 text-xs border border-slate-700 transition"
              title="Halaman Berikutnya"
            >
              <span className="hidden sm:inline">Berikutnya</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages || totalItems === 0}
              className="flex items-center gap-1 bg-slate-800 text-slate-300 hover:bg-slate-700 active:bg-primary disabled:opacity-40 disabled:cursor-not-allowed rounded-md px-2.5 py-1 text-xs border border-slate-700 transition"
              title="Halaman Terakhir"
            >
              <span className="hidden md:inline">Terakhir</span>
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmDialog && (
        <ConfirmationModal
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          cancelText="Batal"
          variant={confirmDialog.variant}
          onConfirm={executeConfirmedAction}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* Feedback / Alert Modal */}
      {feedbackDialog && (
        <ConfirmationModal
          isOpen={feedbackDialog.isOpen}
          title={feedbackDialog.title}
          message={feedbackDialog.message}
          confirmText="Tutup"
          hideCancel={true}
          variant={feedbackDialog.variant}
          onConfirm={() => setFeedbackDialog(null)}
          onCancel={() => setFeedbackDialog(null)}
        />
      )}
    </div>
  );
};
