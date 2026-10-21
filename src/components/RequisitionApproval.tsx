import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Check, X, ClipboardList, Loader2, AlertTriangle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';
import type { StockAuditItem } from './RecentApprovedMaterials';
import { normalizeText } from '../utils/rabItemAllocation';
import {
  evaluateGate2Budget,
  type RabItemGate2,
  type ChangeOrderItemGate2,
  type ApprovedRequisitionGate2,
  type DirectIssueGate2,
  type Gate2EvaluationResult
} from '../utils/gate2BudgetValidation';

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
  const [rabItemsList, setRabItemsList] = useState<RabItemGate2[]>([]);
  const [approvedCoItemsList, setApprovedCoItemsList] = useState<ChangeOrderItemGate2[]>([]);
  const [approvedReqsList, setApprovedReqsList] = useState<ApprovedRequisitionGate2[]>([]);
  const [directIssuesList, setDirectIssuesList] = useState<DirectIssueGate2[]>([]);
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
    type: 'APPROVE' | 'REJECT' | 'APPROVE_ITEM' | 'REJECT_ITEM';
    requisition: any;
    item?: any;
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
            change_order_item_id,
            material_name,
            unit,
            unit_price,
            subtotal,
            wbs_stage,
            materials ( id, name, unit, unit_price ),
            rab_items ( id, item_total, quantity, description ),
            change_order_items ( id, item_name, unit_price, quantity )
          )
        `)
        .in('status', ['PENDING', 'PARTIALLY_ISSUED'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Ambil katalog master materials untuk fallback pencarian harga dan id jika relasi kosong
      const { data: masterMaterials } = await supabase
        .from('materials')
        .select('id, name, unit, unit_price');

      // Ambil data RAB, Requisition Approved, dan Direct Issues untuk akumulasi Gate 2 (Eksklusif Material)
      const spkIds = Array.from(new Set((data || []).map((r: any) => r.spk_id).filter(Boolean)));
      const rabItemsBySpk: any[] = [];
      let rabEstsData: any[] = [];
      let approvedReqsData: any[] = [];
      let directIssuesData: any[] = [];
      let approvedCoData: any[] = [];

      if (spkIds.length > 0) {
        const [rabRes, approvedRes, directRes, coRes] = await Promise.all([
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
                cost_price,
                unit_price,
                item_total,
                wbs_category,
                wbs_stage,
                item_type,
                material_id
              )
            `)
            .in('spk_id', spkIds),
          supabase
            .from('material_requisitions')
            .select(`
              id,
              spk_id,
              wbs_category,
              status,
              material_requisition_items (
                id,
                quantity,
                status,
                unit_price,
                subtotal,
                material_id,
                wbs_stage,
                materials ( unit_price )
              )
            `)
            .in('spk_id', spkIds)
            .in('status', ['APPROVED', 'COMPLETED', 'PARTIALLY_ISSUED', 'ISSUED']),
          supabase
            .from('inventory_transactions')
            .select(`
              id,
              spk_id,
              material_id,
              quantity_issued,
              custom_unit_price,
              status,
              materials ( unit_price )
            `)
            .in('spk_id', spkIds)
            .is('requisition_id', null),
          supabase
            .from('change_orders')
            .select(`
              id,
              spk_id,
              status,
              cost_adjustment,
              change_order_items (
                id,
                item_type,
                wbs_stage,
                quantity,
                unit_price,
                cost_price,
                subtotal
              )
            `)
            .in('spk_id', spkIds)
            .eq('status', 'APPROVED')
        ]);

        if (rabRes.data) rabEstsData = rabRes.data;
        if (approvedRes.data) approvedReqsData = approvedRes.data;
        if (directRes.data) directIssuesData = directRes.data;
        if (coRes.data) approvedCoData = coRes.data;

        const allRabItems: RabItemGate2[] = [];
        rabEstsData.forEach((est: any) => {
          const items = est.rab_items || [];
          items.forEach((ri: any) => {
            const itemObj = {
              spk_id: est.spk_id,
              spkId: est.spk_id,
              ...ri
            };
            allRabItems.push(itemObj);
            rabItemsBySpk.push(itemObj);
          });
        });
        setRabItemsList(allRabItems);

        const allCoItems: ChangeOrderItemGate2[] = [];
        approvedCoData.forEach((co: any) => {
          (co.change_order_items || []).forEach((ci: any) => {
            allCoItems.push({
              spk_id: co.spk_id,
              ...ci
            });
          });
        });
        setApprovedCoItemsList(allCoItems);
        setApprovedReqsList(approvedReqsData);
        setDirectIssuesList(directIssuesData);
      } else {
        setRabItemsList([]);
        setApprovedCoItemsList([]);
        setApprovedReqsList([]);
        setDirectIssuesList([]);
      }

      // Normalisasi data requisition agar mendukung berbagai penamaan properti secara defensif
      const normalizedData = (data || []).map((req: any) => {
        const rawItems = req.material_requisition_items || req.items || [];
        const items = rawItems.map((item: any) => {
          const mat = item.material || item.materials;
          const coItem = item.change_order_items || item.change_order_item;
          const name = (item.material_name || coItem?.item_name || mat?.name || 'Material Non-Stok').trim();
          const unit = item.unit || coItem?.unit || mat?.unit || 'pcs';
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

          // Multi-layer fallback resolusi harga satuan (Snapshot -> Join Materials -> Join Change Order -> Join RAB -> Master Match -> SPK RAB Match)
          let unitPrice = Number(item.unit_price ?? item.estimated_price ?? 0);
          if (unitPrice === 0 && mat?.unit_price) {
            unitPrice = Number(mat.unit_price);
          }
          if (unitPrice === 0 && coItem?.unit_price) {
            unitPrice = Number(coItem.unit_price);
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

          const itemStatus = item.status || 'PENDING';

          return {
            ...item,
            status: itemStatus,
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

        const pendingItems = items.filter((it: any) => it.status === 'PENDING' || !it.status);
        const pendingCost = pendingItems.reduce((sum: number, it: any) => sum + (Number(it.subtotal) || 0), 0);
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
          pendingItems,
          pendingCost,
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

  const getRequisitionGate2Evaluation = useCallback((requisition: any): Gate2EvaluationResult => {
    const sId = requisition.spk_id || requisition.spk?.id;
    const wbsStage = requisition.wbs_stage || requisition.wbs_category || requisition.material_requisition_items?.[0]?.wbs_stage || null;
    const currentTicketCost = Number(requisition.pendingCost ?? requisition.totalRequisitionCost ?? requisition.total_estimated_cost ?? 0);

    return evaluateGate2Budget({
      spkId: sId,
      wbsStage,
      currentTicketCost,
      rabItems: rabItemsList,
      approvedCoItems: approvedCoItemsList,
      approvedReqs: approvedReqsList,
      directIssues: directIssuesList
    });
  }, [rabItemsList, approvedCoItemsList, approvedReqsList, directIssuesList]);

  const handleRequestApprove = (requisition: any) => {
    const pendingItems = (requisition.material_requisition_items || []).filter(
      (it: any) => it.status === 'PENDING' || !it.status
    );
    const pendingCost = pendingItems.reduce((sum: number, it: any) => sum + (Number(it.subtotal) || 0), 0);
    const totalCostStr = (pendingCost > 0 ? pendingCost : requisition.totalRequisitionCost || 0).toLocaleString('id-ID');
    const spkDisplayName = requisition.spk?.spk_no || requisition.spk?.spk_number || '-';
    const gate2 = getRequisitionGate2Evaluation(requisition);
    const isOverBudget = gate2.isOverBudget;
    const stageDisplayName = requisition.wbs_category || gate2.wbsStageName || 'WBS Terkait';

    const overBudgetMessage = isOverBudget
      ? `\n\n⚠️ PERINGATAN PAGU GATE 2 (OVER BUDGET):\nMenyetujui permintaan ini (Rp ${gate2.currentTicketCost.toLocaleString('id-ID')}) akan menyebabkan total pengeluaran material ${stageDisplayName} (Rp ${gate2.projectedTotal.toLocaleString('id-ID')}) MELEBIHI pagu material RAB WBS (Rp ${gate2.wbsBudgetLimit.toLocaleString('id-ID')}) sebesar Rp ${gate2.overAmount.toLocaleString('id-ID')}.\n\nPastikan sudah ada persetujuan Change Order / SPK Tambahan dari Service Advisor sebelum menyetujui!`
      : '';

    setConfirmDialog({
      isOpen: true,
      type: 'APPROVE',
      requisition,
      title: isOverBudget ? 'Konfirmasi Persetujuan (Peringatan Over Budget)' : 'Setujui Semua Permintaan Material',
      message: `Apakah Anda yakin ingin menyetujui seluruh sisa permintaan material (${pendingItems.length} item) untuk SPK ${spkDisplayName} (${stageDisplayName}) sebesar Rp ${totalCostStr} dan mengeluarkan material terkait?\n\nKuantitas material akan otomatis dicatat pada transaksi inventaris gudang dan stok fisik akan disesuaikan.${overBudgetMessage}`,
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
      message: `Apakah Anda yakin ingin menolak seluruh sisa permintaan material untuk SPK ${requisition.spk?.spk_no || '-'}?\n\nStatus item yang belum disetujui akan diubah menjadi REJECTED.`,
      confirmText: 'Ya, Tolak Permintaan',
      variant: 'danger',
    });
  };

  const handleRequestApproveItem = (requisition: any, item: any) => {
    const itemCost = Number(item.subtotal || 0);
    const itemCostStr = itemCost.toLocaleString('id-ID');
    const matName = item.material?.name || item.materials?.name || item.material_name || 'Material';
    const matUnit = item.material?.unit || item.materials?.unit || item.unit || 'pcs';
    const spkDisplayName = requisition.spk?.spk_no || requisition.spk?.spk_number || '-';
    const stageDisplayName = item.wbs_stage || requisition.wbs_category || 'WBS Terkait';

    const gate2 = evaluateGate2Budget({
      spkId: requisition.spk_id || requisition.spk?.id,
      wbsStage: stageDisplayName,
      currentTicketCost: itemCost,
      rabItems: rabItemsList,
      approvedCoItems: approvedCoItemsList,
      approvedReqs: approvedReqsList,
      directIssues: directIssuesList
    });

    const isOverBudget = gate2.isOverBudget;
    const overBudgetMessage = isOverBudget
      ? `\n\n⚠️ PERINGATAN PAGU GATE 2 (OVER BUDGET):\nMenyetujui item "${matName}" (Rp ${gate2.currentTicketCost.toLocaleString('id-ID')}) akan menyebabkan total pengeluaran material ${stageDisplayName} (Rp ${gate2.projectedTotal.toLocaleString('id-ID')}) MELEBIHI pagu material RAB WBS (Rp ${gate2.wbsBudgetLimit.toLocaleString('id-ID')}) sebesar Rp ${gate2.overAmount.toLocaleString('id-ID')}.\n\nPastikan sudah ada persetujuan Change Order sebelum menyetujui!`
      : '';

    setConfirmDialog({
      isOpen: true,
      type: 'APPROVE_ITEM',
      requisition,
      item,
      title: isOverBudget ? 'Konfirmasi Persetujuan Item (Over Budget)' : 'Setujui Pengeluaran Item',
      message: `Apakah Anda yakin ingin menyetujui material "${matName}" (${item.quantity} ${matUnit}) untuk SPK ${spkDisplayName} sebesar Rp ${itemCostStr}?\n\nKuantitas material akan langsung dicatat pada transaksi pengeluaran gudang (Goods Issue) dan stok fisik akan dikurangi.${overBudgetMessage}`,
      confirmText: isOverBudget ? 'Tetap Setujui Item' : 'Ya, Setujui Item & Keluarkan',
      variant: isOverBudget ? 'danger' : 'info',
    });
  };

  const handleRequestRejectItem = (requisition: any, item: any) => {
    const matName = item.material?.name || item.materials?.name || item.material_name || 'Material';
    const matUnit = item.material?.unit || item.materials?.unit || item.unit || 'pcs';
    const spkDisplayName = requisition.spk?.spk_no || requisition.spk?.spk_number || '-';

    setConfirmDialog({
      isOpen: true,
      type: 'REJECT_ITEM',
      requisition,
      item,
      title: 'Tolak Item Material',
      message: `Apakah Anda yakin ingin menolak material "${matName}" (${item.quantity} ${matUnit}) untuk SPK ${spkDisplayName}?\n\nStatus item ini akan diubah menjadi REJECTED dan barang tidak akan dikeluarkan dari gudang.`,
      confirmText: 'Ya, Tolak Item',
      variant: 'danger',
    });
  };

  const executeConfirmedAction = async () => {
    if (!confirmDialog || !user) return;
    const { type, requisition, item } = confirmDialog;
    setConfirmDialog(null);

    const approverName = profile?.full_name || user.email || 'Petugas Gudang';
    const approverRole = profile?.role || 'petugas_gudang';
    const approvalTimestamp = new Date().toISOString();
    const defaultAuditNotes = profile?.role === 'service_advisor'
      ? 'Disetujui oleh Service Advisor (Backup Gudang)'
      : 'Disetujui oleh Petugas Gudang';
    const rejectNotes = profile?.role === 'service_advisor'
      ? 'Ditolak oleh Service Advisor (Backup Gudang)'
      : 'Ditolak oleh Petugas Gudang';

    if (type === 'APPROVE_ITEM') {
      if (!item) return;
      setProcessingId(item.id);
      try {
        let rpcSuccess = false;
        try {
          const { data: rpcData, error: rpcError } = await supabase.rpc('approve_single_requisition_item', {
            p_requisition_item_id: item.id,
            p_approved_by: user.id
          });
          if (!rpcError && rpcData?.success) {
            rpcSuccess = true;
          }
        } catch {
          rpcSuccess = false;
        }

        let stockBefore = 0;
        let stockAfter = 0;
        const matName = item.material?.name || item.materials?.name || item.material_name || 'Material Non-Stok';
        const matUnit = item.material?.unit || item.materials?.unit || item.unit || 'pcs';
        const qty = Number(item.quantity || 0);

        if (!rpcSuccess) {
          if (item.material_id) {
            const { data: mat } = await supabase
              .from('materials')
              .select('name, unit, current_stock')
              .eq('id', item.material_id)
              .single();

            stockBefore = Number(mat?.current_stock || 0);
            stockAfter = Math.max(0, stockBefore - qty);

            await supabase
              .from('materials')
              .update({ current_stock: stockAfter })
              .eq('id', item.material_id);
          }

          // Update status item menjadi APPROVED
          await supabase
            .from('material_requisition_items')
            .update({ status: 'APPROVED' })
            .eq('id', item.id);

          // Siapkan transaksi pengeluaran fisik
          const tx = {
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
            stock_before: stockBefore,
            stock_after: stockAfter
          };
          const { error: txError } = await supabase.from('inventory_transactions').insert([tx]);
          if (txError) {
            const { stock_before: _sb, stock_after: _sa, ...fallbackTx } = tx as any;
            await supabase.from('inventory_transactions').insert([fallbackTx]);
          }

          // Evaluasi sisa pending item pada requisition induk
          const otherItems = (requisition.material_requisition_items || []).filter((it: any) => it.id !== item.id);
          const remainingPending = otherItems.filter((it: any) => it.status === 'PENDING' || !it.status).length;
          const newParentStatus = remainingPending === 0 ? 'COMPLETED' : 'PARTIALLY_ISSUED';

          await supabase
            .from('material_requisitions')
            .update({
              status: newParentStatus,
              approved_by_user_id: user.id,
              approved_by_name: approverName,
              approved_by_role: approverRole,
              approved_at: approvalTimestamp,
              audit_notes: defaultAuditNotes
            })
            .eq('id', requisition.id);
        }

        if (onApprovalRecorded) {
          onApprovalRecorded([{
            id: `${item.id}-${Date.now()}`,
            materialName: matName,
            unit: matUnit,
            spkNo: requisition.spk?.spk_no || 'Tanpa SPK',
            wbsCategory: requisition.wbs_category,
            stockBefore,
            quantityApproved: qty,
            stockAfter,
            approvedAt: approvalTimestamp,
            isNew: true
          }]);
        }

        setFeedbackDialog({
          isOpen: true,
          title: 'Item Disetujui',
          message: `Material "${matName}" (${qty} ${matUnit}) telah berhasil disetujui, transaksi pengeluaran tercatat, dan stok gudang disesuaikan.`,
          variant: 'success'
        });
        if (onSuccess) onSuccess();
        fetchRequisitions();
      } catch (error: any) {
        console.error('Error approving item:', error);
        setFeedbackDialog({
          isOpen: true,
          title: 'Gagal Menyetujui Item',
          message: `Terjadi kendala saat menyetujui item: ${error.message || 'Kesalahan sistem'}`,
          variant: 'danger'
        });
      } finally {
        setProcessingId(null);
      }
    } else if (type === 'REJECT_ITEM') {
      if (!item) return;
      setProcessingId(item.id);
      try {
        let rpcSuccess = false;
        try {
          const { data: rpcData, error: rpcError } = await supabase.rpc('reject_single_requisition_item', {
            p_requisition_item_id: item.id,
            p_rejected_by: user.id
          });
          if (!rpcError && rpcData?.success) {
            rpcSuccess = true;
          }
        } catch {
          rpcSuccess = false;
        }

        const matName = item.material?.name || item.materials?.name || item.material_name || 'Material';

        if (!rpcSuccess) {
          await supabase
            .from('material_requisition_items')
            .update({ status: 'REJECTED' })
            .eq('id', item.id);

          const otherItems = (requisition.material_requisition_items || []).filter((it: any) => it.id !== item.id);
          const remainingPending = otherItems.filter((it: any) => it.status === 'PENDING' || !it.status).length;
          const approvedCount = otherItems.filter((it: any) => it.status === 'APPROVED').length;

          let parentStatus = requisition.status;
          if (remainingPending === 0) {
            parentStatus = approvedCount > 0 ? 'COMPLETED' : 'REJECTED';
          } else if (approvedCount > 0) {
            parentStatus = 'PARTIALLY_ISSUED';
          }

          if (parentStatus !== requisition.status) {
            await supabase
              .from('material_requisitions')
              .update({
                status: parentStatus,
                updated_at: approvalTimestamp
              })
              .eq('id', requisition.id);
          }
        }

        setFeedbackDialog({
          isOpen: true,
          title: 'Item Ditolak',
          message: `Material "${matName}" telah ditolak.`,
          variant: 'info'
        });
        if (onSuccess) onSuccess();
        fetchRequisitions();
      } catch (error: any) {
        console.error('Error rejecting item:', error);
        setFeedbackDialog({
          isOpen: true,
          title: 'Gagal Menolak Item',
          message: `Terjadi kendala saat menolak item: ${error.message || 'Kesalahan sistem'}`,
          variant: 'danger'
        });
      } finally {
        setProcessingId(null);
      }
    } else if (type === 'APPROVE') {
      setProcessingId(requisition.id);
      try {
        const recordedAudits: StockAuditItem[] = [];
        const pendingItems = (requisition.material_requisition_items || [])
          .filter((item: any) => item.status === 'PENDING' || !item.status);
        const itemsWithMat = pendingItems.filter((item: any) => Boolean(item.material_id));

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
            approvedAt: approvalTimestamp,
            isNew: true
          });
        }

        // Tandai seluruh pending item menjadi APPROVED
        for (const item of pendingItems) {
          await supabase
            .from('material_requisition_items')
            .update({ status: 'APPROVED' })
            .eq('id', item.id);
        }

        // 2. Siapkan transaksi pengeluaran material
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

        if (recordedAudits.length > 0 && onApprovalRecorded) {
          onApprovalRecorded(recordedAudits);
        }

        // 3. Update status permintaan material menjadi COMPLETED
        const { error: reqError } = await supabase
          .from('material_requisitions')
          .update({ 
            status: 'COMPLETED',
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
          message: `Seluruh permintaan material telah disetujui atas nama ${approverName} (${approverRole}), transaksi pengeluaran barang tercatat, dan stok gudang telah dikurangi.`,
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
        const pendingItems = (requisition.material_requisition_items || [])
          .filter((item: any) => item.status === 'PENDING' || !item.status);

        for (const item of pendingItems) {
          await supabase
            .from('material_requisition_items')
            .update({ status: 'REJECTED' })
            .eq('id', item.id);
        }

        const approvedCount = (requisition.material_requisition_items || [])
          .filter((item: any) => item.status === 'APPROVED').length;
        const newStatus = approvedCount > 0 ? 'COMPLETED' : 'REJECTED';

        const { error } = await supabase
          .from('material_requisitions')
          .update({ 
            status: newStatus,
            approved_by_user_id: user.id,
            approved_by_name: approverName,
            approved_by_role: approverRole,
            approved_at: approvalTimestamp,
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
              approved_at: approvalTimestamp,
              audit_notes: rejectNotes
            });
        } catch (err: any) {
          console.warn('Mirror mandor_requisitions notice:', err);
        }

        setFeedbackDialog({
          isOpen: true,
          title: 'Permintaan Ditolak',
          message: `Sisa permintaan material telah berhasil ditolak atas nama ${approverName} (${approverRole}).`,
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
                      {req.status === 'PARTIALLY_ISSUED' ? (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                          Sebagian Dirilis (Partially Issued)
                        </span>
                      ) : (
                        <span className="bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded text-xs font-medium">
                          Menunggu Persetujuan
                        </span>
                      )}
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
                            <th className="px-4 py-2.5 font-semibold text-center w-[180px]">AKSI / STATUS</th>
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
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {item.material_id && (
                                        <span className="text-[10px] font-mono text-text-muted">
                                          ID: {item.material_id.substring(0, 8)}...
                                        </span>
                                      )}
                                      {item.change_order_item_id && (
                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                                          Change Order
                                        </span>
                                      )}
                                    </div>
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
                                  <td className="px-4 py-2.5 text-center">
                                    {item.status === 'APPROVED' ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                        <Check className="w-3.5 h-3.5" />
                                        Disetujui
                                      </span>
                                    ) : item.status === 'REJECTED' ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                        <X className="w-3.5 h-3.5" />
                                        Ditolak
                                      </span>
                                    ) : (
                                      <div className="flex items-center justify-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => handleRequestApproveItem(req, item)}
                                          disabled={processingId !== null}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50 shadow-sm"
                                          title="Setujui dan keluarkan item ini saja"
                                        >
                                          {processingId === item.id ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                          ) : (
                                            <Check className="w-3.5 h-3.5" />
                                          )}
                                          Approve
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleRequestRejectItem(req, item)}
                                          disabled={processingId !== null}
                                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-surface hover:bg-rose-950/40 text-rose-300 border border-border hover:border-rose-500/40 transition disabled:opacity-50"
                                          title="Tolak item ini"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                          Tolak
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={5} className="px-4 py-4 text-center text-text-muted text-xs italic">
                                Tidak ada rincian material pada permintaan ini.
                              </td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot className="bg-surface-hover/80 border-t border-border font-mono text-xs">
                          <tr>
                            <td colSpan={4} className="px-4 py-2.5 text-right font-bold text-text uppercase">
                              Total Estimasi Biaya Requisition:
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-primary text-sm">
                              Rp {(req.totalRequisitionCost || 0).toLocaleString('id-ID')}
                            </td>
                          </tr>
                          {req.pendingCost !== undefined && req.pendingCost !== req.totalRequisitionCost && (
                            <tr>
                              <td colSpan={4} className="px-4 py-1.5 text-right font-semibold text-amber-300 text-xs">
                                Sisa Belum Disetujui (Pending):
                              </td>
                              <td className="px-4 py-1.5 text-right font-bold text-amber-300 text-xs">
                                Rp {(req.pendingCost || 0).toLocaleString('id-ID')}
                              </td>
                            </tr>
                          )}
                        </tfoot>
                      </table>
                    </div>
                    
                    {/* Ringkasan Gate 2 Berjenjang (Dynamic Tiered Gate 2 Budget Warning) */}
                    {(() => {
                      const gate2 = getRequisitionGate2Evaluation(req);
                      const stageDisplayName = req.wbs_stage || req.wbs_category || gate2.wbsStageName;
                      const wbsMaterialBudget = gate2.wbsBudgetLimit;
                      const wbsMaterialIssued = gate2.approvedReqCost + gate2.directIssueCost;
                      const currentReqAmount = Number(req.total_estimated_cost || req.totalRequisitionCost || 0);
                      const projectedTotal = wbsMaterialIssued + currentReqAmount;
                      const isOverBudget = gate2.isOverBudget;
                      const overAmount = gate2.overAmount;

                      if (isOverBudget) {
                        return (
                          <div className="mt-3 flex items-start gap-2.5 text-xs bg-rose-950/70 border border-rose-600 text-rose-200 p-3 rounded-md shadow-sm">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                            <div className="space-y-1.5 w-full">
                              <p className="leading-relaxed">
                                <span className="font-bold text-rose-300">PERINGATAN PAGU GATE 2 (OVER BUDGET):</span> Menyetujui requisition ini (Rp {currentReqAmount.toLocaleString('id-ID')}) akan menyebabkan total pengeluaran material <strong className="text-white underline">{stageDisplayName}</strong> (Rp {projectedTotal.toLocaleString('id-ID')}) MELEBIHI pagu material RAB WBS (Rp {wbsMaterialBudget.toLocaleString('id-ID')}) sebesar Rp {overAmount.toLocaleString('id-ID')}. Pastikan sudah ada persetujuan Change Order / SPK Tambahan dari Service Advisor sebelum menyetujui.
                              </p>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-rose-300/80 pt-1.5 border-t border-rose-800/60 font-mono">
                                <span>Pagu Material WBS: <strong className="text-rose-100">Rp {wbsMaterialBudget.toLocaleString('id-ID')}</strong></span>
                                <span>•</span>
                                <span>Requisition Disetujui: <strong className="text-rose-100">Rp {wbsMaterialIssued.toLocaleString('id-ID')}</strong></span>
                                <span>•</span>
                                <span>Tiket Ini: <strong className="text-rose-100">Rp {currentReqAmount.toLocaleString('id-ID')}</strong></span>
                                <span>•</span>
                                <span>Kelebihan: <strong className="text-rose-200">Rp {overAmount.toLocaleString('id-ID')}</strong></span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 rounded px-2.5 py-1 mb-2 mt-3 flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <span>✓</span>
                            <span>Alokasi Sesuai Pagu Material {stageDisplayName}: Rp {currentReqAmount.toLocaleString('id-ID')} / Rp {wbsMaterialBudget.toLocaleString('id-ID')}</span>
                          </div>
                          <span className="text-[10px] text-emerald-300/90 font-mono">
                            Sisa Pagu WBS: Rp {gate2.remainingQuota.toLocaleString('id-ID')}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Actions Section */}
                  {(() => {
                    const gate2 = getRequisitionGate2Evaluation(req);
                    const isOverBudget = gate2.isOverBudget;
                    const pendingItemsCount = (req.material_requisition_items || []).filter(
                      (it: any) => it.status === 'PENDING' || !it.status
                    ).length;

                    return (
                      <div className="flex lg:flex-col justify-end gap-2 lg:min-w-[130px]">
                        <button
                          onClick={() => handleRequestApprove(req)}
                          disabled={processingId !== null || pendingItemsCount === 0}
                          className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded transition disabled:opacity-50 text-white font-medium text-xs sm:text-sm ${
                            isOverBudget
                              ? 'bg-amber-600 hover:bg-amber-700 border border-amber-500 shadow-sm'
                              : 'bg-primary hover:bg-primary/90'
                          }`}
                          title={
                            pendingItemsCount === 0 
                              ? 'Semua item telah diproses' 
                              : isOverBudget 
                                ? 'Peringatan: Over Budget (Memerlukan persetujuan Change Order)' 
                                : 'Setujui Seluruh Sisa Material Pending Sekaligus'
                          }
                        >
                          {processingId === req.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : isOverBudget ? (
                            <AlertTriangle className="w-4 h-4 text-white" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          Approve Semua
                        </button>
                        <button
                          onClick={() => handleRequestReject(req)}
                          disabled={processingId !== null || pendingItemsCount === 0}
                          className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-surface hover:bg-status-danger/10 text-status-danger border border-border hover:border-status-danger/30 px-3.5 py-2 rounded transition disabled:opacity-50 text-xs sm:text-sm"
                          title={pendingItemsCount === 0 ? 'Semua item telah diproses' : 'Tolak Seluruh Sisa Material Pending'}
                        >
                          {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                          Tolak Semua
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
