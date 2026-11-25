import { useState, useMemo, useEffect } from 'react'
import {
  Building2,
  MapPin,
  Plus,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  Users,
  Layers,
  ArrowRight,
  ShieldCheck,
  History,
  Download,
  ArrowDownUp,
  Clock3,
  CalendarDays,
  Laptop,
  Globe,
  LogIn,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Package,
  Wallet,
  ShoppingBag,
  Settings,
  Plug,
  Activity,
  RefreshCw,
  PlusCircle,
  ArrowLeftRight,
  Landmark,
  Pencil,
  Trash2,
  Check,
  GitBranch,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import { useToast } from './Toast'
import { useI18n } from '../i18n/I18nContext'
import {
  AUDIT_CHANGED_EVENT,
  USERS_CHANGED_EVENT,
  loadStoredAuditEvents,
  loadStoredWorkspaceUsers,
  type AuditCategory,
  type AuditCrudOperation,
  type AuditEventRecord,
  type WorkspaceUserRecord,
} from '../data/settings'
import type { EmployeeRecord } from '../data/employees'
import type { PurchaseOrder, Warehouse } from '../data/operations'
import type { PurchaseRequisition } from '../data/purchases'
import type { BillPayable } from '../data/finance'
import {
  DEFAULT_RETURN_WORKFLOWS,
  type CustomerReturn,
  type ReturnWorkflowsSettings,
  type SupplierReturn,
} from '../data/returns'
import { ReturnWorkflowsPanel } from './ReturnWorkflowsPanel'
import { SubsidiaryDetailView } from './SubsidiaryDetailView'

export interface SubsidiaryRecord {
  id: string
  code: string
  name: string
  legalName: string
  taxId: string
  country: string
  currency: string
  legalRep?: string
  fiscalAddress?: string
  isHolding?: boolean
  active: boolean
}

export interface DepartmentRecord {
  id: string
  code: string
  name: string
  leader: string
  costCenter?: string
  description?: string
  subsidiaryIds: string[]
  active: boolean
}

export type LocationType =
  | 'Oficina corporativa'
  | 'Sucursal'
  | 'Almacén / Bodega'
  | 'Taller / Operación'
  | 'Punto de venta'

export interface PhysicalLocationRecord {
  id: string
  code: string
  name: string
  type: LocationType
  address: string
  city: string
  state: string
  country: string
  manager?: string
  subsidiaryIds: string[]
  active: boolean
}

export type AdminSectionTab =
  | 'Subsidiarias'
  | 'Departamentos'
  | 'Ubicaciones'
  | 'Flujos de devoluciones'
  | 'Resumen'
  | 'Historial de Auditoría'

interface AdministrationSectionProps {
  subsidiaries: SubsidiaryRecord[]
  departments: DepartmentRecord[]
  locations: PhysicalLocationRecord[]
  employees?: EmployeeRecord[]
  warehouses?: Warehouse[]
  purchaseOrders?: PurchaseOrder[]
  requisitions?: PurchaseRequisition[]
  payables?: BillPayable[]
  returnWorkflows?: ReturnWorkflowsSettings
  customerReturns?: CustomerReturn[]
  supplierReturns?: SupplierReturn[]
  onUpdateReturnWorkflows?: (next: ReturnWorkflowsSettings, summaryDetail: string) => void
  onNavigateReturns?: (kind: 'customer' | 'supplier') => void
  onAddSubsidiary: (sub: SubsidiaryRecord) => void
  onUpdateSubsidiaries: (subs: SubsidiaryRecord[]) => void
  onDeleteSubsidiary?: (subsidiaryId: string) => void
  onAddDepartment: (dep: DepartmentRecord) => void
  onAddLocation: (loc: PhysicalLocationRecord) => void
  onUpdateDepartments: (deps: DepartmentRecord[]) => void
  onDeleteDepartment?: (departmentId: string) => void
  onUpdateLocations: (locs: PhysicalLocationRecord[]) => void
  onDeleteLocation?: (locationId: string) => void
  adminSection: AdminSectionTab
  onNavigateSection: (sec: AdminSectionTab) => void
  selectedSubsidiaryId?: string | null
  onSelectSubsidiary?: (id: string | null) => void
  allowedSections?: AdminSectionTab[]
  currentUserName?: string
  canCreateInTab?: (tab: AdminSectionTab) => boolean
  canEditInTab?: (tab: AdminSectionTab) => boolean
  canDeleteInTab?: (tab: AdminSectionTab) => boolean
}

const LOCATION_TYPES: LocationType[] = [
  'Oficina corporativa',
  'Sucursal',
  'Almacén / Bodega',
  'Taller / Operación',
  'Punto de venta',
]

type AdminAuditFilter = 'all' | AuditCategory

type AuditActionKind = 'all' | 'create' | 'update' | 'delete' | 'status' | 'transaction' | 'access'

const AUDIT_CATEGORY_META: Record<
  AuditCategory,
  { label: string; shortLabel: string; toneClass: string; chartColor: string }
> = {
  session: { label: 'Inicio de sesión', shortLabel: 'Sesiones', toneClass: 'cat-session', chartColor: '#0f766e' },
  sales: { label: 'Facturación y Ventas', shortLabel: 'Ventas', toneClass: 'cat-sales', chartColor: '#3b6fd8' },
  users: { label: 'Roles y Usuarios', shortLabel: 'Usuarios', toneClass: 'cat-users', chartColor: '#7b5cd6' },
  inventory: { label: 'Inventario y Compras', shortLabel: 'Operaciones', toneClass: 'cat-inventory', chartColor: '#2d8458' },
  finance: { label: 'Finanzas', shortLabel: 'Finanzas', toneClass: 'cat-finance', chartColor: '#c47625' },
  admin: { label: 'Administración', shortLabel: 'Admin', toneClass: 'cat-admin', chartColor: '#456a61' },
  settings: { label: 'Configuración', shortLabel: 'Configuración', toneClass: 'cat-settings', chartColor: '#547082' },
  security: { label: 'Seguridad', shortLabel: 'Seguridad', toneClass: 'cat-security', chartColor: '#be4b4b' },
  integrations: { label: 'Integraciones', shortLabel: 'Integraciones', toneClass: 'cat-integrations', chartColor: '#6b649c' },
}

const AUDIT_ACTION_META: Record<
  Exclude<AuditActionKind, 'all'>,
  { label: string; shortLabel: string; toneClass: string }
> = {
  create: { label: 'Alta / Creación', shortLabel: 'Creación', toneClass: 'act-create' },
  update: { label: 'Modificación / Ajuste', shortLabel: 'Modificación', toneClass: 'act-update' },
  delete: { label: 'Eliminación / Baja', shortLabel: 'Eliminación', toneClass: 'act-delete' },
  status: { label: 'Estado / Aprobación', shortLabel: 'Estado', toneClass: 'act-status' },
  transaction: { label: 'Operación / Movimiento', shortLabel: 'Operación', toneClass: 'act-transaction' },
  access: { label: 'Acceso / Sesión', shortLabel: 'Acceso', toneClass: 'act-access' },
}

function classifyAuditActionKind(
  category: AuditCategory,
  actionText: string,
  crudOperation?: AuditCrudOperation
): Exclude<AuditActionKind, 'all'> {
  const normalized = actionText.toLowerCase()
  if (crudOperation === 'DELETE') {
    return 'delete'
  }
  if (crudOperation === 'CREATE') {
    return 'create'
  }
  if (
    /eliminación|elimina|baja|borrad|supresión|remov/.test(normalized)
  ) {
    return 'delete'
  }
  if (
    category === 'session' ||
    /inicio de sesión|sesión|acceso confirmado|2fa|doble factor/.test(normalized)
  ) {
    return 'access'
  }
  if (
    /cambio de estado|activad|desactivad|suspendid|reactivar|aprobad|rechazad|pausad|habilitad/.test(
      normalized
    )
  ) {
    return 'status'
  }
  if (
    /dispersión|movimiento|recepción|pago|gasto|factura de proveedor|entrada|salida|transferencia|traslado/.test(
      normalized
    )
  ) {
    return 'transaction'
  }
  if (
    /creación|alta|generación|nuevo|nueva|registro|conversión|invitación|invitad|agregar/.test(
      normalized
    )
  ) {
    return 'create'
  }
  return 'update'
}

function renderAuditModuleIcon(category: AuditCategory) {
  switch (category) {
    case 'session':
      return <LogIn size={13} aria-hidden="true" />
    case 'sales':
      return <ShoppingBag size={13} aria-hidden="true" />
    case 'users':
      return <Users size={13} aria-hidden="true" />
    case 'inventory':
      return <Package size={13} aria-hidden="true" />
    case 'finance':
      return <Wallet size={13} aria-hidden="true" />
    case 'admin':
      return <Building2 size={13} aria-hidden="true" />
    case 'settings':
      return <Settings size={13} aria-hidden="true" />
    case 'security':
      return <ShieldCheck size={13} aria-hidden="true" />
    case 'integrations':
      return <Plug size={13} aria-hidden="true" />
  }
}

export function AdministrationSection({
  subsidiaries,
  departments,
  locations,
  employees = [],
  warehouses = [],
  purchaseOrders = [],
  requisitions = [],
  payables = [],
  returnWorkflows = DEFAULT_RETURN_WORKFLOWS,
  customerReturns = [],
  supplierReturns = [],
  onUpdateReturnWorkflows,
  onNavigateReturns,
  onAddSubsidiary,
  onUpdateSubsidiaries,
  onDeleteSubsidiary,
  onAddDepartment,
  onAddLocation,
  onUpdateDepartments,
  onDeleteDepartment,
  onUpdateLocations,
  onDeleteLocation,
  adminSection,
  onNavigateSection,
  selectedSubsidiaryId: controlledSubsidiaryId,
  onSelectSubsidiary,
  allowedSections,
  currentUserName = 'Andrea Morales',
  canCreateInTab,
  canEditInTab,
  canDeleteInTab,
}: AdministrationSectionProps) {
  const toast = useToast()
  const { t, formatDate, formatTime } = useI18n()

  const canCreateSub = canCreateInTab ? canCreateInTab('Subsidiarias') : true
  const canEditSub = canEditInTab ? canEditInTab('Subsidiarias') : true
  const canDeleteSub = (canDeleteInTab ? canDeleteInTab('Subsidiarias') : true) && Boolean(onDeleteSubsidiary)
  const canEditWorkflows = canEditInTab ? canEditInTab('Flujos de devoluciones') : true

  const canCreateDept = canCreateInTab ? canCreateInTab('Departamentos') : true
  const canEditDept = canEditInTab ? canEditInTab('Departamentos') : true
  const canDeleteDept = (canDeleteInTab ? canDeleteInTab('Departamentos') : true) && Boolean(onDeleteDepartment)

  const canCreateLoc = canCreateInTab ? canCreateInTab('Ubicaciones') : true
  const canEditLoc = canEditInTab ? canEditInTab('Ubicaciones') : true
  const canDeleteLoc = (canDeleteInTab ? canDeleteInTab('Ubicaciones') : true) && Boolean(onDeleteLocation)

  // Search queries & filters
  const [uncontrolledSubsidiaryId, setUncontrolledSubsidiaryId] = useState<string | null>(null)
  const selectedSubsidiaryId =
    controlledSubsidiaryId !== undefined ? controlledSubsidiaryId : uncontrolledSubsidiaryId
  const setSelectedSubsidiaryId = (id: string | null) => {
    if (onSelectSubsidiary) {
      onSelectSubsidiary(id)
    } else {
      setUncontrolledSubsidiaryId(id)
    }
  }
  const [subsidiarySearch, setSubsidiarySearch] = useState('')
  const [subsidiaryStatusFilter, setSubsidiaryStatusFilter] = useState<'Todas' | 'Activas' | 'Inactivas'>('Todas')
  const [departmentSearch, setDepartmentSearch] = useState('')
  const [deptSubsidiaryFilter, setDeptSubsidiaryFilter] = useState<string>('Todas')
  const [locationSearch, setLocationSearch] = useState('')
  const [locationTypeFilter, setLocationTypeFilter] = useState<string>('Todos')
  const [locSubsidiaryFilter, setLocSubsidiaryFilter] = useState<string>('Todas')

  useEffect(() => {
    if (adminSection !== 'Subsidiarias' && controlledSubsidiaryId === undefined) {
      setUncontrolledSubsidiaryId(null)
    }
  }, [adminSection, controlledSubsidiaryId])

  const openSubsidiaryDetail = (id: string) => {
    if (onSelectSubsidiary) {
      onSelectSubsidiary(id)
      return
    }
    setUncontrolledSubsidiaryId(id)
    if (adminSection !== 'Subsidiarias') {
      onNavigateSection('Subsidiarias')
    }
  }

  // Audit history state (synchronized with global audit store & workspace users)
  const [auditEvents, setAuditEvents] = useState<AuditEventRecord[]>(() =>
    loadStoredAuditEvents()
  )
  const [workspaceUsers, setWorkspaceUsers] = useState<WorkspaceUserRecord[]>(() =>
    loadStoredWorkspaceUsers()
  )
  const [auditSearch, setAuditSearch] = useState('')
  const [auditFilter, setAuditFilter] = useState<AdminAuditFilter>('all')
  const [auditActionKindFilter, setAuditActionKindFilter] = useState<AuditActionKind>('all')
  const [auditSpecificActionFilter, setAuditSpecificActionFilter] = useState<string>('all')
  const [auditUserFilter, setAuditUserFilter] = useState<string>('all')
  const [auditDateFrom, setAuditDateFrom] = useState<string>('')
  const [auditDateTo, setAuditDateTo] = useState<string>('')
  const [auditSortOrder, setAuditSortOrder] = useState<'desc' | 'asc'>('desc')
  const [timelineChartMode, setTimelineChartMode] = useState<'activity' | 'sessions'>('activity')
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null)

  useEffect(() => {
    const syncAudit = () => setAuditEvents(loadStoredAuditEvents())
    const syncUsers = () => setWorkspaceUsers(loadStoredWorkspaceUsers())
    window.addEventListener(AUDIT_CHANGED_EVENT, syncAudit)
    window.addEventListener(USERS_CHANGED_EVENT, syncUsers)
    window.addEventListener('storage', syncAudit)
    window.addEventListener('storage', syncUsers)
    return () => {
      window.removeEventListener(AUDIT_CHANGED_EVENT, syncAudit)
      window.removeEventListener(USERS_CHANGED_EVENT, syncUsers)
      window.removeEventListener('storage', syncAudit)
      window.removeEventListener('storage', syncUsers)
    }
  }, [])

  // Modals state
  const [isSubsidiaryModalOpen, setIsSubsidiaryModalOpen] = useState(false)
  const [editingSubsidiary, setEditingSubsidiary] = useState<SubsidiaryRecord | null>(null)
  const [confirmingDeleteSubsidiary, setConfirmingDeleteSubsidiary] = useState(false)

  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<DepartmentRecord | null>(null)
  const [confirmingDeleteDept, setConfirmingDeleteDept] = useState(false)

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<PhysicalLocationRecord | null>(null)
  const [confirmingDeleteLoc, setConfirmingDeleteLoc] = useState(false)

  // Subsidiary form state
  const [subCode, setSubCode] = useState('')
  const [subName, setSubName] = useState('')
  const [subLegalName, setSubLegalName] = useState('')
  const [subTaxId, setSubTaxId] = useState('')
  const [subCountry, setSubCountry] = useState('México')
  const [subCurrency, setSubCurrency] = useState('MXN')
  const [subLegalRep, setSubLegalRep] = useState('')
  const [subFiscalAddress, setSubFiscalAddress] = useState('')
  const [subIsHolding, setSubIsHolding] = useState(false)
  const [subLinkedDeptIds, setSubLinkedDeptIds] = useState<string[]>([])
  const [subLinkedLocationIds, setSubLinkedLocationIds] = useState<string[]>([])

  // Department form state
  const [deptCode, setDeptCode] = useState('')
  const [deptName, setDeptName] = useState('')
  const [deptLeader, setDeptLeader] = useState('')
  const [deptCostCenter, setDeptCostCenter] = useState('')
  const [deptDescription, setDeptDescription] = useState('')
  const [deptSubsidiaryIds, setDeptSubsidiaryIds] = useState<string[]>([])

  // Location form state
  const [locCode, setLocCode] = useState('')
  const [locName, setLocName] = useState('')
  const [locType, setLocType] = useState<LocationType>('Sucursal')
  const [locAddress, setLocAddress] = useState('')
  const [locCity, setLocCity] = useState('')
  const [locState, setLocState] = useState('')
  const [locCountry, setLocCountry] = useState('México')
  const [locManager, setLocManager] = useState('')
  const [locSubsidiaryIds, setLocSubsidiaryIds] = useState<string[]>([])

  const subsidiaryById = useMemo(() => {
    const map = new Map<string, SubsidiaryRecord>()
    subsidiaries.forEach((s) => map.set(s.id, s))
    return map
  }, [subsidiaries])

  const filteredSubsidiaries = useMemo(() => {
    const q = subsidiarySearch.toLowerCase().trim()
    return subsidiaries.filter((s) => {
      const matchStatus =
        subsidiaryStatusFilter === 'Todas' ||
        (subsidiaryStatusFilter === 'Activas' ? s.active : !s.active)
      const matchQuery =
        !q ||
        s.code.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.legalName.toLowerCase().includes(q) ||
        s.taxId.toLowerCase().includes(q) ||
        s.country.toLowerCase().includes(q) ||
        s.currency.toLowerCase().includes(q) ||
        (s.legalRep && s.legalRep.toLowerCase().includes(q))
      return matchStatus && matchQuery
    })
  }, [subsidiaries, subsidiarySearch, subsidiaryStatusFilter])

  // Filtered departments
  const filteredDepartments = useMemo(() => {
    const q = departmentSearch.toLowerCase().trim()
    return departments.filter((d) => {
      const matchSub =
        deptSubsidiaryFilter === 'Todas' ||
        (deptSubsidiaryFilter === 'unassigned'
          ? (d.subsidiaryIds || []).length === 0
          : (d.subsidiaryIds || []).includes(deptSubsidiaryFilter))
      const matchQuery =
        !q ||
        d.code.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        d.leader.toLowerCase().includes(q) ||
        (d.costCenter && d.costCenter.toLowerCase().includes(q)) ||
        (d.description && d.description.toLowerCase().includes(q))
      return matchSub && matchQuery
    })
  }, [departments, departmentSearch, deptSubsidiaryFilter])

  // Filtered locations
  const filteredLocations = useMemo(() => {
    const q = locationSearch.toLowerCase().trim()
    return locations.filter((loc) => {
      const matchType = locationTypeFilter === 'Todos' || loc.type === locationTypeFilter
      const matchSub =
        locSubsidiaryFilter === 'Todas' ||
        (locSubsidiaryFilter === 'unassigned'
          ? (loc.subsidiaryIds || []).length === 0
          : (loc.subsidiaryIds || []).includes(locSubsidiaryFilter))
      const matchQuery =
        !q ||
        loc.code.toLowerCase().includes(q) ||
        loc.name.toLowerCase().includes(q) ||
        loc.city.toLowerCase().includes(q) ||
        loc.state.toLowerCase().includes(q) ||
        loc.address.toLowerCase().includes(q) ||
        (loc.manager && loc.manager.toLowerCase().includes(q))
      return matchType && matchSub && matchQuery
    })
  }, [locations, locationSearch, locationTypeFilter, locSubsidiaryFilter])

  const resolveEventText = (ev: AuditEventRecord) => ({
    actionText: ev.seedKey ? t(`settings.audit.${ev.seedKey}.action` as const) : ev.action,
    detailText: ev.seedKey ? t(`settings.audit.${ev.seedKey}.detail` as const) : ev.detail,
  })

  const auditUserOptions = useMemo(() => {
    const countsByNormalized = new Map<string, { name: string; count: number }>()
    const registerName = (rawName: string, increment: boolean) => {
      const clean = rawName.trim()
      if (!clean) return
      const key = clean.toLowerCase()
      const existing = countsByNormalized.get(key)
      if (existing) {
        if (increment) existing.count += 1
      } else {
        countsByNormalized.set(key, { name: clean, count: increment ? 1 : 0 })
      }
    }

    auditEvents.forEach((ev) => registerName(ev.user, true))
    employees.forEach((emp) => registerName(emp.fullName, false))
    workspaceUsers.forEach((usr) => registerName(usr.name, false))

    return Array.from(countsByNormalized.values()).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return a.name.localeCompare(b.name, 'es')
    })
  }, [auditEvents, employees, workspaceUsers])

  const toLocalDateKey = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const todayDateKey = toLocalDateKey(new Date())
  const sevenDaysAgoDateKey = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 6)
    return toLocalDateKey(d)
  })()
  const monthStartDateKey = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  })()

  const activeDatePreset = useMemo(() => {
    if (!auditDateFrom && !auditDateTo) return 'all'
    if (auditDateFrom === todayDateKey && auditDateTo === todayDateKey) return 'today'
    if (auditDateFrom === sevenDaysAgoDateKey && auditDateTo === todayDateKey) return '7d'
    if (auditDateFrom === monthStartDateKey && auditDateTo === todayDateKey) return 'month'
    return 'custom'
  }, [auditDateFrom, auditDateTo, todayDateKey, sevenDaysAgoDateKey, monthStartDateKey])

  const auditSpecificActionOptions = useMemo(() => {
    const counts = new Map<string, number>()
    auditEvents.forEach((ev) => {
      if (auditFilter !== 'all' && ev.category !== auditFilter) return
      const { actionText } = resolveEventText(ev)
      const kind = classifyAuditActionKind(ev.category, actionText, ev.crudOperation)
      if (auditActionKindFilter !== 'all' && kind !== auditActionKindFilter) return
      counts.set(actionText, (counts.get(actionText) || 0) + 1)
    })
    return Array.from(counts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => a.action.localeCompare(b.action, 'es'))
  }, [auditEvents, auditFilter, auditActionKindFilter, t])

  const auditBaseScopedEvents = useMemo(() => {
    const q = auditSearch.trim().toLowerCase()
    const userFilterKey = auditUserFilter.trim().toLowerCase()
    const hasBothDates = Boolean(auditDateFrom && auditDateTo)
    const rangeStart = hasBothDates && auditDateFrom > auditDateTo ? auditDateTo : auditDateFrom
    const rangeEnd = hasBothDates && auditDateFrom > auditDateTo ? auditDateFrom : auditDateTo

    return auditEvents.filter((ev) => {
      const userMatch =
        auditUserFilter === 'all' || ev.user.trim().toLowerCase() === userFilterKey
      if (!userMatch) return false

      if (rangeStart || rangeEnd) {
        const evDateKey = toLocalDateKey(new Date(ev.timestampIso))
        if (rangeStart && evDateKey < rangeStart) return false
        if (rangeEnd && evDateKey > rangeEnd) return false
      }

      if (!q) return true
      const { actionText, detailText } = resolveEventText(ev)
      const catLabel = AUDIT_CATEGORY_META[ev.category]?.label || ev.category
      const actionKindLabel =
        AUDIT_ACTION_META[classifyAuditActionKind(ev.category, actionText, ev.crudOperation)].label
      const metaText = ev.sessionMeta
        ? `${ev.sessionMeta.roleLabel} ${ev.sessionMeta.ipAddress} ${ev.sessionMeta.deviceBrowser}`.toLowerCase()
        : ''
      const entityMetaText = `${ev.userId || ''} ${ev.crudOperation || ''} ${ev.entityType || ''} ${ev.entityId || ''}`.toLowerCase()
      return (
        actionText.toLowerCase().includes(q) ||
        detailText.toLowerCase().includes(q) ||
        ev.user.toLowerCase().includes(q) ||
        catLabel.toLowerCase().includes(q) ||
        actionKindLabel.toLowerCase().includes(q) ||
        metaText.includes(q) ||
        entityMetaText.includes(q)
      )
    })
  }, [auditEvents, auditSearch, auditUserFilter, auditDateFrom, auditDateTo, t])

  const moduleFilterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: auditBaseScopedEvents.length }
    auditBaseScopedEvents.forEach((ev) => {
      const { actionText } = resolveEventText(ev)
      const kind = classifyAuditActionKind(ev.category, actionText, ev.crudOperation)
      if (auditActionKindFilter !== 'all' && kind !== auditActionKindFilter) return
      if (auditSpecificActionFilter !== 'all' && actionText !== auditSpecificActionFilter) return
      counts[ev.category] = (counts[ev.category] || 0) + 1
    })
    return counts
  }, [auditBaseScopedEvents, auditActionKindFilter, auditSpecificActionFilter, t])

  const actionKindCounts = useMemo(() => {
    const counts: Record<AuditActionKind, number> = {
      all: 0,
      create: 0,
      update: 0,
      delete: 0,
      status: 0,
      transaction: 0,
      access: 0,
    }
    auditBaseScopedEvents.forEach((ev) => {
      if (auditFilter !== 'all' && ev.category !== auditFilter) return
      const { actionText } = resolveEventText(ev)
      const kind = classifyAuditActionKind(ev.category, actionText, ev.crudOperation)
      counts.all += 1
      counts[kind] += 1
    })
    return counts
  }, [auditBaseScopedEvents, auditFilter, t])

  const filteredAuditEvents = useMemo(() => {
    const list = auditBaseScopedEvents.filter((ev) => {
      if (auditFilter !== 'all' && ev.category !== auditFilter) return false
      const { actionText } = resolveEventText(ev)
      if (
        auditActionKindFilter !== 'all' &&
        classifyAuditActionKind(ev.category, actionText, ev.crudOperation) !== auditActionKindFilter
      ) {
        return false
      }
      if (auditSpecificActionFilter !== 'all' && actionText !== auditSpecificActionFilter) {
        return false
      }
      return true
    })

    return [...list].sort((a, b) => {
      const ta = new Date(a.timestampIso).getTime()
      const tb = new Date(b.timestampIso).getTime()
      return auditSortOrder === 'desc' ? tb - ta : ta - tb
    })
  }, [
    auditBaseScopedEvents,
    auditFilter,
    auditActionKindFilter,
    auditSpecificActionFilter,
    auditSortOrder,
    t,
  ])

  const groupedAuditTimeline = useMemo(() => {
    const yesterdayDate = new Date()
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    const yesterdayKey = toLocalDateKey(yesterdayDate)
    const dayHeaderFmt = new Intl.DateTimeFormat('es-MX', {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })

    const groups: Array<{
      dateKey: string
      headingLabel: string
      events: AuditEventRecord[]
      moduleBreakdown: Array<{ category: AuditCategory; label: string; count: number }>
    }> = []

    const mapByKey = new Map<string, AuditEventRecord[]>()
    filteredAuditEvents.forEach((ev) => {
      const key = toLocalDateKey(new Date(ev.timestampIso))
      const bucket = mapByKey.get(key)
      if (bucket) {
        bucket.push(ev)
      } else {
        mapByKey.set(key, [ev])
      }
    })

    mapByKey.forEach((events, dateKey) => {
      const sampleDate = new Date(events[0].timestampIso)
      const formatted = dayHeaderFmt.format(sampleDate)
      const capitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1)
      const prefix =
        dateKey === todayDateKey ? 'Hoy · ' : dateKey === yesterdayKey ? 'Ayer · ' : ''
      const modCounts = new Map<AuditCategory, number>()
      events.forEach((e) => modCounts.set(e.category, (modCounts.get(e.category) || 0) + 1))
      const moduleBreakdown = Array.from(modCounts.entries()).map(([category, count]) => ({
        category,
        label: AUDIT_CATEGORY_META[category]?.shortLabel || category,
        count,
      }))
      groups.push({
        dateKey,
        headingLabel: `${prefix}${capitalized}`,
        events,
        moduleBreakdown,
      })
    })

    return groups
  }, [filteredAuditEvents, todayDateKey])

  const todayAuditCount = useMemo(
    () => auditEvents.filter((ev) => toLocalDateKey(new Date(ev.timestampIso)) === todayDateKey).length,
    [auditEvents, todayDateKey]
  )

  const timelineChartData = useMemo(() => {
    const sourceEvents =
      timelineChartMode === 'sessions'
        ? auditEvents.filter((ev) => {
            if (ev.category !== 'session') return false
            if (
              auditUserFilter !== 'all' &&
              ev.user.trim().toLowerCase() !== auditUserFilter.trim().toLowerCase()
            ) {
              return false
            }
            return true
          })
        : auditBaseScopedEvents.filter((ev) => {
            if (auditFilter !== 'all' && ev.category !== auditFilter) return false
            const { actionText } = resolveEventText(ev)
            if (
              auditActionKindFilter !== 'all' &&
              classifyAuditActionKind(ev.category, actionText, ev.crudOperation) !== auditActionKindFilter
            ) {
              return false
            }
            if (auditSpecificActionFilter !== 'all' && actionText !== auditSpecificActionFilter) {
              return false
            }
            return true
          })

    type DayBucket = {
      total: number
      users: Set<string>
      sales: number
      inventory: number
      finance: number
      usersMods: number
      adminSystem: number
      session: number
    }

    const bucketByDate = new Map<string, DayBucket>()
    let earliestKey = todayDateKey
    let latestKey = todayDateKey

    sourceEvents.forEach((ev) => {
      const key = toLocalDateKey(new Date(ev.timestampIso))
      if (key < earliestKey) earliestKey = key
      if (key > latestKey) latestKey = key
      let bucket = bucketByDate.get(key)
      if (!bucket) {
        bucket = {
          total: 0,
          users: new Set(),
          sales: 0,
          inventory: 0,
          finance: 0,
          usersMods: 0,
          adminSystem: 0,
          session: 0,
        }
        bucketByDate.set(key, bucket)
      }
      bucket.total += 1
      bucket.users.add(ev.user)
      if (ev.category === 'sales') bucket.sales += 1
      else if (ev.category === 'inventory') bucket.inventory += 1
      else if (ev.category === 'finance') bucket.finance += 1
      else if (ev.category === 'users') bucket.usersMods += 1
      else if (ev.category === 'session') bucket.session += 1
      else bucket.adminSystem += 1
    })

    const hasBoth = Boolean(auditDateFrom && auditDateTo)
    const rawStart = hasBoth && auditDateFrom > auditDateTo ? auditDateTo : auditDateFrom
    const rawEnd = hasBoth && auditDateFrom > auditDateTo ? auditDateFrom : auditDateTo

    let startKey = rawStart || (earliestKey < sevenDaysAgoDateKey ? earliestKey : sevenDaysAgoDateKey)
    let endKey = rawEnd || (latestKey > todayDateKey ? latestKey : todayDateKey)

    if (!rawStart && rawEnd) {
      startKey = earliestKey < rawEnd ? earliestKey : rawEnd
    }
    if (rawStart && !rawEnd) {
      endKey = latestKey > rawStart ? (latestKey > todayDateKey ? latestKey : todayDateKey) : rawStart
    }
    if (startKey > endKey) {
      const tmp = startKey
      startKey = endKey
      endKey = tmp
    }

    const parseKeyToLocalDate = (key: string) => {
      const [y, m, d] = key.split('-').map(Number)
      return new Date(y, (m || 1) - 1, d || 1)
    }

    const startDate = parseKeyToLocalDate(startKey)
    const endDate = parseKeyToLocalDate(endKey)
    const dayDiff = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000)

    const shortFmt = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short' })
    const fullFmt = new Intl.DateTimeFormat('es-MX', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })

    const makePoint = (key: string, dt: Date, b?: DayBucket) => ({
      dateKey: key,
      label: shortFmt.format(dt),
      fullDateLabel: fullFmt.format(dt),
      total: b?.total || 0,
      uniqueUsers: b?.users.size || 0,
      sales: b?.sales || 0,
      inventory: b?.inventory || 0,
      finance: b?.finance || 0,
      usersMods: b?.usersMods || 0,
      adminSystem: b?.adminSystem || 0,
      session: b?.session || 0,
    })

    const points: Array<ReturnType<typeof makePoint>> = []

    if (dayDiff <= 45) {
      const cursor = new Date(startDate)
      while (cursor.getTime() <= endDate.getTime()) {
        const key = toLocalDateKey(cursor)
        points.push(makePoint(key, new Date(cursor), bucketByDate.get(key)))
        cursor.setDate(cursor.getDate() + 1)
      }
    } else {
      Array.from(bucketByDate.entries())
        .filter(([k]) => k >= startKey && k <= endKey)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([key, b]) => {
          points.push(makePoint(key, parseKeyToLocalDate(key), b))
        })
    }

    return points
  }, [
    timelineChartMode,
    auditEvents,
    auditBaseScopedEvents,
    auditFilter,
    auditActionKindFilter,
    auditSpecificActionFilter,
    auditUserFilter,
    auditDateFrom,
    auditDateTo,
    todayDateKey,
    sevenDaysAgoDateKey,
    t,
  ])

  const totalEventsInChartRange = useMemo(
    () => timelineChartData.reduce((acc, d) => acc + d.total, 0),
    [timelineChartData]
  )

  const moduleDistributionStats = useMemo(() => {
    const total = filteredAuditEvents.length
    if (total === 0) return []
    const counts = new Map<AuditCategory, number>()
    filteredAuditEvents.forEach((ev) => {
      counts.set(ev.category, (counts.get(ev.category) || 0) + 1)
    })
    return Array.from(counts.entries())
      .map(([category, count]) => ({
        category,
        count,
        percent: Math.round((count / total) * 100),
        meta: AUDIT_CATEGORY_META[category],
      }))
      .sort((a, b) => b.count - a.count)
  }, [filteredAuditEvents])

  const hasAnyAuditFilter =
    auditFilter !== 'all' ||
    auditActionKindFilter !== 'all' ||
    auditSpecificActionFilter !== 'all' ||
    auditUserFilter !== 'all' ||
    Boolean(auditDateFrom) ||
    Boolean(auditDateTo) ||
    Boolean(auditSearch.trim())

  const resetAllAuditFilters = () => {
    setAuditSearch('')
    setAuditFilter('all')
    setAuditActionKindFilter('all')
    setAuditSpecificActionFilter('all')
    setAuditUserFilter('all')
    setAuditDateFrom('')
    setAuditDateTo('')
  }

  const handleExportAuditCsv = () => {
    const header = [
      'Fecha y hora',
      'Timestamp ISO',
      'Módulo',
      'Tipo de acción',
      'Operación CRUD',
      'Entidad',
      'ID Entidad',
      'Acción',
      'Detalle',
      'Usuario',
      'ID Usuario',
      'Rol',
      'IP',
      'Dispositivo / Navegador',
    ]
    const rows = filteredAuditEvents.map((ev) => {
      const { actionText, detailText } = resolveEventText(ev)
      const dt = new Date(ev.timestampIso)
      const catLabel = AUDIT_CATEGORY_META[ev.category]?.label || ev.category
      const kindLabel =
        AUDIT_ACTION_META[classifyAuditActionKind(ev.category, actionText, ev.crudOperation)].label
      return [
        `${formatDate(dt)} ${formatTime(dt)}`,
        ev.timestampIso,
        catLabel,
        kindLabel,
        ev.crudOperation || '—',
        ev.entityType || '—',
        ev.entityId || '—',
        actionText,
        detailText,
        ev.user,
        ev.userId || '—',
        ev.sessionMeta?.roleLabel || '—',
        ev.sessionMeta?.ipAddress || '—',
        ev.sessionMeta?.deviceBrowser || '—',
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(',')
    })
    const csv = `\uFEFF${header.join(',')}\n${rows.join('\n')}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `aes-nexus-auditoria-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Historial de auditoría exportado en CSV.', 'Auditoría exportada')
  }

  const isTabVisible = (tab: AdminSectionTab) =>
    !allowedSections || allowedSections.includes(tab)

  const toggleIdInList = (list: string[], id: string) =>
    list.includes(id) ? list.filter((item) => item !== id) : [...list, id]

  const getDefaultSubsidiarySelection = () => {
    const holding = subsidiaries.find((s) => s.active && s.isHolding) || subsidiaries.find((s) => s.active) || subsidiaries[0]
    return holding ? [holding.id] : []
  }

  // Subsidiary modal helpers
  const openEditSubsidiaryModal = (sub: SubsidiaryRecord) => {
    setEditingSubsidiary(sub)
    setConfirmingDeleteSubsidiary(false)
    setSubCode(sub.code)
    setSubName(sub.name)
    setSubLegalName(sub.legalName)
    setSubTaxId(sub.taxId)
    setSubCountry(sub.country)
    setSubCurrency(sub.currency)
    setSubLegalRep(sub.legalRep || '')
    setSubFiscalAddress(sub.fiscalAddress || '')
    setSubIsHolding(Boolean(sub.isHolding))
    setSubLinkedDeptIds(
      departments.filter((d) => (d.subsidiaryIds || []).includes(sub.id)).map((d) => d.id)
    )
    setSubLinkedLocationIds(
      locations.filter((l) => (l.subsidiaryIds || []).includes(sub.id)).map((l) => l.id)
    )
    setIsSubsidiaryModalOpen(true)
  }

  const handleSaveSubsidiary = (e: React.FormEvent) => {
    e.preventDefault()
    if (!subCode.trim() || !subName.trim() || !subLegalName.trim() || !subTaxId.trim()) {
      toast.error(
        'Indica el código, nombre comercial, razón social y RFC / Tax ID de la subsidiaria.',
        'Campos requeridos'
      )
      return
    }
    const cleanCode = subCode.trim().toUpperCase()
    const duplicateCode = subsidiaries.some(
      (s) =>
        s.id !== editingSubsidiary?.id &&
        s.code.trim().toLowerCase() === cleanCode.toLowerCase()
    )
    if (duplicateCode) {
      toast.warning(`Ya existe una subsidiaria con el código ${cleanCode}.`, 'Código duplicado')
      return
    }

    const subId = editingSubsidiary ? editingSubsidiary.id : `sub_${Date.now()}`
    const payload: SubsidiaryRecord = {
      id: subId,
      code: cleanCode,
      name: subName.trim(),
      legalName: subLegalName.trim(),
      taxId: subTaxId.trim().toUpperCase(),
      country: subCountry.trim() || 'México',
      currency: subCurrency.trim().toUpperCase() || 'MXN',
      legalRep: subLegalRep.trim() || undefined,
      fiscalAddress: subFiscalAddress.trim() || undefined,
      isHolding: subIsHolding,
      active: editingSubsidiary ? editingSubsidiary.active : true,
    }

    if (editingSubsidiary) {
      const updatedSubs = subsidiaries.map((s) => {
        if (s.id === subId) return payload
        if (subIsHolding && s.isHolding) return { ...s, isHolding: false }
        return s
      })
      onUpdateSubsidiaries(updatedSubs)
      toast.success(`Subsidiaria “${payload.name}” actualizada.`, 'Subsidiaria actualizada')
    } else {
      if (subIsHolding) {
        onUpdateSubsidiaries(
          subsidiaries.map((s) => (s.isHolding ? { ...s, isHolding: false } : s))
        )
      }
      onAddSubsidiary(payload)
      toast.success(`Subsidiaria “${payload.name}” creada exitosamente.`, 'Subsidiaria registrada')
    }

    // Sync department & location links for this subsidiary
    const nextDepts = departments.map((d) => {
      const current = d.subsidiaryIds || []
      const shouldLink = subLinkedDeptIds.includes(d.id)
      const isLinked = current.includes(subId)
      if (shouldLink && !isLinked) {
        return { ...d, subsidiaryIds: [...current, subId] }
      }
      if (!shouldLink && isLinked) {
        return { ...d, subsidiaryIds: current.filter((id) => id !== subId) }
      }
      return d
    })
    onUpdateDepartments(nextDepts)

    const nextLocs = locations.map((l) => {
      const current = l.subsidiaryIds || []
      const shouldLink = subLinkedLocationIds.includes(l.id)
      const isLinked = current.includes(subId)
      if (shouldLink && !isLinked) {
        return { ...l, subsidiaryIds: [...current, subId] }
      }
      if (!shouldLink && isLinked) {
        return { ...l, subsidiaryIds: current.filter((id) => id !== subId) }
      }
      return l
    })
    onUpdateLocations(nextLocs)

    setIsSubsidiaryModalOpen(false)
    setEditingSubsidiary(null)
    setConfirmingDeleteSubsidiary(false)
  }

  const handleDeleteSubsidiaryConfirmed = () => {
    if (!editingSubsidiary || !onDeleteSubsidiary) return
    onDeleteSubsidiary(editingSubsidiary.id)
    setIsSubsidiaryModalOpen(false)
    setEditingSubsidiary(null)
    setConfirmingDeleteSubsidiary(false)
  }

  const toggleSubsidiaryStatus = (id: string) => {
    const sub = subsidiaries.find((s) => s.id === id)
    if (!sub) return
    const updated = subsidiaries.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
    onUpdateSubsidiaries(updated)
    toast.info(
      `Subsidiaria ${sub.name} ahora está ${sub.active ? 'Inactiva' : 'Activa'}.`,
      'Estado actualizado'
    )
  }

  // Department modal helpers
  const openNewDeptModal = () => {
    setEditingDepartment(null)
    setConfirmingDeleteDept(false)
    setDeptCode('')
    setDeptName('')
    setDeptLeader('')
    setDeptCostCenter('')
    setDeptDescription('')
    setDeptSubsidiaryIds(getDefaultSubsidiarySelection())
    setIsDeptModalOpen(true)
  }

  const openEditDeptModal = (dep: DepartmentRecord) => {
    setEditingDepartment(dep)
    setConfirmingDeleteDept(false)
    setDeptCode(dep.code)
    setDeptName(dep.name)
    setDeptLeader(dep.leader)
    setDeptCostCenter(dep.costCenter || '')
    setDeptDescription(dep.description || '')
    setDeptSubsidiaryIds(dep.subsidiaryIds || [])
    setIsDeptModalOpen(true)
  }

  // Handle department create / update
  const handleSaveDepartment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!deptCode.trim() || !deptName.trim() || !deptLeader.trim()) {
      toast.error('Indica el código, nombre y líder del departamento.', 'Campos requeridos')
      return
    }
    if (subsidiaries.length > 0 && deptSubsidiaryIds.length === 0) {
      toast.error(
        'Relaciona el departamento con al menos una subsidiaria.',
        'Subsidiaria requerida'
      )
      return
    }

    const cleanCode = deptCode.trim().toUpperCase()
    if (
      departments.some(
        (d) =>
          d.id !== editingDepartment?.id &&
          d.code.trim().toLowerCase() === cleanCode.toLowerCase()
      )
    ) {
      toast.warning(`Ya existe un departamento con el código ${cleanCode}.`, 'Código duplicado')
      return
    }

    if (editingDepartment) {
      const updatedDept: DepartmentRecord = {
        ...editingDepartment,
        code: cleanCode,
        name: deptName.trim(),
        leader: deptLeader.trim(),
        costCenter: deptCostCenter.trim() || undefined,
        description: deptDescription.trim() || undefined,
        subsidiaryIds: deptSubsidiaryIds,
      }
      onUpdateDepartments(
        departments.map((d) => (d.id === editingDepartment.id ? updatedDept : d))
      )
      toast.success(`Departamento “${updatedDept.name}” actualizado.`, 'Departamento actualizado')
    } else {
      const newDept: DepartmentRecord = {
        id: `dep_${Date.now()}`,
        code: cleanCode,
        name: deptName.trim(),
        leader: deptLeader.trim(),
        costCenter: deptCostCenter.trim() || undefined,
        description: deptDescription.trim() || undefined,
        subsidiaryIds: deptSubsidiaryIds,
        active: true,
      }
      onAddDepartment(newDept)
      toast.success(`Departamento “${newDept.name}” creado exitosamente.`, 'Departamento registrado')
    }

    setIsDeptModalOpen(false)
    setEditingDepartment(null)
    setConfirmingDeleteDept(false)
    setDeptCode('')
    setDeptName('')
    setDeptLeader('')
    setDeptCostCenter('')
    setDeptDescription('')
    setDeptSubsidiaryIds([])
  }

  const handleDeleteDeptConfirmed = () => {
    if (!editingDepartment || !onDeleteDepartment) return
    onDeleteDepartment(editingDepartment.id)
    setIsDeptModalOpen(false)
    setEditingDepartment(null)
    setConfirmingDeleteDept(false)
  }

  // Location modal helpers
  const openNewLocationModal = () => {
    setEditingLocation(null)
    setConfirmingDeleteLoc(false)
    setLocCode('')
    setLocName('')
    setLocType('Sucursal')
    setLocAddress('')
    setLocCity('')
    setLocState('')
    setLocCountry('México')
    setLocManager('')
    setLocSubsidiaryIds(getDefaultSubsidiarySelection())
    setIsLocationModalOpen(true)
  }

  const openEditLocationModal = (loc: PhysicalLocationRecord) => {
    setEditingLocation(loc)
    setConfirmingDeleteLoc(false)
    setLocCode(loc.code)
    setLocName(loc.name)
    setLocType(loc.type)
    setLocAddress(loc.address)
    setLocCity(loc.city)
    setLocState(loc.state)
    setLocCountry(loc.country)
    setLocManager(loc.manager || '')
    setLocSubsidiaryIds(loc.subsidiaryIds || [])
    setIsLocationModalOpen(true)
  }

  // Handle location create / update
  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault()
    if (!locCode.trim() || !locName.trim() || !locAddress.trim() || !locCity.trim()) {
      toast.error('Completa el código, nombre, dirección y ciudad de la sede.', 'Campos requeridos')
      return
    }
    if (subsidiaries.length > 0 && locSubsidiaryIds.length === 0) {
      toast.error(
        'Relaciona la ubicación física con al menos una subsidiaria.',
        'Subsidiaria requerida'
      )
      return
    }

    const cleanCode = locCode.trim().toUpperCase()
    if (
      locations.some(
        (l) =>
          l.id !== editingLocation?.id &&
          l.code.trim().toLowerCase() === cleanCode.toLowerCase()
      )
    ) {
      toast.warning(`Ya existe una ubicación con el código ${cleanCode}.`, 'Código duplicado')
      return
    }

    if (editingLocation) {
      const updatedLoc: PhysicalLocationRecord = {
        ...editingLocation,
        code: cleanCode,
        name: locName.trim(),
        type: locType,
        address: locAddress.trim(),
        city: locCity.trim(),
        state: locState.trim() || locCity.trim(),
        country: locCountry.trim() || 'México',
        manager: locManager.trim() || undefined,
        subsidiaryIds: locSubsidiaryIds,
      }
      onUpdateLocations(locations.map((l) => (l.id === editingLocation.id ? updatedLoc : l)))
      toast.success(`Ubicación “${updatedLoc.name}” actualizada.`, 'Ubicación actualizada')
    } else {
      const newLocation: PhysicalLocationRecord = {
        id: `loc_${Date.now()}`,
        code: cleanCode,
        name: locName.trim(),
        type: locType,
        address: locAddress.trim(),
        city: locCity.trim(),
        state: locState.trim() || locCity.trim(),
        country: locCountry.trim() || 'México',
        manager: locManager.trim() || undefined,
        subsidiaryIds: locSubsidiaryIds,
        active: true,
      }
      onAddLocation(newLocation)
      toast.success(`Ubicación física “${newLocation.name}” agregada al sistema.`, 'Ubicación registrada')
    }

    setIsLocationModalOpen(false)
    setEditingLocation(null)
    setConfirmingDeleteLoc(false)
    setLocCode('')
    setLocName('')
    setLocType('Sucursal')
    setLocAddress('')
    setLocCity('')
    setLocState('')
    setLocManager('')
    setLocSubsidiaryIds([])
  }

  const handleDeleteLocationConfirmed = () => {
    if (!editingLocation || !onDeleteLocation) return
    onDeleteLocation(editingLocation.id)
    setIsLocationModalOpen(false)
    setEditingLocation(null)
    setConfirmingDeleteLoc(false)
  }

  const toggleDepartmentStatus = (id: string) => {
    const updated = departments.map((d) => (d.id === id ? { ...d, active: !d.active } : d))
    onUpdateDepartments(updated)
    const dept = departments.find((d) => d.id === id)
    toast.info(
      `Departamento ${dept?.name} ahora está ${dept?.active ? 'Inactivo' : 'Activo'}.`,
      'Estado actualizado'
    )
  }

  const toggleLocationStatus = (id: string) => {
    const updated = locations.map((l) => (l.id === id ? { ...l, active: !l.active } : l))
    onUpdateLocations(updated)
    const loc = locations.find((l) => l.id === id)
    toast.info(
      `Ubicación ${loc?.name} ahora está ${loc?.active ? 'Inactiva' : 'Activa'}.`,
      'Estado actualizado'
    )
  }

  const renderSubsidiaryTags = (ids: string[] | undefined) => {
    const resolved = (ids || [])
      .map((id) => subsidiaryById.get(id))
      .filter((s): s is SubsidiaryRecord => Boolean(s))
    if (resolved.length === 0) {
      return <span className="admin-subsidiary-empty">Sin subsidiaria</span>
    }
    return (
      <div className="admin-subsidiary-pills">
        {resolved.map((sub) => (
          <span
            key={sub.id}
            className={`admin-subsidiary-pill ${sub.active ? '' : 'inactive'}`}
            title={`${sub.name} (${sub.legalName})`}
          >
            <strong>{sub.code}</strong>
            <span>{sub.name}</span>
          </span>
        ))}
      </div>
    )
  }

  const getLocationTypeBadgeClass = (type: LocationType) => {
    switch (type) {
      case 'Oficina corporativa':
        return 'badge-transfer'
      case 'Almacén / Bodega':
        return 'badge-entry'
      case 'Sucursal':
        return 'fin-badge-paid'
      case 'Taller / Operación':
        return 'badge-adjust'
      case 'Punto de venta':
        return 'badge-exit'
    }
  }

  return (
    <section className="sales-page" aria-labelledby="admin-title">
      {/* Header */}
      <div className="crm-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" /> AES NEXUS · H1 NÚCLEO DEL SISTEMA
          </div>
          <h1 id="admin-title">Administración</h1>
          <p>
            Configuración y estructura de la organización: gestión de subsidiarias, departamentos, líderes, centros de costos y sedes físicas.
          </p>
        </div>
      </div>

      {/* Navigation tabs */}
      <nav className="crm-tabs" aria-label="Secciones de Administración">
        {isTabVisible('Subsidiarias') && (
          <button
            className={adminSection === 'Subsidiarias' ? 'active' : ''}
            onClick={() => {
              setSelectedSubsidiaryId(null)
              onNavigateSection('Subsidiarias')
            }}
          >
            <Landmark size={13} />
            Subsidiarias <span>{subsidiaries.length}</span>
          </button>
        )}
        {isTabVisible('Departamentos') && (
          <button
            className={adminSection === 'Departamentos' ? 'active' : ''}
            onClick={() => onNavigateSection('Departamentos')}
          >
            <Building2 size={13} />
            Departamentos <span>{departments.length}</span>
          </button>
        )}
        {isTabVisible('Ubicaciones') && (
          <button
            className={adminSection === 'Ubicaciones' ? 'active' : ''}
            onClick={() => onNavigateSection('Ubicaciones')}
          >
            <MapPin size={13} />
            Ubicaciones físicas <span>{locations.length}</span>
          </button>
        )}
        {isTabVisible('Flujos de devoluciones') && (
          <button
            className={adminSection === 'Flujos de devoluciones' ? 'active' : ''}
            onClick={() => onNavigateSection('Flujos de devoluciones')}
          >
            <GitBranch size={13} />
            Flujos de devoluciones{' '}
            <span>
              {returnWorkflows.customer.steps.filter((s) => s.enabled && s.requiresApproval).length +
                returnWorkflows.supplier.steps.filter((s) => s.enabled && s.requiresApproval).length}
            </span>
          </button>
        )}
        {isTabVisible('Resumen') && (
          <button
            className={adminSection === 'Resumen' ? 'active' : ''}
            onClick={() => onNavigateSection('Resumen')}
          >
            <Layers size={13} />
            Resumen organizacional
          </button>
        )}
        {isTabVisible('Historial de Auditoría') && (
          <button
            className={adminSection === 'Historial de Auditoría' ? 'active' : ''}
            onClick={() => onNavigateSection('Historial de Auditoría')}
          >
            <History size={13} />
            Historial de Auditoría <span>{auditEvents.length}</span>
          </button>
        )}
      </nav>

      {/* Section 0: Subsidiarias */}
      {adminSection === 'Subsidiarias' && (
        selectedSubsidiaryId ? (
          <SubsidiaryDetailView
            subsidiaryId={selectedSubsidiaryId}
            subsidiaries={subsidiaries}
            departments={departments}
            locations={locations}
            employees={employees}
            warehouses={warehouses}
            purchaseOrders={purchaseOrders}
            requisitions={requisitions}
            payables={payables}
            currentUserName={currentUserName}
            canCreateSub={canCreateSub}
            canEditSub={canEditSub}
            canDeleteSub={canDeleteSub}
            canCreateDept={canCreateDept}
            canCreateLoc={canCreateLoc}
            onBack={() => setSelectedSubsidiaryId(null)}
            onSelectSubsidiary={(id) => setSelectedSubsidiaryId(id)}
            onAddSubsidiary={onAddSubsidiary}
            onUpdateSubsidiaries={onUpdateSubsidiaries}
            onDeleteSubsidiary={onDeleteSubsidiary}
            onAddDepartment={onAddDepartment}
            onUpdateDepartments={onUpdateDepartments}
            onAddLocation={onAddLocation}
            onUpdateLocations={onUpdateLocations}
          />
        ) : (
          <div className="finance-section-container">
            <div className="ops-header-strip">
              <div className="ops-header-left">
                <div className="ops-icon-box fin-icon-box">
                  <Landmark size={20} />
                </div>
                <div>
                  <h2>Subsidiarias y Entidades Legales</h2>
                  <p>
                    Razones sociales del grupo empresarial vinculadas con sus departamentos operativos y sedes físicas.
                  </p>
                </div>
              </div>

              <div className="ops-header-right">
                <div className="ops-stat-item">
                  <span className="ops-stat-label">Total subsidiarias</span>
                  <strong className="ops-stat-val">{subsidiaries.length}</strong>
                </div>
                <div className="ops-stat-item">
                  <span className="ops-stat-label">Subsidiarias activas</span>
                  <span className="ops-stat-pill ok">
                    {subsidiaries.filter((s) => s.active).length} activas
                  </span>
                </div>
              </div>
            </div>

            <div className="ops-toolbar">
              <div className="ops-filter-group" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div className="ops-search-input-wrap" style={{ minWidth: '300px' }}>
                  <Search size={14} />
                  <input
                    type="text"
                    placeholder="Buscar por código, nombre, razón social, RFC o país..."
                    value={subsidiarySearch}
                    onChange={(e) => setSubsidiarySearch(e.target.value)}
                  />
                  {subsidiarySearch && (
                    <button
                      className="search-clear-btn"
                      onClick={() => setSubsidiarySearch('')}
                      title="Limpiar búsqueda"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="accounting-select-wrap">
                  <label htmlFor="filter-sub-status">Estado:</label>
                  <select
                    id="filter-sub-status"
                    className="accounting-filter-select"
                    value={subsidiaryStatusFilter}
                    onChange={(e) =>
                      setSubsidiaryStatusFilter(e.target.value as 'Todas' | 'Activas' | 'Inactivas')
                    }
                  >
                    <option value="Todas">Todas ({subsidiaries.length})</option>
                    <option value="Activas">
                      Activas ({subsidiaries.filter((s) => s.active).length})
                    </option>
                    <option value="Inactivas">
                      Inactivas ({subsidiaries.filter((s) => !s.active).length})
                    </option>
                  </select>
                </div>
              </div>

              <div className="ops-actions-group">
                {canCreateSub && (
                  <button
                    className="button button-primary"
                    onClick={() => setSelectedSubsidiaryId('__new__')}
                  >
                    <Plus size={14} /> Nueva subsidiaria
                  </button>
                )}
              </div>
            </div>

            <div className="table-wrap ops-table-wrap">
              <table className="data-table ops-data-table">
                <thead>
                  <tr>
                    <th style={{ width: '110px' }}>CÓDIGO</th>
                    <th>SUBSIDIARIA / RAZÓN SOCIAL</th>
                    <th>RFC / TAX ID</th>
                    <th>PAÍS Y DIVISA</th>
                    <th>DEPARTAMENTOS Y SEDES</th>
                    <th>ESTADO</th>
                    <th style={{ textAlign: 'right', width: '230px' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubsidiaries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="empty-cell">
                        No se encontraron subsidiarias registradas con los criterios seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredSubsidiaries.map((sub) => {
                      const linkedDepts = departments.filter((d) =>
                        (d.subsidiaryIds || []).includes(sub.id)
                      )
                      const linkedLocs = locations.filter((l) =>
                        (l.subsidiaryIds || []).includes(sub.id)
                      )
                      return (
                        <tr
                          key={sub.id}
                          className="sub-clickable-row"
                          onClick={() => setSelectedSubsidiaryId(sub.id)}
                          title="Clic para abrir vista consolidada de subsidiaria"
                        >
                          <td>
                            <span className="accounting-code-badge">{sub.code}</span>
                          </td>
                          <td>
                            <div className="prod-cell">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  className="sub-table-name-link"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedSubsidiaryId(sub.id)
                                  }}
                                  title="Abrir vista detallada de la subsidiaria"
                                >
                                  {sub.name}
                                </button>
                                {sub.isHolding && (
                                  <span className="admin-holding-pill">Matriz</span>
                                )}
                              </div>
                              <small>{sub.legalName}</small>
                            </div>
                          </td>
                          <td>
                            <span className="location-bin-tag mono">{sub.taxId}</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '9.5px', color: '#2f3e35' }}>{sub.country}</span>
                              <small style={{ color: '#7f8f84' }}>
                                Divisa base: <strong>{sub.currency}</strong>
                              </small>
                            </div>
                          </td>
                          <td>
                            <div className="admin-subsidiary-pills">
                              <span className="admin-subsidiary-pill">
                                <strong>{linkedDepts.length}</strong>
                                <span>deptos.</span>
                              </span>
                              <span className="admin-subsidiary-pill">
                                <strong>{linkedLocs.length}</strong>
                                <span>ubicaciones</span>
                              </span>
                            </div>
                          </td>
                          <td>
                            {sub.active ? (
                              <span className="stock-ok-badge">
                                <CheckCircle2 size={11} /> Activa
                              </span>
                            ) : (
                              <span className="stock-alert-badge">
                                <AlertCircle size={11} /> Inactiva
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div
                              style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                className="button-icon-action"
                                onClick={() => setSelectedSubsidiaryId(sub.id)}
                                title="Abrir gestión detallada de subsidiaria y relaciones"
                              >
                                <SlidersHorizontal size={11} /> Gestionar
                              </button>
                              {canEditSub && (
                                <>
                                  <button
                                    type="button"
                                    className="button-icon-action"
                                    onClick={() => openEditSubsidiaryModal(sub)}
                                    title="Edición rápida en modal"
                                  >
                                    <Pencil size={11} />
                                  </button>
                                  <button
                                    type="button"
                                    className="button-icon-action"
                                    onClick={() => toggleSubsidiaryStatus(sub.id)}
                                    title={sub.active ? 'Inhabilitar subsidiaria' : 'Reactivar subsidiaria'}
                                  >
                                    {sub.active ? 'Inhabilitar' : 'Reactivar'}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Section 1: Departamentos */}
      {adminSection === 'Departamentos' && (
        <div className="finance-section-container">
          {/* Header strip */}
          <div className="ops-header-strip">
            <div className="ops-header-left">
              <div className="ops-icon-box fin-icon-box">
                <Building2 size={20} />
              </div>
              <div>
                <h2>Departamentos y Unidades de Negocio</h2>
                <p>Estructura departamental, responsables de área, centros de costos y subsidiarias asociadas.</p>
              </div>
            </div>

            <div className="ops-header-right">
              <div className="ops-stat-item">
                <span className="ops-stat-label">Total departamentos</span>
                <strong className="ops-stat-val">{departments.length}</strong>
              </div>
              <div className="ops-stat-item">
                <span className="ops-stat-label">Departamentos activos</span>
                <span className="ops-stat-pill ok">
                  {departments.filter((d) => d.active).length} activos
                </span>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="ops-toolbar">
            <div className="ops-filter-group" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <div className="ops-search-input-wrap" style={{ minWidth: '280px' }}>
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Buscar por código, departamento, líder o centro de costos..."
                  value={departmentSearch}
                  onChange={(e) => setDepartmentSearch(e.target.value)}
                />
                {departmentSearch && (
                  <button
                    className="search-clear-btn"
                    onClick={() => setDepartmentSearch('')}
                    title="Limpiar búsqueda"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="accounting-select-wrap">
                <label htmlFor="filter-dept-sub">Subsidiaria:</label>
                <select
                  id="filter-dept-sub"
                  className="accounting-filter-select"
                  value={deptSubsidiaryFilter}
                  onChange={(e) => setDeptSubsidiaryFilter(e.target.value)}
                >
                  <option value="Todas">Todas las subsidiarias ({departments.length})</option>
                  {subsidiaries.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.code} · {sub.name} (
                      {departments.filter((d) => (d.subsidiaryIds || []).includes(sub.id)).length})
                    </option>
                  ))}
                  <option value="unassigned">
                    Sin subsidiaria ({departments.filter((d) => (d.subsidiaryIds || []).length === 0).length})
                  </option>
                </select>
              </div>
            </div>

            <div className="ops-actions-group">
              {canCreateDept && (
                <button
                  className="button button-primary"
                  onClick={openNewDeptModal}
                >
                  <Plus size={14} /> Nuevo departamento
                </button>
              )}
            </div>
          </div>

          {/* Departments Table */}
          <div className="table-wrap ops-table-wrap">
            <table className="data-table ops-data-table">
              <thead>
                <tr>
                  <th style={{ width: '110px' }}>CÓDIGO</th>
                  <th>DEPARTAMENTO / ÁREA</th>
                  <th>LÍDER / RESPONSABLE</th>
                  <th>SUBSIDIARIAS RELACIONADAS</th>
                  <th>CENTRO DE COSTOS</th>
                  <th>ESTADO</th>
                  <th style={{ textAlign: 'right', width: '150px' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-cell">
                      No se encontraron departamentos registrados con los criterios de búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredDepartments.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <span className="accounting-code-badge">{d.code}</span>
                      </td>
                      <td>
                        <div className="prod-cell">
                          <strong>{d.name}</strong>
                          {d.description && <small>{d.description}</small>}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Users size={12} color="#65766b" />
                          <span>{d.leader}</span>
                        </div>
                      </td>
                      <td>{renderSubsidiaryTags(d.subsidiaryIds)}</td>
                      <td>
                        {d.costCenter ? (
                          <span className="location-bin-tag">{d.costCenter}</span>
                        ) : (
                          <span style={{ color: '#9aa59d' }}>—</span>
                        )}
                      </td>
                      <td>
                        {d.active ? (
                          <span className="stock-ok-badge">
                            <CheckCircle2 size={11} /> Activo
                          </span>
                        ) : (
                          <span className="stock-alert-badge">
                            <AlertCircle size={11} /> Inactivo
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                          {canEditDept && (
                            <>
                              <button
                                type="button"
                                className="button-icon-action"
                                onClick={() => openEditDeptModal(d)}
                                title="Editar departamento y subsidiarias"
                              >
                                <Pencil size={11} /> Editar
                              </button>
                              <button
                                type="button"
                                className="button-icon-action"
                                onClick={() => toggleDepartmentStatus(d.id)}
                                title={d.active ? 'Desactivar departamento' : 'Activar departamento'}
                              >
                                {d.active ? 'Desactivar' : 'Reactivar'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 2: Ubicaciones Físicas */}
      {adminSection === 'Ubicaciones' && (
        <div className="finance-section-container">
          {/* Header strip */}
          <div className="ops-header-strip">
            <div className="ops-header-left">
              <div className="ops-icon-box fin-icon-box">
                <MapPin size={20} />
              </div>
              <div>
                <h2>Sedes y Ubicaciones Físicas</h2>
                <p>Direcciones de oficinas, almacenes, sucursales y su vinculación con una o más subsidiarias.</p>
              </div>
            </div>

            <div className="ops-header-right">
              <div className="ops-stat-item">
                <span className="ops-stat-label">Total sedes</span>
                <strong className="ops-stat-val">{locations.length}</strong>
              </div>
              <div className="ops-stat-item">
                <span className="ops-stat-label">Sedes operativas</span>
                <span className="ops-stat-pill ok">
                  {locations.filter((l) => l.active).length} activas
                </span>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="ops-toolbar">
            <div className="ops-filter-group" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <div className="ops-search-input-wrap" style={{ minWidth: '250px' }}>
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Buscar por sede, ciudad, dirección o responsable..."
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                />
                {locationSearch && (
                  <button
                    className="search-clear-btn"
                    onClick={() => setLocationSearch('')}
                    title="Limpiar búsqueda"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="accounting-select-wrap">
                <label htmlFor="filter-loc-type">Tipo:</label>
                <select
                  id="filter-loc-type"
                  className="accounting-filter-select"
                  value={locationTypeFilter}
                  onChange={(e) => setLocationTypeFilter(e.target.value)}
                >
                  <option value="Todos">Todos los tipos ({locations.length})</option>
                  {LOCATION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t} ({locations.filter((l) => l.type === t).length})
                    </option>
                  ))}
                </select>
              </div>

              <div className="accounting-select-wrap">
                <label htmlFor="filter-loc-sub">Subsidiaria:</label>
                <select
                  id="filter-loc-sub"
                  className="accounting-filter-select"
                  value={locSubsidiaryFilter}
                  onChange={(e) => setLocSubsidiaryFilter(e.target.value)}
                >
                  <option value="Todas">Todas las subsidiarias ({locations.length})</option>
                  {subsidiaries.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.code} · {sub.name} (
                      {locations.filter((l) => (l.subsidiaryIds || []).includes(sub.id)).length})
                    </option>
                  ))}
                  <option value="unassigned">
                    Sin subsidiaria ({locations.filter((l) => (l.subsidiaryIds || []).length === 0).length})
                  </option>
                </select>
              </div>
            </div>

            <div className="ops-actions-group">
              {canCreateLoc && (
                <button
                  className="button button-primary"
                  onClick={openNewLocationModal}
                >
                  <Plus size={14} /> Nueva ubicación
                </button>
              )}
            </div>
          </div>

          {/* Locations Table */}
          <div className="table-wrap ops-table-wrap">
            <table className="data-table ops-data-table">
              <thead>
                <tr>
                  <th style={{ width: '110px' }}>CÓDIGO</th>
                  <th>SEDE / UBICACIÓN</th>
                  <th>TIPO</th>
                  <th>SUBSIDIARIAS RELACIONADAS</th>
                  <th>DIRECCIÓN Y CIUDAD</th>
                  <th>ENCARGADO</th>
                  <th>ESTADO</th>
                  <th style={{ textAlign: 'right', width: '150px' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filteredLocations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-cell">
                      No se encontraron ubicaciones físicas registradas.
                    </td>
                  </tr>
                ) : (
                  filteredLocations.map((loc) => (
                    <tr key={loc.id}>
                      <td>
                        <span className="accounting-code-badge">{loc.code}</span>
                      </td>
                      <td>
                        <div className="prod-cell">
                          <strong>{loc.name}</strong>
                          <small>{loc.country}</small>
                        </div>
                      </td>
                      <td>
                        <span className={`movement-type-badge ${getLocationTypeBadgeClass(loc.type)}`}>
                          {loc.type}
                        </span>
                      </td>
                      <td>{renderSubsidiaryTags(loc.subsidiaryIds)}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '9px', color: '#2f3e35' }}>{loc.address}</span>
                          <small style={{ color: '#7f8f84' }}>
                            {loc.city}, {loc.state}
                          </small>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '9px', color: '#44554b' }}>
                          {loc.manager || 'No asignado'}
                        </span>
                      </td>
                      <td>
                        {loc.active ? (
                          <span className="stock-ok-badge">
                            <CheckCircle2 size={11} /> Activa
                          </span>
                        ) : (
                          <span className="stock-alert-badge">
                            <AlertCircle size={11} /> Inactiva
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                          {canEditLoc && (
                            <>
                              <button
                                type="button"
                                className="button-icon-action"
                                onClick={() => openEditLocationModal(loc)}
                                title="Editar ubicación y subsidiarias"
                              >
                                <Pencil size={11} /> Editar
                              </button>
                              <button
                                type="button"
                                className="button-icon-action"
                                onClick={() => toggleLocationStatus(loc.id)}
                                title={loc.active ? 'Inhabilitar sede' : 'Habilitar sede'}
                              >
                                {loc.active ? 'Inhabilitar' : 'Habilitar'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 3: Resumen Organizacional */}
      {adminSection === 'Resumen' && (
        <div className="finance-section-container">
          <div className="ops-panel-card" style={{ marginBottom: '14px' }}>
            <div className="ops-panel-header">
              <div>
                <div className="panel-kicker">ENTIDADES LEGALES Y GRUPO</div>
                <h3>Subsidiarias Registradas</h3>
              </div>
              <button
                className="button button-secondary"
                onClick={() => onNavigateSection('Subsidiarias')}
              >
                Ver todas ({subsidiaries.length}) <ArrowRight size={13} />
              </button>
            </div>

            <div className="admin-summary-subs-grid">
              {subsidiaries.map((sub) => {
                const deptCount = departments.filter((d) =>
                  (d.subsidiaryIds || []).includes(sub.id)
                ).length
                const locCount = locations.filter((l) =>
                  (l.subsidiaryIds || []).includes(sub.id)
                ).length
                return (
                  <button
                    key={sub.id}
                    type="button"
                    className="admin-summary-item-card admin-summary-item-clickable"
                    onClick={() => openSubsidiaryDetail(sub.id)}
                  >
                    <div style={{ textAlign: 'left', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '10.5px', color: '#2a3830' }}>{sub.name}</strong>
                        {sub.isHolding && <span className="admin-holding-pill">Matriz</span>}
                      </div>
                      <small style={{ fontSize: '8.5px', color: '#7a8980', display: 'block', marginTop: '2px' }}>
                        {sub.legalName} · {sub.taxId} · {sub.country} ({sub.currency})
                      </small>
                      <small style={{ fontSize: '8.5px', color: '#456a61', display: 'block', marginTop: '4px' }}>
                        {deptCount} departamento(s) · {locCount} ubicación(es) · Abrir gestión →
                      </small>
                    </div>
                    <span className="accounting-code-badge">{sub.code}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="ops-overview-split" style={{ marginBottom: '14px' }}>
            <div className="ops-panel-card">
              <div className="ops-panel-header">
                <div>
                  <div className="panel-kicker">ESTRUCTURA DEPARTAMENTAL</div>
                  <h3>Departamentos y Líderes</h3>
                </div>
                <button
                  className="button button-secondary"
                  onClick={() => onNavigateSection('Departamentos')}
                >
                  Ver todos ({departments.length}) <ArrowRight size={13} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {departments.slice(0, 4).map((d) => (
                  <div
                    key={d.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      padding: '8px 10px',
                      background: '#fafbfa',
                      border: '1px solid #edf1eb',
                      borderRadius: '7px',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '10px', color: '#2a3830', display: 'block' }}>
                        {d.name}
                      </strong>
                      <small style={{ fontSize: '8.5px', color: '#7a8980', display: 'block' }}>
                        Líder: {d.leader} {d.costCenter && `· CC: ${d.costCenter}`} ·{' '}
                        {(d.subsidiaryIds || []).length} subsidiaria(s)
                      </small>
                    </div>
                    <span className="accounting-code-badge">{d.code}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="ops-panel-card">
              <div className="ops-panel-header">
                <div>
                  <div className="panel-kicker">INFRAESTRUCTURA FÍSICA</div>
                  <h3>Sedes y Sucursales</h3>
                </div>
                <button
                  className="button button-secondary"
                  onClick={() => onNavigateSection('Ubicaciones')}
                >
                  Ver todas ({locations.length}) <ArrowRight size={13} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {locations.slice(0, 4).map((l) => (
                  <div
                    key={l.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      padding: '8px 10px',
                      background: '#fafbfa',
                      border: '1px solid #edf1eb',
                      borderRadius: '7px',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '10px', color: '#2a3830', display: 'block' }}>
                        {l.name}
                      </strong>
                      <small style={{ fontSize: '8.5px', color: '#7a8980', display: 'block' }}>
                        {l.city}, {l.state} · {l.type} · {(l.subsidiaryIds || []).length} subsidiaria(s)
                      </small>
                    </div>
                    <span className="accounting-code-badge">{l.code}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '14px 16px',
              borderRadius: '9px',
              background: '#f4f7f4',
              border: '1px solid #dce6dc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={22} color="#3c7d5c" />
              <div>
                <strong style={{ fontSize: '11px', color: '#27362d', display: 'block' }}>
                  Estructura organizacional configurada
                </strong>
                <span style={{ fontSize: '9px', color: '#68776e' }}>
                  Las subsidiarias, departamentos y ubicaciones registrados articulan centros de costos y operaciones multi-entidad.
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {canCreateSub && (
                <button
                  className="button button-secondary"
                  onClick={() => openSubsidiaryDetail('__new__')}
                >
                  <Plus size={13} /> Agregar subsidiaria
                </button>
              )}
              {canCreateDept && (
                <button
                  className="button button-secondary"
                  onClick={openNewDeptModal}
                >
                  <Plus size={13} /> Agregar departamento
                </button>
              )}
              {canCreateLoc && (
                <button
                  className="button button-primary"
                  onClick={openNewLocationModal}
                >
                  <Plus size={13} /> Agregar ubicación
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Section 3B: Flujos de trabajo de Devoluciones */}
      {adminSection === 'Flujos de devoluciones' && (
        <ReturnWorkflowsPanel
          workflows={returnWorkflows}
          customerReturns={customerReturns}
          supplierReturns={supplierReturns}
          canEdit={canEditWorkflows}
          currentUserName={currentUserName}
          onSaveWorkflows={(next, summaryDetail) => {
            if (onUpdateReturnWorkflows) {
              onUpdateReturnWorkflows(next, summaryDetail)
            }
          }}
          onNavigateReturns={onNavigateReturns}
        />
      )}

      {/* Section 4: Historial de Auditoría */}
      {adminSection === 'Historial de Auditoría' && (
        <div className="finance-section-container">
          <div className="ops-header-strip">
            <div className="ops-header-left">
              <div className="ops-icon-box fin-icon-box">
                <History size={20} />
              </div>
              <div>
                <h2>Historial de Auditoría del Sistema</h2>
                <p>
                  Registro cronológico de eventos clave e inicios de sesión en el ERP: accesos de usuarios, facturas, cambios en roles, inventario y finanzas.
                </p>
              </div>
            </div>

            <div className="ops-header-right">
              <div className="ops-stat-item">
                <span className="ops-stat-label">Eventos registrados</span>
                <strong className="ops-stat-val tabular-nums">{auditEvents.length}</strong>
              </div>
              <div className="ops-stat-item">
                <span className="ops-stat-label">Actividad de hoy</span>
                <span className="ops-stat-pill ok tabular-nums">{todayAuditCount} hoy</span>
              </div>
            </div>
          </div>

          <div className="ops-panel-card admin-audit-chart-card">
            <div className="admin-audit-chart-header">
              <div>
                <div className="panel-kicker">LÍNEA DE TIEMPO VISUAL DE MODIFICACIONES</div>
                <h3>
                  {timelineChartMode === 'activity'
                    ? 'Modificaciones y actividad por día'
                    : 'Inicios de sesión por día'}{' '}
                  <span className="admin-audit-chart-count tabular-nums">
                    ({totalEventsInChartRange} en el rango)
                  </span>
                </h3>
              </div>
              <div className="admin-audit-chart-meta">
                {auditUserFilter !== 'all' && (
                  <span className="admin-audit-chart-scope">Usuario: {auditUserFilter}</span>
                )}
                <div className="admin-audit-chart-mode-tabs" role="group" aria-label="Modo de línea de tiempo">
                  <button
                    type="button"
                    className={`audit-filter-btn ${timelineChartMode === 'activity' ? 'active' : ''}`}
                    onClick={() => setTimelineChartMode('activity')}
                  >
                    <Activity size={12} /> Por módulo
                  </button>
                  <button
                    type="button"
                    className={`audit-filter-btn ${timelineChartMode === 'sessions' ? 'active' : ''}`}
                    onClick={() => setTimelineChartMode('sessions')}
                  >
                    <LogIn size={12} /> Solo sesiones
                  </button>
                </div>
                <span className="admin-audit-chart-hint">
                  Haz clic en una barra para aislar ese día
                </span>
              </div>
            </div>

            {timelineChartData.length === 0 ? (
              <div className="admin-audit-chart-empty">
                <Activity size={15} />
                <span>Sin actividad registrada en el rango y filtros seleccionados.</span>
              </div>
            ) : (
              <div className="admin-audit-recharts-wrap">
                <ResponsiveContainer width="100%" height={164}>
                  <BarChart
                    data={timelineChartData}
                    margin={{ top: 8, right: 10, left: -20, bottom: 2 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.35} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fill: '#77857d' }}
                      minTickGap={14}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fill: '#77857d' }}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(15, 118, 110, 0.08)' }}
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null
                        const row = payload[0].payload as {
                          fullDateLabel: string
                          total: number
                          uniqueUsers: number
                          sales: number
                          inventory: number
                          finance: number
                          usersMods: number
                          adminSystem: number
                          session: number
                        }
                        const breakdownItems = [
                          { label: 'Ventas', value: row.sales, color: '#3b6fd8' },
                          { label: 'Operaciones', value: row.inventory, color: '#2d8458' },
                          { label: 'Finanzas', value: row.finance, color: '#c47625' },
                          { label: 'Usuarios y Roles', value: row.usersMods, color: '#7b5cd6' },
                          { label: 'Admin y Config.', value: row.adminSystem, color: '#456a61' },
                          { label: 'Sesiones', value: row.session, color: '#0f766e' },
                        ].filter((i) => i.value > 0)

                        return (
                          <div className="admin-audit-chart-tooltip">
                            <strong>{row.fullDateLabel}</strong>
                            <span className="tabular-nums">
                              {row.total} evento(s)
                              {row.uniqueUsers > 0 ? ` · ${row.uniqueUsers} usuario(s)` : ''}
                            </span>
                            {timelineChartMode === 'activity' && breakdownItems.length > 0 && (
                              <div className="admin-audit-tooltip-breakdown">
                                {breakdownItems.map((item) => (
                                  <div key={item.label} className="admin-audit-tooltip-line">
                                    <span
                                      className="admin-audit-tooltip-swatch"
                                      style={{ backgroundColor: item.color }}
                                    />
                                    <span>{item.label}</span>
                                    <strong className="tabular-nums">{item.value}</strong>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      }}
                    />
                    {timelineChartMode === 'sessions' ? (
                      <Bar
                        dataKey="total"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={34}
                        style={{ cursor: 'pointer' }}
                        onClick={(barData) => {
                          const clickedKey = (barData as { dateKey?: string })?.dateKey
                          if (!clickedKey) return
                          if (auditDateFrom === clickedKey && auditDateTo === clickedKey) {
                            setAuditDateFrom('')
                            setAuditDateTo('')
                          } else {
                            setAuditDateFrom(clickedKey)
                            setAuditDateTo(clickedKey)
                          }
                        }}
                      >
                        {timelineChartData.map((entry) => {
                          const isSelectedDay =
                            auditDateFrom === entry.dateKey && auditDateTo === entry.dateKey
                          return (
                            <Cell
                              key={entry.dateKey}
                              fill={
                                isSelectedDay
                                  ? '#0d5e57'
                                  : entry.total > 0
                                  ? '#0f766e'
                                  : 'rgba(140, 155, 146, 0.25)'
                              }
                            />
                          )
                        })}
                      </Bar>
                    ) : (
                      <>
                        {[
                          { key: 'sales', fill: '#3b6fd8' },
                          { key: 'inventory', fill: '#2d8458' },
                          { key: 'finance', fill: '#c47625' },
                          { key: 'usersMods', fill: '#7b5cd6' },
                          { key: 'adminSystem', fill: '#456a61' },
                          { key: 'session', fill: '#0f766e' },
                        ].map((series, idx, arr) => (
                          <Bar
                            key={series.key}
                            dataKey={series.key}
                            stackId="audit"
                            fill={series.fill}
                            maxBarSize={34}
                            radius={idx === arr.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                            style={{ cursor: 'pointer' }}
                            onClick={(barData) => {
                              const clickedKey = (barData as { dateKey?: string })?.dateKey
                              if (!clickedKey) return
                              if (auditDateFrom === clickedKey && auditDateTo === clickedKey) {
                                setAuditDateFrom('')
                                setAuditDateTo('')
                              } else {
                                setAuditDateFrom(clickedKey)
                                setAuditDateTo(clickedKey)
                              }
                            }}
                          />
                        ))}
                      </>
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {moduleDistributionStats.length > 0 && (
              <div className="admin-audit-module-dist">
                <div className="admin-audit-dist-bar" aria-label="Distribución de eventos por módulo">
                  {moduleDistributionStats.map((seg) => (
                    <button
                      key={seg.category}
                      type="button"
                      className="admin-audit-dist-segment"
                      style={{
                        width: `${Math.max(seg.percent, 3)}%`,
                        backgroundColor: seg.meta.chartColor,
                      }}
                      title={`${seg.meta.label}: ${seg.count} (${seg.percent}%)`}
                      onClick={() =>
                        setAuditFilter((prev) => (prev === seg.category ? 'all' : seg.category))
                      }
                    />
                  ))}
                </div>
                <div className="admin-audit-dist-legend">
                  {moduleDistributionStats.map((seg) => (
                    <button
                      key={seg.category}
                      type="button"
                      className={`admin-audit-dist-item ${auditFilter === seg.category ? 'active' : ''}`}
                      onClick={() =>
                        setAuditFilter((prev) => (prev === seg.category ? 'all' : seg.category))
                      }
                    >
                      <span
                        className="admin-audit-dist-swatch"
                        style={{ backgroundColor: seg.meta.chartColor }}
                      />
                      <span>{seg.meta.shortLabel}</span>
                      <strong className="tabular-nums">{seg.count}</strong>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="admin-audit-controls">
            <div className="admin-audit-search-row">
              <label className="clients-search" style={{ flex: 1, minWidth: '220px' }}>
                <Search size={15} />
                <input
                  type="search"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Buscar por acción, módulo, usuario, rol, IP o detalle de cambio..."
                  aria-label="Buscar en historial de auditoría"
                />
              </label>

              <div className="accounting-select-wrap">
                <Users size={13} />
                <label htmlFor="filter-audit-user">Usuario:</label>
                <select
                  id="filter-audit-user"
                  className="accounting-filter-select"
                  value={auditUserFilter}
                  onChange={(e) => setAuditUserFilter(e.target.value)}
                  aria-label="Filtrar historial de auditoría por nombre de usuario"
                >
                  <option value="all">Todos los usuarios ({auditUserOptions.length})</option>
                  {auditUserOptions.map((opt) => (
                    <option key={opt.name} value={opt.name}>
                      {opt.name} ({opt.count})
                    </option>
                  ))}
                </select>
                {auditUserFilter !== 'all' && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => setAuditUserFilter('all')}
                    title="Limpiar filtro de usuario"
                    aria-label="Limpiar filtro de usuario"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="accounting-select-wrap">
                <SlidersHorizontal size={13} />
                <label htmlFor="filter-audit-action">Acción:</label>
                <select
                  id="filter-audit-action"
                  className="accounting-filter-select"
                  value={auditSpecificActionFilter}
                  onChange={(e) => setAuditSpecificActionFilter(e.target.value)}
                  aria-label="Filtrar por acción específica"
                >
                  <option value="all">Todas las acciones ({auditSpecificActionOptions.length})</option>
                  {auditSpecificActionOptions.map((opt) => (
                    <option key={opt.action} value={opt.action}>
                      {opt.action} ({opt.count})
                    </option>
                  ))}
                </select>
                {auditSpecificActionFilter !== 'all' && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => setAuditSpecificActionFilter('all')}
                    title="Limpiar acción específica"
                    aria-label="Limpiar acción específica"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="admin-audit-actions-right">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() =>
                    setAuditSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))
                  }
                  title="Cambiar orden cronológico"
                >
                  <ArrowDownUp size={13} />
                  {auditSortOrder === 'desc' ? 'Más recientes' : 'Más antiguos'}
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={handleExportAuditCsv}
                  disabled={filteredAuditEvents.length === 0}
                >
                  <Download size={13} /> Exportar CSV
                </button>
              </div>
            </div>

            <div className="admin-audit-date-row">
              <div className="admin-audit-date-presets" role="group" aria-label="Rangos rápidos de fecha">
                <button
                  type="button"
                  className={`audit-filter-btn ${activeDatePreset === 'all' ? 'active' : ''}`}
                  onClick={() => {
                    setAuditDateFrom('')
                    setAuditDateTo('')
                  }}
                >
                  Todas las fechas
                </button>
                <button
                  type="button"
                  className={`audit-filter-btn ${activeDatePreset === 'today' ? 'active' : ''}`}
                  onClick={() => {
                    setAuditDateFrom(todayDateKey)
                    setAuditDateTo(todayDateKey)
                  }}
                >
                  Hoy
                </button>
                <button
                  type="button"
                  className={`audit-filter-btn ${activeDatePreset === '7d' ? 'active' : ''}`}
                  onClick={() => {
                    setAuditDateFrom(sevenDaysAgoDateKey)
                    setAuditDateTo(todayDateKey)
                  }}
                >
                  Últimos 7 días
                </button>
                <button
                  type="button"
                  className={`audit-filter-btn ${activeDatePreset === 'month' ? 'active' : ''}`}
                  onClick={() => {
                    setAuditDateFrom(monthStartDateKey)
                    setAuditDateTo(todayDateKey)
                  }}
                >
                  Este mes
                </button>
              </div>

              <div className="admin-audit-action-kind-bar" role="group" aria-label="Filtrar por tipo de acción">
                <span className="admin-audit-filter-caption">
                  <Filter size={11} /> Tipo de acción:
                </span>
                {(
                  [
                    { id: 'all', label: 'Todas' },
                    { id: 'create', label: 'Creación' },
                    { id: 'update', label: 'Modificación' },
                    { id: 'delete', label: 'Eliminación' },
                    { id: 'status', label: 'Estado' },
                    { id: 'transaction', label: 'Operación' },
                    { id: 'access', label: 'Acceso' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`audit-filter-btn tabular-nums ${
                      auditActionKindFilter === item.id ? 'active' : ''
                    }`}
                    onClick={() => {
                      setAuditActionKindFilter(item.id)
                      setAuditSpecificActionFilter('all')
                    }}
                  >
                    {item.label}{' '}
                    <span className="audit-tab-count">({actionKindCounts[item.id]})</span>
                  </button>
                ))}
              </div>

              <div className="admin-audit-date-inputs">
                <div className="accounting-select-wrap">
                  <CalendarDays size={13} />
                  <label htmlFor="audit-date-from">Desde:</label>
                  <input
                    id="audit-date-from"
                    type="date"
                    className="admin-audit-date-input"
                    value={auditDateFrom}
                    max={auditDateTo || undefined}
                    onChange={(e) => setAuditDateFrom(e.target.value)}
                    aria-label="Fecha inicial del historial de auditoría"
                  />
                </div>

                <div className="accounting-select-wrap">
                  <CalendarDays size={13} />
                  <label htmlFor="audit-date-to">Hasta:</label>
                  <input
                    id="audit-date-to"
                    type="date"
                    className="admin-audit-date-input"
                    value={auditDateTo}
                    min={auditDateFrom || undefined}
                    onChange={(e) => setAuditDateTo(e.target.value)}
                    aria-label="Fecha final del historial de auditoría"
                  />
                </div>

                {(auditDateFrom || auditDateTo) && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => {
                      setAuditDateFrom('')
                      setAuditDateTo('')
                    }}
                    title="Limpiar rango de fechas"
                    aria-label="Limpiar rango de fechas"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            <div className="audit-filter-tabs" role="tablist" aria-label="Filtrar eventos por módulo">
              {(
                [
                  { id: 'all', label: 'Todos los módulos' },
                  { id: 'sales', label: 'Ventas' },
                  { id: 'inventory', label: 'Inventario y Compras' },
                  { id: 'finance', label: 'Finanzas' },
                  { id: 'users', label: 'Roles y Usuarios' },
                  { id: 'admin', label: 'Administración' },
                  { id: 'settings', label: 'Configuración' },
                  { id: 'security', label: 'Seguridad' },
                  { id: 'integrations', label: 'Integraciones' },
                  { id: 'session', label: 'Inicios de sesión' },
                ] as const
              ).map((tab) => {
                const count = moduleFilterCounts[tab.id] || 0
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={auditFilter === tab.id}
                    className={`audit-filter-btn tabular-nums ${auditFilter === tab.id ? 'active' : ''}`}
                    onClick={() => {
                      setAuditFilter(tab.id)
                      setAuditSpecificActionFilter('all')
                    }}
                  >
                    {tab.label} <span className="audit-tab-count">({count})</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="ops-panel-card">
            <div className="ops-panel-header" style={{ marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div className="panel-kicker">TRAZABILIDAD CRONOLÓGICA POR DÍA</div>
                <h3>
                  Mostrando {filteredAuditEvents.length} de {auditEvents.length} evento(s)
                </h3>
              </div>
              <div className="admin-audit-active-filters">
                {auditFilter !== 'all' && (
                  <button
                    type="button"
                    className="admin-audit-active-filter-btn"
                    onClick={() => setAuditFilter('all')}
                  >
                    <span>
                      Módulo: <strong>{AUDIT_CATEGORY_META[auditFilter]?.label}</strong>
                    </span>
                    <X size={12} />
                  </button>
                )}
                {auditActionKindFilter !== 'all' && (
                  <button
                    type="button"
                    className="admin-audit-active-filter-btn"
                    onClick={() => setAuditActionKindFilter('all')}
                  >
                    <span>
                      Tipo: <strong>{AUDIT_ACTION_META[auditActionKindFilter].shortLabel}</strong>
                    </span>
                    <X size={12} />
                  </button>
                )}
                {auditSpecificActionFilter !== 'all' && (
                  <button
                    type="button"
                    className="admin-audit-active-filter-btn"
                    onClick={() => setAuditSpecificActionFilter('all')}
                  >
                    <span>
                      Acción: <strong>{auditSpecificActionFilter}</strong>
                    </span>
                    <X size={12} />
                  </button>
                )}
                {auditUserFilter !== 'all' && (
                  <button
                    type="button"
                    className="admin-audit-active-filter-btn"
                    onClick={() => setAuditUserFilter('all')}
                  >
                    <Users size={12} />
                    <span>
                      Usuario: <strong>{auditUserFilter}</strong>
                    </span>
                    <X size={12} />
                  </button>
                )}
                {(auditDateFrom || auditDateTo) && (
                  <button
                    type="button"
                    className="admin-audit-active-filter-btn"
                    onClick={() => {
                      setAuditDateFrom('')
                      setAuditDateTo('')
                    }}
                  >
                    <CalendarDays size={12} />
                    <span>
                      Fechas:{' '}
                      <strong>
                        {auditDateFrom || 'Inicio'} — {auditDateTo || 'Hoy'}
                      </strong>
                    </span>
                    <X size={12} />
                  </button>
                )}
                {hasAnyAuditFilter && (
                  <button
                    type="button"
                    className="button button-ghost button-sm"
                    onClick={resetAllAuditFilters}
                  >
                    Restablecer filtros
                  </button>
                )}
              </div>
            </div>

            {groupedAuditTimeline.length === 0 ? (
              <div className="clients-empty">
                <History size={20} />
                <strong>Sin registros para este filtro</strong>
                <span>
                  No hay modificaciones o eventos que coincidan con el módulo, tipo de acción, usuario o fechas seleccionadas.
                </span>
                {hasAnyAuditFilter && (
                  <button
                    type="button"
                    className="button button-secondary"
                    style={{ marginTop: '8px' }}
                    onClick={resetAllAuditFilters}
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            ) : (
              <div className="admin-audit-grouped-timeline">
                {groupedAuditTimeline.map((group) => (
                  <section key={group.dateKey} className="admin-audit-day-group">
                    <header className="admin-audit-day-header">
                      <div className="admin-audit-day-title">
                        <CalendarDays size={13} aria-hidden="true" />
                        <h4>{group.headingLabel}</h4>
                        <span className="admin-audit-day-count tabular-nums">
                          {group.events.length} evento{group.events.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="admin-audit-day-breakdown">
                        {group.moduleBreakdown.map((mod, idx) => (
                          <span key={mod.category} className="admin-audit-day-mod-stat">
                            {idx > 0 && <span aria-hidden="true">·</span>}
                            <span>
                              {mod.count} {mod.label}
                            </span>
                          </span>
                        ))}
                      </div>
                    </header>

                    <div className="admin-audit-day-events">
                      {group.events.map((ev) => {
                        const { actionText, detailText } = resolveEventText(ev)
                        const dt = new Date(ev.timestampIso)
                        const catMeta = AUDIT_CATEGORY_META[ev.category] || {
                          label: ev.category,
                          shortLabel: ev.category,
                          toneClass: 'cat-settings',
                          chartColor: '#547082',
                        }
                        const actionKind = classifyAuditActionKind(
                          ev.category,
                          actionText,
                          ev.crudOperation
                        )
                        const actionMeta = AUDIT_ACTION_META[actionKind]
                        const isUserFiltered =
                          auditUserFilter !== 'all' &&
                          auditUserFilter.trim().toLowerCase() === ev.user.trim().toLowerCase()
                        const isExpanded = expandedAuditId === ev.id
                        const hasTransitionArrow = detailText.includes('→')
                        const [beforeArrow, afterArrow] = hasTransitionArrow
                          ? detailText.split('→').map((s) => s.trim())
                          : ['', '']

                        return (
                          <article
                            key={ev.id}
                            className={`admin-audit-timeline-row ${isExpanded ? 'expanded' : ''}`}
                          >
                            <div className="admin-audit-time-gutter tabular-nums">
                              <time dateTime={ev.timestampIso}>{formatTime(dt)}</time>
                            </div>

                            <div className="admin-audit-node-col">
                              <span
                                className={`admin-audit-node-icon ${catMeta.toneClass}`}
                                title={catMeta.label}
                              >
                                {renderAuditModuleIcon(ev.category)}
                              </span>
                            </div>

                            <div className="admin-audit-main">
                              <div className="admin-audit-top">
                                <div className="admin-audit-title-group">
                                  <strong>{actionText}</strong>
                                  <span className="admin-audit-inline-meta">
                                    <span>{catMeta.label}</span>
                                    <span aria-hidden="true">·</span>
                                    <span className={`admin-audit-kind-text ${actionMeta.toneClass}`}>
                                      {actionKind === 'create' && <PlusCircle size={11} aria-hidden="true" />}
                                      {actionKind === 'delete' && <Trash2 size={11} aria-hidden="true" />}
                                      {actionKind === 'status' && <RefreshCw size={11} aria-hidden="true" />}
                                      {actionKind === 'transaction' && (
                                        <ArrowLeftRight size={11} aria-hidden="true" />
                                      )}
                                      {actionKind === 'update' && (
                                        <SlidersHorizontal size={11} aria-hidden="true" />
                                      )}
                                      {actionKind === 'access' && <LogIn size={11} aria-hidden="true" />}
                                      {actionMeta.shortLabel}
                                    </span>
                                    {ev.entityType && (
                                      <>
                                        <span aria-hidden="true">·</span>
                                        <span className="admin-audit-entity-tag font-mono tabular-nums">
                                          {ev.entityType}
                                          {ev.entityId ? ` (${ev.entityId})` : ''}
                                        </span>
                                      </>
                                    )}
                                  </span>
                                </div>

                                <div className="admin-audit-row-controls">
                                  <span className="admin-audit-time-mobile tabular-nums">
                                    <Clock3 size={11} /> {formatTime(dt)}
                                  </span>
                                  <button
                                    type="button"
                                    className="admin-audit-trace-toggle"
                                    onClick={() =>
                                      setExpandedAuditId((prev) => (prev === ev.id ? null : ev.id))
                                    }
                                    aria-expanded={isExpanded}
                                  >
                                    <span>{isExpanded ? 'Ocultar traza' : 'Ver traza'}</span>
                                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                  </button>
                                </div>
                              </div>

                              {hasTransitionArrow ? (
                                <p className="admin-audit-detail admin-audit-diff-line">
                                  <span className="admin-audit-diff-before">{beforeArrow}</span>
                                  <ArrowRight size={12} className="admin-audit-diff-arrow" aria-hidden="true" />
                                  <strong className="admin-audit-diff-after">{afterArrow}</strong>
                                </p>
                              ) : (
                                <p className="admin-audit-detail">{detailText}</p>
                              )}

                              {ev.sessionMeta && (
                                <div className="admin-audit-session-meta">
                                  <span>
                                    <ShieldCheck size={11} aria-hidden="true" />
                                    Rol: <strong>{ev.sessionMeta.roleLabel}</strong>
                                  </span>
                                  <span aria-hidden="true" className="admin-audit-meta-sep">·</span>
                                  <span>
                                    <Globe size={11} aria-hidden="true" />
                                    IP: <strong className="tabular-nums font-mono">{ev.sessionMeta.ipAddress}</strong>
                                  </span>
                                  <span aria-hidden="true" className="admin-audit-meta-sep">·</span>
                                  <span>
                                    <Laptop size={11} aria-hidden="true" />
                                    Equipo: <strong>{ev.sessionMeta.deviceBrowser}</strong>
                                  </span>
                                </div>
                              )}

                              <div className="admin-audit-actor">
                                <span>{ev.category === 'session' ? 'Usuario:' : 'Ejecutado por:'}</span>{' '}
                                <button
                                  type="button"
                                  className={`admin-audit-actor-btn ${isUserFiltered ? 'active' : ''}`}
                                  onClick={() =>
                                    setAuditUserFilter((prev) =>
                                      prev.trim().toLowerCase() === ev.user.trim().toLowerCase()
                                        ? 'all'
                                        : ev.user.trim()
                                    )
                                  }
                                  title={
                                    isUserFiltered
                                      ? 'Quitar filtro por este usuario'
                                      : `Ver solo acciones de ${ev.user}`
                                  }
                                >
                                  {ev.user}
                                </button>
                                {ev.userId && (
                                  <span className="admin-audit-userid font-mono tabular-nums">
                                    ID: {ev.userId}
                                  </span>
                                )}
                              </div>

                              {isExpanded && (
                                <div className="admin-audit-trace-drawer">
                                  <div className="admin-audit-trace-grid">
                                    <div>
                                      <span>Identificador</span>
                                      <strong className="font-mono tabular-nums">{ev.id}</strong>
                                    </div>
                                    <div>
                                      <span>Fecha y hora exacta</span>
                                      <strong className="tabular-nums">
                                        {formatDate(dt)} · {formatTime(dt)}
                                      </strong>
                                    </div>
                                    <div>
                                      <span>Timestamp ISO</span>
                                      <strong className="font-mono tabular-nums">{ev.timestampIso}</strong>
                                    </div>
                                    <div>
                                      <span>Usuario / ID actor</span>
                                      <strong className="tabular-nums">
                                        {ev.user}
                                        {ev.userId ? ` (${ev.userId})` : ''}
                                      </strong>
                                    </div>
                                    <div>
                                      <span>Módulo origen</span>
                                      <strong>{catMeta.label}</strong>
                                    </div>
                                    <div>
                                      <span>Clasificación</span>
                                      <strong>
                                        {actionMeta.label}
                                        {ev.crudOperation ? ` · ${ev.crudOperation}` : ''}
                                      </strong>
                                    </div>
                                    {(ev.entityType || ev.entityId) && (
                                      <div>
                                        <span>Entidad afectada</span>
                                        <strong className="font-mono tabular-nums">
                                          {ev.entityType || 'Registro'}
                                          {ev.entityId ? ` · ${ev.entityId}` : ''}
                                        </strong>
                                      </div>
                                    )}
                                  </div>
                                  <div className="admin-audit-trace-actions">
                                    <button
                                      type="button"
                                      className="button button-ghost button-sm"
                                      onClick={() => setAuditFilter(ev.category)}
                                    >
                                      Filtrar módulo ({catMeta.shortLabel})
                                    </button>
                                    <button
                                      type="button"
                                      className="button button-ghost button-sm"
                                      onClick={() => setAuditSpecificActionFilter(actionText)}
                                    >
                                      Filtrar esta acción
                                    </button>
                                    <button
                                      type="button"
                                      className="button button-ghost button-sm"
                                      onClick={() => setAuditUserFilter(ev.user.trim())}
                                    >
                                      Trazar acciones de {ev.user}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Crear / Editar Subsidiaria */}
      {isSubsidiaryModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setIsSubsidiaryModalOpen(false)
              setConfirmingDeleteSubsidiary(false)
            }
          }}
        >
          <section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="modal-sub-title">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">ADMINISTRACIÓN · ENTIDAD LEGAL</div>
                <h2 id="modal-sub-title">
                  {editingSubsidiary ? `Editar Subsidiaria · ${editingSubsidiary.code}` : 'Nueva Subsidiaria'}
                </h2>
                <p>
                  Registra una razón social o entidad operativa y define qué departamentos y ubicaciones físicas operan bajo ella.
                </p>
              </div>
              <button
                className="icon-button"
                onClick={() => {
                  setIsSubsidiaryModalOpen(false)
                  setConfirmingDeleteSubsidiary(false)
                }}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSubsidiary}>
              <div className="form-grid">
                <label className="form-field">
                  <span>Código de subsidiaria *</span>
                  <input
                    required
                    autoFocus
                    placeholder="Ej. SUB-MX o SUB-NTE"
                    value={subCode}
                    onChange={(e) => setSubCode(e.target.value)}
                  />
                </label>

                <label className="form-field">
                  <span>RFC / Tax ID *</span>
                  <input
                    required
                    placeholder="Ej. ANM210412KX8"
                    value={subTaxId}
                    onChange={(e) => setSubTaxId(e.target.value)}
                  />
                </label>
              </div>

              <div className="form-grid">
                <label className="form-field">
                  <span>Nombre comercial *</span>
                  <input
                    required
                    placeholder="Ej. AES Nexus Norte"
                    value={subName}
                    onChange={(e) => setSubName(e.target.value)}
                  />
                </label>

                <label className="form-field">
                  <span>Razón social completa *</span>
                  <input
                    required
                    placeholder="Ej. AES Nexus Norte Operaciones S.A.P.I. de C.V."
                    value={subLegalName}
                    onChange={(e) => setSubLegalName(e.target.value)}
                  />
                </label>
              </div>

              <div className="form-grid">
                <label className="form-field">
                  <span>País *</span>
                  <input
                    required
                    placeholder="Ej. México"
                    value={subCountry}
                    onChange={(e) => setSubCountry(e.target.value)}
                  />
                </label>

                <label className="form-field">
                  <span>Divisa contable *</span>
                  <select
                    required
                    value={subCurrency}
                    onChange={(e) => setSubCurrency(e.target.value)}
                  >
                    <option value="MXN">MXN · Peso Mexicano</option>
                    <option value="USD">USD · Dólar Estadounidense</option>
                    <option value="EUR">EUR · Euro</option>
                    <option value="COP">COP · Peso Colombiano</option>
                    <option value="CLP">CLP · Peso Chileno</option>
                    <option value="BRL">BRL · Real Brasileño</option>
                  </select>
                </label>
              </div>

              <div className="form-grid">
                <label className="form-field">
                  <span>Representante legal / Director</span>
                  <input
                    placeholder="Ej. Andrea Morales"
                    value={subLegalRep}
                    onChange={(e) => setSubLegalRep(e.target.value)}
                  />
                </label>

                <label className="form-field">
                  <span>Domicilio fiscal</span>
                  <input
                    placeholder="Ej. Paseo de la Reforma 222, CDMX"
                    value={subFiscalAddress}
                    onChange={(e) => setSubFiscalAddress(e.target.value)}
                  />
                </label>
              </div>

              <label className="admin-holding-checkbox">
                <input
                  type="checkbox"
                  checked={subIsHolding}
                  onChange={(e) => setSubIsHolding(e.target.checked)}
                />
                <span>Marcar como entidad matriz / holding principal del grupo</span>
              </label>

              {departments.length > 0 && (
                <div className="admin-sub-multiselect">
                  <div className="admin-sub-multiselect-head">
                    <span>
                      Departamentos relacionados ({subLinkedDeptIds.length} de {departments.length})
                    </span>
                    <div className="admin-sub-multiselect-tools">
                      <button
                        type="button"
                        onClick={() => setSubLinkedDeptIds(departments.map((d) => d.id))}
                      >
                        Todos
                      </button>
                      <button type="button" onClick={() => setSubLinkedDeptIds([])}>
                        Ninguno
                      </button>
                    </div>
                  </div>
                  <div className="admin-sub-multiselect-grid">
                    {departments.map((d) => {
                      const selected = subLinkedDeptIds.includes(d.id)
                      return (
                        <button
                          key={d.id}
                          type="button"
                          className={`admin-sub-option ${selected ? 'selected' : ''}`}
                          onClick={() => setSubLinkedDeptIds((prev) => toggleIdInList(prev, d.id))}
                        >
                          <span className="admin-sub-option-check">
                            {selected && <Check size={11} />}
                          </span>
                          <span className="admin-sub-option-copy">
                            <strong>{d.code} · {d.name}</strong>
                            <small>Líder: {d.leader}</small>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {locations.length > 0 && (
                <div className="admin-sub-multiselect">
                  <div className="admin-sub-multiselect-head">
                    <span>
                      Ubicaciones físicas relacionadas ({subLinkedLocationIds.length} de {locations.length})
                    </span>
                    <div className="admin-sub-multiselect-tools">
                      <button
                        type="button"
                        onClick={() => setSubLinkedLocationIds(locations.map((l) => l.id))}
                      >
                        Todas
                      </button>
                      <button type="button" onClick={() => setSubLinkedLocationIds([])}>
                        Ninguna
                      </button>
                    </div>
                  </div>
                  <div className="admin-sub-multiselect-grid">
                    {locations.map((l) => {
                      const selected = subLinkedLocationIds.includes(l.id)
                      return (
                        <button
                          key={l.id}
                          type="button"
                          className={`admin-sub-option ${selected ? 'selected' : ''}`}
                          onClick={() =>
                            setSubLinkedLocationIds((prev) => toggleIdInList(prev, l.id))
                          }
                        >
                          <span className="admin-sub-option-check">
                            {selected && <Check size={11} />}
                          </span>
                          <span className="admin-sub-option-copy">
                            <strong>{l.code} · {l.name}</strong>
                            <small>{l.city} · {l.type}</small>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div
                className={`create-modal-actions ${
                  editingSubsidiary && canDeleteSub ? 'has-delete-action' : ''
                }`}
              >
                {editingSubsidiary && canDeleteSub && (
                  <div className="modal-delete-slot">
                    {confirmingDeleteSubsidiary ? (
                      <div className="modal-delete-confirm">
                        <span>¿Eliminar subsidiaria?</span>
                        <button
                          type="button"
                          className="button button-secondary button-sm"
                          onClick={() => setConfirmingDeleteSubsidiary(false)}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className="button button-danger-solid button-sm"
                          onClick={handleDeleteSubsidiaryConfirmed}
                        >
                          <Trash2 size={12} /> Confirmar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="button button-danger-outline"
                        onClick={() => setConfirmingDeleteSubsidiary(true)}
                      >
                        <Trash2 size={13} /> Eliminar subsidiaria
                      </button>
                    )}
                  </div>
                )}

                <div className="modal-primary-actions-slot">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => {
                      setIsSubsidiaryModalOpen(false)
                      setConfirmingDeleteSubsidiary(false)
                    }}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="button button-primary">
                    {editingSubsidiary ? <Check size={14} /> : <Plus size={14} />}
                    {editingSubsidiary ? 'Guardar cambios' : 'Guardar subsidiaria'}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal: Crear / Editar Departamento */}
      {isDeptModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setIsDeptModalOpen(false)
              setConfirmingDeleteDept(false)
            }
          }}
        >
          <section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="modal-dept-title">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">ADMINISTRACIÓN · ESTRUCTURA</div>
                <h2 id="modal-dept-title">
                  {editingDepartment ? `Editar Departamento · ${editingDepartment.code}` : 'Nuevo Departamento'}
                </h2>
                <p>
                  Configura la unidad funcional, su centro de costos y las subsidiarias con las que opera.
                </p>
              </div>
              <button
                className="icon-button"
                onClick={() => {
                  setIsDeptModalOpen(false)
                  setConfirmingDeleteDept(false)
                }}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDepartment}>
              <div className="form-grid">
                <label className="form-field">
                  <span>Código de departamento *</span>
                  <input
                    required
                    autoFocus
                    placeholder="Ej. RH-06 o CAL-07"
                    value={deptCode}
                    onChange={(e) => setDeptCode(e.target.value)}
                  />
                </label>

                <label className="form-field">
                  <span>Centro de costos asignado</span>
                  <input
                    placeholder="Ej. CC-600"
                    value={deptCostCenter}
                    onChange={(e) => setDeptCostCenter(e.target.value)}
                  />
                </label>
              </div>

              <div className="form-grid">
                <label className="form-field">
                  <span>Nombre del departamento *</span>
                  <input
                    required
                    placeholder="Ej. Recursos Humanos y Talento"
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                  />
                </label>

                <label className="form-field">
                  <span>Líder o responsable *</span>
                  <input
                    required
                    placeholder="Ej. Sofía Ramírez"
                    value={deptLeader}
                    onChange={(e) => setDeptLeader(e.target.value)}
                  />
                </label>
              </div>

              <label className="form-field">
                <span>Descripción o funciones del departamento</span>
                <input
                  placeholder="Ej. Gestión de nómina, desarrollo organizacional y contrataciones."
                  value={deptDescription}
                  onChange={(e) => setDeptDescription(e.target.value)}
                />
              </label>

              <div className="admin-sub-multiselect">
                <div className="admin-sub-multiselect-head">
                  <span>
                    Subsidiarias relacionadas * ({deptSubsidiaryIds.length} de {subsidiaries.length})
                  </span>
                  {subsidiaries.length > 0 && (
                    <div className="admin-sub-multiselect-tools">
                      <button
                        type="button"
                        onClick={() => setDeptSubsidiaryIds(subsidiaries.map((s) => s.id))}
                      >
                        Todas
                      </button>
                      <button type="button" onClick={() => setDeptSubsidiaryIds([])}>
                        Limpiar
                      </button>
                    </div>
                  )}
                </div>
                {subsidiaries.length === 0 ? (
                  <p className="admin-sub-multiselect-empty">
                    No hay subsidiarias registradas aún. Crea una en la pestaña Subsidiarias para vincular este departamento.
                  </p>
                ) : (
                  <div className="admin-sub-multiselect-grid">
                    {subsidiaries.map((sub) => {
                      const selected = deptSubsidiaryIds.includes(sub.id)
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          className={`admin-sub-option ${selected ? 'selected' : ''}`}
                          onClick={() =>
                            setDeptSubsidiaryIds((prev) => toggleIdInList(prev, sub.id))
                          }
                        >
                          <span className="admin-sub-option-check">
                            {selected && <Check size={11} />}
                          </span>
                          <span className="admin-sub-option-copy">
                            <strong>{sub.code} · {sub.name}</strong>
                            <small>{sub.country} · {sub.currency}</small>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div
                className={`create-modal-actions ${
                  editingDepartment && canDeleteDept ? 'has-delete-action' : ''
                }`}
              >
                {editingDepartment && canDeleteDept && (
                  <div className="modal-delete-slot">
                    {confirmingDeleteDept ? (
                      <div className="modal-delete-confirm">
                        <span>¿Eliminar departamento?</span>
                        <button
                          type="button"
                          className="button button-secondary button-sm"
                          onClick={() => setConfirmingDeleteDept(false)}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className="button button-danger-solid button-sm"
                          onClick={handleDeleteDeptConfirmed}
                        >
                          <Trash2 size={12} /> Confirmar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="button button-danger-outline"
                        onClick={() => setConfirmingDeleteDept(true)}
                      >
                        <Trash2 size={13} /> Eliminar departamento
                      </button>
                    )}
                  </div>
                )}

                <div className="modal-primary-actions-slot">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => {
                      setIsDeptModalOpen(false)
                      setConfirmingDeleteDept(false)
                    }}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="button button-primary">
                    {editingDepartment ? <Check size={14} /> : <Plus size={14} />}
                    {editingDepartment ? 'Guardar cambios' : 'Guardar departamento'}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal: Crear / Editar Ubicación Física */}
      {isLocationModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setIsLocationModalOpen(false)
              setConfirmingDeleteLoc(false)
            }
          }}
        >
          <section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="modal-loc-title">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">ADMINISTRACIÓN · INFRAESTRUCTURA</div>
                <h2 id="modal-loc-title">
                  {editingLocation ? `Editar Ubicación · ${editingLocation.code}` : 'Nueva Ubicación Física'}
                </h2>
                <p>
                  Registra una sede, almacén o sucursal operativa y asígnala a una o más subsidiarias.
                </p>
              </div>
              <button
                className="icon-button"
                onClick={() => {
                  setIsLocationModalOpen(false)
                  setConfirmingDeleteLoc(false)
                }}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveLocation}>
              <div className="form-grid">
                <label className="form-field">
                  <span>Código de la sede *</span>
                  <input
                    required
                    autoFocus
                    placeholder="Ej. SUC-QRO o ALM-GDL"
                    value={locCode}
                    onChange={(e) => setLocCode(e.target.value)}
                  />
                </label>

                <label className="form-field">
                  <span>Tipo de ubicación *</span>
                  <select
                    required
                    value={locType}
                    onChange={(e) => setLocType(e.target.value as LocationType)}
                  >
                    {LOCATION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form-grid">
                <label className="form-field">
                  <span>Nombre de la sede o sucursal *</span>
                  <input
                    required
                    placeholder="Ej. Centro Operativo Querétaro"
                    value={locName}
                    onChange={(e) => setLocName(e.target.value)}
                  />
                </label>

                <label className="form-field">
                  <span>Encargado / Administrador</span>
                  <input
                    placeholder="Ej. Rodrigo Vargas"
                    value={locManager}
                    onChange={(e) => setLocManager(e.target.value)}
                  />
                </label>
              </div>

              <label className="form-field">
                <span>Dirección física completa *</span>
                <input
                  required
                  placeholder="Ej. Av. 5 de Febrero 1300, Parque Industrial Benito Juárez"
                  value={locAddress}
                  onChange={(e) => setLocAddress(e.target.value)}
                />
              </label>

              <div className="form-grid">
                <label className="form-field">
                  <span>Ciudad o Municipio *</span>
                  <input
                    required
                    placeholder="Ej. Querétaro"
                    value={locCity}
                    onChange={(e) => setLocCity(e.target.value)}
                  />
                </label>

                <label className="form-field">
                  <span>Estado / Entidad</span>
                  <input
                    placeholder="Ej. Querétaro"
                    value={locState}
                    onChange={(e) => setLocState(e.target.value)}
                  />
                </label>
              </div>

              <label className="form-field">
                <span>País</span>
                <input
                  placeholder="Ej. México"
                  value={locCountry}
                  onChange={(e) => setLocCountry(e.target.value)}
                />
              </label>

              <div className="admin-sub-multiselect">
                <div className="admin-sub-multiselect-head">
                  <span>
                    Subsidiarias relacionadas * ({locSubsidiaryIds.length} de {subsidiaries.length})
                  </span>
                  {subsidiaries.length > 0 && (
                    <div className="admin-sub-multiselect-tools">
                      <button
                        type="button"
                        onClick={() => setLocSubsidiaryIds(subsidiaries.map((s) => s.id))}
                      >
                        Todas
                      </button>
                      <button type="button" onClick={() => setLocSubsidiaryIds([])}>
                        Limpiar
                      </button>
                    </div>
                  )}
                </div>
                {subsidiaries.length === 0 ? (
                  <p className="admin-sub-multiselect-empty">
                    No hay subsidiarias registradas aún. Crea una en la pestaña Subsidiarias para relacionar esta sede.
                  </p>
                ) : (
                  <div className="admin-sub-multiselect-grid">
                    {subsidiaries.map((sub) => {
                      const selected = locSubsidiaryIds.includes(sub.id)
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          className={`admin-sub-option ${selected ? 'selected' : ''}`}
                          onClick={() =>
                            setLocSubsidiaryIds((prev) => toggleIdInList(prev, sub.id))
                          }
                        >
                          <span className="admin-sub-option-check">
                            {selected && <Check size={11} />}
                          </span>
                          <span className="admin-sub-option-copy">
                            <strong>{sub.code} · {sub.name}</strong>
                            <small>{sub.country} · {sub.currency}</small>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div
                className={`create-modal-actions ${
                  editingLocation && canDeleteLoc ? 'has-delete-action' : ''
                }`}
              >
                {editingLocation && canDeleteLoc && (
                  <div className="modal-delete-slot">
                    {confirmingDeleteLoc ? (
                      <div className="modal-delete-confirm">
                        <span>¿Eliminar ubicación?</span>
                        <button
                          type="button"
                          className="button button-secondary button-sm"
                          onClick={() => setConfirmingDeleteLoc(false)}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className="button button-danger-solid button-sm"
                          onClick={handleDeleteLocationConfirmed}
                        >
                          <Trash2 size={12} /> Confirmar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="button button-danger-outline"
                        onClick={() => setConfirmingDeleteLoc(true)}
                      >
                        <Trash2 size={13} /> Eliminar ubicación
                      </button>
                    )}
                  </div>
                )}

                <div className="modal-primary-actions-slot">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => {
                      setIsLocationModalOpen(false)
                      setConfirmingDeleteLoc(false)
                    }}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="button button-primary">
                    {editingLocation ? <Check size={14} /> : <Plus size={14} />}
                    {editingLocation ? 'Guardar cambios' : 'Guardar ubicación'}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  )
}
