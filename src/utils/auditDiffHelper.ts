export interface DiffItem {
  key: string;
  label: string;
  beforeVal: any;
  afterVal: any;
  formattedBefore: string;
  formattedAfter: string;
  deltaText: string;
  changeType: 'positive' | 'negative' | 'neutral' | 'updated';
  isNumeric: boolean;
}

/**
 * Parsing data mentah yang mungkin berbentuk objek atau JSON string
 */
export function parseAuditJson(raw: any): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object' && raw !== null) return raw;
  return {};
}

/**
 * Pemetaan atribut teknis database ke label yang mudah dipahami manusia
 */
const FIELD_LABELS: Record<string, string> = {
  current_stock: 'Stok Fisik',
  stock: 'Stok Fisik',
  added_quantity: 'Jumlah Ditambahkan',
  quantity: 'Jumlah Ditambahkan / Keluar',
  unit_price: 'Harga Satuan',
  name: 'Nama Material',
  unit: 'Satuan',
  minimum_stock: 'Batas Minimum Stok',
  waste_factor_percentage: 'Faktor Waste (%)',
  is_customer_supplied: 'Pasokan Pelanggan',
  notes: 'Catatan',
  reason: 'Alasan Perubahan',
  material_name: 'Nama Material',
};

export function getFieldLabel(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Format representasi nilai atribut agar informatif (Rp, %, unit, boolean, dll.)
 */
export function formatFieldValue(key: string, value: any, unit?: string): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
  
  if (typeof value === 'number') {
    if (key === 'unit_price') {
      return `Rp ${value.toLocaleString('id-ID')}`;
    }
    if (key === 'waste_factor_percentage') {
      return `${value}%`;
    }
    if (key.includes('stock') || key.includes('quantity')) {
      return unit ? `${value.toLocaleString('id-ID')} ${unit}` : value.toLocaleString('id-ID');
    }
    return value.toLocaleString('id-ID');
  }

  // Jika string numerik pada unit_price
  if (key === 'unit_price' && !isNaN(Number(value))) {
    return `Rp ${Number(value).toLocaleString('id-ID')}`;
  }

  return String(value);
}

/**
 * Helper komparasi untuk membaca objek JSON before dan after
 * Menghasilkan daftar diff perubahan parameter, label manusiawi, nilai sebelum, sesudah, dan selisih
 */
export function renderAuditChanges(
  beforeRaw: any,
  afterRaw: any,
  unit?: string
): DiffItem[] {
  const before = parseAuditJson(beforeRaw);
  const after = parseAuditJson(afterRaw);

  const ignoredKeys = new Set(['id', 'material_id', 'created_at', 'updated_at']);

  const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
    .filter(k => !ignoredKeys.has(k));

  if (allKeys.length === 0) return [];

  const results: DiffItem[] = [];

  for (const key of allKeys) {
    const bVal = before[key];
    const aVal = after[key];

    const hasBefore = bVal !== undefined && bVal !== null && bVal !== '';
    const hasAfter = aVal !== undefined && aVal !== null && aVal !== '';

    // Cek apakah berupa nilai numerik
    const isNumeric =
      (!hasBefore || typeof bVal === 'number' || (!isNaN(Number(bVal)) && bVal !== '')) &&
      (!hasAfter || typeof aVal === 'number' || (!isNaN(Number(aVal)) && aVal !== '')) &&
      (typeof bVal === 'number' || typeof aVal === 'number' || key.includes('stock') || key.includes('price') || key.includes('quantity'));

    let deltaText = 'Tetap';
    let changeType: 'positive' | 'negative' | 'neutral' | 'updated' = 'neutral';

    if (isNumeric) {
      const bNum = hasBefore ? Number(bVal) : 0;
      const aNum = hasAfter ? Number(aVal) : 0;
      const diff = aNum - bNum;

      const unitSuffix = unit && (key.includes('stock') || key.includes('quantity')) ? ` ${unit}` : '';

      if (!hasBefore && hasAfter) {
        deltaText = `+${aNum.toLocaleString('id-ID')}${unitSuffix} (Data Awal)`;
        changeType = 'positive';
      } else if (hasBefore && !hasAfter) {
        deltaText = `-${bNum.toLocaleString('id-ID')}${unitSuffix} (Dihapus)`;
        changeType = 'negative';
      } else if (diff > 0) {
        if (key === 'unit_price') {
          deltaText = `+Rp ${diff.toLocaleString('id-ID')}`;
        } else {
          deltaText = `+${diff.toLocaleString('id-ID')}${unitSuffix}`;
        }
        changeType = 'positive';
      } else if (diff < 0) {
        if (key === 'unit_price') {
          deltaText = `-Rp ${Math.abs(diff).toLocaleString('id-ID')}`;
        } else {
          deltaText = `${diff.toLocaleString('id-ID')}${unitSuffix}`;
        }
        changeType = 'negative';
      } else {
        deltaText = 'Tetap (0)';
        changeType = 'neutral';
      }
    } else {
      if (!hasBefore && hasAfter) {
        deltaText = 'Data Baru';
        changeType = 'positive';
      } else if (hasBefore && !hasAfter) {
        deltaText = 'Dihapus';
        changeType = 'negative';
      } else if (String(bVal) !== String(aVal)) {
        deltaText = 'Diperbarui';
        changeType = 'updated';
      } else {
        deltaText = 'Tetap';
        changeType = 'neutral';
      }
    }

    results.push({
      key,
      label: getFieldLabel(key),
      beforeVal: bVal,
      afterVal: aVal,
      formattedBefore: formatFieldValue(key, bVal, unit),
      formattedAfter: formatFieldValue(key, aVal, unit),
      deltaText,
      changeType,
      isNumeric,
    });
  }

  // Urutkan parameter: yang berubah di atas, yang tetap di bawah
  return results.sort((a, b) => {
    const aChanged = a.changeType !== 'neutral';
    const bChanged = b.changeType !== 'neutral';
    if (aChanged && !bChanged) return -1;
    if (!aChanged && bChanged) return 1;
    return 0;
  });
}
