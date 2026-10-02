import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

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

export const WbsChecklist: React.FC<WbsChecklistProps> = ({ spkId }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initialFetchLoading, setInitialFetchLoading] = useState(true);
  const [statuses, setStatuses] = useState<Record<string, 'PENDING' | 'PASS' | 'FAIL'>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!spkId) return;
    
    const fetchChecklists = async () => {
      setInitialFetchLoading(true);
      try {
        const { data, error } = await supabase
          .from('wbs_checklists')
          .select('wbs_category, status, notes')
          .eq('spk_id', spkId);
          
        if (error) throw error;
        
        if (data) {
          const newStatuses: Record<string, 'PENDING' | 'PASS' | 'FAIL'> = {};
          const newNotes: Record<string, string> = {};
          
          data.forEach((item) => {
            newStatuses[item.wbs_category] = item.status;
            if (item.notes) {
              newNotes[item.wbs_category] = item.notes;
            }
          });
          
          setStatuses(newStatuses);
          setNotes(newNotes);
        }
      } catch (error) {
        console.error('Error fetching checklists:', error);
      } finally {
        setInitialFetchLoading(false);
      }
    };

    fetchChecklists();
  }, [spkId]);

  const handleStatusUpdate = async (category: string, status: 'PASS' | 'FAIL') => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('wbs_checklists').upsert({
        spk_id: spkId,
        wbs_category: category,
        status: status,
        notes: notes[category] || null,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'spk_id, wbs_category' });
      
      if (error) throw error;
      
      setStatuses(prev => ({ ...prev, [category]: status }));
    } catch (error: any) {
      console.error('Error updating status', error);
      alert('Failed to update status: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNotesChange = (category: string, value: string) => {
    setNotes(prev => ({ ...prev, [category]: value }));
  };

  const handleSaveNotes = async (category: string) => {
    // Only save notes without changing status if status already exists,
    // otherwise default to PENDING.
    if (!user) return;
    setLoading(true);
    try {
      const currentStatus = statuses[category] || 'PENDING';
      const { error } = await supabase.from('wbs_checklists').upsert({
        spk_id: spkId,
        wbs_category: category,
        status: currentStatus,
        notes: notes[category] || null,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'spk_id, wbs_category' });
      
      if (error) throw error;
      if (!statuses[category]) {
         setStatuses(prev => ({ ...prev, [category]: 'PENDING' }));
      }
    } catch (error: any) {
      console.error('Error saving notes', error);
    } finally {
      setLoading(false);
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
      <h3 className="text-xl font-display font-semibold text-text mb-6">WBS QC Checklist</h3>
      
      <div className="space-y-6">
        {WBS_CATEGORIES.map((category) => (
          <div key={category} className="bg-background p-4 rounded border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <h4 className="font-medium text-text text-lg">{WBS_LABELS[category]}</h4>
              <p className="text-sm text-text-muted">{category}</p>
              
              <div className="mt-2 flex gap-2">
                <input 
                  type="text" 
                  placeholder="Mandor notes (optional)..."
                  className="flex-1 bg-surface border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-text"
                  value={notes[category] || ''}
                  onChange={(e) => handleNotesChange(category, e.target.value)}
                  onBlur={() => handleSaveNotes(category)}
                />
              </div>
            </div>
            
            <div className="flex gap-2 min-w-[200px] justify-end">
              <button
                disabled={loading}
                onClick={() => handleStatusUpdate(category, 'PASS')}
                className={`flex-1 py-3 px-4 rounded font-medium text-center transition-colors ${
                  statuses[category] === 'PASS' 
                    ? 'bg-status-success text-white' 
                    : 'bg-surface border border-status-success text-status-success hover:bg-status-success/10 disabled:opacity-50'
                }`}
              >
                PASS
              </button>
              <button
                disabled={loading}
                onClick={() => handleStatusUpdate(category, 'FAIL')}
                className={`flex-1 py-3 px-4 rounded font-medium text-center transition-colors ${
                  statuses[category] === 'FAIL' 
                    ? 'bg-status-danger text-white' 
                    : 'bg-surface border border-status-danger text-status-danger hover:bg-status-danger/10 disabled:opacity-50'
                }`}
              >
                FAIL
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
