import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, CreditCard, DollarSign, Calendar, Truck, Phone, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import clsx from 'clsx';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function SupplierDetailPage() {
  const { id } = useParams();
  const [supplier, setSupplier] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, lRes] = await Promise.all([
        api.get(`/suppliers/${id}`),
        api.get(`/suppliers/${id}/ledger`),
      ]);
      setSupplier(sRes.data.data);
      setLedger(lRes.data.data || []);
    } catch {
      toast.error('Failed to load supplier details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return toast.error('Enter valid payment amount');
    try {
      await api.post(`/suppliers/${id}/payment`, {
        amount: Number(amount),
        paymentMethod,
        reference,
        notes
      });
      toast.success('Payment to supplier recorded');
      setShowPaymentModal(false);
      setAmount('');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    }
  };

  if (loading || !supplier) {
    return (
      <div className="page-container">
        <div className="skeleton h-40 w-full rounded-xl mb-4" />
        <div className="skeleton h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/suppliers" className="btn-secondary btn-sm"><ArrowLeft size={16} /></Link>
          <div>
            <h1 className="page-title">{supplier.name}</h1>
            <p className="page-subtitle">{supplier.company || 'Supplier'} · ID: {supplier.supplierId}</p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => setShowPaymentModal(true)}>
          <CreditCard size={16} /> Record Payment to Supplier
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-xs font-bold text-gray-500 uppercase">Outstanding Balance (Payable)</p>
          <p className={clsx('text-2xl font-extrabold mt-1', supplier.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600')}>
            {fmt(supplier.outstandingBalance)}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-bold text-gray-500 uppercase">Contact & GSTIN</p>
          <p className="text-sm font-semibold text-gray-900 mt-1 flex items-center gap-1.5"><Phone size={13} className="text-gray-400" /> {supplier.mobile}</p>
          <p className="text-xs text-gray-500">{supplier.gstin ? `GST: ${supplier.gstin}` : 'No GST provided'}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-bold text-gray-500 uppercase">Location & Terms</p>
          <p className="text-sm font-semibold text-gray-900 mt-1">{supplier.city}, {supplier.state}</p>
          <p className="text-xs text-gray-500">Terms: {supplier.paymentTerms || 'Standard'}</p>
        </div>
      </div>

      {/* Ledger */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-bold text-sm text-gray-900">Supplier Ledger Statement</h3>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Reference #</th>
                <th>Amount</th>
                <th>Balance After</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">No transactions recorded yet</td></tr>
              ) : ledger.map(l => (
                <tr key={l._id}>
                  <td className="text-xs text-gray-600">{new Date(l.createdAt).toLocaleString('en-IN')}</td>
                  <td>
                    <span className={l.amount > 0 ? 'badge-blue' : 'badge-green'}>
                      {l.type}
                    </span>
                  </td>
                  <td className="text-sm font-medium">{l.description}</td>
                  <td className="text-xs text-gray-500 font-mono">{l.reference || '-'}</td>
                  <td className={clsx('font-bold', l.amount > 0 ? 'text-gray-900' : 'text-green-600')}>
                    {l.amount > 0 ? `+${fmt(l.amount)}` : fmt(l.amount)}
                  </td>
                  <td className="font-semibold text-gray-800">{fmt(l.balanceAfter)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowPaymentModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-gray-900">Pay Supplier: {supplier.name}</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
            </div>
            <form onSubmit={handleRecordPayment} className="p-4 space-y-3">
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex justify-between">
                <span>Current Outstanding Due:</span>
                <span className="font-bold">{fmt(supplier.outstandingBalance)}</span>
              </div>
              <div>
                <label className="form-label">Amount (₹) *</label>
                <input className="form-input font-bold text-lg" type="number" required autoFocus value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label className="form-label">Payment Method</label>
                <select className="form-select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                  <option value="bank_transfer">Bank Transfer / NEFT / IMPS</option>
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card / Cheque</option>
                </select>
              </div>
              <div>
                <label className="form-label">Reference / UTR #</label>
                <input className="form-input" placeholder="Bank ref / Cheque no" value={reference} onChange={e => setReference(e.target.value)} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
