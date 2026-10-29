import React, { useState, useEffect } from 'react';
import { Pencil, Check, X, Lock, Loader2, AlertCircle } from 'lucide-react';
import { spkService } from '../services/spkService';
import { ConfirmationModal } from './ConfirmationModal';
import { SpkAgreementPhotos } from './spk/SpkAgreementPhotos';
import type { Spk } from '../types/spk';

interface SpkCredentialSectionProps {
  spk: Spk;
  onUpdated: () => void;
  initialEditMode?: boolean;
}

export const SpkCredentialSection: React.FC<SpkCredentialSectionProps> = ({
  spk,
  onUpdated,
  initialEditMode = false,
}) => {
  const [isEditMode, setIsEditMode] = useState(initialEditMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Form states
  const [customerName, setCustomerName] = useState(spk.customer_name || '');
  const [customerPhone, setCustomerPhone] = useState(spk.customer_phone || '');
  const [vehiclePlate, setVehiclePlate] = useState(spk.vehicle_plate || '');
  const [vehicleModel, setVehicleModel] = useState(spk.vehicle_model || spk.vehicleModel || '');
  const [vinChassis, setVinChassis] = useState(spk.vin_chassis || spk.vehicle_vin || '');
  const [engineNumber, setEngineNumber] = useState(spk.engine_number || spk.vehicle_engine || '');
  const [targetDate, setTargetDate] = useState(
    spk.target_date ? spk.target_date.substring(0, 10) : ''
  );
  const [subTasks, setSubTasks] = useState(
    Array.isArray(spk.sub_tasks)
      ? spk.sub_tasks.join('\n')
      : (spk.sub_tasks as unknown as string) || ''
  );

  // Sync state whenever spk changes or edit mode toggles
  useEffect(() => {
    setCustomerName(spk.customer_name || '');
    setCustomerPhone(spk.customer_phone || '');
    setVehiclePlate(spk.vehicle_plate || '');
    setVehicleModel(spk.vehicle_model || spk.vehicleModel || '');
    setVinChassis(spk.vin_chassis || spk.vehicle_vin || '');
    setEngineNumber(spk.engine_number || spk.vehicle_engine || '');
    setTargetDate(spk.target_date ? spk.target_date.substring(0, 10) : '');
    setSubTasks(
      Array.isArray(spk.sub_tasks)
        ? spk.sub_tasks.join('\n')
        : (spk.sub_tasks as unknown as string) || ''
    );
    setError(null);
  }, [spk, isEditMode]);

  useEffect(() => {
    if (initialEditMode) {
      setIsEditMode(true);
    }
  }, [initialEditMode]);

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim()) {
      setError('Nama pelanggan wajib diisi.');
      return;
    }
    if (!vehiclePlate.trim()) {
      setError('Nomor plat kendaraan wajib diisi.');
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    setLoading(true);
    setError(null);

    try {
      // Parse sub_tasks text into clean string array
      const parsedSubTasks = subTasks
        ? subTasks
            .split(/\r?\n/)
            .map((item) => item.trim())
            .filter(Boolean)
            .flatMap((line) => (line.includes(',') ? line.split(',').map((s) => s.trim()).filter(Boolean) : [line]))
        : [];

      await spkService.updateSpkCredentials({
        spkNo: spk.spk_no,
        targetDate: targetDate || null,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || null,
        vehiclePlate: vehiclePlate.trim().toUpperCase(),
        vehicleModel: vehicleModel.trim() || null,
        vinChassis: vinChassis.trim().toUpperCase() || null,
        engineNumber: engineNumber.trim().toUpperCase() || null,
        subTasks: parsedSubTasks,
      });

      setShowConfirmModal(false);
      setIsEditMode(false);
      onUpdated();
    } catch (err: any) {
      console.error('Update SPK Credentials Error:', err);
      setError(err.message || 'Gagal menyimpan perubahan credential SPK.');
      setShowConfirmModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset to current spk data and exit edit mode
    setCustomerName(spk.customer_name || '');
    setCustomerPhone(spk.customer_phone || '');
    setVehiclePlate(spk.vehicle_plate || '');
    setVehicleModel(spk.vehicle_model || spk.vehicleModel || '');
    setVinChassis(spk.vin_chassis || spk.vehicle_vin || '');
    setEngineNumber(spk.engine_number || spk.vehicle_engine || '');
    setTargetDate(spk.target_date ? spk.target_date.substring(0, 10) : '');
    setSubTasks(
      Array.isArray(spk.sub_tasks)
        ? spk.sub_tasks.join('\n')
        : (spk.sub_tasks as unknown as string) || ''
    );
    setError(null);
    setIsEditMode(false);
  };

  const rawSubTasks: unknown = spk?.sub_tasks;
  let parsedSubTasks: string[] = [];

  if (Array.isArray(rawSubTasks)) {
    parsedSubTasks = (rawSubTasks as string[]).filter(Boolean);
  } else if (typeof rawSubTasks === 'string') {
    try {
      const parsed = JSON.parse(rawSubTasks);
      parsedSubTasks = Array.isArray(parsed)
        ? parsed.filter(Boolean)
        : [rawSubTasks.trim()].filter(Boolean);
    } catch {
      parsedSubTasks = rawSubTasks.split(/[\n,]+/).map((s: string) => s.trim()).filter(Boolean);
    }
  }

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden p-6 mb-6">
      {/* Header section with SPK No and Edit Mode button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="font-bold text-lg text-text">
              SPK Details: <span className="text-primary font-mono">{spk.spk_no}</span>
            </h3>
            <span className="bg-surface-active px-2.5 py-0.5 rounded text-xs font-mono font-medium text-text-muted">
              {spk.status}
            </span>
            {isEditMode && (
              <span className="bg-amber-500/15 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded text-xs font-semibold">
                Mode Edit
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-1">
            {isEditMode
              ? 'Ubah informasi kredensial SPK, data kendaraan, dan scope pekerjaan.'
              : 'Kelola estimasi RAB, change order, serta progress tahapan untuk SPK ini.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isEditMode ? (
            <button
              type="button"
              onClick={() => setIsEditMode(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs hover:border-amber-500/50"
              title="Edit kredensial SPK ini"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Credential
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-hover hover:bg-surface-active text-text-muted hover:text-text rounded-lg text-xs font-medium transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Batal
            </button>
          )}

          <div className="font-mono text-sm bg-background px-3 py-1.5 rounded border border-border text-primary font-bold">
            {spk.spk_no}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-status-danger/10 border border-status-danger text-status-danger px-4 py-3 rounded text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Mode View: Tampilan Rangkuman Credential */}
      {!isEditMode ? (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 bg-background/60 p-4 rounded-lg border border-border/50 text-sm">
            <div>
              <span className="text-xs text-text-muted block uppercase tracking-wider">Pelanggan</span>
              <strong className="text-text font-medium text-base block mt-0.5">{spk.customer_name}</strong>
              {spk.customer_phone ? (
                <span className="text-xs text-text-muted font-mono">{spk.customer_phone}</span>
              ) : (
                <span className="text-xs text-slate-500 italic">Tanpa nomor telp</span>
              )}
            </div>

            <div>
              <span className="text-xs text-text-muted block uppercase tracking-wider">No. Polisi / Plat</span>
              <strong className="text-text font-mono text-base block mt-0.5">{spk.vehicle_plate || '-'}</strong>
            </div>

            <div>
              <span className="text-xs text-text-muted block uppercase tracking-wider">Model Kendaraan</span>
              <strong className="text-text font-medium text-base block mt-0.5">{spk.vehicle_model || spk.vehicleModel || '-'}</strong>
            </div>

            <div>
              <span className="text-xs text-text-muted block uppercase tracking-wider">VIN / No. Rangka</span>
              <strong className="text-text font-mono text-base block mt-0.5">
                {spk.vin_chassis || spk.vehicle_vin || '-'}
              </strong>
            </div>

            <div>
              <span className="text-xs text-text-muted block uppercase tracking-wider">Tanggal Registrasi</span>
              <strong className="text-text text-base block mt-0.5">
                {spk.created_at
                  ? new Date(spk.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '-'}
              </strong>
              {spk.created_at && !isNaN(new Date(spk.created_at).getTime()) ? (
                <span className="text-xs text-text-muted font-mono block">
                  {new Date(spk.created_at).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  }).replace('.', ':')} WIB
                </span>
              ) : null}
            </div>

            <div>
              <span className="text-xs text-text-muted block uppercase tracking-wider">Target Selesai</span>
              <strong className="text-text text-base block mt-0.5">
                {spk.target_date
                  ? new Date(spk.target_date).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '-'}
              </strong>
              {spk.engine_number || spk.vehicle_engine ? (
                <span className="text-xs text-text-muted font-mono block">
                  Mesin: {spk.engine_number || spk.vehicle_engine}
                </span>
              ) : null}
            </div>
          </div>

          {/* --- KOTAK SCOPE MODIFIKASI / SUB TASKS --- */}
          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <div className="bg-slate-950/60 border border-slate-800/90 rounded-lg p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                SCOPE MODIFIKASI / SUB TASKS:
              </span>

              {parsedSubTasks.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {parsedSubTasks.map((task: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 text-xs font-semibold bg-slate-800/90 text-slate-200 border border-slate-700/80 rounded-md shadow-sm"
                    >
                      {task}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  Belum ada rincian scope modifikasi. Klik &quot;Edit Credential&quot; untuk menambahkan sub task.
                </p>
              )}
            </div>
          </div>

          {/* --- KOTAK DOKUMENTASI SURAT KESEPAKATAN KERJA (Tetap Berada di Bawahnya) --- */}
          <SpkAgreementPhotos spk={spk} onUpdated={onUpdated} />
        </div>
      ) : (
        /* Mode Edit: Form 5-Baris Sesuai Spesifikasi */
        <form onSubmit={handleOpenConfirm} className="mt-4 space-y-4">
          {/* Row 1: SPK Number & Target Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2 flex items-center justify-between">
                <span>SPK Number</span>
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Read-only ID
                </span>
              </label>
              <input
                type="text"
                value={spk.spk_no}
                readOnly
                disabled
                className="w-full bg-slate-950/70 border border-slate-800 rounded p-2.5 text-slate-400 cursor-not-allowed font-mono text-sm opacity-90"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2 block">
                Target Date
              </label>
              <input
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
              <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2 block">
                Customer Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. PT Logistik Indo"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded p-2.5 text-slate-200 focus:outline-none focus:border-amber-500 text-sm"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2 block">
                Phone Number
              </label>
              <input
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
              <label htmlFor="cred-vehicle-plate" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Vehicle Plate
              </label>
              <input
                id="cred-vehicle-plate"
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
              <label htmlFor="cred-vehicle-vin" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                VIN / Chassis Number
              </label>
              <input
                id="cred-vehicle-vin"
                type="text"
                name="vehicle_vin"
                placeholder="E.G. MH123456789"
                value={vinChassis}
                onChange={(e) => setVinChassis(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 uppercase"
              />
            </div>
          </div>

          {/* Row 4: Engine Number & Vehicle Model / Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cred-vehicle-engine" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                ENGINE NUMBER
              </label>
              <input
                id="cred-vehicle-engine"
                type="text"
                name="vehicle_engine"
                placeholder="e.g. 4D56-12345"
                value={engineNumber}
                onChange={(e) => setEngineNumber(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 uppercase"
              />
            </div>

            <div>
              <label htmlFor="cred-vehicle-model" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                VEHICLE MODEL / TYPE
              </label>
              <input
                id="cred-vehicle-model"
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
            <span className="text-[11px] text-slate-500 block mt-1">
              * Pisahkan tiap sub-pekerjaan dengan baris baru (enter) atau tanda koma.
            </span>
          </div>

          {/* Buttons: Batal & Simpan Perubahan */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-surface-active text-text-muted hover:text-text transition cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={loading}
              className="bg-primary hover:bg-primary-hover text-background font-bold px-6 py-2 rounded-lg text-sm transition flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        title="Konfirmasi Simpan Perubahan"
        message={`Apakah Anda yakin ingin memperbarui data kredensial untuk ${spk.spk_no}? Perubahan pelanggan, tanggal, kendaraan, dan sub-task akan disimpan ke database.`}
        confirmText="Ya, Simpan Perubahan"
        cancelText="Periksa Kembali"
        variant="warning"
        isLoading={loading}
        onConfirm={handleConfirmSave}
        onCancel={() => setShowConfirmModal(false)}
      />
    </div>
  );
};
