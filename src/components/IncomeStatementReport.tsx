import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Calculator,
  ChevronDown,
  ChevronRight,
  Layers,
  Percent,
  Scale,
  TrendingUp,
} from 'lucide-react'
import {
  ResponsiveContainer,
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
  resolveCompanyExpenseCategory,
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
    financialCount: number
    financialTotal: number
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

  const allExpensesTotal = allExpenses.reduce((s, e) => s + e.total, 0)
  const scopedExpensesMatchingCurrency = scopedExpenses.filter(
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

  // Company expenses grouped by FinanceCompanyExpenses corporate categories
  let adminExpenses = 0
  let adminCount = 0
  let operatingExpenses = 0
  let operatingCount = 0
  let finCompanyExpenses = 0
  let finCount = 0
  let fixedCompanyExpenses = 0
  let variableCompanyExpenses = 0

  scopedExpensesMatchingCurrency.forEach((exp) => {
    const cat = resolveCompanyExpenseCategory(exp)
    if (cat === 'Gastos administrativos') {
      adminExpenses += exp.total
      adminCount += 1
    } else if (cat === 'Gastos operativos') {
      operatingExpenses += exp.total
      operatingCount += 1
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

  const cogs =
    sourceMode === 'accounting'
      ? chartCogs * revenueScopeRatio
      : chartCogs * revenueScopeRatio + incrementalCogs

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
  const taxes = ebt > 0 ? ebt * (normalizedTaxRate / 100) : 0
  const netIncome = ebt - taxes
  const netMarginPct = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0

  // Break-even calculations (Costos Fijos vs Costos Variables)
  const variableCosts =
    sourceMode === 'accounting' ? cogs : cogs + variableCompanyExpenses
  const fixedCosts =
    sourceMode === 'accounting'
      ? Math.max(0, opAndAdminExpenses + financialExpenses)
      : Math.max(
          0,
          fixedCompanyExpenses +
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
      sourceLabel: `Cuentas 5xxx (${cogsAccounts.length})${incrementalCogs > 0 ? ' + pedidos' : ''}`,
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
          : `Gastos de la empresa (${adminCount + operatingCount}) + Cuentas 6xxx`,
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
            sourceLabel: `Finanzas > Gastos de la empresa (${adminCount} pólizas)`,
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
            sourceLabel: `Finanzas > Gastos de la empresa (${operatingCount} pólizas)`,
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
      label: `Impuestos (ISR estimado ${normalizedTaxRate}%)`,
      sign: '−',
      sourceLabel: ebt > 0 ? `Provisión fiscal ${normalizedTaxRate}% sobre UAI` : 'Sin base gravable positiva',
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

  // Break-even curve across 0% to 150% of current revenue (or break-even baseline)
  const maxSalesAxis = Math.max(totalRevenue * 1.35, breakEvenSales * 1.4, 100000)
  const steps = 6
  const varRate = totalRevenue > 0 ? variableCosts / totalRevenue : 0.45
  const breakEvenCurveData = Array.from({ length: steps + 1 }, (_, i) => {
    const ratio = i / steps
    const salesAtPoint = Math.round(maxSalesAxis * ratio)
    const totalCostAtPoint = Math.round(fixedCosts + salesAtPoint * varRate)
    return {
      volumeLabel: `${Math.round(ratio * 100)}%`,
      sales: salesAtPoint,
      totalCosts: totalCostAtPoint,
      fixedCosts: Math.round(fixedCosts),
    }
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
      financialCount: finCount,
      financialTotal: finCompanyExpenses,
      fixedTotal: fixedCompanyExpenses,
      variableTotal: variableCompanyExpenses,
    },
  }
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
}: IncomeStatementReportProps) {
  const [expandOpExDetail, setExpandOpExDetail] = useState(true)
  const [brand, setBrand] = useState<CompanyBrandSnapshot>(() => loadCompanyBrandSnapshot())

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

  const isAboveBreakEven = data.totalRevenue >= data.breakEvenSales && data.breakEvenSales > 0

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
          <span className="pnl-scope-tag mono" title={activeScopeSummary}>
            {activeScopeSummary}
          </span>
        </div>
      </section>

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

        <article className="ops-kpi-card">
          <div className="ops-kpi-top">
            <span>MARGEN OPERATIVO (EBIT)</span>
            <span className="ops-kpi-icon icon-purple">
              <TrendingUp size={16} />
            </span>
          </div>
          <div className="ops-kpi-val mono">{data.operatingMarginPct.toFixed(1)}%</div>
          <div className="ops-kpi-foot">
            <span>Utilidad operativa: <strong className="mono">{money(data.operatingIncome)}</strong></span>
          </div>
        </article>

        <article className="ops-kpi-card highlight">
          <div className="ops-kpi-top">
            <span>MARGEN NETO</span>
            <span className={`ops-kpi-icon ${data.netIncome >= 0 ? 'icon-green' : 'icon-amber'}`}>
              <Scale size={16} />
            </span>
          </div>
          <div className={`ops-kpi-val mono ${data.netIncome < 0 ? 'text-alert' : ''}`}>
            {data.netMarginPct.toFixed(1)}%
          </div>
          <div className="ops-kpi-foot">
            <span>Utilidad neta: <strong className="mono">{money(data.netIncome)}</strong></span>
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

      {/* Main Formal Income Statement Table */}
      <section className="overview-panel-card">
        <div className="overview-card-head overview-card-head-split">
          <div>
            <h2>Estado de Resultados Integral (P&amp;L)</h2>
            <p>
              Integrado en tiempo real con <strong>Gastos de la empresa</strong> y{' '}
              <strong>Cuentas contables</strong> · Cifras expresadas según filtros activos.
            </p>
          </div>
          <div className="pnl-head-actions">
            {sourceMode === 'consolidated' && (
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

                return (
                  <tr key={row.id} className={rowClass}>
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

        {/* Chart 2: Break-Even Analysis */}
        <section className="overview-panel-card">
          <div className="overview-card-head">
            <h2>Análisis de Punto de Equilibrio</h2>
            <div className="overview-card-head-sub">
              <Calculator size={16} />
              <p>
                Cruce entre ventas y costos totales (fijos + variables) · Margen de contribución{' '}
                <strong className="mono">{data.contributionMarginRatioPct.toFixed(1)}%</strong>.
              </p>
            </div>
          </div>

          <div className="pnl-breakeven-metrics">
            <div>
              <small>Costos fijos</small>
              <strong className="mono">{money(data.fixedCosts)}</strong>
            </div>
            <div>
              <small>Costos variables</small>
              <strong className="mono">{money(data.variableCosts)}</strong>
            </div>
            <div>
              <small>Punto de equilibrio</small>
              <strong className="mono">{money(data.breakEvenSales)}</strong>
            </div>
            <div>
              <small>Margen de seguridad</small>
              <strong
                className={`mono ${data.safetyMarginAmount >= 0 ? 'pnl-val-positive' : 'pnl-val-negative'}`}
              >
                {money(data.safetyMarginAmount)} ({data.safetyMarginPct.toFixed(1)}%)
              </strong>
            </div>
          </div>

          <div className="reports-recharts-box">
            <ResponsiveContainer width="100%" height={230}>
              <LineChart
                data={data.breakEvenCurveData}
                margin={{ top: 10, right: 14, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
                <XAxis dataKey="volumeLabel" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={shortMoney} tick={{ fontSize: 11 }} width={58} />
                <Tooltip formatter={(value: unknown) => money(Number(value) || 0)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="sales"
                  name="Ingresos por ventas"
                  stroke="#2f855a"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="totalCosts"
                  name="Costos totales"
                  stroke="#c05621"
                  strokeWidth={2.3}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="fixedCosts"
                  name="Costos fijos"
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
              <h2>Origen: Gastos de la Empresa</h2>
              <p>Clasificación viva tomada de Finanzas &gt; Gastos de la empresa.</p>
            </div>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => onNavigateModule('Finanzas')}
            >
              <Layers size={13} /> Ir a Finanzas
            </button>
          </div>
          <div className="table-wrap ops-table-wrap">
            <table className="data-table ops-data-table">
              <thead>
                <tr>
                  <th>CATEGORÍA EMPRESARIAL</th>
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
                  <td><strong>Gastos financieros</strong></td>
                  <td style={{ textAlign: 'right' }} className="mono">{data.companyExpenseBreakdown.financialCount}</td>
                  <td style={{ textAlign: 'right' }} className="mono"><strong>{money(data.companyExpenseBreakdown.financialTotal)}</strong></td>
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
    </div>
  )
}
