import type { Request, Response } from 'express'
import { z } from 'zod'
import { AdminService } from '../services/admin.service.ts'
import { externalReferenceInputSchema, parsePaginationQuery } from '../validators/common.validator.ts'

const createDepartmentSchema = externalReferenceInputSchema.extend({
  code: z.string().trim().min(1).max(30),
  name: z.string().trim().min(1).max(140),
  costCenter: z.string().trim().min(1).max(40),
  leader: z.string().trim().min(1).max(150),
  status: z.enum(['Activo', 'Inactivo']).optional(),
})

const createLocationSchema = externalReferenceInputSchema.extend({
  code: z.string().trim().min(1).max(30),
  name: z.string().trim().min(1).max(140),
  type: z.enum(['Oficina', 'Sucursal', 'Almacén', 'Centro de distribución']),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  address: z.string().trim().min(1).max(250),
  status: z.enum(['Activa', 'Inactiva']).optional(),
})

export class AdminController {
  private readonly adminService = new AdminService()

  listDepartments = async (req: Request, res: Response): Promise<void> => {
    const query = parsePaginationQuery(req.query as Record<string, unknown>)
    res.json(await this.adminService.listDepartments(req.tenantContext!, query))
  }

  createDepartment = async (req: Request, res: Response): Promise<void> => {
    const body = createDepartmentSchema.parse(req.body)
    res.status(201).json(await this.adminService.createDepartment(req.tenantContext!, body))
  }

  listLocations = async (req: Request, res: Response): Promise<void> => {
    const query = parsePaginationQuery(req.query as Record<string, unknown>)
    res.json(await this.adminService.listLocations(req.tenantContext!, query))
  }

  createLocation = async (req: Request, res: Response): Promise<void> => {
    const body = createLocationSchema.parse(req.body)
    res.status(201).json(await this.adminService.createLocation(req.tenantContext!, body))
  }

  listAuditLogs = async (req: Request, res: Response): Promise<void> => {
    const query = parsePaginationQuery(req.query as Record<string, unknown>)
    res.json(await this.adminService.listAuditLogs(req.tenantContext!, query))
  }
}
