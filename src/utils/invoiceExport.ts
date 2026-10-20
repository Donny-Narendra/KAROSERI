import type { ApprovedChangeOrder } from '../services/billingService';

export interface InvoicePrintPayload {
  spkNo: string;
  customerName: string;
  vehiclePlate: string;
  vehicleVin: string;
  vehicleEngine?: string;
  vehicleModel?: string;
  invoiceDate: string;
  invoiceStatus: 'UNPAID' | 'LUNAS' | 'PAID' | 'DRAFT' | 'NO_INVOICE' | string;
  quotationAmount: number;
  packageSellingPrice: number;
  nonPackageMaterialCost: number;
  approvedChangeOrders: ApprovedChangeOrder[];
  totalChangeOrderAmount: number;
  manualAdjustment: number;
  totalSellingPrice: number;
  dpAmount: number;
  finalAmountDue: number;
}

export interface SpkInvoiceInput {
  id: string; // spk_no
  customerName: string;
  vehiclePlate?: string;
  vehicleVin?: string;
  vehicleEngine?: string;
  vehicleModel?: string;
  vin?: string;
  quotationAmount: number;
  packageSellingPrice: number;
  nonPackageMaterialCost: number;
  dpAmount: number;
  paymentStatus?: string;
}

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const buildInvoicePrintPayload = (
  spk: SpkInvoiceInput,
  approvedChangeOrders: ApprovedChangeOrder[] = [],
  manualAdjustment = 0
): InvoicePrintPayload => {
  const totalChangeOrderAmount = approvedChangeOrders.reduce(
    (sum, co) => sum + Number(co.total_amount || 0),
    0
  );
  const totalSellingPrice = spk.quotationAmount + totalChangeOrderAmount + manualAdjustment;
  const finalAmountDue = Math.max(0, totalSellingPrice - Number(spk.dpAmount || 0));

  return {
    spkNo: spk.id,
    customerName: spk.customerName,
    vehiclePlate: spk.vehiclePlate || '-',
    vehicleVin: spk.vehicleVin || spk.vin || '-',
    vehicleEngine: spk.vehicleEngine || '-',
    vehicleModel: spk.vehicleModel || '-',
    invoiceDate: new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    invoiceStatus: spk.paymentStatus || 'UNPAID',
    quotationAmount: spk.quotationAmount,
    packageSellingPrice: spk.packageSellingPrice,
    nonPackageMaterialCost: spk.nonPackageMaterialCost,
    approvedChangeOrders,
    totalChangeOrderAmount,
    manualAdjustment,
    totalSellingPrice,
    dpAmount: Number(spk.dpAmount || 0),
    finalAmountDue,
  };
};

