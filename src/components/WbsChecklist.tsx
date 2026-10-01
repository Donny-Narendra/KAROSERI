import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface WbsChecklistProps {
  spkId: string;
}

const WBS_CATEGORIES = ['WBS_1', 'WBS_2', 'WBS_3', 'WBS_4', 'WBS_5'];
const WBS_LABELS: Record<string, string> = {
  'WBS_1': 'Preparation & Chassis',
  'WBS_2': 'Body Framing',
  'WBS_3': 'Paneling & Exterior',
  'WBS_4': 'Interior & Finishing',
  'WBS_5': 'Final QA & Handover',
};

export const WbsChecklist: React.FC<WbsChecklistProps> = ({ spkId }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, 'PENDING' | 'PASS' | 'FAIL'>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  // In a real implementation, we would fetch existing checklist data here.
  // For the UI demonstration, we'll initialize with PENDING.
  
  const handleStatusUpdate = async (category: string, status: 'PASS' | 'FAIL') => {
    if (!user) return;
    setLoading(true);
    try {
      // Upsert logic would be here
      console.log('Upserting for SPK:', spkId);
      // const { error } = await supabase.from('wbs_checklists').upsert({
      //   spk_id: spkId,
      //   wbs_category: category,
      //   status: status,
      //   notes: notes[category] || null,
      //   updated_by: user.id
      // }, { onConflict: 'spk_id, wbs_category' });
      // if (error) throw error;
      
      setStatuses(prev => ({ ...prev, [category]: status }));
    } catch (error) {
      console.error('Error updating status', error);
      alert('Failed to update status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface p-6 rounded-lg shadow-sm border border-border">
      <h3 className="text-xl font-display font-semibold text-text mb-6">WBS QC Checklist</h3>
      
      <div className="space-y-6">
        {WBS_CATEGORIES.map((category) => (
          <div key={category} className="bg-background p-4 rounded border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <h4 className="font-medium text-text text-lg">{WBS_LABELS[category]}</h4>
              <p className="text-sm text-text-muted">{category}</p>
              
              <div className="mt-2">
                <input 
                  type="text" 
                  placeholder="Mandor notes (optional)..."
                  className="w-full bg-surface border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={notes[category] || ''}
                  onChange={(e) => setNotes(prev => ({ ...prev, [category]: e.target.value }))}
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
                    : 'bg-surface border border-status-success text-status-success hover:bg-status-success/10'
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
                    : 'bg-surface border border-status-danger text-status-danger hover:bg-status-danger/10'
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
