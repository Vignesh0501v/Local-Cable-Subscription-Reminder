import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/AuthContext'
import {
  fetchAssignedCustomers,
  recordCashPayment,
  type CollectorCustomer,
} from '../../lib/collectorApi'
import { ApiError } from '../../lib/authApi'

export default function CashCollection() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<CollectorCustomer | null>(null)
  const [amount, setAmount] = useState('')
  const [remarks, setRemarks] = useState('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const customersQuery = useQuery({
    queryKey: ['collector', 'customers', search],
    queryFn: () => fetchAssignedCustomers(token!, search || undefined),
    enabled: Boolean(token),
  })

  const cashMutation = useMutation({
    mutationFn: () =>
      recordCashPayment(token!, {
        customer_id: selected!.id,
        amount: amount ? Number(amount) : undefined,
        remarks: remarks || undefined,
      }),
    onSuccess: (payment) => {
      setSuccessMessage(`Recorded ₹${payment.amount.toFixed(2)} cash payment for ${payment.customer_name}.`)
      setErrorMessage(null)
      setSelected(null)
      setAmount('')
      setRemarks('')
      queryClient.invalidateQueries({ queryKey: ['collector', 'dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['collector', 'payments', 'completed-today'] })
    },
    onError: (err) => {
      setSuccessMessage(null)
      setErrorMessage(err instanceof ApiError ? err.message : 'Could not record payment.')
    },
  })

  function selectCustomer(customer: CollectorCustomer) {
    setSelected(customer)
    setAmount(String(customer.monthly_amount))
    setSuccessMessage(null)
    setErrorMessage(null)
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">Search Customer</h2>
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name, mobile, or customer number"
          className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />

        <ul className="mt-3 max-h-80 divide-y divide-gray-100 overflow-y-auto">
          {customersQuery.isPending && <li className="py-3 text-sm text-gray-500">Loading...</li>}
          {customersQuery.data?.length === 0 && (
            <li className="py-3 text-sm text-gray-500">No customers found.</li>
          )}
          {customersQuery.data?.map((customer) => (
            <li key={customer.id}>
              <button
                type="button"
                onClick={() => selectCustomer(customer)}
                className={`w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-gray-50 ${
                  selected?.id === customer.id ? 'bg-blue-50' : ''
                }`}
              >
                <p className="font-medium text-gray-900">{customer.name}</p>
                <p className="text-xs text-gray-500">
                  {customer.customer_number} · {customer.mobile}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">Record Cash Payment</h2>

        {!selected ? (
          <p className="mt-3 text-sm text-gray-500">Select a customer from the search results.</p>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              cashMutation.mutate()
            }}
            className="mt-3 flex flex-col gap-3"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">{selected.name}</p>
              <p className="text-xs text-gray-500">{selected.customer_number}</p>
            </div>

            <label className="block text-xs font-medium text-gray-700">
              Amount
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-xs font-medium text-gray-700">
              Mode
              <input
                type="text"
                value="Cash"
                disabled
                className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500"
              />
            </label>

            <label className="block text-xs font-medium text-gray-700">
              Remarks
              <textarea
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Optional"
              />
            </label>

            <button
              type="submit"
              disabled={cashMutation.isPending}
              className="mt-1 w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {cashMutation.isPending ? 'Recording...' : 'Record Payment'}
            </button>
          </form>
        )}

        {successMessage && <p className="mt-3 text-sm text-green-700">{successMessage}</p>}
        {errorMessage && <p className="mt-3 text-sm text-red-600">{errorMessage}</p>}
      </div>
    </div>
  )
}
