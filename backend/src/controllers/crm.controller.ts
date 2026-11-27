import type { Request, Response } from 'express'
import { z } from 'zod'
import { CrmService } from '../services/crm.service.ts'
import { externalReferenceInputSchema, parsePaginationQuery } from '../validators/common.validator.ts'

const addressSchema = z.object({
  id: z.string().max(64).optional(),
  street: z.string().max(200).optional(),
  colony: z.string().max(140).optional(),
  city: z.string().max(120).optional(),
  state: z.string().max(120).optional(),
  zipCode: z.string().max(20).optional(),
  country: z.string().min(2).max(8).optional(),
  isShipping: z.boolean().optional(),
  isBilling: z.boolean().optional(),
})

const createClientSchema = externalReferenceInputSchema.extend({
  clientCode: z.string().max(40).nullable().optional(),
  entityType: z.enum(['company', 'individual']).optional(),
  company: z.string().trim().min(1).max(180),
  name: z.string().trim().min(1).max(150),
  email: z.string().trim().email().max(180),
  phone: z.string().max(40).optional(),
  rfc: z.string().max(24).nullable().optional(),
  status: z.enum(['Activo', 'Prospecto', 'Inactivo']).optional(),
  country: z.string().min(2).max(8).optional(),
  currency: z.enum(['MXN', 'USD', 'EUR', 'VES', 'COP', 'BRL']).optional(),
  paymentTerms: z.enum(['Contado', 'Crédito 15 días', 'Crédito 30 días', 'Crédito 60 días']).optional(),
  city: z.string().max(120).nullable().optional(),
  state: z.string().max(120).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  addresses: z.array(addressSchema).optional(),
})

const updateClientSchema = createClientSchema.partial()

const createVendorSchema = externalReferenceInputSchema.extend({
  vendorCode: z.string().max(40).nullable().optional(),
  entityType: z.enum(['company', 'individual']).optional(),
  company: z.string().trim().min(1).max(180),
  name: z.string().trim().min(1).max(150),
  email: z.string().trim().email().max(180),
  phone: z.string().max(40).optional(),
  rfc: z.string().max(24).nullable().optional(),
  category: z.string().max(80).nullable().optional(),
  status: z.enum(['Activo', 'Inactivo']).optional(),
  country: z.string().min(2).max(8).optional(),
  currency: z.enum(['MXN', 'USD', 'EUR', 'VES', 'COP', 'BRL']).optional(),
  paymentTerms: z.enum(['Contado', 'Crédito 15 días', 'Crédito 30 días', 'Crédito 60 días']).optional(),
  notes: z.string().max(2000).nullable().optional(),
})

const updateVendorSchema = createVendorSchema.partial()

export class CrmController {
  private readonly crmService = new CrmService()

  listClients = async (req: Request, res: Response): Promise<void> => {
    const query = parsePaginationQuery(req.query as Record<string, unknown>)
    res.json(await this.crmService.listClients(req.tenantContext!, query))
  }

  getClient = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.crmService.getClient(req.tenantContext!, String(req.params.id)))
  }

  createClient = async (req: Request, res: Response): Promise<void> => {
    const body = createClientSchema.parse(req.body)
    res.status(201).json(await this.crmService.createClient(req.tenantContext!, body))
  }

  updateClient = async (req: Request, res: Response): Promise<void> => {
    const body = updateClientSchema.parse(req.body)
    res.json(await this.crmService.updateClient(req.tenantContext!, String(req.params.id), body))
  }

  deleteClient = async (req: Request, res: Response): Promise<void> => {
    await this.crmService.deleteClient(req.tenantContext!, String(req.params.id))
    res.status(204).send()
  }

  listVendors = async (req: Request, res: Response): Promise<void> => {
    const query = parsePaginationQuery(req.query as Record<string, unknown>)
    res.json(await this.crmService.listVendors(req.tenantContext!, query))
  }

  getVendor = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.crmService.getVendor(req.tenantContext!, String(req.params.id)))
  }

  createVendor = async (req: Request, res: Response): Promise<void> => {
    const body = createVendorSchema.parse(req.body)
    res.status(201).json(await this.crmService.createVendor(req.tenantContext!, body))
  }

  updateVendor = async (req: Request, res: Response): Promise<void> => {
    const body = updateVendorSchema.parse(req.body)
    res.json(await this.crmService.updateVendor(req.tenantContext!, String(req.params.id), body))
  }

  deleteVendor = async (req: Request, res: Response): Promise<void> => {
    await this.crmService.deleteVendor(req.tenantContext!, String(req.params.id))
    res.status(204).send()
  }
}
