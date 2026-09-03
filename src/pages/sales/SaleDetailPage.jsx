import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, RotateCcw, XCircle, ShoppingBag, CheckCircle, FileText, Store, Tag } from 'lucide-react';
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

  const totalMRP = (sale.items || []).reduce((sum, it) => sum + ((it.mrp || it.sellingPrice || 0) * (it.quantity || 1)), 0);
  const mrpSavings = Math.max(0, totalMRP - (sale.subtotal || 0));
  const billDiscount = Number(sale.totalDiscount || 0);
  const totalSaved = mrpSavings + billDiscount;
  const totalOriginalVal = totalMRP + (sale.totalTax || 0);
  const savingsPct = totalOriginalVal > 0 && totalSaved > 0
    ? ((totalSaved / totalOriginalVal) * 100).toFixed(1)
    : '0';
  const discountPct = (sale.subtotal && sale.subtotal > 0 && billDiscount > 0)
    ? ((billDiscount / sale.subtotal) * 100).toFixed(1)
    : '0';
  const totalQuantity = (sale.items || []).reduce((sum, it) => sum + (it.quantity || 0), 0);

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

        {/* View / Print Mode Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
            <button
              onClick={() => setPrintMode('a4')}
              className={clsx('px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer', printMode === 'a4' ? 'bg-white text-primary-700 shadow-2xs' : 'text-gray-600 hover:text-gray-900')}
            >
              A4 Invoice
            </button>
            <button
              onClick={() => setPrintMode('thermal')}
              className={clsx('px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer', printMode === 'thermal' ? 'bg-white text-primary-700 shadow-2xs' : 'text-gray-600 hover:text-gray-900')}
            >
              Thermal Slip
            </button>
          </div>

          <button onClick={() => handlePrint('a4')} className="btn-outline btn-sm gap-1 cursor-pointer">
            <Printer size={15} /> Print A4 Tax Invoice
          </button>
          <button onClick={() => handlePrint('thermal')} className="btn-outline btn-sm gap-1 cursor-pointer">
            <Printer size={15} /> Print Thermal Slip
          </button>
          <button onClick={handleRepeatInvoice} className="btn-primary btn-sm gap-1 cursor-pointer">
            <RotateCcw size={15} /> Repeat & Edit (POS)
          </button>
          {isAdmin() && sale.status === 'completed' && (
            <button onClick={handleVoidSale} className="btn-secondary text-red-600 btn-sm gap-1 cursor-pointer">
              <XCircle size={15} /> Void Sale
            </button>
          )}
        </div>
      </div>

      {/* Mode 1: THERMAL SLIP VIEW */}
      {printMode === 'thermal' ? (
        <div className="card bg-white p-6 max-w-sm mx-auto border border-dashed border-gray-300 shadow-sm font-mono text-xs text-gray-900 print:border-none print:p-1 print:max-w-xs">
          <div className="text-center space-y-0.5 border-b border-dashed border-gray-400 pb-3 mb-3">
            <h2 className="font-extrabold text-base tracking-tight">NEW COLUMBU STORES</h2>
            <p className="text-[11px] text-gray-600">Main Road, Krishnagiri - 635001</p>
            <p className="text-[11px] text-gray-600">GSTIN: 33AABCK1234A1Z5 | Ph: +91 98765 43200</p>
          </div>

          <div className="space-y-1 border-b border-dashed border-gray-400 pb-2 mb-2 text-[11px]">
            <div className="flex justify-between">
              <span>Receipt #: <strong>{sale.invoiceNumber}</strong></span>
              <span>{new Date(sale.saleDate).toLocaleDateString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span>Time: {new Date(sale.saleDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              <span>Cashier: {sale.createdBy?.name || 'Staff'}</span>
            </div>
            <div className="pt-0.5">
              <span>Customer: <strong>{sale.customerName || 'Walk-in'}</strong> {sale.customerMobile ? `(${sale.customerMobile})` : ''}</span>
            </div>
          </div>

          {/* Line items for Thermal */}
          <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
            <div className="flex justify-between font-bold text-[11px] border-b border-gray-200 pb-1 mb-1.5">
              <span>ITEM & CALCULATION</span>
              <span>TOTAL</span>
            </div>

            <div className="space-y-2">
              {sale.items.map((item, idx) => (
                <div key={idx} className="text-[11px] pb-1 border-b border-gray-100 last:border-b-0">
                  <div className="flex justify-between items-baseline font-bold text-gray-900">
                    <span className="truncate pr-1">{item.productName}</span>
                    <span>{fmt(item.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-gray-600 mt-0.5">
                    <span className="font-semibold text-primary-800">
                      {item.unit ? `₹${item.sellingPrice} / ${item.unit} • ` : ''}{item.quantity} {item.unit || ''} × {fmt(item.sellingPrice)} = {fmt(item.sellingPrice * item.quantity)}
                    </span>
                    {item.mrp > item.sellingPrice && (
                      <span className="text-emerald-700 font-bold ml-1">Save {fmt((item.mrp - item.sellingPrice) * item.quantity)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Thermal Totals */}
          <div className="space-y-1 text-[11px] border-b border-dashed border-gray-400 pb-2 mb-2">
            <div className="flex justify-between text-gray-600">
              <span>Total Items: {sale.items.length} (Qty: {totalQuantity})</span>
              <span>Subtotal: {fmt(sale.subtotal)}</span>
            </div>
            {sale.totalDiscount > 0 && (
              <div className="flex justify-between font-bold text-emerald-700">
                <span>Discount ({discountPct}% reduce):</span>
                <span>-{fmt(sale.totalDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>GST Tax (CGST+SGST):</span>
              <span>{fmt(sale.totalTax)}</span>
            </div>
            {sale.roundOff !== 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Round Off:</span>
                <span>{fmt(sale.roundOff)}</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-sm pt-1 border-t border-gray-300">
              <span>GRAND TOTAL:</span>
              <span>{fmt(sale.grandTotal)}</span>
            </div>
          </div>

          {/* Payment info */}
          <div className="text-[11px] border-b border-dashed border-gray-400 pb-2 mb-2 space-y-0.5">
            <div className="flex justify-between">
              <span>Payment Mode:</span>
              <span className="font-bold uppercase">{sale.paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount Paid:</span>
              <span>{fmt(sale.amountPaid)}</span>
            </div>
            {sale.changeReturned > 0 && (
              <div className="flex justify-between">
                <span>Change Returned:</span>
                <span>{fmt(sale.changeReturned)}</span>
              </div>
            )}
            {sale.amountDue > 0 && (
              <div className="flex justify-between font-bold text-red-600">
                <span>Balance Due:</span>
                <span>{fmt(sale.amountDue)}</span>
              </div>
            )}
          </div>

          {/* Savings Summary on Thermal */}
          {totalSaved > 0 && (
            <div className="my-3 p-2 border border-emerald-600 text-center text-emerald-800 font-bold bg-emerald-50 rounded">
              <p className="text-xs">TOTAL SAVINGS: {fmt(totalSaved)} ({savingsPct}%)</p>
              <p className="text-[9px] font-normal text-emerald-700 mt-0.5">Thank you for saving with us</p>
            </div>
          )}

          <div className="text-center text-[10px] text-gray-500 pt-1 space-y-0.5">
            <p>Thank you for shopping at New Columbu Stores!</p>
            <p>Please visit again</p>
          </div>
        </div>
      ) : (
        /* Mode 2: A4 FULL TAX INVOICE CONTAINER */
        <div className="card bg-white p-8 max-w-4xl mx-auto border border-gray-200 shadow-sm print:border-0 print:shadow-none print:p-2">
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

          {/* Line Items Table with GST, MRP & Rate Breakdown */}
          <div className="table-container mb-6">
            <table className="table text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="py-2">#</th>
                  <th>Product Name & Description</th>
                  <th>HSN</th>
                  <th className="text-center">Qty</th>
                  <th className="text-right">MRP</th>
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
                      <p className="font-bold text-gray-900 text-sm">{item.productName}</p>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium mt-0.5">
                        <span>{item.unit ? `₹${item.sellingPrice} / ${item.unit}` : `₹${item.sellingPrice}`}</span>
                        <span>•</span>
                        <span className="text-primary-700 font-bold">
                          {item.quantity} {item.unit || ''} × {fmt(item.sellingPrice)} = {fmt(item.sellingPrice * item.quantity)}
                        </span>
                        {item.mrp > item.sellingPrice && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-700 font-bold">
                              Save {fmt((item.mrp - item.sellingPrice) * item.quantity)}
                            </span>
                          </>
                        )}
                      </div>
                      {item.sku && <p className="text-[10px] text-gray-400 font-mono mt-0.5">{item.sku}</p>}
                    </td>
                    <td className="text-gray-500 font-mono">{item.hsnCode || '-'}</td>
                    <td className="text-center font-extrabold text-gray-900">
                      {item.quantity} {item.unit || ''}
                    </td>
                    <td className="text-right text-gray-400">
                      {item.mrp > 0 ? (
                        <span className="line-through">{fmt(item.mrp)}</span>
                      ) : '-'}
                    </td>
                    <td className="text-right font-bold text-gray-900">{fmt(item.sellingPrice)}</td>
                    <td className="text-right">{fmt(item.taxableAmount)}</td>
                    <td className="text-center font-semibold text-primary-700">{item.gstRate}%</td>
                    <td className="text-right text-gray-600">{fmt(item.cgst)}</td>
                    <td className="text-right text-gray-600">{fmt(item.sgst)}</td>
                    <td className="text-right font-black text-gray-900">{fmt(item.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Customer Savings Summary on A4 */}
          {totalSaved > 0 && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-950 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Tag size={20} />
                </div>
                <div>
                  <p className="font-extrabold text-sm uppercase tracking-wider text-emerald-800">Total Customer Savings</p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    You saved <strong>{fmt(totalSaved)} ({savingsPct}%)</strong> on this purchase!
                  </p>
                </div>
              </div>
              <div className="text-right bg-emerald-100/90 px-4 py-2 rounded-xl border border-emerald-300">
                <p className="text-[10px] uppercase font-bold text-emerald-700">Total Savings</p>
                <p className="text-lg font-black text-emerald-900">{fmt(totalSaved)}</p>
              </div>
            </div>
          )}

          {/* Invoice Summary */}
          <div className="flex justify-between items-start pt-2 border-t border-gray-200 text-xs">
            <div className="max-w-xs space-y-1 text-gray-500">
              <p className="font-semibold text-gray-700">Terms & Conditions:</p>
              <p>1. Goods once sold will not be exchanged or returned without receipt.</p>
              <p>2. Subject to Krishnagiri jurisdiction only.</p>
              <p className="pt-2 text-primary-800 font-semibold italic">Thank you for shopping at New Columbu Stores!</p>
            </div>

            <div className="w-72 space-y-1.5 text-right">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({sale.items.length} items · {totalQuantity} qty):</span>
                <span className="font-medium">{fmt(sale.subtotal)}</span>
              </div>
              {sale.totalDiscount > 0 && (
                <div className="flex justify-between font-bold text-emerald-700">
                  <span>Discount ({discountPct}% reduce):</span>
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
                <span className="text-primary-700 text-2xl">{fmt(sale.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
