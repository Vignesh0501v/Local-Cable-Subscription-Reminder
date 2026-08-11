import { authFetch } from './authApi'

export type PaymentMode = 'upi_gpay' | 'upi_phonepe' | 'upi_paytm' | 'cash'

export interface QueueItem {
  subscription_id: number
  customer_id: number
  customer_number: string
  customer_name: string
  mobile: string
  plan_name: string
  amount: number
  month: number
  year: number
  verified_date: string | null
  payment_mode: PaymentMode | null
}

export interface OperatorDashboard {
  waiting_for_subscription_count: number
  completed_today_count: number
}

export function fetchOperatorDashboard(token: string): Promise<OperatorDashboard> {
  return authFetch(token, '/operator/dashboard')
}

export function fetchQueue(token: string): Promise<QueueItem[]> {
  return authFetch(token, '/operator/queue')
}

export function fetchCompletedToday(token: string): Promise<QueueItem[]> {
  return authFetch(token, '/operator/subscriptions/completed-today')
}

export function activateSubscription(token: string, subscriptionId: number): Promise<QueueItem> {
  return authFetch(token, `/operator/subscriptions/${subscriptionId}/activate`, { method: 'POST' })
}
