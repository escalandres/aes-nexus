import { AppError } from '../errors/AppError.ts'
import { AdminRepository } from '../repositories/admin.repository.ts'
import { AuditRepository } from '../repositories/audit.repository.ts'
import { ExternalMappingsRepository } from '../repositories/externalMappings.repository.ts'
import type { PaginationQuery, TenantContext } from '../types/common.ts'
import { resolveExternalFields } from './integrations.service.ts'

export class AdminService {
  private readonly adminRepo = new AdminRepository()
  private readonly auditRepo = new AuditRepository()
  private readonly mappingsRepo = new ExternalMappingsRepository()

  async listDepartments(ctx: TenantContext, query: PaginationQuery) {
    return this.adminRepo.listDepartments(ctx.organizationId, query, ctx.requestId)
  }

  async createDepartment(
    ctx: TenantContext,
    input: {
      code: string
      name: string
      costCenter: string
      leader: string
      status?: 'Activo' | 'Inactivo'
      externalId?: string | null
      externalSource?: string | null
    }
  ) {
    const ext = resolveExternalFields(ctx, input)
    if (ext.externalId && ext.externalSource) {
      const duplicate = await this.adminRepo.findDepartmentByExternal(ctx.organizationId, ext.externalSource, ext.externalId)
      if (duplicate) {
        throw new AppError(
          409,
          'DUPLICATE_EXTERNAL_ID',
          `Ya existe un departamento registrado para ${ext.externalSource}:${ext.externalId}.`
        )
      }
    }

    const created = await this.adminRepo.createDepartment(ctx.organizationId, {
      code: input.code.trim(),
      name: input.name.trim(),
      costCenter: input.costCenter.trim(),
      leader: input.leader.trim(),
      status: input.status ?? 'Activo',
      ...ext,
    })

    if (ext.externalId && ext.externalSource) {
      await this.mappingsRepo.upsertMapping({
        organizationId: ctx.organizationId,
        entityType: 'department',
        entityId: created.id,
        externalSystem: ext.externalSource,
        externalId: ext.externalId,
      })
    }

    await this.auditRepo.append({
      organizationId: ctx.organizationId,
      category: 'settings',
      operation: 'create',
      actorName: ctx.actorName,
      entityType: 'Departamento',
      entityId: created.id,
      summary: `Alta de departamento '${created.name}' (${created.code}).`,
      externalId: ext.externalId,
      externalSource: ext.externalSource,
      externalSyncedAt: ext.externalSyncedAt,
    })

    return created
  }

  async listLocations(ctx: TenantContext, query: PaginationQuery) {
    return this.adminRepo.listLocations(ctx.organizationId, query, ctx.requestId)
  }

  async createLocation(
    ctx: TenantContext,
    input: {
      code: string
      name: string
      type: 'Oficina' | 'Sucursal' | 'Almacén' | 'Centro de distribución'
      city: string
      state: string
      address: string
      status?: 'Activa' | 'Inactiva'
      externalId?: string | null
      externalSource?: string | null
    }
  ) {
    const ext = resolveExternalFields(ctx, input)
    if (ext.externalId && ext.externalSource) {
      const duplicate = await this.adminRepo.findLocationByExternal(ctx.organizationId, ext.externalSource, ext.externalId)
      if (duplicate) {
        throw new AppError(
          409,
          'DUPLICATE_EXTERNAL_ID',
          `Ya existe una ubicación registrada para ${ext.externalSource}:${ext.externalId}.`
        )
      }
    }

    const created = await this.adminRepo.createLocation(ctx.organizationId, {
      code: input.code.trim(),
      name: input.name.trim(),
      type: input.type,
      city: input.city.trim(),
      state: input.state.trim(),
      address: input.address.trim(),
      status: input.status ?? 'Activa',
      ...ext,
    })

    if (ext.externalId && ext.externalSource) {
      await this.mappingsRepo.upsertMapping({
        organizationId: ctx.organizationId,
        entityType: 'location',
        entityId: created.id,
        externalSystem: ext.externalSource,
        externalId: ext.externalId,
      })
    }

    await this.auditRepo.append({
      organizationId: ctx.organizationId,
      category: 'settings',
      operation: 'create',
      actorName: ctx.actorName,
      entityType: 'Ubicación Física',
      entityId: created.id,
      summary: `Alta de ubicación '${created.name}' (${created.code}).`,
      externalId: ext.externalId,
      externalSource: ext.externalSource,
      externalSyncedAt: ext.externalSyncedAt,
    })

    return created
  }

  async listAuditLogs(ctx: TenantContext, query: PaginationQuery) {
    return this.auditRepo.list(ctx.organizationId, query, ctx.requestId)
  }
}
