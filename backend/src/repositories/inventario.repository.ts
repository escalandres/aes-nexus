import crypto from 'node:crypto'
import type { InventoryItem, Prisma } from '@prisma/client'
import { getPrismaClientReady } from '../db/prisma.ts'
import { paginateArray, persistDb, readDb, type InventoryItemEntity } from '../db/storage.ts'
import type { PaginationQuery } from '../types/common.ts'

const SORT_FIELD_MAP: Record<string, keyof Prisma.InventoryItemOrderByWithRelationInput> = {
  sku: 'sku',
  stockQuantity: 'stockQuantity',
  reservedQuantity: 'reservedQuantity',
  minStock: 'minStock',
  unitCost: 'unitCost',
  externalId: 'externalId',
  external_id: 'externalId',
  externalSource: 'externalSource',
  externalSyncedAt: 'externalSyncedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
}

function mapPrismaInventoryItem(row: InventoryItem): InventoryItemEntity {
  return {
    id: row.id,
    organizationId: row.organizationId,
    productId: row.productId,
    sku: row.sku,
    warehouseId: row.warehouseId,
    stockQuantity: Number(row.stockQuantity),
    reservedQuantity: Number(row.reservedQuantity),
    minStock: Number(row.minStock),
    thresholdSource: row.thresholdSource,
    unitCost: Number(row.unitCost),
    externalId: row.externalId,
    externalSource: row.externalSource,
    externalSyncedAt: row.externalSyncedAt ? row.externalSyncedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
  }
}

