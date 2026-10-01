import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Check, X, Clock, Plus, AlertCircle } from 'lucide-react';

interface AmendmentManagerProps {
  spkId: string;
}

export const AmendmentManager: React.FC<AmendmentManagerProps> = ({ spkId }) => {
  const { profile } = useAuth();
  const [amendments, setAmendments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState('');
  const [costAdjustment, setCostAdjustment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner = profile?.role === 'owner';
  const isSA = profile?.role === 'service_advisor';

  const fetchAmendments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('spk_amendments')
        .select('*')
        .eq('spk_id', spkId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setAmendments(data || []);
    } catch (error) {
      console.error('Error fetching amendments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (spkId) fetchAmendments();
  }, [spkId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const { error: submitError } = await supabase
        .from('spk_amendments')
        .insert({
          spk_id: spkId,
          description,
          cost_adjustment: parseFloat(costAdjustment) || 0,
          status: 'PENDING'
        });

      if (submitError) throw submitError;

      setShowForm(false);
      setDescription('');
      setCostAdjustment('');
      fetchAmendments();
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting the amendment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (id: string, action: 'APPROVED' | 'REJECTED') => {
    try {
      const { error: updateError } = await supabase
        .from('spk_amendments')
        .update({ 
          status: action,
          approved_by: profile?.id
        })
        .eq('id', id);

      if (updateError) throw updateError;
      fetchAmendments();
    } catch (err) {
      console.error(`Error updating amendment to ${action}:`, err);
    }
  };

  if (loading) {
    return <div className="text-sm text-text-muted py-4">Loading amendments...</div>;
  }

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden mt-6">
      <div className="px-5 py-4 border-b border-border bg-surface-hover flex items-center justify-between">
        <h3 className="font-bold text-text font-display flex items-center gap-2">
          Change Orders (Amendments)
        </h3>
        {isSA && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-primary hover:bg-primary-hover text-background text-xs font-bold py-1.5 px-3 rounded transition flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Request Amendment
          </button>
        )}
      </div>

      {showForm && isSA && (
        <form onSubmit={handleSubmit} className="p-5 border-b border-border bg-surface-hover/30 space-y-4">
          <h4 className="text-sm font-bold text-text">New Amendment Request</h4>
          
          {error && (
            <div className="bg-status-danger/10 border border-status-danger/20 text-status-danger px-3 py-2 rounded text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text mb-1">Description *</label>
            <textarea
              required
              rows={3}
              className="w-full bg-background border border-border rounded p-2 text-text focus:outline-none focus:border-primary transition"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="E.g., Added extra coating package"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Cost Adjustment</label>
            <input
              type="number"
              className="w-full bg-background border border-border rounded p-2 text-text focus:outline-none focus:border-primary transition"
              value={costAdjustment}
              onChange={(e) => setCostAdjustment(e.target.value)}
              placeholder="e.g., 500000 (can be negative)"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-border text-text rounded hover:bg-surface-active transition text-sm"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-background rounded hover:bg-primary-hover transition text-sm font-medium"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      )}

      {amendments.length === 0 ? (
        <div className="p-5 text-center text-sm text-text-muted">
          No amendments requested for this SPK.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {amendments.map(amendment => (
            <div key={amendment.id} className="p-5 flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-text font-medium">{amendment.description}</p>
                <div className="flex items-center gap-4 text-xs text-text-muted">
                  <span className="font-mono">
                    {amendment.cost_adjustment >= 0 ? '+' : ''}
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amendment.cost_adjustment || 0)}
                  </span>
                  <span>{new Date(amendment.created_at).toLocaleDateString()}</span>
                  
                  {amendment.status === 'PENDING' && (
                    <span className="flex items-center gap-1 text-status-warning bg-status-warning/10 px-1.5 py-0.5 rounded">
                      <Clock className="w-3 h-3" /> Pending
                    </span>
                  )}
                  {amendment.status === 'APPROVED' && (
                    <span className="flex items-center gap-1 text-status-success bg-status-success/10 px-1.5 py-0.5 rounded">
                      <Check className="w-3 h-3" /> Approved
                    </span>
                  )}
                  {amendment.status === 'REJECTED' && (
                    <span className="flex items-center gap-1 text-status-danger bg-status-danger/10 px-1.5 py-0.5 rounded">
                      <X className="w-3 h-3" /> Rejected
                    </span>
                  )}
                </div>
              </div>

              {isOwner && amendment.status === 'PENDING' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAction(amendment.id, 'APPROVED')}
                    className="p-1.5 bg-status-success/10 text-status-success hover:bg-status-success/20 rounded transition"
                    title="Approve"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleAction(amendment.id, 'REJECTED')}
                    className="p-1.5 bg-status-danger/10 text-status-danger hover:bg-status-danger/20 rounded transition"
                    title="Reject"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
