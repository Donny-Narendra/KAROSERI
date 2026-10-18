import React, { useState, useId } from 'react';
import type { CorporateMonthlyPnl } from '../../../types/financialReports';
import { formatRupiah } from '../../../utils/formatters';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface PnlTrendChartProps {
  data: CorporateMonthlyPnl[];
}

export const PnlTrendChart: React.FC<PnlTrendChartProps> = ({ data }) => {
  const gradientId = useId();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [activeSeries, setActiveSeries] = useState<{
    revenue: boolean;
    cogs: boolean;
    opex: boolean;
    netProfit: boolean;
  }>({
    revenue: true,
    cogs: true,
    opex: true,
    netProfit: true,
  });

  // Sort chronologically ascending for trend display
  const sortedData = [...data].sort((a, b) => 
    new Date(a.report_month).getTime() - new Date(b.report_month).getTime()
  );

  if (sortedData.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-8 text-center text-text-muted">
        <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-40 text-primary" />
        <p className="text-sm font-medium">Belum ada data bulanan untuk grafik tren Laba Rugi.</p>
        <p className="text-xs text-text-muted/70 mt-1">Data akan otomatis tampil setelah ada SPK aktif atau pencatatan OPEX.</p>
      </div>
    );
  }

  // Format month label (e.g. "Okt 2026")
  const formatMonth = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Find max value for scaling
  const maxVal = Math.max(
    ...sortedData.map(d => Math.max(d.total_revenue, d.total_cogs, d.total_opex, Math.abs(d.net_operating_profit))),
    1000000
  );

  // Chart layout dimensions
  const chartHeight = 220;
  const paddingBottom = 30;
  const paddingTop = 20;
  const effectiveHeight = chartHeight - paddingTop - paddingBottom;

  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
      {/* Chart Header & Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display font-semibold text-text text-sm">
              Tren Laba Rugi Bulanan (Revenue vs COGS vs OPEX vs Net EBIT)
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              Empirical
            </span>
          </div>
          <p className="text-xs text-text-muted">
            Perbandingan komprehensif performa pendapatan, beban pokok pekerjaan, beban operasional, dan laba usaha bersih.
          </p>
        </div>

        {/* Legend toggles */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveSeries(s => ({ ...s, revenue: !s.revenue }))}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition ${
              activeSeries.revenue 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-semibold' 
                : 'bg-surface-hover border-border text-text-muted opacity-50'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
            <span>Revenue</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSeries(s => ({ ...s, cogs: !s.cogs }))}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition ${
              activeSeries.cogs 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 font-semibold' 
                : 'bg-surface-hover border-border text-text-muted opacity-50'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
            <span>COGS (HPP)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSeries(s => ({ ...s, opex: !s.opex }))}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition ${
              activeSeries.opex 
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 font-semibold' 
                : 'bg-surface-hover border-border text-text-muted opacity-50'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-sm bg-purple-500 inline-block" />
            <span>OPEX Berkala</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSeries(s => ({ ...s, netProfit: !s.netProfit }))}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition ${
              activeSeries.netProfit 
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 font-semibold' 
                : 'bg-surface-hover border-border text-text-muted opacity-50'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />
            <span>Net Operating EBIT</span>
          </button>
        </div>
      </div>

      {/* SVG Responsive Multi-Bar & Trend Chart */}
      <div className="relative w-full overflow-x-auto">
        <div className="min-w-[500px]">
          <svg
            viewBox={`0 0 ${Math.max(500, sortedData.length * 120)} ${chartHeight}`}
            className="w-full h-56 select-none overflow-visible"
          >
            <defs>
              <linearGradient id={`${gradientId}-rev`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id={`${gradientId}-cogs`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#D97706" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id={`${gradientId}-opex`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#A855F7" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#7E22CE" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id={`${gradientId}-net`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0.5" />
              </linearGradient>
            </defs>

            {/* Grid horizontal lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const y = paddingTop + effectiveHeight * (1 - pct);
              return (
                <g key={i}>
                  <line
                    x1="0"
                    y1={y}
                    x2={Math.max(500, sortedData.length * 120)}
                    y2={y}
                    stroke="currentColor"
                    className="text-border"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x="4"
                    y={y - 4}
                    fill="currentColor"
                    className="text-[9px] text-text-muted fill-current opacity-60"
                  >
                    {formatRupiah(maxVal * pct)}
                  </text>
                </g>
              );
            })}

            {/* Render Bars per Month */}
            {sortedData.map((d, idx) => {
              const totalWidth = Math.max(500, sortedData.length * 120);
              const colWidth = totalWidth / sortedData.length;
              const groupCenterX = idx * colWidth + colWidth / 2;

              // Bar width & spacing
              const barWidth = 14;
              const barGap = 3;
              const enabledCount = (activeSeries.revenue ? 1 : 0) + 
                                  (activeSeries.cogs ? 1 : 0) + 
                                  (activeSeries.opex ? 1 : 0) + 
                                  (activeSeries.netProfit ? 1 : 0);
              const groupWidth = enabledCount * barWidth + (enabledCount - 1) * barGap;
              let currentStartX = groupCenterX - groupWidth / 2;

              const isHovered = hoveredIndex === idx;

              return (
                <g 
                  key={d.report_month}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="cursor-pointer"
                >
                  {/* Hover background highlight */}
                  {isHovered && (
                    <rect
                      x={idx * colWidth + 5}
                      y={paddingTop}
                      width={colWidth - 10}
                      height={effectiveHeight}
                      className="fill-primary/5 transition-all"
                      rx="6"
                    />
                  )}

                  {/* Revenue Bar */}
                  {activeSeries.revenue && (() => {
                    const h = (d.total_revenue / maxVal) * effectiveHeight;
                    const y = paddingTop + (effectiveHeight - h);
                    const x = currentStartX;
                    currentStartX += barWidth + barGap;
                    return (
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={Math.max(2, h)}
                        rx="3"
                        fill={`url(#${gradientId}-rev)`}
                        className="transition-all duration-300 hover:brightness-110"
                      />
                    );
                  })()}

                  {/* COGS Bar */}
                  {activeSeries.cogs && (() => {
                    const h = (d.total_cogs / maxVal) * effectiveHeight;
                    const y = paddingTop + (effectiveHeight - h);
                    const x = currentStartX;
                    currentStartX += barWidth + barGap;
                    return (
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={Math.max(2, h)}
                        rx="3"
                        fill={`url(#${gradientId}-cogs)`}
                        className="transition-all duration-300 hover:brightness-110"
                      />
                    );
                  })()}

                  {/* OPEX Bar */}
                  {activeSeries.opex && (() => {
                    const h = (d.total_opex / maxVal) * effectiveHeight;
                    const y = paddingTop + (effectiveHeight - h);
                    const x = currentStartX;
                    currentStartX += barWidth + barGap;
                    return (
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={Math.max(2, h)}
                        rx="3"
                        fill={`url(#${gradientId}-opex)`}
                        className="transition-all duration-300 hover:brightness-110"
                      />
                    );
                  })()}

                  {/* Net Profit Bar */}
                  {activeSeries.netProfit && (() => {
                    const isPositive = d.net_operating_profit >= 0;
                    const h = (Math.abs(d.net_operating_profit) / maxVal) * effectiveHeight;
                    const y = paddingTop + (effectiveHeight - h);
                    const x = currentStartX;
                    currentStartX += barWidth + barGap;
                    return (
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={Math.max(2, h)}
                        rx="3"
                        fill={isPositive ? `url(#${gradientId}-net)` : '#EF4444'}
                        className="transition-all duration-300 hover:brightness-110"
                      />
                    );
                  })()}

                  {/* Month Label */}
                  <text
                    x={groupCenterX}
                    y={chartHeight - 8}
                    textAnchor="middle"
                    fill="currentColor"
                    className={`text-[11px] font-medium fill-current transition-colors ${
                      isHovered ? 'text-primary font-bold' : 'text-text-muted'
                    }`}
                  >
                    {formatMonth(d.report_month)}
                  </text>

                  {/* Margin % pill tag above bar group */}
                  <g transform={`translate(${groupCenterX}, ${paddingTop - 6})`}>
                    <rect
                      x="-26"
                      y="-12"
                      width="52"
                      height="16"
                      rx="8"
                      className={`${
                        d.net_operating_profit >= 0
                          ? 'fill-emerald-500/20 stroke-emerald-500/40'
                          : 'fill-rose-500/20 stroke-rose-500/40'
                      }`}
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="0"
                      textAnchor="middle"
                      className={`text-[9px] font-mono font-bold fill-current ${
                        d.net_operating_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {d.net_margin_percentage >= 0 ? '+' : ''}{d.net_margin_percentage}%
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Interactive Tooltip Card */}
      {hoveredIndex !== null && sortedData[hoveredIndex] && (
        <div className="mt-4 p-4 rounded-xl bg-surface-hover/80 border border-primary/20 backdrop-blur-sm grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs animate-in fade-in duration-150">
          <div>
            <div className="text-[10px] text-text-muted uppercase font-semibold">Bulan Buku</div>
            <div className="font-bold text-text font-display mt-0.5">
              {formatMonth(sortedData[hoveredIndex].report_month)}
            </div>
            <div className="text-[10px] text-text-muted">
              {sortedData[hoveredIndex].total_spk_count} SPK Teregistrasi
            </div>
          </div>

          <div>
            <div className="text-[10px] text-emerald-400 uppercase font-semibold">Total Revenue</div>
            <div className="font-bold text-emerald-400 font-mono mt-0.5">
              {formatRupiah(sortedData[hoveredIndex].total_revenue)}
            </div>
          </div>

          <div>
            <div className="text-[10px] text-amber-400 uppercase font-semibold">Total HPP (COGS)</div>
            <div className="font-bold text-amber-400 font-mono mt-0.5">
              {formatRupiah(sortedData[hoveredIndex].total_cogs)}
            </div>
            <div className="text-[10px] text-text-muted">
              Laba Kotor: {formatRupiah(sortedData[hoveredIndex].gross_profit)}
            </div>
          </div>

          <div>
            <div className="text-[10px] text-purple-400 uppercase font-semibold">OPEX Berkala</div>
            <div className="font-bold text-purple-400 font-mono mt-0.5">
              {formatRupiah(sortedData[hoveredIndex].total_opex)}
            </div>
          </div>

          <div>
            <div className="text-[10px] text-blue-400 uppercase font-semibold flex items-center gap-1">
              <span>Laba Bersih (EBIT)</span>
              {sortedData[hoveredIndex].net_operating_profit >= 0 ? (
                <TrendingUp className="w-3 h-3 text-emerald-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-rose-400" />
              )}
            </div>
            <div className={`font-bold font-mono mt-0.5 ${
              sortedData[hoveredIndex].net_operating_profit >= 0 ? 'text-blue-400' : 'text-rose-400'
            }`}>
              {formatRupiah(sortedData[hoveredIndex].net_operating_profit)}
            </div>
            <div className="text-[10px] font-mono text-text-muted">
              Net Margin: {sortedData[hoveredIndex].net_margin_percentage}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
