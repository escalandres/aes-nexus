import { AppError } from '../errors/AppError.ts'
import { AuditRepository } from '../repositories/audit.repository.ts'
import { EmpresaRepository } from '../repositories/empresa.repository.ts'
import { ExternalMappingsRepository } from '../repositories/externalMappings.repository.ts'
import type { PaginationQuery, TenantContext } from '../types/common.ts'
import { resolveExternalFields } from './integrations.service.ts'

export interface CreateEmpresaInput {
  code: string
  legalName: string
  tradeName: string
  taxId: string
  country: string
  currency?: string
  status?: 'Activa' | 'Inactiva'
  isHeadquarters?: boolean
  linkedDepartmentIds?: string[]
  linkedLocationIds?: string[]
  externalId?: string | null
  externalSource?: string | null
}

export interface UpdateEmpresaInput {
  code?: string
  legalName?: string
  tradeName?: string
  taxId?: string
  country?: string
  currency?: string
  status?: 'Activa' | 'Inactiva'
  isHeadquarters?: boolean
  linkedDepartmentIds?: string[]
  linkedLocationIds?: string[]
  externalId?: string | null
  externalSource?: string | null
}

export class EmpresaService {
  private readonly empresaRepo = new EmpresaRepository()
  private readonly mappingsRepo = new ExternalMappingsRepository()
  private readonly auditRepo = new AuditRepository()

  async listEmpresas(ctx: TenantContext, query: PaginationQuery) {
    return this.empresaRepo.list(ctx.organizationId, query, ctx.requestId)
  }

  async getEmpresa(ctx: TenantContext, id: string) {
    const empresa = await this.empresaRepo.findById(ctx.organizationId, id)
    if (!empresa) {
      throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Empresa no encontrada.')
    }
    return empresa
  }

  async getEmpresaByExternal(ctx: TenantContext, externalSource: string, externalId: string) {
    const empresa = await this.empresaRepo.findByExternal(ctx.organizationId, externalSource, externalId)
    if (!empresa) {
      throw new AppError(
        404,
        'RESOURCE_NOT_FOUND',
        `Empresa no encontrada para ${externalSource.toLowerCase()}:${externalId}.`
      )
    }
    return empresa
  }

  async createEmpresa(ctx: TenantContext, input: CreateEmpresaInput) {
    const code = input.code.trim().toUpperCase()
    const duplicateCode = await this.empresaRepo.findByCode(ctx.organizationId, code)
    if (duplicateCode) {
      throw new AppError(409, 'DUPLICATE_FOLIO', `Ya existe una empresa con el código '${code}'.`)
    }

    const ext = resolveExternalFields(ctx, input)
    if (ext.externalId && ext.externalSource) {
      const duplicateExt = await this.empresaRepo.findByExternal(
        ctx.organizationId,
        ext.externalSource,
        ext.externalId
      )
      if (duplicateExt) {
        throw new AppError(
          409,
          'DUPLICATE_EXTERNAL_ID',
          `Ya existe una empresa registrada para ${ext.externalSource}:${ext.externalId}.`
        )
      }
    }

    const created = await this.empresaRepo.create(ctx.organizationId, {
      code,
      legalName: input.legalName.trim(),
      tradeName: input.tradeName.trim(),
      taxId: input.taxId.trim().toUpperCase(),
      country: input.country.trim(),
      currency: input.currency ?? 'MXN',
      status: input.status ?? 'Activa',
      isHeadquarters: input.isHeadquarters ?? false,
      linkedDepartmentIds: input.linkedDepartmentIds ?? [],
      linkedLocationIds: input.linkedLocationIds ?? [],
      ...ext,
    })

    if (ext.externalId && ext.externalSource) {
      await this.mappingsRepo.upsertMapping({
        organizationId: ctx.organizationId,
        entityType: 'subsidiary',
        entityId: created.id,
        externalSystem: ext.externalSource,
        externalId: ext.externalId,
        syncDirection: 'inbound',
      })
    }

    await this.auditRepo.append({
      organizationId: ctx.organizationId,
      category: 'settings',
      operation: 'create',
      actorName: ctx.actorName,
      entityType: 'Empresa',
      entityId: created.id,
      summary: `Alta de empresa '${created.tradeName}' (${created.code})${ext.externalId ? ` [${ext.externalSource}:${ext.externalId}]` : ''}.`,
      externalId: ext.externalId,
      externalSource: ext.externalSource,
      externalSyncedAt: ext.externalSyncedAt,
    })

    return created
  }

