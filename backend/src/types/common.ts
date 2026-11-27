export type SectionAccessLevel = 'none' | 'view' | 'create' | 'edit' | 'full'

export type RoleSectionPermissions = Record<string, Record<string, SectionAccessLevel>>

export type DomainErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'TENANT_MISMATCH'
  | 'RBAC_FORBIDDEN'
  | 'RESOURCE_NOT_FOUND'
  | 'DUPLICATE_FOLIO'
  | 'DUPLICATE_EXTERNAL_ID'
  | 'INVALID_STATE_TRANSITION'
  | 'INSUFFICIENT_STOCK'
  | 'INSUFFICIENT_FUNDS'
  | 'EXTERNAL_SOURCE_REQUIRED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INTERNAL_ERROR'

export interface ExternalReferenceFields {
  externalId: string | null
  externalSource: string | null
  externalSyncedAt: string | null
}

export interface TenantScopedEntity extends ExternalReferenceFields {
  id: string
  organizationId: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface PaginationQuery {
  page: number
  pageSize: number
  sortBy: string
  sortDir: 'asc' | 'desc'
  search: string
  externalSource?: string
  externalId?: string
  includeDeleted?: boolean
}

export interface PaginationMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
  requestId: string
}

export interface PaginatedResult<T> {
  data: T[]
  meta: PaginationMeta
}

export interface TenantContext {
  organizationId: string
  actorType: 'user' | 'api_key'
  actorId: string
  actorName: string
  actorEmail: string | null
  roleIds: string[]
  isFullAdmin: boolean
  externalSystemHeader: string | null
  requestId: string
}

export type IntegrableEntityType =
  | 'client'
  | 'supplier'
  | 'employee'
  | 'payroll_run'
  | 'opportunity'
  | 'activity'
  | 'subsidiary'
  | 'department'
  | 'location'
  | 'product'
  | 'quote'
  | 'sales_order'
  | 'sales_invoice'
  | 'customer_return'
  | 'purchase_requisition'
  | 'purchase_order'
  | 'reception'
  | 'supplier_bill'
  | 'supplier_return'
  | 'warehouse'
  | 'inventory_item'
  | 'stock_movement'
  | 'inventory_transfer'
  | 'shipment'
  | 'bank_account'
  | 'receivable'
  | 'payable'
  | 'payment_transaction'
  | 'ebp_batch'
  | 'chart_account'
  | 'expense'
  | 'expense_budget'
  | 'recurring_expense'
  | 'workspace_user'
  | 'role_definition'
  | 'category_stock_threshold'
  | 'support_ticket'

export interface ExternalIdMappingRecord {
  id: string
  organizationId: string
  entityType: IntegrableEntityType
  entityId: string
  externalSystem: string
  externalId: string
  externalUrl: string | null
  syncDirection: 'inbound' | 'outbound' | 'bidirectional'
  lastSyncedAt: string
  payloadHash: string | null
  metadata: Record<string, unknown> | null
}

export interface AuditLogRecord {
  id: string
  organizationId: string
  category: 'sales' | 'inventory' | 'finance' | 'security' | 'settings' | 'crm'
  operation: 'create' | 'read' | 'update' | 'delete'
  actorName: string
  entityType: string
  entityId: string | null
  summary: string
  externalId?: string | null
  externalSource?: string | null
  externalSyncedAt?: string | null
  timestampIso: string
}
