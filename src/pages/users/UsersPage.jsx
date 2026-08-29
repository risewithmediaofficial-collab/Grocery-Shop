import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, UserCog, Lock, Mail, Phone, Check, X, Trash2, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import clsx from 'clsx';

const ROLES = [
  { value: 'admin', label: '👑 Admin / Store Owner', desc: 'Full unrestricted access to all modules, financial reports, & settings' },
  { value: 'manager', label: '👔 Store Manager', desc: 'Can manage sales, purchases, inventory, suppliers, & view reports' },
  { value: 'cashier', label: '💻 Cashier / POS Billing', desc: 'POS Billing, customer lookups, receipts, & payments only' },
  { value: 'stock_manager', label: '📦 Stock & Warehouse Manager', desc: 'Inventory inward, adjustments, batches, and expiry management' },
];

function UserModal({ user, onSave, onClose }) {
  const [form, setForm] = useState(user || {
    name: '', email: '', password: '', mobile: '', role: 'cashier', isActive: true
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (user) {
        await api.put(`/users/${user._id}`, form);
        toast.success('User updated successfully');
      } else {
        await api.post('/users', form);
        toast.success('User created successfully');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-bold text-lg text-gray-900">{user ? 'Edit Staff Member' : 'Add Staff User'}</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="form-label">Full Name *</label>
            <input className="form-input" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Anand" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Email Address *</label>
              <input className="form-input" type="email" required value={form.email} onChange={e => set('email', e.target.value)} placeholder="staff@kolambu.com" />
            </div>
            <div>
              <label className="form-label">Mobile Number</label>
              <input className="form-input" value={form.mobile} onChange={e => set('mobile', e.target.value)} placeholder="9876543210" />
            </div>
          </div>
          {!user && (
            <div>
              <label className="form-label">Password *</label>
              <input className="form-input" type="password" required minLength={6} value={form.password} onChange={e => set('password', e.target.value)} placeholder="Minimum 6 characters" />
            </div>
          )}

          <div>
            <label className="form-label">Role & Permissions</label>
            <div className="space-y-2 mt-1">
              {ROLES.map(r => (
                <label
                  key={r.value}
                  onClick={() => set('role', r.value)}
                  className={clsx(
                    'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                    form.role === r.value ? 'bg-primary-50/60 border-primary-400' : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <input type="radio" name="role" checked={form.role === r.value} onChange={() => set('role', r.value)} className="mt-0.5" />
                  <div>
                    <p className="font-bold text-xs text-gray-900">{r.label}</p>
                    <p className="text-[11px] text-gray-500">{r.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Saving...' : user ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data.data || []);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDeactivate = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('User deactivated');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate user');
    }
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">User Roles & Staff Management</h1>
          <p className="page-subtitle">Granular role-based access control for cashiers, stock keepers, managers, & admins</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditingUser(null); setShowModal(true); }}>
          <Plus size={16} /> Add User
        </button>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>User Details</th>
                <th>Role</th>
                <th>Mobile</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(3).fill(0).map((_, i) => <tr key={i}><td colSpan={6}><div className="skeleton h-5 w-full" /></td></tr>)
              ) : users.map(u => (
                <tr key={u._id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-700 text-xs">
                        {u.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={clsx(
                      u.role === 'admin' && 'badge-purple font-bold',
                      u.role === 'manager' && 'badge-blue font-bold',
                      u.role === 'cashier' && 'badge-green font-bold',
                      u.role === 'stock_manager' && 'badge-orange font-bold'
                    )}>
                      {u.role?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="text-xs text-gray-600">{u.mobile || '-'}</td>
                  <td>
                    <span className={u.isActive ? 'badge-green' : 'badge-red'}>
                      {u.isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="text-xs text-gray-500">
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleString('en-IN') : 'Never'}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditingUser(u); setShowModal(true); }} className="btn-secondary btn-sm text-xs">
                        Edit
                      </button>
                      {u.isActive && (
                        <button onClick={() => handleDeactivate(u._id)} className="btn-icon btn-ghost btn-sm text-red-500">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <UserModal
          user={editingUser}
          onSave={() => { setShowModal(false); fetchUsers(); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
