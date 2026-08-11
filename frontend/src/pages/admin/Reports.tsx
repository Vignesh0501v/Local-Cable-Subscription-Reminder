import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/AuthContext'
import {
  fetchPaymentReport,
  fetchPendingSubscriptions,
  fetchRevenueReport,
  type PaymentMode,
} from '../../lib/reportsApi'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const MODE_LABELS: Record<string, string> = {
  upi_gpay: 'Google Pay',
  upi_phonepe: 'PhonePe',
  upi_paytm: 'Paytm',
  cash: 'Cash',
}

type Tab = 'revenue' | 'payments' | 'pending'

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-sm font-medium ${
        active ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  )
}

function RevenueTab() {
  const { token } = useAuth()
  const query = useQuery({
    queryKey: ['admin', 'reports', 'revenue'],
    queryFn: () => fetchRevenueReport(token!, 6),
    enabled: Boolean(token),
  })

  const maxRevenue = Math.max(1, ...(query.data?.map((r) => r.revenue) ?? [0]))

  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-100 text-xs text-gray-500">
          <tr>
            <th className="px-4 py-3">Month</th>
            <th className="px-4 py-3">Revenue</th>
            <th className="px-4 py-3">Cash</th>
            <th className="px-4 py-3">Online</th>
            <th className="px-4 py-3">Payments</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {query.data?.map((item) => (
            <tr key={`${item.year}-${item.month}`}>
              <td className="px-4 py-3 font-medium text-gray-900">
                {MONTH_NAMES[item.month - 1]} {item.year}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 rounded bg-blue-500" style={{ width: `${(item.revenue / maxRevenue) * 80}px` }} />
                  <span>₹{item.revenue.toFixed(2)}</span>
                </div>
              </td>
              <td className="px-4 py-3">₹{item.cash_amount.toFixed(2)}</td>
              <td className="px-4 py-3">₹{item.online_amount.toFixed(2)}</td>
              <td className="px-4 py-3">{item.payment_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PaymentsTab() {
  const { token } = useAuth()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [mode, setMode] = useState<PaymentMode | ''>('')
  const [approvedOnly, setApprovedOnly] = useState(false)

  const query = useQuery({
    queryKey: ['admin', 'reports', 'payments', dateFrom, dateTo, mode, approvedOnly],
    queryFn: () =>
      fetchPaymentReport(token!, {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        paymentMode: mode || undefined,
        approvedOnly,
      }),
    enabled: Boolean(token),
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <label className="text-xs font-medium text-gray-700">
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="mt-1 block rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-gray-700">
          To
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="mt-1 block rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-gray-700">
          Mode
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as PaymentMode | '')}
            className="mt-1 block rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            <option value="upi_gpay">Google Pay</option>
            <option value="upi_phonepe">PhonePe</option>
            <option value="upi_paytm">Paytm</option>
            <option value="cash">Cash</option>
          </select>
        </label>
        <label className="mt-4 flex items-center gap-2 text-xs font-medium text-gray-700">
          <input
            type="checkbox"
            checked={approvedOnly}
            onChange={(e) => setApprovedOnly(e.target.checked)}
          />
          Approved only
        </label>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 text-xs text-gray-500">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Collector</th>
              <th className="px-4 py-3">Mode</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {query.data?.map((p) => (
              <tr key={p.payment_id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{p.customer_name}</p>
                  <p className="text-xs text-gray-500">{p.customer_number}</p>
                </td>
                <td className="px-4 py-3">{p.collector_name ?? '—'}</td>
                <td className="px-4 py-3">{MODE_LABELS[p.payment_mode]}</td>
                <td className="px-4 py-3">₹{p.amount.toFixed(2)}</td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(p.submitted_date).toLocaleString('en-IN')}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.is_approved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {p.is_approved ? 'Approved' : 'Unresolved'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {query.data?.length === 0 && <p className="p-5 text-sm text-gray-500">No payments found.</p>}
      </div>
    </div>
  )
}

function PendingTab() {
  const { token } = useAuth()
  const query = useQuery({
    queryKey: ['admin', 'reports', 'pending-subscriptions'],
    queryFn: () => fetchPendingSubscriptions(token!),
    enabled: Boolean(token),
  })

  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-100 text-xs text-gray-500">
          <tr>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Plan</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Payment Status</th>
            <th className="px-4 py-3">Subscription Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {query.data?.map((item) => (
            <tr key={item.subscription_id}>
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900">{item.customer_name}</p>
                <p className="text-xs text-gray-500">{item.customer_number}</p>
              </td>
              <td className="px-4 py-3">{item.plan_name}</td>
              <td className="px-4 py-3">₹{item.amount.toFixed(2)}</td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  {item.payment_status}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  {item.subscription_status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {query.data?.length === 0 && (
        <p className="p-5 text-sm text-gray-500">Nothing pending — everyone is fully subscribed.</p>
      )}
    </div>
  )
}

export default function Reports() {
  const [tab, setTab] = useState<Tab>('revenue')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-2xl bg-white p-1 shadow-sm">
        <TabButton active={tab === 'revenue'} onClick={() => setTab('revenue')}>
          Revenue
        </TabButton>
        <TabButton active={tab === 'payments'} onClick={() => setTab('payments')}>
          Payments
        </TabButton>
        <TabButton active={tab === 'pending'} onClick={() => setTab('pending')}>
          Pending Subscriptions
        </TabButton>
      </div>

      {tab === 'revenue' && <RevenueTab />}
      {tab === 'payments' && <PaymentsTab />}
      {tab === 'pending' && <PendingTab />}
    </div>
  )
}
