import { useEffect, useState, useMemo, useRef, type FormEvent } from 'react'
import {
  ArrowRight, ArrowUpRight, Bell, BellRing, BriefcaseBusiness,
  CalendarDays, ChevronDown, CircleHelp, Clock3, Edit3, Eye,
  FolderKanban, Landmark, LayoutDashboard, Menu,
  MoreHorizontal, Plus, Search, Settings2, ShoppingBag, Sparkles,
  Target, Users, WalletCards, Warehouse as WarehouseIcon, ShieldCheck, X,
  Check, MapPin, AlertTriangle, SlidersHorizontal, CheckCircle2, Package,
} from 'lucide-react'
import { activities, opportunities } from './data/dashboard'
import { ExecutiveDashboard } from './components/ExecutiveDashboard'
import { createClientApi, type ClientAddress } from './services/clientService'
import CountryDropdown, { countries, findCountry } from './components/CountryDropdown'
import { CountryFlag } from './components/CountryFlag'
import { ToastProvider, useToast } from './components/Toast'
import { SettingsSection } from './components/SettingsSection'
import { CrmEmployees } from './components/CrmEmployees'
import { CrmPayroll } from './components/CrmPayroll'
import { DirectorySheetModal, DirectoryEditModal } from './components/DirectorySheetModal'
import { initialEmployees, type EmployeeRecord } from './data/employees'
import { initialPayrollRuns, type PayrollRunRecord } from './data/payroll'
import { ProductsAndServices } from './components/ProductsAndServices'
import { QuotesSection } from './components/QuotesSection'
import { OrdersSection } from './components/OrdersSection'
import { SalesInvoices } from './components/SalesInvoices'
import { SalesOverview } from './components/SalesOverview'
import { initialQuotes, initialOrders, type Quote, type SalesOrder } from './data/sales'
import { initialProductsAndServices } from './data/products'
import { OperationsInventory } from './components/OperationsInventory'
import { OperationsTransfers } from './components/OperationsTransfers'
import { OperationsPurchases } from './components/OperationsPurchases'
import { OperationsDeliveries } from './components/OperationsDeliveries'
import { OperationsOverview } from './components/OperationsOverview'
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
import { FinanceExpenses } from './components/FinanceExpenses'
import { FinanceOverview } from './components/FinanceOverview'
import { FinanceAccounting } from './components/FinanceAccounting'
import { FinanceEbp } from './components/FinanceEbp'
import { EbpBatchWizardModal, type EbpWizardCandidateLine } from './components/EbpBatchWizardModal'
import {
  initialBankFormatPacks,
  initialEbpBatches,
  makeValidClabe,
  validateEbpFieldValue,
  type BankFormatPack,
  type ElectronicPaymentBatch,
} from './data/ebp'
import {
  AdministrationSection,
  type DepartmentRecord,
  type PhysicalLocationRecord,
} from './components/AdministrationSection'
import {
  initialBankAccounts,
  initialReceivables,
  initialPayables,
  initialExpenses,
  initialTransactions,
  initialChartAccounts,
  type BankAccount,
  type InvoiceReceivable,
  type BillPayable,
  type ExpenseRecord,
  type PaymentTransaction,
  type ChartAccount,
} from './data/finance'

const sections: { label: string; items: { name: string; icon: typeof LayoutDashboard; count?: string }[] }[] = [
  { label: 'ESPACIO DE TRABAJO', items: [{ name: 'Inicio', icon: LayoutDashboard }] },
  { label: 'MÓDULOS', items: [
    { name: 'CRM', icon: Users, count: 'H2' },
    { name: 'Ventas', icon: ShoppingBag, count: 'H2' },
    { name: 'Operaciones', icon: WarehouseIcon, count: 'H3' },
    { name: 'Finanzas', icon: WalletCards, count: 'H3' },
    { name: 'Administración', icon: ShieldCheck, count: 'H1' },
  ] },
]

const moduleDetails = {
  CRM: { icon: Users, phase: 'H2 · Piloto comercial', description: 'Centraliza las relaciones y el seguimiento comercial de tu organización.', areas: ['Empresas y contactos', 'Empleados y colaboradores', 'Nómina de empleados', 'Oportunidades y pipeline', 'Actividades y seguimiento'] },
  Ventas: { icon: ShoppingBag, phase: 'H2 · Piloto comercial', description: 'Acompaña el proceso desde una cotización y pedido hasta la factura de venta sincronizada con Finanzas.', areas: ['Catálogo de productos y servicios', 'Cotizaciones y aprobaciones', 'Pedidos de venta', 'Facturas de venta y CxC'] },
  Operaciones: { icon: WarehouseIcon, phase: 'H3 · MVP operativo', description: 'Organiza el movimiento de productos desde compras y recepción hasta la entrega.', areas: ['Inventario por almacén', 'Traslados entre ubicaciones', 'Compras y recepciones', 'Entregas y devoluciones'] },
  Finanzas: { icon: WalletCards, phase: 'H3 · MVP operativo', description: 'Da seguimiento a saldos, cobros, pagos y gastos con finanzas operativas.', areas: ['Cuentas por cobrar y cobros', 'Cuentas por pagar', 'Gastos y reportes'] },
  Administración: { icon: ShieldCheck, phase: 'H1 · Núcleo del sistema', description: 'Configura la organización, el acceso de las personas y los controles de operación.', areas: ['Organización y entidad legal', 'Usuarios, membresías y roles', 'Auditoría y configuración'] },
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
}

const clients: DirectoryRecord[] = [
  { clientCode: 'CLI-001', name: 'Sofía Ramírez', company: 'Estudio Nómada', email: 'sofia@estudionomada.mx', phone: '55 2184 6301', status: 'Activo', lastActivity: 'Hoy', initials: 'SR', color: 'lilac', rfc: 'ENO190520AB1', entityType: 'company', currency: 'MXN', paymentTerms: 'Contado', country: 'MX', city: 'CDMX', addresses: [{ id: 'a1', street: 'Colima 245, Roma Norte', city: 'Ciudad de México', state: 'CDMX', zipCode: '06700', country: 'MX', isShipping: true, isBilling: true }] },
  { clientCode: 'CLI-002', name: 'Diego Fernández', company: 'Taller Norte', email: 'diego@tallernorte.mx', phone: '81 3045 1120', status: 'Activo', lastActivity: 'Ayer', initials: 'DF', color: 'peach', rfc: 'FED901102XX3', entityType: 'individual', currency: 'MXN', paymentTerms: 'Crédito 15 días', country: 'MX', city: 'Monterrey', addresses: [{ id: 'a2', street: 'Av. Constitución 1400', city: 'Monterrey', state: 'Nuevo León', zipCode: '64000', country: 'MX', isShipping: true, isBilling: false }] },
  { clientCode: 'CLI-003', name: 'Valentina Ruiz', company: 'Casa Oliva', email: 'valentina@casaoliva.mx', phone: '33 1470 9822', status: 'Prospecto', lastActivity: 'Ayer', initials: 'VR', color: 'sage', rfc: 'COL210314TY7', entityType: 'company', currency: 'MXN', paymentTerms: 'Contado', country: 'MX', city: 'Guadalajara', addresses: [{ id: 'a3', street: 'Av. Chapultepec 480', city: 'Guadalajara', state: 'Jalisco', zipCode: '44160', country: 'MX', isShipping: false, isBilling: true }] },
  { clientCode: 'CLI-004', name: 'Mateo Cruz', company: 'Lumen Studio', email: 'mateo@lumenstudio.mx', phone: '55 7740 2108', status: 'Activo', lastActivity: '12 nov', initials: 'MC', color: 'blue', rfc: 'LUM180905MK8', entityType: 'company', currency: 'MXN', paymentTerms: 'Crédito 30 días', country: 'MX', city: 'CDMX' },
  { clientCode: 'CLI-005', name: 'Camila Torres', company: 'Punto Cero', email: 'camila@puntocero.mx', phone: '55 4402 7718', status: 'Inactivo', lastActivity: '28 oct', initials: 'CT', color: 'amber', rfc: 'PCE160719881', entityType: 'company', currency: 'MXN', paymentTerms: 'Contado', country: 'MX', city: 'Puebla' },
]

