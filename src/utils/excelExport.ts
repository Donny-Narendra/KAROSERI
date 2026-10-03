import * as XLSX from 'xlsx';
import type { Material } from '../services/inventoryService';

export const exportMaterialsToExcel = (materials: Material[]) => {
  // Map data to the requested format
  const dataToExport = materials.map((m) => ({
    'ID Material': m.id,
    'Nama Barang': m.name,
    'Satuan': m.unit,
    'Stok Saat Ini': m.current_stock,
    'Stok Minimum': m.minimum_stock,
    'Harga Satuan (Rp)': m.unit_price,
    'Waste Factor (%)': m.waste_factor_percentage
  }));

  // Create a new workbook and add the worksheet
  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventaris');

  // Adjust column widths for better readability
  const colWidths = [
    { wch: 36 }, // ID Material (UUID)
    { wch: 30 }, // Nama Barang
    { wch: 10 }, // Satuan
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
