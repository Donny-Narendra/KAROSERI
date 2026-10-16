import React, { useState, useEffect } from 'react';
import { PackageCheck, Clock, ArrowDownRight, Layers, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export interface StockAuditItem {
  id: string;
  materialName: string;
  unit: string;
  spkNo: string;
  wbsCategory?: string;
  stockBefore: number;
  quantityApproved: number;
  stockAfter: number;
  approvedAt: string;
  issuedByName?: string;
  issuedByRole?: string;
  auditNotes?: string;
  isNew?: boolean;
}

interface RecentApprovedMaterialsProps {
  refreshKey?: number;
  recentApprovals?: StockAuditItem[];
}

export const RecentApprovedMaterials: React.FC<RecentApprovedMaterialsProps> = ({
  refreshKey = 0,
  recentApprovals = []
}) => {
  const [dbApprovals, setDbApprovals] = useState<StockAuditItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecentApprovals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select(`
          id,
          quantity_issued,
          stock_before,
          stock_after,
          issued_at,
          issued_by_name,
          issued_by_role,
          audit_notes,
          materials ( id, name, unit, current_stock ),
          spk ( id, spk_no, customer_name )
        `)
        .order('issued_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (data) {
        const mapped: StockAuditItem[] = data.map((tx: any) => {
          const qty = Number(tx.quantity_issued || 0);
          const currentMatStock = Number(tx.materials?.current_stock || 0);
          
          const rawStockBefore = tx.stock_before !== null && tx.stock_before !== undefined
            ? Number(tx.stock_before)
            : null;

          const rawStockAfter = tx.stock_after !== null && tx.stock_after !== undefined
            ? Number(tx.stock_after)
            : null;

          // Snapshot dianggap valid jika tercatat dan bukan dummy default 0 untuk kedua kolom saat stok aktual atau qty > 0
          const hasValidSnapshot = rawStockBefore !== null && rawStockAfter !== null &&
            !(rawStockBefore === 0 && rawStockAfter === 0 && (currentMatStock > 0 || qty > 0));

          let stockBefore: number;
          let stockAfter: number;

          if (hasValidSnapshot) {
            stockBefore = rawStockBefore!;
            stockAfter = rawStockAfter!;
          } else {
            // Fallback cerdas: Sisa stok adalah stok saat ini, stok sebelum adalah sisa stok + kuantitas yang dikeluarkan
            stockAfter = currentMatStock;
            stockBefore = currentMatStock + qty;
          }

          return {
            id: tx.id,
            materialName: tx.materials?.name || 'Material Non-Stok',
            unit: tx.materials?.unit || 'pcs',
            spkNo: tx.spk?.spk_no || 'Umum',
            wbsCategory: undefined,
            stockBefore,
            quantityApproved: qty,
            stockAfter,
            approvedAt: tx.issued_at,
            issuedByName: tx.issued_by_name,
            issuedByRole: tx.issued_by_role,
            auditNotes: tx.audit_notes
          };
        });
        setDbApprovals(mapped);
      }
    } catch (err) {
      console.error('Error fetching recent approved materials:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentApprovals();
  }, [refreshKey]);

  // Combine real-time in-memory approvals with persistent DB records (deduplicating by ID)
  const combinedItems = React.useMemo(() => {
    const list: StockAuditItem[] = [];
    const seenIds = new Set<string>();

    // Put real-time recentApprovals first
    for (const item of recentApprovals) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        list.push(item);
      }
    }

    // Append database records
    for (const item of dbApprovals) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        list.push(item);
      }
    }

    return list.slice(0, 15);
  }, [recentApprovals, dbApprovals]);

  const formatTime = (isoString: string, isNew?: boolean) => {
    if (isNew) return 'Baru saja';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '-';
    }
  };

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden shadow-sm">
      {/* Panel Header */}
      <div className="px-5 py-4 border-b border-border bg-surface-hover flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PackageCheck className="w-5 h-5 text-primary shrink-0" />
          <h3 className="font-bold text-text font-display">
            Riwayat Approval &amp; Stok
          </h3>
        </div>
        <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
          {combinedItems.length} Item
        </span>
      </div>

      {/* List Container */}
      <div className="p-3">
        {loading && combinedItems.length === 0 ? (
          <div className="py-8 text-center text-text-muted text-xs flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span>Memuat audit pergerakan stok...</span>
          </div>
        ) : combinedItems.length === 0 ? (
          <div className="py-8 px-4 text-center text-text-muted text-xs space-y-2">
            <PackageCheck className="w-8 h-8 text-text-muted/40 mx-auto" />
            <p className="font-medium text-text">Belum ada aktivitas approval</p>
            <p className="text-text-muted/80 leading-relaxed">
              Belum ada material yang diapprove baru-baru ini. Material yang disetujui akan tampil di sini beserta pergerakan stoknya.
            </p>
          </div>
        ) : (
          <div className="max-h-[340px] overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
            {combinedItems.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-lg border transition-all duration-300 ${
                  item.isNew
                    ? 'bg-primary/10 border-primary/40 shadow-sm ring-1 ring-primary/30'
                    : 'bg-background/80 hover:bg-surface-hover/60 border-border/70'
                }`}
              >
                {/* Header: Nama Material & Badge SPK */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-text truncate" title={item.materialName}>
                      {item.materialName}
                    </p>
                    <p className="text-[11px] text-text-muted">
                      Satuan: <span className="font-mono text-text">{item.unit}</span>
                      {item.wbsCategory && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-text-muted/80 bg-surface px-1.5 py-0.2 rounded border border-border">
                          <Layers className="w-2.5 h-2.5" />
                          {item.wbsCategory}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="font-mono text-xs font-semibold text-primary px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">
                      {item.spkNo}
                    </span>
                  </div>
                </div>

                {/* 3-Kolom Grid: Dampak Stok Fisik */}
                <div className="grid grid-cols-3 gap-2 py-1.5 px-2 bg-surface/80 rounded border border-border/50 text-center text-xs">
                  {/* Kolom 1: Stok Sebelum */}
                  <div className="flex flex-col">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider font-mono">
                      Sebelum
                    </span>
                    <span className="font-mono font-medium text-text-muted mt-0.5">
                      {item.stockBefore.toLocaleString()}
                    </span>
                  </div>

                  {/* Kolom 2: Disetujui (Keluar) */}
                  <div className="flex flex-col border-x border-border/50 px-1">
                    <span className="text-[10px] text-status-danger uppercase tracking-wider font-mono flex items-center justify-center gap-0.5">
                      <ArrowDownRight className="w-2.5 h-2.5" />
                      Disetujui
                    </span>
                    <span className="font-mono font-bold text-status-danger mt-0.5">
                      -{item.quantityApproved.toLocaleString()}
                    </span>
                  </div>

                  {/* Kolom 3: Sisa Stok Fisik */}
                  <div className="flex flex-col">
                    <span className="text-[10px] text-status-success uppercase tracking-wider font-mono">
                      Sisa Stok
                    </span>
                    <span className="font-mono font-bold text-status-success mt-0.5">
                      {item.stockAfter.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Timestamp & Eksekutor Audit */}
                <div className="mt-2 flex items-center justify-between text-[11px] text-text-muted">
                  <div className="flex items-center gap-1.5 font-mono text-[10px]">
                    <Clock className="w-3 h-3 text-text-muted/70" />
                    <span>{formatTime(item.approvedAt, item.isNew)}</span>
                    {item.issuedByName && (
                      <span className="text-text-muted/80 ml-1">
                        • {item.issuedByName}
                        {item.issuedByRole === 'service_advisor' && (
                          <span className="ml-1 text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 py-0.2 rounded font-semibold">
                            SA Backup
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  {item.isNew && (
                    <span className="text-[10px] font-bold text-primary animate-pulse">
                      • Baru Saja Diapprove
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
