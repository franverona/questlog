'use client'

export type Theme = 'light' | 'dark' | 'system'
export type DateFormat = 'relative' | 'absolute'

export interface Preferences {
  theme: Theme
  dateFormat: DateFormat
}

export { usePreferencesContext as usePreferences } from '@/components/preferences-provider'
