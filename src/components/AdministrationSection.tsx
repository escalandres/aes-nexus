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
  appendAuditLog,
  loadStoredAuditEvents,
  loadStoredWorkspaceUsers,
  type AuditCategory,
  type AuditEventRecord,
  type WorkspaceUserRecord,
} from '../data/settings'
import type { EmployeeRecord } from '../data/employees'

export interface DepartmentRecord {
  id: string
  code: string
  name: string
  leader: string
  costCenter?: string
  description?: string
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
  active: boolean
}

export type AdminSectionTab = 'Departamentos' | 'Ubicaciones' | 'Resumen' | 'Historial de Auditoría'

interface AdministrationSectionProps {
  departments: DepartmentRecord[]
  locations: PhysicalLocationRecord[]
  employees?: EmployeeRecord[]
  onAddDepartment: (dep: DepartmentRecord) => void
  onAddLocation: (loc: PhysicalLocationRecord) => void
  onUpdateDepartments: (deps: DepartmentRecord[]) => void
  onUpdateLocations: (locs: PhysicalLocationRecord[]) => void
  adminSection: AdminSectionTab
  onNavigateSection: (sec: AdminSectionTab) => void
  allowedSections?: AdminSectionTab[]
  currentUserName?: string
}

const LOCATION_TYPES: LocationType[] = [
  'Oficina corporativa',
  'Sucursal',
  'Almacén / Bodega',
  'Taller / Operación',
  'Punto de venta',
]

type AdminAuditFilter = 'all' | AuditCategory

type AuditActionKind = 'all' | 'create' | 'update' | 'status' | 'transaction' | 'access'

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
  status: { label: 'Estado / Aprobación', shortLabel: 'Estado', toneClass: 'act-status' },
  transaction: { label: 'Operación / Movimiento', shortLabel: 'Operación', toneClass: 'act-transaction' },
  access: { label: 'Acceso / Sesión', shortLabel: 'Acceso', toneClass: 'act-access' },
}

