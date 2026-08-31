import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell, LogOut, User, ChevronDown, Settings, X, ArrowRight,
  CheckCheck, Package, AlertTriangle, ShieldAlert, Clock, Info,
  CheckCircle, Trash2, ExternalLink, Menu, Store
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import clsx from 'clsx';

export function getNotificationRoute(n) {
  if (!n) return '/dashboard';

  // 1. By explicit model / type
  if (n.type === 'new_order' || n.relatedModel === 'Order') {
    return '/orders';
  }
  if (n.type === 'low_stock' || n.type === 'out_of_stock' || n.relatedModel === 'Product') {
    return '/products';
  }
  if (n.type === 'expiry_soon' || n.type === 'expired' || n.relatedModel === 'Batch') {
    return '/expiry';
  }
  if (n.type === 'stock_adjustment' || n.relatedModel === 'StockMovement') {
    return '/inventory';
  }
  if (n.type === 'payment_due' || n.relatedModel === 'Customer') {
    return n.relatedId ? `/customers/${n.relatedId}` : '/customers';
  }
  if (n.type === 'supplier_payment_due' || n.relatedModel === 'Supplier') {
    return n.relatedId ? `/suppliers/${n.relatedId}` : '/suppliers';
  }
  if (n.type === 'purchase_received' || n.relatedModel === 'Purchase') {
    return n.relatedId ? `/purchases/${n.relatedId}` : '/purchases';
  }

  // 2. Keyword fallback matching
  const text = `${n.title || ''} ${n.message || ''}`.toLowerCase();
  if (text.includes('order') || text.includes('ord-')) return '/orders';
  if (text.includes('expiry') || text.includes('expire')) return '/expiry';
  if (text.includes('low stock') || text.includes('out of stock')) return '/products';
  if (text.includes('stock') || text.includes('adjustment')) return '/inventory';
  if (text.includes('purchase') || text.includes('supplier')) return '/purchases';
  if (text.includes('customer') || text.includes('credit') || text.includes('udhaar')) return '/customers';
  if (text.includes('sale') || text.includes('invoice') || text.includes('bill')) return '/sales';

  return '/dashboard';
}

