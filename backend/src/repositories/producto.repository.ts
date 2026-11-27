import crypto from 'node:crypto'
import type { CatalogItem, Prisma } from '@prisma/client'
import { getPrismaClientReady } from '../db/prisma.ts'
import { paginateArray, persistDb, readDb, type CatalogItemEntity } from '../db/storage.ts'
import type { PaginationQuery } from '../types/common.ts'

const SORT_FIELD_MAP: Record<string, keyof Prisma.CatalogItemOrderByWithRelationInput> = {
  sku: 'sku',
  name: 'name',
  itemType: 'itemType',
  category: 'category',
  unitPrice: 'unitPrice',
  costPrice: 'costPrice',
  status: 'status',
  externalId: 'externalId',
  external_id: 'externalId',
  externalSource: 'externalSource',
  externalSyncedAt: 'externalSyncedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
}

function mapPrismaCatalogItem(row: CatalogItem): CatalogItemEntity {
  return {
    id: row.id,
    organizationId: row.organizationId,
    sku: row.sku,
    name: row.name,
    itemType: row.itemType === 'Servicio' ? 'Servicio' : 'Producto',
    category: row.category,
    unit: row.unit,
    unitPrice: Number(row.unitPrice),
    costPrice: Number(row.costPrice),
    taxRate: Number(row.taxRate),
    currency: row.currency,
    billingModel: row.billingModel === 'Recurrente' ? 'Recurrente' : 'Único',
    status: row.status === 'Inactivo' ? 'Inactivo' : 'Activo',
    trackInventory: row.trackInventory,
    description: row.description,
    externalId: row.externalId,
    externalSource: row.externalSource,
    externalSyncedAt: row.externalSyncedAt ? row.externalSyncedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
  }
}

