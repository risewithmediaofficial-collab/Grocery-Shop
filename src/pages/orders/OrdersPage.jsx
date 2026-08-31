import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShoppingCart, Package, CheckCircle, Clock, Search, Plus, Minus,
  X, ExternalLink, RefreshCw, Send, Copy, Phone, MapPin, Eye,
  Loader2, Truck, CheckCheck, FileText, ChevronRight, User, AlertCircle,
  CheckCircle2, Layers, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useCart } from '../../context/CartContext';
import clsx from 'clsx';

export default function OrdersPage() {
  const navigate = useNavigate();
  const cart = useCart();
  const [orders, setOrders] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [viewMode, setViewMode] = useState('admin'); // 'admin' or 'customer'
  const [queueTab, setQueueTab] = useState('active'); // 'active' | 'completed' | 'all'
  const [search, setSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null); // For Order Details Modal
  const [processingOrderId, setProcessingOrderId] = useState(null);

  // Admin Order Creation Draft
  const [customerCart, setCustomerCart] = useState(() => {
    try {
      const saved = localStorage.getItem('columbu_admin_draft_cart');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [customerInfo, setCustomerInfo] = useState({ name: '', mobile: '', address: '', notes: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Sync admin draft cart to localStorage
  useEffect(() => {
    try {
      if (Object.keys(customerCart).length > 0) {
        localStorage.setItem('columbu_admin_draft_cart', JSON.stringify(customerCart));
      } else {
        localStorage.removeItem('columbu_admin_draft_cart');
      }
    } catch {}
  }, [customerCart]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, ordRes] = await Promise.all([
        api.get('/products?status=active&limit=100').catch(() => api.get('/orders/catalog')),
        api.get('/orders').catch(() => ({ data: { data: [] } })),
      ]);
      setCatalog(catRes.data.data || []);
      setOrders(ordRes.data?.data || []);
    } catch (err) {
      console.error('Error loading orders data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Auto-sync incoming orders & status updates between Admin and Cashier every 8 seconds
    const interval = setInterval(() => {
      api.get('/orders').then(res => {
        if (res.data?.data) setOrders(res.data.data);
      }).catch(() => {});
    }, 8000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Structured categories
  const categories = useMemo(() => {
    const defaultOrder = ['food', 'beverages', 'snacks', 'household'];
    const cats = new Set();
    catalog.forEach(p => {
      if (p.category?.name) cats.add(p.category.name);
      else if (typeof p.category === 'string') cats.add(p.category);
    });
    const sorted = Array.from(cats).sort((a, b) => {
      const idxA = defaultOrder.indexOf(a.toLowerCase());
      const idxB = defaultOrder.indexOf(b.toLowerCase());
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
    return ['all', ...sorted];
  }, [catalog]);

  // Active vs Completed Counts
  const activeOrdersCount = useMemo(() => {
    return orders.filter(o => o.status !== 'delivered' && !o.sentToBilling && o.status !== 'cancelled').length;
  }, [orders]);

  const completedOrdersCount = useMemo(() => {
    return orders.filter(o => o.status === 'delivered' || o.sentToBilling === true).length;
  }, [orders]);

  // Filter products for Create Order mode
  const filteredProducts = useMemo(() => {
    return catalog.filter(p => {
      const matchSearch = search.trim() === '' ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.category?.name && p.category.name.toLowerCase().includes(search.toLowerCase()));
      const catName = p.category?.name || p.category || '';
      const matchCat = selectedCategory === 'all' || catName.toLowerCase() === selectedCategory.toLowerCase();
      return matchSearch && matchCat;
    });
  }, [catalog, search, selectedCategory]);

  // Filter orders for Admin mode with Active vs Completed separation
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // 1. Separate Active vs Completed tab
      const isCompleted = o.status === 'delivered' || o.sentToBilling === true;
      if (queueTab === 'active' && isCompleted) return false;
      if (queueTab === 'completed' && !isCompleted) return false;

      // 2. Search query filter
      const q = orderSearch.trim().toLowerCase();
      const matchQuery = q === '' ||
        o.orderNumber?.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
        o.customerMobile?.includes(q) ||
        o.deliveryAddress?.toLowerCase().includes(q);

      // 3. Dropdown status filter
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;

      return matchQuery && matchStatus;
    });
  }, [orders, queueTab, orderSearch, statusFilter]);

  // Cart operations
  const updateQty = (id, delta) => {
    setCustomerCart(prev => {
      const curr = prev[id] || 0;
      const next = Math.max(0, curr + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  };

  const removeCartItem = (id) => {
    setCustomerCart(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const cartEntries = Object.entries(customerCart);
  const totalItemCount = cartEntries.reduce((sum, [, q]) => sum + q, 0);
  const totalEstimatedAmount = cartEntries.reduce((sum, [id, qty]) => {
    const prod = catalog.find(p => p._id === id);
    return sum + ((prod?.sellingPrice || 0) * qty);
  }, 0);

  // Update order workflow status
  const handleUpdateStatus = async (orderId, newStatus) => {
    if (processingOrderId) return;
    setProcessingOrderId(orderId);
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrderDetails?._id === orderId) {
        setSelectedOrderDetails(prev => ({ ...prev, status: newStatus }));
      }
      toast.success(`Order marked as ${newStatus.replace(/_/g, ' ')}`);
    } catch {
      toast.error('Failed to update order status');
    } finally {
      setProcessingOrderId(null);
    }
  };

  // Submit order from Admin
  const handlePlaceCustomerOrder = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (cartEntries.length === 0) return toast.error('Cart is empty');
    if (!customerInfo.name.trim()) return toast.error('Customer name is required');
    if (!customerInfo.mobile.trim()) return toast.error('Mobile number is required');

    setSubmitting(true);
    try {
      const orderItems = cartEntries.map(([productId, quantity]) => {
        const prod = catalog.find(p => p._id === productId);
        return {
          product: productId,
          productName: prod?.name || 'Item',
          quantity,
          unit: prod?.unit?.symbol || 'unit',
          notes: prod?.sellingPrice ? `₹${prod.sellingPrice}` : ''
        };
      });

      const res = await api.post('/orders', {
        customerName: customerInfo.name.trim(),
        customerMobile: customerInfo.mobile.trim(),
        deliveryAddress: customerInfo.address.trim() || 'Store Pickup',
        notes: customerInfo.notes.trim(),
        items: orderItems,
      });

      toast.success(`Order #${res.data.data.orderNumber} placed successfully!`);
      setCustomerCart({});
      setCustomerInfo({ name: '', mobile: '', address: '', notes: '' });
      loadData();
      setViewMode('admin');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit order');
    } finally {
      setSubmitting(false);
    }
  };

  // Admin Transfer to Billing POS
  const handleTransferToBilling = async (order) => {
    if (processingOrderId) return;
    setProcessingOrderId(order._id);
    try {
      await api.post(`/orders/${order._id}/send-to-billing`);
      cart.clearCart();
      order.items.forEach(item => {
        const prod = catalog.find(p => p._id === (item.product?._id || item.product));
        if (prod) {
          cart.addItem(prod, item.quantity);
        }
      });
      toast.success(`Loaded Order #${order.orderNumber} into Billing POS!`);
      navigate('/pos');
    } catch (err) {
      toast.error('Failed to transfer to POS');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const copyCustomerLink = () => {
    const url = `${window.location.origin}/order`;
    navigator.clipboard.writeText(url);
    toast.success('Public Customer Order URL copied!');
  };

  return (
    <div className="w-full min-h-full space-y-6 px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Package className="text-primary-600 shrink-0" size={28} />
            <span>Grocery Ordering System</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage incoming orders, view customer delivery details, and bill orders seamlessly
          </p>
        </div>

        {/* Action Controls Group */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode Switcher */}
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 shadow-2xs">
            <button
              onClick={() => setViewMode('admin')}
              className={clsx(
                'px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer',
                viewMode === 'admin'
                  ? 'bg-white shadow-xs text-primary-700 font-extrabold'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              🏪 Orders Queue ({orders.length})
            </button>
            <button
              onClick={() => setViewMode('customer')}
              className={clsx(
                'px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer',
                viewMode === 'customer'
                  ? 'bg-white shadow-xs text-primary-700 font-extrabold'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              🛒 Create Order
            </button>
          </div>

          <button
            onClick={copyCustomerLink}
            className="btn-secondary py-2 text-xs sm:text-sm gap-1.5 font-semibold cursor-pointer"
            title="Copy Public Link for Customers"
          >
            <Copy size={14} />
            <span>Copy Link</span>
          </button>

          <Link
            to="/order"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary py-2 text-xs sm:text-sm gap-1.5 font-bold shadow-xs cursor-pointer"
          >
            <ExternalLink size={14} />
            <span>Open Customer Page</span>
          </Link>
        </div>
      </div>

      {/* VIEW MODE 1: CLEAN FULL-WIDTH ADMIN ORDERS QUEUE WITH SEPARATED COMPLETED DATA */}
      {viewMode === 'admin' && (
        <div className="space-y-6">
          {/* Stats Cards (4 Columns) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <div
              onClick={() => setQueueTab('all')}
              className="card p-5 flex items-center gap-4 border-l-4 border-l-primary-500 shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center font-bold shrink-0">
                <Package size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500 font-medium">All Orders</p>
                <p className="text-2xl sm:text-3xl font-black text-gray-900">{orders.length}</p>
              </div>
            </div>

            <div
              onClick={() => setQueueTab('active')}
              className="card p-5 flex items-center gap-4 border-l-4 border-l-yellow-500 shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-2xl flex items-center justify-center font-bold shrink-0">
                <Clock size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500 font-medium">Active / Pending</p>
                <p className="text-2xl sm:text-3xl font-black text-yellow-700">
                  {activeOrdersCount}
                </p>
              </div>
            </div>

            <div
              onClick={() => setQueueTab('active')}
              className="card p-5 flex items-center gap-4 border-l-4 border-l-blue-500 shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold shrink-0">
                <Truck size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500 font-medium">Ready / In Transit</p>
                <p className="text-2xl sm:text-3xl font-black text-blue-700">
                  {orders.filter(o => o.status === 'ready' || o.status === 'out_for_delivery').length}
                </p>
              </div>
            </div>

            <div
              onClick={() => setQueueTab('completed')}
              className="card p-5 flex items-center gap-4 border-l-4 border-l-green-500 shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center font-bold shrink-0">
                <CheckCheck size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500 font-medium">Completed & Billed</p>
                <p className="text-2xl sm:text-3xl font-black text-green-700">
                  {completedOrdersCount}
                </p>
              </div>
            </div>
          </div>

          {/* Orders Container (Full Width, Card Surface) */}
          <div className="card overflow-hidden shadow-sm border border-gray-200 bg-white">
            {/* Top Queue Filter Header with SEPARATE ACTIVE & COMPLETED TABS */}
            <div className="p-4 sm:p-5 bg-gray-50/80 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Separate Active vs Completed Tab Buttons */}
              <div className="flex items-center gap-1.5 bg-gray-200/80 p-1 rounded-xl">
                <button
                  onClick={() => setQueueTab('active')}
                  className={clsx(
                    'px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer',
                    queueTab === 'active'
                      ? 'bg-white text-gray-900 shadow-xs font-black'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  <span>⚡ Active Orders</span>
                  <span className={clsx(
                    'text-[11px] font-extrabold px-2 py-0.5 rounded-full',
                    queueTab === 'active' ? 'bg-amber-100 text-amber-800' : 'bg-gray-300 text-gray-700'
                  )}>
                    {activeOrdersCount}
                  </span>
                </button>

                <button
                  onClick={() => setQueueTab('completed')}
                  className={clsx(
                    'px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer',
                    queueTab === 'completed'
                      ? 'bg-white text-green-800 shadow-xs font-black'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  <span>✅ Completed & Billed</span>
                  <span className={clsx(
                    'text-[11px] font-extrabold px-2 py-0.5 rounded-full',
                    queueTab === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-300 text-gray-700'
                  )}>
                    {completedOrdersCount}
                  </span>
                </button>

                <button
                  onClick={() => setQueueTab('all')}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer',
                    queueTab === 'all'
                      ? 'bg-white text-primary-800 shadow-xs font-black'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  <span>All ({orders.length})</span>
                </button>
              </div>

              {/* Right: Search & Status Filter */}
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <select
                  className="form-input text-xs sm:text-sm py-2 w-auto bg-white font-medium cursor-pointer"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">⏳ Pending</option>
                  <option value="packing">📦 Packing</option>
                  <option value="ready">🎉 Ready for Pickup</option>
                  <option value="out_for_delivery">🚚 Out for Delivery</option>
                  <option value="confirmed">✓ Confirmed</option>
                  <option value="delivered">✅ Delivered</option>
                  <option value="cancelled">✕ Cancelled</option>
                </select>

                <div className="relative flex-1 md:w-64 min-w-44">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    className="form-input pl-9 py-2 text-xs sm:text-sm bg-white w-full"
                    placeholder="Search name, phone, order #..."
                    value={orderSearch}
                    onChange={e => setOrderSearch(e.target.value)}
                  />
                  {orderSearch && (
                    <button onClick={() => setOrderSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 p-1">
                      <X size={13} />
                    </button>
                  )}
                </div>

                <button
                  onClick={loadData}
                  disabled={loading}
                  className="btn-outline p-2 bg-white cursor-pointer"
                  title="Refresh Orders"
                >
                  <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Clean Full-Width Screen Table (Hidden unnecessary columns, 100% fits screen) */}
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/90 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-4 px-5">Order #</th>
                    <th className="py-4 px-5">Customer Name & Time</th>
                    <th className="py-4 px-5">Mobile</th>
                    <th className="py-4 px-5 text-center">Items</th>
                    <th className="py-4 px-5 text-center">Order Status</th>
                    <th className="py-4 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-gray-400">
                        <Package size={44} className="mx-auto mb-2 opacity-30 text-gray-300" />
                        <p className="font-bold text-base text-gray-700">
                          {queueTab === 'active' ? 'No active orders pending' : queueTab === 'completed' ? 'No completed orders in list' : 'No orders found'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {queueTab === 'active' ? 'All customer grocery orders are packed & completed!' : 'Orders will appear here as they are received.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map(ord => {
                      const isProcessing = processingOrderId === ord._id;
                      const itemCount = (ord.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
                      const isCompleted = ord.status === 'delivered' || ord.sentToBilling === true;

                      return (
                        <tr key={ord._id} className={clsx('transition-colors', isCompleted ? 'bg-gray-50/30 hover:bg-gray-50/70' : 'hover:bg-primary-50/20')}>
                          {/* Order Number */}
                          <td className="py-4 px-5">
                            <button
                              onClick={() => setSelectedOrderDetails(ord)}
                              className={clsx(
                                'font-mono font-black text-sm px-3 py-1.5 rounded-lg border whitespace-nowrap cursor-pointer transition-colors',
                                isCompleted
                                  ? 'bg-green-50 text-green-800 border-green-200 hover:bg-green-100'
                                  : 'bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-100'
                              )}
                              title="Click to view full order details"
                            >
                              {ord.orderNumber}
                            </button>
                          </td>

                          {/* Customer Name & Date */}
                          <td className="py-4 px-5">
                            <p className="font-extrabold text-gray-900 text-sm leading-snug">{ord.customerName}</p>
                            <span className="text-xs text-gray-400 font-medium block">
                              {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                            {ord.confirmedByName && (
                              <div className="mt-1 flex items-center gap-1">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                                  <CheckCircle size={10} className="text-emerald-600" />
                                  <span>Accepted by {ord.confirmedByName}</span>
                                </span>
                              </div>
                            )}
                            {ord.sentToBilling && (
                              <div className="mt-1 flex items-center gap-1">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 shadow-2xs">
                                  <span>🚀 POS: {ord.sentToBillingBy || ord.confirmedByName || 'Admin'}</span>
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Mobile */}
                          <td className="py-4 px-5 whitespace-nowrap text-sm text-gray-800 font-semibold">
                            +91 {ord.customerMobile || '-'}
                          </td>

                          {/* Clickable Items Pill (Opens full details modal) */}
                          <td className="py-4 px-5 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedOrderDetails(ord)}
                              className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-primary-50 hover:text-primary-700 text-gray-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-gray-200 hover:border-primary-300 transition-all cursor-pointer shadow-2xs"
                              title="View itemized grocery list"
                            >
                              <Package size={13} className="text-primary-600" />
                              <span>{itemCount} {itemCount === 1 ? 'Item' : 'Items'}</span>
                              <Eye size={12} className="text-gray-400" />
                            </button>
                          </td>

                          {/* Status Dropdown */}
                          <td className="py-4 px-5 text-center">
                            <select
                              disabled={isProcessing}
                              className={clsx(
                                'text-xs font-bold py-1.5 px-3 rounded-xl border shadow-2xs cursor-pointer',
                                ord.status === 'pending' && 'bg-yellow-50 text-yellow-800 border-yellow-300',
                                ord.status === 'confirmed' && 'bg-green-50 text-green-800 border-green-300',
                                ord.status === 'packing' && 'bg-amber-50 text-amber-800 border-amber-300',
                                ord.status === 'ready' && 'bg-blue-50 text-blue-800 border-blue-300',
                                ord.status === 'out_for_delivery' && 'bg-purple-50 text-purple-800 border-purple-300',
                                ord.status === 'delivered' && 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              )}
                              value={ord.status || 'pending'}
                              onChange={e => handleUpdateStatus(ord._id, e.target.value)}
                            >
                              <option value="pending">⏳ Pending</option>
                              <option value="confirmed">✓ Confirmed</option>
                              <option value="packing">📦 Packing</option>
                              <option value="ready">🎉 Ready</option>
                              <option value="out_for_delivery">🚚 Out for Delivery</option>
                              <option value="delivered">✅ Delivered</option>
                              <option value="cancelled">✕ Cancelled</option>
                            </select>
                          </td>

                          {/* Actions: View Details + Billing POS */}
                          <td className="py-4 px-5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedOrderDetails(ord)}
                                className="btn-secondary py-1.5 px-3 text-xs font-bold gap-1.5 cursor-pointer"
                                title="View full order details, address and notes"
                              >
                                <Eye size={14} />
                                <span>View</span>
                              </button>

                              <button
                                disabled={isProcessing}
                                onClick={() => handleTransferToBilling(ord)}
                                className={clsx(
                                  'btn btn-sm text-xs gap-1.5 shadow-2xs font-bold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer',
                                  ord.sentToBilling
                                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                                    : 'bg-primary-600 text-white hover:bg-primary-700'
                                )}
                                title="Load items into POS Cashier cart"
                              >
                                {isProcessing ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <Send size={13} />
                                )}
                                <span>{ord.sentToBilling ? 'Re-send POS' : 'Billing POS'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED ORDER DETAILS & DELIVERY FORM MODAL */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] my-auto flex flex-col shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-primary-100 text-primary-700 rounded-2xl flex items-center justify-center font-bold">
                  <FileText size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-extrabold text-lg text-gray-900">
                      Order Details: <span className="font-mono text-primary-700">{selectedOrderDetails.orderNumber}</span>
                    </h3>
                    <span className={clsx(
                      'text-xs font-bold px-3 py-0.5 rounded-full uppercase tracking-wider',
                      selectedOrderDetails.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      selectedOrderDetails.status === 'out_for_delivery' ? 'bg-purple-100 text-purple-800' :
                      selectedOrderDetails.status === 'ready' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    )}>
                      {selectedOrderDetails.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                    <Clock size={12} />
                    <span>Placed on {new Date(selectedOrderDetails.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-gray-50/40">
              {/* Customer & Delivery Form Box */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-400">
                  Customer & Delivery Details:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                  <div>
                    <span className="text-gray-400 font-medium block">Customer Name:</span>
                    <span className="font-extrabold text-gray-900 text-base">{selectedOrderDetails.customerName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium block">Mobile Phone:</span>
                    <span className="font-bold text-gray-900">+91 {selectedOrderDetails.customerMobile || '-'}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-gray-400 font-medium block">Delivery Address:</span>
                    <p className="font-semibold text-gray-800 flex items-center gap-1.5 mt-0.5">
                      <MapPin size={14} className="text-primary-600 shrink-0" />
                      <span>{selectedOrderDetails.deliveryAddress || 'Store Pickup (Counter)'}</span>
                    </p>
                  </div>
                  {selectedOrderDetails.notes && (
                    <div className="sm:col-span-2 bg-amber-50 rounded-xl p-3 border border-amber-200 text-xs text-amber-900">
                      <strong>Customer Notes:</strong> {selectedOrderDetails.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Itemized Products Table */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-700">
                    Ordered Grocery Items ({(selectedOrderDetails.items || []).length})
                  </h4>
                  <span className="text-xs text-gray-400 font-medium">Quantity / Rate</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {(selectedOrderDetails.items || []).map((item, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between text-xs sm:text-sm hover:bg-gray-50/50">
                      <div>
                        <p className="font-extrabold text-gray-900">{item.productName || 'Grocery Item'}</p>
                        {item.notes && <p className="text-xs text-gray-400">{item.notes}</p>}
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-primary-700 text-sm bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-100">
                          Qty: {item.quantity} {item.unit || ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Staff Acceptance & Activity Trail Box */}
              <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs space-y-2.5">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-primary-600" />
                  <span>Order Acceptance & Staff Activity:</span>
                </h4>
                <div className="flex flex-wrap gap-2 text-xs">
                  {selectedOrderDetails.confirmedByName ? (
                    <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl px-3 py-1.5 font-bold flex items-center gap-1.5 shadow-2xs">
                      <CheckCircle size={14} className="text-emerald-600" />
                      <span>Accepted by: <strong>{selectedOrderDetails.confirmedByName}</strong> ({selectedOrderDetails.confirmedByRole || 'Admin'})</span>
                      {selectedOrderDetails.confirmedAt && (
                        <span className="text-emerald-700 text-[11px] font-normal">
                          · {new Date(selectedOrderDetails.confirmedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="bg-amber-50 text-amber-800 border border-amber-200 rounded-xl px-3 py-1.5 font-bold flex items-center gap-1.5">
                      <Clock size={14} className="text-amber-600" />
                      <span>Awaiting staff acceptance / review</span>
                    </div>
                  )}

                  {selectedOrderDetails.sentToBilling && (
                    <div className="bg-purple-50 text-purple-800 border border-purple-200 rounded-xl px-3 py-1.5 font-bold flex items-center gap-1.5 shadow-2xs">
                      <span>🚀 Loaded to Billing POS by: <strong>{selectedOrderDetails.sentToBillingBy || selectedOrderDetails.confirmedByName || 'Admin'}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Automated WhatsApp Status Notification Pill */}
              <div className="p-3.5 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-2 text-xs text-green-800 font-semibold">
                <CheckCheck size={16} className="text-green-600 shrink-0" />
                <span>Automated WhatsApp notifications active: Customer receives real-time delivery alerts on +91 {selectedOrderDetails.customerMobile}.</span>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-5 border-t border-gray-100 bg-white flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedOrderDetails(null)}
                className="btn-secondary py-3 px-5 text-xs font-bold cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  const ord = selectedOrderDetails;
                  setSelectedOrderDetails(null);
                  handleTransferToBilling(ord);
                }}
                className="btn-primary py-3 px-6 text-xs sm:text-sm font-bold gap-2 shadow-md hover:shadow-lg cursor-pointer"
              >
                <Send size={15} />
                <span>Load Directly into Billing POS</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: CUSTOMER ORDER VIEW (Admin Order Creation) */}
      {viewMode === 'customer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left / Products Grid */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            <div className="card p-4 space-y-3.5 border border-gray-200 shadow-xs">
              <div className="relative">
                <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  className="form-input pl-9 py-2.5 text-sm w-full"
                  placeholder="Search products by name or category..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1">
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide text-xs sm:text-sm">
                {categories.map(cat => {
                  const iconMap = {
                    'all': '🛍️',
                    'food': '🍚',
                    'beverages': '🥤',
                    'snacks': '🍿',
                    'household': '🧼'
                  };
                  const icon = iconMap[cat.toLowerCase()] || '📦';
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={clsx(
                        'px-4 py-2 rounded-xl font-bold whitespace-nowrap capitalize transition-all shrink-0 flex items-center gap-1.5 cursor-pointer',
                        selectedCategory.toLowerCase() === cat.toLowerCase()
                          ? 'bg-primary-600 text-white shadow-xs scale-102'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      )}
                    >
                      <span>{icon}</span>
                      <span>{cat === 'all' ? 'All Items' : cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between items-center px-1">
              <h3 className="font-extrabold text-base text-gray-900">
                Available Products ({filteredProducts.length})
              </h3>
              {totalItemCount > 0 && (
                <span className="text-xs sm:text-sm text-primary-700 font-bold">{totalItemCount} items selected</span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredProducts.map(prod => {
                const count = customerCart[prod._id] || 0;
                return (
                  <div
                    key={prod._id}
                    className={clsx(
                      'card p-4 flex items-center justify-between border transition-all',
                      count > 0 ? 'border-primary-400 bg-primary-50/20 shadow-xs' : 'hover:border-gray-300'
                    )}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="font-bold text-sm text-gray-900 truncate leading-snug">{prod.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {prod.category?.name || 'Grocery'} · Stock: {prod.currentStock}
                      </p>
                      <p className="text-base font-extrabold text-primary-700 mt-1">
                        ₹{prod.sellingPrice} <span className="text-xs font-normal text-gray-400">/{prod.unit?.symbol || 'unit'}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateQty(prod._id, -1)}
                        disabled={count === 0}
                        className={clsx(
                          'w-8 h-8 rounded-lg flex items-center justify-center font-bold transition-all cursor-pointer',
                          count > 0 ? 'bg-white text-gray-700 hover:bg-gray-100 shadow-xs' : 'text-gray-300 cursor-not-allowed'
                        )}
                      >
                        <Minus size={14} />
                      </button>
                      <span className={clsx('w-7 text-center font-extrabold text-sm', count > 0 ? 'text-primary-800' : 'text-gray-400')}>
                        {count}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(prod._id, 1)}
                        className="w-8 h-8 bg-primary-600 text-white rounded-lg flex items-center justify-center font-bold hover:bg-primary-700 shadow-xs cursor-pointer"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column / Cart & Submit Form */}
          <div className="lg:col-span-5 xl:col-span-4 sticky top-4">
            <div className="card p-5 space-y-4 border-2 border-primary-200 shadow-card bg-white">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={19} className="text-primary-600" />
                  <h3 className="font-bold text-base text-gray-900">Your Grocery Cart</h3>
                </div>
                {cartEntries.length > 0 && (
                  <span className="badge-green">{totalItemCount} items</span>
                )}
              </div>

              {/* Cart Items List */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {cartEntries.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    <p className="text-xs">Your cart is empty. Add grocery products from the left.</p>
                  </div>
                ) : (
                  cartEntries.map(([id, qty]) => {
                    const prod = catalog.find(p => p._id === id);
                    const price = prod?.sellingPrice || 0;
                    const itemTotal = price * qty;
                    const unitSymbol = prod?.unit?.symbol || '';
                    return (
                      <div key={id} className="p-2.5 rounded-xl bg-gray-50/90 border border-gray-100 flex justify-between items-center text-xs gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-800 truncate leading-snug">{prod?.name}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">₹{price} {unitSymbol ? `/ ${unitSymbol}` : ''}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {/* In-Cart Steppers */}
                          <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-gray-200 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => updateQty(id, -1)}
                              className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                              title="Decrease quantity"
                            >
                              <Minus size={11} />
                            </button>
                            <span className="w-5 text-center font-extrabold text-xs text-primary-800">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQty(id, 1)}
                              className="w-6 h-6 rounded-md bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center font-bold shadow-2xs transition-colors cursor-pointer"
                              title="Increase quantity"
                            >
                              <Plus size={11} />
                            </button>
                          </div>

                          <span className="font-bold text-primary-700 w-11 text-right">₹{itemTotal}</span>
                          <button
                            type="button"
                            onClick={() => removeCartItem(id)}
                            className="text-gray-300 hover:text-red-500 p-1 transition-colors cursor-pointer"
                            title="Remove item"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {cartEntries.length > 0 && (
                <div className="pt-2 border-t border-gray-100 flex justify-between items-center text-sm font-bold">
                  <span className="text-gray-600">Estimated Total:</span>
                  <span className="text-primary-700 text-base">₹{totalEstimatedAmount}</span>
                </div>
              )}

              {/* Order Form */}
              <form onSubmit={handlePlaceCustomerOrder} className="space-y-3 pt-3 border-t border-gray-100 text-xs sm:text-sm">
                <div>
                  <label className="form-label text-xs">Customer Name *</label>
                  <input
                    className="form-input"
                    required
                    placeholder="Full Name"
                    value={customerInfo.name}
                    onChange={e => setCustomerInfo(i => ({ ...i, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label text-xs">Mobile Number *</label>
                  <input
                    className="form-input"
                    required
                    type="tel"
                    maxLength={10}
                    placeholder="10-digit mobile"
                    value={customerInfo.mobile}
                    onChange={e => setCustomerInfo(i => ({ ...i, mobile: e.target.value.replace(/\D/g, '') }))}
                  />
                </div>
                <div>
                  <label className="form-label text-xs">Delivery Address</label>
                  <input
                    className="form-input"
                    placeholder="Door No, Street name"
                    value={customerInfo.address}
                    onChange={e => setCustomerInfo(i => ({ ...i, address: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label text-xs">Special Notes</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Leave with security"
                    value={customerInfo.notes}
                    onChange={e => setCustomerInfo(i => ({ ...i, notes: e.target.value }))}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || cartEntries.length === 0}
                  className="btn-primary w-full py-3.5 text-sm font-bold mt-2 gap-2 shadow-md cursor-pointer"
                >
                  <CheckCircle size={16} />
                  {submitting ? 'Submitting Order...' : 'Submit Grocery Order'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
