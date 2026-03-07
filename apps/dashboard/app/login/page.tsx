import { LoginForm } from './login-form'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function LoginPage() {
  const session = await getSession()
  if (session) redirect('/dashboard')

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 p-8 border rounded-lg shadow-sm bg-card">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Questlog</h1>
          <p className="text-sm text-muted-foreground">Sign in to your dashboard</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
