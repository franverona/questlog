import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { password } = body

  const secret = process.env.API_SECRET
  if (!secret) {
    return NextResponse.json({ message: 'Server misconfiguration' }, { status: 500 })
  }

  let isValid = false
  try {
    const a = Buffer.from(String(password ?? ''))
    const b = Buffer.from(secret)
    if (a.length === b.length) {
      isValid = timingSafeEqual(a, b)
    }
  } catch {
    isValid = false
  }

  if (!isValid) {
    return NextResponse.json({ message: 'Invalid password' }, { status: 401 })
  }

  await createSession()
  return NextResponse.json({ ok: true })
}
