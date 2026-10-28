const defaultBaseUrl = 'http://localhost:8080'

function normalizeBaseUrl(value: string | undefined) {
  return (value?.trim() || defaultBaseUrl).replace(/\/$/, '')
}

export const apiBaseUrl = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL)

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, 'headers'> {
  accessToken?: string
  headers?: HeadersInit
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { accessToken, ...requestInit } = options
  const headers = new Headers(requestInit.headers)
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  if (requestInit.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`, {
      ...requestInit,
      headers,
    })
  } catch {
    throw new ApiError('Не удалось связаться с сервером. Проверьте подключение и адрес API.', 0)
  }

  if (!response.ok) {
    let message = `Запрос не выполнен (HTTP ${response.status}).`
    try {
      const payload: unknown = await response.json()
      if (
        typeof payload === 'object' &&
        payload !== null &&
        'message' in payload &&
        typeof payload.message === 'string'
      ) {
        message = payload.message
      }
    } catch {
      // Keep the status-based message for empty or non-JSON gateway responses.
    }
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function createApiClient(getAccessToken: () => Promise<string | undefined>) {
  return {
    request: async <T>(path: string, options: Omit<ApiRequestOptions, 'accessToken'> = {}) =>
      apiRequest<T>(path, { ...options, accessToken: await getAccessToken() }),
  }
}
