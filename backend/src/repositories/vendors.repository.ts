import crypto from 'node:crypto'
import type { QueryResultRow } from 'pg'
import {
  executePaginatedPgQuery,
  isPostgresEnabled,
  queryPg,
  toIsoString,
  toNullableIsoString,
} from '../db/postgres.ts'
import { paginateArray, persistDb, readDb, type ClientAddressEntity, type VendorEntity } from '../db/storage.ts'
import type { PaginationQuery } from '../types/common.ts'

interface VendorRow extends QueryResultRow {
  id: string
  organization_id: string
  vendor_code: string | null
  entity_type: 'company' | 'individual'
  company: string
  name: string
  email: string
  phone: string
  rfc: string | null
  category: string | null
  status: 'Activo' | 'Inactivo'
  country: string | null
  currency: string
  payment_terms: 'Contado' | 'Crédito 15 días' | 'Crédito 30 días' | 'Crédito 60 días'
  addresses: ClientAddressEntity[] | null
  notes: string | null
  external_id: string | null
  external_source: string | null
  external_synced_at: Date | string | null
  created_at: Date | string
  updated_at: Date | string
  deleted_at: Date | string | null
}

const VENDOR_COLUMNS = `
  id, organization_id, vendor_code, entity_type, company, name, email, phone, rfc,
  category, status, country, currency, payment_terms, addresses, notes,
  external_id, external_source, external_synced_at, created_at, updated_at, deleted_at
`

