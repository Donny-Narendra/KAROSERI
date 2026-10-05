import React, { useState, useEffect } from 'react';
import { Calculator, Plus, Trash2, Edit2, Download, Printer } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

import { packageService } from '../services/packageService';
import type { ProductPackage } from '../types/package';
import { PackageAllocationModal } from './PackageAllocationModal';
import type { RabItemPayload } from './PackageAllocationModal';
import { exportRabToExcel, printRabQuotation } from '../utils/rabExport';

interface RabItem {
  id: string;
  wbsCategory: string;
  type: 'material' | 'labor' | 'overhead';
  description: string;
  qty: number;
  unitPrice: number;
  wasteFactor?: number; // percentage (0-100)
  packageId?: string;
}

export const RabCalculator: React.FC<{ spkId: string }> = ({ spkId }) => {
  const [items, setItems] = useState<RabItem[]>([]);
  const [wbsCategory, setWbsCategory] = useState('Pembongkaran');
  const [bayHourlyRate, setBayHourlyRate] = useState<number>(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [spkDetails, setSpkDetails] = useState<any>(null);

  // Package BOM state
  const [packages, setPackages] = useState<ProductPackage[]>([]);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<ProductPackage | null>(null);
  const [allocationStatus, setAllocationStatus] = useState<'PARTIAL' | 'COMPLETE'>('COMPLETE');
  
  const [newItem, setNewItem] = useState<Partial<RabItem>>({
    type: 'material',
    qty: 1,
    unitPrice: 0,
    wasteFactor: 5,
  });

  const wbsCategories = [
    { id: 'Pembongkaran', label: 'WBS 1: Pembongkaran' },
    { id: 'Sasis/Rangka', label: 'WBS 2: Sasis/Rangka' },
    { id: 'Dinding/Fabrikasi', label: 'WBS 3: Dinding/Fabrikasi' },
    { id: 'Cat/Finishing', label: 'WBS 4: Cat/Finishing' },
    { id: 'Kelistrikan/Hidrolik', label: 'WBS 5: Kelistrikan/Hidrolik' },
  ];

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase.from('workshop_settings').select('bay_hourly_rate').eq('id', 1).single();
      if (!error && data) {
        setBayHourlyRate(data.bay_hourly_rate || 0);
      }
    };

    const fetchExistingRab = async () => {
      if (!spkId) return;
      
      const { data: estData, error: estError } = await supabase
        .from('rab_estimations')
        .select('id')
        .eq('spk_id', spkId)
        .single();
        
      const { data: spkData } = await supabase.from('spk').select('*').eq('id', spkId).single();
      if (spkData) {
         setSpkDetails(spkData);
         if (spkData.allocation_status) {
           setAllocationStatus(spkData.allocation_status);
         }
      }
        
      if (!estError && estData) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('rab_items')
          .select('*')
          .eq('rab_estimation_id', estData.id);
          
        if (!itemsError && itemsData) {
          const loadedItems = itemsData.map((dbItem: any) => {
            let type: 'material' | 'labor' | 'overhead' = 'material';
            let qty = 0;
            let unitPrice = 0;
            
            if (dbItem.labor_hours > 0) {
              type = 'labor';
              qty = Number(dbItem.labor_hours);
              unitPrice = Number(dbItem.labor_rate);
            } else if (dbItem.overhead_hours > 0) {
              type = 'overhead';
              qty = Number(dbItem.overhead_hours) / 8;
              unitPrice = Number(dbItem.overhead_rate) * 8;
            } else {
              type = 'material';
              qty = Number(dbItem.quantity);
              // Recover unit price (without waste factor)
              unitPrice = Number(dbItem.item_total) / (Number(dbItem.quantity) || 1);
            }
            
            return {
              id: dbItem.id,
              wbsCategory: dbItem.wbs_category,
              type,
              description: dbItem.description,
              qty,
              unitPrice,
              wasteFactor: 0,
              packageId: dbItem.package_id
            };
          });
          setItems(loadedItems);
        }
      }
    };

    const fetchPackages = async () => {
      try {
        const pkgs = await packageService.getPackages();
        setPackages(pkgs);
      } catch (err) {
        console.error("Failed to load packages:", err);
      }
    };

    fetchSettings();
    fetchPackages();
    fetchExistingRab().finally(() => {
      setIsInitialLoad(false);
    });
  }, [spkId]);

  useEffect(() => {
    if (isInitialLoad) return;
    
    const timer = setTimeout(() => {
      handleSaveEstimation(true); // true = silent save
    }, 500);

    return () => clearTimeout(timer);
  }, [items, isInitialLoad]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.description || !newItem.qty || newItem.unitPrice === undefined) return;
    
    if (editingId) {
      setItems(items.map(item => 
        item.id === editingId 
          ? {
              ...item,
              wbsCategory,
              type: newItem.type as 'material' | 'labor' | 'overhead',
              description: newItem.description as string,
              qty: newItem.qty as number,
              unitPrice: newItem.unitPrice as number,
              wasteFactor: newItem.type === 'material' ? newItem.wasteFactor : 0,
            }
          : item
      ));
      setEditingId(null);
    } else {
      setItems([
        ...items,
        {
          id: Date.now().toString(),
          wbsCategory,
          type: newItem.type as 'material' | 'labor' | 'overhead',
          description: newItem.description as string,
          qty: newItem.qty as number,
          unitPrice: newItem.unitPrice as number,
          wasteFactor: newItem.type === 'material' ? newItem.wasteFactor : 0,
        }
      ]);
    }
    
    setNewItem({
      type: newItem.type,
      qty: 1,
      unitPrice: newItem.type === 'overhead' ? bayHourlyRate * 8 : 0,
      wasteFactor: newItem.type === 'material' ? 5 : 0,
    });
  };

  const handleExportXlsx = () => {
    exportRabToExcel(spkDetails, items, {
      material: totalMaterialCost,
      labor: totalLaborCost,
      overhead: totalOverheadCost,
      grandTotal: totalCost
    });
  };

  const handlePrintPdf = () => {
    printRabQuotation(spkDetails, items, {
      material: totalMaterialCost,
      labor: totalLaborCost,
      overhead: totalOverheadCost,
      grandTotal: totalCost
    });
  };

  const handleEditItem = (item: RabItem) => {
    setNewItem({
      type: item.type,
      description: item.description,
      qty: item.qty,
      unitPrice: item.unitPrice,
      wasteFactor: item.wasteFactor,
    });
    setWbsCategory(item.wbsCategory);
    setEditingId(item.id);
  };

  const handleRemoveItem = (id: string) => {
    setItemToDelete(id);
  };

  const confirmRemoveItem = () => {
    if (itemToDelete) {
      setItems(items.filter(item => item.id !== itemToDelete));
      setItemToDelete(null);
    }
  };

  const calculateItemTotal = (item: RabItem) => {
    if (item.type === 'material') {
      const wasteMultiplier = 1 + (item.wasteFactor || 0) / 100;
      return item.qty * item.unitPrice * wasteMultiplier;
    }
    return item.qty * item.unitPrice;
  };

  const totalCost = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  const totalMaterialCost = items.filter(i => i.type === 'material').reduce((sum, i) => sum + calculateItemTotal(i), 0);
  const totalLaborCost = items.filter(i => i.type === 'labor').reduce((sum, i) => sum + calculateItemTotal(i), 0);
  const totalOverheadCost = items.filter(i => i.type === 'overhead').reduce((sum, i) => sum + calculateItemTotal(i), 0);

  const handleSaveEstimation = async (silent = false) => {
    if (!spkId) {
      if (!silent) alert('SPK ID is missing');
      return;
    }
    try {
      // 1. Upsert estimation
      const { data: estData, error: estError } = await supabase.from('rab_estimations').upsert({
        spk_id: spkId,
        total_material_cost: totalMaterialCost,
        total_labor_cost: totalLaborCost,
        total_overhead_cost: totalOverheadCost,
        total_estimated_cost: totalCost,
      }, { onConflict: 'spk_id' }).select().single();

      if (estError) throw estError;

      // 2. Insert items
      const { error: delError } = await supabase.from('rab_items').delete().eq('rab_estimation_id', estData.id);
      if (delError && !silent) console.error("Error deleting old items:", delError);

      if (items.length > 0) {
        const itemsToInsert = items.map(item => ({
          rab_estimation_id: estData.id,
          wbs_category: item.wbsCategory,
          description: item.description,
          quantity: item.type === 'material' ? item.qty : 0,
          labor_hours: item.type === 'labor' ? item.qty : 0,
          labor_rate: item.type === 'labor' ? item.unitPrice : 0,
          overhead_hours: item.type === 'overhead' ? item.qty * 8 : 0,
          overhead_rate: item.type === 'overhead' ? item.unitPrice / 8 : 0,
          item_total: calculateItemTotal(item),
          package_id: item.packageId || null
        }));

        const { error: itemsError } = await supabase.from('rab_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }

      // 3. Update SPK total cost
      const { error: spkError } = await supabase.from('spk').update({ 
        total_estimated_cost: totalCost,
        allocation_status: allocationStatus
      }).eq('id', spkId);
      if (spkError) throw spkError;

      if (!silent) alert('Estimation saved successfully!');
    } catch (err: any) {
      console.error(err);
      if (!silent) alert('Failed to save estimation: ' + err.message);
    }
  };

  const handleApplyPackageAllocation = async (allocatedItems: RabItemPayload[], isComplete: boolean, templateToSave?: Record<string, Record<string, number>>) => {
    if (!selectedPackage) return;
    const pkgId = selectedPackage.id;

    if (templateToSave) {
      try {
        for (const [itemId, allocation] of Object.entries(templateToSave)) {
          await packageService.updatePackageItemDefaultAllocation(itemId, allocation);
        }
        // Force refresh packages to get the new templates in state
        const pkgs = await packageService.getPackages();
        setPackages(pkgs);
      } catch (err) {
        console.error("Failed to save template:", err);
      }
    }

    const newItems = allocatedItems.map((payload) => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      wbsCategory: payload.wbsCategory,
      type: payload.type,
      description: payload.description,
      qty: payload.qty,
      unitPrice: payload.unitPrice,
      wasteFactor: payload.wasteFactor || 0,
      packageId: pkgId,
    }));
    
    setItems((prev) => [
      ...prev.filter(i => i.packageId !== pkgId),
      ...newItems
    ]);
    setAllocationStatus(isComplete ? 'COMPLETE' : 'PARTIAL');
    setIsPackageModalOpen(false);
    setSelectedPackage(null);
  };

  const appliedPackagesData = packages.filter(p => items.some(i => i.packageId === p.id));

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-surface-hover flex items-center justify-between">
         <h3 className="font-bold text-text font-display flex items-center gap-2">
           <Calculator className="w-5 h-5 text-primary"/> RAB Calculator
         </h3>
         <div className="flex gap-2">
           <button 
              onClick={handleExportXlsx}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-status-success/10 text-status-success border border-status-success/20 rounded hover:bg-status-success/20 transition"
              title="Export to XLSX"
           >
              <Download className="w-4 h-4" /> Export XLSX
           </button>
           <button 
              onClick={handlePrintPdf}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary/10 text-primary border border-primary/20 rounded hover:bg-primary/20 transition cursor-pointer" 
              title="Print to PDF"
           >
              <Printer className="w-4 h-4" /> Export PDF / Cetak
           </button>
         </div>
      </div>
      
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col - Input Form */}
        <div className="lg:col-span-1 space-y-6">
          
          <div className="bg-background border border-border rounded-lg p-4 mb-6">
            <h4 className="font-bold text-sm text-text border-b border-border pb-2 mb-3">Pilih Paket Barang Jadi (BOM)</h4>
            <div className="flex flex-col gap-2">
              <select
                className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-primary transition"
                onChange={(e) => {
                  const pkg = packages.find(p => p.id === e.target.value);
                  if (pkg) {
                    setSelectedPackage(pkg);
                    setIsPackageModalOpen(true);
                  }
                  e.target.value = ''; // Reset select
                }}
                value=""
              >
                <option value="" disabled>-- Pilih Paket BOM --</option>
                {packages.map(p => {
                  const isApplied = items.some(i => i.packageId === p.id);
                  return (
                    <option key={p.id} value={p.id} disabled={isApplied}>
                      {p.name} {isApplied ? '(Sudah Dialokasikan)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {appliedPackagesData.length > 0 && (
            <div className="bg-surface border border-border rounded-lg p-4 mb-6">
              <h4 className="font-bold text-sm text-text border-b border-border pb-2 mb-3 flex items-center gap-2">
                Paket BOM Diterapkan
                {allocationStatus === 'PARTIAL' && (
                  <span className="bg-status-warning/20 text-status-warning text-[10px] px-2 py-0.5 rounded-full font-bold">
                    Alokasi Sebagian (Perlu Dilengkapi)
                  </span>
                )}
              </h4>
              <div className="space-y-2">
                {appliedPackagesData.map(pkg => (
                  <div key={pkg.id} className="flex items-center justify-between bg-background p-2 rounded border border-border">
                    <span className="text-sm font-medium text-text">{pkg.name}</span>
                    <button
                      onClick={() => {
                        setSelectedPackage(pkg);
                        setIsPackageModalOpen(true);
                      }}
                      className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition font-bold"
                    >
                      Edit Alokasi
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-muted mb-2 font-mono">WBS Category</label>
            <select
              value={wbsCategory}
              onChange={(e) => setWbsCategory(e.target.value)}
              className="w-full bg-background border border-border rounded px-3 py-2 text-text focus:outline-none focus:border-primary transition"
            >
              {wbsCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>

          <form onSubmit={handleAddItem} className="bg-background border border-border rounded-lg p-4 space-y-4">
            <h4 className="font-bold text-sm text-text border-b border-border pb-2">Add Estimation Item</h4>
            
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                <input 
                  type="radio" 
                  name="type" 
                  value="material"
                  checked={newItem.type === 'material'}
                  onChange={() => setNewItem({...newItem, type: 'material'})}
                  className="accent-primary"
                />
                Material
              </label>
              <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                <input 
                  type="radio" 
                  name="type" 
                  value="labor"
                  checked={newItem.type === 'labor'}
                  onChange={() => setNewItem({...newItem, type: 'labor', wasteFactor: 0})}
                  className="accent-primary"
                />
                Labor
              </label>
              <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                <input 
                  type="radio" 
                  name="type" 
                  value="overhead"
                  checked={newItem.type === 'overhead'}
                  onChange={() => setNewItem({...newItem, type: 'overhead', wasteFactor: 0, unitPrice: bayHourlyRate * 8})}
                  className="accent-primary"
                />
                Overhead
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1 uppercase font-mono">Description</label>
              <input
                type="text"
                required
                value={newItem.description || ''}
                onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                placeholder={newItem.type === 'material' ? 'e.g. Steel Plate 2mm' : newItem.type === 'labor' ? 'e.g. Welding Specialist' : 'e.g. Workshop Bay Overhead'}
                className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1 uppercase font-mono">
                  {newItem.type === 'material' ? 'Qty' : newItem.type === 'overhead' ? 'Days' : 'Hours'}
                </label>
                <input
                  type="number"
                  required
                  min="0.1"
                  step="0.1"
                  value={newItem.qty || ''}
                  onChange={(e) => setNewItem({...newItem, qty: parseFloat(e.target.value)})}
                  className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1 uppercase font-mono">Unit Price / Rate</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newItem.unitPrice === 0 ? '' : newItem.unitPrice}
                  onChange={(e) => setNewItem({...newItem, unitPrice: parseFloat(e.target.value)})}
                  className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {newItem.type === 'material' && (
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1 uppercase font-mono">Waste Factor (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newItem.wasteFactor || ''}
                  onChange={(e) => setNewItem({...newItem, wasteFactor: parseFloat(e.target.value)})}
                  className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold py-2 px-4 rounded text-sm transition flex items-center justify-center gap-2 mt-2"
            >
              <Plus className="w-4 h-4" />
              {editingId ? 'Update Item' : 'Add Item'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setNewItem({
                    type: 'material',
                    qty: 1,
                    unitPrice: 0,
                    wasteFactor: 5,
                  });
                }}
                className="w-full bg-surface hover:bg-surface-hover text-text-muted border border-border font-bold py-2 px-4 rounded text-sm transition flex items-center justify-center gap-2 mt-2"
              >
                Cancel Edit
              </button>
            )}
          </form>
        </div>

        {/* Right Col - Estimation Table */}
        <div className="lg:col-span-2 flex flex-col h-full">
          <div className="flex-1 bg-background border border-border rounded-lg overflow-hidden flex flex-col">
            
            <div className="flex-1 overflow-auto">
              {items.length === 0 ? (
                <div className="h-full flex items-center justify-center text-text-muted text-sm p-8 text-center">
                  No items added yet.<br/>Select a WBS category and add items to estimate cost.
                </div>
              ) : (
                <table className="w-full text-left text-sm text-text">
                  <thead className="bg-surface sticky top-0 border-b border-border text-text-muted font-mono text-xs uppercase shadow-sm">
                    <tr>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">WBS</th>
                      <th className="px-4 py-3 text-right">Qty/Hrs/Days</th>
                      <th className="px-4 py-3 text-right">Price/Rate</th>
                      <th className="px-4 py-3 text-right">Waste</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-surface-hover/30 transition">
                        <td className="px-4 py-3 font-medium">{item.description}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-mono ${item.type === 'material' ? 'bg-status-info/10 text-status-info border border-status-info/20' : item.type === 'labor' ? 'bg-status-warning/10 text-status-warning border border-status-warning/20' : 'bg-status-danger/10 text-status-danger border border-status-danger/20'}`}>
                            {item.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-text-muted truncate max-w-[100px]">{item.wbsCategory}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.qty}</td>
                        <td className="px-4 py-3 text-right font-mono text-text-muted">
                          Rp {item.unitPrice.toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-text-muted">
                          {item.type === 'material' ? `${item.wasteFactor}%` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-primary">
                          Rp {calculateItemTotal(item).toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => handleEditItem(item)}
                              className="text-primary hover:text-primary-hover p-1 rounded hover:bg-primary/10 transition"
                              title="Edit item"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-status-danger hover:text-red-400 p-1 rounded hover:bg-status-danger/10 transition"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Total Footer */}
            <div className="bg-surface border-t border-border p-4 flex items-center justify-between">
               <span className="text-sm font-mono text-text-muted uppercase">Total Estimated Cost</span>
               <div className="flex items-center gap-2">
                 <span className="text-xl font-bold text-status-success">Rp</span>
                 <span className="text-2xl font-bold font-mono text-text">
                   {totalCost.toLocaleString('id-ID')}
                 </span>
               </div>
            </div>

          </div>
        </div>

      </div>

      {itemToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border rounded-lg p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-text mb-2">Konfirmasi Hapus</h3>
            <p className="text-sm text-text-muted mb-6">Apakah Anda yakin ingin menghapus item ini? Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 text-sm font-bold text-text-muted bg-surface hover:bg-surface-hover border border-border rounded transition"
              >
                Batal
              </button>
              <button 
                onClick={confirmRemoveItem}
                className="px-4 py-2 text-sm font-bold text-white bg-status-danger hover:bg-red-600 rounded transition"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPackage && (
        <PackageAllocationModal
          packageData={selectedPackage}
          existingItems={items.filter(i => i.packageId === selectedPackage.id)}
          isOpen={isPackageModalOpen}
          onClose={() => {
            setIsPackageModalOpen(false);
            setSelectedPackage(null);
          }}
          onApply={handleApplyPackageAllocation}
        />
      )}
    </div>
  );
};
