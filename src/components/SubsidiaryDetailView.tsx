import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Landmark,
  Layers,
  Link2,
  MapPin,
  Minus,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Unlink,
  Users,
  X,
} from 'lucide-react'
import { useToast } from './Toast'
import { parseErpDateToIso } from './ReportsSection'
import type { EmployeeRecord } from '../data/employees'
import type { PurchaseOrder, Warehouse } from '../data/operations'
import type { PurchaseRequisition } from '../data/purchases'
import type { BillPayable } from '../data/finance'
import type {
  DepartmentRecord,
  LocationType,
  PhysicalLocationRecord,
  SubsidiaryRecord,
} from './AdministrationSection'

const LOCATION_TYPES: LocationType[] = [
  'Oficina corporativa',
  'Sucursal',
  'Almacén / Bodega',
  'Taller / Operación',
  'Punto de venta',
]

const CURRENCY_OPTIONS = ['MXN', 'USD', 'EUR', 'COP', 'CLP', 'PEN'] as const

interface SubsidiaryDetailViewProps {
  subsidiaryId: string
  subsidiaries: SubsidiaryRecord[]
  departments: DepartmentRecord[]
  locations: PhysicalLocationRecord[]
  employees?: EmployeeRecord[]
  warehouses?: Warehouse[]
  purchaseOrders?: PurchaseOrder[]
  requisitions?: PurchaseRequisition[]
  payables?: BillPayable[]
  currentUserName?: string
  canCreateSub?: boolean
  canEditSub?: boolean
  canDeleteSub?: boolean
  canCreateDept?: boolean
  canCreateLoc?: boolean
  onBack: () => void
  onSelectSubsidiary: (id: string) => void
  onAddSubsidiary: (sub: SubsidiaryRecord) => void
  onUpdateSubsidiaries: (subs: SubsidiaryRecord[]) => void
  onDeleteSubsidiary?: (subsidiaryId: string) => void
  onAddDepartment: (dep: DepartmentRecord) => void
  onUpdateDepartments: (deps: DepartmentRecord[]) => void
  onAddLocation: (loc: PhysicalLocationRecord) => void
  onUpdateLocations: (locs: PhysicalLocationRecord[]) => void
}

function toggleId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id]
}

function formatKpiMoney(amount: number, currencyCode = 'MXN'): string {
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currencyCode || 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `$${amount.toLocaleString('es-MX')}`
  }
}

type MomPolarity = 'higherIsGood' | 'lowerIsGood'

interface MomTrend {
  direction: 'up' | 'down' | 'flat'
  percentLabel: string
  toneClass: 'is-positive' | 'is-negative' | 'is-neutral'
  previousValue: number
}

function computeMomTrend(
  currentValue: number,
  previousValue: number,
  polarity: MomPolarity = 'higherIsGood'
): MomTrend {
  if (currentValue === previousValue) {
    return {
      direction: 'flat',
      percentLabel: '0.0%',
      toneClass: 'is-neutral',
      previousValue,
    }
  }
  const direction: 'up' | 'down' = currentValue > previousValue ? 'up' : 'down'
  const pct =
    previousValue === 0
      ? 100
      : Math.round(((currentValue - previousValue) / previousValue) * 1000) / 10
  const percentLabel = `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`
  const isPositive =
    polarity === 'higherIsGood' ? direction === 'up' : direction === 'down'

  return {
    direction,
    percentLabel,
    toneClass: isPositive ? 'is-positive' : 'is-negative',
    previousValue,
  }
}

function renderMomTrendIcon(direction: MomTrend['direction']) {
  if (direction === 'up') return <ArrowUpRight size={13} aria-hidden="true" />
  if (direction === 'down') return <ArrowDownRight size={13} aria-hidden="true" />
  return <Minus size={13} aria-hidden="true" />
}

