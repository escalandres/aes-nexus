import {
  DollarSign, ShoppingBag, FileText, ArrowRight,
  CheckCircle2, Plus, ArrowUpRight
} from 'lucide-react'
import type { Quote, SalesOrder } from '../data/sales'
import type { ProductServiceItem } from '../data/products'

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(amount)
}

interface SalesOverviewProps {
  quotes: Quote[]
  orders: SalesOrder[]
  products: ProductServiceItem[]
  onNavigateSection: (section: 'Catálogo' | 'Cotizaciones' | 'Pedidos') => void
  onOpenNewQuote: () => void
  onOpenNewOrder: () => void
}

export function SalesOverview({
  quotes,
  orders,
  products,
  onNavigateSection,
  onOpenNewQuote,
  onOpenNewOrder,
}: SalesOverviewProps) {
  // Calculated metrics
  const totalOrdersAmount = orders
    .filter((o) => o.status !== 'Cancelado')
    .reduce((sum, o) => sum + o.total, 0)

  const totalQuotesAmount = quotes.reduce((sum, q) => sum + q.total, 0)
  const approvedQuotes = quotes.filter((q) => q.status === 'Aprobada')
  const conversionRate = quotes.length > 0 ? Math.round((approvedQuotes.length / quotes.length) * 100) : 0
  const avgTicket = orders.length > 0 ? totalOrdersAmount / orders.length : 0

  const activeOrders = orders.filter((o) => o.status !== 'Entregado' && o.status !== 'Cancelado')
  const deliveredOrders = orders.filter((o) => o.status === 'Entregado')

  // Top products calculation based on orders
  const itemUsage: Record<string, { name: string; sku: string; qty: number; total: number; type: string }> = {}
  orders.forEach((ord) => {
    ord.items.forEach((it) => {
      if (!itemUsage[it.sku]) {
        itemUsage[it.sku] = { name: it.name, sku: it.sku, qty: 0, total: 0, type: it.type }
      }
      itemUsage[it.sku].qty += it.quantity
      itemUsage[it.sku].total += it.total
    })
  })
  const topItems = Object.values(itemUsage).sort((a, b) => b.total - a.total).slice(0, 4)

  return (
    <div className="sales-overview-wrap">
      {/* KPIs */}
      <section className="catalog-kpis" aria-label="Indicadores generales de ventas">
        <article className="catalog-kpi-card">
          <div className="catalog-kpi-header">
            <span>Facturación confirmada</span>
            <span className="kpi-icon"><DollarSign size={16} /></span>
          </div>
          <div className="catalog-kpi-val tabular-nums">{formatMoney(totalOrdersAmount)}</div>
          <div className="catalog-kpi-sub">
            <span className="trend trend-up"><ArrowUpRight size={13} /> 12.8%</span>
            <span>en pedidos del periodo</span>
          </div>
        </article>

        <article className="catalog-kpi-card">
          <div className="catalog-kpi-header">
            <span>Propuestas en pipeline</span>
            <span className="kpi-icon icon-sand"><FileText size={16} /></span>
          </div>
          <div className="catalog-kpi-val tabular-nums">{formatMoney(totalQuotesAmount)}</div>
          <div className="catalog-kpi-sub">
            <span>{quotes.length} cotizaciones generadas</span>
          </div>
        </article>

        <article className="catalog-kpi-card">
          <div className="catalog-kpi-header">
            <span>Tasa de cierre comercial</span>
            <span className="kpi-icon icon-green"><CheckCircle2 size={16} /></span>
          </div>
          <div className="catalog-kpi-val tabular-nums">{conversionRate}%</div>
          <div className="catalog-kpi-sub">
            <span>{approvedQuotes.length} de {quotes.length} cotizaciones aprobadas</span>
          </div>
        </article>

        <article className="catalog-kpi-card">
          <div className="catalog-kpi-header">
            <span>Ticket promedio por pedido</span>
            <span className="kpi-icon icon-lilac"><ShoppingBag size={16} /></span>
          </div>
          <div className="catalog-kpi-val tabular-nums">{formatMoney(avgTicket)}</div>
          <div className="catalog-kpi-sub">
            <span>Calculado sobre {orders.length} pedidos</span>
          </div>
        </article>
      </section>

      {/* Commercial Funnel */}
      <section className="sales-funnel-card">
        <div className="funnel-heading">
          <div>
            <div className="panel-kicker">FLUJO COMERCIAL</div>
            <h3>Embudo de conversión de ventas</h3>
          </div>
          <div className="funnel-quick-actions">
            <button className="button button-secondary" onClick={onOpenNewQuote}>
              <Plus size={14} /> Nueva cotización
            </button>
            <button className="button button-primary" onClick={onOpenNewOrder}>
              <Plus size={14} /> Nuevo pedido
            </button>
          </div>
        </div>

        <div className="funnel-steps-grid">
          <div className="funnel-step">
            <span className="funnel-step-label">1. Cotizadas</span>
            <strong className="funnel-step-val tabular-nums">{quotes.length}</strong>
            <small>{formatMoney(totalQuotesAmount)}</small>
            <div className="funnel-bar"><span style={{ width: '100%' }} /></div>
          </div>
          <div className="funnel-step">
            <span className="funnel-step-label">2. Aprobadas</span>
            <strong className="funnel-step-val tabular-nums">{approvedQuotes.length}</strong>
            <small>{formatMoney(approvedQuotes.reduce((acc, q) => acc + q.total, 0))}</small>
            <div className="funnel-bar"><span style={{ width: `${conversionRate}%` }} /></div>
          </div>
          <div className="funnel-step">
            <span className="funnel-step-label">3. En preparación</span>
            <strong className="funnel-step-val tabular-nums">{activeOrders.length}</strong>
            <small>{formatMoney(activeOrders.reduce((acc, o) => acc + o.total, 0))}</small>
            <div className="funnel-bar"><span style={{ width: `${Math.min(100, Math.round((activeOrders.length / (orders.length || 1)) * 100))}%` }} /></div>
          </div>
          <div className="funnel-step highlight">
            <span className="funnel-step-label">4. Entregadas</span>
            <strong className="funnel-step-val tabular-nums">{deliveredOrders.length}</strong>
            <small>{formatMoney(deliveredOrders.reduce((acc, o) => acc + o.total, 0))}</small>
            <div className="funnel-bar"><span style={{ width: `${Math.min(100, Math.round((deliveredOrders.length / (orders.length || 1)) * 100))}%` }} /></div>
          </div>
        </div>
      </section>

      {/* Two Columns Grid: Recent Quotes & Orders */}
      <div className="sales-overview-split">
        {/* Recent Quotes */}
        <div className="overview-panel-card">
          <div className="panel-heading">
            <div>
              <div className="panel-kicker">PROPUESTAS</div>
              <h2>Últimas cotizaciones</h2>
            </div>
            <button className="text-link" onClick={() => onNavigateSection('Cotizaciones')}>
              Ver todas <ArrowRight size={13} />
            </button>
          </div>

          <div className="overview-list">
            {quotes.slice(0, 4).map((q) => (
              <div key={q.id} className="overview-list-row">
                <div className="overview-list-main">
                  <span className="font-mono text-xs font-bold text-accent">{q.folio}</span>
                  <strong>{q.clientCompany}</strong>
                  <small className="text-muted">{q.items.length} partidas · Vence {q.expiryDate}</small>
                </div>
                <div className="overview-list-end">
                  <strong className="font-mono tabular-nums">{formatMoney(q.total)}</strong>
                  <span className={`stage-badge ${q.status === 'Aprobada' ? 'stage-green' : q.status === 'Enviada' ? 'stage-blue' : 'stage-amber'}`}>
                    <i />{q.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Orders */}
        <div className="overview-panel-card">
          <div className="panel-heading">
            <div>
              <div className="panel-kicker">DESPACHO</div>
              <h2>Pedidos en curso</h2>
            </div>
            <button className="text-link" onClick={() => onNavigateSection('Pedidos')}>
              Ver pedidos <ArrowRight size={13} />
            </button>
          </div>

          <div className="overview-list">
            {orders.slice(0, 4).map((o) => (
              <div key={o.id} className="overview-list-row">
                <div className="overview-list-main">
                  <span className="font-mono text-xs font-bold text-accent">{o.folio}</span>
                  <strong>{o.clientCompany}</strong>
                  <small className="text-muted">Entrega: {o.deliveryDate}</small>
                </div>
                <div className="overview-list-end">
                  <strong className="font-mono tabular-nums">{formatMoney(o.total)}</strong>
                  <span className={`stage-badge ${o.status === 'Entregado' ? 'stage-green' : o.status === 'En preparación' ? 'stage-amber' : 'stage-blue'}`}>
                    <i />{o.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Products strip */}
      <section className="overview-panel-card">
        <div className="panel-heading">
          <div>
            <div className="panel-kicker">CATÁLOGO COMERCIAL</div>
            <h2>Artículos con mayor demanda</h2>
            <p className="panel-subtitle">De un total de {products.length} productos y servicios en el catálogo comercial</p>
          </div>
          <button className="text-link" onClick={() => onNavigateSection('Catálogo')}>
            Ir al catálogo <ArrowRight size={13} />
          </button>
        </div>

        <div className="top-products-grid">
          {topItems.map((item) => (
            <div key={item.sku} className="top-product-card">
              <div className="top-product-header">
                <span className="catalog-sku-code font-mono text-xs">{item.sku}</span>
                <span className={`catalog-type-badge ${item.type === 'product' ? 'type-product' : 'type-service'}`}>
                  {item.type === 'product' ? 'Producto' : 'Servicio'}
                </span>
              </div>
              <strong>{item.name}</strong>
              <div className="top-product-numbers">
                <span className="text-muted">{item.qty} unidades vendidas</span>
                <strong className="font-mono tabular-nums">{formatMoney(item.total)}</strong>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
