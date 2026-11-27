import crypto from 'node:crypto'
import type { QueryResultRow } from 'pg'
import {
  executePaginatedPgQuery,
  isPostgresEnabled,
  queryPg,
  toIsoString,
  toNullableIsoString,
} from '../db/postgres.ts'
import { paginateArray, persistDb, readDb, type ClientAddressEntity, type ClientEntity } from '../db/storage.ts'
import type { PaginationQuery } from '../types/common.ts'

interface ClientRow extends QueryResultRow {
  id: string
  organization_id: string
  client_code: string | null
  entity_type: 'company' | 'individual'
  company: string
  name: string
  email: string
  phone: string
  rfc: string | null
  status: 'Activo' | 'Prospecto' | 'Inactivo'
  country: string | null
  currency: string
  payment_terms: 'Contado' | 'Crédito 15 días' | 'Crédito 30 días' | 'Crédito 60 días'
  city: string | null
  state: string | null
  notes: string | null
  addresses: ClientAddressEntity[] | null
  external_id: string | null
  external_source: string | null
  external_synced_at: Date | string | null
  created_at: Date | string
  updated_at: Date | string
  deleted_at: Date | string | null
}

const CLIENT_COLUMNS = `
  id, organization_id, client_code, entity_type, company, name, email, phone, rfc,
  status, country, currency, payment_terms, city, state, notes, addresses,
  external_id, external_source, external_synced_at, created_at, updated_at, deleted_at
`

const CLIENT_SORT_MAP: Record<string, string> = {
  company: 'company',
  name: 'name',
  email: 'email',
  clientCode: 'client_code',
  status: 'status',
  externalId: 'external_id',
  externalSource: 'external_source',
  externalSyncedAt: 'external_synced_at',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

function mapClientRow(row: ClientRow): ClientEntity {
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientCode: row.client_code,
    entityType: row.entity_type,
    company: row.company,
    name: row.name,
    email: row.email,
    phone: row.phone,
    rfc: row.rfc,
    status: row.status,
    country: row.country,
    currency: row.currency,
    paymentTerms: row.payment_terms,
    city: row.city,
    state: row.state,
    notes: row.notes,
    addresses: Array.isArray(row.addresses) ? row.addresses : [],
    externalId: row.external_id,
    externalSource: row.external_source,
    externalSyncedAt: toNullableIsoString(row.external_synced_at),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    deletedAt: toNullableIsoString(row.deleted_at),
  }
}

export class ClientsRepository {
  async list(organizationId: string, query: PaginationQuery, requestId: string) {
    if (isPostgresEnabled()) {
      return executePaginatedPgQuery<ClientRow, ClientEntity>(
        {
          table: 'crm_clients',
          organizationId,
          query,
          requestId,
          selectColumns: CLIENT_COLUMNS,
          searchColumns: ['company', 'name', 'email', 'rfc', 'client_code', 'external_id'],
          sortColumnMap: CLIENT_SORT_MAP,
        },
        mapClientRow
      )
    }

    const db = readDb()
    const rows = db.clients.filter((c) => c.organizationId === organizationId)
    return paginateArray(
      rows as unknown as Array<Record<string, unknown>>,
      query,
      requestId,
      ['company', 'name', 'email', 'rfc', 'clientCode', 'externalId']
    )
  }

  async findById(organizationId: string, id: string): Promise<ClientEntity | undefined> {
    if (isPostgresEnabled()) {
      const res = await queryPg<ClientRow>(
        `SELECT ${CLIENT_COLUMNS} FROM crm_clients WHERE organization_id = $1 AND id = $2 AND deleted_at IS NULL LIMIT 1`,
        [organizationId, id]
      )
      return res.rows[0] ? mapClientRow(res.rows[0]) : undefined
    }

    const db = readDb()
    return db.clients.find((c) => c.organizationId === organizationId && c.id === id && !c.deletedAt)
  }

  async findByExternal(
    organizationId: string,
    externalSource: string,
    externalId: string
  ): Promise<ClientEntity | undefined> {
    const src = externalSource.trim().toLowerCase()
    if (isPostgresEnabled()) {
      const res = await queryPg<ClientRow>(
        `
          SELECT ${CLIENT_COLUMNS}
          FROM crm_clients
          WHERE organization_id = $1
            AND deleted_at IS NULL
            AND external_source = $2
            AND external_id = $3
          LIMIT 1
        `,
        [organizationId, src, externalId]
      )
      return res.rows[0] ? mapClientRow(res.rows[0]) : undefined
    }

    const db = readDb()
    return db.clients.find(
      (c) =>
        c.organizationId === organizationId &&
        !c.deletedAt &&
        c.externalSource === src &&
        c.externalId === externalId
    )
  }

