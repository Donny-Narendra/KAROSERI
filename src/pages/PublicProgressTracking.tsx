import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { 
  Check, Loader2, Printer, AlertTriangle, AlertCircle, ClipboardList,
  CheckCircle2, FileText, X
} from 'lucide-react';
import { getOptimizedImageUrl } from '../lib/cloudinary';
import { checkTrackingExpiration } from '../utils/trackingExpiration';

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
  const [agreementLightbox, setAgreementLightbox] = useState<any | null>(null);
  
  const [rateLimitReached, setRateLimitReached] = useState(false);

  const fetchProgressData = useCallback(async () => {
    if (!spk_no) return;
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
  }, [spk_no]);

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

    void fetchProgressData();
  }, [spk_no, fetchProgressData]);

  const isTrackingExpired = useMemo(() => {
    const handoverDate = spk?.released_at || spk?.bast_printed_at;
    if (!handoverDate) return false;

    const releaseTime = new Date(handoverDate).getTime();
    const currentTime = new Date().getTime();
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

    return (currentTime - releaseTime) > sevenDaysInMs;
  }, [spk]);

  const currentSubTasks = useMemo(() => {
    if (!spk?.sub_tasks) return [];
    if (Array.isArray(spk.sub_tasks)) return spk.sub_tasks;
    if (typeof spk.sub_tasks === 'string') {
      return spk.sub_tasks.split(/\r?\n|,/).map((s: string) => s.trim()).filter(Boolean);
    }
    return [];
  }, [spk]);

  const agreementPhotos = useMemo(() => {
    if (!spk?.agreement_photos) return [];
    return Array.isArray(spk.agreement_photos) ? spk.agreement_photos : [];
  }, [spk]);

  const handlePrint = () => {
    if (isTrackingExpired) return;
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

  const expiration = checkTrackingExpiration(spk?.released_at || spk?.bast_printed_at);

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
            <p className="text-sm text-text-muted">
              {isTrackingExpired ? 'Status Purnajual & Informasi Kendaraan' : 'Laporan Progres Pengerjaan Unit'}
            </p>
          </div>
          {!isTrackingExpired && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded hover:bg-primary-hover transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Unduh PDF</span>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-8 print:p-0">
        {isTrackingExpired ? (
          <div className="max-w-2xl mx-auto my-12 p-8 bg-slate-900 border border-slate-700/80 rounded-2xl text-center shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl">
              ✓
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Unit Telah Resmi Diserahterimakan</h2>
              <p className="text-slate-400 text-sm">
                Surat Perintah Kerja: <span className="font-semibold text-slate-200">{spk?.spk_no || spk?.spk_number}</span> • No. Polisi: <span className="font-semibold text-slate-200">{spk?.vehicle_plate}</span>
              </p>
            </div>

            <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-xl text-slate-300 text-sm leading-relaxed">
              Terima kasih telah mempercayakan pengerjaan modifikasi karoseri armada Anda kepada <strong className="text-white">RobelKaroseri</strong>. 
              Masa pemantauan pengerjaan unit ini telah selesai dan diarsipkan demi perlindungan data operasional.
            </div>

            <div className="text-xs text-slate-400">
              Butuh bantuan seputar garansi atau layanan perawatan? Hubungi Customer Care kami di <span className="text-amber-400 font-semibold">(031) 8988-2233</span>.
            </div>
          </div>
        ) : (
          <>
            {/* Printable Header */}
            <div className="mb-8 border-b-2 border-primary/20 pb-6 print:border-black/20">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h2 className="text-3xl font-display font-bold text-primary print:text-black mb-1">
                    Laporan Progres Kendaraan
                  </h2>
                  <p className="text-text-muted print:text-gray-600">Terakhir Diperbarui: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                <div className="text-right hidden print:block">
                  <h3 className="font-bold text-xl">RobelKaroseri</h3>
                  <p className="text-sm text-gray-600">Sistem Laporan Resmi</p>
                </div>
              </div>

              <div className="bg-surface print:bg-gray-50 p-6 rounded-lg border border-border print:border-gray-200 space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-sm text-text-muted print:text-gray-500 mb-1">Nama Pelanggan</p>
                    <p className="font-bold text-lg">{spk?.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted print:text-gray-500 mb-1">Nomor SPK</p>
                    <p className="font-bold font-mono text-primary print:text-black">{spk?.spk_no}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted print:text-gray-500 mb-1">No. HP / Kontak</p>
                    <p className="font-bold font-mono text-sm">{spk?.customer_phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted print:text-gray-500 mb-1">Nomor Polisi</p>
                    <p className="font-bold font-mono">{spk?.vehicle_plate || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted print:text-gray-500 mb-1">Model Kendaraan</p>
                    <p className="font-bold text-sm">{spk?.vehicle_model || spk?.vehicleModel || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted print:text-gray-500 mb-1">Nomor Rangka (VIN)</p>
                    <p className="font-bold font-mono">{spk?.vehicle_vin || spk?.vin_chassis || spk?.vehicle_number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted print:text-gray-500 mb-1">Nomor Mesin</p>
                    <p className="font-bold font-mono">{spk?.vehicle_engine || spk?.engine_number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted print:text-gray-500 mb-1">Tanggal Registrasi</p>
                    <p className="font-bold text-sm">
                      {spk?.created_at
                        ? new Date(spk.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted print:text-gray-500 mb-1">Target Selesai</p>
                    <p className="font-bold text-sm">
                      {spk?.target_date
                        ? new Date(spk.target_date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '-'}
                    </p>
                  </div>
                </div>

                {/* Scope Modifikasi / Sub Tasks */}
                {currentSubTasks.length > 0 && (
                  <div className="pt-4 border-t border-border/70 print:border-gray-300">
                    <p className="text-xs text-text-muted print:text-gray-500 uppercase tracking-wider font-semibold mb-2">
                      Scope Modifikasi / Sub Tasks
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {currentSubTasks.map((task: string, i: number) => (
                        <span
                          key={i}
                          className="bg-background print:bg-gray-100 border border-border print:border-gray-300 text-text print:text-gray-900 px-2.5 py-1 rounded text-xs font-mono"
                        >
                          {task}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Surat Kesepakatan Gallery (w_200,c_limit,f_auto,q_auto) */}
                {agreementPhotos.length > 0 && (
                  <div className="pt-4 border-t border-border/70 print:border-gray-300">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-primary print:text-black" />
                      <p className="text-xs text-text-muted print:text-gray-500 uppercase tracking-wider font-semibold">
                        Dokumentasi Surat Kesepakatan Kerja ({agreementPhotos.length} Dokumen)
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {agreementPhotos.map((photo: any, idx: number) => {
                        const photoUrl = photo.url || photo.secure_url;
                        return (
                          <div
                            key={photo.public_id || idx}
                            onClick={() => setAgreementLightbox(photo)}
                            className="group relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border border-border hover:border-primary cursor-pointer transition shadow-2xs bg-background shrink-0"
                            title="Klik untuk melihat dokumen surat kesepakatan resolusi penuh"
                            data-testid={`agreement-thumbnail-${idx}`}
                          >
                            <img
                              src={getOptimizedImageUrl(photoUrl, 200)}
                              alt={`Surat Kesepakatan ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                              crossOrigin="anonymous"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[11px] font-medium print:hidden">
                              Perbesar
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Active Grace Period Banner (within 7 days of BAST) */}
            {expiration.isReleased && (
              <div className="mb-8 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-300 shadow-sm print:hidden">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Unit resmi diserahterimakan pada <strong>{expiration.formattedReleasedDate}</strong>. Akses dokumentasi teknis WBS terbuka hingga <strong>{expiration.formattedExpiresDate}</strong>.
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-bold shrink-0 self-start sm:self-auto border border-emerald-500/30">
                  {expiration.daysRemaining} HARI TERSISA
                </span>
              </div>
            )}

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
                const mandorNote = (data?.mandor_notes || data?.notes || '').trim();
                
                return (
                  <div key={category} className="bg-surface print:bg-white p-6 rounded-lg border border-border print:border-gray-300 break-inside-avoid">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                      <div>
                        <h4 className="font-bold text-lg">{WBS_LABELS[category]}</h4>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">Progres: {prog}%</span>
                        {prog === 100 && <Check className="w-5 h-5 text-green-500 print:text-black" />}
                      </div>
                    </div>

                    {/* Mandor Notes Box */}
                    {mandorNote ? (
                      <div className="mb-4 p-4 rounded-lg bg-slate-800/60 border border-orange-500/30 print:bg-amber-50/70 print:border-amber-300 shadow-sm">
                        <div className="flex items-center gap-2 mb-1.5 text-orange-400 print:text-amber-800">
                          <ClipboardList className="w-4 h-4 flex-shrink-0" />
                          <span className="text-xs font-bold uppercase tracking-wider font-mono">
                            Catatan Mandor / Progres Terkini:
                          </span>
                        </div>
                        <p className="text-sm text-text print:text-gray-900 leading-relaxed pl-6 whitespace-pre-wrap font-sans">
                          {mandorNote}
                        </p>
                      </div>
                    ) : (
                      <div className="mb-4 px-4 py-2.5 rounded-lg bg-background/50 border border-dashed border-border/70 print:bg-gray-50 print:border-gray-200 text-xs text-text-muted print:text-gray-500 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500/50"></span>
                        <span>Pengerjaan berjalan sesuai standar, belum ada catatan khusus.</span>
                      </div>
                    )}

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
          </>
        )}

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-border print:border-gray-300 text-center text-sm text-text-muted print:text-gray-500">
          <p>Laporan ini digenerate secara otomatis oleh sistem RobelKaroseri.</p>
          <p>Untuk pertanyaan lebih lanjut, silakan hubungi Customer Service kami.</p>
        </div>

      </div>

      {/* Lightbox Modal Surat Kesepakatan (w_1600,c_limit,f_auto,q_auto) */}
      {agreementLightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 print:hidden"
          onClick={() => setAgreementLightbox(null)}
          data-testid="agreement-lightbox-modal"
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-surface rounded-xl overflow-hidden border border-border shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-hover">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm text-text">
                  Dokumen Surat Kesepakatan Kerja
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAgreementLightbox(null)}
                className="text-text-muted hover:text-text p-1 rounded-lg hover:bg-surface-active transition cursor-pointer"
                title="Tutup"
                aria-label="Tutup Pratinjau"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 overflow-auto flex items-center justify-center bg-black/40">
              <img
                src={getOptimizedImageUrl(agreementLightbox.url || agreementLightbox.secure_url, 1600)}
                alt="Dokumen Surat Kesepakatan Penuh"
                className="max-h-[80vh] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
      
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
