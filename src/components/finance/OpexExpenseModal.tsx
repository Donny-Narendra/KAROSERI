import React from 'react';
import { OperatingExpenseManagerModal } from './OperatingExpenseManagerModal';

export interface OpexExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseAdded?: () => void;
  defaultMonth?: string;
}

export const OpexExpenseModal: React.FC<OpexExpenseModalProps> = (props) => {
  return <OperatingExpenseManagerModal {...props} />;
};

export default OpexExpenseModal;
