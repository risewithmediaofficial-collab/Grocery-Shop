import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const CartContext = createContext(null);
const STORAGE_KEY = 'columbu_pos_cart';

export function CartProvider({ children }) {
  // Initialize from localStorage if available
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed.cartItems) ? parsed.cartItems : [];
      }
    } catch {}
    return [];
  });

  const [customer, setCustomer] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.customer || null;
      }
    } catch {}
    return null;
  });

  const [discount, setDiscount] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.discount || 0;
      }
    } catch {}
    return 0;
  });

  const [discountType, setDiscountType] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.discountType || 'amount';
      }
    } catch {}
    return 'amount';
  });

  const [notes, setNotes] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.notes || '';
      }
    } catch {}
    return '';
  });

  const [heldBills, setHeldBills] = useState([]);
  const [loadingHeld, setLoadingHeld] = useState(false);

  // Sync active cart to localStorage whenever items/customer/discount change
  useEffect(() => {
    try {
      if (cartItems.length > 0 || customer || discount > 0 || notes) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          cartItems,
          customer,
          discount,
          discountType,
          notes
        }));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to sync POS cart to localStorage:', e);
    }
  }, [cartItems, customer, discount, discountType, notes]);

  // Fetch held bills from MongoDB Database
  const fetchHeldBills = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoadingHeld(true);
    try {
      const res = await api.get('/held-bills');
      setHeldBills(res.data.data || []);
    } catch (err) {
      console.error('Failed to load held bills from DB:', err);
    } finally {
      setLoadingHeld(false);
    }
  }, []);

  // Initial load from MongoDB
  useEffect(() => {
    fetchHeldBills();
  }, [fetchHeldBills]);

  const addItem = useCallback((product, qty = 1) => {
    setCartItems(prev => {
      const existing = prev.find(i => (i._id || i.product) === (product._id || product.product));
      if (existing) {
        return prev.map(i => (i._id || i.product) === (product._id || product.product)
          ? { ...i, quantity: i.quantity + qty }
          : i
        );
      }
      return [...prev, { ...product, quantity: qty, discount: 0, discountType: 'percent', customPrice: product.sellingPrice }];
    });
  }, []);

  const updateItem = useCallback((productId, field, value) => {
    setCartItems(prev => prev.map(i => (i._id || i.product) === productId ? { ...i, [field]: value } : i));
  }, []);

  const removeItem = useCallback((productId) => {
    setCartItems(prev => prev.filter(i => (i._id || i.product) !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    setCustomer(null);
    setDiscount(0);
    setNotes('');
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  // Load from a previous sale (repeat purchase)
  const loadFromSale = useCallback((saleItems) => {
    const items = saleItems.map(item => ({
      _id: item.product?._id || item.product,
      name: item.productName,
      sellingPrice: item.sellingPrice,
      purchasePrice: item.purchasePrice,
      gstRate: item.gstRate,
      hsnCode: item.hsnCode,
      taxType: 'exclusive',
      quantity: item.quantity,
      discount: item.discount || 0,
      discountType: item.discountType || 'percent',
      customPrice: item.sellingPrice,
    }));
    setCartItems(items);
  }, []);

  // Compute totals
  const subtotal = cartItems.reduce((sum, item) => sum + (item.customPrice || item.sellingPrice) * item.quantity, 0);
  const totalTax = cartItems.reduce((sum, item) => {
    const price = (item.customPrice || item.sellingPrice) * item.quantity;
    return sum + (price * (item.gstRate || 0)) / 100;
  }, 0);
  const grandTotal = Math.round(subtotal + totalTax - discount);
  const roundOff = grandTotal - (subtotal + totalTax - discount);

  // 1. Hold Bill — Save to MongoDB Database
  const holdBill = useCallback(async () => {
    if (cartItems.length === 0) {
      toast.error('Cart is empty. Add items first.');
      return null;
    }

    try {
      const payload = {
        items: cartItems,
        customer,
        discount,
        discountType,
        notes,
        subtotal,
        totalTax,
        grandTotal,
      };

      const res = await api.post('/held-bills', payload);
      const savedBill = res.data.data;
      
      setHeldBills(prev => [savedBill, ...prev]);
      clearCart();
      toast.success(`Bill held in Database (${savedBill.billNumber})`);
      return savedBill._id;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to hold bill in database');
      return null;
    }
  }, [cartItems, customer, discount, discountType, notes, subtotal, totalTax, grandTotal, clearCart]);

  // 2. Resume Bill — Retrieve from DB and load into active cart
  const resumeBill = useCallback(async (id) => {
    const bill = heldBills.find(b => b._id === id || b.id === id);
    if (!bill) return false;

    // Load items back into active cart
    const formattedItems = (bill.items || []).map(item => ({
      _id: item.product?._id || item.product || item._id,
      productId: item.productId,
      name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      sellingPrice: item.sellingPrice,
      purchasePrice: item.purchasePrice,
      customPrice: item.customPrice || item.sellingPrice,
      gstRate: item.gstRate || 0,
      hsnCode: item.hsnCode,
      quantity: item.quantity,
      unit: item.unit,
      discount: item.discount || 0,
      discountType: item.discountType || 'percent',
      taxType: item.taxType || 'exclusive',
    }));

    setCartItems(formattedItems);
    setCustomer(bill.customer || null);
    setDiscount(bill.discount || 0);
    setDiscountType(bill.discountType || 'amount');
    setNotes(bill.notes || '');

    // Remove from DB
    try {
      await api.delete(`/held-bills/${bill._id || id}`);
      setHeldBills(prev => prev.filter(b => (b._id || b.id) !== id));
      toast.success('Bill resumed in cart');
      return true;
    } catch (err) {
      setHeldBills(prev => prev.filter(b => (b._id || b.id) !== id));
      return true;
    }
  }, [heldBills]);

  // 3. Delete / Discard Held Bill from MongoDB Database
  const deleteHeldBill = useCallback(async (id) => {
    try {
      await api.delete(`/held-bills/${id}`);
      setHeldBills(prev => prev.filter(b => (b._id || b.id) !== id));
      toast.success('Held bill deleted from database');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete held bill');
    }
  }, []);

  return (
    <CartContext.Provider value={{
      cartItems, customer, discount, discountType, notes, heldBills, loadingHeld,
      subtotal, totalTax, grandTotal, roundOff,
      setCustomer, setDiscount, setDiscountType, setNotes,
      addItem, updateItem, removeItem, clearCart,
      loadFromSale, holdBill, resumeBill, deleteHeldBill, fetchHeldBills,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
