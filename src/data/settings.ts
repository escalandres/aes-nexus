export type BuiltInRoleKey = 'Administrador' | 'Operaciones' | 'Ventas' | 'Finanzas'
export type RoleKey = string

export type RoleCapabilityId =
  | 'sysConfig'
  | 'manageUsers'
  | 'approvePurchases'
  | 'fullReports'
  | 'inventoryControl'
  | 'adjustThresholds'
  | 'receiveGoods'
  | 'stockLedger'
  | 'createQuotes'
  | 'issueOrders'
  | 'crmClients'
  | 'pipelineReports'
  | 'manageReceivables'
  | 'schedulePayments'
  | 'balanceReports'
  | 'expenseControl'

export interface CapabilityDefinition {
  id: RoleCapabilityId
  group: BuiltInRoleKey
}

export type SectionAccessLevel = 'none' | 'view' | 'create' | 'edit' | 'full'

export type RoleSectionPermissions = Record<string, Record<string, SectionAccessLevel>>

export const SYSTEM_MODULE_SECTIONS = {
  CRM: ['Resumen', 'Clientes', 'Proveedores', 'Empleados', 'Nómina', 'Oportunidades', 'Actividades'],
  Ventas: ['Catálogo', 'Cotizaciones', 'Pedidos', 'Facturas', 'Devoluciones', 'Resumen'],
  Compras: ['Resumen', 'Requisiciones', 'Órdenes de compra', 'Recepciones', 'Facturas', 'Devoluciones'],
  Operaciones: ['Inventario', 'Traslados', 'Compras', 'Entregas', 'Resumen'],
  Finanzas: ['Cobros', 'Pagos', 'Pagos Bancarios', 'Gastos', 'Cuentas contables', 'Resumen'],
  Reportes: ['Resumen ejecutivo', 'Finanzas y Tesorería', 'CxP y Pagos EBP', 'Ventas y CxC', 'Compras e Inventario', 'Nómina y RRHH'],
  Administración: [
    'Subsidiarias',
    'Departamentos',
    'Ubicaciones',
    'Flujos de devoluciones',
    'Resumen',
    'Historial de Auditoría',
  ],
  Configuración: [
    'General',
    'Organización',
    'Idioma y región',
    'Usuarios',
    'Roles y permisos',
    'Seguridad',
    'Apariencia',
    'Notificaciones',
    'Umbrales de stock',
    'Auditoría',
    'Integraciones',
    'Plan y facturación',
  ],
} as const

export type SystemModuleName = keyof typeof SYSTEM_MODULE_SECTIONS

export const SECTION_ACCESS_LEVELS: Array<{
  id: SectionAccessLevel
  rank: number
  label: string
  shortLabel: string
  description: string
  httpMethods: Array<'GET' | 'POST' | 'PUT' | 'DELETE'>
}> = [
  {
    id: 'none',
    rank: 0,
    label: 'Sin acceso',
    shortLabel: 'Sin acceso',
    description: 'Módulo o sección bloqueada y oculta',
    httpMethods: [],
  },
  {
    id: 'view',
    rank: 1,
    label: 'Ver',
    shortLabel: 'Ver',
    description: 'Visualizar registros (GET)',
    httpMethods: ['GET'],
  },
  {
    id: 'create',
    rank: 2,
    label: 'Crear',
    shortLabel: 'Crear',
    description: 'Puede crear y visualizar (GET · POST)',
    httpMethods: ['GET', 'POST'],
  },
  {
    id: 'edit',
    rank: 3,
    label: 'Editar',
    shortLabel: 'Editar',
    description: 'Hereda Ver + Crear y edita registros (GET · POST · PUT)',
    httpMethods: ['GET', 'POST', 'PUT'],
  },
  {
    id: 'full',
    rank: 4,
    label: 'Completo',
    shortLabel: 'Completo',
    description: 'Hace todo + borrar registros (GET · POST · PUT · DELETE)',
    httpMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
]

export const SECTION_LEVEL_RANK: Record<SectionAccessLevel, number> = {
  none: 0,
  view: 1,
  create: 2,
  edit: 3,
  full: 4,
}

export function maxSectionAccessLevel(
  a: SectionAccessLevel | undefined,
  b: SectionAccessLevel | undefined
): SectionAccessLevel {
  const levelA = a || 'none'
  const levelB = b || 'none'
  return SECTION_LEVEL_RANK[levelA] >= SECTION_LEVEL_RANK[levelB] ? levelA : levelB
}

export function levelAllowsHttpMethod(
  level: SectionAccessLevel | undefined,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
): boolean {
  const rank = SECTION_LEVEL_RANK[level || 'none']
  if (method === 'GET') return rank >= 1
  if (method === 'POST') return rank >= 2
  if (method === 'PUT') return rank >= 3
  return rank >= 4
}

function slugifySegment(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getSectionApiEndpoint(moduleName: string, sectionName: string): string {
  return `/api/v1/${slugifySegment(moduleName)}/${slugifySegment(sectionName)}`
}

export function buildSectionPermissionsMap(
  defaultLevel: SectionAccessLevel = 'none',
  overrides?: RoleSectionPermissions
): RoleSectionPermissions {
  const map: RoleSectionPermissions = {}
  for (const [mod, sections] of Object.entries(SYSTEM_MODULE_SECTIONS)) {
    map[mod] = {}
    const modOverrides = overrides?.[mod]
    for (const sec of sections) {
      map[mod][sec] = modOverrides?.[sec] ?? defaultLevel
    }
  }
  return map
}

export function cloneSectionPermissions(
  perms?: RoleSectionPermissions
): RoleSectionPermissions {
  return buildSectionPermissionsMap('none', perms)
}

export interface RoleDefinition {
  id: RoleKey
  name: string
  description: string
  capabilities: RoleCapabilityId[]
  sectionPermissions?: RoleSectionPermissions
  builtInKey?: 'admin' | 'ops' | 'sales' | 'fin'
  forApiIntegration?: boolean
}

export const ALL_CAPABILITIES: CapabilityDefinition[] = [
  { id: 'sysConfig', group: 'Administrador' },
  { id: 'manageUsers', group: 'Administrador' },
  { id: 'approvePurchases', group: 'Administrador' },
  { id: 'fullReports', group: 'Administrador' },
  { id: 'inventoryControl', group: 'Operaciones' },
  { id: 'adjustThresholds', group: 'Operaciones' },
  { id: 'receiveGoods', group: 'Operaciones' },
  { id: 'stockLedger', group: 'Operaciones' },
  { id: 'createQuotes', group: 'Ventas' },
  { id: 'issueOrders', group: 'Ventas' },
  { id: 'crmClients', group: 'Ventas' },
  { id: 'pipelineReports', group: 'Ventas' },
  { id: 'manageReceivables', group: 'Finanzas' },
  { id: 'schedulePayments', group: 'Finanzas' },
  { id: 'balanceReports', group: 'Finanzas' },
  { id: 'expenseControl', group: 'Finanzas' },
]

export const DEFAULT_ROLE_PERMISSIONS: Record<BuiltInRoleKey, RoleCapabilityId[]> = {
  Administrador: [
    'sysConfig',
    'manageUsers',
    'approvePurchases',
    'fullReports',
    'inventoryControl',
    'adjustThresholds',
    'receiveGoods',
    'stockLedger',
    'createQuotes',
    'issueOrders',
    'crmClients',
    'pipelineReports',
    'manageReceivables',
    'schedulePayments',
    'balanceReports',
    'expenseControl',
  ],
  Operaciones: ['inventoryControl', 'adjustThresholds', 'receiveGoods', 'stockLedger', 'approvePurchases'],
  Ventas: ['createQuotes', 'issueOrders', 'crmClients', 'pipelineReports'],
  Finanzas: ['manageReceivables', 'schedulePayments', 'balanceReports', 'expenseControl', 'fullReports'],
}

export const DEFAULT_ROLE_SECTION_PERMISSIONS: Record<BuiltInRoleKey, RoleSectionPermissions> = {
  Administrador: buildSectionPermissionsMap('full'),
  Operaciones: buildSectionPermissionsMap('none', {
    Compras: {
      Resumen: 'view',
      Requisiciones: 'create',
      'Órdenes de compra': 'edit',
      Recepciones: 'edit',
      Facturas: 'view',
      Devoluciones: 'edit',
    },
    Operaciones: {
      Inventario: 'edit',
      Traslados: 'edit',
      Compras: 'view',
      Entregas: 'edit',
      Resumen: 'view',
    },
    Reportes: {
      'Compras e Inventario': 'view',
    },
    Configuración: {
      'Idioma y región': 'edit',
      Apariencia: 'edit',
      Notificaciones: 'view',
      'Umbrales de stock': 'edit',
    },
  }),
  Ventas: buildSectionPermissionsMap('none', {
    CRM: {
      Resumen: 'view',
      Clientes: 'edit',
      Proveedores: 'view',
      Oportunidades: 'full',
      Actividades: 'full',
    },
    Ventas: {
      Catálogo: 'view',
      Cotizaciones: 'full',
      Pedidos: 'edit',
      Facturas: 'create',
      Devoluciones: 'edit',
      Resumen: 'view',
    },
    Reportes: {
      'Resumen ejecutivo': 'view',
      'Ventas y CxC': 'view',
    },
    Configuración: {
      'Idioma y región': 'edit',
      Apariencia: 'edit',
    },
  }),
  Finanzas: buildSectionPermissionsMap('none', {
    CRM: {
      Nómina: 'edit',
    },
    Compras: {
      Resumen: 'view',
      Facturas: 'edit',
      Devoluciones: 'view',
    },
    Finanzas: {
      Cobros: 'full',
      Pagos: 'full',
      'Pagos Bancarios': 'edit',
      Gastos: 'edit',
      'Cuentas contables': 'edit',
      Resumen: 'view',
    },
    Reportes: {
      'Resumen ejecutivo': 'view',
      'Finanzas y Tesorería': 'view',
      'CxP y Pagos EBP': 'view',
      'Nómina y RRHH': 'view',
    },
    Configuración: {
      'Idioma y región': 'edit',
      Apariencia: 'edit',
    },
  }),
}

const SECTION_TO_CAPABILITY_BRIDGE: Record<string, Record<string, RoleCapabilityId[]>> = {
  CRM: {
    Clientes: ['crmClients'],
    Proveedores: ['crmClients'],
    Empleados: ['manageUsers'],
    Nómina: ['schedulePayments'],
    Oportunidades: ['pipelineReports'],
    Actividades: ['crmClients'],
    Resumen: ['crmClients'],
  },
  Ventas: {
    Catálogo: ['createQuotes'],
    Cotizaciones: ['createQuotes'],
    Pedidos: ['issueOrders'],
    Facturas: ['issueOrders'],
    Devoluciones: ['issueOrders', 'receiveGoods'],
    Resumen: ['pipelineReports'],
  },
  Compras: {
    Resumen: ['approvePurchases'],
    Requisiciones: ['approvePurchases'],
    'Órdenes de compra': ['approvePurchases'],
    Recepciones: ['receiveGoods'],
    Facturas: ['approvePurchases'],
    Devoluciones: ['approvePurchases', 'receiveGoods'],
  },
  Operaciones: {
    Inventario: ['inventoryControl', 'stockLedger'],
    Traslados: ['inventoryControl'],
    Compras: ['approvePurchases'],
    Entregas: ['receiveGoods'],
    Resumen: ['inventoryControl'],
  },
  Finanzas: {
    Cobros: ['manageReceivables'],
    Pagos: ['schedulePayments'],
    'Pagos Bancarios': ['schedulePayments'],
    Gastos: ['expenseControl'],
    'Cuentas contables': ['balanceReports'],
    Resumen: ['balanceReports'],
  },
  Reportes: {
    'Resumen ejecutivo': ['fullReports'],
    'Finanzas y Tesorería': ['balanceReports'],
    'CxP y Pagos EBP': ['schedulePayments'],
    'Ventas y CxC': ['pipelineReports'],
    'Compras e Inventario': ['inventoryControl'],
    'Nómina y RRHH': ['manageUsers'],
  },
  Administración: {
    Subsidiarias: ['sysConfig'],
    Departamentos: ['sysConfig'],
    Ubicaciones: ['sysConfig'],
    'Flujos de devoluciones': ['sysConfig'],
    Resumen: ['sysConfig'],
    'Historial de Auditoría': ['fullReports'],
  },
  Configuración: {
    General: ['sysConfig'],
    Organización: ['sysConfig'],
    Usuarios: ['manageUsers'],
    'Roles y permisos': ['manageUsers'],
    Seguridad: ['sysConfig'],
    Notificaciones: ['adjustThresholds'],
    'Umbrales de stock': ['adjustThresholds', 'sysConfig'],
    Auditoría: ['sysConfig'],
    Integraciones: ['sysConfig'],
    'Plan y facturación': ['sysConfig'],
  },
}

export function deriveCapabilitiesFromSectionPermissions(
  perms: RoleSectionPermissions
): RoleCapabilityId[] {
  const caps = new Set<RoleCapabilityId>()
  for (const [mod, sections] of Object.entries(perms)) {
    for (const [sec, level] of Object.entries(sections)) {
      if (level === 'none') continue
      const mapped = SECTION_TO_CAPABILITY_BRIDGE[mod]?.[sec] || []
      for (const cap of mapped) caps.add(cap)
    }
  }
  return Array.from(caps)
}

export function deriveSectionPermissionsFromCapabilities(
  caps: RoleCapabilityId[],
  builtInKey?: 'admin' | 'ops' | 'sales' | 'fin'
): RoleSectionPermissions {
  if (builtInKey === 'admin') return cloneSectionPermissions(DEFAULT_ROLE_SECTION_PERMISSIONS.Administrador)
  if (builtInKey === 'ops') return cloneSectionPermissions(DEFAULT_ROLE_SECTION_PERMISSIONS.Operaciones)
  if (builtInKey === 'sales') return cloneSectionPermissions(DEFAULT_ROLE_SECTION_PERMISSIONS.Ventas)
  if (builtInKey === 'fin') return cloneSectionPermissions(DEFAULT_ROLE_SECTION_PERMISSIONS.Finanzas)

  const capSet = new Set(caps)
  const result = buildSectionPermissionsMap('none')
  for (const [mod, secMap] of Object.entries(SECTION_TO_CAPABILITY_BRIDGE)) {
    for (const [sec, reqCaps] of Object.entries(secMap)) {
      if (reqCaps.some((c) => capSet.has(c))) {
        result[mod][sec] = 'edit'
      }
    }
  }
  result.Configuración['Idioma y región'] = 'edit'
  result.Configuración.Apariencia = 'edit'
  return result
}

export const ECOMMERCE_INTEGRATION_SECTION_PERMISSIONS = buildSectionPermissionsMap('none', {
  CRM: {
    Clientes: 'edit',
  },
  Ventas: {
    Catálogo: 'view',
    Cotizaciones: 'create',
    Pedidos: 'create',
    Facturas: 'view',
  },
  Operaciones: {
    Inventario: 'edit',
    Entregas: 'create',
  },
})

export const DEFAULT_ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    id: 'Administrador',
    name: 'Administrador General',
    description: 'Control total de la configuración, usuarios, facturación, auditorías y módulos.',
    capabilities: [...DEFAULT_ROLE_PERMISSIONS.Administrador],
    sectionPermissions: cloneSectionPermissions(DEFAULT_ROLE_SECTION_PERMISSIONS.Administrador),
    builtInKey: 'admin',
  },
  {
    id: 'Operaciones',
    name: 'Gerencia de Operaciones',
    description: 'Gestión integral de almacenes, existencias mínimas, recepciones y transferencias.',
    capabilities: [...DEFAULT_ROLE_PERMISSIONS.Operaciones],
    sectionPermissions: cloneSectionPermissions(DEFAULT_ROLE_SECTION_PERMISSIONS.Operaciones),
    builtInKey: 'ops',
  },
  {
    id: 'Ventas',
    name: 'Equipo Comercial & Ventas',
    description: 'Administración del catálogo, cotizaciones, órdenes de venta y seguimiento en CRM.',
    capabilities: [...DEFAULT_ROLE_PERMISSIONS.Ventas],
    sectionPermissions: cloneSectionPermissions(DEFAULT_ROLE_SECTION_PERMISSIONS.Ventas),
    builtInKey: 'sales',
  },
  {
    id: 'Finanzas',
    name: 'Finanzas & Contabilidad',
    description: 'Conciliación bancaria, cuentas por cobrar, pagos a proveedores y flujo de caja.',
    capabilities: [...DEFAULT_ROLE_PERMISSIONS.Finanzas],
    sectionPermissions: cloneSectionPermissions(DEFAULT_ROLE_SECTION_PERMISSIONS.Finanzas),
    builtInKey: 'fin',
  },
  {
    id: 'role_integracion_ecommerce',
    name: 'Conector Ecommerce API',
    description: 'Rol operativo exclusivo para sincronización externa de catálogo, clientes, pedidos e inventario sin consumir usuario.',
    capabilities: deriveCapabilitiesFromSectionPermissions(ECOMMERCE_INTEGRATION_SECTION_PERMISSIONS),
    sectionPermissions: cloneSectionPermissions(ECOMMERCE_INTEGRATION_SECTION_PERMISSIONS),
  },
]

