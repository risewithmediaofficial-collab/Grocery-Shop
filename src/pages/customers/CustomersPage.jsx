import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Users, Phone, MapPin, DollarSign, Eye, CreditCard, RotateCcw, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import clsx from 'clsx';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function CustomerFormModal({ customer, onSave, onClose }) {
  const [form, setForm] = useState(customer || {
    name: '', mobile: '', altMobile: '', address: '', city: 'Krishnagiri', state: 'Tamil Nadu',
    gstin: '', customerType: 'regular', creditLimit: 0, openingBalance: 0, notes: ''
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (customer) {
        await api.put(`/customers/${customer._id}`, form);
        toast.success('Customer updated');
      } else {
        await api.post('/customers', form);
        toast.success('Customer created');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 overflow-y-auto p-4 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-lg w-full shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-bold text-lg text-gray-900">{customer ? 'Edit Customer' : 'Add New Customer'}</h2>
            <p className="text-xs text-gray-500">Customer identifier is uniquely assigned by ID</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Basic Info</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="form-label">Full Name *</label>
                <input className="form-input" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Ramesh Kumar" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="form-label">Customer Type</label>
                <select className="form-select" value={form.customerType} onChange={e => set('customerType', e.target.value)}>
                  <option value="regular">Regular</option>
                  <option value="credit">Credit / Udhaar</option>
                  <option value="wholesale">Wholesale</option>
                  <option value="walk-in">Walk-in</option>
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="form-label">Mobile Number *</label>
                <input className="form-input" required value={form.mobile} onChange={e => set('mobile', e.target.value)} placeholder="e.g. 9876543210" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="form-label">Alt Mobile</label>
                <input className="form-input" value={form.altMobile} onChange={e => set('altMobile', e.target.value)} placeholder="Optional" />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Address & Location</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="form-label">Address</label>
                <input className="form-input" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Door no, Street, Landmark" />
              </div>
              <div>
                <label className="form-label">City</label>
                <input className="form-input" value={form.city} onChange={e => set('city', e.target.value)} />
              </div>
              <div>
                <label className="form-label">State</label>
                <input className="form-input" value={form.state} onChange={e => set('state', e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Credit & GST</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">GSTIN (Optional)</label>
                <input className="form-input" value={form.gstin} onChange={e => set('gstin', e.target.value)} placeholder="33AAAAA0000A1Z5" />
              </div>
              <div>
                <label className="form-label">Credit Limit (₹)</label>
                <input className="form-input" type="number" value={form.creditLimit} onChange={e => set('creditLimit', Number(e.target.value))} placeholder="0" />
              </div>
              {!customer && (
                <div>
                  <label className="form-label">Opening Balance (₹)</label>
                  <input className="form-input" type="number" value={form.openingBalance} onChange={e => set('openingBalance', Number(e.target.value))} placeholder="0" />
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Saving...' : customer ? 'Update Customer' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PaymentRecordModal({ customer, onSave, onClose }) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return toast.error('Enter valid payment amount');
    setLoading(true);
    try {
      await api.post(`/customers/${customer._id}/payment`, {
        amount: Number(amount),
        paymentMethod,
        reference,
        notes
      });
      toast.success('Payment recorded successfully');
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h3 className="font-bold text-gray-900">Record Customer Payment</h3>
            <p className="text-xs text-gray-500">{customer.name} ({customer.customerId})</p>
          </div>
          <button onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex justify-between items-center">
            <span className="text-xs text-red-700 font-medium">Outstanding Balance</span>
            <span className="text-base font-bold text-red-700">{fmt(customer.outstandingBalance)}</span>
          </div>
          <div>
            <label className="form-label">Payment Amount (₹) *</label>
            <input className="form-input font-bold text-lg" type="number" required autoFocus value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="form-label">Payment Method</label>
            <select className="form-select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="upi">UPI / GPay / PhonePe</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>
          <div>
            <label className="form-label">Ref / Transaction ID</label>
            <input className="form-input" value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. UPI Ref no" />
          </div>
          <div>
            <label className="form-label">Notes</label>
            <input className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional note" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Recording...' : 'Save Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const cart = useCart();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [payingCustomer, setPayingCustomer] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 30 });
      if (search) params.set('search', search);
      if (typeFilter) params.set('type', typeFilter);
      const res = await api.get(`/customers?${params}`);
      setCustomers(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, page]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const handleStartPOSWithCustomer = (cust) => {
    cart.setCustomer(cust);
    navigate('/pos');
    toast.success(`Selected customer: ${cust.name}`);
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">{total} registered customers · Identified by unique Customer ID</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditingCustomer(null); setShowModal(true); }}>
          <Plus size={16} /> Add Customer
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-56">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="form-input pl-9"
            placeholder="Search by Name, Mobile, or Customer ID..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="form-select w-44" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}>
          <option value="">All Types</option>
          <option value="regular">Regular</option>
          <option value="credit">Credit (Udhaar)</option>
          <option value="wholesale">Wholesale</option>
          <option value="walk-in">Walk-in</option>
        </select>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Mobile & ID</th>
                <th>Type</th>
                <th>Total Purchases</th>
                <th>Outstanding (Udhaar)</th>
                <th>Last Bill</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(6).fill(0).map((_, i) => <tr key={i}><td colSpan={7}><div className="skeleton h-5 w-full" /></td></tr>)
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400">
                    <Users size={32} className="mx-auto mb-2 opacity-40" />
                    No customers found
                  </td>
                </tr>
              ) : customers.map(c => (
                <tr key={c._id}>
                  <td>
                    <div>
                      <Link to={`/customers/${c._id}`} className="font-semibold text-gray-900 hover:text-primary-600 hover:underline">
                        {c.name}
                      </Link>
                      {c.address && <p className="text-xs text-gray-400 truncate max-w-xs">{c.address}, {c.city}</p>}
                    </div>
                  </td>
                  <td>
                    <div className="text-xs">
                      <p className="font-medium text-gray-800 flex items-center gap-1">📱 {c.mobile}</p>
                      <span className="badge-gray mt-0.5">{c.customerId}</span>
                    </div>
                  </td>
                  <td>
                    <span className={clsx(
                      c.customerType === 'credit' && 'badge-orange',
                      c.customerType === 'wholesale' && 'badge-purple',
                      c.customerType === 'regular' && 'badge-green',
                      c.customerType === 'walk-in' && 'badge-gray'
                    )}>
                      {c.customerType}
                    </span>
                  </td>
                  <td className="font-medium">{fmt(c.totalPurchases)}</td>
                  <td>
                    {c.outstandingBalance > 0 ? (
                      <span className="badge-red font-bold">{fmt(c.outstandingBalance)}</span>
                    ) : (
                      <span className="text-xs text-gray-400 font-medium">₹0.00</span>
                    )}
                  </td>
                  <td className="text-xs text-gray-500">
                    {c.lastPurchaseDate ? new Date(c.lastPurchaseDate).toLocaleDateString('en-IN') : 'No purchase'}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStartPOSWithCustomer(c)}
                        className="btn-outline btn-sm text-xs text-primary-700 hover:bg-primary-50"
                        title="Open in POS"
                      >
                        Bill
                      </button>
                      {c.outstandingBalance > 0 && (
                        <button
                          onClick={() => setPayingCustomer(c)}
                          className="btn-secondary btn-sm text-xs text-green-700 hover:bg-green-50"
                          title="Record Payment"
                        >
                          Pay
                        </button>
                      )}
                      <Link to={`/customers/${c._id}`} className="btn-icon btn-ghost btn-sm text-gray-500 hover:text-primary-600" title="View details">
                        <Eye size={14} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {total > 30 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">Showing {Math.min((page-1)*30+1, total)}–{Math.min(page*30, total)} of {total}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="btn-secondary btn-sm">Previous</button>
              <button onClick={() => setPage(p => p+1)} disabled={page*30 >= total} className="btn-secondary btn-sm">Next</button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <CustomerFormModal
          customer={editingCustomer}
          onSave={() => { setShowModal(false); fetchCustomers(); }}
          onClose={() => setShowModal(false)}
        />
      )}

      {payingCustomer && (
        <PaymentRecordModal
          customer={payingCustomer}
          onSave={() => { setPayingCustomer(null); fetchCustomers(); }}
          onClose={() => setPayingCustomer(null)}
        />
      )}
    </div>
  );
}
