import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { SpkBoronganStatus } from '../types/database';
import { 
  Trash2, 
  RotateCcw, 
  ChevronsLeft, 
  Printer, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  PackageCheck,
  Calendar
} from 'lucide-react';
import { normalizeText } from '../utils/rabItemAllocation';
import { ConfirmationModal, type ConfirmationModalVariant } from './ConfirmationModal';

interface SpkBoronganPanelProps {
  spkId: string;
  wbsCategory: string;
  onClose: () => void;
}

interface SpkBorongan {
  id: string;
  worker_name: string;
  task_description?: string;
  contract_value: number;
  status: SpkBoronganStatus;
  progress_percentage: number;
  assignment_letter_no?: string;
  material_id?: string;
  rab_item_id?: string;
  change_order_item_id?: string;
  deadline_date?: string | null;
  created_at: string;
}

interface SpkDetail {
  spk_no: string;
  customer_name: string;
  vehicle_plate: string;
}

interface RabMaterial {
  id: string;
  quantity: number;
  unit?: string;
  wbs_category: string;
  wbs_stage?: string;
  description?: string;
  name?: string;
  material_name?: string;
  item_total?: number;
  unit_price?: number;
  cost_price?: number;
  material_id?: string;
  item_type?: 'MATERIAL' | 'LABOR' | string;
  sourceType?: 'RAB' | 'CHANGE_ORDER';
  is_change_order?: boolean;
  change_order_id?: string;
  changeOrderItemId?: string;
  package_source_id?: string | null;
  materials: {
    id: string;
    name: string;
    unit: string;
    unit_price?: number;
  } | null;
}

const formatCurrency = (val: number | null | undefined): string => {
  if (!val || isNaN(val)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(val);
};

const formatDeadlineDate = (dateStr?: string | null): string => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
  return dateStr;
};

