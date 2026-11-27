import crypto from 'node:crypto'
import type { QueryResultRow } from 'pg'
import {
  isPostgresEnabled,
  queryPg,
  toIsoString,
  toNullableIsoString,
  withPgTransaction,
} from '../db/postgres.ts'
import {
  DEFAULT_ORG_ID,
  hashPasswordScrypt,
  hashSecretSha256,
  persistDb,
  readDb,
  type CoreOrganizationRecord,
  type CoreUserRecord,
  type ExternalApiKeyRecord,
  type RoleDefinitionEntity,
} from '../db/storage.ts'
import type { RoleSectionPermissions } from '../types/common.ts'

interface OrganizationRow extends QueryResultRow {
  id: string
  slug: string
  name: string
  status: 'active' | 'suspended'
  plan_tier: 'Growth' | 'Enterprise' | 'Corporate'
  reporting_currency: string
  external_id: string | null
  external_source: string | null
  external_synced_at: Date | string | null
  created_at: Date | string
  updated_at: Date | string
}

interface UserRow extends QueryResultRow {
  id: string
  email: string
  full_name: string
  avatar_initials: string
  password_hash: string | null
  status: 'active' | 'suspended'
  external_id: string | null
  external_source: string | null
  external_synced_at: Date | string | null
  created_at: Date | string
  updated_at: Date | string
}

interface MembershipRow extends QueryResultRow {
  organization_id: string
  role_ids: string[] | null
}

interface RoleRow extends QueryResultRow {
  id: string
  organization_id: string
  name: string
  description: string
  section_permissions: RoleSectionPermissions | null
  built_in_key: 'admin' | 'ops' | 'sales' | 'fin' | null
  for_api_integration: boolean
  external_id: string | null
  external_source: string | null
  external_synced_at: Date | string | null
  created_at: Date | string
  updated_at: Date | string
  deleted_at: Date | string | null
}

interface ApiKeyRow extends QueryResultRow {
  id: string
  organization_id: string
  name: string
  system_type: string
  role_id: string
  api_key_prefix: string
  api_key_hash: string
  status: 'active' | 'paused' | 'revoked'
  rate_limit_per_min: number
  external_id: string | null
  external_source: string | null
  external_synced_at: Date | string | null
  created_at: Date | string
}

function mapOrganizationRow(row: OrganizationRow): CoreOrganizationRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    planTier: row.plan_tier,
    reportingCurrency: row.reporting_currency,
    externalId: row.external_id,
    externalSource: row.external_source,
    externalSyncedAt: toNullableIsoString(row.external_synced_at),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  }
}

function mapRoleRow(row: RoleRow): RoleDefinitionEntity {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    description: row.description,
    sectionPermissions: row.section_permissions || {},
    builtInKey: row.built_in_key ?? undefined,
    forApiIntegration: Boolean(row.for_api_integration),
    externalId: row.external_id,
    externalSource: row.external_source,
    externalSyncedAt: toNullableIsoString(row.external_synced_at),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    deletedAt: toNullableIsoString(row.deleted_at),
  }
}

function mapApiKeyRow(row: ApiKeyRow): ExternalApiKeyRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    externalSystem: row.system_type,
    roleId: row.role_id,
    keyPrefix: row.api_key_prefix,
    keyHash: row.api_key_hash,
    status: row.status,
    rateLimitPerMin: row.rate_limit_per_min,
    externalId: row.external_id,
    externalSource: row.external_source,
    externalSyncedAt: toNullableIsoString(row.external_synced_at),
    createdAt: toIsoString(row.created_at),
  }
}

