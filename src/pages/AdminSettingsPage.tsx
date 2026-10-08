import React, { useState, useEffect } from 'react';

import { 
  Settings, Users, Plus, Edit2, KeyRound, 
  Save, Globe, DollarSign, Calculator, Factory, Percent, ArrowLeft, Database 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BackupRestoreCard } from '../components/BackupRestoreCard';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from 'react-i18next';

export const AdminSettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'workshop' | 'database'>('users');
  const [users, setUsers] = useState<any[]>([]);

  // Form State for New User
  const [newUser, setNewUser] = useState({ full_name: '', email: '', password: '', role: 'service_advisor', quick_pin: '' });

  // Form State for Settings
  const [settings, setSettings] = useState({
    currency: 'IDR - Rp',
    rounding_precision: 'no_decimal',
    default_language: 'id',
    bay_hourly_rate: 150000,
    default_waste_factor: 5,
  });

  useEffect(() => {
    fetchUsers();
    fetchSettings();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data);
    if (error) console.error('Error fetching users:', error);
  };

  const fetchSettings = async () => {
    const { data, error } = await supabase.from('workshop_settings').select('*').eq('id', 1).single();
    if (data) {
      setSettings(data);
      if (data.default_language) {
        i18n.changeLanguage(data.default_language);
      }
    }
    if (error) console.error('Error fetching settings:', error);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    alert('Catatan: Pembuatan user via auth.signUp pada sisi klien mungkin memerlukan konfirmasi email sesuai konfigurasi Supabase.');
    const { data, error } = await supabase.auth.signUp({
      email: newUser.email,
      password: newUser.password,
      options: {
        data: {
          full_name: newUser.full_name,
          role: newUser.role,
        }
      }
    });

    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      if (newUser.quick_pin && data.user?.id) {
        // Option to update quick pin if successfully created
        await supabase.from('profiles').update({ quick_pin: newUser.quick_pin }).eq('id', data.user.id);
      }
      alert('Berhasil mencoba registrasi user!');
      setNewUser({ full_name: '', email: '', password: '', role: 'service_advisor', quick_pin: '' });
      fetchUsers();
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('workshop_settings').update({
      currency: settings.currency,
      rounding_precision: settings.rounding_precision,
      default_language: settings.default_language,
      bay_hourly_rate: settings.bay_hourly_rate,
      default_waste_factor: settings.default_waste_factor
    }).eq('id', 1);

    if (error) {
      alert(`Gagal menyimpan: ${error.message}`);
    } else {
      alert('Pengaturan bengkel berhasil disimpan ke database (public.workshop_settings).');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-surface border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="text-text-muted hover:text-text transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Settings className="text-primary w-5 h-5" />
            <h1 className="font-display font-bold text-xl text-text">{t('admin.title')}</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-8 flex flex-col max-w-7xl mx-auto w-full">
        {/* Tabs */}
        <div className="flex gap-4 border-b border-border mb-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <Users className="w-4 h-4" /> {t('settings.user_management')}
          </button>
          <button
            onClick={() => setActiveTab('workshop')}
            className={`px-4 py-2 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'workshop' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <Factory className="w-4 h-4" /> {t('settings.workshop_config')}
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`px-4 py-2 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'database' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <Database className="w-4 h-4" /> Manajemen Data
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-surface border border-border rounded-lg p-5">
                <h3 className="font-bold text-text mb-4 font-display flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" /> {t('settings.user_list')}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-text">
                    <thead className="bg-background text-text-muted font-mono text-xs uppercase border-b border-border">
                      <tr>
                        <th className="px-4 py-3">{t('settings.name')}</th>
                        <th className="px-4 py-3">{t('settings.email')}</th>
                        <th className="px-4 py-3">{t('settings.role')}</th>
                        <th className="px-4 py-3">{t('settings.quick_pin')}</th>
                        <th className="px-4 py-3">{t('settings.action')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-surface-hover/50">
                          <td className="px-4 py-3 font-medium">{u.full_name}</td>
                          <td className="px-4 py-3 text-text-muted">{u.email}</td>
                          <td className="px-4 py-3">
                            <span className="bg-surface-active px-2 py-1 rounded text-xs font-mono">{u.role}</span>
                          </td>
                          <td className="px-4 py-3 font-mono">{u.quick_pin ? '***' : '-'}</td>
                          <td className="px-4 py-3 flex gap-2">
                            <button className="text-secondary hover:text-primary" title="Edit Role"><Edit2 className="w-4 h-4" /></button>
                            <button className="text-status-warning hover:text-status-danger" title="Reset PIN"><KeyRound className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Form Tambah Pengguna */}
            <div className="space-y-4">
              <div className="bg-surface border border-border rounded-lg p-5">
                <h3 className="font-bold text-text mb-4 font-display flex items-center gap-2">
                  <Plus className="w-5 h-5 text-secondary" /> {t('settings.add_user')}
                </h3>
                <form onSubmit={handleAddUser} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-text-muted mb-1">{t('settings.full_name')}</label>
                    <input 
                      type="text" 
                      required
                      value={newUser.full_name}
                      onChange={e => setNewUser({...newUser, full_name: e.target.value})}
                      className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-text-muted mb-1">{t('settings.email')}</label>
                    <input 
                      type="email" 
                      required
                      value={newUser.email}
                      onChange={e => setNewUser({...newUser, email: e.target.value})}
                      className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-text-muted mb-1">{t('settings.password')}</label>
                    <input 
                      type="password" 
                      required
                      value={newUser.password}
                      onChange={e => setNewUser({...newUser, password: e.target.value})}
                      className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-text-muted mb-1">{t('settings.role')}</label>
                    <select 
                      value={newUser.role}
                      onChange={e => setNewUser({...newUser, role: e.target.value})}
                      className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                    >
                      <option value="service_advisor">Service Advisor</option>
                      <option value="mandor">Mandor</option>
                      <option value="petugas_gudang">Petugas Gudang</option>
                      <option value="kasir">Kasir</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-text-muted mb-1">{t('settings.quick_pin')} (Opsional)</label>
                    <input 
                      type="text" 
                      maxLength={6}
                      value={newUser.quick_pin}
                      onChange={e => setNewUser({...newUser, quick_pin: e.target.value})}
                      placeholder="6-digit PIN"
                      className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none" 
                    />
                  </div>
                  <button type="submit" className="w-full bg-primary text-background font-bold py-2 rounded mt-2 hover:bg-secondary transition flex justify-center items-center gap-2">
                    <Plus className="w-4 h-4" /> {t('settings.create_account')}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'workshop' && (
          <div className="bg-surface border border-border rounded-lg p-6 max-w-3xl">
            <h3 className="font-bold text-text mb-6 font-display flex items-center gap-2 text-xl">
              <Factory className="w-6 h-6 text-primary" /> Master Parameter Operasional & Finansial
            </h3>
            
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Financial Settings */}
                <div className="space-y-4">
                  <h4 className="text-sm font-mono text-secondary border-b border-border pb-1">{t('settings.financial')}</h4>
                  <div>
                    <label className="block text-xs font-mono text-text-muted mb-1 flex items-center gap-1">
                      <DollarSign className="w-3 h-3"/> {t('settings.currency')}
                    </label>
                    <select 
                      value={settings.currency}
                      onChange={e => setSettings({...settings, currency: e.target.value})}
                      className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                    >
                      <option value="IDR - Rp">IDR - Rp</option>
                      <option value="USD - $">USD - $</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-text-muted mb-1 flex items-center gap-1">
                      <Calculator className="w-3 h-3"/> {t('settings.rounding')}
                    </label>
                    <select 
                      value={settings.rounding_precision}
                      onChange={e => setSettings({...settings, rounding_precision: e.target.value})}
                      className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                    >
                      <option value="no_decimal">{t('settings.no_decimal')}</option>
                      <option value="hundreds">{t('settings.hundreds')}</option>
                      <option value="thousands">{t('settings.thousands')}</option>
                    </select>
                  </div>
                </div>

                {/* Operational Settings */}
                <div className="space-y-4">
                  <h4 className="text-sm font-mono text-secondary border-b border-border pb-1">{t('settings.operational')}</h4>
                  <div>
                    <label className="block text-xs font-mono text-text-muted mb-1 flex items-center gap-1">
                      <Factory className="w-3 h-3"/> {t('settings.bay_rate')}
                    </label>
                    <input 
                      type="number" 
                      value={settings.bay_hourly_rate}
                      onChange={e => setSettings({...settings, bay_hourly_rate: Number(e.target.value)})}
                      className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-text-muted mb-1 flex items-center gap-1">
                      <Percent className="w-3 h-3"/> {t('settings.waste_factor')}
                    </label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={settings.default_waste_factor}
                      onChange={e => setSettings({...settings, default_waste_factor: Number(e.target.value)})}
                      className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none" 
                    />
                  </div>
                </div>

                {/* System Preferences */}
                <div className="space-y-4 md:col-span-2">
                  <h4 className="text-sm font-mono text-secondary border-b border-border pb-1">{t('settings.system_pref')}</h4>
                  <div>
                    <label className="block text-xs font-mono text-text-muted mb-1 flex items-center gap-1">
                      <Globe className="w-3 h-3"/> {t('settings.language')}
                    </label>
                    <select 
                      value={settings.default_language}
                      onChange={e => {
                        setSettings({...settings, default_language: e.target.value});
                        i18n.changeLanguage(e.target.value);
                      }}
                      className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none max-w-sm"
                    >
                      <option value="id">Bahasa Indonesia</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>

              </div>

              <div className="pt-4 border-t border-border flex justify-end">
                <button type="submit" className="bg-primary text-background font-bold py-2 px-6 rounded hover:bg-secondary transition flex justify-center items-center gap-2">
                  <Save className="w-4 h-4" /> {t('settings.save_config')}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'database' && (
          <div className="max-w-4xl">
            <BackupRestoreCard />
          </div>
        )}
      </main>
    </div>
  );
};
