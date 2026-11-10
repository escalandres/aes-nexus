import { useState, useMemo } from 'react'
import {
  CalendarDays,
  ChevronDown,
  Plus,
  ArrowUpRight,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Package,
  Truck,
  CreditCard,
  Landmark,
  Scale,
  Sparkles,
  CheckCircle2,
  Clock3,
  Users,
  FileText,
  FileSpreadsheet,
  ShieldAlert,
  Percent,
  UserPlus,
  Trophy,
  Mail,
  Send,
  Trash2,
  X,
  Check,
  Sliders,
} from 'lucide-react'
import type { SalesOrder, Quote } from '../data/sales'
import type { InventoryItemLocation } from '../data/operations'
import type {
  InvoiceReceivable,
  BillPayable,
  ExpenseRecord,
  BankAccount,
  ChartAccount,
} from '../data/finance'
import type { Opportunity } from '../data/dashboard'
import { RevenueTargetChart } from './RevenueTargetChart'
import { useToast } from './Toast'

interface ExecutiveDashboardProps {
  orders: SalesOrder[]
  quotes: Quote[]
  inventory: InventoryItemLocation[]
  receivables: InvoiceReceivable[]
  payables: BillPayable[]
  expenses: ExpenseRecord[]
  bankAccounts: BankAccount[]
  chartAccounts: ChartAccount[]
  opportunities: Opportunity[]
  activities: Array<{
    title: string
    company: string
    time: string
    icon: string
    tone: string
  }>
  onNavigateSales: (section: 'Catálogo' | 'Cotizaciones' | 'Pedidos' | 'Resumen') => void
  onNavigateOperations: (section: 'Inventario' | 'Compras' | 'Entregas' | 'Resumen') => void
  onNavigateFinance: (
    section: 'Cobros' | 'Pagos' | 'Gastos' | 'Cuentas contables' | 'Resumen'
  ) => void
  onNavigateCrm: (section?: string) => void
  onOpenCreateOpportunity: () => void
}

