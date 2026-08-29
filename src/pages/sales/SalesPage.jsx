import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Receipt, Eye, RotateCcw, Calendar, DollarSign, ArrowUpRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import clsx from 'clsx';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function SalesPage() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 25 });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const res = await api.get(`/sales?${params}`);
      setSales(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch {
      toast.error('Failed to load sales');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, dateFrom, dateTo, page]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Sales & Invoices</h1>
          <p className="page-subtitle">{total} invoices recorded · Immutable GST snapshots preserved</p>
        </div>
        <Link to="/pos" className="btn-primary">
          <Plus size={16} /> New Sale (POS)
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative col-span-1 sm:col-span-2">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="form-input pl-9"
              placeholder="Search Invoice # or Customer Name..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div>
            <select className="form-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="returned">Returned</option>
              <option value="cancelled">Cancelled / Void</option>
            </select>
          </div>
          <div>
            <input
              type="date"
              className="form-input text-xs"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              placeholder="From Date"
            />
          </div>
          <div>
            <input
              type="date"
              className="form-input text-xs"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1); }}
              placeholder="To Date"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date & Time</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Tax (GST)</th>
                <th>Grand Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(6).fill(0).map((_, i) => <tr key={i}><td colSpan={9}><div className="skeleton h-5 w-full" /></td></tr>)
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-gray-400">
                    <Receipt size={32} className="mx-auto mb-2 opacity-40" />
                    No sales found
                  </td>
                </tr>
              ) : sales.map(s => (
                <tr key={s._id}>
                  <td>
                    <Link to={`/sales/${s._id}`} className="font-bold text-primary-600 hover:underline">
                      {s.invoiceNumber}
                    </Link>
                  </td>
                  <td className="text-xs text-gray-500">
                    {new Date(s.saleDate).toLocaleDateString('en-IN')}{' '}
                    <span className="text-gray-400">{new Date(s.saleDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </td>
                  <td>
                    <p className="font-semibold text-gray-900 text-sm">{s.customerName || 'Walk-in'}</p>
                    {s.customerMobile && <p className="text-xs text-gray-400">📱 {s.customerMobile}</p>}
                  </td>
                  <td className="text-sm font-medium">{s.items?.length || 0} items</td>
                  <td className="text-xs text-gray-600">{fmt(s.totalTax)}</td>
                  <td className="font-bold text-base text-gray-900">{fmt(s.grandTotal)}</td>
                  <td>
                    <span className="badge-green capitalize">{s.paymentMethod}</span>
                    {s.isCredit && <span className="badge-red ml-1">Credit</span>}
                  </td>
                  <td>
                    <span className={clsx(
                      s.status === 'completed' && 'badge-green',
                      s.status === 'returned' && 'badge-orange',
                      s.status === 'cancelled' && 'badge-red'
                    )}>
                      {s.status}
                    </span>
                  </td>
                  <td>
                    <Link to={`/sales/${s._id}`} className="btn-secondary btn-sm text-xs gap-1">
                      <Eye size={13} /> View Invoice
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {total > 25 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">Showing {Math.min((page-1)*25+1, total)}–{Math.min(page*25, total)} of {total}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="btn-secondary btn-sm">Previous</button>
              <button onClick={() => setPage(p => p+1)} disabled={page*25 >= total} className="btn-secondary btn-sm">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
