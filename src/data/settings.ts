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

export type AuditCategory = 'settings' | 'users' | 'security' | 'integrations' | 'inventory' | 'sales'

export interface AuditEventRecord {
  id: string
  category: AuditCategory
  action: string
  detail: string
  user: string
  timestampIso: string
  seedKey?: 'ev1' | 'ev2' | 'ev3' | 'ev4'
}

export const INITIAL_AUDIT_EVENTS: AuditEventRecord[] = [
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

export interface PlanSubscriptionSettings {
  tier: PlanTier
  billingCycle: 'monthly' | 'annual'
  paymentLast4: string
  nextBillingIso: string
  billingInvoices: Array<{
    id: string
    folio: string
    dateIso: string
    amountMxn: number
    status: 'paid'
  }>
}

export const DEFAULT_PLAN_SETTINGS: PlanSubscriptionSettings = {
  tier: 'Enterprise',
  billingCycle: 'annual',
  paymentLast4: '4821',
  nextBillingIso: '2026-12-01T00:00:00.000Z',
  billingInvoices: [
    { id: 'bill_1', folio: 'SUB-2026-11', dateIso: '2026-11-01T09:00:00.000Z', amountMxn: 14900, status: 'paid' },
    { id: 'bill_2', folio: 'SUB-2026-10', dateIso: '2026-10-01T09:00:00.000Z', amountMxn: 14900, status: 'paid' },
    { id: 'bill_3', folio: 'SUB-2026-09', dateIso: '2026-09-01T09:00:00.000Z', amountMxn: 14900, status: 'paid' },
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
  integrations: 'aes_nexus_settings_integrations',
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

export interface WorkspaceUserRecord {
  id: string
  name: string
  email: string
  role: RoleKey
  status: 'active' | 'suspended'
  lastLogin: string
  avatarInitials: string
}

export const DEFAULT_WORKSPACE_USERS: WorkspaceUserRecord[] = [
  {
    id: 'usr_1',
    name: 'Andrea Morales Escala',
    email: 'andrea.morales@brujulaestudio.mx',
    role: 'Administrador',
    status: 'active',
    lastLogin: 'Hace 5 minutos · Sesión actual',
    avatarInitials: 'AM',
  },
  {
    id: 'usr_2',
    name: 'Carlos Mendoza Ríos',
    email: 'carlos.mendoza@brujulaestudio.mx',
    role: 'Operaciones',
    status: 'active',
    lastLogin: 'Hoy, 08:15 hrs',
    avatarInitials: 'CM',
  },
  {
    id: 'usr_3',
    name: 'Sofía Valenzuela Treviño',
    email: 'sofia.valenzuela@brujulaestudio.mx',
    role: 'Ventas',
    status: 'active',
    lastLogin: 'Ayer, 18:40 hrs',
    avatarInitials: 'SV',
  },
  {
    id: 'usr_4',
    name: 'Roberto Garza Hinojosa',
    email: 'roberto.garza@brujulaestudio.mx',
    role: 'Finanzas',
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
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
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

export function appendAuditLog(entry: Omit<AuditEventRecord, 'id' | 'timestampIso'>): AuditEventRecord[] {
  const current = readStoredJson<AuditEventRecord[]>(STORAGE_KEYS.audit, INITIAL_AUDIT_EVENTS)
  const nextItem: AuditEventRecord = {
    ...entry,
    id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestampIso: new Date().toISOString(),
  }
  const updated = [nextItem, ...current].slice(0, 120)
  writeStoredJson(STORAGE_KEYS.audit, updated)
  return updated
}
