import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, MapPin, DollarSign, ShoppingBag, Receipt, RotateCcw, CreditCard, Clock, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useCart } from '../../context/CartContext';
import clsx from 'clsx';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const cart = useCart();
  const [customer, setCustomer] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [frequentProducts, setFrequentProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('purchases');
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [custRes, purchRes, ledgerRes, freqRes] = await Promise.all([
        api.get(`/customers/${id}`),
        api.get(`/customers/${id}/purchases`),
        api.get(`/customers/${id}/ledger`),
        api.get(`/customers/${id}/frequent-products`),
      ]);
      setCustomer(custRes.data.data);
      setPurchases(purchRes.data.data || []);
      setLedger(ledgerRes.data.data || []);
      setFrequentProducts(freqRes.data.data || []);
    } catch {
      toast.error('Failed to load customer profile');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRepeatInvoice = (sale) => {
    cart.setCustomer(customer);
    cart.loadFromSale(sale.items);
    navigate('/pos');
    toast.success(`Loaded items from invoice ${sale.invoiceNumber} into new draft cart`);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paymentAmount || Number(paymentAmount) <= 0) return toast.error('Enter valid amount');
    try {
      await api.post(`/customers/${id}/payment`, {
        amount: Number(paymentAmount),
        paymentMethod,
      });
      toast.success('Payment recorded successfully');
      setShowPaymentModal(false);
      setPaymentAmount('');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    }
  };

  if (loading || !customer) {
    return (
      <div className="page-container">
        <div className="skeleton h-40 w-full rounded-xl mb-4" />
        <div className="skeleton h-64 w-full rounded-xl" />
      </div>
    );
  }

  const avgBill = customer.totalBills > 0 ? (customer.totalPurchases / customer.totalBills) : 0;

  return (
    <div className="page-container">
      <div className="flex items-center gap-3">
        <Link to="/customers" className="btn-secondary btn-sm"><ArrowLeft size={16} /></Link>
        <div>
          <h1 className="page-title">{customer.name}</h1>
          <p className="page-subtitle">Customer ID: {customer.customerId} · 📱 {customer.mobile}</p>
        </div>
        <div className="ml-auto flex gap-2">
          {customer.outstandingBalance > 0 && (
            <button className="btn-secondary text-green-700" onClick={() => setShowPaymentModal(true)}>
              <CreditCard size={15} /> Record Payment
            </button>
          )}
          <button className="btn-primary" onClick={() => { cart.setCustomer(customer); navigate('/pos'); }}>
            <ShoppingBag size={15} /> New Bill
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="card p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase">Total Purchases</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{fmt(customer.totalPurchases)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{customer.totalBills} bills</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase">Outstanding (Udhaar)</p>
          <p className={clsx('text-xl font-bold mt-1', customer.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600')}>
            {fmt(customer.outstandingBalance)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Limit: {fmt(customer.creditLimit)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase">Average Bill</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{fmt(avgBill)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase">Customer Type</p>
          <p className="text-xl font-bold text-gray-900 mt-1 capitalize">{customer.customerType}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase">Location</p>
          <p className="text-sm font-semibold text-gray-900 mt-1 truncate">{customer.city}, {customer.state}</p>
          <p className="text-xs text-gray-400 truncate">{customer.address || 'No address'}</p>
        </div>
      </div>

      {/* Frequently Purchased Section */}
      {frequentProducts.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <ShoppingBag size={16} className="text-primary-600" /> Frequently Purchased Products
            </h3>
            <span className="text-xs text-gray-500">Auto-analyzed from transaction history</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {frequentProducts.map((p, idx) => (
              <div key={idx} className="p-3 bg-gray-50 border border-gray-100 rounded-lg flex flex-col justify-between">
                <div>
                  <p className="font-semibold text-xs text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Bought {p.count} times ({p.totalQty} total)</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 flex gap-4">
        <button
          onClick={() => setActiveTab('purchases')}
          className={clsx('pb-2 text-sm font-semibold border-b-2 transition-all', activeTab === 'purchases' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700')}
        >
          Purchase Invoices ({purchases.length})
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={clsx('pb-2 text-sm font-semibold border-b-2 transition-all', activeTab === 'ledger' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700')}
        >
          Udhaar & Ledger History ({ledger.length})
        </button>
      </div>

      {/* Tab Content: Purchases */}
      {activeTab === 'purchases' && (
        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice Number</th>
                  <th>Date</th>
                  <th>Items Count</th>
                  <th>Grand Total</th>
                  <th>Payment Mode</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchases.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-400">No purchase history found</td></tr>
                ) : purchases.map(sale => (
                  <tr key={sale._id}>
                    <td>
                      <Link to={`/sales/${sale._id}`} className="font-semibold text-primary-600 hover:underline">
                        {sale.invoiceNumber}
                      </Link>
                    </td>
                    <td className="text-xs text-gray-600">{new Date(sale.saleDate).toLocaleString('en-IN')}</td>
                    <td className="text-sm">{sale.items?.length || 0} items</td>
                    <td className="font-bold text-gray-900">{fmt(sale.grandTotal)}</td>
                    <td><span className="badge-green capitalize">{sale.paymentMethod}</span></td>
                    <td><span className="badge-blue capitalize">{sale.status}</span></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRepeatInvoice(sale)}
                          className="btn-outline btn-sm text-xs gap-1 text-primary-700 hover:bg-primary-50"
                          title="Create new draft cart with these items"
                        >
                          <RotateCcw size={12} /> Repeat & Edit
                        </button>
                        <Link to={`/sales/${sale._id}`} className="btn-secondary btn-sm text-xs">
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Ledger */}
      {activeTab === 'ledger' && (
        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Reference</th>
                  <th>Amount</th>
                  <th>Balance After</th>
                </tr>
              </thead>
              <tbody>
                {ledger.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">No ledger transactions</td></tr>
                ) : ledger.map(l => (
                  <tr key={l._id}>
                    <td className="text-xs text-gray-600">{new Date(l.createdAt).toLocaleString('en-IN')}</td>
                    <td>
                      <span className={l.amount > 0 ? 'badge-red' : 'badge-green'}>
                        {l.type}
                      </span>
                    </td>
                    <td className="text-sm font-medium">{l.description}</td>
                    <td className="text-xs text-gray-500">{l.reference || '-'}</td>
                    <td className={clsx('font-bold', l.amount > 0 ? 'text-red-600' : 'text-green-600')}>
                      {l.amount > 0 ? `+${fmt(l.amount)}` : fmt(l.amount)}
                    </td>
                    <td className="font-semibold text-gray-800">{fmt(l.balanceAfter)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowPaymentModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-gray-900">Record Payment for {customer.name}</h3>
              <button onClick={() => setShowPaymentModal(false)}>✕</button>
            </div>
            <form onSubmit={handleRecordPayment} className="p-4 space-y-3">
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex justify-between">
                <span>Due Balance:</span>
                <span className="font-bold">{fmt(customer.outstandingBalance)}</span>
              </div>
              <div>
                <label className="form-label">Amount (₹) *</label>
                <input className="form-input text-lg font-bold" type="number" required autoFocus value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label className="form-label">Payment Method</label>
                <select className="form-select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI / GPay / PhonePe</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Save Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
