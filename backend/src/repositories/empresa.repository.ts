import crypto from 'node:crypto'
import type { Prisma, Subsidiary } from '@prisma/client'
import { getPrismaClientReady } from '../db/prisma.ts'
import { paginateArray, persistDb, readDb, type SubsidiaryEntity } from '../db/storage.ts'
import type { PaginationQuery } from '../types/common.ts'

const SORT_FIELD_MAP: Record<string, keyof Prisma.SubsidiaryOrderByWithRelationInput> = {
  code: 'code',
  legalName: 'legalName',
  tradeName: 'tradeName',
  taxId: 'taxId',
  country: 'country',
  currency: 'currency',
  status: 'status',
  externalId: 'externalId',
  external_id: 'externalId',
  externalSource: 'externalSource',
  externalSyncedAt: 'externalSyncedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
}

function mapPrismaSubsidiary(row: Subsidiary): SubsidiaryEntity {
  return {
    id: row.id,
    organizationId: row.organizationId,
    code: row.code,
    legalName: row.legalName,
    tradeName: row.tradeName,
    taxId: row.taxId,
    country: row.country,
    currency: row.currency,
    status: row.status === 'Inactiva' ? 'Inactiva' : 'Activa',
    isHeadquarters: row.isHeadquarters,
    linkedDepartmentIds: Array.isArray(row.linkedDepartmentIds) ? row.linkedDepartmentIds : [],
    linkedLocationIds: Array.isArray(row.linkedLocationIds) ? row.linkedLocationIds : [],
    externalId: row.externalId,
    externalSource: row.externalSource,
    externalSyncedAt: row.externalSyncedAt ? row.externalSyncedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
  }
}

