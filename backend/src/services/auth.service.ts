import crypto from 'node:crypto'
import { env } from '../config/env.ts'
import { verifyPasswordScrypt } from '../db/storage.ts'
import { AppError } from '../errors/AppError.ts'
import { signSessionToken } from '../middlewares/tenantAuth.ts'
import { AuditRepository } from '../repositories/audit.repository.ts'
import { AuthRepository } from '../repositories/auth.repository.ts'
import type { RoleSectionPermissions, SectionAccessLevel, TenantContext } from '../types/common.ts'

const LEVEL_RANK: Record<SectionAccessLevel, number> = {
  none: 0,
  view: 1,
  create: 2,
  edit: 3,
  full: 4,
}

export class AuthService {
  private readonly authRepo = new AuthRepository()
  private readonly auditRepo = new AuditRepository()

  async getBootstrapStatus() {
    const hasAdmin = await this.authRepo.hasAnyUser()
    return {
      requiresBootstrap: !hasAdmin,
      passcodeRequired: Boolean(env.adminBootstrapPasscode),
    }
  }

  async bootstrapAdmin(input: {
    email: string
    fullName: string
    password: string
    passcode?: string
    externalId?: string | null
    externalSource?: string | null
  }) {
    if (await this.authRepo.hasAnyUser()) {
      throw new AppError(409, 'INVALID_STATE_TRANSITION', 'El administrador inicial ya fue configurado.')
    }

    if (env.adminBootstrapPasscode) {
      const provided = Buffer.from(input.passcode || '', 'utf8')
      const expected = Buffer.from(env.adminBootstrapPasscode, 'utf8')
      if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
        throw new AppError(403, 'UNAUTHORIZED', 'Passcode de inicialización inválido.')
      }
    }

    const user = await this.authRepo.createInitialAdmin({
      email: input.email,
      fullName: input.fullName,
      password: input.password,
      externalId: input.externalId,
      externalSource: input.externalSource,
    })

    const orgs = await this.authRepo.listOrganizationsForUser(user)
    const token = signSessionToken(user.id, user.organizationIds)

