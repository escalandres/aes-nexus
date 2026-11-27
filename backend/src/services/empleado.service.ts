import { AppError } from '../errors/AppError.ts'
import { AuditRepository } from '../repositories/audit.repository.ts'
import { EmpleadoRepository } from '../repositories/empleado.repository.ts'
import { ExternalMappingsRepository } from '../repositories/externalMappings.repository.ts'
import type { PaginationQuery, TenantContext } from '../types/common.ts'
import { resolveExternalFields } from './integrations.service.ts'

export interface CreateEmpleadoInput {
  employeeCode: string
  fullName: string
  email: string
  phone?: string | null
  position: string
  departmentId?: string | null
  locationId?: string | null
  subsidiaryId?: string | null
  status?: 'Activo' | 'Inactivo' | 'Vacaciones'
  contractType?: string
  paymentFrequency?: string
  grossMonthlySalary: number
  rfc?: string | null
  curp?: string | null
  nss?: string | null
  externalId?: string | null
  externalSource?: string | null
}

export type UpdateEmpleadoInput = Partial<CreateEmpleadoInput>

export class EmpleadoService {
  private readonly empleadoRepo = new EmpleadoRepository()
  private readonly mappingsRepo = new ExternalMappingsRepository()
  private readonly auditRepo = new AuditRepository()

  async listEmpleados(ctx: TenantContext, query: PaginationQuery) {
    return this.empleadoRepo.list(ctx.organizationId, query, ctx.requestId)
  }

  async getEmpleado(ctx: TenantContext, id: string) {
    const empleado = await this.empleadoRepo.findById(ctx.organizationId, id)
    if (!empleado) {
      throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Empleado no encontrado.')
    }
    return empleado
  }

  async getEmpleadoByExternal(ctx: TenantContext, externalSource: string, externalId: string) {
    const empleado = await this.empleadoRepo.findByExternal(ctx.organizationId, externalSource, externalId)
    if (!empleado) {
      throw new AppError(
        404,
        'RESOURCE_NOT_FOUND',
        `Empleado no encontrado para ${externalSource.toLowerCase()}:${externalId}.`
      )
    }
    return empleado
  }

  async createEmpleado(ctx: TenantContext, input: CreateEmpleadoInput) {
    const employeeCode = input.employeeCode.trim().toUpperCase()
    const duplicate = await this.empleadoRepo.findByCode(ctx.organizationId, employeeCode)
    if (duplicate) {
      throw new AppError(409, 'DUPLICATE_FOLIO', `Ya existe un empleado con código '${employeeCode}'.`)
    }

    const ext = resolveExternalFields(ctx, input)
    if (ext.externalId && ext.externalSource) {
      const extCollision = await this.empleadoRepo.findByExternal(
        ctx.organizationId,
        ext.externalSource,
        ext.externalId
      )
      if (extCollision) {
        throw new AppError(
          409,
          'DUPLICATE_EXTERNAL_ID',
          `Ya existe un empleado vinculado a ${ext.externalSource}:${ext.externalId}.`
        )
      }
    }

    const created = await this.empleadoRepo.create(ctx.organizationId, {
      employeeCode,
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || null,
      position: input.position.trim(),
      departmentId: input.departmentId ?? null,
      locationId: input.locationId ?? null,
      subsidiaryId: input.subsidiaryId ?? null,
      status: input.status ?? 'Activo',
      contractType: input.contractType?.trim() || 'Tiempo indeterminado',
      paymentFrequency: input.paymentFrequency?.trim() || 'Quincenal',
      grossMonthlySalary: input.grossMonthlySalary,
      rfc: input.rfc?.trim().toUpperCase() || null,
      curp: input.curp?.trim().toUpperCase() || null,
      nss: input.nss?.trim() || null,
      ...ext,
    })

    if (ext.externalId && ext.externalSource) {
      await this.mappingsRepo.upsertMapping({
        organizationId: ctx.organizationId,
        entityType: 'employee',
        entityId: created.id,
        externalSystem: ext.externalSource,
        externalId: ext.externalId,
        syncDirection: 'inbound',
      })
    }

    await this.auditRepo.append({
      organizationId: ctx.organizationId,
      category: 'crm',
      operation: 'create',
      actorName: ctx.actorName,
      entityType: 'Empleado',
      entityId: created.id,
      summary: `Alta de empleado '${created.fullName}' (${created.employeeCode}).`,
      externalId: ext.externalId,
      externalSource: ext.externalSource,
      externalSyncedAt: ext.externalSyncedAt,
    })

    return created
  }

