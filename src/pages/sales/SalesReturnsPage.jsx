import React, { useState, useEffect, useMemo } from 'react';
import {
  RotateCcw, Search, Plus, CheckCircle, Package, ArrowRight,
  X, ArrowLeftRight, Banknote, RefreshCw, AlertCircle, Trash2, ShoppingBag
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import clsx from 'clsx';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function SalesReturnsPage() {
  const [searchInvoice, setSearchInvoice] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [returnType, setReturnType] = useState('return'); // 'return' (Refund) | 'exchange' (Product Exchange)
  const [returnItems, setReturnItems] = useState({});
  const [returnReasons, setReturnReasons] = useState({});
  const [refundMethod, setRefundMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  // Replacement Products Catalog for Exchange
  const [catalog, setCatalog] = useState([]);
  const [exchangeItems, setExchangeItems] = useState([]); // [{ product, productName, sellingPrice, unit, quantity }]
  const [productSearch, setProductSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);

  useEffect(() => {
    if (returnType === 'exchange' && catalog.length === 0) {
      api.get('/products?status=active&limit=200')
        .catch(() => api.get('/orders/catalog'))
        .then(res => setCatalog(res.data?.data || []))
        .catch(() => {});
    }
  }, [returnType, catalog.length]);

  const handleSearchInvoice = async (e) => {
    e.preventDefault();
    if (!searchInvoice.trim()) return;
    setSearching(true);
    try {
      const res = await api.get(`/invoices/${searchInvoice.trim()}`);
      setSelectedSale(res.data.data);
      const initItems = {};
      const initReasons = {};
      res.data.data.items.forEach(item => {
        initItems[item.product] = 0;
        initReasons[item.product] = 'customer_request';
      });
      setReturnItems(initItems);
      setReturnReasons(initReasons);
      setExchangeItems([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invoice not found');
      setSelectedSale(null);
    } finally {
      setSearching(false);
    }
  };

  const handleQtyChange = (productId, maxQty, val) => {
    const qty = Math.min(maxQty, Math.max(0, parseInt(val) || 0));
    setReturnItems(prev => ({ ...prev, [productId]: qty }));
  };

  // Returned items total value
  const totalReturnValue = useMemo(() => {
    if (!selectedSale) return 0;
    return selectedSale.items.reduce((sum, item) => {
      const qty = returnItems[item.product] || 0;
      return sum + (item.sellingPrice * qty);
    }, 0);
  }, [selectedSale, returnItems]);

  // Exchanged items total value
  const totalExchangeValue = useMemo(() => {
    return exchangeItems.reduce((sum, item) => {
      return sum + (item.sellingPrice * item.quantity);
    }, 0);
  }, [exchangeItems]);

  // Net difference for exchange
  const netDifference = totalExchangeValue - totalReturnValue;
  const absDifference = Math.abs(netDifference);

  // Add replacement product to exchange
  const handleAddExchangeProduct = (prod) => {
    const existingIndex = exchangeItems.findIndex(i => i.product === prod._id);
    if (existingIndex > -1) {
      setExchangeItems(prev => prev.map((item, idx) =>
        idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
      ));
      toast.success(`Increased ${prod.name} quantity to ${exchangeItems[existingIndex].quantity + 1}`);
    } else {
      setExchangeItems(prev => [
        ...prev,
        {
          product: prod._id,
          productName: prod.name,
          sellingPrice: Number(prod.sellingPrice || 0),
          unit: prod.unit?.symbol || prod.unit || 'unit',
          currentStock: prod.currentStock || 0,
          quantity: 1,
        }
      ]);
      toast.success(`Added ${prod.name} as replacement`);
    }
    setProductSearch('');
    setShowProductSearch(false);
  };

  const handleExchangeQtyChange = (index, delta) => {
    setExchangeItems(prev => {
      const updated = [...prev];
      const newQty = Math.max(1, updated[index].quantity + delta);
      updated[index] = { ...updated[index], quantity: newQty };
      return updated;
    });
  };

  const handleRemoveExchangeItem = (index) => {
    setExchangeItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const filteredCatalog = useMemo(() => {
    if (!productSearch.trim()) return [];
    const q = productSearch.toLowerCase();
    return catalog.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.barcode?.includes(q)
    ).slice(0, 8);
  }, [catalog, productSearch]);

  const handleProcessReturnOrExchange = async () => {
    const itemsToReturn = selectedSale.items
      .filter(item => (returnItems[item.product] || 0) > 0)
      .map(item => ({
        product: item.product,
        quantity: returnItems[item.product],
        reason: returnReasons[item.product] || 'customer_request'
      }));

    if (itemsToReturn.length === 0) {
      return toast.error('Please select at least 1 item quantity to return');
    }

    if (returnType === 'exchange' && exchangeItems.length === 0) {
      return toast.error('Please select at least 1 replacement product for the exchange');
    }

    setLoading(true);
    try {
      const payload = {
        saleId: selectedSale._id,
        items: itemsToReturn,
        returnType,
        refundMethod: returnType === 'exchange' ? 'exchange' : refundMethod,
        notes: notes.trim()
      };

      if (returnType === 'exchange') {
        payload.exchangeItems = exchangeItems.map(item => ({
          product: item.product,
          quantity: item.quantity,
          sellingPrice: item.sellingPrice
        }));
      }

      const res = await api.post('/invoices/return', payload);
      const retDoc = res.data.data;

      if (returnType === 'exchange') {
        const diffText = netDifference > 0
          ? `Collect ${fmt(absDifference)} extra from customer`
          : netDifference < 0
          ? `Refund ${fmt(absDifference)} change to customer`
          : 'Even swap with ₹0 difference';
        toast.success(`Exchange Processed (#${retDoc.returnNumber})! ${diffText}`, { duration: 6000 });
      } else {
        toast.success(`Return processed (#${retDoc.returnNumber})! Refunded ${fmt(totalReturnValue)} via ${refundMethod.toUpperCase()}`);
      }

      setSelectedSale(null);
      setSearchInvoice('');
      setExchangeItems([]);
      setNotes('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process return/exchange');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <RotateCcw className="text-primary-600" size={26} />
          <span>Product Returns & Exchanges</span>
        </h1>
        <p className="page-subtitle">
          Process customer returns, replace damaged or wrong items with catalog exchanges, and balance payments
        </p>
      </div>

      {/* Invoice Lookup Form */}
      <div className="card p-5 max-w-2xl shadow-xs border border-gray-200">
        <h3 className="font-bold text-sm text-gray-900 mb-2 flex items-center gap-2">
          <Search size={16} className="text-primary-600" />
          <span>Find Original Invoice</span>
        </h3>
        <form onSubmit={handleSearchInvoice} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="form-input pl-9 font-medium text-sm"
              placeholder="Enter Invoice Number (e.g. KS-000001 or INV-001)..."
              value={searchInvoice}
              onChange={e => setSearchInvoice(e.target.value)}
              autoFocus
            />
          </div>
          <button type="submit" disabled={searching} className="btn-primary text-sm font-bold px-4 py-2">
            {searching ? 'Finding...' : 'Find Invoice'}
          </button>
        </form>
      </div>

      {/* Selected Sale Return & Exchange UI */}
      {selectedSale && (
        <div className="card p-6 max-w-5xl space-y-6 shadow-sm border border-gray-200 animate-in fade-in duration-150">
          {/* Header Info */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="badge-blue text-xs font-mono font-bold px-2.5 py-0.5">{selectedSale.invoiceNumber}</span>
                <span className="text-xs font-semibold text-gray-500">
                  {new Date(selectedSale.saleDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <h2 className="text-lg font-black text-gray-900 mt-1">
                Customer: <span className="text-primary-700">{selectedSale.customerName || 'Walk-in Customer'}</span>
              </h2>
              {selectedSale.customerMobile && (
                <p className="text-xs text-gray-500">Mobile: +91 {selectedSale.customerMobile}</p>
              )}
            </div>

            <button
              onClick={() => { setSelectedSale(null); setExchangeItems([]); }}
              className="btn-secondary btn-sm gap-1 text-xs cursor-pointer"
            >
              <X size={14} /> Clear Sale
            </button>
          </div>

          {/* Mode Selector Toggle: Refund vs Exchange */}
          <div className="grid grid-cols-2 gap-3 p-1.5 bg-gray-100/90 rounded-2xl border border-gray-200/80">
            <button
              type="button"
              onClick={() => setReturnType('return')}
              className={clsx(
                'py-3 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer',
                returnType === 'return'
                  ? 'bg-white text-primary-800 shadow-xs scale-101 border border-primary-200'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <Banknote size={16} />
              <span>Cash / UPI Return Refund</span>
            </button>
            <button
              type="button"
              onClick={() => setReturnType('exchange')}
              className={clsx(
                'py-3 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer',
                returnType === 'exchange'
                  ? 'bg-purple-600 text-white shadow-xs scale-101'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <ArrowLeftRight size={16} />
              <span>Product Replacement / Exchange</span>
            </button>
          </div>

          {/* Section 1: Select Items Being Returned */}
          <div>
            <h3 className="font-extrabold text-sm text-gray-900 mb-2 flex items-center gap-2">
              <Package size={16} className="text-rose-600" />
              <span>Step 1: Select Items Customer is Returning</span>
            </h3>

            <div className="table-container border border-gray-200 rounded-xl overflow-hidden">
              <table className="table">
                <thead>
                  <tr className="bg-gray-50/80 text-xs font-bold text-gray-500">
                    <th>Product</th>
                    <th>Sold Qty</th>
                    <th>Rate</th>
                    <th className="w-32 text-center">Return Qty</th>
                    <th>Reason</th>
                    <th className="text-right">Total Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedSale.items.map(item => {
                    const qty = returnItems[item.product] || 0;
                    return (
                      <tr key={item.product} className={clsx(qty > 0 && 'bg-rose-50/30')}>
                        <td>
                          <p className="font-bold text-xs sm:text-sm text-gray-900">{item.productName}</p>
                          <p className="text-[11px] text-gray-400">GST: {item.gstRate || 0}%</p>
                        </td>
                        <td className="font-medium text-xs text-gray-700">{item.quantity} {item.unit}</td>
                        <td className="font-semibold text-xs text-gray-900">{fmt(item.sellingPrice)}</td>
                        <td className="text-center">
                          <input
                            type="number"
                            min={0}
                            max={item.quantity}
                            className="form-input text-center font-black text-sm py-1.5 w-24 rounded-lg"
                            value={qty}
                            onChange={e => handleQtyChange(item.product, item.quantity, e.target.value)}
                          />
                        </td>
                        <td>
                          <select
                            className="form-select text-xs py-1.5 rounded-lg font-medium"
                            value={returnReasons[item.product]}
                            onChange={e => setReturnReasons(prev => ({ ...prev, [item.product]: e.target.value }))}
                          >
                            <option value="customer_request">Customer Request</option>
                            <option value="damaged">Damaged / Defective</option>
                            <option value="expired">Expired Product</option>
                            <option value="wrong_product">Wrong Item Delivered</option>
                          </select>
                        </td>
                        <td className="text-right font-black text-xs sm:text-sm text-gray-900">
                          {fmt(item.sellingPrice * qty)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 text-xs font-bold text-gray-600">
              <span>Total Return Credit: <span className="font-black text-rose-700 text-sm">{fmt(totalReturnValue)}</span></span>
            </div>
          </div>

          {/* Section 2: Replacement Products (Only in Exchange Mode) */}
          {returnType === 'exchange' && (
            <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-purple-950 flex items-center gap-2">
                    <ShoppingBag size={16} className="text-purple-700" />
                    <span>Step 2: Choose Replacement Products for Customer</span>
                  </h3>
                  <p className="text-xs text-purple-800 mt-0.5">
                    Search store catalog and select items given out to the customer in exchange
                  </p>
                </div>

                {!showProductSearch && (
                  <button
                    type="button"
                    onClick={() => setShowProductSearch(true)}
                    className="btn-primary btn-sm bg-purple-600 hover:bg-purple-700 text-xs font-bold gap-1 rounded-xl shadow-2xs cursor-pointer"
                  >
                    <Plus size={13} /> Add Replacement Item
                  </button>
                )}
              </div>

              {/* Product Search Box */}
              {showProductSearch && (
                <div className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-xs space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700">Search Replacement Product</label>
                    <button onClick={() => setShowProductSearch(false)} className="text-gray-400 hover:text-gray-600">
                      <X size={15} />
                    </button>
                  </div>
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      className="form-input pl-9 text-xs py-2 w-full rounded-xl"
                      placeholder="Type product name, brand, or SKU..."
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      autoFocus
                    />
                  </div>

                  {filteredCatalog.length > 0 && (
                    <div className="max-h-52 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-xl">
                      {filteredCatalog.map(p => (
                        <div
                          key={p._id}
                          onClick={() => handleAddExchangeProduct(p)}
                          className="p-2.5 hover:bg-purple-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <p className="font-bold text-gray-900">{p.name}</p>
                            <p className="text-[10px] text-gray-400">In Stock: {p.currentStock} {p.unit?.symbol || 'units'}</p>
                          </div>
                          <span className="font-black text-purple-700 text-xs">
                            {fmt(p.sellingPrice)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Chosen Exchange Items List */}
              {exchangeItems.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-purple-200 rounded-xl bg-white/70 text-xs text-purple-800">
                  <ShoppingBag size={28} className="mx-auto mb-1.5 opacity-40 text-purple-600" />
                  <p className="font-bold">No replacement products added yet</p>
                  <p className="text-[11px] text-purple-600 mt-0.5">Click "Add Replacement Item" to select products from the store catalog.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {exchangeItems.map((ex, idx) => (
                    <div key={ex.product} className="p-3 bg-white border border-purple-200 rounded-xl flex items-center justify-between gap-3 text-xs shadow-2xs">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-900 truncate">{ex.productName}</p>
                        <p className="text-[11px] text-gray-400">Rate: {fmt(ex.sellingPrice)} / {ex.unit}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Stepper */}
                        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
                          <button
                            type="button"
                            onClick={() => handleExchangeQtyChange(idx, -1)}
                            className="w-6 h-6 rounded flex items-center justify-center font-bold text-gray-700 hover:bg-white cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-black text-xs text-gray-900">{ex.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleExchangeQtyChange(idx, 1)}
                            className="w-6 h-6 rounded bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center font-bold shadow-2xs cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        <span className="font-black text-purple-700 w-16 text-right">
                          {fmt(ex.sellingPrice * ex.quantity)}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveExchangeItem(idx)}
                          className="text-gray-300 hover:text-rose-500 p-1 cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-end pt-1 text-xs font-bold text-gray-600">
                    <span>Total Replacement Value: <span className="font-black text-purple-700 text-sm">{fmt(totalExchangeValue)}</span></span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 3: Summary, Difference & Confirmation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div className="space-y-3">
              {returnType === 'return' ? (
                <div>
                  <label className="form-label text-xs font-bold text-gray-700">Refund Method</label>
                  <select
                    className="form-select text-xs py-2 rounded-xl"
                    value={refundMethod}
                    onChange={e => setRefundMethod(e.target.value)}
                  >
                    <option value="cash">💵 Cash Refund (From Register)</option>
                    <option value="upi">📱 UPI Instant Transfer</option>
                    <option value="credit">📝 Customer Credit / Udhaar Balance</option>
                    <option value="bank_transfer">🏦 Bank Transfer</option>
                  </select>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5 text-xs">
                  <p className="font-bold text-gray-900">Exchange Financial Breakdown</p>
                  <div className="flex justify-between text-gray-600">
                    <span>Original Returned Item(s):</span>
                    <span className="font-bold text-rose-700">-{fmt(totalReturnValue)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>New Replacement Item(s):</span>
                    <span className="font-bold text-purple-700">+{fmt(totalExchangeValue)}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="form-label text-xs font-bold text-gray-700">Notes / Remarks (Optional)</label>
                <input
                  className="form-input text-xs py-2 rounded-xl"
                  placeholder="e.g. Broken packaging replaced with 1L oil..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Right: Net Difference Card */}
            <div className={clsx(
              'p-4 rounded-2xl flex flex-col justify-between border shadow-2xs',
              returnType === 'return' ? 'bg-rose-50/70 border-rose-200' :
              netDifference > 0 ? 'bg-amber-50/80 border-amber-300' :
              netDifference < 0 ? 'bg-emerald-50/80 border-emerald-300' : 'bg-gray-50 border-gray-200'
            )}>
              <div>
                {returnType === 'return' ? (
                  <>
                    <p className="text-xs font-bold text-rose-900 uppercase tracking-wider">Total Refund Due to Customer</p>
                    <p className="text-3xl font-black text-rose-700 mt-1">{fmt(totalReturnValue)}</p>
                    <p className="text-[11px] text-gray-500 mt-1">Returned items will automatically be restocked into inventory.</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-700">Net Difference to Settle</p>
                    {netDifference > 0 ? (
                      <div className="mt-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-amber-900">{fmt(absDifference)}</span>
                          <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                            Collect from Customer
                          </span>
                        </div>
                        <p className="text-xs text-amber-800 mt-1">
                          The new replacement items cost more than returned items. Collect difference in cash/UPI.
                        </p>
                      </div>
                    ) : netDifference < 0 ? (
                      <div className="mt-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-emerald-900">{fmt(absDifference)}</span>
                          <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                            Refund to Customer
                          </span>
                        </div>
                        <p className="text-xs text-emerald-800 mt-1">
                          The new replacement items cost less than returned items. Pay back difference in cash.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-1">
                        <p className="text-2xl font-black text-gray-900">₹0.00 (Even Swap)</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Exact equal value replacement. No money collected or refunded.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <button
                onClick={handleProcessReturnOrExchange}
                disabled={loading || totalReturnValue <= 0 || (returnType === 'exchange' && exchangeItems.length === 0)}
                className={clsx(
                  'w-full py-3 mt-4 text-xs sm:text-sm font-black rounded-xl shadow-md gap-2 flex items-center justify-center cursor-pointer transition-all',
                  returnType === 'return'
                    ? 'btn-primary bg-rose-600 hover:bg-rose-700 text-white'
                    : 'btn-primary bg-purple-700 hover:bg-purple-800 text-white'
                )}
              >
                <CheckCircle size={16} />
                <span>
                  {loading ? 'Processing...' : returnType === 'return'
                    ? `Confirm & Process Return (${fmt(totalReturnValue)})`
                    : `Confirm & Process Exchange`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
