import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpkFilterListBox, type SpkFilterItem } from '../SpkFilterListBox';

describe('Component: SpkFilterListBox', () => {
  const mockItems: SpkFilterItem[] = [
    {
      spkId: 'uuid-1',
      spkNo: 'SPK-2026-001',
      customerName: 'PT Maju Lancar',
      vehiclePlate: 'B 1234 CD',
      subTasks: ['Pemasangan Bak', 'Pengecatan'],
      count: 4,
    },
    {
      spkId: 'uuid-2',
      spkNo: 'SPK-2026-002',
      customerName: 'CV Sumber Rejeki',
      vehiclePlate: 'D 5678 EF',
      subTasks: 'Modifikasi Sasis',
      count: 2,
    },
  ];

  it('renders "Semua SPK" and list of SPKs with customer details and pending badges', () => {
    render(
      <SpkFilterListBox
        items={mockItems}
        totalPendingCount={6}
        selectedSpk="ALL"
        onSelectSpk={vi.fn()}
      />
    );

    expect(screen.getByText('Filter Berdasarkan SPK')).toBeInTheDocument();
    expect(screen.getByText('Semua SPK')).toBeInTheDocument();
    expect(screen.getByText('6 Pending')).toBeInTheDocument();

    expect(screen.getByText('SPK-2026-001')).toBeInTheDocument();
    expect(screen.getByText('PT Maju Lancar')).toBeInTheDocument();
    expect(screen.getByText('B 1234 CD')).toBeInTheDocument();
    expect(screen.getByText(/4 Pending/i)).toBeInTheDocument();

    expect(screen.getByText('SPK-2026-002')).toBeInTheDocument();
    expect(screen.getByText('CV Sumber Rejeki')).toBeInTheDocument();
    expect(screen.getByText('D 5678 EF')).toBeInTheDocument();
  });

  it('calls onSelectSpk with "ALL" when clicking "Semua SPK"', () => {
    const handleSelect = vi.fn();
    render(
      <SpkFilterListBox
        items={mockItems}
        totalPendingCount={6}
        selectedSpk="SPK-2026-001"
        onSelectSpk={handleSelect}
      />
    );

    fireEvent.click(screen.getByText('Semua SPK'));
    expect(handleSelect).toHaveBeenCalledWith('ALL');
  });

  it('calls onSelectSpk with SPK number when clicking a specific SPK item', () => {
    const handleSelect = vi.fn();
    render(
      <SpkFilterListBox
        items={mockItems}
        totalPendingCount={6}
        selectedSpk="ALL"
        onSelectSpk={handleSelect}
      />
    );

    fireEvent.click(screen.getByText('SPK-2026-002'));
    expect(handleSelect).toHaveBeenCalledWith('SPK-2026-002');
  });

  it('filters items in real-time when typing in search box', () => {
    render(
      <SpkFilterListBox
        items={mockItems}
        totalPendingCount={6}
        selectedSpk="ALL"
        onSelectSpk={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Cari SPK, customer, plat, sub-task\.\.\./i);
    fireEvent.change(searchInput, { target: { value: 'Maju' } });

    // SPK-1 should match, SPK-2 should be filtered out
    expect(screen.getByText('SPK-2026-001')).toBeInTheDocument();
    expect(screen.queryByText('SPK-2026-002')).not.toBeInTheDocument();
  });

  it('filters by vehicle plate number', () => {
    render(
      <SpkFilterListBox
        items={mockItems}
        totalPendingCount={6}
        selectedSpk="ALL"
        onSelectSpk={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Cari SPK, customer, plat, sub-task\.\.\./i);
    fireEvent.change(searchInput, { target: { value: '5678' } });

    expect(screen.queryByText('SPK-2026-001')).not.toBeInTheDocument();
    expect(screen.getByText('SPK-2026-002')).toBeInTheDocument();
  });

  it('shows empty state message when search query finds no matches', () => {
    render(
      <SpkFilterListBox
        items={mockItems}
        totalPendingCount={6}
        selectedSpk="ALL"
        onSelectSpk={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Cari SPK, customer, plat, sub-task\.\.\./i);
    fireEvent.change(searchInput, { target: { value: 'NonexistentKeyword123' } });

    expect(screen.getByText(/Tidak ada SPK yang cocok dengan/i)).toBeInTheDocument();
  });
});
