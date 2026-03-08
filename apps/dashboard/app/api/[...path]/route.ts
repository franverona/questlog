import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const API_SECRET = process.env.API_SECRET ?? ''

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  await requireAuth()
  const { path } = await params
  const { search } = new URL(req.url)
  const url = `${API_URL}/v1/${path.map(encodeURIComponent).join('/')}${search}`

  const init: RequestInit = {
    method: req.method,
    headers: {
      'x-api-key': API_SECRET,
    },
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.text()
    init.headers = {
      ...init.headers,
      'Content-Type': 'application/json',
    }
  }

  const res = await fetch(url, init)
  const { status } = res

  let data: unknown
  try {
    data = await res.json()
  } catch {
    return NextResponse.json(
      {
        data: null,
        error: { message: 'Upstream returned an unexpected response', code: 'UPSTREAM_ERROR' },
        meta: null,
      },
      { status },
    )
  }

  return NextResponse.json(data, { status })
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const DELETE = proxy
export const PATCH = proxy
