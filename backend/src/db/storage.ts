import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import {
  DEFAULT_ORG_ID,
  checkDatabaseHealth,
  getActiveDbMode,
  getPgPool,
  isPostgresEnabled,
  type DbConnectionMode,
} from './postgres.ts'
import type {
  AuditLogRecord,
  ExternalIdMappingRecord,
  PaginationMeta,
  PaginationQuery,
  RoleSectionPermissions,
  TenantScopedEntity,
} from '../types/common.ts'

export { DEFAULT_ORG_ID, checkDatabaseHealth, getActiveDbMode, getPgPool, isPostgresEnabled }
export type { DbConnectionMode }

export interface CoreOrganizationRecord {
  id: string
  slug: string
  name: string
  status: 'active' | 'suspended'
  planTier: 'Growth' | 'Enterprise' | 'Corporate'
  reportingCurrency: string
  externalId: string | null
  externalSource: string | null
  externalSyncedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CoreUserRecord {
  id: string
  email: string
  fullName: string
  avatarInitials: string
  passwordHash: string
  status: 'active' | 'suspended'
  organizationIds: string[]
  rolesByOrg: Record<string, string[]>
  externalId: string | null
  externalSource: string | null
  externalSyncedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ExternalApiKeyRecord {
  id: string
  organizationId: string
  name: string
  externalSystem: string
  roleId: string
  keyPrefix: string
  keyHash: string
  status: 'active' | 'paused' | 'revoked'
  rateLimitPerMin: number
  externalId: string | null
  externalSource: string | null
  externalSyncedAt: string | null
  createdAt: string
}

export interface RoleDefinitionEntity extends TenantScopedEntity {
  name: string
  description: string
  sectionPermissions: RoleSectionPermissions
  builtInKey?: 'admin' | 'ops' | 'sales' | 'fin'
  forApiIntegration: boolean
}

export interface ClientAddressEntity {
  id?: string
  street?: string
  colony?: string
  city?: string
  state?: string
  zipCode?: string
  country: string
  isShipping: boolean
  isBilling: boolean
}

export interface ClientEntity extends TenantScopedEntity {
  clientCode: string | null
  entityType: 'company' | 'individual'
  company: string
  name: string
  email: string
  phone: string
  rfc: string | null
  status: 'Activo' | 'Prospecto' | 'Inactivo'
  country: string | null
  currency: string
  paymentTerms: 'Contado' | 'Crédito 15 días' | 'Crédito 30 días' | 'Crédito 60 días'
  city: string | null
  state: string | null
  notes: string | null
  addresses: ClientAddressEntity[]
}

export interface VendorEntity extends TenantScopedEntity {
  vendorCode: string | null
  entityType: 'company' | 'individual'
  company: string
  name: string
  email: string
  phone: string
  rfc: string | null
  category: string | null
  status: 'Activo' | 'Inactivo'
  country: string | null
  currency: string
  paymentTerms: 'Contado' | 'Crédito 15 días' | 'Crédito 30 días' | 'Crédito 60 días'
  notes: string | null
  addresses: ClientAddressEntity[]
}

export interface CatalogItemEntity extends TenantScopedEntity {
  sku: string
  name: string
  itemType: 'Producto' | 'Servicio'
  category: string
  unit: string
  unitPrice: number
  costPrice: number
  taxRate: number
  currency: string
  billingModel: 'Único' | 'Recurrente'
  status: 'Activo' | 'Inactivo'
  trackInventory: boolean
  description: string | null
}

export interface SalesLineItemEntity {
  productId?: string | null
  sku?: string | null
  name: string
  quantity: number
  unitPrice: number
  discountPct: number
  taxRate: number
  lineSubtotal: number
  lineTax: number
  lineTotal: number
}

export interface QuoteEntity extends TenantScopedEntity {
  folio: string
  clientId: string | null
  clientName: string
  issueDate: string
  validUntil: string
  status: 'Borrador' | 'Enviada' | 'Aprobada' | 'Rechazada' | 'Convertida'
  currency: string
  exchangeRate: number
  subtotal: number
  taxAmount: number
  total: number
  items: SalesLineItemEntity[]
  notes: string | null
}

export interface SalesOrderEntity extends TenantScopedEntity {
  folio: string
  quoteId: string | null
  clientId: string | null
  clientName: string
  orderDate: string
  deliveryDate: string | null
  status: 'Pendiente' | 'Confirmado' | 'En preparación' | 'Entregado' | 'Cancelado'
  currency: string
  exchangeRate: number
  subtotal: number
  taxAmount: number
  total: number
  items: SalesLineItemEntity[]
  notes: string | null
}

export interface SubsidiaryEntity extends TenantScopedEntity {
  code: string
  legalName: string
  tradeName: string
  taxId: string
  country: string
  currency: string
  status: 'Activa' | 'Inactiva'
  isHeadquarters: boolean
  linkedDepartmentIds: string[]
  linkedLocationIds: string[]
}

export interface DepartmentEntity extends TenantScopedEntity {
  code: string
  name: string
  costCenter: string
  leader: string
  status: 'Activo' | 'Inactivo'
}

export interface LocationEntity extends TenantScopedEntity {
  code: string
  name: string
  type: 'Oficina' | 'Sucursal' | 'Almacén' | 'Centro de distribución'
  city: string
  state: string
  address: string
  status: 'Activa' | 'Inactiva'
}

export interface EmployeeEntity extends TenantScopedEntity {
  employeeCode: string
  fullName: string
  email: string
  phone: string | null
  position: string
  departmentId: string | null
  locationId: string | null
  subsidiaryId: string | null
  status: 'Activo' | 'Inactivo' | 'Vacaciones'
  contractType: string
  paymentFrequency: string
  grossMonthlySalary: number
  rfc: string | null
  curp: string | null
  nss: string | null
}

export interface PurchaseOrderEntity extends TenantScopedEntity {
  folio: string
  requisitionId: string | null
  supplierId: string | null
  supplierName: string
  warehouseId: string | null
  orderDate: string
  expectedDate: string | null
  status: string
  currency: string
  exchangeRate: number
  subtotal: number
  taxAmount: number
  total: number
  items: SalesLineItemEntity[]
}

export interface InventoryItemEntity extends TenantScopedEntity {
  productId: string
  sku: string
  warehouseId: string
  stockQuantity: number
  reservedQuantity: number
  minStock: number
  thresholdSource: string
  unitCost: number
}

export interface DatabaseState {
  organizations: CoreOrganizationRecord[]
  users: CoreUserRecord[]
  apiKeys: ExternalApiKeyRecord[]
  roles: RoleDefinitionEntity[]
  clients: ClientEntity[]
  vendors: VendorEntity[]
  employees: EmployeeEntity[]
  catalogItems: CatalogItemEntity[]
  quotes: QuoteEntity[]
  orders: SalesOrderEntity[]
  purchaseOrders: PurchaseOrderEntity[]
  inventoryItems: InventoryItemEntity[]
  subsidiaries: SubsidiaryEntity[]
  departments: DepartmentEntity[]
  locations: LocationEntity[]
  externalMappings: ExternalIdMappingRecord[]
  auditLogs: AuditLogRecord[]
  folioSequences: Record<string, number>
}

const DATA_DIR = path.resolve(import.meta.dirname, '../../.data')
const DB_FILE_PATH = path.resolve(DATA_DIR, 'aes-nexus-db.json')

function createInitialSeed(): DatabaseState {
  const now = new Date().toISOString()
  return {
    organizations: [
      {
        id: DEFAULT_ORG_ID,
        slug: 'brujula-estudio',
        name: 'Brújula Estudio S.A. de C.V.',
        status: 'active',
        planTier: 'Enterprise',
        reportingCurrency: 'MXN',
        externalId: null,
        externalSource: null,
        externalSyncedAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
    users: [],
    apiKeys: [],
    roles: [
      {
        id: 'Administrador',
        organizationId: DEFAULT_ORG_ID,
        name: 'Administrador General',
        description: 'Control total del espacio de trabajo, configuración y módulos.',
        builtInKey: 'admin',
        forApiIntegration: false,
        sectionPermissions: {
          CRM: { Resumen: 'full', Clientes: 'full', Proveedores: 'full', Empleados: 'full', Nómina: 'full', Oportunidades: 'full', Actividades: 'full' },
          Ventas: { Catálogo: 'full', Cotizaciones: 'full', Pedidos: 'full', Facturas: 'full', Devoluciones: 'full', Resumen: 'full' },
          Compras: { Resumen: 'full', Requisiciones: 'full', 'Órdenes de compra': 'full', Recepciones: 'full', Facturas: 'full', Devoluciones: 'full' },
          Operaciones: { Inventario: 'full', Traslados: 'full', Compras: 'full', Entregas: 'full', Resumen: 'full' },
          Finanzas: { Cobros: 'full', Pagos: 'full', 'Pagos Bancarios': 'full', 'Cuentas contables': 'full', Resumen: 'full' },
          Gastos: { 'Resumen y control': 'full', 'Registro y pólizas': 'full', 'Presupuestos y alertas': 'full', 'Gastos recurrentes': 'full' },
          Reportes: { 'Resumen ejecutivo': 'full', 'Estado de Resultados': 'full', 'Finanzas y Tesorería': 'full', 'CxP y Pagos EBP': 'full', 'Ventas y CxC': 'full', 'Compras e Inventario': 'full', 'Nómina y RRHH': 'full' },
          Administración: { Subsidiarias: 'full', Departamentos: 'full', Ubicaciones: 'full', 'Flujos de devoluciones': 'full', Resumen: 'full', 'Historial de Auditoría': 'full' },
          Configuración: { General: 'full', Organización: 'full', 'Idioma y región': 'full', Usuarios: 'full', 'Roles y permisos': 'full', Seguridad: 'full', Apariencia: 'full', Notificaciones: 'full', 'Umbrales de stock': 'full', Auditoría: 'full', Integraciones: 'full', 'Plan y facturación': 'full' },
        },
        externalId: null,
        externalSource: null,
        externalSyncedAt: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
      {
        id: 'Operaciones',
        organizationId: DEFAULT_ORG_ID,
        name: 'Gerencia de Operaciones',
        description: 'Gestión de inventario, almacenes, compras y entregas.',
        builtInKey: 'ops',
        forApiIntegration: false,
        sectionPermissions: {
          CRM: { Proveedores: 'view' },
          Compras: { Resumen: 'view', Requisiciones: 'create', 'Órdenes de compra': 'edit', Recepciones: 'edit', Facturas: 'view', Devoluciones: 'edit' },
          Operaciones: { Inventario: 'edit', Traslados: 'edit', Compras: 'view', Entregas: 'edit', Resumen: 'view' },
        },
        externalId: null,
        externalSource: null,
        externalSyncedAt: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
      {
        id: 'Ventas',
        organizationId: DEFAULT_ORG_ID,
        name: 'Equipo Comercial & Ventas',
        description: 'Gestión de clientes, catálogo, cotizaciones y pedidos.',
        builtInKey: 'sales',
        forApiIntegration: false,
        sectionPermissions: {
          CRM: { Resumen: 'view', Clientes: 'edit', Proveedores: 'view', Oportunidades: 'full', Actividades: 'full' },
          Ventas: { Catálogo: 'view', Cotizaciones: 'full', Pedidos: 'edit', Facturas: 'create', Devoluciones: 'edit', Resumen: 'view' },
        },
        externalId: null,
        externalSource: null,
        externalSyncedAt: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
    ],
    clients: [
      {
        id: 'c1a00001-0000-4000-8000-000000000001',
        organizationId: DEFAULT_ORG_ID,
        clientCode: 'CLI-001',
        entityType: 'company',
        company: 'Grupo Industrial Regio S.A. de C.V.',
        name: 'Laura Garza Montemayor',
        email: 'laura.garza@regioindustrial.mx',
        phone: '+52 81 8340 1200',
        rfc: 'GIR980412AB1',
        status: 'Activo',
        country: 'MX',
        currency: 'MXN',
        paymentTerms: 'Crédito 30 días',
        city: 'Monterrey',
        state: 'Nuevo León',
        notes: 'Cliente corporativo con entregas programadas mensuales.',
        addresses: [
          {
            street: 'Av. Constitución 1450 Pte.',
            colony: 'Centro',
            city: 'Monterrey',
            state: 'Nuevo León',
            zipCode: '64000',
            country: 'MX',
            isShipping: true,
            isBilling: true,
          },
        ],
        externalId: 'shp_cus_894210',
        externalSource: 'shopify',
        externalSyncedAt: now,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
    ],
    vendors: [
      {
        id: 'v1a00001-0000-4000-8000-000000000001',
        organizationId: DEFAULT_ORG_ID,
        vendorCode: 'PRV-001',
        entityType: 'company',
        company: 'Logística y Suministros del Norte S.A.',
        name: 'Fernando Saldívar',
        email: 'cxp@logisticadelnorte.mx',
        phone: '+52 81 8122 4400',
        rfc: 'LSN051120XY9',
        category: 'Logística y Hardware',
        status: 'Activo',
        country: 'MX',
        currency: 'MXN',
        paymentTerms: 'Crédito 30 días',
        notes: null,
        addresses: [],
        externalId: 'ERP-PRV-001',
        externalSource: 'contpaqi',
        externalSyncedAt: now,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
    ],
    employees: [
      {
        id: 'e1a00001-0000-4000-8000-000000000001',
        organizationId: DEFAULT_ORG_ID,
        employeeCode: 'EMP-001',
        fullName: 'Andrea Morales Escala',
        email: 'andrea.morales@brujula.mx',
        phone: '+52 81 8000 1001',
        position: 'Dirección de Operaciones',
        departmentId: 'd1a00001-0000-4000-8000-000000000001',
        locationId: 'l1a00001-0000-4000-8000-000000000001',
        subsidiaryId: 's1a00001-0000-4000-8000-000000000001',
        status: 'Activo',
        contractType: 'Tiempo indeterminado',
        paymentFrequency: 'Quincenal',
        grossMonthlySalary: 48000,
        rfc: 'MOEA880512HT1',
        curp: null,
        nss: null,
        externalId: null,
        externalSource: null,
        externalSyncedAt: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
    ],
    catalogItems: [
      {
        id: 'p1a00001-0000-4000-8000-000000000001',
        organizationId: DEFAULT_ORG_ID,
        sku: 'HW-POS-100',
        name: 'Terminal Punto de Venta Pro X1',
        itemType: 'Producto',
        category: 'Hardware',
        unit: 'Pieza',
        unitPrice: 12500,
        costPrice: 8200,
        taxRate: 16,
        currency: 'MXN',
        billingModel: 'Único',
        status: 'Activo',
        trackInventory: true,
        description: 'Terminal táctil industrial con impresora térmica integrada.',
        externalId: 'shp_prod_4410',
        externalSource: 'shopify',
        externalSyncedAt: now,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
    ],
    quotes: [],
    orders: [],
    purchaseOrders: [],
    inventoryItems: [
      {
        id: 'i1a00001-0000-4000-8000-000000000001',
        organizationId: DEFAULT_ORG_ID,
        productId: 'p1a00001-0000-4000-8000-000000000001',
        sku: 'HW-POS-100',
        warehouseId: 'w1a00001-0000-4000-8000-000000000001',
        stockQuantity: 28,
        reservedQuantity: 4,
        minStock: 10,
        thresholdSource: 'sku',
        unitCost: 8200,
        externalId: null,
        externalSource: null,
        externalSyncedAt: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
    ],
    subsidiaries: [
      {
        id: 's1a00001-0000-4000-8000-000000000001',
        organizationId: DEFAULT_ORG_ID,
        code: 'EMP-MX-01',
        legalName: 'Brújula Estudio S.A. de C.V.',
        tradeName: 'Brújula Estudio Matriz',
        taxId: 'BES180524AB1',
        country: 'México',
        currency: 'MXN',
        status: 'Activa',
        isHeadquarters: true,
        linkedDepartmentIds: ['d1a00001-0000-4000-8000-000000000001'],
        linkedLocationIds: ['l1a00001-0000-4000-8000-000000000001'],
        externalId: null,
        externalSource: null,
        externalSyncedAt: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
    ],
    departments: [
      {
        id: 'd1a00001-0000-4000-8000-000000000001',
        organizationId: DEFAULT_ORG_ID,
        code: 'DEP-DIR',
        name: 'Dirección y Administración',
        costCenter: 'CC-100',
        leader: 'Andrea Morales Escala',
        status: 'Activo',
        externalId: null,
        externalSource: null,
        externalSyncedAt: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
    ],
    locations: [
      {
        id: 'l1a00001-0000-4000-8000-000000000001',
        organizationId: DEFAULT_ORG_ID,
        code: 'SUC-MTY',
        name: 'Matriz Monterrey Centro',
        type: 'Sucursal',
        city: 'Monterrey',
        state: 'Nuevo León',
        address: 'Av. Ignacio Morones Prieto 2110',
        status: 'Activa',
        externalId: null,
        externalSource: null,
        externalSyncedAt: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
    ],
    externalMappings: [
      {
        id: 'm1a00001-0000-4000-8000-000000000001',
        organizationId: DEFAULT_ORG_ID,
        entityType: 'client',
        entityId: 'c1a00001-0000-4000-8000-000000000001',
        externalSystem: 'shopify',
        externalId: 'shp_cus_894210',
        externalUrl: null,
        syncDirection: 'bidirectional',
        lastSyncedAt: now,
        payloadHash: null,
        metadata: null,
      },
    ],
    auditLogs: [],
    folioSequences: {},
  }
}

let cachedState: DatabaseState | null = null

export function readDb(): DatabaseState {
  if (cachedState) return cachedState
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf8')
      const parsed = JSON.parse(raw) as DatabaseState
      const seed = createInitialSeed()
      if (!Array.isArray(parsed.subsidiaries)) {
        parsed.subsidiaries = seed.subsidiaries
      }
      if (!Array.isArray(parsed.employees)) {
        parsed.employees = seed.employees
      }
      if (!Array.isArray(parsed.purchaseOrders)) {
        parsed.purchaseOrders = seed.purchaseOrders
      }
      if (!Array.isArray(parsed.inventoryItems)) {
        parsed.inventoryItems = seed.inventoryItems
      }
      cachedState = parsed
      return cachedState
    }
  } catch {
    // Fallback to initial seed if corrupt
  }
  cachedState = createInitialSeed()
  persistDb(cachedState)
  return cachedState
}

export function persistDb(state: DatabaseState): void {
  cachedState = state
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  const tempPath = path.resolve(DATA_DIR, `aes-nexus-db.${process.pid}.tmp`)
  fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), 'utf8')
  fs.renameSync(tempPath, DB_FILE_PATH)
}

export function nextFolio(organizationId: string, prefix: string, year = new Date().getUTCFullYear()): string {
  const db = readDb()
  const key = `${organizationId}:${prefix}:${year}`
  const next = (db.folioSequences[key] || 0) + 1
  db.folioSequences[key] = next
  persistDb(db)
  return `${prefix}-${year}-${String(next).padStart(3, '0')}`
}

export function hashPasswordScrypt(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const derived = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${derived}`
}

export function verifyPasswordScrypt(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':')
  if (parts.length !== 2) return false
  const [salt, hexHash] = parts
  const expected = Buffer.from(hexHash, 'hex')
  const actual = crypto.scryptSync(password, salt, 64)
  if (expected.length !== actual.length) return false
  return crypto.timingSafeEqual(expected, actual)
}

export function hashSecretSha256(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex')
}

export function paginateArray<T extends Record<string, unknown>>(
  rows: T[],
  query: PaginationQuery,
  requestId: string,
  searchableFields: Array<keyof T>
): { data: T[]; meta: PaginationMeta } {
  const term = query.search.trim().toLowerCase()
  const filtered = rows.filter((row) => {
    if (!query.includeDeleted && row.deletedAt) return false
    if (query.externalSource && row.externalSource !== query.externalSource) return false
    if (query.externalId && row.externalId !== query.externalId) return false
    if (!term) return true
    return searchableFields.some((field) => {
      const val = row[field]
      return typeof val === 'string' && val.toLowerCase().includes(term)
    })
  })

  const sortField = query.sortBy || 'updatedAt'
  const sorted = [...filtered].sort((a, b) => {
    const av = String(a[sortField] ?? '')
    const bv = String(b[sortField] ?? '')
    const cmp = av.localeCompare(bv, 'es', { numeric: true })
    return query.sortDir === 'asc' ? cmp : -cmp
  })

  const totalItems = sorted.length
  const totalPages = Math.max(1, Math.ceil(totalItems / query.pageSize))
  const safePage = Math.min(Math.max(1, query.page), totalPages)
  const offset = (safePage - 1) * query.pageSize
  const data = sorted.slice(offset, offset + query.pageSize)

  return {
    data,
    meta: {
      page: safePage,
      pageSize: query.pageSize,
      totalItems,
      totalPages,
      hasNext: safePage < totalPages,
      hasPrev: safePage > 1,
      requestId,
    },
  }
}
