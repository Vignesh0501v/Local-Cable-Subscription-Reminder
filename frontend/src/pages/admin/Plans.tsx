import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/AuthContext'
import { createPlan, deletePlan, fetchPlans, updatePlan, type Plan, type PlanInput } from '../../lib/adminApi'
import { ApiError } from '../../lib/authApi'

const EMPTY_FORM: PlanInput = { plan_name: '', price: 0, description: '' }

export default function Plans() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Plan | 'new' | null>(null)
  const [form, setForm] = useState<PlanInput>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)

  const plansQuery = useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: () => fetchPlans(token!),
    enabled: Boolean(token),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] })
  }

  const createMutation = useMutation({
    mutationFn: (payload: PlanInput) => createPlan(token!, payload),
    onSuccess: () => {
      invalidate()
      setEditing(null)
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Could not create plan.'),
  })

  const updateMutation = useMutation({
    mutationFn: (payload: { id: number; data: PlanInput }) => updatePlan(token!, payload.id, payload.data),
    onSuccess: () => {
      invalidate()
      setEditing(null)
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Could not update plan.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePlan(token!, id),
    onSuccess: invalidate,
    onError: (err) => alert(err instanceof ApiError ? err.message : 'Could not delete plan.'),
  })

  function openNew() {
    setForm(EMPTY_FORM)
    setFormError(null)
    setEditing('new')
  }

  function openEdit(plan: Plan) {
    setForm({ plan_name: plan.plan_name, price: plan.price, description: plan.description ?? '' })
    setFormError(null)
    setEditing(plan)
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Plans</h2>
        <button
          type="button"
          onClick={openNew}
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Add Plan
        </button>
      </div>

      {editing && (
        <form onSubmit={handleSubmit} className="grid gap-3 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-2">
          <h3 className="col-span-full text-sm font-semibold text-gray-900">
            {editing === 'new' ? 'Add Plan' : `Edit ${editing.plan_name}`}
          </h3>

          <label className="text-xs font-medium text-gray-700">
            Plan Name
            <input
              required
              value={form.plan_name}
              onChange={(e) => setForm({ ...form, plan_name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-xs font-medium text-gray-700">
            Price (₹/month)
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={form.price || ''}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="col-span-full text-xs font-medium text-gray-700">
            Description
            <textarea
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
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
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {plansQuery.data?.map((plan) => (
              <tr key={plan.id}>
                <td className="px-4 py-3 font-medium text-gray-900">{plan.plan_name}</td>
                <td className="px-4 py-3">₹{plan.price.toFixed(2)}</td>
                <td className="px-4 py-3 text-gray-500">{plan.description ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(plan)}
                      className="text-xs font-medium text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete ${plan.plan_name}?`)) deleteMutation.mutate(plan.id)
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
        {plansQuery.data?.length === 0 && <p className="p-5 text-sm text-gray-500">No plans yet.</p>}
      </div>
    </div>
  )
}
