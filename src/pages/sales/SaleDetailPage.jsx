import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, RotateCcw, XCircle, ShoppingBag, CheckCircle, FileText, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function SaleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const cart = useCart();
  const { isAdmin } = useAuth();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [printMode, setPrintMode] = useState('a4'); // 'a4' or 'thermal'

  const loadSale = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/sales/${id}`);
      setSale(res.data.data);
    } catch {
      toast.error('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadSale(); }, [loadSale]);

  const handlePrint = (mode) => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleRepeatInvoice = () => {
    if (!sale) return;
    if (sale.customer) cart.setCustomer(sale.customer);
    cart.loadFromSale(sale.items);
    navigate('/pos');
    toast.success(`Items loaded from ${sale.invoiceNumber} into new draft cart`);
  };

  const handleVoidSale = async () => {
    const reason = window.prompt('Enter reason for voiding/cancelling this invoice:');
    if (!reason) return;
    try {
      await api.post(`/sales/${sale._id}/void`, { reason });
      toast.success('Invoice voided successfully');
      loadSale();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to void invoice');
    }
  };

  if (loading || !sale) {
    return (
      <div className="page-container">
        <div className="skeleton h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Top Actions (hidden on print) */}
      <div className="no-print flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/sales" className="btn-secondary btn-sm"><ArrowLeft size={16} /></Link>
          <div>
            <h1 className="page-title">{sale.invoiceNumber}</h1>
            <p className="page-subtitle">Created on {new Date(sale.saleDate).toLocaleString('en-IN')}</p>
          </div>
          <span className={clsx(
            'ml-2',
            sale.status === 'completed' && 'badge-green',
            sale.status === 'returned' && 'badge-orange',
            sale.status === 'cancelled' && 'badge-red'
          )}>
            {sale.status}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => handlePrint('a4')} className="btn-outline btn-sm gap-1">
            <Printer size={15} /> Print A4 Tax Invoice
          </button>
          <button onClick={() => handlePrint('thermal')} className="btn-outline btn-sm gap-1">
            <Printer size={15} /> Print Thermal Slip
          </button>
          <button onClick={handleRepeatInvoice} className="btn-primary btn-sm gap-1">
            <RotateCcw size={15} /> Repeat & Edit (POS)
          </button>
          {isAdmin() && sale.status === 'completed' && (
            <button onClick={handleVoidSale} className="btn-secondary text-red-600 btn-sm gap-1">
              <XCircle size={15} /> Void Sale
            </button>
          )}
        </div>
      </div>

      {/* Printable Invoice Container */}
      <div className={clsx(
        'card bg-white p-8 max-w-4xl mx-auto border border-gray-200 shadow-sm print:border-0 print:shadow-none print:p-2',
        printMode === 'thermal' && 'print:max-w-xs print:text-xs'
      )}>
        {/* Invoice Header */}
        <div className="border-b border-gray-200 pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Store size={24} className="text-primary-600" />
                <h2 className="text-2xl font-black tracking-tight text-gray-900">NEW COLUMBU STORES</h2>
              </div>
              <p className="text-xs text-gray-600">Main Road, Krishnagiri, Tamil Nadu - 635001</p>
              <p className="text-xs text-gray-600 font-medium">GSTIN: <span className="font-bold text-gray-900">33AABCK1234A1Z5</span> | State: Tamil Nadu (Code: 33)</p>
              <p className="text-xs text-gray-600">Phone: +91 98765 43200</p>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 bg-primary-50 text-primary-700 font-bold text-xs rounded-full border border-primary-200 uppercase tracking-wide">
                Tax Invoice
              </span>
              <p className="font-extrabold text-lg text-gray-900 mt-2">{sale.invoiceNumber}</p>
              <p className="text-xs text-gray-500">Date: {new Date(sale.saleDate).toLocaleDateString('en-IN')}</p>
              <p className="text-xs text-gray-500">Time: {new Date(sale.saleDate).toLocaleTimeString('en-IN')}</p>
            </div>
          </div>
        </div>

        {/* Customer & Billing Info */}
        <div className="grid grid-cols-2 gap-4 border-b border-gray-200 pb-4 mb-4 text-xs">
          <div>
            <p className="font-bold text-gray-500 uppercase tracking-wider mb-1">Billed To (Customer):</p>
            <p className="font-bold text-sm text-gray-900">{sale.customerName || 'Walk-in Customer'}</p>
            {sale.customerMobile && <p className="text-gray-600">Phone: {sale.customerMobile}</p>}
            {sale.customerId && <p className="text-gray-500">Customer ID: {sale.customerId}</p>}
            {sale.customer?.address && <p className="text-gray-600">{sale.customer.address}, {sale.customer.city}</p>}
            {sale.customer?.gstin && <p className="text-gray-800 font-semibold">GSTIN: {sale.customer.gstin}</p>}
          </div>
          <div className="text-right">
            <p className="font-bold text-gray-500 uppercase tracking-wider mb-1">Payment Information:</p>
            <p className="font-bold text-sm capitalize text-gray-900">{sale.paymentMethod} {sale.isCredit && '(Credit Sale)'}</p>
            <p className="text-gray-600">Amount Paid: <span className="font-semibold text-gray-900">{fmt(sale.amountPaid)}</span></p>
            {sale.amountDue > 0 && <p className="text-red-600 font-bold">Balance Due: {fmt(sale.amountDue)}</p>}
            {sale.changeReturned > 0 && <p className="text-green-600 font-medium">Change Returned: {fmt(sale.changeReturned)}</p>}
            {sale.createdBy && <p className="text-gray-400 mt-1">Billed by: {sale.createdBy.name}</p>}
          </div>
        </div>

        {/* Line Items Table with GST Breakdown */}
        <div className="table-container mb-6">
          <table className="table text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="py-2">#</th>
                <th>Item Description</th>
                <th>HSN</th>
                <th className="text-center">Qty</th>
                <th className="text-right">Rate</th>
                <th className="text-right">Taxable</th>
                <th className="text-center">GST %</th>
                <th className="text-right">CGST</th>
                <th className="text-right">SGST</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td>{idx + 1}</td>
                  <td>
                    <p className="font-semibold text-gray-900">{item.productName}</p>
                    {item.sku && <p className="text-[10px] text-gray-400">{item.sku}</p>}
                  </td>
                  <td className="text-gray-500 font-mono">{item.hsnCode || '-'}</td>
                  <td className="text-center font-bold">{item.quantity} {item.unit}</td>
                  <td className="text-right font-medium">{fmt(item.sellingPrice)}</td>
                  <td className="text-right">{fmt(item.taxableAmount)}</td>
                  <td className="text-center font-semibold text-primary-700">{item.gstRate}%</td>
                  <td className="text-right text-gray-600">{fmt(item.cgst)}</td>
                  <td className="text-right text-gray-600">{fmt(item.sgst)}</td>
                  <td className="text-right font-bold text-gray-900">{fmt(item.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Invoice Summary */}
        <div className="flex justify-between items-start pt-2 border-t border-gray-200 text-xs">
          <div className="max-w-xs space-y-1 text-gray-500">
            <p className="font-semibold text-gray-700">Terms & Conditions:</p>
            <p>1. Goods once sold will not be exchanged or returned without receipt.</p>
            <p>2. Subject to Krishnagiri jurisdiction only.</p>
            <p className="pt-2 text-primary-800 font-semibold italic">Thank you for shopping at New Columbu Stores!</p>
          </div>

          <div className="w-64 space-y-1.5 text-right">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span className="font-medium">{fmt(sale.subtotal)}</span>
            </div>
            {sale.totalDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount:</span>
                <span>-{fmt(sale.totalDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Total Taxable Amount:</span>
              <span className="font-medium">{fmt(sale.totalTaxableAmount)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Total CGST:</span>
              <span>{fmt(sale.totalCGST)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Total SGST:</span>
              <span>{fmt(sale.totalSGST)}</span>
            </div>
            {sale.totalIGST > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Total IGST:</span>
                <span>{fmt(sale.totalIGST)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-500">
              <span>Round Off:</span>
              <span>{fmt(sale.roundOff)}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-gray-900 pt-2 border-t border-gray-300">
              <span>GRAND TOTAL:</span>
              <span className="text-primary-700 text-xl">{fmt(sale.grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
