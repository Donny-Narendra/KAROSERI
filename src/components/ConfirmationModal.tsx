import React, { useEffect } from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, X } from 'lucide-react';

export type ConfirmationModalVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmationModalVariant;
  hideCancel?: boolean;
  isLoading?: boolean;
  children?: React.ReactNode;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  variant = 'danger',
  hideCancel = false,
  isLoading = false,
  children,
  onConfirm,
  onCancel,
}) => {
  // Tutup dengan tombol Escape jika modal terbuka dan tidak sedang loading
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  const renderIcon = () => {
    switch (variant) {
      case 'warning':
        return (
          <div className="p-2.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        );
      case 'info':
        return (
          <div className="p-2.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 shrink-0">
            <Info className="w-5 h-5" />
          </div>
        );
      case 'success':
        return (
          <div className="p-2.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        );
      case 'danger':
      default:
        return (
          <div className="p-2.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
        );
    }
  };

  const getConfirmButtonClasses = () => {
    switch (variant) {
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-500 active:scale-95 text-white';
      case 'info':
        return 'bg-primary hover:bg-primary-hover active:scale-95 text-white';
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white';
      case 'danger':
      default:
        return 'bg-rose-600 hover:bg-rose-500 active:scale-95 text-white';
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-70 animate-in fade-in duration-150"
      onClick={() => {
        if (!isLoading) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
    >
      <div
        className="bg-surface border border-border rounded-xl shadow-2xl p-5 max-w-md w-full space-y-4 animate-in zoom-in-95 duration-150 relative text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tombol X pojok kanan atas */}
        {!isLoading && (
          <button
            type="button"
            onClick={onCancel}
            className="absolute top-4 right-4 text-text-muted hover:text-text p-1 rounded-lg hover:bg-background transition-colors"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-start gap-3.5 pr-6">
          {renderIcon()}
          <div className="space-y-1.5 min-w-0">
            <h4 id="confirmation-modal-title" className="font-bold text-base sm:text-lg text-text leading-tight">
              {title}
            </h4>
            {message && (
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed whitespace-pre-line">
                {message}
              </p>
            )}
            {children}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          {!hideCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-3.5 py-1.5 rounded-lg border border-border text-xs sm:text-sm font-medium hover:bg-background text-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 shadow disabled:opacity-50 disabled:cursor-not-allowed ${getConfirmButtonClasses()}`}
          >
            {isLoading && (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
