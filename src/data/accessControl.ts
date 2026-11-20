import {
  ALL_CAPABILITIES,
  SYSTEM_MODULE_SECTIONS,
  buildSectionPermissionsMap,
  deriveSectionPermissionsFromCapabilities,
  isGeneralAdminRole,
  levelAllowsHttpMethod,
  maxSectionAccessLevel,
  normalizeRoleDefinition,
  type RoleCapabilityId,
  type RoleDefinition,
  type RoleKey,
  type RoleSectionPermissions,
  type SectionAccessLevel,
} from './settings'

export const ACTIVE_SESSION_STORAGE_KEY = 'aes_nexus_active_session_v1'

export const MODULE_SECTIONS = SYSTEM_MODULE_SECTIONS

// Empty array [] = accessible to any active user (personal preference / landing).
// Non-empty array = user needs AT LEAST ONE of the listed capabilities (or full admin).
const SECTION_CAPABILITY_REQUIREMENTS: Record<string, Record<string, RoleCapabilityId[]>> = {
  CRM: {
    Clientes: ['crmClients'],
    Proveedores: ['crmClients'],
    Empleados: ['manageUsers', 'sysConfig'],
    Nómina: ['schedulePayments', 'manageUsers'],
    Oportunidades: ['pipelineReports', 'crmClients'],
    Actividades: ['crmClients', 'pipelineReports'],
    Resumen: ['crmClients', 'pipelineReports', 'manageUsers', 'schedulePayments', 'sysConfig'],
  },
  Ventas: {
    Catálogo: ['createQuotes', 'issueOrders'],
    Cotizaciones: ['createQuotes'],
    Pedidos: ['issueOrders', 'createQuotes'],
    Facturas: ['issueOrders'],
    Resumen: ['createQuotes', 'issueOrders', 'pipelineReports'],
  },
  Compras: {
    Resumen: ['approvePurchases', 'receiveGoods', 'inventoryControl', 'schedulePayments'],
    Requisiciones: ['approvePurchases', 'inventoryControl', 'adjustThresholds', 'receiveGoods'],
    'Órdenes de compra': ['approvePurchases', 'receiveGoods'],
    Recepciones: ['receiveGoods', 'inventoryControl'],
    Facturas: ['approvePurchases', 'schedulePayments', 'expenseControl'],
  },
  Operaciones: {
    Inventario: ['inventoryControl', 'adjustThresholds', 'stockLedger'],
    Traslados: ['inventoryControl', 'stockLedger'],
    Compras: ['approvePurchases', 'receiveGoods'],
    Entregas: ['receiveGoods'],
    Resumen: ['inventoryControl', 'adjustThresholds', 'receiveGoods', 'stockLedger', 'approvePurchases'],
  },
  Finanzas: {
    Cobros: ['manageReceivables'],
    Pagos: ['schedulePayments'],
    'Pagos Bancarios': ['schedulePayments'],
    Gastos: ['expenseControl'],
    'Cuentas contables': ['balanceReports'],
    Resumen: ['manageReceivables', 'schedulePayments', 'balanceReports', 'expenseControl'],
  },
  Reportes: {
    'Resumen ejecutivo': ['fullReports', 'balanceReports', 'pipelineReports'],
    'Finanzas y Tesorería': ['fullReports', 'balanceReports', 'manageReceivables', 'schedulePayments', 'expenseControl'],
    'CxP y Pagos EBP': ['fullReports', 'schedulePayments', 'approvePurchases', 'balanceReports'],
    'Ventas y CxC': ['fullReports', 'pipelineReports', 'manageReceivables', 'issueOrders'],
    'Compras e Inventario': ['fullReports', 'approvePurchases', 'inventoryControl', 'stockLedger'],
    'Nómina y RRHH': ['fullReports', 'schedulePayments', 'manageUsers'],
  },
  Administración: {
    Departamentos: ['sysConfig', 'manageUsers'],
    Ubicaciones: ['sysConfig', 'manageUsers'],
    Resumen: ['sysConfig', 'manageUsers'],
    'Historial de Auditoría': ['sysConfig', 'manageUsers', 'fullReports'],
  },
  Configuración: {
    General: ['sysConfig'],
    Organización: ['sysConfig'],
    'Idioma y región': [],
    Usuarios: ['manageUsers', 'sysConfig'],
    'Roles y permisos': ['manageUsers', 'sysConfig'],
    Seguridad: ['sysConfig'],
    Apariencia: [],
    Notificaciones: ['sysConfig', 'adjustThresholds'],
    Auditoría: ['sysConfig', 'fullReports'],
    Integraciones: ['sysConfig'],
    'Plan y facturación': ['sysConfig'],
  },
}

