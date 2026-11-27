import { useState, useMemo, useRef, useEffect } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Cell,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import {
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Scale,
  Percent,
  LineChart as LineChartIcon,
  Palette,
  RotateCcw,
  Check,
  Pipette,
} from 'lucide-react'
import type { SalesOrder } from '../data/sales'
import type { InvoiceReceivable, ExpenseRecord } from '../data/finance'
import { useI18n } from '../i18n/I18nContext'
import { getCurrencySymbol } from '../services/currencyService'

interface RevenueTargetChartProps {
  orders: SalesOrder[]
  receivables: InvoiceReceivable[]
  expenses: ExpenseRecord[]
  allowSalesSeries?: boolean
  allowFinanceSeries?: boolean
}

type ChartViewMode = 'comparativo' | 'tendencia' | 'flujo-caja' | 'cumplimiento'

const STORAGE_KEY = 'aes_nexus_chart_colors'
const DEFAULT_VENTAS_COLOR = '#1d7a65'
const DEFAULT_OBJETIVO_COLOR = '#d97706'

const VENTAS_COLOR_PRESETS = [
  { label: 'Esmeralda', hex: '#1d7a65' },
  { label: 'Azul Cobalto', hex: '#2563eb' },
  { label: 'Índigo', hex: '#4f46e5' },
  { label: 'Turquesa', hex: '#0d9488' },
  { label: 'Bosque', hex: '#456a61' },
  { label: 'Violeta', hex: '#7c3aed' },
] as const

const OBJETIVO_COLOR_PRESETS = [
  { label: 'Ámbar', hex: '#d97706' },
  { label: 'Terracota', hex: '#c85a32' },
  { label: 'Pizarra', hex: '#64748b' },
  { label: 'Azul Cielo', hex: '#0284c7' },
  { label: 'Coral', hex: '#e11d48' },
  { label: 'Salvia', hex: '#94a3b8' },
] as const

const COLOR_COMBO_PRESETS = [
  { name: 'Ejecutivo', ventas: '#1d7a65', objetivo: '#d97706' },
  { name: 'Corporativo', ventas: '#2563eb', objetivo: '#64748b' },
  { name: 'Contraste', ventas: '#4f46e5', objetivo: '#e11d48' },
  { name: 'Original', ventas: '#456a61', objetivo: '#94a3b8' },
] as const

const isValidHex = (color: unknown): color is string =>
  typeof color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(color)

const loadSavedColors = (): { ventasColor: string; objetivoColor: string } => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        ventasColor: isValidHex(parsed?.ventasColor) ? parsed.ventasColor : DEFAULT_VENTAS_COLOR,
        objetivoColor: isValidHex(parsed?.objetivoColor) ? parsed.objetivoColor : DEFAULT_OBJETIVO_COLOR,
      }
    }
  } catch {
    // ignore storage errors
  }
  return {
    ventasColor: DEFAULT_VENTAS_COLOR,
    objetivoColor: DEFAULT_OBJETIVO_COLOR,
  }
}

