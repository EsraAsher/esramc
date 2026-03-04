import { useState, useEffect, useCallback } from 'react';
import { fetchAuditLogs } from '../../api/index';

const ACTION_COLORS = {
  // Products
  PRODUCT_CREATED: 'text-green-400 bg-green-500/10 border-green-500/30',
  PRODUCT_UPDATED: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  PRODUCT_DELETED: 'text-red-400 bg-red-500/10 border-red-500/30',
  PRODUCT_TOGGLED: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  // Collections
  COLLECTION_CREATED: 'text-green-400 bg-green-500/10 border-green-500/30',
  COLLECTION_UPDATED: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  COLLECTION_DELETED: 'text-red-400 bg-red-500/10 border-red-500/30',
  // Tickets
  TICKET_STATUS_CHANGED: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  // Referrals
  REFERRAL_APPROVED: 'text-green-400 bg-green-500/10 border-green-500/30',
  REFERRAL_REJECTED: 'text-red-400 bg-red-500/10 border-red-500/30',
  PARTNER_UPDATED: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  PARTNER_STATUS_CHANGED: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  COMMISSION_ADJUSTED: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  // Payouts
  PAYOUT_PROCESSED: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  PAYOUT_REQUEST_PROCESSING: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  PAYOUT_REQUEST_COMPLETED: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  PAYOUT_REQUEST_REJECTED: 'text-red-400 bg-red-500/10 border-red-500/30',
  // MOTD
  MOTD_UPDATED: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
  MOTD_STOCK_RESET: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
  // Admin
  ADMIN_CREATED: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
};

const ALL_ACTIONS = Object.keys(ACTION_COLORS);

function formatTs(iso) {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [adminFilter, setAdminFilter] = useState('');

  // Expanded row
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = { page: p, limit: 50 };
      if (actionFilter) params.action = actionFilter;
      if (adminFilter.trim()) params.adminId = adminFilter.trim();
      const data = await fetchAuditLogs(params);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setPages(data.pages || 1);
    } catch (err) {
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [actionFilter, adminFilter]);

  useEffect(() => {
    load(1);
  }, [load]);

  function handleFilterSubmit(e) {
    e.preventDefault();
    load(1);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-pixel text-base text-red-400 mb-1">AUDIT LOGS</h2>
        <p className="text-gray-500 text-xs">
          Immutable record of all admin actions. Logs auto-expire after 365 days. No deletion via web UI.
        </p>
      </div>

      {/* Filters */}
      <form onSubmit={handleFilterSubmit} className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs font-pixel">ACTION</label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-dark-surface border border-white/10 text-white text-xs rounded-lg px-3 py-2 focus:border-red-500/50 focus:outline-none"
          >
            <option value="">All actions</option>
            {ALL_ACTIONS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-500 text-xs font-pixel">ADMIN ID</label>
          <input
            value={adminFilter}
            onChange={(e) => setAdminFilter(e.target.value)}
            placeholder="MongoDB admin _id"
            className="bg-dark-surface border border-white/10 text-white text-xs rounded-lg px-3 py-2 w-52 focus:border-red-500/50 focus:outline-none placeholder-gray-600"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 font-pixel text-xs bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
        >
          FILTER
        </button>
        {(actionFilter || adminFilter) && (
          <button
            type="button"
            onClick={() => { setActionFilter(''); setAdminFilter(''); }}
            className="px-4 py-2 font-pixel text-xs bg-white/5 border border-white/10 text-gray-400 rounded-lg hover:text-white transition-colors"
          >
            CLEAR
          </button>
        )}
      </form>

      {/* Stats bar */}
      <div className="text-xs text-gray-500">
        {loading ? 'Loading…' : `${total.toLocaleString()} total log entries`}
        {pages > 1 && !loading && ` — page ${page} of ${pages}`}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">{error}</div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-gray-500 text-xs font-pixel">
              <th className="text-left px-4 py-3">TIMESTAMP</th>
              <th className="text-left px-4 py-3">ADMIN</th>
              <th className="text-left px-4 py-3">ACTION</th>
              <th className="text-left px-4 py-3">TARGET</th>
              <th className="text-left px-4 py-3">DETAILS</th>
            </tr>
          </thead>
          <tbody>
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-600 text-xs">No audit logs found</td>
              </tr>
            )}
            {logs.map((log) => {
              const isOpen = expanded === log._id;
              const colorClass = ACTION_COLORS[log.action] || 'text-gray-400 bg-white/5 border-white/10';
              const detailsStr = log.details && Object.keys(log.details).length > 0
                ? JSON.stringify(log.details)
                : null;

              return (
                <>
                  <tr
                    key={log._id}
                    onClick={() => setExpanded(isOpen ? null : log._id)}
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {formatTs(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-white text-xs whitespace-nowrap">
                      {log.displayName || <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block font-pixel text-[10px] px-2 py-0.5 rounded border ${colorClass}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-xs max-w-[12rem] truncate">
                      {log.target || <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[16rem] truncate font-mono">
                      {detailsStr
                        ? <span className="text-gray-400">{detailsStr.slice(0, 80)}{detailsStr.length > 80 ? '…' : ''}</span>
                        : <span className="text-gray-700">—</span>
                      }
                    </td>
                  </tr>
                  {isOpen && (
                    <tr key={`${log._id}-expanded`} className="border-b border-white/5 bg-white/[0.02]">
                      <td colSpan={5} className="px-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div>
                            <p className="text-gray-500 font-pixel text-[10px] mb-1">FULL DETAILS</p>
                            <pre className="bg-black/30 border border-white/10 rounded-lg p-3 text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap break-all text-[11px] leading-relaxed max-h-48 overflow-y-auto">
                              {JSON.stringify(log.details ?? {}, null, 2)}
                            </pre>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <p className="text-gray-500 font-pixel text-[10px] mb-1">LOG ID</p>
                              <p className="font-mono text-gray-400 text-[11px] break-all">{log._id}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 font-pixel text-[10px] mb-1">ADMIN ID</p>
                              <p className="font-mono text-gray-400 text-[11px] break-all">{log.adminId || '—'}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 font-pixel text-[10px] mb-1">IP ADDRESS</p>
                              <p className="font-mono text-gray-400 text-[11px]">{log.ip || '—'}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 font-pixel text-[10px] mb-1">FULL TIMESTAMP</p>
                              <p className="font-mono text-gray-400 text-[11px]">{new Date(log.createdAt).toISOString()}</p>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center gap-2 justify-center">
          <button
            disabled={page <= 1 || loading}
            onClick={() => load(page - 1)}
            className="px-3 py-1.5 font-pixel text-xs bg-dark-surface border border-white/10 text-gray-400 rounded-lg hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← PREV
          </button>
          <span className="text-gray-500 text-xs font-pixel">{page} / {pages}</span>
          <button
            disabled={page >= pages || loading}
            onClick={() => load(page + 1)}
            className="px-3 py-1.5 font-pixel text-xs bg-dark-surface border border-white/10 text-gray-400 rounded-lg hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            NEXT →
          </button>
        </div>
      )}
    </div>
  );
}
