import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { GoodsIssueForm } from '../GoodsIssueForm';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'wh-user-1', email: 'gudang@test.com' },
    profile: { id: 'wh-user-1', full_name: 'Petugas Gudang', role: 'petugas_gudang' },
  }),
}));

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Component: GoodsIssueForm (Quantity-Based Gate 2 & Non-Blocking HPP Variance)', () => {
  const spkId = 'spk-3538-uuid';
  const matId = 'mat-dempul-uuid';

  const setupMock = (options?: { masterCostPrice?: number; issuedQty?: number }) => {
    const masterCost = options?.masterCostPrice ?? 264444;
    const issuedQty = options?.issuedQty ?? 0;

    const masterMaterials = [
      {
        id: matId,
        name: 'Dempul Pendempulan',
        barcode: 'DMP-001',
        unit: 'set',
        current_stock: 10,
        cost_price: masterCost,
        selling_price: 330000,
        unit_price: 330000,
        waste_factor_percentage: 0,
      },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'spk') {
        const q: any = {};
        q.select = vi.fn().mockReturnValue(q);
        q.eq = vi.fn().mockReturnValue(q);
        q.order = vi.fn().mockResolvedValue({
          data: [
            {
              id: spkId,
              spk_no: 'SPK-3538',
              customer_name: 'PT Jaya Karoseri',
              status: 'ACTIVE',
              is_hidden: false,
              is_test: false,
            },
          ],
          error: null,
        });
        return q;
      }

      if (table === 'materials') {
        return {
          select: vi.fn().mockImplementation(() => ({
            order: vi.fn().mockResolvedValue({ data: masterMaterials, error: null }),
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: masterMaterials[0], error: null }),
            }),
          })),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        } as any;
      }

      if (table === 'rab_estimations') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'rab-est-1',
                  rab_items: [
                    {
                      id: 'rab-item-dempul',
                      material_id: matId,
                      description: 'Dempul Pendempulan',
                      quantity: 1,
                      cost_price: 264444,
                      unit_price: 290000,
                      item_total: 290000,
                      wbs_stage: 'WBS 3: Dinding/Fabrikasi',
                      wbs_category: 'Dinding/Fabrikasi',
                      item_type: 'MATERIAL',
                    },
                  ],
                },
                error: null,
              }),
            }),
          }),
        } as any;
      }

      if (table === 'change_order_items') {
        const q: any = {};
        q.select = vi.fn().mockReturnValue(q);
        q.eq = vi.fn().mockReturnValue(q);
        q.then = (resolve: any) => resolve({ data: [], error: null });
        return q;
      }

      if (table === 'inventory_transactions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data:
                issuedQty > 0
                  ? [
                      {
                        id: 'tx-1',
                        spk_id: spkId,
                        material_id: matId,
                        quantity_issued: issuedQty,
                        wbs_stage: 'WBS 3: Dinding/Fabrikasi',
                        status: 'ACTIVE',
                      },
                    ]
                  : [],
              error: null,
            }),
          }),
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as any;
      }

      if (table === 'material_issues') {
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as any;
      }

      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      } as any;
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const selectSpkAndMaterial = async () => {
    await waitFor(() => {
      expect(screen.getByText(/SPK-3538 - PT Jaya Karoseri/i)).toBeInTheDocument();
    });

    const spkSelect = screen.getByRole('combobox');
    fireEvent.change(spkSelect, { target: { value: spkId } });

    const matInput = screen.getByPlaceholderText(/Cari bahan baku/i);
    fireEvent.focus(matInput);
    fireEvent.change(matInput, { target: { value: 'Dempul' } });

    const option = await screen.findByText('Dempul Pendempulan');
    fireEvent.mouseDown(option);
  };

  it('Sub-kondisi 1A: displays green Qty-compliant banner and active Issue Material button when Qty matches RAB and HPP is unchanged', async () => {
    setupMock({ masterCostPrice: 264444 });
    render(<GoodsIssueForm />);

    await selectSpkAndMaterial();

    const qtyInput = screen.getByPlaceholderText(/Enter quantity/i);
    fireEvent.change(qtyInput, { target: { value: '1' } });

    expect(
      await screen.findByText(/Kuota Kuantitas Sesuai RAB \(WBS 3: Dinding\/Fabrikasi\): 1 \/ 1 set \(Aman untuk dirilis\)\./i)
    ).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Issue Material/i });
    expect(submitBtn).toBeEnabled();
  });

  it('Sub-kondisi 1B: displays non-blocking sky-blue info banner when supplier HPP rises (Rp 264.444 -> Rp 330.555) and keeps Issue Material button ACTIVE', async () => {
    setupMock({ masterCostPrice: 330555 });
    render(<GoodsIssueForm />);

    await selectSpkAndMaterial();

    const qtyInput = screen.getByPlaceholderText(/Enter quantity/i);
    fireEvent.change(qtyInput, { target: { value: '1' } });

    expect(
      await screen.findByText(/Kuantitas Sesuai Kuota RAB \(1 \/ 1 set\)\. Catatan Audit: Terjadi penyesuaian harga HPP gudang \(\+Rp 66\.111\) dari estimasi awal RAB\./i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/PERINGATAN GATE 2 \(OVER QUOTA KUANTITAS\):/i)).not.toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Issue Material/i });
    expect(submitBtn).toBeEnabled();
  });

  it('Kondisi 2: displays red Gate 2 Over Quota banner and disables submit button when Qty exceeds RAB quota', async () => {
    setupMock({ masterCostPrice: 264444 });
    render(<GoodsIssueForm />);

    await selectSpkAndMaterial();

    const qtyInput = screen.getByPlaceholderText(/Enter quantity/i);
    fireEvent.change(qtyInput, { target: { value: '2' } });

    expect(await screen.findByText(/PERINGATAN GATE 2 \(OVER QUOTA KUANTITAS\):/i)).toBeInTheDocument();
    expect(screen.getByText(/MELEBIHI kuota RAB \(1 set\) sebesar \+1 set/i)).toBeInTheDocument();

    const blockedBtn = screen.getByRole('button', { name: /Blocked: Over Quota Qty/i });
    expect(blockedBtn).toBeDisabled();
  });
});
