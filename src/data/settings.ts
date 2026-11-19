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

export interface RoleDefinition {
  id: RoleKey
  name: string
  description: string
  capabilities: RoleCapabilityId[]
  builtInKey?: 'admin' | 'ops' | 'sales' | 'fin'
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

export const DEFAULT_ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    id: 'Administrador',
    name: 'Administrador General',
    description: 'Control total de la configuración, usuarios, facturación, auditorías y módulos.',
    capabilities: [...DEFAULT_ROLE_PERMISSIONS.Administrador],
    builtInKey: 'admin',
  },
  {
    id: 'Operaciones',
    name: 'Gerencia de Operaciones',
    description: 'Gestión integral de almacenes, existencias mínimas, recepciones y transferencias.',
    capabilities: [...DEFAULT_ROLE_PERMISSIONS.Operaciones],
    builtInKey: 'ops',
  },
  {
    id: 'Ventas',
    name: 'Equipo Comercial & Ventas',
    description: 'Administración del catálogo, cotizaciones, órdenes de venta y seguimiento en CRM.',
    capabilities: [...DEFAULT_ROLE_PERMISSIONS.Ventas],
    builtInKey: 'sales',
  },
  {
    id: 'Finanzas',
    name: 'Finanzas & Contabilidad',
    description: 'Conciliación bancaria, cuentas por cobrar, pagos a proveedores y flujo de caja.',
    capabilities: [...DEFAULT_ROLE_PERMISSIONS.Finanzas],
    builtInKey: 'fin',
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
  statusCode: 200 | 201 | 401 | 403
  summary: string
  timestampIso: string
}

export interface ExternalIntegrationRecord {
  id: string
  name: string
  systemType: ExternalSystemType
  description: string
  environment: 'production' | 'sandbox'
  status: 'active' | 'paused' | 'revoked'
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

export const DEFAULT_EXTERNAL_INTEGRATIONS: ExternalIntegrationRecord[] = [
  {
    id: 'ext_shopify_mx',
    name: 'Sincronizador Shopify MX',
    systemType: 'Ecommerce',
    description: 'Sincroniza catálogo de SKUs, pedidos en línea y altas de clientes desde tienda web.',
    environment: 'production',
    status: 'active',
    apiKeyPrefix: 'nexus_live_8Kp',
    apiKeySecret: 'nexus_live_8Kp92VmQx4RtN7wL3YzH5BcJ6DfA',
    webhookCallbackUrl: 'https://hooks.brujulaestudio.mx/shopify-sync',
    ipAllowlist: '34.192.18.0/24, 52.84.112.14',
    rateLimitPerMin: 240,
    permissions: {
      clientes: ['read', 'create', 'update'],
      productos: ['read', 'update'],
      ventas: ['read', 'create', 'update'],
      compras: [],
      finanzas: [],
      rrhh: [],
    },
    createdAtIso: '2026-09-12T10:15:00.000Z',
    lastUsedAtIso: '2026-11-16T14:22:00.000Z',
    requestsCount: 18420,
    recentLogs: [
      {
        id: 'log_seed_1',
        method: 'POST',
        resource: 'ventas',
        statusCode: 201,
        summary: 'Pedido #VTA-9841 insertado desde checkout web',
        timestampIso: '2026-11-16T14:22:00.000Z',
      },
      {
        id: 'log_seed_2',
        method: 'PUT',
        resource: 'productos',
        statusCode: 200,
        summary: 'Stock reservado para 4 SKUs en Almacén Vallejo',
        timestampIso: '2026-11-16T14:19:00.000Z',
      },
    ],
  },
  {
    id: 'ext_powerbi_dwh',
    name: 'Conector Power BI / Data Warehouse',
    systemType: 'BI / Analítica',
    description: 'Extracción programada de solo lectura para tableros directivos y márgenes por sucursal.',
    environment: 'production',
    status: 'active',
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
        statusCode: 200,
        summary: 'Consulta paginada de pólizas y flujo mensual (250 registros)',
        timestampIso: '2026-11-16T12:00:00.000Z',
      },
    ],
  },
  {
    id: 'ext_wms_sandbox',
    name: 'Middleware Logístico 3PL (Pruebas)',
    systemType: 'WMS / Logística',
    description: 'Integración de pruebas para alta, actualización y depuración de órdenes de surtido.',
    environment: 'sandbox',
    status: 'paused',
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
    lastUsedAtIso: '2026-11-14T18:10:00.000Z',
    requestsCount: 412,
    recentLogs: [
      {
        id: 'log_seed_4',
        method: 'DELETE',
        resource: 'productos',
        statusCode: 200,
        summary: 'Depuración de SKU temporal de prueba WMS-TEST-09',
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

export interface AuditEventRecord {
  id: string
  category: AuditCategory
  action: string
  detail: string
  user: string
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
  externalIntegrations: 'aes_nexus_settings_external_integrations',
  audit: 'aes_nexus_settings_audit',
  plan: 'aes_nexus_settings_plan',
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
export const DEFAULT_NEW_USER_ROLE_CHANGED_EVENT = 'aes_nexus_default_role_changed'
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

export function loadStoredRoleDefinitions(): RoleDefinition[] {
  try {
    const savedProfiles = window.localStorage.getItem(STORAGE_KEYS.roleDefinitions)
    if (savedProfiles) {
      const parsed = JSON.parse(savedProfiles) as RoleDefinition[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        const normalized = parsed.map((role) =>
          isGeneralAdminRole(role)
            ? {
                ...role,
                builtInKey: 'admin' as const,
                capabilities: [...DEFAULT_ROLE_PERMISSIONS.Administrador],
              }
            : role
        )
        const hasAdmin = normalized.some((r) => isGeneralAdminRole(r))
        return hasAdmin ? normalized : [DEFAULT_ROLE_DEFINITIONS[0], ...normalized]
      }
    }
    const legacyPerms = window.localStorage.getItem(STORAGE_KEYS.roles)
    if (legacyPerms) {
      const parsedLegacy = JSON.parse(legacyPerms) as Record<string, RoleCapabilityId[]>
      return DEFAULT_ROLE_DEFINITIONS.map((role) => ({
        ...role,
        capabilities: isGeneralAdminRole(role)
          ? [...DEFAULT_ROLE_PERMISSIONS.Administrador]
          : parsedLegacy[role.id] || role.capabilities,
      }))
    }
  } catch {
    // fallback to defaults
  }
  return DEFAULT_ROLE_DEFINITIONS
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
