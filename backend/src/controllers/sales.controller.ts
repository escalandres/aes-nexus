import type { Request, Response } from 'express'
import { z } from 'zod'
import { SalesService } from '../services/sales.service.ts'
import { externalReferenceInputSchema, parsePaginationQuery } from '../validators/common.validator.ts'

const lineItemSchema = z.object({
  productId: z.string().max(64).nullable().optional(),
  sku: z.string().max(64).nullable().optional(),
  name: z.string().trim().min(1).max(200),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  discountPct: z.number().min(0).max(100).optional(),
  taxRate: z.number().min(0).max(100).optional(),
})

const createCatalogItemSchema = externalReferenceInputSchema.extend({
  sku: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(200),
  itemType: z.enum(['Producto', 'Servicio']),
  category: z.string().trim().min(1).max(80),
  unit: z.string().max(32).optional(),
  unitPrice: z.number().min(0),
  costPrice: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  currency: z.enum(['MXN', 'USD', 'EUR', 'VES', 'COP', 'BRL']).optional(),
  billingModel: z.enum(['Único', 'Recurrente']).optional(),
  status: z.enum(['Activo', 'Inactivo']).optional(),
  trackInventory: z.boolean().optional(),
  description: z.string().max(2000).nullable().optional(),
})

const createQuoteSchema = externalReferenceInputSchema.extend({
  clientId: z.string().max(64).nullable().optional(),
  clientName: z.string().trim().min(1).max(180),
  issueDate: z.string().max(24).optional(),
  validUntil: z.string().trim().min(4).max(24),
  currency: z.enum(['MXN', 'USD', 'EUR', 'VES', 'COP', 'BRL']).optional(),
  exchangeRate: z.number().positive().optional(),
  items: z.array(lineItemSchema).min(1),
  notes: z.string().max(2000).nullable().optional(),
})

const createOrderSchema = externalReferenceInputSchema.extend({
  clientId: z.string().max(64).nullable().optional(),
  clientName: z.string().trim().min(1).max(180),
  orderDate: z.string().max(24).optional(),
  deliveryDate: z.string().max(24).nullable().optional(),
  currency: z.enum(['MXN', 'USD', 'EUR', 'VES', 'COP', 'BRL']).optional(),
  exchangeRate: z.number().positive().optional(),
  items: z.array(lineItemSchema).min(1),
  notes: z.string().max(2000).nullable().optional(),
})

export class SalesController {
  private readonly salesService = new SalesService()

  listCatalog = async (req: Request, res: Response): Promise<void> => {
    const query = parsePaginationQuery(req.query as Record<string, unknown>)
    res.json(await this.salesService.listCatalog(req.tenantContext!, query))
  }

  createCatalogItem = async (req: Request, res: Response): Promise<void> => {
    const body = createCatalogItemSchema.parse(req.body)
    res.status(201).json(await this.salesService.createCatalogItem(req.tenantContext!, body))
  }

  listQuotes = async (req: Request, res: Response): Promise<void> => {
    const query = parsePaginationQuery(req.query as Record<string, unknown>)
    res.json(await this.salesService.listQuotes(req.tenantContext!, query))
  }

  createQuote = async (req: Request, res: Response): Promise<void> => {
    const body = createQuoteSchema.parse(req.body)
    res.status(201).json(await this.salesService.createQuote(req.tenantContext!, body))
  }

  convertQuoteToOrder = async (req: Request, res: Response): Promise<void> => {
    res.status(201).json(await this.salesService.convertQuoteToOrder(req.tenantContext!, String(req.params.id)))
  }

  listOrders = async (req: Request, res: Response): Promise<void> => {
    const query = parsePaginationQuery(req.query as Record<string, unknown>)
    res.json(await this.salesService.listOrders(req.tenantContext!, query))
  }

  createOrder = async (req: Request, res: Response): Promise<void> => {
    const body = createOrderSchema.parse(req.body)
    res.status(201).json(await this.salesService.createOrder(req.tenantContext!, body))
  }
}
