import { describe, it, expect } from 'vitest';
import { terbilang } from '../terbilang';

describe('terbilang utility', () => {
  it('handles 0 correctly', () => {
    expect(terbilang(0)).toBe('Nol Rupiah');
  });

  it('handles basic units (satuan)', () => {
    expect(terbilang(1)).toBe('Satu Rupiah');
    expect(terbilang(5)).toBe('Lima Rupiah');
    expect(terbilang(9)).toBe('Sembilan Rupiah');
  });

  it('handles belasan', () => {
    expect(terbilang(10)).toBe('Sepuluh Rupiah');
    expect(terbilang(11)).toBe('Sebelas Rupiah');
    expect(terbilang(15)).toBe('Lima Belas Rupiah');
    expect(terbilang(19)).toBe('Sembilan Belas Rupiah');
  });

  it('handles puluhan and ratusan', () => {
    expect(terbilang(20)).toBe('Dua Puluh Rupiah');
    expect(terbilang(45)).toBe('Empat Puluh Lima Rupiah');
    expect(terbilang(100)).toBe('Seratus Rupiah');
    expect(terbilang(105)).toBe('Seratus Lima Rupiah');
    expect(terbilang(115)).toBe('Seratus Lima Belas Rupiah');
    expect(terbilang(250)).toBe('Dua Ratus Lima Puluh Rupiah');
  });

  it('handles ribuan and jutaan', () => {
    expect(terbilang(1000)).toBe('Seribu Rupiah');
    expect(terbilang(1500)).toBe('Seribu Lima Ratus Rupiah');
    expect(terbilang(25000)).toBe('Dua Puluh Lima Ribu Rupiah');
    expect(terbilang(1000000)).toBe('Satu Juta Rupiah');
    expect(terbilang(15000000)).toBe('Lima Belas Juta Rupiah');
    expect(terbilang(50000000)).toBe('Lima Puluh Juta Rupiah');
    expect(terbilang(125750000)).toBe('Seratus Dua Puluh Lima Juta Tujuh Ratus Lima Puluh Ribu Rupiah');
  });

  it('handles miliaran and triliunan', () => {
    expect(terbilang(1000000000)).toBe('Satu Miliar Rupiah');
    expect(terbilang(2500000000)).toBe('Dua Miliar Lima Ratus Juta Rupiah');
    expect(terbilang(1000000000000)).toBe('Satu Triliun Rupiah');
  });

  it('handles negative numbers', () => {
    expect(terbilang(-500000)).toBe('Minus Lima Ratus Ribu Rupiah');
  });
});
