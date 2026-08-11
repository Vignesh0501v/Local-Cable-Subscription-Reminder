import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/AuthContext'
import {
  createCustomer,
  deleteCustomer,
  fetchCustomers,
  fetchPlans,
  fetchStaff,
  setCustomerStatus,
  updateCustomer,
  type AdminCustomer,
  type CustomerInput,
} from '../../lib/adminApi'
import { sendSingleReminder } from '../../lib/notificationApi'
import { ApiError } from '../../lib/authApi'

const EMPTY_FORM: CustomerInput = {
  customer_number: '',
  name: '',
  mobile: '',
  address: '',
  plan_id: 0,
  monthly_amount: undefined,
  collector_id: undefined,
}

export default function Customers() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<AdminCustomer | 'new' | null>(null)
  const [form, setForm] = useState<CustomerInput>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)

  const customersQuery = useQuery({
    queryKey: ['admin', 'customers', search],
    queryFn: () => fetchCustomers(token!, search || undefined),
    enabled: Boolean(token),
  })
  const plansQuery = useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: () => fetchPlans(token!),
    enabled: Boolean(token),
  })
  const collectorsQuery = useQuery({
    queryKey: ['admin', 'staff', 'collector'],
    queryFn: () => fetchStaff(token!, 'collector'),
    enabled: Boolean(token),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
  }

  const createMutation = useMutation({
    mutationFn: (payload: CustomerInput) => createCustomer(token!, payload),
    onSuccess: () => {
      invalidate()
      setEditing(null)
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Could not create customer.'),
  })

  const updateMutation = useMutation({
    mutationFn: (payload: { id: number; data: Partial<CustomerInput> }) =>
      updateCustomer(token!, payload.id, payload.data),
    onSuccess: () => {
      invalidate()
      setEditing(null)
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Could not update customer.'),
  })

  const statusMutation = useMutation({
    mutationFn: (payload: { id: number; enable: boolean }) =>
      setCustomerStatus(token!, payload.id, payload.enable),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCustomer(token!, id),
    onSuccess: invalidate,
    onError: (err) => alert(err instanceof ApiError ? err.message : 'Could not delete customer.'),
  })

  const reminderMutation = useMutation({
    mutationFn: (id: number) => sendSingleReminder(token!, id),
    onSuccess: (result) => alert(`Reminder sent to ${result.customer_name} (SMS: ${result.sms_status}, WhatsApp: ${result.whatsapp_status}).`),
    onError: (err) => alert(err instanceof ApiError ? err.message : 'Could not send reminder.'),
  })

  function openNew() {
    setForm(EMPTY_FORM)
    setFormError(null)
    setEditing('new')
  }

  function openEdit(customer: AdminCustomer) {
    setForm({
      customer_number: customer.customer_number,
      name: customer.name,
      mobile: customer.mobile,
      address: customer.address ?? '',
      plan_id: customer.plan_id,
      monthly_amount: customer.monthly_amount,
      collector_id: customer.collector_id ?? undefined,
    })
    setFormError(null)
    setEditing(customer)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    if (editing === 'new') {
      createMutation.mutate(form)
    } else if (editing) {
      updateMutation.mutate({ id: editing.id, data: form })
    }
  }

  const plans = plansQuery.data ?? []
  const collectors = collectorsQuery.data ?? []
  const planName = (id: number) => plans.find((p) => p.id === id)?.plan_name ?? `Plan #${id}`
  const collectorName = (id: number | null) =>
    id ? (collectors.find((c) => c.id === id)?.name ?? `#${id}`) : '—'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, mobile, or customer number"
          className="w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={openNew}
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Add Customer
        </button>
      </div>

      {editing && (
        <form onSubmit={handleSubmit} className="grid gap-3 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-2">
          <h2 className="col-span-full text-sm font-semibold text-gray-900">
            {editing === 'new' ? 'Add Customer' : `Edit ${editing.name}`}
          </h2>

          <label className="text-xs font-medium text-gray-700">
            Customer Number
            <input
              required
              value={form.customer_number}
              onChange={(e) => setForm({ ...form, customer_number: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-xs font-medium text-gray-700">
            Name
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-xs font-medium text-gray-700">
            Mobile
            <input
              required
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-xs font-medium text-gray-700">
            Address
            <input
              value={form.address ?? ''}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-xs font-medium text-gray-700">
            Plan
            <select
              required
              value={form.plan_id || ''}
              onChange={(e) => setForm({ ...form, plan_id: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Select a plan
              </option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.plan_name} (₹{plan.price})
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-medium text-gray-700">
            Collector
            <select
              value={form.collector_id ?? ''}
              onChange={(e) =>
                setForm({ ...form, collector_id: e.target.value ? Number(e.target.value) : undefined })
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Unassigned</option>
              {collectors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          {formError && <p className="col-span-full text-sm text-red-600">{formError}</p>}

          <div className="col-span-full flex gap-2">
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 text-xs text-gray-500">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Mobile</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Collector</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {customersQuery.data?.map((customer) => (
              <tr key={customer.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{customer.name}</p>
                  <p className="text-xs text-gray-500">{customer.customer_number}</p>
                </td>
                <td className="px-4 py-3">{customer.mobile}</td>
                <td className="px-4 py-3">{planName(customer.plan_id)}</td>
                <td className="px-4 py-3">{collectorName(customer.collector_id)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      customer.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {customer.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(customer)}
                      className="text-xs font-medium text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    {customer.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => reminderMutation.mutate(customer.id)}
                        disabled={reminderMutation.isPending}
                        className="text-xs font-medium text-indigo-600 hover:underline disabled:text-gray-400"
                      >
                        Send Reminder
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        statusMutation.mutate({ id: customer.id, enable: customer.status !== 'active' })
                      }
                      className="text-xs font-medium text-amber-600 hover:underline"
                    >
                      {customer.status === 'active' ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete ${customer.name}? This cannot be undone.`)) {
                          deleteMutation.mutate(customer.id)
                        }
                      }}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {customersQuery.data?.length === 0 && (
          <p className="p-5 text-sm text-gray-500">No customers found.</p>
        )}
      </div>
    </div>
  )
}
