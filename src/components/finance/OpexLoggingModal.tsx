import React from 'react';
import { OperatingExpenseManagerModal } from './OperatingExpenseManagerModal';

export interface OpexLoggingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseAdded?: () => void;
  defaultMonth?: string;
}

/**
 * OpexLoggingModal
 * Modal Pencatatan Biaya Operasional Berkala (OPEX)
 * Dilengkapi integrasi master kategori dinamis dan sub-modal Kelola Kategori Beban.
 */
export const OpexLoggingModal: React.FC<OpexLoggingModalProps> = (props) => {
  return <OperatingExpenseManagerModal {...props} />;
};

export default OpexLoggingModal;