export const CAPABILITY_LABELS_ES: Record<RoleCapabilityId, string> = {
  sysConfig: 'Configuración del sistema',
  manageUsers: 'Gestión de usuarios y roles',
  approvePurchases: 'Aprobación de compras',
  fullReports: 'Visualización ejecutiva total',
  inventoryControl: 'Control de inventario y almacenes',
  adjustThresholds: 'Ajuste de umbrales mínimos',
  receiveGoods: 'Recepciones y entregas',
  stockLedger: 'Kardex de movimientos',
  createQuotes: 'Crear cotizaciones',
  issueOrders: 'Emitir pedidos y facturas',
  crmClients: 'Gestión de clientes CRM',
  pipelineReports: 'Reportes de pipeline',
  manageReceivables: 'Gestión de cobros (CxC)',
  schedulePayments: 'Programación de pagos y EBP',
  balanceReports: 'Reportes contables y balance',
  expenseControl: 'Control de gastos',
}

export function resolveEffectiveAccess(
  assignedRoles: RoleKey[],
  roleDefinitions: RoleDefinition[],
  isAccountActive = true
): {
  isFullAdmin: boolean
  capabilities: Set<RoleCapabilityId>
  sectionAccess: RoleSectionPermissions
} {
  if (!isAccountActive) {
    return {
      isFullAdmin: false,
      capabilities: new Set(),
      sectionAccess: buildSectionPermissionsMap('none'),
    }
  }
  const caps = new Set<RoleCapabilityId>()
  const sectionAccess = buildSectionPermissionsMap('none')
  let isFullAdmin = false

  for (const roleId of assignedRoles) {
    const rawDef = roleDefinitions.find((r) => r.id === roleId)
    if (!rawDef && roleId === 'Administrador') {
      isFullAdmin = true
      for (const c of ALL_CAPABILITIES) caps.add(c.id)
      const fullMap = buildSectionPermissionsMap('full')
      for (const [mod, secs] of Object.entries(fullMap)) {
        for (const [sec, lvl] of Object.entries(secs)) {
          sectionAccess[mod][sec] = maxSectionAccessLevel(sectionAccess[mod]?.[sec], lvl)
        }
      }
      continue
    }
    if (!rawDef) continue
    const def = normalizeRoleDefinition(rawDef)
    if (isGeneralAdminRole(def) || roleId === 'Administrador') {
      isFullAdmin = true
      for (const c of ALL_CAPABILITIES) caps.add(c.id)
    } else {
      for (const capId of def.capabilities) caps.add(capId)
    }
    const roleSections =
      def.sectionPermissions ||
      deriveSectionPermissionsFromCapabilities(def.capabilities, def.builtInKey)
    for (const [mod, secs] of Object.entries(roleSections)) {
      if (!sectionAccess[mod]) sectionAccess[mod] = {}
      for (const [sec, lvl] of Object.entries(secs)) {
        sectionAccess[mod][sec] = maxSectionAccessLevel(sectionAccess[mod][sec], lvl)
      }
    }
  }

  return { isFullAdmin, capabilities: caps, sectionAccess }
}