export type IntegrationId = 'cfdi' | 'spei' | 'workspace' | 'webhooks'

export interface IntegrationConfig {
  id: IntegrationId
  enabled: boolean
  environment: 'production' | 'sandbox'
  endpointOrAccount: string
  credentialMask: string
  syncMode: 'realtime' | '15m' | 'hourly'
  lastSyncAt: string
}

export const DEFAULT_INTEGRATIONS: IntegrationConfig[] = [
  {
    id: 'cfdi',
    enabled: true,
    environment: 'production',
    endpointOrAccount: 'https://pac-timbrado.aesnexus.mx/v4/stamp',
    credentialMask: 'csd_live_••••••••8N2',
    syncMode: 'realtime',
    lastSyncAt: '2026-11-15T10:05:00.000Z',
  },
  {
    id: 'spei',
    enabled: true,
    environment: 'production',
    endpointOrAccount: 'CLABE 646180157000482190 · STP México',
    credentialMask: 'stp_key_••••••••91A',
    syncMode: 'realtime',
    lastSyncAt: '2026-11-15T09:50:00.000Z',
  },
  {
    id: 'workspace',
    enabled: true,
    environment: 'production',
    endpointOrAccount: 'notificaciones@brujulaestudio.mx',
    credentialMask: 'oauth_gw_••••••••34F',
    syncMode: '15m',
    lastSyncAt: '2026-11-15T09:30:00.000Z',
  },
  {
    id: 'webhooks',
    enabled: false,
    environment: 'sandbox',
    endpointOrAccount: 'https://api.brujulaestudio.mx/webhooks/inventory',
    credentialMask: 'whsec_••••••••77C',
    syncMode: 'realtime',
    lastSyncAt: '',
  },
]

export type ExternalApiAction = 'read' | 'create' | 'update' | 'delete'

export type ExternalApiResource =
  | 'clientes'
  | 'productos'
  | 'ventas'
  | 'compras'
  | 'finanzas'
  | 'rrhh'

export type ExternalSystemType =
  | 'Ecommerce'
  | 'BI / Analítica'
  | 'Contabilidad Externa'
  | 'WMS / Logística'
  | 'Webhook / Middleware'
  | 'ERP / Legacy'
  | 'Otro'

export interface ExternalIntegrationLog {
  id: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  resource: ExternalApiResource
  moduleName?: string
  sectionName?: string
  endpoint?: string
  statusCode: 200 | 201 | 400 | 401 | 403 | 404 | 429 | 500
  latencyMs?: number
  summary: string
  responsePayload?: string
  timestampIso: string
}

