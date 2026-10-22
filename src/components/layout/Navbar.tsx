import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Factory, TrendingUp, BookOpen, Settings, LogOut } from 'lucide-react';
import { LanguageSwitcher } from '../LanguageSwitcher';

interface NavbarProps {
  title?: string;
  subtitle?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  title = 'RobelKaroseri',
  subtitle,
}) => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  return (
    <header className="bg-surface border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-3">
        <Factory className="text-primary w-6 h-6" />
        <div>
          <h1 className="font-display font-bold text-lg text-text">{title}</h1>
          {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden sm:inline text-xs text-text-muted font-mono">
          {profile?.full_name} ({profile?.role})
        </span>
        <LanguageSwitcher />

        {/* Laporan Keuangan */}
        <button
          onClick={() => navigate('/finance-reports')}
          className="flex items-center gap-1.5 text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg transition font-medium"
          title="Buka Laporan Keuangan"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Laporan Keuangan</span>
        </button>

        {/* Buku Besar & Kas */}
        <button
          onClick={() => navigate('/buku-besar')}
          className="flex items-center gap-1.5 text-xs bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 px-3 py-1.5 rounded-lg transition font-medium"
          title="Buka Buku Besar & Kas (Model T)"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Buku Besar & Kas</span>
        </button>

        {/* Kasir */}
        {(profile?.role === 'owner' || profile?.role === 'kasir') && (
          <button
            onClick={() => navigate('/kasir')}
            className="flex items-center gap-1.5 text-xs bg-surface-hover hover:bg-surface-active px-3 py-1.5 rounded-lg transition text-text"
          >
            Kasir
          </button>
        )}

        {/* Settings for Owner */}
        {profile?.role === 'owner' && (
          <button
            onClick={() => navigate('/admin/settings')}
            className="p-1.5 text-text-muted hover:text-text rounded-lg hover:bg-surface-hover transition"
            title="Pengaturan Sistem"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}

        {/* Logout */}
        <button
          onClick={signOut}
          className="p-1.5 text-text-muted hover:text-status-danger rounded-lg hover:bg-surface-hover transition"
          title="Keluar"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
