import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/AuthContext'
import { activateSubscription, fetchQueue, type QueueItem } from '../../lib/operatorApi'
import { ApiError } from '../../lib/authApi'
import { useState } from 'react'

const MODE_LABELS: Record<string, string> = {
  upi_gpay: 'Google Pay',
  upi_phonepe: 'PhonePe',
  upi_paytm: 'Paytm',
  cash: 'Cash',
}

export default function Queue() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['operator', 'queue'],
    queryFn: () => fetchQueue(token!),
    enabled: Boolean(token),
  })

  const activateMutation = useMutation({
    mutationFn: (subscriptionId: number) => activateSubscription(token!, subscriptionId),
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['operator', 'queue'] })
      queryClient.invalidateQueries({ queryKey: ['operator', 'dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['operator', 'completed-today'] })
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not activate subscription.'),
  })

  if (query.isPending) {
    return <p className="text-sm text-gray-500">Loading queue...</p>
  }

  if (query.isError) {
    return <p className="text-sm text-red-600">Could not load the subscription queue.</p>
  }

  const items = query.data

  return (
    <div className="rounded-2xl bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-gray-900">Waiting for Subscription</h2>
        <p className="text-xs text-gray-500">
          Verified by collector — activate the customer in your cable software, then mark subscribed here.
        </p>
      </div>

      {error && <p className="px-5 pt-3 text-sm text-red-600">{error}</p>}

      {items.length === 0 ? (
        <p className="p-5 text-sm text-gray-500">No customers waiting. All caught up.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((item: QueueItem) => (
            <li key={item.subscription_id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {item.customer_name}{' '}
                  <span className="font-normal text-gray-500">({item.customer_number})</span>
                </p>
                <p className="text-xs text-gray-500">
                  {item.plan_name} · ₹{item.amount.toFixed(2)} · Verified by Collector
                  {item.payment_mode ? ` (${MODE_LABELS[item.payment_mode]})` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => activateMutation.mutate(item.subscription_id)}
                disabled={activateMutation.isPending}
                className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                Mark Subscribed
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
