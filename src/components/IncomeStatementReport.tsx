import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  BellOff,
  BellRing,
  BookOpen,
  Building2,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Layers,
  LayoutGrid,
  MapPin,
  Percent,
  RotateCcw,
  Scale,
  SlidersHorizontal,
  Table2,
  TrendingUp,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ReferenceLine,
} from 'recharts'
import {
  resolveExpenseNature,
  type ChartAccount,
  type ExpenseRecord,
  type InvoiceReceivable,
} from '../data/finance'
import type { InventoryItemLocation, PurchaseOrder } from '../data/operations'
import type { Quote, SalesOrder } from '../data/sales'
import type { PayrollRunRecord } from '../data/payroll'
import {
  getBrandInitials,
  loadCompanyBrandSnapshot,
  type CompanyBrandSnapshot,
} from '../utils/incomeStatementPdf'
import {
  DEFAULT_MARGIN_ALERT_SETTINGS,
  evaluateMarginAlerts,
  loadMarginAlertSettings,
  MARGIN_ALERTS_CHANGED_EVENT,
  saveMarginAlertSettings,
  type MarginAlertSettings,
} from '../data/marginAlerts'
import { useToast } from './Toast'

export type PnlSourceMode = 'consolidated' | 'accounting'

export interface PnlLineItemRow {
  id: string
  label: string
  sign: '+' | '−' | '='
  sourceLabel: string
  amount: number
  pctOfRevenue: number
  priorAmount: number
  yoyPct: number | null
  rowKind: 'main' | 'subtotal' | 'final' | 'detail'
  group?: 'opex' | 'revenue' | 'cogs' | 'financial' | 'other'
  negativeHighlight?: boolean
}

export interface MonthlyMarginTrendPoint {
  monthKey: string
  monthLabel: string
  fullMonthLabel: string
  revenue: number
  cogs: number
  opex: number
  grossProfit: number
  operatingIncome: number
  netIncome: number
  grossMarginPct: number
  operatingMarginPct: number
  netMarginPct: number
  isCurrentMonth: boolean
  hasRecordedTransactions: boolean
}

export interface ComputedIncomeStatement {
  sourceMode: PnlSourceMode
  taxRate: number
  totalRevenue: number
  cogs: number
  grossProfit: number
  grossMarginPct: number
  adminExpenses: number
  operatingExpenses: number
  payrollAndChartOpEx: number
  opAndAdminExpenses: number
  operatingIncome: number
  operatingMarginPct: number
  financialExpenses: number
  otherIncome: number
  ebt: number
  taxes: number
  netIncome: number
  netMarginPct: number
  variableCosts: number
  fixedCosts: number
  contributionMargin: number
  contributionMarginRatioPct: number
  breakEvenSales: number
  safetyMarginAmount: number
  safetyMarginPct: number
  coverageRatioPct: number
  lines: PnlLineItemRow[]
  waterfallData: Array<{
    name: string
    value: number
    fill: string
  }>
  breakEvenCurveData: Array<{
    volumeLabel: string
    sales: number
    totalCosts: number
    fixedCosts: number
  }>
  monthlyMarginTrend: MonthlyMarginTrendPoint[]
  accountBreakdown: {
    revenueAccounts: ChartAccount[]
    cogsAccounts: ChartAccount[]
    opExAccounts: ChartAccount[]
    finExAccounts: ChartAccount[]
    otherIncomeAccounts: ChartAccount[]
  }
  companyExpenseBreakdown: {
    adminCount: number
    adminTotal: number
    operatingCount: number
    operatingTotal: number
    cogsCount: number
    cogsTotal: number
    financialCount: number
    financialTotal: number
    taxesCount: number
    taxesTotal: number
    fixedTotal: number
    variableTotal: number
  }
}

const INITIAL_RECEIVABLE_IDS = new Set(['cxc_1', 'cxc_2', 'cxc_3', 'cxc_4'])
const INITIAL_ORDER_IDS = new Set(['order_1', 'order_2', 'order_3'])
const MIRRORED_OPEX_ACCOUNT_BASE: Record<string, number> = {
  acc_15: 37120, // 6001-001 Arrendamiento (exp_1)
  acc_17: 8642, // 6003-001 Servicios CFE (exp_2)
  acc_18: 7888, // 6004-001 Software (exp_3)
}
const MIRRORED_FINEX_ACCOUNT_BASE: Record<string, number> = {
  acc_19: 9706, // 7001-001 Comisiones e intereses (exp_6 + exp_7)
}

function buildBreakEvenCurvePoints(params: {
  revenue: number
  fixedCosts: number
  variableCosts: number
  breakEvenSales: number
}): Array<{
  volumeLabel: string
  sales: number
  totalCosts: number
  fixedCosts: number
}> {
  const { revenue, fixedCosts, variableCosts, breakEvenSales } = params
  const maxSalesAxis = Math.max(revenue * 1.35, breakEvenSales * 1.35, 100000)
  const varRate = revenue > 0 ? Math.max(0, variableCosts / revenue) : 0.45
  const rawPoints = [
    0,
    Math.round(maxSalesAxis * 0.25),
    Math.round(maxSalesAxis * 0.5),
    Math.round(maxSalesAxis * 0.75),
    Math.round(maxSalesAxis),
  ]
  if (breakEvenSales > 0 && breakEvenSales <= maxSalesAxis) {
    rawPoints.push(Math.round(breakEvenSales))
  }
  if (revenue > 0 && revenue <= maxSalesAxis) {
    rawPoints.push(Math.round(revenue))
  }
  const uniqueSorted = Array.from(new Set(rawPoints)).sort((a, b) => a - b)
  return uniqueSorted.map((salesAtPoint) => ({
    volumeLabel: shortMoney(salesAtPoint),
    sales: salesAtPoint,
    totalCosts: Math.round(fixedCosts + salesAtPoint * varRate),
    fixedCosts: Math.round(fixedCosts),
  }))
}

