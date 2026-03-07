import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Questlog — Gamification Dashboard',
  description: 'Gamification-as-a-Service management dashboard',
  icons: [{ rel: 'icon', url: '/favicon.png', type: 'image/png' }],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