  async updateEmpresa(ctx: TenantContext, id: string, input: UpdateEmpresaInput) {
    const existing = await this.getEmpresa(ctx, id)

    if (input.code !== undefined) {
      const normalizedCode = input.code.trim().toUpperCase()
      const codeCollision = await this.empresaRepo.findByCode(ctx.organizationId, normalizedCode)
      if (codeCollision && codeCollision.id !== id) {
        throw new AppError(409, 'DUPLICATE_FOLIO', `El código '${normalizedCode}' pertenece a otra empresa.`)
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
          const collision = await this.empresaRepo.findByExternal(
            ctx.organizationId,
            ext.externalSource,
            ext.externalId
          )
          if (collision && collision.id !== id) {
            throw new AppError(
              409,
              'DUPLICATE_EXTERNAL_ID',
              `El ID externo ${ext.externalSource}:${ext.externalId} pertenece a otra empresa.`
            )
          }
          await this.mappingsRepo.upsertMapping({
            organizationId: ctx.organizationId,
            entityType: 'subsidiary',
            entityId: id,
            externalSystem: ext.externalSource,
            externalId: ext.externalId,
            syncDirection: 'bidirectional',
          })
        }
        extPatch = ext
      }
    }

    const updated = await this.empresaRepo.update(ctx.organizationId, id, {
      ...(input.code !== undefined ? { code: input.code.trim().toUpperCase() } : {}),
      ...(input.legalName !== undefined ? { legalName: input.legalName.trim() } : {}),
      ...(input.tradeName !== undefined ? { tradeName: input.tradeName.trim() } : {}),
      ...(input.taxId !== undefined ? { taxId: input.taxId.trim().toUpperCase() } : {}),
      ...(input.country !== undefined ? { country: input.country.trim() } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.isHeadquarters !== undefined ? { isHeadquarters: input.isHeadquarters } : {}),
      ...(input.linkedDepartmentIds !== undefined ? { linkedDepartmentIds: input.linkedDepartmentIds } : {}),
      ...(input.linkedLocationIds !== undefined ? { linkedLocationIds: input.linkedLocationIds } : {}),
      ...extPatch,
    })

    if (!updated) {
      throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Empresa no encontrada.')
    }

    await this.auditRepo.append({
      organizationId: ctx.organizationId,
      category: 'settings',
      operation: 'update',
      actorName: ctx.actorName,
      entityType: 'Empresa',
      entityId: id,
      summary: `Actualización de empresa '${updated.tradeName}' (${updated.code}).`,
      externalId: updated.externalId,
      externalSource: updated.externalSource,
      externalSyncedAt: updated.externalSyncedAt,
    })

    return updated
  }

  async deleteEmpresa(ctx: TenantContext, id: string) {
    const existing = await this.getEmpresa(ctx, id)
    await this.empresaRepo.softDelete(ctx.organizationId, id)

    await this.auditRepo.append({
      organizationId: ctx.organizationId,
      category: 'settings',
      operation: 'delete',
      actorName: ctx.actorName,
      entityType: 'Empresa',
      entityId: id,
      summary: `Baja lógica de empresa '${existing.tradeName}' (${existing.code}).`,
      externalId: existing.externalId,
      externalSource: existing.externalSource,
      externalSyncedAt: existing.externalSyncedAt,
    })
  }
}
