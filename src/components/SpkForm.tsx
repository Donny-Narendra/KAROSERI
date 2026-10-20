import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Upload, Loader2, Check, Lock } from 'lucide-react';
import { CloudinaryUploader } from './ui/CloudinaryUploader';
import type { UploadedImage } from './ui/CloudinaryUploader';
import { ConfirmationModal } from './ConfirmationModal';
import { spkService } from '../services/spkService';
import type { Spk } from '../types/spk';

interface SpkFormProps {
  initialData?: Spk | null;
  isEditMode?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const SpkForm: React.FC<SpkFormProps> = ({
  initialData,
  isEditMode = false,
  onSuccess,
  onCancel,
}) => {
  const { profile } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [spkNo, setSpkNo] = useState(() => `SPK-${Math.floor(1000 + Math.random() * 9000)}`);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleVin, setVehicleVin] = useState('');
  const [vehicleEngine, setVehicleEngine] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [subTasks, setSubTasks] = useState('');

  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);

  useEffect(() => {
    if (isEditMode && initialData) {
      setSpkNo(initialData.spk_no || '');
      setCustomerName(initialData.customer_name || '');
      setCustomerPhone(initialData.customer_phone || '');
      setVehiclePlate(initialData.vehicle_plate || '');
      setVehicleModel(initialData.vehicle_model || initialData.vehicleModel || '');
      setVehicleVin(initialData.vin_chassis || initialData.vehicle_vin || '');
      setVehicleEngine(initialData.engine_number || initialData.vehicle_engine || '');
      setTargetDate(initialData.target_date ? initialData.target_date.substring(0, 10) : '');
      const tasks = initialData.sub_tasks;
      if (Array.isArray(tasks)) {
        setSubTasks(tasks.join('\n'));
      } else if (tasks) {
        setSubTasks(String(tasks));
      } else {
        setSubTasks('');
      }
      setUploadedImages(initialData.vehicle_photos || []);
    }
  }, [isEditMode, initialData]);

  const handleUploadSuccess = (image: UploadedImage) => {
    setUploadedImages((prev) => [...prev, image]);
  };

  const handleUploadRemove = (publicId: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.public_id !== publicId));
  };

  const parseSubTasks = (text: string): string[] => {
    if (!text.trim()) return [];
    return text
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean)
      .flatMap((line) => (line.includes(',') ? line.split(',').map((s) => s.trim()).filter(Boolean) : [line]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!profile) {
      setError('User profile not found. Please log in again.');
      return;
    }

    if (isEditMode) {
      setShowConfirmModal(true);
    } else {
      handleCreateSpk();
    }
  };

  const handleCreateSpk = async () => {
    setLoading(true);
    try {
      const parsedSubTasks = parseSubTasks(subTasks);

      const { data: spkData, error: spkError } = await supabase
        .from('spk')
        .insert({
          spk_no: spkNo,
          customer_name: customerName,
          customer_phone: customerPhone || null,
          vehicle_plate: vehiclePlate,
          vehicle_model: vehicleModel.trim() || null,
          vehicle_vin: vehicleVin || null,
          vin_chassis: vehicleVin || null,
          vehicle_engine: vehicleEngine || null,
          engine_number: vehicleEngine || null,
          target_date: targetDate || null,
          sub_tasks: parsedSubTasks.length > 0 ? parsedSubTasks : null,
          created_by: profile!.id,
          vehicle_photos: uploadedImages,
        })
        .select()
        .single();

      if (spkError) throw spkError;
      if (!spkData) throw new Error('Failed to create SPK');

      // Reset form
      setSpkNo(`SPK-${Math.floor(1000 + Math.random() * 9000)}`);
      setCustomerName('');
      setCustomerPhone('');
      setVehiclePlate('');
      setVehicleModel('');
      setVehicleVin('');
      setVehicleEngine('');
      setTargetDate('');
      setSubTasks('');
      setUploadedImages([]);

      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('SPK Submission Error:', err);
      setError(err.message || 'An error occurred during submission');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSpk = async () => {
    setLoading(true);
    try {
      const parsedSubTasks = parseSubTasks(subTasks);

      await spkService.updateSpkCredentials({
        spkNo,
        targetDate: targetDate || null,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || null,
        vehiclePlate: vehiclePlate.trim().toUpperCase(),
        vehicleModel: vehicleModel.trim() || null,
        vinChassis: vehicleVin.trim().toUpperCase() || null,
        engineNumber: vehicleEngine.trim().toUpperCase() || null,
        subTasks: parsedSubTasks,
      });

      setShowConfirmModal(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('SPK Update Error:', err);
      setError(err.message || 'An error occurred during update');
      setShowConfirmModal(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold font-display text-text">
            {isEditMode ? `Edit Credential SPK: ${spkNo}` : 'Register New SPK'}
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            {isEditMode
              ? 'Perbarui kredensial pelanggan, spesifikasi kendaraan, dan target penyelesaian.'
              : 'Daftarkan surat perintah kerja baru ke dalam sistem.'}
          </p>
        </div>
        {isEditMode && (
          <span className="bg-amber-500/15 border border-amber-500/30 text-amber-400 px-2.5 py-1 rounded text-xs font-semibold">
            Mode Edit
          </span>
        )}
      </div>

      {error && (
        <div className="bg-status-danger/10 border border-status-danger text-status-danger px-4 py-3 rounded mb-6 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: SPK Number & Target Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2 flex items-center justify-between">
              <span>SPK Number</span>
              {isEditMode && (
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Read-only ID
                </span>
              )}
            </label>
            <input
              type="text"
              value={spkNo}
              readOnly
              disabled={isEditMode}
              className={`w-full rounded p-2.5 text-sm font-mono ${
                isEditMode
                  ? 'bg-slate-950/70 border border-slate-800 text-slate-400 cursor-not-allowed opacity-90'
                  : 'bg-slate-900/50 border border-slate-700 text-slate-200 focus:outline-none focus:border-amber-500'
              }`}
            />
          </div>
          <div>
            <label htmlFor="target-date" className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2 block">
              Target Date
            </label>
            <input
              id="target-date"
              type="date"
              required
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded p-2.5 text-slate-200 focus:outline-none focus:border-amber-500 [&::-webkit-calendar-picker-indicator]:filter-invert text-sm"
            />
          </div>
        </div>

        {/* Row 2: Customer Name & Phone Number */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="customer-name" className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2 block">
              Customer Name
            </label>
            <input
              id="customer-name"
              type="text"
              required
              placeholder="e.g. PT Logistik Indo"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded p-2.5 text-slate-200 focus:outline-none focus:border-amber-500 text-sm"
            />
          </div>
          <div>
            <label htmlFor="customer-phone" className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2 block">
              Phone Number
            </label>
            <input
              id="customer-phone"
              type="tel"
              placeholder="e.g. 0812-3456-7890"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded p-2.5 text-slate-200 focus:outline-none focus:border-amber-500 text-sm"
            />
          </div>
        </div>

        {/* Row 3: Vehicle Plate & Chassis Number */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="vehicle-plate" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Vehicle Plate
            </label>
            <input
              id="vehicle-plate"
              type="text"
              name="vehicle_plate"
              required
              placeholder="E.G. B 1234 CD"
              value={vehiclePlate}
              onChange={(e) => setVehiclePlate(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 uppercase"
            />
          </div>
          <div>
            <label htmlFor="vehicle-vin" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              VIN / Chassis Number
            </label>
            <input
              id="vehicle-vin"
              type="text"
              name="vehicle_vin"
              placeholder="E.G. MH123456789"
              value={vehicleVin}
              onChange={(e) => setVehicleVin(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 uppercase"
            />
          </div>
        </div>

        {/* Row 4: Engine Number & Vehicle Model / Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="vehicle-engine" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              ENGINE NUMBER
            </label>
            <input
              id="vehicle-engine"
              type="text"
              name="vehicle_engine"
              placeholder="e.g. 4D56-12345"
              value={vehicleEngine}
              onChange={(e) => setVehicleEngine(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 uppercase"
            />
          </div>

          <div>
            <label htmlFor="vehicle-model" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              VEHICLE MODEL / TYPE
            </label>
            <input
              id="vehicle-model"
              type="text"
              name="vehicle_model"
              placeholder="e.g. Hino Dutro 130 HD / Canter FE 74"
              value={vehicleModel}
              onChange={(e) => setVehicleModel(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Row 5: Sub Task / Modification Scope */}
        <div>
          <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2 block">
            Sub Task / Pekerjaan Modifikasi
          </label>
          <textarea
            rows={3}
            placeholder="Contoh: Potong sasis 50 cm, instalasi boks aluminium, pemasangan hidrolik PTO..."
            value={subTasks}
            onChange={(e) => setSubTasks(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-700 rounded p-2.5 text-slate-200 focus:outline-none focus:border-amber-500 text-sm font-mono"
          />
        </div>

        {!isEditMode && (
          <div>
            <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2 block">
              Vehicle 360° Photos
            </label>
            <CloudinaryUploader
              onUploadSuccess={handleUploadSuccess}
              onUploadRemove={handleUploadRemove}
              uploadedImages={uploadedImages}
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-surface-active text-text-muted hover:text-text transition cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-primary hover:bg-primary-hover text-background font-bold py-2.5 px-6 rounded-lg text-sm transition flex items-center gap-2 disabled:opacity-70 cursor-pointer shadow-sm"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isEditMode ? (
              <Check className="w-5 h-5" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
            {loading
              ? isEditMode
                ? 'Menyimpan...'
                : 'Processing...'
              : isEditMode
              ? 'Simpan Perubahan'
              : 'Register SPK'}
          </button>
        </div>
      </form>

      {/* Confirmation Modal in Edit Mode */}
      {isEditMode && (
        <ConfirmationModal
          isOpen={showConfirmModal}
          title="Konfirmasi Simpan Perubahan"
          message={`Apakah Anda yakin ingin memperbarui data kredensial untuk SPK ${spkNo}? Perubahan data pelanggan, kendaraan, dan sub-task akan disimpan ke database.`}
          confirmText="Ya, Simpan Perubahan"
          cancelText="Batal"
          variant="warning"
          isLoading={loading}
          onConfirm={handleUpdateSpk}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
    </div>
  );
};