async function hydratePgUser(userRow: UserRow): Promise<CoreUserRecord> {
  const memRes = await queryPg<MembershipRow>(
    `
      SELECT organization_id, role_ids
      FROM core_organization_memberships
      WHERE user_id = $1 AND status = 'active' AND deleted_at IS NULL
    `,
    [userRow.id]
  )
  const organizationIds: string[] = []
  const rolesByOrg: Record<string, string[]> = {}
  for (const m of memRes.rows) {
    organizationIds.push(m.organization_id)
    rolesByOrg[m.organization_id] = Array.isArray(m.role_ids) ? m.role_ids : []
  }

  return {
    id: userRow.id,
    email: userRow.email,
    fullName: userRow.full_name,
    avatarInitials: userRow.avatar_initials,
    passwordHash: userRow.password_hash || '',
    status: userRow.status,
    organizationIds,
    rolesByOrg,
    externalId: userRow.external_id,
    externalSource: userRow.external_source,
    externalSyncedAt: toNullableIsoString(userRow.external_synced_at),
    createdAt: toIsoString(userRow.created_at),
    updatedAt: toIsoString(userRow.updated_at),
  }
}

export class AuthRepository {
  async hasAnyUser(): Promise<boolean> {
    if (isPostgresEnabled()) {
      const res = await queryPg<{ cnt: number }>(
        `SELECT COUNT(*)::int AS cnt FROM core_users WHERE deleted_at IS NULL`
      )
      return (res.rows[0]?.cnt ?? 0) > 0
    }

    const db = readDb()
    return db.users.length > 0
  }

  async findUserByEmail(email: string): Promise<CoreUserRecord | undefined> {
    const normalized = email.trim().toLowerCase()
    if (isPostgresEnabled()) {
      const res = await queryPg<UserRow>(
        `
          SELECT id, email, full_name, avatar_initials, password_hash, status,
                 external_id, external_source, external_synced_at, created_at, updated_at
          FROM core_users
          WHERE LOWER(email) = $1 AND deleted_at IS NULL
          LIMIT 1
        `,
        [normalized]
      )
      return res.rows[0] ? hydratePgUser(res.rows[0]) : undefined
    }

    const db = readDb()
    return db.users.find((u) => u.email.toLowerCase() === normalized)
  }

  async findUserById(userId: string): Promise<CoreUserRecord | undefined> {
    if (isPostgresEnabled()) {
      const res = await queryPg<UserRow>(
        `
          SELECT id, email, full_name, avatar_initials, password_hash, status,
                 external_id, external_source, external_synced_at, created_at, updated_at
          FROM core_users
          WHERE id = $1 AND deleted_at IS NULL
          LIMIT 1
        `,
        [userId]
      )
      return res.rows[0] ? hydratePgUser(res.rows[0]) : undefined
    }

    const db = readDb()
    return db.users.find((u) => u.id === userId)
  }

  async findUserByExternal(externalSource: string, externalId: string): Promise<CoreUserRecord | undefined> {
    const src = externalSource.trim().toLowerCase()
    if (isPostgresEnabled()) {
      const res = await queryPg<UserRow>(
        `
          SELECT id, email, full_name, avatar_initials, password_hash, status,
                 external_id, external_source, external_synced_at, created_at, updated_at
          FROM core_users
          WHERE external_source = $1 AND external_id = $2 AND deleted_at IS NULL
          LIMIT 1
        `,
        [src, externalId]
      )
      return res.rows[0] ? hydratePgUser(res.rows[0]) : undefined
    }

    const db = readDb()
    return db.users.find((u) => u.externalSource === src && u.externalId === externalId)
  }

  async findActiveOrganization(organizationId: string): Promise<CoreOrganizationRecord | undefined> {
    if (isPostgresEnabled()) {
      const res = await queryPg<OrganizationRow>(
        `
          SELECT id, slug, name, status, plan_tier, reporting_currency,
                 external_id, external_source, external_synced_at, created_at, updated_at
          FROM core_organizations
          WHERE id = $1 AND status = 'active' AND deleted_at IS NULL
          LIMIT 1
        `,
        [organizationId]
      )
      return res.rows[0] ? mapOrganizationRow(res.rows[0]) : undefined
    }

    const db = readDb()
    return db.organizations.find((o) => o.id === organizationId && o.status === 'active')
  }