function classifyAuditActionKind(
  category: AuditCategory,
  actionText: string
): Exclude<AuditActionKind, 'all'> {
  const normalized = actionText.toLowerCase()
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
  departments,
  locations,
  employees = [],
  onAddDepartment,
  onAddLocation,
  onUpdateDepartments,
  onUpdateLocations,
  adminSection,
  onNavigateSection,
  allowedSections,
  currentUserName = 'Andrea Morales',
}: AdministrationSectionProps) {
  const toast = useToast()
  const { t, formatDate, formatTime } = useI18n()

  // Search queries
  const [departmentSearch, setDepartmentSearch] = useState('')
  const [locationSearch, setLocationSearch] = useState('')
  const [locationTypeFilter, setLocationTypeFilter] = useState<string>('Todos')

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
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false)
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)

  // Department form state
  const [deptCode, setDeptCode] = useState('')
  const [deptName, setDeptName] = useState('')
  const [deptLeader, setDeptLeader] = useState('')
  const [deptCostCenter, setDeptCostCenter] = useState('')
  const [deptDescription, setDeptDescription] = useState('')

  // Location form state
  const [locCode, setLocCode] = useState('')
  const [locName, setLocName] = useState('')
  const [locType, setLocType] = useState<LocationType>('Sucursal')
  const [locAddress, setLocAddress] = useState('')
  const [locCity, setLocCity] = useState('')
  const [locState, setLocState] = useState('')
  const [locCountry, setLocCountry] = useState('México')
  const [locManager, setLocManager] = useState('')

  // Filtered departments
  const filteredDepartments = useMemo(() => {
    const q = departmentSearch.toLowerCase().trim()
    if (!q) return departments
    return departments.filter(
      (d) =>
        d.code.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        d.leader.toLowerCase().includes(q) ||
        (d.costCenter && d.costCenter.toLowerCase().includes(q)) ||
        (d.description && d.description.toLowerCase().includes(q))
    )
  }, [departments, departmentSearch])

  // Filtered locations
  const filteredLocations = useMemo(() => {
    const q = locationSearch.toLowerCase().trim()
    return locations.filter((loc) => {
      const matchType = locationTypeFilter === 'Todos' || loc.type === locationTypeFilter
      const matchQuery =
        !q ||
        loc.code.toLowerCase().includes(q) ||
        loc.name.toLowerCase().includes(q) ||
        loc.city.toLowerCase().includes(q) ||
        loc.state.toLowerCase().includes(q) ||
        loc.address.toLowerCase().includes(q) ||
        (loc.manager && loc.manager.toLowerCase().includes(q))
      return matchType && matchQuery
    })
  }, [locations, locationSearch, locationTypeFilter])

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
      const kind = classifyAuditActionKind(ev.category, actionText)
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
      const actionKindLabel = AUDIT_ACTION_META[classifyAuditActionKind(ev.category, actionText)].label
      const metaText = ev.sessionMeta
        ? `${ev.sessionMeta.roleLabel} ${ev.sessionMeta.ipAddress} ${ev.sessionMeta.deviceBrowser}`.toLowerCase()
        : ''
      return (
        actionText.toLowerCase().includes(q) ||
        detailText.toLowerCase().includes(q) ||
        ev.user.toLowerCase().includes(q) ||
        catLabel.toLowerCase().includes(q) ||
        actionKindLabel.toLowerCase().includes(q) ||
        metaText.includes(q)
      )
    })
  }, [auditEvents, auditSearch, auditUserFilter, auditDateFrom, auditDateTo, t])

  const moduleFilterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: auditBaseScopedEvents.length }
    auditBaseScopedEvents.forEach((ev) => {
      const { actionText } = resolveEventText(ev)
      const kind = classifyAuditActionKind(ev.category, actionText)
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
      status: 0,
      transaction: 0,
      access: 0,
    }
    auditBaseScopedEvents.forEach((ev) => {
      if (auditFilter !== 'all' && ev.category !== auditFilter) return
      const { actionText } = resolveEventText(ev)
      const kind = classifyAuditActionKind(ev.category, actionText)
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
        classifyAuditActionKind(ev.category, actionText) !== auditActionKindFilter
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
              classifyAuditActionKind(ev.category, actionText) !== auditActionKindFilter
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
      'Módulo',
      'Tipo de acción',
      'Acción',
      'Detalle',
      'Usuario',
      'Rol',
      'IP',
      'Dispositivo / Navegador',
    ]
    const rows = filteredAuditEvents.map((ev) => {
      const { actionText, detailText } = resolveEventText(ev)
      const dt = new Date(ev.timestampIso)
      const catLabel = AUDIT_CATEGORY_META[ev.category]?.label || ev.category
      const kindLabel = AUDIT_ACTION_META[classifyAuditActionKind(ev.category, actionText)].label
      return [
        `${formatDate(dt)} ${formatTime(dt)}`,
        catLabel,
        kindLabel,
        actionText,
        detailText,
        ev.user,
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

  // Handle department creation
  const handleCreateDepartment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!deptCode.trim() || !deptName.trim() || !deptLeader.trim()) {
      toast.error('Indica el código, nombre y líder del departamento.', 'Campos requeridos')
      return
    }

    if (departments.some((d) => d.code.trim().toLowerCase() === deptCode.trim().toLowerCase())) {
      toast.warning(`Ya existe un departamento con el código ${deptCode.trim()}.`, 'Código duplicado')
      return
    }

    const newDept: DepartmentRecord = {
      id: `dep_${Date.now()}`,
      code: deptCode.trim().toUpperCase(),
      name: deptName.trim(),
      leader: deptLeader.trim(),
      costCenter: deptCostCenter.trim() || undefined,
      description: deptDescription.trim() || undefined,
      active: true,
    }

    onAddDepartment(newDept)
    toast.success(`Departamento “${newDept.name}” creado exitosamente.`, 'Departamento registrado')

    setIsDeptModalOpen(false)
    setDeptCode('')
    setDeptName('')
    setDeptLeader('')
    setDeptCostCenter('')
    setDeptDescription('')
  }

  // Handle location creation
  const handleCreateLocation = (e: React.FormEvent) => {
    e.preventDefault()
    if (!locCode.trim() || !locName.trim() || !locAddress.trim() || !locCity.trim()) {
      toast.error('Completa el código, nombre, dirección y ciudad de la sede.', 'Campos requeridos')
      return
    }

    if (locations.some((l) => l.code.trim().toLowerCase() === locCode.trim().toLowerCase())) {
      toast.warning(`Ya existe una ubicación con el código ${locCode.trim()}.`, 'Código duplicado')
      return
    }

    const newLocation: PhysicalLocationRecord = {
      id: `loc_${Date.now()}`,
      code: locCode.trim().toUpperCase(),
      name: locName.trim(),
      type: locType,
      address: locAddress.trim(),
      city: locCity.trim(),
      state: locState.trim() || locCity.trim(),
      country: locCountry.trim() || 'México',
      manager: locManager.trim() || undefined,
      active: true,
    }

    onAddLocation(newLocation)
    toast.success(`Ubicación física “${newLocation.name}” agregada al sistema.`, 'Ubicación registrada')

    setIsLocationModalOpen(false)
    setLocCode('')
    setLocName('')
    setLocType('Sucursal')
    setLocAddress('')
    setLocCity('')
    setLocState('')
    setLocManager('')
  }

  const toggleDepartmentStatus = (id: string) => {
    const updated = departments.map((d) => (d.id === id ? { ...d, active: !d.active } : d))
    onUpdateDepartments(updated)
    const dept = departments.find((d) => d.id === id)
    if (dept) {
      appendAuditLog({
        category: 'admin',
        action: 'Cambio de estado de departamento',
        detail: `${dept.code} · ${dept.name} → ${dept.active ? 'Inactivo' : 'Activo'}`,
        user: currentUserName,
      })
    }
    toast.info(
      `Departamento ${dept?.name} ahora está ${dept?.active ? 'Inactivo' : 'Activo'}.`,
      'Estado actualizado'
    )
  }

  const toggleLocationStatus = (id: string) => {
    const updated = locations.map((l) => (l.id === id ? { ...l, active: !l.active } : l))
    onUpdateLocations(updated)
    const loc = locations.find((l) => l.id === id)
    if (loc) {
      appendAuditLog({
        category: 'admin',
        action: 'Cambio de estado de ubicación física',
        detail: `${loc.code} · ${loc.name} → ${loc.active ? 'Inactiva' : 'Activa'}`,
        user: currentUserName,
      })
    }
    toast.info(
      `Ubicación ${loc?.name} ahora está ${loc?.active ? 'Inactiva' : 'Activa'}.`,
      'Estado actualizado'
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
            Configuración y estructura de la organización: gestión de departamentos, líderes, centros de costos y sedes físicas.
          </p>
        </div>
      </div>

      {/* Navigation tabs */}
      <nav className="crm-tabs" aria-label="Secciones de Administración">
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
                <p>Estructura departamental, responsables de área y asignación de centros de costos.</p>
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
            <div className="ops-filter-group">
              <div className="ops-search-input-wrap" style={{ minWidth: '320px' }}>
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
            </div>

            <div className="ops-actions-group">
              <button
                className="button button-primary"
                onClick={() => setIsDeptModalOpen(true)}
              >
                <Plus size={14} /> Nuevo departamento
              </button>
            </div>
          </div>

          {/* Departments Table */}
          <div className="table-wrap ops-table-wrap">
            <table className="data-table ops-data-table">
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>CÓDIGO</th>
                  <th>DEPARTAMENTO / ÁREA</th>
                  <th>LÍDER / RESPONSABLE</th>
                  <th>CENTRO DE COSTOS</th>
                  <th>ESTADO</th>
                  <th style={{ textAlign: 'right', width: '110px' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-cell">
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
                        <button
                          type="button"
                          className="button-icon-action"
                          onClick={() => toggleDepartmentStatus(d.id)}
                          title={d.active ? 'Desactivar departamento' : 'Activar departamento'}
                        >
                          {d.active ? 'Desactivar' : 'Reactivar'}
                        </button>
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
                <p>Direcciones de oficinas, almacenes, sucursales y puntos de operación de la entidad.</p>
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
              <div className="ops-search-input-wrap" style={{ minWidth: '280px' }}>
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
            </div>

            <div className="ops-actions-group">
              <button
                className="button button-primary"
                onClick={() => setIsLocationModalOpen(true)}
              >
                <Plus size={14} /> Nueva ubicación
              </button>
            </div>
          </div>

          {/* Locations Table */}
          <div className="table-wrap ops-table-wrap">
            <table className="data-table ops-data-table">
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>CÓDIGO</th>
                  <th>SEDE / UBICACIÓN</th>
                  <th>TIPO</th>
                  <th>DIRECCIÓN Y CIUDAD</th>
                  <th>ENCARGADO</th>
                  <th>ESTADO</th>
                  <th style={{ textAlign: 'right', width: '110px' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filteredLocations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-cell">
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
                        <button
                          type="button"
                          className="button-icon-action"
                          onClick={() => toggleLocationStatus(loc.id)}
                          title={loc.active ? 'Inhabilitar sede' : 'Habilitar sede'}
                        >
                          {loc.active ? 'Inhabilitar' : 'Habilitar'}
                        </button>
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
                      <small style={{ fontSize: '8.5px', color: '#7a8980' }}>
                        Líder: {d.leader} {d.costCenter && `· CC: ${d.costCenter}`}
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
                      <small style={{ fontSize: '8.5px', color: '#7a8980' }}>
                        {l.city}, {l.state} · {l.type}
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
                  Los departamentos y ubicaciones registrados alimentan los centros de costos y almacenes operativos del sistema.
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="button button-secondary"
                onClick={() => setIsDeptModalOpen(true)}
              >
                <Plus size={13} /> Agregar departamento
              </button>
              <button
                className="button button-primary"
                onClick={() => setIsLocationModalOpen(true)}
              >
                <Plus size={13} /> Agregar ubicación
              </button>
            </div>
          </div>
        </div>
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
                        const actionKind = classifyAuditActionKind(ev.category, actionText)
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
                                      <span>Módulo origen</span>
                                      <strong>{catMeta.label}</strong>
                                    </div>
                                    <div>
                                      <span>Clasificación</span>
                                      <strong>{actionMeta.label}</strong>
                                    </div>
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

      {/* Modal: Crear Departamento */}
      {isDeptModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsDeptModalOpen(false)
          }}
        >
          <section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="modal-dept-title">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">ADMINISTRACIÓN · ESTRUCTURA</div>
                <h2 id="modal-dept-title">Nuevo Departamento</h2>
                <p>Crea una nueva unidad funcional en la organización para asignación de personal y centros de costos.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setIsDeptModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateDepartment}>
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

              <div className="create-modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsDeptModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="button button-primary">
                  <Plus size={14} /> Guardar departamento
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal: Crear Ubicación Física */}
      {isLocationModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsLocationModalOpen(false)
          }}
        >
          <section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="modal-loc-title">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">ADMINISTRACIÓN · INFRAESTRUCTURA</div>
                <h2 id="modal-loc-title">Nueva Ubicación Física</h2>
                <p>Registra una nueva sede, almacén o sucursal operativa para la empresa.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setIsLocationModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateLocation}>
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

              <div className="create-modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsLocationModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="button button-primary">
                  <Plus size={14} /> Guardar ubicación
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  )
}
