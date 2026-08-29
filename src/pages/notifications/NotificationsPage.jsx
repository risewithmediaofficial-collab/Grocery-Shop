import React, { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, AlertTriangle, ShieldAlert, Info, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import clsx from 'clsx';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const markAllRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('All marked as read');
    } catch {
      toast.error('Failed to update notifications');
    }
  };

  const getIcon = (type, severity) => {
    if (severity === 'error') return <ShieldAlert size={18} className="text-red-500 shrink-0" />;
    if (severity === 'warning') return <AlertTriangle size={18} className="text-orange-500 shrink-0" />;
    if (severity === 'success') return <CheckCircle size={18} className="text-green-500 shrink-0" />;
    return <Info size={18} className="text-blue-500 shrink-0" />;
  };

  return (
    <div className="page-container max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Notification Center</h1>
          <p className="page-subtitle">Real-time alerts for low stock, out of stock, near-expiry, and orders</p>
        </div>
        <button onClick={markAllRead} className="btn-secondary btn-sm gap-1">
          <CheckCheck size={15} /> Mark All as Read
        </button>
      </div>

      <div className="card">
        <div className="divide-y divide-gray-100">
          {loading ? (
            Array(5).fill(0).map((_, i) => <div key={i} className="p-4"><div className="skeleton h-6 w-full" /></div>)
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Bell size={36} className="mx-auto mb-2 opacity-30" />
              <p className="font-semibold text-sm">No notifications</p>
              <p className="text-xs">All store inventory & transactions are running smoothly.</p>
            </div>
          ) : notifications.map(n => (
            <div
              key={n._id}
              className={clsx(
                'flex items-start gap-3.5 p-4 transition-colors',
                !n.isRead ? 'bg-blue-50/50' : 'bg-white hover:bg-gray-50'
              )}
            >
              {getIcon(n.type, n.severity)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-xs text-gray-900">{n.title}</p>
                  <span className="text-[10px] text-gray-400">{new Date(n.createdAt).toLocaleString('en-IN')}</span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5">{n.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
