import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const GuestRoute: React.FC = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary animate-pulse font-mono">LOADING SYSTEM...</div>
      </div>
    );
  }

  // If user is already authenticated, redirect to their respective dashboard
  if (user && profile) {
    switch (profile.role) {
      case 'owner':
        return <Navigate to="/dashboard" replace />;
      case 'service_advisor':
        return <Navigate to="/service-advisor" replace />;
      case 'petugas_gudang':
        return <Navigate to="/warehouse" replace />;
      case 'mandor':
        return <Navigate to="/mandor" replace />;
      case 'kasir':
        return <Navigate to="/kasir" replace />;
      default:
        return <Navigate to="/dashboard" replace />;
    }
  }

  return <Outlet />;
};
