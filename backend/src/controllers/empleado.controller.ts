import type { Request, Response } from 'express'
import { z } from 'zod'
import { EmpleadoService } from '../services/empleado.service.ts'
import { externalReferenceInputSchema, parsePaginationQuery } from '../validators/common.validator.ts'

const externalSourceSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9][a-z0-9_.-]*$/, 'Solo minúsculas, números, guion, punto o guion bajo.')

const createEmpleadoSchema = externalReferenceInputSchema.extend({
  employeeCode: z.string().trim().min(1).max(30),
  fullName: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().max(40).nullable().optional(),
  position: z.string().trim().min(1).max(120),
  departmentId: z.string().uuid().nullable().optional(),
  locationId: z.string().uuid().nullable().optional(),
  subsidiaryId: z.string().uuid().nullable().optional(),
  status: z.enum(['Activo', 'Inactivo', 'Vacaciones']).optional(),
  contractType: z.string().trim().min(1).max(40).optional(),
  paymentFrequency: z.string().trim().min(1).max(24).optional(),
  grossMonthlySalary: z.number().min(0),
  rfc: z.string().trim().max(24).nullable().optional(),
  curp: z.string().trim().max(24).nullable().optional(),
  nss: z.string().trim().max(20).nullable().optional(),
  external_id: z.string().trim().min(1).max(120).nullable().optional(),
  external_source: externalSourceSlugSchema.nullable().optional(),
})

const updateEmpleadoSchema = createEmpleadoSchema.partial()

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

export class EmpleadoController {
  private readonly empleadoService = new EmpleadoService()

  list = async (req: Request, res: Response): Promise<void> => {
    const query = parsePaginationQuery(req.query as Record<string, unknown>)
    res.json(await this.empleadoService.listEmpleados(req.tenantContext!, query))
  }

  getById = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.empleadoService.getEmpleado(req.tenantContext!, String(req.params.id)))
  }

  getByExternal = async (req: Request, res: Response): Promise<void> => {
    const externalSource = externalSourceSlugSchema.parse(String(req.params.externalSource))
    const externalId = z.string().trim().min(1).max(120).parse(String(req.params.externalId))
    res.json(
      await this.empleadoService.getEmpleadoByExternal(
        req.tenantContext!,
        externalSource,
        externalId
      )
    )
  }

  create = async (req: Request, res: Response): Promise<void> => {
    const body = createEmpleadoSchema.parse(req.body)
    const created = await this.empleadoService.createEmpleado(
      req.tenantContext!,
      normalizeExternalPayload(body)
    )
    res.status(201).json(created)
  }

  update = async (req: Request, res: Response): Promise<void> => {
    const body = updateEmpleadoSchema.parse(req.body)
    const updated = await this.empleadoService.updateEmpleado(
      req.tenantContext!,
      String(req.params.id),
      normalizeExternalPayload(body)
    )
    res.json(updated)
  }

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.empleadoService.deleteEmpleado(req.tenantContext!, String(req.params.id))
    res.status(204).send()
  }
}
