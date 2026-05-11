import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { login as apiLogin, register as apiRegister, logout as apiLogout, refreshTokens } from '@/api/auth'
import { setAccessToken } from '@/api/client'

interface AuthContextValue {
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // On mount: try to restore session from refresh token in localStorage
  useEffect(() => {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      setIsLoading(false)
      return
    }
    refreshTokens()
      .then(() => setIsAuthenticated(true))
      .catch(() => {
        // Refresh token expired or invalid — clear it
        localStorage.removeItem('refresh_token')
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    await apiLogin(email, password)
    setIsAuthenticated(true)
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    await apiRegister(email, password)
    setIsAuthenticated(true)
  }, [])

  const logout = useCallback(() => {
    apiLogout()
    setAccessToken(null)
    setIsAuthenticated(false)
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
