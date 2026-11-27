import crypto from 'node:crypto'
import type { QueryResultRow } from 'pg'
import {
  executePaginatedPgQuery,
  isPostgresEnabled,
  nextPgFolio,
  queryPg,
  toDateOnlyString,
  toIsoString,
  toNullableDateOnlyString,
  toNullableIsoString,
  withPgTransaction,
} from '../db/postgres.ts'
import {
  nextFolio,
  paginateArray,
  persistDb,
  readDb,
  type CatalogItemEntity,
  type QuoteEntity,
  type SalesLineItemEntity,
  type SalesOrderEntity,
} from '../db/storage.ts'
import type { PaginationQuery } from '../types/common.ts'

interface CatalogRow extends QueryResultRow {
  id: string
  organization_id: string
  sku: string
  name: string
  item_type: 'Producto' | 'Servicio'
  category: string
  unit: string
  unit_price: string | number
  cost_price: string | number
  tax_rate: string | number
  currency: string
  billing_model: 'Único' | 'Recurrente'
  status: 'Activo' | 'Inactivo'
  track_inventory: boolean
  description: string | null
  external_id: string | null
  external_source: string | null
  external_synced_at: Date | string | null
  created_at: Date | string
  updated_at: Date | string
  deleted_at: Date | string | null
}

interface QuoteRow extends QueryResultRow {
  id: string
  organization_id: string
  folio: string
  client_id: string | null
  client_name: string
  issue_date: Date | string
  valid_until: Date | string
  status: 'Borrador' | 'Enviada' | 'Aprobada' | 'Rechazada' | 'Convertida'
  currency: string
  exchange_rate: string | number
  subtotal: string | number
  tax_amount: string | number
  total: string | number
  items: SalesLineItemEntity[] | null
  notes: string | null
  external_id: string | null
  external_source: string | null
  external_synced_at: Date | string | null
  created_at: Date | string
  updated_at: Date | string
  deleted_at: Date | string | null
}

interface OrderRow extends QueryResultRow {
  id: string
  organization_id: string
  folio: string
  quote_id: string | null
  client_id: string | null
  client_name: string
  order_date: Date | string
  delivery_date: Date | string | null
  status: 'Pendiente' | 'Confirmado' | 'En preparación' | 'Entregado' | 'Cancelado'
  currency: string
  exchange_rate: string | number
  subtotal: string | number
  tax_amount: string | number
  total: string | number
  items: SalesLineItemEntity[] | null
  notes: string | null
  external_id: string | null
  external_source: string | null
  external_synced_at: Date | string | null
  created_at: Date | string
  updated_at: Date | string
  deleted_at: Date | string | null
}

const CATALOG_COLUMNS = `
  id, organization_id, sku, name, item_type, category, unit, unit_price, cost_price,
  tax_rate, currency, billing_model, status, track_inventory, description,
  external_id, external_source, external_synced_at, created_at, updated_at, deleted_at
`

const QUOTE_COLUMNS = `
  id, organization_id, folio, client_id, client_name, issue_date, valid_until, status,
  currency, exchange_rate, subtotal, tax_amount, total, items, notes,
  external_id, external_source, external_synced_at, created_at, updated_at, deleted_at
`

const ORDER_COLUMNS = `
  id, organization_id, folio, quote_id, client_id, client_name, order_date, delivery_date, status,
  currency, exchange_rate, subtotal, tax_amount, total, items, notes,
  external_id, external_source, external_synced_at, created_at, updated_at, deleted_at
`

