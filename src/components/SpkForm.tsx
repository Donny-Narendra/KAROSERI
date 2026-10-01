import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Camera, Upload, X, Loader2 } from 'lucide-react';

interface SpkFormProps {
  onSuccess?: () => void;
}

export const SpkForm: React.FC<SpkFormProps> = ({ onSuccess }) => {
  const { profile } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [spkNo, setSpkNo] = useState(() => `SPK-${Math.floor(1000 + Math.random() * 9000)}`);
  const [customerName, setCustomerName] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!profile) {
      setError("User profile not found. Please log in again.");
      setLoading(false);
      return;
    }

    try {
      // 1. Insert SPK
      const { data: spkData, error: spkError } = await supabase
        .from('spk')
        .insert({
          spk_no: spkNo,
          customer_name: customerName,
          vehicle_plate: vehiclePlate,
          target_date: targetDate || null,
          created_by: profile.id
        })
        .select()
        .single();

      if (spkError) throw spkError;
      if (!spkData) throw new Error("Failed to create SPK");

      const spkId = spkData.id;

      // 2. Upload files and create asset records
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${spkId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('spk-assets')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { error: assetError } = await supabase
          .from('spk_assets')
          .insert({
            spk_id: spkId,
            file_url: filePath,
            description: file.name,
            uploaded_by: profile.id
          });

        if (assetError) throw assetError;
      }

      // Reset form
      setSpkNo(`SPK-${Math.floor(1000 + Math.random() * 9000)}`);
      setCustomerName('');
      setVehiclePlate('');
      setTargetDate('');
      setFiles([]);
      
      if (onSuccess) onSuccess();

    } catch (err: any) {
      console.error("SPK Submission Error:", err);
      setError(err.message || "An error occurred during submission");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-lg p-6">
      <h3 className="text-xl font-bold font-display text-text mb-6">Register New SPK</h3>
      
      {error && (
        <div className="bg-status-danger/10 border border-status-danger text-status-danger px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-mono text-text-muted mb-2">SPK NUMBER</label>
            <input
              type="text"
              required
              value={spkNo}
              onChange={(e) => setSpkNo(e.target.value)}
              className="w-full bg-background border border-border rounded px-4 py-2 text-text focus:outline-none focus:border-primary transition"
            />
          </div>
          <div>
            <label className="block text-sm font-mono text-text-muted mb-2">TARGET DATE</label>
            <input
              type="date"
              required
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full bg-background border border-border rounded px-4 py-2 text-text focus:outline-none focus:border-primary transition [&::-webkit-calendar-picker-indicator]:filter-invert"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-mono text-text-muted mb-2">CUSTOMER NAME</label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full bg-background border border-border rounded px-4 py-2 text-text focus:outline-none focus:border-primary transition"
              placeholder="e.g. PT Logistik Indo"
            />
          </div>
          <div>
            <label className="block text-sm font-mono text-text-muted mb-2">VEHICLE PLATE</label>
            <input
              type="text"
              required
              value={vehiclePlate}
              onChange={(e) => setVehiclePlate(e.target.value)}
              className="w-full bg-background border border-border rounded px-4 py-2 text-text focus:outline-none focus:border-primary transition uppercase"
              placeholder="e.g. B 1234 CD"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-mono text-text-muted mb-2">VEHICLE 360° PHOTOS</label>
          <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center bg-background/50 hover:bg-background transition relative">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Camera className="w-8 h-8 text-text-muted mb-3" />
            <p className="text-text font-medium">Click or drag photos to upload</p>
            <p className="text-text-muted text-sm mt-1">Capture all angles of the incoming vehicle</p>
          </div>

          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between bg-surface-hover px-4 py-2 rounded border border-border">
                  <span className="text-sm text-text truncate max-w-[80%]">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="text-text-muted hover:text-status-danger transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <button
            type="submit"
            disabled={loading}
            className="bg-primary hover:bg-primary-hover text-background font-bold py-2 px-6 rounded transition flex items-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            {loading ? 'Processing...' : 'Register SPK'}
          </button>
        </div>
      </form>
    </div>
  );
};
