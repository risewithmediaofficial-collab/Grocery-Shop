import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Truck, Eye, Calendar, DollarSign, Package, Check, X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import clsx from 'clsx';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function PurchaseFormModal({ suppliers, products, onSave, onClose }) {
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [items, setItems] = useState([
    { product: '', quantity: 1, purchasePrice: 0, gstRate: 5, batchNumber: '', expiryDate: '' }
  ]);
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const addItemRow = () => {
    setItems(prev => [...prev, { product: '', quantity: 1, purchasePrice: 0, gstRate: 5, batchNumber: '', expiryDate: '' }]);
  };

  const removeItemRow = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const updateItemRow = (idx, field, val) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: val };
      if (field === 'product') {
        const prod = products.find(p => p._id === val);
        if (prod) {
          updated.purchasePrice = prod.purchasePrice || 0;
          updated.gstRate = prod.gstRate || 0;
        }
      }
      return updated;
    }));
  };

  const calculateSubtotal = () => items.reduce((sum, i) => sum + ((Number(i.purchasePrice) || 0) * (Number(i.quantity) || 0)), 0);
  const calculateTotalTax = () => items.reduce((sum, i) => {
    const cost = (Number(i.purchasePrice) || 0) * (Number(i.quantity) || 0);
    return sum + (cost * (Number(i.gstRate) || 0) / 100);
  }, 0);

  const subtotal = calculateSubtotal();
  const totalTax = calculateTotalTax();
  const grandTotal = Math.round(subtotal + totalTax);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supplierId) return toast.error('Please select a supplier');
    const validItems = items.filter(i => i.product && Number(i.quantity) > 0);
    if (validItems.length === 0) return toast.error('Please add at least 1 valid product');

    setLoading(true);
    try {
      await api.post('/purchases', {
        supplierId,
        invoiceNumber,
        items: validItems,
        grandTotal,
        amountPaid: Number(amountPaid) || 0,
        notes
      });
      toast.success('Purchase received and stock updated!');
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record purchase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 overflow-y-auto p-4 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-3xl w-full shadow-2xl my-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-bold text-lg text-gray-900">Receive New Purchase Goods</h2>
            <p className="text-xs text-gray-500">Increases inventory stock & creates batch records automatically</p>
          </div>
          <button onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Supplier *</label>
              <select className="form-select" required value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                <option value="">Select Supplier</option>
                {suppliers.map(s => <option key={s._id} value={s._id}>{s.name} ({s.company || s.supplierId})</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Supplier Invoice Ref #</label>
              <input className="form-input" placeholder="e.g. SUP-INV-1029" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="form-label mb-0">Products Received</label>
              <button type="button" onClick={addItemRow} className="btn-secondary btn-sm text-xs gap-1 text-primary-700">
                <Plus size={13} /> Add Item Row
              </button>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="table text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-48">Product</th>
                    <th className="w-20">Qty</th>
                    <th className="w-24">Cost Rate (₹)</th>
                    <th className="w-16">GST %</th>
                    <th className="w-24">Batch #</th>
                    <th className="w-28">Expiry Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <select
                          className="form-select text-xs py-1"
                          required
                          value={item.product}
                          onChange={e => updateItemRow(idx, 'product', e.target.value)}
                        >
                          <option value="">Choose product...</option>
                          {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          className="form-input text-xs py-1 text-center font-bold"
                          value={item.quantity}
                          onChange={e => updateItemRow(idx, 'quantity', Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          className="form-input text-xs py-1 text-right font-medium"
                          value={item.purchasePrice}
                          onChange={e => updateItemRow(idx, 'purchasePrice', Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <select
                          className="form-select text-xs py-1"
                          value={item.gstRate}
                          onChange={e => updateItemRow(idx, 'gstRate', Number(e.target.value))}
                        >
                          <option value={0}>0%</option>
                          <option value={5}>5%</option>
                          <option value={12}>12%</option>
                          <option value={18}>18%</option>
                          <option value={28}>28%</option>
                        </select>
                      </td>
                      <td>
                        <input
                          className="form-input text-xs py-1"
                          placeholder="Opt batch"
                          value={item.batchNumber}
                          onChange={e => updateItemRow(idx, 'batchNumber', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="date"
                          className="form-input text-xs py-1"
                          value={item.expiryDate}
                          onChange={e => updateItemRow(idx, 'expiryDate', e.target.value)}
                        />
                      </td>
                      <td>
                        {items.length > 1 && (
                          <button type="button" onClick={() => removeItemRow(idx)} className="text-red-500 hover:text-red-700">
                            <X size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals & Payment */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
            <div className="space-y-2">
              <div>
                <label className="form-label text-xs">Amount Paid to Supplier Now (₹)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="0.00 (leave 0 if full credit)"
                  value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label text-xs">Notes</label>
                <input className="form-input text-xs" placeholder="Optional notes" value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg text-right text-xs space-y-1">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span>{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Total Tax:</span>
                <span>{fmt(totalTax)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-gray-900 pt-1 border-t border-gray-200">
                <span>Total Purchase Cost:</span>
                <span className="text-primary-700 text-base">{fmt(grandTotal)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 py-2.5 font-bold">
              {loading ? 'Receiving...' : '✓ Confirm Purchase & Update Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 25 });
      if (search) params.set('search', search);
      const res = await api.get(`/purchases?${params}`);
      setPurchases(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch {
      toast.error('Failed to load purchases');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { fetchPurchases(); }, [fetchPurchases]);

  useEffect(() => {
    Promise.all([
      api.get('/suppliers'),
      api.get('/products?limit=200'),
    ]).then(([sRes, pRes]) => {
      setSuppliers(sRes.data.data || []);
      setProducts(pRes.data.data || []);
    });
  }, []);

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Purchases</h1>
          <p className="page-subtitle">{total} purchases received · Inbound stock ledger tracking</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Purchase Order / Inward
        </button>
      </div>

      <div className="card p-4">
        <div className="relative max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="form-input pl-9"
            placeholder="Search by Purchase # (e.g. PUR-00001)..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Purchase #</th>
                <th>Date</th>
                <th>Supplier</th>
                <th>Items Count</th>
                <th>Grand Total</th>
                <th>Paid</th>
                <th>Due Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={8}><div className="skeleton h-5 w-full" /></td></tr>)
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-gray-400">
                    <Truck size={32} className="mx-auto mb-2 opacity-40" />
                    No purchases recorded
                  </td>
                </tr>
              ) : purchases.map(p => (
                <tr key={p._id}>
                  <td>
                    <span className="font-bold text-primary-700">{p.purchaseNumber}</span>
                    {p.invoiceNumber && <p className="text-xs text-gray-400">Ref: {p.invoiceNumber}</p>}
                  </td>
                  <td className="text-xs text-gray-600">{new Date(p.purchaseDate).toLocaleDateString('en-IN')}</td>
                  <td>
                    <p className="font-semibold text-gray-900">{p.supplierName}</p>
                  </td>
                  <td className="text-sm">{p.items?.length || 0} items</td>
                  <td className="font-bold text-gray-900">{fmt(p.grandTotal)}</td>
                  <td className="text-green-600 font-medium">{fmt(p.amountPaid)}</td>
                  <td>
                    {p.dueAmount > 0 ? (
                      <span className="badge-red">{fmt(p.dueAmount)}</span>
                    ) : (
                      <span className="text-xs text-gray-400">Paid</span>
                    )}
                  </td>
                  <td>
                    <span className="badge-green capitalize">{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <PurchaseFormModal
          suppliers={suppliers}
          products={products}
          onSave={() => { setShowModal(false); fetchPurchases(); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
