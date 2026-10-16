import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export interface LanguageSwitcherProps {
  className?: string;
  variant?: 'pill' | 'dropdown';
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
  className = '',
  variant = 'pill'
}) => {
  const { i18n } = useTranslation();
  const activeLang = (i18n.language || 'id').toLowerCase().startsWith('en') ? 'en' : 'id';

  const handleLanguageChange = (lang: 'id' | 'en') => {
    i18n.changeLanguage(lang);
  };

  if (variant === 'dropdown') {
    return (
      <div className={`relative inline-flex items-center gap-1.5 ${className}`} data-testid="lang-switcher">
        <Globe className="w-4 h-4 text-text-muted shrink-0" aria-hidden="true" />
        <select
          value={activeLang}
          onChange={(e) => handleLanguageChange(e.target.value as 'id' | 'en')}
          className="bg-surface border border-border rounded px-2.5 py-1 text-xs text-text font-medium focus:border-primary focus:outline-none transition cursor-pointer"
          aria-label="Select system language"
          data-testid="lang-select"
        >
          <option value="id">Bahasa Indonesia (ID)</option>
          <option value="en">English (EN)</option>
        </select>
      </div>
    );
  }

  return (
    <div 
      className={`inline-flex items-center gap-1 bg-surface-container-high/60 backdrop-blur-xs p-1 rounded-lg border border-border shadow-xs ${className}`}
      data-testid="lang-switcher"
      role="group"
      aria-label="Language selector"
    >
      <Globe className="w-3.5 h-3.5 text-text-muted ml-1 mr-0.5 shrink-0" aria-hidden="true" />
      <button
        type="button"
        onClick={() => handleLanguageChange('id')}
        className={`px-2 py-0.5 rounded text-xs font-mono font-semibold transition ${
          activeLang === 'id'
            ? 'bg-primary text-white shadow-xs'
            : 'text-text-muted hover:text-text hover:bg-surface-hover'
        }`}
        data-testid="lang-btn-id"
        aria-pressed={activeLang === 'id'}
        title="Ganti ke Bahasa Indonesia"
      >
        ID
      </button>
      <span className="text-border text-xs select-none">|</span>
      <button
        type="button"
        onClick={() => handleLanguageChange('en')}
        className={`px-2 py-0.5 rounded text-xs font-mono font-semibold transition ${
          activeLang === 'en'
            ? 'bg-primary text-white shadow-xs'
            : 'text-text-muted hover:text-text hover:bg-surface-hover'
        }`}
        data-testid="lang-btn-en"
        aria-pressed={activeLang === 'en'}
        title="Switch to English"
      >
        EN
      </button>
    </div>
  );
};
