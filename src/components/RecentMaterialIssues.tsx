import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Search, Loader2, Trash2, Edit2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { inventoryService } from '../services/inventoryService';
import { ConfirmationModal } from './ConfirmationModal';
import { formatWbsBadge, getWbsWeight } from '../utils/wbsSort';
import { resolveDetailedSource } from '../utils/sourceOrigin';

function extractIssueWbs(issue: any, fallbackMap?: Map<string, string>): string | null {
  if (!issue) return null;
  if (issue.wbs_stage) return issue.wbs_stage;
  const mrItem = Array.isArray(issue.material_requisition_items)
    ? issue.material_requisition_items[0]
    : issue.material_requisition_items;
  if (mrItem?.wbs_stage) return mrItem.wbs_stage;

  const req = mrItem?.requisition || issue.material_requisitions;
  const mr = Array.isArray(req) ? req[0] : req;
  if (mr?.wbs_id) return mr.wbs_id;
  if (mr?.wbs_category) return mr.wbs_category;
  if (mr?.wbs_stage) return mr.wbs_stage;

  const rabItem = mrItem?.rab_items || issue.rab_items;
  if (rabItem?.wbs_category) return rabItem.wbs_category;
  if (rabItem?.wbs_stage) return rabItem.wbs_stage;

  const map = fallbackMap || issue.spkWbsMap;
  if (map && issue.material_id && map.has(issue.material_id)) {
    return map.get(issue.material_id);
  }

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
  const [spkPackageMap, setSpkPackageMap] = useState<Map<string, string>>(new Map());
  const [spkWbsMap, setSpkWbsMap] = useState<Map<string, string>>(new Map());

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

      // Ambil data referensi paket SPK dan WBS dari rab_items aktif sebagai fallback penelusuran nama paket dan WBS di memori klien
      const newPackageMap = new Map<string, string>();
      const newWbsMap = new Map<string, string>();
      if (resolvedSpkId && resolvedSpkId !== 'ALL') {
        try {
          let rabItemsQuery = supabase
            .from('rab_items')
            .select(`
              material_id,
              wbs_stage,
              wbs_category,
              package_id,
              product_packages:package_id ( id, name )
            `);

          if (typeof rabItemsQuery.eq === 'function') {
            rabItemsQuery = rabItemsQuery.eq('spk_id', resolvedSpkId);
          }
          if (typeof rabItemsQuery.not === 'function') {
            rabItemsQuery = rabItemsQuery.not('package_id', 'is', null);
          }

          const { data: rabItemsData } = await rabItemsQuery;
          if (rabItemsData && Array.isArray(rabItemsData) && rabItemsData.length > 0) {
            rabItemsData.forEach((ri: any) => {
              const pkgName = ri.product_packages?.name || ri.product_package?.name;
              if (pkgName && ri.material_id) {
                if (ri.wbs_stage) newPackageMap.set(`${ri.material_id}_${ri.wbs_stage}`, pkgName);
                if (ri.wbs_category) newPackageMap.set(`${ri.material_id}_${ri.wbs_category}`, pkgName);
                if (!newPackageMap.has(ri.material_id)) {
                  newPackageMap.set(ri.material_id, pkgName);
                }
              }
              const wbsVal = ri.wbs_stage || ri.wbs_category;
              if (wbsVal && ri.material_id && !newWbsMap.has(ri.material_id)) {
                newWbsMap.set(ri.material_id, wbsVal);
              }
            });
          }

          // Fallback via rab_estimations jika rab_items terikat ke rab_estimation_id
          let estQuery = supabase
            .from('rab_estimations')
            .select('id');
          if (typeof estQuery.eq === 'function') {
            estQuery = estQuery.eq('spk_id', resolvedSpkId);
          }
          const { data: estData } = await estQuery;

          const estIds = (estData || []).map((e: any) => e.id).filter(Boolean);
          if (estIds.length > 0) {
            let estRabQuery = supabase
              .from('rab_items')
              .select(`
                material_id,
                wbs_stage,
                wbs_category,
                package_id,
                product_packages:package_id ( id, name )
              `);
            if (typeof estRabQuery.in === 'function') {
              estRabQuery = estRabQuery.in('rab_estimation_id', estIds);
            }
            if (typeof estRabQuery.not === 'function') {
              estRabQuery = estRabQuery.not('package_id', 'is', null);
            }
            const { data: estRabItems } = await estRabQuery;
            if (estRabItems && Array.isArray(estRabItems) && estRabItems.length > 0) {
              estRabItems.forEach((ri: any) => {
                const pkgName = ri.product_packages?.name || ri.product_package?.name;
                if (pkgName && ri.material_id) {
                  if (ri.wbs_stage) newPackageMap.set(`${ri.material_id}_${ri.wbs_stage}`, pkgName);
                  if (ri.wbs_category) newPackageMap.set(`${ri.material_id}_${ri.wbs_category}`, pkgName);
                  if (!newPackageMap.has(ri.material_id)) {
                    newPackageMap.set(ri.material_id, pkgName);
                  }
                }
                const wbsVal = ri.wbs_stage || ri.wbs_category;
                if (wbsVal && ri.material_id && !newWbsMap.has(ri.material_id)) {
                  newWbsMap.set(ri.material_id, wbsVal);
                }
              });
            }
          }
        } catch (err) {
          console.warn('Could not fetch rab_items package/wbs mapping:', err);
        }
      }
      setSpkPackageMap(newPackageMap);
      setSpkWbsMap(newWbsMap);

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
            package_name,
            source_type,
            change_order_id,
            wbs_stage,
            spk:spk_id ( id, spk_no ),
            materials ( name, unit, unit_price ),
            material_requisitions:requisition_id ( id, wbs_category ),
            material_requisition_items:requisition_item_id (
              id,
              wbs_stage,
              package_name,
              source_type,
              rab_item_id,
              change_order_item_id,
              rab_items ( id, notes, package_id, wbs_stage, wbs_category, product_packages:package_id ( id, name ) ),
              change_order_items ( id, notes, change_order_id )
            )
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
          records = data.map((r: any) => {
            const mrItem = Array.isArray(r.material_requisition_items)
              ? r.material_requisition_items[0]
              : r.material_requisition_items;
            const mr = Array.isArray(r.material_requisitions)
              ? r.material_requisitions[0]
              : r.material_requisitions;
            const mrItemReq = Array.isArray(mrItem?.requisition)
              ? mrItem.requisition[0]
              : mrItem?.requisition;

            const itemWbs = mrItem?.wbs_stage;
            const reqWbs = mrItemReq?.wbs_id || mrItemReq?.wbs_category || mrItemReq?.wbs_stage || mr?.wbs_id || mr?.wbs_category || mr?.wbs_stage;
            const rabWbs = mrItem?.rab_items?.wbs_stage || mrItem?.rab_items?.wbs_category || newWbsMap.get(r.material_id);
            const currentWbs = r.wbs_stage || itemWbs || reqWbs || rabWbs || r.wbs_category || null;

            const resolvedPackageName =
              r.package_name ||
              mrItem?.package_name ||
              mrItem?.product_packages?.name ||
              mrItem?.rab_items?.product_packages?.name ||
              (currentWbs ? newPackageMap.get(`${r.material_id}_${currentWbs}`) : null) ||
              newPackageMap.get(r.material_id) ||
              mr?.package_name ||
              null;

            const coItem = Array.isArray(mrItem?.change_order_items)
              ? mrItem?.change_order_items[0]
              : mrItem?.change_order_items;

            const resolvedChangeOrderId =
              r.change_order_id ||
              mrItem?.change_order_id ||
              mrItem?.change_order_item_id ||
              coItem?.change_order_id ||
              null;

            const resolvedSourceType =
              r.source_type ||
              mrItem?.source_type ||
              (resolvedChangeOrderId ? 'CHANGE_ORDER' : (resolvedPackageName ? 'PACKAGE' : 'RAB'));

            return {
              ...r,
              created_at: r.created_at || r.issued_at,
              issued_at: r.issued_at,
              source_type: resolvedSourceType,
              change_order_id: resolvedChangeOrderId,
              package_name: resolvedPackageName,
              spkPackageMap: newPackageMap,
              spkWbsMap: newWbsMap,
              wbs_stage: currentWbs || null,
              wbs_category: r.wbs_category || reqWbs || rabWbs || null,
              material_requisition_items: mrItem || null,
              material_requisitions: mr || null,
              rab_items: mrItem?.rab_items || r.rab_items,
              change_order_items: coItem || mrItem?.change_order_items || r.change_order_items,
            };
          });
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
              package_name,
              source_type,
              change_order_id,
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
            records = giData.map((row: any) => {
              const currentWbs = row.wbs_stage || row.wbs_id || newWbsMap.get(row.material_id) || null;
              const pkgName = row.package_name ||
                (currentWbs ? newPackageMap.get(`${row.material_id}_${currentWbs}`) : null) ||
                newPackageMap.get(row.material_id) ||
                null;
              return {
                ...row,
                source_type: row.source_type || (pkgName ? 'PACKAGE' : 'RAB'),
                change_order_id: row.change_order_id || null,
                package_name: pkgName,
                spkPackageMap: newPackageMap,
                spkWbsMap: newWbsMap,
                wbs_stage: currentWbs,
                wbs_category: row.wbs_category || null,
              };
            });
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
              package_name,
              source_type,
              change_order_id,
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
            records = miData.map((row: any) => {
              const currentWbs = row.wbs_stage || newWbsMap.get(row.material_id) || null;
              const pkgName = row.package_name ||
                (currentWbs ? newPackageMap.get(`${row.material_id}_${currentWbs}`) : null) ||
                newPackageMap.get(row.material_id) ||
                null;
              return {
                id: row.id,
                spk_id: row.spk_id,
                material_id: row.material_id,
                quantity: row.quantity,
                quantity_issued: row.quantity,
                unit_price: row.unit_price,
                custom_unit_price: row.unit_price,
                source_type: row.source_type || (pkgName ? 'PACKAGE' : 'RAB'),
                change_order_id: row.change_order_id || null,
                package_name: pkgName,
                spkPackageMap: newPackageMap,
                spkWbsMap: newWbsMap,
                wbs_stage: currentWbs,
                wbs_category: row.wbs_category || row.wbs_stage,
                created_at: row.created_at,
                issued_at: row.created_at,
                issued_by_name: row.issued_by_name,
                issued_by_role: row.issued_by_role,
                audit_notes: row.audit_notes,
                spk: row.spk,
                materials: row.materials
              };
            });
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
              package_name,
              source_type,
              change_order_id,
              wbs_stage,
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
            records = baseData.map((row: any) => {
              const currentWbs = row.wbs_stage || newWbsMap.get(row.material_id) || null;
              const pkgName = row.package_name ||
                (currentWbs ? newPackageMap.get(`${row.material_id}_${currentWbs}`) : null) ||
                newPackageMap.get(row.material_id) ||
                null;
              return {
                ...row,
                source_type: row.source_type || (pkgName ? 'PACKAGE' : 'RAB'),
                change_order_id: row.change_order_id || null,
                package_name: pkgName,
                spkPackageMap: newPackageMap,
                spkWbsMap: newWbsMap,
                wbs_stage: currentWbs,
                wbs_category: row.wbs_category || null,
              };
            });
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

  const filteredRecentIssues = React.useMemo(() => {
    if (!searchQuery.trim()) return recentIssues;
    const q = searchQuery.toLowerCase().trim();
    return recentIssues.filter(issue => {
      const wbs = issue.wbs_stage || issue.material_requisition_items?.requisition?.wbs_id || issue.wbs_category || extractIssueWbs(issue, issue.spkWbsMap || spkWbsMap) || '';
      const src = resolveDetailedSource(issue, null, issue.spkPackageMap || spkPackageMap);
      return (
        (issue.materials?.name || issue.material_name || '').toLowerCase().includes(q) ||
        (issue.materials?.unit || issue.unit || '').toLowerCase().includes(q) ||
        (issue.spk?.spk_no || issue.spk_no || '').toLowerCase().includes(q) ||
        src.fullLabel.toLowerCase().includes(q) ||
        src.origin.toLowerCase().includes(q) ||
        src.typeLabel.toLowerCase().includes(q) ||
        wbs.toLowerCase().includes(q) ||
        formatWbsBadge(wbs).toLowerCase().includes(q)
      );
    });
  }, [recentIssues, searchQuery, spkPackageMap, spkWbsMap]);

  const sortedIssues = React.useMemo(() => {
    return [...filteredRecentIssues].sort((a, b) => {
      const weightA = getWbsWeight(a.wbs_stage || a.material_requisition_items?.requisition?.wbs_id || extractIssueWbs(a, a.spkWbsMap || spkWbsMap));
      const weightB = getWbsWeight(b.wbs_stage || b.material_requisition_items?.requisition?.wbs_id || extractIssueWbs(b, b.spkWbsMap || spkWbsMap));
      if (weightA !== weightB) return weightA - weightB;
      // Secondary sort: created_at descending (dengan fallback issued_at)
      return new Date(b.created_at || b.issued_at || 0).getTime() - new Date(a.created_at || a.issued_at || 0).getTime();
    });
  }, [filteredRecentIssues, spkWbsMap]);

  const displayedIssues = sortedIssues;

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
              <th className="py-1 px-3 w-6">
                <input 
                  type="checkbox" 
                  checked={selectedIds.length === displayedIssues.length && displayedIssues.length > 0}
                  onChange={handleSelectAll}
                  disabled={displayedIssues.length === 0}
                  aria-label="Pilih semua baris pengeluaran"
                  className="rounded border-border text-primary focus:ring-primary disabled:opacity-40"
                />
              </th>
              <th className="py-1 px-3">Tahapan</th>
              <th className="py-1 px-3">SUMBER / PAKET</th>
              <th className="py-1 px-3">TIME</th>
              <th className="py-1 px-3">SPK NO.</th>
              <th className="py-1 px-3">MATERIAL</th>
              <th className="py-1 px-3 text-right">QTY</th>
              <th className="py-1 px-3 text-right">HARGA (RP)</th>
              <th className="py-1 px-3">EKSEKUTOR / AUDIT</th>
              <th className="py-1 px-3 text-center">AKSI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={10} className="px-5 py-12 text-center text-text-muted">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                  <p className="text-sm">Memuat riwayat pengeluaran material...</p>
                </td>
              </tr>
            ) : displayedIssues.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-5 py-10 text-center text-text-muted">
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

                return (
                  <tr key={issue.id} className="hover:bg-surface-hover/50 transition">
                    <td className="py-1.5 px-3">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(issue.id)}
                        onChange={(e) => handleSelectOne(issue.id, e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                    </td>
                    <td className="py-1.5 px-3">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                        {formatWbsBadge(issue.wbs_stage || issue.material_requisition_items?.requisition?.wbs_id || extractIssueWbs(issue, issue.spkWbsMap || spkWbsMap))}
                      </span>
                    </td>
                    <td className="py-1.5 px-3">
                      {(() => {
                        const source = resolveDetailedSource(issue, null, issue.spkPackageMap || spkPackageMap);
                        return (
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap inline-flex items-center gap-1 ${source.badgeClass}`}>
                            <span>{source.origin === 'Change Order' ? '🔄' : '📋'}</span>
                            <span>{source.fullLabel}</span>
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-1.5 px-3 text-text-muted">
                      {formattedTime}
                    </td>
                    <td className="py-1.5 px-3 font-mono text-primary font-medium">
                      {spkNo}
                    </td>
                    <td className="py-1.5 px-3 font-medium">
                      {materialName}
                    </td>
                    <td className="py-1.5 px-3">
                      <span className={Number(qty) < 0 ? 'text-status-warning font-semibold' : ''}>
                        {qty} {unit}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono">
                      {price ? Number(price).toLocaleString() : '0'}
                    </td>
                    <td className="py-1.5 px-3">
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
                    <td className="py-1.5 px-3 text-center">
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
