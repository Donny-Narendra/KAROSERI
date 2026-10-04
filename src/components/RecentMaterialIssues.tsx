import React, { useState, useEffect } from 'react';
import { ClipboardList, Search, Loader2, Trash2, Edit2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { inventoryService } from '../services/inventoryService';

interface RecentMaterialIssuesProps {
  refreshKey: number;
}

export const RecentMaterialIssues: React.FC<RecentMaterialIssuesProps> = ({ refreshKey }) => {
  const [recentIssues, setRecentIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Edit state
  const [editingIssue, setEditingIssue] = useState<any | null>(null);
  const [editPrice, setEditPrice] = useState<number | ''>('');
  const [editQty, setEditQty] = useState<number | ''>('');
  const [isEditing, setIsEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Refetch when parent says so or internally requested
  const [internalRefresh, setInternalRefresh] = useState(0);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select(`
          id,
          quantity_issued,
          custom_unit_price,
          issued_at,
          spk ( spk_no, status ),
          materials ( name, unit, unit_price )
        `)
        .order('issued_at', { ascending: false })
        .limit(20); // Increase limit a bit since it's a dedicated component now
        
      if (error) throw error;
      setRecentIssues(data || []);
      setSelectedIds([]);
    } catch (error) {
      console.error('Error fetching recent issues:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [refreshKey, internalRefresh]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(recentIssues.map(i => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    // Check if any selected is from COMPLETED SPK locally first
    const invalidSpks = recentIssues.filter(i => selectedIds.includes(i.id) && i.spk?.status === 'COMPLETED');
    if (invalidSpks.length > 0) {
      alert('Tidak dapat menghapus transaksi dari SPK yang sudah COMPLETED.');
      return;
    }

    if (!confirm(`Anda yakin ingin membatalkan (void) ${selectedIds.length} pengeluaran material?\n\nStok material akan dikembalikan.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await inventoryService.deleteIssuesAndRevertStock(selectedIds);
      setInternalRefresh(prev => prev + 1);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Gagal menghapus transaksi');
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditModal = (issue: any) => {
    setEditingIssue(issue);
    setEditPrice(issue.custom_unit_price !== null ? issue.custom_unit_price : issue.materials?.unit_price);
    setEditQty(issue.quantity_issued);
    setErrorMsg('');
  };

  const handleSaveEdit = async () => {
    if (!editingIssue) return;
    if (editPrice === '' || editQty === '') {
      setErrorMsg('Semua field harus diisi');
      return;
    }

    setIsEditing(true);
    setErrorMsg('');
    try {
      const p = Number(editPrice);
      const q = Number(editQty);
      
      const priceToSave = p === editingIssue.materials?.unit_price ? null : p;
      await inventoryService.updateIssuePrice(editingIssue.id, priceToSave, q !== editingIssue.quantity_issued ? q : undefined);
      
      setEditingIssue(null);
      setInternalRefresh(prev => prev + 1);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal menyimpan pembaruan');
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-surface-hover flex justify-between items-center flex-wrap gap-4">
        <h3 className="font-bold text-text font-display flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" />
          Recent Material Issues
        </h3>
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <button 
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 px-3 py-1.5 bg-status-danger text-white rounded text-sm hover:bg-status-danger/90 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? 'Menghapus...' : `Void ${selectedIds.length} Transaksi`}
            </button>
          )}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder="Search SPK..." 
              className="bg-background border border-border rounded pl-9 pr-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary w-48"
            />
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-text whitespace-nowrap">
          <thead className="bg-background text-text-muted font-mono text-xs uppercase border-b border-border">
            <tr>
              <th className="px-5 py-3 w-10">
                <input 
                  type="checkbox" 
                  checked={selectedIds.length === recentIssues.length && recentIssues.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-border text-primary focus:ring-primary"
                />
              </th>
              <th className="px-5 py-3">Time</th>
              <th className="px-5 py-3">SPK No.</th>
              <th className="px-5 py-3">Material</th>
              <th className="px-5 py-3">Qty</th>
              <th className="px-5 py-3 text-right">Harga (Rp)</th>
              <th className="px-5 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-text-muted">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading recent issues...
                </td>
              </tr>
            ) : recentIssues.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-text-muted">
                  No material issues recorded yet.
                </td>
              </tr>
            ) : (
              recentIssues.map((issue) => (
                <tr key={issue.id} className="hover:bg-surface-hover/50 transition">
                  <td className="px-5 py-3">
                    <input 
                      type="checkbox"
                      checked={selectedIds.includes(issue.id)}
                      onChange={(e) => handleSelectOne(issue.id, e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                  </td>
                  <td className="px-5 py-3 text-text-muted">
                    {new Date(issue.issued_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-5 py-3 font-mono text-primary">
                    {issue.spk?.spk_no || '-'}
                  </td>
                  <td className="px-5 py-3">
                    {issue.materials?.name || 'Unknown'}
                  </td>
                  <td className="px-5 py-3 font-medium">
                    {issue.quantity_issued} {issue.materials?.unit || ''}
                  </td>
                  <td className="px-5 py-3 text-right font-mono">
                    {issue.custom_unit_price !== null 
                      ? <span className="text-status-warning" title="Custom Price">{issue.custom_unit_price.toLocaleString()}</span>
                      : issue.materials?.unit_price.toLocaleString() || '0'
                    }
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button 
                      onClick={() => openEditModal(issue)}
                      className="text-text-muted hover:text-primary transition"
                      title="Edit Pengeluaran"
                    >
                      <Edit2 className="w-4 h-4 mx-auto" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingIssue && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface border border-border rounded-lg shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b border-border flex justify-between items-center bg-surface-hover">
              <h3 className="font-bold text-text">Edit Pengeluaran</h3>
              <button onClick={() => setEditingIssue(null)} className="text-text-muted hover:text-text">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-status-danger/10 border border-status-danger/30 rounded text-status-danger text-sm flex gap-2 items-start">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-text mb-1">Material</label>
                <div className="p-2 bg-background border border-border rounded text-text text-sm">
                  {editingIssue.materials?.name} (SPK: {editingIssue.spk?.spk_no})
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  Qty ({editingIssue.materials?.unit})
                </label>
                <input 
                  type="number"
                  value={editQty}
                  onChange={e => setEditQty(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-background border border-border rounded p-2 text-text focus:border-primary focus:outline-none"
                  min="0.1"
                  step="0.1"
                />
                <p className="text-xs text-text-muted mt-1">Mengubah Qty akan otomatis menyesuaikan stok gudang.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">Harga Satuan Khusus (Rp)</label>
                <input 
                  type="number"
                  value={editPrice}
                  onChange={e => setEditPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-background border border-border rounded p-2 text-text focus:border-primary focus:outline-none"
                  min="0"
                />
                <p className="text-xs text-text-muted mt-1">
                  Harga master: Rp {editingIssue.materials?.unit_price.toLocaleString()}
                </p>
              </div>

            </div>
            <div className="p-4 border-t border-border flex justify-end gap-3 bg-background">
              <button 
                onClick={() => setEditingIssue(null)}
                className="px-4 py-2 border border-border rounded text-text hover:bg-surface-hover transition"
                disabled={isEditing}
              >
                Batal
              </button>
              <button 
                onClick={handleSaveEdit}
                disabled={isEditing}
                className="px-4 py-2 bg-primary text-primary-content rounded hover:bg-primary/90 transition flex items-center gap-2"
              >
                {isEditing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
