import crypto from 'node:crypto'
import type { QueryResultRow } from 'pg'
import {
  executePaginatedPgQuery,
  isPostgresEnabled,
  queryPg,
  toIsoString,
  toNullableIsoString,
} from '../db/postgres.ts'
import {
  paginateArray,
  persistDb,
  readDb,
  type DepartmentEntity,
  type LocationEntity,
} from '../db/storage.ts'
import type { PaginationQuery } from '../types/common.ts'

interface DepartmentRow extends QueryResultRow {
  id: string
  organization_id: string
  code: string
  name: string
  cost_center: string
  leader: string
  status: 'Activo' | 'Inactivo'
  external_id: string | null
  external_source: string | null
  external_synced_at: Date | string | null
  created_at: Date | string
  updated_at: Date | string
  deleted_at: Date | string | null
}

interface LocationRow extends QueryResultRow {
  id: string
  organization_id: string
  code: string
  name: string
  type: 'Oficina' | 'Sucursal' | 'Almacén' | 'Centro de distribución'
  city: string
  state: string
  address: string
  status: 'Activa' | 'Inactiva'
  external_id: string | null
  external_source: string | null
  external_synced_at: Date | string | null
  created_at: Date | string
  updated_at: Date | string
  deleted_at: Date | string | null
}

const DEPARTMENT_COLUMNS = `
  id, organization_id, code, name, cost_center, leader, status,
  external_id, external_source, external_synced_at, created_at, updated_at, deleted_at
`

const LOCATION_COLUMNS = `
  id, organization_id, code, name, type, city, state, address, status,
  external_id, external_source, external_synced_at, created_at, updated_at, deleted_at
`

