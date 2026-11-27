import crypto from 'node:crypto'
import type { Prisma, PurchaseOrder } from '@prisma/client'
import { getPrismaClientReady } from '../db/prisma.ts'
import {
  paginateArray,
  persistDb,
  readDb,
  type PurchaseOrderEntity,
  type SalesLineItemEntity,
} from '../db/storage.ts'
import type { PaginationQuery } from '../types/common.ts'

const SORT_FIELD_MAP: Record<string, keyof Prisma.PurchaseOrderOrderByWithRelationInput> = {
  folio: 'folio',
  supplierName: 'supplierName',
  orderDate: 'orderDate',
  status: 'status',
  total: 'total',
  externalId: 'externalId',
  external_id: 'externalId',
  externalSource: 'externalSource',
  externalSyncedAt: 'externalSyncedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
}

function mapPrismaPurchaseOrder(row: PurchaseOrder): PurchaseOrderEntity {
  return {
    id: row.id,
    organizationId: row.organizationId,
    folio: row.folio,
    requisitionId: row.requisitionId,
    supplierId: row.supplierId,
    supplierName: row.supplierName,
    warehouseId: row.warehouseId,
    orderDate: row.orderDate.toISOString().slice(0, 10),
    expectedDate: row.expectedDate ? row.expectedDate.toISOString().slice(0, 10) : null,
    status: row.status,
    currency: row.currency,
    exchangeRate: Number(row.exchangeRate),
    subtotal: Number(row.subtotal),
    taxAmount: Number(row.taxAmount),
    total: Number(row.total),
    items: Array.isArray(row.items) ? (row.items as unknown as SalesLineItemEntity[]) : [],
    externalId: row.externalId,
    externalSource: row.externalSource,
    externalSyncedAt: row.externalSyncedAt ? row.externalSyncedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
  }
}

