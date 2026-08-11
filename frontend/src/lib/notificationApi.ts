import { authFetch } from './authApi'

export type NotificationType = 'sms' | 'whatsapp'
export type NotificationStatus = 'queued' | 'sent' | 'failed' | 'simulated'

export interface NotificationItem {
  id: number
  customer_id: number
  customer_name: string
  customer_number: string
  type: NotificationType
  message: string
  status: NotificationStatus
  sent_time: string | null
}

export interface SendReminderResult {
  customer_id: number
  customer_name: string
  sms_status: NotificationStatus
  whatsapp_status: NotificationStatus
}

export interface SendRemindersResponse {
  total_customers: number
  results: SendReminderResult[]
}

export function fetchNotifications(
  token: string,
  filters: { type?: NotificationType; status?: NotificationStatus; customerId?: number } = {}
): Promise<NotificationItem[]> {
  const params = new URLSearchParams()
  if (filters.type) params.set('type', filters.type)
  if (filters.status) params.set('status', filters.status)
  if (filters.customerId) params.set('customer_id', String(filters.customerId))
  const qs = params.toString() ? `?${params.toString()}` : ''
  return authFetch(token, `/admin/notifications${qs}`)
}

export function sendAllReminders(token: string): Promise<SendRemindersResponse> {
  return authFetch(token, '/admin/notifications/send-reminders', { method: 'POST' })
}

export function sendSingleReminder(token: string, customerId: number): Promise<SendReminderResult> {
  return authFetch(token, `/admin/notifications/send-reminders/${customerId}`, { method: 'POST' })
}
