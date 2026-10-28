import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, createApiClient, apiRequest } from '../../src/api/client'

describe('API client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('adds a Bearer token from the configured token provider', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ user: { id: 'u1' } })))
    const client = createApiClient(async () => 'access-token')

    await expect(client.request<{ user: { id: string } }>('/v1/me')).resolves.toEqual({ user: { id: 'u1' } })
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe('http://localhost:8080/v1/me')
    expect(new Headers(vi.mocked(fetch).mock.calls[0]?.[1]?.headers).get('Authorization')).toBe('Bearer access-token')
  })

  it('converts gateway JSON errors into ApiError', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ message: 'требуется авторизация' }), { status: 401 }))

    await expect(apiRequest('/v1/me')).rejects.toMatchObject<ApiError>({
      name: 'ApiError',
      message: 'требуется авторизация',
      status: 401,
    })
  })

  it('reports a safe message when the server cannot be reached', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('private transport details'))

    await expect(apiRequest('/v1/me')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Не удалось связаться с сервером. Проверьте подключение и адрес API.',
      status: 0,
    })
  })
})
