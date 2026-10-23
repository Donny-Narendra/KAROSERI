import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AmendmentManager, getChangeOrderItemSource } from '../AmendmentManager';
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
        category: 'RAW_MATERIAL',
      },
      {
        id: 'mat-labor-1',
        name: 'TUKANG LAS STRUKTUR SASIS',
        unit: 'jam',
        unit_price: 150000,
        selling_price: 150000,
        cost_price: 120000,
        current_stock: 99,
        category: 'jasa',
      },
      {
        id: 'mat-labor-2',
        name: 'TUKANG CAT FINISHING POLISH',
        unit: 'jam',
        unit_price: 200000,
        selling_price: 200000,
        cost_price: 160000,
        current_stock: 99,
        category: 'labor',
      },
    ]),
  },
}));

// Mock packageService
vi.mock('../../services/packageService', () => ({
  packageService: {
    getPackages: vi.fn().mockResolvedValue([
      {
        id: 'pkg-1',
        name: 'HPP DUDUKAN SLEBOR',
        selling_price: 3500000,
        items: [
          {
            id: 'pi-1',
            item_type: 'MATERIAL',
            material_id: 'mat-1',
            labor_name: null,
            quantity: 2,
            cost_per_unit: 450000,
            default_wbs_allocation: {
              'Sasis/Rangka': 2,
            },
            material: {
              id: 'mat-1',
              name: 'Plat Besi 2mm',
              unit: 'lembar',
              unit_price: 600000,
              selling_price: 600000,
              cost_price: 450000,
              current_stock: 10,
              category: 'RAW_MATERIAL',
            },
          },
          {
            id: 'pi-2',
            item_type: 'LABOR',
            material_id: 'mat-labor-1',
            labor_name: 'TUKANG LAS STRUKTUR SASIS',
            quantity: 4,
            cost_per_unit: 125000,
            default_wbs_allocation: {
              'Sasis/Rangka': 4,
            },
            material: {
              id: 'mat-labor-1',
              name: 'TUKANG LAS STRUKTUR SASIS',
              unit: 'jam',
              unit_price: 150000,
              selling_price: 150000,
              cost_price: 125000,
              current_stock: 99,
              category: 'labor',
            },
          },
        ],
      },
      {
        id: 'pkg-2',
        name: 'PAKET MATERIAL EX CUBE',
        selling_price: 5000000,
        items: [
          {
            id: 'pi-cube-1',
            item_type: 'MATERIAL',
            material_id: 'mat-tes-2',
            quantity: 5,
            cost_per_unit: 200000,
            default_wbs_allocation: {},
            material: {
              id: 'mat-tes-2',
              name: 'material tes 2',
              unit: 'pcs',
              unit_price: 300000,
              cost_price: 200000,
              current_stock: 50,
              category: 'RAW_MATERIAL',
            },
          },
        ],
      },
    ]),
  },
}));

