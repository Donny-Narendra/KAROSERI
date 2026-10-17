import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AmendmentManager } from '../AmendmentManager';
import { spkService } from '../../services/spkService';

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    profile: {
      id: 'user-advisor-1',
      full_name: 'Budi Service Advisor',
      role: 'service_advisor',
    },
  }),
}));

// Mock Supabase client
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { spk_no: 'SPK-2026-001' },
        error: null,
      }),
    })),
  },
}));

// Mock spkService
vi.mock('../../services/spkService', () => ({
  spkService: {
    getChangeOrders: vi.fn(),
    createChangeOrder: vi.fn(),
    approveChangeOrder: vi.fn(),
    rejectChangeOrder: vi.fn(),
  },
}));

// Mock inventoryService
vi.mock('../../services/inventoryService', () => ({
  inventoryService: {
    getMaterials: vi.fn().mockResolvedValue([
      {
        id: 'mat-1',
        name: 'Plat Besi 2mm',
        unit: 'lembar',
        unit_price: 250000,
        selling_price: 250000,
        cost_price: 200000,
        current_stock: 10,
      },
    ]),
  },
}));

describe('Component: AmendmentManager (3-Element Costing & Overhead Support)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockExistingChangeOrders = [
    {
      id: 'co-1',
      spk_id: 'spk-test-1',
      co_number: 'CO-SPK2026001-001',
      description: 'Pekerjaan tambah pengelasan dan sewa alat derek',
      cost_adjustment: 1500000,
      total_amount: 1500000,
      status: 'APPROVED',
      created_at: '2026-10-18T00:00:00Z',
      items: [
        {
          id: 'item-co-1',
          change_order_id: 'co-1',
          spk_id: 'spk-test-1',
          wbs_stage: 'WBS 2: Sasis/Rangka',
          item_type: 'MATERIAL',
          item_name: 'Plat Besi 2mm',
          quantity: 2,
          unit: 'lembar',
          unit_price: 250000,
          cost_price: 200000,
          subtotal: 500000,
          notes: 'Material tambahan rangka',
        },
        {
          id: 'item-co-2',
          change_order_id: 'co-1',
          spk_id: 'spk-test-1',
          wbs_stage: 'WBS 2: Sasis/Rangka',
          item_type: 'LABOR',
          item_name: 'Jasa Las Tambahan',
          quantity: 5,
          unit: 'jam',
          unit_price: 100000,
          cost_price: 70000,
          subtotal: 500000,
          notes: 'Tukang las borongan',
        },
        {
          id: 'item-co-3',
          change_order_id: 'co-1',
          spk_id: 'spk-test-1',
          wbs_stage: 'WBS 1: Pembongkaran',
          item_type: 'OVERHEAD',
          item_name: 'Sewa Alat Derek',
          quantity: 1,
          unit: 'hari',
          unit_price: 500000,
          cost_price: 400000,
          subtotal: 500000,
          notes: 'Derek evakuasi bodi',
        },
      ],
    },
  ];

  it('renders existing change orders with Material, Labor, and Overhead badges', async () => {
    vi.mocked(spkService.getChangeOrders).mockResolvedValue(mockExistingChangeOrders as any);

    render(<AmendmentManager spkId="spk-test-1" spkNo="SPK-2026-001" />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.getByText('Change Orders & Amandemen SPK')).toBeInTheDocument();
    });

    // Check header and description
    expect(screen.getByText('Pekerjaan tambah pengelasan dan sewa alat derek')).toBeInTheDocument();
    expect(screen.getByText('Disetujui (Approved)')).toBeInTheDocument();

    // Check badges in expanded detail table
    expect(screen.getByText('MATERIAL')).toBeInTheDocument();
    expect(screen.getByText('LABOR')).toBeInTheDocument();
    expect(screen.getByText('OVERHEAD')).toBeInTheDocument();

    // Check items
    expect(screen.getByText('Plat Besi 2mm')).toBeInTheDocument();
    expect(screen.getByText('Jasa Las Tambahan')).toBeInTheDocument();
    expect(screen.getByText('Sewa Alat Derek')).toBeInTheDocument();
  });

  it('opens form and displays + Item Overhead (FOH) button', async () => {
    vi.mocked(spkService.getChangeOrders).mockResolvedValue([]);

    render(<AmendmentManager spkId="spk-test-1" spkNo="SPK-2026-001" />);

    await waitFor(() => {
      expect(screen.getByText('Buat Change Order Baru')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Buat Change Order Baru'));

    expect(screen.getByText('Formulir Pengajuan Itemized Change Order (CO)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ Item Material/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ Item Jasa \/ Mandor/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ Item Overhead \(FOH\)/i })).toBeInTheDocument();
  });

  it('creates an Overhead change order item, computes live margins, and submits payload', async () => {
    vi.mocked(spkService.getChangeOrders).mockResolvedValue([]);
    vi.mocked(spkService.createChangeOrder).mockResolvedValue({ id: 'new-co-1' } as any);

    render(<AmendmentManager spkId="spk-test-1" spkNo="SPK-2026-001" />);

    await waitFor(() => {
      expect(screen.getByText('Buat Change Order Baru')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Buat Change Order Baru'));

    // Fill general CO description
    const descTextarea = screen.getByPlaceholderText(/Contoh: Penambahan lapisan/i);
    fireEvent.change(descTextarea, { target: { value: 'Sewa ruang oven lembur untuk pengeringan' } });

    // Remove default empty material item
    const removeButtons = screen.getAllByTitle('Hapus baris ini');
    fireEvent.click(removeButtons[0]);

    // Click "+ Item Overhead (FOH)" button
    const addOverheadBtn = screen.getByRole('button', { name: /\+ Item Overhead \(FOH\)/i });
    fireEvent.click(addOverheadBtn);

    // Verify overhead badge in form
    expect(screen.getAllByText('OVERHEAD').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Uraian Biaya Overhead (FOH) *')).toBeInTheDocument();

    // Fill in overhead item details
    const overheadNameInput = screen.getByPlaceholderText(/Misal: Sewa alat derek \/ oven lembur/i);
    fireEvent.change(overheadNameInput, { target: { value: 'Sewa Ruang Oven Lembur' } });

    // Set qty to 2, selling price to 800,000, cost price to 600,000
    const qtyInputs = screen.getAllByRole('spinbutton');
    fireEvent.change(qtyInputs[0], { target: { value: '2' } });
    fireEvent.change(qtyInputs[1], { target: { value: '800000' } });
    fireEvent.change(qtyInputs[2], { target: { value: '600000' } });

    // Verify draft summary updates with overhead count and margin
    await waitFor(() => {
      expect(screen.getByText(/0 Material, 0 Jasa, 1 Overhead/i)).toBeInTheDocument();
    });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Ajukan Change Order/i });
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(spkService.createChangeOrder).toHaveBeenCalledTimes(1);
    });

    const createPayload = vi.mocked(spkService.createChangeOrder).mock.calls[0][0];
    expect(createPayload.spkId).toBe('spk-test-1');
    expect(createPayload.description).toBe('Sewa ruang oven lembur untuk pengeringan');
    expect(createPayload.status).toBe('PENDING');

    const overheadItem = createPayload.items.find((i: any) => i.item_type === 'OVERHEAD');
    expect(overheadItem).toBeDefined();
    expect(overheadItem?.item_name).toBe('Sewa Ruang Oven Lembur');
    expect(overheadItem?.quantity).toBe(2);
    expect(overheadItem?.unit_price).toBe(800000);
    expect(overheadItem?.cost_price).toBe(600000);
    expect(overheadItem?.unit).toBe('hari');
  });
});
