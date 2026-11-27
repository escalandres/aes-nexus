import type { SalesLineItemEntity } from '../db/storage.ts'
import { AppError } from '../errors/AppError.ts'
import { AuditRepository } from '../repositories/audit.repository.ts'
import { ClientsRepository } from '../repositories/clients.repository.ts'
import { ExternalMappingsRepository } from '../repositories/externalMappings.repository.ts'
import { SalesRepository } from '../repositories/sales.repository.ts'
import type { PaginationQuery, TenantContext } from '../types/common.ts'
import { resolveExternalFields } from './integrations.service.ts'

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function computeLineTotals(
  items: Array<{
    productId?: string | null
    sku?: string | null
    name: string
    quantity: number
    unitPrice: number
    discountPct?: number
    taxRate?: number
  }>
): { lines: SalesLineItemEntity[]; subtotal: number; taxAmount: number; total: number } {
  const lines: SalesLineItemEntity[] = items.map((item) => {
    const discountPct = item.discountPct ?? 0
    const taxRate = item.taxRate ?? 16
    const lineSubtotal = round2(item.quantity * item.unitPrice * (1 - discountPct / 100))
    const lineTax = round2(lineSubtotal * (taxRate / 100))
    const lineTotal = round2(lineSubtotal + lineTax)
    return {
      productId: item.productId ?? null,
      sku: item.sku ?? null,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPct,
      taxRate,
      lineSubtotal,
      lineTax,
      lineTotal,
    }
  })

  const subtotal = round2(lines.reduce((acc, l) => acc + l.lineSubtotal, 0))
  const taxAmount = round2(lines.reduce((acc, l) => acc + l.lineTax, 0))
  const total = round2(subtotal + taxAmount)
  return { lines, subtotal, taxAmount, total }
}

export class SalesService {
  private readonly salesRepo = new SalesRepository()
  private readonly clientsRepo = new ClientsRepository()
  private readonly mappingsRepo = new ExternalMappingsRepository()
  private readonly auditRepo = new AuditRepository()

  async listCatalog(ctx: TenantContext, query: PaginationQuery) {
    return this.salesRepo.listCatalog(ctx.organizationId, query, ctx.requestId)
  }

