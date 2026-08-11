import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/AuthContext'
import {
  fetchNotifications,
  sendAllReminders,
  type NotificationStatus,
  type NotificationType,
} from '../../lib/notificationApi'
import { ApiError } from '../../lib/authApi'

const STATUS_STYLES: Record<NotificationStatus, string> = {
  sent: 'bg-green-100 text-green-700',
  simulated: 'bg-blue-100 text-blue-700',
  failed: 'bg-red-100 text-red-700',
  queued: 'bg-gray-100 text-gray-600',
}

const TYPE_LABELS: Record<NotificationType, string> = {
  sms: 'SMS',
  whatsapp: 'WhatsApp',
}

export default function Notifications() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [typeFilter, setTypeFilter] = useState<NotificationType | ''>('')
  const [statusFilter, setStatusFilter] = useState<NotificationStatus | ''>('')
  const [resultMessage, setResultMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['admin', 'notifications', typeFilter, statusFilter],
    queryFn: () =>
      fetchNotifications(token!, {
        type: typeFilter || undefined,
        status: statusFilter || undefined,
      }),
    enabled: Boolean(token),
  })

  const sendMutation = useMutation({
    mutationFn: () => sendAllReminders(token!),
    onSuccess: (data) => {
      setError(null)
      setResultMessage(`Sent reminders to ${data.total_customers} active customers.`)
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
    onError: (err) => {
      setResultMessage(null)
      setError(err instanceof ApiError ? err.message : 'Could not send reminders.')
    },
  })

  function handleSendAll() {
    if (
      confirm(
        'Send a payment reminder (SMS + WhatsApp) to every active customer right now? This is normally automatic on the 15th — use this to test or send an out-of-cycle reminder.'
      )
    ) {
      setResultMessage(null)
      sendMutation.mutate()
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Monthly Reminders</h2>
          <p className="text-xs text-gray-500">
            Automatically sent to all active customers on the 15th of each month. SMS sends for real
            once a Fast2SMS key is configured — otherwise (and WhatsApp always, for now) it's logged as
            simulated.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSendAll}
          disabled={sendMutation.isPending}
          className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {sendMutation.isPending ? 'Sending...' : 'Send Reminders Now'}
        </button>
      </div>

      {resultMessage && (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{resultMessage}</p>
      )}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as NotificationType | '')}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All types</option>
          <option value="sms">SMS</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as NotificationStatus | '')}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="sent">Sent</option>
          <option value="simulated">Simulated</option>
          <option value="failed">Failed</option>
          <option value="queued">Queued</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 text-xs text-gray-500">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Sent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {query.data?.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{item.customer_name}</p>
                  <p className="text-xs text-gray-500">{item.customer_number}</p>
                </td>
                <td className="px-4 py-3">{TYPE_LABELS[item.type]}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[item.status]}`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {item.sent_time ? new Date(item.sent_time).toLocaleString('en-IN') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {query.data?.length === 0 && <p className="p-5 text-sm text-gray-500">No reminders sent yet.</p>}
      </div>
    </div>
  )
}