const suppliers: DirectoryRecord[] = [
  { supplierCode: 'PRV-001', name: 'Distribuidora Atlas', company: 'Atlas Comercial', email: 'contacto@atlascomercial.mx', phone: '55 3055 4820', status: 'Activo', lastActivity: 'Hoy', initials: 'DA', color: 'blue', rfc: 'ACO170812K90', bankName: 'BBVA México', clabe: makeValidClabe('01218000512098761'), accountNumber: '0512098761', defaultReference: '1049201', bankPackValues: { pack_banorte_bem_pagos: { operationCode: '04', destBankCode: '012' } }, country: 'MX', city: 'CDMX', addresses: [{ id: 's1', street: 'Calz. Vallejo 1020, Bodega 4', city: 'Azcapotzalco', state: 'CDMX', zipCode: '02300', country: 'MX', isShipping: true, isBilling: true }] },
  { supplierCode: 'PRV-002', name: 'Papelería Central', company: 'Central de Insumos', email: 'ventas@centralinsumos.mx', phone: '81 2104 6651', status: 'Activo', lastActivity: '3 nov', initials: 'PC', color: 'sage', rfc: 'CIN190305AB4', bankName: 'Banorte', clabe: makeValidClabe('07258000334455112'), accountNumber: '0334455112', defaultReference: '2055102', bankPackValues: { pack_banorte_bem_pagos: { operationCode: '01', destBankCode: '072' } }, country: 'MX' },
  { supplierCode: 'PRV-003', name: 'Logística del Valle', company: 'Logística del Valle', email: 'operaciones@logisticavalle.mx', phone: '33 3810 9920', status: 'Prospecto', lastActivity: '30 oct', initials: 'LV', color: 'lilac', rfc: 'LVA200918RT2', bankName: 'Santander', clabe: makeValidClabe('01432000991122334'), accountNumber: '9911223340', defaultReference: '3091122', bankPackValues: { pack_banorte_bem_pagos: { operationCode: '04', destBankCode: '014' } }, country: 'MX' },
  { supplierCode: 'PRV-004', name: 'Servicios Nube', company: 'Nube Digital', email: 'soporte@nubedigital.mx', phone: '55 7284 1176', status: 'Activo', lastActivity: '25 oct', initials: 'SN', color: 'peach', rfc: 'NDI181122M88', bankName: 'HSBC', clabe: makeValidClabe('02118000665544332'), accountNumber: '6655443320', defaultReference: '4066554', bankPackValues: { pack_banorte_bem_pagos: { operationCode: '04', destBankCode: '021' } }, country: 'MX' },
]

const initialDepartments: DepartmentRecord[] = [
  { id: 'dep_1', code: 'DIR-01', name: 'Dirección General', leader: 'Andrea Morales', costCenter: 'CC-100', description: 'Toma de decisiones estratégicas y gobierno corporativo.', active: true },
  { id: 'dep_2', code: 'OPE-02', name: 'Operaciones y Logística', leader: 'Roberto Santos', costCenter: 'CC-200', description: 'Control de inventarios, compras, almacén y distribución.', active: true },
  { id: 'dep_3', code: 'FIN-03', name: 'Finanzas y Tesorería', leader: 'Gabriela Morales', costCenter: 'CC-300', description: 'Flujo de caja, cuentas por cobrar, pagos e impuestos.', active: true },
  { id: 'dep_4', code: 'VEN-04', name: 'Ventas y Comercial', leader: 'Carlos Méndez', costCenter: 'CC-400', description: 'Prospección, cotizaciones, pedidos y atención a cuentas.', active: true },
  { id: 'dep_5', code: 'TEC-05', name: 'Tecnología y Sistemas', leader: 'Laura R.', costCenter: 'CC-500', description: 'Infraestructura TI, software ERP y soporte técnico.', active: true },
]

const initialLocations: PhysicalLocationRecord[] = [
  { id: 'loc_1', code: 'CORP-CDMX', name: 'Sede Corporativa Reforma', type: 'Oficina corporativa', address: 'Paseo de la Reforma 222, Piso 14', city: 'Ciudad de México', state: 'CDMX', country: 'México', manager: 'Andrea Morales', active: true },
  { id: 'loc_2', code: 'ALM-VALLEJO', name: 'Almacén Central Vallejo', type: 'Almacén / Bodega', address: 'Calz. Vallejo 1020, Bodega 4', city: 'Azcapotzalco', state: 'CDMX', country: 'México', manager: 'Roberto Santos', active: true },
  { id: 'loc_3', code: 'SUC-MTY', name: 'Sucursal y Bodega Monterrey', type: 'Sucursal', address: 'Av. Constitución 1400', city: 'Monterrey', state: 'Nuevo León', country: 'México', manager: 'Diego Fernández', active: true },
  { id: 'loc_4', code: 'SUC-GDL', name: 'Punto de Operación Guadalajara', type: 'Punto de venta', address: 'Av. Chapultepec 480', city: 'Guadalajara', state: 'Jalisco', country: 'México', manager: 'Valentina Ruiz', active: true },
]

const accentOptions = [
  { id: 'green', label: 'Verde', color: '#456a61', description: 'Natural y equilibrado' },
  { id: 'blue', label: 'Azul', color: '#3f6f9f', description: 'Claro y profesional' },
  { id: 'purple', label: 'Morado', color: '#7860a6', description: 'Creativo y distintivo' },
  { id: 'terracotta', label: 'Terracota', color: '#b96e56', description: 'Cálido y cercano' },
] as const
type AccentTheme = typeof accentOptions[number]['id']
type CreateKind = 'client' | 'supplier' | 'opportunity' | 'activity'

const money = (value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value)

