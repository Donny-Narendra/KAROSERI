import React, { useState, useId } from 'react';
import type { MonthlyCorporatePnL } from '../../types/operatingExpenses';
import { formatRupiah } from '../../utils/formatters';
import { DollarSign, PieChart } from 'lucide-react';

interface CorporatePnLChartsProps {
  data: MonthlyCorporatePnL[];
}

export const CorporatePnLCharts: React.FC<CorporatePnLChartsProps> = ({ data }) => {
  const chartId = useId();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredDonutSlice, setHoveredDonutSlice] = useState<string | null>(null);

  // Sort chronologically ascending
  const sortedData = [...data].sort((a, b) => 
    new Date(a.report_month).getTime() - new Date(b.report_month).getTime()
  );

  if (sortedData.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-8 text-center text-text-muted">
        <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-40 text-primary" />
        <p className="text-sm font-medium">Belum ada data bulanan untuk grafik analisis Laba Rugi.</p>
        <p className="text-xs text-text-muted/70 mt-1">Data akan otomatis ter-generate dari SPK aktif dan pencatatan OPEX.</p>
      </div>
    );
  }

  const formatMonth = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Aggregated totals across all months for the Cost Structure Donut
  const aggMaterial = sortedData.reduce((s, d) => s + d.total_material_cogs, 0);
  const aggLabor = sortedData.reduce((s, d) => s + d.total_labor_cogs, 0);
  const aggFoh = sortedData.reduce((s, d) => s + d.total_foh_cogs, 0);
  const aggSalary = sortedData.reduce((s, d) => s + d.opex_salary, 0);
  const aggUtility = sortedData.reduce((s, d) => s + d.opex_utility, 0);
  const aggNetProfit = sortedData.reduce((s, d) => s + Math.max(0, d.net_operating_profit), 0);
  const aggOtherOpex = sortedData.reduce((s, d) => s + d.opex_rent + d.opex_amenities + d.opex_others, 0);

  const totalDonutBasis = aggMaterial + aggLabor + aggFoh + aggSalary + aggUtility + aggOtherOpex + aggNetProfit;

  const donutSlices = [
    { id: 'material', label: 'Material (Bahan Baku)', amount: aggMaterial, color: '#38BDF8' }, // Sky 400
    { id: 'labor', label: 'Labor (Upah Borongan)', amount: aggLabor, color: '#FB923C' }, // Orange 400
    { id: 'foh', label: 'Overhead Stasiun (FOH)', amount: aggFoh, color: '#A855F7' }, // Purple 500
    { id: 'salary', label: 'Beban Gaji Staf', amount: aggSalary, color: '#EC4899' }, // Pink 500
    { id: 'utility', label: 'Listrik & Utilitas', amount: aggUtility, color: '#EAB308' }, // Yellow 500
    { id: 'otherOpex', label: 'Sewa & Amenities', amount: aggOtherOpex, color: '#64748B' }, // Slate 500
    { id: 'netProfit', label: 'Laba Bersih Riil', amount: aggNetProfit, color: '#10B981' }, // Emerald 500
  ].map(s => ({
    ...s,
    percentage: totalDonutBasis > 0 ? (s.amount / totalDonutBasis) * 100 : 0,
  }));

  // Svg donut metrics
  const donutSize = 190;
  const strokeWidth = 26;
  const radius = (donutSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;
  const donutArcs = donutSlices.map(s => {
    const strokeDasharray = `${(s.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += s.percentage;
    return { ...s, strokeDasharray, strokeDashoffset };
  });

  // Trend Bar & Line Chart Metrics
  const chartHeight = 230;
  const paddingTop = 25;
  const paddingBottom = 30;
  const effectiveHeight = chartHeight - paddingTop - paddingBottom;

  // Max scale includes revenue, stacked costs (cogs + opex), and BEP line
  const maxVal = Math.max(
    ...sortedData.map(d => Math.max(
      d.total_revenue, 
      d.total_cogs + d.total_opex,
      // BEP approximate line: if gross profit margin > 0, BEP = opex / (gross_margin)
      d.gross_profit > 0 && d.total_revenue > 0 ? (d.total_opex / (d.gross_profit / d.total_revenue)) : d.total_cogs + d.total_opex
    )),
    1000000
  );

  const totalWidth = Math.max(500, sortedData.length * 120);

  // Line points for Net Profit and BEP
  const netProfitPoints: { x: number; y: number; val: number }[] = [];
  const bepPoints: { x: number; y: number; val: number }[] = [];

  sortedData.forEach((d, idx) => {
    const colWidth = totalWidth / sortedData.length;
    const x = idx * colWidth + colWidth / 2;

    // Net Profit y
    const netY = paddingTop + (effectiveHeight - (Math.max(0, d.net_operating_profit) / maxVal) * effectiveHeight);
    netProfitPoints.push({ x, y: netY, val: d.net_operating_profit });

    // BEP y
    const cmr = d.total_revenue > 0 ? (d.gross_profit / d.total_revenue) : 0;
    const bepRev = cmr > 0 ? (d.total_opex / cmr) : (d.total_cogs + d.total_opex);
    const bepY = paddingTop + (effectiveHeight - (Math.min(maxVal, bepRev) / maxVal) * effectiveHeight);
    bepPoints.push({ x, y: bepY, val: bepRev });
  });

  const netLinePath = netProfitPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const bepLinePath = bepPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const activeDonutItem = donutSlices.find(s => s.id === hoveredDonutSlice);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* 1. Grafik Batang Bertumpuk & Garis Tren */}
      <div className="lg:col-span-7 bg-surface border border-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-semibold text-text text-sm">
                Grafik Batang Bertumpuk & Garis Tren Laba Rugi
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                Tren Komparatif
              </span>
            </div>
            <p className="text-xs text-text-muted">
              Omzet vs Beban Bertumpuk (HPP + OPEX) vs Laba Bersih vs Garis BEP
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center flex-wrap gap-2 text-[11px]">
            <span className="flex items-center gap-1.5 text-blue-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-xs bg-blue-500 inline-block" />
              <span>Omzet (Biru)</span>
            </span>
            <span className="flex items-center gap-1.5 text-rose-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" />
              <span>HPP+OPEX (Merah)</span>
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" />
              <span>Laba Bersih</span>
            </span>
            <span className="flex items-center gap-1.5 text-amber-400 font-medium">
              <span className="w-2.5 h-0.5 border-t border-dashed border-amber-400 inline-block" />
              <span>Garis BEP</span>
            </span>
          </div>
        </div>

        {/* SVG Chart */}
        <div className="relative w-full overflow-x-auto">
          <div className="min-w-[480px]">
            <svg
              viewBox={`0 0 ${totalWidth} ${chartHeight}`}
              className="w-full h-56 select-none overflow-visible"
            >
              <defs>
                <linearGradient id={`${chartId}-blue`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0.5" />
                </linearGradient>
                <linearGradient id={`${chartId}-cogs`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#B91C1C" stopOpacity="0.6" />
                </linearGradient>
                <linearGradient id={`${chartId}-opex`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F87171" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#DC2626" stopOpacity="0.7" />
                </linearGradient>
              </defs>

              {/* Horizontal gridlines */}
              {[0, 0.33, 0.66, 1].map((pct, i) => {
                const y = paddingTop + effectiveHeight * (1 - pct);
                return (
                  <g key={i}>
                    <line
                      x1="0"
                      y1={y}
                      x2={totalWidth}
                      y2={y}
                      stroke="currentColor"
                      className="text-border"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                    <text
                      x="4"
                      y={y - 3}
                      fill="currentColor"
                      className="text-[9px] text-text-muted fill-current opacity-60 font-mono"
                    >
                      {formatRupiah(maxVal * pct)}
                    </text>
                  </g>
                );
              })}

              {/* Bars per Month */}
              {sortedData.map((d, idx) => {
                const colWidth = totalWidth / sortedData.length;
                const groupCenterX = idx * colWidth + colWidth / 2;
                const barWidth = 22;
                const barGap = 6;
                const isHovered = hoveredIndex === idx;

                // Bar 1: Omzet Penjualan (Biru)
                const revHeight = (d.total_revenue / maxVal) * effectiveHeight;
                const revY = paddingTop + (effectiveHeight - revHeight);
                const revX = groupCenterX - barWidth - barGap / 2;

                // Bar 2: Bertumpuk Merah (HPP Proyek + OPEX Berkala)
                const cogsHeight = (d.total_cogs / maxVal) * effectiveHeight;
                const opexHeight = (d.total_opex / maxVal) * effectiveHeight;
                const totalCostHeight = cogsHeight + opexHeight;
                const costX = groupCenterX + barGap / 2;
                const cogsY = paddingTop + (effectiveHeight - cogsHeight);
                const opexY = paddingTop + (effectiveHeight - totalCostHeight);

                return (
                  <g
                    key={d.report_month}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className="cursor-pointer"
                  >
                    {/* Hover column background */}
                    {isHovered && (
                      <rect
                        x={idx * colWidth + 4}
                        y={paddingTop}
                        width={colWidth - 8}
                        height={effectiveHeight}
                        className="fill-primary/5 transition-all"
                        rx="6"
                      />
                    )}

                    {/* Batang Biru: Omzet Penjualan */}
                    <rect
                      x={revX}
                      y={revY}
                      width={barWidth}
                      height={Math.max(2, revHeight)}
                      rx="3"
                      fill={`url(#${chartId}-blue)`}
                      className="transition-all duration-200 hover:brightness-110"
                    />

                    {/* Batang Merah Bertumpuk - HPP (Bawah) */}
                    <rect
                      x={costX}
                      y={cogsY}
                      width={barWidth}
                      height={Math.max(2, cogsHeight)}
                      rx="2"
                      fill={`url(#${chartId}-cogs)`}
                      className="transition-all duration-200 hover:brightness-110"
                    />

                    {/* Batang Merah Bertumpuk - OPEX (Atas) */}
                    <rect
                      x={costX}
                      y={opexY}
                      width={barWidth}
                      height={Math.max(2, opexHeight)}
                      rx="2"
                      fill={`url(#${chartId}-opex)`}
                      className="transition-all duration-200 hover:brightness-110"
                    />

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
                  </g>
                );
              })}

              {/* Garis Putus-putus Kuning: Break-Even Point (BEP) */}
              <path
                d={bepLinePath}
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2.5"
                strokeDasharray="5 4"
                className="transition-all"
              />

              {/* Garis Hijau: Laba Bersih Riil (Net Profit) */}
              <path
                d={netLinePath}
                fill="none"
                stroke="#10B981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all"
              />

              {/* Data points for Net Profit */}
              {netProfitPoints.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={hoveredIndex === i ? 6 : 4}
                  fill="#10B981"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  className="transition-all duration-150 cursor-pointer"
                />
              ))}
            </svg>
          </div>
        </div>

        {/* Hover Summary Tooltip */}
        {hoveredIndex !== null && sortedData[hoveredIndex] && (
          <div className="p-3 rounded-xl bg-surface-hover/80 border border-border text-xs grid grid-cols-2 sm:grid-cols-4 gap-2.5 animate-in fade-in duration-150">
            <div>
              <span className="text-[10px] text-text-muted block">Bulan</span>
              <span className="font-bold text-text font-display">
                {formatMonth(sortedData[hoveredIndex].report_month)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-blue-400 block font-semibold">Omzet Penjualan</span>
              <span className="font-bold font-mono text-blue-400">
                {formatRupiah(sortedData[hoveredIndex].total_revenue)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-rose-400 block font-semibold">HPP + OPEX</span>
              <span className="font-bold font-mono text-rose-400">
                {formatRupiah(sortedData[hoveredIndex].total_cogs + sortedData[hoveredIndex].total_opex)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-400 block font-semibold">Laba Bersih (EBIT)</span>
              <span className="font-bold font-mono text-emerald-400">
                {formatRupiah(sortedData[hoveredIndex].net_operating_profit)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Grafik Donut Struktur Biaya (Cost Distribution) */}
      <div className="lg:col-span-5 bg-surface border border-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="border-b border-border pb-3">
          <h3 className="font-display font-semibold text-text text-sm flex items-center gap-1.5">
            <PieChart className="w-4 h-4 text-primary" />
            <span>Grafik Donut Struktur Biaya (Cost Distribution)</span>
          </h3>
          <p className="text-xs text-text-muted">
            Persentase Material vs Labor vs FOH vs Gaji vs Listrik vs Laba Bersih
          </p>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col items-center gap-4">
          {/* Donut Canvas */}
          <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
            <svg
              width={donutSize}
              height={donutSize}
              viewBox={`0 0 ${donutSize} ${donutSize}`}
              className="transform -rotate-90 select-none overflow-visible"
            >
              <circle
                cx={donutSize / 2}
                cy={donutSize / 2}
                r={radius}
                fill="transparent"
                stroke="currentColor"
                className="text-border/40"
                strokeWidth={strokeWidth}
              />

              {donutArcs.map(slice => {
                const isHovered = hoveredDonutSlice === slice.id;
                return (
                  <circle
                    key={slice.id}
                    cx={donutSize / 2}
                    cy={donutSize / 2}
                    r={radius}
                    fill="transparent"
                    stroke={slice.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                    strokeLinecap="round"
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setHoveredDonutSlice(slice.id)}
                    onMouseLeave={() => setHoveredDonutSlice(null)}
                  />
                );
              })}
            </svg>

            {/* Inner Center Info */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 pointer-events-none">
              {activeDonutItem ? (
                <>
                  <span className="text-[9px] uppercase font-bold text-text-muted truncate max-w-[100px]">
                    {activeDonutItem.label.split(' ')[0]}
                  </span>
                  <span className="text-sm font-bold font-mono text-text">
                    {activeDonutItem.percentage.toFixed(1)}%
                  </span>
                  <span className="text-[9px] text-text-muted font-mono truncate max-w-[95px]">
                    {formatRupiah(activeDonutItem.amount)}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[9px] uppercase font-bold text-text-muted">Total Basis</span>
                  <span className="text-xs font-bold font-mono text-text">
                    {formatRupiah(totalDonutBasis)}
                  </span>
                  <span className="text-[9px] text-emerald-400 font-semibold mt-0.5">
                    100% Struktur
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Slices Legend List */}
          <div className="w-full space-y-1.5 text-xs">
            {donutSlices.map(slice => {
              const isHovered = hoveredDonutSlice === slice.id;
              return (
                <div
                  key={slice.id}
                  onMouseEnter={() => setHoveredDonutSlice(slice.id)}
                  onMouseLeave={() => setHoveredDonutSlice(null)}
                  className={`px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    isHovered 
                      ? 'bg-surface-hover border-primary/40 shadow-xs' 
                      : 'bg-surface border-border hover:bg-surface-hover/50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: slice.color }} 
                    />
                    <span className="text-[11px] text-text truncate">
                      {slice.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-mono font-semibold text-text">
                      {formatRupiah(slice.amount)}
                    </span>
                    <span 
                      className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded text-white"
                      style={{ backgroundColor: slice.color }}
                    >
                      {slice.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
