import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/AuthContext'
import { fetchAuditLogs } from '../../lib/reportsApi'

const TABLE_OPTIONS = [
  'customers', 'plans', 'settings', 'payments', 'monthly_subscriptions', 'users',
]
const PAGE_SIZE = 25

export default function AuditLog() {
  const { token } = useAuth()
  const [tableName, setTableName] = useState('')
  const [action, setAction] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [offset, setOffset] = useState(0)

  const query = useQuery({
    queryKey: ['admin', 'audit-logs', tableName, action, dateFrom, dateTo, offset],
    queryFn: () =>
      fetchAuditLogs(token!, {
        tableName: tableName || undefined,
        action: action || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        limit: PAGE_SIZE,
        offset,
      }),
    enabled: Boolean(token),
  })

  function resetAndFilter(setter: () => void) {
    setter()
    setOffset(0)
  }

  const total = query.data?.total ?? 0
  const page = Math.floor(offset / PAGE_SIZE) + 1
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <label className="text-xs font-medium text-gray-700">
          Table
          <select
            value={tableName}
            onChange={(e) => resetAndFilter(() => setTableName(e.target.value))}
            className="mt-1 block rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">All tables</option>
            {TABLE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-gray-700">
          Action
          <input
            type="text"
            value={action}
            onChange={(e) => resetAndFilter(() => setAction(e.target.value))}
            placeholder="create, update, approve..."
            className="mt-1 block w-40 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-gray-700">
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => resetAndFilter(() => setDateFrom(e.target.value))}
            className="mt-1 block rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-gray-700">
          To
          <input
            type="date"
            value={dateTo}
            onChange={(e) => resetAndFilter(() => setDateTo(e.target.value))}
            className="mt-1 block rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          />
        </label>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 text-xs text-gray-500">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Table</th>
              <th className="px-4 py-3">Record</th>
              <th className="px-4 py-3">Changes</th>
              <th className="px-4 py-3">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {query.data?.items.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-3">{log.user_name ?? 'System'}</td>
                <td className="px-4 py-3">{log.action}</td>
                <td className="px-4 py-3">{log.table_name}</td>
                <td className="px-4 py-3">#{log.record_id}</td>
                <td className="max-w-xs truncate px-4 py-3 font-mono text-xs text-gray-500">
                  {log.old_value && <span title={log.old_value}>old: {log.old_value.slice(0, 40)} </span>}
                  {log.new_value && <span title={log.new_value}>new: {log.new_value.slice(0, 40)}</span>}
                  {!log.old_value && !log.new_value && '—'}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(log.timestamp).toLocaleString('en-IN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {query.data?.items.length === 0 && (
          <p className="p-5 text-sm text-gray-500">No audit log entries match these filters.</p>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Page {page} of {totalPages} ({total} entries)
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={offset === 0}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={offset + PAGE_SIZE >= total}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
