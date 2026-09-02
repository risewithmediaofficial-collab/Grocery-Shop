import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  Plus, Search, Filter, Package, Edit, Trash2, BarChart2,
  Eye, AlertTriangle, Layers, CheckCircle, Tag, ShoppingBag, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const GST_RATES = [0, 5, 12, 18, 28];

const CATEGORY_ICONS = {
  'food': '🍚',
  'beverages': '🥤',
  'snacks': '🍿',
  'household': '🧼',
  'personal care': '🧴',
};

const CATEGORY_BADGES = {
  'food': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'beverages': 'bg-blue-100 text-blue-800 border-blue-200',
  'snacks': 'bg-amber-100 text-amber-800 border-amber-200',
  'household': 'bg-purple-100 text-purple-800 border-purple-200',
};

function ProductForm({ product, categories, units, brands, onSave, onClose, defaultCategory = '' }) {
  const [form, setForm] = useState(() => {
    if (product) {
      return {
        ...product,
        category: product.category?._id || (typeof product.category === 'string' ? product.category : '') || '',
        subCategory: product.subCategory?._id || (typeof product.subCategory === 'string' ? product.subCategory : '') || '',
        unit: product.unit?._id || (typeof product.unit === 'string' ? product.unit : '') || '',
        brand: product.brand?._id || (typeof product.brand === 'string' ? product.brand : '') || '',
      };
    }
    return {
      name: '', sku: '', barcode: '', category: defaultCategory, subCategory: '', brand: '', unit: '',
      purchasePrice: '', sellingPrice: '', mrp: '', wholesalePrice: '',
      hsnCode: '', gstRate: 5, taxType: 'exclusive',
      openingStock: 0, minimumStock: 0, reorderLevel: 0, maximumStock: 0,
      batchTracking: false, expiryTracking: false, status: 'active',
    };
  });
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Load subcategories when category changes
  useEffect(() => {
    if (form.category) {
      api.get(`/categories/subcategories?category=${form.category}`)
        .then(res => setSubCategories(res.data.data || []))
        .catch(() => setSubCategories([]));
    } else {
      setSubCategories([]);
    }
  }, [form.category]);

  const profitMargin = useMemo(() => {
    const buy = parseFloat(form.purchasePrice) || 0;
    const sell = parseFloat(form.sellingPrice) || 0;
    if (sell <= 0 || buy <= 0) return null;
    const margin = ((sell - buy) / sell) * 100;
    const profit = sell - buy;
    return { margin: margin.toFixed(1), profit: profit.toFixed(2) };
  }, [form.purchasePrice, form.sellingPrice]);

  const discountInfo = useMemo(() => {
    const mrp = parseFloat(form.mrp) || 0;
    const sell = parseFloat(form.sellingPrice) || 0;
    if (mrp <= 0 || sell <= 0) return null;
    if (sell < mrp) {
      const discountAmt = mrp - sell;
      const discountPct = ((discountAmt / mrp) * 100).toFixed(1);
      return { discountAmt: discountAmt.toFixed(2), discountPct, type: 'discount' };
    }
    if (sell === mrp) return { type: 'equal' };
    return { type: 'warning', diff: (sell - mrp).toFixed(2) };
  }, [form.mrp, form.sellingPrice]);

  const [showReductionPrompt, setShowReductionPrompt] = useState(false);
  const [reductionReason, setReductionReason] = useState('Mistakenly Added / Entry Error');
  const [reductionNote, setReductionNote] = useState('');

  const saveProduct = async (payload) => {
    setLoading(true);
    try {
      if (product) {
        await api.put(`/products/${product._id}`, payload);
        toast.success('Product updated successfully');
      } else {
        await api.post('/products', payload);
        toast.success('Product created successfully');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Product name is required');
    if (!form.category) return toast.error('Please select a category');
    if (!form.sellingPrice) return toast.error('Selling price is required');

    // Detect if stock is manually reduced on existing product
    const incomingStock = form.currentStock !== undefined && form.currentStock !== '' ? Number(form.currentStock) : undefined;
    const oldStock = Number(product?.currentStock || 0);
    if (product && incomingStock !== undefined && incomingStock < oldStock) {
      setShowReductionPrompt(true);
      return;
    }

    await saveProduct(form);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] my-auto shadow-2xl flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0 bg-gradient-to-r from-gray-50 to-white">
          <div>
            <h2 className="font-extrabold text-lg text-gray-900">{product ? 'Edit Product' : 'Add New Grocery Product'}</h2>
            <p className="text-xs text-gray-500">Structured inventory data entry, MRP & Selling Price</p>
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
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Section 1: Category & Basic Info */}
          <div>
            <h3 className="text-xs font-bold text-primary-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Tag size={13} /> 1. Category & Classification
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="form-label font-bold text-xs">Primary Category *</label>
                <select
                  className="form-select font-semibold"
                  required
                  value={form.category}
                  onChange={e => {
                    set('category', e.target.value);
                    set('subCategory', '');
                  }}
                >
                  <option value="">-- Choose Category --</option>
                  {categories.map(c => {
                    const icon = CATEGORY_ICONS[c.name.toLowerCase()] || '📦';
                    return (
                      <option key={c._id} value={c._id}>
                        {icon} {c.name}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="form-label text-xs">Sub-Category</label>
                <select
                  className="form-select"
                  value={form.subCategory}
                  onChange={e => set('subCategory', e.target.value)}
                  disabled={!form.category || subCategories.length === 0}
                >
                  <option value="">
                    {form.category ? (subCategories.length > 0 ? '-- Select Subcategory --' : 'No Subcategories') : 'Select Category First'}
                  </option>
                  {subCategories.map(s => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="form-label font-bold text-xs">Product Name *</label>
                <input
                  className="form-input text-sm font-medium"
                  required
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="e.g. Sona Masoori Rice, Bisleri 1L, Good Day, Surf Excel"
                />
              </div>

              <div>
                <label className="form-label text-xs">Unit of Measurement *</label>
                <select className="form-select" required value={form.unit} onChange={e => set('unit', e.target.value)}>
                  <option value="">-- Select Unit --</option>
                  {units.map(u => (
                    <option key={u._id} value={u._id}>{u.name} ({u.symbol})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label text-xs">Brand</label>
                <select className="form-select" value={form.brand} onChange={e => set('brand', e.target.value)}>
                  <option value="">-- Optional Brand --</option>
                  {brands.map(b => (
                    <option key={b._id} value={b._id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label text-xs">SKU Code</label>
                <input className="form-input" value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="e.g. RICE-001" />
              </div>

              <div>
                <label className="form-label text-xs">Barcode (for POS Scanner)</label>
                <input className="form-input font-mono text-xs" value={form.barcode} onChange={e => set('barcode', e.target.value)} placeholder="8901234000001" />
              </div>
            </div>
          </div>

          {/* Section 2: Pricing, MRP & Selling Price Options */}
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-primary-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>💰 2. MRP & Selling Price Options</span>
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                {profitMargin && (
                  <span className={clsx(
                    'text-xs font-bold px-2.5 py-0.5 rounded-full border',
                    parseFloat(profitMargin.margin) >= 15 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                  )}>
                    Margin: {profitMargin.margin}% (+₹{profitMargin.profit})
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col">
                <label className="form-label text-xs font-bold text-gray-700 h-6 flex items-center">
                  MRP (Printed Price ₹) *
                </label>
                <input
                  className="form-input font-bold text-gray-800"
                  type="number"
                  step="0.01"
                  value={form.mrp}
                  onChange={e => set('mrp', e.target.value)}
                  placeholder="e.g. 120.00"
                />
                <span className="text-[11px] text-gray-400 mt-1">Max Retail Price</span>
              </div>

              <div className="flex flex-col">
                <label className="form-label text-xs font-bold text-primary-900 h-6 flex items-center">
                  Selling Price (POS Rate ₹) *
                </label>
                <input
                  className="form-input font-extrabold text-primary-700 bg-primary-50/40 border-primary-400 focus:border-primary-600 focus:ring-primary-500"
                  type="number"
                  step="0.01"
                  required
                  value={form.sellingPrice}
                  onChange={e => set('sellingPrice', e.target.value)}
                  placeholder="e.g. 110.00"
                />
                <span className="text-[11px] text-primary-600 font-medium mt-1">Billed to customer</span>
              </div>

              <div className="flex flex-col">
                <label className="form-label text-xs font-bold text-gray-700 h-6 flex items-center">
                  Purchase / Cost Price (₹) *
                </label>
                <input
                  className="form-input font-semibold"
                  type="number"
                  step="0.01"
                  required
                  value={form.purchasePrice}
                  onChange={e => set('purchasePrice', e.target.value)}
                  placeholder="e.g. 90.00"
                />
                <span className="text-[11px] text-gray-400 mt-1">Store buying cost</span>
              </div>
            </div>

            {/* Live Discount & Customer Savings Badge */}
            {discountInfo && (
              <div className="mt-2.5 p-2.5 rounded-xl border text-xs flex items-center justify-between">
                {discountInfo.type === 'discount' && (
                  <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 border-emerald-200 w-full p-2 rounded-lg font-semibold">
                    <span className="text-base">🎉</span>
                    <span>Customer Discount: <strong>₹{discountInfo.discountAmt}</strong> per unit ({discountInfo.discountPct}% OFF MRP)</span>
                  </div>
                )}
                {discountInfo.type === 'equal' && (
                  <div className="text-gray-600 bg-gray-50 border-gray-200 w-full p-2 rounded-lg font-medium">
                    <span>🏷️ Selling at standard MRP (₹{form.mrp}) · 0% discount</span>
                  </div>
                )}
                {discountInfo.type === 'warning' && (
                  <div className="text-amber-800 bg-amber-50 border-amber-200 w-full p-2 rounded-lg font-medium">
                    <span>⚠️ Selling price exceeds MRP by ₹{discountInfo.diff}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: GST & Tax */}
          <div className="pt-3 border-t border-gray-100">
            <h3 className="text-xs font-bold text-primary-800 uppercase tracking-wider mb-3">
              🏛️ 3. GST & Tax Rates
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="form-label text-xs">HSN Code</label>
                <input className="form-input font-mono text-xs" value={form.hsnCode} onChange={e => set('hsnCode', e.target.value)} placeholder="e.g. 1006" />
              </div>
              <div>
                <label className="form-label text-xs">GST Rate (%)</label>
                <select className="form-select font-semibold" value={form.gstRate} onChange={e => set('gstRate', Number(e.target.value))}>
                  {GST_RATES.map(r => <option key={r} value={r}>{r}% GST</option>)}
                </select>
              </div>
              <div>
                <label className="form-label text-xs">Tax Calculation Type</label>
                <select className="form-select" value={form.taxType} onChange={e => set('taxType', e.target.value)}>
                  <option value="exclusive">Tax Exclusive</option>
                  <option value="inclusive">Tax Inclusive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Stock & Low Stock Alert */}
          <div className="pt-3 border-t border-gray-100">
            <h3 className="text-xs font-bold text-primary-800 uppercase tracking-wider mb-3">
              📦 4. Stock & Low Stock Alert
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label text-xs font-bold text-gray-700">
                  {product ? 'Current Available Stock' : 'Initial Stock to Add (Opening Qty)'}
                </label>
                <input
                  className="form-input font-bold text-base"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={product ? (form.currentStock ?? 0) : (form.openingStock ?? 0)}
                  onChange={e => set(product ? 'currentStock' : 'openingStock', e.target.value === '' ? '' : Number(e.target.value))}
                />
                <p className="text-[11px] text-gray-500 mt-1">Quantity currently present in store</p>
              </div>
              <div>
                <label className="form-label text-xs font-bold text-gray-700">
                  Low Stock Alert Level (Alert below)
                </label>
                <input
                  className="form-input font-bold text-base"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.reorderLevel ?? 0}
                  onChange={e => {
                    const val = e.target.value === '' ? '' : Number(e.target.value);
                    set('reorderLevel', val);
                    set('minimumStock', val);
                  }}
                />
                <p className="text-[11px] text-gray-500 mt-1">Notify and trigger alert when stock falls to this number</p>
              </div>
            </div>
          </div>
          </div>

          {/* Modal Footer with Actions */}
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 shrink-0">
            <button type="button" onClick={onClose} className="btn-secondary py-2.5 px-5 text-xs font-bold cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary py-2.5 px-6 text-xs font-bold gap-2 shadow-md cursor-pointer">
              <CheckCircle size={16} />
              {loading ? 'Saving...' : product ? 'Update Product' : 'Add to Inventory'}
            </button>
          </div>
        </form>

        {/* Stock Reduction Reason Prompt Modal */}
        {showReductionPrompt && (
          <div className="fixed inset-0 bg-black/75 z-[10000] flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-amber-300 animate-in zoom-in-95 duration-150">
              <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white p-4.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold shrink-0">
                  <AlertTriangle size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">Stock Reduction Reason Required</h3>
                  <p className="text-xs text-amber-100 mt-0.5">Logged permanently to Admin Security Audit Trail</p>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-xs space-y-1.5">
                  <div className="flex justify-between font-bold text-amber-950">
                    <span>Product:</span>
                    <span className="truncate max-w-[200px]">{product?.name}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Current In-Store Stock:</span>
                    <span className="font-bold text-gray-900">{product?.currentStock} {product?.unit?.symbol || ''}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>New Reduced Stock:</span>
                    <span className="font-bold text-red-600">{form.currentStock} {product?.unit?.symbol || ''}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-amber-200/80 font-black text-red-700">
                    <span>Total Unbilled Reduction:</span>
                    <span>-{Number(product?.currentStock || 0) - Number(form.currentStock)} {product?.unit?.symbol || ''}</span>
                  </div>
                </div>

                <div>
                  <label className="form-label text-xs font-bold text-gray-800 mb-1 block">
                    Why is stock being reduced without a customer bill? *
                  </label>
                  <select
                    className="form-select text-xs font-semibold w-full"
                    value={reductionReason}
                    onChange={e => setReductionReason(e.target.value)}
                  >
                    <option value="Mistakenly Added / Entry Error">📝 Mistakenly Added / Entry Error (e.g. wrong inward count)</option>
                    <option value="Damaged / Broken in Store">🗑️ Damaged / Broken / Leaked in store</option>
                    <option value="Expired / Spoiled Stock">⏳ Expired / Spoiled / Rotten</option>
                    <option value="Lost / Suspected Theft (Shrinkage)">🔍 Lost / Suspected Theft (Shrinkage)</option>
                    <option value="Returned to Supplier">↩️ Returned to Supplier / Vendor</option>
                    <option value="Internal Store Consumption">🏢 Internal Store Consumption / Sampling</option>
                    <option value="Physical Count Discrepancy">⚖️ Physical Count Discrepancy</option>
                    <option value="Other Reason">✏️ Other Reason</option>
                  </select>
                </div>

                <div>
                  <label className="form-label text-xs font-bold text-gray-700 mb-1 block">
                    Explanation Note for Admin (Optional / Details)
                  </label>
                  <textarea
                    rows={2}
                    className="form-input text-xs w-full"
                    placeholder="e.g. Mistakenly entered 20 instead of 10 during yesterday's inward batch"
                    value={reductionNote}
                    onChange={e => setReductionNote(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReductionPrompt(false)}
                    className="btn-secondary py-2 px-4 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setShowReductionPrompt(false);
                      await saveProduct({
                        ...form,
                        stockReductionReason: reductionReason,
                        stockReductionNote: reductionNote,
                      });
                    }}
                    className="btn-primary py-2 px-4.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 shadow-md cursor-pointer"
                  >
                    Confirm & Update Stock
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default function ProductsPage() {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('all'); // 'all' or categoryId
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Load Categories, Units, Brands
  useEffect(() => {
    Promise.all([
      api.get('/categories/categories'),
      api.get('/categories/units'),
      api.get('/categories/brands'),
    ]).then(([c, u, b]) => {
      setCategories(c.data.data || []);
      setUnits(u.data.data || []);
      setBrands(b.data.data || []);
    }).catch(console.error);
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (search) params.set('search', search);
      if (selectedCategoryTab && selectedCategoryTab !== 'all') {
        params.set('category', selectedCategoryTab);
      }
      const res = await api.get(`/products?${params}`);
      setProducts(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategoryTab, page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleDelete = async (id) => {
    if (!window.confirm('Discontinue this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Product discontinued');
      fetchProducts();
    } catch {
      toast.error('Failed to discontinue product');
    }
  };

  const stockStatus = (p) => {
    if (p.currentStock === 0) return <span className="badge-red">Out of Stock</span>;
    if (p.currentStock <= p.reorderLevel) return <span className="badge-yellow">Low Stock</span>;
    return <span className="badge-green">In Stock</span>;
  };

  // Structured Tab List: All Items, Food, Beverages, Snacks, Household, etc.
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

  return (
    <div className="page-container max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Products & Inventory Catalog</h1>
          <p className="page-subtitle">{total} total items organized by category</p>
        </div>
        <button
          className="btn-primary gap-1.5 shadow-sm"
          onClick={() => { setEditProduct(null); setShowForm(true); }}
        >
          <Plus size={16} /> Add Product
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
                setPage(1);
              }}
              className={clsx(
                'px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap transition-all duration-150 border cursor-pointer',
                isActive
                  ? 'bg-primary-600 text-white border-primary-600 shadow-xs scale-100'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
              )}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Search Bar & Stats */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-56">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="form-input pl-10 pr-9 py-2 text-xs sm:text-sm"
            placeholder="Search by name, SKU, barcode..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Product Catalog Table */}
      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Category</th>
                <th>SKU / Barcode</th>
                <th>Purchase</th>
                <th>MRP & Selling Price</th>
                <th>GST</th>
                <th>In Stock</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(6).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={9}><div className="skeleton h-6 w-full" /></td></tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400">
                    <Package size={36} className="mx-auto mb-2 opacity-40 text-gray-300" />
                    <p className="font-bold text-gray-600 text-sm">No products in this category</p>
                    <p className="text-xs text-gray-400 mt-1">Click "Add Product" above to add products to this category.</p>
                  </td>
                </tr>
              ) : products.map(p => {
                const catSlug = (p.category?.name || '').toLowerCase();
                const badgeStyle = CATEGORY_BADGES[catSlug] || 'bg-gray-100 text-gray-800 border-gray-200';
                const catIcon = CATEGORY_ICONS[catSlug] || '📦';

                return (
                  <tr key={p._id}>
                    <td>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{p.name}</p>
                        <p className="text-[11px] text-gray-400 font-mono">{p.productId}</p>
                      </div>
                    </td>
                    <td>
                      <span className={clsx('badge text-[11px] font-bold border gap-1', badgeStyle)}>
                        <span>{catIcon}</span>
                        <span>{p.category?.name || 'Uncategorized'}</span>
                      </span>
                    </td>
                    <td className="text-xs text-gray-500 font-mono">
                      {p.sku && <p>{p.sku}</p>}
                      {p.barcode && <p className="text-[10px] text-gray-400">{p.barcode}</p>}
                    </td>
                    <td className="font-medium text-gray-600">{fmt(p.purchasePrice)}</td>
                    <td>
                      <div>
                        <p className="font-extrabold text-primary-700 text-sm">
                          {fmt(p.sellingPrice)}
                          {p.unit?.symbol && <span className="text-[10px] text-gray-400 font-normal"> /{p.unit.symbol}</span>}
                        </p>
                        {p.mrp > 0 && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-gray-400 line-through">MRP {fmt(p.mrp)}</span>
                            {p.mrp > p.sellingPrice && (
                              <span className="text-[9px] font-bold px-1 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                                {(((p.mrp - p.sellingPrice) / p.mrp) * 100).toFixed(0)}% OFF
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td><span className="badge-blue text-xs">{p.gstRate}%</span></td>
                    <td>
                      <div className="flex items-center gap-1">
                        {p.currentStock <= p.reorderLevel && p.currentStock > 0 && (
                          <AlertTriangle size={13} className="text-yellow-500 shrink-0" />
                        )}
                        <span className={clsx(
                          'font-extrabold text-sm',
                          p.currentStock === 0 ? 'text-red-600' : p.currentStock <= p.reorderLevel ? 'text-yellow-600' : 'text-gray-900'
                        )}>
                          {p.currentStock} {p.unit?.symbol || ''}
                        </span>
                      </div>
                    </td>
                    <td>{stockStatus(p)}</td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditProduct(p); setShowForm(true); }}
                          className="btn-icon btn-ghost btn-sm text-gray-500 hover:text-primary-600"
                          title="Edit Product"
                        >
                          <Edit size={14} />
                        </button>
                        {isAdmin() && (
                          <button
                            onClick={() => handleDelete(p._id)}
                            className="btn-icon btn-ghost btn-sm text-gray-500 hover:text-red-500"
                            title="Discontinue Product"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 50 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-500">
              Showing {Math.min((page - 1) * 50 + 1, total)}–{Math.min(page * 50, total)} of {total} items
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
                disabled={page * 50 >= total}
                className="btn-secondary btn-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {showForm && (
        <ProductForm
          product={editProduct}
          categories={categories}
          units={units}
          brands={brands}
          defaultCategory={selectedCategoryTab !== 'all' ? selectedCategoryTab : ''}
          onSave={() => { setShowForm(false); fetchProducts(); }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
