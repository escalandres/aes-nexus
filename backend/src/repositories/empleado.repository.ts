import crypto from 'node:crypto'
import type { Employee, Prisma } from '@prisma/client'
import { getPrismaClientReady } from '../db/prisma.ts'
import { paginateArray, persistDb, readDb, type EmployeeEntity } from '../db/storage.ts'
import type { PaginationQuery } from '../types/common.ts'

const SORT_FIELD_MAP: Record<string, keyof Prisma.EmployeeOrderByWithRelationInput> = {
  employeeCode: 'employeeCode',
  fullName: 'fullName',
  email: 'email',
  position: 'position',
  status: 'status',
  grossMonthlySalary: 'grossMonthlySalary',
  externalId: 'externalId',
  external_id: 'externalId',
  externalSource: 'externalSource',
  externalSyncedAt: 'externalSyncedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
}

function mapPrismaEmployee(row: Employee): EmployeeEntity {
  return {
    id: row.id,
    organizationId: row.organizationId,
    employeeCode: row.employeeCode,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    position: row.position,
    departmentId: row.departmentId,
    locationId: row.locationId,
    subsidiaryId: row.subsidiaryId,
    status: row.status === 'Inactivo' ? 'Inactivo' : row.status === 'Vacaciones' ? 'Vacaciones' : 'Activo',
    contractType: row.contractType,
    paymentFrequency: row.paymentFrequency,
    grossMonthlySalary: Number(row.grossMonthlySalary),
    rfc: row.rfc,
    curp: row.curp,
    nss: row.nss,
    externalId: row.externalId,
    externalSource: row.externalSource,
    externalSyncedAt: row.externalSyncedAt ? row.externalSyncedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
  }
}