const pageRoutes: Record<string, string> = {
  Inicio: '/',
  CRM: '/crm',
  Ventas: '/sales',
  Operaciones: '/operations',
  Finanzas: '/finance',
  Administración: '/admin',
  Configuración: '/settings',
}

const pageFromPath = (pathname: string) => {
  if (pathname.startsWith('/crm')) return 'CRM'
  if (pathname.startsWith('/sales') || pathname.startsWith('/ventas')) return 'Ventas'
  if (pathname.startsWith('/operations') || pathname.startsWith('/operaciones')) return 'Operaciones'
  if (pathname.startsWith('/finance') || pathname.startsWith('/finanzas')) return 'Finanzas'
  const normalized = pathname.replace(/\/$/, '') || '/'
  if (normalized === '/administracion') return 'Administración'
  return Object.entries(pageRoutes).find(([, route]) => route === normalized)?.[0] ?? 'Inicio'
}

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

const salesSectionFromPath = (pathname: string) =>
  pathname === '/sales/quotes' || pathname === '/ventas/cotizaciones'
    ? 'Cotizaciones'
    : pathname === '/sales/orders' || pathname === '/ventas/pedidos'
    ? 'Pedidos'
    : pathname === '/sales/invoices' || pathname === '/ventas/facturas'
    ? 'Facturas'
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
    : pathname === '/finance/expenses' || pathname === '/finance/gastos' || pathname === '/finanzas/gastos'
    ? 'Gastos'
    : pathname === '/finance/summary' || pathname === '/finance/resumen' || pathname === '/finanzas/resumen'
    ? 'Resumen'
    : 'Cobros'

const adminSectionFromPath = (pathname: string) =>
  pathname === '/admin/locations' || pathname === '/admin/ubicaciones' || pathname === '/administracion/ubicaciones'
    ? 'Ubicaciones'
    : pathname === '/admin/summary' || pathname === '/admin/resumen' || pathname === '/administracion/resumen'
    ? 'Resumen'
    : 'Departamentos'

