import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageSwitcher } from '../LanguageSwitcher';
import i18n from '../../i18n';

describe('Component: LanguageSwitcher', () => {
  beforeEach(async () => {
    // Reset language to Indonesian before each test
    await i18n.changeLanguage('id');
  });

  it('renders language switcher in default pill mode with ID and EN buttons', () => {
    render(<LanguageSwitcher />);

    const switcher = screen.getByTestId('lang-switcher');
    expect(switcher).toBeInTheDocument();

    const idBtn = screen.getByTestId('lang-btn-id');
    const enBtn = screen.getByTestId('lang-btn-en');

    expect(idBtn).toBeInTheDocument();
    expect(enBtn).toBeInTheDocument();
    expect(idBtn).toHaveAttribute('aria-pressed', 'true');
    expect(enBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches language to English when EN button is clicked', async () => {
    render(<LanguageSwitcher />);

    const enBtn = screen.getByTestId('lang-btn-en');
    fireEvent.click(enBtn);

    expect(i18n.language.startsWith('en')).toBe(true);
    expect(enBtn).toHaveAttribute('aria-pressed', 'true');

    // Verify key translation resolves to English
    expect(i18n.t('common.save')).toBe('Save');
    expect(i18n.t('auth.submit_button')).toBe('Authenticate & Enter');
    expect(i18n.t('admin.cancellations_tab')).toBe('Cancellation Audits');
  });

  it('switches language back to Indonesian when ID button is clicked', async () => {
    await i18n.changeLanguage('en');
    render(<LanguageSwitcher />);

    const idBtn = screen.getByTestId('lang-btn-id');
    fireEvent.click(idBtn);

    expect(i18n.language.startsWith('id')).toBe(true);
    expect(idBtn).toHaveAttribute('aria-pressed', 'true');

    // Verify key translation resolves to Indonesian
    expect(i18n.t('common.save')).toBe('Simpan');
    expect(i18n.t('auth.submit_button')).toBe('Masuk ke Terminal');
    expect(i18n.t('admin.cancellations_tab')).toBe('Audit Pembatalan');
  });

  it('renders dropdown variant and changes language on selection', async () => {
    render(<LanguageSwitcher variant="dropdown" />);

    const select = screen.getByTestId('lang-select') as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe('id');

    fireEvent.change(select, { target: { value: 'en' } });
    expect(i18n.language.startsWith('en')).toBe(true);
    expect(i18n.t('common.delete')).toBe('Delete');

    fireEvent.change(select, { target: { value: 'id' } });
    expect(i18n.language.startsWith('id')).toBe(true);
    expect(i18n.t('common.delete')).toBe('Hapus');
  });

  it('maintains symmetric key catalogs between ID and EN', () => {
    const idKeys = [
      'common.save',
      'common.cancel',
      'roles.mandor',
      'auth.brand_name',
      'auth.submit_button',
      'admin.cancellations_tab',
      'admin.bom_tab',
      'cancellations.title',
      'spk.status',
      'wbs.checklist_title',
      'warehouse.title',
      'cashier.title',
      'finance.title',
      'finance.gross_profit'
    ];

    for (const key of idKeys) {
      i18n.changeLanguage('id');
      const idVal = i18n.t(key);
      expect(idVal).not.toBe(key); // Must not return fallback missing key

      i18n.changeLanguage('en');
      const enVal = i18n.t(key);
      expect(enVal).not.toBe(key); // Must not return fallback missing key
      expect(enVal).toBeTruthy();
    }
  });
});
