import { useEffect, useState, useMemo } from 'react'
import {
  Plus, Search, ShoppingBag, CheckCircle2, Truck,
  ArrowUpDown, Eye, Trash2, MoreHorizontal,
  DollarSign, Check, X, MapPin, Package, ReceiptText
} from 'lucide-react'
import type { SalesOrder, OrderStatus, SalesLineItem } from '../data/sales'
import type { InvoiceReceivable } from '../data/finance'
import { initialProductsAndServices } from '../data/products'
import { useToast } from './Toast'

const formatMoney = (amount: number, currency: 'MXN' | 'USD' = 'MXN') => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

interface OrdersSectionProps {
  orders: SalesOrder[]
  onUpdateOrders: (orders: SalesOrder[]) => void
  clientNames: { id: string; name: string; company: string; email: string; address?: string }[]
  receivables?: InvoiceReceivable[]
  onInvoiceOrder?: (order: SalesOrder) => void
  onViewInvoice?: (invoice: InvoiceReceivable) => void
  presetOrderFolioToView?: string | null
  onClearPresetOrderView?: () => void
}

const ORDER_STEPS: OrderStatus[] = ['Confirmado', 'En preparación', 'Enviado', 'Entregado']

export function OrdersSection({
  orders,
  onUpdateOrders,
  clientNames,
  receivables = [],
  onInvoiceOrder,
  onViewInvoice,
  presetOrderFolioToView,
  onClearPresetOrderView,
}: OrdersSectionProps) {
  const toast = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'folio' | 'total' | 'deliveryDate'>('folio')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [viewingOrder, setViewingOrder] = useState<SalesOrder | null>(null)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)

  useEffect(() => {
    if (presetOrderFolioToView) {
      const found = orders.find((o) => o.folio === presetOrderFolioToView)
      if (found) setViewingOrder(found)
      onClearPresetOrderView?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetOrderFolioToView])

  // Direct order form state
  const [selectedClientId, setSelectedClientId] = useState('')
  const [customClientCompany, setCustomClientCompany] = useState('')
  const [customClientName, setCustomClientName] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [deliveryDays, setDeliveryDays] = useState(7)
  const [notes, setNotes] = useState('')
  const [lineItems, setLineItems] = useState<SalesLineItem[]>([])
  const [selectedProductSku, setSelectedProductSku] = useState('')
  const [itemQuantity, setItemQuantity] = useState(1)

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        if (selectedStatus !== 'all' && order.status !== selectedStatus) return false
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          return (
            order.folio.toLowerCase().includes(q) ||
            order.clientCompany.toLowerCase().includes(q) ||
            order.clientName.toLowerCase().includes(q) ||
            (order.quoteFolio && order.quoteFolio.toLowerCase().includes(q)) ||
            (order.shippingAddress && order.shippingAddress.toLowerCase().includes(q))
          )
        }
        return true
      })
      .sort((a, b) => {
        let comp = 0
        if (sortBy === 'folio') comp = a.folio.localeCompare(b.folio)
        else if (sortBy === 'total') comp = a.total - b.total
        else if (sortBy === 'deliveryDate') comp = a.deliveryDate.localeCompare(b.deliveryDate)
        return sortOrder === 'asc' ? comp : -comp
      })
  }, [orders, selectedStatus, searchQuery, sortBy, sortOrder])

  // Linked invoices and billed totals by order (synchronized with Finanzas > Cuentas por cobrar)
  const invoicesByOrder = useMemo(() => {
    const map: Record<string, InvoiceReceivable[]> = {}
    orders.forEach((ord) => {
      map[ord.id] = receivables.filter(
        (inv) =>
          inv.orderId === ord.id ||
          (inv.orderFolio && inv.orderFolio !== 'DIRECTA' && inv.orderFolio === ord.folio)
      )
    })
    return map
  }, [orders, receivables])

  const billedByOrder = useMemo(() => {
    const map: Record<string, number> = {}
    orders.forEach((ord) => {
      const linked = invoicesByOrder[ord.id] || []
      map[ord.folio] = linked.reduce((s, inv) => s + inv.total, 0)
    })
    return map
  }, [orders, invoicesByOrder])

  // KPIs
  const totalFacturado = orders.reduce((sum, o) => sum + (o.status !== 'Cancelado' ? o.total : 0), 0)
  const activeOrdersCount = orders.filter((o) => o.status === 'Confirmado' || o.status === 'En preparación' || o.status === 'Enviado').length
  const deliveredCount = orders.filter((o) => o.status === 'Entregado').length
  const inPrepCount = orders.filter((o) => o.status === 'En preparación').length

  const handleOpenCreate = () => {
    setSelectedClientId(clientNames[0]?.id || '')
    setCustomClientCompany(clientNames[0]?.company || 'Estudio Nómada')
    setCustomClientName(clientNames[0]?.name || 'Sofía Ramírez')
    setShippingAddress('Av. Paseo de la Reforma 222, Piso 14, Cuauhtémoc, CDMX')
    setDeliveryDays(7)
    setNotes('Despachar con transportista interno con firma de recibido.')

    const firstProd = initialProductsAndServices[2] || initialProductsAndServices[0]
    if (firstProd) {
      const subtotal = firstProd.unitPrice * 1
      const taxAmount = firstProd.taxRate === '16%' ? subtotal * 0.16 : 0
      setLineItems([
        {
          id: `li_${Date.now()}`,
          itemId: firstProd.id,
          sku: firstProd.sku,
          name: firstProd.name,
          type: firstProd.type,
          quantity: 1,
          unitPrice: firstProd.unitPrice,
          taxRate: firstProd.taxRate,
          unitOfMeasure: firstProd.unitOfMeasure,
          subtotal,
          taxAmount,
          total: subtotal + taxAmount,
        },
      ])
    } else {
      setLineItems([])
    }
    setIsCreateOpen(true)
  }

  const handleAddLineItem = () => {
    if (!selectedProductSku) return
    const prod = initialProductsAndServices.find((p) => p.sku === selectedProductSku)
    if (!prod) return

    const qty = Math.max(1, itemQuantity)
    const subtotal = prod.unitPrice * qty
    const taxAmount = prod.taxRate === '16%' ? subtotal * 0.16 : prod.taxRate === '8%' ? subtotal * 0.08 : 0

    const newItem: SalesLineItem = {
      id: `li_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      itemId: prod.id,
      sku: prod.sku,
      name: prod.name,
      type: prod.type,
      quantity: qty,
      unitPrice: prod.unitPrice,
      taxRate: prod.taxRate,
      unitOfMeasure: prod.unitOfMeasure,
      subtotal,
      taxAmount,
      total: subtotal + taxAmount,
    }

    setLineItems((prev) => [...prev, newItem])
    setSelectedProductSku('')
    setItemQuantity(1)
  }

  const handleRemoveLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((it) => it.id !== id))
  }

  const calculatedSubtotal = lineItems.reduce((acc, it) => acc + it.subtotal, 0)
  const calculatedTax = lineItems.reduce((acc, it) => acc + it.taxAmount, 0)
  const calculatedTotal = calculatedSubtotal + calculatedTax

  const handleSaveOrder = () => {
    if (lineItems.length === 0) {
      toast.warning('Agrega al menos un artículo al pedido de venta.', 'Partidas requeridas')
      return
    }

    const maxNum = orders.reduce((max, o) => {
      const n = parseInt(o.folio.split('-').pop() || '0', 10)
      return Number.isNaN(n) ? max : Math.max(max, n)
    }, orders.length)
    const folio = `PED-2026-${String(maxNum + 1).padStart(3, '0')}`
    const today = new Date()
    const delivery = new Date()
    delivery.setDate(today.getDate() + deliveryDays)

    const formatDateStr = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][d.getMonth()]} ${d.getFullYear()}`

    const newOrder: SalesOrder = {
      id: `order_${Date.now()}`,
      folio,
      clientId: selectedClientId || 'cli_manual',
      clientName: customClientName.trim() || 'Contacto',
      clientCompany: customClientCompany.trim() || 'Cliente',
      date: formatDateStr(today),
      deliveryDate: formatDateStr(delivery),
      items: lineItems,
      subtotal: calculatedSubtotal,
      taxTotal: calculatedTax,
      total: calculatedTotal,
      currency: 'MXN',
      status: 'Confirmado',
      shippingAddress: shippingAddress.trim() || 'Dirección fiscal registrada',
      notes,
    }

    onUpdateOrders([newOrder, ...orders])
    setIsCreateOpen(false)
    toast.success(`Pedido ${folio} registrado con total de ${formatMoney(calculatedTotal)}.`, 'Pedido confirmado')
  }

  const handleAdvanceStatus = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId)
    if (!order) return

    const currentIndex = ORDER_STEPS.indexOf(order.status)
    if (currentIndex >= 0 && currentIndex < ORDER_STEPS.length - 1) {
      const nextStatus = ORDER_STEPS[currentIndex + 1]
      onUpdateOrders(
        orders.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      )
      if (viewingOrder?.id === orderId) {
        setViewingOrder({ ...viewingOrder, status: nextStatus })
      }
      toast.success(`El pedido ${order.folio} avanzó a "${nextStatus}".`, 'Estado actualizado')
    }
  }

  const handleSetOrderStatus = (orderId: string, status: OrderStatus) => {
    onUpdateOrders(
      orders.map((o) => (o.id === orderId ? { ...o, status } : o))
    )
    if (viewingOrder?.id === orderId) {
      setViewingOrder({ ...viewingOrder, status })
    }
    setActiveMenuId(null)
    toast.info(`Estado del pedido actualizado a "${status}".`, 'Pedido actualizado')
  }

  const handleDeleteOrder = (orderId: string, folio: string) => {
    if (window.confirm(`¿Deseas eliminar el pedido ${folio}?`)) {
      onUpdateOrders(orders.filter((o) => o.id !== orderId))
      if (viewingOrder?.id === orderId) setViewingOrder(null)
      setActiveMenuId(null)
      toast.info(`El pedido ${folio} fue eliminado.`, 'Pedido eliminado')
    }
  }

  const getOrderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Entregado':
        return <span className="stage-badge stage-green"><i />Entregado</span>
      case 'Enviado':
        return <span className="stage-badge stage-blue"><i />Enviado</span>
      case 'En preparación':
        return <span className="stage-badge stage-amber"><i />En preparación</span>
      case 'Confirmado':
        return <span className="stage-badge stage-blue"><i />Confirmado</span>
      case 'Cancelado':
        return <span className="client-status status-inactivo"><i />Cancelado</span>
      default:
        return <span>{status}</span>
    }
  }

  return (
    <div className="orders-container">
      {/* Heading */}
      <div className="crm-section-heading">
        <div>
          <div className="panel-kicker">MÓDULO DE VENTAS · GESTIÓN OPERATIVA</div>
          <h2>Pedidos de venta</h2>
          <p>
            Da seguimiento a los pedidos confirmados, estado de despacho, fechas estimadas de entrega y cumplimiento comercial.
          </p>
        </div>
        <div className="crm-section-heading-actions">
          <button className="button button-primary" onClick={handleOpenCreate}>
            <Plus size={15} /> Nuevo pedido directo
          </button>
          <span className="demo-pill">
            <i /> OPERACIÓN ACTIVA
          </span>
        </div>
      </div>

      {/* KPIs */}
      <section className="catalog-kpis" aria-label="Resumen de pedidos">
        <article className="catalog-kpi-card">
          <div className="catalog-kpi-header">
            <span>Facturación en pedidos</span>
            <span className="kpi-icon icon-sand"><DollarSign size={16} /></span>
          </div>
          <div className="catalog-kpi-val tabular-nums">{formatMoney(totalFacturado)}</div>
          <div className="catalog-kpi-sub">
            <span>Total en pedidos vigentes</span>
          </div>
        </article>

        <article className="catalog-kpi-card">
          <div className="catalog-kpi-header">
            <span>Pedidos activos en curso</span>
            <span className="kpi-icon icon-lilac"><ShoppingBag size={16} /></span>
          </div>
          <div className="catalog-kpi-val tabular-nums">{activeOrdersCount}</div>
          <div className="catalog-kpi-sub">
            <span>Confirmados, en preparación o ruta</span>
          </div>
        </article>

        <article className="catalog-kpi-card">
          <div className="catalog-kpi-header">
            <span>En preparación</span>
            <span className="kpi-icon icon-green"><Package size={16} /></span>
          </div>
          <div className="catalog-kpi-val tabular-nums">{inPrepCount}</div>
          <div className="catalog-kpi-sub">
            <span>Armado y validación de almacén</span>
          </div>
        </article>

        <article className="catalog-kpi-card">
          <div className="catalog-kpi-header">
            <span>Pedidos entregados</span>
            <span className="kpi-icon"><CheckCircle2 size={16} /></span>
          </div>
          <div className="catalog-kpi-val tabular-nums">
            {deliveredCount} <small className="text-xs font-normal text-muted">/ {orders.length}</small>
          </div>
          <div className="catalog-kpi-sub">
            <span className="trend trend-up">
              {orders.length > 0 ? Math.round((deliveredCount / orders.length) * 100) : 0}% de cumplimiento
            </span>
          </div>
        </article>
      </section>

      {/* Toolbar */}
      <div className="catalog-toolbar">
        <div className="catalog-search">
          <Search size={14} className="search-icon" />
          <input
            type="search"
            placeholder="Buscar por folio, cotización origen, cliente o dirección..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="clear-search"
              onClick={() => setSearchQuery('')}
              aria-label="Limpiar búsqueda"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Status segmented */}
        <div className="catalog-segmented-filter" role="group" aria-label="Filtrar pedidos por estado">
          <button
            type="button"
            className={selectedStatus === 'all' ? 'active' : ''}
            onClick={() => setSelectedStatus('all')}
          >
            Todos <span className="filter-count tabular-nums">{orders.length}</span>
          </button>
          <button
            type="button"
            className={selectedStatus === 'En preparación' ? 'active' : ''}
            onClick={() => setSelectedStatus('En preparación')}
          >
            En preparación <span className="filter-count tabular-nums">{inPrepCount}</span>
          </button>
          <button
            type="button"
            className={selectedStatus === 'Confirmado' ? 'active' : ''}
            onClick={() => setSelectedStatus('Confirmado')}
          >
            Confirmados <span className="filter-count tabular-nums">{orders.filter((o) => o.status === 'Confirmado').length}</span>
          </button>
          <button
            type="button"
            className={selectedStatus === 'Entregado' ? 'active' : ''}
            onClick={() => setSelectedStatus('Entregado')}
          >
            Entregados <span className="filter-count tabular-nums">{deliveredCount}</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="clients-table-wrap">
        <table className="clients-table">
          <thead>
            <tr>
              <th>
                <button
                  type="button"
                  className="table-sort-btn"
                  onClick={() => {
                    if (sortBy === 'folio') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                    else {
                      setSortBy('folio')
                      setSortOrder('desc')
                    }
                  }}
                >
                  FOLIO PEDIDO <ArrowUpDown size={11} />
                </button>
              </th>
              <th>COTIZACIÓN ORIGEN</th>
              <th>CLIENTE / EMPRESA</th>
              <th>PARTIDAS</th>
              <th>
                <button
                  type="button"
                  className="table-sort-btn"
                  onClick={() => {
                    if (sortBy === 'deliveryDate') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                    else {
                      setSortBy('deliveryDate')
                      setSortOrder('desc')
                    }
                  }}
                >
                  FECHA ENTREGA <ArrowUpDown size={11} />
                </button>
              </th>
              <th>
                <button
                  type="button"
                  className="table-sort-btn text-right"
                  onClick={() => {
                    if (sortBy === 'total') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                    else {
                      setSortBy('total')
                      setSortOrder('desc')
                    }
                  }}
                >
                  TOTAL PEDIDO <ArrowUpDown size={11} />
                </button>
              </th>
              <th>ESTADO</th>
              <th>FACTURACIÓN / FACTURAS</th>
              <th><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => {
              const linkedInvoices = invoicesByOrder[order.id] || []
              const billedAmount = billedByOrder[order.folio] || 0
              const canInvoice =
                Boolean(onInvoiceOrder) &&
                order.status !== 'Cancelado' &&
                billedAmount < order.total - 0.5
              return (
              <tr key={order.id} className="catalog-table-row">
                <td>
                  <button
                    type="button"
                    className="catalog-item-title-btn font-mono font-bold"
                    onClick={() => setViewingOrder(order)}
                  >
                    {order.folio}
                  </button>
                </td>
                <td>
                  {order.quoteFolio ? (
                    <span className="catalog-sku-code font-mono text-xs">
                      {order.quoteFolio}
                    </span>
                  ) : (
                    <span className="text-muted text-xs">Venta directa</span>
                  )}
                </td>
                <td>
                  <div className="client-main">
                    <strong>{order.clientCompany}</strong>
                    <span>{order.clientName}</span>
                  </div>
                </td>
                <td>
                  <div className="quotes-items-snippet">
                    <span>{order.items.length} {order.items.length === 1 ? 'partida' : 'partidas'}</span>
                    <small className="text-muted">
                      ({order.items.map((it) => it.quantity + 'x ' + it.sku).join(', ')})
                    </small>
                  </div>
                </td>
                <td>
                  <div className="client-contact">
                    <span>{order.deliveryDate}</span>
                    <small className="text-muted">Emitido: {order.date}</small>
                  </div>
                </td>
                <td className="catalog-price-cell">
                  <strong className="catalog-unit-price font-mono tabular-nums">
                    {formatMoney(order.total, order.currency)}
                  </strong>
                  <small className="catalog-tax-hint text-muted">
                    Sub: {formatMoney(order.subtotal, order.currency)}
                  </small>
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                    {getOrderStatusBadge(order.status)}
                    {order.status !== 'Cancelado' && (() => {
                      const billed = billedByOrder[order.folio] || 0
                      if (billed >= order.total - 0.5) {
                        return <small className="text-xs" style={{ color: '#287a53', fontWeight: 600 }}>Facturado 100%</small>
                      }
                      if (billed > 0) {
                        return <small className="text-xs" style={{ color: '#2b6cb0', fontWeight: 600 }}>Fact. parcial ({Math.round((billed / order.total) * 100)}%)</small>
                      }
                      return <small className="text-muted text-xs">Sin facturar</small>
                    })()}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-start' }}>
                    {linkedInvoices.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {linkedInvoices.map((inv) => (
                          <button
                            key={inv.id}
                            type="button"
                            className="catalog-sku-code font-mono text-green"
                            style={{ cursor: onViewInvoice ? 'pointer' : 'default', border: 'none' }}
                            title={`Ver factura ${inv.folio} (${formatMoney(inv.total, inv.currency)})`}
                            onClick={() => onViewInvoice?.(inv)}
                          >
                            {inv.folio}
                          </button>
                        ))}
                      </div>
                    )}
                    {canInvoice && onInvoiceOrder ? (
                      <button
                        type="button"
                        className="button-convert-quick"
                        onClick={() => onInvoiceOrder(order)}
                      >
                        <ReceiptText size={12} /> Facturar pedido
                      </button>
                    ) : linkedInvoices.length === 0 ? (
                      <span className="text-muted text-xs">—</span>
                    ) : null}
                  </div>
                </td>
                <td className="catalog-actions-cell">
                  <div className="row-action-wrapper">
                    <button
                      type="button"
                      className="row-more"
                      aria-label={`Acciones para ${order.folio}`}
                      onClick={() => setActiveMenuId(activeMenuId === order.id ? null : order.id)}
                    >
                      <MoreHorizontal size={17} />
                    </button>

                    {activeMenuId === order.id && (
                      <div className="catalog-action-menu">
                        <button
                          type="button"
                          onClick={() => {
                            setViewingOrder(order)
                            setActiveMenuId(null)
                          }}
                        >
                          <Eye size={13} /> Ver detalle de pedido
                        </button>
                        {canInvoice && onInvoiceOrder && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null)
                                onInvoiceOrder(order)
                              }}
                            >
                              <ReceiptText size={13} /> Facturar pedido
                            </button>
                          )}
                        {order.status !== 'Entregado' && order.status !== 'Cancelado' && (
                          <button
                            type="button"
                            onClick={() => {
                              handleAdvanceStatus(order.id)
                              setActiveMenuId(null)
                            }}
                          >
                            <Truck size={13} /> Avanzar fase operativa
                          </button>
                        )}
                        {order.status !== 'Entregado' && (
                          <button
                            type="button"
                            onClick={() => handleSetOrderStatus(order.id, 'Entregado')}
                          >
                            <CheckCircle2 size={13} /> Marcar como Entregado
                          </button>
                        )}
                        {order.status !== 'Cancelado' && (
                          <button
                            type="button"
                            className="action-danger"
                            onClick={() => handleSetOrderStatus(order.id, 'Cancelado')}
                          >
                            <X size={13} /> Cancelar pedido
                          </button>
                        )}
                        <button
                          type="button"
                          className="action-danger"
                          onClick={() => handleDeleteOrder(order.id, order.folio)}
                        >
                          <Trash2 size={13} /> Eliminar registro
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>

        {filteredOrders.length === 0 && (
          <div className="clients-empty">
            <ShoppingBag size={24} />
            <strong>No se encontraron pedidos de venta</strong>
            <span>Prueba ajustando el término de búsqueda o selecciona otro filtro.</span>
          </div>
        )}
      </div>

      {/* Modal: New Direct Order */}
      {isCreateOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsCreateOpen(false)
          }}
        >
          <section
            className="create-modal catalog-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-modal-title"
          >
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">VENTAS · PEDIDO DIRECTO</div>
                <h2 id="order-modal-title">Registrar pedido de venta</h2>
                <p>Genera una orden de venta directa sin necesidad de cotización previa.</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsCreateOpen(false)}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSaveOrder()
              }}
            >
              <div className="form-grid">
                <label className="form-field">
                  <span>Cliente registrado</span>
                  <select
                    value={selectedClientId}
                    onChange={(e) => {
                      const cid = e.target.value
                      setSelectedClientId(cid)
                      const cl = clientNames.find((c) => c.id === cid)
                      if (cl) {
                        setCustomClientCompany(cl.company)
                        setCustomClientName(cl.name)
                        if (cl.address) setShippingAddress(cl.address)
                      }
                    }}
                  >
                    {clientNames.map((cl) => (
                      <option key={cl.id} value={cl.id}>
                        {cl.company} ({cl.name})
                      </option>
                    ))}
                    <option value="custom">Otro cliente / Venta mostrador</option>
                  </select>
                </label>

                <label className="form-field">
                  <span>Plazo estimado de entrega</span>
                  <select
                    value={deliveryDays}
                    onChange={(e) => setDeliveryDays(Number(e.target.value))}
                  >
                    <option value={3}>3 días hábiles (Express)</option>
                    <option value={7}>7 días hábiles (Estándar)</option>
                    <option value={15}>15 días hábiles</option>
                  </select>
                </label>
              </div>

              <label className="form-field">
                <span>Dirección de envío o entrega *</span>
                <input
                  type="text"
                  required
                  placeholder="Calle, número, colonia, ciudad y código postal..."
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                />
              </label>

              {/* Items Section */}
              <div className="form-section-divider">ARTÍCULOS A DESPACHAR</div>

              <div className="quote-item-add-bar">
                <div className="form-field" style={{ flex: 2 }}>
                  <select
                    value={selectedProductSku}
                    onChange={(e) => setSelectedProductSku(e.target.value)}
                  >
                    <option value="">Selecciona un producto o servicio del catálogo...</option>
                    {initialProductsAndServices.map((prod) => (
                      <option key={prod.sku} value={prod.sku}>
                        [{prod.sku}] {prod.name} — {formatMoney(prod.unitPrice)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field" style={{ width: '90px' }}>
                  <input
                    type="number"
                    min="1"
                    placeholder="Cant."
                    className="font-mono tabular-nums"
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={!selectedProductSku}
                  onClick={handleAddLineItem}
                >
                  <Plus size={14} /> Agregar
                </button>
              </div>

              {/* Items list */}
              {lineItems.length > 0 && (
                <div className="quote-items-table-box">
                  <table className="quote-items-table">
                    <thead>
                      <tr>
                        <th>Artículo / SKU</th>
                        <th>Cant.</th>
                        <th>Precio unit.</th>
                        <th>Subtotal</th>
                        <th><span className="sr-only">Quitar</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((it) => (
                        <tr key={it.id}>
                          <td>
                            <strong>{it.name}</strong>
                            <small className="catalog-sku-code font-mono text-xs">{it.sku}</small>
                          </td>
                          <td className="font-mono tabular-nums">{it.quantity} {it.unitOfMeasure}</td>
                          <td className="font-mono tabular-nums">{formatMoney(it.unitPrice)}</td>
                          <td className="font-mono tabular-nums font-bold">{formatMoney(it.subtotal)}</td>
                          <td>
                            <button
                              type="button"
                              className="address-remove-btn"
                              onClick={() => handleRemoveLineItem(it.id)}
                            >
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Totals */}
              <div className="price-calculation-preview" style={{ marginTop: '12px' }}>
                <div className="calc-col">
                  <span>Subtotal neto</span>
                  <strong className="font-mono tabular-nums">{formatMoney(calculatedSubtotal)}</strong>
                </div>
                <div className="calc-sign">+</div>
                <div className="calc-col">
                  <span>Impuestos (IVA)</span>
                  <strong className="font-mono tabular-nums">{formatMoney(calculatedTax)}</strong>
                </div>
                <div className="calc-sign">=</div>
                <div className="calc-col highlight">
                  <span>Total pedido</span>
                  <strong className="font-mono tabular-nums">{formatMoney(calculatedTotal)}</strong>
                </div>
              </div>

              <label className="form-field">
                <span>Instrucciones de entrega y notas</span>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalles sobre horario de recepción, contacto en sitio..."
                />
              </label>

              <div className="create-modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="button button-primary">
                  <Check size={14} /> Confirmar pedido
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal: View Order Tracking */}
      {viewingOrder && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setViewingOrder(null)
          }}
        >
          <section
            className="create-modal quote-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-preview-title"
          >
            <div className="quote-doc-header">
              <div>
                <div className="quote-doc-badge">PEDIDO DE VENTA</div>
                <h2 id="order-preview-title" className="font-mono font-bold">
                  {viewingOrder.folio}
                </h2>
                <div className="quote-doc-dates">
                  <span>Fecha orden: {viewingOrder.date}</span>
                  <span aria-hidden="true">·</span>
                  <span>Fecha de entrega estimada: {viewingOrder.deliveryDate}</span>
                </div>
              </div>
              <div className="quote-doc-header-right">
                {getOrderStatusBadge(viewingOrder.status)}
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setViewingOrder(null)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Stepper tracking */}
            {viewingOrder.status !== 'Cancelado' && (
              <div className="order-stepper-box">
                {ORDER_STEPS.map((step, idx) => {
                  const currentIdx = ORDER_STEPS.indexOf(viewingOrder.status)
                  const isDone = currentIdx >= idx
                  const isCurrent = currentIdx === idx
                  return (
                    <div
                      key={step}
                      className={`order-step-item ${isDone ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
                    >
                      <div className="step-circle">
                        {isDone ? <Check size={12} /> : idx + 1}
                      </div>
                      <span className="step-label">{step}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Recipient & Shipping Address */}
            <div className="quote-recipient-card">
              <div className="recipient-label">DATOS DE ENTREGA</div>
              <div className="recipient-details">
                <strong>{viewingOrder.clientCompany}</strong>
                <span>Contacto: {viewingOrder.clientName}</span>
                {viewingOrder.shippingAddress && (
                  <div className="shipping-address-snippet">
                    <MapPin size={13} className="text-muted" />
                    <span>{viewingOrder.shippingAddress}</span>
                  </div>
                )}
                {viewingOrder.quoteFolio && (
                  <small className="text-muted">Origen: Cotización {viewingOrder.quoteFolio}</small>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="quote-items-preview-table-wrap">
              <table className="quote-items-table">
                <thead>
                  <tr>
                    <th>Partida a entregar</th>
                    <th>Cant.</th>
                    <th>Precio unit.</th>
                    <th>IVA</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingOrder.items.map((it, idx) => (
                    <tr key={it.id || idx}>
                      <td>
                        <strong>{it.name}</strong>
                        <small className="text-muted block font-mono">{it.sku} · {it.unitOfMeasure}</small>
                      </td>
                      <td className="font-mono tabular-nums">{it.quantity}</td>
                      <td className="font-mono tabular-nums">{formatMoney(it.unitPrice, viewingOrder.currency)}</td>
                      <td className="text-muted">{it.taxRate}</td>
                      <td className="font-mono tabular-nums font-bold text-right">
                        {formatMoney(it.total, viewingOrder.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="quote-doc-totals">
              <div className="totals-row">
                <span>Subtotal neto:</span>
                <strong className="font-mono tabular-nums">{formatMoney(viewingOrder.subtotal, viewingOrder.currency)}</strong>
              </div>
              <div className="totals-row">
                <span>IVA trasladado:</span>
                <strong className="font-mono tabular-nums">{formatMoney(viewingOrder.taxTotal, viewingOrder.currency)}</strong>
              </div>
              <div className="totals-row totals-grand">
                <span>Total del pedido:</span>
                <strong className="font-mono tabular-nums">{formatMoney(viewingOrder.total, viewingOrder.currency)}</strong>
              </div>
            </div>

            {/* Linked Invoices */}
            {(invoicesByOrder[viewingOrder.id] || []).length > 0 && (
              <div className="quote-recipient-card" style={{ marginTop: 12 }}>
                <div className="recipient-label">FACTURAS VINCULADAS AL PEDIDO</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                  {(invoicesByOrder[viewingOrder.id] || []).map((inv) => (
                    <div
                      key={inv.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 13,
                      }}
                    >
                      <div>
                        <button
                          type="button"
                          className="catalog-item-title-btn font-mono font-bold"
                          onClick={() => {
                            setViewingOrder(null)
                            onViewInvoice?.(inv)
                          }}
                        >
                          {inv.folio}
                        </button>{' '}
                        <span className="text-muted">
                          · {inv.issueDate} · {inv.status}
                        </span>
                      </div>
                      <strong className="font-mono tabular-nums">
                        {formatMoney(inv.total, inv.currency)}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="create-modal-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setViewingOrder(null)}
              >
                Cerrar
              </button>
              {onInvoiceOrder &&
                viewingOrder.status !== 'Cancelado' &&
                (billedByOrder[viewingOrder.folio] || 0) < viewingOrder.total - 0.5 && (
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => {
                      const target = viewingOrder
                      setViewingOrder(null)
                      onInvoiceOrder(target)
                    }}
                  >
                    <ReceiptText size={14} /> Facturar pedido
                  </button>
                )}
              {viewingOrder.status !== 'Entregado' && viewingOrder.status !== 'Cancelado' && (
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => handleAdvanceStatus(viewingOrder.id)}
                >
                  <Truck size={14} /> Avanzar estado operativo
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
