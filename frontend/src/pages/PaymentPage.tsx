import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, fetchSubscription, submitPayment, type PaymentMode } from '../api'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const APP_OPTIONS: { mode: PaymentMode; label: string; linkKey: 'gpay' | 'phonepe' | 'paytm' }[] = [
  { mode: 'upi_gpay', label: 'Google Pay', linkKey: 'gpay' },
  { mode: 'upi_phonepe', label: 'PhonePe', linkKey: 'phonepe' },
  { mode: 'upi_paytm', label: 'Paytm', linkKey: 'paytm' },
]

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-3 py-2">
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm ${
          done ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
        }`}
      >
        {done ? '✔' : '⏳'}
      </span>
      <span className={done ? 'text-gray-900' : 'text-gray-500'}>{label}</span>
    </li>
  )
}

export default function PaymentPage() {
  const { token } = useParams<{ token: string }>()
  const queryClient = useQueryClient()
  const [selectedApp, setSelectedApp] = useState<(typeof APP_OPTIONS)[number]>(APP_OPTIONS[0])
  const [hasOpenedApp, setHasOpenedApp] = useState(false)

  const query = useQuery({
    queryKey: ['subscription', token],
    queryFn: () => fetchSubscription(token!),
    enabled: Boolean(token),
    retry: false,
  })

  const payMutation = useMutation({
    mutationFn: () => submitPayment(token!, selectedApp.mode),
    onSuccess: (data) => {
      queryClient.setQueryData(['subscription', token], data)
    },
  })

  if (!token) {
    return <CenteredMessage title="Invalid link" body="No customer link was provided." />
  }

  if (query.isError) {
    const message =
      query.error instanceof ApiError ? query.error.message : 'Something went wrong. Please try again.'
    return <CenteredMessage title="Unable to load payment page" body={message} />
  }

  if (query.isPending || !query.data) {
    return <CenteredMessage title="Loading..." body="Fetching your subscription details." />
  }

  const sub = query.data!
  const monthLabel = `${MONTH_NAMES[sub.month - 1]} ${sub.year}`
  const dueDateLabel = new Date(sub.due_date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const isPending = sub.payment_status === 'pending'
  const selectedLink = sub.upi_links?.[selectedApp.linkKey] ?? null

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-6 bg-gray-50 p-6">
      <header className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500">{sub.customer_number}</p>
        <h1 className="text-xl font-semibold text-gray-900">{sub.customer_name}</h1>
        <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-gray-500">Month</dt>
          <dd className="text-right font-medium text-gray-900">{monthLabel}</dd>
          <dt className="text-gray-500">Plan</dt>
          <dd className="text-right font-medium text-gray-900">{sub.plan_name}</dd>
          <dt className="text-gray-500">Amount</dt>
          <dd className="text-right font-medium text-gray-900">₹{sub.amount.toFixed(2)}</dd>
          <dt className="text-gray-500">Due Date</dt>
          <dd className="text-right font-medium text-gray-900">{dueDateLabel}</dd>
        </dl>
      </header>

      {isPending ? (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Choose a payment app</h2>
          <div className="flex flex-col gap-2">
            {APP_OPTIONS.map((option) => (
              <label
                key={option.mode}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm ${
                  selectedApp.mode === option.mode
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="payment-app"
                  checked={selectedApp.mode === option.mode}
                  onChange={() => {
                    setSelectedApp(option)
                    setHasOpenedApp(false)
                  }}
                />
                {option.label}
              </label>
            ))}
          </div>

          <a
            href={selectedLink ?? undefined}
            onClick={(event) => {
              if (!selectedLink) {
                event.preventDefault()
                return
              }
              setHasOpenedApp(true)
            }}
            aria-disabled={!selectedLink}
            className={`mt-4 block w-full rounded-lg py-3 text-center text-sm font-semibold text-white ${
              selectedLink ? 'bg-blue-600 hover:bg-blue-700' : 'cursor-not-allowed bg-gray-300'
            }`}
          >
            {selectedLink ? 'Pay Now' : 'Payment app not configured'}
          </a>

          {hasOpenedApp && (
            <div className="mt-6 border-t border-gray-100 pt-6">
              <p className="mb-3 text-sm text-gray-700">Did you complete the payment?</p>
              <button
                type="button"
                onClick={() => payMutation.mutate()}
                disabled={payMutation.isPending}
                className="w-full rounded-lg bg-green-600 py-3 text-center text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
              >
                {payMutation.isPending ? 'Submitting...' : 'YES, I have paid'}
              </button>
              {payMutation.isError && (
                <p className="mt-2 text-sm text-red-600">
                  {payMutation.error instanceof ApiError
                    ? payMutation.error.message
                    : 'Could not submit payment. Please try again.'}
                </p>
              )}
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-gray-900">{monthLabel} Subscription</h2>
          <ul className="divide-y divide-gray-100">
            <ChecklistItem done label="Payment Submitted" />
            <ChecklistItem done={sub.payment_status === 'verified'} label="Payment Verified" />
            <ChecklistItem done={sub.subscription_status === 'active'} label="Subscription Active" />
          </ul>
          {sub.payment_status === 'verified' && sub.subscription_status === 'active' && (
            <p className="mt-4 rounded-lg bg-green-50 p-3 text-center text-sm font-medium text-green-700">
              Completed
            </p>
          )}
        </section>
      )}
    </div>
  )
}

function CenteredMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        <p className="mt-2 text-sm text-gray-500">{body}</p>
      </div>
    </div>
  )
}