export function getNotificationIcon(type, severity) {
  if (type === 'new_order') {
    return (
      <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 shadow-xs">
        <Package size={18} />
      </div>
    );
  }
  if (severity === 'error' || type === 'expired') {
    return (
      <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0 shadow-xs">
        <ShieldAlert size={18} />
      </div>
    );
  }
  if (severity === 'warning' || type === 'low_stock' || type === 'expiry_soon') {
    return (
      <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-xs">
        <AlertTriangle size={18} />
      </div>
    );
  }
  if (severity === 'success') {
    return (
      <div className="w-9 h-9 rounded-xl bg-green-100 text-green-700 flex items-center justify-center shrink-0 shadow-xs">
        <CheckCircle size={18} />
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center shrink-0 shadow-xs">
      <Info size={18} />
    </div>
  );
}

export default function Header({ onMenuToggle, sidebarCollapsed }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const userMenuRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.data || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {}
  };

  // When a notification is clicked: immediately remove from bar & navigate to actual data
  const handleNotificationClick = async (e, n) => {
    e.stopPropagation();

    // 1. Immediately remove from dropdown list (disappear from notification bar)
    setNotifications(prev => prev.filter(item => item._id !== n._id));
    setUnreadCount(prev => Math.max(0, prev - 1));
    setNotifOpen(false);

    // 2. Mark as read on backend
    try {
      await api.put(`/notifications/${n._id}/read`);
    } catch (err) {
      console.error('Error marking notification read', err);
    }

    // 3. Navigate directly to where the data is present
    const targetRoute = getNotificationRoute(n);
    navigate(targetRoute);
  };

  // Dismiss single notification
  const handleDismissNotification = async (e, id) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(item => item._id !== id));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await api.put(`/notifications/${id}/read`);
    } catch {}
  };

  // Mark all as read & clear list in bar
  const handleMarkAllRead = async () => {
    setNotifications([]);
    setUnreadCount(0);
    try {
      await api.put('/notifications/mark-all-read');
    } catch {}
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  // Close menus on outside click
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Filter unread notifications for the dropdown bar
  const unreadNotifications = notifications.filter(n => !n.isRead);

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-4 shrink-0 relative z-30">
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Universal Menu / Hamburger Toggle Button for ALL Screens (Desktop + Mobile) */}
        <button
          onClick={onMenuToggle}
          className="p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
          title={sidebarCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar"}
        >
          <Menu size={20} />
        </button>

        {/* Brand Title (Mobile screen) */}
        <div className="flex items-center gap-2 md:hidden">
          <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs">
            <Store size={15} />
          </div>
          <span className="font-bold text-sm text-gray-900 truncate">New Columbu</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 ml-auto">
        {/* Notifications Dropdown */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className={clsx(
              'relative p-2.5 rounded-xl transition-all cursor-pointer',
              notifOpen
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            )}
            title="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 bg-red-500 text-white text-[11px] font-extrabold rounded-full flex items-center justify-center shadow-xs animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Sizable, Modern Notification Popup Dropdown (440px wide) */}
          {notifOpen && (
            <div className="absolute right-0 top-12 w-96 sm:w-[440px] max-w-[calc(100vw-1.5rem)] bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50/80">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm sm:text-base text-gray-900">Notifications</h3>
                  {unreadCount > 0 ? (
                    <span className="badge-blue text-xs font-bold px-2 py-0.5">
                      {unreadCount} unread
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 font-medium">All caught up</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {unreadNotifications.length > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs font-bold text-primary-700 hover:text-primary-800 hover:underline flex items-center gap-1 cursor-pointer"
                      title="Clear all unread"
                    >
                      <CheckCheck size={14} /> Clear all
                    </button>
                  )}
                  <button
                    onClick={() => setNotifOpen(false)}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200/60 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Notification List (Larger Cards & Multi-line preview) */}
              <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-100">
                {unreadNotifications.length === 0 ? (
                  <div className="text-center py-12 px-4 text-gray-400">
                    <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-2.5">
                      <CheckCircle size={24} className="text-green-500" />
                    </div>
                    <p className="font-bold text-sm text-gray-700">No new notifications</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                      Clicked notifications automatically disappear. You are all caught up!
                    </p>
                  </div>
                ) : (
                  unreadNotifications.map(n => (
                    <div
                      key={n._id}
                      onClick={(e) => handleNotificationClick(e, n)}
                      className="p-4 cursor-pointer bg-blue-50/40 hover:bg-blue-50/80 transition-all flex items-start gap-3.5 group border-l-4 border-l-primary-500"
                    >
                      {getNotificationIcon(n.type, n.severity)}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-xs sm:text-sm text-gray-900 group-hover:text-primary-700 transition-colors leading-snug">
                            {n.title}
                          </p>
                          <button
                            onClick={(e) => handleDismissNotification(e, n._id)}
                            className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors shrink-0 opacity-60 group-hover:opacity-100 cursor-pointer"
                            title="Dismiss from list"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        <p className="text-xs text-gray-700 mt-1 leading-relaxed">
                          {n.message}
                        </p>

                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-blue-100/60 text-[11px]">
                          <span className="text-gray-400 font-medium flex items-center gap-1">
                            <Clock size={11} />
                            {new Date(n.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short',
                              hour: 'numeric', minute: '2-digit', hour12: true
                            })}
                          </span>
                          <span className="font-bold text-primary-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                            <span>Open details</span>
                            <ArrowRight size={12} />
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer View All Link */}
              <Link
                to="/notifications"
                className="block text-center text-xs font-bold text-primary-700 py-3 bg-gray-50 hover:bg-gray-100 border-t border-gray-100 transition-colors"
                onClick={() => setNotifOpen(false)}
              >
                View full Notification Center →
              </Link>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200 cursor-pointer"
          >
            <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-bold text-gray-800 leading-tight">{user?.name}</p>
              <p className="text-[11px] text-gray-400 font-medium capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-12 w-48 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <Link
                to="/settings"
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium"
                onClick={() => setUserMenuOpen(false)}
              >
                <Settings size={15} /> Store Settings
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full text-left font-medium cursor-pointer"
              >
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
