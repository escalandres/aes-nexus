import type { Request, Response } from 'express'
import { z } from 'zod'
import { EmpresaService } from '../services/empresa.service.ts'
import { externalReferenceInputSchema, parsePaginationQuery } from '../validators/common.validator.ts'

const externalSourceSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9][a-z0-9_.-]*$/, 'Solo minúsculas, números, guion, punto o guion bajo.')

const createEmpresaSchema = externalReferenceInputSchema.extend({
  code: z.string().trim().min(1).max(30),
  legalName: z.string().trim().min(1).max(200),
  tradeName: z.string().trim().min(1).max(160),
  taxId: z.string().trim().min(1).max(24),
  country: z.string().trim().min(2).max(80),
  currency: z.enum(['MXN', 'USD', 'EUR', 'VES', 'COP', 'BRL']).optional(),
  status: z.enum(['Activa', 'Inactiva']).optional(),
  isHeadquarters: z.boolean().optional(),
  linkedDepartmentIds: z.array(z.string().uuid()).optional(),
  linkedLocationIds: z.array(z.string().uuid()).optional(),
  // Acepta también snake_case para integraciones externas directas
  external_id: z.string().trim().min(1).max(120).nullable().optional(),
  external_source: externalSourceSlugSchema.nullable().optional(),
})

const updateEmpresaSchema = createEmpresaSchema.partial()

function normalizeExternalPayload<T extends { externalId?: string | null; external_id?: string | null; externalSource?: string | null; external_source?: string | null }>(
  body: T
) {
  const { external_id, external_source, ...rest } = body
  const resolvedExternalId = body.externalId !== undefined ? body.externalId : external_id
  const resolvedExternalSource = body.externalSource !== undefined ? body.externalSource : external_source
  return {
    ...rest,
    ...(resolvedExternalId !== undefined ? { externalId: resolvedExternalId } : {}),
    ...(resolvedExternalSource !== undefined ? { externalSource: resolvedExternalSource } : {}),
  }
}

export class EmpresaController {
  private readonly empresaService = new EmpresaService()

  list = async (req: Request, res: Response): Promise<void> => {
    const query = parsePaginationQuery(req.query as Record<string, unknown>)
    res.json(await this.empresaService.listEmpresas(req.tenantContext!, query))
  }

  getById = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.empresaService.getEmpresa(req.tenantContext!, String(req.params.id)))
  }

  getByExternal = async (req: Request, res: Response): Promise<void> => {
    const externalSource = externalSourceSlugSchema.parse(String(req.params.externalSource))
    const externalId = z.string().trim().min(1).max(120).parse(String(req.params.externalId))
    res.json(await this.empresaService.getEmpresaByExternal(req.tenantContext!, externalSource, externalId))
  }

  create = async (req: Request, res: Response): Promise<void> => {
    const body = createEmpresaSchema.parse(req.body)
    const created = await this.empresaService.createEmpresa(req.tenantContext!, normalizeExternalPayload(body))
    res.status(201).json(created)
  }

  update = async (req: Request, res: Response): Promise<void> => {
    const body = updateEmpresaSchema.parse(req.body)
    const updated = await this.empresaService.updateEmpresa(
      req.tenantContext!,
      String(req.params.id),
      normalizeExternalPayload(body)
    )
    res.json(updated)
  }

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.empresaService.deleteEmpresa(req.tenantContext!, String(req.params.id))
    res.status(204).send()
  }
}
