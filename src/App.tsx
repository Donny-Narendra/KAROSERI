import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

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

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          
          {/* Protected Routes for Owner */}
          <Route element={<ProtectedRoute allowedRoles={['owner']} />}>
            <Route path="/dashboard" element={<AdminDashboardPage />} />
          </Route>
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
