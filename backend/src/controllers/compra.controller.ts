import type { Request, Response } from 'express'
import { z } from 'zod'
import { CompraService } from '../services/compra.service.ts'
import { externalReferenceInputSchema, parsePaginationQuery } from '../validators/common.validator.ts'

const externalSourceSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9][a-z0-9_.-]*$/, 'Solo minúsculas, números, guion, punto o guion bajo.')

const lineItemSchema = z.object({
  productId: z.string().uuid().nullable().optional(),
  sku: z.string().trim().max(64).nullable().optional(),
  name: z.string().trim().min(1).max(200),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  discountPct: z.number().min(0).max(100).optional(),
  taxRate: z.number().min(0).max(100).optional(),
})

const createCompraSchema = externalReferenceInputSchema.extend({
  folio: z.string().trim().min(1).max(30).optional(),
  requisitionId: z.string().uuid().nullable().optional(),
  supplierId: z.string().uuid().nullable().optional(),
  supplierName: z.string().trim().min(1).max(180),
  warehouseId: z.string().uuid().nullable().optional(),
  orderDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expectedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status: z.string().trim().min(1).max(24).optional(),
  currency: z.enum(['MXN', 'USD', 'EUR', 'VES', 'COP', 'BRL']).optional(),
  exchangeRate: z.number().positive().optional(),
  items: z.array(lineItemSchema).min(1),
  external_id: z.string().trim().min(1).max(120).nullable().optional(),
  external_source: externalSourceSlugSchema.nullable().optional(),
})

const updateCompraSchema = createCompraSchema.partial()

function normalizeExternalPayload<
  T extends {
    externalId?: string | null
    external_id?: string | null
    externalSource?: string | null
    external_source?: string | null
  },
>(body: T) {
  const { external_id, external_source, ...rest } = body
  const resolvedExternalId = body.externalId !== undefined ? body.externalId : external_id
  const resolvedExternalSource =
    body.externalSource !== undefined ? body.externalSource : external_source
  return {
    ...rest,
    ...(resolvedExternalId !== undefined ? { externalId: resolvedExternalId } : {}),
    ...(resolvedExternalSource !== undefined ? { externalSource: resolvedExternalSource } : {}),
  }
}

export class CompraController {
  private readonly compraService = new CompraService()

  list = async (req: Request, res: Response): Promise<void> => {
    const query = parsePaginationQuery(req.query as Record<string, unknown>)
    res.json(await this.compraService.listCompras(req.tenantContext!, query))
  }

  getById = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.compraService.getCompra(req.tenantContext!, String(req.params.id)))
  }

  getByExternal = async (req: Request, res: Response): Promise<void> => {
    const externalSource = externalSourceSlugSchema.parse(String(req.params.externalSource))
    const externalId = z.string().trim().min(1).max(120).parse(String(req.params.externalId))
    res.json(
      await this.compraService.getCompraByExternal(
        req.tenantContext!,
        externalSource,
        externalId
      )
    )
  }

  create = async (req: Request, res: Response): Promise<void> => {
    const body = createCompraSchema.parse(req.body)
    const created = await this.compraService.createCompra(
      req.tenantContext!,
      normalizeExternalPayload(body)
    )
    res.status(201).json(created)
  }

  update = async (req: Request, res: Response): Promise<void> => {
    const body = updateCompraSchema.parse(req.body)
    const updated = await this.compraService.updateCompra(
      req.tenantContext!,
      String(req.params.id),
      normalizeExternalPayload(body)
    )
    res.json(updated)
  }

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.compraService.deleteCompra(req.tenantContext!, String(req.params.id))
    res.status(204).send()
  }
}
