import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import AppLayout from './components/layout/AppLayout';

// Pages
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import POSPage from './pages/pos/POSPage';
import ProductsPage from './pages/products/ProductsPage';
import CustomersPage from './pages/customers/CustomersPage';
import CustomerDetailPage from './pages/customers/CustomerDetailPage';
import SalesPage from './pages/sales/SalesPage';
import SaleDetailPage from './pages/sales/SaleDetailPage';
import SalesReturnsPage from './pages/sales/SalesReturnsPage';
import PurchasesPage from './pages/purchases/PurchasesPage';
import SuppliersPage from './pages/suppliers/SuppliersPage';
import SupplierDetailPage from './pages/suppliers/SupplierDetailPage';
import InventoryPage from './pages/inventory/InventoryPage';
import BatchesPage from './pages/inventory/BatchesPage';
import ExpiryPage from './pages/inventory/ExpiryPage';
import ExpensesPage from './pages/expenses/ExpensesPage';
import ReportsPage from './pages/reports/ReportsPage';
import UsersPage from './pages/users/UsersPage';
import SettingsPage from './pages/settings/SettingsPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import AuditLogPage from './pages/audit/AuditLogPage';

// ORDERS & CUSTOMER ORDERING
import OrdersPage from './pages/orders/OrdersPage';
import CustomerOrderPage from './pages/customer/CustomerOrderPage';

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function RootRedirect() {
  const { user } = useAuth();
  if (user?.role === 'packer') return <Navigate to="/orders" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          {/* Public Customer Grocery Ordering Pages */}
          <Route path="/order" element={<CustomerOrderPage />} />
          <Route path="/customer" element={<CustomerOrderPage />} />
          <Route path="/shop" element={<CustomerOrderPage />} />
          <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
            <Route index element={<RootRedirect />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="pos" element={<POSPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="customers/:id" element={<CustomerDetailPage />} />
            <Route path="sales" element={<SalesPage />} />
            <Route path="sales/:id" element={<SaleDetailPage />} />
            <Route path="sales-returns" element={<SalesReturnsPage />} />
            <Route path="purchases" element={<PurchasesPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="suppliers/:id" element={<SupplierDetailPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="batches" element={<BatchesPage />} />
            <Route path="expiry" element={<ExpiryPage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="users" element={<PrivateRoute roles={['admin']}><UsersPage /></PrivateRoute>} />
            <Route path="audit-logs" element={<PrivateRoute roles={['admin', 'manager']}><AuditLogPage /></PrivateRoute>} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<RootRedirect />} />
          </Route>
        </Routes>
      </CartProvider>
    </AuthProvider>
  );
}
