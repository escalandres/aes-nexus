import { AppError } from '../errors/AppError.ts'
import { AuditRepository } from '../repositories/audit.repository.ts'
import { ClientsRepository } from '../repositories/clients.repository.ts'
import { ExternalMappingsRepository } from '../repositories/externalMappings.repository.ts'
import { VendorsRepository } from '../repositories/vendors.repository.ts'
import type { PaginationQuery, TenantContext } from '../types/common.ts'
import { resolveExternalFields } from './integrations.service.ts'

export class CrmService {
  private readonly clientsRepo = new ClientsRepository()
  private readonly vendorsRepo = new VendorsRepository()
  private readonly mappingsRepo = new ExternalMappingsRepository()
  private readonly auditRepo = new AuditRepository()

  // --- Clients ---
  async listClients(ctx: TenantContext, query: PaginationQuery) {
    return this.clientsRepo.list(ctx.organizationId, query, ctx.requestId)
  }

  async getClient(ctx: TenantContext, id: string) {
    const client = await this.clientsRepo.findById(ctx.organizationId, id)
    if (!client) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Cliente no encontrado.')
    return client
  }

  async createClient(
    ctx: TenantContext,
    input: {
      clientCode?: string | null
      entityType?: 'company' | 'individual'
      company: string
      name: string
      email: string
      phone?: string
      rfc?: string | null
      status?: 'Activo' | 'Prospecto' | 'Inactivo'
      country?: string
      currency?: string
      paymentTerms?: 'Contado' | 'Crédito 15 días' | 'Crédito 30 días' | 'Crédito 60 días'
      city?: string | null
      state?: string | null
      notes?: string | null
      addresses?: Array<{
        id?: string
        street?: string
        colony?: string
        city?: string
        state?: string
        zipCode?: string
        country?: string
        isShipping?: boolean
        isBilling?: boolean
      }>
      externalId?: string | null
      externalSource?: string | null
    }
  ) {
    const ext = resolveExternalFields(ctx, input)
    if (ext.externalId && ext.externalSource) {
      const duplicate = await this.clientsRepo.findByExternal(ctx.organizationId, ext.externalSource, ext.externalId)
      if (duplicate) {
        throw new AppError(
          409,
          'DUPLICATE_EXTERNAL_ID',
          `Ya existe un cliente registrado para ${ext.externalSource}:${ext.externalId}.`
        )
      }
    }

    const created = await this.clientsRepo.create(ctx.organizationId, {
      clientCode: input.clientCode ?? null,
      entityType: input.entityType ?? 'company',
      company: input.company.trim(),
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || '',
      rfc: input.rfc?.trim().toUpperCase() || null,
      status: input.status ?? 'Activo',
      country: input.country ?? 'MX',
      currency: input.currency ?? 'MXN',
      paymentTerms: input.paymentTerms ?? 'Contado',
      city: input.city ?? null,
      state: input.state ?? null,
      notes: input.notes ?? null,
      addresses: (input.addresses || []).map((a) => ({
        ...a,
        country: a.country || input.country || 'MX',
        isShipping: a.isShipping ?? true,
        isBilling: a.isBilling ?? true,
      })),
      ...ext,
    })

    if (ext.externalId && ext.externalSource) {
      await this.mappingsRepo.upsertMapping({
        organizationId: ctx.organizationId,
        entityType: 'client',
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
      entityType: 'Cliente',
      entityId: created.id,
      summary: `Alta de cliente '${created.company}'${ext.externalId ? ` (${ext.externalSource}:${ext.externalId})` : ''}.`,
      externalId: ext.externalId,
      externalSource: ext.externalSource,
      externalSyncedAt: ext.externalSyncedAt,
    })

    return created
  }

  async updateClient(ctx: TenantContext, id: string, patch: Record<string, unknown>) {
    const existing = await this.getClient(ctx, id)
    let extPatch: Record<string, unknown> = {}

    if (patch.externalId !== undefined || patch.externalSource !== undefined) {
      const ext = resolveExternalFields(ctx, {
        externalId: (patch.externalId as string | null | undefined) ?? existing.externalId,
        externalSource: (patch.externalSource as string | null | undefined) ?? existing.externalSource,
      })
      if (ext.externalId && ext.externalSource) {
        const collision = await this.clientsRepo.findByExternal(ctx.organizationId, ext.externalSource, ext.externalId)
        if (collision && collision.id !== id) {
          throw new AppError(
            409,
            'DUPLICATE_EXTERNAL_ID',
            `El ID externo ${ext.externalSource}:${ext.externalId} pertenece a otro cliente.`
          )
        }
        await this.mappingsRepo.upsertMapping({
          organizationId: ctx.organizationId,
          entityType: 'client',
          entityId: id,
          externalSystem: ext.externalSource,
          externalId: ext.externalId,
        })
      }
      extPatch = ext
    }

    const updated = await this.clientsRepo.update(ctx.organizationId, id, { ...patch, ...extPatch })
    if (!updated) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Cliente no encontrado.')

    await this.auditRepo.append({
      organizationId: ctx.organizationId,
      category: 'crm',
      operation: 'update',
      actorName: ctx.actorName,
      entityType: 'Cliente',
      entityId: id,
      summary: `Actualización de cliente '${updated.company}'.`,
      externalId: updated.externalId,
      externalSource: updated.externalSource,
      externalSyncedAt: updated.externalSyncedAt,
    })
    return updated
  }

  async deleteClient(ctx: TenantContext, id: string) {
    const existing = await this.getClient(ctx, id)
    await this.clientsRepo.softDelete(ctx.organizationId, id)
    await this.auditRepo.append({
      organizationId: ctx.organizationId,
      category: 'crm',
      operation: 'delete',
      actorName: ctx.actorName,
      entityType: 'Cliente',
      entityId: id,
      summary: `Baja lógica de cliente '${existing.company}'.`,
      externalId: existing.externalId,
      externalSource: existing.externalSource,
      externalSyncedAt: existing.externalSyncedAt,
    })
  }

  // --- Vendors ---
  async listVendors(ctx: TenantContext, query: PaginationQuery) {
    return this.vendorsRepo.list(ctx.organizationId, query, ctx.requestId)
  }

  async getVendor(ctx: TenantContext, id: string) {
    const vendor = await this.vendorsRepo.findById(ctx.organizationId, id)
    if (!vendor) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Proveedor no encontrado.')
    return vendor
  }

  async createVendor(
    ctx: TenantContext,
    input: {
      vendorCode?: string | null
      entityType?: 'company' | 'individual'
      company: string
      name: string
      email: string
      phone?: string
      rfc?: string | null
      category?: string | null
      status?: 'Activo' | 'Inactivo'
      country?: string
      currency?: string
      paymentTerms?: 'Contado' | 'Crédito 15 días' | 'Crédito 30 días' | 'Crédito 60 días'
      notes?: string | null
      externalId?: string | null
      externalSource?: string | null
    }
  ) {
    const ext = resolveExternalFields(ctx, input)
    if (ext.externalId && ext.externalSource) {
      const duplicate = await this.vendorsRepo.findByExternal(ctx.organizationId, ext.externalSource, ext.externalId)
      if (duplicate) {
        throw new AppError(
          409,
          'DUPLICATE_EXTERNAL_ID',
          `Ya existe un proveedor para ${ext.externalSource}:${ext.externalId}.`
        )
      }
    }

    const created = await this.vendorsRepo.create(ctx.organizationId, {
      vendorCode: input.vendorCode ?? null,
      entityType: input.entityType ?? 'company',
      company: input.company.trim(),
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || '',
      rfc: input.rfc?.trim().toUpperCase() || null,
      category: input.category ?? null,
      status: input.status ?? 'Activo',
      country: input.country ?? 'MX',
      currency: input.currency ?? 'MXN',
      paymentTerms: input.paymentTerms ?? 'Crédito 30 días',
      notes: input.notes ?? null,
      addresses: [],
      ...ext,
    })

    if (ext.externalId && ext.externalSource) {
      await this.mappingsRepo.upsertMapping({
        organizationId: ctx.organizationId,
        entityType: 'supplier',
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
      entityType: 'Proveedor',
      entityId: created.id,
      summary: `Alta de proveedor '${created.company}'.`,
      externalId: ext.externalId,
      externalSource: ext.externalSource,
      externalSyncedAt: ext.externalSyncedAt,
    })

    return created
  }

  async updateVendor(ctx: TenantContext, id: string, patch: Record<string, unknown>) {
    const existing = await this.getVendor(ctx, id)
    let extPatch: Record<string, unknown> = {}

    if (patch.externalId !== undefined || patch.externalSource !== undefined) {
      const ext = resolveExternalFields(ctx, {
        externalId: (patch.externalId as string | null | undefined) ?? existing.externalId,
        externalSource: (patch.externalSource as string | null | undefined) ?? existing.externalSource,
      })
      if (ext.externalId && ext.externalSource) {
        const collision = await this.vendorsRepo.findByExternal(ctx.organizationId, ext.externalSource, ext.externalId)
        if (collision && collision.id !== id) {
          throw new AppError(
            409,
            'DUPLICATE_EXTERNAL_ID',
            `El ID externo ${ext.externalSource}:${ext.externalId} pertenece a otro proveedor.`
          )
        }
        await this.mappingsRepo.upsertMapping({
          organizationId: ctx.organizationId,
          entityType: 'supplier',
          entityId: id,
          externalSystem: ext.externalSource,
          externalId: ext.externalId,
        })
      }
      extPatch = ext
    }

    const updated = await this.vendorsRepo.update(ctx.organizationId, id, { ...patch, ...extPatch })
    if (!updated) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Proveedor no encontrado.')

    await this.auditRepo.append({
      organizationId: ctx.organizationId,
      category: 'crm',
      operation: 'update',
      actorName: ctx.actorName,
      entityType: 'Proveedor',
      entityId: id,
      summary: `Actualización de proveedor '${updated.company}'.`,
      externalId: updated.externalId,
      externalSource: updated.externalSource,
      externalSyncedAt: updated.externalSyncedAt,
    })
    return updated
  }

  async deleteVendor(ctx: TenantContext, id: string) {
    const existing = await this.getVendor(ctx, id)
    await this.vendorsRepo.softDelete(ctx.organizationId, id)
    await this.auditRepo.append({
      organizationId: ctx.organizationId,
      category: 'crm',
      operation: 'delete',
      actorName: ctx.actorName,
      entityType: 'Proveedor',
      entityId: id,
      summary: `Baja lógica de proveedor '${existing.company}'.`,
      externalId: existing.externalId,
      externalSource: existing.externalSource,
      externalSyncedAt: existing.externalSyncedAt,
    })
  }
}
