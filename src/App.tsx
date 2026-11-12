import { useEffect, useState, type FormEvent } from 'react'
import {
  ArrowRight, ArrowUpRight, Bell, BriefcaseBusiness,
  CalendarDays, ChevronDown, CircleHelp, Clock3,
  FolderKanban, LayoutDashboard, Menu,
  MoreHorizontal, Plus, Search, Settings2, ShoppingBag, Sparkles,
  Target, Users, WalletCards, Warehouse as WarehouseIcon, ShieldCheck, X, Building2,
  UserRoundPlus, LockKeyhole, Plug, CreditCard, Mail,
  ClipboardList, Globe2, Palette, Check, Moon, Sun, MapPin,
} from 'lucide-react'
import { activities, opportunities } from './data/dashboard'
import { ExecutiveDashboard } from './components/ExecutiveDashboard'
import { createClientApi, type ClientAddress } from './services/clientService'
import CountryDropdown, { countries, findCountry } from './components/CountryDropdown'
import { CountryFlag } from './components/CountryFlag'
import { ToastProvider, useToast } from './components/Toast'
import { ProductsAndServices } from './components/ProductsAndServices'
import { QuotesSection } from './components/QuotesSection'
import { OrdersSection } from './components/OrdersSection'
import { SalesOverview } from './components/SalesOverview'
import { initialQuotes, initialOrders, type Quote, type SalesOrder } from './data/sales'
import { initialProductsAndServices } from './data/products'
import { OperationsInventory } from './components/OperationsInventory'
import { OperationsPurchases } from './components/OperationsPurchases'
import { OperationsDeliveries } from './components/OperationsDeliveries'
import { OperationsOverview } from './components/OperationsOverview'
import {
  initialWarehouses,
  initialInventory,
  initialMovements,
  initialPurchaseOrders,
  initialShipments,
  type Warehouse,
  type InventoryItemLocation,
  type StockMovement,
  type PurchaseOrder,
  type ShipmentDelivery,
} from './data/operations'
import { FinanceReceivables } from './components/FinanceReceivables'
import { FinancePayables } from './components/FinancePayables'
import { FinanceExpenses } from './components/FinanceExpenses'
import { FinanceOverview } from './components/FinanceOverview'
import { FinanceAccounting } from './components/FinanceAccounting'
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
  CRM: { icon: Users, phase: 'H2 · Piloto comercial', description: 'Centraliza las relaciones y el seguimiento comercial de tu organización.', areas: ['Empresas y contactos', 'Oportunidades y pipeline', 'Actividades y seguimiento'] },
  Ventas: { icon: ShoppingBag, phase: 'H2 · Piloto comercial', description: 'Acompaña el proceso desde una cotización hasta la confirmación del pedido.', areas: ['Catálogo de productos y servicios', 'Cotizaciones y aprobaciones', 'Pedidos de venta'] },
  Operaciones: { icon: WarehouseIcon, phase: 'H3 · MVP operativo', description: 'Organiza el movimiento de productos desde compras y recepción hasta la entrega.', areas: ['Inventario por almacén', 'Compras y recepciones', 'Entregas y devoluciones'] },
  Finanzas: { icon: WalletCards, phase: 'H3 · MVP operativo', description: 'Da seguimiento a saldos, cobros, pagos y gastos con finanzas operativas.', areas: ['Cuentas por cobrar y cobros', 'Cuentas por pagar', 'Gastos y reportes'] },
  Administración: { icon: ShieldCheck, phase: 'H1 · Núcleo del sistema', description: 'Configura la organización, el acceso de las personas y los controles de operación.', areas: ['Organización y entidad legal', 'Usuarios, membresías y roles', 'Auditoría y configuración'] },
} as const

type DirectoryRecord = {
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
  addresses?: ClientAddress[]
}