export interface ExternalIntegrationRecord {
  id: string
  name: string
  systemType: ExternalSystemType
  origin?: 'commercial' | 'custom'
  description: string
  environment: 'production' | 'sandbox'
  status: 'active' | 'paused' | 'revoked'
  roleId: RoleKey
  apiKeyPrefix: string
  apiKeySecret: string
  webhookCallbackUrl: string
  ipAllowlist: string
  rateLimitPerMin: number
  permissions: Record<ExternalApiResource, ExternalApiAction[]>
  createdAtIso: string
  lastUsedAtIso: string
  requestsCount: number
  recentLogs: ExternalIntegrationLog[]
}

export const EXTERNAL_API_RESOURCES: Array<{
  id: ExternalApiResource
  label: string
  endpoint: string
  description: string
}> = [
  {
    id: 'clientes',
    label: 'Clientes & CRM',
    endpoint: '/api/v1/clientes',
    description: 'Directorio fiscal, contactos, crédito y direcciones',
  },
  {
    id: 'productos',
    label: 'Productos & Inventario',
    endpoint: '/api/v1/productos',
    description: 'Catálogo SKU, precios, costos y existencias por almacén',
  },
  {
    id: 'ventas',
    label: 'Ventas & Pedidos',
    endpoint: '/api/v1/ventas',
    description: 'Cotizaciones, órdenes de venta y estatus de despacho',
  },
  {
    id: 'compras',
    label: 'Compras & Proveedores',
    endpoint: '/api/v1/compras',
    description: 'Órdenes de compra, recepciones y cuentas bancarias',
  },
  {
    id: 'finanzas',
    label: 'Finanzas & Tesorería',
    endpoint: '/api/v1/finanzas',
    description: 'Pólizas, CxC, CxP y conciliación bancaria',
  },
  {
    id: 'rrhh',
    label: 'RRHH & Nómina',
    endpoint: '/api/v1/rrhh',
    description: 'Plantilla, departamentos e incidencias',
  },
]

export const EXTERNAL_API_ACTIONS: Array<{
  id: ExternalApiAction
  label: string
  httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE'
  shortTag: string
}> = [
  { id: 'read', label: 'Consultar', httpMethod: 'GET', shortTag: 'GET' },
  { id: 'create', label: 'Insertar', httpMethod: 'POST', shortTag: 'POST' },
  { id: 'update', label: 'Editar', httpMethod: 'PUT', shortTag: 'PUT' },
  { id: 'delete', label: 'Borrar', httpMethod: 'DELETE', shortTag: 'DEL' },
]

export const EMPTY_EXTERNAL_PERMISSIONS: Record<ExternalApiResource, ExternalApiAction[]> = {
  clientes: [],
  productos: [],
  ventas: [],
  compras: [],
  finanzas: [],
  rrhh: [],
}

export function generateExternalApiKey(environment: 'production' | 'sandbox'): {
  apiKeyPrefix: string
  apiKeySecret: string
} {
  const envTag = environment === 'production' ? 'live' : 'sbx'
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  let token = ''
  for (let i = 0; i < 28; i += 1) {
    token += chars[Math.floor(Math.random() * chars.length)]
  }
  const secret = `nexus_${envTag}_${token}`
  return {
    apiKeyPrefix: secret.slice(0, 14),
    apiKeySecret: secret,
  }
}

export type CommercialSyncInterval =
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '6h'
  | '24h'
  | 'manual'

export type CommercialCategory = 'PAC Fiscal' | 'Ecommerce' | 'Banca & Pagos' | 'Productividad'

export const COMMERCIAL_SYNC_INTERVALS: Array<{
  id: CommercialSyncInterval
  label: string
  shortLabel: string
}> = [
  { id: '5m', label: 'Cada 5 minutos', shortLabel: 'Cada 5 min' },
  { id: '15m', label: 'Cada 15 minutos', shortLabel: 'Cada 15 min' },
  { id: '30m', label: 'Cada 30 minutos', shortLabel: 'Cada 30 min' },
  { id: '1h', label: 'Cada 1 hora', shortLabel: 'Cada 1 h' },
  { id: '6h', label: 'Cada 6 horas', shortLabel: 'Cada 6 h' },
  { id: '24h', label: 'Cada 24 horas (Diario)', shortLabel: 'Diario' },
  { id: 'manual', label: 'Manual / Bajo demanda', shortLabel: 'Manual' },
]

export interface CommercialMarketplaceApp {
  id: string
  name: string
  vendor: string
  category: CommercialCategory
  brandCode: string
  brandColor: string
  brandBg: string
  description: string
  authMethodLabel: string
  dataSyncedLabel: string
  endpointLabel: string
  endpointPlaceholder: string
  apiKeyLabel: string
  apiKeyPlaceholder: string
  apiSecretLabel: string
  apiSecretPlaceholder: string
  defaultSyncInterval: CommercialSyncInterval
  sampleOutboundEndpoint: string
  sampleOutboundPayload: Record<string, unknown>
}

export interface CommercialIntegrationRecord {
  id: string
  marketplaceId: string
  name: string
  vendor: string
  category: CommercialCategory
  description: string
  enabled: boolean
  environment: 'production' | 'sandbox'
  syncInterval: CommercialSyncInterval
  endpointLabel: string
  endpointUrl: string
  apiKeyLabel: string
  apiKey: string
  apiSecretLabel: string
  apiSecret: string
  dataSyncedLabel: string
  lastSyncAtIso: string
  lastSyncStatus: 'idle' | 'success' | 'error'
  installedAtIso: string
  recentLogs: ExternalIntegrationLog[]
}

