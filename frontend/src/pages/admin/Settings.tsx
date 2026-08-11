import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/AuthContext'
import { fetchSettings, updateSettings, type UpiSettingsInput } from '../../lib/adminApi'
import { ApiError } from '../../lib/authApi'

const EMPTY_FORM: UpiSettingsInput = {
  gpay_upi_id: '',
  phonepe_upi_id: '',
  paytm_upi_id: '',
  merchant_name: '',
  merchant_phone: '',
  payment_note: '',
}

export default function Settings() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<UpiSettingsInput>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const query = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => fetchSettings(token!),
    enabled: Boolean(token),
    retry: false,
  })

  useEffect(() => {
    if (query.data) {
      setForm({
        gpay_upi_id: query.data.gpay_upi_id ?? '',
        phonepe_upi_id: query.data.phonepe_upi_id ?? '',
        paytm_upi_id: query.data.paytm_upi_id ?? '',
        merchant_name: query.data.merchant_name,
        merchant_phone: query.data.merchant_phone,
        payment_note: query.data.payment_note ?? '',
      })
    }
  }, [query.data])

  const saveMutation = useMutation({
    mutationFn: (payload: UpiSettingsInput) => updateSettings(token!, payload),
    onSuccess: () => {
      setError(null)
      setSuccess(true)
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] })
    },
    onError: (err) => {
      setSuccess(false)
      setError(err instanceof ApiError ? err.message : 'Could not save settings.')
    },
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    saveMutation.mutate(form)
  }

  if (query.isPending) {
    return <p className="text-sm text-gray-500">Loading...</p>
  }

  return (
    <form onSubmit={handleSubmit} className="grid max-w-lg gap-3 rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900">UPI Settings</h2>
      {query.isError && (
        <p className="text-sm text-amber-600">
          Not configured yet — fill this in and save to enable customer payment links.
        </p>
      )}

      <label className="text-xs font-medium text-gray-700">
        Google Pay UPI ID
        <input
          value={form.gpay_upi_id ?? ''}
          onChange={(e) => setForm({ ...form, gpay_upi_id: e.target.value })}
          placeholder="business@okaxis"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="text-xs font-medium text-gray-700">
        PhonePe UPI ID
        <input
          value={form.phonepe_upi_id ?? ''}
          onChange={(e) => setForm({ ...form, phonepe_upi_id: e.target.value })}
          placeholder="business@ybl"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="text-xs font-medium text-gray-700">
        Paytm UPI ID
        <input
          value={form.paytm_upi_id ?? ''}
          onChange={(e) => setForm({ ...form, paytm_upi_id: e.target.value })}
          placeholder="business@paytm"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="text-xs font-medium text-gray-700">
        Merchant Name
        <input
          required
          value={form.merchant_name}
          onChange={(e) => setForm({ ...form, merchant_name: e.target.value })}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="text-xs font-medium text-gray-700">
        Merchant Phone
        <input
          required
          value={form.merchant_phone}
          onChange={(e) => setForm({ ...form, merchant_phone: e.target.value })}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="text-xs font-medium text-gray-700">
        Payment Note
        <input
          value={form.payment_note ?? ''}
          onChange={(e) => setForm({ ...form, payment_note: e.target.value })}
          placeholder="Monthly cable subscription"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-700">Settings saved.</p>}

      <button
        type="submit"
        disabled={saveMutation.isPending}
        className="mt-1 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
      </button>
    </form>
  )
}
