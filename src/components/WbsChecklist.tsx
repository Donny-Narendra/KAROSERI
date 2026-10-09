import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { MaterialRequisitionForm } from './MaterialRequisitionForm';
import { SpkBoronganPanel } from './SpkBoronganPanel';
import { WbsGalleryUploader } from './WbsGalleryUploader';
import type { WbsAsset } from './WbsGalleryUploader';

interface WbsChecklistProps {
  spkId: string;
}

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

const PROGRESS_STEPS = [0, 25, 50, 75, 100];

export const WbsChecklist: React.FC<WbsChecklistProps> = ({ spkId }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initialFetchLoading, setInitialFetchLoading] = useState(true);
  
  const [statuses, setStatuses] = useState<Record<string, 'PENDING' | 'PASS' | 'FAIL'>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [assets, setAssets] = useState<Record<string, WbsAsset[]>>({});
  
  // Requisition Modal State
  const [requisitionCategory, setRequisitionCategory] = useState<string | null>(null);
  const [boronganCategory, setBoronganCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!spkId) return;
    
    const fetchData = async () => {
      setInitialFetchLoading(true);
      try {
        // Fetch checklists (status, notes, progress)
        const { data: checklistData, error: checklistError } = await supabase
          .from('wbs_checklists')
          .select('wbs_category, status, notes, progress_percentage')
          .eq('spk_id', spkId);
          
        if (checklistError) throw checklistError;
        
        // Fetch assets
        const { data: assetData, error: assetError } = await supabase
          .from('spk_assets')
          .select('id, file_url, wbs_category')
          .eq('spk_id', spkId)
          .not('wbs_category', 'is', null);
          
        if (assetError) throw assetError;
        
        const newStatuses: Record<string, 'PENDING' | 'PASS' | 'FAIL'> = {};
        const newNotes: Record<string, string> = {};
        const newProgress: Record<string, number> = {};
        const newAssets: Record<string, WbsAsset[]> = {};
        
        // Initialize arrays for assets
        WBS_CATEGORIES.forEach(cat => newAssets[cat] = []);
        
        if (checklistData) {
          checklistData.forEach((item) => {
            newStatuses[item.wbs_category] = item.status;
            if (item.notes) newNotes[item.wbs_category] = item.notes;
            newProgress[item.wbs_category] = item.progress_percentage || 0;
          });
        }
        
        if (assetData) {
          assetData.forEach((item) => {
            if (item.wbs_category && newAssets[item.wbs_category]) {
              newAssets[item.wbs_category].push(item as WbsAsset);
            }
          });
        }
        
        setStatuses(newStatuses);
        setNotes(newNotes);
        setProgress(newProgress);
        setAssets(newAssets);
        
      } catch (error) {
        console.error('Error fetching WBS data:', error);
      } finally {
        setInitialFetchLoading(false);
      }
    };

    fetchData();
  }, [spkId]);

  // Calculate total progress
  const totalProgress = Math.round(
    WBS_CATEGORIES.reduce((acc, cat) => acc + (progress[cat] || 0), 0) / WBS_CATEGORIES.length
  );

  const saveWbsData = async (category: string, updates: any) => {
    if (!user) return;
    setLoading(true);
    try {
      const currentStatus = statuses[category] || 'PENDING';
      const { error } = await supabase.from('wbs_checklists').upsert({
        spk_id: spkId,
        wbs_category: category,
        status: updates.status !== undefined ? updates.status : currentStatus,
        notes: updates.notes !== undefined ? updates.notes : (notes[category] || null),
        progress_percentage: updates.progress !== undefined ? updates.progress : (progress[category] || 0),
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'spk_id, wbs_category' });
      
      if (error) throw error;
      
      if (updates.status !== undefined) setStatuses(prev => ({ ...prev, [category]: updates.status }));
      if (updates.notes !== undefined) setNotes(prev => ({ ...prev, [category]: updates.notes }));
      if (updates.progress !== undefined) setProgress(prev => ({ ...prev, [category]: updates.progress }));
      
    } catch (error: any) {
      console.error('Error saving WBS data', error);
      alert('Failed to save data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = (category: string, status: 'PASS' | 'FAIL') => {
    // If setting to PASS (which implies 100% completion conceptually, though we track percentage separately)
    // we can still enforce rules if we want, but let's just save it.
    saveWbsData(category, { status });
  };

  const handleProgressChange = (category: string, newProgress: number) => {
    const categoryAssets = assets[category] || [];
    
    // Lock 100% if no photos
    if (newProgress === 100 && categoryAssets.length === 0) {
      alert("Tidak dapat mengatur progres ke 100% sebelum mengunggah minimal 1 foto bukti pekerjaan di kategori WBS ini.");
      return;
    }
    
    let newStatus = statuses[category];
    // Auto-update status based on progress (optional UX improvement)
    if (newProgress === 100) newStatus = 'PASS';
    else if (newProgress > 0 && statuses[category] === 'PENDING') newStatus = 'PENDING'; 
    
    saveWbsData(category, { progress: newProgress, status: newStatus });
  };

  const handleNotesChange = (category: string, value: string) => {
    setNotes(prev => ({ ...prev, [category]: value }));
  };

  const handleAssetUpload = async (category: string, asset: WbsAsset) => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('spk_assets').insert({
        spk_id: spkId,
        file_url: asset.file_url,
        wbs_category: category,
        uploaded_by: user.id
      }).select().single();
      
      if (error) throw error;
      
      setAssets(prev => ({
        ...prev,
        [category]: [...(prev[category] || []), data as WbsAsset]
      }));
    } catch (err: any) {
      console.error("Error saving asset to DB", err);
      alert("Failed to save asset info: " + err.message);
    }
  };

  const handleAssetRemove = async (category: string, fileUrl: string) => {
    try {
      const { error } = await supabase.from('spk_assets')
        .delete()
        .eq('spk_id', spkId)
        .eq('file_url', fileUrl);
        
      if (error) throw error;
      
      setAssets(prev => ({
        ...prev,
        [category]: (prev[category] || []).filter(a => a.file_url !== fileUrl)
      }));
      
      // If we removed the last photo and progress was 100%, we might want to downgrade it
      // but let's let the user handle it or downgrade automatically.
      const updatedAssets = (assets[category] || []).filter(a => a.file_url !== fileUrl);
      if (updatedAssets.length === 0 && progress[category] === 100) {
        handleProgressChange(category, 75);
      }
      
    } catch (err: any) {
      console.error("Error removing asset", err);
    }
  };

  if (initialFetchLoading) {
    return (
      <div className="bg-surface p-6 rounded-lg shadow-sm border border-border flex justify-center items-center h-48">
        <p className="text-text-muted">Loading WBS Checklist...</p>
      </div>
    );
  }

  return (
    <div className="bg-surface p-6 rounded-lg shadow-sm border border-border">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="text-xl font-display font-semibold text-text">WBS Progress & QC</h3>
          <p className="text-text-muted text-sm mt-1">Catat progres fisik dan unggah bukti per kategori WBS</p>
        </div>
        
        {/* Total Progress Card */}
        <div className="bg-background border border-border rounded-lg px-4 py-2 flex items-center gap-4">
          <div className="text-sm text-text-muted font-medium">Total Progres</div>
          <div className="flex items-center gap-2">
            <div className="w-32 h-3 bg-surface border border-border rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${totalProgress}%` }}
              ></div>
            </div>
            <div className="font-bold text-lg text-primary">{totalProgress}%</div>
          </div>
        </div>
      </div>
      
      <div className="space-y-6">
        {WBS_CATEGORIES.map((category) => (
          <div key={category} className="bg-background p-4 rounded border border-border flex flex-col gap-4">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-text text-lg">{WBS_LABELS[category]}</h4>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setBoronganCategory(category)}
                      className="px-3 py-1 bg-surface border border-primary text-primary rounded text-sm hover:bg-primary/10 transition-colors"
                    >
                      SPK Borongan
                    </button>
                    <button
                      type="button"
                      onClick={() => setRequisitionCategory(category)}
                      className="px-3 py-1 bg-surface border border-primary text-primary rounded text-sm hover:bg-primary/10 transition-colors"
                    >
                      Minta Material
                    </button>
                  </div>
                </div>
                
                {/* Progress Stepper */}
                <div className="mt-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-text-muted">Persentase Fisik</span>
                    <span className="text-sm font-bold text-primary">{progress[category] || 0}%</span>
                  </div>
                  <div className="flex gap-1">
                    {PROGRESS_STEPS.map(step => {
                      const currentProgress = progress[category] || 0;
                      const isActive = step <= currentProgress;
                      
                      return (
                        <button
                          key={step}
                          onClick={() => handleProgressChange(category, step)}
                          className={`flex-1 h-10 rounded text-xs font-bold transition-colors border ${
                            isActive 
                              ? 'bg-primary text-white border-primary' 
                              : 'bg-surface text-text-muted border-border hover:border-primary/50 hover:bg-primary/5'
                          }`}
                        >
                          {step}%
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Mandor notes (optional)..."
                    className="flex-1 bg-surface border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-text"
                    value={notes[category] || ''}
                    onChange={(e) => handleNotesChange(category, e.target.value)}
                    onBlur={() => saveWbsData(category, { notes: notes[category] })}
                  />
                </div>
              </div>
              
              <div className="flex flex-row md:flex-col gap-2 min-w-[150px] justify-start md:justify-end">
                <button
                  disabled={loading}
                  onClick={() => handleStatusUpdate(category, 'PASS')}
                  className={`flex-1 py-2 px-4 rounded font-medium text-center transition-colors ${
                    statuses[category] === 'PASS' 
                      ? 'bg-status-success text-white' 
                      : 'bg-surface border border-status-success text-status-success hover:bg-status-success/10 disabled:opacity-50'
                  }`}
                >
                  QC PASS
                </button>
                <button
                  disabled={loading}
                  onClick={() => handleStatusUpdate(category, 'FAIL')}
                  className={`flex-1 py-2 px-4 rounded font-medium text-center transition-colors ${
                    statuses[category] === 'FAIL' 
                      ? 'bg-status-danger text-white' 
                      : 'bg-surface border border-status-danger text-status-danger hover:bg-status-danger/10 disabled:opacity-50'
                  }`}
                >
                  QC FAIL
                </button>
              </div>
            </div>

            {/* Gallery Uploader for this WBS */}
            <div className="mt-2 border-t border-border pt-2">
              <WbsGalleryUploader 
                wbsCategory={category}
                assets={assets[category] || []}
                onUploadSuccess={(asset) => handleAssetUpload(category, asset)}
                onUploadRemove={(url) => handleAssetRemove(category, url)}
              />
            </div>
          </div>
        ))}
      </div>

      {requisitionCategory && (
        <MaterialRequisitionForm
          spkId={spkId}
          wbsCategory={requisitionCategory}
          onClose={() => setRequisitionCategory(null)}
        />
      )}

      {boronganCategory && (
        <SpkBoronganPanel
          spkId={spkId}
          wbsCategory={boronganCategory}
          onClose={() => setBoronganCategory(null)}
        />
      )}
    </div>
  );
};
