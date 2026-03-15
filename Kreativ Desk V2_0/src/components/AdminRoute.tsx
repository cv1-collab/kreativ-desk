import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (currentUser.email?.toLowerCase() !== 'cv1@gmx.ch') {
    return <Navigate to="/app" />;
  }

  return <>{children}</>;
}
