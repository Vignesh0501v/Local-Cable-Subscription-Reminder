import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/AuthContext'
import { fetchActivity, fetchAdminDashboard } from '../../lib/adminApi'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  )
}

function formatAction(action: string, table: string, recordId: number): string {
  const tableLabel: Record<string, string> = {
    customers: 'customer',
    plans: 'plan',
    settings: 'UPI settings',
    payments: 'payment',
    monthly_subscriptions: 'subscription',
    users: 'staff member',
  }
  return `${action} ${tableLabel[table] ?? table} #${recordId}`
}

export default function Dashboard() {
  const { token } = useAuth()

  const statsQuery = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => fetchAdminDashboard(token!),
    enabled: Boolean(token),
  })

  const activityQuery = useQuery({
    queryKey: ['admin', 'activity'],
    queryFn: () => fetchActivity(token!, 15),
    enabled: Boolean(token),
  })

  const stats = statsQuery.data

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Customers" value={stats ? String(stats.total_customers) : '...'} />
        <StatCard label="Pending Payment" value={stats ? String(stats.pending_payment_count) : '...'} />
        <StatCard
          label="Pending Verification"
          value={stats ? String(stats.pending_verification_count) : '...'}
        />
        <StatCard
          label="Pending Subscription"
          value={stats ? String(stats.pending_subscription_count) : '...'}
        />
        <StatCard
          label="Revenue (This Month)"
          value={stats ? `₹${stats.revenue_this_month.toFixed(2)}` : '...'}
        />
        <StatCard
          label="Collections Today"
          value={stats ? `₹${stats.collections_today.toFixed(2)}` : '...'}
        />
      </div>

      <div className="rounded-2xl bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
        </div>
        {activityQuery.isPending && <p className="p-5 text-sm text-gray-500">Loading...</p>}
        {activityQuery.data?.length === 0 && (
          <p className="p-5 text-sm text-gray-500">No activity recorded yet.</p>
        )}
        {activityQuery.data && activityQuery.data.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {activityQuery.data.map((item) => (
              <li key={item.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="text-gray-900">
                  {item.user_name ?? 'System'} {formatAction(item.action, item.table_name, item.record_id)}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(item.timestamp).toLocaleString('en-IN')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
