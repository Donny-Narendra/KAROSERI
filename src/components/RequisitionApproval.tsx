import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Check, X, ClipboardList, Loader2, AlertTriangle } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';

interface RequisitionApprovalProps {
  onSuccess?: () => void;
  refreshKey?: number;
}

export const RequisitionApproval: React.FC<RequisitionApprovalProps> = ({ onSuccess, refreshKey }) => {
  const { user } = useAuth();
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

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
        // 1. Insert inventory transactions for items with valid material_id
        const transactions = (requisition.material_requisition_items || [])
          .filter((item: any) => Boolean(item.material_id))
          .map((item: any) => ({
            spk_id: requisition.spk.id,
            material_id: item.material_id,
            quantity_issued: item.quantity,
            issued_by: user.id,
            requisition_id: requisition.id,
            requisition_item_id: item.id
          }));

        if (transactions.length > 0) {
          const { error: txError } = await supabase
            .from('inventory_transactions')
            .insert(transactions);
            
          if (txError) {
            // Defensive fallback if columns requisition_id/requisition_item_id not yet added to DB
            const legacyTransactions = transactions.map(({ requisition_id, requisition_item_id, ...rest }) => rest);
            const { error: retryError } = await supabase
              .from('inventory_transactions')
              .insert(legacyTransactions);
            if (retryError) throw retryError;
          }

          // Decrement current_stock on materials table to keep physical inventory balanced
          for (const item of (requisition.material_requisition_items || [])) {
            if (item.material_id && item.quantity > 0) {
              const { data: mat } = await supabase
                .from('materials')
                .select('current_stock')
                .eq('id', item.material_id)
                .single();
              if (mat) {
                await supabase
                  .from('materials')
                  .update({ current_stock: Math.max(0, Number(mat.current_stock || 0) - Number(item.quantity)) })
                  .eq('id', item.material_id);
              }
            }
          }
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
        <h3 className="font-bold text-text font-display flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" />
          Pending Requisitions (Mandor)
        </h3>
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
        ) : (
          <div className="divide-y divide-border">
            {requisitions.map((req) => (
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
