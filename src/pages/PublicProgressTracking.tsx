import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import { supabase } from '../lib/supabaseClient';
import { 
  Check, Loader2, Printer, AlertTriangle, AlertCircle, ClipboardList,
  CheckCircle2, FileText, X
} from 'lucide-react';
import { getOptimizedImageUrl } from '../lib/cloudinary';
import { checkTrackingExpiration } from '../utils/trackingExpiration';
import { createStyleProxy } from '../utils/pdfExportUtils';

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

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const wbsStages = useMemo(() => {
    return WBS_CATEGORIES.map((cat, idx) => {
      const data = checklists[cat];
      const catAssets = assets[cat] || [];
      return {
        id: cat,
        wbsNumber: idx + 1,
        title: WBS_LABELS[cat] || cat,
        progress: data?.progress_percentage || 0,
        notes: (data?.mandor_notes || data?.notes || '').trim(),
        photos: catAssets.map((asset: any, pIdx: number) => ({
          id: asset.id || pIdx,
          url: asset.file_url || asset.url || asset.secure_url || '',
          caption: asset.caption || `Dokumentasi #${pIdx + 1}`,
        })),
      };
    });
  }, [checklists, assets]);

  const waitForImages = async (container: HTMLElement) => {
    const images = Array.from(container.querySelectorAll('img'));
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (
              img.complete ||
              (typeof navigator !== 'undefined' && navigator.userAgent?.includes('jsdom'))
            ) {
              resolve();
              return;
            }
            const timer = setTimeout(() => resolve(), 2500);
            img.onload = () => {
              clearTimeout(timer);
              resolve();
            };
            img.onerror = () => {
              clearTimeout(timer);
              resolve();
            };
          })
      )
    );
  };

  const handleDownloadPdf = async () => {
    if (isTrackingExpired || isGeneratingPdf) return;
    const element = document.getElementById('tracking-pdf-report');
    if (!element) {
      console.error('Target elemen laporan tracking tidak ditemukan di DOM (#tracking-pdf-report)');
      window.print();
      return;
    }

    setIsGeneratingPdf(true);
    const origWindowGetComputedStyle = window.getComputedStyle;

    try {
      // 1. Tunggu seluruh tag img selesai dimuat browser
      await waitForImages(element);

      // 2. Intercept window.getComputedStyle untuk menangani warna modern Tailwind v4 (oklch, color-mix, lab)
      if (origWindowGetComputedStyle && typeof window !== 'undefined') {
        window.getComputedStyle = createStyleProxy(origWindowGetComputedStyle.bind(window));
      }

      const safeSpkNo = (spk?.spk_no || spk?.spk_number || 'SPK').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Laporan-Progres-${safeSpkNo}.pdf`;

      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          logging: false,
          letterRendering: true,
          backgroundColor: '#ffffff',
          onclone: (clonedDoc: Document) => {
            const win = clonedDoc.defaultView;
            if (win) {
              win.getComputedStyle = createStyleProxy(win.getComputedStyle.bind(win));
            }
            const clonedEl = clonedDoc.getElementById('tracking-pdf-report');
            if (clonedEl) {
              clonedEl.style.boxShadow = 'none';
              clonedEl.style.border = 'none';
              clonedEl.style.borderRadius = '0';
            }
          },
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
        pagebreak: {
          mode: ['avoid-all', 'css', 'legacy'],
          avoid: ['.break-inside-avoid', 'tr', '.wbs-card'],
        },
      };

      const html2pdfWorker = ((html2pdf as any).default || html2pdf) as typeof html2pdf;
      await html2pdfWorker().set(opt).from(element).save();
    } catch (err) {
      console.error('Gagal mengunduh PDF:', err);
      window.print();
    } finally {
      if (origWindowGetComputedStyle && typeof window !== 'undefined') {
        window.getComputedStyle = origWindowGetComputedStyle;
      }
      if (typeof document !== 'undefined') {
        document.querySelectorAll('.html2pdf__overlay').forEach((el) => el.remove());
      }
      setIsGeneratingPdf(false);
    }
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
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded hover:bg-primary-hover transition cursor-pointer disabled:opacity-75 disabled:cursor-wait shadow-sm"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Menyiapkan PDF...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">Unduh PDF</span>
                </>
              )}
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
            {/* Active Grace Period Banner (within 7 days of BAST) */}
            {expiration.isReleased && (
              <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-300 shadow-sm print:hidden">
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

            {/* Kontainer dokumen laporan yang akan di-capture ke PDF / dicetak */}
            <div
              id="tracking-pdf-report"
              className="bg-white text-slate-900 p-6 sm:p-8 rounded-xl shadow-xl space-y-6 border border-slate-200 print:border-none print:shadow-none print:p-0 print:m-0 print:rounded-none"
            >
              {/* KOP LAPORAN ROBELKAROSERI */}
              <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-wide text-slate-900">ROBELKAROSERI</h1>
                  <p className="text-xs text-slate-600">Laporan Progres Pengerjaan Unit Modifikasi Komersial</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Terakhir Diperbarui: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-slate-800">{spk?.spk_no || spk?.spk_number}</span>
                  <p className="text-[10px] text-slate-500">Dicetak: {new Date().toLocaleDateString('id-ID')}</p>
                  <p className="text-[10px] font-medium text-slate-600">Sistem Laporan Resmi</p>
                </div>
              </div>

              {/* 1. DATA KENDARAAN & KONSUMEN */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
                  <div>
                    <p className="text-[11px] text-slate-500 mb-1">Nama Pelanggan</p>
                    <p className="font-bold text-base text-slate-900">{spk?.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500 mb-1">Nomor SPK</p>
                    <p className="font-bold font-mono text-slate-900">{spk?.spk_no || spk?.spk_number}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500 mb-1">No. HP / Kontak</p>
                    <p className="font-bold font-mono text-slate-800">{spk?.customer_phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500 mb-1">Nomor Polisi</p>
                    <p className="font-bold font-mono text-slate-900">{spk?.vehicle_plate || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500 mb-1">Model Kendaraan</p>
                    <p className="font-bold text-slate-800">{spk?.vehicle_model || spk?.vehicleModel || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500 mb-1">Nomor Rangka (VIN)</p>
                    <p className="font-bold font-mono text-slate-800">{spk?.vehicle_vin || spk?.vin_chassis || spk?.vehicle_number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500 mb-1">Nomor Mesin</p>
                    <p className="font-bold font-mono text-slate-800">{spk?.vehicle_engine || spk?.engine_number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500 mb-1">Tanggal Registrasi</p>
                    <p className="font-bold text-slate-800">
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
                    <p className="text-[11px] text-slate-500 mb-1">Target Selesai</p>
                    <p className="font-bold text-slate-800">
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
                  <div className="pt-3 border-t border-slate-200">
                    <p className="text-[11px] text-slate-600 uppercase tracking-wider font-semibold mb-2">
                      Scope Modifikasi / Sub Tasks
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {currentSubTasks.map((task: string, i: number) => (
                        <span
                          key={i}
                          className="bg-white border border-slate-300 text-slate-800 px-2.5 py-1 rounded text-xs font-mono"
                        >
                          {task}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. DOKUMEN SURAT KESEPAKATAN KERJA (Semua Foto) */}
              {agreementPhotos.length > 0 && (
                <div className="break-inside-avoid border border-slate-200 rounded-lg p-5 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-700" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Dokumentasi Surat Kesepakatan Kerja ({agreementPhotos.length} Dokumen)
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">Lampiran Surat Resmi</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {agreementPhotos.map((item: any, idx: number) => {
                      const photoUrl = item.url || item.secure_url;
                      return (
                        <div
                          key={item.public_id || idx}
                          onClick={() => setAgreementLightbox(item)}
                          className="group relative border border-slate-300 rounded-lg overflow-hidden bg-white shadow-2xs hover:border-slate-500 cursor-pointer transition"
                          data-testid={`agreement-thumbnail-${idx}`}
                          title="Klik untuk melihat dokumen surat kesepakatan resolusi penuh"
                        >
                          <img
                            src={getOptimizedImageUrl(photoUrl, 600)}
                            alt={`Surat Kesepakatan ${idx + 1}`}
                            crossOrigin="anonymous"
                            className="w-full h-36 object-cover group-hover:scale-105 transition duration-200"
                          />
                          <div className="p-1.5 text-[10px] text-slate-600 bg-slate-100 text-center font-mono border-t border-slate-200">
                            Dokumen Kesepakatan #{idx + 1}
                          </div>
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[11px] font-medium print:hidden">
                            Perbesar
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. PROGRES KESELURUHAN */}
              <div className="border border-slate-200 rounded-lg p-5 bg-white break-inside-avoid">
                <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                  Penyelesaian Keseluruhan
                </h3>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-sm text-slate-700">Total Progres WBS</span>
                  <span className="text-2xl font-bold font-mono text-slate-900">{totalProgress}%</span>
                </div>
                <div className="w-full h-3.5 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
                  <div
                    className="h-full bg-slate-900 transition-all duration-1000"
                    style={{ width: `${totalProgress}%` }}
                  ></div>
                </div>
              </div>

              {/* 4. TAHAPAN WBS & SEMUA FOTO DOKUMENTASI PEKERJAAN */}
              <div className="space-y-4">
                <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-2">
                  Rincian Tahapan (WBS)
                </h3>

                {wbsStages.map((stage) => (
                  <div
                    key={stage.id}
                    className="wbs-card border border-slate-300 rounded-lg p-5 break-inside-avoid bg-white space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h4 className="font-bold text-base text-slate-900">{stage.title}</h4>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs bg-slate-100 px-2.5 py-1 rounded border border-slate-300 text-slate-800">
                          Progres: {stage.progress}%
                        </span>
                        {stage.progress === 100 && <Check className="w-4 h-4 text-emerald-600 print:text-black" />}
                      </div>
                    </div>

                    {/* Mandor Notes Box */}
                    {stage.notes ? (
                      <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-300 text-slate-900">
                        <div className="flex items-center gap-1.5 mb-1 text-amber-800">
                          <ClipboardList className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
                            Catatan Mandor / Progres Terkini:
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed pl-5 whitespace-pre-wrap font-sans">
                          {stage.notes}
                        </p>
                      </div>
                    ) : (
                      <div className="px-3 py-2 rounded-lg bg-slate-50 border border-dashed border-slate-300 text-[11px] text-slate-500 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                        <span>Pengerjaan berjalan sesuai standar, belum ada catatan khusus.</span>
                      </div>
                    )}

                    {/* Grid Dokumentasi Foto Tiap WBS (3 Kolom per Baris) */}
                    {stage.photos && stage.photos.length > 0 ? (
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Dokumentasi Lapangan ({stage.photos.length} Foto):
                        </div>
                        <div className="grid grid-cols-3 gap-2.5">
                          {stage.photos.map((photo: any, pIdx: number) => (
                            <div key={photo.id || pIdx} className="border border-slate-200 rounded overflow-hidden bg-slate-50">
                              <img
                                src={getOptimizedImageUrl(photo.url, 600)}
                                alt={photo.caption || `Dokumentasi #${pIdx + 1}`}
                                crossOrigin="anonymous"
                                className="w-full h-28 object-cover"
                              />
                              <div className="p-1 text-[9px] text-slate-600 bg-slate-100 text-center truncate">
                                {photo.caption || `Dokumentasi #${pIdx + 1}`}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-400 italic border border-dashed border-slate-200 rounded">
                        Belum ada dokumentasi foto pada tahap ini.
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* 5. FOOTER LAPORAN */}
              <div className="pt-6 border-t border-slate-200 text-center text-xs text-slate-500 break-inside-avoid">
                <p>Laporan ini digenerate secara otomatis oleh sistem RobelKaroseri.</p>
                <p>Untuk pertanyaan lebih lanjut, silakan hubungi Customer Service kami.</p>
              </div>
            </div>
          </>
        )}

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
          body * {
            visibility: hidden;
          }
          #tracking-pdf-report,
          #tracking-pdf-report * {
            visibility: visible;
          }
          #tracking-pdf-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: #0f172a !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          img {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      ` }} />
    </div>
  );
};
