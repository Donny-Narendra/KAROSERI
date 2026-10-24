import * as XLSX from 'xlsx';
import { sortRabItems } from './rabSort';

export interface RabExportSpkDetails {
  spk_no?: string | null;
  customer_name?: string | null;
  vehicle_number?: string | null;
  vehicle_plate?: string | null;
  vehicle_model?: string | null;
}

export interface RabExportItem {
  wbsCategory?: string;
  wbs_category?: string;
  wbs_stage?: string;
  type?: 'material' | 'labor' | 'overhead' | string;
  item_type?: string;
  description?: string;
  material_name?: string;
  qty?: number;
  quantity?: number | string;
  unit?: string;
  unitPrice?: number;
  unit_price?: number | string;
  costPrice?: number;
  cost_price?: number | string;
  subtotal?: number;
  package_name?: string | null;
  packageName?: string | null;
  package_id?: string | null;
  packageId?: string | null;
  notes?: string | null;
  /** @deprecated Waste factor is permanently eliminated */
  wasteFactor?: number;
}

export interface RabExportTotals {
  material: number;
  labor: number;
  overhead: number;
  grandTotal: number;
}

export const getRabItemSourceOrigin = (item: RabExportItem): { label: string; isPackage: boolean } => {
  let raw: string | null = item.package_name || item.packageName || null;
  if (!raw && item.notes) {
    const match = item.notes.match(/(?:bagian dari paket:\s*|paket:\s*|\[paket:\s*)([^\]\r\n,;]+)/i);
    if (match && match[1]) {
      raw = match[1].trim();
    } else if (item.notes.toLowerCase().includes('paket')) {
      raw = item.notes
        .replace(/bagian dari paket:\s*/i, '')
        .replace(/paket:\s*/i, '')
        .replace(/^\[+|\]+$/g, '')
        .trim();
    }
  }

  if (raw) {
    const clean = raw.replace(/^Paket:\s*/i, '').trim();
    return {
      label: `Paket: ${clean}`,
      isPackage: true,
    };
  }
  return {
    label: 'Granular',
    isPackage: false,
  };
};

export const exportRabToExcel = (
  spkDetails: RabExportSpkDetails | null | undefined,
  rabItems: RabExportItem[],
  totals?: RabExportTotals
) => {
  const sortedExportItems = sortRabItems(rabItems);

  const wsData: (string | number)[][] = [
    ["RAB ESTIMATION - ROBEL KAROSERI"],
    [""],
    ["No. SPK", spkDetails?.spk_no || "-"],
    ["Nama Konsumen", spkDetails?.customer_name || "-"],
    ["Nopol Kendaraan", spkDetails?.vehicle_plate || spkDetails?.vehicle_number || "-"],
    ["Model Kendaraan", spkDetails?.vehicle_model || "-"],
    ["Tanggal", new Date().toLocaleDateString('id-ID')],
    [""],
    [
      'NO',
      'DESCRIPTION',
      'SUMBER / PAKET',
      'TYPE',
      'WBS',
      'QTY',
      'HARGA SATUAN',
      'HARGA MODAL (HPP)',
      'SUBTOTAL'
    ]
  ];

  let totalQuotationSum = 0;
  let totalHppSum = 0;

  sortedExportItems.forEach((item, index) => {
    const sourceOrigin = getRabItemSourceOrigin(item);
    const description = item.description || item.material_name || '-';
    const itemType = (item.item_type || item.type || 'MATERIAL').toUpperCase();
    const wbs = item.wbs_stage || item.wbs_category || item.wbsCategory || '-';

    const qty = Number(item.quantity ?? item.qty ?? 1);
    const unit = item.unit || (itemType.includes('LABOR') || itemType.includes('JASA') ? 'lot' : 'pcs');
    const unitPrice = Number(item.unit_price ?? item.unitPrice ?? 0);
    const costPrice = Number(item.cost_price ?? item.costPrice ?? unitPrice);
    const subtotal = Number(item.subtotal ?? (qty * unitPrice));

    totalQuotationSum += subtotal;
    totalHppSum += (qty * costPrice);

    wsData.push([
      index + 1,
      description,
      sourceOrigin.label,
      itemType,
      wbs,
      `${qty} ${unit}`,
      unitPrice,
      costPrice,
      subtotal
    ]);
  });

  const finalQuotation = totals?.grandTotal ?? totalQuotationSum;
  const finalHpp = totalHppSum;
  const marginProfit = finalQuotation - finalHpp;
  const marginPercentage = finalQuotation > 0 ? ((marginProfit / finalQuotation) * 100).toFixed(2) : '0.00';

  wsData.push([""]);
  if (totals && (totals.material > 0 || totals.labor > 0 || totals.overhead > 0)) {
    wsData.push(["", "", "", "", "", "", "", "Subtotal Material", totals.material]);
    wsData.push(["", "", "", "", "", "", "", "Subtotal Jasa", totals.labor]);
    wsData.push(["", "", "", "", "", "", "", "Overhead", totals.overhead]);
  }
  wsData.push(["", "", "", "", "", "", "", "Total Harga Jual (Quotation)", finalQuotation]);
  wsData.push(["", "", "", "", "", "", "", "Total Modal (HPP)", finalHpp]);
  wsData.push(["", "", "", "", "", "", "", `Margin Profit (${marginPercentage}%)`, marginProfit]);

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "RAB");

  const fileName = `RAB_${spkDetails?.spk_no || "SPK"}_${spkDetails?.customer_name || "Konsumen"}.xlsx`;
  XLSX.writeFile(wb, fileName.replace(/\s+/g, '_'));
};