const CATALOG_SORT_MAP: Record<string, string> = {
  sku: 'sku',
  name: 'name',
  category: 'category',
  unitPrice: 'unit_price',
  status: 'status',
  externalId: 'external_id',
  externalSource: 'external_source',
  externalSyncedAt: 'external_synced_at',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

const QUOTE_SORT_MAP: Record<string, string> = {
  folio: 'folio',
  clientName: 'client_name',
  issueDate: 'issue_date',
  validUntil: 'valid_until',
  status: 'status',
  total: 'total',
  externalId: 'external_id',
  externalSource: 'external_source',
  externalSyncedAt: 'external_synced_at',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

const ORDER_SORT_MAP: Record<string, string> = {
  folio: 'folio',
  clientName: 'client_name',
  orderDate: 'order_date',
  status: 'status',
  total: 'total',
  externalId: 'external_id',
  externalSource: 'external_source',
  externalSyncedAt: 'external_synced_at',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

function mapCatalogRow(row: CatalogRow): CatalogItemEntity {
  return {
    id: row.id,
    organizationId: row.organization_id,
    sku: row.sku,
    name: row.name,
    itemType: row.item_type,
    category: row.category,
    unit: row.unit,
    unitPrice: Number(row.unit_price),
    costPrice: Number(row.cost_price),
    taxRate: Number(row.tax_rate),
    currency: row.currency,
    billingModel: row.billing_model,
    status: row.status,
    trackInventory: Boolean(row.track_inventory),
    description: row.description,
    externalId: row.external_id,
    externalSource: row.external_source,
    externalSyncedAt: toNullableIsoString(row.external_synced_at),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    deletedAt: toNullableIsoString(row.deleted_at),
  }
}

function mapQuoteRow(row: QuoteRow): QuoteEntity {
  return {
    id: row.id,
    organizationId: row.organization_id,
    folio: row.folio,
    clientId: row.client_id,
    clientName: row.client_name,
    issueDate: toDateOnlyString(row.issue_date),
    validUntil: toDateOnlyString(row.valid_until),
    status: row.status,
    currency: row.currency,
    exchangeRate: Number(row.exchange_rate),
    subtotal: Number(row.subtotal),
    taxAmount: Number(row.tax_amount),
    total: Number(row.total),
    items: Array.isArray(row.items) ? row.items : [],
    notes: row.notes,
    externalId: row.external_id,
    externalSource: row.external_source,
    externalSyncedAt: toNullableIsoString(row.external_synced_at),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    deletedAt: toNullableIsoString(row.deleted_at),
  }
}

function mapOrderRow(row: OrderRow): SalesOrderEntity {
  return {
    id: row.id,
    organizationId: row.organization_id,
    folio: row.folio,
    quoteId: row.quote_id,
    clientId: row.client_id,
    clientName: row.client_name,
    orderDate: toDateOnlyString(row.order_date),
    deliveryDate: toNullableDateOnlyString(row.delivery_date),
    status: row.status,
    currency: row.currency,
    exchangeRate: Number(row.exchange_rate),
    subtotal: Number(row.subtotal),
    taxAmount: Number(row.tax_amount),
    total: Number(row.total),
    items: Array.isArray(row.items) ? row.items : [],
    notes: row.notes,
    externalId: row.external_id,
    externalSource: row.external_source,
    externalSyncedAt: toNullableIsoString(row.external_synced_at),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    deletedAt: toNullableIsoString(row.deleted_at),
  }
}

export class SalesRepository {
  // --- Catalog ---
  async listCatalog(organizationId: string, query: PaginationQuery, requestId: string) {
    if (isPostgresEnabled()) {
      return executePaginatedPgQuery<CatalogRow, CatalogItemEntity>(
        {
          table: 'sal_catalog_items',
          organizationId,
          query,
          requestId,
          selectColumns: CATALOG_COLUMNS,
          searchColumns: ['sku', 'name', 'category', 'external_id'],
          sortColumnMap: CATALOG_SORT_MAP,
        },
        mapCatalogRow
      )
    }

    const db = readDb()
    const rows = db.catalogItems.filter((p) => p.organizationId === organizationId)
    return paginateArray(
      rows as unknown as Array<Record<string, unknown>>,
      query,
      requestId,
      ['sku', 'name', 'category', 'externalId']
    )
  }

  async findCatalogById(organizationId: string, id: string): Promise<CatalogItemEntity | undefined> {
    if (isPostgresEnabled()) {
      const res = await queryPg<CatalogRow>(
        `SELECT ${CATALOG_COLUMNS} FROM sal_catalog_items WHERE organization_id = $1 AND id = $2 AND deleted_at IS NULL LIMIT 1`,
        [organizationId, id]
      )
      return res.rows[0] ? mapCatalogRow(res.rows[0]) : undefined
    }

    const db = readDb()
    return db.catalogItems.find((p) => p.organizationId === organizationId && p.id === id && !p.deletedAt)
  }

  async findCatalogBySku(organizationId: string, sku: string): Promise<CatalogItemEntity | undefined> {
    const norm = sku.trim().toLowerCase()
    if (isPostgresEnabled()) {
      const res = await queryPg<CatalogRow>(
        `
          SELECT ${CATALOG_COLUMNS}
          FROM sal_catalog_items
          WHERE organization_id = $1 AND deleted_at IS NULL AND LOWER(TRIM(sku)) = $2
          LIMIT 1
        `,
        [organizationId, norm]
      )
      return res.rows[0] ? mapCatalogRow(res.rows[0]) : undefined
    }

    const db = readDb()
    return db.catalogItems.find(
      (p) => p.organizationId === organizationId && !p.deletedAt && p.sku.trim().toLowerCase() === norm
    )
  }

  async findCatalogByExternal(
    organizationId: string,
    externalSource: string,
    externalId: string
  ): Promise<CatalogItemEntity | undefined> {
    const src = externalSource.trim().toLowerCase()
    if (isPostgresEnabled()) {
      const res = await queryPg<CatalogRow>(
        `
          SELECT ${CATALOG_COLUMNS}
          FROM sal_catalog_items
          WHERE organization_id = $1
            AND deleted_at IS NULL
            AND external_source = $2
            AND external_id = $3
          LIMIT 1
        `,
        [organizationId, src, externalId]
      )
      return res.rows[0] ? mapCatalogRow(res.rows[0]) : undefined
    }

    const db = readDb()
    return db.catalogItems.find(
      (p) =>
        p.organizationId === organizationId &&
        !p.deletedAt &&
        p.externalSource === src &&
        p.externalId === externalId
    )
  }

  async createCatalogItem(
    organizationId: string,
    input: Omit<CatalogItemEntity, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'deletedAt'>
  ): Promise<CatalogItemEntity> {
    if (isPostgresEnabled()) {
      const id = crypto.randomUUID()
      const res = await queryPg<CatalogRow>(
        `
          INSERT INTO sal_catalog_items (
            id, organization_id, sku, name, item_type, category, unit, unit_price, cost_price,
            tax_rate, currency, billing_model, status, track_inventory, description,
            external_id, external_source, external_synced_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9,
            $10, $11, $12, $13, $14, $15,
            $16, $17, $18
          )
          RETURNING ${CATALOG_COLUMNS}
        `,
        [
          id,
          organizationId,
          input.sku,
          input.name,
          input.itemType,
          input.category,
          input.unit,
          input.unitPrice,
          input.costPrice,
          input.taxRate,
          input.currency,
          input.billingModel,
          input.status,
          input.trackInventory,
          input.description,
          input.externalId ?? null,
          input.externalSource ?? null,
          input.externalSyncedAt ?? null,
        ]
      )
      return mapCatalogRow(res.rows[0])
    }

    const db = readDb()
    const now = new Date().toISOString()
    const entity: CatalogItemEntity = {
      ...input,
      id: crypto.randomUUID(),
      organizationId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }
    db.catalogItems.unshift(entity)
    persistDb(db)
    return entity
  }

  // --- Quotes ---
  async listQuotes(organizationId: string, query: PaginationQuery, requestId: string) {
    if (isPostgresEnabled()) {
      return executePaginatedPgQuery<QuoteRow, QuoteEntity>(
        {
          table: 'sal_quotes',
          organizationId,
          query,
          requestId,
          selectColumns: QUOTE_COLUMNS,
          searchColumns: ['folio', 'client_name', 'status', 'external_id'],
          sortColumnMap: QUOTE_SORT_MAP,
        },
        mapQuoteRow
      )
    }

    const db = readDb()
    const rows = db.quotes.filter((q) => q.organizationId === organizationId)
    return paginateArray(
      rows as unknown as Array<Record<string, unknown>>,
      query,
      requestId,
      ['folio', 'clientName', 'status', 'externalId']
    )
  }

  async findQuoteById(organizationId: string, id: string): Promise<QuoteEntity | undefined> {
    if (isPostgresEnabled()) {
      const res = await queryPg<QuoteRow>(
        `SELECT ${QUOTE_COLUMNS} FROM sal_quotes WHERE organization_id = $1 AND id = $2 AND deleted_at IS NULL LIMIT 1`,
        [organizationId, id]
      )
      return res.rows[0] ? mapQuoteRow(res.rows[0]) : undefined
    }

    const db = readDb()
    return db.quotes.find((q) => q.organizationId === organizationId && q.id === id && !q.deletedAt)
  }

  async findQuoteByExternal(
    organizationId: string,
    externalSource: string,
    externalId: string
  ): Promise<QuoteEntity | undefined> {
    const src = externalSource.trim().toLowerCase()
    if (isPostgresEnabled()) {
      const res = await queryPg<QuoteRow>(
        `
          SELECT ${QUOTE_COLUMNS}
          FROM sal_quotes
          WHERE organization_id = $1
            AND deleted_at IS NULL
            AND external_source = $2
            AND external_id = $3
          LIMIT 1
        `,
        [organizationId, src, externalId]
      )
      return res.rows[0] ? mapQuoteRow(res.rows[0]) : undefined
    }

    const db = readDb()
    return db.quotes.find(
      (q) =>
        q.organizationId === organizationId &&
        !q.deletedAt &&
        q.externalSource === src &&
        q.externalId === externalId
    )
  }

  async createQuote(
    organizationId: string,
    input: Omit<QuoteEntity, 'id' | 'folio' | 'organizationId' | 'createdAt' | 'updatedAt' | 'deletedAt'>
  ): Promise<QuoteEntity> {
    if (isPostgresEnabled()) {
      return withPgTransaction(organizationId, async (client) => {
        const folio = await nextPgFolio(client, organizationId, 'COT')
        const id = crypto.randomUUID()
        const res = await client.query<QuoteRow>(
          `
            INSERT INTO sal_quotes (
              id, organization_id, folio, client_id, client_name, issue_date, valid_until, status,
              currency, exchange_rate, subtotal, tax_amount, total, items, notes,
              external_id, external_source, external_synced_at
            )
            VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8,
              $9, $10, $11, $12, $13, $14::jsonb, $15,
              $16, $17, $18
            )
            RETURNING ${QUOTE_COLUMNS}
          `,
          [
            id,
            organizationId,
            folio,
            input.clientId,
            input.clientName,
            input.issueDate,
            input.validUntil,
            input.status,
            input.currency,
            input.exchangeRate,
            input.subtotal,
            input.taxAmount,
            input.total,
            JSON.stringify(input.items || []),
            input.notes,
            input.externalId ?? null,
            input.externalSource ?? null,
            input.externalSyncedAt ?? null,
          ]
        )
        return mapQuoteRow(res.rows[0])
      })
    }

    const db = readDb()
    const now = new Date().toISOString()
    const folio = nextFolio(organizationId, 'COT')
    const entity: QuoteEntity = {
      ...input,
      id: crypto.randomUUID(),
      folio,
      organizationId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }
    db.quotes.unshift(entity)
    persistDb(db)
    return entity
  }

  async updateQuote(
    organizationId: string,
    id: string,
    patch: Partial<QuoteEntity>
  ): Promise<QuoteEntity | undefined> {
    if (isPostgresEnabled()) {
      const existing = await this.findQuoteById(organizationId, id)
      if (!existing) return undefined

      const merged = { ...existing, ...patch }
      const res = await queryPg<QuoteRow>(
        `
          UPDATE sal_quotes
          SET
            client_id = $3,
            client_name = $4,
            issue_date = $5,
            valid_until = $6,
            status = $7,
            currency = $8,
            exchange_rate = $9,
            subtotal = $10,
            tax_amount = $11,
            total = $12,
            items = $13::jsonb,
            notes = $14,
            external_id = $15,
            external_source = $16,
            external_synced_at = $17,
            updated_at = NOW()
          WHERE organization_id = $1 AND id = $2 AND deleted_at IS NULL
          RETURNING ${QUOTE_COLUMNS}
        `,
        [
          organizationId,
          id,
          merged.clientId,
          merged.clientName,
          merged.issueDate,
          merged.validUntil,
          merged.status,
          merged.currency,
          merged.exchangeRate,
          merged.subtotal,
          merged.taxAmount,
          merged.total,
          JSON.stringify(merged.items || []),
          merged.notes,
          merged.externalId ?? null,
          merged.externalSource ?? null,
          merged.externalSyncedAt ?? null,
        ]
      )
      return res.rows[0] ? mapQuoteRow(res.rows[0]) : undefined
    }

    const db = readDb()
    const idx = db.quotes.findIndex((q) => q.organizationId === organizationId && q.id === id && !q.deletedAt)
    if (idx < 0) return undefined
    const updated: QuoteEntity = {
      ...db.quotes[idx],
      ...patch,
      organizationId,
      id,
      updatedAt: new Date().toISOString(),
    }
    db.quotes[idx] = updated
    persistDb(db)
    return updated
  }

  // --- Orders ---
  async listOrders(organizationId: string, query: PaginationQuery, requestId: string) {
    if (isPostgresEnabled()) {
      return executePaginatedPgQuery<OrderRow, SalesOrderEntity>(
        {
          table: 'sal_orders',
          organizationId,
          query,
          requestId,
          selectColumns: ORDER_COLUMNS,
          searchColumns: ['folio', 'client_name', 'status', 'external_id'],
          sortColumnMap: ORDER_SORT_MAP,
        },
        mapOrderRow
      )
    }

    const db = readDb()
    const rows = db.orders.filter((o) => o.organizationId === organizationId)
    return paginateArray(
      rows as unknown as Array<Record<string, unknown>>,
      query,
      requestId,
      ['folio', 'clientName', 'status', 'externalId']
    )
  }

  async findOrderById(organizationId: string, id: string): Promise<SalesOrderEntity | undefined> {
    if (isPostgresEnabled()) {
      const res = await queryPg<OrderRow>(
        `SELECT ${ORDER_COLUMNS} FROM sal_orders WHERE organization_id = $1 AND id = $2 AND deleted_at IS NULL LIMIT 1`,
        [organizationId, id]
      )
      return res.rows[0] ? mapOrderRow(res.rows[0]) : undefined
    }

    const db = readDb()
    return db.orders.find((o) => o.organizationId === organizationId && o.id === id && !o.deletedAt)
  }

  async findOrderByExternal(
    organizationId: string,
    externalSource: string,
    externalId: string
  ): Promise<SalesOrderEntity | undefined> {
    const src = externalSource.trim().toLowerCase()
    if (isPostgresEnabled()) {
      const res = await queryPg<OrderRow>(
        `
          SELECT ${ORDER_COLUMNS}
          FROM sal_orders
          WHERE organization_id = $1
            AND deleted_at IS NULL
            AND external_source = $2
            AND external_id = $3
          LIMIT 1
        `,
        [organizationId, src, externalId]
      )
      return res.rows[0] ? mapOrderRow(res.rows[0]) : undefined
    }

    const db = readDb()
    return db.orders.find(
      (o) =>
        o.organizationId === organizationId &&
        !o.deletedAt &&
        o.externalSource === src &&
        o.externalId === externalId
    )
  }

  async createOrder(
    organizationId: string,
    input: Omit<SalesOrderEntity, 'id' | 'folio' | 'organizationId' | 'createdAt' | 'updatedAt' | 'deletedAt'>
  ): Promise<SalesOrderEntity> {
    if (isPostgresEnabled()) {
      return withPgTransaction(organizationId, async (client) => {
        const folio = await nextPgFolio(client, organizationId, 'PED')
        const id = crypto.randomUUID()
        const res = await client.query<OrderRow>(
          `
            INSERT INTO sal_orders (
              id, organization_id, folio, quote_id, client_id, client_name, order_date, delivery_date,
              status, currency, exchange_rate, subtotal, tax_amount, total, items, notes,
              external_id, external_source, external_synced_at
            )
            VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8,
              $9, $10, $11, $12, $13, $14, $15::jsonb, $16,
              $17, $18, $19
            )
            RETURNING ${ORDER_COLUMNS}
          `,
          [
            id,
            organizationId,
            folio,
            input.quoteId,
            input.clientId,
            input.clientName,
            input.orderDate,
            input.deliveryDate,
            input.status,
            input.currency,
            input.exchangeRate,
            input.subtotal,
            input.taxAmount,
            input.total,
            JSON.stringify(input.items || []),
            input.notes,
            input.externalId ?? null,
            input.externalSource ?? null,
            input.externalSyncedAt ?? null,
          ]
        )
        return mapOrderRow(res.rows[0])
      })
    }

    const db = readDb()
    const now = new Date().toISOString()
    const folio = nextFolio(organizationId, 'PED')
    const entity: SalesOrderEntity = {
      ...input,
      id: crypto.randomUUID(),
      folio,
      organizationId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }
    db.orders.unshift(entity)
    persistDb(db)
    return entity
  }
}
