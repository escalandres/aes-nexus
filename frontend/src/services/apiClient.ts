import { getInMemoryAuthSession } from './authService'

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '/api/v1'

export class ApiRequestError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = code
  }
}

export function getApiBaseUrl(): string {
  return API_BASE_URL
}

export function buildAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const session = getInMemoryAuthSession()
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Client-App': 'aes-nexus-frontend',
    ...(extra ?? {}),
  }

  if (session?.token) {
    headers.Authorization = `Bearer ${session.token}`
  }

  if (session?.activeOrganizationId) {
    headers['X-Organization-Id'] = session.activeOrganizationId
  }

  return headers
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
  const mergedHeaders = buildAuthHeaders(
    options.body ? { 'Content-Type': 'application/json' } : undefined
  )

  if (options.headers) {
    Object.assign(mergedHeaders, options.headers as Record<string, string>)
  }

  const response = await fetch(url, {
    ...options,
    headers: mergedHeaders,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const payload = isJson ? await response.json().catch(() => null) : null

  if (!response.ok) {
    const message =
      (typeof payload?.error?.message === 'string' && payload.error.message) ||
      (typeof payload?.message === 'string' && payload.message) ||
      `Error HTTP ${response.status}`
    const code = typeof payload?.error?.code === 'string' ? payload.error.code : undefined
    throw new ApiRequestError(message, response.status, code)
  }

  return payload as T
}
