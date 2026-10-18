import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Target, 
  ShieldCheck, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle,
  Sparkles,
  BarChart3
} from 'lucide-react';
import { 
  calculateCvpAnalysis, 
  generateCvpScenarios, 
  type CvpInputParams, 
  type CvpAnalysisResult 
} from '../../utils/cvpCalculations';
import { formatRupiah } from '../../utils/formatters';

interface SmartTargetSolverProps {
  defaultFixedCosts?: number; // Pre-filled from current month OPEX
  defaultAveragePrice?: number; // Pre-filled from historical SPKs
  defaultAverageVarCost?: number; // Pre-filled from historical COGS
  currentActualRevenue?: number; // Current month revenue
  currentSpkCount?: number;
}

export const SmartTargetSolver: React.FC<SmartTargetSolverProps> = ({
  defaultFixedCosts = 45000000,
  defaultAveragePrice = 50000000,
  defaultAverageVarCost = 35000000,
  currentActualRevenue = 0,
  currentSpkCount = 0,
}) => {
  // Input parameters
  const [targetProfit, setTargetProfit] = useState<number>(50000000);
  const [fixedCosts, setFixedCosts] = useState<number>(defaultFixedCosts);
  const [pricePerUnit, setPricePerUnit] = useState<number>(defaultAveragePrice);
  const [variableCostPerUnit, setVariableCostPerUnit] = useState<number>(defaultAverageVarCost);
  const [actualRevenue, setActualRevenue] = useState<number>(currentActualRevenue);

  // Sync when props update
  useEffect(() => {
    if (defaultFixedCosts > 0) setFixedCosts(defaultFixedCosts);
    if (defaultAveragePrice > 0) setPricePerUnit(defaultAveragePrice);
    if (defaultAverageVarCost > 0) setVariableCostPerUnit(defaultAverageVarCost);
    if (currentActualRevenue > 0) setActualRevenue(currentActualRevenue);
  }, [defaultFixedCosts, defaultAveragePrice, defaultAverageVarCost, currentActualRevenue]);

  // Solver Computation
  const inputParams: CvpInputParams = {
    targetProfit,
    fixedCosts,
    pricePerUnit,
    variableCostPerUnit,
    actualRevenue,
  };

  const result: CvpAnalysisResult = calculateCvpAnalysis(inputParams);
  const scenarios = generateCvpScenarios(inputParams, result);

  const quickTargetPresets = [20000000, 50000000, 100000000, 200000000];

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
                Smart Sales Target Solver (CVP Optimization Engine)
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-semibold">
                <Sparkles className="w-3 h-3" />
                Solver Active
              </span>
            </div>
            <p className="text-xs text-text-muted">
              Kalkulator interaktif penentu batas impas (BEP) dan target kuantitas SPK serta omzet minimal untuk mencapai laba bersih owner.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Parameters Form & Solver Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Parameter Inputs */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl bg-surface-hover/50 border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-4 h-4 text-primary" />
                <span>Parameter Target Finansial</span>
              </h4>
              <span className="text-[10px] text-text-muted">Disesuaikan fleksibel</span>
            </div>

            {/* Target Laba Bersih (Target Profit) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-text">
                  Target Laba Bersih Usaha (Net Profit)
                </label>
                <span className="text-[10px] text-primary font-mono font-semibold">
                  {formatRupiah(targetProfit)}
                </span>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted text-xs font-mono font-bold">
                  Rp
                </span>
                <input
                  type="number"
                  min="0"
                  step="1000000"
                  value={targetProfit}
                  onChange={e => setTargetProfit(Number(e.target.value) || 0)}
                  className="w-full pl-10 pr-3 py-1.5 text-xs rounded-lg border border-border bg-surface text-text font-mono focus:ring-1 focus:ring-primary focus:outline-hidden"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[10px] text-text-muted">Preset:</span>
                {quickTargetPresets.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTargetProfit(preset)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border transition ${
                      targetProfit === preset
                        ? 'bg-primary/20 border-primary text-primary font-bold'
                        : 'bg-surface border-border text-text-muted hover:text-text'
                    }`}
                  >
                    {preset / 1000000} Jt
                  </button>
                ))}
              </div>
            </div>

            {/* Beban Tetap Bulanan (OPEX) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-text flex items-center gap-1">
                  <span>Beban Operasional Tetap (OPEX Bulanan)</span>
                  <span title="Total beban operasional berkala seperti gaji staf, listrik bengkel, amortisasi sewa gedung">
                    <HelpCircle className="w-3 h-3 text-text-muted" />
                  </span>
                </label>
                <span className="text-[10px] text-purple-400 font-mono font-semibold">
                  {formatRupiah(fixedCosts)}
                </span>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted text-xs font-mono font-bold">
                  Rp
                </span>
                <input
                  type="number"
                  min="0"
                  step="500000"
                  value={fixedCosts}
                  onChange={e => setFixedCosts(Number(e.target.value) || 0)}
                  className="w-full pl-10 pr-3 py-1.5 text-xs rounded-lg border border-border bg-surface text-text font-mono focus:ring-1 focus:ring-primary focus:outline-hidden"
                />
              </div>
            </div>

            {/* Rata-Rata Harga Jual SPK (Selling Price) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-text">
                  Estimasi Omzet Rata-rata per SPK
                </label>
                <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                  {formatRupiah(pricePerUnit)}
                </span>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted text-xs font-mono font-bold">
                  Rp
                </span>
                <input
                  type="number"
                  min="0"
                  step="1000000"
                  value={pricePerUnit}
                  onChange={e => setPricePerUnit(Number(e.target.value) || 0)}
                  className="w-full pl-10 pr-3 py-1.5 text-xs rounded-lg border border-border bg-surface text-text font-mono focus:ring-1 focus:ring-primary focus:outline-hidden"
                />
              </div>
            </div>

            {/* Rata-Rata Biaya Variabel per SPK (Variable COGS) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-text flex items-center gap-1">
                  <span>HPP Rata-rata per SPK (Bahan + Upah + FOH)</span>
                </label>
                <span className="text-[10px] text-amber-400 font-mono font-semibold">
                  {formatRupiah(variableCostPerUnit)}
                </span>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted text-xs font-mono font-bold">
                  Rp
                </span>
                <input
                  type="number"
                  min="0"
                  step="1000000"
                  value={variableCostPerUnit}
                  onChange={e => setVariableCostPerUnit(Number(e.target.value) || 0)}
                  className="w-full pl-10 pr-3 py-1.5 text-xs rounded-lg border border-border bg-surface text-text font-mono focus:ring-1 focus:ring-primary focus:outline-hidden"
                />
              </div>
            </div>

            {/* Omzet Aktual Bulan Berjalan */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-text">
                  Omzet Aktual Bulan Berjalan (Untuk Margin of Safety)
                </label>
                <span className="text-[10px] text-text-muted font-mono">
                  {currentSpkCount} SPK Aktif
                </span>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted text-xs font-mono font-bold">
                  Rp
                </span>
                <input
                  type="number"
                  min="0"
                  step="1000000"
                  value={actualRevenue}
                  onChange={e => setActualRevenue(Number(e.target.value) || 0)}
                  className="w-full pl-10 pr-3 py-1.5 text-xs rounded-lg border border-border bg-surface text-text font-mono focus:ring-1 focus:ring-primary focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Solver Results & Recommendations */}
        <div className="lg:col-span-7 space-y-4">
          {/* Key Output Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
            {/* Break-Even Units */}
            <div className="p-4 rounded-xl bg-surface border border-border">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-text-muted uppercase">
                  Batas Impas (BEP Unit)
                </span>
                <ShieldCheck className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold font-mono text-text">
                  {result.bepUnits}
                </span>
                <span className="text-xs text-text-muted font-medium">Unit SPK</span>
              </div>
              <p className="text-[11px] text-text-muted mt-1">
                Omzet Minimal BEP: <span className="font-mono font-semibold text-text">{formatRupiah(result.bepRevenue)}</span>
              </p>
            </div>

            {/* Target Units */}
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-primary uppercase">
                  Target Kuantitas SPK
                </span>
                <Target className="w-4 h-4 text-primary" />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold font-mono text-primary">
                  {result.targetUnits}
                </span>
                <span className="text-xs text-primary/80 font-medium">Unit SPK</span>
              </div>
              <p className="text-[11px] text-text-muted mt-1">
                Target Omzet: <span className="font-mono font-bold text-primary">{formatRupiah(result.targetRevenue)}</span>
              </p>
            </div>

            {/* Contribution Margin */}
            <div className="p-4 rounded-xl bg-surface border border-border">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-text-muted uppercase">
                  Margin Kontribusi (CM)
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {result.contributionMarginRatio}%
                </span>
                <span className="text-[10px] text-text-muted">Rasio</span>
              </div>
              <p className="text-[11px] text-text-muted mt-1 truncate">
                {formatRupiah(result.contributionMarginPerUnit)} / unit SPK
              </p>
            </div>

            {/* Margin of Safety */}
            <div className="p-4 rounded-xl bg-surface border border-border">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-text-muted uppercase">
                  Margin of Safety (MoS)
                </span>
                {result.marginOfSafetyPercentage > 15 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                )}
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className={`text-xl font-bold font-mono ${
                  result.marginOfSafetyPercentage > 15 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {result.marginOfSafetyPercentage}%
                </span>
                <span className="text-[10px] text-text-muted">Bantalan</span>
              </div>
              <p className="text-[11px] text-text-muted mt-1 truncate">
                Buffer: <span className="font-mono font-semibold text-text">{formatRupiah(result.marginOfSafetyRevenue)}</span>
              </p>
            </div>
          </div>

          {/* Diagnostic Status Box */}
          <div className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
            result.isProfitable 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
            {result.isProfitable ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold">Status Analisis CVP & Batas Impas:</div>
              <div className="mt-0.5 text-text-muted">{result.statusMessage}</div>
            </div>
          </div>

          {/* Scenarios Matrix Table */}
          <div className="border border-border rounded-xl overflow-hidden text-xs">
            <div className="px-3.5 py-2.5 bg-surface-hover/70 border-b border-border flex items-center justify-between">
              <span className="font-semibold text-text flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span>Matriks Simulasi Sensitivitas Omzet & Volume</span>
              </span>
              <span className="text-[10px] text-text-muted font-mono">6 Skenario</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface text-text-muted text-[10px] uppercase border-b border-border">
                  <tr>
                    <th className="py-2 px-3">Skenario</th>
                    <th className="py-2 px-2 text-right">Vol SPK</th>
                    <th className="py-2 px-2 text-right">Est. Omzet</th>
                    <th className="py-2 px-2 text-right">Est. Laba Bersih</th>
                    <th className="py-2 px-3 text-center">Status Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {scenarios.map(sc => (
                    <tr 
                      key={sc.label} 
                      className={`hover:bg-surface-hover/50 transition-colors ${
                        sc.label === 'Baseline Target' ? 'bg-primary/5 font-semibold' : ''
                      }`}
                    >
                      <td className="py-2 px-3 text-text truncate max-w-[150px]">
                        {sc.label}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-text">
                        {sc.projectedUnits} unit
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-text-muted">
                        {formatRupiah(sc.projectedRevenue)}
                      </td>
                      <td className={`py-2 px-2 text-right font-mono font-bold ${
                        sc.projectedNetProfit >= targetProfit ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {formatRupiah(sc.projectedNetProfit)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                          sc.meetsTarget
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {sc.meetsTarget ? 'Tercapai' : 'Belum'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
