import React from 'react';
import { OpexLoggingModal } from './OpexLoggingModal';
import type { OpexLoggingModalProps } from './OpexLoggingModal';

export interface OperatingExpenseManagerModalProps extends OpexLoggingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseChanged?: () => void; // Trigger refresh ke halaman utama
  onExpenseAdded?: () => void;
  currentMonth?: string;
  defaultMonth?: string;
}

export const OperatingExpenseManagerModal: React.FC<OperatingExpenseManagerModalProps> = (props) => {
  return <OpexLoggingModal {...props} />;
};

export default OperatingExpenseManagerModal;
