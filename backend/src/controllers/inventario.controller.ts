import type { Request, Response } from 'express'
import { z } from 'zod'
import { InventarioService } from '../services/inventario.service.ts'
import { externalReferenceInputSchema, parsePaginationQuery } from '../validators/common.validator.ts'

const externalSourceSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9][a-z0-9_.-]*$/, 'Solo minúsculas, números, guion, punto o guion bajo.')

const createInventarioSchema = externalReferenceInputSchema.extend({
  productId: z.string().uuid(),
  sku: z.string().trim().min(1).max(64),
  warehouseId: z.string().uuid(),
  stockQuantity: z.number().min(0).optional(),
  reservedQuantity: z.number().min(0).optional(),
  minStock: z.number().min(0).optional(),
  thresholdSource: z.string().trim().min(1).max(20).optional(),
  unitCost: z.number().min(0).optional(),
  external_id: z.string().trim().min(1).max(120).nullable().optional(),
  external_source: externalSourceSlugSchema.nullable().optional(),
})

const updateInventarioSchema = createInventarioSchema.partial()

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

export class InventarioController {
  private readonly inventarioService = new InventarioService()

  list = async (req: Request, res: Response): Promise<void> => {
    const query = parsePaginationQuery(req.query as Record<string, unknown>)
    res.json(await this.inventarioService.listInventario(req.tenantContext!, query))
  }

  getById = async (req: Request, res: Response): Promise<void> => {
    res.json(
      await this.inventarioService.getInventarioItem(req.tenantContext!, String(req.params.id))
    )
  }

  getByExternal = async (req: Request, res: Response): Promise<void> => {
    const externalSource = externalSourceSlugSchema.parse(String(req.params.externalSource))
    const externalId = z.string().trim().min(1).max(120).parse(String(req.params.externalId))
    res.json(
      await this.inventarioService.getInventarioByExternal(
        req.tenantContext!,
        externalSource,
        externalId
      )
    )
  }

  create = async (req: Request, res: Response): Promise<void> => {
    const body = createInventarioSchema.parse(req.body)
    const created = await this.inventarioService.createInventarioItem(
      req.tenantContext!,
      normalizeExternalPayload(body)
    )
    res.status(201).json(created)
  }

  update = async (req: Request, res: Response): Promise<void> => {
    const body = updateInventarioSchema.parse(req.body)
    const updated = await this.inventarioService.updateInventarioItem(
      req.tenantContext!,
      String(req.params.id),
      normalizeExternalPayload(body)
    )
    res.json(updated)
  }

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.inventarioService.deleteInventarioItem(req.tenantContext!, String(req.params.id))
    res.status(204).send()
  }
}
