const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '/api/v1'

export interface AuthOrganization {
  id: string
  slug: string
  name: string
  status: string
  reportingCurrency: string
  externalId?: string | null
  externalSource?: string | null
  externalSyncedAt?: string | null
}

export interface AuthUser {
  id: string
  email: string
  fullName: string
  avatarInitials: string
  externalId?: string | null
  externalSource?: string | null
  externalSyncedAt?: string | null
}

export interface AuthContextMe {
  userId?: string
  email?: string
  name?: string
  avatarInitials?: string
  activeOrganizationId: string
  organizations?: AuthOrganization[]
  activeRoleIds: string[]
  effectiveSectionPermissions?: Record<string, Record<string, 'none' | 'view' | 'create' | 'edit' | 'full'>>
}

export interface AuthSession {
  token: string
  user: AuthUser
  organizations: AuthOrganization[]
  activeOrganizationId: string
  activeRoleIds: string[]
}

export interface BootstrapStatusResponse {
  requiresBootstrap: boolean
  passcodeRequired: boolean
}

export interface LoginPayload {
  email: string
  password: string
}

export interface BootstrapAdminPayload {
  email: string
  fullName: string
  password: string
  passcode?: string
}

// Strict in-memory session storage only (never persisted to localStorage/sessionStorage)
let inMemoryAuthSession: AuthSession | null = null

export function getInMemoryAuthSession(): AuthSession | null {
  return inMemoryAuthSession
}

export function getInMemoryAuthToken(): string | null {
  return inMemoryAuthSession?.token ?? null
}

export function setInMemoryAuthSession(session: AuthSession | null): void {
  inMemoryAuthSession = session
}

export function clearInMemoryAuthSession(): void {
  inMemoryAuthSession = null
}

async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const payload = await response.json()
    if (typeof payload?.error?.message === 'string' && payload.error.message.trim()) {
      return payload.error.message
    }
    if (typeof payload?.message === 'string' && payload.message.trim()) {
      return payload.message
    }
    if (Array.isArray(payload?.error?.details) && payload.error.details.length > 0) {
      const firstIssue = payload.error.details[0]
      if (typeof firstIssue?.message === 'string' && firstIssue.message.trim()) {
        return firstIssue.message
      }
    }
  } catch {
    // ignore non-JSON body
  }
  return fallback
}

export async function fetchBootstrapStatus(): Promise<BootstrapStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/bootstrap-status`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(
        response,
        'No se pudo verificar el estado de autenticación del servidor.'
      )
    )
  }
  return (await response.json()) as BootstrapStatusResponse
}

export async function fetchCurrentAuthContext(
  token: string,
  organizationId: string
): Promise<AuthContextMe> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Organization-Id': organizationId,
    },
  })
  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, 'No fue posible validar la sesión activa.')
    )
  }
  return (await response.json()) as AuthContextMe
}

async function hydrateAuthSession(raw: {
  token: string
  user: AuthUser
  organizations: AuthOrganization[]
}): Promise<AuthSession> {
  const activeOrganizationId =
    raw.organizations[0]?.id || '00000000-0000-4000-8000-000000000001'
  let activeRoleIds: string[] = ['Administrador']
  let organizations = raw.organizations

  try {
    const me = await fetchCurrentAuthContext(raw.token, activeOrganizationId)
    if (Array.isArray(me.activeRoleIds) && me.activeRoleIds.length > 0) {
      activeRoleIds = me.activeRoleIds
    }
    if (Array.isArray(me.organizations) && me.organizations.length > 0) {
      organizations = me.organizations
    }
  } catch {
    // Preserve baseline context from auth response if /me enrichment is unavailable
  }

  const session: AuthSession = {
    token: raw.token,
    user: raw.user,
    organizations,
    activeOrganizationId,
    activeRoleIds,
  }
  setInMemoryAuthSession(session)
  return session
}

export async function loginWithPassword(payload: LoginPayload): Promise<AuthSession> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      email: payload.email.trim(),
      password: payload.password,
    }),
  })

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(
        response,
        response.status === 401
          ? 'Correo o contraseña incorrectos.'
          : 'No fue posible iniciar sesión. Intenta nuevamente.'
      )
    )
  }

  const data = (await response.json()) as {
    token: string
    user: AuthUser
    organizations: AuthOrganization[]
  }
  return hydrateAuthSession(data)
}

export async function bootstrapInitialAdmin(
  payload: BootstrapAdminPayload
): Promise<AuthSession> {
  const response = await fetch(`${API_BASE_URL}/auth/bootstrap-admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      email: payload.email.trim(),
      fullName: payload.fullName.trim(),
      password: payload.password,
      ...(payload.passcode ? { passcode: payload.passcode } : {}),
    }),
  })

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(
        response,
        'No fue posible configurar el administrador inicial.'
      )
    )
  }

  const data = (await response.json()) as {
    token: string
    user: AuthUser
    organizations: AuthOrganization[]
  }
  return hydrateAuthSession(data)
}
