import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, UserCog, Lock, Mail, Phone, Check, X, Trash2, Shield, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import clsx from 'clsx';

const ROLES = [
  { value: 'admin', label: '👑 Admin / Store Owner', desc: 'Full unrestricted access to all modules, financial reports, user management, settings, & inventory' },
  { value: 'manager', label: '👔 Store Manager', desc: 'Can manage sales, purchases, inventory, suppliers, & view reports' },
  { value: 'cashier', label: '💻 Cashier & Store Staff', desc: 'POS Billing, customer lookups, receipts, purchase inward, product catalog, & stock management' },
];

function UserModal({ user, onSave, onClose }) {
  const [form, setForm] = useState(user || {
    name: '', email: '', password: '', mobile: '', role: 'cashier', isActive: true
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Full Name is required');
    if (!form.email.trim()) return toast.error('Email address is required');
    if (!user && (!form.password || form.password.length < 6)) {
      return toast.error('Password must be at least 6 characters');
    }

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
      const errMsg = err.response?.data?.message || err.message || 'Failed to save user. Please check the details and try again.';
      toast.error(errMsg);
      console.error('User save error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] my-auto shadow-2xl flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0 bg-gradient-to-r from-gray-50 to-white">
          <div>
            <h3 className="font-extrabold text-lg text-gray-900">{user ? 'Edit Staff Member' : 'Add Staff User'}</h3>
            <p className="text-xs text-gray-500">Configure access permissions & login credentials</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
            title="Close form"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form with Scrollable Content */}
        <form onSubmit={handleSubmit} autoComplete="on" className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="form-label font-bold text-xs">Full Name *</label>
              <input
                className="form-input text-sm"
                required
                autoComplete="name"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Anand Kumar"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="form-label font-bold text-xs">Email Address *</label>
                <input
                  className="form-input text-sm"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="staff@columbu.com"
                />
              </div>
              <div>
                <label className="form-label font-bold text-xs">Mobile Number</label>
                <input
                  className="form-input text-sm"
                  type="tel"
                  autoComplete="tel"
                  maxLength={10}
                  value={form.mobile}
                  onChange={e => set('mobile', e.target.value.replace(/\D/g, ''))}
                  placeholder="98765 43210"
                />
              </div>
            </div>

            {!user && (
              <div>
                <label className="form-label font-bold text-xs">Password *</label>
                <input
                  className="form-input text-sm"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="Minimum 6 characters"
                />
              </div>
            )}

            <div>
              <label className="form-label font-bold text-xs">Role & Permissions</label>
              <div className="space-y-2 mt-1">
                {ROLES.map(r => (
                  <label
                    key={r.value}
                    onClick={() => set('role', r.value)}
                    className={clsx(
                      'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                      form.role === r.value ? 'bg-primary-50/70 border-primary-400 shadow-2xs' : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <input
                      type="radio"
                      name="role"
                      checked={form.role === r.value}
                      onChange={() => set('role', r.value)}
                      className="mt-0.5 w-4 h-4 text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <p className="font-bold text-xs text-gray-900">{r.label}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{r.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Modal Footer with Action Buttons */}
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary py-2.5 px-5 text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary py-2.5 px-6 text-xs font-bold shadow-md cursor-pointer"
            >
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
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load users list');
      console.error('Fetch users error:', err);
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
    <div className="page-container max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
            <UserCog className="text-primary-600" size={26} />
            <span>User Roles & Staff Management</span>
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Granular role-based access control for cashiers, stock keepers, managers, & admins
          </p>
        </div>
        <button
          className="btn-primary py-2.5 px-4 font-bold shadow-xs cursor-pointer gap-2"
          onClick={() => { setEditingUser(null); setShowModal(true); }}
        >
          <Plus size={16} /> Add User
        </button>
      </div>

      <div className="card overflow-hidden border border-gray-200 shadow-sm bg-white">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-4 px-5">User Details</th>
                <th className="py-4 px-5">Role</th>
                <th className="py-4 px-5">Mobile</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5">Last Login</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="py-4 px-5"><div className="skeleton h-5 w-full rounded-lg" /></td></tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    No users found
                  </td>
                </tr>
              ) : users.map(u => (
                <tr key={u._id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center font-bold text-primary-700 text-sm">
                        {u.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <span className={clsx(
                      'text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide',
                      u.role === 'admin' && 'bg-purple-100 text-purple-800',
                      u.role === 'manager' && 'bg-blue-100 text-blue-800',
                      u.role === 'cashier' && 'bg-green-100 text-green-800'
                    )}>
                      {u.role?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-xs font-medium text-gray-700">
                    {u.mobile ? `+91 ${u.mobile}` : '-'}
                  </td>
                  <td className="py-4 px-5">
                    <span className={clsx(
                      'badge text-xs font-bold',
                      u.isActive ? 'badge-green' : 'badge-red'
                    )}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-xs text-gray-500">
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                    }) : 'Never'}
                  </td>
                  <td className="py-4 px-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setEditingUser(u); setShowModal(true); }}
                        className="btn-outline btn-sm py-1.5 px-3 text-xs font-semibold cursor-pointer"
                      >
                        Edit
                      </button>
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleDeactivate(u._id)}
                          className="btn-ghost btn-sm text-red-600 hover:bg-red-50 py-1.5 px-2 cursor-pointer"
                          title="Deactivate user"
                        >
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
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); fetchUsers(); }}
        />
      )}
    </div>
  );
}
