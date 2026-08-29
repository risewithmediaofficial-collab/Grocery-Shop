import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Search, Filter, Calendar, User, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 30 });
      if (moduleFilter) params.set('module', moduleFilter);
      const res = await api.get(`/audit-logs?${params}`);
      setLogs(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [moduleFilter, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">System Audit & Compliance Logs</h1>
          <p className="page-subtitle">{total} immutable security audit records logged</p>
        </div>
      </div>

      <div className="card p-4">
        <select className="form-select w-56" value={moduleFilter} onChange={e => { setModuleFilter(e.target.value); setPage(1); }}>
          <option value="">All Modules</option>
          <option value="products">Products</option>
          <option value="sales">Sales & Billing</option>
          <option value="purchases">Purchases</option>
          <option value="inventory">Inventory & Adjustments</option>
          <option value="users">Users & Roles</option>
        </select>
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
                <th>Details / Value Changes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={6}><div className="skeleton h-5 w-full" /></td></tr>)
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">
                    <Shield size={32} className="mx-auto mb-2 opacity-30" />
                    No audit records found
                  </td>
                </tr>
              ) : logs.map(l => (
                <tr key={l._id}>
                  <td className="text-gray-500 font-mono">
                    {new Date(l.createdAt).toLocaleString('en-IN')}
                  </td>
                  <td>
                    <p className="font-bold text-gray-900">{l.userName || l.user?.name || 'System'}</p>
                  </td>
                  <td><span className="badge-blue uppercase">{l.module}</span></td>
                  <td><span className="badge-purple">{l.action}</span></td>
                  <td className="font-mono font-bold text-primary-700">{l.recordRef || '-'}</td>
                  <td>
                    <div className="max-w-md overflow-x-auto text-[11px] bg-gray-50 p-1.5 rounded font-mono text-gray-700">
                      {l.description ? (
                        <span>{l.description}</span>
                      ) : (
                        <span>
                          {l.oldValue && <span className="text-red-600 block">Old: {JSON.stringify(l.oldValue)}</span>}
                          {l.newValue && <span className="text-green-700 block">New: {JSON.stringify(l.newValue)}</span>}
                        </span>
                      )}
                    </div>
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
