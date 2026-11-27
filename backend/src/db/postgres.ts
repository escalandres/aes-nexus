import fs from 'node:fs'
import path from 'node:path'
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg'
import { env, isValidPostgresUrl } from '../config/env.ts'
import type { PaginationMeta, PaginationQuery } from '../types/common.ts'

export const DEFAULT_ORG_ID = '00000000-0000-4000-8000-000000000001'

export type DbConnectionMode = 'neon-postgres' | 'docker-postgres' | 'local-store'

interface ResolvedPgTarget {
  mode: 'neon-postgres' | 'docker-postgres'
  connectionString?: string
  host?: string
  port?: number
  database?: string
  user?: string
  password?: string
  ssl: false | { rejectUnauthorized: boolean }
}

let pgPool: Pool | null = null
let schemaReadyPromise: Promise<Pool | null> | null = null

function isLocalOrDockerHost(hostname: string): boolean {
  const h = hostname.trim().toLowerCase()
  if (!h) return false
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === 'host.docker.internal') return true
  if (h.endsWith('.local') || h.endsWith('.internal')) return true
  // Docker Compose service names (e.g. "postgres", "db", "aes-postgres") typically have no dot
  return !h.includes('.')
}

function resolveSslForTarget(
  provider: 'neon-postgres' | 'docker-postgres',
  connectionString?: string
): false | { rejectUnauthorized: boolean } {
  let urlSslMode = ''
  if (connectionString) {
    try {
      urlSslMode = new URL(connectionString).searchParams.get('sslmode')?.toLowerCase() || ''
    } catch {
      urlSslMode = ''
    }
  }

  const effectiveSslMode = env.pg.sslMode || urlSslMode
  if (effectiveSslMode === 'disable') return false
  if (
    effectiveSslMode === 'require' ||
    effectiveSslMode === 'verify-ca' ||
    effectiveSslMode === 'verify-full'
  ) {
    return { rejectUnauthorized: true }
  }
  if (effectiveSslMode === 'allow' || effectiveSslMode === 'prefer') {
    return { rejectUnauthorized: false }
  }

  // Provider defaults: Neon requires TLS; Docker containers typically run without TLS on private/local networks
  return provider === 'neon-postgres' ? { rejectUnauthorized: true } : false
}

function hasDiscretePgConfig(): boolean {
  return Boolean(
    env.pg.host.length > 1 &&
      env.pg.database.length > 0 &&
      env.pg.user.length > 0 &&
      env.pg.password.length > 0
  )
}

