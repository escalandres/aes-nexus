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

interface RevenueTargetChartProps {
  orders: SalesOrder[]
  receivables: InvoiceReceivable[]
  expenses: ExpenseRecord[]
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

const formatCompactCurrency = (val: number) => {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}k`
  return `$${val}`
}

const money = (val: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(val)

export function RevenueTargetChart({
  orders,
  receivables,
  expenses,
}: RevenueTargetChartProps) {
  const [viewMode, setChartViewMode] = useState<ChartViewMode>('comparativo')
  const [chartColors, setChartColors] = useState(loadSavedColors)
  const [colorMenuOpen, setColorMenuOpen] = useState(false)
  const colorPickerRef = useRef<HTMLDivElement>(null)

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

  // Real-time calculation for current period (Nov)
  const currentNovSales = useMemo(() => {
    const ordersTotal = orders.reduce((sum, o) => sum + (o.total || 0), 0)
    return Math.max(ordersTotal, 260000)
  }, [orders])

  const currentNovCobros = useMemo(() => {
    const paidReceivables = receivables
      .filter((r) => r.status === 'Pagada' || r.paidAmount > 0)
      .reduce((sum, r) => sum + (r.paidAmount || 0), 0)
    return Math.max(paidReceivables, 245000)
  }, [receivables])

  const currentNovGastos = useMemo(() => {
    const expTotal = expenses.reduce((sum, e) => sum + (e.total || 0), 0)
    return Math.max(expTotal, 118000)
  }, [expenses])

  // Monthly dataset for the last 6 months
  const monthlyData = useMemo(() => {
    return [
      {
        month: 'Jun',
        monthFull: 'Junio 2026',
        ventas: 145000,
        objetivo: 160000,
        cobros: 138000,
        gastos: 82000,
        cumplimiento: 90.6,
      },
      {
        month: 'Jul',
        monthFull: 'Julio 2026',
        ventas: 182000,
        objetivo: 175000,
        cobros: 170000,
        gastos: 91000,
        cumplimiento: 104.0,
      },
      {
        month: 'Ago',
        monthFull: 'Agosto 2026',
        ventas: 168000,
        objetivo: 180000,
        cobros: 162000,
        gastos: 96000,
        cumplimiento: 93.3,
      },
      {
        month: 'Sep',
        monthFull: 'Septiembre 2026',
        ventas: 215000,
        objetivo: 200000,
        cobros: 204000,
        gastos: 104000,
        cumplimiento: 107.5,
      },
      {
        month: 'Oct',
        monthFull: 'Octubre 2026',
        ventas: 198000,
        objetivo: 210000,
        cobros: 195000,
        gastos: 98000,
        cumplimiento: 94.3,
      },
      {
        month: 'Nov',
        monthFull: 'Noviembre 2026 (En curso)',
        ventas: currentNovSales,
        objetivo: 240000,
        cobros: currentNovCobros,
        gastos: currentNovGastos,
        cumplimiento: Number(((currentNovSales / 240000) * 100).toFixed(1)),
      },
    ]
  }, [currentNovSales, currentNovCobros, currentNovGastos])

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
  const bestMonth = useMemo(() => {
    return [...monthlyData].sort((a, b) => b.ventas - a.ventas)[0]
  }, [monthlyData])

  return (
    <article className="panel exec-chart-panel" aria-label="Historial de ventas y objetivos">
      {/* Top Header & View Controls */}
      <div className="exec-chart-top-bar">
        <div>
          <div className="panel-kicker">HISTORIAL COMERCIAL · ÚLTIMOS 6 MESES</div>
          <h2>Historial de ventas vs. objetivos mensuales</h2>
          <p className="panel-subtitle">
            Gráfico comparativo de la facturación lograda contra la meta presupuestada de cada mes
          </p>
        </div>

        {/* View Switcher Tabs + Color Customizer */}
        <div className="exec-chart-controls">
          <div className="exec-chart-tabs" role="tablist" aria-label="Modo de gráfico">
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
            <button
              type="button"
              className={`exec-chart-tab ${viewMode === 'flujo-caja' ? 'active' : ''}`}
              onClick={() => setChartViewMode('flujo-caja')}
              title="Cobros recibidos frente a gastos y egresos"
            >
              <Scale size={12} />
              Cobros vs. Gastos
            </button>
          </div>

          <div className="chart-color-picker-anchor" ref={colorPickerRef}>
            <button
              type="button"
              className={`chart-color-trigger ${colorMenuOpen ? 'active' : ''}`}
              onClick={() => setColorMenuOpen((prev) => !prev)}
              aria-expanded={colorMenuOpen}
              aria-label="Personalizar colores de la gráfica"
              title="Personalizar colores de Ventas reales y Objetivo mensual"
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

                {/* Ventas Reales Color */}
                <div className="chart-color-section">
                  <div className="chart-color-row-head">
                    <span className="chart-color-series-title">
                      <i className="series-dot" style={{ backgroundColor: ventasColor }} />
                      Ventas reales
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
                          aria-label={`Ventas reales: ${preset.label}`}
                        >
                          {selected && <Check size={11} strokeWidth={3} />}
                        </button>
                      )
                    })}
                    <label
                      className="chart-swatch-custom"
                      title="Elegir color personalizado para Ventas reales"
                    >
                      <Pipette size={11} />
                      <input
                        type="color"
                        value={ventasColor}
                        onChange={(e) => updateColors({ ventasColor: e.target.value })}
                        aria-label="Color personalizado para Ventas reales"
                      />
                    </label>
                  </div>
                </div>

                {/* Objetivo Mensual Color */}
                <div className="chart-color-section">
                  <div className="chart-color-row-head">
                    <span className="chart-color-series-title">
                      <i className="series-dot" style={{ backgroundColor: objetivoColor }} />
                      Objetivo mensual
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
                          aria-label={`Objetivo mensual: ${preset.label}`}
                        >
                          {selected && <Check size={11} strokeWidth={3} />}
                        </button>
                      )
                    })}
                    <label
                      className="chart-swatch-custom"
                      title="Elegir color personalizado para Objetivo mensual"
                    >
                      <Pipette size={11} />
                      <input
                        type="color"
                        value={objetivoColor}
                        onChange={(e) => updateColors({ objetivoColor: e.target.value })}
                        aria-label="Color personalizado para Objetivo mensual"
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
        <div className="exec-chart-kpi">
          <span className="exec-chart-kpi-lbl">Ventas totales (6 meses)</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span className="exec-chart-kpi-val">{money(totalVentas)}</span>
            <span className="trend trend-up">
              <ArrowUpRight size={13} /> +12.4%
            </span>
          </div>
        </div>

        <div className="exec-chart-kpi">
          <span className="exec-chart-kpi-lbl">Objetivo presupuestado</span>
          <span className="exec-chart-kpi-val">{money(totalObjetivo)}</span>
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
            <span className="exec-legend-item static">
              <i className="legend-swatch" style={{ backgroundColor: '#1d7a65' }} />
              <span>Cobros (Entradas)</span>
            </span>
            <span className="exec-legend-item static">
              <i className="legend-swatch" style={{ backgroundColor: '#d9534f' }} />
              <span>Gastos (Salidas)</span>
            </span>
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
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null
                  const data = payload[0].payload
                  const isNov = data.month === 'Nov'
                  const diff = data.ventas - data.objetivo
                  const reached = diff >= 0
                  return (
                    <div className="exec-chart-tooltip">
                      <strong>
                        {data.monthFull} {isNov && '· En curso'}
                      </strong>
                      <div className="exec-tooltip-row">
                        <span className="exec-tooltip-lbl-dot">
                          <i style={{ backgroundColor: ventasColor }} />
                          Venta real:
                        </span>
                        <strong style={{ color: ventasColor }}>{money(data.ventas)}</strong>
                      </div>
                      <div className="exec-tooltip-row">
                        <span className="exec-tooltip-lbl-dot">
                          <i style={{ backgroundColor: objetivoColor }} />
                          Objetivo mensual:
                        </span>
                        <strong style={{ color: objetivoColor }}>{money(data.objetivo)}</strong>
                      </div>
                      <div className="exec-tooltip-row">
                        <span>Diferencia:</span>
                        <strong style={{ color: reached ? '#1d7a65' : '#d9534f' }}>
                          {reached ? `+${money(diff)}` : money(diff)}
                        </strong>
                      </div>
                      <span className={`exec-tooltip-badge ${reached ? 'good' : 'warn'}`}>
                        {data.cumplimiento}% de la meta mensual
                      </span>
                    </div>
                  )
                }}
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
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null
                  const data = payload[0].payload
                  const isNov = data.month === 'Nov'
                  const diff = data.ventas - data.objetivo
                  const reached = diff >= 0
                  return (
                    <div className="exec-chart-tooltip">
                      <strong>
                        {data.monthFull} {isNov && '· En curso'}
                      </strong>
                      <div className="exec-tooltip-row">
                        <span className="exec-tooltip-lbl-dot">
                          <i style={{ backgroundColor: ventasColor }} />
                          Ventas reales:
                        </span>
                        <strong style={{ color: ventasColor }}>{money(data.ventas)}</strong>
                      </div>
                      <div className="exec-tooltip-row">
                        <span className="exec-tooltip-lbl-dot">
                          <i style={{ backgroundColor: objetivoColor }} />
                          Meta presupuestada:
                        </span>
                        <strong style={{ color: objetivoColor }}>{money(data.objetivo)}</strong>
                      </div>
                      <div className="exec-tooltip-row">
                        <span>Variación:</span>
                        <strong style={{ color: reached ? '#1d7a65' : '#d9534f' }}>
                          {reached ? `+${money(diff)}` : money(diff)}
                        </strong>
                      </div>
                      <span className={`exec-tooltip-badge ${reached ? 'good' : 'warn'}`}>
                        {data.cumplimiento}% de la meta
                      </span>
                    </div>
                  )
                }}
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
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null
                  const data = payload[0].payload
                  const reached = data.cumplimiento >= 100
                  return (
                    <div className="exec-chart-tooltip">
                      <strong>{data.monthFull}</strong>
                      <div className="exec-tooltip-row">
                        <span>Cumplimiento:</span>
                        <strong style={{ color: reached ? ventasColor : objetivoColor }}>
                          {data.cumplimiento}%
                        </strong>
                      </div>
                      <div className="exec-tooltip-row">
                        <span>Ventas vs Meta:</span>
                        <span>
                          {money(data.ventas)} / {money(data.objetivo)}
                        </span>
                      </div>
                    </div>
                  )
                }}
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
                  <stop offset="0%" stopColor="#1d7a65" stopOpacity={1} />
                  <stop offset="100%" stopColor="#1d7a65" stopOpacity={0.76} />
                </linearGradient>
                <linearGradient id="gastosBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d9534f" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#d9534f" stopOpacity={0.72} />
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
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null
                  const data = payload[0].payload
                  const neto = data.cobros - data.gastos
                  return (
                    <div className="exec-chart-tooltip">
                      <strong>{data.monthFull}</strong>
                      <div className="exec-tooltip-row">
                        <span className="exec-tooltip-lbl-dot">
                          <i style={{ backgroundColor: '#1d7a65' }} />
                          Cobros recibidos:
                        </span>
                        <strong style={{ color: '#1d7a65' }}>{money(data.cobros)}</strong>
                      </div>
                      <div className="exec-tooltip-row">
                        <span className="exec-tooltip-lbl-dot">
                          <i style={{ backgroundColor: '#d9534f' }} />
                          Gastos y costos:
                        </span>
                        <strong style={{ color: '#d9534f' }}>{money(data.gastos)}</strong>
                      </div>
                      <div className="exec-tooltip-row">
                        <span>Margen neto:</span>
                        <strong style={{ color: neto >= 0 ? '#1d7a65' : '#d9534f' }}>
                          {money(neto)}
                        </strong>
                      </div>
                    </div>
                  )
                }}
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
          const diff = d.ventas - d.objetivo
          const isPositive = diff >= 0
          return (
            <div key={d.month} className="history-month-card">
              <span className="history-month-name">{d.month}</span>
              <strong className="history-month-sales" style={{ color: ventasColor }}>
                {money(d.ventas)}
              </strong>
              <span className="history-month-target">
                <i className="target-mini-dot" style={{ backgroundColor: objetivoColor }} />
                Meta: {money(d.objetivo)}
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