export const printFinalInvoice = (payload: InvoicePrintPayload): void => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const isLunas = payload.invoiceStatus === 'LUNAS' || payload.invoiceStatus === 'PAID';

  let changeOrdersHtml = '';
  if (payload.approvedChangeOrders.length > 0) {
    let grandCoItemIndex = 1;
    payload.approvedChangeOrders.forEach((co) => {
      const coDate = co.approved_at
        ? new Date(co.approved_at).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : new Date(co.created_at).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });

      changeOrdersHtml += `
        <div class="co-card">
          <div class="co-header">
            <div>
              <span class="co-tag">${co.order_number || co.co_number}</span>
              <strong>${co.description}</strong>
              <span class="co-meta">• WBS: ${co.wbs_stage} • Disetujui: ${coDate}</span>
            </div>
            <div class="co-subtotal">
              <span class="status-badge approved">APPROVED</span>
              <strong>+ ${formatCurrency(co.total_amount)}</strong>
            </div>
          </div>
          <table class="item-table">
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th>Uraian Pekerjaan / Material</th>
                <th style="width: 130px;">Tahapan WBS</th>
                <th style="width: 80px;">Tipe</th>
                <th style="width: 70px; text-align: right;">Qty</th>
                <th style="width: 120px; text-align: right;">Harga Satuan</th>
                <th style="width: 130px; text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${co.change_order_items.map((item) => `
                <tr>
                  <td>${grandCoItemIndex++}</td>
                  <td>
                    <strong>${item.item_name}</strong>
                    ${item.notes ? `<div style="font-size: 11px; color: #666;">Catatan: ${item.notes}</div>` : ''}
                  </td>
                  <td>${item.wbs_stage || co.wbs_stage}</td>
                  <td><span class="type-pill ${item.item_type.toLowerCase()}">${item.item_type}</span></td>
                  <td style="text-align: right;">${item.quantity} ${item.unit || 'pcs'}</td>
                  <td style="text-align: right;">${formatCurrency(item.unit_price)}</td>
                  <td style="text-align: right; font-weight: 600;">${formatCurrency(item.subtotal)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    });
  } else {
    changeOrdersHtml = `
      <div class="empty-notice">
        Tidak ada penambahan pekerjaan atau Change Order (Addendum). Seluruh pengerjaan mengacu sepenuhnya pada kesepakatan kontrak awal.
      </div>
    `;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Faktur Tagihan Akhir - ${payload.spkNo}</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          padding: 30px 40px;
          color: #1f2937;
          background: #ffffff;
          line-height: 1.5;
          font-size: 13px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #111827;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        .brand h1 {
          margin: 0;
          font-size: 24px;
          color: #111827;
          letter-spacing: -0.5px;
        }
        .brand p {
          margin: 3px 0 0;
          color: #4b5563;
          font-size: 12px;
        }
        .invoice-title {
          text-align: right;
        }
        .invoice-title h2 {
          margin: 0;
          font-size: 18px;
          color: #1e3a8a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .status-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: bold;
          padding: 3px 10px;
          border-radius: 9999px;
          text-transform: uppercase;
          margin-top: 5px;
        }
        .status-badge.paid {
          background-color: #dcfce7;
          color: #15803d;
          border: 1px solid #86efac;
        }
        .status-badge.unpaid {
          background-color: #fef9c3;
          color: #854d0e;
          border: 1px solid #fde047;
        }
        .status-badge.approved {
          background-color: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
          font-size: 10px;
          padding: 2px 8px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 25px;
          background: #f9fafb;
          padding: 15px 20px;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }
        .info-item {
          display: flex;
          font-size: 12px;
          margin-bottom: 4px;
        }
        .info-label {
          width: 140px;
          color: #6b7280;
          font-weight: 500;
        }
        .info-value {
          color: #111827;
          font-weight: 600;
        }
        .section-title {
          font-size: 14px;
          font-weight: 700;
          color: #111827;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 6px;
          margin-top: 25px;
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .item-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
          font-size: 12px;
        }
        .item-table th {
          background-color: #f3f4f6;
          color: #374151;
          text-align: left;
          padding: 8px 10px;
          border: 1px solid #e5e7eb;
          font-weight: 600;
        }
        .item-table td {
          padding: 8px 10px;
          border: 1px solid #e5e7eb;
          vertical-align: top;
        }
        .item-table tr:nth-child(even) td {
          background-color: #fafafa;
        }
        .type-pill {
          display: inline-block;
          font-size: 10px;
          font-weight: 600;
          padding: 1px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .type-pill.material { background: #e0f2fe; color: #0369a1; }
        .type-pill.labor { background: #fef3c7; color: #b45309; }
        .type-pill.overhead { background: #ede9fe; color: #6d28d9; }
        .co-card {
          border: 1px solid #d1d5db;
          border-radius: 6px;
          margin-bottom: 15px;
          background: #ffffff;
          overflow: hidden;
        }
        .co-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f9fafb;
          padding: 10px 14px;
          border-bottom: 1px solid #e5e7eb;
        }
        .co-tag {
          font-family: monospace;
          background: #e5e7eb;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: bold;
          font-size: 11px;
          margin-right: 6px;
        }
        .co-meta {
          font-size: 11px;
          color: #6b7280;
          margin-left: 6px;
        }
        .co-subtotal {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #047857;
        }
        .empty-notice {
          padding: 15px;
          background: #f9fafb;
          border: 1px dashed #d1d5db;
          border-radius: 6px;
          color: #6b7280;
          font-size: 12px;
          text-align: center;
          margin-bottom: 20px;
        }
        .summary-container {
          display: flex;
          justify-content: flex-end;
          margin-top: 20px;
          margin-bottom: 25px;
        }
        .summary-table {
          width: 380px;
          border-collapse: collapse;
          font-size: 13px;
        }
        .summary-table td {
          padding: 6px 10px;
        }
        .summary-table .label {
          color: #4b5563;
        }
        .summary-table .val {
          text-align: right;
          font-weight: 600;
          color: #111827;
        }
        .summary-table .val.addendum {
          color: #047857;
        }
        .summary-table .val.dp {
          color: #b91c1c;
        }
        .summary-table tr.grand-row td {
          border-top: 2px solid #111827;
          border-bottom: 2px solid #111827;
          font-size: 15px;
          font-weight: 700;
          padding: 10px;
          color: #1e3a8a;
          background: #f8fafc;
        }
        .legal-box {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-left: 4px solid #3b82f6;
          padding: 10px 14px;
          border-radius: 4px;
          font-size: 11px;
          color: #334155;
          margin-top: 20px;
          margin-bottom: 30px;
          line-height: 1.4;
        }
        .legal-box strong {
          color: #1e293b;
        }
        .signatures {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 50px;
          text-align: center;
          margin-top: 30px;
          page-break-inside: avoid;
        }
        .sig-box {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .sig-title {
          font-size: 12px;
          color: #4b5563;
          margin-bottom: 60px;
        }
        .sig-line {
          width: 220px;
          border-top: 1px solid #374151;
          padding-top: 6px;
          font-weight: 700;
          font-size: 13px;
        }
        .sig-sub {
          font-size: 11px;
          color: #6b7280;
        }
        @media print {
          body { padding: 0; }
          .co-card { page-break-inside: avoid; }
          .summary-container { page-break-inside: avoid; }
          .signatures { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <div class="brand">
          <h1>ROBEL KAROSERI</h1>
          <p>Spesialis Pembuatan & Modifikasi Bodi Kendaraan Niaga</p>
          <p>Jl. Karoseri Industri No. 88, Kawasan Otomotif | Telp: (021) 8899-7711 | finance@robelkaroseri.com</p>
        </div>
        <div class="invoice-title">
          <h2>Faktur Tagihan Akhir</h2>
          <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">
            Nomor: INV/${payload.spkNo}/${new Date().getFullYear()}
          </div>
          <span class="status-badge ${isLunas ? 'paid' : 'unpaid'}">
            ${isLunas ? 'LUNAS (PAID)' : 'MENUNGGU PEMBAYARAN (UNPAID)'}
          </span>
        </div>
      </div>

      <!-- Information Grid -->
      <div class="info-grid">
        <div>
          <div class="info-item">
            <span class="info-label">Nomor SPK:</span>
            <span class="info-value">${payload.spkNo}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Nama Pelanggan:</span>
            <span class="info-value">${payload.customerName}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Model Kendaraan:</span>
            <span class="info-value">${payload.vehicleModel || '-'}</span>
          </div>
        </div>
        <div>
          <div class="info-item">
            <span class="info-label">Tanggal Tagihan:</span>
            <span class="info-value">${payload.invoiceDate}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Nomor Polisi:</span>
            <span class="info-value">${payload.vehiclePlate}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Nomor Rangka (VIN):</span>
            <span class="info-value">${payload.vehicleVin}</span>
          </div>
        </div>
      </div>

      <!-- Section 1: Kontrak Induk (SPK Dasar) -->
      <div class="section-title">
        <span>1. KONTRAK INDUK (SPK DASAR)</span>
        <span style="font-weight: normal; font-size: 12px; color: #4b5563;">Kesepakatan Awal SPK</span>
      </div>
      <table class="item-table">
        <thead>
          <tr>
            <th style="width: 30px;">#</th>
            <th>Uraian Komponen / Modifikasi Kontrak Dasar</th>
            <th style="width: 140px; text-align: right;">Biaya</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>Paket Spesifikasi & Assembly List Karoseri</td>
            <td style="text-align: right; font-weight: 600;">${formatCurrency(payload.packageSellingPrice)}</td>
          </tr>
          <tr>
            <td>2</td>
            <td>Komponen Extra (Material / Fitur Tambahan Luar Paket Induk)</td>
            <td style="text-align: right; font-weight: 600;">${formatCurrency(payload.nonPackageMaterialCost)}</td>
          </tr>
          <tr style="background: #f8fafc; font-weight: bold;">
            <td colspan="2" style="text-align: right;">Subtotal Kontrak Induk:</td>
            <td style="text-align: right; color: #1e3a8a;">${formatCurrency(payload.quotationAmount)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Section 2: Approved Change Orders (Addendum Itemized) -->
      <div class="section-title">
        <span>### PEKERJAAN TAMBAHAN (CHANGE ORDERS / ADDENDUM)</span>
        <span style="font-weight: normal; font-size: 12px; color: #047857;">
          ${payload.approvedChangeOrders.length} Addendum Disetujui
        </span>
      </div>
      ${changeOrdersHtml}

      <!-- Section 3: Summary Totals -->
      <div class="summary-container">
        <table class="summary-table">
          <tr>
            <td class="label">Subtotal Kontrak Induk (Dasar):</td>
            <td class="val">${formatCurrency(payload.quotationAmount)}</td>
          </tr>
          ${payload.totalChangeOrderAmount !== 0 ? `
            <tr>
              <td class="label">Pekerjaan Tambahan (Addendum):</td>
              <td class="val addendum">+ ${formatCurrency(payload.totalChangeOrderAmount)}</td>
            </tr>
          ` : ''}
          ${payload.manualAdjustment !== 0 ? `
            <tr>
              <td class="label">Penyesuaian Khusus (Manual):</td>
              <td class="val">${payload.manualAdjustment > 0 ? '+ ' : ''}${formatCurrency(payload.manualAdjustment)}</td>
            </tr>
          ` : ''}
          <tr style="border-top: 1px solid #e5e7eb;">
            <td class="label" style="font-weight: bold;">Total Nilai Kontrak Akhir:</td>
            <td class="val" style="font-weight: bold;">${formatCurrency(payload.totalSellingPrice)}</td>
          </tr>
          <tr>
            <td class="label" style="color: #b91c1c;">Uang Muka (DP) Telah Dibayar:</td>
            <td class="val dp">- ${formatCurrency(payload.dpAmount)}</td>
          </tr>
          <tr class="grand-row">
            <td>SISA TAGIHAN AKHIR:</td>
            <td style="text-align: right;">${formatCurrency(payload.finalAmountDue)}</td>
          </tr>
        </table>
      </div>

      <!-- Legal Protection Notice -->
      <div class="legal-box">
        <strong>Pernyataan Hukum & Perlindungan Sengketa:</strong>
        Seluruh rincian pekerjaan tambahan (Change Order/Addendum) yang tercantum di atas telah diajukan, diestimasi, dan disetujui secara sah oleh pihak konsumen dan penanggung jawab bengkel. Faktur ini berfungsi sebagai dokumen penagihan final yang sah dan berkekuatan hukum penuh untuk pelepasan unit kendaraan (BAST).
      </div>

      <!-- Signatures -->
      <div class="signatures">
        <div class="sig-box">
          <span class="sig-title">Diterbitkan oleh Kasir / Bag. Keuangan,</span>
          <div class="sig-line">Kasir Robel Karoseri</div>
          <span class="sig-sub">Tanggal: ${payload.invoiceDate}</span>
        </div>
        <div class="sig-box">
          <span class="sig-title">Disetujui & Diterima oleh Konsumen,</span>
          <div class="sig-line">${payload.customerName}</div>
          <span class="sig-sub">Tanda Tangan & Cap / Nama Terang</span>
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