export const COMMERCIAL_MARKETPLACE_CATALOG: CommercialMarketplaceApp[] = [
  {
    id: 'mkt_shopify',
    name: 'Shopify',
    vendor: 'Shopify Inc.',
    category: 'Ecommerce',
    brandCode: 'SH',
    brandColor: '#4c7c22',
    brandBg: '#edf6e3',
    description:
      'AES Nexus consulta periódicamente pedidos, catálogo de productos, existencias y altas de clientes desde tu tienda Shopify.',
    authMethodLabel: 'Admin API Access Token',
    dataSyncedLabel: 'Pedidos, SKUs, Inventario y Clientes',
    endpointLabel: 'URL de tienda Shopify',
    endpointPlaceholder: 'https://mi-tienda.myshopify.com',
    apiKeyLabel: 'API Key / Client ID',
    apiKeyPlaceholder: 'shp_client_92a8c...',
    apiSecretLabel: 'Admin API Access Token',
    apiSecretPlaceholder: 'shpat_xxxxxxxxxxxxxxxxxxxxx',
    defaultSyncInterval: '15m',
    sampleOutboundEndpoint: 'GET https://mi-tienda.myshopify.com/admin/api/2026-01/orders.json',
    sampleOutboundPayload: {
      ok: true,
      direction: 'outbound_poll',
      provider: 'Shopify',
      importedOrders: 14,
      syncedSkus: 42,
      newCustomers: 5,
    },
  },
  {
    id: 'mkt_woocommerce',
    name: 'WooCommerce',
    vendor: 'Automattic / WordPress',
    category: 'Ecommerce',
    brandCode: 'WC',
    brandColor: '#6d3fb3',
    brandBg: '#f1eafb',
    description:
      'Extracción programada de órdenes de compra, precios y stock desde tu tienda WordPress + WooCommerce.',
    authMethodLabel: 'Consumer Key + Consumer Secret',
    dataSyncedLabel: 'Pedidos, Productos y Clientes',
    endpointLabel: 'URL de tienda WordPress',
    endpointPlaceholder: 'https://tienda.midominio.mx',
    apiKeyLabel: 'Consumer Key',
    apiKeyPlaceholder: 'ck_4f9b2e...',
    apiSecretLabel: 'Consumer Secret',
    apiSecretPlaceholder: 'cs_81c3a7...',
    defaultSyncInterval: '30m',
    sampleOutboundEndpoint: 'GET https://tienda.midominio.mx/wp-json/wc/v3/orders',
    sampleOutboundPayload: {
      ok: true,
      direction: 'outbound_poll',
      provider: 'WooCommerce',
      ordersImported: 6,
      productsSynced: 64,
    },
  },
  {
    id: 'mkt_mercadolibre',
    name: 'Mercado Libre',
    vendor: 'Mercado Libre México',
    category: 'Ecommerce',
    brandCode: 'ML',
    brandColor: '#27439c',
    brandBg: '#fcf6dc',
    description:
      'Consulta automática de ventas confirmadas, publicaciones, stock disponible y mensajería postventa.',
    authMethodLabel: 'OAuth Client ID + Secret',
    dataSyncedLabel: 'Órdenes, Publicaciones y Stock',
    endpointLabel: 'Endpoint API / Seller ID',
    endpointPlaceholder: 'https://api.mercadolibre.com/users/MLM-482910',
    apiKeyLabel: 'App ID (Client ID)',
    apiKeyPlaceholder: '7829104562819',
    apiSecretLabel: 'Client Secret / Refresh Token',
    apiSecretPlaceholder: 'TG-67f891a2c...',
    defaultSyncInterval: '15m',
    sampleOutboundEndpoint: 'GET https://api.mercadolibre.com/orders/search?seller=MLM-482910',
    sampleOutboundPayload: {
      ok: true,
      direction: 'outbound_poll',
      provider: 'Mercado Libre',
      ordersFetched: 9,
      publicationsChecked: 118,
    },
  },
  {
    id: 'mkt_amazon',
    name: 'Amazon Seller Central',
    vendor: 'Amazon SP-API',
    category: 'Ecommerce',
    brandCode: 'AZ',
    brandColor: '#a65d03',
    brandBg: '#fdf2df',
    description:
      'Consulta de órdenes FBA/FBM, reportes de inventario y liquidaciones desde Amazon Selling Partner API.',
    authMethodLabel: 'LWA Client ID + Refresh Token',
    dataSyncedLabel: 'Órdenes FBA/FBM e Inventario',
    endpointLabel: 'Endpoint Regional / Marketplace ID',
    endpointPlaceholder: 'https://sellingpartnerapi-na.amazon.com (A1AM78C64UM0Y8)',
    apiKeyLabel: 'LWA Client ID',
    apiKeyPlaceholder: 'amzn1.application-oa2-client...',
    apiSecretLabel: 'LWA Refresh Token',
    apiSecretPlaceholder: 'Atzr|IwEBIA...',
    defaultSyncInterval: '1h',
    sampleOutboundEndpoint: 'GET https://sellingpartnerapi-na.amazon.com/orders/v0/orders',
    sampleOutboundPayload: {
      ok: true,
      direction: 'outbound_poll',
      provider: 'Amazon SP-API',
      marketplace: 'MX (A1AM78C64UM0Y8)',
      ordersSynced: 11,
    },
  },
  {
    id: 'mkt_finkok_pac',
    name: 'Finkok PAC CFDI 4.0',
    vendor: 'Finkok SAPI de CV',
    category: 'PAC Fiscal',
    brandCode: 'FK',
    brandColor: '#1f53a4',
    brandBg: '#eaf1fc',
    description:
      'Consulta y timbrado de CFDI 4.0, descarga de acuses SAT, validaciones de RFC y cancelaciones.',
    authMethodLabel: 'Usuario PAC + Contraseña',
    dataSyncedLabel: 'Estatus CFDI 4.0, Acuses SAT y Timbres',
    endpointLabel: 'URL Webservice PAC',
    endpointPlaceholder: 'https://facturacion.finkok.com/servicios/soap/stamp',
    apiKeyLabel: 'Usuario PAC',
    apiKeyPlaceholder: 'facturacion@brujulaestudio.mx',
    apiSecretLabel: 'Contraseña / Llave PAC',
    apiSecretPlaceholder: 'fkk_live_••••••••',
    defaultSyncInterval: '15m',
    sampleOutboundEndpoint: 'POST https://facturacion.finkok.com/servicios/soap/utilities/status',
    sampleOutboundPayload: {
      ok: true,
      direction: 'outbound_poll',
      provider: 'Finkok PAC',
      cfdisVerified: 18,
      satStatus: 'Vigente',
    },
  },
  {
    id: 'mkt_sw_sapien_pac',
    name: 'SW Sapien PAC',
    vendor: 'Smarter Web PAC',
    category: 'PAC Fiscal',
    brandCode: 'SW',
    brandColor: '#0c6b93',
    brandBg: '#e5f5fb',
    description:
      'Integración con PAC autorizado SAT para timbrado, verificación de estatus y consulta de saldo de timbres.',
    authMethodLabel: 'Usuario + Token Bearer PAC',
    dataSyncedLabel: 'Timbres, Cancelaciones y Acuses',
    endpointLabel: 'Endpoint API REST',
    endpointPlaceholder: 'https://services.sw.com.mx',
    apiKeyLabel: 'Usuario / RFC Emisor',
    apiKeyPlaceholder: 'BES1904128A1',
    apiSecretLabel: 'Token de acceso PAC',
    apiSecretPlaceholder: 'sw_live_token_••••••••',
    defaultSyncInterval: '15m',
    sampleOutboundEndpoint: 'GET https://services.sw.com.mx/account/balance',
    sampleOutboundPayload: {
      ok: true,
      direction: 'outbound_poll',
      provider: 'SW Sapien PAC',
      availableStamps: 4820,
    },
  },
  {
    id: 'mkt_facturama_pac',
    name: 'Facturama PAC',
    vendor: 'Facturama',
    category: 'PAC Fiscal',
    brandCode: 'FA',
    brandColor: '#1b6d48',
    brandBg: '#e8f6ef',
    description:
      'Consulta periódica de comprobantes emitidos, descarga XML/PDF y conciliación fiscal automática.',
    authMethodLabel: 'Usuario API + Contraseña',
    dataSyncedLabel: 'CFDIs emitidos y XML/PDF',
    endpointLabel: 'URL API Facturama',
    endpointPlaceholder: 'https://api.facturama.mx',
    apiKeyLabel: 'Usuario API',
    apiKeyPlaceholder: 'nexus_facturama',
    apiSecretLabel: 'Contraseña API',
    apiSecretPlaceholder: '••••••••••••',
    defaultSyncInterval: '1h',
    sampleOutboundEndpoint: 'GET https://api.facturama.mx/cfdi?type=issued',
    sampleOutboundPayload: {
      ok: true,
      direction: 'outbound_poll',
      provider: 'Facturama PAC',
      documentsFetched: 23,
    },
  },
  {
    id: 'mkt_stp_spei',
    name: 'STP · Dispersión SPEI',
    vendor: 'Sistema de Transferencias y Pagos',
    category: 'Banca & Pagos',
    brandCode: 'ST',
    brandColor: '#0f6860',
    brandBg: '#e6f5f3',
    description:
      'AES Nexus consulta movimientos entrantes, saldos de cuenta concentradora y rastreo de órdenes SPEI.',
    authMethodLabel: 'Empresa STP + Llave privada',
    dataSyncedLabel: 'Movimientos bancarios, Saldos y Rastreo',
    endpointLabel: 'Endpoint STP / Cuenta CLABE',
    endpointPlaceholder: 'https://efws-dev.stpmex.com · CLABE 646180157000482190',
    apiKeyLabel: 'Empresa / Prefijo STP',
    apiKeyPlaceholder: 'BRUJULAESTUDIO',
    apiSecretLabel: 'Llave privada / Passphrase',
    apiSecretPlaceholder: 'stp_key_••••••••',
    defaultSyncInterval: '5m',
    sampleOutboundEndpoint: 'POST https://prod.stpmex.com/speiws/rest/ordenPago/consultaConciliacion',
    sampleOutboundPayload: {
      ok: true,
      direction: 'outbound_poll',
      provider: 'STP SPEI',
      settledTransfers: 7,
      reconciledMxn: 194320.5,
    },
  },
  {
    id: 'mkt_google_workspace',
    name: 'Google Workspace / Gmail API',
    vendor: 'Google Cloud',
    category: 'Productividad',
    brandCode: 'GW',
    brandColor: '#b3382c',
    brandBg: '#fceceb',
    description:
      'Sincroniza notificaciones fiscales, envío de estados de cuenta y respaldos automáticos en Drive.',
    authMethodLabel: 'OAuth 2.0 Client ID + Token',
    dataSyncedLabel: 'Correos, Acuses y Respaldos Drive',
    endpointLabel: 'Cuenta corporativa Workspace',
    endpointPlaceholder: 'notificaciones@brujulaestudio.mx',
    apiKeyLabel: 'OAuth Client ID',
    apiKeyPlaceholder: '8492019283-abc.apps.googleusercontent.com',
    apiSecretLabel: 'Refresh Token / Secret',
    apiSecretPlaceholder: 'oauth_gw_••••••••',
    defaultSyncInterval: '30m',
    sampleOutboundEndpoint: 'GET https://gmail.googleapis.com/gmail/v1/users/me/messages',
    sampleOutboundPayload: {
      ok: true,
      direction: 'outbound_poll',
      provider: 'Google Workspace',
      threadsSynced: 12,
    },
  },
]

export const DEFAULT_COMMERCIAL_INTEGRATIONS: CommercialIntegrationRecord[] = [
  {
    id: 'comm_finkok_pac',
    marketplaceId: 'mkt_finkok_pac',
    name: 'Finkok PAC CFDI 4.0',
    vendor: 'Finkok SAPI de CV',
    category: 'PAC Fiscal',
    description:
      'Consulta y timbrado de CFDI 4.0, descarga de acuses SAT, validaciones de RFC y cancelaciones.',
    enabled: true,
    environment: 'production',
    syncInterval: '15m',
    endpointLabel: 'URL Webservice PAC',
    endpointUrl: 'https://facturacion.finkok.com/servicios/soap/stamp',
    apiKeyLabel: 'Usuario PAC',
    apiKey: 'facturacion@brujulaestudio.mx',
    apiSecretLabel: 'Contraseña / Llave PAC',
    apiSecret: 'fkk_live_98Kp2VmQ7RtN',
    dataSyncedLabel: 'Estatus CFDI 4.0, Acuses SAT y Timbres',
    lastSyncAtIso: '2026-11-16T14:20:00.000Z',
    lastSyncStatus: 'success',
    installedAtIso: '2026-09-10T09:00:00.000Z',
    recentLogs: [
      {
        id: 'log_comm_seed_1',
        method: 'GET',
        resource: 'finanzas',
        moduleName: 'PAC Fiscal',
        sectionName: 'Finkok PAC CFDI 4.0',
        endpoint: 'https://facturacion.finkok.com/servicios/soap/utilities/status',
        statusCode: 200,
        latencyMs: 64,
        summary: 'Consulta programada cada 15 min: 18 CFDIs verificados ante el SAT',
        responsePayload: JSON.stringify(
          {
            ok: true,
            direction: 'outbound_poll',
            provider: 'Finkok PAC CFDI 4.0',
            cfdisVerified: 18,
            satStatus: 'Vigente',
            polledAt: '2026-11-16T14:20:00.000Z',
          },
          null,
          2
        ),
        timestampIso: '2026-11-16T14:20:00.000Z',
      },
    ],
  },
  {
    id: 'comm_stp_spei',
    marketplaceId: 'mkt_stp_spei',
    name: 'STP · Dispersión SPEI',
    vendor: 'Sistema de Transferencias y Pagos',
    category: 'Banca & Pagos',
    description:
      'AES Nexus consulta movimientos entrantes, saldos de cuenta concentradora y rastreo de órdenes SPEI.',
    enabled: true,
    environment: 'production',
    syncInterval: '5m',
    endpointLabel: 'Endpoint STP / Cuenta CLABE',
    endpointUrl: 'https://prod.stpmex.com/speiws/rest · CLABE 646180157000482190',
    apiKeyLabel: 'Empresa / Prefijo STP',
    apiKey: 'BRUJULAESTUDIO',
    apiSecretLabel: 'Llave privada / Passphrase',
    apiSecret: 'stp_live_4Tx71MnPq91A',
    dataSyncedLabel: 'Movimientos bancarios, Saldos y Rastreo',
    lastSyncAtIso: '2026-11-16T14:15:00.000Z',
    lastSyncStatus: 'success',
    installedAtIso: '2026-09-14T11:30:00.000Z',
    recentLogs: [
      {
        id: 'log_comm_seed_2',
        method: 'GET',
        resource: 'finanzas',
        moduleName: 'Banca & Pagos',
        sectionName: 'STP · Dispersión SPEI',
        endpoint: 'https://prod.stpmex.com/speiws/rest/ordenPago/consultaConciliacion',
        statusCode: 200,
        latencyMs: 51,
        summary: 'Consulta automática cada 5 min: 7 abonos SPEI conciliados ($194,320.50 MXN)',
        responsePayload: JSON.stringify(
          {
            ok: true,
            direction: 'outbound_poll',
            provider: 'STP · Dispersión SPEI',
            settledTransfers: 7,
            reconciledMxn: 194320.5,
            polledAt: '2026-11-16T14:15:00.000Z',
          },
          null,
          2
        ),
        timestampIso: '2026-11-16T14:15:00.000Z',
      },
    ],
  },
]

