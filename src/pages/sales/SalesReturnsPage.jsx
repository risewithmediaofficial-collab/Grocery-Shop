import React, { useState, useEffect } from 'react';
import { RotateCcw, Search, Plus, CheckCircle, Package, ArrowRight, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import clsx from 'clsx';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function SalesReturnsPage() {
  const [searchInvoice, setSearchInvoice] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [returnItems, setReturnItems] = useState({});
  const [returnReasons, setReturnReasons] = useState({});
  const [refundMethod, setRefundMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

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

  const calculateTotalRefund = () => {
    if (!selectedSale) return 0;
    return selectedSale.items.reduce((sum, item) => {
      const qty = returnItems[item.product] || 0;
      return sum + (item.sellingPrice * qty);
    }, 0);
  };

  const handleProcessReturn = async () => {
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

    setLoading(true);
    try {
      const res = await api.post('/invoices/return', {
        saleId: selectedSale._id,
        items: itemsToReturn,
        refundMethod,
        notes
      });
      toast.success(`Return processed! Receipt: ${res.data.data.returnNumber}`);
      setSelectedSale(null);
      setSearchInvoice('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process return');
    } finally {
      setLoading(false);
    }
  };

  const totalRefund = calculateTotalRefund();

  return (
    <div className="page-container">
      <div>
        <h1 className="page-title">Sales Returns</h1>
        <p className="page-subtitle">Return sold items, issue refunds, and automatically replenish inventory</p>
      </div>

      {/* Invoice Lookup Form */}
      <div className="card p-5 max-w-2xl">
        <h3 className="font-bold text-sm text-gray-900 mb-2">Find Original Invoice</h3>
        <form onSubmit={handleSearchInvoice} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="form-input pl-9 font-medium"
              placeholder="Enter Invoice Number (e.g. KS-000001)..."
              value={searchInvoice}
              onChange={e => setSearchInvoice(e.target.value)}
            />
          </div>
          <button type="submit" disabled={searching} className="btn-primary">
            {searching ? 'Finding...' : 'Find Invoice'}
          </button>
        </form>
      </div>

      {/* Selected Sale Return UI */}
      {selectedSale && (
        <div className="card p-6 max-w-4xl space-y-6">
          <div className="flex justify-between items-start border-b border-gray-100 pb-4">
            <div>
              <span className="badge-blue text-xs">{selectedSale.invoiceNumber}</span>
              <h2 className="text-lg font-bold text-gray-900 mt-1">Select Items to Return</h2>
              <p className="text-xs text-gray-500">Customer: {selectedSale.customerName || 'Walk-in'} · Date: {new Date(selectedSale.saleDate).toLocaleDateString('en-IN')}</p>
            </div>
            <button onClick={() => setSelectedSale(null)} className="btn-secondary btn-sm"><X size={14} /> Clear</button>
          </div>

          {/* Items selection */}
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Sold Qty</th>
                  <th>Rate</th>
                  <th className="w-32">Return Qty</th>
                  <th>Reason</th>
                  <th className="text-right">Refund Amount</th>
                </tr>
              </thead>
              <tbody>
                {selectedSale.items.map(item => {
                  const qty = returnItems[item.product] || 0;
                  return (
                    <tr key={item.product}>
                      <td>
                        <p className="font-semibold text-gray-900">{item.productName}</p>
                        <p className="text-xs text-gray-400">GST: {item.gstRate}%</p>
                      </td>
                      <td className="font-medium">{item.quantity} {item.unit}</td>
                      <td>{fmt(item.sellingPrice)}</td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          max={item.quantity}
                          className="form-input text-center font-bold"
                          value={qty}
                          onChange={e => handleQtyChange(item.product, item.quantity, e.target.value)}
                        />
                      </td>
                      <td>
                        <select
                          className="form-select text-xs"
                          value={returnReasons[item.product]}
                          onChange={e => setReturnReasons(prev => ({ ...prev, [item.product]: e.target.value }))}
                        >
                          <option value="customer_request">Customer Request</option>
                          <option value="damaged">Damaged / Defective</option>
                          <option value="expired">Expired</option>
                          <option value="wrong_product">Wrong Product</option>
                        </select>
                      </td>
                      <td className="text-right font-bold text-gray-900">
                        {fmt(item.sellingPrice * qty)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Refund summary and finalize */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div className="space-y-3">
              <div>
                <label className="form-label">Refund Method</label>
                <select className="form-select" value={refundMethod} onChange={e => setRefundMethod(e.target.value)}>
                  <option value="cash">Cash Refund</option>
                  <option value="upi">UPI Transfer</option>
                  <option value="credit">Customer Credit Balance</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="form-label">Return Notes</label>
                <input className="form-input" placeholder="Optional comments..." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl flex flex-col justify-between border border-gray-100">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Total Refund Amount</p>
                <p className="text-3xl font-extrabold text-primary-700 mt-1">{fmt(totalRefund)}</p>
                <p className="text-xs text-gray-500 mt-1">Inventory stock will automatically be increased upon confirmation.</p>
              </div>
              <button
                onClick={handleProcessReturn}
                disabled={loading || totalRefund <= 0}
                className="btn-primary w-full py-3 mt-4 text-base font-bold gap-2"
              >
                <CheckCircle size={18} /> Confirm & Process Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
