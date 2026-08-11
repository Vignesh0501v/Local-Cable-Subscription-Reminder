import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/AuthContext'
import { approvePayment, fetchPendingPayments, rejectPayment, type PaymentDetail } from '../../lib/collectorApi'
import { ApiError } from '../../lib/authApi'

const MODE_LABELS: Record<string, string> = {
  upi_gpay: 'Google Pay',
  upi_phonepe: 'PhonePe',
  upi_paytm: 'Paytm',
  cash: 'Cash',
}

export default function PendingPayments() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [remarks, setRemarks] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['collector', 'payments', 'pending'],
    queryFn: () => fetchPendingPayments(token!),
    enabled: Boolean(token),
  })

  function invalidateAfterAction() {
    queryClient.invalidateQueries({ queryKey: ['collector', 'payments', 'pending'] })
    queryClient.invalidateQueries({ queryKey: ['collector', 'dashboard'] })
    queryClient.invalidateQueries({ queryKey: ['collector', 'payments', 'completed-today'] })
  }

  const approveMutation = useMutation({
    mutationFn: (paymentId: number) => approvePayment(token!, paymentId),
    onSuccess: invalidateAfterAction,
    onError: (err) => setActionError(err instanceof ApiError ? err.message : 'Could not approve payment.'),
  })

  const rejectMutation = useMutation({
    mutationFn: (paymentId: number) => rejectPayment(token!, paymentId, remarks),
    onSuccess: () => {
      invalidateAfterAction()
      setRejectingId(null)
      setRemarks('')
    },
    onError: (err) => setActionError(err instanceof ApiError ? err.message : 'Could not reject payment.'),
  })

  if (query.isPending) {
    return <p className="text-sm text-gray-500">Loading pending payments...</p>
  }

  if (query.isError) {
    return <p className="text-sm text-red-600">Could not load pending payments.</p>
  }

  const payments = query.data

  return (
    <div className="rounded-2xl bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-gray-900">Online Payments Awaiting Verification</h2>
      </div>

      {actionError && <p className="px-5 pt-3 text-sm text-red-600">{actionError}</p>}

      {payments.length === 0 ? (
        <p className="p-5 text-sm text-gray-500">Nothing pending. All caught up.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {payments.map((payment: PaymentDetail) => (
            <li key={payment.payment_id} className="px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {payment.customer_name}{' '}
                    <span className="font-normal text-gray-500">({payment.customer_number})</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {MODE_LABELS[payment.payment_mode] ?? payment.payment_mode} · ₹
                    {payment.amount.toFixed(2)} ·{' '}
                    {new Date(payment.submitted_date).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => approveMutation.mutate(payment.payment_id)}
                    disabled={approveMutation.isPending}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActionError(null)
                      setRejectingId(payment.payment_id)
                      setRemarks('')
                    }}
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    Reject
                  </button>
                </div>
              </div>

              {rejectingId === payment.payment_id && (
                <div className="mt-3 rounded-lg bg-gray-50 p-3">
                  <label className="block text-xs font-medium text-gray-700">
                    Reason for rejection
                    <textarea
                      value={remarks}
                      onChange={(event) => setRemarks(event.target.value)}
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                      placeholder="e.g. Amount not found in bank statement"
                    />
                  </label>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => rejectMutation.mutate(payment.payment_id)}
                      disabled={rejectMutation.isPending}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Reject'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectingId(null)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
