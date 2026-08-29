import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, TrendingUp, DollarSign, Package, Calendar, Download, Printer, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import clsx from 'clsx';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('profit');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [profitData, setProfitData] = useState(null);
  const [salesReport, setSalesReport] = useState(null);
  const [inventoryReport, setInventoryReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      if (activeTab === 'profit') {
        const res = await api.get(`/reports/profit?${params}`);
        setProfitData(res.data.data);
      } else if (activeTab === 'sales') {
        const res = await api.get(`/reports/sales?${params}`);
        setSalesReport(res.data.data);
      } else if (activeTab === 'inventory') {
        const res = await api.get('/reports/inventory');
        setInventoryReport(res.data.data);
      }
    } catch {
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [activeTab, dateFrom, dateTo]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  return (
    <div className="page-container">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Reports & Financial Analytics</h1>
          <p className="page-subtitle">Real-time profit calculations, GST summaries, and inventory valuation</p>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="border-b border-gray-200 flex gap-6">
        {[
          { key: 'profit', label: '📊 Profit & Loss' },
          { key: 'sales', label: '🛒 Sales & GST Report' },
          { key: 'inventory', label: '📦 Inventory Valuation' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={clsx(
              'pb-3 text-sm font-bold border-b-2 transition-all',
              activeTab === t.key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Date Filter (for date-based reports) */}
      {activeTab !== 'inventory' && (
        <div className="card p-4 flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold text-gray-500 uppercase">Filter Period:</span>
          <input
            type="date"
            className="form-input text-xs w-40"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            className="form-input text-xs w-40"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
          />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-primary-600 hover:underline">
              Clear Dates
            </button>
          )}
        </div>
      )}

      {/* Tab: Profit & Loss */}
      {activeTab === 'profit' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase">Total Sales Revenue</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{fmt(profitData?.totalRevenue)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{profitData?.salesCount || 0} completed orders</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase">Cost of Goods Sold (COGS)</p>
              <p className="text-2xl font-black text-orange-600 mt-1">{fmt(profitData?.totalCOGS)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Purchased cost basis</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase">Gross Profit (Rev - COGS)</p>
              <p className="text-2xl font-black text-blue-600 mt-1">{fmt(profitData?.grossProfit)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Before store operational costs</p>
            </div>
            <div className="card p-5 bg-gradient-to-br from-green-600 to-green-700 text-white">
              <p className="text-xs font-semibold uppercase text-green-100">Net Profit (Gross - Expenses)</p>
              <p className="text-3xl font-black mt-1">{fmt(profitData?.netProfit)}</p>
              <p className="text-xs text-green-100 mt-0.5">Less {fmt(profitData?.totalExpenses)} shop expenses</p>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-bold text-base text-gray-900 mb-4">Financial Statement Summary</h3>
            <div className="space-y-3 max-w-xl text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-700 font-medium">1. Gross Revenue from Invoices</span>
                <span className="font-bold">{fmt(profitData?.totalRevenue)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 text-orange-700">
                <span>2. Less: Cost of Goods Sold (COGS)</span>
                <span className="font-bold">-{fmt(profitData?.totalCOGS)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200 font-bold text-gray-900 bg-gray-50 px-2 rounded">
                <span>3. Gross Operating Profit</span>
                <span className="text-blue-700 font-extrabold">{fmt(profitData?.grossProfit)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 text-red-600">
                <span>4. Less: Operating Expenses (Rent, EB, Salary, etc.)</span>
                <span className="font-bold">-{fmt(profitData?.totalExpenses)}</span>
              </div>
              <div className="flex justify-between py-3 border-t-2 border-gray-900 font-black text-lg bg-green-50 text-green-900 px-3 rounded-lg">
                <span>5. Net Final Business Profit</span>
                <span className="text-green-800">{fmt(profitData?.netProfit)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Sales Report */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(salesReport?.summary?.totalRevenue)}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase">Total GST Collected</p>
              <p className="text-2xl font-bold text-primary-700 mt-1">{fmt(salesReport?.summary?.totalTax)}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase">Total Discounts Given</p>
              <p className="text-2xl font-bold text-gray-700 mt-1">{fmt(salesReport?.summary?.totalDiscount)}</p>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="font-bold text-sm text-gray-900">Product-Wise Sales Breakdown</h3>
            </div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Total Qty Sold</th>
                    <th>Total Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {(salesReport?.productWise || []).map((p, idx) => (
                    <tr key={idx}>
                      <td className="font-semibold text-gray-900">{p.name}</td>
                      <td className="font-medium">{p.qty}</td>
                      <td className="font-bold text-primary-700">{fmt(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Inventory Valuation */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-5 bg-gradient-to-br from-purple-600 to-indigo-700 text-white">
              <p className="text-xs font-semibold uppercase text-purple-200">Total Store Inventory Valuation</p>
              <p className="text-3xl font-black mt-1">{fmt(inventoryReport?.stockValue)}</p>
              <p className="text-xs text-purple-200 mt-0.5">At purchase cost price</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase">Low Stock Alerts</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{inventoryReport?.lowStockCount || 0}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase">Out of Stock Items</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{inventoryReport?.outOfStockCount || 0}</p>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="font-bold text-sm text-gray-900">Inventory Valuation by Item</h3>
            </div>
            <div className="table-container">
              <table className="table text-xs">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Current Stock</th>
                    <th>Cost Price</th>
                    <th>Selling Price</th>
                    <th>Total Inventory Value</th>
                  </tr>
                </thead>
                <tbody>
                  {(inventoryReport?.products || []).map(p => (
                    <tr key={p._id}>
                      <td className="font-semibold text-gray-900">{p.name}</td>
                      <td className="text-gray-500">{p.category?.name || '-'}</td>
                      <td className="font-bold">{p.currentStock} {p.unit?.symbol}</td>
                      <td>{fmt(p.purchasePrice)}</td>
                      <td>{fmt(p.sellingPrice)}</td>
                      <td className="font-bold text-gray-900">{fmt(p.currentStock * p.purchasePrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