export class EmpleadoRepository {
  async list(organizationId: string, query: PaginationQuery, requestId: string) {
    const prisma = await getPrismaClientReady()
    if (prisma) {
      const search = query.search.trim()
      const where: Prisma.EmployeeWhereInput = {
        organizationId,
        ...(query.includeDeleted ? {} : { deletedAt: null }),
        ...(query.externalSource ? { externalSource: query.externalSource.trim().toLowerCase() } : {}),
        ...(query.externalId ? { externalId: query.externalId.trim() } : {}),
        ...(search
          ? {
              OR: [
                { employeeCode: { contains: search, mode: 'insensitive' } },
                { fullName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { position: { contains: search, mode: 'insensitive' } },
                { externalId: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      }

      const totalItems = await prisma.employee.count({ where })
      const totalPages = Math.max(1, Math.ceil(totalItems / query.pageSize))
      const safePage = Math.min(Math.max(1, query.page), totalPages)
      const skip = (safePage - 1) * query.pageSize
      const sortField = SORT_FIELD_MAP[query.sortBy] || 'updatedAt'
      const sortDir: Prisma.SortOrder = query.sortDir === 'asc' ? 'asc' : 'desc'

      const rows = await prisma.employee.findMany({
        where,
        orderBy: [{ [sortField]: sortDir }, { id: 'desc' }],
        skip,
        take: query.pageSize,
      })

      return {
        data: rows.map(mapPrismaEmployee),
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
    const rows = (db.employees || []).filter((e) => e.organizationId === organizationId)
    return paginateArray(
      rows as unknown as Array<Record<string, unknown>>,
      query,
      requestId,
      ['employeeCode', 'fullName', 'email', 'position', 'externalId']
    )
  }

  async findById(organizationId: string, id: string): Promise<EmployeeEntity | undefined> {
    const prisma = await getPrismaClientReady()
    if (prisma) {
      const row = await prisma.employee.findFirst({
        where: { id, organizationId, deletedAt: null },
      })
      return row ? mapPrismaEmployee(row) : undefined
    }

    const db = readDb()
    return (db.employees || []).find(
      (e) => e.organizationId === organizationId && e.id === id && !e.deletedAt
    )
  }

  async findByCode(organizationId: string, employeeCode: string): Promise<EmployeeEntity | undefined> {
    const normCode = employeeCode.trim()
    const prisma = await getPrismaClientReady()
    if (prisma) {
      const row = await prisma.employee.findFirst({
        where: {
          organizationId,
          employeeCode: { equals: normCode, mode: 'insensitive' },
          deletedAt: null,
        },
      })
      return row ? mapPrismaEmployee(row) : undefined
    }

    const db = readDb()
    return (db.employees || []).find(
      (e) =>
        e.organizationId === organizationId &&
        !e.deletedAt &&
        e.employeeCode.trim().toLowerCase() === normCode.toLowerCase()
    )
  }

  async findByExternal(
    organizationId: string,
    externalSource: string,
    externalId: string
  ): Promise<EmployeeEntity | undefined> {
    const src = externalSource.trim().toLowerCase()
    const extId = externalId.trim()
    const prisma = await getPrismaClientReady()
    if (prisma) {
      const row = await prisma.employee.findFirst({
        where: {
          organizationId,
          externalSource: src,
          externalId: extId,
          deletedAt: null,
        },
      })
      return row ? mapPrismaEmployee(row) : undefined
    }

    const db = readDb()
    return (db.employees || []).find(
      (e) =>
        e.organizationId === organizationId &&
        !e.deletedAt &&
        e.externalSource === src &&
        e.externalId === extId
    )
  }

  async create(
    organizationId: string,
    input: Omit<EmployeeEntity, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'deletedAt'>
  ): Promise<EmployeeEntity> {
    const prisma = await getPrismaClientReady()
    if (prisma) {
      const created = await prisma.$transaction(async (tx) => {
        const record = await tx.employee.create({
          data: {
            organizationId,
            employeeCode: input.employeeCode,
            fullName: input.fullName,
            email: input.email,
            phone: input.phone,
            position: input.position,
            departmentId: input.departmentId,
            locationId: input.locationId,
            subsidiaryId: input.subsidiaryId,
            status: input.status,
            contractType: input.contractType,
            paymentFrequency: input.paymentFrequency,
            grossMonthlySalary: input.grossMonthlySalary,
            rfc: input.rfc,
            curp: input.curp,
            nss: input.nss,
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
                entityType: 'employee',
                entityId: record.id,
                externalSystem: record.externalSource,
              },
            },
            update: { externalId: record.externalId, lastSyncedAt: new Date() },
            create: {
              organizationId,
              entityType: 'employee',
              entityId: record.id,
              externalSystem: record.externalSource,
              externalId: record.externalId,
              syncDirection: 'inbound',
            },
          })
        }

        return record
      })

      return mapPrismaEmployee(created)
    }

    const db = readDb()
    const now = new Date().toISOString()
    const entity: EmployeeEntity = {
      ...input,
      id: crypto.randomUUID(),
      organizationId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }
    db.employees = [entity, ...(db.employees || [])]
    persistDb(db)
    return entity
  }

  async update(
    organizationId: string,
    id: string,
    patch: Partial<EmployeeEntity>
  ): Promise<EmployeeEntity | undefined> {
    const prisma = await getPrismaClientReady()
    if (prisma) {
      const existing = await prisma.employee.findFirst({
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
        const record = await tx.employee.update({
          where: { id },
          data: {
            ...(patch.employeeCode !== undefined ? { employeeCode: patch.employeeCode } : {}),
            ...(patch.fullName !== undefined ? { fullName: patch.fullName } : {}),
            ...(patch.email !== undefined ? { email: patch.email } : {}),
            ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
            ...(patch.position !== undefined ? { position: patch.position } : {}),
            ...(patch.departmentId !== undefined ? { departmentId: patch.departmentId } : {}),
            ...(patch.locationId !== undefined ? { locationId: patch.locationId } : {}),
            ...(patch.subsidiaryId !== undefined ? { subsidiaryId: patch.subsidiaryId } : {}),
            ...(patch.status !== undefined ? { status: patch.status } : {}),
            ...(patch.contractType !== undefined ? { contractType: patch.contractType } : {}),
            ...(patch.paymentFrequency !== undefined ? { paymentFrequency: patch.paymentFrequency } : {}),
            ...(patch.grossMonthlySalary !== undefined ? { grossMonthlySalary: patch.grossMonthlySalary } : {}),
            ...(patch.rfc !== undefined ? { rfc: patch.rfc } : {}),
            ...(patch.curp !== undefined ? { curp: patch.curp } : {}),
            ...(patch.nss !== undefined ? { nss: patch.nss } : {}),
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
                entityType: 'employee',
                entityId: record.id,
                externalSystem: record.externalSource,
              },
            },
            update: { externalId: record.externalId, lastSyncedAt: new Date() },
            create: {
              organizationId,
              entityType: 'employee',
              entityId: record.id,
              externalSystem: record.externalSource,
              externalId: record.externalId,
              syncDirection: 'bidirectional',
            },
          })
        }

        return record
      })

      return mapPrismaEmployee(updated)
    }

    const db = readDb()
    const list = db.employees || []
    const idx = list.findIndex((e) => e.organizationId === organizationId && e.id === id && !e.deletedAt)
    if (idx < 0) return undefined
    const updated: EmployeeEntity = {
      ...list[idx],
      ...patch,
      organizationId,
      id,
      updatedAt: new Date().toISOString(),
    }
    list[idx] = updated
    db.employees = list
    persistDb(db)
    return updated
  }

  async softDelete(organizationId: string, id: string): Promise<boolean> {
    const prisma = await getPrismaClientReady()
    if (prisma) {
      const res = await prisma.employee.updateMany({
        where: { id, organizationId, deletedAt: null },
        data: { deletedAt: new Date() },
      })
      return res.count > 0
    }

    const db = readDb()
    const list = db.employees || []
    const idx = list.findIndex((e) => e.organizationId === organizationId && e.id === id && !e.deletedAt)
    if (idx < 0) return false
    const now = new Date().toISOString()
    list[idx] = { ...list[idx], deletedAt: now, updatedAt: now }
    db.employees = list
    persistDb(db)
    return true
  }
}
