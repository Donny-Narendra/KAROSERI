import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmationModal } from '../ConfirmationModal';

describe('Component: ConfirmationModal', () => {
  it('does not render anything when isOpen is false', () => {
    const { container } = render(
      <ConfirmationModal
        isOpen={false}
        title="Konfirmasi Tindakan"
        message="Apakah Anda yakin?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders modal with title, message, and default buttons when isOpen is true', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        title="Hapus Data Material"
        message="Material yang dihapus tidak dapat dipulihkan."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Hapus Data Material')).toBeInTheDocument();
    expect(screen.getByText('Material yang dihapus tidak dapat dipulihkan.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ya, Lanjutkan/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Batal/i })).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const handleConfirm = vi.fn();
    render(
      <ConfirmationModal
        isOpen={true}
        title="Konfirmasi"
        confirmText="Setujui Pengeluaran"
        onConfirm={handleConfirm}
        onCancel={vi.fn()}
      />
    );

    const confirmBtn = screen.getByRole('button', { name: /Setujui Pengeluaran/i });
    fireEvent.click(confirmBtn);

    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button or backdrop is clicked', () => {
    const handleCancel = vi.fn();
    render(
      <ConfirmationModal
        isOpen={true}
        title="Konfirmasi"
        onConfirm={vi.fn()}
        onCancel={handleCancel}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /Batal/i });
    fireEvent.click(cancelBtn);

    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('hides cancel button when hideCancel is true (alert mode)', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        title="Pemberitahuan Sistem"
        message="Operasi berhasil diselesaikan."
        hideCancel={true}
        confirmText="Mengerti"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: /Batal/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mengerti/i })).toBeInTheDocument();
  });

  it('disables buttons and shows loading state when isLoading is true', () => {
    const handleConfirm = vi.fn();
    render(
      <ConfirmationModal
        isOpen={true}
        title="Menyimpan Data"
        isLoading={true}
        onConfirm={handleConfirm}
        onCancel={vi.fn()}
      />
    );

    const confirmBtn = screen.getByRole('button', { name: /Ya, Lanjutkan/i });
    expect(confirmBtn).toBeDisabled();

    fireEvent.click(confirmBtn);
    expect(handleConfirm).not.toHaveBeenCalled();
  });

  it('calls onCancel when Escape key is pressed', () => {
    const handleCancel = vi.fn();
    render(
      <ConfirmationModal
        isOpen={true}
        title="Tutup Modal"
        onConfirm={vi.fn()}
        onCancel={handleCancel}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('renders custom children when provided', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        title="Input Alasan"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      >
        <input data-testid="custom-input" placeholder="Masukkan alasan pembatalan..." />
      </ConfirmationModal>
    );

    expect(screen.getByTestId('custom-input')).toBeInTheDocument();
  });
});
