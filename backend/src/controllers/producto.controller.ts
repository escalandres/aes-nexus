import type { Request, Response } from 'express'
import { z } from 'zod'
import { ProductoService } from '../services/producto.service.ts'
import { externalReferenceInputSchema, parsePaginationQuery } from '../validators/common.validator.ts'

const externalSourceSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9][a-z0-9_.-]*$/, 'Solo minúsculas, números, guion, punto o guion bajo.')

const createProductoSchema = externalReferenceInputSchema.extend({
  sku: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(200),
  itemType: z.enum(['Producto', 'Servicio']).optional(),
  category: z.string().trim().min(1).max(80),
  unit: z.string().trim().min(1).max(32).optional(),
  unitPrice: z.number().min(0),
  costPrice: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  currency: z.enum(['MXN', 'USD', 'EUR', 'VES', 'COP', 'BRL']).optional(),
  billingModel: z.enum(['Único', 'Recurrente']).optional(),
  status: z.enum(['Activo', 'Inactivo']).optional(),
  trackInventory: z.boolean().optional(),
  description: z.string().trim().max(1500).nullable().optional(),
  external_id: z.string().trim().min(1).max(120).nullable().optional(),
  external_source: externalSourceSlugSchema.nullable().optional(),
})

const updateProductoSchema = createProductoSchema.partial()

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

export class ProductoController {
  private readonly productoService = new ProductoService()

  list = async (req: Request, res: Response): Promise<void> => {
    const query = parsePaginationQuery(req.query as Record<string, unknown>)
    res.json(await this.productoService.listProductos(req.tenantContext!, query))
  }

  getById = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.productoService.getProducto(req.tenantContext!, String(req.params.id)))
  }

  getByExternal = async (req: Request, res: Response): Promise<void> => {
    const externalSource = externalSourceSlugSchema.parse(String(req.params.externalSource))
    const externalId = z.string().trim().min(1).max(120).parse(String(req.params.externalId))
    res.json(
      await this.productoService.getProductoByExternal(
        req.tenantContext!,
        externalSource,
        externalId
      )
    )
  }

  create = async (req: Request, res: Response): Promise<void> => {
    const body = createProductoSchema.parse(req.body)
    const created = await this.productoService.createProducto(
      req.tenantContext!,
      normalizeExternalPayload(body)
    )
    res.status(201).json(created)
  }

  update = async (req: Request, res: Response): Promise<void> => {
    const body = updateProductoSchema.parse(req.body)
    const updated = await this.productoService.updateProducto(
      req.tenantContext!,
      String(req.params.id),
      normalizeExternalPayload(body)
    )
    res.json(updated)
  }

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.productoService.deleteProducto(req.tenantContext!, String(req.params.id))
    res.status(204).send()
  }
}
