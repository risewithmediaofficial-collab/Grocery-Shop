import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShoppingCart, Package, CheckCircle, Clock, Search, Plus, Minus,
  X, ExternalLink, RefreshCw, Send, Copy, Phone, MapPin, Eye,
  Loader2, Truck, CheckCheck, FileText, ChevronRight, User, AlertCircle,
  CheckCircle2, Layers, ShieldCheck, Store, MessageCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import clsx from 'clsx';
import CategoryIcon from '../../components/common/CategoryIcon';
import { playNewOrderAlert } from '../../utils/audioFeedback';

import {
  getProductCategory,
  getProductSubcategory,
  SUBCATEGORY_ICONS,
  isHexObjectId
} from '../../utils/groceryVariants';
import QuantityPackagingModal from '../../components/common/QuantityPackagingModal';
import OrderStatusTracker from '../../components/orders/OrderStatusTracker';
import SubcategorySwipeBar from '../../components/common/SubcategorySwipeBar';

export default function OrdersPage() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const cart = useCart();
  const [orders, setOrders] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [viewMode, setViewMode] = useState('queue'); // 'queue' (Orders Queue) or 'create' (Create Order)
  const [queueTab, setQueueTab] = useState('active'); // 'active' | 'completed' | 'all'
  const [search, setSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null); // For Order Details Modal
  const [processingOrderId, setProcessingOrderId] = useState(null);
  const [selectedProductForPackaging, setSelectedProductForPackaging] = useState(null);

  // Admin Order Creation Draft
  const [customerCart, setCustomerCart] = useState(() => {
    try {
      const saved = localStorage.getItem('columbu_admin_draft_cart');
      if (!saved) return {};
      const parsed = JSON.parse(saved);
      if (!parsed || typeof parsed !== 'object') return {};

      // Consolidate legacy composite keys to strictly base product ID
      const consolidated = {};
      for (const [k, v] of Object.entries(parsed)) {
        let pId = k;
        if (typeof v === 'object' && v !== null) {
          pId = v.productId || v.product?._id || k.split('_')[0];
          consolidated[pId] = { ...v, productId: pId };
        } else {
          pId = k.split('_')[0];
          consolidated[pId] = v;
        }
      }
      return consolidated;
    } catch {
      return {};
    }
  });
  const [customerInfo, setCustomerInfo] = useState({ name: '', mobile: '', address: '', notes: '' });
  const [adminDeliveryMode, setAdminDeliveryMode] = useState('delivery'); // 'delivery' | 'pickup'
  const [adminDeliveryCharge, setAdminDeliveryCharge] = useState(30);
  const [editingDeliveryFee, setEditingDeliveryFee] = useState(false);
  const [tempDeliveryFee, setTempDeliveryFee] = useState(0);
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
        if (res.data?.data) {
          setOrders(prev => {
            const incoming = res.data.data;
            if (prev.length > 0 && incoming.length > prev.length) {
              const prevIds = new Set(prev.map(o => o._id));
              const hasNewOrder = incoming.some(o => !prevIds.has(o._id) && (o.status === 'pending' || o.status === 'confirmed'));
              if (hasNewOrder) {
                playNewOrderAlert();
                toast.success('🔔 New customer order received!', { id: 'new-incoming-order', duration: 4000 });
              }
            }
            return incoming;
          });
        }
      }).catch(() => {});
    }, 8000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Structured categories using getProductCategory (never returns raw ObjectIds)
  const categories = useMemo(() => {
    const defaultOrder = ['food & staples', 'beverages & dairy', 'snacks & biscuits', 'personal & household care'];
    const cats = new Set();
    catalog.forEach(p => {
      const catName = getProductCategory(p);
      if (catName) cats.add(catName);
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

  // Available human-readable subcategories for the selected category
  const subCategories = useMemo(() => {
    const subs = new Set();
    catalog.forEach(p => {
      const catName = getProductCategory(p);
      if (selectedCategory === 'all' || catName.toLowerCase() === selectedCategory.toLowerCase()) {
        const subName = getProductSubcategory(p);
        if (subName && !isHexObjectId(subName)) subs.add(subName);
      }
    });
    return ['all', ...Array.from(subs).sort()];
  }, [catalog, selectedCategory]);

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
      const catName = getProductCategory(p);
      const subName = getProductSubcategory(p);

      const matchSearch = search.trim() === '' ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        catName.toLowerCase().includes(search.toLowerCase()) ||
        subName.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));

      const matchCat = selectedCategory === 'all' || catName.toLowerCase() === selectedCategory.toLowerCase();
      const matchSub = selectedSubCategory === 'all' || subName.toLowerCase() === selectedSubCategory.toLowerCase();

      return matchSearch && matchCat && matchSub;
    });
  }, [catalog, search, selectedCategory, selectedSubCategory]);

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

  // Cart operations with single entry per product & modify workflow
  const handleOpenPackaging = (prod) => {
    setSelectedProductForPackaging(prod);
  };

  const handleAddWithPackaging = (packData) => {
    const { product, name, sellingPrice, quantity, unit, packDetails, variantKey } = packData;
    const productId = product._id;
    const targetKey = variantKey || `${productId}_${packDetails?.optionId || unit || 'default'}`;

    setCustomerCart(prev => {
      const existing = prev[targetKey];
      if (existing) {
        // Same product and same subcategory -> increase quantity
        const updatedQty = (existing.quantity || 0) + quantity;
        toast.success(`Increased ${name} to ${updatedQty} ${unit}`);
        return {
          ...prev,
          [targetKey]: {
            ...existing,
            quantity: updatedQty,
          },
        };
      }

      // Different subcategory -> add as new line item in cart
      toast.success(`Added ${quantity} ${unit} of ${name} to order!`);
      return {
        ...prev,
        [targetKey]: {
          productId,
          product,
          name,
          sellingPrice,
          quantity,
          unit,
          packDetails,
        },
      };
    });
  };

  const updateQty = (key, delta) => {
    setCustomerCart(prev => {
      const item = prev[key];
      if (item === undefined) return prev;
      const currentQty = typeof item === 'object' ? (item.quantity || 1) : Number(item);
      const nextQty = Math.max(0, currentQty + delta);
      if (nextQty === 0) {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      }
      if (typeof item === 'object') {
        return { ...prev, [key]: { ...item, quantity: nextQty } };
      }
      return { ...prev, [key]: nextQty };
    });
  };

  const removeCartItem = (key) => {
    setCustomerCart(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const getNormalizedCartItem = useCallback((key, val) => {
    if (typeof val === 'object' && val !== null) {
      const pId = val.productId || val.product?._id || key.split('_')[0] || key;
      return {
        key,
        productId: pId,
        product: val.product || catalog.find(p => p._id === pId),
        name: val.name || val.product?.name || 'Item',
        sellingPrice: Number(val.sellingPrice || val.product?.sellingPrice || 0),
        quantity: Number(val.quantity || 1),
        unit: val.unit || val.product?.unit?.symbol || 'unit',
      };
    }
    const baseKey = key.split('_')[0] || key;
    const prod = catalog.find(p => p._id === baseKey);
    return {
      key,
      productId: baseKey,
      product: prod,
      name: prod?.name || 'Item',
      sellingPrice: Number(prod?.sellingPrice || 0),
      quantity: Number(val || 1),
      unit: prod?.unit?.symbol || 'unit',
    };
  }, [catalog]);

  const normalizedCartList = useMemo(() => {
    return Object.entries(customerCart).map(([k, v]) => getNormalizedCartItem(k, v));
  }, [customerCart, getNormalizedCartItem]);

  const totalItemCount = normalizedCartList.reduce((sum, item) => sum + item.quantity, 0);
  const totalEstimatedAmount = normalizedCartList.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);

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

  // Update delivery charge on an existing order
  const handleUpdateDeliveryFee = async (orderId, newFee) => {
    try {
      const feeNum = Math.max(0, Number(newFee) || 0);
      await api.put(`/orders/${orderId}`, { deliveryCharge: feeNum });
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, deliveryCharge: feeNum } : o));
      if (selectedOrderDetails?._id === orderId) {
        setSelectedOrderDetails(prev => ({ ...prev, deliveryCharge: feeNum }));
      }
      setEditingDeliveryFee(false);
      toast.success(`Updated delivery fee to ₹${feeNum}`);
    } catch {
      toast.error('Failed to update delivery fee');
    }
  };

  // 1-Click WhatsApp Status Update for Staff
  const sendWhatsAppUpdate = (ord) => {
    const cleanMobile = (ord.customerMobile || '').replace(/\D/g, '');
    if (!cleanMobile) return toast.error('No mobile number for customer');
    const targetPhone = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;
    
    let msg = '';
    const totalVal = ord.totalAmount || ord.totalEstimatedAmount || 0;
    if (ord.status === 'confirmed' || ord.status === 'packing') {
      msg = `Hello ${ord.customerName}! 🛍️ Your grocery order #${ord.orderNumber} is confirmed and currently being packed at New Columbu Stores (Total: ₹${totalVal}). We will dispatch it shortly!`;
    } else if (ord.status === 'ready') {
      msg = `Hello ${ord.customerName}! 📦 Your order #${ord.orderNumber} is packed and ready for pickup/dispatch at New Columbu Stores.`;
    } else if (ord.status === 'out_for_delivery') {
      msg = `Hello ${ord.customerName}! 🛵 Your order #${ord.orderNumber} is OUT FOR DELIVERY! Our delivery partner will arrive at your address soon.`;
    } else if (ord.status === 'delivered') {
      msg = `Hello ${ord.customerName}! ✅ Your order #${ord.orderNumber} has been delivered. Thank you for shopping with New Columbu Stores!`;
    } else {
      msg = `Hello ${ord.customerName}! ℹ️ Update regarding your order #${ord.orderNumber} at New Columbu Stores. Current status: ${ord.status?.replace(/_/g, ' ')}.`;
    }

    const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Submit order from Admin
  const handlePlaceCustomerOrder = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (normalizedCartList.length === 0) return toast.error('Cart is empty');
    if (!customerInfo.name.trim()) return toast.error('Customer name is required');
    if (!customerInfo.mobile.trim()) return toast.error('Mobile number is required');

    setSubmitting(true);
    try {
      const orderItems = normalizedCartList.map((item) => ({
        product: item.productId,
        productName: item.name,
        quantity: item.quantity,
        unit: item.unit,
        notes: item.sellingPrice ? `₹${item.sellingPrice}` : ''
      }));

      const finalFee = adminDeliveryMode === 'pickup' ? 0 : Math.max(0, Number(adminDeliveryCharge) || 0);
      const finalAddress = adminDeliveryMode === 'pickup' ? 'Store Pickup' : (customerInfo.address.trim() || 'Home Delivery');

      const res = await api.post('/orders', {
        customerName: customerInfo.name.trim(),
        customerMobile: customerInfo.mobile.trim(),
        deliveryAddress: finalAddress,
        deliveryCharge: finalFee,
        notes: customerInfo.notes.trim(),
        items: orderItems,
      });

      toast.success(`Order #${res.data.data.orderNumber} placed successfully!`);
      setCustomerCart({});
      setCustomerInfo({ name: '', mobile: '', address: '', notes: '' });
      loadData();
      setViewMode('queue');
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
      if (order.deliveryCharge > 0) {
        cart.addItem({
          _id: 'delivery_charges_fee',
          name: 'Delivery Charges',
          sellingPrice: order.deliveryCharge,
          purchasePrice: 0,
          mrp: order.deliveryCharge,
          unit: 'trip',
          currentStock: 999,
        }, 1);
      }
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
              onClick={() => setViewMode('queue')}
              className={clsx(
                'px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                viewMode === 'queue'
                  ? 'bg-white shadow-xs text-primary-700 font-extrabold'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <Package size={15} />
              <span>Orders Queue ({orders.length})</span>
            </button>
            <button
              onClick={() => setViewMode('create')}
              className={clsx(
                'px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                viewMode === 'create'
                  ? 'bg-white shadow-xs text-primary-700 font-extrabold'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <ShoppingCart size={15} />
              <span>Create Order</span>
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

      {/* VIEW MODE 1: CLEAN FULL-WIDTH ORDERS QUEUE WITH SEPARATED COMPLETED DATA */}
      {viewMode === 'queue' && (
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
                  <span className="flex items-center gap-1"><Clock size={13} /> Active Orders</span>
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
                  <span className="flex items-center gap-1"><CheckCircle size={13} /> Completed & Billed</span>
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
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="packing">Packing</option>
                  <option value="ready">Ready for Pickup</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
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
                    <th className="py-4 px-5 text-center">Delivery & Fee</th>
                    <th className="py-4 px-5 text-center">Items</th>
                    <th className="py-4 px-5 text-center">Order Status</th>
                    <th className="py-4 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-gray-400">
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
                                  <span>
                                    Accepted by {ord.confirmedByName === currentUser?.name ? 'You' : ord.confirmedByName}
                                    {ord.confirmedByRole && ord.confirmedByName !== currentUser?.name ? ` (${ord.confirmedByRole})` : ''}
                                  </span>
                                </span>
                              </div>
                            )}
                            {ord.sentToBilling && (
                              <div className="mt-1 flex items-center gap-1">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 shadow-2xs">
                                  <span>POS: {ord.sentToBillingBy || ord.confirmedByName || 'Staff'}</span>
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Mobile */}
                          <td className="py-4 px-5 whitespace-nowrap text-sm text-gray-800 font-semibold">
                            +91 {ord.customerMobile || '-'}
                          </td>

                          {/* Delivery & Fee */}
                          <td className="py-4 px-5 text-center whitespace-nowrap">
                            <div className="flex flex-col items-center gap-1">
                              <span className={clsx(
                                'px-2.5 py-0.5 rounded-full text-xs font-bold border inline-flex items-center gap-1',
                                ord.deliveryCharge > 0
                                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              )}>
                                {ord.deliveryCharge > 0 ? (
                                  <><Truck size={12} /><span>₹{ord.deliveryCharge}</span></>
                                ) : (
                                  <><Store size={12} /><span>Free Pickup</span></>
                                )}
                              </span>
                              <span className="text-[11px] text-gray-500 max-w-[130px] truncate" title={ord.deliveryAddress || 'Store Pickup'}>
                                {ord.deliveryAddress || 'Store Pickup'}
                              </span>
                            </div>
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
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="packing">Packing</option>
                              <option value="ready">Ready</option>
                              <option value="out_for_delivery">Out for Delivery</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>

                          {/* Actions: View Details + Billing POS */}
                          <td className="py-4 px-5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => sendWhatsAppUpdate(ord)}
                                className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all cursor-pointer shadow-2xs"
                                title="Send 1-click WhatsApp order update to customer"
                              >
                                <MessageCircle size={14} />
                              </button>

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

      {/* DEDICATED ORDER DETAILS & DELIVERY FORM MODAL (PORTAL TO DOCUMENT.BODY) */}
      {selectedOrderDetails && createPortal(
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
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
              {/* Live Engaging Status Tracker */}
              <OrderStatusTracker order={selectedOrderDetails} />

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
                    <span className="text-gray-400 font-medium block">Delivery Address & Mode:</span>
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-0.5">
                      <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                        <MapPin size={14} className="text-primary-600 shrink-0" />
                        <span>{selectedOrderDetails.deliveryAddress || 'Store Pickup (Counter)'}</span>
                      </p>
                      <span className={clsx(
                        'px-2.5 py-0.5 rounded-md text-xs font-bold border inline-flex items-center gap-1.5',
                        selectedOrderDetails.deliveryCharge > 0
                          ? 'bg-amber-50 text-amber-900 border-amber-300'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      )}>
                        {selectedOrderDetails.deliveryCharge > 0 ? (
                          <><Truck size={13} /><span>Home Delivery</span></>
                        ) : (
                          <><Store size={13} /><span>Store Pickup</span></>
                        )}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-gray-400 font-medium block">Delivery Charges:</span>
                    {editingDeliveryFee ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-sm font-bold text-gray-700">₹</span>
                        <input
                          type="number"
                          min="0"
                          value={tempDeliveryFee}
                          onChange={e => setTempDeliveryFee(e.target.value)}
                          className="w-20 form-input py-1 px-2 text-xs font-bold"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateDeliveryFee(selectedOrderDetails._id, tempDeliveryFee)}
                          className="btn-primary py-1 px-2.5 text-xs font-bold cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingDeliveryFee(false)}
                          className="btn-secondary py-1 px-2.5 text-xs font-medium cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-extrabold text-gray-900 text-base">
                          ₹{selectedOrderDetails.deliveryCharge || 0}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setTempDeliveryFee(selectedOrderDetails.deliveryCharge || 0);
                            setEditingDeliveryFee(true);
                          }}
                          className="text-[11px] text-primary-600 hover:text-primary-800 font-bold underline cursor-pointer"
                        >
                          Edit Fee
                        </button>
                        {selectedOrderDetails.deliveryCharge === 0 && (
                          <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded">
                            Free
                          </span>
                        )}
                      </div>
                    )}
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

                {/* Subtotal & Delivery Fee Breakdown */}
                <div className="p-4 bg-gray-50/80 border-t border-gray-200 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Delivery Charges:</span>
                    <span className={clsx('font-bold', selectedOrderDetails.deliveryCharge > 0 ? 'text-amber-900' : 'text-emerald-700')}>
                      {selectedOrderDetails.deliveryCharge > 0 ? `₹${selectedOrderDetails.deliveryCharge}` : 'FREE (₹0)'}
                    </span>
                  </div>
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
                      <span>Accepted by: <strong>{selectedOrderDetails.confirmedByName === currentUser?.name ? 'You' : selectedOrderDetails.confirmedByName}</strong> ({selectedOrderDetails.confirmedByRole || 'Staff'})</span>
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
                      <span>Loaded to Billing POS by: <strong>{selectedOrderDetails.sentToBillingBy || selectedOrderDetails.confirmedByName || 'Staff'}</strong></span>
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
        </div>,
        document.body
      )}

      {/* VIEW MODE 2: CREATE ORDER VIEW (Store Staff Order Creation) */}
      {viewMode === 'create' && (
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
                  const isActive = selectedCategory.toLowerCase() === cat.toLowerCase();
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setSelectedSubCategory('all');
                      }}
                      className={clsx(
                        'px-4 py-2 rounded-xl font-bold whitespace-nowrap capitalize transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border',
                        isActive
                          ? 'bg-primary-600 text-white border-primary-600 shadow-xs scale-102'
                          : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                      )}
                    >
                      <CategoryIcon name={cat} size={14} />
                      <span>{cat === 'all' ? 'All Items' : cat}</span>
                    </button>
                  );
                })}
              </div>

              {/* Subcategory Swipe Bar with arrows and mouse dragging */}
              <SubcategorySwipeBar
                subCategories={subCategories}
                selectedSubCategory={selectedSubCategory}
                onSelectSubCategory={setSelectedSubCategory}
                colorScheme="emerald"
              />
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
                const inCartItem = customerCart[prod._id];
                const inCartQty = inCartItem ? (typeof inCartItem === 'object' ? inCartItem.quantity : inCartItem) : 0;
                const catName = getProductCategory(prod);
                const subCatName = getProductSubcategory(prod);

                return (
                  <div
                    key={prod._id}
                    onClick={() => handleOpenPackaging(prod)}
                    className="card p-4 flex items-center justify-between border transition-all cursor-pointer hover:shadow-md group border-gray-200 hover:border-primary-400"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="font-bold text-sm text-gray-900 group-hover:text-primary-700 truncate leading-snug">{prod.name}</p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="text-[10px] bg-gray-100 text-gray-700 font-semibold px-2 py-0.5 rounded-md shrink-0">
                          {catName}
                        </span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1">
                          <CategoryIcon name={subCatName} size={11} />
                          <span>{subCatName}</span>
                        </span>
                        <span className="text-xs text-gray-400">· Stock: {prod.currentStock}</span>
                      </div>
                      <p className="text-base font-extrabold text-primary-700 mt-1">
                        ₹{prod.sellingPrice} <span className="text-xs font-normal text-gray-400">/{prod.unit?.symbol || 'unit'}</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenPackaging(prod);
                      }}
                      className="btn-primary btn-sm text-xs font-bold gap-1 rounded-xl px-3 py-2 shadow-xs shrink-0 cursor-pointer transition-all flex items-center"
                    >
                      <Plus size={14} />
                      <span>Add / Packs</span>
                    </button>
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
                {normalizedCartList.length > 0 && (
                  <span className="badge-green">{totalItemCount} items</span>
                )}
              </div>

              {/* Cart Items List */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {normalizedCartList.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    <p className="text-xs">Your cart is empty. Add grocery products from the left.</p>
                  </div>
                ) : (
                  normalizedCartList.map((item) => {
                    const price = item.sellingPrice || 0;
                    const itemTotal = price * item.quantity;
                    return (
                      <div key={item.key} className="p-2.5 rounded-xl bg-gray-50/90 border border-gray-100 flex justify-between items-center text-xs gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-800 truncate leading-snug">{item.name}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">₹{price} / {item.unit}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {/* In-Cart Steppers */}
                          <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-gray-200 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => updateQty(item.key, -1)}
                              className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                              title="Decrease quantity"
                            >
                              <Minus size={11} />
                            </button>
                            <span className="w-5 text-center font-extrabold text-xs text-primary-800">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQty(item.key, 1)}
                              className="w-6 h-6 rounded-md bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center font-bold shadow-2xs transition-colors cursor-pointer"
                              title="Increase quantity"
                            >
                              <Plus size={11} />
                            </button>
                          </div>

                          <span className="font-bold text-primary-700 w-11 text-right">₹{itemTotal}</span>
                          <button
                            type="button"
                            onClick={() => removeCartItem(item.key)}
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

              {/* Delivery Mode Selector */}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 block">
                  Delivery Method:
                </span>
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setAdminDeliveryMode('delivery');
                      if (Number(adminDeliveryCharge) === 0) setAdminDeliveryCharge(30);
                    }}
                    className={clsx(
                      'py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                      adminDeliveryMode === 'delivery'
                        ? 'bg-white text-emerald-800 shadow-xs border border-gray-200'
                        : 'text-gray-500 hover:text-gray-800'
                    )}
                  >
                    <Truck size={14} />
                    <span>Home Delivery</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdminDeliveryMode('pickup');
                      setAdminDeliveryCharge(0);
                    }}
                    className={clsx(
                      'py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                      adminDeliveryMode === 'pickup'
                        ? 'bg-white text-emerald-800 shadow-xs border border-gray-200'
                        : 'text-gray-500 hover:text-gray-800'
                    )}
                  >
                    <Store size={14} />
                    <span>Store Pickup</span>
                  </button>
                </div>
              </div>

              {/* Subtotal & Delivery Breakdown */}
              {normalizedCartList.length > 0 && (
                <div className="pt-2 border-t border-gray-100 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Items Subtotal:</span>
                    <span className="font-bold text-gray-800">₹{totalEstimatedAmount}</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Delivery Charges:</span>
                    <span className={clsx('font-bold', (adminDeliveryMode === 'pickup' ? 0 : Number(adminDeliveryCharge) || 0) > 0 ? 'text-gray-900' : 'text-emerald-700')}>
                      {adminDeliveryMode === 'pickup' ? 'FREE (₹0)' : `₹${Number(adminDeliveryCharge) || 0}`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-black pt-1.5 border-t border-dashed border-gray-200 text-gray-900">
                    <span>Total Payable:</span>
                    <span className="text-base text-primary-700">
                      ₹{totalEstimatedAmount + (adminDeliveryMode === 'pickup' ? 0 : (Number(adminDeliveryCharge) || 0))}
                    </span>
                  </div>
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
                {adminDeliveryMode === 'delivery' ? (
                  <>
                    <div>
                      <label className="form-label text-xs">Delivery Address *</label>
                      <input
                        className="form-input"
                        required
                        placeholder="Door No, Street name, Landmark"
                        value={customerInfo.address}
                        onChange={e => setCustomerInfo(i => ({ ...i, address: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="form-label text-xs">Delivery Charges (₹)</label>
                      <input
                        type="number"
                        min="0"
                        className="form-input"
                        placeholder="30"
                        value={adminDeliveryCharge}
                        onChange={e => setAdminDeliveryCharge(e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-700 flex items-center gap-1.5">
                    <MapPin size={13} className="text-slate-500 shrink-0" />
                    <span><b>Counter Pickup:</b> Customer collects order in store.</span>
                  </div>
                )}
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
                  disabled={submitting || normalizedCartList.length === 0}
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

      {/* Packaging & Quantity Modal */}
      {selectedProductForPackaging && (
        <QuantityPackagingModal
          product={selectedProductForPackaging}
          existingCartItem={customerCart[selectedProductForPackaging._id]}
          onConfirm={handleAddWithPackaging}
          onClose={() => setSelectedProductForPackaging(null)}
        />
      )}
    </div>
  );
}
