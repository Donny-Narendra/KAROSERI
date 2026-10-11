import React from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Minus } from 'lucide-react';
import { renderAuditChanges, type DiffItem } from '../utils/auditDiffHelper';

interface AuditDiffTableProps {
  previousData: any;
  newData: any;
  unit?: string;
  className?: string;
}

export const AuditDiffTable: React.FC<AuditDiffTableProps> = ({
  previousData,
  newData,
  unit,
  className = '',
}) => {
  const diffItems: DiffItem[] = renderAuditChanges(previousData, newData, unit);

  if (diffItems.length === 0) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-md p-3 text-center text-xs text-text-muted">
        Tidak ada data atribut yang tercatat dalam log ini.
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto rounded-md border border-slate-700/80 bg-slate-950/60 ${className}`}>
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-900/80 text-text-muted font-mono uppercase tracking-wider border-b border-slate-700/80">
          <tr>
            <th className="px-3.5 py-2.5 font-medium">Atribut / Field</th>
            <th className="px-3.5 py-2.5 font-medium">Sebelum</th>
            <th className="px-3.5 py-2.5 font-medium">Sesudah</th>
            <th className="px-3.5 py-2.5 font-medium text-right">Perubahan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/80 font-mono">
          {diffItems.map(item => {
            const isNegative = item.changeType === 'negative';
            const isPositive = item.changeType === 'positive';
            const isUpdated = item.changeType === 'updated';
            const isNeutral = item.changeType === 'neutral';

            return (
              <tr
                key={item.key}
                className={`transition-colors hover:bg-slate-900/40 ${
                  !isNeutral ? 'bg-slate-900/20' : ''
                }`}
              >
                {/* Kolom Atribut */}
                <td className="px-3.5 py-2 text-text font-sans font-medium flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      isPositive
                        ? 'bg-emerald-400 ring-2 ring-emerald-500/20'
                        : isNegative
                        ? 'bg-rose-400 ring-2 ring-rose-500/20'
                        : isUpdated
                        ? 'bg-amber-400 ring-2 ring-amber-500/20'
                        : 'bg-slate-600'
                    }`}
                  />
                  <span>{item.label}</span>
                </td>

                {/* Kolom Sebelum */}
                <td className="px-3.5 py-2">
                  <span
                    className={`px-1.5 py-0.5 rounded ${
                      isNegative
                        ? 'text-rose-300 bg-rose-500/10 font-medium'
                        : 'text-text-muted'
                    }`}
                  >
                    {item.formattedBefore}
                  </span>
                </td>

                {/* Kolom Sesudah */}
                <td className="px-3.5 py-2">
                  <span
                    className={`px-1.5 py-0.5 rounded font-medium ${
                      isPositive
                        ? 'text-emerald-300 bg-emerald-500/10'
                        : isNegative
                        ? 'text-rose-300 bg-rose-500/10'
                        : isUpdated
                        ? 'text-amber-300 bg-amber-500/10'
                        : 'text-text'
                    }`}
                  >
                    {item.formattedAfter}
                  </span>
                </td>

                {/* Kolom Perubahan / Selisih */}
                <td className="px-3.5 py-2 text-right">
                  {isPositive && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <TrendingUp className="w-3 h-3" />
                      {item.deltaText}
                    </span>
                  )}

                  {isNegative && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/15 text-rose-400 border border-rose-500/30">
                      <TrendingDown className="w-3 h-3" />
                      {item.deltaText}
                    </span>
                  )}

                  {isUpdated && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      <RefreshCw className="w-3 h-3" />
                      {item.deltaText}
                    </span>
                  )}

                  {isNeutral && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-text-muted bg-slate-800/60 border border-slate-700/50">
                      <Minus className="w-2.5 h-2.5" />
                      {item.deltaText}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
