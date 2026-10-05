import * as XLSX from 'xlsx';

export const exportRabToExcel = (spkDetails: any, rabItems: any[], totals: any) => {
  const wsData = [
    ["RAB ESTIMATION - ROBEL KAROSERI"],
    [""],
    ["No. SPK", spkDetails?.spk_no || "-"],
    ["Nama Konsumen", spkDetails?.customer_name || "-"],
    ["Nopol Kendaraan", spkDetails?.vehicle_number || "-"],
    ["Tanggal", new Date().toLocaleDateString('id-ID')],
    [""],
    ["WBS Category", "Tipe", "Deskripsi", "Qty", "Harga Satuan", "Waste (%)", "Subtotal"]
  ];

  const wbsCategories = [
    'Pembongkaran',
    'Sasis/Rangka',
    'Dinding/Fabrikasi',
    'Cat/Finishing',
    'Kelistrikan/Hidrolik'
  ];

  wbsCategories.forEach(cat => {
    const itemsInCat = rabItems.filter(item => item.wbsCategory === cat);
    if (itemsInCat.length > 0) {
      itemsInCat.forEach(item => {
        const wasteMultiplier = 1 + (item.wasteFactor || 0) / 100;
        const subtotal = item.type === 'material' ? item.qty * item.unitPrice * wasteMultiplier : item.qty * item.unitPrice;
        wsData.push([
          item.wbsCategory,
          item.type,
          item.description,
          item.qty,
          item.unitPrice,
          item.type === 'material' ? item.wasteFactor : 0,
          subtotal
        ]);
      });
    }
  });

  wsData.push([""]);
  wsData.push(["", "", "", "", "", "Subtotal Material", totals.material]);
  wsData.push(["", "", "", "", "", "Subtotal Jasa", totals.labor]);
  wsData.push(["", "", "", "", "", "Overhead", totals.overhead]);
  wsData.push(["", "", "", "", "", "Grand Total", totals.grandTotal]);

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "RAB");

  const fileName = `RAB_${spkDetails?.spk_no || "SPK"}_${spkDetails?.customer_name || "Konsumen"}.xlsx`;
  XLSX.writeFile(wb, fileName.replace(/\s+/g, '_'));
};

export const printRabQuotation = (spkDetails: any, rabItems: any[], totals: any) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const wbsCategories = [
    'Pembongkaran',
    'Sasis/Rangka',
    'Dinding/Fabrikasi',
    'Cat/Finishing',
    'Kelistrikan/Hidrolik'
  ];

  let tableHtml = '';
  wbsCategories.forEach(cat => {
    const itemsInCat = rabItems.filter(item => item.wbsCategory === cat);
    if (itemsInCat.length > 0) {
      tableHtml += `
        <tr class="wbs-header">
          <td colspan="6"><strong>${cat}</strong></td>
        </tr>
      `;
      itemsInCat.forEach(item => {
        const wasteMultiplier = 1 + (item.wasteFactor || 0) / 100;
        const subtotal = item.type === 'material' ? item.qty * item.unitPrice * wasteMultiplier : item.qty * item.unitPrice;
        tableHtml += `
          <tr>
            <td>${item.description}</td>
            <td>${item.type}</td>
            <td>${item.qty}</td>
            <td>Rp ${item.unitPrice.toLocaleString('id-ID')}</td>
            <td>${item.type === 'material' ? item.wasteFactor + '%' : '-'}</td>
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
          <div><strong>No. Polisi:</strong> ${spkDetails?.vehicle_number || '-'}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Deskripsi Komponen</th>
            <th>Tipe</th>
            <th>Qty</th>
            <th>Harga Satuan</th>
            <th>Waste</th>
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
