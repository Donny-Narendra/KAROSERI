import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildInvoicePrintPayload,
  printFinalInvoice,
  formatCurrency,
  type SpkInvoiceInput,
} from '../invoiceExport';
import type { ApprovedChangeOrder } from '../../services/billingService';

describe('Sprint 49: Invoice Export & Printable Payload Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSpk: SpkInvoiceInput = {
    id: 'SPK-2668',
    customerName: 'PT Sumber Makmur Logistik',
    vehiclePlate: 'B 9876 SML',
    vehicleVin: 'MHFC2668XYZ123456',
    vehicleEngine: 'ENG-2668',
    vehicleModel: 'Hino Dutro 130 HD Box',
    quotationAmount: 50_000_000,
    packageSellingPrice: 45_000_000,
    nonPackageMaterialCost: 5_000_000,
    dpAmount: 15_000_000,
    paymentStatus: 'UNPAID',
  };

  const mockApprovedChangeOrders: ApprovedChangeOrder[] = [
    {
      id: 'co-uuid-1',
      order_number: 'CO-SPK2668-1001',
      co_number: 'CO-SPK2668-1001',
      description: 'Penambahan Pintu Samping & Sekat Interior',
      wbs_stage: 'WBS 3: Dinding/Fabrikasi',
      total_amount: 3_500_000,
      created_at: '2026-10-18T08:00:00Z',
      approved_at: '2026-10-19T10:30:00Z',
      approved_by: 'user-manager-1',
      change_order_items: [
        {
          id: 'item-1',
          item_name: 'Plat Bordes Aluminium 2mm',
          item_type: 'MATERIAL',
          wbs_stage: 'WBS 3: Dinding/Fabrikasi',
          quantity: 2,
          unit: 'lembar',
          unit_price: 1_000_000,
          cost_price: 750_000,
          subtotal: 2_000_000,
          notes: 'Spesifikasi anti slip',
        },
        {
          id: 'item-2',
          item_name: 'Jasa Las & Engsel Pintu Samping',
          item_type: 'LABOR',
          wbs_stage: 'WBS 3: Dinding/Fabrikasi',
          quantity: 1,
          unit: 'titik',
          unit_price: 1_500_000,
          cost_price: 900_000,
          subtotal: 1_500_000,
          notes: null,
        },
      ],
    },
    {
      id: 'co-uuid-2',
      order_number: 'CO-SPK2668-1002',
      co_number: 'CO-SPK2668-1002',
      description: 'Pemasangan Lampu LED Strip Tambahan',
      wbs_stage: 'WBS 5: Kelistrikan/Hidrolik',
      total_amount: 800_000,
      created_at: '2026-10-19T11:00:00Z',
      approved_at: '2026-10-19T14:00:00Z',
      approved_by: 'user-manager-1',
      change_order_items: [
        {
          id: 'item-3',
          item_name: 'LED Strip Waterproof 12V 5M',
          item_type: 'MATERIAL',
          wbs_stage: 'WBS 5: Kelistrikan/Hidrolik',
          quantity: 1,
          unit: 'roll',
          unit_price: 500_000,
          cost_price: 350_000,
          subtotal: 500_000,
        },
        {
          id: 'item-4',
          item_name: 'Jasa Wiring & Saklar Tambahan',
          item_type: 'LABOR',
          wbs_stage: 'WBS 5: Kelistrikan/Hidrolik',
          quantity: 1,
          unit: 'paket',
          unit_price: 300_000,
          cost_price: 150_000,
          subtotal: 300_000,
        },
      ],
    },
  ];

  it('formatCurrency formats Indonesian Rupiah cleanly', () => {
    expect(formatCurrency(1500000)).toMatch(/Rp\s*1\.500\.000/);
  });

  it('builds comprehensive printable invoice payload with itemized change orders mapped', () => {
    const manualAdjustment = -500_000; // Rp 500k discount
    const payload = buildInvoicePrintPayload(mockSpk, mockApprovedChangeOrders, manualAdjustment);

    expect(payload.spkNo).toBe('SPK-2668');
    expect(payload.customerName).toBe('PT Sumber Makmur Logistik');
    expect(payload.vehiclePlate).toBe('B 9876 SML');
    expect(payload.vehicleVin).toBe('MHFC2668XYZ123456');
    expect(payload.quotationAmount).toBe(50_000_000);
    expect(payload.packageSellingPrice).toBe(45_000_000);
    expect(payload.nonPackageMaterialCost).toBe(5_000_000);

    // Change orders total: 3.500.000 + 800.000 = 4.300.000
    expect(payload.totalChangeOrderAmount).toBe(4_300_000);
    expect(payload.approvedChangeOrders).toHaveLength(2);
    expect(payload.approvedChangeOrders[0].order_number).toBe('CO-SPK2668-1001');
    expect(payload.approvedChangeOrders[0].change_order_items).toHaveLength(2);

    // Total selling price: 50.000.000 + 4.300.000 - 500.000 = 53.800.000
    expect(payload.totalSellingPrice).toBe(53_800_000);
    expect(payload.dpAmount).toBe(15_000_000);

    // Final amount due: 53.800.000 - 15.000.000 = 38.800.000
    expect(payload.finalAmountDue).toBe(38_800_000);
  });

  it('handles zero change orders and zero manual adjustments gracefully', () => {
    const payload = buildInvoicePrintPayload(mockSpk, [], 0);

    expect(payload.totalChangeOrderAmount).toBe(0);
    expect(payload.approvedChangeOrders).toHaveLength(0);
    expect(payload.totalSellingPrice).toBe(50_000_000);
    expect(payload.finalAmountDue).toBe(35_000_000);
  });

  it('triggers printFinalInvoice with complete legal dispute text and item tables', () => {
    const mockWrite = vi.fn();
    const mockClose = vi.fn();
    const mockPrintWindow = {
      document: {
        write: mockWrite,
        close: mockClose,
      },
    };

    vi.spyOn(window, 'open').mockReturnValue(mockPrintWindow as unknown as Window);

    const payload = buildInvoicePrintPayload(mockSpk, mockApprovedChangeOrders, 0);
    printFinalInvoice(payload);

    expect(window.open).toHaveBeenCalledWith('', '_blank');
    expect(mockWrite).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();

    const writtenHtml = mockWrite.mock.calls[0][0] as string;
    // Check header & SPK info
    expect(writtenHtml).toContain('ROBEL KAROSERI');
    expect(writtenHtml).toContain('Faktur Tagihan Akhir');
    expect(writtenHtml).toContain('SPK-2668');
    expect(writtenHtml).toContain('PT Sumber Makmur Logistik');

    // Check Change Orders itemized table
    expect(writtenHtml).toContain('CO-SPK2668-1001');
    expect(writtenHtml).toContain('Plat Bordes Aluminium 2mm');
    expect(writtenHtml).toContain('WBS 3: Dinding/Fabrikasi');
    expect(writtenHtml).toContain('Jasa Las & Engsel Pintu Samping');
    expect(writtenHtml).toContain('CO-SPK2668-1002');
    expect(writtenHtml).toContain('LED Strip Waterproof 12V 5M');

    // Check Legal protection and signatures
    expect(writtenHtml).toContain('Pernyataan Hukum & Perlindungan Sengketa');
    expect(writtenHtml).toContain('Kasir Robel Karoseri');
    expect(writtenHtml).toContain('window.print()');
  });
});
