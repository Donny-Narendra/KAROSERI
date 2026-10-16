import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Check, X, ClipboardList, Loader2, AlertTriangle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ShieldCheck } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';
import type { StockAuditItem } from './RecentApprovedMaterials';
import { normalizeText } from '../utils/rabItemAllocation';

export interface SpkSummaryItem {
  spkId: string;
  spkNo: string;
  customerName: string;
  vehiclePlate?: string;
  subTasks?: string[] | string;
  count: number;
}

export interface SpkBudgetData {
  spkId: string;
  rabBudgetLimit: number;
  approvedReqCost: number;
  boronganMaterialCost: number;
  directIssueCost: number;
  totalCommittedBefore: number;
}

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
  const { user, profile } = useAuth();
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [spkBudgetMap, setSpkBudgetMap] = useState<Record<string, SpkBudgetData>>({});
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Ekstrak daftar SPK unik yang memiliki antrean requisition pending beserta jumlahnya
  const spkSummary = useMemo(() => {
    const map = new Map<string, SpkSummaryItem>();
    requisitions.forEach(req => {
      const spk = Array.isArray(req.spk) ? req.spk[0] : req.spk;
      const spkNo = spk?.spk_no || spk?.spk_number || 'Tanpa SPK';
      const spkId = spk?.id || req.spk_id || '';
      const customerName = spk?.customer_name || 'Pelanggan Umum';
      const vehiclePlate = spk?.vehicle_plate || '';
      const subTasks = spk?.sub_tasks || [];

      const existing = map.get(spkNo);
      if (existing) {
        existing.count += 1;
        if (!existing.vehiclePlate && vehiclePlate) existing.vehiclePlate = vehiclePlate;
        const hasExistingSubTasks = Array.isArray(existing.subTasks) ? existing.subTasks.length > 0 : Boolean(existing.subTasks);
        const hasNewSubTasks = Array.isArray(subTasks) ? subTasks.length > 0 : Boolean(subTasks);
        if (!hasExistingSubTasks && hasNewSubTasks) existing.subTasks = subTasks;
      } else {
        map.set(spkNo, {
          spkId,
          spkNo,
          customerName,
          vehiclePlate,
          subTasks,
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
      (req.spk?.spk_no || req.spk?.spk_number || 'Tanpa SPK') === selectedSpkFilter ||
      req.spk?.id === selectedSpkFilter ||
      req.spk_id === selectedSpkFilter
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
          spk_id,
          wbs_category,
          status,
          notes,
          requested_by,
          created_at,
          spk ( id, spk_no, customer_name, vehicle_plate, sub_tasks, total_estimated_cost ),
          profiles ( full_name ),
          material_requisition_items (
            id,
            material_id,
            quantity,
            status,
            rab_item_id,
            material_name,
            unit,
            unit_price,
            subtotal,
            wbs_stage,
            materials ( id, name, unit, unit_price ),
            rab_items ( id, item_total, quantity, description )
          )
        `)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Ambil katalog master materials untuk fallback pencarian harga dan id jika relasi kosong
      const { data: masterMaterials } = await supabase
        .from('materials')
        .select('id, name, unit, unit_price');

      // Ambil data RAB, Requisition Approved, SPK Borongan, dan Direct Issues untuk akumulasi Gate 2
      const spkIds = Array.from(new Set((data || []).map((r: any) => r.spk_id).filter(Boolean)));
      const rabItemsBySpk: any[] = [];
      let rabEstsData: any[] = [];
      let approvedReqsData: any[] = [];
      let boronganRowsData: any[] = [];
      let directIssuesData: any[] = [];

      if (spkIds.length > 0) {
        const [rabRes, approvedRes, borongRes, directRes] = await Promise.all([
          supabase
            .from('rab_estimations')
            .select(`
              spk_id,
              total_material_cost,
              total_estimated_cost,
              rab_items (
                id,
                description,
                quantity,
                item_total,
                wbs_category
              )
            `)
            .in('spk_id', spkIds),
          supabase
            .from('material_requisitions')
            .select(`
              id,
              spk_id,
              material_requisition_items (
                id,
                quantity,
                unit_price,
                subtotal,
                material_id,
                materials ( unit_price )
              )
            `)
            .in('spk_id', spkIds)
            .eq('status', 'APPROVED'),
          supabase
            .from('spk_borongan')
            .select('id, spk_id, contract_value, status, material_id, rab_item_id')
            .in('spk_id', spkIds),
          supabase
            .from('inventory_transactions')
            .select(`
              id,
              spk_id,
              quantity_issued,
              custom_unit_price,
              status,
              materials ( unit_price )
            `)
            .in('spk_id', spkIds)
            .is('requisition_id', null)
        ]);

        if (rabRes.data) rabEstsData = rabRes.data;
        if (approvedRes.data) approvedReqsData = approvedRes.data;
        if (borongRes.data) boronganRowsData = borongRes.data;
        if (directRes.data) directIssuesData = directRes.data;

        rabEstsData.forEach((est: any) => {
          const items = est.rab_items || [];
          items.forEach((ri: any) => {
            rabItemsBySpk.push({
              spkId: est.spk_id,
              ...ri
            });
          });
        });

        // Hitung komponen biaya riil akumulasi historis untuk setiap SPK
        const budgetMap: Record<string, SpkBudgetData> = {};
        spkIds.forEach((sId: string) => {
          // rabBudgetLimit: total material cost dari RAB (dengan fallback sum items atau total_estimated_cost)
          const est = rabEstsData.find((e: any) => e.spk_id === sId);
          let rabBudget = Number(est?.total_material_cost || 0);
          if (rabBudget === 0 && est?.rab_items && est.rab_items.length > 0) {
            rabBudget = est.rab_items.reduce((sum: number, ri: any) => sum + (Number(ri.item_total) || 0), 0);
          }
          if (rabBudget === 0) {
            const spkObj = (data || []).find((r: any) => r.spk_id === sId)?.spk;
            const s: any = Array.isArray(spkObj) ? spkObj[0] : spkObj;
            if (s?.total_estimated_cost) rabBudget = Number(s.total_estimated_cost);
          }

          // approvedReqCost: total biaya requisition yang sudah di-approve
          let approvedCost = 0;
          approvedReqsData
            .filter((ar: any) => ar.spk_id === sId)
            .forEach((ar: any) => {
              (ar.material_requisition_items || []).forEach((item: any) => {
                const sub = Number(item.subtotal || 0);
                if (sub > 0) {
                  approvedCost += sub;
                } else {
                  const qty = Number(item.quantity || 0);
                  const unitP = Number(item.unit_price || item.materials?.unit_price || 0);
                  approvedCost += (qty * unitP);
                }
              });
            });

          // boronganMaterialCost: total material yang teralokasi pada SPK Borongan
          let boronganCost = 0;
          boronganRowsData
            .filter((b: any) => b.spk_id === sId && b.status !== 'CANCELLED' && b.status !== 'CUT_OFF')
            .forEach((b: any) => {
              boronganCost += Number(b.contract_value || 0);
            });

          // directIssueCost: total material yang dikeluarkan langsung via tab Issue Material
          let directCost = 0;
          directIssuesData
            .filter((it: any) => it.spk_id === sId && it.status !== 'VOID')
            .forEach((it: any) => {
              const qty = Number(it.quantity_issued || 0);
              const unitP = Number(it.custom_unit_price ?? it.materials?.unit_price ?? 0);
              directCost += (qty * unitP);
            });

          budgetMap[sId] = {
            spkId: sId,
            rabBudgetLimit: rabBudget,
            approvedReqCost: approvedCost,
            boronganMaterialCost: boronganCost,
            directIssueCost: directCost,
            totalCommittedBefore: approvedCost + boronganCost + directCost
          };
        });

        setSpkBudgetMap(budgetMap);
      } else {
        setSpkBudgetMap({});
      }

      // Normalisasi data requisition agar mendukung berbagai penamaan properti secara defensif
      const normalizedData = (data || []).map((req: any) => {
        const rawItems = req.material_requisition_items || req.items || [];
        const items = rawItems.map((item: any) => {
          const mat = item.material || item.materials;
          const name = (item.material_name || mat?.name || 'Material Non-Stok').trim();
          const unit = item.unit || mat?.unit || 'pcs';
          const rab = item.rab_items || item.rab_item;
          const normName = normalizeText(name);

          // Cari padanan di master materials jika material_id kosong atau unit_price bernilai 0
          const matchedMaster = (masterMaterials || []).find((m: any) => {
            if (item.material_id && m.id === item.material_id) return true;
            return normName && normalizeText(m.name) === normName;
          });

          // Cari padanan di RAB SPK jika unit_price bernilai 0
          const matchedSpkRab = rabItemsBySpk.find((ri: any) => {
            if (ri.spkId !== req.spk_id) return false;
            if (item.rab_item_id && ri.id === item.rab_item_id) return true;
            return normName && normalizeText(ri.description) === normName;
          });

          // Multi-layer fallback resolusi harga satuan (Snapshot -> Join Materials -> Join RAB -> Master Match -> SPK RAB Match)
          let unitPrice = Number(item.unit_price ?? item.estimated_price ?? 0);
          if (unitPrice === 0 && mat?.unit_price) {
            unitPrice = Number(mat.unit_price);
          }
          if (unitPrice === 0 && rab?.item_total) {
            const rabQty = Number(rab.quantity) || 1;
            unitPrice = Number(rab.item_total) / rabQty;
          }
          if (unitPrice === 0 && matchedMaster?.unit_price) {
            unitPrice = Number(matchedMaster.unit_price);
          }
          if (unitPrice === 0 && matchedSpkRab?.item_total) {
            const spkRabQty = Number(matchedSpkRab.quantity) || 1;
            unitPrice = Number(matchedSpkRab.item_total) / spkRabQty;
          }

          const quantity = Number(item.quantity) || 0;
          const subtotal = (item.subtotal && Number(item.subtotal) > 0)
            ? Number(item.subtotal)
            : (quantity * unitPrice);

          const resolvedMaterialId = item.material_id || mat?.id || matchedMaster?.id || null;

          return {
            ...item,
            material_id: resolvedMaterialId,
            material: mat || (resolvedMaterialId ? { id: resolvedMaterialId, name, unit, unit_price: unitPrice } : null),
            materials: mat || (resolvedMaterialId ? { id: resolvedMaterialId, name, unit, unit_price: unitPrice } : null),
            material_name: name,
            unit,
            unit_price: unitPrice,
            estimated_price: unitPrice,
            quantity,
            subtotal,
            wbs_stage: item.wbs_stage || req.wbs_category
          };
        });

        const totalRequisitionCost = items.reduce((sum: number, it: any) => sum + (Number(it.subtotal) || 0), 0);
        const rawSpk = Array.isArray(req.spk) ? req.spk[0] : req.spk;

        return {
          ...req,
          spk: rawSpk ? {
            ...rawSpk,
            spk_no: rawSpk.spk_no || rawSpk.spk_number || 'Tanpa SPK',
            spk_number: rawSpk.spk_no || rawSpk.spk_number || 'Tanpa SPK',
          } : null,
          items,
          material_requisition_items: items,
          totalRequisitionCost
        };
      });

      setRequisitions(normalizedData);
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
    const totalCostStr = (requisition.totalRequisitionCost || 0).toLocaleString('id-ID');
    const spkDisplayName = requisition.spk?.spk_no || requisition.spk?.spk_number || '-';
    const sId = requisition.spk_id || requisition.spk?.id;
    const budgetData = sId ? spkBudgetMap[sId] : null;
    const currentTicketCost = Number(requisition.totalRequisitionCost || 0);
    const approvedReqCost = budgetData?.approvedReqCost || 0;
    const boronganMaterialCost = budgetData?.boronganMaterialCost || 0;
    const directIssueCost = budgetData?.directIssueCost || 0;
    const rabBudgetLimit = budgetData?.rabBudgetLimit || 0;
    const projectedTotal = approvedReqCost + boronganMaterialCost + directIssueCost + currentTicketCost;
    const isOverBudget = rabBudgetLimit > 0 ? (projectedTotal > rabBudgetLimit) : (projectedTotal > 0);
    const overAmount = Math.max(0, projectedTotal - rabBudgetLimit);

    const overBudgetMessage = isOverBudget
      ? `\n\n⚠️ PERINGATAN PAGU GATE 2 (OVER BUDGET):\nMenyetujui requisition ini (Rp ${currentTicketCost.toLocaleString('id-ID')}) akan menyebabkan total pengeluaran material (Rp ${projectedTotal.toLocaleString('id-ID')}) MELEBIHI pagu RAB (Rp ${rabBudgetLimit.toLocaleString('id-ID')}) sebesar Rp ${overAmount.toLocaleString('id-ID')}.\n\nPastikan sudah ada persetujuan Change Order / SPK Tambahan dari Service Advisor sebelum menyetujui!`
      : '';

    setConfirmDialog({
      isOpen: true,
      type: 'APPROVE',
      requisition,
      title: isOverBudget ? 'Konfirmasi Persetujuan (Peringatan Over Budget)' : 'Setujui Permintaan Material',
      message: `Apakah Anda yakin ingin menyetujui permintaan material untuk SPK ${spkDisplayName} sebesar Rp ${totalCostStr} dan mengeluarkan material terkait?\n\nKuantitas material akan otomatis dicatat pada transaksi inventaris gudang dan stok fisik akan disesuaikan.${overBudgetMessage}`,
      confirmText: isOverBudget ? 'Tetap Setujui (Change Order Disetujui)' : 'Ya, Setujui & Keluarkan',
      variant: isOverBudget ? 'danger' : 'info',
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
    if (!confirmDialog || !user) return;
    const { type, requisition } = confirmDialog;
    setConfirmDialog(null);

    if (type === 'APPROVE') {
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

        // 2. Siapkan transaksi pengeluaran material dengan snapshot stok dan audit logging
        const approverName = profile?.full_name || user.email || 'Petugas Gudang';
        const approverRole = profile?.role || 'petugas_gudang';
        const approvalTimestamp = new Date().toISOString();
        const defaultAuditNotes = profile?.role === 'service_advisor'
          ? 'Disetujui oleh Service Advisor (Backup Gudang)'
          : 'Disetujui oleh Petugas Gudang';

        const transactions = itemsWithMat.map((item: any) => {
          const snap = stockSnapshots[item.material_id];
          return {
            spk_id: requisition.spk?.id || requisition.spk_id,
            material_id: item.material_id,
            quantity_issued: item.quantity,
            issued_by: user.id,
            issued_by_user_id: user.id,
            issued_by_name: approverName,
            issued_by_role: approverRole,
            audit_notes: defaultAuditNotes,
            requisition_id: requisition.id,
            requisition_item_id: item.id,
            custom_unit_price: item.unit_price || 0,
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
            const fallbackTransactions = transactions.map(({ stock_before: _stock_before, stock_after: _stock_after, ...rest }: any) => rest);
            const { error: retryError } = await supabase
              .from('inventory_transactions')
              .insert(fallbackTransactions);
              
            if (retryError) {
              const minimalTransactions = fallbackTransactions.map(({ requisition_id: _requisition_id, requisition_item_id: _requisition_item_id, ...rest }: any) => rest);
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

        // 3. Update status permintaan material pada material_requisitions dengan data audit lengkap
        const { error: reqError } = await supabase
          .from('material_requisitions')
          .update({ 
            status: 'APPROVED',
            approved_by_user_id: user.id,
            approved_by_name: approverName,
            approved_by_role: approverRole,
            approved_at: approvalTimestamp,
            audit_notes: defaultAuditNotes
          })
          .eq('id', requisition.id);

        if (reqError) throw reqError;

        // Mirror ke tabel mandor_requisitions untuk audit kompatibilitas
        try {
          await supabase
            .from('mandor_requisitions')
            .insert({
              spk_id: requisition.spk?.id || requisition.spk_id,
              requested_by: requisition.requested_by,
              status: 'APPROVED',
              approved_by_user_id: user.id,
              approved_by_name: approverName,
              approved_by_role: approverRole,
              approved_at: approvalTimestamp,
              audit_notes: defaultAuditNotes
            });
        } catch (err: any) {
          console.warn('Mirror mandor_requisitions notice:', err);
        }

        setFeedbackDialog({
          isOpen: true,
          title: 'Persetujuan Berhasil',
          message: `Permintaan material telah disetujui atas nama ${approverName} (${approverRole}), transaksi pengeluaran barang tercatat, dan stok gudang telah dikurangi.`,
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
        const approverName = profile?.full_name || user.email || 'Petugas Gudang';
        const approverRole = profile?.role || 'petugas_gudang';
        const rejectTimestamp = new Date().toISOString();
        const rejectNotes = profile?.role === 'service_advisor'
          ? 'Ditolak oleh Service Advisor (Backup Gudang)'
          : 'Ditolak oleh Petugas Gudang';

        const { error } = await supabase
          .from('material_requisitions')
          .update({ 
            status: 'REJECTED',
            approved_by_user_id: user.id,
            approved_by_name: approverName,
            approved_by_role: approverRole,
            approved_at: rejectTimestamp,
            audit_notes: rejectNotes
          })
          .eq('id', requisition.id);

        if (error) throw error;

        // Mirror ke tabel mandor_requisitions
        try {
          await supabase
            .from('mandor_requisitions')
            .insert({
              spk_id: requisition.spk?.id || requisition.spk_id,
              requested_by: requisition.requested_by,
              status: 'REJECTED',
              approved_by_user_id: user.id,
              approved_by_name: approverName,
              approved_by_role: approverRole,
              approved_at: rejectTimestamp,
              audit_notes: rejectNotes
            });
        } catch (err: any) {
          console.warn('Mirror mandor_requisitions notice:', err);
        }

        setFeedbackDialog({
          isOpen: true,
          title: 'Permintaan Ditolak',
          message: `Permintaan material telah berhasil ditolak atas nama ${approverName} (${approverRole}).`,
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
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span className="font-mono text-primary font-bold">
                        {req.spk?.spk_no || req.spk?.spk_number || 'Tanpa SPK'}
                      </span>
                      {req.spk?.customer_name && (
                        <span className="text-xs text-text-muted">
                          ({req.spk.customer_name})
                        </span>
                      )}
                      <span className="bg-background border border-border px-2 py-0.5 rounded text-xs font-medium">
                        {req.wbs_category}
                      </span>
                      <span className="text-xs text-text-muted">
                        Requested by: {req.profiles?.full_name || 'Mandor'}
                      </span>
                    </div>
                    
                    <div className="text-sm text-text-muted mb-4">
                      {new Date(req.created_at).toLocaleString()}
                      {req.notes && <p className="mt-1">Notes: {req.notes}</p>}
                    </div>

                    {/* Items Table */}
                    <div className="bg-background border border-border rounded-lg overflow-hidden shadow-sm">
                      <table className="w-full text-left text-xs sm:text-sm text-text">
                        <thead className="bg-surface-hover text-text-muted font-mono text-xs uppercase border-b border-border">
                          <tr>
                            <th className="px-4 py-2.5 font-semibold text-left">MATERIAL</th>
                            <th className="px-4 py-2.5 font-semibold text-center">JUMLAH DIMINTA</th>
                            <th className="px-4 py-2.5 font-semibold text-right">ESTIMASI HARGA (RP)</th>
                            <th className="px-4 py-2.5 font-semibold text-right">SUBTOTAL (RP)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {req.material_requisition_items && req.material_requisition_items.length > 0 ? (
                            req.material_requisition_items.map((item: any) => {
                              const matName = item.material?.name || item.materials?.name || item.material_name || 'Material Non-Stok';
                              const matUnit = item.material?.unit || item.materials?.unit || item.unit || 'pcs';
                              const unitPrice = Number(item.unit_price ?? item.estimated_price ?? item.material?.unit_price ?? item.materials?.unit_price ?? 0);
                              const subtotal = item.subtotal !== undefined && Number(item.subtotal) > 0 
                                ? Number(item.subtotal) 
                                : ((Number(item.quantity) || 0) * unitPrice);

                              return (
                                <tr key={item.id} className="hover:bg-surface-hover/40 transition">
                                  <td className="px-4 py-2.5">
                                    <span className="font-bold text-text text-sm block">
                                      {matName}
                                    </span>
                                    {item.material_id && (
                                      <span className="text-[10px] font-mono text-text-muted">
                                        ID: {item.material_id.substring(0, 8)}...
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5 text-center font-mono font-medium text-text">
                                    {item.quantity} {matUnit}
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-mono text-text-muted">
                                    Rp {unitPrice.toLocaleString('id-ID')}
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-mono font-bold text-text">
                                    Rp {subtotal.toLocaleString('id-ID')}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={4} className="px-4 py-4 text-center text-text-muted text-xs italic">
                                Tidak ada rincian material pada permintaan ini.
                              </td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot className="bg-surface-hover/80 border-t border-border font-mono text-xs">
                          <tr>
                            <td colSpan={3} className="px-4 py-2.5 text-right font-bold text-text uppercase">
                              Total Estimasi Biaya Requisition:
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-primary text-sm">
                              Rp {(req.totalRequisitionCost || 0).toLocaleString('id-ID')}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    
                    {/* Ringkasan Gate 2 Berjenjang (Dynamic Tiered Gate 2 Budget Warning) */}
                    {(() => {
                      const sId = req.spk_id || req.spk?.id;
                      const budgetData = sId ? spkBudgetMap[sId] : null;
                      const currentTicketCost = Number(req.totalRequisitionCost || 0);
                      const approvedReqCost = budgetData?.approvedReqCost || 0;
                      const boronganMaterialCost = budgetData?.boronganMaterialCost || 0;
                      const directIssueCost = budgetData?.directIssueCost || 0;
                      const rabBudgetLimit = budgetData?.rabBudgetLimit || 0;
                      const projectedTotal = approvedReqCost + boronganMaterialCost + directIssueCost + currentTicketCost;
                      const isOverBudget = rabBudgetLimit > 0 ? (projectedTotal > rabBudgetLimit) : (projectedTotal > 0);
                      const overAmount = Math.max(0, projectedTotal - rabBudgetLimit);
                      const remainingQuota = Math.max(0, rabBudgetLimit - projectedTotal);

                      if (isOverBudget) {
                        return (
                          <div className="mt-3 flex items-start gap-2.5 text-xs bg-rose-950/70 border border-rose-600 text-rose-200 p-3 rounded-md shadow-sm">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                            <div className="space-y-1.5 w-full">
                              <p className="leading-relaxed">
                                <span className="font-bold text-rose-300">PERINGATAN PAGU GATE 2 (OVER BUDGET):</span> Menyetujui requisition ini (Rp {currentTicketCost.toLocaleString('id-ID')}) akan menyebabkan total pengeluaran material (Rp {projectedTotal.toLocaleString('id-ID')}) MELEBIHI pagu RAB (Rp {rabBudgetLimit.toLocaleString('id-ID')}) sebesar Rp {overAmount.toLocaleString('id-ID')}. Pastikan sudah ada persetujuan Change Order / SPK Tambahan dari Service Advisor sebelum menyetujui.
                              </p>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-rose-300/80 pt-1.5 border-t border-rose-800/60 font-mono">
                                <span>Requisition Disetujui: <strong className="text-rose-100">Rp {approvedReqCost.toLocaleString('id-ID')}</strong></span>
                                <span>•</span>
                                <span>SPK Borongan: <strong className="text-rose-100">Rp {boronganMaterialCost.toLocaleString('id-ID')}</strong></span>
                                <span>•</span>
                                <span>Direct Issue: <strong className="text-rose-100">Rp {directIssueCost.toLocaleString('id-ID')}</strong></span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="mt-3 flex items-start gap-2.5 text-xs bg-emerald-950/40 border border-emerald-800 text-emerald-200 p-3 rounded-md shadow-sm">
                          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                          <div className="space-y-1.5 w-full">
                            <p className="leading-relaxed">
                              <span className="font-semibold text-emerald-300">Pagu Gate 2 (Aman):</span> Total permintaan saat ini (Rp {currentTicketCost.toLocaleString('id-ID')}) masih berada dalam kuota RAB. Akumulasi komitmen: Rp {projectedTotal.toLocaleString('id-ID')} dari total pagu Rp {rabBudgetLimit.toLocaleString('id-ID')} (Sisa Pagu: Rp {remainingQuota.toLocaleString('id-ID')}).
                            </p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-emerald-300/80 pt-1.5 border-t border-emerald-800/50 font-mono">
                              <span>Requisition Disetujui: <strong className="text-emerald-100">Rp {approvedReqCost.toLocaleString('id-ID')}</strong></span>
                              <span>•</span>
                              <span>SPK Borongan: <strong className="text-emerald-100">Rp {boronganMaterialCost.toLocaleString('id-ID')}</strong></span>
                              <span>•</span>
                              <span>Direct Issue: <strong className="text-emerald-100">Rp {directIssueCost.toLocaleString('id-ID')}</strong></span>
                              <span className="ml-auto text-[10px] text-emerald-400 font-sans italic">Stok gudang akan terpotong setelah persetujuan</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Actions Section */}
                  {(() => {
                    const sId = req.spk_id || req.spk?.id;
                    const budgetData = sId ? spkBudgetMap[sId] : null;
                    const currentTicketCost = Number(req.totalRequisitionCost || 0);
                    const approvedReqCost = budgetData?.approvedReqCost || 0;
                    const boronganMaterialCost = budgetData?.boronganMaterialCost || 0;
                    const directIssueCost = budgetData?.directIssueCost || 0;
                    const rabBudgetLimit = budgetData?.rabBudgetLimit || 0;
                    const projectedTotal = approvedReqCost + boronganMaterialCost + directIssueCost + currentTicketCost;
                    const isOverBudget = rabBudgetLimit > 0 ? (projectedTotal > rabBudgetLimit) : (projectedTotal > 0);

                    return (
                      <div className="flex lg:flex-col justify-end gap-2 lg:min-w-[120px]">
                        <button
                          onClick={() => handleRequestApprove(req)}
                          disabled={processingId !== null}
                          className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded transition disabled:opacity-50 text-white font-medium ${
                            isOverBudget
                              ? 'bg-amber-600 hover:bg-amber-700 border border-amber-500 shadow-sm'
                              : 'bg-status-success hover:bg-status-success/90'
                          }`}
                          title={isOverBudget ? 'Peringatan: Over Budget (Memerlukan persetujuan Change Order)' : 'Setujui Permintaan Material'}
                        >
                          {processingId === req.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : isOverBudget ? (
                            <AlertTriangle className="w-4 h-4 text-white" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
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
                    );
                  })()}
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
