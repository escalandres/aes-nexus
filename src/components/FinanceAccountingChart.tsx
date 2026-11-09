import { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import { BarChart3, Layers, CheckCircle2, TrendingUp, Scale, ChevronDown, ChevronUp } from 'lucide-react'
import type { ChartAccount, AccountType } from '../data/finance'

interface FinanceAccountingChartProps {
  accounts: ChartAccount[]
  onSelectType?: (type: string) => void
}

const formatCompactCurrency = (val: number) => {
  if (val >= 1_000_000) {
    return `$${(val / 1_000_000).toFixed(2)}M`
  }
  if (val >= 1_000) {
    return `$${(val / 1_000).toFixed(0)}k`
  }
  return `$${val.toLocaleString('es-MX')}`
}

const formatFullCurrency = (val: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(val)

const MACRO_COLORS: Record<string, string> = {
  Activo: '#3c7d5c',
  Pasivo: '#ba6e38',
  Capital: '#3d6c9b',
  Ingreso: '#2f855a',
  Gasto: '#ba4836',
}

const SUBTYPE_COLORS: Record<AccountType, string> = {
  'Activo circulante': '#3c7d5c',
  'Activo no circulante': '#529673',
  'Pasivo a corto plazo': '#ba6e38',
  'Pasivo a largo plazo': '#d48852',
  'Capital contable': '#3d6c9b',
  'Ingresos': '#2f855a',
  'Costos': '#b85d38',
  'Gastos de operación': '#ba4836',
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    value: number
    payload: {
      name: string
      balance: number
      count: number
      nature: string
      percentage: number
      description: string
    }
  }>
}

function CustomChartTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null
  const data = payload[0].payload

  return (
    <div className="accounting-chart-tooltip">
      <div className="tooltip-header">
        <strong>{data.name}</strong>
        <span className="tooltip-nature-pill">{data.nature}</span>
      </div>
      <div className="tooltip-balance-row">
        <span>Saldo total acumulado:</span>
        <strong>{formatFullCurrency(data.balance)}</strong>
      </div>
      <div className="tooltip-meta-row">
        <span>Cuentas agrupadas:</span>
        <span>{data.count} {data.count === 1 ? 'cuenta' : 'cuentas'}</span>
      </div>
      <div className="tooltip-meta-row">
        <span>Participación del volumen:</span>
        <span>{data.percentage.toFixed(1)}%</span>
      </div>
      <small className="tooltip-desc">{data.description}</small>
    </div>
  )
}