export const SpkBoronganPanel: React.FC<SpkBoronganPanelProps> = ({ spkId, wbsCategory, onClose }) => {
  const cleanWbsCategory = wbsCategory.replace(/^WBS\s*\d+:\s*/i, '').trim();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<SpkBorongan[]>([]);
  
  // Labor Sources
  const [allLaborSources, setAllLaborSources] = useState<RabMaterial[]>([]);
  const [searchMaterial, setSearchMaterial] = useState('');
  
  // Interactive transfer state
  const [selectedRabItemForAssignment, setSelectedRabItemForAssignment] = useState<RabMaterial | null>(null);
  const [selectedSourceItem, setSelectedSourceItem] = useState<{
    id: string;
    isChangeOrder: boolean;
    name: string;
    rate: number;
  } | null>(null);

  // New assignment form
  const [workerName, setWorkerName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [contractValue, setContractValue] = useState<number | ''>('');
  const [deadlineDate, setDeadlineDate] = useState('');
  
  // Cut-off state
  const [cutOffId, setCutOffId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | ''>('');

  // Confirmation Modal state for cancelling assignment
  const [assignmentToCancel, setAssignmentToCancel] = useState<{ id: string; workerName: string } | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Notification / Alert Modal state
  const [notification, setNotification] = useState<{
    title: string;
    message: string;
    variant?: ConfirmationModalVariant;
  } | null>(null);
  
  const [spkDetail, setSpkDetail] = useState<SpkDetail | null>(null);

  const fetchSpkDetail = useCallback(async () => {
    const { data, error } = await supabase
      .from('spk')
      .select('spk_no, customer_name, vehicle_plate')
      .eq('id', spkId)
      .single();
    if (data) setSpkDetail(data as SpkDetail);
    if (error) console.error('Error fetching SPK:', error);
  }, [spkId]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('spk_borongan')
      .select('*')
      .eq('spk_id', spkId)
      .order('created_at', { ascending: false });
      
    if (data) {
      const filtered = (data as SpkBorongan[]).filter((item: any) => {
        if (!item.wbs_category) return true;
        const bCat = item.wbs_category.replace(/^WBS\s*\d+:\s*/i, '').trim().toLowerCase();
        return (
          bCat === cleanWbsCategory.toLowerCase() ||
          item.wbs_category.toLowerCase() === wbsCategory.toLowerCase()
        );
      });
      setRecords(filtered);
    }
    if (error) console.error('Error fetching SPK-B:', error);
    setLoading(false);
  }, [spkId, cleanWbsCategory, wbsCategory]);

  const fetchRabMaterials = useCallback(async () => {
    // Langkah 1: Dapatkan rab_estimation_id milik SPK
    let rabEstId: string | null = null;
    try {
      const { data: rabEst, error: rabError } = await supabase
        .from('rab_estimations')
        .select('id')
        .eq('spk_id', spkId)
        .maybeSingle();

      if (rabError) {
        console.error('Error fetching RAB estimation:', rabError);
      } else if (rabEst) {
        rabEstId = rabEst.id;
      }
    } catch (rabErr) {
      console.error('Error in rabEst query:', rabErr);
    }

    const combinedAvailable: RabMaterial[] = [];

    // Langkah 2: Ambil items dari rab_items join materials (HANYA item_type = 'LABOR')
    if (rabEstId) {
      const { data: itemsData, error: itemsError } = await supabase
        .from('rab_items')
        .select(`
          id,
          quantity,
          unit,
          wbs_category,
          description,
          item_total,
          unit_price,
          material_id,
          item_type,
          materials (
            id,
            name,
            unit,
            unit_price
          )
        `)
        .eq('rab_estimation_id', rabEstId)
        .eq('item_type', 'LABOR');

      if (itemsError) {
        console.error('Error fetching RAB items:', itemsError);
      } else if (itemsData) {
        // Filter kategori WBS yang cocok secara toleran & syarat wajib item_type === 'LABOR'
        const matchingCategory = (itemsData as any[]).filter(item => {
          if (item.item_type && item.item_type !== 'LABOR') return false;
          if (!item.wbs_category) return true;
          const itemCatClean = item.wbs_category.replace(/^WBS\s*\d+:\s*/i, '').trim().toLowerCase();
          return (
            itemCatClean === cleanWbsCategory.toLowerCase() ||
            item.wbs_category.toLowerCase() === wbsCategory.toLowerCase()
          );
        });

        matchingCategory.forEach((item: any) => {
          const rawName = item.materials?.name || item.description || 'Pekerjaan Borongan';
          combinedAvailable.push({
            ...item,
            wbs_stage: item.wbs_category,
            name: rawName,
            material_name: item.materials?.name || item.description,
            cost_price: item.cost_price || item.unit_price || 0,
            sourceType: 'RAB',
            is_change_order: false,
          });
        });
      }
    }

    // Langkah 5: Ambil data Change Order berstatus APPROVED bertipe LABOR untuk WBS ini
    try {
      const { data: coData, error: coErr } = await supabase
        .from('change_order_items')
        .select(`
          id,
          change_order_id,
          spk_id,
          material_id,
          item_name,
          quantity,
          unit,
          unit_price,
          cost_price,
          subtotal,
          notes,
          wbs_stage,
          item_type,
          package_source_id,
          change_orders!inner ( status, co_number )
        `)
        .eq('spk_id', spkId)
        .eq('item_type', 'LABOR')
        .eq('change_orders.status', 'APPROVED');

      if (coErr) {
        console.error('Error fetching Change Order LABOR items:', coErr);
      } else if (coData) {
        const coMatching = (coData as any[]).filter(item => {
          if ((item.item_type || '').toUpperCase() !== 'LABOR') return false;
          if (!item.wbs_stage) return true;
          const itemStageClean = item.wbs_stage.replace(/^WBS\s*\d+:\s*/i, '').trim().toLowerCase();
          return (
            itemStageClean === cleanWbsCategory.toLowerCase() ||
            item.wbs_stage.toLowerCase() === wbsCategory.toLowerCase()
          );
        });

        coMatching.forEach((ci: any) => {
          const qty = Number(ci.quantity || 1);
          const unitPrice = Number(ci.unit_price || 0);
          const subtotal = Number(ci.subtotal || qty * unitPrice);
          const rawName = ci.item_name || ci.notes || 'Pekerjaan Borongan Tambahan';

          combinedAvailable.push({
            id: ci.id,
            quantity: qty,
            unit: ci.unit || 'lot',
            wbs_category: ci.wbs_stage || wbsCategory,
            wbs_stage: ci.wbs_stage || wbsCategory,
            description: rawName,
            name: rawName,
            material_name: ci.item_name,
            item_total: subtotal,
            unit_price: unitPrice,
            cost_price: ci.cost_price || unitPrice,
            material_id: ci.material_id || undefined,
            item_type: 'LABOR',
            sourceType: 'CHANGE_ORDER',
            is_change_order: true,
            change_order_id: ci.change_order_id,
            changeOrderItemId: ci.id,
            package_source_id: ci.package_source_id || null,
            materials: null,
          });
        });
      }
    } catch (coFetchErr) {
      console.error('Error in fetching CO LABOR items:', coFetchErr);
    }

    setAllLaborSources(combinedAvailable);
  }, [spkId, cleanWbsCategory, wbsCategory]);

  useEffect(() => {
    void fetchSpkDetail();
    void fetchRecords();
    void fetchRabMaterials();
  }, [fetchSpkDetail, fetchRecords, fetchRabMaterials]);


  // Handler Transfer Material dari Panduan RAB / Change Order ke Form Penugasan Baru
  const handleSelectLaborItem = (item: any) => {
    const isCo = Boolean(
      item.is_change_order ||
      item.sourceType === 'CHANGE_ORDER' ||
      item.change_order_id ||
      item.changeOrderItemId ||
      item.package_source_id
    );
    const rawName = item.material_name || item.name || item.materials?.name || item.description || 'Pekerjaan Borongan';
    const subtotal = (typeof item.item_total === 'number' && item.item_total > 0)
      ? item.item_total
      : ((item.quantity || 0) * (item.materials?.unit_price || item.unit_price || 0));
    const rate = subtotal > 0 ? subtotal : (item.cost_price || item.unit_price || 0);

    setSelectedSourceItem({
      id: item.id,
      isChangeOrder: isCo,
      name: rawName,
      rate
    });
    setSelectedRabItemForAssignment(item);
    setTaskDescription(isCo ? (rawName.startsWith('[CO]') ? rawName : `[CO] ${rawName}`) : rawName);
    setContractValue(rate);
  };

  // Handler Batal Transfer / Reset Form
  const handleResetTransferredItem = () => {
    setSelectedSourceItem(null);
    setSelectedRabItemForAssignment(null);
    setTaskDescription('');
    setContractValue('');
  };

  // Handler Pembatalan / Penghapusan Penugasan SPK-B
  const promptCancelAssignment = (id: string, workerNameStr: string) => {
    setAssignmentToCancel({ id, workerName: workerNameStr });
  };

  const executeCancelAssignment = async () => {
    if (!assignmentToCancel) return;
    const { id, workerName: workerNameStr } = assignmentToCancel;

    setIsCancelling(true);
    try {
      const { error } = await supabase
        .from('spk_borongan')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAssignmentToCancel(null);
      setNotification({
        title: 'Penugasan Dibatalkan',
        message: `Penugasan "${workerNameStr}" berhasil dibatalkan. Pekerjaan ini telah dikembalikan ke panduan pagu jasa/pekerjaan.`,
        variant: 'success'
      });
      await fetchRecords();
      await fetchRabMaterials();
    } catch (err: any) {
      console.error('Error cancelling assignment:', err);
      setNotification({
        title: 'Gagal Membatalkan Penugasan',
        message: err.message || 'Terjadi kesalahan saat membatalkan penugasan.',
        variant: 'danger'
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !workerName || !taskDescription || contractValue === '') return;
    
    setLoading(true);

    let finalRabItemId: string | null = null;
    let finalChangeOrderItemId: string | null = null;
    let finalMaterialId: string | null = null;

    if (selectedSourceItem) {
      if (selectedSourceItem.isChangeOrder) {
        finalChangeOrderItemId = selectedSourceItem.id;
        finalRabItemId = null;
      } else {
        finalRabItemId = selectedSourceItem.id;
        finalChangeOrderItemId = null;
      }
      finalMaterialId = selectedRabItemForAssignment?.materials?.id || selectedRabItemForAssignment?.material_id || null;
    } else if (selectedRabItemForAssignment) {
      const isCo = Boolean(
        selectedRabItemForAssignment.is_change_order ||
        selectedRabItemForAssignment.sourceType === 'CHANGE_ORDER' ||
        selectedRabItemForAssignment.change_order_id
      );
      if (isCo) {
        finalChangeOrderItemId = selectedRabItemForAssignment.changeOrderItemId || selectedRabItemForAssignment.id;
        finalRabItemId = null;
      } else {
        finalRabItemId = selectedRabItemForAssignment.id;
        finalChangeOrderItemId = null;
      }
      finalMaterialId = selectedRabItemForAssignment.materials?.id || selectedRabItemForAssignment.material_id || null;
    } else if (taskDescription.trim()) {
      // Defensif: jika item tidak dipilih manual dari daftar kanan, cari kecocokan dari allLaborSources
      const isCoText = taskDescription.trim().toUpperCase().startsWith('[CO]');
      const cleanDesc = normalizeText(taskDescription.replace(/^\[CO\]\s*/i, '').trim());
      const normDesc = normalizeText(taskDescription.trim());

      const matched = allLaborSources.find(item => {
        const isItemCo = Boolean(item.is_change_order || item.sourceType === 'CHANGE_ORDER');
        if (isCoText !== isItemCo) return false;
        const rawName = (item.material_name || item.name || item.materials?.name || item.description || '').trim();
        const normName = normalizeText(rawName);
        return normName === cleanDesc || normName === normDesc;
      });

      if (matched) {
        const isMatchedCo = Boolean(matched.is_change_order || matched.sourceType === 'CHANGE_ORDER');
        if (isMatchedCo) {
          finalChangeOrderItemId = matched.changeOrderItemId || matched.id;
          finalRabItemId = null;
        } else {
          finalRabItemId = matched.id;
          finalChangeOrderItemId = null;
        }
        finalMaterialId = matched.materials?.id || matched.material_id || null;
      }
    }

    const { error } = await supabase.from('spk_borongan').insert({
      spk_id: spkId,
      wbs_category: cleanWbsCategory,
      worker_name: workerName.trim(),
      task_description: taskDescription.trim(),
      contract_value: Number(contractValue),
      deadline_date: deadlineDate ? deadlineDate : null,
      status: 'ACTIVE',
      material_id: finalMaterialId,
      rab_item_id: finalRabItemId,
      change_order_item_id: finalChangeOrderItemId,
      created_by: user.id
    });
    
    if (error) {
      console.error('Error creating SPK-B:', error);
      const isRlsError = error.message?.toLowerCase().includes('row-level security') || error.code === '42501';
      setNotification({
        title: 'Gagal Membuat SPK Borongan',
        message: isRlsError
          ? 'Pelanggaran izin akses (Row-Level Security). Silakan pastikan migrasi RLS spk_borongan telah dijalankan di database Supabase.'
          : (error.message || 'Terjadi kesalahan saat membuat SPK Borongan.'),
        variant: 'danger'
      });
    } else {
      setWorkerName('');
      setTaskDescription('');
      setContractValue('');
      setDeadlineDate('');
      setSelectedSourceItem(null);
      setSelectedRabItemForAssignment(null);
      await fetchRecords();
      await fetchRabMaterials();
    }
    setLoading(false);
  };

  const handleCutOff = async (id: string) => {
    if (progress === '' || Number(progress) < 0 || Number(progress) > 100) {
      setNotification({
        title: 'Validasi Persentase Progress',
        message: 'Persentase progres fisik harus bernilai antara 0 sampai 100%.',
        variant: 'warning'
      });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('spk_borongan').update({
      status: 'CUT_OFF',
      progress_percentage: Number(progress),
      updated_at: new Date().toISOString()
    }).eq('id', id);
    
    if (error) {
      console.error('Error in cut-off:', error);
      setNotification({
        title: 'Gagal Melakukan Cut-Off',
        message: error.message || 'Terjadi kesalahan saat melakukan cut-off penugasan.',
        variant: 'danger'
      });
    } else {
      setCutOffId(null);
      setProgress('');
      fetchRecords();
    }
    setLoading(false);
  };

  const handlePrint = async (record: SpkBorongan) => {
    let letterNo = record.assignment_letter_no;
    
    if (!letterNo) {
      const wbsCode = wbsCategory.split(':')[0].replace(/\s+/g, '-').toUpperCase();
      const sortedRecords = [...records].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const counterIndex = sortedRecords.findIndex(r => r.id === record.id) + 1;
      const counterString = counterIndex.toString().padStart(2, '0');
      letterNo = `ST-BORONG/${spkDetail?.spk_no || 'UNKNOWN'}/${wbsCode}/${counterString}`;

      const { error } = await supabase
        .from('spk_borongan')
        .update({ assignment_letter_no: letterNo })
        .eq('id', record.id);
        
      if (error) {
        console.error('Error updating assignment letter no:', error);
        setNotification({
          title: 'Gagal Membuat Nomor Surat Tugas',
          message: error.message || 'Terjadi kesalahan saat mengupdate nomor surat tugas resmi.',
          variant: 'danger'
        });
        return;
      }
      
      record.assignment_letter_no = letterNo;
      setRecords(prev => prev.map(r => r.id === record.id ? { ...r, assignment_letter_no: letterNo } : r));
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Surat Tugas Borongan - ${letterNo}</title>
          <style>
            @media print {
              @page { size: A4 portrait; margin: 20mm; }
              body { margin: 0; padding: 0; }
            }
            body { font-family: sans-serif; padding: 2rem; color: #000; }
            .header { text-align: center; border-bottom: 2px solid #000; margin-bottom: 1.5rem; padding-bottom: 1rem; }
            .header h1 { margin: 0 0 0.5rem 0; font-size: 1.5rem; }
            .header h2 { margin: 0; font-size: 1.25rem; font-weight: bold; text-decoration: underline; }
            .header p { margin: 0.5rem 0 0 0; font-weight: bold; }
            .section { margin-bottom: 1.5rem; }
            .section-title { font-weight: bold; margin-bottom: 0.5rem; border-bottom: 1px solid #ccc; padding-bottom: 0.25rem; }
            .row { display: flex; margin-bottom: 0.25rem; }
            .label { width: 150px; font-weight: bold; }
            .value { flex: 1; }
            .signatures { margin-top: 4rem; display: flex; justify-content: space-between; }
            .sig-box { text-align: center; width: 200px; }
            .sig-name { margin-top: 5rem; font-weight: bold; text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>SURAT PENUGASAN KERJA BORONGAN</h1>
            <h2>ROBEL KAROSERI</h2>
            <p>Nomor: ${letterNo}</p>
          </div>

          <div class="section">
            <div class="section-title">A. INFORMASI SPK UTAMA</div>
            <div class="row"><div class="label">No. SPK</div><div class="value">: ${spkDetail?.spk_no || '-'}</div></div>
            <div class="row"><div class="label">Customer</div><div class="value">: ${spkDetail?.customer_name || '-'}</div></div>
            <div class="row"><div class="label">No. Polisi</div><div class="value">: ${spkDetail?.vehicle_plate || '-'}</div></div>
          </div>

          <div class="section">
            <div class="section-title">B. DETAIL PENUGASAN BORONGAN</div>
            <div class="row"><div class="label">Tahapan WBS</div><div class="value">: ${wbsCategory}</div></div>
            <div class="row"><div class="label">Nama Pekerja/Mandor</div><div class="value">: <strong>${record.worker_name}</strong></div></div>
            <div class="row"><div class="label">Tugas/Uraian Kerja</div><div class="value">: ${record.task_description || '-'}</div></div>
            <div class="row"><div class="label">Nilai Kontrak</div><div class="value">: <strong>Rp ${record.contract_value.toLocaleString('id-ID')}</strong></div></div>
            <div class="row"><div class="label">Tenggat Waktu / Deadline</div><div class="value">: <strong>${formatDeadlineDate(record.deadline_date)}</strong></div></div>
            <div class="row"><div class="label">Tanggal Dikeluarkan</div><div class="value">: ${new Date(record.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div></div>
          </div>

          <div class="signatures">
            <div class="sig-box">
              <p>Pemberi Tugas,</p>
              <div class="sig-name">MANDOR / BENGKEL</div>
            </div>
            <div class="sig-box">
              <p>Penerima Tugas,</p>
              <div class="sig-name">${record.worker_name.toUpperCase()}</div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Filter ketersediaan pagu pekerjaan / jasa:
  // Mengecualikan item HANYA berdasarkan ID unik entitas (rab_item_id atau change_order_item_id)
  const availableLaborItems = useMemo(() => {
    // Kumpulkan set ID yang sudah pernah ditugaskan (status bukan CANCELLED atau CUT_OFF)
    const assignedRabItemIds = new Set(
      records
        .filter(a => (a.status as string) !== 'CANCELLED' && a.status !== 'CUT_OFF' && a.rab_item_id)
        .map(a => a.rab_item_id)
    );
    const assignedCoItemIds = new Set(
      records
        .filter(a => (a.status as string) !== 'CANCELLED' && a.status !== 'CUT_OFF' && a.change_order_item_id)
        .map(a => a.change_order_item_id)
    );

    // Kumpulkan deskripsi penugasan legacy (hanya untuk penugasan lawas di mana kedua ID bernilai null)
    const legacyAssignedDesc = new Set(
      records
        .filter(a => (a.status as string) !== 'CANCELLED' && a.status !== 'CUT_OFF' && !a.rab_item_id && !a.change_order_item_id)
        .map(a => normalizeText(a.task_description))
        .filter(Boolean)
    );

    // Filter item panduan gabungan
    return allLaborSources.filter(item => {
      if (item.item_type && item.item_type !== 'LABOR') return false;

      const itemStageClean = (item.wbs_stage || item.wbs_category || '').replace(/^WBS\s*\d+:\s*/i, '').trim().toLowerCase();
      if (itemStageClean && itemStageClean !== cleanWbsCategory.toLowerCase()) return false;

      const isCo = Boolean(
        item.is_change_order ||
        item.sourceType === 'CHANGE_ORDER' ||
        item.change_order_id ||
        item.changeOrderItemId
      );

      if (isCo) {
        // Jika asal Change Order, cek apakah change_order_item_id ini sudah ditugaskan
        const coId = item.changeOrderItemId || item.id;
        if (assignedCoItemIds.has(coId) || assignedCoItemIds.has(item.id)) return false;
      } else {
        // Jika asal RAB, cek apakah rab_item_id ini sudah ditugaskan
        if (assignedRabItemIds.has(item.id)) return false;
      }

      // Legacy fallback: hanya mengecek deskripsi jika ada penugasan lawas tanpa ID
      if (legacyAssignedDesc.size > 0 && !isCo) {
        const rawName = (item.material_name || item.name || item.materials?.name || item.description || '').trim();
        const normName = normalizeText(rawName);
        if (legacyAssignedDesc.has(normName)) return false;
      }

      return true;
    });
  }, [allLaborSources, records, cleanWbsCategory]);

  // Sembunyikan item yang sedang aktif dipilih di form penugasan (berdasarkan ID dan asal sumber)
  const availableToAssign = useMemo(() => {
    return availableLaborItems.filter(item => {
      if (!selectedSourceItem) return true;
      const isCo = Boolean(
        item.is_change_order ||
        item.sourceType === 'CHANGE_ORDER' ||
        item.change_order_id ||
        item.changeOrderItemId
      );
      if (isCo === selectedSourceItem.isChangeOrder) {
        if (item.id === selectedSourceItem.id || item.changeOrderItemId === selectedSourceItem.id) {
          return false;
        }
      }
      return true;
    });
  }, [availableLaborItems, selectedSourceItem]);

  // Filter teks pencarian mandiri
  const filteredMaterials = useMemo(() => {
    if (!searchMaterial.trim()) return availableToAssign;
    const term = searchMaterial.toLowerCase();
    return availableToAssign.filter(item => {
      const name = (item.material_name || item.name || item.materials?.name || item.description || '').toLowerCase();
      return name.includes(term);
    });
  }, [availableToAssign, searchMaterial]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-surface border border-border rounded-xl shadow-2xl max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-border flex justify-between items-center bg-surface">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <PackageCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-text">SPK Borongan</h2>
                {spkDetail?.spk_no && (
                  <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-primary/20 text-primary border border-primary/30">
                    {spkDetail.spk_no}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-text-muted mt-0.5">
                Tahapan WBS: <strong className="text-text font-semibold">{wbsCategory}</strong>
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 text-text-muted hover:text-text hover:bg-background rounded-lg transition-colors"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-background/50">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Bagian Kiri: Penugasan SPK-B (7 Kolom pada Desktop) */}
            <div className="lg:col-span-6 space-y-6 flex flex-col">
              
              {/* Kotak Riwayat Penugasan SPK-B (Kotak Hijau Muda) */}
              <div className="bg-surface/90 p-4 sm:p-5 rounded-xl shadow-sm border border-emerald-500/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                    <h3 className="font-bold text-sm sm:text-base text-text">Riwayat Penugasan SPK-B</h3>
                  </div>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    {records.length} Pekerja
                  </span>
                </div>

                {records.length === 0 ? (
                  <div className="p-4 text-center text-xs sm:text-sm text-text-muted border border-dashed border-emerald-500/20 rounded-lg">
                    Belum ada penugasan borongan untuk tahapan WBS ini.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-1">
                    {records.map(record => (
                      <div 
                        key={record.id} 
                        className="border border-border/80 rounded-lg p-3.5 flex flex-col gap-2.5 bg-background/80 hover:border-emerald-500/40 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-sm text-text">{record.worker_name}</p>
                            <p className="text-xs text-text-muted mt-0.5">
                              <span className="font-medium text-text">Tugas:</span> {record.task_description || '-'}
                            </p>
                            <p className="text-xs text-text-muted mt-0.5">
                              <span className="font-medium text-text">Nilai Kontrak:</span> <strong className="text-primary font-mono">{formatCurrency(record.contract_value)}</strong>
                            </p>
                            <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1.5">
                              <span className="font-medium text-text">Tenggat Waktu:</span>{' '}
                              {record.deadline_date ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-amber-400">
                                  <Calendar className="w-3 h-3 text-amber-400" />
                                  {formatDeadlineDate(record.deadline_date)}
                                </span>
                              ) : (
                                <span className="text-text-muted italic">-</span>
                              )}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                record.status === 'ACTIVE' 
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}>
                                {record.status}
                              </span>
                              {record.assignment_letter_no && (
                                <span className="text-[10px] font-mono text-text-muted">
                                  {record.assignment_letter_no}
                                </span>
                              )}
                            </div>
                            {record.status === 'CUT_OFF' && (
                              <p className="text-xs text-status-warning mt-1 font-semibold">
                                Progress Cut-Off: {record.progress_percentage}%
                              </p>
                            )}
                          </div>

                          {/* Tombol Aksi Cetak & Batalkan */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handlePrint(record)}
                              className="px-2.5 py-1 bg-surface border border-primary/40 text-primary rounded text-xs hover:bg-primary/10 flex items-center gap-1 transition-colors font-medium shadow-sm"
                              title="Cetak Surat Tugas"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Cetak</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => promptCancelAssignment(record.id, record.worker_name)}
                              className="px-2.5 py-1 bg-surface border border-rose-500/40 text-rose-400 rounded text-xs hover:bg-rose-500/10 hover:border-rose-500 flex items-center gap-1 transition-colors font-medium shadow-sm"
                              title="Batalkan / Hapus penugasan ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Batalkan</span>
                            </button>
                          </div>
                        </div>

                        {/* Opname Fisik Cut-Off Modal / Form */}
                        {record.status === 'ACTIVE' && (
                          <div className="pt-2 border-t border-border/60">
                            {cutOffId === record.id ? (
                              <div className="flex flex-col gap-2 p-2 rounded bg-surface border border-border">
                                <span className="text-xs text-text-muted">Input Persentase Fisik Saat Ini:</span>
                                <input 
                                  type="number" 
                                  placeholder="% Selesai" 
                                  className="px-2 py-1 border border-border rounded text-xs text-text bg-background font-mono font-bold"
                                  value={progress}
                                  onChange={(e) => setProgress(e.target.value === '' ? '' : Number(e.target.value))}
                                  min="0" max="100"
                                />
                                <div className="flex gap-2">
                                  <button onClick={() => handleCutOff(record.id)} className="flex-1 bg-primary text-white text-xs py-1 rounded font-semibold">Simpan</button>
                                  <button onClick={() => setCutOffId(null)} className="flex-1 bg-surface border border-border text-text text-xs py-1 rounded">Batal</button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => { setCutOffId(record.id); setProgress(''); }}
                                className="px-2.5 py-1 bg-surface border border-status-warning/40 text-status-warning rounded text-xs hover:bg-status-warning/10 transition-colors"
                              >
                                Opname Fisik
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Kotak Form Penugasan Baru SPK-B (Kotak Merah) */}
              <div className="bg-surface/90 p-4 sm:p-5 rounded-xl shadow-sm border border-rose-500/30 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                      <h3 className="font-bold text-sm sm:text-base text-text">Penugasan Baru SPK-B</h3>
                    </div>
                    {selectedRabItemForAssignment && (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                        selectedRabItemForAssignment.sourceType === 'CHANGE_ORDER'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          : 'bg-primary/20 text-primary border-primary/30'
                      }`}>
                        <CheckCircle2 className="w-3 h-3" />
                        {selectedRabItemForAssignment.sourceType === 'CHANGE_ORDER' ? 'Auto-Fill Change Order' : 'Auto-Fill RAB'}
                      </span>
                    )}
                  </div>

                  {/* Banner Transfer RAB / Change Order */}
                  {selectedRabItemForAssignment && (
                    <div className={`p-2.5 rounded-lg flex items-center justify-between text-xs mb-3 animate-in fade-in border ${
                      selectedRabItemForAssignment.sourceType === 'CHANGE_ORDER'
                        ? 'bg-purple-500/10 border-purple-500/30'
                        : 'bg-primary/10 border-primary/30'
                    }`}>
                      <div className="min-w-0 flex-1 pr-2">
                        <span className="text-[11px] text-text-muted">
                          {selectedRabItemForAssignment.sourceType === 'CHANGE_ORDER' ? 'Item Terpilih dari Change Order:' : 'Item Terpilih dari Panduan RAB:'}
                        </span>
                        <p className={`font-bold truncate mt-0.5 ${
                          selectedRabItemForAssignment.sourceType === 'CHANGE_ORDER' ? 'text-purple-300' : 'text-primary'
                        }`}>
                          {selectedRabItemForAssignment.sourceType === 'CHANGE_ORDER' && !selectedRabItemForAssignment.description?.startsWith('[CO]') ? '[CO] ' : ''}
                          {selectedRabItemForAssignment.materials?.name || selectedRabItemForAssignment.description}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleResetTransferredItem}
                        className="px-2 py-1 bg-surface border border-border hover:bg-background text-text-muted hover:text-rose-400 rounded flex items-center gap-1 transition-colors text-xs shrink-0"
                        title="Batal transfer & kembalikan item ke Panduan Pagu Jasa / Pekerjaan"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset</span>
                      </button>
                    </div>
                  )}

                  {records.some(r => r.status === 'ACTIVE') && (
                    <div className="bg-status-warning/10 border border-status-warning/30 text-status-warning p-2.5 rounded-lg mb-3 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Perhatian: Masih ada SPK-B aktif. Pastikan cut-off fisik jika pekerja diganti.</span>
                    </div>
                  )}

                  <form id="spk-b-form" onSubmit={handleCreate} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-text mb-1">
                        Nama Pekerja / Mandor Borong
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs sm:text-sm text-text focus:outline-none focus:border-primary"
                        value={workerName}
                        onChange={(e) => setWorkerName(e.target.value)}
                        placeholder="Contoh: Adi Las, Budi Ketok..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text mb-1">
                        Tugas / Uraian Pekerjaan
                      </label>
                      <textarea
                        required
                        rows={2}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs sm:text-sm text-text focus:outline-none focus:border-primary resize-none"
                        value={taskDescription}
                        onChange={(e) => setTaskDescription(e.target.value)}
                        placeholder="Contoh: TUKANG LAS DUDUKAN SLEBOR..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text mb-1">
                        Nilai Kontrak Borongan (Rp)
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs sm:text-sm font-mono font-bold text-text focus:outline-none focus:border-primary"
                        value={contractValue}
                        onChange={(e) => setContractValue(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label htmlFor="spk-b-deadline" className="block text-xs font-semibold text-text mb-1">
                        Tenggat Waktu / Tanggal Deadline Pengerjaan
                      </label>
                      <input
                        id="spk-b-deadline"
                        type="date"
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs sm:text-sm text-text focus:outline-none focus:border-primary font-mono"
                        value={deadlineDate}
                        onChange={(e) => setDeadlineDate(e.target.value)}
                      />
                    </div>
                  </form>
                </div>

                <div className="pt-3 mt-3 border-t border-border">
                  <button
                    type="submit"
                    form="spk-b-form"
                    disabled={loading || !workerName || !taskDescription || contractValue === ''}
                    className="w-full py-2.5 bg-primary text-white rounded-lg font-semibold text-xs sm:text-sm hover:bg-primary/90 disabled:opacity-40 transition-colors shadow-sm flex items-center justify-center gap-1.5"
                  >
                    {loading ? 'Menyimpan...' : 'Buat SPK Borongan'}
                  </button>
                </div>
              </div>

            </div>

            {/* Bagian Kanan: Panduan Pagu Jasa / Pekerjaan (RAB) (Kotak Biru / 6 Kolom pada Desktop) */}
            <div className="lg:col-span-6 bg-surface/90 p-4 sm:p-5 rounded-xl shadow-sm border border-blue-500/30 flex flex-col h-[480px] lg:h-[580px]">
              
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                    <h3 className="font-bold text-sm sm:text-base text-blue-400">Panduan Pagu Jasa / Pekerjaan (RAB)</h3>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 hidden sm:inline">
                      Khusus Jasa / Borongan
                    </span>
                  </div>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                    {filteredMaterials.length} Tersedia
                  </span>
                </div>
                <p className="text-xs text-text-muted mb-2">
                  Daftar pagu pekerjaan/jasa borongan yang dialokasikan untuk {wbsCategory}. Item yang sudah ditugaskan di SPK Borongan otomatis dikecualikan.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Cari nama pekerjaan/jasa..."
                    className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs sm:text-sm text-text focus:outline-none focus:border-blue-500"
                    value={searchMaterial}
                    onChange={(e) => setSearchMaterial(e.target.value)}
                  />
                  <span className="text-[11px] text-text-muted hidden sm:inline shrink-0">
                    Double-click atau klik &quot;&lt;&lt;&quot;
                  </span>
                </div>
              </div>
              
              {/* Tabel Scrollable Mandiri */}
              <div className="flex-1 overflow-y-auto border border-border/80 rounded-lg bg-background/80">
                {allLaborSources.length === 0 || availableLaborItems.length === 0 ? (
                  <div className="p-8 text-center text-xs sm:text-sm text-text-muted flex flex-col items-center justify-center h-full">
                    <CheckCircle2 className="w-8 h-8 text-blue-500/30 mb-2" />
                    <p className="font-semibold text-text">Tidak ada pagu pekerjaan/jasa tersisa untuk WBS ini.</p>
                    <p className="text-xs text-text-muted mt-1 max-w-xs">
                      Seluruh alokasi jasa borongan mungkin telah ditugaskan di SPK Borongan atau belum dialokasikan di estimasi RAB.
                    </p>
                  </div>
                ) : filteredMaterials.length === 0 ? (
                  <div className="p-8 text-center text-xs sm:text-sm text-text-muted flex flex-col items-center justify-center h-full">
                    <p>Tidak ada pekerjaan/jasa yang cocok dengan filter atau pencarian.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-surface border-b border-border sticky top-0 z-10 text-xs">
                      <tr>
                        <th className="px-3.5 py-2.5 font-bold text-text">Pekerjaan / Jasa Borongan</th>
                        <th className="px-2.5 py-2.5 font-bold text-text text-right w-16">Qty</th>
                        <th className="px-3 py-2.5 font-bold text-text text-right w-28 whitespace-nowrap">Pagu Subtotal</th>
                        <th className="px-2 py-2.5 font-bold text-center w-12">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredMaterials.map((item) => {
                        const itemName = item.materials?.name || item.description || 'Pekerjaan Borongan';
                        const itemUnit = item.materials?.unit || item.unit || 'lot';
                        const subtotal = (typeof item.item_total === 'number' && item.item_total > 0)
                          ? item.item_total
                          : ((item.quantity || 0) * (item.materials?.unit_price || item.unit_price || 0));
                        
                        return (
                          <tr 
                            key={item.id} 
                            onDoubleClick={() => handleSelectLaborItem(item)}
                            className="hover:bg-blue-500/10 cursor-pointer transition-colors group"
                            title="Double click atau klik tombol '<<' untuk transfer ke Form Penugasan"
                          >
                            <td className="px-3.5 py-2.5 text-text break-words min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {item.sourceType === 'CHANGE_ORDER' && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                    [CO]
                                  </span>
                                )}
                                <span className="font-semibold">{itemName}</span>
                              </div>
                            </td>
                            <td className="px-2.5 py-2.5 text-text text-right whitespace-nowrap font-mono">
                              {item.quantity} <span className="text-text-muted text-[10px]">{itemUnit}</span>
                            </td>
                            <td className="px-3 py-2.5 text-right whitespace-nowrap font-semibold font-mono text-blue-400">
                              {formatCurrency(subtotal)}
                            </td>
                            <td className="px-2 py-2.5 text-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectLaborItem(item);
                                }}
                                className="p-1 bg-blue-600 hover:bg-blue-500 text-white rounded shadow-sm transition-all"
                                title="Pindahkan ke form penugasan (<<)"
                              >
                                <ChevronsLeft className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Footer Panel Kanan */}
              <div className="pt-2.5 mt-2 flex justify-between items-center text-xs text-text-muted">
                <span>Pagu Jasa/Pekerjaan Tersedia:</span>
                <span className="font-bold text-text font-mono">
                  {filteredMaterials.length} Item
                </span>
              </div>

            </div>

          </div>
        </div>

        {/* Modal Konfirmasi Pembatalan Penugasan */}
        <ConfirmationModal
          isOpen={!!assignmentToCancel}
          title="Konfirmasi Pembatalan Penugasan"
          message={
            assignmentToCancel
              ? `Batalkan dan hapus penugasan untuk "${assignmentToCancel.workerName}"? Pekerjaan ini dapat dialihkan kembali ke pekerja lain.`
              : ''
          }
          confirmText="Ya, Batalkan Penugasan"
          cancelText="Batal"
          variant="danger"
          isLoading={isCancelling}
          onConfirm={executeCancelAssignment}
          onCancel={() => {
            if (!isCancelling) setAssignmentToCancel(null);
          }}
        />

        {/* Modal Pemberitahuan / Alert Dialog */}
        <ConfirmationModal
          isOpen={!!notification}
          title={notification?.title || 'Pemberitahuan'}
          message={notification?.message || ''}
          confirmText="Tutup"
          variant={notification?.variant || 'info'}
          hideCancel={true}
          onConfirm={() => setNotification(null)}
          onCancel={() => setNotification(null)}
        />

      </div>
    </div>
  );
};
