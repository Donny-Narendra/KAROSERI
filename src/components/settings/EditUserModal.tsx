import React, { useState, useEffect } from 'react';
import { X, Save, Eye, EyeOff, AlertCircle, ShieldCheck, UserCog } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import type { UserProfile, UserRole } from '../../types/auth';

export interface EditUserModalProps {
  isOpen: boolean;
  user: UserProfile | null;
  currentUserId?: string | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'service_advisor', label: 'Service Advisor' },
  { value: 'mandor', label: 'Mandor' },
  { value: 'petugas_gudang', label: 'Petugas Gudang' },
  { value: 'kasir', label: 'Kasir' },
];

export const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  user,
  currentUserId,
  onClose,
  onSuccess,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('service_advisor');
  const [isActive, setIsActive] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isEditingSelf = Boolean(user && currentUserId && user.id === currentUserId);
  const isSelfOwnerLocked = isEditingSelf && user?.role === 'owner';

  useEffect(() => {
    if (isOpen && user) {
      setFullName(user.full_name || '');
      setEmail(user.email || '');
      setRole(user.role || 'service_advisor');
      setIsActive(user.is_active !== false);
      setNewPassword('');
      setShowPassword(false);
      setErrorMsg(null);
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setErrorMsg('Nama lengkap wajib diisi.');
      return;
    }

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMsg('Format email tidak valid.');
      return;
    }

    if (newPassword.length > 0 && newPassword.length < 6) {
      setErrorMsg('Password baru minimal harus terdiri dari 6 karakter.');
      return;
    }

    const effectiveRole: UserRole = isSelfOwnerLocked ? 'owner' : role;
    const effectiveIsActive: boolean = isSelfOwnerLocked ? true : isActive;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc('admin_update_user_account', {
        p_target_user_id: user.id,
        p_full_name: trimmedName,
        p_email: trimmedEmail,
        p_role: effectiveRole,
        p_is_active: effectiveIsActive,
        p_new_password: newPassword.length > 0 ? newPassword : null,
      });

      if (error) throw error;

      const passwordNotice = newPassword.length > 0 ? ' Password akun juga telah diperbarui.' : '';
      onSuccess(
        `Data pengguna ${trimmedName} (${effectiveRole}) berhasil diperbarui.${passwordNotice}`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal memperbarui data pengguna.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-user-modal-title"
    >
      <div
        className="bg-surface border border-border rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-background/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/15 text-primary border border-primary/30">
              <UserCog className="w-5 h-5" />
            </div>
            <div>
              <h3 id="edit-user-modal-title" className="font-display font-bold text-lg text-text leading-tight">
                Edit Data Pengguna
              </h3>
              <p className="text-xs text-text-muted font-mono">
                Perbarui profil, peran, status akses, atau reset password
              </p>
            </div>
          </div>
          {!isSubmitting && (
            <button
              type="button"
              onClick={onClose}
              className="text-text-muted hover:text-text p-1.5 rounded-lg hover:bg-background transition-colors"
              aria-label="Tutup modal"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-status-danger/10 border border-status-danger/30 text-status-danger text-xs sm:text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isSelfOwnerLocked && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-text text-xs flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                Anda sedang mengedit akun <strong>Owner</strong> Anda sendiri. Role Owner dan status aktif dikunci untuk mencegah terkuncinya akses sistem.
              </span>
            </div>
          )}

          <div>
            <label htmlFor="edit-user-fullname" className="block text-xs font-mono text-text-muted mb-1">
              Nama Lengkap <span className="text-status-danger">*</span>
            </label>
            <input
              id="edit-user-fullname"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isSubmitting}
              placeholder="Nama lengkap staf"
              className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="edit-user-email" className="block text-xs font-mono text-text-muted mb-1">
              Email <span className="text-status-danger">*</span>
            </label>
            <input
              id="edit-user-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              placeholder="nama@karoseri.co.id"
              className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none disabled:opacity-60"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-user-role" className="block text-xs font-mono text-text-muted mb-1">
                Role
              </label>
              <select
                id="edit-user-role"
                value={isSelfOwnerLocked ? 'owner' : role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                disabled={isSubmitting || isSelfOwnerLocked}
                className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="block text-xs font-mono text-text-muted mb-1">
                Status Akun
              </span>
              <div className="flex items-center justify-between bg-background border border-border rounded px-3 py-1.5 h-[38px]">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold font-mono ${
                    (isSelfOwnerLocked ? true : isActive)
                      ? 'bg-status-success/20 text-status-success'
                      : 'bg-status-danger/20 text-status-danger'
                  }`}
                >
                  {(isSelfOwnerLocked ? true : isActive) ? 'AKTIF' : 'NONAKTIF'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isSelfOwnerLocked ? true : isActive}
                  aria-label="Toggle status akun pengguna"
                  disabled={isSubmitting || isSelfOwnerLocked}
                  onClick={() => setIsActive((prev) => !prev)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                    (isSelfOwnerLocked ? true : isActive) ? 'bg-status-success' : 'bg-border'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      (isSelfOwnerLocked ? true : isActive) ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="edit-user-password" className="block text-xs font-mono text-text-muted mb-1">
              Reset Password Baru (Opsional)
            </label>
            <div className="relative">
              <input
                id="edit-user-password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isSubmitting}
                autoComplete="new-password"
                placeholder="Minimal 6 karakter"
                className="w-full bg-background border border-border rounded pl-3 pr-10 py-2 text-sm text-text focus:border-primary focus:outline-none disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={isSubmitting}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-text-muted hover:text-text transition-colors"
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-text-muted mt-1">
              Kosongkan jika tidak ingin mengubah password
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border border-border text-xs sm:text-sm font-medium text-text hover:bg-background transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-primary text-background font-bold text-xs sm:text-sm hover:bg-secondary transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
