import React from 'react';
import { Filter, Layers, CheckCircle2 } from 'lucide-react';

export interface SpkFilterItem {
  spkId: string;
  spkNo: string;
  customerName: string;
  count: number;
}

interface SpkFilterListBoxProps {
  items: SpkFilterItem[];
  totalPendingCount: number;
  selectedSpk: string;
  onSelectSpk: (spkNo: string) => void;
}

export const SpkFilterListBox: React.FC<SpkFilterListBoxProps> = ({
  items,
  totalPendingCount,
  selectedSpk,
  onSelectSpk,
}) => {
  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border bg-surface-hover flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-text font-display">Filter Berdasarkan SPK</h3>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
          {items.length} SPK Aktif
        </span>
      </div>

      {/* List Container */}
      <div className="p-3 max-h-[550px] overflow-y-auto space-y-2 scrollbar-thin">
        {/* Item 1: Semua SPK */}
        <div
          onClick={() => onSelectSpk('ALL')}
          className={`cursor-pointer p-3 rounded-lg border transition flex flex-col gap-1 ${
            selectedSpk === 'ALL'
              ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
              : 'border-border bg-background hover:bg-surface-hover/80 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className={`w-4 h-4 ${selectedSpk === 'ALL' ? 'text-primary' : 'text-text-muted'}`} />
              <span className={`font-semibold text-sm ${selectedSpk === 'ALL' ? 'text-text font-bold' : 'text-text'}`}>
                Semua SPK
              </span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                selectedSpk === 'ALL'
                  ? 'bg-primary text-white'
                  : 'bg-surface border border-border text-text-muted'
              }`}
            >
              {totalPendingCount} Pending
            </span>
          </div>
          <p className="text-xs text-text-muted pl-6">
            Tampilkan seluruh antrean permintaan mandor
          </p>
        </div>

        {/* Separator / Item 2..N */}
        {items.length > 0 ? (
          items.map((spk) => {
            const isSelected = selectedSpk === spk.spkNo || selectedSpk === spk.spkId;
            return (
              <div
                key={spk.spkNo}
                onClick={() => onSelectSpk(spk.spkNo)}
                className={`cursor-pointer p-3 rounded-lg border transition flex flex-col gap-1 ${
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                    : 'border-border bg-background hover:bg-surface-hover/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-mono font-bold text-sm ${isSelected ? 'text-primary' : 'text-text'}`}>
                    {spk.spkNo}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-mono font-semibold ${
                      isSelected
                        ? 'bg-status-warning text-white'
                        : 'bg-status-warning/15 text-status-warning border border-status-warning/30'
                    }`}
                  >
                    {spk.count} Pending
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span className="truncate max-w-[200px]" title={spk.customerName}>
                    {spk.customerName || 'Pelanggan Umum'}
                  </span>
                  {isSelected && (
                    <span className="flex items-center gap-1 text-primary text-[11px] font-medium shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                      Aktif
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-6 text-center text-text-muted text-xs">
            Tidak ada antrean SPK aktif saat ini.
          </div>
        )}
      </div>
    </div>
  );
};