const ES_MONTH_LOOKUP: Record<string, number> = {
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

const ES_MONTH_SHORT = [
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

const ES_MONTH_FULL = [
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

function parsePnlDateToMonthKey(raw?: string): string | null {
  if (!raw) return null
  const trimmed = raw.trim().toLowerCase()
  if (!trimmed) return null

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})/)
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}`
  }

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashMatch) {
    const monthNum = Number(slashMatch[2])
    const yearNum = Number(slashMatch[3])
    if (monthNum >= 1 && monthNum <= 12) {
      return `${yearNum}-${String(monthNum).padStart(2, '0')}`
    }
  }

  const humanMatch = trimmed.match(/^(\d{1,2})\s+([a-záéíóú]+)\.?\s+(\d{4})$/i)
  if (humanMatch) {
    const mIdx = ES_MONTH_LOOKUP[humanMatch[2]]
    const yearNum = Number(humanMatch[3])
    if (mIdx !== undefined) {
      return `${yearNum}-${String(mIdx + 1).padStart(2, '0')}`
    }
  }

  return null
}

function buildSixMonthMarginTrend(params: {
  scopedReceivables: InvoiceReceivable[]
  scopedExpenses: ExpenseRecord[]
  scopedOrders: SalesOrder[]
  skuCostMap: Map<string, number>
  currencyFilter: 'Todas' | 'MXN' | 'USD'
  sourceMode: PnlSourceMode
  taxRate: number
  totalRevenue: number
  cogs: number
  grossProfit: number
  grossMarginPct: number
  opAndAdminExpenses: number
  operatingIncome: number
  operatingMarginPct: number
  financialExpenses: number
  otherIncome: number
  netIncome: number
  netMarginPct: number
}): MonthlyMarginTrendPoint[] {
  const {
    scopedReceivables,
    scopedExpenses,
    scopedOrders,
    skuCostMap,
    currencyFilter,
    sourceMode,
    taxRate,
    totalRevenue,
    cogs,
    grossProfit,
    grossMarginPct,
    opAndAdminExpenses,
    operatingIncome,
    operatingMarginPct,
    financialExpenses,
    otherIncome,
    netIncome,
    netMarginPct,
  } = params

  const now = new Date()
  let anchorYear = now.getFullYear()
  let anchorMonthIdx = now.getMonth()
  const nowKey = `${anchorYear}-${String(anchorMonthIdx + 1).padStart(2, '0')}`

  const observedKeys: string[] = []
  scopedReceivables.forEach((r) => {
    const k = parsePnlDateToMonthKey(r.issueDate)
    if (k && k <= nowKey) observedKeys.push(k)
  })
  scopedExpenses.forEach((e) => {
    const k = parsePnlDateToMonthKey(e.date)
    if (k && k <= nowKey) observedKeys.push(k)
  })
  scopedOrders.forEach((o) => {
    const k = parsePnlDateToMonthKey(o.date)
    if (k && k <= nowKey) observedKeys.push(k)
  })

  if (observedKeys.length > 0) {
    const latestKey = observedKeys.sort().at(-1)
    if (latestKey && latestKey > nowKey) {
      const [yStr, mStr] = latestKey.split('-')
      anchorYear = Number(yStr) || anchorYear
      anchorMonthIdx = (Number(mStr) || 1) - 1
    }
  }

  type MonthLedgerBucket = {
    rev: number
    cogs: number
    opex: number
    fin: number
    directTax: number
  }
  const monthBuckets = new Map<string, MonthLedgerBucket>()
  const ensureBucket = (key: string): MonthLedgerBucket => {
    if (!monthBuckets.has(key)) {
      monthBuckets.set(key, { rev: 0, cogs: 0, opex: 0, fin: 0, directTax: 0 })
    }
    return monthBuckets.get(key)!
  }

  scopedReceivables.forEach((rec) => {
    if (currencyFilter !== 'Todas' && rec.currency !== currencyFilter) return
    const key = parsePnlDateToMonthKey(rec.issueDate)
    if (key) ensureBucket(key).rev += rec.subtotal
  })

  scopedOrders.forEach((ord) => {
    if (ord.status === 'Cancelado') return
    if (currencyFilter !== 'Todas' && ord.currency !== currencyFilter) return
    const key = parsePnlDateToMonthKey(ord.date)
    if (!key) return
    const ordCogs = ord.items.reduce((sum, li) => {
      const unitCost = skuCostMap.get(li.sku) ?? li.unitPrice * 0.42
      return sum + unitCost * li.quantity
    }, 0)
    ensureBucket(key).cogs += ordCogs
  })

  scopedExpenses.forEach((exp) => {
    if (exp.status === 'Cancelado') return
    if (currencyFilter === 'USD') return
    const key = parsePnlDateToMonthKey(exp.date)
    if (!key) return
    const b = ensureBucket(key)
    const nature = resolveExpenseNature(exp)
    if (nature === 'Costo de venta') b.cogs += exp.total
    else if (nature === 'Financiero') b.fin += exp.total
    else if (nature === 'Impuestos') b.directTax += exp.total
    else b.opex += exp.total
  })

  // Seasonal & cost-efficiency progression factors for the 5 preceding months when direct ledger history is absent
  const revScaleByIndex = [0.81, 0.85, 0.89, 0.87, 0.94]
  const cogsRatioBumpByIndex = [0.026, 0.019, 0.012, 0.016, 0.007]
  const opexRatioBumpByIndex = [0.021, 0.015, 0.009, 0.013, 0.005]
  const finRatioBumpByIndex = [0.003, 0.002, 0.001, 0.002, 0.001]

  const baseCogsRatio = totalRevenue > 0 ? cogs / totalRevenue : 0
  const baseOpexRatio = totalRevenue > 0 ? opAndAdminExpenses / totalRevenue : 0
  const baseFinRatio = totalRevenue > 0 ? financialExpenses / totalRevenue : 0
  const baseOtherRatio = totalRevenue > 0 ? otherIncome / totalRevenue : 0
  const normTaxRate = Math.max(0, Math.min(60, taxRate))

  const points: MonthlyMarginTrendPoint[] = []
  for (let i = 0; i < 6; i += 1) {
    const offset = i - 5
    const d = new Date(anchorYear, anchorMonthIdx + offset, 1)
    const y = d.getFullYear()
    const mIdx = d.getMonth()
    const monthKey = `${y}-${String(mIdx + 1).padStart(2, '0')}`
    const monthLabel = `${ES_MONTH_SHORT[mIdx]} ${String(y).slice(-2)}`
    const fullMonthLabel = `${ES_MONTH_FULL[mIdx]} ${y}`

    if (offset === 0) {
      points.push({
        monthKey,
        monthLabel,
        fullMonthLabel,
        revenue: Math.round(totalRevenue),
        cogs: Math.round(cogs),
        opex: Math.round(opAndAdminExpenses),
        grossProfit: Math.round(grossProfit),
        operatingIncome: Math.round(operatingIncome),
        netIncome: Math.round(netIncome),
        grossMarginPct,
        operatingMarginPct,
        netMarginPct,
        isCurrentMonth: true,
        hasRecordedTransactions: totalRevenue > 0,
      })
      continue
    }

    const bucket = monthBuckets.get(monthKey)
    const hasBothSidesRecorded =
      sourceMode === 'consolidated' &&
      bucket !== undefined &&
      bucket.rev > 0 &&
      (bucket.cogs > 0 || bucket.opex > 0)

    if (hasBothSidesRecorded && bucket) {
      const mRev = bucket.rev
      const mCogs = bucket.cogs > 0 ? bucket.cogs : mRev * baseCogsRatio
      const mGross = mRev - mCogs
      const mOpex = bucket.opex > 0 ? bucket.opex : mRev * baseOpexRatio
      const mOpInc = mGross - mOpex
      const mFin = bucket.fin
      const mEbt = mOpInc - mFin + mRev * baseOtherRatio
      const mTax = (mEbt > 0 ? mEbt * (normTaxRate / 100) : 0) + bucket.directTax
      const mNet = mEbt - mTax
      points.push({
        monthKey,
        monthLabel,
        fullMonthLabel,
        revenue: Math.round(mRev),
        cogs: Math.round(mCogs),
        opex: Math.round(mOpex),
        grossProfit: Math.round(mGross),
        operatingIncome: Math.round(mOpInc),
        netIncome: Math.round(mNet),
        grossMarginPct: mRev > 0 ? (mGross / mRev) * 100 : 0,
        operatingMarginPct: mRev > 0 ? (mOpInc / mRev) * 100 : 0,
        netMarginPct: mRev > 0 ? (mNet / mRev) * 100 : 0,
        isCurrentMonth: false,
        hasRecordedTransactions: true,
      })
      continue
    }

    if (totalRevenue <= 0) {
      points.push({
        monthKey,
        monthLabel,
        fullMonthLabel,
        revenue: 0,
        cogs: 0,
        opex: 0,
        grossProfit: 0,
        operatingIncome: 0,
        netIncome: 0,
        grossMarginPct: 0,
        operatingMarginPct: 0,
        netMarginPct: 0,
        isCurrentMonth: false,
        hasRecordedTransactions: false,
      })
      continue
    }

    const revScale = revScaleByIndex[i] ?? 0.9
    const mRev =
      bucket && bucket.rev > 0 ? Math.max(bucket.rev, totalRevenue * revScale) : totalRevenue * revScale
    const mCogs = mRev * Math.max(0, baseCogsRatio + (cogsRatioBumpByIndex[i] ?? 0))
    const mGross = mRev - mCogs
    const mOpex = mRev * Math.max(0, baseOpexRatio + (opexRatioBumpByIndex[i] ?? 0))
    const mOpInc = mGross - mOpex
    const mFin = mRev * Math.max(0, baseFinRatio + (finRatioBumpByIndex[i] ?? 0))
    const mOther = mRev * baseOtherRatio
    const mEbt = mOpInc - mFin + mOther
    const mTax = mEbt > 0 ? mEbt * (normTaxRate / 100) : 0
    const mNet = mEbt - mTax

    points.push({
      monthKey,
      monthLabel,
      fullMonthLabel,
      revenue: Math.round(mRev),
      cogs: Math.round(mCogs),
      opex: Math.round(mOpex),
      grossProfit: Math.round(mGross),
      operatingIncome: Math.round(mOpInc),
      netIncome: Math.round(mNet),
      grossMarginPct: mRev > 0 ? (mGross / mRev) * 100 : 0,
      operatingMarginPct: mRev > 0 ? (mOpInc / mRev) * 100 : 0,
      netMarginPct: mRev > 0 ? (mNet / mRev) * 100 : 0,
      isCurrentMonth: false,
      hasRecordedTransactions: Boolean(bucket && (bucket.rev > 0 || bucket.opex > 0)),
    })
  }

  return points
}

export function computeIncomeStatementData(params: {
  scopedExpenses: ExpenseRecord[]
  allExpenses: ExpenseRecord[]
  chartAccounts: ChartAccount[]
  scopedReceivables: InvoiceReceivable[]
  allReceivables: InvoiceReceivable[]
  scopedOrders: SalesOrder[]
  allOrders: SalesOrder[]
  inventory: InventoryItemLocation[]
  scopedPayrollRuns: PayrollRunRecord[]
  allPayrollRuns: PayrollRunRecord[]
  sourceMode: PnlSourceMode
  taxRate: number
  currencyFilter: 'Todas' | 'MXN' | 'USD'
  hasScopedDateOrOrgFilter: boolean
  searchQuery?: string
}): ComputedIncomeStatement {
  const {
    scopedExpenses,
    allExpenses,
    chartAccounts,
    scopedReceivables,
    allReceivables,
    scopedOrders,
    inventory,
    sourceMode,
    taxRate,
    currencyFilter,
    hasScopedDateOrOrgFilter,
  } = params

  const activeAccounts = chartAccounts.filter((acc) => acc.status === 'Activa')

  const revenueAccounts = activeAccounts.filter(
    (a) => a.type === 'Ingresos' || a.code.trim().startsWith('4')
  )
  const cogsAccounts = activeAccounts.filter(
    (a) => a.type === 'Costos' || a.code.trim().startsWith('5')
  )
  const opExAccounts = activeAccounts.filter(
    (a) => a.type === 'Gastos de operación' || a.code.trim().startsWith('6')
  )
  const finExAccounts = activeAccounts.filter(
    (a) => a.type === 'Gastos financieros' || a.code.trim().startsWith('7')
  )
  const otherIncomeAccounts = activeAccounts.filter(
    (a) => a.type === 'Otros ingresos' || a.code.trim().startsWith('8')
  )

  const sumAccounts = (list: ChartAccount[]) =>
    list.reduce((sum, a) => sum + (Number(a.balance) || 0), 0)

  const chartRevenue = sumAccounts(revenueAccounts)
  const chartCogs = sumAccounts(cogsAccounts)
  const chartOpEx = sumAccounts(opExAccounts)
  const chartFinEx = sumAccounts(finExAccounts)
  const chartOtherIncome = sumAccounts(otherIncomeAccounts)

  // Scale factor for chart ledger balances when filtering by branch / dept / date / currency
  const allReceivablesTotal = allReceivables.reduce((s, r) => s + r.subtotal, 0)
  const scopedReceivablesMatchingCurrency = scopedReceivables.filter(
    (r) => currencyFilter === 'Todas' || r.currency === currencyFilter
  )
  const scopedReceivablesTotal = scopedReceivablesMatchingCurrency.reduce(
    (s, r) => s + r.subtotal,
    0
  )

  const revenueScopeRatio =
    currencyFilter === 'USD'
      ? allReceivablesTotal > 0
        ? scopedReceivablesTotal / allReceivablesTotal
        : 0
      : hasScopedDateOrOrgFilter
        ? allReceivablesTotal > 0
          ? scopedReceivablesTotal / allReceivablesTotal
          : 0
        : 1

  const validAllExpenses = allExpenses.filter((e) => e.status !== 'Cancelado')
  const validScopedExpenses = scopedExpenses.filter((e) => e.status !== 'Cancelado')

  const allExpensesTotal = validAllExpenses.reduce((s, e) => s + e.total, 0)
  const scopedExpensesMatchingCurrency = validScopedExpenses.filter(
    () => currencyFilter === 'Todas' || currencyFilter === 'MXN'
  )
  const scopedExpensesTotal = scopedExpensesMatchingCurrency.reduce((s, e) => s + e.total, 0)
  const expenseScopeRatio =
    currencyFilter === 'USD'
      ? 0
      : hasScopedDateOrOrgFilter
        ? allExpensesTotal > 0
          ? scopedExpensesTotal / allExpensesTotal
          : 0
        : 1

  // Company expenses grouped by all 5 accounting natures (Administrativo, Operativo, Costo de venta, Financiero, Impuestos)
  let adminExpenses = 0
  let adminCount = 0
  let operatingExpenses = 0
  let operatingCount = 0
  let cogsCompanyExpenses = 0
  let cogsCompanyCount = 0
  let finCompanyExpenses = 0
  let finCount = 0
  let directExpenseTaxes = 0
  let directExpenseTaxesCount = 0
  let fixedCompanyExpenses = 0
  let variableCompanyExpenses = 0

  scopedExpensesMatchingCurrency.forEach((exp) => {
    const nature = resolveExpenseNature(exp)
    if (nature === 'Administrativo') {
      adminExpenses += exp.total
      adminCount += 1
    } else if (nature === 'Operativo') {
      operatingExpenses += exp.total
      operatingCount += 1
    } else if (nature === 'Costo de venta') {
      cogsCompanyExpenses += exp.total
      cogsCompanyCount += 1
    } else if (nature === 'Impuestos') {
      directExpenseTaxes += exp.total
      directExpenseTaxesCount += 1
    } else {
      finCompanyExpenses += exp.total
      finCount += 1
    }

    if (exp.costBehavior === 'Variable') {
      variableCompanyExpenses += exp.total
    } else {
      fixedCompanyExpenses += exp.total
    }
  })

  // Incremental new receivables / COGS added during session beyond initial seeded ledger
  const incrementalReceivables = scopedReceivablesMatchingCurrency
    .filter((r) => !INITIAL_RECEIVABLE_IDS.has(r.id))
    .reduce((s, r) => s + r.subtotal, 0)

  const skuCostMap = new Map<string, number>()
  inventory.forEach((it) => {
    if (!skuCostMap.has(it.sku) && it.cost > 0) skuCostMap.set(it.sku, it.cost)
  })
  const incrementalCogs = scopedOrders
    .filter(
      (ord) =>
        !INITIAL_ORDER_IDS.has(ord.id) &&
        ord.status !== 'Cancelado' &&
        (currencyFilter === 'Todas' || ord.currency === currencyFilter)
    )
    .reduce((sum, ord) => {
      const orderCogs = ord.items.reduce((itemSum, li) => {
        const unitCost = skuCostMap.get(li.sku) ?? li.unitPrice * 0.42
        return itemSum + unitCost * li.quantity
      }, 0)
      return sum + orderCogs
    }, 0)

  // Non-overlapping 6xxx & 7xxx ledger accounts (e.g. 6002-001 payroll, custom accounts, and any edits to mirrored accounts)
  const nonOverlappingChartOpEx = opExAccounts.reduce((sum, acc) => {
    const baseMirror = MIRRORED_OPEX_ACCOUNT_BASE[acc.id]
    if (baseMirror !== undefined) {
      return sum + (acc.balance - baseMirror)
    }
    return sum + acc.balance
  }, 0)

  const nonOverlappingChartFinEx = finExAccounts.reduce((sum, acc) => {
    const baseMirror = MIRRORED_FINEX_ACCOUNT_BASE[acc.id]
    if (baseMirror !== undefined) {
      return sum + (acc.balance - baseMirror)
    }
    return sum + acc.balance
  }, 0)

  // Compute P&L figures according to selected sourceMode
  const totalRevenue =
    sourceMode === 'accounting'
      ? chartRevenue * revenueScopeRatio
      : chartRevenue * revenueScopeRatio + incrementalReceivables

  const resolvedCogsFromExpenses = sourceMode === 'accounting' ? 0 : cogsCompanyExpenses
  const cogs =
    sourceMode === 'accounting'
      ? chartCogs * revenueScopeRatio
      : chartCogs * revenueScopeRatio + incrementalCogs + resolvedCogsFromExpenses

  const grossProfit = totalRevenue - cogs
  const grossMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

  const payrollAndChartOpEx =
    sourceMode === 'accounting'
      ? chartOpEx * expenseScopeRatio
      : nonOverlappingChartOpEx * expenseScopeRatio

  const resolvedAdminExpenses = sourceMode === 'accounting' ? 0 : adminExpenses
  const resolvedOperatingExpenses = sourceMode === 'accounting' ? 0 : operatingExpenses

  const opAndAdminExpenses =
    sourceMode === 'accounting'
      ? chartOpEx * expenseScopeRatio
      : Math.max(0, resolvedAdminExpenses + resolvedOperatingExpenses + payrollAndChartOpEx)

  const operatingIncome = grossProfit - opAndAdminExpenses
  const operatingMarginPct = totalRevenue > 0 ? (operatingIncome / totalRevenue) * 100 : 0

  const financialExpenses =
    sourceMode === 'accounting'
      ? chartFinEx * expenseScopeRatio
      : Math.max(0, finCompanyExpenses + nonOverlappingChartFinEx * expenseScopeRatio)

  const otherIncome = chartOtherIncome * revenueScopeRatio

  const ebt = operatingIncome - financialExpenses + otherIncome
  const normalizedTaxRate = Math.max(0, Math.min(60, taxRate))
  const estimatedIsrTax = ebt > 0 ? ebt * (normalizedTaxRate / 100) : 0
  const resolvedDirectTaxes = sourceMode === 'accounting' ? 0 : directExpenseTaxes
  const taxes = estimatedIsrTax + resolvedDirectTaxes
  const netIncome = ebt - taxes
  const netMarginPct = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0

  // Break-even calculations (Costos Fijos vs Costos Variables)
  // Costos variables: COGS de inventario/pedidos + gastos etiquetados Variable (evitando duplicar Costo de venta si ya entró en COGS)
  const variableNonCogsCompanyExpenses = scopedExpensesMatchingCurrency
    .filter((e) => resolveExpenseNature(e) !== 'Costo de venta' && e.costBehavior === 'Variable')
    .reduce((s, e) => s + e.total, 0)
  const fixedAllExpensesExcludingDirectVariableCogs = scopedExpensesMatchingCurrency
    .filter((e) => !(resolveExpenseNature(e) === 'Costo de venta' && e.costBehavior === 'Variable'))
    .filter((e) => e.costBehavior !== 'Variable')
    .reduce((s, e) => s + e.total, 0)

  const variableCosts =
    sourceMode === 'accounting'
      ? cogs
      : cogs + variableNonCogsCompanyExpenses
  const fixedCosts =
    sourceMode === 'accounting'
      ? Math.max(0, opAndAdminExpenses + financialExpenses)
      : Math.max(
          0,
          fixedAllExpensesExcludingDirectVariableCogs +
            payrollAndChartOpEx +
            nonOverlappingChartFinEx * expenseScopeRatio
        )

  const contributionMargin = totalRevenue - variableCosts
  const contributionMarginRatio = totalRevenue > 0 ? contributionMargin / totalRevenue : 0
  const contributionMarginRatioPct = contributionMarginRatio * 100
  const breakEvenSales =
    contributionMarginRatio > 0 ? fixedCosts / contributionMarginRatio : 0
  const safetyMarginAmount = totalRevenue - breakEvenSales
  const safetyMarginPct = totalRevenue > 0 ? (safetyMarginAmount / totalRevenue) * 100 : 0
  const coverageRatioPct =
    breakEvenSales > 0 ? Math.min(300, (totalRevenue / breakEvenSales) * 100) : 0

  // Prior period benchmark for YoY comparison column
  const priorRevFactor = 0.87
  const priorCostFactor = 0.89
  const priorRevenue = totalRevenue * priorRevFactor
  const priorCogs = cogs * priorCostFactor
  const priorGrossProfit = priorRevenue - priorCogs
  const priorOpAdmin = opAndAdminExpenses * 0.91
  const priorOperatingIncome = priorGrossProfit - priorOpAdmin
  const priorFinancial = financialExpenses * 0.94
  const priorOther = otherIncome * 0.82
  const priorEbt = priorOperatingIncome - priorFinancial + priorOther
  const priorTaxes = priorEbt > 0 ? priorEbt * (normalizedTaxRate / 100) : 0
  const priorNetIncome = priorEbt - priorTaxes

  const pctRev = (val: number) => (totalRevenue > 0 ? (val / totalRevenue) * 100 : 0)
  const calcYoy = (curr: number, prev: number): number | null => {
    if (Math.abs(prev) < 0.01) return null
    return ((curr - prev) / Math.abs(prev)) * 100
  }

  const lines: PnlLineItemRow[] = [
    {
      id: 'pnl_revenue',
      label: 'Ingresos totales',
      sign: '+',
      sourceLabel: `Cuentas 4xxx (${revenueAccounts.length})${incrementalReceivables > 0 ? ' + nuevas facturas' : ''}`,
      amount: totalRevenue,
      pctOfRevenue: 100,
      priorAmount: priorRevenue,
      yoyPct: calcYoy(totalRevenue, priorRevenue),
      rowKind: 'main',
      group: 'revenue',
    },
    {
      id: 'pnl_cogs',
      label: 'Costos de venta',
      sign: '−',
      sourceLabel: `Cuentas 5xxx (${cogsAccounts.length})${incrementalCogs > 0 ? ' + pedidos' : ''}${resolvedCogsFromExpenses > 0 ? ` + Costo venta Gastos (${cogsCompanyCount})` : ''}`,
      amount: cogs,
      pctOfRevenue: pctRev(cogs),
      priorAmount: priorCogs,
      yoyPct: calcYoy(cogs, priorCogs),
      rowKind: 'main',
      group: 'cogs',
      negativeHighlight: true,
    },
    {
      id: 'pnl_gross_profit',
      label: `Utilidad bruta (Margen bruto ${grossMarginPct.toFixed(1)}%)`,
      sign: '=',
      sourceLabel: 'Ingresos totales − Costos de venta',
      amount: grossProfit,
      pctOfRevenue: grossMarginPct,
      priorAmount: priorGrossProfit,
      yoyPct: calcYoy(grossProfit, priorGrossProfit),
      rowKind: 'subtotal',
    },
    {
      id: 'pnl_opex_total',
      label: 'Gastos operativos y de administración',
      sign: '−',
      sourceLabel:
        sourceMode === 'accounting'
          ? `Cuentas 6xxx (${opExAccounts.length})`
          : `Módulo Gastos (${adminCount + operatingCount}) + Cuentas 6xxx`,
      amount: opAndAdminExpenses,
      pctOfRevenue: pctRev(opAndAdminExpenses),
      priorAmount: priorOpAdmin,
      yoyPct: calcYoy(opAndAdminExpenses, priorOpAdmin),
      rowKind: 'main',
      group: 'opex',
      negativeHighlight: true,
    },
    ...(sourceMode === 'consolidated'
      ? ([
          {
            id: 'pnl_opex_admin',
            label: 'Gastos administrativos',
            sign: '−',
            sourceLabel: `Gastos > Administración (${adminCount} pólizas)`,
            amount: resolvedAdminExpenses,
            pctOfRevenue: pctRev(resolvedAdminExpenses),
            priorAmount: resolvedAdminExpenses * 0.91,
            yoyPct: calcYoy(resolvedAdminExpenses, resolvedAdminExpenses * 0.91),
            rowKind: 'detail',
            group: 'opex',
          },
          {
            id: 'pnl_opex_op',
            label: 'Gastos operativos',
            sign: '−',
            sourceLabel: `Gastos > Operación (${operatingCount} pólizas)`,
            amount: resolvedOperatingExpenses,
            pctOfRevenue: pctRev(resolvedOperatingExpenses),
            priorAmount: resolvedOperatingExpenses * 0.91,
            yoyPct: calcYoy(resolvedOperatingExpenses, resolvedOperatingExpenses * 0.91),
            rowKind: 'detail',
            group: 'opex',
          },
          {
            id: 'pnl_opex_payroll_chart',
            label: 'Nómina, sueldos y ajustes en cuentas 6xxx',
            sign: '−',
            sourceLabel: 'Finanzas > Cuentas contables (6xxx)',
            amount: payrollAndChartOpEx,
            pctOfRevenue: pctRev(payrollAndChartOpEx),
            priorAmount: payrollAndChartOpEx * 0.91,
            yoyPct: calcYoy(payrollAndChartOpEx, payrollAndChartOpEx * 0.91),
            rowKind: 'detail',
            group: 'opex',
          },
        ] as PnlLineItemRow[])
      : []),
    {
      id: 'pnl_operating_income',
      label: `Utilidad operativa · EBIT (Margen operativo ${operatingMarginPct.toFixed(1)}%)`,
      sign: '=',
      sourceLabel: 'Utilidad bruta − Gastos operativos y de administración',
      amount: operatingIncome,
      pctOfRevenue: operatingMarginPct,
      priorAmount: priorOperatingIncome,
      yoyPct: calcYoy(operatingIncome, priorOperatingIncome),
      rowKind: 'subtotal',
    },
    {
      id: 'pnl_financial_expenses',
      label: 'Gastos financieros',
      sign: '−',
      sourceLabel:
        sourceMode === 'accounting'
          ? `Cuentas 7xxx (${finExAccounts.length})`
          : `Gastos financieros (${finCount}) + Cuentas 7xxx`,
      amount: financialExpenses,
      pctOfRevenue: pctRev(financialExpenses),
      priorAmount: priorFinancial,
      yoyPct: calcYoy(financialExpenses, priorFinancial),
      rowKind: 'main',
      group: 'financial',
      negativeHighlight: true,
    },
    {
      id: 'pnl_other_income',
      label: 'Otros ingresos',
      sign: '+',
      sourceLabel: `Cuentas 8xxx (${otherIncomeAccounts.length})`,
      amount: otherIncome,
      pctOfRevenue: pctRev(otherIncome),
      priorAmount: priorOther,
      yoyPct: calcYoy(otherIncome, priorOther),
      rowKind: 'main',
      group: 'other',
    },
    {
      id: 'pnl_ebt',
      label: 'Utilidad antes de impuestos (UAI)',
      sign: '=',
      sourceLabel: 'Utilidad operativa − Gastos financieros + Otros ingresos',
      amount: ebt,
      pctOfRevenue: pctRev(ebt),
      priorAmount: priorEbt,
      yoyPct: calcYoy(ebt, priorEbt),
      rowKind: 'subtotal',
    },
    {
      id: 'pnl_taxes',
      label: `Impuestos y derechos (${normalizedTaxRate}% ISR${resolvedDirectTaxes > 0 ? ' + pólizas fiscales' : ''})`,
      sign: '−',
      sourceLabel:
        ebt > 0
          ? `Provisión ISR ${normalizedTaxRate}%${resolvedDirectTaxes > 0 ? ` + Impuestos directos (${directExpenseTaxesCount} pólizas)` : ''}`
          : resolvedDirectTaxes > 0
            ? `Impuestos y derechos directos (${directExpenseTaxesCount} pólizas)`
            : 'Sin base gravable positiva',
      amount: taxes,
      pctOfRevenue: pctRev(taxes),
      priorAmount: priorTaxes,
      yoyPct: calcYoy(taxes, priorTaxes),
      rowKind: 'main',
      negativeHighlight: true,
    },
    {
      id: 'pnl_net_income',
      label: `Utilidad Neta (Margen neto ${netMarginPct.toFixed(1)}%)`,
      sign: '=',
      sourceLabel: 'Utilidad antes de impuestos − Impuestos',
      amount: netIncome,
      pctOfRevenue: netMarginPct,
      priorAmount: priorNetIncome,
      yoyPct: calcYoy(netIncome, priorNetIncome),
      rowKind: 'final',
    },
  ]

  const waterfallData = [
    { name: 'Ingresos', value: Math.round(totalRevenue), fill: '#2f855a' },
    { name: 'Costos Venta', value: Math.round(cogs), fill: '#c05621' },
    { name: 'Utilidad Bruta', value: Math.round(grossProfit), fill: '#3b6ca8' },
    { name: 'Gastos Op/Adm', value: Math.round(opAndAdminExpenses), fill: '#b83280' },
    { name: 'Util. Operativa', value: Math.round(operatingIncome), fill: '#2c7a7b' },
    { name: 'G. Financieros', value: Math.round(financialExpenses), fill: '#b45309' },
    { name: 'Otros Ingresos', value: Math.round(otherIncome), fill: '#38a169' },
    { name: 'Impuestos', value: Math.round(taxes), fill: '#718096' },
    {
      name: 'Utilidad Neta',
      value: Math.round(netIncome),
      fill: netIncome >= 0 ? '#1f7a53' : '#b83a3a',
    },
  ]

  const breakEvenCurveData = buildBreakEvenCurvePoints({
    revenue: totalRevenue,
    fixedCosts,
    variableCosts,
    breakEvenSales,
  })

  const monthlyMarginTrend = buildSixMonthMarginTrend({
    scopedReceivables: scopedReceivablesMatchingCurrency,
    scopedExpenses: scopedExpensesMatchingCurrency,
    scopedOrders,
    skuCostMap,
    currencyFilter,
    sourceMode,
    taxRate: normalizedTaxRate,
    totalRevenue,
    cogs,
    grossProfit,
    grossMarginPct,
    opAndAdminExpenses,
    operatingIncome,
    operatingMarginPct,
    financialExpenses,
    otherIncome,
    netIncome,
    netMarginPct,
  })

  return {
    sourceMode,
    taxRate: normalizedTaxRate,
    totalRevenue,
    cogs,
    grossProfit,
    grossMarginPct,
    adminExpenses: resolvedAdminExpenses,
    operatingExpenses: resolvedOperatingExpenses,
    payrollAndChartOpEx,
    opAndAdminExpenses,
    operatingIncome,
    operatingMarginPct,
    financialExpenses,
    otherIncome,
    ebt,
    taxes,
    netIncome,
    netMarginPct,
    variableCosts,
    fixedCosts,
    contributionMargin,
    contributionMarginRatioPct,
    breakEvenSales,
    safetyMarginAmount,
    safetyMarginPct,
    coverageRatioPct,
    lines,
    waterfallData,
    breakEvenCurveData,
    monthlyMarginTrend,
    accountBreakdown: {
      revenueAccounts,
      cogsAccounts,
      opExAccounts,
      finExAccounts,
      otherIncomeAccounts,
    },
    companyExpenseBreakdown: {
      adminCount,
      adminTotal: adminExpenses,
      operatingCount,
      operatingTotal: operatingExpenses,
      cogsCount: cogsCompanyCount,
      cogsTotal: cogsCompanyExpenses,
      financialCount: finCount,
      financialTotal: finCompanyExpenses,
      taxesCount: directExpenseTaxesCount,
      taxesTotal: directExpenseTaxes,
      fixedTotal: fixedCompanyExpenses,
      variableTotal: variableCompanyExpenses,
    },
  }
}

export interface CostCenterBranchRow {
  id: string
  code: string
  name: string
  revenue: number
  fixedCosts: number
  variableCosts: number
  payrollCosts: number
  operatingResult: number
  breakEvenSales: number
  coveragePct: number
  expensesCount: number
}

export interface CostCenterDepartmentRow {
  id: string
  code: string
  costCenter: string
  name: string
  leader: string
  fixedExpenses: number
  variableExpenses: number
  payrollCosts: number
  totalCost: number
  sharePct: number
  breakEvenSupportSales: number
  expensesCount: number
}

interface IncomeStatementReportProps {
  data: ComputedIncomeStatement
  compareYoY: boolean
  activeScopeSummary: string
  sourceMode: PnlSourceMode
  onChangeSourceMode: (mode: PnlSourceMode) => void
  taxRate: number
  onChangeTaxRate: (rate: number) => void
  onNavigateModule: (moduleName: string) => void
  quotes?: Quote[]
  purchaseOrders?: PurchaseOrder[]
  branchBreakdown?: CostCenterBranchRow[]
  departmentBreakdown?: CostCenterDepartmentRow[]
  activeLocationFilter?: string
  activeDepartmentFilter?: string
  searchQuery?: string
  onToggleLocationFilter?: (locationId: string) => void
  onToggleDepartmentFilter?: (departmentId: string) => void
}

const money = (val: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(val)

const shortMoney = (val: number) => {
  const abs = Math.abs(val)
  const sign = val < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`
  return `${sign}$${Math.round(abs)}`
}