    await this.auditRepo.append({
      organizationId: orgs[0].id,
      category: 'security',
      operation: 'create',
      actorName: user.fullName,
      entityType: 'Usuario Administrador',
      entityId: user.id,
      summary: `Inicialización segura del administrador principal (${user.email}).`,
      externalId: user.externalId,
      externalSource: user.externalSource,
      externalSyncedAt: user.externalSyncedAt,
    })

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarInitials: user.avatarInitials,
        externalId: user.externalId,
        externalSource: user.externalSource,
        externalSyncedAt: user.externalSyncedAt,
      },
      organizations: orgs.map((o) => ({
        id: o.id,
        slug: o.slug,
        name: o.name,
        status: o.status,
        reportingCurrency: o.reportingCurrency,
        externalId: o.externalId,
        externalSource: o.externalSource,
        externalSyncedAt: o.externalSyncedAt,
      })),
    }
  }

  async login(input: { email: string; password: string }) {
    const user = await this.authRepo.findUserByEmail(input.email)
    if (!user || user.status !== 'active') {
      throw new AppError(401, 'UNAUTHORIZED', 'Credenciales inválidas.')
    }

    if (env.adminBootstrapPasscode && user.rolesByOrg[user.organizationIds[0]]?.includes('Administrador')) {
      const pBuf = Buffer.from(input.password, 'utf8')
      const eBuf = Buffer.from(env.adminBootstrapPasscode, 'utf8')
      const matchesEnvPasscode = pBuf.length === eBuf.length && crypto.timingSafeEqual(pBuf, eBuf)
      if (!matchesEnvPasscode && !verifyPasswordScrypt(input.password, user.passwordHash)) {
        throw new AppError(401, 'UNAUTHORIZED', 'Credenciales inválidas.')
      }
    } else if (!verifyPasswordScrypt(input.password, user.passwordHash)) {
      throw new AppError(401, 'UNAUTHORIZED', 'Credenciales inválidas.')
    }

    const orgs = await this.authRepo.listOrganizationsForUser(user)
    const token = signSessionToken(user.id, user.organizationIds)

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarInitials: user.avatarInitials,
        externalId: user.externalId,
        externalSource: user.externalSource,
        externalSyncedAt: user.externalSyncedAt,
      },
      organizations: orgs.map((o) => ({
        id: o.id,
        slug: o.slug,
        name: o.name,
        status: o.status,
        reportingCurrency: o.reportingCurrency,
        externalId: o.externalId,
        externalSource: o.externalSource,
        externalSyncedAt: o.externalSyncedAt,
      })),
    }
  }

  async getCurrentContext(ctx: TenantContext) {
    if (ctx.actorType === 'api_key') {
      return {
        actorType: ctx.actorType,
        actorId: ctx.actorId,
        name: ctx.actorName,
        activeOrganizationId: ctx.organizationId,
        activeRoleIds: ctx.roleIds,
      }
    }

    const user = await this.authRepo.findUserById(ctx.actorId)
    if (!user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Usuario no encontrado.')
    }
    const orgs = await this.authRepo.listOrganizationsForUser(user)
    const roles = await this.authRepo.listRolesForUserInOrg(user.id, ctx.organizationId)

    const effectiveSectionPermissions: RoleSectionPermissions = {}
    for (const role of roles) {
      for (const [mod, sections] of Object.entries(role.sectionPermissions || {})) {
        if (!effectiveSectionPermissions[mod]) effectiveSectionPermissions[mod] = {}
        for (const [sec, level] of Object.entries(sections)) {
          const current = effectiveSectionPermissions[mod][sec] || 'none'
          if (LEVEL_RANK[level] > LEVEL_RANK[current]) {
            effectiveSectionPermissions[mod][sec] = level
          }
        }
      }
    }

    return {
      userId: user.id,
      email: user.email,
      name: user.fullName,
      avatarInitials: user.avatarInitials,
      externalId: user.externalId,
      externalSource: user.externalSource,
      externalSyncedAt: user.externalSyncedAt,
      activeOrganizationId: ctx.organizationId,
      organizations: orgs.map((o) => ({
        id: o.id,
        slug: o.slug,
        name: o.name,
        status: o.status,
        reportingCurrency: o.reportingCurrency,
        externalId: o.externalId,
        externalSource: o.externalSource,
        externalSyncedAt: o.externalSyncedAt,
      })),
      activeRoleIds: ctx.roleIds,
      effectiveSectionPermissions,
    }
  }

  async issueApiKey(
    ctx: TenantContext,
    input: {
      name: string
      externalSystem: string
      roleId: string
      environment: 'production' | 'sandbox'
      rateLimitPerMin?: number
      externalId?: string | null
    }
  ) {
    const { record, plainSecret } = await this.authRepo.createExternalApiKey({
      organizationId: ctx.organizationId,
      name: input.name,
      externalSystem: input.externalSystem,
      roleId: input.roleId,
      environment: input.environment,
      rateLimitPerMin: input.rateLimitPerMin ?? 120,
      externalId: input.externalId,
    })

    await this.auditRepo.append({
      organizationId: ctx.organizationId,
      category: 'security',
      operation: 'create',
      actorName: ctx.actorName,
      entityType: 'API Key Externa',
      entityId: record.id,
      summary: `Emisión de credencial API '${record.name}' (${record.keyPrefix}...) para sistema '${record.externalSystem}'.`,
      externalId: record.externalId,
      externalSource: record.externalSource,
      externalSyncedAt: record.externalSyncedAt,
    })

    return {
      id: record.id,
      name: record.name,
      externalSystem: record.externalSystem,
      roleId: record.roleId,
      keyPrefix: record.keyPrefix,
      apiKeySecret: plainSecret,
      status: record.status,
      rateLimitPerMin: record.rateLimitPerMin,
      externalId: record.externalId,
      externalSource: record.externalSource,
      externalSyncedAt: record.externalSyncedAt,
      createdAt: record.createdAt,
    }
  }
}
