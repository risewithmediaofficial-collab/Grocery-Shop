import React, { useState, useEffect } from 'react';
import { Layers, Search, Filter, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import clsx from 'clsx';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function BatchesPage() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`/inventory/batches?${params}`);
      setBatches(res.data.data || []);
    } catch {
      toast.error('Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBatches(); }, [statusFilter]);

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Batch Tracking & FEFO</h1>
          <p className="page-subtitle">Batch numbers, manufacturing dates, expiry dates, and remaining batch quantities</p>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex gap-3">
          <select className="form-select w-48" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Batch Statuses</option>
            <option value="active">Active Batches</option>
            <option value="exhausted">Exhausted / Zero Stock</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Batch #</th>
                <th>Product</th>
                <th>Supplier</th>
                <th>Cost Price</th>
                <th>Initial Qty</th>
                <th>Remaining Qty</th>
                <th>Mfg Date</th>
                <th>Expiry Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(4).fill(0).map((_, i) => <tr key={i}><td colSpan={9}><div className="skeleton h-5 w-full" /></td></tr>)
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-gray-400">
                    <Layers size={32} className="mx-auto mb-2 opacity-40" />
                    No tracked batches found
                  </td>
                </tr>
              ) : batches.map(b => (
                <tr key={b._id}>
                  <td className="font-mono font-bold text-primary-700 text-xs">{b.batchNumber}</td>
                  <td>
                    <p className="font-semibold text-gray-900">{b.product?.name || 'Product'}</p>
                    <p className="text-[10px] text-gray-400">{b.product?.productId}</p>
                  </td>
                  <td className="text-xs text-gray-600">{b.supplier?.name || '-'}</td>
                  <td className="font-medium text-xs">{fmt(b.purchasePrice)}</td>
                  <td className="text-xs">{b.quantity}</td>
                  <td className="font-bold text-gray-900">{b.remainingQty}</td>
                  <td className="text-xs text-gray-500">
                    {b.manufacturingDate ? new Date(b.manufacturingDate).toLocaleDateString('en-IN') : '-'}
                  </td>
                  <td className="text-xs font-semibold text-gray-800">
                    {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString('en-IN') : '-'}
                  </td>
                  <td>
                    <span className={clsx(
                      b.status === 'active' && 'badge-green',
                      b.status === 'exhausted' && 'badge-gray',
                      b.status === 'expired' && 'badge-red'
                    )}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
