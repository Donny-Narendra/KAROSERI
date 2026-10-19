import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, FileText, CheckCircle, Calculator, Lock, Receipt, TrendingUp, ChevronDown, ChevronUp, Printer, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { DownPaymentModal } from '../components/DownPaymentModal';
import { DpHistoryList } from '../components/DpHistoryList';
import { BastModal } from '../components/BastModal';
import { ConfirmationModal, type ConfirmationModalVariant } from '../components/ConfirmationModal';
import { fetchDPHistory, fetchApprovedChangeOrders } from '../services/billingService';
import type { DPHistoryRecord, ApprovedChangeOrder } from '../services/billingService';
import { packageService } from '../services/packageService';
import type { ProductPackage } from '../types/package';
import { buildInvoicePrintPayload, printFinalInvoice } from '../utils/invoiceExport';

interface KasirRabEstimationSummary {
  id: string;
  spk_id: string;
  total_labor_cost: number | null;
  total_overhead_cost: number | null;
  total_estimated_cost: number | null;
}

interface KasirRabItemSummary {
  rab_estimation_id: string;
  item_total: number | null;
  package_id: string | null;
}

interface KasirSpkJoinRow {
  id: string;
  spk_no: string;
  customer_name: string;
  vehicle_plate: string;
  vehicle_vin?: string | null;
  vehicle_number?: string | null;
  vehicle_engine?: string | null;
  status: string;
  dp_amount?: number | null;
  total_estimated_cost?: number | null;
  qc_status?: string | null;
  allocation_status?: string | null;
  qc_inspections?: Array<{ status: string; inspected_at?: string }>;
  invoices?: Array<{ status: string; created_at?: string }>;
  inventory_transactions?: Array<{
    quantity_issued: number;
    custom_unit_price: number | null;
    materials: { unit_price: number; is_customer_supplied?: boolean } | null;
  }>;
  spk_amendments?: Array<{ status: string; cost_adjustment: number }>;
}

interface KasirSpkViewModel {
  id: string;
  dbId: string;
  customerName: string;
  vehicleModel: string;
  vehiclePlate?: string;
  vehicleVin?: string;
  vehicleEngine?: string;
  status: string;
  dpAmount: number;
  materialCost: number;
  jasaCost: number;
  overheadCost?: number;
  totalEstimatedCost: number; // RAB HPP
  quotationAmount: number; // Base Selling Price
  packageSellingPrice: number;
  nonPackageMaterialCost: number;
  qcStatus: 'PENDING' | 'PASS' | 'FAIL';
  paymentStatus: 'NO_INVOICE' | 'UNPAID' | 'LUNAS';
  allocationStatus?: string;
  amendmentCost: number;
  vin: string;
}

