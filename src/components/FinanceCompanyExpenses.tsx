import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Banknote,
  Building,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  Eye,
  FileSpreadsheet,
  Landmark,
  Layers,
  MapPin,
  Monitor,
  Pause,
  PieChart,
  Plane,
  Play,
  Plus,
  Receipt,
  Repeat,
  Search,
  Settings2,
  SlidersHorizontal,
  Trash2,
  Truck,
  Users,
  X,
  XCircle,
  Zap,
} from 'lucide-react'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  mapExpenseNatureToCompanyCategory,
  resolveExpenseNature,
  type BankAccount,
  type ChartAccount,
  type ExpenseBudgetRule,
  type ExpenseCategory,
  type ExpenseNature,
  type ExpenseRecurrenceFrequency,
  type ExpenseRecord,
  type ExpenseStatus,
  type PaymentTransaction,
  type RecurringExpenseTemplate,
} from '../data/finance'
import type { DepartmentRecord, PhysicalLocationRecord } from './AdministrationSection'
import { useToast } from './Toast'
import { useI18n } from '../i18n/I18nContext'

export type ExpensesSectionTab =
  | 'Resumen y control'
  | 'Registro y pólizas'
  | 'Presupuestos y alertas'
  | 'Gastos recurrentes'

interface FinanceCompanyExpensesProps {
  mode?: 'module' | 'financeTab'
  activeSection?: ExpensesSectionTab
  allowedSections?: ExpensesSectionTab[]
  onSelectSection?: (sec: ExpensesSectionTab) => void
  expenses: ExpenseRecord[]
  bankAccounts: BankAccount[]
  departments: DepartmentRecord[]
  locations?: PhysicalLocationRecord[]
  chartAccounts?: ChartAccount[]
  budgets?: ExpenseBudgetRule[]
  recurringTemplates?: RecurringExpenseTemplate[]
  activeUserName: string
  canCreate?: boolean
  canEdit?: boolean
  onAddExpense: (expense: ExpenseRecord) => void
  onUpdateExpense?: (expense: ExpenseRecord) => void
  onUpdateExpenseStatus?: (expenseId: string, nextStatus: ExpenseStatus, bankAccountId?: string) => void
  onDeleteExpense?: (expenseId: string) => void
  onAddTransaction: (txn: PaymentTransaction) => void
  onUpdateBankAccountBalance: (accountId: string, delta: number) => void
  onSaveBudget?: (budget: ExpenseBudgetRule) => void
  onToggleBudget?: (budgetId: string) => void
  onAddRecurringTemplate?: (template: RecurringExpenseTemplate) => void
  onUpdateRecurringTemplate?: (template: RecurringExpenseTemplate) => void
  onDeleteRecurringTemplate?: (templateId: string) => void
  onToggleRecurringTemplate?: (templateId: string) => void
  onGenerateRecurringExpense?: (templateId: string) => void
  onGenerateRecurringBatch?: (templateIds: string[]) => void
  onExportAudit?: (reportName: string, rowCount: number) => void
}

const ALL_SUBCATEGORIES: ExpenseCategory[] = [
  'Arrendamiento',
  'Servicios',
  'Nómina y honorarios',
  'Logística y fletes',
  'Software y herramientas',
  'Impuestos y derechos',
  'Viáticos y representación',
  'Comisiones e intereses',
]

const EXPENSE_NATURES: Array<{
  id: ExpenseNature
  label: string
  shortLabel: string
  description: string
  defaultSubCategory: ExpenseCategory
  subCategories: ExpenseCategory[]
  defaultBehavior: 'Fijo' | 'Variable'
  defaultAccountCode: string
  dotColor: string
}> = [
  {
    id: 'Administrativo',
    label: 'Administrativo',
    shortLabel: 'Administrativo',
    description: 'Renta, honorarios, software, licencias y estructura corporativa.',
    defaultSubCategory: 'Arrendamiento',
    subCategories: ['Arrendamiento', 'Nómina y honorarios', 'Software y herramientas'],
    defaultBehavior: 'Fijo',
    defaultAccountCode: '6001-001',
    dotColor: '#3b6ca8',
  },
  {
    id: 'Operativo',
    label: 'Operativo',
    shortLabel: 'Operativo',
    description: 'Servicios en sede, energía, logística, viáticos y operación diaria.',
    defaultSubCategory: 'Servicios',
    subCategories: ['Servicios', 'Logística y fletes', 'Viáticos y representación'],
    defaultBehavior: 'Variable',
    defaultAccountCode: '6003-001',
    dotColor: '#2e7d5b',
  },
  {
    id: 'Costo de venta',
    label: 'Costo de venta',
    shortLabel: 'Costo de venta',
    description: 'Fletes de entrega directa, empaque, maquila y costos asociados a ventas.',
    defaultSubCategory: 'Logística y fletes',
    subCategories: ['Logística y fletes', 'Servicios', 'Nómina y honorarios'],
    defaultBehavior: 'Variable',
    defaultAccountCode: '5001-001',
    dotColor: '#c05621',
  },
  {
    id: 'Financiero',
    label: 'Financiero',
    shortLabel: 'Financiero',
    description: 'Comisiones bancarias, anualidades TPV, intereses y cargos de crédito.',
    defaultSubCategory: 'Comisiones e intereses',
    subCategories: ['Comisiones e intereses'],
    defaultBehavior: 'Variable',
    defaultAccountCode: '7001-001',
    dotColor: '#b45309',
  },
  {
    id: 'Impuestos',
    label: 'Impuestos y derechos',
    shortLabel: 'Impuestos',
    description: 'Impuesto sobre nómina (ISN), derechos municipales, licencias y contribuciones.',
    defaultSubCategory: 'Impuestos y derechos',
    subCategories: ['Impuestos y derechos'],
    defaultBehavior: 'Fijo',
    defaultAccountCode: '2005-001',
    dotColor: '#6d28d9',
  },
]

const STATUS_META: Record<
  ExpenseStatus,
  { label: string; dotColor: string; className: string }
> = {
  Pendiente: { label: 'Pendiente', dotColor: '#d97706', className: 'status-pending' },
  Aprobado: { label: 'Aprobado', dotColor: '#2563eb', className: 'status-approved' },
  Pagado: { label: 'Pagado', dotColor: '#1e7a53', className: 'status-paid' },
  Cancelado: { label: 'Cancelado', dotColor: '#94a3b8', className: 'status-cancelled' },
}

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MONTH_FULL_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

const formatIsoToErpDate = (isoDate: string): string => {
  const parts = isoDate.split('-')
  if (parts.length !== 3) {
    const now = new Date()
    return `${String(now.getDate()).padStart(2, '0')} ${MONTHS_ES[now.getMonth()]} ${now.getFullYear()}`
  }
  const year = Number(parts[0])
  const monthIdx = Math.max(0, Math.min(11, Number(parts[1]) - 1))
  const day = String(Number(parts[2])).padStart(2, '0')
  return `${day} ${MONTHS_ES[monthIdx]} ${year}`
}

const getTodayIso = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const parseErpDateToIso = (dateStr: string): string | null => {
  const trimmed = dateStr.trim().toLowerCase()
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`
  const parts = trimmed.split(/\s+/)
  if (parts.length >= 3) {
    const dayNum = Number(parts[0])
    const mIdx = MONTHS_ES.indexOf(parts[1].slice(0, 3))
    const year = parts[2]
    if (Number.isFinite(dayNum) && dayNum >= 1 && dayNum <= 31 && mIdx >= 0 && /^\d{4}$/.test(year)) {
      return `${year}-${String(mIdx + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
    }
  }
  return null
}

const parseErpDateMonthKey = (dateStr: string): string | null => {
  const iso = parseErpDateToIso(dateStr)
  return iso ? iso.slice(0, 7) : null
}

const formatMonthKeyLabel = (monthKey: string): string => {
  const [year, monthStr] = monthKey.split('-')
  const mIdx = Number(monthStr) - 1
  if (mIdx >= 0 && mIdx < 12 && year) {
    return `${MONTH_FULL_ES[mIdx]} ${year}`
  }
  return monthKey
}

