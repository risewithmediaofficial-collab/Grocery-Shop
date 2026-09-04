import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Store, ShoppingCart, Search, Plus, Minus, CheckCircle, Package,
  Phone, MapPin, Clock, ArrowRight, Trash2, X, Sparkles, AlertCircle,
  MessageCircle, User, LogIn, LogOut, FileText, Check, ShieldCheck, Truck, RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { generateOrderConfirmationMessage, openWhatsAppChat, STORE_DETAILS } from '../../utils/whatsapp';
import clsx from 'clsx';
import CategoryIcon from '../../components/common/CategoryIcon';
import {
  getProductCategory,
  getProductSubcategory,
  SUBCATEGORY_ICONS,
  isHexObjectId
} from '../../utils/groceryVariants';
import QuantityPackagingModal from '../../components/common/QuantityPackagingModal';
import OrderStatusTracker from '../../components/orders/OrderStatusTracker';
import SubcategorySwipeBar from '../../components/common/SubcategorySwipeBar';

const CUSTOMER_SESSION_KEY = 'columbu_customer_session';

export default function CustomerOrderPage() {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState('all');
  const [selectedProductForPackaging, setSelectedProductForPackaging] = useState(null);

  // Customer Session (Mobile + OTP)
  const [customerSession, setCustomerSession] = useState(() => {
    try {
      const saved = localStorage.getItem(CUSTOMER_SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Login Modal State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginStep, setLoginStep] = useState('mobile'); // 'mobile' | 'otp'
  const [loginMobile, setLoginMobile] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginAddress, setLoginAddress] = useState('');
  const [serverDemoOtp, setServerDemoOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // My Orders Modal
  const [showMyOrders, setShowMyOrders] = useState(false);
  const [myOrdersList, setMyOrdersList] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderFilter, setOrderFilter] = useState('all'); // 'all' | 'active' | 'completed'
  const [latestPreviousOrder, setLatestPreviousOrder] = useState(null);

  // Auto-fetch customer previous order for 1-click weekly repeat
  useEffect(() => {
    if (customerSession?.customer?.mobile) {
      api.get(`/customers/orders/my-orders?mobile=${customerSession.customer.mobile}&customerId=${customerSession.customer._id || ''}`)
        .then(res => {
          const ords = res.data.data || [];
          setMyOrdersList(ords);
          if (ords.length > 0) {
            setLatestPreviousOrder(ords[0]);
          }
        })
        .catch(() => {});
    }
  }, [customerSession]);

  const handleRepeatOrder = (order) => {
    if (!order?.items?.length) return;
    const newCart = {};
    order.items.forEach(it => {
      const pId = it.product?._id || it.product || it.productId;
      if (pId) {
        newCart[pId] = {
          productId: pId,
          name: it.productName || it.name,
          quantity: it.quantity || 1,
          sellingPrice: it.sellingPrice || it.price || 0,
          unit: it.unit || 'unit'
        };
      }
    });
    setCustomerCart(newCart);
    toast.success(`Loaded ${order.items.length} items from previous order!`);
  };

  const activeOrdersCount = useMemo(() => {
    return myOrdersList.filter(o => {
      const s = (o.status || '').toLowerCase();
      return s !== 'delivered' && s !== 'cancelled' && s !== 'returned';
    }).length;
  }, [myOrdersList]);

  const completedOrdersCount = useMemo(() => {
    return myOrdersList.filter(o => {
      const s = (o.status || '').toLowerCase();
      return s === 'delivered' || s === 'cancelled' || s === 'returned';
    }).length;
  }, [myOrdersList]);

  const filteredOrdersList = useMemo(() => {
    if (orderFilter === 'active') {
      return myOrdersList.filter(o => {
        const s = (o.status || '').toLowerCase();
        return s !== 'delivered' && s !== 'cancelled' && s !== 'returned';
      });
    }
    if (orderFilter === 'completed') {
      return myOrdersList.filter(o => {
        const s = (o.status || '').toLowerCase();
        return s === 'delivered' || s === 'cancelled' || s === 'returned';
      });
    }
    return myOrdersList;
  }, [myOrdersList, orderFilter]);

  // Cart & Customer Form
  const [customerCart, setCustomerCart] = useState(() => {
    try {
      const saved = localStorage.getItem('columbu_customer_cart');
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

  const [customerInfo, setCustomerInfo] = useState(() => {
    try {
      const saved = localStorage.getItem('columbu_customer_info');
      return saved ? JSON.parse(saved) : { name: '', mobile: '', address: '', notes: '' };
    } catch {
      return { name: '', mobile: '', address: '', notes: '' };
    }
  });

  const [deliveryMode, setDeliveryMode] = useState('delivery'); // 'delivery' | 'pickup'
  const [submitting, setSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(null);
  const [showMobileCart, setShowMobileCart] = useState(false);

  // Lock body scroll when any modal/drawer is open
  useEffect(() => {
    const isAnyModalOpen = showMyOrders || showLoginModal || showMobileCart;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showMyOrders, showLoginModal, showMobileCart]);

  // Sync cart to localStorage
  useEffect(() => {
    try {
      if (Object.keys(customerCart).length > 0) {
        localStorage.setItem('columbu_customer_cart', JSON.stringify(customerCart));
      } else {
        localStorage.removeItem('columbu_customer_cart');
      }
    } catch {}
  }, [customerCart]);

  // Sync customer details to localStorage & prefill if logged in
  useEffect(() => {
    if (customerSession?.customer) {
      setCustomerInfo(prev => ({
        ...prev,
        name: prev.name || customerSession.customer.name || '',
        mobile: prev.mobile || customerSession.customer.mobile || '',
        address: prev.address || customerSession.customer.address || '',
      }));
    }
  }, [customerSession]);

  useEffect(() => {
    try {
      if (customerInfo.name || customerInfo.mobile || customerInfo.address || customerInfo.notes) {
        localStorage.setItem('columbu_customer_info', JSON.stringify(customerInfo));
      }
    } catch {}
  }, [customerInfo]);

  // Load active products catalog
  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      try {
        res = await api.get('/orders/catalog');
      } catch {
        res = await api.get('/products?status=active&limit=100');
      }
      setCatalog(res.data.data || []);
    } catch (err) {
      console.error('Failed to load catalog', err);
      toast.error('Could not load products. Please check connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  // Extract unique categories using getProductCategory (never returns raw ObjectIds)
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

  // Extract unique human-readable subcategories for the selected category
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

  // Filter products by search, category, and subcategory
  const filteredProducts = useMemo(() => {
    return catalog.filter(p => {
      const catName = getProductCategory(p);
      const subName = getProductSubcategory(p);

      const matchSearch = search.trim() === '' ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        catName.toLowerCase().includes(search.toLowerCase()) ||
        subName.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
      
      const matchCategory = selectedCategory === 'all' || catName.toLowerCase() === selectedCategory.toLowerCase();
      const matchSubCategory = selectedSubCategory === 'all' || subName.toLowerCase() === selectedSubCategory.toLowerCase();

      return matchSearch && matchCategory && matchSubCategory;
    });
  }, [catalog, search, selectedCategory, selectedSubCategory]);

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
      toast.success(`Added ${quantity} ${unit} of ${name} to cart!`);
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

  const clearCart = () => {
    setCustomerCart({});
    try {
      localStorage.removeItem('columbu_customer_cart');
    } catch {}
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

  const STANDARD_DELIVERY_FEE = 30;
  const FREE_DELIVERY_THRESHOLD = 500;
  const deliveryCharge = deliveryMode === 'pickup'
    ? 0
    : (totalEstimatedAmount >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE);
  const finalGrandTotal = totalEstimatedAmount + deliveryCharge;

  // Send OTP
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    const cleanMobile = loginMobile.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      return toast.error('Please enter a valid 10-digit mobile number');
    }

    setSendingOtp(true);
    try {
      const res = await api.post('/customers/otp/send', { mobile: cleanMobile });
      setServerDemoOtp(res.data.otp || '123456');
      setLoginStep('otp');
      if (res.data.customerName) setLoginName(res.data.customerName);
      if (res.data.customerAddress) setLoginAddress(res.data.customerAddress);
      toast.success(`OTP generated: ${res.data.otp || '123456'}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    if (!loginOtp.trim()) {
      return toast.error('Please enter the 6-digit OTP');
    }

    setVerifyingOtp(true);
    try {
      const cleanMobile = loginMobile.replace(/\D/g, '');
      const res = await api.post('/customers/otp/verify', {
        mobile: cleanMobile,
        otp: loginOtp.trim(),
        name: loginName.trim(),
        address: loginAddress.trim(),
      });

      const session = { token: res.data.token, customer: res.data.customer };
      setCustomerSession(session);
      localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(session));

      // Auto-fill checkout form
      setCustomerInfo({
        name: res.data.customer.name,
        mobile: res.data.customer.mobile,
        address: res.data.customer.address || '',
        notes: customerInfo.notes || '',
      });

      setShowLoginModal(false);
      setLoginStep('mobile');
      setLoginOtp('');
      toast.success(`Welcome, ${res.data.customer.name}!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP code');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleCustomerLogout = () => {
    setCustomerSession(null);
    localStorage.removeItem(CUSTOMER_SESSION_KEY);
    toast.success('Logged out successfully');
  };

  // Fetch customer orders history
  const fetchMyOrders = async () => {
    if (!customerSession?.customer?.mobile) return;
    setLoadingOrders(true);
    try {
      const res = await api.get(`/customers/orders/my-orders?mobile=${customerSession.customer.mobile}&customerId=${customerSession.customer._id}`);
      setMyOrdersList(res.data.data || []);
      setShowMyOrders(true);
    } catch (err) {
      toast.error('Failed to load orders history');
    } finally {
      setLoadingOrders(false);
    }
  };

  // Handle Order Submit
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (normalizedCartList.length === 0) {
      return toast.error('Please select at least 1 item to place an order');
    }

    // Require Customer Login if not logged in
    if (!customerSession?.customer) {
      setShowLoginModal(true);
      toast('Please verify your mobile number with OTP to place your order');
      return;
    }

    if (!customerInfo.name.trim()) {
      return toast.error('Please enter your full name');
    }
    if (!customerInfo.mobile.trim() || !/^\d{10}$/.test(customerInfo.mobile.replace(/\D/g, ''))) {
      return toast.error('Please enter a valid 10-digit mobile number');
    }

    if (deliveryMode === 'delivery' && !customerInfo.address.trim()) {
      return toast.error('Please enter your delivery address for Home Delivery');
    }

    setSubmitting(true);
    try {
      const orderItems = normalizedCartList.map((item) => ({
        product: item.productId,
        productName: item.name,
        quantity: item.quantity,
        unit: item.unit,
        notes: item.sellingPrice ? `₹${item.sellingPrice} / ${item.unit}` : ''
      }));

      const finalAddress = deliveryMode === 'pickup'
        ? 'Store Pickup'
        : (customerInfo.address.trim() || 'Home Delivery');

      const res = await api.post('/orders', {
        customerId: customerSession?.customer?._id,
        customerName: customerInfo.name.trim(),
        customerMobile: customerInfo.mobile.trim(),
        deliveryAddress: finalAddress,
        deliveryCharge,
        notes: customerInfo.notes.trim(),
        items: orderItems,
      });

      const createdOrder = res.data.data;
      setOrderPlaced(createdOrder);
      setCustomerCart({});
      setShowMobileCart(false);
      try {
        localStorage.removeItem('columbu_customer_cart');
      } catch {}

      toast.success('Your order has been placed successfully!');
    } catch (err) {
      console.error('Order error:', err);
      toast.error(err.response?.data?.message || 'Failed to submit order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForNewOrder = () => {
    setOrderPlaced(null);
    setCustomerCart({});
  };

  // Open automated WhatsApp message
  const handleOpenWhatsAppConfirmation = (order) => {
    const msg = generateOrderConfirmationMessage(order, STORE_DETAILS);
    openWhatsAppChat(order.customerMobile || customerSession?.customer?.mobile || STORE_DETAILS.cleanPhone, msg);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Store Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0">
              <Store size={22} />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-gray-900 leading-tight">
                New Columbu Stores
              </h1>
              <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                <MapPin size={12} className="text-primary-600 shrink-0" />
                <span>Krishnagiri, Tamil Nadu</span>
                <span className="hidden sm:inline text-gray-300">•</span>
                <span className="hidden sm:inline-flex items-center text-green-600 font-medium gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Store Open
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Customer Login / Profile Pill */}
            {customerSession?.customer ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchMyOrders}
                  className="btn-outline btn-sm text-xs gap-1.5 font-semibold py-1.5"
                  title="View your past orders"
                >
                  <FileText size={14} className="text-primary-600" />
                  <span className="hidden sm:inline">My Orders</span>
                </button>
                
                <div className="flex items-center gap-1.5 bg-primary-50 text-primary-800 px-3 py-1.5 rounded-xl border border-primary-200 text-xs font-bold">
                  <User size={13} />
                  <span className="max-w-28 truncate">{customerSession.customer.name}</span>
                  <button
                    onClick={handleCustomerLogout}
                    className="text-primary-400 hover:text-red-500 ml-1 p-0.5"
                    title="Sign Out"
                  >
                    <LogOut size={12} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setLoginStep('mobile');
                  setShowLoginModal(true);
                }}
                className="btn-primary btn-sm text-xs gap-1.5 font-bold py-2 shadow-xs cursor-pointer"
              >
                <LogIn size={14} />
                <span>Sign In (OTP)</span>
              </button>
            )}

            {/* Mobile Cart Trigger */}
            <button
              onClick={() => setShowMobileCart(true)}
              className="lg:hidden relative p-2.5 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-xl transition-colors flex items-center gap-1.5 border border-primary-200 font-bold text-xs cursor-pointer"
            >
              <ShoppingCart size={18} />
              {totalItemCount > 0 && (
                <span className="bg-primary-600 text-white text-[11px] font-extrabold px-2 py-0.5 rounded-full">
                  {totalItemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {orderPlaced ? (
          /* Order Confirmation Screen */
          <div className="max-w-xl mx-auto my-6 bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xs">
              <CheckCircle size={36} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-1">Order Placed Successfully!</h2>
            <p className="text-gray-600 text-xs sm:text-sm mb-6">
              Thank you for ordering with <strong className="text-gray-900">New Columbu Stores</strong>. Our staff is packing your items now.
            </p>

            <div className="bg-gray-50 rounded-2xl p-4 sm:p-5 text-left space-y-3 mb-6 border border-gray-200 text-xs">
              <div className="flex justify-between items-center pb-2.5 border-b border-gray-200">
                <span className="text-gray-500 font-semibold">Order Number:</span>
                <span className="font-mono font-black text-primary-700 text-sm">{orderPlaced.orderNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Customer Name:</span>
                <span className="font-bold text-gray-900">{orderPlaced.customerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Mobile Number:</span>
                <span className="font-semibold text-gray-900">+91 {orderPlaced.customerMobile}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Delivery Address:</span>
                <span className="text-gray-800 text-right max-w-xs">{orderPlaced.deliveryAddress || 'Store Pickup'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Delivery Charges:</span>
                <span className={clsx('font-bold', orderPlaced.deliveryCharge > 0 ? 'text-amber-800' : 'text-emerald-700 font-extrabold')}>
                  {orderPlaced.deliveryCharge > 0 ? `₹${orderPlaced.deliveryCharge}` : 'FREE (₹0)'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-gray-500 font-medium">Status:</span>
                <span className="badge-yellow text-xs uppercase font-bold">⏳ Order Received</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={fetchMyOrders}
                className="btn-primary py-3.5 text-xs font-bold gap-1.5 shadow-sm hover:shadow-md cursor-pointer"
              >
                <FileText size={15} /> View My Orders
              </button>
              <button
                type="button"
                onClick={handleResetForNewOrder}
                className="btn-secondary py-3.5 text-xs font-bold gap-1.5 cursor-pointer flex items-center"
              >
                <ShoppingCart size={15} />
                <span>Order More Items</span>
              </button>
            </div>
          </div>
        ) : (
          /* Two-Column Store Layout */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Product Search, Category Tabs & Catalog */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-4">
              {/* 1-Click Repeat Order Card for Returning Customers */}
              {latestPreviousOrder && Object.keys(customerCart).length === 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/60 to-emerald-50 border border-emerald-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-celebrate">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <RotateCcw size={18} />
                    </div>
                    <div>
                      <p className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
                        <span>Reorder your weekly grocery basket?</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">1-Click</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Order #{latestPreviousOrder.orderNumber} • {latestPreviousOrder.items?.length} items • ₹{latestPreviousOrder.totalAmount || latestPreviousOrder.totalEstimatedAmount}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRepeatOrder(latestPreviousOrder)}
                    className="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                  >
                    <span>Repeat Order</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              )}

              {/* Search & Category Filter Section */}
              <div className="card p-4 sm:p-5 space-y-4 border border-gray-200">
                <div className="relative">
                  <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    className="form-input pl-10 pr-10 py-3 text-sm rounded-xl border-gray-300 focus:border-primary-500 focus:ring-primary-500 w-full"
                    placeholder="Search rice, oil, biscuits, spices, soap, etc..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                {/* Structured Category Filter Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {categories.map(cat => {
                    const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();

                    return (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat);
                          setSelectedSubCategory('all');
                        }}
                        className={clsx(
                          'px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer border',
                          isSelected
                            ? 'bg-primary-600 text-white border-primary-600 shadow-xs'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
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

              {/* Products Header */}
              <div className="flex items-center justify-between px-1">
                <h2 className="font-bold text-base text-gray-900 flex items-center gap-2">
                  <span>Available Groceries</span>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full">
                    {filteredProducts.length}
                  </span>
                </h2>
                {totalItemCount > 0 && (
                  <span className="text-xs font-semibold text-primary-700">
                    {totalItemCount} items selected
                  </span>
                )}
              </div>

              {/* Products Grid */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="card p-4 h-24 skeleton" />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="card p-12 text-center text-gray-400">
                  <Package size={40} className="mx-auto mb-2 text-gray-300" />
                  <p className="font-bold text-gray-600 text-sm">No grocery items found</p>
                  <p className="text-xs mt-1">Try clearing your search query or selecting another category.</p>
                  <button
                    onClick={() => { setSearch(''); setSelectedCategory('all'); setSelectedSubCategory('all'); }}
                    className="btn-secondary btn-sm mt-4 cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {filteredProducts.map(prod => {
                    const inCartItem = customerCart[prod._id];
                    const inCartQty = inCartItem ? (typeof inCartItem === 'object' ? inCartItem.quantity : inCartItem) : 0;
                    const inCartUnit = inCartItem ? (typeof inCartItem === 'object' ? inCartItem.unit : (prod.unit?.symbol || 'unit')) : '';
                    const catName = getProductCategory(prod);
                    const subCatName = getProductSubcategory(prod);
                    const unitName = prod.unit?.symbol || prod.unit?.name || '';
                    const inStock = prod.currentStock > 0;

                    return (
                      <div
                        key={prod._id}
                        onClick={() => handleOpenPackaging(prod)}
                        className="card p-3.5 sm:p-4 flex items-center justify-between gap-3 border transition-all duration-150 cursor-pointer hover:shadow-md group border-gray-200 hover:border-primary-400"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm text-gray-900 group-hover:text-primary-700 truncate leading-snug">
                            {prod.name}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span className="text-[10px] bg-gray-100 text-gray-700 font-semibold px-2 py-0.5 rounded-md shrink-0">
                              {catName}
                            </span>
                            <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1">
                              <CategoryIcon name={subCatName} size={11} />
                              <span>{subCatName}</span>
                            </span>
                            <span className="text-xs text-gray-400">· Stock: <span className={clsx('font-semibold', inStock ? 'text-gray-700' : 'text-red-500')}>{prod.currentStock}</span></span>
                          </div>
                          <div className="flex items-baseline gap-1 mt-1.5">
                            <span className="text-base font-extrabold text-primary-700">
                              ₹{prod.sellingPrice}
                            </span>
                            {unitName && (
                              <span className="text-xs text-gray-400 font-medium">
                                / {unitName}
                              </span>
                            )}
                          </div>
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
              )}
            </div>

            {/* Right Column: Sticky Cart & Place Order Panel */}
            <div className="hidden lg:block lg:col-span-5 xl:col-span-4 sticky top-16 max-h-[calc(100vh-5rem)] overflow-y-auto pr-1">
              <div className="card p-5 border-2 border-primary-200 shadow-card bg-white space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-lg flex items-center justify-center">
                      <ShoppingCart size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-gray-900">Your Grocery Cart</h3>
                      <p className="text-xs text-gray-500">{totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} in basket</p>
                    </div>
                  </div>
                  {normalizedCartList.length > 0 && (
                    <button
                      onClick={clearCart}
                      className="text-xs text-red-500 hover:text-red-700 font-medium cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Cart Items List */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {normalizedCartList.length === 0 ? (
                    <div className="text-center py-6 text-gray-400">
                      <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-xs font-medium text-gray-500">Your cart is empty.</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Select grocery products from the left to begin.</p>
                    </div>
                  ) : (
                    normalizedCartList.map((item) => {
                      const price = item.sellingPrice || 0;
                      const itemTotal = price * item.quantity;

                      return (
                        <div
                          key={item.key}
                          className="p-2.5 rounded-xl bg-gray-50/90 border border-gray-100 hover:border-gray-200 transition-colors flex items-center justify-between gap-2.5 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-gray-800 truncate leading-snug">{item.name}</p>
                            <p className="text-gray-400 text-[11px] mt-0.5">₹{price} / {item.unit}</p>
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

                            {/* Line Total */}
                            <span className="font-extrabold text-primary-700 w-11 text-right">
                              ₹{itemTotal}
                            </span>

                            {/* Remove button */}
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
                    Choose Delivery Method:
                  </span>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setDeliveryMode('delivery')}
                      className={clsx(
                        'py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                        deliveryMode === 'delivery'
                          ? 'bg-white text-emerald-800 shadow-xs border border-gray-200'
                          : 'text-gray-500 hover:text-gray-800'
                      )}
                    >
                      <Truck size={14} />
                      <span>Home Delivery</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryMode('pickup')}
                      className={clsx(
                        'py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                        deliveryMode === 'pickup'
                          ? 'bg-white text-emerald-800 shadow-xs border border-gray-200'
                          : 'text-gray-500 hover:text-gray-800'
                      )}
                    >
                      <Store size={14} />
                      <span>Store Pickup (Free)</span>
                    </button>
                  </div>

                  {deliveryMode === 'delivery' && totalEstimatedAmount > 0 && (
                    <div className="p-2.5 bg-emerald-50/90 border border-emerald-200 rounded-xl text-xs text-emerald-900 shadow-2xs">
                      {totalEstimatedAmount >= FREE_DELIVERY_THRESHOLD ? (
                        <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                          <Sparkles size={14} className="text-emerald-600" />
                          <span>🎉 You unlocked FREE Delivery!</span>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800">
                            <span className="flex items-center gap-1">
                              <Truck size={12} /> Add ₹{FREE_DELIVERY_THRESHOLD - totalEstimatedAmount} more for FREE Delivery!
                            </span>
                            <span>{Math.round((totalEstimatedAmount / FREE_DELIVERY_THRESHOLD) * 100)}%</span>
                          </div>
                          <div className="w-full bg-emerald-200/70 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.round((totalEstimatedAmount / FREE_DELIVERY_THRESHOLD) * 100))}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Subtotal & Delivery Charges Summary */}
                {normalizedCartList.length > 0 && (
                  <div className="pt-2 border-t border-gray-100 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-gray-600">
                      <span>Items Subtotal:</span>
                      <span className="font-bold text-gray-800">₹{totalEstimatedAmount}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-600">
                      <span>Delivery Charges:</span>
                      <span className={clsx('font-bold', deliveryCharge > 0 ? 'text-gray-900' : 'text-emerald-700')}>
                        {deliveryCharge > 0 ? `₹${deliveryCharge}` : 'FREE (₹0)'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-black pt-1.5 border-t border-dashed border-gray-200 text-gray-900">
                      <span>Total Payable:</span>
                      <span className="text-lg text-primary-700">₹{finalGrandTotal}</span>
                    </div>
                  </div>
                )}

                {/* Customer Checkout Form */}
                <form onSubmit={handlePlaceOrder} className="space-y-3 pt-3 border-t border-gray-100 text-xs">
                  <div>
                    <label className="form-label">Your Name *</label>
                    <input
                      className="form-input"
                      required
                      placeholder="Full Name"
                      value={customerInfo.name}
                      onChange={e => setCustomerInfo(i => ({ ...i, name: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="form-label">Mobile Number *</label>
                    <input
                      className="form-input"
                      required
                      type="tel"
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      value={customerInfo.mobile}
                      onChange={e => setCustomerInfo(i => ({ ...i, mobile: e.target.value.replace(/\D/g, '') }))}
                    />
                  </div>

                  {deliveryMode === 'delivery' ? (
                    <div>
                      <label className="form-label">Delivery Address *</label>
                      <input
                        className="form-input"
                        required
                        placeholder="Door No, Building, Street, Area"
                        value={customerInfo.address}
                        onChange={e => setCustomerInfo(i => ({ ...i, address: e.target.value }))}
                      />
                    </div>
                  ) : (
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-700 flex items-center gap-1.5">
                      <MapPin size={13} className="text-slate-500 shrink-0" />
                      <span><b>Counter Pickup:</b> Collect at New Columbu Stores, Krishnagiri counter.</span>
                    </div>
                  )}

                  <div>
                    <label className="form-label">Special Notes</label>
                    <input
                      className="form-input"
                      placeholder="e.g. Leave with security / Pack carefully"
                      value={customerInfo.notes}
                      onChange={e => setCustomerInfo(i => ({ ...i, notes: e.target.value }))}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || normalizedCartList.length === 0}
                    className="btn-primary w-full py-3.5 text-sm font-bold mt-2 gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Submitting Order...
                      </span>
                    ) : (
                      <>
                        <CheckCircle size={16} />
                        <span>Place Grocery Order</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Customer Mobile + OTP Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 relative overflow-hidden" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-primary-100 text-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <ShieldCheck size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                {loginStep === 'mobile' ? 'Sign In with Mobile' : 'Enter Verification Code'}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {loginStep === 'mobile'
                  ? 'Enter your 10-digit mobile number to receive a secure OTP'
                  : `Code sent to +91 ${loginMobile}`}
              </p>
            </div>

            {loginStep === 'mobile' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="form-label text-xs">Mobile Number</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      autoFocus
                      required
                      className="form-input pl-12 py-3 text-base font-semibold"
                      placeholder="98765 43210"
                      value={loginMobile}
                      onChange={e => setLoginMobile(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={sendingOtp || loginMobile.length !== 10}
                  className="btn-primary w-full py-3.5 text-sm font-bold shadow-md cursor-pointer"
                >
                  {sendingOtp ? 'Sending OTP...' : 'Send OTP Code →'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtpAndLogin} className="space-y-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500 font-medium">Enter the 6-digit verification code sent to your mobile</p>
                  {serverDemoOtp && (
                    <p className="text-[11px] text-gray-400 mt-1">Verification code: <span className="font-mono font-bold text-gray-700">{serverDemoOtp}</span></p>
                  )}
                </div>

                <div>
                  <label className="form-label text-xs">6-Digit OTP</label>
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    required
                    className="form-input text-center text-xl tracking-widest font-black py-2.5"
                    placeholder="••••••"
                    value={loginOtp}
                    onChange={e => setLoginOtp(e.target.value.replace(/\D/g, ''))}
                  />
                </div>

                <div>
                  <label className="form-label text-xs">Your Full Name</label>
                  <input
                    type="text"
                    required
                    className="form-input py-2 text-xs"
                    placeholder="Enter your name"
                    value={loginName}
                    onChange={e => setLoginName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label text-xs">Delivery Address (Optional)</label>
                  <input
                    type="text"
                    className="form-input py-2 text-xs"
                    placeholder="Door No, Street name"
                    value={loginAddress}
                    onChange={e => setLoginAddress(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setLoginStep('mobile')}
                    className="btn-secondary flex-1 py-3 text-xs font-semibold cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={verifyingOtp || loginOtp.length < 4}
                    className="btn-primary flex-2 py-3 text-xs font-bold shadow-md cursor-pointer"
                  >
                    {verifyingOtp ? 'Verifying...' : 'Verify & Login'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Customer "My Orders" History Drawer */}
      {showMyOrders && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-lg w-full max-h-[92vh] sm:max-h-[88vh] my-auto flex flex-col shadow-2xl overflow-hidden border border-slate-200/60 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Clean Header */}
            <div className="bg-white border-b border-slate-100 px-5 py-4 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-bold text-base text-slate-900 tracking-tight">My Orders</h3>
                    {myOrdersList.length > 0 && (
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {myOrdersList.length}
                      </span>
                    )}
                    {activeOrdersCount > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                        {activeOrdersCount} live
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    +91 {customerSession?.customer?.mobile || '6380140927'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowMyOrders(false)}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer shrink-0"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Filter tabs */}
              {myOrdersList.length > 0 && (
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100">
                  {[
                    { key: 'all', label: `All (${myOrdersList.length})` },
                    ...(activeOrdersCount > 0   ? [{ key: 'active',    label: `Live (${activeOrdersCount})` }]   : []),
                    ...(completedOrdersCount > 0 ? [{ key: 'completed', label: `Delivered (${completedOrdersCount})` }] : []),
                  ].map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setOrderFilter(tab.key)}
                      className={clsx(
                        'px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
                        orderFilter === tab.key
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Orders List */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3 bg-slate-50">
              {loadingOrders ? (
                <div className="py-16 text-center">
                  <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs text-slate-400">Loading orders...</p>
                </div>
              ) : myOrdersList.length === 0 ? (
                <div className="py-14 text-center">
                  <Package size={36} className="mx-auto mb-3 text-slate-300" />
                  <p className="font-semibold text-sm text-slate-700">No orders yet</p>
                  <p className="text-xs text-slate-400 mt-1">Your delivery history will appear here.</p>
                </div>
              ) : filteredOrdersList.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <p className="text-sm text-slate-500">No orders match this filter.</p>
                  <button
                    type="button"
                    onClick={() => setOrderFilter('all')}
                    className="text-xs font-semibold text-slate-700 underline cursor-pointer"
                  >
                    View all orders
                  </button>
                </div>
              ) : (
                filteredOrdersList.map(ord => {
                  const totalUnits = (ord.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);

                  return (
                    <div
                      key={ord._id}
                      className="bg-white rounded-xl border border-slate-200 overflow-hidden transition-shadow hover:shadow-sm"
                    >
                      {/* Card Header */}
                      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-sm text-slate-900">{ord.orderNumber}</span>
                            <span className={clsx(
                              'text-[10px] font-semibold px-2 py-0.5 rounded border',
                              ord.status === 'delivered'        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              ord.status === 'out_for_delivery' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              ord.status === 'packing' || ord.status === 'ready' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                              'bg-slate-100 text-slate-500 border-slate-200'
                            )}>
                              {ord.status === 'out_for_delivery' ? 'Out for delivery' :
                               ord.status === 'delivered' ? 'Delivered' :
                               ord.status === 'packing' ? 'Packing' :
                               ord.status === 'ready' ? 'Ready' : 'Confirmed'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            {new Date(ord.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {' '}·{' '}
                            {new Date(ord.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            {' '}·{' '}
                            {(ord.items || []).length} item{(ord.items || []).length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        {ord.grandTotal > 0 && (
                          <div className="text-right shrink-0">
                            <p className="text-[10px] text-slate-400 font-medium">Total</p>
                            <p className="text-sm font-bold text-slate-900">₹{Number(ord.grandTotal).toLocaleString('en-IN')}</p>
                          </div>
                        )}
                      </div>

                      {/* Live tracker */}
                      <div className="px-4 pb-3">
                        <OrderStatusTracker order={ord} />
                      </div>

                      {/* Items list */}
                      {(ord.items || []).length > 0 && (
                        <div className="border-t border-slate-100 px-4 py-3">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Items</p>
                          <div className="space-y-1.5">
                            {(ord.items || []).map((item, i) => (
                              <div key={i} className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                                  <p className="text-xs text-slate-700 font-medium truncate">{item.productName || 'Item'}</p>
                                  {item.notes && (
                                    <p className="text-[10px] text-slate-400 truncate hidden sm:block">({item.notes})</p>
                                  )}
                                </div>
                                <span className="text-xs text-slate-500 shrink-0 font-medium">
                                  × {item.quantity}{item.unit ? ` ${item.unit}` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Footer row */}
                      <div className="border-t border-slate-100 px-4 py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <MapPin size={12} className="text-slate-400 shrink-0" />
                          <span className="text-[11px] text-slate-500 truncate">
                            {ord.deliveryAddress || 'Store Pickup'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {ord.deliveryCharge > 0 ? (
                            <span className="text-[10px] text-slate-500 font-medium">₹{ord.deliveryCharge} delivery</span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-medium">Free delivery</span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const msg = `Hello ${STORE_DETAILS.name}, I would like to check the status of my Order #${ord.orderNumber}.`;
                              openWhatsAppChat(STORE_DETAILS.cleanPhone, msg);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-900 hover:bg-slate-700 text-white transition-colors cursor-pointer"
                          >
                            <MessageCircle size={11} />
                            Help
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sticky Cart Drawer */}
      {showMobileCart && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <ShoppingCart size={20} className="text-primary-600" />
                <h3 className="font-bold text-base text-gray-900">Your Grocery Basket</h3>
              </div>
              <button
                onClick={() => setShowMobileCart(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {/* Items list */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {normalizedCartList.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-6">Your cart is empty.</p>
                ) : (
                  normalizedCartList.map((item) => {
                    const price = item.sellingPrice || 0;
                    const itemTotal = price * item.quantity;
                    return (
                      <div key={item.key} className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex justify-between items-center text-xs gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900 truncate">{item.name}</p>
                          <p className="text-gray-400 text-[11px]">₹{price} / {item.unit}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-gray-200 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => updateQty(item.key, -1)}
                              className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
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
                              className="w-6 h-6 rounded-md bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center font-bold shadow-2xs cursor-pointer"
                              title="Increase quantity"
                            >
                              <Plus size={11} />
                            </button>
                          </div>

                          <span className="font-extrabold text-primary-700 w-11 text-right">₹{itemTotal}</span>
                          <button
                            type="button"
                            onClick={() => removeCartItem(item.key)}
                            className="text-gray-300 hover:text-red-500 p-1 cursor-pointer"
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

              {/* Mobile Delivery Mode Selector */}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 block">
                  Delivery Method:
                </span>
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setDeliveryMode('delivery')}
                    className={clsx(
                      'py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                      deliveryMode === 'delivery'
                        ? 'bg-white text-emerald-800 shadow-xs border border-gray-200'
                        : 'text-gray-500 hover:text-gray-800'
                    )}
                  >
                    <Truck size={14} />
                    <span>Delivery</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMode('pickup')}
                    className={clsx(
                      'py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                      deliveryMode === 'pickup'
                        ? 'bg-white text-emerald-800 shadow-xs border border-gray-200'
                        : 'text-gray-500 hover:text-gray-800'
                    )}
                  >
                    <Store size={14} />
                    <span>Pickup (Free)</span>
                  </button>
                </div>

                {deliveryMode === 'delivery' && totalEstimatedAmount > 0 && totalEstimatedAmount < FREE_DELIVERY_THRESHOLD && (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 font-semibold flex items-center gap-1.5">
                    <Truck size={13} className="text-emerald-700 shrink-0" />
                    <span>Add ₹{FREE_DELIVERY_THRESHOLD - totalEstimatedAmount} more for <b>FREE Delivery</b>!</span>
                  </div>
                )}
              </div>

              {normalizedCartList.length > 0 && (
                <div className="pt-2 border-t border-gray-100 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Items Subtotal:</span>
                    <span className="font-bold text-gray-800">₹{totalEstimatedAmount}</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Delivery Charges:</span>
                    <span className={clsx('font-bold', deliveryCharge > 0 ? 'text-gray-900' : 'text-emerald-700')}>
                      {deliveryCharge > 0 ? `₹${deliveryCharge}` : 'FREE (₹0)'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-black pt-1.5 border-t border-dashed border-gray-200 text-gray-900">
                    <span>Total Payable:</span>
                    <span className="text-lg text-primary-700">₹{finalGrandTotal}</span>
                  </div>
                </div>
              )}

              {/* Checkout Form */}
              <form onSubmit={handlePlaceOrder} className="space-y-3 pt-2 text-xs">
                <div>
                  <label className="form-label">Your Name *</label>
                  <input
                    className="form-input"
                    required
                    placeholder="Full Name"
                    value={customerInfo.name}
                    onChange={e => setCustomerInfo(i => ({ ...i, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label">Mobile Number *</label>
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
                {deliveryMode === 'delivery' ? (
                  <div>
                    <label className="form-label">Delivery Address *</label>
                    <input
                      className="form-input"
                      required
                      placeholder="Door No, Building, Street, Area"
                      value={customerInfo.address}
                      onChange={e => setCustomerInfo(i => ({ ...i, address: e.target.value }))}
                    />
                  </div>
                ) : (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-700 flex items-center gap-1.5">
                    <MapPin size={13} className="text-slate-500 shrink-0" />
                    <span><b>Counter Pickup:</b> Collect at New Columbu Stores counter.</span>
                  </div>
                )}
                <div>
                  <label className="form-label">Special Notes</label>
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
                  className="btn-primary w-full py-3.5 text-sm font-bold mt-2 gap-2 cursor-pointer shadow-md"
                >
                  {submitting ? 'Submitting Order...' : 'Place Grocery Order'}
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
