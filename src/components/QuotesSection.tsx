import { useState, useMemo } from 'react'
import {
  Plus, Search, FileText, CheckCircle2, XCircle, Clock,
  ArrowUpDown, Eye, Copy, Trash2, Send, MoreHorizontal,
  DollarSign, Check, X, ShoppingBag, AlertCircle
} from 'lucide-react'
import type { Quote, QuoteStatus, SalesLineItem } from '../data/sales'
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

interface QuotesSectionProps {
  quotes: Quote[]
  onUpdateQuotes: (quotes: Quote[]) => void
  onConvertToOrder: (quote: Quote) => void
  clientNames: { id: string; name: string; company: string; email: string }[]
}

export function QuotesSection({ quotes, onUpdateQuotes, onConvertToOrder, clientNames }: QuotesSectionProps) {
  const toast = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'folio' | 'total' | 'date'>('folio')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [viewingQuote, setViewingQuote] = useState<Quote | null>(null)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)

  // Form state for new quote
  const [selectedClientId, setSelectedClientId] = useState('')
  const [customClientCompany, setCustomClientCompany] = useState('')
  const [customClientName, setCustomClientName] = useState('')
  const [customClientEmail, setCustomClientEmail] = useState('')
  const [validDays, setValidDays] = useState(15)
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('50% anticipo al confirmar y 50% contra entrega. Precios más IVA.')
  const [lineItems, setLineItems] = useState<SalesLineItem[]>([])

  // Line item addition state
  const [selectedProductSku, setSelectedProductSku] = useState('')
  const [itemQuantity, setItemQuantity] = useState(1)

  // Filtered quotes
  const filteredQuotes = useMemo(() => {
    return quotes
      .filter((q) => {
        if (selectedStatus !== 'all' && q.status !== selectedStatus) return false
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase()
          return (
            q.folio.toLowerCase().includes(query) ||
            q.clientCompany.toLowerCase().includes(query) ||
            q.clientName.toLowerCase().includes(query) ||
            q.items.some((it) => it.name.toLowerCase().includes(query) || it.sku.toLowerCase().includes(query))
          )
        }
        return true
      })
      .sort((a, b) => {
        let comp = 0
        if (sortBy === 'folio') comp = a.folio.localeCompare(b.folio)
        else if (sortBy === 'total') comp = a.total - b.total
        else if (sortBy === 'date') comp = a.date.localeCompare(b.date)
        return sortOrder === 'asc' ? comp : -comp
      })
  }, [quotes, selectedStatus, searchQuery, sortBy, sortOrder])

  // KPIs
  const totalCotizado = quotes.reduce((acc, q) => acc + q.total, 0)
  const approvedQuotes = quotes.filter((q) => q.status === 'Aprobada')
  const approvedCount = approvedQuotes.length
  const pendingCount = quotes.filter((q) => q.status === 'Enviada' || q.status === 'Borrador').length
  const conversionRate = quotes.length > 0 ? Math.round((approvedCount / quotes.length) * 100) : 0

  const handleOpenCreate = () => {
    // Generate next folio
    setSelectedClientId(clientNames[0]?.id || '')
    setCustomClientCompany(clientNames[0]?.company || 'Estudio Nómada')
    setCustomClientName(clientNames[0]?.name || 'Sofía Ramírez')
    setCustomClientEmail(clientNames[0]?.email || 'contacto@cliente.com')
    setValidDays(15)
    setNotes('Propuesta comercial para suministro de equipos y servicios.')
    setTerms('50% anticipo al confirmar y 50% contra entrega. Precios más IVA.')

    // Default first line item
    const firstProd = initialProductsAndServices[0]
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
    const total = subtotal + taxAmount

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
      total,
    }

    setLineItems((prev) => [...prev, newItem])
    setSelectedProductSku('')
    setItemQuantity(1)
    toast.info(`Se agregó "${prod.name}" a la cotización.`, 'Partida agregada')
  }

  const handleRemoveLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((it) => it.id !== id))
  }

  const handleUpdateItemQty = (id: string, qty: number) => {
    if (qty <= 0) return
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const subtotal = item.unitPrice * qty
        const taxRateMult = item.taxRate === '16%' ? 0.16 : item.taxRate === '8%' ? 0.08 : 0
        const taxAmount = subtotal * taxRateMult
        return {
          ...item,
          quantity: qty,
          subtotal,
          taxAmount,
          total: subtotal + taxAmount,
        }
      })
    )
  }

  const calculatedSubtotal = lineItems.reduce((acc, it) => acc + it.subtotal, 0)
  const calculatedTax = lineItems.reduce((acc, it) => acc + it.taxAmount, 0)
  const calculatedTotal = calculatedSubtotal + calculatedTax

  const handleSaveQuote = (initialStatus: QuoteStatus = 'Enviada') => {
    if (lineItems.length === 0) {
      toast.warning('Agrega al menos un producto o servicio a la cotización.', 'Partidas requeridas')
      return
    }

    const nextNumber = quotes.length + 1
    const folio = `COT-2026-${String(nextNumber).padStart(3, '0')}`
    const today = new Date()
    const expiry = new Date()
    expiry.setDate(today.getDate() + validDays)

    const formatDateStr = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][d.getMonth()]} ${d.getFullYear()}`

    const newQuote: Quote = {
      id: `quote_${Date.now()}`,
      folio,
      clientId: selectedClientId || 'cli_manual',
      clientName: customClientName.trim() || 'Contacto Comercial',
      clientCompany: customClientCompany.trim() || 'Empresa Cliente',
      clientEmail: customClientEmail.trim() || 'cliente@empresa.com',
      date: formatDateStr(today),
      expiryDate: formatDateStr(expiry),
      items: lineItems,
      subtotal: calculatedSubtotal,
      taxTotal: calculatedTax,
      total: calculatedTotal,
      currency: 'MXN',
      status: initialStatus,
      notes,
      terms,
    }

    onUpdateQuotes([newQuote, ...quotes])
    setIsCreateOpen(false)
    toast.success(`Cotización ${folio} creada con un total de ${formatMoney(calculatedTotal)}.`, 'Cotización generada')
  }

  const handleDuplicate = (quote: Quote) => {
    const nextNumber = quotes.length + 1
    const newFolio = `COT-2026-${String(nextNumber).padStart(3, '0')}`
    const duplicated: Quote = {
      ...quote,
      id: `quote_${Date.now()}`,
      folio: newFolio,
      status: 'Borrador',
      date: 'Hoy',
      convertedToOrderId: undefined,
    }
    onUpdateQuotes([duplicated, ...quotes])
    setActiveMenuId(null)
    toast.success(`Se duplicó como borrador ${newFolio}.`, 'Cotización duplicada')
  }

  const handleStatusChange = (quoteId: string, nextStatus: QuoteStatus) => {
    onUpdateQuotes(
      quotes.map((q) => (q.id === quoteId ? { ...q, status: nextStatus } : q))
    )
    if (viewingQuote && viewingQuote.id === quoteId) {
      setViewingQuote({ ...viewingQuote, status: nextStatus })
    }
    setActiveMenuId(null)
    toast.info(`La cotización ahora está en estado "${nextStatus}".`, 'Estado actualizado')
  }

  const handleDelete = (quoteId: string, folio: string) => {
    if (window.confirm(`¿Seguro que deseas eliminar la cotización ${folio}?`)) {
      onUpdateQuotes(quotes.filter((q) => q.id !== quoteId))
      if (viewingQuote?.id === quoteId) setViewingQuote(null)
      setActiveMenuId(null)
      toast.info(`La cotización ${folio} fue eliminada.`, 'Cotización eliminada')
    }
  }

  const getStatusBadge = (status: QuoteStatus) => {
    switch (status) {
      case 'Aprobada':
        return <span className="stage-badge stage-green"><i />Aprobada</span>
      case 'Enviada':
        return <span className="stage-badge stage-blue"><i />Enviada</span>
      case 'Borrador':
        return <span className="client-status status-inactivo"><i />Borrador</span>
      case 'Rechazada':
        return <span className="client-status status-inactivo"><i />Rechazada</span>
      case 'Vencida':
        return <span className="stage-badge stage-amber"><i />Vencida</span>
      default:
        return <span>{status}</span>
    }
  }

  return (
    <div className="quotes-container">
      {/* Heading */}
      <div className="crm-section-heading">
        <div>
          <div className="panel-kicker">MÓDULO DE VENTAS · PROPUESTAS COMERCIALES</div>
          <h2>Cotizaciones y propuestas</h2>
          <p>
            Genera cotizaciones profesionales con artículos de tu catálogo, cálculo automático de impuestos y conversión directa a pedidos de venta.
          </p>
        </div>
        <div className="crm-section-heading-actions">
          <button className="button button-primary" onClick={handleOpenCreate}>
            <Plus size={15} /> Nueva cotización
          </button>
          <span className="demo-pill">
            <i /> GESTOR ACTIVO
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <section className="catalog-kpis" aria-label="Resumen de cotizaciones">
        <article className="catalog-kpi-card">
          <div className="catalog-kpi-header">
            <span>Monto total cotizado</span>
            <span className="kpi-icon icon-sand"><DollarSign size={16} /></span>
          </div>
          <div className="catalog-kpi-val tabular-nums">{formatMoney(totalCotizado)}</div>
          <div className="catalog-kpi-sub">
            <span>{quotes.length} propuestas registradas</span>
          </div>
        </article>

        <article className="catalog-kpi-card">
          <div className="catalog-kpi-header">
            <span>Cotizaciones aprobadas</span>
            <span className="kpi-icon icon-green"><CheckCircle2 size={16} /></span>
          </div>
          <div className="catalog-kpi-val tabular-nums">
            {approvedCount} <small className="text-xs font-normal text-muted">/ {quotes.length}</small>
          </div>
          <div className="catalog-kpi-sub">
            <span className="trend trend-up">{conversionRate}% tasa de cierre</span>
          </div>
        </article>

        <article className="catalog-kpi-card">
          <div className="catalog-kpi-header">
            <span>Pendientes de decisión</span>
            <span className="kpi-icon icon-lilac"><Clock size={16} /></span>
          </div>
          <div className="catalog-kpi-val tabular-nums">{pendingCount}</div>
          <div className="catalog-kpi-sub">
            <span>Enviadas o en borrador</span>
          </div>
        </article>

        <article className="catalog-kpi-card">
          <div className="catalog-kpi-header">
            <span>Ticket promedio cotizado</span>
            <span className="kpi-icon"><FileText size={16} /></span>
          </div>
          <div className="catalog-kpi-val tabular-nums">
            {formatMoney(totalCotizado / (quotes.length || 1))}
          </div>
          <div className="catalog-kpi-sub">
            <span>Por cotización activa</span>
          </div>
        </article>
      </section>

      {/* Toolbar & Filters */}
      <div className="catalog-toolbar">
        <div className="catalog-search">
          <Search size={14} className="search-icon" />
          <input
            type="search"
            placeholder="Buscar por folio, cliente, empresa o partidas..."
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
        <div className="catalog-segmented-filter" role="group" aria-label="Filtrar por estado">
          <button
            type="button"
            className={selectedStatus === 'all' ? 'active' : ''}
            onClick={() => setSelectedStatus('all')}
          >
            Todas <span className="filter-count tabular-nums">{quotes.length}</span>
          </button>
          <button
            type="button"
            className={selectedStatus === 'Enviada' ? 'active' : ''}
            onClick={() => setSelectedStatus('Enviada')}
          >
            Enviadas <span className="filter-count tabular-nums">{quotes.filter((q) => q.status === 'Enviada').length}</span>
          </button>
          <button
            type="button"
            className={selectedStatus === 'Aprobada' ? 'active' : ''}
            onClick={() => setSelectedStatus('Aprobada')}
          >
            Aprobadas <span className="filter-count tabular-nums">{approvedCount}</span>
          </button>
          <button
            type="button"
            className={selectedStatus === 'Borrador' ? 'active' : ''}
            onClick={() => setSelectedStatus('Borrador')}
          >
            Borradores <span className="filter-count tabular-nums">{quotes.filter((q) => q.status === 'Borrador').length}</span>
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
                  FOLIO <ArrowUpDown size={11} />
                </button>
              </th>
              <th>CLIENTE / EMPRESA</th>
              <th>PARTIDAS</th>
              <th>
                <button
                  type="button"
                  className="table-sort-btn"
                  onClick={() => {
                    if (sortBy === 'date') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                    else {
                      setSortBy('date')
                      setSortOrder('desc')
                    }
                  }}
                >
                  EMISIÓN / VIGENCIA <ArrowUpDown size={11} />
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
                  TOTAL COTIZADO <ArrowUpDown size={11} />
                </button>
              </th>
              <th>ESTADO</th>
              <th>PEDIDO VINCULADO</th>
              <th><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            {filteredQuotes.map((q) => (
              <tr key={q.id} className="catalog-table-row">
                <td>
                  <button
                    type="button"
                    className="catalog-item-title-btn font-mono font-bold"
                    onClick={() => setViewingQuote(q)}
                  >
                    {q.folio}
                  </button>
                </td>
                <td>
                  <div className="client-main">
                    <strong>{q.clientCompany}</strong>
                    <span>{q.clientName}</span>
                  </div>
                </td>
                <td>
                  <div className="quotes-items-snippet">
                    <span>{q.items.length} {q.items.length === 1 ? 'partida' : 'partidas'}</span>
                    <small className="text-muted">
                      ({q.items.map((it) => it.sku).join(', ')})
                    </small>
                  </div>
                </td>
                <td>
                  <div className="client-contact">
                    <span>{q.date}</span>
                    <small className="text-muted">Vence: {q.expiryDate}</small>
                  </div>
                </td>
                <td className="catalog-price-cell">
                  <strong className="catalog-unit-price font-mono tabular-nums">
                    {formatMoney(q.total, q.currency)}
                  </strong>
                  <small className="catalog-tax-hint text-muted">
                    Sub: {formatMoney(q.subtotal, q.currency)}
                  </small>
                </td>
                <td>{getStatusBadge(q.status)}</td>
                <td>
                  {q.convertedToOrderId ? (
                    <span className="catalog-sku-code font-mono text-green">
                      PED-2026-001
                    </span>
                  ) : q.status === 'Aprobada' ? (
                    <button
                      type="button"
                      className="button-convert-quick"
                      onClick={() => onConvertToOrder(q)}
                    >
                      <ShoppingBag size={12} /> Generar pedido
                    </button>
                  ) : (
                    <span className="text-muted text-xs">—</span>
                  )}
                </td>
                <td className="catalog-actions-cell">
                  <div className="row-action-wrapper">
                    <button
                      type="button"
                      className="row-more"
                      aria-label={`Acciones para ${q.folio}`}
                      onClick={() => setActiveMenuId(activeMenuId === q.id ? null : q.id)}
                    >
                      <MoreHorizontal size={17} />
                    </button>

                    {activeMenuId === q.id && (
                      <div className="catalog-action-menu">
                        <button
                          type="button"
                          onClick={() => {
                            setViewingQuote(q)
                            setActiveMenuId(null)
                          }}
                        >
                          <Eye size={13} /> Ver cotización
                        </button>
                        {!q.convertedToOrderId && (
                          <button
                            type="button"
                            onClick={() => {
                              onConvertToOrder(q)
                              setActiveMenuId(null)
                            }}
                          >
                            <ShoppingBag size={13} /> Convertir a pedido
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDuplicate(q)}
                        >
                          <Copy size={13} /> Duplicar
                        </button>
                        {q.status !== 'Aprobada' && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(q.id, 'Aprobada')}
                          >
                            <CheckCircle2 size={13} /> Marcar como Aprobada
                          </button>
                        )}
                        {q.status !== 'Enviada' && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(q.id, 'Enviada')}
                          >
                            <Send size={13} /> Marcar como Enviada
                          </button>
                        )}
                        {q.status !== 'Rechazada' && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(q.id, 'Rechazada')}
                          >
                            <XCircle size={13} /> Marcar como Rechazada
                          </button>
                        )}
                        <button
                          type="button"
                          className="action-danger"
                          onClick={() => handleDelete(q.id, q.folio)}
                        >
                          <Trash2 size={13} /> Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredQuotes.length === 0 && (
          <div className="clients-empty">
            <FileText size={24} />
            <strong>No se encontraron cotizaciones</strong>
            <span>Prueba ajustando el término de búsqueda o selecciona otro filtro.</span>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                setSearchQuery('')
                setSelectedStatus('all')
              }}
            >
              Restablecer filtros
            </button>
          </div>
        )}
      </div>

      {/* Modal: New Quote */}
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
            aria-labelledby="quote-modal-title"
          >
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">VENTAS · NUEVA PROPUESTA</div>
                <h2 id="quote-modal-title">Crear cotización comercial</h2>
                <p>Selecciona un cliente y agrega partidas de tu catálogo con cálculo de impuestos en tiempo real.</p>
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
                handleSaveQuote('Enviada')
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
                        setCustomClientEmail(cl.email)
                      }
                    }}
                  >
                    {clientNames.map((cl) => (
                      <option key={cl.id} value={cl.id}>
                        {cl.company} ({cl.name})
                      </option>
                    ))}
                    <option value="custom">Otro cliente / Manual</option>
                  </select>
                </label>

                <label className="form-field">
                  <span>Vigencia de la propuesta</span>
                  <select
                    value={validDays}
                    onChange={(e) => setValidDays(Number(e.target.value))}
                  >
                    <option value={7}>7 días naturales</option>
                    <option value={15}>15 días naturales (Estándar)</option>
                    <option value={30}>30 días naturales</option>
                    <option value={45}>45 días naturales</option>
                  </select>
                </label>
              </div>

              {selectedClientId === 'custom' && (
                <div className="form-grid form-grid-3">
                  <label className="form-field">
                    <span>Nombre de la empresa *</span>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Industrias Apex"
                      value={customClientCompany}
                      onChange={(e) => setCustomClientCompany(e.target.value)}
                    />
                  </label>
                  <label className="form-field">
                    <span>Contacto directo</span>
                    <input
                      type="text"
                      placeholder="Ej. Carlos Mendoza"
                      value={customClientName}
                      onChange={(e) => setCustomClientName(e.target.value)}
                    />
                  </label>
                  <label className="form-field">
                    <span>Correo electrónico</span>
                    <input
                      type="email"
                      placeholder="contacto@apex.mx"
                      value={customClientEmail}
                      onChange={(e) => setCustomClientEmail(e.target.value)}
                    />
                  </label>
                </div>
              )}

              {/* Line Items Builder */}
              <div className="form-section-divider">PARTIDAS DE LA COTIZACIÓN</div>

              {/* Add item control */}
              <div className="quote-item-add-bar">
                <div className="form-field" style={{ flex: 2 }}>
                  <select
                    value={selectedProductSku}
                    onChange={(e) => setSelectedProductSku(e.target.value)}
                  >
                    <option value="">Selecciona un producto o servicio del catálogo...</option>
                    {initialProductsAndServices.map((prod) => (
                      <option key={prod.sku} value={prod.sku}>
                        [{prod.sku}] {prod.name} — {formatMoney(prod.unitPrice)}/{prod.unitOfMeasure}
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

              {/* Items List Table */}
              {lineItems.length > 0 ? (
                <div className="quote-items-table-box">
                  <table className="quote-items-table">
                    <thead>
                      <tr>
                        <th>Artículo / SKU</th>
                        <th>Cant.</th>
                        <th>Precio unit.</th>
                        <th>IVA</th>
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
                          <td style={{ width: '75px' }}>
                            <input
                              type="number"
                              min="1"
                              className="qty-input font-mono tabular-nums"
                              value={it.quantity}
                              onChange={(e) => handleUpdateItemQty(it.id, parseInt(e.target.value) || 1)}
                            />
                          </td>
                          <td className="font-mono tabular-nums">{formatMoney(it.unitPrice)}</td>
                          <td className="text-muted">{it.taxRate}</td>
                          <td className="font-mono tabular-nums font-bold">{formatMoney(it.subtotal)}</td>
                          <td>
                            <button
                              type="button"
                              className="address-remove-btn"
                              aria-label="Quitar partida"
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
              ) : (
                <div className="quote-no-items">
                  <AlertCircle size={16} />
                  <span>No has agregado partidas. Selecciona artículos del catálogo arriba.</span>
                </div>
              )}

              {/* Totals Summary */}
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
                  <span>Total cotización</span>
                  <strong className="font-mono tabular-nums">{formatMoney(calculatedTotal)}</strong>
                </div>
              </div>

              {/* Notes & Terms */}
              <div className="form-grid">
                <label className="form-field">
                  <span>Notas al cliente</span>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Instrucciones especiales o alcance..."
                  />
                </label>
                <label className="form-field">
                  <span>Términos y condiciones</span>
                  <textarea
                    rows={2}
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    placeholder="Condiciones de pago, entrega y validez..."
                  />
                </label>
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
                  type="button"
                  className="button button-secondary"
                  onClick={() => handleSaveQuote('Borrador')}
                >
                  Guardar como borrador
                </button>
                <button type="submit" className="button button-primary">
                  <Send size={14} /> Guardar y emitir
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal: View Quote Preview */}
      {viewingQuote && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setViewingQuote(null)
          }}
        >
          <section
            className="create-modal quote-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="preview-modal-title"
          >
            {/* Header / Document top */}
            <div className="quote-doc-header">
              <div>
                <div className="quote-doc-badge">COTIZACIÓN COMERCIAL</div>
                <h2 id="preview-modal-title" className="font-mono font-bold">
                  {viewingQuote.folio}
                </h2>
                <div className="quote-doc-dates">
                  <span>Emisión: {viewingQuote.date}</span>
                  <span aria-hidden="true">·</span>
                  <span>Vigencia hasta: {viewingQuote.expiryDate}</span>
                </div>
              </div>
              <div className="quote-doc-header-right">
                {getStatusBadge(viewingQuote.status)}
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setViewingQuote(null)}
                  aria-label="Cerrar vista"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Client Card */}
            <div className="quote-recipient-card">
              <div className="recipient-label">PREPARADO PARA</div>
              <div className="recipient-details">
                <strong>{viewingQuote.clientCompany}</strong>
                <span>Atención: {viewingQuote.clientName}</span>
                <small className="text-muted">{viewingQuote.clientEmail}</small>
              </div>
            </div>

            {/* Items Table */}
            <div className="quote-items-preview-table-wrap">
              <table className="quote-items-table">
                <thead>
                  <tr>
                    <th>Partida / Descripción</th>
                    <th>Cant.</th>
                    <th>Precio unit.</th>
                    <th>IVA</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingQuote.items.map((it, idx) => (
                    <tr key={it.id || idx}>
                      <td>
                        <strong>{it.name}</strong>
                        <small className="text-muted block font-mono">{it.sku} · {it.unitOfMeasure}</small>
                      </td>
                      <td className="font-mono tabular-nums">{it.quantity}</td>
                      <td className="font-mono tabular-nums">{formatMoney(it.unitPrice, viewingQuote.currency)}</td>
                      <td className="text-muted">{it.taxRate}</td>
                      <td className="font-mono tabular-nums font-bold text-right">
                        {formatMoney(it.total, viewingQuote.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Box */}
            <div className="quote-doc-totals">
              <div className="totals-row">
                <span>Subtotal neto:</span>
                <strong className="font-mono tabular-nums">{formatMoney(viewingQuote.subtotal, viewingQuote.currency)}</strong>
              </div>
              <div className="totals-row">
                <span>Impuesto (IVA trasladado):</span>
                <strong className="font-mono tabular-nums">{formatMoney(viewingQuote.taxTotal, viewingQuote.currency)}</strong>
              </div>
              <div className="totals-row totals-grand">
                <span>Total a pagar:</span>
                <strong className="font-mono tabular-nums">{formatMoney(viewingQuote.total, viewingQuote.currency)}</strong>
              </div>
            </div>

            {/* Terms and notes */}
            {viewingQuote.terms && (
              <div className="quote-doc-terms">
                <strong>Términos y condiciones:</strong>
                <p>{viewingQuote.terms}</p>
              </div>
            )}
            {viewingQuote.notes && (
              <div className="quote-doc-notes">
                <strong>Notas:</strong>
                <p>{viewingQuote.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="create-modal-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setViewingQuote(null)}
              >
                Cerrar
              </button>
              {viewingQuote.status !== 'Aprobada' && (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => handleStatusChange(viewingQuote.id, 'Aprobada')}
                >
                  <Check size={14} /> Aprobar cotización
                </button>
              )}
              {!viewingQuote.convertedToOrderId ? (
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => {
                    const q = viewingQuote
                    setViewingQuote(null)
                    onConvertToOrder(q)
                  }}
                >
                  <ShoppingBag size={14} /> Convertir a pedido de venta
                </button>
              ) : (
                <span className="demo-pill">
                  <Check size={12} /> Convertida a pedido
                </span>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