export class InventarioRepository {
  async list(organizationId: string, query: PaginationQuery, requestId: string) {
    const prisma = await getPrismaClientReady()
    if (prisma) {
      const search = query.search.trim()
      const where: Prisma.InventoryItemWhereInput = {
        organizationId,
        ...(query.includeDeleted ? {} : { deletedAt: null }),
        ...(query.externalSource ? { externalSource: query.externalSource.trim().toLowerCase() } : {}),
        ...(query.externalId ? { externalId: query.externalId.trim() } : {}),
        ...(search
          ? {
              OR: [
                { sku: { contains: search, mode: 'insensitive' } },
                { thresholdSource: { contains: search, mode: 'insensitive' } },
                { externalId: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      }

      const totalItems = await prisma.inventoryItem.count({ where })
      const totalPages = Math.max(1, Math.ceil(totalItems / query.pageSize))
      const safePage = Math.min(Math.max(1, query.page), totalPages)
      const skip = (safePage - 1) * query.pageSize
      const sortField = SORT_FIELD_MAP[query.sortBy] || 'updatedAt'
      const sortDir: Prisma.SortOrder = query.sortDir === 'asc' ? 'asc' : 'desc'

      const rows = await prisma.inventoryItem.findMany({
        where,
        orderBy: [{ [sortField]: sortDir }, { id: 'desc' }],
        skip,
        take: query.pageSize,
      })

      return {
        data: rows.map(mapPrismaInventoryItem),
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
    const rows = (db.inventoryItems || []).filter((i) => i.organizationId === organizationId)
    return paginateArray(
      rows as unknown as Array<Record<string, unknown>>,
      query,
      requestId,
      ['sku', 'thresholdSource', 'externalId']
    )
  }

  async findById(organizationId: string, id: string): Promise<InventoryItemEntity | undefined> {
    const prisma = await getPrismaClientReady()
    if (prisma) {
      const row = await prisma.inventoryItem.findFirst({
        where: { id, organizationId, deletedAt: null },
      })
      return row ? mapPrismaInventoryItem(row) : undefined
    }

    const db = readDb()
    return (db.inventoryItems || []).find(
      (i) => i.organizationId === organizationId && i.id === id && !i.deletedAt
    )
  }

  async findByExternal(
    organizationId: string,
    externalSource: string,
    externalId: string
  ): Promise<InventoryItemEntity | undefined> {
    const src = externalSource.trim().toLowerCase()
    const extId = externalId.trim()
    const prisma = await getPrismaClientReady()
    if (prisma) {
      const row = await prisma.inventoryItem.findFirst({
        where: {
          organizationId,
          externalSource: src,
          externalId: extId,
          deletedAt: null,
        },
      })
      return row ? mapPrismaInventoryItem(row) : undefined
    }

    const db = readDb()
    return (db.inventoryItems || []).find(
      (i) =>
        i.organizationId === organizationId &&
        !i.deletedAt &&
        i.externalSource === src &&
        i.externalId === extId
    )
  }

  async create(
    organizationId: string,
    input: Omit<InventoryItemEntity, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'deletedAt'>
  ): Promise<InventoryItemEntity> {
    const prisma = await getPrismaClientReady()
    if (prisma) {
      const created = await prisma.$transaction(async (tx) => {
        const record = await tx.inventoryItem.create({
          data: {
            organizationId,
            productId: input.productId,
            sku: input.sku,
            warehouseId: input.warehouseId,
            stockQuantity: input.stockQuantity,
            reservedQuantity: input.reservedQuantity,
            minStock: input.minStock,
            thresholdSource: input.thresholdSource,
            unitCost: input.unitCost,
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
                entityType: 'inventory_item',
                entityId: record.id,
                externalSystem: record.externalSource,
              },
            },
            update: { externalId: record.externalId, lastSyncedAt: new Date() },
            create: {
              organizationId,
              entityType: 'inventory_item',
              entityId: record.id,
              externalSystem: record.externalSource,
              externalId: record.externalId,
              syncDirection: 'inbound',
            },
          })
        }

        return record
      })

      return mapPrismaInventoryItem(created)
    }

    const db = readDb()
    const now = new Date().toISOString()
    const entity: InventoryItemEntity = {
      ...input,
      id: crypto.randomUUID(),
      organizationId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }
    db.inventoryItems = [entity, ...(db.inventoryItems || [])]
    persistDb(db)
    return entity
  }

  async update(
    organizationId: string,
    id: string,
    patch: Partial<InventoryItemEntity>
  ): Promise<InventoryItemEntity | undefined> {
    const prisma = await getPrismaClientReady()
    if (prisma) {
      const existing = await prisma.inventoryItem.findFirst({
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
        const record = await tx.inventoryItem.update({
          where: { id },
          data: {
            ...(patch.productId !== undefined ? { productId: patch.productId } : {}),
            ...(patch.sku !== undefined ? { sku: patch.sku } : {}),
            ...(patch.warehouseId !== undefined ? { warehouseId: patch.warehouseId } : {}),
            ...(patch.stockQuantity !== undefined ? { stockQuantity: patch.stockQuantity } : {}),
            ...(patch.reservedQuantity !== undefined ? { reservedQuantity: patch.reservedQuantity } : {}),
            ...(patch.minStock !== undefined ? { minStock: patch.minStock } : {}),
            ...(patch.thresholdSource !== undefined ? { thresholdSource: patch.thresholdSource } : {}),
            ...(patch.unitCost !== undefined ? { unitCost: patch.unitCost } : {}),
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
                entityType: 'inventory_item',
                entityId: record.id,
                externalSystem: record.externalSource,
              },
            },
            update: { externalId: record.externalId, lastSyncedAt: new Date() },
            create: {
              organizationId,
              entityType: 'inventory_item',
              entityId: record.id,
              externalSystem: record.externalSource,
              externalId: record.externalId,
              syncDirection: 'bidirectional',
            },
          })
        }

        return record
      })

      return mapPrismaInventoryItem(updated)
    }

    const db = readDb()
    const list = db.inventoryItems || []
    const idx = list.findIndex((i) => i.organizationId === organizationId && i.id === id && !i.deletedAt)
    if (idx < 0) return undefined
    const updated: InventoryItemEntity = {
      ...list[idx],
      ...patch,
      organizationId,
      id,
      updatedAt: new Date().toISOString(),
    }
    list[idx] = updated
    db.inventoryItems = list
    persistDb(db)
    return updated
  }

  async softDelete(organizationId: string, id: string): Promise<boolean> {
    const prisma = await getPrismaClientReady()
    if (prisma) {
      const res = await prisma.inventoryItem.updateMany({
        where: { id, organizationId, deletedAt: null },
        data: { deletedAt: new Date() },
      })
      return res.count > 0
    }

    const db = readDb()
    const list = db.inventoryItems || []
    const idx = list.findIndex((i) => i.organizationId === organizationId && i.id === id && !i.deletedAt)
    if (idx < 0) return false
    const now = new Date().toISOString()
    list[idx] = { ...list[idx], deletedAt: now, updatedAt: now }
    db.inventoryItems = list
    persistDb(db)
    return true
  }
}