export const DEFAULT_EXTERNAL_INTEGRATIONS: ExternalIntegrationRecord[] = [
  {
    id: 'ext_powerbi_dwh',
    name: 'Conector Power BI / Data Warehouse',
    systemType: 'BI / Analítica',
    origin: 'custom',
    description: 'Extracción programada vinculada al rol de Finanzas & Contabilidad sin consumir licencia de usuario.',
    environment: 'production',
    status: 'active',
    roleId: 'Finanzas',
    apiKeyPrefix: 'nexus_live_4Tx',
    apiKeySecret: 'nexus_live_4Tx71MnPq8WvZ2yK9HcR3BgF5EsU',
    webhookCallbackUrl: '',
    ipAllowlist: '189.204.112.44',
    rateLimitPerMin: 120,
    permissions: {
      clientes: ['read'],
      productos: ['read'],
      ventas: ['read'],
      compras: ['read'],
      finanzas: ['read'],
      rrhh: ['read'],
    },
    createdAtIso: '2026-10-03T16:40:00.000Z',
    lastUsedAtIso: '2026-11-16T12:00:00.000Z',
    requestsCount: 5390,
    recentLogs: [
      {
        id: 'log_seed_3',
        method: 'GET',
        resource: 'finanzas',
        moduleName: 'Reportes',
        sectionName: 'Finanzas y Tesorería',
        endpoint: '/api/v1/reportes/finanzas-y-tesoreria',
        statusCode: 200,
        latencyMs: 61,
        summary: 'Consulta paginada de pólizas y flujo mensual (250 registros)',
        responsePayload: JSON.stringify(
          {
            ok: true,
            page: 1,
            pageSize: 250,
            totalRecords: 1420,
            currency: 'MXN',
            extractedAt: '2026-11-16T12:00:00.000Z',
          },
          null,
          2
        ),
        timestampIso: '2026-11-16T12:00:00.000Z',
      },
    ],
  },
  {
    id: 'ext_wms_sandbox',
    name: 'Middleware Logístico 3PL (Pruebas)',
    systemType: 'WMS / Logística',
    origin: 'custom',
    description: 'Integración de pruebas vinculada al rol Gerencia de Operaciones para surtido y recepciones.',
    environment: 'sandbox',
    status: 'paused',
    roleId: 'Operaciones',
    apiKeyPrefix: 'nexus_sbx_6Mn',
    apiKeySecret: 'nexus_sbx_6Mn29QrLp5ZtW8vD4JkY7ChG1NxB',
    webhookCallbackUrl: 'https://sandbox.logistica3pl.mx/nexus/callback',
    ipAllowlist: '',
    rateLimitPerMin: 60,
    permissions: {
      clientes: ['read'],
      productos: ['read', 'create', 'update', 'delete'],
      ventas: ['read', 'update'],
      compras: ['read', 'create'],
      finanzas: [],
      rrhh: [],
    },
    createdAtIso: '2026-11-01T09:05:00.000Z',
    lastUsedAtIso: '2026-11-15T09:30:00.000Z',
    requestsCount: 412,
    recentLogs: [
      {
        id: 'log_seed_6',
        method: 'POST',
        resource: 'compras',
        moduleName: 'Compras',
        sectionName: 'Órdenes de compra',
        endpoint: '/api/v1/compras/ordenes-de-compra',
        statusCode: 403,
        latencyMs: 14,
        summary: 'Llamada bloqueada: la integración Sandbox está pausada temporalmente',
        responsePayload: JSON.stringify(
          {
            ok: false,
            error: 'INTEGRATION_PAUSED',
            environment: 'sandbox',
            message:
              'La integración "Middleware Logístico 3PL (Pruebas)" está pausada y no acepta escrituras.',
          },
          null,
          2
        ),
        timestampIso: '2026-11-15T09:30:00.000Z',
      },
      {
        id: 'log_seed_4',
        method: 'PUT',
        resource: 'productos',
        moduleName: 'Operaciones',
        sectionName: 'Inventario',
        endpoint: '/api/v1/operaciones/inventario',
        statusCode: 200,
        latencyMs: 49,
        summary: 'Ajuste de inventario en Almacén Vallejo vía API',
        responsePayload: JSON.stringify(
          {
            ok: true,
            operation: 'UPDATE',
            warehouse: 'Almacén Vallejo',
            adjustedItems: 12,
            reference: '3PL-ADJ-409',
            updatedAt: '2026-11-14T18:10:00.000Z',
          },
          null,
          2
        ),
        timestampIso: '2026-11-14T18:10:00.000Z',
      },
    ],
  },
]

export type AuditCategory =
  | 'settings'
  | 'users'
  | 'security'
  | 'session'
  | 'integrations'
  | 'inventory'
  | 'sales'
  | 'finance'
  | 'admin'

export interface AuditSessionMeta {
  roleLabel: string
  ipAddress: string
  deviceBrowser: string
}

export type AuditCrudOperation = 'CREATE' | 'UPDATE' | 'DELETE'

export interface AuditEventRecord {
  id: string
  category: AuditCategory
  action: string
  detail: string
  user: string
  userId?: string
  crudOperation?: AuditCrudOperation
  entityType?: string
  entityId?: string
  timestampIso: string
  seedKey?: 'ev1' | 'ev2' | 'ev3' | 'ev4'
  sessionMeta?: AuditSessionMeta
}

export const INITIAL_AUDIT_EVENTS: AuditEventRecord[] = [
  {
    id: 'aud_seed_login1',
    category: 'session',
    action: 'Inicio de sesión en el ambiente',
    detail: 'Acceso confirmado con perfil Administrador General · IP 189.204.112.44 · MacBook / macOS · Chrome 131',
    user: 'Andrea Morales Escala',
    timestampIso: '2026-11-16T14:05:00.000Z',
    sessionMeta: {
      roleLabel: 'Administrador General, Finanzas & Contabilidad, Gerencia de Operaciones',
      ipAddress: '189.204.112.44',
      deviceBrowser: 'MacBook / macOS · Chrome 131',
    },
  },
  {
    id: 'aud_seed_inv1',
    category: 'sales',
    action: 'Creación de factura de venta',
    detail: 'Folio FAC-2026-041 · Estudio Nómada · $92,800 MXN',
    user: 'Sofía Valenzuela Treviño',
    timestampIso: '2026-11-16T13:15:00.000Z',
  },
  {
    id: 'aud_seed_login2',
    category: 'session',
    action: 'Inicio de sesión en el ambiente',
    detail: 'Acceso confirmado con perfil Equipo Comercial & Ventas · IP 201.141.78.92 · iPhone (iOS) · Safari Mobile',
    user: 'Sofía Valenzuela Treviño',
    timestampIso: '2026-11-16T12:48:00.000Z',
    sessionMeta: {
      roleLabel: 'Equipo Comercial & Ventas',
      ipAddress: '201.141.78.92',
      deviceBrowser: 'iPhone (iOS) · Safari Mobile',
    },
  },
  {
    id: 'aud_seed_role1',
    category: 'users',
    action: 'Actualización de permisos de rol',
    detail: 'Gerencia de Operaciones · 5 permisos activos (Aprobación de compras habilitada)',
    user: 'Andrea Morales Escala',
    timestampIso: '2026-11-16T11:30:00.000Z',
  },
  {
    id: 'aud_seed_login3',
    category: 'session',
    action: 'Inicio de sesión en el ambiente',
    detail: 'Acceso confirmado con perfil Gerencia de Operaciones · IP 187.188.42.18 · Windows PC · Edge 130',
    user: 'Carlos Mendoza Ríos',
    timestampIso: '2026-11-16T08:15:00.000Z',
    sessionMeta: {
      roleLabel: 'Gerencia de Operaciones',
      ipAddress: '187.188.42.18',
      deviceBrowser: 'Windows PC · Edge 130',
    },
  },
  {
    id: 'aud_seed_fin1',
    category: 'finance',
    action: 'Dispersión bancaria aplicada (EBP)',
    detail: 'Lote EBP-2026-014 aplicado en banco BBVA · $124,500 MXN',
    user: 'Roberto Garza Hinojosa',
    timestampIso: '2026-11-15T17:45:00.000Z',
  },
  {
    id: 'aud_seed_login4',
    category: 'session',
    action: 'Inicio de sesión en el ambiente',
    detail: 'Acceso confirmado con perfil Finanzas & Contabilidad · IP 189.156.91.105 · Windows PC · Chrome 131',
    user: 'Roberto Garza Hinojosa',
    timestampIso: '2026-11-15T16:20:00.000Z',
    sessionMeta: {
      roleLabel: 'Finanzas & Contabilidad',
      ipAddress: '189.156.91.105',
      deviceBrowser: 'Windows PC · Chrome 131',
    },
  },
  {
    id: 'aud_seed_1',
    category: 'inventory',
    action: 'Actualización de umbral mínimo',
    detail: 'HW-SRV-RACK fijado a 3 unidades',
    user: 'Andrea Morales',
    timestampIso: '2026-11-15T10:14:00.000Z',
    seedKey: 'ev1',
  },
  {
    id: 'aud_seed_2',
    category: 'settings',
    action: 'Notificaciones push activadas',
    detail: 'Habilitado sonido y alerta persistente',
    user: 'Andrea Morales',
    timestampIso: '2026-11-15T09:40:00.000Z',
    seedKey: 'ev2',
  },
  {
    id: 'aud_seed_3',
    category: 'sales',
    action: 'Generación de Orden de Venta',
    detail: 'Folio ORD-2026-088 por $148,000 MXN',
    user: 'Carlos Mendoza',
    timestampIso: '2026-11-14T16:20:00.000Z',
    seedKey: 'ev3',
  },
  {
    id: 'aud_seed_4',
    category: 'inventory',
    action: 'Recepción de Mercancía en Vallejo',
    detail: 'Entrada de 15 Terminales POS IP65',
    user: 'Carlos Mendoza',
    timestampIso: '2026-11-10T11:15:00.000Z',
    seedKey: 'ev4',
  },
]

