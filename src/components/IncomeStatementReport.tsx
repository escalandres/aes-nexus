import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Building2,
  Calculator,
  ChevronDown,
  ChevronRight,
  Layers,
  MapPin,
  Percent,
  RotateCcw,
  Scale,
  SlidersHorizontal,
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
  onToggleLocationFilter,
  onToggleDepartmentFilter,
}: IncomeStatementReportProps) {
  const [expandOpExDetail, setExpandOpExDetail] = useState(true)
  const [costCenterTab, setCostCenterTab] = useState<'branches' | 'departments'>('branches')
  const [brand, setBrand] = useState<CompanyBrandSnapshot>(() => loadCompanyBrandSnapshot())

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
    const operatingResult = contribution - fixed

    const maxAxis = Math.max(rev * 1.35, breakEven * 1.4, data.totalRevenue * 1.35, 100000)
    const steps = 6
    const varRate = rev > 0 ? variable / rev : 0.45
    const curveData = Array.from({ length: steps + 1 }, (_, i) => {
      const ratio = i / steps
      const salesAtPoint = Math.round(maxAxis * ratio)
      const totalCostAtPoint = Math.round(fixed + salesAtPoint * varRate)
      return {
        volumeLabel: `${Math.round(ratio * 100)}%`,
        sales: salesAtPoint,
        totalCosts: totalCostAtPoint,
        fixedCosts: Math.round(fixed),
      }
    })

    return {
      rev,
      fixed,
      variable,
      cmRatioPct,
      breakEven,
      safetyAmount,
      safetyPct,
      operatingResult,
      curveData,
    }
  }, [data.totalRevenue, data.fixedCosts, data.variableCosts, simSalesDeltaPct, simFixedDeltaPct, simVariableDeltaPct])

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
              Integrado en tiempo real con el módulo de <strong>Gastos</strong> y{' '}
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
            <ResponsiveContainer width="100%" height={230}>
              <LineChart
                data={hasSimulationActive ? simulated.curveData : data.breakEvenCurveData}
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
                  name={hasSimulationActive ? 'Ingresos simulados' : 'Ingresos por ventas'}
                  stroke="#2f855a"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="totalCosts"
                  name={hasSimulationActive ? 'Costos totales simulados' : 'Costos totales'}
                  stroke="#c05621"
                  strokeWidth={2.3}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
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
