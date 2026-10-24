import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { spkService } from '../../services/spkService';
import {
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Layers,
  TrendingUp,
  PackageCheck,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import {
  exportRabPerubahanToExcel,
  printRabPerubahanReport,
  computeRabPerubahanTotals,
  type ConsolidatedRabItem,
  type RabPerubahanSpkDetails
} from '../../utils/rabPerubahanExport';
import { formatWbsBadge, getWbsBadgeClass, getWbsWeight } from '../../utils/wbsSort';
import { cleanPackageName, extractPackageFromNotes } from '../../utils/sourceOrigin';
import { normalizeText } from '../../utils/rabItemAllocation';

interface RabPerubahanTabProps {
  spkId: string;
  spk?: any;
}

export const RabPerubahanTab: React.FC<RabPerubahanTabProps> = ({ spkId, spk }) => {
  const [items, setItems] = useState<ConsolidatedRabItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'MATERIAL' | 'LABOR' | 'OVERHEAD'>('ALL');
  const [filterOrigin, setFilterOrigin] = useState<'ALL' | 'RAB' | 'CHANGE_ORDER'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'FULFILLED' | 'PENDING'>('ALL');
  const [filterWbs, setFilterWbs] = useState<string>('ALL');

  const spkDetails: RabPerubahanSpkDetails = useMemo(() => ({
    id: spk?.id || spkId,
    spk_no: spk?.spk_no || 'SPK',
    customer_name: spk?.customer_name || 'Pelanggan Umum',
    vehicle_plate: spk?.vehicle_plate || spk?.vehicle_number || '-',
    vehicle_number: spk?.vehicle_number || spk?.vehicle_plate || '-',
    vehicle_model: spk?.vehicle_model || '-',
    status: spk?.status || 'ACTIVE',
    created_at: spk?.created_at
  }), [spk, spkId]);

  const loadConsolidatedData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      // 1. Fetch RAB Items
      let rabItemsRaw: any[] = [];
      let rabEstId: string | null = null;

      try {
        const { data: estData } = await supabase
          .from('rab_estimations')
          .select('id')
          .eq('spk_id', spkId)
          .maybeSingle();

        if (estData?.id) {
          rabEstId = estData.id;
          const { data: estItems, error: estItemsErr } = await supabase
            .from('rab_items')
            .select(`
              *,
              product_packages:package_id ( id, name )
            `)
            .eq('rab_estimation_id', estData.id);

          if (!estItemsErr && estItems && estItems.length > 0) {
            rabItemsRaw = estItems;
          }
        }
      } catch (err) {
        console.warn('Could not query rab_estimations relation:', err);
      }

      // Fallback: direct query by spk_id if empty
      if (rabItemsRaw.length === 0) {
        try {
          const { data: directItems, error: directErr } = await supabase
            .from('rab_items')
            .select(`
              *,
              product_packages:package_id ( id, name )
            `)
            .eq('spk_id', spkId);

          if (!directErr && directItems && directItems.length > 0) {
            rabItemsRaw = directItems;
          } else {
            // Further fallback without relational join
            const { data: simpleItems } = await supabase
              .from('rab_items')
              .select('*')
              .eq(rabEstId ? 'rab_estimation_id' : 'spk_id', rabEstId || spkId);
            if (simpleItems) rabItemsRaw = simpleItems;
          }
        } catch (err) {
          console.warn('Could not query rab_items fallback:', err);
        }
      }

      // 2. Fetch Approved Change Orders & Items
      let changeOrders: any[] = [];
      try {
        changeOrders = await spkService.getChangeOrders(spkId);
      } catch (coErr) {
        console.warn('Could not fetch change_orders via spkService:', coErr);
        // Direct query fallback
        const { data: coData } = await supabase
          .from('change_orders')
          .select(`
            *,
            items:change_order_items(*)
          `)
          .eq('spk_id', spkId);
        if (coData) changeOrders = coData;
      }

      const approvedChangeOrders = (changeOrders || []).filter(
        (co: any) => String(co.status).toUpperCase() === 'APPROVED'
      );

      // 3. Fetch Realization / Fulfillment Data
      // a. Material Issues
      let materialIssues: any[] = [];
      try {
        const { data: issuesData } = await supabase
          .from('material_issues')
          .select('*')
          .eq('spk_id', spkId);
        if (issuesData) materialIssues = issuesData;
      } catch {
        // table might be empty or restricted
      }

      // b. Material Requisitions & Approved Items
      let approvedRequisitionItems: any[] = [];
      try {
        const { data: reqData } = await supabase
          .from('material_requisitions')
          .select(`
            id,
            spk_id,
            status,
            material_requisition_items (
              id,
              material_id,
              rab_item_id,
              change_order_item_id,
              material_name,
              quantity,
              issued_qty,
              status
            )
          `)
          .eq('spk_id', spkId)
          .in('status', ['APPROVED', 'COMPLETED', 'PARTIALLY_ISSUED', 'ISSUED']);

        if (reqData) {
          reqData.forEach((req: any) => {
            const reqItems = req.material_requisition_items || [];
            reqItems.forEach((mri: any) => {
              if (mri.status === 'APPROVED' || mri.status === 'ISSUED' || req.status === 'APPROVED' || req.status === 'ISSUED' || req.status === 'COMPLETED') {
                approvedRequisitionItems.push(mri);
              }
            });
          });
        }
      } catch {
        // handle requisition error
      }

      // c. SPK Borongan (Labor)
      let spkBoronganRecords: any[] = [];
      try {
        const { data: boronganData } = await supabase
          .from('spk_borongan')
          .select('*')
          .eq('spk_id', spkId)
          .in('status', ['ACTIVE', 'COMPLETED']);
        if (boronganData) spkBoronganRecords = boronganData;
      } catch {
        // handle borongan error
      }

      // d. SPK Overhead Logs (Overhead)
      let overheadLogs: any[] = [];
      try {
        const { data: ovhData } = await supabase
          .from('spk_overhead_logs')
          .select('*')
          .eq('spk_id', spkId);
        if (ovhData) overheadLogs = ovhData;
      } catch {
        // handle overhead error
      }

      // 4. Transform RAB Items into Consolidated Format
      const consolidated: ConsolidatedRabItem[] = [];

      rabItemsRaw.forEach((dbItem: any) => {
        const rawType = String(dbItem.item_type || '').toUpperCase();
        let itemType: 'MATERIAL' | 'LABOR' | 'OVERHEAD' = 'MATERIAL';
        if (rawType === 'LABOR' || Number(dbItem.labor_hours || 0) > 0 || Number(dbItem.labor_rate || 0) > 0) {
          itemType = 'LABOR';
        } else if (rawType === 'OVERHEAD' || Number(dbItem.overhead_hours || 0) > 0 || Number(dbItem.overhead_rate || 0) > 0) {
          itemType = 'OVERHEAD';
        }

        const qty = Number(dbItem.quantity || dbItem.labor_hours || (dbItem.overhead_hours ? Number(dbItem.overhead_hours) / 8 : 1)) || 0;
        let unitPrice = Number(dbItem.unit_price) || 0;
        if (unitPrice === 0 && Number(dbItem.item_total || dbItem.subtotal || 0) > 0 && qty > 0) {
          unitPrice = Number(dbItem.item_total || dbItem.subtotal) / qty;
        }
        const costPrice = Number(dbItem.cost_price || 0);
        const subtotal = Number(dbItem.subtotal || dbItem.item_total || qty * unitPrice);

        // Package detection
        let resolvedPkgName: string | null = null;
        if (dbItem.package_name) {
          resolvedPkgName = cleanPackageName(dbItem.package_name);
        } else if (dbItem.product_packages?.name) {
          resolvedPkgName = cleanPackageName(dbItem.product_packages.name);
        } else if (dbItem.notes) {
          resolvedPkgName = extractPackageFromNotes(dbItem.notes);
        }
        const isPackage = Boolean(resolvedPkgName || dbItem.package_id);

        const wbsRaw = dbItem.wbs_category || dbItem.wbs_stage || 'Pembongkaran';
        const description = dbItem.material_name || dbItem.description || 'Pekerjaan RAB';
        const unit = dbItem.unit || (itemType === 'LABOR' ? 'lot' : itemType === 'OVERHEAD' ? 'hari' : 'pcs');

        // Check Fulfillment
        let fulfillmentStatus: 'FULFILLED' | 'PENDING' = 'PENDING';
        let fulfillmentQty = 0;

        if (itemType === 'MATERIAL') {
          // Check material requisitions
          approvedRequisitionItems.forEach((mri: any) => {
            const matchesId = mri.rab_item_id && mri.rab_item_id === dbItem.id;
            const matchesMat = dbItem.material_id && mri.material_id === dbItem.material_id;
            const matchesName = normalizeText(mri.material_name || '') === normalizeText(description);

            if (matchesId || matchesMat || matchesName) {
              const q = Number(mri.issued_qty || mri.quantity || 0);
              fulfillmentQty += q;
            }
          });

          // Also check material_issues
          materialIssues.forEach((mi: any) => {
            const matchesMat = dbItem.material_id && mi.material_id === dbItem.material_id;
            if (matchesMat) {
              const q = Number(mi.quantity || 0);
              // Avoid duplicate if already tracked via requisition
              if (fulfillmentQty === 0) fulfillmentQty += q;
            }
          });

          if (fulfillmentQty >= qty && qty > 0) {
            fulfillmentStatus = 'FULFILLED';
          }
        } else if (itemType === 'LABOR') {
          const matchedBorongan = spkBoronganRecords.find((b: any) => {
            if (b.rab_item_id && b.rab_item_id === dbItem.id) return true;
            if (dbItem.material_id && b.material_id === dbItem.material_id) return true;
            if (b.task_description && normalizeText(b.task_description).includes(normalizeText(description))) return true;
            return false;
          });

          if (matchedBorongan) {
            fulfillmentStatus = 'FULFILLED';
            fulfillmentQty = qty;
          }
        } else if (itemType === 'OVERHEAD') {
          const matchedLog = overheadLogs.find((o: any) => {
            if (o.rab_item_id && o.rab_item_id === dbItem.id) return true;
            if (o.overhead_name && normalizeText(o.overhead_name).includes(normalizeText(description))) return true;
            if (o.notes && normalizeText(o.notes).includes(normalizeText(description))) return true;
            return false;
          });

          if (matchedLog) {
            fulfillmentStatus = 'FULFILLED';
            fulfillmentQty = qty;
          }
        }

        consolidated.push({
          id: dbItem.id,
          source_origin: 'RAB',
          source_label: 'RAB',
          is_package: isPackage,
          package_name: resolvedPkgName,
          item_type: itemType,
          wbs_stage: formatWbsBadge(wbsRaw),
          description,
          quantity: qty,
          unit,
          cost_price: costPrice,
          unit_price: unitPrice,
          subtotal,
          fulfillment_status: fulfillmentStatus,
          fulfillment_qty: fulfillmentQty,
          material_id: dbItem.material_id || null,
          notes: dbItem.notes || null,
        });
      });

      // 5. Transform Approved Change Order Items into Consolidated Format
      approvedChangeOrders.forEach((co: any) => {
        const coItems = co.items || [];
        const coNumber = co.co_number || `CO-${co.id.substring(0, 6).toUpperCase()}`;

        coItems.forEach((item: any) => {
          const rawType = String(item.item_type || 'MATERIAL').toUpperCase();
          const itemType: 'MATERIAL' | 'LABOR' | 'OVERHEAD' =
            rawType === 'LABOR' ? 'LABOR' : rawType === 'OVERHEAD' ? 'OVERHEAD' : 'MATERIAL';

          const qty = Number(item.quantity || 1);
          const unitPrice = Number(item.unit_price || 0);
          const costPrice = Number(item.cost_price || 0);
          const subtotal = Number(item.subtotal || qty * unitPrice);

          let resolvedPkgName: string | null = null;
          if (item.package_name) {
            resolvedPkgName = cleanPackageName(item.package_name);
          } else if (item.product_packages?.name) {
            resolvedPkgName = cleanPackageName(item.product_packages.name);
          } else if (item.notes) {
            resolvedPkgName = extractPackageFromNotes(item.notes);
          }
          const isPackage = Boolean(resolvedPkgName || item.package_source_id || item.package_id);

          const wbsRaw = item.wbs_stage || item.wbs_category || 'Pembongkaran';
          const description = item.item_name || item.description || 'Pekerjaan Amandemen';
          const unit = item.unit || (itemType === 'LABOR' ? 'lot' : itemType === 'OVERHEAD' ? 'hari' : 'pcs');

          // Fulfillment for Change Order item
          let fulfillmentStatus: 'FULFILLED' | 'PENDING' = 'PENDING';
          let fulfillmentQty = 0;

          if (itemType === 'MATERIAL') {
            approvedRequisitionItems.forEach((mri: any) => {
              const matchesCoItem = mri.change_order_item_id && mri.change_order_item_id === item.id;
              const matchesMat = item.material_id && mri.material_id === item.material_id;
              const matchesName = normalizeText(mri.material_name || '') === normalizeText(description);

              if (matchesCoItem || matchesMat || matchesName) {
                fulfillmentQty += Number(mri.issued_qty || mri.quantity || 0);
              }
            });

            materialIssues.forEach((mi: any) => {
              const matchesCo = mi.change_order_id && mi.change_order_id === co.id;
              const matchesMat = item.material_id && mi.material_id === item.material_id;
              if (matchesCo || matchesMat) {
                if (fulfillmentQty === 0) fulfillmentQty += Number(mi.quantity || 0);
              }
            });

            if (fulfillmentQty >= qty && qty > 0) {
              fulfillmentStatus = 'FULFILLED';
            }
          } else if (itemType === 'LABOR') {
            const matchedBorongan = spkBoronganRecords.find((b: any) => {
              if (b.change_order_item_id && b.change_order_item_id === item.id) return true;
              if (item.material_id && b.material_id === item.material_id) return true;
              if (b.task_description && normalizeText(b.task_description).includes(normalizeText(description))) return true;
              return false;
            });

            if (matchedBorongan) {
              fulfillmentStatus = 'FULFILLED';
              fulfillmentQty = qty;
            }
          } else if (itemType === 'OVERHEAD') {
            const matchedLog = overheadLogs.find((o: any) => {
              if (o.change_order_item_id && o.change_order_item_id === item.id) return true;
              if (o.overhead_name && normalizeText(o.overhead_name).includes(normalizeText(description))) return true;
              return false;
            });

            if (matchedLog) {
              fulfillmentStatus = 'FULFILLED';
              fulfillmentQty = qty;
            }
          }

          consolidated.push({
            id: item.id,
            source_origin: 'CHANGE_ORDER',
            source_label: `Change Order (${coNumber})`,
            is_package: isPackage,
            package_name: resolvedPkgName,
            item_type: itemType,
            wbs_stage: formatWbsBadge(wbsRaw),
            description,
            quantity: qty,
            unit,
            cost_price: costPrice,
            unit_price: unitPrice,
            subtotal,
            fulfillment_status: fulfillmentStatus,
            fulfillment_qty: fulfillmentQty,
            material_id: item.material_id || null,
            change_order_id: co.id,
            notes: item.notes || null,
          });
        });
      });

      // Sort items by canonical WBS stage ascending, then description
      consolidated.sort((a, b) => {
        const wA = getWbsWeight(a.wbs_stage);
        const wB = getWbsWeight(b.wbs_stage);
        if (wA !== wB) return wA - wB;
        return a.description.localeCompare(b.description);
      });

      setItems(consolidated);
    } catch (err: any) {
      console.error('Error fetching consolidated RAB Perubahan data:', err);
      setError(err.message || 'Gagal memuat data konsolidasi RAB Perubahan.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [spkId]);

  useEffect(() => {
    loadConsolidatedData();
  }, [loadConsolidatedData]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Type filter
      if (filterType !== 'ALL' && item.item_type !== filterType) {
        return false;
      }
      // Origin filter
      if (filterOrigin !== 'ALL' && item.source_origin !== filterOrigin) {
        return false;
      }
      // Fulfillment status filter
      if (filterStatus !== 'ALL' && item.fulfillment_status !== filterStatus) {
        return false;
      }
      // WBS filter
      if (filterWbs !== 'ALL' && !item.wbs_stage.toLowerCase().includes(filterWbs.toLowerCase())) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const q = normalizeText(searchTerm);
        const matchDesc = normalizeText(item.description).includes(q);
        const matchPkg = item.package_name && normalizeText(item.package_name).includes(q);
        const matchWbs = normalizeText(item.wbs_stage).includes(q);
        const matchSource = normalizeText(item.source_label).includes(q);
        if (!matchDesc && !matchPkg && !matchWbs && !matchSource) {
          return false;
        }
      }
      return true;
    });
  }, [items, filterType, filterOrigin, filterStatus, filterWbs, searchTerm]);

  // Overall Financial & Fulfillment Metrics
  const totals = useMemo(() => {
    return computeRabPerubahanTotals(items);
  }, [items]);

  const filteredTotals = useMemo(() => {
    return computeRabPerubahanTotals(filteredItems);
  }, [filteredItems]);

  const handleExportExcel = () => {
    exportRabPerubahanToExcel(spkDetails, items, totals);
  };

  const handlePrintPdf = () => {
    printRabPerubahanReport(spkDetails, items, totals);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterType('ALL');
    setFilterOrigin('ALL');
    setFilterStatus('ALL');
    setFilterWbs('ALL');
  };

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-xl p-12 text-center">
        <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
        <h3 className="font-semibold text-text text-base">Memuat Konsolidasi RAB Perubahan...</h3>
        <p className="text-text-muted text-xs mt-1">
          Menghubungkan item kontrak awal, approved change orders, dan status penyerapan gudang
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-status-danger/10 border border-status-danger/30 rounded-xl p-6 text-center">
        <AlertCircle className="w-8 h-8 text-status-danger mx-auto mb-2" />
        <h4 className="font-bold text-status-danger text-sm">Gagal Menampilkan RAB Perubahan</h4>
        <p className="text-text-muted text-xs mt-1 mb-4">{error}</p>
        <button
          onClick={() => loadConsolidatedData()}
          className="px-4 py-2 bg-surface hover:bg-surface-hover text-text border border-border rounded-lg text-xs font-semibold cursor-pointer transition"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-surface via-surface to-surface-hover border border-border rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold font-mono uppercase tracking-wide">
                RAB Perubahan & Realisasi
              </span>
              <span className="text-xs text-text-muted">
                SPK: <strong className="text-primary font-mono">{spkDetails.spk_no}</strong> • {spkDetails.vehicle_plate} ({spkDetails.customer_name})
              </span>
            </div>
            <h2 className="text-lg font-bold text-text mt-1">
              Konsolidasi Estimasi Biaya & Audit Realisasi Lapangan
            </h2>
            <p className="text-xs text-text-muted">
              Gabungan seluruh item kontrak awal dan amandemen berstatus disetujui (Approved) beserta verifikasi fisik material, upah borongan, dan overhead.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="btn-refresh-rab-perubahan"
              type="button"
              onClick={() => loadConsolidatedData(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 bg-surface hover:bg-surface-active text-text-muted hover:text-text border border-border rounded-lg text-xs font-semibold cursor-pointer transition disabled:opacity-50"
              title="Perbarui Data Realisasi"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-primary' : ''}`} />
              <span>{refreshing ? 'Memperbarui...' : 'Refresh'}</span>
            </button>

            <button
              id="btn-export-excel-rab-perubahan"
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition shadow-sm"
              title="Unduh Tabel Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export XLSX</span>
            </button>

            <button
              id="btn-print-pdf-rab-perubahan"
              type="button"
              onClick={handlePrintPdf}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary-hover text-background font-bold rounded-lg text-xs cursor-pointer transition shadow-sm"
              title="Cetak Dokumen Resmi / Simpan PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Export PDF / Cetak</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Financial & Absorption Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Revenue */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center justify-between text-text-muted mb-1">
            <span className="text-xs font-medium">Total Quotation Jual (Revisi)</span>
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <div className="text-xl font-bold text-text font-mono">
            Rp {totals.totalRevenue.toLocaleString('id-ID')}
          </div>
          <div className="text-xs text-text-muted mt-1">
            {items.length} total item pekerjaan
          </div>
        </div>

        {/* Card 2: Total Cost */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center justify-between text-text-muted mb-1">
            <span className="text-xs font-medium">Total Modal HPP</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-text font-mono">
            Rp {totals.totalCogs.toLocaleString('id-ID')}
          </div>
          <div className="text-xs text-text-muted mt-1">
            Akumulasi modal riil 3 unsur (M + L + O)
          </div>
        </div>

        {/* Card 3: Total Profit & Margin */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center justify-between text-text-muted mb-1">
            <span className="text-xs font-medium">Total Estimasi Profit</span>
            <TrendingUp className={`w-4 h-4 ${totals.totalProfit >= 0 ? 'text-emerald-400' : 'text-status-danger'}`} />
          </div>
          <div className={`text-xl font-bold font-mono ${totals.totalProfit >= 0 ? 'text-emerald-400' : 'text-status-danger'}`}>
            Rp {totals.totalProfit.toLocaleString('id-ID')}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400/90 mt-1 font-semibold">
            <span>Margin Bersih: {totals.marginPercentage}%</span>
          </div>
        </div>

        {/* Card 4: Warehouse Material Fulfillment Progress */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center justify-between text-text-muted mb-1">
            <span className="text-xs font-medium">Serapan Material Gudang</span>
            <PackageCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-text font-mono">
            {totals.materialFulfilledCount} <span className="text-xs font-normal text-text-muted">/ {totals.materialTotalCount} Item</span>
          </div>
          <div className="mt-2">
            <div className="w-full h-1.5 bg-surface-hover rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${totals.materialFulfilledPercentage}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-text-muted mt-1">
              <span>{totals.materialFulfilledPercentage}% Terpenuhi</span>
              <span>{totals.materialTotalCount - totals.materialFulfilledCount} Belum Diambil</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4-Pillar Segregated Profit Breakdown Banner */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <h4 className="text-xs font-bold text-text uppercase tracking-wider">
              Rincian Pemisahan Profit 4 Pilar (Segregated Margins)
            </h4>
          </div>
          <span className="text-[11px] text-text-muted font-mono">
            Akumulasi Kontrak Awal + Approved Amandemen
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Pillar 1: Package Profit */}
          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                📦 Paket Barang Jadi
              </span>
              <span className="text-[10px] font-mono text-amber-400/80">Paket Assembly</span>
            </div>
            <div className="text-base font-bold text-text font-mono mt-1">
              Rp {totals.packageProfit.toLocaleString('id-ID')}
            </div>
            <div className="text-[11px] text-text-muted flex justify-between mt-1">
              <span>Jual: Rp {totals.packageRevenue.toLocaleString('id-ID')}</span>
              <span>Modal: Rp {totals.packageCost.toLocaleString('id-ID')}</span>
            </div>
          </div>

          {/* Pillar 2: Granular Material Profit */}
          <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1">
                🧱 Material Granular
              </span>
              <span className="text-[10px] font-mono text-cyan-400/80">Material Lepas</span>
            </div>
            <div className="text-base font-bold text-text font-mono mt-1">
              Rp {totals.granularMaterialProfit.toLocaleString('id-ID')}
            </div>
            <div className="text-[11px] text-text-muted flex justify-between mt-1">
              <span>Jual: Rp {totals.granularMaterialRevenue.toLocaleString('id-ID')}</span>
              <span>Modal: Rp {totals.granularMaterialCost.toLocaleString('id-ID')}</span>
            </div>
          </div>

          {/* Pillar 3: Labor Profit */}
          <div className="p-3 rounded-lg bg-sky-500/5 border border-sky-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-sky-400 flex items-center gap-1">
                🔧 Labor (Jasa Mandor)
              </span>
              <span className="text-[10px] font-mono text-sky-400/80">Upah Borongan</span>
            </div>
            <div className="text-base font-bold text-text font-mono mt-1">
              Rp {totals.laborProfit.toLocaleString('id-ID')}
            </div>
            <div className="text-[11px] text-text-muted flex justify-between mt-1">
              <span>Jual: Rp {totals.laborRevenue.toLocaleString('id-ID')}</span>
              <span>Modal: Rp {totals.laborCost.toLocaleString('id-ID')}</span>
            </div>
          </div>

          {/* Pillar 4: Overhead Profit */}
          <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-400 flex items-center gap-1">
                ⚡ Overhead Pabrik (FOH)
              </span>
              <span className="text-[10px] font-mono text-purple-400/80">FOH Riil</span>
            </div>
            <div className="text-base font-bold text-text font-mono mt-1">
              Rp {totals.overheadProfit.toLocaleString('id-ID')}
            </div>
            <div className="text-[11px] text-text-muted flex justify-between mt-1">
              <span>Jual: Rp {totals.overheadRevenue.toLocaleString('id-ID')}</span>
              <span>Modal: Rp {totals.overheadCost.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-rab-perubahan"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari deskripsi item, nama paket, WBS, atau no amandemen..."
              className="w-full pl-9 pr-3 py-1.5 bg-background border border-border rounded-lg text-xs text-text placeholder-text-muted focus:outline-none focus:border-primary transition"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Category */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-text-muted" />
              <select
                id="filter-type-rab-perubahan"
                aria-label="Filter Tipe Item"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-text focus:outline-none focus:border-primary cursor-pointer transition"
              >
                <option value="ALL">Semua Tipe</option>
                <option value="MATERIAL">Material</option>
                <option value="LABOR">Labor (Jasa)</option>
                <option value="OVERHEAD">Overhead (FOH)</option>
              </select>
            </div>

            {/* Filter Origin */}
            <select
              id="filter-origin-rab-perubahan"
              aria-label="Filter Asal Input"
              value={filterOrigin}
              onChange={(e) => setFilterOrigin(e.target.value as any)}
              className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-text focus:outline-none focus:border-primary cursor-pointer transition"
            >
              <option value="ALL">Semua Asal</option>
              <option value="RAB">RAB (Kontrak Awal)</option>
              <option value="CHANGE_ORDER">Change Order</option>
            </select>

            {/* Filter Fulfillment */}
            <select
              id="filter-status-rab-perubahan"
              aria-label="Filter Status Realisasi"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-text focus:outline-none focus:border-primary cursor-pointer transition"
            >
              <option value="ALL">Semua Realisasi</option>
              <option value="FULFILLED">✅ Sudah Diambil / Terbit</option>
              <option value="PENDING">⏳ Belum Diambil / Terbit</option>
            </select>

            {/* Filter WBS */}
            <select
              id="filter-wbs-rab-perubahan"
              aria-label="Filter Tahapan WBS"
              value={filterWbs}
              onChange={(e) => setFilterWbs(e.target.value)}
              className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-text focus:outline-none focus:border-primary cursor-pointer transition"
            >
              <option value="ALL">Semua WBS</option>
              <option value="WBS 1">WBS 1: Pembongkaran</option>
              <option value="WBS 2">WBS 2: Sasis/Rangka</option>
              <option value="WBS 3">WBS 3: Dinding/Fabrikasi</option>
              <option value="WBS 4">WBS 4: Pengecatan</option>
              <option value="WBS 5">WBS 5: Kelistrikan/Hidrolik</option>
            </select>

            {(searchTerm || filterType !== 'ALL' || filterOrigin !== 'ALL' || filterStatus !== 'ALL' || filterWbs !== 'ALL') && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-primary hover:underline cursor-pointer px-1 py-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-text-muted mt-2 pt-2 border-t border-border/50">
          <span>
            Menampilkan <strong className="text-text font-mono">{filteredItems.length}</strong> dari <strong className="text-text font-mono">{items.length}</strong> item konsolidasi
          </span>
          {filteredItems.length !== items.length && (
            <span className="font-mono text-primary">
              Subtotal Filter: Rp {filteredTotals.totalRevenue.toLocaleString('id-ID')}
            </span>
          )}
        </div>
      </div>

      {/* Consolidated Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-text">
            <thead className="bg-surface-hover text-text-muted font-mono uppercase text-[11px] border-b border-border">
              <tr>
                <th className="px-4 py-3 text-center w-10">No</th>
                <th className="px-4 py-3">Sumber Asal</th>
                <th className="px-4 py-3">Metode Entry</th>
                <th className="px-4 py-3">Tipe</th>
                <th className="px-4 py-3">Tahapan WBS</th>
                <th className="px-4 py-3 min-w-[200px]">Deskripsi Pekerjaan / Barang</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">HPP Modal</th>
                <th className="px-4 py-3 text-right">Harga Jual</th>
                <th className="px-4 py-3 text-right">Subtotal Jual</th>
                <th className="px-4 py-3 text-center">Status Realisasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-text-muted">
                    <p className="text-sm font-medium">Tidak ada item yang sesuai dengan filter.</p>
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="mt-2 text-xs text-primary hover:underline cursor-pointer"
                    >
                      Reset filter pencarian
                    </button>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const isCo = item.source_origin === 'CHANGE_ORDER';
                  const wbsClass = getWbsBadgeClass(item.wbs_stage);

                  // Realization badge
                  let realizationBadge = null;
                  if (item.fulfillment_status === 'FULFILLED') {
                    if (item.item_type === 'MATERIAL') {
                      realizationBadge = (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Sudah Diambil</span>
                        </span>
                      );
                    } else if (item.item_type === 'LABOR') {
                      realizationBadge = (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Terbit SPK-B</span>
                        </span>
                      );
                    } else {
                      realizationBadge = (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Dicatat FOH</span>
                        </span>
                      );
                    }
                  } else {
                    if (item.item_type === 'MATERIAL') {
                      realizationBadge = (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>Belum Diambil</span>
                        </span>
                      );
                    } else if (item.item_type === 'LABOR') {
                      realizationBadge = (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/30">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Belum Terbit</span>
                        </span>
                      );
                    } else {
                      realizationBadge = (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/30">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Belum Dicatat</span>
                        </span>
                      );
                    }
                  }

                  return (
                    <tr key={item.id + '_' + idx} className="hover:bg-surface-hover/50 transition">
                      {/* No */}
                      <td className="px-4 py-3 text-center font-mono text-text-muted">
                        {idx + 1}
                      </td>

                      {/* Sumber Asal */}
                      <td className="px-4 py-3">
                        {isCo ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/30 font-mono">
                            🔄 Change Order
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30 font-mono">
                            📋 RAB
                          </span>
                        )}
                        {isCo && (
                          <div className="text-[10px] text-text-muted font-mono mt-0.5">
                            {item.source_label.replace('Change Order', '').trim() || ''}
                          </div>
                        )}
                      </td>

                      {/* Metode Entry */}
                      <td className="px-4 py-3">
                        {item.is_package ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30 max-w-[160px] truncate" title={`Paket: ${item.package_name || 'Assembly'}`}>
                            📦 {item.package_name ? `Paket: ${item.package_name}` : 'Paket'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-500/10 text-slate-400 border border-slate-500/30">
                            📋 Granular
                          </span>
                        )}
                      </td>

                      {/* Kategori Tipe */}
                      <td className="px-4 py-3">
                        {item.item_type === 'MATERIAL' && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                            MATERIAL
                          </span>
                        )}
                        {item.item_type === 'LABOR' && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-sky-500/10 text-sky-400 border border-sky-500/30">
                            LABOR
                          </span>
                        )}
                        {item.item_type === 'OVERHEAD' && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/30">
                            OVERHEAD
                          </span>
                        )}
                      </td>

                      {/* Alokasi WBS */}
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${wbsClass}`}>
                          {item.wbs_stage}
                        </span>
                      </td>

                      {/* Deskripsi */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-text">{item.description}</div>
                        {item.notes && (
                          <div className="text-[10px] text-text-muted italic mt-0.5">
                            {item.notes}
                          </div>
                        )}
                      </td>

                      {/* Qty & Satuan */}
                      <td className="px-4 py-3 text-right font-mono font-medium whitespace-nowrap">
                        {item.quantity} <span className="text-text-muted text-[10px]">{item.unit}</span>
                      </td>

                      {/* HPP Modal */}
                      <td className="px-4 py-3 text-right font-mono text-text-muted whitespace-nowrap">
                        Rp {item.cost_price.toLocaleString('id-ID')}
                      </td>

                      {/* Harga Jual */}
                      <td className="px-4 py-3 text-right font-mono font-medium whitespace-nowrap">
                        Rp {item.unit_price.toLocaleString('id-ID')}
                      </td>

                      {/* Subtotal Jual */}
                      <td className="px-4 py-3 text-right font-mono font-bold text-primary whitespace-nowrap">
                        Rp {item.subtotal.toLocaleString('id-ID')}
                      </td>

                      {/* Realisasi / Gudang */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {realizationBadge}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Table Footer Summary */}
            <tfoot className="bg-surface-hover/80 text-text font-semibold border-t-2 border-border">
              <tr>
                <td colSpan={6} className="px-4 py-3 text-right font-bold text-text-muted uppercase tracking-wider text-[11px]">
                  Total Rangkuman (Semua Item):
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-text">
                  {totals.materialTotalCount + (items.filter(i => i.item_type !== 'MATERIAL').length)} Items
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-text-muted">
                  Rp {totals.totalCogs.toLocaleString('id-ID')}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-text-muted">
                  -
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-primary text-sm">
                  Rp {totals.totalRevenue.toLocaleString('id-ID')}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    Laba: Rp {totals.totalProfit.toLocaleString('id-ID')}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