const formatCompactWithSymbol = (val: number, symbol: string) => {
  const abs = Math.abs(val)
  const sign = val < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${sign}${symbol}${(abs / 1_000).toFixed(0)}k`
  return `${sign}${symbol}${Math.round(abs)}`
}

const formatSignedWith = (val: number, fmt: (v: number) => string) => {
  if (val > 0) return `+${fmt(val)}`
  if (val < 0) return `-${fmt(Math.abs(val))}`
  return fmt(0)
}

interface MonthlyChartPoint {
  month: string
  monthFull: string
  prevMonth: string | null
  ventas: number
  objetivo: number
  cobros: number
  gastos: number
  cumplimiento: number
  netFlow: number
  prevVentas: number | null
  prevObjetivo: number | null
  prevCobros: number | null
  prevGastos: number | null
  prevCumplimiento: number | null
  ventasDelta: number | null
  objetivoDelta: number | null
  cobrosDelta: number | null
  gastosDelta: number | null
  netFlowDelta: number | null
  ventasMoM: number | null
  objetivoMoM: number | null
  cobrosMoM: number | null
  gastosMoM: number | null
  cumplimientoMoM: number | null
  netFlowMoM: number | null
  targetGap: number
  targetGapPct: number
}

interface TrendPillProps {
  pct: number | null | undefined
  invertSentiment?: boolean
  suffix?: string
}

function TooltipTrendIndicator({ pct, invertSentiment = false, suffix = '%' }: TrendPillProps) {
  if (pct === null || pct === undefined) {
    return (
      <span className="exec-tooltip-trend-pill neutral" title="Mes base del periodo">
        <Minus size={11} />
        <span>Base</span>
      </span>
    )
  }
  const isZero = Math.abs(pct) < 0.05
  const isGrowth = pct > 0
  const isPositiveTone = isZero ? null : invertSentiment ? pct < 0 : pct > 0
  const Icon = isZero ? Minus : isGrowth ? ArrowUpRight : ArrowDownRight
  const sign = pct > 0 ? '+' : ''
  const toneClass = isPositiveTone === null ? 'neutral' : isPositiveTone ? 'up' : 'down'

  return (
    <span className={`exec-tooltip-trend-pill ${toneClass}`} title="Variación respecto al mes anterior">
      <Icon size={12} strokeWidth={2.4} />
      <span>
        {sign}
        {pct.toFixed(1)}
        {suffix}
      </span>
    </span>
  )
}

interface CustomRevenueTooltipProps {
  active?: boolean
  payload?: Array<{ payload: MonthlyChartPoint }>
  viewMode: ChartViewMode
  ventasColor: string
  objetivoColor: string
}

function CustomRevenueTooltip({
  active,
  payload,
  viewMode,
  ventasColor,
  objetivoColor,
}: CustomRevenueTooltipProps) {
  const { formatCurrency, reportingCurrency } = useI18n()
  const money = (val: number) => formatCurrency(val, reportingCurrency, 0)
  const formatSignedMoney = (val: number) => formatSignedWith(val, money)
  if (!active || !payload || !payload.length) return null
  const data = payload[0].payload
  const isNov = data.month === 'Nov'

  if (viewMode === 'flujo-caja') {
    const netPositive = data.netFlow >= 0
    return (
      <div className="exec-chart-tooltip exec-chart-tooltip--enhanced">
        <div className="exec-tooltip-head">
          <strong>
            {data.monthFull}
            {isNov ? ' · En curso' : ''}
          </strong>
          <span className="exec-tooltip-period-ref">
            {data.prevMonth ? `vs. ${data.prevMonth}` : 'Mes base'}
          </span>
        </div>

        <div className="exec-tooltip-metric-block">
          <div className="exec-tooltip-row">
            <span className="exec-tooltip-lbl-dot">
              <i style={{ backgroundColor: ventasColor }} />
              Cobros recibidos
            </span>
            <span className="exec-tooltip-val-trend">
              <strong style={{ color: ventasColor }}>{money(data.cobros)}</strong>
              <TooltipTrendIndicator pct={data.cobrosMoM} />
            </span>
          </div>
          {data.prevCobros !== null && data.cobrosDelta !== null && (
            <div className="exec-tooltip-submeta">
              <span>Anterior ({data.prevMonth}): {money(data.prevCobros)}</span>
              <span>{formatSignedMoney(data.cobrosDelta)}</span>
            </div>
          )}
        </div>

        <div className="exec-tooltip-metric-block">
          <div className="exec-tooltip-row">
            <span className="exec-tooltip-lbl-dot">
              <i style={{ backgroundColor: objetivoColor }} />
              Gastos operativos
            </span>
            <span className="exec-tooltip-val-trend">
              <strong style={{ color: objetivoColor }}>{money(data.gastos)}</strong>
              <TooltipTrendIndicator pct={data.gastosMoM} invertSentiment />
            </span>
          </div>
          {data.prevGastos !== null && data.gastosDelta !== null && (
            <div className="exec-tooltip-submeta">
              <span>Anterior ({data.prevMonth}): {money(data.prevGastos)}</span>
              <span>{formatSignedMoney(data.gastosDelta)}</span>
            </div>
          )}
        </div>

        <div className="exec-tooltip-divider" />

        <div className="exec-tooltip-row">
          <span>Flujo neto del mes</span>
          <span className="exec-tooltip-val-trend">
            <strong style={{ color: netPositive ? ventasColor : objetivoColor }}>
              {money(data.netFlow)}
            </strong>
            <TooltipTrendIndicator pct={data.netFlowMoM} />
          </span>
        </div>
      </div>
    )
  }

  const reached = data.targetGap >= 0
  const TargetGapIcon = reached ? ArrowUpRight : ArrowDownRight

  return (
    <div className="exec-chart-tooltip exec-chart-tooltip--enhanced">
      <div className="exec-tooltip-head">
        <strong>
          {data.monthFull}
          {isNov ? ' · En curso' : ''}
        </strong>
        <span className="exec-tooltip-period-ref">
          {data.prevMonth ? `vs. ${data.prevMonth}` : 'Mes base'}
        </span>
      </div>

      {viewMode === 'cumplimiento' && (
        <div className="exec-tooltip-metric-block">
          <div className="exec-tooltip-row">
            <span>Cumplimiento de meta</span>
            <span className="exec-tooltip-val-trend">
              <strong style={{ color: reached ? ventasColor : objetivoColor }}>
                {data.cumplimiento.toFixed(1)}%
              </strong>
              <TooltipTrendIndicator pct={data.cumplimientoMoM} suffix=" pts" />
            </span>
          </div>
          {data.prevCumplimiento !== null && (
            <div className="exec-tooltip-submeta">
              <span>Anterior ({data.prevMonth}): {data.prevCumplimiento.toFixed(1)}%</span>
              <span>Meta: 100.0%</span>
            </div>
          )}
        </div>
      )}

      <div className="exec-tooltip-metric-block">
        <div className="exec-tooltip-row">
          <span className="exec-tooltip-lbl-dot">
            <i style={{ backgroundColor: ventasColor }} />
            Ingresos / Ventas
          </span>
          <span className="exec-tooltip-val-trend">
            <strong style={{ color: ventasColor }}>{money(data.ventas)}</strong>
            <TooltipTrendIndicator pct={data.ventasMoM} />
          </span>
        </div>
        {data.prevVentas !== null && data.ventasDelta !== null && (
          <div className="exec-tooltip-submeta">
            <span>Anterior ({data.prevMonth}): {money(data.prevVentas)}</span>
            <span>{formatSignedMoney(data.ventasDelta)}</span>
          </div>
        )}
      </div>

      <div className="exec-tooltip-metric-block">
        <div className="exec-tooltip-row">
          <span className="exec-tooltip-lbl-dot">
            <i style={{ backgroundColor: objetivoColor }} />
            Objetivo mensual
          </span>
          <span className="exec-tooltip-val-trend">
            <strong style={{ color: objetivoColor }}>{money(data.objetivo)}</strong>
            <TooltipTrendIndicator pct={data.objetivoMoM} />
          </span>
        </div>
        {data.prevObjetivo !== null && data.objetivoDelta !== null && (
          <div className="exec-tooltip-submeta">
            <span>Anterior ({data.prevMonth}): {money(data.prevObjetivo)}</span>
            <span>{formatSignedMoney(data.objetivoDelta)}</span>
          </div>
        )}
      </div>

      <div className="exec-tooltip-divider" />

      <div className="exec-tooltip-row">
        <span>Brecha vs. objetivo</span>
        <span className={`exec-tooltip-gap ${reached ? 'up' : 'down'}`}>
          <TargetGapIcon size={12} strokeWidth={2.4} />
          <strong>
            {formatSignedMoney(data.targetGap)} ({data.targetGapPct > 0 ? '+' : ''}
            {data.targetGapPct.toFixed(1)}%)
          </strong>
        </span>
      </div>

      {viewMode !== 'cumplimiento' && (
        <div className="exec-tooltip-attainment-line">
          <span>Cumplimiento mensual:</span>
          <strong style={{ color: reached ? ventasColor : objetivoColor }}>
            {data.cumplimiento.toFixed(1)}% · {reached ? 'Meta superada' : 'Bajo meta'}
          </strong>
        </div>
      )}
    </div>
  )
}

export function RevenueTargetChart({
  orders,
  receivables,
  expenses,
  allowSalesSeries = true,
  allowFinanceSeries = true,
}: RevenueTargetChartProps) {
  const { reportingCurrency, convertAmount, formatCurrency } = useI18n()
  const money = (val: number) => formatCurrency(val, reportingCurrency, 0)
  const currencySym = getCurrencySymbol(reportingCurrency)
  const formatCompactCurrency = (val: number) => formatCompactWithSymbol(val, currencySym)
  const [requestedViewMode, setChartViewMode] = useState<ChartViewMode>(() =>
    !allowSalesSeries && allowFinanceSeries ? 'flujo-caja' : 'comparativo'
  )
  const [chartColors, setChartColors] = useState(loadSavedColors)
  const [colorMenuOpen, setColorMenuOpen] = useState(false)
  const colorPickerRef = useRef<HTMLDivElement>(null)

  const viewMode: ChartViewMode = useMemo(() => {
    if (!allowSalesSeries && allowFinanceSeries) return 'flujo-caja'
    if (allowSalesSeries && !allowFinanceSeries && requestedViewMode === 'flujo-caja') {
      return 'comparativo'
    }
    return requestedViewMode
  }, [allowSalesSeries, allowFinanceSeries, requestedViewMode])

  const financeOnly = !allowSalesSeries && allowFinanceSeries

  const { ventasColor, objetivoColor } = chartColors

  const updateColors = (next: Partial<{ ventasColor: string; objetivoColor: string }>) => {
    setChartColors((prev) => {
      const updated = { ...prev, ...next }
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch {
        // ignore storage errors
      }
      return updated
    })
  }

  const resetColors = () => {
    updateColors({
      ventasColor: DEFAULT_VENTAS_COLOR,
      objetivoColor: DEFAULT_OBJETIVO_COLOR,
    })
  }

  const isDefaultColors =
    ventasColor.toLowerCase() === DEFAULT_VENTAS_COLOR &&
    objetivoColor.toLowerCase() === DEFAULT_OBJETIVO_COLOR

  useEffect(() => {
    if (!colorMenuOpen) return
    const handlePointerDown = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setColorMenuOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setColorMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [colorMenuOpen])

  // Real-time calculation for current period (Nov) converted to reportingCurrency
  const currentNovSales = useMemo(() => {
    const ordersTotal = orders.reduce(
      (sum, o) => sum + convertAmount(o.total || 0, o.currency || 'MXN'),
      0
    )
    return Math.max(ordersTotal, convertAmount(260000, 'MXN'))
  }, [orders, convertAmount])

  const currentNovCobros = useMemo(() => {
    const paidReceivables = receivables
      .filter((r) => r.status === 'Pagada' || r.paidAmount > 0)
      .reduce((sum, r) => sum + convertAmount(r.paidAmount || 0, r.currency || 'MXN'), 0)
    return Math.max(paidReceivables, convertAmount(245000, 'MXN'))
  }, [receivables, convertAmount])

  const currentNovGastos = useMemo(() => {
    const expTotal = expenses.reduce((sum, e) => sum + convertAmount(e.total || 0, 'MXN'), 0)
    return Math.max(expTotal, convertAmount(118000, 'MXN'))
  }, [expenses, convertAmount])

  // Monthly dataset for the last 6 months with MoM trend percentages
  const monthlyData: MonthlyChartPoint[] = useMemo(() => {
    const novTarget = convertAmount(240000, 'MXN')
    const base = [
      {
        month: 'Jun',
        monthFull: 'Junio 2026',
        ventas: convertAmount(145000, 'MXN'),
        objetivo: convertAmount(160000, 'MXN'),
        cobros: convertAmount(138000, 'MXN'),
        gastos: convertAmount(82000, 'MXN'),
        cumplimiento: 90.6,
      },
      {
        month: 'Jul',
        monthFull: 'Julio 2026',
        ventas: convertAmount(182000, 'MXN'),
        objetivo: convertAmount(175000, 'MXN'),
        cobros: convertAmount(170000, 'MXN'),
        gastos: convertAmount(91000, 'MXN'),
        cumplimiento: 104.0,
      },
      {
        month: 'Ago',
        monthFull: 'Agosto 2026',
        ventas: convertAmount(168000, 'MXN'),
        objetivo: convertAmount(180000, 'MXN'),
        cobros: convertAmount(162000, 'MXN'),
        gastos: convertAmount(96000, 'MXN'),
        cumplimiento: 93.3,
      },
      {
        month: 'Sep',
        monthFull: 'Septiembre 2026',
        ventas: convertAmount(215000, 'MXN'),
        objetivo: convertAmount(200000, 'MXN'),
        cobros: convertAmount(204000, 'MXN'),
        gastos: convertAmount(104000, 'MXN'),
        cumplimiento: 107.5,
      },
      {
        month: 'Oct',
        monthFull: 'Octubre 2026',
        ventas: convertAmount(198000, 'MXN'),
        objetivo: convertAmount(210000, 'MXN'),
        cobros: convertAmount(195000, 'MXN'),
        gastos: convertAmount(98000, 'MXN'),
        cumplimiento: 94.3,
      },
      {
        month: 'Nov',
        monthFull: 'Noviembre 2026',
        ventas: currentNovSales,
        objetivo: novTarget,
        cobros: currentNovCobros,
        gastos: currentNovGastos,
        cumplimiento: novTarget > 0 ? Number(((currentNovSales / novTarget) * 100).toFixed(1)) : 0,
      },
    ]

    const calcMoM = (curr: number, prev: number) =>
      prev !== 0 ? Number((((curr - prev) / Math.abs(prev)) * 100).toFixed(1)) : 0

    return base.map((item, idx) => {
      const netFlow = item.cobros - item.gastos
      const targetGap = item.ventas - item.objetivo
      const targetGapPct =
        item.objetivo > 0 ? Number(((targetGap / item.objetivo) * 100).toFixed(1)) : 0

      if (idx === 0) {
        return {
          ...item,
          prevMonth: null,
          netFlow,
          prevVentas: null,
          prevObjetivo: null,
          prevCobros: null,
          prevGastos: null,
          prevCumplimiento: null,
          ventasDelta: null,
          objetivoDelta: null,
          cobrosDelta: null,
          gastosDelta: null,
          netFlowDelta: null,
          ventasMoM: null,
          objetivoMoM: null,
          cobrosMoM: null,
          gastosMoM: null,
          cumplimientoMoM: null,
          netFlowMoM: null,
          targetGap,
          targetGapPct,
        }
      }
      const prev = base[idx - 1]
      const prevNetFlow = prev.cobros - prev.gastos
      return {
        ...item,
        prevMonth: prev.month,
        netFlow,
        prevVentas: prev.ventas,
        prevObjetivo: prev.objetivo,
        prevCobros: prev.cobros,
        prevGastos: prev.gastos,
        prevCumplimiento: prev.cumplimiento,
        ventasDelta: item.ventas - prev.ventas,
        objetivoDelta: item.objetivo - prev.objetivo,
        cobrosDelta: item.cobros - prev.cobros,
        gastosDelta: item.gastos - prev.gastos,
        netFlowDelta: netFlow - prevNetFlow,
        ventasMoM: calcMoM(item.ventas, prev.ventas),
        objetivoMoM: calcMoM(item.objetivo, prev.objetivo),
        cobrosMoM: calcMoM(item.cobros, prev.cobros),
        gastosMoM: calcMoM(item.gastos, prev.gastos),
        cumplimientoMoM: Number((item.cumplimiento - prev.cumplimiento).toFixed(1)),
        netFlowMoM: calcMoM(netFlow, prevNetFlow),
        targetGap,
        targetGapPct,
      }
    })
  }, [currentNovSales, currentNovCobros, currentNovGastos])

  const latestMonthData = monthlyData[monthlyData.length - 1]

  const renderMoMBadge = (
    pct: number | null | undefined,
    invertSentiment = false,
    compact = false
  ) => {
    if (pct === null || pct === undefined) return null
    const isZero = Math.abs(pct) < 0.05
    const isGrowth = pct > 0
    const isPositiveTone = isZero ? null : invertSentiment ? pct < 0 : pct > 0
    const sign = pct > 0 ? '+' : ''
    const Icon = isZero ? Minus : isGrowth ? ArrowUpRight : ArrowDownRight
    const toneClass = isPositiveTone === null ? 'neutral' : isPositiveTone ? 'up' : 'down'
    return (
      <span
        className={`chart-mom-badge ${toneClass} ${compact ? 'compact' : ''}`}
        title="Variación respecto al mes anterior"
      >
        <Icon size={compact ? 10 : 12} />
        {sign}
        {pct.toFixed(1)}%
      </span>
    )
  }

  // Summary Metrics
  const totalVentas = useMemo(
    () => monthlyData.reduce((acc, d) => acc + d.ventas, 0),
    [monthlyData]
  )
  const totalObjetivo = useMemo(
    () => monthlyData.reduce((acc, d) => acc + d.objetivo, 0),
    [monthlyData]
  )
  const globalAttainment = useMemo(
    () => Number(((totalVentas / totalObjetivo) * 100).toFixed(1)),
    [totalVentas, totalObjetivo]
  )
  const totalCobros = useMemo(
    () => monthlyData.reduce((acc, d) => acc + d.cobros, 0),
    [monthlyData]
  )
  const totalGastos = useMemo(
    () => monthlyData.reduce((acc, d) => acc + d.gastos, 0),
    [monthlyData]
  )
  const totalNetFlow = totalCobros - totalGastos
  const bestMonth = useMemo(() => {
    return [...monthlyData].sort((a, b) => b.ventas - a.ventas)[0]
  }, [monthlyData])
  const bestCashMonth = useMemo(() => {
    return [...monthlyData].sort((a, b) => b.cobros - b.gastos - (a.cobros - a.gastos))[0]
  }, [monthlyData])

  const primarySeriesLabel =
    viewMode === 'flujo-caja'
      ? 'Cobros (Entradas)'
      : viewMode === 'cumplimiento'
      ? 'Meta alcanzada (≥ 100%)'
      : 'Ventas reales'

  const secondarySeriesLabel =
    viewMode === 'flujo-caja'
      ? 'Gastos (Salidas)'
      : viewMode === 'cumplimiento'
      ? 'Por debajo de meta (< 100%)'
      : 'Objetivo mensual'

  return (
    <article
      className="panel exec-chart-panel"
      aria-label={
        financeOnly ? 'Flujo de caja: cobros y gastos' : 'Historial de ventas y objetivos'
      }
    >
      {/* Top Header & View Controls */}
      <div className="exec-chart-top-bar">
        <div>
          <div className="panel-kicker">
            {financeOnly
              ? 'FLUJO DE CAJA · ÚLTIMOS 6 MESES'
              : 'HISTORIAL COMERCIAL · ÚLTIMOS 6 MESES'}
          </div>
          <h2>
            {financeOnly
              ? 'Cobros recibidos vs. gastos operativos'
              : 'Historial de ventas vs. objetivos mensuales'}
          </h2>
          <p className="panel-subtitle">
            {financeOnly
              ? 'Evolución mensual de entradas cobradas contra egresos y gastos registrados'
              : 'Gráfico comparativo de la facturación lograda contra la meta presupuestada de cada mes'}
          </p>
        </div>

        {/* View Switcher Tabs + Color Customizer */}
        <div className="exec-chart-controls">
          <div className="exec-chart-tabs" role="tablist" aria-label="Modo de gráfico">
            {allowSalesSeries && (
              <>
                <button
                  type="button"
                  className={`exec-chart-tab ${viewMode === 'comparativo' ? 'active' : ''}`}
                  onClick={() => setChartViewMode('comparativo')}
                  title="Gráfico de barras comparativo: Venta lograda vs. Objetivo mensual"
                >
                  <BarChart3 size={12} />
                  Barras comparativas
                </button>
                <button
                  type="button"
                  className={`exec-chart-tab ${viewMode === 'tendencia' ? 'active' : ''}`}
                  onClick={() => setChartViewMode('tendencia')}
                  title="Barras de ventas con línea de objetivo"
                >
                  <LineChartIcon size={12} />
                  Tendencia mixta
                </button>
                <button
                  type="button"
                  className={`exec-chart-tab ${viewMode === 'cumplimiento' ? 'active' : ''}`}
                  onClick={() => setChartViewMode('cumplimiento')}
                  title="Porcentaje de cumplimiento de la meta por mes"
                >
                  <Percent size={12} />
                  % Cumplimiento
                </button>
              </>
            )}
            {allowFinanceSeries && (
              <button
                type="button"
                className={`exec-chart-tab ${viewMode === 'flujo-caja' ? 'active' : ''}`}
                onClick={() => setChartViewMode('flujo-caja')}
                title="Cobros recibidos frente a gastos y egresos"
              >
                <Scale size={12} />
                Cobros vs. Gastos
              </button>
            )}
          </div>

          <div className="chart-color-picker-anchor" ref={colorPickerRef}>
            <button
              type="button"
              className={`chart-color-trigger ${colorMenuOpen ? 'active' : ''}`}
              onClick={() => setColorMenuOpen((prev) => !prev)}
              aria-expanded={colorMenuOpen}
              aria-label="Personalizar colores de la gráfica"
              title={`Personalizar colores de ${primarySeriesLabel} y ${secondarySeriesLabel}`}
            >
              <Palette size={12} />
              <span className="chart-color-dots-preview" aria-hidden="true">
                <i style={{ backgroundColor: ventasColor }} />
                <i style={{ backgroundColor: objetivoColor }} />
              </span>
              <span>Colores</span>
            </button>

            {colorMenuOpen && (
              <div
                className="chart-color-popover"
                role="dialog"
                aria-label="Selector de colores de gráfica"
              >
                <div className="chart-color-popover-head">
                  <strong>Colores de la gráfica</strong>
                  <button
                    type="button"
                    className="chart-color-reset-btn"
                    onClick={resetColors}
                    disabled={isDefaultColors}
                    title="Restablecer colores predeterminados"
                  >
                    <RotateCcw size={11} />
                    Restablecer
                  </button>
                </div>

                {/* Quick Combos */}
                <div className="chart-color-section">
                  <span className="chart-color-section-label">Combinaciones sugeridas</span>
                  <div className="chart-color-combos">
                    {COLOR_COMBO_PRESETS.map((combo) => {
                      const isActive =
                        combo.ventas.toLowerCase() === ventasColor.toLowerCase() &&
                        combo.objetivo.toLowerCase() === objetivoColor.toLowerCase()
                      return (
                        <button
                          key={combo.name}
                          type="button"
                          className={`chart-color-combo-btn ${isActive ? 'active' : ''}`}
                          onClick={() =>
                            updateColors({
                              ventasColor: combo.ventas,
                              objetivoColor: combo.objetivo,
                            })
                          }
                        >
                          <span className="combo-dots">
                            <i style={{ backgroundColor: combo.ventas }} />
                            <i style={{ backgroundColor: combo.objetivo }} />
                          </span>
                          <span>{combo.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Primary Series Color */}
                <div className="chart-color-section">
                  <div className="chart-color-row-head">
                    <span className="chart-color-series-title">
                      <i className="series-dot" style={{ backgroundColor: ventasColor }} />
                      {primarySeriesLabel}
                    </span>
                    <code>{ventasColor.toUpperCase()}</code>
                  </div>
                  <div className="chart-swatch-grid">
                    {VENTAS_COLOR_PRESETS.map((preset) => {
                      const selected = ventasColor.toLowerCase() === preset.hex.toLowerCase()
                      return (
                        <button
                          key={preset.hex}
                          type="button"
                          className={`chart-swatch-btn ${selected ? 'selected' : ''}`}
                          style={{ backgroundColor: preset.hex }}
                          onClick={() => updateColors({ ventasColor: preset.hex })}
                          title={`${preset.label} (${preset.hex})`}
                          aria-label={`${primarySeriesLabel}: ${preset.label}`}
                        >
                          {selected && <Check size={11} strokeWidth={3} />}
                        </button>
                      )
                    })}
                    <label
                      className="chart-swatch-custom"
                      title={`Elegir color personalizado para ${primarySeriesLabel}`}
                    >
                      <Pipette size={11} />
                      <input
                        type="color"
                        value={ventasColor}
                        onChange={(e) => updateColors({ ventasColor: e.target.value })}
                        aria-label={`Color personalizado para ${primarySeriesLabel}`}
                      />
                    </label>
                  </div>
                </div>

                {/* Secondary Series Color */}
                <div className="chart-color-section">
                  <div className="chart-color-row-head">
                    <span className="chart-color-series-title">
                      <i className="series-dot" style={{ backgroundColor: objetivoColor }} />
                      {secondarySeriesLabel}
                    </span>
                    <code>{objetivoColor.toUpperCase()}</code>
                  </div>
                  <div className="chart-swatch-grid">
                    {OBJETIVO_COLOR_PRESETS.map((preset) => {
                      const selected = objetivoColor.toLowerCase() === preset.hex.toLowerCase()
                      return (
                        <button
                          key={preset.hex}
                          type="button"
                          className={`chart-swatch-btn ${selected ? 'selected' : ''}`}
                          style={{ backgroundColor: preset.hex }}
                          onClick={() => updateColors({ objetivoColor: preset.hex })}
                          title={`${preset.label} (${preset.hex})`}
                          aria-label={`${secondarySeriesLabel}: ${preset.label}`}
                        >
                          {selected && <Check size={11} strokeWidth={3} />}
                        </button>
                      )
                    })}
                    <label
                      className="chart-swatch-custom"
                      title={`Elegir color personalizado para ${secondarySeriesLabel}`}
                    >
                      <Pipette size={11} />
                      <input
                        type="color"
                        value={objetivoColor}
                        onChange={(e) => updateColors({ objetivoColor: e.target.value })}
                        aria-label={`Color personalizado para ${secondarySeriesLabel}`}
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="exec-chart-kpis-strip">
        {financeOnly ? (
          <>
            <div className="exec-chart-kpi">
              <span className="exec-chart-kpi-lbl">Cobros recibidos (6 meses)</span>
              <div className="exec-chart-kpi-val-row">
                <span className="exec-chart-kpi-val" style={{ color: ventasColor }}>
                  {money(totalCobros)}
                </span>
                {renderMoMBadge(latestMonthData.cobrosMoM)}
              </div>
            </div>

            <div className="exec-chart-kpi">
              <span className="exec-chart-kpi-lbl">Gastos operativos (6 meses)</span>
              <div className="exec-chart-kpi-val-row">
                <span className="exec-chart-kpi-val" style={{ color: objetivoColor }}>
                  {money(totalGastos)}
                </span>
                {renderMoMBadge(latestMonthData.gastosMoM, true)}
              </div>
            </div>

            <div className="exec-chart-kpi">
              <span className="exec-chart-kpi-lbl">Flujo neto semestral</span>
              <span
                className="exec-chart-kpi-val"
                style={{ color: totalNetFlow >= 0 ? ventasColor : objetivoColor }}
              >
                {money(totalNetFlow)}
              </span>
            </div>

            <div className="exec-chart-kpi">
              <span className="exec-chart-kpi-lbl">Mejor mes en flujo neto</span>
              <span className="exec-chart-kpi-val" style={{ color: ventasColor }}>
                {bestCashMonth.month} ({money(bestCashMonth.cobros - bestCashMonth.gastos)})
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="exec-chart-kpi">
              <span className="exec-chart-kpi-lbl">Ventas totales (6 meses)</span>
              <div className="exec-chart-kpi-val-row">
                <span className="exec-chart-kpi-val">{money(totalVentas)}</span>
                {renderMoMBadge(latestMonthData.ventasMoM)}
              </div>
            </div>

            <div className="exec-chart-kpi">
              <span className="exec-chart-kpi-lbl">Objetivo presupuestado</span>
              <div className="exec-chart-kpi-val-row">
                <span className="exec-chart-kpi-val">{money(totalObjetivo)}</span>
                {renderMoMBadge(latestMonthData.objetivoMoM)}
              </div>
            </div>

            <div className="exec-chart-kpi">
              <span className="exec-chart-kpi-lbl">Cumplimiento semestral</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span className="exec-chart-kpi-val">{globalAttainment}%</span>
                <span
                  style={{
                    fontSize: '8.5px',
                    fontWeight: 700,
                    color: globalAttainment >= 100 ? ventasColor : objetivoColor,
                  }}
                >
                  {globalAttainment >= 100 ? 'Meta superada' : 'En rango óptimo'}
                </span>
              </div>
            </div>

            <div className="exec-chart-kpi">
              <span className="exec-chart-kpi-lbl">Mes récord</span>
              <span className="exec-chart-kpi-val" style={{ color: ventasColor }}>
                {bestMonth.month} ({money(bestMonth.ventas)})
              </span>
            </div>
          </>
        )}
      </div>

      {/* Active Chart Legend Strip */}
      <div className="exec-chart-legend-bar">
        {(viewMode === 'comparativo' || viewMode === 'tendencia') && (
          <>
            <button
              type="button"
              className="exec-legend-item"
              onClick={() => setColorMenuOpen(true)}
              title="Cambiar color de Ventas reales"
            >
              <i className="legend-swatch" style={{ backgroundColor: ventasColor }} />
              <span>Ventas reales</span>
            </button>
            <button
              type="button"
              className="exec-legend-item"
              onClick={() => setColorMenuOpen(true)}
              title="Cambiar color de Objetivo mensual"
            >
              <i
                className={viewMode === 'tendencia' ? 'legend-line-swatch' : 'legend-swatch'}
                style={{ backgroundColor: objetivoColor }}
              />
              <span>Objetivo mensual</span>
            </button>
          </>
        )}

        {viewMode === 'cumplimiento' && (
          <>
            <button
              type="button"
              className="exec-legend-item"
              onClick={() => setColorMenuOpen(true)}
              title="Cambiar color para meses con meta alcanzada"
            >
              <i className="legend-swatch" style={{ backgroundColor: ventasColor }} />
              <span>Meta alcanzada (≥ 100%)</span>
            </button>
            <button
              type="button"
              className="exec-legend-item"
              onClick={() => setColorMenuOpen(true)}
              title="Cambiar color para meses por debajo de meta"
            >
              <i className="legend-swatch" style={{ backgroundColor: objetivoColor }} />
              <span>Por debajo de meta (&lt; 100%)</span>
            </button>
          </>
        )}

        {viewMode === 'flujo-caja' && (
          <>
            <button
              type="button"
              className="exec-legend-item"
              onClick={() => setColorMenuOpen(true)}
              title="Cambiar color de Cobros (Entradas)"
            >
              <i className="legend-swatch" style={{ backgroundColor: ventasColor }} />
              <span>Cobros (Entradas)</span>
            </button>
            <button
              type="button"
              className="exec-legend-item"
              onClick={() => setColorMenuOpen(true)}
              title="Cambiar color de Gastos (Salidas)"
            >
              <i className="legend-swatch" style={{ backgroundColor: objetivoColor }} />
              <span>Gastos (Salidas)</span>
            </button>
          </>
        )}
      </div>

      {/* Recharts Container */}
      <div style={{ width: '100%', height: 225, marginTop: 4 }}>
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === 'comparativo' ? (
            /* Gráfico de Barras Comparativo (Ventas Reales vs. Objetivo Mensual) */
            <BarChart
              data={monthlyData}
              margin={{ top: 10, right: 12, left: -10, bottom: 0 }}
              barGap={5}
              barCategoryGap="22%"
            >
              <defs>
                <linearGradient id="ventasBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ventasColor} stopOpacity={1} />
                  <stop offset="100%" stopColor={ventasColor} stopOpacity={0.78} />
                </linearGradient>
                <linearGradient id="objetivoBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={objetivoColor} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={objetivoColor} stopOpacity={0.68} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(139, 150, 143, 0.18)"
              />
              <XAxis
                dataKey="month"
                stroke="#8b968f"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: 'rgba(139, 150, 143, 0.25)' }}
              />
              <YAxis
                tickFormatter={formatCompactCurrency}
                stroke="#8b968f"
                fontSize={9}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(139, 150, 143, 0.08)' }}
                content={
                  <CustomRevenueTooltip
                    viewMode="comparativo"
                    ventasColor={ventasColor}
                    objetivoColor={objetivoColor}
                  />
                }
              />
              <Bar
                name="Ventas reales"
                dataKey="ventas"
                fill="url(#ventasBarGrad)"
                radius={[5, 5, 0, 0]}
                maxBarSize={24}
              />
              <Bar
                name="Objetivo mensual"
                dataKey="objetivo"
                fill="url(#objetivoBarGrad)"
                radius={[5, 5, 0, 0]}
                maxBarSize={24}
              />
            </BarChart>
          ) : viewMode === 'tendencia' ? (
            /* Tendencia Mixta: Barras de Venta + Línea de Meta */
            <ComposedChart
              data={monthlyData}
              margin={{ top: 10, right: 12, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="ventasTendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ventasColor} stopOpacity={1} />
                  <stop offset="100%" stopColor={ventasColor} stopOpacity={0.75} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(139, 150, 143, 0.18)"
              />
              <XAxis
                dataKey="month"
                stroke="#8b968f"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: 'rgba(139, 150, 143, 0.25)' }}
              />
              <YAxis
                tickFormatter={formatCompactCurrency}
                stroke="#8b968f"
                fontSize={9}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(139, 150, 143, 0.08)' }}
                content={
                  <CustomRevenueTooltip
                    viewMode="tendencia"
                    ventasColor={ventasColor}
                    objetivoColor={objetivoColor}
                  />
                }
              />
              <Bar
                name="Ventas reales"
                dataKey="ventas"
                fill="url(#ventasTendGrad)"
                radius={[5, 5, 0, 0]}
                maxBarSize={32}
              />
              <Line
                name="Objetivo mensual"
                type="monotone"
                dataKey="objetivo"
                stroke={objetivoColor}
                strokeWidth={2.5}
                strokeDasharray="5 4"
                dot={{ r: 3.5, fill: objetivoColor, stroke: '#fff', strokeWidth: 1.5 }}
                activeDot={{ r: 5.5, fill: objetivoColor, stroke: '#fff', strokeWidth: 2 }}
              />
            </ComposedChart>
          ) : viewMode === 'cumplimiento' ? (
            /* % de Cumplimiento mensual con línea de meta 100% */
            <BarChart
              data={monthlyData}
              margin={{ top: 14, right: 12, left: -10, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(139, 150, 143, 0.18)"
              />
              <XAxis
                dataKey="month"
                stroke="#8b968f"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: 'rgba(139, 150, 143, 0.25)' }}
              />
              <YAxis
                domain={[0, 130]}
                tickFormatter={(val) => `${val}%`}
                stroke="#8b968f"
                fontSize={9}
                tickLine={false}
                axisLine={false}
              />
              <ReferenceLine
                y={100}
                stroke={ventasColor}
                strokeDasharray="4 4"
                strokeOpacity={0.85}
                label={{
                  value: 'Meta (100%)',
                  fill: ventasColor,
                  fontSize: 9,
                  fontWeight: 600,
                  position: 'insideTopRight',
                }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(139, 150, 143, 0.08)' }}
                content={
                  <CustomRevenueTooltip
                    viewMode="cumplimiento"
                    ventasColor={ventasColor}
                    objetivoColor={objetivoColor}
                  />
                }
              />
              <Bar name="% Cumplimiento" dataKey="cumplimiento" radius={[5, 5, 0, 0]} maxBarSize={32}>
                {monthlyData.map((entry) => (
                  <Cell
                    key={entry.month}
                    fill={entry.cumplimiento >= 100 ? ventasColor : objetivoColor}
                    fillOpacity={entry.cumplimiento >= 100 ? 0.92 : 0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          ) : (
            /* Flujo de caja: Cobros vs. Gastos */
            <BarChart
              data={monthlyData}
              margin={{ top: 10, right: 12, left: -10, bottom: 0 }}
              barGap={5}
            >
              <defs>
                <linearGradient id="cobrosBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ventasColor} stopOpacity={1} />
                  <stop offset="100%" stopColor={ventasColor} stopOpacity={0.76} />
                </linearGradient>
                <linearGradient id="gastosBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={objetivoColor} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={objetivoColor} stopOpacity={0.72} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(139, 150, 143, 0.18)"
              />
              <XAxis
                dataKey="month"
                stroke="#8b968f"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: 'rgba(139, 150, 143, 0.25)' }}
              />
              <YAxis
                tickFormatter={formatCompactCurrency}
                stroke="#8b968f"
                fontSize={9}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(139, 150, 143, 0.08)' }}
                content={
                  <CustomRevenueTooltip
                    viewMode="flujo-caja"
                    ventasColor={ventasColor}
                    objetivoColor={objetivoColor}
                  />
                }
              />
              <Bar
                name="Cobros (Entradas)"
                dataKey="cobros"
                fill="url(#cobrosBarGrad)"
                radius={[5, 5, 0, 0]}
                maxBarSize={26}
              />
              <Bar
                name="Gastos (Salidas)"
                dataKey="gastos"
                fill="url(#gastosBarGrad)"
                radius={[5, 5, 0, 0]}
                maxBarSize={26}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Historial mensual: Desglose comparativo de los 6 meses */}
      <div className="history-months-strip" aria-label="Historial comparativo de los últimos 6 meses">
        {monthlyData.map((d) => {
          if (financeOnly || viewMode === 'flujo-caja') {
            const net = d.cobros - d.gastos
            const isPositive = net >= 0
            return (
              <div key={d.month} className="history-month-card">
                <span className="history-month-name">{d.month}</span>
                <div className="history-month-value-row">
                  <strong className="history-month-sales" style={{ color: ventasColor }}>
                    {money(d.cobros)}
                  </strong>
                  {renderMoMBadge(d.cobrosMoM, false, true)}
                </div>
                <span className="history-month-target">
                  <i className="target-mini-dot" style={{ backgroundColor: objetivoColor }} />
                  <span>Gastos: {money(d.gastos)}</span>
                  {renderMoMBadge(d.gastosMoM, true, true)}
                </span>
                <span className={`history-month-badge ${isPositive ? 'positive' : 'negative'}`}>
                  Neto: {money(net)}
                </span>
              </div>
            )
          }
          const diff = d.ventas - d.objetivo
          const isPositive = diff >= 0
          return (
            <div key={d.month} className="history-month-card">
              <span className="history-month-name">{d.month}</span>
              <div className="history-month-value-row">
                <strong className="history-month-sales" style={{ color: ventasColor }}>
                  {money(d.ventas)}
                </strong>
                {renderMoMBadge(d.ventasMoM, false, true)}
              </div>
              <span className="history-month-target">
                <i className="target-mini-dot" style={{ backgroundColor: objetivoColor }} />
                <span>Meta: {money(d.objetivo)}</span>
                {renderMoMBadge(d.objetivoMoM, false, true)}
              </span>
              <span className={`history-month-badge ${isPositive ? 'positive' : 'negative'}`}>
                {isPositive ? `+${(d.cumplimiento - 100).toFixed(1)}%` : `${(d.cumplimiento - 100).toFixed(1)}%`} ({d.cumplimiento}%)
              </span>
            </div>
          )
        })}
      </div>
    </article>
  )
}
