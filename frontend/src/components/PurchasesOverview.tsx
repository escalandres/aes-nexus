import { useState, useMemo } from 'react'
import {
  ShoppingCart,
  ClipboardList,
  Truck,
  ReceiptText,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Building2,
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
} from 'recharts'
import type { PurchaseOrder, InventoryItemLocation } from '../data/operations'
import {
  DEPARTMENT_PROCUREMENT_PLANS,
  PROCUREMENT_CHART_MONTHS,
  type ProcurementChartMonth,
  type PurchaseRequisition,
  type PurchasesSectionTab,
} from '../data/purchases'
import type { BillPayable } from '../data/finance'

interface PurchasesOverviewProps {
  requisitions: PurchaseRequisition[]
  purchaseOrders: PurchaseOrder[]
  inventory: InventoryItemLocation[]
  payables: BillPayable[]
  departments?: string[]
  onNavigateSection: (sec: PurchasesSectionTab) => void
  onQuickReplenishFromStock: () => void
  onNavigateFinancePayables: () => void
}

const CHART_MONTH_KEY_BY_ES: Record<string, ProcurementChartMonth> = {
  jun: 'Jun',
  junio: 'Jun',
  jul: 'Jul',
  julio: 'Jul',
  ago: 'Ago',
  agosto: 'Ago',
  sep: 'Sep',
  sept: 'Sep',
  septiembre: 'Sep',
  oct: 'Oct',
  octubre: 'Oct',
  nov: 'Nov',
  noviembre: 'Nov',
}

const extractPoChartMonth = (rawDate: string): ProcurementChartMonth | null => {
  const m = rawDate.trim().toLowerCase().match(/^\d{1,2}\s+([a-záéíóú]+)\.?\s+(\d{4})$/i)
  if (m && m[2] === '2026') {
    return CHART_MONTH_KEY_BY_ES[m[1]] ?? null
  }
  const iso = rawDate.trim().match(/^2026-(\d{2})-\d{2}/)
  if (iso) {
    const idx = Number(iso[1])
    if (idx === 6) return 'Jun'
    if (idx === 7) return 'Jul'
    if (idx === 8) return 'Ago'
    if (idx === 9) return 'Sep'
    if (idx === 10) return 'Oct'
    if (idx === 11) return 'Nov'
  }
  return null
}

