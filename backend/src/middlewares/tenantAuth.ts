import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../errors/AppError.ts'
import { AuthRepository } from '../repositories/auth.repository.ts'
import type { SectionAccessLevel, TenantContext } from '../types/common.ts'
import {
  authenticateJwtAndTenantMiddleware,
  signJwtSessionToken,
  verifyJwtSessionToken,
  type JwtSessionPayload,
} from './jwtAuth.ts'

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext
    }
  }
}

const LEVEL_RANK: Record<SectionAccessLevel, number> = {
  none: 0,
  view: 1,
  create: 2,
  edit: 3,
  full: 4,
}

const authRepo = new AuthRepository()

export function signSessionToken(
  userId: string,
  organizationIds: string[] = [],
  ttlSeconds?: number
): string {
  return signJwtSessionToken(userId, organizationIds, ttlSeconds)
}

export function verifySessionToken(token: string): JwtSessionPayload | null {
  try {
    return verifyJwtSessionToken(token)
  } catch {
    return null
  }
}

export async function authenticateTenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  await authenticateJwtAndTenantMiddleware(req, res, next)
}

export function requireSectionAccess(
  moduleName: string,
  sectionName: string,
  requiredLevel: SectionAccessLevel
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = req.tenantContext
      if (!ctx) {
        throw new AppError(401, 'UNAUTHORIZED', 'Contexto de tenant no autenticado.')
      }
      if (ctx.isFullAdmin) {
        next()
        return
      }

      const orgRoles = await authRepo.listRolesForOrgByIds(ctx.organizationId, ctx.roleIds)

      let maxRank = 0
      for (const role of orgRoles) {
        const level = role.sectionPermissions?.[moduleName]?.[sectionName] || 'none'
        if (LEVEL_RANK[level] > maxRank) {
          maxRank = LEVEL_RANK[level]
        }
      }

      if (maxRank < LEVEL_RANK[requiredLevel]) {
        throw new AppError(
          403,
          'RBAC_FORBIDDEN',
          `Permiso insuficiente para ${moduleName}.${sectionName} (requiere nivel '${requiredLevel}').`
        )
      }
      next()
    } catch (err) {
      next(err)
    }
  }
}
