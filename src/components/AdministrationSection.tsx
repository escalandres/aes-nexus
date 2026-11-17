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

type AdminAuditFilter =
  | 'all'
  | 'session'
  | 'sales'
  | 'users'
  | 'inventory'
  | 'finance'
  | 'admin'
  | 'system'

const AUDIT_CATEGORY_META: Record<
  AuditCategory,
  { label: string; toneClass: string }
> = {
  session: { label: 'Inicio de sesión', toneClass: 'cat-session' },
  sales: { label: 'Facturación y Ventas', toneClass: 'cat-sales' },
  users: { label: 'Roles y Usuarios', toneClass: 'cat-users' },
  inventory: { label: 'Inventario', toneClass: 'cat-inventory' },
  finance: { label: 'Finanzas', toneClass: 'cat-finance' },
  admin: { label: 'Administración', toneClass: 'cat-admin' },
  settings: { label: 'Configuración', toneClass: 'cat-system' },
  security: { label: 'Seguridad', toneClass: 'cat-system' },
  integrations: { label: 'Integraciones', toneClass: 'cat-system' },
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
  const [auditUserFilter, setAuditUserFilter] = useState<string>('all')
  const [auditDateFrom, setAuditDateFrom] = useState<string>('')
  const [auditDateTo, setAuditDateTo] = useState<string>('')
  const [auditSortOrder, setAuditSortOrder] = useState<'desc' | 'asc'>('desc')

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

  const filteredAuditEvents = useMemo(() => {
    const q = auditSearch.trim().toLowerCase()
    const userFilterKey = auditUserFilter.trim().toLowerCase()
    const hasBothDates = Boolean(auditDateFrom && auditDateTo)
    const rangeStart = hasBothDates && auditDateFrom > auditDateTo ? auditDateTo : auditDateFrom
    const rangeEnd = hasBothDates && auditDateFrom > auditDateTo ? auditDateFrom : auditDateTo

    const list = auditEvents.filter((ev) => {
      const userMatch =
        auditUserFilter === 'all' || ev.user.trim().toLowerCase() === userFilterKey
      if (!userMatch) return false

      if (rangeStart || rangeEnd) {
        const evDateKey = toLocalDateKey(new Date(ev.timestampIso))
        if (rangeStart && evDateKey < rangeStart) return false
        if (rangeEnd && evDateKey > rangeEnd) return false
      }

      const catMatch =
        auditFilter === 'all'
          ? true
          : auditFilter === 'system'
          ? ev.category === 'settings' || ev.category === 'security' || ev.category === 'integrations'
          : ev.category === auditFilter
      if (!catMatch) return false
      if (!q) return true
      const { actionText, detailText } = resolveEventText(ev)
      const catLabel = AUDIT_CATEGORY_META[ev.category]?.label || ev.category
      const metaText = ev.sessionMeta
        ? `${ev.sessionMeta.roleLabel} ${ev.sessionMeta.ipAddress} ${ev.sessionMeta.deviceBrowser}`.toLowerCase()
        : ''
      return (
        actionText.toLowerCase().includes(q) ||
        detailText.toLowerCase().includes(q) ||
        ev.user.toLowerCase().includes(q) ||
        catLabel.toLowerCase().includes(q) ||
        metaText.includes(q)
      )
    })

    return [...list].sort((a, b) => {
      const ta = new Date(a.timestampIso).getTime()
      const tb = new Date(b.timestampIso).getTime()
      return auditSortOrder === 'desc' ? tb - ta : ta - tb
    })
  }, [
    auditEvents,
    auditSearch,
    auditFilter,
    auditUserFilter,
    auditDateFrom,
    auditDateTo,
    auditSortOrder,
    t,
  ])

  const todayAuditCount = useMemo(
    () => auditEvents.filter((ev) => toLocalDateKey(new Date(ev.timestampIso)) === todayDateKey).length,
    [auditEvents, todayDateKey]
  )

  const loginFrequencyChartData = useMemo(() => {
    const userFilterKey = auditUserFilter.trim().toLowerCase()
    const sessionEvents = auditEvents.filter((ev) => {
      if (ev.category !== 'session') return false
      if (auditUserFilter !== 'all' && ev.user.trim().toLowerCase() !== userFilterKey) {
        return false
      }
      return true
    })

    const countByDate = new Map<string, { count: number; users: Set<string> }>()
    let earliestSessionKey = todayDateKey
    let latestSessionKey = todayDateKey

    sessionEvents.forEach((ev) => {
      const key = toLocalDateKey(new Date(ev.timestampIso))
      if (key < earliestSessionKey) earliestSessionKey = key
      if (key > latestSessionKey) latestSessionKey = key
      const existing = countByDate.get(key)
      if (existing) {
        existing.count += 1
        existing.users.add(ev.user)
      } else {
        countByDate.set(key, { count: 1, users: new Set([ev.user]) })
      }
    })

    const hasBoth = Boolean(auditDateFrom && auditDateTo)
    const rawStart = hasBoth && auditDateFrom > auditDateTo ? auditDateTo : auditDateFrom
    const rawEnd = hasBoth && auditDateFrom > auditDateTo ? auditDateFrom : auditDateTo

    let startKey = rawStart || (earliestSessionKey < sevenDaysAgoDateKey ? earliestSessionKey : sevenDaysAgoDateKey)
    let endKey = rawEnd || (latestSessionKey > todayDateKey ? latestSessionKey : todayDateKey)

    if (!rawStart && rawEnd) {
      startKey = earliestSessionKey < rawEnd ? earliestSessionKey : rawEnd
    }
    if (rawStart && !rawEnd) {
      endKey = latestSessionKey > rawStart ? (latestSessionKey > todayDateKey ? latestSessionKey : todayDateKey) : rawStart
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

    const points: Array<{
      dateKey: string
      label: string
      fullDateLabel: string
      logins: number
      uniqueUsers: number
    }> = []

    if (dayDiff <= 45) {
      const cursor = new Date(startDate)
      while (cursor.getTime() <= endDate.getTime()) {
        const key = toLocalDateKey(cursor)
        const entry = countByDate.get(key)
        points.push({
          dateKey: key,
          label: shortFmt.format(cursor),
          fullDateLabel: fullFmt.format(cursor),
          logins: entry?.count || 0,
          uniqueUsers: entry?.users.size || 0,
        })
        cursor.setDate(cursor.getDate() + 1)
      }
    } else {
      Array.from(countByDate.entries())
        .filter(([k]) => k >= startKey && k <= endKey)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([key, entry]) => {
          const dt = parseKeyToLocalDate(key)
          points.push({
            dateKey: key,
            label: shortFmt.format(dt),
            fullDateLabel: fullFmt.format(dt),
            logins: entry.count,
            uniqueUsers: entry.users.size,
          })
        })
    }

    return points
  }, [auditEvents, auditUserFilter, auditDateFrom, auditDateTo, todayDateKey, sevenDaysAgoDateKey])

  const totalLoginsInChartRange = useMemo(
    () => loginFrequencyChartData.reduce((acc, d) => acc + d.logins, 0),
    [loginFrequencyChartData]
  )

  const handleExportAuditCsv = () => {
    const header = [
      'Fecha y hora',
      'Categoría',
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
      return [
        `${formatDate(dt)} ${formatTime(dt)}`,
        catLabel,
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
                <div className="panel-kicker">FRECUENCIA DE ACCESOS</div>
                <h3>
                  Inicios de sesión por día{' '}
                  <span className="admin-audit-chart-count tabular-nums">
                    ({totalLoginsInChartRange} en el rango)
                  </span>
                </h3>
              </div>
              <div className="admin-audit-chart-meta">
                {auditUserFilter !== 'all' && (
                  <span className="admin-audit-chart-scope">Usuario: {auditUserFilter}</span>
                )}
                <span className="admin-audit-chart-hint">
                  Haz clic en una barra para filtrar ese día
                </span>
              </div>
            </div>

            {loginFrequencyChartData.length === 0 ? (
              <div className="admin-audit-chart-empty">
                <LogIn size={15} />
                <span>Sin inicios de sesión registrados en el rango seleccionado.</span>
              </div>
            ) : (
              <div className="admin-audit-recharts-wrap">
                <ResponsiveContainer width="100%" height={148}>
                  <BarChart
                    data={loginFrequencyChartData}
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
                          logins: number
                          uniqueUsers: number
                        }
                        return (
                          <div className="admin-audit-chart-tooltip">
                            <strong>{row.fullDateLabel}</strong>
                            <span>
                              {row.logins} inicio(s) de sesión
                              {row.uniqueUsers > 0 ? ` · ${row.uniqueUsers} usuario(s)` : ''}
                            </span>
                          </div>
                        )
                      }}
                    />
                    <Bar
                      dataKey="logins"
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
                      {loginFrequencyChartData.map((entry) => {
                        const isSelectedDay =
                          auditDateFrom === entry.dateKey && auditDateTo === entry.dateKey
                        return (
                          <Cell
                            key={entry.dateKey}
                            fill={
                              isSelectedDay
                                ? '#0d5e57'
                                : entry.logins > 0
                                ? '#0f766e'
                                : 'rgba(140, 155, 146, 0.25)'
                            }
                          />
                        )
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
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
                  placeholder="Buscar por acción, usuario, rol, IP, dispositivo o detalle..."
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
                  { id: 'all', label: 'Todos' },
                  { id: 'session', label: 'Inicios de sesión' },
                  { id: 'sales', label: 'Facturación y Ventas' },
                  { id: 'users', label: 'Roles y Usuarios' },
                  { id: 'inventory', label: 'Inventario' },
                  { id: 'finance', label: 'Finanzas' },
                  { id: 'admin', label: 'Administración' },
                  { id: 'system', label: 'Sistema y Seguridad' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={auditFilter === tab.id}
                  className={`audit-filter-btn ${auditFilter === tab.id ? 'active' : ''}`}
                  onClick={() => setAuditFilter(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ops-panel-card">
            <div className="ops-panel-header" style={{ marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div className="panel-kicker">BITÁCORA CRONOLÓGICA</div>
                <h3>
                  Mostrando {filteredAuditEvents.length} de {auditEvents.length} evento(s)
                </h3>
              </div>
              <div className="admin-audit-active-pills">
                {auditUserFilter !== 'all' && (
                  <button
                    type="button"
                    className="admin-audit-user-pill"
                    onClick={() => setAuditUserFilter('all')}
                    title="Quitar filtro de usuario"
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
                    className="admin-audit-user-pill"
                    onClick={() => {
                      setAuditDateFrom('')
                      setAuditDateTo('')
                    }}
                    title="Quitar rango de fechas"
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
              </div>
            </div>

            {filteredAuditEvents.length === 0 ? (
              <div className="clients-empty">
                <History size={20} />
                <strong>Sin registros para este filtro</strong>
                <span>
                  {auditUserFilter !== 'all' || auditDateFrom || auditDateTo
                    ? 'No hay eventos registrados con la combinación actual de usuario, fechas o categoría.'
                    : 'Prueba otra categoría o limpia el campo de búsqueda.'}
                </span>
                {(auditUserFilter !== 'all' ||
                  auditDateFrom ||
                  auditDateTo ||
                  auditFilter !== 'all' ||
                  auditSearch.trim()) && (
                  <button
                    type="button"
                    className="button button-secondary"
                    style={{ marginTop: '8px' }}
                    onClick={() => {
                      setAuditSearch('')
                      setAuditFilter('all')
                      setAuditUserFilter('all')
                      setAuditDateFrom('')
                      setAuditDateTo('')
                    }}
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            ) : (
              <div className="admin-audit-timeline">
                {filteredAuditEvents.map((ev) => {
                  const { actionText, detailText } = resolveEventText(ev)
                  const dt = new Date(ev.timestampIso)
                  const catMeta = AUDIT_CATEGORY_META[ev.category] || {
                    label: ev.category,
                    toneClass: 'cat-system',
                  }
                  const isUserFiltered =
                    auditUserFilter !== 'all' &&
                    auditUserFilter.trim().toLowerCase() === ev.user.trim().toLowerCase()
                  return (
                    <article key={ev.id} className="admin-audit-row">
                      <div className="admin-audit-dot-col">
                        <span className={`admin-audit-dot ${catMeta.toneClass}`} />
                      </div>
                      <div className="admin-audit-main">
                        <div className="admin-audit-top">
                          <div className="admin-audit-title-group">
                            <strong>{actionText}</strong>
                            <span className={`admin-audit-cat-badge ${catMeta.toneClass}`}>
                              {ev.category === 'session' && <LogIn size={10} style={{ marginRight: '4px' }} />}
                              {catMeta.label}
                            </span>
                          </div>
                          <time
                            className="admin-audit-time tabular-nums"
                            dateTime={ev.timestampIso}
                          >
                            <Clock3 size={11} /> {formatDate(dt)} · {formatTime(dt)}
                          </time>
                        </div>
                        <p className="admin-audit-detail">{detailText}</p>
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
                      </div>
                    </article>
                  )
                })}
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
