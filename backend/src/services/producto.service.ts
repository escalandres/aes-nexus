import { AppError } from '../errors/AppError.ts'
import { AuditRepository } from '../repositories/audit.repository.ts'
import { ExternalMappingsRepository } from '../repositories/externalMappings.repository.ts'
import { ProductoRepository } from '../repositories/producto.repository.ts'
import type { PaginationQuery, TenantContext } from '../types/common.ts'
import { resolveExternalFields } from './integrations.service.ts'

export interface CreateProductoInput {
  sku: string
  name: string
  itemType?: 'Producto' | 'Servicio'
  category: string
  unit?: string
  unitPrice: number
  costPrice?: number
  taxRate?: number
  currency?: string
  billingModel?: 'Único' | 'Recurrente'
  status?: 'Activo' | 'Inactivo'
  trackInventory?: boolean
  description?: string | null
  externalId?: string | null
  externalSource?: string | null
}

export type UpdateProductoInput = Partial<CreateProductoInput>

export class ProductoService {
  private readonly productoRepo = new ProductoRepository()
  private readonly mappingsRepo = new ExternalMappingsRepository()
  private readonly auditRepo = new AuditRepository()

  async listProductos(ctx: TenantContext, query: PaginationQuery) {
    return this.productoRepo.list(ctx.organizationId, query, ctx.requestId)
  }

  async getProducto(ctx: TenantContext, id: string) {
    const product = await this.productoRepo.findById(ctx.organizationId, id)
    if (!product) {
      throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Producto o servicio no encontrado.')
    }
    return product
  }

  async getProductoByExternal(ctx: TenantContext, externalSource: string, externalId: string) {
    const product = await this.productoRepo.findByExternal(ctx.organizationId, externalSource, externalId)
    if (!product) {
      throw new AppError(
        404,
        'RESOURCE_NOT_FOUND',
        `Producto no encontrado para ${externalSource.toLowerCase()}:${externalId}.`
      )
    }
    return product
  }

  async createProducto(ctx: TenantContext, input: CreateProductoInput) {
    const sku = input.sku.trim().toUpperCase()
    const duplicate = await this.productoRepo.findBySku(ctx.organizationId, sku)
    if (duplicate) {
      throw new AppError(409, 'DUPLICATE_FOLIO', `Ya existe un producto con el SKU '${sku}'.`)
    }

    const ext = resolveExternalFields(ctx, input)
    if (ext.externalId && ext.externalSource) {
      const extCollision = await this.productoRepo.findByExternal(
        ctx.organizationId,
        ext.externalSource,
        ext.externalId
      )
      if (extCollision) {
        throw new AppError(
          409,
          'DUPLICATE_EXTERNAL_ID',
          `Ya existe un producto registrado para ${ext.externalSource}:${ext.externalId}.`
        )
      }
    }

    const created = await this.productoRepo.create(ctx.organizationId, {
      sku,
      name: input.name.trim(),
      itemType: input.itemType ?? 'Producto',
      category: input.category.trim(),
      unit: input.unit?.trim() || 'Pieza',
      unitPrice: input.unitPrice,
      costPrice: input.costPrice ?? 0,
      taxRate: input.taxRate ?? 16,
      currency: input.currency ?? 'MXN',
      billingModel: input.billingModel ?? 'Único',
      status: input.status ?? 'Activo',
      trackInventory: input.trackInventory ?? (input.itemType !== 'Servicio'),
      description: input.description?.trim() || null,
      ...ext,
    })

    if (ext.externalId && ext.externalSource) {
      await this.mappingsRepo.upsertMapping({
        organizationId: ctx.organizationId,
        entityType: 'product',
        entityId: created.id,
        externalSystem: ext.externalSource,
        externalId: ext.externalId,
        syncDirection: 'inbound',
      })
    }

    await this.auditRepo.append({
      organizationId: ctx.organizationId,
      category: 'sales',
      operation: 'create',
      actorName: ctx.actorName,
      entityType: 'Producto',
      entityId: created.id,
      summary: `Alta de producto '${created.name}' (SKU ${created.sku}).`,
      externalId: ext.externalId,
      externalSource: ext.externalSource,
      externalSyncedAt: ext.externalSyncedAt,
    })

    return created
  }

  async updateProducto(ctx: TenantContext, id: string, input: UpdateProductoInput) {
    const existing = await this.getProducto(ctx, id)

    if (input.sku !== undefined) {
      const normSku = input.sku.trim().toUpperCase()
      const skuCollision = await this.productoRepo.findBySku(ctx.organizationId, normSku)
      if (skuCollision && skuCollision.id !== id) {
        throw new AppError(409, 'DUPLICATE_FOLIO', `El SKU '${normSku}' pertenece a otro producto.`)
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
          const collision = await this.productoRepo.findByExternal(
            ctx.organizationId,
            ext.externalSource,
            ext.externalId
          )
          if (collision && collision.id !== id) {
            throw new AppError(
              409,
              'DUPLICATE_EXTERNAL_ID',
              `El ID externo ${ext.externalSource}:${ext.externalId} pertenece a otro producto.`
            )
          }
          await this.mappingsRepo.upsertMapping({
            organizationId: ctx.organizationId,
            entityType: 'product',
            entityId: id,
            externalSystem: ext.externalSource,
            externalId: ext.externalId,
            syncDirection: 'bidirectional',
          })
        }
        extPatch = ext
      }
    }

    const updated = await this.productoRepo.update(ctx.organizationId, id, {
      ...(input.sku !== undefined ? { sku: input.sku.trim().toUpperCase() } : {}),
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.itemType !== undefined ? { itemType: input.itemType } : {}),
      ...(input.category !== undefined ? { category: input.category.trim() } : {}),
      ...(input.unit !== undefined ? { unit: input.unit.trim() } : {}),
      ...(input.unitPrice !== undefined ? { unitPrice: input.unitPrice } : {}),
      ...(input.costPrice !== undefined ? { costPrice: input.costPrice } : {}),
      ...(input.taxRate !== undefined ? { taxRate: input.taxRate } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.billingModel !== undefined ? { billingModel: input.billingModel } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.trackInventory !== undefined ? { trackInventory: input.trackInventory } : {}),
      ...(input.description !== undefined ? { description: input.description ? input.description.trim() : null } : {}),
      ...extPatch,
    })

    if (!updated) {
      throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Producto no encontrado.')
    }

    await this.auditRepo.append({
      organizationId: ctx.organizationId,
      category: 'sales',
      operation: 'update',
      actorName: ctx.actorName,
      entityType: 'Producto',
      entityId: id,
      summary: `Actualización de producto '${updated.name}' (SKU ${updated.sku}).`,
      externalId: updated.externalId,
      externalSource: updated.externalSource,
      externalSyncedAt: updated.externalSyncedAt,
    })

    return updated
  }

  async deleteProducto(ctx: TenantContext, id: string) {
    const existing = await this.getProducto(ctx, id)
    await this.productoRepo.softDelete(ctx.organizationId, id)

    await this.auditRepo.append({
      organizationId: ctx.organizationId,
      category: 'sales',
      operation: 'delete',
      actorName: ctx.actorName,
      entityType: 'Producto',
      entityId: id,
      summary: `Baja lógica de producto '${existing.name}' (SKU ${existing.sku}).`,
      externalId: existing.externalId,
      externalSource: existing.externalSource,
      externalSyncedAt: existing.externalSyncedAt,
    })
  }
}
