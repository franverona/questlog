'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { Preferences } from '@/hooks/use-preferences'

const STORAGE_KEY = 'questlog:preferences'

const DEFAULTS: Preferences = {
  theme: 'system',
  dateFormat: 'relative',
}

interface PreferencesContextValue {
  preferences: Preferences
  updatePreferences: (updates: Partial<Preferences>) => void
}

const PreferencesContext = createContext<PreferencesContextValue>({
  preferences: DEFAULTS,
  updatePreferences: () => undefined,
})

export function usePreferencesContext() {
  return useContext(PreferencesContext)
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(() => {
    if (typeof window === 'undefined') return DEFAULTS
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return { ...DEFAULTS, ...(JSON.parse(stored) as Partial<Preferences>) }
      }
    } catch {
      // ignore
    }
    return DEFAULTS
  })

  useEffect(() => {
    function apply(theme: string) {
      const isDark =
        theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      document.documentElement.classList.toggle('dark', isDark)
    }

    apply(preferences.theme)

    if (preferences.theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => apply('system')
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [preferences.theme])

  function updatePreferences(updates: Partial<Preferences>) {
    setPreferences((prev) => {
      const next = { ...prev, ...updates }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  return (
    <PreferencesContext.Provider value={{ preferences, updatePreferences }}>
      {children}
    </PreferencesContext.Provider>
  )
}