export type PlanTier = 'Growth' | 'Enterprise' | 'Corporate'

export interface PlanTierSpec {
  tier: PlanTier
  tagline: string
  monthlyMxn: number
  maxUsers: number | null
  maxWarehouses: number | null
  storageGb: number
  monthlyCfdiLimit: number | null
  supportSla: string
  features: string[]
}

export const PLAN_TIER_CATALOG: PlanTierSpec[] = [
  {
    tier: 'Growth',
    tagline: 'Operación esencial para empresas en expansión',
    monthlyMxn: 8900,
    maxUsers: 10,
    maxWarehouses: 2,
    storageGb: 25,
    monthlyCfdiLimit: 250,
    supportSla: 'Soporte laboral 8x5 (SLA 12h)',
    features: [
      'Hasta 10 usuarios y roles estándar',
      '2 almacenes conectados y kardex en vivo',
      '250 timbres CFDI 4.0 mensuales',
      '25 GB de bóveda documental XML/PDF',
    ],
  },
  {
    tier: 'Enterprise',
    tagline: 'Control financiero, EBP bancario y analítica multi-sucursal',
    monthlyMxn: 14900,
    maxUsers: null,
    maxWarehouses: 10,
    storageGb: 100,
    monthlyCfdiLimit: null,
    supportSla: 'Soporte prioritario 24/5 (SLA 4h)',
    features: [
      'Usuarios ilimitados y roles personalizados',
      'Hasta 10 almacenes y sucursales con traspasos',
      'Emisión CFDI 4.0 ilimitada + Pagos EBP',
      'Reportes ejecutivos YoY y 100 GB en bóveda',
    ],
  },
  {
    tier: 'Corporate',
    tagline: 'Infraestructura dedicada, multi-entidad y automatización H2H',
    monthlyMxn: 21600,
    maxUsers: null,
    maxWarehouses: null,
    storageGb: 500,
    monthlyCfdiLimit: null,
    supportSla: 'Gerente de cuenta y SLA 99.95% (1h)',
    features: [
      'Usuarios, almacenes y sucursales ilimitadas',
      '500 GB de retención documental y API dedicada',
      'Conciliación bancaria H2H y auditoría extendida',
      'Soporte 24/7 con ejecutivo técnico asignado',
    ],
  },
]

export interface PlanBillingInvoice {
  id: string
  folio: string
  dateIso: string
  periodLabel: string
  concept: string
  paymentMethod: string
  subtotalMxn: number
  taxMxn: number
  amountMxn: number
  status: 'paid' | 'pending'
  cfdiUuid: string
}

export interface PlanAddonsState {
  extraWarehouses: boolean
  speiH2H: boolean
  auditArchive: boolean
}

export const PLAN_ADDONS_CATALOG: Array<{
  key: keyof PlanAddonsState
  name: string
  description: string
  monthlyMxn: number
}> = [
  {
    key: 'extraWarehouses',
    name: '+5 Almacenes Adicionales',
    description: 'Amplía tu cuota operativa con 5 sedes o bodegas adicionales sincronizadas.',
    monthlyMxn: 1800,
  },
  {
    key: 'speiH2H',
    name: 'Conector SPEI Host-to-Host',
    description: 'Conciliación bancaria automática en tiempo real y webhooks de tesorería.',
    monthlyMxn: 2400,
  },
  {
    key: 'auditArchive',
    name: 'Archivo Fiscal y Auditoría 7 Años',
    description: 'Retención inmutable de XML, PDF y bitácoras de seguridad por 7 ejercicios.',
    monthlyMxn: 950,
  },
]

export interface PlanSubscriptionSettings {
  tier: PlanTier
  billingCycle: 'monthly' | 'annual'
  autoRenew: boolean
  paymentBrand: 'VISA' | 'Mastercard' | 'AMEX' | 'SPEI'
  paymentLast4: string
  paymentExpiry: string
  paymentHolder: string
  billingEmail: string
  nextBillingIso: string
  storageUsedGb: number
  addons: PlanAddonsState
  billingInvoices: PlanBillingInvoice[]
}

export const DEFAULT_PLAN_SETTINGS: PlanSubscriptionSettings = {
  tier: 'Enterprise',
  billingCycle: 'annual',
  autoRenew: true,
  paymentBrand: 'VISA',
  paymentLast4: '4821',
  paymentExpiry: '09/2028',
  paymentHolder: 'Andrea Morales Escala',
  billingEmail: 'facturacion@brujulaestudio.mx',
  nextBillingIso: '2026-12-01T00:00:00.000Z',
  storageUsedGb: 18.4,
  addons: {
    extraWarehouses: false,
    speiH2H: true,
    auditArchive: false,
  },
  billingInvoices: [
    {
      id: 'bill_1',
      folio: 'SUB-2026-11',
      dateIso: '2026-11-01T09:00:00.000Z',
      periodLabel: '01 Nov – 30 Nov 2026',
      concept: 'Suscripción AES Nexus · Conector SPEI H2H',
      paymentMethod: 'VISA •••• 4821',
      subtotalMxn: 14711,
      taxMxn: 2354,
      amountMxn: 17065,
      status: 'paid',
      cfdiUuid: 'F8A41D20-9B3C-4E12-8D90-A12B449C0111',
    },
    {
      id: 'bill_2',
      folio: 'SUB-2026-10',
      dateIso: '2026-10-01T09:00:00.000Z',
      periodLabel: '01 Oct – 31 Oct 2026',
      concept: 'Suscripción AES Nexus · Conector SPEI H2H',
      paymentMethod: 'VISA •••• 4821',
      subtotalMxn: 14711,
      taxMxn: 2354,
      amountMxn: 17065,
      status: 'paid',
      cfdiUuid: 'D4C29A10-3F81-4920-9C41-B83E120A0110',
    },
    {
      id: 'bill_3',
      folio: 'SUB-2026-09',
      dateIso: '2026-09-01T09:00:00.000Z',
      periodLabel: '01 Sep – 30 Sep 2026',
      concept: 'Suscripción AES Nexus · Renovación mensual',
      paymentMethod: 'VISA •••• 4821',
      subtotalMxn: 12665,
      taxMxn: 2026,
      amountMxn: 14691,
      status: 'paid',
      cfdiUuid: 'A91E73B2-11C4-4091-8A77-C50F931D0109',
    },
    {
      id: 'bill_4',
      folio: 'SUB-2026-08',
      dateIso: '2026-08-01T09:00:00.000Z',
      periodLabel: '01 Ago – 31 Ago 2026',
      concept: 'Suscripción AES Nexus · Renovación mensual',
      paymentMethod: 'VISA •••• 4821',
      subtotalMxn: 12665,
      taxMxn: 2026,
      amountMxn: 14691,
      status: 'paid',
      cfdiUuid: '71B04E88-7E5A-4D23-B122-94D8A10E0108',
    },
    {
      id: 'bill_5',
      folio: 'SUB-2026-07',
      dateIso: '2026-07-01T09:00:00.000Z',
      periodLabel: '01 Jul – 31 Jul 2026',
      concept: 'Suscripción AES Nexus · Renovación mensual',
      paymentMethod: 'SPEI STP •••• 2190',
      subtotalMxn: 12665,
      taxMxn: 2026,
      amountMxn: 14691,
      status: 'paid',
      cfdiUuid: '5C392F41-60B9-4A18-99E0-42C1D88B0107',
    },
    {
      id: 'bill_6',
      folio: 'SUB-2026-06',
      dateIso: '2026-06-01T09:00:00.000Z',
      periodLabel: '01 Jun – 30 Jun 2026',
      concept: 'Suscripción AES Nexus · Alta inicial',
      paymentMethod: 'SPEI STP •••• 2190',
      subtotalMxn: 12665,
      taxMxn: 2026,
      amountMxn: 14691,
      status: 'paid',
      cfdiUuid: '2E881C04-12D7-4876-81F5-77A0E41F0106',
    },
  ],
}

export const STORAGE_KEYS = {
  general: 'aes_nexus_settings_general',
  org: 'aes_nexus_settings_org',
  users: 'aes_nexus_settings_users',
  security: 'aes_nexus_settings_security',
  notifications: 'aes_nexus_settings_notifications',
  roles: 'aes_nexus_settings_roles',
  roleDefinitions: 'aes_nexus_settings_role_profiles',
  defaultNewUserRole: 'aes_nexus_settings_default_new_user_role',
  integrations: 'aes_nexus_settings_integrations',
  commercialIntegrations: 'aes_nexus_settings_commercial_integrations',
  externalIntegrations: 'aes_nexus_settings_external_integrations',
  audit: 'aes_nexus_settings_audit',
  plan: 'aes_nexus_settings_plan',
  categoryStockThresholds: 'aes_nexus_category_stock_thresholds_v1',
  subsidiaries: 'aes_nexus_subsidiaries_v1',
  departments: 'aes_nexus_departments_v1',
  locations: 'aes_nexus_locations_v1',
} as const