const money = (val: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(val)

export function PurchasesOverview({
  requisitions,
  purchaseOrders,
  inventory,
  payables,
  departments,
  onNavigateSection,
  onQuickReplenishFromStock,
  onNavigateFinancePayables,
}: PurchasesOverviewProps) {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('Todos')

  const departmentList = useMemo(() => {
    const base =
      departments && departments.length > 0
        ? departments
        : DEPARTMENT_PROCUREMENT_PLANS.map((p) => p.department)
    const set = new Set<string>(base)
    requisitions.forEach((r) => {
      if (r.department.trim()) set.add(r.department.trim())
    })
    return Array.from(set)
  }, [departments, requisitions])

  const activeOrders = useMemo(
    () => purchaseOrders.filter((po) => po.status !== 'Cancelada'),
    [purchaseOrders]
  )

  const totalCommittedSpend = useMemo(
    () => activeOrders.reduce((sum, po) => sum + po.total, 0),
    [activeOrders]
  )

  const pendingRequisitions = useMemo(
    () => requisitions.filter((r) => r.status === 'Pendiente' || r.status === 'Aprobada'),
    [requisitions]
  )

  const awaitingApprovalCount = useMemo(
    () => requisitions.filter((r) => r.status === 'Pendiente').length,
    [requisitions]
  )

  const pendingReceptions = useMemo(
    () =>
      purchaseOrders.filter(
        (po) => po.status === 'Emitida' || po.status === 'Recepción parcial'
      ),
    [purchaseOrders]
  )

  const pendingUnitsToReceive = useMemo(
    () =>
      pendingReceptions.reduce(
        (sum, po) =>
          sum +
          po.items.reduce(
            (iSum, item) => iSum + Math.max(0, item.quantity - item.receivedQty),
            0
          ),
        0
      ),
    [pendingReceptions]
  )

  const linkedPayables = useMemo(() => {
    const poFolios = new Set(purchaseOrders.map((po) => po.folio))
    return payables.filter(
      (bill) => bill.purchaseOrderFolio && poFolios.has(bill.purchaseOrderFolio)
    )
  }, [payables, purchaseOrders])

  const linkedPayableBalance = useMemo(
    () => linkedPayables.reduce((sum, bill) => sum + bill.balance, 0),
    [linkedPayables]
  )

  const lowStockItems = useMemo(
    () => inventory.filter((item) => item.stock <= item.minStock),
    [inventory]
  )

  // Spend & commitment breakdown by supplier for Recharts
  const supplierSpendData = useMemo(() => {
    const map: Record<string, { supplier: string; recibido: number; porRecibir: number }> = {}
    for (const po of activeOrders) {
      const label =
        po.supplierCompany.length > 18
          ? `${po.supplierCompany.slice(0, 16)}…`
          : po.supplierCompany
      if (!map[po.supplierCompany]) {
        map[po.supplierCompany] = { supplier: label, recibido: 0, porRecibir: 0 }
      }
      for (const item of po.items) {
        const ratio = item.quantity > 0 ? item.receivedQty / item.quantity : 0
        const receivedVal = Math.round(item.total * ratio)
        const pendingVal = Math.max(0, Math.round(item.total - receivedVal))
        map[po.supplierCompany].recibido += receivedVal
        map[po.supplierCompany].porRecibir += pendingVal
      }
    }
    return Object.values(map).sort(
      (a, b) => b.recibido + b.porRecibir - (a.recibido + a.porRecibir)
    )
  }, [activeOrders])

  // Pipeline steps
  const approvedReqsCount = requisitions.filter((r) => r.status === 'Aprobada').length
  const receivedPOsCount = purchaseOrders.filter((po) => po.status === 'Recibida').length

  // Comparative Monthly Spend vs Assigned Budget by Department
  const departmentBudgetSeries = useMemo(() => {
    // Map each PO folio to a department via linked requisition (fallback to Operaciones y Logística)
    const poDeptMap = new Map<string, string>()
    for (const req of requisitions) {
      if (req.linkedPoFolio) {
        poDeptMap.set(req.linkedPoFolio, req.department)
      }
    }

    const liveSpendByDeptMonth = new Map<string, Record<ProcurementChartMonth, number>>()
    const ensureBucket = (dept: string) => {
      if (!liveSpendByDeptMonth.has(dept)) {
        liveSpendByDeptMonth.set(dept, { Jun: 0, Jul: 0, Ago: 0, Sep: 0, Oct: 0, Nov: 0 })
      }
      return liveSpendByDeptMonth.get(dept)!
    }

    for (const po of activeOrders) {
      const m = extractPoChartMonth(po.date)
      if (!m) continue
      const dept = poDeptMap.get(po.folio) || 'Operaciones y Logística'
      const bucket = ensureBucket(dept)
      bucket[m] += Math.round(po.total)
    }

    const targetDepts =
      selectedDepartment === 'Todos' ? departmentList : [selectedDepartment]

    return PROCUREMENT_CHART_MONTHS.map((month) => {
      let gasto = 0
      let presupuesto = 0
      for (const dept of targetDepts) {
        const plan = DEPARTMENT_PROCUREMENT_PLANS.find((p) => p.department === dept)
        const baseBudget = plan?.monthlyBudget ?? 60000
        const baseSpend = plan?.historicalMonthlySpend[month] ?? 0
        const liveSpend = liveSpendByDeptMonth.get(dept)?.[month] ?? 0
        presupuesto += baseBudget
        gasto += baseSpend + liveSpend
      }
      const diff = presupuesto - gasto
      return {
        month,
        gasto,
        presupuesto,
        diff,
      }
    })
  }, [activeOrders, requisitions, departmentList, selectedDepartment])

  const departmentBudgetSummary = useMemo(() => {
    const totalSpend = departmentBudgetSeries.reduce((sum, d) => sum + d.gasto, 0)
    const totalBudget = departmentBudgetSeries.reduce((sum, d) => sum + d.presupuesto, 0)
    const executionPct =
      totalBudget > 0 ? Math.round((totalSpend / totalBudget) * 1000) / 10 : 0
    const remaining = totalBudget - totalSpend
    const lastMonth = departmentBudgetSeries[departmentBudgetSeries.length - 1]
    return {
      totalSpend,
      totalBudget,
      executionPct,
      remaining,
      isOverBudget: totalSpend > totalBudget,
      lastMonthSpend: lastMonth?.gasto ?? 0,
      lastMonthBudget: lastMonth?.presupuesto ?? 0,
    }
  }, [departmentBudgetSeries])

  return (
    <div className="sales-overview-wrap purchases-overview-wrap">
      {/* 4 KPI Cards */}
      <section className="catalog-kpis" aria-label="Indicadores clave de compras">
        <article className="catalog-kpi-card">
          <div className="catalog-kpi-header">
            <span>Total comprometido en OC</span>
            <span className="kpi-icon">
              <ShoppingCart size={16} />
            </span>
          </div>
          <div className="catalog-kpi-val tabular-nums">{money(totalCommittedSpend)}</div>
          <div className="catalog-kpi-sub">
            <span>{activeOrders.length} órdenes de compra activas</span>
          </div>
        </article>

        <article className="catalog-kpi-card">
          <div className="catalog-kpi-header">
            <span>Requisiciones activas</span>
            <span className="kpi-icon icon-sand">
              <ClipboardList size={16} />
            </span>
          </div>
          <div className="catalog-kpi-val tabular-nums">{pendingRequisitions.length}</div>
          <div className="catalog-kpi-sub">
            <span>
              {awaitingApprovalCount} por aprobar · {approvedReqsCount} listas para OC
            </span>
          </div>
        </article>

        <article className="catalog-kpi-card">
          <div className="catalog-kpi-header">
            <span>Recepciones en espera</span>
            <span className="kpi-icon icon-blue">
              <Truck size={16} />
            </span>
          </div>
          <div className="catalog-kpi-val tabular-nums">{pendingReceptions.length}</div>
          <div className="catalog-kpi-sub">
            <span>{pendingUnitsToReceive} unidades pendientes de ingreso</span>
          </div>
        </article>

        <article className="catalog-kpi-card">
          <div className="catalog-kpi-header">
            <span>Saldo CxP vinculado a OC</span>
            <span className="kpi-icon icon-green">
              <ReceiptText size={16} />
            </span>
          </div>
          <div className="catalog-kpi-val tabular-nums">{money(linkedPayableBalance)}</div>
          <div className="catalog-kpi-sub">
            <span>{linkedPayables.length} facturas de proveedor registradas</span>
          </div>
        </article>
      </section>

      {/* Procurement Workflow Strip */}
      <section className="sales-funnel-card">
        <div className="funnel-heading">
          <div>
            <div className="panel-kicker">CICLO DE ABASTECIMIENTO</div>
            <h3>Flujo operativo de compras</h3>
          </div>
          <div className="funnel-quick-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => onNavigateSection('Requisiciones')}
            >
              <Plus size={14} /> Nueva requisición
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => onNavigateSection('Recepciones')}
            >
              <Truck size={14} /> Andén de recepciones ({pendingReceptions.length})
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={() => onNavigateSection('Órdenes de compra')}
            >
              <ShoppingCart size={14} /> Órdenes de compra
            </button>
          </div>
        </div>

        <div className="funnel-steps-grid">
          <div className="funnel-step">
            <span className="funnel-step-label">1. Requisiciones</span>
            <strong className="funnel-step-val tabular-nums">{requisitions.length}</strong>
            <small>{awaitingApprovalCount} pendientes de autorización</small>
            <div className="funnel-bar">
              <span style={{ width: '100%' }} />
            </div>
          </div>
          <div className="funnel-step">
            <span className="funnel-step-label">2. Órdenes emitidas</span>
            <strong className="funnel-step-val tabular-nums">{activeOrders.length}</strong>
            <small>{money(totalCommittedSpend)} contratado</small>
            <div className="funnel-bar">
              <span
                style={{
                  width: `${Math.min(100, Math.round((activeOrders.length / Math.max(1, purchaseOrders.length)) * 100))}%`,
                }}
              />
            </div>
          </div>
          <div className="funnel-step">
            <span className="funnel-step-label">3. En andén / Tránsito</span>
            <strong className="funnel-step-val tabular-nums">{pendingReceptions.length}</strong>
            <small>{pendingUnitsToReceive} pzas por recibir</small>
            <div className="funnel-bar">
              <span
                style={{
                  width: `${Math.min(100, Math.round((pendingReceptions.length / Math.max(1, activeOrders.length)) * 100))}%`,
                }}
              />
            </div>
          </div>
          <div className="funnel-step highlight">
            <span className="funnel-step-label">4. Recibidas en almacén</span>
            <strong className="funnel-step-val tabular-nums">{receivedPOsCount}</strong>
            <small>{linkedPayables.length} facturadas en CxP</small>
            <div className="funnel-bar">
              <span
                style={{
                  width: `${Math.min(100, Math.round((receivedPOsCount / Math.max(1, activeOrders.length)) * 100))}%`,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Comparative Monthly Spend vs Assigned Budget Chart by Department */}
      <section className="overview-panel-card purchases-budget-card">
        <div className="panel-heading">
          <div>
            <div className="panel-kicker">CONTROL PRESUPUESTAL DE ADQUISICIONES</div>
            <h2>Gasto mensual en adquisiciones vs. presupuesto asignado</h2>
            <p className="panel-subtitle">
              Comparativa semestral de compras ejercidas frente al presupuesto mensual por área
            </p>
          </div>

          <div className="purchases-budget-controls">
            <div className="purchases-dept-select-wrap">
              <Building2 size={14} className="purchases-dept-select-icon" aria-hidden="true" />
              <select
                aria-label="Seleccionar departamento para presupuesto de compras"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
              >
                <option value="Todos">Todos los departamentos ({departmentList.length})</option>
                {departmentList.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Quick Department Switcher */}
        <div
          className="warehouse-tab-selector purchases-dept-tabs"
          role="tablist"
          aria-label="Alternar departamento"
        >
          <button
            type="button"
            role="tab"
            aria-selected={selectedDepartment === 'Todos'}
            className={`wh-tab ${selectedDepartment === 'Todos' ? 'active' : ''}`}
            onClick={() => setSelectedDepartment('Todos')}
          >
            Todos
          </button>
          {departmentList.map((dept) => (
            <button
              key={dept}
              type="button"
              role="tab"
              aria-selected={selectedDepartment === dept}
              className={`wh-tab ${selectedDepartment === dept ? 'active' : ''}`}
              onClick={() => setSelectedDepartment(dept)}
            >
              {dept}
            </button>
          ))}
        </div>

        {/* Period Budget Summary Row */}
        <div className="purchases-budget-metrics tabular-nums">
          <div className="purchases-budget-metric">
            <span>Gasto acumulado (Jun–Nov)</span>
            <strong>{money(departmentBudgetSummary.totalSpend)}</strong>
          </div>
          <div className="purchases-budget-metric">
            <span>Presupuesto asignado (6m)</span>
            <strong>{money(departmentBudgetSummary.totalBudget)}</strong>
          </div>
          <div className="purchases-budget-metric">
            <span>Ejecución presupuestal</span>
            <strong
              className={
                departmentBudgetSummary.isOverBudget ? 'is-over-budget' : 'is-within-budget'
              }
            >
              {departmentBudgetSummary.executionPct}% ·{' '}
              {departmentBudgetSummary.isOverBudget ? 'Sobre presupuesto' : 'Dentro de presupuesto'}
            </strong>
          </div>
          <div className="purchases-budget-metric">
            <span>Disponible / Variación</span>
            <strong
              className={
                departmentBudgetSummary.remaining < 0 ? 'is-over-budget' : 'is-within-budget'
              }
            >
              {departmentBudgetSummary.remaining >= 0
                ? `${money(departmentBudgetSummary.remaining)} disp.`
                : `-${money(Math.abs(departmentBudgetSummary.remaining))} exc.`}
            </strong>
          </div>
        </div>

        <div style={{ width: '100%', height: 265 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={departmentBudgetSeries}
              margin={{ top: 10, right: 14, left: 0, bottom: 4 }}
              barGap={6}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,142,133,0.18)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#7e8c83' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#7e8c83' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val: number) => `$${Math.round(val / 1000)}k`}
              />
              <Tooltip
                formatter={(value, name) => [money(Number(value) || 0), String(name || '')]}
                labelFormatter={(label) =>
                  `${String(label)} 2026 · ${
                    selectedDepartment === 'Todos' ? 'Todos los departamentos' : selectedDepartment
                  }`
                }
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #dfe6e0',
                  fontSize: '11px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar
                dataKey="gasto"
                name="Gasto en adquisiciones"
                fill="#456a61"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
              <Bar
                dataKey="presupuesto"
                name="Presupuesto asignado"
                fill="#c7a97e"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Middle Analytics & Alerts Split */}
      <div className="sales-overview-split">
        {/* Supplier Spend Chart */}
        <section className="overview-panel-card">
          <div className="panel-heading">
            <div>
              <div className="panel-kicker">DISTRIBUCIÓN DE GASTO</div>
              <h2>Compromiso de compra por proveedor</h2>
            </div>
            <button
              type="button"
              className="text-link"
              onClick={() => onNavigateSection('Órdenes de compra')}
            >
              Ver órdenes <ArrowRight size={13} />
            </button>
          </div>

          {supplierSpendData.length === 0 ? (
            <div className="purchases-empty-note">
              Aún no hay órdenes de compra activas para graficar.
            </div>
          ) : (
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={supplierSpendData}
                  margin={{ top: 10, right: 12, left: 0, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,142,133,0.18)" vertical={false} />
                  <XAxis
                    dataKey="supplier"
                    tick={{ fontSize: 11, fill: '#7e8c83' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#7e8c83' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val: number) => `$${Math.round(val / 1000)}k`}
                  />
                  <Tooltip
                    formatter={(value, name) => [money(Number(value) || 0), String(name || '')]}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #dfe6e0',
                      fontSize: '11px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar
                    dataKey="recibido"
                    name="Recibido en almacén"
                    stackId="spend"
                    fill="#456a61"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="porRecibir"
                    name="Pendiente de entrega"
                    stackId="spend"
                    fill="#9db8ab"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Low Stock Replenishment Alerts */}
        <section className="overview-panel-card">
          <div className="panel-heading">
            <div>
              <div className="panel-kicker">REABASTECIMIENTO AUTOMÁTICO</div>
              <h2>Alertas de punto de reorden</h2>
            </div>
            <button
              type="button"
              className="text-link"
              onClick={onQuickReplenishFromStock}
            >
              Crear requisición <ArrowRight size={13} />
            </button>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="ops-all-stocked-note">
              <CheckCircle2 size={15} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
              Todos los artículos en almacén superan su stock mínimo de seguridad.
            </div>
          ) : (
            <div className="overview-list">
              {lowStockItems.slice(0, 4).map((item) => (
                <div key={item.id} className="overview-list-row">
                  <div className="overview-list-main">
                    <span className="font-mono text-xs font-bold text-accent">{item.sku}</span>
                    <strong>{item.name}</strong>
                    <small className="text-muted">
                      {item.warehouseName} · Ubicación {item.locationBin}
                    </small>
                  </div>
                  <div className="overview-list-end">
                    <strong className="font-mono tabular-nums text-alert">
                      {item.stock} / {item.minStock} mín.
                    </strong>
                    <button
                      type="button"
                      className="button button-secondary button-sm"
                      onClick={onQuickReplenishFromStock}
                    >
                      <AlertTriangle size={12} /> Solicitar reposición
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Bottom Split: Requisitions Queue & Supplier Bills */}
      <div className="sales-overview-split">
        <section className="overview-panel-card">
          <div className="panel-heading">
            <div>
              <div className="panel-kicker">SOLICITUDES INTERNAS</div>
              <h2>Requisiciones recientes</h2>
            </div>
            <button
              type="button"
              className="text-link"
              onClick={() => onNavigateSection('Requisiciones')}
            >
              Gestionar todas <ArrowRight size={13} />
            </button>
          </div>

          <div className="overview-list">
            {requisitions.slice(0, 4).map((req) => (
              <div key={req.id} className="overview-list-row">
                <div className="overview-list-main">
                  <span className="font-mono text-xs font-bold text-accent">{req.folio}</span>
                  <strong>{req.department}</strong>
                  <small className="text-muted">
                    {req.requestedBy} · {req.items.length} partidas · Requerida {req.neededByDate}
                  </small>
                </div>
                <div className="overview-list-end">
                  <strong className="font-mono tabular-nums">{money(req.estimatedTotal)}</strong>
                  <span className="purchases-status-inline">
                    {req.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="overview-panel-card">
          <div className="panel-heading">
            <div>
              <div className="panel-kicker">SINCRONIZACIÓN CON TESORERÍA</div>
              <h2>Facturas de proveedor y CxP</h2>
            </div>
            <button
              type="button"
              className="text-link"
              onClick={() => onNavigateSection('Facturas')}
            >
              Ver facturas <ArrowRight size={13} />
            </button>
          </div>

          <div className="overview-list">
            {linkedPayables.slice(0, 3).map((bill) => (
              <div key={bill.id} className="overview-list-row">
                <div className="overview-list-main">
                  <span className="font-mono text-xs font-bold text-accent">{bill.folio}</span>
                  <strong>{bill.supplierCompany}</strong>
                  <small className="text-muted">
                    OC {bill.purchaseOrderFolio || 'Directa'} · Vence {bill.dueDate}
                  </small>
                </div>
                <div className="overview-list-end">
                  <strong className="font-mono tabular-nums">{money(bill.balance)}</strong>
                  <span className="purchases-status-inline">{bill.status}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="purchases-footer-link-row">
            <button
              type="button"
              className="button button-ghost button-sm"
              onClick={onNavigateFinancePayables}
            >
              <Building2 size={13} /> Ir a Cuentas por pagar en Finanzas
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
