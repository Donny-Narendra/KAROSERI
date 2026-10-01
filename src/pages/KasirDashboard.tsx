import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, FileText, CheckCircle, Calculator, Lock } from 'lucide-react';

interface MockSPK {
  id: string;
  customerName: string;
  vehicleModel: string;
  status: string;
  dpAmount: number;
  materialCost: number;
  jasaCost: number;
  qcStatus: 'PENDING' | 'PASS' | 'FAIL';
}

const mockSPKs: MockSPK[] = [
  {
    id: 'SPK-2026-001',
    customerName: 'PT. Lintas Semesta',
    vehicleModel: 'Hino Dutro 130 HD',
    status: 'IN_PROGRESS',
    dpAmount: 25000000,
    materialCost: 65000000,
    jasaCost: 15000000,
    qcStatus: 'PASS',
  },
  {
    id: 'SPK-2026-002',
    customerName: 'Bpk. Ahmad Susanto',
    vehicleModel: 'Mitsubishi Colt Diesel Fuso',
    status: 'IN_PROGRESS',
    dpAmount: 10000000,
    materialCost: 40000000,
    jasaCost: 8000000,
    qcStatus: 'PENDING',
  },
  {
    id: 'SPK-2026-003',
    customerName: 'CV. Maju Jaya',
    vehicleModel: 'Isuzu Elf NMR 71',
    status: 'IN_PROGRESS',
    dpAmount: 15000000,
    materialCost: 55000000,
    jasaCost: 12000000,
    qcStatus: 'FAIL',
  }
];

export const KasirDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [selectedSpk, setSelectedSpk] = useState<MockSPK | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <header className="bg-surface/50 backdrop-blur-md border-b border-surface-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="text-secondary w-6 h-6" />
            <h1 className="text-xl font-display font-semibold tracking-wide">
              RobelKaroseri <span className="text-text-muted text-sm font-normal">| Kasir (Billing)</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-right">
              <p className="font-medium text-text-primary">{profile?.full_name}</p>
              <p className="text-text-muted text-xs capitalize">{profile?.role?.replace('_', ' ')}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="text-xs bg-surface-border hover:bg-surface-border/80 text-text-primary px-3 py-1.5 rounded transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-6">
        {/* SPK List */}
        <div className="lg:w-1/3 flex flex-col gap-4">
          <h2 className="text-lg font-display font-medium text-text-primary mb-2">Select SPK for Billing</h2>
          <div className="space-y-3">
            {mockSPKs.map((spk) => (
              <div
                key={spk.id}
                onClick={() => setSelectedSpk(spk)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedSpk?.id === spk.id
                    ? 'bg-surface border-secondary'
                    : 'bg-surface/50 border-surface-border hover:border-text-muted'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-text-primary">{spk.id}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    spk.qcStatus === 'PASS' ? 'bg-status-success/20 text-status-success' :
                    spk.qcStatus === 'FAIL' ? 'bg-status-danger/20 text-status-danger' :
                    'bg-status-warning/20 text-status-warning'
                  }`}>
                    QC: {spk.qcStatus}
                  </span>
                </div>
                <p className="text-sm text-text-muted">{spk.customerName}</p>
                <p className="text-xs text-text-muted">{spk.vehicleModel}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Billing Calculator & Gate 3 Enforcement */}
        <div className="lg:w-2/3">
          {selectedSpk ? (
            <div className="bg-surface rounded-xl border border-surface-border p-6 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-display font-semibold text-text-primary">
                  Billing Calculator
                </h2>
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-text-muted" />
                  <span className="text-sm font-medium text-text-muted">{selectedSpk.id}</span>
                </div>
              </div>

              {/* Gate 3 Status Notice */}
              <div className={`mb-6 p-4 rounded-lg border flex items-start gap-3 ${
                selectedSpk.qcStatus === 'PASS'
                  ? 'bg-status-success/10 border-status-success/30 text-status-success'
                  : 'bg-status-warning/10 border-status-warning/30 text-status-warning'
              }`}>
                {selectedSpk.qcStatus === 'PASS' ? (
                  <CheckCircle className="w-5 h-5 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0" />
                )}
                <div>
                  <h4 className="font-medium">
                    {selectedSpk.qcStatus === 'PASS' ? 'Gate 3 Passed' : 'Gate 3 Locked: QC Pending/Failed'}
                  </h4>
                  <p className="text-sm opacity-80 mt-1">
                    {selectedSpk.qcStatus === 'PASS'
                      ? 'Quality Control inspection has passed. You may proceed with final billing.'
                      : 'Quality Control has not passed yet. Final billing cannot be generated until QC is PASS.'}
                  </p>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="bg-background rounded-lg border border-surface-border p-5 mb-6 space-y-4">
                <h3 className="text-lg font-medium text-text-primary border-b border-surface-border pb-2">Cost Breakdown</h3>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-text-muted">Total Material Cost</span>
                  <span className="font-medium text-text-primary">{formatCurrency(selectedSpk.materialCost)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-text-muted">Total Labor (Jasa) Cost</span>
                  <span className="font-medium text-text-primary">{formatCurrency(selectedSpk.jasaCost)}</span>
                </div>
                
                <div className="border-t border-surface-border/50 pt-3 flex justify-between items-center">
                  <span className="text-sm font-medium text-text-primary">Subtotal (Actual Cost)</span>
                  <span className="font-medium text-text-primary">{formatCurrency(selectedSpk.materialCost + selectedSpk.jasaCost)}</span>
                </div>

                <div className="flex justify-between items-center text-sm text-status-danger">
                  <span>Down Payment (DP)</span>
                  <span className="font-medium">- {formatCurrency(selectedSpk.dpAmount)}</span>
                </div>
              </div>

              {/* Total Final */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-5 flex justify-between items-center mb-8">
                <span className="text-lg font-medium text-text-primary">Final Bill to Customer</span>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency((selectedSpk.materialCost + selectedSpk.jasaCost) - selectedSpk.dpAmount)}
                </span>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-4">
                <button
                  disabled={selectedSpk.qcStatus !== 'PASS'}
                  className={`px-6 py-3 rounded font-medium flex items-center gap-2 transition-all ${
                    selectedSpk.qcStatus === 'PASS'
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20'
                      : 'bg-surface-border text-text-muted cursor-not-allowed'
                  }`}
                >
                  {selectedSpk.qcStatus !== 'PASS' && <Lock className="w-4 h-4" />}
                  Generate Final Bill (Invoice)
                </button>
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-surface-border rounded-xl p-12 text-center text-text-muted">
              <Calculator className="w-12 h-12 mb-4 opacity-50" />
              <p>Select an SPK from the list to calculate billing.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
