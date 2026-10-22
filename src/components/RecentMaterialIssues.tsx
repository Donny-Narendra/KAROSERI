import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Search, Loader2, Trash2, Edit2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { inventoryService } from '../services/inventoryService';
import { ConfirmationModal } from './ConfirmationModal';
import { formatWbsBadge, getWbsBadgeClass, compareWbsAsc } from '../utils/wbsSort';

export function extractIssueWbs(issue: any): string | null {
  if (!issue) return null;
  if (issue.wbs_stage) return issue.wbs_stage;
  const mrItem = Array.isArray(issue.material_requisition_items)
    ? issue.material_requisition_items[0]
    : issue.material_requisition_items;
  if (mrItem?.wbs_stage) return mrItem.wbs_stage;

  const mr = Array.isArray(issue.material_requisitions)
    ? issue.material_requisitions[0]
    : issue.material_requisitions;
  if (mr?.wbs_category) return mr.wbs_category;

  if (issue.wbs_category) return issue.wbs_category;
  return null;
}

interface RecentMaterialIssuesProps {
  selectedSpk?: any;
  selectedSpkFilter?: any;
  selectedSpkId?: string | null;
  selectedSpkNumber?: string | null;
  refreshKey: number;
  onSuccess?: () => void;
}

export const RecentMaterialIssues: React.FC<RecentMaterialIssuesProps> = ({ 
  selectedSpk,
  selectedSpkFilter, 
  selectedSpkId,
  selectedSpkNumber,
  refreshKey, 
  onSuccess 
}) => {
  const [recentIssues, setRecentIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmVoidOpen, setConfirmVoidOpen] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'success' | 'danger' | 'warning' | 'info';
  } | null>(null);
  
  // Edit state
  const [editingIssue, setEditingIssue] = useState<any | null>(null);
  const [editPrice, setEditPrice] = useState<number | ''>('');
  const [editQty, setEditQty] = useState<number | ''>('');
  const [isEditing, setIsEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Refetch when parent says so or internally requested
  const [internalRefresh, setInternalRefresh] = useState(0);

  // Helper: Detect standard UUID format
  const isUuid = (val?: string | null): boolean => {
    if (!val || typeof val !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
  };

  // Tolerant extraction of targetSpkId and targetSpkNo from props or objects
  const rawSpk = selectedSpk !== undefined ? selectedSpk : selectedSpkFilter;
  let targetSpkId: string | null = null;
  let targetSpkNo: string | null = null;

  if (typeof rawSpk === 'object' && rawSpk !== null) {
    targetSpkId = rawSpk.id || rawSpk.spkId || null;
    targetSpkNo = rawSpk.spk_no || rawSpk.spk_number || rawSpk.spkNo || null;
  } else if (typeof rawSpk === 'string' && rawSpk !== 'ALL') {
    if (isUuid(rawSpk)) {
      targetSpkId = rawSpk;
    } else {
      targetSpkNo = rawSpk;
    }
  }

  if (!targetSpkId && selectedSpkId && selectedSpkId !== 'ALL') {
    targetSpkId = selectedSpkId;
  }
  if (!targetSpkNo && selectedSpkNumber && selectedSpkNumber !== 'ALL') {
    targetSpkNo = selectedSpkNumber;
  }

  const [activeSpkBadge, setActiveSpkBadge] = useState<string | null>(targetSpkNo);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    try {
      let resolvedSpkId: string | null = targetSpkId;
      let resolvedSpkNo: string | null = targetSpkNo;

      // 1. Dual-matching resolution:
      // If we have an SPK number (e.g. 'SPK-7080') but no UUID, look up in 'spk' table
      if (!resolvedSpkId && resolvedSpkNo && resolvedSpkNo !== 'ALL') {
        try {
          const { data: spkData } = await supabase
            .from('spk')
            .select('id, spk_no')
            .eq('spk_no', resolvedSpkNo.trim())
            .maybeSingle();

          if (spkData?.id) {
            resolvedSpkId = spkData.id;
            resolvedSpkNo = spkData.spk_no || resolvedSpkNo;
          }
        } catch (err) {
          console.warn('Could not resolve SPK ID from spk_no:', err);
        }
      }

      // If we have UUID but no SPK number, look up in 'spk' table for display
      if (resolvedSpkId && (!resolvedSpkNo || resolvedSpkNo === 'ALL')) {
        try {
          const { data: spkData } = await supabase
            .from('spk')
            .select('id, spk_no')
            .eq('id', resolvedSpkId)
            .maybeSingle();

          if (spkData?.spk_no) {
            resolvedSpkNo = spkData.spk_no;
          }
        } catch (err) {
          console.warn('Could not resolve SPK No from spk_id:', err);
        }
      }

      setActiveSpkBadge(resolvedSpkNo || targetSpkNo);

      const hasActiveSpk = Boolean(
        (resolvedSpkId && resolvedSpkId !== 'ALL') ||
        (resolvedSpkNo && resolvedSpkNo !== 'ALL')
      );

      // Primary & Fallback Queries:
      // Supports inventory_transactions (with quantity_issued > 0 as requested),
      // goods_issues, and material_issues.
      let records: any[] = [];

      // 1. Primary: Fetch from inventory_transactions with quantity_issued > 0
      try {
        let query = supabase
          .from('inventory_transactions')
          .select(`
            id,
            spk_id,
            material_id,
            quantity_issued,
            custom_unit_price,
            issued_at,
            issued_by_name,
            issued_by_role,
            audit_notes,
            stock_before,
            stock_after,
            requisition_id,
            requisition_item_id,
            spk:spk_id ( id, spk_no ),
            materials ( name, unit, unit_price ),
            material_requisitions:requisition_id ( id, wbs_category ),
            material_requisition_items:requisition_item_id ( id, wbs_stage )
          `);

        if (resolvedSpkId && resolvedSpkId !== 'ALL') {
          query = query.eq('spk_id', resolvedSpkId);
        } else {
          query = query.limit(50);
        }

        // Catatan: filter quantity_issued > 0 untuk transaksi pengeluaran (ISSUE)
        if (typeof query.gt === 'function') {
          query = query.gt('quantity_issued', 0);
        }
        query = query.order('issued_at', { ascending: false });

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          records = data;
        } else if (error) {
          console.warn('Primary inventory_transactions query note:', error);
        }
      } catch (err) {
        console.warn('inventory_transactions error:', err);
      }

      // 2. Fallback / Alternative: goods_issues table
      if (records.length === 0) {
        try {
          let giQuery = supabase
            .from('goods_issues')
            .select(`
              id,
              spk_id,
              material_id,
              material_name,
              quantity,
              unit,
              unit_price,
              total_cost,
              issued_at,
              created_at,
              materials ( name, unit ),
              spk:spk_id ( id, spk_no )
            `);

          if (resolvedSpkId && resolvedSpkId !== 'ALL') {
            giQuery = giQuery.eq('spk_id', resolvedSpkId);
          } else {
            giQuery = giQuery.limit(50);
          }

          giQuery = giQuery.order('created_at', { ascending: false });
          const { data: giData, error: giError } = await giQuery;
          if (!giError && giData && giData.length > 0) {
            records = giData;
          }
        } catch {
          // Table goods_issues may not exist
        }
      }

      // 3. Fallback / Alternative: material_issues view / table
      if (records.length === 0) {
        try {
          let miQuery = supabase
            .from('material_issues')
            .select(`
              id,
              spk_id,
              material_id,
              quantity,
              unit_price,
              wbs_stage,
              created_at,
              issued_by_name,
              issued_by_role,
              audit_notes,
              spk:spk_id ( id, spk_no ),
              materials ( name, unit, unit_price )
            `);

          if (resolvedSpkId && resolvedSpkId !== 'ALL') {
            miQuery = miQuery.eq('spk_id', resolvedSpkId);
          } else {
            miQuery = miQuery.limit(50);
          }

          miQuery = miQuery.order('created_at', { ascending: false });
          const { data: miData, error: miError } = await miQuery;
          if (!miError && miData && miData.length > 0) {
            records = miData.map((row: any) => ({
              id: row.id,
              spk_id: row.spk_id,
              material_id: row.material_id,
              quantity: row.quantity,
              quantity_issued: row.quantity,
              unit_price: row.unit_price,
              custom_unit_price: row.unit_price,
              wbs_stage: row.wbs_stage,
              created_at: row.created_at,
              issued_at: row.created_at,
              issued_by_name: row.issued_by_name,
              issued_by_role: row.issued_by_role,
              audit_notes: row.audit_notes,
              spk: row.spk,
              materials: row.materials
            }));
          }
        } catch {
          // Table material_issues may not exist
        }
      }

      // 4. Fallback: Base inventory_transactions query (if schema lacked audit snapshot columns)
      if (records.length === 0) {
        try {
          let baseQuery = supabase
            .from('inventory_transactions')
            .select(`
              id,
              spk_id,
              material_id,
              quantity_issued,
              issued_at,
              spk:spk_id ( id, spk_no ),
              materials ( name, unit, unit_price )
            `);

          if (resolvedSpkId && resolvedSpkId !== 'ALL') {
            baseQuery = baseQuery.eq('spk_id', resolvedSpkId);
          } else {
            baseQuery = baseQuery.limit(50);
          }

          if (typeof baseQuery.gt === 'function') {
            baseQuery = baseQuery.gt('quantity_issued', 0);
          }
          baseQuery = baseQuery.order('issued_at', { ascending: false });
          const { data: baseData, error: baseError } = await baseQuery;
          if (!baseError && baseData && baseData.length > 0) {
            records = baseData;
          }
        } catch {
          // Ignore
        }
      }

      // Memory filter if active SPK number was provided but resolvedSpkId was null
      if (hasActiveSpk && resolvedSpkNo && !resolvedSpkId && records.length > 0) {
        records = records.filter(r => 
          (r.spk?.spk_no || r.spk?.spk_number || '').toLowerCase() === resolvedSpkNo!.toLowerCase()
        );
      }

      setRecentIssues(records);
      setSelectedIds([]);
    } catch (error) {
      console.error('Error fetching recent issues for SPK:', error);
      setRecentIssues([]);
    } finally {
      setLoading(false);
    }
  }, [targetSpkId, targetSpkNo]);

  useEffect(() => {
    void fetchIssues();
    setSearchQuery('');
  }, [fetchIssues, targetSpkId, targetSpkNo, refreshKey, internalRefresh]);

  const displayedIssues = React.useMemo(() => {
    let list = recentIssues;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(issue => {
        const wbs = extractIssueWbs(issue) || '';
        return (
          (issue.materials?.name || issue.material_name || '').toLowerCase().includes(q) ||
          (issue.materials?.unit || issue.unit || '').toLowerCase().includes(q) ||
          (issue.spk?.spk_no || issue.spk_no || '').toLowerCase().includes(q) ||
          wbs.toLowerCase().includes(q) ||
          formatWbsBadge(wbs).toLowerCase().includes(q)
        );
      });
    }

    return [...list].sort((a, b) => {
      const wbsA = extractIssueWbs(a);
      const wbsB = extractIssueWbs(b);
      const diff = compareWbsAsc(wbsA, wbsB);
      if (diff !== 0) return diff;

      // Secondary sort: chronological descending
      const timeA = new Date(a.issued_at || a.created_at || 0).getTime();
      const timeB = new Date(b.issued_at || b.created_at || 0).getTime();
      return timeB - timeA;
    });
  }, [recentIssues, searchQuery]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(displayedIssues.map(i => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleSingleVoid = (issue: any) => {
    if (issue.spk?.status === 'COMPLETED') {
      setFeedbackModal({
        isOpen: true,
        title: 'Transaksi Tidak Dapat Dibatalkan',
        message: 'Tidak dapat menghapus transaksi dari SPK yang sudah berstatus COMPLETED. Data SPK selesai terkunci untuk audit.',
        variant: 'warning'
      });
      return;
    }
    setSelectedIds([issue.id]);
    setConfirmVoidOpen(true);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    
    // Check if any selected is from COMPLETED SPK locally first
    const invalidSpks = recentIssues.filter(i => selectedIds.includes(i.id) && i.spk?.status === 'COMPLETED');
    if (invalidSpks.length > 0) {
      setFeedbackModal({
        isOpen: true,
        title: 'Transaksi Tidak Dapat Dibatalkan',
        message: 'Tidak dapat menghapus transaksi dari SPK yang sudah berstatus COMPLETED. Data SPK selesai terkunci untuk audit.',
        variant: 'warning'
      });
      return;
    }

    setConfirmVoidOpen(true);
  };

  const executeBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const count = selectedIds.length;
      await inventoryService.deleteIssuesAndRevertStock(selectedIds);
      setConfirmVoidOpen(false);
      setSelectedIds([]);
      setInternalRefresh(prev => prev + 1);
      if (onSuccess) onSuccess();
      setFeedbackModal({
        isOpen: true,
        title: 'Transaksi Berhasil Dibatalkan',
        message: `${count} transaksi pengeluaran material berhasil dibatalkan (void). Stok material telah dikembalikan dan item terkait telah dipulihkan ke tab Mandor Requests.`,
        variant: 'success'
      });
    } catch (err: any) {
      console.error(err);
      setFeedbackModal({
        isOpen: true,
        title: 'Gagal Membatalkan Transaksi',
        message: err.message || 'Gagal menghapus transaksi',
        variant: 'danger'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditModal = (issue: any) => {
    setEditingIssue(issue);
    const curPrice = issue.custom_unit_price !== null && issue.custom_unit_price !== undefined
      ? issue.custom_unit_price
      : (issue.unit_price !== undefined && issue.unit_price !== null ? issue.unit_price : (issue.materials?.unit_price ?? ''));
    const curQty = issue.quantity !== undefined && issue.quantity !== null
      ? issue.quantity
      : (issue.quantity_issued !== undefined && issue.quantity_issued !== null ? issue.quantity_issued : '');
    setEditPrice(curPrice);
    setEditQty(curQty);
    setErrorMsg('');
  };

  const handleSaveEdit = async () => {
    if (!editingIssue) return;
    if (editPrice === '' || editQty === '') {
      setErrorMsg('Semua field harus diisi');
      return;
    }

    setIsEditing(true);
    setErrorMsg('');
    try {
      const p = Number(editPrice);
      const q = Number(editQty);
      
      const priceToSave = p === (editingIssue.materials?.unit_price || editingIssue.unit_price) ? null : p;
      await inventoryService.updateIssuePrice(editingIssue.id, priceToSave, q !== (editingIssue.quantity_issued || editingIssue.quantity) ? q : undefined);
      
      setEditingIssue(null);
      setInternalRefresh(prev => prev + 1);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal menyimpan pembaruan');
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-surface-hover flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-text font-display flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            Recent Material Issues
          </h3>
          {(() => {
            const displayBadge = activeSpkBadge || targetSpkNo || (typeof rawSpk === 'string' && rawSpk !== 'ALL' ? rawSpk : (targetSpkId ? (targetSpkId.length > 8 ? targetSpkId.slice(0, 8) + '...' : targetSpkId) : null));
            return displayBadge && displayBadge !== 'ALL' ? (
              <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                SPK: {displayBadge}
              </span>
            ) : null;
          })()}
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <button 
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 px-3 py-1.5 bg-status-danger text-white rounded text-sm hover:bg-status-danger/90 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? 'Menghapus...' : `Void ${selectedIds.length} Transaksi`}
            </button>
          )}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder="Cari material..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-background border border-border rounded pl-9 pr-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary w-40 sm:w-52"
            />
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
        <table className="w-full text-left text-sm text-text whitespace-nowrap">
          <thead className="bg-background text-text-muted font-mono text-xs uppercase border-b border-border">
            <tr>
              <th className="px-5 py-3 w-10">
                <input 
                  type="checkbox" 
                  checked={selectedIds.length === displayedIssues.length && displayedIssues.length > 0}
                  onChange={handleSelectAll}
                  disabled={displayedIssues.length === 0}
                  className="rounded border-border text-primary focus:ring-primary disabled:opacity-40"
                />
              </th>
              <th className="px-5 py-3">Time</th>
              <th className="px-5 py-3">SPK No.</th>
              <th className="px-5 py-3">WBS</th>
              <th className="px-5 py-3">Material</th>
              <th className="px-5 py-3">Qty</th>
              <th className="px-5 py-3 text-right">Harga (Rp)</th>
              <th className="px-5 py-3">Eksekutor / Audit</th>
              <th className="px-5 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-5 py-12 text-center text-text-muted">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                  <p className="text-sm">Memuat riwayat pengeluaran material...</p>
                </td>
              </tr>
            ) : displayedIssues.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-text-muted">
                  <div className="max-w-md mx-auto space-y-1">
                    <p className="text-sm text-text font-medium">
                      {searchQuery.trim() 
                        ? `Tidak ada material yang cocok dengan "${searchQuery}"`
                        : (targetSpkId || (targetSpkNo && targetSpkNo !== 'ALL') || (rawSpk && rawSpk !== 'ALL'))
                          ? `Belum ada pengeluaran material untuk SPK ini.`
                          : `Pilih salah satu SPK di atas untuk melihat riwayat pengeluaran atau belum ada transaksi.`
                      }
                    </p>
                    {searchQuery.trim() && (
                      <p className="text-xs text-text-muted">
                        Coba kata kunci lain atau bersihkan kotak pencarian.
                      </p>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              displayedIssues.map((issue) => {
                const formattedTime = (issue.created_at || issue.issued_at)
                  ? new Date(issue.created_at || issue.issued_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '-';
                const spkNo = issue.spk?.spk_no || issue.spk?.spk_number || issue.spk_no || targetSpkNo || 'SPK-7080';
                const materialName = issue.material_name || issue.materials?.name || 'Material';
                const qty = issue.quantity !== undefined && issue.quantity !== null
                  ? issue.quantity
                  : (issue.quantity_issued !== undefined && issue.quantity_issued !== null ? issue.quantity_issued : 0);
                const unit = issue.unit || issue.materials?.unit || 'PCS';
                const price = issue.custom_unit_price !== null && issue.custom_unit_price !== undefined
                  ? issue.custom_unit_price
                  : (issue.unit_price !== undefined && issue.unit_price !== null 
                      ? issue.unit_price 
                      : (issue.materials?.unit_price || 0));
                const executor = issue.issued_by_name || 'Petugas Gudang';
                const wbsRaw = extractIssueWbs(issue);
                const wbsBadgeText = formatWbsBadge(wbsRaw);
                const wbsBadgeClass = getWbsBadgeClass(wbsRaw);

                return (
                  <tr key={issue.id} className="hover:bg-surface-hover/50 transition">
                    <td className="px-5 py-3">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(issue.id)}
                        onChange={(e) => handleSelectOne(issue.id, e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                    </td>
                    <td className="px-5 py-3 text-text-muted">
                      {formattedTime}
                    </td>
                    <td className="px-5 py-3 font-mono text-primary font-medium">
                      {spkNo}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-medium ${wbsBadgeClass}`}>
                        {wbsBadgeText}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium">
                      {materialName}
                    </td>
                    <td className="px-5 py-3">
                      <span className={Number(qty) < 0 ? 'text-status-warning font-semibold' : ''}>
                        {qty} {unit}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono">
                      {price ? Number(price).toLocaleString() : '0'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-xs text-text">
                            {executor}
                          </span>
                          {issue.issued_by_role === 'service_advisor' ? (
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono font-medium">
                              SA (Backup)
                            </span>
                          ) : Number(qty) < 0 ? (
                            <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30 px-1.5 py-0.5 rounded font-mono font-medium">
                              Retur
                            </span>
                          ) : null}
                        </div>
                        {issue.audit_notes && (
                          <span className="text-[11px] text-text-muted italic max-w-xs truncate" title={issue.audit_notes}>
                            {issue.audit_notes}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => openEditModal(issue)}
                          className="text-text-muted hover:text-primary transition p-1"
                          title="Edit Pengeluaran"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleSingleVoid(issue)}
                          className="text-text-muted hover:text-status-danger transition p-1"
                          title="Void Transaksi Ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingIssue && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface border border-border rounded-lg shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b border-border flex justify-between items-center bg-surface-hover">
              <h3 className="font-bold text-text">Edit Pengeluaran</h3>
              <button onClick={() => setEditingIssue(null)} className="text-text-muted hover:text-text">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-status-danger/10 border border-status-danger/30 rounded text-status-danger text-sm flex gap-2 items-start">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-text mb-1">Material</label>
                <div className="p-2 bg-background border border-border rounded text-text text-sm">
                  {editingIssue.material_name || editingIssue.materials?.name || 'Material'} (SPK: {editingIssue.spk?.spk_no || editingIssue.spk?.spk_number || editingIssue.spk_no || targetSpkNo || 'SPK-7080'})
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  Qty ({editingIssue.unit || editingIssue.materials?.unit || 'PCS'})
                </label>
                <input 
                  type="number"
                  value={editQty}
                  onChange={e => setEditQty(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-background border border-border rounded p-2 text-text focus:border-primary focus:outline-none"
                  min="0.1"
                  step="0.1"
                />
                <p className="text-xs text-text-muted mt-1">Mengubah Qty akan otomatis menyesuaikan stok gudang.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">Harga Satuan Khusus (Rp)</label>
                <input 
                  type="number"
                  value={editPrice}
                  onChange={e => setEditPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-background border border-border rounded p-2 text-text focus:border-primary focus:outline-none"
                  min="0"
                />
                <p className="text-xs text-text-muted mt-1">
                  Harga master: Rp {editingIssue.materials?.unit_price.toLocaleString()}
                </p>
              </div>

            </div>
            <div className="p-4 border-t border-border flex justify-end gap-3 bg-background">
              <button 
                onClick={() => setEditingIssue(null)}
                className="px-4 py-2 border border-border rounded text-text hover:bg-surface-hover transition"
                disabled={isEditing}
              >
                Batal
              </button>
              <button 
                onClick={handleSaveEdit}
                disabled={isEditing}
                className="px-4 py-2 bg-primary text-primary-content rounded hover:bg-primary/90 transition flex items-center gap-2"
              >
                {isEditing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Void Modal */}
      <ConfirmationModal
        isOpen={confirmVoidOpen}
        title="Konfirmasi Void Pengeluaran Material"
        message={
          selectedIds.length > 1
            ? `Apakah Anda yakin ingin membatalkan ${selectedIds.length} pengeluaran material ini? Stok akan dikembalikan dan item ini akan muncul kembali di tab Permintaan Mandor untuk diapprove ulang.`
            : "Apakah Anda yakin ingin membatalkan pengeluaran material ini? Stok akan dikembalikan dan item ini akan muncul kembali di tab Permintaan Mandor untuk diapprove ulang."
        }
        confirmText="Ya, Void Transaksi"
        cancelText="Batal"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={executeBulkDelete}
        onCancel={() => setConfirmVoidOpen(false)}
      />

      {/* Feedback Modal */}
      {feedbackModal && (
        <ConfirmationModal
          isOpen={feedbackModal.isOpen}
          title={feedbackModal.title}
          message={feedbackModal.message}
          confirmText="Tutup"
          hideCancel={true}
          variant={feedbackModal.variant}
          onConfirm={() => setFeedbackModal(null)}
          onCancel={() => setFeedbackModal(null)}
        />
      )}
    </div>
  );
};
