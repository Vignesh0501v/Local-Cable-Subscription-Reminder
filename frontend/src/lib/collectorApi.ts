import { authFetch } from './authApi'

export interface CollectorCustomer {
  id: number
  customer_number: string
  name: string
  mobile: string
  address: string | null
  monthly_amount: number
}

export type PaymentMode = 'upi_gpay' | 'upi_phonepe' | 'upi_paytm' | 'cash'

export interface PaymentDetail {
  payment_id: number
  subscription_id: number
  customer_id: number
  customer_number: string
  customer_name: string
  mobile: string
  payment_mode: PaymentMode
  amount: number
  submitted_date: string
  approved_date: string | null
  month: number
  year: number
}

export interface CollectorDashboard {
  pending_verification_count: number
  completed_today_count: number
  todays_total_collection: number
  todays_cash_collection: number
  todays_online_collection: number
}

export function fetchDashboard(token: string): Promise<CollectorDashboard> {
  return authFetch(token, '/collector/dashboard')
}

export function fetchAssignedCustomers(token: string, search?: string): Promise<CollectorCustomer[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : ''
  return authFetch(token, `/collector/customers${qs}`)
}

export function fetchPendingPayments(token: string): Promise<PaymentDetail[]> {
  return authFetch(token, '/collector/payments/pending')
}

export function fetchCompletedToday(token: string): Promise<PaymentDetail[]> {
  return authFetch(token, '/collector/payments/completed-today')
}

export function approvePayment(token: string, paymentId: number): Promise<PaymentDetail> {
  return authFetch(token, `/collector/payments/${paymentId}/approve`, { method: 'POST' })
}

export function rejectPayment(token: string, paymentId: number, remarks: string): Promise<PaymentDetail> {
  return authFetch(token, `/collector/payments/${paymentId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ remarks: remarks || null }),
  })
}

export interface CashPaymentInput {
  customer_id: number
  amount?: number
  payment_date?: string
  remarks?: string
}

export function recordCashPayment(token: string, payload: CashPaymentInput): Promise<PaymentDetail> {
  return authFetch(token, '/collector/cash-payments', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
