import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { settingsApi } from '@/api/settings'
import type { UserSettings, UserSettingsUpdate } from '@/api/types'
import { useAuth } from './AuthContext'

interface SettingsContextValue {
  settings: UserSettings | null
  isLoading: boolean
  refresh: () => Promise<void>
  update: (payload: UserSettingsUpdate) => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await settingsApi.get()
      setSettings(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const update = useCallback(async (payload: UserSettingsUpdate) => {
    const data = await settingsApi.update(payload)
    setSettings(data)
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      refresh()
    } else {
      setSettings(null)
    }
  }, [isAuthenticated, refresh])

  return (
    <SettingsContext.Provider value={{ settings, isLoading, refresh, update }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider')
  return ctx
}
