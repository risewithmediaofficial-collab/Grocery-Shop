import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Warehouse, Plus, Search, Filter, AlertTriangle, ArrowDown,
  ArrowUp, RefreshCw, Layers, CheckCircle, Package, Tag
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';

const CATEGORY_ICONS = {
  'food': '🍚',
  'beverages': '🥤',
  'snacks': '🍿',
  'household': '🧼',
  'personal care': '🧴',
};

function StockAdjustmentModal({ products, categories, defaultCategory = 'all', onSave, onClose }) {
  const [selectedCat, setSelectedCat] = useState(defaultCategory);
  const [productId, setProductId] = useState('');
  const [adjustedQty, setAdjustedQty] = useState('');
  const [type, setType] = useState('correction');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const filteredProducts = useMemo(() => {
    if (selectedCat === 'all') return products;
    return products.filter(p => (p.category?._id || p.category) === selectedCat);
  }, [products, selectedCat]);

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
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] my-auto shadow-2xl flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0 bg-gradient-to-r from-gray-50 to-white">
          <div>
            <h3 className="font-extrabold text-lg text-gray-900">Adjust Stock</h3>
            <p className="text-xs text-gray-500">Changes are logged permanently to the audit ledger</p>
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
            {/* Category Filter for Quick Selection */}
            <div>
              <label className="form-label text-xs font-bold">Category</label>
              <select
                className="form-select text-xs"
                value={selectedCat}
                onChange={e => {
                  setSelectedCat(e.target.value);
                  setProductId('');
                }}
              >
                <option value="all">-- All Categories --</option>
                {categories.map(c => (
                  <option key={c._id} value={c._id}>
                    {CATEGORY_ICONS[c.name.toLowerCase()] || '📦'} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label text-xs font-bold">Select Product *</label>
              <select
                className="form-select font-semibold text-sm"
                required
                value={productId}
                onChange={e => setProductId(e.target.value)}
              >
                <option value="">-- Choose Product ({filteredProducts.length} items) --</option>
                {filteredProducts.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.name} (Current Stock: {p.currentStock} {p.unit?.symbol || ''})
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div className="p-3 bg-primary-50/50 rounded-xl text-xs flex justify-between border border-primary-200">
                <span className="text-primary-800 font-medium">Current Stock Balance:</span>
                <span className="font-extrabold text-primary-900">
                  {selectedProduct.currentStock} {selectedProduct.unit?.symbol || 'units'}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label text-xs font-bold">Adjustment Qty *</label>
                <input
                  type="number"
                  required
                  className="form-input text-sm font-bold"
                  placeholder="e.g. +5 or -2"
                  value={adjustedQty}
                  onChange={e => setAdjustedQty(e.target.value)}
                />
                <p className="text-[10px] text-gray-400 mt-0.5">Positive (+) or Negative (-)</p>
              </div>

              <div>
                <label className="form-label text-xs font-bold">Type</label>
                <select className="form-select text-xs" value={type} onChange={e => setType(e.target.value)}>
                  <option value="correction">Audit Correction</option>
                  <option value="damage">Damaged Goods</option>
                  <option value="expiry">Expired Stock</option>
                  <option value="theft">Lost / Theft</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="form-label text-xs font-bold">Reason * (Mandatory for audit)</label>
              <textarea
                required
                rows={2}
                className="form-input text-xs"
                placeholder="e.g. Physical inventory verification discrepancy"
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </div>
          </div>

          <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 shrink-0">
            <button type="button" onClick={onClose} className="btn-secondary py-2.5 px-5 text-xs font-bold cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary py-2.5 px-6 text-xs font-bold shadow-md cursor-pointer">
              {loading ? 'Adjusting...' : 'Save Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const { isAdmin } = useAuth();
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('all');
  const [typeFilter, setTypeFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Load Categories & Products
  useEffect(() => {
    Promise.all([
      api.get('/categories/categories'),
      api.get('/products?limit=200'),
    ]).then(([catRes, prodRes]) => {
      setCategories(catRes.data.data || []);
      setProducts(prodRes.data.data || []);
    }).catch(console.error);
  }, []);

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

  // Structured Tabs: All Items, Food, Beverages, Snacks, Household
  const structuredTabs = useMemo(() => {
    const defaultOrder = ['food', 'beverages', 'snacks', 'household'];
    const sortedCats = [...categories].sort((a, b) => {
      const idxA = defaultOrder.indexOf(a.name.toLowerCase());
      const idxB = defaultOrder.indexOf(b.name.toLowerCase());
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.name.localeCompare(b.name);
    });

    return [
      { id: 'all', name: 'All Items', icon: '🛍️' },
      ...sortedCats.map(c => ({
        id: c._id,
        name: c.name,
        icon: CATEGORY_ICONS[c.name.toLowerCase()] || '📦',
      }))
    ];
  }, [categories]);

  // Products filtered by currently active category tab
  const productsInCategory = useMemo(() => {
    if (selectedCategoryTab === 'all') return products;
    return products.filter(p => (p.category?._id || p.category) === selectedCategoryTab);
  }, [products, selectedCategoryTab]);

  // Category Stock Stats
  const categoryStats = useMemo(() => {
    const totalQty = productsInCategory.reduce((sum, p) => sum + (p.currentStock || 0), 0);
    const totalVal = productsInCategory.reduce((sum, p) => sum + ((p.currentStock || 0) * (p.purchasePrice || 0)), 0);
    const lowStockCount = productsInCategory.filter(p => p.currentStock <= p.reorderLevel && p.currentStock > 0).length;
    const outOfStockCount = productsInCategory.filter(p => p.currentStock === 0).length;

    return { totalQty, totalVal, lowStockCount, outOfStockCount };
  }, [productsInCategory]);

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
    <div className="page-container max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Stock Ledger & Inventory Management</h1>
          <p className="page-subtitle">Real-time stock ledger, audits, and category-level inventory control</p>
        </div>
        <button
          className="btn-primary gap-1.5 shadow-sm"
          onClick={() => setShowAdjustModal(true)}
        >
          <Plus size={16} /> Adjust Stock
        </button>
      </div>

      {/* Structured Category Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide border-b border-gray-200">
        {structuredTabs.map(tab => {
          const isActive = selectedCategoryTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedCategoryTab(tab.id);
                setProductFilter('');
                setPage(1);
              }}
              className={clsx(
                'px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap transition-all duration-150 border cursor-pointer',
                isActive
                  ? 'bg-primary-600 text-white border-primary-600 shadow-xs'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              )}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Category Stock Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 border-l-4 border-l-primary-500">
          <p className="text-xs text-gray-500 font-medium">Products in Category</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{productsInCategory.length} SKUs</p>
        </div>

        <div className="card p-4 border-l-4 border-l-blue-500">
          <p className="text-xs text-gray-500 font-medium">Total Stock Quantity</p>
          <p className="text-xl font-bold text-blue-700 mt-1">{categoryStats.totalQty} units</p>
        </div>

        <div className="card p-4 border-l-4 border-l-emerald-500">
          <p className="text-xs text-gray-500 font-medium">Inventory Valuation</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">₹{categoryStats.totalVal.toLocaleString('en-IN')}</p>
        </div>

        <div className="card p-4 border-l-4 border-l-amber-500">
          <p className="text-xs text-gray-500 font-medium">Low / Out of Stock</p>
          <p className="text-xl font-bold text-amber-700 mt-1">
            {categoryStats.lowStockCount + categoryStats.outOfStockCount} items
          </p>
        </div>
      </div>

      {/* Filter Ledger Bar */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:max-w-xl">
          <div>
            <label className="form-label text-xs font-bold">Filter by Product</label>
            <select
              className="form-select text-xs"
              value={productFilter}
              onChange={e => { setProductFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Products in Tab ({productsInCategory.length})</option>
              {productsInCategory.map(p => (
                <option key={p._id} value={p._id}>
                  {p.name} (Stock: {p.currentStock})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label text-xs font-bold">Movement Type</label>
            <select
              className="form-select text-xs"
              value={typeFilter}
              onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
            >
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

        <button
          onClick={fetchMovements}
          className="btn-outline btn-sm gap-1.5 text-xs self-end sm:self-center"
          title="Refresh Ledger"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stock Ledger Table */}
      <div className="card overflow-hidden">
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
                <th>Reason / Staff</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(6).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={8}><div className="skeleton h-6 w-full" /></td></tr>
                ))
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    <Warehouse size={36} className="mx-auto mb-2 opacity-40 text-gray-300" />
                    <p className="font-semibold text-gray-600">No stock movement records found</p>
                  </td>
                </tr>
              ) : movements.map(m => (
                <tr key={m._id}>
                  <td className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(m.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                  <td>
                    <p className="font-semibold text-gray-900 text-sm">{m.productName || m.product?.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{m.productId}</p>
                  </td>
                  <td>{typeBadge(m.type)}</td>
                  <td>
                    <span className={clsx(
                      'font-extrabold text-sm flex items-center gap-0.5',
                      m.quantity > 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {m.quantity > 0 ? '+' : ''}{m.quantity}
                    </span>
                  </td>
                  <td className="text-gray-500 font-mono text-xs">{m.balanceBefore}</td>
                  <td className="font-bold text-gray-900 font-mono text-sm">{m.balanceAfter}</td>
                  <td className="font-mono text-xs text-gray-500">{m.referenceNumber || '-'}</td>
                  <td className="text-xs text-gray-600 max-w-xs truncate">{m.reason || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 30 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-500">
              Showing {Math.min((page - 1) * 30 + 1, total)}–{Math.min(page * 30, total)} of {total} records
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary btn-sm"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * 30 >= total}
                className="btn-secondary btn-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      {showAdjustModal && (
        <StockAdjustmentModal
          products={products}
          categories={categories}
          defaultCategory={selectedCategoryTab}
          onSave={() => {
            setShowAdjustModal(false);
            fetchMovements();
            api.get('/products?limit=200').then(res => setProducts(res.data.data || []));
          }}
          onClose={() => setShowAdjustModal(false)}
        />
      )}
    </div>
  );
}