  async create(
    organizationId: string,
    input: Omit<ClientEntity, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'deletedAt'>
  ): Promise<ClientEntity> {
    if (isPostgresEnabled()) {
      const id = crypto.randomUUID()
      const res = await queryPg<ClientRow>(
        `
          INSERT INTO crm_clients (
            id, organization_id, client_code, entity_type, company, name, email, phone, rfc,
            status, country, currency, payment_terms, city, state, notes, addresses,
            external_id, external_source, external_synced_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9,
            $10, $11, $12, $13, $14, $15, $16, $17::jsonb,
            $18, $19, $20
          )
          RETURNING ${CLIENT_COLUMNS}
        `,
        [
          id,
          organizationId,
          input.clientCode,
          input.entityType,
          input.company,
          input.name,
          input.email,
          input.phone,
          input.rfc,
          input.status,
          input.country,
          input.currency,
          input.paymentTerms,
          input.city,
          input.state,
          input.notes,
          JSON.stringify(input.addresses || []),
          input.externalId ?? null,
          input.externalSource ?? null,
          input.externalSyncedAt ?? null,
        ]
      )
      return mapClientRow(res.rows[0])
    }

    const db = readDb()
    const now = new Date().toISOString()
    const entity: ClientEntity = {
      ...input,
      id: crypto.randomUUID(),
      organizationId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }
    db.clients.unshift(entity)
    persistDb(db)
    return entity
  }

  async update(
    organizationId: string,
    id: string,
    patch: Partial<ClientEntity>
  ): Promise<ClientEntity | undefined> {
    if (isPostgresEnabled()) {
      const existing = await this.findById(organizationId, id)
      if (!existing) return undefined

      const merged = {
        ...existing,
        ...patch,
      }
      const res = await queryPg<ClientRow>(
        `
          UPDATE crm_clients
          SET
            client_code = $3,
            entity_type = $4,
            company = $5,
            name = $6,
            email = $7,
            phone = $8,
            rfc = $9,
            status = $10,
            country = $11,
            currency = $12,
            payment_terms = $13,
            city = $14,
            state = $15,
            notes = $16,
            addresses = $17::jsonb,
            external_id = $18,
            external_source = $19,
            external_synced_at = $20,
            updated_at = NOW()
          WHERE organization_id = $1 AND id = $2 AND deleted_at IS NULL
          RETURNING ${CLIENT_COLUMNS}
        `,
        [
          organizationId,
          id,
          merged.clientCode,
          merged.entityType,
          merged.company,
          merged.name,
          merged.email,
          merged.phone,
          merged.rfc,
          merged.status,
          merged.country,
          merged.currency,
          merged.paymentTerms,
          merged.city,
          merged.state,
          merged.notes,
          JSON.stringify(merged.addresses || []),
          merged.externalId ?? null,
          merged.externalSource ?? null,
          merged.externalSyncedAt ?? null,
        ]
      )
      return res.rows[0] ? mapClientRow(res.rows[0]) : undefined
    }

    const db = readDb()
    const idx = db.clients.findIndex((c) => c.organizationId === organizationId && c.id === id && !c.deletedAt)
    if (idx < 0) return undefined
    const updated: ClientEntity = {
      ...db.clients[idx],
      ...patch,
      organizationId,
      id,
      updatedAt: new Date().toISOString(),
    }
    db.clients[idx] = updated
    persistDb(db)
    return updated
  }

  async softDelete(organizationId: string, id: string): Promise<boolean> {
    if (isPostgresEnabled()) {
      const res = await queryPg(
        `
          UPDATE crm_clients
          SET deleted_at = NOW(), updated_at = NOW()
          WHERE organization_id = $1 AND id = $2 AND deleted_at IS NULL
        `,
        [organizationId, id]
      )
      return (res.rowCount ?? 0) > 0
    }

    const db = readDb()
    const idx = db.clients.findIndex((c) => c.organizationId === organizationId && c.id === id && !c.deletedAt)
    if (idx < 0) return false
    const now = new Date().toISOString()
    db.clients[idx] = { ...db.clients[idx], deletedAt: now, updatedAt: now }
    persistDb(db)
    return true
  }
}