export function readStoredJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeStoredJson<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore storage quota errors
  }
}

export const ROLES_CHANGED_EVENT = 'aes_nexus_roles_changed'
export const USERS_CHANGED_EVENT = 'aes_nexus_users_changed'
export const AUDIT_CHANGED_EVENT = 'aes_nexus_audit_changed'
export const INTEGRATIONS_CHANGED_EVENT = 'aes_nexus_integrations_changed'
export const COMMERCIAL_INTEGRATIONS_CHANGED_EVENT = 'aes_nexus_commercial_integrations_changed'
export const DEFAULT_NEW_USER_ROLE_CHANGED_EVENT = 'aes_nexus_default_role_changed'
export const CATEGORY_STOCK_THRESHOLDS_CHANGED_EVENT = 'aes_nexus_category_stock_thresholds_changed'
export const FALLBACK_DEFAULT_NEW_USER_ROLE: RoleKey = 'Operaciones'

export interface WorkspaceUserRecord {
  id: string
  name: string
  email: string
  role: RoleKey
  roles?: RoleKey[]
  status: 'active' | 'suspended'
  lastLogin: string
  avatarInitials: string
}

export function getWorkspaceUserRoleIds(
  user: Pick<WorkspaceUserRecord, 'role' | 'roles'>,
  validRoleIds?: Set<RoleKey>
): RoleKey[] {
  const raw =
    Array.isArray(user.roles) && user.roles.length > 0
      ? user.roles
      : user.role
      ? [user.role]
      : []
  const seen = new Set<RoleKey>()
  const result: RoleKey[] = []
  for (const id of raw) {
    if (!id || seen.has(id)) continue
    if (validRoleIds && !validRoleIds.has(id)) continue
    seen.add(id)
    result.push(id)
  }
  return result
}

export const DEFAULT_WORKSPACE_USERS: WorkspaceUserRecord[] = [
  {
    id: 'usr_1',
    name: 'Andrea Morales Escala',
    email: 'andrea.morales@brujulaestudio.mx',
    role: 'Administrador',
    roles: ['Administrador', 'Finanzas', 'Operaciones'],
    status: 'active',
    lastLogin: 'Hace 5 minutos · Sesión actual',
    avatarInitials: 'AM',
  },
  {
    id: 'usr_2',
    name: 'Carlos Mendoza Ríos',
    email: 'carlos.mendoza@brujulaestudio.mx',
    role: 'Operaciones',
    roles: ['Operaciones'],
    status: 'active',
    lastLogin: 'Hoy, 08:15 hrs',
    avatarInitials: 'CM',
  },
  {
    id: 'usr_3',
    name: 'Sofía Valenzuela Treviño',
    email: 'sofia.valenzuela@brujulaestudio.mx',
    role: 'Ventas',
    roles: ['Ventas'],
    status: 'active',
    lastLogin: 'Ayer, 18:40 hrs',
    avatarInitials: 'SV',
  },
  {
    id: 'usr_4',
    name: 'Roberto Garza Hinojosa',
    email: 'roberto.garza@brujulaestudio.mx',
    role: 'Finanzas',
    roles: ['Finanzas'],
    status: 'active',
    lastLogin: '10 nov 2026',
    avatarInitials: 'RG',
  },
]

export function isGeneralAdminRole(
  role: Pick<RoleDefinition, 'id' | 'builtInKey'> | null | undefined
): boolean {
  return Boolean(role && (role.id === 'Administrador' || role.builtInKey === 'admin'))
}

export function loadStoredWorkspaceUsers(): WorkspaceUserRecord[] {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEYS.users)
    if (saved) {
      const parsed = JSON.parse(saved) as WorkspaceUserRecord[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((usr) => {
          if (Array.isArray(usr.roles) && usr.roles.length > 0) return usr
          const defMatch = DEFAULT_WORKSPACE_USERS.find((d) => d.id === usr.id)
          if (defMatch && defMatch.role === usr.role && defMatch.roles) {
            return { ...usr, roles: defMatch.roles }
          }
          return usr.role ? { ...usr, roles: [usr.role] } : usr
        })
      }
    }
  } catch {
    // fallback
  }
  return DEFAULT_WORKSPACE_USERS
}

export function normalizeRoleDefinition(role: RoleDefinition): RoleDefinition {
  if (isGeneralAdminRole(role)) {
    return {
      ...role,
      builtInKey: 'admin' as const,
      forApiIntegration: false,
      capabilities: [...DEFAULT_ROLE_PERMISSIONS.Administrador],
      sectionPermissions: cloneSectionPermissions(DEFAULT_ROLE_SECTION_PERMISSIONS.Administrador),
    }
  }
  const sectionPermissions = role.sectionPermissions
    ? cloneSectionPermissions(role.sectionPermissions)
    : deriveSectionPermissionsFromCapabilities(role.capabilities || [], role.builtInKey)
  const capabilities =
    Array.isArray(role.capabilities) && role.capabilities.length > 0 && !role.sectionPermissions
      ? role.capabilities
      : deriveCapabilitiesFromSectionPermissions(sectionPermissions)
  return {
    ...role,
    forApiIntegration: Boolean(role.forApiIntegration),
    capabilities,
    sectionPermissions,
  }
}

export function loadStoredRoleDefinitions(): RoleDefinition[] {
  try {
    const savedProfiles = window.localStorage.getItem(STORAGE_KEYS.roleDefinitions)
    if (savedProfiles) {
      const parsed = JSON.parse(savedProfiles) as RoleDefinition[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        const normalized = parsed.map(normalizeRoleDefinition)
        const hasAdmin = normalized.some((r) => isGeneralAdminRole(r))
        return hasAdmin ? normalized : [DEFAULT_ROLE_DEFINITIONS[0], ...normalized]
      }
    }
    const legacyPerms = window.localStorage.getItem(STORAGE_KEYS.roles)
    if (legacyPerms) {
      const parsedLegacy = JSON.parse(legacyPerms) as Record<string, RoleCapabilityId[]>
      return DEFAULT_ROLE_DEFINITIONS.map((role) => {
        const caps = isGeneralAdminRole(role)
          ? [...DEFAULT_ROLE_PERMISSIONS.Administrador]
          : parsedLegacy[role.id] || role.capabilities
        return normalizeRoleDefinition({
          ...role,
          capabilities: caps,
          sectionPermissions: deriveSectionPermissionsFromCapabilities(caps, role.builtInKey),
        })
      })
    }
  } catch {
    // fallback to defaults
  }
  return DEFAULT_ROLE_DEFINITIONS
}

export function loadStoredExternalIntegrations(roles?: RoleDefinition[]): ExternalIntegrationRecord[] {
  const resolvedRoles = roles && roles.length > 0 ? roles : loadStoredRoleDefinitions()
  const validRoleIds = new Set(resolvedRoles.map((r) => r.id))
  const fallbackRoleId =
    resolvedRoles.find((r) => !isGeneralAdminRole(r))?.id || resolvedRoles[0]?.id || 'Ventas'

  const stored = readStoredJson<ExternalIntegrationRecord[]>(
    STORAGE_KEYS.externalIntegrations,
    DEFAULT_EXTERNAL_INTEGRATIONS
  )
  return stored
    .filter((rec) => rec.id !== 'ext_shopify_mx')
    .map((rec) => {
      const seedMatch = DEFAULT_EXTERNAL_INTEGRATIONS.find((d) => d.id === rec.id)
      const candidateRoleId = rec.roleId || seedMatch?.roleId || fallbackRoleId
      const resolvedRoleId = validRoleIds.has(candidateRoleId) ? candidateRoleId : fallbackRoleId
      const rawLogs = Array.isArray(rec.recentLogs) ? rec.recentLogs : seedMatch?.recentLogs || []
      const hydratedLogs: ExternalIntegrationLog[] = rawLogs.map((log) => {
        const seedLog = seedMatch?.recentLogs.find((sl) => sl.id === log.id)
        const resolvedEndpoint =
          log.endpoint ||
          seedLog?.endpoint ||
          (log.moduleName && log.sectionName
            ? getSectionApiEndpoint(log.moduleName, log.sectionName)
            : EXTERNAL_API_RESOURCES.find((r) => r.id === log.resource)?.endpoint || `/api/v1/${log.resource}`)
        const resolvedPayload =
          log.responsePayload ||
          seedLog?.responsePayload ||
          JSON.stringify(
            {
              ok: log.statusCode < 400,
              statusCode: log.statusCode,
              method: log.method,
              endpoint: resolvedEndpoint,
              summary: log.summary,
              timestamp: log.timestampIso,
            },
            null,
            2
          )
        return {
          ...log,
          endpoint: resolvedEndpoint,
          latencyMs: log.latencyMs ?? seedLog?.latencyMs ?? (log.statusCode >= 400 ? 22 : 38),
          responsePayload: resolvedPayload,
        }
      })
      return {
        ...rec,
        origin: 'custom',
        roleId: resolvedRoleId,
        recentLogs: hydratedLogs,
      }
    })
}

export function loadStoredCommercialIntegrations(): CommercialIntegrationRecord[] {
  const stored = readStoredJson<CommercialIntegrationRecord[]>(
    STORAGE_KEYS.commercialIntegrations,
    DEFAULT_COMMERCIAL_INTEGRATIONS
  )
  return stored.map((rec) => ({
    ...rec,
    recentLogs: Array.isArray(rec.recentLogs) ? rec.recentLogs : [],
  }))
}

