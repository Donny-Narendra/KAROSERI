import { describe, it, expect } from 'vitest';
import {
  searchMaterials,
  filterMaterialsByNameOrBarcode,
  findExactBarcodeMatch,
  type SearchableMaterial,
} from '../materialSearch';

describe('Universal materialSearch helper', () => {
  const mockMaterials: SearchableMaterial[] = [
    {
      id: 'mat-1',
      name: 'AKRILIK HEREX 3MM',
      barcode: '899000111',
      unit: 'lembar',
      current_stock: 12,
    },
    {
      id: 'mat-2',
      name: 'PIPA GALVANIS 2 INCH',
      barcode: '899000222',
      unit: 'batang',
      current_stock: 45,
    },
    {
      id: 'mat-3',
      name: 'BAUT ROOFING 5CM',
      barcode: '899000333',
      unit: 'pcs',
      current_stock: 1000,
    },
    {
      id: 'mat-4',
      name: 'CAT PRIMER ANTI KARAT',
      barcode: null,
      unit: 'kaleng',
      current_stock: 5,
    },
    {
      id: 'mat-5',
      name: 'PLAT BESI BAUT ROOFING',
      barcode: '899000444',
      unit: 'lembar',
      current_stock: 8,
    },
  ];

  it('returns up to 50 items when query is empty or blank', () => {
    expect(searchMaterials(mockMaterials, '')).toHaveLength(5);
    expect(searchMaterials(mockMaterials, '   ')).toHaveLength(5);
  });

  it('filters materials by name case-insensitively', () => {
    const results = searchMaterials(mockMaterials, 'galvanis');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('mat-2');
  });

  it('filters materials by barcode case-insensitively', () => {
    const results = searchMaterials(mockMaterials, '899000111');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('AKRILIK HEREX 3MM');
  });

  it('prioritizes exact barcode match at the top', () => {
    const results = searchMaterials(mockMaterials, '899000222');
    expect(results[0].id).toBe('mat-2');
  });

  it('filterMaterialsByNameOrBarcode alias behaves identically', () => {
    const results = filterMaterialsByNameOrBarcode(mockMaterials, 'primer');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('mat-4');
  });

  it('findExactBarcodeMatch returns the exact match or undefined', () => {
    const match = findExactBarcodeMatch(mockMaterials, '899000333');
    expect(match).toBeDefined();
    expect(match?.name).toBe('BAUT ROOFING 5CM');

    const noMatch = findExactBarcodeMatch(mockMaterials, '999999999');
    expect(noMatch).toBeUndefined();

    const emptyMatch = findExactBarcodeMatch(mockMaterials, '');
    expect(emptyMatch).toBeUndefined();
  });
});

