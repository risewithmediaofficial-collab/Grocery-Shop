import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search, Barcode, X, Plus, Minus, ShoppingCart, User, Pause, Play,
  Trash2, Printer, ChevronDown, Check, RotateCcw, Package, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// Customer Selector Modal
function CustomerSelector({ onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const doSearch = useCallback(async (q) => {
    if (!q || !q.trim()) return setResults([]);
    try {
      const res = await api.get(`/customers/search?q=${q.trim()}`);
      setResults(res.data.data || []);
    } catch {}
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(search), 150);
    return () => clearTimeout(t);
  }, [search, doSearch]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-gray-900">Select Customer</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-4">
          <input
            ref={inputRef}
            className="form-input"
            placeholder="Search by name, mobile, or Customer ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="max-h-64 overflow-y-auto px-4 pb-4 space-y-2">
          {results.length === 0 && search.trim().length >= 1 && (
            <p className="text-center text-gray-400 text-sm py-4">No customers found</p>
          )}
          {results.map(c => (
            <div key={c._id} onClick={() => onSelect(c)} className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-500">📱 {c.mobile} · {c.customerId}</p>
                  {c.lastPurchaseAmount > 0 && <p className="text-xs text-gray-400">Last: {fmt(c.lastPurchaseAmount)}</p>}
                </div>
                {c.outstandingBalance > 0 && (
                  <span className="badge-red text-xs">{fmt(c.outstandingBalance)} due</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Payment Modal
function PaymentModal({ grandTotal, customer, onComplete, onClose }) {
  const [method, setMethod] = useState('cash');
  const [cash, setCash] = useState(grandTotal.toString());
  const [upi, setUpi] = useState('0');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const cashAmt = parseFloat(cash) || 0;
  const upiAmt = parseFloat(upi) || 0;
  const paid = method === 'mixed' ? cashAmt + upiAmt : method === 'cash' ? cashAmt : grandTotal;
  const change = paid - grandTotal;

  const METHODS = [
    { value: 'cash', label: '💵 Cash' },
    { value: 'upi', label: '📱 UPI' },
    { value: 'card', label: '💳 Card' },
    { value: 'credit', label: '📋 Credit' },
    { value: 'mixed', label: '🔀 Split' },
  ];

  const handleComplete = async () => {
    if (method === 'credit' && !customer) {
      toast.error('Please select a customer for credit sales');
      return;
    }
    setLoading(true);
    onComplete({ method, cashAmt, upiAmt, paid, change, notes });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
        <div className="bg-primary-700 text-white p-5">
          <p className="text-xs font-semibold text-primary-200 uppercase">Complete Billing</p>
          <div className="flex justify-between items-baseline mt-1">
            <h2 className="text-2xl font-bold">Total Amount</h2>
            <span className="text-3xl font-extrabold">{fmt(grandTotal)}</span>
          </div>
          {customer && <p className="text-xs text-primary-200 mt-1">Customer: {customer.name}</p>}
        </div>

        <div className="p-5 space-y-4">
          {/* Payment Method */}
          <div>
            <label className="form-label">Payment Method</label>
            <div className="grid grid-cols-5 gap-1.5 mt-1">
              {METHODS.map(m => (
                <button key={m.value} type="button" onClick={() => setMethod(m.value)}
                  className={clsx('text-xs py-2 px-1 rounded-lg border font-medium transition-all', method === m.value ? 'bg-primary-50 border-primary-400 text-primary-700 font-bold shadow-2xs' : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {method === 'cash' && (
            <div>
              <label className="form-label">Cash Received</label>
              <input className="form-input text-lg font-semibold" type="number" value={cash} onChange={e => setCash(e.target.value)} />
              {change > 0 && <p className="text-green-600 font-semibold mt-1">Change: {fmt(change)}</p>}
            </div>
          )}

          {method === 'mixed' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Cash (₹)</label>
                <input className="form-input" type="number" value={cash} onChange={e => setCash(e.target.value)} />
              </div>
              <div>
                <label className="form-label">UPI (₹)</label>
                <input className="form-input" type="number" value={upi} onChange={e => setUpi(e.target.value)} />
              </div>
              <p className="col-span-2 text-sm text-gray-600">Paid: {fmt(paid)} / Due: {fmt(grandTotal)}</p>
            </div>
          )}

          {method === 'credit' && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
              ⚠️ This will add {fmt(grandTotal)} to customer's outstanding balance.
              {customer?.outstandingBalance > 0 && <p className="mt-1">Current balance: {fmt(customer.outstandingBalance)}</p>}
            </div>
          )}

          <div>
            <label className="form-label">Notes (optional)</label>
            <input className="form-input" placeholder="Add note..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="p-5 pt-0 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleComplete} disabled={loading} className="btn-primary flex-1 py-3 text-base font-semibold">
            {loading ? 'Processing...' : '✓ Complete Bill'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function POSPage() {
  const { user } = useAuth();
  const cart = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [allCatalogProducts, setAllCatalogProducts] = useState([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedSearchCat, setSelectedSearchCat] = useState('all');
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  const [showCustomer, setShowCustomer] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showHeldModal, setShowHeldModal] = useState(false);
  const [lastInvoice, setLastInvoice] = useState(null);

  const searchRef = useRef(null);
  const searchContainerRef = useRef(null);

  // Load all catalog products for instant dropdown display without typing
  const fetchProductsCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      let res;
      try {
        res = await api.get('/products?status=active&limit=100');
      } catch {
        res = await api.get('/orders/catalog');
      }
      setAllCatalogProducts(res.data.data || []);
    } catch (err) {
      console.error('Failed to load products for POS dropdown', err);
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    fetchProductsCatalog();
  }, [fetchProductsCatalog]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filter products for the dropdown (by search text & category)
  const displayedDropdownProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return allCatalogProducts.filter(p => {
      // 1. Category filter
      const catName = (p.category?.name || p.category || '').toLowerCase();
      const matchCat = selectedSearchCat === 'all' || catName === selectedSearchCat.toLowerCase();
      if (!matchCat) return false;

      // 2. Search query filter
      if (!query) return true;
      const matchName = p.name?.toLowerCase().includes(query);
      const matchSku = p.sku?.toLowerCase().includes(query);
      const matchBarcode = p.barcode?.includes(query);
      const matchBrand = p.brand?.name?.toLowerCase().includes(query);
      return matchName || matchSku || matchBarcode || matchBrand;
    });
  }, [allCatalogProducts, searchQuery, selectedSearchCat]);

  // Barcode scan (Enter key from scanner)
  const handleBarcodeScan = async (barcode) => {
    try {
      const res = await api.get(`/products/barcode/${barcode}`);
      if (res.data.data) {
        cart.addItem(res.data.data);
        setSearchQuery('');
        setShowProductDropdown(false);
        toast.success(`Added: ${res.data.data.name}`);
      }
    } catch {
      toast.error('Product not found for this barcode');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (searchQuery && displayedDropdownProducts.length === 1) {
        // Add single match
        cart.addItem(displayedDropdownProducts[0]);
        toast.success(`Added: ${displayedDropdownProducts[0].name}`);
        setSearchQuery('');
        setShowProductDropdown(false);
      } else if (searchQuery && displayedDropdownProducts.length === 0) {
        handleBarcodeScan(searchQuery);
      }
    } else if (e.key === 'Escape') {
      setShowProductDropdown(false);
    }
  };

  const handleSelectProductFromDropdown = (prod) => {
    cart.addItem(prod);
    toast.success(`Added: ${prod.name}`);
    // Keep search focused so cashier can continue adding rapidly
    searchRef.current?.focus();
  };

  const completeSale = async ({ method, cashAmt, upiAmt, paid, change, notes }) => {
    try {
      const items = cart.cartItems.map(item => ({
        product: item._id,
        quantity: item.quantity,
        sellingPrice: item.customPrice || item.sellingPrice,
        discount: item.discount || 0,
        discountType: item.discountType || 'percent',
      }));

      const paymentDetails = method === 'mixed'
        ? [{ method: 'cash', amount: cashAmt }, { method: 'upi', amount: upiAmt }]
        : [{ method, amount: paid }];

      const res = await api.post('/sales', {
        customerId: cart.customer?._id,
        items,
        discount: cart.discount,
        paymentMethod: method,
        paymentDetails,
        amountPaid: paid,
        notes,
      });

      setLastInvoice(res.data.data);
      cart.clearCart();
      setShowPayment(false);
      toast.success(`Bill completed! Invoice: ${res.data.data.invoiceNumber}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete sale');
    }
  };

  const repeatLastPurchase = async (customerId) => {
    try {
      const res = await api.get(`/customers/${customerId}/purchases?limit=1`);
      const lastSale = res.data.data?.[0];
      if (!lastSale) return toast.error('No previous purchase found');
      cart.loadFromSale(lastSale.items);
      toast.success('Loaded last purchase into cart');
    } catch { toast.error('Could not load last purchase'); }
  };

  const CATEGORY_TABS = [
    { key: 'all', label: '🛍️ All Items' },
    { key: 'food', label: '🍚 Food' },
    { key: 'beverages', label: '🥤 Beverages' },
    { key: 'snacks', label: '🍿 Snacks' },
    { key: 'household', label: '🧼 Household' },
  ];

  return (
    <div className="flex h-full gap-0">
      {/* Left: Product Search + Cart */}
      <div className="flex-1 flex flex-col min-w-0 p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart size={20} className="text-primary-600" /> POS Billing
          </h1>
          <div className="ml-auto flex items-center gap-2">
            {cart.heldBills.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowHeldModal(true)}
                  className="btn-secondary btn-sm gap-1 bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 font-semibold"
                  title="View and resume held bills from Database"
                >
                  <Pause size={14} /> Held Bills ({cart.heldBills.length})
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search Bar with Instant Click Dropdown */}
        <div ref={searchContainerRef} className="relative z-20">
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchRef}
              autoFocus
              className="form-input pl-10 pr-10 py-3 text-base font-medium rounded-xl border-gray-300 focus:border-primary-500 focus:ring-primary-500 shadow-2xs"
              placeholder="Click to browse products or type/scan barcode..."
              value={searchQuery}
              onFocus={() => setShowProductDropdown(true)}
              onClick={() => setShowProductDropdown(true)}
              onChange={e => {
                setSearchQuery(e.target.value);
                setShowProductDropdown(true);
              }}
              onKeyDown={handleKeyDown}
            />
            {searchQuery ? (
              <button
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                onClick={() => {
                  setSearchQuery('');
                  searchRef.current?.focus();
                }}
              >
                <X size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowProductDropdown(prev => !prev)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <ChevronDown size={18} className={clsx('transition-transform', showProductDropdown && 'rotate-180')} />
              </button>
            )}
          </div>

          {/* Instant Dropdown displaying all available products upon click */}
          {showProductDropdown && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 mt-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              {/* Category Quick Filter Pills inside Dropdown */}
              <div className="flex items-center gap-1.5 p-2.5 bg-gray-50 border-b border-gray-200 overflow-x-auto">
                {CATEGORY_TABS.map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setSelectedSearchCat(tab.key)}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer',
                      selectedSearchCat === tab.key
                        ? 'bg-primary-600 text-white shadow-2xs'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
                <span className="ml-auto text-[11px] font-semibold text-gray-400 pr-2 whitespace-nowrap">
                  {displayedDropdownProducts.length} items
                </span>
              </div>

              {/* Products List in Dropdown */}
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                {loadingCatalog ? (
                  <div className="p-6 text-center text-xs text-gray-400">Loading product catalog...</div>
                ) : displayedDropdownProducts.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <Package size={28} className="mx-auto mb-1.5 opacity-40" />
                    <p className="text-xs font-bold text-gray-600">No products found</p>
                    <p className="text-[11px] mt-0.5">Try changing search query or category filter</p>
                  </div>
                ) : (
                  displayedDropdownProducts.map(p => {
                    const inStock = p.currentStock > 0;
                    const catName = p.category?.name || p.category || 'Grocery';
                    const unitName = p.unit?.symbol || p.unit?.name || 'unit';

                    return (
                      <div
                        key={p._id}
                        onClick={() => handleSelectProductFromDropdown(p)}
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-primary-50/50 cursor-pointer transition-colors group"
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-gray-900 group-hover:text-primary-700 transition-colors truncate">
                              {p.name}
                            </p>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              {catName}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                            <span className="font-mono text-[11px] text-gray-400">{p.sku || p.barcode}</span>
                            <span>•</span>
                            <span className={clsx('font-semibold text-xs', inStock ? 'text-green-600' : 'text-red-500')}>
                              {inStock ? `In Stock: ${p.currentStock} ${unitName}` : 'Out of stock'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 text-right">
                          <div>
                            <p className="font-extrabold text-primary-700 text-base">₹{p.sellingPrice}</p>
                            {p.mrp > p.sellingPrice && (
                              <p className="text-[10px] text-gray-400 line-through">MRP ₹{p.mrp}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            className="w-8 h-8 rounded-lg bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-all cursor-pointer"
                            title="Add to cart"
                          >
                            <Plus size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 card overflow-hidden flex flex-col">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
            <div className="col-span-5">Product</div>
            <div className="col-span-2 text-center">Qty</div>
            <div className="col-span-2 text-right">Rate</div>
            <div className="col-span-2 text-right">Total</div>
            <div className="col-span-1"></div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {cart.cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-300">
                <ShoppingCart size={40} />
                <p className="text-sm mt-2 font-bold text-gray-600">Cart is empty</p>
                <p className="text-xs text-gray-400 mt-0.5">Click the search bar above to browse and add products</p>
              </div>
            ) : cart.cartItems.map((item) => (
              <div key={item._id} className="grid grid-cols-12 gap-2 items-center px-4 py-2.5 border-b border-gray-50 hover:bg-gray-50 group">
                <div className="col-span-5">
                  <p className="font-medium text-gray-900 text-sm leading-tight">{item.name}</p>
                  <p className="text-xs text-gray-400">GST: {item.gstRate}%</p>
                </div>
                <div className="col-span-2 flex items-center justify-center gap-1">
                  <button onClick={() => cart.updateItem(item._id, 'quantity', Math.max(1, item.quantity - 1))} className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 cursor-pointer">
                    <Minus size={12} />
                  </button>
                  <input
                    type="number"
                    className="w-10 text-center text-sm font-semibold border border-gray-200 rounded-md py-0.5"
                    value={item.quantity}
                    onChange={e => cart.updateItem(item._id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                  />
                  <button onClick={() => cart.updateItem(item._id, 'quantity', item.quantity + 1)} className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 cursor-pointer">
                    <Plus size={12} />
                  </button>
                </div>
                <div className="col-span-2 text-right">
                  <input
                    type="number"
                    className="w-20 text-right text-sm font-semibold border border-gray-200 rounded-md py-0.5 px-1"
                    value={item.customPrice || item.sellingPrice}
                    onChange={e => cart.updateItem(item._id, 'customPrice', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="col-span-2 text-right font-semibold text-gray-900 text-sm">
                  {fmt((item.customPrice || item.sellingPrice) * item.quantity)}
                </div>
                <div className="col-span-1 text-right">
                  <button onClick={() => cart.removeItem(item._id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Summary Panel */}
      <div className="w-80 border-l border-gray-200 flex flex-col bg-white">
        {/* Customer */}
        <div className="p-4 border-b border-gray-100">
          {cart.customer ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm">
                {cart.customer.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 truncate">{cart.customer.name}</p>
                <p className="text-xs text-gray-500">{cart.customer.mobile}</p>
                {cart.customer.outstandingBalance > 0 && (
                  <p className="text-xs text-red-500">Due: {fmt(cart.customer.outstandingBalance)}</p>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => setShowCustomer(true)} className="text-xs text-primary-600 hover:underline cursor-pointer">Change</button>
                <button onClick={() => cart.setCustomer(null)} className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer">Remove</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowCustomer(true)} className="btn-outline w-full gap-2 cursor-pointer">
              <User size={15} /> Select Customer
            </button>
          )}

          {/* Quick actions for regular customers */}
          {cart.customer && (
            <button onClick={() => repeatLastPurchase(cart.customer._id)} className="mt-2 w-full btn-ghost btn-sm gap-1 text-xs text-primary-600 cursor-pointer">
              <RotateCcw size={12} /> Repeat Last Purchase
            </button>
          )}
        </div>

        {/* Totals */}
        <div className="p-4 space-y-2 border-b border-gray-100">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal ({cart.cartItems.length} items)</span>
            <span>{fmt(cart.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Tax (GST)</span>
            <span>{fmt(cart.totalTax)}</span>
          </div>
          {cart.discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-{fmt(cart.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-gray-500">
            <span>Round Off</span>
            <span>{fmt(cart.roundOff)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <span className="font-bold text-gray-900 text-base">GRAND TOTAL</span>
            <span className="font-bold text-primary-700 text-2xl">{fmt(cart.grandTotal)}</span>
          </div>
        </div>

        {/* Discount */}
        <div className="px-4 py-3 border-b border-gray-100">
          <label className="form-label">Discount (₹)</label>
          <input
            type="number"
            className="form-input"
            placeholder="0"
            value={cart.discount || ''}
            onChange={e => cart.setDiscount(parseFloat(e.target.value) || 0)}
          />
        </div>

        {/* Actions */}
        <div className="p-4 space-y-2 mt-auto">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                if (cart.cartItems.length > 0) {
                  cart.holdBill();
                } else {
                  toast.error('Cart is empty');
                }
              }}
              className="btn-secondary btn-sm gap-1 cursor-pointer"
            >
              <Pause size={13} /> Hold
            </button>
            <button onClick={() => { if (window.confirm('Clear cart?')) cart.clearCart(); }} className="btn-secondary btn-sm gap-1 text-red-500 hover:text-red-600 cursor-pointer">
              <Trash2 size={13} /> Clear
            </button>
          </div>
          <button
            onClick={() => { if (cart.cartItems.length === 0) return toast.error('Cart is empty'); setShowPayment(true); }}
            className="btn-primary w-full py-4 text-base font-bold gap-2 cursor-pointer"
          >
            <Check size={18} /> COMPLETE BILL
          </button>
        </div>

        {/* Last Invoice */}
        {lastInvoice && (
          <div className="px-4 pb-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p className="text-xs font-semibold text-green-700">Last: {lastInvoice.invoiceNumber}</p>
              <p className="text-xs text-green-600">{fmt(lastInvoice.grandTotal)} · {lastInvoice.paymentMethod}</p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCustomer && <CustomerSelector onSelect={(c) => { cart.setCustomer(c); setShowCustomer(false); }} onClose={() => setShowCustomer(false)} />}
      {showPayment && <PaymentModal grandTotal={cart.grandTotal} customer={cart.customer} onComplete={completeSale} onClose={() => setShowPayment(false)} />}
      
      {/* Held Bills Modal */}
      {showHeldModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowHeldModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div>
                <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                  <Pause size={18} className="text-amber-600" /> Held Bills in DB ({cart.heldBills.length})
                </h3>
                <p className="text-xs text-gray-500">Stored persistently in MongoDB database</p>
              </div>
              <button onClick={() => setShowHeldModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {cart.heldBills.length === 0 ? (
                <p className="text-center text-gray-400 py-6 text-sm">No held bills found in database</p>
              ) : (
                cart.heldBills.map((bill) => (
                  <div key={bill._id || bill.id} className="p-3 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-between hover:border-primary-300">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-primary-700">{bill.billNumber || 'HELD'}</span>
                        <p className="font-semibold text-sm text-gray-900">
                          {bill.customer?.name || bill.customerName ? `👤 ${bill.customer?.name || bill.customerName}` : '🛒 Walk-in'}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {bill.items?.length || 0} items · Total: ₹{bill.grandTotal} · {new Date(bill.createdAt || bill.heldAt || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          cart.resumeBill(bill._id || bill.id);
                          setShowHeldModal(false);
                        }}
                        className="btn-primary btn-sm text-xs font-semibold cursor-pointer"
                      >
                        Resume
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete held bill ${bill.billNumber || ''}?`)) {
                            cart.deleteHeldBill(bill._id || bill.id);
                          }
                        }}
                        className="btn-icon btn-ghost btn-sm text-red-500 hover:bg-red-50 cursor-pointer"
                        title="Delete Held Bill"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
