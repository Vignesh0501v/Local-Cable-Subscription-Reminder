import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/AuthContext'
import { fetchDashboard } from '../../lib/collectorApi'

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
  const query = useQuery({
    queryKey: ['collector', 'dashboard'],
    queryFn: () => fetchDashboard(token!),
    enabled: Boolean(token),
  })

  if (query.isPending) {
    return <p className="text-sm text-gray-500">Loading dashboard...</p>
  }

  if (query.isError) {
    return <p className="text-sm text-red-600">Could not load dashboard.</p>
  }

  const data = query.data

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <StatCard label="Pending Verification" value={String(data.pending_verification_count)} />
      <StatCard label="Completed Today" value={String(data.completed_today_count)} />
      <StatCard label="Today's Collection" value={`₹${data.todays_total_collection.toFixed(2)}`} />
      <StatCard label="Cash Collection" value={`₹${data.todays_cash_collection.toFixed(2)}`} />
      <StatCard label="Online Payments" value={`₹${data.todays_online_collection.toFixed(2)}`} />
    </div>
  )
}
