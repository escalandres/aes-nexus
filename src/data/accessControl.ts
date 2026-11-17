import {
  ALL_CAPABILITIES,
  isGeneralAdminRole,
  type RoleCapabilityId,
  type RoleDefinition,
  type RoleKey,
} from './settings'

export const ACTIVE_SESSION_STORAGE_KEY = 'aes_nexus_active_session_v1'

export const MODULE_SECTIONS = {
  CRM: ['Resumen', 'Clientes', 'Proveedores', 'Empleados', 'Nómina', 'Oportunidades', 'Actividades'],
  Ventas: ['Catálogo', 'Cotizaciones', 'Pedidos', 'Facturas', 'Resumen'],
  Operaciones: ['Inventario', 'Traslados', 'Compras', 'Entregas', 'Resumen'],
  Finanzas: ['Cobros', 'Pagos', 'Pagos Bancarios', 'Gastos', 'Cuentas contables', 'Resumen'],
  Administración: ['Departamentos', 'Ubicaciones', 'Resumen', 'Historial de Auditoría'],
  Configuración: [
    'General',
    'Organización',
    'Idioma y región',
    'Usuarios',
    'Roles y permisos',
    'Seguridad',
    'Apariencia',
    'Notificaciones',
    'Auditoría',
    'Integraciones',
    'Plan y facturación',
  ],
} as const

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
} {
  if (!isAccountActive) {
    return { isFullAdmin: false, capabilities: new Set() }
  }
  const caps = new Set<RoleCapabilityId>()
  let isFullAdmin = false

  for (const roleId of assignedRoles) {
    const def = roleDefinitions.find((r) => r.id === roleId)
    if (isGeneralAdminRole(def) || roleId === 'Administrador') {
      isFullAdmin = true
      for (const c of ALL_CAPABILITIES) caps.add(c.id)
      continue
    }
    if (def) {
      for (const capId of def.capabilities) caps.add(capId)
    }
  }

  return { isFullAdmin, capabilities: caps }
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

export function canAccessSection(
  moduleName: string,
  sectionName: string,
  capabilities: Set<RoleCapabilityId>,
  isFullAdmin: boolean,
  isAccountActive = true
): boolean {
  if (!isAccountActive) return false
  if (isFullAdmin) return true
  if (moduleName === 'Inicio') return true
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
  isAccountActive = true
): boolean {
  if (!isAccountActive) return moduleName === 'Inicio'
  if (isFullAdmin) return true
  if (moduleName === 'Inicio') return true
  const sections = MODULE_SECTIONS[moduleName as keyof typeof MODULE_SECTIONS]
  if (!sections) return true
  return sections.some((sec) => canAccessSection(moduleName, sec, capabilities, isFullAdmin, isAccountActive))
}

export function getFirstAccessibleSection(
  moduleName: keyof typeof MODULE_SECTIONS,
  capabilities: Set<RoleCapabilityId>,
  isFullAdmin: boolean,
  isAccountActive = true
): string | null {
  const sections = MODULE_SECTIONS[moduleName]
  for (const sec of sections) {
    if (canAccessSection(moduleName, sec, capabilities, isFullAdmin, isAccountActive)) {
      return sec
    }
  }
  return null
}