  async createCatalogItem(
    ctx: TenantContext,
    input: {
      sku: string
      name: string
      itemType: 'Producto' | 'Servicio'
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
  ) {
    if (await this.salesRepo.findCatalogBySku(ctx.organizationId, input.sku)) {
      throw new AppError(409, 'DUPLICATE_FOLIO', `Ya existe un artículo con SKU '${input.sku}'.`)
    }
    const ext = resolveExternalFields(ctx, input)
    if (ext.externalId && ext.externalSource) {
      if (await this.salesRepo.findCatalogByExternal(ctx.organizationId, ext.externalSource, ext.externalId)) {
        throw new AppError(
          409,
          'DUPLICATE_EXTERNAL_ID',
          `El ID externo ${ext.externalSource}:${ext.externalId} ya está asignado a otro producto.`
        )
      }
    }

    const created = await this.salesRepo.createCatalogItem(ctx.organizationId, {
      sku: input.sku.trim(),
      name: input.name.trim(),
      itemType: input.itemType,
      category: input.category.trim(),
      unit: input.unit ?? 'Pieza',
      unitPrice: input.unitPrice,
      costPrice: input.costPrice ?? 0,
      taxRate: input.taxRate ?? 16,
      currency: input.currency ?? 'MXN',
      billingModel: input.billingModel ?? 'Único',
      status: input.status ?? 'Activo',
      trackInventory: input.trackInventory ?? input.itemType === 'Producto',
      description: input.description ?? null,
      ...ext,
    })

    if (ext.externalId && ext.externalSource) {
      await this.mappingsRepo.upsertMapping({
        organizationId: ctx.organizationId,
        entityType: 'product',
        entityId: created.id,
        externalSystem: ext.externalSource,
        externalId: ext.externalId,
      })
    }

    return created
  }

  async listQuotes(ctx: TenantContext, query: PaginationQuery) {
    return this.salesRepo.listQuotes(ctx.organizationId, query, ctx.requestId)
  }

  async createQuote(
    ctx: TenantContext,
    input: {
      clientId?: string | null
      clientName: string
      issueDate?: string
      validUntil: string
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
      notes?: string | null
      externalId?: string | null
      externalSource?: string | null
    }
  ) {
    const ext = resolveExternalFields(ctx, input)
    if (ext.externalId && ext.externalSource) {
      if (await this.salesRepo.findQuoteByExternal(ctx.organizationId, ext.externalSource, ext.externalId)) {
        throw new AppError(409, 'DUPLICATE_EXTERNAL_ID', `Cotización duplicada para ${ext.externalSource}:${ext.externalId}.`)
      }
    }

    let resolvedClientName = input.clientName.trim()
    if (input.clientId) {
      const client = await this.clientsRepo.findById(ctx.organizationId, input.clientId)
      if (!client) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Cliente especificado no existe en esta organización.')
      resolvedClientName = client.company
    }

    const totals = computeLineTotals(input.items)
    const created = await this.salesRepo.createQuote(ctx.organizationId, {
      clientId: input.clientId ?? null,
      clientName: resolvedClientName,
      issueDate: input.issueDate || new Date().toISOString().slice(0, 10),
      validUntil: input.validUntil,
      status: 'Borrador',
      currency: input.currency ?? 'MXN',
      exchangeRate: input.exchangeRate ?? 1,
      ...totals,
      items: totals.lines,
      notes: input.notes ?? null,
      ...ext,
    })

    if (ext.externalId && ext.externalSource) {
      await this.mappingsRepo.upsertMapping({
        organizationId: ctx.organizationId,
        entityType: 'quote',
        entityId: created.id,
        externalSystem: ext.externalSource,
        externalId: ext.externalId,
      })
    }

    await this.auditRepo.append({
      organizationId: ctx.organizationId,
      category: 'sales',
      operation: 'create',
      actorName: ctx.actorName,
      entityType: 'Cotización',
      entityId: created.id,
      summary: `Cotización ${created.folio} creada para ${created.clientName} ($${created.total.toFixed(2)} ${created.currency}).`,
      externalId: ext.externalId,
      externalSource: ext.externalSource,
      externalSyncedAt: ext.externalSyncedAt,
    })

    return created
  }

  async convertQuoteToOrder(ctx: TenantContext, quoteId: string) {
    const quote = await this.salesRepo.findQuoteById(ctx.organizationId, quoteId)
    if (!quote) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Cotización no encontrada.')
    if (quote.status === 'Convertida' || quote.status === 'Rechazada') {
      throw new AppError(409, 'INVALID_STATE_TRANSITION', `No se puede convertir una cotización en estado '${quote.status}'.`)
    }

    const order = await this.salesRepo.createOrder(ctx.organizationId, {
      quoteId: quote.id,
      clientId: quote.clientId,
      clientName: quote.clientName,
      orderDate: new Date().toISOString().slice(0, 10),
      deliveryDate: null,
      status: 'Confirmado',
      currency: quote.currency,
      exchangeRate: quote.exchangeRate,
      subtotal: quote.subtotal,
      taxAmount: quote.taxAmount,
      total: quote.total,
      items: quote.items,
      notes: quote.notes,
      externalId: null,
      externalSource: null,
      externalSyncedAt: null,
    })

    await this.salesRepo.updateQuote(ctx.organizationId, quote.id, { status: 'Convertida' })

    await this.auditRepo.append({
      organizationId: ctx.organizationId,
      category: 'sales',
      operation: 'create',
      actorName: ctx.actorName,
      entityType: 'Pedido de Venta',
      entityId: order.id,
      summary: `Cotización ${quote.folio} convertida al pedido firme ${order.folio}.`,
    })

    return order
  }

  async listOrders(ctx: TenantContext, query: PaginationQuery) {
    return this.salesRepo.listOrders(ctx.organizationId, query, ctx.requestId)
  }

  async createOrder(
    ctx: TenantContext,
    input: {
      clientId?: string | null
      clientName: string
      orderDate?: string
      deliveryDate?: string | null
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
      notes?: string | null
      externalId?: string | null
      externalSource?: string | null
    }
  ) {
    const ext = resolveExternalFields(ctx, input)
    if (ext.externalId && ext.externalSource) {
      if (await this.salesRepo.findOrderByExternal(ctx.organizationId, ext.externalSource, ext.externalId)) {
        throw new AppError(409, 'DUPLICATE_EXTERNAL_ID', `Pedido duplicado para ${ext.externalSource}:${ext.externalId}.`)
      }
    }

    const totals = computeLineTotals(input.items)
    const created = await this.salesRepo.createOrder(ctx.organizationId, {
      quoteId: null,
      clientId: input.clientId ?? null,
      clientName: input.clientName.trim(),
      orderDate: input.orderDate || new Date().toISOString().slice(0, 10),
      deliveryDate: input.deliveryDate ?? null,
      status: 'Confirmado',
      currency: input.currency ?? 'MXN',
      exchangeRate: input.exchangeRate ?? 1,
      ...totals,
      items: totals.lines,
      notes: input.notes ?? null,
      ...ext,
    })

    if (ext.externalId && ext.externalSource) {
      await this.mappingsRepo.upsertMapping({
        organizationId: ctx.organizationId,
        entityType: 'sales_order',
        entityId: created.id,
        externalSystem: ext.externalSource,
        externalId: ext.externalId,
      })
    }

    await this.auditRepo.append({
      organizationId: ctx.organizationId,
      category: 'sales',
      operation: 'create',
      actorName: ctx.actorName,
      entityType: 'Pedido de Venta',
      entityId: created.id,
      summary: `Pedido ${created.folio} registrado para ${created.clientName}.`,
      externalId: ext.externalId,
      externalSource: ext.externalSource,
      externalSyncedAt: ext.externalSyncedAt,
    })

    return created
  }
}