  async findActiveApiKeyByHash(
    organizationId: string,
    keyHash: string
  ): Promise<ExternalApiKeyRecord | undefined> {
    if (isPostgresEnabled()) {
      const res = await queryPg<ApiKeyRow>(
        `
          SELECT id, organization_id, name, system_type, role_id, api_key_prefix, api_key_hash,
                 status, rate_limit_per_min, external_id, external_source, external_synced_at, created_at
          FROM cfg_external_integrations
          WHERE organization_id = $1 AND api_key_hash = $2 AND status = 'active'
          LIMIT 1
        `,
        [organizationId, keyHash]
      )
      return res.rows[0] ? mapApiKeyRow(res.rows[0]) : undefined
    }

    const db = readDb()
    return db.apiKeys.find((k) => k.keyHash === keyHash && k.organizationId === organizationId && k.status === 'active')
  }

  async listOrganizationsForUser(user: CoreUserRecord): Promise<CoreOrganizationRecord[]> {
    if (isPostgresEnabled()) {
      if (user.organizationIds.length === 0) return []
      const res = await queryPg<OrganizationRow>(
        `
          SELECT id, slug, name, status, plan_tier, reporting_currency,
                 external_id, external_source, external_synced_at, created_at, updated_at
          FROM core_organizations
          WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL
          ORDER BY created_at ASC
        `,
        [user.organizationIds]
      )
      return res.rows.map(mapOrganizationRow)
    }

    const db = readDb()
    return db.organizations.filter((o) => user.organizationIds.includes(o.id))
  }

  async listRolesForOrgByIds(organizationId: string, roleIds: string[]): Promise<RoleDefinitionEntity[]> {
    if (roleIds.length === 0) return []
    if (isPostgresEnabled()) {
      const res = await queryPg<RoleRow>(
        `
          SELECT id, organization_id, name, description, section_permissions, built_in_key,
                 for_api_integration, external_id, external_source, external_synced_at,
                 created_at, updated_at, deleted_at
          FROM cfg_roles
          WHERE organization_id = $1 AND id = ANY($2::text[]) AND deleted_at IS NULL
        `,
        [organizationId, roleIds]
      )
      return res.rows.map(mapRoleRow)
    }

    const db = readDb()
    return db.roles.filter(
      (r) => r.organizationId === organizationId && !r.deletedAt && roleIds.includes(r.id)
    )
  }

  async listRolesForUserInOrg(userId: string, organizationId: string): Promise<RoleDefinitionEntity[]> {
    const user = await this.findUserById(userId)
    if (!user) return []
    const roleIds = user.rolesByOrg[organizationId] || []
    return this.listRolesForOrgByIds(organizationId, roleIds)
  }

