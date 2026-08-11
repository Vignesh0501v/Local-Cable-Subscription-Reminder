import { ApiError } from '../api'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

export type UserRole = 'admin' | 'operator' | 'collector'

export interface AuthUser {
  id: number
  name: string
  email: string
  phone: string
  role: UserRole
  status: 'active' | 'disabled'
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const message = body?.detail ?? `Request failed with status ${res.status}`
    throw new ApiError(res.status, typeof message === 'string' ? message : JSON.stringify(message))
  }
  return res.json() as Promise<T>
}

export function login(email: string, password: string): Promise<{ access_token: string }> {
  return fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }).then((res) => handle(res))
}

export function fetchCurrentUser(token: string): Promise<AuthUser> {
  return fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => handle(res))
}

export function authFetch<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  }).then((res) => handle(res))
}

export { ApiError }
