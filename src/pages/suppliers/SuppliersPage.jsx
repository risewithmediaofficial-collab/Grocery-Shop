import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Plus, Search, ShoppingBag, Phone, MapPin, Eye, DollarSign, CreditCard, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import clsx from 'clsx';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function SupplierModal({ supplier, onSave, onClose }) {
  const [form, setForm] = useState(supplier || {
    name: '', company: '', mobile: '', email: '', address: '', city: 'Krishnagiri', state: 'Tamil Nadu',
    gstin: '', openingBalance: 0, paymentTerms: 'Net 30', notes: ''
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (supplier) {
        await api.put(`/suppliers/${supplier._id}`, form);
        toast.success('Supplier updated');
      } else {
        await api.post('/suppliers', form);
        toast.success('Supplier created');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save supplier');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] my-auto shadow-2xl flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0 bg-gradient-to-r from-gray-50 to-white">
          <div>
            <h3 className="font-extrabold text-lg text-gray-900">{supplier ? 'Edit Supplier' : 'Add Supplier'}</h3>
            <p className="text-xs text-gray-500">Maintain supplier vendor directory & payment terms</p>
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

        <form onSubmit={handleSubmit} autoComplete="on" className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="form-label font-bold text-xs">Contact Person Name *</label>
                <input
                  className="form-input text-sm"
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                />
              </div>
              <div>
                <label className="form-label font-bold text-xs">Company / Business Name</label>
                <input
                  className="form-input text-sm"
                  autoComplete="organization"
                  value={form.company}
                  onChange={e => set('company', e.target.value)}
                  placeholder="e.g. Sri Murugan Traders"
                />
              </div>
              <div>
                <label className="form-label font-bold text-xs">Mobile Number *</label>
                <input
                  className="form-input text-sm"
                  required
                  type="tel"
                  autoComplete="tel"
                  maxLength={10}
                  value={form.mobile}
                  onChange={e => set('mobile', e.target.value.replace(/\D/g, ''))}
                  placeholder="98765 43210"
                />
              </div>
              <div>
                <label className="form-label font-bold text-xs">GSTIN</label>
                <input
                  className="form-input text-sm uppercase font-mono"
                  value={form.gstin}
                  onChange={e => set('gstin', e.target.value)}
                  placeholder="33AAAAA0000A1Z5"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="form-label text-xs">Address</label>
                <input
                  className="form-input text-sm"
                  autoComplete="street-address"
                  value={form.address}
                  onChange={e => set('address', e.target.value)}
                  placeholder="Street / Market Address"
                />
              </div>
              <div>
                <label className="form-label text-xs">City</label>
                <input
                  className="form-input text-sm"
                  autoComplete="address-level2"
                  value={form.city}
                  onChange={e => set('city', e.target.value)}
                />
              </div>
              <div>
                <label className="form-label text-xs">Payment Terms</label>
                <input
                  className="form-input text-sm"
                  value={form.paymentTerms}
                  onChange={e => set('paymentTerms', e.target.value)}
                  placeholder="e.g. Net 15 days"
                />
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 shrink-0">
            <button type="button" onClick={onClose} className="btn-secondary py-2.5 px-5 text-xs font-bold cursor-pointer">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary py-2.5 px-6 text-xs font-bold shadow-md cursor-pointer">
              {loading ? 'Saving...' : supplier ? 'Update Supplier' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [search, setSearch] = useState('');

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/suppliers?search=${search}`);
      setSuppliers(res.data.data || []);
    } catch {
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Suppliers & Vendors</h1>
          <p className="page-subtitle">{suppliers.length} active suppliers · Procurement and payments tracking</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditingSupplier(null); setShowModal(true); }}>
          <Plus size={16} /> Add Supplier
        </button>
      </div>

      <div className="card p-4">
        <div className="relative max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="form-input pl-9"
            placeholder="Search by supplier or company name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Supplier & Company</th>
                <th>Supplier ID</th>
                <th>Contact</th>
                <th>City & State</th>
                <th>Outstanding Payable</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(4).fill(0).map((_, i) => <tr key={i}><td colSpan={6}><div className="skeleton h-5 w-full" /></td></tr>)
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">
                    <ShoppingBag size={32} className="mx-auto mb-2 opacity-40" />
                    No suppliers found
                  </td>
                </tr>
              ) : suppliers.map(s => (
                <tr key={s._id}>
                  <td>
                    <Link to={`/suppliers/${s._id}`} className="font-bold text-gray-900 hover:text-primary-600 hover:underline">
                      {s.name}
                    </Link>
                    {s.company && <p className="text-xs text-gray-500 font-medium">{s.company}</p>}
                  </td>
                  <td>
                    <span className="badge-gray">{s.supplierId}</span>
                  </td>
                  <td className="text-xs text-gray-600">
                    <p className="flex items-center gap-1"><Phone size={11} className="text-gray-400 shrink-0" /> {s.mobile}</p>
                    {s.gstin && <p className="text-gray-400 font-mono">GST: {s.gstin}</p>}
                  </td>
                  <td className="text-xs text-gray-600">{s.city}, {s.state}</td>
                  <td>
                    {s.outstandingBalance > 0 ? (
                      <span className="badge-red font-bold">{fmt(s.outstandingBalance)}</span>
                    ) : (
                      <span className="text-xs text-gray-400">₹0.00</span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Link to={`/suppliers/${s._id}`} className="btn-secondary btn-sm text-xs gap-1">
                        <Eye size={13} /> View Ledger
                      </Link>
                      <button onClick={() => { setEditingSupplier(s); setShowModal(true); }} className="btn-outline btn-sm text-xs">
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <SupplierModal
          supplier={editingSupplier}
          onSave={() => { setShowModal(false); fetchSuppliers(); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
