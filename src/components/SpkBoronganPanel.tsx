import React, { useState, useEffect } from 'react';
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
  PackageCheck 
} from 'lucide-react';
import { isRabItemAllocated } from '../utils/rabItemAllocation';

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
  wbs_category: string;
  description?: string;
  item_total?: number;
  unit_price?: number;
  material_id?: string;
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

export const SpkBoronganPanel: React.FC<SpkBoronganPanelProps> = ({ spkId, wbsCategory, onClose }) => {
  const cleanWbsCategory = wbsCategory.replace(/^WBS\s*\d+:\s*/i, '').trim();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<SpkBorongan[]>([]);
  
  // Rab Materials
  const [rabMaterials, setRabMaterials] = useState<RabMaterial[]>([]);
  const [searchMaterial, setSearchMaterial] = useState('');
  
  // Interactive transfer state
  const [selectedRabItemForAssignment, setSelectedRabItemForAssignment] = useState<RabMaterial | null>(null);

  // New assignment form
  const [workerName, setWorkerName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [contractValue, setContractValue] = useState<number | ''>('');
  
  // Cut-off state
  const [cutOffId, setCutOffId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | ''>('');
  
  const [spkDetail, setSpkDetail] = useState<SpkDetail | null>(null);

  useEffect(() => {
    fetchSpkDetail();
    fetchRecords();
    fetchRabMaterials();
  }, [spkId, wbsCategory]);

  const fetchSpkDetail = async () => {
    const { data, error } = await supabase
      .from('spk')
      .select('spk_no, customer_name, vehicle_plate')
      .eq('id', spkId)
      .single();
    if (data) setSpkDetail(data as SpkDetail);
    if (error) console.error('Error fetching SPK:', error);
  };

  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('spk_borongan')
      .select('*')
      .eq('spk_id', spkId)
      .eq('wbs_category', cleanWbsCategory)
      .order('created_at', { ascending: false });
      
    if (data) setRecords(data as SpkBorongan[]);
    if (error) console.error('Error fetching SPK-B:', error);
    setLoading(false);
  };

  const fetchRabMaterials = async () => {
    // Langkah 1: Dapatkan rab_estimation_id milik SPK
    const { data: rabEst, error: rabError } = await supabase
      .from('rab_estimations')
      .select('id')
      .eq('spk_id', spkId)
      .maybeSingle();

    if (rabError) {
      console.error('Error fetching RAB estimation:', rabError);
      setRabMaterials([]);
      return;
    }
    
    if (!rabEst) {
      setRabMaterials([]);
      return;
    }

    // Langkah 2: Ambil data Requisition aktif untuk mengecualikan material yang sudah diminta ke gudang
    let requisitionList: any[] = [];
    try {
      const { data: reqData } = await supabase
        .from('material_requisitions')
        .select(`
          id,
          status,
          material_requisition_items (
            material_id,
            materials ( name )
          )
        `)
        .eq('spk_id', spkId)
        .eq('wbs_category', cleanWbsCategory)
        .neq('status', 'REJECTED');

      if (reqData) {
        requisitionList = reqData;
      }
    } catch (reqErr) {
      console.error('Error fetching requisitions for exclusion:', reqErr);
    }

    // Langkah 3: Ambil penugasan SPK Borongan aktif untuk mengecualikan material yang sudah ditugaskan ke pekerja
    let activeAssignments: any[] = [];
    try {
      const { data: spkBData } = await supabase
        .from('spk_borongan')
        .select('id, material_id, rab_item_id, task_description, status, wbs_category')
        .eq('spk_id', spkId)
        .neq('status', 'CUT_OFF');

      if (spkBData) {
        activeAssignments = spkBData.filter((item: any) => {
          if (!item.wbs_category) return true;
          const bCat = item.wbs_category.replace(/^WBS\s*\d+:\s*/i, '').trim().toLowerCase();
          return (
            bCat === cleanWbsCategory.toLowerCase() ||
            item.wbs_category.toLowerCase() === wbsCategory.toLowerCase()
          );
        });
      }
    } catch (spkBErr) {
      console.error('Error fetching SPK-B for exclusion:', spkBErr);
    }

    // Langkah 4: Ambil items dari rab_items join materials
    const { data: itemsData, error: itemsError } = await supabase
      .from('rab_items')
      .select(`
        id,
        quantity,
        wbs_category,
        description,
        item_total,
        material_id,
        materials (
          id,
          name,
          unit,
          unit_price
        )
      `)
      .eq('rab_estimation_id', rabEst.id);

    if (itemsError) {
      console.error('Error fetching RAB items:', itemsError);
      setRabMaterials([]);
    } else if (itemsData) {
      // Filter kategori WBS yang cocok secara toleran
      const matchingCategory = (itemsData as any[]).filter(item => {
        if (!item.wbs_category) return true;
        const itemCatClean = item.wbs_category.replace(/^WBS\s*\d+:\s*/i, '').trim().toLowerCase();
        return (
          itemCatClean === cleanWbsCategory.toLowerCase() ||
          item.wbs_category.toLowerCase() === wbsCategory.toLowerCase()
        );
      });

      // Filter eksklusi material yang sudah masuk ke Requisition atau sudah ditugaskan di SPK Borongan
      const nonAllocated = matchingCategory.filter(item => {
        return !isRabItemAllocated(item, requisitionList, activeAssignments);
      });

      setRabMaterials(nonAllocated as unknown as RabMaterial[]);
    }
  };

  // Handler Transfer Material dari Panduan RAB ke Form Penugasan Baru
  const handleSelectMaterialForAssignment = (item: RabMaterial) => {
    const itemName = item.materials?.name || item.description || 'Pekerjaan Borongan';
    const subtotal = (typeof item.item_total === 'number' && item.item_total > 0)
      ? item.item_total
      : ((item.quantity || 0) * (item.materials?.unit_price || item.unit_price || 0));

    setSelectedRabItemForAssignment(item);
    setTaskDescription(itemName);
    setContractValue(subtotal);
  };

  // Handler Batal Transfer / Reset Form
  const handleResetTransferredItem = () => {
    setSelectedRabItemForAssignment(null);
    setTaskDescription('');
    setContractValue('');
  };

  // Handler Pembatalan / Penghapusan Penugasan SPK-B
  const handleCancelAssignment = async (id: string, workerNameStr: string) => {
    if (!window.confirm(`Batalkan dan hapus penugasan untuk "${workerNameStr}"? Pekerjaan ini dapat dialihkan kembali ke pekerja lain.`)) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('spk_borongan')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert(`Penugasan "${workerNameStr}" berhasil dibatalkan.`);
      await fetchRecords();
      await fetchRabMaterials();
    } catch (err: any) {
      console.error('Error cancelling assignment:', err);
      alert('Gagal membatalkan penugasan: ' + (err.message || 'Terjadi kesalahan'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !workerName || !taskDescription || contractValue === '') return;
    
    setLoading(true);
    const { error } = await supabase.from('spk_borongan').insert({
      spk_id: spkId,
      wbs_category: cleanWbsCategory,
      worker_name: workerName.trim(),
      task_description: taskDescription.trim(),
      contract_value: Number(contractValue),
      material_id: selectedRabItemForAssignment?.materials?.id || selectedRabItemForAssignment?.material_id || null,
      rab_item_id: selectedRabItemForAssignment?.id || null,
      created_by: user.id
    });
    
    if (error) {
      console.error('Error creating SPK-B:', error);
      alert('Gagal membuat SPK Borongan: ' + error.message);
    } else {
      setWorkerName('');
      setTaskDescription('');
      setContractValue('');
      setSelectedRabItemForAssignment(null);
      await fetchRecords();
      await fetchRabMaterials();
    }
    setLoading(false);
  };

  const handleCutOff = async (id: string) => {
    if (progress === '' || Number(progress) < 0 || Number(progress) > 100) {
      alert('Progress harus 0 - 100');
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
      alert('Gagal melakukan Cut-Off');
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
        alert('Gagal membuat nomor surat tugas.');
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

  // Filter daftar material:
  // 1. Sembunyikan jika sedang ditransfer ke form penugasan saat ini
  // 2. Sembunyikan jika sudah aktif ditugaskan di riwayat SPK-B (reaktif terhadap state lokal)
  // 3. Filter pencarian teks
  const filteredMaterials = rabMaterials.filter(m => {
    if (selectedRabItemForAssignment && (
      selectedRabItemForAssignment.id === m.id || 
      (selectedRabItemForAssignment.materials?.id && selectedRabItemForAssignment.materials.id === m.materials?.id)
    )) {
      return false;
    }
    const isAlreadyAssigned = isRabItemAllocated(m, null, records);
    if (isAlreadyAssigned) {
      return false;
    }
    const itemName = (m.materials?.name || m.description || '').toLowerCase();
    return itemName.includes(searchMaterial.toLowerCase());
  });

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
                              onClick={() => handleCancelAssignment(record.id, record.worker_name)}
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
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Auto-Fill RAB
                      </span>
                    )}
                  </div>

                  {/* Banner Transfer RAB */}
                  {selectedRabItemForAssignment && (
                    <div className="bg-primary/10 border border-primary/30 p-2.5 rounded-lg flex items-center justify-between text-xs mb-3 animate-in fade-in">
                      <div className="min-w-0 flex-1 pr-2">
                        <span className="text-[11px] text-text-muted">Item Terpilih dari Panduan RAB:</span>
                        <p className="font-bold text-primary truncate mt-0.5">
                          {selectedRabItemForAssignment.materials?.name || selectedRabItemForAssignment.description}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleResetTransferredItem}
                        className="px-2 py-1 bg-surface border border-border hover:bg-background text-text-muted hover:text-rose-400 rounded flex items-center gap-1 transition-colors text-xs shrink-0"
                        title="Batal transfer & kembalikan item ke Panduan Material"
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

            {/* Bagian Kanan: Panduan Material (RAB) (Kotak Biru / 6 Kolom pada Desktop) */}
            <div className="lg:col-span-6 bg-surface/90 p-4 sm:p-5 rounded-xl shadow-sm border border-blue-500/30 flex flex-col h-[480px] lg:h-[580px]">
              
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                    <h3 className="font-bold text-sm sm:text-base text-blue-400">Panduan Material (RAB)</h3>
                  </div>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                    {filteredMaterials.length} Tersedia
                  </span>
                </div>
                <p className="text-xs text-text-muted mb-2">
                  Daftar material yang dialokasikan untuk {wbsCategory}. Item yang sudah diajukan via Requisition atau ditugaskan di SPK Borongan otomatis dikecualikan.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Cari nama material..."
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
                {rabMaterials.length === 0 ? (
                  <div className="p-8 text-center text-xs sm:text-sm text-text-muted flex flex-col items-center justify-center h-full">
                    <CheckCircle2 className="w-8 h-8 text-blue-500/30 mb-2" />
                    <p className="font-semibold text-text">Tidak ada material tersisa untuk WBS ini.</p>
                    <p className="text-xs text-text-muted mt-1 max-w-xs">
                      Seluruh material mungkin telah diajukan ke gudang (Requisition), ditugaskan di SPK Borongan, atau belum dialokasikan di estimasi.
                    </p>
                  </div>
                ) : filteredMaterials.length === 0 ? (
                  <div className="p-8 text-center text-xs sm:text-sm text-text-muted flex flex-col items-center justify-center h-full">
                    <p>Tidak ada material yang cocok dengan filter atau pencarian.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-surface border-b border-border sticky top-0 z-10 text-xs">
                      <tr>
                        <th className="px-3.5 py-2.5 font-bold text-text">Nama Material / Item</th>
                        <th className="px-2.5 py-2.5 font-bold text-text text-right w-16">Qty</th>
                        <th className="px-3 py-2.5 font-bold text-text text-right w-28 whitespace-nowrap">Subtotal</th>
                        <th className="px-2 py-2.5 font-bold text-center w-12">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredMaterials.map((item) => {
                        const itemName = item.materials?.name || item.description || 'Item Pekerjaan';
                        const itemUnit = item.materials?.unit || 'item';
                        const subtotal = (typeof item.item_total === 'number' && item.item_total > 0)
                          ? item.item_total
                          : ((item.quantity || 0) * (item.materials?.unit_price || item.unit_price || 0));
                        
                        return (
                          <tr 
                            key={item.id} 
                            onDoubleClick={() => handleSelectMaterialForAssignment(item)}
                            className="hover:bg-blue-500/10 cursor-pointer transition-colors group"
                            title="Double click atau klik tombol '<<' untuk transfer ke Form Penugasan"
                          >
                            <td className="px-3.5 py-2.5 text-text break-words min-w-0">
                              <span className="font-semibold">{itemName}</span>
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
                                  handleSelectMaterialForAssignment(item);
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
                <span>Material RAB Tersedia:</span>
                <span className="font-bold text-text font-mono">
                  {filteredMaterials.length} Item
                </span>
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
