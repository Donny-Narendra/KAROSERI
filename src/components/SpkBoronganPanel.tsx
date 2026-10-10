import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { SpkBoronganStatus } from '../types/database';

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
  created_at: string;
}

interface RabMaterial {
  id: string;
  quantity: number;
  wbs_category: string;
  description?: string;
  materials: {
    id: string;
    name: string;
    unit: string;
  } | null;
}

export const SpkBoronganPanel: React.FC<SpkBoronganPanelProps> = ({ spkId, wbsCategory, onClose }) => {
  const cleanWbsCategory = wbsCategory.replace(/^WBS\s*\d+:\s*/i, '').trim();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<SpkBorongan[]>([]);
  
  // Rab Materials
  const [rabMaterials, setRabMaterials] = useState<RabMaterial[]>([]);
  const [searchMaterial, setSearchMaterial] = useState('');
  
  // New assignment form
  const [workerName, setWorkerName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [contractValue, setContractValue] = useState<number | ''>('');
  
  // Cut-off state
  const [cutOffId, setCutOffId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | ''>('');

  useEffect(() => {
    fetchRecords();
    fetchRabMaterials();
  }, [spkId, wbsCategory]);

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

    // Langkah 2: Ambil items dari rab_items join materials
    const { data: itemsData, error: itemsError } = await supabase
      .from('rab_items')
      .select(`
        id,
        quantity,
        wbs_category,
        description,
        materials (
          id,
          name,
          unit
        )
      `)
      .eq('rab_estimation_id', rabEst.id)
      .eq('wbs_category', cleanWbsCategory);

    if (itemsError) {
      console.error('Error fetching RAB items:', itemsError);
      setRabMaterials([]);
    } else if (itemsData) {
      setRabMaterials(itemsData as unknown as RabMaterial[]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !workerName || !taskDescription || contractValue === '') return;
    
    setLoading(true);
    const { error } = await supabase.from('spk_borongan').insert({
      spk_id: spkId,
      wbs_category: cleanWbsCategory,
      worker_name: workerName,
      task_description: taskDescription,
      contract_value: Number(contractValue),
      created_by: user.id
    });
    
    if (error) {
      console.error('Error creating SPK-B:', error);
      alert('Gagal membuat SPK Borongan');
    } else {
      setWorkerName('');
      setTaskDescription('');
      setContractValue('');
      fetchRecords();
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

  const handlePrint = (record: SpkBorongan) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>SPK Borongan - ${record.worker_name}</title>
          <style>
            body { font-family: sans-serif; padding: 2rem; }
            .header { text-align: center; border-bottom: 2px solid #000; margin-bottom: 2rem; padding-bottom: 1rem; }
            .details { margin-bottom: 2rem; }
            .details div { margin-bottom: 0.5rem; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>SURAT PERINTAH KERJA (BORONGAN)</h2>
          </div>
          <div class="details">
            <div><strong>WBS Kategori:</strong> ${wbsCategory}</div>
            <div><strong>Nama Pekerja:</strong> ${record.worker_name}</div>
            <div><strong>Tugas/Uraian:</strong> ${record.task_description || '-'}</div>
            <div><strong>Nilai Kontrak:</strong> Rp ${record.contract_value.toLocaleString('id-ID')}</div>
            <div><strong>Tanggal:</strong> ${new Date(record.created_at).toLocaleDateString('id-ID')}</div>
            <div><strong>Status:</strong> ${record.status}</div>
          </div>
          <div style="margin-top: 4rem; display: flex; justify-content: space-between;">
            <div style="text-align: center;">
              <p>Pemberi Kerja</p>
              <br/><br/><br/>
              <p>( Mandor )</p>
            </div>
            <div style="text-align: center;">
              <p>Penerima Kerja</p>
              <br/><br/><br/>
              <p>( ${record.worker_name} )</p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const filteredMaterials = rabMaterials.filter(m => 
    (m.materials?.name || m.description || '').toLowerCase().includes(searchMaterial.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center bg-surface">
          <h2 className="text-lg font-bold text-text">SPK Borongan - {wbsCategory}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text">&times;</button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 bg-background">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Bagian Kiri: Penugasan SPK-B */}
            <div className="space-y-6">
              <div className="bg-surface p-4 rounded-lg shadow-sm border border-border">
                <h3 className="font-semibold mb-4 text-text">Riwayat Penugasan SPK-B</h3>
                {records.length === 0 ? (
                  <p className="text-sm text-text-muted">Belum ada penugasan borongan untuk WBS ini.</p>
                ) : (
                  <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                    {records.map(record => (
                      <div key={record.id} className="border border-border rounded p-4 flex flex-col gap-3 bg-background">
                        <div>
                          <p className="font-bold text-text">{record.worker_name}</p>
                          <p className="text-sm text-text-muted mt-1"><span className="font-medium">Tugas:</span> {record.task_description || '-'}</p>
                          <p className="text-sm text-text-muted mt-1"><span className="font-medium">Nilai Kontrak:</span> Rp {record.contract_value.toLocaleString('id-ID')}</p>
                          <p className="text-sm text-text-muted mt-1"><span className="font-medium">Status:</span> <span className="font-medium text-primary">{record.status}</span></p>
                          {record.status === 'CUT_OFF' && (
                            <p className="text-sm text-text-muted mt-1"><span className="font-medium">Progress Cut-Off:</span> {record.progress_percentage}%</p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handlePrint(record)}
                            className="px-3 py-1 bg-surface border border-primary text-primary rounded text-sm hover:bg-primary/10"
                          >
                            Cetak
                          </button>
                          {record.status === 'ACTIVE' && (
                            cutOffId === record.id ? (
                              <div className="flex flex-col gap-2 border border-border p-2 rounded bg-surface w-full mt-2">
                                <input 
                                  type="number" 
                                  placeholder="% Selesai" 
                                  className="px-2 py-1 border border-border rounded text-sm text-text bg-background"
                                  value={progress}
                                  onChange={(e) => setProgress(e.target.value === '' ? '' : Number(e.target.value))}
                                  min="0" max="100"
                                />
                                <div className="flex gap-2">
                                  <button onClick={() => handleCutOff(record.id)} className="flex-1 bg-primary text-white text-xs py-1 rounded">Simpan</button>
                                  <button onClick={() => setCutOffId(null)} className="flex-1 bg-surface border border-border text-text text-xs py-1 rounded">Batal</button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setCutOffId(record.id); setProgress(''); }}
                                className="px-3 py-1 bg-surface border border-status-warning text-status-warning rounded text-sm hover:bg-status-warning/10"
                              >
                                Opname Fisik
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-surface p-4 rounded-lg shadow-sm border border-border">
                <h3 className="font-semibold mb-4 text-text">Penugasan Baru SPK-B</h3>
                {records.some(r => r.status === 'ACTIVE') && (
                  <div className="bg-status-warning/10 border border-status-warning text-status-warning p-3 rounded mb-4 text-sm">
                    Peringatan: Masih ada SPK Borongan aktif. Pastikan cut-off/opname fisik jika pekerja diganti.
                  </div>
                )}
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">Nama Pekerja / Mandor Borong</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
                      value={workerName}
                      onChange={(e) => setWorkerName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">Tugas / Uraian Pekerjaan</label>
                    <textarea
                      required
                      rows={2}
                      className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-primary resize-none"
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      placeholder="Contoh: Pengelasan rangka bak..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">Nilai Kontrak Borongan (Rp)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
                      value={contractValue}
                      onChange={(e) => setContractValue(Number(e.target.value))}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !workerName || !taskDescription || contractValue === ''}
                    className="w-full py-2 bg-primary text-white rounded font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Menyimpan...' : 'Buat SPK Borongan'}
                  </button>
                </form>
              </div>
            </div>

            {/* Bagian Kanan: Material Terencana (RAB) */}
            <div className="bg-surface p-4 rounded-lg shadow-sm border border-border h-full flex flex-col">
              <div className="mb-4">
                <h3 className="font-semibold text-text mb-2">Panduan Material (RAB)</h3>
                <p className="text-sm text-text-muted mb-4">
                  Daftar material yang telah dialokasikan untuk {wbsCategory}.
                </p>
                <input
                  type="text"
                  placeholder="Cari nama material..."
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
                  value={searchMaterial}
                  onChange={(e) => setSearchMaterial(e.target.value)}
                />
              </div>
              
              <div className="flex-1 overflow-y-auto border border-border rounded bg-background">
                {rabMaterials.length === 0 ? (
                  <div className="p-4 text-center text-sm text-text-muted">
                    Tidak ada material terencana untuk WBS ini.
                  </div>
                ) : filteredMaterials.length === 0 ? (
                  <div className="p-4 text-center text-sm text-text-muted">
                    Material tidak ditemukan.
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface border-b border-border sticky top-0">
                      <tr>
                        <th className="px-4 py-2 font-medium text-text">Nama Material</th>
                        <th className="px-4 py-2 font-medium text-text text-right w-24">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredMaterials.map((item) => {
                        const itemName = item.materials?.name || item.description || 'Item Pekerjaan';
                        const itemUnit = item.materials?.unit || 'item';
                        
                        return (
                          <tr key={item.id} className="hover:bg-surface/50">
                            <td className="px-4 py-3 text-text">
                              {itemName}
                            </td>
                            <td className="px-4 py-3 text-text text-right whitespace-nowrap">
                              {item.quantity} <span className="text-text-muted text-xs">{itemUnit}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
