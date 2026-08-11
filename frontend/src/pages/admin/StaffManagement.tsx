import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/AuthContext'
import {
  createStaff,
  fetchStaff,
  resetStaffPassword,
  setStaffStatus,
  updateStaff,
  type Staff,
  type StaffRole,
} from '../../lib/adminApi'
import { ApiError } from '../../lib/authApi'

const EMPTY_FORM = { name: '', email: '', phone: '', password: '' }

export default function StaffManagement({ role }: { role: StaffRole }) {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [showNewForm, setShowNewForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [resettingId, setResettingId] = useState<number | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ name: '', phone: '' })

  const staffQuery = useQuery({
    queryKey: ['admin', 'staff', role],
    queryFn: () => fetchStaff(token!, role),
    enabled: Boolean(token),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['admin', 'staff', role] })
  }

  const createMutation = useMutation({
    mutationFn: () => createStaff(token!, { ...form, role }),
    onSuccess: () => {
      invalidate()
      setShowNewForm(false)
      setForm(EMPTY_FORM)
      setFormError(null)
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Could not create account.'),
  })

  const updateMutation = useMutation({
    mutationFn: (payload: { id: number; data: { name: string; phone: string } }) =>
      updateStaff(token!, payload.id, payload.data),
    onSuccess: () => {
      invalidate()
      setEditingId(null)
    },
  })

  const statusMutation = useMutation({
    mutationFn: (payload: { id: number; enable: boolean }) =>
      setStaffStatus(token!, payload.id, payload.enable),
    onSuccess: invalidate,
  })

  const resetMutation = useMutation({
    mutationFn: (payload: { id: number; newPassword: string }) =>
      resetStaffPassword(token!, payload.id, payload.newPassword),
    onSuccess: () => {
      setResettingId(null)
      setNewPassword('')
    },
  })

  function handleCreate(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    createMutation.mutate()
  }

  function openEdit(staff: Staff) {
    setEditingId(staff.id)
    setEditForm({ name: staff.name, phone: staff.phone })
  }

  const roleLabel = role === 'collector' ? 'Collector' : 'Operator'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">{roleLabel}s</h2>
        <button
          type="button"
          onClick={() => {
            setShowNewForm(true)
            setForm(EMPTY_FORM)
            setFormError(null)
          }}
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Add {roleLabel}
        </button>
      </div>

      {showNewForm && (
        <form
          onSubmit={handleCreate}
          className="grid gap-3 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-2"
        >
          <h3 className="col-span-full text-sm font-semibold text-gray-900">New {roleLabel}</h3>

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
            Email
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-xs font-medium text-gray-700">
            Phone
            <input
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-xs font-medium text-gray-700">
            Temporary Password
            <input
              type="text"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          {formError && <p className="col-span-full text-sm text-red-600">{formError}</p>}

          <div className="col-span-full flex gap-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowNewForm(false)}
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
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {staffQuery.data?.map((staff) => (
              <tr key={staff.id}>
                {editingId === staff.id ? (
                  <td colSpan={5} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                      />
                      <input
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => updateMutation.mutate({ id: staff.id, data: editForm })}
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-xs font-medium text-gray-600 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium text-gray-900">{staff.name}</td>
                    <td className="px-4 py-3">{staff.email}</td>
                    <td className="px-4 py-3">{staff.phone}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          staff.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {staff.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(staff)}
                          className="text-xs font-medium text-blue-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setResettingId(staff.id)
                            setNewPassword('')
                          }}
                          className="text-xs font-medium text-gray-600 hover:underline"
                        >
                          Reset Password
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            statusMutation.mutate({ id: staff.id, enable: staff.status !== 'active' })
                          }
                          className="text-xs font-medium text-amber-600 hover:underline"
                        >
                          {staff.status === 'active' ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                      {resettingId === staff.id && (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="New password"
                            minLength={8}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="rounded-lg border border-gray-300 px-2 py-1 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => resetMutation.mutate({ id: staff.id, newPassword })}
                            disabled={newPassword.length < 8 || resetMutation.isPending}
                            className="text-xs font-medium text-blue-600 hover:underline disabled:text-gray-400"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setResettingId(null)}
                            className="text-xs font-medium text-gray-500 hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {staffQuery.data?.length === 0 && (
          <p className="p-5 text-sm text-gray-500">No {roleLabel.toLowerCase()}s yet.</p>
        )}
      </div>
    </div>
  )
}
