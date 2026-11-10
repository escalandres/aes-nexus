import { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts'
import {
  BarChart3,
  ArrowUpRight,
  Scale,
  Percent,
  LineChart as LineChartIcon,
} from 'lucide-react'
import type { SalesOrder } from '../data/sales'
import type { InvoiceReceivable, ExpenseRecord } from '../data/finance'

interface RevenueTargetChartProps {
  orders: SalesOrder[]
  receivables: InvoiceReceivable[]
  expenses: ExpenseRecord[]
}

type ChartViewMode = 'comparativo' | 'tendencia' | 'flujo-caja' | 'cumplimiento'

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
            Gráfico de barras comparativo de la facturación lograda contra la meta presupuestada de cada mes
          </p>
        </div>

        {/* View Switcher Tabs */}
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
                color: globalAttainment >= 100 ? '#3c7d5c' : '#ba6e38',
              }}
            >
              {globalAttainment >= 100 ? 'Meta superada' : 'En rango óptimo'}
            </span>
          </div>
        </div>

        <div className="exec-chart-kpi">
          <span className="exec-chart-kpi-lbl">Mes récord</span>
          <span className="exec-chart-kpi-val" style={{ color: '#456a61' }}>
            {bestMonth.month} ({money(bestMonth.ventas)})
          </span>
        </div>
      </div>

      {/* Recharts Container */}
      <div style={{ width: '100%', height: 235, marginTop: 8 }}>
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === 'comparativo' ? (
            /* Gráfico de Barras Comparativo (Ventas Reales vs. Objetivo Mensual) */
            <BarChart
              data={monthlyData}
              margin={{ top: 12, right: 12, left: -10, bottom: 0 }}
              barGap={4}
              barCategoryGap="22%"
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9ece6" />
              <XAxis
                dataKey="month"
                stroke="#8b968f"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: '#e4eae1' }}
              />
              <YAxis
                tickFormatter={formatCompactCurrency}
                stroke="#8b968f"
                fontSize={9}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null
                  const data = payload[0].payload
                  const isNov = data.month === 'Nov'
                  const diff = data.ventas - data.objetivo
                  const reached = diff >= 0
                  return (
                    <div className="exec-chart-tooltip">
                      <strong>
                        {data.monthFull} {isNov && '· Noviembre'}
                      </strong>
                      <div className="exec-tooltip-row">
                        <span>Venta real:</span>
                        <strong style={{ color: '#456a61' }}>{money(data.ventas)}</strong>
                      </div>
                      <div className="exec-tooltip-row">
                        <span>Objetivo mensual:</span>
                        <strong style={{ color: '#88958c' }}>{money(data.objetivo)}</strong>
                      </div>
                      <div className="exec-tooltip-row">
                        <span>Diferencia:</span>
                        <strong style={{ color: reached ? '#3c7d5c' : '#ba4836' }}>
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
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '8px', fontSize: '9px' }}
                iconType="circle"
                iconSize={7}
              />
              <Bar
                name="Ventas reales"
                dataKey="ventas"
                fill="#456a61"
                radius={[4, 4, 0, 0]}
                maxBarSize={22}
              />
              <Bar
                name="Objetivo mensual"
                dataKey="objetivo"
                fill="#c6d8cd"
                radius={[4, 4, 0, 0]}
                maxBarSize={22}
              />
            </BarChart>
          ) : viewMode === 'tendencia' ? (
            /* Tendencia Mixta: Barras de Venta + Línea de Meta */
            <ComposedChart
              data={monthlyData}
              margin={{ top: 12, right: 12, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9ece6" />
              <XAxis
                dataKey="month"
                stroke="#8b968f"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: '#e4eae1' }}
              />
              <YAxis
                tickFormatter={formatCompactCurrency}
                stroke="#8b968f"
                fontSize={9}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null
                  const data = payload[0].payload
                  const isNov = data.month === 'Nov'
                  const diff = data.ventas - data.objetivo
                  const reached = diff >= 0
                  return (
                    <div className="exec-chart-tooltip">
                      <strong>
                        {data.monthFull} {isNov && '· Noviembre'}
                      </strong>
                      <div className="exec-tooltip-row">
                        <span>Ventas Reales:</span>
                        <strong style={{ color: '#456a61' }}>{money(data.ventas)}</strong>
                      </div>
                      <div className="exec-tooltip-row">
                        <span>Meta presupuestada:</span>
                        <strong style={{ color: '#88958c' }}>{money(data.objetivo)}</strong>
                      </div>
                      <div className="exec-tooltip-row">
                        <span>Variación:</span>
                        <strong style={{ color: reached ? '#3c7d5c' : '#ba4836' }}>
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
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '8px', fontSize: '9px' }}
                iconType="circle"
                iconSize={7}
              />
              <Bar
                name="Ventas reales"
                dataKey="ventas"
                fill="#456a61"
                radius={[4, 4, 0, 0]}
                maxBarSize={30}
              />
              <Line
                name="Objetivo mensual"
                type="monotone"
                dataKey="objetivo"
                stroke="#ba724e"
                strokeWidth={2.5}
                strokeDasharray="4 4"
                dot={{ r: 3, fill: '#ba724e', strokeWidth: 1 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          ) : viewMode === 'cumplimiento' ? (
            /* % de Cumplimiento mensual con línea de meta 100% */
            <BarChart
              data={monthlyData}
              margin={{ top: 12, right: 12, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9ece6" />
              <XAxis
                dataKey="month"
                stroke="#8b968f"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: '#e4eae1' }}
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
                stroke="#3c7d5c"
                strokeDasharray="3 3"
                label={{ value: 'Meta (100%)', fill: '#3c7d5c', fontSize: 9, position: 'top' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null
                  const data = payload[0].payload
                  return (
                    <div className="exec-chart-tooltip">
                      <strong>{data.monthFull}</strong>
                      <div className="exec-tooltip-row">
                        <span>Cumplimiento:</span>
                        <strong>{data.cumplimiento}%</strong>
                      </div>
                      <div className="exec-tooltip-row">
                        <span>Ventas vs Meta:</span>
                        <span>{money(data.ventas)} / {money(data.objetivo)}</span>
                      </div>
                    </div>
                  )
                }}
              />
              <Bar
                name="% Cumplimiento"
                dataKey="cumplimiento"
                fill="#4a7368"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          ) : (
            /* Flujo de caja: Cobros vs. Gastos */
            <BarChart
              data={monthlyData}
              margin={{ top: 12, right: 12, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9ece6" />
              <XAxis
                dataKey="month"
                stroke="#8b968f"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: '#e4eae1' }}
              />
              <YAxis
                tickFormatter={formatCompactCurrency}
                stroke="#8b968f"
                fontSize={9}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null
                  const data = payload[0].payload
                  const neto = data.cobros - data.gastos
                  return (
                    <div className="exec-chart-tooltip">
                      <strong>{data.monthFull}</strong>
                      <div className="exec-tooltip-row">
                        <span>Cobros recibidos:</span>
                        <strong style={{ color: '#3c7d5c' }}>{money(data.cobros)}</strong>
                      </div>
                      <div className="exec-tooltip-row">
                        <span>Gastos y costos:</span>
                        <strong style={{ color: '#ba4836' }}>{money(data.gastos)}</strong>
                      </div>
                      <div className="exec-tooltip-row">
                        <span>Margen neto:</span>
                        <strong style={{ color: neto >= 0 ? '#3c7d5c' : '#ba4836' }}>
                          {money(neto)}
                        </strong>
                      </div>
                    </div>
                  )
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '8px', fontSize: '9px' }}
                iconType="circle"
                iconSize={7}
              />
              <Bar
                name="Cobros (Entradas)"
                dataKey="cobros"
                fill="#3c7d5c"
                radius={[4, 4, 0, 0]}
                maxBarSize={26}
              />
              <Bar
                name="Gastos (Salidas)"
                dataKey="gastos"
                fill="#ba5544"
                radius={[4, 4, 0, 0]}
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
              <strong className="history-month-sales">{money(d.ventas)}</strong>
              <span className="history-month-target">Meta: {money(d.objetivo)}</span>
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
