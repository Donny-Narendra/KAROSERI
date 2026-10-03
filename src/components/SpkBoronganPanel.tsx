import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { SpkBoronganStatus } from '../types/database';

interface SpkBoronganPanelProps {
  spkId: string;
  wbsCategory: string; // casted to WbsCategory later or kept string
  onClose: () => void;
}

interface SpkBorongan {
  id: string;
  worker_name: string;
  contract_value: number;
  status: SpkBoronganStatus;
  progress_percentage: number;
  created_at: string;
}

export const SpkBoronganPanel: React.FC<SpkBoronganPanelProps> = ({ spkId, wbsCategory, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<SpkBorongan[]>([]);
  
  // New assignment form
  const [workerName, setWorkerName] = useState('');
  const [contractValue, setContractValue] = useState<number | ''>('');
  
  // Cut-off state
  const [cutOffId, setCutOffId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | ''>('');

  useEffect(() => {
    fetchRecords();
  }, [spkId, wbsCategory]);

  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('spk_borongan')
      .select('*')
      .eq('spk_id', spkId)
      .eq('wbs_category', wbsCategory)
      .order('created_at', { ascending: false });
      
    if (data) setRecords(data as SpkBorongan[]);
    if (error) console.error('Error fetching SPK-B:', error);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !workerName || contractValue === '') return;
    
    setLoading(true);
    const { error } = await supabase.from('spk_borongan').insert({
      spk_id: spkId,
      wbs_category: wbsCategory,
      worker_name: workerName,
      contract_value: Number(contractValue),
      created_by: user.id
    });
    
    if (error) {
      console.error('Error creating SPK-B:', error);
      alert('Gagal membuat SPK Borongan');
    } else {
      setWorkerName('');
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="text-lg font-bold text-text">SPK Borongan - {wbsCategory}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text">&times;</button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          {/* List existing assignments */}
          <div>
            <h3 className="font-semibold mb-4 text-text">Riwayat Penugasan SPK-B</h3>
            {records.length === 0 ? (
              <p className="text-sm text-text-muted">Belum ada penugasan borongan untuk WBS ini.</p>
            ) : (
              <div className="space-y-4">
                {records.map(record => (
                  <div key={record.id} className="border border-border rounded p-4 flex flex-col sm:flex-row justify-between gap-4 bg-background">
                    <div>
                      <p className="font-bold text-text">{record.worker_name}</p>
                      <p className="text-sm text-text-muted">Nilai Kontrak: Rp {record.contract_value.toLocaleString('id-ID')}</p>
                      <p className="text-sm text-text-muted">Status: <span className="font-medium text-primary">{record.status}</span></p>
                      {record.status === 'CUT_OFF' && (
                        <p className="text-sm text-text-muted">Progress Cut-Off: {record.progress_percentage}%</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 min-w-[120px]">
                      <button
                        onClick={() => handlePrint(record)}
                        className="px-3 py-1 bg-surface border border-primary text-primary rounded text-sm hover:bg-primary/10"
                      >
                        Cetak SPK-B
                      </button>
                      {record.status === 'ACTIVE' && (
                        cutOffId === record.id ? (
                          <div className="flex flex-col gap-2 border border-border p-2 rounded bg-surface">
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

          <div className="border-t border-border pt-6">
            <h3 className="font-semibold mb-4 text-text">Penugasan Baru SPK-B</h3>
            {records.some(r => r.status === 'ACTIVE') && (
              <div className="bg-status-warning/10 border border-status-warning text-status-warning p-3 rounded mb-4 text-sm">
                Masih ada SPK Borongan yang aktif. Pastikan melakukan Opname Fisik (Cut-Off) sebelum memberikan SPK Borongan baru jika orangnya diganti.
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Nama Pekerja / Mandor Borong</label>
                <input
                  type="text"
                  required
                  className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
                  value={workerName}
                  onChange={(e) => setWorkerName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Nilai Kontrak Borongan (Rp)</label>
                <input
                  type="number"
                  required
                  min="0"
                  className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
                  value={contractValue}
                  onChange={(e) => setContractValue(Number(e.target.value))}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !workerName || contractValue === ''}
                className="w-full py-2 bg-primary text-white rounded font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? 'Menyimpan...' : 'Buat SPK Borongan'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
