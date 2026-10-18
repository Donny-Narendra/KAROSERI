import React, { useState } from 'react';
import { 
  Target, 
  Truck, 
  ShieldAlert, 
  CheckCircle2, 
  Calculator, 
  Sparkles, 
  TrendingUp 
} from 'lucide-react';
import type { MonthlyCorporatePnL } from '../../types/operatingExpenses';
import { formatRupiah } from '../../utils/formatters';

interface SmartTargetSolverWidgetProps {
  pnlData: MonthlyCorporatePnL[];
  currentMonthRevenue?: number;
}

export const SmartTargetSolverWidget: React.FC<SmartTargetSolverWidgetProps> = ({
  pnlData,
  currentMonthRevenue = 0,
}) => {
  // Slider / Input State: Target Laba Bersih yang Diinginkan Bulan Ini (Default: Rp 50.000.000)
  const [desiredProfit, setDesiredProfit] = useState<number>(50000000);

  // 1. Hitung Biaya Tetap (FC = Total OPEX rata-rata 3 bulan terakhir atau data terakhir)
  const recentMonths = pnlData.slice(0, 3);
  const totalOpexRecent = recentMonths.reduce((sum, d) => sum + d.total_opex, 0);
  const fixedCosts = recentMonths.length > 0 
    ? Math.round(totalOpexRecent / recentMonths.length) 
    : 45000000;

  // 2. Hitung Rasio Margin Kontribusi (CMR = Rata-rata Laba Kotor / Total Omzet)
  const totalRevRecent = recentMonths.reduce((sum, d) => sum + d.total_revenue, 0);
  const totalGrossRecent = recentMonths.reduce((sum, d) => sum + d.gross_profit, 0);
  const rawCmr = totalRevRecent > 0 ? (totalGrossRecent / totalRevRecent) : 0.3; // Default 30% if no data
  const contributionMarginRatio = Math.max(0.05, Math.min(0.9, rawCmr)); // Safeguard 5% - 90%

  // 3. Rata-rata Nilai Kontrak SPK
  const totalSpkRecent = recentMonths.reduce((sum, d) => sum + d.total_spk_count, 0);
  const avgContractValue = totalSpkRecent > 0 && totalRevRecent > 0 
    ? Math.round(totalRevRecent / totalSpkRecent) 
    : 50000000; // Default 50 Juta per unit

  // 4. Hitung Titik Impas Minimal: BEP = FC / CMR
  const bepRevenue = Math.round(fixedCosts / contributionMarginRatio);
  const bepUnits = Math.ceil(bepRevenue / avgContractValue);

  // 5. Hitung Target Omzet: Target Omzet = (FC + Target Laba Bersih) / CMR
  const targetRevenue = Math.round((fixedCosts + desiredProfit) / contributionMarginRatio);

  // 6. Hitung Target Unit SPK: Target Unit = Target Omzet / Rata-rata Nilai Kontrak SPK
  const targetUnits = Math.max(bepUnits, Math.ceil(targetRevenue / avgContractValue));

  // 7. Saran Throughput Mingguan (4 minggu per bulan)
  const weeklyThroughput = Math.ceil((targetUnits / 4) * 10) / 10;

  // 8. Status Pencapaian Saat Ini: Progress bar omzet aktual vs target
  const actualRevenue = currentMonthRevenue > 0 
    ? currentMonthRevenue 
    : (pnlData.length > 0 ? pnlData[0].total_revenue : 0);
  const achievementPercentage = targetRevenue > 0 
    ? Math.min(100, Math.round((actualRevenue / targetRevenue) * 100)) 
    : 0;

  const isTargetAchieved = actualRevenue >= targetRevenue;
  const isAboveBep = actualRevenue >= bepRevenue;

  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-text text-base">
                Smart Sales Target Solver (CVP Analysis Engine)
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-semibold">
                <Sparkles className="w-3 h-3" />
                Wave 4 CVP Active
              </span>
            </div>
            <p className="text-xs text-text-muted">
              Kalkulator optimasi titik impas (BEP) dan rekomendasi kapasitas unit SPK serta target omzet minimal bengkel.
            </p>
          </div>
        </div>

        {/* CVP Engine Indicator Chips */}
        <div className="flex items-center gap-2 text-xs">
          <div className="px-2.5 py-1 rounded-lg bg-surface-hover border border-border">
            <span className="text-text-muted">Biaya Tetap (FC): </span>
            <span className="font-mono font-bold text-purple-400">{formatRupiah(fixedCosts)}</span>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-surface-hover border border-border">
            <span className="text-text-muted">Margin Rasio (CMR): </span>
            <span className="font-mono font-bold text-emerald-400">{(contributionMarginRatio * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Interactive Slider Input Area */}
      <div className="p-4 rounded-xl bg-surface-hover/60 border border-border space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-4 h-4 text-primary" />
              <span>Target Laba Bersih yang Diinginkan Bulan Ini (Net Profit)</span>
            </label>
            <p className="text-[11px] text-text-muted">
              Geser slider untuk mensimulasikan kebutuhan omzet dan kuantitas unit pengerjaan bengkel secara real-time.
            </p>
          </div>

          <div className="text-right">
            <div className="text-lg font-bold font-mono text-primary">
              {formatRupiah(desiredProfit)}
            </div>
            <div className="text-[10px] text-text-muted font-mono">
              Batas Impas (BEP): {formatRupiah(bepRevenue)}
            </div>
          </div>
        </div>

        {/* Range Slider */}
        <div className="space-y-1">
          <input
            type="range"
            min="10000000"
            max="250000000"
            step="5000000"
            value={desiredProfit}
            onChange={e => setDesiredProfit(Number(e.target.value))}
            className="w-full accent-primary h-2 bg-surface rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-mono text-text-muted">
            <span>Rp 10 Juta</span>
            <span>Rp 50 Juta (Default)</span>
            <span>Rp 100 Juta</span>
            <span>Rp 150 Juta</span>
            <span>Rp 250 Juta</span>
          </div>
        </div>
      </div>

      {/* Real-Time Solver Output Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: 🎯 Target Omzet Minimal */}
        <div className="p-4 rounded-xl bg-surface border border-primary/30 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-4 h-4 text-primary" />
              <span>Target Omzet Minimal</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">
              Wajib Capai
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-text">
            {formatRupiah(targetRevenue)}
          </div>
          <p className="text-xs text-text-muted">
            Menutupi BEP <span className="font-mono font-semibold text-text">{formatRupiah(bepRevenue)}</span> + Target Profit <span className="font-mono font-semibold text-emerald-400">{formatRupiah(desiredProfit)}</span>.
          </p>
        </div>

        {/* Card 2: 🚚 Kapasitas Unit Minimal */}
        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-amber-400" />
              <span>Kapasitas Unit Minimal</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-semibold">
              Throughput
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-text">
              {targetUnits}
            </span>
            <span className="text-xs text-text-muted font-medium">Unit SPK Selesai</span>
          </div>
          <p className="text-xs text-text-muted">
            Saran Throughput: <span className="font-mono font-bold text-amber-400">~{weeklyThroughput} unit / minggu</span> (Estimasi rata-rata nilai kontrak SPK: {formatRupiah(avgContractValue)}).
          </p>
        </div>

        {/* Card 3: ⚠️ Status Pencapaian Saat Ini */}
        <div className={`p-4 rounded-xl border shadow-xs space-y-2 ${
          isTargetAchieved 
            ? 'bg-emerald-500/10 border-emerald-500/30' 
            : isAboveBep 
            ? 'bg-amber-500/10 border-amber-500/30' 
            : 'bg-rose-500/10 border-rose-500/30'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              {isTargetAchieved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Target Tercapai!</span>
                </>
              ) : isAboveBep ? (
                <>
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-400">Melampaui BEP</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span className="text-rose-400">Di Bawah BEP</span>
                </>
              )}
            </span>
            <span className="text-xs font-mono font-bold">
              {achievementPercentage}%
            </span>
          </div>

          <div className="w-full bg-border/50 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isTargetAchieved ? 'bg-emerald-500' : isAboveBep ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${achievementPercentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-text-muted">
            <span>Aktual: <strong className="font-mono text-text">{formatRupiah(actualRevenue)}</strong></span>
            <span>Kurang: <strong className="font-mono text-text">{formatRupiah(Math.max(0, targetRevenue - actualRevenue))}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
