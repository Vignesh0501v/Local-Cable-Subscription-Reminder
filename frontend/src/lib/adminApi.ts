import { authFetch } from './authApi'

// ---- Dashboard ----

export interface AdminDashboard {
  total_customers: number
  active_customers: number
  pending_payment_count: number
  pending_verification_count: number
  pending_subscription_count: number
  revenue_this_month: number
  collections_today: number
}

export interface ActivityItem {
  id: number
  user_name: string | null
  action: string
  table_name: string
  record_id: number
  timestamp: string
}

export function fetchAdminDashboard(token: string): Promise<AdminDashboard> {
  return authFetch(token, '/admin/dashboard')
}

export function fetchActivity(token: string, limit = 20): Promise<ActivityItem[]> {
  return authFetch(token, `/admin/activity?limit=${limit}`)
}

// ---- Staff (collector / operator) ----

export type StaffRole = 'collector' | 'operator'

export interface Staff {
  id: number
  name: string
  email: string
  phone: string
  role: StaffRole
  status: 'active' | 'disabled'
}

export interface StaffCreateInput {
  name: string
  email: string
  phone: string
  password: string
  role: StaffRole
}

export function fetchStaff(token: string, role?: StaffRole): Promise<Staff[]> {
  const qs = role ? `?role=${role}` : ''
  return authFetch(token, `/staff${qs}`)
}

export function createStaff(token: string, payload: StaffCreateInput): Promise<Staff> {
  return authFetch(token, '/staff', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateStaff(
  token: string,
  id: number,
  payload: { name?: string; phone?: string }
): Promise<Staff> {
  return authFetch(token, `/staff/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export function setStaffStatus(token: string, id: number, enable: boolean): Promise<Staff> {
  return authFetch(token, `/staff/${id}/${enable ? 'enable' : 'disable'}`, { method: 'PATCH' })
}

export function resetStaffPassword(token: string, id: number, newPassword: string): Promise<void> {
  return authFetch(token, `/staff/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ new_password: newPassword }),
  })
}

// ---- Plans ----

export interface Plan {
  id: number
  plan_name: string
  price: number
  description: string | null
}

export interface PlanInput {
  plan_name: string
  price: number
  description?: string | null
}

export function fetchPlans(token: string): Promise<Plan[]> {
  return authFetch(token, '/plans')
}

export function createPlan(token: string, payload: PlanInput): Promise<Plan> {
  return authFetch(token, '/plans', { method: 'POST', body: JSON.stringify(payload) })
}

export function updatePlan(token: string, id: number, payload: Partial<PlanInput>): Promise<Plan> {
  return authFetch(token, `/plans/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export function deletePlan(token: string, id: number): Promise<void> {
  return authFetch(token, `/plans/${id}`, { method: 'DELETE' })
}

// ---- Customers (admin) ----

export interface AdminCustomer {
  id: number
  customer_number: string
  name: string
  mobile: string
  address: string | null
  plan_id: number
  monthly_amount: number
  collector_id: number | null
  status: 'active' | 'disabled'
  access_token: string
  created_at: string
}

export interface CustomerInput {
  customer_number: string
  name: string
  mobile: string
  address?: string | null
  plan_id: number
  monthly_amount?: number | null
  collector_id?: number | null
}

export function fetchCustomers(token: string, search?: string): Promise<AdminCustomer[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : ''
  return authFetch(token, `/customers${qs}`)
}

export function createCustomer(token: string, payload: CustomerInput): Promise<AdminCustomer> {
  return authFetch(token, '/customers', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateCustomer(
  token: string,
  id: number,
  payload: Partial<CustomerInput>
): Promise<AdminCustomer> {
  return authFetch(token, `/customers/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export function setCustomerStatus(token: string, id: number, enable: boolean): Promise<AdminCustomer> {
  return authFetch(token, `/customers/${id}/${enable ? 'enable' : 'disable'}`, { method: 'PATCH' })
}

export function deleteCustomer(token: string, id: number): Promise<void> {
  return authFetch(token, `/customers/${id}`, { method: 'DELETE' })
}

// ---- UPI Settings ----

export interface UpiSettings {
  id: number
  gpay_upi_id: string | null
  phonepe_upi_id: string | null
  paytm_upi_id: string | null
  merchant_name: string
  merchant_phone: string
  payment_note: string | null
}

export interface UpiSettingsInput {
  gpay_upi_id?: string | null
  phonepe_upi_id?: string | null
  paytm_upi_id?: string | null
  merchant_name: string
  merchant_phone: string
  payment_note?: string | null
}

export function fetchSettings(token: string): Promise<UpiSettings> {
  return authFetch(token, '/settings')
}

export function updateSettings(token: string, payload: UpiSettingsInput): Promise<UpiSettings> {
  return authFetch(token, '/settings', { method: 'PUT', body: JSON.stringify(payload) })
}