const clients: DirectoryRecord[] = [
  { name: 'Sofía Ramírez', company: 'Estudio Nómada', email: 'sofia@estudionomada.mx', phone: '55 2184 6301', status: 'Activo', lastActivity: 'Hoy', initials: 'SR', color: 'lilac', rfc: 'ENO190520AB1', entityType: 'company', currency: 'MXN', paymentTerms: 'Contado', country: 'MX', city: 'CDMX', addresses: [{ id: 'a1', street: 'Colima 245, Roma Norte', city: 'Ciudad de México', state: 'CDMX', zipCode: '06700', country: 'MX', isShipping: true, isBilling: true }] },
  { name: 'Diego Fernández', company: 'Taller Norte', email: 'diego@tallernorte.mx', phone: '81 3045 1120', status: 'Activo', lastActivity: 'Ayer', initials: 'DF', color: 'peach', rfc: 'FED901102XX3', entityType: 'individual', currency: 'MXN', paymentTerms: 'Crédito 15 días', country: 'MX', city: 'Monterrey', addresses: [{ id: 'a2', street: 'Av. Constitución 1400', city: 'Monterrey', state: 'Nuevo León', zipCode: '64000', country: 'MX', isShipping: true, isBilling: false }] },
  { name: 'Valentina Ruiz', company: 'Casa Oliva', email: 'valentina@casaoliva.mx', phone: '33 1470 9822', status: 'Prospecto', lastActivity: 'Ayer', initials: 'VR', color: 'sage', rfc: 'COL210314TY7', entityType: 'company', currency: 'MXN', paymentTerms: 'Contado', country: 'MX', city: 'Guadalajara', addresses: [{ id: 'a3', street: 'Av. Chapultepec 480', city: 'Guadalajara', state: 'Jalisco', zipCode: '44160', country: 'MX', isShipping: false, isBilling: true }] },
  { name: 'Mateo Cruz', company: 'Lumen Studio', email: 'mateo@lumenstudio.mx', phone: '55 7740 2108', status: 'Activo', lastActivity: '12 nov', initials: 'MC', color: 'blue', rfc: 'LUM180905MK8', entityType: 'company', currency: 'MXN', paymentTerms: 'Crédito 30 días', country: 'MX', city: 'CDMX' },
  { name: 'Camila Torres', company: 'Punto Cero', email: 'camila@puntocero.mx', phone: '55 4402 7718', status: 'Inactivo', lastActivity: '28 oct', initials: 'CT', color: 'amber', rfc: 'PCE160719881', entityType: 'company', currency: 'MXN', paymentTerms: 'Contado', country: 'MX', city: 'Puebla' },
]

