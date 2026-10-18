import React, { useState } from 'react';
import { formatRupiah } from '../../../utils/formatters';
import { PieChart, Layers, Wrench, Factory, Briefcase } from 'lucide-react';

interface CostBreakdownDoughnutProps {
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  opexCost: number;
  monthLabel?: string;
}

interface CostSlice {
  id: string;
  label: string;
  amount: number;
  percentage: number;
  color: string;
  icon: React.ReactNode;
}

export const CostBreakdownDoughnut: React.FC<CostBreakdownDoughnutProps> = ({
  materialCost,
  laborCost,
  overheadCost,
  opexCost,
  monthLabel = 'Bulan Ini',
}) => {
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  const totalCost = materialCost + laborCost + overheadCost + opexCost;

  const rawSlices: Omit<CostSlice, 'percentage'>[] = [
    {
      id: 'material',
      label: 'Direct Material (Bahan Baku)',
      amount: materialCost,
      color: '#0EA5E9', // Sky 500
      icon: <Layers className="w-3.5 h-3.5 text-sky-400" />,
    },
    {
      id: 'labor',
      label: 'Direct Labor (Upah Borongan)',
      amount: laborCost,
      color: '#F59E0B', // Amber 500
      icon: <Wrench className="w-3.5 h-3.5 text-amber-400" />,
    },
    {
      id: 'overhead',
      label: 'Factory Overhead (FOH Stasiun)',
      amount: overheadCost,
      color: '#8B5CF6', // Purple 500
      icon: <Factory className="w-3.5 h-3.5 text-purple-400" />,
    },
    {
      id: 'opex',
      label: 'Periodic OPEX (Beban Operasional)',
      amount: opexCost,
      color: '#F43F5E', // Rose 500
      icon: <Briefcase className="w-3.5 h-3.5 text-rose-400" />,
    },
  ];

  const slices: CostSlice[] = rawSlices.map(s => ({
    ...s,
    percentage: totalCost > 0 ? (s.amount / totalCost) * 100 : 0,
  }));

  // SVG parameters
  const size = 200;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate stroke-dasharray offsets
  let accumulatedPercent = 0;
  const arcData = slices.map(s => {
    const strokeDasharray = `${(s.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += s.percentage;
    return {
      ...s,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  if (totalCost === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-6 text-center text-text-muted">
        <PieChart className="w-8 h-8 mx-auto mb-2 opacity-40 text-primary" />
        <p className="text-sm font-medium">Belum ada beban tercatat untuk periode ini.</p>
        <p className="text-xs text-text-muted/70 mt-1">Struktur beban HPP dan OPEX akan dihitung secara otomatis.</p>
      </div>
    );
  }

  const activeItem = slices.find(s => s.id === hoveredSlice);

  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-text text-sm flex items-center gap-2">
            <span>Struktur Beban Komprehensif (Cost Breakdown)</span>
          </h3>
          <p className="text-xs text-text-muted">
            Komparasi proporsi Biaya Langsung SPK (COGS) vs Beban Operasional Berkala ({monthLabel}).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Doughnut Chart */}
        <div className="md:col-span-5 flex justify-center relative">
          <div className="relative w-48 h-48 flex items-center justify-center">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="transform -rotate-90 select-none overflow-visible"
            >
              {/* Background ring */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke="currentColor"
                className="text-border/40"
                strokeWidth={strokeWidth}
              />

              {/* Slices */}
              {arcData.map(slice => {
                const isHovered = hoveredSlice === slice.id;
                return (
                  <circle
                    key={slice.id}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={slice.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                    strokeLinecap="round"
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => setHoveredSlice(slice.id)}
                    onMouseLeave={() => setHoveredSlice(null)}
                  />
                );
              })}
            </svg>

            {/* Inner Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 pointer-events-none">
              {activeItem ? (
                <>
                  <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
                    {activeItem.label.split(' ')[0]}
                  </span>
                  <span className="text-base font-bold font-mono text-text">
                    {activeItem.percentage.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-text-muted font-mono truncate max-w-[110px]">
                    {formatRupiah(activeItem.amount)}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[9px] uppercase font-bold text-text-muted tracking-wider">
                    Total Biaya
                  </span>
                  <span className="text-sm font-bold font-mono text-text">
                    {formatRupiah(totalCost)}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold">
                    100% Struktur
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Legend & Breakdown List */}
        <div className="md:col-span-7 space-y-2.5">
          {slices.map(slice => {
            const isHovered = hoveredSlice === slice.id;
            return (
              <div
                key={slice.id}
                onMouseEnter={() => setHoveredSlice(slice.id)}
                onMouseLeave={() => setHoveredSlice(null)}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                  isHovered 
                    ? 'bg-surface-hover border-primary/40 shadow-sm' 
                    : 'bg-surface border-border hover:bg-surface-hover/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div 
                      className="w-3 h-3 rounded-full shrink-0" 
                      style={{ backgroundColor: slice.color }} 
                    />
                    <div className="text-xs font-semibold text-text truncate">
                      {slice.label}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono font-bold text-text">
                      {formatRupiah(slice.amount)}
                    </span>
                    <span 
                      className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded text-white shrink-0"
                      style={{ backgroundColor: slice.color }}
                    >
                      {slice.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Micro progress bar */}
                <div className="mt-1.5 w-full bg-border/50 h-1 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-300"
                    style={{ 
                      width: `${slice.percentage}%`, 
                      backgroundColor: slice.color 
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