describe('Component: AmendmentManager (Split-Panel 2-Column Change Order UI)', () => {
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

  it('opens form and displays two-column layout controls, package selector, and category toggles', async () => {
    vi.mocked(spkService.getChangeOrders).mockResolvedValue([]);

    render(<AmendmentManager spkId="spk-test-1" spkNo="SPK-2026-001" />);

    await waitFor(() => {
      expect(screen.getByText('Buat Change Order Baru')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Buat Change Order Baru'));

    expect(screen.getByText('Formulir Pengajuan Itemized Change Order (CO)')).toBeInTheDocument();
    expect(screen.getByText('Deskripsi & Justifikasi Perubahan Pekerjaan *')).toBeInTheDocument();
    expect(screen.getByText('Pilih Paket Barang Jadi (Assembly List)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ Item Material/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ Item Jasa \/ Mandor/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ Item Overhead \(FOH\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ Paket Barang Jadi/i })).toBeInTheDocument();
    expect(screen.getByText('Alokasi WBS')).toBeInTheDocument();
    expect(screen.getByText('Ringkasan Pagu Biaya per Tahapan WBS:')).toBeInTheDocument();
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

    // Switch to Overhead mode
    const addOverheadBtn = screen.getByRole('button', { name: /\+ Item Overhead \(FOH\)/i });
    fireEvent.click(addOverheadBtn);

    // Verify overhead badge in form
    expect(screen.getByText('Input Overhead (FOH)')).toBeInTheDocument();
    expect(screen.getByText('Uraian Biaya Overhead (FOH) *')).toBeInTheDocument();

    // Fill in overhead item details
    const overheadNameInput = screen.getByPlaceholderText(/Misal: Sewa alat derek \/ oven lembur/i);
    fireEvent.change(overheadNameInput, { target: { value: 'Sewa Ruang Oven Lembur' } });

    // Set qty to 2, cost price to 600,000, selling price to 800,000
    const qtyInput = screen.getByLabelText(/FREKWENSI DALAM PROYEK INI/i);
    fireEvent.change(qtyInput, { target: { value: '2' } });

    // Match WBS allocation to 2 (e.g. WBS 2 = 2)
    const wbs2Input = screen.getByLabelText(/Alokasi WBS 2: Sasis\/Rangka/i);
    fireEvent.change(wbs2Input, { target: { value: '2' } });

    const spinbuttons = screen.getAllByRole('spinbutton');
    // spinbutton 0: HPP (cost_price), spinbutton 1: selling price (unit_price)
    fireEvent.change(spinbuttons[0], { target: { value: '600000' } });
    fireEvent.change(spinbuttons[1], { target: { value: '800000' } });

    // Click "+ Tambah ke Change Order" to add item to right-hand table
    const addItemBtn = screen.getByRole('button', { name: /\+ Tambah ke Change Order/i });
    expect(addItemBtn).not.toBeDisabled();
    fireEvent.click(addItemBtn);

    // Verify draft summary updates with overhead count, pagu, and margin
    await waitFor(() => {
      expect(screen.getByText(/0 Material, 0 Jasa, 1 Overhead/i)).toBeInTheDocument();
      expect(screen.getByText('Sewa Ruang Oven Lembur')).toBeInTheDocument();
      expect(screen.getByText('[ OVERHEAD ]')).toBeInTheDocument();
    });

    // Check financial cards
    expect(screen.getAllByText('Rp 1.600.000').length).toBeGreaterThanOrEqual(1); // 2 * 800,000
    expect(screen.getByText('1.200.000')).toBeInTheDocument(); // 2 * 600,000 HPP
    expect(screen.getAllByText(/400\.000/).length).toBeGreaterThanOrEqual(1); // 400,000 Margin & Segregated FOH Profit
    expect(screen.getByText('Sub-Rincian Profitabilitas CO (3 Pilar):')).toBeInTheDocument();
    expect(screen.getByText(/Profit Jasa & FOH/i)).toBeInTheDocument();

    // Verify Task 2 Footer Financial Segregated Breakdown
    expect(screen.getByText(/Profit Paket Barang Jadi \(Karya Assembly\):/i)).toBeInTheDocument();
    expect(screen.getByText(/Profit Penjualan Material Granular:/i)).toBeInTheDocument();
    expect(screen.getByText(/Profit Jasa & Overhead Bebas:/i)).toBeInTheDocument();
    expect(screen.getByText(/TOTAL MARGIN \(PROFIT GABUNGAN\):/i)).toBeInTheDocument();

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

  it('Verification 1: Autosearches and selects labor item from inventory, auto-populates prices, and saves material_id', async () => {
    vi.mocked(spkService.getChangeOrders).mockResolvedValue([]);
    vi.mocked(spkService.createChangeOrder).mockResolvedValue({ id: 'co-labor-1' } as any);

    render(<AmendmentManager spkId="spk-test-1" spkNo="SPK-2026-001" />);

    await waitFor(() => {
      expect(screen.getByText('Buat Change Order Baru')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Buat Change Order Baru'));

    // Fill general CO description
    const descTextarea = screen.getByPlaceholderText(/Contoh: Penambahan lapisan/i);
    fireEvent.change(descTextarea, { target: { value: 'Penambahan pekerjaan las sasis' } });

    // Switch to Labor mode
    const addLaborBtn = screen.getByRole('button', { name: /\+ Item Jasa \/ Mandor/i });
    fireEvent.click(addLaborBtn);

    // Expect labor badge and labor autocomplete input
    expect(screen.getByText('Uraian Jasa / Pekerjaan *')).toBeInTheDocument();
    const laborInput = screen.getByPlaceholderText('Misal: Jasa las struktur tambahan');

    // Type "las" into labor autocomplete
    fireEvent.change(laborInput, { target: { value: 'las' } });

    // Wait for dropdown to show matching inventory item
    await waitFor(() => {
      expect(screen.getByTestId('labor-suggestions-dropdown')).toBeInTheDocument();
    });

    expect(screen.getByText('TUKANG LAS STRUKTUR SASIS')).toBeInTheDocument();
    expect(screen.getByText('Rp 150.000')).toBeInTheDocument();
    expect(screen.getByText('HPP: Rp 120.000')).toBeInTheDocument();

    // Select the item by clicking on it
    const laborOption = screen.getByTestId('labor-item-option-mat-labor-1');
    fireEvent.mouseDown(laborOption);

    // Verify input value and Master badge
    expect(laborInput).toHaveValue('TUKANG LAS STRUKTUR SASIS');
    expect(screen.getByTestId('badge-master-labor')).toHaveTextContent('Master');

    // Verify auto-populated prices
    const spinbuttons = screen.getAllByRole('spinbutton');
    // spinbutton 0: HPP (120000), spinbutton 1: selling price (150000)
    expect(spinbuttons[0]).toHaveValue(120000);
    expect(spinbuttons[1]).toHaveValue(150000);

    // Add to Change Order
    const addItemBtn = screen.getByRole('button', { name: /\+ Tambah ke Change Order/i });
    fireEvent.click(addItemBtn);

    // Verify item appears in the live review table
    await waitFor(() => {
      expect(screen.getByText('[ JASA / TUKANG ]')).toBeInTheDocument();
    });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Ajukan Change Order/i });
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(spkService.createChangeOrder).toHaveBeenCalledTimes(1);
    });

    const createPayload = vi.mocked(spkService.createChangeOrder).mock.calls[0][0];
    const laborItem = createPayload.items.find((i: any) => i.item_type === 'LABOR');
    expect(laborItem).toBeDefined();
    expect(laborItem?.item_name).toBe('TUKANG LAS STRUKTUR SASIS');
    expect(laborItem?.material_id).toBe('mat-labor-1');
    expect(laborItem?.unit_price).toBe(150000);
    expect(laborItem?.cost_price).toBe(120000);
    expect(laborItem?.quantity).toBe(1);
  });

  it('Verification 2: Accepts custom non-inventory labor name via Enter, sets material_id: null, and allows manual price entry', async () => {
    vi.mocked(spkService.getChangeOrders).mockResolvedValue([]);
    vi.mocked(spkService.createChangeOrder).mockResolvedValue({ id: 'co-labor-2' } as any);

    render(<AmendmentManager spkId="spk-test-1" spkNo="SPK-2026-001" />);

    await waitFor(() => {
      expect(screen.getByText('Buat Change Order Baru')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Buat Change Order Baru'));

    // Fill general CO description
    const descTextarea = screen.getByPlaceholderText(/Contoh: Penambahan lapisan/i);
    fireEvent.change(descTextarea, { target: { value: 'Bongkar darurat tangki customer' } });

    // Switch to Labor mode
    const addLaborBtn = screen.getByRole('button', { name: /\+ Item Jasa \/ Mandor/i });
    fireEvent.click(addLaborBtn);

    const laborInput = screen.getByPlaceholderText('Misal: Jasa las struktur tambahan');

    // Type custom freeform name not in master inventory
    fireEvent.change(laborInput, { target: { value: 'jasa borong bongkar tangki darurat' } });
    // Press Enter to commit custom name
    fireEvent.keyDown(laborInput, { key: 'Enter' });

    expect(laborInput).toHaveValue('jasa borong bongkar tangki darurat');
    expect(screen.getByTestId('badge-custom-labor')).toHaveTextContent('Kustom');

    // Manually fill cost price (150000) and selling price (250000)
    const spinbuttons = screen.getAllByRole('spinbutton');
    fireEvent.change(spinbuttons[0], { target: { value: '150000' } });
    fireEvent.change(spinbuttons[1], { target: { value: '250000' } });

    // Add to Change Order
    const addItemBtn = screen.getByRole('button', { name: /\+ Tambah ke Change Order/i });
    fireEvent.click(addItemBtn);

    // Verify item in review table
    await waitFor(() => {
      expect(screen.getByText('jasa borong bongkar tangki darurat')).toBeInTheDocument();
    });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Ajukan Change Order/i });
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(spkService.createChangeOrder).toHaveBeenCalledTimes(1);
    });

    const createPayload = vi.mocked(spkService.createChangeOrder).mock.calls[0][0];
    const laborItem = createPayload.items.find((i: any) => i.item_type === 'LABOR');
    expect(laborItem).toBeDefined();
    expect(laborItem?.item_name).toBe('jasa borong bongkar tangki darurat');
    expect(laborItem?.material_id).toBeNull();
    expect(laborItem?.unit_price).toBe(250000);
    expect(laborItem?.cost_price).toBe(150000);
  });

  it('Verification 3: Distributes Qty on WBS allocation grid and splits item into respective WBS stages', async () => {
    vi.mocked(spkService.getChangeOrders).mockResolvedValue([]);
    vi.mocked(spkService.createChangeOrder).mockResolvedValue({ id: 'co-multi-wbs' } as any);

    render(<AmendmentManager spkId="spk-test-1" spkNo="SPK-2026-001" />);

    await waitFor(() => {
      expect(screen.getByText('Buat Change Order Baru')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Buat Change Order Baru'));

    // Fill description
    const descTextarea = screen.getByPlaceholderText(/Contoh: Penambahan lapisan/i);
    fireEvent.change(descTextarea, { target: { value: 'Distribusi material plat ke sasis dan dinding' } });

    // Material mode is default. Select material from autocomplete
    const matInput = screen.getByPlaceholderText('Cari material gudang...');
    fireEvent.focus(matInput);
    fireEvent.change(matInput, { target: { value: 'Plat' } });

    // Wait for dropdown and select Plat Besi 2mm
    const option = screen.getByTestId('material-option-mat-1');
    fireEvent.mouseDown(option);
    fireEvent.click(option);

    expect(matInput).toHaveValue('Plat Besi 2mm');

    // Change total target qty to 2
    const targetQtyInput = screen.getByLabelText(/Qty \(Target\)/i);
    fireEvent.change(targetQtyInput, { target: { value: '2' } });

    // Initially WBS 2 has 1, remaining is 1.00 ("Sisa: 1.00")
    expect(screen.getByText(/Sisa: 1.00/i)).toBeInTheDocument();

    // Allocate 1 to WBS 2 and 1 to WBS 3
    const wbs2Input = screen.getByLabelText(/Alokasi WBS 2: Sasis\/Rangka/i);
    const wbs3Input = screen.getByLabelText(/Alokasi WBS 3: Dinding\/Fabrikasi/i);
    fireEvent.change(wbs2Input, { target: { value: '1' } });
    fireEvent.change(wbs3Input, { target: { value: '1' } });

    // Badge should now show "Sesuai / Pas (0.00)"
    expect(screen.getByText(/Sesuai \/ Pas \(0.00\)/i)).toBeInTheDocument();

    // Click "+ Tambah ke Change Order"
    const addItemBtn = screen.getByRole('button', { name: /\+ Tambah ke Change Order/i });
    expect(addItemBtn).not.toBeDisabled();
    fireEvent.click(addItemBtn);

    // Verify right table now has 2 split rows: one for WBS 2 and one for WBS 3
    await waitFor(() => {
      expect(screen.getAllByText('WBS 2: Sasis/Rangka').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('WBS 3: Dinding/Fabrikasi').length).toBeGreaterThanOrEqual(1);
    });

    // Check Pagu Material updated to 2 * 250,000 = 500,000
    expect(screen.getAllByText('Rp 500.000').length).toBeGreaterThanOrEqual(1);

    // Edit item: Click edit on the first row
    const editButtons = screen.getAllByTitle('Edit item');
    fireEvent.click(editButtons[0]);

    expect(screen.getByText('Edit Bahan Baku')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Update Item di Change Order/i })).toBeInTheDocument();

    // Cancel edit
    fireEvent.click(screen.getByRole('button', { name: /Batal Edit/i }));
    expect(screen.getByText('Input Bahan Baku (Material)')).toBeInTheDocument();

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Ajukan Change Order/i });
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(spkService.createChangeOrder).toHaveBeenCalledTimes(1);
    });

    const payload = vi.mocked(spkService.createChangeOrder).mock.calls[0][0];
    expect(payload.items).toHaveLength(2);
    expect(payload.items[0].wbs_stage).toBe('WBS 2: Sasis/Rangka');
    expect(payload.items[0].quantity).toBe(1);
    expect(payload.items[1].wbs_stage).toBe('WBS 3: Dinding/Fabrikasi');
    expect(payload.items[1].quantity).toBe(1);
  });

  it('opens package selector modal and explodes assembly list into Change Order items', async () => {
    vi.mocked(spkService.getChangeOrders).mockResolvedValue([]);
    vi.mocked(spkService.createChangeOrder).mockResolvedValue({ id: 'new-co-pkg' } as any);

    render(<AmendmentManager spkId="spk-test-1" spkNo="SPK-2026-001" />);

    await waitFor(() => {
      expect(screen.getByText('Buat Change Order Baru')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Buat Change Order Baru'));

    // Click "+ Paket Barang Jadi" button
    const addPackageBtn = screen.getByRole('button', { name: /\+ Paket Barang Jadi/i });
    expect(addPackageBtn).toBeInTheDocument();
    fireEvent.click(addPackageBtn);

    // Verify modal is displayed
    await waitFor(() => {
      expect(screen.getByText('Tambah Paket Barang Jadi (Assembly List)')).toBeInTheDocument();
    });

    // Verify package is loaded and previewed
    expect(screen.getAllByText(/HPP DUDUKAN SLEBOR/).length).toBeGreaterThanOrEqual(1);

    // Click "Terapkan ke Change Order"
    const applyBtn = screen.getByRole('button', { name: /Terapkan.*ke Change Order/i });
    fireEvent.click(applyBtn);

    // Modal should close and items should be exploded in the right-hand review table
    await waitFor(() => {
      expect(screen.queryByText('Tambah Paket Barang Jadi (Assembly List)')).not.toBeInTheDocument();
    });

    // Check exploded items in the live review table
    expect(screen.getByText('Plat Besi 2mm')).toBeInTheDocument();
    expect(screen.getByText('TUKANG LAS STRUKTUR SASIS')).toBeInTheDocument();

    // Check package badges on the item rows
    expect(screen.getAllByText(/\[Paket: HPP DUDUKAN SLEBOR\]/).length).toBe(2);

    // Fill description and submit
    const descTextarea = screen.getByPlaceholderText(/Contoh: Penambahan lapisan/i);
    fireEvent.change(descTextarea, { target: { value: 'Penambahan paket dudukan slebor komplit' } });

    const submitBtn = screen.getByRole('button', { name: /Ajukan Change Order/i });
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(spkService.createChangeOrder).toHaveBeenCalledTimes(1);
    });

    const payload = vi.mocked(spkService.createChangeOrder).mock.calls[0][0];
    expect(payload.items).toHaveLength(2);
    expect(payload.items[0].item_name).toBe('Plat Besi 2mm');
    expect(payload.items[0].item_type).toBe('MATERIAL');
    expect(payload.items[0].quantity).toBe(2);
    expect(payload.items[1].item_name).toBe('TUKANG LAS STRUKTUR SASIS');
    expect(payload.items[1].item_type).toBe('LABOR');
    expect(payload.items[1].quantity).toBe(4);
  });

  it('Verification 1 & 2: opens modal with selected package from dropdown and explodes per-component WBS matrix', async () => {
    vi.mocked(spkService.getChangeOrders).mockResolvedValue([]);

    render(<AmendmentManager spkId="spk-test-1" spkNo="SPK-2026-001" />);

    await waitFor(() => {
      expect(screen.getByText('Buat Change Order Baru')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Buat Change Order Baru'));

    // Select "PAKET MATERIAL EX CUBE" from dropdown
    const pkgSelect = screen.getByLabelText('Pilih Paket Assembly List');
    fireEvent.change(pkgSelect, { target: { value: 'pkg-2' } });

    // Verify modal is displayed and preselects PAKET MATERIAL EX CUBE (pkg-2)
    await waitFor(() => {
      expect(screen.getByText('Tambah Paket Barang Jadi (Assembly List)')).toBeInTheDocument();
    });

    const modalSelect = screen.getByLabelText(/Pilih Paket Barang Jadi \(Master BOM\)/i) as HTMLSelectElement;
    expect(modalSelect.value).toBe('pkg-2');
    expect(screen.getByText('material tes 2')).toBeInTheDocument();

    // Allocate 2 to WBS 2 and 3 to WBS 3
    const wbs2Input = screen.getByLabelText('material tes 2 WBS 2');
    const wbs3Input = screen.getByLabelText('material tes 2 WBS 3');

    fireEvent.change(wbs2Input, { target: { value: '2' } });
    fireEvent.change(wbs3Input, { target: { value: '3' } });

    // Click "Terapkan ke Change Order"
    const applyBtn = screen.getByRole('button', { name: /Terapkan.*ke Change Order/i });
    fireEvent.click(applyBtn);

    // Modal closes
    await waitFor(() => {
      expect(screen.queryByText('Tambah Paket Barang Jadi (Assembly List)')).not.toBeInTheDocument();
    });

    // Check right review table: material tes 2 appears twice: WBS 2 (qty 2) and WBS 3 (qty 3)
    const reviewItems = screen.getAllByText('material tes 2');
    expect(reviewItems).toHaveLength(2);

    expect(screen.getAllByText('WBS 2: Sasis/Rangka').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('WBS 3: Dinding/Fabrikasi').length).toBeGreaterThanOrEqual(1);
  });

  describe('Sprint 79: Decouple Granular Input Validation from Final Change Order Submission', () => {
    it('allows submitting Change Order with package items when granular builder inputs in left panel are empty (no false required errors)', async () => {
      vi.mocked(spkService.getChangeOrders).mockResolvedValue([]);
      vi.mocked(spkService.createChangeOrder).mockResolvedValue({ id: 'co-pkg-only' } as any);

      render(<AmendmentManager spkId="spk-test-1" spkNo="SPK-2026-001" />);

      await waitFor(() => {
        expect(screen.getByText('Buat Change Order Baru')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Buat Change Order Baru'));

      // Check form has noValidate attribute
      const formEl = screen.getByText('Formulir Pengajuan Itemized Change Order (CO)').closest('form');
      expect(formEl).toHaveAttribute('noValidate');

      // Check final submit button is type="button" (decoupled from native HTML5 validation)
      const submitBtn = screen.getByRole('button', { name: /Ajukan Change Order/i });
      expect(submitBtn).toHaveAttribute('type', 'button');

      // Check that granular builder inputs do NOT have HTML5 required attributes
      const targetQtyInput = screen.getByLabelText(/Qty \(Target\)/i);
      expect(targetQtyInput).not.toHaveAttribute('required');

      const spinbuttons = screen.getAllByRole('spinbutton');
      // Harga Modal HPP and Harga Satuan Jual
      spinbuttons.forEach(sb => {
        expect(sb).not.toHaveAttribute('required');
      });

      // Fill description only
      const descTextarea = screen.getByPlaceholderText(/Contoh: Penambahan lapisan/i);
      expect(descTextarea).not.toHaveAttribute('required');
      fireEvent.change(descTextarea, { target: { value: 'Pengajuan paket assembly tanpa input granular manual' } });

      // Add items via package assembly modal
      const addPackageBtn = screen.getByRole('button', { name: /\+ Paket Barang Jadi/i });
      fireEvent.click(addPackageBtn);

      await waitFor(() => {
        expect(screen.getByText('Tambah Paket Barang Jadi (Assembly List)')).toBeInTheDocument();
      });

      // Click "Terapkan ke Change Order"
      const applyBtn = screen.getByRole('button', { name: /Terapkan.*ke Change Order/i });
      fireEvent.click(applyBtn);

      // Verify modal closed and draft items populated in review table
      await waitFor(() => {
        expect(screen.queryByText('Tambah Paket Barang Jadi (Assembly List)')).not.toBeInTheDocument();
      });
      expect(screen.getByText('Plat Besi 2mm')).toBeInTheDocument();

      // Left panel builder inputs are still empty/default:
      // Material name is empty, selling price is empty/0
      const matInput = screen.getByPlaceholderText('Cari material gudang...');
      expect(matInput).toHaveValue('');

      // Click "Ajukan Change Order" via click event (not form submit)
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(spkService.createChangeOrder).toHaveBeenCalledTimes(1);
      });

      const payload = vi.mocked(spkService.createChangeOrder).mock.calls[0][0];
      expect(payload.spkId).toBe('spk-test-1');
      expect(payload.description).toBe('Pengajuan paket assembly tanpa input granular manual');
      expect(payload.items.length).toBeGreaterThan(0);
    });

    it('validates granular inputs only when clicking "+ Tambah ke Change Order" in left builder', async () => {
      vi.mocked(spkService.getChangeOrders).mockResolvedValue([]);

      render(<AmendmentManager spkId="spk-test-1" spkNo="SPK-2026-001" />);

      await waitFor(() => {
        expect(screen.getByText('Buat Change Order Baru')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Buat Change Order Baru'));

      const addItemBtn = screen.getByRole('button', { name: /\+ Tambah ke Change Order/i });
      expect(addItemBtn).not.toBeDisabled();

      // 1. Click without selecting material -> shows error banner
      fireEvent.click(addItemBtn);
      expect(screen.getByText('Pilih atau isi nama bahan baku terlebih dahulu')).toBeInTheDocument();

      // 2. Select material but set unit price to 0
      const matInput = screen.getByPlaceholderText('Cari material gudang...');
      fireEvent.focus(matInput);
      fireEvent.change(matInput, { target: { value: 'Plat' } });
      const option = screen.getByTestId('material-option-mat-1');
      fireEvent.mouseDown(option);
      fireEvent.click(option);

      // Set unit price to 0
      const spinbuttons = screen.getAllByRole('spinbutton');
      // spinbutton 1 is Harga Satuan Jual
      fireEvent.change(spinbuttons[1], { target: { value: '0' } });

      fireEvent.click(addItemBtn);
      expect(screen.getByText('Harga satuan jual harus diisi angka yang valid (lebih dari 0)')).toBeInTheDocument();

      // 3. Set valid unit price -> successfully adds to Change Order
      fireEvent.change(spinbuttons[1], { target: { value: '250000' } });
      fireEvent.click(addItemBtn);

      await waitFor(() => {
        expect(screen.getByText(/1 Material, 0 Jasa, 0 Overhead/i)).toBeInTheDocument();
      });
      // Error is cleared
      expect(screen.queryByText('Harga satuan jual harus diisi angka yang valid (lebih dari 0)')).not.toBeInTheDocument();
    });

    it('validates document-level fields (description and item presence) on final Change Order submission', async () => {
      vi.mocked(spkService.getChangeOrders).mockResolvedValue([]);
      vi.mocked(spkService.createChangeOrder).mockResolvedValue({ id: 'co-test' } as any);

      render(<AmendmentManager spkId="spk-test-1" spkNo="SPK-2026-001" />);

      await waitFor(() => {
        expect(screen.getByText('Buat Change Order Baru')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Buat Change Order Baru'));

      // Submit button is initially disabled when draft items list is empty
      const submitBtn = screen.getByRole('button', { name: /Ajukan Change Order/i });
      expect(submitBtn).toBeDisabled();

      // Add a package item to populate draft items
      const addPackageBtn = screen.getByRole('button', { name: /\+ Paket Barang Jadi/i });
      fireEvent.click(addPackageBtn);

      await waitFor(() => {
        expect(screen.getByText('Tambah Paket Barang Jadi (Assembly List)')).toBeInTheDocument();
      });

      const applyBtn = screen.getByRole('button', { name: /Terapkan.*ke Change Order/i });
      fireEvent.click(applyBtn);

      await waitFor(() => {
        expect(screen.queryByText('Tambah Paket Barang Jadi (Assembly List)')).not.toBeInTheDocument();
      });

      // Submit button is now enabled
      expect(submitBtn).not.toBeDisabled();

      // Click submit without description
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Deskripsi & Justifikasi Perubahan Pekerjaan wajib diisi!')).toBeInTheDocument();
      });
      expect(spkService.createChangeOrder).not.toHaveBeenCalled();

      // Fill description and submit again
      const descTextarea = screen.getByPlaceholderText(/Contoh: Penambahan lapisan/i);
      fireEvent.change(descTextarea, { target: { value: 'Justifikasi valid pengajuan perubahan' } });

      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(spkService.createChangeOrder).toHaveBeenCalledTimes(1);
      });
    });

    it('allows adding the same product package multiple times with separate instance IDs and doubled totals', async () => {
      vi.mocked(spkService.getChangeOrders).mockResolvedValue([]);
      render(<AmendmentManager spkId="spk-test-1" spkNo="SPK-2026-001" />);

      // Open Change Order form
      await waitFor(() => {
        expect(screen.getByText('Buat Change Order Baru')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Buat Change Order Baru'));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Pilih Paket Barang Jadi \(Assembly List\)/i })).toBeInTheDocument();
      });

      // 1. Add package for the first time
      const addPackageBtn = screen.getByRole('button', { name: /\+ Paket Barang Jadi/i });
      fireEvent.click(addPackageBtn);

      await waitFor(() => {
        expect(screen.getByText('Tambah Paket Barang Jadi (Assembly List)')).toBeInTheDocument();
      });

      const applyBtn1 = screen.getByRole('button', { name: /Terapkan.*ke Change Order/i });
      fireEvent.click(applyBtn1);

      await waitFor(() => {
        expect(screen.queryByText('Tambah Paket Barang Jadi (Assembly List)')).not.toBeInTheDocument();
      });

      // Verify 2 items added from first package
      expect(screen.getAllByText(/\[Paket: HPP DUDUKAN SLEBOR\]/).length).toBe(2);

      // 2. Add THE EXACT SAME package for the second time
      fireEvent.click(addPackageBtn);

      await waitFor(() => {
        expect(screen.getByText('Tambah Paket Barang Jadi (Assembly List)')).toBeInTheDocument();
      });

      const applyBtn2 = screen.getByRole('button', { name: /Terapkan.*ke Change Order/i });
      fireEvent.click(applyBtn2);

      await waitFor(() => {
        expect(screen.queryByText('Tambah Paket Barang Jadi (Assembly List)')).not.toBeInTheDocument();
      });

      // Verify 4 items now exist (2 from 1st instance + 2 from 2nd instance)
      expect(screen.getAllByText(/\[Paket: HPP DUDUKAN SLEBOR\]/).length).toBe(4);

      // Fill description and submit
      const descTextarea = screen.getByPlaceholderText(/Contoh: Penambahan lapisan/i);
      fireEvent.change(descTextarea, { target: { value: 'Penambahan dua unit paket dudukan slebor' } });

      const submitBtn = screen.getByRole('button', { name: /Ajukan Change Order/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(spkService.createChangeOrder).toHaveBeenCalledTimes(1);
      });

      const payload = vi.mocked(spkService.createChangeOrder).mock.calls[0][0];
      expect(payload.items).toHaveLength(4);

      // Instance 1 items
      const item1 = payload.items[0];
      const item2 = payload.items[1];
      expect(item1.package_instance_id).toBeDefined();
      expect(item2.package_instance_id).toBe(item1.package_instance_id);

      // Instance 2 items
      const item3 = payload.items[2];
      const item4 = payload.items[3];
      expect(item3.package_instance_id).toBeDefined();
      expect(item4.package_instance_id).toBe(item3.package_instance_id);

      // Verify that instance 1 and instance 2 have strictly different instance IDs
      expect(item1.package_instance_id).not.toBe(item3.package_instance_id);

      // Both retain original package source id and name
      expect(item1.package_source_id).toBe('pkg-1');
      expect(item3.package_source_id).toBe('pkg-1');
      expect(item1.package_name).toBe('HPP DUDUKAN SLEBOR');
      expect(item3.package_name).toBe('HPP DUDUKAN SLEBOR');
    });

    it('prevents multiple final Change Order submissions on rapid clicks', async () => {
      let finishSubmit: () => void = () => {};
      const submitPromise = new Promise<{ id: string }>((resolve) => {
        finishSubmit = () => resolve({ id: 'co-new-123' });
      });
      vi.mocked(spkService.getChangeOrders).mockResolvedValue([]);
      vi.mocked(spkService.createChangeOrder).mockImplementation(() => submitPromise as any);

      render(<AmendmentManager spkId="spk-test-1" spkNo="SPK-2026-001" />);

      // Open Change Order form
      await waitFor(() => {
        expect(screen.getByText('Buat Change Order Baru')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Buat Change Order Baru'));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Pilih Paket Barang Jadi \(Assembly List\)/i })).toBeInTheDocument();
      });

      // Add a package to have valid draft items
      const addPackageBtn = screen.getByRole('button', { name: /\+ Paket Barang Jadi/i });
      fireEvent.click(addPackageBtn);

      await waitFor(() => {
        expect(screen.getByText('Tambah Paket Barang Jadi (Assembly List)')).toBeInTheDocument();
      });

      const applyBtn = screen.getByRole('button', { name: /Terapkan.*ke Change Order/i });
      fireEvent.click(applyBtn);

      await waitFor(() => {
        expect(screen.queryByText('Tambah Paket Barang Jadi (Assembly List)')).not.toBeInTheDocument();
      });

      // Fill description
      const descTextarea = screen.getByPlaceholderText(/Contoh: Penambahan lapisan/i);
      fireEvent.change(descTextarea, { target: { value: 'Penambahan slebor double-click prevention' } });

      const submitBtn = screen.getByRole('button', { name: /Ajukan Change Order/i });

      // First click
      fireEvent.click(submitBtn);

      // Rapid second click
      fireEvent.click(submitBtn);

      // Button should be in loading state
      expect(screen.getByText('Menyimpan Change Order...')).toBeInTheDocument();
      expect(submitBtn).toBeDisabled();

      // Finish async submit
      finishSubmit();

      await waitFor(() => {
        expect(spkService.createChangeOrder).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Sprint 83: Add Source Origin Column to Change Order Snapshot Table', () => {
    describe('getChangeOrderItemSource helper', () => {
      it('resolves source from direct package_name field', () => {
        const item = {
          item_name: 'Plat Besi 2mm',
          package_name: 'HPP DUDUKAN SLEBOR',
        };
        const result = getChangeOrderItemSource(item);
        expect(result.isPackage).toBe(true);
        expect(result.label).toBe('📦 Paket: HPP DUDUKAN SLEBOR');
        expect(result.packageName).toBe('HPP DUDUKAN SLEBOR');
      });

      it('resolves source from product_packages relation', () => {
        const item = {
          item_name: 'Tukang Las Sasis',
          product_packages: { id: 'pkg-1', name: 'PAKET RANGKA SASIS' },
        };
        const result = getChangeOrderItemSource(item);
        expect(result.isPackage).toBe(true);
        expect(result.label).toBe('📦 Paket: PAKET RANGKA SASIS');
        expect(result.packageName).toBe('PAKET RANGKA SASIS');
      });

      it('resolves source from notes starting with "Bagian dari paket: "', () => {
        const item = {
          item_name: 'Baut Hexagonal',
          notes: 'Bagian dari paket: PAKET MATERIAL EX CUBE',
        };
        const result = getChangeOrderItemSource(item);
        expect(result.isPackage).toBe(true);
        expect(result.label).toBe('📦 Paket: PAKET MATERIAL EX CUBE');
        expect(result.packageName).toBe('PAKET MATERIAL EX CUBE');
      });

      it('resolves source from notes matching bracketed "[Paket: ...]" format', () => {
        const item = {
          item_name: 'Engsel Pintu Belakang',
          notes: '[Paket: BODY BUS 30 SEAT] Tambahan kustom',
        };
        const result = getChangeOrderItemSource(item);
        expect(result.isPackage).toBe(true);
        expect(result.label).toBe('📦 Paket: BODY BUS 30 SEAT');
        expect(result.packageName).toBe('BODY BUS 30 SEAT');
      });

      it('resolves source from package_source_id using packagesList lookup', () => {
        const item = {
          item_name: 'Plat Dudukan',
          package_source_id: 'pkg-custom-99',
        };
        const packagesList = [
          { id: 'pkg-custom-99', name: 'PAKET MODIFIKASI KHUSUS' },
        ];
        const result = getChangeOrderItemSource(item, packagesList);
        expect(result.isPackage).toBe(true);
        expect(result.label).toBe('📦 Paket: PAKET MODIFIKASI KHUSUS');
        expect(result.packageName).toBe('PAKET MODIFIKASI KHUSUS');
      });

      it('returns Granular label when no package information is present', () => {
        const item = {
          item_name: 'Cat Epoxy Abu-Abu',
          notes: 'Input manual lepas satu kaleng',
        };
        const result = getChangeOrderItemSource(item);
        expect(result.isPackage).toBe(false);
        expect(result.label).toBe('📋 Granular');
        expect(result.packageName).toBeNull();
      });
    });

    describe('Snapshot Table Rendering in AmendmentManager', () => {
      const mockCOWithMixedItems = [
        {
          id: 'co-mixed-1',
          spk_id: 'spk-test-1',
          co_number: 'CO-SPK4374-6417',
          description: 'Pekerjaan Adendum Kombinasi Paket dan Lepas',
          cost_adjustment: 4200000,
          total_amount: 4200000,
          status: 'APPROVED',
          created_at: '2026-10-24T00:00:00Z',
          items: [
            {
              id: 'it-pkg-1',
              change_order_id: 'co-mixed-1',
              spk_id: 'spk-test-1',
              wbs_stage: 'WBS 2: Sasis/Rangka',
              item_type: 'MATERIAL',
              item_name: 'Plat Besi 2mm (BOM)',
              quantity: 2,
              unit: 'lembar',
              unit_price: 600000,
              cost_price: 450000,
              package_name: 'HPP DUDUKAN SLEBOR',
              package_source_id: 'pkg-1',
              notes: 'Komponen paket slebor',
            },
            {
              id: 'it-granular-mat-1',
              change_order_id: 'co-mixed-1',
              spk_id: 'spk-test-1',
              wbs_stage: 'WBS 3: Dinding/Fabrikasi',
              item_type: 'MATERIAL',
              item_name: 'Pipa Seamless 1.5 inch',
              quantity: 3,
              unit: 'batang',
              unit_price: 300000,
              cost_price: 220000,
              notes: 'Tambahan pipa luar paket',
            },
            {
              id: 'it-granular-labor-1',
              change_order_id: 'co-mixed-1',
              spk_id: 'spk-test-1',
              wbs_stage: 'WBS 4: Cat/Finishing',
              item_type: 'LABOR',
              item_name: 'Jasa Dempul Ekstra Halus',
              quantity: 4,
              unit: 'jam',
              unit_price: 150000,
              cost_price: 120000,
              notes: null,
            },
          ],
        },
      ];

      it('renders the new SUMBER / PAKET table header and corresponding badges', async () => {
        vi.mocked(spkService.getChangeOrders).mockResolvedValue(mockCOWithMixedItems as any);

        render(<AmendmentManager spkId="spk-test-1" spkNo="SPK-4374" />);

        await waitFor(() => {
          expect(screen.getByText('Change Orders & Amandemen SPK')).toBeInTheDocument();
        });

        // 1. Verify header exists
        expect(screen.getByRole('columnheader', { name: /sumber \/ paket/i })).toBeInTheDocument();

        // Verify headers order: Item Type -> Sumber / Paket -> Alokasi WBS -> Deskripsi Item
        const headers = screen.getAllByRole('columnheader');
        const headerTexts = headers.map(h => h.textContent?.trim());
        expect(headerTexts).toContain('Sumber / Paket');
        const itemTypeIdx = headerTexts.findIndex(h => /item type/i.test(h || ''));
        const sourcePkgIdx = headerTexts.findIndex(h => /sumber \/ paket/i.test(h || ''));
        const wbsIdx = headerTexts.findIndex(h => /alokasi wbs/i.test(h || ''));

        expect(itemTypeIdx).toBeGreaterThanOrEqual(0);
        expect(sourcePkgIdx).toBe(itemTypeIdx + 1);
        expect(wbsIdx).toBe(sourcePkgIdx + 1);

        // 2. Verify Package Badge
        const pkgBadge = screen.getByTestId('badge-source-pkg-it-pkg-1');
        expect(pkgBadge).toBeInTheDocument();
        expect(pkgBadge).toHaveTextContent('📦 Paket: HPP DUDUKAN SLEBOR');
        expect(pkgBadge.className).toContain('text-amber-400');

        // 3. Verify Granular Badges
        const granularMatBadge = screen.getByTestId('badge-source-granular-it-granular-mat-1');
        expect(granularMatBadge).toBeInTheDocument();
        expect(granularMatBadge).toHaveTextContent('📋 Granular');
        expect(granularMatBadge.className).toContain('text-slate-300');

        const granularLaborBadge = screen.getByTestId('badge-source-granular-it-granular-labor-1');
        expect(granularLaborBadge).toBeInTheDocument();
        expect(granularLaborBadge).toHaveTextContent('📋 Granular');
      });

      it('renders empty table state with colSpan=9 when change order has no items', async () => {
        const mockEmptyCO = [
          {
            id: 'co-empty-1',
            spk_id: 'spk-test-1',
            co_number: 'CO-LEGACY-001',
            description: 'Change order legacy tanpa rincian item',
            cost_adjustment: 1000000,
            total_amount: 1000000,
            status: 'APPROVED',
            created_at: '2026-10-24T00:00:00Z',
            items: [],
          },
        ];
        vi.mocked(spkService.getChangeOrders).mockResolvedValue(mockEmptyCO as any);

        render(<AmendmentManager spkId="spk-test-1" spkNo="SPK-4374" />);

        await waitFor(() => {
          expect(screen.getByText('Change Orders & Amandemen SPK')).toBeInTheDocument();
        });

        const emptyCell = screen.getByText('Tidak ada rincian item individual (Legacy Change Order).');
        expect(emptyCell).toBeInTheDocument();
        expect(emptyCell).toHaveAttribute('colSpan', '9');
      });
    });

    describe('Sprint 84: 4-Pillar Itemized Margins on Change Order Cards', () => {
      const mockCOWithAllPillars = [
        {
          id: 'co-all-pillars-1',
          spk_id: 'spk-test-1',
          co_number: 'CO-SPK4374-9001',
          description: 'Adendum Komprehensif 4 Pilar Biaya',
          cost_adjustment: 8000000,
          total_amount: 8000000,
          status: 'APPROVED',
          created_at: '2026-10-24T00:00:00Z',
          items: [
            // 1. Paket: 2 x (1,500,000 - 1,000,000) = 1,000,000 margin
            {
              id: 'it-pkg-1',
              change_order_id: 'co-all-pillars-1',
              spk_id: 'spk-test-1',
              wbs_stage: 'WBS 2: Sasis/Rangka',
              item_type: 'MATERIAL',
              item_name: 'Paket Dudukan Hidrolis',
              quantity: 2,
              unit: 'set',
              unit_price: 1500000,
              cost_price: 1000000,
              package_source_id: 'pkg-hidrolis',
              package_name: 'Paket Dudukan Hidrolis',
            },
            // 2. Granular Material: 5 x (200,000 - 150,000) = 250,000 margin
            {
              id: 'it-mat-1',
              change_order_id: 'co-all-pillars-1',
              spk_id: 'spk-test-1',
              wbs_stage: 'WBS 3: Dinding/Fabrikasi',
              item_type: 'MATERIAL',
              item_name: 'Pipa Besi Seamless',
              quantity: 5,
              unit: 'batang',
              unit_price: 200000,
              cost_price: 150000,
            },
            // 3. Labor: 4 x (250,000 - 175,000) = 300,000 margin
            {
              id: 'it-labor-1',
              change_order_id: 'co-all-pillars-1',
              spk_id: 'spk-test-1',
              wbs_stage: 'WBS 3: Dinding/Fabrikasi',
              item_type: 'LABOR',
              item_name: 'Jasa Las Spesialis',
              quantity: 4,
              unit: 'titik',
              unit_price: 250000,
              cost_price: 175000,
            },
            // 4. Overhead: 2 x (300,000 - 200,000) = 200,000 margin
            {
              id: 'it-overhead-1',
              change_order_id: 'co-all-pillars-1',
              spk_id: 'spk-test-1',
              wbs_stage: 'WBS 4: Cat/Finishing',
              item_type: 'OVERHEAD',
              item_name: 'Listrik & Alat Bantu Las',
              quantity: 2,
              unit: 'shift',
              unit_price: 300000,
              cost_price: 200000,
            },
          ],
        },
      ];

      it('renders 4 itemized margin breakdown badges under Margin Laba on the card header', async () => {
        vi.mocked(spkService.getChangeOrders).mockResolvedValue(mockCOWithAllPillars as any);

        render(<AmendmentManager spkId="spk-test-1" spkNo="SPK-4374" />);

        await waitFor(() => {
          expect(screen.getByText('Change Orders & Amandemen SPK')).toBeInTheDocument();
        });

        // Verify container
        const breakdownContainer = screen.getByTestId('co-margins-breakdown-co-all-pillars-1');
        expect(breakdownContainer).toBeInTheDocument();

        // 1. Paket Margin: Rp 1.000.000
        const pkgMargin = screen.getByTestId('co-margin-pkg-co-all-pillars-1');
        expect(pkgMargin).toBeInTheDocument();
        expect(pkgMargin).toHaveTextContent('Paket:');
        expect(pkgMargin).toHaveTextContent('Rp 1.000.000');
        expect(pkgMargin.className).toContain('text-amber-400');

        // 2. Material Margin: Rp 250.000
        const matMargin = screen.getByTestId('co-margin-mat-co-all-pillars-1');
        expect(matMargin).toBeInTheDocument();
        expect(matMargin).toHaveTextContent('Material:');
        expect(matMargin).toHaveTextContent('Rp 250.000');
        expect(matMargin.className).toContain('text-cyan-400');

        // 3. Labor Margin: Rp 300.000
        const laborMargin = screen.getByTestId('co-margin-labor-co-all-pillars-1');
        expect(laborMargin).toBeInTheDocument();
        expect(laborMargin).toHaveTextContent('Labor:');
        expect(laborMargin).toHaveTextContent('Rp 300.000');
        expect(laborMargin.className).toContain('text-sky-400');

        // 4. Overhead Margin: Rp 200.000
        const overheadMargin = screen.getByTestId('co-margin-overhead-co-all-pillars-1');
        expect(overheadMargin).toBeInTheDocument();
        expect(overheadMargin).toHaveTextContent('Overhead:');
        expect(overheadMargin).toHaveTextContent('Rp 200.000');
        expect(overheadMargin.className).toContain('text-purple-400');
      });

      it('safely renders zero values for all 4 margin pillars when change order has no items', async () => {
        const mockEmptyCO = [
          {
            id: 'co-empty-2',
            spk_id: 'spk-test-1',
            co_number: 'CO-EMPTY-002',
            description: 'Change order tanpa items',
            cost_adjustment: 0,
            total_amount: 0,
            status: 'PENDING',
            created_at: '2026-10-24T00:00:00Z',
            items: [],
          },
        ];
        vi.mocked(spkService.getChangeOrders).mockResolvedValue(mockEmptyCO as any);

        render(<AmendmentManager spkId="spk-test-1" spkNo="SPK-4374" />);

        await waitFor(() => {
          expect(screen.getByText('Change Orders & Amandemen SPK')).toBeInTheDocument();
        });

        const pkgMargin = screen.getByTestId('co-margin-pkg-co-empty-2');
        const matMargin = screen.getByTestId('co-margin-mat-co-empty-2');
        const laborMargin = screen.getByTestId('co-margin-labor-co-empty-2');
        const overheadMargin = screen.getByTestId('co-margin-overhead-co-empty-2');

        expect(pkgMargin).toHaveTextContent('Paket:');
        expect(pkgMargin).toHaveTextContent('Rp 0');
        expect(matMargin).toHaveTextContent('Material:');
        expect(matMargin).toHaveTextContent('Rp 0');
        expect(laborMargin).toHaveTextContent('Labor:');
        expect(laborMargin).toHaveTextContent('Rp 0');
        expect(overheadMargin).toHaveTextContent('Overhead:');
        expect(overheadMargin).toHaveTextContent('Rp 0');
      });
    });
  });
});