export class EmpresaRepository {
  async list(organizationId: string, query: PaginationQuery, requestId: string) {
    const prisma = await getPrismaClientReady()
    if (prisma) {
      const search = query.search.trim()
      const where: Prisma.SubsidiaryWhereInput = {
        organizationId,
        ...(query.includeDeleted ? {} : { deletedAt: null }),
        ...(query.externalSource ? { externalSource: query.externalSource.trim().toLowerCase() } : {}),
        ...(query.externalId ? { externalId: query.externalId.trim() } : {}),
        ...(search
          ? {
              OR: [
                { code: { contains: search, mode: 'insensitive' } },
                { legalName: { contains: search, mode: 'insensitive' } },
                { tradeName: { contains: search, mode: 'insensitive' } },
                { taxId: { contains: search, mode: 'insensitive' } },
                { externalId: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      }

      const totalItems = await prisma.subsidiary.count({ where })
      const totalPages = Math.max(1, Math.ceil(totalItems / query.pageSize))
      const safePage = Math.min(Math.max(1, query.page), totalPages)
      const skip = (safePage - 1) * query.pageSize
      const sortField = SORT_FIELD_MAP[query.sortBy] || 'updatedAt'
      const sortDir: Prisma.SortOrder = query.sortDir === 'asc' ? 'asc' : 'desc'

      const rows = await prisma.subsidiary.findMany({
        where,
        orderBy: [{ [sortField]: sortDir }, { id: 'desc' }],
        skip,
        take: query.pageSize,
      })

      return {
        data: rows.map(mapPrismaSubsidiary),
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
    const rows = (db.subsidiaries || []).filter((s) => s.organizationId === organizationId)
    return paginateArray(
      rows as unknown as Array<Record<string, unknown>>,
      query,
      requestId,
      ['code', 'legalName', 'tradeName', 'taxId', 'externalId']
    )
  }

  async findById(organizationId: string, id: string): Promise<SubsidiaryEntity | undefined> {
    const prisma = await getPrismaClientReady()
    if (prisma) {
      const row = await prisma.subsidiary.findFirst({
        where: { id, organizationId, deletedAt: null },
      })
      return row ? mapPrismaSubsidiary(row) : undefined
    }

    const db = readDb()
    return (db.subsidiaries || []).find(
      (s) => s.organizationId === organizationId && s.id === id && !s.deletedAt
    )
  }

  async findByCode(organizationId: string, code: string): Promise<SubsidiaryEntity | undefined> {
    const normCode = code.trim()
    const prisma = await getPrismaClientReady()
    if (prisma) {
      const row = await prisma.subsidiary.findFirst({
        where: {
          organizationId,
          code: { equals: normCode, mode: 'insensitive' },
          deletedAt: null,
        },
      })
      return row ? mapPrismaSubsidiary(row) : undefined
    }

    const db = readDb()
    return (db.subsidiaries || []).find(
      (s) =>
        s.organizationId === organizationId &&
        !s.deletedAt &&
        s.code.trim().toLowerCase() === normCode.toLowerCase()
    )
  }

  async findByExternal(
    organizationId: string,
    externalSource: string,
    externalId: string
  ): Promise<SubsidiaryEntity | undefined> {
    const src = externalSource.trim().toLowerCase()
    const extId = externalId.trim()
    const prisma = await getPrismaClientReady()
    if (prisma) {
      const row = await prisma.subsidiary.findFirst({
        where: {
          organizationId,
          externalSource: src,
          externalId: extId,
          deletedAt: null,
        },
      })
      return row ? mapPrismaSubsidiary(row) : undefined
    }

    const db = readDb()
    return (db.subsidiaries || []).find(
      (s) =>
        s.organizationId === organizationId &&
        !s.deletedAt &&
        s.externalSource === src &&
        s.externalId === extId
    )
  }

  async create(
    organizationId: string,
    input: Omit<SubsidiaryEntity, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'deletedAt'>
  ): Promise<SubsidiaryEntity> {
    const prisma = await getPrismaClientReady()
    if (prisma) {
      const created = await prisma.$transaction(async (tx) => {
        const record = await tx.subsidiary.create({
          data: {
            organizationId,
            code: input.code,
            legalName: input.legalName,
            tradeName: input.tradeName,
            taxId: input.taxId,
            country: input.country,
            currency: input.currency,
            status: input.status,
            isHeadquarters: input.isHeadquarters,
            linkedDepartmentIds: input.linkedDepartmentIds,
            linkedLocationIds: input.linkedLocationIds,
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
                entityType: 'subsidiary',
                entityId: record.id,
                externalSystem: record.externalSource,
              },
            },
            update: {
              externalId: record.externalId,
              lastSyncedAt: new Date(),
            },
            create: {
              organizationId,
              entityType: 'subsidiary',
              entityId: record.id,
              externalSystem: record.externalSource,
              externalId: record.externalId,
              syncDirection: 'inbound',
            },
          })
        }

        return record
      })

      return mapPrismaSubsidiary(created)
    }

    const db = readDb()
    const now = new Date().toISOString()
    const entity: SubsidiaryEntity = {
      ...input,
      id: crypto.randomUUID(),
      organizationId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }
    db.subsidiaries = [entity, ...(db.subsidiaries || [])]
    persistDb(db)
    return entity
  }

  async update(
    organizationId: string,
    id: string,
    patch: Partial<SubsidiaryEntity>
  ): Promise<SubsidiaryEntity | undefined> {
    const prisma = await getPrismaClientReady()
    if (prisma) {
      const existing = await prisma.subsidiary.findFirst({
        where: { id, organizationId, deletedAt: null },
      })
      if (!existing) return undefined

      const nextExternalId =
        patch.externalId !== undefined ? patch.externalId : existing.externalId
      const nextExternalSource =
        patch.externalSource !== undefined ? patch.externalSource : existing.externalSource
      const nextExternalSyncedAt =
        patch.externalSyncedAt !== undefined
          ? patch.externalSyncedAt
            ? new Date(patch.externalSyncedAt)
            : null
          : existing.externalSyncedAt

      const updated = await prisma.$transaction(async (tx) => {
        const record = await tx.subsidiary.update({
          where: { id },
          data: {
            ...(patch.code !== undefined ? { code: patch.code } : {}),
            ...(patch.legalName !== undefined ? { legalName: patch.legalName } : {}),
            ...(patch.tradeName !== undefined ? { tradeName: patch.tradeName } : {}),
            ...(patch.taxId !== undefined ? { taxId: patch.taxId } : {}),
            ...(patch.country !== undefined ? { country: patch.country } : {}),
            ...(patch.currency !== undefined ? { currency: patch.currency } : {}),
            ...(patch.status !== undefined ? { status: patch.status } : {}),
            ...(patch.isHeadquarters !== undefined ? { isHeadquarters: patch.isHeadquarters } : {}),
            ...(patch.linkedDepartmentIds !== undefined
              ? { linkedDepartmentIds: patch.linkedDepartmentIds }
              : {}),
            ...(patch.linkedLocationIds !== undefined
              ? { linkedLocationIds: patch.linkedLocationIds }
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
                entityType: 'subsidiary',
                entityId: record.id,
                externalSystem: record.externalSource,
              },
            },
            update: {
              externalId: record.externalId,
              lastSyncedAt: new Date(),
            },
            create: {
              organizationId,
              entityType: 'subsidiary',
              entityId: record.id,
              externalSystem: record.externalSource,
              externalId: record.externalId,
              syncDirection: 'bidirectional',
            },
          })
        }

        return record
      })

      return mapPrismaSubsidiary(updated)
    }

    const db = readDb()
    const list = db.subsidiaries || []
    const idx = list.findIndex((s) => s.organizationId === organizationId && s.id === id && !s.deletedAt)
    if (idx < 0) return undefined
    const updated: SubsidiaryEntity = {
      ...list[idx],
      ...patch,
      organizationId,
      id,
      updatedAt: new Date().toISOString(),
    }
    list[idx] = updated
    db.subsidiaries = list
    persistDb(db)
    return updated
  }

  async softDelete(organizationId: string, id: string): Promise<boolean> {
    const prisma = await getPrismaClientReady()
    if (prisma) {
      const res = await prisma.subsidiary.updateMany({
        where: { id, organizationId, deletedAt: null },
        data: { deletedAt: new Date() },
      })
      return res.count > 0
    }

    const db = readDb()
    const list = db.subsidiaries || []
    const idx = list.findIndex((s) => s.organizationId === organizationId && s.id === id && !s.deletedAt)
    if (idx < 0) return false
    const now = new Date().toISOString()
    list[idx] = { ...list[idx], deletedAt: now, updatedAt: now }
    db.subsidiaries = list
    persistDb(db)
    return true
  }
}
