import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingDown,
  CheckCircle,
  Bell,
  Activity,
  UserCheck,
  CreditCard,
  Send,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';

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
        <div className={`p-2.5 rounded-xl ${color}`}>
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
    <Link to={to} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${color} transition-all hover:shadow-sm`}>
      <AlertTriangle size={16} />
      <span className="text-sm font-medium">{count} {label}</span>
      <ArrowRight size={14} className="ml-auto" />
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCashierFilter, setSelectedCashierFilter] = useState('all');
  const [processingOrderId, setProcessingOrderId] = useState(null);

  const fetchDashboardData = useCallback((showSpinner = false) => {
    if (showSpinner) setLoading(true);
    return api.get('/dashboard/summary')
      .then(res => setData(res.data.data))
      .catch(console.error)
      .finally(() => {
        if (showSpinner) setLoading(false);
      });
  }, []);

  // Initial load
  useEffect(() => {
    fetchDashboardData(true);
  }, [fetchDashboardData]);

  // Real-time polling every 12 seconds so new incoming orders appear on the dashboard automatically
  useEffect(() => {
    const timer = setInterval(() => {
      fetchDashboardData(false);
    }, 12000);
    return () => clearInterval(timer);
  }, [fetchDashboardData]);

  // 1-Click Send Incoming Order to Billing POS
  const handleSendOrderToBilling = async (order) => {
    setProcessingOrderId(order._id);
    try {
      await api.post(`/orders/${order._id}/send-to-billing`);
      if (cart) {
        cart.clearCart();
        order.items?.forEach(item => {
          cart.addItem({
            _id: item.product?._id || item.product,
            productId: item.product?._id || item.product,
            name: item.productName || 'Item',
            sellingPrice: item.price || 0,
            unit: item.unit ? { symbol: item.unit } : undefined,
          }, item.quantity || 1);
        });
      }
      toast.success(`Order #${order.orderNumber} sent to POS Billing!`);
      navigate('/pos');
    } catch (err) {
      toast.error('Failed to load order to POS');
    } finally {
      setProcessingOrderId(null);
    }
  };

  if (loading) return (
    <div className="page-container">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array(8).fill(0).map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
      </div>
    </div>
  );

  const isCashier = data?.isCashier || user?.role === 'cashier';
  const {
    kpi = {},
    alerts = {},
    charts = {},
    recentSales = [],
    topProducts = [],
    lowStockProducts = [],
    cashierSummaries = [],
    cashierActivities = [],
    cashierLogs = [],
    incomingOrders = [],
    pendingOrdersCount = 0,
    activeOrdersCount = 0,
    cashierName = user?.name || 'Cashier',
  } = data || {};

  // Filtered cashier activities for admin
  const filteredActivities = selectedCashierFilter === 'all'
    ? cashierActivities
    : cashierActivities.filter(a => (a.user?._id || a.user) === selectedCashierFilter || a.userName === selectedCashierFilter);

  return (
    <div className="page-container space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title">{isCashier ? `Cashier Terminal Dashboard` : `Store Overview Dashboard`}</h1>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${isCashier ? 'bg-amber-100 text-amber-800' : 'bg-primary-100 text-primary-800'}`}>
              {isCashier ? 'Counter View' : 'Admin View'}
            </span>
          </div>
          <p className="page-subtitle mt-0.5">
            {isCashier
              ? `Logged in as ${cashierName} • Showing your personal counter sales and collections today.`
              : `${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • Overall store operations & staff breakdown`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchDashboardData(true)}
            className="btn-secondary btn-sm flex items-center gap-1.5 cursor-pointer"
            title="Refresh dashboard data"
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
          <Link
            to="/pos"
            className="btn-primary btn-sm flex items-center gap-1.5 font-bold shadow-xs"
          >
            <ShoppingCart size={14} />
            <span>Open POS Billing (F1)</span>
          </Link>
        </div>
      </div>

      {/* Incoming Orders Alert */}
      <div className="card p-4 sm:p-5 border-2 border-amber-300 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/70 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
              <Bell size={17} className={pendingOrdersCount > 0 ? 'animate-bounce' : ''} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-sm sm:text-base text-gray-900">Incoming Customer Orders</h2>
                {pendingOrdersCount > 0 ? (
                  <span className="bg-amber-600 text-white text-[11px] font-black px-2 py-0.5 rounded-full animate-pulse">
                    {pendingOrdersCount} Pending Action
                  </span>
                ) : (
                  <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                    Up to date
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                {pendingOrdersCount > 0
                  ? `New online orders from customers requiring billing or packing.`
                  : `Online customer orders placed via mobile or web portal show here in real-time.`}
              </p>
            </div>
          </div>

          <Link
            to="/orders"
            className="text-xs font-bold text-amber-900 hover:text-amber-950 flex items-center gap-1 self-start sm:self-center"
          >
            <span>View All Orders Queue ({activeOrdersCount})</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* Incoming Orders Cards / Stream */}
        {incomingOrders.length === 0 ? (
          <div className="py-4 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
            <CheckCircle size={15} className="text-emerald-500" />
            <span>No pending customer orders right now. Incoming grocery orders will alert here automatically.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {incomingOrders.slice(0, 6).map((order) => {
              const isPending = order.status === 'pending';
              return (
                <div
                  key={order._id}
                  className="bg-white rounded-2xl p-3.5 border border-amber-200/80 hover:border-amber-400 transition-all shadow-xs flex flex-col justify-between space-y-2.5"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-extrabold text-xs text-primary-700">{order.orderNumber}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        order.status === 'pending'
                          ? 'bg-amber-100 text-amber-900'
                          : order.status === 'confirmed'
                          ? 'bg-blue-100 text-blue-900'
                          : order.status === 'packing'
                          ? 'bg-purple-100 text-purple-900'
                          : 'bg-emerald-100 text-emerald-900'
                      }`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <p className="font-bold text-xs sm:text-sm text-gray-900 truncate">
                      {order.customerName}
                    </p>
                    {order.customerMobile && (
                      <p className="text-[11px] text-gray-500">{order.customerMobile}</p>
                    )}

                    <p className="text-[11px] text-gray-600 bg-gray-50 p-1.5 rounded-lg line-clamp-2 leading-snug">
                      <span className="font-bold text-gray-700">{order.itemCount} items:</span> {order.itemsSummary || 'Items'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-gray-400">
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      type="button"
                      disabled={processingOrderId === order._id}
                      onClick={() => handleSendOrderToBilling(order)}
                      className="btn-primary btn-sm text-[11px] font-bold py-1 px-2.5 rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Send size={11} />
                      <span>{processingOrderId === order._id ? 'Loading...' : 'Bill in POS'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* KPI Metrics */}
      {isCashier ? (
        // CASHIER PERSONAL KPIS (His/Her own collection only)
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <UserCheck size={14} className="text-primary-600" />
            <span>Your Personal Shift Metrics (Today)</span>
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              label="Your Sales Today"
              value={fmt(kpi.todaySales)}
              sub={`${fmtNum(kpi.todaySalesCount)} bills created by you`}
              icon={ShoppingCart}
              color="bg-primary-600"
            />
            <KPICard
              label="Cash In Counter"
              value={fmt(kpi.todayCash)}
              sub="Physical cash collected by you"
              icon={DollarSign}
              color="bg-emerald-600"
            />
            <KPICard
              label="UPI Collections"
              value={fmt(kpi.todayUpi)}
              sub="Digital payments received by you"
              icon={CreditCard}
              color="bg-blue-600"
            />
            <KPICard
              label="Your Avg Bill Value"
              value={fmt(kpi.avgBillValue)}
              sub={`All-time: ${fmtNum(kpi.allTimeBillsCount)} bills`}
              icon={TrendingUp}
              color="bg-purple-600"
            />
          </div>
        </div>
      ) : (
        // ADMIN OVERALL STORE KPIS
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <Activity size={14} className="text-primary-600" />
            <span>Overall Store Financials & Health (All Counters)</span>
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="Today's Sales" value={fmt(kpi.todaySales)} sub={`${fmtNum(kpi.todaySalesCount)} bills total`} icon={ShoppingCart} color="bg-primary-500" />
            <KPICard label="Today's Purchases" value={fmt(kpi.todayPurchases)} icon={Package} color="bg-blue-500" />
            <KPICard label="Today's Profit" value={fmt(kpi.todayProfit)} icon={TrendingUp} color={kpi.todayProfit >= 0 ? 'bg-green-500' : 'bg-red-500'} />
            <KPICard label="Stock Value" value={fmt(kpi.stockValue)} icon={DollarSign} color="bg-purple-500" />
            <KPICard label="Total Customers" value={fmtNum(kpi.totalCustomers)} icon={Users} color="bg-indigo-500" />
            <KPICard label="Total Products" value={fmtNum(kpi.totalProducts)} icon={Package} color="bg-teal-500" />
            <KPICard label="Customer Due" value={fmt(kpi.pendingCustomerPayments)} sub="Outstanding" icon={AlertTriangle} color="bg-orange-500" />
            <KPICard label="Low Stock Items" value={fmtNum(alerts.lowStock)} sub={`${alerts.outOfStock || 0} out of stock`} icon={Clock} color="bg-red-500" />
          </div>
        </div>
      )}

      {/* Stock Alerts (for admin) */}
      {!isCashier && (alerts.lowStock > 0 || alerts.outOfStock > 0) && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <AlertTriangle size={15} className="text-amber-500" />
            <span>Stock Alerts</span>
          </h2>
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
            <h3 className="font-semibold text-gray-900">
              {isCashier ? `Your Sales Performance (Last 7 Days)` : `Store Sales & Purchases (Last 7 Days)`}
            </h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={charts.last7Days || []}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                  {!isCashier && (
                    <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  )}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend iconType="circle" iconSize={8} />
                <Area type="monotone" dataKey="sales" stroke="#16a34a" fill="url(#colorSales)" strokeWidth={2} name={isCashier ? "Your Sales" : "Total Sales"} />
                {!isCashier && (
                  <Area type="monotone" dataKey="purchases" stroke="#3b82f6" fill="url(#colorPurchases)" strokeWidth={2} name="Purchases" />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {isCashier ? (
          // Cashier Quick POS action & shift card
          <div className="card p-5 flex flex-col justify-between space-y-4 bg-gradient-to-br from-emerald-500/5 via-white to-primary-500/5">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                  <ShoppingCart size={18} />
                </div>
                <h3 className="font-bold text-gray-900 text-base">Quick POS Billing Access</h3>
              </div>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Ready to bill customers? Launch the fast POS barcode scanner & commodity packaging billing terminal with full shortcut keys support.
              </p>
            </div>

            <div className="space-y-2 bg-gray-50 p-3 rounded-xl text-xs text-gray-600">
              <div className="flex justify-between py-0.5 border-b border-gray-100">
                <span>Your Total All-Time Bills:</span>
                <span className="font-bold text-gray-900">{kpi.allTimeBillsCount || 0}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-gray-100">
                <span>Your Total All-Time Revenue:</span>
                <span className="font-bold text-emerald-700">{fmt(kpi.allTimeSales)}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>Today's Counter Share:</span>
                <span className="font-bold text-primary-700">{fmt(kpi.todaySales)}</span>
              </div>
            </div>

            <Link
              to="/pos"
              className="btn-primary py-3 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all text-center"
            >
              <ShoppingCart size={16} />
              <span>Resume Billing POS Terminal</span>
            </Link>
          </div>
        ) : (
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
        )}
      </div>

      {/* Admin: Per-Cashier Sales Breakdown */}
      {!isCashier && (
        <div className="card space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <Users size={17} />
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-900">Cashier Performance & Counter Sub-Data</h3>
                <p className="text-xs text-gray-500">Individual metrics for Cashier 1, Cashier 2, etc. (Collections, bills generated, and drawer cash)</p>
              </div>
            </div>
            <Link to="/users" className="text-xs text-primary-600 hover:underline font-semibold">
              Manage Staff Users →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {cashierSummaries.map(cashier => (
              <div
                key={cashier._id}
                className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-primary-300 transition-all space-y-3 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm text-gray-900">{cashier.name}</h4>
                    <p className="text-[11px] text-gray-500">{cashier.email}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${cashier.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                    {cashier.role}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Today Billed</span>
                    <span className="font-black text-sm text-primary-700">{fmt(cashier.todaySales)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Bills Count</span>
                    <span className="font-bold text-sm text-gray-900">{cashier.todayBillsCount} bills</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Cash Collected</span>
                    <span className="font-semibold text-emerald-700">{fmt(cashier.todayCash)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">UPI Collected</span>
                    <span className="font-semibold text-blue-700">{fmt(cashier.todayUpi)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                  <span>Avg Bill: <b className="text-gray-700">{fmt(cashier.avgBillValue)}</b></span>
                  <span>Lifetime: <b className="text-gray-700">{fmt(cashier.allTimeSales)}</b></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin: Cashier Activity Logs */}
      {!isCashier && (
        <div className="card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <Activity size={17} />
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-900">Cashier Activity & Audit Stream</h3>
                <p className="text-xs text-gray-500">Real-time log of every action taken by staff (bill creation, order updates, logins, voids)</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter size={13} className="text-gray-400" />
              <select
                className="form-input text-xs py-1.5 px-2.5 rounded-xl bg-white cursor-pointer"
                value={selectedCashierFilter}
                onChange={e => setSelectedCashierFilter(e.target.value)}
              >
                <option value="all">All Cashiers / Users</option>
                {cashierSummaries.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {filteredActivities.length === 0 ? (
              <p className="text-xs text-center text-gray-400 py-6">No recent cashier activity logged.</p>
            ) : (
              filteredActivities.map((log) => {
                const uName = log.user?.name || log.userName || 'Staff';
                const actionLabel = log.action ? log.action.replace(/_/g, ' ') : 'Activity';
                return (
                  <div
                    key={log._id}
                    className="p-3 rounded-xl border border-gray-100 bg-gray-50/70 hover:bg-white transition-all flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-[11px] shrink-0">
                        {uName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900">{uName}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-gray-200 text-gray-700 uppercase">
                            {actionLabel}
                          </span>
                          {log.recordRef && (
                            <span className="text-[11px] font-semibold text-primary-700">
                              #{log.recordRef}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">
                          {log.description || `${actionLabel} in module ${log.module || 'system'}`}
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] text-gray-400 shrink-0">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Summary Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Invoices Table */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">
              {isCashier ? `Your Recent Invoices` : `Recent Store Sales`}
            </h3>
            <Link to="/sales" className="text-xs text-primary-600 hover:underline">View all</Link>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  {!isCashier && <th>Cashier</th>}
                  <th>Amount</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.length === 0 ? (
                  <tr><td colSpan={isCashier ? 4 : 5} className="text-center text-gray-400 py-6">No sales yet</td></tr>
                ) : recentSales.map(s => (
                  <tr key={s._id}>
                    <td><Link to={`/sales/${s._id}`} className="text-primary-600 hover:underline font-medium">{s.invoiceNumber}</Link></td>
                    <td>{s.customerName || 'Walk-in'}</td>
                    {!isCashier && <td className="text-xs text-gray-500 font-medium">{s.createdBy?.name || 'Cashier'}</td>}
                    <td className="font-semibold">{fmt(s.grandTotal)}</td>
                    <td><span className="badge-green capitalize">{s.paymentMethod}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cashier Personal Activity Log OR Admin Low Stock Alert */}
        {isCashier ? (
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900">Your Activity Log</h3>
            </div>
            <div className="p-4 space-y-2.5 max-h-72 overflow-y-auto">
              {cashierLogs.length === 0 ? (
                <p className="text-xs text-center text-gray-400 py-6">No activities recorded yet.</p>
              ) : cashierLogs.map(log => (
                <div key={log._id} className="p-2.5 rounded-xl bg-gray-50 text-xs flex items-center justify-between gap-2 border border-gray-100">
                  <div className="min-w-0">
                    <span className="font-bold text-gray-800 capitalize">{log.action?.replace(/_/g, ' ')}</span>
                    <p className="text-[11px] text-gray-500 truncate">{log.description || log.recordRef || 'Action logged'}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
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
                    <tr>
                      <td colSpan={4} className="text-center text-gray-400 py-6">
                        <div className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                          <CheckCircle size={14} className="text-emerald-500" />
                          <span>All stock levels healthy</span>
                        </div>
                      </td>
                    </tr>
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
        )}
      </div>
    </div>
  );
}
