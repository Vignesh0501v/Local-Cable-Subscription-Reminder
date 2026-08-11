import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/AuthContext'
import { fetchCompletedToday, fetchOperatorDashboard } from '../../lib/operatorApi'

const MODE_LABELS: Record<string, string> = {
  upi_gpay: 'Google Pay',
  upi_phonepe: 'PhonePe',
  upi_paytm: 'Paytm',
  cash: 'Cash',
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  )
}

export default function Dashboard() {
  const { token } = useAuth()

  const statsQuery = useQuery({
    queryKey: ['operator', 'dashboard'],
    queryFn: () => fetchOperatorDashboard(token!),
    enabled: Boolean(token),
  })

  const completedQuery = useQuery({
    queryKey: ['operator', 'completed-today'],
    queryFn: () => fetchCompletedToday(token!),
    enabled: Boolean(token),
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Waiting for Subscription"
          value={statsQuery.data ? String(statsQuery.data.waiting_for_subscription_count) : '...'}
        />
        <StatCard
          label="Today's Completed"
          value={statsQuery.data ? String(statsQuery.data.completed_today_count) : '...'}
        />
      </div>

      <div className="rounded-2xl bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Completed Today</h2>
        </div>
        {completedQuery.isPending && <p className="p-5 text-sm text-gray-500">Loading...</p>}
        {completedQuery.data?.length === 0 && (
          <p className="p-5 text-sm text-gray-500">No subscriptions activated yet today.</p>
        )}
        {completedQuery.data && completedQuery.data.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {completedQuery.data.map((item) => (
              <li key={item.subscription_id} className="px-5 py-3">
                <p className="text-sm font-medium text-gray-900">
                  {item.customer_name}{' '}
                  <span className="font-normal text-gray-500">({item.customer_number})</span>
                </p>
                <p className="text-xs text-gray-500">
                  {item.plan_name} · ₹{item.amount.toFixed(2)} ·{' '}
                  {item.payment_mode ? MODE_LABELS[item.payment_mode] : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
