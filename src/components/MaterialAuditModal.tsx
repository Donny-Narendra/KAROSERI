import React, { useState, useEffect } from 'react';
import { X, Calendar, User, FileText, ArrowRight } from 'lucide-react';
import { inventoryService, type Material, type InventoryAuditLog } from '../services/inventoryService';

interface MaterialAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: Material;
}

export const MaterialAuditModal: React.FC<MaterialAuditModalProps> = ({ isOpen, onClose, material }) => {
  const [logs, setLogs] = useState<InventoryAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && material) {
      loadLogs();
    }
  }, [isOpen, material]);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await inventoryService.getMaterialAuditLogs(material.id);
      setLogs(data);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat log audit');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const renderActionType = (type: string) => {
    switch (type) {
      case 'STOCK_ADJUSTMENT':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">Penyesuaian Stok</span>;
      case 'PRICE_CHANGE':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">Ubah Harga</span>;
      case 'DETAIL_UPDATE':
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">Update Detail</span>;
      case 'MATERIAL_CREATE':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">Material Baru</span>;
      case 'RESTOCK':
        return <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">Restock</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">{type}</span>;
    }
  };

  const renderChanges = (log: InventoryAuditLog) => {
    if (log.action_type === 'RESTOCK' || log.action_type === 'STOCK_ADJUSTMENT') {
      const oldStock = log.previous_data?.current_stock ?? 0;
      const newStock = log.new_data?.current_stock ?? 0;
      const diff = newStock - oldStock;
      const isPositive = diff > 0;
      
      return (
        <div className="flex items-center gap-2 mt-2">
          <span className="font-mono text-sm text-text-muted">{oldStock}</span>
          <ArrowRight className="w-3 h-3 text-text-muted" />
          <span className="font-mono text-sm font-medium">{newStock}</span>
          <span className={`text-xs ml-2 ${isPositive ? 'text-status-success' : 'text-status-danger'}`}>
            ({isPositive ? '+' : ''}{diff})
          </span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface border border-border rounded-lg shadow-xl w-full max-w-3xl flex flex-col h-[80vh]">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background shrink-0">
          <div>
            <h3 className="font-bold text-lg text-text">Riwayat Audit Material</h3>
            <p className="text-sm text-text-muted">{material.name}</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 bg-surface-hover/30">
          {error && (
            <div className="mb-4 p-3 bg-status-danger/10 border border-status-danger/30 rounded text-status-danger text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-text-muted">Memuat riwayat...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-text-muted">Belum ada riwayat perubahan untuk material ini.</div>
          ) : (
            <div className="space-y-4">
              {logs.map(log => (
                <div key={log.id} className="bg-surface border border-border p-4 rounded shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    {renderActionType(log.action_type)}
                    <div className="flex items-center text-xs text-text-muted gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(log.created_at || new Date()))}
                    </div>
                  </div>
                  
                  {renderChanges(log)}
                  
                  {log.notes && (
                    <div className="mt-3 flex items-start gap-1.5 text-sm bg-background p-2 rounded border border-border">
                      <FileText className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                      <span className="text-text">{log.notes}</span>
                    </div>
                  )}
                  
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-text-muted">
                    <User className="w-3 h-3" />
                    <span>User ID: {log.changed_by.substring(0, 8)}...</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
