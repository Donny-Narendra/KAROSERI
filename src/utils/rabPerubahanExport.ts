import * as XLSX from 'xlsx';
import { formatWbsBadge, getWbsWeight } from './wbsSort';
import {
  computeSegregatedProjectProfit,
  type PackageProfitDetail,
  type PackageMasterLookup
} from './profitCalculator';

export interface RabPerubahanSpkDetails {
  id?: string;
  spk_no?: string | null;
  customer_name?: string | null;
  vehicle_plate?: string | null;
  vehicle_number?: string | null;
  vehicle_model?: string | null;
  status?: string | null;
  created_at?: string | null;
}

export interface ConsolidatedRabItem {
  id: string;
  source_origin: 'RAB' | 'CHANGE_ORDER';
  source_label: string;
  is_package: boolean;
  package_name?: string | null;
  item_type: 'MATERIAL' | 'LABOR' | 'OVERHEAD';
  wbs_stage: string;
  description: string;
  quantity: number;
  unit: string;
  cost_price: number;
  unit_price: number;
  subtotal: number;
  fulfillment_status: 'FULFILLED' | 'PENDING';
  fulfillment_qty: number;
  material_id?: string | null;
  change_order_id?: string | null;
  notes?: string | null;
}

export interface RabPerubahanTotals {
  packageRevenue: number;
  packageCost: number;
  packageProfit: number;
  granularMaterialRevenue: number;
  granularMaterialCost: number;
  granularMaterialProfit: number;
  laborRevenue: number;
  laborCost: number;
  laborProfit: number;
  overheadRevenue: number;
  overheadCost: number;
  overheadProfit: number;
  totalRevenue: number;
  totalCogs: number;
  totalProfit: number;
  marginPercentage: number;
  materialFulfilledCount: number;
  materialTotalCount: number;
  materialFulfilledPercentage: number;
  itemizedPackages?: PackageProfitDetail[];
}

/**
 * Calculates segregated 2-pillar profits (Itemized Assembly Packages vs Granular Non-Package items)
 * and fulfillment metrics for consolidated RAB Perubahan items.
 */
export function computeRabPerubahanTotals(
  items: ConsolidatedRabItem[],
  packageMasters?: PackageMasterLookup
): RabPerubahanTotals {
  const profitResult = computeSegregatedProjectProfit(items, packageMasters);

  let materialFulfilledCount = 0;
  let materialTotalCount = 0;

  if (Array.isArray(items)) {
    items.forEach(item => {
      if (item.item_type === 'MATERIAL') {
        materialTotalCount += 1;
        if (item.fulfillment_status === 'FULFILLED') {
          materialFulfilledCount += 1;
        }
      }
    });
  }

  const materialFulfilledPercentage = materialTotalCount > 0
    ? Math.round((materialFulfilledCount / materialTotalCount) * 100)
    : 100;

  return {
    packageRevenue: profitResult.totalPackageRevenue,
    packageCost: profitResult.totalPackageCost,
    packageProfit: profitResult.totalPackageProfit,
    granularMaterialRevenue: profitResult.granularMaterial.revenue,
    granularMaterialCost: profitResult.granularMaterial.cost,
    granularMaterialProfit: profitResult.granularMaterial.profit,
    laborRevenue: profitResult.granularLabor.revenue,
    laborCost: profitResult.granularLabor.cost,
    laborProfit: profitResult.granularLabor.profit,
    overheadRevenue: profitResult.granularOverhead.revenue,
    overheadCost: profitResult.granularOverhead.cost,
    overheadProfit: profitResult.granularOverhead.profit,
    totalRevenue: profitResult.grandTotalRevenue,
    totalCogs: profitResult.grandTotalCost,
    totalProfit: profitResult.grandTotalProfit,
    marginPercentage: profitResult.grandTotalMarginPercentage,
    materialFulfilledCount,
    materialTotalCount,
    materialFulfilledPercentage,
    itemizedPackages: profitResult.packages,
  };
}

/**
 * Exports consolidated RAB Perubahan data to an Excel (.xlsx) file.
 */
