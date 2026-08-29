import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, CreditCard, DollarSign, Calendar, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const CATEGORIES = [
  { value: 'rent', label: '🏠 Shop Rent' },
  { value: 'electricity', label: '⚡ Electricity / Power' },
  { value: 'salary', label: '👥 Staff Salary' },
  { value: 'transport', label: '🚚 Transport & Freight' },
  { value: 'packaging', label: '📦 Bags & Packaging' },
  { value: 'maintenance', label: '🛠️ Repairs & Maintenance' },
  { value: 'internet', label: '🌐 Internet & Utilities' },
  { value: 'other', label: '📋 Miscellaneous / Other' },
];

function ExpenseModal({ onSave, onClose }) {
  const [category, setCategory] = useState('electricity');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return toast.error('Enter valid expense amount');
    setLoading(true);
    try {
      await api.post('/expenses', {
        category,
        amount: Number(amount),
        paymentMethod,
        description,
        reference
      });
      toast.success('Expense recorded successfully');
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-bold text-lg text-gray-900">Record Shop Expense</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="form-label">Expense Category *</label>
            <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Amount (₹) *</label>
            <input
              type="number"
              required
              autoFocus
              step="0.01"
              className="form-input text-xl font-bold"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">Payment Method</label>
            <select className="form-select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>
          <div>
            <label className="form-label">Description / Remarks</label>
            <input className="form-input text-xs" placeholder="e.g. EB Bill for August month" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Receipt / Ref #</label>
            <input className="form-input text-xs" placeholder="Bill or payment reference" value={reference} onChange={e => setReference(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Saving...' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  const { isAdmin } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 30 });
      if (categoryFilter) params.set('category', categoryFilter);
      const res = await api.get(`/expenses?${params}`);
      setExpenses(res.data.data || []);
      setTotalAmount(res.data.totalAmount || 0);
      setTotal(res.data.total || 0);
    } catch {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, page]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Expense Management</h1>
          <p className="page-subtitle">Track operational store expenses for accurate Net Profit calculation</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add Expense
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 bg-gradient-to-br from-red-500 to-red-600 text-white">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-100">Total Expenses Recorded</p>
          <p className="text-3xl font-black mt-1">{fmt(totalAmount)}</p>
          <p className="text-xs text-red-100 mt-0.5">{total} transactions</p>
        </div>
      </div>

      {/* Filter */}
      <div className="card p-4">
        <select className="form-select w-56" value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Expense #</th>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Payment Mode</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(4).fill(0).map((_, i) => <tr key={i}><td colSpan={6}><div className="skeleton h-5 w-full" /></td></tr>)
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">
                    <CreditCard size={32} className="mx-auto mb-2 opacity-40" />
                    No expenses recorded
                  </td>
                </tr>
              ) : expenses.map(e => (
                <tr key={e._id}>
                  <td className="font-mono text-xs font-bold text-gray-800">{e.expenseNumber}</td>
                  <td className="text-xs text-gray-500">{new Date(e.expenseDate).toLocaleDateString('en-IN')}</td>
                  <td><span className="badge-purple capitalize">{e.category}</span></td>
                  <td className="text-sm font-medium text-gray-800">{e.description || '-'}</td>
                  <td><span className="badge-green capitalize">{e.paymentMethod}</span></td>
                  <td className="font-bold text-red-600 text-sm">{fmt(e.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <ExpenseModal
          onSave={() => { setShowModal(false); fetchExpenses(); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
