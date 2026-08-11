import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import type { UserRole } from '../lib/authApi'

export default function RequireRole({ role, children }: { role: UserRole; children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role !== role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900">Not authorized</h1>
          <p className="mt-2 text-sm text-gray-500">
            You're signed in as {user.name} ({user.role}), but this page is for {role}s only.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
