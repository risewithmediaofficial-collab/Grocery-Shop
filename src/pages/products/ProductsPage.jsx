import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Package, Edit, Trash2, BarChart2, Eye, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const GST_RATES = [0, 5, 12, 18, 28];

function ProductForm({ product, categories, units, brands, onSave, onClose }) {
  const [form, setForm] = useState(product || {
    name: '', sku: '', barcode: '', category: '', brand: '', unit: '',
    purchasePrice: '', sellingPrice: '', mrp: '', wholesalePrice: '',
    hsnCode: '', gstRate: 0, taxType: 'exclusive',
    openingStock: 0, minimumStock: 0, reorderLevel: 0, maximumStock: 0,
    batchTracking: false, expiryTracking: false, status: 'active',
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (product) { await api.put(`/products/${product._id}`, form); toast.success('Product updated'); }
      else { await api.post('/products', form); toast.success('Product created'); }
      onSave();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save product'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 overflow-y-auto p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-2xl mx-auto my-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-lg">{product ? 'Edit Product' : 'Add Product'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Product Info */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Product Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="form-label">Product Name *</label>
                <input className="form-input" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g., Sona Masoori Rice" />
              </div>
              <div>
                <label className="form-label">SKU</label>
                <input className="form-input" value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="RICE-001" />
              </div>
              <div>
                <label className="form-label">Barcode</label>
                <input className="form-input" value={form.barcode} onChange={e => set('barcode', e.target.value)} placeholder="8901234000001" />
              </div>
              <div>
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Unit</label>
                <select className="form-select" value={form.unit} onChange={e => set('unit', e.target.value)}>
                  <option value="">Select Unit</option>
                  {units.map(u => <option key={u._id} value={u._id}>{u.name} ({u.symbol})</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Pricing</h3>
            <div className="grid grid-cols-2 gap-3">
              {[['purchasePrice','Purchase Price *',true],['sellingPrice','Selling Price *',true],['mrp','MRP',false],['wholesalePrice','Wholesale Price',false]].map(([k,l,req]) => (
                <div key={k}>
                  <label className="form-label">{l}</label>
                  <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                  <input className="form-input pl-7" type="number" step="0.01" required={req} value={form[k]} onChange={e => set(k, e.target.value)} placeholder="0.00" /></div>
                </div>
              ))}
            </div>
          </div>

          {/* Tax */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Tax</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="form-label">HSN Code</label>
                <input className="form-input" value={form.hsnCode} onChange={e => set('hsnCode', e.target.value)} placeholder="1006" />
              </div>
              <div>
                <label className="form-label">GST Rate</label>
                <select className="form-select" value={form.gstRate} onChange={e => set('gstRate', Number(e.target.value))}>
                  {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Tax Type</label>
                <select className="form-select" value={form.taxType} onChange={e => set('taxType', e.target.value)}>
                  <option value="exclusive">Exclusive</option>
                  <option value="inclusive">Inclusive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Inventory */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Inventory</h3>
            <div className="grid grid-cols-4 gap-3">
              {[['openingStock','Opening Stock'],['minimumStock','Min Stock'],['reorderLevel','Reorder Level'],['maximumStock','Max Stock']].map(([k,l]) => (
                <div key={k}>
                  <label className="form-label text-xs">{l}</label>
                  <input className="form-input" type="number" value={form[k]} onChange={e => set(k, Number(e.target.value))} />
                </div>
              ))}
            </div>
          </div>

          {/* Tracking */}
          <div className="flex gap-6">
            {[['batchTracking','Batch Tracking'],['expiryTracking','Expiry Tracking']].map(([k,l]) => (
              <label key={k} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form[k]} onChange={e => set(k, e.target.checked)} className="w-4 h-4 accent-primary-600" />
                <span className="text-sm text-gray-700">{l}</span>
              </label>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Saving...' : product ? 'Update Product' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const { isAdmin, isManager } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 30 });
      if (search) params.set('search', search);
      if (catFilter) params.set('category', catFilter);
      const res = await api.get(`/products?${params}`);
      setProducts(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch { toast.error('Failed to load products'); }
    finally { setLoading(false); }
  }, [search, catFilter, page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    Promise.all([
      api.get('/categories/categories'),
      api.get('/categories/units'),
      api.get('/categories/brands'),
    ]).then(([c, u, b]) => {
      setCategories(c.data.data || []);
      setUnits(u.data.data || []);
      setBrands(b.data.data || []);
    });
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Discontinue this product?')) return;
    try { await api.delete(`/products/${id}`); toast.success('Product discontinued'); fetchProducts(); }
    catch { toast.error('Failed to discontinue product'); }
  };

  const stockStatus = (p) => {
    if (p.currentStock === 0) return <span className="badge-red">Out of Stock</span>;
    if (p.currentStock <= p.reorderLevel) return <span className="badge-yellow">Low Stock</span>;
    return <span className="badge-green">In Stock</span>;
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">{total} products total</p>
        </div>
        {(isAdmin() || isManager()) && (
          <button className="btn-primary" onClick={() => { setEditProduct(null); setShowForm(true); }}>
            <Plus size={16} /> Add Product
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="form-input pl-9" placeholder="Search products..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="form-select w-44" value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU / Barcode</th>
                <th>Category</th>
                <th>Purchase</th>
                <th>Selling</th>
                <th>GST</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(8).fill(0).map((_, i) => <tr key={i}><td colSpan={9}><div className="skeleton h-5 w-full" /></td></tr>)
              ) : products.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">
                  <Package size={32} className="mx-auto mb-2 opacity-40" />
                  No products found
                </td></tr>
              ) : products.map(p => (
                <tr key={p._id}>
                  <td>
                    <div>
                      <p className="font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.productId}</p>
                    </div>
                  </td>
                  <td className="text-xs text-gray-500">
                    {p.sku && <p>{p.sku}</p>}
                    {p.barcode && <p className="text-gray-400">{p.barcode}</p>}
                  </td>
                  <td className="text-gray-600">{p.category?.name || '-'}</td>
                  <td className="font-medium">{fmt(p.purchasePrice)}</td>
                  <td className="font-medium text-primary-700">{fmt(p.sellingPrice)}</td>
                  <td><span className="badge-blue">{p.gstRate}%</span></td>
                  <td>
                    <div className="flex items-center gap-1">
                      {p.currentStock <= p.reorderLevel && p.currentStock > 0 && <AlertTriangle size={12} className="text-yellow-500" />}
                      <span className={clsx('font-semibold', p.currentStock === 0 ? 'text-red-600' : p.currentStock <= p.reorderLevel ? 'text-yellow-600' : 'text-gray-900')}>
                        {p.currentStock}
                      </span>
                    </div>
                  </td>
                  <td>{stockStatus(p)}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      {(isAdmin() || isManager()) && (
                        <>
                          <button onClick={() => { setEditProduct(p); setShowForm(true); }} className="btn-icon btn-ghost btn-sm text-gray-500 hover:text-primary-600">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => handleDelete(p._id)} className="btn-icon btn-ghost btn-sm text-gray-500 hover:text-red-500">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
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

      {showForm && <ProductForm product={editProduct} categories={categories} units={units} brands={brands} onSave={() => { setShowForm(false); fetchProducts(); }} onClose={() => setShowForm(false)} />}
    </div>
  );
}
