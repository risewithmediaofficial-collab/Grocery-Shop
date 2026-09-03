import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Receipt, Users, Package,
  Truck, BarChart3, Settings, ChevronLeft, ChevronRight,
  RotateCcw, FileText, UserCog,
  Warehouse, Clock, TrendingUp, ShoppingBag, CreditCard,
  Layers, Store, X, Menu, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';

const NavSection = ({ label, children }) => (
  <div className="mb-1">
    {label && <p className="sidebar-section">{label}</p>}
    {children}
  </div>
);

const NavItem = ({ to, icon: Icon, label, collapsed, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) => clsx('sidebar-link', isActive && 'active')}
    title={collapsed ? label : undefined}
  >
    <Icon size={18} className="shrink-0" />
    {!collapsed && <span className="truncate">{label}</span>}
  </NavLink>
);

export default function Sidebar({ collapsed, onToggle, mobileOpen, onCloseMobile }) {
  const { isAdmin, isManager } = useAuth();

  const renderNavLinks = (isMobile = false) => (
    <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 sidebar-scrollbar">
      <NavItem
        to="/dashboard"
        icon={LayoutDashboard}
        label="Dashboard"
        collapsed={!isMobile && collapsed}
        onClick={isMobile ? onCloseMobile : undefined}
      />

      <NavSection label={(!isMobile && collapsed) ? '' : 'Sales'}>
        <NavItem
          to="/pos"
          icon={ShoppingCart}
          label="POS Billing"
          collapsed={!isMobile && collapsed}
          onClick={isMobile ? onCloseMobile : undefined}
        />
        <NavItem
          to="/sales"
          icon={Receipt}
          label="Sales"
          collapsed={!isMobile && collapsed}
          onClick={isMobile ? onCloseMobile : undefined}
        />
        <NavItem
          to="/sales-returns"
          icon={RotateCcw}
          label="Returns"
          collapsed={!isMobile && collapsed}
          onClick={isMobile ? onCloseMobile : undefined}
        />
        <NavItem
          to="/customers"
          icon={Users}
          label="Customers"
          collapsed={!isMobile && collapsed}
          onClick={isMobile ? onCloseMobile : undefined}
        />
      </NavSection>

      <NavSection label={(!isMobile && collapsed) ? '' : 'Purchase'}>
        <NavItem
          to="/purchases"
          icon={Truck}
          label="Purchases"
          collapsed={!isMobile && collapsed}
          onClick={isMobile ? onCloseMobile : undefined}
        />
        <NavItem
          to="/suppliers"
          icon={ShoppingBag}
          label="Suppliers"
          collapsed={!isMobile && collapsed}
          onClick={isMobile ? onCloseMobile : undefined}
        />
      </NavSection>

      <NavSection label={(!isMobile && collapsed) ? '' : 'Inventory'}>
        <NavItem
          to="/products"
          icon={Package}
          label="Products"
          collapsed={!isMobile && collapsed}
          onClick={isMobile ? onCloseMobile : undefined}
        />
        <NavItem
          to="/inventory"
          icon={Warehouse}
          label="Stock"
          collapsed={!isMobile && collapsed}
          onClick={isMobile ? onCloseMobile : undefined}
        />
        <NavItem
          to="/batches"
          icon={Layers}
          label="Batches"
          collapsed={!isMobile && collapsed}
          onClick={isMobile ? onCloseMobile : undefined}
        />
        <NavItem
          to="/expiry"
          icon={Clock}
          label="Expiry"
          collapsed={!isMobile && collapsed}
          onClick={isMobile ? onCloseMobile : undefined}
        />
      </NavSection>

      <NavSection label={(!isMobile && collapsed) ? '' : 'Finance'}>
        <NavItem
          to="/expenses"
          icon={CreditCard}
          label="Expenses"
          collapsed={!isMobile && collapsed}
          onClick={isMobile ? onCloseMobile : undefined}
        />
      </NavSection>

      <NavSection label={(!isMobile && collapsed) ? '' : 'Reports'}>
        <NavItem
          to="/reports"
          icon={BarChart3}
          label="Analytics"
          collapsed={!isMobile && collapsed}
          onClick={isMobile ? onCloseMobile : undefined}
        />
      </NavSection>

      <NavSection label={(!isMobile && collapsed) ? '' : 'Orders'}>
        <NavItem
          to="/orders"
          icon={FileText}
          label="Orders & Cart"
          collapsed={!isMobile && collapsed}
          onClick={isMobile ? onCloseMobile : undefined}
        />
      </NavSection>

      {(isAdmin() || isManager()) && (
        <NavSection label={(!isMobile && collapsed) ? '' : 'Admin'}>
          {isAdmin() && (
            <NavItem
              to="/users"
              icon={UserCog}
              label="Users"
              collapsed={!isMobile && collapsed}
              onClick={isMobile ? onCloseMobile : undefined}
            />
          )}
          <NavItem
            to="/audit-logs"
            icon={TrendingUp}
            label="Audit Logs"
            collapsed={!isMobile && collapsed}
            onClick={isMobile ? onCloseMobile : undefined}
          />
          <NavItem
            to="/settings"
            icon={Settings}
            label="Settings"
            collapsed={!isMobile && collapsed}
            onClick={isMobile ? onCloseMobile : undefined}
          />
        </NavSection>
      )}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={clsx(
          'hidden md:flex flex-col h-screen bg-sidebar-bg border-r border-gray-800 transition-all duration-300 shrink-0 select-none',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Logo / Collapse Toggle Header */}
        <div
          className={clsx(
            'flex items-center h-14 border-b border-gray-800 transition-colors',
            collapsed ? 'justify-center px-2 cursor-pointer hover:bg-gray-800/80' : 'justify-between px-4'
          )}
          onClick={collapsed ? onToggle : undefined}
          title={collapsed ? 'Click to expand sidebar' : undefined}
        >
          {collapsed ? (
            <button
              onClick={onToggle}
              className="w-10 h-10 bg-primary-500 hover:bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-sm transition-all group relative cursor-pointer"
              title="Expand Sidebar"
            >
              <Store size={20} className="group-hover:hidden" />
              <ChevronRight size={20} className="hidden group-hover:block" />
            </button>
          ) : (
            <>
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                  <Store size={18} className="text-white" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-white font-bold text-sm leading-tight truncate">New Columbu</p>
                  <p className="text-gray-400 text-xs truncate">Stores</p>
                </div>
              </div>
              <button
                onClick={onToggle}
                className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
                title="Collapse sidebar"
              >
                <ChevronLeft size={18} />
              </button>
            </>
          )}
        </div>

        {/* Navigation */}
        {renderNavLinks(false)}

        {/* Bottom Expand/Collapse Helper Button */}
        <div className="p-2 border-t border-gray-800">
          <button
            onClick={onToggle}
            className={clsx(
              'w-full py-2 flex items-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-xs font-semibold cursor-pointer',
              collapsed ? 'justify-center' : 'justify-between px-3'
            )}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <>
                <span className="flex items-center gap-2">
                  <PanelLeftClose size={16} /> Collapse Sidebar
                </span>
                <span className="text-[10px] text-gray-500 bg-gray-900 px-1.5 py-0.5 rounded">Ctrl+B</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile drawer sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Dark Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={onCloseMobile}
          />

          {/* Slide-over Content */}
          <aside className="relative w-72 max-w-[80vw] bg-sidebar-bg h-full flex flex-col z-10 shadow-2xl animate-in slide-in-from-left duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                  <Store size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm leading-tight">New Columbu</p>
                  <p className="text-gray-400 text-xs">Grocery Management</p>
                </div>
              </div>
              <button
                onClick={onCloseMobile}
                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
                title="Close sidebar"
              >
                <X size={20} />
              </button>
            </div>

            {/* Links */}
            {renderNavLinks(true)}
          </aside>
        </div>
      )}
    </>
  );
}