const suppliers: DirectoryRecord[] = [
  { name: 'Distribuidora Atlas', company: 'Atlas Comercial', email: 'contacto@atlascomercial.mx', phone: '55 3055 4820', status: 'Activo', lastActivity: 'Hoy', initials: 'DA', color: 'blue', country: 'MX', city: 'CDMX', addresses: [{ id: 's1', street: 'Calz. Vallejo 1020, Bodega 4', city: 'Azcapotzalco', state: 'CDMX', zipCode: '02300', country: 'MX', isShipping: true, isBilling: true }] },
  { name: 'Papelería Central', company: 'Central de Insumos', email: 'ventas@centralinsumos.mx', phone: '81 2104 6651', status: 'Activo', lastActivity: '3 nov', initials: 'PC', color: 'sage', country: 'MX' },
  { name: 'Logística del Valle', company: 'Logística del Valle', email: 'operaciones@logisticavalle.mx', phone: '33 3810 9920', status: 'Prospecto', lastActivity: '30 oct', initials: 'LV', color: 'lilac', country: 'MX' },
  { name: 'Servicios Nube', company: 'Nube Digital', email: 'soporte@nubedigital.mx', phone: '55 7284 1176', status: 'Activo', lastActivity: '25 oct', initials: 'SN', color: 'peach', country: 'MX' },
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

const settingsGroups = [
  { label: 'ESPACIO DE TRABAJO', items: [{ name: 'General', icon: Settings2 }, { name: 'Organización', icon: Building2 }, { name: 'Idioma y región', icon: Globe2 }] },
  { label: 'PERSONAS Y ACCESO', items: [{ name: 'Usuarios', icon: UserRoundPlus }, { name: 'Roles y permisos', icon: ShieldCheck }, { name: 'Seguridad', icon: LockKeyhole }] },
  { label: 'PREFERENCIAS', items: [{ name: 'Apariencia', icon: Palette }, { name: 'Notificaciones', icon: Mail }, { name: 'Auditoría', icon: ClipboardList }] },
  { label: 'SERVICIOS', items: [{ name: 'Integraciones', icon: Plug }, { name: 'Plan y facturación', icon: CreditCard }] },
]

const settingsDetails: Record<string, { description: string; rows: { label: string; description: string; value: string }[] }> = {
  General: { description: 'Administra los datos principales y las preferencias de tu espacio de trabajo.', rows: [
    { label: 'Nombre del espacio', description: 'Así lo identifican las personas de tu organización.', value: 'Brújula Estudio' },
    { label: 'País principal', description: 'Define el contexto inicial de operación.', value: 'México' },
    { label: 'Moneda de reporte', description: 'Moneda usada para presentar los reportes de la organización.', value: 'MXN · Peso mexicano' },
  ] },
  Organización: { description: 'Consulta la estructura legal y operativa de tu organización.', rows: [
    { label: 'Entidad legal', description: 'El MVP contempla una entidad por organización.', value: '1 entidad · Modelo ampliable' },
    { label: 'Identificador fiscal', description: 'Se configurará cuando se habilite el módulo fiscal.', value: 'Sin configurar' },
  ] },
  'Idioma y región': { description: 'Configura el idioma y las preferencias regionales de la interfaz.', rows: [
    { label: 'Idioma de la interfaz', description: 'Idioma predeterminado para este espacio.', value: 'Español (México)' },
    { label: 'Zona horaria', description: 'Usada para mostrar fechas y actividades.', value: 'Ciudad de México · UTC−06:00' },
    { label: 'Formato de fecha', description: 'Preferencia de visualización regional.', value: 'DD/MM/AAAA' },
  ] },
  Apariencia: { description: 'Personaliza el color de acento de AES Nexus. El fondo blanco se mantiene para conservar la claridad de lectura.', rows: [] },
  Usuarios: { description: 'Administra quién puede acceder al espacio de trabajo.', rows: [
    { label: 'Personas activas', description: 'Miembros con acceso al espacio.', value: '1 usuario · Andrea Morales' },
    { label: 'Invitaciones pendientes', description: 'Invitaciones que aún no se aceptan.', value: 'Ninguna' },
  ] },
  'Roles y permisos': { description: 'Controla el acceso a módulos y acciones según las responsabilidades.', rows: [
    { label: 'Administradora', description: 'Acceso completo a la configuración del espacio.', value: '1 persona' },
    { label: 'Roles personalizados', description: 'Disponibles al completar la base de identidad y permisos.', value: 'Próxima fase' },
  ] },
  Seguridad: { description: 'Revisa los controles de acceso y protección de la cuenta.', rows: [
    { label: 'Autenticación multifactor', description: 'La política MFA se definirá antes del inicio de H1.', value: 'Pendiente de configuración' },
    { label: 'Sesiones activas', description: 'Consulta y revoca sesiones de la organización.', value: 'Disponible al habilitar identidad' },
  ] },
  Notificaciones: { description: 'Elige qué novedades del sistema quieres recibir.', rows: [
    { label: 'Actividad comercial', description: 'Avisos sobre seguimientos y cambios de oportunidades.', value: 'Preferencias disponibles próximamente' },
    { label: 'Actualizaciones del sistema', description: 'Avisos de mantenimiento y nuevas funciones.', value: 'Preferencias disponibles próximamente' },
  ] },
  Auditoría: { description: 'Consulta el historial de cambios relevantes de tu organización.', rows: [
    { label: 'Registro de actividad', description: 'El registro auditable forma parte del núcleo H1.', value: 'En preparación' },
    { label: 'Retención de eventos', description: 'La política se definirá antes de almacenar actividad real.', value: 'Pendiente' },
  ] },
  Integraciones: { description: 'Conecta AES Nexus con las herramientas que ya usa tu equipo.', rows: [
    { label: 'Proveedores fiscales', description: 'La evaluación de PAC para México continúa en Fase 0.', value: 'Sin conexión' },
    { label: 'API y webhooks', description: 'Se definirán después de establecer los contratos de API.', value: 'Próxima fase' },
  ] },
  'Plan y facturación': { description: 'Consulta el plan de tu espacio y las opciones de suscripción.', rows: [
    { label: 'Plan actual', description: 'Este espacio es una demostración del producto.', value: 'Demo · Sin costo' },
    { label: 'Suscripción', description: 'La gestión comercial de planes pertenece a H4.', value: 'No configurada' },
  ] },
}

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
    : pathname === '/sales/summary' || pathname === '/ventas/resumen'
    ? 'Resumen'
    : 'Catálogo'

const operationsSectionFromPath = (pathname: string) =>
  pathname === '/operations/purchases' || pathname === '/operations/compras' || pathname === '/operaciones/compras'
    ? 'Compras'
    : pathname === '/operations/deliveries' || pathname === '/operations/entregas' || pathname === '/operaciones/entregas'
    ? 'Entregas'
    : pathname === '/operations/summary' || pathname === '/operations/resumen' || pathname === '/operaciones/resumen'
    ? 'Resumen'
    : 'Inventario'

const financeSectionFromPath = (pathname: string) =>
  pathname === '/finance/accounting' || pathname === '/finance/cuentas-contables' || pathname === '/finanzas/cuentas-contables'
    ? 'Cuentas contables'
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
  const [salesSection, setSalesSection] = useState<'Catálogo' | 'Cotizaciones' | 'Pedidos' | 'Resumen'>(() => salesSectionFromPath(window.location.pathname))
  const [operationsSection, setOperationsSection] = useState<'Inventario' | 'Compras' | 'Entregas' | 'Resumen'>(() => operationsSectionFromPath(window.location.pathname))
  const [financeSection, setFinanceSection] = useState<'Cobros' | 'Pagos' | 'Gastos' | 'Cuentas contables' | 'Resumen'>(() => financeSectionFromPath(window.location.pathname))
  const [adminSection, setAdminSection] = useState<'Departamentos' | 'Ubicaciones' | 'Resumen'>(() => adminSectionFromPath(window.location.pathname))
  const [quotes, setQuotes] = useState<Quote[]>(initialQuotes)
  const [orders, setOrders] = useState<SalesOrder[]>(initialOrders)
  const [warehouses] = useState<Warehouse[]>(initialWarehouses)
  const [inventory, setInventory] = useState<InventoryItemLocation[]>(initialInventory)
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
  }

  const handleUpdateBankAccountBalance = (accountId: string, delta: number) => {
    setBankAccounts((prev) =>
      prev.map((acc) => (acc.id === accountId ? { ...acc, balance: acc.balance + delta } : acc))
    )
  }

  const handleConvertToOrder = (quote: Quote) => {
    const nextNum = orders.length + 1
    const folio = `PED-2026-${String(nextNum).padStart(3, '0')}`
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
  const [clientQuery, setClientQuery] = useState('')
  const [clientStatus, setClientStatus] = useState('Todos')
  const [clientRecords, setClientRecords] = useState<DirectoryRecord[]>(clients)
  const [supplierRecords, setSupplierRecords] = useState(suppliers)
  const [opportunityRecords, setOpportunityRecords] = useState(opportunities)
  const [activityRecords, setActivityRecords] = useState(activities)
  const [createKind, setCreateKind] = useState<CreateKind | null>(null)
  const [createForm, setCreateForm] = useState({
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
  })
  const [clientForm, setClientForm] = useState({
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

  const navigateToFinanceSection = (section: 'Cobros' | 'Pagos' | 'Gastos' | 'Cuentas contables' | 'Resumen') => {
    setActivePage('Finanzas')
    setFinanceSection(section)
    const route =
      section === 'Cuentas contables'
        ? '/finance/accounting'
        : section === 'Pagos'
        ? '/finance/payables'
        : section === 'Gastos'
        ? '/finance/expenses'
        : section === 'Resumen'
        ? '/finance/summary'
        : '/finance'
    if (window.location.pathname !== route) window.history.pushState({}, '', route)
  }

  const navigateToOperationsSection = (section: 'Inventario' | 'Compras' | 'Entregas' | 'Resumen') => {
    setActivePage('Operaciones')
    setOperationsSection(section)
    const route =
      section === 'Compras'
        ? '/operations/purchases'
        : section === 'Entregas'
        ? '/operations/deliveries'
        : section === 'Resumen'
        ? '/operations/summary'
        : '/operations'
    if (window.location.pathname !== route) window.history.pushState({}, '', route)
  }

  const navigateToSalesSection = (section: 'Catálogo' | 'Cotizaciones' | 'Pedidos' | 'Resumen') => {
    setActivePage('Ventas')
    setSalesSection(section)
    const route =
      section === 'Cotizaciones'
        ? '/sales/quotes'
        : section === 'Pedidos'
        ? '/sales/orders'
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
    })
    setClientForm({
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
    const matchesQuery = !query || `${client.name} ${client.company} ${client.email} ${client.rfc || ''} ${client.country || ''} ${countryName}`.toLowerCase().includes(query)
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
          <div className="breadcrumbs"><span>AES Nexus</span><span className="crumb-slash">/</span><strong>{activePage}</strong>{activePage === 'CRM' ? <> <span className="crumb-slash">/</span> <span>{crmSection}</span> </> : activePage === 'Ventas' ? <> <span className="crumb-slash">/</span> <span>{salesSection === 'Catálogo' ? 'Productos y servicios' : salesSection}</span> </> : activePage === 'Operaciones' ? <> <span className="crumb-slash">/</span> <span>{operationsSection === 'Inventario' ? 'Inventario por almacén' : operationsSection === 'Compras' ? 'Compras y recepciones' : operationsSection === 'Entregas' ? 'Entregas y devoluciones' : 'Resumen operativo'}</span> </> : activePage === 'Finanzas' ? <> <span className="crumb-slash">/</span> <span>{financeSection === 'Cobros' ? 'Cuentas por cobrar y cobros' : financeSection === 'Pagos' ? 'Cuentas por pagar a proveedores' : financeSection === 'Gastos' ? 'Gastos y egresos operativos' : financeSection === 'Cuentas contables' ? 'Cuentas contables' : 'Resumen financiero'}</span> </> : activePage === 'Administración' ? <> <span className="crumb-slash">/</span> <span>{adminSection === 'Departamentos' ? 'Departamentos de la organización' : adminSection === 'Ubicaciones' ? 'Ubicaciones y sedes físicas' : 'Resumen organizacional'}</span> </> : null}</div>
          <div className="topbar-actions"><span className="demo-pill"><i /> DEMO</span><button className="icon-button notification-button" aria-label="Notificaciones" onClick={() => toast.info('No tienes notificaciones pendientes. Todo está al día.', 'Centro de notificaciones')}><Bell size={18} /><i /></button><div className="top-avatar">AM</div></div>
        </header>

        <div className="page-content">
          {activePage === 'Configuración' ? (
            <section className="settings-page" aria-labelledby="settings-title">
              <div className="settings-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> AES NEXUS · ESPACIO DE TRABAJO</div><h1 id="settings-title">Configuración</h1><p>Administra las preferencias y el acceso de tu organización desde un solo lugar.</p></div><span className="settings-demo-label">Datos de demostración</span></div>
              {notice && <div className="notice" role="status">{notice}<button aria-label="Cerrar aviso" onClick={() => setNotice('')}><X size={15} /></button></div>}
              <div className="settings-layout">
                <nav className="settings-nav" aria-label="Menú de configuración">
                  {settingsGroups.map((group) => <div className="settings-nav-group" key={group.label}><p className="nav-label">{group.label}</p>{group.items.map(({ name, icon: Icon }) => <button key={name} className={`settings-nav-item ${activeSetting === name ? 'active' : ''}`} aria-current={activeSetting === name ? 'page' : undefined} onClick={() => { setActiveSetting(name); setNotice('') }}><Icon size={16} strokeWidth={1.8} /><span>{name}</span></button>)}</div>)}
                </nav>
                <div className="settings-panel">
                  <div className="settings-panel-heading"><div><h2>{activeSetting}</h2><p>{settingsDetails[activeSetting].description}</p></div><button className="button button-secondary" onClick={() => { setNotice('La edición se habilitará cuando la configuración se conecte al backend.'); toast.info('La edición se habilitará cuando la configuración se conecte al backend.', 'Configuración') }}>Editar</button></div>
                  {activeSetting === 'Apariencia' ? <div className="appearance-card">
                    <div className="appearance-card-heading"><div><h3>Color de acento</h3><p>Elige el color que acompaña a la paleta blanca de AES Nexus.</p></div><span className="appearance-current"><i style={{ backgroundColor: accentOptions.find((option) => option.id === accentTheme)?.color }} />{accentOptions.find((option) => option.id === accentTheme)?.label}</span></div>
                    <div className="appearance-options" role="group" aria-label="Opciones de color de acento">
                      {accentOptions.map((option) => <button key={option.id} className={`appearance-option ${accentTheme === option.id ? 'selected' : ''}`} aria-pressed={accentTheme === option.id} onClick={() => { setAccentTheme(option.id); window.localStorage.setItem('aes-nexus-accent', option.id); toast.info(`Color de acento actualizado a ${option.label}.`, 'Apariencia') }}>
                        <span className="appearance-swatch" style={{ backgroundColor: option.color }}>{accentTheme === option.id && <Check size={17} />}</span><span className="appearance-option-copy"><strong>{option.label}</strong><small>{option.description}</small></span>{accentTheme === option.id && <span className="appearance-selected">Seleccionado</span>}
                      </button>)}
                    </div>
                    <div className="appearance-mode-row"><div className="appearance-mode-copy"><span className="appearance-mode-icon">{darkMode ? <Moon size={16} /> : <Sun size={16} />}</span><span><strong>Modo oscuro</strong><small>Reduce el brillo de la interfaz para trabajar con menos luz.</small></span></div><button className={`theme-toggle ${darkMode ? 'on' : ''}`} type="button" role="switch" aria-checked={darkMode} aria-label="Activar modo oscuro" onClick={() => { const nextMode = !darkMode; setDarkMode(nextMode); window.localStorage.setItem('aes-nexus-dark-mode', String(nextMode)); toast.info(nextMode ? 'Modo oscuro activado.' : 'Modo claro activado.', 'Tema visual') }}><span /></button></div>
                    <div className="appearance-preview"><div className="appearance-preview-copy"><span className="panel-kicker">VISTA PREVIA</span><strong>{darkMode ? 'Una paleta oscura para tu espacio' : 'Una paleta clara para tu espacio'}</strong><small>El color de acento aparece en botones, selección y detalles de navegación.</small></div><button className="button button-primary" type="button">Acción principal</button></div>
                  </div> : <div className="settings-card">{settingsDetails[activeSetting].rows.map((row) => <div className="settings-row" key={row.label}><div><h3>{row.label}</h3><p>{row.description}</p></div><span className="settings-value">{row.value}</span></div>)}</div>}
                  <p className="settings-footnote">{activeSetting === 'Apariencia' ? 'La preferencia se guarda en este navegador.' : 'La configuración de esta pantalla es ilustrativa y todavía no se guarda.'}</p>
                </div>
              </div>
            </section>
          ) : activePage === 'CRM' ? (
            <section className="crm-page" aria-labelledby="crm-title">
              <div className="crm-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> AES NEXUS · H2 PILOTO COMERCIAL</div><h1 id="crm-title">CRM</h1><p>Organiza tus relaciones, conversaciones y oportunidades desde un solo lugar.</p></div></div>
              {notice && <div className="notice" role="status">{notice}<button aria-label="Cerrar aviso" onClick={() => setNotice('')}><X size={15} /></button></div>}
              <nav className="crm-tabs" aria-label="Secciones de CRM">
                <button className={crmSection === 'Resumen' ? 'active' : ''} onClick={() => navigateToCrmSection('Resumen')}>Resumen</button>
                <button className={crmSection === 'Clientes' ? 'active' : ''} onClick={() => navigateToCrmSection('Clientes')}>Clientes <span>{clientRecords.length}</span></button>
                <button className={crmSection === 'Proveedores' ? 'active' : ''} onClick={() => navigateToCrmSection('Proveedores')}>Proveedores <span>{supplierRecords.length}</span></button>
                <button className={crmSection === 'Oportunidades' ? 'active' : ''} onClick={() => navigateToCrmSection('Oportunidades')}>Oportunidades <span>{opportunityRecords.length}</span></button>
                <button className={crmSection === 'Actividades' ? 'active' : ''} onClick={() => navigateToCrmSection('Actividades')}>Actividades <span>{activityRecords.length}</span></button>
              </nav>
              {crmSection === 'Oportunidades' ? <>
                <div className="crm-section-heading"><div><div className="panel-kicker">SEGUIMIENTO COMERCIAL</div><h2>Oportunidades</h2><p>Da seguimiento a las conversaciones que pueden convertirse en negocio.</p></div><div className="crm-section-heading-actions"><button className="button button-primary" onClick={() => openCreate('opportunity')}><Plus size={15} /> Nueva oportunidad</button><span className="demo-pill"><i /> DATOS DEMO</span></div></div>
                <div className="opportunity-summary"><article><span className="kpi-icon"><Target size={17} /></span><div><strong>{opportunityRecords.length}</strong><small>Abiertas</small></div></article><article><span className="kpi-icon icon-sand"><BriefcaseBusiness size={17} /></span><div><strong>{money(opportunityRecords.reduce((total, opportunity) => total + opportunity.value, 0))}</strong><small>Valor del pipeline</small></div></article><article><span className="kpi-icon icon-green"><ArrowUpRight size={17} /></span><div><strong>32%</strong><small>Tasa de conversión</small></div></article></div>
                <div className="opportunities-board"><div className="opportunities-board-heading"><h3>Pipeline reciente</h3><button className="button button-secondary" onClick={() => openCreate('opportunity')}><Plus size={14} /> Nueva oportunidad</button></div><div className="opportunities-list">{opportunityRecords.map((opportunity) => <article className="opportunity-row" key={`${opportunity.company}-${opportunity.date}`}><div className={`company-avatar ${opportunity.color}`}>{opportunity.initials}</div><div className="opportunity-main"><strong>{opportunity.company}</strong><span>{opportunity.person}</span></div><span className={`stage-badge stage-${opportunity.stageTone}`}><i />{opportunity.stage}</span><strong className="opportunity-value">{money(opportunity.value)}</strong><span className="date-cell">{opportunity.date}</span><button className="row-more" aria-label={`Opciones para ${opportunity.company}`} onClick={() => { setNotice(`Las acciones para ${opportunity.company} estarán disponibles al conectar el CRM.`); toast.info(`Las acciones para ${opportunity.company} estarán disponibles al conectar el CRM.`, 'Oportunidad') }}><MoreHorizontal size={17} /></button></article>)}</div></div>
              </> : crmSection === 'Actividades' ? <>
                <div className="crm-section-heading"><div><div className="panel-kicker">AGENDA COMERCIAL</div><h2>Actividades</h2><p>Reúne llamadas, seguimientos y tareas para que ninguna conversación se quede atrás.</p></div><div className="crm-section-heading-actions"><button className="button button-primary" onClick={() => openCreate('activity')}><Plus size={15} /> Nueva actividad</button><span className="demo-pill"><i /> DATOS DEMO</span></div></div>
                <div className="activities-layout"><div className="activities-card"><div className="activities-card-heading"><div><h3>Hoy · 06 de noviembre</h3><p>Tu agenda de seguimiento</p></div><button className="button button-secondary" onClick={() => openCreate('activity')}><Plus size={14} /> Nueva actividad</button></div><div className="activities-list">{activityRecords.map((activity) => <article className="activity-item" key={`${activity.title}-${activity.time}`}><div className={`activity-icon tone-${activity.tone}`}>{activity.icon === 'send' ? <ArrowRight size={15} /> : activity.icon === 'phone' ? <Clock3 size={15} /> : <Users size={15} />}</div><div className="activity-item-copy"><strong>{activity.title}</strong><span>{activity.company}</span></div><time>{activity.time}</time><button className="row-more" aria-label={`Completar ${activity.title}`} onClick={() => { setNotice(`La actividad “${activity.title}” se marcará al conectar el CRM.`); toast.info(`La actividad “${activity.title}” se marcará al conectar el CRM.`, 'Actividad') }}><Check size={15} /></button></article>)}</div></div><aside className="activities-side"><span className="kpi-icon"><CalendarDays size={17} /></span><strong>{activityRecords.length + 5} actividades</strong><p>programadas esta semana</p><button className="text-link" onClick={() => { setNotice('La agenda completa estará disponible en la siguiente iteración.'); toast.info('La agenda completa estará disponible en la siguiente iteración.', 'Agenda') }}>Ver calendario <ArrowRight size={13} /></button></aside></div>
              </> : crmSection === 'Clientes' || crmSection === 'Proveedores' ? <>
                <div className="crm-section-heading"><div><div className="panel-kicker">DIRECTORIO COMERCIAL</div><h2>{crmSection}</h2><p>{crmSection === 'Clientes' ? 'Personas y empresas con una relación comercial en tu espacio.' : 'Empresas y contactos que suministran productos o servicios a tu organización.'}</p></div><div className="crm-section-heading-actions">{crmSection === 'Clientes' ? <button className="button button-primary" onClick={() => openCreate('client')}><Plus size={15} /> Nuevo cliente</button> : <button className="button button-primary" onClick={() => openCreate('supplier')}><Plus size={15} /> Nuevo proveedor</button>}<span className="demo-pill"><i /> DATOS DEMO</span></div></div>
                <div className="clients-toolbar"><label className="clients-search"><Search size={15} /><input aria-label="Buscar clientes" value={clientQuery} onChange={(event) => setClientQuery(event.target.value)} placeholder="Buscar por nombre, empresa, correo o RFC" /></label><select aria-label="Filtrar clientes por estado" value={clientStatus} onChange={(event) => setClientStatus(event.target.value)}><option>Todos</option><option>Activo</option><option>Prospecto</option><option>Inactivo</option></select></div>
                <div className="clients-summary"><span><strong>{filteredDirectory.length}</strong> de {crmSection === 'Clientes' ? clientRecords.length : supplierRecords.length} registros visibles</span><span>Última actualización: hace unos momentos</span></div>
                <div className="clients-table-wrap"><table className="clients-table"><thead><tr><th>{crmSection === 'Clientes' ? 'CLIENTE / EMPRESA' : 'PROVEEDOR'}</th><th>CONTACTO</th><th>ESTADO</th><th>ÚLTIMA ACTIVIDAD</th><th><span className="sr-only">Opciones</span></th></tr></thead><tbody>{filteredDirectory.map((client) => {
  const countryObj = findCountry(client.country)
  return (
    <tr key={client.email}>
      <td>
        <div className="company-cell">
          <div className={`company-avatar ${client.color}`}>{client.initials}</div>
          <div>
            <strong>{client.company}</strong>
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
          </div>
        </div>
      </td>
      <td><div className="client-contact"><span>{client.email}</span><small>{client.phone}</small></div></td>
      <td><span className={`client-status status-${client.status.toLowerCase()}`}><i />{client.status}</span></td>
      <td className="date-cell">{client.lastActivity}</td>
      <td><button className="row-more" aria-label={`Opciones para ${client.name}`} onClick={() => { setNotice(`Las acciones para ${client.name} estarán disponibles al conectar el CRM.`); toast.info(`Las acciones para ${client.name} estarán disponibles al conectar el CRM.`, 'Opciones') }}><MoreHorizontal size={17} /></button></td>
    </tr>
  )
})}</tbody></table>{filteredDirectory.length === 0 && <div className="clients-empty"><Users size={20} /><strong>No encontramos {crmSection.toLowerCase()}</strong><span>Prueba con otro nombre, empresa o estado.</span></div>}</div>
              </> : <div className="crm-overview-grid"><article className="crm-overview-card crm-overview-highlight"><span className="kpi-icon"><Users size={17} /></span><div><strong>{clientRecords.length}</strong><span>Clientes y prospectos</span></div><button className="text-link" onClick={() => navigateToCrmSection('Clientes')}>Ver clientes <ArrowRight size={13} /></button></article><article className="crm-overview-card"><span className="kpi-icon icon-lilac"><Target size={17} /></span><div><strong>12</strong><span>Oportunidades abiertas</span></div><button className="text-link" onClick={() => { setNotice('El pipeline estará disponible en la siguiente iteración.'); toast.info('El pipeline estará disponible en la siguiente iteración.', 'CRM') }}>Ver pipeline <ArrowRight size={13} /></button></article><article className="crm-overview-card"><span className="kpi-icon icon-sand"><Clock3 size={17} /></span><div><strong>8</strong><span>Actividades esta semana</span></div><button className="text-link" onClick={() => { setNotice('La agenda estará disponible en la siguiente iteración.'); toast.info('La agenda estará disponible en la siguiente iteración.', 'CRM') }}>Ver agenda <ArrowRight size={13} /></button></article></div>}
            </section>
          ) : activePage === 'Ventas' ? (
            <section className="crm-page sales-page" aria-labelledby="sales-title">
              <div className="crm-heading">
                <div>
                  <div className="eyebrow"><span className="eyebrow-line" /> AES NEXUS · H2 PILOTO COMERCIAL</div>
                  <h1 id="sales-title">Ventas</h1>
                  <p>Acompaña el proceso comercial desde el catálogo de productos y servicios hasta la confirmación de pedidos.</p>
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
              ) : (
                <SalesOverview
                  quotes={quotes}
                  orders={orders}
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
                  movements={movements}
                  onUpdateInventory={setInventory}
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
              onUpdateLocations={setLocations}
              adminSection={adminSection}
              onNavigateSection={navigateToAdminSection}
            />
          ) : activePage === 'Inicio' ? (
            <ExecutiveDashboard
              orders={orders}
              quotes={quotes}
              inventory={inventory}
              onUpdateInventory={setInventory}
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
                    <span>Razón Social / Empresa *</span>
                    <input
                      required
                      autoFocus
                      value={clientForm.company}
                      onChange={(event) => setClientForm({ ...clientForm, company: event.target.value })}
                      placeholder="Ej. Distribuidora del Norte S.A. de C.V."
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
                <label className="form-field"><span>Nombre del contacto *</span><input required autoFocus value={createForm.name} onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })} placeholder="Ej. Laura Méndez" /></label>
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
