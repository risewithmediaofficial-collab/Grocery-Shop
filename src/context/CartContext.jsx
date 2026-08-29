import React, { createContext, useContext, useState, useCallback } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('amount');
  const [notes, setNotes] = useState('');
  const [heldBills, setHeldBills] = useState([]);

  const addItem = useCallback((product, qty = 1) => {
    setCartItems(prev => {
      const existing = prev.find(i => i._id === product._id);
      if (existing) {
        return prev.map(i => i._id === product._id
          ? { ...i, quantity: i.quantity + qty }
          : i
        );
      }
      return [...prev, { ...product, quantity: qty, discount: 0, discountType: 'percent', customPrice: product.sellingPrice }];
    });
  }, []);

  const updateItem = useCallback((productId, field, value) => {
    setCartItems(prev => prev.map(i => i._id === productId ? { ...i, [field]: value } : i));
  }, []);

  const removeItem = useCallback((productId) => {
    setCartItems(prev => prev.filter(i => i._id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    setCustomer(null);
    setDiscount(0);
    setNotes('');
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

  const holdBill = useCallback(() => {
    if (cartItems.length === 0) return;
    const held = { id: Date.now(), items: cartItems, customer, discount, notes, time: new Date() };
    setHeldBills(prev => [...prev, held]);
    clearCart();
    return held.id;
  }, [cartItems, customer, discount, notes, clearCart]);

  const resumeBill = useCallback((id) => {
    const bill = heldBills.find(b => b.id === id);
    if (!bill) return;
    setCartItems(bill.items);
    setCustomer(bill.customer);
    setDiscount(bill.discount);
    setNotes(bill.notes);
    setHeldBills(prev => prev.filter(b => b.id !== id));
  }, [heldBills]);

  // Compute totals
  const subtotal = cartItems.reduce((sum, item) => sum + (item.customPrice || item.sellingPrice) * item.quantity, 0);
  const totalTax = cartItems.reduce((sum, item) => {
    const price = (item.customPrice || item.sellingPrice) * item.quantity;
    return sum + (price * (item.gstRate || 0)) / 100;
  }, 0);
  const grandTotal = Math.round(subtotal + totalTax - discount);
  const roundOff = grandTotal - (subtotal + totalTax - discount);

  return (
    <CartContext.Provider value={{
      cartItems, customer, discount, discountType, notes, heldBills,
      subtotal, totalTax, grandTotal, roundOff,
      setCustomer, setDiscount, setDiscountType, setNotes,
      addItem, updateItem, removeItem, clearCart,
      loadFromSale, holdBill, resumeBill,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