export const KasirDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [spks, setSpks] = useState<KasirSpkViewModel[]>([]);
  const [selectedSpkId, setSelectedSpkId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'DP' | 'FINAL'>('DP');
  const [dpSubTab, setDpSubTab] = useState<'PENDING' | 'HISTORY'>('PENDING');
  const [isDpModalOpen, setIsDpModalOpen] = useState(false);
  const [isBastModalOpen, setIsBastModalOpen] = useState(false);
  const [selectedBastSpk, setSelectedBastSpk] = useState<KasirSpkViewModel | null>(null);
  const [dpHistory, setDpHistory] = useState<DPHistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [manualAdjustments, setManualAdjustments] = useState<Record<string, number>>({});
  const [approvedChangeOrders, setApprovedChangeOrders] = useState<ApprovedChangeOrder[]>([]);
  const [loadingChangeOrders, setLoadingChangeOrders] = useState(false);
  const [isCoAccordionOpen, setIsCoAccordionOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message?: string;
    variant?: ConfirmationModalVariant;
    confirmText?: string;
    cancelText?: string;
    hideCancel?: boolean;
    isLoading?: boolean;
    onConfirm?: () => void | Promise<void>;
    children?: React.ReactNode;
  }>({
    isOpen: false,
    title: '',
  });

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false, isLoading: false }));
  };

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
    let fetchedPackages: ProductPackage[] = [];
    let fetchedEstimations: KasirRabEstimationSummary[] = [];
    let fetchedItems: KasirRabItemSummary[] = [];
    try {
      fetchedPackages = await packageService.getPackages();
      const { data: estData } = await supabase.from('rab_estimations').select('id, spk_id, total_labor_cost, total_overhead_cost, total_estimated_cost');
      if (estData) fetchedEstimations = estData as KasirRabEstimationSummary[];
      
      const { data: itemData } = await supabase.from('rab_items').select('rab_estimation_id, item_total, package_id');
      if (itemData) fetchedItems = itemData as KasirRabItemSummary[];
    } catch (err) {
      console.error("Failed to load flat data in kasir:", err);
    }

    const { data, error } = await supabase.from('spk').select(`
      *,
      qc_inspections ( status, inspected_at ),
      invoices ( status, created_at ),
      inventory_transactions ( quantity_issued, custom_unit_price, materials ( unit_price, is_customer_supplied ) ),
      spk_amendments ( status, cost_adjustment )
    `).neq('status', 'CANCELLED').order('created_at', { ascending: false });

    if (data) {
      const formatted: KasirSpkViewModel[] = (data as unknown as KasirSpkJoinRow[]).map((d: KasirSpkJoinRow) => {
        // Manual merge of rab_estimations and rab_items
        const myEstimations = fetchedEstimations.filter(est => est.spk_id === d.id);
        
        let actualMaterialCost = 0;
        if (d.inventory_transactions && d.inventory_transactions.length > 0) {
          actualMaterialCost = d.inventory_transactions.reduce((acc: number, curr) => {
            const isCustomerSupplied = curr.materials?.is_customer_supplied === true;
            if (isCustomerSupplied) return acc;
            const price = curr.custom_unit_price !== null && curr.custom_unit_price !== undefined 
                          ? curr.custom_unit_price 
                          : (curr.materials?.unit_price || 0);
            return acc + (Number(curr.quantity_issued) * Number(price));
          }, 0);
        }

        let actualLaborCost = 0;
        let overheadCost = 0;
        let totalEstimatedCost = 0;
        if (myEstimations && myEstimations.length > 0) {
           actualLaborCost = Number(myEstimations[0].total_labor_cost || 0);
           overheadCost = Number(myEstimations[0].total_overhead_cost || 0);
           totalEstimatedCost = Number(myEstimations[0].total_estimated_cost || 0);
        } else if (d.total_estimated_cost) {
           totalEstimatedCost = Number(d.total_estimated_cost);
           actualLaborCost = totalEstimatedCost * 0.3; // fallback split
        }

        if (actualMaterialCost === 0 && totalEstimatedCost > 0) {
           actualMaterialCost = Math.max(0, totalEstimatedCost - actualLaborCost - overheadCost);
        }

        const rawQc = d.qc_status || (d.qc_inspections && d.qc_inspections.length > 0 
          ? d.qc_inspections[0].status 
          : 'PENDING');
        const qcStatus: 'PENDING' | 'PASS' | 'FAIL' = 
          rawQc === 'PASS' ? 'PASS' : rawQc === 'FAIL' ? 'FAIL' : 'PENDING';

        const validInvoices = d.invoices?.filter(i => i.status !== 'CANCELLED') || [];
        const rawPaymentStatus = validInvoices.length > 0
          ? validInvoices[0].status
          : 'NO_INVOICE';
        const paymentStatus: 'NO_INVOICE' | 'UNPAID' | 'LUNAS' = 
          rawPaymentStatus === 'LUNAS' || rawPaymentStatus === 'PAID'
            ? 'LUNAS'
            : rawPaymentStatus === 'UNPAID'
            ? 'UNPAID'
            : 'NO_INVOICE';

        const amendmentCost = d.spk_amendments?.filter(a => a.status === 'APPROVED').reduce((acc: number, curr) => acc + (Number(curr.cost_adjustment) || 0), 0) || 0;

        let packageSellingPrice = 0;
        let nonPackageMaterialCost = 0;
        
        if (myEstimations && myEstimations.length > 0) {
            const estId = myEstimations[0].id;
            const rabItems = fetchedItems.filter(item => item.rab_estimation_id === estId) || [];
            
            const uniquePackages = new Map<string, number>();
            rabItems.forEach((item: KasirRabItemSummary) => {
                if (item.package_id) {
                    const pkg = fetchedPackages.find(p => p.id === item.package_id);
                    if (pkg) {
                        uniquePackages.set(item.package_id, pkg.selling_price);
                    }
                } else {
                    nonPackageMaterialCost += Number(item.item_total || 0);
                }
            });
            
            uniquePackages.forEach((price) => {
                packageSellingPrice += Number(price);
            });
        }
        
        let quotationAmount = packageSellingPrice + nonPackageMaterialCost;
        
        // RE-ADD FALLBACK IN CASE ALL ELSE FAILS
        if (quotationAmount === 0 && totalEstimatedCost > 0) {
           quotationAmount = totalEstimatedCost;
        }

        return {
          id: d.spk_no,
          dbId: d.id,
          customerName: d.customer_name,
          vehiclePlate: d.vehicle_plate,
          vehicleVin: d.vehicle_vin || d.vehicle_number || '-',
          vehicleEngine: d.vehicle_engine || '-',
          vehicleModel: d.vehicle_plate,
          vin: d.vehicle_vin || d.vehicle_number || d.vehicle_plate,
          status: d.status,
          dpAmount: Number(d.dp_amount || 0),
          materialCost: actualMaterialCost,
          jasaCost: actualLaborCost,
          overheadCost,
          totalEstimatedCost,
          quotationAmount,
          packageSellingPrice,
          nonPackageMaterialCost,
          qcStatus,
          paymentStatus,
          allocationStatus: d.allocation_status || undefined,
          amendmentCost,
        };
      });
      setSpks(formatted);
    }
    if (error) console.error('Error fetching SPKs:', error);
  };

  const selectedSpk = spks.find(s => s.id === selectedSpkId) || null;
  const draftStatuses = ['DRAFT', 'PENDING_PAYMENT'];
  const displayedSpks = activeTab === 'DP' 
    ? spks.filter(s => draftStatuses.includes(s.status) && s.allocationStatus !== 'PARTIAL')
    : spks.filter(s => !draftStatuses.includes(s.status));

  useEffect(() => {
    if (selectedSpk?.dbId) {
      void loadApprovedChangeOrders(selectedSpk.dbId);
    } else {
      setApprovedChangeOrders([]);
      setIsCoAccordionOpen(false);
    }
  }, [selectedSpk?.dbId]);

  const loadApprovedChangeOrders = async (spkDbId: string) => {
    setLoadingChangeOrders(true);
    try {
      const data = await fetchApprovedChangeOrders(spkDbId);
      setApprovedChangeOrders(data);
    } catch (err) {
      console.error('Error loading approved change orders in Kasir:', err);
      setApprovedChangeOrders([]);
    } finally {
      setLoadingChangeOrders(false);
    }
  };

  const requestGenerateInvoice = () => {
    if (!selectedSpk) return;
    
    const manualAdj = manualAdjustments[selectedSpk.id] || 0;
    const totalHargaJual = selectedSpk.quotationAmount + selectedSpk.amendmentCost + manualAdj;
    const totalAmount = Math.max(0, totalHargaJual - selectedSpk.dpAmount);
    
    const coCount = approvedChangeOrders.length;
    const coItemCount = approvedChangeOrders.reduce((sum, co) => sum + co.change_order_items.length, 0);

    setModalConfig({
      isOpen: true,
      title: 'Konfirmasi Penerbitan Faktur Akhir (Invoice)',
      variant: 'info',
      confirmText: 'Ya, Terbitkan Invoice',
      cancelText: 'Batal',
      message: `Anda akan menerbitkan faktur tagihan akhir untuk SPK ${selectedSpk.id} (${selectedSpk.customerName}):\n\n` +
        `• Harga Jual Dasar: ${formatCurrency(selectedSpk.quotationAmount)}\n` +
        (selectedSpk.amendmentCost !== 0 ? `• Perubahan Addendum: ${formatCurrency(selectedSpk.amendmentCost)}${coCount > 0 ? ` (${coCount} Addendum, ${coItemCount} item disetujui)` : ''}\n` : '') +
        (manualAdj !== 0 ? `• Penyesuaian Manual: ${manualAdj > 0 ? '+' : ''}${formatCurrency(manualAdj)}\n` : '') +
        `• Total Harga Jual: ${formatCurrency(totalHargaJual)}\n` +
        `• Uang Muka (DP): -${formatCurrency(selectedSpk.dpAmount)}\n` +
        `• Sisa Tagihan Akhir: ${formatCurrency(totalAmount)}\n\n` +
        `Faktur ini akan diterbitkan dengan status UNPAID. Lanjutkan proses ini?`,
      onConfirm: () => executeGenerateInvoice(totalAmount),
    });
  };

  const executeGenerateInvoice = async (totalAmount: number) => {
    if (!selectedSpk) return;
    setModalConfig(prev => ({ ...prev, isLoading: true }));
    
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
      setModalConfig({
        isOpen: true,
        title: 'Gagal Menerbitkan Invoice',
        message: 'Terjadi kesalahan sistem saat membuat data invoice: ' + (error.message || 'Unknown error'),
        variant: 'danger',
        hideCancel: true,
        confirmText: 'Tutup',
        onConfirm: closeModal,
      });
    } else {
      await fetchSpks();
      setModalConfig({
        isOpen: true,
        title: 'Faktur Akhir Berhasil Diterbitkan',
        message: `Faktur tagihan untuk SPK ${selectedSpk.id} berhasil diterbitkan dengan status UNPAID.\n\nAnda dapat mencetak tagihan ini sekarang dengan rincian itemized Change Orders atau melanjutkan pelunasan ketika pembayaran diterima.`,
        variant: 'success',
        confirmText: 'Cetak Dokumen Sekarang',
        cancelText: 'Tutup',
        hideCancel: false,
        onConfirm: () => {
          closeModal();
          const printPayload = buildInvoicePrintPayload(
            selectedSpk,
            approvedChangeOrders,
            manualAdjustments[selectedSpk.id] || 0
          );
          printFinalInvoice(printPayload);
        },
      });
    }
  };

  const requestMarkAsPaid = () => {
    if (!selectedSpk) return;
    setModalConfig({
      isOpen: true,
      title: 'Konfirmasi Pelunasan Tagihan Akhir',
      message: `Apakah Anda yakin ingin menandai tagihan untuk SPK ${selectedSpk.id} (${selectedSpk.customerName}) sebagai LUNAS?\n\nTindakan ini akan mengonfirmasi pelunasan penuh dan memperbarui status SPK menjadi COMPLETED.`,
      variant: 'warning',
      confirmText: 'Ya, Tandai Lunas',
      cancelText: 'Batal',
      onConfirm: () => executeMarkAsPaid(),
    });
  };

  const executeMarkAsPaid = async () => {
    if (!selectedSpk) return;
    setModalConfig(prev => ({ ...prev, isLoading: true }));
    
    const { data: invoices, error: fetchError } = await supabase
      .from('invoices')
      .select('id')
      .eq('spk_id', selectedSpk.dbId)
      .eq('status', 'UNPAID')
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (fetchError || !invoices || invoices.length === 0) {
      console.error('Error finding invoice:', fetchError);
      setModalConfig({
        isOpen: true,
        title: 'Faktur Belum Ditemukan',
        message: 'Tidak ditemukan faktur dengan status UNPAID untuk SPK ini. Harap terbitkan faktur terlebih dahulu sebelum melakukan pelunasan.',
        variant: 'warning',
        hideCancel: true,
        confirmText: 'Mengerti',
        onConfirm: closeModal,
      });
      return;
    }
    
    const invoiceId = invoices[0].id;
    
    const { error: invError } = await supabase
      .from('invoices')
      .update({ status: 'LUNAS' })
      .eq('id', invoiceId);
      
    if (invError) {
      console.error('Error updating invoice:', invError);
      setModalConfig({
        isOpen: true,
        title: 'Gagal Memperbarui Faktur',
        message: 'Terjadi kesalahan saat memperbarui status faktur: ' + (invError.message || 'Unknown error'),
        variant: 'danger',
        hideCancel: true,
        confirmText: 'Tutup',
        onConfirm: closeModal,
      });
      return;
    }
    
    const { error: spkError } = await supabase
      .from('spk')
      .update({ status: 'COMPLETED' })
      .eq('id', selectedSpk.dbId);
      
    if (spkError) console.error('Error updating SPK status:', spkError);
    
    await fetchSpks();
    setModalConfig({
      isOpen: true,
      title: 'Pelunasan Berhasil',
      message: `Tagihan untuk SPK ${selectedSpk.id} berhasil ditandai LUNAS dan SPK telah berstatus COMPLETED.\n\nUnit kendaraan kini siap dirilis ke konsumen melalui BAST.`,
      variant: 'success',
      hideCancel: true,
      confirmText: 'Selesai',
      onConfirm: closeModal,
    });
  };

  const requestCancelInvoice = () => {
    if (!selectedSpk) return;
    setModalConfig({
      isOpen: true,
      title: 'Konfirmasi Pembatalan Faktur (Invoice)',
      message: `Apakah Anda yakin ingin membatalkan faktur UNPAID untuk SPK ${selectedSpk.id} (${selectedSpk.customerName})?\n\nFaktur ini akan dibatalkan/dihapus sehingga Anda dapat merevisi penyesuaian nilai atau rincian biaya sebelum menerbitkan ulang faktur final.`,
      variant: 'danger',
      confirmText: 'Ya, Batalkan Invoice',
      cancelText: 'Kembali',
      onConfirm: () => executeCancelInvoice(),
    });
  };

  const executeCancelInvoice = async () => {
    if (!selectedSpk) return;
    setModalConfig(prev => ({ ...prev, isLoading: true }));
    try {
      // Coba tandai status menjadi CANCELLED
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ status: 'CANCELLED' })
        .eq('spk_id', selectedSpk.dbId)
        .eq('status', 'UNPAID');

      // Jika check constraint belum dimigrasi di database, fallback hapus baris unpaid invoice
      if (updateError) {
        console.warn('Update status to CANCELLED failed, falling back to delete invoice:', updateError);
        const { error: deleteError } = await supabase
          .from('invoices')
          .delete()
          .eq('spk_id', selectedSpk.dbId)
          .eq('status', 'UNPAID');

        if (deleteError) throw deleteError;
      }

      await fetchSpks();
      setModalConfig({
        isOpen: true,
        title: 'Faktur Berhasil Dibatalkan',
        message: `Faktur UNPAID untuk SPK ${selectedSpk.id} telah berhasil dibatalkan. Status tagihan kembali menjadi Belum Ada Faktur (NO_INVOICE).`,
        variant: 'success',
        hideCancel: true,
        confirmText: 'Mengerti',
        onConfirm: closeModal,
      });
    } catch (err: unknown) {
      console.error('Error cancelling invoice:', err);
      setModalConfig({
        isOpen: true,
        title: 'Gagal Membatalkan Faktur',
        message: 'Terjadi kesalahan saat membatalkan faktur: ' + (err instanceof Error ? err.message : String(err)),
        variant: 'danger',
        hideCancel: true,
        confirmText: 'Tutup',
        onConfirm: closeModal,
      });
    }
  };

  const requestReleaseVehicle = () => {
    if (!selectedSpk) return;
    
    if (selectedSpk.status === 'COMPLETED') {
      setSelectedBastSpk(selectedSpk);
      setIsBastModalOpen(true);
      return;
    }

    setModalConfig({
      isOpen: true,
      title: 'Konfirmasi Serah Terima Unit (BAST)',
      message: `Apakah Anda yakin ingin memproses serah terima fisik unit kendaraan untuk SPK ${selectedSpk.id} (${selectedSpk.customerName})?\n\n` +
        `• Nomor Polisi: ${selectedSpk.vehiclePlate || '-'}\n` +
        `• No. Rangka / VIN: ${selectedSpk.vin}\n` +
        `• Status Pembayaran: LUNAS\n\n` +
        `Unit akan dinyatakan resmi diserahterimakan (COMPLETED) dan formulir BAST resmi siap dicetak.`,
      variant: 'info',
      confirmText: 'Ya, Rilis & Buka BAST',
      cancelText: 'Batal',
      onConfirm: () => executeReleaseVehicle(),
    });
  };

  const executeReleaseVehicle = async () => {
    if (!selectedSpk) return;
    setModalConfig(prev => ({ ...prev, isLoading: true }));
    try {
      if (selectedSpk.status !== 'COMPLETED') {
        const { error: spkError } = await supabase
          .from('spk')
          .update({ status: 'COMPLETED' })
          .eq('id', selectedSpk.dbId);
        if (spkError) {
          throw spkError;
        } else {
          setSpks(prev => prev.map(s => s.id === selectedSpk.id ? { ...s, status: 'COMPLETED' } : s));
        }
      }
      setSelectedBastSpk({ ...selectedSpk, status: 'COMPLETED' });
      closeModal();
      setIsBastModalOpen(true);
    } catch (err: unknown) {
      console.error('Failed to release vehicle:', err);
      setModalConfig({
        isOpen: true,
        title: 'Gagal Memproses Serah Terima',
        message: 'Terjadi kesalahan saat memproses BAST: ' + (err instanceof Error ? err.message : String(err)),
        variant: 'danger',
        hideCancel: true,
        confirmText: 'Tutup',
        onConfirm: closeModal,
      });
    }
  };

  const handleCopyTrackingLink = (spkNo: string) => {
    const url = `${window.location.origin}/tracking/${spkNo}`;
    navigator.clipboard.writeText(url);
    setModalConfig({
      isOpen: true,
      title: 'Tautan Pelacakan Tersalin',
      message: `Tautan pelacakan publik untuk SPK ${spkNo} berhasil disalin ke papan klip:\n\n${url}`,
      variant: 'info',
      hideCancel: true,
      confirmText: 'Tutup',
      onConfirm: closeModal,
    });
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
              onClick={() => window.location.href = '/finance-reports'}
              className="text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 font-medium"
              title="Buka Laporan Keuangan & Executive Dashboard"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Laporan Keuangan
            </button>
            {profile?.role !== 'kasir' && (
              <button
                onClick={() => window.location.href = '/'}
                className="text-xs bg-surface-border hover:bg-surface-border/80 text-text-primary px-3 py-1.5 rounded transition-colors"
              >
                Dashboard
              </button>
            )}
            <button
              onClick={() => signOut()}
              className="text-xs bg-surface-border hover:bg-surface-border/80 text-status-danger px-3 py-1.5 rounded transition-colors"
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
                    <span className="text-xs text-text-muted">Harga Jual (Quotation)</span>
                    <span className="text-sm font-semibold text-secondary">{formatCurrency(spk.quotationAmount + spk.amendmentCost + (manualAdjustments[spk.id] || 0))}</span>
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
                <div className="flex items-center gap-4">
                  {!draftStatuses.includes(selectedSpk.status) && selectedSpk.dpAmount > 0 && (
                    <button
                      type="button"
                      onClick={() => handleCopyTrackingLink(selectedSpk.id)}
                      className="text-xs bg-secondary/10 text-secondary hover:bg-secondary/20 px-3 py-1.5 rounded-full font-medium transition-colors cursor-pointer"
                    >
                      Salin Tautan Pelacakan
                    </button>
                  )}
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-text-muted" />
                    <span className="text-sm font-medium text-text-muted">{selectedSpk.id}</span>
                  </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-background rounded-lg border border-surface-border p-5 space-y-4">
                  <h3 className="text-lg font-medium text-text-primary border-b border-surface-border pb-2">Internal Cost (Modal)</h3>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-text-muted">Actual Material Cost</span>
                    <span className="font-medium text-text-primary">{formatCurrency(selectedSpk.materialCost)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-text-muted">Actual Labor Cost</span>
                    <span className="font-medium text-text-primary">{formatCurrency(selectedSpk.jasaCost)}</span>
                  </div>
                  
                  <div className="border-t border-surface-border/50 pt-3 flex justify-between items-center">
                    <span className="text-sm font-bold text-text-primary">Total Modal (HPP)</span>
                    <span className="font-bold text-text-primary">{formatCurrency(selectedSpk.materialCost + selectedSpk.jasaCost)}</span>
                  </div>
                </div>

                <div className="bg-background rounded-lg border border-surface-border p-5 space-y-4">
                  <h3 className="text-lg font-medium text-text-primary border-b border-surface-border pb-2">Customer Billing</h3>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-text-muted">Paket Assembly List</span>
                    <span className="font-medium text-text-primary">{formatCurrency(selectedSpk.packageSellingPrice)}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-text-muted">Extra Item (Luar Paket)</span>
                    <span className="font-medium text-text-primary">{formatCurrency(selectedSpk.nonPackageMaterialCost)}</span>
                  </div>

                  {/* Change Orders (Addendum) Row & Collapsible Accordion */}
                  {(selectedSpk.amendmentCost !== 0 || approvedChangeOrders.length > 0) && (
                    <div className="border border-surface-border/80 rounded-lg p-3 bg-surface/40 space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-secondary font-medium">Change Orders (Addendum)</span>
                          {approvedChangeOrders.length > 0 && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold font-mono">
                              {approvedChangeOrders.length} APPROVED
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-secondary">
                            + {formatCurrency(selectedSpk.amendmentCost || approvedChangeOrders.reduce((s, c) => s + c.total_amount, 0))}
                          </span>
                          {approvedChangeOrders.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setIsCoAccordionOpen(prev => !prev)}
                              className="flex items-center gap-1 text-xs text-secondary hover:text-secondary/80 font-medium py-1 px-2 rounded hover:bg-surface-border/60 transition-colors cursor-pointer"
                              title="Buka atau tutup rincian pekerjaan tambahan amandemen"
                            >
                              <span>{isCoAccordionOpen ? 'Tutup Rincian' : 'Lihat Rincian'}</span>
                              {isCoAccordionOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Accordion / Collapsible Content */}
                      {isCoAccordionOpen && (
                        <div className="mt-3 pt-3 border-t border-surface-border/60 space-y-3">
                          <div className="p-2.5 rounded bg-surface border border-surface-border text-xs text-text-muted flex items-start gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold text-text-primary">Perlindungan Hukum & Sengketa:</span>
                              <p className="mt-0.5 text-[11px] leading-relaxed">
                                Rincian pekerjaan tambahan di bawah ini telah disetujui (Approved) secara resmi dan menjadi lampiran mengikat pada pelunasan serta faktur tagihan akhir.
                              </p>
                            </div>
                          </div>

                          {loadingChangeOrders ? (
                            <div className="p-3 text-center text-xs text-text-muted">
                              Memuat rincian Change Order...
                            </div>
                          ) : (
                            approvedChangeOrders.map((co) => (
                              <div key={co.id} className="bg-surface/70 border border-surface-border rounded-lg p-3 space-y-2 text-xs">
                                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-surface-border/50">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-text-primary bg-surface-border/60 px-1.5 py-0.5 rounded text-[11px]">
                                        {co.order_number || co.co_number}
                                      </span>
                                      <span className="font-medium text-text-primary">{co.description}</span>
                                    </div>
                                    <div className="text-[11px] text-text-muted flex items-center gap-3">
                                      <span>WBS: <strong className="text-text-primary">{co.wbs_stage}</strong></span>
                                      {co.approved_at && (
                                        <span>Disetujui: {new Date(co.approved_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold mr-2">
                                      APPROVED
                                    </span>
                                    <span className="font-bold text-secondary font-mono">
                                      + {formatCurrency(co.total_amount)}
                                    </span>
                                  </div>
                                </div>

                                {/* Items Table */}
                                {co.change_order_items && co.change_order_items.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-[11px] text-left">
                                      <thead>
                                        <tr className="text-text-muted border-b border-surface-border/40">
                                          <th className="py-1 pr-2">Uraian Pekerjaan / Material</th>
                                          <th className="py-1 px-2">WBS</th>
                                          <th className="py-1 px-2">Tipe</th>
                                          <th className="py-1 px-2 text-right">Qty</th>
                                          <th className="py-1 px-2 text-right">Harga</th>
                                          <th className="py-1 pl-2 text-right">Subtotal</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-surface-border/30">
                                        {co.change_order_items.map((item, idx) => (
                                          <tr key={item.id || idx} className="hover:bg-surface-border/20">
                                            <td className="py-1.5 pr-2 font-medium text-text-primary">
                                              {item.item_name}
                                              {item.notes && <span className="block text-[10px] text-text-muted font-normal">({item.notes})</span>}
                                            </td>
                                            <td className="py-1.5 px-2 text-text-muted">{item.wbs_stage || co.wbs_stage}</td>
                                            <td className="py-1.5 px-2">
                                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                                item.item_type === 'MATERIAL' ? 'bg-sky-500/10 text-sky-400' :
                                                item.item_type === 'LABOR' ? 'bg-amber-500/10 text-amber-400' :
                                                'bg-purple-500/10 text-purple-400'
                                              }`}>
                                                {item.item_type}
                                              </span>
                                            </td>
                                            <td className="py-1.5 px-2 text-right font-mono text-text-muted">
                                              {item.quantity} {item.unit || 'pcs'}
                                            </td>
                                            <td className="py-1.5 px-2 text-right font-mono text-text-muted">
                                              {formatCurrency(item.unit_price)}
                                            </td>
                                            <td className="py-1.5 pl-2 text-right font-mono font-semibold text-text-primary">
                                              {formatCurrency(item.subtotal)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-text-muted italic">Tidak ada rincian item individual.</p>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm pt-2">
                    <span className="text-text-muted font-medium">Penyesuaian (Manual)</span>
                    <div className="flex items-center gap-2">
                       <span className="text-xs text-text-muted">Rp</span>
                       <input 
                         type="number"
                         value={manualAdjustments[selectedSpk.id] || ''}
                         onChange={(e) => setManualAdjustments({...manualAdjustments, [selectedSpk.id]: Number(e.target.value)})}
                         placeholder="0"
                         className="w-24 bg-surface border border-surface-border rounded px-2 py-1 text-right text-sm text-text-primary focus:border-primary focus:outline-none"
                       />
                    </div>
                  </div>

                  <div className="border-t border-surface-border/50 pt-3 flex justify-between items-center">
                    <span className="text-sm font-bold text-text-primary">Total Harga Jual</span>
                    <span className="font-bold text-text-primary">{formatCurrency(selectedSpk.quotationAmount + selectedSpk.amendmentCost + (manualAdjustments[selectedSpk.id] || 0))}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm text-status-danger">
                    <span>Down Payment (DP)</span>
                    <span className="font-medium">- {formatCurrency(selectedSpk.dpAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Total Final */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-5 flex justify-between items-center mb-8">
                <span className="text-lg font-medium text-text-primary">Final Bill to Customer</span>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(Math.max(0, (selectedSpk.quotationAmount + selectedSpk.amendmentCost + (manualAdjustments[selectedSpk.id] || 0)) - selectedSpk.dpAmount))}
                </span>
              </div>

              {/* Actions - Only in FINAL Tab */}
              {activeTab === 'FINAL' && (
                <div className="flex flex-wrap justify-end gap-3 sm:gap-4">
                  {(selectedSpk.paymentStatus === 'UNPAID' || selectedSpk.paymentStatus === 'LUNAS') && (
                    <button
                      type="button"
                      onClick={() => {
                        const payload = buildInvoicePrintPayload(
                          selectedSpk,
                          approvedChangeOrders,
                          manualAdjustments[selectedSpk.id] || 0
                        );
                        printFinalInvoice(payload);
                      }}
                      className="px-4 py-2.5 rounded font-medium flex items-center gap-2 border border-secondary/50 text-secondary hover:bg-secondary/10 transition-all text-sm cursor-pointer"
                      title="Cetak Faktur Tagihan Akhir (Invoice) lengkap dengan rincian Change Orders"
                    >
                      <Printer className="w-4 h-4" />
                      Cetak Invoice
                    </button>
                  )}
                  {selectedSpk.paymentStatus === 'UNPAID' && (
                    <button
                      type="button"
                      onClick={requestCancelInvoice}
                      className="px-4 py-2.5 rounded font-medium flex items-center gap-2 border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500 transition-all text-sm cursor-pointer"
                    >
                      Batalkan Invoice
                    </button>
                  )}
                  <button
                    disabled={selectedSpk.qcStatus !== 'PASS' || selectedSpk.paymentStatus !== 'UNPAID'}
                    onClick={requestMarkAsPaid}
                    className={`px-4 py-2.5 rounded font-medium flex items-center gap-2 transition-all ${
                      selectedSpk.qcStatus === 'PASS' && selectedSpk.paymentStatus === 'UNPAID'
                        ? 'bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-md cursor-pointer'
                        : 'hidden'
                    }`}
                  >
                    Mark as Paid
                  </button>
                  <button
                    disabled={selectedSpk.qcStatus !== 'PASS' || selectedSpk.paymentStatus !== 'NO_INVOICE'}
                    onClick={requestGenerateInvoice}
                    className={`px-6 py-3 rounded font-medium flex items-center gap-2 transition-all ${
                      selectedSpk.qcStatus === 'PASS' && selectedSpk.paymentStatus === 'NO_INVOICE'
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 cursor-pointer'
                        : 'bg-surface-border text-text-muted cursor-not-allowed'
                    }`}
                  >
                    {selectedSpk.qcStatus !== 'PASS' && <Lock className="w-4 h-4" />}
                    Generate Final Bill (Invoice)
                  </button>
                  <button
                    disabled={selectedSpk.paymentStatus !== 'LUNAS' && selectedSpk.status !== 'COMPLETED'}
                    onClick={requestReleaseVehicle}
                    className={`px-6 py-3 rounded font-medium flex items-center gap-2 transition-all ${
                      selectedSpk.paymentStatus === 'LUNAS' || selectedSpk.status === 'COMPLETED'
                        ? 'bg-status-success text-white hover:bg-status-success/90 shadow-lg shadow-status-success/20 cursor-pointer'
                        : 'bg-surface-border text-text-muted cursor-not-allowed'
                    }`}
                  >
                    {selectedSpk.paymentStatus !== 'LUNAS' && selectedSpk.status !== 'COMPLETED' && <Lock className="w-4 h-4" />}
                    {selectedSpk.status === 'COMPLETED' ? 'Pratinjau & Cetak BAST' : 'Release Vehicle & Print BAST'}
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
        suggestedAmount={selectedSpk ? (selectedSpk.quotationAmount + selectedSpk.amendmentCost + (manualAdjustments[selectedSpk.id] || 0)) : 0}
        onSuccess={() => {
          setIsDpModalOpen(false);
          setSelectedSpkId(null);
          fetchSpks();
        }}
      />
      {/* BAST Handover Modal */}
      <BastModal
        isOpen={isBastModalOpen}
        onClose={() => setIsBastModalOpen(false)}
        spk={selectedBastSpk}
        autoPrint={false}
      />
      {/* Confirmation & Notification Modal */}
      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        variant={modalConfig.variant}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        hideCancel={modalConfig.hideCancel}
        isLoading={modalConfig.isLoading}
        onConfirm={modalConfig.onConfirm || closeModal}
        onCancel={closeModal}
      >
        {modalConfig.children}
      </ConfirmationModal>
    </div>
  );
};