const DEPARTMENT_SORT_MAP: Record<string, string> = {
  code: 'code',
  name: 'name',
  costCenter: 'cost_center',
  leader: 'leader',
  status: 'status',
  externalId: 'external_id',
  externalSource: 'external_source',
  externalSyncedAt: 'external_synced_at',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

const LOCATION_SORT_MAP: Record<string, string> = {
  code: 'code',
  name: 'name',
  type: 'type',
  city: 'city',
  state: 'state',
  status: 'status',
  externalId: 'external_id',
  externalSource: 'external_source',
  externalSyncedAt: 'external_synced_at',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

function mapDepartmentRow(row: DepartmentRow): DepartmentEntity {
  return {
    id: row.id,
    organizationId: row.organization_id,
    code: row.code,
    name: row.name,
    costCenter: row.cost_center,
    leader: row.leader,
    status: row.status,
    externalId: row.external_id,
    externalSource: row.external_source,
    externalSyncedAt: toNullableIsoString(row.external_synced_at),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    deletedAt: toNullableIsoString(row.deleted_at),
  }
}

function mapLocationRow(row: LocationRow): LocationEntity {
  return {
    id: row.id,
    organizationId: row.organization_id,
    code: row.code,
    name: row.name,
    type: row.type,
    city: row.city,
    state: row.state,
    address: row.address,
    status: row.status,
    externalId: row.external_id,
    externalSource: row.external_source,
    externalSyncedAt: toNullableIsoString(row.external_synced_at),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    deletedAt: toNullableIsoString(row.deleted_at),
  }
}

export class AdminRepository {
  async listDepartments(organizationId: string, query: PaginationQuery, requestId: string) {
    if (isPostgresEnabled()) {
      return executePaginatedPgQuery<DepartmentRow, DepartmentEntity>(
        {
          table: 'admin_departments',
          organizationId,
          query,
          requestId,
          selectColumns: DEPARTMENT_COLUMNS,
          searchColumns: ['code', 'name', 'cost_center', 'leader', 'external_id'],
          sortColumnMap: DEPARTMENT_SORT_MAP,
        },
        mapDepartmentRow
      )
    }

    const db = readDb()
    const rows = db.departments.filter((d) => d.organizationId === organizationId)
    return paginateArray(
      rows as unknown as Array<Record<string, unknown>>,
      query,
      requestId,
      ['code', 'name', 'costCenter', 'leader', 'externalId']
    )
  }

  async findDepartmentByExternal(
    organizationId: string,
    externalSource: string,
    externalId: string
  ): Promise<DepartmentEntity | undefined> {
    const src = externalSource.trim().toLowerCase()
    if (isPostgresEnabled()) {
      const res = await queryPg<DepartmentRow>(
        `
          SELECT ${DEPARTMENT_COLUMNS}
          FROM admin_departments
          WHERE organization_id = $1
            AND deleted_at IS NULL
            AND external_source = $2
            AND external_id = $3
          LIMIT 1
        `,
        [organizationId, src, externalId]
      )
      return res.rows[0] ? mapDepartmentRow(res.rows[0]) : undefined
    }

    const db = readDb()
    return db.departments.find(
      (d) =>
        d.organizationId === organizationId &&
        !d.deletedAt &&
        d.externalSource === src &&
        d.externalId === externalId
    )
  }

  async createDepartment(
    organizationId: string,
    input: Omit<DepartmentEntity, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'deletedAt'>
  ): Promise<DepartmentEntity> {
    if (isPostgresEnabled()) {
      const id = crypto.randomUUID()
      const res = await queryPg<DepartmentRow>(
        `
          INSERT INTO admin_departments (
            id, organization_id, code, name, cost_center, leader, status,
            external_id, external_source, external_synced_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING ${DEPARTMENT_COLUMNS}
        `,
        [
          id,
          organizationId,
          input.code,
          input.name,
          input.costCenter,
          input.leader,
          input.status,
          input.externalId ?? null,
          input.externalSource ?? null,
          input.externalSyncedAt ?? null,
        ]
      )
      return mapDepartmentRow(res.rows[0])
    }

    const db = readDb()
    const now = new Date().toISOString()
    const entity: DepartmentEntity = {
      ...input,
      id: crypto.randomUUID(),
      organizationId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }
    db.departments.unshift(entity)
    persistDb(db)
    return entity
  }

  async listLocations(organizationId: string, query: PaginationQuery, requestId: string) {
    if (isPostgresEnabled()) {
      return executePaginatedPgQuery<LocationRow, LocationEntity>(
        {
          table: 'admin_locations',
          organizationId,
          query,
          requestId,
          selectColumns: LOCATION_COLUMNS,
          searchColumns: ['code', 'name', 'city', 'state', 'external_id'],
          sortColumnMap: LOCATION_SORT_MAP,
        },
        mapLocationRow
      )
    }

    const db = readDb()
    const rows = db.locations.filter((l) => l.organizationId === organizationId)
    return paginateArray(
      rows as unknown as Array<Record<string, unknown>>,
      query,
      requestId,
      ['code', 'name', 'city', 'state', 'externalId']
    )
  }

  async findLocationByExternal(
    organizationId: string,
    externalSource: string,
    externalId: string
  ): Promise<LocationEntity | undefined> {
    const src = externalSource.trim().toLowerCase()
    if (isPostgresEnabled()) {
      const res = await queryPg<LocationRow>(
        `
          SELECT ${LOCATION_COLUMNS}
          FROM admin_locations
          WHERE organization_id = $1
            AND deleted_at IS NULL
            AND external_source = $2
            AND external_id = $3
          LIMIT 1
        `,
        [organizationId, src, externalId]
      )
      return res.rows[0] ? mapLocationRow(res.rows[0]) : undefined
    }

    const db = readDb()
    return db.locations.find(
      (l) =>
        l.organizationId === organizationId &&
        !l.deletedAt &&
        l.externalSource === src &&
        l.externalId === externalId
    )
  }

  async createLocation(
    organizationId: string,
    input: Omit<LocationEntity, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'deletedAt'>
  ): Promise<LocationEntity> {
    if (isPostgresEnabled()) {
      const id = crypto.randomUUID()
      const res = await queryPg<LocationRow>(
        `
          INSERT INTO admin_locations (
            id, organization_id, code, name, type, city, state, address, status,
            external_id, external_source, external_synced_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING ${LOCATION_COLUMNS}
        `,
        [
          id,
          organizationId,
          input.code,
          input.name,
          input.type,
          input.city,
          input.state,
          input.address,
          input.status,
          input.externalId ?? null,
          input.externalSource ?? null,
          input.externalSyncedAt ?? null,
        ]
      )
      return mapLocationRow(res.rows[0])
    }

    const db = readDb()
    const now = new Date().toISOString()
    const entity: LocationEntity = {
      ...input,
      id: crypto.randomUUID(),
      organizationId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }
    db.locations.unshift(entity)
    persistDb(db)
    return entity
  }
}
