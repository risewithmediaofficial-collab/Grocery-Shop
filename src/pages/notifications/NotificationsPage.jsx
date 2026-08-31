import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CheckCheck, AlertTriangle, ShieldAlert, Info,
  CheckCircle, ArrowRight, ExternalLink, Trash2, Package, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { getNotificationRoute, getNotificationIcon } from '../../components/layout/Header';
import clsx from 'clsx';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabFilter, setTabFilter] = useState('all'); // 'all' or 'unread'

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.data || []);
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch {}
  };

  const handleNotificationClick = async (n) => {
    if (!n.isRead) {
      await markRead(n._id);
    }
    const targetRoute = getNotificationRoute(n);
    navigate(targetRoute);
  };

  const deleteNotification = async (e, id) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n._id !== id));
    try {
      await api.delete(`/notifications/${id}`);
      toast.success('Notification removed');
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to update notifications');
    }
  };

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  const displayedNotifications = useMemo(() => {
    if (tabFilter === 'unread') {
      return notifications.filter(n => !n.isRead);
    }
    return notifications;
  }, [notifications, tabFilter]);

  return (
    <div className="page-container max-w-4xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Notification Center</h1>
          <p className="page-subtitle">Real-time alerts for customer orders, low stock, expiry, and payments</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Filter */}
          <div className="flex bg-gray-200 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setTabFilter('all')}
              className={clsx(
                'px-3 py-1.5 rounded-lg transition-all',
                tabFilter === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
              )}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setTabFilter('unread')}
              className={clsx(
                'px-3 py-1.5 rounded-lg transition-all',
                tabFilter === 'unread' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
              )}
            >
              Unread ({unreadCount})
            </button>
          </div>

          <button onClick={markAllRead} className="btn-secondary btn-sm gap-1.5 font-semibold text-xs">
            <CheckCheck size={14} /> Mark All Read
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="divide-y divide-gray-100">
          {loading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="p-4"><div className="skeleton h-8 w-full" /></div>
            ))
          ) : displayedNotifications.length === 0 ? (
            <div className="text-center py-14 text-gray-400">
              <Bell size={40} className="mx-auto mb-2 opacity-30" />
              <p className="font-bold text-gray-700 text-sm">No notifications to show</p>
              <p className="text-xs text-gray-400 mt-1">All store inventory & transactions are up to date.</p>
            </div>
          ) : displayedNotifications.map(n => (
            <div
              key={n._id}
              onClick={() => handleNotificationClick(n)}
              className={clsx(
                'flex items-start gap-4 p-4.5 cursor-pointer hover:bg-gray-50 transition-all group',
                !n.isRead ? 'bg-blue-50/40 border-l-4 border-l-primary-500' : 'bg-white'
              )}
            >
              <div className="mt-0.5">{getNotificationIcon(n.type, n.severity)}</div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-gray-900 group-hover:text-primary-600 transition-colors">
                      {n.title}
                    </p>
                    {!n.isRead && (
                      <span className="badge-blue text-[10px] py-0.5">New</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(n.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                    <button
                      onClick={(e) => deleteNotification(e, n._id)}
                      className="text-gray-300 hover:text-red-500 p-1 transition-colors"
                      title="Delete notification"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-600 mt-1 leading-relaxed">{n.message}</p>

                <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-primary-600 group-hover:underline">
                  <span>Open actual data</span>
                  <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
