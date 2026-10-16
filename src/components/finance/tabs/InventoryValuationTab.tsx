import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, 
  Download, 
  RefreshCw, 
  AlertTriangle,
  ArrowUpDown,
  AlertCircle
} from 'lucide-react';
import { financialReportsService } from '../../../services/financialReportsService';
import type { InventoryValuation } from '../../../types/financialReports';

interface InventoryValuationTabProps {
  globalSearch?: string;
  refreshTrigger?: number;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

export const InventoryValuationTab: React.FC<InventoryValuationTabProps> = ({
  globalSearch = '',
  refreshTrigger,
}) => {
  const [data, setData] = useState<InventoryValuation[]>([]);
  const [category, setCategory] = useState<string>('ALL');
  const [localSearch, setLocalSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<'valuation' | 'stock' | 'name'>('valuation');
  const [sortAsc, setSortAsc] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const activeSearch = localSearch.trim() || globalSearch.trim();
      const result = await financialReportsService.getInventoryValuation({
        category: category !== 'ALL' ? category : undefined,
        searchQuery: activeSearch || undefined,
        lowStockOnly: lowStockOnly,
      });
      setData(result);
    } catch (err: any) {
      console.error('InventoryValuationTab fetch error:', err);
      setError(err.message || 'Gagal memuat valuasi persediaan gudang.');
    } finally {
      setLoading(false);
    }
  }, [category, localSearch, globalSearch, lowStockOnly]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);

  // Extract unique categories for filter dropdown
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    data.forEach(item => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats).sort();
  }, [data]);

  // Sorting
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let diff = 0;
      if (sortBy === 'valuation') {
        diff = a.total_inventory_valuation_hpp - b.total_inventory_valuation_hpp;
      } else if (sortBy === 'stock') {
        diff = a.current_stock - b.current_stock;
      } else if (sortBy === 'name') {
        diff = a.material_name.localeCompare(b.material_name);
      }
      return sortAsc ? diff : -diff;
    });
  }, [data, sortBy, sortAsc]);

  const toggleSort = (column: 'valuation' | 'stock' | 'name') => {
    if (sortBy === column) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(column);
      setSortAsc(false);
    }
  };

  const handleExportCsv = () => {
    if (!sortedData.length) return;
    const headers = [
      'ID Material',
      'Nama Material',
      'Kategori',
      'Stok Fisik',
      'Satuan',
      'HPP Satuan (Rp)',
      'Harga Jual Satuan (Rp)',
      'Total HPP Aset (Rp)',
      'Potensi Nilai Pasar (Rp)',
    ].join(',');

    const rows = sortedData.map(row => [
      `"${row.material_id}"`,
      `"${row.material_name}"`,
      `"${row.category || '-'}"`,
      row.current_stock,
      `"${row.unit}"`,
      row.cost_price_hpp,
      row.standard_selling_price,
      row.total_inventory_valuation_hpp,
      row.total_inventory_market_value,
    ].join(',')).join('\n');

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + `${headers}\n${rows}`;
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `Valuasi_Persediaan_Gudang_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Aggregates
  const totalStockCount = sortedData.reduce((acc, curr) => acc + curr.current_stock, 0);
  const totalValuationHpp = sortedData.reduce((acc, curr) => acc + curr.total_inventory_valuation_hpp, 0);
  const totalMarketValue = sortedData.reduce((acc, curr) => acc + curr.total_inventory_market_value, 0);
  const potentialProfit = totalMarketValue - totalValuationHpp;

  return (
    <div className="space-y-4">
      {/* Filters Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-surface/60 p-4 rounded-xl border border-border">
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Dropdown */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-background/80 border border-border rounded-lg px-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary"
          >
            <option value="ALL">Semua Kategori Material</option>
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Cari nama material / kode..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-background/80 border border-border rounded-lg pl-9 pr-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary"
            />
          </div>

          {/* Low Stock Toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm text-text select-none bg-background/60 px-3 py-1.5 rounded-lg border border-border hover:bg-surface-hover transition">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="accent-primary rounded"
            />
            <span className="text-amber-400 font-medium">Stok Kritis (≤ 5)</span>
          </label>
        </div>

        <div className="flex items-center gap-2 self-end lg:self-auto">
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-hover hover:bg-surface-active text-text rounded-lg border border-border text-sm font-medium transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
          <button
            onClick={handleExportCsv}
            disabled={!sortedData.length}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 bg-status-danger/10 border border-status-danger/30 rounded-xl text-status-danger text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-surface-hover/80 text-text-muted font-mono uppercase text-[11px] border-b border-border">
              <tr>
                <th 
                  className="py-3 px-4 cursor-pointer hover:text-text transition"
                  onClick={() => toggleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    <span>Nama Material / Barang</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Kategori</th>
                <th 
                  className="py-3 px-4 text-right cursor-pointer hover:text-text transition"
                  onClick={() => toggleSort('stock')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Stok Fisik</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Satuan</th>
                <th className="py-3 px-4 text-right">HPP Satuan</th>
                <th className="py-3 px-4 text-right">Harga Jual Std</th>
                <th 
                  className="py-3 px-4 text-right cursor-pointer hover:text-text transition"
                  onClick={() => toggleSort('valuation')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Total Nilai HPP (Aset)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Potensi Nilai Pasar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-text-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                      <span>Memuat valuasi persediaan material...</span>
                    </div>
                  </td>
                </tr>
              ) : sortedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-text-muted">
                    Tidak ada material yang sesuai kriteria pencarian/kategori.
                  </td>
                </tr>
              ) : (
                sortedData.map((row) => {
                  const isLow = row.current_stock <= 5;
                  return (
                    <tr 
                      key={row.material_id} 
                      className={`hover:bg-surface-hover/50 transition-colors ${
                        isLow ? 'bg-amber-950/10' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-text">
                          {row.material_name}
                        </div>
                        <div className="text-[10px] font-mono text-text-muted">
                          ID: {row.material_id.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs px-2 py-0.5 rounded bg-surface-hover border border-border text-text-muted">
                          {row.category || 'General'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 font-mono font-bold">
                          {isLow && <AlertCircle className="w-3.5 h-3.5 text-amber-400" />}
                          <span className={isLow ? 'text-amber-400' : 'text-text'}>
                            {row.current_stock}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-xs text-text-muted">
                        {row.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-text-muted">
                        {formatCurrency(row.cost_price_hpp)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-text-muted">
                        {formatCurrency(row.standard_selling_price)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-text">
                        {formatCurrency(row.total_inventory_valuation_hpp)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-secondary">
                        {formatCurrency(row.total_inventory_market_value)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer */}
            {sortedData.length > 0 && (
              <tfoot className="bg-surface-hover/90 font-mono font-bold text-xs border-t-2 border-border">
                <tr>
                  <td colSpan={2} className="py-3 px-4 text-text uppercase">
                    Total Valuasi Aset ({sortedData.length} Jenis Item):
                  </td>
                  <td className="py-3 px-4 text-right text-text">
                    {totalStockCount} Unit
                  </td>
                  <td colSpan={3} className="py-3 px-4 text-right text-text-muted">
                    Potensi Margin Pasar: {formatCurrency(potentialProfit)}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-400 text-sm">
                    {formatCurrency(totalValuationHpp)}
                  </td>
                  <td className="py-3 px-4 text-right text-secondary text-sm">
                    {formatCurrency(totalMarketValue)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
