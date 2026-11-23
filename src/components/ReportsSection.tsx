import { useMemo, useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarRange,
  Download,
  FileDown,
  FileSpreadsheet,
  Filter,
  GitCompareArrows,
  Landmark,
  MapPin,
  Package,
  Palette,
  Printer,
  ReceiptText,
  RotateCcw,
  Search,
  ShoppingBag,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import {
  normalizeSupplierBankAccounts,
  type ElectronicPaymentBatch,
  type SupplierBankAccount,
} from '../data/ebp'
import type { EmployeeRecord } from '../data/employees'
import type {
  BankAccount,
  BillPayable,
  ChartAccount,
  ExpenseRecord,
  InvoiceReceivable,
  PaymentTransaction,
} from '../data/finance'
import type {
  InventoryItemLocation,
  PurchaseOrder,
  StockMovement,
  Warehouse,
} from '../data/operations'
import type { PayrollRunRecord } from '../data/payroll'
import type { PurchaseRequisition } from '../data/purchases'
import type { Quote, SalesOrder } from '../data/sales'
import type { DepartmentRecord, PhysicalLocationRecord } from './AdministrationSection'
import {
  computeIncomeStatementData,
  IncomeStatementReport,
  type PnlSourceMode,
} from './IncomeStatementReport'
import { exportIncomeStatementPdf } from '../utils/incomeStatementPdf'
import { useToast } from './Toast'

export type ReportsSectionTab =
  | 'Resumen ejecutivo'
  | 'Estado de Resultados'
  | 'Finanzas y Tesorería'
  | 'CxP y Pagos EBP'
  | 'Ventas y CxC'
  | 'Compras e Inventario'
  | 'Nómina y RRHH'

export type DateRangePreset =
  | 'all'
  | 'this_month'
  | 'last_30'
  | 'this_quarter'
  | 'ytd'
  | 'custom'

export interface ReportFilterState {
  searchQuery: string
  datePreset: DateRangePreset
  dateFrom: string
  dateTo: string
  locationId: string
  departmentId: string
  statusFilter: 'Todos' | 'Pendiente' | 'Liquidado' | 'Alerta'
  currencyFilter: 'Todas' | 'MXN' | 'USD'
  compareYoY: boolean
}

interface SupplierSummaryInput {
  company: string
  rfc?: string
  currency?: 'MXN' | 'USD'
  bankName?: string
  clabe?: string
  accountNumber?: string
  defaultReference?: string
  bankPackValues?: Record<string, Record<string, string>>
  bankAccounts?: SupplierBankAccount[]
}

interface ReportsSectionProps {
  activeTab: ReportsSectionTab
  allowedTabs: ReportsSectionTab[]
  onSelectTab: (tab: ReportsSectionTab) => void
  bankAccounts: BankAccount[]
  receivables: InvoiceReceivable[]
  payables: BillPayable[]
  expenses: ExpenseRecord[]
  transactions: PaymentTransaction[]
  chartAccounts: ChartAccount[]
  ebpBatches: ElectronicPaymentBatch[]
  quotes: Quote[]
  orders: SalesOrder[]
  purchaseOrders: PurchaseOrder[]
  requisitions: PurchaseRequisition[]
  inventory: InventoryItemLocation[]
  movements: StockMovement[]
  warehouses: Warehouse[]
  locations: PhysicalLocationRecord[]
  employees: EmployeeRecord[]
  payrollRuns: PayrollRunRecord[]
  departments: DepartmentRecord[]
  suppliers: SupplierSummaryInput[]
  clientsCount: number
  onNavigateModule: (moduleName: string) => void
  onExportAudit?: (reportName: string, rowCount: number) => void
}

const MONTH_INDEX: Record<string, number> = {
  ene: 0,
  enero: 0,
  jan: 0,
  feb: 1,
  febrero: 1,
  mar: 2,
  marzo: 2,
  abr: 3,
  abril: 3,
  apr: 3,
  may: 4,
  mayo: 4,
  jun: 5,
  junio: 5,
  jul: 6,
  julio: 6,
  ago: 7,
  agosto: 7,
  aug: 7,
  sep: 8,
  sept: 8,
  septiembre: 8,
  oct: 9,
  octubre: 9,
  nov: 10,
  noviembre: 10,
  dic: 11,
  diciembre: 11,
  dec: 11,
}

const pad2 = (n: number) => String(n).padStart(2, '0')

function toIsoDate(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`
}

export function parseErpDateToIso(raw?: string): string | null {
  if (!raw) return null
  const trimmed = raw.trim().toLowerCase()
  if (!trimmed) return null

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`
  }

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashMatch) {
    const day = Number(slashMatch[1])
    const month = Number(slashMatch[2]) - 1
    const year = Number(slashMatch[3])
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      return toIsoDate(year, month, day)
    }
  }

  const humanMatch = trimmed.match(/^(\d{1,2})\s+([a-záéíóú]+)\.?\s+(\d{4})$/i)
  if (humanMatch) {
    const day = Number(humanMatch[1])
    const monthIdx = MONTH_INDEX[humanMatch[2]]
    const year = Number(humanMatch[3])
    if (monthIdx !== undefined && day >= 1 && day <= 31) {
      return toIsoDate(year, monthIdx, day)
    }
  }

  return null
}

function isDateWithinRange(rawDate: string | undefined, fromIso: string, toIso: string): boolean {
  if (!fromIso && !toIso) return true
  const parsed = parseErpDateToIso(rawDate)
  if (!parsed) return true
  if (fromIso && parsed < fromIso) return false
  if (toIso && parsed > toIso) return false
  return true
}

function resolveDatePresetBounds(preset: DateRangePreset): { from: string; to: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()

  if (preset === 'this_month') {
    const lastDay = new Date(y, m + 1, 0).getDate()
    return {
      from: toIsoDate(y, m, 1),
      to: toIsoDate(y, m, lastDay),
    }
  }
  if (preset === 'last_30') {
    const start = new Date(y, m, d - 30)
    return {
      from: toIsoDate(start.getFullYear(), start.getMonth(), start.getDate()),
      to: toIsoDate(y, m, d),
    }
  }
  if (preset === 'this_quarter') {
    const qStartMonth = Math.floor(m / 3) * 3
    const qEndMonth = qStartMonth + 2
    const lastDay = new Date(y, qEndMonth + 1, 0).getDate()
    return {
      from: toIsoDate(y, qStartMonth, 1),
      to: toIsoDate(y, qEndMonth, lastDay),
    }
  }
  if (preset === 'ytd') {
    return {
      from: `${y}-01-01`,
      to: `${y}-12-31`,
    }
  }
  return { from: '', to: '' }
}

const shortMoneyAxis = (val: number) => {
  const abs = Math.abs(val)
  const sign = val < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`
  return `${sign}$${Math.round(abs)}`
}

const MONTH_SHORT_ES = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
]

function formatPeriodBucketLabel(key: string, granularity: 'day' | 'month'): string {
  if (granularity === 'day') {
    const parts = key.split('-')
    if (parts.length === 3) {
      const mIdx = Number(parts[1]) - 1
      return `${parts[2]} ${MONTH_SHORT_ES[mIdx] || parts[1]}`
    }
    return key
  }
  const parts = key.split('-')
  if (parts.length === 2) {
    const mIdx = Number(parts[1]) - 1
    return `${MONTH_SHORT_ES[mIdx] || parts[1]} ${parts[0]}`
  }
  return key
}

const money = (val: number, currency: string = 'MXN') =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(val)

const compactNum = (val: number) =>
  new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 }).format(val)

function shiftIsoYear(iso: string, deltaYears: number): string {
  if (!iso) return ''
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return ''
  return `${Number(match[1]) + deltaYears}-${match[2]}-${match[3]}`
}

function calcYoYPct(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? 0 : null
  return ((curr - prev) / Math.abs(prev)) * 100
}

function formatYoYPct(pct: number | null): string {
  if (pct === null) return 'N/D'
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}% YoY`
}

interface ChartSeriesColors {
  ingresos: string
  gastos: string
  compras: string
  nomina: string
  flujoNeto: string
}

const CHART_COLORS_STORAGE_KEY = 'aes_nexus_reports_chart_colors'

const DEFAULT_SERIES_COLORS: ChartSeriesColors = {
  ingresos: '#1e8e5a',
  gastos: '#c97c1e',
  compras: '#2c6fbb',
  nomina: '#456a61',
  flujoNeto: '#2c6fbb',
}

const CHART_COLOR_PRESETS: Array<{ id: string; label: string; colors: ChartSeriesColors }> = [
  {
    id: 'erp',
    label: 'Estándar ERP',
    colors: DEFAULT_SERIES_COLORS,
  },
  {
    id: 'ocean',
    label: 'Oceánico',
    colors: {
      ingresos: '#0d9488',
      gastos: '#f59e0b',
      compras: '#2563eb',
      nomina: '#0284c7',
      flujoNeto: '#4f46e5',
    },
  },
  {
    id: 'executive',
    label: 'Ejecutivo',
    colors: {
      ingresos: '#15803d',
      gastos: '#b45309',
      compras: '#1d4ed8',
      nomina: '#6d28d9',
      flujoNeto: '#0f766e',
    },
  },
  {
    id: 'contrast',
    label: 'Alto Contraste',
    colors: {
      ingresos: '#059669',
      gastos: '#dc2626',
      compras: '#7c3aed',
      nomina: '#0891b2',
      flujoNeto: '#111827',
    },
  },
]