export const printRabQuotation = (
  spkDetails: RabExportSpkDetails | null | undefined,
  rabItems: RabExportItem[],
  totals: RabExportTotals
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const sortedItems = sortRabItems(rabItems);
  const wbsCategories = [
    'Pembongkaran',
    'Sasis/Rangka',
    'Dinding/Fabrikasi',
    'Cat/Finishing',
    'Kelistrikan/Hidrolik'
  ];

  let tableHtml = '';
  wbsCategories.forEach(cat => {
    const itemsInCat = sortedItems.filter(item => (item.wbsCategory || item.wbs_category || item.wbs_stage) === cat);
    if (itemsInCat.length > 0) {
      tableHtml += `
        <tr class="wbs-header">
          <td colspan="5"><strong>${cat}</strong></td>
        </tr>
      `;
      itemsInCat.forEach(item => {
        const qty = Number(item.qty ?? item.quantity ?? 1);
        const unitPrice = Number(item.unitPrice ?? item.unit_price ?? 0);
        const subtotal = Number(item.subtotal ?? (qty * unitPrice));
        const sourceOrigin = getRabItemSourceOrigin(item);
        const originSubtext = sourceOrigin.isPackage
          ? `<div style="font-size: 11px; color: #b45309; font-weight: 500; margin-top: 2px;">📦 ${sourceOrigin.label}</div>`
          : `<div style="font-size: 11px; color: #64748b; font-weight: 400; margin-top: 2px;">📋 Granular</div>`;

        tableHtml += `
          <tr>
            <td>
              <div style="font-weight: 600;">${item.description || item.material_name || '-'}</div>
              ${originSubtext}
            </td>
            <td>${(item.item_type || item.type || 'MATERIAL').toUpperCase()}</td>
            <td>${qty} ${item.unit || (item.type === 'labor' ? 'lot' : 'pcs')}</td>
            <td>Rp ${unitPrice.toLocaleString('id-ID')}</td>
            <td>Rp ${subtotal.toLocaleString('id-ID')}</td>
          </tr>
        `;
      });
    }
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Quotation RAB - ${spkDetails?.spk_no}</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .header h1 { margin: 0 0 10px 0; color: #1a1a1a; font-size: 28px; }
        .header p { margin: 5px 0; color: #666; font-size: 14px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; background: #f9f9f9; padding: 20px; border-radius: 8px; }
        .info-item { font-size: 14px; }
        .info-item strong { display: inline-block; width: 120px; color: #555; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f4f4f4; font-weight: bold; color: #333; }
        .wbs-header td { background-color: #e9ecef; color: #495057; }
        td:nth-child(3), td:nth-child(4), td:nth-child(5), td:nth-child(6) { text-align: right; }
        th:nth-child(3), th:nth-child(4), th:nth-child(5), th:nth-child(6) { text-align: right; }
        .totals-container { width: 350px; float: right; margin-bottom: 50px; background: #f9f9f9; padding: 20px; border-radius: 8px; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
        .total-row.grand { font-size: 18px; font-weight: bold; margin-top: 15px; padding-top: 15px; border-top: 2px solid #ddd; color: #1a1a1a; }
        .signatures { clear: both; display: grid; grid-template-columns: 1fr 1fr; text-align: center; margin-top: 80px; gap: 40px; }
        .sig-box { display: flex; flex-direction: column; align-items: center; }
        .sig-line { width: 200px; border-top: 1px solid #333; margin-top: 80px; padding-top: 10px; font-weight: bold; }
        .sig-title { color: #666; font-size: 14px; margin-bottom: 10px; }
        @media print {
          body { padding: 0; }
          .totals-container { break-inside: avoid; }
          .signatures { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>ROBEL KAROSERI</h1>
        <p>Jl. Contoh Karoseri No. 123, Kota Simulasi</p>
        <p>Telp: (021) 1234567 | Email: info@robelkaroseri.com</p>
      </div>

      <h2 style="text-align: center; margin-bottom: 30px;">PENAWARAN (QUOTATION) RAB</h2>

      <div class="info-grid">
        <div class="info-item">
          <div><strong>No. SPK:</strong> ${spkDetails?.spk_no || '-'}</div>
          <div><strong>Tanggal:</strong> ${new Date().toLocaleDateString('id-ID')}</div>
        </div>
        <div class="info-item">
          <div><strong>Pelanggan:</strong> ${spkDetails?.customer_name || '-'}</div>
          <div><strong>No. Polisi:</strong> ${spkDetails?.vehicle_plate || spkDetails?.vehicle_number || '-'}${spkDetails?.vehicle_model ? ` (${spkDetails.vehicle_model})` : ''}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Deskripsi Komponen</th>
            <th>Tipe</th>
            <th>Qty</th>
            <th>Harga Satuan</th>
            <th>Total Biaya</th>
          </tr>
        </thead>
        <tbody>
          ${tableHtml}
        </tbody>
      </table>

      <div class="totals-container">
        <div class="total-row">
          <span>Subtotal Material</span>
          <span>Rp ${totals.material.toLocaleString('id-ID')}</span>
        </div>
        <div class="total-row">
          <span>Subtotal Jasa</span>
          <span>Rp ${totals.labor.toLocaleString('id-ID')}</span>
        </div>
        <div class="total-row">
          <span>Overhead Bengkel</span>
          <span>Rp ${totals.overhead.toLocaleString('id-ID')}</span>
        </div>
        <div class="total-row grand">
          <span>Grand Total</span>
          <span>Rp ${totals.grandTotal.toLocaleString('id-ID')}</span>
        </div>
      </div>

      <div class="signatures">
        <div class="sig-box">
          <span class="sig-title">Dibuat oleh,</span>
          <div class="sig-line">Service Advisor</div>
        </div>
        <div class="sig-box">
          <span class="sig-title">Disetujui oleh,</span>
          <div class="sig-line">Konsumen</div>
        </div>
      </div>

      <script>
        window.onload = () => { window.print(); }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
