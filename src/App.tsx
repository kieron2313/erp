/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider, useAuth } from './components/AuthProvider.tsx';
import Layout from './components/Layout.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Customers from './pages/Customers.tsx';
import Suppliers from './pages/Suppliers.tsx';
import Products from './pages/Products.tsx';
import Transactions from './pages/Transactions.tsx';
import Reports from './pages/Reports.tsx';
import AccessControl from './pages/AccessControl.tsx';
import Login from './pages/Login.tsx';
import EntityDetails from './pages/EntityDetails.tsx';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="customers" element={<Customers />} />
            <Route path="customers/:id" element={<EntityDetails />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="suppliers/:id" element={<EntityDetails />} />
            <Route path="products" element={<Products />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<AccessControl />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