const money = (val: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(val)

export function ExecutiveDashboard({
  orders,
  quotes: _quotes,
  inventory,
  receivables,
  payables,
  expenses,
  bankAccounts,
  chartAccounts: _chartAccounts,
  opportunities,
  activities,
  onNavigateSales,
  onNavigateOperations,
  onNavigateFinance,
  onNavigateCrm,
  onOpenCreateOpportunity,
}: ExecutiveDashboardProps) {
  const toast = useToast()
  const [period, setPeriod] = useState<'Este mes' | 'Este trimestre' | 'Año 2026'>('Este mes')
  const [showAlertHub, setShowAlertHub] = useState(true)

  // Panel Rápido: Notificaciones de Correo para Umbrales de Stock
  const [showEmailNotifyPanel, setShowEmailNotifyPanel] = useState(false)
  const [emailConfig, setEmailConfig] = useState<{
    enabled: boolean
    recipients: string[]
    frequency: 'immediate' | 'daily_morning' | 'daily_evening'
    alertTrigger: 'at_threshold' | 'below_zero'
    includePurchaseLink: boolean
    includeAttachment: boolean
    selectedWarehouse: string
  }>(() => {
    try {
      const saved = localStorage.getItem('nexus_stock_email_alerts_config')
      if (saved) return JSON.parse(saved)
    } catch {
      // fallback
    }
    return {
      enabled: true,
      recipients: ['andres.escala.344@gmail.com', 'compras@nexus.mx'],
      frequency: 'immediate',
      alertTrigger: 'at_threshold',
      includePurchaseLink: true,
      includeAttachment: false,
      selectedWarehouse: 'all',
    }
  })

  const [newEmailInput, setNewEmailInput] = useState('')
  const [newEmailError, setNewEmailError] = useState('')
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [lastTestSentAt, setLastTestSentAt] = useState<string | null>(null)
  const [showPreviewTemplate, setShowPreviewTemplate] = useState(false)

  const handleToggleEnabled = () => {
    const nextEnabled = !emailConfig.enabled
    const next = { ...emailConfig, enabled: nextEnabled }
    setEmailConfig(next)
    localStorage.setItem('nexus_stock_email_alerts_config', JSON.stringify(next))
    if (nextEnabled) {
      toast.success(
        'Alertas por correo electrónico activadas. Se notificará a los destinatarios cuando las existencias alcancen su umbral mínimo.',
        'Notificaciones por correo habilitadas'
      )
    } else {
      toast.info(
        'Alertas por correo electrónico pausadas. Solo se mostrarán alertas visuales en pantalla.',
        'Notificaciones en pausa'
      )
    }
  }

  const handleAddRecipient = () => {
    const email = newEmailInput.trim().toLowerCase()
    if (!email) return
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setNewEmailError('Ingresa una dirección de correo válida (ej. usuario@dominio.com)')
      return
    }
    if (emailConfig.recipients.includes(email)) {
      setNewEmailError('Esta dirección ya se encuentra en la lista de destinatarios')
      return
    }
    const next = { ...emailConfig, recipients: [...emailConfig.recipients, email] }
    setEmailConfig(next)
    localStorage.setItem('nexus_stock_email_alerts_config', JSON.stringify(next))
    setNewEmailInput('')
    setNewEmailError('')
    toast.success(`Se agregó ${email} a la lista de destinatarios.`, 'Destinatario añadido')
  }

  const handleRemoveRecipient = (emailToRemove: string) => {
    if (emailConfig.recipients.length <= 1) {
      toast.warning('Debe existir al menos un destinatario para despachar alertas.', 'Acción no permitida')
      return
    }
    const next = {
      ...emailConfig,
      recipients: emailConfig.recipients.filter((r) => r !== emailToRemove),
    }
    setEmailConfig(next)
    localStorage.setItem('nexus_stock_email_alerts_config', JSON.stringify(next))
    toast.info(`Se eliminó ${emailToRemove} de la lista de alertas.`, 'Destinatario eliminado')
  }

  const handleSaveConfig = () => {
    localStorage.setItem('nexus_stock_email_alerts_config', JSON.stringify(emailConfig))
    toast.success(
      `Configuración de notificaciones guardada. ${
        emailConfig.enabled
          ? `Alertas activas para ${emailConfig.recipients.length} destinatario(s).`
          : 'Alertas por correo desactivadas.'
      }`,
      'Preferencias actualizadas'
    )
    setShowEmailNotifyPanel(false)
  }

  const handleSendTestEmail = () => {
    if (emailConfig.recipients.length === 0) {
      toast.warning('Agrega al menos un destinatario para realizar la prueba.', 'Sin destinatarios')
      return
    }
    setIsSendingTest(true)
    setTimeout(() => {
      setIsSendingTest(false)
      const now = new Date()
      const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
      setLastTestSentAt(timeStr)
      const count = lowStockItems.length > 0 ? lowStockItems.length : 1
      toast.success(
        `Correo de prueba despachado a ${emailConfig.recipients.join(', ')} con el reporte de ${count} producto(s) en umbral mínimo.`,
        'Prueba de correo enviada'
      )
    }, 450)
  }

  // Dynamic Greeting & Localized Date in Spanish
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días, Andrea'
    if (hour < 19) return 'Buenas tardes, Andrea'
    return 'Buenas noches, Andrea'
  }, [])

  const formattedDate = useMemo(() => {
    const now = new Date()
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }
    const str = new Intl.DateTimeFormat('es-MX', options).format(now)
    return str.toUpperCase()
  }, [])

  // Top Sales KPIs (Ventas, Margen, Clientes, Oportunidades)
  const monthlySales = useMemo(() => {
    const sum = orders.reduce((acc, o) => acc + (o.total || 0), 0)
    return Math.max(sum, 284500)
  }, [orders])

  const grossMarginPercent = 38.4
  const grossMarginValue = useMemo(() => {
    return Math.round(monthlySales * (grossMarginPercent / 100))
  }, [monthlySales])

  const newClientsCount = 5
  const totalClientsActive = 14

  const wonOpportunitiesCount = 8
  const wonOpportunitiesValue = 194200

  // KPI 2: Cuentas por Cobrar Pendientes
  const totalReceivableBalance = useMemo(() => {
    return receivables.reduce((acc, r) => acc + (r.balance || 0), 0)
  }, [receivables])

  // KPI 3: Disponibilidad en Bancos (Tesorería)
  const totalCashInBanks = useMemo(() => {
    return bankAccounts.reduce((acc, b) => acc + b.balance, 0)
  }, [bankAccounts])

  // KPI 4: Valoración de Inventario en Almacén
  const totalInventoryValue = useMemo(() => {
    return inventory.reduce((acc, item) => acc + item.stock * item.cost, 0)
  }, [inventory])

  // Operational Alerts ("Semáforo Ejecutivo")
  const lowStockItems = useMemo(() => {
    return inventory.filter((item) => item.stock <= item.minStock)
  }, [inventory])

  const overdueInvoices = useMemo(() => {
    return receivables.filter((r) => r.status === 'Vencida' && r.balance > 0)
  }, [receivables])

  const pendingDeliveries = useMemo(() => {
    return orders.filter(
      (o) => o.status === 'En preparación' || o.status === 'Confirmado'
    )
  }, [orders])

  const pendingPayablesCount = useMemo(() => {
    return payables.filter((p) => p.status === 'Pendiente' || p.status === 'Vencida')
  }, [payables])

  const totalAlertsCount =
    (lowStockItems.length > 0 ? 1 : 0) +
    (overdueInvoices.length > 0 ? 1 : 0) +
    (pendingDeliveries.length > 0 ? 1 : 0) +
    (pendingPayablesCount.length > 0 ? 1 : 0)

  return (
    <div className="executive-dashboard-container">
      {/* Top Welcome Strip */}
      <section className="welcome-row">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" /> {formattedDate}
          </div>
          <h1>
            {greeting}
            <span className="wave">✳</span>
          </h1>
          <p className="welcome-subtitle">
            Aquí tienes el pulso ejecutivo de tu negocio en tiempo real. <span>Todo en orden.</span>
          </p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              const next =
                period === 'Este mes'
                  ? 'Este trimestre'
                  : period === 'Este trimestre'
                  ? 'Año 2026'
                  : 'Este mes'
              setPeriod(next)
              toast.info(`Período de análisis actualizado a: ${next}`, 'Filtro temporal')
            }}
          >
            <CalendarDays size={15} />
            {period}
            <ChevronDown size={14} />
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={onOpenCreateOpportunity}
          >
            <Plus size={16} /> Nueva oportunidad
          </button>
        </div>
      </section>

      {/* Alerta Visual Prioritaria: Stock por debajo del Umbral Mínimo */}
      {lowStockItems.length > 0 && (
        <aside className="executive-stock-alert-banner" role="alert">
          <div className="stock-alert-banner-left">
            <div className="stock-alert-icon-pulse">
              <AlertTriangle size={18} />
            </div>
            <div className="stock-alert-text-block">
              <div className="stock-alert-banner-header">
                <span className="stock-alert-tag-kicker">Alerta Visual · Control de Stock</span>
                <strong className="stock-alert-banner-title">
                  {lowStockItems.length === 1
                    ? '1 producto ha caído en o por debajo de su umbral mínimo configurado'
                    : `${lowStockItems.length} productos han caído en o por debajo de su umbral mínimo configurado`}
                </strong>
                <span className="stock-alert-pill-count">{lowStockItems.length} en nivel crítico</span>
              </div>
              <p className="stock-alert-banner-desc">
                La cantidad física disponible alcanzó o cayó por debajo del umbral mínimo de seguridad configurado en Operaciones.
                Se requiere reorden o compra para prevenir roturas de inventario.
              </p>
              <div className="stock-alert-items-list">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="stock-alert-chip">
                    <span className="sku-tag">{item.sku}</span>
                    <span className="item-name">{item.name}</span>
                    <span className="wh-tag">({item.warehouseName})</span>
                    <span className="stock-badge-critical">
                      <strong>{item.stock} {item.unitOfMeasure}</strong> disp. / Umbral mín. <strong>{item.minStock}</strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="stock-alert-banner-actions">
            <button
              type="button"
              className="button button-secondary stock-banner-notify-btn"
              onClick={() => setShowEmailNotifyPanel(true)}
              title="Configurar notificaciones de correo para este umbral de stock"
            >
              <Mail size={13} /> {emailConfig.enabled ? `Avisos de correo activos (${emailConfig.recipients.length})` : 'Configurar avisos de correo'}
            </button>
            <button
              type="button"
              className="button button-primary stock-banner-action-btn"
              onClick={() => onNavigateOperations('Inventario')}
            >
              <Package size={14} /> Gestionar en Inventario &rarr;
            </button>
          </div>
        </aside>
      )}

      {/* Executive Quick Actions Bar */}
      <section className="quick-actions-strip" aria-label="Acciones rápidas del negocio">
        <span className="quick-actions-label">Accesos rápidos:</span>
        <button
          type="button"
          className="quick-action-item"
          onClick={() => onNavigateSales('Cotizaciones')}
        >
          <FileText size={13} /> Nueva cotización
        </button>
        <button
          type="button"
          className="quick-action-item"
          onClick={() => onNavigateSales('Pedidos')}
        >
          <Truck size={13} /> Nuevo pedido
        </button>
        <button
          type="button"
          className="quick-action-item"
          onClick={() => onNavigateFinance('Cobros')}
        >
          <CreditCard size={13} /> Registrar cobro
        </button>
        <button
          type="button"
          className="quick-action-item"
          onClick={() => onNavigateFinance('Gastos')}
        >
          <Scale size={13} /> Registrar gasto
        </button>
        <button
          type="button"
          className="quick-action-item"
          onClick={() => onNavigateOperations('Inventario')}
        >
          <Package size={13} /> Ajustar inventario
        </button>
        <button
          type="button"
          className="quick-action-item"
          onClick={() => onNavigateFinance('Cuentas contables')}
        >
          <FileSpreadsheet size={13} /> Catálogo de cuentas
        </button>
        <button
          type="button"
          className="quick-action-item"
          onClick={() => setShowEmailNotifyPanel(true)}
          title="Panel rápido: configurar alertas automáticas de stock por correo"
        >
          <Mail size={13} /> Alertas de stock por correo {emailConfig.enabled && <span className="mini-active-dot" title="Alertas de correo activadas" />}
        </button>
      </section>

      {/* Operational Alert Hub ("Semáforo Ejecutivo") */}
      {showAlertHub && (
        <section className="executive-alert-hub" aria-label="Semáforo operativo">
          <div className="alert-hub-header">
            <span className="alert-hub-title">
              <ShieldAlert size={14} style={{ color: totalAlertsCount > 0 ? '#ba4836' : '#3c7d5c' }} />
              Semáforo Operativo y Financiero ({totalAlertsCount} avisos prioritarios)
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="email-hub-tag-btn"
                onClick={() => setShowEmailNotifyPanel(true)}
                title="Configurar notificaciones de correo para umbrales de stock"
              >
                <Mail size={11} /> Correo: <strong className={emailConfig.enabled ? 'text-positive' : 'text-muted'}>{emailConfig.enabled ? `${emailConfig.recipients.length} suscritos` : 'Pausado'}</strong>
              </button>
              <button
                type="button"
                className="text-link"
                style={{ fontSize: '8.5px' }}
                onClick={() => setShowAlertHub(false)}
              >
                Ocultar alertas
              </button>
            </div>
          </div>

          <div className="alert-hub-grid">
            {/* Alert 1: Cobranza Vencida */}
            <article className="executive-alert-card">
              <div>
                <div className="alert-card-top">
                  <span
                    className={`alert-status-badge ${
                      overdueInvoices.length > 0 ? 'alert' : 'ok'
                    }`}
                  >
                    {overdueInvoices.length > 0 ? (
                      <>
                        <AlertTriangle size={11} /> Cobranza en riesgo
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={11} /> Al día
                      </>
                    )}
                  </span>
                  <span style={{ fontSize: '8px', color: '#88958c' }}>Finanzas</span>
                </div>
                <div className="alert-card-copy">
                  <strong>
                    {overdueInvoices.length > 0
                      ? `${overdueInvoices.length} facturas vencidas`
                      : 'Sin facturas vencidas'}
                  </strong>
                  <span>
                    {overdueInvoices.length > 0
                      ? `${money(
                          overdueInvoices.reduce((sum, r) => sum + r.balance, 0)
                        )} requieren gestión inmediata.`
                      : 'Todos los clientes mantienen sus pagos al corriente.'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="alert-action-btn"
                onClick={() => onNavigateFinance('Cobros')}
              >
                Ver módulo de cobros <ArrowRight size={11} />
              </button>
            </article>

            {/* Alert 2: Stock Crítico */}
            <article className={`executive-alert-card ${lowStockItems.length > 0 ? 'card-alert-critical' : ''}`}>
              <div>
                <div className="alert-card-top">
                  <span
                    className={`alert-status-badge ${
                      lowStockItems.length > 0 ? 'alert' : 'ok'
                    }`}
                  >
                    {lowStockItems.length > 0 ? (
                      <>
                        <AlertTriangle size={11} /> Reorden requerido
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={11} /> Stock óptimo
                      </>
                    )}
                  </span>
                  <span style={{ fontSize: '8px', color: '#88958c' }}>Almacén</span>
                </div>
                <div className="alert-card-copy">
                  <strong>
                    {lowStockItems.length > 0
                      ? `${lowStockItems.length} producto${lowStockItems.length > 1 ? 's' : ''} bajo umbral mínimo`
                      : 'Inventario en niveles normales'}
                  </strong>
                  <span>
                    {lowStockItems.length > 0
                      ? `${lowStockItems.map((i) => `${i.sku} (${i.stock}/${i.minStock} mín.)`).slice(0, 2).join(', ')}${
                          lowStockItems.length > 2 ? ` y ${lowStockItems.length - 2} más` : ''
                        } por debajo del umbral mínimo.`
                      : 'Todos los productos superan su umbral mínimo de seguridad.'}
                  </span>
                </div>
              </div>
              <div className="alert-card-footer-btns">
                <button
                  type="button"
                  className="alert-action-btn"
                  onClick={() => onNavigateOperations('Inventario')}
                >
                  Ver inventario <ArrowRight size={11} />
                </button>
                <button
                  type="button"
                  className="alert-sub-btn"
                  onClick={() => setShowEmailNotifyPanel(true)}
                  title="Configurar avisos de correo para stock mínimo"
                >
                  <Mail size={10} /> Avisos por correo
                </button>
              </div>
            </article>

            {/* Alert 3: Pedidos en preparación */}
            <article className="executive-alert-card">
              <div>
                <div className="alert-card-top">
                  <span
                    className={`alert-status-badge ${
                      pendingDeliveries.length > 0 ? 'info' : 'ok'
                    }`}
                  >
                    <Truck size={11} />
                    {pendingDeliveries.length > 0 ? 'Por despachar' : 'Al día'}
                  </span>
                  <span style={{ fontSize: '8px', color: '#88958c' }}>Ventas</span>
                </div>
                <div className="alert-card-copy">
                  <strong>{pendingDeliveries.length} pedidos en preparación</strong>
                  <span>
                    Compromisos de entrega activos con clientes confirmados.
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="alert-action-btn"
                onClick={() => onNavigateSales('Pedidos')}
              >
                Ver pedidos de venta <ArrowRight size={11} />
              </button>
            </article>

            {/* Alert 4: Pagos a Proveedores */}
            <article className="executive-alert-card">
              <div>
                <div className="alert-card-top">
                  <span
                    className={`alert-status-badge ${
                      pendingPayablesCount.length > 0 ? 'warning' : 'ok'
                    }`}
                  >
                    <CreditCard size={11} />
                    {pendingPayablesCount.length > 0 ? 'Por liquidar' : 'Sin pendientes'}
                  </span>
                  <span style={{ fontSize: '8px', color: '#88958c' }}>Tesorería</span>
                </div>
                <div className="alert-card-copy">
                  <strong>
                    {pendingPayablesCount.length} facturas de proveedores
                  </strong>
                  <span>
                    Saldo total a liquidar:{' '}
                    {money(pendingPayablesCount.reduce((s, p) => s + p.balance, 0))}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="alert-action-btn"
                onClick={() => onNavigateFinance('Pagos')}
              >
                Ver cuentas por pagar <ArrowRight size={11} />
              </button>
            </article>
          </div>
        </section>
      )}

      {/* Fila Superior de KPIs Clave para Ventas */}
      <section className="kpi-grid sales-kpi-grid" aria-label="KPIs clave para ventas">
        {/* KPI 1: Ventas Totales del Mes */}
        <article
          className="kpi-card kpi-featured kpi-card-clickable"
          role="button"
          tabIndex={0}
          onClick={() => onNavigateSales('Pedidos')}
          onKeyDown={(e) => e.key === 'Enter' && onNavigateSales('Pedidos')}
          title="Ver pedidos de venta del mes"
        >
          <div className="kpi-top">
            <span>Ventas Totales del Mes</span>
            <span className="kpi-icon">
              <TrendingUp size={16} />
            </span>
          </div>
          <div className="kpi-value">
            {money(monthlySales)}
            <span className="kpi-currency"> MXN</span>
          </div>
          <p className="kpi-subtext">{orders.length} pedidos confirmados este mes</p>
          <div className="kpi-foot">
            <span className="trend trend-up">
              <ArrowUpRight size={13} /> +12.8%
            </span>
            <span>vs. mes anterior</span>
            <span className="kpi-click-hint">
              Ver pedidos <ArrowRight size={11} />
            </span>
          </div>
        </article>

        {/* KPI 2: Margen Bruto */}
        <article
          className="kpi-card kpi-card-clickable"
          role="button"
          tabIndex={0}
          onClick={() => onNavigateSales('Resumen')}
          onKeyDown={(e) => e.key === 'Enter' && onNavigateSales('Resumen')}
          title="Ver análisis de rentabilidad y margen comercial"
        >
          <div className="kpi-top">
            <span>Margen Bruto</span>
            <span className="kpi-icon icon-green">
              <Percent size={16} />
            </span>
          </div>
          <div className="kpi-value">
            {grossMarginPercent}%
            <span className="kpi-currency"> ({money(grossMarginValue)})</span>
          </div>
          <p className="kpi-subtext">Utilidad bruta sobre facturación comercial</p>
          <div className="kpi-foot">
            <span className="trend trend-up">
              <ArrowUpRight size={13} /> +2.1 pts
            </span>
            <span>vs. mes anterior</span>
            <span className="kpi-click-hint">
              Ver margen <ArrowRight size={11} />
            </span>
          </div>
        </article>

        {/* KPI 3: Nuevos Clientes */}
        <article
          className="kpi-card kpi-card-clickable"
          role="button"
          tabIndex={0}
          onClick={() => onNavigateCrm('Clientes')}
          onKeyDown={(e) => e.key === 'Enter' && onNavigateCrm('Clientes')}
          title="Ver directorio de nuevos clientes"
        >
          <div className="kpi-top">
            <span>Nuevos Clientes</span>
            <span className="kpi-icon icon-lilac">
              <UserPlus size={16} />
            </span>
          </div>
          <div className="kpi-value">
            {newClientsCount}
            <span className="kpi-currency"> nuevos</span>
          </div>
          <p className="kpi-subtext">{totalClientsActive} clientes activos en cartera</p>
          <div className="kpi-foot">
            <span className="trend trend-up">
              <ArrowUpRight size={13} /> +3 cuentas
            </span>
            <span>vs. mes anterior</span>
            <span className="kpi-click-hint">
              Ver clientes <ArrowRight size={11} />
            </span>
          </div>
        </article>

        {/* KPI 4: Oportunidades Ganadas */}
        <article
          className="kpi-card kpi-card-clickable"
          role="button"
          tabIndex={0}
          onClick={() => onNavigateCrm('Oportunidades')}
          onKeyDown={(e) => e.key === 'Enter' && onNavigateCrm('Oportunidades')}
          title="Ver oportunidades comerciales ganadas"
        >
          <div className="kpi-top">
            <span>Oportunidades Ganadas</span>
            <span className="kpi-icon icon-sand">
              <Trophy size={16} />
            </span>
          </div>
          <div className="kpi-value">
            {wonOpportunitiesCount}
            <span className="kpi-currency"> ({money(wonOpportunitiesValue)})</span>
          </div>
          <p className="kpi-subtext">Tasa de conversión del pipeline: 34.2%</p>
          <div className="kpi-foot">
            <span className="trend trend-up">
              <ArrowUpRight size={13} /> +18.5%
            </span>
            <span>vs. mes anterior</span>
            <span className="kpi-click-hint">
              Ver pipeline <ArrowRight size={11} />
            </span>
          </div>
        </article>
      </section>

      {/* Tira Secundaria de Resumen Operativo y Financiero */}
      <section className="ops-summary-strip" aria-label="Balance operativo y financiero">
        <div
          className="ops-summary-item"
          role="button"
          tabIndex={0}
          onClick={() => onNavigateFinance('Cobros')}
          onKeyDown={(e) => e.key === 'Enter' && onNavigateFinance('Cobros')}
          title="Ver cuentas por cobrar"
        >
          <div className="ops-summary-item-left">
            <CreditCard size={15} style={{ color: '#356fa6' }} />
            <div>
              <span>Cuentas por cobrar:</span>
              <strong>{money(totalReceivableBalance)}</strong>
            </div>
          </div>
          <span className="text-link" style={{ fontSize: '8.5px' }}>
            {receivables.filter((r) => r.balance > 0).length} pendientes <ArrowRight size={10} />
          </span>
        </div>

        <div
          className="ops-summary-item"
          role="button"
          tabIndex={0}
          onClick={() => onNavigateFinance('Resumen')}
          onKeyDown={(e) => e.key === 'Enter' && onNavigateFinance('Resumen')}
          title="Ver tesorería y cuentas bancarias"
        >
          <div className="ops-summary-item-left">
            <Landmark size={15} style={{ color: '#a08362' }} />
            <div>
              <span>Disponibilidad en bancos:</span>
              <strong>{money(totalCashInBanks)}</strong>
            </div>
          </div>
          <span className="text-link" style={{ fontSize: '8.5px' }}>
            {bankAccounts.length} cuentas <ArrowRight size={10} />
          </span>
        </div>

        <div
          className="ops-summary-item"
          role="button"
          tabIndex={0}
          onClick={() => onNavigateOperations('Inventario')}
          onKeyDown={(e) => e.key === 'Enter' && onNavigateOperations('Inventario')}
          title="Ver inventario valorado"
        >
          <div className="ops-summary-item-left">
            <Package size={15} style={{ color: lowStockItems.length > 0 ? '#ba4836' : '#3c7d5c' }} />
            <div>
              <span>Inventario valorado:</span>
              <strong>{money(totalInventoryValue)}</strong>
            </div>
          </div>
          <span
            className={`text-link ${lowStockItems.length > 0 ? 'text-alert' : ''}`}
            style={{ fontSize: '8.5px', fontWeight: lowStockItems.length > 0 ? 700 : 500 }}
          >
            {lowStockItems.length > 0
              ? `⚠️ ${lowStockItems.length} bajo umbral mín.`
              : `${inventory.length} referencias`} <ArrowRight size={10} />
          </span>
        </div>
      </section>

      {/* Main Grid: Revenue & Target Recharts Chart + Activities + CRM Opportunities */}
      <section className="dashboard-grid">
        {/* Enhanced Recharts Revenue Chart */}
        <RevenueTargetChart
          orders={orders}
          receivables={receivables}
          expenses={expenses}
        />

        {/* Agenda / Next Follow-ups */}
        <article className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <div className="panel-kicker">EN TU AGENDA</div>
              <h2>Lo que sigue</h2>
            </div>
            <button
              type="button"
              className="text-link"
              onClick={() => onNavigateCrm('Actividades')}
            >
              Ver agenda <ArrowRight size={14} />
            </button>
          </div>
          <div className="today-label">
            <span>HOY</span>
            <span>{new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }).toUpperCase()}</span>
          </div>
          <div className="activity-list">
            {activities.map((activity) => (
              <div className="activity-row" key={activity.title}>
                <div className={`activity-icon tone-${activity.tone}`}>
                  {activity.icon === 'send' ? (
                    <ArrowRight size={15} />
                  ) : activity.icon === 'phone' ? (
                    <Clock3 size={15} />
                  ) : (
                    <Users size={15} />
                  )}
                </div>
                <div className="activity-copy">
                  <strong>{activity.title}</strong>
                  <span>{activity.company}</span>
                </div>
                <time>{activity.time}</time>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="add-activity"
            onClick={() => {
              toast.info(
                'Puedes programar nuevas actividades en el módulo CRM > Actividades.',
                'Agenda comercial'
              )
              onNavigateCrm('Actividades')
            }}
          >
            <Plus size={15} /> Agregar actividad comercial
          </button>
          <div className="activity-note">
            <span className="note-spark">
              <Sparkles size={14} />
            </span>
            <p>
              Un seguimiento a tiempo con tus cuentas clave puede aumentar la conversión hasta en 35%.
            </p>
          </div>
        </article>

        {/* Bank Accounts Mini Summary */}
        <div style={{ gridColumn: '1 / -1' }} className="bank-summary-card">
          <div className="bank-summary-header">
            <h3>Disponibilidad en Cuentas Bancarias</h3>
            <button
              type="button"
              className="text-link"
              onClick={() => onNavigateFinance('Resumen')}
            >
              Gestionar tesorería <ArrowRight size={12} />
            </button>
          </div>
          <div className="bank-accounts-list">
            {bankAccounts.map((acc) => (
              <div key={acc.id} className="bank-mini-item">
                <span className="bank-mini-name">{acc.bankName} · {acc.accountNumber}</span>
                <span className="bank-mini-balance">{money(acc.balance)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent CRM Opportunities */}
        <article className="panel opportunities-panel">
          <div className="panel-heading">
            <div>
              <div className="panel-kicker">SEGUIMIENTO COMERCIAL</div>
              <h2>Oportunidades recientes</h2>
              <p className="panel-subtitle">Las conversaciones más activas de tu equipo</p>
            </div>
            <button
              type="button"
              className="text-link"
              onClick={() => onNavigateCrm('Oportunidades')}
            >
              Ver todas <ArrowRight size={14} />
            </button>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>EMPRESA</th>
                  <th>ETAPA</th>
                  <th>VALOR ESTIMADO</th>
                  <th>ACTUALIZACIÓN</th>
                  <th style={{ textAlign: 'right' }}>ACCIÓN</th>
                </tr>
              </thead>
              <tbody>
                {opportunities.map((opportunity) => (
                  <tr key={opportunity.company}>
                    <td>
                      <div className="company-cell">
                        <div className={`company-avatar ${opportunity.color}`}>
                          {opportunity.initials}
                        </div>
                        <div>
                          <strong>{opportunity.company}</strong>
                          <span>{opportunity.person}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`stage-badge stage-${opportunity.stageTone}`}>
                        <i />
                        {opportunity.stage}
                      </span>
                    </td>
                    <td className="money-cell">{money(opportunity.value)}</td>
                    <td className="date-cell">{opportunity.date}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="button button-secondary"
                        style={{ minHeight: '26px', padding: '0 8px', fontSize: '8.5px' }}
                        onClick={() => onNavigateCrm('Oportunidades')}
                      >
                        Ver en CRM
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="table-footer"
            onClick={() => onNavigateCrm('Oportunidades')}
          >
            Ver pipeline completo en CRM <ArrowRight size={14} />
          </button>
        </article>
      </section>

      <footer className="page-footer">
        <span>Última sincronización en tiempo real · Datos conectados al ERP</span>
        <span>
          <Sparkles size={12} /> AES Nexus · Gestión clara y precisa para tu negocio.
        </span>
      </footer>

      {/* Panel Rápido: Notificaciones de Correo para Umbrales de Stock */}
      {showEmailNotifyPanel && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowEmailNotifyPanel(false)
          }}
        >
          <section className="create-modal modal-wide email-notify-modal" role="dialog" aria-modal="true">
            <div className="create-modal-heading">
              <div className="notify-modal-header-icon-wrap">
                <div className="notify-header-icon-box">
                  <Mail size={22} />
                </div>
                <div>
                  <div className="panel-kicker">CONTROL DE INVENTARIO · AUTOMATIZACIÓN DE AVISOS</div>
                  <h2>Notificaciones por correo para umbrales de stock</h2>
                  <p>
                    Recibe avisos automáticos en tu bandeja de entrada en cuanto las existencias alcancen o rompan su umbral de seguridad, evitando depender únicamente de la alerta en pantalla.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowEmailNotifyPanel(false)}
                aria-label="Cerrar panel de notificaciones"
              >
                <X size={18} />
              </button>
            </div>

            <div className="email-notify-body">
              {/* Switch Principal: Estado de las notificaciones */}
              <div className={`notify-status-banner ${emailConfig.enabled ? 'banner-active' : 'banner-inactive'}`}>
                <div className="notify-status-text">
                  <div className="notify-status-label-row">
                    <span className={`status-indicator-dot ${emailConfig.enabled ? 'dot-active' : 'dot-inactive'}`} />
                    <strong>{emailConfig.enabled ? 'Alertas por correo activadas' : 'Alertas por correo pausadas'}</strong>
                    <span className="status-badge-pill">
                      {emailConfig.enabled ? 'En tiempo real' : 'Inactivo'}
                    </span>
                  </div>
                  <p>
                    {emailConfig.enabled
                      ? `El sistema enviará un correo con el detalle de existencias a los destinatarios configurados cada vez que un producto alcance su umbral mínimo.`
                      : 'No se enviarán correos electrónicos cuando el inventario caiga por debajo del stock mínimo. Solo se mostrará la alerta en el dashboard.'}
                  </p>
                </div>
                <label className="toggle-switch-wrap" title={emailConfig.enabled ? 'Desactivar notificaciones' : 'Activar notificaciones'}>
                  <input
                    type="checkbox"
                    checked={emailConfig.enabled}
                    onChange={handleToggleEnabled}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              {/* Formulario de Configuración */}
              <div className="notify-config-grid">
                {/* Columna Izquierda: Destinatarios & Alcance */}
                <div className="notify-config-col">
                  <div className="notify-card-box">
                    <div className="notify-card-title-row">
                      <h4>
                        <Users size={13} /> Destinatarios de correo ({emailConfig.recipients.length})
                      </h4>
                      <small>¿Quiénes recibirán el aviso?</small>
                    </div>

                    {/* Lista de Destinatarios */}
                    <div className="recipients-list">
                      {emailConfig.recipients.map((rec) => (
                        <div key={rec} className="recipient-chip">
                          <Mail size={11} className="chip-icon" />
                          <span className="chip-email">{rec}</span>
                          {rec === 'andres.escala.344@gmail.com' && (
                            <span className="chip-badge-primary">Principal</span>
                          )}
                          <button
                            type="button"
                            className="chip-remove-btn"
                            onClick={() => handleRemoveRecipient(rec)}
                            title={`Eliminar ${rec}`}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Agregar nuevo destinatario */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        handleAddRecipient()
                      }}
                      className="add-recipient-row"
                    >
                      <div className="add-email-input-wrap">
                        <input
                          type="email"
                          placeholder="nuevo.destinatario@empresa.com"
                          value={newEmailInput}
                          onChange={(e) => {
                            setNewEmailInput(e.target.value)
                            if (newEmailError) setNewEmailError('')
                          }}
                        />
                        <button
                          type="submit"
                          className="button button-secondary button-add-email"
                          disabled={!newEmailInput.trim()}
                        >
                          <Plus size={13} /> Agregar
                        </button>
                      </div>
                      {newEmailError && <span className="field-error-msg">{newEmailError}</span>}
                    </form>
                  </div>

                  {/* Alcance de Almacén */}
                  <div className="notify-card-box" style={{ marginTop: '12px' }}>
                    <div className="notify-card-title-row">
                      <h4>
                        <Package size={13} /> Alcance de almacenes
                      </h4>
                      <small>Filtra qué almacenes disparan el correo</small>
                    </div>

                    <select
                      className="notify-select"
                      value={emailConfig.selectedWarehouse}
                      onChange={(e) => {
                        const next = { ...emailConfig, selectedWarehouse: e.target.value }
                        setEmailConfig(next)
                        localStorage.setItem('nexus_stock_email_alerts_config', JSON.stringify(next))
                      }}
                    >
                      <option value="all">Todos los almacenes logísticos (Vallejo + Monterrey)</option>
                      <option value="wh_central">Solo Almacén Central Vallejo</option>
                      <option value="wh_norte">Solo Almacén Norte Monterrey</option>
                    </select>
                  </div>
                </div>

                {/* Columna Derecha: Frecuencia & Criterios */}
                <div className="notify-config-col">
                  <div className="notify-card-box">
                    <div className="notify-card-title-row">
                      <h4>
                        <Clock3 size={13} /> Frecuencia de envío
                      </h4>
                      <small>Momento en el que se despacha el email</small>
                    </div>

                    <div className="frequency-options">
                      <label className={`freq-option-card ${emailConfig.frequency === 'immediate' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="emailFrequency"
                          value="immediate"
                          checked={emailConfig.frequency === 'immediate'}
                          onChange={() => {
                            const next = { ...emailConfig, frequency: 'immediate' as const }
                            setEmailConfig(next)
                            localStorage.setItem('nexus_stock_email_alerts_config', JSON.stringify(next))
                          }}
                        />
                        <div className="freq-content">
                          <div className="freq-title">
                            <strong>⚡ Inmediata</strong>
                            <span className="rec-pill">Recomendado</span>
                          </div>
                          <p>Se envía un correo al instante en cuanto un movimiento de salida o ajuste deje el stock en o por debajo del umbral mínimo.</p>
                        </div>
                      </label>

                      <label className={`freq-option-card ${emailConfig.frequency === 'daily_morning' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="emailFrequency"
                          value="daily_morning"
                          checked={emailConfig.frequency === 'daily_morning'}
                          onChange={() => {
                            const next = { ...emailConfig, frequency: 'daily_morning' as const }
                            setEmailConfig(next)
                            localStorage.setItem('nexus_stock_email_alerts_config', JSON.stringify(next))
                          }}
                        />
                        <div className="freq-content">
                          <div className="freq-title">
                            <strong>🌅 Resumen diario matutino (08:00 hrs)</strong>
                          </div>
                          <p>Un único correo matutino con el consolidado de todos los artículos que amanecen bajo el límite de seguridad.</p>
                        </div>
                      </label>

                      <label className={`freq-option-card ${emailConfig.frequency === 'daily_evening' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="emailFrequency"
                          value="daily_evening"
                          checked={emailConfig.frequency === 'daily_evening'}
                          onChange={() => {
                            const next = { ...emailConfig, frequency: 'daily_evening' as const }
                            setEmailConfig(next)
                            localStorage.setItem('nexus_stock_email_alerts_config', JSON.stringify(next))
                          }}
                        />
                        <div className="freq-content">
                          <div className="freq-title">
                            <strong>🌙 Resumen vespertino (18:00 hrs)</strong>
                          </div>
                          <p>Consolidado al cierre de operaciones para preparar órdenes de compra con proveedores al día siguiente.</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Criterios y Opciones adicionales */}
                  <div className="notify-card-box" style={{ marginTop: '12px' }}>
                    <div className="notify-card-title-row">
                      <h4>
                        <Sliders size={13} /> Contenido y opciones del correo
                      </h4>
                      <small>Personaliza el correo automático</small>
                    </div>

                    <div className="checkbox-options-list">
                      <label className="checkbox-option-row">
                        <input
                          type="checkbox"
                          checked={emailConfig.includePurchaseLink}
                          onChange={(e) => {
                            const next = { ...emailConfig, includePurchaseLink: e.target.checked }
                            setEmailConfig(next)
                            localStorage.setItem('nexus_stock_email_alerts_config', JSON.stringify(next))
                          }}
                        />
                        <div>
                          <strong>Incluir botón de compra automática</strong>
                          <span>Agrega un botón en el correo para crear la orden de compra con el proveedor predeterminado en 1 clic.</span>
                        </div>
                      </label>

                      <label className="checkbox-option-row">
                        <input
                          type="checkbox"
                          checked={emailConfig.includeAttachment}
                          onChange={(e) => {
                            const next = { ...emailConfig, includeAttachment: e.target.checked }
                            setEmailConfig(next)
                            localStorage.setItem('nexus_stock_email_alerts_config', JSON.stringify(next))
                          }}
                        />
                        <div>
                          <strong>Adjuntar reporte CSV/PDF de existencias</strong>
                          <span>Adjunta la hoja de cálculo con el kardex y rotación del producto alertado.</span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección de Prueba y Vista Previa del Correo */}
              <div className="notify-test-preview-box">
                <div className="test-preview-header">
                  <div className="test-preview-header-left">
                    <Mail size={14} style={{ color: '#456a61' }} />
                    <div>
                      <strong>Simulación y prueba de entrega</strong>
                      <p>Verifica cómo recibirán tus colaboradores el correo electrónico antes de activar las alertas automáticas.</p>
                    </div>
                  </div>

                  <div className="test-preview-actions">
                    <button
                      type="button"
                      className="button button-ghost"
                      onClick={() => setShowPreviewTemplate(!showPreviewTemplate)}
                    >
                      {showPreviewTemplate ? 'Ocultar plantilla' : 'Ver plantilla de correo'}
                    </button>
                    <button
                      type="button"
                      className="button button-secondary btn-send-test"
                      disabled={isSendingTest || !emailConfig.enabled || emailConfig.recipients.length === 0}
                      onClick={handleSendTestEmail}
                      title="Despachar un correo de prueba a los destinatarios configurados"
                    >
                      <Send size={13} /> {isSendingTest ? 'Enviando correo...' : 'Enviar correo de prueba ahora'}
                    </button>
                  </div>
                </div>

                {lastTestSentAt && (
                  <div className="test-sent-confirmation">
                    <CheckCircle2 size={13} style={{ color: '#3c7d5c' }} />
                    <span>Último correo de prueba despachado a las <strong>{lastTestSentAt}</strong> hacia <strong>{emailConfig.recipients.join(', ')}</strong>.</span>
                  </div>
                )}

                {/* Plantilla simulada de correo */}
                {showPreviewTemplate && (
                  <div className="email-preview-envelope">
                    <div className="email-preview-topbar">
                      <div>
                        <span className="email-meta-label">De:</span>
                        <span className="email-meta-val">AES Nexus ERP &lt;alertas-stock@nexus-erp.com&gt;</span>
                      </div>
                      <div>
                        <span className="email-meta-label">Para:</span>
                        <span className="email-meta-val">{emailConfig.recipients.join(', ')}</span>
                      </div>
                      <div>
                        <span className="email-meta-label">Asunto:</span>
                        <strong className="email-meta-val text-alert">
                          [ALERTA DE INVENTARIO] ⚠️ {lowStockItems.length > 0 ? lowStockItems.length : 1} producto(s) en o por debajo de su umbral mínimo de stock
                        </strong>
                      </div>
                    </div>

                    <div className="email-preview-body">
                      <div className="email-brand-banner">
                        <span className="brand-dot">✳</span>
                        <strong>AES Nexus ERP · Notificación de Control Operativo</strong>
                      </div>

                      <h3 className="email-heading">Alerta de Existencias Críticas en Almacén</h3>
                      <p className="email-intro">
                        Estimado equipo de Compras y Operaciones,
                        <br />
                        Se ha registrado una variación en las existencias que sitúa a los siguientes productos en o por debajo del umbral mínimo de seguridad establecido:
                      </p>

                      <div className="email-table-wrap">
                        <table className="email-table">
                          <thead>
                            <tr>
                              <th>SKU</th>
                              <th>PRODUCTO</th>
                              <th>ALMACÉN</th>
                              <th style={{ textAlign: 'right' }}>STOCK DISP.</th>
                              <th style={{ textAlign: 'right' }}>UMBRAL MÍN.</th>
                              <th>ESTADO</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(lowStockItems.length > 0 ? lowStockItems : [
                              { id: 'sample', sku: 'HW-SRV-RACK', name: 'Servidor Rack 1U Xeon 64GB ECC', warehouseName: 'Almacén Central Vallejo', stock: 2, minStock: 3, unitOfMeasure: 'Pza' }
                            ]).map((item) => (
                              <tr key={item.id}>
                                <td><code>{item.sku}</code></td>
                                <td><strong>{item.name}</strong></td>
                                <td>{item.warehouseName}</td>
                                <td style={{ textAlign: 'right', color: '#ba4836', fontWeight: 700 }}>
                                  {item.stock} {item.unitOfMeasure}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  {item.minStock} {item.unitOfMeasure}
                                </td>
                                <td>
                                  <span className="email-alert-pill">Reorden necesario</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {emailConfig.includePurchaseLink && (
                        <div className="email-cta-box">
                          <span className="email-btn-mock">
                            <Package size={13} /> Generar Orden de Compra Automática en Nexus ERP &rarr;
                          </span>
                        </div>
                      )}

                      {emailConfig.includeAttachment && (
                        <div className="email-attachment-box">
                          <span>📎 Archivo adjunto: <code>reporte_existencias_criticas_{new Date().toISOString().slice(0, 10)}.pdf</code> (184 KB)</span>
                        </div>
                      )}

                      <div className="email-footer-note">
                        Has recibido este correo porque tu dirección está configurada en las reglas de notificación de umbrales mínimos de stock de AES Nexus ERP.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="create-modal-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setShowEmailNotifyPanel(false)}
              >
                Cerrar
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={handleSaveConfig}
              >
                <Check size={14} /> Guardar configuración de notificaciones
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
