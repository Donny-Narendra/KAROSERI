import React, { useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

interface CancelSpkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  spkNo: string;
}

export const CancelSpkModal: React.FC<CancelSpkModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  spkNo
}) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Reason is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onConfirm(reason);
      setReason('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel SPK');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-bold text-lg text-text flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-status-warning" />
            Cancel SPK {spkNo}
          </h3>
          <button 
            onClick={onClose}
            className="text-text-muted hover:text-text transition"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="bg-status-danger/10 border border-status-danger text-status-danger px-4 py-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}
          
          <div className="mb-6">
            <label className="block text-sm font-mono text-text-muted mb-2">
              CANCELLATION REASON <span className="text-status-danger">*</span>
            </label>
            <textarea
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-background border border-border rounded px-4 py-2 text-text focus:outline-none focus:border-status-warning transition min-h-[100px] resize-y"
              placeholder="Please provide a valid reason for cancellation (e.g., Customer cancelled, DP not paid, etc.)"
              disabled={loading}
            />
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded font-medium text-text-muted hover:text-text bg-surface-hover hover:bg-surface-active transition disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="px-4 py-2 rounded font-medium bg-status-danger hover:bg-red-600 text-white transition flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
