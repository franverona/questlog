import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn().mockResolvedValue('authenticated'),
}))

import { GET, POST, PUT, DELETE, PATCH } from '../route'
import { requireAuth } from '@/lib/auth'

const BASE_URL = 'http://localhost:3000'
const API_URL = 'http://localhost:3001'

function makeRequest(method: string, path: string, body?: string) {
  return new NextRequest(`${BASE_URL}/api/${path}`, { method, body })
}

function makeParams(segments: string[]) {
  return { params: Promise.resolve({ path: segments }) }
}

function makeUpstreamResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('proxy route', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  // ─── Auth ────────────────────────────────────────────────────────────────────

  it('calls requireAuth on every request', async () => {
    vi.mocked(fetch).mockResolvedValue(makeUpstreamResponse({ data: [], error: null, meta: null }))

    await GET(makeRequest('GET', 'api/events'), makeParams(['events']))

    expect(requireAuth).toHaveBeenCalledOnce()
  })

  it('propagates errors thrown by requireAuth (e.g. redirect)', async () => {
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error('NEXT_REDIRECT'))

    await expect(GET(makeRequest('GET', 'api/events'), makeParams(['events']))).rejects.toThrow(
      'NEXT_REDIRECT',
    )
  })

  // ─── URL construction ─────────────────────────────────────────────────────────

  it('builds a single-segment upstream URL', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeUpstreamResponse({ data: null, error: null, meta: null }),
    )

    await GET(makeRequest('GET', 'api/events'), makeParams(['events']))

    expect(fetch).toHaveBeenCalledWith(`${API_URL}/v1/events`, expect.any(Object))
  })

  it('builds a multi-segment upstream URL', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeUpstreamResponse({ data: null, error: null, meta: null }),
    )

    await GET(makeRequest('GET', 'api/achievements/123'), makeParams(['achievements', '123']))

    expect(fetch).toHaveBeenCalledWith(`${API_URL}/v1/achievements/123`, expect.any(Object))
  })

  it('forwards query string to the upstream URL', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeUpstreamResponse({ data: null, error: null, meta: null }),
    )

    await GET(makeRequest('GET', 'api/events?page=2&limit=10'), makeParams(['events']))

    expect(fetch).toHaveBeenCalledWith(`${API_URL}/v1/events?page=2&limit=10`, expect.any(Object))
  })

  // ─── x-api-key header ─────────────────────────────────────────────────────────

  it('always sends the x-api-key header', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeUpstreamResponse({ data: null, error: null, meta: null }),
    )

    await GET(makeRequest('GET', 'api/events'), makeParams(['events']))

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-api-key': expect.any(String) }),
      }),
    )
  })

  // ─── GET / HEAD — no body ─────────────────────────────────────────────────────

  it('does not attach a body or Content-Type for GET', async () => {
    vi.mocked(fetch).mockResolvedValue(makeUpstreamResponse({ data: [], error: null, meta: null }))

    await GET(makeRequest('GET', 'api/events'), makeParams(['events']))

    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect((init as RequestInit).body).toBeUndefined()
    expect((init?.headers as Record<string, string>)?.['Content-Type']).toBeUndefined()
  })

  // ─── POST / PUT / PATCH / DELETE — body forwarding ───────────────────────────

  it('forwards JSON body and sets Content-Type for POST', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeUpstreamResponse({ data: { id: '1' }, error: null, meta: null }, 201),
    )

    const payload = JSON.stringify({ name: 'test' })
    await POST(makeRequest('POST', 'api/achievements', payload), makeParams(['achievements']))

    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect((init as RequestInit).body).toBe(payload)
    expect((init?.headers as Record<string, string>)?.['Content-Type']).toBe('application/json')
  })

  it('forwards body for PUT', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeUpstreamResponse({ data: null, error: null, meta: null }),
    )

    const payload = JSON.stringify({ name: 'updated' })
    await PUT(makeRequest('PUT', 'api/achievements/1', payload), makeParams(['achievements', '1']))

    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect((init as RequestInit).body).toBe(payload)
  })

  it('forwards body for PATCH', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeUpstreamResponse({ data: null, error: null, meta: null }),
    )

    const payload = JSON.stringify({ name: 'patched' })
    await PATCH(
      makeRequest('PATCH', 'api/achievements/1', payload),
      makeParams(['achievements', '1']),
    )

    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect((init as RequestInit).body).toBe(payload)
  })

  it('forwards body for DELETE', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeUpstreamResponse({ data: null, error: null, meta: null }),
    )

    const payload = JSON.stringify({ confirm: true })
    await DELETE(
      makeRequest('DELETE', 'api/achievements/1', payload),
      makeParams(['achievements', '1']),
    )

    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect((init as RequestInit).body).toBe(payload)
  })

  // ─── Response passthrough ─────────────────────────────────────────────────────

  it('returns the upstream JSON body with the original status', async () => {
    const upstream = { data: [{ id: '1' }], error: null, meta: { total: 1 } }
    vi.mocked(fetch).mockResolvedValue(makeUpstreamResponse(upstream, 200))

    const res = await GET(makeRequest('GET', 'api/events'), makeParams(['events']))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(upstream)
  })

  it('passes through non-200 status codes from upstream', async () => {
    const upstream = { data: null, error: { message: 'Not found', code: 'NOT_FOUND' }, meta: null }
    vi.mocked(fetch).mockResolvedValue(makeUpstreamResponse(upstream, 404))

    const res = await GET(
      makeRequest('GET', 'api/events/missing'),
      makeParams(['events', 'missing']),
    )

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual(upstream)
  })

  // ─── Upstream non-JSON response ───────────────────────────────────────────────

  it('returns UPSTREAM_ERROR envelope when upstream returns non-JSON', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('Internal Server Error', { status: 502 }))

    const res = await GET(makeRequest('GET', 'api/events'), makeParams(['events']))

    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({
      data: null,
      error: { message: 'Upstream returned an unexpected response', code: 'UPSTREAM_ERROR' },
      meta: null,
    })
  })
})