const VENDOR_SORT_MAP: Record<string, string> = {
  company: 'company',
  name: 'name',
  email: 'email',
  vendorCode: 'vendor_code',
  category: 'category',
  status: 'status',
  externalId: 'external_id',
  externalSource: 'external_source',
  externalSyncedAt: 'external_synced_at',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

function mapVendorRow(row: VendorRow): VendorEntity {
  return {
    id: row.id,
    organizationId: row.organization_id,
    vendorCode: row.vendor_code,
    entityType: row.entity_type,
    company: row.company,
    name: row.name,
    email: row.email,
    phone: row.phone,
    rfc: row.rfc,
    category: row.category,
    status: row.status,
    country: row.country,
    currency: row.currency,
    paymentTerms: row.payment_terms,
    addresses: Array.isArray(row.addresses) ? row.addresses : [],
    notes: row.notes,
    externalId: row.external_id,
    externalSource: row.external_source,
    externalSyncedAt: toNullableIsoString(row.external_synced_at),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    deletedAt: toNullableIsoString(row.deleted_at),
  }
}

export class VendorsRepository {
  async list(organizationId: string, query: PaginationQuery, requestId: string) {
    if (isPostgresEnabled()) {
      return executePaginatedPgQuery<VendorRow, VendorEntity>(
        {
          table: 'crm_suppliers',
          organizationId,
          query,
          requestId,
          selectColumns: VENDOR_COLUMNS,
          searchColumns: ['company', 'name', 'email', 'rfc', 'vendor_code', 'external_id'],
          sortColumnMap: VENDOR_SORT_MAP,
        },
        mapVendorRow
      )
    }

    const db = readDb()
    const rows = db.vendors.filter((v) => v.organizationId === organizationId)
    return paginateArray(
      rows as unknown as Array<Record<string, unknown>>,
      query,
      requestId,
      ['company', 'name', 'email', 'rfc', 'vendorCode', 'externalId']
    )
  }

  async findById(organizationId: string, id: string): Promise<VendorEntity | undefined> {
    if (isPostgresEnabled()) {
      const res = await queryPg<VendorRow>(
        `SELECT ${VENDOR_COLUMNS} FROM crm_suppliers WHERE organization_id = $1 AND id = $2 AND deleted_at IS NULL LIMIT 1`,
        [organizationId, id]
      )
      return res.rows[0] ? mapVendorRow(res.rows[0]) : undefined
    }

    const db = readDb()
    return db.vendors.find((v) => v.organizationId === organizationId && v.id === id && !v.deletedAt)
  }

  async findByExternal(
    organizationId: string,
    externalSource: string,
    externalId: string
  ): Promise<VendorEntity | undefined> {
    const src = externalSource.trim().toLowerCase()
    if (isPostgresEnabled()) {
      const res = await queryPg<VendorRow>(
        `
          SELECT ${VENDOR_COLUMNS}
          FROM crm_suppliers
          WHERE organization_id = $1
            AND deleted_at IS NULL
            AND external_source = $2
            AND external_id = $3
          LIMIT 1
        `,
        [organizationId, src, externalId]
      )
      return res.rows[0] ? mapVendorRow(res.rows[0]) : undefined
    }

    const db = readDb()
    return db.vendors.find(
      (v) =>
        v.organizationId === organizationId &&
        !v.deletedAt &&
        v.externalSource === src &&
        v.externalId === externalId
    )
  }

  async create(
    organizationId: string,
    input: Omit<VendorEntity, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'deletedAt'>
  ): Promise<VendorEntity> {
    if (isPostgresEnabled()) {
      const id = crypto.randomUUID()
      const res = await queryPg<VendorRow>(
        `
          INSERT INTO crm_suppliers (
            id, organization_id, vendor_code, entity_type, company, name, email, phone, rfc,
            category, status, country, currency, payment_terms, addresses, notes,
            external_id, external_source, external_synced_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9,
            $10, $11, $12, $13, $14, $15::jsonb, $16,
            $17, $18, $19
          )
          RETURNING ${VENDOR_COLUMNS}
        `,
        [
          id,
          organizationId,
          input.vendorCode,
          input.entityType,
          input.company,
          input.name,
          input.email,
          input.phone,
          input.rfc,
          input.category,
          input.status,
          input.country,
          input.currency,
          input.paymentTerms,
          JSON.stringify(input.addresses || []),
          input.notes,
          input.externalId ?? null,
          input.externalSource ?? null,
          input.externalSyncedAt ?? null,
        ]
      )
      return mapVendorRow(res.rows[0])
    }

    const db = readDb()
    const now = new Date().toISOString()
    const entity: VendorEntity = {
      ...input,
      id: crypto.randomUUID(),
      organizationId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }
    db.vendors.unshift(entity)
    persistDb(db)
    return entity
  }

  async update(
    organizationId: string,
    id: string,
    patch: Partial<VendorEntity>
  ): Promise<VendorEntity | undefined> {
    if (isPostgresEnabled()) {
      const existing = await this.findById(organizationId, id)
      if (!existing) return undefined

      const merged = {
        ...existing,
        ...patch,
      }
      const res = await queryPg<VendorRow>(
        `
          UPDATE crm_suppliers
          SET
            vendor_code = $3,
            entity_type = $4,
            company = $5,
            name = $6,
            email = $7,
            phone = $8,
            rfc = $9,
            category = $10,
            status = $11,
            country = $12,
            currency = $13,
            payment_terms = $14,
            addresses = $15::jsonb,
            notes = $16,
            external_id = $17,
            external_source = $18,
            external_synced_at = $19,
            updated_at = NOW()
          WHERE organization_id = $1 AND id = $2 AND deleted_at IS NULL
          RETURNING ${VENDOR_COLUMNS}
        `,
        [
          organizationId,
          id,
          merged.vendorCode,
          merged.entityType,
          merged.company,
          merged.name,
          merged.email,
          merged.phone,
          merged.rfc,
          merged.category,
          merged.status,
          merged.country,
          merged.currency,
          merged.paymentTerms,
          JSON.stringify(merged.addresses || []),
          merged.notes,
          merged.externalId ?? null,
          merged.externalSource ?? null,
          merged.externalSyncedAt ?? null,
        ]
      )
      return res.rows[0] ? mapVendorRow(res.rows[0]) : undefined
    }

    const db = readDb()
    const idx = db.vendors.findIndex((v) => v.organizationId === organizationId && v.id === id && !v.deletedAt)
    if (idx < 0) return undefined
    const updated: VendorEntity = {
      ...db.vendors[idx],
      ...patch,
      organizationId,
      id,
      updatedAt: new Date().toISOString(),
    }
    db.vendors[idx] = updated
    persistDb(db)
    return updated
  }

  async softDelete(organizationId: string, id: string): Promise<boolean> {
    if (isPostgresEnabled()) {
      const res = await queryPg(
        `
          UPDATE crm_suppliers
          SET deleted_at = NOW(), updated_at = NOW()
          WHERE organization_id = $1 AND id = $2 AND deleted_at IS NULL
        `,
        [organizationId, id]
      )
      return (res.rowCount ?? 0) > 0
    }

    const db = readDb()
    const idx = db.vendors.findIndex((v) => v.organizationId === organizationId && v.id === id && !v.deletedAt)
    if (idx < 0) return false
    const now = new Date().toISOString()
    db.vendors[idx] = { ...db.vendors[idx], deletedAt: now, updatedAt: now }
    persistDb(db)
    return true
  }
}
