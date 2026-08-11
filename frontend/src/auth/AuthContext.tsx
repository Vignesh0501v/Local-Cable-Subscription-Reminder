import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { fetchCurrentUser, login as apiLogin, type AuthUser } from '../lib/authApi'

const STORAGE_KEY = 'cable_auth_token'

interface AuthContextValue {
  token: string | null
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY))
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    fetchCurrentUser(token)
      .then(setUser)
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY)
        setToken(null)
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [token])

  async function login(email: string, password: string) {
    const { access_token } = await apiLogin(email, password)
    const currentUser = await fetchCurrentUser(access_token)
    localStorage.setItem(STORAGE_KEY, access_token)
    setToken(access_token)
    setUser(currentUser)
    return currentUser
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY)
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout }}>{children}</AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
