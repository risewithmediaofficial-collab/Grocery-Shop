import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  ShoppingCart, Package, Check, CheckCircle, Clock, Search, Plus, Minus,
  X, ExternalLink, RefreshCw, Send, Copy, Phone, MapPin, Eye,
  Loader2, Truck, CheckCheck, FileText, ChevronRight, User, AlertCircle,
  CheckCircle2, Layers, ShieldCheck, Store, MessageCircle,
  Printer, Edit3, CheckSquare, Square, CreditCard, QrCode, Banknote, Trash2, ArrowLeftRight, Filter, UserCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import clsx from 'clsx';
import CategoryIcon from '../../components/common/CategoryIcon';
import { playNewOrderAlert } from '../../utils/audioFeedback';
import { printOrderReceipt } from '../../utils/printReceipt';

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
  const canAssignOrders = ['admin', 'cashier', 'manager'].includes(currentUser?.role);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTypeParam = searchParams.get('type');
  const cart = useCart();
  const [orders, setOrders] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [viewMode, setViewMode] = useState('queue'); // 'queue' (Orders Queue) or 'create' (Create Order)
  const [queueTab, setQueueTab] = useState('active'); // 'active' | 'completed' | 'all'
  const [orderTypeFilter, setOrderTypeFilter] = useState(() => {
    if (urlTypeParam === 'offline' || urlTypeParam === 'all') return urlTypeParam;
    return 'online';
  });

  // Sync state if URL query param changes from sidebar navigation
  useEffect(() => {
    if (urlTypeParam === 'offline' || urlTypeParam === 'all') {
      setOrderTypeFilter(urlTypeParam);
    } else {
      setOrderTypeFilter('online');
    }
  }, [urlTypeParam]);

  const handleSetOrderTypeFilter = (newType) => {
    setOrderTypeFilter(newType);
    const nextParams = new URLSearchParams(searchParams);
    if (newType === 'all') {
      nextParams.delete('type');
    } else {
      nextParams.set('type', newType);
    }
    setSearchParams(nextParams);
  };
  const [search, setSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null); // For Order Details Modal
  const [selectedOrderForPacking, setSelectedOrderForPacking] = useState(null); // Dedicated Itemized Packing Drawer
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState(null); // Edit Order & Damaged Items Replacement Modal
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState(null); // Record Payment Modal (Cash/UPI)
  const [packingSearch, setPackingSearch] = useState('');
  const [processingOrderId, setProcessingOrderId] = useState(null);
  const [selectedProductForPackaging, setSelectedProductForPackaging] = useState(null);

  // Edit Order Modal State
  const [editOrderItems, setEditOrderItems] = useState([]);
  const [editOrderType, setEditOrderType] = useState('online');
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerMobile, setEditCustomerMobile] = useState('');
  const [editDeliveryAddress, setEditDeliveryAddress] = useState('');
  const [editDeliveryCharge, setEditDeliveryCharge] = useState(0);
  const [editNotes, setEditNotes] = useState('');
  const [itemReplacingIndex, setItemReplacingIndex] = useState(null);
  const [replaceSearch, setReplaceSearch] = useState('');
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [addProductSearch, setAddProductSearch] = useState('');
  const [savingOrderEdit, setSavingOrderEdit] = useState(false);

  // Payment Recording Modal State
  const [paymentFormData, setPaymentFormData] = useState({
    paymentStatus: 'paid',
    paymentMethod: 'cash',
    paidAmount: '',
    cashAmount: '',
    upiAmount: '',
    upiTransactionId: '',
    collectedBy: ''
  });
  const [recordingPayment, setRecordingPayment] = useState(false);

  // Packer assignment state
  const [packers, setPackers] = useState([]);
  const [assigningOrderId, setAssigningOrderId] = useState(null); // orderId with open assign dropdown
  const [savingAssign, setSavingAssign] = useState(false);

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
      const [catRes, ordRes, packersRes] = await Promise.all([
        api.get('/products?status=active&limit=100').catch(() => api.get('/orders/catalog')),
        api.get('/orders').catch(() => ({ data: { data: [] } })),
        canAssignOrders ? api.get('/users/packers').catch(() => ({ data: { data: [] } })) : Promise.resolve({ data: { data: [] } }),
      ]);
      setCatalog(catRes.data.data || []);
      setOrders(ordRes.data?.data || []);
      setPackers(packersRes.data?.data || []);
    } catch (err) {
      console.error('Error loading orders data', err);
    } finally {
      setLoading(false);
    }
  }, [canAssignOrders]);

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

  // Channel-scoped orders based on active filter ('online' | 'offline' | 'all')
  const channelOrders = useMemo(() => {
    if (orderTypeFilter === 'all') return orders;
    return orders.filter(o => (o.orderType || 'online') === orderTypeFilter);
  }, [orders, orderTypeFilter]);

  // Active vs Completed Counts scoped to the current channel
  const activeOrdersCount = useMemo(() => {
    return channelOrders.filter(o => o.status !== 'delivered' && !o.sentToBilling && o.status !== 'cancelled').length;
  }, [channelOrders]);

  const completedOrdersCount = useMemo(() => {
    return channelOrders.filter(o => o.status === 'delivered' || o.sentToBilling === true).length;
  }, [channelOrders]);

  const readyInTransitCount = useMemo(() => {
    return channelOrders.filter(o => o.status === 'ready' || o.status === 'out_for_delivery').length;
  }, [channelOrders]);

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

  // Filter orders for Admin mode with Active vs Completed separation and Online vs Offline filter
  const filteredOrders = useMemo(() => {
    return channelOrders.filter(o => {
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
  }, [channelOrders, queueTab, orderSearch, statusFilter]);

  const onlineOrdersCount = useMemo(() => orders.filter(o => (o.orderType || 'online') === 'online').length, [orders]);
  const offlineOrdersCount = useMemo(() => orders.filter(o => o.orderType === 'offline').length, [orders]);

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

  // Packer / Staff Accepts Order
  const handleAcceptOrder = async (order) => {
    if (processingOrderId) return;
    setProcessingOrderId(order._id);
    try {
      const res = await api.put(`/orders/${order._id}/accept`);
      const updated = res.data.data;
      setOrders(prev => prev.map(o => o._id === order._id ? updated : o));
      if (selectedOrderDetails?._id === order._id) {
        setSelectedOrderDetails(updated);
      }
      toast.success(`Order #${order.orderNumber} accepted! Opening packing checklist...`);
      setSelectedOrderForPacking(updated);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept order');
      loadData();
    } finally {
      setProcessingOrderId(null);
    }
  };

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
        orderType: orderTypeFilter === 'offline' ? 'offline' : 'online',
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

  // Direct Bill Printing (Thermal 80mm & A4)
  const handlePrintOrder = (order) => {
    printOrderReceipt(order);
    toast.success(`Printing bill for #${order.orderNumber}...`);
  };

  // Toggle item packing status
  const handleToggleItemPack = async (orderId, itemId) => {
    try {
      const res = await api.put(`/orders/${orderId}/items/${itemId}/pack`);
      const updated = res.data.data;
      setOrders(prev => prev.map(o => o._id === orderId ? updated : o));
      if (selectedOrderForPacking?._id === orderId) setSelectedOrderForPacking(updated);
      if (selectedOrderDetails?._id === orderId) setSelectedOrderDetails(updated);
      toast.success(res.data.message || 'Item pack status updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update packing status');
    }
  };

  // Pack all items in an order
  const handlePackAll = async (orderId) => {
    try {
      const res = await api.put(`/orders/${orderId}/pack-all`);
      const updated = res.data.data;
      setOrders(prev => prev.map(o => o._id === orderId ? updated : o));
      if (selectedOrderForPacking?._id === orderId) setSelectedOrderForPacking(updated);
      if (selectedOrderDetails?._id === orderId) setSelectedOrderDetails(updated);
      toast.success('All items marked as packed!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to pack all items');
    }
  };

  // Open Edit Order Modal (Allowed for online/offline and even after billed!)
  const handleOpenEditModal = (order) => {
    setSelectedOrderForEdit(order);
    setEditOrderType(order.orderType || 'online');
    setEditCustomerName(order.customerName || '');
    setEditCustomerMobile(order.customerMobile || '');
    setEditDeliveryAddress(order.deliveryAddress || '');
    setEditDeliveryCharge(order.deliveryCharge || 0);
    setEditNotes(order.notes || '');
    setEditOrderItems((order.items || []).map(it => ({
      product: it.product?._id || it.product,
      productName: it.productName || it.name || 'Item',
      quantity: Number(it.quantity || 1),
      unit: it.unit || 'unit',
      unitPrice: Number(it.unitPrice || it.sellingPrice || 0),
      totalPrice: Number(it.totalPrice || ((it.unitPrice || it.sellingPrice || 0) * (it.quantity || 1))),
      notes: it.notes || '',
      isPacked: !!it.isPacked,
      packedBy: it.packedBy,
      packedAt: it.packedAt
    })));
  };

  // Save Edited Order
  const handleSaveEditedOrder = async () => {
    if (!selectedOrderForEdit) return;
    if (editOrderItems.length === 0) return toast.error('Order must have at least one product');
    setSavingOrderEdit(true);
    try {
      const res = await api.put(`/orders/${selectedOrderForEdit._id}/items`, {
        orderType: editOrderType,
        customerName: editCustomerName.trim(),
        customerMobile: editCustomerMobile.trim(),
        deliveryAddress: editDeliveryAddress.trim(),
        deliveryCharge: Math.max(0, Number(editDeliveryCharge) || 0),
        notes: editNotes.trim(),
        items: editOrderItems
      });
      const updated = res.data.data;
      setOrders(prev => prev.map(o => o._id === selectedOrderForEdit._id ? updated : o));
      if (selectedOrderForPacking?._id === selectedOrderForEdit._id) setSelectedOrderForPacking(updated);
      if (selectedOrderDetails?._id === selectedOrderForEdit._id) setSelectedOrderDetails(updated);
      setSelectedOrderForEdit(null);
      toast.success('Order items and details updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update order');
    } finally {
      setSavingOrderEdit(false);
    }
  };

  // Open Payment Recording Modal
  const handleOpenPaymentModal = (order) => {
    setSelectedOrderForPayment(order);
    const itemsTotal = (order.items || []).reduce((acc, it) => acc + (Number(it.totalPrice) || (Number(it.unitPrice || 0) * Number(it.quantity || 1))), 0);
    const grandTotal = Number(order.totalAmount || (itemsTotal + (order.deliveryCharge || 0)));
    setPaymentFormData({
      paymentStatus: order.paymentStatus || 'paid',
      paymentMethod: order.paymentMethod || 'cash',
      paidAmount: String(order.paidAmount || grandTotal),
      cashAmount: String(order.cashAmount || (order.paymentMethod === 'cash' ? grandTotal : 0)),
      upiAmount: String(order.upiAmount || (order.paymentMethod === 'upi' ? grandTotal : 0)),
      upiTransactionId: order.upiTransactionId || '',
      collectedBy: order.collectedBy || currentUser?.name || 'Staff'
    });
  };

  // Save Recorded Payment
  const handleSavePayment = async () => {
    if (!selectedOrderForPayment) return;
    setRecordingPayment(true);
    try {
      const res = await api.put(`/orders/${selectedOrderForPayment._id}/payment`, {
        paymentStatus: paymentFormData.paymentStatus,
        paymentMethod: paymentFormData.paymentMethod,
        paidAmount: Number(paymentFormData.paidAmount) || 0,
        cashAmount: Number(paymentFormData.cashAmount) || 0,
        upiAmount: Number(paymentFormData.upiAmount) || 0,
        upiTransactionId: paymentFormData.upiTransactionId.trim(),
        collectedBy: paymentFormData.collectedBy.trim() || currentUser?.name || 'Staff'
      });
      const updated = res.data.data;
      setOrders(prev => prev.map(o => o._id === selectedOrderForPayment._id ? { ...o, ...updated } : o));
      if (selectedOrderDetails?._id === selectedOrderForPayment._id) {
        setSelectedOrderDetails(prev => ({ ...prev, ...updated }));
      }
      setSelectedOrderForPayment(null);
      toast.success(`Payment details recorded for Order #${selectedOrderForPayment.orderNumber}!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setRecordingPayment(false);
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

  // Assign order to a packer
  const handleAssignPacker = async (orderId, packerId) => {
    setSavingAssign(true);
    try {
      const res = await api.put(`/orders/${orderId}/assign`, { packerId });
      const updated = res.data.data;
      setOrders(prev => prev.map(o => o._id === orderId ? updated : o));
      if (selectedOrderDetails?._id === orderId) setSelectedOrderDetails(updated);
      toast.success(res.data.message || 'Order assigned to packer!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign packer');
    } finally {
      setSavingAssign(false);
      setAssigningOrderId(null);
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
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex flex-wrap items-center gap-2.5 sm:gap-3">
            <Package className="text-primary-600 shrink-0" size={28} />
            <span>
              {orderTypeFilter === 'offline'
                ? 'Offline Store Orders'
                : orderTypeFilter === 'all'
                ? 'All Orders Queue'
                : 'Online Customer Orders'}
            </span>
            {orderTypeFilter === 'offline' ? (
              <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-purple-100 text-purple-800 border border-purple-200">
                🏪 Offline Channel
              </span>
            ) : orderTypeFilter === 'all' ? (
              <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-gray-100 text-gray-800 border border-gray-200">
                All Orders
              </span>
            ) : (
              <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-blue-100 text-blue-800 border border-blue-200">
                🌐 Online Channel
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {orderTypeFilter === 'offline'
              ? 'Manage store walk-in orders, direct packaging, and store receipts'
              : 'Manage incoming customer online delivery orders, live rider tracking, and packing'}
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
              <span>Orders Queue ({channelOrders.length})</span>
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
                <p className="text-2xl sm:text-3xl font-black text-gray-900">{channelOrders.length}</p>
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
                  {readyInTransitCount}
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
            {/* Top Queue Filter Header with SEPARATE ACTIVE & COMPLETED TABS + ONLINE VS OFFLINE TABS */}
            <div className="p-4 sm:p-5 bg-gray-50/80 border-b border-gray-200 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
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
                    <span>All ({channelOrders.length})</span>
                  </button>
                </div>
              </div>

              {/* Right: Search & Status Filter */}
              <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
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

            {/* Clean Full-Width Screen Table */}
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/90 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-4 px-5">Order # & Type</th>
                    <th className="py-4 px-5">Customer & Time</th>
                    <th className="py-4 px-5">Mobile</th>
                    <th className="py-4 px-5 text-center">Delivery & Mode</th>
                    <th className="py-4 px-5 text-center">Items & Packing</th>
                    <th className="py-4 px-5 text-center">Payment / Bill</th>
                    <th className="py-4 px-5 text-center">Order Status</th>
                    <th className="py-4 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-16 text-gray-400">
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
                      const packedCount = (ord.items || []).filter(item => item.isPacked).length;
                      const isAllPacked = (ord.items?.length > 0) && packedCount === ord.items.length;
                      const isCompleted = ord.status === 'delivered' || ord.paymentStatus === 'paid';
                      const isOnline = (ord.orderType || 'online') === 'online';
                      const itemsSubtotal = (ord.items || []).reduce((acc, it) => acc + (Number(it.totalPrice) || (Number(it.unitPrice || 0) * Number(it.quantity || 1))), 0);
                      const finalOrderTotal = Number(ord.totalAmount || (itemsSubtotal + (ord.deliveryCharge || 0)));

                      return (
                        <tr key={ord._id} className={clsx('transition-colors', isCompleted ? 'bg-gray-50/30 hover:bg-gray-50/70' : 'hover:bg-primary-50/20')}>
                          {/* Order Number & Type */}
                          <td className="py-4 px-5">
                            <div className="flex flex-col gap-1.5 items-start">
                              <button
                                onClick={() => setSelectedOrderDetails(ord)}
                                className={clsx(
                                  'font-mono font-black text-sm px-2.5 py-1 rounded-lg border whitespace-nowrap cursor-pointer transition-colors',
                                  isCompleted
                                    ? 'bg-green-50 text-green-800 border-green-200 hover:bg-green-100'
                                    : 'bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-100'
                                )}
                                title="Click to view full order details"
                              >
                                {ord.orderNumber}
                              </button>
                              <span className={clsx(
                                'text-[10px] font-extrabold px-2 py-0.5 rounded-md border tracking-wide uppercase',
                                isOnline
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : 'bg-purple-50 text-purple-800 border-purple-200'
                              )}>
                                {isOnline ? '🌐 Online' : '🏪 Offline'}
                              </span>
                            </div>
                          </td>

                          {/* Customer Name & Date */}
                          <td className="py-4 px-5">
                            <p className="font-extrabold text-gray-900 text-sm leading-snug">{ord.customerName}</p>
                            <span className="text-xs text-gray-400 font-medium block">
                              {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                            {ord.assignedToName && (
                              <div className="mt-1">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200">
                                  <UserCheck size={10} className="text-indigo-600" />
                                  <span>Packer: {ord.assignedToName === currentUser?.name ? 'You' : ord.assignedToName}</span>
                                </span>
                              </div>
                            )}
                            {(ord.acceptedByName || ord.confirmedByName) ? (
                              <div className="mt-1 flex items-center gap-1">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                                  <CheckCircle size={10} className="text-emerald-600" />
                                  <span>Accepted by {(ord.acceptedByName || ord.confirmedByName) === currentUser?.name ? 'You' : `${(ord.acceptedByName || ord.confirmedByName)}${ord.acceptedByRole ? ` (${ord.acceptedByRole})` : ''}`}</span>
                                </span>
                              </div>
                            ) : ord.status === 'pending' ? (
                              <div className="mt-1">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
                                  <Clock size={10} className="text-amber-600" />
                                  <span>Awaiting Acceptance</span>
                                </span>
                              </div>
                            ) : null}
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
                                  <><Store size={12} /><span>Pickup</span></>
                                )}
                              </span>
                              <span className="text-[11px] text-gray-500 max-w-[130px] truncate" title={ord.deliveryAddress || 'Store Pickup'}>
                                {ord.deliveryAddress || 'Store Pickup'}
                              </span>
                            </div>
                          </td>

                          {/* Separate Items & Packing Button */}
                          <td className="py-4 px-5 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedOrderForPacking(ord)}
                              className="inline-flex flex-col items-center gap-1 bg-gray-50 hover:bg-primary-50 text-gray-800 hover:text-primary-800 p-2 rounded-xl text-xs font-bold border border-gray-200 hover:border-primary-300 transition-all cursor-pointer shadow-2xs"
                              title="Open dedicated packing checklist & item list"
                            >
                              <span className="flex items-center gap-1 font-bold text-xs text-primary-700">
                                <Package size={13} />
                                <span>{(ord.items || []).length} Products</span>
                              </span>
                              {isAllPacked ? (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                  <CheckCircle2 size={10} className="text-emerald-600" />
                                  <span>All Packed</span>
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                  {packedCount}/{(ord.items || []).length} Packed
                                </span>
                              )}
                            </button>
                          </td>

                          {/* Payment / Bill Amount */}
                          <td className="py-4 px-5 text-center whitespace-nowrap">
                            <div className="flex flex-col items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenPaymentModal(ord)}
                                className={clsx(
                                  'text-xs font-extrabold px-2.5 py-1 rounded-xl border flex items-center gap-1 cursor-pointer transition-all shadow-2xs',
                                  ord.paymentStatus === 'paid'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                    : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                                )}
                                title="Click to view or record payment details"
                              >
                                <CreditCard size={12} />
                                <span>{ord.paymentStatus === 'paid' ? `Paid ₹${ord.paidAmount || finalOrderTotal}` : `Collect ₹${finalOrderTotal}`}</span>
                              </button>
                              <span className="text-[10px] text-gray-500 font-medium">
                                {ord.paymentStatus === 'paid'
                                  ? (ord.paymentMethod === 'upi' ? `UPI (${ord.collectedBy || 'Staff'})` : `Cash (${ord.collectedBy || 'Staff'})`)
                                  : 'To Collect on Delivery'}
                              </span>
                            </div>
                          </td>

                          {/* Status Dropdown / Accept Button */}
                          <td className="py-4 px-5 text-center whitespace-nowrap">
                            {ord.status === 'pending' ? (
                              <div className="flex flex-col items-center">
                                <button
                                  type="button"
                                  disabled={isProcessing}
                                  onClick={() => handleAcceptOrder(ord)}
                                  className="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-1.5 px-3.5 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer hover:shadow-md transition-all animate-pulse"
                                  title="Accept order to confirm and start packing"
                                >
                                  {isProcessing ? (
                                    <Loader2 size={13} className="animate-spin" />
                                  ) : (
                                    <CheckCircle2 size={14} className="text-white" />
                                  )}
                                  <span>Accept Order</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1.5">
                                {(ord.acceptedByName || ord.confirmedByName) && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                                    <CheckCircle2 size={11} className="text-emerald-600 shrink-0" />
                                    <span>
                                      Accepted by {(ord.acceptedByName || ord.confirmedByName) === currentUser?.name ? 'You' : `${(ord.acceptedByName || ord.confirmedByName)}${ord.acceptedByRole ? ` (${ord.acceptedByRole})` : ''}`}
                                    </span>
                                  </span>
                                )}
                                <select
                                  disabled={isProcessing}
                                  className={clsx(
                                    'text-xs font-bold py-1.5 px-3 rounded-xl border shadow-2xs cursor-pointer',
                                    ord.status === 'confirmed' && 'bg-green-50 text-green-800 border-green-300',
                                    ord.status === 'packing' && 'bg-amber-50 text-amber-800 border-amber-300',
                                    ord.status === 'ready' && 'bg-blue-50 text-blue-800 border-blue-300',
                                    ord.status === 'out_for_delivery' && 'bg-purple-50 text-purple-800 border-purple-300',
                                    ord.status === 'delivered' && 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  )}
                                  value={ord.status || 'confirmed'}
                                  onChange={e => handleUpdateStatus(ord._id, e.target.value)}
                                >
                                  <option value="confirmed">Confirmed</option>
                                  <option value="packing">Packing</option>
                                  <option value="ready">Ready</option>
                                  <option value="out_for_delivery">Out for Delivery</option>
                                  <option value="delivered">Delivered</option>
                                </select>
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-5 text-right whitespace-nowrap relative">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {ord.status === 'pending' && (
                                <button
                                  type="button"
                                  disabled={isProcessing}
                                  onClick={() => handleAcceptOrder(ord)}
                                  className="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold py-1.5 px-2.5 rounded-xl shadow-2xs flex items-center gap-1 cursor-pointer"
                                  title="Quick Accept Order"
                                >
                                  <Check size={13} strokeWidth={3} />
                                  <span>Accept</span>
                                </button>
                              )}

                              {canAssignOrders && (
                                <div className="relative inline-block">
                                  <button
                                    type="button"
                                    onClick={() => setAssigningOrderId(assigningOrderId === ord._id ? null : ord._id)}
                                    className="btn btn-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold py-1.5 px-2.5 rounded-xl shadow-2xs flex items-center gap-1 cursor-pointer"
                                    title="Assign to a packer"
                                  >
                                    <UserCheck size={13} />
                                    <span>{ord.assignedToName ? 'Reassign' : 'Assign'}</span>
                                  </button>

                                  {/* Assign Packer Dropdown */}
                                  {assigningOrderId === ord._id && (
                                    <div className="absolute right-0 mt-1 z-50 w-52 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden" style={{ top: '100%' }}>
                                      <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                                        <p className="text-[10px] font-extrabold text-gray-600 uppercase tracking-wider">Assign to Packer</p>
                                      </div>
                                      <div className="max-h-48 overflow-y-auto py-1">
                                        {packers.length === 0 ? (
                                          <p className="text-xs text-gray-400 px-3 py-2">No packers available</p>
                                        ) : packers.map(p => (
                                          <button
                                            key={p._id}
                                            type="button"
                                            disabled={savingAssign}
                                            onClick={() => handleAssignPacker(ord._id, p._id)}
                                            className={clsx(
                                              'w-full text-left px-3 py-2 text-xs font-semibold hover:bg-primary-50 hover:text-primary-800 transition-colors cursor-pointer flex items-center gap-2',
                                              ord.assignedTo === p._id || ord.assignedToName === p.name ? 'bg-indigo-50 text-indigo-800 font-bold' : 'text-gray-700'
                                            )}
                                          >
                                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-black shrink-0">
                                              {p.name?.charAt(0)?.toUpperCase()}
                                            </div>
                                            <div>
                                              <p>{p.name}</p>
                                              <p className="text-[10px] text-gray-400 capitalize">{p.role}</p>
                                            </div>
                                            {(ord.assignedTo === p._id || ord.assignedToName === p.name) && (
                                              <CheckCircle2 size={12} className="text-indigo-600 ml-auto" />
                                            )}
                                          </button>
                                        ))}
                                      </div>
                                      <div className="px-2 py-1.5 border-t border-gray-100">
                                        <button type="button" onClick={() => setAssigningOrderId(null)} className="w-full text-xs text-gray-500 hover:text-gray-700 py-1 cursor-pointer">Cancel</button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => handlePrintOrder(ord)}
                                className="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-2.5 rounded-xl shadow-2xs flex items-center gap-1 cursor-pointer"
                                title="Print Digital Invoice / Bill (Thermal 80mm & A4)"
                              >
                                <Printer size={13} />
                                <span>Bill</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setSelectedOrderForPacking(ord)}
                                className="btn-secondary py-1.5 px-2.5 text-xs font-bold gap-1 cursor-pointer rounded-xl"
                                title="Open packing checklist"
                              >
                                <CheckSquare size={13} className="text-primary-600" />
                                <span>Pack</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(ord)}
                                className="btn-outline py-1.5 px-2.5 text-xs font-bold gap-1 cursor-pointer rounded-xl bg-white text-gray-700"
                                title="Edit items, replace damaged product, or change order type (allowed even after billed)"
                              >
                                <Edit3 size={13} />
                                <span>Edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => sendWhatsAppUpdate(ord)}
                                className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all cursor-pointer shadow-2xs"
                                title="Send 1-click WhatsApp order update to customer"
                              >
                                <MessageCircle size={14} />
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
                  {(selectedOrderDetails.acceptedByName || selectedOrderDetails.confirmedByName) ? (
                    <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl px-3 py-1.5 font-bold flex items-center gap-1.5 shadow-2xs">
                      <CheckCircle size={14} className="text-emerald-600" />
                      <span>Accepted by: <strong>{(selectedOrderDetails.acceptedByName || selectedOrderDetails.confirmedByName) === currentUser?.name ? 'You' : (selectedOrderDetails.acceptedByName || selectedOrderDetails.confirmedByName)}</strong> ({selectedOrderDetails.acceptedByRole || selectedOrderDetails.confirmedByRole || 'Staff'})</span>
                      {(selectedOrderDetails.acceptedAt || selectedOrderDetails.confirmedAt) && (
                        <span className="text-emerald-700 text-[11px] font-normal">
                          · {new Date(selectedOrderDetails.acceptedAt || selectedOrderDetails.confirmedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="bg-amber-50 text-amber-900 border border-amber-300 rounded-xl px-3.5 py-2 font-bold flex items-center justify-between gap-3 shadow-2xs w-full">
                      <div className="flex items-center gap-2">
                        <Clock size={15} className="text-amber-600 animate-pulse" />
                        <span>Awaiting staff / packer acceptance</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAcceptOrder(selectedOrderDetails)}
                        className="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-1.5 px-3.5 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 size={13} />
                        <span>Accept Now</span>
                      </button>
                    </div>
                  )}

                  {selectedOrderDetails.assignedToName && (
                    <div className="bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-xl px-3 py-1.5 font-bold flex items-center gap-1.5 shadow-2xs">
                      <UserCheck size={14} className="text-indigo-600" />
                      <span>Packer Assigned: <strong>{selectedOrderDetails.assignedToName === currentUser?.name ? 'You' : selectedOrderDetails.assignedToName}</strong></span>
                      {selectedOrderDetails.assignedByName && (
                        <span className="text-indigo-600 text-[11px] font-normal">
                          (Assigned by {selectedOrderDetails.assignedByName === currentUser?.name ? 'You' : selectedOrderDetails.assignedByName})
                        </span>
                      )}
                    </div>
                  )}

                  {selectedOrderDetails.sentToBilling && (
                    <div className="bg-purple-50 text-purple-800 border border-purple-200 rounded-xl px-3 py-1.5 font-bold flex items-center gap-1.5 shadow-2xs">
                      <span>Loaded to Billing POS by: <strong>{selectedOrderDetails.sentToBillingBy || selectedOrderDetails.acceptedByName || selectedOrderDetails.confirmedByName || 'Staff'}</strong></span>
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
            <div className="p-5 border-t border-gray-100 bg-white flex flex-wrap items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedOrderDetails(null)}
                className="btn-secondary py-2.5 px-4 text-xs font-bold cursor-pointer"
              >
                Close
              </button>

              <div className="flex flex-wrap items-center gap-2">
                {selectedOrderDetails.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => handleAcceptOrder(selectedOrderDetails)}
                    className="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 text-xs font-black gap-1.5 shadow-md hover:shadow-lg cursor-pointer flex items-center animate-pulse"
                    title="Accept this order to confirm and proceed to packing"
                  >
                    <CheckCircle2 size={15} />
                    <span>Accept Order</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const ord = selectedOrderDetails;
                    setSelectedOrderDetails(null);
                    handleOpenEditModal(ord);
                  }}
                  className="btn-outline py-2.5 px-4 text-xs font-bold gap-1.5 cursor-pointer bg-white text-gray-800"
                  title="Edit items, change quantities, replace damaged product, or change order type (allowed even after billed)"
                >
                  <Edit3 size={14} />
                  <span>Edit Order & Items</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const ord = selectedOrderDetails;
                    setSelectedOrderDetails(null);
                    setSelectedOrderForPacking(ord);
                  }}
                  className="btn-secondary py-2.5 px-4 text-xs font-bold gap-1.5 cursor-pointer"
                  title="Open dedicated packing checklist"
                >
                  <CheckSquare size={14} className="text-primary-600" />
                  <span>Packing Checklist</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const ord = selectedOrderDetails;
                    setSelectedOrderDetails(null);
                    handleOpenPaymentModal(ord);
                  }}
                  className="btn btn-sm bg-amber-50 text-amber-900 border border-amber-300 py-2.5 px-4 text-xs font-bold gap-1.5 cursor-pointer hover:bg-amber-100"
                  title="Record payment collected by delivery boy or shop scanner"
                >
                  <CreditCard size={14} />
                  <span>{selectedOrderDetails.paymentStatus === 'paid' ? 'View Payment' : 'Record Payment'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePrintOrder(selectedOrderDetails)}
                  className="btn-primary py-2.5 px-5 text-xs font-bold gap-2 shadow-md hover:shadow-lg cursor-pointer bg-emerald-600 hover:bg-emerald-700"
                  title="Print Digital Invoice / Delivery Receipt"
                >
                  <Printer size={15} />
                  <span>Print Delivery Bill</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* DEDICATED PACKING CHECKLIST DRAWER/MODAL (Separated view for 100+ items with instant search) */}
      {selectedOrderForPacking && createPortal(
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] my-auto flex flex-col shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Packing Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-emerald-50/70 via-white to-primary-50/40">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center font-bold shadow-xs">
                  <CheckSquare size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-black text-lg text-gray-900">
                      Packing Checklist: <span className="font-mono text-primary-700">{selectedOrderForPacking.orderNumber}</span>
                    </h3>
                    <span className={clsx(
                      'text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider',
                      (selectedOrderForPacking.orderType || 'online') === 'online'
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : 'bg-purple-50 text-purple-800 border-purple-200'
                    )}>
                      {(selectedOrderForPacking.orderType || 'online') === 'online' ? '🌐 Online' : '🏪 Offline'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Customer: <strong className="text-gray-800">{selectedOrderForPacking.customerName}</strong> (+91 {selectedOrderForPacking.customerMobile || '-'})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrderForPacking(null)}
                className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Pending Acceptance Alert Banner */}
            {selectedOrderForPacking.status === 'pending' && (
              <div className="mx-6 mt-4 p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-900 font-semibold shadow-xs animate-pulse">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-amber-600 shrink-0" />
                  <span>This order is awaiting acceptance. Accept it now to confirm and proceed to packing.</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleAcceptOrder(selectedOrderForPacking)}
                  className="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-1.5 px-3.5 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <CheckCircle2 size={14} />
                  <span>Accept Order</span>
                </button>
              </div>
            )}

            {/* Packing Progress & Fast Actions */}
            <div className="p-5 border-b border-gray-100 bg-gray-50/60 space-y-3">
              {(() => {
                const total = selectedOrderForPacking.items?.length || 0;
                const packed = (selectedOrderForPacking.items || []).filter(i => i.isPacked).length;
                const percent = total > 0 ? Math.round((packed / total) * 100) : 0;
                const isAll = total > 0 && packed === total;

                return (
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                      <span className="text-gray-700 flex items-center gap-1.5">
                        <Package size={14} className="text-primary-600" />
                        <span>Packing Progress: {packed} of {total} Products Packed ({percent}%)</span>
                      </span>
                      {isAll ? (
                        <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                          <CheckCircle2 size={13} /> Fully Packed & Ready
                        </span>
                      ) : (
                        <span className="text-amber-700 font-bold">{total - packed} items remaining</span>
                      )}
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={clsx('h-full transition-all duration-300 rounded-full', isAll ? 'bg-emerald-500' : 'bg-primary-600')}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Search & Fast Pack All */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1">
                <div className="relative w-full sm:w-72">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    className="form-input pl-8 py-1.5 text-xs bg-white w-full rounded-xl"
                    placeholder="Search in products checklist..."
                    value={packingSearch}
                    onChange={e => setPackingSearch(e.target.value)}
                  />
                  {packingSearch && (
                    <button onClick={() => setPackingSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => handlePackAll(selectedOrderForPacking._id)}
                    className="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 px-3 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <CheckCheck size={14} />
                    <span>Pack All Items</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const ord = selectedOrderForPacking;
                      setSelectedOrderForPacking(null);
                      handleOpenEditModal(ord);
                    }}
                    className="btn-outline btn-sm font-bold text-xs py-1.5 px-3 rounded-xl flex items-center gap-1.5 cursor-pointer bg-white"
                  >
                    <Edit3 size={13} />
                    <span>Edit / Replace Damaged</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Product Items Checklist (Handles 100+ items smoothly) */}
            <div className="p-5 overflow-y-auto flex-1 space-y-2.5 bg-gray-50/30 max-h-[50vh]">
              {(() => {
                const q = packingSearch.trim().toLowerCase();
                const items = (selectedOrderForPacking.items || []).filter(it =>
                  !q || it.productName?.toLowerCase().includes(q) || it.notes?.toLowerCase().includes(q)
                );

                if (items.length === 0) {
                  return (
                    <div className="py-12 text-center text-gray-400">
                      <Package size={36} className="mx-auto mb-2 opacity-40" />
                      <p className="font-bold text-sm text-gray-600">No products found matching "{packingSearch}"</p>
                    </div>
                  );
                }

                return items.map((it, idx) => {
                  const isPacked = !!it.isPacked;

                  return (
                    <div
                      key={it._id || idx}
                      onClick={() => handleToggleItemPack(selectedOrderForPacking._id, it._id)}
                      className={clsx(
                        'p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none',
                        isPacked
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                          : 'bg-white border-gray-200 hover:border-primary-400 hover:bg-primary-50/30'
                      )}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <button
                          type="button"
                          className={clsx(
                            'w-7 h-7 rounded-lg flex items-center justify-center transition-all shrink-0',
                            isPacked
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'border-2 border-gray-300 bg-white hover:border-primary-500'
                          )}
                        >
                          {isPacked ? <Check size={16} className="stroke-[3]" /> : null}
                        </button>

                        <div className="min-w-0">
                          <p className={clsx('font-bold text-sm truncate', isPacked ? 'line-through text-gray-500' : 'text-gray-900')}>
                            {it.productName || 'Grocery Item'}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-gray-500">
                            <span className="font-extrabold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-md border border-primary-100">
                              Qty: {it.quantity} {it.unit || ''}
                            </span>
                            {it.unitPrice > 0 && (
                              <span>₹{it.unitPrice} each = <strong>₹{it.totalPrice || (it.unitPrice * it.quantity)}</strong></span>
                            )}
                            {it.notes && (
                              <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                {it.notes}
                              </span>
                            )}
                          </div>
                          {isPacked && it.packedBy && (
                            <p className="text-[10px] text-emerald-700 font-semibold mt-1">
                              ✓ Packed by {it.packedBy} {it.packedAt ? `at ${new Date(it.packedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ''}
                            </p>
                          )}
                        </div>
                      </div>

                      <span className={clsx(
                        'text-xs font-bold px-3 py-1 rounded-xl border shrink-0',
                        isPacked
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-black'
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                      )}>
                        {isPacked ? '✓ Packed' : 'Tap to Pack'}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-gray-100 bg-white flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedOrderForPacking(null)}
                className="btn-secondary py-2.5 px-4 text-xs font-bold cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintOrder(selectedOrderForPacking)}
                  className="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Printer size={14} />
                  <span>Print Bill</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* DEDICATED EDIT ORDER MODAL (Allowed for Online, Offline, and even after Billed) */}
      {selectedOrderForEdit && createPortal(
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] my-auto flex flex-col shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-purple-50/70 via-white to-primary-50/40">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 text-purple-800 rounded-2xl flex items-center justify-center font-bold shadow-xs">
                  <Edit3 size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-black text-lg text-gray-900">
                      Edit Order: <span className="font-mono text-primary-700">{selectedOrderForEdit.orderNumber}</span>
                    </h3>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                      Editable (Pre or Post Billed)
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Adjust items, replace damaged products, change order type (online/offline), and recalculate bills
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrderForEdit(null)}
                className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-gray-50/40">
              {/* Top Controls: Order Type & Customer Details */}
              <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Order Channel:</span>
                  <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setEditOrderType('online')}
                      className={clsx(
                        'px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer',
                        editOrderType === 'online'
                          ? 'bg-blue-600 text-white shadow-xs font-black'
                          : 'text-gray-600 hover:text-gray-900'
                      )}
                    >
                      🌐 Online Order
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditOrderType('offline')}
                      className={clsx(
                        'px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer',
                        editOrderType === 'offline'
                          ? 'bg-purple-600 text-white shadow-xs font-black'
                          : 'text-gray-600 hover:text-gray-900'
                      )}
                    >
                      🏪 Offline Store Order
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="form-label text-xs font-bold text-gray-600">Customer Name</label>
                    <input
                      type="text"
                      className="form-input text-xs font-semibold py-1.5"
                      value={editCustomerName}
                      onChange={e => setEditCustomerName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label text-xs font-bold text-gray-600">Customer Mobile</label>
                    <input
                      type="tel"
                      className="form-input text-xs font-semibold py-1.5"
                      value={editCustomerMobile}
                      onChange={e => setEditCustomerMobile(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label text-xs font-bold text-gray-600">Delivery Address / Mode</label>
                    <input
                      type="text"
                      className="form-input text-xs font-semibold py-1.5"
                      value={editDeliveryAddress}
                      onChange={e => setEditDeliveryAddress(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label text-xs font-bold text-gray-600">Delivery Fee (₹)</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input text-xs font-bold py-1.5"
                      value={editDeliveryCharge}
                      onChange={e => setEditDeliveryCharge(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Items Management Box */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-800">
                      Order Items ({editOrderItems.length})
                    </h4>
                    <p className="text-[11px] text-gray-500">Modify quantities, rates, or replace damaged items</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddProductModal(!showAddProductModal)}
                    className="btn btn-sm bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold py-1.5 px-3 rounded-xl flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Add Product from Catalog</span>
                  </button>
                </div>

                {/* Add Product from Catalog Dropdown Box */}
                {showAddProductModal && (
                  <div className="p-4 bg-primary-50/50 border-b border-primary-200 space-y-2">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        className="form-input pl-8 py-2 text-xs bg-white w-full rounded-xl"
                        placeholder="Search product from catalog to add..."
                        value={addProductSearch}
                        onChange={e => setAddProductSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto divide-y divide-gray-100 bg-white rounded-xl border border-gray-200">
                      {catalog
                        .filter(p => !addProductSearch || p.name?.toLowerCase().includes(addProductSearch.toLowerCase()))
                        .slice(0, 10)
                        .map(p => (
                          <div
                            key={p._id}
                            onClick={() => {
                              setEditOrderItems(prev => [
                                ...prev,
                                {
                                  product: p._id,
                                  productName: p.name,
                                  quantity: 1,
                                  unit: p.unit?.symbol || 'unit',
                                  unitPrice: Number(p.sellingPrice || 0),
                                  totalPrice: Number(p.sellingPrice || 0),
                                  notes: 'Added via edit',
                                  isPacked: false
                                }
                              ]);
                              setShowAddProductModal(false);
                              setAddProductSearch('');
                              toast.success(`Added ${p.name} to order!`);
                            }}
                            className="p-2.5 hover:bg-primary-50 flex items-center justify-between cursor-pointer text-xs"
                          >
                            <span className="font-bold text-gray-900">{p.name} ({p.unit?.symbol || 'unit'})</span>
                            <span className="font-black text-primary-700">₹{p.sellingPrice}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Items Table */}
                <div className="divide-y divide-gray-100">
                  {editOrderItems.map((item, idx) => (
                    <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/50">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-extrabold text-sm text-gray-900 truncate">{item.productName}</p>
                          {item.notes && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                              {item.notes}
                            </span>
                          )}
                        </div>

                        {/* Replace Damaged Product Picker */}
                        {itemReplacingIndex === idx ? (
                          <div className="mt-2 p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                            <p className="text-xs font-bold text-amber-900 flex items-center gap-1">
                              <ArrowLeftRight size={13} /> Select replacement product for damaged item:
                            </p>
                            <input
                              type="text"
                              className="form-input text-xs py-1.5 bg-white"
                              placeholder="Search replacement product..."
                              value={replaceSearch}
                              onChange={e => setReplaceSearch(e.target.value)}
                              autoFocus
                            />
                            <div className="max-h-36 overflow-y-auto divide-y divide-gray-100 bg-white rounded-lg border border-amber-200">
                              {catalog
                                .filter(p => !replaceSearch || p.name?.toLowerCase().includes(replaceSearch.toLowerCase()))
                                .slice(0, 8)
                                .map(p => (
                                  <div
                                    key={p._id}
                                    onClick={() => {
                                      setEditOrderItems(prev => prev.map((it, i) => i === idx ? {
                                        ...it,
                                        product: p._id,
                                        productName: p.name,
                                        unit: p.unit?.symbol || 'unit',
                                        unitPrice: Number(p.sellingPrice || 0),
                                        totalPrice: Number(p.sellingPrice || 0) * it.quantity,
                                        notes: 'Replaced damaged product'
                                      } : it));
                                      setItemReplacingIndex(null);
                                      setReplaceSearch('');
                                      toast.success(`Swapped with ${p.name}!`);
                                    }}
                                    className="p-2 hover:bg-amber-100/50 flex items-center justify-between cursor-pointer text-xs"
                                  >
                                    <span className="font-bold text-gray-900">{p.name}</span>
                                    <span className="font-black text-amber-900">₹{p.sellingPrice}</span>
                                  </div>
                                ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => setItemReplacingIndex(null)}
                              className="text-xs text-gray-500 hover:text-gray-700 font-bold underline"
                            >
                              Cancel replacement
                            </button>
                          </div>
                        ) : (
                          <div className="mt-1 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setItemReplacingIndex(idx);
                                setReplaceSearch('');
                              }}
                              className="text-[11px] text-amber-800 hover:text-amber-950 font-bold bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer"
                            >
                              <ArrowLeftRight size={11} />
                              <span>Replace Damaged Item</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Quantity, Unit Price & Total */}
                      <div className="flex items-center gap-3 self-end sm:self-center">
                        {/* Qty Stepper */}
                        <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white">
                          <button
                            type="button"
                            onClick={() => {
                              const nextQ = Math.max(1, (item.quantity || 1) - 1);
                              setEditOrderItems(prev => prev.map((it, i) => i === idx ? {
                                ...it,
                                quantity: nextQ,
                                totalPrice: it.unitPrice * nextQ
                              } : it));
                            }}
                            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 cursor-pointer"
                          >
                            <Minus size={13} />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => {
                              const nextQ = Math.max(1, parseInt(e.target.value) || 1);
                              setEditOrderItems(prev => prev.map((it, i) => i === idx ? {
                                ...it,
                                quantity: nextQ,
                                totalPrice: it.unitPrice * nextQ
                              } : it));
                            }}
                            className="w-12 text-center text-xs font-black border-x border-gray-200 py-1"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const nextQ = (item.quantity || 1) + 1;
                              setEditOrderItems(prev => prev.map((it, i) => i === idx ? {
                                ...it,
                                quantity: nextQ,
                                totalPrice: it.unitPrice * nextQ
                              } : it));
                            }}
                            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 cursor-pointer"
                          >
                            <Plus size={13} />
                          </button>
                        </div>

                        {/* Unit Price input */}
                        <div className="flex items-center gap-1 text-xs">
                          <span className="font-bold text-gray-400">₹</span>
                          <input
                            type="number"
                            min="0"
                            value={item.unitPrice}
                            onChange={e => {
                              const nextP = Math.max(0, parseFloat(e.target.value) || 0);
                              setEditOrderItems(prev => prev.map((it, i) => i === idx ? {
                                ...it,
                                unitPrice: nextP,
                                totalPrice: nextP * it.quantity
                              } : it));
                            }}
                            className="w-16 form-input text-xs font-bold py-1 px-1.5"
                          />
                        </div>

                        {/* Line Total */}
                        <span className="font-black text-sm text-gray-900 w-16 text-right">
                          ₹{Number(item.totalPrice || (item.unitPrice * item.quantity)).toFixed(2)}
                        </span>

                        {/* Remove item */}
                        <button
                          type="button"
                          onClick={() => setEditOrderItems(prev => prev.filter((_, i) => i !== idx))}
                          className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center cursor-pointer transition-colors"
                          title="Remove item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtotal & Grand Total Breakdown */}
                {(() => {
                  const itemsTotal = editOrderItems.reduce((acc, it) => acc + (Number(it.unitPrice || 0) * Number(it.quantity || 1)), 0);
                  const grandTotal = itemsTotal + Math.max(0, Number(editDeliveryCharge) || 0);

                  return (
                    <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-gray-600">
                        <span>Items Subtotal ({editOrderItems.reduce((sum, i) => sum + i.quantity, 0)} qty):</span>
                        <span className="font-bold text-gray-900">₹{itemsTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-600">
                        <span>Delivery Charges:</span>
                        <span className="font-bold text-amber-900">₹{Number(editDeliveryCharge || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-black text-primary-700 pt-2 border-t border-gray-200">
                        <span>Recalculated Grand Total:</span>
                        <span className="text-base">₹{grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-gray-100 bg-white flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedOrderForEdit(null)}
                className="btn-secondary py-2.5 px-4 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={savingOrderEdit}
                onClick={handleSaveEditedOrder}
                className="btn-primary py-2.5 px-6 text-xs sm:text-sm font-bold gap-2 shadow-md cursor-pointer"
              >
                <CheckCircle size={15} />
                <span>{savingOrderEdit ? 'Saving Changes...' : 'Save & Recalculate Order'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* DEDICATED RECORD PAYMENT MODAL (Cash on Delivery or Shop Scanner UPI) */}
      {selectedOrderForPayment && createPortal(
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full my-auto shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-emerald-600 to-primary-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CreditCard size={22} />
                <div>
                  <h3 className="font-extrabold text-base">Record Payment Collection</h3>
                  <p className="text-xs text-emerald-100">Order #{selectedOrderForPayment.orderNumber} · {selectedOrderForPayment.customerName}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrderForPayment(null)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs sm:text-sm">
              {/* Payment Method Selector */}
              <div>
                <label className="form-label text-xs font-bold text-gray-700">Payment Collection Method</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setPaymentFormData(f => ({ ...f, paymentMethod: 'cash', cashAmount: f.paidAmount }))}
                    className={clsx(
                      'py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all',
                      paymentFormData.paymentMethod === 'cash'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs font-extrabold'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    )}
                  >
                    <Banknote size={15} />
                    <span>Cash on Delivery</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentFormData(f => ({ ...f, paymentMethod: 'upi', upiAmount: f.paidAmount }))}
                    className={clsx(
                      'py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all',
                      paymentFormData.paymentMethod === 'upi'
                        ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-2xs font-extrabold'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    )}
                  >
                    <QrCode size={15} />
                    <span>Shop Scanner UPI</span>
                  </button>
                </div>
              </div>

              {/* Amount Collected */}
              <div>
                <label className="form-label text-xs font-bold text-gray-700">Amount Collected (₹)</label>
                <div className="relative mt-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    className="form-input pl-8 py-2 text-base font-black text-gray-900 rounded-xl"
                    value={paymentFormData.paidAmount}
                    onChange={e => {
                      const val = e.target.value;
                      setPaymentFormData(f => ({
                        ...f,
                        paidAmount: val,
                        cashAmount: f.paymentMethod === 'cash' ? val : f.cashAmount,
                        upiAmount: f.paymentMethod === 'upi' ? val : f.upiAmount,
                      }));
                    }}
                  />
                </div>
              </div>

              {/* UPI UTR / Transaction ID */}
              {paymentFormData.paymentMethod === 'upi' && (
                <div>
                  <label className="form-label text-xs font-bold text-gray-700">UPI Ref / UTR No. (Optional)</label>
                  <input
                    type="text"
                    className="form-input text-xs font-medium py-2 rounded-xl mt-1"
                    placeholder="e.g. 483920194829 or last 4 digits"
                    value={paymentFormData.upiTransactionId}
                    onChange={e => setPaymentFormData(f => ({ ...f, upiTransactionId: e.target.value }))}
                  />
                </div>
              )}

              {/* Collected By (Delivery Partner or Staff) */}
              <div>
                <label className="form-label text-xs font-bold text-gray-700">Collected By (Delivery Partner / Cashier)</label>
                <input
                  type="text"
                  className="form-input text-xs font-semibold py-2 rounded-xl mt-1"
                  placeholder="e.g. Suresh (Delivery Boy) or Cashier"
                  value={paymentFormData.collectedBy}
                  onChange={e => setPaymentFormData(f => ({ ...f, collectedBy: e.target.value }))}
                />
              </div>

              {/* Status Indicator */}
              <div>
                <label className="form-label text-xs font-bold text-gray-700">Payment Status</label>
                <select
                  className="form-input text-xs font-bold py-2 rounded-xl mt-1"
                  value={paymentFormData.paymentStatus}
                  onChange={e => setPaymentFormData(f => ({ ...f, paymentStatus: e.target.value }))}
                >
                  <option value="paid">✅ Paid in Full</option>
                  <option value="pending">⚠️ Pending / Cash Due</option>
                </select>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedOrderForPayment(null)}
                className="btn-secondary py-2 px-4 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={recordingPayment}
                onClick={handleSavePayment}
                className="btn-primary py-2.5 px-5 text-xs font-bold gap-1.5 shadow-md cursor-pointer bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle size={14} />
                <span>{recordingPayment ? 'Saving...' : 'Save Payment Record'}</span>
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