export function resolvePostgresTarget(): ResolvedPgTarget | null {
  if (env.dbProvider === 'local') return null

  if (env.dbProvider === 'docker') {
    const conn = env.dockerDatabaseUrl || env.databaseUrl
    if (isValidPostgresUrl(conn)) {
      return {
        mode: 'docker-postgres',
        connectionString: conn,
        ssl: resolveSslForTarget('docker-postgres', conn),
      }
    }
    if (hasDiscretePgConfig()) {
      return {
        mode: 'docker-postgres',
        host: env.pg.host,
        port: env.pg.port,
        database: env.pg.database,
        user: env.pg.user,
        password: env.pg.password,
        ssl: resolveSslForTarget('docker-postgres'),
      }
    }
    return null
  }

  if (env.dbProvider === 'neon') {
    if (isValidPostgresUrl(env.databaseUrl)) {
      return {
        mode: 'neon-postgres',
        connectionString: env.databaseUrl,
        ssl: resolveSslForTarget('neon-postgres', env.databaseUrl),
      }
    }
    if (hasDiscretePgConfig()) {
      return {
        mode: 'neon-postgres',
        host: env.pg.host,
        port: env.pg.port,
        database: env.pg.database,
        user: env.pg.user,
        password: env.pg.password,
        ssl: resolveSslForTarget('neon-postgres'),
      }
    }
    return null
  }

  // Auto mode
  if (isValidPostgresUrl(env.databaseUrl)) {
    const parsed = new URL(env.databaseUrl)
    const urlSslMode = parsed.searchParams.get('sslmode')?.toLowerCase() || ''
    const isDocker =
      (isLocalOrDockerHost(parsed.hostname) || urlSslMode === 'disable' || env.pg.sslMode === 'disable') &&
      !parsed.hostname.includes('neon.tech')
    const mode: 'neon-postgres' | 'docker-postgres' = isDocker ? 'docker-postgres' : 'neon-postgres'
    return {
      mode,
      connectionString: env.databaseUrl,
      ssl: resolveSslForTarget(mode, env.databaseUrl),
    }
  }

  if (isValidPostgresUrl(env.dockerDatabaseUrl)) {
    return {
      mode: 'docker-postgres',
      connectionString: env.dockerDatabaseUrl,
      ssl: resolveSslForTarget('docker-postgres', env.dockerDatabaseUrl),
    }
  }

  if (hasDiscretePgConfig()) {
    const isDocker =
      (isLocalOrDockerHost(env.pg.host) || env.pg.sslMode === 'disable') &&
      !env.pg.host.includes('neon.tech')
    const mode: 'neon-postgres' | 'docker-postgres' = isDocker ? 'docker-postgres' : 'neon-postgres'
    return {
      mode,
      host: env.pg.host,
      port: env.pg.port,
      database: env.pg.database,
      user: env.pg.user,
      password: env.pg.password,
      ssl: resolveSslForTarget(mode),
    }
  }

  return null
}

export function getActiveDbMode(): DbConnectionMode {
  return resolvePostgresTarget()?.mode ?? 'local-store'
}

export function isPostgresEnabled(): boolean {
  return resolvePostgresTarget() !== null
}

export function getPgPool(): Pool | null {
  const target = resolvePostgresTarget()
  if (!target) return null

  if (!pgPool) {
    pgPool = target.connectionString
      ? new Pool({
          connectionString: target.connectionString,
          ssl: target.ssl,
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 15000,
        })
      : new Pool({
          host: target.host,
          port: target.port,
          database: target.database,
          user: target.user,
          password: target.password,
          ssl: target.ssl,
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 15000,
        })

    pgPool.on('error', (err) => {
      console.error(`Unexpected error on idle ${target.mode} pool client:`, err.message)
    })
  }

  return pgPool
}