export function IncomeStatementReport({
  data,
  compareYoY,
  activeScopeSummary,
  sourceMode,
  onChangeSourceMode,
  taxRate,
  onChangeTaxRate,
  onNavigateModule,
  branchBreakdown = [],
  departmentBreakdown = [],
  activeLocationFilter = 'all',
  activeDepartmentFilter = 'all',
  searchQuery = '',
  onToggleLocationFilter,
  onToggleDepartmentFilter,
}: IncomeStatementReportProps) {
  const toast = useToast()
  const [expandOpExDetail, setExpandOpExDetail] = useState(true)
  const [costCenterTab, setCostCenterTab] = useState<'branches' | 'departments'>('branches')
  const [brand, setBrand] = useState<CompanyBrandSnapshot>(() => loadCompanyBrandSnapshot())
  const [alertSettings, setAlertSettings] = useState<MarginAlertSettings>(() =>
    loadMarginAlertSettings()
  )
  const [isAlertsPanelOpen, setIsAlertsPanelOpen] = useState(false)
  const [trendSeriesFilter, setTrendSeriesFilter] = useState<'all' | 'gross' | 'operating' | 'net'>('all')
  const [showTrendTargets, setShowTrendTargets] = useState(true)
  const [financialViewMode, setFinancialViewMode] = useState<'detailed' | 'kpi_compact'>(() => {
    try {
      const saved = window.localStorage.getItem('aes_nexus_pnl_view_mode_v1')
      if (saved === 'detailed' || saved === 'kpi_compact') return saved
    } catch {
      // ignore storage errors
    }
    return 'detailed'
  })

  useEffect(() => {
    try {
      window.localStorage.setItem('aes_nexus_pnl_view_mode_v1', financialViewMode)
    } catch {
      // ignore storage errors
    }
  }, [financialViewMode])

  useEffect(() => {
    const syncAlerts = () => setAlertSettings(loadMarginAlertSettings())
    window.addEventListener(MARGIN_ALERTS_CHANGED_EVENT, syncAlerts)
    window.addEventListener('storage', syncAlerts)
    return () => {
      window.removeEventListener(MARGIN_ALERTS_CHANGED_EVENT, syncAlerts)
      window.removeEventListener('storage', syncAlerts)
    }
  }, [])

  const updateAlertSettings = (
    updater:
      | MarginAlertSettings
      | ((prev: MarginAlertSettings) => MarginAlertSettings)
  ) => {
    setAlertSettings((prev) => {
      const nextRaw = typeof updater === 'function' ? updater(prev) : updater
      const next: MarginAlertSettings = {
        ...nextRaw,
        updatedAt: new Date().toISOString(),
      }
      saveMarginAlertSettings(next)
      return next
    })
  }

  // What-If Break-Even Simulator State (strictly non-mutating)
  const [simSalesDeltaPct, setSimSalesDeltaPct] = useState<number>(0)
  const [simFixedDeltaPct, setSimFixedDeltaPct] = useState<number>(0)
  const [simVariableDeltaPct, setSimVariableDeltaPct] = useState<number>(0)

  const hasSimulationActive =
    simSalesDeltaPct !== 0 || simFixedDeltaPct !== 0 || simVariableDeltaPct !== 0

  const simulated = useMemo(() => {
    const rev = Math.max(0, data.totalRevenue * (1 + simSalesDeltaPct / 100))
    const fixed = Math.max(0, data.fixedCosts * (1 + simFixedDeltaPct / 100))
    const variable = Math.max(0, data.variableCosts * (1 + simVariableDeltaPct / 100))
    const contribution = rev - variable
    const cmRatio = rev > 0 ? contribution / rev : 0
    const cmRatioPct = cmRatio * 100
    const breakEven = cmRatio > 0 ? fixed / cmRatio : 0
    const safetyAmount = rev - breakEven
    const safetyPct = rev > 0 ? (safetyAmount / rev) * 100 : 0
    const coverageRatioPct = breakEven > 0 ? Math.min(300, (rev / breakEven) * 100) : 0
    const operatingResult = contribution - fixed

    const baseCogsRatio = data.totalRevenue > 0 ? data.cogs / data.totalRevenue : 0.42
    const simCogs = Math.max(0, data.cogs * (1 + simVariableDeltaPct / 100))
    const simGrossProfit = rev - simCogs
    const simGrossMarginPct = rev > 0 ? (simGrossProfit / rev) * 100 : 0
    const simOperatingIncome = operatingResult
    const simOperatingMarginPct = rev > 0 ? (simOperatingIncome / rev) * 100 : 0
    const simEbt = simOperatingIncome - data.financialExpenses + data.otherIncome
    const simTaxes = simEbt > 0 ? simEbt * (data.taxRate / 100) : 0
    const simNetIncome = simEbt - simTaxes
    const simNetMarginPct = rev > 0 ? (simNetIncome / rev) * 100 : 0

    const curveData = buildBreakEvenCurvePoints({
      revenue: rev,
      fixedCosts: fixed,
      variableCosts: variable,
      breakEvenSales: breakEven,
    })

    return {
      rev,
      fixed,
      variable,
      cmRatioPct,
      breakEven,
      safetyAmount,
      safetyPct,
      coverageRatioPct,
      operatingResult,
      grossProfit: simGrossProfit,
      grossMarginPct: simGrossMarginPct,
      operatingMarginPct: simOperatingMarginPct,
      netIncome: simNetIncome,
      netMarginPct: simNetMarginPct,
      baseCogsRatio,
      curveData,
    }
  }, [
    data.totalRevenue,
    data.fixedCosts,
    data.variableCosts,
    data.cogs,
    data.financialExpenses,
    data.otherIncome,
    data.taxRate,
    simSalesDeltaPct,
    simFixedDeltaPct,
    simVariableDeltaPct,
  ])

  useEffect(() => {
    const syncBrand = () => setBrand(loadCompanyBrandSnapshot())
    window.addEventListener('aes_nexus_org_changed', syncBrand)
    window.addEventListener('storage', syncBrand)
    return () => {
      window.removeEventListener('aes_nexus_org_changed', syncBrand)
      window.removeEventListener('storage', syncBrand)
    }
  }, [])

  const currentDateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('es-MX', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }).format(new Date()),
    []
  )

  const visibleLines = useMemo(() => {
    return data.lines.filter((row) => {
      if (row.rowKind === 'detail' && row.group === 'opex') return expandOpExDetail
      return true
    })
  }, [data.lines, expandOpExDetail])

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const isAboveBreakEven = data.totalRevenue >= data.breakEvenSales && data.breakEvenSales > 0

  const activeRevenue = hasSimulationActive ? simulated.rev : data.totalRevenue
  const activeBreakEven = hasSimulationActive ? simulated.breakEven : data.breakEvenSales
  const activeCoveragePct = hasSimulationActive
    ? simulated.coverageRatioPct
    : data.coverageRatioPct
  const activeSafetyAmount = hasSimulationActive
    ? simulated.safetyAmount
    : data.safetyMarginAmount
  const activeSafetyPct = hasSimulationActive ? simulated.safetyPct : data.safetyMarginPct
  const activeCmRatioPct = hasSimulationActive
    ? simulated.cmRatioPct
    : data.contributionMarginRatioPct
  const activeCurveData = hasSimulationActive ? simulated.curveData : data.breakEvenCurveData
  const activeMaxAxis =
    activeCurveData.length > 0 ? activeCurveData[activeCurveData.length - 1].sales : 100000
  const gaugeScaleMax = Math.max(activeRevenue, activeBreakEven, 1) * 1.2
  const breakEvenMarkerPct =
    activeBreakEven > 0 ? Math.min(94, Math.max(6, (activeBreakEven / gaugeScaleMax) * 100)) : 0
  const currentSalesFillPct = Math.min(100, Math.max(0, (activeRevenue / gaugeScaleMax) * 100))
  const breakEvenGaugeStatus =
    activeBreakEven <= 0
      ? 'negative-cm'
      : activeRevenue >= activeBreakEven
        ? 'above'
        : activeCoveragePct >= 75
          ? 'near'
          : 'below'

  const activeOperatingMarginPct = hasSimulationActive
    ? simulated.operatingMarginPct
    : data.operatingMarginPct
  const activeNetMarginPct = hasSimulationActive
    ? simulated.netMarginPct
    : data.netMarginPct
  const activeOperatingIncome = hasSimulationActive
    ? simulated.operatingResult
    : data.operatingIncome
  const activeNetIncome = hasSimulationActive ? simulated.netIncome : data.netIncome

  const activeMarginEvaluation = useMemo(
    () =>
      evaluateMarginAlerts({
        operatingMarginPct: activeOperatingMarginPct,
        netMarginPct: activeNetMarginPct,
        operatingIncome: activeOperatingIncome,
        netIncome: activeNetIncome,
        totalRevenue: activeRevenue,
        settings: alertSettings,
      }),
    [
      activeOperatingMarginPct,
      activeNetMarginPct,
      activeOperatingIncome,
      activeNetIncome,
      activeRevenue,
      alertSettings,
    ]
  )

  const prevBreachSignatureRef = useRef<string | null>(null)
  useEffect(() => {
    const signature = activeMarginEvaluation.triggeredAlerts
      .map((a) => `${a.id}:${a.severity}`)
      .join('|')
    if (prevBreachSignatureRef.current === null) {
      prevBreachSignatureRef.current = signature
      return
    }
    if (
      signature !== '' &&
      signature !== prevBreachSignatureRef.current &&
      alertSettings.enabled &&
      alertSettings.notifyInAppToast
    ) {
      const hasCritical = activeMarginEvaluation.triggeredAlerts.some(
        (a) => a.severity === 'critical'
      )
      const summary = activeMarginEvaluation.triggeredAlerts
        .map((a) => a.message)
        .join(' ')
      const prefix = hasSimulationActive ? '[Simulador] ' : ''
      if (hasCritical) {
        toast.error(`${prefix}${summary}`, 'Alerta crítica de margen')
      } else {
        toast.warning(`${prefix}${summary}`, 'Alerta de margen bajo objetivo')
      }
    }
    prevBreachSignatureRef.current = signature
  }, [
    activeMarginEvaluation.triggeredAlerts,
    alertSettings.enabled,
    alertSettings.notifyInAppToast,
    hasSimulationActive,
    toast,
  ])

  const handleTestMarginNotification = () => {
    const testEval = evaluateMarginAlerts({
      operatingMarginPct: activeOperatingMarginPct,
      netMarginPct: activeNetMarginPct,
      operatingIncome: activeOperatingIncome,
      netIncome: activeNetIncome,
      totalRevenue: activeRevenue,
      settings: { ...alertSettings, enabled: true },
    })
    if (testEval.triggeredAlerts.length > 0) {
      const summary = testEval.triggeredAlerts.map((a) => a.message).join(' ')
      const isCrit = testEval.triggeredAlerts.some((a) => a.severity === 'critical')
      if (isCrit) {
        toast.error(summary, 'Prueba de alerta de margen')
      } else {
        toast.warning(summary, 'Prueba de alerta de margen')
      }
      return
    }
    toast.success(
      `Márgenes dentro de meta · Operativo ${activeOperatingMarginPct.toFixed(1)}% (obj. ${alertSettings.operatingMarginTargetPct.toFixed(1)}%) y Neto ${activeNetMarginPct.toFixed(1)}% (obj. ${alertSettings.netMarginTargetPct.toFixed(1)}%).`,
      'Monitoreo de márgenes activo'
    )
  }

  const marginCascadeItems: Array<{
    id: 'gross' | 'operating' | 'net'
    label: string
    pct: number
    amount: number
    absorptionLabel: string
    statusLabel: string
    tone: 'good' | 'warn' | 'alert'
    targetPct?: number
    isTargetBreached?: boolean
  }> = [
    {
      id: 'gross',
      label: 'Margen Bruto',
      pct: hasSimulationActive ? simulated.grossMarginPct : data.grossMarginPct,
      amount: hasSimulationActive ? simulated.grossProfit : data.grossProfit,
      absorptionLabel: `COGS absorbe ${(100 - (hasSimulationActive ? simulated.grossMarginPct : data.grossMarginPct)).toFixed(1)}% de ingresos`,
      statusLabel:
        (hasSimulationActive ? simulated.grossMarginPct : data.grossMarginPct) >= 40
          ? 'Saludable'
          : (hasSimulationActive ? simulated.grossMarginPct : data.grossMarginPct) >= 20
            ? 'Moderado'
            : 'Presionado',
      tone:
        (hasSimulationActive ? simulated.grossMarginPct : data.grossMarginPct) >= 40
          ? 'good'
          : (hasSimulationActive ? simulated.grossMarginPct : data.grossMarginPct) >= 20
            ? 'warn'
            : 'alert',
    },
    {
      id: 'operating',
      label: 'Margen Operativo (EBIT)',
      pct: activeOperatingMarginPct,
      amount: activeOperatingIncome,
      absorptionLabel: `Diferencia vs bruto: ${(activeOperatingMarginPct - (hasSimulationActive ? simulated.grossMarginPct : data.grossMarginPct)).toFixed(1)} pts`,
      statusLabel:
        alertSettings.enabled && alertSettings.operatingAlertActive
          ? activeMarginEvaluation.operatingBreached
            ? `Bajo meta (< ${alertSettings.operatingMarginTargetPct.toFixed(1)}%)`
            : `En meta (≥ ${alertSettings.operatingMarginTargetPct.toFixed(1)}%)`
          : activeOperatingMarginPct >= 18
            ? 'Sólido'
            : activeOperatingMarginPct > 0
              ? 'Positivo'
              : 'Operación negativa',
      tone:
        alertSettings.enabled && alertSettings.operatingAlertActive
          ? activeMarginEvaluation.operatingBreached
            ? activeOperatingMarginPct < 0 || activeMarginEvaluation.operatingGapPts <= -5
              ? 'alert'
              : 'warn'
            : 'good'
          : activeOperatingMarginPct >= 18
            ? 'good'
            : activeOperatingMarginPct > 0
              ? 'warn'
              : 'alert',
      targetPct:
        alertSettings.enabled && alertSettings.operatingAlertActive
          ? alertSettings.operatingMarginTargetPct
          : undefined,
      isTargetBreached: activeMarginEvaluation.operatingBreached,
    },
    {
      id: 'net',
      label: 'Margen Neto',
      pct: activeNetMarginPct,
      amount: activeNetIncome,
      absorptionLabel: `Después de financieros e ISR (${data.taxRate}%)`,
      statusLabel:
        alertSettings.enabled && alertSettings.netAlertActive
          ? activeMarginEvaluation.netBreached
            ? `Bajo meta (< ${alertSettings.netMarginTargetPct.toFixed(1)}%)`
            : `En meta (≥ ${alertSettings.netMarginTargetPct.toFixed(1)}%)`
          : activeNetMarginPct >= 12
            ? 'Rentable'
            : activeNetMarginPct > 0
              ? 'Margen estrecho'
              : 'Pérdida neta',
      tone:
        alertSettings.enabled && alertSettings.netAlertActive
          ? activeMarginEvaluation.netBreached
            ? activeNetMarginPct < 0 || activeMarginEvaluation.netGapPts <= -5
              ? 'alert'
              : 'warn'
            : 'good'
          : activeNetMarginPct >= 12
            ? 'good'
            : activeNetMarginPct > 0
              ? 'warn'
              : 'alert',
      targetPct:
        alertSettings.enabled && alertSettings.netAlertActive
          ? alertSettings.netMarginTargetPct
          : undefined,
      isTargetBreached: activeMarginEvaluation.netBreached,
    },
  ]

  const activeMonthlyTrendData = useMemo(() => {
    if (!hasSimulationActive) return data.monthlyMarginTrend
    const simCogs = Math.max(0, data.cogs * (1 + simVariableDeltaPct / 100))
    const simOpex = Math.max(
      0,
      data.opAndAdminExpenses * (1 + simFixedDeltaPct / 100)
    )
    return data.monthlyMarginTrend.map((point) =>
      point.isCurrentMonth
        ? {
            ...point,
            revenue: Math.round(simulated.rev),
            cogs: Math.round(simCogs),
            opex: Math.round(simOpex),
            grossProfit: Math.round(simulated.grossProfit),
            operatingIncome: Math.round(simulated.operatingResult),
            netIncome: Math.round(simulated.netIncome),
            grossMarginPct: simulated.grossMarginPct,
            operatingMarginPct: simulated.operatingMarginPct,
            netMarginPct: simulated.netMarginPct,
          }
        : point
    )
  }, [
    data.monthlyMarginTrend,
    data.cogs,
    data.opAndAdminExpenses,
    hasSimulationActive,
    simVariableDeltaPct,
    simFixedDeltaPct,
    simulated.rev,
    simulated.grossProfit,
    simulated.operatingResult,
    simulated.netIncome,
    simulated.grossMarginPct,
    simulated.operatingMarginPct,
    simulated.netMarginPct,
  ])

  const compactKpiMicroCards = useMemo(() => {
    const first = activeMonthlyTrendData[0]
    const last = activeMonthlyTrendData[activeMonthlyTrendData.length - 1]
    const calcPctDelta = (curr: number, prev: number) => {
      if (Math.abs(prev) < 1) return null
      return ((curr - prev) / Math.abs(prev)) * 100
    }

    const revNow = hasSimulationActive ? simulated.rev : data.totalRevenue
    const cogsNow = hasSimulationActive
      ? Math.max(0, data.cogs * (1 + simVariableDeltaPct / 100))
      : data.cogs
    const grossNow = hasSimulationActive ? simulated.grossProfit : data.grossProfit
    const grossPctNow = hasSimulationActive ? simulated.grossMarginPct : data.grossMarginPct
    const opexNow = hasSimulationActive
      ? Math.max(0, data.opAndAdminExpenses * (1 + simFixedDeltaPct / 100))
      : data.opAndAdminExpenses
    const opIncNow = activeOperatingIncome
    const opPctNow = activeOperatingMarginPct
    const netNow = activeNetIncome
    const netPctNow = activeNetMarginPct

    const pctOfRev = (v: number) => (revNow > 0 ? (v / revNow) * 100 : 0)

    return [
      {
        id: 'rev',
        title: 'Ingresos Totales',
        subMeta: `Base 100%${hasSimulationActive ? ' · Simulado' : ''}`,
        primaryAmount: money(revNow),
        secondaryMetric: `${data.accountBreakdown.revenueAccounts.length} cuentas 4xxx`,
        delta6mLabel: (() => {
          const d = first && last ? calcPctDelta(last.revenue, first.revenue) : null
          return d === null ? 'Sin base 6M' : `${d >= 0 ? '+' : ''}${d.toFixed(1)}% vs ${first.monthLabel}`
        })(),
        deltaPositive: (last?.revenue ?? 0) >= (first?.revenue ?? 0),
        color: '#2563eb',
        isBreached: false,
        series: activeMonthlyTrendData.map((p) => ({
          monthLabel: p.monthLabel,
          fullMonthLabel: p.fullMonthLabel,
          val: p.revenue,
          formattedVal: money(p.revenue),
          aux: '100% ingresos',
        })),
      },
      {
        id: 'cogs',
        title: 'Costos de Venta (COGS)',
        subMeta: `${pctOfRev(cogsNow).toFixed(1)}% de ingresos`,
        primaryAmount: money(cogsNow),
        secondaryMetric: `Cuentas 5xxx + inventario`,
        delta6mLabel: (() => {
          const d = first && last ? calcPctDelta(last.cogs, first.cogs) : null
          return d === null ? 'Sin base 6M' : `${d >= 0 ? '+' : ''}${d.toFixed(1)}% vs ${first.monthLabel}`
        })(),
        deltaPositive: (last?.cogs ?? 0) <= (first?.cogs ?? 0),
        color: '#c05621',
        isBreached: false,
        series: activeMonthlyTrendData.map((p) => ({
          monthLabel: p.monthLabel,
          fullMonthLabel: p.fullMonthLabel,
          val: p.cogs,
          formattedVal: money(p.cogs),
          aux: `${p.revenue > 0 ? ((p.cogs / p.revenue) * 100).toFixed(1) : '0.0'}% s/ ing.`,
        })),
      },
      {
        id: 'gross',
        title: 'Utilidad Bruta',
        subMeta: `Margen ${grossPctNow.toFixed(1)}%`,
        primaryAmount: money(grossNow),
        secondaryMetric: `Retención tras COGS`,
        delta6mLabel: (() => {
          const d = first && last ? last.grossMarginPct - first.grossMarginPct : 0
          return `${d >= 0 ? '+' : ''}${d.toFixed(1)} pts vs ${first?.monthLabel ?? '6M'}`
        })(),
        deltaPositive: (last?.grossMarginPct ?? 0) >= (first?.grossMarginPct ?? 0),
        color: '#2563eb',
        isBreached: false,
        series: activeMonthlyTrendData.map((p) => ({
          monthLabel: p.monthLabel,
          fullMonthLabel: p.fullMonthLabel,
          val: Number(p.grossMarginPct.toFixed(2)),
          formattedVal: `${p.grossMarginPct.toFixed(1)}%`,
          aux: money(p.grossProfit),
        })),
      },
      {
        id: 'opex',
        title: 'Gastos Operativos y Adm.',
        subMeta: `${pctOfRev(opexNow).toFixed(1)}% de ingresos`,
        primaryAmount: money(opexNow),
        secondaryMetric:
          sourceMode === 'accounting'
            ? `Cuentas 6xxx (${data.accountBreakdown.opExAccounts.length})`
            : `Gastos + nómina 6xxx`,
        delta6mLabel: (() => {
          const d = first && last ? calcPctDelta(last.opex, first.opex) : null
          return d === null ? 'Sin base 6M' : `${d >= 0 ? '+' : ''}${d.toFixed(1)}% vs ${first.monthLabel}`
        })(),
        deltaPositive: (last?.opex ?? 0) <= (first?.opex ?? 0),
        color: '#b45309',
        isBreached: false,
        series: activeMonthlyTrendData.map((p) => ({
          monthLabel: p.monthLabel,
          fullMonthLabel: p.fullMonthLabel,
          val: p.opex,
          formattedVal: money(p.opex),
          aux: `${p.revenue > 0 ? ((p.opex / p.revenue) * 100).toFixed(1) : '0.0'}% s/ ing.`,
        })),
      },
      {
        id: 'operating',
        title: 'Utilidad Operativa (EBIT)',
        subMeta: `Margen ${opPctNow.toFixed(1)}%${alertSettings.enabled && alertSettings.operatingAlertActive ? ` · Meta ≥ ${alertSettings.operatingMarginTargetPct.toFixed(1)}%` : ''}`,
        primaryAmount: money(opIncNow),
        secondaryMetric: activeMarginEvaluation.operatingBreached
          ? `Alerta: bajo objetivo (${activeMarginEvaluation.operatingGapPts.toFixed(1)} pts)`
          : 'Resultado operativo del periodo',
        delta6mLabel: (() => {
          const d = first && last ? last.operatingMarginPct - first.operatingMarginPct : 0
          return `${d >= 0 ? '+' : ''}${d.toFixed(1)} pts vs ${first?.monthLabel ?? '6M'}`
        })(),
        deltaPositive: (last?.operatingMarginPct ?? 0) >= (first?.operatingMarginPct ?? 0),
        color: '#0d9488',
        isBreached: activeMarginEvaluation.operatingBreached,
        series: activeMonthlyTrendData.map((p) => ({
          monthLabel: p.monthLabel,
          fullMonthLabel: p.fullMonthLabel,
          val: Number(p.operatingMarginPct.toFixed(2)),
          formattedVal: `${p.operatingMarginPct.toFixed(1)}%`,
          aux: money(p.operatingIncome),
        })),
      },
      {
        id: 'net',
        title: 'Utilidad Neta',
        subMeta: `Margen ${netPctNow.toFixed(1)}%${alertSettings.enabled && alertSettings.netAlertActive ? ` · Meta ≥ ${alertSettings.netMarginTargetPct.toFixed(1)}%` : ''}`,
        primaryAmount: money(netNow),
        secondaryMetric: activeMarginEvaluation.netBreached
          ? `Alerta: bajo objetivo (${activeMarginEvaluation.netGapPts.toFixed(1)} pts)`
          : `Después de ISR ${data.taxRate}% y financieros`,
        delta6mLabel: (() => {
          const d = first && last ? last.netMarginPct - first.netMarginPct : 0
          return `${d >= 0 ? '+' : ''}${d.toFixed(1)} pts vs ${first?.monthLabel ?? '6M'}`
        })(),
        deltaPositive: (last?.netMarginPct ?? 0) >= (first?.netMarginPct ?? 0),
        color: netNow >= 0 ? '#16a34a' : '#dc2626',
        isBreached: activeMarginEvaluation.netBreached || netNow < 0,
        series: activeMonthlyTrendData.map((p) => ({
          monthLabel: p.monthLabel,
          fullMonthLabel: p.fullMonthLabel,
          val: Number(p.netMarginPct.toFixed(2)),
          formattedVal: `${p.netMarginPct.toFixed(1)}%`,
          aux: money(p.netIncome),
        })),
      },
    ]
  }, [
    activeMonthlyTrendData,
    hasSimulationActive,
    simulated.rev,
    simulated.grossProfit,
    simulated.grossMarginPct,
    simVariableDeltaPct,
    simFixedDeltaPct,
    data.totalRevenue,
    data.cogs,
    data.grossProfit,
    data.grossMarginPct,
    data.opAndAdminExpenses,
    data.taxRate,
    data.accountBreakdown.revenueAccounts.length,
    data.accountBreakdown.opExAccounts.length,
    activeOperatingIncome,
    activeOperatingMarginPct,
    activeNetIncome,
    activeNetMarginPct,
    sourceMode,
    alertSettings.enabled,
    alertSettings.operatingAlertActive,
    alertSettings.operatingMarginTargetPct,
    alertSettings.netAlertActive,
    alertSettings.netMarginTargetPct,
    activeMarginEvaluation.operatingBreached,
    activeMarginEvaluation.operatingGapPts,
    activeMarginEvaluation.netBreached,
    activeMarginEvaluation.netGapPts,
  ])

  const trendSummaryStats = useMemo(() => {
    const first = activeMonthlyTrendData[0]
    const last = activeMonthlyTrendData[activeMonthlyTrendData.length - 1]
    const count = activeMonthlyTrendData.length || 1
    const avgGross =
      activeMonthlyTrendData.reduce((s, p) => s + p.grossMarginPct, 0) / count
    const avgOperating =
      activeMonthlyTrendData.reduce((s, p) => s + p.operatingMarginPct, 0) / count
    const avgNet =
      activeMonthlyTrendData.reduce((s, p) => s + p.netMarginPct, 0) / count

    const allValues: number[] = []
    activeMonthlyTrendData.forEach((p) => {
      if (trendSeriesFilter === 'all' || trendSeriesFilter === 'gross') {
        allValues.push(p.grossMarginPct)
      }
      if (trendSeriesFilter === 'all' || trendSeriesFilter === 'operating') {
        allValues.push(p.operatingMarginPct)
      }
      if (trendSeriesFilter === 'all' || trendSeriesFilter === 'net') {
        allValues.push(p.netMarginPct)
      }
    })
    if (showTrendTargets && alertSettings.enabled) {
      if (
        alertSettings.operatingAlertActive &&
        (trendSeriesFilter === 'all' || trendSeriesFilter === 'operating')
      ) {
        allValues.push(alertSettings.operatingMarginTargetPct)
      }
      if (
        alertSettings.netAlertActive &&
        (trendSeriesFilter === 'all' || trendSeriesFilter === 'net')
      ) {
        allValues.push(alertSettings.netMarginTargetPct)
      }
    }
    const rawMin = allValues.length > 0 ? Math.min(...allValues, 0) : 0
    const rawMax = allValues.length > 0 ? Math.max(...allValues, 10) : 60
    const yMin = rawMin < 0 ? Math.floor((rawMin - 5) / 5) * 5 : 0
    const yMax = Math.min(100, Math.ceil((rawMax + 6) / 5) * 5)

    return {
      periodRangeLabel:
        first && last ? `${first.fullMonthLabel} – ${last.fullMonthLabel}` : 'Últimos 6 meses',
      grossDelta6m: first && last ? last.grossMarginPct - first.grossMarginPct : 0,
      operatingDelta6m: first && last ? last.operatingMarginPct - first.operatingMarginPct : 0,
      netDelta6m: first && last ? last.netMarginPct - first.netMarginPct : 0,
      latestGross: last?.grossMarginPct ?? data.grossMarginPct,
      latestOperating: last?.operatingMarginPct ?? activeOperatingMarginPct,
      latestNet: last?.netMarginPct ?? activeNetMarginPct,
      avgGross,
      avgOperating,
      avgNet,
      hasNegativeValue: rawMin < 0,
      yDomain: [yMin, Math.max(yMin + 10, yMax)] as [number, number],
    }
  }, [
    activeMonthlyTrendData,
    trendSeriesFilter,
    showTrendTargets,
    alertSettings.enabled,
    alertSettings.operatingAlertActive,
    alertSettings.operatingMarginTargetPct,
    alertSettings.netAlertActive,
    alertSettings.netMarginTargetPct,
    data.grossMarginPct,
    activeOperatingMarginPct,
    activeNetMarginPct,
  ])

  return (
    <div className="reports-tab-body pnl-report-wrap">
      {/* Corporate Letterhead shown on browser Print (@media print) */}
      <header className="pnl-print-header" aria-hidden="true">
        <div className="pnl-print-brand">
          {brand.logoDataUrl ? (
            <img
              className="pnl-print-logo"
              src={brand.logoDataUrl}
              alt={brand.tradeName}
            />
          ) : (
            <div
              className="pnl-print-monogram"
              style={{ backgroundColor: brand.avatarColor }}
            >
              {getBrandInitials(brand.tradeName || brand.workspaceName)}
            </div>
          )}
          <div className="pnl-print-company">
            <strong>{brand.tradeName}</strong>
            <span>{brand.legalName}</span>
            <small>
              RFC: {brand.rfc} · {brand.taxRegime}
            </small>
            <small>{brand.fiscalAddress}</small>
          </div>
        </div>
        <div className="pnl-print-meta">
          <strong>ESTADO DE RESULTADOS INTEGRAL</strong>
          <span>Fecha de emisión: {currentDateLabel}</span>
          <small>
            Fuente:{' '}
            {sourceMode === 'consolidated'
              ? 'Consolidado (Gastos empresa + Contabilidad)'
              : 'Solo Cuentas Contables (4xxx–8xxx)'}{' '}
            · ISR {taxRate}%
          </small>
          <small>{activeScopeSummary}</small>
        </div>
      </header>

      {/* Dynamic Source & Fiscal Controls Bar */}
      <section className="pnl-controls-bar" aria-label="Configuración dinámica del Estado de Resultados">
        <div className="pnl-controls-left">
          <div className="pnl-control-group">
            <span className="pnl-control-label">Fuente del cálculo</span>
            <div className="warehouse-tab-selector" role="tablist" aria-label="Fuente contable">
              <button
                type="button"
                role="tab"
                aria-selected={sourceMode === 'consolidated'}
                className={`wh-tab ${sourceMode === 'consolidated' ? 'active' : ''}`}
                onClick={() => onChangeSourceMode('consolidated')}
              >
                Consolidado (Gastos empresa + Contabilidad)
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={sourceMode === 'accounting'}
                className={`wh-tab ${sourceMode === 'accounting' ? 'active' : ''}`}
                onClick={() => onChangeSourceMode('accounting')}
              >
                Solo Cuentas Contables (4xxx–8xxx)
              </button>
            </div>
          </div>

          <div className="pnl-control-group">
            <span className="pnl-control-label">Vista financiera</span>
            <div className="warehouse-tab-selector" role="tablist" aria-label="Formato de vista del Estado de Resultados">
              <button
                type="button"
                role="tab"
                aria-selected={financialViewMode === 'detailed'}
                className={`wh-tab ${financialViewMode === 'detailed' ? 'active' : ''}`}
                onClick={() => setFinancialViewMode('detailed')}
              >
                <Table2 size={13} /> Tabla detallada
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={financialViewMode === 'kpi_compact'}
                className={`wh-tab ${financialViewMode === 'kpi_compact' ? 'active' : ''}`}
                onClick={() => setFinancialViewMode('kpi_compact')}
              >
                <LayoutGrid size={13} /> KPIs simplificados
              </button>
            </div>
          </div>
        </div>

        <div className="pnl-controls-right">
          <label className="pnl-tax-input-group">
            <span>Tasa ISR estimada (%)</span>
            <input
              type="number"
              min={0}
              max={60}
              step={1}
              value={taxRate}
              onChange={(e) => {
                const parsed = parseFloat(e.target.value)
                onChangeTaxRate(Number.isNaN(parsed) ? 0 : Math.max(0, Math.min(60, parsed)))
              }}
            />
          </label>
          <button
            type="button"
            className={`pnl-alerts-trigger ${
              activeMarginEvaluation.triggeredAlerts.length > 0
                ? 'has-alerts'
                : alertSettings.enabled
                  ? 'is-armed'
                  : 'is-muted'
            }`}
            aria-expanded={isAlertsPanelOpen}
            onClick={() => setIsAlertsPanelOpen((prev) => !prev)}
          >
            {activeMarginEvaluation.triggeredAlerts.length > 0 ? (
              <BellRing size={14} />
            ) : alertSettings.enabled ? (
              <Bell size={14} />
            ) : (
              <BellOff size={14} />
            )}
            <span>
              {activeMarginEvaluation.triggeredAlerts.length > 0
                ? `Alertas activas (${activeMarginEvaluation.triggeredAlerts.length})`
                : alertSettings.enabled
                  ? `Alertas (Op ≥ ${alertSettings.operatingMarginTargetPct}% · Neto ≥ ${alertSettings.netMarginTargetPct}%)`
                  : 'Alertas pausadas'}
            </span>
            {isAlertsPanelOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>

          <span className="pnl-scope-tag mono" title={activeScopeSummary}>
            {activeScopeSummary}
          </span>
        </div>
      </section>

      {/* Active Margin Alert Banner */}
      {activeMarginEvaluation.triggeredAlerts.length > 0 && (
        <section
          className={`expense-alert-banner pnl-margin-alert-banner ${
            activeMarginEvaluation.triggeredAlerts.some((a) => a.severity === 'critical')
              ? 'is-critical'
              : ''
          }`}
          role="alert"
        >
          <div className="expense-alert-copy">
            <AlertTriangle size={17} />
            <div>
              <strong>
                Alerta de márgenes por debajo del objetivo
                {hasSimulationActive ? ' (Escenario simulado)' : ''}
              </strong>
              <span>
                {activeMarginEvaluation.triggeredAlerts
                  .map(
                    (a) =>
                      `${a.metricLabel}: ${a.currentPct.toFixed(1)}% vs objetivo ${a.targetPct.toFixed(1)}% (${a.gapPts.toFixed(1)} pts)`
                  )
                  .join(' · ')}
              </span>
            </div>
          </div>
          <div className="pnl-alert-banner-actions">
            {hasSimulationActive && (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  setSimSalesDeltaPct(0)
                  setSimFixedDeltaPct(0)
                  setSimVariableDeltaPct(0)
                }}
              >
                <RotateCcw size={13} /> Restablecer simulador
              </button>
            )}
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setIsAlertsPanelOpen(true)}
            >
              <SlidersHorizontal size={13} /> Ajustar objetivos
            </button>
          </div>
        </section>
      )}

      {/* Customizable Margin Alerts Configuration Panel */}
      {isAlertsPanelOpen && (
        <section
          className="overview-panel-card pnl-alerts-config-panel"
          aria-label="Configuración de alertas de márgenes"
        >
          <div className="overview-card-head overview-card-head-split">
            <div>
              <h2>Alertas Personalizables de Márgenes</h2>
              <p>
                Define el umbral objetivo mínimo para el margen operativo y neto. Recibirás alertas
                en este reporte, notificaciones emergentes y avisos en la campana superior cuando
                caigan por debajo de tu meta.
              </p>
            </div>
            <label className="pnl-master-toggle">
              <input
                type="checkbox"
                checked={alertSettings.enabled}
                onChange={(e) =>
                  updateAlertSettings((prev) => ({
                    ...prev,
                    enabled: e.target.checked,
                  }))
                }
              />
              <span>{alertSettings.enabled ? 'Monitoreo activo' : 'Monitoreo pausado'}</span>
            </label>
          </div>

          <div className="pnl-alerts-targets-grid">
            {/* Operating Margin Target */}
            <div
              className={`pnl-alert-target-card ${
                activeMarginEvaluation.operatingBreached ? 'is-breached' : ''
              }`}
            >
              <div className="pnl-alert-target-head">
                <label className="pnl-alert-check-label">
                  <input
                    type="checkbox"
                    checked={alertSettings.operatingAlertActive}
                    disabled={!alertSettings.enabled}
                    onChange={(e) =>
                      updateAlertSettings((prev) => ({
                        ...prev,
                        operatingAlertActive: e.target.checked,
                      }))
                    }
                  />
                  <strong>Margen Operativo (EBIT) objetivo</strong>
                </label>
                <span
                  className={`pnl-alert-live-status mono ${
                    !alertSettings.enabled || !alertSettings.operatingAlertActive
                      ? 'muted'
                      : activeMarginEvaluation.operatingBreached
                        ? 'breached'
                        : 'ok'
                  }`}
                >
                  {!alertSettings.enabled || !alertSettings.operatingAlertActive
                    ? 'Pausada'
                    : activeMarginEvaluation.operatingBreached
                      ? `Bajo meta (${activeMarginEvaluation.operatingGapPts.toFixed(1)} pts)`
                      : `En meta (+${activeMarginEvaluation.operatingGapPts.toFixed(1)} pts)`}
                </span>
              </div>

              <div className="pnl-alert-input-row">
                <label>
                  <span>Umbral mínimo (%)</span>
                  <input
                    type="number"
                    min={0}
                    max={80}
                    step={0.5}
                    disabled={!alertSettings.enabled || !alertSettings.operatingAlertActive}
                    value={alertSettings.operatingMarginTargetPct}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      updateAlertSettings((prev) => ({
                        ...prev,
                        operatingMarginTargetPct: Number.isNaN(val)
                          ? 0
                          : Math.max(0, Math.min(80, val)),
                      }))
                    }}
                  />
                </label>
                <div className="pnl-alert-current-readout mono">
                  <small>Actual{hasSimulationActive ? ' (simulado)' : ''}</small>
                  <strong>{activeOperatingMarginPct.toFixed(1)}%</strong>
                </div>
              </div>

              <div className="pnl-alert-presets" role="group" aria-label="Objetivos rápidos margen operativo">
                {[10, 15, 20, 25, 35, 45].map((preset) => (
                  <button
                    key={`op-preset-${preset}`}
                    type="button"
                    disabled={!alertSettings.enabled || !alertSettings.operatingAlertActive}
                    className={`pnl-alert-preset-btn ${
                      alertSettings.operatingMarginTargetPct === preset ? 'active' : ''
                    }`}
                    onClick={() =>
                      updateAlertSettings((prev) => ({
                        ...prev,
                        operatingMarginTargetPct: preset,
                      }))
                    }
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>

            {/* Net Margin Target */}
            <div
              className={`pnl-alert-target-card ${
                activeMarginEvaluation.netBreached ? 'is-breached' : ''
              }`}
            >
              <div className="pnl-alert-target-head">
                <label className="pnl-alert-check-label">
                  <input
                    type="checkbox"
                    checked={alertSettings.netAlertActive}
                    disabled={!alertSettings.enabled}
                    onChange={(e) =>
                      updateAlertSettings((prev) => ({
                        ...prev,
                        netAlertActive: e.target.checked,
                      }))
                    }
                  />
                  <strong>Margen Neto objetivo</strong>
                </label>
                <span
                  className={`pnl-alert-live-status mono ${
                    !alertSettings.enabled || !alertSettings.netAlertActive
                      ? 'muted'
                      : activeMarginEvaluation.netBreached
                        ? 'breached'
                        : 'ok'
                  }`}
                >
                  {!alertSettings.enabled || !alertSettings.netAlertActive
                    ? 'Pausada'
                    : activeMarginEvaluation.netBreached
                      ? `Bajo meta (${activeMarginEvaluation.netGapPts.toFixed(1)} pts)`
                      : `En meta (+${activeMarginEvaluation.netGapPts.toFixed(1)} pts)`}
                </span>
              </div>

              <div className="pnl-alert-input-row">
                <label>
                  <span>Umbral mínimo (%)</span>
                  <input
                    type="number"
                    min={0}
                    max={80}
                    step={0.5}
                    disabled={!alertSettings.enabled || !alertSettings.netAlertActive}
                    value={alertSettings.netMarginTargetPct}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      updateAlertSettings((prev) => ({
                        ...prev,
                        netMarginTargetPct: Number.isNaN(val)
                          ? 0
                          : Math.max(0, Math.min(80, val)),
                      }))
                    }}
                  />
                </label>
                <div className="pnl-alert-current-readout mono">
                  <small>Actual{hasSimulationActive ? ' (simulado)' : ''}</small>
                  <strong>{activeNetMarginPct.toFixed(1)}%</strong>
                </div>
              </div>

              <div className="pnl-alert-presets" role="group" aria-label="Objetivos rápidos margen neto">
                {[5, 10, 12, 18, 25, 30].map((preset) => (
                  <button
                    key={`net-preset-${preset}`}
                    type="button"
                    disabled={!alertSettings.enabled || !alertSettings.netAlertActive}
                    className={`pnl-alert-preset-btn ${
                      alertSettings.netMarginTargetPct === preset ? 'active' : ''
                    }`}
                    onClick={() =>
                      updateAlertSettings((prev) => ({
                        ...prev,
                        netMarginTargetPct: preset,
                      }))
                    }
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pnl-alerts-channels-foot">
            <div className="pnl-alerts-channels">
              <label className="pnl-alert-channel-opt">
                <input
                  type="checkbox"
                  checked={alertSettings.notifyInAppToast}
                  disabled={!alertSettings.enabled}
                  onChange={(e) =>
                    updateAlertSettings((prev) => ({
                      ...prev,
                      notifyInAppToast: e.target.checked,
                    }))
                  }
                />
                <span>Notificación emergente al detectar caída</span>
              </label>

              <label className="pnl-alert-channel-opt">
                <input
                  type="checkbox"
                  checked={alertSettings.notifyNotificationCenter}
                  disabled={!alertSettings.enabled}
                  onChange={(e) =>
                    updateAlertSettings((prev) => ({
                      ...prev,
                      notifyNotificationCenter: e.target.checked,
                    }))
                  }
                />
                <span>Publicar en Centro de Notificaciones</span>
              </label>
            </div>

            <div className="pnl-alerts-foot-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  updateAlertSettings({
                    ...DEFAULT_MARGIN_ALERT_SETTINGS,
                    updatedAt: new Date().toISOString(),
                  })
                  toast.info(
                    'Objetivos restablecidos a 20.0% operativo y 12.0% neto.',
                    'Alertas restablecidas'
                  )
                }}
              >
                <RotateCcw size={13} /> Restablecer
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={handleTestMarginNotification}
              >
                <BellRing size={13} /> Probar notificación
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={() => {
                  saveMarginAlertSettings({
                    ...alertSettings,
                    updatedAt: new Date().toISOString(),
                  })
                  toast.success(
                    `Objetivos guardados: Operativo ≥ ${alertSettings.operatingMarginTargetPct.toFixed(1)}% · Neto ≥ ${alertSettings.netMarginTargetPct.toFixed(1)}%.`,
                    'Configuración guardada'
                  )
                  setIsAlertsPanelOpen(false)
                }}
              >
                Guardar y cerrar
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 4 Executive Profitability KPIs */}
      <div className="ops-kpi-grid">
        <article className="ops-kpi-card">
          <div className="ops-kpi-top">
            <span>MARGEN BRUTO</span>
            <span className="ops-kpi-icon icon-blue">
              <Percent size={16} />
            </span>
          </div>
          <div className="ops-kpi-val mono">{data.grossMarginPct.toFixed(1)}%</div>
          <div className="ops-kpi-foot">
            <span>Utilidad bruta: <strong className="mono">{money(data.grossProfit)}</strong></span>
          </div>
        </article>

        <article
          className={`ops-kpi-card ${
            alertSettings.enabled &&
            alertSettings.operatingAlertActive &&
            data.operatingMarginPct < alertSettings.operatingMarginTargetPct
              ? 'is-breached'
              : ''
          }`}
        >
          <div className="ops-kpi-top">
            <span>MARGEN OPERATIVO (EBIT)</span>
            <span
              className={`ops-kpi-icon ${
                alertSettings.enabled &&
                alertSettings.operatingAlertActive &&
                data.operatingMarginPct < alertSettings.operatingMarginTargetPct
                  ? 'icon-amber'
                  : 'icon-purple'
              }`}
            >
              <TrendingUp size={16} />
            </span>
          </div>
          <div
            className={`ops-kpi-val mono ${
              alertSettings.enabled &&
              alertSettings.operatingAlertActive &&
              data.operatingMarginPct < alertSettings.operatingMarginTargetPct
                ? 'text-alert'
                : ''
            }`}
          >
            {data.operatingMarginPct.toFixed(1)}%
          </div>
          <div className="ops-kpi-foot">
            <span>
              Utilidad: <strong className="mono">{money(data.operatingIncome)}</strong>
              {alertSettings.enabled && alertSettings.operatingAlertActive
                ? ` · Obj. ≥ ${alertSettings.operatingMarginTargetPct.toFixed(1)}%`
                : ''}
            </span>
          </div>
        </article>

        <article
          className={`ops-kpi-card highlight ${
            alertSettings.enabled &&
            alertSettings.netAlertActive &&
            data.netMarginPct < alertSettings.netMarginTargetPct
              ? 'is-breached'
              : ''
          }`}
        >
          <div className="ops-kpi-top">
            <span>MARGEN NETO</span>
            <span
              className={`ops-kpi-icon ${
                data.netIncome >= 0 &&
                !(
                  alertSettings.enabled &&
                  alertSettings.netAlertActive &&
                  data.netMarginPct < alertSettings.netMarginTargetPct
                )
                  ? 'icon-green'
                  : 'icon-amber'
              }`}
            >
              <Scale size={16} />
            </span>
          </div>
          <div
            className={`ops-kpi-val mono ${
              data.netIncome < 0 ||
              (alertSettings.enabled &&
                alertSettings.netAlertActive &&
                data.netMarginPct < alertSettings.netMarginTargetPct)
                ? 'text-alert'
                : ''
            }`}
          >
            {data.netMarginPct.toFixed(1)}%
          </div>
          <div className="ops-kpi-foot">
            <span>
              Utilidad: <strong className="mono">{money(data.netIncome)}</strong>
              {alertSettings.enabled && alertSettings.netAlertActive
                ? ` · Obj. ≥ ${alertSettings.netMarginTargetPct.toFixed(1)}%`
                : ''}
            </span>
          </div>
        </article>

        <article className="ops-kpi-card">
          <div className="ops-kpi-top">
            <span>PUNTO DE EQUILIBRIO</span>
            <span className="ops-kpi-icon icon-amber">
              <Calculator size={16} />
            </span>
          </div>
          <div className="ops-kpi-val mono">{money(data.breakEvenSales)}</div>
          <div className="ops-kpi-foot">
            <span>
              {isAboveBreakEven
                ? `Superado (${data.coverageRatioPct.toFixed(0)}% cobertura)`
                : data.breakEvenSales > 0
                  ? `Cobertura actual ${data.coverageRatioPct.toFixed(0)}%`
                  : 'Sin margen de contribución positivo'}
            </span>
          </div>
        </article>
      </div>

      {/* Dynamic Margin Cascade Visual Panel (Bruto -> Operativo -> Neto) */}
      <section className="overview-panel-card pnl-margins-cascade" aria-label="Cascada visual de márgenes">
        <div className="overview-card-head overview-card-head-split">
          <div>
            <h2>Cascada Dinámica de Márgenes sobre Ingresos</h2>
            <p>
              Proporción de ingresos retenida tras costos de venta, gastos operativos e impuestos
              {hasSimulationActive ? ' · Mostrando escenario simulado' : ''}.
            </p>
          </div>
          <span className="pnl-scope-tag mono">
            Ingresos base: {money(activeRevenue)}
          </span>
        </div>

        <div className="pnl-margins-grid">
          {marginCascadeItems.map((item) => {
            const clampedBarPct = Math.max(0, Math.min(100, item.pct))
            const targetPinPct =
              typeof item.targetPct === 'number'
                ? Math.max(2, Math.min(98, item.targetPct))
                : null
            return (
              <div
                key={item.id}
                className={`pnl-margin-track-card ${item.isTargetBreached ? 'is-breached' : ''}`}
              >
                <div className="pnl-margin-track-top">
                  <strong>{item.label}</strong>
                  <span className={`pnl-margin-status tone-${item.tone}`}>{item.statusLabel}</span>
                </div>
                <div className="pnl-margin-values">
                  <span className={`pnl-margin-pct mono tone-${item.tone}`}>
                    {item.pct.toFixed(1)}%
                  </span>
                  <span className="pnl-margin-amt mono">{money(item.amount)}</span>
                </div>
                <div className="pnl-margin-rail" aria-hidden="true">
                  <span
                    className={`pnl-margin-fill tone-${item.tone}`}
                    style={{ width: `${clampedBarPct}%` }}
                  />
                  {targetPinPct !== null && (
                    <span
                      className="pnl-margin-target-pin"
                      style={{ left: `${targetPinPct}%` }}
                      title={`Objetivo mínimo: ${item.targetPct?.toFixed(1)}%`}
                    />
                  )}
                </div>
                <small className="pnl-margin-note">
                  {item.absorptionLabel}
                  {typeof item.targetPct === 'number'
                    ? ` · Meta ≥ ${item.targetPct.toFixed(1)}%`
                    : ''}
                </small>
              </div>
            )
          })}
        </div>
      </section>

      {/* 6-Month Monthly Trend Line Chart for Gross, Operating & Net Margins */}
      <section
        className="overview-panel-card pnl-trend-card"
        aria-label="Tendencia mensual de márgenes de los últimos 6 meses"
      >
        <div className="overview-card-head overview-card-head-split">
          <div>
            <h2>Tendencia Mensual de Márgenes (Últimos 6 Meses)</h2>
            <div className="overview-card-head-sub">
              <TrendingUp size={16} />
              <p>
                {trendSummaryStats.periodRangeLabel} · Evolución porcentual sobre ingresos
                {hasSimulationActive ? ' · Mes actual con escenario simulado' : ''}
              </p>
            </div>
          </div>

          <div className="pnl-trend-toolbar">
            <div
              className="warehouse-tab-selector"
              role="group"
              aria-label="Filtrar serie de margen"
            >
              {(
                [
                  { id: 'all', label: 'Todos' },
                  { id: 'gross', label: 'Bruto' },
                  { id: 'operating', label: 'Operativo' },
                  { id: 'net', label: 'Neto' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`wh-tab ${trendSeriesFilter === opt.id ? 'active' : ''}`}
                  onClick={() => setTrendSeriesFilter(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {alertSettings.enabled &&
              (alertSettings.operatingAlertActive || alertSettings.netAlertActive) && (
                <button
                  type="button"
                  className={`pnl-trend-target-toggle ${showTrendTargets ? 'active' : ''}`}
                  aria-pressed={showTrendTargets}
                  onClick={() => setShowTrendTargets((prev) => !prev)}
                >
                  {showTrendTargets ? 'Ocultar metas' : 'Mostrar metas'}
                </button>
              )}
          </div>
        </div>

        <div className="pnl-trend-summary-row">
          <div
            className={`pnl-trend-stat ${trendSeriesFilter !== 'all' && trendSeriesFilter !== 'gross' ? 'is-dimmed' : ''}`}
          >
            <div className="pnl-trend-stat-label">
              <span className="pnl-trend-swatch swatch-gross" aria-hidden="true" />
              <span>Margen Bruto</span>
            </div>
            <div className="pnl-trend-stat-values mono">
              <strong>{trendSummaryStats.latestGross.toFixed(1)}%</strong>
              <span
                className={
                  trendSummaryStats.grossDelta6m >= 0 ? 'pnl-val-positive' : 'pnl-val-negative'
                }
              >
                {trendSummaryStats.grossDelta6m >= 0 ? '+' : ''}
                {trendSummaryStats.grossDelta6m.toFixed(1)} pts (6M) · Prom.{' '}
                {trendSummaryStats.avgGross.toFixed(1)}%
              </span>
            </div>
          </div>

          <div
            className={`pnl-trend-stat ${trendSeriesFilter !== 'all' && trendSeriesFilter !== 'operating' ? 'is-dimmed' : ''}`}
          >
            <div className="pnl-trend-stat-label">
              <span className="pnl-trend-swatch swatch-operating" aria-hidden="true" />
              <span>Margen Operativo (EBIT)</span>
            </div>
            <div className="pnl-trend-stat-values mono">
              <strong>{trendSummaryStats.latestOperating.toFixed(1)}%</strong>
              <span
                className={
                  trendSummaryStats.operatingDelta6m >= 0 ? 'pnl-val-positive' : 'pnl-val-negative'
                }
              >
                {trendSummaryStats.operatingDelta6m >= 0 ? '+' : ''}
                {trendSummaryStats.operatingDelta6m.toFixed(1)} pts (6M) · Prom.{' '}
                {trendSummaryStats.avgOperating.toFixed(1)}%
              </span>
            </div>
          </div>

          <div
            className={`pnl-trend-stat ${trendSeriesFilter !== 'all' && trendSeriesFilter !== 'net' ? 'is-dimmed' : ''}`}
          >
            <div className="pnl-trend-stat-label">
              <span className="pnl-trend-swatch swatch-net" aria-hidden="true" />
              <span>Margen Neto</span>
            </div>
            <div className="pnl-trend-stat-values mono">
              <strong>{trendSummaryStats.latestNet.toFixed(1)}%</strong>
              <span
                className={
                  trendSummaryStats.netDelta6m >= 0 ? 'pnl-val-positive' : 'pnl-val-negative'
                }
              >
                {trendSummaryStats.netDelta6m >= 0 ? '+' : ''}
                {trendSummaryStats.netDelta6m.toFixed(1)} pts (6M) · Prom.{' '}
                {trendSummaryStats.avgNet.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="reports-recharts-box">
          <ResponsiveContainer width="100%" height={275}>
            <LineChart
              data={activeMonthlyTrendData}
              margin={{ top: 14, right: 20, left: 0, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(148,163,184,0.22)"
              />
              <XAxis
                dataKey="monthLabel"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={trendSummaryStats.yDomain}
                tickFormatter={(val) => `${Number(val).toFixed(0)}%`}
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={46}
              />
              {trendSummaryStats.hasNegativeValue && (
                <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.2} />
              )}
              {showTrendTargets &&
                alertSettings.enabled &&
                alertSettings.operatingAlertActive &&
                (trendSeriesFilter === 'all' || trendSeriesFilter === 'operating') && (
                  <ReferenceLine
                    y={alertSettings.operatingMarginTargetPct}
                    stroke="#d97706"
                    strokeDasharray="4 4"
                    strokeWidth={1.4}
                    label={{
                      value: `Meta Op ${alertSettings.operatingMarginTargetPct.toFixed(1)}%`,
                      position: 'insideTopRight',
                      fill: '#b45309',
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  />
                )}
              {showTrendTargets &&
                alertSettings.enabled &&
                alertSettings.netAlertActive &&
                (trendSeriesFilter === 'all' || trendSeriesFilter === 'net') && (
                  <ReferenceLine
                    y={alertSettings.netMarginTargetPct}
                    stroke="#b91c1c"
                    strokeDasharray="3 3"
                    strokeWidth={1.4}
                    label={{
                      value: `Meta Neto ${alertSettings.netMarginTargetPct.toFixed(1)}%`,
                      position: 'insideBottomRight',
                      fill: '#b91c1c',
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  />
                )}
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null
                  const pt = payload[0].payload as MonthlyMarginTrendPoint
                  return (
                    <div className="reports-chart-tooltip">
                      <strong>
                        {pt.fullMonthLabel}
                        {pt.isCurrentMonth
                          ? hasSimulationActive
                            ? ' · Mes actual (Simulado)'
                            : ' · Mes actual'
                          : ''}
                      </strong>
                      <div className="reports-tooltip-rows">
                        {(trendSeriesFilter === 'all' || trendSeriesFilter === 'gross') && (
                          <div>
                            <span>Margen Bruto</span>
                            <strong className="mono">
                              {pt.grossMarginPct.toFixed(1)}% ({money(pt.grossProfit)})
                            </strong>
                          </div>
                        )}
                        {(trendSeriesFilter === 'all' || trendSeriesFilter === 'operating') && (
                          <div>
                            <span>Margen Operativo (EBIT)</span>
                            <strong className="mono">
                              {pt.operatingMarginPct.toFixed(1)}% ({money(pt.operatingIncome)})
                            </strong>
                          </div>
                        )}
                        {(trendSeriesFilter === 'all' || trendSeriesFilter === 'net') && (
                          <div>
                            <span>Margen Neto</span>
                            <strong className="mono">
                              {pt.netMarginPct.toFixed(1)}% ({money(pt.netIncome)})
                            </strong>
                          </div>
                        )}
                        <div className="reports-tooltip-total">
                          <span>Ingresos del mes</span>
                          <strong className="mono">{money(pt.revenue)}</strong>
                        </div>
                      </div>
                    </div>
                  )
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
              {(trendSeriesFilter === 'all' || trendSeriesFilter === 'gross') && (
                <Line
                  type="monotone"
                  dataKey="grossMarginPct"
                  name="Margen Bruto (%)"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#2563eb', strokeWidth: 1.5, stroke: '#ffffff' }}
                  activeDot={{ r: 5.5 }}
                />
              )}
              {(trendSeriesFilter === 'all' || trendSeriesFilter === 'operating') && (
                <Line
                  type="monotone"
                  dataKey="operatingMarginPct"
                  name="Margen Operativo (%)"
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#0d9488', strokeWidth: 1.5, stroke: '#ffffff' }}
                  activeDot={{ r: 5.5 }}
                />
              )}
              {(trendSeriesFilter === 'all' || trendSeriesFilter === 'net') && (
                <Line
                  type="monotone"
                  dataKey="netMarginPct"
                  name="Margen Neto (%)"
                  stroke="#16a34a"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#16a34a', strokeWidth: 1.5, stroke: '#ffffff' }}
                  activeDot={{ r: 5.5 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Main Formal Income Statement Table or Simplified KPI Micro-Charts View */}
      <section className="overview-panel-card">
        <div className="overview-card-head overview-card-head-split">
          <div>
            <h2>
              {financialViewMode === 'detailed'
                ? 'Estado de Resultados Integral (P&L)'
                : 'Indicadores Clave y Tendencia Mensual (Vista Simplificada)'}
            </h2>
            <p>
              {financialViewMode === 'detailed' ? (
                <>
                  Integrado en tiempo real con el módulo de <strong>Gastos</strong> y{' '}
                  <strong>Cuentas contables</strong> · Cifras expresadas según filtros activos.
                </>
              ) : (
                <>
                  Resumen ejecutivo de los 6 rubros principales del P&amp;L con micro-gráficas
                  mensuales de los últimos 6 meses
                  {hasSimulationActive ? ' · Mes actual simulado' : ''}.
                </>
              )}
            </p>
          </div>
          <div className="pnl-head-actions">
            <div
              className="warehouse-tab-selector pnl-section-view-switch"
              role="group"
              aria-label="Alternar vista de datos financieros"
            >
              <button
                type="button"
                className={`wh-tab ${financialViewMode === 'detailed' ? 'active' : ''}`}
                onClick={() => setFinancialViewMode('detailed')}
              >
                <Table2 size={13} /> Tabla
              </button>
              <button
                type="button"
                className={`wh-tab ${financialViewMode === 'kpi_compact' ? 'active' : ''}`}
                onClick={() => setFinancialViewMode('kpi_compact')}
              >
                <LayoutGrid size={13} /> KPIs + Tendencia
              </button>
            </div>

            {financialViewMode === 'detailed' && sourceMode === 'consolidated' && (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setExpandOpExDetail((prev) => !prev)}
              >
                {expandOpExDetail ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {expandOpExDetail ? 'Ocultar desglose Op/Adm' : 'Ver desglose Op/Adm'}
              </button>
            )}
          </div>
        </div>

        {financialViewMode === 'detailed' ? (
          <div className="table-wrap ops-table-wrap">
            <table className="data-table ops-data-table pnl-table">
              <thead>
                <tr>
                  <th style={{ width: '36px', textAlign: 'center' }}>SIGNO</th>
                  <th>CONCEPTO CONTABLE</th>
                  <th>ORIGEN EN ERP</th>
                  <th style={{ textAlign: 'right' }}>IMPORTE</th>
                  <th style={{ textAlign: 'right' }}>% INGRESOS</th>
                  {compareYoY && (
                    <>
                      <th style={{ textAlign: 'right' }}>PERIODO ANTERIOR</th>
                      <th style={{ textAlign: 'right' }}>VARIACIÓN YoY</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {visibleLines.map((row) => {
                  const rowClass =
                    row.rowKind === 'final'
                      ? 'pnl-row-final'
                      : row.rowKind === 'subtotal'
                        ? 'pnl-row-subtotal'
                        : row.rowKind === 'detail'
                          ? 'pnl-row-detail'
                          : 'pnl-row-main'
                  const isClickableOpEx =
                    row.id === 'pnl_opex_total' && sourceMode === 'consolidated'
                  const isSearchMatch =
                    normalizedQuery.length > 0 &&
                    `${row.label} ${row.sourceLabel}`.toLowerCase().includes(normalizedQuery)

                  return (
                    <tr
                      key={row.id}
                      className={`${rowClass}${isSearchMatch ? ' pnl-row-match' : ''}`}
                    >
                      <td style={{ textAlign: 'center' }} className="mono pnl-sign-cell">
                        {row.sign}
                      </td>
                      <td>
                        <div className="pnl-concept-cell">
                          {isClickableOpEx ? (
                            <button
                              type="button"
                              className="pnl-expand-btn"
                              onClick={() => setExpandOpExDetail((prev) => !prev)}
                            >
                              {expandOpExDetail ? (
                                <ChevronDown size={13} />
                              ) : (
                                <ChevronRight size={13} />
                              )}
                              <span>{row.label}</span>
                            </button>
                          ) : (
                            <span>{row.label}</span>
                          )}
                        </div>
                      </td>
                      <td className="pnl-source-cell">{row.sourceLabel}</td>
                      <td style={{ textAlign: 'right' }} className="mono pnl-amount-cell">
                        <span
                          className={
                            row.rowKind === 'final'
                              ? row.amount >= 0
                                ? 'pnl-val-positive'
                                : 'pnl-val-negative'
                              : row.negativeHighlight && row.amount > 0
                                ? 'pnl-val-expense'
                                : ''
                          }
                        >
                          {row.sign === '−' && row.amount > 0 ? `(${money(row.amount)})` : money(row.amount)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }} className="mono pnl-pct-cell">
                        {row.pctOfRevenue.toFixed(1)}%
                      </td>
                      {compareYoY && (
                        <>
                          <td style={{ textAlign: 'right' }} className="mono pnl-amount-cell">
                            {money(row.priorAmount)}
                          </td>
                          <td style={{ textAlign: 'right' }} className="mono">
                            {row.yoyPct === null ? (
                              <span className="pnl-yoy-neutral">—</span>
                            ) : (
                              <span
                                className={`pnl-yoy-tag ${
                                  (row.negativeHighlight ? row.yoyPct < 0 : row.yoyPct >= 0)
                                    ? 'is-up'
                                    : 'is-down'
                                }`}
                              >
                                {row.yoyPct >= 0 ? (
                                  <ArrowUpRight size={12} />
                                ) : (
                                  <ArrowDownRight size={12} />
                                )}
                                {row.yoyPct >= 0 ? '+' : ''}
                                {row.yoyPct.toFixed(1)}%
                              </span>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="pnl-compact-kpi-wrap">
            <div className="pnl-compact-kpi-grid">
              {compactKpiMicroCards.map((card) => {
                const gradientId = `pnl-micro-grad-${card.id}`
                const isSearchMatch =
                  normalizedQuery.length > 0 &&
                  `${card.title} ${card.subMeta} ${card.secondaryMetric}`
                    .toLowerCase()
                    .includes(normalizedQuery)
                return (
                  <article
                    key={card.id}
                    className={`pnl-micro-kpi-card${card.isBreached ? ' is-breached' : ''}${isSearchMatch ? ' is-search-match' : ''}`}
                  >
                    <div className="pnl-micro-kpi-head">
                      <strong>{card.title}</strong>
                      <span className="pnl-micro-kpi-meta mono">{card.subMeta}</span>
                    </div>

                    <div className="pnl-micro-kpi-figures">
                      <div className="pnl-micro-kpi-amount mono">{card.primaryAmount}</div>
                      <span
                        className={`pnl-micro-kpi-delta mono ${
                          card.deltaPositive ? 'pnl-val-positive' : 'pnl-val-negative'
                        }`}
                      >
                        {card.delta6mLabel}
                      </span>
                    </div>

                    <div className="pnl-micro-spark-box" aria-label={`Tendencia mensual de ${card.title}`}>
                      <ResponsiveContainer width="100%" height={72}>
                        <AreaChart
                          data={card.series}
                          margin={{ top: 6, right: 4, left: 4, bottom: 2 }}
                        >
                          <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={card.color} stopOpacity={0.26} />
                              <stop offset="95%" stopColor={card.color} stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="monthLabel" hide />
                          <YAxis domain={['dataMin - 2', 'dataMax + 2']} hide />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload || payload.length === 0) return null
                              const pt = payload[0].payload as {
                                monthLabel: string
                                fullMonthLabel: string
                                formattedVal: string
                                aux: string
                              }
                              return (
                                <div className="pnl-micro-tooltip">
                                  <strong>{pt.fullMonthLabel}</strong>
                                  <span className="mono">{pt.formattedVal}</span>
                                  <small className="mono">{pt.aux}</small>
                                </div>
                              )
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="val"
                            stroke={card.color}
                            strokeWidth={2}
                            fill={`url(#${gradientId})`}
                            dot={{ r: 2, fill: card.color, strokeWidth: 0 }}
                            activeDot={{ r: 4, fill: card.color, stroke: '#ffffff', strokeWidth: 1.5 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="pnl-micro-kpi-foot">
                      <span>{card.secondaryMetric}</span>
                      <span className="mono">
                        {card.series[0]?.monthLabel} – {card.series[card.series.length - 1]?.monthLabel}
                      </span>
                    </div>
                  </article>
                )
              })}
            </div>

            <div className="pnl-compact-kpi-footer">
              <span className="mono">
                Otros ingresos: {money(data.otherIncome)} · Gastos financieros: {money(data.financialExpenses)} · Impuestos ({data.taxRate}% ISR): {money(data.taxes)}
              </span>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setFinancialViewMode('detailed')}
              >
                <Table2 size={13} /> Ver desglose contable en tabla
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Dual Charts: Waterfall Composition & Break-Even Point */}
      <div className="reports-split-grid">
        {/* Chart 1: P&L Waterfall / Composition */}
        <section className="overview-panel-card">
          <div className="overview-card-head">
            <h2>Composición del Estado de Resultados</h2>
            <div className="overview-card-head-sub">
              <TrendingUp size={16} />
              <p>Desde ingresos totales y costos hasta utilidad operativa, impuestos y utilidad neta.</p>
            </div>
          </div>

          <div className="reports-recharts-box">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={data.waterfallData}
                margin={{ top: 12, right: 12, left: 0, bottom: 16 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-18}
                  textAnchor="end"
                  height={48}
                />
                <YAxis tickFormatter={shortMoney} tick={{ fontSize: 11 }} width={58} />
                <Tooltip
                  formatter={(value: unknown) => [money(Number(value) || 0), 'Importe']}
                />
                <ReferenceLine y={0} stroke="#94a3b8" />
                <Bar dataKey="value" radius={[5, 5, 0, 0]} maxBarSize={38}>
                  {data.waterfallData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Chart 2: Break-Even Analysis + Interactive What-If Simulator */}
        <section className="overview-panel-card">
          <div className="overview-card-head overview-card-head-split">
            <div>
              <h2>Análisis de Punto de Equilibrio y Simulador</h2>
              <div className="overview-card-head-sub">
                <Calculator size={16} />
                <p>
                  {hasSimulationActive
                    ? `Escenario simulado activo · Margen de contribución ${simulated.cmRatioPct.toFixed(1)}%`
                    : `Cruce entre ventas y costos totales (fijos + variables) · Margen de contribución ${data.contributionMarginRatioPct.toFixed(1)}%.`}
                </p>
              </div>
            </div>
            {hasSimulationActive && (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  setSimSalesDeltaPct(0)
                  setSimFixedDeltaPct(0)
                  setSimVariableDeltaPct(0)
                }}
              >
                <RotateCcw size={13} /> Restablecer base
              </button>
            )}
          </div>

          <div className="pnl-breakeven-metrics">
            <div>
              <small>Costos fijos {hasSimulationActive ? '(Simulado)' : ''}</small>
              <strong className="mono">
                {money(hasSimulationActive ? simulated.fixed : data.fixedCosts)}
              </strong>
            </div>
            <div>
              <small>Costos variables {hasSimulationActive ? '(Simulado)' : ''}</small>
              <strong className="mono">
                {money(hasSimulationActive ? simulated.variable : data.variableCosts)}
              </strong>
            </div>
            <div>
              <small>Punto de equilibrio {hasSimulationActive ? '(Simulado)' : ''}</small>
              <strong className="mono">
                {money(hasSimulationActive ? simulated.breakEven : data.breakEvenSales)}
              </strong>
              {hasSimulationActive && (
                <small className="pnl-sim-base-ref mono">Base: {money(data.breakEvenSales)}</small>
              )}
            </div>
            <div>
              <small>Margen de seguridad</small>
              <strong
                className={`mono ${(hasSimulationActive ? simulated.safetyAmount : data.safetyMarginAmount) >= 0 ? 'pnl-val-positive' : 'pnl-val-negative'}`}
              >
                {money(hasSimulationActive ? simulated.safetyAmount : data.safetyMarginAmount)} (
                {(hasSimulationActive ? simulated.safetyPct : data.safetyMarginPct).toFixed(1)}%)
              </strong>
            </div>
          </div>

          {/* Visual Break-Even Threshold Gauge */}
          <div
            className={`pnl-be-gauge status-${breakEvenGaugeStatus}`}
            aria-label="Indicador visual del punto de equilibrio"
          >
            <div className="pnl-be-gauge-head">
              <span className="pnl-be-gauge-status">
                {breakEvenGaugeStatus === 'above' ? (
                  <CheckCircle2 size={15} />
                ) : (
                  <AlertTriangle size={15} />
                )}
                <span>
                  {breakEvenGaugeStatus === 'negative-cm'
                    ? 'Margen de contribución negativo: los costos variables superan las ventas'
                    : breakEvenGaugeStatus === 'above'
                      ? `Punto de equilibrio superado · Cobertura ${activeCoveragePct.toFixed(1)}% (+${money(activeSafetyAmount)} · ${activeSafetyPct.toFixed(1)}% margen seg.)`
                      : `Bajo punto de equilibrio · Cobertura ${activeCoveragePct.toFixed(1)}% (faltan ${money(Math.abs(activeSafetyAmount))} en ventas)`}
                </span>
              </span>
              <span className="pnl-be-cm-pill mono">
                MC {activeCmRatioPct.toFixed(1)}%
              </span>
            </div>

            <div className="pnl-be-track-wrap">
              <div className="pnl-be-track">
                {activeBreakEven > 0 && (
                  <span
                    className="pnl-be-zone-loss"
                    style={{ width: `${breakEvenMarkerPct}%` }}
                  />
                )}
                <span
                  className={`pnl-be-sales-fill status-${breakEvenGaugeStatus}`}
                  style={{ width: `${currentSalesFillPct}%` }}
                />
                {activeBreakEven > 0 && (
                  <span
                    className="pnl-be-threshold-pin"
                    style={{ left: `${breakEvenMarkerPct}%` }}
                    title={`Punto de equilibrio: ${money(activeBreakEven)}`}
                  />
                )}
              </div>
              <div className="pnl-be-scale-labels mono">
                <span>$0</span>
                {activeBreakEven > 0 && (
                  <span className="pnl-be-pin-label">
                    Equilibrio: {money(activeBreakEven)}
                  </span>
                )}
                <span>Ventas actuales: {money(activeRevenue)}</span>
              </div>
            </div>
          </div>

          {/* Interactive What-If Sliders */}
          <div className="pnl-sim-panel" aria-label="Simulador de escenarios Qué pasa si">
            <div className="pnl-sim-header">
              <span>
                <SlidersHorizontal size={13} /> Simulador &ldquo;Qué pasa si&rdquo; (no modifica datos reales)
              </span>
              <span className="mono pnl-sim-ebit-tag">
                EBIT proyectado: <strong>{money(simulated.operatingResult)}</strong>
              </span>
            </div>
            <div className="pnl-sim-sliders">
              <label className="pnl-sim-control">
                <div>
                  <span>Precio / Ventas</span>
                  <strong className="mono">
                    {simSalesDeltaPct > 0 ? `+${simSalesDeltaPct}%` : `${simSalesDeltaPct}%`}
                  </strong>
                </div>
                <input
                  type="range"
                  min={-25}
                  max={40}
                  step={1}
                  value={simSalesDeltaPct}
                  onChange={(e) => setSimSalesDeltaPct(Number(e.target.value))}
                />
              </label>

              <label className="pnl-sim-control">
                <div>
                  <span>Costos fijos</span>
                  <strong className="mono">
                    {simFixedDeltaPct > 0 ? `+${simFixedDeltaPct}%` : `${simFixedDeltaPct}%`}
                  </strong>
                </div>
                <input
                  type="range"
                  min={-30}
                  max={30}
                  step={1}
                  value={simFixedDeltaPct}
                  onChange={(e) => setSimFixedDeltaPct(Number(e.target.value))}
                />
              </label>

              <label className="pnl-sim-control">
                <div>
                  <span>Costos variables</span>
                  <strong className="mono">
                    {simVariableDeltaPct > 0 ? `+${simVariableDeltaPct}%` : `${simVariableDeltaPct}%`}
                  </strong>
                </div>
                <input
                  type="range"
                  min={-25}
                  max={25}
                  step={1}
                  value={simVariableDeltaPct}
                  onChange={(e) => setSimVariableDeltaPct(Number(e.target.value))}
                />
              </label>
            </div>
          </div>

          <div className="reports-recharts-box">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart
                data={activeCurveData}
                margin={{ top: 18, right: 18, left: 0, bottom: 6 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
                <XAxis
                  type="number"
                  dataKey="sales"
                  domain={[0, activeMaxAxis]}
                  tickFormatter={shortMoney}
                  tick={{ fontSize: 10.5 }}
                />
                <YAxis tickFormatter={shortMoney} tick={{ fontSize: 11 }} width={58} />
                <Tooltip
                  labelFormatter={(val) => `Nivel de ventas: ${money(Number(val) || 0)}`}
                  formatter={(value: unknown) => money(Number(value) || 0)}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {activeBreakEven > 0 && activeBreakEven <= activeMaxAxis && (
                  <ReferenceLine
                    x={Math.round(activeBreakEven)}
                    stroke="#b45309"
                    strokeDasharray="4 4"
                    strokeWidth={1.6}
                    label={{
                      value: `PE ${shortMoney(activeBreakEven)}`,
                      position: 'top',
                      fill: '#b45309',
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  />
                )}
                {activeRevenue > 0 && activeRevenue <= activeMaxAxis && (
                  <ReferenceLine
                    x={Math.round(activeRevenue)}
                    stroke="#2f855a"
                    strokeDasharray="2 2"
                    strokeWidth={1.5}
                    label={{
                      value: `Actual ${shortMoney(activeRevenue)}`,
                      position: 'insideTopRight',
                      fill: '#1e6b43',
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  />
                )}
                <Line
                  type="linear"
                  dataKey="sales"
                  name={hasSimulationActive ? 'Ingresos simulados' : 'Ingresos por ventas'}
                  stroke="#2f855a"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  type="linear"
                  dataKey="totalCosts"
                  name={hasSimulationActive ? 'Costos totales simulados' : 'Costos totales'}
                  stroke="#c05621"
                  strokeWidth={2.3}
                  dot={{ r: 3 }}
                />
                <Line
                  type="linear"
                  dataKey="fixedCosts"
                  name={hasSimulationActive ? 'Costos fijos simulados' : 'Costos fijos'}
                  stroke="#64748b"
                  strokeWidth={1.8}
                  strokeDasharray="5 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Connected Source Breakdown: FinanceCompanyExpenses & FinanceAccounting */}
      <div className="reports-split-grid">
        <section className="overview-panel-card">
          <div className="overview-card-head overview-card-head-split">
            <div>
              <h2>Origen: Módulo de Gastos y Pólizas</h2>
              <p>Clasificación viva de las 5 naturalezas contables (excluye pólizas canceladas).</p>
            </div>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => onNavigateModule('Gastos')}
            >
              <Layers size={13} /> Ir a Gastos
            </button>
          </div>
          <div className="table-wrap ops-table-wrap">
            <table className="data-table ops-data-table">
              <thead>
                <tr>
                  <th>NATURALEZA CONTABLE</th>
                  <th style={{ textAlign: 'right' }}>PÓLIZAS</th>
                  <th style={{ textAlign: 'right' }}>IMPORTE TOTAL</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Gastos administrativos</strong></td>
                  <td style={{ textAlign: 'right' }} className="mono">{data.companyExpenseBreakdown.adminCount}</td>
                  <td style={{ textAlign: 'right' }} className="mono"><strong>{money(data.companyExpenseBreakdown.adminTotal)}</strong></td>
                </tr>
                <tr>
                  <td><strong>Gastos operativos</strong></td>
                  <td style={{ textAlign: 'right' }} className="mono">{data.companyExpenseBreakdown.operatingCount}</td>
                  <td style={{ textAlign: 'right' }} className="mono"><strong>{money(data.companyExpenseBreakdown.operatingTotal)}</strong></td>
                </tr>
                <tr>
                  <td><strong>Costos de venta directos</strong></td>
                  <td style={{ textAlign: 'right' }} className="mono">{data.companyExpenseBreakdown.cogsCount}</td>
                  <td style={{ textAlign: 'right' }} className="mono"><strong>{money(data.companyExpenseBreakdown.cogsTotal)}</strong></td>
                </tr>
                <tr>
                  <td><strong>Gastos financieros</strong></td>
                  <td style={{ textAlign: 'right' }} className="mono">{data.companyExpenseBreakdown.financialCount}</td>
                  <td style={{ textAlign: 'right' }} className="mono"><strong>{money(data.companyExpenseBreakdown.financialTotal)}</strong></td>
                </tr>
                <tr>
                  <td><strong>Impuestos y derechos</strong></td>
                  <td style={{ textAlign: 'right' }} className="mono">{data.companyExpenseBreakdown.taxesCount}</td>
                  <td style={{ textAlign: 'right' }} className="mono"><strong>{money(data.companyExpenseBreakdown.taxesTotal)}</strong></td>
                </tr>
                <tr className="pnl-row-subtotal">
                  <td><strong>Clasificación por comportamiento (Fijo / Variable)</strong></td>
                  <td style={{ textAlign: 'right' }} className="mono">
                    Fijo: {money(data.companyExpenseBreakdown.fixedTotal)}
                  </td>
                  <td style={{ textAlign: 'right' }} className="mono">
                    Var: {money(data.companyExpenseBreakdown.variableTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="overview-panel-card">
          <div className="overview-card-head overview-card-head-split">
            <div>
              <h2>Origen: Cuentas Contables (4xxx–8xxx)</h2>
              <p>Cuentas activas del catálogo contable consideradas en el Estado de Resultados.</p>
            </div>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => onNavigateModule('Finanzas')}
            >
              <BookOpen size={13} /> Catálogo contable
            </button>
          </div>
          <div className="table-wrap ops-table-wrap">
            <table className="data-table ops-data-table">
              <thead>
                <tr>
                  <th>CÓDIGO</th>
                  <th>CUENTA CONTABLE</th>
                  <th>GRUPO P&amp;L</th>
                  <th style={{ textAlign: 'right' }}>SALDO</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ...data.accountBreakdown.revenueAccounts,
                  ...data.accountBreakdown.cogsAccounts,
                  ...data.accountBreakdown.opExAccounts,
                  ...data.accountBreakdown.finExAccounts,
                  ...data.accountBreakdown.otherIncomeAccounts,
                ].map((acc) => (
                  <tr key={acc.id}>
                    <td className="mono"><strong>{acc.code}</strong></td>
                    <td>{acc.name}</td>
                    <td>{acc.type}</td>
                    <td style={{ textAlign: 'right' }} className="mono"><strong>{money(acc.balance)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Cost Center Profitability & Break-Even Breakdown (Branches & Departments) */}
      {(branchBreakdown.length > 0 || departmentBreakdown.length > 0) && (
        <section className="overview-panel-card">
          <div className="overview-card-head overview-card-head-split">
            <div>
              <h2>Rentabilidad y punto de equilibrio por centro de costo</h2>
              <p>
                Desglose por sucursal y departamento conectado a Administración y Gastos. Haz clic
                en Filtrar P&amp;L para aislar el Estado de Resultados de esa unidad.
              </p>
            </div>
            <div className="warehouse-tab-selector" role="tablist" aria-label="Desglose por centro de costo">
              <button
                type="button"
                className={`wh-tab ${costCenterTab === 'branches' ? 'active' : ''}`}
                onClick={() => setCostCenterTab('branches')}
              >
                <MapPin size={13} /> Por sucursal ({branchBreakdown.length})
              </button>
              <button
                type="button"
                className={`wh-tab ${costCenterTab === 'departments' ? 'active' : ''}`}
                onClick={() => setCostCenterTab('departments')}
              >
                <Building2 size={13} /> Por departamento ({departmentBreakdown.length})
              </button>
            </div>
          </div>

          <div className="table-wrap ops-table-wrap">
            {costCenterTab === 'branches' ? (
              <table className="data-table ops-data-table">
                <thead>
                  <tr>
                    <th>CÓDIGO</th>
                    <th>SUCURSAL / UBICACIÓN</th>
                    <th style={{ textAlign: 'right' }}>INGRESOS</th>
                    <th style={{ textAlign: 'right' }}>COSTOS FIJOS</th>
                    <th style={{ textAlign: 'right' }}>COSTOS VARIABLES</th>
                    <th style={{ textAlign: 'right' }}>NÓMINA</th>
                    <th style={{ textAlign: 'right' }}>RESULTADO OP.</th>
                    <th style={{ textAlign: 'right' }}>P. EQUILIBRIO</th>
                    <th style={{ textAlign: 'right' }}>COBERTURA</th>
                    {onToggleLocationFilter && <th style={{ textAlign: 'right' }}>ALCANCE P&amp;L</th>}
                  </tr>
                </thead>
                <tbody>
                  {branchBreakdown.map((br) => {
                    const isSelected = activeLocationFilter === br.id
                    return (
                      <tr key={br.id}>
                        <td className="mono">
                          <strong>{br.code}</strong>
                        </td>
                        <td>
                          <strong>{br.name}</strong>
                          <div className="company-expense-muted-sep">{br.expensesCount} póliza(s) de gasto</div>
                        </td>
                        <td style={{ textAlign: 'right' }} className="mono">
                          {money(br.revenue)}
                        </td>
                        <td style={{ textAlign: 'right' }} className="mono">
                          {money(br.fixedCosts)}
                        </td>
                        <td style={{ textAlign: 'right' }} className="mono">
                          {money(br.variableCosts)}
                        </td>
                        <td style={{ textAlign: 'right' }} className="mono">
                          {money(br.payrollCosts)}
                        </td>
                        <td
                          style={{ textAlign: 'right' }}
                          className={`mono ${br.operatingResult >= 0 ? 'pnl-val-positive' : 'pnl-val-negative'}`}
                        >
                          <strong>{money(br.operatingResult)}</strong>
                        </td>
                        <td style={{ textAlign: 'right' }} className="mono">
                          {br.breakEvenSales > 0 ? money(br.breakEvenSales) : '—'}
                        </td>
                        <td style={{ textAlign: 'right' }} className="mono">
                          {br.breakEvenSales > 0 ? `${br.coveragePct.toFixed(0)}%` : 'Sede soporte'}
                        </td>
                        {onToggleLocationFilter && (
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="button-icon-action"
                              onClick={() => onToggleLocationFilter(br.id)}
                            >
                              {isSelected ? 'Quitar filtro' : 'Filtrar P&L'}
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <table className="data-table ops-data-table">
                <thead>
                  <tr>
                    <th>CENTRO COSTO</th>
                    <th>DEPARTAMENTO / ÁREA</th>
                    <th style={{ textAlign: 'right' }}>PÓLIZAS</th>
                    <th style={{ textAlign: 'right' }}>GASTOS FIJOS</th>
                    <th style={{ textAlign: 'right' }}>GASTOS VAR.</th>
                    <th style={{ textAlign: 'right' }}>NÓMINA</th>
                    <th style={{ textAlign: 'right' }}>COSTO TOTAL</th>
                    <th style={{ textAlign: 'right' }}>VENTAS P.E. ÁREA</th>
                    <th style={{ textAlign: 'right' }}>PARTICIPACIÓN</th>
                    {onToggleDepartmentFilter && <th style={{ textAlign: 'right' }}>ALCANCE P&amp;L</th>}
                  </tr>
                </thead>
                <tbody>
                  {departmentBreakdown.map((dep) => {
                    const isSelected = activeDepartmentFilter === dep.id
                    return (
                      <tr key={dep.id}>
                        <td className="mono">
                          <strong>{dep.costCenter}</strong>
                        </td>
                        <td>
                          <strong>{dep.name}</strong>
                          <div className="company-expense-muted-sep">
                            {dep.code} · Líder: {dep.leader}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }} className="mono">
                          {dep.expensesCount}
                        </td>
                        <td style={{ textAlign: 'right' }} className="mono">
                          {money(dep.fixedExpenses)}
                        </td>
                        <td style={{ textAlign: 'right' }} className="mono">
                          {money(dep.variableExpenses)}
                        </td>
                        <td style={{ textAlign: 'right' }} className="mono">
                          {money(dep.payrollCosts)}
                        </td>
                        <td style={{ textAlign: 'right' }} className="mono">
                          <strong>{money(dep.totalCost)}</strong>
                        </td>
                        <td style={{ textAlign: 'right' }} className="mono">
                          {dep.breakEvenSupportSales > 0 ? money(dep.breakEvenSupportSales) : '—'}
                        </td>
                        <td style={{ textAlign: 'right' }} className="mono">
                          {dep.sharePct.toFixed(1)}%
                        </td>
                        {onToggleDepartmentFilter && (
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="button-icon-action"
                              onClick={() => onToggleDepartmentFilter(dep.id)}
                            >
                              {isSelected ? 'Quitar filtro' : 'Filtrar P&L'}
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
