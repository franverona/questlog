import type { Metadata } from 'next'
import './theme.css'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { PreferencesProvider } from '@/components/preferences-provider'

export const metadata: Metadata = {
  title: 'Questlog — Gamification Dashboard',
  description: 'Gamification-as-a-Service management dashboard',
  icons: [{ rel: 'icon', url: '/favicon.png', type: 'image/png' }],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <PreferencesProvider>
          {children}
          <Toaster />
        </PreferencesProvider>
      </body>
    </html>
  )
}
