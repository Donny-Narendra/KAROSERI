import React from 'react';
import { InventoryManager } from '../components/InventoryManager';

export const InventoryPage: React.FC = () => {
  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto">
        <InventoryManager />
      </div>
    </div>
  );
};

export default InventoryPage;
