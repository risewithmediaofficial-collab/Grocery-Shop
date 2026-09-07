import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search, X, Plus, Minus, ShoppingCart, User, Pause,
  Trash2, Check, RotateCcw, Package,
  Phone, AlertCircle, Banknote, CreditCard, QrCode, FileText, Split, Clock, Scale, Tag
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useCart } from '../../context/CartContext';
import clsx from 'clsx';
import {
  getProductCategory
} from '../../utils/groceryVariants';
import { playScanBeep, playSuccessChime, playWarningTone } from '../../utils/audioFeedback';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// Customer Selector Modal
function CustomerSelector({ onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const [showQuickForm, setShowQuickForm] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickMobile, setQuickMobile] = useState('');

  const doSearch = useCallback(async (q) => {
    try {
      const endpoint = q && q.trim() ? `/customers/search?q=${encodeURIComponent(q.trim())}` : '/customers?limit=10';
      const res = await api.get(endpoint);
      setResults(res.data.data || []);
    } catch {}
  }, []);

  useEffect(() => {
    doSearch(search);
  }, [search, doSearch]);

  const handleQuickCustomer = (e) => {
    e.preventDefault();
    if (!quickName.trim() && !quickMobile.trim()) {
      return toast.error('Please enter a name or mobile number');
    }
    onSelect({
      name: quickName.trim() || 'Walk-in Customer',
      mobile: quickMobile.trim() || '',
      isQuick: true,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
          <div>
            <h3 className="font-bold text-base text-gray-900">Select / Add Customer (Optional)</h3>
            <p className="text-xs text-gray-500">Tag this customer or search existing customer profile</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-200/80 hover:bg-gray-300 text-gray-600 flex items-center justify-center cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              className="form-input text-sm flex-1 rounded-xl"
              placeholder="Search by name, mobile, or ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="btn-secondary text-xs font-bold px-3 py-2 rounded-xl cursor-pointer"
              title="Clear Customer"
            >
              Walk-in
            </button>
          </div>

          {/* Quick Walk-in Tag Form Toggle */}
          {!showQuickForm ? (
            <button
              type="button"
              onClick={() => setShowQuickForm(true)}
              className="w-full py-2 px-3 bg-primary-50 hover:bg-primary-100 text-primary-700 font-bold text-xs rounded-xl border border-primary-200 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus size={14} /> Enter Quick Name & Mobile (Optional)
            </button>
          ) : (
            <form onSubmit={handleQuickCustomer} className="p-3 bg-primary-50/50 border border-primary-200 rounded-2xl space-y-2">
              <p className="text-xs font-bold text-primary-900">Quick Customer Tag (No registration needed):</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Customer Name"
                  className="form-input text-xs py-1.5 px-2.5 rounded-lg bg-white"
                  value={quickName}
                  onChange={e => setQuickName(e.target.value)}
                  autoFocus
                />
                <input
                  type="tel"
                  placeholder="Mobile Number"
                  className="form-input text-xs py-1.5 px-2.5 rounded-lg bg-white"
                  value={quickMobile}
                  onChange={e => setQuickMobile(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowQuickForm(false)}
                  className="btn-ghost btn-sm text-xs py-1 px-2.5 text-gray-500 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary btn-sm text-xs font-bold py-1 px-3 rounded-lg cursor-pointer"
                >
                  Apply to Bill
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="max-h-60 overflow-y-auto px-4 pb-4 space-y-2">
          {results.length === 0 && search.trim().length >= 1 && (
            <p className="text-center text-gray-400 text-sm py-4">No registered customers found</p>
          )}
          {results.map(c => (
            <div key={c._id} onClick={() => onSelect(c)} className="p-3 border border-gray-200 rounded-2xl cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Phone size={11} className="text-gray-400 shrink-0" />
                    <span>{c.mobile} · {c.customerId}</span>
                  </p>
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

// Quick Hold Bill Modal with optional customer tag & mobile
function HoldBillPromptModal({ cart, onHold, onClose }) {
  const [tag, setTag] = useState(cart.customer?.name || '');
  const [mobile, setMobile] = useState(cart.customer?.mobile || '');
  const [notes, setNotes] = useState(cart.notes || '');

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    onHold({
      customerName: tag.trim() || 'Walk-in Customer',
      customerMobile: mobile.trim(),
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-5 border border-gray-100 animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Pause size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900 leading-tight">Hold Bill & Queue Customer</h3>
              <p className="text-xs text-gray-500">Tag this bill to identify & resume it later</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="form-label text-xs font-bold text-gray-700">
              Customer Name / Identification Tag (Optional)
            </label>
            <input
              autoFocus
              type="text"
              className="form-input text-sm font-semibold rounded-xl"
              placeholder="e.g. Ramesh, Token #4, Uncle in Blue Shirt"
              value={tag}
              onChange={e => setTag(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label text-xs font-bold text-gray-700">
              Customer Mobile (Optional)
            </label>
            <input
              type="tel"
              className="form-input text-sm font-semibold rounded-xl"
              placeholder="e.g. 9876543210"
              value={mobile}
              onChange={e => setMobile(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label text-xs font-bold text-gray-700">
              Quick Note (Optional)
            </label>
            <input
              type="text"
              className="form-input text-xs rounded-xl"
              placeholder="e.g. Went to fetch cash, 2 basmati bags..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* Cart Recap */}
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-center justify-between text-xs">
            <div>
              <p className="font-bold text-gray-900">{cart.cartItems.length} items in bill</p>
              <p className="text-gray-500 text-[11px] truncate max-w-[200px]">
                {cart.cartItems.map(i => `${i.name} (x${i.quantity})`).join(', ')}
              </p>
            </div>
            <span className="font-black text-amber-900 text-base">{fmt(cart.grandTotal)}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                onHold({ customerName: 'Walk-in Customer', customerMobile: '', notes: '' });
                onClose();
              }}
              className="btn-secondary py-2.5 text-xs font-bold rounded-xl cursor-pointer"
            >
              Quick Hold (Walk-in)
            </button>
            <button
              type="submit"
              className="btn-primary py-2.5 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 shadow-md cursor-pointer"
            >
              Hold Bill Now →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Switch Customer Prompt Modal (Protects current cart items when switching/selecting customer)
function SwitchCustomerPromptModal({ currentCart, targetCustomer, onHoldAndSwitch, onAssignToCurrent, onCancel }) {
  const currentCustName = currentCart.customer?.name || 'Walk-in Customer';
  const targetCustName = targetCustomer?.name || 'New Customer';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150 p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Pause size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900">Active Cart in Progress</h3>
              <p className="text-xs text-gray-500">{currentCart.cartItems.length} products already in cart ({fmt(currentCart.grandTotal)})</p>
            </div>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3.5 text-xs text-amber-950 space-y-1.5">
          <p className="font-bold text-amber-900">
            <span className="flex items-center gap-1.5 text-xs text-amber-900 font-semibold">
              <AlertCircle size={14} className="text-amber-600 shrink-0" />
              <span>You are currently billing for <span className="underline font-extrabold">{currentCustName}</span>.</span>
            </span>
          </p>
          <p className="text-gray-600 text-[11px]">
            To serve <strong>{targetCustName}</strong>, hold the current bill in queue so you can resume it later without losing items.
          </p>
        </div>

        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={onHoldAndSwitch}
            className="w-full btn-primary py-3 text-xs font-bold rounded-2xl bg-emerald-700 hover:bg-emerald-800 shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <Pause size={15} /> Hold Current Bill & Start New Bill for {targetCustName} →
          </button>

          <button
            type="button"
            onClick={onAssignToCurrent}
            className="w-full btn-secondary py-2.5 text-xs font-bold rounded-2xl border-gray-300 text-gray-700 hover:bg-gray-100 flex items-center justify-center gap-2 cursor-pointer"
          >
            <User size={14} /> Assign {targetCustName} to These {currentCart.cartItems.length} Products
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="w-full btn-ghost py-2 text-xs text-gray-400 hover:text-gray-600 font-semibold cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Repeat Purchase Conflict Modal (Protects active cart items when loading repeat purchase)
function RepeatPurchasePromptModal({ currentCart, targetCustomer, onHoldAndLoad, onAppend, onCancel }) {
  const custName = targetCustomer?.name || currentCart.customer?.name || 'Customer';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150 p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary-100 text-primary-800 flex items-center justify-center font-bold">
              <RotateCcw size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900">Repeat Last Purchase</h3>
              <p className="text-xs text-gray-500">Active cart has {currentCart.cartItems.length} products ({fmt(currentCart.grandTotal)})</p>
            </div>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-3.5 text-xs text-blue-950 space-y-1.5">
          <p className="font-bold text-blue-900">
            How would you like to load {custName}'s regular purchase?
          </p>
          <p className="text-gray-600 text-[11px]">
            You have active items on the counter. Hold the current bill to resume later, or append the repeat items into this cart.
          </p>
        </div>

        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={onHoldAndLoad}
            className="w-full btn-primary py-3 text-xs font-bold rounded-2xl bg-emerald-700 hover:bg-emerald-800 shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <Pause size={15} /> Hold Current Bill & Load {custName}'s Repeat Items →
          </button>

          <button
            type="button"
            onClick={onAppend}
            className="w-full btn-secondary py-2.5 text-xs font-bold rounded-2xl border-gray-300 text-gray-700 hover:bg-gray-100 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus size={14} /> Add Repeat Items to Current Bill (Append)
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="w-full btn-ghost py-2 text-xs text-gray-400 hover:text-gray-600 font-semibold cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Payment Modal
function PaymentModal({ grandTotal, totalSavings, savingsPercentage, customer, onSave, onSaveAndPrint, onClose }) {
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
    { value: 'cash', label: 'Cash', icon: Banknote },
    { value: 'upi', label: 'UPI', icon: QrCode },
    { value: 'card', label: 'Card', icon: CreditCard },
    { value: 'credit', label: 'Credit', icon: FileText },
    { value: 'mixed', label: 'Split', icon: Split },
  ];

  // Split auto-calculation: entering cash auto-fills UPI with remainder
  const handleCashChange = (val) => {
    setCash(val);
    const c = parseFloat(val) || 0;
    const rem = Math.max(0, grandTotal - c);
    setUpi(rem > 0 ? String(parseFloat(rem.toFixed(2))) : '0');
  };

  // Split auto-calculation: entering UPI auto-fills cash with remainder
  const handleUpiChange = (val) => {
    setUpi(val);
    const u = parseFloat(val) || 0;
    const rem = Math.max(0, grandTotal - u);
    setCash(rem > 0 ? String(parseFloat(rem.toFixed(2))) : '0');
  };

  const validate = () => {
    if (method === 'credit' && !customer) {
      toast.error('Please select a customer for credit sales');
      return false;
    }
    return true;
  };

  const handleComplete = () => {
    if (!validate()) return;
    setLoading(true);
    onSave({ method, cashAmt, upiAmt, paid, change, notes });
  };

  const handleCompleteAndPrint = () => {
    if (!validate()) return;
    setLoading(true);
    onSaveAndPrint({ method, cashAmt, upiAmt, paid, change, notes });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
        <div className="bg-primary-700 text-white p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-primary-200 uppercase">Complete Billing</p>
              <div className="flex justify-between items-baseline mt-1 pr-3">
                <h2 className="text-2xl font-bold">Total Amount</h2>
                <span className="text-3xl font-extrabold">{fmt(grandTotal)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors shrink-0 -mr-1 -mt-1"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
          {customer && <p className="text-xs text-primary-200 mt-1">Customer: {customer.name} ({customer.mobile})</p>}
          {totalSavings > 0 && (
            <p className="text-xs text-emerald-200 mt-1 font-semibold flex items-center gap-1.5">
              <Tag size={12} />
              <span>Customer saves {fmt(totalSavings)} ({savingsPercentage}%)</span>
            </p>
          )}
        </div>

        <div className="p-5 space-y-4">
          {/* Payment Method */}
          <div>
            <label className="form-label">Payment Method</label>
            <div className="grid grid-cols-5 gap-1.5 mt-1">
              {METHODS.map(m => {
                const IconComp = m.icon;
                return (
                  <button key={m.value} type="button" onClick={() => setMethod(m.value)}
                    className={clsx('text-xs py-2 px-1 rounded-lg border font-medium transition-all flex flex-col items-center justify-center gap-1', method === m.value ? 'bg-primary-50 border-primary-400 text-primary-700 font-bold shadow-2xs' : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
                    <IconComp size={14} />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {method === 'cash' && (
            <div className="space-y-2">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-gray-400">₹</span>
                <input
                  className="form-input pl-8 text-xl font-black text-gray-900 tracking-wide rounded-xl focus:ring-2 focus:ring-primary-500"
                  type="number"
                  value={cash}
                  onChange={e => setCash(e.target.value)}
                  placeholder="0"
                  autoFocus
                />
              </div>

              {/* Prominent Change Return Indicator */}
              {change > 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between animate-celebrate shadow-2xs">
                  <div className="flex items-center gap-2 text-emerald-900">
                    <RotateCcw size={16} className="text-emerald-600" />
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Return Change to Customer</p>
                      <p className="text-xs text-emerald-600 font-medium">Hand over cash balance</p>
                    </div>
                  </div>
                  <span className="text-2xl font-black text-emerald-700">{fmt(change)}</span>
                </div>
              )}
              {change < 0 && (
                <p className="text-xs font-semibold text-rose-500 flex items-center gap-1 mt-1">
                  <AlertCircle size={13} /> Still needs {fmt(Math.abs(change))} to complete payment
                </p>
              )}
            </div>
          )}

          {method === 'mixed' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Cash (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">₹</span>
                    <input
                      className="form-input pl-7 text-lg font-bold"
                      type="number"
                      value={cash}
                      onChange={e => handleCashChange(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">UPI (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">₹</span>
                    <input
                      className="form-input pl-7 text-lg font-bold"
                      type="number"
                      value={upi}
                      onChange={e => handleUpiChange(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              {paid < grandTotal && (
                <p className="text-xs font-semibold text-rose-500 flex items-center gap-1">
                  <AlertCircle size={13} /> Still due: {fmt(Math.abs(change))}
                </p>
              )}
            </div>
          )}

          {method === 'credit' && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800 flex items-start gap-2">
              <AlertCircle size={16} className="text-orange-600 shrink-0 mt-0.5" />
              <div>
                <p>This will add {fmt(grandTotal)} to customer's outstanding balance.</p>
                {customer?.outstandingBalance > 0 && <p className="mt-1 font-semibold">Current balance: {fmt(customer.outstandingBalance)}</p>}
              </div>
            </div>
          )}

          <div>
            <label className="form-label">Notes (optional)</label>
            <input className="form-input" placeholder="Add note..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="p-5 pt-0 flex gap-2">
          <button onClick={onClose} disabled={loading} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={handleComplete}
            disabled={loading}
            className="btn-primary flex-1 py-3 text-sm font-bold"
          >
            {loading ? 'Saving...' : 'Complete Bill'}
          </button>
          <button
            onClick={handleCompleteAndPrint}
            disabled={loading}
            className="flex-1 py-3 text-sm font-bold rounded-xl border-2 border-primary-600 text-primary-700 bg-primary-50 hover:bg-primary-100 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            🖨️ {loading ? '...' : 'Print Bill'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function POSPage() {
  const cart = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [allCatalogProducts, setAllCatalogProducts] = useState([]);
  const [selectedSearchCat, setSelectedSearchCat] = useState('all');
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  const [showCustomer, setShowCustomer] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showHeldModal, setShowHeldModal] = useState(false);
  const [showHoldPrompt, setShowHoldPrompt] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [lastInvoice, setLastInvoice] = useState(null);
  const [highlightedItemId, setHighlightedItemId] = useState(null);
  const [quantityModal, setQuantityModal] = useState(null);

  // Safeguards for active cart protection
  const [pendingCustomer, setPendingCustomer] = useState(null);
  const [pendingRepeatSale, setPendingRepeatSale] = useState(null);

  const searchRef = useRef(null);

  // Disable number input value changing when scrolling mouse wheel
  useEffect(() => {
    const handleWheel = () => {
      if (document.activeElement && document.activeElement.type === 'number') {
        document.activeElement.blur();
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  // Intelligent packaging & variant generator tailored for grocery retail
  const getProductVariantConfig = useCallback((product) => {
    if (!product) return { type: 'packaged_general', options: [] };
    const baseRate = Number(product.sellingPrice || 0);
    const unitSymbol = (product.unit?.symbol || product.unit || '').toLowerCase();
    const catName = (product.category?.name || product.category || '').toLowerCase();
    const prodName = (product.name || '').toLowerCase();

    // 1. Loose Commodity Staples (Sugar, Rice, Atta, Maida, Dals, Wheat, Flours, Grains)
    const isLooseCommodity =
      catName.includes('grain') ||
      catName.includes('staple') ||
      catName.includes('flour') ||
      prodName.includes('rice') ||
      prodName.includes('sugar') ||
      prodName.includes('atta') ||
      prodName.includes('maida') ||
      prodName.includes('dal') ||
      prodName.includes('wheat') ||
      prodName.includes('sooji') ||
      prodName.includes('rava') ||
      prodName.includes('flour') ||
      (unitSymbol === 'kg' && !prodName.includes('bottle') && !prodName.includes('can'));

    if (isLooseCommodity) {
      const bag25DiscountRate = Math.max(1, Math.round(baseRate > 50 ? baseRate - 1 : baseRate * 0.98));
      const bag50DiscountRate = Math.max(1, Math.round(baseRate > 50 ? baseRate - 2 : baseRate * 0.96));

      const bagOptions = [
        { id: 'bag_25', label: '25 kg Bag', size: 25, price: 25 * bag25DiscountRate, ratePerKg: bag25DiscountRate },
        { id: 'bag_10', label: '10 kg Bag', size: 10, price: 10 * baseRate, ratePerKg: baseRate },
        { id: 'bag_50', label: '50 kg Bag', size: 50, price: 50 * bag50DiscountRate, ratePerKg: bag50DiscountRate },
      ];

      return {
        type: 'commodity_loose',
        primaryUnit: 'kg',
        baseRate,
        bagOptions,
        defaultBagOption: bagOptions[0],
      };
    }

    // 2. Packaged Liquids & Beverages (Water Bottles, Cooking Oils, Drinks, Juices, Milk)
    const isLiquid =
      unitSymbol.includes('l') ||
      unitSymbol.includes('ml') ||
      unitSymbol.includes('btl') ||
      catName.includes('beverage') ||
      catName.includes('drink') ||
      catName.includes('oil') ||
      prodName.includes('water') ||
      prodName.includes('oil') ||
      prodName.includes('milk') ||
      prodName.includes('juice') ||
      prodName.includes('soda') ||
      prodName.includes('cola') ||
      prodName.includes('drink');

    if (isLiquid) {
      const isWater = prodName.includes('water') || prodName.includes('bisleri') || prodName.includes('aquafina') || prodName.includes('kinley');
      let liquidOptions = [];
      if (isWater) {
        liquidOptions = [
          { id: '500ml', label: '500 ml', unitDescription: 'Bottle', price: Math.max(10, Math.round(baseRate * 0.5)) },
          { id: '1L', label: '1 Liter', unitDescription: 'Bottle', price: baseRate || 20 },
          { id: '2L', label: '2 Liter', unitDescription: 'Bottle', price: Math.max(30, Math.round(baseRate * 1.85)) },
          { id: '5L', label: '5 Liter', unitDescription: 'Can', price: Math.max(65, Math.round(baseRate * 4.5)) },
        ];
      } else {
        liquidOptions = [
          { id: '500ml', label: '500 ml', unitDescription: 'Pouch / Bottle', price: Math.round(baseRate * 0.52) },
          { id: '1L', label: '1 Liter', unitDescription: 'Pouch / Bottle', price: baseRate || 140 },
          { id: '2L', label: '2 Liter', unitDescription: 'Bottle / Jar', price: Math.round(2 * (baseRate > 20 ? baseRate - 3 : baseRate)) },
          { id: '5L', label: '5 Liter', unitDescription: 'Can / Jar', price: Math.round(5 * (baseRate > 20 ? baseRate - 6 : baseRate * 0.95)) },
          { id: '15L', label: '15 Liter', unitDescription: 'Tin / Jar', price: Math.round(15 * (baseRate > 20 ? baseRate - 12 : baseRate * 0.9)) },
        ];
      }

      const defaultOpt = liquidOptions.find(o => prodName.includes(o.id.toLowerCase()) || prodName.includes(o.label.toLowerCase())) || liquidOptions[1] || liquidOptions[0];

      return {
        type: 'packaged_liquid',
        options: liquidOptions,
        selectedOption: defaultOpt,
      };
    }

    // 3. Packaged Spices / Masalas / Powders / Tea / Coffee (100g, 250g, 500g, 1kg)
    const isMasalaOrPowder =
      catName.includes('spice') ||
      catName.includes('masala') ||
      catName.includes('tea') ||
      catName.includes('coffee') ||
      prodName.includes('masala') ||
      prodName.includes('powder') ||
      prodName.includes('spice') ||
      prodName.includes('chilli') ||
      prodName.includes('turmeric') ||
      prodName.includes('coriander') ||
      prodName.includes('salt') ||
      prodName.includes('tea') ||
      prodName.includes('coffee') ||
      prodName.includes('pouch');

    if (isMasalaOrPowder) {
      const masalaOptions = [
        { id: '50g', label: '50g', unitDescription: 'Packet', price: Math.max(10, Math.round(baseRate * 0.55)) },
        { id: '100g', label: '100g', unitDescription: 'Packet', price: baseRate || 30 },
        { id: '250g', label: '250g', unitDescription: 'Packet', price: Math.max(25, Math.round(baseRate * 2.35)) },
        { id: '500g', label: '500g', unitDescription: 'Pack', price: Math.max(45, Math.round(baseRate * 4.6)) },
        { id: '1kg', label: '1 kg', unitDescription: 'Pack', price: Math.max(80, Math.round(baseRate * 9.0)) },
      ];

      const defaultOpt = masalaOptions.find(o => prodName.includes(o.id.toLowerCase()) || prodName.includes(o.label.toLowerCase())) || masalaOptions[1] || masalaOptions[0];

      return {
        type: 'packaged_masala',
        options: masalaOptions,
        selectedOption: defaultOpt,
      };
    }

    // 4. Biscuits, Cookies, Chips, Namkeen & Confectionery (₹5, ₹10, ₹20, ₹30 Packs)
    const isSnacksOrBiscuits =
      catName.includes('snack') ||
      catName.includes('biscuit') ||
      catName.includes('cookie') ||
      catName.includes('chips') ||
      catName.includes('namkeen') ||
      prodName.includes('biscuit') ||
      prodName.includes('cookie') ||
      prodName.includes('chips') ||
      prodName.includes('kurkure') ||
      prodName.includes('namkeen') ||
      prodName.includes('lays') ||
      prodName.includes('bingo') ||
      prodName.includes('haldiram') ||
      prodName.includes('parle') ||
      prodName.includes('good day') ||
      prodName.includes('marie') ||
      prodName.includes('bourbon') ||
      prodName.includes('oreo') ||
      prodName.includes('snack') ||
      prodName.includes('chocolate') ||
      prodName.includes('cadbury');

    if (isSnacksOrBiscuits) {
      const isChips = prodName.includes('chips') || prodName.includes('kurkure') || prodName.includes('lays') || prodName.includes('namkeen') || prodName.includes('bhujia');
      const snackOptions = isChips ? [
        { id: '5rs', label: '₹5 Pack', unitDescription: 'Small / Chota Pouch', price: 5 },
        { id: '10rs', label: '₹10 Pack', unitDescription: 'Regular Pouch', price: 10 },
        { id: '20rs', label: '₹20 Pack', unitDescription: 'Party Pack', price: 20 },
        { id: '40rs', label: '₹40 / ₹50 Pack', unitDescription: 'Jumbo Saver Pack', price: baseRate > 30 ? baseRate : 40 },
      ] : [
        { id: '5rs', label: '₹5 Pack', unitDescription: 'Small / Chota Pack', price: 5 },
        { id: '10rs', label: '₹10 Pack', unitDescription: 'Standard Pack', price: 10 },
        { id: '20rs', label: '₹20 Pack', unitDescription: 'Medium Pack', price: 20 },
        { id: '30rs', label: '₹30 / ₹35 Pack', unitDescription: 'Family Saver Pack', price: baseRate > 25 ? baseRate : 30 },
      ];

      const defaultOpt = snackOptions.find(o => baseRate === o.price) || snackOptions[1] || snackOptions[0];

      return {
        type: 'packaged_general',
        options: snackOptions,
        selectedOption: defaultOpt,
      };
    }

    // 5. General Packaged Goods (Soaps, Detergents, Personal Care, Noodles)
    const isNoodles = prodName.includes('maggi') || prodName.includes('noodle') || prodName.includes('pasta') || prodName.includes('yippee');
    const generalOptions = isNoodles ? [
      { id: '1pc', label: 'Single Pack', unitDescription: '1 Piece', price: baseRate || 14 },
      { id: '4pc', label: 'Pack of 4', unitDescription: '4-Pack Saver', price: Math.round(4 * (baseRate || 14) * 0.96) },
      { id: '8pc', label: 'Family Pack (8 pcs)', unitDescription: 'Mega Saver (8 pcs)', price: Math.round(8 * (baseRate || 14) * 0.92) },
    ] : [
      { id: '1pc', label: 'Single Pack', unitDescription: product.unit?.symbol || 'Piece', price: baseRate },
      { id: '6pc', label: 'Pack of 6', unitDescription: 'Pack of 6', price: Math.round(6 * baseRate * 0.96) },
      { id: '12pc', label: 'Box (12 pcs)', unitDescription: 'Box (12 pcs)', price: Math.round(12 * baseRate * 0.94) },
      { id: '24pc', label: 'Carton (24 pcs)', unitDescription: 'Carton', price: Math.round(24 * baseRate * 0.90) },
    ];

    return {
      type: 'packaged_general',
      options: generalOptions,
      selectedOption: generalOptions[0],
    };
  }, []);

  const handleSelectProduct = useCallback((product) => {
    playScanBeep();
    const pId = product._id || product.product;
    const config = getProductVariantConfig(product);

    setHighlightedItemId(pId);

    if (config.type === 'commodity_loose') {
      setQuantityModal({
        product,
        config,
        mode: 'kg', // 'kg' or 'bag'
        kgQty: 1,
        bagQty: 1,
        selectedBagOption: config.defaultBagOption || config.bagOptions?.[0],
        isExisting: false,
      });
    } else {
      const defaultOpt = config.selectedOption || config.options?.[0];
      setQuantityModal({
        product,
        config,
        selectedOption: defaultOpt,
        quantity: 1,
        isExisting: false,
      });
    }
  }, [getProductVariantConfig]);

  // Load all catalog products for the stable catalog view
  const fetchProductsCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      let res;
      try {
        res = await api.get('/products?status=active&limit=200');
      } catch {
        res = await api.get('/orders/catalog');
      }
      setAllCatalogProducts(res.data.data || []);
    } catch (err) {
      console.error('Failed to load products for POS catalog', err);
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    fetchProductsCatalog();
  }, [fetchProductsCatalog]);

  // Filter products for the stable catalog (by search text & category)
  const displayedCatalogProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return allCatalogProducts.filter(p => {
      const catName = getProductCategory(p).toLowerCase();

      const matchCat =
        selectedSearchCat === 'all' ||
        catName === selectedSearchCat.toLowerCase() ||
        (selectedSearchCat === 'food' && (catName.includes('food') || catName.includes('staple'))) ||
        (selectedSearchCat === 'beverages' && (catName.includes('beverage') || catName.includes('dairy'))) ||
        (selectedSearchCat === 'snacks' && (catName.includes('snack') || catName.includes('biscuit'))) ||
        (selectedSearchCat === 'household' && (catName.includes('house') || catName.includes('care')));

      if (!matchCat) return false;

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
        handleSelectProduct(res.data.data);
        setSearchQuery('');
      }
    } catch {
      toast.error('Product not found for this barcode');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (searchQuery && displayedCatalogProducts.length === 1) {
        handleSelectProduct(displayedCatalogProducts[0]);
        setSearchQuery('');
      } else if (searchQuery && displayedCatalogProducts.length === 0) {
        handleBarcodeScan(searchQuery);
      }
    } else if (e.key === 'Escape') {
      setSearchQuery('');
    }
  };

  const completeSale = async ({ method, cashAmt, upiAmt, paid, _change, notes }, printAfter = false) => {
    try {
      const items = cart.cartItems.map(item => {
        const baseProductId = item.productId || (typeof item._id === 'string' && item._id.includes('_') ? item._id.split('_')[0] : item._id);
        return {
          product: baseProductId,
          productName: item.name,
          unit: item.unit?.symbol || item.unit || '',
          quantity: item.quantity,
          sellingPrice: item.customPrice || item.sellingPrice,
          mrp: item.mrp || item.customPrice || item.sellingPrice,
          discount: item.discount || 0,
          discountType: item.discountType || 'percent',
        };
      });

      const paymentDetails = method === 'mixed'
        ? [{ method: 'cash', amount: cashAmt }, { method: 'upi', amount: upiAmt }]
        : [{ method, amount: paid }];

      const res = await api.post('/sales', {
        customerId: cart.customer?._id,
        items,
        discount: cart.billDiscount || cart.discount,
        paymentMethod: method,
        paymentDetails,
        amountPaid: paid,
        notes,
      });

      const savedSale = res.data.data;
      setLastInvoice(savedSale);
      cart.clearCart();
      setShowPayment(false);
      setShowMobileCart(false);
      playSuccessChime();
      toast.success(`Bill saved! Invoice: ${savedSale.invoiceNumber}`);

      if (printAfter) {
        // Navigate to sale detail page which has the print-ready bill
        window.open(`/sales/${savedSale._id}?print=1`, '_blank');
      }
    } catch (err) {
      playWarningTone();
      toast.error(err.response?.data?.message || 'Failed to save sale');
    }
  };

  const handleCustomerPicked = (selectedCust) => {
    setShowCustomer(false);
    if (!selectedCust) {
      cart.setCustomer(null);
      return;
    }
    // If cart has items and the cashier is switching to a different customer
    if (cart.cartItems.length > 0 && selectedCust._id !== cart.customer?._id) {
      setPendingCustomer(selectedCust);
    } else {
      cart.setCustomer(selectedCust);
    }
  };

  const repeatLastPurchase = async (customerId) => {
    try {
      const res = await api.get(`/customers/${customerId}/purchases?limit=1`);
      const lastSale = res.data.data?.[0];
      if (!lastSale || !lastSale.items?.length) return toast.error('No previous purchase found');

      if (cart.cartItems.length > 0) {
        setPendingRepeatSale(lastSale);
      } else {
        cart.loadFromSale(lastSale.items);
        toast.success(`Loaded last purchase (${lastSale.items.length} items) into cart`);
      }
    } catch {
      toast.error('Could not load last purchase');
    }
  };

  const CATEGORY_TABS = [
    { key: 'all', label: 'All Items' },
    { key: 'food', label: 'Food & Staples' },
    { key: 'beverages', label: 'Beverages' },
    { key: 'snacks', label: 'Snacks & Biscuits' },
    { key: 'household', label: 'Household Care' },
  ];


  const renderBillContent = () => (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="p-2.5 sm:p-3 border-b border-gray-100 bg-gray-50/70 shrink-0">
        {cart.customer ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary-100 rounded-xl flex items-center justify-center text-primary-700 font-extrabold text-sm shadow-2xs shrink-0">
              {cart.customer.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-gray-900 truncate">{cart.customer.name}</p>
              <p className="text-xs text-gray-500 font-medium">{cart.customer.mobile}</p>
              {cart.customer.outstandingBalance > 0 && (
                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md mt-1 border border-amber-300 shadow-2xs">
                  <AlertCircle size={11} className="text-amber-600 shrink-0" />
                  <span>Pending Udhaar: {fmt(cart.customer.outstandingBalance)}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-0.5 text-right shrink-0">
              <button onClick={() => setShowCustomer(true)} className="text-xs text-primary-600 hover:underline cursor-pointer font-bold">Change</button>
              <button onClick={() => cart.setCustomer(null)} className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer">Remove</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowCustomer(true)} className="btn-outline w-full py-2 gap-2 text-xs font-bold cursor-pointer rounded-xl">
            <User size={15} /> Select Customer
          </button>
        )}
        {cart.customer && (
          <button onClick={() => repeatLastPurchase(cart.customer._id)} className="mt-1 w-full btn-ghost btn-sm gap-1 text-xs text-primary-700 font-semibold cursor-pointer">
            <RotateCcw size={12} /> Repeat Last Purchase
          </button>
        )}
      </div>

      {/* Held Bills Queue Quick Banner */}
      {cart.heldBills.length > 0 && (
        <div className="mx-2.5 mt-2 p-2 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex items-center justify-between text-xs shrink-0 shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
              <Pause size={13} />
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-amber-950 truncate text-xs leading-tight">
                {cart.heldBills.length} {cart.heldBills.length === 1 ? 'Bill Held' : 'Bills Held'} in Queue
              </p>
              <p className="text-[10px] text-amber-800 truncate">
                Next: <strong>{cart.heldBills[0].customerName || 'Walk-in'}</strong> ({cart.heldBills[0].items?.length || 0} items)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (cart.cartItems.length > 0) {
                const curName = cart.customer?.name || 'Walk-in Customer';
                await cart.holdBill({ customerName: curName, notes: 'Auto-held before resuming queue' });
              }
              cart.resumeBill(cart.heldBills[0]._id || cart.heldBills[0].id);
            }}
            className="btn-primary btn-sm text-[11px] font-extrabold py-1 px-2.5 bg-amber-700 hover:bg-amber-800 shadow-2xs rounded-xl shrink-0 cursor-pointer"
          >
            Resume Next →
          </button>
        </div>
      )}

      <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-gray-100 bg-white shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold">
            <ShoppingCart size={18} />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-gray-900">Your Grocery Cart</h3>
            <p className="text-xs text-gray-500">{cart.cartItems.length} {cart.cartItems.length === 1 ? 'item' : 'items'} in basket</p>
          </div>
        </div>
        {cart.cartItems.length > 0 && (
          <button
            onClick={() => { if (window.confirm('Clear all items from bill?')) cart.clearCart(); }}
            className="text-xs text-red-500 hover:text-red-700 font-semibold cursor-pointer px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Cart line items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-white min-h-[200px]">
        {cart.cartItems.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <ShoppingCart size={36} className="mx-auto mb-2 opacity-30 text-primary-600" />
            <p className="text-xs font-semibold text-gray-600">Your cart is empty</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Click products on the left to add to bill.</p>
          </div>
        ) : (
          cart.cartItems.map((item) => {
            const price = item.customPrice || item.sellingPrice;
            const lineTotal = price * item.quantity;
            const unitSymbol = item.unit?.symbol || item.unit || '';
            const isHighlighted = highlightedItemId === (item._id || item.product);

            return (
              <div
                key={item._id}
                className={clsx(
                  'p-2.5 rounded-xl border transition-all duration-150 flex items-center justify-between gap-2.5 text-xs',
                  isHighlighted
                    ? 'bg-amber-50/60 border-amber-300 shadow-2xs'
                    : 'bg-gray-50/90 border-gray-100 hover:border-gray-200'
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="font-bold text-xs sm:text-sm text-gray-900 truncate leading-tight">{item.name}</p>
                    {isHighlighted && (
                      <span className="text-[9px] bg-amber-100 text-amber-800 border border-amber-200 font-semibold px-1 rounded shrink-0">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-[11px] mt-0.5 leading-tight">₹{price} {unitSymbol ? `/ ${unitSymbol}` : ''}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* In-Cart Steppers */}
                  <div className="flex items-center gap-0.5 bg-white p-0.5 rounded-lg border border-gray-200 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => cart.updateItem(item._id, 'quantity', Math.max(1, item.quantity - 1))}
                      className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                      title="Decrease quantity"
                    >
                      <Minus size={11} />
                    </button>
                    <input
                      type="number"
                      className="w-6 text-center font-extrabold text-xs text-emerald-800 border-0 p-0 focus:ring-0"
                      value={item.quantity}
                      onChange={e => cart.updateItem(item._id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                      min={1}
                    />
                    <button
                      type="button"
                      onClick={() => cart.updateItem(item._id, 'quantity', item.quantity + 1)}
                      className="w-6 h-6 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center font-bold shadow-2xs transition-colors cursor-pointer"
                      title="Increase quantity"
                    >
                      <Plus size={11} />
                    </button>
                  </div>

                  {/* Line Total */}
                  <span className="font-extrabold text-xs text-emerald-700 w-12 text-right">
                    {fmt(lineTotal)}
                  </span>

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => cart.removeItem(item._id)}
                    className="text-gray-300 hover:text-red-500 p-1 cursor-pointer transition-colors"
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

      {/* Bill Totals Summary */}
      <div className="p-3.5 sm:p-4 space-y-2 border-t border-gray-200 bg-gray-50/70 shrink-0">
        <div className="flex justify-between text-xs text-gray-600">
          <span>Subtotal ({cart.cartItems.length} items)</span>
          <span className="font-bold text-gray-900">{fmt(cart.subtotal)}</span>
        </div>
        {cart.billDiscount > 0 && (
          <div className="flex justify-between text-xs text-emerald-700 font-bold">
            <span>Discount ({cart.discountPercentage}% reduce)</span>
            <span>-{fmt(cart.billDiscount)}</span>
          </div>
        )}
        <div className="flex justify-between text-xs text-gray-600">
          <span>Tax (GST)</span>
          <span className="font-medium text-gray-800">{fmt(cart.totalTax)}</span>
        </div>
        {cart.roundOff !== 0 && (
          <div className="flex justify-between text-xs text-gray-500">
            <span>Round Off</span>
            <span>{fmt(cart.roundOff)}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
          <span className="font-black text-gray-900 text-xs sm:text-sm uppercase tracking-wide">GRAND TOTAL</span>
          <span className="font-black text-primary-700 text-lg sm:text-xl">{fmt(cart.grandTotal)}</span>
        </div>
        {cart.totalSavings > 0 && (
          <div className="mt-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-center justify-between text-xs shadow-xs">
            <span className="font-bold flex items-center gap-1.5">
              <Tag size={13} className="text-emerald-700" />
              <span>You Save:</span>
            </span>
            <span className="font-black text-emerald-700 text-xs sm:text-sm">{fmt(cart.totalSavings)} ({cart.savingsPercentage}%)</span>
          </div>
        )}
      </div>

      <div className="px-3.5 sm:px-4 py-2 border-b border-gray-100 bg-white shrink-0">
        <div className="flex justify-between items-center mb-1">
          <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Discount (₹)</label>
          {cart.discount > 0 && (
            <span className="text-[10px] font-bold text-emerald-700">{cart.discountPercentage}% reduction</span>
          )}
        </div>
        <input
          type="number"
          className="form-input text-xs font-bold py-1.5 px-3 w-full rounded-xl"
          placeholder="0"
          value={cart.discount || ''}
          onChange={e => cart.setDiscount(parseFloat(e.target.value) || 0)}
        />
      </div>

      <div className="p-3.5 sm:p-4 space-y-2.5 bg-white shrink-0">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              if (cart.cartItems.length > 0) {
                setShowHoldPrompt(true);
              } else {
                toast.error('Cart is empty. Add items first.');
              }
            }}
            className="btn-secondary btn-sm gap-1 text-xs font-bold py-2 rounded-xl cursor-pointer bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100"
          >
            <Pause size={13} /> Hold Bill
          </button>
          <button
            onClick={() => { if (window.confirm('Clear cart?')) cart.clearCart(); }}
            className="btn-secondary btn-sm gap-1 text-xs font-bold text-red-500 hover:text-red-600 py-2 rounded-xl cursor-pointer"
          >
            <Trash2 size={13} /> Clear Bill
          </button>
        </div>
        <button
          onClick={() => {
            if (cart.cartItems.length === 0) return toast.error('Cart is empty');
            setShowPayment(true);
          }}
          className="btn-primary w-full py-3 text-sm sm:text-base font-black tracking-wide gap-2 cursor-pointer shadow-lg rounded-xl"
        >
          <Check size={18} /> COMPLETE BILL
        </button>
      </div>
      {lastInvoice && (
        <div className="px-2.5 sm:px-3 pb-2 shrink-0">
          <div className="bg-green-50 border border-green-200 rounded-lg p-1.5 text-center">
            <p className="text-xs font-semibold text-green-700">Last: {lastInvoice.invoiceNumber}</p>
            <p className="text-[10px] text-green-600">{fmt(lastInvoice.grandTotal)} · {lastInvoice.paymentMethod}</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-full gap-4 lg:gap-5 bg-gray-50/50 p-2 sm:p-3 relative overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 p-2 sm:p-3 space-y-3 h-full overflow-y-auto pb-20 lg:pb-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart size={20} className="text-primary-600" /> POS Billing
          </h1>
          <div className="ml-auto flex items-center gap-2">
            {cart.heldBills.length > 0 && (
              <button
                onClick={() => setShowHeldModal(true)}
                className="btn-secondary btn-sm gap-1 bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 font-semibold cursor-pointer"
                title="View and resume held bills from Database"
              >
                <Pause size={14} /> Held Bills ({cart.heldBills.length})
              </button>
            )}
            <button
              onClick={() => setShowMobileCart(true)}
              className="lg:hidden btn-primary btn-sm gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs"
            >
              <ShoppingCart size={15} /> Bill ({cart.cartItems.length})
            </button>
          </div>
        </div>

        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchRef}
            autoFocus
            className="form-input pl-10 pr-10 py-2.5 text-sm font-medium rounded-xl border-gray-300 focus:border-primary-500 focus:ring-primary-500 shadow-2xs bg-white"
            placeholder="Search products by name, barcode, SKU or brand..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {searchQuery && (
            <button
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              onClick={() => {
                setSearchQuery('');
                searchRef.current?.focus();
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>


        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedSearchCat(tab.key)}
              className={clsx(
                'px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer',
                selectedSearchCat === tab.key
                  ? 'bg-primary-600 text-white shadow-xs scale-102'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
              )}
            >
              {tab.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-400 font-medium shrink-0 pr-1">
            {displayedCatalogProducts.length} items
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loadingCatalog ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              Loading grocery catalog...
            </div>
          ) : displayedCatalogProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-sm p-4">
              <p className="font-semibold text-gray-600">No products found</p>
              <p className="text-xs text-gray-400 mt-1">Try another search keyword or clear filters</p>
            </div>
          ) : (
            displayedCatalogProducts.map(p => {
              const catName = getProductCategory(p);
              const unitName = p.unit?.symbol || p.unit?.name || '';
              const inStock = p.currentStock > 0;

              return (
                <div
                  key={p._id}
                  onClick={() => handleSelectProduct(p)}
                  className="group p-3 sm:p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer select-none bg-white border-gray-200 hover:border-primary-400 hover:shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-gray-900 group-hover:text-primary-700 truncate leading-snug">
                      {p.name}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span className="text-[10px] bg-gray-100 text-gray-700 font-semibold px-2 py-0.5 rounded-md shrink-0">
                        {catName}
                      </span>
                      <span className="text-xs text-gray-400">· Stock: <span className={clsx('font-semibold', inStock ? 'text-gray-700' : 'text-red-500')}>{p.currentStock}</span></span>
                    </div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-base font-extrabold text-primary-700">
                        ₹{p.sellingPrice}
                      </span>
                      {unitName && (
                        <span className="text-xs text-gray-400 font-medium">
                          / {unitName}
                        </span>
                      )}
                      {p.mrp > p.sellingPrice && (
                        <span className="text-[10px] text-gray-400 line-through ml-1.5">
                          MRP ₹{p.mrp}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectProduct(p);
                    }}
                    className="btn-primary btn-sm text-xs font-bold gap-1 rounded-xl px-3 py-2 shadow-xs shrink-0 cursor-pointer transition-all flex items-center"
                  >
                    <Plus size={14} />
                    <span>Add / Packs</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="hidden lg:flex lg:w-[42%] xl:w-[38%] min-w-[340px] max-w-[480px] border border-gray-200 rounded-2xl flex-col bg-white h-full shadow-md overflow-y-auto overflow-x-hidden shrink-0">
        {renderBillContent()}
      </div>

      {cart.cartItems.length > 0 && (
        <div className="lg:hidden fixed bottom-3 left-3 right-3 z-40">
          <button
            onClick={() => setShowMobileCart(true)}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white p-3 rounded-2xl shadow-2xl flex items-center justify-between font-bold transition-all active:scale-[0.99] cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                <ShoppingCart size={18} />
              </div>
              <div className="text-left">
                <p className="text-xs font-extrabold leading-none">{cart.cartItems.length} {cart.cartItems.length === 1 ? 'item' : 'items'} in bill</p>
                <p className="text-[10px] text-emerald-100 mt-0.5 truncate max-w-[140px]">{cart.customer?.name || 'Walk-in Customer'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black">{fmt(cart.grandTotal)}</span>
              <span className="bg-white text-emerald-800 text-xs font-black px-2.5 py-1 rounded-xl shadow-xs">View Bill →</span>
            </div>
          </button>
        </div>
      )}

      {showMobileCart && (
        <div className="lg:hidden fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between p-3.5 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center">
                  <ShoppingCart size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900">Current Bill</h3>
                  <p className="text-xs text-gray-500">{cart.cartItems.length} items in basket</p>
                </div>
              </div>
              <button
                onClick={() => setShowMobileCart(false)}
                className="w-8 h-8 rounded-xl bg-gray-200/80 hover:bg-gray-300 text-gray-600 flex items-center justify-center transition-colors cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 flex flex-col">
              {renderBillContent()}
            </div>
          </div>
        </div>
      )}

      {showCustomer && (
        <CustomerSelector
          onSelect={handleCustomerPicked}
          onClose={() => setShowCustomer(false)}
        />
      )}

      {/* Switch Customer Conflict / Hold Modal */}
      {pendingCustomer && (
        <SwitchCustomerPromptModal
          currentCart={cart}
          targetCustomer={pendingCustomer}
          onHoldAndSwitch={async () => {
            const currentName = cart.customer?.name || 'Walk-in Customer';
            const currentMobile = cart.customer?.mobile || '';
            await cart.holdBill({
              customerName: currentName,
              customerMobile: currentMobile,
              notes: `Held to bill ${pendingCustomer?.name || 'new customer'}`
            });
            cart.setCustomer(pendingCustomer);
            setPendingCustomer(null);
            toast.success(`Previous bill held in queue! Started new bill for ${pendingCustomer?.name || 'Walk-in'}.`);
          }}
          onAssignToCurrent={() => {
            cart.setCustomer(pendingCustomer);
            setPendingCustomer(null);
            toast.success(`Assigned ${pendingCustomer?.name || 'Walk-in'} to active bill.`);
          }}
          onCancel={() => setPendingCustomer(null)}
        />
      )}

      {/* Repeat Purchase Conflict / Hold Modal */}
      {pendingRepeatSale && (
        <RepeatPurchasePromptModal
          currentCart={cart}
          targetCustomer={cart.customer}
          onHoldAndLoad={async () => {
            const currentName = cart.customer?.name || 'Walk-in Customer';
            const currentMobile = cart.customer?.mobile || '';
            await cart.holdBill({
              customerName: currentName,
              customerMobile: currentMobile,
              notes: `Held before repeat purchase for ${cart.customer?.name || 'Customer'}`
            });
            cart.loadFromSale(pendingRepeatSale.items);
            setPendingRepeatSale(null);
            toast.success(`Previous bill saved to Held Bills! Loaded repeat purchase (${pendingRepeatSale.items.length} items).`);
          }}
          onAppend={() => {
            cart.appendFromSale(pendingRepeatSale.items);
            setPendingRepeatSale(null);
            toast.success(`Added ${pendingRepeatSale.items.length} repeat items to current bill!`);
          }}
          onCancel={() => setPendingRepeatSale(null)}
        />
      )}

      {showPayment && (
        <PaymentModal
          onSaveAndPrint={(payData) => completeSale(payData, true)}
          grandTotal={cart.grandTotal}
          totalSavings={cart.totalSavings}
          savingsPercentage={cart.savingsPercentage}
          customer={cart.customer}
          onSave={completeSale}
          onClose={() => setShowPayment(false)}
        />
      )}
      
      {/* Hold Bill Prompt Modal */}
      {showHoldPrompt && (
        <HoldBillPromptModal
          cart={cart}
          onHold={(tagData) => cart.holdBill(tagData)}
          onClose={() => setShowHoldPrompt(false)}
        />
      )}

      {/* Held Bills Modal */}
      {showHeldModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl p-5 border border-gray-100 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Pause size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                    Held Bills Queue ({cart.heldBills.length})
                  </h3>
                  <p className="text-xs text-gray-500">Saved bills waiting to be resumed</p>
                </div>
              </div>
              <button onClick={() => setShowHeldModal(false)} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto flex-1 pr-1">
              {cart.heldBills.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Pause size={32} className="mx-auto mb-2 opacity-30 text-amber-500" />
                  <p className="text-sm font-semibold text-gray-600">No held bills in queue</p>
                  <p className="text-xs text-gray-400 mt-1">Hold any active bill to serve urgent customers, then resume it here.</p>
                </div>
              ) : (
                cart.heldBills.map((bill) => {
                  const custDisplayName = bill.customerName || bill.customer?.name || 'Walk-in Customer';
                  const custMobile = bill.customerMobile || bill.customer?.mobile || '';
                  const itemsPreview = (bill.items || []).map(i => `${i.name} (x${i.quantity})`).join(', ');

                  return (
                    <div key={bill._id || bill.id} className="p-3.5 border border-gray-200 rounded-2xl bg-gray-50/80 hover:border-primary-400 hover:bg-primary-50/20 transition-all space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded-lg">
                              {bill.billNumber || 'HELD'}
                            </span>
                            <span className="font-extrabold text-sm text-gray-900 flex items-center gap-1">
                              <User size={13} className="text-gray-500 shrink-0" />
                              <span>{custDisplayName} {custMobile ? `(${custMobile})` : ''}</span>
                            </span>
                          </div>
                          {bill.notes && (
                            <p className="text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md mt-1 inline-flex items-center gap-1 font-medium">
                              <FileText size={11} className="text-amber-700 shrink-0" />
                              <span>Note: {bill.notes}</span>
                            </p>
                          )}
                        </div>
                        <span className="font-black text-base text-primary-700 shrink-0">
                          {fmt(bill.grandTotal)}
                        </span>
                      </div>

                      {/* Item details list preview */}
                      <div className="p-2 bg-white rounded-xl border border-gray-100 text-xs text-gray-600">
                        <span className="font-bold text-gray-800 inline-flex items-center gap-1 mr-1">
                          <ShoppingCart size={12} className="text-gray-700" />
                          <span>{bill.items?.length || 0} items:</span>
                        </span>
                        <span className="text-gray-500">{itemsPreview}</span>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[11px] text-gray-400">
                        <span className="inline-flex items-center gap-1">
                          <Clock size={11} className="text-gray-400 shrink-0" />
                          <span>Held at {new Date(bill.createdAt || bill.heldAt || 0).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              if (cart.cartItems.length > 0) {
                                const curName = cart.customer?.name || 'Walk-in Customer';
                                await cart.holdBill({ customerName: curName, notes: 'Auto-held before resuming ' + (bill.customerName || bill.billNumber) });
                              }
                              cart.resumeBill(bill._id || bill.id);
                              setShowHeldModal(false);
                            }}
                            className="btn-primary btn-sm text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer"
                          >
                            Resume Bill →
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete held bill ${bill.billNumber || ''} (${custDisplayName})?`)) {
                                cart.deleteHeldBill(bill._id || bill.id);
                              }
                            }}
                            className="btn-icon btn-ghost btn-sm text-red-500 hover:bg-red-50 rounded-xl cursor-pointer"
                            title="Discard Held Bill"
                          >
                            <Trash2 size={15} />
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

      {/* Specialized Packaging & Quantity Modal for All Grocery Categories */}
      {quantityModal && (() => {
        const { product, config } = quantityModal;
        const pId = product._id || product.product;

        if (config.type === 'commodity_loose') {
          const { mode, kgQty, bagQty, selectedBagOption } = quantityModal;
          const currentKg = Number(kgQty) || 1;
          const currentBags = Number(bagQty) || 1;
          const baseRate = config.baseRate;
          const lineTotal = mode === 'kg'
            ? currentKg * baseRate
            : currentBags * selectedBagOption.price;

          const handleConfirm = () => {
            if (mode === 'kg') {
              const kgKey = `${pId}_kg`;
              const existingKg = cart.cartItems.find(i => (i._id || i.product) === kgKey || (i._id === pId && (i.unit?.symbol === 'kg' || i.unit === 'kg')));

              if (existingKg) {
                const targetKey = existingKg._id || existingKg.product;
                const newQty = Math.round(((existingKg.quantity || 0) + currentKg) * 100) / 100;
                cart.updateItem(targetKey, 'quantity', newQty);
                toast.success(`Increased ${product.name} to ${newQty} kg`);
                setHighlightedItemId(targetKey);
              } else {
                cart.addItem({
                  ...product,
                  _id: kgKey,
                  productId: pId,
                  name: `${product.name} (Loose)`,
                  sellingPrice: baseRate,
                  customPrice: baseRate,
                  unit: { symbol: 'kg' },
                  subcategory: 'Loose kg',
                }, currentKg);
                toast.success(`Added ${currentKg} kg × ${product.name} to bill`);
                setHighlightedItemId(kgKey);
              }
            } else {
              const bagKey = `${pId}_${selectedBagOption.id}`;
              const bagName = `${product.name} (${selectedBagOption.label})`;
              const existingBag = cart.cartItems.find(i => (i._id || i.product) === bagKey);

              if (existingBag) {
                const newQty = (existingBag.quantity || 0) + currentBags;
                cart.updateItem(bagKey, 'quantity', newQty);
                toast.success(`Increased ${bagName} to ${newQty} Bags`);
              } else {
                cart.addItem({
                  ...product,
                  _id: bagKey,
                  productId: pId,
                  name: bagName,
                  sellingPrice: selectedBagOption.price,
                  customPrice: selectedBagOption.price,
                  unit: { symbol: selectedBagOption.label },
                  subcategory: selectedBagOption.label,
                }, currentBags);
                toast.success(`Added ${currentBags} × ${bagName} to bill`);
              }
              setHighlightedItemId(bagKey);
            }
            setQuantityModal(null);
          };

          return (
            <div
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
            >
              <div
                className="bg-white rounded-3xl max-w-md w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150 my-auto overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                {/* Header (pinned at top) */}
                <div className="flex items-center justify-between border-b border-gray-100 p-4 sm:p-5 shrink-0 bg-white">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                      <ShoppingCart size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-gray-900 leading-tight">
                        {product.name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {product.category?.name || product.category || 'Staples / Grains'} • In Stock: <b className="text-emerald-700 font-bold">{product.currentStock} kg</b>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setQuantityModal(null)}
                    className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center cursor-pointer transition-colors"
                    title="Close"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Scrollable Form Body */}
                <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
                  {/* Already In Bill Alert Banner */}
                  {quantityModal.isExisting && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 shadow-2xs">
                      <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-extrabold text-amber-950">Already in this bill!</p>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          Currently in bill with quantity: <span className="font-bold text-amber-950">{quantityModal.existingItem?.quantity || 1} {quantityModal.existingItem?.unit?.symbol || 'units'}</span>. Modifying will update the bill item directly.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Mode Switcher: Active mode is active, the other is blocked/hidden */}
                  <div className="grid grid-cols-2 gap-2 p-1.5 bg-gray-100/90 rounded-2xl border border-gray-200/80">
                    <button
                      type="button"
                      onClick={() => setQuantityModal(prev => ({ ...prev, mode: 'kg' }))}
                      className={clsx(
                        'py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer',
                        mode === 'kg'
                          ? 'bg-primary-600 text-white shadow-xs scale-101'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                      )}
                    >
                      <Scale size={14} />
                      <span>Loose by Weight (kg)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuantityModal(prev => ({ ...prev, mode: 'bag' }))}
                      className={clsx(
                        'py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer',
                        mode === 'bag'
                          ? 'bg-emerald-600 text-white shadow-xs scale-101'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                      )}
                    >
                      <Package size={14} />
                      <span>Whole Bags</span>
                    </button>
                  </div>

                  {/* Conditional Active Section */}
                  {mode === 'kg' ? (
                    /* OPTION 1: Buy Loose by Weight (KG) */
                    <div className="p-3.5 rounded-2xl border border-primary-500 bg-primary-50/40 ring-2 ring-primary-500/20 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-xs text-gray-900">
                          Enter Weight in Kilograms:
                        </label>
                        <span className="text-xs font-black text-primary-700">₹{baseRate} / kg</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setQuantityModal(prev => ({ ...prev, kgQty: Math.max(0.25, (Number(prev.kgQty) || 1) - 1) }));
                          }}
                          className="w-10 h-10 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold flex items-center justify-center cursor-pointer shadow-2xs"
                        >
                          <Minus size={18} />
                        </button>
                        <div className="relative flex-1">
                          <input
                            type="number"
                            step="any"
                            min={0.1}
                            autoFocus
                            value={kgQty}
                            onWheel={e => e.target.blur()}
                            onChange={e => {
                              const val = e.target.value === '' ? '' : Math.max(0.01, parseFloat(e.target.value) || 1);
                              setQuantityModal(prev => ({ ...prev, kgQty: val }));
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleConfirm();
                              }
                            }}
                            placeholder="1"
                            className="form-input text-xl font-black text-center py-2 px-3 rounded-xl w-full bg-white border-primary-400 text-primary-800 ring-2 ring-primary-100 placeholder:text-gray-300 placeholder:font-normal placeholder:opacity-60"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">KG</span>
                        </div>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setQuantityModal(prev => ({ ...prev, kgQty: (Number(prev.kgQty) || 0) + 1 }));
                          }}
                          className="w-10 h-10 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold flex items-center justify-center cursor-pointer shadow-xs"
                        >
                          <Plus size={18} />
                        </button>
                      </div>

                      {/* Quick KG chips */}
                      <div className="flex gap-1.5 overflow-x-auto pt-1">
                        {[0.5, 1, 2, 5, 10].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setQuantityModal(prev => ({ ...prev, kgQty: val }))}
                            className={clsx(
                              'px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer shrink-0',
                              Number(kgQty) === val
                                ? 'bg-primary-600 text-white border-primary-600'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                            )}
                          >
                            {val} kg
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* OPTION 2: Buy in Pre-Packed / Bulk Bags */
                    <div className="p-3.5 rounded-2xl border border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-xs text-gray-900">
                          Select Bag Size:
                        </label>
                        <span className="text-xs font-black text-emerald-700">₹{selectedBagOption.price} / {selectedBagOption.label}</span>
                      </div>

                      {/* Bag options grid if available */}
                      {config.bagOptions && config.bagOptions.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          {config.bagOptions.map(bag => (
                            <button
                              key={bag.id}
                              type="button"
                              onClick={() => setQuantityModal(prev => ({ ...prev, selectedBagOption: bag }))}
                              className={clsx(
                                'p-2.5 rounded-xl border text-left transition-all cursor-pointer',
                                selectedBagOption.id === bag.id
                                  ? 'border-emerald-500 bg-white shadow-2xs ring-2 ring-emerald-500/30'
                                  : 'border-gray-200 bg-white/70 hover:bg-white'
                              )}
                            >
                              <span className="font-bold text-xs text-gray-900 block">{bag.label}</span>
                              <span className="text-xs font-black text-emerald-700 block mt-0.5">₹{bag.price}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-700">Number of Bags:</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setQuantityModal(prev => ({ ...prev, bagQty: Math.max(1, (Number(prev.bagQty) || 1) - 1) }));
                            }}
                            className="w-10 h-10 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold flex items-center justify-center cursor-pointer shadow-2xs"
                          >
                            <Minus size={18} />
                          </button>
                          <div className="relative w-24">
                            <input
                              type="number"
                              min={1}
                              autoFocus
                              value={bagQty}
                              onWheel={e => e.target.blur()}
                              onChange={e => {
                                const val = e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1);
                                setQuantityModal(prev => ({ ...prev, bagQty: val }));
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleConfirm();
                                }
                              }}
                              placeholder="1"
                              className="form-input text-xl font-black text-center py-2 px-2 rounded-xl w-full bg-white border-emerald-400 text-emerald-800 ring-2 ring-emerald-100 placeholder:text-gray-300 placeholder:font-normal placeholder:opacity-60"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setQuantityModal(prev => ({ ...prev, bagQty: (Number(prev.bagQty) || 0) + 1 }));
                            }}
                            className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center cursor-pointer shadow-xs"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Total Banner */}
                  <div className="p-3.5 bg-primary-50/80 border border-primary-100 rounded-2xl flex items-center justify-between text-xs shadow-2xs">
                    <div>
                      <span className="font-bold text-gray-800 text-sm">
                        {mode === 'kg'
                          ? `${currentKg} kg × ₹${baseRate}`
                          : `${currentBags} × ${selectedBagOption.label} @ ₹${selectedBagOption.price}`}
                      </span>
                    </div>
                    <span className="font-black text-primary-800 text-xl shrink-0">
                      Total: {fmt(lineTotal)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons (pinned at bottom) */}
                <div className="p-4 sm:p-5 pt-3 border-t border-gray-100 bg-gray-50/70 shrink-0">
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setQuantityModal(null)}
                      className="btn-secondary py-2.5 rounded-xl font-bold text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirm}
                      className="btn-primary py-2.5 rounded-xl font-bold text-xs tracking-wide cursor-pointer shadow-md"
                    >
                      Add to Bill
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        // For Packaged Liquids (Water/Oils), Packaged Masalas/Spices, and General Packaged Goods
        const { selectedOption, quantity } = quantityModal;
        const currentQty = Number(quantity) || 1;
        const lineTotal = currentQty * selectedOption.price;

        const itemKey = `${pId}_${selectedOption.id}`;
        const itemName = `${product.name} (${selectedOption.label})`;

        const handleConfirm = () => {
          // Check if same product AND same subcategory is already in cart
          const existingSameVariant = cart.cartItems.find(i => (i._id || i.product) === itemKey);

          if (existingSameVariant) {
            // Same product and same subcategory -> INCREASE QUANTITY
            const newQty = (existingSameVariant.quantity || 0) + currentQty;
            cart.updateItem(itemKey, 'quantity', newQty);
            toast.success(`Increased ${itemName} quantity to ${newQty}`);
          } else {
            // Different subcategory (e.g. 2L vs 1L) -> MAKE IT A NEW PRODUCT IN CART
            cart.addItem({
              ...product,
              _id: itemKey,
              productId: pId,
              name: itemName,
              sellingPrice: selectedOption.price,
              customPrice: selectedOption.price,
              unit: { symbol: selectedOption.label },
              subcategory: selectedOption.label,
            }, currentQty);
            toast.success(`Added ${currentQty} × ${itemName} to bill`);
          }
          setHighlightedItemId(itemKey);
          setQuantityModal(null);
        };

        const sizeLabelText = config.type === 'packaged_liquid'
          ? 'Select Bottle / Pack Size:'
          : (config.type === 'packaged_masala' ? 'Select Packet Weight:' : 'Select Packaging / Size:');

        const qtyLabelText = config.type === 'packaged_liquid'
          ? `Enter Number of Bottles / Cans (${selectedOption.label}):`
          : (config.type === 'packaged_masala' ? `Enter Number of Packets (${selectedOption.label}):` : `Enter Quantity (${selectedOption.label}):`);

        return (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
          >
            <div
              className="bg-white rounded-3xl max-w-md w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150 my-auto overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header (pinned at top) */}
              <div className="flex items-center justify-between border-b border-gray-100 p-4 sm:p-5 shrink-0 bg-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                    <ShoppingCart size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-gray-900 leading-tight">
                      {product.name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {product.category?.name || product.category || 'Packaged Grocery'} • In Stock: <b className="text-emerald-700 font-bold">{product.currentStock} {product.unit?.symbol || 'Units'}</b>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setQuantityModal(null)}
                  className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center cursor-pointer transition-colors"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
                {/* Already In Bill Alert Banner */}
                {quantityModal.isExisting && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 shadow-2xs mb-4">
                  <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-amber-950">Already in this bill!</p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Currently in bill with quantity: <span className="font-bold text-amber-950">{quantityModal.existingItem?.quantity || 1} {quantityModal.existingItem?.unit?.symbol || 'units'}</span>. Modifying will update the bill item directly.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 1: Select Pack / Size */}
              <div className="mb-4">
                <label className="text-xs font-bold text-gray-700 block mb-2">
                  {sizeLabelText}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {config.options.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setQuantityModal(prev => ({ ...prev, selectedOption: opt }))}
                      className={clsx(
                        'p-2.5 rounded-2xl text-left border transition-all cursor-pointer relative',
                        selectedOption.id === opt.id
                          ? 'bg-primary-50/80 border-primary-500 ring-2 ring-primary-500/30 shadow-xs'
                          : 'bg-gray-50/70 border-gray-200 hover:bg-gray-100 text-gray-700'
                      )}
                    >
                      <span className="block font-black text-sm text-gray-900 leading-tight">
                        {opt.label}
                      </span>
                      <span className="block text-xs font-extrabold text-primary-700 mt-1">
                        ₹{opt.price}
                      </span>
                      {opt.unitDescription && (
                        <span className="block text-[10px] text-gray-400 mt-0.5 truncate">
                          {opt.unitDescription}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Enter Quantity with Stepper */}
              <div className="mb-4">
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  {qtyLabelText}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantityModal(prev => ({ ...prev, quantity: Math.max(1, (Number(prev.quantity) || 1) - 1) }))}
                    className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center justify-center cursor-pointer"
                  >
                    <Minus size={18} />
                  </button>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={1}
                      autoFocus
                      value={quantity}
                      onWheel={e => e.target.blur()}
                      onChange={e => {
                        const val = e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1);
                        setQuantityModal(prev => ({ ...prev, quantity: val }));
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleConfirm();
                        }
                      }}
                      placeholder="1"
                      className="form-input text-xl font-black text-center py-2 px-3 rounded-xl w-full bg-white border-primary-400 text-primary-800 ring-2 ring-primary-100 placeholder:text-gray-300 placeholder:font-normal placeholder:opacity-60"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuantityModal(prev => ({ ...prev, quantity: (Number(prev.quantity) || 0) + 1 }))}
                    className="w-10 h-10 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold flex items-center justify-center cursor-pointer shadow-xs"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              {/* Total Banner */}
              <div className="p-3.5 bg-primary-50/80 border border-primary-100 rounded-2xl mb-4 flex items-center justify-between text-xs shadow-2xs">
                <div>
                  <span className="font-bold text-gray-800 text-sm">
                    {currentQty} × {selectedOption.label} @ ₹{selectedOption.price}
                  </span>
                </div>
                <span className="font-black text-primary-800 text-xl shrink-0">
                  Total: {fmt(lineTotal)}
                </span>
              </div>
            </div>

            {/* Action Buttons (pinned at bottom) */}
            <div className="p-4 sm:p-5 pt-3 border-t border-gray-100 bg-gray-50/70 shrink-0">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setQuantityModal(null)}
                  className="btn-secondary py-2.5 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="btn-primary py-2.5 rounded-xl font-bold text-xs tracking-wide cursor-pointer shadow-md"
                >
                  Add to Bill
                </button>
              </div>
            </div>
          </div>
        </div>
      );
      })()}
    </div>
  );
}