export function exportRabPerubahanToExcel(
  spkDetails: RabPerubahanSpkDetails | null | undefined,
  items: ConsolidatedRabItem[],
  totals?: RabPerubahanTotals
): void {
  const calcTotals = totals || computeRabPerubahanTotals(items);
  const nopol = spkDetails?.vehicle_plate || spkDetails?.vehicle_number || '-';
  const spkNo = spkDetails?.spk_no || 'SPK';

  const wsData: (string | number)[][] = [
    ["LAPORAN KONSOLIDASI RAB PERUBAHAN & AUDIT REALISASI - ROBEL KAROSERI"],
    [""],
    ["No. SPK", spkNo],
    ["Nama Pelanggan", spkDetails?.customer_name || "-"],
    ["Nopol Kendaraan", nopol],
    ["Model Kendaraan", spkDetails?.vehicle_model || "-"],
    ["Status SPK", spkDetails?.status || "-"],
    ["Tanggal Laporan", new Date().toLocaleDateString('id-ID')],
    ["Total Item Pekerjaan", items.length],
    [""],
    [
      "No",
      "Asal Input",
      "Metode Entry",
      "Kategori Tipe",
      "Alokasi Tahapan",
      "Deskripsi Pekerjaan / Barang",
      "Qty",
      "Satuan",
      "HPP Satuan (Rp)",
      "Harga Satuan Jual (Rp)",
      "Subtotal Jual (Rp)",
      "Status Realisasi / Gudang"
    ]
  ];

  items.forEach((item, idx) => {
    const originLabel = item.source_origin === 'CHANGE_ORDER' ? 'Change Order' : 'RAB';
    const entryLabel = item.is_package
      ? `Paket: ${item.package_name || 'Paket'}`
      : 'Granular';
    const fulfillmentLabel = item.fulfillment_status === 'FULFILLED'
      ? (item.item_type === 'MATERIAL' ? 'Sudah Diambil (Approved)' : item.item_type === 'LABOR' ? 'Terbit SPK-B' : 'Dicatat FOH')
      : (item.item_type === 'MATERIAL' ? 'Belum Diambil' : item.item_type === 'LABOR' ? 'Belum Terbit' : 'Belum Dicatat');

    wsData.push([
      idx + 1,
      originLabel,
      entryLabel,
      item.item_type,
      formatWbsBadge(item.wbs_stage),
      item.description,
      item.quantity,
      item.unit,
      item.cost_price,
      item.unit_price,
      item.subtotal,
      fulfillmentLabel
    ]);
  });

  wsData.push([""]);
  wsData.push(["", "", "", "", "", "", "", "", "", "Total Penjualan Quotation", calcTotals.totalRevenue]);
  wsData.push(["", "", "", "", "", "", "", "", "", "Total Modal HPP", calcTotals.totalCogs]);
  wsData.push(["", "", "", "", "", "", "", "", "", "Total Profit SPK Revisi", calcTotals.totalProfit]);
  wsData.push(["", "", "", "", "", "", "", "", "", "Margin Laba Bersih (%)", `${calcTotals.marginPercentage}%`]);
  wsData.push([""]);
  wsData.push(["", "", "", "", "", "", "", "", "", "PILAR 1: KEUNTUNGAN KARYA PAKET BARANG JADI (ITEMIZED ASSEMBLY MARGIN)", ""]);
  if (calcTotals.itemizedPackages && calcTotals.itemizedPackages.length > 0) {
    calcTotals.itemizedPackages.forEach(p => {
      wsData.push(["", "", "", "", "", "", "", "", "", `• ${p.packageName}`, `Jual: Rp ${p.sellingPrice.toLocaleString('id-ID')} | HPP: Rp ${p.totalCost.toLocaleString('id-ID')} (Mat: ${p.materialCost.toLocaleString('id-ID')}, Lab: ${p.laborCost.toLocaleString('id-ID')}, FOH: ${p.overheadCost.toLocaleString('id-ID')}) | Laba: Rp ${p.netProfit.toLocaleString('id-ID')} (${p.marginPercentage}%)`]);
    });
    wsData.push(["", "", "", "", "", "", "", "", "", "Total Laba Paket Barang Jadi", calcTotals.packageProfit]);
  } else {
    wsData.push(["", "", "", "", "", "", "", "", "", "• (Tidak ada paket assembly pada SPK ini)", "-"]);
  }
  wsData.push([""]);
  wsData.push(["", "", "", "", "", "", "", "", "", "PILAR 2: KEUNTUNGAN PENJUALAN LEPAS / GRANULAR (NON-PAKET)", ""]);
  wsData.push(["", "", "", "", "", "", "", "", "", "• Laba Material Granular (Bahan Lepas)", calcTotals.granularMaterialProfit]);
  wsData.push(["", "", "", "", "", "", "", "", "", "• Margin Labor Granular (Upah Borongan Mandor Lepas)", calcTotals.laborProfit]);
  wsData.push(["", "", "", "", "", "", "", "", "", "• Margin Overhead Granular (Sewa Alat / FOH Lepas)", calcTotals.overheadProfit]);

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws['!cols'] = [
    { wch: 5 },  // No
    { wch: 15 }, // Asal
    { wch: 22 }, // Metode Entry
    { wch: 14 }, // Tipe
    { wch: 25 }, // WBS
    { wch: 38 }, // Deskripsi
    { wch: 8 },  // Qty
    { wch: 8 },  // Satuan
    { wch: 16 }, // HPP Satuan
    { wch: 22 }, // Harga Jual Satuan
    { wch: 20 }, // Subtotal
    { wch: 24 }, // Status Realisasi
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "RAB_Perubahan");

  const sanitizedSpkNo = spkNo.replace(/[^\w-]/g, '_');
  const sanitizedNopol = nopol.replace(/[^\w-]/g, '_');
  const fileName = `RAB_Perubahan_${sanitizedSpkNo}_${sanitizedNopol}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Opens a clean printable PDF / print preview document for consolidated RAB Perubahan and realization audit.
 */
export function printRabPerubahanReport(
  spkDetails: RabPerubahanSpkDetails | null | undefined,
  items: ConsolidatedRabItem[],
  totals?: RabPerubahanTotals
): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const calcTotals = totals || computeRabPerubahanTotals(items);
  const nopol = spkDetails?.vehicle_plate || spkDetails?.vehicle_number || '-';
  const spkNo = spkDetails?.spk_no || 'SPK';

  // Group items by WBS for structured presentation
  const groupedByWbs = new Map<string, ConsolidatedRabItem[]>();
  const sortedItems = [...items].sort((a, b) => {
    const wA = getWbsWeight(a.wbs_stage);
    const wB = getWbsWeight(b.wbs_stage);
    if (wA !== wB) return wA - wB;
    return a.description.localeCompare(b.description);
  });

  sortedItems.forEach(item => {
    const stage = formatWbsBadge(item.wbs_stage);
    if (!groupedByWbs.has(stage)) {
      groupedByWbs.set(stage, []);
    }
    groupedByWbs.get(stage)!.push(item);
  });

  let tableRowsHtml = '';
  let rowCounter = 1;

  groupedByWbs.forEach((wbsItems, wbsTitle) => {
    tableRowsHtml += `
      <tr class="wbs-group-header">
        <td colspan="9"><strong>${wbsTitle}</strong> (${wbsItems.length} item)</td>
      </tr>
    `;

    wbsItems.forEach(item => {
      const isCo = item.source_origin === 'CHANGE_ORDER';
      const originBadge = isCo
        ? `<span class="badge badge-co">Change Order</span>`
        : `<span class="badge badge-rab">RAB Awal</span>`;

      const methodBadge = item.is_package
        ? `<span class="badge badge-pkg">📦 ${item.package_name || 'Paket'}</span>`
        : `<span class="badge badge-granular">📋 Granular</span>`;

      const typeBadge = `<span class="badge badge-${item.item_type.toLowerCase()}">${item.item_type}</span>`;

      let statusBadge = '';
      if (item.fulfillment_status === 'FULFILLED') {
        const text = item.item_type === 'MATERIAL' ? 'Sudah Diambil' : item.item_type === 'LABOR' ? 'Terbit SPK-B' : 'Dicatat FOH';
        statusBadge = `<span class="badge badge-fulfilled">✅ ${text}</span>`;
      } else {
        const text = item.item_type === 'MATERIAL' ? 'Belum Diambil' : item.item_type === 'LABOR' ? 'Belum Terbit' : 'Belum Dicatat';
        statusBadge = `<span class="badge badge-pending">⏳ ${text}</span>`;
      }

      tableRowsHtml += `
        <tr>
          <td style="text-align: center;">${rowCounter++}</td>
          <td>
            <div style="font-weight: 600; color: #1e293b;">${item.description}</div>
            <div style="margin-top: 3px; display: flex; gap: 4px; flex-wrap: wrap;">
              ${originBadge} ${methodBadge} ${typeBadge}
            </div>
          </td>
          <td style="text-align: right; font-weight: 500;">${item.quantity} ${item.unit}</td>
          <td style="text-align: right;">Rp ${item.cost_price.toLocaleString('id-ID')}</td>
          <td style="text-align: right;">Rp ${item.unit_price.toLocaleString('id-ID')}</td>
          <td style="text-align: right; font-weight: 600;">Rp ${item.subtotal.toLocaleString('id-ID')}</td>
          <td style="text-align: right; color: ${item.subtotal - (item.cost_price * item.quantity) >= 0 ? '#059669' : '#dc2626'}; font-weight: 600;">
            Rp ${(item.subtotal - (item.cost_price * item.quantity)).toLocaleString('id-ID')}
          </td>
          <td style="text-align: center;">${statusBadge}</td>
        </tr>
      `;
    });
  });

  const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Laporan Realisasi RAB Perubahan - ${spkNo}</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          padding: 30px;
          line-height: 1.5;
          font-size: 12px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        .brand h1 {
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 4px 0;
          letter-spacing: -0.5px;
        }
        .brand p {
          margin: 0;
          color: #64748b;
          font-size: 11px;
        }
        .report-title {
          text-align: right;
        }
        .report-title h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: #d97706;
          text-transform: uppercase;
        }
        .report-title p {
          margin: 4px 0 0 0;
          font-size: 11px;
          color: #64748b;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 12px 16px;
          margin-bottom: 20px;
        }
        .info-cell .label {
          font-size: 10px;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 600;
          margin-bottom: 2px;
        }
        .info-cell .val {
          font-size: 12px;
          font-weight: 700;
          color: #0f172a;
        }
        .pillars-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }
        .pillar-card {
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 6px;
          padding: 10px 12px;
        }
        .pillar-card.pkg { border-left: 4px solid #f59e0b; }
        .pillar-card.mat { border-left: 4px solid #06b6d4; }
        .pillar-card.lab { border-left: 4px solid #0284c7; }
        .pillar-card.ovh { border-left: 4px solid #a855f7; }
        .pillar-title { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 600; }
        .pillar-val { font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px; }
        .pillar-sub { font-size: 9px; color: #059669; font-weight: 600; }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 11px;
        }
        th, td {
          padding: 8px 10px;
          border-bottom: 1px solid #e2e8f0;
        }
        th {
          background-color: #f1f5f9;
          font-weight: 700;
          color: #334155;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.5px;
        }
        .wbs-group-header td {
          background-color: #e2e8f0;
          color: #1e293b;
          font-size: 11px;
          font-weight: bold;
          padding: 6px 10px;
        }
        .badge {
          display: inline-block;
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 9px;
          font-weight: 600;
        }
        .badge-rab { background: #e0f2fe; color: #0369a1; }
        .badge-co { background: #f3e8ff; color: #7e22ce; }
        .badge-pkg { background: #fef3c7; color: #b45309; }
        .badge-granular { background: #f1f5f9; color: #475569; }
        .badge-material { background: #cffafe; color: #0e7490; }
        .badge-labor { background: #e0e7ff; color: #4338ca; }
        .badge-overhead { background: #fae8ff; color: #86198f; }
        .badge-fulfilled { background: #dcfce7; color: #15803d; }
        .badge-pending { background: #fef3c7; color: #b45309; }

        .summary-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 30px;
        }
        .absorption-box {
          flex: 1;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 12px 16px;
          background: #f8fafc;
        }
        .absorption-box h4 {
          margin: 0 0 8px 0;
          font-size: 11px;
          text-transform: uppercase;
          color: #334155;
        }
        .progress-bar-bg {
          width: 100%;
          height: 10px;
          background: #e2e8f0;
          border-radius: 5px;
          overflow: hidden;
          margin-bottom: 6px;
        }
        .progress-bar-fill {
          height: 100%;
          background: #10b981;
        }
        .totals-card {
          width: 320px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 12px 16px;
          background: #f8fafc;
        }
        .tot-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 6px;
          font-size: 11px;
        }
        .tot-row.grand {
          border-top: 2px solid #0f172a;
          padding-top: 8px;
          margin-top: 8px;
          font-size: 13px;
          font-weight: 800;
          color: #0f172a;
        }

        .signatures {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          text-align: center;
          gap: 20px;
          margin-top: 40px;
          page-break-inside: avoid;
        }
        .sig-box {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .sig-title {
          font-size: 11px;
          font-weight: 600;
          color: #475569;
          margin-bottom: 65px;
        }
        .sig-line {
          width: 170px;
          border-top: 1px solid #0f172a;
          padding-top: 5px;
          font-weight: 700;
          font-size: 11px;
          color: #0f172a;
        }
        .sig-role {
          font-size: 10px;
          color: #64748b;
        }

        @media print {
          body { padding: 0; font-size: 10px; }
          .summary-section, .signatures { page-break-inside: avoid; }
          tr { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="brand">
          <h1>ROBEL KAROSERI</h1>
          <p>Spesialis Pembuatan & Perbaikan Bodi Truk, Box, & Kendaraan Niaga</p>
          <p>Jl. Contoh Karoseri No. 123 | Telp: (021) 1234567 | info@robelkaroseri.com</p>
        </div>
        <div class="report-title">
          <h2>Laporan RAB Perubahan & Realisasi</h2>
          <p>Konsolidasi Kontrak Awal & Approved Amandemen</p>
          <p style="font-weight: 600;">Tanggal: ${new Date().toLocaleDateString('id-ID')}</p>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-cell">
          <div class="label">Nomor SPK</div>
          <div class="val">${spkNo}</div>
        </div>
        <div class="info-cell">
          <div class="label">Pelanggan / Konsumen</div>
          <div class="val">${spkDetails?.customer_name || '-'}</div>
        </div>
        <div class="info-cell">
          <div class="label">Nopol Kendaraan</div>
          <div class="val">${nopol}</div>
        </div>
        <div class="info-cell">
          <div class="label">Model Kendaraan</div>
          <div class="val">${spkDetails?.vehicle_model || '-'}</div>
        </div>
      </div>

      <div class="pillars-grid">
        <div class="pillar-card pkg">
          <div class="pillar-title">Profit Paket Assembly</div>
          <div class="pillar-val">Rp ${calcTotals.packageProfit.toLocaleString('id-ID')}</div>
          <div class="pillar-sub">Revenue: Rp ${calcTotals.packageRevenue.toLocaleString('id-ID')} | HPP: Rp ${calcTotals.packageCost.toLocaleString('id-ID')}</div>
        </div>
        <div class="pillar-card mat">
          <div class="pillar-title">Profit Material Lepas</div>
          <div class="pillar-val">Rp ${calcTotals.granularMaterialProfit.toLocaleString('id-ID')}</div>
          <div class="pillar-sub">Revenue: Rp ${calcTotals.granularMaterialRevenue.toLocaleString('id-ID')} | HPP: Rp ${calcTotals.granularMaterialCost.toLocaleString('id-ID')}</div>
        </div>
        <div class="pillar-card lab">
          <div class="pillar-title">Margin Labor Lepas</div>
          <div class="pillar-val">Rp ${calcTotals.laborProfit.toLocaleString('id-ID')}</div>
          <div class="pillar-sub">Revenue: Rp ${calcTotals.laborRevenue.toLocaleString('id-ID')} | HPP: Rp ${calcTotals.laborCost.toLocaleString('id-ID')}</div>
        </div>
        <div class="pillar-card ovh">
          <div class="pillar-title">Margin Overhead Lepas</div>
          <div class="pillar-val">Rp ${calcTotals.overheadProfit.toLocaleString('id-ID')}</div>
          <div class="pillar-sub">Revenue: Rp ${calcTotals.overheadRevenue.toLocaleString('id-ID')} | HPP: Rp ${calcTotals.overheadCost.toLocaleString('id-ID')}</div>
        </div>
      </div>

      ${calcTotals.itemizedPackages && calcTotals.itemizedPackages.length > 0 ? `
        <div style="margin-bottom: 16px; border: 1px solid #fed7aa; border-radius: 6px; padding: 10px 14px; background: #fffaf5;">
          <div style="font-size: 11px; font-weight: 700; color: #b45309; text-transform: uppercase; margin-bottom: 6px;">
            Pilar 1: Keuntungan per Paket Barang Jadi (Itemized Assembly Margin)
          </div>
          <table style="margin-bottom: 0;">
            <thead>
              <tr style="background: #ffedd5; font-size: 10px;">
                <th style="padding: 4px 8px; text-align: left;">Nama Paket</th>
                <th style="padding: 4px 8px; text-align: right;">Harga Jual</th>
                <th style="padding: 4px 8px; text-align: right;">HPP Material</th>
                <th style="padding: 4px 8px; text-align: right;">HPP Labor</th>
                <th style="padding: 4px 8px; text-align: right;">HPP FOH</th>
                <th style="padding: 4px 8px; text-align: right;">Total HPP</th>
                <th style="padding: 4px 8px; text-align: right;">Laba Bersih</th>
                <th style="padding: 4px 8px; text-align: center;">Margin %</th>
              </tr>
            </thead>
            <tbody>
              ${calcTotals.itemizedPackages.map(pkg => `
                <tr style="font-size: 10px;">
                  <td style="padding: 4px 8px; font-weight: 600;">${pkg.packageName}</td>
                  <td style="padding: 4px 8px; text-align: right;">Rp ${pkg.sellingPrice.toLocaleString('id-ID')}</td>
                  <td style="padding: 4px 8px; text-align: right;">Rp ${pkg.materialCost.toLocaleString('id-ID')}</td>
                  <td style="padding: 4px 8px; text-align: right;">Rp ${pkg.laborCost.toLocaleString('id-ID')}</td>
                  <td style="padding: 4px 8px; text-align: right;">Rp ${pkg.overheadCost.toLocaleString('id-ID')}</td>
                  <td style="padding: 4px 8px; text-align: right; font-weight: 600;">Rp ${pkg.totalCost.toLocaleString('id-ID')}</td>
                  <td style="padding: 4px 8px; text-align: right; font-weight: 700; color: ${pkg.netProfit >= 0 ? '#059669' : '#dc2626'};">
                    Rp ${pkg.netProfit.toLocaleString('id-ID')}
                  </td>
                  <td style="padding: 4px 8px; text-align: center; font-weight: 700;">${pkg.marginPercentage}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      <table>
        <thead>
          <tr>
            <th style="width: 30px; text-align: center;">No</th>
            <th>Deskripsi Pekerjaan & Item</th>
            <th style="width: 70px; text-align: right;">Qty</th>
            <th style="width: 100px; text-align: right;">HPP Modal</th>
            <th style="width: 100px; text-align: right;">Harga Jual</th>
            <th style="width: 110px; text-align: right;">Subtotal Jual</th>
            <th style="width: 100px; text-align: right;">Estimasi Laba</th>
            <th style="width: 110px; text-align: center;">Realisasi / Gudang</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>

      <div class="summary-section">
        <div class="absorption-box">
          <h4>Status Penyerapan Material Gudang</h4>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${calcTotals.materialFulfilledPercentage}%;"></div>
          </div>
          <div style="font-size: 11px; color: #475569; display: flex; justify-content: space-between;">
            <span>${calcTotals.materialFulfilledCount} dari ${calcTotals.materialTotalCount} item material sudah disetujui / dikeluarkan</span>
            <strong>${calcTotals.materialFulfilledPercentage}% Terealisasi</strong>
          </div>
          <div style="margin-top: 10px; font-size: 10px; color: #64748b;">
            Item material yang berstatus Belum Diambil tetap tercatat pada pagu revisi untuk mencegah overbudget saat pengajuan Mandor berikutnya.
          </div>
        </div>

        <div class="totals-card">
          <div class="tot-row">
            <span>Total Penjualan Quotation</span>
            <strong>Rp ${calcTotals.totalRevenue.toLocaleString('id-ID')}</strong>
          </div>
          <div class="tot-row">
            <span>Total Modal HPP</span>
            <span>Rp ${calcTotals.totalCogs.toLocaleString('id-ID')}</span>
          </div>
          <div class="tot-row grand">
            <span>Grand Total Profit SPK</span>
            <span style="color: #059669;">Rp ${calcTotals.totalProfit.toLocaleString('id-ID')}</span>
          </div>
          <div class="tot-row" style="font-size: 10px; color: #64748b; margin-top: 4px;">
            <span>Margin Laba Bersih</span>
            <span><strong>${calcTotals.marginPercentage}%</strong></span>
          </div>
        </div>
      </div>

      <div class="signatures">
        <div class="sig-box">
          <div class="sig-title">Disiapkan Oleh,</div>
          <div class="sig-line">Service Advisor</div>
          <div class="sig-role">Penanggung Jawab SPK</div>
        </div>
        <div class="sig-box">
          <div class="sig-title">Diverifikasi Oleh,</div>
          <div class="sig-line">Kepala Gudang / Mandor</div>
          <div class="sig-role">Verifikator Serapan Fisik</div>
        </div>
        <div class="sig-box">
          <div class="sig-title">Disetujui Oleh,</div>
          <div class="sig-line">${spkDetails?.customer_name || 'Konsumen'}</div>
          <div class="sig-role">Pemilik / Customer</div>
        </div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