  async createInitialAdmin(params: {
    email: string
    fullName: string
    password: string
    externalId?: string | null
    externalSource?: string | null
  }): Promise<CoreUserRecord> {
    const email = params.email.trim().toLowerCase()
    const fullName = params.fullName.trim()
    const initials =
      fullName
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('') || 'AD'
    const passwordHash = hashPasswordScrypt(params.password)
    const externalId = params.externalId?.trim() || null
    const externalSource = params.externalSource?.trim().toLowerCase() || null
    const externalSyncedAt = externalId ? new Date().toISOString() : null

    if (isPostgresEnabled()) {
      return withPgTransaction(DEFAULT_ORG_ID, async (client) => {
        const userId = crypto.randomUUID()
        const userRes = await client.query<UserRow>(
          `
            INSERT INTO core_users (
              id, oidc_subject, email, full_name, avatar_initials, password_hash, status,
              external_id, external_source, external_synced_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8, $9)
            RETURNING id, email, full_name, avatar_initials, password_hash, status,
                      external_id, external_source, external_synced_at, created_at, updated_at
          `,
          [
            userId,
            `local:${email}`,
            email,
            fullName,
            initials,
            passwordHash,
            externalId,
            externalSource,
            externalSyncedAt,
          ]
        )

        await client.query(
          `
            INSERT INTO core_organization_memberships (
              organization_id, user_id, status, primary_role_id, role_ids,
              external_id, external_source, external_synced_at
            )
            VALUES ($1, $2, 'active', 'Administrador', ARRAY['Administrador']::text[], $3, $4, $5)
          `,
          [DEFAULT_ORG_ID, userId, externalId, externalSource, externalSyncedAt]
        )

        const u = userRes.rows[0]
        return {
          id: u.id,
          email: u.email,
          fullName: u.full_name,
          avatarInitials: u.avatar_initials,
          passwordHash: u.password_hash || '',
          status: u.status,
          organizationIds: [DEFAULT_ORG_ID],
          rolesByOrg: { [DEFAULT_ORG_ID]: ['Administrador'] },
          externalId: u.external_id,
          externalSource: u.external_source,
          externalSyncedAt: toNullableIsoString(u.external_synced_at),
          createdAt: toIsoString(u.created_at),
          updatedAt: toIsoString(u.updated_at),
        }
      })
    }

    const db = readDb()
    const now = new Date().toISOString()
    const user: CoreUserRecord = {
      id: crypto.randomUUID(),
      email,
      fullName,
      avatarInitials: initials,
      passwordHash,
      status: 'active',
      organizationIds: [DEFAULT_ORG_ID],
      rolesByOrg: { [DEFAULT_ORG_ID]: ['Administrador'] },
      externalId,
      externalSource,
      externalSyncedAt,
      createdAt: now,
      updatedAt: now,
    }
    db.users.push(user)
    persistDb(db)
    return user
  }

  async createExternalApiKey(params: {
    organizationId: string
    name: string
    externalSystem: string
    roleId: string
    environment: 'production' | 'sandbox'
    rateLimitPerMin: number
    externalId?: string | null
  }): Promise<{ record: ExternalApiKeyRecord; plainSecret: string }> {
    const prefixTag = params.environment === 'production' ? 'live' : 'sbx'
    const token = crypto.randomBytes(20).toString('hex')
    const plainSecret = `nexus_${prefixTag}_${token}`
    const keyPrefix = plainSecret.slice(0, 16)
    const keyHash = hashSecretSha256(plainSecret)
    const normSys = params.externalSystem.trim().toLowerCase()
    const externalId = params.externalId?.trim() || null
    const externalSyncedAt = externalId ? new Date().toISOString() : null

    if (isPostgresEnabled()) {
      const id = crypto.randomUUID()
      const res = await queryPg<ApiKeyRow>(
        `
          INSERT INTO cfg_external_integrations (
            id, organization_id, name, system_type, description, environment, status,
            role_id, api_key_prefix, api_key_hash, rate_limit_per_min, permissions,
            external_id, external_source, external_synced_at
          )
          VALUES (
            $1, $2, $3, $4, '', $5, 'active',
            $6, $7, $8, $9, '[]'::jsonb,
            $10, $11, $12
          )
          RETURNING id, organization_id, name, system_type, role_id, api_key_prefix, api_key_hash,
                    status, rate_limit_per_min, external_id, external_source, external_synced_at, created_at
        `,
        [
          id,
          params.organizationId,
          params.name.trim(),
          normSys,
          params.environment,
          params.roleId,
          keyPrefix,
          keyHash,
          params.rateLimitPerMin,
          externalId,
          externalId ? normSys : null,
          externalSyncedAt,
        ]
      )
      return { record: mapApiKeyRow(res.rows[0]), plainSecret }
    }

    const db = readDb()
    const record: ExternalApiKeyRecord = {
      id: `ext_${crypto.randomUUID()}`,
      organizationId: params.organizationId,
      name: params.name.trim(),
      externalSystem: normSys,
      roleId: params.roleId,
      keyPrefix,
      keyHash,
      status: 'active',
      rateLimitPerMin: params.rateLimitPerMin,
      externalId,
      externalSource: externalId ? normSys : null,
      externalSyncedAt,
      createdAt: new Date().toISOString(),
    }
    db.apiKeys.push(record)
    persistDb(db)
    return { record, plainSecret }
  }
}