function lightenHex(hex: string, ratio = 0.45): string {
  const clean = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return hex
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  const nr = Math.round(r + (255 - r) * ratio)
  const ng = Math.round(g + (255 - g) * ratio)
  const nb = Math.round(b + (255 - b) * ratio)
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`
}

function escapeCsvCell(value: string | number | undefined | null): string {
  const str = String(value ?? '')
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const csvLines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ]
  const blob = new Blob(['\ufeff' + csvLines.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function inferDepartmentFromCategory(category: string): string {
  const lower = category.toLowerCase()
  if (lower.includes('logística') || lower.includes('flete') || lower.includes('almacén')) {
    return 'Operaciones y Logística'
  }
  if (lower.includes('software') || lower.includes('sistema') || lower.includes('ti')) {
    return 'Tecnología y Sistemas'
  }
  if (lower.includes('impuesto') || lower.includes('nómina') || lower.includes('arrendamiento')) {
    return 'Finanzas y Tesorería'
  }
  if (lower.includes('viático') || lower.includes('representación') || lower.includes('venta')) {
    return 'Ventas y Comercial'
  }
  return 'Finanzas y Tesorería'
}

export function ReportsSection({
  activeTab,
  allowedTabs,
  onSelectTab,
  bankAccounts,
  receivables,
  payables,
  expenses,
  transactions,
  chartAccounts,
  ebpBatches,
  quotes,
  orders,
  purchaseOrders,
  requisitions,
  inventory,
  movements,
  warehouses,
  locations,
  employees,
  payrollRuns,
  departments,
  suppliers,
  clientsCount,
  onNavigateModule,
  onExportAudit,
}: ReportsSectionProps) {
  const toast = useToast()
  const [filters, setFilters] = useState<ReportFilterState>({
    searchQuery: '',
    datePreset: 'all',
    dateFrom: '',
    dateTo: '',
    locationId: 'all',
    departmentId: 'all',
    statusFilter: 'Todos',
    currencyFilter: 'Todas',
    compareYoY: false,
  })
  const [chartViewMode, setChartViewMode] = useState<'expenses' | 'performance'>('expenses')
  const [yoyChartType, setYoyChartType] = useState<'stacked' | 'line'>('stacked')
  const [showColorCustomizer, setShowColorCustomizer] = useState(false)
  const [seriesColors, setSeriesColors] = useState<ChartSeriesColors>(() => {
    try {
      const saved = window.localStorage.getItem(CHART_COLORS_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<ChartSeriesColors>
        return { ...DEFAULT_SERIES_COLORS, ...parsed }
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_SERIES_COLORS
  })

  const updateSeriesColor = (key: keyof ChartSeriesColors, value: string) => {
    setSeriesColors((prev) => {
      const next = { ...prev, [key]: value }
      try {
        window.localStorage.setItem(CHART_COLORS_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore storage errors
      }
      return next
    })
  }

  const applyColorPalette = (palette: ChartSeriesColors) => {
    setSeriesColors(palette)
    try {
      window.localStorage.setItem(CHART_COLORS_STORAGE_KEY, JSON.stringify(palette))
    } catch {
      // ignore storage errors
    }
  }

  const isCustomColorsActive = (Object.keys(DEFAULT_SERIES_COLORS) as Array<keyof ChartSeriesColors>).some(
    (k) => seriesColors[k].toLowerCase() !== DEFAULT_SERIES_COLORS[k].toLowerCase()
  )

  const activeLocations = useMemo(
    () => locations.filter((l) => l.active),
    [locations]
  )

  const activeDepartments = useMemo(
    () => departments.filter((d) => d.active),
    [departments]
  )

  const selectedLocation = useMemo(
    () => locations.find((l) => l.id === filters.locationId) || null,
    [locations, filters.locationId]
  )

  const selectedDepartment = useMemo(
    () => departments.find((d) => d.id === filters.departmentId) || null,
    [departments, filters.departmentId]
  )

  const q = filters.searchQuery.trim().toLowerCase()

  const handleDatePresetChange = (preset: DateRangePreset) => {
    if (preset === 'custom') {
      setFilters((prev) => ({ ...prev, datePreset: 'custom' }))
      return
    }
    const bounds = resolveDatePresetBounds(preset)
    setFilters((prev) => ({
      ...prev,
      datePreset: preset,
      dateFrom: bounds.from,
      dateTo: bounds.to,
    }))
  }

  const [pnlSourceMode, setPnlSourceMode] = useState<PnlSourceMode>('consolidated')
  const [pnlTaxRate, setPnlTaxRate] = useState<number>(30)
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  const handleResetFilters = () => {
    setFilters({
      searchQuery: '',
      datePreset: 'all',
      dateFrom: '',
      dateTo: '',
      locationId: 'all',
      departmentId: 'all',
      statusFilter: 'Todos',
      currencyFilter: 'Todas',
      compareYoY: false,
    })
  }

  const hasActiveFilters = Boolean(
    filters.searchQuery.trim() ||
      filters.datePreset !== 'all' ||
      filters.dateFrom ||
      filters.dateTo ||
      filters.locationId !== 'all' ||
      filters.departmentId !== 'all' ||
      filters.statusFilter !== 'Todos' ||
      filters.currencyFilter !== 'Todas' ||
      filters.compareYoY
  )

  // Relational lookup indexes connecting warehouses -> locations, employees -> branch/dept, and POs -> requisition dept
  const lookups = useMemo(() => {
    const warehouseToLocation = new Map<string, string>()
    const warehouseNameToLocation = new Map<string, string>()
    warehouses.forEach((wh) => {
      if (wh.locationId) {
        warehouseToLocation.set(wh.id, wh.locationId)
        warehouseNameToLocation.set(wh.name.toLowerCase(), wh.locationId)
      }
    })

    const deptNameToId = new Map<string, string>()
    departments.forEach((d) => {
      deptNameToId.set(d.name.toLowerCase(), d.id)
    })

    const empById = new Map<string, EmployeeRecord>()
    const empByCode = new Map<string, EmployeeRecord>()
    const empByName = new Map<string, EmployeeRecord>()
    employees.forEach((emp) => {
      empById.set(emp.id, emp)
      empByCode.set(emp.employeeCode.toLowerCase(), emp)
      empByName.set(emp.fullName.toLowerCase(), emp)
    })

    const poToMeta = new Map<
      string,
      { locationId?: string; departmentId?: string; departmentName?: string }
    >()
    const reqByPoFolio = new Map<string, PurchaseRequisition>()
    requisitions.forEach((req) => {
      if (req.linkedPoFolio) {
        reqByPoFolio.set(req.linkedPoFolio, req)
      }
    })

    purchaseOrders.forEach((po) => {
      const locId =
        warehouseToLocation.get(po.warehouseId) ||
        warehouseNameToLocation.get(po.warehouseName.toLowerCase())
      const linkedReq = reqByPoFolio.get(po.folio)
      const deptName = linkedReq?.department || 'Operaciones y Logística'
      const deptId = deptNameToId.get(deptName.toLowerCase())
      poToMeta.set(po.folio, {
        locationId: locId,
        departmentId: deptId,
        departmentName: deptName,
      })
    })

    return {
      warehouseToLocation,
      warehouseNameToLocation,
      deptNameToId,
      empById,
      empByCode,
      empByName,
      poToMeta,
    }
  }, [warehouses, departments, employees, requisitions, purchaseOrders])

  const matchLocationText = (text?: string): string | undefined => {
    if (!text) return undefined
    const lower = text.toLowerCase()
    for (const loc of locations) {
      if (
        lower.includes(loc.city.toLowerCase()) ||
        lower.includes(loc.state.toLowerCase()) ||
        lower.includes(loc.name.toLowerCase()) ||
        lower.includes(loc.code.toLowerCase())
      ) {
        return loc.id
      }
    }
    return undefined
  }

  const matchesScope = (opts: {
    locationId?: string
    departmentName?: string
    departmentId?: string
  }): boolean => {
    if (filters.locationId !== 'all') {
      if (!opts.locationId || opts.locationId !== filters.locationId) return false
    }
    if (filters.departmentId !== 'all') {
      const resolvedDeptId =
        opts.departmentId ||
        (opts.departmentName
          ? lookups.deptNameToId.get(opts.departmentName.toLowerCase())
          : undefined)
      if (!resolvedDeptId || resolvedDeptId !== filters.departmentId) return false
    }
    return true
  }

  // Scoped base datasets across all ERP modules (filtered by Date Range + Branch + Department)
  const scoped = useMemo(() => {
    const scopedEmployees = employees.filter((emp) =>
      matchesScope({
        locationId: emp.locationId,
        departmentId: emp.departmentId,
        departmentName: emp.departmentName,
      })
    )

    const scopedPayrollRuns = payrollRuns
      .filter((run) => isDateWithinRange(run.paymentDate, filters.dateFrom, filters.dateTo))
      .map((run) => {
        if (filters.locationId === 'all' && filters.departmentId === 'all') {
          return run
        }
        const scopedReceipts = run.receipts.filter((rec) => {
          const emp = lookups.empById.get(rec.employeeId)
          return matchesScope({
            locationId: emp?.locationId,
            departmentId: emp?.departmentId,
            departmentName: rec.departmentName,
          })
        })
        if (scopedReceipts.length === 0) return null
        const totalGross = scopedReceipts.reduce((s, r) => s + r.baseGross + r.bonuses, 0)
        const totalDeductions = scopedReceipts.reduce(
          (s, r) => s + r.isrDeduction + r.imssDeduction + r.otherDeductions,
          0
        )
        const totalNet = scopedReceipts.reduce((s, r) => s + r.netPay, 0)
        return {
          ...run,
          employeesCount: scopedReceipts.length,
          totalGross,
          totalDeductions,
          totalNet,
          receipts: scopedReceipts,
        }
      })
      .filter((r): r is PayrollRunRecord => r !== null)

    const scopedRequisitions = requisitions.filter((req) => {
      if (!isDateWithinRange(req.date, filters.dateFrom, filters.dateTo)) return false
      const locId =
        lookups.warehouseToLocation.get(req.warehouseId) ||
        lookups.warehouseNameToLocation.get(req.warehouseName.toLowerCase())
      return matchesScope({ locationId: locId, departmentName: req.department })
    })

    const scopedPurchaseOrders = purchaseOrders.filter((po) => {
      if (!isDateWithinRange(po.date, filters.dateFrom, filters.dateTo)) return false
      const meta = lookups.poToMeta.get(po.folio)
      return matchesScope({
        locationId: meta?.locationId,
        departmentId: meta?.departmentId,
        departmentName: meta?.departmentName,
      })
    })

    const scopedInventory = inventory.filter((it) => {
      const locId =
        lookups.warehouseToLocation.get(it.warehouseId) ||
        lookups.warehouseNameToLocation.get(it.warehouseName.toLowerCase())
      // Inventory items belong to Operations & Logistics department operationally
      return matchesScope({
        locationId: locId,
        departmentName: 'Operaciones y Logística',
      })
    })

    const scopedMovements = movements.filter((mov) => {
      if (!isDateWithinRange(mov.date, filters.dateFrom, filters.dateTo)) return false
      const srcLoc = mov.sourceWarehouse
        ? lookups.warehouseNameToLocation.get(mov.sourceWarehouse.toLowerCase())
        : undefined
      const tgtLoc = mov.targetWarehouse
        ? lookups.warehouseNameToLocation.get(mov.targetWarehouse.toLowerCase())
        : undefined
      const emp = lookups.empByName.get(mov.user.toLowerCase())
      const locId = srcLoc || tgtLoc || emp?.locationId
      return matchesScope({
        locationId: locId,
        departmentName: emp?.departmentName || 'Operaciones y Logística',
        departmentId: emp?.departmentId,
      })
    })

    const scopedPayables = payables.filter((bill) => {
      if (!isDateWithinRange(bill.issueDate, filters.dateFrom, filters.dateTo)) return false
      const meta = bill.purchaseOrderFolio
        ? lookups.poToMeta.get(bill.purchaseOrderFolio)
        : undefined
      return matchesScope({
        locationId: meta?.locationId || 'loc_1',
        departmentId: meta?.departmentId,
        departmentName: meta?.departmentName || 'Finanzas y Tesorería',
      })
    })

    const scopedExpenses = expenses.filter((exp) => {
      if (!isDateWithinRange(exp.date, filters.dateFrom, filters.dateTo)) return false
      const emp = lookups.empByName.get(exp.user.toLowerCase())
      const inferredDept = emp?.departmentName || inferDepartmentFromCategory(exp.category)
      return matchesScope({
        locationId: emp?.locationId || 'loc_1',
        departmentId: emp?.departmentId,
        departmentName: inferredDept,
      })
    })

    const scopedTransactions = transactions.filter((txn) => {
      if (!isDateWithinRange(txn.date, filters.dateFrom, filters.dateTo)) return false
      const deptName =
        txn.type === 'Cobro de cliente'
          ? 'Ventas y Comercial'
          : txn.type === 'Pago a proveedor'
            ? 'Finanzas y Tesorería'
            : inferDepartmentFromCategory(txn.reference)
      const locId = matchLocationText(txn.reference) || 'loc_1'
      return matchesScope({ locationId: locId, departmentName: deptName })
    })

    const scopedQuotes = quotes.filter((qt) => {
      if (!isDateWithinRange(qt.date, filters.dateFrom, filters.dateTo)) return false
      const locId = matchLocationText(qt.notes) || 'loc_1'
      return matchesScope({ locationId: locId, departmentName: 'Ventas y Comercial' })
    })

    const scopedOrders = orders.filter((ord) => {
      if (!isDateWithinRange(ord.date, filters.dateFrom, filters.dateTo)) return false
      const locId = matchLocationText(ord.shippingAddress) || 'loc_1'
      return matchesScope({ locationId: locId, departmentName: 'Ventas y Comercial' })
    })

    const orderToLocation = new Map<string, string>()
    orders.forEach((ord) => {
      orderToLocation.set(ord.folio, matchLocationText(ord.shippingAddress) || 'loc_1')
    })

    const scopedReceivables = receivables.filter((rec) => {
      if (!isDateWithinRange(rec.issueDate, filters.dateFrom, filters.dateTo)) return false
      const locId = (rec.orderFolio && orderToLocation.get(rec.orderFolio)) || 'loc_1'
      return matchesScope({ locationId: locId, departmentName: 'Ventas y Comercial' })
    })

    const payableFolioToMeta = new Map<
      string,
      { locationId?: string; departmentId?: string; departmentName?: string }
    >()
    payables.forEach((b) => {
      const poMeta = b.purchaseOrderFolio ? lookups.poToMeta.get(b.purchaseOrderFolio) : undefined
      payableFolioToMeta.set(b.folio, {
        locationId: poMeta?.locationId || 'loc_1',
        departmentId: poMeta?.departmentId,
        departmentName: poMeta?.departmentName || 'Finanzas y Tesorería',
      })
    })

    const scopedEbpBatches = ebpBatches
      .filter((b) => isDateWithinRange(b.executionDate, filters.dateFrom, filters.dateTo))
      .map((b) => {
        if (filters.locationId === 'all' && filters.departmentId === 'all') {
          return b
        }
        const scopedLines = b.lines.filter((l) => {
          if (b.batchType === 'Nómina') {
            const emp =
              lookups.empByCode.get(l.beneficiaryCode.toLowerCase()) ||
              lookups.empByName.get(l.beneficiaryName.toLowerCase())
            return matchesScope({
              locationId: emp?.locationId,
              departmentId: emp?.departmentId,
              departmentName: emp?.departmentName,
            })
          }
          if (l.billAllocations && l.billAllocations.length > 0) {
            return l.billAllocations.some((alloc) => {
              const meta = payableFolioToMeta.get(alloc.billFolio)
              return matchesScope({
                locationId: meta?.locationId || 'loc_1',
                departmentId: meta?.departmentId,
                departmentName: meta?.departmentName || 'Finanzas y Tesorería',
              })
            })
          }
          return matchesScope({
            locationId: 'loc_1',
            departmentName: 'Finanzas y Tesorería',
          })
        })
        if (scopedLines.length === 0) return null
        return {
          ...b,
          lines: scopedLines,
          totalAmount: scopedLines.reduce((s, l) => s + l.amount, 0),
          transactionsCount: scopedLines.length,
        }
      })
      .filter((b): b is ElectronicPaymentBatch => b !== null)

    return {
      scopedEmployees,
      scopedPayrollRuns,
      scopedRequisitions,
      scopedPurchaseOrders,
      scopedInventory,
      scopedMovements,
      scopedPayables,
      scopedExpenses,
      scopedTransactions,
      scopedQuotes,
      scopedOrders,
      scopedReceivables,
      scopedEbpBatches,
    }
  }, [
    employees,
    payrollRuns,
    requisitions,
    purchaseOrders,
    inventory,
    movements,
    payables,
    expenses,
    transactions,
    quotes,
    orders,
    receivables,
    ebpBatches,
    filters.dateFrom,
    filters.dateTo,
    filters.locationId,
    filters.departmentId,
    lookups,
    locations,
  ])

  // Core cross-module financial & operational aggregations on scoped datasets
  const metrics = useMemo(() => {
    const totalLiquidity = bankAccounts.reduce((s, b) => s + b.balance, 0)
    const totalBilledAR = scoped.scopedReceivables.reduce((s, r) => s + r.total, 0)
    const openAR = scoped.scopedReceivables.reduce((s, r) => s + r.balance, 0)
    const collectedAR = scoped.scopedReceivables.reduce((s, r) => s + r.paidAmount, 0)
    const arCollectionRate = totalBilledAR > 0 ? (collectedAR / totalBilledAR) * 100 : 0

    const totalVendorBills = scoped.scopedPayables.reduce((s, b) => s + b.total, 0)
    const openAP = scoped.scopedPayables.reduce((s, b) => s + b.balance, 0)
    const paidAP = scoped.scopedPayables.reduce((s, b) => s + b.paidAmount, 0)

    const totalExpenses = scoped.scopedExpenses.reduce((s, e) => s + e.total, 0)
    const ebpAppliedTotal = scoped.scopedEbpBatches
      .filter((b) => b.status === 'Aplicado en banco')
      .reduce((s, b) => s + b.totalAmount, 0)
    const ebpPendingTotal = scoped.scopedEbpBatches
      .filter((b) => b.status !== 'Aplicado en banco' && b.status !== 'Rechazado')
      .reduce((s, b) => s + b.totalAmount, 0)

    const inventoryValue = scoped.scopedInventory.reduce((s, it) => s + it.stock * it.cost, 0)
    const totalStockUnits = scoped.scopedInventory.reduce((s, it) => s + it.stock, 0)
    const lowStockCount = scoped.scopedInventory.filter((it) => it.stock <= it.minStock).length

    const activeEmployees = scoped.scopedEmployees.filter((e) => e.status === 'Activo')
    const monthlyPayrollNet = scoped.scopedPayrollRuns.reduce((s, r) => s + r.totalNet, 0)

    const quotesValue = scoped.scopedQuotes.reduce((s, qt) => s + qt.total, 0)
    const ordersValue = scoped.scopedOrders.reduce((s, ord) => s + ord.total, 0)

    return {
      totalLiquidity,
      totalBilledAR,
      openAR,
      collectedAR,
      arCollectionRate,
      totalVendorBills,
      openAP,
      paidAP,
      totalExpenses,
      ebpAppliedTotal,
      ebpPendingTotal,
      inventoryValue,
      totalStockUnits,
      lowStockCount,
      activeEmployeesCount: activeEmployees.length,
      monthlyPayrollNet,
      quotesValue,
      ordersValue,
    }
  }, [bankAccounts, scoped])

  // Secondary text/status/currency filters for each tab table
  const filteredTransactionsAndExpenses = useMemo(() => {
    const rows = [
      ...scoped.scopedTransactions.map((t) => ({
        id: t.id,
        folio: t.folio,
        date: t.date,
        category: t.type,
        entity: t.entityName,
        reference: t.reference,
        account: t.account,
        amount: t.amount,
        direction: t.type === 'Cobro de cliente' ? 'Ingreso' : 'Egreso',
        status: 'Aplicado',
        currency: 'MXN' as const,
      })),
      ...scoped.scopedExpenses.map((e) => ({
        id: `exp_${e.id}`,
        folio: e.folio,
        date: e.date,
        category: e.category,
        entity: e.beneficiary,
        reference: e.description,
        account: e.paymentMethod,
        amount: e.total,
        direction: 'Egreso',
        status: 'Pagado',
        currency: 'MXN' as const,
      })),
    ]
    return rows.filter((r) => {
      const matchQ =
        !q ||
        `${r.folio} ${r.category} ${r.entity} ${r.reference} ${r.account}`.toLowerCase().includes(q)
      const matchCur = filters.currencyFilter === 'Todas' || r.currency === filters.currencyFilter
      const matchStatus =
        filters.statusFilter === 'Todos' ||
        (filters.statusFilter === 'Liquidado' && (r.status === 'Aplicado' || r.status === 'Pagado')) ||
        (filters.statusFilter === 'Pendiente' && r.status !== 'Aplicado' && r.status !== 'Pagado')
      return matchQ && matchCur && matchStatus
    })
  }, [scoped.scopedTransactions, scoped.scopedExpenses, q, filters.currencyFilter, filters.statusFilter])

  const filteredPayables = useMemo(() => {
    return scoped.scopedPayables.filter((b) => {
      const matchQ =
        !q ||
        `${b.folio} ${b.supplierCompany} ${b.purchaseOrderFolio || ''} ${b.paymentMethod || ''}`
          .toLowerCase()
          .includes(q)
      const matchCur = filters.currencyFilter === 'Todas' || b.currency === filters.currencyFilter
      const matchStatus =
        filters.statusFilter === 'Todos' ||
        (filters.statusFilter === 'Pendiente' && b.balance > 0) ||
        (filters.statusFilter === 'Liquidado' && b.balance === 0) ||
        (filters.statusFilter === 'Alerta' && b.status === 'Vencida')
      return matchQ && matchCur && matchStatus
    })
  }, [scoped.scopedPayables, q, filters.currencyFilter, filters.statusFilter])

  const filteredEbpLines = useMemo(() => {
    const rows: Array<{
      batchFolio: string
      batchStatus: ElectronicPaymentBatch['status']
      aggregationLabel: string
      executionDate: string
      currency: string
      originBank: string
      beneficiaryName: string
      selectedAlias: string
      bankName: string
      clabe: string
      paymentReason: string
      folios: string
      amount: number
    }> = []
    scoped.scopedEbpBatches.forEach((b) => {
      b.lines.forEach((l) => {
        const folios =
          l.billAllocations && l.billAllocations.length > 0
            ? l.billAllocations.map((a) => `${a.billFolio} (${money(a.amountToPay, a.currency)})`).join(', ')
            : l.beneficiaryCode
        rows.push({
          batchFolio: b.folio,
          batchStatus: b.status,
          aggregationLabel:
            b.batchType === 'Nómina'
              ? 'Nómina'
              : b.aggregationMode === 'consolidated'
                ? 'Consolidado'
                : 'Individual',
          executionDate: b.executionDate,
          currency: b.currency,
          originBank: b.bankAccountName,
          beneficiaryName: l.beneficiaryName,
          selectedAlias: l.selectedBankAlias || l.bankName,
          bankName: l.bankName,
          clabe: l.clabe,
          paymentReason: l.paymentReason || l.concept,
          folios,
          amount: l.amount,
        })
      })
    })
    return rows.filter((r) => {
      const matchQ =
        !q ||
        `${r.batchFolio} ${r.beneficiaryName} ${r.selectedAlias} ${r.clabe} ${r.paymentReason} ${r.folios}`
          .toLowerCase()
          .includes(q)
      const matchCur = filters.currencyFilter === 'Todas' || r.currency === filters.currencyFilter
      const matchStatus =
        filters.statusFilter === 'Todos' ||
        (filters.statusFilter === 'Pendiente' && r.batchStatus !== 'Aplicado en banco' && r.batchStatus !== 'Rechazado') ||
        (filters.statusFilter === 'Liquidado' && r.batchStatus === 'Aplicado en banco') ||
        (filters.statusFilter === 'Alerta' && r.batchStatus === 'Rechazado')
      return matchQ && matchCur && matchStatus
    })
  }, [scoped.scopedEbpBatches, q, filters.currencyFilter, filters.statusFilter])

  const filteredReceivables = useMemo(() => {
    return scoped.scopedReceivables.filter((r) => {
      const matchQ =
        !q ||
        `${r.folio} ${r.clientCompany} ${r.orderFolio || ''}`.toLowerCase().includes(q)
      const matchCur = filters.currencyFilter === 'Todas' || r.currency === filters.currencyFilter
      const matchStatus =
        filters.statusFilter === 'Todos' ||
        (filters.statusFilter === 'Pendiente' && r.balance > 0) ||
        (filters.statusFilter === 'Liquidado' && r.balance === 0) ||
        (filters.statusFilter === 'Alerta' && r.status === 'Vencida')
      return matchQ && matchCur && matchStatus
    })
  }, [scoped.scopedReceivables, q, filters.currencyFilter, filters.statusFilter])

  const filteredInventory = useMemo(() => {
    return scoped.scopedInventory.filter((it) => {
      const matchQ =
        !q ||
        `${it.sku} ${it.name} ${it.locationBin} ${it.warehouseName}`.toLowerCase().includes(q)
      const isLow = it.stock <= it.minStock
      const matchStatus =
        filters.statusFilter === 'Todos' ||
        (filters.statusFilter === 'Alerta' && isLow) ||
        (filters.statusFilter === 'Liquidado' && !isLow) ||
        (filters.statusFilter === 'Pendiente' && isLow)
      return matchQ && matchStatus
    })
  }, [scoped.scopedInventory, q, filters.statusFilter])

  const filteredPayrollRuns = useMemo(() => {
    return scoped.scopedPayrollRuns.filter((run) => {
      const matchQ =
        !q || `${run.folio} ${run.periodLabel} ${run.status}`.toLowerCase().includes(q)
      const matchStatus =
        filters.statusFilter === 'Todos' ||
        (filters.statusFilter === 'Liquidado' && run.status === 'Pagada') ||
        (filters.statusFilter === 'Pendiente' && run.status !== 'Pagada')
      return matchQ && matchStatus
    })
  }, [scoped.scopedPayrollRuns, q, filters.statusFilter])

  const supplierExposure = useMemo(() => {
    const supMap = new Map(suppliers.map((s) => [s.company.toLowerCase(), s]))
    const byVendor = new Map<
      string,
      { company: string; openBalance: number; paidTotal: number; billsCount: number; bankAccountsCount: number }
    >()
    scoped.scopedPayables.forEach((b) => {
      const key = b.supplierCompany.toLowerCase()
      const existing = byVendor.get(key)
      const sup = supMap.get(key)
      const accountsCount = sup
        ? normalizeSupplierBankAccounts({
            company: sup.company,
            currency: sup.currency || 'MXN',
            bankName: sup.bankName,
            clabe: sup.clabe,
            accountNumber: sup.accountNumber,
            defaultReference: sup.defaultReference,
            bankPackValues: sup.bankPackValues,
            bankAccounts: sup.bankAccounts,
          }).filter((a) => a.active !== false).length
        : 0
      if (existing) {
        existing.openBalance += b.balance
        existing.paidTotal += b.paidAmount
        existing.billsCount += 1
      } else {
        byVendor.set(key, {
          company: b.supplierCompany,
          openBalance: b.balance,
          paidTotal: b.paidAmount,
          billsCount: 1,
          bankAccountsCount: accountsCount,
        })
      }
    })
    return Array.from(byVendor.values()).sort((a, b) => b.openBalance - a.openBalance)
  }, [scoped.scopedPayables, suppliers])

  const expenseCategoriesBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    scoped.scopedExpenses.forEach((e) => {
      map.set(e.category, (map.get(e.category) || 0) + e.total)
    })
    const total = Array.from(map.values()).reduce((s, v) => s + v, 0) || 1
    return Array.from(map.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        pct: (amount / total) * 100,
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [scoped.scopedExpenses])

  const departmentHeadcount = useMemo(() => {
    const map = new Map<string, { name: string; activeCount: number; monthlySalary: number }>()
    activeDepartments.forEach((d) => {
      map.set(d.name, { name: d.name, activeCount: 0, monthlySalary: 0 })
    })
    scoped.scopedEmployees.forEach((emp) => {
      if (emp.status !== 'Activo') return
      const key = emp.departmentName || 'General'
      const prev = map.get(key) || { name: key, activeCount: 0, monthlySalary: 0 }
      prev.activeCount += 1
      prev.monthlySalary += emp.baseSalaryMonthly || 0
      map.set(key, prev)
    })
    return Array.from(map.values())
      .filter((d) => d.activeCount > 0)
      .sort((a, b) => b.monthlySalary - a.monthlySalary)
  }, [activeDepartments, scoped.scopedEmployees])

  // Cross-branch organizational summary (respects date range and active department filter)
  const branchSummary = useMemo(() => {
    const isOpsDeptSelected =
      filters.departmentId === 'all' ||
      selectedDepartment?.name.toLowerCase().includes('operaciones')

    return activeLocations.map((loc) => {
      const whIds = new Set(warehouses.filter((w) => w.locationId === loc.id).map((w) => w.id))
      const whNames = new Set(warehouses.filter((w) => w.locationId === loc.id).map((w) => w.name.toLowerCase()))
      const branchInvVal = isOpsDeptSelected
        ? inventory
            .filter((it) => whIds.has(it.warehouseId) || whNames.has(it.warehouseName.toLowerCase()))
            .reduce((s, it) => s + it.stock * it.cost, 0)
        : 0
      const branchPoVal = purchaseOrders
        .filter((po) => isDateWithinRange(po.date, filters.dateFrom, filters.dateTo))
        .filter((po) => whIds.has(po.warehouseId) || whNames.has(po.warehouseName.toLowerCase()))
        .filter((po) => {
          if (filters.departmentId === 'all') return true
          const meta = lookups.poToMeta.get(po.folio)
          return (
            meta?.departmentId === filters.departmentId ||
            (selectedDepartment &&
              meta?.departmentName?.toLowerCase() === selectedDepartment.name.toLowerCase())
          )
        })
        .reduce((s, po) => s + po.total, 0)
      const branchEmps = employees.filter(
        (e) =>
          e.status === 'Activo' &&
          e.locationId === loc.id &&
          (filters.departmentId === 'all' || e.departmentId === filters.departmentId)
      )
      return {
        id: loc.id,
        code: loc.code,
        name: loc.name,
        type: loc.type,
        employeesCount: branchEmps.length,
        monthlyPayrollBase: branchEmps.reduce((s, e) => s + e.baseSalaryMonthly, 0),
        inventoryValue: branchInvVal,
        purchaseOrdersTotal: branchPoVal,
      }
    })
  }, [
    activeLocations,
    warehouses,
    inventory,
    purchaseOrders,
    employees,
    filters.dateFrom,
    filters.dateTo,
    filters.departmentId,
    selectedDepartment,
    lookups,
  ])

  // Cross-department summary (respects date range and active branch filter)
  const departmentSummary = useMemo(() => {
    return activeDepartments.map((dept) => {
      const deptEmps = employees.filter(
        (e) =>
          e.status === 'Activo' &&
          (e.departmentId === dept.id ||
            e.departmentName.toLowerCase() === dept.name.toLowerCase()) &&
          (filters.locationId === 'all' || e.locationId === filters.locationId)
      )
      const deptExpenseTotal = expenses
        .filter((exp) => isDateWithinRange(exp.date, filters.dateFrom, filters.dateTo))
        .filter((exp) => {
          const emp = lookups.empByName.get(exp.user.toLowerCase())
          const resolvedDept = emp?.departmentName || inferDepartmentFromCategory(exp.category)
          const resolvedLoc = emp?.locationId || 'loc_1'
          return (
            resolvedDept.toLowerCase() === dept.name.toLowerCase() &&
            (filters.locationId === 'all' || resolvedLoc === filters.locationId)
          )
        })
        .reduce((s, exp) => s + exp.total, 0)
      const deptPoTotal = purchaseOrders
        .filter((po) => isDateWithinRange(po.date, filters.dateFrom, filters.dateTo))
        .filter((po) => {
          const meta = lookups.poToMeta.get(po.folio)
          const matchDept =
            meta?.departmentId === dept.id ||
            meta?.departmentName?.toLowerCase() === dept.name.toLowerCase()
          const matchLoc =
            filters.locationId === 'all' || meta?.locationId === filters.locationId
          return matchDept && matchLoc
        })
        .reduce((s, po) => s + po.total, 0)

      return {
        id: dept.id,
        code: dept.code,
        name: dept.name,
        leader: dept.leader,
        costCenter: dept.costCenter || '—',
        employeesCount: deptEmps.length,
        monthlyPayrollBase: deptEmps.reduce((s, e) => s + e.baseSalaryMonthly, 0),
        expensesTotal: deptExpenseTotal,
        purchaseOrdersTotal: deptPoTotal,
      }
    })
  }, [
    activeDepartments,
    employees,
    expenses,
    purchaseOrders,
    filters.dateFrom,
    filters.dateTo,
    filters.locationId,
    lookups,
  ])

  // Recharts Dataset 1: Department comparison (Expenses, Purchase Orders & Scoped Payroll Net)
  const departmentChartData = useMemo(() => {
    const payrollByDept = new Map<string, number>()
    scoped.scopedPayrollRuns.forEach((run) => {
      run.receipts.forEach((rec) => {
        const key = (rec.departmentName || 'General').toLowerCase()
        payrollByDept.set(key, (payrollByDept.get(key) || 0) + rec.netPay)
      })
    })

    const targetDepartments =
      filters.departmentId === 'all'
        ? departmentSummary
        : departmentSummary.filter((d) => d.id === filters.departmentId)

    return targetDepartments.map((dep) => {
      const nominaPeriodo = Math.round(payrollByDept.get(dep.name.toLowerCase()) || 0)
      const gastos = Math.round(dep.expensesTotal)
      const compras = Math.round(dep.purchaseOrdersTotal)
      const costoTotal = gastos + compras + nominaPeriodo
      return {
        id: dep.id,
        shortName:
          dep.name.length > 17 ? `${dep.name.slice(0, 15)}…` : dep.name,
        fullName: dep.name,
        code: dep.code,
        gastos,
        compras,
        nomina: nominaPeriodo,
        nominaBase: Math.round(dep.monthlyPayrollBase),
        costoTotal,
      }
    })
  }, [departmentSummary, scoped.scopedPayrollRuns, filters.departmentId])

  // Recharts Dataset 2: Chronological period trend (Ingresos, Egresos & Net Performance)
  const periodChartConfig = useMemo(() => {
    let granularity: 'day' | 'month' = 'month'
    if (filters.datePreset === 'this_month' || filters.datePreset === 'last_30') {
      granularity = 'day'
    } else if (filters.dateFrom && filters.dateTo) {
      const start = new Date(`${filters.dateFrom}T00:00:00`).getTime()
      const end = new Date(`${filters.dateTo}T00:00:00`).getTime()
      const diffDays = (end - start) / (1000 * 60 * 60 * 24)
      if (!Number.isNaN(diffDays) && diffDays >= 0 && diffDays <= 45) {
        granularity = 'day'
      }
    }

    const buckets = new Map<
      string,
      {
        key: string
        ingresos: number
        gastosOp: number
        comprasOc: number
        nominaYPagos: number
        egresos: number
      }
    >()

    const ensureBucket = (rawDate?: string) => {
      const iso = parseErpDateToIso(rawDate)
      if (!iso) return null
      const key = granularity === 'day' ? iso : iso.slice(0, 7)
      if (!buckets.has(key)) {
        buckets.set(key, {
          key,
          ingresos: 0,
          gastosOp: 0,
          comprasOc: 0,
          nominaYPagos: 0,
          egresos: 0,
        })
      }
      return buckets.get(key)!
    }

    scoped.scopedReceivables.forEach((rec) => {
      if (rec.paidAmount <= 0) return
      if (filters.currencyFilter !== 'Todas' && rec.currency !== filters.currencyFilter) return
      const b = ensureBucket(rec.issueDate)
      if (b) b.ingresos += Math.round(rec.paidAmount)
    })

    scoped.scopedExpenses.forEach((exp) => {
      if (filters.currencyFilter !== 'Todas' && filters.currencyFilter !== 'MXN') return
      const b = ensureBucket(exp.date)
      if (b) {
        b.gastosOp += Math.round(exp.total)
        b.egresos += Math.round(exp.total)
      }
    })

    scoped.scopedPurchaseOrders.forEach((po) => {
      if (filters.currencyFilter !== 'Todas' && po.currency !== filters.currencyFilter) return
      const b = ensureBucket(po.date)
      if (b) {
        b.comprasOc += Math.round(po.total)
        b.egresos += Math.round(po.total)
      }
    })

    scoped.scopedPayrollRuns.forEach((run) => {
      if (filters.currencyFilter !== 'Todas' && filters.currencyFilter !== 'MXN') return
      const b = ensureBucket(run.paymentDate)
      if (b) {
        b.nominaYPagos += Math.round(run.totalNet)
        b.egresos += Math.round(run.totalNet)
      }
    })

    const data = Array.from(buckets.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((item) => ({
        ...item,
        label: formatPeriodBucketLabel(item.key, granularity),
        flujoNeto: item.ingresos - item.egresos,
      }))

    return { granularity, data }
  }, [
    filters.datePreset,
    filters.dateFrom,
    filters.dateTo,
    filters.currencyFilter,
    scoped.scopedReceivables,
    scoped.scopedExpenses,
    scoped.scopedPurchaseOrders,
    scoped.scopedPayrollRuns,
  ])

  // Recharts Dataset 3: Year-over-Year (YoY) comparison respecting active filters (branch, dept, currency, date window)
  const yoyComparisonData = useMemo(() => {
    const refYearStr = (filters.dateTo || filters.dateFrom || '').slice(0, 4)
    const currentYear = /^\d{4}$/.test(refYearStr) ? Number(refYearStr) : new Date().getFullYear()
    const priorYear = currentYear - 1
    const prevFrom = shiftIsoYear(filters.dateFrom, -1)
    const prevTo = shiftIsoYear(filters.dateTo, -1)

    const orderToLocation = new Map<string, string>()
    orders.forEach((ord) => {
      orderToLocation.set(ord.folio, matchLocationText(ord.shippingAddress) || 'loc_1')
    })

    type MonthAcc = {
      monthIdx: number
      currIngresos: number
      prevIngresos: number
      currGastos: number
      prevGastos: number
      currCompras: number
      prevCompras: number
      currNomina: number
      prevNomina: number
    }

    const monthsMap = new Map<number, MonthAcc>()
    const ensureMonth = (monthIdx: number) => {
      if (!monthsMap.has(monthIdx)) {
        monthsMap.set(monthIdx, {
          monthIdx,
          currIngresos: 0,
          prevIngresos: 0,
          currGastos: 0,
          prevGastos: 0,
          currCompras: 0,
          prevCompras: 0,
          currNomina: 0,
          prevNomina: 0,
        })
      }
      return monthsMap.get(monthIdx)!
    }

    let hasLivePriorData = false

    const applyRecord = (
      rawDate: string | undefined,
      amount: number,
      field: 'Ingresos' | 'Gastos' | 'Compras' | 'Nomina'
    ) => {
      if (amount <= 0) return
      const iso = parseErpDateToIso(rawDate)
      if (!iso) return
      const yr = Number(iso.slice(0, 4))
      const mIdx = Number(iso.slice(5, 7)) - 1
      if (Number.isNaN(yr) || Number.isNaN(mIdx) || mIdx < 0 || mIdx > 11) return

      if (yr === currentYear && isDateWithinRange(iso, filters.dateFrom, filters.dateTo)) {
        const bucket = ensureMonth(mIdx)
        if (field === 'Ingresos') bucket.currIngresos += Math.round(amount)
        if (field === 'Gastos') bucket.currGastos += Math.round(amount)
        if (field === 'Compras') bucket.currCompras += Math.round(amount)
        if (field === 'Nomina') bucket.currNomina += Math.round(amount)
      } else if (yr === priorYear && isDateWithinRange(iso, prevFrom, prevTo)) {
        hasLivePriorData = true
        const bucket = ensureMonth(mIdx)
        if (field === 'Ingresos') bucket.prevIngresos += Math.round(amount)
        if (field === 'Gastos') bucket.prevGastos += Math.round(amount)
        if (field === 'Compras') bucket.prevCompras += Math.round(amount)
        if (field === 'Nomina') bucket.prevNomina += Math.round(amount)
      }
    }

    // Current-year scoped datasets
    scoped.scopedReceivables.forEach((rec) => {
      if (filters.currencyFilter !== 'Todas' && rec.currency !== filters.currencyFilter) return
      applyRecord(rec.issueDate, rec.paidAmount, 'Ingresos')
    })
    scoped.scopedExpenses.forEach((exp) => {
      if (filters.currencyFilter !== 'Todas' && filters.currencyFilter !== 'MXN') return
      applyRecord(exp.date, exp.total, 'Gastos')
    })
    scoped.scopedPurchaseOrders.forEach((po) => {
      if (filters.currencyFilter !== 'Todas' && po.currency !== filters.currencyFilter) return
      applyRecord(po.date, po.total, 'Compras')
    })
    scoped.scopedPayrollRuns.forEach((run) => {
      if (filters.currencyFilter !== 'Todas' && filters.currencyFilter !== 'MXN') return
      applyRecord(run.paymentDate, run.totalNet, 'Nomina')
    })

    // Scan live prior-year records across raw datasets with same Branch / Dept / Currency scope
    receivables.forEach((rec) => {
      const iso = parseErpDateToIso(rec.issueDate)
      if (!iso || Number(iso.slice(0, 4)) !== priorYear) return
      if (filters.currencyFilter !== 'Todas' && rec.currency !== filters.currencyFilter) return
      const locId = (rec.orderFolio && orderToLocation.get(rec.orderFolio)) || 'loc_1'
      if (!matchesScope({ locationId: locId, departmentName: 'Ventas y Comercial' })) return
      applyRecord(iso, rec.paidAmount, 'Ingresos')
    })
    expenses.forEach((exp) => {
      const iso = parseErpDateToIso(exp.date)
      if (!iso || Number(iso.slice(0, 4)) !== priorYear) return
      if (filters.currencyFilter !== 'Todas' && filters.currencyFilter !== 'MXN') return
      const emp = lookups.empByName.get(exp.user.toLowerCase())
      const inferredDept = emp?.departmentName || inferDepartmentFromCategory(exp.category)
      if (
        !matchesScope({
          locationId: emp?.locationId || 'loc_1',
          departmentId: emp?.departmentId,
          departmentName: inferredDept,
        })
      ) {
        return
      }
      applyRecord(iso, exp.total, 'Gastos')
    })
    purchaseOrders.forEach((po) => {
      const iso = parseErpDateToIso(po.date)
      if (!iso || Number(iso.slice(0, 4)) !== priorYear) return
      if (filters.currencyFilter !== 'Todas' && po.currency !== filters.currencyFilter) return
      const meta = lookups.poToMeta.get(po.folio)
      if (
        !matchesScope({
          locationId: meta?.locationId,
          departmentId: meta?.departmentId,
          departmentName: meta?.departmentName,
        })
      ) {
        return
      }
      applyRecord(iso, po.total, 'Compras')
    })
    payrollRuns.forEach((run) => {
      const iso = parseErpDateToIso(run.paymentDate)
      if (!iso || Number(iso.slice(0, 4)) !== priorYear) return
      if (filters.currencyFilter !== 'Todas' && filters.currencyFilter !== 'MXN') return
      if (filters.locationId === 'all' && filters.departmentId === 'all') {
        applyRecord(iso, run.totalNet, 'Nomina')
      } else {
        const net = run.receipts
          .filter((rec) => {
            const emp = lookups.empById.get(rec.employeeId)
            return matchesScope({
              locationId: emp?.locationId,
              departmentId: emp?.departmentId,
              departmentName: rec.departmentName,
            })
          })
          .reduce((s, r) => s + r.netPay, 0)
        applyRecord(iso, net, 'Nomina')
      }
    })

    // Deterministic historical prior-year baseline scaled to active scope when no prior-year rows exist yet
    const revFactors = [0.84, 0.87, 0.85, 0.89, 0.86, 0.91, 0.88, 0.86, 0.89, 0.85, 0.91, 0.9]
    const expFactors = [0.92, 0.95, 0.91, 0.96, 0.93, 0.89, 0.94, 0.97, 0.91, 0.88, 0.93, 0.95]
    const poFactors = [0.83, 0.88, 0.85, 0.91, 0.86, 0.94, 0.89, 0.82, 0.92, 0.87, 0.95, 0.9]
    const payFactors = [0.88, 0.89, 0.88, 0.9, 0.9, 0.91, 0.9, 0.89, 0.92, 0.91, 0.93, 0.92]

    const months = Array.from(monthsMap.values())
      .sort((a, b) => a.monthIdx - b.monthIdx)
      .map((m) => {
        const prevIngresos = hasLivePriorData
          ? m.prevIngresos
          : Math.round(m.currIngresos * revFactors[m.monthIdx])
        const prevGastos = hasLivePriorData
          ? m.prevGastos
          : Math.round(m.currGastos * expFactors[m.monthIdx])
        const prevCompras = hasLivePriorData
          ? m.prevCompras
          : Math.round(m.currCompras * poFactors[m.monthIdx])
        const prevNomina = hasLivePriorData
          ? m.prevNomina
          : Math.round(m.currNomina * payFactors[m.monthIdx])

        const currEgresos = m.currGastos + m.currCompras + m.currNomina
        const prevEgresos = prevGastos + prevCompras + prevNomina
        const currNeto = m.currIngresos - currEgresos
        const prevNeto = prevIngresos - prevEgresos

        return {
          monthIdx: m.monthIdx,
          monthLabel: MONTH_SHORT_ES[m.monthIdx] || `M${m.monthIdx + 1}`,
          currIngresos: m.currIngresos,
          prevIngresos,
          currGastos: m.currGastos,
          prevGastos,
          currCompras: m.currCompras,
          prevCompras,
          currNomina: m.currNomina,
          prevNomina,
          currEgresos,
          prevEgresos,
          currNeto,
          prevNeto,
          ingresosDeltaPct: calcYoYPct(m.currIngresos, prevIngresos),
          egresosDeltaPct: calcYoYPct(currEgresos, prevEgresos),
          netoDeltaPct: calcYoYPct(currNeto, prevNeto),
        }
      })

    const currIngresosTotal = months.reduce((s, r) => s + r.currIngresos, 0)
    const prevIngresosTotal = months.reduce((s, r) => s + r.prevIngresos, 0)
    const currGastosTotal = months.reduce((s, r) => s + r.currGastos, 0)
    const prevGastosTotal = months.reduce((s, r) => s + r.prevGastos, 0)
    const currComprasNominaTotal = months.reduce((s, r) => s + r.currCompras + r.currNomina, 0)
    const prevComprasNominaTotal = months.reduce((s, r) => s + r.prevCompras + r.prevNomina, 0)
    const currNetoTotal = months.reduce((s, r) => s + r.currNeto, 0)
    const prevNetoTotal = months.reduce((s, r) => s + r.prevNeto, 0)

    return {
      currentYear,
      priorYear,
      hasLivePriorData,
      months,
      totals: {
        ingresos: {
          curr: currIngresosTotal,
          prev: prevIngresosTotal,
          deltaPct: calcYoYPct(currIngresosTotal, prevIngresosTotal),
        },
        gastos: {
          curr: currGastosTotal,
          prev: prevGastosTotal,
          deltaPct: calcYoYPct(currGastosTotal, prevGastosTotal),
        },
        comprasNomina: {
          curr: currComprasNominaTotal,
          prev: prevComprasNominaTotal,
          deltaPct: calcYoYPct(currComprasNominaTotal, prevComprasNominaTotal),
        },
        neto: {
          curr: currNetoTotal,
          prev: prevNetoTotal,
          deltaPct: calcYoYPct(currNetoTotal, prevNetoTotal),
        },
      },
    }
  }, [
    filters.dateFrom,
    filters.dateTo,
    filters.locationId,
    filters.departmentId,
    filters.currencyFilter,
    scoped.scopedReceivables,
    scoped.scopedExpenses,
    scoped.scopedPurchaseOrders,
    scoped.scopedPayrollRuns,
    receivables,
    expenses,
    purchaseOrders,
    payrollRuns,
    orders,
    lookups,
    locations,
  ])

  const hasScopedDateOrOrgFilter = Boolean(
    filters.dateFrom ||
      filters.dateTo ||
      filters.locationId !== 'all' ||
      filters.departmentId !== 'all'
  )

  const incomeStatementData = useMemo(
    () =>
      computeIncomeStatementData({
        scopedExpenses: scoped.scopedExpenses,
        allExpenses: expenses,
        chartAccounts,
        scopedReceivables: scoped.scopedReceivables,
        allReceivables: receivables,
        scopedOrders: scoped.scopedOrders,
        allOrders: orders,
        inventory: scoped.scopedInventory,
        scopedPayrollRuns: scoped.scopedPayrollRuns,
        allPayrollRuns: payrollRuns,
        sourceMode: pnlSourceMode,
        taxRate: pnlTaxRate,
        currencyFilter: filters.currencyFilter,
        hasScopedDateOrOrgFilter,
        searchQuery: filters.searchQuery,
      }),
    [
      scoped.scopedExpenses,
      expenses,
      chartAccounts,
      scoped.scopedReceivables,
      receivables,
      scoped.scopedOrders,
      orders,
      scoped.scopedInventory,
      scoped.scopedPayrollRuns,
      payrollRuns,
      pnlSourceMode,
      pnlTaxRate,
      filters.currencyFilter,
      hasScopedDateOrOrgFilter,
      filters.searchQuery,
    ]
  )

  const activeScopeSummary = useMemo(() => {
    const parts: string[] = []
    if (filters.dateFrom || filters.dateTo) {
      parts.push(`Fechas: ${filters.dateFrom || 'Inicio'} → ${filters.dateTo || 'Hoy'}`)
    } else {
      parts.push('Fechas: Todo el histórico')
    }
    parts.push(
      selectedLocation ? `Sucursal: ${selectedLocation.code} · ${selectedLocation.name}` : 'Sucursal: Todas'
    )
    parts.push(
      selectedDepartment
        ? `Departamento: ${selectedDepartment.code} · ${selectedDepartment.name}`
        : 'Departamento: Todos'
    )
    if (filters.compareYoY) {
      parts.push(`Comparativa YoY: ${yoyComparisonData.currentYear} vs ${yoyComparisonData.priorYear}`)
    }
    return parts.join('  |  ')
  }, [
    filters.dateFrom,
    filters.dateTo,
    filters.compareYoY,
    selectedLocation,
    selectedDepartment,
    yoyComparisonData.currentYear,
    yoyComparisonData.priorYear,
  ])

  const handleExportActiveCsv = () => {
    const dateStamp = new Date().toISOString().split('T')[0]
    let filename = `reporte_aes_nexus_${dateStamp}.csv`
    let headers: string[] = []
    let rows: Array<Array<string | number>> = []

    if (activeTab === 'Resumen ejecutivo') {
      filename = `reporte_ejecutivo_${dateStamp}.csv`
      if (filters.compareYoY) {
        headers = [
          'Módulo / Concepto',
          'Registros',
          `Importe ${yoyComparisonData.currentYear}`,
          `Comparativo ${yoyComparisonData.priorYear}`,
          'Variación YoY',
          'Estado',
          'Alcance',
        ]
        rows = [
          [
            'Ingresos Cobrados (CxC)',
            scoped.scopedReceivables.length,
            yoyComparisonData.totals.ingresos.curr,
            yoyComparisonData.totals.ingresos.prev,
            formatYoYPct(yoyComparisonData.totals.ingresos.deltaPct),
            `${metrics.arCollectionRate.toFixed(1)}% cobrado`,
            activeScopeSummary,
          ],
          [
            'Gastos Operativos',
            scoped.scopedExpenses.length,
            yoyComparisonData.totals.gastos.curr,
            yoyComparisonData.totals.gastos.prev,
            formatYoYPct(yoyComparisonData.totals.gastos.deltaPct),
            `${scoped.scopedExpenses.length} gasto(s)`,
            activeScopeSummary,
          ],
          [
            'Compras (OC) y Nómina Dispersada',
            scoped.scopedPurchaseOrders.length + scoped.scopedPayrollRuns.length,
            yoyComparisonData.totals.comprasNomina.curr,
            yoyComparisonData.totals.comprasNomina.prev,
            formatYoYPct(yoyComparisonData.totals.comprasNomina.deltaPct),
            `${scoped.scopedPayrollRuns.length} corrida(s)`,
            activeScopeSummary,
          ],
          [
            'Flujo Neto Operativo',
            yoyComparisonData.months.length,
            yoyComparisonData.totals.neto.curr,
            yoyComparisonData.totals.neto.prev,
            formatYoYPct(yoyComparisonData.totals.neto.deltaPct),
            'Balance anual',
            activeScopeSummary,
          ],
          ...yoyComparisonData.months.map((m) => [
            `Mes ${m.monthLabel}`,
            1,
            m.currNeto,
            m.prevNeto,
            formatYoYPct(m.netoDeltaPct),
            `Ingresos ${money(m.currIngresos)} / Egresos ${money(m.currEgresos)}`,
            activeScopeSummary,
          ]),
        ]
      } else {
        headers = ['Módulo', 'Registros', 'Importe Total', 'Saldo Pendiente / Neto', 'Estado', 'Alcance']
        rows = [
          ['Ventas y Facturación', scoped.scopedReceivables.length, metrics.totalBilledAR, metrics.openAR, `${metrics.arCollectionRate.toFixed(1)}% cobrado`, activeScopeSummary],
          ['Compras y Vendor Bills', scoped.scopedPayables.length, metrics.totalVendorBills, metrics.openAP, `${scoped.scopedPayables.filter((b) => b.balance > 0).length} abierta(s)`, activeScopeSummary],
          ['Tesorería y Bancos', bankAccounts.length, metrics.totalLiquidity, metrics.totalExpenses, 'Cuentas activas', activeScopeSummary],
          ['Pagos Bancarios (EBP)', scoped.scopedEbpBatches.length, metrics.ebpAppliedTotal + metrics.ebpPendingTotal, metrics.ebpPendingTotal, `${scoped.scopedEbpBatches.filter((b) => b.status === 'Aplicado en banco').length} aplicado(s)`, activeScopeSummary],
          ['Inventario', scoped.scopedInventory.length, metrics.inventoryValue, metrics.lowStockCount, `${metrics.lowStockCount} alerta(s) de stock`, activeScopeSummary],
          ['Nómina y RRHH', scoped.scopedEmployees.length, metrics.monthlyPayrollNet, metrics.activeEmployeesCount, `${scoped.scopedPayrollRuns.length} corrida(s)`, activeScopeSummary],
        ]
      }
    } else if (activeTab === 'Estado de Resultados') {
      filename = `estado_de_resultados_${dateStamp}.csv`
      headers = filters.compareYoY
        ? [
            'Signo',
            'Concepto Contable',
            'Origen en ERP',
            'Importe',
            '% sobre Ingresos',
            'Periodo Anterior',
            'Variación YoY',
            'Alcance',
          ]
        : ['Signo', 'Concepto Contable', 'Origen en ERP', 'Importe', '% sobre Ingresos', 'Alcance']
      rows = incomeStatementData.lines.map((row) =>
        filters.compareYoY
          ? [
              row.sign,
              row.label,
              row.sourceLabel,
              row.amount,
              `${row.pctOfRevenue.toFixed(1)}%`,
              row.priorAmount,
              row.yoyPct === null
                ? '—'
                : `${row.yoyPct >= 0 ? '+' : ''}${row.yoyPct.toFixed(1)}%`,
              activeScopeSummary,
            ]
          : [
              row.sign,
              row.label,
              row.sourceLabel,
              row.amount,
              `${row.pctOfRevenue.toFixed(1)}%`,
              activeScopeSummary,
            ]
      )
    } else if (activeTab === 'Finanzas y Tesorería') {
      filename = `reporte_finanzas_tesoreria_${dateStamp}.csv`
      headers = ['Folio', 'Fecha', 'Tipo / Categoría', 'Entidad', 'Referencia', 'Cuenta / Método', 'Dirección', 'Importe', 'Estado']
      rows = filteredTransactionsAndExpenses.map((r) => [
        r.folio,
        r.date,
        r.category,
        r.entity,
        r.reference,
        r.account,
        r.direction,
        r.amount,
        r.status,
      ])
    } else if (activeTab === 'CxP y Pagos EBP') {
      filename = `reporte_cxp_ebp_${dateStamp}.csv`
      headers = ['Lote EBP', 'Modo', 'Fecha', 'Proveedor', 'Alias Bancario', 'Banco', 'CLABE', 'Motivo del pago', 'Facturas Cubiertas', 'Importe', 'Moneda', 'Estado']
      rows = filteredEbpLines.map((r) => [
        r.batchFolio,
        r.aggregationLabel,
        r.executionDate,
        r.beneficiaryName,
        r.selectedAlias,
        r.bankName,
        r.clabe,
        r.paymentReason,
        r.folios,
        r.amount,
        r.currency,
        r.batchStatus,
      ])
    } else if (activeTab === 'Ventas y CxC') {
      filename = `reporte_ventas_cxc_${dateStamp}.csv`
      headers = ['Folio', 'Cliente', 'Pedido', 'Emisión', 'Vencimiento', 'Total', 'Cobrado', 'Saldo Pendiente', 'Moneda', 'Estado']
      rows = filteredReceivables.map((r) => [
        r.folio,
        r.clientCompany,
        r.orderFolio || '',
        r.issueDate,
        r.dueDate,
        r.total,
        r.paidAmount,
        r.balance,
        r.currency,
        r.status,
      ])
    } else if (activeTab === 'Compras e Inventario') {
      filename = `reporte_inventario_compras_${dateStamp}.csv`
      headers = ['SKU', 'Producto', 'Ubicación / Bin', 'Almacén', 'Existencia', 'Mínimo', 'Costo Unitario', 'Valor Total']
      rows = filteredInventory.map((it) => [
        it.sku,
        it.name,
        it.locationBin,
        it.warehouseName,
        it.stock,
        it.minStock,
        it.cost,
        it.stock * it.cost,
      ])
    } else {
      filename = `reporte_nomina_rrhh_${dateStamp}.csv`
      headers = ['Folio Nómina', 'Periodo', 'Fecha Pago', 'Colaboradores', 'Total Percepciones', 'Deducciones', 'Neto Dispersado', 'Estado']
      rows = filteredPayrollRuns.map((run) => [
        run.folio,
        run.periodLabel,
        run.paymentDate,
        run.employeesCount,
        run.totalGross,
        run.totalDeductions,
        run.totalNet,
        run.status,
      ])
    }

    downloadCsv(filename, headers, rows)
    onExportAudit?.(`${activeTab} (${activeScopeSummary})`, rows.length)
    toast.success(`Archivo ${filename} descargado (${rows.length} registro(s)).`, 'Reporte exportado en CSV')
  }

  const handlePrintReport = () => {
    toast.info('Preparando vista de impresión del reporte...', 'Imprimir / PDF')
    window.print()
  }

  const handleExportIncomeStatementPdf = async () => {
    if (isExportingPdf) return
    setIsExportingPdf(true)
    try {
      const { filename, rowCount } = await exportIncomeStatementPdf({
        data: incomeStatementData,
        compareYoY: filters.compareYoY,
        activeScopeSummary,
      })
      onExportAudit?.(`Estado de Resultados PDF (${activeScopeSummary})`, rowCount)
      toast.success(
        `Archivo ${filename} descargado con logotipo corporativo y fecha de emisión.`,
        'Estado de Resultados exportado en PDF'
      )
    } catch {
      toast.error(
        'No se pudo generar el archivo PDF. Intenta de nuevo o usa la opción Imprimir.',
        'Error al exportar PDF'
      )
    } finally {
      setIsExportingPdf(false)
    }
  }

  const maxCashBar = Math.max(
    1,
    metrics.collectedAR,
    metrics.openAR,
    metrics.openAP,
    metrics.ebpAppliedTotal,
    metrics.totalExpenses
  )

  const renderYoYDeltaClass = (pct: number | null, invertPolarity = false) => {
    if (pct === null || Math.abs(pct) < 0.05) return 'is-neutral'
    const favorable = invertPolarity ? pct < 0 : pct > 0
    return favorable ? 'is-positive' : 'is-negative'
  }

  const renderYoYComparisonSection = () => {
    const { currentYear, priorYear, hasLivePriorData, months, totals } = yoyComparisonData

    return (
      <section className="overview-panel-card reports-yoy-card" aria-label="Comparativa interanual YoY">
        <div className="reports-charts-hub-head">
          <div>
            <h2>
              Comparativa Año contra Año (YoY · {currentYear} vs {priorYear})
            </h2>
            <p>
              Variación mensual y acumulada sincronizada con sucursal, departamento y moneda seleccionados
              {' · '}
              <span className="reports-yoy-source">
                {hasLivePriorData
                  ? `Datos reales registrados de ${priorYear}`
                  : `Base comparativa referencial ${priorYear} ajustada al alcance activo`}
              </span>
            </p>
          </div>
          <div className="reports-chart-mode-toggle" role="tablist" aria-label="Tipo de gráfica YoY">
            <button
              type="button"
              role="tab"
              aria-selected={yoyChartType === 'stacked'}
              className={`wh-tab ${yoyChartType === 'stacked' ? 'active' : ''}`}
              onClick={() => setYoyChartType('stacked')}
            >
              Barras apiladas
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={yoyChartType === 'line'}
              className={`wh-tab ${yoyChartType === 'line' ? 'active' : ''}`}
              onClick={() => setYoyChartType('line')}
            >
              Líneas comparativas
            </button>
          </div>
        </div>

        {/* 4 YoY Variance Summary Cards */}
        <div className="reports-yoy-summary-grid">
          <div className="reports-yoy-stat">
            <span className="reports-yoy-stat-label">INGRESOS COBRADOS (CXC)</span>
            <strong className="mono reports-yoy-stat-curr">{money(totals.ingresos.curr)}</strong>
            <div className="reports-yoy-stat-meta">
              <span className="mono">{priorYear}: {money(totals.ingresos.prev)}</span>
              <span className={`reports-yoy-delta mono ${renderYoYDeltaClass(totals.ingresos.deltaPct)}`}>
                {formatYoYPct(totals.ingresos.deltaPct)}
              </span>
            </div>
          </div>

          <div className="reports-yoy-stat">
            <span className="reports-yoy-stat-label">GASTOS OPERATIVOS</span>
            <strong className="mono reports-yoy-stat-curr">{money(totals.gastos.curr)}</strong>
            <div className="reports-yoy-stat-meta">
              <span className="mono">{priorYear}: {money(totals.gastos.prev)}</span>
              <span className={`reports-yoy-delta mono ${renderYoYDeltaClass(totals.gastos.deltaPct, true)}`}>
                {formatYoYPct(totals.gastos.deltaPct)}
              </span>
            </div>
          </div>

          <div className="reports-yoy-stat">
            <span className="reports-yoy-stat-label">COMPRAS (OC) Y NÓMINA</span>
            <strong className="mono reports-yoy-stat-curr">{money(totals.comprasNomina.curr)}</strong>
            <div className="reports-yoy-stat-meta">
              <span className="mono">{priorYear}: {money(totals.comprasNomina.prev)}</span>
              <span className={`reports-yoy-delta mono ${renderYoYDeltaClass(totals.comprasNomina.deltaPct, true)}`}>
                {formatYoYPct(totals.comprasNomina.deltaPct)}
              </span>
            </div>
          </div>

          <div className="reports-yoy-stat">
            <span className="reports-yoy-stat-label">RESULTADO NETO OPERATIVO</span>
            <strong className="mono reports-yoy-stat-curr">{money(totals.neto.curr)}</strong>
            <div className="reports-yoy-stat-meta">
              <span className="mono">{priorYear}: {money(totals.neto.prev)}</span>
              <span className={`reports-yoy-delta mono ${renderYoYDeltaClass(totals.neto.deltaPct)}`}>
                {formatYoYPct(totals.neto.deltaPct)}
              </span>
            </div>
          </div>
        </div>

        {months.length === 0 ? (
          <p className="reports-empty-text">
            No existen movimientos dentro de los filtros actuales para trazar la serie YoY.
          </p>
        ) : (
          <div className="reports-chart-card">
            <div className="reports-chart-card-head">
              <div>
                <h3>
                  {yoyChartType === 'stacked'
                    ? `Estructura de Egresos Apilados por Año (${currentYear} vs ${priorYear})`
                    : `Evolución Comparativa de Ingresos, Egresos y Neto (${currentYear} vs ${priorYear})`}
                </h3>
                <small>
                  {yoyChartType === 'stacked'
                    ? `Cada mes compara dos columnas apiladas: izquierda ${currentYear} (colores sólidos) vs derecha ${priorYear} (tonos tenues)`
                    : `Líneas sólidas para ${currentYear} y líneas punteadas para ${priorYear}`}
                </small>
              </div>
              <GitCompareArrows size={15} />
            </div>

            <div className="reports-recharts-box">
              <ResponsiveContainer width="100%" height={290}>
                {yoyChartType === 'stacked' ? (
                  <BarChart
                    data={months}
                    margin={{ top: 10, right: 14, left: 0, bottom: 6 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="rgba(128, 142, 133, 0.22)"
                    />
                    <XAxis
                      dataKey="monthLabel"
                      tick={{ fontSize: 10.5, fill: '#77857d' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#77857d' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={shortMoneyAxis}
                      width={56}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(69, 106, 97, 0.08)' }}
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null
                        const row = payload[0].payload as (typeof months)[number]
                        return (
                          <div className="reports-chart-tooltip">
                            <strong>
                              {row.monthLabel} · {currentYear} vs {priorYear}
                            </strong>
                            <div className="reports-tooltip-rows">
                              <div>
                                <span>Gastos op. ({currentYear} / {priorYear})</span>
                                <strong className="mono">
                                  {money(row.currGastos)} / {money(row.prevGastos)}
                                </strong>
                              </div>
                              <div>
                                <span>Compras OC ({currentYear} / {priorYear})</span>
                                <strong className="mono">
                                  {money(row.currCompras)} / {money(row.prevCompras)}
                                </strong>
                              </div>
                              <div>
                                <span>Nómina ({currentYear} / {priorYear})</span>
                                <strong className="mono">
                                  {money(row.currNomina)} / {money(row.prevNomina)}
                                </strong>
                              </div>
                              <div className="reports-tooltip-total">
                                <span>Total egresos ({formatYoYPct(row.egresosDeltaPct)})</span>
                                <strong className="mono">
                                  {money(row.currEgresos)} vs {money(row.prevEgresos)}
                                </strong>
                              </div>
                            </div>
                          </div>
                        )
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10.5px', paddingTop: '6px' }} />
                    <Bar
                      dataKey="currGastos"
                      name={`Gastos ${currentYear}`}
                      stackId={`y_${currentYear}`}
                      fill={seriesColors.gastos}
                      maxBarSize={26}
                    />
                    <Bar
                      dataKey="currCompras"
                      name={`Compras ${currentYear}`}
                      stackId={`y_${currentYear}`}
                      fill={seriesColors.compras}
                      maxBarSize={26}
                    />
                    <Bar
                      dataKey="currNomina"
                      name={`Nómina ${currentYear}`}
                      stackId={`y_${currentYear}`}
                      fill={seriesColors.ingresos}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={26}
                    />
                    <Bar
                      dataKey="prevGastos"
                      name={`Gastos ${priorYear}`}
                      stackId={`y_${priorYear}`}
                      fill={lightenHex(seriesColors.gastos, 0.45)}
                      maxBarSize={26}
                    />
                    <Bar
                      dataKey="prevCompras"
                      name={`Compras ${priorYear}`}
                      stackId={`y_${priorYear}`}
                      fill={lightenHex(seriesColors.compras, 0.45)}
                      maxBarSize={26}
                    />
                    <Bar
                      dataKey="prevNomina"
                      name={`Nómina ${priorYear}`}
                      stackId={`y_${priorYear}`}
                      fill={lightenHex(seriesColors.ingresos, 0.45)}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={26}
                    />
                  </BarChart>
                ) : (
                  <LineChart
                    data={months}
                    margin={{ top: 10, right: 14, left: 0, bottom: 6 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="rgba(128, 142, 133, 0.22)"
                    />
                    <XAxis
                      dataKey="monthLabel"
                      tick={{ fontSize: 10.5, fill: '#77857d' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#77857d' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={shortMoneyAxis}
                      width={56}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null
                        const row = payload[0].payload as (typeof months)[number]
                        return (
                          <div className="reports-chart-tooltip">
                            <strong>
                              {row.monthLabel} · Comparativa {currentYear} vs {priorYear}
                            </strong>
                            <div className="reports-tooltip-rows">
                              <div>
                                <span>Ingresos ({formatYoYPct(row.ingresosDeltaPct)})</span>
                                <strong className="mono">
                                  {money(row.currIngresos)} vs {money(row.prevIngresos)}
                                </strong>
                              </div>
                              <div>
                                <span>Egresos ({formatYoYPct(row.egresosDeltaPct)})</span>
                                <strong className="mono">
                                  {money(row.currEgresos)} vs {money(row.prevEgresos)}
                                </strong>
                              </div>
                              <div className="reports-tooltip-total">
                                <span>Neto ({formatYoYPct(row.netoDeltaPct)})</span>
                                <strong className="mono">
                                  {money(row.currNeto)} vs {money(row.prevNeto)}
                                </strong>
                              </div>
                            </div>
                          </div>
                        )
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10.5px', paddingTop: '6px' }} />
                    <Line
                      type="monotone"
                      dataKey="currIngresos"
                      name={`Ingresos ${currentYear}`}
                      stroke={seriesColors.ingresos}
                      strokeWidth={2.4}
                      dot={{ r: 3.5, fill: seriesColors.ingresos }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="prevIngresos"
                      name={`Ingresos ${priorYear}`}
                      stroke={lightenHex(seriesColors.ingresos, 0.42)}
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={{ r: 3, fill: lightenHex(seriesColors.ingresos, 0.42) }}
                    />
                    <Line
                      type="monotone"
                      dataKey="currEgresos"
                      name={`Egresos ${currentYear}`}
                      stroke={seriesColors.gastos}
                      strokeWidth={2.4}
                      dot={{ r: 3.5, fill: seriesColors.gastos }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="prevEgresos"
                      name={`Egresos ${priorYear}`}
                      stroke={lightenHex(seriesColors.gastos, 0.42)}
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={{ r: 3, fill: lightenHex(seriesColors.gastos, 0.42) }}
                    />
                    <Line
                      type="monotone"
                      dataKey="currNeto"
                      name={`Neto ${currentYear}`}
                      stroke={seriesColors.flujoNeto}
                      strokeWidth={2.2}
                      dot={{ r: 3.5, fill: seriesColors.flujoNeto }}
                    />
                    <Line
                      type="monotone"
                      dataKey="prevNeto"
                      name={`Neto ${priorYear}`}
                      stroke={lightenHex(seriesColors.flujoNeto, 0.42)}
                      strokeWidth={1.8}
                      strokeDasharray="4 4"
                      dot={{ r: 2.5, fill: lightenHex(seriesColors.flujoNeto, 0.42) }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </section>
    )
  }

  return (
    <section className="crm-page reports-page" aria-labelledby="reports-page-title">
      <div className="finance-header">
        <div>
          <span className="eyebrow">INTELIGENCIA OPERATIVA Y FINANCIERA · ERP CONSOLIDADO</span>
          <h1 id="reports-page-title">Reportes y Analítica</h1>
          <p className="module-subtitle">
            Filtra y consulta indicadores cruzados en tiempo real por rango de fechas, sucursal y departamento, con exportación CSV e impresión.
          </p>
        </div>
        <div className="finance-header-actions">
          <button type="button" className="button button-secondary" onClick={handlePrintReport}>
            <Printer size={14} /> {activeTab === 'Estado de Resultados' ? 'Imprimir' : 'Imprimir / PDF'}
          </button>
          <button
            type="button"
            className={`button ${activeTab === 'Estado de Resultados' ? 'button-secondary' : 'button-primary'}`}
            onClick={handleExportActiveCsv}
          >
            <Download size={14} /> Exportar CSV
          </button>
          {activeTab === 'Estado de Resultados' && (
            <button
              type="button"
              className="button button-primary"
              disabled={isExportingPdf}
              onClick={handleExportIncomeStatementPdf}
            >
              <FileDown size={14} /> {isExportingPdf ? 'Generando PDF...' : 'Exportar PDF'}
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="warehouse-tab-selector" role="tablist" aria-label="Categorías de reportes">
        {allowedTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={`wh-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => onSelectTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Dimensional Base Filter Panel: Date Range + Branches + Departments + Quick Filters */}
      <section className="reports-filter-panel" aria-label="Filtros multidimensionales de reportes">
        <div className="reports-filter-panel-head">
          <div className="reports-filter-title">
            <Filter size={14} />
            <strong>Filtros del Reporte</strong>
          </div>
          <div className="reports-scope-meta mono" title={activeScopeSummary}>
            {activeScopeSummary}
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              className="reports-reset-btn"
              onClick={handleResetFilters}
            >
              <RotateCcw size={12} /> Restablecer filtros
            </button>
          )}
        </div>

        <div className="reports-filter-grid">
          {/* Date preset & custom date range */}
          <div className="reports-filter-field reports-filter-field-wide">
            <label htmlFor="report-date-preset">
              <CalendarRange size={12} /> Periodo / Rango de fechas
            </label>
            <div className="reports-date-combo">
              <select
                id="report-date-preset"
                value={filters.datePreset}
                onChange={(e) => handleDatePresetChange(e.target.value as DateRangePreset)}
              >
                <option value="all">Todo el histórico</option>
                <option value="this_month">Mes actual</option>
                <option value="last_30">Últimos 30 días</option>
                <option value="this_quarter">Trimestre actual</option>
                <option value="ytd">Año en curso</option>
                <option value="custom">Rango personalizado</option>
              </select>
              <input
                type="date"
                aria-label="Fecha inicial"
                value={filters.dateFrom}
                max={filters.dateTo || undefined}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    datePreset: 'custom',
                    dateFrom: e.target.value,
                  }))
                }
              />
              <span className="reports-date-sep">—</span>
              <input
                type="date"
                aria-label="Fecha final"
                value={filters.dateTo}
                min={filters.dateFrom || undefined}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    datePreset: 'custom',
                    dateTo: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          {/* Branch (Sucursal) selector */}
          <div className="reports-filter-field">
            <label htmlFor="report-location-filter">
              <MapPin size={12} /> Sucursal / Ubicación
            </label>
            <select
              id="report-location-filter"
              value={filters.locationId}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, locationId: e.target.value }))
              }
            >
              <option value="all">Todas las sucursales ({activeLocations.length})</option>
              {activeLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.code} · {loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Department selector */}
          <div className="reports-filter-field">
            <label htmlFor="report-department-filter">
              <Building2 size={12} /> Departamento
            </label>
            <select
              id="report-department-filter"
              value={filters.departmentId}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, departmentId: e.target.value }))
              }
            >
              <option value="all">Todos los departamentos ({activeDepartments.length})</option>
              {activeDepartments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.code} · {dept.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Secondary free-text search + status + currency */}
        <div className="reports-toolbar-sub">
          <label className="reports-search-wrap">
            <Search size={14} />
            <input
              type="search"
              value={filters.searchQuery}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))
              }
              placeholder="Buscar por folio, proveedor, cliente, SKU, alias bancario o motivo del pago..."
              aria-label="Filtrar datos del reporte"
            />
          </label>
          <div className="reports-filter-controls">
            <select
              aria-label="Filtrar por estado"
              value={filters.statusFilter}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  statusFilter: e.target.value as ReportFilterState['statusFilter'],
                }))
              }
            >
              <option value="Todos">Estado: Todos</option>
              <option value="Pendiente">Pendiente / Abierto</option>
              <option value="Liquidado">Liquidado / Aplicado</option>
              <option value="Alerta">Vencido / Alerta</option>
            </select>
            <select
              aria-label="Filtrar por moneda"
              value={filters.currencyFilter}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  currencyFilter: e.target.value as ReportFilterState['currencyFilter'],
                }))
              }
            >
              <option value="Todas">Moneda: Todas</option>
              <option value="MXN">MXN</option>
              <option value="USD">USD</option>
            </select>
            <button
              type="button"
              className={`reports-yoy-toggle ${filters.compareYoY ? 'active' : ''}`}
              aria-pressed={filters.compareYoY}
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  compareYoY: !prev.compareYoY,
                }))
              }
            >
              <GitCompareArrows size={13} />
              Comparar YoY ({yoyComparisonData.currentYear} vs {yoyComparisonData.priorYear})
            </button>
          </div>
        </div>
      </section>

      {/* 1. RESUMEN EJECUTIVO */}
      {activeTab === 'Resumen ejecutivo' && (
        <div className="reports-tab-body">
          <div className="ops-kpi-grid">
            <article className="ops-kpi-card highlight">
              <div className="ops-kpi-top">
                <span>LIQUIDEZ TOTAL EN BANCOS</span>
                <span className="ops-kpi-icon icon-green">
                  <Landmark size={16} />
                </span>
              </div>
              <div className="ops-kpi-val mono">{money(metrics.totalLiquidity)}</div>
              <div className="ops-kpi-foot">
                <span>{bankAccounts.length} cuentas activas</span>
                <span>·</span>
                <small>{chartAccounts.length} cuentas contables</small>
              </div>
            </article>

            <article className="ops-kpi-card">
              <div className="ops-kpi-top">
                <span>FACTURACIÓN Y CARTERA CXC</span>
                <span className="ops-kpi-icon icon-blue">
                  <ReceiptText size={16} />
                </span>
              </div>
              <div className="ops-kpi-val mono">{money(metrics.totalBilledAR)}</div>
              <div className="ops-kpi-foot">
                <span>Cobrado: {metrics.arCollectionRate.toFixed(1)}%</span>
                <span>·</span>
                <small>
                  {filters.compareYoY
                    ? formatYoYPct(yoyComparisonData.totals.ingresos.deltaPct)
                    : `Por cobrar ${money(metrics.openAR)}`}
                </small>
              </div>
            </article>

            <article className="ops-kpi-card">
              <div className="ops-kpi-top">
                <span>CXP PROVEEDORES Y EBP</span>
                <span className="ops-kpi-icon icon-amber">
                  <Wallet size={16} />
                </span>
              </div>
              <div className="ops-kpi-val mono">{money(metrics.openAP)}</div>
              <div className="ops-kpi-foot">
                <span>Saldo abierto</span>
                <span>·</span>
                <small>
                  {filters.compareYoY
                    ? `Gastos ${formatYoYPct(yoyComparisonData.totals.gastos.deltaPct)}`
                    : `EBP aplicado ${money(metrics.ebpAppliedTotal)}`}
                </small>
              </div>
            </article>

            <article className="ops-kpi-card">
              <div className="ops-kpi-top">
                <span>VALORIZACIÓN DE INVENTARIO</span>
                <span className="ops-kpi-icon icon-purple">
                  <Package size={16} />
                </span>
              </div>
              <div className="ops-kpi-val mono">{money(metrics.inventoryValue)}</div>
              <div className="ops-kpi-foot">
                <span>{compactNum(metrics.totalStockUnits)} unidades</span>
                <span>·</span>
                <small>{metrics.lowStockCount} en stock mínimo</small>
              </div>
            </article>
          </div>

          {filters.compareYoY && renderYoYComparisonSection()}

          {/* Interactive Recharts Visual Analytics: Departments & Selected Periods */}
          <section className="overview-panel-card reports-charts-hub" aria-label="Visualización de datos por departamento y periodo">
            <div className="reports-charts-hub-head">
              <div>
                <h2>Análisis Comparativo por Departamento y Periodo</h2>
                <p>
                  Visualización interactiva sincronizada con los filtros de fechas, sucursal y departamento activos.
                </p>
              </div>
              <div className="reports-charts-hub-actions">
                <button
                  type="button"
                  className={`reports-color-trigger ${showColorCustomizer ? 'active' : ''}`}
                  aria-expanded={showColorCustomizer}
                  onClick={() => setShowColorCustomizer((v) => !v)}
                  title="Personalizar colores de las series en las gráficas"
                >
                  <Palette size={13} />
                  <span>Personalizar colores</span>
                  <span className="reports-color-dots" aria-hidden="true">
                    <span style={{ backgroundColor: seriesColors.ingresos }} />
                    <span style={{ backgroundColor: seriesColors.gastos }} />
                    <span style={{ backgroundColor: seriesColors.compras }} />
                    <span style={{ backgroundColor: seriesColors.nomina }} />
                  </span>
                </button>

                <div className="reports-chart-mode-toggle" role="tablist" aria-label="Modo de gráfica departamental">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={chartViewMode === 'expenses'}
                    className={`wh-tab ${chartViewMode === 'expenses' ? 'active' : ''}`}
                    onClick={() => setChartViewMode('expenses')}
                  >
                    Desglose de Gastos
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={chartViewMode === 'performance'}
                    className={`wh-tab ${chartViewMode === 'performance' ? 'active' : ''}`}
                    onClick={() => setChartViewMode('performance')}
                  >
                    Costo Total vs Nómina Base
                  </button>
                </div>
              </div>
            </div>

            {showColorCustomizer && (
              <div className="reports-color-customizer" role="region" aria-label="Selector de colores de series">
                <div className="reports-color-customizer-row">
                  <div className="reports-color-presets">
                    <span className="reports-color-section-label">Paletas rápidas:</span>
                    {CHART_COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className="reports-color-preset-btn"
                        onClick={() => applyColorPalette(preset.colors)}
                      >
                        <span className="reports-color-dots" aria-hidden="true">
                          <span style={{ backgroundColor: preset.colors.ingresos }} />
                          <span style={{ backgroundColor: preset.colors.gastos }} />
                          <span style={{ backgroundColor: preset.colors.compras }} />
                          <span style={{ backgroundColor: preset.colors.nomina }} />
                        </span>
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  {isCustomColorsActive && (
                    <button
                      type="button"
                      className="reports-reset-btn"
                      onClick={() => applyColorPalette(DEFAULT_SERIES_COLORS)}
                    >
                      <RotateCcw size={12} /> Restablecer colores
                    </button>
                  )}
                </div>

                <div className="reports-color-pickers-grid">
                  {(
                    [
                      { key: 'ingresos', label: 'Ingresos / Base salarial' },
                      { key: 'gastos', label: 'Gastos op. / Egresos' },
                      { key: 'compras', label: 'Compras (OC) / Costo total' },
                      { key: 'nomina', label: 'Nómina dispersada' },
                      { key: 'flujoNeto', label: 'Flujo neto (línea)' },
                    ] as Array<{ key: keyof ChartSeriesColors; label: string }>
                  ).map((item) => (
                    <label key={item.key} className="reports-color-picker-item">
                      <input
                        type="color"
                        value={seriesColors[item.key]}
                        onChange={(e) => updateSeriesColor(item.key, e.target.value)}
                        aria-label={`Color para ${item.label}`}
                      />
                      <span className="reports-color-picker-meta">
                        <span className="reports-color-picker-name">{item.label}</span>
                        <span className="reports-color-picker-hex mono">{seriesColors[item.key].toUpperCase()}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="reports-charts-grid">
              {/* Left Chart: Department Comparison */}
              <div className="reports-chart-card">
                <div className="reports-chart-card-head">
                  <div>
                    <h3>
                      {chartViewMode === 'expenses'
                        ? 'Gastos, Compras y Nómina por Departamento'
                        : 'Costo Operativo Total vs Base Salarial'}
                    </h3>
                    <small>Haz clic en una barra para filtrar o restaurar el departamento</small>
                  </div>
                  <Building2 size={15} />
                </div>

                {departmentChartData.length === 0 ? (
                  <p className="reports-empty-text">
                    Sin datos departamentales disponibles para los filtros actuales.
                  </p>
                ) : (
                  <div className="reports-recharts-box">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={departmentChartData}
                        margin={{ top: 10, right: 12, left: 0, bottom: 8 }}
                        onClick={(state) => {
                          const clickedName = state?.activeLabel
                          if (!clickedName) return
                          const matched = departmentChartData.find(
                            (d) => d.shortName === String(clickedName)
                          )
                          if (matched) {
                            setFilters((prev) => ({
                              ...prev,
                              departmentId:
                                prev.departmentId === matched.id ? 'all' : matched.id,
                            }))
                          }
                        }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="rgba(128, 142, 133, 0.22)"
                        />
                        <XAxis
                          dataKey="shortName"
                          tick={{ fontSize: 10, fill: '#77857d' }}
                          axisLine={false}
                          tickLine={false}
                          interval={0}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: '#77857d' }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={shortMoneyAxis}
                          width={54}
                        />
                        <Tooltip
                          cursor={{ fill: 'rgba(69, 106, 97, 0.08)' }}
                          content={({ active, payload }) => {
                            if (!active || !payload || payload.length === 0) return null
                            const row = payload[0].payload as (typeof departmentChartData)[number]
                            return (
                              <div className="reports-chart-tooltip">
                                <strong>
                                  {row.code} · {row.fullName}
                                </strong>
                                <div className="reports-tooltip-rows">
                                  <div>
                                    <span>Gastos operativos</span>
                                    <strong className="mono">{money(row.gastos)}</strong>
                                  </div>
                                  <div>
                                    <span>Compras (OC)</span>
                                    <strong className="mono">{money(row.compras)}</strong>
                                  </div>
                                  <div>
                                    <span>Nómina dispersada</span>
                                    <strong className="mono">{money(row.nomina)}</strong>
                                  </div>
                                  <div className="reports-tooltip-total">
                                    <span>Costo total alcance</span>
                                    <strong className="mono">{money(row.costoTotal)}</strong>
                                  </div>
                                </div>
                              </div>
                            )
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10.5px', paddingTop: '4px' }} />
                        {chartViewMode === 'expenses' ? (
                          <>
                            <Bar
                              dataKey="gastos"
                              name="Gastos op."
                              stackId="dept"
                              fill={seriesColors.gastos}
                              radius={[0, 0, 0, 0]}
                              maxBarSize={36}
                            />
                            <Bar
                              dataKey="compras"
                              name="Compras (OC)"
                              stackId="dept"
                              fill={seriesColors.compras}
                              radius={[0, 0, 0, 0]}
                              maxBarSize={36}
                            />
                            <Bar
                              dataKey="nomina"
                              name="Nómina periodo"
                              stackId="dept"
                              fill={seriesColors.nomina}
                              radius={[4, 4, 0, 0]}
                              maxBarSize={36}
                            />
                          </>
                        ) : (
                          <>
                            <Bar
                              dataKey="costoTotal"
                              name="Costo total periodo"
                              fill={seriesColors.compras}
                              radius={[4, 4, 0, 0]}
                              maxBarSize={30}
                            />
                            <Bar
                              dataKey="nominaBase"
                              name="Base salarial mensual"
                              fill={seriesColors.ingresos}
                              radius={[4, 4, 0, 0]}
                              maxBarSize={30}
                            />
                          </>
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Right Chart: Time Period Performance & Expenses */}
              <div className="reports-chart-card">
                <div className="reports-chart-card-head">
                  <div>
                    <h3>
                      Rendimiento Financiero por Periodo (
                      {periodChartConfig.granularity === 'day' ? 'Vista Diaria' : 'Vista Mensual'})
                    </h3>
                    <small>Ingresos cobrados vs egresos acumulados y balance neto</small>
                  </div>
                  <TrendingUp size={15} />
                </div>

                {periodChartConfig.data.length === 0 ? (
                  <p className="reports-empty-text">
                    Sin movimientos registrados dentro del rango de fechas y filtros seleccionados.
                  </p>
                ) : (
                  <div className="reports-recharts-box">
                    <ResponsiveContainer width="100%" height={260}>
                      <ComposedChart
                        data={periodChartConfig.data}
                        margin={{ top: 10, right: 12, left: 0, bottom: 8 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="rgba(128, 142, 133, 0.22)"
                        />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10, fill: '#77857d' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: '#77857d' }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={shortMoneyAxis}
                          width={54}
                        />
                        <Tooltip
                          cursor={{ fill: 'rgba(69, 106, 97, 0.08)' }}
                          content={({ active, payload }) => {
                            if (!active || !payload || payload.length === 0) return null
                            const row = payload[0].payload as (typeof periodChartConfig.data)[number]
                            return (
                              <div className="reports-chart-tooltip">
                                <strong>Periodo: {row.label}</strong>
                                <div className="reports-tooltip-rows">
                                  <div>
                                    <span>Ingresos cobrados</span>
                                    <strong className="mono">{money(row.ingresos)}</strong>
                                  </div>
                                  <div>
                                    <span>Gastos operativos</span>
                                    <strong className="mono">{money(row.gastosOp)}</strong>
                                  </div>
                                  <div>
                                    <span>Compras (OC)</span>
                                    <strong className="mono">{money(row.comprasOc)}</strong>
                                  </div>
                                  <div>
                                    <span>Nómina dispersada</span>
                                    <strong className="mono">{money(row.nominaYPagos)}</strong>
                                  </div>
                                  <div className="reports-tooltip-total">
                                    <span>Flujo neto</span>
                                    <strong className="mono">{money(row.flujoNeto)}</strong>
                                  </div>
                                </div>
                              </div>
                            )
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10.5px', paddingTop: '4px' }} />
                        <Bar
                          dataKey="ingresos"
                          name="Ingresos (CxC)"
                          fill={seriesColors.ingresos}
                          radius={[4, 4, 0, 0]}
                          maxBarSize={28}
                        />
                        <Bar
                          dataKey="egresos"
                          name="Egresos totales"
                          fill={seriesColors.gastos}
                          radius={[4, 4, 0, 0]}
                          maxBarSize={28}
                        />
                        <Line
                          type="monotone"
                          dataKey="flujoNeto"
                          name="Flujo neto"
                          stroke={seriesColors.flujoNeto}
                          strokeWidth={2.2}
                          dot={{ r: 3.5, fill: seriesColors.flujoNeto }}
                          activeDot={{ r: 5 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="reports-split-grid">
            <section className="overview-panel-card">
              <div className="overview-card-head">
                <h2>Comparativo de Flujos Financieros</h2>
                <div className="overview-card-head-sub">
                  <BarChart3 size={16} />
                  <p>Balance filtrado entre cobranza, compromisos a proveedores, dispersiones EBP y gasto operativo.</p>
                </div>
              </div>

              <div className="reports-chart-rows">
                {[
                  { label: 'Cobros recibidos (CxC)', val: metrics.collectedAR, tone: 'ok' },
                  { label: 'Cartera pendiente de cobro', val: metrics.openAR, tone: 'info' },
                  { label: 'Dispersión bancaria EBP aplicada', val: metrics.ebpAppliedTotal, tone: 'accent' },
                  { label: 'Facturas de proveedor abiertas (CxP)', val: metrics.openAP, tone: 'warn' },
                  { label: 'Gastos operativos acumulados', val: metrics.totalExpenses, tone: 'neutral' },
                ].map((bar) => (
                  <div key={bar.label} className="reports-bar-item">
                    <div className="reports-bar-meta">
                      <span>{bar.label}</span>
                      <strong className="mono">{money(bar.val)}</strong>
                    </div>
                    <div className="reports-bar-track">
                      <span
                        className={`reports-bar-fill tone-${bar.tone}`}
                        style={{ width: `${Math.max(4, Math.round((bar.val / maxCashBar) * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="overview-panel-card">
              <div className="overview-card-head">
                <h2>Pulso Comercial y Operativo</h2>
                <div className="overview-card-head-sub">
                  <Building2 size={16} />
                  <p>Indicadores del periodo, sucursal y departamento seleccionados.</p>
                </div>
              </div>

              <div className="reports-metric-list">
                <div className="reports-metric-row">
                  <span>Clientes activos y prospectos</span>
                  <strong className="mono">{clientsCount}</strong>
                </div>
                <div className="reports-metric-row">
                  <span>Pipeline cotizado ({scoped.scopedQuotes.length} cotizaciones)</span>
                  <strong className="mono">{money(metrics.quotesValue)}</strong>
                </div>
                <div className="reports-metric-row">
                  <span>Pedidos de venta confirmados ({scoped.scopedOrders.length})</span>
                  <strong className="mono">{money(metrics.ordersValue)}</strong>
                </div>
                <div className="reports-metric-row">
                  <span>Órdenes de compra y requisiciones</span>
                  <strong className="mono">
                    {scoped.scopedPurchaseOrders.length} OC · {scoped.scopedRequisitions.length} Req.
                  </strong>
                </div>
                <div className="reports-metric-row">
                  <span>Movimientos de almacén registrados</span>
                  <strong className="mono">{scoped.scopedMovements.length}</strong>
                </div>
                <div className="reports-metric-row">
                  <span>Plantilla activa y nómina del alcance</span>
                  <strong className="mono">
                    {metrics.activeEmployeesCount} colab. · {money(metrics.monthlyPayrollNet)}
                  </strong>
                </div>
              </div>
            </section>
          </div>

          <section className="overview-panel-card">
            <div className="overview-card-head">
              <h2>Comparativo por Sucursal / Ubicación</h2>
              <div className="overview-card-head-sub">
                <MapPin size={16} />
                <p>Haz clic en una sucursal para acotar los reportes directamente a esa sede operativa.</p>
              </div>
            </div>

            <div className="table-wrap ops-table-wrap">
              <table className="data-table ops-data-table">
                <thead>
                  <tr>
                    <th>CÓDIGO</th>
                    <th>SUCURSAL / SEDE</th>
                    <th>TIPO</th>
                    <th style={{ textAlign: 'right' }}>COLABORADORES</th>
                    <th style={{ textAlign: 'right' }}>NÓMINA MENSUAL BASE</th>
                    <th style={{ textAlign: 'right' }}>INVENTARIO EN SEDE</th>
                    <th style={{ textAlign: 'right' }}>COMPRAS (OC)</th>
                    <th style={{ textAlign: 'right' }}>FILTRAR</th>
                  </tr>
                </thead>
                <tbody>
                  {branchSummary.map((br) => {
                    const isSelected = filters.locationId === br.id
                    return (
                      <tr key={br.id}>
                        <td className="mono"><strong>{br.code}</strong></td>
                        <td><strong>{br.name}</strong></td>
                        <td>{br.type}</td>
                        <td style={{ textAlign: 'right' }} className="mono">{br.employeesCount}</td>
                        <td style={{ textAlign: 'right' }} className="mono">{money(br.monthlyPayrollBase)}</td>
                        <td style={{ textAlign: 'right' }} className="mono">{money(br.inventoryValue)}</td>
                        <td style={{ textAlign: 'right' }} className="mono">{money(br.purchaseOrdersTotal)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="button-icon-action"
                            onClick={() =>
                              setFilters((prev) => ({
                                ...prev,
                                locationId: isSelected ? 'all' : br.id,
                              }))
                            }
                          >
                            {isSelected ? 'Quitar filtro' : 'Filtrar sede'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overview-panel-card">
            <div className="overview-card-head">
              <h2>Comparativo por Departamento y Centro de Costos</h2>
              <div className="overview-card-head-sub">
                <Building2 size={16} />
                <p>Desglose dinámico según la sucursal y el rango de fechas activos. Selecciona un área para filtrar.</p>
              </div>
            </div>

            <div className="table-wrap ops-table-wrap">
              <table className="data-table ops-data-table">
                <thead>
                  <tr>
                    <th>CÓDIGO</th>
                    <th>DEPARTAMENTO</th>
                    <th>CENTRO COSTOS</th>
                    <th style={{ textAlign: 'right' }}>COLABORADORES</th>
                    <th style={{ textAlign: 'right' }}>NÓMINA BASE</th>
                    <th style={{ textAlign: 'right' }}>GASTOS</th>
                    <th style={{ textAlign: 'right' }}>COMPRAS (OC)</th>
                    <th style={{ textAlign: 'right' }}>FILTRAR</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentSummary.map((dep) => {
                    const isSelected = filters.departmentId === dep.id
                    return (
                      <tr key={dep.id}>
                        <td className="mono"><strong>{dep.code}</strong></td>
                        <td>
                          <div className="supplier-cell">
                            <strong>{dep.name}</strong>
                            <small>Líder: {dep.leader}</small>
                          </div>
                        </td>
                        <td className="mono">{dep.costCenter}</td>
                        <td style={{ textAlign: 'right' }} className="mono">{dep.employeesCount}</td>
                        <td style={{ textAlign: 'right' }} className="mono">{money(dep.monthlyPayrollBase)}</td>
                        <td style={{ textAlign: 'right' }} className="mono">{money(dep.expensesTotal)}</td>
                        <td style={{ textAlign: 'right' }} className="mono">{money(dep.purchaseOrdersTotal)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="button-icon-action"
                            onClick={() =>
                              setFilters((prev) => ({
                                ...prev,
                                departmentId: isSelected ? 'all' : dep.id,
                              }))
                            }
                          >
                            {isSelected ? 'Quitar filtro' : 'Filtrar depto.'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overview-panel-card">
            <div className="overview-card-head">
              <h2>Estado Consolidado por Módulo del ERP</h2>
              <div className="overview-card-head-sub">
                <FileSpreadsheet size={16} />
                <p>Acceso directo para auditar o gestionar cualquier módulo desde el reporte ejecutivo.</p>
              </div>
            </div>

            <div className="table-wrap ops-table-wrap">
              <table className="data-table ops-data-table">
                <thead>
                  <tr>
                    <th>MÓDULO</th>
                    <th style={{ textAlign: 'right' }}>DOCUMENTOS / REGISTROS</th>
                    <th style={{ textAlign: 'right' }}>VOLUMEN TOTAL</th>
                    <th style={{ textAlign: 'right' }}>PENDIENTE / COMPROMETIDO</th>
                    <th>RESUMEN OPERATIVO</th>
                    <th style={{ textAlign: 'right' }}>NAVEGAR</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Ventas y Facturación</strong></td>
                    <td style={{ textAlign: 'right' }} className="mono">{scoped.scopedReceivables.length}</td>
                    <td style={{ textAlign: 'right' }} className="mono">{money(metrics.totalBilledAR)}</td>
                    <td style={{ textAlign: 'right' }} className="mono">{money(metrics.openAR)}</td>
                    <td>Recuperación del {metrics.arCollectionRate.toFixed(1)}% · {scoped.scopedOrders.length} pedido(s)</td>
                    <td style={{ textAlign: 'right' }}>
                      <button type="button" className="button-icon-action" onClick={() => onNavigateModule('Ventas')}>
                        Ir a Ventas <ArrowRight size={12} />
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Compras y Vendor Bills</strong></td>
                    <td style={{ textAlign: 'right' }} className="mono">{scoped.scopedPayables.length}</td>
                    <td style={{ textAlign: 'right' }} className="mono">{money(metrics.totalVendorBills)}</td>
                    <td style={{ textAlign: 'right' }} className="mono">{money(metrics.openAP)}</td>
                    <td>{scoped.scopedPayables.filter((b) => b.balance > 0).length} factura(s) abiertas · {suppliers.length} proveedores</td>
                    <td style={{ textAlign: 'right' }}>
                      <button type="button" className="button-icon-action" onClick={() => onNavigateModule('Compras')}>
                        Ir a Compras <ArrowRight size={12} />
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Finanzas y Pagos EBP</strong></td>
                    <td style={{ textAlign: 'right' }} className="mono">{scoped.scopedEbpBatches.length} lotes</td>
                    <td style={{ textAlign: 'right' }} className="mono">{money(metrics.ebpAppliedTotal + metrics.ebpPendingTotal)}</td>
                    <td style={{ textAlign: 'right' }} className="mono">{money(metrics.ebpPendingTotal)}</td>
                    <td>{scoped.scopedEbpBatches.filter((b) => b.status === 'Aplicado en banco').length} aplicado(s) en banco · Liquidez {money(metrics.totalLiquidity)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button type="button" className="button-icon-action" onClick={() => onNavigateModule('Finanzas')}>
                        Ir a Finanzas <ArrowRight size={12} />
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Operaciones e Inventario</strong></td>
                    <td style={{ textAlign: 'right' }} className="mono">{scoped.scopedInventory.length} SKUs</td>
                    <td style={{ textAlign: 'right' }} className="mono">{money(metrics.inventoryValue)}</td>
                    <td style={{ textAlign: 'right' }} className="mono">{metrics.lowStockCount} bajo mínimo</td>
                    <td>{compactNum(metrics.totalStockUnits)} unidades totales en almacenes filtrados</td>
                    <td style={{ textAlign: 'right' }}>
                      <button type="button" className="button-icon-action" onClick={() => onNavigateModule('Operaciones')}>
                        Ir a Operaciones <ArrowRight size={12} />
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>CRM, Colaboradores y Nómina</strong></td>
                    <td style={{ textAlign: 'right' }} className="mono">{scoped.scopedPayrollRuns.length} corridas</td>
                    <td style={{ textAlign: 'right' }} className="mono">{money(metrics.monthlyPayrollNet)}</td>
                    <td style={{ textAlign: 'right' }} className="mono">{metrics.activeEmployeesCount} activos</td>
                    <td>{activeDepartments.length} departamentos configurados</td>
                    <td style={{ textAlign: 'right' }}>
                      <button type="button" className="button-icon-action" onClick={() => onNavigateModule('CRM')}>
                        Ir a CRM <ArrowRight size={12} />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* 1B. ESTADO DE RESULTADOS */}
      {activeTab === 'Estado de Resultados' && (
        <IncomeStatementReport
          data={incomeStatementData}
          compareYoY={filters.compareYoY}
          activeScopeSummary={activeScopeSummary}
          sourceMode={pnlSourceMode}
          onChangeSourceMode={setPnlSourceMode}
          taxRate={pnlTaxRate}
          onChangeTaxRate={setPnlTaxRate}
          onNavigateModule={onNavigateModule}
          quotes={scoped.scopedQuotes}
          purchaseOrders={scoped.scopedPurchaseOrders}
        />
      )}

      {/* 2. FINANZAS Y TESORERÍA */}
      {activeTab === 'Finanzas y Tesorería' && (
        <div className="reports-tab-body">
          <div className="ops-kpi-grid">
            <article className="ops-kpi-card highlight">
              <div className="ops-kpi-top">
                <span>LIQUIDEZ EN BANCOS</span>
                <span className="ops-kpi-icon icon-green"><Landmark size={16} /></span>
              </div>
              <div className="ops-kpi-val mono">{money(metrics.totalLiquidity)}</div>
              <div className="ops-kpi-foot"><span>{bankAccounts.length} cuentas bancarias</span></div>
            </article>
            <article className="ops-kpi-card">
              <div className="ops-kpi-top">
                <span>INGRESOS EN ALCANCE</span>
                <span className="ops-kpi-icon icon-blue"><ReceiptText size={16} /></span>
              </div>
              <div className="ops-kpi-val mono">
                {money(
                  filteredTransactionsAndExpenses
                    .filter((r) => r.direction === 'Ingreso')
                    .reduce((s, r) => s + r.amount, 0)
                )}
              </div>
              <div className="ops-kpi-foot">
                <span>{filteredTransactionsAndExpenses.filter((r) => r.direction === 'Ingreso').length} cobro(s) filtrados</span>
              </div>
            </article>
            <article className="ops-kpi-card">
              <div className="ops-kpi-top">
                <span>GASTOS EN ALCANCE</span>
                <span className="ops-kpi-icon icon-amber"><Wallet size={16} /></span>
              </div>
              <div className="ops-kpi-val mono">{money(metrics.totalExpenses)}</div>
              <div className="ops-kpi-foot"><span>{scoped.scopedExpenses.length} gasto(s) operativos</span></div>
            </article>
            <article className="ops-kpi-card">
              <div className="ops-kpi-top">
                <span>MOVIMIENTOS LIBRO</span>
                <span className="ops-kpi-icon icon-purple"><BarChart3 size={16} /></span>
              </div>
              <div className="ops-kpi-val mono">{filteredTransactionsAndExpenses.length}</div>
              <div className="ops-kpi-foot"><span>Registros visibles con filtro</span></div>
            </article>
          </div>

          <div className="reports-split-grid">
            <section className="overview-panel-card">
              <div className="overview-card-head">
                <h2>Posición Bancaria por Cuenta</h2>
                <div className="overview-card-head-sub">
                  <Landmark size={16} />
                  <p>Saldos disponibles y participación de liquidez por banco ordenante.</p>
                </div>
              </div>
              <div className="table-wrap ops-table-wrap">
                <table className="data-table ops-data-table">
                  <thead>
                    <tr>
                      <th>BANCO / CUENTA</th>
                      <th>MONEDA</th>
                      <th style={{ textAlign: 'right' }}>SALDO ACTUAL</th>
                      <th style={{ textAlign: 'right' }}>PARTICIPACIÓN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bankAccounts.map((acc) => {
                      const pct = metrics.totalLiquidity > 0 ? (acc.balance / metrics.totalLiquidity) * 100 : 0
                      return (
                        <tr key={acc.id}>
                          <td>
                            <div className="supplier-cell">
                              <strong>{acc.bankName}</strong>
                              <small className="mono">{acc.accountNumber} · {acc.clabe}</small>
                            </div>
                          </td>
                          <td className="mono">{acc.currency}</td>
                          <td style={{ textAlign: 'right' }} className="mono"><strong>{money(acc.balance, acc.currency)}</strong></td>
                          <td style={{ textAlign: 'right' }} className="mono">{pct.toFixed(1)}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="overview-panel-card">
              <div className="overview-card-head">
                <h2>Gastos Operativos por Categoría</h2>
                <div className="overview-card-head-sub">
                  <Wallet size={16} />
                  <p>Distribución de egresos directos dentro del alcance filtrado.</p>
                </div>
              </div>
              <div className="reports-chart-rows">
                {expenseCategoriesBreakdown.length === 0 ? (
                  <p className="reports-empty-text">No hay gastos operativos en el rango o filtros seleccionados.</p>
                ) : (
                  expenseCategoriesBreakdown.map((item) => (
                    <div key={item.category} className="reports-bar-item">
                      <div className="reports-bar-meta">
                        <span>{item.category}</span>
                        <strong className="mono">
                          {money(item.amount)} ({item.pct.toFixed(1)}%)
                        </strong>
                      </div>
                      <div className="reports-bar-track">
                        <span
                          className="reports-bar-fill tone-accent"
                          style={{ width: `${Math.max(4, Math.round(item.pct))}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <section className="overview-panel-card">
            <div className="overview-card-head">
              <div>
                <h2>Libro de Movimientos de Tesorería y Gastos ({filteredTransactionsAndExpenses.length})</h2>
                <p>Incluye cobros, dispersiones EBP a proveedores, pagos de nómina y gastos operativos.</p>
              </div>
            </div>
            <div className="table-wrap ops-table-wrap">
              <table className="data-table ops-data-table">
                <thead>
                  <tr>
                    <th>FOLIO</th>
                    <th>FECHA</th>
                    <th>TIPO / CATEGORÍA</th>
                    <th>ENTIDAD / BENEFICIARIO</th>
                    <th>REFERENCIA</th>
                    <th>CUENTA / MÉTODO</th>
                    <th style={{ textAlign: 'right' }}>IMPORTE</th>
                    <th>ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactionsAndExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="empty-cell">
                        Sin movimientos que coincidan con el rango de fechas, sucursal o departamento seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactionsAndExpenses.map((row) => (
                      <tr key={row.id}>
                        <td className="mono"><strong>{row.folio}</strong></td>
                        <td className="mono">{row.date}</td>
                        <td>{row.category}</td>
                        <td>{row.entity}</td>
                        <td>{row.reference}</td>
                        <td>{row.account}</td>
                        <td style={{ textAlign: 'right' }} className="mono">
                          <strong>{row.direction === 'Egreso' ? '-' : ''}{money(row.amount, row.currency)}</strong>
                        </td>
                        <td>{row.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Temporal Expenses vs Inflows Chart inside Finanzas y Tesorería */}
          <section className="overview-panel-card">
            <div className="overview-card-head">
              <h2>
                Evolución Temporal de Ingresos y Egresos (
                {periodChartConfig.granularity === 'day' ? 'Diario' : 'Mensual'})
              </h2>
              <div className="overview-card-head-sub">
                <TrendingUp size={16} />
                <p>Comportamiento cronológico de entradas, gastos, compras y pagos conforme al rango seleccionado.</p>
              </div>
            </div>
            {periodChartConfig.data.length === 0 ? (
              <p className="reports-empty-text">
                Sin movimientos registrados en los periodos del filtro actual.
              </p>
            ) : (
              <div className="reports-recharts-box">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={periodChartConfig.data}
                    margin={{ top: 10, right: 14, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="rgba(128, 142, 133, 0.22)"
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: '#77857d' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#77857d' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={shortMoneyAxis}
                      width={54}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(69, 106, 97, 0.08)' }}
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null
                        const row = payload[0].payload as (typeof periodChartConfig.data)[number]
                        return (
                          <div className="reports-chart-tooltip">
                            <strong>{row.label}</strong>
                            <div className="reports-tooltip-rows">
                              <div>
                                <span>Ingresos</span>
                                <strong className="mono">{money(row.ingresos)}</strong>
                              </div>
                              <div>
                                <span>Gastos op.</span>
                                <strong className="mono">{money(row.gastosOp)}</strong>
                              </div>
                              <div>
                                <span>Compras y nómina</span>
                                <strong className="mono">
                                  {money(row.comprasOc + row.nominaYPagos)}
                                </strong>
                              </div>
                              <div className="reports-tooltip-total">
                                <span>Flujo neto</span>
                                <strong className="mono">{money(row.flujoNeto)}</strong>
                              </div>
                            </div>
                          </div>
                        )
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10.5px', paddingTop: '4px' }} />
                    <Bar
                      dataKey="ingresos"
                      name="Ingresos"
                      fill={seriesColors.ingresos}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={30}
                    />
                    <Bar
                      dataKey="gastosOp"
                      name="Gastos operativos"
                      fill={seriesColors.gastos}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={30}
                    />
                    <Bar
                      dataKey="nominaYPagos"
                      name="Nómina dispersada"
                      fill={seriesColors.nomina}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={30}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          {filters.compareYoY && renderYoYComparisonSection()}
        </div>
      )}

      {/* 3. CXP Y PAGOS EBP */}
      {activeTab === 'CxP y Pagos EBP' && (
        <div className="reports-tab-body">
          <div className="ops-kpi-grid">
            <article className="ops-kpi-card">
              <div className="ops-kpi-top">
                <span>VENDOR BILLS EN ALCANCE</span>
                <span className="ops-kpi-icon icon-blue"><ReceiptText size={16} /></span>
              </div>
              <div className="ops-kpi-val mono">{money(metrics.totalVendorBills)}</div>
              <div className="ops-kpi-foot"><span>{filteredPayables.length} factura(s) filtradas</span></div>
            </article>
            <article className="ops-kpi-card">
              <div className="ops-kpi-top">
                <span>SALDO ABIERTO CXP</span>
                <span className="ops-kpi-icon icon-amber"><Wallet size={16} /></span>
              </div>
              <div className="ops-kpi-val mono">{money(metrics.openAP)}</div>
              <div className="ops-kpi-foot"><span>{supplierExposure.length} proveedor(es)</span></div>
            </article>
            <article className="ops-kpi-card highlight">
              <div className="ops-kpi-top">
                <span>EBP APLICADO EN BANCO</span>
                <span className="ops-kpi-icon icon-green"><Landmark size={16} /></span>
              </div>
              <div className="ops-kpi-val mono">{money(metrics.ebpAppliedTotal)}</div>
              <div className="ops-kpi-foot"><span>{filteredEbpLines.length} línea(s) EBP</span></div>
            </article>
            <article className="ops-kpi-card">
              <div className="ops-kpi-top">
                <span>EBP EN TRÁNSITO</span>
                <span className="ops-kpi-icon icon-purple"><BarChart3 size={16} /></span>
              </div>
              <div className="ops-kpi-val mono">{money(metrics.ebpPendingTotal)}</div>
              <div className="ops-kpi-foot"><span>{scoped.scopedEbpBatches.length} lote(s) en alcance</span></div>
            </article>
          </div>

          <div className="reports-split-grid">
            <section className="overview-panel-card">
              <div className="overview-card-head">
                <h2>Exposición por Proveedor y Cuentas EBP</h2>
                <div className="overview-card-head-sub">
                  <Building2 size={16} />
                  <p>Saldo pendiente por pagar, monto liquidado y cuentas bancarias activas configuradas.</p>
                </div>
              </div>
              <div className="table-wrap ops-table-wrap">
                <table className="data-table ops-data-table">
                  <thead>
                    <tr>
                      <th>PROVEEDOR</th>
                      <th style={{ textAlign: 'right' }}>FACTURAS</th>
                      <th style={{ textAlign: 'right' }}>CUENTAS EBP</th>
                      <th style={{ textAlign: 'right' }}>PAGADO</th>
                      <th style={{ textAlign: 'right' }}>SALDO ABIERTO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierExposure.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="empty-cell">
                          Sin proveedores con saldo en el rango o alcance seleccionado.
                        </td>
                      </tr>
                    ) : (
                      supplierExposure.map((s) => (
                        <tr key={s.company}>
                          <td><strong>{s.company}</strong></td>
                          <td style={{ textAlign: 'right' }} className="mono">{s.billsCount}</td>
                          <td style={{ textAlign: 'right' }} className="mono">{s.bankAccountsCount}</td>
                          <td style={{ textAlign: 'right' }} className="mono">{money(s.paidTotal)}</td>
                          <td style={{ textAlign: 'right' }} className="mono"><strong>{money(s.openBalance)}</strong></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="overview-panel-card">
              <div className="overview-card-head">
                <h2>Facturas de Proveedor (Vendor Bills) ({filteredPayables.length})</h2>
                <div className="overview-card-head-sub">
                  <ReceiptText size={16} />
                  <p>Detalle de obligaciones recibidas desde Compras y su estado de liquidación.</p>
                </div>
              </div>
              <div className="table-wrap ops-table-wrap">
                <table className="data-table ops-data-table">
                  <thead>
                    <tr>
                      <th>FOLIO</th>
                      <th>PROVEEDOR</th>
                      <th>VENCE</th>
                      <th style={{ textAlign: 'right' }}>TOTAL</th>
                      <th style={{ textAlign: 'right' }}>SALDO</th>
                      <th>ESTADO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayables.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="empty-cell">
                          Sin facturas de proveedor para los filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      filteredPayables.map((b) => (
                        <tr key={b.id}>
                          <td className="mono"><strong>{b.folio}</strong></td>
                          <td>{b.supplierCompany}</td>
                          <td className="mono">{b.dueDate}</td>
                          <td style={{ textAlign: 'right' }} className="mono">{money(b.total, b.currency)}</td>
                          <td style={{ textAlign: 'right' }} className="mono"><strong>{money(b.balance, b.currency)}</strong></td>
                          <td>{b.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section className="overview-panel-card">
            <div className="overview-card-head">
              <h2>Trazabilidad de Dispersiones Bancarias EBP ({filteredEbpLines.length} líneas)</h2>
              <div className="overview-card-head-sub">
                <Landmark size={16} />
                <p>Muestra el alias bancario seleccionado por línea, CLABE destino, motivo del pago y facturas cubiertas.</p>
              </div>
            </div>
            <div className="table-wrap ops-table-wrap">
              <table className="data-table ops-data-table">
                <thead>
                  <tr>
                    <th>LOTE</th>
                    <th>MODO</th>
                    <th>FECHA EJEC.</th>
                    <th>BENEFICIARIO</th>
                    <th>ALIAS / CUENTA DESTINO</th>
                    <th>MOTIVO DEL PAGO</th>
                    <th>FACTURAS CUBIERTAS</th>
                    <th style={{ textAlign: 'right' }}>IMPORTE</th>
                    <th>ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEbpLines.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="empty-cell">
                        Sin líneas EBP para los filtros actuales.
                      </td>
                    </tr>
                  ) : (
                    filteredEbpLines.map((row, idx) => (
                      <tr key={`${row.batchFolio}_${idx}`}>
                        <td className="mono"><strong>{row.batchFolio}</strong></td>
                        <td>{row.aggregationLabel}</td>
                        <td className="mono">{row.executionDate}</td>
                        <td><strong>{row.beneficiaryName}</strong></td>
                        <td>
                          <div className="supplier-cell">
                            <strong>{row.selectedAlias}</strong>
                            <small className="mono">{row.bankName} · {row.clabe}</small>
                          </div>
                        </td>
                        <td>{row.paymentReason}</td>
                        <td className="mono">{row.folios}</td>
                        <td style={{ textAlign: 'right' }} className="mono"><strong>{money(row.amount, row.currency)}</strong></td>
                        <td>{row.batchStatus}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* 4. VENTAS Y CXC */}
      {activeTab === 'Ventas y CxC' && (
        <div className="reports-tab-body">
          <div className="ops-kpi-grid">
            <article className="ops-kpi-card">
              <div className="ops-kpi-top">
                <span>COTIZACIONES ACTIVAS</span>
                <span className="ops-kpi-icon icon-blue"><ShoppingBag size={16} /></span>
              </div>
              <div className="ops-kpi-val mono">{money(metrics.quotesValue)}</div>
              <div className="ops-kpi-foot"><span>{scoped.scopedQuotes.length} cotizaciones en alcance</span></div>
            </article>
            <article className="ops-kpi-card">
              <div className="ops-kpi-top">
                <span>PEDIDOS CONFIRMADOS</span>
                <span className="ops-kpi-icon icon-purple"><ShoppingBag size={16} /></span>
              </div>
              <div className="ops-kpi-val mono">{money(metrics.ordersValue)}</div>
              <div className="ops-kpi-foot"><span>{scoped.scopedOrders.length} pedidos en alcance</span></div>
            </article>
            <article className="ops-kpi-card highlight">
              <div className="ops-kpi-top">
                <span>TOTAL COBRADO (CXC)</span>
                <span className="ops-kpi-icon icon-green"><ReceiptText size={16} /></span>
              </div>
              <div className="ops-kpi-val mono">{money(metrics.collectedAR)}</div>
              <div className="ops-kpi-foot"><span>Efectividad {metrics.arCollectionRate.toFixed(1)}%</span></div>
            </article>
            <article className="ops-kpi-card">
              <div className="ops-kpi-top">
                <span>SALDO POR COBRAR</span>
                <span className="ops-kpi-icon icon-amber"><ReceiptText size={16} /></span>
              </div>
              <div className="ops-kpi-val mono">{money(metrics.openAR)}</div>
              <div className="ops-kpi-foot"><span>{scoped.scopedReceivables.filter((r) => r.balance > 0).length} factura(s) con saldo</span></div>
            </article>
          </div>

          <section className="overview-panel-card">
            <div className="overview-card-head">
              <div>
                <h2>Detalle de Cartera y Facturación de Ventas ({filteredReceivables.length})</h2>
                <p>Facturas emitidas a clientes, montos cobrados y vencimientos vigentes.</p>
              </div>
            </div>
            <div className="table-wrap ops-table-wrap">
              <table className="data-table ops-data-table">
                <thead>
                  <tr>
                    <th>FOLIO</th>
                    <th>CLIENTE</th>
                    <th>PEDIDO</th>
                    <th>EMISIÓN</th>
                    <th>VENCE</th>
                    <th style={{ textAlign: 'right' }}>TOTAL</th>
                    <th style={{ textAlign: 'right' }}>COBRADO</th>
                    <th style={{ textAlign: 'right' }}>SALDO</th>
                    <th>ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReceivables.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="empty-cell">
                        Sin facturas de venta para los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredReceivables.map((r) => (
                      <tr key={r.id}>
                        <td className="mono"><strong>{r.folio}</strong></td>
                        <td>{r.clientCompany}</td>
                        <td className="mono">{r.orderFolio || '—'}</td>
                        <td className="mono">{r.issueDate}</td>
                        <td className="mono">{r.dueDate}</td>
                        <td style={{ textAlign: 'right' }} className="mono">{money(r.total, r.currency)}</td>
                        <td style={{ textAlign: 'right' }} className="mono">{money(r.paidAmount, r.currency)}</td>
                        <td style={{ textAlign: 'right' }} className="mono"><strong>{money(r.balance, r.currency)}</strong></td>
                        <td>{r.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* 5. COMPRAS E INVENTARIO */}
      {activeTab === 'Compras e Inventario' && (
        <div className="reports-tab-body">
          <div className="ops-kpi-grid">
            <article className="ops-kpi-card highlight">
              <div className="ops-kpi-top">
                <span>VALOR DE INVENTARIO</span>
                <span className="ops-kpi-icon icon-green"><Package size={16} /></span>
              </div>
              <div className="ops-kpi-val mono">{money(metrics.inventoryValue)}</div>
              <div className="ops-kpi-foot"><span>{compactNum(metrics.totalStockUnits)} unidades</span></div>
            </article>
            <article className="ops-kpi-card">
              <div className="ops-kpi-top">
                <span>ALERTAS STOCK MÍNIMO</span>
                <span className="ops-kpi-icon icon-amber"><Package size={16} /></span>
              </div>
              <div className="ops-kpi-val mono">{metrics.lowStockCount}</div>
              <div className="ops-kpi-foot"><span>SKUs por reabastecer</span></div>
            </article>
            <article className="ops-kpi-card">
              <div className="ops-kpi-top">
                <span>ÓRDENES DE COMPRA</span>
                <span className="ops-kpi-icon icon-blue"><ShoppingBag size={16} /></span>
              </div>
              <div className="ops-kpi-val mono">{scoped.scopedPurchaseOrders.length}</div>
              <div className="ops-kpi-foot"><span>{scoped.scopedRequisitions.length} requisición(es)</span></div>
            </article>
            <article className="ops-kpi-card">
              <div className="ops-kpi-top">
                <span>MOVIMIENTOS KARDEX</span>
                <span className="ops-kpi-icon icon-purple"><BarChart3 size={16} /></span>
              </div>
              <div className="ops-kpi-val mono">{scoped.scopedMovements.length}</div>
              <div className="ops-kpi-foot"><span>Entradas, salidas y traslados</span></div>
            </article>
          </div>

          <section className="overview-panel-card">
            <div className="overview-card-head">
              <div>
                <h2>Valorización de Existencias por Almacén ({filteredInventory.length})</h2>
                <p>Control de cantidades disponibles, umbrales mínimos y costo acumulado por SKU.</p>
              </div>
            </div>
            <div className="table-wrap ops-table-wrap">
              <table className="data-table ops-data-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>PRODUCTO</th>
                    <th>UBICACIÓN / UNIDAD</th>
                    <th>ALMACÉN</th>
                    <th style={{ textAlign: 'right' }}>EXISTENCIA</th>
                    <th style={{ textAlign: 'right' }}>MÍNIMO</th>
                    <th style={{ textAlign: 'right' }}>COSTO UNIT.</th>
                    <th style={{ textAlign: 'right' }}>VALOR TOTAL</th>
                    <th>ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="empty-cell">
                        Sin artículos de inventario para la sucursal o filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map((it) => {
                      const isLow = it.stock <= it.minStock
                      return (
                        <tr key={it.id}>
                          <td className="mono"><strong>{it.sku}</strong></td>
                          <td>{it.name}</td>
                          <td className="mono">{it.locationBin} · {it.unitOfMeasure}</td>
                          <td>{it.warehouseName}</td>
                          <td style={{ textAlign: 'right' }} className="mono"><strong>{it.stock}</strong></td>
                          <td style={{ textAlign: 'right' }} className="mono">{it.minStock}</td>
                          <td style={{ textAlign: 'right' }} className="mono">{money(it.cost)}</td>
                          <td style={{ textAlign: 'right' }} className="mono"><strong>{money(it.stock * it.cost)}</strong></td>
                          <td>{isLow ? 'Stock bajo' : 'Óptimo'}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* 6. NÓMINA Y RRHH */}
      {activeTab === 'Nómina y RRHH' && (
        <div className="reports-tab-body">
          <div className="ops-kpi-grid">
            <article className="ops-kpi-card">
              <div className="ops-kpi-top">
                <span>COLABORADORES ACTIVOS</span>
                <span className="ops-kpi-icon icon-blue"><Users size={16} /></span>
              </div>
              <div className="ops-kpi-val mono">{metrics.activeEmployeesCount}</div>
              <div className="ops-kpi-foot"><span>{departmentHeadcount.length} área(s) en alcance</span></div>
            </article>
            <article className="ops-kpi-card">
              <div className="ops-kpi-top">
                <span>MASA SALARIAL MENSUAL</span>
                <span className="ops-kpi-icon icon-purple"><Building2 size={16} /></span>
              </div>
              <div className="ops-kpi-val mono">
                {money(departmentHeadcount.reduce((s, d) => s + d.monthlySalary, 0))}
              </div>
              <div className="ops-kpi-foot"><span>Sueldos base mensuales</span></div>
            </article>
            <article className="ops-kpi-card">
              <div className="ops-kpi-top">
                <span>BRUTO DE CORRIDAS</span>
                <span className="ops-kpi-icon icon-amber"><ReceiptText size={16} /></span>
              </div>
              <div className="ops-kpi-val mono">
                {money(filteredPayrollRuns.reduce((s, r) => s + r.totalGross, 0))}
              </div>
              <div className="ops-kpi-foot"><span>{filteredPayrollRuns.length} corrida(s) en periodo</span></div>
            </article>
            <article className="ops-kpi-card highlight">
              <div className="ops-kpi-top">
                <span>NETO DISPERSADO</span>
                <span className="ops-kpi-icon icon-green"><Landmark size={16} /></span>
              </div>
              <div className="ops-kpi-val mono">
                {money(filteredPayrollRuns.reduce((s, r) => s + r.totalNet, 0))}
              </div>
              <div className="ops-kpi-foot"><span>Deducciones {money(filteredPayrollRuns.reduce((s, r) => s + r.totalDeductions, 0))}</span></div>
            </article>
          </div>

          <div className="reports-split-grid">
            <section className="overview-panel-card">
              <div className="overview-card-head">
                <h2>Plantilla y Masa Salarial por Departamento</h2>
                <div className="overview-card-head-sub">
                  <Users size={16} />
                  <p>Colaboradores activos y costo salarial mensual filtrado por sede y área.</p>
                </div>
              </div>
              <div className="table-wrap ops-table-wrap">
                <table className="data-table ops-data-table">
                  <thead>
                    <tr>
                      <th>DEPARTAMENTO</th>
                      <th style={{ textAlign: 'right' }}>COLABORADORES</th>
                      <th style={{ textAlign: 'right' }}>MASA SALARIAL MENSUAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departmentHeadcount.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="empty-cell">
                          Sin colaboradores activos para la sucursal o departamento seleccionados.
                        </td>
                      </tr>
                    ) : (
                      departmentHeadcount.map((d) => (
                        <tr key={d.name}>
                          <td><strong>{d.name}</strong></td>
                          <td style={{ textAlign: 'right' }} className="mono">{d.activeCount}</td>
                          <td style={{ textAlign: 'right' }} className="mono"><strong>{money(d.monthlySalary)}</strong></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="overview-panel-card">
              <div className="overview-card-head">
                <h2>Histórico de Corridas de Nómina ({filteredPayrollRuns.length})</h2>
                <div className="overview-card-head-sub">
                  <Landmark size={16} />
                  <p>Percepciones brutas, deducciones y neto pagado dentro del alcance seleccionado.</p>
                </div>
              </div>
              <div className="table-wrap ops-table-wrap">
                <table className="data-table ops-data-table">
                  <thead>
                    <tr>
                      <th>FOLIO</th>
                      <th>PERIODO</th>
                      <th>FECHA PAGO</th>
                      <th style={{ textAlign: 'right' }}>RECIBOS</th>
                      <th style={{ textAlign: 'right' }}>BRUTO</th>
                      <th style={{ textAlign: 'right' }}>DEDUCCIONES</th>
                      <th style={{ textAlign: 'right' }}>NETO</th>
                      <th>ESTADO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayrollRuns.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="empty-cell">
                          Sin corridas de nómina que coincidan con el filtro aplicado.
                        </td>
                      </tr>
                    ) : (
                      filteredPayrollRuns.map((run) => (
                        <tr key={run.id}>
                          <td className="mono"><strong>{run.folio}</strong></td>
                          <td>{run.periodLabel}</td>
                          <td className="mono">{run.paymentDate}</td>
                          <td style={{ textAlign: 'right' }} className="mono">{run.employeesCount}</td>
                          <td style={{ textAlign: 'right' }} className="mono">{money(run.totalGross)}</td>
                          <td style={{ textAlign: 'right' }} className="mono">{money(run.totalDeductions)}</td>
                          <td style={{ textAlign: 'right' }} className="mono"><strong>{money(run.totalNet)}</strong></td>
                          <td>{run.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      )}
    </section>
  )
}