export class CompraRepository {
  async list(organizationId: string, query: PaginationQuery, requestId: string) {
    const prisma = await getPrismaClientReady()
    if (prisma) {
      const search = query.search.trim()
      const where: Prisma.PurchaseOrderWhereInput = {
        organizationId,
        ...(query.includeDeleted ? {} : { deletedAt: null }),
        ...(query.externalSource ? { externalSource: query.externalSource.trim().toLowerCase() } : {}),
        ...(query.externalId ? { externalId: query.externalId.trim() } : {}),
        ...(search
          ? {
              OR: [
                { folio: { contains: search, mode: 'insensitive' } },
                { supplierName: { contains: search, mode: 'insensitive' } },
                { status: { contains: search, mode: 'insensitive' } },
                { externalId: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      }

      const totalItems = await prisma.purchaseOrder.count({ where })
      const totalPages = Math.max(1, Math.ceil(totalItems / query.pageSize))
      const safePage = Math.min(Math.max(1, query.page), totalPages)
      const skip = (safePage - 1) * query.pageSize
      const sortField = SORT_FIELD_MAP[query.sortBy] || 'updatedAt'
      const sortDir: Prisma.SortOrder = query.sortDir === 'asc' ? 'asc' : 'desc'

      const rows = await prisma.purchaseOrder.findMany({
        where,
        orderBy: [{ [sortField]: sortDir }, { id: 'desc' }],
        skip,
        take: query.pageSize,
      })

      return {
        data: rows.map(mapPrismaPurchaseOrder),
        meta: {
          page: safePage,
          pageSize: query.pageSize,
          totalItems,
          totalPages,
          hasNext: safePage < totalPages,
          hasPrev: safePage > 1,
          requestId,
        },
      }
    }

    const db = readDb()
    const rows = (db.purchaseOrders || []).filter((o) => o.organizationId === organizationId)
    return paginateArray(
      rows as unknown as Array<Record<string, unknown>>,
      query,
      requestId,
      ['folio', 'supplierName', 'status', 'externalId']
    )
  }

  async findById(organizationId: string, id: string): Promise<PurchaseOrderEntity | undefined> {
    const prisma = await getPrismaClientReady()
    if (prisma) {
      const row = await prisma.purchaseOrder.findFirst({
        where: { id, organizationId, deletedAt: null },
      })
      return row ? mapPrismaPurchaseOrder(row) : undefined
    }

    const db = readDb()
    return (db.purchaseOrders || []).find(
      (o) => o.organizationId === organizationId && o.id === id && !o.deletedAt
    )
  }

  async findByFolio(organizationId: string, folio: string): Promise<PurchaseOrderEntity | undefined> {
    const normFolio = folio.trim()
    const prisma = await getPrismaClientReady()
    if (prisma) {
      const row = await prisma.purchaseOrder.findFirst({
        where: {
          organizationId,
          folio: { equals: normFolio, mode: 'insensitive' },
          deletedAt: null,
        },
      })
      return row ? mapPrismaPurchaseOrder(row) : undefined
    }

    const db = readDb()
    return (db.purchaseOrders || []).find(
      (o) =>
        o.organizationId === organizationId &&
        !o.deletedAt &&
        o.folio.trim().toLowerCase() === normFolio.toLowerCase()
    )
  }

  async findByExternal(
    organizationId: string,
    externalSource: string,
    externalId: string
  ): Promise<PurchaseOrderEntity | undefined> {
    const src = externalSource.trim().toLowerCase()
    const extId = externalId.trim()
    const prisma = await getPrismaClientReady()
    if (prisma) {
      const row = await prisma.purchaseOrder.findFirst({
        where: {
          organizationId,
          externalSource: src,
          externalId: extId,
          deletedAt: null,
        },
      })
      return row ? mapPrismaPurchaseOrder(row) : undefined
    }

    const db = readDb()
    return (db.purchaseOrders || []).find(
      (o) =>
        o.organizationId === organizationId &&
        !o.deletedAt &&
        o.externalSource === src &&
        o.externalId === extId
    )
  }

  async create(
    organizationId: string,
    input: Omit<PurchaseOrderEntity, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'deletedAt'>
  ): Promise<PurchaseOrderEntity> {
    const prisma = await getPrismaClientReady()
    if (prisma) {
      const created = await prisma.$transaction(async (tx) => {
        const record = await tx.purchaseOrder.create({
          data: {
            organizationId,
            folio: input.folio,
            requisitionId: input.requisitionId,
            supplierId: input.supplierId,
            supplierName: input.supplierName,
            warehouseId: input.warehouseId,
            orderDate: new Date(input.orderDate),
            expectedDate: input.expectedDate ? new Date(input.expectedDate) : null,
            status: input.status,
            currency: input.currency,
            exchangeRate: input.exchangeRate,
            subtotal: input.subtotal,
            taxAmount: input.taxAmount,
            total: input.total,
            items: input.items as unknown as Prisma.InputJsonValue,
            externalId: input.externalId ?? null,
            externalSource: input.externalSource ?? null,
            externalSyncedAt: input.externalSyncedAt ? new Date(input.externalSyncedAt) : null,
          },
        })

        if (record.externalId && record.externalSource) {
          await tx.externalIdMapping.upsert({
            where: {
              organizationId_entityType_entityId_externalSystem: {
                organizationId,
                entityType: 'purchase_order',
                entityId: record.id,
                externalSystem: record.externalSource,
              },
            },
            update: { externalId: record.externalId, lastSyncedAt: new Date() },
            create: {
              organizationId,
              entityType: 'purchase_order',
              entityId: record.id,
              externalSystem: record.externalSource,
              externalId: record.externalId,
              syncDirection: 'inbound',
            },
          })
        }

        return record
      })

      return mapPrismaPurchaseOrder(created)
    }

    const db = readDb()
    const now = new Date().toISOString()
    const entity: PurchaseOrderEntity = {
      ...input,
      id: crypto.randomUUID(),
      organizationId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }
    db.purchaseOrders = [entity, ...(db.purchaseOrders || [])]
    persistDb(db)
    return entity
  }

  async update(
    organizationId: string,
    id: string,
    patch: Partial<PurchaseOrderEntity>
  ): Promise<PurchaseOrderEntity | undefined> {
    const prisma = await getPrismaClientReady()
    if (prisma) {
      const existing = await prisma.purchaseOrder.findFirst({
        where: { id, organizationId, deletedAt: null },
      })
      if (!existing) return undefined

      const nextExternalId = patch.externalId !== undefined ? patch.externalId : existing.externalId
      const nextExternalSource =
        patch.externalSource !== undefined ? patch.externalSource : existing.externalSource
      const nextExternalSyncedAt =
        patch.externalSyncedAt !== undefined
          ? patch.externalSyncedAt
            ? new Date(patch.externalSyncedAt)
            : null
          : existing.externalSyncedAt

      const updated = await prisma.$transaction(async (tx) => {
        const record = await tx.purchaseOrder.update({
          where: { id },
          data: {
            ...(patch.folio !== undefined ? { folio: patch.folio } : {}),
            ...(patch.requisitionId !== undefined ? { requisitionId: patch.requisitionId } : {}),
            ...(patch.supplierId !== undefined ? { supplierId: patch.supplierId } : {}),
            ...(patch.supplierName !== undefined ? { supplierName: patch.supplierName } : {}),
            ...(patch.warehouseId !== undefined ? { warehouseId: patch.warehouseId } : {}),
            ...(patch.orderDate !== undefined ? { orderDate: new Date(patch.orderDate) } : {}),
            ...(patch.expectedDate !== undefined
              ? { expectedDate: patch.expectedDate ? new Date(patch.expectedDate) : null }
              : {}),
            ...(patch.status !== undefined ? { status: patch.status } : {}),
            ...(patch.currency !== undefined ? { currency: patch.currency } : {}),
            ...(patch.exchangeRate !== undefined ? { exchangeRate: patch.exchangeRate } : {}),
            ...(patch.subtotal !== undefined ? { subtotal: patch.subtotal } : {}),
            ...(patch.taxAmount !== undefined ? { taxAmount: patch.taxAmount } : {}),
            ...(patch.total !== undefined ? { total: patch.total } : {}),
            ...(patch.items !== undefined
              ? { items: patch.items as unknown as Prisma.InputJsonValue }
              : {}),
            externalId: nextExternalId ?? null,
            externalSource: nextExternalSource ?? null,
            externalSyncedAt: nextExternalSyncedAt,
          },
        })

        if (record.externalId && record.externalSource) {
          await tx.externalIdMapping.upsert({
            where: {
              organizationId_entityType_entityId_externalSystem: {
                organizationId,
                entityType: 'purchase_order',
                entityId: record.id,
                externalSystem: record.externalSource,
              },
            },
            update: { externalId: record.externalId, lastSyncedAt: new Date() },
            create: {
              organizationId,
              entityType: 'purchase_order',
              entityId: record.id,
              externalSystem: record.externalSource,
              externalId: record.externalId,
              syncDirection: 'bidirectional',
            },
          })
        }

        return record
      })

      return mapPrismaPurchaseOrder(updated)
    }

    const db = readDb()
    const list = db.purchaseOrders || []
    const idx = list.findIndex((o) => o.organizationId === organizationId && o.id === id && !o.deletedAt)
    if (idx < 0) return undefined
    const updated: PurchaseOrderEntity = {
      ...list[idx],
      ...patch,
      organizationId,
      id,
      updatedAt: new Date().toISOString(),
    }
    list[idx] = updated
    db.purchaseOrders = list
    persistDb(db)
    return updated
  }

  async softDelete(organizationId: string, id: string): Promise<boolean> {
    const prisma = await getPrismaClientReady()
    if (prisma) {
      const res = await prisma.purchaseOrder.updateMany({
        where: { id, organizationId, deletedAt: null },
        data: { deletedAt: new Date() },
      })
      return res.count > 0
    }

    const db = readDb()
    const list = db.purchaseOrders || []
    const idx = list.findIndex((o) => o.organizationId === organizationId && o.id === id && !o.deletedAt)
    if (idx < 0) return false
    const now = new Date().toISOString()
    list[idx] = { ...list[idx], deletedAt: now, updatedAt: now }
    db.purchaseOrders = list
    persistDb(db)
    return true
  }
}
