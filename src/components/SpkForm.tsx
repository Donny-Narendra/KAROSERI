import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Camera, Upload, Loader2 } from 'lucide-react';
import { CloudinaryUploader, UploadedImage } from './ui/CloudinaryUploader';

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
  const [vehicleVin, setVehicleVin] = useState('');
  const [vehicleEngine, setVehicleEngine] = useState('');
  const [targetDate, setTargetDate] = useState('');
  
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);

  const handleUploadSuccess = (image: UploadedImage) => {
    setUploadedImages((prev) => [...prev, image]);
  };

  const handleUploadRemove = (publicId: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.public_id !== publicId));
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
          vehicle_vin: vehicleVin || null,
          vehicle_engine: vehicleEngine || null,
          target_date: targetDate || null,
          created_by: profile.id,
          vehicle_photos: uploadedImages // Store Cloudinary images directly as JSONB
        })
        .select()
        .single();

      if (spkError) throw spkError;
      if (!spkData) throw new Error("Failed to create SPK");

      const spkId = spkData.id;

      // Create dummy assets for legacy compatibility if needed, or skip. We skip for now.

      // Reset form
      setSpkNo(`SPK-${Math.floor(1000 + Math.random() * 9000)}`);
      setCustomerName('');
      setVehiclePlate('');
      setVehicleVin('');
      setVehicleEngine('');
      setTargetDate('');
      setUploadedImages([]);
      
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-mono text-text-muted mb-2">VIN / CHASSIS NUMBER</label>
            <input
              type="text"
              value={vehicleVin}
              onChange={(e) => setVehicleVin(e.target.value)}
              className="w-full bg-background border border-border rounded px-4 py-2 text-text focus:outline-none focus:border-primary transition uppercase"
              placeholder="e.g. MH123456789"
            />
          </div>
          <div>
            <label className="block text-sm font-mono text-text-muted mb-2">ENGINE NUMBER</label>
            <input
              type="text"
              value={vehicleEngine}
              onChange={(e) => setVehicleEngine(e.target.value)}
              className="w-full bg-background border border-border rounded px-4 py-2 text-text focus:outline-none focus:border-primary transition uppercase"
              placeholder="e.g. 4D56-12345"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-mono text-text-muted mb-2">VEHICLE 360° PHOTOS</label>
          <CloudinaryUploader 
            onUploadSuccess={handleUploadSuccess} 
            onUploadRemove={handleUploadRemove} 
            uploadedImages={uploadedImages} 
          />
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
