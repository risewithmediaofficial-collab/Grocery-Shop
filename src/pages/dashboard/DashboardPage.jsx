import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, ShoppingCart, Package, Users, DollarSign, AlertTriangle, Clock, ArrowRight, TrendingDown } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../../services/api';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtNum = (n) => Number(n || 0).toLocaleString('en-IN');

function KPICard({ label, value, sub, icon: Icon, color, trend }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(trend)}% vs yesterday
        </div>
      )}
    </div>
  );
}

function AlertCard({ type, count, label, to, color }) {
  if (!count) return null;
  return (
    <Link to={to} className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${color} transition-all hover:shadow-sm`}>
      <AlertTriangle size={16} />
      <span className="text-sm font-medium">{count} {label}</span>
      <ArrowRight size={14} className="ml-auto" />
    </Link>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/summary')
      .then(res => setData(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page-container">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array(8).fill(0).map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
      </div>
    </div>
  );

  const { kpi = {}, alerts = {}, charts = {}, recentSales = [], topProducts = [], lowStockProducts = [] } = data || {};

  return (
    <div className="page-container">
      {/* Page Header */}
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Today's Sales" value={fmt(kpi.todaySales)} sub={`${fmtNum(kpi.todaySalesCount)} bills`} icon={ShoppingCart} color="bg-primary-500" />
        <KPICard label="Today's Purchases" value={fmt(kpi.todayPurchases)} icon={Package} color="bg-blue-500" />
        <KPICard label="Today's Profit" value={fmt(kpi.todayProfit)} icon={TrendingUp} color={kpi.todayProfit >= 0 ? 'bg-green-500' : 'bg-red-500'} />
        <KPICard label="Stock Value" value={fmt(kpi.stockValue)} icon={DollarSign} color="bg-purple-500" />
        <KPICard label="Total Customers" value={fmtNum(kpi.totalCustomers)} icon={Users} color="bg-indigo-500" />
        <KPICard label="Total Products" value={fmtNum(kpi.totalProducts)} icon={Package} color="bg-teal-500" />
        <KPICard label="Customer Due" value={fmt(kpi.pendingCustomerPayments)} sub="Outstanding" icon={AlertTriangle} color="bg-orange-500" />
        <KPICard label="Low Stock Items" value={fmtNum(alerts.lowStock)} sub={`${alerts.outOfStock || 0} out of stock`} icon={Clock} color="bg-red-500" />
      </div>

      {/* Alerts */}
      {(alerts.lowStock > 0 || alerts.outOfStock > 0) && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">⚠️ Alerts</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <AlertCard type="low" count={alerts.lowStock} label="products low on stock" to="/inventory?filter=low" color="bg-yellow-50 border-yellow-200 text-yellow-700" />
            <AlertCard type="out" count={alerts.outOfStock} label="products out of stock" to="/inventory?filter=out" color="bg-red-50 border-red-200 text-red-700" />
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Sales & Purchases (Last 7 Days)</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={charts.last7Days || []}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend iconType="circle" iconSize={8} />
                <Area type="monotone" dataKey="sales" stroke="#16a34a" fill="url(#colorSales)" strokeWidth={2} name="Sales" />
                <Area type="monotone" dataKey="purchases" stroke="#3b82f6" fill="url(#colorPurchases)" strokeWidth={2} name="Purchases" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Top Selling Products</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={(topProducts || []).slice(0, 5).map(p => ({ name: p.name?.slice(0, 12) + (p.name?.length > 12 ? '..' : ''), qty: p.totalQty, revenue: p.totalRevenue }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v, name) => [name === 'revenue' ? fmt(v) : v, name === 'revenue' ? 'Revenue' : 'Qty']} />
                <Bar dataKey="qty" fill="#16a34a" radius={[4, 4, 0, 0]} name="Qty" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Sales */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Recent Sales</h3>
            <Link to="/sales" className="text-xs text-primary-600 hover:underline">View all</Link>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.length === 0 ? (
                  <tr><td colSpan={4} className="text-center text-gray-400 py-6">No sales yet</td></tr>
                ) : recentSales.map(s => (
                  <tr key={s._id}>
                    <td><Link to={`/sales/${s._id}`} className="text-primary-600 hover:underline font-medium">{s.invoiceNumber}</Link></td>
                    <td>{s.customerName || 'Walk-in'}</td>
                    <td className="font-semibold">{fmt(s.grandTotal)}</td>
                    <td><span className="badge-green capitalize">{s.paymentMethod}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Products */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Low Stock Alert</h3>
            <Link to="/inventory" className="text-xs text-primary-600 hover:underline">Manage stock</Link>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Current</th>
                  <th>Reorder</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.length === 0 ? (
                  <tr><td colSpan={4} className="text-center text-gray-400 py-6">All stock levels OK ✓</td></tr>
                ) : lowStockProducts.map(p => (
                  <tr key={p._id}>
                    <td className="font-medium">{p.name}</td>
                    <td className={p.currentStock === 0 ? 'text-red-600 font-semibold' : 'text-yellow-600 font-semibold'}>{p.currentStock}</td>
                    <td>{p.reorderLevel}</td>
                    <td>{p.currentStock === 0 ? <span className="badge-red">Out</span> : <span className="badge-yellow">Low</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
