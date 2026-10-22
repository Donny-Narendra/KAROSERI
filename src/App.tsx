import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { GuestRoute } from './components/GuestRoute';
import { LoginPage } from './pages/LoginPage';
import { useIdleTimer } from './hooks/useIdleTimer';

// Lazy-loaded route pages for optimized code splitting
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const AdminSettingsPage = lazy(() => import('./pages/AdminSettingsPage').then(m => ({ default: m.AdminSettingsPage })));
const ServiceAdvisorDashboard = lazy(() => import('./pages/ServiceAdvisorDashboard').then(m => ({ default: m.ServiceAdvisorDashboard })));
const WarehouseDashboard = lazy(() => import('./pages/WarehouseDashboard').then(m => ({ default: m.WarehouseDashboard })));
const MandorDashboard = lazy(() => import('./pages/MandorDashboard').then(m => ({ default: m.MandorDashboard })));
const KasirDashboard = lazy(() => import('./pages/KasirDashboard').then(m => ({ default: m.KasirDashboard })));
const PublicProgressTracking = lazy(() => import('./pages/PublicProgressTracking').then(m => ({ default: m.PublicProgressTracking })));
const FinancialReportsPage = lazy(() => import('./pages/FinancialReportsPage').then(m => ({ default: m.FinancialReportsPage })));
const GeneralLedgerPage = lazy(() => import('./pages/GeneralLedgerPage').then(m => ({ default: m.GeneralLedgerPage })));

const PageLoadingFallback: React.FC = () => (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
    <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
    <p className="text-xs font-mono text-text-muted uppercase tracking-wider">Memuat Terminal...</p>
  </div>
);

const RootRedirect: React.FC = () => {
  const { user, profile, loading } = useAuth();
  
  if (loading) return null;
  
  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }
  
  // Route based on role
  if (profile.role === 'owner') {
    return <Navigate to="/dashboard" replace />;
  }
  
  if (profile.role === 'service_advisor') {
    return <Navigate to="/service-advisor" replace />;
  }
  
  if (profile.role === 'petugas_gudang') {
    return <Navigate to="/warehouse" replace />;
  }
  
  if (profile.role === 'mandor') {
    return <Navigate to="/mandor" replace />;
  }
  
  if (profile.role === 'kasir') {
    return <Navigate to="/kasir" replace />;
  }
  
  // Default for others for now
  return <Navigate to="/dashboard" replace />;
};

const UnauthorizedPage: React.FC = () => (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
    <h1 className="text-4xl font-display font-bold text-status-danger mb-4">ACCESS DENIED</h1>
    <p className="text-text-muted mb-8 max-w-md">Your current role does not have the required clearance to access this terminal.</p>
    <a href="/" className="text-secondary hover:underline">Return to Home</a>
  </div>
);

const IdleTimeoutManager: React.FC = () => {
  useIdleTimer();
  return null;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <IdleTimeoutManager />
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route element={<GuestRoute />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>
            <Route path="/tracking/:spk_no" element={<PublicProgressTracking />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            
            {/* Protected Routes for Owner */}
            <Route element={<ProtectedRoute allowedRoles={['owner']} />}>
              <Route path="/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
            </Route>
            
            {/* Protected Routes for Service Advisor & Owner */}
            <Route element={<ProtectedRoute allowedRoles={['service_advisor', 'owner']} />}>
              <Route path="/service-advisor" element={<ServiceAdvisorDashboard />} />
            </Route>
            
            {/* Protected Routes for Warehouse (Petugas Gudang) & Owner */}
            <Route element={<ProtectedRoute allowedRoles={['petugas_gudang', 'owner']} />}>
              <Route path="/warehouse" element={<WarehouseDashboard />} />
            </Route>
            
            {/* Protected Routes for Mandor & Owner */}
            <Route element={<ProtectedRoute allowedRoles={['mandor', 'owner']} />}>
              <Route path="/mandor" element={<MandorDashboard />} />
            </Route>
            
            {/* Protected Routes for Kasir, Service Advisor & Owner */}
            <Route element={<ProtectedRoute allowedRoles={['kasir', 'owner', 'service_advisor']} />}>
              <Route path="/kasir" element={<KasirDashboard />} />
            </Route>
            
            {/* Protected Routes for Financial Reports (Owner & Kasir) */}
            <Route element={<ProtectedRoute allowedRoles={['owner', 'kasir']} />}>
              <Route path="/finance-reports" element={<FinancialReportsPage />} />
              <Route path="/buku-besar" element={<GeneralLedgerPage />} />
              <Route path="/ledger" element={<Navigate to="/buku-besar" replace />} />
            </Route>
            
            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
