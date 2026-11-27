import { AppError } from '../errors/AppError.ts'
import { AuditRepository } from '../repositories/audit.repository.ts'
import { ExternalMappingsRepository } from '../repositories/externalMappings.repository.ts'
import { InventarioRepository } from '../repositories/inventario.repository.ts'
import type { PaginationQuery, TenantContext } from '../types/common.ts'
import { resolveExternalFields } from './integrations.service.ts'

export interface CreateInventarioInput {
  productId: string
  sku: string
  warehouseId: string
  stockQuantity?: number
  reservedQuantity?: number
  minStock?: number
  thresholdSource?: string
  unitCost?: number
  externalId?: string | null
  externalSource?: string | null
}

export type UpdateInventarioInput = Partial<CreateInventarioInput>

export class InventarioService {
  private readonly inventarioRepo = new InventarioRepository()
  private readonly mappingsRepo = new ExternalMappingsRepository()
  private readonly auditRepo = new AuditRepository()

  async listInventario(ctx: TenantContext, query: PaginationQuery) {
    return this.inventarioRepo.list(ctx.organizationId, query, ctx.requestId)
  }

  async getInventarioItem(ctx: TenantContext, id: string) {
    const item = await this.inventarioRepo.findById(ctx.organizationId, id)
    if (!item) {
      throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Registro de inventario no encontrado.')
    }
    return item
  }

  async getInventarioByExternal(ctx: TenantContext, externalSource: string, externalId: string) {
    const item = await this.inventarioRepo.findByExternal(ctx.organizationId, externalSource, externalId)
    if (!item) {
      throw new AppError(
        404,
        'RESOURCE_NOT_FOUND',
        `Inventario no encontrado para ${externalSource.toLowerCase()}:${externalId}.`
      )
    }
    return item
  }

  async createInventarioItem(ctx: TenantContext, input: CreateInventarioInput) {
    const ext = resolveExternalFields(ctx, input)
    if (ext.externalId && ext.externalSource) {
      const extCollision = await this.inventarioRepo.findByExternal(
        ctx.organizationId,
        ext.externalSource,
        ext.externalId
      )
      if (extCollision) {
        throw new AppError(
          409,
          'DUPLICATE_EXTERNAL_ID',
          `Ya existe un registro de inventario vinculado a ${ext.externalSource}:${ext.externalId}.`
        )
      }
    }

    const created = await this.inventarioRepo.create(ctx.organizationId, {
      productId: input.productId,
      sku: input.sku.trim().toUpperCase(),
      warehouseId: input.warehouseId,
      stockQuantity: input.stockQuantity ?? 0,
      reservedQuantity: input.reservedQuantity ?? 0,
      minStock: input.minStock ?? 0,
      thresholdSource: input.thresholdSource?.trim() || 'sku',
      unitCost: input.unitCost ?? 0,
      ...ext,
    })

    if (ext.externalId && ext.externalSource) {
      await this.mappingsRepo.upsertMapping({
        organizationId: ctx.organizationId,
        entityType: 'inventory_item',
        entityId: created.id,
        externalSystem: ext.externalSource,
        externalId: ext.externalId,
        syncDirection: 'inbound',
      })
    }

    await this.auditRepo.append({
      organizationId: ctx.organizationId,
      category: 'inventory',
      operation: 'create',
      actorName: ctx.actorName,
      entityType: 'Inventario',
      entityId: created.id,
      summary: `Alta de existencias SKU ${created.sku} (Stock: ${created.stockQuantity}).`,
      externalId: ext.externalId,
      externalSource: ext.externalSource,
      externalSyncedAt: ext.externalSyncedAt,
    })

    return created
  }

  async updateInventarioItem(ctx: TenantContext, id: string, input: UpdateInventarioInput) {
    const existing = await this.getInventarioItem(ctx, id)

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
          const collision = await this.inventarioRepo.findByExternal(
            ctx.organizationId,
            ext.externalSource,
            ext.externalId
          )
          if (collision && collision.id !== id) {
            throw new AppError(
              409,
              'DUPLICATE_EXTERNAL_ID',
              `El ID externo ${ext.externalSource}:${ext.externalId} pertenece a otro registro de inventario.`
            )
          }
          await this.mappingsRepo.upsertMapping({
            organizationId: ctx.organizationId,
            entityType: 'inventory_item',
            entityId: id,
            externalSystem: ext.externalSource,
            externalId: ext.externalId,
            syncDirection: 'bidirectional',
          })
        }
        extPatch = ext
      }
    }

    const updated = await this.inventarioRepo.update(ctx.organizationId, id, {
      ...(input.productId !== undefined ? { productId: input.productId } : {}),
      ...(input.sku !== undefined ? { sku: input.sku.trim().toUpperCase() } : {}),
      ...(input.warehouseId !== undefined ? { warehouseId: input.warehouseId } : {}),
      ...(input.stockQuantity !== undefined ? { stockQuantity: input.stockQuantity } : {}),
      ...(input.reservedQuantity !== undefined ? { reservedQuantity: input.reservedQuantity } : {}),
      ...(input.minStock !== undefined ? { minStock: input.minStock } : {}),
      ...(input.thresholdSource !== undefined ? { thresholdSource: input.thresholdSource.trim() } : {}),
      ...(input.unitCost !== undefined ? { unitCost: input.unitCost } : {}),
      ...extPatch,
    })

    if (!updated) {
      throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Registro de inventario no encontrado.')
    }

    await this.auditRepo.append({
      organizationId: ctx.organizationId,
      category: 'inventory',
      operation: 'update',
      actorName: ctx.actorName,
      entityType: 'Inventario',
      entityId: id,
      summary: `Ajuste de inventario SKU ${updated.sku} (Stock: ${updated.stockQuantity}).`,
      externalId: updated.externalId,
      externalSource: updated.externalSource,
      externalSyncedAt: updated.externalSyncedAt,
    })

    return updated
  }

  async deleteInventarioItem(ctx: TenantContext, id: string) {
    const existing = await this.getInventarioItem(ctx, id)
    await this.inventarioRepo.softDelete(ctx.organizationId, id)

    await this.auditRepo.append({
      organizationId: ctx.organizationId,
      category: 'inventory',
      operation: 'delete',
      actorName: ctx.actorName,
      entityType: 'Inventario',
      entityId: id,
      summary: `Baja lógica de inventario SKU ${existing.sku}.`,
      externalId: existing.externalId,
      externalSource: existing.externalSource,
      externalSyncedAt: existing.externalSyncedAt,
    })
  }
}
