import { useEffect, useState, useMemo, useRef, type FormEvent } from 'react'
import {
  ArrowRight, ArrowUpRight, Bell, BellRing, BriefcaseBusiness,
  CalendarDays, ChevronDown, CircleHelp, Clock3, Edit3, Eye,
  FolderKanban, Landmark, LayoutDashboard, Menu,
  MoreHorizontal, Plus, Search, Settings2, ShoppingBag, ShoppingCart, Sparkles,
  Target, Users, WalletCards, Warehouse as WarehouseIcon, ShieldCheck, X,
  Check, MapPin, AlertTriangle, SlidersHorizontal, CheckCircle2, Package,
  LockKeyhole, ShieldAlert, UserCheck, CheckCheck, Truck, Receipt, FileText, RotateCcw,
  LogIn, LogOut, BarChart3, BadgeCheck, Trash2,
} from 'lucide-react'
import { activities, opportunities } from './data/dashboard'
import { ExecutiveDashboard } from './components/ExecutiveDashboard'
import { createClientApi, type ClientAddress } from './services/clientService'
import CountryDropdown, { countries, findCountry } from './components/CountryDropdown'
import { CountryFlag } from './components/CountryFlag'
import { ToastProvider, useToast } from './components/Toast'
import { I18nProvider, useI18n } from './i18n/I18nContext'
import type { TranslationKey } from './i18n/translations'
import { SettingsSection } from './components/SettingsSection'
import { RoleSessionSelectorModal } from './components/RoleSessionSelectorModal'
import { CrmEmployees } from './components/CrmEmployees'
import { CrmPayroll } from './components/CrmPayroll'
import { DirectorySheetModal, DirectoryEditModal } from './components/DirectorySheetModal'
import {
  initialEmployees,
  isEmployeeSystemUser,
  type EmployeeRecord,
} from './data/employees'
import {
  CATEGORY_STOCK_THRESHOLDS_CHANGED_EVENT,
  ROLES_CHANGED_EVENT,
  STORAGE_KEYS,
  USERS_CHANGED_EVENT,
  appendAuditLog,
  buildProductCategoryLookup,
  detectClientDeviceBrowser,
  getWorkspaceUserRoleIds,
  loadStoredCategoryStockThresholds,
  loadStoredRoleDefinitions,
  loadStoredWorkspaceUsers,
  readStoredJson,
  resolveEffectiveStockThreshold,
  resolveSessionIpAddress,
  saveStoredCategoryStockThresholds,
  writeStoredJson,
  type CategoryStockThresholdRule,
  type RoleDefinition,
  type RoleKey,
  type WorkspaceUserRecord,
} from './data/settings'
import {
  ACTIVE_SESSION_STORAGE_KEY,
  CAPABILITY_LABELS_ES,
  canAccessModule,
  canAccessSection,
  canCreateInSection,
  canDeleteInSection,
  canEditInSection,
  getFirstAccessibleSection,
  getRequiredCapabilities,
  resolveEffectiveAccess,
} from './data/accessControl'
import { initialPayrollRuns, type PayrollRunRecord } from './data/payroll'
import { ProductsAndServices } from './components/ProductsAndServices'
import { QuotesSection } from './components/QuotesSection'
import { OrdersSection } from './components/OrdersSection'
import { SalesInvoices } from './components/SalesInvoices'
import { SalesOverview } from './components/SalesOverview'
import { initialQuotes, initialOrders, type Quote, type SalesOrder, type SalesSectionTab } from './data/sales'
import { initialProductsAndServices } from './data/products'
import { OperationsInventory } from './components/OperationsInventory'
import { OperationsTransfers } from './components/OperationsTransfers'
import { OperationsPurchases } from './components/OperationsPurchases'
import { OperationsDeliveries } from './components/OperationsDeliveries'
import { OperationsOverview } from './components/OperationsOverview'
import { PurchasesOverview } from './components/PurchasesOverview'
import { PurchasesRequisitions } from './components/PurchasesRequisitions'
import { PurchasesReceptions } from './components/PurchasesReceptions'
import { PurchasesInvoices } from './components/PurchasesInvoices'
import { SalesReturnsSection } from './components/SalesReturnsSection'
import { PurchasesReturnsSection } from './components/PurchasesReturnsSection'
import {
  canUserApproveWorkflowStep,
  doesTransitionRequireApproval,
  getAllowedNextStatusesForReturn,
  getDefaultInitialStatusForReturn,
  isReturnDeleteBlocked,
  isReturnEditBlocked,
  loadStoredCustomerReturns,
  loadStoredReturnWorkflows,
  loadStoredSupplierReturns,
  saveStoredCustomerReturns,
  saveStoredReturnWorkflows,
  saveStoredSupplierReturns,
  type CustomerReturn,
  type CustomerReturnStatus,
  type ReturnWorkflowsSettings,
  type SupplierReturn,
  type SupplierReturnStatus,
} from './data/returns'
import {
  initialRequisitions,
  type PurchaseRequisition,
  type PurchasesSectionTab,
} from './data/purchases'
import {
  initialWarehouses,
  initialInventory,
  initialTransfers,
  initialMovements,
  initialPurchaseOrders,
  initialShipments,
  type Warehouse,
  type InventoryItemLocation,
  type InventoryTransfer,
  type StockMovement,
  type PurchaseOrder,
  type ShipmentDelivery,
} from './data/operations'
import { FinanceReceivables } from './components/FinanceReceivables'
import { FinancePayables } from './components/FinancePayables'
import {
  FinanceCompanyExpenses,
  type ExpensesSectionTab,
} from './components/FinanceCompanyExpenses'
import { FinanceOverview } from './components/FinanceOverview'
import { FinanceAccounting } from './components/FinanceAccounting'
import { FinanceEbp } from './components/FinanceEbp'
import { EbpBatchWizardModal, type EbpWizardCandidateLine } from './components/EbpBatchWizardModal'
import { SupplierBankAccountsManager } from './components/SupplierBankAccountsManager'
import {
  getPreferredSupplierBankAccount,
  initialBankFormatPacks,
  initialEbpBatches,
  makeValidClabe,
  normalizeSupplierBankAccounts,
  type BankFormatPack,
  type EbpAggregationMode,
  type ElectronicPaymentBatch,
  type SupplierBankAccount,
} from './data/ebp'
import {
  AdministrationSection,
  type AdminSectionTab,
  type DepartmentRecord,
  type PhysicalLocationRecord,
  type SubsidiaryRecord,
} from './components/AdministrationSection'
import { ReportsSection, type ReportsSectionTab } from './components/ReportsSection'
import {
  initialBankAccounts,
  initialReceivables,
  initialPayables,
  initialExpenses,
  initialExpenseBudgets,
  initialRecurringExpenses,
  initialTransactions,
  initialChartAccounts,
  type BankAccount,
  type InvoiceReceivable,
  type BillPayable,
  type ExpenseRecord,
  type ExpenseBudgetRule,
  type ExpenseStatus,
  type RecurringExpenseTemplate,
  type PaymentTransaction,
  type ChartAccount,
} from './data/finance'

const sections: { labelKey: TranslationKey; items: { name: string; labelKey: TranslationKey; icon: typeof LayoutDashboard; count?: string }[] }[] = [
  { labelKey: 'nav.workspace', items: [{ name: 'Inicio', labelKey: 'nav.home', icon: LayoutDashboard }] },
  { labelKey: 'nav.modules', items: [
    { name: 'CRM', labelKey: 'nav.crm', icon: Users, count: 'H2' },
    { name: 'Ventas', labelKey: 'nav.sales', icon: ShoppingBag, count: 'H2' },
    { name: 'Compras', labelKey: 'nav.purchases', icon: ShoppingCart, count: 'H3' },
    { name: 'Operaciones', labelKey: 'nav.operations', icon: WarehouseIcon, count: 'H3' },
    { name: 'Finanzas', labelKey: 'nav.finance', icon: WalletCards, count: 'H3' },
    { name: 'Gastos', labelKey: 'nav.expenses', icon: Receipt, count: 'OPS' },
    { name: 'Reportes', labelKey: 'nav.reports', icon: BarChart3, count: 'BI' },
    { name: 'Administración', labelKey: 'nav.admin', icon: ShieldCheck, count: 'H1' },
  ] },
]

const moduleDetails = {
  CRM: { icon: Users, phase: 'H2 · Piloto comercial', description: 'Centraliza las relaciones y el seguimiento comercial de tu organización.', areas: ['Empresas y contactos', 'Empleados y colaboradores', 'Nómina de empleados', 'Oportunidades y pipeline', 'Actividades y seguimiento'] },
  Ventas: { icon: ShoppingBag, phase: 'H2 · Piloto comercial', description: 'Acompaña el proceso desde una cotización y pedido hasta la factura de venta sincronizada con Finanzas.', areas: ['Catálogo de productos y servicios', 'Cotizaciones y aprobaciones', 'Pedidos de venta', 'Facturas de venta y CxC'] },
  Compras: { icon: ShoppingCart, phase: 'H3 · MVP operativo', description: 'Centraliza requisiciones internas, órdenes de compra a proveedores, recepciones en almacén y facturas sincronizadas con Finanzas.', areas: ['Requisiciones y aprobación', 'Órdenes de compra', 'Recepciones en andén', 'Facturas de proveedor (CxP)'] },
  Operaciones: { icon: WarehouseIcon, phase: 'H3 · MVP operativo', description: 'Organiza el movimiento de productos desde compras y recepción hasta la entrega.', areas: ['Inventario por almacén', 'Traslados entre ubicaciones', 'Compras y recepciones', 'Entregas y devoluciones'] },
  Finanzas: { icon: WalletCards, phase: 'H3 · MVP operativo', description: 'Da seguimiento a saldos, cobros, pagos y gastos con finanzas operativas.', areas: ['Cuentas por cobrar y cobros', 'Cuentas por pagar', 'Gastos y reportes'] },
  Gastos: { icon: Receipt, phase: 'OPS · Control de egresos', description: 'Control integral de egresos, flujo de autorización y pago, presupuestos por naturaleza y plantillas recurrentes.', areas: ['Resumen y control', 'Registro y pólizas', 'Presupuestos y alertas', 'Gastos recurrentes'] },
  Reportes: { icon: BarChart3, phase: 'BI · Analítica ERP', description: 'Inteligencia financiera y operativa consolidada en tiempo real con exportación CSV e impresión.', areas: ['Resumen ejecutivo', 'Estado de Resultados', 'Finanzas y Tesorería', 'CxP y Pagos EBP', 'Ventas, Inventario y Nómina'] },
  Administración: { icon: ShieldCheck, phase: 'H1 · Núcleo del sistema', description: 'Gestiona la estructura organizativa interna: subsidiarias, departamentos, sedes físicas, centros de costos e historial de auditoría.', areas: ['Subsidiarias y razones sociales', 'Departamentos y líderes', 'Ubicaciones físicas y sedes', 'Historial de auditoría'] },
} as const

type DirectoryRecord = {
  clientCode?: string
  supplierCode?: string
  name: string
  company: string
  email: string
  phone: string
  status: string
  lastActivity: string
  initials: string
  color: string
  rfc?: string
  entityType?: 'company' | 'individual'
  currency?: 'MXN' | 'USD'
  paymentTerms?: string
  city?: string
  state?: string
  country?: string
  notes?: string
  addresses?: ClientAddress[]
  bankName?: string
  clabe?: string
  accountNumber?: string
  defaultReference?: string
  bankPackValues?: Record<string, Record<string, string>>
  bankAccounts?: SupplierBankAccount[]
}

const clients: DirectoryRecord[] = [
  { clientCode: 'CLI-001', name: 'Sofía Ramírez', company: 'Estudio Nómada', email: 'sofia@estudionomada.mx', phone: '55 2184 6301', status: 'Activo', lastActivity: 'Hoy', initials: 'SR', color: 'lilac', rfc: 'ENO190520AB1', entityType: 'company', currency: 'MXN', paymentTerms: 'Contado', country: 'MX', city: 'CDMX', addresses: [{ id: 'a1', street: 'Colima 245, Roma Norte', city: 'Ciudad de México', state: 'CDMX', zipCode: '06700', country: 'MX', isShipping: true, isBilling: true }] },
  { clientCode: 'CLI-002', name: 'Diego Fernández', company: 'Taller Norte', email: 'diego@tallernorte.mx', phone: '81 3045 1120', status: 'Activo', lastActivity: 'Ayer', initials: 'DF', color: 'peach', rfc: 'FED901102XX3', entityType: 'individual', currency: 'MXN', paymentTerms: 'Crédito 15 días', country: 'MX', city: 'Monterrey', addresses: [{ id: 'a2', street: 'Av. Constitución 1400', city: 'Monterrey', state: 'Nuevo León', zipCode: '64000', country: 'MX', isShipping: true, isBilling: false }] },
  { clientCode: 'CLI-003', name: 'Valentina Ruiz', company: 'Casa Oliva', email: 'valentina@casaoliva.mx', phone: '33 1470 9822', status: 'Prospecto', lastActivity: 'Ayer', initials: 'VR', color: 'sage', rfc: 'COL210314TY7', entityType: 'company', currency: 'MXN', paymentTerms: 'Contado', country: 'MX', city: 'Guadalajara', addresses: [{ id: 'a3', street: 'Av. Chapultepec 480', city: 'Guadalajara', state: 'Jalisco', zipCode: '44160', country: 'MX', isShipping: false, isBilling: true }] },
  { clientCode: 'CLI-004', name: 'Mateo Cruz', company: 'Lumen Studio', email: 'mateo@lumenstudio.mx', phone: '55 7740 2108', status: 'Activo', lastActivity: '12 nov', initials: 'MC', color: 'blue', rfc: 'LUM180905MK8', entityType: 'company', currency: 'MXN', paymentTerms: 'Crédito 30 días', country: 'MX', city: 'CDMX' },
  { clientCode: 'CLI-005', name: 'Camila Torres', company: 'Punto Cero', email: 'camila@puntocero.mx', phone: '55 4402 7718', status: 'Inactivo', lastActivity: '28 oct', initials: 'CT', color: 'amber', rfc: 'PCE160719881', entityType: 'company', currency: 'MXN', paymentTerms: 'Contado', country: 'MX', city: 'Puebla' },
]

const suppliers: DirectoryRecord[] = [
  {
    supplierCode: 'PRV-001',
    name: 'Distribuidora Atlas',
    company: 'Atlas Comercial',
    email: 'contacto@atlascomercial.mx',
    phone: '55 3055 4820',
    status: 'Activo',
    lastActivity: 'Hoy',
    initials: 'DA',
    color: 'blue',
    rfc: 'ACO170812K90',
    currency: 'MXN',
    bankName: 'BBVA México',
    clabe: makeValidClabe('01218000512098761'),
    accountNumber: '0512098761',
    defaultReference: '1049201',
    bankPackValues: { pack_banorte_bem_pagos: { operationCode: '04', destBankCode: '012' } },
    bankAccounts: [
      {
        id: 'sba_atlas_1',
        alias: 'BBVA Principal Mercancía',
        bankName: 'BBVA México',
        clabe: makeValidClabe('01218000512098761'),
        accountNumber: '0512098761',
        currency: 'MXN',
        defaultReference: '1049201',
        isDefault: true,
        active: true,
        bankPackValues: { pack_banorte_bem_pagos: { operationCode: '04', destBankCode: '012' } },
      },
      {
        id: 'sba_atlas_2',
        alias: 'Banorte Operativa Logística',
        bankName: 'Banorte',
        clabe: makeValidClabe('07218000912044551'),
        accountNumber: '0912044551',
        currency: 'MXN',
        defaultReference: '1049209',
        isDefault: false,
        active: true,
        bankPackValues: { pack_banorte_bem_pagos: { operationCode: '01', destBankCode: '072' } },
      },
    ],
    country: 'MX',
    city: 'CDMX',
    addresses: [{ id: 's1', street: 'Calz. Vallejo 1020, Bodega 4', city: 'Azcapotzalco', state: 'CDMX', zipCode: '02300', country: 'MX', isShipping: true, isBilling: true }],
  },
  {
    supplierCode: 'PRV-002',
    name: 'Papelería Central',
    company: 'Central de Insumos',
    email: 'ventas@centralinsumos.mx',
    phone: '81 2104 6651',
    status: 'Activo',
    lastActivity: '3 nov',
    initials: 'PC',
    color: 'sage',
    rfc: 'CIN190305AB4',
    currency: 'MXN',
    bankName: 'Banorte',
    clabe: makeValidClabe('07258000334455112'),
    accountNumber: '0334455112',
    defaultReference: '2055102',
    bankPackValues: { pack_banorte_bem_pagos: { operationCode: '01', destBankCode: '072' } },
    bankAccounts: [
      {
        id: 'sba_central_1',
        alias: 'Banorte Cuenta Principal',
        bankName: 'Banorte',
        clabe: makeValidClabe('07258000334455112'),
        accountNumber: '0334455112',
        currency: 'MXN',
        defaultReference: '2055102',
        isDefault: true,
        active: true,
        bankPackValues: { pack_banorte_bem_pagos: { operationCode: '01', destBankCode: '072' } },
      },
      {
        id: 'sba_central_2',
        alias: 'Santander Sucursal Monterrey',
        bankName: 'Santander',
        clabe: makeValidClabe('01458000778899001'),
        accountNumber: '7788990012',
        currency: 'MXN',
        defaultReference: '2055199',
        isDefault: false,
        active: true,
        bankPackValues: { pack_banorte_bem_pagos: { operationCode: '04', destBankCode: '014' } },
      },
    ],
    country: 'MX',
  },
  { supplierCode: 'PRV-003', name: 'Logística del Valle', company: 'Logística del Valle', email: 'operaciones@logisticavalle.mx', phone: '33 3810 9920', status: 'Prospecto', lastActivity: '30 oct', initials: 'LV', color: 'lilac', rfc: 'LVA200918RT2', currency: 'MXN', bankName: 'Santander', clabe: makeValidClabe('01432000991122334'), accountNumber: '9911223340', defaultReference: '3091122', bankPackValues: { pack_banorte_bem_pagos: { operationCode: '04', destBankCode: '014' } }, country: 'MX' },
  { supplierCode: 'PRV-004', name: 'Servicios Nube', company: 'Nube Digital', email: 'soporte@nubedigital.mx', phone: '55 7284 1176', status: 'Activo', lastActivity: '25 oct', initials: 'SN', color: 'peach', rfc: 'NDI181122M88', currency: 'MXN', bankName: 'HSBC', clabe: makeValidClabe('02118000665544332'), accountNumber: '6655443320', defaultReference: '4066554', bankPackValues: { pack_banorte_bem_pagos: { operationCode: '04', destBankCode: '021' } }, country: 'MX' },
]

const initialSubsidiaries: SubsidiaryRecord[] = [
  {
    id: 'sub_1',
    code: 'SUB-MX',
    name: 'AES Nexus México (Matriz)',
    legalName: 'AES Nexus Corporativo México S.A. de C.V.',
    taxId: 'ANM210412KX8',
    country: 'México',
    currency: 'MXN',
    legalRep: 'Andrea Morales',
    fiscalAddress: 'Paseo de la Reforma 222, Piso 14, Cuauhtémoc, CDMX',
    isHolding: true,
    active: true,
  },
  {
    id: 'sub_2',
    code: 'SUB-NTE',
    name: 'AES Nexus Norte Operaciones',
    legalName: 'AES Nexus Norte Logística S.A.P.I. de C.V.',
    taxId: 'ANN220815PL4',
    country: 'México',
    currency: 'MXN',
    legalRep: 'Roberto Santos',
    fiscalAddress: 'Av. Constitución 1400, Monterrey, Nuevo León',
    isHolding: false,
    active: true,
  },
  {
    id: 'sub_3',
    code: 'SUB-OCC',
    name: 'AES Nexus Occidente Comercial',
    legalName: 'AES Nexus Occidente S. de R.L. de C.V.',
    taxId: 'ANO230309TR1',
    country: 'México',
    currency: 'MXN',
    legalRep: 'Carlos Méndez',
    fiscalAddress: 'Av. Chapultepec 480, Guadalajara, Jalisco',
    isHolding: false,
    active: true,
  },
]

const initialDepartments: DepartmentRecord[] = [
  { id: 'dep_1', code: 'DIR-01', name: 'Dirección General', leader: 'Andrea Morales', costCenter: 'CC-100', description: 'Toma de decisiones estratégicas y gobierno corporativo.', subsidiaryIds: ['sub_1', 'sub_2', 'sub_3'], active: true },
  { id: 'dep_2', code: 'OPE-02', name: 'Operaciones y Logística', leader: 'Roberto Santos', costCenter: 'CC-200', description: 'Control de inventarios, compras, almacén y distribución.', subsidiaryIds: ['sub_1', 'sub_2'], active: true },
  { id: 'dep_3', code: 'FIN-03', name: 'Finanzas y Tesorería', leader: 'Gabriela Morales', costCenter: 'CC-300', description: 'Flujo de caja, cuentas por cobrar, pagos e impuestos.', subsidiaryIds: ['sub_1', 'sub_2', 'sub_3'], active: true },
  { id: 'dep_4', code: 'VEN-04', name: 'Ventas y Comercial', leader: 'Carlos Méndez', costCenter: 'CC-400', description: 'Prospección, cotizaciones, pedidos y atención a cuentas.', subsidiaryIds: ['sub_1', 'sub_3'], active: true },
  { id: 'dep_5', code: 'TEC-05', name: 'Tecnología y Sistemas', leader: 'Laura R.', costCenter: 'CC-500', description: 'Infraestructura TI, software ERP y soporte técnico.', subsidiaryIds: ['sub_1'], active: true },
]

const initialLocations: PhysicalLocationRecord[] = [
  { id: 'loc_1', code: 'CORP-CDMX', name: 'Sede Corporativa Reforma', type: 'Oficina corporativa', address: 'Paseo de la Reforma 222, Piso 14', city: 'Ciudad de México', state: 'CDMX', country: 'México', manager: 'Andrea Morales', subsidiaryIds: ['sub_1'], active: true },
  { id: 'loc_2', code: 'ALM-VALLEJO', name: 'Almacén Central Vallejo', type: 'Almacén / Bodega', address: 'Calz. Vallejo 1020, Bodega 4', city: 'Azcapotzalco', state: 'CDMX', country: 'México', manager: 'Roberto Santos', subsidiaryIds: ['sub_1', 'sub_2'], active: true },
  { id: 'loc_3', code: 'SUC-MTY', name: 'Sucursal y Bodega Monterrey', type: 'Sucursal', address: 'Av. Constitución 1400', city: 'Monterrey', state: 'Nuevo León', country: 'México', manager: 'Diego Fernández', subsidiaryIds: ['sub_2'], active: true },
  { id: 'loc_4', code: 'SUC-GDL', name: 'Punto de Operación Guadalajara', type: 'Punto de venta', address: 'Av. Chapultepec 480', city: 'Guadalajara', state: 'Jalisco', country: 'México', manager: 'Valentina Ruiz', subsidiaryIds: ['sub_1', 'sub_3'], active: true },
]

function loadStoredSubsidiaries(): SubsidiaryRecord[] {
  const raw = readStoredJson<SubsidiaryRecord[] | null>(STORAGE_KEYS.subsidiaries, null)
  if (!Array.isArray(raw)) return initialSubsidiaries
  return raw
    .filter((item): item is SubsidiaryRecord => Boolean(item && typeof item.id === 'string' && typeof item.name === 'string'))
    .map((item) => ({
      ...item,
      code: String(item.code || '').toUpperCase(),
      country: item.country || 'México',
      currency: String(item.currency || 'MXN').toUpperCase(),
      isHolding: Boolean(item.isHolding),
      active: item.active !== false,
    }))
}

function normalizeSubsidiaryIdsList(ids: unknown, validSubIds: Set<string>, fallbackIds: string[] = []): string[] {
  if (!Array.isArray(ids)) return fallbackIds.filter((id) => validSubIds.has(id))
  const seen = new Set<string>()
  const next: string[] = []
  for (const rawId of ids) {
    if (typeof rawId !== 'string' || !validSubIds.has(rawId) || seen.has(rawId)) continue
    seen.add(rawId)
    next.push(rawId)
  }
  return next
}

function loadStoredDepartments(validSubIds: Set<string>): DepartmentRecord[] {
  const raw = readStoredJson<DepartmentRecord[] | null>(STORAGE_KEYS.departments, null)
  if (!Array.isArray(raw)) return initialDepartments
  return raw
    .filter((item): item is DepartmentRecord => Boolean(item && typeof item.id === 'string' && typeof item.name === 'string'))
    .map((item) => {
      const seedMatch = initialDepartments.find((d) => d.id === item.id)
      return {
        ...item,
        code: String(item.code || '').toUpperCase(),
        subsidiaryIds: normalizeSubsidiaryIdsList(
          item.subsidiaryIds,
          validSubIds,
          seedMatch?.subsidiaryIds || []
        ),
        active: item.active !== false,
      }
    })
}

function loadStoredLocations(validSubIds: Set<string>): PhysicalLocationRecord[] {
  const raw = readStoredJson<PhysicalLocationRecord[] | null>(STORAGE_KEYS.locations, null)
  if (!Array.isArray(raw)) return initialLocations
  return raw
    .filter((item): item is PhysicalLocationRecord => Boolean(item && typeof item.id === 'string' && typeof item.name === 'string'))
    .map((item) => {
      const seedMatch = initialLocations.find((l) => l.id === item.id)
      return {
        ...item,
        code: String(item.code || '').toUpperCase(),
        country: item.country || 'México',
        subsidiaryIds: normalizeSubsidiaryIdsList(
          item.subsidiaryIds,
          validSubIds,
          seedMatch?.subsidiaryIds || []
        ),
        active: item.active !== false,
      }
    })
}

function buildWarehousesFromLocations(persistedLocations: PhysicalLocationRecord[]): Warehouse[] {
  const matchedLocationIds = new Set<string>()
  const syncedDefaults = initialWarehouses
    .map((w) => {
      const matched = persistedLocations.find(
        (l) =>
          l.id === w.locationId ||
          l.code.toLowerCase() === w.code.toLowerCase() ||
          l.name.toLowerCase() === w.name.toLowerCase()
      )
      if (!matched) {
        return w.locationId ? null : w
      }
      matchedLocationIds.add(matched.id)
      return {
        ...w,
        active: matched.active,
        name: matched.name,
        city: matched.city,
        state: matched.state,
        address: matched.address,
        locationType: matched.type,
      }
    })
    .filter((w): w is Warehouse => w !== null)

  const extraWarehouses: Warehouse[] = persistedLocations
    .filter(
      (loc) =>
        !matchedLocationIds.has(loc.id) &&
        loc.id !== 'loc_1' &&
        !syncedDefaults.some(
          (w) =>
            w.locationId === loc.id ||
            w.code.toLowerCase() === loc.code.toLowerCase() ||
            w.name.toLowerCase() === loc.name.toLowerCase()
        )
    )
    .map((loc) => ({
      id: `wh_${loc.id}`,
      code: loc.code,
      name: loc.name,
      city: loc.city,
      state: loc.state,
      address: loc.address,
      capacityPercentage: 0,
      isDefault: false,
      active: loc.active,
      locationId: loc.id,
      locationType: loc.type,
    }))

  return [...syncedDefaults, ...extraWarehouses]
}

const accentOptions = [
  { id: 'green', label: 'Verde', color: '#456a61', description: 'Natural y equilibrado' },
  { id: 'blue', label: 'Azul', color: '#3f6f9f', description: 'Claro y profesional' },
  { id: 'purple', label: 'Morado', color: '#7860a6', description: 'Creativo y distintivo' },
  { id: 'terracotta', label: 'Terracota', color: '#b96e56', description: 'Cálido y cercano' },
] as const
type AccentTheme = typeof accentOptions[number]['id']
type CreateKind = 'client' | 'supplier' | 'opportunity' | 'activity'

const money = (value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value)

const SPANISH_MONTH_INDEX: Record<string, number> = {
  ene: 0, enero: 0,
  feb: 1, febrero: 1,
  mar: 2, marzo: 2,
  abr: 3, abril: 3,
  may: 4, mayo: 4,
  jun: 5, junio: 5,
  jul: 6, julio: 6,
  ago: 7, agosto: 7,
  sep: 8, sept: 8, septiembre: 8,
  oct: 9, octubre: 9,
  nov: 10, noviembre: 10,
  dic: 11, diciembre: 11,
}

const isDateInCurrentMonth = (rawDate: string, reference: Date): boolean => {
  const targetMonth = reference.getMonth()
  const targetYear = reference.getFullYear()
  const trimmed = rawDate.trim().toLowerCase()
  const spanishMatch = trimmed.match(/^(\d{1,2})\s+([a-záéíóú]+)\.?\s+(\d{4})$/i)
  if (spanishMatch) {
    const m = SPANISH_MONTH_INDEX[spanishMatch[2]]
    const y = Number(spanishMatch[3])
    return m === targetMonth && y === targetYear
  }
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    return Number(isoMatch[1]) === targetYear && Number(isoMatch[2]) - 1 === targetMonth
  }
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashMatch) {
    return Number(slashMatch[3]) === targetYear && Number(slashMatch[2]) - 1 === targetMonth
  }
  return false
}

const pageRoutes: Record<string, string> = {
  Inicio: '/',
  CRM: '/crm',
  Ventas: '/sales',
  Compras: '/purchases',
  Operaciones: '/operations',
  Finanzas: '/finance',
  Gastos: '/expenses',
  Reportes: '/reports',
  Administración: '/admin',
  Configuración: '/settings',
}

const pageFromPath = (pathname: string) => {
  if (pathname.startsWith('/crm')) return 'CRM'
  if (pathname.startsWith('/sales') || pathname.startsWith('/ventas')) return 'Ventas'
  if (
    pathname.startsWith('/purchases') ||
    pathname.startsWith('/compras') ||
    pathname === '/vendorbill' ||
    pathname === '/vendorbills'
  ) {
    return 'Compras'
  }
  if (pathname.startsWith('/operations') || pathname.startsWith('/operaciones')) return 'Operaciones'
  if (
    pathname === '/finance/company-expenses' ||
    pathname === '/finance/gastos-empresa' ||
    pathname === '/finanzas/gastos-empresa' ||
    pathname === '/finance/expenses' ||
    pathname === '/finance/gastos' ||
    pathname === '/finanzas/gastos'
  ) {
    return 'Gastos'
  }
  if (pathname.startsWith('/finance') || pathname.startsWith('/finanzas')) return 'Finanzas'
  if (pathname.startsWith('/expenses') || pathname.startsWith('/gastos')) return 'Gastos'
  if (pathname.startsWith('/reports') || pathname.startsWith('/reportes')) return 'Reportes'
  if (pathname.startsWith('/admin') || pathname.startsWith('/administracion')) return 'Administración'
  const normalized = pathname.replace(/\/$/, '') || '/'
  return Object.entries(pageRoutes).find(([, route]) => route === normalized)?.[0] ?? 'Inicio'
}

const purchasesSectionFromPath = (pathname: string): PurchasesSectionTab =>
  pathname === '/purchases/requisitions' || pathname === '/compras/requisiciones'
    ? 'Requisiciones'
    : pathname === '/purchases/orders' || pathname === '/compras/ordenes'
    ? 'Órdenes de compra'
    : pathname === '/purchases/receptions' || pathname === '/compras/recepciones'
    ? 'Recepciones'
    : pathname === '/purchases/vendorbill' ||
      pathname === '/purchases/vendorbills' ||
      pathname === '/purchases/vendor-bills' ||
      pathname === '/vendorbill' ||
      pathname === '/vendorbills' ||
      pathname === '/purchases/invoices' ||
      pathname === '/compras/facturas'
    ? 'Facturas'
    : pathname === '/purchases/returns' || pathname === '/compras/devoluciones'
    ? 'Devoluciones'
    : 'Resumen'

const crmSectionFromPath = (pathname: string) =>
  pathname === '/crm/customers' || pathname === '/crm/clients' || pathname === '/crm/clientes'
    ? 'Clientes'
    : pathname === '/crm/vendors' || pathname === '/crm/suppliers' || pathname === '/crm/proveedores'
    ? 'Proveedores'
    : pathname === '/crm/employees' || pathname === '/crm/empleados'
    ? 'Empleados'
    : pathname === '/crm/payroll' || pathname === '/crm/nomina'
    ? 'Nómina'
    : pathname === '/crm/opportunities' || pathname === '/crm/oportunidades'
    ? 'Oportunidades'
    : pathname === '/crm/activities' || pathname === '/crm/actividades'
    ? 'Actividades'
    : 'Resumen'

const salesSectionFromPath = (pathname: string): SalesSectionTab =>
  pathname === '/sales/quotes' || pathname === '/ventas/cotizaciones'
    ? 'Cotizaciones'
    : pathname === '/sales/orders' || pathname === '/ventas/pedidos'
    ? 'Pedidos'
    : pathname === '/sales/invoices' || pathname === '/ventas/facturas'
    ? 'Facturas'
    : pathname === '/sales/returns' || pathname === '/ventas/devoluciones'
    ? 'Devoluciones'
    : pathname === '/sales/summary' || pathname === '/ventas/resumen'
    ? 'Resumen'
    : 'Catálogo'

const operationsSectionFromPath = (pathname: string) =>
  pathname === '/operations/transfers' || pathname === '/operations/traslados' || pathname === '/operaciones/traslados'
    ? 'Traslados'
    : pathname === '/operations/purchases' || pathname === '/operations/compras' || pathname === '/operaciones/compras'
    ? 'Compras'
    : pathname === '/operations/deliveries' || pathname === '/operations/entregas' || pathname === '/operaciones/entregas'
    ? 'Entregas'
    : pathname === '/operations/summary' || pathname === '/operations/resumen' || pathname === '/operaciones/resumen'
    ? 'Resumen'
    : 'Inventario'

const financeSectionFromPath = (pathname: string) =>
  pathname === '/finance/accounting' || pathname === '/finance/cuentas-contables' || pathname === '/finanzas/cuentas-contables'
    ? 'Cuentas contables'
    : pathname === '/finance/ebp' || pathname === '/finance/pagos-bancarios' || pathname === '/finanzas/pagos-bancarios'
    ? 'Pagos Bancarios'
    : pathname === '/finance/payables' || pathname === '/finance/pagos' || pathname === '/finanzas/pagos'
    ? 'Pagos'
    : pathname === '/finance/summary' || pathname === '/finance/resumen' || pathname === '/finanzas/resumen'
    ? 'Resumen'
    : 'Cobros'

const expensesSectionFromPath = (pathname: string): ExpensesSectionTab =>
  pathname === '/expenses/ledger' || pathname === '/gastos/polizas'
    ? 'Registro y pólizas'
    : pathname === '/expenses/budgets' || pathname === '/gastos/presupuestos'
      ? 'Presupuestos y alertas'
      : pathname === '/expenses/recurring' || pathname === '/gastos/recurrentes'
        ? 'Gastos recurrentes'
        : 'Resumen y control'

const reportsSectionFromPath = (pathname: string): ReportsSectionTab =>
  pathname === '/reports/income-statement' || pathname === '/reportes/estado-resultados'
    ? 'Estado de Resultados'
    : pathname === '/reports/financial' || pathname === '/reportes/finanzas'
    ? 'Finanzas y Tesorería'
    : pathname === '/reports/payables-ebp' || pathname === '/reportes/cxp-ebp'
    ? 'CxP y Pagos EBP'
    : pathname === '/reports/sales' || pathname === '/reportes/ventas'
    ? 'Ventas y CxC'
    : pathname === '/reports/inventory' || pathname === '/reportes/inventario'
    ? 'Compras e Inventario'
    : pathname === '/reports/payroll' || pathname === '/reportes/nomina'
    ? 'Nómina y RRHH'
    : 'Resumen ejecutivo'

const adminSectionFromPath = (pathname: string): AdminSectionTab =>
  pathname.startsWith('/admin/subsidiaries') ||
  pathname.startsWith('/admin/subsidiarias') ||
  pathname.startsWith('/administracion/subsidiarias')
    ? 'Subsidiarias'
    : pathname === '/admin/locations' || pathname === '/admin/ubicaciones' || pathname === '/administracion/ubicaciones'
    ? 'Ubicaciones'
    : pathname === '/admin/return-workflows' ||
      pathname === '/admin/flujos-devoluciones' ||
      pathname === '/administracion/flujos-devoluciones'
    ? 'Flujos de devoluciones'
    : pathname === '/admin/summary' || pathname === '/admin/resumen' || pathname === '/administracion/resumen'
    ? 'Resumen'
    : pathname === '/admin/audit' || pathname === '/admin/auditoria' || pathname === '/administracion/auditoria'
    ? 'Historial de Auditoría'
    : 'Departamentos'

const subsidiaryIdFromPath = (pathname: string): string | null => {
  const prefixes = ['/admin/subsidiaries/', '/admin/subsidiarias/', '/administracion/subsidiarias/']
  for (const prefix of prefixes) {
    if (pathname.startsWith(prefix)) {
      const slug = pathname.slice(prefix.length).split('/')[0]?.trim()
      if (!slug) return null
      if (slug === 'nueva' || slug === 'new') return '__new__'
      try {
        return decodeURIComponent(slug)
      } catch {
        return slug
      }
    }
  }
  return null
}

function AppContent() {
  const toast = useToast()
  const { t } = useI18n()
  const [activePage, setActivePage] = useState(() => pageFromPath(window.location.pathname))
  const [crmSection, setCrmSection] = useState(() => crmSectionFromPath(window.location.pathname))
  const [salesSection, setSalesSection] = useState<SalesSectionTab>(() => salesSectionFromPath(window.location.pathname))
  const [purchasesSection, setPurchasesSection] = useState<PurchasesSectionTab>(() => purchasesSectionFromPath(window.location.pathname))
  const [operationsSection, setOperationsSection] = useState<'Inventario' | 'Traslados' | 'Compras' | 'Entregas' | 'Resumen'>(() => operationsSectionFromPath(window.location.pathname))
  const [financeSection, setFinanceSection] = useState<'Cobros' | 'Pagos' | 'Pagos Bancarios' | 'Cuentas contables' | 'Resumen'>(() => financeSectionFromPath(window.location.pathname))
  const [expensesSection, setExpensesSection] = useState<ExpensesSectionTab>(() => expensesSectionFromPath(window.location.pathname))
  const [reportsSection, setReportsSection] = useState<ReportsSectionTab>(() => reportsSectionFromPath(window.location.pathname))
  const [adminSection, setAdminSection] = useState<AdminSectionTab>(() => adminSectionFromPath(window.location.pathname))
  const [selectedSubsidiaryId, setSelectedSubsidiaryId] = useState<string | null>(() =>
    subsidiaryIdFromPath(window.location.pathname)
  )
  const [quotes, setQuotes] = useState<Quote[]>(initialQuotes)
  const [orders, setOrders] = useState<SalesOrder[]>(initialOrders)
  const [customerReturns, setCustomerReturns] = useState<CustomerReturn[]>(() => loadStoredCustomerReturns())
  const [supplierReturns, setSupplierReturns] = useState<SupplierReturn[]>(() => loadStoredSupplierReturns())
  const [returnWorkflows, setReturnWorkflows] = useState<ReturnWorkflowsSettings>(() => loadStoredReturnWorkflows())
  const [presetOrderToInvoice, setPresetOrderToInvoice] = useState<SalesOrder | null>(null)
  const [presetInvoiceIdToView, setPresetInvoiceIdToView] = useState<string | null>(null)
  const [presetOrderFolioToView, setPresetOrderFolioToView] = useState<string | null>(null)
  const [subsidiaries, setSubsidiaries] = useState<SubsidiaryRecord[]>(() => loadStoredSubsidiaries())
  const [departments, setDepartments] = useState<DepartmentRecord[]>(() => {
    const validSubIds = new Set(loadStoredSubsidiaries().map((s) => s.id))
    return loadStoredDepartments(validSubIds)
  })
  const [locations, setLocations] = useState<PhysicalLocationRecord[]>(() => {
    const validSubIds = new Set(loadStoredSubsidiaries().map((s) => s.id))
    return loadStoredLocations(validSubIds)
  })
  const [warehouses, setWarehouses] = useState<Warehouse[]>(() => {
    const validSubIds = new Set(loadStoredSubsidiaries().map((s) => s.id))
    return buildWarehousesFromLocations(loadStoredLocations(validSubIds))
  })
  const [inventory, setInventory] = useState<InventoryItemLocation[]>(initialInventory)
  const [transfers, setTransfers] = useState<InventoryTransfer[]>(initialTransfers)
  const [presetTransferItem, setPresetTransferItem] = useState<InventoryItemLocation | null>(null)
  const [categoryStockThresholds, setCategoryStockThresholds] = useState<CategoryStockThresholdRule[]>(
    () => loadStoredCategoryStockThresholds()
  )

  useEffect(() => {
    const syncCategoryThresholds = (e: Event) => {
      const custom = e as CustomEvent<{ rules?: CategoryStockThresholdRule[] }>
      if (custom.detail?.rules) {
        setCategoryStockThresholds(custom.detail.rules)
      } else {
        setCategoryStockThresholds(loadStoredCategoryStockThresholds())
      }
    }
    window.addEventListener(CATEGORY_STOCK_THRESHOLDS_CHANGED_EVENT, syncCategoryThresholds)
    return () =>
      window.removeEventListener(CATEGORY_STOCK_THRESHOLDS_CHANGED_EVENT, syncCategoryThresholds)
  }, [])

  const productCategoryMap = useMemo(
    () => buildProductCategoryLookup(initialProductsAndServices),
    []
  )

  const effectiveInventory = useMemo<InventoryItemLocation[]>(() => {
    return inventory.map((item) => {
      const resolved = resolveEffectiveStockThreshold(
        item,
        categoryStockThresholds,
        productCategoryMap
      )
      if (resolved.effectiveMinStock === item.minStock && item.category === resolved.category) {
        return item
      }
      return {
        ...item,
        category: resolved.category,
        minStock: resolved.effectiveMinStock,
      }
    })
  }, [inventory, categoryStockThresholds, productCategoryMap])

  const handleUpdateCategoryThresholds = (nextRules: CategoryStockThresholdRule[]) => {
    setCategoryStockThresholds(nextRules)
    saveStoredCategoryStockThresholds(nextRules)
    const activeSummary = nextRules
      .filter((r) => r.enabled)
      .map(
        (r) =>
          `${r.category}: ${r.minStock} uds. (${r.mode === 'override_sku' ? 'Forzado' : 'Heredado'})`
      )
      .join(' · ')
    appendAuditLog({
      category: 'settings',
      crudOperation: 'UPDATE',
      entityType: 'Umbral por categoría',
      action: 'Actualización de umbrales de stock por categoría',
      detail: activeSummary || `${nextRules.length} categoría(s) configuradas`,
      user: activeSessionProfile.name,
      userId: activeActorUserId,
    })
  }

  // Notificaciones Push y Alerta Persistente de Stock en Barra Superior
  const [pushEnabled, setPushEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('nexus_stock_push_alerts_config')
      if (saved) return JSON.parse(saved).enabled !== false
    } catch {
      // fallback
    }
    return true
  })

  // Sincronizar estado de notificaciones push si se modifica desde el dashboard ejecutivo
  useEffect(() => {
    const handlePushEvent = (e: Event) => {
      const custom = e as CustomEvent<{ enabled: boolean }>
      if (custom.detail && typeof custom.detail.enabled === 'boolean') {
        setPushEnabled(custom.detail.enabled)
      }
    }
    window.addEventListener('nexus_push_config_changed', handlePushEvent)
    return () => window.removeEventListener('nexus_push_config_changed', handlePushEvent)
  }, [])

  const handleTogglePush = (explicitVal?: boolean) => {
    const nextVal = typeof explicitVal === 'boolean' ? explicitVal : !pushEnabled
    setPushEnabled(nextVal)
    try {
      const saved = localStorage.getItem('nexus_stock_push_alerts_config')
      const current = saved ? JSON.parse(saved) : {}
      const updated = { ...current, enabled: nextVal }
      localStorage.setItem('nexus_stock_push_alerts_config', JSON.stringify(updated))
    } catch {
      // fallback
    }
    window.dispatchEvent(
      new CustomEvent('nexus_push_config_changed', { detail: { enabled: nextVal } })
    )
    if (nextVal) {
      toast.success(
        'Notificaciones push y alerta persistente activadas. Se mostrará el aviso en la barra superior ante stock crítico.',
        'Push de Stock activado'
      )
    } else {
      toast.info('Notificaciones push de stock pausadas.', 'Push de Stock')
    }
  }

  // Ítems de inventario bajo umbral mínimo (considerando umbrales por categoría y SKU)
  const lowStockItems = useMemo(() => {
    return effectiveInventory.filter((item) => item.stock <= item.minStock)
  }, [effectiveInventory])

  // Estado del Centro de Notificaciones Superior
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false)
  const notificationCenterRef = useRef<HTMLDivElement>(null)

  // Control del modal de configuración de stock desde el centro de notificaciones
  const [isStockConfigOpen, setIsStockConfigOpen] = useState(false)
  const [stockConfigTab, setStockConfigTab] = useState<'thresholds' | 'push' | 'email'>('thresholds')

  const handleOpenStockConfigFromNotif = (tab: 'thresholds' | 'push' | 'email' = 'thresholds') => {
    setIsNotificationCenterOpen(false)
    if (
      tab === 'thresholds' &&
      !isFullAdmin &&
      !activeCapabilities.has('adjustThresholds') &&
      !activeCapabilities.has('sysConfig')
    ) {
      toast.warning(
        'Acceso restringido: tu rol no cuenta con permiso para ajustar umbrales de stock.',
        'Control de acceso'
      )
      return
    }
    setStockConfigTab(tab)
    setIsStockConfigOpen(true)
    if (activePage !== 'Inicio') {
      navigateTo('Inicio')
    }
  }

  // Cerrar centro de notificaciones al hacer clic fuera o presionar Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        notificationCenterRef.current &&
        !notificationCenterRef.current.contains(e.target as Node)
      ) {
        setIsNotificationCenterOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsNotificationCenterOpen(false)
      }
    }
    if (isNotificationCenterOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isNotificationCenterOpen])
  const [movements, setMovements] = useState<StockMovement[]>(initialMovements)
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(initialPurchaseOrders)
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>(initialRequisitions)
  const [shipments, setShipments] = useState<ShipmentDelivery[]>(initialShipments)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(initialBankAccounts)
  const [receivables, setReceivables] = useState<InvoiceReceivable[]>(initialReceivables)
  const [payables, setPayables] = useState<BillPayable[]>(initialPayables)
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(initialExpenses)
  const [expenseBudgets, setExpenseBudgets] = useState<ExpenseBudgetRule[]>(initialExpenseBudgets)
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpenseTemplate[]>(initialRecurringExpenses)
  const [transactions, setTransactions] = useState<PaymentTransaction[]>(initialTransactions)
  const [chartAccounts, setChartAccounts] = useState<ChartAccount[]>(initialChartAccounts)

  useEffect(() => {
    writeStoredJson(STORAGE_KEYS.subsidiaries, subsidiaries)
  }, [subsidiaries])

  useEffect(() => {
    writeStoredJson(STORAGE_KEYS.departments, departments)
  }, [departments])

  useEffect(() => {
    writeStoredJson(STORAGE_KEYS.locations, locations)
  }, [locations])

  // Centro de Notificaciones: Avisos dinámicos conectados a Operaciones, Finanzas y Ventas + estado leído/descartado
  const [notifPrefState, setNotifPrefState] = useState<{
    read: Record<string, string>
    dismissed: Record<string, string>
  }>(() => {
    try {
      const saved = window.localStorage.getItem('aes_nexus_notif_status_v1')
      if (saved) {
        const parsed = JSON.parse(saved)
        return {
          read: parsed?.read && typeof parsed.read === 'object' ? parsed.read : {},
          dismissed: parsed?.dismissed && typeof parsed.dismissed === 'object' ? parsed.dismissed : {},
        }
      }
    } catch {
      // fallback
    }
    return { read: {}, dismissed: {} }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem('aes_nexus_notif_status_v1', JSON.stringify(notifPrefState))
    } catch {
      // ignore storage errors
    }
  }, [notifPrefState])

  type SystemNotice = {
    id: string
    fingerprint: string
    tone: 'blue' | 'amber' | 'green'
    title: string
    desc: string
    meta: string
    targetModule: 'Compras' | 'Operaciones' | 'Finanzas' | 'Ventas'
    targetSection: string
    actionLabel: string
  }

  const liveSystemNotifications = useMemo<SystemNotice[]>(() => {
    const items: SystemNotice[] = []

    const pendingShipments = shipments.filter(
      (s) => s.status === 'Preparando' || s.status === 'En ruta'
    )
    if (pendingShipments.length > 0) {
      items.push({
        id: 'ops_shipments',
        fingerprint: `${pendingShipments.length}:${pendingShipments.map((s) => `${s.id}-${s.status}`).join(',')}`,
        tone: 'blue',
        title: `${pendingShipments.length} envío${pendingShipments.length > 1 ? 's' : ''} por completar entrega`,
        desc: `${pendingShipments
          .slice(0, 2)
          .map((s) => `${s.folio} (${s.clientCompany})`)
          .join(', ')}${pendingShipments.length > 2 ? ` y ${pendingShipments.length - 2} más` : ''} en estado ${pendingShipments[0].status.toLowerCase()}.`,
        meta: 'Operaciones · Entregas',
        targetModule: 'Operaciones',
        targetSection: 'Entregas',
        actionLabel: 'Ir a Entregas',
      })
    }

    const pendingPurchaseOrders = purchaseOrders.filter(
      (po) => po.status === 'Emitida' || po.status === 'Recepción parcial'
    )
    if (pendingPurchaseOrders.length > 0) {
      items.push({
        id: 'ops_purchases',
        fingerprint: `${pendingPurchaseOrders.length}:${pendingPurchaseOrders.map((p) => `${p.id}-${p.status}`).join(',')}`,
        tone: 'blue',
        title: `${pendingPurchaseOrders.length} orden${pendingPurchaseOrders.length > 1 ? 'es' : ''} de compra por recibir`,
        desc: `${pendingPurchaseOrders
          .slice(0, 2)
          .map((p) => `${p.folio} (${p.supplierCompany})`)
          .join(', ')}${pendingPurchaseOrders.length > 2 ? ` y ${pendingPurchaseOrders.length - 2} más` : ''} esperando recepción en almacén.`,
        meta: 'Compras · Recepciones',
        targetModule: 'Compras',
        targetSection: 'Recepciones',
        actionLabel: 'Ir a Compras',
      })
    }

    const pendingReceivables = receivables.filter(
      (inv) => inv.balance > 0 && inv.status !== 'Pagada'
    )
    if (pendingReceivables.length > 0) {
      const overdueCount = pendingReceivables.filter((inv) => inv.status === 'Vencida').length
      const pendingTotal = pendingReceivables.reduce((sum, inv) => sum + inv.balance, 0)
      items.push({
        id: 'fin_receivables',
        fingerprint: `${pendingReceivables.length}:${overdueCount}:${pendingTotal}:${pendingReceivables.map((r) => r.id).join(',')}`,
        tone: 'amber',
        title:
          overdueCount > 0
            ? `${pendingReceivables.length} factura${pendingReceivables.length > 1 ? 's' : ''} por cobrar (${overdueCount} vencida${overdueCount > 1 ? 's' : ''})`
            : `${pendingReceivables.length} factura${pendingReceivables.length > 1 ? 's' : ''} pendiente${pendingReceivables.length > 1 ? 's' : ''} de cobro`,
        desc: `Saldo pendiente de ${money(pendingTotal)} (${pendingReceivables
          .slice(0, 2)
          .map((r) => r.folio)
          .join(', ')}${pendingReceivables.length > 2 ? '…' : ''}).`,
        meta: 'Finanzas · Cobros',
        targetModule: 'Finanzas',
        targetSection: 'Cobros',
        actionLabel: 'Ir a Cobros',
      })
    }

    const pendingPayables = payables.filter((b) => b.balance > 0 && b.status !== 'Pagada')
    if (pendingPayables.length > 0) {
      const payablesTotal = pendingPayables.reduce((sum, b) => sum + b.balance, 0)
      items.push({
        id: 'fin_payables',
        fingerprint: `${pendingPayables.length}:${payablesTotal}:${pendingPayables.map((b) => b.id).join(',')}`,
        tone: 'amber',
        title: `${pendingPayables.length} cuenta${pendingPayables.length > 1 ? 's' : ''} por pagar a proveedores`,
        desc: `Saldo comprometido por ${money(payablesTotal)} (${pendingPayables
          .slice(0, 2)
          .map((b) => b.folio)
          .join(', ')}${pendingPayables.length > 2 ? '…' : ''}).`,
        meta: 'Finanzas · Pagos',
        targetModule: 'Finanzas',
        targetSection: 'Pagos',
        actionLabel: 'Ir a Pagos',
      })
    }

    const unbilledOrders = orders.filter(
      (o) => o.status !== 'Cancelado' && !(o.invoiceIds && o.invoiceIds.length > 0)
    )
    if (unbilledOrders.length > 0) {
      items.push({
        id: 'sales_unbilled_orders',
        fingerprint: `${unbilledOrders.length}:${unbilledOrders.map((o) => o.id).join(',')}`,
        tone: 'green',
        title: `${unbilledOrders.length} pedido${unbilledOrders.length > 1 ? 's' : ''} confirmado${unbilledOrders.length > 1 ? 's' : ''} sin facturar`,
        desc: `${unbilledOrders
          .slice(0, 2)
          .map((o) => `${o.folio} (${o.clientCompany})`)
          .join(', ')}${unbilledOrders.length > 2 ? ` y ${unbilledOrders.length - 2} más` : ''} listo para facturación.`,
        meta: 'Ventas · Facturas',
        targetModule: 'Ventas',
        targetSection: 'Facturas',
        actionLabel: 'Ir a Facturas',
      })
    }

    const openQuotes = quotes.filter(
      (q) => (q.status === 'Enviada' || q.status === 'Borrador') && !q.convertedToOrderId
    )
    if (openQuotes.length > 0) {
      items.push({
        id: 'sales_open_quotes',
        fingerprint: `${openQuotes.length}:${openQuotes.map((q) => `${q.id}-${q.status}`).join(',')}`,
        tone: 'green',
        title: `${openQuotes.length} cotización${openQuotes.length > 1 ? 'es' : ''} abierta${openQuotes.length > 1 ? 's' : ''} en seguimiento`,
        desc: `${openQuotes
          .slice(0, 2)
          .map((q) => `${q.folio} (${q.clientCompany})`)
          .join(', ')}${openQuotes.length > 2 ? ` y ${openQuotes.length - 2} más` : ''} por aprobar o convertir a pedido.`,
        meta: 'Ventas · Cotizaciones',
        targetModule: 'Ventas',
        targetSection: 'Cotizaciones',
        actionLabel: 'Ir a Cotizaciones',
      })
    }

    return items
  }, [shipments, purchaseOrders, receivables, payables, orders, quotes])

  const activeSystemNotifications = useMemo(
    () =>
      liveSystemNotifications.filter(
        (n) => notifPrefState.dismissed[n.id] !== n.fingerprint
      ),
    [liveSystemNotifications, notifPrefState.dismissed]
  )

  const unreadSystemNotifsCount = useMemo(
    () =>
      activeSystemNotifications.filter((n) => notifPrefState.read[n.id] !== n.fingerprint)
        .length,
    [activeSystemNotifications, notifPrefState.read]
  )

  const readSystemNotifsCount = activeSystemNotifications.length - unreadSystemNotifsCount
  const dismissedSystemNotifsCount =
    liveSystemNotifications.length - activeSystemNotifications.length

  const markSystemNotifRead = (id: string, fingerprint: string, read = true) => {
    setNotifPrefState((prev) => {
      const nextRead = { ...prev.read }
      if (read) {
        nextRead[id] = fingerprint
      } else {
        delete nextRead[id]
      }
      return { ...prev, read: nextRead }
    })
  }

  const dismissSystemNotif = (id: string, fingerprint: string) => {
    setNotifPrefState((prev) => ({
      read: { ...prev.read, [id]: fingerprint },
      dismissed: { ...prev.dismissed, [id]: fingerprint },
    }))
  }

  const markAllSystemNotifsRead = () => {
    setNotifPrefState((prev) => {
      const nextRead = { ...prev.read }
      activeSystemNotifications.forEach((n) => {
        nextRead[n.id] = n.fingerprint
      })
      return { ...prev, read: nextRead }
    })
  }

  const clearReadSystemNotifs = () => {
    setNotifPrefState((prev) => {
      const nextDismissed = { ...prev.dismissed }
      activeSystemNotifications.forEach((n) => {
        if (prev.read[n.id] === n.fingerprint) {
          nextDismissed[n.id] = n.fingerprint
        }
      })
      return { ...prev, dismissed: nextDismissed }
    })
  }

  const restoreDismissedSystemNotifs = () => {
    setNotifPrefState((prev) => ({
      ...prev,
      dismissed: {},
    }))
  }
  const [employees, setEmployees] = useState<EmployeeRecord[]>(() => {
    try {
      const saved = window.localStorage.getItem('aes_nexus_employees_v1')
      if (saved) {
        const parsed = JSON.parse(saved) as EmployeeRecord[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validRoleIds = new Set(loadStoredRoleDefinitions().map((r) => r.id))
          return parsed.map((emp) => {
            const fallbackRoles = initialEmployees.find((i) => i.id === emp.id)?.roles || []
            const rawRoles = Array.isArray(emp.roles) ? emp.roles : fallbackRoles
            const filteredRoles = rawRoles.filter((id) => validRoleIds.has(id))
            const hasAccess = emp.hasSystemAccess !== false && filteredRoles.length > 0
            return {
              ...emp,
              hasSystemAccess: hasAccess,
              roles: hasAccess ? filteredRoles : [],
            }
          })
        }
      }
    } catch {
      // fallback
    }
    return initialEmployees
  })

  useEffect(() => {
    try {
      window.localStorage.setItem('aes_nexus_employees_v1', JSON.stringify(employees))
    } catch {
      // ignore storage quota errors
    }
  }, [employees])

  useEffect(() => {
    const syncEmployeeRoles = () => {
      const validIds = new Set(loadStoredRoleDefinitions().map((r) => r.id))
      setEmployees((prev) => {
        let changed = false
        const next = prev.map((emp) => {
          const filtered = (emp.roles || []).filter((rId) => validIds.has(rId))
          const nextAccess = emp.hasSystemAccess !== false && filtered.length > 0
          if (filtered.length !== (emp.roles || []).length || emp.hasSystemAccess !== nextAccess) {
            changed = true
            return { ...emp, hasSystemAccess: nextAccess, roles: nextAccess ? filtered : [] }
          }
          return emp
        })
        return changed ? next : prev
      })
    }
    window.addEventListener(ROLES_CHANGED_EVENT, syncEmployeeRoles)
    return () => window.removeEventListener(ROLES_CHANGED_EVENT, syncEmployeeRoles)
  }, [])

  // Active User / Role-Based Access Control (RBAC)
  const [roleDefinitions, setRoleDefinitions] = useState<RoleDefinition[]>(() =>
    loadStoredRoleDefinitions()
  )
  const [workspaceUsers, setWorkspaceUsers] = useState<WorkspaceUserRecord[]>(() =>
    loadStoredWorkspaceUsers()
  )
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    try {
      return window.localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY) || 'user:usr_1'
    } catch {
      return 'user:usr_1'
    }
  })
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const [isTopbarRoleMenuOpen, setIsTopbarRoleMenuOpen] = useState(false)
  const topbarRoleMenuRef = useRef<HTMLDivElement>(null)
  const [roleLoginDialogMode, setRoleLoginDialogMode] = useState<'modal' | 'gate' | null>(null)

  useEffect(() => {
    const syncRoles = () => setRoleDefinitions(loadStoredRoleDefinitions())
    const syncUsers = () => setWorkspaceUsers(loadStoredWorkspaceUsers())
    window.addEventListener(ROLES_CHANGED_EVENT, syncRoles)
    window.addEventListener(USERS_CHANGED_EVENT, syncUsers)
    window.addEventListener('storage', syncRoles)
    window.addEventListener('storage', syncUsers)
    return () => {
      window.removeEventListener(ROLES_CHANGED_EVENT, syncRoles)
      window.removeEventListener(USERS_CHANGED_EVENT, syncUsers)
      window.removeEventListener('storage', syncRoles)
      window.removeEventListener('storage', syncUsers)
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, activeSessionId)
    } catch {
      // ignore storage errors
    }
  }, [activeSessionId])

  useEffect(() => {
    if (!isProfileMenuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false)
      }
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsProfileMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [isProfileMenuOpen])

  useEffect(() => {
    if (!isTopbarRoleMenuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (topbarRoleMenuRef.current && !topbarRoleMenuRef.current.contains(e.target as Node)) {
        setIsTopbarRoleMenuOpen(false)
      }
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsTopbarRoleMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [isTopbarRoleMenuOpen])

  const getRoleDisplayName = (roleId: RoleKey) => {
    const found = roleDefinitions.find((r) => r.id === roleId)
    return found?.name || roleId
  }

  const activeSessionProfile = useMemo(() => {
    const validRoleIds = new Set(roleDefinitions.map((r) => r.id))

    if (activeSessionId.startsWith('userrole:')) {
      const rest = activeSessionId.slice('userrole:'.length)
      const sepIndex = rest.indexOf(':')
      const userId = sepIndex >= 0 ? rest.slice(0, sepIndex) : rest
      const requestedRoleId = sepIndex >= 0 ? rest.slice(sepIndex + 1) : ''
      const user =
        workspaceUsers.find((u) => u.id === userId) ||
        workspaceUsers.find((u) => u.status === 'active') ||
        workspaceUsers[0]
      const resolvedRoleId = validRoleIds.has(requestedRoleId)
        ? requestedRoleId
        : getWorkspaceUserRoleIds(user, validRoleIds)[0] || roleDefinitions[0]?.id || 'Administrador'
      const isActive = user.status === 'active'
      const roleTitle = getRoleDisplayName(resolvedRoleId)
      return {
        key: `userrole:${user.id}:${resolvedRoleId}`,
        kind: 'userrole' as const,
        baseUserId: user.id,
        activeRoleId: resolvedRoleId as RoleKey | 'COMBINED',
        name: user.name,
        initials: user.avatarInitials,
        roles: [resolvedRoleId],
        isActive,
        statusLabel: isActive ? 'Activo' : 'Suspendido',
        subtitle: !isActive ? 'Suspendido' : roleTitle,
      }
    }

    if (activeSessionId.startsWith('role:')) {
      const requestedRoleId = activeSessionId.slice('role:'.length)
      const resolvedRoleId = validRoleIds.has(requestedRoleId)
        ? requestedRoleId
        : roleDefinitions[0]?.id || 'Administrador'
      const roleTitle = getRoleDisplayName(resolvedRoleId)
      const fallbackUser = workspaceUsers.find((u) => u.status === 'active') || workspaceUsers[0]
      return {
        key: `role:${resolvedRoleId}`,
        kind: 'role' as const,
        baseUserId: fallbackUser?.id || 'usr_1',
        activeRoleId: resolvedRoleId as RoleKey | 'COMBINED',
        name: roleTitle,
        initials: roleTitle.slice(0, 2).toUpperCase(),
        roles: [resolvedRoleId],
        isActive: true,
        statusLabel: 'Activo',
        subtitle: `Rol activo · ${roleTitle}`,
      }
    }

    if (activeSessionId.startsWith('emp:')) {
      const empId = activeSessionId.slice(4)
      const emp = employees.find((e) => e.id === empId)
      if (emp) {
        const isSysUser = isEmployeeSystemUser(emp, validRoleIds)
        const empRoles = isSysUser ? (emp.roles || []).filter((id) => validRoleIds.has(id)) : []
        const isActive = isSysUser && emp.status !== 'Inactivo'
        const fallbackUser = workspaceUsers.find((u) => u.status === 'active') || workspaceUsers[0]
        return {
          key: `emp:${emp.id}`,
          kind: 'employee' as const,
          baseUserId: fallbackUser?.id || 'usr_1',
          activeRoleId: (empRoles.length === 1 ? empRoles[0] : 'COMBINED') as RoleKey | 'COMBINED',
          name: emp.fullName,
          initials: emp.initials,
          roles: empRoles,
          isActive,
          statusLabel: !isSysUser ? 'Sin acceso' : emp.status,
          subtitle: !isSysUser
            ? 'Solo empleado (sin acceso)'
            : emp.status === 'Inactivo'
            ? 'Inactivo'
            : empRoles.map(getRoleDisplayName).join(', '),
        }
      }
    }

    const userId = activeSessionId.startsWith('user:') ? activeSessionId.slice(5) : activeSessionId
    const user = workspaceUsers.find((u) => u.id === userId) || workspaceUsers[0]
    const userRoles = getWorkspaceUserRoleIds(user, validRoleIds)
    const isActive = user.status === 'active'
    const rolesText =
      userRoles.length > 0 ? userRoles.map(getRoleDisplayName).join(', ') : 'Sin rol asignado'
    return {
      key: `user:${user.id}`,
      kind: 'user' as const,
      baseUserId: user.id,
      activeRoleId: (userRoles.length === 1 ? userRoles[0] : 'COMBINED') as RoleKey | 'COMBINED',
      name: user.name,
      initials: user.avatarInitials,
      roles: userRoles,
      isActive,
      statusLabel: isActive ? 'Activo' : 'Suspendido',
      subtitle: !isActive ? 'Suspendido' : rolesText,
    }
  }, [activeSessionId, employees, workspaceUsers, roleDefinitions])

  const activeActorUserId = useMemo(() => {
    if (activeSessionProfile.kind === 'employee') {
      return activeSessionProfile.key.slice(4) || activeSessionProfile.baseUserId
    }
    if (activeSessionProfile.kind === 'role') {
      return activeSessionProfile.key
    }
    return activeSessionProfile.baseUserId
  }, [activeSessionProfile])

  const {
    isFullAdmin,
    capabilities: activeCapabilities,
    sectionAccess: activeSectionAccess,
  } = useMemo(
    () =>
      resolveEffectiveAccess(
        activeSessionProfile.roles,
        roleDefinitions,
        activeSessionProfile.isActive
      ),
    [activeSessionProfile, roleDefinitions]
  )

  const initialLoginLoggedRef = useRef(false)

  useEffect(() => {
    if (initialLoginLoggedRef.current) return
    initialLoginLoggedRef.current = true
    try {
      const storageKey = 'aes_nexus_initial_login_logged_v1'
      if (window.sessionStorage.getItem(storageKey)) return
      window.sessionStorage.setItem(storageKey, activeSessionProfile.key)
    } catch {
      // ignore sessionStorage access errors
    }
    const deviceBrowser = detectClientDeviceBrowser()
    const ipAddress = resolveSessionIpAddress(activeSessionProfile.key)
    const roleLabel = activeSessionProfile.subtitle
    appendAuditLog({
      category: 'session',
      action: 'Inicio de sesión en el ambiente',
      detail: `Acceso confirmado · Rol: ${roleLabel} · IP ${ipAddress} · ${deviceBrowser}`,
      user: activeSessionProfile.name,
      sessionMeta: {
        roleLabel,
        ipAddress,
        deviceBrowser,
      },
    })
  }, [activeSessionProfile.key, activeSessionProfile.name, activeSessionProfile.subtitle])

  const handleSelectSessionProfile = (sessionKey: string, label: string, subtitle: string) => {
    const isSwitching = sessionKey !== activeSessionProfile.key
    setActiveSessionId(sessionKey)
    setIsProfileMenuOpen(false)
    setIsTopbarRoleMenuOpen(false)
    if (isSwitching) {
      const deviceBrowser = detectClientDeviceBrowser()
      const ipAddress = resolveSessionIpAddress(sessionKey)
      appendAuditLog({
        category: 'session',
        action: 'Inicio de sesión en el ambiente',
        detail: `Acceso confirmado · Rol: ${subtitle} · IP ${ipAddress} · ${deviceBrowser}`,
        user: label,
        sessionMeta: {
          roleLabel: subtitle,
          ipAddress,
          deviceBrowser,
        },
      })
      try {
        window.sessionStorage.setItem('aes_nexus_initial_login_logged_v1', sessionKey)
      } catch {
        // ignore sessionStorage access errors
      }
    }
    toast.info(`Sesión activa: ${label} (${subtitle})`, 'Cambio de perfil')
  }

  const handleSwitchActiveRole = (
    roleSelection: RoleKey | 'COMBINED',
    overrideUserId?: string
  ) => {
    const candidateUser =
      workspaceUsers.find((u) => u.id === (overrideUserId || activeSessionProfile.baseUserId)) ||
      workspaceUsers.find((u) => u.status === 'active') ||
      workspaceUsers[0]
    const targetUser =
      candidateUser && candidateUser.status === 'active'
        ? candidateUser
        : workspaceUsers.find((u) => u.status === 'active') || candidateUser

    if (!targetUser) return

    const validRoleIds = new Set(roleDefinitions.map((r) => r.id))
    const assignedRoles = getWorkspaceUserRoleIds(targetUser, validRoleIds)

    let nextSessionKey: string
    let nextRoles: RoleKey[]
    let nextSubtitle: string

    if (roleSelection === 'COMBINED') {
      nextSessionKey = `user:${targetUser.id}`
      nextRoles = assignedRoles
      nextSubtitle =
        assignedRoles.length > 0
          ? assignedRoles.map(getRoleDisplayName).join(', ')
          : 'Sin rol asignado'
    } else {
      nextSessionKey = `userrole:${targetUser.id}:${roleSelection}`
      nextRoles = [roleSelection]
      nextSubtitle = getRoleDisplayName(roleSelection)
    }

    handleSelectSessionProfile(nextSessionKey, targetUser.name, nextSubtitle)
    setRoleLoginDialogMode(null)

    const nextAccess = resolveEffectiveAccess(nextRoles, roleDefinitions, true)
    if (
      activePage !== 'Inicio' &&
      !canAccessModule(
        activePage,
        nextAccess.capabilities,
        nextAccess.isFullAdmin,
        true,
        nextAccess.sectionAccess
      )
    ) {
      navigateTo('Inicio')
    }
  }
  const [payrollRuns, setPayrollRuns] = useState<PayrollRunRecord[]>(initialPayrollRuns)
  const [ebpPacks, setEbpPacks] = useState<BankFormatPack[]>(() => {
    try {
      const saved = window.localStorage.getItem('aes_nexus_ebp_packs_v1')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {
      // fallback
    }
    return initialBankFormatPacks
  })
  const [ebpBatches, setEbpBatches] = useState<ElectronicPaymentBatch[]>(initialEbpBatches)
  const [globalEbpWizard, setGlobalEbpWizard] = useState<{
    isOpen: boolean
    batchType: 'Nómina' | 'Proveedores'
    defaultAggregationMode?: EbpAggregationMode
    sourceRefId: string
    sourceFolio: string
    candidates: EbpWizardCandidateLine[]
  }>({
    isOpen: false,
    batchType: 'Nómina',
    sourceRefId: '',
    sourceFolio: '',
    candidates: [],
  })
  const [editingSupplierBank, setEditingSupplierBank] = useState<DirectoryRecord | null>(null)
  const [detailDirectory, setDetailDirectory] = useState<{
    kind: 'client' | 'supplier'
    record: DirectoryRecord
  } | null>(null)
  const [editingDirectory, setEditingDirectory] = useState<{
    kind: 'client' | 'supplier'
    originalEmail: string
    originalCompany: string
    record: DirectoryRecord
  } | null>(null)
  const [editingOpportunity, setEditingOpportunity] = useState<{
    index: number
    company: string
    person: string
    value: string
    stage: string
    date: string
  } | null>(null)
  const [confirmDeleteOpp, setConfirmDeleteOpp] = useState(false)
  const [editingActivity, setEditingActivity] = useState<{
    index: number
    title: string
    company: string
    time: string
    icon: string
    tone: 'blue' | 'amber' | 'green'
  } | null>(null)
  const [confirmDeleteAct, setConfirmDeleteAct] = useState(false)

  const handleUpdateEbpPacks = (next: BankFormatPack[]) => {
    setEbpPacks(next)
    try {
      window.localStorage.setItem('aes_nexus_ebp_packs_v1', JSON.stringify(next))
    } catch {
      // ignore storage errors
    }
  }

  const handleUpdateBankAccountPackValues = (
    accountId: string,
    packId: string,
    values: Record<string, string>
  ) => {
    setBankAccounts((prev) =>
      prev.map((acc) =>
        acc.id === accountId
          ? {
              ...acc,
              bankPackValues: {
                ...(acc.bankPackValues || {}),
                [packId]: values,
              },
            }
          : acc
      )
    )
  }

  const settlePayrollInFinance = (run: PayrollRunRecord, overrideBankId?: string, refLabel?: string) => {
    const bankAcc =
      bankAccounts.find((b) => b.id === (overrideBankId || run.bankAccountId)) || bankAccounts[0]
    if (bankAcc) {
      handleUpdateBankAccountBalance(bankAcc.id, -run.totalNet)
    }
    const today = new Date()
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    const dateStr = `${String(today.getDate()).padStart(2, '0')} ${months[today.getMonth()]} ${today.getFullYear()}`
    handleAddTransaction({
      id: `txn_${Date.now()}`,
      folio: `TXN-2026-${String(transactions.length + 1).padStart(3, '0')}`,
      date: dateStr,
      type: 'Gasto operativo',
      entityName: `Nómina ${run.periodLabel}`,
      reference: refLabel || run.folio,
      amount: -run.totalNet,
      method: 'Transferencia SPEI',
      account: bankAcc ? `${bankAcc.bankName} ${bankAcc.accountNumber}` : 'Cuenta operativa',
    })
    handleAddExpense({
      id: `exp_${Date.now()}`,
      folio: `GAS-2026-${String(expenses.length + 1).padStart(3, '0')}`,
      date: dateStr,
      category: 'Nómina y honorarios',
      description: `Dispersión de nómina ${run.folio} (${run.periodLabel}) · ${run.employeesCount} empleados`,
      beneficiary: 'Plantilla de empleados',
      amount: run.totalGross + run.totalBonuses,
      tax: 0,
      total: run.totalNet,
      paymentMethod: run.paymentMethod,
      referenceDoc: refLabel || run.folio,
      user: 'Andrea Morales',
    })

    // Sync ISR + IMSS tax retention liability into Payables & Chart Accounts (2005-001 & 6002-001)
    const taxRetentionTotal = run.receipts.reduce(
      (sum, r) => sum + r.isrDeduction + r.imssDeduction,
      0
    )
    if (taxRetentionTotal > 0) {
      const taxDue = new Date()
      taxDue.setDate(17)
      if (taxDue <= today) taxDue.setMonth(taxDue.getMonth() + 1)
      const dueStr = `${String(taxDue.getDate()).padStart(2, '0')} ${months[taxDue.getMonth()]} ${taxDue.getFullYear()}`
      setPayables((prev) => [
        {
          id: `cxp_tax_${Date.now()}`,
          folio: `CXP-SAT-${run.folio.replace('NOM-', '')}`,
          purchaseOrderFolio: run.folio,
          supplierCompany: 'SAT / IMSS · Retenciones de Nómina',
          supplierContact: 'Entero mensual de ISR e IMSS',
          issueDate: dateStr,
          dueDate: dueStr,
          subtotal: taxRetentionTotal,
          tax: 0,
          total: taxRetentionTotal,
          paidAmount: 0,
          balance: taxRetentionTotal,
          status: 'Pendiente',
          currency: 'MXN',
          paymentMethod: 'Línea de captura SAT',
        },
        ...prev,
      ])
    }

    const bankAccCode = bankAcc?.id === 'bank_2' ? '1002-002' : '1002-001'
    setChartAccounts((prev) =>
      prev.map((acc) => {
        if (acc.code === bankAccCode) return { ...acc, balance: acc.balance - run.totalNet }
        if (acc.code === '6002-001')
          return { ...acc, balance: acc.balance + run.totalGross + run.totalBonuses }
        if (acc.code === '2005-001')
          return { ...acc, balance: acc.balance + taxRetentionTotal }
        return acc
      })
    )
  }

  const handlePayPayrollRun = (run: PayrollRunRecord) => {
    settlePayrollInFinance(run)
  }

  const handleApplyEbpBatchInFinance = (batch: ElectronicPaymentBatch) => {
    if (batch.status === 'Aplicado en banco') return
    const bankAcc = bankAccounts.find((b) => b.id === batch.bankAccountId) || bankAccounts[0]
    if (!bankAcc || bankAcc.balance < batch.totalAmount) {
      toast.warning(
        `Saldo insuficiente en ${bankAcc?.bankName || 'cuenta'} para aplicar el lote ${batch.folio}.`,
        'Saldo insuficiente'
      )
      return
    }

    const now = new Date()
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    const dateStr = `${String(now.getDate()).padStart(2, '0')} ${months[now.getMonth()]} ${now.getFullYear()}`
    const appliedAt = `${dateStr} · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    if (batch.batchType === 'Nómina') {
      const targetRun = payrollRuns.find(
        (r) => r.id === batch.sourceRefId || r.folio === batch.sourceFolio
      )
      if (targetRun) {
        if (targetRun.status !== 'Pagada') {
          setPayrollRuns((prev) =>
            prev.map((r) =>
              r.id === targetRun.id
                ? {
                    ...r,
                    status: 'Pagada',
                    bankAccountId: bankAcc.id,
                    paymentMethod: `EBP ${batch.packName} · ${bankAcc.bankName}`,
                  }
                : r
            )
          )
          settlePayrollInFinance(targetRun, bankAcc.id, `${batch.folio} (${batch.generatedFilename})`)
        } else {
          handleUpdateBankAccountBalance(bankAcc.id, -batch.totalAmount)
          handleAddTransaction({
            id: `txn_${Date.now()}`,
            folio: `TXN-2026-${String(transactions.length + 1).padStart(3, '0')}`,
            date: dateStr,
            type: 'Gasto operativo',
            entityName: `Lote EBP Nómina ${batch.sourceFolio}`,
            reference: `${batch.folio} · ${batch.generatedFilename}`,
            amount: -batch.totalAmount,
            method: `EBP (${batch.packName})`,
            account: `${bankAcc.bankName} ${bankAcc.accountNumber}`,
          })
        }
      }
    } else {
      // Proveedores: liquidar todas las facturas individuales o consolidadas incluidas en el lote
      const lineAmountByBillId = new Map<string, number>()
      const paymentLabelByBillId = new Map<string, string>()

      batch.lines.forEach((line) => {
        const destLabel = `${batch.folio} · ${line.selectedBankAlias || line.bankName}`
        if (line.billAllocations && line.billAllocations.length > 0) {
          line.billAllocations.forEach((alloc) => {
            lineAmountByBillId.set(
              alloc.billId,
              (lineAmountByBillId.get(alloc.billId) || 0) + alloc.amountToPay
            )
            paymentLabelByBillId.set(alloc.billId, `EBP ${destLabel}`)
          })
        } else {
          lineAmountByBillId.set(
            line.sourceLineId,
            (lineAmountByBillId.get(line.sourceLineId) || 0) + line.amount
          )
          paymentLabelByBillId.set(line.sourceLineId, `EBP ${destLabel}`)
        }
      })

      setPayables((prev) =>
        prev.map((bill) => {
          const paidDelta = lineAmountByBillId.get(bill.id)
          if (!paidDelta) return bill
          const nextPaid = bill.paidAmount + paidDelta
          const nextBal = Math.max(0, bill.total - nextPaid)
          return {
            ...bill,
            paidAmount: nextPaid,
            balance: nextBal,
            status: nextBal === 0 ? 'Pagada' : 'Parcial',
            paymentMethod: paymentLabelByBillId.get(bill.id) || `EBP · ${batch.folio}`,
          }
        })
      )
      handleUpdateBankAccountBalance(bankAcc.id, -batch.totalAmount)
      batch.lines.forEach((line, idx) => {
        const foliosText =
          line.billAllocations && line.billAllocations.length > 0
            ? line.billAllocations.map((a) => a.billFolio).join(', ')
            : line.beneficiaryCode
        const destAccText = line.selectedBankAlias || `${line.bankName} ${line.clabe.slice(-4)}`
        const reasonText = line.paymentReason ? ` · ${line.paymentReason}` : ''
        handleAddTransaction({
          id: `txn_${Date.now()}_${idx}`,
          folio: `PAG-2026-${String(transactions.length + idx + 1).padStart(3, '0')}`,
          date: dateStr,
          type: 'Pago a proveedor',
          entityName: line.beneficiaryName,
          reference: `${batch.folio} (${destAccText})${reasonText} · Facturas: ${foliosText}`,
          amount: line.amount,
          method: `EBP (${batch.packName})`,
          account: bankAcc.bankName,
        })
      })
      const bankAccCode = bankAcc.id === 'bank_2' ? '1002-002' : '1002-001'
      setChartAccounts((prev) =>
        prev.map((acc) => {
          if (acc.code === bankAccCode) return { ...acc, balance: acc.balance - batch.totalAmount }
          if (acc.code === '2001-001')
            return { ...acc, balance: Math.max(0, acc.balance - batch.totalAmount) }
          return acc
        })
      )
    }

    setEbpBatches((prev) =>
      prev.map((b) =>
        b.id === batch.id ? { ...b, status: 'Aplicado en banco', appliedAt } : b
      )
    )
    toast.success(
      `Lote ${batch.folio} aplicado en Finanzas (${money(batch.totalAmount)} debitados de ${bankAcc.bankName} y póliza actualizada).`,
      'Dispersión bancaria aplicada'
    )
    appendAuditLog({
      category: 'finance',
      action: 'Dispersión bancaria aplicada (EBP)',
      detail: `Lote ${batch.folio} aplicado en banco ${bankAcc.bankName} · ${money(batch.totalAmount)} (${batch.operationsCount} operación(es))`,
      user: activeSessionProfile.name,
    })
  }

  const openEbpWizardForPayrollRun = (run: PayrollRunRecord) => {
    const empMap = new Map(employees.map((e) => [e.id, e]))
    const candidates: EbpWizardCandidateLine[] = run.receipts.map((rec) => {
      const emp = empMap.get(rec.employeeId)
      return {
        sourceLineId: rec.id,
        beneficiaryName: rec.employeeName,
        beneficiaryCode: rec.employeeCode,
        rfc: emp?.rfc,
        bankName: emp?.bankName || rec.bankName || '',
        clabe: emp?.clabe || rec.clabe || '',
        accountNumber: emp?.accountNumber,
        amount: rec.netPay,
        reference: run.folio.replace(/\D/g, '') || '202601',
        concept: `NOMINA ${run.periodLabel}`,
        bankPackValues: emp?.bankPackValues,
      }
    })
    setGlobalEbpWizard({
      isOpen: true,
      batchType: 'Nómina',
      defaultAggregationMode: 'individual',
      sourceRefId: run.id,
      sourceFolio: run.folio,
      candidates,
    })
  }

  const openEbpWizardForVendorBills = (
    bills: BillPayable[],
    preferredMode?: EbpAggregationMode
  ) => {
    const supMap = new Map(supplierRecords.map((s) => [s.company.toLowerCase(), s]))
    const candidates: EbpWizardCandidateLine[] = bills.map((bill) => {
      const sup = supMap.get(bill.supplierCompany.toLowerCase())
      const accounts = sup
        ? normalizeSupplierBankAccounts({
            company: sup.company,
            currency: sup.currency || bill.currency || 'MXN',
            bankName: sup.bankName,
            clabe: sup.clabe,
            accountNumber: sup.accountNumber,
            defaultReference: sup.defaultReference,
            bankPackValues: sup.bankPackValues,
            bankAccounts: sup.bankAccounts,
          })
        : []
      const preferredAcc = getPreferredSupplierBankAccount(
        accounts,
        bill.currency || 'MXN'
      )

      return {
        sourceLineId: bill.id,
        supplierKey: bill.supplierCompany.toLowerCase(),
        billId: bill.id,
        billFolio: bill.folio,
        purchaseOrderFolio: bill.purchaseOrderFolio,
        dueDate: bill.dueDate,
        currency: bill.currency || 'MXN',
        beneficiaryName: bill.supplierCompany,
        beneficiaryCode: bill.folio,
        rfc: sup?.rfc,
        bankName: preferredAcc?.bankName || sup?.bankName || '',
        clabe: preferredAcc?.clabe || sup?.clabe || '',
        accountNumber: preferredAcc?.accountNumber ?? sup?.accountNumber,
        amount: bill.balance,
        reference:
          preferredAcc?.defaultReference ||
          sup?.defaultReference ||
          bill.folio.replace(/\D/g, '').slice(-7) ||
          '100001',
        concept: `PAGO ${bill.folio}`,
        bankPackValues: preferredAcc?.bankPackValues || sup?.bankPackValues,
        availableBankAccounts: accounts,
        selectedBankAccountId: preferredAcc?.id,
      }
    })
    setGlobalEbpWizard({
      isOpen: true,
      batchType: 'Proveedores',
      defaultAggregationMode:
        preferredMode || (bills.length > 1 ? 'consolidated' : 'individual'),
      sourceRefId: bills.map((b) => b.id).join(','),
      sourceFolio:
        bills.length === 1 ? bills[0].folio : `LOTE-CXP (${bills.length} fact.)`,
      candidates,
    })
  }

  const usedSupplierBankAccountIds = useMemo(() => {
    const ids = new Set<string>()
    ebpBatches.forEach((b) => {
      b.lines.forEach((l) => {
        if (l.selectedBankAccountId) ids.add(l.selectedBankAccountId)
      })
    })
    return ids
  }, [ebpBatches])

  const handleUpdateSupplierBankAccounts = (
    supplierCompany: string,
    nextAccounts: SupplierBankAccount[]
  ) => {
    const targetKey = supplierCompany.trim().toLowerCase()
    setSupplierRecords((prev) =>
      prev.map((s) => {
        if (s.company.trim().toLowerCase() !== targetKey) return s
        const primaryAcc = getPreferredSupplierBankAccount(
          nextAccounts,
          s.currency || 'MXN'
        )
        return {
          ...s,
          bankAccounts: nextAccounts,
          bankName: primaryAcc?.bankName || undefined,
          clabe: primaryAcc?.clabe || undefined,
          accountNumber: primaryAcc?.accountNumber || undefined,
          defaultReference: primaryAcc?.defaultReference || undefined,
          bankPackValues: primaryAcc?.bankPackValues || {},
          lastActivity: 'Ahora',
        }
      })
    )
    appendAuditLog({
      category: 'finance',
      action: 'Edición de cuentas bancarias de proveedor (EBP)',
      detail: `Actualización de detalles bancarios de ${supplierCompany} · ${nextAccounts.length} cuenta(s) registrada(s)`,
      user: activeSessionProfile.name,
    })
  }

  const handleAddMovement = (mov: StockMovement) => {
    setMovements((prev) => [mov, ...prev])
    const whLabel = mov.targetWarehouse || mov.sourceWarehouse || 'Almacén'
    appendAuditLog({
      category: 'inventory',
      action: `Movimiento de inventario (${mov.type})`,
      detail: `${mov.productName} (${mov.sku}) · ${mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity} u. en ${whLabel}`,
      user: activeSessionProfile.name,
    })
  }

  const handleAddTransaction = (txn: PaymentTransaction) => {
    setTransactions((prev) => [txn, ...prev])
  }

  const handleAddExpense = (exp: ExpenseRecord) => {
    setExpenses((prev) => [exp, ...prev])
    appendAuditLog({
      category: 'finance',
      action: `Registro de gasto (${exp.expenseNature || exp.companyCategory || exp.category})`,
      detail: `${exp.folio} · ${exp.status || 'Pagado'} · ${exp.description} · ${money(exp.total)}`,
      user: activeSessionProfile.name,
    })
  }

  const handleUpdateExpense = (updated: ExpenseRecord) => {
    setExpenses((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
    appendAuditLog({
      category: 'finance',
      action: `Edición / reclasificación de gasto (${updated.expenseNature || updated.category})`,
      detail: `${updated.folio} · ${updated.costBehavior || 'Fijo'} · ${updated.locationName || 'Matriz'} · ${updated.departmentName || 'General'} · ${money(updated.total)}`,
      user: activeSessionProfile.name,
    })
    toast.success(
      `Póliza ${updated.folio} actualizada y auditada (${updated.expenseNature || updated.category} · ${updated.costBehavior || 'Fijo'}).`,
      'Póliza actualizada'
    )
  }

  const handleUpdateExpenseStatus = (
    expenseId: string,
    nextStatus: ExpenseStatus,
    explicitBankId?: string
  ) => {
    const target = expenses.find((e) => e.id === expenseId)
    if (!target) return
    const prevStatus = target.status || 'Pagado'
    if (prevStatus === nextStatus) return

    let assignedBankName = target.bankAccountName
    if (nextStatus === 'Pagado' && prevStatus !== 'Pagado') {
      const targetBank =
        (explicitBankId ? bankAccounts.find((b) => b.id === explicitBankId) : undefined) ||
        bankAccounts.find((b) => b.bankName === target.bankAccountName) ||
        bankAccounts[0]
      if (!targetBank) {
        toast.error('No hay cuenta bancaria configurada para liquidar la póliza.', 'Cuenta requerida')
        return
      }
      if (targetBank.balance < target.total) {
        toast.warning(
          `Saldo insuficiente en ${targetBank.bankName} (Disponible: ${money(targetBank.balance)}) para pagar ${target.folio}.`,
          'Saldo insuficiente'
        )
        return
      }
      assignedBankName = targetBank.bankName
      handleUpdateBankAccountBalance(targetBank.id, -target.total)
      const now = new Date()
      const paidDate = `${String(now.getDate()).padStart(2, '0')} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][now.getMonth()]} ${now.getFullYear()}`
      handleAddTransaction({
        id: `txn_${Date.now()}`,
        folio: `PAG-2026-${String(Math.floor(100 + Math.random() * 900))}`,
        date: paidDate,
        type: 'Gasto operativo',
        entityName: target.beneficiary,
        reference: `${target.expenseNature || target.category} · ${target.folio} · ${target.description}`,
        amount: target.total,
        method: target.paymentMethod,
        account: targetBank.bankName,
      })
    }

    setExpenses((prev) =>
      prev.map((e) =>
        e.id === expenseId
          ? {
              ...e,
              status: nextStatus,
              bankAccountName: assignedBankName || e.bankAccountName,
            }
          : e
      )
    )
    appendAuditLog({
      category: 'finance',
      action: `Cambio de estado de gasto (${prevStatus} → ${nextStatus})`,
      detail: `${target.folio} · ${target.description} · ${money(target.total)}`,
      user: activeSessionProfile.name,
    })
    toast.success(
      nextStatus === 'Pagado'
        ? `Póliza ${target.folio} pagada por ${money(target.total)} desde ${assignedBankName}.`
        : nextStatus === 'Cancelado'
          ? `Póliza ${target.folio} cancelada y excluida de totales y P&L.`
          : `Póliza ${target.folio} aprobada y lista para pago.`,
      `Estado: ${nextStatus}`
    )
  }

  const handleSaveExpenseBudget = (budget: ExpenseBudgetRule) => {
    setExpenseBudgets((prev) => {
      const exists = prev.some((b) => b.id === budget.id)
      if (exists) return prev.map((b) => (b.id === budget.id ? budget : b))
      return [...prev, budget]
    })
    appendAuditLog({
      category: 'finance',
      action: 'Configuración de presupuesto mensual',
      detail: `${budget.nature} · Límite ${money(budget.monthlyLimit)} · Alertas ${budget.warningThresholdPct}% / ${budget.criticalThresholdPct ?? 95}%`,
      user: activeSessionProfile.name,
    })
  }

  const handleToggleExpenseBudget = (budgetId: string) => {
    setExpenseBudgets((prev) =>
      prev.map((b) => (b.id === budgetId ? { ...b, active: !b.active } : b))
    )
  }

  const handleAddRecurringExpense = (tpl: RecurringExpenseTemplate) => {
    setRecurringExpenses((prev) => [tpl, ...prev])
    appendAuditLog({
      category: 'finance',
      action: 'Alta de plantilla de gasto recurrente',
      detail: `${tpl.title} · ${tpl.frequency} · ${money(tpl.amount)}`,
      user: activeSessionProfile.name,
    })
    toast.success(`Plantilla recurrente “${tpl.title}” creada.`, 'Plantilla guardada')
  }

  const handleToggleRecurringExpense = (tplId: string) => {
    setRecurringExpenses((prev) =>
      prev.map((t) => (t.id === tplId ? { ...t, active: !t.active } : t))
    )
  }

  const handleUpdateRecurringExpense = (updated: RecurringExpenseTemplate) => {
    setRecurringExpenses((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    appendAuditLog({
      category: 'finance',
      action: 'Edición de plantilla de gasto recurrente',
      detail: `${updated.title} · ${updated.frequency} · ${money(updated.amount)} · Próx. ${updated.nextRunDate}`,
      user: activeSessionProfile.name,
    })
    toast.success(`Plantilla “${updated.title}” actualizada.`, 'Plantilla actualizada')
  }

  const handleDeleteRecurringExpense = (tplId: string) => {
    const target = recurringExpenses.find((t) => t.id === tplId)
    setRecurringExpenses((prev) => prev.filter((t) => t.id !== tplId))
    if (target) {
      appendAuditLog({
        category: 'finance',
        action: 'Eliminación de plantilla de gasto recurrente',
        detail: `${target.title} · ${target.beneficiary}`,
        user: activeSessionProfile.name,
      })
      toast.info(`Plantilla “${target.title}” eliminada.`, 'Plantilla eliminada')
    }
  }

  const buildRecurringExecution = (
    tpl: RecurringExpenseTemplate,
    nextSeq: number,
    uidSuffix = ''
  ) => {
    const tax = tpl.hasTax ? Number((tpl.amount * 0.16).toFixed(2)) : 0
    const total = Number((tpl.amount + tax).toFixed(2))
    const folio = `GST-2026-${String(nextSeq).padStart(3, '0')}`
    const runIso = tpl.nextRunDate || new Date().toISOString().split('T')[0]
    const [yStr, mStr, dStr] = runIso.split('-')
    const mIdx = Math.max(0, Math.min(11, (Number(mStr) || 1) - 1))
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    const formattedDate = `${String(Number(dStr) || 1).padStart(2, '0')} ${months[mIdx]} ${yStr || '2026'}`

    const generated: ExpenseRecord = {
      id: `exp_${Date.now()}${uidSuffix}`,
      folio,
      date: formattedDate,
      category: tpl.category,
      expenseNature: tpl.nature,
      status: 'Pendiente',
      costBehavior: tpl.costBehavior,
      departmentId:
        tpl.departmentId || departments.find((d) => d.name === tpl.departmentName)?.id,
      departmentName: tpl.departmentName,
      costCenter:
        tpl.costCenter || departments.find((d) => d.name === tpl.departmentName)?.costCenter,
      locationId: tpl.locationId,
      locationName: tpl.locationName,
      accountCode: tpl.accountCode,
      accountName: tpl.accountName,
      bankAccountName: tpl.bankAccountName,
      description: tpl.description,
      beneficiary: tpl.beneficiary,
      amount: tpl.amount,
      tax,
      total,
      paymentMethod: tpl.paymentMethod,
      referenceDoc: `REC-${tpl.frequency.slice(0, 3).toUpperCase()}`,
      user: activeSessionProfile.name,
      isRecurring: true,
      recurrenceId: tpl.id,
    }

    const baseDate = new Date(`${runIso}T12:00:00`)
    if (!Number.isNaN(baseDate.getTime())) {
      if (tpl.frequency === 'Quincenal') baseDate.setDate(baseDate.getDate() + 15)
      else if (tpl.frequency === 'Anual') baseDate.setFullYear(baseDate.getFullYear() + 1)
      else baseDate.setMonth(baseDate.getMonth() + 1)
    }
    const nextIso = Number.isNaN(baseDate.getTime())
      ? runIso
      : baseDate.toISOString().split('T')[0]

    return { generated, runIso, nextIso, folio, total }
  }

  const handleGenerateRecurringExpense = (tplId: string) => {
    const tpl = recurringExpenses.find((t) => t.id === tplId)
    if (!tpl) return

    const { generated, runIso, nextIso, folio, total } = buildRecurringExecution(
      tpl,
      expenses.length + 1
    )

    setExpenses((prev) => [generated, ...prev])
    setRecurringExpenses((prev) =>
      prev.map((t) =>
        t.id === tpl.id
          ? { ...t, lastGeneratedDate: runIso, nextRunDate: nextIso }
          : t
      )
    )

    appendAuditLog({
      category: 'finance',
      action: 'Generación de póliza desde gasto recurrente',
      detail: `${folio} · ${tpl.title} · ${money(total)}`,
      user: activeSessionProfile.name,
    })
    toast.success(
      `Póliza ${folio} por ${money(total)} generada como Pendiente. Próxima fecha: ${nextIso}.`,
      'Póliza recurrente generada'
    )
  }

  const handleGenerateRecurringBatch = (tplIds: string[]) => {
    const targets = tplIds
      .map((id) => recurringExpenses.find((t) => t.id === id))
      .filter((t): t is RecurringExpenseTemplate => Boolean(t))
    if (targets.length === 0) return

    const baseSeq = expenses.length + 1
    const executions = targets.map((tpl, idx) =>
      buildRecurringExecution(tpl, baseSeq + idx, `_b${idx}`)
    )

    const generatedList = executions.map((ex) => ex.generated).reverse()
    const updatesById = new Map(
      targets.map((tpl, idx) => [
        tpl.id,
        { runIso: executions[idx].runIso, nextIso: executions[idx].nextIso },
      ])
    )

    setExpenses((prev) => [...generatedList, ...prev])
    setRecurringExpenses((prev) =>
      prev.map((t) => {
        const upd = updatesById.get(t.id)
        return upd ? { ...t, lastGeneratedDate: upd.runIso, nextRunDate: upd.nextIso } : t
      })
    )

    const totalBatch = executions.reduce((s, ex) => s + ex.total, 0)
    const folios = executions.map((ex) => ex.folio).join(', ')
    appendAuditLog({
      category: 'finance',
      action: 'Generación asistida en lote de gastos recurrentes',
      detail: `${targets.length} póliza(s) (${folios}) · Total ${money(totalBatch)}`,
      user: activeSessionProfile.name,
    })
    toast.success(
      `Se generaron ${targets.length} póliza(s) recurrentes (${folios}) por ${money(totalBatch)}.`,
      'Generación asistida completada'
    )
  }

  const handleAddSubsidiary = (sub: SubsidiaryRecord) => {
    setSubsidiaries((prev) => [sub, ...prev])
    appendAuditLog({
      category: 'admin',
      crudOperation: 'CREATE',
      entityType: 'Subsidiaria',
      entityId: sub.id,
      action: 'Creación de subsidiaria',
      detail: `${sub.code} · ${sub.name} (RFC: ${sub.taxId} · ${sub.currency}${sub.isHolding ? ' · Matriz' : ''})`,
      user: activeSessionProfile.name,
      userId: activeActorUserId,
    })
  }

  const handleUpdateSubsidiaries = (updatedSubs: SubsidiaryRecord[]) => {
    const prevById = new Map(subsidiaries.map((s) => [s.id, s]))

    updatedSubs.forEach((next) => {
      const prev = prevById.get(next.id)
      if (!prev) return

      const changes: string[] = []
      if (prev.code !== next.code) changes.push(`Código: ${prev.code} → ${next.code}`)
      if (prev.name !== next.name) changes.push(`Nombre: ${prev.name} → ${next.name}`)
      if (prev.legalName !== next.legalName) changes.push('Razón social actualizada')
      if (prev.taxId !== next.taxId) changes.push(`RFC: ${prev.taxId} → ${next.taxId}`)
      if (prev.country !== next.country) changes.push(`País: ${prev.country} → ${next.country}`)
      if (prev.currency !== next.currency) changes.push(`Divisa: ${prev.currency} → ${next.currency}`)
      if ((prev.legalRep || '') !== (next.legalRep || '')) {
        changes.push(`Rep. legal: ${prev.legalRep || '—'} → ${next.legalRep || '—'}`)
      }
      if ((prev.fiscalAddress || '') !== (next.fiscalAddress || '')) {
        changes.push('Domicilio fiscal actualizado')
      }
      if (Boolean(prev.isHolding) !== Boolean(next.isHolding)) {
        changes.push(`Matriz: ${prev.isHolding ? 'Sí' : 'No'} → ${next.isHolding ? 'Sí' : 'No'}`)
      }
      if (prev.active !== next.active) {
        changes.push(`Estado: ${prev.active ? 'Activa' : 'Inactiva'} → ${next.active ? 'Activa' : 'Inactiva'}`)
      }

      if (changes.length === 0) return

      const isStatusOnly = changes.length === 1 && prev.active !== next.active
      appendAuditLog({
        category: 'admin',
        crudOperation: 'UPDATE',
        entityType: 'Subsidiaria',
        entityId: next.id,
        action: isStatusOnly ? 'Cambio de estado de subsidiaria' : 'Actualización de subsidiaria',
        detail: isStatusOnly
          ? `${next.code} · ${next.name} → ${next.active ? 'Activa' : 'Inactiva'}`
          : `${next.code} · ${next.name} (${changes.join(' · ')})`,
        user: activeSessionProfile.name,
        userId: activeActorUserId,
      })
    })

    setSubsidiaries(updatedSubs)
  }

  const handleDeleteSubsidiary = (subsidiaryId: string) => {
    const target = subsidiaries.find((s) => s.id === subsidiaryId)
    const unlinkedDepts = departments.filter((d) => (d.subsidiaryIds || []).includes(subsidiaryId)).length
    const unlinkedLocs = locations.filter((l) => (l.subsidiaryIds || []).includes(subsidiaryId)).length

    setSubsidiaries((prev) => prev.filter((s) => s.id !== subsidiaryId))
    setDepartments((prev) =>
      prev.map((d) => ({
        ...d,
        subsidiaryIds: (d.subsidiaryIds || []).filter((id) => id !== subsidiaryId),
      }))
    )
    setLocations((prev) =>
      prev.map((l) => ({
        ...l,
        subsidiaryIds: (l.subsidiaryIds || []).filter((id) => id !== subsidiaryId),
      }))
    )
    if (target) {
      appendAuditLog({
        category: 'admin',
        crudOperation: 'DELETE',
        entityType: 'Subsidiaria',
        entityId: target.id,
        action: 'Eliminación de subsidiaria',
        detail: `${target.code} · ${target.name} (${target.taxId})${
          unlinkedDepts + unlinkedLocs > 0
            ? ` · ${unlinkedDepts} depto(s) y ${unlinkedLocs} sede(s) desvinculadas`
            : ''
        }`,
        user: activeSessionProfile.name,
        userId: activeActorUserId,
      })
      toast.info(`Subsidiaria “${target.name}” eliminada del sistema.`, 'Subsidiaria eliminada')
    }
  }

  const handleAddDepartment = (dep: DepartmentRecord) => {
    setDepartments((prev) => [dep, ...prev])
    const subCodes = (dep.subsidiaryIds || [])
      .map((id) => subsidiaries.find((s) => s.id === id)?.code || id)
      .join(', ')
    appendAuditLog({
      category: 'admin',
      crudOperation: 'CREATE',
      entityType: 'Departamento',
      entityId: dep.id,
      action: 'Creación de departamento',
      detail: `${dep.code} · ${dep.name} (Líder: ${dep.leader}${
        subCodes ? ` · Subsidiarias: ${subCodes}` : ''
      })`,
      user: activeSessionProfile.name,
      userId: activeActorUserId,
    })
  }

  const handleUpdateDepartments = (updatedDepartments: DepartmentRecord[]) => {
    const prevById = new Map(departments.map((d) => [d.id, d]))
    const subCodeById = new Map(subsidiaries.map((s) => [s.id, s.code]))

    const relationOnlyChanges: Array<{
      dept: DepartmentRecord
      addedSubId: string | null
      removedSubId: string | null
    }> = []
    const detailedChanges: Array<{
      dept: DepartmentRecord
      changes: string[]
      isStatusOnly: boolean
    }> = []

    updatedDepartments.forEach((next) => {
      const prev = prevById.get(next.id)
      if (!prev) return

      const changes: string[] = []
      if (prev.code !== next.code) changes.push(`Código: ${prev.code} → ${next.code}`)
      if (prev.name !== next.name) changes.push(`Nombre: ${prev.name} → ${next.name}`)
      if (prev.leader !== next.leader) changes.push(`Líder: ${prev.leader} → ${next.leader}`)
      if ((prev.costCenter || '') !== (next.costCenter || '')) {
        changes.push(`CC: ${prev.costCenter || '—'} → ${next.costCenter || '—'}`)
      }
      if ((prev.description || '') !== (next.description || '')) {
        changes.push('Descripción actualizada')
      }
      if (prev.active !== next.active) {
        changes.push(`Estado: ${prev.active ? 'Activo' : 'Inactivo'} → ${next.active ? 'Activo' : 'Inactivo'}`)
      }

      const prevSubSet = new Set(prev.subsidiaryIds || [])
      const nextSubSet = new Set(next.subsidiaryIds || [])
      const addedSubs = Array.from(nextSubSet).filter((id) => !prevSubSet.has(id))
      const removedSubs = Array.from(prevSubSet).filter((id) => !nextSubSet.has(id))

      if (addedSubs.length > 0) {
        changes.push(
          `+Vinculado a: ${addedSubs.map((id) => subCodeById.get(id) || id).join(', ')}`
        )
      }
      if (removedSubs.length > 0) {
        changes.push(
          `-Desvinculado de: ${removedSubs.map((id) => subCodeById.get(id) || id).join(', ')}`
        )
      }

      if (changes.length === 0) return

      const onlySingleSubToggle =
        changes.length === 1 &&
        ((addedSubs.length === 1 && removedSubs.length === 0) ||
          (removedSubs.length === 1 && addedSubs.length === 0))

      if (onlySingleSubToggle) {
        relationOnlyChanges.push({
          dept: next,
          addedSubId: addedSubs[0] || null,
          removedSubId: removedSubs[0] || null,
        })
      }

      detailedChanges.push({
        dept: next,
        changes,
        isStatusOnly: changes.length === 1 && prev.active !== next.active,
      })
    })

    const sharedAddedSubId =
      relationOnlyChanges.length > 1 &&
      relationOnlyChanges.length === detailedChanges.length &&
      relationOnlyChanges.every(
        (item) => item.addedSubId && item.addedSubId === relationOnlyChanges[0].addedSubId
      )
        ? relationOnlyChanges[0].addedSubId
        : null

    const sharedRemovedSubId =
      relationOnlyChanges.length > 1 &&
      relationOnlyChanges.length === detailedChanges.length &&
      relationOnlyChanges.every(
        (item) => item.removedSubId && item.removedSubId === relationOnlyChanges[0].removedSubId
      )
        ? relationOnlyChanges[0].removedSubId
        : null

    if (sharedAddedSubId || sharedRemovedSubId) {
      const targetSubId = (sharedAddedSubId || sharedRemovedSubId)!
      const subLabel = subCodeById.get(targetSubId) || targetSubId
      const codes = relationOnlyChanges.map((item) => item.dept.code).join(', ')
      appendAuditLog({
        category: 'admin',
        crudOperation: 'UPDATE',
        entityType: 'Departamento',
        entityId: relationOnlyChanges.map((item) => item.dept.id).join(','),
        action: sharedAddedSubId
          ? 'Vinculación masiva de departamentos'
          : 'Desvinculación masiva de departamentos',
        detail: `${relationOnlyChanges.length} departamento(s) ${
          sharedAddedSubId ? 'vinculados a' : 'desvinculados de'
        } ${subLabel} (${codes})`,
        user: activeSessionProfile.name,
        userId: activeActorUserId,
      })
    } else {
      detailedChanges.forEach(({ dept, changes, isStatusOnly }) => {
        appendAuditLog({
          category: 'admin',
          crudOperation: 'UPDATE',
          entityType: 'Departamento',
          entityId: dept.id,
          action: isStatusOnly
            ? 'Cambio de estado de departamento'
            : 'Actualización de departamento',
          detail: isStatusOnly
            ? `${dept.code} · ${dept.name} → ${dept.active ? 'Activo' : 'Inactivo'}`
            : `${dept.code} · ${dept.name} (${changes.join(' · ')})`,
          user: activeSessionProfile.name,
          userId: activeActorUserId,
        })
      })
    }

    setDepartments(updatedDepartments)
  }

  const handleDeleteDepartment = (departmentId: string) => {
    const target = departments.find((d) => d.id === departmentId)
    setDepartments((prev) => prev.filter((d) => d.id !== departmentId))
    if (target) {
      appendAuditLog({
        category: 'admin',
        crudOperation: 'DELETE',
        entityType: 'Departamento',
        entityId: target.id,
        action: 'Eliminación de departamento',
        detail: `${target.code} · ${target.name} (Líder: ${target.leader})`,
        user: activeSessionProfile.name,
        userId: activeActorUserId,
      })
      toast.info(`Departamento “${target.name}” eliminado del sistema.`, 'Departamento eliminado')
    }
  }

  const handleAddLocation = (loc: PhysicalLocationRecord) => {
    const defaultSub =
      subsidiaries.find((s) => s.active && s.isHolding) ||
      subsidiaries.find((s) => s.active) ||
      subsidiaries[0]
    const normalizedLoc: PhysicalLocationRecord = {
      ...loc,
      subsidiaryIds:
        loc.subsidiaryIds && loc.subsidiaryIds.length > 0
          ? loc.subsidiaryIds
          : defaultSub
          ? [defaultSub.id]
          : [],
    }
    setLocations((prev) => [normalizedLoc, ...prev])
    const subCodes = normalizedLoc.subsidiaryIds
      .map((id) => subsidiaries.find((s) => s.id === id)?.code || id)
      .join(', ')
    appendAuditLog({
      category: 'admin',
      crudOperation: 'CREATE',
      entityType: 'Ubicación física',
      entityId: normalizedLoc.id,
      action: 'Creación de ubicación física',
      detail: `${normalizedLoc.code} · ${normalizedLoc.name} (${normalizedLoc.city}, ${normalizedLoc.state}${
        subCodes ? ` · Subsidiarias: ${subCodes}` : ''
      })`,
      user: activeSessionProfile.name,
      userId: activeActorUserId,
    })
    setWarehouses((prev) => {
      const exists = prev.some(
        (w) =>
          w.locationId === normalizedLoc.id ||
          w.code.toLowerCase() === normalizedLoc.code.toLowerCase() ||
          w.name.toLowerCase() === normalizedLoc.name.toLowerCase()
      )
      if (exists) return prev
      return [
        ...prev,
        {
          id: `wh_${normalizedLoc.id}`,
          code: normalizedLoc.code,
          name: normalizedLoc.name,
          city: normalizedLoc.city,
          state: normalizedLoc.state,
          address: normalizedLoc.address,
          capacityPercentage: 0,
          isDefault: false,
          active: normalizedLoc.active,
          locationId: normalizedLoc.id,
          locationType: normalizedLoc.type,
        },
      ]
    })
  }

  const handleUpdateLocations = (updatedLocations: PhysicalLocationRecord[]) => {
    const prevById = new Map(locations.map((l) => [l.id, l]))
    const subCodeById = new Map(subsidiaries.map((s) => [s.id, s.code]))

    const relationOnlyChanges: Array<{
      loc: PhysicalLocationRecord
      addedSubId: string | null
      removedSubId: string | null
    }> = []
    const detailedChanges: Array<{
      loc: PhysicalLocationRecord
      changes: string[]
      isStatusOnly: boolean
    }> = []

    updatedLocations.forEach((next) => {
      const prev = prevById.get(next.id)
      if (!prev) return

      const changes: string[] = []
      if (prev.code !== next.code) changes.push(`Código: ${prev.code} → ${next.code}`)
      if (prev.name !== next.name) changes.push(`Nombre: ${prev.name} → ${next.name}`)
      if (prev.type !== next.type) changes.push(`Tipo: ${prev.type} → ${next.type}`)
      if (prev.address !== next.address) changes.push('Dirección actualizada')
      if (prev.city !== next.city || prev.state !== next.state) {
        changes.push(`Ciudad: ${prev.city}, ${prev.state} → ${next.city}, ${next.state}`)
      }
      if (prev.country !== next.country) changes.push(`País: ${prev.country} → ${next.country}`)
      if ((prev.manager || '') !== (next.manager || '')) {
        changes.push(`Encargado: ${prev.manager || '—'} → ${next.manager || '—'}`)
      }
      if (prev.active !== next.active) {
        changes.push(`Estado: ${prev.active ? 'Activa' : 'Inactiva'} → ${next.active ? 'Activa' : 'Inactiva'}`)
      }

      const prevSubSet = new Set(prev.subsidiaryIds || [])
      const nextSubSet = new Set(next.subsidiaryIds || [])
      const addedSubs = Array.from(nextSubSet).filter((id) => !prevSubSet.has(id))
      const removedSubs = Array.from(prevSubSet).filter((id) => !nextSubSet.has(id))

      if (addedSubs.length > 0) {
        changes.push(
          `+Vinculada a: ${addedSubs.map((id) => subCodeById.get(id) || id).join(', ')}`
        )
      }
      if (removedSubs.length > 0) {
        changes.push(
          `-Desvinculada de: ${removedSubs.map((id) => subCodeById.get(id) || id).join(', ')}`
        )
      }

      if (changes.length === 0) return

      const onlySingleSubToggle =
        changes.length === 1 &&
        ((addedSubs.length === 1 && removedSubs.length === 0) ||
          (removedSubs.length === 1 && addedSubs.length === 0))

      if (onlySingleSubToggle) {
        relationOnlyChanges.push({
          loc: next,
          addedSubId: addedSubs[0] || null,
          removedSubId: removedSubs[0] || null,
        })
      }

      detailedChanges.push({
        loc: next,
        changes,
        isStatusOnly: changes.length === 1 && prev.active !== next.active,
      })
    })

    const sharedAddedSubId =
      relationOnlyChanges.length > 1 &&
      relationOnlyChanges.length === detailedChanges.length &&
      relationOnlyChanges.every(
        (item) => item.addedSubId && item.addedSubId === relationOnlyChanges[0].addedSubId
      )
        ? relationOnlyChanges[0].addedSubId
        : null

    const sharedRemovedSubId =
      relationOnlyChanges.length > 1 &&
      relationOnlyChanges.length === detailedChanges.length &&
      relationOnlyChanges.every(
        (item) => item.removedSubId && item.removedSubId === relationOnlyChanges[0].removedSubId
      )
        ? relationOnlyChanges[0].removedSubId
        : null

    if (sharedAddedSubId || sharedRemovedSubId) {
      const targetSubId = (sharedAddedSubId || sharedRemovedSubId)!
      const subLabel = subCodeById.get(targetSubId) || targetSubId
      const codes = relationOnlyChanges.map((item) => item.loc.code).join(', ')
      appendAuditLog({
        category: 'admin',
        crudOperation: 'UPDATE',
        entityType: 'Ubicación física',
        entityId: relationOnlyChanges.map((item) => item.loc.id).join(','),
        action: sharedAddedSubId
          ? 'Vinculación masiva de ubicaciones'
          : 'Desvinculación masiva de ubicaciones',
        detail: `${relationOnlyChanges.length} ubicación(es) ${
          sharedAddedSubId ? 'vinculadas a' : 'desvinculadas de'
        } ${subLabel} (${codes})`,
        user: activeSessionProfile.name,
        userId: activeActorUserId,
      })
    } else {
      detailedChanges.forEach(({ loc, changes, isStatusOnly }) => {
        appendAuditLog({
          category: 'admin',
          crudOperation: 'UPDATE',
          entityType: 'Ubicación física',
          entityId: loc.id,
          action: isStatusOnly
            ? 'Cambio de estado de ubicación física'
            : 'Actualización de ubicación física',
          detail: isStatusOnly
            ? `${loc.code} · ${loc.name} → ${loc.active ? 'Activa' : 'Inactiva'}`
            : `${loc.code} · ${loc.name} (${changes.join(' · ')})`,
          user: activeSessionProfile.name,
          userId: activeActorUserId,
        })
      })
    }

    setLocations(updatedLocations)
    setWarehouses((prev) =>
      prev.map((w) => {
        const matched = updatedLocations.find(
          (l) =>
            l.id === w.locationId ||
            l.code.toLowerCase() === w.code.toLowerCase() ||
            l.name.toLowerCase() === w.name.toLowerCase()
        )
        return matched
          ? {
              ...w,
              active: matched.active,
              name: matched.name,
              city: matched.city,
              state: matched.state,
              address: matched.address,
              locationType: matched.type,
            }
          : w
      })
    )
  }

  const handleRemoveLocation = (locationId: string) => {
    const target = locations.find((l) => l.id === locationId)
    setLocations((prev) => prev.filter((l) => l.id !== locationId))
    if (target) {
      setWarehouses((prev) =>
        prev.filter(
          (w) =>
            w.locationId !== target.id &&
            w.code.toLowerCase() !== target.code.toLowerCase() &&
            w.name.toLowerCase() !== target.name.toLowerCase()
        )
      )
    }
  }

  const handleDeleteAdminLocation = (locationId: string) => {
    const target = locations.find((l) => l.id === locationId)
    handleRemoveLocation(locationId)
    if (target) {
      appendAuditLog({
        category: 'admin',
        crudOperation: 'DELETE',
        entityType: 'Ubicación física',
        entityId: target.id,
        action: 'Eliminación de ubicación física',
        detail: `${target.code} · ${target.name} (${target.city}, ${target.state})`,
        user: activeSessionProfile.name,
        userId: activeActorUserId,
      })
      toast.info(`Ubicación física “${target.name}” eliminada del sistema.`, 'Ubicación eliminada')
    }
  }

  const handleUpdateBankAccountBalance = (accountId: string, delta: number) => {
    setBankAccounts((prev) =>
      prev.map((acc) => (acc.id === accountId ? { ...acc, balance: acc.balance + delta } : acc))
    )
  }

  const handleConvertToOrder = (quote: Quote) => {
    const maxNum = orders.reduce((max, o) => {
      const n = parseInt(o.folio.split('-').pop() || '0', 10)
      return Number.isNaN(n) ? max : Math.max(max, n)
    }, orders.length)
    const folio = `PED-2026-${String(maxNum + 1).padStart(3, '0')}`
    const today = new Date()
    const delivery = new Date()
    delivery.setDate(today.getDate() + 7)

    const formatDateStr = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][d.getMonth()]} ${d.getFullYear()}`

    const newOrder: SalesOrder = {
      id: `order_${Date.now()}`,
      folio,
      quoteId: quote.id,
      quoteFolio: quote.folio,
      clientId: quote.clientId,
      clientName: quote.clientName,
      clientCompany: quote.clientCompany,
      date: formatDateStr(today),
      deliveryDate: formatDateStr(delivery),
      items: quote.items,
      subtotal: quote.subtotal,
      taxTotal: quote.taxTotal,
      total: quote.total,
      currency: quote.currency,
      status: 'Confirmado',
      shippingAddress: 'Dirección confirmada en cotización',
      notes: `Generado a partir de la cotización ${quote.folio}.`,
    }

    setQuotes((prevQuotes) =>
      prevQuotes.map((q) =>
        q.id === quote.id ? { ...q, status: 'Aprobada', convertedToOrderId: newOrder.id } : q
      )
    )
    setOrders((prevOrders) => [newOrder, ...prevOrders])
    setSalesSection('Pedidos')
    toast.success(`La cotización ${quote.folio} se convirtió en el pedido ${folio}.`, 'Pedido de venta generado')
    appendAuditLog({
      category: 'sales',
      action: 'Generación de pedido de venta',
      detail: `Folio ${folio} desde cotización ${quote.folio} · ${quote.clientCompany} · ${money(quote.total)}`,
      user: activeSessionProfile.name,
    })
  }

  const handleCreateSalesInvoice = (invoice: InvoiceReceivable) => {
    setReceivables((prev) => [invoice, ...prev])
    if (invoice.orderId || (invoice.orderFolio && invoice.orderFolio !== 'DIRECTA')) {
      setOrders((prevOrders) =>
        prevOrders.map((ord) => {
          const isMatch =
            (invoice.orderId && ord.id === invoice.orderId) ||
            ord.folio === invoice.orderFolio
          if (!isMatch) return ord
          return {
            ...ord,
            invoiceIds: [...(ord.invoiceIds || []), invoice.id],
            invoiceFolios: [...(ord.invoiceFolios || []), invoice.folio],
          }
        })
      )
    }
    setChartAccounts((prev) =>
      prev.map((acc) => {
        if (acc.code === '1005-001') return { ...acc, balance: acc.balance + invoice.total }
        if (acc.code === '4001-001') return { ...acc, balance: acc.balance + invoice.subtotal }
        if (acc.code === '2005-001') return { ...acc, balance: acc.balance + invoice.tax }
        return acc
      })
    )
    appendAuditLog({
      category: 'sales',
      action: 'Creación de factura de venta',
      detail: `Folio ${invoice.folio} · ${invoice.clientCompany} · ${money(invoice.total)}`,
      user: activeSessionProfile.name,
    })
  }

  const formatShortReturnDate = () => {
    const d = new Date()
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`
  }

  const handleUpdateReturnWorkflows = (
    next: ReturnWorkflowsSettings,
    summaryDetail: string
  ) => {
    setReturnWorkflows(next)
    saveStoredReturnWorkflows(next)
    appendAuditLog({
      category: 'admin',
      crudOperation: 'UPDATE',
      entityType: 'Flujos de devoluciones',
      entityId: 'return_workflows',
      action: 'Actualización de flujos y aprobaciones de devoluciones',
      detail: summaryDetail,
      user: activeSessionProfile.name,
      userId: activeActorUserId,
    })
    toast.success(
      'Flujos de trabajo de devoluciones actualizados y aplicados en Ventas y Compras.',
      'Flujos guardados'
    )
  }

  const handleCreateCustomerReturn = (ret: CustomerReturn) => {
    const resolvedInitialStatus = getDefaultInitialStatusForReturn(returnWorkflows.customer)
    let created: CustomerReturn = {
      ...ret,
      status: resolvedInitialStatus,
      workflowHistory:
        ret.workflowHistory && ret.workflowHistory.length > 0
          ? ret.workflowHistory.map((h, i) =>
              i === 0 ? { ...h, toStatus: resolvedInitialStatus } : h
            )
          : [
              {
                id: `whist_c_${Date.now()}`,
                timestampIso: new Date().toISOString(),
                toStatus: resolvedInitialStatus,
                actor: activeSessionProfile.name,
                action: 'created',
                note: ret.notes,
              },
            ],
    }
    if (created.status === 'Recibida en almacén' && !created.inventoryApplied) {
      const restockLines = created.items.filter((it) => it.disposition === 'Reingreso a almacén')
      if (restockLines.length > 0) {
        setInventory((prev) =>
          prev.map((inv) => {
            if (inv.warehouseId !== created.warehouseId) return inv
            const matched = restockLines.find(
              (l) => l.sku.trim().toLowerCase() === inv.sku.trim().toLowerCase()
            )
            return matched ? { ...inv, stock: inv.stock + matched.quantity } : inv
          })
        )
        restockLines.forEach((line, idx) => {
          handleAddMovement({
            id: `mov_cli_ret_init_${Date.now()}_${idx}`,
            folio: `MOV-DEV-${String(movements.length + idx + 1).padStart(3, '0')}`,
            date: formatShortReturnDate(),
            type: 'Entrada',
            sku: line.sku,
            productName: line.name,
            quantity: line.quantity,
            targetWarehouse: created.warehouseName,
            referenceDoc: created.folio,
            reason: `Reingreso inicial por devolución de cliente (${created.clientCompany})`,
            user: activeSessionProfile.name,
          })
        })
      }
      created = { ...created, inventoryApplied: true }
    }
    setCustomerReturns((prev) => {
      const next = [created, ...prev]
      saveStoredCustomerReturns(next)
      return next
    })
    appendAuditLog({
      category: 'sales',
      crudOperation: 'CREATE',
      entityType: 'Devolución de cliente',
      entityId: created.id,
      action: 'Registro de devolución de cliente (RMA)',
      detail: `${created.folio} · ${created.clientCompany} · ${created.orderFolio} · Estado inicial: ${created.status} · ${money(created.total)}`,
      user: activeSessionProfile.name,
      userId: activeActorUserId,
    })
    toast.success(`Devolución ${created.folio} registrada para ${created.clientCompany}.`, 'RMA registrado')
  }

  const applyCustomerReturnTransition = (
    target: CustomerReturn,
    nextStatus: CustomerReturnStatus,
    options?: { noteOverride?: string; approvedBy?: string }
  ) => {
    let appliedInv = Boolean(target.inventoryApplied)
    let appliedFin = Boolean(target.financeApplied)
    let creditNoteFolio = target.creditNoteFolio

    if (nextStatus === 'Recibida en almacén' && !appliedInv) {
      const restockLines = target.items.filter((it) => it.disposition === 'Reingreso a almacén')
      if (restockLines.length > 0) {
        setInventory((prev) =>
          prev.map((inv) => {
            if (inv.warehouseId !== target.warehouseId) return inv
            const matched = restockLines.find(
              (l) => l.sku.trim().toLowerCase() === inv.sku.trim().toLowerCase()
            )
            return matched ? { ...inv, stock: inv.stock + matched.quantity } : inv
          })
        )
        restockLines.forEach((line, idx) => {
          handleAddMovement({
            id: `mov_cli_ret_${Date.now()}_${idx}`,
            folio: `MOV-DEV-${String(movements.length + idx + 1).padStart(3, '0')}`,
            date: formatShortReturnDate(),
            type: 'Entrada',
            sku: line.sku,
            productName: line.name,
            quantity: line.quantity,
            targetWarehouse: target.warehouseName,
            referenceDoc: target.folio,
            reason: `Reingreso por devolución de cliente (${target.clientCompany})`,
            user: activeSessionProfile.name,
          })
        })
      }
      appliedInv = true
    }

    if (nextStatus === 'Nota de crédito emitida' && !appliedFin) {
      creditNoteFolio =
        creditNoteFolio || `NC-CLI-2026-${String(customerReturns.length + 101).padStart(3, '0')}`
      if (target.invoiceId || target.invoiceFolio) {
        setReceivables((prev) =>
          prev.map((inv) => {
            const matches =
              (target.invoiceId && inv.id === target.invoiceId) ||
              (target.invoiceFolio && inv.folio === target.invoiceFolio)
            if (!matches) return inv
            const nextBalance = Math.max(0, inv.balance - target.total)
            const nextStatusInv =
              nextBalance === 0
                ? ('Pagada' as const)
                : inv.paidAmount > 0 || nextBalance < inv.total
                ? ('Parcial' as const)
                : inv.status
            return {
              ...inv,
              balance: nextBalance,
              status: nextStatusInv,
              notes: `${inv.notes ? `${inv.notes} · ` : ''}Acreditado por ${creditNoteFolio} (${money(target.total)})`,
            }
          })
        )
      }
      appliedFin = true
    }

    const nowIso = new Date().toISOString()
    const mergedNotes = options?.noteOverride
      ? target.notes
        ? `${target.notes} · ${options.noteOverride}`
        : options.noteOverride
      : target.notes

    setCustomerReturns((prev) => {
      const next = prev.map((r) =>
        r.id === target.id
          ? {
              ...r,
              status: nextStatus,
              notes: mergedNotes,
              inventoryApplied: appliedInv,
              financeApplied: appliedFin,
              creditNoteFolio,
              approvalStatus: options?.approvedBy ? ('approved' as const) : ('not_required' as const),
              pendingTargetStatus: undefined,
              approvedBy: options?.approvedBy || r.approvedBy,
              approvedAtIso: options?.approvedBy ? nowIso : r.approvedAtIso,
              updatedAtIso: nowIso,
              workflowHistory: [
                {
                  id: `whist_c_${Date.now()}`,
                  timestampIso: nowIso,
                  fromStatus: target.status,
                  toStatus: nextStatus,
                  actor: options?.approvedBy || activeSessionProfile.name,
                  action: options?.approvedBy ? ('approved' as const) : ('transition' as const),
                  note: options?.noteOverride,
                },
                ...(r.workflowHistory || []),
              ],
            }
          : r
      )
      saveStoredCustomerReturns(next)
      return next
    })

    appendAuditLog({
      category: nextStatus === 'Nota de crédito emitida' ? 'finance' : 'sales',
      crudOperation: 'UPDATE',
      entityType: 'Devolución de cliente',
      entityId: target.id,
      action: options?.approvedBy
        ? `Aprobación y transición de RMA cliente a "${nextStatus}"`
        : `Actualización de RMA cliente a "${nextStatus}"`,
      detail: `${target.folio} · ${target.clientCompany}${creditNoteFolio ? ` · ${creditNoteFolio}` : ''}`,
      user: activeSessionProfile.name,
      userId: activeActorUserId,
    })

    if (nextStatus === 'Recibida en almacén') {
      toast.success(
        `Devolución ${target.folio} recibida en ${target.warehouseName}. Existencias y Kardex actualizados.`,
        'Recepción en almacén'
      )
    } else if (nextStatus === 'Nota de crédito emitida') {
      toast.success(
        `Nota de crédito ${creditNoteFolio} emitida${target.invoiceFolio ? ` sobre ${target.invoiceFolio}` : ''}.`,
        'Nota de crédito aplicada'
      )
    } else {
      toast.info(`Devolución ${target.folio} actualizada a "${nextStatus}".`, 'Estado RMA')
    }
  }

  const handleRequestCustomerReturnApproval = (
    returnId: string,
    targetStatus: CustomerReturnStatus,
    noteOverride?: string
  ) => {
    const target = customerReturns.find((r) => r.id === returnId)
    if (!target) return
    if (isReturnEditBlocked(returnWorkflows.customer, target.status)) {
      toast.warning(
        `El expediente ${target.folio} está en el estado final "${target.status}" y tiene la edición bloqueada.`,
        'Estado final bloqueado'
      )
      return
    }
    const allowed = getAllowedNextStatusesForReturn(returnWorkflows.customer, target.status)
    if (!allowed.includes(targetStatus)) {
      toast.warning(
        `El flujo configurado no permite pasar de "${target.status}" a "${targetStatus}".`,
        'Transición restringida'
      )
      return
    }
    const targetRule = returnWorkflows.customer.steps.find((s) => s.status === targetStatus)
    const nowIso = new Date().toISOString()
    const mergedNotes = noteOverride
      ? target.notes
        ? `${target.notes} · ${noteOverride}`
        : noteOverride
      : target.notes

    setCustomerReturns((prev) => {
      const next = prev.map((r) =>
        r.id === returnId
          ? {
              ...r,
              notes: mergedNotes,
              approvalStatus: 'pending' as const,
              pendingTargetStatus: targetStatus,
              approvalRequestedBy: activeSessionProfile.name,
              approvalRequestedAtIso: nowIso,
              updatedAtIso: nowIso,
              workflowHistory: [
                {
                  id: `whist_creq_${Date.now()}`,
                  timestampIso: nowIso,
                  fromStatus: target.status,
                  toStatus: targetStatus,
                  actor: activeSessionProfile.name,
                  action: 'approval_requested' as const,
                  note: noteOverride || `Requiere: ${targetRule?.approverRole || 'Administrador'}`,
                },
                ...(r.workflowHistory || []),
              ],
            }
          : r
      )
      saveStoredCustomerReturns(next)
      return next
    })

    appendAuditLog({
      category: 'sales',
      crudOperation: 'UPDATE',
      entityType: 'Devolución de cliente',
      entityId: target.id,
      action: `Solicitud de aprobación RMA → "${targetStatus}"`,
      detail: `${target.folio} · ${target.clientCompany} · Requiere rol: ${targetRule?.approverRole || 'Administrador'}`,
      user: activeSessionProfile.name,
      userId: activeActorUserId,
    })

    toast.info(
      `Aprobación solicitada para ${target.folio} (${targetRule?.approverRole || 'Administrador'}).`,
      'En cola de aprobación'
    )
  }

  const handleApproveCustomerReturnTransition = (returnId: string) => {
    const target = customerReturns.find((r) => r.id === returnId)
    if (!target || target.approvalStatus !== 'pending' || !target.pendingTargetStatus) return
    if (isReturnEditBlocked(returnWorkflows.customer, target.status)) {
      toast.warning(
        `El expediente ${target.folio} está en el estado final "${target.status}" y tiene la edición bloqueada.`,
        'Estado final bloqueado'
      )
      return
    }
    const targetRule = returnWorkflows.customer.steps.find(
      (s) => s.status === target.pendingTargetStatus
    )
    const canApprove = canUserApproveWorkflowStep(
      targetRule?.approverRole || 'Administrador',
      activeSessionProfile.roles,
      isFullAdmin,
      true
    )
    if (!canApprove) {
      toast.warning(
        `Esta transición requiere aprobación del rol "${targetRule?.approverRole || 'Administrador'}".`,
        'Aprobación denegada'
      )
      return
    }
    applyCustomerReturnTransition(target, target.pendingTargetStatus, {
      approvedBy: activeSessionProfile.name,
    })
  }

  const handleRejectCustomerReturnApproval = (returnId: string, reason?: string) => {
    const target = customerReturns.find((r) => r.id === returnId)
    if (!target || target.approvalStatus !== 'pending') return
    const nowIso = new Date().toISOString()
    const rejectedTarget = target.pendingTargetStatus || target.status
    setCustomerReturns((prev) => {
      const next = prev.map((r) =>
        r.id === returnId
          ? {
              ...r,
              approvalStatus: 'rejected' as const,
              pendingTargetStatus: undefined,
              rejectionReason: reason,
              updatedAtIso: nowIso,
              workflowHistory: [
                {
                  id: `whist_crej_${Date.now()}`,
                  timestampIso: nowIso,
                  fromStatus: target.status,
                  toStatus: rejectedTarget,
                  actor: activeSessionProfile.name,
                  action: 'approval_rejected' as const,
                  note: reason || 'Solicitud rechazada por aprobador',
                },
                ...(r.workflowHistory || []),
              ],
            }
          : r
      )
      saveStoredCustomerReturns(next)
      return next
    })
    appendAuditLog({
      category: 'sales',
      crudOperation: 'UPDATE',
      entityType: 'Devolución de cliente',
      entityId: target.id,
      action: `Rechazo de aprobación RMA → "${rejectedTarget}"`,
      detail: `${target.folio} · ${target.clientCompany}${reason ? ` · ${reason}` : ''}`,
      user: activeSessionProfile.name,
      userId: activeActorUserId,
    })
    toast.warning(`Solicitud de transición para ${target.folio} rechazada.`, 'Aprobación rechazada')
  }

  const handleUpdateCustomerReturnDetails = (returnId: string, notes: string) => {
    const target = customerReturns.find((r) => r.id === returnId)
    if (!target) return
    if (isReturnEditBlocked(returnWorkflows.customer, target.status)) {
      toast.warning(
        `El expediente ${target.folio} está en el estado final "${target.status}" y tiene la edición bloqueada.`,
        'Edición bloqueada'
      )
      return
    }
    const nowIso = new Date().toISOString()
    const mergedNotes = target.notes ? `${target.notes} · ${notes}` : notes
    setCustomerReturns((prev) => {
      const next = prev.map((r) =>
        r.id === returnId ? { ...r, notes: mergedNotes, updatedAtIso: nowIso } : r
      )
      saveStoredCustomerReturns(next)
      return next
    })
    appendAuditLog({
      category: 'sales',
      crudOperation: 'UPDATE',
      entityType: 'Devolución de cliente',
      entityId: target.id,
      action: 'Actualización de notas en RMA cliente',
      detail: `${target.folio} · ${notes}`,
      user: activeSessionProfile.name,
      userId: activeActorUserId,
    })
    toast.success(`Nota agregada a ${target.folio}.`, 'RMA actualizado')
  }

  const handleAdvanceCustomerReturn = (
    returnId: string,
    nextStatus: CustomerReturnStatus,
    noteOverride?: string
  ) => {
    const target = customerReturns.find((r) => r.id === returnId)
    if (!target) return
    if (isReturnEditBlocked(returnWorkflows.customer, target.status)) {
      toast.warning(
        `El expediente ${target.folio} está en el estado final "${target.status}" y tiene la edición bloqueada.`,
        'Estado final bloqueado'
      )
      return
    }
    const allowed = getAllowedNextStatusesForReturn(returnWorkflows.customer, target.status)
    if (!allowed.includes(nextStatus)) {
      toast.warning(
        `Transición de "${target.status}" a "${nextStatus}" deshabilitada en el flujo.`,
        'Flujo de devoluciones'
      )
      return
    }
    if (doesTransitionRequireApproval(returnWorkflows.customer, nextStatus, target.total)) {
      handleRequestCustomerReturnApproval(returnId, nextStatus, noteOverride)
      return
    }
    applyCustomerReturnTransition(target, nextStatus, { noteOverride })
  }

  const handleDeleteCustomerReturn = (returnId: string) => {
    const target = customerReturns.find((r) => r.id === returnId)
    if (
      target &&
      isReturnDeleteBlocked(returnWorkflows.customer, target.status, {
        inventoryApplied: target.inventoryApplied,
        financeApplied: target.financeApplied,
      })
    ) {
      toast.warning(
        'No se puede eliminar un expediente en estado final o con impacto aplicado en Kardex/CxC.',
        'Bloqueado por flujo'
      )
      return
    }
    setCustomerReturns((prev) => {
      const next = prev.filter((r) => r.id !== returnId)
      saveStoredCustomerReturns(next)
      return next
    })
    if (target) {
      appendAuditLog({
        category: 'sales',
        crudOperation: 'DELETE',
        entityType: 'Devolución de cliente',
        entityId: target.id,
        action: 'Eliminación de devolución de cliente',
        detail: `${target.folio} · ${target.clientCompany}`,
        user: activeSessionProfile.name,
        userId: activeActorUserId,
      })
      toast.info(`Devolución ${target.folio} eliminada.`, 'RMA eliminado')
    }
  }

  const handleCreateSupplierReturn = (ret: SupplierReturn) => {
    const resolvedInitialStatus = getDefaultInitialStatusForReturn(returnWorkflows.supplier)
    let created: SupplierReturn = {
      ...ret,
      status: resolvedInitialStatus,
      workflowHistory:
        ret.workflowHistory && ret.workflowHistory.length > 0
          ? ret.workflowHistory.map((h, i) =>
              i === 0 ? { ...h, toStatus: resolvedInitialStatus } : h
            )
          : [
              {
                id: `whist_p_${Date.now()}`,
                timestampIso: new Date().toISOString(),
                toStatus: resolvedInitialStatus,
                actor: activeSessionProfile.name,
                action: 'created',
                note: ret.notes,
              },
            ],
    }
    if (created.status === 'Enviada a proveedor' && !created.inventoryApplied) {
      setInventory((prev) =>
        prev.map((inv) => {
          if (inv.warehouseId !== created.warehouseId) return inv
          const matched = created.items.find(
            (l) => l.sku.trim().toLowerCase() === inv.sku.trim().toLowerCase()
          )
          return matched ? { ...inv, stock: Math.max(0, inv.stock - matched.quantity) } : inv
        })
      )
      created.items.forEach((line, idx) => {
        handleAddMovement({
          id: `mov_prv_ret_init_${Date.now()}_${idx}`,
          folio: `MOV-RTV-${String(movements.length + idx + 1).padStart(3, '0')}`,
          date: formatShortReturnDate(),
          type: 'Salida',
          sku: line.sku,
          productName: line.name,
          quantity: line.quantity,
          sourceWarehouse: created.warehouseName,
          referenceDoc: created.folio,
          reason: `Salida inicial por devolución a proveedor (${created.supplierCompany})`,
          user: activeSessionProfile.name,
        })
      })
      created = { ...created, inventoryApplied: true }
    }
    setSupplierReturns((prev) => {
      const next = [created, ...prev]
      saveStoredSupplierReturns(next)
      return next
    })
    appendAuditLog({
      category: 'inventory',
      crudOperation: 'CREATE',
      entityType: 'Devolución a proveedor',
      entityId: created.id,
      action: 'Registro de devolución a proveedor (RTV)',
      detail: `${created.folio} · ${created.supplierCompany} · ${created.purchaseOrderFolio} · Estado inicial: ${created.status} · ${money(created.total)}`,
      user: activeSessionProfile.name,
      userId: activeActorUserId,
    })
    toast.success(`Devolución ${created.folio} creada para ${created.supplierCompany}.`, 'RTV registrado')
  }

  const applySupplierReturnTransition = (
    target: SupplierReturn,
    nextStatus: SupplierReturnStatus,
    options?: { noteOverride?: string; rmaOverride?: string; approvedBy?: string }
  ) => {
    let appliedInv = Boolean(target.inventoryApplied)
    let appliedFin = Boolean(target.financeApplied)
    let creditNoteFolio = target.creditNoteFolio

    if (nextStatus === 'Enviada a proveedor' && !appliedInv) {
      setInventory((prev) =>
        prev.map((inv) => {
          if (inv.warehouseId !== target.warehouseId) return inv
          const matched = target.items.find(
            (l) => l.sku.trim().toLowerCase() === inv.sku.trim().toLowerCase()
          )
          return matched ? { ...inv, stock: Math.max(0, inv.stock - matched.quantity) } : inv
        })
      )
      target.items.forEach((line, idx) => {
        handleAddMovement({
          id: `mov_prv_ret_${Date.now()}_${idx}`,
          folio: `MOV-RTV-${String(movements.length + idx + 1).padStart(3, '0')}`,
          date: formatShortReturnDate(),
          type: 'Salida',
          sku: line.sku,
          productName: line.name,
          quantity: line.quantity,
          sourceWarehouse: target.warehouseName,
          referenceDoc: target.folio,
          reason: `Salida por devolución a proveedor (${target.supplierCompany})`,
          user: activeSessionProfile.name,
        })
      })
      appliedInv = true
    }

    if (nextStatus === 'Acreditada / compensada' && !appliedFin) {
      creditNoteFolio =
        creditNoteFolio || `NC-PRV-2026-${String(supplierReturns.length + 201).padStart(3, '0')}`
      if (target.billId || target.billFolio) {
        setPayables((prev) =>
          prev.map((bill) => {
            const matches =
              (target.billId && bill.id === target.billId) ||
              (target.billFolio && bill.folio === target.billFolio)
            if (!matches) return bill
            const nextBalance = Math.max(0, bill.balance - target.total)
            const nextBillStatus =
              nextBalance === 0
                ? ('Pagada' as const)
                : bill.paidAmount > 0 || nextBalance < bill.total
                ? ('Parcial' as const)
                : bill.status
            return {
              ...bill,
              balance: nextBalance,
              status: nextBillStatus,
            }
          })
        )
      }
      appliedFin = true
    }

    const nowIso = new Date().toISOString()
    const mergedNotes = options?.noteOverride
      ? target.notes
        ? `${target.notes} · ${options.noteOverride}`
        : options.noteOverride
      : target.notes

    setSupplierReturns((prev) => {
      const next = prev.map((r) =>
        r.id === target.id
          ? {
              ...r,
              status: nextStatus,
              notes: mergedNotes,
              rmaSupplierCode: options?.rmaOverride || r.rmaSupplierCode,
              inventoryApplied: appliedInv,
              financeApplied: appliedFin,
              creditNoteFolio,
              approvalStatus: options?.approvedBy ? ('approved' as const) : ('not_required' as const),
              pendingTargetStatus: undefined,
              approvedBy: options?.approvedBy || r.approvedBy,
              approvedAtIso: options?.approvedBy ? nowIso : r.approvedAtIso,
              updatedAtIso: nowIso,
              workflowHistory: [
                {
                  id: `whist_p_${Date.now()}`,
                  timestampIso: nowIso,
                  fromStatus: target.status,
                  toStatus: nextStatus,
                  actor: options?.approvedBy || activeSessionProfile.name,
                  action: options?.approvedBy ? ('approved' as const) : ('transition' as const),
                  note: options?.noteOverride,
                },
                ...(r.workflowHistory || []),
              ],
            }
          : r
      )
      saveStoredSupplierReturns(next)
      return next
    })

    appendAuditLog({
      category: nextStatus === 'Acreditada / compensada' ? 'finance' : 'inventory',
      crudOperation: 'UPDATE',
      entityType: 'Devolución a proveedor',
      entityId: target.id,
      action: options?.approvedBy
        ? `Aprobación y transición de RTV proveedor a "${nextStatus}"`
        : `Actualización de RTV proveedor a "${nextStatus}"`,
      detail: `${target.folio} · ${target.supplierCompany}${creditNoteFolio ? ` · ${creditNoteFolio}` : ''}`,
      user: activeSessionProfile.name,
      userId: activeActorUserId,
    })

    if (nextStatus === 'Enviada a proveedor') {
      toast.success(
        `Mercancía de ${target.folio} despachada desde ${target.warehouseName}. Salida registrada en Kardex.`,
        'Salida despachada'
      )
    } else if (nextStatus === 'Acreditada / compensada') {
      toast.success(
        `Nota de crédito ${creditNoteFolio} compensada en CxP (${target.supplierCompany}).`,
        'Crédito CxP aplicado'
      )
    } else {
      toast.info(`Devolución ${target.folio} actualizada a "${nextStatus}".`, 'Estado RTV')
    }
  }

  const handleRequestSupplierReturnApproval = (
    returnId: string,
    targetStatus: SupplierReturnStatus,
    noteOverride?: string,
    rmaOverride?: string
  ) => {
    const target = supplierReturns.find((r) => r.id === returnId)
    if (!target) return
    if (isReturnEditBlocked(returnWorkflows.supplier, target.status)) {
      toast.warning(
        `El expediente ${target.folio} está en el estado final "${target.status}" y tiene la edición bloqueada.`,
        'Estado final bloqueado'
      )
      return
    }
    const allowed = getAllowedNextStatusesForReturn(returnWorkflows.supplier, target.status)
    if (!allowed.includes(targetStatus)) {
      toast.warning(
        `El flujo configurado no permite pasar de "${target.status}" a "${targetStatus}".`,
        'Transición restringida'
      )
      return
    }
    const targetRule = returnWorkflows.supplier.steps.find((s) => s.status === targetStatus)
    const nowIso = new Date().toISOString()
    const mergedNotes = noteOverride
      ? target.notes
        ? `${target.notes} · ${noteOverride}`
        : noteOverride
      : target.notes

    setSupplierReturns((prev) => {
      const next = prev.map((r) =>
        r.id === returnId
          ? {
              ...r,
              notes: mergedNotes,
              rmaSupplierCode: rmaOverride || r.rmaSupplierCode,
              approvalStatus: 'pending' as const,
              pendingTargetStatus: targetStatus,
              approvalRequestedBy: activeSessionProfile.name,
              approvalRequestedAtIso: nowIso,
              updatedAtIso: nowIso,
              workflowHistory: [
                {
                  id: `whist_preq_${Date.now()}`,
                  timestampIso: nowIso,
                  fromStatus: target.status,
                  toStatus: targetStatus,
                  actor: activeSessionProfile.name,
                  action: 'approval_requested' as const,
                  note: noteOverride || `Requiere: ${targetRule?.approverRole || 'Administrador'}`,
                },
                ...(r.workflowHistory || []),
              ],
            }
          : r
      )
      saveStoredSupplierReturns(next)
      return next
    })

    appendAuditLog({
      category: 'inventory',
      crudOperation: 'UPDATE',
      entityType: 'Devolución a proveedor',
      entityId: target.id,
      action: `Solicitud de aprobación RTV → "${targetStatus}"`,
      detail: `${target.folio} · ${target.supplierCompany} · Requiere rol: ${targetRule?.approverRole || 'Administrador'}`,
      user: activeSessionProfile.name,
      userId: activeActorUserId,
    })

    toast.info(
      `Aprobación solicitada para ${target.folio} (${targetRule?.approverRole || 'Administrador'}).`,
      'En cola de aprobación'
    )
  }

  const handleApproveSupplierReturnTransition = (returnId: string) => {
    const target = supplierReturns.find((r) => r.id === returnId)
    if (!target || target.approvalStatus !== 'pending' || !target.pendingTargetStatus) return
    if (isReturnEditBlocked(returnWorkflows.supplier, target.status)) {
      toast.warning(
        `El expediente ${target.folio} está en el estado final "${target.status}" y tiene la edición bloqueada.`,
        'Estado final bloqueado'
      )
      return
    }
    const targetRule = returnWorkflows.supplier.steps.find(
      (s) => s.status === target.pendingTargetStatus
    )
    const canApprove = canUserApproveWorkflowStep(
      targetRule?.approverRole || 'Administrador',
      activeSessionProfile.roles,
      isFullAdmin,
      true
    )
    if (!canApprove) {
      toast.warning(
        `Esta transición requiere aprobación del rol "${targetRule?.approverRole || 'Administrador'}".`,
        'Aprobación denegada'
      )
      return
    }
    applySupplierReturnTransition(target, target.pendingTargetStatus, {
      approvedBy: activeSessionProfile.name,
    })
  }

  const handleRejectSupplierReturnApproval = (returnId: string, reason?: string) => {
    const target = supplierReturns.find((r) => r.id === returnId)
    if (!target || target.approvalStatus !== 'pending') return
    const nowIso = new Date().toISOString()
    const rejectedTarget = target.pendingTargetStatus || target.status
    setSupplierReturns((prev) => {
      const next = prev.map((r) =>
        r.id === returnId
          ? {
              ...r,
              approvalStatus: 'rejected' as const,
              pendingTargetStatus: undefined,
              rejectionReason: reason,
              updatedAtIso: nowIso,
              workflowHistory: [
                {
                  id: `whist_prej_${Date.now()}`,
                  timestampIso: nowIso,
                  fromStatus: target.status,
                  toStatus: rejectedTarget,
                  actor: activeSessionProfile.name,
                  action: 'approval_rejected' as const,
                  note: reason || 'Solicitud rechazada por aprobador',
                },
                ...(r.workflowHistory || []),
              ],
            }
          : r
      )
      saveStoredSupplierReturns(next)
      return next
    })
    appendAuditLog({
      category: 'inventory',
      crudOperation: 'UPDATE',
      entityType: 'Devolución a proveedor',
      entityId: target.id,
      action: `Rechazo de aprobación RTV → "${rejectedTarget}"`,
      detail: `${target.folio} · ${target.supplierCompany}${reason ? ` · ${reason}` : ''}`,
      user: activeSessionProfile.name,
      userId: activeActorUserId,
    })
    toast.warning(`Solicitud de transición para ${target.folio} rechazada.`, 'Aprobación rechazada')
  }

  const handleUpdateSupplierReturnDetails = (
    returnId: string,
    payload: { notes?: string; rmaSupplierCode?: string }
  ) => {
    const target = supplierReturns.find((r) => r.id === returnId)
    if (!target) return
    if (isReturnEditBlocked(returnWorkflows.supplier, target.status)) {
      toast.warning(
        `El expediente ${target.folio} está en el estado final "${target.status}" y tiene la edición bloqueada.`,
        'Edición bloqueada'
      )
      return
    }
    const nowIso = new Date().toISOString()
    const mergedNotes = payload.notes
      ? target.notes
        ? `${target.notes} · ${payload.notes}`
        : payload.notes
      : target.notes
    const nextRma = payload.rmaSupplierCode ?? target.rmaSupplierCode
    setSupplierReturns((prev) => {
      const next = prev.map((r) =>
        r.id === returnId
          ? { ...r, notes: mergedNotes, rmaSupplierCode: nextRma, updatedAtIso: nowIso }
          : r
      )
      saveStoredSupplierReturns(next)
      return next
    })
    appendAuditLog({
      category: 'inventory',
      crudOperation: 'UPDATE',
      entityType: 'Devolución a proveedor',
      entityId: target.id,
      action: 'Actualización de datos en RTV proveedor',
      detail: `${target.folio}${nextRma ? ` · RMA ${nextRma}` : ''}${payload.notes ? ` · ${payload.notes}` : ''}`,
      user: activeSessionProfile.name,
      userId: activeActorUserId,
    })
    toast.success(`Expediente ${target.folio} actualizado.`, 'RTV actualizado')
  }

  const handleAdvanceSupplierReturn = (
    returnId: string,
    nextStatus: SupplierReturnStatus,
    noteOverride?: string,
    rmaOverride?: string
  ) => {
    const target = supplierReturns.find((r) => r.id === returnId)
    if (!target) return
    if (isReturnEditBlocked(returnWorkflows.supplier, target.status)) {
      toast.warning(
        `El expediente ${target.folio} está en el estado final "${target.status}" y tiene la edición bloqueada.`,
        'Estado final bloqueado'
      )
      return
    }
    const allowed = getAllowedNextStatusesForReturn(returnWorkflows.supplier, target.status)
    if (!allowed.includes(nextStatus)) {
      toast.warning(
        `Transición de "${target.status}" a "${nextStatus}" deshabilitada en el flujo.`,
        'Flujo de devoluciones'
      )
      return
    }
    if (doesTransitionRequireApproval(returnWorkflows.supplier, nextStatus, target.total)) {
      handleRequestSupplierReturnApproval(returnId, nextStatus, noteOverride, rmaOverride)
      return
    }
    applySupplierReturnTransition(target, nextStatus, { noteOverride, rmaOverride })
  }

  const handleDeleteSupplierReturn = (returnId: string) => {
    const target = supplierReturns.find((r) => r.id === returnId)
    if (
      target &&
      isReturnDeleteBlocked(returnWorkflows.supplier, target.status, {
        inventoryApplied: target.inventoryApplied,
        financeApplied: target.financeApplied,
      })
    ) {
      toast.warning(
        'No se puede eliminar un expediente en estado final o con impacto aplicado en Kardex/CxP.',
        'Bloqueado por flujo'
      )
      return
    }
    setSupplierReturns((prev) => {
      const next = prev.filter((r) => r.id !== returnId)
      saveStoredSupplierReturns(next)
      return next
    })
    if (target) {
      appendAuditLog({
        category: 'inventory',
        crudOperation: 'DELETE',
        entityType: 'Devolución a proveedor',
        entityId: target.id,
        action: 'Eliminación de devolución a proveedor',
        detail: `${target.folio} · ${target.supplierCompany}`,
        user: activeSessionProfile.name,
        userId: activeActorUserId,
      })
      toast.info(`Devolución ${target.folio} eliminada.`, 'RTV eliminado')
    }
  }

  const handleCreateRequisition = (req: PurchaseRequisition) => {
    setRequisitions((prev) => [req, ...prev])
    toast.success(`Requisición ${req.folio} creada por ${money(req.estimatedTotal)}.`, 'Requisición registrada')
    appendAuditLog({
      category: 'inventory',
      action: 'Alta de requisición de compra',
      detail: `${req.folio} · ${req.department} · ${req.warehouseName} · ${money(req.estimatedTotal)}`,
      user: activeSessionProfile.name,
    })
  }

  const handleUpdateRequisitionStatus = (reqId: string, status: 'Aprobada' | 'Rechazada') => {
    const today = new Date()
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    const dateStr = `${String(today.getDate()).padStart(2, '0')} ${months[today.getMonth()]} ${today.getFullYear()}`
    let targetFolio = ''
    setRequisitions((prev) =>
      prev.map((r) => {
        if (r.id !== reqId) return r
        targetFolio = r.folio
        return {
          ...r,
          status,
          approvedBy: status === 'Aprobada' ? activeSessionProfile.name : r.approvedBy,
          approvedAt: status === 'Aprobada' ? dateStr : r.approvedAt,
        }
      })
    )
    toast[status === 'Aprobada' ? 'success' : 'info'](
      `Requisición ${targetFolio || reqId} marcada como ${status.toLowerCase()}.`,
      status === 'Aprobada' ? 'Requisición aprobada' : 'Requisición rechazada'
    )
    appendAuditLog({
      category: 'inventory',
      action: `Requisición de compra ${status.toLowerCase()}`,
      detail: `Folio ${targetFolio || reqId} revisada por ${activeSessionProfile.name}`,
      user: activeSessionProfile.name,
    })
  }

  const handleConvertRequisitionToPo = (
    req: PurchaseRequisition,
    supplierCompany: string,
    expectedDate: string
  ) => {
    const sup = supplierRecords.find((s) => s.company === supplierCompany)
    const maxNum = purchaseOrders.reduce((max, po) => {
      const n = parseInt(po.folio.split('-').pop() || '0', 10)
      return Number.isNaN(n) ? max : Math.max(max, n)
    }, purchaseOrders.length)
    const folio = `OC-2026-${String(maxNum + 1).padStart(3, '0')}`
    const today = new Date()
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    const dateStr = `${String(today.getDate()).padStart(2, '0')} ${months[today.getMonth()]} ${today.getFullYear()}`

    const poItems = req.items.map((it, idx) => {
      const sub = it.quantity * it.estimatedUnitCost
      const tax = Math.round(sub * 0.16)
      return {
        id: `poi_${Date.now()}_${idx}`,
        sku: it.sku,
        name: it.name,
        quantity: it.quantity,
        receivedQty: 0,
        unitCost: it.estimatedUnitCost,
        taxRate: '16%' as const,
        subtotal: sub,
        taxAmount: tax,
        total: sub + tax,
      }
    })

    const subtotal = poItems.reduce((s, it) => s + it.subtotal, 0)
    const taxTotal = poItems.reduce((s, it) => s + it.taxAmount, 0)
    const total = subtotal + taxTotal

    const newPO: PurchaseOrder = {
      id: `po_${Date.now()}`,
      folio,
      supplierCompany,
      supplierContact: sup?.email || 'ventas@proveedor.mx',
      supplierEmail: sup?.email || 'ventas@proveedor.mx',
      date: dateStr,
      expectedDeliveryDate: expectedDate.trim() || req.neededByDate,
      warehouseId: req.warehouseId,
      warehouseName: req.warehouseName,
      status: 'Emitida',
      notes: `Generada desde requisición ${req.folio}. ${req.notes || ''}`.trim(),
      items: poItems,
      subtotal,
      taxTotal,
      total,
      currency: 'MXN',
    }

    setPurchaseOrders((prev) => [newPO, ...prev])
    setRequisitions((prev) =>
      prev.map((r) =>
        r.id === req.id ? { ...r, status: 'Convertida a OC', linkedPoFolio: folio } : r
      )
    )
    setPurchasesSection('Órdenes de compra')
    toast.success(
      `Requisición ${req.folio} convertida en orden de compra ${folio} para ${supplierCompany}.`,
      'Orden de compra emitida'
    )
    appendAuditLog({
      category: 'inventory',
      action: 'Conversión de requisición a Orden de Compra',
      detail: `${req.folio} → ${folio} · ${supplierCompany} · ${money(total)}`,
      user: activeSessionProfile.name,
    })
  }

  const handleCreateSupplierBill = (bill: BillPayable) => {
    setPayables((prev) => [bill, ...prev])
    setChartAccounts((prev) =>
      prev.map((acc) => {
        if (acc.code === '2001-001') return { ...acc, balance: acc.balance + bill.total }
        if (acc.code === '1150-001') return { ...acc, balance: acc.balance + bill.subtotal }
        return acc
      })
    )
    appendAuditLog({
      category: 'finance',
      action: 'Factura de proveedor registrada (CxP)',
      detail: `${bill.folio} · ${bill.supplierCompany}${bill.purchaseOrderFolio ? ` · ${bill.purchaseOrderFolio}` : ''} · ${money(bill.total)}`,
      user: activeSessionProfile.name,
    })
  }

  const handleRegisterSupplierBillFromPO = (po: PurchaseOrder) => {
    const existing = payables.find((b) => b.purchaseOrderFolio === po.folio)
    if (existing) {
      toast.info(
        `La orden ${po.folio} ya está vinculada a la factura ${existing.folio}.`,
        'Factura ya registrada'
      )
      return
    }
    const maxNum = payables.reduce((max, b) => {
      const n = parseInt(b.folio.split('-').pop() || '0', 10)
      return Number.isNaN(n) ? max : Math.max(max, n)
    }, payables.length)
    const folio = `CXP-2026-${String(maxNum + 1).padStart(3, '0')}`
    const today = new Date()
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    const fmt = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`
    const due = new Date()
    due.setDate(today.getDate() + 15)

    const newBill: BillPayable = {
      id: `cxp_${Date.now()}`,
      folio,
      purchaseOrderFolio: po.folio,
      supplierCompany: po.supplierCompany,
      supplierContact: po.supplierEmail,
      issueDate: fmt(today),
      dueDate: fmt(due),
      subtotal: po.subtotal,
      tax: po.taxTotal,
      total: po.total,
      paidAmount: 0,
      balance: po.total,
      status: 'Pendiente',
      currency: po.currency,
      paymentMethod: 'Transferencia SPEI',
    }
    handleCreateSupplierBill(newBill)
    toast.success(
      `Factura ${folio} generada desde ${po.folio} por ${money(po.total)} en Cuentas por pagar.`,
      'Factura CxP generada'
    )
  }

  const purchasesTopKpis = useMemo(() => {
    const now = new Date()
    const monthLabel = new Intl.DateTimeFormat('es-MX', {
      month: 'short',
      year: 'numeric',
    })
      .format(now)
      .replace('.', '')
    const monthlyOrders = purchaseOrders.filter(
      (po) => po.status !== 'Cancelada' && isDateInCurrentMonth(po.date, now)
    )
    const monthlyOrdersTotal = monthlyOrders.reduce((sum, po) => sum + po.total, 0)
    const receivedInvoicesTotal = payables.reduce((sum, bill) => sum + bill.total, 0)
    const receivedInvoicesPending = payables.reduce((sum, bill) => sum + bill.balance, 0)
    const pendingDeliveryOrders = purchaseOrders.filter(
      (po) => po.status === 'Emitida' || po.status === 'Recepción parcial'
    )
    const pendingDeliveryUnits = pendingDeliveryOrders.reduce(
      (sum, po) =>
        sum +
        po.items.reduce(
          (itemSum, item) => itemSum + Math.max(0, item.quantity - item.receivedQty),
          0
        ),
      0
    )

    return {
      monthLabel,
      monthlyOrdersCount: monthlyOrders.length,
      monthlyOrdersTotal,
      receivedInvoicesCount: payables.length,
      receivedInvoicesTotal,
      receivedInvoicesPending,
      pendingDeliveryCount: pendingDeliveryOrders.length,
      pendingDeliveryUnits,
    }
  }, [purchaseOrders, payables])
  const [clientQuery, setClientQuery] = useState('')
  const [clientStatus, setClientStatus] = useState('Todos')
  const [clientRecords, setClientRecords] = useState<DirectoryRecord[]>(clients)
  const [supplierRecords, setSupplierRecords] = useState(suppliers)
  const [opportunityRecords, setOpportunityRecords] = useState(opportunities)
  const [activityRecords, setActivityRecords] = useState(activities)
  const [createKind, setCreateKind] = useState<CreateKind | null>(null)
  const [createForm, setCreateForm] = useState({
    supplierCode: '',
    name: '',
    company: '',
    email: '',
    phone: '',
    title: '',
    time: '10:00',
    value: '',
    country: 'MX',
    addressStreet: '',
    addressColony: '',
    addressCity: '',
    addressState: '',
    addressZip: '',
    addressCountry: 'MX',
    addressIsShipping: true,
    addressIsBilling: true,
    addressesList: [] as ClientAddress[],
    rfc: '',
    bankName: 'BBVA México',
    clabe: '',
    accountNumber: '',
    defaultReference: '',
    bankPackValues: {} as Record<string, Record<string, string>>,
  })
  const [clientForm, setClientForm] = useState({
    clientCode: '',
    name: '',
    company: '',
    email: '',
    phone: '',
    rfc: '',
    entityType: 'company' as 'company' | 'individual',
    status: 'Activo' as 'Activo' | 'Prospecto' | 'Inactivo',
    currency: 'MXN' as 'MXN' | 'USD',
    paymentTerms: 'Contado',
    city: '',
    state: '',
    country: 'MX',
    notes: '',
    addressStreet: '',
    addressColony: '',
    addressCity: '',
    addressState: '',
    addressZip: '',
    addressCountry: 'MX',
    addressIsShipping: true,
    addressIsBilling: true,
    addressesList: [] as ClientAddress[],
  })
  const [isSubmittingClient, setIsSubmittingClient] = useState(false)
  const [activeSetting, setActiveSetting] = useState('General')
  const [workspaceMeta, setWorkspaceMeta] = useState<{ workspaceName: string; avatarColor: string }>(() => {
    try {
      const saved = window.localStorage.getItem('aes_nexus_settings_general')
      if (saved) {
        const parsed = JSON.parse(saved)
        return {
          workspaceName: parsed.workspaceName || 'Brújula Estudio',
          avatarColor: parsed.avatarColor || '#456a61',
        }
      }
    } catch {
      // fallback
    }
    return { workspaceName: 'Brújula Estudio', avatarColor: '#456a61' }
  })
  const [orgLogoUrl, setOrgLogoUrl] = useState<string>(() => {
    try {
      const saved = window.localStorage.getItem('aes_nexus_settings_org')
      if (saved) {
        const parsed = JSON.parse(saved)
        return typeof parsed.logoDataUrl === 'string' ? parsed.logoDataUrl : ''
      }
    } catch {
      // fallback
    }
    return ''
  })

  const [orgLogoError, setOrgLogoError] = useState(false)

  useEffect(() => {
    const syncOrgLogo = (e?: Event) => {
      try {
        const customDetail = (e as CustomEvent<{ logoDataUrl?: string }> | undefined)?.detail
        if (customDetail && typeof customDetail.logoDataUrl === 'string') {
          setOrgLogoError(false)
          setOrgLogoUrl(customDetail.logoDataUrl)
          return
        }
        const saved = window.localStorage.getItem('aes_nexus_settings_org')
        if (saved) {
          const parsed = JSON.parse(saved)
          setOrgLogoError(false)
          setOrgLogoUrl(typeof parsed.logoDataUrl === 'string' ? parsed.logoDataUrl : '')
        } else {
          setOrgLogoError(false)
          setOrgLogoUrl('')
        }
      } catch {
        setOrgLogoError(false)
        setOrgLogoUrl('')
      }
    }
    window.addEventListener('aes_nexus_org_changed', syncOrgLogo)
    window.addEventListener('storage', syncOrgLogo)
    return () => {
      window.removeEventListener('aes_nexus_org_changed', syncOrgLogo)
      window.removeEventListener('storage', syncOrgLogo)
    }
  }, [])
  const [accentTheme, setAccentTheme] = useState<AccentTheme>(() => {
    const savedTheme = window.localStorage.getItem('aes-nexus-accent')
    return accentOptions.some((option) => option.id === savedTheme) ? savedTheme as AccentTheme : 'green'
  })
  const [darkMode, setDarkMode] = useState(() => window.localStorage.getItem('aes-nexus-dark-mode') === 'true')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    document.body.classList.toggle('dark', darkMode)
  }, [darkMode])

  const notifyAccessDenied = (targetLabel: string) => {
    toast.warning(
      `Acceso restringido: tu rol actual no tiene permiso para entrar a "${targetLabel}".`,
      'Acceso restringido'
    )
  }

  const navigateTo = (page: string) => {
    if (
      page !== 'Inicio' &&
      !canAccessModule(
        page,
        activeCapabilities,
        isFullAdmin,
        activeSessionProfile.isActive,
        activeSectionAccess
      )
    ) {
      notifyAccessDenied(page)
      return
    }
    setActivePage(page)
    if (page === 'Ventas') {
      const first = getFirstAccessibleSection(
        'Ventas',
        activeCapabilities,
        isFullAdmin,
        activeSessionProfile.isActive,
        activeSectionAccess
      )
      setSalesSection((first as typeof salesSection) || 'Catálogo')
    }
    if (page === 'CRM') {
      const first = getFirstAccessibleSection(
        'CRM',
        activeCapabilities,
        isFullAdmin,
        activeSessionProfile.isActive,
        activeSectionAccess
      )
      setCrmSection(first || 'Resumen')
    }
    if (page === 'Compras') {
      const first = getFirstAccessibleSection(
        'Compras',
        activeCapabilities,
        isFullAdmin,
        activeSessionProfile.isActive,
        activeSectionAccess
      )
      setPurchasesSection((first as PurchasesSectionTab) || 'Resumen')
    }
    if (page === 'Operaciones') {
      const first = getFirstAccessibleSection(
        'Operaciones',
        activeCapabilities,
        isFullAdmin,
        activeSessionProfile.isActive,
        activeSectionAccess
      )
      setOperationsSection((first as typeof operationsSection) || 'Inventario')
    }
    if (page === 'Finanzas') {
      const first = getFirstAccessibleSection(
        'Finanzas',
        activeCapabilities,
        isFullAdmin,
        activeSessionProfile.isActive,
        activeSectionAccess
      )
      setFinanceSection((first as typeof financeSection) || 'Cobros')
    }
    if (page === 'Gastos') {
      const first = getFirstAccessibleSection(
        'Gastos',
        activeCapabilities,
        isFullAdmin,
        activeSessionProfile.isActive,
        activeSectionAccess
      )
      setExpensesSection((first as ExpensesSectionTab) || 'Resumen y control')
    }
    if (page === 'Reportes') {
      const first = getFirstAccessibleSection(
        'Reportes',
        activeCapabilities,
        isFullAdmin,
        activeSessionProfile.isActive,
        activeSectionAccess
      )
      setReportsSection((first as ReportsSectionTab) || 'Resumen ejecutivo')
    }
    if (page === 'Administración') {
      const first = getFirstAccessibleSection(
        'Administración',
        activeCapabilities,
        isFullAdmin,
        activeSessionProfile.isActive,
        activeSectionAccess
      )
      setAdminSection((first as typeof adminSection) || 'Departamentos')
    }
    if (page === 'Configuración') {
      const first = getFirstAccessibleSection(
        'Configuración',
        activeCapabilities,
        isFullAdmin,
        activeSessionProfile.isActive,
        activeSectionAccess
      )
      if (first) setActiveSetting(first)
    }
    const route = pageRoutes[page] ?? '/'
    if (window.location.pathname !== route) window.history.pushState({}, '', route)
  }

  const navigateToReportsSection = (section: ReportsSectionTab) => {
    if (
      !canAccessSection(
        'Reportes',
        section,
        activeCapabilities,
        isFullAdmin,
        activeSessionProfile.isActive,
        activeSectionAccess
      )
    ) {
      notifyAccessDenied(`Reportes · ${section}`)
      return
    }
    setActivePage('Reportes')
    setReportsSection(section)
    const route =
      section === 'Estado de Resultados'
        ? '/reports/income-statement'
        : section === 'Finanzas y Tesorería'
        ? '/reports/financial'
        : section === 'CxP y Pagos EBP'
        ? '/reports/payables-ebp'
        : section === 'Ventas y CxC'
        ? '/reports/sales'
        : section === 'Compras e Inventario'
        ? '/reports/inventory'
        : section === 'Nómina y RRHH'
        ? '/reports/payroll'
        : '/reports'
    if (window.location.pathname !== route) window.history.pushState({}, '', route)
  }

  const navigateToSettingSection = (setting: string) => {
    if (
      !canAccessSection(
        'Configuración',
        setting,
        activeCapabilities,
        isFullAdmin,
        activeSessionProfile.isActive,
        activeSectionAccess
      )
    ) {
      notifyAccessDenied(`Settings · ${setting}`)
      return
    }
    setActivePage('Configuración')
    setActiveSetting(setting)
    setNotice('')
    const route = pageRoutes['Configuración'] ?? '/settings'
    if (window.location.pathname !== route) window.history.pushState({}, '', route)
  }

  const navigateToAdminSection = (section: AdminSectionTab) => {
    if (
      !canAccessSection(
        'Administración',
        section,
        activeCapabilities,
        isFullAdmin,
        activeSessionProfile.isActive,
        activeSectionAccess
      )
    ) {
      notifyAccessDenied(`Administración · ${section}`)
      return
    }
    setActivePage('Administración')
    setAdminSection(section)
    setSelectedSubsidiaryId(null)
    const route =
      section === 'Subsidiarias'
        ? '/admin/subsidiaries'
        : section === 'Ubicaciones'
        ? '/admin/locations'
        : section === 'Flujos de devoluciones'
        ? '/admin/return-workflows'
        : section === 'Resumen'
        ? '/admin/summary'
        : section === 'Historial de Auditoría'
        ? '/admin/audit'
        : '/admin'
    if (window.location.pathname !== route) window.history.pushState({}, '', route)
  }

  const navigateToSubsidiaryDetail = (subsidiaryId: string | null) => {
    if (
      !canAccessSection(
        'Administración',
        'Subsidiarias',
        activeCapabilities,
        isFullAdmin,
        activeSessionProfile.isActive,
        activeSectionAccess
      )
    ) {
      notifyAccessDenied('Administración · Subsidiarias')
      return
    }
    setActivePage('Administración')
    setAdminSection('Subsidiarias')
    setSelectedSubsidiaryId(subsidiaryId)
    const route = subsidiaryId
      ? `/admin/subsidiaries/${subsidiaryId === '__new__' ? 'nueva' : encodeURIComponent(subsidiaryId)}`
      : '/admin/subsidiaries'
    if (window.location.pathname !== route) window.history.pushState({}, '', route)
  }

  const navigateToFinanceSection = (section: 'Cobros' | 'Pagos' | 'Pagos Bancarios' | 'Cuentas contables' | 'Resumen') => {
    if (
      !canAccessSection(
        'Finanzas',
        section,
        activeCapabilities,
        isFullAdmin,
        activeSessionProfile.isActive,
        activeSectionAccess
      )
    ) {
      notifyAccessDenied(`Finanzas · ${section}`)
      return
    }
    setActivePage('Finanzas')
    setFinanceSection(section)
    const route =
      section === 'Cuentas contables'
        ? '/finance/accounting'
        : section === 'Pagos Bancarios'
        ? '/finance/ebp'
        : section === 'Pagos'
        ? '/finance/payables'
        : section === 'Resumen'
        ? '/finance/summary'
        : '/finance'
    if (window.location.pathname !== route) window.history.pushState({}, '', route)
  }

  const navigateToExpensesSection = (section: ExpensesSectionTab = 'Resumen y control') => {
    if (
      !canAccessSection(
        'Gastos',
        section,
        activeCapabilities,
        isFullAdmin,
        activeSessionProfile.isActive,
        activeSectionAccess
      )
    ) {
      notifyAccessDenied(`Gastos · ${section}`)
      return
    }
    setActivePage('Gastos')
    setExpensesSection(section)
    const route =
      section === 'Registro y pólizas'
        ? '/expenses/ledger'
        : section === 'Presupuestos y alertas'
          ? '/expenses/budgets'
          : section === 'Gastos recurrentes'
            ? '/expenses/recurring'
            : '/expenses'
    if (window.location.pathname !== route) window.history.pushState({}, '', route)
  }

  const navigateToOperationsSection = (section: 'Inventario' | 'Traslados' | 'Compras' | 'Entregas' | 'Resumen') => {
    if (
      !canAccessSection(
        'Operaciones',
        section,
        activeCapabilities,
        isFullAdmin,
        activeSessionProfile.isActive,
        activeSectionAccess
      )
    ) {
      notifyAccessDenied(`Operaciones · ${section}`)
      return
    }
    setActivePage('Operaciones')
    setOperationsSection(section)
    const route =
      section === 'Traslados'
        ? '/operations/transfers'
        : section === 'Compras'
        ? '/operations/purchases'
        : section === 'Entregas'
        ? '/operations/deliveries'
        : section === 'Resumen'
        ? '/operations/summary'
        : '/operations'
    if (window.location.pathname !== route) window.history.pushState({}, '', route)
  }

  const navigateToPurchasesSection = (section: PurchasesSectionTab) => {
    if (
      !canAccessSection(
        'Compras',
        section,
        activeCapabilities,
        isFullAdmin,
        activeSessionProfile.isActive,
        activeSectionAccess
      )
    ) {
      notifyAccessDenied(`Compras · ${section}`)
      return
    }
    setActivePage('Compras')
    setPurchasesSection(section)
    const route =
      section === 'Requisiciones'
        ? '/purchases/requisitions'
        : section === 'Órdenes de compra'
        ? '/purchases/orders'
        : section === 'Recepciones'
        ? '/purchases/receptions'
        : section === 'Facturas'
        ? '/purchases/vendorbill'
        : section === 'Devoluciones'
        ? '/purchases/returns'
        : '/purchases'
    if (window.location.pathname !== route) window.history.pushState({}, '', route)
  }

  const navigateToSalesSection = (section: SalesSectionTab) => {
    if (
      !canAccessSection(
        'Ventas',
        section,
        activeCapabilities,
        isFullAdmin,
        activeSessionProfile.isActive,
        activeSectionAccess
      )
    ) {
      notifyAccessDenied(`Ventas · ${section}`)
      return
    }
    setActivePage('Ventas')
    setSalesSection(section)
    const route =
      section === 'Cotizaciones'
        ? '/sales/quotes'
        : section === 'Pedidos'
        ? '/sales/orders'
        : section === 'Facturas'
        ? '/sales/invoices'
        : section === 'Devoluciones'
        ? '/sales/returns'
        : section === 'Resumen'
        ? '/sales/summary'
        : '/sales'
    if (window.location.pathname !== route) window.history.pushState({}, '', route)
  }

  const navigateToCrmSection = (section: string) => {
    if (
      !canAccessSection(
        'CRM',
        section,
        activeCapabilities,
        isFullAdmin,
        activeSessionProfile.isActive,
        activeSectionAccess
      )
    ) {
      notifyAccessDenied(`CRM · ${section}`)
      return
    }
    setActivePage('CRM')
    setCrmSection(section)
    const route =
      section === 'Clientes'
        ? '/crm/customers'
        : section === 'Proveedores'
        ? '/crm/vendors'
        : section === 'Empleados'
        ? '/crm/employees'
        : section === 'Nómina'
        ? '/crm/payroll'
        : section === 'Oportunidades'
        ? '/crm/opportunities'
        : section === 'Actividades'
        ? '/crm/activities'
        : '/crm'
    if (window.location.pathname !== route) window.history.pushState({}, '', route)
  }

  const openCreate = (kind: CreateKind) => {
    const targetSection =
      kind === 'client'
        ? 'Clientes'
        : kind === 'supplier'
        ? 'Proveedores'
        : kind === 'opportunity'
        ? 'Oportunidades'
        : 'Actividades'
    if (
      !canCreateInSection(
        'CRM',
        targetSection,
        activeSectionAccess,
        isFullAdmin,
        activeSessionProfile.isActive
      )
    ) {
      toast.warning(
        `Tu rol actual solo tiene nivel de consulta en CRM · ${targetSection} y no permite crear registros.`,
        'Permiso insuficiente'
      )
      return
    }
    setCreateKind(kind)
    setCreateForm({
      supplierCode: '',
      name: '',
      company: '',
      email: '',
      phone: '',
      title: '',
      time: '10:00',
      value: '',
      country: 'MX',
      addressStreet: '',
      addressColony: '',
      addressCity: '',
      addressState: '',
      addressZip: '',
      addressCountry: 'MX',
      addressIsShipping: true,
      addressIsBilling: true,
      addressesList: [],
      rfc: '',
      bankName: 'BBVA México',
      clabe: '',
      accountNumber: '',
      defaultReference: '',
      bankPackValues: {},
    })
    setClientForm({
      clientCode: '',
      name: '',
      company: '',
      email: '',
      phone: '',
      rfc: '',
      entityType: 'company',
      status: 'Activo',
      currency: 'MXN',
      paymentTerms: 'Contado',
      city: '',
      state: '',
      country: 'MX',
      notes: '',
      addressStreet: '',
      addressColony: '',
      addressCity: '',
      addressState: '',
      addressZip: '',
      addressCountry: 'MX',
      addressIsShipping: true,
      addressIsBilling: true,
      addressesList: [],
    })
  }

  const closeCreate = () => {
    if (isSubmittingClient) return
    setCreateKind(null)
  }

  const submitCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (createKind === 'client') {
      setIsSubmittingClient(true)
      try {
        const clientAddresses: ClientAddress[] = [...clientForm.addressesList]
        if (clientForm.addressStreet.trim() || clientForm.addressCity.trim() || clientForm.addressZip.trim()) {
          clientAddresses.push({
            id: `addr_${Date.now()}`,
            street: clientForm.addressStreet.trim(),
            colony: clientForm.addressColony.trim(),
            city: clientForm.addressCity.trim(),
            state: clientForm.addressState.trim(),
            zipCode: clientForm.addressZip.trim(),
            country: clientForm.addressCountry || clientForm.country || 'MX',
            isShipping: clientForm.addressIsShipping,
            isBilling: clientForm.addressIsBilling,
          })
        }

        const primaryAddr = clientAddresses[0]
        const response = await createClientApi({
          clientCode: clientForm.clientCode,
          name: clientForm.name,
          company: clientForm.company,
          email: clientForm.email,
          phone: clientForm.phone,
          rfc: clientForm.rfc,
          entityType: clientForm.entityType,
          status: clientForm.status,
          currency: clientForm.currency,
          paymentTerms: clientForm.paymentTerms,
          city: primaryAddr?.city || clientForm.city,
          state: primaryAddr?.state || clientForm.state,
          country: primaryAddr?.country || clientForm.country || 'MX',
          notes: clientForm.notes,
          addresses: clientAddresses,
        })
        const clientData = response.data
        const newRecord: DirectoryRecord = {
          clientCode: clientData.clientCode || clientForm.clientCode.trim() || undefined,
          name: clientData.name,
          company: clientData.company,
          email: clientData.email,
          phone: clientData.phone,
          status: clientData.status,
          lastActivity: clientData.lastActivity,
          initials: clientData.initials,
          color: clientData.color,
          rfc: clientData.rfc,
          entityType: clientData.entityType,
          currency: clientData.currency,
          paymentTerms: clientData.paymentTerms,
          city: primaryAddr?.city || clientData.address?.city,
          state: primaryAddr?.state || clientData.address?.state,
          country: primaryAddr?.country || clientData.address?.country || clientForm.country || 'MX',
          notes: clientForm.notes.trim() || undefined,
          addresses: clientAddresses,
        }
        setClientRecords((records) => [newRecord, ...records])
        const successMsg = response.isMock
          ? `Cliente “${newRecord.company}” registrado con sus direcciones.`
          : `Cliente “${newRecord.company}” registrado y sincronizado con el backend.`
        setNotice(successMsg)
        toast.success(successMsg, 'Cliente guardado')
        setCrmSection('Clientes')
        setCreateKind(null)
      } catch (error) {
        console.error('Error al registrar cliente:', error)
        setNotice('No fue posible procesar el alta del cliente.')
        toast.error('No fue posible procesar el alta del cliente. Inténtalo nuevamente.', 'Error al registrar')
      } finally {
        setIsSubmittingClient(false)
      }
      return
    }

    if (createKind === 'supplier') {
      const name = createForm.name.trim()
      const company = createForm.company.trim() || name
      const country = createForm.country.trim() || 'MX'

      const supplierAddresses: ClientAddress[] = [...createForm.addressesList]
      if (createForm.addressStreet.trim() || createForm.addressCity.trim() || createForm.addressZip.trim()) {
        supplierAddresses.push({
          id: `addr_${Date.now()}`,
          street: createForm.addressStreet.trim(),
          colony: createForm.addressColony.trim(),
          city: createForm.addressCity.trim(),
          state: createForm.addressState.trim(),
          zipCode: createForm.addressZip.trim(),
          country: createForm.addressCountry || country,
          isShipping: createForm.addressIsShipping,
          isBilling: createForm.addressIsBilling,
        })
      }

      setSupplierRecords((records) => [
        {
          supplierCode: createForm.supplierCode.trim() || undefined,
          name,
          company,
          email: createForm.email.trim(),
          phone: createForm.phone.trim(),
          status: 'Activo',
          lastActivity: 'Ahora',
          initials: name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase(),
          color: 'blue',
          country,
          city: supplierAddresses[0]?.city,
          state: supplierAddresses[0]?.state,
          addresses: supplierAddresses,
          rfc: createForm.rfc.trim().toUpperCase() || undefined,
          currency: 'MXN',
          bankName: createForm.bankName.trim() || undefined,
          clabe: createForm.clabe.trim() || undefined,
          accountNumber: createForm.accountNumber.trim() || undefined,
          defaultReference: createForm.defaultReference.trim() || undefined,
          bankPackValues: createForm.bankPackValues,
          bankAccounts:
            createForm.bankName.trim() || createForm.clabe.trim()
              ? [
                  {
                    id: `sba_${Date.now()}`,
                    alias: createForm.bankName.trim()
                      ? `${createForm.bankName.trim()} Principal`
                      : 'Cuenta Principal',
                    bankName: createForm.bankName.trim(),
                    clabe: createForm.clabe.trim(),
                    accountNumber: createForm.accountNumber.trim() || undefined,
                    currency: 'MXN',
                    defaultReference: createForm.defaultReference.trim() || undefined,
                    isDefault: true,
                    active: true,
                    bankPackValues: createForm.bankPackValues || {},
                  },
                ]
              : [],
        },
        ...records,
      ])
      const suppMsg = `Proveedor “${name}” creado en esta sesión con sus direcciones.`
      setNotice(suppMsg)
      toast.success(suppMsg, 'Proveedor guardado')
      setCrmSection('Proveedores')
    }
    if (createKind === 'opportunity') {
      const company = createForm.company.trim()
      const value = Number(createForm.value) || 0
      setOpportunityRecords((records) => [...records, { company, person: createForm.name.trim() || 'Sin contacto', initials: company.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase(), color: 'blue', value, stage: 'Calificada', stageTone: 'green', date: 'Ahora' }])
      const oppMsg = `Oportunidad de “${company}” creada con éxito.`
      setNotice(oppMsg)
      toast.success(oppMsg, 'Oportunidad creada')
      setCrmSection('Oportunidades')
    }
    if (createKind === 'activity') {
      const title = createForm.title.trim()
      setActivityRecords((records) => [...records, { title, company: createForm.company.trim() || 'Sin empresa', time: createForm.time, icon: 'check', tone: 'green' }])
      const actMsg = `Actividad “${title}” programada para las ${createForm.time}.`
      setNotice(actMsg)
      toast.success(actMsg, 'Actividad agendada')
      setCrmSection('Actividades')
    }
    closeCreate()
  }

  useEffect(() => {
    const handlePopState = () => {
      setActivePage(pageFromPath(window.location.pathname))
      setCrmSection(crmSectionFromPath(window.location.pathname))
      setSalesSection(salesSectionFromPath(window.location.pathname))
      setPurchasesSection(purchasesSectionFromPath(window.location.pathname))
      setOperationsSection(operationsSectionFromPath(window.location.pathname))
      setFinanceSection(financeSectionFromPath(window.location.pathname))
      setExpensesSection(expensesSectionFromPath(window.location.pathname))
      setReportsSection(reportsSectionFromPath(window.location.pathname))
      setAdminSection(adminSectionFromPath(window.location.pathname))
      setSelectedSubsidiaryId(subsidiaryIdFromPath(window.location.pathname))
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])
  const [menuOpen, setMenuOpen] = useState(false)
  const [notice, setNotice] = useState('')

  const handleCreate = () => {
    openCreate('opportunity')
  }
  const directoryRecords = crmSection === 'Proveedores' ? supplierRecords : clientRecords
  const filteredDirectory = directoryRecords.filter((client) => {
    const query = clientQuery.trim().toLowerCase()
    const countryName = findCountry(client.country)?.name || ''
    const matchesQuery = !query || `${client.clientCode || ''} ${client.supplierCode || ''} ${client.name} ${client.company} ${client.email} ${client.rfc || ''} ${client.country || ''} ${countryName}`.toLowerCase().includes(query)
    const matchesStatus = clientStatus === 'Todos' || client.status === clientStatus
    return matchesQuery && matchesStatus
  })

  return (
    <div className="app-frame" data-accent={accentTheme} data-theme={darkMode ? 'dark' : 'light'}>
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><span>A</span><i /></div>
          <span className="brand-name">AES <span>Nexus</span></span>
          <button className="icon-button sidebar-close" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)}><X size={18} /></button>
        </div>

        <button
          className="workspace-switch"
          onClick={() => {
            const firstSetting = getFirstAccessibleSection(
              'Configuración',
              activeCapabilities,
              isFullAdmin,
              activeSessionProfile.isActive,
              activeSectionAccess
            )
            if (!firstSetting) {
              notifyAccessDenied('Configuración')
              return
            }
            navigateToSettingSection(
              canAccessSection(
                'Configuración',
                'General',
                activeCapabilities,
                isFullAdmin,
                activeSessionProfile.isActive,
                activeSectionAccess
              )
                ? 'General'
                : firstSetting
            )
            setMenuOpen(false)
          }}
        >
          {orgLogoUrl && !orgLogoError ? (
            <img
              className="workspace-logo-img"
              src={orgLogoUrl}
              alt={workspaceMeta.workspaceName || 'Logo de la empresa'}
              onError={() => setOrgLogoError(true)}
            />
          ) : (
            <span
              className="workspace-avatar"
              style={{ backgroundColor: workspaceMeta.avatarColor, color: '#ffffff' }}
            >
              {(
                workspaceMeta.workspaceName
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join('') || 'BE'
              ).toUpperCase()}
            </span>
          )}
          <span className="workspace-copy">
            <strong>{workspaceMeta.workspaceName || 'Brújula Estudio'}</strong>
            <small>{t('nav.planInitial')}</small>
          </span>
          <ChevronDown size={15} />
        </button>

        <label className="search-box"><Search size={15} /><input aria-label={t('nav.searchPlaceholder')} placeholder={t('nav.searchPlaceholder')} /><kbd>⌘ K</kbd></label>

        <nav className="side-nav" aria-label="Navegación principal">
          {sections.map((section) => {
            const visibleItems = section.items.filter(({ name }) =>
              canAccessModule(
                name,
                activeCapabilities,
                isFullAdmin,
                activeSessionProfile.isActive,
                activeSectionAccess
              )
            )
            if (visibleItems.length === 0) return null
            return (
              <div className="nav-section" key={section.labelKey}>
                <p className="nav-label">{t(section.labelKey)}</p>
                {visibleItems.map(({ name, labelKey, icon: Icon, count }) => (
                  <button
                    key={name}
                    className={`nav-item ${activePage === name ? 'active' : ''}`}
                    aria-current={activePage === name ? 'page' : undefined}
                    onClick={() => {
                      navigateTo(name)
                      setNotice('')
                      setMenuOpen(false)
                    }}
                  >
                    <Icon size={17} strokeWidth={1.8} />
                    <span>{t(labelKey)}</span>
                    {count && <em>{count}</em>}
                  </button>
                ))}
              </div>
            )
          })}
        </nav>

        <div className="sidebar-spacer" />
        <div className="progress-card">
          <div className="progress-heading"><Sparkles size={15} /><span>{t('nav.progressTitle')}</span></div>
          <p>{t('nav.progressBody')}</p>
          <div className="progress-track"><span /></div>
          <small>{t('nav.progressSteps')}</small>
        </div>
        <button className="nav-item quiet"><CircleHelp size={17} /><span>{t('nav.help')}</span></button>
        {canAccessModule(
          'Configuración',
          activeCapabilities,
          isFullAdmin,
          activeSessionProfile.isActive,
          activeSectionAccess
        ) && (
          <button
            className={`nav-item quiet ${activePage === 'Configuración' ? 'active' : ''}`}
            aria-current={activePage === 'Configuración' ? 'page' : undefined}
            onClick={() => {
              navigateTo('Configuración')
              setNotice('')
              setMenuOpen(false)
            }}
          >
            <Settings2 size={17} />
            <span>{t('nav.settings')}</span>
          </button>
        )}
        <div className="profile-switcher-wrap" ref={profileMenuRef}>
          {isProfileMenuOpen && (
            <div className="profile-switcher-popover" role="menu" aria-label="Cambiar rol o usuario activo">
              <div className="profile-switcher-header">
                <strong>Iniciar sesión / Cambiar rol</strong>
                <span>Selecciona un rol o perfil para ajustar permisos</span>
              </div>

              <div className="profile-switcher-group">
                <span className="profile-switcher-group-title">Roles del sistema (Cambio rápido)</span>
                {roleDefinitions.map((role) => {
                  const isCurrentRole = activeSessionProfile.activeRoleId === role.id
                  return (
                    <button
                      key={`quick-role-${role.id}`}
                      type="button"
                      role="menuitemradio"
                      aria-checked={isCurrentRole}
                      className={`profile-switcher-item ${isCurrentRole ? 'active' : ''}`}
                      onClick={() => handleSwitchActiveRole(role.id)}
                    >
                      <span className="profile-switcher-avatar role-chip-avatar">
                        <ShieldCheck size={12} />
                      </span>
                      <div className="profile-switcher-copy">
                        <strong>{role.name}</strong>
                        <small>{role.capabilities.length} permisos habilitados</small>
                      </div>
                      {isCurrentRole && <Check size={14} className="profile-switcher-check" />}
                    </button>
                  )
                })}
                <button
                  type="button"
                  role="menuitem"
                  className="profile-switcher-open-login-btn"
                  onClick={() => {
                    setIsProfileMenuOpen(false)
                    setRoleLoginDialogMode('modal')
                  }}
                >
                  <LogIn size={12} /> Elegir usuario y rol de inicio...
                </button>
              </div>

              <div className="profile-switcher-group">
                <span className="profile-switcher-group-title">Usuarios de acceso (Settings)</span>
                {workspaceUsers.map((usr) => {
                  const key = `user:${usr.id}`
                  const isCurrent = activeSessionProfile.key === key
                  const validRoleIds = new Set(roleDefinitions.map((r) => r.id))
                  const userRoles = getWorkspaceUserRoleIds(usr, validRoleIds)
                  const roleLabel =
                    userRoles.length > 0
                      ? userRoles.map(getRoleDisplayName).join(', ')
                      : 'Sin rol asignado'
                  return (
                    <button
                      key={key}
                      type="button"
                      role="menuitemradio"
                      aria-checked={isCurrent}
                      className={`profile-switcher-item ${isCurrent ? 'active' : ''}`}
                      onClick={() =>
                        handleSelectSessionProfile(
                          key,
                          usr.name,
                          usr.status === 'active' ? roleLabel : 'Suspendido'
                        )
                      }
                    >
                      <span className="profile-switcher-avatar">{usr.avatarInitials}</span>
                      <div className="profile-switcher-copy">
                        <strong>{usr.name}</strong>
                        <small>
                          {roleLabel}
                          {usr.status === 'suspended' ? ' · Suspendido' : ''}
                        </small>
                      </div>
                      {isCurrent && <Check size={14} className="profile-switcher-check" />}
                    </button>
                  )
                })}
              </div>

              <div className="profile-switcher-group">
                <span className="profile-switcher-group-title">Empleados con acceso (CRM · Usuarios)</span>
                {(() => {
                  const validIds = new Set(roleDefinitions.map((r) => r.id))
                  const userEmployees = employees.filter((emp) => isEmployeeSystemUser(emp, validIds))
                  if (userEmployees.length === 0) {
                    return (
                      <div className="profile-switcher-empty">
                        Ningún empleado tiene rol de acceso asignado.
                      </div>
                    )
                  }
                  return userEmployees.map((emp) => {
                    const key = `emp:${emp.id}`
                    const isCurrent = activeSessionProfile.key === key
                    const rolesText = emp.roles
                      .filter((id) => validIds.has(id))
                      .map(getRoleDisplayName)
                      .join(', ')
                    return (
                      <button
                        key={key}
                        type="button"
                        role="menuitemradio"
                        aria-checked={isCurrent}
                        className={`profile-switcher-item ${isCurrent ? 'active' : ''}`}
                        onClick={() =>
                          handleSelectSessionProfile(
                            key,
                            emp.fullName,
                            emp.status === 'Inactivo' ? 'Inactivo' : rolesText
                          )
                        }
                      >
                        <span className="profile-switcher-avatar">{emp.initials}</span>
                        <div className="profile-switcher-copy">
                          <strong>{emp.fullName}</strong>
                          <small>
                            {rolesText}
                            {emp.status === 'Inactivo' ? ' · Inactivo' : ''}
                          </small>
                        </div>
                        {isCurrent && <Check size={14} className="profile-switcher-check" />}
                      </button>
                    )
                  })
                })()}
              </div>
            </div>
          )}

          <button
            type="button"
            className={`profile-row profile-row-btn ${isProfileMenuOpen ? 'open' : ''}`}
            aria-expanded={isProfileMenuOpen}
            aria-haspopup="menu"
            onClick={() => setIsProfileMenuOpen((prev) => !prev)}
            title="Cambiar usuario activo para validar permisos"
          >
            <div className="profile-avatar">{activeSessionProfile.initials}</div>
            <div className="profile-copy">
              <strong>{activeSessionProfile.name}</strong>
              <small>{activeSessionProfile.subtitle}</small>
            </div>
            <MoreHorizontal size={18} />
          </button>
        </div>
      </aside>

      {menuOpen && <button className="mobile-scrim" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />}

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Abrir menú" onClick={() => setMenuOpen(true)}><Menu size={19} /></button>
          <div className="breadcrumbs"><span>AES Nexus</span><span className="crumb-slash">/</span><strong>{activePage === 'Inicio' ? t('nav.home') : activePage === 'CRM' ? t('nav.crm') : activePage === 'Ventas' ? t('nav.sales') : activePage === 'Compras' ? t('nav.purchases') : activePage === 'Operaciones' ? t('nav.operations') : activePage === 'Finanzas' ? t('nav.finance') : activePage === 'Gastos' ? t('nav.expenses') : activePage === 'Reportes' ? t('nav.reports') : activePage === 'Administración' ? t('nav.admin') : activePage === 'Configuración' ? t('nav.settings') : activePage}</strong>{activePage === 'CRM' ? <> <span className="crumb-slash">/</span> <span>{crmSection === 'Clientes' ? t('tabs.crm.clients') : crmSection === 'Proveedores' ? t('tabs.crm.suppliers') : crmSection === 'Empleados' ? t('tabs.crm.employees') : crmSection === 'Nómina' ? t('tabs.crm.payroll') : crmSection === 'Oportunidades' ? t('tabs.crm.opportunities') : crmSection === 'Actividades' ? t('tabs.crm.activities') : t('tabs.crm.summary')}</span> </> : activePage === 'Ventas' ? <> <span className="crumb-slash">/</span> <span>{salesSection === 'Catálogo' ? t('tabs.sales.catalog') : salesSection === 'Cotizaciones' ? t('tabs.sales.quotes') : salesSection === 'Pedidos' ? t('tabs.sales.orders') : salesSection === 'Facturas' ? t('tabs.sales.invoices') : salesSection === 'Devoluciones' ? t('tabs.sales.returns') : t('tabs.sales.summary')}</span> </> : activePage === 'Compras' ? <> <span className="crumb-slash">/</span> <span>{purchasesSection === 'Requisiciones' ? t('tabs.purchases.requisitions') : purchasesSection === 'Órdenes de compra' ? t('tabs.purchases.orders') : purchasesSection === 'Recepciones' ? t('tabs.purchases.receptions') : purchasesSection === 'Facturas' ? t('tabs.purchases.invoices') : purchasesSection === 'Devoluciones' ? t('tabs.purchases.returns') : t('tabs.purchases.summary')}</span> </> : activePage === 'Operaciones' ? <> <span className="crumb-slash">/</span> <span>{operationsSection === 'Inventario' ? t('tabs.ops.inventory') : operationsSection === 'Traslados' ? t('tabs.ops.transfers') : operationsSection === 'Compras' ? t('tabs.ops.purchases') : operationsSection === 'Entregas' ? t('tabs.ops.deliveries') : t('tabs.ops.summary')}</span> </> : activePage === 'Finanzas' ? <> <span className="crumb-slash">/</span> <span>{financeSection === 'Cobros' ? t('tabs.fin.receivables') : financeSection === 'Pagos' ? t('tabs.fin.payables') : financeSection === 'Pagos Bancarios' ? t('tabs.fin.ebp') : financeSection === 'Cuentas contables' ? t('tabs.fin.accounting') : t('tabs.fin.summary')}</span> </> : activePage === 'Gastos' ? <> <span className="crumb-slash">/</span> <span>{expensesSection === 'Registro y pólizas' ? t('tabs.expenses.ledger') : expensesSection === 'Presupuestos y alertas' ? t('tabs.expenses.budgets') : expensesSection === 'Gastos recurrentes' ? t('tabs.expenses.recurring') : t('tabs.expenses.summary')}</span> </> : activePage === 'Reportes' ? <> <span className="crumb-slash">/</span> <span>{reportsSection === 'Estado de Resultados' ? t('tabs.reports.incomeStatement') : reportsSection === 'Finanzas y Tesorería' ? t('tabs.reports.financial') : reportsSection === 'CxP y Pagos EBP' ? t('tabs.reports.payablesEbp') : reportsSection === 'Ventas y CxC' ? t('tabs.reports.sales') : reportsSection === 'Compras e Inventario' ? t('tabs.reports.inventory') : reportsSection === 'Nómina y RRHH' ? t('tabs.reports.payroll') : t('tabs.reports.executive')}</span> </> : activePage === 'Administración' ? <> <span className="crumb-slash">/</span> <span>{adminSection === 'Subsidiarias' ? t('tabs.admin.subsidiaries') : adminSection === 'Departamentos' ? t('tabs.admin.departments') : adminSection === 'Ubicaciones' ? t('tabs.admin.locations') : adminSection === 'Flujos de devoluciones' ? t('tabs.admin.returnWorkflows') : adminSection === 'Historial de Auditoría' ? t('tabs.admin.audit') : t('tabs.admin.summary')}</span> {adminSection === 'Subsidiarias' && selectedSubsidiaryId ? <> <span className="crumb-slash">/</span> <span>{selectedSubsidiaryId === '__new__' ? 'Nueva subsidiaria' : subsidiaries.find((s) => s.id === selectedSubsidiaryId)?.code || selectedSubsidiaryId}</span> </> : null} </> : null}</div>
          <div className="topbar-actions">
            <span className="demo-pill"><i /> {t('topbar.demo')}</span>

            <div className="notification-center-anchor" ref={notificationCenterRef}>
              <button
                type="button"
                className={`icon-button notification-button ${isNotificationCenterOpen ? 'active' : ''} ${lowStockItems.length > 0 && pushEnabled ? 'has-critical-alert' : unreadSystemNotifsCount > 0 && pushEnabled ? 'has-system-unread' : ''}`}
                aria-label={`${t('topbar.notifTitle')}: ${lowStockItems.length + unreadSystemNotifsCount}`}
                aria-expanded={isNotificationCenterOpen}
                onClick={() => setIsNotificationCenterOpen((prev) => !prev)}
                title={t('topbar.notifTitle')}
              >
                <Bell size={18} />
                {(lowStockItems.length > 0 || unreadSystemNotifsCount > 0) && pushEnabled ? (
                  <span
                    className={`notification-count-badge ${lowStockItems.length === 0 ? 'badge-info' : ''}`}
                    title={`${lowStockItems.length} alertas de stock · ${unreadSystemNotifsCount} avisos sin leer`}
                  >
                    {lowStockItems.length + unreadSystemNotifsCount}
                  </span>
                ) : (
                  <i />
                )}
              </button>

              {/* Dropdown del Centro de Notificaciones Superior */}
              {isNotificationCenterOpen && (
                <div className="notification-center-dropdown" role="region" aria-label={t('topbar.notifTitle')}>
                  <div className="notif-dropdown-header">
                    <div className="notif-header-title-box">
                      <BellRing size={15} style={{ color: '#456a61' }} />
                      <strong>{t('topbar.notifTitle')}</strong>
                    </div>
                    <div className="notif-header-meta">
                      <span className={`notif-push-status-tag ${pushEnabled ? 'active' : 'inactive'}`}>
                        {pushEnabled ? t('topbar.pushActive') : t('topbar.pushPaused')}
                      </span>
                      <button
                        type="button"
                        className="icon-button"
                        style={{ width: '24px', height: '24px' }}
                        aria-label="Cerrar centro de notificaciones"
                        onClick={() => setIsNotificationCenterOpen(false)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="notif-dropdown-scroll">
                    {/* Alerta Persistente de Stock Crítico */}
                    {lowStockItems.length > 0 ? (
                      <div className="notif-persistent-alert-box">
                        <div className="notif-persistent-badge-row">
                          <span className="notif-persistent-badge">
                            <span className="notif-persistent-dot" />
                            Alerta Persistente
                          </span>
                          <span style={{ fontSize: '8px', color: '#9c2e1d', fontWeight: 700 }}>
                            Stock Crítico · Reorden
                          </span>
                        </div>
                        <h4>
                          <AlertTriangle size={14} /> {lowStockItems.length} producto(s) por debajo del umbral mínimo
                        </h4>
                        <p className="notif-persistent-desc">
                          Se detectaron existencias por debajo del límite de seguridad. Esta advertencia permanecerá activa en este centro de notificaciones hasta que se reabastezca el almacén o se modifique el umbral del SKU.
                        </p>

                        <div className="notif-persistent-items-list">
                          {lowStockItems.slice(0, 3).map((item) => (
                            <div key={item.id} className="notif-persistent-item-card">
                              <div className="notif-item-left">
                                <div className="notif-item-sku-row">
                                  <code>{item.sku}</code>
                                  <strong className="notif-item-name">{item.name}</strong>
                                </div>
                                <span className="notif-item-wh">{item.warehouseName}</span>
                              </div>
                              <div className="notif-item-right">
                                <span className="notif-item-stock-val">
                                  {item.stock} {item.unitOfMeasure}
                                </span>
                                <span className="notif-item-min-val">
                                  Mín. {item.minStock} {item.unitOfMeasure}
                                </span>
                              </div>
                            </div>
                          ))}
                          {lowStockItems.length > 3 && (
                            <div style={{ fontSize: '8.5px', color: '#8c7f7d', textAlign: 'center', padding: '2px 0' }}>
                              +{lowStockItems.length - 3} producto(s) adicional(es) en umbral crítico...
                            </div>
                          )}
                        </div>

                        <div className="notif-persistent-actions">
                          <button
                            type="button"
                            className="button button-primary"
                            onClick={() => handleOpenStockConfigFromNotif('thresholds')}
                          >
                            <SlidersHorizontal size={12} /> Ajustar umbrales
                          </button>
                          <button
                            type="button"
                            className="button button-secondary"
                            onClick={() => {
                              setIsNotificationCenterOpen(false)
                              navigateToOperationsSection('Inventario')
                            }}
                          >
                            <ArrowRight size={12} /> Ver en Inventario
                          </button>
                          <button
                            type="button"
                            className="button button-ghost"
                            onClick={() => {
                              setIsNotificationCenterOpen(false)
                              navigateToPurchasesSection('Requisiciones')
                            }}
                          >
                            <ShoppingCart size={12} /> Compras
                          </button>
                        </div>
                        <span className="notif-pin-footnote">
                          📌 Alerta persistente fijada: Activa de forma continua mientras existan productos bajo su umbral mínimo.
                        </span>
                      </div>
                    ) : (
                      <div className="notif-safe-box">
                        <CheckCircle2 size={16} />
                        <div>
                          <strong>Niveles de inventario seguros</strong>
                          <p>Todos los SKUs cuentan con existencias por encima de su umbral mínimo de seguridad.</p>
                        </div>
                      </div>
                    )}

                    {/* Avisos del Sistema conectados en tiempo real a Operaciones, Finanzas y Ventas */}
                    <div className="notif-section-header-row">
                      <span className="notif-section-label">
                        Avisos del Sistema ({activeSystemNotifications.length})
                      </span>
                      <div className="notif-section-bulk-actions">
                        {unreadSystemNotifsCount > 0 && (
                          <button
                            type="button"
                            className="notif-bulk-action-btn"
                            onClick={markAllSystemNotifsRead}
                            title="Marcar todos los avisos visibles como leídos"
                          >
                            <CheckCheck size={12} /> Marcar leídas
                          </button>
                        )}
                        {readSystemNotifsCount > 0 && (
                          <button
                            type="button"
                            className="notif-bulk-action-btn clear"
                            onClick={clearReadSystemNotifs}
                            title="Ocultar y limpiar todas las notificaciones leídas"
                          >
                            <X size={11} /> Limpiar leídas ({readSystemNotifsCount})
                          </button>
                        )}
                        {dismissedSystemNotifsCount > 0 && readSystemNotifsCount === 0 && (
                          <button
                            type="button"
                            className="notif-bulk-action-btn"
                            onClick={restoreDismissedSystemNotifs}
                            title="Mostrar avisos descartados que aún siguen pendientes"
                          >
                            <RotateCcw size={11} /> Restaurar ({dismissedSystemNotifsCount})
                          </button>
                        )}
                      </div>
                    </div>

                    {activeSystemNotifications.length === 0 ? (
                      <div className="notif-system-empty">
                        <CheckCircle2 size={15} />
                        <div>
                          <strong>
                            {liveSystemNotifications.length === 0
                              ? 'Sin alertas operativas pendientes'
                              : 'Avisos limpios'}
                          </strong>
                          <p>
                            {liveSystemNotifications.length === 0
                              ? 'Todos los envíos, facturas y pedidos están resueltos al día.'
                              : `Todos los avisos resueltos o leídos fueron limpiados.`}
                          </p>
                        </div>
                        {dismissedSystemNotifsCount > 0 && (
                          <button
                            type="button"
                            className="notif-bulk-action-btn"
                            onClick={restoreDismissedSystemNotifs}
                          >
                            <RotateCcw size={11} /> Ver ({dismissedSystemNotifsCount})
                          </button>
                        )}
                      </div>
                    ) : (
                      activeSystemNotifications.map((notice) => {
                        const isRead = notifPrefState.read[notice.id] === notice.fingerprint
                        const IconComp =
                          notice.targetModule === 'Compras'
                            ? ShoppingCart
                            : notice.targetModule === 'Operaciones'
                            ? notice.targetSection === 'Entregas'
                              ? Truck
                              : Package
                            : notice.targetModule === 'Finanzas'
                            ? Receipt
                            : FileText
                        const handleOpenNoticeTarget = () => {
                          markSystemNotifRead(notice.id, notice.fingerprint, true)
                          setIsNotificationCenterOpen(false)
                          if (notice.targetModule === 'Compras') {
                            navigateToPurchasesSection(
                              notice.targetSection as PurchasesSectionTab
                            )
                          } else if (notice.targetModule === 'Operaciones') {
                            navigateToOperationsSection(
                              notice.targetSection as 'Inventario' | 'Traslados' | 'Compras' | 'Entregas' | 'Resumen'
                            )
                          } else if (notice.targetModule === 'Finanzas') {
                            if (notice.targetSection === 'Gastos') {
                              navigateToExpensesSection('Registro y pólizas')
                            } else {
                              navigateToFinanceSection(
                                notice.targetSection as
                                  | 'Cobros'
                                  | 'Pagos'
                                  | 'Pagos Bancarios'
                                  | 'Cuentas contables'
                                  | 'Resumen'
                              )
                            }
                          } else {
                            navigateToSalesSection(
                              notice.targetSection as 'Catálogo' | 'Cotizaciones' | 'Pedidos' | 'Facturas' | 'Resumen'
                            )
                          }
                        }

                        return (
                          <div
                            key={notice.id}
                            className={`notif-general-item ${isRead ? 'is-read' : 'is-unread'}`}
                          >
                            <div className={`notif-general-icon ${notice.tone}`}>
                              <IconComp size={14} />
                            </div>
                            <div className="notif-general-content">
                              <div className="notif-general-title-row">
                                <span className="notif-general-title">
                                  {!isRead && <span className="notif-unread-dot" aria-label="No leída" />}
                                  {notice.title}
                                </span>
                                <div className="notif-item-controls">
                                  <button
                                    type="button"
                                    className={`notif-item-mini-btn ${isRead ? 'active' : ''}`}
                                    onClick={() =>
                                      markSystemNotifRead(notice.id, notice.fingerprint, !isRead)
                                    }
                                    title={isRead ? 'Marcar como no leída' : 'Marcar como leída'}
                                    aria-label={isRead ? 'Marcar como no leída' : 'Marcar como leída'}
                                  >
                                    <Check size={11} />
                                  </button>
                                  <button
                                    type="button"
                                    className="notif-item-mini-btn dismiss"
                                    onClick={() =>
                                      dismissSystemNotif(notice.id, notice.fingerprint)
                                    }
                                    title="Descartar aviso"
                                    aria-label="Descartar aviso"
                                  >
                                    <X size={11} />
                                  </button>
                                </div>
                              </div>
                              <div className="notif-general-desc">{notice.desc}</div>
                              <div className="notif-general-meta-row">
                                <span className="notif-general-time">{notice.meta}</span>
                                <button
                                  type="button"
                                  className="notif-inline-nav-link"
                                  onClick={handleOpenNoticeTarget}
                                >
                                  {notice.actionLabel} &rarr;
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  <div className="notif-dropdown-footer">
                    <div className="notif-quick-push-toggle">
                      <label className="toggle-switch-wrap" title={pushEnabled ? 'Pausar notificaciones push' : 'Activar notificaciones push'}>
                        <input
                          type="checkbox"
                          checked={pushEnabled}
                          onChange={() => handleTogglePush()}
                        />
                        <span className="toggle-slider" />
                      </label>
                      <div className="notif-quick-push-toggle-label">
                        <strong>Notificaciones Push</strong>
                        <small>{pushEnabled ? 'Alertas persistentes activas' : 'Pausadas'}</small>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-open-config-from-notif"
                      onClick={() => handleOpenStockConfigFromNotif('thresholds')}
                    >
                      Ajustes de stock &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="topbar-role-anchor" ref={topbarRoleMenuRef}>
              <button
                type="button"
                className={`topbar-role-trigger ${isTopbarRoleMenuOpen ? 'open' : ''}`}
                aria-expanded={isTopbarRoleMenuOpen}
                aria-haspopup="menu"
                aria-label={`Sesión activa: ${activeSessionProfile.name} (${activeSessionProfile.subtitle}). Abrir menú para cambiar rol`}
                onClick={() => setIsTopbarRoleMenuOpen((prev) => !prev)}
                title="Seleccionar o cambiar el rol de inicio de sesión"
              >
                <span className="top-avatar">{activeSessionProfile.initials}</span>
                <span className="topbar-role-meta">
                  <strong>{activeSessionProfile.name}</strong>
                  <small>{activeSessionProfile.subtitle}</small>
                </span>
                <ChevronDown size={14} className="topbar-role-chevron" />
              </button>

              {isTopbarRoleMenuOpen && (
                <div
                  className="topbar-role-popover"
                  role="menu"
                  aria-label="Menú de selección y cambio de rol"
                >
                  <div className="topbar-role-popover-head">
                    <div>
                      <strong>{activeSessionProfile.name}</strong>
                      <span>Rol activo: {activeSessionProfile.subtitle}</span>
                    </div>
                  </div>

                  <div className="topbar-role-popover-section">
                    <span className="topbar-role-section-label">Cambiar rol de sesión</span>
                    {(() => {
                      const baseUser = workspaceUsers.find(
                        (u) => u.id === activeSessionProfile.baseUserId
                      )
                      const baseUserRoles = baseUser
                        ? getWorkspaceUserRoleIds(
                            baseUser,
                            new Set(roleDefinitions.map((r) => r.id))
                          )
                        : []
                      return (
                        <>
                          {baseUser && baseUserRoles.length > 1 && (
                            <button
                              type="button"
                              role="menuitemradio"
                              aria-checked={activeSessionProfile.activeRoleId === 'COMBINED'}
                              className={`topbar-role-option ${
                                activeSessionProfile.activeRoleId === 'COMBINED' ? 'active' : ''
                              }`}
                              onClick={() => handleSwitchActiveRole('COMBINED', baseUser.id)}
                            >
                              <div className="topbar-role-option-copy">
                                <strong>Todos mis roles asignados ({baseUserRoles.length})</strong>
                                <small>{baseUserRoles.map(getRoleDisplayName).join(', ')}</small>
                              </div>
                              {activeSessionProfile.activeRoleId === 'COMBINED' && (
                                <Check size={14} className="topbar-role-check" />
                              )}
                            </button>
                          )}

                          {roleDefinitions.map((role) => {
                            const isSelected = activeSessionProfile.activeRoleId === role.id
                            return (
                              <button
                                key={role.id}
                                type="button"
                                role="menuitemradio"
                                aria-checked={isSelected}
                                className={`topbar-role-option ${isSelected ? 'active' : ''}`}
                                onClick={() => handleSwitchActiveRole(role.id)}
                              >
                                <div className="topbar-role-option-copy">
                                  <strong>{role.name}</strong>
                                  <small>{role.capabilities.length} permisos · {role.description}</small>
                                </div>
                                {isSelected && <Check size={14} className="topbar-role-check" />}
                              </button>
                            )
                          })}
                        </>
                      )
                    })()}
                  </div>

                  <div className="topbar-role-popover-footer">
                    <button
                      type="button"
                      role="menuitem"
                      className="topbar-role-footer-btn"
                      onClick={() => {
                        setIsTopbarRoleMenuOpen(false)
                        setRoleLoginDialogMode('modal')
                      }}
                    >
                      <LogIn size={13} /> Elegir usuario y rol de inicio...
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="topbar-role-footer-btn danger"
                      onClick={() => {
                        setIsTopbarRoleMenuOpen(false)
                        setRoleLoginDialogMode('gate')
                      }}
                    >
                      <LogOut size={13} /> Cerrar sesión y seleccionar rol
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="page-content">
          {(() => {
            const activeSectionName =
              activePage === 'Configuración'
                ? activeSetting
                : activePage === 'CRM'
                ? crmSection
                : activePage === 'Ventas'
                ? salesSection
                : activePage === 'Operaciones'
                ? operationsSection
                : activePage === 'Finanzas'
                ? financeSection
                : activePage === 'Gastos'
                ? expensesSection
                : activePage === 'Reportes'
                ? reportsSection
                : activePage === 'Administración'
                ? adminSection
                : 'Inicio'
            const isSectionAllowed =
              activePage === 'Inicio' ||
              canAccessSection(
                activePage,
                activeSectionName,
                activeCapabilities,
                isFullAdmin,
                activeSessionProfile.isActive,
                activeSectionAccess
              )
            if (!isSectionAllowed) {
              const requiredCaps = getRequiredCapabilities(activePage, activeSectionName)
              return (
                <section className="restricted-access-card" role="alert" aria-live="polite">
                  <div className="restricted-access-icon">
                    <LockKeyhole size={24} />
                  </div>
                  <div className="restricted-access-copy">
                    <div className="eyebrow">
                      <span className="eyebrow-line" /> CONTROL DE ACCESO POR ROL
                    </div>
                    <h2>Acceso restringido a {activePage} &rsaquo; {activeSectionName}</h2>
                    <p>
                      El perfil activo <strong>{activeSessionProfile.name}</strong> ({activeSessionProfile.subtitle}) no cuenta con los permisos necesarios para abrir esta sección del sistema.
                    </p>
                    {requiredCaps.length > 0 && (
                      <div className="restricted-req-list">
                        <span>Permisos requeridos (al menos uno):</span>
                        <div className="restricted-req-chips">
                          {requiredCaps.map((capId) => (
                            <span key={capId} className="restricted-req-chip">
                              <ShieldAlert size={11} /> {CAPABILITY_LABELS_ES[capId]}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="restricted-actions">
                      <button
                        type="button"
                        className="button button-primary"
                        onClick={() => navigateTo('Inicio')}
                      >
                        Volver al inicio <ArrowRight size={14} />
                      </button>
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => setRoleLoginDialogMode('modal')}
                      >
                        <UserCheck size={14} /> Cambiar rol / Iniciar sesión
                      </button>
                    </div>
                  </div>
                </section>
              )
            }
            return null
          })()}
          {!(
            activePage === 'Inicio' ||
            canAccessSection(
              activePage,
              activePage === 'Configuración'
                ? activeSetting
                : activePage === 'CRM'
                ? crmSection
                : activePage === 'Ventas'
                ? salesSection
                : activePage === 'Operaciones'
                ? operationsSection
                : activePage === 'Finanzas'
                ? financeSection
                : activePage === 'Gastos'
                ? expensesSection
                : activePage === 'Reportes'
                ? reportsSection
                : activePage === 'Administración'
                ? adminSection
                : 'Inicio',
              activeCapabilities,
              isFullAdmin,
              activeSessionProfile.isActive,
              activeSectionAccess
            )
          ) ? null : activePage === 'Configuración' ? (
            <SettingsSection
              activeSetting={activeSetting}
              onSelectSetting={(setting) => {
                if (
                  !canAccessSection(
                    'Configuración',
                    setting,
                    activeCapabilities,
                    isFullAdmin,
                    activeSessionProfile.isActive,
                    activeSectionAccess
                  )
                ) {
                  notifyAccessDenied(`Settings · ${setting}`)
                  return
                }
                setActiveSetting(setting)
                setNotice('')
              }}
              accentTheme={accentTheme}
              onSelectAccentTheme={(themeId) => {
                setAccentTheme(themeId as AccentTheme)
                window.localStorage.setItem('aes-nexus-accent', themeId)
              }}
              darkMode={darkMode}
              onToggleDarkMode={() => {
                const nextMode = !darkMode
                setDarkMode(nextMode)
                window.localStorage.setItem('aes-nexus-dark-mode', String(nextMode))
                toast.info(nextMode ? 'Modo oscuro activado.' : 'Modo claro activado.', 'Tema visual')
              }}
              accentOptions={accentOptions}
              warehouses={warehouses}
              locations={locations}
              onAddLocation={handleAddLocation}
              onRemoveLocation={handleRemoveLocation}
              onNavigateAdminLocations={() => navigateToAdminSection('Ubicaciones')}
              onWorkspaceMetaChange={setWorkspaceMeta}
              receivablesCount={receivables.length}
              activeCapabilities={activeCapabilities}
              activeSectionAccess={activeSectionAccess}
              isFullAdmin={isFullAdmin}
              isAccountActive={activeSessionProfile.isActive}
              inventory={inventory}
              products={initialProductsAndServices}
              onUpdateInventory={setInventory}
              categoryThresholds={categoryStockThresholds}
              onUpdateCategoryThresholds={handleUpdateCategoryThresholds}
              currentUserName={activeSessionProfile.name}
              currentUserId={activeActorUserId}
            />
          ) : activePage === 'CRM' ? (
            <section className="crm-page" aria-labelledby="crm-title">
              <div className="crm-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> AES NEXUS · H2 PILOTO COMERCIAL</div><h1 id="crm-title">{t('module.crm.title')}</h1><p>{t('module.crm.subtitle')}</p></div></div>
              {notice && <div className="notice" role="status">{notice}<button aria-label={t('common.close')} onClick={() => setNotice('')}><X size={15} /></button></div>}
              <nav className="crm-tabs" aria-label="Secciones de CRM">
                {canAccessSection('CRM', 'Resumen', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                  <button className={crmSection === 'Resumen' ? 'active' : ''} onClick={() => navigateToCrmSection('Resumen')}>{t('tabs.crm.summary')}</button>
                )}
                {canAccessSection('CRM', 'Clientes', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                  <button className={crmSection === 'Clientes' ? 'active' : ''} onClick={() => navigateToCrmSection('Clientes')}>{t('tabs.crm.clients')} <span>{clientRecords.length}</span></button>
                )}
                {canAccessSection('CRM', 'Proveedores', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                  <button className={crmSection === 'Proveedores' ? 'active' : ''} onClick={() => navigateToCrmSection('Proveedores')}>{t('tabs.crm.suppliers')} <span>{supplierRecords.length}</span></button>
                )}
                {canAccessSection('CRM', 'Empleados', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                  <button className={crmSection === 'Empleados' ? 'active' : ''} onClick={() => navigateToCrmSection('Empleados')}>{t('tabs.crm.employees')} <span>{employees.length}</span></button>
                )}
                {canAccessSection('CRM', 'Nómina', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                  <button className={crmSection === 'Nómina' ? 'active' : ''} onClick={() => navigateToCrmSection('Nómina')}>{t('tabs.crm.payroll')} <span>{payrollRuns.length}</span></button>
                )}
                {canAccessSection('CRM', 'Oportunidades', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                  <button className={crmSection === 'Oportunidades' ? 'active' : ''} onClick={() => navigateToCrmSection('Oportunidades')}>{t('tabs.crm.opportunities')} <span>{opportunityRecords.length}</span></button>
                )}
                {canAccessSection('CRM', 'Actividades', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                  <button className={crmSection === 'Actividades' ? 'active' : ''} onClick={() => navigateToCrmSection('Actividades')}>{t('tabs.crm.activities')} <span>{activityRecords.length}</span></button>
                )}
              </nav>
              {crmSection === 'Empleados' ? (
                <CrmEmployees
                  employees={employees}
                  departments={departments}
                  locations={locations}
                  installedPacks={ebpPacks}
                  onAddEmployee={(emp) => {
                    setEmployees((prev) => [emp, ...prev])
                    appendAuditLog({
                      category: 'users',
                      action: 'Alta de empleado',
                      detail: `${emp.fullName} (${emp.employeeCode}) · ${
                        isEmployeeSystemUser(emp)
                          ? `Usuario del sistema · Roles: ${(emp.roles || []).join(', ')}`
                          : 'Solo empleado (sin acceso)'
                      }`,
                      user: activeSessionProfile.name,
                    })
                  }}
                  onUpdateEmployee={(updated) => {
                    setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
                    appendAuditLog({
                      category: 'users',
                      action: 'Actualización de empleado y acceso',
                      detail: `${updated.fullName} (${updated.employeeCode}) · ${
                        isEmployeeSystemUser(updated)
                          ? `Usuario del sistema · Roles: ${(updated.roles || []).join(', ')}`
                          : 'Solo empleado (sin acceso)'
                      }`,
                      user: activeSessionProfile.name,
                    })
                  }}
                  onDeleteEmployee={
                    canDeleteInSection(
                      'CRM',
                      'Empleados',
                      activeSectionAccess,
                      isFullAdmin,
                      activeSessionProfile.isActive
                    )
                      ? (employeeId) => {
                          const target = employees.find((e) => e.id === employeeId)
                          setEmployees((prev) => prev.filter((e) => e.id !== employeeId))
                          if (target) {
                            appendAuditLog({
                              category: 'users',
                              action: 'Eliminación de empleado',
                              detail: `${target.fullName} (${target.employeeCode})`,
                              user: activeSessionProfile.name,
                            })
                            setNotice(`Empleado “${target.fullName}” eliminado del directorio.`)
                            toast.info(
                              `Empleado “${target.fullName}” eliminado del directorio.`,
                              'Empleado eliminado'
                            )
                          }
                        }
                      : undefined
                  }
                  onNavigateSettingsRoles={
                    canAccessSection(
                      'Configuración',
                      'Roles y permisos',
                      activeCapabilities,
                      isFullAdmin,
                      activeSessionProfile.isActive,
                      activeSectionAccess
                    )
                      ? () => navigateToSettingSection('Roles y permisos')
                      : undefined
                  }
                />
              ) : crmSection === 'Nómina' ? (
                <CrmPayroll
                  employees={employees}
                  payrollRuns={payrollRuns}
                  bankAccounts={bankAccounts}
                  onAddPayrollRun={(run) => setPayrollRuns((prev) => [run, ...prev])}
                  onUpdatePayrollRun={(updated) =>
                    setPayrollRuns((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
                  }
                  onDeletePayrollRun={
                    canDeleteInSection(
                      'CRM',
                      'Nómina',
                      activeSectionAccess,
                      isFullAdmin,
                      activeSessionProfile.isActive
                    )
                      ? (runId) => {
                          const target = payrollRuns.find((r) => r.id === runId)
                          setPayrollRuns((prev) => prev.filter((r) => r.id !== runId))
                          if (target) {
                            appendAuditLog({
                              category: 'finance',
                              action: 'Eliminación de periodo de nómina',
                              detail: `${target.folio} · ${target.periodLabel}`,
                              user: activeSessionProfile.name,
                            })
                            setNotice(`Periodo de nómina ${target.folio} eliminado.`)
                            toast.info(
                              `Periodo de nómina ${target.folio} eliminado.`,
                              'Nómina eliminada'
                            )
                          }
                        }
                      : undefined
                  }
                  onPayPayrollRun={handlePayPayrollRun}
                  onOpenEbpWizard={openEbpWizardForPayrollRun}
                />
              ) : crmSection === 'Oportunidades' ? <>
                <div className="crm-section-heading"><div><div className="panel-kicker">SEGUIMIENTO COMERCIAL</div><h2>Oportunidades</h2><p>Da seguimiento a las conversaciones que pueden convertirse en negocio.</p></div><div className="crm-section-heading-actions">{canCreateInSection('CRM', 'Oportunidades', activeSectionAccess, isFullAdmin, activeSessionProfile.isActive) && <button className="button button-primary" onClick={() => openCreate('opportunity')}><Plus size={15} /> Nueva oportunidad</button>}<span className="demo-pill"><i /> DATOS DEMO</span></div></div>
                <div className="opportunity-summary"><article><span className="kpi-icon"><Target size={17} /></span><div><strong>{opportunityRecords.length}</strong><small>Abiertas</small></div></article><article><span className="kpi-icon icon-sand"><BriefcaseBusiness size={17} /></span><div><strong>{money(opportunityRecords.reduce((total, opportunity) => total + opportunity.value, 0))}</strong><small>Valor del pipeline</small></div></article><article><span className="kpi-icon icon-green"><ArrowUpRight size={17} /></span><div><strong>32%</strong><small>Tasa de conversión</small></div></article></div>
                <div className="opportunities-board"><div className="opportunities-board-heading"><h3>Pipeline reciente</h3>{canCreateInSection('CRM', 'Oportunidades', activeSectionAccess, isFullAdmin, activeSessionProfile.isActive) && <button className="button button-secondary" onClick={() => openCreate('opportunity')}><Plus size={14} /> Nueva oportunidad</button>}</div><div className="opportunities-list">{opportunityRecords.map((opportunity, oppIdx) => <article className="opportunity-row" key={`${opportunity.company}-${opportunity.date}-${oppIdx}`}><div className={`company-avatar ${opportunity.color}`}>{opportunity.initials}</div><div className="opportunity-main"><strong>{opportunity.company}</strong><span>{opportunity.person}</span></div><span className={`stage-badge stage-${opportunity.stageTone}`}><i />{opportunity.stage}</span><strong className="opportunity-value">{money(opportunity.value)}</strong><span className="date-cell">{opportunity.date}</span>{canEditInSection('CRM', 'Oportunidades', activeSectionAccess, isFullAdmin, activeSessionProfile.isActive) && <button className="button-icon-action" aria-label={`Editar oportunidad ${opportunity.company}`} title="Editar o eliminar oportunidad" onClick={() => { setConfirmDeleteOpp(false); setEditingOpportunity({ index: oppIdx, company: opportunity.company, person: opportunity.person, value: String(opportunity.value), stage: opportunity.stage, date: opportunity.date }) }}><Edit3 size={12} /> Editar</button>}</article>)}</div></div>
              </> : crmSection === 'Actividades' ? <>
                <div className="crm-section-heading"><div><div className="panel-kicker">AGENDA COMERCIAL</div><h2>Actividades</h2><p>Reúne llamadas, seguimientos y tareas para que ninguna conversación se quede atrás.</p></div><div className="crm-section-heading-actions">{canCreateInSection('CRM', 'Actividades', activeSectionAccess, isFullAdmin, activeSessionProfile.isActive) && <button className="button button-primary" onClick={() => openCreate('activity')}><Plus size={15} /> Nueva actividad</button>}<span className="demo-pill"><i /> DATOS DEMO</span></div></div>
                <div className="activities-layout"><div className="activities-card"><div className="activities-card-heading"><div><h3>Hoy · 06 de noviembre</h3><p>Tu agenda de seguimiento</p></div>{canCreateInSection('CRM', 'Actividades', activeSectionAccess, isFullAdmin, activeSessionProfile.isActive) && <button className="button button-secondary" onClick={() => openCreate('activity')}><Plus size={14} /> Nueva actividad</button>}</div><div className="activities-list">{activityRecords.map((activity, actIdx) => <article className="activity-item" key={`${activity.title}-${activity.time}-${actIdx}`}><div className={`activity-icon tone-${activity.tone}`}>{activity.icon === 'send' ? <ArrowRight size={15} /> : activity.icon === 'phone' ? <Clock3 size={15} /> : <Users size={15} />}</div><div className="activity-item-copy"><strong>{activity.title}</strong><span>{activity.company}</span></div><time>{activity.time}</time>{canEditInSection('CRM', 'Actividades', activeSectionAccess, isFullAdmin, activeSessionProfile.isActive) && <button className="button-icon-action" aria-label={`Editar actividad ${activity.title}`} title="Editar o eliminar actividad" onClick={() => { setConfirmDeleteAct(false); setEditingActivity({ index: actIdx, title: activity.title, company: activity.company, time: activity.time, icon: activity.icon, tone: (activity.tone as 'blue' | 'amber' | 'green') || 'green' }) }}><Edit3 size={12} /> Editar</button>}</article>)}</div></div><aside className="activities-side"><span className="kpi-icon"><CalendarDays size={17} /></span><strong>{activityRecords.length + 5} actividades</strong><p>programadas esta semana</p><button className="text-link" onClick={() => { setNotice('La agenda completa estará disponible en la siguiente iteración.'); toast.info('La agenda completa estará disponible en la siguiente iteración.', 'Agenda') }}>Ver calendario <ArrowRight size={13} /></button></aside></div>
              </> : crmSection === 'Clientes' || crmSection === 'Proveedores' ? <>
                <div className="crm-section-heading"><div><div className="panel-kicker">DIRECTORIO COMERCIAL</div><h2>{crmSection}</h2><p>{crmSection === 'Clientes' ? 'Personas y empresas con una relación comercial en tu espacio.' : 'Empresas y contactos que suministran productos o servicios a tu organización.'}</p></div><div className="crm-section-heading-actions">{canCreateInSection('CRM', crmSection, activeSectionAccess, isFullAdmin, activeSessionProfile.isActive) && (crmSection === 'Clientes' ? <button className="button button-primary" onClick={() => openCreate('client')}><Plus size={15} /> Nuevo cliente</button> : <button className="button button-primary" onClick={() => openCreate('supplier')}><Plus size={15} /> Nuevo proveedor</button>)}<span className="demo-pill"><i /> DATOS DEMO</span></div></div>
                <div className="clients-toolbar"><label className="clients-search"><Search size={15} /><input aria-label="Buscar clientes" value={clientQuery} onChange={(event) => setClientQuery(event.target.value)} placeholder="Buscar por código, nombre, empresa, correo o RFC" /></label><select aria-label="Filtrar clientes por estado" value={clientStatus} onChange={(event) => setClientStatus(event.target.value)}><option>Todos</option><option>Activo</option><option>Prospecto</option><option>Inactivo</option></select></div>
                <div className="clients-summary"><span><strong>{filteredDirectory.length}</strong> de {crmSection === 'Clientes' ? clientRecords.length : supplierRecords.length} registros visibles</span><span>Última actualización: hace unos momentos</span></div>
                <div className="clients-table-wrap"><table className="clients-table"><thead><tr><th>{crmSection === 'Clientes' ? 'CLIENTE / EMPRESA' : 'PROVEEDOR'}</th><th>CONTACTO</th><th>ESTADO</th><th>ÚLTIMA ACTIVIDAD</th><th style={{ textAlign: 'right' }}>ACCIONES</th></tr></thead><tbody>{filteredDirectory.map((client) => {
  const countryObj = findCountry(client.country)
  return (
    <tr key={client.email}>
      <td>
        <div className="company-cell">
          <div className={`company-avatar ${client.color}`}>{client.initials}</div>
          <div>
            <div className="emp-name-row">
              <strong>{client.company}</strong>
              {(crmSection === 'Clientes' ? client.clientCode : client.supplierCode) && (
                <span className="emp-code-pill">
                  {crmSection === 'Clientes' ? client.clientCode : client.supplierCode}
                </span>
              )}
            </div>
            <span>
              {client.name} {client.rfc ? `· ${client.rfc}` : ''}
              {countryObj && (
                <>
                  {' · '}
                  <CountryFlag
                    code={countryObj.code}
                    className="d2-flag-icon"
                    style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4, width: 14, height: 10 }}
                  />
                  {countryObj.name}
                </>
              )}
            </span>
            {client.addresses && client.addresses.length > 0 && (
              <span className="client-address-snippet">
                <MapPin size={10} className="address-pin-icon" />
                <span>
                  {client.addresses[0].street ? `${client.addresses[0].street}, ` : ''}
                  {client.addresses[0].city || client.addresses[0].state || ''}
                </span>
                {client.addresses[0].isShipping && <span className="address-mini-tag shipping">Envío</span>}
                {client.addresses[0].isBilling && <span className="address-mini-tag billing">Facturación</span>}
                {client.addresses.length > 1 && <span className="address-more-tag">+{client.addresses.length - 1}</span>}
              </span>
            )}
            {crmSection === 'Proveedores' && client.clabe && (
              <span className="client-address-snippet mono" style={{ marginTop: 2 }}>
                <span>{client.bankName || 'Banco'} · CLABE {client.clabe}</span>
              </span>
            )}
          </div>
        </div>
      </td>
      <td><div className="client-contact"><span>{client.email}</span><small>{client.phone}</small></div></td>
      <td><span className={`client-status status-${client.status.toLowerCase()}`}><i />{client.status}</span></td>
      <td className="date-cell">{client.lastActivity}</td>
      <td style={{ textAlign: 'right' }}>
        <div className="emp-row-actions">
          <button
            type="button"
            className="button-icon-action"
            onClick={() =>
              setDetailDirectory({
                kind: crmSection === 'Proveedores' ? 'supplier' : 'client',
                record: client,
              })
            }
            title={`Ver ficha completa del ${crmSection === 'Proveedores' ? 'proveedor' : 'cliente'}`}
          >
            <Eye size={12} /> Ficha
          </button>
          {canEditInSection(
            'CRM',
            crmSection,
            activeSectionAccess,
            isFullAdmin,
            activeSessionProfile.isActive
          ) &&
            (crmSection === 'Proveedores' ? (
              <>
                <button
                  type="button"
                  className="button-icon-action"
                  onClick={() =>
                    setEditingDirectory({
                      kind: 'supplier',
                      originalEmail: client.email,
                      originalCompany: client.company,
                      record: JSON.parse(JSON.stringify(client)),
                    })
                  }
                  title="Editar datos del proveedor"
                >
                  <Edit3 size={12} /> Editar
                </button>
                <button
                  type="button"
                  className="button-icon-action"
                  onClick={() => setEditingSupplierBank(JSON.parse(JSON.stringify(client)))}
                  title="Configurar datos bancarios y packs EBP del proveedor"
                >
                  <Landmark size={12} /> Datos bancarios
                </button>
              </>
            ) : (
              <button
                type="button"
                className="button-icon-action"
                onClick={() =>
                  setEditingDirectory({
                    kind: 'client',
                    originalEmail: client.email,
                    originalCompany: client.company,
                    record: JSON.parse(JSON.stringify(client)),
                  })
                }
                title="Editar datos del cliente"
              >
                <Edit3 size={12} /> Editar
              </button>
            ))}
        </div>
      </td>
    </tr>
  )
})}</tbody></table>{filteredDirectory.length === 0 && <div className="clients-empty"><Users size={20} /><strong>No encontramos {crmSection.toLowerCase()}</strong><span>Prueba con otro nombre, empresa o estado.</span></div>}</div>
              </> : (
                <div className="crm-overview-grid">
                  {canAccessSection('CRM', 'Clientes', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                    <article className="crm-overview-card crm-overview-highlight">
                      <span className="kpi-icon"><Users size={17} /></span>
                      <div>
                        <strong>{clientRecords.length}</strong>
                        <span>
                          Clientes y prospectos · {clientRecords.filter((c) => c.status === 'Activo').length} activos
                        </span>
                      </div>
                      <button className="text-link" onClick={() => navigateToCrmSection('Clientes')}>
                        Ver clientes <ArrowRight size={13} />
                      </button>
                    </article>
                  )}

                  {canAccessSection('CRM', 'Proveedores', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                    <article className="crm-overview-card">
                      <span className="kpi-icon icon-blue"><BriefcaseBusiness size={17} /></span>
                      <div>
                        <strong>{supplierRecords.length}</strong>
                        <span>
                          Proveedores registrados · {supplierRecords.filter((s) => Boolean(s.clabe)).length} con CLABE EBP
                        </span>
                      </div>
                      <button className="text-link" onClick={() => navigateToCrmSection('Proveedores')}>
                        Ver proveedores <ArrowRight size={13} />
                      </button>
                    </article>
                  )}

                  {canAccessSection('CRM', 'Empleados', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                    <article className="crm-overview-card">
                      <span className="kpi-icon icon-green"><Users size={17} /></span>
                      <div>
                        <strong>{employees.filter((e) => e.status === 'Activo').length}</strong>
                        <span>Empleados activos de {employees.length} registrados</span>
                      </div>
                      <button className="text-link" onClick={() => navigateToCrmSection('Empleados')}>
                        Ver empleados <ArrowRight size={13} />
                      </button>
                    </article>
                  )}

                  {canAccessSection('CRM', 'Nómina', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                    <article className="crm-overview-card">
                      <span className="kpi-icon icon-amber"><WalletCards size={17} /></span>
                      <div>
                        <strong>{payrollRuns.length}</strong>
                        <span>
                          Periodos de nómina · {money(payrollRuns.reduce((sum, r) => sum + r.totalNet, 0))} neto
                        </span>
                      </div>
                      <button className="text-link" onClick={() => navigateToCrmSection('Nómina')}>
                        Ver nómina <ArrowRight size={13} />
                      </button>
                    </article>
                  )}

                  {canAccessSection('CRM', 'Oportunidades', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                    <article className="crm-overview-card">
                      <span className="kpi-icon icon-lilac"><Target size={17} /></span>
                      <div>
                        <strong>{opportunityRecords.length}</strong>
                        <span>
                          Oportunidades abiertas · {money(opportunityRecords.reduce((sum, o) => sum + o.value, 0))}
                        </span>
                      </div>
                      <button className="text-link" onClick={() => navigateToCrmSection('Oportunidades')}>
                        Ver pipeline <ArrowRight size={13} />
                      </button>
                    </article>
                  )}

                  {canAccessSection('CRM', 'Actividades', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                    <article className="crm-overview-card">
                      <span className="kpi-icon icon-sand"><Clock3 size={17} /></span>
                      <div>
                        <strong>{activityRecords.length}</strong>
                        <span>Actividades programadas esta semana</span>
                      </div>
                      <button className="text-link" onClick={() => navigateToCrmSection('Actividades')}>
                        Ver agenda <ArrowRight size={13} />
                      </button>
                    </article>
                  )}
                </div>
              )}
            </section>
          ) : activePage === 'Ventas' ? (
            <section className="crm-page sales-page" aria-labelledby="sales-title">
              <div className="crm-heading">
                <div>
                  <div className="eyebrow"><span className="eyebrow-line" /> AES NEXUS · H2 PILOTO COMERCIAL</div>
                  <h1 id="sales-title">{t('module.sales.title')}</h1>
                  <p>{t('module.sales.subtitle')}</p>
                </div>
              </div>
              {notice && <div className="notice" role="status">{notice}<button aria-label={t('common.close')} onClick={() => setNotice('')}><X size={15} /></button></div>}
              <nav className="crm-tabs" aria-label="Secciones de Ventas">
                {canAccessSection('Ventas', 'Catálogo', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                  <button
                    className={salesSection === 'Catálogo' ? 'active' : ''}
                    onClick={() => navigateToSalesSection('Catálogo')}
                  >
                    {t('tabs.sales.catalog')}
                  </button>
                )}
                {canAccessSection('Ventas', 'Cotizaciones', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                  <button
                    className={salesSection === 'Cotizaciones' ? 'active' : ''}
                    onClick={() => navigateToSalesSection('Cotizaciones')}
                  >
                    {t('tabs.sales.quotes')} <span>{quotes.length}</span>
                  </button>
                )}
                {canAccessSection('Ventas', 'Pedidos', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                  <button
                    className={salesSection === 'Pedidos' ? 'active' : ''}
                    onClick={() => navigateToSalesSection('Pedidos')}
                  >
                    {t('tabs.sales.orders')} <span>{orders.length}</span>
                  </button>
                )}
                {canAccessSection('Ventas', 'Facturas', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                  <button
                    className={salesSection === 'Facturas' ? 'active' : ''}
                    onClick={() => navigateToSalesSection('Facturas')}
                  >
                    {t('tabs.sales.invoices')} <span>{receivables.length}</span>
                  </button>
                )}
                {canAccessSection('Ventas', 'Devoluciones', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                  <button
                    className={salesSection === 'Devoluciones' ? 'active' : ''}
                    onClick={() => navigateToSalesSection('Devoluciones')}
                  >
                    {t('tabs.sales.returns')} <span>{customerReturns.length}</span>
                  </button>
                )}
                {canAccessSection('Ventas', 'Resumen', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                  <button
                    className={salesSection === 'Resumen' ? 'active' : ''}
                    onClick={() => navigateToSalesSection('Resumen')}
                  >
                    {t('tabs.sales.summary')}
                  </button>
                )}
              </nav>

              {salesSection === 'Catálogo' ? (
                <ProductsAndServices
                  canDelete={canDeleteInSection(
                    'Ventas',
                    'Catálogo',
                    activeSectionAccess,
                    isFullAdmin,
                    activeSessionProfile.isActive
                  )}
                  onItemDeleted={(item) => {
                    appendAuditLog({
                      category: 'sales',
                      action: 'Eliminación de artículo del catálogo',
                      detail: `${item.sku} · ${item.name}`,
                      user: activeSessionProfile.name,
                    })
                    setNotice(`Artículo “${item.name}” eliminado del catálogo.`)
                  }}
                />
              ) : salesSection === 'Cotizaciones' ? (
                <QuotesSection
                  quotes={quotes}
                  onUpdateQuotes={setQuotes}
                  onConvertToOrder={handleConvertToOrder}
                  onDeleteQuote={
                    canDeleteInSection(
                      'Ventas',
                      'Cotizaciones',
                      activeSectionAccess,
                      isFullAdmin,
                      activeSessionProfile.isActive
                    )
                      ? (quoteId) => {
                          const target = quotes.find((q) => q.id === quoteId)
                          setQuotes((prev) => prev.filter((q) => q.id !== quoteId))
                          if (target) {
                            appendAuditLog({
                              category: 'sales',
                              action: 'Eliminación de cotización',
                              detail: `${target.folio} · ${target.clientCompany}`,
                              user: activeSessionProfile.name,
                            })
                            setNotice(`Cotización ${target.folio} eliminada.`)
                            toast.info(`La cotización ${target.folio} fue eliminada.`, 'Cotización eliminada')
                          }
                        }
                      : undefined
                  }
                  clientNames={clientRecords.map((c, idx) => ({
                    id: `cli_${idx}_${c.company.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
                    name: c.name,
                    company: c.company,
                    email: c.email,
                    address: c.addresses?.[0]
                      ? `${c.addresses[0].street || ''}, ${c.addresses[0].city || ''}`
                      : undefined,
                  }))}
                />
              ) : salesSection === 'Pedidos' ? (
                <OrdersSection
                  orders={orders}
                  onUpdateOrders={setOrders}
                  onDeleteOrder={
                    canDeleteInSection(
                      'Ventas',
                      'Pedidos',
                      activeSectionAccess,
                      isFullAdmin,
                      activeSessionProfile.isActive
                    )
                      ? (orderId) => {
                          const target = orders.find((o) => o.id === orderId)
                          setOrders((prev) => prev.filter((o) => o.id !== orderId))
                          if (target) {
                            appendAuditLog({
                              category: 'sales',
                              action: 'Eliminación de pedido de venta',
                              detail: `${target.folio} · ${target.clientCompany}`,
                              user: activeSessionProfile.name,
                            })
                            setNotice(`Pedido ${target.folio} eliminado.`)
                            toast.info(`El pedido ${target.folio} fue eliminado.`, 'Pedido eliminado')
                          }
                        }
                      : undefined
                  }
                  receivables={receivables}
                  onInvoiceOrder={(ord) => {
                    setPresetOrderToInvoice(ord)
                    navigateToSalesSection('Facturas')
                  }}
                  onViewInvoice={(inv) => {
                    setPresetInvoiceIdToView(inv.id)
                    navigateToSalesSection('Facturas')
                  }}
                  presetOrderFolioToView={presetOrderFolioToView}
                  onClearPresetOrderView={() => setPresetOrderFolioToView(null)}
                  clientNames={clientRecords.map((c, idx) => ({
                    id: `cli_${idx}_${c.company.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
                    name: c.name,
                    company: c.company,
                    email: c.email,
                    address: c.addresses?.[0]
                      ? `${c.addresses[0].street || ''}, ${c.addresses[0].city || ''}`
                      : undefined,
                  }))}
                />
              ) : salesSection === 'Facturas' ? (
                <SalesInvoices
                  receivables={receivables}
                  orders={orders}
                  clientsList={clientRecords.map((c) => ({
                    company: c.company,
                    name: c.name,
                    email: c.email,
                    rfc: c.rfc,
                    paymentTerms: c.paymentTerms,
                    currency: c.currency,
                  }))}
                  presetOrderToInvoice={presetOrderToInvoice}
                  onClearPresetOrder={() => setPresetOrderToInvoice(null)}
                  presetInvoiceIdToView={presetInvoiceIdToView}
                  onClearPresetInvoiceView={() => setPresetInvoiceIdToView(null)}
                  onCreateInvoice={handleCreateSalesInvoice}
                  onDeleteInvoice={
                    canDeleteInSection(
                      'Ventas',
                      'Facturas',
                      activeSectionAccess,
                      isFullAdmin,
                      activeSessionProfile.isActive
                    )
                      ? (invoiceId) => {
                          const target = receivables.find((r) => r.id === invoiceId)
                          setReceivables((prev) => prev.filter((r) => r.id !== invoiceId))
                          if (target) {
                            setOrders((prevOrders) =>
                              prevOrders.map((ord) => ({
                                ...ord,
                                invoiceIds: ord.invoiceIds?.filter((id) => id !== target.id),
                                invoiceFolios: ord.invoiceFolios?.filter((f) => f !== target.folio),
                              }))
                            )
                            appendAuditLog({
                              category: 'sales',
                              action: 'Eliminación de factura de venta',
                              detail: `${target.folio} · ${target.clientCompany}`,
                              user: activeSessionProfile.name,
                            })
                            setNotice(`Factura ${target.folio} eliminada.`)
                            toast.info(`Factura ${target.folio} eliminada.`, 'Factura eliminada')
                          }
                        }
                      : undefined
                  }
                  onNavigateToFinanceReceivables={() => navigateToFinanceSection('Cobros')}
                  onNavigateToOrder={(orderFolio) => {
                    setPresetOrderFolioToView(orderFolio)
                    navigateToSalesSection('Pedidos')
                  }}
                />
              ) : salesSection === 'Devoluciones' ? (
                <SalesReturnsSection
                  returns={customerReturns}
                  orders={orders}
                  receivables={receivables}
                  warehouses={warehouses}
                  catalogProducts={initialProductsAndServices.map((p) => ({
                    id: p.id,
                    sku: p.sku,
                    name: p.name,
                    price: p.unitPrice ?? 0,
                    taxRate: p.taxRate,
                    unitOfMeasure: p.unitOfMeasure,
                  }))}
                  currentUserName={activeSessionProfile.name}
                  userRoleIds={activeSessionProfile.roles}
                  isFullAdmin={isFullAdmin}
                  workflowConfig={returnWorkflows.customer}
                  canCreate={canCreateInSection(
                    'Ventas',
                    'Devoluciones',
                    activeSectionAccess,
                    isFullAdmin,
                    activeSessionProfile.isActive
                  )}
                  canEdit={canEditInSection(
                    'Ventas',
                    'Devoluciones',
                    activeSectionAccess,
                    isFullAdmin,
                    activeSessionProfile.isActive
                  )}
                  onCreateReturn={handleCreateCustomerReturn}
                  onAdvanceReturnStatus={handleAdvanceCustomerReturn}
                  onRequestApproval={handleRequestCustomerReturnApproval}
                  onApproveTransition={handleApproveCustomerReturnTransition}
                  onRejectApproval={handleRejectCustomerReturnApproval}
                  onUpdateReturnNotes={handleUpdateCustomerReturnDetails}
                  onDeleteReturn={
                    canDeleteInSection(
                      'Ventas',
                      'Devoluciones',
                      activeSectionAccess,
                      isFullAdmin,
                      activeSessionProfile.isActive
                    )
                      ? handleDeleteCustomerReturn
                      : undefined
                  }
                  onNavigateFinanceReceivables={() => navigateToFinanceSection('Cobros')}
                  onNavigateOperationsInventory={() => navigateToOperationsSection('Inventario')}
                  onConfigureWorkflow={
                    canAccessSection(
                      'Administración',
                      'Flujos de devoluciones',
                      activeCapabilities,
                      isFullAdmin,
                      activeSessionProfile.isActive,
                      activeSectionAccess
                    )
                      ? () => navigateToAdminSection('Flujos de devoluciones')
                      : undefined
                  }
                />
              ) : (
                <SalesOverview
                  quotes={quotes}
                  orders={orders}
                  receivables={receivables}
                  products={initialProductsAndServices}
                  onNavigateSection={(sec) => navigateToSalesSection(sec)}
                  onOpenNewQuote={() => navigateToSalesSection('Cotizaciones')}
                  onOpenNewOrder={() => navigateToSalesSection('Pedidos')}
                />
              )}
            </section>
          ) : activePage === 'Compras' ? (
            <section className="crm-page sales-page" aria-labelledby="purchases-title">
              <div className="crm-heading">
                <div>
                  <div className="eyebrow"><span className="eyebrow-line" /> AES NEXUS · COMPRAS Y ABASTECIMIENTO</div>
                  <h1 id="purchases-title">{t('module.purchases.title')}</h1>
                  <p>{t('module.purchases.subtitle')}</p>
                </div>
              </div>

              <section className="purchases-top-kpi-strip" aria-label="Indicadores clave de compras">
                {(() => {
                  const canGoOrders = canAccessSection('Compras', 'Órdenes de compra', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess)
                  const canGoInvoices = canAccessSection('Compras', 'Facturas', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess)
                  const canGoReceptions = canAccessSection('Compras', 'Recepciones', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess)

                  const OrderWrap = canGoOrders ? 'button' : 'div'
                  const InvoiceWrap = canGoInvoices ? 'button' : 'div'
                  const ReceptionWrap = canGoReceptions ? 'button' : 'div'

                  return (
                    <>
                      <OrderWrap
                        {...(canGoOrders
                          ? {
                              type: 'button' as const,
                              onClick: () => navigateToPurchasesSection('Órdenes de compra'),
                            }
                          : {})}
                        className={`purchases-top-kpi-item ${canGoOrders ? 'is-interactive' : ''}`}
                      >
                        <div className="purchases-top-kpi-head">
                          <span>Órdenes del mes actual</span>
                          <ShoppingCart size={14} className="purchases-top-kpi-icon" aria-hidden="true" />
                        </div>
                        <div className="purchases-top-kpi-value tabular-nums">
                          {purchasesTopKpis.monthlyOrdersCount}{' '}
                          <small>{purchasesTopKpis.monthlyOrdersCount === 1 ? 'orden' : 'órdenes'}</small>
                        </div>
                        <div className="purchases-top-kpi-sub tabular-nums">
                          <span>{purchasesTopKpis.monthLabel}</span>
                          <span aria-hidden="true">·</span>
                          <span>{money(purchasesTopKpis.monthlyOrdersTotal)} comprometido</span>
                        </div>
                      </OrderWrap>

                      <InvoiceWrap
                        {...(canGoInvoices
                          ? {
                              type: 'button' as const,
                              onClick: () => navigateToPurchasesSection('Facturas'),
                            }
                          : {})}
                        className={`purchases-top-kpi-item ${canGoInvoices ? 'is-interactive' : ''}`}
                      >
                        <div className="purchases-top-kpi-head">
                          <span>Valor en facturas recibidas</span>
                          <Receipt size={14} className="purchases-top-kpi-icon" aria-hidden="true" />
                        </div>
                        <div className="purchases-top-kpi-value tabular-nums">
                          {money(purchasesTopKpis.receivedInvoicesTotal)}
                        </div>
                        <div className="purchases-top-kpi-sub tabular-nums">
                          <span>
                            {purchasesTopKpis.receivedInvoicesCount}{' '}
                            {purchasesTopKpis.receivedInvoicesCount === 1 ? 'factura' : 'facturas'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>Saldo {money(purchasesTopKpis.receivedInvoicesPending)}</span>
                        </div>
                      </InvoiceWrap>

                      <ReceptionWrap
                        {...(canGoReceptions
                          ? {
                              type: 'button' as const,
                              onClick: () => navigateToPurchasesSection('Recepciones'),
                            }
                          : {})}
                        className={`purchases-top-kpi-item ${canGoReceptions ? 'is-interactive' : ''} ${
                          purchasesTopKpis.pendingDeliveryCount > 0 ? 'has-pending' : ''
                        }`}
                      >
                        <div className="purchases-top-kpi-head">
                          <span>Órdenes con entregas pendientes</span>
                          <Truck size={14} className="purchases-top-kpi-icon" aria-hidden="true" />
                        </div>
                        <div className="purchases-top-kpi-value tabular-nums">
                          {purchasesTopKpis.pendingDeliveryCount}{' '}
                          <small>{purchasesTopKpis.pendingDeliveryCount === 1 ? 'orden' : 'órdenes'}</small>
                        </div>
                        <div className="purchases-top-kpi-sub tabular-nums">
                          <span>
                            {purchasesTopKpis.pendingDeliveryCount > 0
                              ? `${purchasesTopKpis.pendingDeliveryUnits} u. por recibir`
                              : 'Todas entregadas'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {purchasesTopKpis.pendingDeliveryCount > 0 ? 'En tránsito / andén' : 'Al día'}
                          </span>
                        </div>
                      </ReceptionWrap>
                    </>
                  )
                })()}
              </section>

              <nav className="crm-tabs" aria-label="Secciones de Compras">
                {canAccessSection('Compras', 'Resumen', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                  <button
                    className={purchasesSection === 'Resumen' ? 'active' : ''}
                    onClick={() => navigateToPurchasesSection('Resumen')}
                  >
                    {t('tabs.purchases.summary')}
                  </button>
                )}
                {canAccessSection('Compras', 'Requisiciones', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                  <button
                    className={purchasesSection === 'Requisiciones' ? 'active' : ''}
                    onClick={() => navigateToPurchasesSection('Requisiciones')}
                  >
                    {t('tabs.purchases.requisitions')} <span>{requisitions.length}</span>
                  </button>
                )}
                {canAccessSection('Compras', 'Órdenes de compra', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                  <button
                    className={purchasesSection === 'Órdenes de compra' ? 'active' : ''}
                    onClick={() => navigateToPurchasesSection('Órdenes de compra')}
                  >
                    {t('tabs.purchases.orders')} <span>{purchaseOrders.length}</span>
                  </button>
                )}
                {canAccessSection('Compras', 'Recepciones', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                  <button
                    className={purchasesSection === 'Recepciones' ? 'active' : ''}
                    onClick={() => navigateToPurchasesSection('Recepciones')}
                  >
                    {t('tabs.purchases.receptions')} <span>{purchaseOrders.filter((po) => po.status === 'Emitida' || po.status === 'Recepción parcial').length}</span>
                  </button>
                )}
                {canAccessSection('Compras', 'Facturas', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                  <button
                    className={purchasesSection === 'Facturas' ? 'active' : ''}
                    onClick={() => navigateToPurchasesSection('Facturas')}
                  >
                    {t('tabs.purchases.invoices')} <span>{payables.length}</span>
                  </button>
                )}
                {canAccessSection('Compras', 'Devoluciones', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                  <button
                    className={purchasesSection === 'Devoluciones' ? 'active' : ''}
                    onClick={() => navigateToPurchasesSection('Devoluciones')}
                  >
                    {t('tabs.purchases.returns')} <span>{supplierReturns.length}</span>
                  </button>
                )}
              </nav>

              {purchasesSection === 'Requisiciones' ? (
                <PurchasesRequisitions
                  requisitions={requisitions}
                  warehouses={warehouses}
                  inventory={effectiveInventory}
                  catalogProducts={initialProductsAndServices.map((p) => ({
                    id: p.id,
                    sku: p.sku,
                    name: p.name,
                    cost: p.cost ?? 0,
                    unitOfMeasure: p.unitOfMeasure,
                  }))}
                  suppliers={supplierRecords.map((s) => ({
                    name: s.name,
                    company: s.company,
                    email: s.email,
                  }))}
                  departments={departments.map((d) => d.name)}
                  currentUserName={activeSessionProfile.name}
                  canApprovePurchases={
                    isFullAdmin ||
                    (activeCapabilities.has('approvePurchases') &&
                      canEditInSection(
                        'Compras',
                        'Requisiciones',
                        activeSectionAccess,
                        isFullAdmin,
                        activeSessionProfile.isActive
                      ))
                  }
                  onCreateRequisition={handleCreateRequisition}
                  onUpdateRequisitionStatus={handleUpdateRequisitionStatus}
                  onConvertToPurchaseOrder={handleConvertRequisitionToPo}
                  onDeleteRequisition={
                    canDeleteInSection(
                      'Compras',
                      'Requisiciones',
                      activeSectionAccess,
                      isFullAdmin,
                      activeSessionProfile.isActive
                    )
                      ? (reqId) => {
                          const target = requisitions.find((r) => r.id === reqId)
                          setRequisitions((prev) => prev.filter((r) => r.id !== reqId))
                          if (target) {
                            appendAuditLog({
                              category: 'inventory',
                              action: 'Eliminación de requisición de compra',
                              detail: `${target.folio} · ${target.department}`,
                              user: activeSessionProfile.name,
                            })
                            setNotice(`Requisición ${target.folio} eliminada.`)
                            toast.info(`Requisición ${target.folio} eliminada.`, 'Requisición eliminada')
                          }
                        }
                      : undefined
                  }
                  onNavigateToOrder={() => navigateToPurchasesSection('Órdenes de compra')}
                />
              ) : purchasesSection === 'Órdenes de compra' ? (
                <OperationsPurchases
                  purchaseOrders={purchaseOrders}
                  warehouses={warehouses}
                  suppliers={supplierRecords.map((s) => ({
                    name: s.name,
                    company: s.company,
                    email: s.email,
                  }))}
                  catalogProducts={initialProductsAndServices.map((p) => ({
                    id: p.id,
                    sku: p.sku,
                    name: p.name,
                    cost: p.cost ?? 0,
                    unitOfMeasure: p.unitOfMeasure,
                  }))}
                  onUpdatePurchaseOrders={setPurchaseOrders}
                  onUpdateInventory={setInventory}
                  inventory={inventory}
                  onAddMovement={handleAddMovement}
                  movementsCount={movements.length}
                  payables={payables}
                  onRegisterSupplierBillFromPO={handleRegisterSupplierBillFromPO}
                  onDeletePurchaseOrder={
                    canDeleteInSection(
                      'Compras',
                      'Órdenes de compra',
                      activeSectionAccess,
                      isFullAdmin,
                      activeSessionProfile.isActive
                    )
                      ? (poId) => {
                          const target = purchaseOrders.find((po) => po.id === poId)
                          setPurchaseOrders((prev) => prev.filter((po) => po.id !== poId))
                          if (target) {
                            appendAuditLog({
                              category: 'inventory',
                              action: 'Eliminación de orden de compra',
                              detail: `${target.folio} · ${target.supplierCompany}`,
                              user: activeSessionProfile.name,
                            })
                            setNotice(`Orden de compra ${target.folio} eliminada.`)
                            toast.info(`Orden de compra ${target.folio} eliminada.`, 'Orden eliminada')
                          }
                        }
                      : undefined
                  }
                  canApprovePurchases={
                    isFullAdmin ||
                    (activeCapabilities.has('approvePurchases') &&
                      canEditInSection(
                        'Compras',
                        'Órdenes de compra',
                        activeSectionAccess,
                        isFullAdmin,
                        activeSessionProfile.isActive
                      ))
                  }
                />
              ) : purchasesSection === 'Recepciones' ? (
                <PurchasesReceptions
                  purchaseOrders={purchaseOrders}
                  inventory={inventory}
                  movements={movements}
                  canReceiveGoods={
                    isFullAdmin ||
                    (activeCapabilities.has('receiveGoods') &&
                      canEditInSection(
                        'Compras',
                        'Recepciones',
                        activeSectionAccess,
                        isFullAdmin,
                        activeSessionProfile.isActive
                      ))
                  }
                  onUpdatePurchaseOrders={setPurchaseOrders}
                  onUpdateInventory={setInventory}
                  onAddMovement={handleAddMovement}
                />
              ) : purchasesSection === 'Facturas' ? (
                <PurchasesInvoices
                  payables={payables}
                  purchaseOrders={purchaseOrders}
                  suppliers={supplierRecords.map((s) => ({
                    name: s.name,
                    company: s.company,
                    email: s.email,
                  }))}
                  onCreateSupplierBill={handleCreateSupplierBill}
                  onDeleteSupplierBill={
                    canDeleteInSection(
                      'Compras',
                      'Facturas',
                      activeSectionAccess,
                      isFullAdmin,
                      activeSessionProfile.isActive
                    )
                      ? (billId) => {
                          const target = payables.find((b) => b.id === billId)
                          setPayables((prev) => prev.filter((b) => b.id !== billId))
                          if (target) {
                            appendAuditLog({
                              category: 'finance',
                              action: 'Eliminación de factura de proveedor (CxP)',
                              detail: `${target.folio} · ${target.supplierCompany}`,
                              user: activeSessionProfile.name,
                            })
                            setNotice(`Factura de proveedor ${target.folio} eliminada.`)
                            toast.info(`Factura ${target.folio} eliminada.`, 'Factura eliminada')
                          }
                        }
                      : undefined
                  }
                  onNavigateToFinancePayables={() => navigateToFinanceSection('Pagos')}
                  onOpenEbpBatchFromBills={openEbpWizardForVendorBills}
                />
              ) : purchasesSection === 'Devoluciones' ? (
                <PurchasesReturnsSection
                  returns={supplierReturns}
                  purchaseOrders={purchaseOrders}
                  payables={payables}
                  warehouses={warehouses}
                  catalogProducts={initialProductsAndServices.map((p) => ({
                    id: p.id,
                    sku: p.sku,
                    name: p.name,
                    cost: p.cost ?? 0,
                    unitOfMeasure: p.unitOfMeasure,
                  }))}
                  currentUserName={activeSessionProfile.name}
                  userRoleIds={activeSessionProfile.roles}
                  isFullAdmin={isFullAdmin}
                  workflowConfig={returnWorkflows.supplier}
                  canCreate={canCreateInSection(
                    'Compras',
                    'Devoluciones',
                    activeSectionAccess,
                    isFullAdmin,
                    activeSessionProfile.isActive
                  )}
                  canEdit={canEditInSection(
                    'Compras',
                    'Devoluciones',
                    activeSectionAccess,
                    isFullAdmin,
                    activeSessionProfile.isActive
                  )}
                  onCreateReturn={handleCreateSupplierReturn}
                  onAdvanceReturnStatus={handleAdvanceSupplierReturn}
                  onRequestApproval={handleRequestSupplierReturnApproval}
                  onApproveTransition={handleApproveSupplierReturnTransition}
                  onRejectApproval={handleRejectSupplierReturnApproval}
                  onUpdateReturnDetails={handleUpdateSupplierReturnDetails}
                  onDeleteReturn={
                    canDeleteInSection(
                      'Compras',
                      'Devoluciones',
                      activeSectionAccess,
                      isFullAdmin,
                      activeSessionProfile.isActive
                    )
                      ? handleDeleteSupplierReturn
                      : undefined
                  }
                  onNavigateFinancePayables={() => navigateToFinanceSection('Pagos')}
                  onNavigatePurchaseOrders={() => navigateToPurchasesSection('Órdenes de compra')}
                  onConfigureWorkflow={
                    canAccessSection(
                      'Administración',
                      'Flujos de devoluciones',
                      activeCapabilities,
                      isFullAdmin,
                      activeSessionProfile.isActive,
                      activeSectionAccess
                    )
                      ? () => navigateToAdminSection('Flujos de devoluciones')
                      : undefined
                  }
                />
              ) : (
                <PurchasesOverview
                  requisitions={requisitions}
                  purchaseOrders={purchaseOrders}
                  inventory={effectiveInventory}
                  payables={payables}
                  departments={departments.filter((d) => d.active).map((d) => d.name)}
                  onNavigateSection={(sec) => navigateToPurchasesSection(sec)}
                  onQuickReplenishFromStock={() => navigateToPurchasesSection('Requisiciones')}
                  onNavigateFinancePayables={() => navigateToFinanceSection('Pagos')}
                />
              )}
            </section>
          ) : activePage === 'Operaciones' ? (
            <section className="sales-page" aria-labelledby="operations-title">
              <div className="crm-heading">
                <div>
                  <div className="eyebrow"><span className="eyebrow-line" /> AES NEXUS · OPERACIONES Y LOGÍSTICA</div>
                  <h1 id="operations-title">{t('module.operations.title')}</h1>
                  <p>{t('module.operations.subtitle')}</p>
                </div>
              </div>

              <nav className="crm-tabs" aria-label="Secciones de Operaciones">
                {canAccessSection('Operaciones', 'Inventario', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                  <button
                    className={operationsSection === 'Inventario' ? 'active' : ''}
                    onClick={() => navigateToOperationsSection('Inventario')}
                  >
                    {t('tabs.ops.inventory')} <span>{inventory.length}</span>
                  </button>
                )}
                {canAccessSection('Operaciones', 'Traslados', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                  <button
                    className={operationsSection === 'Traslados' ? 'active' : ''}
                    onClick={() => navigateToOperationsSection('Traslados')}
                  >
                    {t('tabs.ops.transfers')} <span>{transfers.length}</span>
                  </button>
                )}
                {canAccessSection('Operaciones', 'Compras', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                  <button
                    className={operationsSection === 'Compras' ? 'active' : ''}
                    onClick={() => navigateToOperationsSection('Compras')}
                  >
                    {t('tabs.ops.purchases')} <span>{purchaseOrders.length}</span>
                  </button>
                )}
                {canAccessSection('Operaciones', 'Entregas', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                  <button
                    className={operationsSection === 'Entregas' ? 'active' : ''}
                    onClick={() => navigateToOperationsSection('Entregas')}
                  >
                    {t('tabs.ops.deliveries')} <span>{shipments.length}</span>
                  </button>
                )}
                {canAccessSection('Operaciones', 'Resumen', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                  <button
                    className={operationsSection === 'Resumen' ? 'active' : ''}
                    onClick={() => navigateToOperationsSection('Resumen')}
                  >
                    {t('tabs.ops.summary')}
                  </button>
                )}
              </nav>

              {operationsSection === 'Inventario' ? (
                <OperationsInventory
                  warehouses={warehouses}
                  inventory={inventory}
                  transfers={transfers}
                  movements={movements}
                  categoryThresholds={categoryStockThresholds}
                  productCategoryMap={productCategoryMap}
                  onOpenCategoryThresholds={
                    canAccessSection(
                      'Configuración',
                      'Umbrales de stock',
                      activeCapabilities,
                      isFullAdmin,
                      activeSessionProfile.isActive,
                      activeSectionAccess
                    )
                      ? () => navigateToSettingSection('Umbrales de stock')
                      : undefined
                  }
                  onUpdateInventory={setInventory}
                  onUpdateTransfers={setTransfers}
                  onAddMovement={handleAddMovement}
                  onDeleteInventoryItem={
                    canDeleteInSection(
                      'Operaciones',
                      'Inventario',
                      activeSectionAccess,
                      isFullAdmin,
                      activeSessionProfile.isActive
                    )
                      ? (itemId) => {
                          const target = inventory.find((it) => it.id === itemId)
                          setInventory((prev) => prev.filter((it) => it.id !== itemId))
                          if (target) {
                            appendAuditLog({
                              category: 'inventory',
                              action: 'Eliminación de registro de inventario',
                              detail: `${target.sku} · ${target.name} (${target.warehouseName})`,
                              user: activeSessionProfile.name,
                            })
                            setNotice(`Registro ${target.sku} eliminado de ${target.warehouseName}.`)
                            toast.info(`Registro ${target.sku} eliminado de ${target.warehouseName}.`, 'Inventario eliminado')
                          }
                        }
                      : undefined
                  }
                  onDeleteTransfer={
                    canDeleteInSection(
                      'Operaciones',
                      'Traslados',
                      activeSectionAccess,
                      isFullAdmin,
                      activeSessionProfile.isActive
                    )
                      ? (transferId) => {
                          const target = transfers.find((t) => t.id === transferId)
                          setTransfers((prev) => prev.filter((t) => t.id !== transferId))
                          if (target) {
                            appendAuditLog({
                              category: 'inventory',
                              action: 'Eliminación de traslado entre almacenes',
                              detail: `${target.folio} · ${target.sourceWarehouseName} → ${target.targetWarehouseName}`,
                              user: activeSessionProfile.name,
                            })
                            setNotice(`Traslado ${target.folio} eliminado.`)
                            toast.info(`Traslado ${target.folio} eliminado.`, 'Traslado eliminado')
                          }
                        }
                      : undefined
                  }
                  onStartTransfer={(item) => {
                    if (item) setPresetTransferItem(item)
                    navigateToOperationsSection('Traslados')
                  }}
                />
              ) : operationsSection === 'Traslados' ? (
                <OperationsTransfers
                  warehouses={warehouses}
                  inventory={inventory}
                  transfers={transfers}
                  movementsCount={movements.length}
                  presetItem={presetTransferItem}
                  onClearPresetItem={() => setPresetTransferItem(null)}
                  onUpdateInventory={setInventory}
                  onUpdateTransfers={setTransfers}
                  onAddMovement={handleAddMovement}
                  onDeleteTransfer={
                    canDeleteInSection(
                      'Operaciones',
                      'Traslados',
                      activeSectionAccess,
                      isFullAdmin,
                      activeSessionProfile.isActive
                    )
                      ? (transferId) => {
                          const target = transfers.find((t) => t.id === transferId)
                          setTransfers((prev) => prev.filter((t) => t.id !== transferId))
                          if (target) {
                            appendAuditLog({
                              category: 'inventory',
                              action: 'Eliminación de traslado entre almacenes',
                              detail: `${target.folio} · ${target.sourceWarehouseName} → ${target.targetWarehouseName}`,
                              user: activeSessionProfile.name,
                            })
                            setNotice(`Traslado ${target.folio} eliminado.`)
                            toast.info(`Traslado ${target.folio} eliminado.`, 'Traslado eliminado')
                          }
                        }
                      : undefined
                  }
                />
              ) : operationsSection === 'Compras' ? (
                <OperationsPurchases
                  purchaseOrders={purchaseOrders}
                  warehouses={warehouses}
                  suppliers={supplierRecords.map((s) => ({
                    name: s.name,
                    company: s.company,
                    email: s.email,
                  }))}
                  catalogProducts={initialProductsAndServices.map((p) => ({
                    id: p.id,
                    sku: p.sku,
                    name: p.name,
                    cost: p.cost ?? 0,
                    unitOfMeasure: p.unitOfMeasure,
                  }))}
                  onUpdatePurchaseOrders={setPurchaseOrders}
                  onUpdateInventory={setInventory}
                  inventory={inventory}
                  onAddMovement={handleAddMovement}
                  movementsCount={movements.length}
                  payables={payables}
                  onRegisterSupplierBillFromPO={handleRegisterSupplierBillFromPO}
                  onOpenFullPurchasesModule={() => navigateToPurchasesSection('Resumen')}
                  onDeletePurchaseOrder={
                    canDeleteInSection(
                      'Operaciones',
                      'Compras',
                      activeSectionAccess,
                      isFullAdmin,
                      activeSessionProfile.isActive
                    )
                      ? (poId) => {
                          const target = purchaseOrders.find((po) => po.id === poId)
                          setPurchaseOrders((prev) => prev.filter((po) => po.id !== poId))
                          if (target) {
                            appendAuditLog({
                              category: 'inventory',
                              action: 'Eliminación de orden de compra',
                              detail: `${target.folio} · ${target.supplierCompany}`,
                              user: activeSessionProfile.name,
                            })
                            setNotice(`Orden de compra ${target.folio} eliminada.`)
                            toast.info(`Orden de compra ${target.folio} eliminada.`, 'Orden eliminada')
                          }
                        }
                      : undefined
                  }
                  canApprovePurchases={
                    isFullAdmin ||
                    (activeCapabilities.has('approvePurchases') &&
                      canEditInSection(
                        'Operaciones',
                        'Compras',
                        activeSectionAccess,
                        isFullAdmin,
                        activeSessionProfile.isActive
                      ))
                  }
                />
              ) : operationsSection === 'Entregas' ? (
                <OperationsDeliveries
                  shipments={shipments}
                  onUpdateShipments={setShipments}
                  onDeleteShipment={
                    canDeleteInSection(
                      'Operaciones',
                      'Entregas',
                      activeSectionAccess,
                      isFullAdmin,
                      activeSessionProfile.isActive
                    )
                      ? (shipmentId) => {
                          const target = shipments.find((s) => s.id === shipmentId)
                          setShipments((prev) => prev.filter((s) => s.id !== shipmentId))
                          if (target) {
                            appendAuditLog({
                              category: 'inventory',
                              action: 'Eliminación de despacho y entrega',
                              detail: `${target.folio} · ${target.clientCompany}`,
                              user: activeSessionProfile.name,
                            })
                            setNotice(`Despacho ${target.folio} eliminado.`)
                            toast.info(`Despacho ${target.folio} eliminado.`, 'Despacho eliminado')
                          }
                        }
                      : undefined
                  }
                  salesOrderFolios={orders.map((o) => o.folio)}
                />
              ) : (
                <OperationsOverview
                  warehouses={warehouses}
                  inventory={effectiveInventory}
                  movements={movements}
                  purchaseOrders={purchaseOrders}
                  shipments={shipments}
                  onNavigateSection={(sec) => navigateToOperationsSection(sec)}
                  onNavigatePurchases={() => navigateToPurchasesSection('Órdenes de compra')}
                />
              )}
            </section>
          ) : activePage === 'Finanzas' ? (
            <section className="sales-page" aria-labelledby="finance-title">
              <div className="crm-heading">
                <div>
                  <div className="eyebrow"><span className="eyebrow-line" /> AES NEXUS · FINANZAS Y TESORERÍA</div>
                  <h1 id="finance-title">{t('module.finance.title')}</h1>
                  <p>{t('module.finance.subtitle')}</p>
                </div>
              </div>

              <nav className="crm-tabs" aria-label="Secciones de Finanzas">
                {canAccessSection('Finanzas', 'Cobros', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                  <button
                    className={financeSection === 'Cobros' ? 'active' : ''}
                    onClick={() => navigateToFinanceSection('Cobros')}
                  >
                    {t('tabs.fin.receivables')} <span>{receivables.length}</span>
                  </button>
                )}
                {canAccessSection('Finanzas', 'Pagos', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                  <button
                    className={financeSection === 'Pagos' ? 'active' : ''}
                    onClick={() => navigateToFinanceSection('Pagos')}
                  >
                    {t('tabs.fin.payables')} <span>{payables.length}</span>
                  </button>
                )}
                {canAccessSection('Finanzas', 'Pagos Bancarios', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                  <button
                    className={financeSection === 'Pagos Bancarios' ? 'active' : ''}
                    onClick={() => navigateToFinanceSection('Pagos Bancarios')}
                  >
                    {t('tabs.fin.ebp')} <span>{ebpBatches.length}</span>
                  </button>
                )}
                {canAccessSection('Finanzas', 'Cuentas contables', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                  <button
                    className={financeSection === 'Cuentas contables' ? 'active' : ''}
                    onClick={() => navigateToFinanceSection('Cuentas contables')}
                  >
                    {t('tabs.fin.accounting')} <span>{chartAccounts.length}</span>
                  </button>
                )}
                {canAccessSection('Finanzas', 'Resumen', activeCapabilities, isFullAdmin, activeSessionProfile.isActive, activeSectionAccess) && (
                  <button
                    className={financeSection === 'Resumen' ? 'active' : ''}
                    onClick={() => navigateToFinanceSection('Resumen')}
                  >
                    {t('tabs.fin.summary')}
                  </button>
                )}
              </nav>

              {financeSection === 'Cobros' ? (
                <FinanceReceivables
                  receivables={receivables}
                  bankAccounts={bankAccounts}
                  clientsList={clientRecords.map((c) => ({
                    company: c.company,
                    name: c.name,
                    email: c.email,
                    rfc: c.rfc,
                  }))}
                  onUpdateReceivables={setReceivables}
                  onDeleteReceivable={
                    canDeleteInSection(
                      'Finanzas',
                      'Cobros',
                      activeSectionAccess,
                      isFullAdmin,
                      activeSessionProfile.isActive
                    )
                      ? (invoiceId) => {
                          const target = receivables.find((r) => r.id === invoiceId)
                          setReceivables((prev) => prev.filter((r) => r.id !== invoiceId))
                          if (target) {
                            setOrders((prevOrders) =>
                              prevOrders.map((ord) => ({
                                ...ord,
                                invoiceIds: ord.invoiceIds?.filter((id) => id !== target.id),
                                invoiceFolios: ord.invoiceFolios?.filter((f) => f !== target.folio),
                              }))
                            )
                            appendAuditLog({
                              category: 'finance',
                              action: 'Eliminación de cuenta por cobrar (CxC)',
                              detail: `${target.folio} · ${target.clientCompany}`,
                              user: activeSessionProfile.name,
                            })
                            setNotice(`Factura ${target.folio} eliminada de Cobros.`)
                            toast.info(`Factura ${target.folio} eliminada de Cuentas por cobrar.`, 'Registro eliminado')
                          }
                        }
                      : undefined
                  }
                  onAddTransaction={handleAddTransaction}
                  onUpdateBankAccountBalance={handleUpdateBankAccountBalance}
                />
              ) : financeSection === 'Pagos' ? (
                <FinancePayables
                  payables={payables}
                  bankAccounts={bankAccounts}
                  suppliersList={supplierRecords.map((s) => ({
                    company: s.company,
                    name: s.name,
                    email: s.email,
                  }))}
                  onUpdatePayables={setPayables}
                  onDeletePayable={
                    canDeleteInSection(
                      'Finanzas',
                      'Pagos',
                      activeSectionAccess,
                      isFullAdmin,
                      activeSessionProfile.isActive
                    )
                      ? (billId) => {
                          const target = payables.find((b) => b.id === billId)
                          setPayables((prev) => prev.filter((b) => b.id !== billId))
                          if (target) {
                            appendAuditLog({
                              category: 'finance',
                              action: 'Eliminación de cuenta por pagar (CxP)',
                              detail: `${target.folio} · ${target.supplierCompany}`,
                              user: activeSessionProfile.name,
                            })
                            setNotice(`Cuenta por pagar ${target.folio} eliminada.`)
                            toast.info(`Cuenta por pagar ${target.folio} eliminada.`, 'Registro eliminado')
                          }
                        }
                      : undefined
                  }
                  onAddTransaction={handleAddTransaction}
                  onUpdateBankAccountBalance={handleUpdateBankAccountBalance}
                  onOpenEbpBatchFromBills={openEbpWizardForVendorBills}
                />
              ) : financeSection === 'Pagos Bancarios' ? (
                <FinanceEbp
                  packs={ebpPacks}
                  batches={ebpBatches}
                  bankAccounts={bankAccounts}
                  employees={employees}
                  suppliers={supplierRecords.map((s) => ({
                    name: s.name,
                    company: s.company,
                    email: s.email,
                    rfc: s.rfc,
                    currency: s.currency,
                    bankName: s.bankName,
                    clabe: s.clabe,
                    accountNumber: s.accountNumber,
                    defaultReference: s.defaultReference,
                    bankPackValues: s.bankPackValues,
                    bankAccounts: s.bankAccounts,
                  }))}
                  payrollRuns={payrollRuns}
                  payables={payables}
                  onUpdatePacks={handleUpdateEbpPacks}
                  onCreateBatch={(batch) => setEbpBatches((prev) => [batch, ...prev])}
                  onDeleteBatch={
                    canDeleteInSection(
                      'Finanzas',
                      'Pagos Bancarios',
                      activeSectionAccess,
                      isFullAdmin,
                      activeSessionProfile.isActive
                    )
                      ? (batchId) => {
                          const target = ebpBatches.find((b) => b.id === batchId)
                          setEbpBatches((prev) => prev.filter((b) => b.id !== batchId))
                          if (target) {
                            appendAuditLog({
                              category: 'finance',
                              action: 'Eliminación de lote de dispersión EBP',
                              detail: `${target.folio} · ${target.generatedFilename}`,
                              user: activeSessionProfile.name,
                            })
                            setNotice(`Lote bancario ${target.folio} eliminado.`)
                            toast.info(`Lote bancario ${target.folio} eliminado.`, 'Lote eliminado')
                          }
                        }
                      : undefined
                  }
                  onApplyBatchInFinance={handleApplyEbpBatchInFinance}
                  onUpdateBankAccountPackValues={handleUpdateBankAccountPackValues}
                  onUpdateSupplierBankAccounts={handleUpdateSupplierBankAccounts}
                />
              ) : financeSection === 'Cuentas contables' ? (
                <FinanceAccounting
                  accounts={chartAccounts}
                  onUpdateAccounts={setChartAccounts}
                  onDeleteAccount={
                    canDeleteInSection(
                      'Finanzas',
                      'Cuentas contables',
                      activeSectionAccess,
                      isFullAdmin,
                      activeSessionProfile.isActive
                    )
                      ? (accountId) => {
                          const target = chartAccounts.find((a) => a.id === accountId)
                          setChartAccounts((prev) => prev.filter((a) => a.id !== accountId))
                          if (target) {
                            appendAuditLog({
                              category: 'finance',
                              action: 'Eliminación de cuenta contable',
                              detail: `[${target.code}] ${target.name}`,
                              user: activeSessionProfile.name,
                            })
                            setNotice(`Cuenta contable ${target.code} eliminada.`)
                            toast.info(`Cuenta contable [${target.code}] ${target.name} eliminada.`, 'Cuenta eliminada')
                          }
                        }
                      : undefined
                  }
                />
              ) : (
                <FinanceOverview
                  bankAccounts={bankAccounts}
                  receivables={receivables}
                  payables={payables}
                  expenses={expenses}
                  transactions={transactions}
                  onNavigateSection={(sec) => navigateToFinanceSection(sec)}
                  onNavigateExpenses={() => navigateToExpensesSection('Registro y pólizas')}
                />
              )}
            </section>
          ) : activePage === 'Gastos' ? (
            <section className="sales-page" aria-labelledby="expenses-module-title">
              <FinanceCompanyExpenses
                mode="module"
                activeSection={expensesSection}
                allowedSections={([
                  'Resumen y control',
                  'Registro y pólizas',
                  'Presupuestos y alertas',
                  'Gastos recurrentes',
                ] as ExpensesSectionTab[]).filter((sec) =>
                  canAccessSection(
                    'Gastos',
                    sec,
                    activeCapabilities,
                    isFullAdmin,
                    activeSessionProfile.isActive,
                    activeSectionAccess
                  )
                )}
                onSelectSection={navigateToExpensesSection}
                expenses={expenses}
                bankAccounts={bankAccounts}
                departments={departments}
                locations={locations}
                chartAccounts={chartAccounts}
                budgets={expenseBudgets}
                recurringTemplates={recurringExpenses}
                activeUserName={activeSessionProfile.name}
                canCreate={canCreateInSection(
                  'Gastos',
                  expensesSection,
                  activeSectionAccess,
                  isFullAdmin,
                  activeSessionProfile.isActive
                )}
                canEdit={canEditInSection(
                  'Gastos',
                  expensesSection,
                  activeSectionAccess,
                  isFullAdmin,
                  activeSessionProfile.isActive
                )}
                onAddExpense={handleAddExpense}
                onUpdateExpense={handleUpdateExpense}
                onUpdateExpenseStatus={handleUpdateExpenseStatus}
                onDeleteExpense={
                  canDeleteInSection(
                    'Gastos',
                    expensesSection,
                    activeSectionAccess,
                    isFullAdmin,
                    activeSessionProfile.isActive
                  )
                    ? (expenseId) => {
                        const target = expenses.find((ex) => ex.id === expenseId)
                        setExpenses((prev) => prev.filter((ex) => ex.id !== expenseId))
                        if (target) {
                          appendAuditLog({
                            category: 'finance',
                            action: 'Eliminación de gasto',
                            detail: `${target.folio} · ${target.description}`,
                            user: activeSessionProfile.name,
                          })
                          setNotice(`Gasto ${target.folio} eliminado.`)
                          toast.info(`Gasto ${target.folio} eliminado.`, 'Gasto eliminado')
                        }
                      }
                    : undefined
                }
                onAddTransaction={handleAddTransaction}
                onUpdateBankAccountBalance={handleUpdateBankAccountBalance}
                onSaveBudget={handleSaveExpenseBudget}
                onToggleBudget={handleToggleExpenseBudget}
                onAddRecurringTemplate={handleAddRecurringExpense}
                onUpdateRecurringTemplate={handleUpdateRecurringExpense}
                onDeleteRecurringTemplate={handleDeleteRecurringExpense}
                onToggleRecurringTemplate={handleToggleRecurringExpense}
                onGenerateRecurringExpense={handleGenerateRecurringExpense}
                onGenerateRecurringBatch={handleGenerateRecurringBatch}
                onExportAudit={(reportName, rowCount) => {
                  appendAuditLog({
                    category: 'finance',
                    action: 'Exportación de histórico de gastos',
                    detail: `${reportName} · ${rowCount} registros`,
                    user: activeSessionProfile.name,
                  })
                }}
              />
            </section>
          ) : activePage === 'Reportes' ? (
            <ReportsSection
              activeTab={reportsSection}
              allowedTabs={([
                'Resumen ejecutivo',
                'Estado de Resultados',
                'Finanzas y Tesorería',
                'CxP y Pagos EBP',
                'Ventas y CxC',
                'Compras e Inventario',
                'Nómina y RRHH',
              ] as ReportsSectionTab[]).filter((sec) =>
                canAccessSection(
                  'Reportes',
                  sec,
                  activeCapabilities,
                  isFullAdmin,
                  activeSessionProfile.isActive,
                  activeSectionAccess
                )
              )}
              onSelectTab={navigateToReportsSection}
              bankAccounts={bankAccounts}
              receivables={receivables}
              payables={payables}
              expenses={expenses}
              transactions={transactions}
              chartAccounts={chartAccounts}
              ebpBatches={ebpBatches}
              quotes={quotes}
              orders={orders}
              purchaseOrders={purchaseOrders}
              requisitions={requisitions}
              inventory={inventory}
              movements={movements}
              warehouses={warehouses}
              locations={locations}
              employees={employees}
              payrollRuns={payrollRuns}
              departments={departments}
              suppliers={supplierRecords.map((s) => ({
                company: s.company,
                rfc: s.rfc,
                currency: s.currency,
                bankName: s.bankName,
                clabe: s.clabe,
                accountNumber: s.accountNumber,
                defaultReference: s.defaultReference,
                bankPackValues: s.bankPackValues,
                bankAccounts: s.bankAccounts,
              }))}
              clientsCount={clientRecords.length}
              onNavigateModule={navigateTo}
              onExportAudit={(reportName, rowCount) =>
                appendAuditLog({
                  category: 'finance',
                  action: 'Exportación de reporte CSV',
                  detail: `Reporte “${reportName}” exportado con ${rowCount} registro(s).`,
                  user: activeSessionProfile.name,
                })
              }
            />
          ) : activePage === 'Administración' ? (
            <AdministrationSection
              subsidiaries={subsidiaries}
              departments={departments}
              locations={locations}
              employees={employees}
              warehouses={warehouses}
              purchaseOrders={purchaseOrders}
              requisitions={requisitions}
              payables={payables}
              returnWorkflows={returnWorkflows}
              customerReturns={customerReturns}
              supplierReturns={supplierReturns}
              onUpdateReturnWorkflows={handleUpdateReturnWorkflows}
              onNavigateReturns={(kind) =>
                kind === 'customer'
                  ? navigateToSalesSection('Devoluciones')
                  : navigateToPurchasesSection('Devoluciones')
              }
              onAddSubsidiary={handleAddSubsidiary}
              onUpdateSubsidiaries={handleUpdateSubsidiaries}
              onDeleteSubsidiary={handleDeleteSubsidiary}
              onAddDepartment={handleAddDepartment}
              onAddLocation={handleAddLocation}
              onUpdateDepartments={handleUpdateDepartments}
              onDeleteDepartment={handleDeleteDepartment}
              onUpdateLocations={handleUpdateLocations}
              onDeleteLocation={handleDeleteAdminLocation}
              adminSection={adminSection}
              onNavigateSection={navigateToAdminSection}
              selectedSubsidiaryId={selectedSubsidiaryId}
              onSelectSubsidiary={navigateToSubsidiaryDetail}
              allowedSections={(
                [
                  'Subsidiarias',
                  'Departamentos',
                  'Ubicaciones',
                  'Flujos de devoluciones',
                  'Resumen',
                  'Historial de Auditoría',
                ] as AdminSectionTab[]
              ).filter((sec) =>
                canAccessSection(
                  'Administración',
                  sec,
                  activeCapabilities,
                  isFullAdmin,
                  activeSessionProfile.isActive,
                  activeSectionAccess
                )
              )}
              currentUserName={activeSessionProfile.name}
              canCreateInTab={(tab) =>
                canCreateInSection(
                  'Administración',
                  tab,
                  activeSectionAccess,
                  isFullAdmin,
                  activeSessionProfile.isActive
                )
              }
              canEditInTab={(tab) =>
                canEditInSection(
                  'Administración',
                  tab,
                  activeSectionAccess,
                  isFullAdmin,
                  activeSessionProfile.isActive
                )
              }
              canDeleteInTab={(tab) =>
                canDeleteInSection(
                  'Administración',
                  tab,
                  activeSectionAccess,
                  isFullAdmin,
                  activeSessionProfile.isActive
                )
              }
            />
          ) : activePage === 'Inicio' ? (
            <ExecutiveDashboard
              orders={orders}
              quotes={quotes}
              inventory={inventory}
              categoryThresholds={categoryStockThresholds}
              productCategoryMap={productCategoryMap}
              onOpenCategoryThresholds={
                canAccessSection(
                  'Configuración',
                  'Umbrales de stock',
                  activeCapabilities,
                  isFullAdmin,
                  activeSessionProfile.isActive,
                  activeSectionAccess
                )
                  ? () => navigateToSettingSection('Umbrales de stock')
                  : undefined
              }
              purchaseOrders={purchaseOrders}
              requisitions={requisitions}
              shipments={shipments}
              onUpdateInventory={setInventory}
              isStockConfigOpen={isStockConfigOpen}
              onCloseStockConfig={() => setIsStockConfigOpen(false)}
              initialStockConfigTab={stockConfigTab}
              receivables={receivables}
              payables={payables}
              expenses={expenses}
              bankAccounts={bankAccounts}
              chartAccounts={chartAccounts}
              opportunities={opportunityRecords}
              activities={activityRecords}
              activeUserName={activeSessionProfile.name}
              activeUserRolesSummary={activeSessionProfile.subtitle}
              isFullAdmin={isFullAdmin}
              capabilities={activeCapabilities}
              isAccountActive={activeSessionProfile.isActive}
              onNavigateSales={navigateToSalesSection}
              onNavigatePurchases={navigateToPurchasesSection}
              onNavigateOperations={navigateToOperationsSection}
              onNavigateFinance={navigateToFinanceSection}
              onNavigateExpenses={navigateToExpensesSection}
              onNavigateCrm={(sec) => {
                navigateTo('CRM')
                if (sec) setCrmSection(sec)
              }}
              onOpenCreateOpportunity={handleCreate}
            />
          ) : (
            (() => {
              const detail = moduleDetails[activePage as keyof typeof moduleDetails]
              const Icon = detail?.icon ?? FolderKanban
              return <section className="module-page" aria-labelledby="module-title">
                <div className="module-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> AES NEXUS · MÓDULO</div><h1 id="module-title">{activePage}</h1><p>{detail?.description ?? 'Este espacio reúne las herramientas de trabajo de tu organización.'}</p></div><span className="module-phase">{detail?.phase ?? 'En preparación'}</span></div>
                <article className="module-overview"><div className="module-icon"><Icon size={21} /></div><div><div className="panel-kicker">ESTRUCTURA DEL MÓDULO</div><h2>Un espacio para trabajar con claridad</h2><p>Esta es la base de navegación de AES Nexus. Sus funciones se construirán por fases y se conectarán a servicios y datos cuando el alcance esté validado.</p></div></article>
                <div className="module-area-grid">{(detail?.areas ?? ['Información de la organización', 'Personas y accesos', 'Preferencias del espacio']).map((area, index) => <article className="module-area" key={area}><span className="module-area-index">0{index + 1}</span><div><h3>{area}</h3><p>Área prevista para este módulo.</p></div><span className="module-area-status">Planeado</span></article>)}</div>
                <button className="button button-secondary" onClick={() => navigateTo('Inicio')}>Volver al inicio <ArrowRight size={15} /></button>
              </section>
            })()
          )}
        </div>
      </main>
      {createKind && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeCreate() }}>
        <section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="create-modal-title">
          <div className="create-modal-heading">
            <div>
              <div className="panel-kicker">AES NEXUS · CRM</div>
              <h2 id="create-modal-title">
                {createKind === 'client' ? 'Nuevo cliente comercial' : createKind === 'supplier' ? 'Nuevo proveedor' : createKind === 'opportunity' ? 'Nueva oportunidad' : 'Nueva actividad'}
              </h2>
              <p>
                {createKind === 'client'
                  ? 'Registra la entidad comercial y contacto. Se reflejará de inmediato en tu directorio.'
                  : 'Completa los datos básicos. Se guardarán sólo durante esta sesión demo.'}
              </p>
            </div>
            <button className="icon-button" aria-label="Cerrar formulario" disabled={isSubmittingClient} onClick={closeCreate}><X size={18} /></button>
          </div>
          <form onSubmit={submitCreate}>
            {createKind === 'client' && (
              <>
                <div className="form-section-divider">Datos generales y fiscales</div>
                <div className="form-grid">
                  <label className="form-field">
                    <span>Código de cliente</span>
                    <input
                      className="mono"
                      value={clientForm.clientCode}
                      onChange={(event) => setClientForm({ ...clientForm, clientCode: event.target.value })}
                      placeholder="Ej. CLI-006 o ID sistema previo"
                      title="Código externo o de catálogo para trazabilidad e identificación al migrar desde otro sistema"
                    />
                  </label>
                  <label className="form-field">
                    <span>Tipo de entidad</span>
                    <select
                      value={clientForm.entityType}
                      onChange={(event) => setClientForm({ ...clientForm, entityType: event.target.value as 'company' | 'individual' })}
                    >
                      <option value="company">Persona Moral (Empresa)</option>
                      <option value="individual">Persona Física (Individual)</option>
                    </select>
                  </label>
                </div>

                <label className="form-field">
                  <span>Razón Social / Empresa *</span>
                  <input
                    required
                    autoFocus
                    value={clientForm.company}
                    onChange={(event) => setClientForm({ ...clientForm, company: event.target.value })}
                    placeholder="Ej. Distribuidora del Norte S.A. de C.V."
                  />
                </label>

                <div className="form-grid">
                  <label className="form-field">
                    <span>Contacto principal *</span>
                    <input
                      required
                      value={clientForm.name}
                      onChange={(event) => setClientForm({ ...clientForm, name: event.target.value })}
                      placeholder="Ej. Alejandro Valdés"
                    />
                  </label>
                  <label className="form-field">
                    <span>RFC / ID Fiscal (México)</span>
                    <input
                      value={clientForm.rfc}
                      onChange={(event) => setClientForm({ ...clientForm, rfc: event.target.value.toUpperCase() })}
                      placeholder="Ej. DNO180420AB9"
                      maxLength={13}
                    />
                  </label>
                </div>

                <div className="form-section-divider">Contacto y comunicación</div>
                <div className="form-grid">
                  <label className="form-field">
                    <span>Correo electrónico *</span>
                    <input
                      type="email"
                      required
                      value={clientForm.email}
                      onChange={(event) => setClientForm({ ...clientForm, email: event.target.value })}
                      placeholder="contacto@empresa.mx"
                    />
                  </label>
                  <label className="form-field">
                    <span>Teléfono</span>
                    <input
                      type="tel"
                      value={clientForm.phone}
                      onChange={(event) => setClientForm({ ...clientForm, phone: event.target.value })}
                      placeholder="55 1234 5678"
                    />
                  </label>
                </div>

                <div className="form-section-divider">Condiciones comerciales</div>
                <div className="form-grid">
                  <label className="form-field">
                    <span>Estado inicial</span>
                    <select
                      value={clientForm.status}
                      onChange={(event) => setClientForm({ ...clientForm, status: event.target.value as any })}
                    >
                      <option value="Activo">Activo</option>
                      <option value="Prospecto">Prospecto</option>
                      <option value="Inactivo">Inactivo</option>
                    </select>
                  </label>
                  <CountryDropdown
                    countries={countries}
                    value={clientForm.country}
                    onChange={(code) => setClientForm({ ...clientForm, country: code })}
                    disabled={isSubmittingClient}
                    placeholder="Seleccionar país"
                    id="client-country"
                    label="País *"
                  />
                </div>

                <div className="form-grid">
                  <label className="form-field">
                    <span>Condiciones de pago</span>
                    <select
                      value={clientForm.paymentTerms}
                      onChange={(event) => setClientForm({ ...clientForm, paymentTerms: event.target.value })}
                    >
                      <option value="Contado">Contado</option>
                      <option value="Crédito 15 días">Crédito 15 días</option>
                      <option value="Crédito 30 días">Crédito 30 días</option>
                      <option value="Crédito 60 días">Crédito 60 días</option>
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Moneda preferida</span>
                    <select
                      value={clientForm.currency}
                      onChange={(event) => setClientForm({ ...clientForm, currency: event.target.value as any })}
                    >
                      <option value="MXN">MXN · Peso mexicano</option>
                      <option value="USD">USD · Dólar estadounidense</option>
                    </select>
                  </label>
                </div>

                <div className="form-section-divider">Direcciones</div>

                {clientForm.addressesList.length > 0 && (
                  <div className="address-cards-stack">
                    {clientForm.addressesList.map((addr, idx) => (
                      <div className="address-card-item" key={addr.id || idx}>
                        <div className="address-card-info">
                          <div className="address-card-street">
                            <MapPin size={12} className="address-pin-icon" />
                            <strong>{addr.street || 'Sin calle'}</strong>
                            {addr.colony ? `, Col. ${addr.colony}` : ''}
                            {addr.city ? `, ${addr.city}` : ''}
                            {addr.state ? `, ${addr.state}` : ''}
                            {addr.zipCode ? ` C.P. ${addr.zipCode}` : ''}
                          </div>
                          <div className="address-card-badges">
                            {addr.isShipping && <span className="address-badge shipping">Envío</span>}
                            {addr.isBilling && <span className="address-badge billing">Facturación</span>}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="address-remove-btn"
                          title="Eliminar dirección"
                          onClick={() => {
                            setClientForm({
                              ...clientForm,
                              addressesList: clientForm.addressesList.filter((_, i) => i !== idx),
                            })
                            toast.info('Dirección eliminada de la lista temporal.', 'Dirección eliminada')
                          }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <label className="form-field">
                  <span>Calle y número</span>
                  <input
                    value={clientForm.addressStreet}
                    onChange={(event) => setClientForm({ ...clientForm, addressStreet: event.target.value })}
                    placeholder="Ej. Av. Insurgentes Sur 1602, Piso 4"
                  />
                </label>

                <div className="form-grid">
                  <label className="form-field">
                    <span>Colonia / Barrio</span>
                    <input
                      value={clientForm.addressColony}
                      onChange={(event) => setClientForm({ ...clientForm, addressColony: event.target.value })}
                      placeholder="Ej. Crédito Constructor"
                    />
                  </label>
                  <label className="form-field">
                    <span>Código Postal</span>
                    <input
                      value={clientForm.addressZip}
                      onChange={(event) => setClientForm({ ...clientForm, addressZip: event.target.value })}
                      placeholder="Ej. 03940"
                    />
                  </label>
                </div>

                <div className="form-grid">
                  <label className="form-field">
                    <span>Ciudad</span>
                    <input
                      value={clientForm.addressCity}
                      onChange={(event) => setClientForm({ ...clientForm, addressCity: event.target.value })}
                      placeholder="Ej. Benito Juárez"
                    />
                  </label>
                  <label className="form-field">
                    <span>Estado / Provincia</span>
                    <input
                      value={clientForm.addressState}
                      onChange={(event) => setClientForm({ ...clientForm, addressState: event.target.value })}
                      placeholder="Ej. Ciudad de México"
                    />
                  </label>
                </div>

                <CountryDropdown
                  countries={countries}
                  value={clientForm.addressCountry}
                  onChange={(code) => setClientForm({ ...clientForm, addressCountry: code })}
                  disabled={isSubmittingClient}
                  placeholder="Seleccionar país de la dirección"
                  id="client-address-country"
                  label="País de la dirección"
                />

                <div className="address-checkboxes-box">
                  <span className="checkboxes-legend">Tipo de dirección</span>
                  <div className="address-checkboxes-row">
                    <label className="checkbox-field">
                      <input
                        type="checkbox"
                        checked={clientForm.addressIsShipping}
                        onChange={(event) => setClientForm({ ...clientForm, addressIsShipping: event.target.checked })}
                      />
                      <span>Dirección de envío</span>
                    </label>
                    <label className="checkbox-field">
                      <input
                        type="checkbox"
                        checked={clientForm.addressIsBilling}
                        onChange={(event) => setClientForm({ ...clientForm, addressIsBilling: event.target.checked })}
                      />
                      <span>Dirección de facturación</span>
                    </label>
                  </div>
                  <small className="checkboxes-hint">Puedes marcar ambas casillas si esta dirección se utiliza para envío y facturación.</small>
                </div>

                <button
                  type="button"
                  className="button-add-address"
                  onClick={() => {
                    if (!clientForm.addressStreet.trim() && !clientForm.addressCity.trim() && !clientForm.addressZip.trim()) {
                      setNotice('Ingresa al menos la calle o ciudad para registrar la dirección en la lista.')
                      toast.warning('Ingresa al menos la calle o ciudad para registrar la dirección en la lista.', 'Dirección incompleta')
                      return
                    }
                    const newAddr: ClientAddress = {
                      id: `addr_${Date.now()}`,
                      street: clientForm.addressStreet.trim(),
                      colony: clientForm.addressColony.trim(),
                      city: clientForm.addressCity.trim(),
                      state: clientForm.addressState.trim(),
                      zipCode: clientForm.addressZip.trim(),
                      country: clientForm.addressCountry || clientForm.country || 'MX',
                      isShipping: clientForm.addressIsShipping,
                      isBilling: clientForm.addressIsBilling,
                    }
                    setClientForm({
                      ...clientForm,
                      addressesList: [...clientForm.addressesList, newAddr],
                      addressStreet: '',
                      addressColony: '',
                      addressCity: '',
                      addressState: '',
                      addressZip: '',
                      addressCountry: clientForm.country || 'MX',
                      addressIsShipping: true,
                      addressIsBilling: true,
                    })
                    toast.success('Dirección guardada en la lista temporal.', 'Dirección agregada')
                  }}
                >
                  <Plus size={13} /> Guardar esta dirección y agregar otra
                </button>

                <label className="form-field">
                  <span>Notas y acuerdos comerciales</span>
                  <textarea
                    value={clientForm.notes}
                    onChange={(event) => setClientForm({ ...clientForm, notes: event.target.value })}
                    placeholder="Acuerdos especiales, línea de crédito estimada o referencias de la relación comercial..."
                  />
                </label>
              </>
            )}

            {createKind === 'supplier' && (
              <>
                <div className="form-grid">
                  <label className="form-field">
                    <span>Código de proveedor</span>
                    <input
                      className="mono"
                      value={createForm.supplierCode}
                      onChange={(event) => setCreateForm({ ...createForm, supplierCode: event.target.value })}
                      placeholder="Ej. PRV-005 o ID sistema previo"
                      title="Código externo o de catálogo para trazabilidad e identificación al migrar desde otro sistema"
                    />
                  </label>
                  <label className="form-field">
                    <span>Nombre del contacto *</span>
                    <input
                      required
                      autoFocus
                      value={createForm.name}
                      onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })}
                      placeholder="Ej. Laura Méndez"
                    />
                  </label>
                </div>
                <label className="form-field"><span>Empresa *</span><input required value={createForm.company} onChange={(event) => setCreateForm({ ...createForm, company: event.target.value })} placeholder="Ej. Suministros del Centro" /></label>
                <div className="form-grid">
                  <label className="form-field"><span>Correo *</span><input type="email" required value={createForm.email} onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })} placeholder="correo@empresa.mx" /></label>
                  <label className="form-field"><span>Teléfono</span><input value={createForm.phone} onChange={(event) => setCreateForm({ ...createForm, phone: event.target.value })} placeholder="55 0000 0000" /></label>
                </div>
                <CountryDropdown
                  countries={countries}
                  value={createForm.country}
                  onChange={(code) => setCreateForm({ ...createForm, country: code })}
                  disabled={isSubmittingClient}
                  placeholder="Seleccionar país"
                  id="supplier-country"
                  label="País *"
                />

                <div className="form-section-divider">Direcciones</div>

                {createForm.addressesList.length > 0 && (
                  <div className="address-cards-stack">
                    {createForm.addressesList.map((addr, idx) => (
                      <div className="address-card-item" key={addr.id || idx}>
                        <div className="address-card-info">
                          <div className="address-card-street">
                            <MapPin size={12} className="address-pin-icon" />
                            <strong>{addr.street || 'Sin calle'}</strong>
                            {addr.colony ? `, Col. ${addr.colony}` : ''}
                            {addr.city ? `, ${addr.city}` : ''}
                            {addr.state ? `, ${addr.state}` : ''}
                            {addr.zipCode ? ` C.P. ${addr.zipCode}` : ''}
                          </div>
                          <div className="address-card-badges">
                            {addr.isShipping && <span className="address-badge shipping">Envío</span>}
                            {addr.isBilling && <span className="address-badge billing">Facturación</span>}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="address-remove-btn"
                          title="Eliminar dirección"
                          onClick={() => {
                            setCreateForm({
                              ...createForm,
                              addressesList: createForm.addressesList.filter((_, i) => i !== idx),
                            })
                            toast.info('Dirección eliminada de la lista temporal.', 'Dirección eliminada')
                          }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <label className="form-field">
                  <span>Calle y número</span>
                  <input
                    value={createForm.addressStreet}
                    onChange={(event) => setCreateForm({ ...createForm, addressStreet: event.target.value })}
                    placeholder="Ej. Calz. Vallejo 1020, Bodega 4"
                  />
                </label>

                <div className="form-grid">
                  <label className="form-field">
                    <span>Colonia / Barrio</span>
                    <input
                      value={createForm.addressColony}
                      onChange={(event) => setCreateForm({ ...createForm, addressColony: event.target.value })}
                      placeholder="Ej. Industrial Vallejo"
                    />
                  </label>
                  <label className="form-field">
                    <span>Código Postal</span>
                    <input
                      value={createForm.addressZip}
                      onChange={(event) => setCreateForm({ ...createForm, addressZip: event.target.value })}
                      placeholder="Ej. 02300"
                    />
                  </label>
                </div>

                <div className="form-grid">
                  <label className="form-field">
                    <span>Ciudad</span>
                    <input
                      value={createForm.addressCity}
                      onChange={(event) => setCreateForm({ ...createForm, addressCity: event.target.value })}
                      placeholder="Ej. Azcapotzalco"
                    />
                  </label>
                  <label className="form-field">
                    <span>Estado / Provincia</span>
                    <input
                      value={createForm.addressState}
                      onChange={(event) => setCreateForm({ ...createForm, addressState: event.target.value })}
                      placeholder="Ej. Ciudad de México"
                    />
                  </label>
                </div>

                <CountryDropdown
                  countries={countries}
                  value={createForm.addressCountry}
                  onChange={(code) => setCreateForm({ ...createForm, addressCountry: code })}
                  disabled={isSubmittingClient}
                  placeholder="Seleccionar país de la dirección"
                  id="supplier-address-country"
                  label="País de la dirección"
                />

                <div className="address-checkboxes-box">
                  <span className="checkboxes-legend">Tipo de dirección</span>
                  <div className="address-checkboxes-row">
                    <label className="checkbox-field">
                      <input
                        type="checkbox"
                        checked={createForm.addressIsShipping}
                        onChange={(event) => setCreateForm({ ...createForm, addressIsShipping: event.target.checked })}
                      />
                      <span>Dirección de envío</span>
                    </label>
                    <label className="checkbox-field">
                      <input
                        type="checkbox"
                        checked={createForm.addressIsBilling}
                        onChange={(event) => setCreateForm({ ...createForm, addressIsBilling: event.target.checked })}
                      />
                      <span>Dirección de facturación</span>
                    </label>
                  </div>
                  <small className="checkboxes-hint">Puedes marcar ambas casillas si esta dirección se utiliza para envío y facturación.</small>
                </div>

                <button
                  type="button"
                  className="button-add-address"
                  onClick={() => {
                    if (!createForm.addressStreet.trim() && !createForm.addressCity.trim() && !createForm.addressZip.trim()) {
                      setNotice('Ingresa al menos la calle o ciudad para registrar la dirección en la lista.')
                      toast.warning('Ingresa al menos la calle o ciudad para registrar la dirección en la lista.', 'Dirección incompleta')
                      return
                    }
                    const newAddr: ClientAddress = {
                      id: `addr_${Date.now()}`,
                      street: createForm.addressStreet.trim(),
                      colony: createForm.addressColony.trim(),
                      city: createForm.addressCity.trim(),
                      state: createForm.addressState.trim(),
                      zipCode: createForm.addressZip.trim(),
                      country: createForm.addressCountry || createForm.country || 'MX',
                      isShipping: createForm.addressIsShipping,
                      isBilling: createForm.addressIsBilling,
                    }
                    setCreateForm({
                      ...createForm,
                      addressesList: [...createForm.addressesList, newAddr],
                      addressStreet: '',
                      addressColony: '',
                      addressCity: '',
                      addressState: '',
                      addressZip: '',
                      addressCountry: createForm.country || 'MX',
                      addressIsShipping: true,
                      addressIsBilling: true,
                    })
                    toast.success('Dirección guardada en la lista temporal.', 'Dirección agregada')
                  }}
                >
                  <Plus size={13} /> Guardar esta dirección y agregar otra
                </button>

                <div className="form-section-divider">Datos bancarios para pagos electrónicos (EBP)</div>
                <div className="form-grid">
                  <label className="form-field">
                    <span>RFC del proveedor</span>
                    <input
                      value={createForm.rfc}
                      maxLength={13}
                      onChange={(e) => setCreateForm({ ...createForm, rfc: e.target.value.toUpperCase() })}
                      placeholder="Ej. ACO170812K90"
                    />
                  </label>
                  <label className="form-field">
                    <span>Banco receptor</span>
                    <input
                      value={createForm.bankName}
                      onChange={(e) => setCreateForm({ ...createForm, bankName: e.target.value })}
                      placeholder="Ej. BBVA México / Banorte"
                    />
                  </label>
                </div>
                <div className="form-grid">
                  <label className="form-field">
                    <span>CLABE interbancaria (18 dígitos)</span>
                    <input
                      className="mono"
                      maxLength={18}
                      value={createForm.clabe}
                      onChange={(e) => setCreateForm({ ...createForm, clabe: e.target.value })}
                      placeholder="18 dígitos"
                    />
                  </label>
                  <label className="form-field">
                    <span>Referencia numérica predeterminada</span>
                    <input
                      value={createForm.defaultReference}
                      onChange={(e) => setCreateForm({ ...createForm, defaultReference: e.target.value })}
                      placeholder="Ej. 1049201"
                    />
                  </label>
                </div>
              </>
            )}
            {createKind === 'opportunity' && <><label className="form-field"><span>Empresa</span><input required autoFocus value={createForm.company} onChange={(event) => setCreateForm({ ...createForm, company: event.target.value })} placeholder="Ej. Estudio Horizonte" /></label><div className="form-grid"><label className="form-field"><span>Contacto</span><input value={createForm.name} onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })} placeholder="Nombre del contacto" /></label><label className="form-field"><span>Valor estimado (MXN)</span><input type="number" min="0" value={createForm.value} onChange={(event) => setCreateForm({ ...createForm, value: event.target.value })} placeholder="25000" /></label></div></>}
            {createKind === 'activity' && <><label className="form-field"><span>Actividad</span><input required autoFocus value={createForm.title} onChange={(event) => setCreateForm({ ...createForm, title: event.target.value })} placeholder="Ej. Confirmar reunión" /></label><div className="form-grid"><label className="form-field"><span>Empresa</span><input value={createForm.company} onChange={(event) => setCreateForm({ ...createForm, company: event.target.value })} placeholder="Empresa relacionada" /></label><label className="form-field"><span>Hora</span><input type="time" required value={createForm.time} onChange={(event) => setCreateForm({ ...createForm, time: event.target.value })} /></label></div></>}
            <div className="create-modal-actions">
              <button className="button button-secondary" type="button" disabled={isSubmittingClient} onClick={closeCreate}>Cancelar</button>
              <button className="button button-primary" type="submit" disabled={isSubmittingClient}>
                <Plus size={14} /> {isSubmittingClient ? 'Enviando petición...' : `Crear ${createKind === 'client' ? 'cliente' : createKind === 'supplier' ? 'proveedor' : createKind === 'opportunity' ? 'oportunidad' : 'actividad'}`}
              </button>
            </div>
          </form>
        </section>
      </div>}

      {/* Modal: Configurar múltiples detalles bancarios + Packs EBP del Proveedor */}
      {editingSupplierBank && (() => {
        const currentAccounts = normalizeSupplierBankAccounts({
          company: editingSupplierBank.company,
          currency: editingSupplierBank.currency || 'MXN',
          bankName: editingSupplierBank.bankName,
          clabe: editingSupplierBank.clabe,
          accountNumber: editingSupplierBank.accountNumber,
          defaultReference: editingSupplierBank.defaultReference,
          bankPackValues: editingSupplierBank.bankPackValues,
          bankAccounts: editingSupplierBank.bankAccounts,
        })
        const usedAccIds = new Set<string>()
        ebpBatches.forEach((b) => {
          b.lines.forEach((l) => {
            if (l.selectedBankAccountId) usedAccIds.add(l.selectedBankAccountId)
          })
        })

        return (
          <div
            className="modal-backdrop"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setEditingSupplierBank(null)
            }}
          >
            <section className="create-modal modal-wide" role="dialog" aria-modal="true">
              <div className="create-modal-heading">
                <div>
                  <div className="panel-kicker">PROVEEDOR · DETALLES BANCARIOS EBP</div>
                  <h2>{editingSupplierBank.company}</h2>
                  <p>
                    Registra una o varias cuentas bancarias (con moneda y parámetros EBP propios) para pagar facturas individuales o consolidadas.
                  </p>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Cerrar"
                  onClick={() => setEditingSupplierBank(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const primaryAcc = getPreferredSupplierBankAccount(
                    currentAccounts,
                    editingSupplierBank.currency || 'MXN'
                  )
                  const updatedSupplier: DirectoryRecord = {
                    ...editingSupplierBank,
                    bankAccounts: currentAccounts,
                    bankName: primaryAcc?.bankName || undefined,
                    clabe: primaryAcc?.clabe || undefined,
                    accountNumber: primaryAcc?.accountNumber || undefined,
                    defaultReference: primaryAcc?.defaultReference || undefined,
                    bankPackValues: primaryAcc?.bankPackValues || {},
                    lastActivity: 'Ahora',
                  }
                  setSupplierRecords((prev) =>
                    prev.map((s) =>
                      s.email === editingSupplierBank.email && s.company === editingSupplierBank.company
                        ? updatedSupplier
                        : s
                    )
                  )
                  toast.success(
                    `Detalles bancarios de ${editingSupplierBank.company} (${currentAccounts.length} cuenta(s)) actualizados para lotes EBP.`,
                    'Proveedor actualizado'
                  )
                  setEditingSupplierBank(null)
                }}
              >
                <div className="form-grid" style={{ marginBottom: 12 }}>
                  <label className="form-field">
                    <span>RFC / Tax ID del proveedor</span>
                    <input
                      className="mono"
                      maxLength={13}
                      value={editingSupplierBank.rfc || ''}
                      onChange={(e) =>
                        setEditingSupplierBank({
                          ...editingSupplierBank,
                          rfc: e.target.value.toUpperCase(),
                        })
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Moneda comercial principal</span>
                    <select
                      value={editingSupplierBank.currency || 'MXN'}
                      onChange={(e) =>
                        setEditingSupplierBank({
                          ...editingSupplierBank,
                          currency: e.target.value as 'MXN' | 'USD',
                        })
                      }
                    >
                      <option value="MXN">MXN · Peso Mexicano</option>
                      <option value="USD">USD · Dólar Americano</option>
                    </select>
                  </label>
                </div>

                <SupplierBankAccountsManager
                  accounts={currentAccounts}
                  installedPacks={ebpPacks}
                  usedAccountIds={usedAccIds}
                  defaultCurrency={editingSupplierBank.currency || 'MXN'}
                  onChange={(nextAccounts) =>
                    setEditingSupplierBank({
                      ...editingSupplierBank,
                      bankAccounts: nextAccounts,
                    })
                  }
                />

                <div className="create-modal-actions" style={{ marginTop: 14 }}>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setEditingSupplierBank(null)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="button button-primary">
                    <Check size={14} /> Guardar detalles bancarios
                  </button>
                </div>
              </form>
            </section>
          </div>
        )
      })()}

      {/* Ficha de Cliente / Proveedor (mismo diseño que Ficha de Empleados) */}
      {detailDirectory && (() => {
        const isSup = detailDirectory.kind === 'supplier'
        const rec = detailDirectory.record
        const relatedDocs = isSup
          ? payables.filter((b) => b.supplierCompany.toLowerCase() === rec.company.toLowerCase())
          : receivables.filter((r) => r.clientCompany.toLowerCase() === rec.company.toLowerCase())
        const openBalance = relatedDocs.reduce((s, d) => s + d.balance, 0)
        const totalVolume = relatedDocs.reduce((s, d) => s + d.total, 0)

        return (
          <DirectorySheetModal
            kind={detailDirectory.kind}
            record={rec}
            installedPacks={ebpPacks}
            openBalance={openBalance}
            totalVolume={totalVolume}
            documentsCount={relatedDocs.length}
            onClose={() => setDetailDirectory(null)}
            onQuickStatusChange={(nextStatus) => {
              const updated = { ...rec, status: nextStatus, lastActivity: 'Ahora' }
              if (isSup) {
                setSupplierRecords((prev) =>
                  prev.map((s) =>
                    s.email === rec.email && s.company === rec.company ? updated : s
                  )
                )
              } else {
                setClientRecords((prev) =>
                  prev.map((c) =>
                    c.email === rec.email && c.company === rec.company ? updated : c
                  )
                )
              }
              setDetailDirectory({ kind: detailDirectory.kind, record: updated })
              toast.info(
                `Estado de ${rec.company} cambiado a ${nextStatus}.`,
                'Estado actualizado'
              )
            }}
            onEdit={() => {
              const snapshot = JSON.parse(JSON.stringify(rec)) as DirectoryRecord
              const kindCopy = detailDirectory.kind
              setDetailDirectory(null)
              setEditingDirectory({
                kind: kindCopy,
                originalEmail: rec.email,
                originalCompany: rec.company,
                record: snapshot,
              })
            }}
            onEditBank={
              isSup
                ? () => {
                    const snapshot = JSON.parse(JSON.stringify(rec)) as DirectoryRecord
                    setDetailDirectory(null)
                    setEditingSupplierBank(snapshot)
                  }
                : undefined
            }
          />
        )
      })()}

      {/* Modal: Editar ficha de Cliente o Proveedor */}
      {editingDirectory && (
        <DirectoryEditModal
          kind={editingDirectory.kind}
          record={editingDirectory.record}
          installedPacks={ebpPacks}
          onClose={() => setEditingDirectory(null)}
          onDelete={
            canDeleteInSection(
              'CRM',
              editingDirectory.kind === 'supplier' ? 'Proveedores' : 'Clientes',
              activeSectionAccess,
              isFullAdmin,
              activeSessionProfile.isActive
            )
              ? () => {
                  const targetName = editingDirectory.originalCompany
                  const isSup = editingDirectory.kind === 'supplier'
                  if (isSup) {
                    setSupplierRecords((prev) =>
                      prev.filter(
                        (s) =>
                          !(
                            s.email === editingDirectory.originalEmail &&
                            s.company === editingDirectory.originalCompany
                          )
                      )
                    )
                  } else {
                    setClientRecords((prev) =>
                      prev.filter(
                        (c) =>
                          !(
                            c.email === editingDirectory.originalEmail &&
                            c.company === editingDirectory.originalCompany
                          )
                      )
                    )
                  }
                  setEditingDirectory(null)
                  setDetailDirectory(null)
                  setNotice(
                    `${isSup ? 'Proveedor' : 'Cliente'} “${targetName}” eliminado del directorio.`
                  )
                  toast.info(
                    `${isSup ? 'Proveedor' : 'Cliente'} “${targetName}” eliminado del directorio.`,
                    isSup ? 'Proveedor eliminado' : 'Cliente eliminado'
                  )
                }
              : undefined
          }
          onSave={(updated) => {
            if (editingDirectory.kind === 'supplier') {
              setSupplierRecords((prev) =>
                prev.map((s) =>
                  s.email === editingDirectory.originalEmail &&
                  s.company === editingDirectory.originalCompany
                    ? updated
                    : s
                )
              )
            } else {
              setClientRecords((prev) =>
                prev.map((c) =>
                  c.email === editingDirectory.originalEmail &&
                  c.company === editingDirectory.originalCompany
                    ? updated
                    : c
                )
              )
            }
            toast.success(
              `Ficha de ${updated.company} actualizada correctamente.`,
              editingDirectory.kind === 'supplier' ? 'Proveedor actualizado' : 'Cliente actualizado'
            )
            setEditingDirectory(null)
          }}
        />
      )}

      {/* Modal: Editar ficha de Oportunidad */}
      {editingOpportunity && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEditingOpportunity(null)
          }}
        >
          <section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="edit-opp-title">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">CRM · OPORTUNIDAD COMERCIAL</div>
                <h2 id="edit-opp-title">Editar ficha de oportunidad</h2>
                <p>Actualiza la etapa comercial, valor estimado, contacto o elimina esta oportunidad.</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                aria-label="Cerrar"
                onClick={() => setEditingOpportunity(null)}
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const cleanCompany = editingOpportunity.company.trim()
                if (!cleanCompany) return
                const cleanValue = Math.max(0, Number(editingOpportunity.value) || 0)
                const stageTone: 'blue' | 'amber' | 'green' =
                  editingOpportunity.stage === 'Negociación'
                    ? 'amber'
                    : editingOpportunity.stage === 'Calificada' || editingOpportunity.stage === 'Ganada'
                    ? 'green'
                    : 'blue'
                const initials =
                  cleanCompany
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => p[0]?.toUpperCase() || '')
                    .join('') || 'OP'
                setOpportunityRecords((prev) =>
                  prev.map((item, idx) =>
                    idx === editingOpportunity.index
                      ? {
                          ...item,
                          company: cleanCompany,
                          person: editingOpportunity.person.trim() || 'Sin contacto',
                          initials,
                          value: cleanValue,
                          stage: editingOpportunity.stage,
                          stageTone,
                          date: editingOpportunity.date.trim() || item.date,
                        }
                      : item
                  )
                )
                toast.success(
                  `Oportunidad de “${cleanCompany}” actualizada correctamente.`,
                  'Oportunidad actualizada'
                )
                setEditingOpportunity(null)
              }}
            >
              <label className="form-field">
                <span>Empresa *</span>
                <input
                  required
                  autoFocus
                  value={editingOpportunity.company}
                  onChange={(e) =>
                    setEditingOpportunity({ ...editingOpportunity, company: e.target.value })
                  }
                />
              </label>

              <div className="form-grid-2">
                <label className="form-field">
                  <span>Contacto</span>
                  <input
                    value={editingOpportunity.person}
                    onChange={(e) =>
                      setEditingOpportunity({ ...editingOpportunity, person: e.target.value })
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Valor estimado (MXN)</span>
                  <input
                    type="number"
                    min={0}
                    value={editingOpportunity.value}
                    onChange={(e) =>
                      setEditingOpportunity({ ...editingOpportunity, value: e.target.value })
                    }
                  />
                </label>
              </div>

              <div className="form-grid-2">
                <label className="form-field">
                  <span>Etapa</span>
                  <select
                    value={editingOpportunity.stage}
                    onChange={(e) =>
                      setEditingOpportunity({ ...editingOpportunity, stage: e.target.value })
                    }
                  >
                    <option value="Calificada">Calificada</option>
                    <option value="Propuesta">Propuesta</option>
                    <option value="Negociación">Negociación</option>
                    <option value="Ganada">Ganada</option>
                    <option value="Perdida">Perdida</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>Fecha / Seguimiento</span>
                  <input
                    value={editingOpportunity.date}
                    onChange={(e) =>
                      setEditingOpportunity({ ...editingOpportunity, date: e.target.value })
                    }
                  />
                </label>
              </div>

              <div
                className={`create-modal-actions ${
                  canDeleteInSection(
                    'CRM',
                    'Oportunidades',
                    activeSectionAccess,
                    isFullAdmin,
                    activeSessionProfile.isActive
                  )
                    ? 'has-delete-action'
                    : ''
                }`}
              >
                {canDeleteInSection(
                  'CRM',
                  'Oportunidades',
                  activeSectionAccess,
                  isFullAdmin,
                  activeSessionProfile.isActive
                ) && (
                  <div className="modal-delete-slot">
                    {!confirmDeleteOpp ? (
                      <button
                        type="button"
                        className="button button-danger-outline"
                        onClick={() => setConfirmDeleteOpp(true)}
                      >
                        <Trash2 size={14} /> Eliminar oportunidad
                      </button>
                    ) : (
                      <div className="modal-delete-confirm">
                        <span>
                          ¿Eliminar a <strong>{editingOpportunity.company}</strong>?
                        </span>
                        <button
                          type="button"
                          className="button button-danger-solid"
                          onClick={() => {
                            const targetName = editingOpportunity.company
                            const targetIdx = editingOpportunity.index
                            setOpportunityRecords((prev) =>
                              prev.filter((_, idx) => idx !== targetIdx)
                            )
                            setEditingOpportunity(null)
                            setConfirmDeleteOpp(false)
                            setNotice(`Oportunidad de “${targetName}” eliminada del pipeline.`)
                            toast.info(
                              `Oportunidad de “${targetName}” eliminada del pipeline.`,
                              'Oportunidad eliminada'
                            )
                          }}
                        >
                          <Trash2 size={13} /> Confirmar
                        </button>
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => setConfirmDeleteOpp(false)}
                        >
                          Conservar
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <div className="modal-primary-actions-slot">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setEditingOpportunity(null)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="button button-primary">
                    <BadgeCheck size={14} /> Guardar cambios
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal: Editar ficha de Actividad */}
      {editingActivity && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEditingActivity(null)
          }}
        >
          <section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="edit-act-title">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">CRM · AGENDA COMERCIAL</div>
                <h2 id="edit-act-title">Editar ficha de actividad</h2>
                <p>Modifica el título, empresa, horario, tipo de seguimiento o elimina esta actividad.</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                aria-label="Cerrar"
                onClick={() => setEditingActivity(null)}
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const cleanTitle = editingActivity.title.trim()
                if (!cleanTitle) return
                setActivityRecords((prev) =>
                  prev.map((item, idx) =>
                    idx === editingActivity.index
                      ? {
                          ...item,
                          title: cleanTitle,
                          company: editingActivity.company.trim() || 'Sin empresa',
                          time: editingActivity.time,
                          icon: editingActivity.icon,
                          tone: editingActivity.tone,
                        }
                      : item
                  )
                )
                toast.success(
                  `Actividad “${cleanTitle}” actualizada correctamente.`,
                  'Actividad actualizada'
                )
                setEditingActivity(null)
              }}
            >
              <label className="form-field">
                <span>Actividad *</span>
                <input
                  required
                  autoFocus
                  value={editingActivity.title}
                  onChange={(e) =>
                    setEditingActivity({ ...editingActivity, title: e.target.value })
                  }
                />
              </label>

              <div className="form-grid-2">
                <label className="form-field">
                  <span>Empresa relacionada</span>
                  <input
                    value={editingActivity.company}
                    onChange={(e) =>
                      setEditingActivity({ ...editingActivity, company: e.target.value })
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Hora *</span>
                  <input
                    type="time"
                    required
                    value={editingActivity.time}
                    onChange={(e) =>
                      setEditingActivity({ ...editingActivity, time: e.target.value })
                    }
                  />
                </label>
              </div>

              <label className="form-field">
                <span>Tipo de seguimiento</span>
                <select
                  value={editingActivity.icon}
                  onChange={(e) => {
                    const nextIcon = e.target.value
                    const nextTone: 'blue' | 'amber' | 'green' =
                      nextIcon === 'send' ? 'blue' : nextIcon === 'phone' ? 'amber' : 'green'
                    setEditingActivity({ ...editingActivity, icon: nextIcon, tone: nextTone })
                  }}
                >
                  <option value="send">Envío de propuesta / correo</option>
                  <option value="phone">Llamada de seguimiento</option>
                  <option value="check">Revisión / Tarea interna</option>
                </select>
              </label>

              <div
                className={`create-modal-actions ${
                  canDeleteInSection(
                    'CRM',
                    'Actividades',
                    activeSectionAccess,
                    isFullAdmin,
                    activeSessionProfile.isActive
                  )
                    ? 'has-delete-action'
                    : ''
                }`}
              >
                {canDeleteInSection(
                  'CRM',
                  'Actividades',
                  activeSectionAccess,
                  isFullAdmin,
                  activeSessionProfile.isActive
                ) && (
                  <div className="modal-delete-slot">
                    {!confirmDeleteAct ? (
                      <button
                        type="button"
                        className="button button-danger-outline"
                        onClick={() => setConfirmDeleteAct(true)}
                      >
                        <Trash2 size={14} /> Eliminar actividad
                      </button>
                    ) : (
                      <div className="modal-delete-confirm">
                        <span>
                          ¿Eliminar <strong>{editingActivity.title}</strong>?
                        </span>
                        <button
                          type="button"
                          className="button button-danger-solid"
                          onClick={() => {
                            const targetTitle = editingActivity.title
                            const targetIdx = editingActivity.index
                            setActivityRecords((prev) =>
                              prev.filter((_, idx) => idx !== targetIdx)
                            )
                            setEditingActivity(null)
                            setConfirmDeleteAct(false)
                            setNotice(`Actividad “${targetTitle}” eliminada de la agenda.`)
                            toast.info(
                              `Actividad “${targetTitle}” eliminada de la agenda.`,
                              'Actividad eliminada'
                            )
                          }}
                        >
                          <Trash2 size={13} /> Confirmar
                        </button>
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => setConfirmDeleteAct(false)}
                        >
                          Conservar
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <div className="modal-primary-actions-slot">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setEditingActivity(null)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="button button-primary">
                    <BadgeCheck size={14} /> Guardar cambios
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Global EBP Batch Wizard Modal (launched from CRM Payroll, Purchases Invoices or Finance Payables) */}
      {globalEbpWizard.isOpen && (
        <EbpBatchWizardModal
          isOpen={globalEbpWizard.isOpen}
          batchType={globalEbpWizard.batchType}
          defaultAggregationMode={globalEbpWizard.defaultAggregationMode}
          sourceRefId={globalEbpWizard.sourceRefId}
          sourceFolio={globalEbpWizard.sourceFolio}
          candidates={globalEbpWizard.candidates}
          suppliers={supplierRecords.map((s) => ({
            name: s.name,
            company: s.company,
            email: s.email,
            rfc: s.rfc,
            currency: s.currency,
            bankName: s.bankName,
            clabe: s.clabe,
            accountNumber: s.accountNumber,
            defaultReference: s.defaultReference,
            bankPackValues: s.bankPackValues,
            bankAccounts: s.bankAccounts,
          }))}
          usedSupplierBankAccountIds={usedSupplierBankAccountIds}
          packs={ebpPacks}
          bankAccounts={bankAccounts}
          existingBatchesCount={ebpBatches.length}
          onClose={() => setGlobalEbpWizard((prev) => ({ ...prev, isOpen: false }))}
          onUpdateBankAccountPackValues={handleUpdateBankAccountPackValues}
          onUpdateSupplierBankAccounts={handleUpdateSupplierBankAccounts}
          onCreateBatch={(batch) => {
            setEbpBatches((prev) => [batch, ...prev])
            navigateToFinanceSection('Pagos Bancarios')
          }}
        />
      )}

      {roleLoginDialogMode && (
        <RoleSessionSelectorModal
          isOpen={true}
          mode={roleLoginDialogMode}
          roleDefinitions={roleDefinitions}
          workspaceUsers={workspaceUsers}
          currentUserId={activeSessionProfile.baseUserId}
          currentRoleId={activeSessionProfile.activeRoleId}
          onClose={() => setRoleLoginDialogMode(null)}
          onConfirmSession={({ userId, roleSelection }) =>
            handleSwitchActiveRole(roleSelection, userId)
          }
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <I18nProvider>
        <AppContent />
      </I18nProvider>
    </ToastProvider>
  )
}
