import crypto from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import jwt, { type JwtPayload } from 'jsonwebtoken'
import { env } from '../config/env.ts'
import { hashSecretSha256 } from '../db/storage.ts'
import { AppError } from '../errors/AppError.ts'
import { AuthRepository } from '../repositories/auth.repository.ts'

export interface JwtSessionPayload extends JwtPayload {
  sub: string
  actorType: 'user'
  orgIds?: string[]
}

declare global {
  namespace Express {
    interface Request {
      jwtPayload?: JwtSessionPayload
    }
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const PUBLIC_V1_ENDPOINTS = new Set<string>([
  'GET /health',
  'GET /auth/bootstrap-status',
  'POST /auth/bootstrap-admin',
  'POST /auth/login',
])

const authRepo = new AuthRepository()

export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value)
}

export function signJwtSessionToken(
  userId: string,
  organizationIds: string[] = [],
  ttlSeconds: number = env.jwtExpiresInSeconds
): string {
  return jwt.sign(
    {
      actorType: 'user',
      orgIds: organizationIds,
    },
    env.jwtSecret,
    {
      algorithm: 'HS256',
      issuer: env.jwtIssuer,
      audience: env.jwtAudience,
      subject: userId,
      jwtid: crypto.randomUUID(),
      expiresIn: ttlSeconds,
    }
  )
}

export function verifyJwtSessionToken(token: string): JwtSessionPayload {
  try {
    const decoded = jwt.verify(token, env.jwtSecret, {
      algorithms: ['HS256'],
      issuer: env.jwtIssuer,
      audience: env.jwtAudience,
    })

    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      typeof decoded.sub !== 'string' ||
      !decoded.sub.trim() ||
      decoded.actorType !== 'user'
    ) {
      throw new AppError(401, 'UNAUTHORIZED', 'El token JWT no contiene una identidad de usuario válida.')
    }

    return decoded as JwtSessionPayload
  } catch (err) {
    if (err instanceof AppError) throw err

    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError(401, 'UNAUTHORIZED', 'El token JWT ha expirado.')
    }

    if (err instanceof jwt.NotBeforeError) {
      throw new AppError(401, 'UNAUTHORIZED', 'El token JWT aún no es válido.')
    }

    throw new AppError(401, 'UNAUTHORIZED', 'Token JWT inválido o firma incorrecta.')
  }
}

export function extractBearerToken(req: Request): string {
  const authHeader = req.header('Authorization')?.trim() || ''
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!match) {
    throw new AppError(
      401,
      'UNAUTHORIZED',
      'Se requiere encabezado Authorization: Bearer <jwt>.'
    )
  }

  const token = match[1].trim()
  if (!token) {
    throw new AppError(401, 'UNAUTHORIZED', 'Token de autorización vacío.')
  }

  return token
}

export function extractValidatedOrganizationId(req: Request): string {
  const orgId = req.header('X-Organization-Id')?.trim() || ''
  if (!orgId) {
    throw new AppError(
      403,
      'TENANT_MISMATCH',
      'Se requiere encabezado X-Organization-Id válido.'
    )
  }

  if (!isValidUuid(orgId)) {
    throw new AppError(
      403,
      'TENANT_MISMATCH',
      'Formato de X-Organization-Id inválido; se requiere UUID válido.'
    )
  }

  return orgId
}

export async function authenticateJwtAndTenantMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (req.tenantContext) {
      next()
      return
    }

    const token = extractBearerToken(req)
    const orgId = extractValidatedOrganizationId(req)

    const org = await authRepo.findActiveOrganization(orgId)
    if (!org) {
      throw new AppError(
        403,
        'TENANT_MISMATCH',
        'Organización inexistente, inactiva o suspendida en X-Organization-Id.'
      )
    }

    const externalSystemHeader = req.header('X-External-System')?.trim().toLowerCase() || null

    // 1) External Integration API Keys (nexus_live_ / nexus_sbx_) scoped to X-Organization-Id
    if (token.startsWith('nexus_live_') || token.startsWith('nexus_sbx_')) {
      const keyHash = hashSecretSha256(token)
      const keyRec = await authRepo.findActiveApiKeyByHash(orgId, keyHash)
      if (!keyRec) {
        throw new AppError(401, 'UNAUTHORIZED', 'API Key inválida, pausada o revocada.')
      }

      req.tenantContext = {
        organizationId: orgId,
        actorType: 'api_key',
        actorId: keyRec.id,
        actorName: keyRec.name,
        actorEmail: null,
        roleIds: [keyRec.roleId],
        isFullAdmin: false,
        externalSystemHeader: externalSystemHeader || keyRec.externalSystem,
        requestId: req.requestId || '',
      }
      next()
      return
    }

    // 2) Standard RFC 7519 HS256 JWT authentication + tenant membership check
    const payload = verifyJwtSessionToken(token)
    req.jwtPayload = payload

    const user = await authRepo.findUserById(payload.sub)
    if (!user || user.status !== 'active') {
      throw new AppError(401, 'UNAUTHORIZED', 'Usuario no encontrado o suspendido.')
    }

    if (!user.organizationIds.includes(orgId)) {
      throw new AppError(
        403,
        'TENANT_MISMATCH',
        'El usuario autenticado no tiene membresía activa para el X-Organization-Id solicitado.'
      )
    }

    if (Array.isArray(payload.orgIds) && payload.orgIds.length > 0 && !payload.orgIds.includes(orgId)) {
      throw new AppError(
        403,
        'TENANT_MISMATCH',
        'El token JWT no autoriza el acceso a la organización solicitada.'
      )
    }

    const roleIds = user.rolesByOrg[orgId] || []
    req.tenantContext = {
      organizationId: orgId,
      actorType: 'user',
      actorId: user.id,
      actorName: user.fullName,
      actorEmail: user.email,
      roleIds,
      isFullAdmin: roleIds.includes('Administrador'),
      externalSystemHeader,
      requestId: req.requestId || '',
    }
    next()
  } catch (err) {
    next(err)
  }
}

export function isPublicV1Route(req: Request): boolean {
  if (req.method.toUpperCase() === 'OPTIONS') return true
  const rawPath = req.path || '/'
  const normalizedPath = rawPath.length > 1 ? rawPath.replace(/\/+$/, '') : rawPath
  return PUBLIC_V1_ENDPOINTS.has(`${req.method.toUpperCase()} ${normalizedPath}`)
}

/**
 * Router-level guard for all /v1 endpoints.
 * Public endpoints (/v1/health, /v1/auth/bootstrap-status, /v1/auth/bootstrap-admin, /v1/auth/login)
 * bypass authentication; every other route under /v1 enforces JWT + valid X-Organization-Id validation.
 */
export async function v1ProtectedRoutesGuard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (isPublicV1Route(req)) {
    next()
    return
  }
  await authenticateJwtAndTenantMiddleware(req, res, next)
}
