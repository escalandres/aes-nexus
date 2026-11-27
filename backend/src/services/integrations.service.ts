import { AppError } from '../errors/AppError.ts'
import { AdminRepository } from '../repositories/admin.repository.ts'
import { AuditRepository } from '../repositories/audit.repository.ts'
import { ClientsRepository } from '../repositories/clients.repository.ts'
import { CompraRepository } from '../repositories/compra.repository.ts'
import { EmpleadoRepository } from '../repositories/empleado.repository.ts'
import { EmpresaRepository } from '../repositories/empresa.repository.ts'
import { ExternalMappingsRepository } from '../repositories/externalMappings.repository.ts'
import { InventarioRepository } from '../repositories/inventario.repository.ts'
import { ProductoRepository } from '../repositories/producto.repository.ts'
import { SalesRepository } from '../repositories/sales.repository.ts'
import { VendorsRepository } from '../repositories/vendors.repository.ts'
import type { IntegrableEntityType, TenantContext } from '../types/common.ts'

export function resolveExternalFields(
  ctx: TenantContext,
  input: { externalId?: string | null; externalSource?: string | null }
): { externalId: string | null; externalSource: string | null; externalSyncedAt: string | null } {
  const externalId = input.externalId?.trim() || null
  const rawSource = input.externalSource?.trim().toLowerCase() || ctx.externalSystemHeader || null

  if (externalId && !rawSource) {
    throw new AppError(
      422,
      'EXTERNAL_SOURCE_REQUIRED',
      'Debe especificar externalSource (o encabezado X-External-System) cuando envía externalId.'
    )
  }

  return {
    externalId,
    externalSource: externalId ? rawSource : rawSource,
    externalSyncedAt: externalId ? new Date().toISOString() : null,
  }
}

export class IntegrationsService {
  private readonly mappingsRepo = new ExternalMappingsRepository()
  private readonly clientsRepo = new ClientsRepository()
  private readonly vendorsRepo = new VendorsRepository()
  private readonly salesRepo = new SalesRepository()
  private readonly adminRepo = new AdminRepository()
  private readonly empresaRepo = new EmpresaRepository()
  private readonly empleadoRepo = new EmpleadoRepository()
  private readonly productoRepo = new ProductoRepository()
  private readonly compraRepo = new CompraRepository()
  private readonly inventarioRepo = new InventarioRepository()
  private readonly auditRepo = new AuditRepository()

  async lookupByExternalId(
    ctx: TenantContext,
    entityType: IntegrableEntityType,
    externalSystem: string,
    externalId: string
  ) {
    const normSys = externalSystem.trim().toLowerCase()
    const mapping = await this.mappingsRepo.findByExternal(ctx.organizationId, entityType, normSys, externalId)
    if (mapping) {
      return {
        entityType: mapping.entityType,
        entityId: mapping.entityId,
        externalSystem: mapping.externalSystem,
        externalId: mapping.externalId,
        lastSyncedAt: mapping.lastSyncedAt,
      }
    }

    // Fallback check against native table columns (externalSource, externalId)
    let nativeMatch: { id: string; externalSyncedAt: string | null } | undefined
    if (entityType === 'client') {
      nativeMatch = await this.clientsRepo.findByExternal(ctx.organizationId, normSys, externalId)
    } else if (entityType === 'supplier') {
      nativeMatch = await this.vendorsRepo.findByExternal(ctx.organizationId, normSys, externalId)
    } else if (entityType === 'product') {
      nativeMatch =
        (await this.productoRepo.findByExternal(ctx.organizationId, normSys, externalId)) ||
        (await this.salesRepo.findCatalogByExternal(ctx.organizationId, normSys, externalId))
    } else if (entityType === 'employee') {
      nativeMatch = await this.empleadoRepo.findByExternal(ctx.organizationId, normSys, externalId)
    } else if (entityType === 'purchase_order') {
      nativeMatch = await this.compraRepo.findByExternal(ctx.organizationId, normSys, externalId)
    } else if (entityType === 'inventory_item') {
      nativeMatch = await this.inventarioRepo.findByExternal(ctx.organizationId, normSys, externalId)
    } else if (entityType === 'quote') {
      nativeMatch = await this.salesRepo.findQuoteByExternal(ctx.organizationId, normSys, externalId)
    } else if (entityType === 'sales_order') {
      nativeMatch = await this.salesRepo.findOrderByExternal(ctx.organizationId, normSys, externalId)
    } else if (entityType === 'department') {
      nativeMatch = await this.adminRepo.findDepartmentByExternal(ctx.organizationId, normSys, externalId)
    } else if (entityType === 'location') {
      nativeMatch = await this.adminRepo.findLocationByExternal(ctx.organizationId, normSys, externalId)
    } else if (entityType === 'subsidiary') {
      nativeMatch = await this.empresaRepo.findByExternal(ctx.organizationId, normSys, externalId)
    }

    if (!nativeMatch) {
      throw new AppError(
        404,
        'RESOURCE_NOT_FOUND',
        `No existe registro '${entityType}' vinculado a ${normSys}:${externalId}.`
      )
    }

    return {
      entityType,
      entityId: nativeMatch.id,
      externalSystem: normSys,
      externalId,
      lastSyncedAt: nativeMatch.externalSyncedAt,
    }
  }

  async listMappings(ctx: TenantContext, entityType: IntegrableEntityType, entityId: string) {
    return this.mappingsRepo.listByEntity(ctx.organizationId, entityType, entityId)
  }

  async upsertMapping(
    ctx: TenantContext,
    input: {
      entityType: IntegrableEntityType
      entityId: string
      externalSystem: string
      externalId: string
      externalUrl?: string | null
      syncDirection?: 'inbound' | 'outbound' | 'bidirectional'
      payloadHash?: string | null
      metadata?: Record<string, unknown> | null
    }
  ) {
    const saved = await this.mappingsRepo.upsertMapping({
      organizationId: ctx.organizationId,
      ...input,
    })

    await this.auditRepo.append({
      organizationId: ctx.organizationId,
      category: 'settings',
      operation: 'update',
      actorName: ctx.actorName,
      entityType: 'Mapeo ID Externo',
      entityId: saved.id,
      summary: `Vinculado ${saved.entityType} (${saved.entityId}) <-> ${saved.externalSystem}:${saved.externalId}.`,
      externalId: saved.externalId,
      externalSource: saved.externalSystem,
      externalSyncedAt: saved.lastSyncedAt,
    })

    return saved
  }

  async deleteMapping(ctx: TenantContext, mappingId: string) {
    const deleted = await this.mappingsRepo.deleteMapping(ctx.organizationId, mappingId)
    if (!deleted) {
      throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Mapeo externo no encontrado.')
    }
  }
}