export class ProductoRepository {
  async list(organizationId: string, query: PaginationQuery, requestId: string) {
    const prisma = await getPrismaClientReady()
    if (prisma) {
      const search = query.search.trim()
      const where: Prisma.CatalogItemWhereInput = {
        organizationId,
        ...(query.includeDeleted ? {} : { deletedAt: null }),
        ...(query.externalSource ? { externalSource: query.externalSource.trim().toLowerCase() } : {}),
        ...(query.externalId ? { externalId: query.externalId.trim() } : {}),
        ...(search
          ? {
              OR: [
                { sku: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
                { category: { contains: search, mode: 'insensitive' } },
                { externalId: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      }

      const totalItems = await prisma.catalogItem.count({ where })
      const totalPages = Math.max(1, Math.ceil(totalItems / query.pageSize))
      const safePage = Math.min(Math.max(1, query.page), totalPages)
      const skip = (safePage - 1) * query.pageSize
      const sortField = SORT_FIELD_MAP[query.sortBy] || 'updatedAt'
      const sortDir: Prisma.SortOrder = query.sortDir === 'asc' ? 'asc' : 'desc'

      const rows = await prisma.catalogItem.findMany({
        where,
        orderBy: [{ [sortField]: sortDir }, { id: 'desc' }],
        skip,
        take: query.pageSize,
      })

      return {
        data: rows.map(mapPrismaCatalogItem),
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
    const rows = db.catalogItems.filter((p) => p.organizationId === organizationId)
    return paginateArray(
      rows as unknown as Array<Record<string, unknown>>,
      query,
      requestId,
      ['sku', 'name', 'category', 'externalId']
    )
  }

  async findById(organizationId: string, id: string): Promise<CatalogItemEntity | undefined> {
    const prisma = await getPrismaClientReady()
    if (prisma) {
      const row = await prisma.catalogItem.findFirst({
        where: { id, organizationId, deletedAt: null },
      })
      return row ? mapPrismaCatalogItem(row) : undefined
    }

    const db = readDb()
    return db.catalogItems.find(
      (p) => p.organizationId === organizationId && p.id === id && !p.deletedAt
    )
  }

  async findBySku(organizationId: string, sku: string): Promise<CatalogItemEntity | undefined> {
    const normSku = sku.trim()
    const prisma = await getPrismaClientReady()
    if (prisma) {
      const row = await prisma.catalogItem.findFirst({
        where: {
          organizationId,
          sku: { equals: normSku, mode: 'insensitive' },
          deletedAt: null,
        },
      })
      return row ? mapPrismaCatalogItem(row) : undefined
    }

    const db = readDb()
    return db.catalogItems.find(
      (p) =>
        p.organizationId === organizationId &&
        !p.deletedAt &&
        p.sku.trim().toLowerCase() === normSku.toLowerCase()
    )
  }

  async findByExternal(
    organizationId: string,
    externalSource: string,
    externalId: string
  ): Promise<CatalogItemEntity | undefined> {
    const src = externalSource.trim().toLowerCase()
    const extId = externalId.trim()
    const prisma = await getPrismaClientReady()
    if (prisma) {
      const row = await prisma.catalogItem.findFirst({
        where: {
          organizationId,
          externalSource: src,
          externalId: extId,
          deletedAt: null,
        },
      })
      return row ? mapPrismaCatalogItem(row) : undefined
    }

    const db = readDb()
    return db.catalogItems.find(
      (p) =>
        p.organizationId === organizationId &&
        !p.deletedAt &&
        p.externalSource === src &&
        p.externalId === extId
    )
  }

  async create(
    organizationId: string,
    input: Omit<CatalogItemEntity, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'deletedAt'>
  ): Promise<CatalogItemEntity> {
    const prisma = await getPrismaClientReady()
    if (prisma) {
      const created = await prisma.$transaction(async (tx) => {
        const record = await tx.catalogItem.create({
          data: {
            organizationId,
            sku: input.sku,
            name: input.name,
            itemType: input.itemType,
            category: input.category,
            unit: input.unit,
            unitPrice: input.unitPrice,
            costPrice: input.costPrice,
            taxRate: input.taxRate,
            currency: input.currency,
            billingModel: input.billingModel,
            status: input.status,
            trackInventory: input.trackInventory,
            description: input.description,
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
                entityType: 'product',
                entityId: record.id,
                externalSystem: record.externalSource,
              },
            },
            update: { externalId: record.externalId, lastSyncedAt: new Date() },
            create: {
              organizationId,
              entityType: 'product',
              entityId: record.id,
              externalSystem: record.externalSource,
              externalId: record.externalId,
              syncDirection: 'inbound',
            },
          })
        }

        return record
      })

      return mapPrismaCatalogItem(created)
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
    db.catalogItems = [entity, ...db.catalogItems]
    persistDb(db)
    return entity
  }

  async update(
    organizationId: string,
    id: string,
    patch: Partial<CatalogItemEntity>
  ): Promise<CatalogItemEntity | undefined> {
    const prisma = await getPrismaClientReady()
    if (prisma) {
      const existing = await prisma.catalogItem.findFirst({
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
        const record = await tx.catalogItem.update({
          where: { id },
          data: {
            ...(patch.sku !== undefined ? { sku: patch.sku } : {}),
            ...(patch.name !== undefined ? { name: patch.name } : {}),
            ...(patch.itemType !== undefined ? { itemType: patch.itemType } : {}),
            ...(patch.category !== undefined ? { category: patch.category } : {}),
            ...(patch.unit !== undefined ? { unit: patch.unit } : {}),
            ...(patch.unitPrice !== undefined ? { unitPrice: patch.unitPrice } : {}),
            ...(patch.costPrice !== undefined ? { costPrice: patch.costPrice } : {}),
            ...(patch.taxRate !== undefined ? { taxRate: patch.taxRate } : {}),
            ...(patch.currency !== undefined ? { currency: patch.currency } : {}),
            ...(patch.billingModel !== undefined ? { billingModel: patch.billingModel } : {}),
            ...(patch.status !== undefined ? { status: patch.status } : {}),
            ...(patch.trackInventory !== undefined ? { trackInventory: patch.trackInventory } : {}),
            ...(patch.description !== undefined ? { description: patch.description } : {}),
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
                entityType: 'product',
                entityId: record.id,
                externalSystem: record.externalSource,
              },
            },
            update: { externalId: record.externalId, lastSyncedAt: new Date() },
            create: {
              organizationId,
              entityType: 'product',
              entityId: record.id,
              externalSystem: record.externalSource,
              externalId: record.externalId,
              syncDirection: 'bidirectional',
            },
          })
        }

        return record
      })

      return mapPrismaCatalogItem(updated)
    }

    const db = readDb()
    const idx = db.catalogItems.findIndex(
      (p) => p.organizationId === organizationId && p.id === id && !p.deletedAt
    )
    if (idx < 0) return undefined
    const updated: CatalogItemEntity = {
      ...db.catalogItems[idx],
      ...patch,
      organizationId,
      id,
      updatedAt: new Date().toISOString(),
    }
    db.catalogItems[idx] = updated
    persistDb(db)
    return updated
  }

  async softDelete(organizationId: string, id: string): Promise<boolean> {
    const prisma = await getPrismaClientReady()
    if (prisma) {
      const res = await prisma.catalogItem.updateMany({
        where: { id, organizationId, deletedAt: null },
        data: { deletedAt: new Date() },
      })
      return res.count > 0
    }

    const db = readDb()
    const idx = db.catalogItems.findIndex(
      (p) => p.organizationId === organizationId && p.id === id && !p.deletedAt
    )
    if (idx < 0) return false
    const now = new Date().toISOString()
    db.catalogItems[idx] = { ...db.catalogItems[idx], deletedAt: now, updatedAt: now }
    persistDb(db)
    return true
  }
}
