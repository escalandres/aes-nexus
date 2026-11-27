import { useMemo, useState } from 'react'
import {
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  ReceiptText,
  Wallet,
  ArrowRight,
  Clock,
  ShieldCheck,
  CreditCard,
  Building2,
  DollarSign,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Download,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts'
import {
  initialChartAccounts,
  type BankAccount,
  type ChartAccount,
  type InvoiceReceivable,
  type BillPayable,
  type ExpenseRecord,
  type PaymentTransaction,
} from '../data/finance'
import type { InventoryItemLocation } from '../data/operations'
import type { SalesOrder } from '../data/sales'
import type { PayrollRunRecord } from '../data/payroll'
import { computeIncomeStatementData } from './IncomeStatementReport'
import { useI18n } from '../i18n/I18nContext'
import { getCurrencySymbol } from '../services/currencyService'
import { useToast } from './Toast'

interface FinanceOverviewProps {
  bankAccounts: BankAccount[]
  receivables: InvoiceReceivable[]
  payables: BillPayable[]
  expenses: ExpenseRecord[]
  transactions: PaymentTransaction[]
  chartAccounts?: ChartAccount[]
  orders?: SalesOrder[]
  inventory?: InventoryItemLocation[]
  payrollRuns?: PayrollRunRecord[]
  onNavigateSection: (sec: 'Cobros' | 'Pagos' | 'Resumen') => void
  onNavigateExpenses?: () => void
  onNavigateIncomeStatement?: () => void
}

interface SimulatorPreset {
  id: 'base' | 'expansion' | 'efficiency' | 'stress'
  label: string
  salesVolumeDeltaPct: number
  variableCogsDeltaPct: number
  opexDeltaPct: number
  cashCollectionPct: number
}

const SIMULATOR_PRESETS: SimulatorPreset[] = [
  {
    id: 'base',
    label: 'Base actual',
    salesVolumeDeltaPct: 0,
    variableCogsDeltaPct: 0,
    opexDeltaPct: 0,
    cashCollectionPct: 100,
  },
  {
    id: 'expansion',
    label: 'Expansión (+20%)',
    salesVolumeDeltaPct: 20,
    variableCogsDeltaPct: -4,
    opexDeltaPct: 8,
    cashCollectionPct: 94,
  },
  {
    id: 'efficiency',
    label: 'Eficiencia de costos',
    salesVolumeDeltaPct: 0,
    variableCogsDeltaPct: -12,
    opexDeltaPct: -10,
    cashCollectionPct: 100,
  },
  {
    id: 'stress',
    label: 'Estrés operativo',
    salesVolumeDeltaPct: -20,
    variableCogsDeltaPct: 10,
    opexDeltaPct: 0,
    cashCollectionPct: 82,
  },
]

function formatDeltaPct(val: number): string {
  if (val > 0) return `+${val}%`
  return `${val}%`
}

function formatPtsDelta(val: number): string {
  const rounded = Number(val.toFixed(1))
  if (rounded > 0) return `+${rounded.toFixed(1)} pts`
  return `${rounded.toFixed(1)} pts`
}

function formatCompactAxis(val: number, symbol: string): string {
  const abs = Math.abs(val)
  const sign = val < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}${symbol}${Math.round(abs / 1_000)}k`
  return `${sign}${symbol}${Math.round(abs)}`
}

function escapeCsvCell(value: string | number | undefined | null): string {
  const str = String(value ?? '')
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function FinanceOverview({
  bankAccounts,
  receivables,
  payables,
  expenses,
  transactions,
  chartAccounts = initialChartAccounts,
  orders = [],
  inventory = [],
  payrollRuns = [],
  onNavigateSection,
  onNavigateExpenses,
  onNavigateIncomeStatement,
}: FinanceOverviewProps) {
  const { countryProfile, reportingCurrency, convertAmount, formatCurrency } = useI18n()
  const toast = useToast()
  const money = (val: number) => formatCurrency(val, reportingCurrency, 0)
  const currencySymbol = getCurrencySymbol(reportingCurrency)

  // Non-mutating expense & cash flow simulator state
  const [salesVolumeDeltaPct, setSalesVolumeDeltaPct] = useState<number>(0)
  const [variableCogsDeltaPct, setVariableCogsDeltaPct] = useState<number>(0)
  const [opexDeltaPct, setOpexDeltaPct] = useState<number>(0)
  const [cashCollectionPct, setCashCollectionPct] = useState<number>(100)

  const isSimulationModified =
    salesVolumeDeltaPct !== 0 ||
    variableCogsDeltaPct !== 0 ||
    opexDeltaPct !== 0 ||
    cashCollectionPct !== 100

  const applyPreset = (preset: SimulatorPreset) => {
    setSalesVolumeDeltaPct(preset.salesVolumeDeltaPct)
    setVariableCogsDeltaPct(preset.variableCogsDeltaPct)
    setOpexDeltaPct(preset.opexDeltaPct)
    setCashCollectionPct(preset.cashCollectionPct)
  }

  const resetSimulation = () => {
    setSalesVolumeDeltaPct(0)
    setVariableCogsDeltaPct(0)
    setOpexDeltaPct(0)
    setCashCollectionPct(100)
  }

  // Total cash in banks (converted to active display currency)
  const totalCash = useMemo(() => {
    return bankAccounts.reduce((acc, b) => acc + convertAmount(b.balance, b.currency || 'MXN'), 0)
  }, [bankAccounts, convertAmount])

  // Total receivables balance (converted)
  const totalReceivable = useMemo(() => {
    return receivables.reduce((acc, r) => acc + convertAmount(r.balance, r.currency || 'MXN'), 0)
  }, [receivables, convertAmount])

  // Total payables balance (converted)
  const totalPayable = useMemo(() => {
    return payables.reduce((acc, p) => acc + convertAmount(p.balance, p.currency || 'MXN'), 0)
  }, [payables, convertAmount])

  // Working capital
  const workingCapital = totalCash + totalReceivable - totalPayable

  // Baseline Income Statement grounded in active ledger, expenses, orders & inventory
  const baselinePnl = useMemo(() => {
    return computeIncomeStatementData({
      scopedExpenses: expenses.filter((e) => e.status !== 'Cancelado'),
      allExpenses: expenses,
      chartAccounts,
      scopedReceivables: receivables,
      allReceivables: receivables,
      scopedOrders: orders,
      allOrders: orders,
      inventory,
      scopedPayrollRuns: payrollRuns,
      allPayrollRuns: payrollRuns,
      sourceMode: 'consolidated',
      taxRate: 30,
      currencyFilter: 'Todas',
      displayCurrency: reportingCurrency,
      hasScopedDateOrOrgFilter: false,
    })
  }, [expenses, chartAccounts, receivables, orders, inventory, payrollRuns, reportingCurrency])

  // Dynamic simulation of Operating Cash Flow + Income Statement Margins
  const simulation = useMemo(() => {
    const baseRevenue = baselinePnl.totalRevenue
    const baseCogs = baselinePnl.cogs
    const baseOpex = baselinePnl.opAndAdminExpenses
    const baseFinancial = baselinePnl.financialExpenses
    const baseOtherIncome = baselinePnl.otherIncome
    const baseTaxes = baselinePnl.taxes
    const taxRate = baselinePnl.taxRate

    const baseGrossProfit = baselinePnl.grossProfit
    const baseGrossMarginPct = baselinePnl.grossMarginPct
    const baseOperatingIncome = baselinePnl.operatingIncome
    const baseOperatingMarginPct = baselinePnl.operatingMarginPct
    const baseNetIncome = baselinePnl.netIncome
    const baseNetMarginPct = baselinePnl.netMarginPct
    const baseCogsRatioPct = baseRevenue > 0 ? (baseCogs / baseRevenue) * 100 : 0
    const baseOperatingCashFlow = baseRevenue - baseCogs - baseOpex - baseTaxes

    const volumeFactor = 1 + salesVolumeDeltaPct / 100
    const cogsUnitFactor = 1 + variableCogsDeltaPct / 100
    const opexFactor = 1 + opexDeltaPct / 100

    const simRevenue = Math.max(0, baseRevenue * volumeFactor)
    // Variable COGS scales both with sales volume and unit cost efficiency
    const simCogs = Math.max(0, baseCogs * volumeFactor * cogsUnitFactor)
    const simGrossProfit = simRevenue - simCogs
    const simGrossMarginPct = simRevenue > 0 ? (simGrossProfit / simRevenue) * 100 : 0
    const simCogsRatioPct = simRevenue > 0 ? (simCogs / simRevenue) * 100 : 0

    const simOpex = Math.max(0, baseOpex * opexFactor)
    const simOperatingIncome = simGrossProfit - simOpex
    const simOperatingMarginPct = simRevenue > 0 ? (simOperatingIncome / simRevenue) * 100 : 0

    const simEbt = simOperatingIncome - baseFinancial + baseOtherIncome
    const simTaxes = simEbt > 0 ? simEbt * (taxRate / 100) : 0
    const simNetIncome = simEbt - simTaxes
    const simNetMarginPct = simRevenue > 0 ? (simNetIncome / simRevenue) * 100 : 0

    const simCollectedCash = simRevenue * (cashCollectionPct / 100)
    const simCollectionHoldback = simRevenue - simCollectedCash
    const simOperatingCashFlow = simCollectedCash - simCogs - simOpex - simTaxes
    const ocfDelta = simOperatingCashFlow - baseOperatingCashFlow
    const ocfDeltaPct =
      Math.abs(baseOperatingCashFlow) > 0.01
        ? (ocfDelta / Math.abs(baseOperatingCashFlow)) * 100
        : 0

    const projectedClosingCash = totalCash + simOperatingCashFlow

    // Break-even sales under simulated cost structure
    const simContributionRatio = simRevenue > 0 ? (simRevenue - simCogs) / simRevenue : 0
    const simBreakEvenSales =
      simContributionRatio > 0 ? (simOpex + baseFinancial) / simContributionRatio : 0

    const chartData = [
      {
        concepto: 'Ingresos',
        Base: Math.round(baseRevenue),
        Simulado: Math.round(simRevenue),
      },
      {
        concepto: 'Costo var.',
        Base: Math.round(baseCogs),
        Simulado: Math.round(simCogs),
      },
      {
        concepto: 'OpEx',
        Base: Math.round(baseOpex),
        Simulado: Math.round(simOpex),
      },
      {
        concepto: 'EBIT',
        Base: Math.round(baseOperatingIncome),
        Simulado: Math.round(simOperatingIncome),
      },
      {
        concepto: 'Flujo Op.',
        Base: Math.round(baseOperatingCashFlow),
        Simulado: Math.round(simOperatingCashFlow),
      },
    ]

    const statusTone: 'healthy' | 'warning' | 'danger' =
      simOperatingCashFlow < 0 || simOperatingMarginPct < 0
        ? 'danger'
        : simOperatingMarginPct < 12 || simNetMarginPct < 6
          ? 'warning'
          : 'healthy'

    const statusMessage =
      statusTone === 'danger'
        ? 'Déficit operativo proyectado: las salidas por costo variable, OpEx o retención de cobranza superan el flujo generado.'
        : statusTone === 'warning'
          ? 'Margen operativo estrecho (< 12%): conviene optimizar el costo de ventas variable o acelerar la cobranza en efectivo.'
          : 'Flujo de caja operativo saludable: los márgenes del Estado de Resultados absorben la estructura operativa y fortalecen la liquidez.'

    return {
      baseRevenue,
      baseCogs,
      baseOpex,
      baseGrossProfit,
      baseGrossMarginPct,
      baseOperatingIncome,
      baseOperatingMarginPct,
      baseNetIncome,
      baseNetMarginPct,
      baseTaxes,
      baseFinancial,
      baseOtherIncome,
      baseCogsRatioPct,
      baseOperatingCashFlow,
      simRevenue,
      simCogs,
      simGrossProfit,
      simGrossMarginPct,
      simCogsRatioPct,
      simOpex,
      simOperatingIncome,
      simOperatingMarginPct,
      simTaxes,
      simNetIncome,
      simNetMarginPct,
      simCollectedCash,
      simCollectionHoldback,
      simOperatingCashFlow,
      ocfDelta,
      ocfDeltaPct,
      projectedClosingCash,
      simBreakEvenSales,
      chartData,
      statusTone,
      statusMessage,
    }
  }, [
    baselinePnl,
    salesVolumeDeltaPct,
    variableCogsDeltaPct,
    opexDeltaPct,
    cashCollectionPct,
    totalCash,
  ])

  const getTransactionTypeBadge = (type: PaymentTransaction['type']) => {
    switch (type) {
      case 'Cobro de cliente':
        return (
          <span className="badge-entry">
            <ArrowDownLeft size={11} /> Cobro recibido
          </span>
        )
      case 'Pago a proveedor':
        return (
          <span className="badge-exit">
            <ArrowUpRight size={11} /> Pago a proveedor
          </span>
        )
      case 'Gasto operativo':
        return (
          <span className="badge-adjust">
            <CreditCard size={11} /> Gasto operativo
          </span>
        )
      default:
        return null
    }
  }

  const marginRows = [
    {
      id: 'gross',
      label: 'Margen Bruto (Ingresos − COGS)',
      basePct: simulation.baseGrossMarginPct,
      simPct: simulation.simGrossMarginPct,
      simAmount: simulation.simGrossProfit,
    },
    {
      id: 'operating',
      label: 'Margen Operativo (EBIT)',
      basePct: simulation.baseOperatingMarginPct,
      simPct: simulation.simOperatingMarginPct,
      simAmount: simulation.simOperatingIncome,
    },
    {
      id: 'net',
      label: 'Margen Neto del Ejercicio',
      basePct: simulation.baseNetMarginPct,
      simPct: simulation.simNetMarginPct,
      simAmount: simulation.simNetIncome,
    },
  ]

  const pnlComparisonRows = [
    {
      id: 'rev',
      label: 'Ingresos por ventas',
      base: simulation.baseRevenue,
      sim: simulation.simRevenue,
      kind: 'normal' as const,
      inverseGood: false,
    },
    {
      id: 'cogs',
      label: '(−) Costo de ventas variable',
      base: simulation.baseCogs,
      sim: simulation.simCogs,
      kind: 'normal' as const,
      inverseGood: true,
    },
    {
      id: 'gross',
      label: '(=) Utilidad Bruta',
      base: simulation.baseGrossProfit,
      sim: simulation.simGrossProfit,
      kind: 'subtotal' as const,
      inverseGood: false,
    },
    {
      id: 'opex',
      label: '(−) Gastos operativos y admin. (OpEx)',
      base: simulation.baseOpex,
      sim: simulation.simOpex,
      kind: 'normal' as const,
      inverseGood: true,
    },
    {
      id: 'ebit',
      label: '(=) Utilidad Operativa (EBIT)',
      base: simulation.baseOperatingIncome,
      sim: simulation.simOperatingIncome,
      kind: 'subtotal' as const,
      inverseGood: false,
    },
    {
      id: 'taxfin',
      label: '(−) Financieros netos e impuestos est.',
      base: simulation.baseTaxes + simulation.baseFinancial - simulation.baseOtherIncome,
      sim: simulation.simTaxes + simulation.baseFinancial - simulation.baseOtherIncome,
      kind: 'normal' as const,
      inverseGood: true,
    },
    {
      id: 'net',
      label: '(=) Utilidad Neta',
      base: simulation.baseNetIncome,
      sim: simulation.simNetIncome,
      kind: 'subtotal' as const,
      inverseGood: false,
    },
    {
      id: 'holdback',
      label: '(−) Venta pendiente de cobro (CxC)',
      base: 0,
      sim: simulation.simCollectionHoldback,
      kind: 'normal' as const,
      inverseGood: true,
    },
    {
      id: 'ocf',
      label: '(=) Flujo de Caja Operativo Proyectado',
      base: simulation.baseOperatingCashFlow,
      sim: simulation.simOperatingCashFlow,
      kind: 'final' as const,
      inverseGood: false,
    },
  ]

  const handleExportSimulationCsv = () => {
    const todayIso = new Date().toISOString().slice(0, 10)
    const activePreset = SIMULATOR_PRESETS.find(
      (preset) =>
        preset.salesVolumeDeltaPct === salesVolumeDeltaPct &&
        preset.variableCogsDeltaPct === variableCogsDeltaPct &&
        opexDeltaPct === preset.opexDeltaPct &&
        cashCollectionPct === preset.cashCollectionPct
    )
    const scenarioName = activePreset ? activePreset.label : 'Personalizado'
    const roundAmount = (n: number) => Number(n.toFixed(2))

    const csvRows: Array<Array<string | number>> = [
      ['Simulador de Gastos y Flujo de Caja Operativo', '', '', '', ''],
      ['Fecha de exportación', todayIso, 'Moneda de reporte', reportingCurrency, ''],
      ['Escenario', scenarioName, '', '', ''],
      ['', '', '', '', ''],
      ['PARÁMETROS DE SIMULACIÓN', 'VALOR ACTUAL', 'DETALLE', '', ''],
      ['Volumen de ventas (%)', formatDeltaPct(salesVolumeDeltaPct), `Base ${roundAmount(simulation.baseRevenue)} -> Proy. ${roundAmount(simulation.simRevenue)}`, '', ''],
      ['Costo de ventas variable (%)', formatDeltaPct(variableCogsDeltaPct), `Ratio COGS sobre ventas: ${simulation.simCogsRatioPct.toFixed(1)}% (Base: ${simulation.baseCogsRatioPct.toFixed(1)}%)`, '', ''],
      ['Gastos operativos OpEx (%)', formatDeltaPct(opexDeltaPct), `Base ${roundAmount(simulation.baseOpex)} -> Proy. ${roundAmount(simulation.simOpex)}`, '', ''],
      ['Cobranza en efectivo (%)', `${cashCollectionPct}%`, `Cobro efectivo ${roundAmount(simulation.simCollectedCash)} / CxC retenida ${roundAmount(simulation.simCollectionHoldback)}`, '', ''],
      ['', '', '', '', ''],
      ['PUENTE DE ESTADO DE RESULTADOS Y FLUJO DE CAJA', `BASE (${reportingCurrency})`, `SIMULADO (${reportingCurrency})`, `VARIACIÓN (${reportingCurrency})`, 'ESTADO'],
      ...pnlComparisonRows.map((row) => {
        const diff = row.sim - row.base
        const isFavorable = row.inverseGood ? diff <= 0 : diff >= 0
        return [
          row.label,
          roundAmount(row.base),
          roundAmount(row.sim),
          roundAmount(diff),
          Math.abs(diff) < 0.01 ? 'Sin cambio' : isFavorable ? 'Favorable' : 'Desfavorable',
        ]
      }),
      ['Caja actual disponible', roundAmount(totalCash), roundAmount(totalCash), 0, 'Referencia'],
      [
        'Caja proyectada al cierre (Caja + FCO)',
        roundAmount(totalCash + simulation.baseOperatingCashFlow),
        roundAmount(simulation.projectedClosingCash),
        roundAmount(simulation.ocfDelta),
        simulation.ocfDelta >= 0 ? 'Favorable' : 'Desfavorable',
      ],
      ['Punto de equilibrio operativo', roundAmount(baselinePnl.breakEvenSales), roundAmount(simulation.simBreakEvenSales), roundAmount(simulation.simBreakEvenSales - baselinePnl.breakEvenSales), 'Referencia'],
      ['', '', '', '', ''],
      ['MÁRGENES DEL ESTADO DE RESULTADOS', 'MARGEN BASE (%)', 'MARGEN SIMULADO (%)', 'VARIACIÓN (PTS)', `IMPORTE SIMULADO (${reportingCurrency})`],
      ...marginRows.map((m) => [
        m.label,
        `${m.basePct.toFixed(2)}%`,
        `${m.simPct.toFixed(2)}%`,
        formatPtsDelta(m.simPct - m.basePct),
        roundAmount(m.simAmount),
      ]),
    ]

    const csvContent = csvRows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `proyeccion_flujo_caja_${reportingCurrency.toLowerCase()}_${todayIso}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success(`Proyección de flujo de caja exportada en ${reportingCurrency}.`, 'Exportación CSV')
  }

  return (
    <div className="operations-overview-container">
      {/* KPI Top Cards */}
      <div className="ops-kpi-grid">
        <article className="ops-kpi-card highlight">
          <div className="ops-kpi-top">
            <span>LIQUIDEZ / DISPONIBLE</span>
            <span className="ops-kpi-icon icon-green">
              <Landmark size={16} />
            </span>
          </div>
          <div className="ops-kpi-val">{money(totalCash)}</div>
          <div className="ops-kpi-foot">
            <span className="trend trend-up">
              <ShieldCheck size={13} /> {bankAccounts.length} cuentas
            </span>
            <small>en tesorería activa</small>
          </div>
        </article>

        <article className="ops-kpi-card">
          <div className="ops-kpi-top">
            <span>CUENTAS POR COBRAR (CXC)</span>
            <span className="ops-kpi-icon icon-blue">
              <ReceiptText size={16} />
            </span>
          </div>
          <div className="ops-kpi-val text-positive">{money(totalReceivable)}</div>
          <div className="ops-kpi-foot">
            <span className="trend trend-neutral">
              {receivables.filter((r) => r.balance > 0).length} facturas
            </span>
            <small>pendientes de cobro</small>
          </div>
        </article>

        <article className="ops-kpi-card">
          <div className="ops-kpi-top">
            <span>CUENTAS POR PAGAR (CXP)</span>
            <span className="ops-kpi-icon icon-amber">
              <Wallet size={16} />
            </span>
          </div>
          <div className="ops-kpi-val text-negative">{money(totalPayable)}</div>
          <div className="ops-kpi-foot">
            <span className="trend trend-down">
              {payables.filter((p) => p.balance > 0).length} pasivos
            </span>
            <small>programados con proveedores</small>
          </div>
        </article>

        <article className="ops-kpi-card">
          <div className="ops-kpi-top">
            <span>CAPITAL DE TRABAJO NETO</span>
            <span className="ops-kpi-icon icon-green">
              <TrendingUp size={16} />
            </span>
          </div>
          <div className="ops-kpi-val">{money(workingCapital)}</div>
          <div className="ops-kpi-foot">
            <span className="trend trend-up">Posición sólida</span>
            <small>Caja + CXC - CXP</small>
          </div>
        </article>
      </div>

      {/* Middle Split: Bank Accounts & Liquidity vs Maturity Breakdown */}
      <div className="ops-overview-split">
        {/* Bank Accounts Panel */}
        <section className="ops-panel-card">
          <div className="ops-panel-header">
            <div>
              <div className="panel-kicker">TESORERÍA Y BANCOS</div>
              <h3>Cuentas Bancarias y Disponibilidad</h3>
            </div>
            <button
              className="text-link"
              onClick={() => onNavigateSection('Cobros')}
            >
              Ver cobranza <ArrowRight size={13} />
            </button>
          </div>

          <div className="warehouses-capacity-list">
            {bankAccounts.map((account) => {
              const convertedAccBal = convertAmount(account.balance, account.currency || 'MXN')
              const percentage = totalCash > 0 ? Math.round((convertedAccBal / totalCash) * 100) : 0

              return (
                <div key={account.id} className="warehouse-capacity-card">
                  <div className="wh-cap-top">
                    <div>
                      <div className="wh-code-badge">{account.type}</div>
                      <strong>{account.bankName}</strong>
                      <div className="wh-address-text">
                        <Building2 size={11} /> Cuenta: {account.accountNumber} · {countryProfile.bank.routingShortLabel}: {account.clabe}
                      </div>
                    </div>
                    <div className="wh-percent-badge">
                      <span>{money(convertedAccBal)}</span>
                      <small>{percentage}% del disponible</small>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="wh-progress-track">
                    <span
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: '#456a61',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick Actions */}
          <div className="ops-shortcuts-box">
            <span className="shortcuts-title">Acciones rápidas de tesorería</span>
            <div className="shortcuts-grid">
              <button
                className="shortcut-btn"
                onClick={() => onNavigateSection('Cobros')}
              >
                <DollarSign size={14} /> Registrar cobro
              </button>
              <button
                className="shortcut-btn"
                onClick={() => onNavigateSection('Pagos')}
              >
                <Wallet size={14} /> Pagar proveedor
              </button>
              <button
                className="shortcut-btn"
                onClick={() => (onNavigateExpenses ? onNavigateExpenses() : onNavigateSection('Pagos'))}
              >
                <CreditCard size={14} /> Registrar gasto
              </button>
            </div>
          </div>
        </section>

        {/* Projected Commitments and Maturity */}
        <section className="ops-panel-card">
          <div className="ops-panel-header">
            <div>
              <div className="panel-kicker">PROYECCIÓN DE FLUJO</div>
              <h3>Cobros vs. Pagos Próximos</h3>
            </div>
            <button
              className="text-link"
              onClick={() => onNavigateSection('Pagos')}
            >
              Ir a Pagos <ArrowRight size={13} />
            </button>
          </div>

          <div className="flow-projection-grid">
            <div className="flow-projection-card incoming">
              <div className="flow-proj-head">
                <ArrowDownLeft size={15} />
                <span>Cobros por ingresar (CXC)</span>
              </div>
              <div className="flow-proj-val text-positive">{money(totalReceivable)}</div>
              <small>Facturas pendientes emitidas a clientes</small>
            </div>

            <div className="flow-projection-card outgoing">
              <div className="flow-proj-head">
                <ArrowUpRight size={15} />
                <span>Compromisos de pago (CXP)</span>
              </div>
              <div className="flow-proj-val text-negative">{money(totalPayable)}</div>
              <small>Cuentas por liquidar a proveedores</small>
            </div>
          </div>

          <div className="flow-net-banner">
            <div className="flow-net-left">
              <strong>Balance neto proyectado</strong>
              <small>Diferencia entre cobros previstos y pasivos</small>
            </div>
            <div
              className={`flow-net-val ${
                totalReceivable - totalPayable >= 0 ? 'text-positive' : 'text-negative'
              }`}
            >
              {money(totalReceivable - totalPayable)} {reportingCurrency}
            </div>
          </div>

          {/* Overdue alert note if exists */}
          {receivables.some((r) => r.status === 'Vencida') && (
            <div className="reorder-item-row" style={{ marginTop: '8px' }}>
              <div className="reorder-item-info">
                <strong>Alerta de morosidad en cartera</strong>
                <small>Existen facturas vencidas que requieren gestión de cobranza inmediata.</small>
              </div>
              <button
                className="button button-secondary reorder-btn"
                onClick={() => onNavigateSection('Cobros')}
              >
                Gestionar
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Interactive Expense & Operating Cash Flow Simulator */}
      <section
        className="ops-panel-card fin-sim-card"
        aria-label="Simulador de gastos y flujo de caja operativo"
      >
        <div className="fin-sim-head">
          <div>
            <div className="panel-kicker">SIMULACIÓN FINANCIERA · ESTADO DE RESULTADOS</div>
            <h3>Simulador de Gastos y Flujo de Caja Operativo</h3>
            <div className="fin-sim-meta">
              <span>Escenario interactivo sin modificar registros contables</span>
              <span aria-hidden="true">·</span>
              <span>Moneda activa: {reportingCurrency}</span>
              <span aria-hidden="true">·</span>
              <span>Base P&amp;L consolidada</span>
            </div>
          </div>

          <div className="fin-sim-head-actions">
            <div className="fin-sim-presets" role="group" aria-label="Escenarios predefinidos">
              {SIMULATOR_PRESETS.map((preset) => {
                const isActive =
                  salesVolumeDeltaPct === preset.salesVolumeDeltaPct &&
                  variableCogsDeltaPct === preset.variableCogsDeltaPct &&
                  opexDeltaPct === preset.opexDeltaPct &&
                  cashCollectionPct === preset.cashCollectionPct

                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={`fin-sim-preset-btn ${isActive ? 'active' : ''}`}
                    onClick={() => applyPreset(preset)}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>

            {isSimulationModified && (
              <button
                type="button"
                className="fin-sim-reset-btn"
                onClick={resetSimulation}
              >
                <RotateCcw size={12} /> Restablecer
              </button>
            )}

            <button
              type="button"
              className="fin-sim-reset-btn"
              onClick={handleExportSimulationCsv}
              title="Descargar proyección de flujo de caja operativo y márgenes en CSV"
            >
              <Download size={12} /> Exportar CSV
            </button>

            {onNavigateIncomeStatement && (
              <button
                type="button"
                className="text-link"
                onClick={onNavigateIncomeStatement}
              >
                Estado de Resultados <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Top Grid: Sliders + Projected OCF & Income Statement Margins */}
        <div className="fin-sim-top-grid">
          <div className="fin-sim-controls-col">
            <div className="fin-sim-subhead">
              <h4>Variables de Operación y Gasto</h4>
              <span>Ajuste porcentual sobre base actual</span>
            </div>

            <div className="fin-sim-sliders-grid">
              <label className="fin-sim-control">
                <div className="fin-sim-control-top">
                  <span className="fin-sim-control-label">Volumen de ventas</span>
                  <span
                    className={`fin-sim-control-delta ${
                      salesVolumeDeltaPct > 0
                        ? 'is-positive'
                        : salesVolumeDeltaPct < 0
                          ? 'is-negative'
                          : ''
                    }`}
                  >
                    {formatDeltaPct(salesVolumeDeltaPct)}
                  </span>
                </div>
                <input
                  type="range"
                  min={-40}
                  max={60}
                  step={1}
                  aria-label="Volumen de ventas"
                  value={salesVolumeDeltaPct}
                  onChange={(e) => setSalesVolumeDeltaPct(Number(e.target.value))}
                />
                <div className="fin-sim-control-foot">
                  <span>Base: {money(simulation.baseRevenue)}</span>
                  <strong>Proy.: {money(simulation.simRevenue)}</strong>
                </div>
              </label>

              <label className="fin-sim-control">
                <div className="fin-sim-control-top">
                  <span className="fin-sim-control-label">Costo de ventas variable</span>
                  <span
                    className={`fin-sim-control-delta ${
                      variableCogsDeltaPct < 0
                        ? 'is-positive'
                        : variableCogsDeltaPct > 0
                          ? 'is-negative'
                          : ''
                    }`}
                  >
                    {formatDeltaPct(variableCogsDeltaPct)}
                  </span>
                </div>
                <input
                  type="range"
                  min={-30}
                  max={30}
                  step={1}
                  aria-label="Costo de ventas variable"
                  value={variableCogsDeltaPct}
                  onChange={(e) => setVariableCogsDeltaPct(Number(e.target.value))}
                />
                <div className="fin-sim-control-foot">
                  <span>Ratio COGS: {simulation.simCogsRatioPct.toFixed(1)}%</span>
                  <strong>{money(simulation.simCogs)}</strong>
                </div>
              </label>

              <label className="fin-sim-control">
                <div className="fin-sim-control-top">
                  <span className="fin-sim-control-label">Gastos operativos (OpEx)</span>
                  <span
                    className={`fin-sim-control-delta ${
                      opexDeltaPct < 0
                        ? 'is-positive'
                        : opexDeltaPct > 0
                          ? 'is-negative'
                          : ''
                    }`}
                  >
                    {formatDeltaPct(opexDeltaPct)}
                  </span>
                </div>
                <input
                  type="range"
                  min={-30}
                  max={40}
                  step={1}
                  aria-label="Gastos operativos (OpEx)"
                  value={opexDeltaPct}
                  onChange={(e) => setOpexDeltaPct(Number(e.target.value))}
                />
                <div className="fin-sim-control-foot">
                  <span>Base: {money(simulation.baseOpex)}</span>
                  <strong>Proy.: {money(simulation.simOpex)}</strong>
                </div>
              </label>

              <label className="fin-sim-control">
                <div className="fin-sim-control-top">
                  <span className="fin-sim-control-label">Cobranza en efectivo</span>
                  <span
                    className={`fin-sim-control-delta ${
                      cashCollectionPct < 90 ? 'is-negative' : ''
                    }`}
                  >
                    {cashCollectionPct}%
                  </span>
                </div>
                <input
                  type="range"
                  min={60}
                  max={100}
                  step={1}
                  aria-label="Porcentaje de cobranza en efectivo"
                  value={cashCollectionPct}
                  onChange={(e) => setCashCollectionPct(Number(e.target.value))}
                />
                <div className="fin-sim-control-foot">
                  <span>Cobro: {money(simulation.simCollectedCash)}</span>
                  <strong>En CxC: {money(simulation.simCollectionHoldback)}</strong>
                </div>
              </label>
            </div>

            <div className={`fin-sim-status-note is-${simulation.statusTone}`}>
              {simulation.statusTone === 'healthy' ? (
                <CheckCircle2 size={15} />
              ) : (
                <AlertTriangle size={15} />
              )}
              <span>{simulation.statusMessage}</span>
            </div>
          </div>

          <div className="fin-sim-summary-col">
            <div className="fin-sim-ocf-strip">
              <div className="fin-sim-ocf-metric">
                <span>FLUJO DE CAJA OPERATIVO</span>
                <strong
                  className={
                    simulation.simOperatingCashFlow >= 0 ? 'text-positive' : 'text-negative'
                  }
                >
                  {money(simulation.simOperatingCashFlow)}
                </strong>
                <small
                  className={
                    simulation.ocfDelta > 0
                      ? 'text-positive'
                      : simulation.ocfDelta < 0
                        ? 'text-negative'
                        : ''
                  }
                >
                  {simulation.ocfDelta >= 0 ? (
                    <ArrowUpRight size={12} />
                  ) : (
                    <ArrowDownRight size={12} />
                  )}
                  {simulation.ocfDelta >= 0 ? '+' : ''}
                  {money(simulation.ocfDelta)} ({simulation.ocfDeltaPct >= 0 ? '+' : ''}
                  {simulation.ocfDeltaPct.toFixed(1)}%)
                </small>
              </div>

              <div className="fin-sim-ocf-metric">
                <span>CAJA AL CIERRE PROY.</span>
                <strong>{money(simulation.projectedClosingCash)}</strong>
                <small>Caja actual {money(totalCash)} + FCO</small>
              </div>

              <div className="fin-sim-ocf-metric">
                <span>EQUILIBRIO OPERATIVO</span>
                <strong>{money(simulation.simBreakEvenSales)}</strong>
                <small>
                  {simulation.simRevenue >= simulation.simBreakEvenSales &&
                  simulation.simBreakEvenSales > 0
                    ? 'Superado por ventas proy.'
                    : 'Debajo de equilibrio'}
                </small>
              </div>
            </div>

            <div className="fin-sim-margins-box">
              <div className="fin-sim-subhead">
                <h4>Impacto en Márgenes del Estado de Resultados</h4>
                <span>Base → Proyectado</span>
              </div>

              <div className="fin-sim-margins-list">
                {marginRows.map((m) => {
                  const deltaPts = m.simPct - m.basePct
                  const fillWidth = Math.max(0, Math.min(100, m.simPct))
                  const basePinLeft = Math.max(0, Math.min(99, m.basePct))
                  const barColor =
                    m.simPct < 0
                      ? '#b84232'
                      : deltaPts < -0.5
                        ? '#c77d24'
                        : '#3c7d5c'

                  return (
                    <div key={m.id} className="fin-sim-margin-row">
                      <div className="fin-sim-margin-row-head">
                        <span className="fin-sim-margin-name">{m.label}</span>
                        <span className="fin-sim-margin-vals">
                          <span className="fin-sim-margin-base">
                            {m.basePct.toFixed(1)}% →
                          </span>
                          <strong className="fin-sim-margin-curr">
                            {m.simPct.toFixed(1)}%
                          </strong>
                          <span
                            className={`fin-sim-margin-shift ${
                              deltaPts > 0.05
                                ? 'text-positive'
                                : deltaPts < -0.05
                                  ? 'text-negative'
                                  : ''
                            }`}
                          >
                            {deltaPts > 0.05 ? (
                              <ArrowUpRight size={11} />
                            ) : deltaPts < -0.05 ? (
                              <ArrowDownRight size={11} />
                            ) : null}
                            {formatPtsDelta(deltaPts)}
                          </span>
                        </span>
                      </div>

                      <div className="fin-sim-margin-track">
                        <span
                          className="fin-sim-margin-fill"
                          style={{
                            width: `${fillWidth}%`,
                            backgroundColor: barColor,
                          }}
                        />
                        <span
                          className="fin-sim-margin-baseline-pin"
                          style={{ left: `${basePinLeft}%` }}
                          title={`Margen base: ${m.basePct.toFixed(1)}%`}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Grid: Compact P&L + OCF Bridge Table vs Comparative Chart */}
        <div className="fin-sim-bottom-grid">
          <div className="fin-sim-table-box">
            <div className="fin-sim-subhead">
              <h4>Puente de Estado de Resultados y Flujo Operativo</h4>
              <span>Importes en {reportingCurrency}</span>
            </div>

            <div className="table-wrap">
              <table className="fin-sim-table">
                <thead>
                  <tr>
                    <th>CONCEPTO</th>
                    <th className="is-num">BASE</th>
                    <th className="is-num">SIMULADO</th>
                    <th className="is-num">VARIACIÓN</th>
                  </tr>
                </thead>
                <tbody>
                  {pnlComparisonRows.map((row) => {
                    const diff = row.sim - row.base
                    const isFavorable = row.inverseGood ? diff <= 0 : diff >= 0
                    const rowClass =
                      row.kind === 'final'
                        ? 'is-final'
                        : row.kind === 'subtotal'
                          ? 'is-subtotal'
                          : ''

                    return (
                      <tr key={row.id} className={rowClass}>
                        <td>{row.label}</td>
                        <td className="is-num">{money(row.base)}</td>
                        <td className="is-num">{money(row.sim)}</td>
                        <td
                          className={`is-num ${
                            Math.abs(diff) < 1
                              ? ''
                              : isFavorable
                                ? 'text-positive'
                                : 'text-negative'
                          }`}
                        >
                          {diff > 0 ? `+${money(diff)}` : money(diff)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="fin-sim-chart-box">
            <div className="fin-sim-subhead">
              <h4>Comparativa Base vs. Escenario Simulado</h4>
              <span>Ingresos, costos y flujo ({reportingCurrency})</span>
            </div>

            <div className="fin-sim-chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={simulation.chartData}
                  margin={{ top: 10, right: 12, left: 6, bottom: 2 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(130, 145, 136, 0.22)" />
                  <XAxis
                    dataKey="concepto"
                    tick={{ fontSize: 11, fill: '#6e7e74' }}
                    axisLine={{ stroke: 'rgba(130, 145, 136, 0.35)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#6e7e74' }}
                    tickFormatter={(v: number) => formatCompactAxis(v, currencySymbol)}
                    axisLine={false}
                    tickLine={false}
                    width={58}
                  />
                  <ReferenceLine y={0} stroke="rgba(130, 145, 136, 0.5)" />
                  <Tooltip
                    formatter={(value) => money(Number(value ?? 0))}
                    contentStyle={{
                      fontSize: '11px',
                      borderRadius: '8px',
                      border: '1px solid #d9e2da',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar
                    dataKey="Base"
                    name="Base actual"
                    fill="#9db4a9"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    dataKey="Simulado"
                    name="Proyección simulada"
                    fill="#456a61"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Activity Section: Recent Payments & Transactions */}
      <section className="ops-panel-card" style={{ marginTop: '14px' }}>
        <div className="ops-panel-header">
          <div>
            <div className="panel-kicker">MOVIMIENTOS DE TESORERÍA</div>
            <h3>Últimas Transacciones y Dispersiones</h3>
          </div>
          <button
            className="text-link"
            onClick={() => onNavigateSection('Cobros')}
          >
            Ver cuentas bancarias <ArrowRight size={13} />
          </button>
        </div>

        <div className="table-wrap ops-table-wrap">
          <table className="data-table ops-data-table">
            <thead>
              <tr>
                <th>FOLIO</th>
                <th>FECHA</th>
                <th>TIPO DE MOVIMIENTO</th>
                <th>ENTIDAD / CONCEPTO</th>
                <th>CUENTA BANCARIA</th>
                <th>MÉTODO DE PAGO</th>
                <th>REFERENCIA</th>
                <th style={{ textAlign: 'right' }}>IMPORTE</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 6).map((txn) => {
                const isIncome = txn.type === 'Cobro de cliente'
                return (
                  <tr key={txn.id}>
                    <td>
                      <strong>{txn.folio}</strong>
                    </td>
                    <td className="date-cell">
                      <div className="date-icon-cell">
                        <Clock size={12} /> {txn.date}
                      </div>
                    </td>
                    <td>{getTransactionTypeBadge(txn.type)}</td>
                    <td>
                      <strong style={{ fontSize: '9.5px', color: '#2a372f' }}>
                        {txn.entityName}
                      </strong>
                    </td>
                    <td>
                      <span className="warehouse-name-cell">
                        <Building2 size={12} /> {txn.account}
                      </span>
                    </td>
                    <td>
                      <span className="payment-method-tag">{txn.method}</span>
                    </td>
                    <td>
                      <span className="ref-tag">{txn.reference}</span>
                    </td>
                    <td style={{ textAlign: 'right' }} className="money-cell">
                      <strong className={isIncome ? 'text-positive' : 'text-negative'}>
                        {isIncome
                          ? `+${money(convertAmount(txn.amount, 'MXN'))}`
                          : `-${money(convertAmount(txn.amount, 'MXN'))}`}
                      </strong>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