function AppContent() {
  const toast = useToast()
  const [activePage, setActivePage] = useState(() => pageFromPath(window.location.pathname))
  const [crmSection, setCrmSection] = useState(() => crmSectionFromPath(window.location.pathname))
  const [salesSection, setSalesSection] = useState<'Catálogo' | 'Cotizaciones' | 'Pedidos' | 'Facturas' | 'Resumen'>(() => salesSectionFromPath(window.location.pathname))
  const [operationsSection, setOperationsSection] = useState<'Inventario' | 'Traslados' | 'Compras' | 'Entregas' | 'Resumen'>(() => operationsSectionFromPath(window.location.pathname))
  const [financeSection, setFinanceSection] = useState<'Cobros' | 'Pagos' | 'Pagos Bancarios' | 'Gastos' | 'Cuentas contables' | 'Resumen'>(() => financeSectionFromPath(window.location.pathname))
  const [adminSection, setAdminSection] = useState<'Departamentos' | 'Ubicaciones' | 'Resumen'>(() => adminSectionFromPath(window.location.pathname))
  const [quotes, setQuotes] = useState<Quote[]>(initialQuotes)
  const [orders, setOrders] = useState<SalesOrder[]>(initialOrders)
  const [presetOrderToInvoice, setPresetOrderToInvoice] = useState<SalesOrder | null>(null)
  const [presetInvoiceIdToView, setPresetInvoiceIdToView] = useState<string | null>(null)
  const [presetOrderFolioToView, setPresetOrderFolioToView] = useState<string | null>(null)
  const [warehouses, setWarehouses] = useState<Warehouse[]>(initialWarehouses)
  const [inventory, setInventory] = useState<InventoryItemLocation[]>(initialInventory)
  const [transfers, setTransfers] = useState<InventoryTransfer[]>(initialTransfers)
  const [presetTransferItem, setPresetTransferItem] = useState<InventoryItemLocation | null>(null)

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

  // Ítems de inventario bajo umbral mínimo
  const lowStockItems = useMemo(() => {
    return inventory.filter((item) => item.stock <= item.minStock)
  }, [inventory])

  // Estado del Centro de Notificaciones Superior
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false)
  const notificationCenterRef = useRef<HTMLDivElement>(null)

  // Control del modal de configuración de stock desde el centro de notificaciones
  const [isStockConfigOpen, setIsStockConfigOpen] = useState(false)
  const [stockConfigTab, setStockConfigTab] = useState<'thresholds' | 'push' | 'email'>('thresholds')

  const handleOpenStockConfigFromNotif = (tab: 'thresholds' | 'push' | 'email' = 'thresholds') => {
    setIsNotificationCenterOpen(false)
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
  const [shipments, setShipments] = useState<ShipmentDelivery[]>(initialShipments)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(initialBankAccounts)
  const [receivables, setReceivables] = useState<InvoiceReceivable[]>(initialReceivables)
  const [payables, setPayables] = useState<BillPayable[]>(initialPayables)
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(initialExpenses)
  const [transactions, setTransactions] = useState<PaymentTransaction[]>(initialTransactions)
  const [chartAccounts, setChartAccounts] = useState<ChartAccount[]>(initialChartAccounts)
  const [departments, setDepartments] = useState<DepartmentRecord[]>(initialDepartments)
  const [locations, setLocations] = useState<PhysicalLocationRecord[]>(initialLocations)
  const [employees, setEmployees] = useState<EmployeeRecord[]>(initialEmployees)
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
      // Proveedores: liquidar facturas incluidas en el lote
      const lineAmountByBillId = new Map(
        batch.lines.map((l) => [l.sourceLineId, l.amount])
      )
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
            paymentMethod: `EBP · ${batch.folio}`,
          }
        })
      )
      handleUpdateBankAccountBalance(bankAcc.id, -batch.totalAmount)
      handleAddTransaction({
        id: `txn_${Date.now()}`,
        folio: `PAG-2026-${String(transactions.length + 1).padStart(3, '0')}`,
        date: dateStr,
        type: 'Pago a proveedor',
        entityName: `Lote EBP (${batch.operationsCount} proveedores)`,
        reference: `${batch.folio} · ${batch.generatedFilename}`,
        amount: batch.totalAmount,
        method: `EBP (${batch.packName})`,
        account: bankAcc.bankName,
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
      sourceRefId: run.id,
      sourceFolio: run.folio,
      candidates,
    })
  }

  const openEbpWizardForVendorBills = (bills: BillPayable[]) => {
    const supMap = new Map(supplierRecords.map((s) => [s.company.toLowerCase(), s]))
    const candidates: EbpWizardCandidateLine[] = bills.map((bill) => {
      const sup = supMap.get(bill.supplierCompany.toLowerCase())
      return {
        sourceLineId: bill.id,
        beneficiaryName: bill.supplierCompany,
        beneficiaryCode: bill.folio,
        rfc: sup?.rfc,
        bankName: sup?.bankName || '',
        clabe: sup?.clabe || '',
        accountNumber: sup?.accountNumber,
        amount: bill.balance,
        reference: sup?.defaultReference || bill.folio.replace(/\D/g, '').slice(-7) || '100001',
        concept: `PAGO ${bill.folio}`,
        bankPackValues: sup?.bankPackValues,
      }
    })
    setGlobalEbpWizard({
      isOpen: true,
      batchType: 'Proveedores',
      sourceRefId: bills.map((b) => b.id).join(','),
      sourceFolio:
        bills.length === 1 ? bills[0].folio : `LOTE-CXP (${bills.length} fact.)`,
      candidates,
    })
  }

  const handleAddMovement = (mov: StockMovement) => {
    setMovements((prev) => [mov, ...prev])
  }

  const handleAddTransaction = (txn: PaymentTransaction) => {
    setTransactions((prev) => [txn, ...prev])
  }

  const handleAddExpense = (exp: ExpenseRecord) => {
    setExpenses((prev) => [exp, ...prev])
  }

  const handleAddDepartment = (dep: DepartmentRecord) => {
    setDepartments((prev) => [dep, ...prev])
  }

  const handleAddLocation = (loc: PhysicalLocationRecord) => {
    setLocations((prev) => [loc, ...prev])
    setWarehouses((prev) => {
      const exists = prev.some(
        (w) =>
          w.locationId === loc.id ||
          w.code.toLowerCase() === loc.code.toLowerCase() ||
          w.name.toLowerCase() === loc.name.toLowerCase()
      )
      if (exists) return prev
      return [
        ...prev,
        {
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
        },
      ]
    })
  }

  const handleUpdateLocations = (updatedLocations: PhysicalLocationRecord[]) => {
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
  }
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
  const [accentTheme, setAccentTheme] = useState<AccentTheme>(() => {
    const savedTheme = window.localStorage.getItem('aes-nexus-accent')
    return accentOptions.some((option) => option.id === savedTheme) ? savedTheme as AccentTheme : 'green'
  })
  const [darkMode, setDarkMode] = useState(() => window.localStorage.getItem('aes-nexus-dark-mode') === 'true')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    document.body.classList.toggle('dark', darkMode)
  }, [darkMode])

  const navigateTo = (page: string) => {
    setActivePage(page)
    if (page === 'Ventas') setSalesSection('Catálogo')
    if (page === 'CRM') setCrmSection('Resumen')
    if (page === 'Operaciones') setOperationsSection('Inventario')
    if (page === 'Finanzas') setFinanceSection('Cobros')
    if (page === 'Administración') setAdminSection('Departamentos')
    const route = pageRoutes[page] ?? '/'
    if (window.location.pathname !== route) window.history.pushState({}, '', route)
  }

  const navigateToAdminSection = (section: 'Departamentos' | 'Ubicaciones' | 'Resumen') => {
    setActivePage('Administración')
    setAdminSection(section)
    const route =
      section === 'Ubicaciones'
        ? '/admin/locations'
        : section === 'Resumen'
        ? '/admin/summary'
        : '/admin'
    if (window.location.pathname !== route) window.history.pushState({}, '', route)
  }

  const navigateToFinanceSection = (section: 'Cobros' | 'Pagos' | 'Pagos Bancarios' | 'Gastos' | 'Cuentas contables' | 'Resumen') => {
    setActivePage('Finanzas')
    setFinanceSection(section)
    const route =
      section === 'Cuentas contables'
        ? '/finance/accounting'
        : section === 'Pagos Bancarios'
        ? '/finance/ebp'
        : section === 'Pagos'
        ? '/finance/payables'
        : section === 'Gastos'
        ? '/finance/expenses'
        : section === 'Resumen'
        ? '/finance/summary'
        : '/finance'
    if (window.location.pathname !== route) window.history.pushState({}, '', route)
  }

  const navigateToOperationsSection = (section: 'Inventario' | 'Traslados' | 'Compras' | 'Entregas' | 'Resumen') => {
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

  const navigateToSalesSection = (section: 'Catálogo' | 'Cotizaciones' | 'Pedidos' | 'Facturas' | 'Resumen') => {
    setActivePage('Ventas')
    setSalesSection(section)
    const route =
      section === 'Cotizaciones'
        ? '/sales/quotes'
        : section === 'Pedidos'
        ? '/sales/orders'
        : section === 'Facturas'
        ? '/sales/invoices'
        : section === 'Resumen'
        ? '/sales/summary'
        : '/sales'
    if (window.location.pathname !== route) window.history.pushState({}, '', route)
  }

  const navigateToCrmSection = (section: string) => {
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
          bankName: createForm.bankName.trim() || undefined,
          clabe: createForm.clabe.trim() || undefined,
          accountNumber: createForm.accountNumber.trim() || undefined,
          defaultReference: createForm.defaultReference.trim() || undefined,
          bankPackValues: createForm.bankPackValues,
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
      setOperationsSection(operationsSectionFromPath(window.location.pathname))
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

        <button className="workspace-switch">
          <span className="workspace-avatar">B</span>
          <span className="workspace-copy"><strong>Brújula Estudio</strong><small>Plan inicial</small></span>
          <ChevronDown size={15} />
        </button>

        <label className="search-box"><Search size={15} /><input aria-label="Buscar" placeholder="Buscar en AES Nexus" /><kbd>⌘ K</kbd></label>

        <nav className="side-nav" aria-label="Navegación principal">
          {sections.map((section) => (
            <div className="nav-section" key={section.label}>
              <p className="nav-label">{section.label}</p>
              {section.items.map(({ name, icon: Icon, count }) => (
                  <button key={name} className={`nav-item ${activePage === name ? 'active' : ''}`} aria-current={activePage === name ? 'page' : undefined} onClick={() => { navigateTo(name); if (name === 'CRM') setCrmSection('Resumen'); setNotice(''); setMenuOpen(false) }}>
                  <Icon size={17} strokeWidth={1.8} /><span>{name}</span>{count && <em>{count}</em>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-spacer" />
        <div className="progress-card">
          <div className="progress-heading"><Sparkles size={15} /><span>Tu espacio está listo</span></div>
          <p>Ya diste el primer paso para organizar tu negocio.</p>
          <div className="progress-track"><span /></div>
          <small>2 de 5 pasos completados</small>
        </div>
        <button className="nav-item quiet"><CircleHelp size={17} /><span>Centro de ayuda</span></button>
        <button className={`nav-item quiet ${activePage === 'Configuración' ? 'active' : ''}`} aria-current={activePage === 'Configuración' ? 'page' : undefined} onClick={() => { navigateTo('Configuración'); setActiveSetting('General'); setNotice(''); setMenuOpen(false) }}><Settings2 size={17} /><span>Configuración</span></button>
        <div className="profile-row"><div className="profile-avatar">AM</div><div className="profile-copy"><strong>Andrea Morales</strong><small>Administradora</small></div><MoreHorizontal size={18} /></div>
      </aside>

      {menuOpen && <button className="mobile-scrim" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />}

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Abrir menú" onClick={() => setMenuOpen(true)}><Menu size={19} /></button>
          <div className="breadcrumbs"><span>AES Nexus</span><span className="crumb-slash">/</span><strong>{activePage}</strong>{activePage === 'CRM' ? <> <span className="crumb-slash">/</span> <span>{crmSection}</span> </> : activePage === 'Ventas' ? <> <span className="crumb-slash">/</span> <span>{salesSection === 'Catálogo' ? 'Productos y servicios' : salesSection}</span> </> : activePage === 'Operaciones' ? <> <span className="crumb-slash">/</span> <span>{operationsSection === 'Inventario' ? 'Inventario por almacén' : operationsSection === 'Traslados' ? 'Traslados entre ubicaciones' : operationsSection === 'Compras' ? 'Compras y recepciones' : operationsSection === 'Entregas' ? 'Entregas y devoluciones' : 'Resumen operativo'}</span> </> : activePage === 'Finanzas' ? <> <span className="crumb-slash">/</span> <span>{financeSection === 'Cobros' ? 'Cuentas por cobrar y cobros' : financeSection === 'Pagos' ? 'Cuentas por pagar a proveedores' : financeSection === 'Pagos Bancarios' ? 'Pagos Bancarios Electrónicos (EBP)' : financeSection === 'Gastos' ? 'Gastos y egresos operativos' : financeSection === 'Cuentas contables' ? 'Cuentas contables' : 'Resumen financiero'}</span> </> : activePage === 'Administración' ? <> <span className="crumb-slash">/</span> <span>{adminSection === 'Departamentos' ? 'Departamentos de la organización' : adminSection === 'Ubicaciones' ? 'Ubicaciones y sedes físicas' : 'Resumen organizacional'}</span> </> : null}</div>
          <div className="topbar-actions">
            <span className="demo-pill"><i /> DEMO</span>

            <div className="notification-center-anchor" ref={notificationCenterRef}>
              <button
                type="button"
                className={`icon-button notification-button ${isNotificationCenterOpen ? 'active' : ''} ${lowStockItems.length > 0 && pushEnabled ? 'has-critical-alert' : ''}`}
                aria-label={`Centro de notificaciones: ${lowStockItems.length} alertas críticas de stock`}
                aria-expanded={isNotificationCenterOpen}
                onClick={() => setIsNotificationCenterOpen((prev) => !prev)}
                title="Centro de notificaciones del sistema"
              >
                <Bell size={18} />
                {lowStockItems.length > 0 && pushEnabled ? (
                  <span className="notification-count-badge" title={`${lowStockItems.length} alertas críticas de stock`}>
                    {lowStockItems.length}
                  </span>
                ) : (
                  <i />
                )}
              </button>

              {/* Dropdown del Centro de Notificaciones Superior */}
              {isNotificationCenterOpen && (
                <div className="notification-center-dropdown" role="region" aria-label="Centro de notificaciones superior">
                  <div className="notif-dropdown-header">
                    <div className="notif-header-title-box">
                      <BellRing size={15} style={{ color: '#456a61' }} />
                      <strong>Centro de Notificaciones</strong>
                    </div>
                    <div className="notif-header-meta">
                      <span className={`notif-push-status-tag ${pushEnabled ? 'active' : 'inactive'}`}>
                        {pushEnabled ? 'Push: Activo' : 'Push: Pausado'}
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
                              navigateToOperationsSection('Compras')
                            }}
                          >
                            <Package size={12} /> Compras
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

                    {/* Otras Notificaciones Operativas del ERP */}
                    <div className="notif-section-label">Avisos del Sistema</div>

                    <div className="notif-general-item">
                      <div className="notif-general-icon blue">📦</div>
                      <div className="notif-general-content">
                        <div className="notif-general-title">4 pedidos listos para despacho</div>
                        <div className="notif-general-desc">Pedidos de almacén Vallejo con empaque terminado pendientes de asignación de guía.</div>
                        <span className="notif-general-time">Hace 25 min · Operaciones</span>
                      </div>
                    </div>

                    <div className="notif-general-item">
                      <div className="notif-general-icon amber">💳</div>
                      <div className="notif-general-content">
                        <div className="notif-general-title">2 facturas por vencer en 5 días</div>
                        <div className="notif-general-desc">Documentos comerciales pendientes de cobro con clientes mayoristas.</div>
                        <span className="notif-general-time">Hace 1 h · Finanzas</span>
                      </div>
                    </div>

                    <div className="notif-general-item">
                      <div className="notif-general-icon green">🤝</div>
                      <div className="notif-general-content">
                        <div className="notif-general-title">Cotización corporativa aprobada</div>
                        <div className="notif-general-desc">Cliente Grupo Financiero del Centro confirmó cotización de equipo industrial.</div>
                        <span className="notif-general-time">Hoy, 09:15 · CRM</span>
                      </div>
                    </div>
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

            <div className="top-avatar">AM</div>
          </div>
        </header>

        <div className="page-content">
          {activePage === 'Configuración' ? (
            <SettingsSection
              activeSetting={activeSetting}
              onSelectSetting={(setting) => {
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
            />
          ) : activePage === 'CRM' ? (
            <section className="crm-page" aria-labelledby="crm-title">
              <div className="crm-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> AES NEXUS · H2 PILOTO COMERCIAL</div><h1 id="crm-title">CRM</h1><p>Organiza tus relaciones, conversaciones y oportunidades desde un solo lugar.</p></div></div>
              {notice && <div className="notice" role="status">{notice}<button aria-label="Cerrar aviso" onClick={() => setNotice('')}><X size={15} /></button></div>}
              <nav className="crm-tabs" aria-label="Secciones de CRM">
                <button className={crmSection === 'Resumen' ? 'active' : ''} onClick={() => navigateToCrmSection('Resumen')}>Resumen</button>
                <button className={crmSection === 'Clientes' ? 'active' : ''} onClick={() => navigateToCrmSection('Clientes')}>Clientes <span>{clientRecords.length}</span></button>
                <button className={crmSection === 'Proveedores' ? 'active' : ''} onClick={() => navigateToCrmSection('Proveedores')}>Proveedores <span>{supplierRecords.length}</span></button>
                <button className={crmSection === 'Empleados' ? 'active' : ''} onClick={() => navigateToCrmSection('Empleados')}>Empleados <span>{employees.length}</span></button>
                <button className={crmSection === 'Nómina' ? 'active' : ''} onClick={() => navigateToCrmSection('Nómina')}>Nómina <span>{payrollRuns.length}</span></button>
                <button className={crmSection === 'Oportunidades' ? 'active' : ''} onClick={() => navigateToCrmSection('Oportunidades')}>Oportunidades <span>{opportunityRecords.length}</span></button>
                <button className={crmSection === 'Actividades' ? 'active' : ''} onClick={() => navigateToCrmSection('Actividades')}>Actividades <span>{activityRecords.length}</span></button>
              </nav>
              {crmSection === 'Empleados' ? (
                <CrmEmployees
                  employees={employees}
                  departments={departments}
                  locations={locations}
                  installedPacks={ebpPacks}
                  onAddEmployee={(emp) => setEmployees((prev) => [emp, ...prev])}
                  onUpdateEmployee={(updated) =>
                    setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
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
                  onPayPayrollRun={handlePayPayrollRun}
                  onOpenEbpWizard={openEbpWizardForPayrollRun}
                />
              ) : crmSection === 'Oportunidades' ? <>
                <div className="crm-section-heading"><div><div className="panel-kicker">SEGUIMIENTO COMERCIAL</div><h2>Oportunidades</h2><p>Da seguimiento a las conversaciones que pueden convertirse en negocio.</p></div><div className="crm-section-heading-actions"><button className="button button-primary" onClick={() => openCreate('opportunity')}><Plus size={15} /> Nueva oportunidad</button><span className="demo-pill"><i /> DATOS DEMO</span></div></div>
                <div className="opportunity-summary"><article><span className="kpi-icon"><Target size={17} /></span><div><strong>{opportunityRecords.length}</strong><small>Abiertas</small></div></article><article><span className="kpi-icon icon-sand"><BriefcaseBusiness size={17} /></span><div><strong>{money(opportunityRecords.reduce((total, opportunity) => total + opportunity.value, 0))}</strong><small>Valor del pipeline</small></div></article><article><span className="kpi-icon icon-green"><ArrowUpRight size={17} /></span><div><strong>32%</strong><small>Tasa de conversión</small></div></article></div>
                <div className="opportunities-board"><div className="opportunities-board-heading"><h3>Pipeline reciente</h3><button className="button button-secondary" onClick={() => openCreate('opportunity')}><Plus size={14} /> Nueva oportunidad</button></div><div className="opportunities-list">{opportunityRecords.map((opportunity) => <article className="opportunity-row" key={`${opportunity.company}-${opportunity.date}`}><div className={`company-avatar ${opportunity.color}`}>{opportunity.initials}</div><div className="opportunity-main"><strong>{opportunity.company}</strong><span>{opportunity.person}</span></div><span className={`stage-badge stage-${opportunity.stageTone}`}><i />{opportunity.stage}</span><strong className="opportunity-value">{money(opportunity.value)}</strong><span className="date-cell">{opportunity.date}</span><button className="row-more" aria-label={`Opciones para ${opportunity.company}`} onClick={() => { setNotice(`Las acciones para ${opportunity.company} estarán disponibles al conectar el CRM.`); toast.info(`Las acciones para ${opportunity.company} estarán disponibles al conectar el CRM.`, 'Oportunidad') }}><MoreHorizontal size={17} /></button></article>)}</div></div>
              </> : crmSection === 'Actividades' ? <>
                <div className="crm-section-heading"><div><div className="panel-kicker">AGENDA COMERCIAL</div><h2>Actividades</h2><p>Reúne llamadas, seguimientos y tareas para que ninguna conversación se quede atrás.</p></div><div className="crm-section-heading-actions"><button className="button button-primary" onClick={() => openCreate('activity')}><Plus size={15} /> Nueva actividad</button><span className="demo-pill"><i /> DATOS DEMO</span></div></div>
                <div className="activities-layout"><div className="activities-card"><div className="activities-card-heading"><div><h3>Hoy · 06 de noviembre</h3><p>Tu agenda de seguimiento</p></div><button className="button button-secondary" onClick={() => openCreate('activity')}><Plus size={14} /> Nueva actividad</button></div><div className="activities-list">{activityRecords.map((activity) => <article className="activity-item" key={`${activity.title}-${activity.time}`}><div className={`activity-icon tone-${activity.tone}`}>{activity.icon === 'send' ? <ArrowRight size={15} /> : activity.icon === 'phone' ? <Clock3 size={15} /> : <Users size={15} />}</div><div className="activity-item-copy"><strong>{activity.title}</strong><span>{activity.company}</span></div><time>{activity.time}</time><button className="row-more" aria-label={`Completar ${activity.title}`} onClick={() => { setNotice(`La actividad “${activity.title}” se marcará al conectar el CRM.`); toast.info(`La actividad “${activity.title}” se marcará al conectar el CRM.`, 'Actividad') }}><Check size={15} /></button></article>)}</div></div><aside className="activities-side"><span className="kpi-icon"><CalendarDays size={17} /></span><strong>{activityRecords.length + 5} actividades</strong><p>programadas esta semana</p><button className="text-link" onClick={() => { setNotice('La agenda completa estará disponible en la siguiente iteración.'); toast.info('La agenda completa estará disponible en la siguiente iteración.', 'Agenda') }}>Ver calendario <ArrowRight size={13} /></button></aside></div>
              </> : crmSection === 'Clientes' || crmSection === 'Proveedores' ? <>
                <div className="crm-section-heading"><div><div className="panel-kicker">DIRECTORIO COMERCIAL</div><h2>{crmSection}</h2><p>{crmSection === 'Clientes' ? 'Personas y empresas con una relación comercial en tu espacio.' : 'Empresas y contactos que suministran productos o servicios a tu organización.'}</p></div><div className="crm-section-heading-actions">{crmSection === 'Clientes' ? <button className="button button-primary" onClick={() => openCreate('client')}><Plus size={15} /> Nuevo cliente</button> : <button className="button button-primary" onClick={() => openCreate('supplier')}><Plus size={15} /> Nuevo proveedor</button>}<span className="demo-pill"><i /> DATOS DEMO</span></div></div>
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
          {crmSection === 'Proveedores' ? (
            <button
              type="button"
              className="button-icon-action"
              onClick={() => setEditingSupplierBank(JSON.parse(JSON.stringify(client)))}
              title="Configurar datos bancarios y packs EBP del proveedor"
            >
              <Landmark size={12} /> Datos bancarios
            </button>
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
          )}
        </div>
      </td>
    </tr>
  )
})}</tbody></table>{filteredDirectory.length === 0 && <div className="clients-empty"><Users size={20} /><strong>No encontramos {crmSection.toLowerCase()}</strong><span>Prueba con otro nombre, empresa o estado.</span></div>}</div>
              </> : (
                <div className="crm-overview-grid">
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
                </div>
              )}
            </section>
          ) : activePage === 'Ventas' ? (
            <section className="crm-page sales-page" aria-labelledby="sales-title">
              <div className="crm-heading">
                <div>
                  <div className="eyebrow"><span className="eyebrow-line" /> AES NEXUS · H2 PILOTO COMERCIAL</div>
                  <h1 id="sales-title">Ventas</h1>
                  <p>Acompaña el proceso comercial desde el catálogo y pedidos hasta la emisión de facturas sincronizadas con Cuentas por cobrar.</p>
                </div>
              </div>
              {notice && <div className="notice" role="status">{notice}<button aria-label="Cerrar aviso" onClick={() => setNotice('')}><X size={15} /></button></div>}
              <nav className="crm-tabs" aria-label="Secciones de Ventas">
                <button
                  className={salesSection === 'Catálogo' ? 'active' : ''}
                  onClick={() => navigateToSalesSection('Catálogo')}
                >
                  Productos y servicios
                </button>
                <button
                  className={salesSection === 'Cotizaciones' ? 'active' : ''}
                  onClick={() => navigateToSalesSection('Cotizaciones')}
                >
                  Cotizaciones y propuestas <span>{quotes.length}</span>
                </button>
                <button
                  className={salesSection === 'Pedidos' ? 'active' : ''}
                  onClick={() => navigateToSalesSection('Pedidos')}
                >
                  Pedidos de venta <span>{orders.length}</span>
                </button>
                <button
                  className={salesSection === 'Facturas' ? 'active' : ''}
                  onClick={() => navigateToSalesSection('Facturas')}
                >
                  Facturas de venta <span>{receivables.length}</span>
                </button>
                <button
                  className={salesSection === 'Resumen' ? 'active' : ''}
                  onClick={() => navigateToSalesSection('Resumen')}
                >
                  Resumen
                </button>
              </nav>

              {salesSection === 'Catálogo' ? (
                <ProductsAndServices />
              ) : salesSection === 'Cotizaciones' ? (
                <QuotesSection
                  quotes={quotes}
                  onUpdateQuotes={setQuotes}
                  onConvertToOrder={handleConvertToOrder}
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
                  onNavigateToFinanceReceivables={() => navigateToFinanceSection('Cobros')}
                  onNavigateToOrder={(orderFolio) => {
                    setPresetOrderFolioToView(orderFolio)
                    navigateToSalesSection('Pedidos')
                  }}
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
          ) : activePage === 'Operaciones' ? (
            <section className="sales-page" aria-labelledby="operations-title">
              <div className="crm-heading">
                <div>
                  <div className="eyebrow"><span className="eyebrow-line" /> AES NEXUS · OPERACIONES Y LOGÍSTICA</div>
                  <h1 id="operations-title">Operaciones</h1>
                  <p>Control de existencias multi-almacén, compras a proveedores y logística de entregas.</p>
                </div>
              </div>

              <nav className="crm-tabs" aria-label="Secciones de Operaciones">
                <button
                  className={operationsSection === 'Inventario' ? 'active' : ''}
                  onClick={() => navigateToOperationsSection('Inventario')}
                >
                  Inventario por almacén <span>{inventory.length}</span>
                </button>
                <button
                  className={operationsSection === 'Traslados' ? 'active' : ''}
                  onClick={() => navigateToOperationsSection('Traslados')}
                >
                  Traslados entre ubicaciones <span>{transfers.length}</span>
                </button>
                <button
                  className={operationsSection === 'Compras' ? 'active' : ''}
                  onClick={() => navigateToOperationsSection('Compras')}
                >
                  Compras y recepciones <span>{purchaseOrders.length}</span>
                </button>
                <button
                  className={operationsSection === 'Entregas' ? 'active' : ''}
                  onClick={() => navigateToOperationsSection('Entregas')}
                >
                  Entregas y devoluciones <span>{shipments.length}</span>
                </button>
                <button
                  className={operationsSection === 'Resumen' ? 'active' : ''}
                  onClick={() => navigateToOperationsSection('Resumen')}
                >
                  Resumen operativo
                </button>
              </nav>

              {operationsSection === 'Inventario' ? (
                <OperationsInventory
                  warehouses={warehouses}
                  inventory={inventory}
                  transfers={transfers}
                  movements={movements}
                  onUpdateInventory={setInventory}
                  onUpdateTransfers={setTransfers}
                  onAddMovement={handleAddMovement}
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
                />
              ) : operationsSection === 'Entregas' ? (
                <OperationsDeliveries
                  shipments={shipments}
                  onUpdateShipments={setShipments}
                  salesOrderFolios={orders.map((o) => o.folio)}
                />
              ) : (
                <OperationsOverview
                  warehouses={warehouses}
                  inventory={inventory}
                  movements={movements}
                  purchaseOrders={purchaseOrders}
                  shipments={shipments}
                  onNavigateSection={(sec) => navigateToOperationsSection(sec)}
                />
              )}
            </section>
          ) : activePage === 'Finanzas' ? (
            <section className="sales-page" aria-labelledby="finance-title">
              <div className="crm-heading">
                <div>
                  <div className="eyebrow"><span className="eyebrow-line" /> AES NEXUS · FINANZAS Y TESORERÍA</div>
                  <h1 id="finance-title">Finanzas</h1>
                  <p>Flujo de caja, conciliación de cobranza a clientes, pasivos con proveedores y gastos operativos.</p>
                </div>
              </div>

              <nav className="crm-tabs" aria-label="Secciones de Finanzas">
                <button
                  className={financeSection === 'Cobros' ? 'active' : ''}
                  onClick={() => navigateToFinanceSection('Cobros')}
                >
                  Cuentas por cobrar <span>{receivables.length}</span>
                </button>
                <button
                  className={financeSection === 'Pagos' ? 'active' : ''}
                  onClick={() => navigateToFinanceSection('Pagos')}
                >
                  Cuentas por pagar <span>{payables.length}</span>
                </button>
                <button
                  className={financeSection === 'Pagos Bancarios' ? 'active' : ''}
                  onClick={() => navigateToFinanceSection('Pagos Bancarios')}
                >
                  Pagos Bancarios (EBP) <span>{ebpBatches.length}</span>
                </button>
                <button
                  className={financeSection === 'Gastos' ? 'active' : ''}
                  onClick={() => navigateToFinanceSection('Gastos')}
                >
                  Gastos y egresos <span>{expenses.length}</span>
                </button>
                <button
                  className={financeSection === 'Cuentas contables' ? 'active' : ''}
                  onClick={() => navigateToFinanceSection('Cuentas contables')}
                >
                  Cuentas contables <span>{chartAccounts.length}</span>
                </button>
                <button
                  className={financeSection === 'Resumen' ? 'active' : ''}
                  onClick={() => navigateToFinanceSection('Resumen')}
                >
                  Resumen financiero
                </button>
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
                    bankName: s.bankName,
                    clabe: s.clabe,
                    accountNumber: s.accountNumber,
                    defaultReference: s.defaultReference,
                    bankPackValues: s.bankPackValues,
                  }))}
                  payrollRuns={payrollRuns}
                  payables={payables}
                  onUpdatePacks={handleUpdateEbpPacks}
                  onCreateBatch={(batch) => setEbpBatches((prev) => [batch, ...prev])}
                  onApplyBatchInFinance={handleApplyEbpBatchInFinance}
                  onUpdateBankAccountPackValues={handleUpdateBankAccountPackValues}
                />
              ) : financeSection === 'Gastos' ? (
                <FinanceExpenses
                  expenses={expenses}
                  bankAccounts={bankAccounts}
                  onAddExpense={handleAddExpense}
                  onAddTransaction={handleAddTransaction}
                  onUpdateBankAccountBalance={handleUpdateBankAccountBalance}
                />
              ) : financeSection === 'Cuentas contables' ? (
                <FinanceAccounting
                  accounts={chartAccounts}
                  onUpdateAccounts={setChartAccounts}
                />
              ) : (
                <FinanceOverview
                  bankAccounts={bankAccounts}
                  receivables={receivables}
                  payables={payables}
                  expenses={expenses}
                  transactions={transactions}
                  onNavigateSection={(sec) => navigateToFinanceSection(sec)}
                />
              )}
            </section>
          ) : activePage === 'Administración' ? (
            <AdministrationSection
              departments={departments}
              locations={locations}
              onAddDepartment={handleAddDepartment}
              onAddLocation={handleAddLocation}
              onUpdateDepartments={setDepartments}
              onUpdateLocations={handleUpdateLocations}
              adminSection={adminSection}
              onNavigateSection={navigateToAdminSection}
            />
          ) : activePage === 'Inicio' ? (
            <ExecutiveDashboard
              orders={orders}
              quotes={quotes}
              inventory={inventory}
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
              onNavigateSales={navigateToSalesSection}
              onNavigateOperations={navigateToOperationsSection}
              onNavigateFinance={navigateToFinanceSection}
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

      {/* Modal: Configurar datos bancarios + Packs EBP del Proveedor */}
      {editingSupplierBank && (
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
                <div className="panel-kicker">PROVEEDOR · DISPERSIÓN BANCARIA EBP</div>
                <h2>{editingSupplierBank.company}</h2>
                <p>Configura CLABE, RFC y campos dinámicos exigidos por tus packs bancarios instalados.</p>
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
                setSupplierRecords((prev) =>
                  prev.map((s) =>
                    s.email === editingSupplierBank.email && s.company === editingSupplierBank.company
                      ? editingSupplierBank
                      : s
                  )
                )
                toast.success(
                  `Datos bancarios de ${editingSupplierBank.company} actualizados para lotes EBP.`,
                  'Proveedor actualizado'
                )
                setEditingSupplierBank(null)
              }}
            >
              <div className="form-grid-3">
                <label className="form-field">
                  <span>RFC</span>
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
                  <span>Banco receptor</span>
                  <input
                    value={editingSupplierBank.bankName || ''}
                    onChange={(e) =>
                      setEditingSupplierBank({ ...editingSupplierBank, bankName: e.target.value })
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Referencia predeterminada</span>
                  <input
                    value={editingSupplierBank.defaultReference || ''}
                    onChange={(e) =>
                      setEditingSupplierBank({
                        ...editingSupplierBank,
                        defaultReference: e.target.value,
                      })
                    }
                  />
                </label>
              </div>
              <div className="form-grid">
                <label className="form-field">
                  <span>CLABE interbancaria (18 dígitos)</span>
                  <input
                    className="mono"
                    maxLength={18}
                    value={editingSupplierBank.clabe || ''}
                    onChange={(e) =>
                      setEditingSupplierBank({ ...editingSupplierBank, clabe: e.target.value })
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Número de cuenta</span>
                  <input
                    className="mono"
                    value={editingSupplierBank.accountNumber || ''}
                    onChange={(e) =>
                      setEditingSupplierBank({
                        ...editingSupplierBank,
                        accountNumber: e.target.value,
                      })
                    }
                  />
                </label>
              </div>

              {ebpPacks.filter(
                (p) =>
                  p.installed &&
                  (p.operationType === 'vendor_payment' || p.operationType === 'both') &&
                  p.beneficiaryBankSchema.length > 0
              ).length > 0 && (
                <>
                  <div className="form-section-divider">
                    Campos específicos de Packs Bancarios EBP instalados
                  </div>
                  <div className="ebp-dynamic-packs-stack">
                    {ebpPacks
                      .filter(
                        (p) =>
                          p.installed &&
                          (p.operationType === 'vendor_payment' || p.operationType === 'both') &&
                          p.beneficiaryBankSchema.length > 0
                      )
                      .map((pack) => {
                        const vals = editingSupplierBank.bankPackValues?.[pack.id] || {}
                        return (
                          <div key={pack.id} className="ebp-dynamic-pack-subbox">
                            <div className="ebp-subbox-title">
                              <strong>{pack.name}</strong>
                              <span className="emp-code-pill">{pack.bankName}</span>
                            </div>
                            <div className="form-grid">
                              {pack.beneficiaryBankSchema.map((field) => {
                                const val = vals[field.key] ?? field.defaultValue ?? ''
                                const err = validateEbpFieldValue(
                                  field,
                                  val,
                                  pack.embeddedCatalogs
                                )
                                const cat = field.catalogRef
                                  ? pack.embeddedCatalogs[field.catalogRef]
                                  : undefined
                                return (
                                  <label key={field.key} className="form-field">
                                    <span>
                                      {field.label} {field.validators.required ? '*' : ''}
                                    </span>
                                    {field.type === 'select_catalog' && cat ? (
                                      <select
                                        value={val}
                                        onChange={(e) =>
                                          setEditingSupplierBank({
                                            ...editingSupplierBank,
                                            bankPackValues: {
                                              ...(editingSupplierBank.bankPackValues || {}),
                                              [pack.id]: { ...vals, [field.key]: e.target.value },
                                            },
                                          })
                                        }
                                      >
                                        <option value="">Selecciona opción...</option>
                                        {cat.options.map((opt) => (
                                          <option key={opt.code} value={opt.code}>
                                            {opt.label}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <input
                                        value={val}
                                        placeholder={field.placeholder}
                                        onChange={(e) =>
                                          setEditingSupplierBank({
                                            ...editingSupplierBank,
                                            bankPackValues: {
                                              ...(editingSupplierBank.bankPackValues || {}),
                                              [pack.id]: { ...vals, [field.key]: e.target.value },
                                            },
                                          })
                                        }
                                      />
                                    )}
                                    {err && <small className="ebp-field-err">{err}</small>}
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </>
              )}

              <div className="create-modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setEditingSupplierBank(null)}
                >
                  Cancelar
                </button>
                <button type="submit" className="button button-primary">
                  <Check size={14} /> Guardar datos bancarios
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

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

      {/* Global EBP Batch Wizard Modal (launched from CRM Payroll or Finance Payables) */}
      {globalEbpWizard.isOpen && (
        <EbpBatchWizardModal
          isOpen={globalEbpWizard.isOpen}
          batchType={globalEbpWizard.batchType}
          sourceRefId={globalEbpWizard.sourceRefId}
          sourceFolio={globalEbpWizard.sourceFolio}
          candidates={globalEbpWizard.candidates}
          packs={ebpPacks}
          bankAccounts={bankAccounts}
          existingBatchesCount={ebpBatches.length}
          onClose={() => setGlobalEbpWizard((prev) => ({ ...prev, isOpen: false }))}
          onUpdateBankAccountPackValues={handleUpdateBankAccountPackValues}
          onCreateBatch={(batch) => {
            setEbpBatches((prev) => [batch, ...prev])
            navigateToFinanceSection('Pagos Bancarios')
          }}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}
