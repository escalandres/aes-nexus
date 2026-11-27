import { nextFolio, type SalesLineItemEntity } from '../db/storage.ts'
import { AppError } from '../errors/AppError.ts'
import { AuditRepository } from '../repositories/audit.repository.ts'
import { CompraRepository } from '../repositories/compra.repository.ts'
import { ExternalMappingsRepository } from '../repositories/externalMappings.repository.ts'
import type { PaginationQuery, TenantContext } from '../types/common.ts'
import { resolveExternalFields } from './integrations.service.ts'

export interface CreateCompraInput {
  folio?: string
  requisitionId?: string | null
  supplierId?: string | null
  supplierName: string
  warehouseId?: string | null
  orderDate?: string
  expectedDate?: string | null
  status?: string
  currency?: string
  exchangeRate?: number
  items: Array<{
    productId?: string | null
    sku?: string | null
    name: string
    quantity: number
    unitPrice: number
    discountPct?: number
    taxRate?: number
  }>
  externalId?: string | null
  externalSource?: string | null
}

export type UpdateCompraInput = Partial<CreateCompraInput>

function calculateLines(items: CreateCompraInput['items']) {
  let subtotal = 0
  let taxAmount = 0
  const normalized: SalesLineItemEntity[] = items.map((item) => {
    const disc = item.discountPct ?? 0
    const rate = item.taxRate ?? 16
    const lineSub = Number((item.quantity * item.unitPrice * (1 - disc / 100)).toFixed(2))
    const lineTax = Number((lineSub * (rate / 100)).toFixed(2))
    const lineTotal = Number((lineSub + lineTax).toFixed(2))
    subtotal += lineSub
    taxAmount += lineTax
    return {
      productId: item.productId ?? null,
      sku: item.sku ?? null,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPct: disc,
      taxRate: rate,
      lineSubtotal: lineSub,
      lineTax,
      lineTotal,
    }
  })

  return {
    items: normalized,
    subtotal: Number(subtotal.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    total: Number((subtotal + taxAmount).toFixed(2)),
  }
}

export class CompraService {
  private readonly compraRepo = new CompraRepository()
  private readonly mappingsRepo = new ExternalMappingsRepository()
  private readonly auditRepo = new AuditRepository()

  async listCompras(ctx: TenantContext, query: PaginationQuery) {
    return this.compraRepo.list(ctx.organizationId, query, ctx.requestId)
  }

  async getCompra(ctx: TenantContext, id: string) {
    const compra = await this.compraRepo.findById(ctx.organizationId, id)
    if (!compra) {
      throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Orden de compra no encontrada.')
    }
    return compra
  }

  async getCompraByExternal(ctx: TenantContext, externalSource: string, externalId: string) {
    const compra = await this.compraRepo.findByExternal(ctx.organizationId, externalSource, externalId)
    if (!compra) {
      throw new AppError(
        404,
        'RESOURCE_NOT_FOUND',
        `Orden de compra no encontrada para ${externalSource.toLowerCase()}:${externalId}.`
      )
    }
    return compra
  }

  async createCompra(ctx: TenantContext, input: CreateCompraInput) {
    const folio = input.folio?.trim().toUpperCase() || nextFolio(ctx.organizationId, 'OC')
    const duplicate = await this.compraRepo.findByFolio(ctx.organizationId, folio)
    if (duplicate) {
      throw new AppError(409, 'DUPLICATE_FOLIO', `Ya existe una orden de compra con el folio '${folio}'.`)
    }

    const ext = resolveExternalFields(ctx, input)
    if (ext.externalId && ext.externalSource) {
      const extCollision = await this.compraRepo.findByExternal(
        ctx.organizationId,
        ext.externalSource,
        ext.externalId
      )
      if (extCollision) {
        throw new AppError(
          409,
          'DUPLICATE_EXTERNAL_ID',
          `Ya existe una compra vinculada a ${ext.externalSource}:${ext.externalId}.`
        )
      }
    }

    const totals = calculateLines(input.items)

    const created = await this.compraRepo.create(ctx.organizationId, {
      folio,
      requisitionId: input.requisitionId ?? null,
      supplierId: input.supplierId ?? null,
      supplierName: input.supplierName.trim(),
      warehouseId: input.warehouseId ?? null,
      orderDate: input.orderDate || new Date().toISOString().slice(0, 10),
      expectedDate: input.expectedDate ?? null,
      status: input.status || 'Emitida',
      currency: input.currency || 'MXN',
      exchangeRate: input.exchangeRate ?? 1,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      total: totals.total,
      items: totals.items,
      ...ext,
    })

    if (ext.externalId && ext.externalSource) {
      await this.mappingsRepo.upsertMapping({
        organizationId: ctx.organizationId,
        entityType: 'purchase_order',
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
      entityType: 'Orden de Compra',
      entityId: created.id,
      summary: `Creación de orden de compra ${created.folio} con proveedor '${created.supplierName}'.`,
      externalId: ext.externalId,
      externalSource: ext.externalSource,
      externalSyncedAt: ext.externalSyncedAt,
    })

    return created
  }

  async updateCompra(ctx: TenantContext, id: string, input: UpdateCompraInput) {
    const existing = await this.getCompra(ctx, id)

    if (input.folio !== undefined) {
      const normFolio = input.folio.trim().toUpperCase()
      const collision = await this.compraRepo.findByFolio(ctx.organizationId, normFolio)
      if (collision && collision.id !== id) {
        throw new AppError(409, 'DUPLICATE_FOLIO', `El folio '${normFolio}' pertenece a otra compra.`)
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
          const collision = await this.compraRepo.findByExternal(
            ctx.organizationId,
            ext.externalSource,
            ext.externalId
          )
          if (collision && collision.id !== id) {
            throw new AppError(
              409,
              'DUPLICATE_EXTERNAL_ID',
              `El ID externo ${ext.externalSource}:${ext.externalId} pertenece a otra orden de compra.`
            )
          }
          await this.mappingsRepo.upsertMapping({
            organizationId: ctx.organizationId,
            entityType: 'purchase_order',
            entityId: id,
            externalSystem: ext.externalSource,
            externalId: ext.externalId,
            syncDirection: 'bidirectional',
          })
        }
        extPatch = ext
      }
    }

    const totals = input.items ? calculateLines(input.items) : null

    const updated = await this.compraRepo.update(ctx.organizationId, id, {
      ...(input.folio !== undefined ? { folio: input.folio.trim().toUpperCase() } : {}),
      ...(input.requisitionId !== undefined ? { requisitionId: input.requisitionId } : {}),
      ...(input.supplierId !== undefined ? { supplierId: input.supplierId } : {}),
      ...(input.supplierName !== undefined ? { supplierName: input.supplierName.trim() } : {}),
      ...(input.warehouseId !== undefined ? { warehouseId: input.warehouseId } : {}),
      ...(input.orderDate !== undefined ? { orderDate: input.orderDate } : {}),
      ...(input.expectedDate !== undefined ? { expectedDate: input.expectedDate } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.exchangeRate !== undefined ? { exchangeRate: input.exchangeRate } : {}),
      ...(totals ? totals : {}),
      ...extPatch,
    })

    if (!updated) {
      throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Orden de compra no encontrada.')
    }

    await this.auditRepo.append({
      organizationId: ctx.organizationId,
      category: 'inventory',
      operation: 'update',
      actorName: ctx.actorName,
      entityType: 'Orden de Compra',
      entityId: id,
      summary: `Actualización de orden de compra ${updated.folio} (${updated.status}).`,
      externalId: updated.externalId,
      externalSource: updated.externalSource,
      externalSyncedAt: updated.externalSyncedAt,
    })

    return updated
  }

  async deleteCompra(ctx: TenantContext, id: string) {
    const existing = await this.getCompra(ctx, id)
    await this.compraRepo.softDelete(ctx.organizationId, id)

    await this.auditRepo.append({
      organizationId: ctx.organizationId,
      category: 'inventory',
      operation: 'delete',
      actorName: ctx.actorName,
      entityType: 'Orden de Compra',
      entityId: id,
      summary: `Baja lógica de orden de compra ${existing.folio}.`,
      externalId: existing.externalId,
      externalSource: existing.externalSource,
      externalSyncedAt: existing.externalSyncedAt,
    })
  }
}
