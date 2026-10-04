import * as XLSX from 'xlsx';
import type { Material } from '../services/inventoryService';

export const exportMaterialsToExcel = (materials: Material[]) => {
  // Define Headers
  const headerLabels = ['ID Material', 'Nama Bahan', 'Satuan (Unit)', 'Stok Saat Ini', 'Stok Minimum', 'Harga Satuan (Rp)', 'Waste Factor (%)'];
  
  // Map data to array of arrays
  const dataRows = materials.length > 0 
    ? materials.map(m => [
        m.id,
        m.name,
        m.unit,
        m.current_stock,
        m.minimum_stock,
        m.unit_price,
        m.waste_factor_percentage
      ])
    : [
        ['', 'Contoh Bahan A', 'pcs', 100, 10, 50000, 5] // Example row if empty
      ];

  const aoa = [headerLabels, ...dataRows];

  // Create a new workbook and add the worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventaris');

  // Adjust column widths for better readability
  const colWidths = [
    { wch: 36 }, // ID Material (UUID)
    { wch: 30 }, // Nama Barang
    { wch: 15 }, // Satuan
    { wch: 15 }, // Stok Saat Ini
    { wch: 15 }, // Stok Minimum
    { wch: 20 }, // Harga Satuan (Rp)
    { wch: 18 }  // Waste Factor (%)
  ];
  worksheet['!cols'] = colWidths;

  // Generate dynamic filename
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const filename = `Inventaris_Karoseri_${year}${month}${day}.xlsx`;

  // Trigger download
  XLSX.writeFile(workbook, filename);
};
