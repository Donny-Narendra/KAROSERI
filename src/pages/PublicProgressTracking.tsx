import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Check, Loader2, Printer, AlertTriangle, AlertCircle } from 'lucide-react';
import { getOptimizedImageUrl } from '../lib/cloudinary';

const WBS_CATEGORIES = [
  'Pembongkaran',
  'Sasis/Rangka',
  'Dinding/Fabrikasi',
  'Cat/Finishing',
  'Kelistrikan/Hidrolik'
];

const WBS_LABELS: Record<string, string> = {
  'Pembongkaran': 'WBS 1: Pembongkaran',
  'Sasis/Rangka': 'WBS 2: Sasis/Rangka',
  'Dinding/Fabrikasi': 'WBS 3: Dinding/Fabrikasi',
  'Cat/Finishing': 'WBS 4: Cat/Finishing',
  'Kelistrikan/Hidrolik': 'WBS 5: Kelistrikan/Hidrolik',
};

export const PublicProgressTracking: React.FC = () => {
  const { spk_no } = useParams<{ spk_no: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [spk, setSpk] = useState<any>(null);
  const [checklists, setChecklists] = useState<Record<string, any>>({});
  const [assets, setAssets] = useState<Record<string, any[]>>({});
  
  const [rateLimitReached, setRateLimitReached] = useState(false);

  useEffect(() => {
    if (!spk_no) {
      setError('Nomor SPK tidak valid.');
      setLoading(false);
      return;
    }

    // Rate Limiting Logic
    const today = new Date().toISOString().split('T')[0];
    const limitKey = `tracking_limit_${spk_no}_${today}`;
    const currentHits = parseInt(localStorage.getItem(limitKey) || '0', 10);

    if (currentHits >= 5) {
      setRateLimitReached(true);
      setLoading(false);
      return;
    }

    // Increment Hit
    localStorage.setItem(limitKey, (currentHits + 1).toString());

    fetchProgressData();
  }, [spk_no]);

  const fetchProgressData = async () => {
    setLoading(true);
    try {
      // Fetch SPK
      const { data: spkData, error: spkError } = await supabase
        .from('spk')
        .select('*')
        .eq('spk_no', spk_no)
        .maybeSingle();

      if (spkError) throw spkError;
      
      if (!spkData) {
        throw new Error('Data kendaraan tidak ditemukan.');
      }
      
      if (spkData.status === 'DRAFT' || spkData.dp_amount <= 0) {
        throw new Error('SPK Belum Aktif atau DP Belum Terverifikasi.');
      }

      setSpk(spkData);

      // Fetch Checklists
      const { data: checklistData, error: checkError } = await supabase
        .from('wbs_checklists')
        .select('*')
        .eq('spk_id', spkData.id);

      if (checkError) throw checkError;

      const checklistsMap: Record<string, any> = {};
      if (checklistData) {
        checklistData.forEach(item => {
          checklistsMap[item.wbs_category] = item;
        });
      }
      setChecklists(checklistsMap);

      // Fetch Assets
      const { data: assetData, error: assetError } = await supabase
        .from('spk_assets')
        .select('*')
        .eq('spk_id', spkData.id)
        .not('wbs_category', 'is', null);

      if (assetError) throw assetError;

      const assetsMap: Record<string, any[]> = {};
      WBS_CATEGORIES.forEach(cat => assetsMap[cat] = []);
      if (assetData) {
        assetData.forEach(item => {
          if (item.wbs_category && assetsMap[item.wbs_category]) {
            assetsMap[item.wbs_category].push(item);
          }
        });
      }
      setAssets(assetsMap);

    } catch (err: any) {
      console.error('Fetch error', err);
      setError(err.message || 'Gagal memuat data progres.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (rateLimitReached) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="bg-surface p-8 rounded-lg shadow-md max-w-md w-full text-center border-t-4 border-status-danger">
          <AlertTriangle className="w-16 h-16 text-status-danger mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Batas Akses Harian Tercapai</h2>
          <p className="text-text-muted mb-6">
            Batas akses harian untuk Nomor SPK ini telah tercapai (maksimal 5 kali per hari). Silakan coba lagi besok.
          </p>
          <button 
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-primary text-white rounded hover:bg-primary-hover transition"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center text-primary">
          <Loader2 className="w-12 h-12 animate-spin mb-4" />
          <p className="font-medium">Memuat Laporan Progres...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="bg-surface p-8 rounded-lg shadow-md max-w-md w-full text-center border-t-4 border-status-warning">
          <AlertCircle className="w-16 h-16 text-status-warning mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Pencarian Gagal</h2>
          <p className="text-text-muted mb-6">{error}</p>
          <button 
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-primary text-white rounded hover:bg-primary-hover transition"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  const totalProgress = Math.round(
    WBS_CATEGORIES.reduce((acc, cat) => acc + (checklists[cat]?.progress_percentage || 0), 0) / WBS_CATEGORIES.length
  );

  return (
    <div className="min-h-screen bg-background print:bg-white text-text print:text-black">
      {/* Non-Printable Header/Controls */}
      <div className="bg-surface border-b border-border p-4 print:hidden sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="font-display font-bold text-lg text-primary">Portal Pelanggan RobelKaroseri</h1>
            <p className="text-sm text-text-muted">Laporan Progres Pengerjaan Unit</p>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded hover:bg-primary-hover transition"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Unduh PDF</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-8 print:p-0">
        
        {/* Printable Header */}
        <div className="mb-8 border-b-2 border-primary/20 pb-6 print:border-black/20">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-3xl font-display font-bold text-primary print:text-black mb-1">Laporan Progres Kendaraan</h2>
              <p className="text-text-muted print:text-gray-600">Terakhir Diperbarui: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="text-right hidden print:block">
              <h3 className="font-bold text-xl">RobelKaroseri</h3>
              <p className="text-sm text-gray-600">Sistem Laporan Resmi</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-surface print:bg-gray-50 p-6 rounded-lg border border-border print:border-gray-200">
            <div>
              <p className="text-sm text-text-muted print:text-gray-500 mb-1">Nama Pelanggan</p>
              <p className="font-bold text-lg">{spk?.customer_name}</p>
            </div>
            <div>
              <p className="text-sm text-text-muted print:text-gray-500 mb-1">Nomor SPK</p>
              <p className="font-bold font-mono">{spk?.spk_no}</p>
            </div>
            <div>
              <p className="text-sm text-text-muted print:text-gray-500 mb-1">Nomor Rangka (VIN)</p>
              <p className="font-bold font-mono">{spk?.vehicle_number || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-text-muted print:text-gray-500 mb-1">Nomor Polisi</p>
              <p className="font-bold font-mono">{spk?.vehicle_plate || '-'}</p>
            </div>
          </div>
        </div>

        {/* Overall Progress */}
        <div className="mb-10">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            Penyelesaian Keseluruhan
          </h3>
          <div className="bg-surface print:bg-white p-6 rounded-lg border border-border print:border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <span className="font-medium text-lg">Total Progres WBS</span>
              <span className="text-3xl font-display font-bold text-primary print:text-black">{totalProgress}%</span>
            </div>
            <div className="w-full h-4 bg-background print:bg-gray-200 rounded-full overflow-hidden border border-border print:border-gray-300">
              <div 
                className="h-full bg-primary print:bg-black transition-all duration-1000"
                style={{ width: `${totalProgress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* WBS Details */}
        <div className="space-y-8">
          <h3 className="text-xl font-bold mb-4 border-b border-border print:border-gray-300 pb-2">Rincian Tahapan (WBS)</h3>
          
          {WBS_CATEGORIES.map((category) => {
            const data = checklists[category];
            const catAssets = assets[category] || [];
            const prog = data?.progress_percentage || 0;
            
            return (
              <div key={category} className="bg-surface print:bg-white p-6 rounded-lg border border-border print:border-gray-300 break-inside-avoid">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                  <div>
                    <h4 className="font-bold text-lg">{WBS_LABELS[category]}</h4>
                    {data?.notes && (
                      <p className="text-sm text-text-muted print:text-gray-600 mt-1 italic">Catatan: {data.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">Progres: {prog}%</span>
                    {prog === 100 && <Check className="w-5 h-5 text-green-500 print:text-black" />}
                  </div>
                </div>

                {/* Gallery 3-column Grid */}
                {catAssets.length > 0 ? (
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    {catAssets.map((asset, idx) => (
                      <div key={asset.id || idx} className="border border-border print:border-gray-300 rounded overflow-hidden aspect-square bg-background print:bg-gray-100 flex items-center justify-center relative">
                        <img 
                          src={getOptimizedImageUrl(asset.file_url, 400)} 
                          alt="WBS" 
                          className="w-full h-full object-cover"
                          crossOrigin="anonymous" // Helpful for printing if printing triggers CORS
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 p-4 text-center text-sm text-text-muted print:text-gray-500 border border-dashed border-border print:border-gray-300 rounded">
                    Belum ada dokumentasi foto.
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-border print:border-gray-300 text-center text-sm text-text-muted print:text-gray-500">
          <p>Laporan ini digenerate secara otomatis oleh sistem RobelKaroseri.</p>
          <p>Untuk pertanyaan lebih lanjut, silakan hubungi Customer Service kami.</p>
        </div>

      </div>
      
      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          @page { margin: 20mm; }
          /* Ensure images are printed */
          img {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* Hide non-printable elements forcefully */
          .print\\:hidden {
            display: none !important;
          }
        }
      ` }} />
    </div>
  );
};