const money = (val: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(val)

const getSubCategoryIcon = (cat: ExpenseCategory) => {
  switch (cat) {
    case 'Arrendamiento':
      return <Building size={12} />
    case 'Servicios':
      return <Zap size={12} />
    case 'Nómina y honorarios':
      return <Users size={12} />
    case 'Logística y fletes':
      return <Truck size={12} />
    case 'Software y herramientas':
      return <Monitor size={12} />
    case 'Impuestos y derechos':
      return <Landmark size={12} />
    case 'Viáticos y representación':
      return <Plane size={12} />
    case 'Comisiones e intereses':
      return <CreditCard size={12} />
    default:
      return <Receipt size={12} />
  }
}

const getNatureIcon = (nature: ExpenseNature) => {
  switch (nature) {
    case 'Administrativo':
      return <Building2 size={15} />
    case 'Operativo':
      return <Settings2 size={15} />
    case 'Costo de venta':
      return <Truck size={15} />
    case 'Financiero':
      return <Landmark size={15} />
    case 'Impuestos':
      return <Banknote size={15} />
  }
}

const getNatureMeta = (nature: ExpenseNature) =>
  EXPENSE_NATURES.find((n) => n.id === nature) || EXPENSE_NATURES[0]

export function FinanceCompanyExpenses({
  mode = 'financeTab',
  activeSection = 'Resumen y control',
  allowedSections = [
    'Resumen y control',
    'Registro y pólizas',
    'Presupuestos y alertas',
    'Gastos recurrentes',
  ],
  onSelectSection,
  expenses,
  bankAccounts,
  departments,
  locations = [],
  chartAccounts = [],
  budgets = [],
  recurringTemplates = [],
  activeUserName,
  canCreate = true,
  canEdit = canCreate,
  onAddExpense,
  onUpdateExpense,
  onUpdateExpenseStatus,
  onDeleteExpense,
  onAddTransaction,
  onUpdateBankAccountBalance,
  onSaveBudget,
  onToggleBudget,
  onAddRecurringTemplate,
  onUpdateRecurringTemplate,
  onDeleteRecurringTemplate,
  onToggleRecurringTemplate,
  onGenerateRecurringExpense,
  onGenerateRecurringBatch,
  onExportAudit,
}: FinanceCompanyExpensesProps) {
  const toast = useToast()
  const { countryProfile, reportingCurrency } = useI18n()
  const standardVatPct = countryProfile.vat.standardRatePct
  const standardVatRate = standardVatPct / 100

  // Local sub-tab fallback when embedded inside Finanzas > Gastos de la empresa
  const [embeddedView, setEmbeddedView] = useState<'ledger' | 'summary' | 'budgets' | 'recurring'>('ledger')
  const effectiveSection: ExpensesSectionTab =
    mode === 'module'
      ? activeSection
      : embeddedView === 'summary'
        ? 'Resumen y control'
        : embeddedView === 'budgets'
          ? 'Presupuestos y alertas'
          : embeddedView === 'recurring'
            ? 'Gastos recurrentes'
            : 'Registro y pólizas'

  const goToSection = (sec: ExpensesSectionTab) => {
    if (mode === 'module' && onSelectSection) {
      onSelectSection(sec)
      return
    }
    if (sec === 'Resumen y control') setEmbeddedView('summary')
    else if (sec === 'Presupuestos y alertas') setEmbeddedView('budgets')
    else if (sec === 'Gastos recurrentes') setEmbeddedView('recurring')
    else setEmbeddedView('ledger')
  }

  // Filters & modals state
  const [summaryPeriod, setSummaryPeriod] = useState<string>('all')
  const [monthlyTrendView, setMonthlyTrendView] = useState<
    'budget_vs_spend' | 'fixed_vs_variable' | 'savings_headroom'
  >('budget_vs_spend')
  const [selectedNature, setSelectedNature] = useState<'Todas' | ExpenseNature>('Todas')
  const [selectedSubCategory, setSelectedSubCategory] = useState<'Todos' | ExpenseCategory>('Todos')
  const [selectedStatus, setSelectedStatus] = useState<'Todos' | ExpenseStatus>('Todos')
  const [selectedBehavior, setSelectedBehavior] = useState<'Todos' | 'Fijo' | 'Variable'>('Todos')
  const [selectedLocationId, setSelectedLocationId] = useState<string>('Todas')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('Todos')
  const [costCenterMatrixTab, setCostCenterMatrixTab] = useState<'locations' | 'departments'>('locations')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('Todos')
  const [fiscalFilter, setFiscalFilter] = useState<'Todos' | 'Comprobado' | 'Sin comprobante'>('Todos')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [sortOrder, setSortOrder] = useState<'date_desc' | 'date_asc' | 'total_desc' | 'folio_asc'>(
    'date_desc'
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [viewingExpense, setViewingExpense] = useState<ExpenseRecord | null>(null)
  const [payBankAccountId, setPayBankAccountId] = useState<string>(bankAccounts[0]?.id || '')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [isEditingViewing, setIsEditingViewing] = useState(false)
  const [editNature, setEditNature] = useState<ExpenseNature>('Administrativo')
  const [editCategory, setEditCategory] = useState<ExpenseCategory>('Arrendamiento')
  const [editBehavior, setEditBehavior] = useState<'Fijo' | 'Variable'>('Fijo')
  const [editLocationId, setEditLocationId] = useState<string>('loc_1')
  const [editDepartment, setEditDepartment] = useState<string>('General')
  const [editAccountCode, setEditAccountCode] = useState<string>('6001-001')
  const [editPaymentMethod, setEditPaymentMethod] = useState<string>('Transferencia SPEI')
  const [editReferenceDoc, setEditReferenceDoc] = useState<string>('')
  const [editIssuerRfc, setEditIssuerRfc] = useState<string>('')
  const [editDescription, setEditDescription] = useState<string>('')

  // Expense registration form state
  const [expenseNature, setExpenseNature] = useState<ExpenseNature>('Administrativo')
  const [subCategory, setSubCategory] = useState<ExpenseCategory>('Arrendamiento')
  const [costBehavior, setCostBehavior] = useState<'Fijo' | 'Variable'>('Fijo')
  const [initialStatus, setInitialStatus] = useState<'Pagado' | 'Pendiente'>('Pagado')
  const [expenseDateIso, setExpenseDateIso] = useState<string>(getTodayIso)
  const [beneficiary, setBeneficiary] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState<string>('4500')
  const [taxMode, setTaxMode] = useState<'16' | '0' | 'custom'>('16')
  const [customTaxAmount, setCustomTaxAmount] = useState<string>('0')
  const [paymentMethod, setPaymentMethod] = useState(countryProfile.bank.defaultTransferMethod)
  const [bankAccountId, setBankAccountId] = useState(bankAccounts[0]?.id || '')
  const [departmentName, setDepartmentName] = useState(
    departments.find((d) => d.active)?.name || 'Finanzas y Tesorería'
  )
  const [locationId, setLocationId] = useState(
    locations.find((l) => l.active)?.id || 'loc_1'
  )
  const [accountCode, setAccountCode] = useState('6001-001')
  const [referenceDoc, setReferenceDoc] = useState('')
  const [issuerRfc, setIssuerRfc] = useState('')

  // Budget editing & threshold configuration state (80% preventiva / 95% crítica)
  const [budgetPeriodMonth, setBudgetPeriodMonth] = useState<string>('all-active')
  const [budgetViewMode, setBudgetViewMode] = useState<'cards' | 'matrix'>('cards')
  const [globalWarnDraft, setGlobalWarnDraft] = useState<string>('80')
  const [globalCritDraft, setGlobalCritDraft] = useState<string>('95')
  const [matrixEdits, setMatrixEdits] = useState<
    Record<
      string,
      {
        limit: string
        warn: string
        crit: string
        alertsEnabled: boolean
        active: boolean
      }
    >
  >({})
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null)
  const [budgetLimitDraft, setBudgetLimitDraft] = useState<string>('25000')
  const [budgetThresholdDraft, setBudgetThresholdDraft] = useState<string>('80')
  const [budgetCriticalDraft, setBudgetCriticalDraft] = useState<string>('95')
  const [budgetAlertsDraft, setBudgetAlertsDraft] = useState<boolean>(true)
  const [isNewBudgetOpen, setIsNewBudgetOpen] = useState(false)
  const [newBudgetNature, setNewBudgetNature] = useState<ExpenseNature>('Operativo')
  const [newBudgetLimit, setNewBudgetLimit] = useState<string>('20000')
  const [newBudgetThreshold, setNewBudgetThreshold] = useState<string>('80')
  const [newBudgetCritical, setNewBudgetCritical] = useState<string>('95')
  const [newBudgetAlertsEnabled, setNewBudgetAlertsEnabled] = useState<boolean>(true)

  // Recurring template form state
  const [isNewRecurringOpen, setIsNewRecurringOpen] = useState(false)
  const [editingRecurringId, setEditingRecurringId] = useState<string | null>(null)
  const [confirmDeleteRecurringId, setConfirmDeleteRecurringId] = useState<string | null>(null)
  const [recurringStatusFilter, setRecurringStatusFilter] = useState<'Todas' | 'Activas' | 'Pausadas'>(
    'Todas'
  )
  const [recTitle, setRecTitle] = useState('')
  const [recNature, setRecNature] = useState<ExpenseNature>('Administrativo')
  const [recCategory, setRecCategory] = useState<ExpenseCategory>('Arrendamiento')
  const [recBehavior, setRecBehavior] = useState<'Fijo' | 'Variable'>('Fijo')
  const [recBeneficiary, setRecBeneficiary] = useState('')
  const [recDescription, setRecDescription] = useState('')
  const [recAmount, setRecAmount] = useState<string>('5000')
  const [recHasTax, setRecHasTax] = useState(true)
  const [recPaymentMethod, setRecPaymentMethod] = useState<string>('Transferencia SPEI')
  const [recFrequency, setRecFrequency] = useState<ExpenseRecurrenceFrequency>('Mensual')
  const [recNextRunDate, setRecNextRunDate] = useState<string>(getTodayIso)
  const [recBankId, setRecBankId] = useState(bankAccounts[0]?.id || '')
  const [recDepartment, setRecDepartment] = useState(
    departments.find((d) => d.active)?.name || 'Finanzas y Tesorería'
  )
  const [recLocationId, setRecLocationId] = useState(
    locations.find((l) => l.active)?.id || 'loc_1'
  )
  const [recAccountCode, setRecAccountCode] = useState('6001-001')

  const activeNatureMeta = useMemo(() => getNatureMeta(expenseNature), [expenseNature])

  // Eligible expense chart accounts (5xxx, 6xxx, 7xxx, 2005)
  const expenseChartAccounts = useMemo(
    () =>
      chartAccounts.filter(
        (acc) =>
          acc.status === 'Activa' &&
          (acc.code.startsWith('5') ||
            acc.code.startsWith('6') ||
            acc.code.startsWith('7') ||
            acc.code.startsWith('2005'))
      ),
    [chartAccounts]
  )

  const handleSelectNature = (natureId: ExpenseNature) => {
    const meta = getNatureMeta(natureId)
    setExpenseNature(natureId)
    setSubCategory(meta.defaultSubCategory)
    setCostBehavior(meta.defaultBehavior)
    const matchedAcc =
      expenseChartAccounts.find((a) => a.code === meta.defaultAccountCode) ||
      expenseChartAccounts.find((a) => a.code.startsWith(meta.defaultAccountCode.charAt(0)))
    if (matchedAcc) {
      setAccountCode(matchedAcc.code)
    } else {
      setAccountCode(meta.defaultAccountCode)
    }
  }

  const handleFilterNature = (nature: 'Todas' | ExpenseNature) => {
    setSelectedNature(nature)
    if (nature !== 'Todas' && selectedSubCategory !== 'Todos') {
      const meta = getNatureMeta(nature)
      if (!meta.subCategories.includes(selectedSubCategory)) {
        setSelectedSubCategory('Todos')
      }
    }
  }

  // Normalized expenses resolving nature, status, and location cleanly
  const normalizedExpenses = useMemo(
    () =>
      expenses.map((exp) => ({
        ...exp,
        resolvedNature: resolveExpenseNature(exp),
        resolvedStatus: (exp.status || 'Pagado') as ExpenseStatus,
        resolvedCompanyCategory:
          exp.companyCategory || mapExpenseNatureToCompanyCategory(resolveExpenseNature(exp)),
      })),
    [expenses]
  )

  // Summary metrics excluding Cancelado (respects summaryPeriod when inside Resumen y control)
  const summaryStats = useMemo(() => {
    const totals: Record<
      ExpenseNature,
      { total: number; count: number; subtotal: number; paidTotal: number; pendingTotal: number }
    > = {
      Administrativo: { total: 0, count: 0, subtotal: 0, paidTotal: 0, pendingTotal: 0 },
      Operativo: { total: 0, count: 0, subtotal: 0, paidTotal: 0, pendingTotal: 0 },
      Financiero: { total: 0, count: 0, subtotal: 0, paidTotal: 0, pendingTotal: 0 },
      'Costo de venta': { total: 0, count: 0, subtotal: 0, paidTotal: 0, pendingTotal: 0 },
      Impuestos: { total: 0, count: 0, subtotal: 0, paidTotal: 0, pendingTotal: 0 },
    }
    const subStats: Record<string, { total: number; count: number }> = {}
    ALL_SUBCATEGORIES.forEach((s) => {
      subStats[s] = { total: 0, count: 0 }
    })

    const locationMap = new Map<
      string,
      {
        locationId: string
        locationName: string
        locationCode: string
        total: number
        fixedTotal: number
        variableTotal: number
        adminTotal: number
        opexTotal: number
        financialTotal: number
        count: number
      }
    >()
    const deptMap = new Map<
      string,
      {
        departmentId?: string
        departmentName: string
        costCenter: string
        leader: string
        total: number
        fixedTotal: number
        variableTotal: number
        adminTotal: number
        opexTotal: number
        financialTotal: number
        paidTotal: number
        pendingTotal: number
        count: number
      }
    >()
    const monthTotals = new Map<
      string,
      { total: number; fixed: number; variable: number; count: number }
    >()

    let grandTotal = 0
    let grandSubtotal = 0
    let grandTax = 0
    let activeCount = 0
    let pendingAmount = 0
    let pendingCount = 0
    let paidAmount = 0
    let fixedTotal = 0
    let variableTotal = 0
    let cancelledCount = 0

    const periodFilterActive = effectiveSection === 'Resumen y control' && summaryPeriod !== 'all'

    // Pre-pass month buckets across all active expenses for MoM comparison and trend chart
    normalizedExpenses.forEach((exp) => {
      if (exp.resolvedStatus === 'Cancelado') return
      const mk = parseErpDateMonthKey(exp.date)
      if (!mk) return
      const bucket = monthTotals.get(mk) || { total: 0, fixed: 0, variable: 0, count: 0 }
      bucket.total += exp.total
      bucket.count += 1
      if (exp.costBehavior === 'Variable') bucket.variable += exp.total
      else bucket.fixed += exp.total
      monthTotals.set(mk, bucket)
    })

    normalizedExpenses.forEach((exp) => {
      if (exp.resolvedStatus === 'Cancelado') {
        if (!periodFilterActive || parseErpDateMonthKey(exp.date) === summaryPeriod) {
          cancelledCount += 1
        }
        return
      }
      const expMonth = parseErpDateMonthKey(exp.date)
      if (periodFilterActive && expMonth !== summaryPeriod) return

      activeCount += 1
      const nat = exp.resolvedNature
      totals[nat].total += exp.total
      totals[nat].subtotal += exp.amount
      totals[nat].count += 1
      if (exp.resolvedStatus === 'Pagado') {
        totals[nat].paidTotal += exp.total
        paidAmount += exp.total
      } else {
        totals[nat].pendingTotal += exp.total
        pendingAmount += exp.total
        pendingCount += 1
      }

      const isVar = exp.costBehavior === 'Variable'
      if (isVar) variableTotal += exp.total
      else fixedTotal += exp.total

      // Cost center: Location
      const locId = exp.locationId || 'loc_1'
      const matchedLoc = locations.find((l) => l.id === locId)
      const locEntry = locationMap.get(locId) || {
        locationId: locId,
        locationName: matchedLoc?.name || exp.locationName || 'Sede Corporativa Reforma',
        locationCode: matchedLoc?.code || 'CORP-CDMX',
        total: 0,
        fixedTotal: 0,
        variableTotal: 0,
        adminTotal: 0,
        opexTotal: 0,
        financialTotal: 0,
        count: 0,
      }
      locEntry.total += exp.total
      if (isVar) locEntry.variableTotal += exp.total
      else locEntry.fixedTotal += exp.total
      if (nat === 'Financiero') locEntry.financialTotal += exp.total
      else if (nat === 'Administrativo' || nat === 'Impuestos') locEntry.adminTotal += exp.total
      else locEntry.opexTotal += exp.total
      locEntry.count += 1
      locationMap.set(locId, locEntry)

      // Cost center: Department
      const matchedDept = departments.find(
        (d) =>
          (exp.departmentId && d.id === exp.departmentId) ||
          (exp.departmentName && d.name.toLowerCase() === exp.departmentName.toLowerCase())
      )
      const deptKey = matchedDept?.name || exp.departmentName || 'General'
      const deptEntry = deptMap.get(deptKey) || {
        departmentId: matchedDept?.id || exp.departmentId,
        departmentName: deptKey,
        costCenter: matchedDept?.costCenter || exp.costCenter || 'CC-GEN',
        leader: matchedDept?.leader || '—',
        total: 0,
        fixedTotal: 0,
        variableTotal: 0,
        adminTotal: 0,
        opexTotal: 0,
        financialTotal: 0,
        paidTotal: 0,
        pendingTotal: 0,
        count: 0,
      }
      deptEntry.total += exp.total
      if (isVar) deptEntry.variableTotal += exp.total
      else deptEntry.fixedTotal += exp.total
      if (nat === 'Financiero') deptEntry.financialTotal += exp.total
      else if (nat === 'Administrativo' || nat === 'Impuestos') deptEntry.adminTotal += exp.total
      else deptEntry.opexTotal += exp.total
      if (exp.resolvedStatus === 'Pagado') deptEntry.paidTotal += exp.total
      else deptEntry.pendingTotal += exp.total
      deptEntry.count += 1
      deptMap.set(deptKey, deptEntry)

      if (!subStats[exp.category]) subStats[exp.category] = { total: 0, count: 0 }
      subStats[exp.category].total += exp.total
      subStats[exp.category].count += 1
      grandTotal += exp.total
      grandSubtotal += exp.amount
      grandTax += exp.tax
    })

    let topRubroName = 'N/A'
    let topRubroAmount = 0
    Object.entries(subStats).forEach(([rubro, stat]) => {
      if (stat.total > topRubroAmount) {
        topRubroAmount = stat.total
        topRubroName = rubro
      }
    })

    const sortedMonthsDesc = Array.from(monthTotals.keys()).sort((a, b) => b.localeCompare(a))
    const targetMonthKey = periodFilterActive ? summaryPeriod : sortedMonthsDesc[0] || getTodayIso().slice(0, 7)
    const targetIdx = sortedMonthsDesc.indexOf(targetMonthKey)
    const prevMonthKey =
      targetIdx >= 0 && targetIdx + 1 < sortedMonthsDesc.length
        ? sortedMonthsDesc[targetIdx + 1]
        : sortedMonthsDesc.find((m) => m < targetMonthKey) || ''

    const currentMonthTotal = monthTotals.get(targetMonthKey)?.total || 0
    const prevMonthTotal = prevMonthKey ? monthTotals.get(prevMonthKey)?.total || 0 : 0
    const momDeltaPct =
      prevMonthTotal > 0 ? ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100 : null

    const opexGroupTotal = totals.Operativo.total + totals['Costo de venta'].total
    const adminGroupTotal = totals.Administrativo.total + totals.Impuestos.total
    const financialGroupTotal = totals.Financiero.total

    const generalActiveBudgets = budgets.filter(
      (b) => b.active && !b.category && !b.departmentName
    )
    const effectiveBudgetRules =
      generalActiveBudgets.length > 0 ? generalActiveBudgets : budgets.filter((b) => b.active)
    const monthlyBudgetTotal = effectiveBudgetRules.reduce((s, b) => s + b.monthlyLimit, 0)
    const activeMonthCount = periodFilterActive ? 1 : Math.max(1, monthTotals.size)
    const periodBudgetTotal = monthlyBudgetTotal * activeMonthCount
    const savingsVsBudget = periodBudgetTotal - grandTotal
    const savingsPct = periodBudgetTotal > 0 ? (savingsVsBudget / periodBudgetTotal) * 100 : 0
    const budgetUsagePct = periodBudgetTotal > 0 ? (grandTotal / periodBudgetTotal) * 100 : 0
    const weightedWarningPct =
      monthlyBudgetTotal > 0
        ? effectiveBudgetRules.reduce(
            (s, b) => s + b.monthlyLimit * (b.warningThresholdPct || 80),
            0
          ) / monthlyBudgetTotal
        : 80
    const weightedCriticalPct =
      monthlyBudgetTotal > 0
        ? effectiveBudgetRules.reduce(
            (s, b) => s + b.monthlyLimit * (b.criticalThresholdPct ?? 95),
            0
          ) / monthlyBudgetTotal
        : 95
    const budgetHealthState: 'ok' | 'warning' | 'critical' | 'exceeded' =
      periodBudgetTotal <= 0
        ? 'ok'
        : budgetUsagePct >= 100
          ? 'exceeded'
          : budgetUsagePct >= weightedCriticalPct
            ? 'critical'
            : budgetUsagePct >= weightedWarningPct
              ? 'warning'
              : 'ok'

    const headroomAmount = Math.max(0, periodBudgetTotal - grandTotal)
    const headroomPct = periodBudgetTotal > 0 ? Math.max(0, 100 - budgetUsagePct) : 0
    const headroomToWarningAmount = Math.max(
      0,
      periodBudgetTotal * (weightedWarningPct / 100) - grandTotal
    )
    const totalBankBalance = bankAccounts.reduce((s, b) => s + (Number(b.balance) || 0), 0)
    const netTreasuryCushion = totalBankBalance - pendingAmount

    const sortedMonthEntries = Array.from(monthTotals.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    )
    const monthlyTrendData = sortedMonthEntries.map(([mk, vals], idx) => {
      const [y, m] = mk.split('-')
      const mName = MONTHS_ES[Math.max(0, Math.min(11, Number(m) - 1))] || m
      const prevVals = idx > 0 ? sortedMonthEntries[idx - 1][1] : null
      const momPct =
        prevVals && prevVals.total > 0
          ? ((vals.total - prevVals.total) / prevVals.total) * 100
          : null
      const ahorro = monthlyBudgetTotal - vals.total
      const ejercidoPct =
        monthlyBudgetTotal > 0 ? (vals.total / monthlyBudgetTotal) * 100 : 0
      const margenPct =
        monthlyBudgetTotal > 0 ? Math.max(0, 100 - ejercidoPct) : 0
      return {
        monthKey: mk,
        month: `${mName} ${y}`,
        Fijos: Math.round(vals.fixed),
        Variables: Math.round(vals.variable),
        Total: Math.round(vals.total),
        Presupuesto: Math.round(monthlyBudgetTotal),
        Ahorro: Math.round(ahorro),
        EjercidoPct: Number(ejercidoPct.toFixed(1)),
        MargenPct: Number(margenPct.toFixed(1)),
        momPct,
        count: vals.count,
      }
    })

    const byLocation = Array.from(locationMap.values())
      .map((item) => ({
        ...item,
        sharePct: grandTotal > 0 ? (item.total / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)

    const byDepartment = Array.from(deptMap.values())
      .map((item) => ({
        ...item,
        sharePct: grandTotal > 0 ? (item.total / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)

    return {
      totals,
      subStats,
      grandTotal,
      grandSubtotal,
      grandTax,
      activeCount,
      avgTicket: activeCount > 0 ? grandTotal / activeCount : 0,
      pendingAmount,
      pendingCount,
      paidAmount,
      paidPct: grandTotal > 0 ? (paidAmount / grandTotal) * 100 : 0,
      pendingPct: grandTotal > 0 ? (pendingAmount / grandTotal) * 100 : 0,
      fixedTotal,
      variableTotal,
      fixedPct: grandTotal > 0 ? (fixedTotal / grandTotal) * 100 : 0,
      variablePct: grandTotal > 0 ? (variableTotal / grandTotal) * 100 : 0,
      opexGroupTotal,
      adminGroupTotal,
      financialGroupTotal,
      opexPct: grandTotal > 0 ? (opexGroupTotal / grandTotal) * 100 : 0,
      adminPct: grandTotal > 0 ? (adminGroupTotal / grandTotal) * 100 : 0,
      financialPct: grandTotal > 0 ? (financialGroupTotal / grandTotal) * 100 : 0,
      currentMonthLabel: formatMonthKeyLabel(targetMonthKey),
      prevMonthLabel: prevMonthKey ? formatMonthKeyLabel(prevMonthKey) : '',
      currentMonthTotal,
      prevMonthTotal,
      momDeltaPct,
      activeMonthCount,
      monthlyBudgetTotal,
      periodBudgetTotal,
      activeBudgetCount: effectiveBudgetRules.length,
      savingsVsBudget,
      savingsPct,
      budgetUsagePct,
      weightedWarningPct,
      weightedCriticalPct,
      budgetHealthState,
      headroomAmount,
      headroomPct,
      headroomToWarningAmount,
      netTreasuryCushion,
      monthlyTrendData,
      byLocation,
      byDepartment,
      cancelledCount,
      topRubroName,
      topRubroAmount,
    }
  }, [normalizedExpenses, locations, departments, effectiveSection, summaryPeriod, budgets, bankAccounts])

  const availableBudgetMonths = useMemo(() => {
    const keys = new Set<string>()
    const todayIso = getTodayIso()
    keys.add(todayIso.slice(0, 7))
    normalizedExpenses.forEach((e) => {
      const mk = parseErpDateMonthKey(e.date)
      if (mk) keys.add(mk)
    })
    return Array.from(keys).sort((a, b) => b.localeCompare(a))
  }, [normalizedExpenses])

  // Budget health evaluation with dual 80% (preventive) & 95% (critical) thresholds
  const budgetStatuses = useMemo(() => {
    return budgets.map((rule) => {
      const warningPct = rule.warningThresholdPct || 80
      const criticalPct = rule.criticalThresholdPct ?? 95
      const alertsEnabled = rule.alertsEnabled !== false
      const spent = normalizedExpenses
        .filter((e) => e.resolvedStatus !== 'Cancelado')
        .filter(
          (e) =>
            budgetPeriodMonth === 'all-active' ||
            parseErpDateMonthKey(e.date) === budgetPeriodMonth
        )
        .filter((e) => e.resolvedNature === rule.nature)
        .filter((e) => !rule.category || e.category === rule.category)
        .filter((e) => !rule.departmentName || e.departmentName === rule.departmentName)
        .reduce((s, e) => s + e.total, 0)
      const pct = rule.monthlyLimit > 0 ? (spent / rule.monthlyLimit) * 100 : 0
      const rawSeverity: 'ok' | 'warning' | 'critical' | 'exceeded' =
        pct >= 100
          ? 'exceeded'
          : pct >= criticalPct
            ? 'critical'
            : pct >= warningPct
              ? 'warning'
              : 'ok'
      const state: 'ok' | 'warning' | 'critical' | 'exceeded' =
        !rule.active || !alertsEnabled ? 'ok' : rawSeverity
      return {
        ...rule,
        warningPct,
        criticalPct,
        alertsEnabled,
        spent,
        remaining: rule.monthlyLimit - spent,
        pct,
        rawSeverity,
        state,
      }
    })
  }, [budgets, normalizedExpenses, budgetPeriodMonth])

  const alertBudgets = useMemo(
    () =>
      budgetStatuses.filter(
        (b) =>
          b.active &&
          b.alertsEnabled &&
          (b.state === 'warning' || b.state === 'critical' || b.state === 'exceeded')
      ),
    [budgetStatuses]
  )

  const budgetSummaryCounts = useMemo(() => {
    let ok = 0
    let warning = 0
    let critical = 0
    let exceeded = 0
    budgetStatuses.forEach((b) => {
      if (!b.active) return
      if (b.state === 'exceeded') exceeded += 1
      else if (b.state === 'critical') critical += 1
      else if (b.state === 'warning') warning += 1
      else ok += 1
    })
    return { ok, warning, critical, exceeded }
  }, [budgetStatuses])

  const visibleSubCategories = useMemo(() => {
    const pool =
      selectedNature === 'Todas' ? ALL_SUBCATEGORIES : getNatureMeta(selectedNature).subCategories
    return pool.filter((sub) => {
      if (selectedNature === 'Todas') return (summaryStats.subStats[sub]?.count || 0) > 0
      return true
    })
  }, [selectedNature, summaryStats.subStats])

  const availablePaymentMethods = useMemo(() => {
    const set = new Set<string>([
      'Transferencia SPEI',
      'Domiciliación bancaria',
      'Tarjeta corporativa',
      'Cargo bancario automático',
      'Caja chica',
    ])
    normalizedExpenses.forEach((e) => {
      if (e.paymentMethod) set.add(e.paymentMethod)
    })
    return Array.from(set)
  }, [normalizedExpenses])

  // Filtered & sorted list for ledger
  const filteredExpenses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const list = normalizedExpenses.filter((exp) => {
      if (selectedNature !== 'Todas' && exp.resolvedNature !== selectedNature) return false
      if (selectedSubCategory !== 'Todos' && exp.category !== selectedSubCategory) return false
      if (selectedStatus !== 'Todos' && exp.resolvedStatus !== selectedStatus) return false
      const behavior = exp.costBehavior || 'Fijo'
      if (selectedBehavior !== 'Todos' && behavior !== selectedBehavior) return false
      if (selectedLocationId !== 'Todas' && (exp.locationId || 'loc_1') !== selectedLocationId) {
        return false
      }
      if (selectedDepartment !== 'Todos') {
        const matchedSelectedDept = departments.find((d) => d.name === selectedDepartment)
        const expDeptName = exp.departmentName || 'General'
        const matchesDept =
          expDeptName === selectedDepartment ||
          (matchedSelectedDept && exp.departmentId === matchedSelectedDept.id)
        if (!matchesDept) return false
      }
      if (selectedPaymentMethod !== 'Todos' && exp.paymentMethod !== selectedPaymentMethod) {
        return false
      }
      const isFiscallyVerified = Boolean(exp.referenceDoc?.trim() && exp.issuerRfc?.trim())
      if (fiscalFilter === 'Comprobado' && !isFiscallyVerified) return false
      if (fiscalFilter === 'Sin comprobante' && isFiscallyVerified) return false

      if (dateFrom || dateTo) {
        const expIso = parseErpDateToIso(exp.date)
        if (!expIso) return false
        if (dateFrom && expIso < dateFrom) return false
        if (dateTo && expIso > dateTo) return false
      }

      if (!q) return true
      return (
        exp.folio.toLowerCase().includes(q) ||
        exp.description.toLowerCase().includes(q) ||
        exp.beneficiary.toLowerCase().includes(q) ||
        exp.category.toLowerCase().includes(q) ||
        exp.resolvedNature.toLowerCase().includes(q) ||
        (exp.locationName && exp.locationName.toLowerCase().includes(q)) ||
        (exp.accountCode && exp.accountCode.toLowerCase().includes(q)) ||
        (exp.referenceDoc && exp.referenceDoc.toLowerCase().includes(q)) ||
        (exp.issuerRfc && exp.issuerRfc.toLowerCase().includes(q)) ||
        (exp.departmentName && exp.departmentName.toLowerCase().includes(q)) ||
        exp.user.toLowerCase().includes(q)
      )
    })

    return [...list].sort((a, b) => {
      if (sortOrder === 'total_desc') return b.total - a.total
      if (sortOrder === 'folio_asc') return a.folio.localeCompare(b.folio)
      const isoA = parseErpDateToIso(a.date) || ''
      const isoB = parseErpDateToIso(b.date) || ''
      if (sortOrder === 'date_asc') {
        const cmp = isoA.localeCompare(isoB)
        return cmp !== 0 ? cmp : a.folio.localeCompare(b.folio)
      }
      const cmp = isoB.localeCompare(isoA)
      return cmp !== 0 ? cmp : b.folio.localeCompare(a.folio)
    })
  }, [
    normalizedExpenses,
    selectedNature,
    selectedSubCategory,
    selectedStatus,
    selectedBehavior,
    selectedLocationId,
    selectedDepartment,
    selectedPaymentMethod,
    fiscalFilter,
    dateFrom,
    dateTo,
    sortOrder,
    searchQuery,
  ])

  const filteredTotals = useMemo(() => {
    const countable =
      selectedStatus === 'Cancelado'
        ? filteredExpenses
        : filteredExpenses.filter((e) => e.resolvedStatus !== 'Cancelado')
    return countable.reduce(
      (acc, exp) => {
        acc.subtotal += exp.amount
        acc.tax += exp.tax
        acc.total += exp.total
        acc.count += 1
        if (exp.referenceDoc?.trim() && exp.issuerRfc?.trim()) {
          acc.verifiedCount += 1
        }
        return acc
      },
      { subtotal: 0, tax: 0, total: 0, count: 0, verifiedCount: 0 }
    )
  }, [filteredExpenses, selectedStatus])

  const parsedAmount = Math.max(0, Number(amount) || 0)
  const previewTax =
    taxMode === '16'
      ? Number((parsedAmount * standardVatRate).toFixed(2))
      : taxMode === 'custom'
        ? Number(Math.max(0, Number(customTaxAmount) || 0).toFixed(2))
        : 0
  const previewTotal = Number((parsedAmount + previewTax).toFixed(2))

  const handleRegisterExpense = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canCreate) {
      toast.warning('Tu rol actual no tiene permisos para registrar gastos.', 'Permiso requerido')
      return
    }
    if (!beneficiary.trim() || !description.trim()) {
      toast.error('Ingresa el beneficiario y la descripción del gasto.', 'Campos requeridos')
      return
    }
    if (parsedAmount <= 0) {
      toast.warning('El importe base debe ser mayor a cero.', 'Importe inválido')
      return
    }

    const selectedBank = bankAccounts.find((b) => b.id === bankAccountId) || bankAccounts[0]
    if (initialStatus === 'Pagado') {
      if (!selectedBank) {
        toast.error('No hay una cuenta bancaria disponible para registrar el cargo.', 'Cuenta requerida')
        return
      }
      if (selectedBank.balance < previewTotal) {
        toast.warning(
          `Saldo insuficiente en ${selectedBank.bankName} (Disponible: ${money(selectedBank.balance)}). Puedes registrarlo como Pendiente.`,
          'Saldo insuficiente'
        )
        return
      }
    }

    const chosenLocation = locations.find((l) => l.id === locationId)
    const chosenDept = departments.find((d) => d.name === departmentName)
    const chosenAccount = chartAccounts.find((a) => a.code === accountCode)
    const nextSeq = expenses.length + 1
    const folio = `GST-2026-${String(nextSeq).padStart(3, '0')}`
    const formattedDate = formatIsoToErpDate(expenseDateIso)
    const derivedCompanyCategory = mapExpenseNatureToCompanyCategory(expenseNature)

    const newExpense: ExpenseRecord = {
      id: `exp_${Date.now()}`,
      folio,
      date: formattedDate,
      category: subCategory,
      companyCategory: derivedCompanyCategory,
      expenseNature,
      status: initialStatus,
      costBehavior,
      departmentId: chosenDept?.id,
      departmentName: chosenDept?.name || departmentName || undefined,
      costCenter: chosenDept?.costCenter,
      locationId: chosenLocation?.id || locationId || undefined,
      locationName: chosenLocation?.name || undefined,
      accountCode: chosenAccount?.code || accountCode || undefined,
      accountName: chosenAccount?.name || undefined,
      bankAccountName: selectedBank?.bankName,
      description: description.trim(),
      beneficiary: beneficiary.trim(),
      amount: parsedAmount,
      tax: previewTax,
      total: previewTotal,
      paymentMethod,
      referenceDoc: referenceDoc.trim() || undefined,
      issuerRfc: issuerRfc.trim().toUpperCase() || undefined,
      user: activeUserName || 'Administrador General',
    }

    onAddExpense(newExpense)

    if (initialStatus === 'Pagado' && selectedBank) {
      onUpdateBankAccountBalance(selectedBank.id, -previewTotal)
      const newTxn: PaymentTransaction = {
        id: `txn_${Date.now()}`,
        folio: `PAG-2026-${String(Math.floor(100 + Math.random() * 900))}`,
        date: formattedDate,
        type: 'Gasto operativo',
        entityName: beneficiary.trim(),
        reference: `${expenseNature} · ${referenceDoc.trim() || folio} · ${description.trim()}`,
        amount: previewTotal,
        method: paymentMethod,
        account: selectedBank.bankName,
      }
      onAddTransaction(newTxn)
      toast.success(
        `${folio} (${expenseNature}) por ${money(previewTotal)} pagado y debitado de ${selectedBank.bankName}.`,
        'Gasto registrado y pagado'
      )
    } else {
      toast.success(
        `${folio} (${expenseNature}) por ${money(previewTotal)} registrado como Pendiente de aprobación/pago.`,
        'Póliza pendiente registrada'
      )
    }

    // Immediate visual threshold alert if expense pushes nature monthly budget >= 80%, >= 95%, or >= 100%
    const matchingRule = budgets.find(
      (b) => b.active && b.alertsEnabled !== false && b.nature === expenseNature && !b.category
    )
    if (matchingRule && matchingRule.monthlyLimit > 0) {
      const expenseMonthKey = expenseDateIso ? expenseDateIso.slice(0, 7) : ''
      const currentSpent = normalizedExpenses
        .filter((e) => e.resolvedStatus !== 'Cancelado' && e.resolvedNature === expenseNature)
        .filter((e) => !expenseMonthKey || parseErpDateMonthKey(e.date) === expenseMonthKey)
        .reduce((s, e) => s + e.total, 0)
      const nextSpent = currentSpent + previewTotal
      const nextPct = (nextSpent / matchingRule.monthlyLimit) * 100
      const warnPct = matchingRule.warningThresholdPct || 80
      const critPct = matchingRule.criticalThresholdPct ?? 95
      if (nextPct >= 100) {
        toast.error(
          `${expenseNature} alcanzó ${nextPct.toFixed(1)}% del presupuesto mensual (${money(nextSpent)} / ${money(matchingRule.monthlyLimit)}).`,
          'Presupuesto excedido (≥100%)'
        )
      } else if (nextPct >= critPct) {
        toast.error(
          `${expenseNature} alcanzó ${nextPct.toFixed(1)}% del límite mensual (umbral crítico ≥${critPct}%).`,
          `Alerta crítica ${critPct}%`
        )
      } else if (nextPct >= warnPct) {
        toast.warning(
          `${expenseNature} alcanzó ${nextPct.toFixed(1)}% del límite mensual (umbral preventivo ≥${warnPct}%).`,
          `Alerta preventiva ${warnPct}%`
        )
      }
    }

    setBeneficiary('')
    setDescription('')
    setReferenceDoc('')
    setIssuerRfc('')
    setAmount('4500')
    setTaxMode('16')
    setCustomTaxAmount('0')
    setIsRegisterOpen(false)
  }

  const openExpenseDetailModal = (exp: ExpenseRecord) => {
    const resolvedNat = resolveExpenseNature(exp)
    setConfirmingDelete(false)
    setIsEditingViewing(false)
    setEditNature(resolvedNat)
    setEditCategory(exp.category)
    setEditBehavior(exp.costBehavior || 'Fijo')
    setEditLocationId(exp.locationId || locations[0]?.id || 'loc_1')
    setEditDepartment(exp.departmentName || departments[0]?.name || 'General')
    setEditAccountCode(exp.accountCode || getNatureMeta(resolvedNat).defaultAccountCode)
    setEditPaymentMethod(exp.paymentMethod || 'Transferencia SPEI')
    setEditReferenceDoc(exp.referenceDoc || '')
    setEditIssuerRfc(exp.issuerRfc || '')
    setEditDescription(exp.description)
    const matchedBank =
      bankAccounts.find((b) => b.bankName === exp.bankAccountName) || bankAccounts[0]
    setPayBankAccountId(matchedBank?.id || '')
    setViewingExpense(exp)
  }

  const handleSaveViewingEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!viewingExpense || !onUpdateExpense || !canEdit) return
    const chosenLoc = locations.find((l) => l.id === editLocationId)
    const chosenDept = departments.find((d) => d.name === editDepartment)
    const chosenAcc = chartAccounts.find((a) => a.code === editAccountCode)
    const updated: ExpenseRecord = {
      ...viewingExpense,
      expenseNature: editNature,
      companyCategory: mapExpenseNatureToCompanyCategory(editNature),
      category: editCategory,
      costBehavior: editBehavior,
      locationId: chosenLoc?.id || editLocationId,
      locationName: chosenLoc?.name || viewingExpense.locationName,
      departmentId: chosenDept?.id || viewingExpense.departmentId,
      departmentName: chosenDept?.name || editDepartment,
      costCenter: chosenDept?.costCenter || viewingExpense.costCenter,
      accountCode: chosenAcc?.code || editAccountCode,
      accountName: chosenAcc?.name || viewingExpense.accountName,
      paymentMethod: editPaymentMethod || viewingExpense.paymentMethod,
      referenceDoc: editReferenceDoc.trim() || undefined,
      issuerRfc: editIssuerRfc.trim().toUpperCase() || undefined,
      description: editDescription.trim() || viewingExpense.description,
    }
    onUpdateExpense(updated)
    setViewingExpense(updated)
    setIsEditingViewing(false)
  }

  const handleTransitionStatus = (
    exp: ExpenseRecord,
    nextStatus: ExpenseStatus,
    explicitBankId?: string
  ) => {
    if (!canEdit) {
      toast.warning('Tu rol no tiene permisos para cambiar el estado de pólizas.', 'Permiso requerido')
      return
    }
    if (onUpdateExpenseStatus) {
      onUpdateExpenseStatus(exp.id, nextStatus, explicitBankId)
    }
    if (viewingExpense?.id === exp.id) {
      const assignedBank =
        explicitBankId && nextStatus === 'Pagado'
          ? bankAccounts.find((b) => b.id === explicitBankId)?.bankName
          : undefined
      setViewingExpense((prev) =>
        prev
          ? {
              ...prev,
              status: nextStatus,
              bankAccountName: assignedBank || prev.bankAccountName,
            }
          : null
      )
    }
  }

  const loadBudgetFormForNature = (nature: ExpenseNature) => {
    setNewBudgetNature(nature)
    const existing = budgets.find(
      (b) => b.nature === nature && !b.category && !b.departmentName
    )
    if (existing) {
      setNewBudgetLimit(String(existing.monthlyLimit))
      setNewBudgetThreshold(String(existing.warningThresholdPct || 80))
      setNewBudgetCritical(String(existing.criticalThresholdPct ?? 95))
      setNewBudgetAlertsEnabled(existing.alertsEnabled !== false)
    } else {
      setNewBudgetLimit('20000')
      setNewBudgetThreshold('80')
      setNewBudgetCritical('95')
      setNewBudgetAlertsEnabled(true)
    }
  }

  const syncMatrixDrafts = () => {
    const next: Record<
      string,
      { limit: string; warn: string; crit: string; alertsEnabled: boolean; active: boolean }
    > = {}
    EXPENSE_NATURES.forEach((nat) => {
      const rule = budgets.find((b) => b.nature === nat.id && !b.category && !b.departmentName)
      next[nat.id] = {
        limit: String(rule?.monthlyLimit ?? 20000),
        warn: String(rule?.warningThresholdPct ?? 80),
        crit: String(rule?.criticalThresholdPct ?? 95),
        alertsEnabled: rule ? rule.alertsEnabled !== false : true,
        active: rule ? rule.active : false,
      }
    })
    setMatrixEdits(next)
  }

  const handleSaveBudgetMatrix = () => {
    if (!onSaveBudget) return
    let savedCount = 0
    EXPENSE_NATURES.forEach((nat, idx) => {
      const draft = matrixEdits[nat.id]
      if (!draft) return
      const existing = budgets.find((b) => b.nature === nat.id && !b.category && !b.departmentName)
      const limit = Number(draft.limit)
      const warn = Math.max(10, Math.min(98, Number(draft.warn) || 80))
      const crit = Math.max(warn + 1, Math.min(100, Number(draft.crit) || 95))
      if (!Number.isFinite(limit) || limit <= 0) return
      onSaveBudget({
        id: existing?.id || `bud_${nat.id.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}_${idx}`,
        nature: nat.id,
        monthlyLimit: limit,
        warningThresholdPct: warn,
        criticalThresholdPct: crit,
        alertsEnabled: draft.alertsEnabled,
        active: draft.active,
      })
      savedCount += 1
    })
    if (savedCount > 0) {
      toast.success(
        `Se actualizaron ${savedCount} presupuestos mensuales por naturaleza y sus umbrales visuales.`,
        'Matriz guardada'
      )
    }
  }

  const handleApplyGlobalThresholds = (warnVal: number, critVal: number, enableAlerts: boolean) => {
    if (!onSaveBudget) return
    const safeWarn = Math.max(10, Math.min(98, warnVal || 80))
    const safeCrit = Math.max(safeWarn + 1, Math.min(100, critVal || 95))
    budgets.forEach((rule) => {
      onSaveBudget({
        ...rule,
        warningThresholdPct: safeWarn,
        criticalThresholdPct: safeCrit,
        alertsEnabled: enableAlerts,
        active: true,
      })
    })
    setGlobalWarnDraft(String(safeWarn))
    setGlobalCritDraft(String(safeCrit))
    if (budgetViewMode === 'matrix') {
      setMatrixEdits((prev) => {
        const updated = { ...prev }
        Object.keys(updated).forEach((k) => {
          updated[k] = {
            ...updated[k],
            warn: String(safeWarn),
            crit: String(safeCrit),
            alertsEnabled: enableAlerts,
            active: true,
          }
        })
        return updated
      })
    }
    toast.success(
      enableAlerts
        ? `Alertas visuales automáticas configuradas en ${safeWarn}% (preventiva) y ${safeCrit}% (crítica) para todas las naturalezas.`
        : 'Alertas visuales silenciadas temporalmente en todas las naturalezas.',
      'Configuración de alertas aplicada'
    )
  }

  const handleCreateBudgetSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!onSaveBudget) return
    const limit = Number(newBudgetLimit)
    const warning = Math.max(10, Math.min(98, Number(newBudgetThreshold) || 80))
    const critical = Math.max(warning + 1, Math.min(100, Number(newBudgetCritical) || 95))
    if (!Number.isFinite(limit) || limit <= 0) {
      toast.warning('Define un límite mensual mayor a cero.', 'Límite inválido')
      return
    }
    const existingForNature = budgets.find(
      (b) => b.nature === newBudgetNature && !b.category && !b.departmentName
    )
    onSaveBudget({
      id: existingForNature?.id || `bud_${Date.now()}`,
      nature: newBudgetNature,
      monthlyLimit: limit,
      warningThresholdPct: warning,
      criticalThresholdPct: critical,
      alertsEnabled: newBudgetAlertsEnabled,
      active: true,
    })
    setIsNewBudgetOpen(false)
    toast.success(
      `Presupuesto para ${newBudgetNature}: ${money(limit)}/mes (Alertas: ${warning}% y ${critical}%).`,
      'Presupuesto guardado'
    )
  }

  const handleApplyStandardThresholdsAll = () => {
    handleApplyGlobalThresholds(80, 95, true)
  }

  const resetRecurringForm = () => {
    setEditingRecurringId(null)
    setRecTitle('')
    setRecNature('Administrativo')
    setRecCategory('Arrendamiento')
    setRecBehavior('Fijo')
    setRecBeneficiary('')
    setRecDescription('')
    setRecAmount('5000')
    setRecHasTax(true)
    setRecPaymentMethod('Transferencia SPEI')
    setRecFrequency('Mensual')
    setRecNextRunDate(getTodayIso())
    setRecBankId(bankAccounts[0]?.id || '')
    setRecDepartment(departments.find((d) => d.active)?.name || 'Finanzas y Tesorería')
    setRecLocationId(locations.find((l) => l.active)?.id || 'loc_1')
    setRecAccountCode('6001-001')
  }

  const startEditRecurring = (tpl: RecurringExpenseTemplate) => {
    setEditingRecurringId(tpl.id)
    setRecTitle(tpl.title)
    setRecNature(tpl.nature)
    setRecCategory(tpl.category)
    setRecBehavior(tpl.costBehavior)
    setRecBeneficiary(tpl.beneficiary)
    setRecDescription(tpl.description)
    setRecAmount(String(tpl.amount))
    setRecHasTax(tpl.hasTax)
    setRecPaymentMethod(tpl.paymentMethod || 'Transferencia SPEI')
    setRecFrequency(tpl.frequency)
    setRecNextRunDate(tpl.nextRunDate)
    setRecBankId(tpl.bankAccountId || bankAccounts[0]?.id || '')
    setRecDepartment(tpl.departmentName)
    setRecLocationId(tpl.locationId || locations[0]?.id || 'loc_1')
    setRecAccountCode(tpl.accountCode || getNatureMeta(tpl.nature).defaultAccountCode)
    setIsNewRecurringOpen(true)
  }

  const recurringStats = useMemo(() => {
    const todayIso = getTodayIso()
    const todayMs = new Date(`${todayIso}T12:00:00`).getTime()
    let activeCount = 0
    let pausedCount = 0
    let monthlyCommitment = 0
    let upcomingSoonCount = 0
    const dueNowTemplates: RecurringExpenseTemplate[] = []
    const generatedCounts: Record<string, number> = {}
    let totalGeneratedCount = 0

    normalizedExpenses.forEach((exp) => {
      if (exp.resolvedStatus !== 'Cancelado' && exp.recurrenceId) {
        generatedCounts[exp.recurrenceId] = (generatedCounts[exp.recurrenceId] || 0) + 1
        totalGeneratedCount += 1
      }
    })

    recurringTemplates.forEach((tpl) => {
      if (tpl.active) {
        activeCount += 1
        const estTotal = tpl.hasTax ? tpl.amount * (1 + standardVatRate) : tpl.amount
        const mult =
          tpl.frequency === 'Quincenal' ? 2 : tpl.frequency === 'Anual' ? 1 / 12 : 1
        monthlyCommitment += estTotal * mult

        if (tpl.nextRunDate <= todayIso) {
          dueNowTemplates.push(tpl)
        } else {
          const runMs = new Date(`${tpl.nextRunDate}T12:00:00`).getTime()
          const diffDays = Math.ceil((runMs - todayMs) / (1000 * 60 * 60 * 24))
          if (diffDays >= 0 && diffDays <= 7) upcomingSoonCount += 1
        }
      } else {
        pausedCount += 1
      }
    })

    const filteredTemplates = recurringTemplates.filter((tpl) => {
      if (recurringStatusFilter === 'Activas') return tpl.active
      if (recurringStatusFilter === 'Pausadas') return !tpl.active
      return true
    })

    return {
      activeCount,
      pausedCount,
      monthlyCommitment,
      dueNowTemplates,
      upcomingSoonCount,
      generatedCounts,
      totalGeneratedCount,
      filteredTemplates,
      todayIso,
    }
  }, [recurringTemplates, normalizedExpenses, recurringStatusFilter])

  const handleCreateRecurringSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const numAmt = Number(recAmount)
    if (!recTitle.trim() || !recBeneficiary.trim() || !Number.isFinite(numAmt) || numAmt <= 0) {
      toast.warning('Completa título, beneficiario y un importe base válido.', 'Campos requeridos')
      return
    }
    const chosenBank = bankAccounts.find((b) => b.id === recBankId) || bankAccounts[0]
    const chosenLoc = locations.find((l) => l.id === recLocationId)
    const chosenDept = departments.find((d) => d.name === recDepartment)
    const chosenAcc = chartAccounts.find((a) => a.code === recAccountCode)

    const existing = editingRecurringId
      ? recurringTemplates.find((t) => t.id === editingRecurringId)
      : undefined

    const payload: RecurringExpenseTemplate = {
      id: existing?.id || `rec_exp_${Date.now()}`,
      title: recTitle.trim(),
      nature: recNature,
      category: recCategory,
      costBehavior: recBehavior,
      beneficiary: recBeneficiary.trim(),
      description: recDescription.trim() || recTitle.trim(),
      amount: numAmt,
      hasTax: recHasTax,
      paymentMethod: recPaymentMethod || 'Transferencia SPEI',
      bankAccountId: chosenBank?.id || 'bank_1',
      bankAccountName: chosenBank?.bankName || 'BBVA México',
      departmentId: chosenDept?.id,
      departmentName: chosenDept?.name || recDepartment,
      costCenter: chosenDept?.costCenter,
      locationId: chosenLoc?.id,
      locationName: chosenLoc?.name,
      accountCode: chosenAcc?.code || recAccountCode,
      accountName: chosenAcc?.name,
      frequency: recFrequency,
      nextRunDate: recNextRunDate,
      lastGeneratedDate: existing?.lastGeneratedDate,
      active: existing ? existing.active : true,
    }

    if (existing && onUpdateRecurringTemplate) {
      onUpdateRecurringTemplate(payload)
    } else if (onAddRecurringTemplate) {
      onAddRecurringTemplate(payload)
    }

    resetRecurringForm()
    setIsNewRecurringOpen(false)
  }

  const handleGenerateDueRecurringBatch = () => {
    if (recurringStats.dueNowTemplates.length === 0) return
    const dueIds = recurringStats.dueNowTemplates.map((tpl) => tpl.id)
    if (onGenerateRecurringBatch) {
      onGenerateRecurringBatch(dueIds)
      return
    }
    if (!onGenerateRecurringExpense) return
    dueIds.forEach((id) => onGenerateRecurringExpense(id))
    toast.success(
      `Se generaron ${dueIds.length} póliza(s) recurrentes vencidas del periodo.`,
      'Generación asistida completada'
    )
  }

  const handleExportCsv = () => {
    const headers = [
      'Folio',
      'Fecha',
      'Estado',
      'Naturaleza contable',
      'Rubro contable',
      'Comportamiento',
      'Sucursal',
      'Departamento',
      'Centro de costos',
      'Cuenta contable',
      'Descripción',
      'Beneficiario',
      `${countryProfile.taxId.label} emisor`,
      'Forma de pago',
      'Cuenta bancaria',
      'Comprobante',
      'Subtotal',
      countryProfile.vat.label,
      'Total',
      'Responsable',
    ]
    const escapeCell = (val: unknown) => {
      const s = String(val ?? '')
      return `"${s.replace(/"/g, '""')}"`
    }
    const rows = filteredExpenses.map((exp) => [
      exp.folio,
      exp.date,
      exp.resolvedStatus,
      exp.resolvedNature,
      exp.category,
      exp.costBehavior || 'Fijo',
      exp.locationName || 'Matriz',
      exp.departmentName || 'General',
      exp.costCenter ||
        departments.find((d) => d.name === exp.departmentName || d.id === exp.departmentId)
          ?.costCenter ||
        '',
      exp.accountCode ? `${exp.accountCode} ${exp.accountName || ''}`.trim() : '',
      exp.description,
      exp.beneficiary,
      exp.issuerRfc || '',
      exp.paymentMethod,
      exp.bankAccountName || 'Cuenta operativa',
      exp.referenceDoc || '',
      exp.amount.toFixed(2),
      exp.tax.toFixed(2),
      exp.total.toFixed(2),
      exp.user,
    ])
    const csv = '\uFEFF' + [headers, ...rows].map((r) => r.map(escapeCell).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `gastos-empresa-${getTodayIso()}.csv`
    link.click()
    URL.revokeObjectURL(url)
    onExportAudit?.('Histórico de gastos de la empresa', filteredExpenses.length)
    toast.success(`Exportados ${filteredExpenses.length} registros a CSV.`, 'Exportación completada')
  }

  const hasActiveSubFilters =
    selectedNature !== 'Todas' ||
    selectedSubCategory !== 'Todos' ||
    selectedStatus !== 'Todos' ||
    selectedBehavior !== 'Todos' ||
    selectedLocationId !== 'Todas' ||
    selectedDepartment !== 'Todos' ||
    selectedPaymentMethod !== 'Todos' ||
    fiscalFilter !== 'Todos' ||
    dateFrom !== '' ||
    dateTo !== '' ||
    searchQuery.trim() !== ''

  const pendingExpenses = useMemo(
    () => normalizedExpenses.filter((e) => e.resolvedStatus === 'Pendiente' || e.resolvedStatus === 'Aprobado'),
    [normalizedExpenses]
  )

  return (
    <div className="finance-section-container">
      {/* Top-Level Module Header when opened as independent Gastos module */}
      {mode === 'module' && (
        <>
          <div className="crm-heading">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-line" /> AES NEXUS · CONTROL DE EGRESOS Y PRESUPUESTOS
              </div>
              <h1 id="expenses-module-title">Gastos</h1>
              <p>
                Control integral de gastos administrativos, operativos, financieros, costos de venta
                e impuestos, flujo de aprobación, presupuestos mensuales y plantillas recurrentes.
              </p>
            </div>
          </div>

          <nav className="crm-tabs" aria-label="Secciones del módulo de Gastos">
            {allowedSections.includes('Resumen y control') && (
              <button
                type="button"
                className={effectiveSection === 'Resumen y control' ? 'active' : ''}
                onClick={() => goToSection('Resumen y control')}
              >
                Resumen y control <span>{summaryStats.activeCount}</span>
              </button>
            )}
            {allowedSections.includes('Registro y pólizas') && (
              <button
                type="button"
                className={effectiveSection === 'Registro y pólizas' ? 'active' : ''}
                onClick={() => goToSection('Registro y pólizas')}
              >
                Registro y pólizas <span>{expenses.length}</span>
              </button>
            )}
            {allowedSections.includes('Presupuestos y alertas') && (
              <button
                type="button"
                className={effectiveSection === 'Presupuestos y alertas' ? 'active' : ''}
                onClick={() => goToSection('Presupuestos y alertas')}
              >
                Presupuestos y alertas{' '}
                <span>{alertBudgets.length > 0 ? `${alertBudgets.length} alerta(s)` : budgets.length}</span>
              </button>
            )}
            {allowedSections.includes('Gastos recurrentes') && (
              <button
                type="button"
                className={effectiveSection === 'Gastos recurrentes' ? 'active' : ''}
                onClick={() => goToSection('Gastos recurrentes')}
              >
                Gastos recurrentes <span>{recurringTemplates.filter((t) => t.active).length}</span>
              </button>
            )}
          </nav>
        </>
      )}

      {/* Header Strip (always visible for KPI pulse) */}
      <div className="ops-header-strip">
        <div className="ops-header-left">
          <div className="ops-icon-box fin-icon-box">
            <Layers size={20} />
          </div>
          <div>
            <h2>
              {mode === 'module'
                ? effectiveSection === 'Presupuestos y alertas'
                  ? 'Presupuestos mensuales y alertas de sobregiro'
                  : effectiveSection === 'Gastos recurrentes'
                    ? 'Plantillas de gastos recurrentes'
                    : effectiveSection === 'Registro y pólizas'
                      ? 'Registro de egresos y flujo de pólizas'
                      : 'Panorama de gastos y control presupuestal'
                : 'Gastos de la empresa'}
            </h2>
            <p>
              Sincronizado con Contabilidad, Bancos y Estado de Resultados · Pólizas canceladas se
              excluyen automáticamente de totales y márgenes.
            </p>
          </div>
        </div>

        <div className="ops-header-right">
          <div className="ops-stat-item">
            <span className="ops-stat-label">Egresos activos</span>
            <strong className="ops-stat-val text-alert tabular-nums">
              {money(summaryStats.grandTotal)}
            </strong>
          </div>
          <div className="ops-stat-item">
            <span className="ops-stat-label">Por aprobar / pagar</span>
            <strong className="ops-stat-val tabular-nums">
              {money(summaryStats.pendingAmount)} ({summaryStats.pendingCount})
            </strong>
          </div>
          <div className="ops-stat-item">
            <span className="ops-stat-label">Mayor rubro</span>
            <strong className="ops-stat-val tabular-nums" style={{ fontSize: 12 }}>
              <PieChart size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} />
              {summaryStats.topRubroName}
            </strong>
          </div>
        </div>
      </div>

      {/* Inline Sub-View Switcher when rendered inside Finanzas tab */}
      {mode === 'financeTab' && (
        <div className="expenses-embedded-nav">
          <div className="warehouse-tab-selector" role="tablist" aria-label="Vistas de gastos">
            <button
              type="button"
              role="tab"
              aria-selected={embeddedView === 'summary'}
              className={`wh-tab ${embeddedView === 'summary' ? 'active' : ''}`}
              onClick={() => setEmbeddedView('summary')}
            >
              Resumen y KPIs <span className="wh-badge">{summaryStats.activeCount}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={embeddedView === 'ledger'}
              className={`wh-tab ${embeddedView === 'ledger' ? 'active' : ''}`}
              onClick={() => setEmbeddedView('ledger')}
            >
              Registro y pólizas <span className="wh-badge">{expenses.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={embeddedView === 'budgets'}
              className={`wh-tab ${embeddedView === 'budgets' ? 'active' : ''}`}
              onClick={() => setEmbeddedView('budgets')}
            >
              Presupuestos y alertas{' '}
              {alertBudgets.length > 0 && <span className="wh-badge">{alertBudgets.length}</span>}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={embeddedView === 'recurring'}
              className={`wh-tab ${embeddedView === 'recurring' ? 'active' : ''}`}
              onClick={() => setEmbeddedView('recurring')}
            >
              Recurrentes{' '}
              <span className="wh-badge">{recurringTemplates.filter((t) => t.active).length}</span>
            </button>
          </div>
        </div>
      )}

      {/* Overspend & Threshold Alert Banner (80% Preventive / 95% Critical / 100% Exceeded) */}
      {alertBudgets.length > 0 && (
        <div
          className={`expense-alert-banner ${
            alertBudgets.some((b) => b.state === 'exceeded' || b.state === 'critical')
              ? 'is-critical'
              : 'is-warning'
          }`}
          role="status"
        >
          <div className="expense-alert-copy">
            <AlertTriangle size={16} />
            <div>
              <strong>
                {alertBudgets.some((b) => b.state === 'exceeded')
                  ? 'Alerta de presupuesto excedido (≥100%) y umbrales críticos'
                  : alertBudgets.some((b) => b.state === 'critical')
                    ? 'Alerta crítica de consumo presupuestal (≥95%)'
                    : 'Alerta preventiva de consumo presupuestal (≥80%)'}
              </strong>
              <span>
                {alertBudgets
                  .map((b) => {
                    const tierLabel =
                      b.state === 'exceeded'
                        ? 'Excedido ≥100%'
                        : b.state === 'critical'
                          ? `Crítica ≥${b.criticalPct}%`
                          : `Preventiva ≥${b.warningPct}%`
                    return `${b.nature} (${tierLabel}): ${money(b.spent)} / ${money(b.monthlyLimit)} (${b.pct.toFixed(1)}%)`
                  })
                  .join(' · ')}
              </span>
            </div>
          </div>
          {effectiveSection !== 'Presupuestos y alertas' && (
            <button
              type="button"
              className="button button-secondary"
              onClick={() => goToSection('Presupuestos y alertas')}
            >
              Configurar presupuestos y alertas
            </button>
          )}
        </div>
      )}

      {/* ================================================================
          SECTION 1: PRESUPUESTOS Y ALERTAS
          ================================================================ */}
      {effectiveSection === 'Presupuestos y alertas' && (
        <section className="expense-subview-section">
          <div className="ops-toolbar">
            <div>
              <h3 className="expense-section-title">
                Presupuestos mensuales y alertas visuales automáticas (80% y 95%)
              </h3>
              <p className="expense-section-subtitle">
                Define límites mensuales por naturaleza de gasto y configura alertas automáticas
                cuando el consumo alcance el umbral preventivo (80%) y crítico (95%).
              </p>
            </div>
            <div className="ops-actions-group">
              <div className="expense-trend-mode-tabs" role="tablist" aria-label="Vista de presupuestos">
                <button
                  type="button"
                  role="tab"
                  aria-selected={budgetViewMode === 'cards'}
                  className={budgetViewMode === 'cards' ? 'active' : ''}
                  onClick={() => setBudgetViewMode('cards')}
                >
                  Tarjetas de control
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={budgetViewMode === 'matrix'}
                  className={budgetViewMode === 'matrix' ? 'active' : ''}
                  onClick={() => {
                    syncMatrixDrafts()
                    setBudgetViewMode('matrix')
                  }}
                >
                  Matriz por naturaleza
                </button>
              </div>
              <select
                className="company-expense-behavior-select"
                aria-label="Periodo de consumo presupuestal"
                value={budgetPeriodMonth}
                onChange={(e) => setBudgetPeriodMonth(e.target.value)}
              >
                <option value="all-active">Periodo: Ciclo vigente (activos)</option>
                {availableBudgetMonths.map((mk) => (
                  <option key={mk} value={mk}>
                    Mes: {formatMonthKeyLabel(mk)}
                  </option>
                ))}
              </select>
              {canEdit && onSaveBudget && (
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => {
                    if (!isNewBudgetOpen) {
                      loadBudgetFormForNature(newBudgetNature)
                    }
                    setIsNewBudgetOpen((prev) => !prev)
                  }}
                >
                  {isNewBudgetOpen ? <X size={14} /> : <Plus size={14} />}
                  {isNewBudgetOpen ? 'Cerrar' : 'Configurar presupuesto'}
                </button>
              )}
            </div>
          </div>

          {/* Automatic Visual Alert Configurator + Budget Totals Bar */}
          <div className="expense-alert-config-panel tabular-nums">
            <div className="expense-alert-config-summary">
              <div>
                <small>Presupuesto mensual total</small>
                <strong>
                  {money(
                    budgetStatuses
                      .filter((b) => b.active)
                      .reduce((s, b) => s + b.monthlyLimit, 0)
                  )}
                </strong>
              </div>
              <div>
                <small>
                  Ejercido ({budgetPeriodMonth === 'all-active' ? 'Ciclo vigente' : formatMonthKeyLabel(budgetPeriodMonth)})
                </small>
                <strong>
                  {money(
                    budgetStatuses
                      .filter((b) => b.active)
                      .reduce((s, b) => s + b.spent, 0)
                  )}
                </strong>
              </div>
              <div>
                <small>Estado de alertas</small>
                <div className="expense-alert-counts-inline">
                  <span className="is-ok">En rango: {budgetSummaryCounts.ok}</span>
                  <span>·</span>
                  <span className="is-warn">≥80%: {budgetSummaryCounts.warning}</span>
                  <span>·</span>
                  <span className="is-crit">≥95%: {budgetSummaryCounts.critical}</span>
                  <span>·</span>
                  <span className="is-over">≥100%: {budgetSummaryCounts.exceeded}</span>
                </div>
              </div>
            </div>

            {canEdit && onSaveBudget && (
              <div className="expense-alert-config-controls">
                <div className="expense-alert-threshold-inputs">
                  <label>
                    <span>Alerta preventiva (%)</span>
                    <input
                      type="number"
                      min="10"
                      max="98"
                      value={globalWarnDraft}
                      onChange={(e) => setGlobalWarnDraft(e.target.value)}
                    />
                  </label>
                  <label>
                    <span>Alerta crítica (%)</span>
                    <input
                      type="number"
                      min="15"
                      max="100"
                      value={globalCritDraft}
                      onChange={(e) => setGlobalCritDraft(e.target.value)}
                    />
                  </label>
                </div>
                <div className="expense-alert-config-actions">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() =>
                      handleApplyGlobalThresholds(
                        Number(globalWarnDraft) || 80,
                        Number(globalCritDraft) || 95,
                        true
                      )
                    }
                    title="Aplicar estos umbrales visuales a todas las naturalezas"
                  >
                    <AlertTriangle size={13} /> Aplicar a todas
                  </button>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={handleApplyStandardThresholdsAll}
                    title="Restablecer alertas visuales automáticas en 80% y 95%"
                  >
                    Estándar 80% / 95%
                  </button>
                </div>
              </div>
            )}
          </div>

          {isNewBudgetOpen && onSaveBudget && (
            <form onSubmit={handleCreateBudgetSubmit} className="company-expense-form-panel">
              <div className="company-expense-form-grid">
                <label className="form-field">
                  <span>Naturaleza de gasto *</span>
                  <select
                    value={newBudgetNature}
                    onChange={(e) => loadBudgetFormForNature(e.target.value as ExpenseNature)}
                  >
                    {EXPENSE_NATURES.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Límite mensual (MXN) *</span>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={newBudgetLimit}
                    onChange={(e) => setNewBudgetLimit(e.target.value)}
                    required
                  />
                </label>
                <label className="form-field">
                  <span>Alerta preventiva (%)</span>
                  <input
                    type="number"
                    min="10"
                    max="98"
                    step="1"
                    value={newBudgetThreshold}
                    onChange={(e) => setNewBudgetThreshold(e.target.value)}
                  />
                </label>
                <label className="form-field">
                  <span>Alerta crítica (%)</span>
                  <input
                    type="number"
                    min="15"
                    max="100"
                    step="1"
                    value={newBudgetCritical}
                    onChange={(e) => setNewBudgetCritical(e.target.value)}
                  />
                </label>
              </div>
              <div className="company-expense-form-footer">
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={newBudgetAlertsEnabled}
                    onChange={(e) => setNewBudgetAlertsEnabled(e.target.checked)}
                  />
                  <span>
                    Mostrar alertas visuales automáticas en tarjetas, barras, banner y captura cuando alcance{' '}
                    {Number(newBudgetThreshold) || 80}% (
                    {money(((Number(newBudgetLimit) || 0) * (Number(newBudgetThreshold) || 80)) / 100)}
                    ) y {Number(newBudgetCritical) || 95}% (
                    {money(((Number(newBudgetLimit) || 0) * (Number(newBudgetCritical) || 95)) / 100)}
                    )
                  </span>
                </label>
                <div className="company-expense-form-actions">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setIsNewBudgetOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="button button-primary">
                    <Check size={14} /> Guardar presupuesto
                  </button>
                </div>
              </div>
            </form>
          )}

          {budgetViewMode === 'matrix' ? (
            <div className="expense-budget-matrix-wrap">
              <div className="table-scroll">
                <table className="data-table expense-budget-matrix-table tabular-nums">
                  <thead>
                    <tr>
                      <th>Naturaleza de gasto</th>
                      <th className="num">Límite mensual (MXN)</th>
                      <th className="num">Ejercido</th>
                      <th className="num">Consumo</th>
                      <th className="num">Prev. (%)</th>
                      <th className="num">Crít. (%)</th>
                      <th>Alertas</th>
                      <th>Regla</th>
                      <th>Estado visual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {EXPENSE_NATURES.map((nat) => {
                      const draft = matrixEdits[nat.id]
                      const existingRule = budgetStatuses.find(
                        (b) => b.nature === nat.id && !b.category && !b.departmentName
                      )
                      const limitNum = Number(draft?.limit ?? existingRule?.monthlyLimit ?? 20000) || 0
                      const warnNum = Math.max(
                        10,
                        Math.min(98, Number(draft?.warn ?? existingRule?.warningPct ?? 80) || 80)
                      )
                      const critNum = Math.max(
                        warnNum + 1,
                        Math.min(100, Number(draft?.crit ?? existingRule?.criticalPct ?? 95) || 95)
                      )
                      const alertsOn = draft ? draft.alertsEnabled : existingRule?.alertsEnabled ?? true
                      const ruleActive = draft ? draft.active : existingRule?.active ?? true
                      const spent =
                        existingRule?.spent ??
                        normalizedExpenses
                          .filter(
                            (e) =>
                              e.resolvedStatus !== 'Cancelado' &&
                              e.resolvedNature === nat.id &&
                              (budgetPeriodMonth === 'all-active' ||
                                parseErpDateMonthKey(e.date) === budgetPeriodMonth)
                          )
                          .reduce((s, e) => s + e.total, 0)
                      const pct = limitNum > 0 ? (spent / limitNum) * 100 : 0
                      const liveState = !ruleActive
                        ? 'paused'
                        : !alertsOn
                          ? 'muted'
                          : pct >= 100
                            ? 'exceeded'
                            : pct >= critNum
                              ? 'critical'
                              : pct >= warnNum
                                ? 'warning'
                                : 'ok'

                      return (
                        <tr key={nat.id} className={!ruleActive ? 'expense-row-muted' : undefined}>
                          <td>
                            <div className="company-expense-card-title">
                              <span
                                className="company-expense-dot"
                                style={{ backgroundColor: nat.dotColor }}
                              />
                              <div>
                                <strong>{nat.label}</strong>
                                <small className="expense-fiscal-meta">{nat.description}</small>
                              </div>
                            </div>
                          </td>
                          <td className="num">
                            <input
                              type="number"
                              min="100"
                              step="500"
                              className="expense-matrix-input"
                              disabled={!canEdit}
                              value={draft?.limit ?? String(existingRule?.monthlyLimit ?? 20000)}
                              onChange={(e) =>
                                setMatrixEdits((prev) => ({
                                  ...prev,
                                  [nat.id]: {
                                    limit: e.target.value,
                                    warn: draft?.warn ?? '80',
                                    crit: draft?.crit ?? '95',
                                    alertsEnabled: alertsOn,
                                    active: ruleActive,
                                  },
                                }))
                              }
                            />
                          </td>
                          <td className="num">{money(spent)}</td>
                          <td className="num">
                            <strong>{pct.toFixed(1)}%</strong>
                          </td>
                          <td className="num">
                            <input
                              type="number"
                              min="10"
                              max="98"
                              className="expense-matrix-input is-pct"
                              disabled={!canEdit}
                              value={draft?.warn ?? String(existingRule?.warningPct ?? 80)}
                              onChange={(e) =>
                                setMatrixEdits((prev) => ({
                                  ...prev,
                                  [nat.id]: {
                                    limit: draft?.limit ?? String(limitNum),
                                    warn: e.target.value,
                                    crit: draft?.crit ?? String(critNum),
                                    alertsEnabled: alertsOn,
                                    active: ruleActive,
                                  },
                                }))
                              }
                            />
                          </td>
                          <td className="num">
                            <input
                              type="number"
                              min="15"
                              max="100"
                              className="expense-matrix-input is-pct"
                              disabled={!canEdit}
                              value={draft?.crit ?? String(existingRule?.criticalPct ?? 95)}
                              onChange={(e) =>
                                setMatrixEdits((prev) => ({
                                  ...prev,
                                  [nat.id]: {
                                    limit: draft?.limit ?? String(limitNum),
                                    warn: draft?.warn ?? String(warnNum),
                                    crit: e.target.value,
                                    alertsEnabled: alertsOn,
                                    active: ruleActive,
                                  },
                                }))
                              }
                            />
                          </td>
                          <td>
                            <label className="checkbox-field" style={{ fontSize: 11.5 }}>
                              <input
                                type="checkbox"
                                disabled={!canEdit}
                                checked={alertsOn}
                                onChange={(e) =>
                                  setMatrixEdits((prev) => ({
                                    ...prev,
                                    [nat.id]: {
                                      limit: draft?.limit ?? String(limitNum),
                                      warn: draft?.warn ?? String(warnNum),
                                      crit: draft?.crit ?? String(critNum),
                                      alertsEnabled: e.target.checked,
                                      active: ruleActive,
                                    },
                                  }))
                                }
                              />
                              <span>{alertsOn ? 'Activas' : 'Silenciadas'}</span>
                            </label>
                          </td>
                          <td>
                            <label className="checkbox-field" style={{ fontSize: 11.5 }}>
                              <input
                                type="checkbox"
                                disabled={!canEdit}
                                checked={ruleActive}
                                onChange={(e) =>
                                  setMatrixEdits((prev) => ({
                                    ...prev,
                                    [nat.id]: {
                                      limit: draft?.limit ?? String(limitNum),
                                      warn: draft?.warn ?? String(warnNum),
                                      crit: draft?.crit ?? String(critNum),
                                      alertsEnabled: alertsOn,
                                      active: e.target.checked,
                                    },
                                  }))
                                }
                              />
                              <span>{ruleActive ? 'Vigente' : 'Pausada'}</span>
                            </label>
                          </td>
                          <td>
                            <span
                              className={`expense-budget-state-tag ${
                                liveState === 'exceeded'
                                  ? 'exceeded'
                                  : liveState === 'critical'
                                    ? 'critical'
                                    : liveState === 'warning'
                                      ? 'warning'
                                      : ''
                              }`}
                            >
                              {liveState === 'paused'
                                ? 'Pausada'
                                : liveState === 'muted'
                                  ? 'Silenciada'
                                  : liveState === 'exceeded'
                                    ? 'Excedido (≥100%)'
                                    : liveState === 'critical'
                                      ? `Crítica (≥${critNum}%)`
                                      : liveState === 'warning'
                                        ? `Preventiva (≥${warnNum}%)`
                                        : 'En rango'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {canEdit && onSaveBudget && (
                <div className="expense-budget-matrix-footer">
                  <span className="expense-fiscal-meta">
                    Al guardar se actualizan los topes mensuales y los marcadores visuales al 80% y 95% en toda la aplicación.
                  </span>
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={handleSaveBudgetMatrix}
                  >
                    <Check size={14} /> Guardar matriz de presupuestos
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="expense-budget-grid">
              {budgetStatuses.map((b) => {
                const natMeta = getNatureMeta(b.nature)
                const isEditing = editingBudgetId === b.id
                const barWidth = Math.min(100, Number(b.pct.toFixed(1)))
                const warnAmount = (b.monthlyLimit * b.warningPct) / 100
                const critAmount = (b.monthlyLimit * b.criticalPct) / 100
                const stateLabel = !b.active
                  ? 'Regla pausada'
                  : !b.alertsEnabled
                    ? 'Alertas silenciadas'
                    : b.state === 'exceeded'
                      ? 'Excedido (≥100%)'
                      : b.state === 'critical'
                        ? `Alerta crítica (≥${b.criticalPct}%)`
                        : b.state === 'warning'
                          ? `Alerta preventiva (≥${b.warningPct}%)`
                          : 'En rango'

                return (
                  <article
                    key={b.id}
                    className={`expense-budget-card ${
                      b.state === 'exceeded'
                        ? 'is-exceeded'
                        : b.state === 'critical'
                          ? 'is-critical'
                          : b.state === 'warning'
                            ? 'is-warning'
                            : ''
                    } ${!b.active ? 'is-paused' : ''}`}
                  >
                    <div className="expense-budget-top">
                      <div className="company-expense-card-title">
                        <span
                          className="company-expense-dot"
                          style={{ backgroundColor: natMeta.dotColor }}
                        />
                        <strong>{natMeta.label}</strong>
                      </div>
                      <span className={`expense-budget-state-tag ${b.state}`}>
                        {(b.state === 'warning' ||
                          b.state === 'critical' ||
                          b.state === 'exceeded') && (
                          <AlertTriangle
                            size={12}
                            style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }}
                          />
                        )}
                        {stateLabel}
                      </span>
                    </div>

                    <div className="expense-budget-numbers tabular-nums">
                      <div>
                        <small>Ejercido</small>
                        <strong>{money(b.spent)}</strong>
                      </div>
                      <div>
                        <small>Límite mensual</small>
                        <strong>{money(b.monthlyLimit)}</strong>
                      </div>
                      <div>
                        <small>{b.remaining >= 0 ? 'Disponible' : 'Sobregiro'}</small>
                        <strong className={b.remaining < 0 ? 'text-alert' : ''}>
                          {money(Math.abs(b.remaining))}
                        </strong>
                      </div>
                    </div>

                    <div>
                      <div className="expense-budget-bar-wrap">
                        <div className="expense-budget-bar-track">
                          <div
                            className={`expense-budget-bar-fill ${b.state}`}
                            style={{ width: `${barWidth}%` }}
                          />
                          {b.alertsEnabled && (
                            <>
                              <span
                                className="expense-budget-tick is-warning"
                                style={{ left: `${b.warningPct}%` }}
                                title={`Alerta preventiva: ${b.warningPct}% (${money(warnAmount)})`}
                              />
                              <span
                                className="expense-budget-tick is-critical"
                                style={{ left: `${b.criticalPct}%` }}
                                title={`Alerta crítica: ${b.criticalPct}% (${money(critAmount)})`}
                              />
                            </>
                          )}
                        </div>
                        <span className="tabular-nums">{b.pct.toFixed(1)}%</span>
                      </div>
                      <div className="expense-budget-scale tabular-nums">
                        <span>0%</span>
                        <span>
                          Prev. {b.warningPct}% ({money(warnAmount)})
                        </span>
                        <span>
                          Crít. {b.criticalPct}% ({money(critAmount)})
                        </span>
                        <span>100%</span>
                      </div>
                    </div>

                    {b.active && b.alertsEnabled && b.state !== 'ok' && (
                      <div className={`expense-card-alert-copy ${b.state} tabular-nums`}>
                        {b.state === 'exceeded'
                          ? `Consumo superó el límite mensual por ${money(Math.abs(b.remaining))}.`
                          : b.state === 'critical'
                            ? `Consumo en zona crítica (≥${b.criticalPct}%): restan ${money(Math.max(0, b.remaining))} antes del tope.`
                            : `Consumo en zona preventiva (≥${b.warningPct}%): faltan ${money(Math.max(0, critAmount - b.spent))} para alerta crítica (${b.criticalPct}%).`}
                      </div>
                    )}

                    {isEditing && onSaveBudget ? (
                      <div className="expense-budget-edit-box">
                        <div className="expense-budget-edit-grid">
                          <label className="form-field">
                            <span>Límite mensual (MXN)</span>
                            <input
                              type="number"
                              min="100"
                              step="500"
                              value={budgetLimitDraft}
                              onChange={(e) => setBudgetLimitDraft(e.target.value)}
                            />
                          </label>
                          <label className="form-field">
                            <span>Alerta 1 (%)</span>
                            <input
                              type="number"
                              min="10"
                              max="98"
                              value={budgetThresholdDraft}
                              onChange={(e) => setBudgetThresholdDraft(e.target.value)}
                            />
                          </label>
                          <label className="form-field">
                            <span>Alerta 2 (%)</span>
                            <input
                              type="number"
                              min="15"
                              max="100"
                              value={budgetCriticalDraft}
                              onChange={(e) => setBudgetCriticalDraft(e.target.value)}
                            />
                          </label>
                        </div>
                        <label className="checkbox-field" style={{ fontSize: 11.5 }}>
                          <input
                            type="checkbox"
                            checked={budgetAlertsDraft}
                            onChange={(e) => setBudgetAlertsDraft(e.target.checked)}
                          />
                          <span>
                            Alertas visuales activas ({budgetThresholdDraft}% / {budgetCriticalDraft}%)
                          </span>
                        </label>
                        <div className="expense-budget-edit-row">
                          <button
                            type="button"
                            className="button button-primary"
                            onClick={() => {
                              const lim = Number(budgetLimitDraft)
                              const warn = Math.max(
                                10,
                                Math.min(98, Number(budgetThresholdDraft) || 80)
                              )
                              const crit = Math.max(
                                warn + 1,
                                Math.min(100, Number(budgetCriticalDraft) || 95)
                              )
                              if (Number.isFinite(lim) && lim > 0) {
                                onSaveBudget({
                                  ...b,
                                  monthlyLimit: lim,
                                  warningThresholdPct: warn,
                                  criticalThresholdPct: crit,
                                  alertsEnabled: budgetAlertsDraft,
                                })
                                toast.success(
                                  `Presupuesto de ${b.nature} actualizado (${money(lim)} · Alertas ${warn}% y ${crit}%).`,
                                  'Actualizado'
                                )
                              }
                              setEditingBudgetId(null)
                            }}
                          >
                            <Check size={13} /> Guardar
                          </button>
                          <button
                            type="button"
                            className="button button-secondary"
                            onClick={() => setEditingBudgetId(null)}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      canEdit && (
                        <div className="expense-budget-actions">
                          {onSaveBudget && (
                            <button
                              type="button"
                              className="button-icon-action"
                              onClick={() => {
                                setEditingBudgetId(b.id)
                                setBudgetLimitDraft(String(b.monthlyLimit))
                                setBudgetThresholdDraft(String(b.warningPct))
                                setBudgetCriticalDraft(String(b.criticalPct))
                                setBudgetAlertsDraft(b.alertsEnabled)
                              }}
                            >
                              <SlidersHorizontal size={12} /> Ajustar límite y alertas
                            </button>
                          )}
                          {onSaveBudget && (
                            <button
                              type="button"
                              className="button-icon-action"
                              onClick={() =>
                                onSaveBudget({
                                  ...b,
                                  alertsEnabled: !b.alertsEnabled,
                                })
                              }
                            >
                              <AlertTriangle size={12} />
                              {b.alertsEnabled ? 'Silenciar alertas' : 'Activar alertas'}
                            </button>
                          )}
                          {onToggleBudget && (
                            <button
                              type="button"
                              className="button-icon-action"
                              onClick={() => onToggleBudget(b.id)}
                            >
                              {b.active ? <Pause size={12} /> : <Play size={12} />}
                              {b.active ? 'Pausar regla' : 'Activar regla'}
                            </button>
                          )}
                        </div>
                      )
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* ================================================================
          SECTION 2: GASTOS RECURRENTES
          ================================================================ */}
      {effectiveSection === 'Gastos recurrentes' && (
        <section className="expense-subview-section">
          <div className="ops-toolbar">
            <div>
              <h3 className="expense-section-title">Plantillas de gastos recurrentes</h3>
              <p className="expense-section-subtitle">
                Automatiza rentas, energía, suscripciones SaaS o cargos financieros y genera la
                póliza del periodo con un clic.
              </p>
            </div>
            <div className="ops-actions-group">
              <select
                className="company-expense-behavior-select"
                aria-label="Filtrar plantillas por estado"
                value={recurringStatusFilter}
                onChange={(e) =>
                  setRecurringStatusFilter(e.target.value as 'Todas' | 'Activas' | 'Pausadas')
                }
              >
                <option value="Todas">Todas ({recurringTemplates.length})</option>
                <option value="Activas">Activas ({recurringStats.activeCount})</option>
                <option value="Pausadas">Pausadas ({recurringStats.pausedCount})</option>
              </select>

              {canCreate &&
                onGenerateRecurringExpense &&
                recurringStats.dueNowTemplates.length > 0 && (
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={handleGenerateDueRecurringBatch}
                    title="Generar en lote todas las plantillas cuya próxima ejecución ya venció"
                  >
                    <Receipt size={14} /> Generar vencidas ({recurringStats.dueNowTemplates.length})
                  </button>
                )}

              {canCreate && onAddRecurringTemplate && (
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => {
                    if (isNewRecurringOpen) {
                      resetRecurringForm()
                      setIsNewRecurringOpen(false)
                    } else {
                      resetRecurringForm()
                      setIsNewRecurringOpen(true)
                    }
                  }}
                >
                  {isNewRecurringOpen ? <X size={14} /> : <Plus size={14} />}
                  {isNewRecurringOpen ? 'Cerrar plantilla' : 'Nueva plantilla recurrente'}
                </button>
              )}
            </div>
          </div>

          {/* Recurring Commitment KPIs */}
          <div className="expense-exec-kpi-grid tabular-nums">
            <article className="expense-exec-kpi-card">
              <small>Plantillas configuradas</small>
              <strong>
                {recurringStats.activeCount} activas / {recurringStats.pausedCount} pausadas
              </strong>
              <span>Catálogo de compromisos fijos y periódicos</span>
            </article>
            <article className="expense-exec-kpi-card">
              <small>Compromiso mensual estimado (con IVA)</small>
              <strong>{money(recurringStats.monthlyCommitment)} / mes</strong>
              <span>Equivalente mensualizado (Mensual, Quincenal ×2, Anual ÷12)</span>
            </article>
            <article className="expense-exec-kpi-card">
              <small>Agenda de ejecución del periodo</small>
              <strong>
                {recurringStats.dueNowTemplates.length} vencida(s) ·{' '}
                {recurringStats.upcomingSoonCount} en ≤7 días
              </strong>
              <span>Genera pólizas Pendientes sin alterar bancos hasta autorizar</span>
            </article>
            <article className="expense-exec-kpi-card">
              <small>Pólizas generadas en histórico</small>
              <strong>{recurringStats.totalGeneratedCount} pólizas activas</strong>
              <span>Trazabilidad directa por recurrenceId</span>
            </article>
          </div>

          {isNewRecurringOpen && (onAddRecurringTemplate || onUpdateRecurringTemplate) && (
            <form onSubmit={handleCreateRecurringSubmit} className="company-expense-form-panel">
              <div className="company-expense-form-head">
                <div>
                  <h3>
                    {editingRecurringId
                      ? 'Editar plantilla de gasto recurrente'
                      : 'Nueva plantilla de gasto recurrente'}
                  </h3>
                  <p>
                    Define naturaleza contable, centro de costos, periodicidad y fecha de siguiente
                    ejecución.
                  </p>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => {
                    resetRecurringForm()
                    setIsNewRecurringOpen(false)
                  }}
                  aria-label="Cerrar formulario de plantilla"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="company-expense-form-grid">
                <label className="form-field" style={{ gridColumn: 'span 2' }}>
                  <span>Nombre de plantilla *</span>
                  <input
                    type="text"
                    placeholder="Ej. Renta oficina Guadalajara o Suscripción ERP"
                    value={recTitle}
                    onChange={(e) => setRecTitle(e.target.value)}
                    required
                  />
                </label>
                <label className="form-field">
                  <span>Naturaleza contable</span>
                  <select
                    value={recNature}
                    onChange={(e) => {
                      const nextNat = e.target.value as ExpenseNature
                      const meta = getNatureMeta(nextNat)
                      setRecNature(nextNat)
                      setRecCategory(meta.defaultSubCategory)
                      setRecBehavior(meta.defaultBehavior)
                      setRecAccountCode(meta.defaultAccountCode)
                    }}
                  >
                    {EXPENSE_NATURES.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Rubro / Subcategoría</span>
                  <select
                    value={recCategory}
                    onChange={(e) => setRecCategory(e.target.value as ExpenseCategory)}
                  >
                    {ALL_SUBCATEGORIES.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Comportamiento (P. Equilibrio)</span>
                  <select
                    value={recBehavior}
                    onChange={(e) => setRecBehavior(e.target.value as 'Fijo' | 'Variable')}
                  >
                    <option value="Fijo">Costo fijo</option>
                    <option value="Variable">Costo variable</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>Periodicidad</span>
                  <select
                    value={recFrequency}
                    onChange={(e) => setRecFrequency(e.target.value as ExpenseRecurrenceFrequency)}
                  >
                    <option value="Mensual">Mensual</option>
                    <option value="Quincenal">Quincenal</option>
                    <option value="Anual">Anual</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>Beneficiario *</span>
                  <input
                    type="text"
                    placeholder="Proveedor o acreedor"
                    value={recBeneficiary}
                    onChange={(e) => setRecBeneficiary(e.target.value)}
                    required
                  />
                </label>
                <label className="form-field">
                  <span>Importe base (MXN) *</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={recAmount}
                    onChange={(e) => setRecAmount(e.target.value)}
                    required
                  />
                </label>
                <label className="form-field">
                  <span>Próxima ejecución</span>
                  <input
                    type="date"
                    value={recNextRunDate}
                    onChange={(e) => setRecNextRunDate(e.target.value)}
                  />
                </label>
                <label className="form-field">
                  <span>Forma de pago</span>
                  <select
                    value={recPaymentMethod}
                    onChange={(e) => setRecPaymentMethod(e.target.value)}
                  >
                    <option value="Transferencia SPEI">{countryProfile.bank.defaultTransferMethod}</option>
                    <option value="Domiciliación bancaria">Domiciliación bancaria</option>
                    <option value="Tarjeta corporativa">Tarjeta corporativa</option>
                    <option value="Cargo bancario automático">Cargo bancario automático</option>
                    <option value="Caja chica">Efectivo caja chica</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>Cuenta bancaria sugerida</span>
                  <select value={recBankId} onChange={(e) => setRecBankId(e.target.value)}>
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} ({b.accountNumber})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Sucursal</span>
                  <select value={recLocationId} onChange={(e) => setRecLocationId(e.target.value)}>
                    {locations.filter((l) => l.active).map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Departamento</span>
                  <select value={recDepartment} onChange={(e) => setRecDepartment(e.target.value)}>
                    {departments.filter((d) => d.active).map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name} ({d.costCenter})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Cuenta contable</span>
                  <select
                    value={recAccountCode}
                    onChange={(e) => setRecAccountCode(e.target.value)}
                  >
                    {expenseChartAccounts.map((acc) => (
                      <option key={acc.id} value={acc.code}>
                        {acc.code} · {acc.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Descripción póliza</span>
                  <input
                    type="text"
                    placeholder="Opcional"
                    value={recDescription}
                    onChange={(e) => setRecDescription(e.target.value)}
                  />
                </label>
                <div className="company-expense-tax-toggle">
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={recHasTax}
                      onChange={(e) => setRecHasTax(e.target.checked)}
                    />
                    <span>Desglosar {countryProfile.vat.label} ({standardVatPct}%)</span>
                  </label>
                </div>
              </div>
              <div className="company-expense-form-footer">
                <span className="company-expense-muted-sep">
                  Las pólizas generadas entran como <strong>Pendiente</strong> para autorización antes de descontar bancos.
                </span>
                <div className="company-expense-form-actions">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => {
                      resetRecurringForm()
                      setIsNewRecurringOpen(false)
                    }}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="button button-primary">
                    <Repeat size={14} />{' '}
                    {editingRecurringId ? 'Actualizar plantilla' : 'Guardar plantilla'}
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="table-wrap ops-table-wrap">
            <table className="data-table ops-data-table company-expense-table">
              <thead>
                <tr>
                  <th>PLANTILLA, NATURALEZA Y CENTRO DE COSTO</th>
                  <th>BENEFICIARIO</th>
                  <th>PERIODICIDAD</th>
                  <th>PRÓXIMA FECHA</th>
                  <th>HISTORIAL</th>
                  <th style={{ textAlign: 'right' }}>TOTAL ESTIMADO</th>
                  <th>ESTADO</th>
                  <th style={{ textAlign: 'right' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {recurringStats.filteredTemplates.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-cell">
                      No hay plantillas de gastos recurrentes configuradas con este filtro.
                    </td>
                  </tr>
                ) : (
                  recurringStats.filteredTemplates.map((tpl) => {
                    const estTotal = tpl.hasTax ? tpl.amount * (1 + standardVatRate) : tpl.amount
                    const natMeta = getNatureMeta(tpl.nature)
                    const generatedCount = recurringStats.generatedCounts[tpl.id] || 0
                    const daysUntilRun = Math.ceil(
                      (new Date(`${tpl.nextRunDate}T12:00:00`).getTime() -
                        new Date(`${recurringStats.todayIso}T12:00:00`).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                    const isDueNow = tpl.active && daysUntilRun <= 0
                    const isSoon = tpl.active && daysUntilRun > 0 && daysUntilRun <= 7

                    return (
                      <tr key={tpl.id} className={!tpl.active ? 'expense-row-muted' : ''}>
                        <td>
                          <div className="company-expense-subconcept">
                            <span className="company-expense-inline-cat">
                              <span
                                className="company-expense-dot"
                                style={{ backgroundColor: natMeta.dotColor }}
                              />
                              <strong>{tpl.title}</strong>
                            </span>
                            <small>
                              {tpl.nature} · {tpl.category} · {tpl.costBehavior}
                              {tpl.locationName ? ` · ${tpl.locationName}` : ''}
                              {tpl.costCenter ? ` (${tpl.costCenter})` : ''}
                            </small>
                          </div>
                        </td>
                        <td>
                          <div className="company-expense-subconcept">
                            <span>{tpl.beneficiary}</span>
                            <small>
                              {tpl.paymentMethod} · {tpl.bankAccountName}
                            </small>
                          </div>
                        </td>
                        <td>{tpl.frequency}</td>
                        <td className="tabular-nums">
                          <div>{tpl.nextRunDate}</div>
                          <small
                            className={
                              isDueNow
                                ? 'expense-field-hint is-warn'
                                : isSoon
                                  ? 'expense-field-hint is-valid'
                                  : 'company-expense-muted-sep'
                            }
                          >
                            {isDueNow
                              ? 'Vencida / Lista para generar'
                              : isSoon
                                ? `En ${daysUntilRun} día(s)`
                                : tpl.active
                                  ? 'Programada'
                                  : 'En pausa'}
                          </small>
                        </td>
                        <td className="tabular-nums">
                          <div>{tpl.lastGeneratedDate || 'Sin ejecuciones'}</div>
                          <small className="company-expense-muted-sep">
                            {generatedCount} {generatedCount === 1 ? 'póliza' : 'pólizas'}
                          </small>
                        </td>
                        <td style={{ textAlign: 'right' }} className="tabular-nums">
                          <strong>{money(estTotal)}</strong>
                          <div className="company-expense-muted-sep">
                            {tpl.hasTax ? `Incluye ${countryProfile.vat.label} ${standardVatPct}%` : 'Exento / 0%'}
                          </div>
                        </td>
                        <td>
                          <span className="expense-status-inline">
                            <span
                              className="company-expense-dot"
                              style={{ backgroundColor: tpl.active ? '#1e7a53' : '#94a3b8' }}
                            />
                            {tpl.active ? 'Activa' : 'Pausada'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="po-actions-row">
                            {canCreate && onGenerateRecurringExpense && tpl.active && (
                              <button
                                type="button"
                                className="button-icon-action"
                                onClick={() => onGenerateRecurringExpense(tpl.id)}
                                title="Generar póliza del periodo actual"
                              >
                                <Receipt size={12} /> Generar póliza
                              </button>
                            )}
                            {canEdit && onUpdateRecurringTemplate && (
                              <button
                                type="button"
                                className="button-icon-action"
                                onClick={() => startEditRecurring(tpl)}
                                title="Editar plantilla"
                              >
                                <SlidersHorizontal size={12} /> Editar
                              </button>
                            )}
                            {canEdit && onToggleRecurringTemplate && (
                              <button
                                type="button"
                                className="button-icon-action"
                                onClick={() => onToggleRecurringTemplate(tpl.id)}
                              >
                                {tpl.active ? <Pause size={12} /> : <Play size={12} />}
                                {tpl.active ? 'Pausar' : 'Activar'}
                              </button>
                            )}
                            {canEdit && onDeleteRecurringTemplate && (
                              confirmDeleteRecurringId === tpl.id ? (
                                <>
                                  <button
                                    type="button"
                                    className="button-icon-action"
                                    onClick={() => {
                                      onDeleteRecurringTemplate(tpl.id)
                                      setConfirmDeleteRecurringId(null)
                                    }}
                                  >
                                    <Check size={12} /> Confirmar
                                  </button>
                                  <button
                                    type="button"
                                    className="button-icon-action"
                                    onClick={() => setConfirmDeleteRecurringId(null)}
                                  >
                                    <X size={12} />
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  className="button-icon-action"
                                  onClick={() => setConfirmDeleteRecurringId(tpl.id)}
                                  title="Eliminar plantilla"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )
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
        </section>
      )}

      {/* ================================================================
          SECTION 3: RESUMEN Y CONTROL OR REGISTRO Y PÓLIZAS
          ================================================================ */}
      {(effectiveSection === 'Resumen y control' || effectiveSection === 'Registro y pólizas') && (
        <>
          {/* 5 Nature Filter / Summary Cards */}
          <div className="company-expense-summary-grid is-five">
            {EXPENSE_NATURES.map((nat) => {
              const stat = summaryStats.totals[nat.id]
              const share =
                summaryStats.grandTotal > 0
                  ? Math.round((stat.total / summaryStats.grandTotal) * 100)
                  : 0
              const isActive = selectedNature === nat.id
              const budgetMatch = budgetStatuses.find((b) => b.nature === nat.id && b.active)
              const cardAlertClass =
                budgetMatch && budgetMatch.alertsEnabled && budgetMatch.state !== 'ok'
                  ? `budget-${budgetMatch.state}`
                  : ''
              return (
                <button
                  key={nat.id}
                  type="button"
                  className={`company-expense-card ${isActive ? 'active' : ''} ${cardAlertClass}`}
                  onClick={() => handleFilterNature(isActive ? 'Todas' : nat.id)}
                >
                  <div className="company-expense-card-top">
                    <span className="company-expense-card-icon">{getNatureIcon(nat.id)}</span>
                    <span className="company-expense-card-share tabular-nums">
                      {share}% · {stat.count} {stat.count === 1 ? 'póliza' : 'pólizas'}
                    </span>
                  </div>
                  <div className="company-expense-card-title">
                    <span
                      className="company-expense-dot"
                      style={{ backgroundColor: nat.dotColor }}
                      aria-hidden="true"
                    />
                    <strong>{nat.label}</strong>
                  </div>
                  <p className="company-expense-card-desc">{nat.description}</p>
                  <div className="company-expense-card-amount tabular-nums">{money(stat.total)}</div>
                  {budgetMatch && (
                    <div className="expense-card-budget-foot tabular-nums">
                      <div className="expense-budget-bar-track compact">
                        <div
                          className={`expense-budget-bar-fill ${budgetMatch.state}`}
                          style={{ width: `${Math.min(100, Math.round(budgetMatch.pct))}%` }}
                        />
                        {budgetMatch.alertsEnabled && (
                          <>
                            <span
                              className="expense-budget-tick is-warning"
                              style={{ left: `${budgetMatch.warningPct}%` }}
                            />
                            <span
                              className="expense-budget-tick is-critical"
                              style={{ left: `${budgetMatch.criticalPct}%` }}
                            />
                          </>
                        )}
                      </div>
                      <span
                        className={
                          budgetMatch.alertsEnabled && budgetMatch.state !== 'ok'
                            ? `expense-card-alert-copy ${budgetMatch.state}`
                            : ''
                        }
                      >
                        {budgetMatch.pct.toFixed(1)}% de {money(budgetMatch.monthlyLimit)}
                        {budgetMatch.alertsEnabled && budgetMatch.state === 'exceeded'
                          ? ' · Excedido'
                          : budgetMatch.alertsEnabled && budgetMatch.state === 'critical'
                            ? ` · Crítica ≥${budgetMatch.criticalPct}%`
                            : budgetMatch.alertsEnabled && budgetMatch.state === 'warning'
                              ? ` · Alerta ≥${budgetMatch.warningPct}%`
                              : ''}
                      </span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* In Resumen y control mode: Period Selector, Period KPIs, Charts, Cost Centers & Pending Approvals */}
          {effectiveSection === 'Resumen y control' && (
            <div className="expense-summary-panels">
              {/* Period Selector Toolbar */}
              <div className="ops-toolbar">
                <div>
                  <h3 className="expense-section-title">KPIs del periodo y análisis estructural</h3>
                  <p className="expense-section-subtitle tabular-nums">
                    {summaryPeriod === 'all'
                      ? `Ciclo activo completo (${summaryStats.activeCount} pólizas · Subtotal ${money(summaryStats.grandSubtotal)} + IVA ${money(summaryStats.grandTax)})`
                      : `${formatMonthKeyLabel(summaryPeriod)} (${summaryStats.activeCount} pólizas · Promedio ${money(summaryStats.avgTicket)}/póliza)`}
                  </p>
                </div>
                <div className="ops-actions-group">
                  <select
                    className="company-expense-behavior-select"
                    aria-label="Periodo de análisis KPI"
                    value={summaryPeriod}
                    onChange={(e) => setSummaryPeriod(e.target.value)}
                  >
                    <option value="all">Periodo: Ciclo completo (todos)</option>
                    {availableBudgetMonths.map((mk) => (
                      <option key={mk} value={mk}>
                        Mes: {formatMonthKeyLabel(mk)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 4 Period KPIs: Gasto Total, Ahorro vs Presupuesto, Margen de Maniobra & Tesorería/Estructura */}
              <div className="expense-exec-kpi-grid tabular-nums">
                <article className="expense-exec-kpi-card">
                  <div className="expense-kpi-head-row">
                    <small>
                      Gasto total ·{' '}
                      {summaryPeriod === 'all'
                        ? `Ciclo (${summaryStats.activeMonthCount} ${summaryStats.activeMonthCount === 1 ? 'mes' : 'meses'})`
                        : summaryStats.currentMonthLabel}
                    </small>
                    {summaryStats.monthlyTrendData.length > 0 && (() => {
                      const pts =
                        summaryStats.monthlyTrendData.length === 1
                          ? [summaryStats.monthlyTrendData[0].Total, summaryStats.monthlyTrendData[0].Total]
                          : summaryStats.monthlyTrendData.map((d) => d.Total)
                      const min = Math.min(...pts)
                      const max = Math.max(...pts)
                      const span = Math.max(1, max - min)
                      const coords = pts
                        .map((v, i) => {
                          const x = (i / Math.max(1, pts.length - 1)) * 68 + 2
                          const y = 20 - ((v - min) / span) * 14
                          return `${x.toFixed(1)},${y.toFixed(1)}`
                        })
                        .join(' ')
                      const lastCoord = coords.split(' ').pop()?.split(',') || ['70', '12']
                      return (
                        <svg
                          className="expense-kpi-spark"
                          width="72"
                          height="24"
                          viewBox="0 0 72 24"
                          aria-label="Tendencia mensual de gasto total"
                        >
                          <polyline
                            fill="none"
                            stroke="#3b6ca8"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={coords}
                          />
                          <circle cx={lastCoord[0]} cy={lastCoord[1]} r="2.4" fill="#3b6ca8" />
                        </svg>
                      )
                    })()}
                  </div>
                  <strong>{money(summaryStats.grandTotal)}</strong>
                  <span>
                    {summaryStats.momDeltaPct !== null ? (
                      <>
                        {summaryStats.currentMonthLabel}:{' '}
                        {summaryStats.momDeltaPct >= 0 ? '+' : ''}
                        {summaryStats.momDeltaPct.toFixed(1)}% vs. {summaryStats.prevMonthLabel} (
                        {money(summaryStats.prevMonthTotal)})
                      </>
                    ) : (
                      `Promedio por póliza: ${money(summaryStats.avgTicket)}`
                    )}
                  </span>
                </article>

                <article className="expense-exec-kpi-card">
                  <div className="expense-kpi-head-row">
                    <small>Ahorro vs. presupuesto</small>
                    <span
                      className={`expense-kpi-state-label ${
                        summaryStats.budgetHealthState === 'exceeded'
                          ? 'is-danger'
                          : summaryStats.budgetHealthState === 'critical' ||
                              summaryStats.budgetHealthState === 'warning'
                            ? 'is-warn'
                            : 'is-ok'
                      }`}
                    >
                      {summaryStats.periodBudgetTotal <= 0
                        ? 'Sin presupuesto'
                        : summaryStats.savingsVsBudget >= 0
                          ? `Ahorro ${summaryStats.savingsPct.toFixed(1)}%`
                          : `Excedido ${Math.abs(summaryStats.savingsPct).toFixed(1)}%`}
                    </span>
                  </div>
                  <strong>
                    {summaryStats.periodBudgetTotal <= 0
                      ? '—'
                      : summaryStats.savingsVsBudget >= 0
                        ? money(summaryStats.savingsVsBudget)
                        : `-${money(Math.abs(summaryStats.savingsVsBudget))}`}
                  </strong>
                  <div className="expense-split-bar" aria-hidden="true">
                    <div
                      className="expense-split-bar-paid"
                      style={{
                        width: `${Math.min(100, summaryStats.budgetUsagePct)}%`,
                        background:
                          summaryStats.budgetHealthState === 'exceeded'
                            ? '#dc2626'
                            : summaryStats.budgetHealthState === 'critical'
                              ? '#ea580c'
                              : summaryStats.budgetHealthState === 'warning'
                                ? '#d97706'
                                : 'var(--accent)',
                      }}
                    />
                  </div>
                  <span>
                    Ejercido {summaryStats.budgetUsagePct.toFixed(1)}% de{' '}
                    {money(summaryStats.periodBudgetTotal)} ({summaryStats.activeBudgetCount} reglas)
                  </span>
                </article>

                <article className="expense-exec-kpi-card">
                  <div className="expense-kpi-head-row">
                    <small>Margen de maniobra</small>
                    <span
                      className={`expense-kpi-state-label ${
                        summaryStats.budgetHealthState === 'exceeded' ||
                        summaryStats.budgetHealthState === 'critical'
                          ? 'is-danger'
                          : summaryStats.budgetHealthState === 'warning'
                            ? 'is-warn'
                            : 'is-ok'
                      }`}
                    >
                      {summaryStats.budgetHealthState === 'exceeded'
                        ? 'Sin margen'
                        : summaryStats.budgetHealthState === 'critical'
                          ? 'Zona crítica'
                          : summaryStats.budgetHealthState === 'warning'
                            ? 'Zona preventiva'
                            : 'Holgura saludable'}
                    </span>
                  </div>
                  <strong>
                    {summaryStats.periodBudgetTotal <= 0
                      ? money(summaryStats.netTreasuryCushion)
                      : `${summaryStats.headroomPct.toFixed(1)}% libre (${money(summaryStats.headroomAmount)})`}
                  </strong>
                  <div className="expense-split-bar" aria-hidden="true">
                    <div
                      className="expense-split-bar-primary"
                      style={{
                        width: `${Math.min(100, summaryStats.headroomPct)}%`,
                        background:
                          summaryStats.headroomPct <= 5
                            ? '#dc2626'
                            : summaryStats.headroomPct <= 20
                              ? '#d97706'
                              : '#2e7d5b',
                      }}
                    />
                  </div>
                  <span>
                    Antes alerta {summaryStats.weightedWarningPct.toFixed(0)}%:{' '}
                    {money(summaryStats.headroomToWarningAmount)} · Liquidez neta:{' '}
                    {money(summaryStats.netTreasuryCushion)}
                  </span>
                </article>

                <article className="expense-exec-kpi-card">
                  <small>Tesorería y elasticidad · Fijo vs. Variable</small>
                  <strong>
                    {summaryStats.paidPct.toFixed(0)}% Pagado · {summaryStats.variablePct.toFixed(0)}%
                    Var.
                  </strong>
                  <div className="expense-tri-bar" aria-hidden="true">
                    <span
                      style={{
                        width: `${Math.max(0, summaryStats.fixedPct)}%`,
                        backgroundColor: '#3b6ca8',
                      }}
                    />
                    <span
                      style={{
                        width: `${Math.max(0, summaryStats.variablePct)}%`,
                        backgroundColor: '#c05621',
                      }}
                    />
                  </div>
                  <span>
                    Pendiente: {money(summaryStats.pendingAmount)} ({summaryStats.pendingCount}) ·
                    Fijo {money(summaryStats.fixedTotal)} / Var. {money(summaryStats.variableTotal)}
                  </span>
                </article>
              </div>

              {/* Charts Row: Quick Monthly Trend Visualizations & Budget vs Actual */}
              <div className="expense-costcenter-grid">
                <section className="overview-panel-card expense-costcenter-panel">
                  <div className="expense-trend-card-header">
                    <div className="overview-card-head">
                      <h2>Tendencias mensuales rápidas</h2>
                      <p>
                        <PieChart size={14} />{' '}
                        {monthlyTrendView === 'budget_vs_spend'
                          ? 'Evolución del gasto total frente al presupuesto mensual autorizado.'
                          : monthlyTrendView === 'fixed_vs_variable'
                            ? 'Composición mensual entre compromisos fijos y gasto variable.'
                            : 'Ahorro mensual generado respecto al presupuesto límite.'}
                      </p>
                    </div>
                    <div className="expense-trend-mode-tabs" role="tablist" aria-label="Vista de tendencia mensual">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={monthlyTrendView === 'budget_vs_spend'}
                        className={monthlyTrendView === 'budget_vs_spend' ? 'active' : ''}
                        onClick={() => setMonthlyTrendView('budget_vs_spend')}
                      >
                        Gasto vs. Presupuesto
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={monthlyTrendView === 'fixed_vs_variable'}
                        className={monthlyTrendView === 'fixed_vs_variable' ? 'active' : ''}
                        onClick={() => setMonthlyTrendView('fixed_vs_variable')}
                      >
                        Fijo vs. Variable
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={monthlyTrendView === 'savings_headroom'}
                        className={monthlyTrendView === 'savings_headroom' ? 'active' : ''}
                        onClick={() => setMonthlyTrendView('savings_headroom')}
                      >
                        Ahorro mensual
                      </button>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: 220 }}>
                    {summaryStats.monthlyTrendData.length === 0 ? (
                      <p className="company-expense-muted-sep">Sin datos mensuales suficientes.</p>
                    ) : monthlyTrendView === 'budget_vs_spend' ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                          data={summaryStats.monthlyTrendData}
                          margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,135,125,0.2)" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis
                            tick={{ fontSize: 11 }}
                            tickFormatter={(val: number) => `$${Math.round(val / 1000)}k`}
                          />
                          <Tooltip formatter={(value) => money(Number(value) || 0)} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Area
                            type="monotone"
                            dataKey="Total"
                            name="Gasto total"
                            fill="rgba(59, 108, 168, 0.16)"
                            stroke="#3b6ca8"
                            strokeWidth={2}
                          />
                          <Line
                            type="monotone"
                            dataKey="Presupuesto"
                            name="Presupuesto mensual"
                            stroke="#16a34a"
                            strokeDasharray="5 4"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : monthlyTrendView === 'fixed_vs_variable' ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={summaryStats.monthlyTrendData}
                          margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,135,125,0.2)" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis
                            tick={{ fontSize: 11 }}
                            tickFormatter={(val: number) => `$${Math.round(val / 1000)}k`}
                          />
                          <Tooltip formatter={(value) => money(Number(value) || 0)} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey="Fijos" stackId="cost" fill="#3b6ca8" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="Variables" stackId="cost" fill="#c05621" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={summaryStats.monthlyTrendData}
                          margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,135,125,0.2)" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis
                            tick={{ fontSize: 11 }}
                            tickFormatter={(val: number) => `$${Math.round(val / 1000)}k`}
                          />
                          <Tooltip formatter={(value) => money(Number(value) || 0)} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey="Ahorro" name="Ahorro vs. presupuesto" radius={[4, 4, 0, 0]}>
                            {summaryStats.monthlyTrendData.map((entry) => (
                              <Cell
                                key={entry.monthKey}
                                fill={entry.Ahorro >= 0 ? '#16a34a' : '#dc2626'}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  {summaryStats.monthlyTrendData.length > 0 && (
                    <div className="expense-monthly-quick-strip tabular-nums">
                      {summaryStats.monthlyTrendData.slice(-4).map((m) => {
                        const isSelectedMonth = summaryPeriod === m.monthKey
                        return (
                          <button
                            key={m.monthKey}
                            type="button"
                            className={`expense-monthly-quick-item ${isSelectedMonth ? 'is-selected' : ''}`}
                            onClick={() =>
                              setSummaryPeriod((prev) => (prev === m.monthKey ? 'all' : m.monthKey))
                            }
                            title={
                              isSelectedMonth
                                ? `Volver al ciclo completo`
                                : `Filtrar KPIs a ${m.month}`
                            }
                          >
                            <div className="expense-monthly-quick-top">
                              <strong>{m.month}</strong>
                              <span
                                className={
                                  m.momPct === null
                                    ? ''
                                    : m.momPct > 0
                                      ? 'is-up'
                                      : 'is-down'
                                }
                              >
                                {m.momPct === null
                                  ? `${m.count} pól.`
                                  : `${m.momPct >= 0 ? '+' : ''}${m.momPct.toFixed(1)}% MoM`}
                              </span>
                            </div>
                            <div className="expense-monthly-quick-val">{money(m.Total)}</div>
                            <small>
                              Ahorro {money(m.Ahorro)} · Margen {m.MargenPct.toFixed(0)}%
                            </small>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </section>

                <section className="overview-panel-card expense-costcenter-panel">
                  <div className="overview-card-head">
                    <h2>Ejercido vs. Presupuesto por naturaleza</h2>
                    <p>
                      <Layers size={14} /> Comparativa del periodo (
                      {summaryPeriod === 'all'
                        ? `${summaryStats.activeMonthCount} ${summaryStats.activeMonthCount === 1 ? 'mes' : 'meses'}`
                        : summaryStats.currentMonthLabel}
                      ) contra límites autorizados.
                    </p>
                  </div>
                  <div style={{ width: '100%', height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={EXPENSE_NATURES.map((nat) => {
                          const bud = budgets.find((b) => b.nature === nat.id && b.active)
                          return {
                            naturaleza: nat.shortLabel,
                            Ejercido: Math.round(summaryStats.totals[nat.id].total),
                            Presupuesto: bud
                              ? Math.round(bud.monthlyLimit * summaryStats.activeMonthCount)
                              : 0,
                          }
                        })}
                        margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,135,125,0.2)" />
                        <XAxis dataKey="naturaleza" tick={{ fontSize: 11 }} />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          tickFormatter={(val: number) => `$${Math.round(val / 1000)}k`}
                        />
                        <Tooltip formatter={(value) => money(Number(value) || 0)} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="Ejercido" fill="#2e7d5b" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Presupuesto" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              </div>

              {/* Cost Center Breakdown: Locations & Departments */}
              <div className="expense-costcenter-grid">
                <section className="overview-panel-card expense-costcenter-panel">
                  <div className="overview-card-head">
                    <h2>Centros de costo · Por sucursal</h2>
                    <p>
                      <MapPin size={14} /> Distribución por ubicación física y composición Fijo / Variable.
                    </p>
                  </div>
                  <div className="expense-costcenter-list tabular-nums">
                    {summaryStats.byLocation.length === 0 ? (
                      <p className="company-expense-muted-sep">Sin movimientos activos por sucursal.</p>
                    ) : (
                      summaryStats.byLocation.map((loc) => (
                        <button
                          key={loc.locationId}
                          type="button"
                          className="expense-costcenter-row"
                          onClick={() => {
                            setSelectedLocationId(loc.locationId)
                            goToSection('Registro y pólizas')
                          }}
                          title={`Filtrar histórico por ${loc.locationName}`}
                        >
                          <div className="expense-costcenter-row-top">
                            <div>
                              <strong>{loc.locationName}</strong>
                              <small>
                                {loc.locationCode} · {loc.count}{' '}
                                {loc.count === 1 ? 'póliza' : 'pólizas'} · Fijo{' '}
                                {money(loc.fixedTotal)} / Var. {money(loc.variableTotal)}
                              </small>
                            </div>
                            <div className="expense-costcenter-row-val">
                              <strong>{money(loc.total)}</strong>
                              <small>{loc.sharePct.toFixed(1)}%</small>
                            </div>
                          </div>
                          <div className="expense-costcenter-bar">
                            <span style={{ width: `${Math.min(100, loc.sharePct)}%` }} />
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </section>

                <section className="overview-panel-card expense-costcenter-panel">
                  <div className="overview-card-head">
                    <h2>Centros de costo · Por departamento</h2>
                    <p>
                      <Users size={14} /> Gasto asignado por área operativa y estado de pago.
                    </p>
                  </div>
                  <div className="expense-costcenter-list tabular-nums">
                    {summaryStats.byDepartment.length === 0 ? (
                      <p className="company-expense-muted-sep">
                        Sin movimientos activos por departamento.
                      </p>
                    ) : (
                      summaryStats.byDepartment.map((dept) => (
                        <button
                          key={dept.departmentName}
                          type="button"
                          className="expense-costcenter-row"
                          onClick={() => {
                            setSelectedDepartment(dept.departmentName)
                            goToSection('Registro y pólizas')
                          }}
                          title={`Filtrar histórico por ${dept.departmentName}`}
                        >
                          <div className="expense-costcenter-row-top">
                            <div>
                              <strong>{dept.departmentName}</strong>
                              <small>
                                {dept.costCenter} · {dept.count}{' '}
                                {dept.count === 1 ? 'póliza' : 'pólizas'} · Pagado{' '}
                                {money(dept.paidTotal)}
                                {dept.pendingTotal > 0
                                  ? ` · Pend. ${money(dept.pendingTotal)}`
                                  : ''}
                              </small>
                            </div>
                            <div className="expense-costcenter-row-val">
                              <strong>{money(dept.total)}</strong>
                              <small>{dept.sharePct.toFixed(1)}%</small>
                            </div>
                          </div>
                          <div className="expense-costcenter-bar">
                            <span style={{ width: `${Math.min(100, dept.sharePct)}%` }} />
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </section>
              </div>

              {/* Cost Center Matrix: Fixed vs Variable + Nature Breakdown by Branch or Department */}
              <section className="overview-panel-card" style={{ marginBottom: 14 }}>
                <div className="overview-card-head overview-card-head-split">
                  <div>
                    <h2>Matriz de centros de costo · Naturaleza y estructura Fijo / Variable</h2>
                    <p>
                      Vinculación directa con Administración para asignar carga fija, variable y
                      naturaleza contable por sucursal o área operativa.
                    </p>
                  </div>
                  <div className="warehouse-tab-selector" role="tablist" aria-label="Dimensión de centros de costo">
                    <button
                      type="button"
                      className={`wh-tab ${costCenterMatrixTab === 'locations' ? 'active' : ''}`}
                      onClick={() => setCostCenterMatrixTab('locations')}
                    >
                      Por sucursal ({summaryStats.byLocation.length})
                    </button>
                    <button
                      type="button"
                      className={`wh-tab ${costCenterMatrixTab === 'departments' ? 'active' : ''}`}
                      onClick={() => setCostCenterMatrixTab('departments')}
                    >
                      Por departamento ({summaryStats.byDepartment.length})
                    </button>
                  </div>
                </div>

                <div className="table-wrap ops-table-wrap">
                  <table className="data-table ops-data-table">
                    <thead>
                      <tr>
                        <th>{costCenterMatrixTab === 'locations' ? 'CÓDIGO SEDE' : 'CENTRO DE COSTO'}</th>
                        <th>{costCenterMatrixTab === 'locations' ? 'SUCURSAL / UBICACIÓN' : 'DEPARTAMENTO / ÁREA'}</th>
                        <th style={{ textAlign: 'right' }}>PÓLIZAS</th>
                        <th style={{ textAlign: 'right' }}>COSTOS FIJOS</th>
                        <th style={{ textAlign: 'right' }}>COSTOS VARIABLES</th>
                        <th style={{ textAlign: 'right' }}>ADMIN / IMP.</th>
                        <th style={{ textAlign: 'right' }}>OPEX / C. VENTA</th>
                        <th style={{ textAlign: 'right' }}>FINANCIERO</th>
                        <th style={{ textAlign: 'right' }}>TOTAL (%)</th>
                        <th style={{ textAlign: 'right' }}>CONSULTA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costCenterMatrixTab === 'locations' ? (
                        summaryStats.byLocation.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="empty-cell">
                              Sin movimientos por sucursal en el periodo seleccionado.
                            </td>
                          </tr>
                        ) : (
                          summaryStats.byLocation.map((loc) => (
                            <tr key={loc.locationId}>
                              <td>
                                <span className="fin-folio-tag tabular-nums">{loc.locationCode}</span>
                              </td>
                              <td>
                                <strong>{loc.locationName}</strong>
                              </td>
                              <td style={{ textAlign: 'right' }} className="tabular-nums">
                                {loc.count}
                              </td>
                              <td style={{ textAlign: 'right' }} className="tabular-nums">
                                {money(loc.fixedTotal)}
                              </td>
                              <td style={{ textAlign: 'right' }} className="tabular-nums">
                                {money(loc.variableTotal)}
                              </td>
                              <td style={{ textAlign: 'right' }} className="tabular-nums">
                                {money(loc.adminTotal)}
                              </td>
                              <td style={{ textAlign: 'right' }} className="tabular-nums">
                                {money(loc.opexTotal)}
                              </td>
                              <td style={{ textAlign: 'right' }} className="tabular-nums">
                                {money(loc.financialTotal)}
                              </td>
                              <td style={{ textAlign: 'right' }} className="tabular-nums">
                                <strong>{money(loc.total)}</strong> ({loc.sharePct.toFixed(1)}%)
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  type="button"
                                  className="button-icon-action"
                                  onClick={() => {
                                    setSelectedLocationId(loc.locationId)
                                    goToSection('Registro y pólizas')
                                  }}
                                >
                                  Ver pólizas
                                </button>
                              </td>
                            </tr>
                          ))
                        )
                      ) : summaryStats.byDepartment.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="empty-cell">
                            Sin movimientos por departamento en el periodo seleccionado.
                          </td>
                        </tr>
                      ) : (
                        summaryStats.byDepartment.map((dept) => (
                          <tr key={dept.departmentName}>
                            <td>
                              <span className="fin-folio-tag tabular-nums">{dept.costCenter}</span>
                            </td>
                            <td>
                              <strong>{dept.departmentName}</strong>
                              <div className="company-expense-muted-sep">Líder: {dept.leader}</div>
                            </td>
                            <td style={{ textAlign: 'right' }} className="tabular-nums">
                              {dept.count}
                            </td>
                            <td style={{ textAlign: 'right' }} className="tabular-nums">
                              {money(dept.fixedTotal)}
                            </td>
                            <td style={{ textAlign: 'right' }} className="tabular-nums">
                              {money(dept.variableTotal)}
                            </td>
                            <td style={{ textAlign: 'right' }} className="tabular-nums">
                              {money(dept.adminTotal)}
                            </td>
                            <td style={{ textAlign: 'right' }} className="tabular-nums">
                              {money(dept.opexTotal)}
                            </td>
                            <td style={{ textAlign: 'right' }} className="tabular-nums">
                              {money(dept.financialTotal)}
                            </td>
                            <td style={{ textAlign: 'right' }} className="tabular-nums">
                              <strong>{money(dept.total)}</strong> ({dept.sharePct.toFixed(1)}%)
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className="button-icon-action"
                                onClick={() => {
                                  setSelectedDepartment(dept.departmentName)
                                  goToSection('Registro y pólizas')
                                }}
                              >
                                Ver pólizas
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="overview-panel-card">
                <div className="overview-card-head overview-card-head-split">
                  <div>
                    <h2>Bandeja de autorización y pago pendiente</h2>
                    <p>
                      Pólizas en estado Pendiente o Aprobado que aún no debitan cuentas bancarias.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => goToSection('Registro y pólizas')}
                  >
                    Ir al registro completo
                  </button>
                </div>

                <div className="table-wrap ops-table-wrap">
                  <table className="data-table ops-data-table">
                    <thead>
                      <tr>
                        <th>FOLIO</th>
                        <th>NATURALEZA</th>
                        <th>BENEFICIARIO / CONCEPTO</th>
                        <th>SUCURSAL</th>
                        <th>ESTADO</th>
                        <th style={{ textAlign: 'right' }}>IMPORTE</th>
                        <th style={{ textAlign: 'right' }}>ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingExpenses.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="empty-cell">
                            No hay pólizas pendientes de aprobación ni pago en este momento.
                          </td>
                        </tr>
                      ) : (
                        pendingExpenses.map((exp) => {
                          const st = STATUS_META[exp.resolvedStatus]
                          return (
                            <tr key={exp.id}>
                              <td>
                                <span className="fin-folio-tag tabular-nums">{exp.folio}</span>
                              </td>
                              <td>{exp.resolvedNature}</td>
                              <td>
                                <strong>{exp.beneficiary}</strong>
                                <div className="company-expense-muted-sep">{exp.description}</div>
                              </td>
                              <td>{exp.locationName || 'Matriz'}</td>
                              <td>
                                <span className="expense-status-inline">
                                  <span
                                    className="company-expense-dot"
                                    style={{ backgroundColor: st.dotColor }}
                                  />
                                  {st.label}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }} className="tabular-nums">
                                <strong>{money(exp.total)}</strong>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div className="po-actions-row">
                                  {canEdit && exp.resolvedStatus === 'Pendiente' && (
                                    <button
                                      type="button"
                                      className="button-icon-action"
                                      onClick={() => handleTransitionStatus(exp, 'Aprobado')}
                                    >
                                      <CheckCircle2 size={12} /> Aprobar
                                    </button>
                                  )}
                                  {canEdit &&
                                    (exp.resolvedStatus === 'Pendiente' ||
                                      exp.resolvedStatus === 'Aprobado') && (
                                      <button
                                        type="button"
                                        className="button-icon-action"
                                        onClick={() => handleTransitionStatus(exp, 'Pagado')}
                                      >
                                        <Banknote size={12} /> Pagar
                                      </button>
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
              </section>
            </div>
          )}

          {/* Primary Toolbar: Nature Tabs + CSV + Register CTA */}
          <div className="ops-toolbar">
            <div className="ops-filter-group">
              <div
                className="warehouse-tab-selector"
                role="tablist"
                aria-label="Filtrar por naturaleza contable"
              >
                <button
                  type="button"
                  className={`wh-tab ${selectedNature === 'Todas' ? 'active' : ''}`}
                  onClick={() => handleFilterNature('Todas')}
                >
                  Todos
                  <span className="wh-badge">{normalizedExpenses.length}</span>
                </button>
                {EXPENSE_NATURES.map((nat) => (
                  <button
                    key={nat.id}
                    type="button"
                    className={`wh-tab ${selectedNature === nat.id ? 'active' : ''}`}
                    onClick={() => handleFilterNature(nat.id)}
                  >
                    {nat.shortLabel}
                    <span className="wh-badge">{summaryStats.totals[nat.id].count}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="ops-actions-group">
              <button
                type="button"
                className="button button-secondary"
                onClick={handleExportCsv}
                disabled={filteredExpenses.length === 0}
              >
                <Download size={14} /> Exportar CSV
              </button>
              {canCreate && (
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => setIsRegisterOpen((prev) => !prev)}
                >
                  {isRegisterOpen ? <X size={14} /> : <Plus size={14} />}
                  {isRegisterOpen ? 'Cerrar formulario' : 'Registrar nuevo gasto'}
                </button>
              )}
            </div>
          </div>

          {/* Secondary Operational Rubro Breakdown Filter Bar */}
          <div className="filter-chips-row" role="group" aria-label="Filtrar por rubro operativo">
            <button
              type="button"
              className={`filter-pill-btn ${selectedSubCategory === 'Todos' ? 'active' : ''}`}
              onClick={() => setSelectedSubCategory('Todos')}
            >
              Todos los rubros
            </button>
            {visibleSubCategories.map((sub) => {
              const stat = summaryStats.subStats[sub] || { total: 0, count: 0 }
              return (
                <button
                  key={sub}
                  type="button"
                  className={`filter-pill-btn ${selectedSubCategory === sub ? 'active' : ''}`}
                  onClick={() => setSelectedSubCategory(selectedSubCategory === sub ? 'Todos' : sub)}
                  title={`${sub}: ${money(stat.total)}`}
                >
                  {getSubCategoryIcon(sub)}
                  <span>{sub}</span>
                  <span className="tabular-nums">({stat.count})</span>
                </button>
              )
            })}
          </div>

          {/* Inline Collapsible Expense Registration Panel */}
          {isRegisterOpen && (
            <section
              className="company-expense-form-panel"
              aria-label="Formulario de registro de gasto"
            >
              <div className="company-expense-form-head">
                <div>
                  <h3>Registrar nuevo gasto de la empresa</h3>
                  <p>
                    Clasifica la naturaleza contable (Administrativo, Operativo, Costo de venta,
                    Financiero o Impuestos), asigna sucursal y cuenta contable, y elige pago
                    inmediato o flujo Pendiente.
                  </p>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setIsRegisterOpen(false)}
                  aria-label="Cerrar formulario"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleRegisterExpense} className="company-expense-form">
                {/* 5-Nature Selector */}
                <div className="company-expense-cat-picker">
                  <span className="company-expense-field-label">Naturaleza contable (impacto P&amp;L) *</span>
                  <div className="company-expense-segmented is-five">
                    {EXPENSE_NATURES.map((nat) => (
                      <button
                        key={nat.id}
                        type="button"
                        className={`company-expense-seg-btn ${expenseNature === nat.id ? 'active' : ''}`}
                        onClick={() => handleSelectNature(nat.id)}
                      >
                        <span
                          className="company-expense-dot"
                          style={{ backgroundColor: nat.dotColor }}
                          aria-hidden="true"
                        />
                        <span>{nat.shortLabel}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="company-expense-form-grid">
                  <label className="form-field">
                    <span>Rubro / Subcategoría *</span>
                    <select
                      value={subCategory}
                      onChange={(e) => setSubCategory(e.target.value as ExpenseCategory)}
                      required
                    >
                      {activeNatureMeta.subCategories.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="form-field">
                    <span>Comportamiento (P. Equilibrio)</span>
                    <select
                      value={costBehavior}
                      onChange={(e) => setCostBehavior(e.target.value as 'Fijo' | 'Variable')}
                    >
                      <option value="Fijo">Costo fijo</option>
                      <option value="Variable">Costo variable</option>
                    </select>
                  </label>

                  <label className="form-field">
                    <span>Fecha del gasto *</span>
                    <input
                      type="date"
                      value={expenseDateIso}
                      onChange={(e) => setExpenseDateIso(e.target.value)}
                      required
                    />
                  </label>

                  <label className="form-field">
                    <span>Estado inicial de la póliza</span>
                    <select
                      value={initialStatus}
                      onChange={(e) => setInitialStatus(e.target.value as 'Pagado' | 'Pendiente')}
                    >
                      <option value="Pagado">Pagado (debita cuenta ahora)</option>
                      <option value="Pendiente">Pendiente (requiere aprobar y pagar)</option>
                    </select>
                  </label>
                </div>

                <div className="company-expense-form-grid">
                  <label className="form-field">
                    <span>Beneficiario / Proveedor *</span>
                    <input
                      type="text"
                      required
                      placeholder="Ej. CFE, BBVA, Logística del Valle"
                      value={beneficiary}
                      onChange={(e) => setBeneficiary(e.target.value)}
                    />
                  </label>

                  <label className="form-field" style={{ gridColumn: 'span 2' }}>
                    <span>Descripción / Concepto *</span>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Flete de entregas locales o pago de derecho municipal"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </label>

                  <label className="form-field">
                    <span>Importe base (MXN) *</span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </label>
                </div>

                <div className="company-expense-form-grid">
                  <label className="form-field">
                    <span>Sucursal / Ubicación</span>
                    <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                      {locations
                        .filter((l) => l.active)
                        .map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name} ({loc.code})
                          </option>
                        ))}
                      {locations.filter((l) => l.active).length === 0 && (
                        <option value="loc_1">CDMX Matriz · Vallejo</option>
                      )}
                    </select>
                  </label>

                  <label className="form-field">
                    <span>Departamento / Centro de costo</span>
                    <select
                      value={departmentName}
                      onChange={(e) => setDepartmentName(e.target.value)}
                    >
                      {departments
                        .filter((d) => d.active)
                        .map((dep) => (
                          <option key={dep.id} value={dep.name}>
                            {dep.name} ({dep.costCenter})
                          </option>
                        ))}
                      {departments.filter((d) => d.active).length === 0 && (
                        <option value="General">General</option>
                      )}
                    </select>
                  </label>

                  <label className="form-field">
                    <span>Cuenta contable</span>
                    <select value={accountCode} onChange={(e) => setAccountCode(e.target.value)}>
                      {expenseChartAccounts.map((acc) => (
                        <option key={acc.id} value={acc.code}>
                          {acc.code} · {acc.name}
                        </option>
                      ))}
                      {expenseChartAccounts.length === 0 && (
                        <option value={activeNatureMeta.defaultAccountCode}>
                          {activeNatureMeta.defaultAccountCode}
                        </option>
                      )}
                    </select>
                  </label>

                  <label className="form-field">
                    <span>Referencia / Folio fiscal (UUID)</span>
                    <input
                      type="text"
                      placeholder="Ej. FAC-2026-881"
                      value={referenceDoc}
                      onChange={(e) => setReferenceDoc(e.target.value)}
                    />
                  </label>
                </div>

                <div className="company-expense-form-grid">
                  <label className="form-field">
                    <span>{countryProfile.taxId.label} emisor (fiscal)</span>
                    <input
                      type="text"
                      placeholder={`Ej. ${countryProfile.taxId.placeholder}`}
                      maxLength={20}
                      value={issuerRfc}
                      onChange={(e) => setIssuerRfc(e.target.value.toUpperCase())}
                    />
                    {issuerRfc.trim() !== '' && (() => {
                      const taxValidation = countryProfile.taxId.validate(issuerRfc)
                      return (
                        <small
                          className={`expense-field-hint ${
                            taxValidation.valid ? 'is-valid' : 'is-warn'
                          }`}
                        >
                          {taxValidation.valid
                            ? `${countryProfile.taxId.shortLabel} válido (${taxValidation.kindLabel || countryProfile.countryName})`
                            : taxValidation.reason || countryProfile.taxId.formatHint}
                        </small>
                      )
                    })()}
                  </label>

                  <label className="form-field">
                    <span>
                      Cuenta bancaria {initialStatus === 'Pagado' ? 'de cargo *' : 'sugerida'}
                    </span>
                    <select
                      required={initialStatus === 'Pagado'}
                      value={bankAccountId}
                      onChange={(e) => setBankAccountId(e.target.value)}
                    >
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bankName} ({b.accountNumber}) — Saldo: {money(b.balance)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="form-field">
                    <span>Forma de pago</span>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <option value={countryProfile.bank.defaultTransferMethod}>
                        {countryProfile.bank.defaultTransferMethod} ({countryProfile.bank.networkName})
                      </option>
                      <option value="Domiciliación bancaria">Domiciliación bancaria</option>
                      <option value="Tarjeta corporativa">Tarjeta corporativa</option>
                      <option value="Cargo bancario automático">Cargo bancario automático</option>
                      <option value="Caja chica">Efectivo caja chica</option>
                    </select>
                  </label>

                  <label className="form-field">
                    <span>Régimen {countryProfile.vat.label} / Impuestos</span>
                    <select
                      value={taxMode}
                      onChange={(e) => setTaxMode(e.target.value as '16' | '0' | 'custom')}
                    >
                      <option value="16">{countryProfile.vat.standardOptionLabel}</option>
                      <option value="0">{countryProfile.vat.exemptOptionLabel}</option>
                      <option value="custom">{countryProfile.vat.label} / Impuesto manual</option>
                    </select>
                    {taxMode === 'custom' && (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={`Importe de ${countryProfile.vat.label} o impuestos`}
                        value={customTaxAmount}
                        onChange={(e) => setCustomTaxAmount(e.target.value)}
                        style={{ marginTop: 6 }}
                      />
                    )}
                  </label>
                </div>

                <div className="company-expense-form-footer">
                  <div className="company-expense-totals-preview tabular-nums">
                    <span>
                      Subtotal: <strong>{money(parsedAmount)}</strong>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {countryProfile.vat.label}: <strong>{money(previewTax)}</strong>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Total a registrar:{' '}
                      <strong className="text-negative">{money(previewTotal)} {reportingCurrency}</strong>
                    </span>
                  </div>

                  <div className="company-expense-form-actions">
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => setIsRegisterOpen(false)}
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="button button-primary">
                      <Receipt size={14} />{' '}
                      {initialStatus === 'Pagado' ? 'Guardar y pagar gasto' : 'Guardar como pendiente'}
                    </button>
                  </div>
                </div>
              </form>
            </section>
          )}

          {/* Search, Date Range, Status, Payment Method, Fiscal & Cost Center Filters */}
          <div className="ops-subbar company-expense-subbar">
            <div className="company-expense-history-title">
              <FileSpreadsheet size={15} />
              <strong>Histórico y control fiscal de gastos</strong>
              <span className="company-expense-muted-sep tabular-nums">
                · {filteredExpenses.length}{' '}
                {filteredExpenses.length === 1 ? 'registro' : 'registros'} · Comprobados:{' '}
                {filteredTotals.verifiedCount}/{filteredTotals.count} · Total{' '}
                {money(filteredTotals.total)}
              </span>
            </div>

            <div className="company-expense-search-controls">
              <div className="company-expense-date-range" title="Filtrar por rango de fechas">
                <Calendar size={13} />
                <input
                  type="date"
                  className="company-expense-date-input"
                  aria-label="Fecha desde"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
                <span aria-hidden="true">–</span>
                <input
                  type="date"
                  className="company-expense-date-input"
                  aria-label="Fecha hasta"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>

              <select
                className="company-expense-behavior-select"
                aria-label="Filtrar por estado"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as 'Todos' | ExpenseStatus)}
              >
                <option value="Todos">Estado: Todos</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Aprobado">Aprobado</option>
                <option value="Pagado">Pagado</option>
                <option value="Cancelado">Cancelado</option>
              </select>

              <select
                className="company-expense-behavior-select"
                aria-label="Filtrar por método de pago"
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              >
                <option value="Todos">Pago: Todos</option>
                {availablePaymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>

              <select
                className="company-expense-behavior-select"
                aria-label="Filtrar por comprobación fiscal"
                value={fiscalFilter}
                onChange={(e) =>
                  setFiscalFilter(e.target.value as 'Todos' | 'Comprobado' | 'Sin comprobante')
                }
              >
                <option value="Todos">Fiscal: Todos</option>
                <option value="Comprobado">Con {countryProfile.taxId.shortLabel} y comprobante</option>
                <option value="Sin comprobante">Pendiente comprobación</option>
              </select>

              {locations.length > 0 && (
                <select
                  className="company-expense-behavior-select"
                  aria-label="Filtrar por sucursal"
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                >
                  <option value="Todas">Sucursal: Todas</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              )}

              {departments.length > 0 && (
                <select
                  className="company-expense-behavior-select"
                  aria-label="Filtrar por departamento"
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                >
                  <option value="Todos">Departamento: Todos</option>
                  {departments.map((dep) => (
                    <option key={dep.id} value={dep.name}>
                      {dep.name}
                    </option>
                  ))}
                </select>
              )}

              <select
                className="company-expense-behavior-select"
                aria-label="Filtrar por comportamiento del costo"
                value={selectedBehavior}
                onChange={(e) => setSelectedBehavior(e.target.value as 'Todos' | 'Fijo' | 'Variable')}
              >
                <option value="Todos">Costo: Todos</option>
                <option value="Fijo">Solo fijos</option>
                <option value="Variable">Solo variables</option>
              </select>

              <select
                className="company-expense-behavior-select"
                aria-label="Ordenar registros"
                value={sortOrder}
                onChange={(e) =>
                  setSortOrder(
                    e.target.value as 'date_desc' | 'date_asc' | 'total_desc' | 'folio_asc'
                  )
                }
              >
                <option value="date_desc">Orden: Más reciente</option>
                <option value="date_asc">Orden: Más antiguo</option>
                <option value="total_desc">Orden: Mayor importe</option>
                <option value="folio_asc">Orden: Folio</option>
              </select>

              <div className="ops-search-input-wrap" style={{ maxWidth: '280px', width: '100%' }}>
                <Search size={14} />
                <input
                  type="text"
                  placeholder={`Buscar folio, ${countryProfile.taxId.shortLabel}, ref. fiscal o concepto...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => setSearchQuery('')}
                    title="Limpiar búsqueda"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {hasActiveSubFilters && (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => {
                    setSelectedNature('Todas')
                    setSelectedSubCategory('Todos')
                    setSelectedStatus('Todos')
                    setSelectedBehavior('Todos')
                    setSelectedLocationId('Todas')
                    setSelectedDepartment('Todos')
                    setSelectedPaymentMethod('Todos')
                    setFiscalFilter('Todos')
                    setDateFrom('')
                    setDateTo('')
                    setSearchQuery('')
                  }}
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>

          {/* Historical Expenses Table */}
          <div className="table-wrap ops-table-wrap">
            <table className="data-table ops-data-table company-expense-table">
              <thead>
                <tr>
                  <th>FOLIO</th>
                  <th>FECHA</th>
                  <th>NATURALEZA</th>
                  <th>RUBRO · SUCURSAL · CTA</th>
                  <th>DESCRIPCIÓN</th>
                  <th>BENEFICIARIO Y COMPROBACIÓN</th>
                  <th>ESTADO</th>
                  <th>FORMA DE PAGO</th>
                  <th style={{ textAlign: 'right' }}>SUBTOTAL</th>
                  <th style={{ textAlign: 'right' }}>{countryProfile.vat.label.toUpperCase()}</th>
                  <th style={{ textAlign: 'right' }}>TOTAL</th>
                  <th style={{ textAlign: 'right' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="empty-cell">
                      No se encontraron gastos registrados con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => {
                    const natMeta = getNatureMeta(exp.resolvedNature)
                    const statusMeta = STATUS_META[exp.resolvedStatus]
                    const isCancelled = exp.resolvedStatus === 'Cancelado'
                    const hasCompleteFiscal = Boolean(
                      exp.referenceDoc?.trim() && exp.issuerRfc?.trim()
                    )
                    return (
                      <tr key={exp.id} className={isCancelled ? 'expense-row-cancelled' : ''}>
                        <td>
                          <span className="fin-folio-tag tabular-nums">{exp.folio}</span>
                        </td>
                        <td className="date-cell tabular-nums">{exp.date}</td>
                        <td>
                          <span className="company-expense-inline-cat">
                            <span
                              className="company-expense-dot"
                              style={{ backgroundColor: natMeta.dotColor }}
                              aria-hidden="true"
                            />
                            <span>{natMeta.shortLabel}</span>
                          </span>
                        </td>
                        <td>
                          <div className="company-expense-subconcept">
                            <span className="company-expense-rubro-line">
                              {getSubCategoryIcon(exp.category)} {exp.category}
                            </span>
                            <small>
                              {exp.costBehavior || 'Fijo'}
                              {exp.locationName ? ` · ${exp.locationName}` : ''}
                              {exp.accountCode ? ` · ${exp.accountCode}` : ''}
                            </small>
                          </div>
                        </td>
                        <td>
                          <strong className="company-expense-desc-cell">{exp.description}</strong>
                        </td>
                        <td>
                          <div className="company-expense-subconcept">
                            <span className="supplier-cell">{exp.beneficiary}</span>
                            <small
                              className={
                                hasCompleteFiscal
                                  ? 'expense-fiscal-meta'
                                  : 'expense-fiscal-meta is-missing'
                              }
                            >
                              {hasCompleteFiscal
                                ? `${countryProfile.taxId.shortLabel} ${exp.issuerRfc} · ${exp.referenceDoc}`
                                : exp.issuerRfc || exp.referenceDoc
                                  ? `${exp.issuerRfc ? `${countryProfile.taxId.shortLabel} ${exp.issuerRfc}` : `Sin ${countryProfile.taxId.shortLabel}`} · ${
                                      exp.referenceDoc ? exp.referenceDoc : 'Sin ref. fiscal'
                                    }`
                                  : 'Pendiente de comprobación fiscal'}
                            </small>
                          </div>
                        </td>
                        <td>
                          <span className={`expense-status-inline ${statusMeta.className}`}>
                            <span
                              className="company-expense-dot"
                              style={{ backgroundColor: statusMeta.dotColor }}
                            />
                            <span>{statusMeta.label}</span>
                          </span>
                        </td>
                        <td>
                          <div className="company-expense-payment-cell">
                            <span>
                              <CreditCard size={11} /> {exp.paymentMethod}
                            </span>
                            {exp.bankAccountName && <small>{exp.bankAccountName}</small>}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }} className="money-cell tabular-nums">
                          {money(exp.amount)}
                        </td>
                        <td
                          style={{ textAlign: 'right' }}
                          className="money-cell tabular-nums company-expense-iva-cell"
                        >
                          {exp.tax > 0 ? money(exp.tax) : '—'}
                        </td>
                        <td style={{ textAlign: 'right' }} className="money-cell tabular-nums">
                          <strong className={isCancelled ? '' : 'text-negative'}>
                            {money(exp.total)}
                          </strong>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="po-actions-row">
                            {canEdit && exp.resolvedStatus === 'Pendiente' && (
                              <button
                                type="button"
                                className="button-icon-action"
                                title={`Aprobar ${exp.folio}`}
                                onClick={() => handleTransitionStatus(exp, 'Aprobado')}
                              >
                                <CheckCircle2 size={12} /> Aprobar
                              </button>
                            )}
                            {canEdit &&
                              (exp.resolvedStatus === 'Pendiente' ||
                                exp.resolvedStatus === 'Aprobado') && (
                                <button
                                  type="button"
                                  className="button-icon-action"
                                  title={`Registrar pago de ${exp.folio}`}
                                  onClick={() => handleTransitionStatus(exp, 'Pagado')}
                                >
                                  <Banknote size={12} /> Pagar
                                </button>
                              )}
                            <button
                              type="button"
                              className="button-icon-action"
                              title={`Ver detalle de ${exp.folio}`}
                              onClick={() => openExpenseDetailModal(exp)}
                            >
                              <Eye size={12} /> Ver
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
              {filteredExpenses.length > 0 && (
                <tfoot>
                  <tr className="company-expense-table-footer">
                    <td colSpan={8}>
                      <strong>
                        {selectedStatus === 'Cancelado'
                          ? `Pólizas canceladas (${filteredTotals.count})`
                          : `Totales activos mostrados (${filteredTotals.count} pólizas válidas)`}
                      </strong>
                    </td>
                    <td style={{ textAlign: 'right' }} className="tabular-nums">
                      <strong>{money(filteredTotals.subtotal)}</strong>
                    </td>
                    <td style={{ textAlign: 'right' }} className="tabular-nums">
                      <strong>{money(filteredTotals.tax)}</strong>
                    </td>
                    <td style={{ textAlign: 'right' }} className="tabular-nums">
                      <strong className="text-negative">{money(filteredTotals.total)}</strong>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}

      {/* Expense Detail & Reclassification Modal */}
      {viewingExpense && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setViewingExpense(null)
              setConfirmingDelete(false)
              setIsEditingViewing(false)
            }
          }}
        >
          <section className="create-modal" role="dialog" aria-modal="true">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">GASTOS · DETALLE DE PÓLIZA</div>
                <h2>{viewingExpense.folio}</h2>
                <p>
                  {resolveExpenseNature(viewingExpense)} · {viewingExpense.category} ·{' '}
                  {viewingExpense.costBehavior || 'Fijo'} ·{' '}
                  <Calendar size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />{' '}
                  {viewingExpense.date}
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => {
                  setViewingExpense(null)
                  setConfirmingDelete(false)
                  setIsEditingViewing(false)
                }}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            {isEditingViewing && canEdit && onUpdateExpense ? (
              <form onSubmit={handleSaveViewingEdit} className="expense-modal-edit-form">
                <div className="expense-modal-edit-grid">
                  <label className="form-field">
                    <span>Naturaleza contable</span>
                    <select
                      value={editNature}
                      onChange={(e) => {
                        const nat = e.target.value as ExpenseNature
                        const meta = getNatureMeta(nat)
                        setEditNature(nat)
                        if (!meta.subCategories.includes(editCategory)) {
                          setEditCategory(meta.defaultSubCategory)
                        }
                      }}
                    >
                      {EXPENSE_NATURES.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="form-field">
                    <span>Rubro operativo</span>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value as ExpenseCategory)}
                    >
                      {ALL_SUBCATEGORIES.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="form-field">
                    <span>Comportamiento (P. Equilibrio)</span>
                    <select
                      value={editBehavior}
                      onChange={(e) => setEditBehavior(e.target.value as 'Fijo' | 'Variable')}
                    >
                      <option value="Fijo">Costo fijo</option>
                      <option value="Variable">Costo variable</option>
                    </select>
                  </label>

                  <label className="form-field">
                    <span>Sucursal / Ubicación</span>
                    <select
                      value={editLocationId}
                      onChange={(e) => setEditLocationId(e.target.value)}
                    >
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="form-field">
                    <span>Departamento / Centro de costo</span>
                    <select
                      value={editDepartment}
                      onChange={(e) => setEditDepartment(e.target.value)}
                    >
                      {departments.map((dep) => (
                        <option key={dep.id} value={dep.name}>
                          {dep.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="form-field">
                    <span>Cuenta contable</span>
                    <select
                      value={editAccountCode}
                      onChange={(e) => setEditAccountCode(e.target.value)}
                    >
                      {expenseChartAccounts.map((acc) => (
                        <option key={acc.id} value={acc.code}>
                          {acc.code} · {acc.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="form-field">
                    <span>Forma de pago</span>
                    <select
                      value={editPaymentMethod}
                      onChange={(e) => setEditPaymentMethod(e.target.value)}
                    >
                      {availablePaymentMethods.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="form-field">
                    <span>{countryProfile.taxId.label} emisor</span>
                    <input
                      type="text"
                      maxLength={20}
                      placeholder={`Ej. ${countryProfile.taxId.placeholder}`}
                      value={editIssuerRfc}
                      onChange={(e) => setEditIssuerRfc(e.target.value.toUpperCase())}
                    />
                  </label>

                  <label className="form-field">
                    <span>{countryProfile.fiscalDoc.uuidLabel}</span>
                    <input
                      type="text"
                      value={editReferenceDoc}
                      onChange={(e) => setEditReferenceDoc(e.target.value)}
                    />
                  </label>

                  <label className="form-field" style={{ gridColumn: '1 / -1' }}>
                    <span>Descripción del gasto</span>
                    <input
                      type="text"
                      required
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                    />
                  </label>
                </div>

                <div className="expense-budget-edit-row" style={{ marginTop: 12 }}>
                  <button type="submit" className="button button-primary">
                    <Check size={14} /> Guardar reclasificación
                  </button>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setIsEditingViewing(false)}
                  >
                    Cancelar edición
                  </button>
                </div>
              </form>
            ) : (
              <div className="po-detail-meta-grid">
                <div>
                  <small>Beneficiario / Proveedor</small>
                  <strong>{viewingExpense.beneficiary}</strong>
                  <span>
                    {viewingExpense.issuerRfc ? `${countryProfile.taxId.shortLabel}: ${viewingExpense.issuerRfc} · ` : ''}
                    Resp.: {viewingExpense.user}
                  </span>
                </div>
                <div>
                  <small>Estado y pago</small>
                  <strong>{viewingExpense.status || 'Pagado'}</strong>
                  <span>
                    {viewingExpense.paymentMethod} ·{' '}
                    {viewingExpense.bankAccountName || 'Cuenta operativa'}
                  </span>
                </div>
                <div>
                  <small>Naturaleza, centro de costo y cuenta</small>
                  <strong>
                    {resolveExpenseNature(viewingExpense)} · {viewingExpense.costBehavior || 'Fijo'}
                  </strong>
                  <span>
                    <MapPin size={10} style={{ display: 'inline', verticalAlign: '-1px' }} />{' '}
                    {viewingExpense.locationName || 'Matriz'}
                    {viewingExpense.accountCode ? ` · ${viewingExpense.accountCode}` : ''}
                  </span>
                </div>
                <div>
                  <small>Descripción y comprobante</small>
                  <strong>{viewingExpense.description}</strong>
                  <span>
                    Ref: {viewingExpense.referenceDoc || 'Sin folio adjunto'} ·{' '}
                    {viewingExpense.departmentName || 'General'}
                  </span>
                </div>
              </div>
            )}

            <div className="po-totals-box" style={{ marginTop: 14 }}>
              <div className="po-totals-row">
                <span>Subtotal:</span>
                <strong className="tabular-nums">{money(viewingExpense.amount)}</strong>
              </div>
              <div className="po-totals-row">
                <span>{countryProfile.vat.label} ({standardVatPct}%):</span>
                <strong className="tabular-nums">
                  {viewingExpense.tax > 0 ? money(viewingExpense.tax) : '$0.00'}
                </strong>
              </div>
              <div className="po-totals-row grand">
                <span>Total del gasto:</span>
                <strong className="text-negative tabular-nums">
                  {money(viewingExpense.total)} {reportingCurrency}
                </strong>
              </div>
            </div>

            <div className={`create-modal-actions ${onDeleteExpense ? 'has-delete-action' : ''}`}>
              {onDeleteExpense && (
                <div className="modal-delete-slot">
                  {!confirmingDelete ? (
                    <button
                      type="button"
                      className="button button-danger-outline"
                      onClick={() => setConfirmingDelete(true)}
                    >
                      <Trash2 size={14} /> Eliminar gasto
                    </button>
                  ) : (
                    <div className="modal-delete-confirm">
                      <span>
                        ¿Eliminar <strong>{viewingExpense.folio}</strong>?
                      </span>
                      <button
                        type="button"
                        className="button button-danger-solid"
                        onClick={() => {
                          onDeleteExpense(viewingExpense.id)
                          setViewingExpense(null)
                          setConfirmingDelete(false)
                        }}
                      >
                        <Trash2 size={13} /> Confirmar
                      </button>
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => setConfirmingDelete(false)}
                      >
                        Conservar
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="modal-primary-actions-slot">
                {canEdit && onUpdateExpense && !isEditingViewing && (
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setIsEditingViewing(true)}
                  >
                    <SlidersHorizontal size={14} /> Reclasificar / Editar
                  </button>
                )}
                {canEdit && (viewingExpense.status || 'Pagado') === 'Pendiente' && (
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => handleTransitionStatus(viewingExpense, 'Aprobado')}
                  >
                    <Clock3 size={14} /> Aprobar
                  </button>
                )}
                {canEdit &&
                  ((viewingExpense.status || 'Pagado') === 'Pendiente' ||
                    viewingExpense.status === 'Aprobado') && (
                    <div className="expense-modal-pay-group">
                      {bankAccounts.length > 0 && (
                        <select
                          className="company-expense-behavior-select"
                          aria-label="Cuenta bancaria de cargo"
                          value={payBankAccountId}
                          onChange={(e) => setPayBankAccountId(e.target.value)}
                        >
                          {bankAccounts.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.bankName} ({money(b.balance)})
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        className="button button-primary"
                        onClick={() =>
                          handleTransitionStatus(viewingExpense, 'Pagado', payBankAccountId)
                        }
                      >
                        <Banknote size={14} /> Registrar pago
                      </button>
                    </div>
                  )}
                {canEdit &&
                  viewingExpense.status !== 'Cancelado' &&
                  viewingExpense.status !== 'Pagado' && (
                    <button
                      type="button"
                      className="button button-danger-outline"
                      onClick={() => handleTransitionStatus(viewingExpense, 'Cancelado')}
                    >
                      <XCircle size={14} /> Cancelar póliza
                    </button>
                  )}
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => {
                    setViewingExpense(null)
                    setConfirmingDelete(false)
                    setIsEditingViewing(false)
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
