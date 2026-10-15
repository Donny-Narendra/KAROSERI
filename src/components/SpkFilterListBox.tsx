import React, { useState, useMemo } from 'react';
import { Filter, Layers, CheckCircle2, Search, X, Wrench } from 'lucide-react';

export interface SpkFilterItem {
  spkId: string;
  spkNo: string;
  customerName: string;
  vehiclePlate?: string;
  subTasks?: string[] | string;
  count: number;
}
export const SpkFilterItem = {};

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
  const [searchQuery, setSearchQuery] = useState('');

  // Saring daftar SPK secara case-insensitive berdasarkan 4 kriteria:
  // 1. Nomor SPK (spk_number / spkNo)
  // 2. Nama Customer (customer_name / customerName)
  // 3. Nomor Plat Kendaraan (vehicle_plate / vehiclePlate)
  // 4. Sub Task / Modifikasi (sub_tasks / subTasks)
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;

    return items.filter((spk) => {
      const matchSpkNo = (spk.spkNo || '').toLowerCase().includes(q);
      const matchCustomer = (spk.customerName || '').toLowerCase().includes(q);
      const matchPlate = (spk.vehiclePlate || '').toLowerCase().includes(q);

      let matchSubTasks = false;
      if (Array.isArray(spk.subTasks)) {
        matchSubTasks = spk.subTasks.some((t) => (t || '').toLowerCase().includes(q));
      } else if (typeof spk.subTasks === 'string') {
        matchSubTasks = spk.subTasks.toLowerCase().includes(q);
      }

      return matchSpkNo || matchCustomer || matchPlate || matchSubTasks;
    });
  }, [items, searchQuery]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-amber-500" />
          <h3 className="font-bold text-slate-100 font-display text-sm">Filter Berdasarkan SPK</h3>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
          {searchQuery ? `${filteredItems.length} dari ${items.length}` : `${items.length}`} SPK
        </span>
      </div>

      {/* Kotak Pencarian (Search Box) */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/30">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari SPK, customer, plat, sub-task..."
            className="w-full bg-slate-950/70 border border-slate-800 rounded-lg pl-8.5 pr-8 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition font-sans"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5 rounded transition cursor-pointer"
              title="Hapus pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* List Container */}
      <div className="p-3 max-h-[550px] overflow-y-auto space-y-2 scrollbar-thin">
        {/* Item 1: Semua SPK */}
        <div
          onClick={() => onSelectSpk('ALL')}
          className={`cursor-pointer p-3 rounded-lg border transition flex flex-col gap-1 ${
            selectedSpk === 'ALL'
              ? 'border-amber-500 bg-amber-500/10 shadow-sm ring-1 ring-amber-500'
              : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/60 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className={`w-4 h-4 ${selectedSpk === 'ALL' ? 'text-amber-400' : 'text-slate-400'}`} />
              <span className={`font-semibold text-sm ${selectedSpk === 'ALL' ? 'text-slate-100 font-bold' : 'text-slate-200'}`}>
                Semua SPK
              </span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                selectedSpk === 'ALL'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-slate-800 border border-slate-700 text-slate-400'
              }`}
            >
              {totalPendingCount} Pending
            </span>
          </div>
          <p className="text-xs text-slate-400 pl-6">
            Tampilkan seluruh antrean permintaan mandor
          </p>
        </div>

        {/* Separator / Item 2..N: Kartu SPK */}
        {filteredItems.length > 0 ? (
          filteredItems.map((spk) => {
            const isSelected = selectedSpk === spk.spkNo || selectedSpk === spk.spkId;

            // Ekstrak teks ringkasan sub_tasks untuk line-clamp
            const subTasksText = Array.isArray(spk.subTasks)
              ? spk.subTasks.join(' • ')
              : typeof spk.subTasks === 'string'
              ? spk.subTasks
              : '';

            return (
              <div
                key={spk.spkNo}
                onClick={() => onSelectSpk(spk.spkNo)}
                className={`cursor-pointer p-3 rounded-lg border transition flex flex-col gap-1.5 ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500/10 shadow-sm ring-1 ring-amber-500'
                    : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/60 hover:border-slate-700'
                }`}
              >
                {/* Baris 1: Nomor SPK & Badge Pending Requisition */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`font-mono font-bold text-sm truncate ${isSelected ? 'text-amber-400' : 'text-slate-200'}`}>
                      {spk.spkNo}
                    </span>
                    {isSelected && (
                      <span className="flex items-center gap-0.5 text-amber-400 text-[10px] font-semibold bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.2 rounded shrink-0">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Aktif
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold shrink-0 ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {spk.count} Pending
                  </span>
                </div>

                {/* Baris 2: Nama Customer bersisian dengan badge Nomor Plat Kendaraan */}
                <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                  <span
                    className="text-slate-300 font-medium truncate max-w-[150px]"
                    title={spk.customerName || 'Pelanggan Umum'}
                  >
                    {spk.customerName || 'Pelanggan Umum'}
                  </span>
                  {spk.vehiclePlate ? (
                    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-950/80 text-amber-300/90 border border-slate-800 uppercase font-medium shrink-0">
                      {spk.vehiclePlate}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500 italic">No Plat -</span>
                  )}
                </div>

                {/* Baris 3: Ringkasan Sub Tasks / Modifikasi dengan ikon teknis kecil & line-clamp (maks 2 baris) */}
                {subTasksText ? (
                  <div className="mt-0.5 pt-1.5 border-t border-slate-800/80 flex items-start gap-1.5 text-[11px] text-slate-400">
                    <Wrench className="w-3 h-3 text-amber-400/80 shrink-0 mt-0.5" />
                    <span className="line-clamp-2 leading-relaxed font-mono" title={subTasksText}>
                      {subTasksText}
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })
        ) : items.length > 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs space-y-1">
            <p>Tidak ada SPK yang cocok dengan "{searchQuery}"</p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-amber-400 hover:underline text-[11px] cursor-pointer"
            >
              Reset filter pencarian
            </button>
          </div>
        ) : (
          <div className="py-6 text-center text-slate-500 text-xs">
            Tidak ada antrean SPK aktif saat ini.
          </div>
        )}
      </div>
    </div>
  );
};