async function runIdempotentSchemaEnhancements(client: PoolClient): Promise<void> {
  // Ensure auth + external_id columns exist on core tables that may have been created from schema-maestro.sql
  await client.query(`
    ALTER TABLE core_organizations
      ADD COLUMN IF NOT EXISTS external_id VARCHAR(120) NULL,
      ADD COLUMN IF NOT EXISTS external_source VARCHAR(80) NULL,
      ADD COLUMN IF NOT EXISTS external_synced_at TIMESTAMPTZ NULL;

    ALTER TABLE core_users
      ADD COLUMN IF NOT EXISTS password_hash TEXT NULL,
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS external_id VARCHAR(120) NULL,
      ADD COLUMN IF NOT EXISTS external_source VARCHAR(80) NULL,
      ADD COLUMN IF NOT EXISTS external_synced_at TIMESTAMPTZ NULL;

    ALTER TABLE cfg_external_integrations
      ADD COLUMN IF NOT EXISTS external_id VARCHAR(120) NULL,
      ADD COLUMN IF NOT EXISTS external_source VARCHAR(80) NULL,
      ADD COLUMN IF NOT EXISTS external_synced_at TIMESTAMPTZ NULL;

    ALTER TABLE audit_logs
      ADD COLUMN IF NOT EXISTS external_id VARCHAR(120) NULL,
      ADD COLUMN IF NOT EXISTS external_source VARCHAR(80) NULL,
      ADD COLUMN IF NOT EXISTS external_synced_at TIMESTAMPTZ NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS uq_core_organizations_ext
      ON core_organizations (external_source, external_id)
      WHERE external_id IS NOT NULL AND deleted_at IS NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS uq_core_users_ext
      ON core_users (external_source, external_id)
      WHERE external_id IS NOT NULL AND deleted_at IS NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS uq_cfg_external_integrations_org_ext
      ON cfg_external_integrations (organization_id, external_source, external_id)
      WHERE external_id IS NOT NULL;
  `)

  // Seed default organization & built-in roles idempotently
  await client.query(
    `
      INSERT INTO core_organizations (id, slug, name, status, plan_tier, reporting_currency)
      VALUES ($1, $2, $3, 'active', 'Enterprise', 'MXN')
      ON CONFLICT (id) DO NOTHING
    `,
    [DEFAULT_ORG_ID, 'brujula-estudio', 'Brújula Estudio S.A. de C.V.']
  )

  const defaultRoles = [
    {
      id: 'Administrador',
      name: 'Administrador General',
      description: 'Control total del espacio de trabajo, configuración y módulos.',
      builtInKey: 'admin',
      permissions: {
        CRM: { Resumen: 'full', Clientes: 'full', Proveedores: 'full', Empleados: 'full', Nómina: 'full', Oportunidades: 'full', Actividades: 'full' },
        Ventas: { Catálogo: 'full', Cotizaciones: 'full', Pedidos: 'full', Facturas: 'full', Devoluciones: 'full', Resumen: 'full' },
        Compras: { Resumen: 'full', Requisiciones: 'full', 'Órdenes de compra': 'full', Recepciones: 'full', Facturas: 'full', Devoluciones: 'full' },
        Operaciones: { Inventario: 'full', Traslados: 'full', Compras: 'full', Entregas: 'full', Resumen: 'full' },
        Finanzas: { Cobros: 'full', Pagos: 'full', 'Pagos Bancarios': 'full', 'Cuentas contables': 'full', Resumen: 'full' },
        Gastos: { 'Resumen y control': 'full', 'Registro y pólizas': 'full', 'Presupuestos y alertas': 'full', 'Gastos recurrentes': 'full' },
        Reportes: { 'Resumen ejecutivo': 'full', 'Estado de Resultados': 'full', 'Finanzas y Tesorería': 'full', 'CxP y Pagos EBP': 'full', 'Ventas y CxC': 'full', 'Compras e Inventario': 'full', 'Nómina y RRHH': 'full' },
        Administración: { Subsidiarias: 'full', Departamentos: 'full', Ubicaciones: 'full', 'Flujos de devoluciones': 'full', Resumen: 'full', 'Historial de Auditoría': 'full' },
        Configuración: { General: 'full', Organización: 'full', 'Idioma y región': 'full', Usuarios: 'full', 'Roles y permisos': 'full', Seguridad: 'full', Apariencia: 'full', Notificaciones: 'full', 'Umbrales de stock': 'full', Auditoría: 'full', Integraciones: 'full', 'Plan y facturación': 'full' },
      },
    },
    {
      id: 'Operaciones',
      name: 'Gerencia de Operaciones',
      description: 'Gestión de inventario, almacenes, compras y entregas.',
      builtInKey: 'ops',
      permissions: {
        CRM: { Proveedores: 'view' },
        Compras: { Resumen: 'view', Requisiciones: 'create', 'Órdenes de compra': 'edit', Recepciones: 'edit', Facturas: 'view', Devoluciones: 'edit' },
        Operaciones: { Inventario: 'edit', Traslados: 'edit', Compras: 'view', Entregas: 'edit', Resumen: 'view' },
      },
    },
    {
      id: 'Ventas',
      name: 'Equipo Comercial & Ventas',
      description: 'Gestión de clientes, catálogo, cotizaciones y pedidos.',
      builtInKey: 'sales',
      permissions: {
        CRM: { Resumen: 'view', Clientes: 'edit', Proveedores: 'view', Oportunidades: 'full', Actividades: 'full' },
        Ventas: { Catálogo: 'view', Cotizaciones: 'full', Pedidos: 'edit', Facturas: 'create', Devoluciones: 'edit', Resumen: 'view' },
      },
    },
  ]

  for (const role of defaultRoles) {
    await client.query(
      `
        INSERT INTO cfg_roles (
          id, organization_id, name, description, capabilities, section_permissions, built_in_key, for_api_integration
        )
        VALUES ($1, $2, $3, $4, '{}', $5::jsonb, $6, FALSE)
        ON CONFLICT (organization_id, id) DO NOTHING
      `,
      [role.id, DEFAULT_ORG_ID, role.name, role.description, JSON.stringify(role.permissions), role.builtInKey]
    )
  }

  // Seed initial starter entities with external IDs if empty for DEFAULT_ORG_ID
  const clientCountRes = await client.query<{ cnt: number }>(
    `SELECT COUNT(*)::int AS cnt FROM crm_clients WHERE organization_id = $1`,
    [DEFAULT_ORG_ID]
  )
  if ((clientCountRes.rows[0]?.cnt ?? 0) === 0) {
    const sampleClientId = 'c1a00001-0000-4000-8000-000000000001'
    await client.query(
      `
        INSERT INTO crm_clients (
          id, organization_id, client_code, entity_type, company, name, email, phone, rfc,
          status, country, currency, payment_terms, city, state, notes, addresses,
          external_id, external_source, external_synced_at
        )
        VALUES (
          $1, $2, 'CLI-001', 'company', 'Grupo Industrial Regio S.A. de C.V.', 'Laura Garza Montemayor',
          'laura.garza@regioindustrial.mx', '+52 81 8340 1200', 'GIR980412AB1',
          'Activo', 'MX', 'MXN', 'Crédito 30 días', 'Monterrey', 'Nuevo León',
          'Cliente corporativo con entregas programadas mensuales.',
          $3::jsonb, 'shp_cus_894210', 'shopify', NOW()
        )
        ON CONFLICT (id) DO NOTHING
      `,
      [
        sampleClientId,
        DEFAULT_ORG_ID,
        JSON.stringify([
          {
            street: 'Av. Constitución 1450 Pte.',
            colony: 'Centro',
            city: 'Monterrey',
            state: 'Nuevo León',
            zipCode: '64000',
            country: 'MX',
            isShipping: true,
            isBilling: true,
          },
        ]),
      ]
    )

    await client.query(
      `
        INSERT INTO int_external_id_mappings (
          id, organization_id, entity_type, entity_id, external_system, external_id, sync_direction
        )
        VALUES ('m1a00001-0000-4000-8000-000000000001', $1, 'client', $2, 'shopify', 'shp_cus_894210', 'bidirectional')
        ON CONFLICT (organization_id, external_system, entity_type, external_id) DO NOTHING
      `,
      [DEFAULT_ORG_ID, sampleClientId]
    )
  }

  const vendorCountRes = await client.query<{ cnt: number }>(
    `SELECT COUNT(*)::int AS cnt FROM crm_suppliers WHERE organization_id = $1`,
    [DEFAULT_ORG_ID]
  )
  if ((vendorCountRes.rows[0]?.cnt ?? 0) === 0) {
    await client.query(
      `
        INSERT INTO crm_suppliers (
          id, organization_id, vendor_code, entity_type, company, name, email, phone, rfc,
          category, status, country, currency, payment_terms, addresses, notes,
          external_id, external_source, external_synced_at
        )
        VALUES (
          'v1a00001-0000-4000-8000-000000000001', $1, 'PRV-001', 'company',
          'Logística y Suministros del Norte S.A.', 'Fernando Saldívar', 'cxp@logisticadelnorte.mx',
          '+52 81 8122 4400', 'LSN051120XY9', 'Logística y Hardware', 'Activo', 'MX', 'MXN',
          'Crédito 30 días', '[]'::jsonb, NULL, 'ERP-PRV-001', 'contpaqi', NOW()
        )
        ON CONFLICT (id) DO NOTHING
      `,
      [DEFAULT_ORG_ID]
    )
  }

  const catalogCountRes = await client.query<{ cnt: number }>(
    `SELECT COUNT(*)::int AS cnt FROM sal_catalog_items WHERE organization_id = $1`,
    [DEFAULT_ORG_ID]
  )
  if ((catalogCountRes.rows[0]?.cnt ?? 0) === 0) {
    await client.query(
      `
        INSERT INTO sal_catalog_items (
          id, organization_id, sku, name, item_type, category, unit, unit_price, cost_price,
          tax_rate, currency, billing_model, status, track_inventory, description,
          external_id, external_source, external_synced_at
        )
        VALUES (
          'p1a00001-0000-4000-8000-000000000001', $1, 'HW-POS-100',
          'Terminal Punto de Venta Pro X1', 'Producto', 'Hardware', 'Pieza', 12500, 8200,
          16, 'MXN', 'Único', 'Activo', TRUE,
          'Terminal táctil industrial con impresora térmica integrada.',
          'shp_prod_4410', 'shopify', NOW()
        )
        ON CONFLICT (id) DO NOTHING
      `,
      [DEFAULT_ORG_ID]
    )
  }

  await client.query(
    `
      INSERT INTO admin_departments (id, organization_id, code, name, cost_center, leader, status)
      VALUES ('d1a00001-0000-4000-8000-000000000001', $1, 'DEP-DIR', 'Dirección y Administración', 'CC-100', 'Andrea Morales Escala', 'Activo')
      ON CONFLICT (id) DO NOTHING
    `,
    [DEFAULT_ORG_ID]
  )

  await client.query(
    `
      INSERT INTO admin_locations (id, organization_id, code, name, type, city, state, address, status)
      VALUES ('l1a00001-0000-4000-8000-000000000001', $1, 'SUC-MTY', 'Matriz Monterrey Centro', 'Sucursal', 'Monterrey', 'Nuevo León', 'Av. Ignacio Morones Prieto 2110', 'Activa')
      ON CONFLICT (id) DO NOTHING
    `,
    [DEFAULT_ORG_ID]
  )
}