export function getRequiredCapabilities(moduleName: string, sectionName?: string): RoleCapabilityId[] {
  if (moduleName === 'Inicio') return []
  const moduleReqs = SECTION_CAPABILITY_REQUIREMENTS[moduleName]
  if (!moduleReqs) return []
  if (sectionName && Object.prototype.hasOwnProperty.call(moduleReqs, sectionName)) {
    return moduleReqs[sectionName]
  }
  const union = new Set<RoleCapabilityId>()
  for (const reqList of Object.values(moduleReqs)) {
    for (const cap of reqList) union.add(cap)
  }
  return Array.from(union)
}

export function getSectionAccessLevel(
  moduleName: string,
  sectionName: string,
  sectionAccess?: RoleSectionPermissions,
  isFullAdmin = false,
  isAccountActive = true
): SectionAccessLevel {
  if (!isAccountActive) return 'none'
  if (isFullAdmin) return 'full'
  if (moduleName === 'Inicio') return 'full'
  const explicit = sectionAccess?.[moduleName]?.[sectionName]
  if (explicit) return explicit
  return 'none'
}

export function canCreateInSection(
  moduleName: string,
  sectionName: string,
  sectionAccess?: RoleSectionPermissions,
  isFullAdmin = false,
  isAccountActive = true
): boolean {
  return levelAllowsHttpMethod(
    getSectionAccessLevel(moduleName, sectionName, sectionAccess, isFullAdmin, isAccountActive),
    'POST'
  )
}

export function canEditInSection(
  moduleName: string,
  sectionName: string,
  sectionAccess?: RoleSectionPermissions,
  isFullAdmin = false,
  isAccountActive = true
): boolean {
  return levelAllowsHttpMethod(
    getSectionAccessLevel(moduleName, sectionName, sectionAccess, isFullAdmin, isAccountActive),
    'PUT'
  )
}

export function canDeleteInSection(
  moduleName: string,
  sectionName: string,
  sectionAccess?: RoleSectionPermissions,
  isFullAdmin = false,
  isAccountActive = true
): boolean {
  return levelAllowsHttpMethod(
    getSectionAccessLevel(moduleName, sectionName, sectionAccess, isFullAdmin, isAccountActive),
    'DELETE'
  )
}

export function canAccessSection(
  moduleName: string,
  sectionName: string,
  capabilities: Set<RoleCapabilityId>,
  isFullAdmin: boolean,
  isAccountActive = true,
  sectionAccess?: RoleSectionPermissions
): boolean {
  if (!isAccountActive) return false
  if (isFullAdmin) return true
  if (moduleName === 'Inicio') return true
  if (sectionAccess && sectionAccess[moduleName] && sectionAccess[moduleName][sectionName]) {
    return sectionAccess[moduleName][sectionName] !== 'none'
  }
  const moduleReqs = SECTION_CAPABILITY_REQUIREMENTS[moduleName]
  if (!moduleReqs) return true
  const reqs = moduleReqs[sectionName]
  if (!reqs) return true
  if (reqs.length === 0) return true
  return reqs.some((cap) => capabilities.has(cap))
}

export function canAccessModule(
  moduleName: string,
  capabilities: Set<RoleCapabilityId>,
  isFullAdmin: boolean,
  isAccountActive = true,
  sectionAccess?: RoleSectionPermissions
): boolean {
  if (!isAccountActive) return moduleName === 'Inicio'
  if (isFullAdmin) return true
  if (moduleName === 'Inicio') return true
  const sections = MODULE_SECTIONS[moduleName as keyof typeof MODULE_SECTIONS]
  if (!sections) return true
  return sections.some((sec) =>
    canAccessSection(moduleName, sec, capabilities, isFullAdmin, isAccountActive, sectionAccess)
  )
}

export function getFirstAccessibleSection(
  moduleName: keyof typeof MODULE_SECTIONS,
  capabilities: Set<RoleCapabilityId>,
  isFullAdmin: boolean,
  isAccountActive = true,
  sectionAccess?: RoleSectionPermissions
): string | null {
  const sections = MODULE_SECTIONS[moduleName]
  for (const sec of sections) {
    if (
      canAccessSection(moduleName, sec, capabilities, isFullAdmin, isAccountActive, sectionAccess)
    ) {
      return sec
    }
  }
  return null
}

