import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Factory, ShieldCheck, TerminalSquare, Badge, Key } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="w-full min-h-screen bg-surface flex flex-col font-sans">
      <div className="w-full min-h-screen flex flex-col lg:flex-row bg-surface">
        {/* LEFT PANEL */}
        <section className="relative w-full lg:w-[52%] bg-surface-container-lowest text-text flex flex-col justify-between p-6 sm:p-10 lg:p-14 overflow-hidden shadow-2xl">
          <div className="relative z-10 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-surface-container-high rounded flex items-center justify-center p-1 shadow-md">
                  <Factory className="text-primary w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-2xl tracking-tight text-text">RobelKaroseri</span>
                    <span className="bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">ERP</span>
                  </div>
                  <p className="text-xs text-text-muted uppercase tracking-widest font-mono">Heavy Fabrication OS</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span className="text-xs text-text-muted font-medium tracking-wide">TIER-1 COMMERCIAL VEHICLE ERP</span>
              </div>
            </div>
            
            <div className="space-y-3 pt-4">
              <div className="inline-flex items-center gap-2 bg-surface-container-high text-primary text-xs px-2.5 py-1 rounded font-mono">
                <TerminalSquare className="w-4 h-4" />
                <span>SYSTEM_RELEASE // v4.8.2-PROD</span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-display font-bold text-text tracking-tight leading-tight">
                Job-Order & WBS <br className="hidden sm:inline"/>
                <span className="text-primary">Production Control</span>
              </h1>
              <p className="text-text-muted max-w-xl leading-relaxed">
                Unified engineering, shopfloor scheduling, and component inventory tracking engineered specifically for commercial bodybuilders & heavy chassis modification.
              </p>
            </div>
          </div>
        </section>

        {/* RIGHT PANEL */}
        <section className="w-full lg:w-[48%] bg-surface flex items-center justify-center p-6 sm:p-12 lg:p-16 relative">
          <div className="w-full max-w-lg bg-surface-container p-6 sm:p-10 rounded-lg shadow-xl relative z-10 border border-border">
            <div className="flex items-center justify-between mb-6">
              <div className="inline-flex items-center gap-2 bg-surface-container-high px-3 py-1 rounded">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                <span className="text-xs font-mono uppercase tracking-wider text-primary font-semibold">SECURE WORKSHOP GATEWAY</span>
              </div>
              <span className="text-xs font-mono text-text-muted">NODE: ID-CKR-01</span>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-display font-bold text-text tracking-tight">Welcome Back</h2>
              <p className="text-sm text-text-muted mt-1.5">
                Sign in with your workshop credentials to access your designated terminal.
              </p>
            </div>

            {error && (
              <div className="mb-4 bg-status-danger/10 border border-status-danger/30 text-status-danger text-sm p-3 rounded">
                {error}
              </div>
            )}

            <form className="space-y-5" onSubmit={handleLogin}>
              <div className="space-y-1.5">
                <label className="flex items-center justify-between text-sm font-medium text-text">
                  <span>Work ID / Email <span className="text-primary">*</span></span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-text-muted flex items-center pointer-events-none">
                    <Badge className="w-5 h-5" />
                  </div>
                  <input 
                    type="email" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-background border border-border text-text text-sm pl-11 pr-4 py-3 rounded outline-none focus:border-primary transition" 
                    placeholder="e.g. employee@karoseri.local" 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center justify-between text-sm font-medium text-text">
                  <span>Master Password <span className="text-primary">*</span></span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-text-muted flex items-center pointer-events-none">
                    <Key className="w-5 h-5" />
                  </div>
                  <input 
                    type="password" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-background border border-border text-text text-sm pl-11 pr-11 py-3 rounded outline-none focus:border-primary transition" 
                    placeholder="Enter workstation access key" 
                  />
                </div>
              </div>

              <div className="pt-3">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary-hover text-white font-mono text-sm py-3.5 px-4 rounded font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition transform active:scale-[0.99] disabled:opacity-50"
                >
                  {loading ? 'Authenticating...' : 'Sign In to Terminal'}
                </button>
              </div>
            </form>

            <div className="mt-8 pt-5 border-t border-border space-y-3">
              <div className="flex items-start gap-2.5 text-text-muted">
                <ShieldCheck className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed">
                  Protected by Role-Based Access Control (RBAC) & Immutable Audit Logging. ISO/IEC 27001 Certified. Unauthorized access is logged with plant terminal telemetry.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};