export async function migratePostgresSchema(): Promise<void> {
  const pool = getPgPool()
  if (!pool) {
    throw new Error('DATABASE_URL no está configurada para ejecutar la migración de Neon PostgreSQL.')
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const tableCheck = await client.query<{ tbl: string | null }>(
      `SELECT to_regclass('public.core_organizations') AS tbl`
    )

    if (!tableCheck.rows[0]?.tbl) {
      const schemaSqlPath = path.resolve(import.meta.dirname, '../../../docs/backend/schema-maestro.sql')
      const schemaSql = fs.readFileSync(schemaSqlPath, 'utf8')
      await client.query(schemaSql)
    }

    await runIdempotentSchemaEnhancements(client)
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

export async function ensurePostgresReady(): Promise<Pool | null> {
  const pool = getPgPool()
  if (!pool) return null

  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      try {
        await migratePostgresSchema()
        return pool
      } catch (err) {
        schemaReadyPromise = null
        throw err
      }
    })()
  }

  return schemaReadyPromise
}

export async function queryPg<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  const pool = await ensurePostgresReady()
  if (!pool) {
    throw new Error('PostgreSQL pool is not configured.')
  }
  return pool.query<T>(text, params)
}

export async function withPgTransaction<T>(
  organizationId: string | null,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = await ensurePostgresReady()
  if (!pool) {
    throw new Error('PostgreSQL pool is not configured.')
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    if (organizationId) {
      await client.query(`SELECT set_config('app.current_organization_id', $1, true)`, [organizationId])
    }
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

export async function nextPgFolio(
  client: PoolClient,
  organizationId: string,
  prefix: string,
  year = new Date().getUTCFullYear()
): Promise<string> {
  const res = await client.query<{ current_value: number }>(
    `
      INSERT INTO sys_folio_sequences (organization_id, prefix, fiscal_year, current_value)
      VALUES ($1, $2, $3, 1)
      ON CONFLICT (organization_id, prefix, fiscal_year)
      DO UPDATE SET current_value = sys_folio_sequences.current_value + 1
      RETURNING current_value
    `,
    [organizationId, prefix, year]
  )
  const seq = res.rows[0]?.current_value ?? 1
  return `${prefix}-${year}-${String(seq).padStart(3, '0')}`
}

export interface PgListOptions {
  table: string
  organizationId: string
  query: PaginationQuery
  requestId: string
  selectColumns: string
  searchColumns: string[]
  sortColumnMap: Record<string, string>
  defaultSortColumn?: string
  hasDeletedAt?: boolean
}

export async function executePaginatedPgQuery<Row extends QueryResultRow, Mapped>(
  opts: PgListOptions,
  mapRow: (row: Row) => Mapped
): Promise<{ data: Mapped[]; meta: PaginationMeta }> {
  const params: unknown[] = [opts.organizationId]
  const whereClauses: string[] = ['organization_id = $1']

  if (opts.hasDeletedAt !== false && !opts.query.includeDeleted) {
    whereClauses.push('deleted_at IS NULL')
  }

  if (opts.query.externalSource) {
    params.push(opts.query.externalSource.trim().toLowerCase())
    whereClauses.push(`external_source = $${params.length}`)
  }

  if (opts.query.externalId) {
    params.push(opts.query.externalId.trim())
    whereClauses.push(`external_id = $${params.length}`)
  }

  if (opts.query.search.trim() && opts.searchColumns.length > 0) {
    params.push(`%${opts.query.search.trim()}%`)
    const pIdx = params.length
    const searchExpr = opts.searchColumns
      .map((col) => `COALESCE(${col}::text, '') ILIKE $${pIdx}`)
      .join(' OR ')
    whereClauses.push(`(${searchExpr})`)
  }

  const whereSql = whereClauses.join(' AND ')
  const countRes = await queryPg<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM ${opts.table} WHERE ${whereSql}`,
    params
  )
  const totalItems = countRes.rows[0]?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(totalItems / opts.query.pageSize))
  const safePage = Math.min(Math.max(1, opts.query.page), totalPages)
  const offset = (safePage - 1) * opts.query.pageSize

  const sortCol =
    opts.sortColumnMap[opts.query.sortBy] ||
    opts.defaultSortColumn ||
    'updated_at'
  const sortDir = opts.query.sortDir === 'asc' ? 'ASC' : 'DESC'

  const dataParams = [...params, opts.query.pageSize, offset]
  const dataRes = await queryPg<Row>(
    `
      SELECT ${opts.selectColumns}
      FROM ${opts.table}
      WHERE ${whereSql}
      ORDER BY ${sortCol} ${sortDir} NULLS LAST, id DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `,
    dataParams
  )

  return {
    data: dataRes.rows.map(mapRow),
    meta: {
      page: safePage,
      pageSize: opts.query.pageSize,
      totalItems,
      totalPages,
      hasNext: safePage < totalPages,
      hasPrev: safePage > 1,
      requestId: opts.requestId,
    },
  }
}

export function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value
  return new Date().toISOString()
}

export function toNullableIsoString(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value
  return null
}

export function toDateOnlyString(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'string') return value.slice(0, 10)
  return new Date().toISOString().slice(0, 10)
}

export function toNullableDateOnlyString(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'string') return value.slice(0, 10)
  return null
}

export async function checkDatabaseHealth(): Promise<{ mode: DbConnectionMode; ok: boolean }> {
  const mode = getActiveDbMode()
  const pool = getPgPool()
  if (pool && mode !== 'local-store') {
    try {
      await ensurePostgresReady()
      await pool.query('SELECT 1')
      return { mode, ok: true }
    } catch (err) {
      console.error(`${mode} health check failed:`, err instanceof Error ? err.message : 'Unknown error')
      return { mode, ok: false }
    }
  }
  return { mode: 'local-store', ok: true }
}