  async updateEmpleado(ctx: TenantContext, id: string, input: UpdateEmpleadoInput) {
    const existing = await this.getEmpleado(ctx, id)

    if (input.employeeCode !== undefined) {
      const normCode = input.employeeCode.trim().toUpperCase()
      const codeCollision = await this.empleadoRepo.findByCode(ctx.organizationId, normCode)
      if (codeCollision && codeCollision.id !== id) {
        throw new AppError(409, 'DUPLICATE_FOLIO', `El código '${normCode}' pertenece a otro empleado.`)
      }
    }

    let extPatch: { externalId?: string | null; externalSource?: string | null; externalSyncedAt?: string | null } = {}
    if (input.externalId !== undefined || input.externalSource !== undefined) {
      if (input.externalId === null) {
        extPatch = {
          externalId: null,
          externalSource: input.externalSource ?? null,
          externalSyncedAt: null,
        }
      } else {
        const ext = resolveExternalFields(ctx, {
          externalId: input.externalId ?? existing.externalId,
          externalSource: input.externalSource ?? existing.externalSource,
        })
        if (ext.externalId && ext.externalSource) {
          const collision = await this.empleadoRepo.findByExternal(
            ctx.organizationId,
            ext.externalSource,
            ext.externalId
          )
          if (collision && collision.id !== id) {
            throw new AppError(
              409,
              'DUPLICATE_EXTERNAL_ID',
              `El ID externo ${ext.externalSource}:${ext.externalId} pertenece a otro empleado.`
            )
          }
          await this.mappingsRepo.upsertMapping({
            organizationId: ctx.organizationId,
            entityType: 'employee',
            entityId: id,
            externalSystem: ext.externalSource,
            externalId: ext.externalId,
            syncDirection: 'bidirectional',
          })
        }
        extPatch = ext
      }
    }

    const updated = await this.empleadoRepo.update(ctx.organizationId, id, {
      ...(input.employeeCode !== undefined ? { employeeCode: input.employeeCode.trim().toUpperCase() } : {}),
      ...(input.fullName !== undefined ? { fullName: input.fullName.trim() } : {}),
      ...(input.email !== undefined ? { email: input.email.trim().toLowerCase() } : {}),
      ...(input.phone !== undefined ? { phone: input.phone ? input.phone.trim() : null } : {}),
      ...(input.position !== undefined ? { position: input.position.trim() } : {}),
      ...(input.departmentId !== undefined ? { departmentId: input.departmentId } : {}),
      ...(input.locationId !== undefined ? { locationId: input.locationId } : {}),
      ...(input.subsidiaryId !== undefined ? { subsidiaryId: input.subsidiaryId } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.contractType !== undefined ? { contractType: input.contractType.trim() } : {}),
      ...(input.paymentFrequency !== undefined ? { paymentFrequency: input.paymentFrequency.trim() } : {}),
      ...(input.grossMonthlySalary !== undefined ? { grossMonthlySalary: input.grossMonthlySalary } : {}),
      ...(input.rfc !== undefined ? { rfc: input.rfc ? input.rfc.trim().toUpperCase() : null } : {}),
      ...(input.curp !== undefined ? { curp: input.curp ? input.curp.trim().toUpperCase() : null } : {}),
      ...(input.nss !== undefined ? { nss: input.nss ? input.nss.trim() : null } : {}),
      ...extPatch,
    })

    if (!updated) {
      throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Empleado no encontrado.')
    }

    await this.auditRepo.append({
      organizationId: ctx.organizationId,
      category: 'crm',
      operation: 'update',
      actorName: ctx.actorName,
      entityType: 'Empleado',
      entityId: id,
      summary: `Actualización de empleado '${updated.fullName}' (${updated.employeeCode}).`,
      externalId: updated.externalId,
      externalSource: updated.externalSource,
      externalSyncedAt: updated.externalSyncedAt,
    })

    return updated
  }

  async deleteEmpleado(ctx: TenantContext, id: string) {
    const existing = await this.getEmpleado(ctx, id)
    await this.empleadoRepo.softDelete(ctx.organizationId, id)

    await this.auditRepo.append({
      organizationId: ctx.organizationId,
      category: 'crm',
      operation: 'delete',
      actorName: ctx.actorName,
      entityType: 'Empleado',
      entityId: id,
      summary: `Baja lógica de empleado '${existing.fullName}' (${existing.employeeCode}).`,
      externalId: existing.externalId,
      externalSource: existing.externalSource,
      externalSyncedAt: existing.externalSyncedAt,
    })
  }
}
