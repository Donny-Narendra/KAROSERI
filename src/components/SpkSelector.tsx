import React, { useState, useMemo } from 'react';
import { Search, X, CheckCircle2, ClipboardList, Clock } from 'lucide-react';
import type { Spk } from '../types/spk';
import { formatSubTasks } from './SpkFilterListBox';

export interface SpkSelectorProps {
  spks: Spk[];
  selectedSpkId: string;
  onSelectSpk: (spkId: string) => void;
  isLoading?: boolean;
}

export const SpkSelector: React.FC<SpkSelectorProps> = ({
  spks,
  selectedSpkId,
  onSelectSpk,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Saring daftar SPK secara case-insensitive berdasarkan:
  // 1. Nomor SPK (spk_no / spk_number)
  // 2. Nama Customer (customer_name)
  // 3. Nomor Plat Kendaraan (vehicle_plate / vehicle_number)
  // 4. Sub Task / Modifikasi (sub_tasks)
  const filteredSpks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return spks;

    return spks.filter((spk) => {
      const spkNo = (spk.spk_no || spk.spk_number || '').toLowerCase();
      const customer = (spk.customer_name || '').toLowerCase();
      const plate = (spk.vehicle_plate || spk.vehicle_number || '').toLowerCase();
      const subTasks = formatSubTasks(spk.sub_tasks).toLowerCase();

      return spkNo.includes(q) || customer.includes(q) || plate.includes(q) || subTasks.includes(q);
    });
  }, [spks, searchQuery]);

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
      {/* Header Panel */}
      <div className="px-5 py-4 border-b border-border bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ClipboardList className="w-5 h-5 text-amber-500" />
          <div>
            <h2 className="text-base sm:text-lg font-display font-semibold text-text">
              Select Active SPK
            </h2>
            <p className="text-xs text-text-muted">
              Pilih SPK untuk membuka lembar kerja WBS dan form QC
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold">
            {searchQuery
              ? `${filteredSpks.length} dari ${spks.length} SPK`
              : `${spks.length} SPK Aktif`}
          </span>
        </div>
      </div>

      {/* Kotak Pencarian (Search Input Box) */}
      <div className="p-3.5 border-b border-border bg-slate-950/30">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari SPK, customer, plat, sub-task..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-10 pr-9 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition font-sans"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5 rounded transition cursor-pointer"
              title="Hapus pencarian"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* List Container: Compact Vertical List */}
      <div className="p-3.5 max-h-[500px] overflow-y-auto pr-1">
        {isLoading ? (
          <div className="py-12 text-center text-text-muted space-y-2">
            <div className="inline-block w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs">Memuat daftar SPK aktif...</p>
          </div>
        ) : spks.length === 0 ? (
          <div className="text-center py-10 text-text-muted border-2 border-dashed border-border rounded-lg">
            <p className="text-sm font-medium">Tidak ada SPK aktif saat ini</p>
            <p className="text-xs text-slate-500 mt-1">SPK baru yang aktif akan muncul di sini</p>
          </div>
        ) : filteredSpks.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {filteredSpks.map((spk) => {
              const isSelected = selectedSpkId === spk.id;
              const spkNumber = spk.spk_no || spk.spk_number || 'Tanpa No SPK';
              const plateNumber = spk.vehicle_plate || spk.vehicle_number || '';
              const subTasksText = formatSubTasks(spk.sub_tasks);
              const pendingCount = spk.pending_requisitions_count ?? 0;

              return (
                <div
                  key={spk.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectSpk(spk.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectSpk(spk.id);
                    }
                  }}
                  className={`p-3 rounded-lg border text-left cursor-pointer transition-all duration-150 flex flex-col gap-1.5 focus:outline-none ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/10 shadow-sm ring-1 ring-amber-500'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  {/* Baris 1 (Header Item): Nomor SPK & Badge Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`font-mono font-bold text-sm sm:text-base tracking-wide truncate ${
                          isSelected ? 'text-amber-400' : 'text-slate-100'
                        }`}
                      >
                        {spkNumber}
                      </span>
                      {isSelected && (
                        <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-amber-400 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                          Aktif
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Badge Status Pending Requisitions */}
                      {pendingCount > 0 && (
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold flex items-center gap-1 ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 shadow-xs'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          }`}
                          title={`${pendingCount} permintaan material menunggu persetujuan`}
                        >
                          <Clock className="w-3 h-3" />
                          {pendingCount} Pending
                        </span>
                      )}

                      {/* Badge Status QC jika ada */}
                      {spk.qc_status === 'PASS' && (
                        <span className="text-xs px-2 py-0.5 rounded font-bold bg-green-500/20 text-green-400 border border-green-500/40">
                          QC PASS
                        </span>
                      )}
                      {spk.qc_status === 'FAIL' && (
                        <span className="text-xs px-2 py-0.5 rounded font-bold bg-red-500/20 text-red-400 border border-red-500/40">
                          QC FAIL
                        </span>
                      )}
                      {spk.qc_status === 'PENDING' && (
                        <span className="text-xs px-2 py-0.5 rounded font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          QC PENDING
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Baris 2 (Identitas Unit & Pelanggan): Customer Name & Vehicle Plate */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span
                      className="text-xs sm:text-sm font-semibold text-slate-100 truncate max-w-[260px] sm:max-w-[400px]"
                      title={spk.customer_name || 'Pelanggan Umum'}
                    >
                      {spk.customer_name || 'Pelanggan Umum'}
                    </span>

                    {plateNumber ? (
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-950/70 border border-blue-800/60 text-blue-300 uppercase font-medium tracking-wide shrink-0">
                        {`[ ${plateNumber} ]`}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic shrink-0">
                        [ No Plat - ]
                      </span>
                    )}
                  </div>

                  {/* Baris 3 (Sub Task / Scope Pekerjaan) */}
                  <div className="mt-0.5 pt-1.5 border-t border-slate-800/80 text-[11px] text-slate-400">
                    <p className="truncate" title={subTasksText || undefined}>
                      <span className="text-slate-400 font-medium">Sub Task: </span>
                      {subTasksText ? (
                        <span className="text-slate-300 font-normal">{subTasksText}</span>
                      ) : (
                        <span className="text-slate-500 italic">-</span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs space-y-2">
            <p>Tidak ada SPK yang cocok dengan &quot;{searchQuery}&quot;</p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-amber-400 hover:underline text-xs cursor-pointer inline-flex items-center gap-1 font-medium"
            >
              Reset filter pencarian
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
