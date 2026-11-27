import type { Request, Response } from 'express'
import { z } from 'zod'
import { IntegrationsService } from '../services/integrations.service.ts'
import type { IntegrableEntityType } from '../types/common.ts'

const ENTITY_TYPES = [
  'client',
  'supplier',
  'employee',
  'payroll_run',
  'opportunity',
  'activity',
  'subsidiary',
  'department',
  'location',
  'product',
  'quote',
  'sales_order',
  'sales_invoice',
  'customer_return',
  'purchase_requisition',
  'purchase_order',
  'reception',
  'supplier_bill',
  'supplier_return',
  'warehouse',
  'inventory_item',
  'stock_movement',
  'inventory_transfer',
  'shipment',
  'bank_account',
  'receivable',
  'payable',
  'payment_transaction',
  'ebp_batch',
  'chart_account',
  'expense',
  'expense_budget',
  'recurring_expense',
  'workspace_user',
  'role_definition',
  'category_stock_threshold',
  'support_ticket',
] as const

const lookupQuerySchema = z.object({
  entityType: z.enum(ENTITY_TYPES),
  externalSystem: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9][a-z0-9_.-]*$/),
  externalId: z.string().trim().min(1).max(120),
})

const listMappingsSchema = z.object({
  entityType: z.enum(ENTITY_TYPES),
  entityId: z.string().trim().min(1).max(64),
})

const upsertMappingSchema = z.object({
  entityType: z.enum(ENTITY_TYPES),
  entityId: z.string().trim().min(1).max(64),
  externalSystem: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9][a-z0-9_.-]*$/),
  externalId: z.string().trim().min(1).max(120),
  externalUrl: z.string().trim().max(500).nullable().optional(),
  syncDirection: z.enum(['inbound', 'outbound', 'bidirectional']).optional(),
  payloadHash: z.string().max(64).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
})

export class IntegrationsController {
  private readonly integrationsService = new IntegrationsService()

  lookup = async (req: Request, res: Response): Promise<void> => {
    const query = lookupQuerySchema.parse(req.query)
    const result = await this.integrationsService.lookupByExternalId(
      req.tenantContext!,
      query.entityType as IntegrableEntityType,
      query.externalSystem,
      query.externalId
    )
    res.json(result)
  }

  listMappings = async (req: Request, res: Response): Promise<void> => {
    const query = listMappingsSchema.parse(req.query)
    const data = await this.integrationsService.listMappings(
      req.tenantContext!,
      query.entityType as IntegrableEntityType,
      query.entityId
    )
    res.json({ data })
  }

  upsertMapping = async (req: Request, res: Response): Promise<void> => {
    const body = upsertMappingSchema.parse(req.body)
    const saved = await this.integrationsService.upsertMapping(req.tenantContext!, body)
    res.status(201).json(saved)
  }

  deleteMapping = async (req: Request, res: Response): Promise<void> => {
    await this.integrationsService.deleteMapping(req.tenantContext!, String(req.params.mappingId))
    res.status(204).send()
  }
}