export function loadDefaultNewUserRole(roles?: RoleDefinition[]): RoleKey {
  const resolvedRoles = roles && roles.length > 0 ? roles : loadStoredRoleDefinitions()
  const stored = readStoredJson<RoleKey | null>(STORAGE_KEYS.defaultNewUserRole, null)
  if (stored && resolvedRoles.some((r) => r.id === stored)) {
    return stored
  }
  const preferredFallback = resolvedRoles.find((r) => r.id === FALLBACK_DEFAULT_NEW_USER_ROLE)
  if (preferredFallback) return preferredFallback.id
  const firstNonAdmin = resolvedRoles.find((r) => !isGeneralAdminRole(r))
  return firstNonAdmin?.id || resolvedRoles[0]?.id || FALLBACK_DEFAULT_NEW_USER_ROLE
}

export function saveDefaultNewUserRole(roleId: RoleKey): void {
  writeStoredJson(STORAGE_KEYS.defaultNewUserRole, roleId)
  window.dispatchEvent(
    new CustomEvent(DEFAULT_NEW_USER_ROLE_CHANGED_EVENT, { detail: { roleId } })
  )
}

export function detectClientDeviceBrowser(): string {
  if (typeof navigator === 'undefined') return 'Navegador web'
  const ua = navigator.userAgent || ''

  let device = 'Equipo de escritorio'
  if (/iPhone/i.test(ua)) device = 'iPhone (iOS)'
  else if (/iPad/i.test(ua)) device = 'iPad (iPadOS)'
  else if (/Android/i.test(ua)) device = 'Dispositivo Android'
  else if (/Macintosh|Mac OS X/i.test(ua)) device = 'MacBook / macOS'
  else if (/Windows/i.test(ua)) device = 'Windows PC'
  else if (/Linux/i.test(ua)) device = 'Linux Workstation'

  let browser = 'Navegador web'
  const edgeMatch = ua.match(/Edg\/(\d+)/)
  const chromeMatch = ua.match(/Chrome\/(\d+)/)
  const firefoxMatch = ua.match(/Firefox\/(\d+)/)
  const safariMatch = ua.match(/Version\/(\d+).*Safari/)

  if (edgeMatch) browser = `Edge ${edgeMatch[1]}`
  else if (chromeMatch && !/Edg\//.test(ua)) browser = `Chrome ${chromeMatch[1]}`
  else if (firefoxMatch) browser = `Firefox ${firefoxMatch[1]}`
  else if (safariMatch) browser = `Safari ${safariMatch[1]}`
  else if (/Safari/i.test(ua)) browser = 'Safari'

  return `${device} · ${browser}`
}

const SESSION_IP_BY_KEY: Record<string, string> = {
  'user:usr_1': '189.204.112.44',
  'user:usr_2': '187.188.42.18',
  'user:usr_3': '201.141.78.92',
  'user:usr_4': '189.156.91.105',
}

export function resolveSessionIpAddress(sessionKey: string): string {
  if (SESSION_IP_BY_KEY[sessionKey]) return SESSION_IP_BY_KEY[sessionKey]
  let hash = 0
  for (let i = 0; i < sessionKey.length; i += 1) {
    hash = (hash * 31 + sessionKey.charCodeAt(i)) % 65025
  }
  const third = 40 + (hash % 180)
  const fourth = 12 + ((Math.floor(hash / 7) + 19) % 220)
  return `189.204.${third}.${fourth}`
}

function hydrateAuditWithSeedSessions(events: AuditEventRecord[]): AuditEventRecord[] {
  if (events.some((ev) => ev.category === 'session')) return events
  const sessionSeeds = INITIAL_AUDIT_EVENTS.filter((ev) => ev.category === 'session')
  const existingIds = new Set(events.map((ev) => ev.id))
  const toAdd = sessionSeeds.filter((ev) => !existingIds.has(ev.id))
  if (toAdd.length === 0) return events
  return [...events, ...toAdd].sort(
    (a, b) => new Date(b.timestampIso).getTime() - new Date(a.timestampIso).getTime()
  )
}

export function loadStoredAuditEvents(): AuditEventRecord[] {
  const stored = readStoredJson<AuditEventRecord[]>(STORAGE_KEYS.audit, INITIAL_AUDIT_EVENTS)
  return hydrateAuditWithSeedSessions(stored)
}

export function appendAuditLog(entry: Omit<AuditEventRecord, 'id' | 'timestampIso'>): AuditEventRecord[] {
  const current = hydrateAuditWithSeedSessions(
    readStoredJson<AuditEventRecord[]>(STORAGE_KEYS.audit, INITIAL_AUDIT_EVENTS)
  )
  const nextItem: AuditEventRecord = {
    ...entry,
    id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestampIso: new Date().toISOString(),
  }
  const updated = [nextItem, ...current].slice(0, 150)
  writeStoredJson(STORAGE_KEYS.audit, updated)
  window.dispatchEvent(new CustomEvent(AUDIT_CHANGED_EVENT, { detail: { events: updated } }))
  return updated
}

export type CategoryThresholdMode = 'inherit_default' | 'override_sku'

export interface CategoryStockThresholdRule {
  id: string
  category: string
  minStock: number
  enabled: boolean
  mode: CategoryThresholdMode
  notes?: string
  updatedAtIso: string
  isCustom?: boolean
}

export const DEFAULT_CATEGORY_STOCK_THRESHOLDS: CategoryStockThresholdRule[] = [
  {
    id: 'cat_thr_hardware',
    category: 'Hardware',
    minStock: 5,
    enabled: true,
    mode: 'inherit_default',
    notes: 'Servidores, terminales POS, lectores y hardware de red física.',
    updatedAtIso: '2026-11-15T09:00:00.000Z',
  },
  {
    id: 'cat_thr_software',
    category: 'Software y Licencias',
    minStock: 3,
    enabled: true,
    mode: 'inherit_default',
    notes: 'Licencias empresariales y claves de activación disponibles.',
    updatedAtIso: '2026-11-15T09:00:00.000Z',
  },
  {
    id: 'cat_thr_mantenimiento',
    category: 'Mantenimiento',
    minStock: 2,
    enabled: true,
    mode: 'inherit_default',
    notes: 'Refacciones, kits de soporte y pólizas operativas.',
    updatedAtIso: '2026-11-15T09:00:00.000Z',
  },
  {
    id: 'cat_thr_diseno',
    category: 'Diseño y Desarrollo',
    minStock: 2,
    enabled: true,
    mode: 'inherit_default',
    notes: 'Paquetes de implementación y activos reutilizables.',
    updatedAtIso: '2026-11-15T09:00:00.000Z',
  },
  {
    id: 'cat_thr_consultoria',
    category: 'Consultoría',
    minStock: 1,
    enabled: false,
    mode: 'inherit_default',
    notes: 'Servicios profesionales sin inventario físico directo.',
    updatedAtIso: '2026-11-15T09:00:00.000Z',
  },
  {
    id: 'cat_thr_capacitacion',
    category: 'Capacitación',
    minStock: 1,
    enabled: false,
    mode: 'inherit_default',
    notes: 'Talleres y material formativo para equipos.',
    updatedAtIso: '2026-11-15T09:00:00.000Z',
  },
]

export function loadStoredCategoryStockThresholds(): CategoryStockThresholdRule[] {
  const stored = readStoredJson<CategoryStockThresholdRule[] | null>(
    STORAGE_KEYS.categoryStockThresholds,
    null
  )
  if (!Array.isArray(stored) || stored.length === 0) {
    return DEFAULT_CATEGORY_STOCK_THRESHOLDS
  }
  const existingKeys = new Set(stored.map((r) => r.category.trim().toLowerCase()))
  const missingDefaults = DEFAULT_CATEGORY_STOCK_THRESHOLDS.filter(
    (def) => !existingKeys.has(def.category.trim().toLowerCase())
  )
  return [...stored, ...missingDefaults]
}

export function saveStoredCategoryStockThresholds(rules: CategoryStockThresholdRule[]): void {
  writeStoredJson(STORAGE_KEYS.categoryStockThresholds, rules)
  window.dispatchEvent(
    new CustomEvent(CATEGORY_STOCK_THRESHOLDS_CHANGED_EVENT, { detail: { rules } })
  )
}

export function buildProductCategoryLookup(
  products: ReadonlyArray<{ id: string; sku: string; category: string }>
): Map<string, string> {
  const map = new Map<string, string>()
  for (const p of products) {
    if (p.id) map.set(p.id, p.category)
    if (p.sku) map.set(p.sku.trim().toLowerCase(), p.category)
  }
  return map
}

export function resolveInventoryItemCategory(
  item: { productId: string; sku: string; category?: string },
  productCategoryMap?: Map<string, string>
): string {
  if (item.category && item.category.trim()) return item.category.trim()
  if (productCategoryMap) {
    const byId = productCategoryMap.get(item.productId)
    if (byId) return byId
    const bySku = productCategoryMap.get(item.sku.trim().toLowerCase())
    if (bySku) return bySku
  }
  return 'Hardware'
}

export type EffectiveThresholdSource = 'category_override' | 'category_inherit' | 'sku'

export function resolveEffectiveStockThreshold(
  item: {
    productId: string
    sku: string
    category?: string
    minStock: number
    thresholdSource?: 'sku' | 'category'
  },
  rules: CategoryStockThresholdRule[],
  productCategoryMap?: Map<string, string>
): {
  effectiveMinStock: number
  source: EffectiveThresholdSource
  category: string
  categoryRule?: CategoryStockThresholdRule
} {
  const category = resolveInventoryItemCategory(item, productCategoryMap)
  const normalizedCat = category.toLowerCase()
  const rule = rules.find((r) => r.category.trim().toLowerCase() === normalizedCat)

  if (rule && rule.enabled) {
    if (rule.mode === 'override_sku') {
      return {
        effectiveMinStock: Math.max(0, rule.minStock),
        source: 'category_override',
        category,
        categoryRule: rule,
      }
    }
    if (item.thresholdSource === 'category') {
      return {
        effectiveMinStock: Math.max(0, rule.minStock),
        source: 'category_inherit',
        category,
        categoryRule: rule,
      }
    }
  }

  return {
    effectiveMinStock: Math.max(0, item.minStock),
    source: 'sku',
    category,
    categoryRule: rule,
  }
}
