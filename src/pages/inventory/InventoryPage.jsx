import React, { useState, useEffect, useCallback } from 'react';
import { Warehouse, Plus, Search, Filter, AlertTriangle, ArrowDown, ArrowUp, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';

function StockAdjustmentModal({ products, onSave, onClose }) {
  const [productId, setProductId] = useState('');
  const [adjustedQty, setAdjustedQty] = useState('');
  const [type, setType] = useState('correction');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedProduct = products.find(p => p._id === productId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productId) return toast.error('Please select product');
    const qty = parseInt(adjustedQty);
    if (isNaN(qty) || qty === 0) return toast.error('Enter valid non-zero adjustment quantity');
    if (!reason.trim()) return toast.error('Reason is required for stock adjustments');

    setLoading(true);
    try {
      await api.post('/inventory/adjust', {
        productId,
        adjustedQty: qty,
        type,
        reason
      });
      toast.success('Stock adjusted successfully');
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h3 className="font-bold text-lg text-gray-900">Adjust Stock (Admin/Manager)</h3>
            <p className="text-xs text-gray-500">Changes are permanently logged to audit history</p>
          </div>
          <button onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="form-label">Select Product *</label>
            <select className="form-select" required value={productId} onChange={e => setProductId(e.target.value)}>
              <option value="">Choose product...</option>
              {products.map(p => <option key={p._id} value={p._id}>{p.name} (Current: {p.currentStock})</option>)}
            </select>
          </div>

          {selectedProduct && (
            <div className="p-3 bg-gray-50 rounded-lg text-xs flex justify-between border border-gray-200">
              <span className="text-gray-600">Current Stock Balance:</span>
              <span className="font-bold text-gray-900">{selectedProduct.currentStock}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Adjustment Qty *</label>
              <input
                type="number"
                required
                className="form-input font-bold"
                placeholder="e.g. -2 or +5"
                value={adjustedQty}
                onChange={e => setAdjustedQty(e.target.value)}
              />
              <span className="text-[10px] text-gray-400">Use negative (-) for reductions</span>
            </div>
            <div>
              <label className="form-label">Type</label>
              <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
                <option value="damage">Damaged Goods</option>
                <option value="expiry">Expired Stock</option>
                <option value="theft">Lost / Theft</option>
                <option value="correction">Audit Count Correction</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Reason * (Mandatory for audit)</label>
            <textarea
              required
              rows={2}
              className="form-input text-xs"
              placeholder="Provide clear rationale for this stock change..."
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Adjusting...' : 'Save Stock Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const { isAdmin, isManager } = useAuth();
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 30 });
      if (typeFilter) params.set('type', typeFilter);
      if (productFilter) params.set('product', productFilter);
      const res = await api.get(`/inventory/movements?${params}`);
      setMovements(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch {
      toast.error('Failed to load stock movements');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, productFilter, page]);

  useEffect(() => { fetchMovements(); }, [fetchMovements]);

  useEffect(() => {
    api.get('/products?limit=200').then(res => setProducts(res.data.data || []));
  }, []);

  const typeBadge = (type) => {
    const map = {
      purchase: 'badge-green',
      sale: 'badge-blue',
      sale_return: 'badge-purple',
      purchase_return: 'badge-orange',
      opening: 'badge-gray',
      adjustment: 'badge-yellow',
      damage: 'badge-red',
      expiry: 'badge-red',
    };
    return <span className={map[type] || 'badge-gray'}>{type.replace('_', ' ')}</span>;
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Stock Ledger & Movements</h1>
          <p className="page-subtitle">{total} stock movement audit records · Complete trace from purchase to sale</p>
        </div>
        {(isAdmin() || isManager()) && (
          <button className="btn-primary" onClick={() => setShowAdjustModal(true)}>
            <Plus size={16} /> Adjust Stock
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
          <div>
            <label className="form-label text-xs">Filter by Product</label>
            <select className="form-select" value={productFilter} onChange={e => { setProductFilter(e.target.value); setPage(1); }}>
              <option value="">All Products</option>
              {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label text-xs">Filter by Movement Type</label>
            <select className="form-select" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}>
              <option value="">All Movement Types</option>
              <option value="purchase">Purchases (In)</option>
              <option value="sale">Sales (Out)</option>
              <option value="sale_return">Sale Returns (In)</option>
              <option value="purchase_return">Purchase Returns (Out)</option>
              <option value="adjustment">Adjustments</option>
              <option value="opening">Opening Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stock Ledger Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Product</th>
                <th>Movement Type</th>
                <th>Qty Change</th>
                <th>Balance Before</th>
                <th>Balance After</th>
                <th>Reference #</th>
                <th>Reason / User</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(6).fill(0).map((_, i) => <tr key={i}><td colSpan={8}><div className="skeleton h-5 w-full" /></td></tr>)
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-gray-400">
                    <Warehouse size={32} className="mx-auto mb-2 opacity-40" />
                    No stock movements found
                  </td>
                </tr>
              ) : movements.map(m => (
                <tr key={m._id}>
                  <td className="text-xs text-gray-600">
                    {new Date(m.createdAt).toLocaleDateString('en-IN')}{' '}
                    <span className="text-gray-400">{new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </td>
                  <td>
                    <p className="font-semibold text-gray-900 text-sm">{m.productName || m.product?.name}</p>
                    <p className="text-xs text-gray-400">{m.productId || m.product?.productId}</p>
                  </td>
                  <td>{typeBadge(m.type)}</td>
                  <td>
                    <span className={clsx('font-bold text-sm', m.quantity > 0 ? 'text-green-600' : 'text-red-600')}>
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                    </span>
                  </td>
                  <td className="text-gray-500 font-medium">{m.balanceBefore}</td>
                  <td className="font-extrabold text-gray-900">{m.balanceAfter}</td>
                  <td className="text-xs font-mono text-gray-600">{m.reference || '-'}</td>
                  <td className="text-xs text-gray-500">
                    {m.reason && <p className="font-medium text-gray-700">{m.reason}</p>}
                    {m.createdBy?.name && <p className="text-[10px] text-gray-400">By: {m.createdBy.name}</p>}
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

      {showAdjustModal && (
        <StockAdjustmentModal
          products={products}
          onSave={() => { setShowAdjustModal(false); fetchMovements(); }}
          onClose={() => setShowAdjustModal(false)}
        />
      )}
    </div>
  );
}
