import { authFetch } from './authApi'

export interface RevenueReportItem {
  month: number
  year: number
  revenue: number
  cash_amount: number
  online_amount: number
  payment_count: number
}

export type PaymentMode = 'upi_gpay' | 'upi_phonepe' | 'upi_paytm' | 'cash'

export interface PaymentReportItem {
  payment_id: number
  customer_id: number
  customer_number: string
  customer_name: string
  collector_id: number | null
  collector_name: string | null
  payment_mode: PaymentMode
  amount: number
  submitted_date: string
  approved_date: string | null
  is_approved: boolean
  month: number
  year: number
}

export type PaymentStatus = 'pending' | 'submitted' | 'verified'
export type SubscriptionStatus = 'pending' | 'active'

export interface PendingSubscriptionItem {
  subscription_id: number
  customer_id: number
  customer_number: string
  customer_name: string
  mobile: string
  plan_name: string
  amount: number
  month: number
  year: number
  payment_status: PaymentStatus
  subscription_status: SubscriptionStatus
}

export interface AuditLogItem {
  id: number
  user_name: string | null
  action: string
  table_name: string
  record_id: number
  old_value: string | null
  new_value: string | null
  timestamp: string
}

export interface AuditLogPage {
  total: number
  items: AuditLogItem[]
}

export function fetchRevenueReport(token: string, months = 6): Promise<RevenueReportItem[]> {
  return authFetch(token, `/admin/reports/revenue?months=${months}`)
}

export interface PaymentReportFilters {
  dateFrom?: string
  dateTo?: string
  paymentMode?: PaymentMode
  approvedOnly?: boolean
}

export function fetchPaymentReport(
  token: string,
  filters: PaymentReportFilters = {}
): Promise<PaymentReportItem[]> {
  const params = new URLSearchParams()
  if (filters.dateFrom) params.set('date_from', filters.dateFrom)
  if (filters.dateTo) params.set('date_to', filters.dateTo)
  if (filters.paymentMode) params.set('payment_mode', filters.paymentMode)
  if (filters.approvedOnly) params.set('approved_only', 'true')
  const qs = params.toString() ? `?${params.toString()}` : ''
  return authFetch(token, `/admin/reports/payments${qs}`)
}

export function fetchPendingSubscriptions(token: string): Promise<PendingSubscriptionItem[]> {
  return authFetch(token, '/admin/reports/pending-subscriptions')
}

export interface AuditLogFilters {
  tableName?: string
  action?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
  offset?: number
}

export function fetchAuditLogs(token: string, filters: AuditLogFilters = {}): Promise<AuditLogPage> {
  const params = new URLSearchParams()
  if (filters.tableName) params.set('table_name', filters.tableName)
  if (filters.action) params.set('action', filters.action)
  if (filters.dateFrom) params.set('date_from', filters.dateFrom)
  if (filters.dateTo) params.set('date_to', filters.dateTo)
  params.set('limit', String(filters.limit ?? 25))
  params.set('offset', String(filters.offset ?? 0))
  return authFetch(token, `/admin/reports/audit-logs?${params.toString()}`)
}