export function SubsidiaryDetailView({
  subsidiaryId,
  subsidiaries,
  departments,
  locations,
  employees = [],
  warehouses = [],
  purchaseOrders = [],
  requisitions = [],
  payables = [],
  canCreateSub = true,
  canEditSub = true,
  canDeleteSub = true,
  canCreateDept = true,
  canCreateLoc = true,
  onBack,
  onSelectSubsidiary,
  onAddSubsidiary,
  onUpdateSubsidiaries,
  onDeleteSubsidiary,
  onAddDepartment,
  onUpdateDepartments,
  onAddLocation,
  onUpdateLocations,
}: SubsidiaryDetailViewProps) {
  const toast = useToast()
  const isNewMode = subsidiaryId === '__new__'

  const subsidiary = useMemo(
    () => (isNewMode ? null : subsidiaries.find((s) => s.id === subsidiaryId) || null),
    [isNewMode, subsidiaries, subsidiaryId]
  )

  // Fiscal / Corporate form state
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [legalName, setLegalName] = useState('')
  const [taxId, setTaxId] = useState('')
  const [country, setCountry] = useState('México')
  const [currency, setCurrency] = useState('MXN')
  const [legalRep, setLegalRep] = useState('')
  const [fiscalAddress, setFiscalAddress] = useState('')
  const [isHolding, setIsHolding] = useState(false)
  const [active, setActive] = useState(true)

  // Draft links used ONLY during '__new__' creation before saving
  const [draftDeptIds, setDraftDeptIds] = useState<string[]>([])
  const [draftLocIds, setDraftLocIds] = useState<string[]>([])

  // Delete 2-step confirmation
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // KPI operational breakdown drawer state
  const [showKpiBreakdown, setShowKpiBreakdown] = useState(false)
  const [kpiBreakdownTab, setKpiBreakdownTab] = useState<'employees' | 'purchaseOrders' | 'invoices'>(
    'employees'
  )

  // Structure workspace mode: consolidated overview vs interactive N:M manager
  const [structureViewMode, setStructureViewMode] = useState<'consolidated' | 'manage'>(
    isNewMode ? 'manage' : 'consolidated'
  )
  const [consolidatedSearch, setConsolidatedSearch] = useState('')
  const [consolidatedScope, setConsolidatedScope] = useState<'all' | 'departments' | 'locations'>('all')

  // Department relationship filters + quick create
  const [deptSearch, setDeptSearch] = useState('')
  const [deptRelationFilter, setDeptRelationFilter] = useState<'all' | 'linked' | 'unlinked'>('all')
  const [showNewDeptForm, setShowNewDeptForm] = useState(false)
  const [newDeptCode, setNewDeptCode] = useState('')
  const [newDeptName, setNewDeptName] = useState('')
  const [newDeptLeader, setNewDeptLeader] = useState('')
  const [newDeptCostCenter, setNewDeptCostCenter] = useState('')

  // Location relationship filters + quick create
  const [locSearch, setLocSearch] = useState('')
  const [locTypeFilter, setLocTypeFilter] = useState<string>('all')
  const [locRelationFilter, setLocRelationFilter] = useState<'all' | 'linked' | 'unlinked'>('all')
  const [showNewLocForm, setShowNewLocForm] = useState(false)
  const [newLocCode, setNewLocCode] = useState('')
  const [newLocName, setNewLocName] = useState('')
  const [newLocType, setNewLocType] = useState<LocationType>('Sucursal')
  const [newLocCity, setNewLocCity] = useState('')
  const [newLocState, setNewLocState] = useState('')
  const [newLocAddress, setNewLocAddress] = useState('')
  const [newLocManager, setNewLocManager] = useState('')

  useEffect(() => {
    setConfirmingDelete(false)
    setShowNewDeptForm(false)
    setShowNewLocForm(false)
    setConsolidatedSearch('')
    if (isNewMode) {
      setStructureViewMode('manage')
      setCode('')
      setName('')
      setLegalName('')
      setTaxId('')
      setCountry('México')
      setCurrency('MXN')
      setLegalRep('')
      setFiscalAddress('')
      setIsHolding(subsidiaries.length === 0)
      setActive(true)
      setDraftDeptIds([])
      setDraftLocIds([])
      return
    }
    if (subsidiary) {
      setCode(subsidiary.code)
      setName(subsidiary.name)
      setLegalName(subsidiary.legalName)
      setTaxId(subsidiary.taxId)
      setCountry(subsidiary.country)
      setCurrency(subsidiary.currency)
      setLegalRep(subsidiary.legalRep || '')
      setFiscalAddress(subsidiary.fiscalAddress || '')
      setIsHolding(Boolean(subsidiary.isHolding))
      setActive(subsidiary.active)
      setStructureViewMode((prev) => (prev === 'manage' || prev === 'consolidated' ? prev : 'consolidated'))
    }
  }, [isNewMode, subsidiary, subsidiaries.length])

  const currentSubIndex = useMemo(
    () => (isNewMode ? -1 : subsidiaries.findIndex((s) => s.id === subsidiaryId)),
    [isNewMode, subsidiaries, subsidiaryId]
  )

  const prevSubsidiary =
    subsidiaries.length > 1 && currentSubIndex >= 0
      ? subsidiaries[(currentSubIndex - 1 + subsidiaries.length) % subsidiaries.length]
      : null

  const nextSubsidiary =
    subsidiaries.length > 1 && currentSubIndex >= 0
      ? subsidiaries[(currentSubIndex + 1) % subsidiaries.length]
      : null

  const isFormDirty = useMemo(() => {
    if (isNewMode) {
      return Boolean(
        code.trim() ||
          name.trim() ||
          legalName.trim() ||
          taxId.trim() ||
          legalRep.trim() ||
          fiscalAddress.trim() ||
          draftDeptIds.length > 0 ||
          draftLocIds.length > 0
      )
    }
    if (!subsidiary) return false
    return (
      code.trim().toUpperCase() !== subsidiary.code ||
      name.trim() !== subsidiary.name ||
      legalName.trim() !== subsidiary.legalName ||
      taxId.trim().toUpperCase() !== subsidiary.taxId ||
      (country.trim() || 'México') !== subsidiary.country ||
      (currency.trim().toUpperCase() || 'MXN') !== subsidiary.currency ||
      legalRep.trim() !== (subsidiary.legalRep || '') ||
      fiscalAddress.trim() !== (subsidiary.fiscalAddress || '') ||
      isHolding !== Boolean(subsidiary.isHolding) ||
      active !== subsidiary.active
    )
  }, [
    isNewMode,
    subsidiary,
    code,
    name,
    legalName,
    taxId,
    country,
    currency,
    legalRep,
    fiscalAddress,
    isHolding,
    active,
    draftDeptIds.length,
    draftLocIds.length,
  ])

  const subsidiaryById = useMemo(() => {
    const map = new Map<string, SubsidiaryRecord>()
    subsidiaries.forEach((s) => map.set(s.id, s))
    return map
  }, [subsidiaries])

  const linkedDeptIdSet = useMemo(() => {
    if (isNewMode) return new Set(draftDeptIds)
    return new Set(
      departments
        .filter((d) => (d.subsidiaryIds || []).includes(subsidiaryId))
        .map((d) => d.id)
    )
  }, [isNewMode, draftDeptIds, departments, subsidiaryId])

  const linkedLocIdSet = useMemo(() => {
    if (isNewMode) return new Set(draftLocIds)
    return new Set(
      locations
        .filter((l) => (l.subsidiaryIds || []).includes(subsidiaryId))
        .map((l) => l.id)
    )
  }, [isNewMode, draftLocIds, locations, subsidiaryId])

  // Employee headcount mappings
  const employeeCountByDept = useMemo(() => {
    const counts = new Map<string, number>()
    employees.forEach((emp) => {
      counts.set(emp.departmentId, (counts.get(emp.departmentId) || 0) + 1)
    })
    return counts
  }, [employees])

  const employeeCountByLoc = useMemo(() => {
    const counts = new Map<string, number>()
    employees.forEach((emp) => {
      counts.set(emp.locationId, (counts.get(emp.locationId) || 0) + 1)
    })
    return counts
  }, [employees])

  const coveredEmployees = useMemo(() => {
    return employees.filter(
      (emp) => linkedDeptIdSet.has(emp.departmentId) || linkedLocIdSet.has(emp.locationId)
    )
  }, [employees, linkedDeptIdSet, linkedLocIdSet])

  const sharedDeptCount = useMemo(
    () =>
      departments.filter(
        (d) => linkedDeptIdSet.has(d.id) && (d.subsidiaryIds || []).filter((id) => id !== subsidiaryId).length > 0
      ).length,
    [departments, linkedDeptIdSet, subsidiaryId]
  )

  const sharedLocCount = useMemo(
    () =>
      locations.filter(
        (l) => linkedLocIdSet.has(l.id) && (l.subsidiaryIds || []).filter((id) => id !== subsidiaryId).length > 0
      ).length,
    [locations, linkedLocIdSet, subsidiaryId]
  )

  const filteredDepartments = useMemo(() => {
    const q = deptSearch.trim().toLowerCase()
    return departments.filter((d) => {
      const isLinked = linkedDeptIdSet.has(d.id)
      if (deptRelationFilter === 'linked' && !isLinked) return false
      if (deptRelationFilter === 'unlinked' && isLinked) return false
      if (!q) return true
      return (
        d.code.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        d.leader.toLowerCase().includes(q) ||
        (d.costCenter && d.costCenter.toLowerCase().includes(q))
      )
    })
  }, [departments, deptSearch, deptRelationFilter, linkedDeptIdSet])

  const filteredLocations = useMemo(() => {
    const q = locSearch.trim().toLowerCase()
    return locations.filter((l) => {
      const isLinked = linkedLocIdSet.has(l.id)
      if (locRelationFilter === 'linked' && !isLinked) return false
      if (locRelationFilter === 'unlinked' && isLinked) return false
      if (locTypeFilter !== 'all' && l.type !== locTypeFilter) return false
      if (!q) return true
      return (
        l.code.toLowerCase().includes(q) ||
        l.name.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q) ||
        l.state.toLowerCase().includes(q) ||
        (l.manager && l.manager.toLowerCase().includes(q))
      )
    })
  }, [locations, locSearch, locTypeFilter, locRelationFilter, linkedLocIdSet])

  const linkedDepartmentsList = useMemo(
    () => departments.filter((d) => linkedDeptIdSet.has(d.id)),
    [departments, linkedDeptIdSet]
  )

  const linkedLocationsList = useMemo(
    () => locations.filter((l) => linkedLocIdSet.has(l.id)),
    [locations, linkedLocIdSet]
  )

  const linkedDeptNameSet = useMemo(
    () => new Set(linkedDepartmentsList.map((d) => d.name.trim().toLowerCase())),
    [linkedDepartmentsList]
  )

  const linkedWarehouseMatch = useMemo(() => {
    const warehouseIds = new Set<string>()
    const warehouseNames = new Set<string>()
    const matchedWarehouses: Warehouse[] = []

    linkedLocationsList.forEach((loc) => {
      warehouseNames.add(loc.name.trim().toLowerCase())
    })

    warehouses.forEach((wh) => {
      const matchedLoc = linkedLocationsList.find(
        (loc) =>
          (wh.locationId && loc.id === wh.locationId) ||
          loc.code.trim().toLowerCase() === wh.code.trim().toLowerCase() ||
          loc.name.trim().toLowerCase() === wh.name.trim().toLowerCase()
      )
      if (matchedLoc) {
        warehouseIds.add(wh.id)
        warehouseNames.add(wh.name.trim().toLowerCase())
        matchedWarehouses.push(wh)
      }
    })

    return { warehouseIds, warehouseNames, matchedWarehouses }
  }, [linkedLocationsList, warehouses])

  const monthBounds = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    const prev = new Date(y, m - 1, 1)
    const currYm = `${y}-${String(m + 1).padStart(2, '0')}`
    const prevYm = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
    const prevLabel = new Intl.DateTimeFormat('es-MX', {
      month: 'short',
      year: 'numeric',
    })
      .format(prev)
      .replace('.', '')
    return { currYm, prevYm, prevLabel }
  }, [])

  const employeeKpi = useMemo(() => {
    const entries = coveredEmployees.map((emp) => {
      const viaDept = linkedDeptIdSet.has(emp.departmentId)
      const viaLoc = linkedLocIdSet.has(emp.locationId)
      const matchOrigin =
        viaDept && viaLoc
          ? `${emp.departmentName} · ${emp.locationName}`
          : viaDept
          ? `Depto: ${emp.departmentName}`
          : `Ubicación: ${emp.locationName}`
      return {
        employee: emp,
        viaDept,
        viaLoc,
        matchOrigin,
      }
    })

    const activeCount = entries.filter((e) => e.employee.status === 'Activo').length
    const onLeaveOrInactive = entries.length - activeCount
    const byDeptCount = entries.filter((e) => e.viaDept).length
    const byLocCount = entries.filter((e) => e.viaLoc).length

    const prevMonthTotal = entries.filter(({ employee }) => {
      const hireIso = parseErpDateToIso(employee.hireDate)
      if (!hireIso) return true
      return hireIso.slice(0, 7) <= monthBounds.prevYm
    }).length

    const momTrend = computeMomTrend(entries.length, prevMonthTotal, 'higherIsGood')

    return {
      entries,
      total: entries.length,
      activeCount,
      onLeaveOrInactive,
      byDeptCount,
      byLocCount,
      momTrend,
    }
  }, [coveredEmployees, linkedDeptIdSet, linkedLocIdSet, monthBounds.prevYm])

  const linkedRequisitionByPoFolio = useMemo(() => {
    const map = new Map<
      string,
      { req: PurchaseRequisition; viaDept: boolean; viaLoc: boolean }
    >()
    requisitions.forEach((req) => {
      if (!req.linkedPoFolio) return
      const viaDept = linkedDeptNameSet.has(req.department.trim().toLowerCase())
      const viaLoc =
        linkedWarehouseMatch.warehouseIds.has(req.warehouseId) ||
        linkedWarehouseMatch.warehouseNames.has(req.warehouseName.trim().toLowerCase())
      if (viaDept || viaLoc) {
        map.set(req.linkedPoFolio, { req, viaDept, viaLoc })
      }
    })
    return map
  }, [requisitions, linkedDeptNameSet, linkedWarehouseMatch])

  const purchaseOrderKpi = useMemo(() => {
    type LinkedPoEntry = {
      po: PurchaseOrder
      viaLoc: boolean
      viaDept: boolean
      originLabel: string
    }

    const allLinkedEntries: LinkedPoEntry[] = []
    purchaseOrders.forEach((po) => {
      const viaWarehouse =
        linkedWarehouseMatch.warehouseIds.has(po.warehouseId) ||
        linkedWarehouseMatch.warehouseNames.has(po.warehouseName.trim().toLowerCase())
      const reqMatch = linkedRequisitionByPoFolio.get(po.folio)
      const viaLoc = viaWarehouse || Boolean(reqMatch?.viaLoc)
      const viaDept = Boolean(reqMatch?.viaDept)
      if (!viaLoc && !viaDept) return

      const originParts: string[] = []
      if (viaLoc) originParts.push(po.warehouseName)
      if (viaDept && reqMatch?.req.department) originParts.push(reqMatch.req.department)

      allLinkedEntries.push({
        po,
        viaLoc,
        viaDept,
        originLabel: originParts.join(' · ') || po.warehouseName,
      })
    })

    const activeEntries = allLinkedEntries.filter(
      ({ po }) => po.status !== 'Recibida' && po.status !== 'Cancelada'
    )
    const activeAmount = activeEntries.reduce((sum, { po }) => sum + po.total, 0)
    const issuedCount = activeEntries.filter(({ po }) => po.status === 'Emitida').length
    const partialCount = activeEntries.filter(({ po }) => po.status === 'Recepción parcial').length
    const draftCount = activeEntries.filter(({ po }) => po.status === 'Borrador').length
    const viaLocCount = activeEntries.filter((e) => e.viaLoc).length
    const viaDeptCount = activeEntries.filter((e) => e.viaDept).length

    const prevMonthActiveCount = allLinkedEntries.filter(({ po }) => {
      const poIso = parseErpDateToIso(po.date)
      if (!poIso) return false
      const poYm = poIso.slice(0, 7)
      return (
        (poYm === monthBounds.prevYm && po.status !== 'Cancelada') ||
        (poYm < monthBounds.prevYm && po.status !== 'Recibida' && po.status !== 'Cancelada')
      )
    }).length

    const momTrend = computeMomTrend(activeEntries.length, prevMonthActiveCount, 'higherIsGood')

    return {
      allLinkedEntries,
      activeEntries,
      activeCount: activeEntries.length,
      activeAmount,
      issuedCount,
      partialCount,
      draftCount,
      viaLocCount,
      viaDeptCount,
      momTrend,
    }
  }, [purchaseOrders, linkedWarehouseMatch, linkedRequisitionByPoFolio, monthBounds.prevYm])

  const pendingInvoiceKpi = useMemo(() => {
    const linkedPoByFolio = new Map(
      purchaseOrderKpi.allLinkedEntries.map((entry) => [entry.po.folio, entry])
    )

    const entries: Array<{
      bill: BillPayable
      originLabel: string
      poStatus?: string
    }> = []

    let prevMonthPendingCount = 0

    payables.forEach((bill) => {
      const folioRef = bill.purchaseOrderFolio?.trim()
      if (!folioRef) return

      const poMatch = linkedPoByFolio.get(folioRef)
      const reqMatch = !poMatch ? linkedRequisitionByPoFolio.get(folioRef) : undefined
      if (!poMatch && !reqMatch) return

      const isPendingNow = bill.status !== 'Pagada' && bill.balance > 0
      const issueIso = parseErpDateToIso(bill.issueDate)
      const dueIso = parseErpDateToIso(bill.dueDate)
      const issueYm = issueIso ? issueIso.slice(0, 7) : null
      const dueYm = dueIso ? dueIso.slice(0, 7) : null

      if (
        issueYm &&
        issueYm <= monthBounds.prevYm &&
        ((dueYm && dueYm > monthBounds.prevYm) || isPendingNow)
      ) {
        prevMonthPendingCount += 1
      }

      if (!isPendingNow) return

      const originLabel = poMatch
        ? `${folioRef} (${poMatch.originLabel})`
        : `${folioRef} (${reqMatch!.viaDept ? reqMatch!.req.department : reqMatch!.req.warehouseName})`

      entries.push({
        bill,
        originLabel,
        poStatus: poMatch?.po.status,
      })
    })

    const pendingBalance = entries.reduce((sum, { bill }) => sum + bill.balance, 0)
    const overdueCount = entries.filter(({ bill }) => bill.status === 'Vencida').length
    const partialCount = entries.filter(({ bill }) => bill.status === 'Parcial').length
    const openCount = entries.filter(({ bill }) => bill.status === 'Pendiente').length
    const momTrend = computeMomTrend(entries.length, prevMonthPendingCount, 'lowerIsGood')

    return {
      entries,
      pendingCount: entries.length,
      pendingBalance,
      overdueCount,
      partialCount,
      openCount,
      momTrend,
    }
  }, [payables, purchaseOrderKpi.allLinkedEntries, linkedRequisitionByPoFolio, monthBounds.prevYm])

  type ConsolidatedRelationRow = {
    kind: 'department' | 'location'
    id: string
    code: string
    name: string
    categoryLabel: string
    detailLine: string
    responsibleLabel: string
    placeOrCostCenter: string
    employeeCount: number
    otherSubCodes: string[]
    active: boolean
  }

  const consolidatedRows = useMemo<ConsolidatedRelationRow[]>(() => {
    const deptRows: ConsolidatedRelationRow[] = linkedDepartmentsList.map((d) => ({
      kind: 'department',
      id: d.id,
      code: d.code,
      name: d.name,
      categoryLabel: 'Departamento',
      detailLine: d.description || 'Unidad funcional operativa',
      responsibleLabel: `Líder: ${d.leader}`,
      placeOrCostCenter: d.costCenter ? `CC: ${d.costCenter}` : 'Sin centro de costos',
      employeeCount: employeeCountByDept.get(d.id) || 0,
      otherSubCodes: (d.subsidiaryIds || [])
        .filter((id) => id !== subsidiaryId)
        .map((id) => subsidiaryById.get(id)?.code)
        .filter((c): c is string => Boolean(c)),
      active: d.active,
    }))

    const locRows: ConsolidatedRelationRow[] = linkedLocationsList.map((l) => ({
      kind: 'location',
      id: l.id,
      code: l.code,
      name: l.name,
      categoryLabel: l.type,
      detailLine: l.address,
      responsibleLabel: l.manager ? `Encargado: ${l.manager}` : 'Sin encargado asignado',
      placeOrCostCenter: `${l.city}, ${l.state}`,
      employeeCount: employeeCountByLoc.get(l.id) || 0,
      otherSubCodes: (l.subsidiaryIds || [])
        .filter((id) => id !== subsidiaryId)
        .map((id) => subsidiaryById.get(id)?.code)
        .filter((c): c is string => Boolean(c)),
      active: l.active,
    }))

    const merged =
      consolidatedScope === 'departments'
        ? deptRows
        : consolidatedScope === 'locations'
        ? locRows
        : [...deptRows, ...locRows]

    const q = consolidatedSearch.trim().toLowerCase()
    if (!q) return merged
    return merged.filter(
      (row) =>
        row.code.toLowerCase().includes(q) ||
        row.name.toLowerCase().includes(q) ||
        row.categoryLabel.toLowerCase().includes(q) ||
        row.responsibleLabel.toLowerCase().includes(q) ||
        row.placeOrCostCenter.toLowerCase().includes(q) ||
        row.detailLine.toLowerCase().includes(q)
    )
  }, [
    linkedDepartmentsList,
    linkedLocationsList,
    consolidatedScope,
    consolidatedSearch,
    employeeCountByDept,
    employeeCountByLoc,
    subsidiaryId,
    subsidiaryById,
  ])

  const locationTypeBreakdown = useMemo(() => {
    const counts = new Map<LocationType, number>()
    linkedLocationsList.forEach((l) => {
      counts.set(l.type, (counts.get(l.type) || 0) + 1)
    })
    return Array.from(counts.entries())
  }, [linkedLocationsList])

  if (!isNewMode && !subsidiary) {
    return (
      <div className="sub-detail-empty-shell">
        <button type="button" className="button button-secondary" onClick={onBack}>
          <ArrowLeft size={14} /> Volver a subsidiarias
        </button>
        <div className="ops-panel-card" style={{ marginTop: '14px', textAlign: 'center', padding: '28px' }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            No se encontró la subsidiaria seleccionada. Puede haber sido eliminada.
          </p>
        </div>
      </div>
    )
  }

  const handleToggleDepartmentLink = (deptId: string) => {
    if (!canEditSub) return
    if (isNewMode) {
      setDraftDeptIds((prev) => toggleId(prev, deptId))
      return
    }
    const target = departments.find((d) => d.id === deptId)
    if (!target) return
    const currentIds = target.subsidiaryIds || []
    const isLinked = currentIds.includes(subsidiaryId)
    const nextIds = isLinked
      ? currentIds.filter((id) => id !== subsidiaryId)
      : [...currentIds, subsidiaryId]
    onUpdateDepartments(
      departments.map((d) => (d.id === deptId ? { ...d, subsidiaryIds: nextIds } : d))
    )
  }

  const handleBulkDepartments = (link: boolean) => {
    if (!canEditSub || filteredDepartments.length === 0) return
    const visibleIds = new Set(filteredDepartments.map((d) => d.id))
    if (isNewMode) {
      setDraftDeptIds((prev) => {
        if (link) {
          return Array.from(new Set([...prev, ...visibleIds]))
        }
        return prev.filter((id) => !visibleIds.has(id))
      })
      return
    }
    onUpdateDepartments(
      departments.map((d) => {
        if (!visibleIds.has(d.id)) return d
        const current = d.subsidiaryIds || []
        const has = current.includes(subsidiaryId)
        if (link && !has) return { ...d, subsidiaryIds: [...current, subsidiaryId] }
        if (!link && has) return { ...d, subsidiaryIds: current.filter((id) => id !== subsidiaryId) }
        return d
      })
    )
    toast.info(
      `${filteredDepartments.length} departamento(s) ${link ? 'vinculados' : 'desvinculados'}.`,
      'Relaciones actualizadas'
    )
  }

  const handleToggleLocationLink = (locId: string) => {
    if (!canEditSub) return
    if (isNewMode) {
      setDraftLocIds((prev) => toggleId(prev, locId))
      return
    }
    const target = locations.find((l) => l.id === locId)
    if (!target) return
    const currentIds = target.subsidiaryIds || []
    const isLinked = currentIds.includes(subsidiaryId)
    const nextIds = isLinked
      ? currentIds.filter((id) => id !== subsidiaryId)
      : [...currentIds, subsidiaryId]
    onUpdateLocations(
      locations.map((l) => (l.id === locId ? { ...l, subsidiaryIds: nextIds } : l))
    )
  }

  const handleBulkLocations = (link: boolean) => {
    if (!canEditSub || filteredLocations.length === 0) return
    const visibleIds = new Set(filteredLocations.map((l) => l.id))
    if (isNewMode) {
      setDraftLocIds((prev) => {
        if (link) {
          return Array.from(new Set([...prev, ...visibleIds]))
        }
        return prev.filter((id) => !visibleIds.has(id))
      })
      return
    }
    onUpdateLocations(
      locations.map((l) => {
        if (!visibleIds.has(l.id)) return l
        const current = l.subsidiaryIds || []
        const has = current.includes(subsidiaryId)
        if (link && !has) return { ...l, subsidiaryIds: [...current, subsidiaryId] }
        if (!link && has) return { ...l, subsidiaryIds: current.filter((id) => id !== subsidiaryId) }
        return l
      })
    )
    toast.info(
      `${filteredLocations.length} ubicación(es) ${link ? 'vinculadas' : 'desvinculadas'}.`,
      'Relaciones actualizadas'
    )
  }

  const handleSaveLegalProfile = (e: FormEvent) => {
    e.preventDefault()
    if (!code.trim() || !name.trim() || !legalName.trim() || !taxId.trim()) {
      toast.error(
        'Completa el código, nombre comercial, razón social y RFC / Tax ID de la subsidiaria.',
        'Campos requeridos'
      )
      return
    }
    const cleanCode = code.trim().toUpperCase()
    const duplicateCode = subsidiaries.some(
      (s) => s.id !== (subsidiary?.id || '') && s.code.trim().toLowerCase() === cleanCode.toLowerCase()
    )
    if (duplicateCode) {
      toast.warning(`Ya existe una subsidiaria con el código ${cleanCode}.`, 'Código duplicado')
      return
    }

    if (isNewMode) {
      const newSubId = `sub_${Date.now()}`
      const payload: SubsidiaryRecord = {
        id: newSubId,
        code: cleanCode,
        name: name.trim(),
        legalName: legalName.trim(),
        taxId: taxId.trim().toUpperCase(),
        country: country.trim() || 'México',
        currency: currency.trim().toUpperCase() || 'MXN',
        legalRep: legalRep.trim() || undefined,
        fiscalAddress: fiscalAddress.trim() || undefined,
        isHolding,
        active,
      }
      if (isHolding) {
        onUpdateSubsidiaries(
          subsidiaries.map((s) => (s.isHolding ? { ...s, isHolding: false } : s))
        )
      }
      onAddSubsidiary(payload)

      if (draftDeptIds.length > 0) {
        const linkedSet = new Set(draftDeptIds)
        onUpdateDepartments(
          departments.map((d) =>
            linkedSet.has(d.id)
              ? { ...d, subsidiaryIds: Array.from(new Set([...(d.subsidiaryIds || []), newSubId])) }
              : d
          )
        )
      }
      if (draftLocIds.length > 0) {
        const linkedSet = new Set(draftLocIds)
        onUpdateLocations(
          locations.map((l) =>
            linkedSet.has(l.id)
              ? { ...l, subsidiaryIds: Array.from(new Set([...(l.subsidiaryIds || []), newSubId])) }
              : l
          )
        )
      }
      toast.success(
        `Subsidiaria “${payload.name}” creada con ${draftDeptIds.length} departamento(s) y ${draftLocIds.length} ubicación(es).`,
        'Subsidiaria registrada'
      )
      onSelectSubsidiary(newSubId)
      return
    }

    if (!subsidiary) return
    const updatedSub: SubsidiaryRecord = {
      ...subsidiary,
      code: cleanCode,
      name: name.trim(),
      legalName: legalName.trim(),
      taxId: taxId.trim().toUpperCase(),
      country: country.trim() || 'México',
      currency: currency.trim().toUpperCase() || 'MXN',
      legalRep: legalRep.trim() || undefined,
      fiscalAddress: fiscalAddress.trim() || undefined,
      isHolding,
      active,
    }
    onUpdateSubsidiaries(
      subsidiaries.map((s) => {
        if (s.id === updatedSub.id) return updatedSub
        if (isHolding && s.isHolding) return { ...s, isHolding: false }
        return s
      })
    )
    toast.success(`Datos legales de “${updatedSub.name}” guardados.`, 'Subsidiaria actualizada')
  }

  const handleResetLegalForm = () => {
    if (!subsidiary) return
    setCode(subsidiary.code)
    setName(subsidiary.name)
    setLegalName(subsidiary.legalName)
    setTaxId(subsidiary.taxId)
    setCountry(subsidiary.country)
    setCurrency(subsidiary.currency)
    setLegalRep(subsidiary.legalRep || '')
    setFiscalAddress(subsidiary.fiscalAddress || '')
    setIsHolding(Boolean(subsidiary.isHolding))
    setActive(subsidiary.active)
  }

  const handleToggleQuickStatus = () => {
    if (!subsidiary || !canEditSub) return
    const nextActive = !subsidiary.active
    setActive(nextActive)
    onUpdateSubsidiaries(
      subsidiaries.map((s) => (s.id === subsidiary.id ? { ...s, active: nextActive } : s))
    )
    toast.info(
      `Subsidiaria ${subsidiary.name} marcada como ${nextActive ? 'Activa' : 'Inactiva'}.`,
      'Estado actualizado'
    )
  }

  const handleQuickCreateDepartment = (e: FormEvent) => {
    e.preventDefault()
    if (!newDeptCode.trim() || !newDeptName.trim() || !newDeptLeader.trim()) {
      toast.error('Indica código, nombre y líder del departamento.', 'Campos requeridos')
      return
    }
    const cleanCode = newDeptCode.trim().toUpperCase()
    if (departments.some((d) => d.code.toLowerCase() === cleanCode.toLowerCase())) {
      toast.warning(`Ya existe un departamento con el código ${cleanCode}.`, 'Código duplicado')
      return
    }
    const newId = `dep_${Date.now()}`
    const created: DepartmentRecord = {
      id: newId,
      code: cleanCode,
      name: newDeptName.trim(),
      leader: newDeptLeader.trim(),
      costCenter: newDeptCostCenter.trim() || undefined,
      subsidiaryIds: isNewMode ? [] : [subsidiaryId],
      active: true,
    }
    onAddDepartment(created)
    if (isNewMode) {
      setDraftDeptIds((prev) => [...prev, newId])
    }
    setNewDeptCode('')
    setNewDeptName('')
    setNewDeptLeader('')
    setNewDeptCostCenter('')
    setShowNewDeptForm(false)
    toast.success(`Departamento “${created.name}” creado y vinculado.`, 'Departamento registrado')
  }

  const handleQuickCreateLocation = (e: FormEvent) => {
    e.preventDefault()
    if (!newLocCode.trim() || !newLocName.trim() || !newLocCity.trim() || !newLocAddress.trim()) {
      toast.error('Completa código, nombre, dirección y ciudad de la sede.', 'Campos requeridos')
      return
    }
    const cleanCode = newLocCode.trim().toUpperCase()
    if (locations.some((l) => l.code.toLowerCase() === cleanCode.toLowerCase())) {
      toast.warning(`Ya existe una ubicación con el código ${cleanCode}.`, 'Código duplicado')
      return
    }
    const newId = `loc_${Date.now()}`
    const created: PhysicalLocationRecord = {
      id: newId,
      code: cleanCode,
      name: newLocName.trim(),
      type: newLocType,
      address: newLocAddress.trim(),
      city: newLocCity.trim(),
      state: newLocState.trim() || newLocCity.trim(),
      country: country.trim() || 'México',
      manager: newLocManager.trim() || undefined,
      subsidiaryIds: isNewMode ? [] : [subsidiaryId],
      active: true,
    }
    onAddLocation(created)
    if (isNewMode) {
      setDraftLocIds((prev) => [...prev, newId])
    }
    setNewLocCode('')
    setNewLocName('')
    setNewLocType('Sucursal')
    setNewLocCity('')
    setNewLocState('')
    setNewLocAddress('')
    setNewLocManager('')
    setShowNewLocForm(false)
    toast.success(`Ubicación “${created.name}” creada y vinculada.`, 'Ubicación registrada')
  }

  return (
    <div className="sub-detail-workspace">
      {/* Top Bar: Back + Route Switcher & Stepper + Actions */}
      <div className="sub-detail-topbar">
        <div className="sub-detail-topbar-left">
          <button type="button" className="button button-secondary" onClick={onBack}>
            <ArrowLeft size={14} /> Volver a subsidiarias
          </button>

          {subsidiaries.length > 0 && (
            <div className="sub-detail-step-nav" role="navigation" aria-label="Selector rápido de subsidiarias">
              {!isNewMode && prevSubsidiary && nextSubsidiary && (
                <div className="sub-step-arrows">
                  <button
                    type="button"
                    className="sub-step-btn"
                    onClick={() => onSelectSubsidiary(prevSubsidiary.id)}
                    title={`Anterior: ${prevSubsidiary.code} · ${prevSubsidiary.name}`}
                    aria-label={`Subsidiaria anterior: ${prevSubsidiary.name}`}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="sub-step-counter">
                    {currentSubIndex + 1} / {subsidiaries.length}
                  </span>
                  <button
                    type="button"
                    className="sub-step-btn"
                    onClick={() => onSelectSubsidiary(nextSubsidiary.id)}
                    title={`Siguiente: ${nextSubsidiary.code} · ${nextSubsidiary.name}`}
                    aria-label={`Siguiente subsidiaria: ${nextSubsidiary.name}`}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}

              <div className="sub-detail-switcher">
                <label htmlFor="sub-detail-switch-select">Ir a:</label>
                <select
                  id="sub-detail-switch-select"
                  value={subsidiaryId}
                  onChange={(e) => onSelectSubsidiary(e.target.value)}
                >
                  {isNewMode && <option value="__new__">+ Nueva subsidiaria (en creación)</option>}
                  {subsidiaries.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} · {s.name} ({s.active ? s.currency : 'Inactiva'})
                    </option>
                  ))}
                  {!isNewMode && canCreateSub && (
                    <option value="__new__">+ Crear nueva subsidiaria...</option>
                  )}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="sub-detail-topbar-actions">
          {!isNewMode && canCreateSub && (
            <button
              type="button"
              className="button button-secondary"
              onClick={() => onSelectSubsidiary('__new__')}
            >
              <Plus size={14} /> Nueva subsidiaria
            </button>
          )}
          {!isNewMode && subsidiary && canEditSub && (
            <button
              type="button"
              className="button button-secondary"
              onClick={handleToggleQuickStatus}
            >
              {subsidiary.active ? 'Inhabilitar entidad' : 'Reactivar entidad'}
            </button>
          )}
          {!isNewMode && subsidiary && canDeleteSub && onDeleteSubsidiary && (
            confirmingDelete ? (
              <div className="modal-delete-confirm">
                <span>¿Eliminar esta subsidiaria?</span>
                <button
                  type="button"
                  className="button button-secondary button-sm"
                  onClick={() => setConfirmingDelete(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="button button-danger-solid button-sm"
                  onClick={() => {
                    onDeleteSubsidiary(subsidiary.id)
                    onBack()
                  }}
                >
                  <Trash2 size={12} /> Confirmar
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="button button-danger-outline"
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2 size={13} /> Eliminar
              </button>
            )
          )}
        </div>
      </div>

      {/* Internal Quick-Jump Rail between existing subsidiaries */}
      {subsidiaries.length > 0 && (
        <nav className="sub-quick-jump-rail" aria-label="Navegación interna entre subsidiarias">
          <span className="sub-quick-jump-label">Cambiar subsidiaria:</span>
          <div className="sub-quick-jump-list">
            {subsidiaries.map((s) => {
              const isCurrent = s.id === subsidiaryId
              const deptTotal = departments.filter((d) => (d.subsidiaryIds || []).includes(s.id)).length
              const locTotal = locations.filter((l) => (l.subsidiaryIds || []).includes(s.id)).length
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-current={isCurrent ? 'page' : undefined}
                  className={`sub-jump-item ${isCurrent ? 'is-current' : ''} ${!s.active ? 'is-inactive' : ''}`}
                  onClick={() => onSelectSubsidiary(s.id)}
                  title={`${s.legalName} · ${deptTotal} deptos. / ${locTotal} ubicaciones`}
                >
                  <span className="sub-jump-code">{s.code}</span>
                  <span className="sub-jump-name">{s.name}</span>
                  {s.isHolding && <span className="sub-jump-holding">Matriz</span>}
                  <span className="sub-jump-counts">
                    {deptTotal}D · {locTotal}U
                  </span>
                </button>
              )
            })}
          </div>
        </nav>
      )}

      {/* Hero Title + Status Line */}
      <div className="sub-detail-hero">
        <div className="sub-detail-hero-identity">
          <div className="sub-detail-emblem">
            <Landmark size={20} />
          </div>
          <div>
            <div className="sub-detail-kicker-row">
              <span className="panel-kicker">GESTIÓN DETALLADA DE SUBSIDIARIA</span>
              {!isNewMode && subsidiary && (
                <>
                  <span className="sub-detail-dot">·</span>
                  <span className="sub-detail-code-mono">{subsidiary.code}</span>
                  {subsidiary.isHolding && <span className="admin-holding-pill">Matriz</span>}
                  <span className="sub-detail-dot">·</span>
                  <span className={`sub-detail-status-inline ${subsidiary.active ? 'is-active' : 'is-inactive'}`}>
                    {subsidiary.active ? (
                      <>
                        <CheckCircle2 size={12} /> Activa
                      </>
                    ) : (
                      <>
                        <AlertCircle size={12} /> Inactiva
                      </>
                    )}
                  </span>
                </>
              )}
            </div>
            <h2>
              {isNewMode
                ? 'Registrar nueva subsidiaria y relaciones'
                : subsidiary?.name || 'Subsidiaria'}
            </h2>
            <p>
              {isNewMode
                ? 'Define la razón social, datos fiscales y relaciona departamentos y ubicaciones físicas en un solo paso.'
                : `${subsidiary?.legalName} · Información corporativa y estructura de departamentos y sedes físicas vinculadas.`}
            </p>
          </div>
        </div>

        <div className="sub-detail-persistence-note">
          <span>
            {isNewMode
              ? 'Al guardar se registrará de forma persistente en el sistema.'
              : 'Relaciones guardadas automáticamente en almacenamiento local.'}
          </span>
        </div>
      </div>

      {/* Subsidiary Specific Operational & Financial KPI Panel */}
      <section className="sub-ops-kpi-panel" aria-labelledby="sub-ops-kpi-heading">
        <div className="sub-ops-kpi-header">
          <div>
            <div className="panel-kicker">DESEMPEÑO VINCULADO A DEPARTAMENTOS Y UBICACIONES</div>
            <div className="sub-ops-kpi-title-row">
              <h3 id="sub-ops-kpi-heading">Panel de KPIs de la Subsidiaria</h3>
              <span className="sub-ops-kpi-scope-text">
                {linkedDeptIdSet.size} departamento(s) · {linkedLocIdSet.size} ubicación(es) física(s)
                {linkedWarehouseMatch.matchedWarehouses.length > 0
                  ? ` · ${linkedWarehouseMatch.matchedWarehouses.length} almacén(es)`
                  : ''}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="button button-secondary button-sm"
            onClick={() => setShowKpiBreakdown((prev) => !prev)}
            aria-expanded={showKpiBreakdown}
          >
            {showKpiBreakdown ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {showKpiBreakdown ? 'Ocultar desglose' : 'Ver desglose vinculado'}
          </button>
        </div>

        <div className="sub-ops-kpi-grid">
          <button
            type="button"
            className={`sub-ops-kpi-cell ${showKpiBreakdown && kpiBreakdownTab === 'employees' ? 'is-selected' : ''}`}
            onClick={() => {
              if (showKpiBreakdown && kpiBreakdownTab === 'employees') {
                setShowKpiBreakdown(false)
              } else {
                setKpiBreakdownTab('employees')
                setShowKpiBreakdown(true)
              }
            }}
          >
            <div className="sub-ops-kpi-cell-top">
              <span className="sub-ops-kpi-label">Total de empleados</span>
              <span
                className={`sub-ops-mom-trend ${employeeKpi.momTrend.toneClass}`}
                title={`Comparativa mes contra mes vs. ${employeeKpi.momTrend.previousValue} en ${monthBounds.prevLabel}`}
              >
                {renderMomTrendIcon(employeeKpi.momTrend.direction)}
                <span>{employeeKpi.momTrend.percentLabel} MoM</span>
              </span>
            </div>
            <div className="sub-ops-kpi-primary-row">
              <strong className="sub-ops-kpi-number">{employeeKpi.total}</strong>
              <span className="sub-ops-kpi-subamount is-nominal">
                {employeeKpi.activeCount} activos
                {employeeKpi.onLeaveOrInactive > 0 ? ` · ${employeeKpi.onLeaveOrInactive} inactivos/lic.` : ''}
              </span>
            </div>
            <span className="sub-ops-kpi-meta">
              vs. {employeeKpi.momTrend.previousValue} en {monthBounds.prevLabel} ·{' '}
              {employeeKpi.total === 0
                ? 'Sin colaboradores vinculados'
                : `${employeeKpi.byDeptCount} por depto. · ${employeeKpi.byLocCount} por sede`}
            </span>
          </button>

          <button
            type="button"
            className={`sub-ops-kpi-cell ${showKpiBreakdown && kpiBreakdownTab === 'purchaseOrders' ? 'is-selected' : ''}`}
            onClick={() => {
              if (showKpiBreakdown && kpiBreakdownTab === 'purchaseOrders') {
                setShowKpiBreakdown(false)
              } else {
                setKpiBreakdownTab('purchaseOrders')
                setShowKpiBreakdown(true)
              }
            }}
          >
            <div className="sub-ops-kpi-cell-top">
              <span className="sub-ops-kpi-label">Órdenes de compra activas</span>
              <span
                className={`sub-ops-mom-trend ${purchaseOrderKpi.momTrend.toneClass}`}
                title={`Comparativa mes contra mes vs. ${purchaseOrderKpi.momTrend.previousValue} en ${monthBounds.prevLabel}`}
              >
                {renderMomTrendIcon(purchaseOrderKpi.momTrend.direction)}
                <span>{purchaseOrderKpi.momTrend.percentLabel} MoM</span>
              </span>
            </div>
            <div className="sub-ops-kpi-primary-row">
              <strong className="sub-ops-kpi-number">{purchaseOrderKpi.activeCount}</strong>
              <span className="sub-ops-kpi-subamount">
                {formatKpiMoney(purchaseOrderKpi.activeAmount, currency || 'MXN')}
              </span>
            </div>
            <span className="sub-ops-kpi-meta">
              vs. {purchaseOrderKpi.momTrend.previousValue} en {monthBounds.prevLabel} ·{' '}
              {purchaseOrderKpi.activeCount === 0
                ? 'Sin órdenes activas vinculadas'
                : [
                    purchaseOrderKpi.issuedCount > 0 ? `${purchaseOrderKpi.issuedCount} emitida(s)` : null,
                    purchaseOrderKpi.partialCount > 0 ? `${purchaseOrderKpi.partialCount} parcial(es)` : null,
                    purchaseOrderKpi.draftCount > 0 ? `${purchaseOrderKpi.draftCount} borrador(es)` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
            </span>
          </button>

          <button
            type="button"
            className={`sub-ops-kpi-cell ${showKpiBreakdown && kpiBreakdownTab === 'invoices' ? 'is-selected' : ''}`}
            onClick={() => {
              if (showKpiBreakdown && kpiBreakdownTab === 'invoices') {
                setShowKpiBreakdown(false)
              } else {
                setKpiBreakdownTab('invoices')
                setShowKpiBreakdown(true)
              }
            }}
          >
            <div className="sub-ops-kpi-cell-top">
              <span className="sub-ops-kpi-label">Facturas pendientes</span>
              <span
                className={`sub-ops-mom-trend ${pendingInvoiceKpi.momTrend.toneClass}`}
                title={`Comparativa mes contra mes vs. ${pendingInvoiceKpi.momTrend.previousValue} en ${monthBounds.prevLabel}`}
              >
                {renderMomTrendIcon(pendingInvoiceKpi.momTrend.direction)}
                <span>{pendingInvoiceKpi.momTrend.percentLabel} MoM</span>
              </span>
            </div>
            <div className="sub-ops-kpi-primary-row">
              <strong className="sub-ops-kpi-number">{pendingInvoiceKpi.pendingCount}</strong>
              <span
                className={`sub-ops-kpi-subamount ${
                  pendingInvoiceKpi.overdueCount > 0
                    ? 'is-critical'
                    : pendingInvoiceKpi.pendingCount > 0
                    ? 'is-warning'
                    : ''
                }`}
              >
                {formatKpiMoney(pendingInvoiceKpi.pendingBalance, currency || 'MXN')}
              </span>
            </div>
            <span className="sub-ops-kpi-meta">
              vs. {pendingInvoiceKpi.momTrend.previousValue} en {monthBounds.prevLabel} ·{' '}
              {pendingInvoiceKpi.pendingCount === 0
                ? 'Sin saldo CxP pendiente'
                : [
                    pendingInvoiceKpi.overdueCount > 0 ? `${pendingInvoiceKpi.overdueCount} vencida(s)` : null,
                    pendingInvoiceKpi.partialCount > 0 ? `${pendingInvoiceKpi.partialCount} parcial(es)` : null,
                    pendingInvoiceKpi.openCount > 0 ? `${pendingInvoiceKpi.openCount} por vencer` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
            </span>
          </button>
        </div>

        {showKpiBreakdown && (
          <div className="sub-ops-kpi-breakdown">
            <div className="sub-ops-kpi-breakdown-bar">
              <div className="sub-rel-segmented" role="tablist" aria-label="Desglose de KPIs de la subsidiaria">
                <button
                  type="button"
                  role="tab"
                  aria-selected={kpiBreakdownTab === 'employees'}
                  className={kpiBreakdownTab === 'employees' ? 'active' : ''}
                  onClick={() => setKpiBreakdownTab('employees')}
                >
                  Empleados ({employeeKpi.total})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={kpiBreakdownTab === 'purchaseOrders'}
                  className={kpiBreakdownTab === 'purchaseOrders' ? 'active' : ''}
                  onClick={() => setKpiBreakdownTab('purchaseOrders')}
                >
                  Órdenes de compra activas ({purchaseOrderKpi.activeCount})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={kpiBreakdownTab === 'invoices'}
                  className={kpiBreakdownTab === 'invoices' ? 'active' : ''}
                  onClick={() => setKpiBreakdownTab('invoices')}
                >
                  Facturas pendientes ({pendingInvoiceKpi.pendingCount})
                </button>
              </div>
              <span className="sub-ops-breakdown-caption">
                {kpiBreakdownTab === 'employees'
                  ? 'Personal asignado a departamentos o ubicaciones de esta entidad'
                  : kpiBreakdownTab === 'purchaseOrders'
                  ? 'Órdenes abiertas en almacenes o requisiciones de áreas vinculadas'
                  : 'Cuentas por pagar con saldo pendiente ligadas a órdenes de estas sedes'}
              </span>
            </div>

            <div className="table-wrap ops-table-wrap">
              {kpiBreakdownTab === 'employees' ? (
                <table className="data-table ops-data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '95px' }}>CÓDIGO</th>
                      <th>COLABORADOR</th>
                      <th>PUESTO</th>
                      <th>VÍNCULO CON SUBSIDIARIA</th>
                      <th style={{ width: '110px' }}>ESTADO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeKpi.entries.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="empty-cell">
                          No hay colaboradores vinculados a los departamentos o ubicaciones de esta subsidiaria.
                        </td>
                      </tr>
                    ) : (
                      employeeKpi.entries.map(({ employee, matchOrigin }) => (
                        <tr key={employee.id}>
                          <td>
                            <span className="accounting-code-badge">{employee.employeeCode}</span>
                          </td>
                          <td>
                            <div className="prod-cell">
                              <strong>{employee.fullName}</strong>
                              <small>{employee.email}</small>
                            </div>
                          </td>
                          <td>{employee.roleTitle}</td>
                          <td>{matchOrigin}</td>
                          <td>
                            <span
                              className={`sub-detail-status-inline ${
                                employee.status === 'Activo' ? 'is-active' : 'is-inactive'
                              }`}
                            >
                              {employee.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : kpiBreakdownTab === 'purchaseOrders' ? (
                <table className="data-table ops-data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '125px' }}>FOLIO OC</th>
                      <th>PROVEEDOR</th>
                      <th>ORIGEN (SEDE / ÁREA)</th>
                      <th style={{ width: '130px' }}>ESTADO</th>
                      <th style={{ textAlign: 'right', width: '130px' }}>MONTO TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseOrderKpi.activeEntries.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="empty-cell">
                          No hay órdenes de compra activas asociadas a los almacenes o departamentos de esta subsidiaria.
                        </td>
                      </tr>
                    ) : (
                      purchaseOrderKpi.activeEntries.map(({ po, originLabel }) => (
                        <tr key={po.id}>
                          <td>
                            <span className="accounting-code-badge">{po.folio}</span>
                          </td>
                          <td>
                            <div className="prod-cell">
                              <strong>{po.supplierCompany}</strong>
                              <small>Entrega est.: {po.expectedDeliveryDate}</small>
                            </div>
                          </td>
                          <td>{originLabel}</td>
                          <td>{po.status}</td>
                          <td style={{ textAlign: 'right' }} className="sub-detail-mono">
                            {formatKpiMoney(po.total, po.currency)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="data-table ops-data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '125px' }}>FOLIO FACTURA</th>
                      <th>PROVEEDOR</th>
                      <th>REFERENCIA Y SEDE / ÁREA</th>
                      <th style={{ width: '110px' }}>ESTADO</th>
                      <th style={{ textAlign: 'right', width: '135px' }}>SALDO PENDIENTE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingInvoiceKpi.entries.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="empty-cell">
                          No hay facturas por pagar pendientes vinculadas a órdenes de esta subsidiaria.
                        </td>
                      </tr>
                    ) : (
                      pendingInvoiceKpi.entries.map(({ bill, originLabel }) => (
                        <tr key={bill.id}>
                          <td>
                            <span className="accounting-code-badge">{bill.folio}</span>
                          </td>
                          <td>
                            <div className="prod-cell">
                              <strong>{bill.supplierCompany}</strong>
                              <small>Vence: {bill.dueDate}</small>
                            </div>
                          </td>
                          <td>{originLabel}</td>
                          <td>
                            <span
                              className={`sub-ops-bill-status ${
                                bill.status === 'Vencida'
                                  ? 'is-critical'
                                  : bill.status === 'Parcial'
                                  ? 'is-warning'
                                  : 'is-open'
                              }`}
                            >
                              {bill.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }} className="sub-detail-mono">
                            {formatKpiMoney(bill.balance, bill.currency)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Single-elevation Structural Metric Strip */}
      <div className="sub-detail-kpi-strip">
        <div className="sub-detail-kpi-item">
          <span className="sub-detail-kpi-label">Departamentos vinculados</span>
          <strong className="sub-detail-kpi-value">
            {linkedDeptIdSet.size} <small>/ {departments.length}</small>
          </strong>
          <span className="sub-detail-kpi-meta">
            {sharedDeptCount > 0
              ? `${sharedDeptCount} compartido(s) entre entidades`
              : linkedDeptIdSet.size > 0
              ? 'Exclusivos de esta subsidiaria'
              : 'Sin departamentos vinculados'}
          </span>
        </div>

        <div className="sub-detail-kpi-item">
          <span className="sub-detail-kpi-label">Ubicaciones físicas</span>
          <strong className="sub-detail-kpi-value">
            {linkedLocIdSet.size} <small>/ {locations.length}</small>
          </strong>
          <span className="sub-detail-kpi-meta">
            {sharedLocCount > 0
              ? `${sharedLocCount} sede(s) compartida(s)`
              : linkedLocIdSet.size > 0
              ? 'Sedes asignadas exclusivamente'
              : 'Sin ubicaciones vinculadas'}
          </span>
        </div>

        <div className="sub-detail-kpi-item">
          <span className="sub-detail-kpi-label">Almacenes operativos</span>
          <strong className="sub-detail-kpi-value">
            {linkedWarehouseMatch.matchedWarehouses.length}
          </strong>
          <span className="sub-detail-kpi-meta">
            {linkedWarehouseMatch.matchedWarehouses.length > 0
              ? linkedWarehouseMatch.matchedWarehouses.map((w) => w.code).join(' · ')
              : 'Sin almacenes asociados a las sedes'}
          </span>
        </div>

        <div className="sub-detail-kpi-item">
          <span className="sub-detail-kpi-label">Identidad fiscal y divisa</span>
          <strong className="sub-detail-kpi-value sub-detail-mono">
            {taxId.trim().toUpperCase() || 'SIN RFC'}
          </strong>
          <span className="sub-detail-kpi-meta">
            {country || 'México'} · Moneda base {currency || 'MXN'}
          </span>
        </div>
      </div>

      {/* Main Split Workspace: Left Legal Form + Right Interactive Relations */}
      <div className="sub-detail-grid">
        {/* Left: Legal & Fiscal Form */}
        <section className="ops-panel-card sub-detail-legal-panel" aria-labelledby="sub-legal-heading">
          <div className="ops-panel-header">
            <div>
              <div className="panel-kicker">IDENTIDAD CORPORATIVA</div>
              <h3 id="sub-legal-heading">Datos Legales y Fiscales</h3>
            </div>
            {isFormDirty && (
              <span className="sub-detail-dirty-indicator">Cambios sin guardar</span>
            )}
          </div>

          <form className="sub-detail-form" onSubmit={handleSaveLegalProfile}>
            <div className="form-grid">
              <label className="form-field">
                <span>Código interno *</span>
                <input
                  required
                  disabled={!canEditSub && !isNewMode}
                  placeholder="Ej. SUB-SUR"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </label>

              <label className="form-field">
                <span>RFC / Tax ID *</span>
                <input
                  required
                  disabled={!canEditSub && !isNewMode}
                  placeholder="Ej. ANS240115KL9"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                />
              </label>
            </div>

            <label className="form-field">
              <span>Nombre comercial *</span>
              <input
                required
                disabled={!canEditSub && !isNewMode}
                placeholder="Ej. AES Nexus Sureste"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <label className="form-field">
              <span>Razón social completa *</span>
              <input
                required
                disabled={!canEditSub && !isNewMode}
                placeholder="Ej. AES Nexus Sureste Logística S.A. de C.V."
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
              />
            </label>

            <div className="form-grid">
              <label className="form-field">
                <span>País de registro</span>
                <input
                  disabled={!canEditSub && !isNewMode}
                  placeholder="Ej. México"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </label>

              <label className="form-field">
                <span>Divisa base</span>
                <select
                  disabled={!canEditSub && !isNewMode}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  {CURRENCY_OPTIONS.map((cur) => (
                    <option key={cur} value={cur}>
                      {cur}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="form-field">
              <span>Representante legal</span>
              <input
                disabled={!canEditSub && !isNewMode}
                placeholder="Ej. Andrea Morales"
                value={legalRep}
                onChange={(e) => setLegalRep(e.target.value)}
              />
            </label>

            <label className="form-field">
              <span>Domicilio fiscal</span>
              <input
                disabled={!canEditSub && !isNewMode}
                placeholder="Calle, número, colonia, C.P., ciudad y estado"
                value={fiscalAddress}
                onChange={(e) => setFiscalAddress(e.target.value)}
              />
            </label>

            <label className="admin-holding-checkbox">
              <input
                type="checkbox"
                disabled={!canEditSub && !isNewMode}
                checked={isHolding}
                onChange={(e) => setIsHolding(e.target.checked)}
              />
              <span>Establecer como empresa Matriz / Holding del grupo</span>
            </label>

            {(canEditSub || isNewMode) && (
              <div className="sub-detail-form-actions">
                {!isNewMode && isFormDirty && (
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={handleResetLegalForm}
                  >
                    Descartar
                  </button>
                )}
                {isNewMode && (
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={onBack}
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={!isNewMode && !isFormDirty}
                >
                  {isNewMode ? <Plus size={14} /> : <Check size={14} />}
                  {isNewMode ? 'Crear subsidiaria' : 'Guardar datos legales'}
                </button>
              </div>
            )}
          </form>
        </section>

        {/* Right: Consolidated View & Interactive Relationships */}
        <div className="sub-detail-relations-stack">
          <div className="sub-structure-mode-bar">
            <div className="sub-rel-segmented" role="tablist" aria-label="Modo de visualización de estructura">
              <button
                type="button"
                role="tab"
                aria-selected={structureViewMode === 'consolidated'}
                className={structureViewMode === 'consolidated' ? 'active' : ''}
                onClick={() => setStructureViewMode('consolidated')}
              >
                <Layers size={13} style={{ verticalAlign: '-2px', marginRight: '5px' }} />
                Vista consolidada ({linkedDeptIdSet.size + linkedLocIdSet.size})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={structureViewMode === 'manage'}
                className={structureViewMode === 'manage' ? 'active' : ''}
                onClick={() => setStructureViewMode('manage')}
              >
                <SlidersHorizontal size={13} style={{ verticalAlign: '-2px', marginRight: '5px' }} />
                Gestionar vínculos (N:M)
              </button>
            </div>
            <span className="sub-structure-mode-hint">
              {structureViewMode === 'consolidated'
                ? 'Resumen unificado de departamentos y sedes asignadas a esta subsidiaria'
                : 'Selecciona, crea o actualiza las relaciones con departamentos y sedes físicas'}
            </span>
          </div>

          {structureViewMode === 'consolidated' ? (
            <>
              <section className="ops-panel-card" aria-labelledby="sub-consolidated-heading">
                <div className="ops-panel-header">
                  <div>
                    <div className="panel-kicker">ESTRUCTURA OPERATIVA CONSOLIDADA</div>
                    <h3 id="sub-consolidated-heading">
                      Departamentos y Ubicaciones Relacionadas ({linkedDeptIdSet.size + linkedLocIdSet.size})
                    </h3>
                  </div>

                  {canEditSub && (
                    <button
                      type="button"
                      className="button button-secondary button-sm"
                      onClick={() => setStructureViewMode('manage')}
                    >
                      <Link2 size={13} /> Vincular / editar relaciones
                    </button>
                  )}
                </div>

                <div className="sub-rel-toolbar">
                  <div className="ops-search-input-wrap" style={{ flex: '1 1 220px' }}>
                    <Search size={13} />
                    <input
                      type="text"
                      placeholder="Buscar en estructura consolidada (código, área, sede, líder o ciudad)..."
                      value={consolidatedSearch}
                      onChange={(e) => setConsolidatedSearch(e.target.value)}
                    />
                    {consolidatedSearch && (
                      <button
                        type="button"
                        className="search-clear-btn"
                        onClick={() => setConsolidatedSearch('')}
                        title="Limpiar"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  <div className="sub-rel-segmented" role="group" aria-label="Filtrar vista consolidada">
                    <button
                      type="button"
                      className={consolidatedScope === 'all' ? 'active' : ''}
                      onClick={() => setConsolidatedScope('all')}
                    >
                      Todos ({linkedDepartmentsList.length + linkedLocationsList.length})
                    </button>
                    <button
                      type="button"
                      className={consolidatedScope === 'departments' ? 'active' : ''}
                      onClick={() => setConsolidatedScope('departments')}
                    >
                      Departamentos ({linkedDepartmentsList.length})
                    </button>
                    <button
                      type="button"
                      className={consolidatedScope === 'locations' ? 'active' : ''}
                      onClick={() => setConsolidatedScope('locations')}
                    >
                      Ubicaciones ({linkedLocationsList.length})
                    </button>
                  </div>
                </div>

                <div className="table-wrap ops-table-wrap">
                  <table className="data-table ops-data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '130px' }}>TIPO</th>
                        <th style={{ width: '110px' }}>CÓDIGO</th>
                        <th>UNIDAD / SEDE</th>
                        <th>RESPONSABLE Y REFERENCIA</th>
                        <th style={{ width: '95px' }}>PERSONAL</th>
                        <th>ALCANCE</th>
                        <th style={{ width: '90px' }}>ESTADO</th>
                        {canEditSub && <th style={{ textAlign: 'right', width: '105px' }}>ACCIÓN</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {consolidatedRows.length === 0 ? (
                        <tr>
                          <td colSpan={canEditSub ? 8 : 7} className="empty-cell">
                            {linkedDepartmentsList.length + linkedLocationsList.length === 0
                              ? 'Esta subsidiaria aún no tiene departamentos ni ubicaciones físicas relacionadas.'
                              : 'No hay coincidencias con el filtro aplicado en la vista consolidada.'}
                          </td>
                        </tr>
                      ) : (
                        consolidatedRows.map((row) => (
                          <tr key={`${row.kind}_${row.id}`}>
                            <td>
                              <span className={`sub-consolidated-kind ${row.kind === 'department' ? 'is-dept' : 'is-loc'}`}>
                                {row.kind === 'department' ? (
                                  <Building2 size={12} />
                                ) : (
                                  <MapPin size={12} />
                                )}
                                {row.categoryLabel}
                              </span>
                            </td>
                            <td>
                              <span className="accounting-code-badge">{row.code}</span>
                            </td>
                            <td>
                              <div className="prod-cell">
                                <strong>{row.name}</strong>
                                <small>{row.detailLine}</small>
                              </div>
                            </td>
                            <td>
                              <div className="sub-consolidated-meta-cell">
                                <span>{row.responsibleLabel}</span>
                                <small>{row.placeOrCostCenter}</small>
                              </div>
                            </td>
                            <td className="sub-detail-mono">{row.employeeCount} colab.</td>
                            <td>
                              <span className="sub-rel-sharing-note">
                                {row.otherSubCodes.length > 0
                                  ? `Compartido (${row.otherSubCodes.join(', ')})`
                                  : 'Exclusivo'}
                              </span>
                            </td>
                            <td>
                              <span className={`sub-detail-status-inline ${row.active ? 'is-active' : 'is-inactive'}`}>
                                {row.active ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                            {canEditSub && (
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  type="button"
                                  className="button-icon-action"
                                  title="Desvincular de esta subsidiaria"
                                  onClick={() =>
                                    row.kind === 'department'
                                      ? handleToggleDepartmentLink(row.id)
                                      : handleToggleLocationLink(row.id)
                                  }
                                >
                                  <Unlink size={11} /> Quitar
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Consolidated Breakdown by Type */}
              <div className="sub-consolidated-split">
                <section className="ops-panel-card">
                  <div className="ops-panel-header">
                    <div>
                      <div className="panel-kicker">CONSOLIDADO FUNCIONAL</div>
                      <h3>Departamentos asignados ({linkedDepartmentsList.length})</h3>
                    </div>
                  </div>
                  {linkedDepartmentsList.length === 0 ? (
                    <div className="sub-rel-empty">
                      Sin departamentos vinculados.{' '}
                      {canEditSub && (
                        <button
                          type="button"
                          className="sub-inline-link-btn"
                          onClick={() => setStructureViewMode('manage')}
                        >
                          Vincular ahora
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="sub-consolidated-mini-list">
                      {linkedDepartmentsList.map((d) => (
                        <div key={d.id} className="sub-consolidated-mini-row">
                          <div>
                            <strong>{d.code} · {d.name}</strong>
                            <small>
                              Líder: {d.leader} {d.costCenter ? `· ${d.costCenter}` : ''}
                            </small>
                          </div>
                          <span className="sub-detail-mono">
                            {employeeCountByDept.get(d.id) || 0} colab.
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="ops-panel-card">
                  <div className="ops-panel-header">
                    <div>
                      <div className="panel-kicker">CONSOLIDADO DE INFRAESTRUCTURA</div>
                      <h3>Ubicaciones físicas asignadas ({linkedLocationsList.length})</h3>
                    </div>
                  </div>
                  {linkedLocationsList.length === 0 ? (
                    <div className="sub-rel-empty">
                      Sin ubicaciones físicas vinculadas.{' '}
                      {canEditSub && (
                        <button
                          type="button"
                          className="sub-inline-link-btn"
                          onClick={() => setStructureViewMode('manage')}
                        >
                          Vincular ahora
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {locationTypeBreakdown.length > 0 && (
                        <div className="sub-consolidated-type-summary">
                          {locationTypeBreakdown.map(([type, count]) => (
                            <span key={type}>
                              <strong>{count}</strong> {type}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="sub-consolidated-mini-list">
                        {linkedLocationsList.map((l) => (
                          <div key={l.id} className="sub-consolidated-mini-row">
                            <div>
                              <strong>{l.code} · {l.name}</strong>
                              <small>
                                {l.city}, {l.state} · {l.type}
                              </small>
                            </div>
                            <span className="sub-detail-mono">
                              {employeeCountByLoc.get(l.id) || 0} colab.
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </section>
              </div>
            </>
          ) : (
            <>
          {/* Panel 1: Departamentos */}
          <section className="ops-panel-card" aria-labelledby="sub-depts-heading">
            <div className="ops-panel-header">
              <div>
                <div className="panel-kicker">ESTRUCTURA FUNCIONAL · RELACIÓN N:M</div>
                <h3 id="sub-depts-heading">
                  <Building2 size={15} style={{ verticalAlign: '-2px', marginRight: '6px' }} />
                  Departamentos relacionados ({linkedDeptIdSet.size} de {departments.length})
                </h3>
              </div>

              <div className="sub-rel-header-actions">
                {canCreateDept && (
                  <button
                    type="button"
                    className="button button-secondary button-sm"
                    onClick={() => setShowNewDeptForm((v) => !v)}
                  >
                    {showNewDeptForm ? <X size={13} /> : <Plus size={13} />}
                    {showNewDeptForm ? 'Cerrar' : 'Crear departamento'}
                  </button>
                )}
              </div>
            </div>

            {showNewDeptForm && (
              <form className="sub-quick-create-box" onSubmit={handleQuickCreateDepartment}>
                <div className="sub-quick-create-title">Nuevo departamento (se vinculará automáticamente)</div>
                <div className="sub-quick-create-grid">
                  <input
                    required
                    placeholder="Código * (Ej. COM-08)"
                    value={newDeptCode}
                    onChange={(e) => setNewDeptCode(e.target.value)}
                  />
                  <input
                    required
                    placeholder="Nombre del departamento *"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                  />
                  <input
                    required
                    placeholder="Líder / responsable *"
                    value={newDeptLeader}
                    onChange={(e) => setNewDeptLeader(e.target.value)}
                  />
                  <input
                    placeholder="Centro de costos (Ej. CC-800)"
                    value={newDeptCostCenter}
                    onChange={(e) => setNewDeptCostCenter(e.target.value)}
                  />
                </div>
                <div className="sub-quick-create-actions">
                  <button type="submit" className="button button-primary button-sm">
                    <Plus size={12} /> Crear y vincular
                  </button>
                </div>
              </form>
            )}

            <div className="sub-rel-toolbar">
              <div className="ops-search-input-wrap" style={{ flex: '1 1 200px' }}>
                <Search size={13} />
                <input
                  type="text"
                  placeholder="Filtrar departamentos por código, nombre o líder..."
                  value={deptSearch}
                  onChange={(e) => setDeptSearch(e.target.value)}
                />
                {deptSearch && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => setDeptSearch('')}
                    title="Limpiar"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="sub-rel-segmented" role="group" aria-label="Filtrar departamentos por vínculo">
                <button
                  type="button"
                  className={deptRelationFilter === 'all' ? 'active' : ''}
                  onClick={() => setDeptRelationFilter('all')}
                >
                  Todos ({departments.length})
                </button>
                <button
                  type="button"
                  className={deptRelationFilter === 'linked' ? 'active' : ''}
                  onClick={() => setDeptRelationFilter('linked')}
                >
                  Vinculados ({linkedDeptIdSet.size})
                </button>
                <button
                  type="button"
                  className={deptRelationFilter === 'unlinked' ? 'active' : ''}
                  onClick={() => setDeptRelationFilter('unlinked')}
                >
                  Disponibles ({departments.length - linkedDeptIdSet.size})
                </button>
              </div>

              {canEditSub && filteredDepartments.length > 0 && (
                <div className="sub-rel-bulk-btns">
                  <button
                    type="button"
                    className="button button-secondary button-sm"
                    onClick={() => handleBulkDepartments(true)}
                  >
                    <Link2 size={12} /> Vincular visibles
                  </button>
                  <button
                    type="button"
                    className="button button-secondary button-sm"
                    onClick={() => handleBulkDepartments(false)}
                  >
                    <Unlink size={12} /> Quitar visibles
                  </button>
                </div>
              )}
            </div>

            <div className="sub-rel-list">
              {filteredDepartments.length === 0 ? (
                <div className="sub-rel-empty">
                  No hay departamentos que coincidan con el filtro seleccionado.
                </div>
              ) : (
                filteredDepartments.map((dept) => {
                  const isLinked = linkedDeptIdSet.has(dept.id)
                  const empCount = employeeCountByDept.get(dept.id) || 0
                  const otherSubs = (dept.subsidiaryIds || [])
                    .filter((id) => id !== subsidiaryId)
                    .map((id) => subsidiaryById.get(id))
                    .filter((s): s is SubsidiaryRecord => Boolean(s))

                  return (
                    <div
                      key={dept.id}
                      className={`sub-rel-row ${isLinked ? 'is-linked' : ''}`}
                    >
                      <button
                        type="button"
                        className="sub-rel-toggle-btn"
                        disabled={!canEditSub}
                        onClick={() => handleToggleDepartmentLink(dept.id)}
                        aria-pressed={isLinked}
                        title={isLinked ? 'Desvincular departamento' : 'Vincular departamento'}
                      >
                        <span className={`sub-rel-checkbox ${isLinked ? 'checked' : ''}`}>
                          {isLinked && <Check size={11} />}
                        </span>
                      </button>

                      <div
                        className="sub-rel-row-body"
                        onClick={() => canEditSub && handleToggleDepartmentLink(dept.id)}
                      >
                        <div className="sub-rel-row-top">
                          <span className="accounting-code-badge">{dept.code}</span>
                          <strong>{dept.name}</strong>
                          {!dept.active && <span className="sub-rel-muted-tag">Inactivo</span>}
                        </div>
                        <div className="sub-rel-row-meta">
                          <span>Líder: {dept.leader}</span>
                          {dept.costCenter && (
                            <>
                              <span>·</span>
                              <span className="sub-detail-mono">{dept.costCenter}</span>
                            </>
                          )}
                          <span>·</span>
                          <span>
                            <Users size={11} style={{ verticalAlign: '-1px', marginRight: '3px' }} />
                            {empCount} colab.
                          </span>
                          <span>·</span>
                          <span className="sub-rel-sharing-note">
                            {otherSubs.length > 0
                              ? `También en: ${otherSubs.map((s) => s.code).join(', ')}`
                              : isLinked
                              ? 'Exclusivo de esta subsidiaria'
                              : 'Sin asignar a otras entidades'}
                          </span>
                        </div>
                      </div>

                      <div className="sub-rel-row-action">
                        <button
                          type="button"
                          disabled={!canEditSub}
                          className={`button button-sm ${
                            isLinked ? 'button-secondary' : 'button-primary'
                          }`}
                          onClick={() => handleToggleDepartmentLink(dept.id)}
                        >
                          {isLinked ? 'Vinculado' : 'Vincular'}
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>

          {/* Panel 2: Ubicaciones físicas */}
          <section className="ops-panel-card" aria-labelledby="sub-locs-heading">
            <div className="ops-panel-header">
              <div>
                <div className="panel-kicker">INFRAESTRUCTURA FÍSICA · RELACIÓN N:M</div>
                <h3 id="sub-locs-heading">
                  <MapPin size={15} style={{ verticalAlign: '-2px', marginRight: '6px' }} />
                  Ubicaciones físicas relacionadas ({linkedLocIdSet.size} de {locations.length})
                </h3>
              </div>

              <div className="sub-rel-header-actions">
                {canCreateLoc && (
                  <button
                    type="button"
                    className="button button-secondary button-sm"
                    onClick={() => setShowNewLocForm((v) => !v)}
                  >
                    {showNewLocForm ? <X size={13} /> : <Plus size={13} />}
                    {showNewLocForm ? 'Cerrar' : 'Crear ubicación'}
                  </button>
                )}
              </div>
            </div>

            {showNewLocForm && (
              <form className="sub-quick-create-box" onSubmit={handleQuickCreateLocation}>
                <div className="sub-quick-create-title">Nueva ubicación física (sincronizada con sedes y almacenes)</div>
                <div className="sub-quick-create-grid">
                  <input
                    required
                    placeholder="Código * (Ej. ALM-QRO)"
                    value={newLocCode}
                    onChange={(e) => setNewLocCode(e.target.value)}
                  />
                  <input
                    required
                    placeholder="Nombre de sede o sucursal *"
                    value={newLocName}
                    onChange={(e) => setNewLocName(e.target.value)}
                  />
                  <select
                    value={newLocType}
                    onChange={(e) => setNewLocType(e.target.value as LocationType)}
                  >
                    {LOCATION_TYPES.map((lt) => (
                      <option key={lt} value={lt}>
                        {lt}
                      </option>
                    ))}
                  </select>
                  <input
                    required
                    placeholder="Ciudad *"
                    value={newLocCity}
                    onChange={(e) => setNewLocCity(e.target.value)}
                  />
                  <input
                    placeholder="Estado / Entidad"
                    value={newLocState}
                    onChange={(e) => setNewLocState(e.target.value)}
                  />
                  <input
                    placeholder="Encargado / Responsable"
                    value={newLocManager}
                    onChange={(e) => setNewLocManager(e.target.value)}
                  />
                </div>
                <input
                  required
                  style={{ width: '100%', marginTop: '6px' }}
                  placeholder="Dirección física completa *"
                  value={newLocAddress}
                  onChange={(e) => setNewLocAddress(e.target.value)}
                />
                <div className="sub-quick-create-actions">
                  <button type="submit" className="button button-primary button-sm">
                    <Plus size={12} /> Crear y vincular
                  </button>
                </div>
              </form>
            )}

            <div className="sub-rel-toolbar">
              <div className="ops-search-input-wrap" style={{ flex: '1 1 180px' }}>
                <Search size={13} />
                <input
                  type="text"
                  placeholder="Filtrar ubicaciones por código, nombre, ciudad..."
                  value={locSearch}
                  onChange={(e) => setLocSearch(e.target.value)}
                />
                {locSearch && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => setLocSearch('')}
                    title="Limpiar"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <select
                className="accounting-filter-select"
                value={locTypeFilter}
                onChange={(e) => setLocTypeFilter(e.target.value)}
                aria-label="Filtrar por tipo de ubicación"
              >
                <option value="all">Todos los tipos</option>
                {LOCATION_TYPES.map((lt) => (
                  <option key={lt} value={lt}>
                    {lt}
                  </option>
                ))}
              </select>

              <div className="sub-rel-segmented" role="group" aria-label="Filtrar ubicaciones por vínculo">
                <button
                  type="button"
                  className={locRelationFilter === 'all' ? 'active' : ''}
                  onClick={() => setLocRelationFilter('all')}
                >
                  Todas ({locations.length})
                </button>
                <button
                  type="button"
                  className={locRelationFilter === 'linked' ? 'active' : ''}
                  onClick={() => setLocRelationFilter('linked')}
                >
                  Vinculadas ({linkedLocIdSet.size})
                </button>
                <button
                  type="button"
                  className={locRelationFilter === 'unlinked' ? 'active' : ''}
                  onClick={() => setLocRelationFilter('unlinked')}
                >
                  Disponibles ({locations.length - linkedLocIdSet.size})
                </button>
              </div>

              {canEditSub && filteredLocations.length > 0 && (
                <div className="sub-rel-bulk-btns">
                  <button
                    type="button"
                    className="button button-secondary button-sm"
                    onClick={() => handleBulkLocations(true)}
                  >
                    <Link2 size={12} /> Vincular visibles
                  </button>
                  <button
                    type="button"
                    className="button button-secondary button-sm"
                    onClick={() => handleBulkLocations(false)}
                  >
                    <Unlink size={12} /> Quitar visibles
                  </button>
                </div>
              )}
            </div>

            <div className="sub-rel-list">
              {filteredLocations.length === 0 ? (
                <div className="sub-rel-empty">
                  No hay ubicaciones físicas que coincidan con los criterios seleccionados.
                </div>
              ) : (
                filteredLocations.map((loc) => {
                  const isLinked = linkedLocIdSet.has(loc.id)
                  const empCount = employeeCountByLoc.get(loc.id) || 0
                  const otherSubs = (loc.subsidiaryIds || [])
                    .filter((id) => id !== subsidiaryId)
                    .map((id) => subsidiaryById.get(id))
                    .filter((s): s is SubsidiaryRecord => Boolean(s))

                  return (
                    <div
                      key={loc.id}
                      className={`sub-rel-row ${isLinked ? 'is-linked' : ''}`}
                    >
                      <button
                        type="button"
                        className="sub-rel-toggle-btn"
                        disabled={!canEditSub}
                        onClick={() => handleToggleLocationLink(loc.id)}
                        aria-pressed={isLinked}
                        title={isLinked ? 'Desvincular ubicación' : 'Vincular ubicación'}
                      >
                        <span className={`sub-rel-checkbox ${isLinked ? 'checked' : ''}`}>
                          {isLinked && <Check size={11} />}
                        </span>
                      </button>

                      <div
                        className="sub-rel-row-body"
                        onClick={() => canEditSub && handleToggleLocationLink(loc.id)}
                      >
                        <div className="sub-rel-row-top">
                          <span className="accounting-code-badge">{loc.code}</span>
                          <strong>{loc.name}</strong>
                          <span className="sub-rel-type-text">{loc.type}</span>
                          {!loc.active && <span className="sub-rel-muted-tag">Inactiva</span>}
                        </div>
                        <div className="sub-rel-row-meta">
                          <span>
                            {loc.city}, {loc.state}
                          </span>
                          {loc.manager && (
                            <>
                              <span>·</span>
                              <span>Encargado: {loc.manager}</span>
                            </>
                          )}
                          <span>·</span>
                          <span>
                            <Users size={11} style={{ verticalAlign: '-1px', marginRight: '3px' }} />
                            {empCount} colab.
                          </span>
                          <span>·</span>
                          <span className="sub-rel-sharing-note">
                            {otherSubs.length > 0
                              ? `También en: ${otherSubs.map((s) => s.code).join(', ')}`
                              : isLinked
                              ? 'Exclusiva de esta subsidiaria'
                              : 'Sin asignar a otras entidades'}
                          </span>
                        </div>
                      </div>

                      <div className="sub-rel-row-action">
                        <button
                          type="button"
                          disabled={!canEditSub}
                          className={`button button-sm ${
                            isLinked ? 'button-secondary' : 'button-primary'
                          }`}
                          onClick={() => handleToggleLocationLink(loc.id)}
                        >
                          {isLinked ? 'Vinculada' : 'Vincular'}
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
