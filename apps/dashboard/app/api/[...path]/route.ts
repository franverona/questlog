import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const API_SECRET = process.env.API_SECRET ?? ''

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  await requireAuth()
  const { path } = await params
  const url = `${API_URL}/v1/${path.join('/')}`

  const init: RequestInit = {
    method: req.method,
    headers: {
      'x-api-key': API_SECRET,
      'Content-Type': 'application/json',
    },
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.text()
  }

  const res = await fetch(url, init)
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const DELETE = proxy
export const PATCH = proxy
