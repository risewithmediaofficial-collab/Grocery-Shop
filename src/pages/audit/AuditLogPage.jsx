import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Search, Filter, Calendar, User, Eye, AlertTriangle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import clsx from 'clsx';

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 30 });
      if (moduleFilter) params.set('module', moduleFilter);
      if (actionFilter) params.set('action', actionFilter);
      const res = await api.get(`/audit-logs?${params}`);
      setLogs(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [moduleFilter, actionFilter, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Shield size={22} className="text-primary-600" /> System Audit & Compliance Logs
          </h1>
          <p className="page-subtitle">{total} immutable security audit records logged</p>
        </div>
      </div>

      {/* Quick Filter Tabs & Modules */}
      <div className="card p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => { setActionFilter(''); setModuleFilter(''); setPage(1); }}
            className={clsx(
              'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border',
              !actionFilter && !moduleFilter
                ? 'bg-primary-600 text-white border-primary-600 shadow-2xs'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            )}
          >
            All Activity Records
          </button>
          <button
            type="button"
            onClick={() => { setActionFilter('unbilled_stock_reduction'); setModuleFilter(''); setPage(1); }}
            className={clsx(
              'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5',
              actionFilter === 'unbilled_stock_reduction'
                ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
            )}
          >
            <AlertTriangle size={13} />
            Unbilled Stock Reductions
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            className="form-select text-xs w-full sm:w-48"
            value={moduleFilter}
            onChange={e => { setModuleFilter(e.target.value); setActionFilter(''); setPage(1); }}
          >
            <option value="">All Modules</option>
            <option value="products">Products</option>
            <option value="inventory">Inventory & Adjustments</option>
            <option value="sales">Sales & Billing</option>
            <option value="purchases">Purchases</option>
            <option value="users">Users & Roles</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table text-xs">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User / Cashier</th>
                <th>Module</th>
                <th>Action</th>
                <th>Record Reference</th>
                <th>Details / Explanation</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={6}><div className="skeleton h-5 w-full" /></td></tr>)
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">
                    <Shield size={32} className="mx-auto mb-2 opacity-30" />
                    No audit records found for this filter
                  </td>
                </tr>
              ) : logs.map(l => {
                const isStockReduction = l.action === 'unbilled_stock_reduction';

                return (
                  <tr
                    key={l._id}
                    className={clsx(
                      'transition-colors',
                      isStockReduction ? 'bg-amber-50/40 border-l-4 border-l-amber-500' : ''
                    )}
                  >
                    <td className="text-gray-500 font-mono whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td>
                      <p className="font-bold text-gray-900">{l.userName || l.user?.name || 'System'}</p>
                      {l.user?.email && <p className="text-[10px] text-gray-400">{l.user.email}</p>}
                    </td>
                    <td>
                      <span className={clsx(
                        'uppercase text-[10px] font-bold px-2 py-0.5 rounded-md border',
                        isStockReduction ? 'bg-amber-100 text-amber-900 border-amber-300' : 'badge-blue'
                      )}>
                        {l.module}
                      </span>
                    </td>
                    <td>
                      {isStockReduction ? (
                        <span className="bg-amber-600 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-lg shadow-2xs inline-flex items-center gap-1">
                          <AlertTriangle size={11} /> UNBILLED REDUCTION
                        </span>
                      ) : (
                        <span className="badge-purple font-medium">{l.action}</span>
                      )}
                    </td>
                    <td className="font-mono font-bold text-primary-700">{l.recordRef || '-'}</td>
                    <td>
                      <div className="max-w-md text-[11px] p-2 rounded-xl bg-white border border-gray-200 shadow-2xs space-y-1">
                        {isStockReduction && l.newValue ? (
                          <>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600 font-medium">Stock Change:</span>
                              <span className="font-bold text-red-700">
                                {l.oldValue?.stock ?? '?'} → {l.newValue.stock ?? '?'} (-{l.newValue.reducedBy ?? '?'} units)
                              </span>
                            </div>
                            <div className="flex items-start justify-between gap-2 pt-1 border-t border-gray-100">
                              <span className="text-gray-600 shrink-0 font-medium">Reason:</span>
                              <span className="font-bold text-amber-900 text-right">{l.newValue.reason || 'Not specified'}</span>
                            </div>
                            {l.newValue.notes && (
                              <div className="text-[10px] text-gray-600 italic bg-amber-50/60 p-1.5 rounded-lg border border-amber-200/60">
                                Note: "{l.newValue.notes}"
                              </div>
                            )}
                            {l.newValue.financialLoss > 0 && (
                              <div className="text-[10px] text-right font-bold text-red-600">
                                Approx Loss: ₹{Number(l.newValue.financialLoss).toLocaleString('en-IN')}
                              </div>
                            )}
                          </>
                        ) : l.description ? (
                          <span className="text-gray-700 leading-snug">{l.description}</span>
                        ) : (
                          <div className="font-mono text-[10px]">
                            {l.oldValue && <span className="text-red-600 block">Old: {JSON.stringify(l.oldValue)}</span>}
                            {l.newValue && <span className="text-green-700 block">New: {JSON.stringify(l.newValue)}</span>}
                          </div>
                        )}
                      </div>
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