export function FinanceAccountingChart({ accounts, onSelectType }: FinanceAccountingChartProps) {
  const [viewMode, setViewMode] = useState<'macro' | 'subtype'>('macro')
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Aggregated data for Macro Groups: Activo, Pasivo, Capital, Ingreso, Gasto
  const macroData = useMemo(() => {
    const groups = [
      {
        id: 'Activo',
        name: 'Activo',
        nature: 'Naturaleza Deudora',
        description: 'Bienes, derechos y liquidez de la empresa (Caja, bancos, clientes, inventario, activos fijos).',
        match: (type: AccountType) => type.startsWith('Activo'),
      },
      {
        id: 'Pasivo',
        name: 'Pasivo',
        nature: 'Naturaleza Acreedora',
        description: 'Obligaciones y deudas con proveedores, acreedores, créditos e impuestos por pagar.',
        match: (type: AccountType) => type.startsWith('Pasivo'),
      },
      {
        id: 'Capital',
        name: 'Capital',
        nature: 'Naturaleza Acreedora',
        description: 'Patrimonio de los accionistas, aportaciones de capital y utilidades acumuladas.',
        match: (type: AccountType) => type === 'Capital contable',
      },
      {
        id: 'Ingreso',
        name: 'Ingreso',
        nature: 'Naturaleza Acreedora',
        description: 'Entradas brutas por ventas de productos y servicios facturados en el periodo.',
        match: (type: AccountType) => type === 'Ingresos',
      },
      {
        id: 'Gasto',
        name: 'Gasto y Costos',
        nature: 'Naturaleza Deudora',
        description: 'Costos directos de mercancías y gastos operativos (arrendamiento, nómina, servicios).',
        match: (type: AccountType) => type === 'Costos' || type === 'Gastos de operación',
      },
    ]

    const totalAllBalances = accounts.reduce((acc, curr) => acc + curr.balance, 0) || 1

    return groups.map((g) => {
      const matchingAccounts = accounts.filter((a) => g.match(a.type))
      const totalBalance = matchingAccounts.reduce((sum, a) => sum + a.balance, 0)
      return {
        id: g.id,
        name: g.name,
        balance: totalBalance,
        count: matchingAccounts.length,
        nature: g.nature,
        percentage: (totalBalance / totalAllBalances) * 100,
        description: g.description,
        color: MACRO_COLORS[g.id] || '#456a61',
      }
    })
  }, [accounts])

  // Aggregated data for Subtypes
  const subTypeData = useMemo(() => {
    const subTypes: AccountType[] = [
      'Activo circulante',
      'Activo no circulante',
      'Pasivo a corto plazo',
      'Pasivo a largo plazo',
      'Capital contable',
      'Ingresos',
      'Costos',
      'Gastos de operación',
    ]

    const totalAllBalances = accounts.reduce((acc, curr) => acc + curr.balance, 0) || 1

    return subTypes
      .map((st) => {
        const matchingAccounts = accounts.filter((a) => a.type === st)
        const totalBalance = matchingAccounts.reduce((sum, a) => sum + a.balance, 0)
        const nature =
          st.startsWith('Activo') || st === 'Costos' || st === 'Gastos de operación'
            ? 'Naturaleza Deudora'
            : 'Naturaleza Acreedora'

        return {
          id: st,
          name: st,
          balance: totalBalance,
          count: matchingAccounts.length,
          nature,
          percentage: (totalBalance / totalAllBalances) * 100,
          description: `Total de cuentas registradas en ${st}.`,
          color: SUBTYPE_COLORS[st] || '#55796d',
        }
      })
      .filter((d) => d.count > 0 || d.balance > 0)
  }, [accounts])

  const chartData = viewMode === 'macro' ? macroData : subTypeData

  // Accounting check: Activo = Pasivo + Capital
  const totalActivo = macroData.find((m) => m.id === 'Activo')?.balance || 0
  const totalPasivo = macroData.find((m) => m.id === 'Pasivo')?.balance || 0
  const totalCapital = macroData.find((m) => m.id === 'Capital')?.balance || 0
  const totalIngreso = macroData.find((m) => m.id === 'Ingreso')?.balance || 0
  const totalGasto = macroData.find((m) => m.id === 'Gasto')?.balance || 0

  const pasivoMasCapital = totalPasivo + totalCapital
  const isEquationBalanced = Math.abs(totalActivo - pasivoMasCapital) < 5

  return (
    <article className="accounting-chart-panel">
      {/* Chart Header */}
      <div className="accounting-chart-header">
        <div className="chart-header-left">
          <div className="chart-kicker-strip">
            <BarChart3 size={15} />
            <span>FINANZAS · VISUALIZACIÓN ANALÍTICA DE SALDOS</span>
          </div>
          <h3>Comparativo de Saldos Totales por Tipo de Cuenta</h3>
          <p>
            Distribución cuantitativa de los saldos acumulados en el catálogo contable de la organización.
          </p>
        </div>

        <div className="chart-header-right">
          {/* View mode toggle */}
          <div className="chart-mode-toggle" role="group" aria-label="Modo de agrupación">
            <button
              type="button"
              className={`chart-mode-btn ${viewMode === 'macro' ? 'active' : ''}`}
              onClick={() => setViewMode('macro')}
            >
              <Scale size={12} /> Grupos principales
            </button>
            <button
              type="button"
              className={`chart-mode-btn ${viewMode === 'subtype' ? 'active' : ''}`}
              onClick={() => setViewMode('subtype')}
            >
              <Layers size={12} /> Subtipos contables
            </button>
          </div>

          <button
            type="button"
            className="chart-collapse-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expandir gráfico' : 'Colapsar gráfico'}
            aria-label={isCollapsed ? 'Expandir gráfico' : 'Colapsar gráfico'}
          >
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Quick Metrics Bar */}
          <div className="accounting-chart-kpis">
            <div className="chart-kpi-box">
              <span className="kpi-label">Total Activos</span>
              <strong className="kpi-val text-positive">{formatCompactCurrency(totalActivo)}</strong>
              <small>Bienes y liquidez</small>
            </div>
            <div className="chart-kpi-box">
              <span className="kpi-label">Total Pasivos</span>
              <strong className="kpi-val text-alert">{formatCompactCurrency(totalPasivo)}</strong>
              <small>Deudas y proveedores</small>
            </div>
            <div className="chart-kpi-box">
              <span className="kpi-label">Capital Contable</span>
              <strong className="kpi-val text-neutral">{formatCompactCurrency(totalCapital)}</strong>
              <small>Patrimonio neto</small>
            </div>
            <div className="chart-kpi-box">
              <span className="kpi-label">Ingresos del Catálogo</span>
              <strong className="kpi-val text-positive">{formatCompactCurrency(totalIngreso)}</strong>
              <small>Ventas y servicios</small>
            </div>
            <div className="chart-kpi-box">
              <span className="kpi-label">Egresos y Costos</span>
              <strong className="kpi-val text-alert">{formatCompactCurrency(totalGasto)}</strong>
              <small>Costos y operación</small>
            </div>
            <div className="chart-kpi-box formula-box">
              <div className="formula-header">
                <span className="kpi-label">Ecuación Contable</span>
                {isEquationBalanced ? (
                  <span className="formula-badge ok">
                    <CheckCircle2 size={11} /> Cuadrada
                  </span>
                ) : (
                  <span className="formula-badge warn">Diferencia</span>
                )}
              </div>
              <strong className="kpi-val formula-val">
                {formatCompactCurrency(totalActivo)} = {formatCompactCurrency(pasivoMasCapital)}
              </strong>
              <small>Activo = Pasivo + Capital</small>
            </div>
          </div>

          {/* Recharts Bar Chart Container */}
          <div className="accounting-recharts-container">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 24, left: 16, bottom: 28 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6ece4" opacity={0.7} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={{ stroke: '#d9e2d7' }}
                  tick={{ fontSize: 10, fill: '#627267', fontWeight: 500 }}
                  interval={0}
                  dy={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={{ stroke: '#d9e2d7' }}
                  tick={{ fontSize: 9.5, fill: '#77887d' }}
                  tickFormatter={(val: number) => formatCompactCurrency(val)}
                  dx={-4}
                />
                <Tooltip
                  content={<CustomChartTooltip />}
                  cursor={{ fill: 'rgba(99, 129, 116, 0.08)' }}
                />
                <Bar
                  dataKey="balance"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={viewMode === 'macro' ? 56 : 38}
                  onClick={(entry) => {
                    if (onSelectType && entry && entry.id) {
                      onSelectType(entry.id)
                    }
                  }}
                  style={{ cursor: onSelectType ? 'pointer' : 'default' }}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.id} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Chart Legend Footer */}
          <div className="accounting-chart-footer">
            <div className="chart-legend-items">
              {chartData.map((d) => (
                <div key={d.id} className="chart-legend-tag">
                  <span className="legend-color-dot" style={{ backgroundColor: d.color }} />
                  <span className="legend-name">{d.name}:</span>
                  <strong className="legend-val">{formatCompactCurrency(d.balance)}</strong>
                  <small className="legend-pct">({d.percentage.toFixed(0)}%)</small>
                </div>
              ))}
            </div>

            <div className="chart-footer-note">
              <TrendingUp size={12} />
              <span>Haz clic en una barra para filtrar el catálogo por ese tipo de cuenta.</span>
            </div>
          </div>
        </>
      )}
    </article>
  )
}
