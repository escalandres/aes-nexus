import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  Eye,
  FileText,
  Plus,
  ReceiptText,
  Search,
  WalletCards,
  X,
} from 'lucide-react'
import type { InvoiceReceivable } from '../data/finance'
import type { SalesLineItem, SalesOrder } from '../data/sales'
import { initialProductsAndServices } from '../data/products'
import { useToast } from './Toast'

interface SalesInvoiceClientOption {
  company: string
  name: string
  email?: string
  rfc?: string
  paymentTerms?: string
  currency?: 'MXN' | 'USD'
}

interface SalesInvoicesProps {
  receivables: InvoiceReceivable[]
  orders: SalesOrder[]
  clientsList: SalesInvoiceClientOption[]
  presetOrderToInvoice?: SalesOrder | null
  onClearPresetOrder?: () => void
  presetInvoiceIdToView?: string | null
  onClearPresetInvoiceView?: () => void
  onCreateInvoice: (invoice: InvoiceReceivable) => void
  onNavigateToFinanceReceivables: () => void
  onNavigateToOrder?: (orderFolio: string) => void
}

const formatMoney = (amount: number, currency: 'MXN' | 'USD' = 'MXN') =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)

const MONTHS_ES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
]

function formatEsDate(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS_ES[date.getMonth()]} ${date.getFullYear()}`
}

function getDaysFromTerms(terms: string): number {
  if (terms.includes('60')) return 60
  if (terms.includes('30')) return 30
  if (terms.includes('15')) return 15
  return 0
}

export function SalesInvoices({
  receivables,
  orders,
  clientsList,
  presetOrderToInvoice,
  onClearPresetOrder,
  presetInvoiceIdToView,
  onClearPresetInvoiceView,
  onCreateInvoice,
  onNavigateToFinanceReceivables,
  onNavigateToOrder,
}: SalesInvoicesProps) {
  const toast = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('Todas')
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceReceivable | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Emission modal state
  const [sourceMode, setSourceMode] = useState<'order' | 'direct'>('order')
  const [selectedOrderFolio, setSelectedOrderFolio] = useState<string>('')
  const [billingMode, setBillingMode] = useState<'full_remaining' | 'advance_50' | 'custom_pct'>('full_remaining')
  const [customPct, setCustomPct] = useState<number>(100)

  // Direct invoice fields
  const [directClientCompany, setDirectClientCompany] = useState<string>(clientsList[0]?.company || '')
  const [directItems, setDirectItems] = useState<SalesLineItem[]>([])
  const [selectedProductSku, setSelectedProductSku] = useState<string>('')
  const [itemQuantity, setItemQuantity] = useState<number>(1)

  // Fiscal / terms fields
  const [rfcInput, setRfcInput] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('Contado')
  const [paymentMethod, setPaymentMethod] = useState('Transferencia SPEI')
  const [cfdiUse, setCfdiUse] = useState('G03 · Gastos en general')
  const [invoiceNotes, setInvoiceNotes] = useState('')

  // Map billed totals by order folio
  const billedByOrder = useMemo(() => {
    const map: Record<string, number> = {}
    receivables.forEach((inv) => {
      if (inv.orderFolio && inv.orderFolio !== 'DIRECTA') {
        map[inv.orderFolio] = (map[inv.orderFolio] || 0) + inv.total
      }
    })
    return map
  }, [receivables])

  const billableOrders = useMemo(
    () =>
      orders.filter((ord) => {
        if (ord.status === 'Cancelado') return false
        const already = billedByOrder[ord.folio] || 0
        return already < ord.total - 0.5
      }),
    [orders, billedByOrder]
  )

  const populateFromOrder = (ord: SalesOrder) => {
    const clientMatch = clientsList.find(
      (c) => c.company.toLowerCase() === ord.clientCompany.toLowerCase()
    )
    setSourceMode('order')
    setSelectedOrderFolio(ord.folio)
    setBillingMode('full_remaining')
    setCustomPct(100)
    setRfcInput(clientMatch?.rfc || '')
    setPaymentTerms(clientMatch?.paymentTerms || 'Crédito 15 días')
    setPaymentMethod('Transferencia SPEI')
    setCfdiUse('G03 · Gastos en general')
    setInvoiceNotes(`Facturación generada desde el pedido de venta ${ord.folio}.`)
    setIsCreateOpen(true)
  }

  useEffect(() => {
    if (presetOrderToInvoice) {
      populateFromOrder(presetOrderToInvoice)
      onClearPresetOrder?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetOrderToInvoice])

  useEffect(() => {
    if (presetInvoiceIdToView) {
      const found = receivables.find((inv) => inv.id === presetInvoiceIdToView)
      if (found) setViewingInvoice(found)
      onClearPresetInvoiceView?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetInvoiceIdToView])

  const handleOpenCreateModal = () => {
    if (billableOrders.length > 0) {
      populateFromOrder(billableOrders[0])
    } else {
      const firstClient = clientsList[0]
      setSourceMode('direct')
      setSelectedOrderFolio('')
      setDirectClientCompany(firstClient?.company || '')
      setRfcInput(firstClient?.rfc || '')
      setPaymentTerms(firstClient?.paymentTerms || 'Contado')
      setPaymentMethod('Transferencia SPEI')
      setCfdiUse('G03 · Gastos en general')
      setInvoiceNotes('')
      const firstProd = initialProductsAndServices[0]
      if (firstProd) {
        const sub = firstProd.unitPrice
        const tax = firstProd.taxRate === '16%' ? sub * 0.16 : firstProd.taxRate === '8%' ? sub * 0.08 : 0
        setDirectItems([
          {
            id: `inv_li_${Date.now()}`,
            itemId: firstProd.id,
            sku: firstProd.sku,
            name: firstProd.name,
            type: firstProd.type,
            quantity: 1,
            unitPrice: firstProd.unitPrice,
            taxRate: firstProd.taxRate,
            unitOfMeasure: firstProd.unitOfMeasure,
            subtotal: sub,
            taxAmount: tax,
            total: sub + tax,
          },
        ])
      } else {
        setDirectItems([])
      }
      setIsCreateOpen(true)
    }
  }

  const activeOrder = useMemo(
    () => orders.find((o) => o.folio === selectedOrderFolio) || null,
    [orders, selectedOrderFolio]
  )

  const activeOrderRemaining = useMemo(() => {
    if (!activeOrder) return 0
    const billed = billedByOrder[activeOrder.folio] || 0
    return Math.max(0, activeOrder.total - billed)
  }, [activeOrder, billedByOrder])

  // Computed preview totals for the creation modal
  const draftPreview = useMemo(() => {
    if (sourceMode === 'order' && activeOrder) {
      const ratio =
        billingMode === 'full_remaining'
          ? activeOrder.total > 0
            ? activeOrderRemaining / activeOrder.total
            : 1
          : billingMode === 'advance_50'
          ? Math.min(0.5, activeOrder.total > 0 ? activeOrderRemaining / activeOrder.total : 0.5)
          : Math.min(
              Math.max(0.01, customPct / 100),
              activeOrder.total > 0 ? activeOrderRemaining / activeOrder.total : 1
            )

      const subtotal = Math.round(activeOrder.subtotal * ratio * 100) / 100
      const tax = Math.round(activeOrder.taxTotal * ratio * 100) / 100
      const total = Math.round((subtotal + tax) * 100) / 100
      const pct = Math.round(ratio * 100)
      const items: SalesLineItem[] = activeOrder.items.map((it) => ({
        ...it,
        subtotal: Math.round(it.subtotal * ratio * 100) / 100,
        taxAmount: Math.round(it.taxAmount * ratio * 100) / 100,
        total: Math.round(it.total * ratio * 100) / 100,
      }))
      return { subtotal, tax, total, pct, items, currency: activeOrder.currency }
    }

    const subtotal = directItems.reduce((s, it) => s + it.subtotal, 0)
    const tax = directItems.reduce((s, it) => s + it.taxAmount, 0)
    const clientMatch = clientsList.find((c) => c.company === directClientCompany)
    return {
      subtotal,
      tax,
      total: subtotal + tax,
      pct: 100,
      items: directItems,
      currency: (clientMatch?.currency || 'MXN') as 'MXN' | 'USD',
    }
  }, [
    sourceMode,
    activeOrder,
    activeOrderRemaining,
    billingMode,
    customPct,
    directItems,
    clientsList,
    directClientCompany,
  ])

  const handleAddDirectItem = () => {
    if (!selectedProductSku) return
    const prod = initialProductsAndServices.find((p) => p.sku === selectedProductSku)
    if (!prod) return
    const qty = Math.max(1, itemQuantity)
    const subtotal = prod.unitPrice * qty
    const taxAmount =
      prod.taxRate === '16%'
        ? subtotal * 0.16
        : prod.taxRate === '8%'
        ? subtotal * 0.08
        : 0

    setDirectItems((prev) => [
      ...prev,
      {
        id: `inv_li_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
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
      },
    ])
    setSelectedProductSku('')
    setItemQuantity(1)
  }

  const handleSubmitInvoice = (e: FormEvent) => {
    e.preventDefault()

    if (sourceMode === 'order' && !activeOrder) {
      toast.warning('Selecciona un pedido de venta válido para facturar.', 'Pedido requerido')
      return
    }
    if (draftPreview.total <= 0) {
      toast.warning('El monto total de la factura debe ser mayor a cero.', 'Monto inválido')
      return
    }
    if (sourceMode === 'direct' && directItems.length === 0) {
      toast.warning('Agrega al menos un artículo o servicio a la factura.', 'Partidas requeridas')
      return
    }

    const today = new Date()
    const due = new Date()
    due.setDate(today.getDate() + getDaysFromTerms(paymentTerms))

    const clientObj =
      sourceMode === 'order' && activeOrder
        ? clientsList.find(
            (c) => c.company.toLowerCase() === activeOrder.clientCompany.toLowerCase()
          )
        : clientsList.find((c) => c.company === directClientCompany)

    const maxNum = receivables.reduce((max, inv) => {
      const n = parseInt(inv.folio.split('-').pop() || '0', 10)
      return Number.isNaN(n) ? max : Math.max(max, n)
    }, receivables.length)
    const folio = `FAC-2026-${String(maxNum + 1).padStart(3, '0')}`
    const newInvoice: InvoiceReceivable = {
      id: `cxc_${Date.now()}`,
      folio,
      orderId: sourceMode === 'order' && activeOrder ? activeOrder.id : undefined,
      orderFolio: sourceMode === 'order' && activeOrder ? activeOrder.folio : 'DIRECTA',
      clientCompany:
        sourceMode === 'order' && activeOrder
          ? activeOrder.clientCompany
          : clientObj?.company || directClientCompany || 'Cliente General',
      clientName:
        sourceMode === 'order' && activeOrder
          ? activeOrder.clientName
          : clientObj?.name || 'Contacto principal',
      clientRfc: rfcInput.trim().toUpperCase() || clientObj?.rfc || 'XAXX010101000',
      issueDate: formatEsDate(today),
      dueDate: formatEsDate(due),
      subtotal: draftPreview.subtotal,
      tax: draftPreview.tax,
      total: draftPreview.total,
      paidAmount: 0,
      balance: draftPreview.total,
      status: 'Pendiente',
      currency: draftPreview.currency,
      paymentMethod,
      paymentTerms,
      cfdiUse,
      billingPercentage: draftPreview.pct,
      notes: invoiceNotes.trim() || undefined,
      items: draftPreview.items,
    }

    onCreateInvoice(newInvoice)
    setIsCreateOpen(false)
    setViewingInvoice(newInvoice)
    toast.success(
      `Factura ${folio} emitida por ${formatMoney(newInvoice.total, newInvoice.currency)} y sincronizada con Finanzas > Cuentas por cobrar.`,
      'Factura emitida'
    )
  }

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return receivables.filter((inv) => {
      const matchStatus = statusFilter === 'Todas' || inv.status === statusFilter
      const matchSearch =
        !q ||
        inv.folio.toLowerCase().includes(q) ||
        inv.orderFolio.toLowerCase().includes(q) ||
        inv.clientCompany.toLowerCase().includes(q) ||
        inv.clientName.toLowerCase().includes(q) ||
        (inv.clientRfc && inv.clientRfc.toLowerCase().includes(q))
      return matchStatus && matchSearch
    })
  }, [receivables, statusFilter, searchQuery])

  // KPIs
  const totalInvoiced = useMemo(
    () => receivables.reduce((s, inv) => s + inv.total, 0),
    [receivables]
  )
  const totalOpenBalance = useMemo(
    () => receivables.reduce((s, inv) => s + inv.balance, 0),
    [receivables]
  )
  const overdueInvoices = useMemo(
    () => receivables.filter((inv) => inv.status === 'Vencida'),
    [receivables]
  )
  const totalCollected = useMemo(
    () => receivables.reduce((s, inv) => s + inv.paidAmount, 0),
    [receivables]
  )

  const getStatusBadge = (status: InvoiceReceivable['status']) => {
    switch (status) {
      case 'Pagada':
        return (
          <span className="stage-badge stage-green">
            <i />
            Pagada
          </span>
        )
      case 'Parcial':
        return (
          <span className="stage-badge stage-blue">
            <i />
            Pago parcial
          </span>
        )
      case 'Vencida':
        return (
          <span className="stage-badge stage-red">
            <i />
            Vencida
          </span>
        )
      default:
        return (
          <span className="stage-badge stage-amber">
            <i />
            Pendiente
          </span>
        )
    }
  }

  return (
    <div className="orders-container">
      {/* Heading */}
      <div className="crm-section-heading">
        <div>
          <div className="panel-kicker">MÓDULO DE VENTAS · FACTURACIÓN SINCRONIZADA</div>
          <h2>Facturas de venta</h2>
          <p>
            Emite facturas totales o parciales desde pedidos confirmados; cada documento se sincroniza automáticamente con Finanzas &gt; Cuentas por cobrar.
          </p>
        </div>
        <div className="crm-section-heading-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={onNavigateToFinanceReceivables}
          >
            <WalletCards size={14} /> Ir a Cuentas por cobrar
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={handleOpenCreateModal}
          >
            <Plus size={15} /> Emitir factura
          </button>
        </div>
      </div>

      {/* KPIs */}
      <section className="catalog-kpis" aria-label="Resumen de facturas de venta">
        <article className="catalog-kpi-card">
          <div className="catalog-kpi-header">
            <span>Total facturado</span>
            <span className="kpi-icon">
              <ReceiptText size={16} />
            </span>
          </div>
          <div className="catalog-kpi-val tabular-nums">{formatMoney(totalInvoiced)}</div>
          <div className="catalog-kpi-sub">
            <span>{receivables.length} facturas emitidas</span>
          </div>
        </article>

        <article className="catalog-kpi-card">
          <div className="catalog-kpi-header">
            <span>Saldo por cobrar</span>
            <span className="kpi-icon icon-sand">
              <Clock size={16} />
            </span>
          </div>
          <div className="catalog-kpi-val tabular-nums">{formatMoney(totalOpenBalance)}</div>
          <div className="catalog-kpi-sub">
            <span>
              {receivables.filter((r) => r.balance > 0).length} documentos con saldo abierto
            </span>
          </div>
        </article>

        <article className="catalog-kpi-card">
          <div className="catalog-kpi-header">
            <span>Facturas vencidas</span>
            <span className="kpi-icon icon-amber">
              <AlertTriangle size={16} />
            </span>
          </div>
          <div className="catalog-kpi-val tabular-nums">
            {formatMoney(overdueInvoices.reduce((s, r) => s + r.balance, 0))}
          </div>
          <div className="catalog-kpi-sub">
            <span>{overdueInvoices.length} factura(s) requieren gestión</span>
          </div>
        </article>

        <article className="catalog-kpi-card">
          <div className="catalog-kpi-header">
            <span>Cobrado a la fecha</span>
            <span className="kpi-icon icon-green">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <div className="catalog-kpi-val tabular-nums">{formatMoney(totalCollected)}</div>
          <div className="catalog-kpi-sub">
            <span className="trend trend-up">
              {totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0}% recuperado
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
            placeholder="Buscar por folio FAC, pedido PED, cliente o RFC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search"
              onClick={() => setSearchQuery('')}
              aria-label="Limpiar búsqueda"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="catalog-segmented-filter" role="group" aria-label="Filtrar facturas por estado">
          {(['Todas', 'Pendiente', 'Parcial', 'Vencida', 'Pagada'] as const).map((st) => {
            const count =
              st === 'Todas'
                ? receivables.length
                : receivables.filter((r) => r.status === st).length
            return (
              <button
                key={st}
                type="button"
                className={statusFilter === st ? 'active' : ''}
                onClick={() => setStatusFilter(st)}
              >
                {st} <span className="filter-count tabular-nums">{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div className="clients-table-wrap">
        <table className="clients-table">
          <thead>
            <tr>
              <th>FOLIO FACTURA</th>
              <th>PEDIDO ORIGEN</th>
              <th>CLIENTE / RFC</th>
              <th>EMISIÓN Y VENCIMIENTO</th>
              <th>TOTAL / SALDO</th>
              <th>ESTADO COBRO</th>
              <th style={{ textAlign: 'right' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map((inv) => (
              <tr key={inv.id} className="catalog-table-row">
                <td>
                  <button
                    type="button"
                    className="catalog-item-title-btn font-mono font-bold"
                    onClick={() => setViewingInvoice(inv)}
                  >
                    {inv.folio}
                  </button>
                </td>
                <td>
                  {inv.orderFolio && inv.orderFolio !== 'DIRECTA' ? (
                    onNavigateToOrder ? (
                      <button
                        type="button"
                        className="catalog-sku-code font-mono text-xs"
                        style={{ cursor: 'pointer', border: 'none' }}
                        title={`Ir al pedido ${inv.orderFolio}`}
                        onClick={() => onNavigateToOrder(inv.orderFolio)}
                      >
                        {inv.orderFolio}
                      </button>
                    ) : (
                      <span className="catalog-sku-code font-mono text-xs">{inv.orderFolio}</span>
                    )
                  ) : (
                    <span className="text-muted text-xs">Factura directa</span>
                  )}
                </td>
                <td>
                  <div className="client-main">
                    <strong>{inv.clientCompany}</strong>
                    <span>
                      {inv.clientName}
                      {inv.clientRfc ? ` · RFC: ${inv.clientRfc}` : ''}
                    </span>
                  </div>
                </td>
                <td>
                  <div className="client-contact">
                    <span>Emisión: {inv.issueDate}</span>
                    <small className="text-muted">Vence: {inv.dueDate}</small>
                  </div>
                </td>
                <td className="catalog-price-cell">
                  <strong className="catalog-unit-price font-mono tabular-nums">
                    {formatMoney(inv.total, inv.currency)}
                  </strong>
                  <small className="catalog-tax-hint text-muted">
                    {inv.balance > 0
                      ? `Saldo: ${formatMoney(inv.balance, inv.currency)}`
                      : 'Liquidada'}
                  </small>
                </td>
                <td>{getStatusBadge(inv.status)}</td>
                <td style={{ textAlign: 'right' }}>
                  <div className="emp-row-actions">
                    <button
                      type="button"
                      className="button-icon-action"
                      onClick={() => setViewingInvoice(inv)}
                      title="Ver detalle de factura"
                    >
                      <Eye size={12} /> Ver
                    </button>
                    {inv.balance > 0 && (
                      <button
                        type="button"
                        className="button-icon-action"
                        onClick={onNavigateToFinanceReceivables}
                        title="Registrar cobro en Finanzas > Cuentas por cobrar"
                      >
                        <DollarSign size={12} /> Cobrar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredInvoices.length === 0 && (
          <div className="clients-empty">
            <FileText size={24} />
            <strong>No encontramos facturas de venta</strong>
            <span>Ajusta los filtros o emite una nueva factura desde un pedido de venta.</span>
          </div>
        )}
      </div>

      {/* Modal: Emitir Factura de Venta */}
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
            aria-labelledby="emit-invoice-title"
          >
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">VENTAS · EMISIÓN DE FACTURA</div>
                <h2 id="emit-invoice-title">Emitir factura de venta</h2>
                <p>
                  Genera la factura desde un pedido confirmado o de forma directa; quedará registrada automáticamente en Cuentas por cobrar.
                </p>
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

            <form onSubmit={handleSubmitInvoice}>
              {/* Origin Mode Switch */}
              <div className="catalog-segmented-filter" style={{ marginBottom: 12 }}>
                <button
                  type="button"
                  className={sourceMode === 'order' ? 'active' : ''}
                  onClick={() => {
                    setSourceMode('order')
                    if (!selectedOrderFolio && billableOrders[0]) {
                      populateFromOrder(billableOrders[0])
                    }
                  }}
                >
                  Desde Pedido de venta ({billableOrders.length} por facturar)
                </button>
                <button
                  type="button"
                  className={sourceMode === 'direct' ? 'active' : ''}
                  onClick={() => {
                    setSourceMode('direct')
                    if (!directClientCompany && clientsList[0]) {
                      setDirectClientCompany(clientsList[0].company)
                      setRfcInput(clientsList[0].rfc || '')
                      setPaymentTerms(clientsList[0].paymentTerms || 'Contado')
                    }
                  }}
                >
                  Factura directa sin pedido
                </button>
              </div>

              {sourceMode === 'order' ? (
                <>
                  <div className="form-grid">
                    <label className="form-field">
                      <span>Pedido de venta origen *</span>
                      <select
                        value={selectedOrderFolio}
                        onChange={(e) => {
                          const found = orders.find((o) => o.folio === e.target.value)
                          if (found) populateFromOrder(found)
                        }}
                      >
                        {billableOrders.length === 0 ? (
                          <option value="">No hay pedidos pendientes de facturar</option>
                        ) : (
                          billableOrders.map((ord) => {
                            const rem = Math.max(0, ord.total - (billedByOrder[ord.folio] || 0))
                            return (
                              <option key={ord.id} value={ord.folio}>
                                {ord.folio} · {ord.clientCompany} (Por facturar: {formatMoney(rem, ord.currency)})
                              </option>
                            )
                          })
                        )}
                      </select>
                    </label>

                    <label className="form-field">
                      <span>Esquema de facturación</span>
                      <select
                        value={billingMode}
                        onChange={(e) =>
                          setBillingMode(
                            e.target.value as 'full_remaining' | 'advance_50' | 'custom_pct'
                          )
                        }
                      >
                        <option value="full_remaining">
                          100% del saldo pendiente ({formatMoney(activeOrderRemaining)})
                        </option>
                        <option value="advance_50">50% parcialidad / anticipo</option>
                        <option value="custom_pct">Porcentaje personalizado</option>
                      </select>
                    </label>
                  </div>

                  {billingMode === 'custom_pct' && (
                    <label className="form-field">
                      <span>Porcentaje del pedido a facturar (%)</span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={customPct}
                        onChange={(e) => setCustomPct(Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
                      />
                    </label>
                  )}

                  {activeOrder && (
                    <div className="quote-items-table-box" style={{ marginBottom: 12 }}>
                      <table className="quote-items-table">
                        <thead>
                          <tr>
                            <th>Partida del pedido {activeOrder.folio}</th>
                            <th>Cant.</th>
                            <th className="text-right">Importe facturado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {draftPreview.items.map((it, i) => (
                            <tr key={it.id || i}>
                              <td>
                                <strong>{it.name}</strong>
                                <small className="catalog-sku-code font-mono text-xs">{it.sku}</small>
                              </td>
                              <td className="font-mono tabular-nums">
                                {it.quantity} {it.unitOfMeasure}
                              </td>
                              <td className="font-mono tabular-nums font-bold text-right">
                                {formatMoney(it.total, draftPreview.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <label className="form-field">
                    <span>Cliente receptor *</span>
                    <select
                      value={directClientCompany}
                      onChange={(e) => {
                        const cl = clientsList.find((c) => c.company === e.target.value)
                        setDirectClientCompany(e.target.value)
                        if (cl) {
                          setRfcInput(cl.rfc || '')
                          setPaymentTerms(cl.paymentTerms || 'Contado')
                        }
                      }}
                    >
                      {clientsList.map((cl) => (
                        <option key={cl.company} value={cl.company}>
                          {cl.company} ({cl.name})
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="form-section-divider">PARTIDAS DE FACTURA</div>
                  <div className="quote-item-add-bar">
                    <div className="form-field" style={{ flex: 2 }}>
                      <select
                        value={selectedProductSku}
                        onChange={(e) => setSelectedProductSku(e.target.value)}
                      >
                        <option value="">Selecciona producto o servicio...</option>
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
                        min={1}
                        className="font-mono tabular-nums"
                        value={itemQuantity}
                        onChange={(e) => setItemQuantity(parseInt(e.target.value, 10) || 1)}
                      />
                    </div>
                    <button
                      type="button"
                      className="button button-secondary"
                      disabled={!selectedProductSku}
                      onClick={handleAddDirectItem}
                    >
                      <Plus size={14} /> Agregar
                    </button>
                  </div>

                  {directItems.length > 0 && (
                    <div className="quote-items-table-box" style={{ marginBottom: 12 }}>
                      <table className="quote-items-table">
                        <thead>
                          <tr>
                            <th>Concepto</th>
                            <th>Cant.</th>
                            <th>Total</th>
                            <th><span className="sr-only">Quitar</span></th>
                          </tr>
                        </thead>
                        <tbody>
                          {directItems.map((it) => (
                            <tr key={it.id}>
                              <td>
                                <strong>{it.name}</strong>
                                <small className="catalog-sku-code font-mono text-xs">{it.sku}</small>
                              </td>
                              <td className="font-mono tabular-nums">{it.quantity}</td>
                              <td className="font-mono tabular-nums font-bold">
                                {formatMoney(it.total, draftPreview.currency)}
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="address-remove-btn"
                                  onClick={() =>
                                    setDirectItems((prev) => prev.filter((x) => x.id !== it.id))
                                  }
                                >
                                  <X size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              <div className="form-section-divider">DATOS FISCALES Y CONDICIONES DE COBRO</div>
              <div className="form-grid-3">
                <label className="form-field">
                  <span>RFC del receptor</span>
                  <input
                    className="mono"
                    maxLength={13}
                    value={rfcInput}
                    onChange={(e) => setRfcInput(e.target.value.toUpperCase())}
                    placeholder="XAXX010101000"
                  />
                </label>
                <label className="form-field">
                  <span>Condiciones de pago</span>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                  >
                    <option value="Contado">Contado (Inmediato)</option>
                    <option value="Crédito 15 días">Crédito 15 días</option>
                    <option value="Crédito 30 días">Crédito 30 días</option>
                    <option value="Crédito 60 días">Crédito 60 días</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>Forma de pago</span>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="Transferencia SPEI">Transferencia SPEI</option>
                    <option value="Tarjeta de crédito">Tarjeta de crédito</option>
                    <option value="Efectivo">Efectivo</option>
                  </select>
                </label>
              </div>

              <div className="form-grid">
                <label className="form-field">
                  <span>Uso CFDI</span>
                  <select value={cfdiUse} onChange={(e) => setCfdiUse(e.target.value)}>
                    <option value="G03 · Gastos en general">G03 · Gastos en general</option>
                    <option value="G01 · Adquisición de mercancías">
                      G01 · Adquisición de mercancías
                    </option>
                    <option value="I04 · Equipo de cómputo y accesorios">
                      I04 · Equipo de cómputo y accesorios
                    </option>
                    <option value="S01 · Sin efectos fiscales">S01 · Sin efectos fiscales</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>Observaciones</span>
                  <input
                    value={invoiceNotes}
                    onChange={(e) => setInvoiceNotes(e.target.value)}
                    placeholder="Referencia u orden de compra del cliente"
                  />
                </label>
              </div>

              {/* Preview totals */}
              <div className="price-calculation-preview" style={{ marginTop: 10 }}>
                <div className="calc-col">
                  <span>Subtotal</span>
                  <strong className="font-mono tabular-nums">
                    {formatMoney(draftPreview.subtotal, draftPreview.currency)}
                  </strong>
                </div>
                <div className="calc-sign">+</div>
                <div className="calc-col">
                  <span>IVA</span>
                  <strong className="font-mono tabular-nums">
                    {formatMoney(draftPreview.tax, draftPreview.currency)}
                  </strong>
                </div>
                <div className="calc-sign">=</div>
                <div className="calc-col highlight">
                  <span>Total factura ({draftPreview.pct}%)</span>
                  <strong className="font-mono tabular-nums">
                    {formatMoney(draftPreview.total, draftPreview.currency)}
                  </strong>
                </div>
              </div>

              <div className="create-modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={draftPreview.total <= 0}
                >
                  <Check size={14} /> Emitir y registrar en CxC
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal: Ver Detalle de Factura de Venta */}
      {viewingInvoice && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setViewingInvoice(null)
          }}
        >
          <section
            className="create-modal quote-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invoice-preview-title"
          >
            <div className="quote-doc-header">
              <div>
                <div className="quote-doc-badge">FACTURA DE VENTA</div>
                <h2 id="invoice-preview-title" className="font-mono font-bold">
                  {viewingInvoice.folio}
                </h2>
                <div className="quote-doc-dates">
                  <span>Emisión: {viewingInvoice.issueDate}</span>
                  <span aria-hidden="true">·</span>
                  <span>Vencimiento: {viewingInvoice.dueDate}</span>
                </div>
              </div>
              <div className="quote-doc-header-right">
                {getStatusBadge(viewingInvoice.status)}
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setViewingInvoice(null)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="quote-recipient-card">
              <div className="recipient-label">DATOS FISCALES DEL RECEPTOR</div>
              <div className="recipient-details">
                <strong>{viewingInvoice.clientCompany}</strong>
                <span>Contacto: {viewingInvoice.clientName}</span>
                {viewingInvoice.clientRfc && (
                  <small className="font-mono">RFC: {viewingInvoice.clientRfc}</small>
                )}
                <small className="text-muted">
                  Origen:{' '}
                  {viewingInvoice.orderFolio && viewingInvoice.orderFolio !== 'DIRECTA'
                    ? `Pedido ${viewingInvoice.orderFolio}`
                    : 'Factura directa'}
                  {viewingInvoice.cfdiUse ? ` · ${viewingInvoice.cfdiUse}` : ''}
                </small>
              </div>
            </div>

            {viewingInvoice.items && viewingInvoice.items.length > 0 ? (
              <div className="quote-items-preview-table-wrap">
                <table className="quote-items-table">
                  <thead>
                    <tr>
                      <th>Concepto facturado</th>
                      <th>Cant.</th>
                      <th>IVA</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingInvoice.items.map((it, idx) => (
                      <tr key={it.id || idx}>
                        <td>
                          <strong>{it.name}</strong>
                          <small className="text-muted block font-mono">
                            {it.sku} · {it.unitOfMeasure}
                          </small>
                        </td>
                        <td className="font-mono tabular-nums">{it.quantity}</td>
                        <td className="text-muted">{it.taxRate}</td>
                        <td className="font-mono tabular-nums font-bold text-right">
                          {formatMoney(it.total, viewingInvoice.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="quote-doc-terms">
                <strong>Concepto de facturación</strong>
                <p>
                  Facturación de partidas comerciales vinculadas al pedido{' '}
                  <span className="font-mono">{viewingInvoice.orderFolio}</span>. Forma de pago:{' '}
                  {viewingInvoice.paymentMethod || 'Transferencia SPEI'}.
                </p>
              </div>
            )}

            {viewingInvoice.notes && (
              <div className="quote-doc-notes">
                <strong>Notas de emisión</strong>
                <p>{viewingInvoice.notes}</p>
              </div>
            )}

            <div className="quote-doc-totals">
              <div className="totals-row">
                <span>Subtotal:</span>
                <strong className="font-mono tabular-nums">
                  {formatMoney(viewingInvoice.subtotal, viewingInvoice.currency)}
                </strong>
              </div>
              <div className="totals-row">
                <span>IVA trasladado:</span>
                <strong className="font-mono tabular-nums">
                  {formatMoney(viewingInvoice.tax, viewingInvoice.currency)}
                </strong>
              </div>
              <div className="totals-row">
                <span>Abonado en Finanzas:</span>
                <strong className="font-mono tabular-nums">
                  {formatMoney(viewingInvoice.paidAmount, viewingInvoice.currency)}
                </strong>
              </div>
              <div className="totals-row totals-grand">
                <span>Saldo pendiente:</span>
                <strong className="font-mono tabular-nums">
                  {formatMoney(viewingInvoice.balance, viewingInvoice.currency)}
                </strong>
              </div>
            </div>

            <div className="create-modal-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setViewingInvoice(null)}
              >
                Cerrar
              </button>
              {viewingInvoice.orderFolio &&
                viewingInvoice.orderFolio !== 'DIRECTA' &&
                onNavigateToOrder && (
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => {
                      const targetFolio = viewingInvoice.orderFolio
                      setViewingInvoice(null)
                      onNavigateToOrder(targetFolio)
                    }}
                  >
                    <FileText size={14} /> Ver pedido {viewingInvoice.orderFolio}
                  </button>
                )}
              {viewingInvoice.balance > 0 && (
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => {
                    setViewingInvoice(null)
                    onNavigateToFinanceReceivables()
                  }}
                >
                  <WalletCards size={14} /> Cobrar en Finanzas <ArrowRight size={13} />
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
