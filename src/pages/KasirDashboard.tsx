import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, FileText, CheckCircle, Calculator, Lock, Receipt } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { DownPaymentModal } from '../components/DownPaymentModal';
import { DpHistoryList } from '../components/DpHistoryList';
import { fetchDPHistory } from '../services/billingService';
import type { DPHistoryRecord } from '../services/billingService';

interface MockSPK {
  id: string;
  dbId: string;
  customerName: string;
  vehicleModel: string;
  status: string;
  dpAmount: number;
  materialCost: number;
  jasaCost: number;
  overheadCost: number;
  totalEstimatedCost: number;
  qcStatus: 'PENDING' | 'PASS' | 'FAIL';
  paymentStatus: 'NO_INVOICE' | 'UNPAID' | 'LUNAS';
}

export const KasirDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [spks, setSpks] = useState<MockSPK[]>([]);
  const [selectedSpkId, setSelectedSpkId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'DP' | 'FINAL'>('DP');
  const [dpSubTab, setDpSubTab] = useState<'PENDING' | 'HISTORY'>('PENDING');
  const [isDpModalOpen, setIsDpModalOpen] = useState(false);
  const [dpHistory, setDpHistory] = useState<DPHistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchSpks();
  }, []);

  useEffect(() => {
    if (activeTab === 'DP' && dpSubTab === 'HISTORY') {
      loadHistory();
    }
  }, [activeTab, dpSubTab]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    const history = await fetchDPHistory();
    setDpHistory(history);
    setLoadingHistory(false);
  };

  const fetchSpks = async () => {
    const { data, error } = await supabase.from('spk').select(`
      *,
      qc_inspections ( status, inspected_at ),
      invoices ( status, created_at ),
      rab_estimations ( id, total_labor_cost, total_overhead_cost, total_estimated_cost ),
      inventory_transactions ( quantity_issued, materials ( unit_price ) )
    `).neq('status', 'CANCELLED').order('created_at', { ascending: false });

    if (data) {
      const formatted = data.map((d: any) => {
        // qc status (latest)
        let qcStatus = 'PENDING';
        if (d.qc_inspections && d.qc_inspections.length > 0) {
           const sortedQc = d.qc_inspections.sort((a: any, b: any) => new Date(b.inspected_at).getTime() - new Date(a.inspected_at).getTime());
           qcStatus = sortedQc[0].status;
        }

        // payment status (latest invoice)
        let paymentStatus = 'NO_INVOICE';
        if (d.invoices && d.invoices.length > 0) {
           const sortedInv = d.invoices.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
           paymentStatus = sortedInv[0].status;
        }

        // actual material cost
        let actualMaterialCost = 0;
        if (d.inventory_transactions && d.inventory_transactions.length > 0) {
          actualMaterialCost = d.inventory_transactions.reduce((acc: number, curr: any) => {
            const price = curr.materials?.unit_price || 0;
            return acc + (Number(curr.quantity_issued) * Number(price));
          }, 0);
        }

        // actual labor cost
        let actualLaborCost = 0;
        let overheadCost = 0;
        let totalEstimatedCost = 0;
        if (d.rab_estimations && d.rab_estimations.length > 0) {
           actualLaborCost = Number(d.rab_estimations[0].total_labor_cost || 0);
           overheadCost = Number(d.rab_estimations[0].total_overhead_cost || 0);
           totalEstimatedCost = Number(d.rab_estimations[0].total_estimated_cost || 0);
        } else if (d.total_estimated_cost) {
           totalEstimatedCost = Number(d.total_estimated_cost);
           actualLaborCost = totalEstimatedCost * 0.3; // fallback split
        }

        if (actualMaterialCost === 0 && totalEstimatedCost > 0) {
           actualMaterialCost = totalEstimatedCost - actualLaborCost - overheadCost;
        }

        return {
          id: d.spk_no,
          dbId: d.id,
          customerName: d.customer_name,
          vehicleModel: d.vehicle_plate,
          status: d.status,
          dpAmount: Number(d.dp_amount || 0),
          materialCost: actualMaterialCost,
          jasaCost: actualLaborCost,
          overheadCost,
          totalEstimatedCost,
          qcStatus: qcStatus as any,
          paymentStatus: paymentStatus as any,
        };
      });
      setSpks(formatted);
    }
    if (error) console.error('Error fetching SPKs:', error);
  };

  const selectedSpk = spks.find(s => s.id === selectedSpkId) || null;
  const draftStatuses = ['DRAFT', 'PENDING_DP', 'PENDING_PAYMENT'];
  const displayedSpks = activeTab === 'DP' 
    ? spks.filter(s => draftStatuses.includes(s.status.toUpperCase()))
    : spks.filter(s => !draftStatuses.includes(s.status.toUpperCase()));

  const handleGenerateInvoice = async () => {
    if (!selectedSpk) return;
    
    const totalAmount = Math.max(0, (selectedSpk.materialCost + selectedSpk.jasaCost) - selectedSpk.dpAmount);
    
    const { error } = await supabase
      .from('invoices')
      .insert({
        spk_id: selectedSpk.dbId,
        dp_amount: selectedSpk.dpAmount,
        actual_material_cost: selectedSpk.materialCost,
        actual_labor_cost: selectedSpk.jasaCost,
        total_amount: totalAmount,
        status: 'UNPAID'
      });
      
    if (error) {
      console.error('Error generating invoice:', error);
      alert('Failed to generate invoice');
    } else {
      alert('Invoice generated successfully.');
      window.print();
      fetchSpks();
    }
  };

  const handleMarkAsPaid = async () => {
    if (!selectedSpk) return;
    
    const { data: invoices, error: fetchError } = await supabase
      .from('invoices')
      .select('id')
      .eq('spk_id', selectedSpk.dbId)
      .eq('status', 'UNPAID')
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (fetchError || !invoices || invoices.length === 0) {
      console.error('Error finding invoice:', fetchError);
      alert('Could not find unpaid invoice for this SPK. Generate invoice first.');
      return;
    }
    
    const invoiceId = invoices[0].id;
    
    const { error: invError } = await supabase
      .from('invoices')
      .update({ status: 'LUNAS' })
      .eq('id', invoiceId);
      
    if (invError) {
      console.error('Error updating invoice:', invError);
      alert('Failed to mark invoice as paid.');
      return;
    }
    
    const { error: spkError } = await supabase
      .from('spk')
      .update({ status: 'COMPLETED' })
      .eq('id', selectedSpk.dbId);
      
    if (spkError) console.error('Error updating SPK status:', spkError);
    
    alert('Bill marked as Paid and SPK is COMPLETED.');
    fetchSpks();
  };

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
          <div className="flex bg-surface-border p-1 rounded-lg">
            <button 
              onClick={() => { setActiveTab('DP'); setDpSubTab('PENDING'); setSelectedSpkId(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'DP' ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
            >
              Penerimaan DP
            </button>
            <button 
              onClick={() => { setActiveTab('FINAL'); setSelectedSpkId(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'FINAL' ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
            >
              Pelunasan Akhir
            </button>
          </div>

          {activeTab === 'DP' && (
            <div className="flex bg-surface border border-surface-border p-1 rounded-lg mt-2">
              <button 
                onClick={() => setDpSubTab('PENDING')}
                className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${dpSubTab === 'PENDING' ? 'bg-surface-border text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
              >
                Menunggu DP
              </button>
              <button 
                onClick={() => { setDpSubTab('HISTORY'); setSelectedSpkId(null); }}
                className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${dpSubTab === 'HISTORY' ? 'bg-surface-border text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
              >
                Riwayat DP
              </button>
            </div>
          )}

          <h2 className="text-lg font-display font-medium text-text-primary mb-2 mt-4">
            {activeTab === 'DP' ? (dpSubTab === 'HISTORY' ? 'Riwayat DP Diterima' : 'Menunggu DP') : 'Select SPK for Billing'}
          </h2>
          
          <div className="space-y-3">
            {activeTab === 'DP' && dpSubTab === 'HISTORY' ? (
              <div className="p-4 text-center text-sm text-text-muted border border-dashed border-surface-border rounded-lg bg-surface/30">
                Data riwayat ditampilkan di panel utama.
              </div>
            ) : displayedSpks.length === 0 ? (
              <div className="text-center p-6 border border-dashed border-surface-border rounded-lg text-text-muted">
                Tidak ada data.
              </div>
            ) : displayedSpks.map((spk) => (
              <div
                key={spk.id}
                onClick={() => setSelectedSpkId(spk.id)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedSpk?.id === spk.id
                    ? 'bg-surface border-secondary'
                    : 'bg-surface/50 border-surface-border hover:border-text-muted'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-text-primary">{spk.id}</h3>
                  <div className="flex gap-2">
                    {activeTab === 'FINAL' && (
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        spk.qcStatus === 'PASS' ? 'bg-status-success/20 text-status-success' :
                        spk.qcStatus === 'FAIL' ? 'bg-status-danger/20 text-status-danger' :
                        'bg-status-warning/20 text-status-warning'
                      }`}>
                        QC: {spk.qcStatus}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      spk.paymentStatus === 'LUNAS' ? 'bg-status-success/20 text-status-success' : 'bg-status-warning/20 text-status-warning'
                    }`}>
                      Pay: {spk.paymentStatus}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-text-muted">{spk.customerName}</p>
                <p className="text-xs text-text-muted">{spk.vehicleModel}</p>
                
                {activeTab === 'DP' && (
                  <div className="mt-3 pt-3 border-t border-surface-border flex justify-between items-center">
                    <span className="text-xs text-text-muted">Total Estimasi</span>
                    <span className="text-sm font-semibold text-secondary">{formatCurrency(spk.totalEstimatedCost)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Billing Calculator & Gate 3 Enforcement */}
        <div className="lg:w-2/3">
          {activeTab === 'DP' && dpSubTab === 'HISTORY' ? (
            <div className="bg-surface rounded-xl border border-surface-border p-6 shadow-xl">
              <h2 className="text-2xl font-display font-semibold text-text-primary mb-6">
                Riwayat DP Diterima
              </h2>
              <DpHistoryList history={dpHistory} loading={loadingHistory} />
            </div>
          ) : selectedSpk ? (
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

              {/* DP Recording Form - Only in DP Tab */}
              {activeTab === 'DP' && draftStatuses.includes(selectedSpk.status.toUpperCase()) && (
                <div className="mb-6 p-5 rounded-lg border border-primary/30 bg-primary/5 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-text-primary flex items-center gap-2 mb-1">
                      <Receipt className="w-5 h-5 text-primary" />
                      Status: {selectedSpk.status}
                    </h3>
                    <p className="text-sm text-text-muted">SPK ini membutuhkan Uang Muka (DP) sebelum dilanjutkan ke pengerjaan.</p>
                  </div>
                  <button 
                    onClick={() => setIsDpModalOpen(true)}
                    className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition shadow shadow-primary/20"
                  >
                    Terima DP
                  </button>
                </div>
              )}

              {/* Gate 3 Status Notice - Only in FINAL Tab */}
              {activeTab === 'FINAL' && (
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
              )}

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
                  {formatCurrency(Math.max(0, (selectedSpk.materialCost + selectedSpk.jasaCost) - selectedSpk.dpAmount))}
                </span>
              </div>

              {/* Actions - Only in FINAL Tab */}
              {activeTab === 'FINAL' && (
                <div className="flex justify-end gap-4">
                  <button
                    disabled={selectedSpk.qcStatus !== 'PASS' || selectedSpk.paymentStatus !== 'UNPAID'}
                    onClick={handleMarkAsPaid}
                    className={`px-4 py-2 rounded font-medium flex items-center gap-2 transition-all ${
                      selectedSpk.qcStatus === 'PASS' && selectedSpk.paymentStatus === 'UNPAID'
                        ? 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                        : 'hidden'
                    }`}
                  >
                    Mark as Paid
                  </button>
                  <button
                    disabled={selectedSpk.qcStatus !== 'PASS' || selectedSpk.paymentStatus !== 'NO_INVOICE'}
                    onClick={handleGenerateInvoice}
                    className={`px-6 py-3 rounded font-medium flex items-center gap-2 transition-all ${
                      selectedSpk.qcStatus === 'PASS' && selectedSpk.paymentStatus === 'NO_INVOICE'
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20'
                        : 'bg-surface-border text-text-muted cursor-not-allowed'
                    }`}
                  >
                    {selectedSpk.qcStatus !== 'PASS' && <Lock className="w-4 h-4" />}
                    Generate Final Bill (Invoice)
                  </button>
                  <button
                    disabled={selectedSpk.paymentStatus !== 'LUNAS'}
                    onClick={() => {
                      alert('BAST (Berita Acara Serah Terima) has been printed for ' + selectedSpk.id);
                      window.print();
                    }}
                    className={`px-6 py-3 rounded font-medium flex items-center gap-2 transition-all ${
                      selectedSpk.paymentStatus === 'LUNAS'
                        ? 'bg-status-success text-white hover:bg-status-success/90 shadow-lg shadow-status-success/20'
                        : 'bg-surface-border text-text-muted cursor-not-allowed'
                    }`}
                  >
                    {selectedSpk.paymentStatus !== 'LUNAS' && <Lock className="w-4 h-4" />}
                    Release Vehicle & Print BAST
                  </button>
                </div>
              )}

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-surface-border rounded-xl p-12 text-center text-text-muted">
              <Calculator className="w-12 h-12 mb-4 opacity-50" />
              <p>Select an SPK from the list to calculate billing.</p>
            </div>
          )}
        </div>
      </main>
      {/* DP Modal */}
      <DownPaymentModal 
        isOpen={isDpModalOpen}
        onClose={() => setIsDpModalOpen(false)}
        spk={selectedSpk}
        onSuccess={() => {
          setIsDpModalOpen(false);
          setSelectedSpkId(null);
          fetchSpks();
        }}
      />
    </div>
  );
};
