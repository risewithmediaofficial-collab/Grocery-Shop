import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, AlertCircle, CheckCircle, Package, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import clsx from 'clsx';

export default function ExpiryPage() {
  const [data, setData] = useState({ expired: [], within7: [], within30: [], within60: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('within7');

  const fetchExpiryData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/inventory/expiry-summary');
      setData(res.data.data || { expired: [], within7: [], within30: [], within60: [] });
    } catch {
      toast.error('Failed to load expiry report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExpiryData(); }, []);

  const currentList = data[activeTab] || [];

  return (
    <div className="page-container">
      <div>
        <h1 className="page-title">Product Expiry Dashboard</h1>
        <p className="page-subtitle">Monitor near-expiry goods, prevent expired sales, and ensure food safety</p>
      </div>

      {/* Expiry Bucket Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveTab('expired')}
          className={clsx('card p-4 text-left transition-all border-2', activeTab === 'expired' ? 'border-red-500 bg-red-50/40' : 'hover:border-gray-300')}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-600 uppercase">Already Expired</span>
            <ShieldAlert size={18} className="text-red-500" />
          </div>
          <p className="text-2xl font-black text-red-600 mt-2">{data.expired?.length || 0}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Remove from sellable stock</p>
        </button>

        <button
          onClick={() => setActiveTab('within7')}
          className={clsx('card p-4 text-left transition-all border-2', activeTab === 'within7' ? 'border-orange-500 bg-orange-50/40' : 'hover:border-gray-300')}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-600 uppercase">Within 7 Days</span>
            <AlertTriangle size={18} className="text-orange-500" />
          </div>
          <p className="text-2xl font-black text-orange-600 mt-2">{data.within7?.length || 0}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Urgent clearance / discount</p>
        </button>

        <button
          onClick={() => setActiveTab('within30')}
          className={clsx('card p-4 text-left transition-all border-2', activeTab === 'within30' ? 'border-yellow-500 bg-yellow-50/40' : 'hover:border-gray-300')}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-yellow-600 uppercase">Within 30 Days</span>
            <Clock size={18} className="text-yellow-500" />
          </div>
          <p className="text-2xl font-black text-yellow-600 mt-2">{data.within30?.length || 0}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Priority shelf placement</p>
        </button>

        <button
          onClick={() => setActiveTab('within60')}
          className={clsx('card p-4 text-left transition-all border-2', activeTab === 'within60' ? 'border-blue-500 bg-blue-50/40' : 'hover:border-gray-300')}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-600 uppercase">Within 60 Days</span>
            <CheckCircle size={18} className="text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-600 mt-2">{data.within60?.length || 0}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Safe rotation period</p>
        </button>
      </div>

      {/* Expiry Items List */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
            {activeTab === 'expired' && <><AlertCircle size={16} className="text-red-600" /><span>Expired Products</span></>}
            {activeTab === 'within7' && <><AlertTriangle size={16} className="text-amber-600" /><span>Products Expiring in Next 7 Days</span></>}
            {activeTab === 'within30' && <><Clock size={16} className="text-orange-600" /><span>Products Expiring in Next 30 Days</span></>}
            {activeTab === 'within60' && <><Clock size={16} className="text-blue-600" /><span>Products Expiring in Next 60 Days</span></>}
          </h3>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Batch Number</th>
                <th>Remaining Qty</th>
                <th>Expiry Date</th>
                <th>Days Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(4).fill(0).map((_, i) => <tr key={i}><td colSpan={5}><div className="skeleton h-5 w-full" /></td></tr>)
              ) : currentList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-400">
                    <CheckCircle size={32} className="mx-auto mb-2 opacity-40 text-green-500" />
                    No products in this expiry category!
                  </td>
                </tr>
              ) : currentList.map(item => {
                const exp = new Date(item.expiryDate);
                const diffDays = Math.ceil((exp - new Date()) / (1000 * 60 * 60 * 24));
                return (
                  <tr key={item._id}>
                    <td>
                      <p className="font-semibold text-gray-900">{item.product?.name || 'Product'}</p>
                      <p className="text-xs text-gray-400">{item.product?.productId}</p>
                    </td>
                    <td className="font-mono text-xs font-bold text-gray-700">{item.batchNumber}</td>
                    <td className="font-extrabold text-sm text-gray-900">{item.remainingQty}</td>
                    <td className="font-semibold text-xs text-gray-800">{exp.toLocaleDateString('en-IN')}</td>
                    <td>
                      {diffDays < 0 ? (
                        <span className="badge-red font-bold">Expired {Math.abs(diffDays)} days ago</span>
                      ) : diffDays <= 7 ? (
                        <span className="badge-orange font-bold">Expires in {diffDays} days</span>
                      ) : (
                        <span className="badge-yellow">In {diffDays} days</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
