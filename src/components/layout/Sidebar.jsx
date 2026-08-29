import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Receipt, Users, Package,
  Truck, BarChart3, Settings, ChevronLeft, ChevronRight,
  AlertTriangle, RotateCcw, DollarSign, FileText, UserCog,
  Bell, Warehouse, Clock, TrendingUp, ShoppingBag, CreditCard,
  Layers, ChevronDown, ChevronUp, Store
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';

const NavSection = ({ label, children }) => (
  <div className="mb-1">
    <p className="sidebar-section">{label}</p>
    {children}
  </div>
);

const NavItem = ({ to, icon: Icon, label, collapsed }) => (
  <NavLink
    to={to}
    className={({ isActive }) => clsx('sidebar-link', isActive && 'active')}
    title={collapsed ? label : undefined}
  >
    <Icon size={18} className="shrink-0" />
    {!collapsed && <span className="truncate">{label}</span>}
  </NavLink>
);

export default function Sidebar({ collapsed, onToggle }) {
  const { isAdmin, isManager } = useAuth();

  return (
    <aside className={clsx(
      'flex flex-col h-screen bg-sidebar-bg border-r border-gray-800 transition-all duration-300 shrink-0',
      collapsed ? 'w-16' : 'w-60'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
        <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center shrink-0">
          <Store size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-white font-bold text-sm leading-tight truncate">New Kolambu</p>
            <p className="text-gray-400 text-xs truncate">Stores</p>
          </div>
        )}
        <button
          onClick={onToggle}
          className="ml-auto text-gray-400 hover:text-white transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 scrollbar-hide">
        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" collapsed={collapsed} />

        <NavSection label={collapsed ? '' : 'Sales'}>
          <NavItem to="/pos" icon={ShoppingCart} label="POS Billing" collapsed={collapsed} />
          <NavItem to="/sales" icon={Receipt} label="Sales" collapsed={collapsed} />
          <NavItem to="/sales-returns" icon={RotateCcw} label="Returns" collapsed={collapsed} />
          <NavItem to="/customers" icon={Users} label="Customers" collapsed={collapsed} />
        </NavSection>

        <NavSection label={collapsed ? '' : 'Purchase'}>
          <NavItem to="/purchases" icon={Truck} label="Purchases" collapsed={collapsed} />
          <NavItem to="/suppliers" icon={ShoppingBag} label="Suppliers" collapsed={collapsed} />
        </NavSection>

        <NavSection label={collapsed ? '' : 'Inventory'}>
          <NavItem to="/products" icon={Package} label="Products" collapsed={collapsed} />
          <NavItem to="/inventory" icon={Warehouse} label="Stock" collapsed={collapsed} />
          <NavItem to="/batches" icon={Layers} label="Batches" collapsed={collapsed} />
          <NavItem to="/expiry" icon={Clock} label="Expiry" collapsed={collapsed} />
        </NavSection>

        <NavSection label={collapsed ? '' : 'Finance'}>
          <NavItem to="/expenses" icon={CreditCard} label="Expenses" collapsed={collapsed} />
        </NavSection>

        <NavSection label={collapsed ? '' : 'Reports'}>
          <NavItem to="/reports" icon={BarChart3} label="Analytics" collapsed={collapsed} />
        </NavSection>

        <NavSection label={collapsed ? '' : 'Orders'}>
          <NavItem to="/orders" icon={FileText} label="Orders & Cart" collapsed={collapsed} />
        </NavSection>

        {(isAdmin() || isManager()) && (
          <NavSection label={collapsed ? '' : 'Admin'}>
            {isAdmin() && <NavItem to="/users" icon={UserCog} label="Users" collapsed={collapsed} />}
            <NavItem to="/audit-logs" icon={TrendingUp} label="Audit Logs" collapsed={collapsed} />
            <NavItem to="/settings" icon={Settings} label="Settings" collapsed={collapsed} />
          </NavSection>
        )}
      </nav>
    </aside>
  );
}
