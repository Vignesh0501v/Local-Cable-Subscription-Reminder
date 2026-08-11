const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

export type PaymentStatus = 'pending' | 'submitted' | 'verified'
export type SubscriptionStatus = 'pending' | 'active'
export type PaymentMode = 'upi_gpay' | 'upi_phonepe' | 'upi_paytm' | 'cash'

export interface UpiLinks {
  gpay: string | null
  phonepe: string | null
  paytm: string | null
  generic: string | null
}

export interface PublicSubscription {
  customer_name: string
  customer_number: string
  plan_name: string
  month: number
  year: number
  amount: number
  due_date: string
  payment_status: PaymentStatus
  subscription_status: SubscriptionStatus
  upi_links: UpiLinks | null
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const message = body?.detail ?? `Request failed with status ${res.status}`
    throw new ApiError(res.status, typeof message === 'string' ? message : JSON.stringify(message))
  }
  return res.json() as Promise<T>
}

export function fetchSubscription(token: string): Promise<PublicSubscription> {
  return fetch(`${API_BASE}/public/subscription/${token}`).then((res) => handle(res))
}

export function submitPayment(token: string, paymentMode: PaymentMode): Promise<PublicSubscription> {
  return fetch(`${API_BASE}/public/subscription/${token}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payment_mode: paymentMode }),
  }).then((res) => handle(res))
}
