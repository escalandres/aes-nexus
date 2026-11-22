import { useMemo, useState } from 'react'
import {
  RotateCcw,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  PackageCheck,
  ReceiptText,
  XCircle,
  Eye,
  Trash2,
  X,
  ArrowRight,
  Warehouse as WarehouseIcon,
  GitBranch,
  ShieldCheck,
  Lock,
} from 'lucide-react'
import type { SalesOrder } from '../data/sales'
import type { Warehouse } from '../data/operations'
import type { InvoiceReceivable } from '../data/finance'
import {
  CUSTOMER_RETURN_DISPOSITIONS,
  DEFAULT_RETURN_WORKFLOWS,
  RETURN_CONDITIONS,
  RETURN_REASONS,
  canUserApproveWorkflowStep,
  doesTransitionRequireApproval,
  getAllowedNextStatusesForReturn,
  type CustomerReturn,
  type CustomerReturnResolution,
  type CustomerReturnStatus,
  type ReturnDisposition,
  type ReturnEntityWorkflowConfig,
  type ReturnItemCondition,
  type ReturnLineItem,
  type ReturnReason,
} from '../data/returns'
import { useToast } from './Toast'

interface CatalogProductOption {
  id: string
  sku: string
  name: string
  price: number
  taxRate: '16%' | '8%' | '0%' | 'Exento'
  unitOfMeasure: string
}

interface SalesReturnsSectionProps {
  returns: CustomerReturn[]
  orders: SalesOrder[]
  receivables: InvoiceReceivable[]
  warehouses: Warehouse[]
  catalogProducts: CatalogProductOption[]
  currentUserName: string
  userRoleIds?: string[]
  isFullAdmin?: boolean
  workflowConfig?: ReturnEntityWorkflowConfig<CustomerReturnStatus>
  canCreate?: boolean
  canEdit?: boolean
  onCreateReturn: (ret: CustomerReturn) => void
  onAdvanceReturnStatus: (
    returnId: string,
    nextStatus: CustomerReturnStatus,
    noteOverride?: string
  ) => void
  onRequestApproval?: (
    returnId: string,
    targetStatus: CustomerReturnStatus,
    noteOverride?: string
  ) => void
  onApproveTransition?: (returnId: string) => void
  onRejectApproval?: (returnId: string, reason?: string) => void
  onDeleteReturn?: (returnId: string) => void
  onNavigateFinanceReceivables?: () => void
  onNavigateOperationsInventory?: () => void
  onConfigureWorkflow?: () => void
}

const money = (val: number, currency: 'MXN' | 'USD' = 'MXN') =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(val)

const taxRateFactor = (rate: ReturnLineItem['taxRate']) =>
  rate === '16%' ? 0.16 : rate === '8%' ? 0.08 : 0

const formatTodayShortEs = () => {
  const d = new Date()
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`
}

interface DraftLineRow {
  selected: boolean
  sku: string
  name: string
  maxQty: number
  quantity: number
  unitAmount: number
  taxRate: '16%' | '8%' | '0%' | 'Exento'
  unitOfMeasure: string
  condition: ReturnItemCondition
  disposition: ReturnDisposition
}

export function SalesReturnsSection({
  returns,
  orders,
  receivables,
  warehouses,
  catalogProducts,
  currentUserName,
  userRoleIds = [],
  isFullAdmin = true,
  workflowConfig = DEFAULT_RETURN_WORKFLOWS.customer,
  canCreate = true,
  canEdit = true,
  onCreateReturn,
  onAdvanceReturnStatus,
  onRequestApproval,
  onApproveTransition,
  onRejectApproval,
  onDeleteReturn,
  onNavigateFinanceReceivables,
  onNavigateOperationsInventory,
  onConfigureWorkflow,
}: SalesReturnsSectionProps) {
  const toast = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'Todas' | CustomerReturnStatus>('Todas')
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all')

  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [viewingReturnId, setViewingReturnId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [transitionNoteInput, setTransitionNoteInput] = useState('')

  const viewingReturn = useMemo(
    () => (viewingReturnId ? returns.find((r) => r.id === viewingReturnId) || null : null),
    [viewingReturnId, returns]
  )

  // Modal state
  const activeWarehouses = useMemo(() => warehouses.filter((w) => w.active), [warehouses])
  const [selectedOrderId, setSelectedOrderId] = useState<string>(orders[0]?.id || 'manual')
  const [clientCompany, setClientCompany] = useState<string>(orders[0]?.clientCompany || '')
  const [clientName, setClientName] = useState<string>(orders[0]?.clientName || '')
  const [warehouseId, setWarehouseId] = useState<string>(activeWarehouses[0]?.id || warehouses[0]?.id || 'wh_central')
  const [reason, setReason] = useState<ReturnReason>('Defecto de fábrica')
  const [resolution, setResolution] = useState<CustomerReturnResolution>('Nota de crédito (CxC)')
  const [notes, setNotes] = useState('')
  const [draftLines, setDraftLines] = useState<DraftLineRow[]>([])
  const [manualProductSku, setManualProductSku] = useState<string>(catalogProducts[0]?.sku || '')

  const buildDraftLinesFromOrder = (order: SalesOrder): DraftLineRow[] =>
    order.items
      .filter((it) => it.type === 'product' || order.items.length === 1)
      .map((it) => ({
        selected: true,
        sku: it.sku,
        name: it.name,
        maxQty: Math.max(1, it.quantity),
        quantity: 1,
        unitAmount: it.unitPrice,
        taxRate: it.taxRate,
        unitOfMeasure: it.unitOfMeasure || 'Pza',
        condition: 'Empaque abierto',
        disposition: 'Reingreso a almacén',
      }))

  const openCreateModal = () => {
    const defaultOrder = orders.find((o) => o.status !== 'Cancelado') || orders[0]
    if (defaultOrder) {
      setSelectedOrderId(defaultOrder.id)
      setClientCompany(defaultOrder.clientCompany)
      setClientName(defaultOrder.clientName)
      setDraftLines(buildDraftLinesFromOrder(defaultOrder))
    } else {
      setSelectedOrderId('manual')
      setClientCompany('')
      setClientName('')
      setDraftLines([])
    }
    setWarehouseId(activeWarehouses[0]?.id || warehouses[0]?.id || 'wh_central')
    setReason('Defecto de fábrica')
    setResolution('Nota de crédito (CxC)')
    setNotes('')
    setIsNewModalOpen(true)
  }

  const handleOrderChange = (orderId: string) => {
    setSelectedOrderId(orderId)
    if (orderId === 'manual') {
      setClientCompany('')
      setClientName('')
      setDraftLines([])
      return
    }
    const found = orders.find((o) => o.id === orderId)
    if (found) {
      setClientCompany(found.clientCompany)
      setClientName(found.clientName)
      setDraftLines(buildDraftLinesFromOrder(found))
    }
  }

  const handleAddManualLine = () => {
    const prod = catalogProducts.find((p) => p.sku === manualProductSku)
    if (!prod) return
    setDraftLines((prev) => [
      ...prev,
      {
        selected: true,
        sku: prod.sku,
        name: prod.name,
        maxQty: 999,
        quantity: 1,
        unitAmount: prod.price,
        taxRate: prod.taxRate,
        unitOfMeasure: prod.unitOfMeasure || 'Pza',
        condition: 'Sellado / intacto',
        disposition: 'Reingreso a almacén',
      },
    ])
  }

  const draftTotals = useMemo(() => {
    const selected = draftLines.filter((l) => l.selected && l.quantity > 0)
    const subtotal = selected.reduce((s, l) => s + l.quantity * l.unitAmount, 0)
    const taxTotal = selected.reduce(
      (s, l) => s + Math.round(l.quantity * l.unitAmount * taxRateFactor(l.taxRate)),
      0
    )
    return {
      count: selected.length,
      units: selected.reduce((s, l) => s + l.quantity, 0),
      subtotal,
      taxTotal,
      total: subtotal + taxTotal,
    }
  }, [draftLines])

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientCompany.trim()) {
      toast.warning('Indica la empresa o cliente para registrar la devolución.', 'Cliente requerido')
      return
    }
    const chosenLines = draftLines.filter((l) => l.selected && l.quantity > 0)
    if (chosenLines.length === 0) {
      toast.warning('Selecciona al menos un artículo y cantidad a devolver.', 'Artículos requeridos')
      return
    }

    const orderObj = orders.find((o) => o.id === selectedOrderId)
    const linkedInvoice = orderObj
      ? receivables.find(
          (inv) =>
            inv.orderId === orderObj.id ||
            inv.orderFolio === orderObj.folio ||
            orderObj.invoiceIds?.includes(inv.id)
        )
      : undefined
    const wh = warehouses.find((w) => w.id === warehouseId)

    const items: ReturnLineItem[] = chosenLines.map((l, idx) => {
      const sub = Math.round(l.quantity * l.unitAmount)
      const tax = Math.round(sub * taxRateFactor(l.taxRate))
      return {
        id: `rli_c_${Date.now()}_${idx}`,
        sku: l.sku,
        name: l.name,
        quantity: l.quantity,
        unitAmount: l.unitAmount,
        taxRate: l.taxRate,
        unitOfMeasure: l.unitOfMeasure,
        subtotal: sub,
        taxAmount: tax,
        total: sub + tax,
        condition: l.condition,
        disposition: l.disposition,
      }
    })

    const subtotal = items.reduce((s, it) => s + it.subtotal, 0)
    const taxTotal = items.reduce((s, it) => s + it.taxAmount, 0)
    const total = items.reduce((s, it) => s + it.total, 0)

    const folioNum = returns.length + 1
    const folio = `DEV-CLI-2026-${String(folioNum).padStart(3, '0')}`

    const createdAtIso = new Date().toISOString()
    const created: CustomerReturn = {
      id: `rma_cli_${Date.now()}`,
      folio,
      date: formatTodayShortEs(),
      orderId: orderObj?.id,
      orderFolio: orderObj?.folio || 'DIRECTA',
      invoiceId: linkedInvoice?.id,
      invoiceFolio: linkedInvoice?.folio,
      clientCompany: clientCompany.trim(),
      clientName: clientName.trim() || clientCompany.trim(),
      warehouseId: wh?.id || warehouseId,
      warehouseName: wh?.name || 'Almacén Central Vallejo',
      reason,
      resolution,
      status: workflowConfig.initialStatus,
      items,
      subtotal,
      taxTotal,
      total,
      currency: orderObj?.currency || 'MXN',
      inventoryApplied: false,
      financeApplied: false,
      notes: notes.trim() || undefined,
      createdBy: currentUserName,
      updatedAtIso: createdAtIso,
      approvalStatus: 'not_required',
      workflowHistory: [
        {
          id: `whist_c_${Date.now()}`,
          timestampIso: createdAtIso,
          toStatus: workflowConfig.initialStatus,
          actor: currentUserName,
          action: 'created',
          note: notes.trim() || undefined,
        },
      ],
    }

    onCreateReturn(created)
    setIsNewModalOpen(false)
  }

  // Metrics
  const kpis = useMemo(() => {
    const active = returns.filter((r) => r.status !== 'Rechazada')
    const totalAmount = active.reduce((s, r) => s + r.total, 0)
    const awaitingWarehouse = returns.filter(
      (r) => r.status === 'Solicitada' || r.status === 'En tránsito a almacén'
    ).length
    const awaitingCreditNote = returns.filter((r) => r.status === 'Recibida en almacén').length
    const reenteredUnits = returns
      .filter((r) => r.inventoryApplied)
      .reduce(
        (s, r) =>
          s +
          r.items
            .filter((it) => it.disposition === 'Reingreso a almacén')
            .reduce((is, it) => is + it.quantity, 0),
        0
      )
    return { totalAmount, awaitingWarehouse, awaitingCreditNote, reenteredUnits }
  }, [returns])

  const filteredReturns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return returns.filter((ret) => {
      const matchStatus = statusFilter === 'Todas' || ret.status === statusFilter
      const matchWh = warehouseFilter === 'all' || ret.warehouseId === warehouseFilter
      const matchSearch =
        !q ||
        ret.folio.toLowerCase().includes(q) ||
        ret.orderFolio.toLowerCase().includes(q) ||
        (ret.invoiceFolio || '').toLowerCase().includes(q) ||
        ret.clientCompany.toLowerCase().includes(q) ||
        ret.clientName.toLowerCase().includes(q) ||
        ret.items.some((i) => i.sku.toLowerCase().includes(q) || i.name.toLowerCase().includes(q))
      return matchStatus && matchWh && matchSearch
    })
  }, [returns, statusFilter, warehouseFilter, searchQuery])

  const renderStatusLabel = (status: CustomerReturnStatus) => {
    switch (status) {
      case 'Solicitada':
        return (
          <span className="ret-status is-pending">
            <Clock size={12} aria-hidden="true" /> Solicitada
          </span>
        )
      case 'En tránsito a almacén':
        return (
          <span className="ret-status is-transit">
            <Truck size={12} aria-hidden="true" /> En tránsito a almacén
          </span>
        )
      case 'Recibida en almacén':
        return (
          <span className="ret-status is-received">
            <PackageCheck size={12} aria-hidden="true" /> Recibida en almacén
          </span>
        )
      case 'Nota de crédito emitida':
        return (
          <span className="ret-status is-settled">
            <CheckCircle2 size={12} aria-hidden="true" /> Nota de crédito emitida
          </span>
        )
      case 'Rechazada':
        return (
          <span className="ret-status is-rejected">
            <XCircle size={12} aria-hidden="true" /> Rechazada
          </span>
        )
    }
  }

  return (
    <div className="ret-container">
      {/* Header */}
      <div className="ret-header-bar">
        <div className="ret-header-title">
          <div className="ret-icon-box">
            <RotateCcw size={20} />
          </div>
          <div>
            <h2>Devoluciones de Clientes (RMA)</h2>
            <p>
              Gestión de retornos de mercancía sobre pedidos y facturas, reingreso a inventario y emisión de notas de crédito en CxC.
            </p>
          </div>
        </div>
        <div className="ret-header-actions">
          {onConfigureWorkflow && (
            <button
              type="button"
              className="button button-secondary button-sm"
              onClick={onConfigureWorkflow}
              title="Configurar flujo de estados y aprobaciones en Administración"
            >
              <GitBranch size={13} /> Flujo de estados
            </button>
          )}
          {onNavigateOperationsInventory && (
            <button
              type="button"
              className="button button-secondary button-sm"
              onClick={onNavigateOperationsInventory}
            >
              <WarehouseIcon size={13} /> Inventario
            </button>
          )}
          {canCreate && (
            <button type="button" className="button button-primary" onClick={openCreateModal}>
              <Plus size={14} /> Nueva devolución de cliente
            </button>
          )}
        </div>
      </div>

      {/* Single-elevation 4-KPI strip */}
      <div className="ret-kpi-strip">
        <article className="ret-kpi-card">
          <span className="ret-kpi-label">VALOR EN DEVOLUCIONES</span>
          <strong className="ret-kpi-val tabular-nums">{money(kpis.totalAmount)}</strong>
          <small>{returns.filter((r) => r.status !== 'Rechazada').length} solicitudes activas</small>
        </article>
        <article className="ret-kpi-card">
          <span className="ret-kpi-label">POR RECIBIR EN ALMACÉN</span>
          <strong className={`ret-kpi-val tabular-nums ${kpis.awaitingWarehouse > 0 ? 'is-amber' : ''}`}>
            {kpis.awaitingWarehouse}
          </strong>
          <small>Solicitadas o en tránsito logístico</small>
        </article>
        <article className="ret-kpi-card">
          <span className="ret-kpi-label">PENDIENTES DE NOTA DE CRÉDITO</span>
          <strong className={`ret-kpi-val tabular-nums ${kpis.awaitingCreditNote > 0 ? 'is-amber' : ''}`}>
            {kpis.awaitingCreditNote}
          </strong>
          <small>Recibidas listas para acreditar en CxC</small>
        </article>
        <article className="ret-kpi-card">
          <span className="ret-kpi-label">UNIDADES REINGRESADAS</span>
          <strong className="ret-kpi-val is-ok tabular-nums">{kpis.reenteredUnits}</strong>
          <small>Stock recuperado en Kardex</small>
        </article>
      </div>

      {/* Toolbar */}
      <div className="ret-toolbar">
        <div className="ret-search">
          <Search size={14} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar folio, pedido, factura, cliente o SKU..."
            aria-label="Buscar devoluciones de clientes"
          />
        </div>

        <div className="filter-chips-row">
          {(
            [
              'Todas',
              ...workflowConfig.steps.filter((s) => s.enabled).map((s) => s.status),
            ] as const
          ).map((st) => (
            <button
              key={st}
              type="button"
              className={`filter-pill-btn ${statusFilter === st ? 'active' : ''}`}
              onClick={() => setStatusFilter(st)}
            >
              {st}
            </button>
          ))}
        </div>

        <select
          className="ret-select-filter"
          value={warehouseFilter}
          onChange={(e) => setWarehouseFilter(e.target.value)}
          aria-label="Filtrar por almacén de recepción"
        >
          <option value="all">Todos los almacenes</option>
          {warehouses.map((wh) => (
            <option key={wh.id} value={wh.id}>
              {wh.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="ret-table-wrap">
        <table className="ret-table">
          <thead>
            <tr>
              <th>Folio RMA · Fecha</th>
              <th>Cliente / Origen</th>
              <th>Artículos · Motivo</th>
              <th>Almacén destino</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th>Estado</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredReturns.length === 0 ? (
              <tr>
                <td colSpan={7} className="ret-empty-cell">
                  No se encontraron devoluciones de clientes con los filtros actuales.
                </td>
              </tr>
            ) : (
              filteredReturns.map((ret) => {
                const totalUnits = ret.items.reduce((s, it) => s + it.quantity, 0)
                return (
                  <tr key={ret.id}>
                    <td>
                      <div className="ret-primary-cell">
                        <code className="ret-folio">{ret.folio}</code>
                        <span className="ret-meta-text tabular-nums">{ret.date}</span>
                      </div>
                    </td>
                    <td>
                      <div className="ret-primary-cell">
                        <strong>{ret.clientCompany}</strong>
                        <span className="ret-meta-text tabular-nums">
                          {ret.orderFolio}
                          {ret.invoiceFolio ? ` · ${ret.invoiceFolio}` : ''}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="ret-primary-cell">
                        <span className="tabular-nums">
                          {totalUnits} {totalUnits === 1 ? 'ud.' : 'uds.'} ({ret.items[0]?.sku}
                          {ret.items.length > 1 ? ` +${ret.items.length - 1}` : ''})
                        </span>
                        <span className="ret-meta-text">
                          {ret.reason} · {ret.resolution}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="ret-primary-cell">
                        <span>{ret.warehouseName}</span>
                        <span className="ret-meta-text">
                          {ret.inventoryApplied ? 'Kardex actualizado' : 'Sin movimiento físico'}
                          {ret.creditNoteFolio ? ` · ${ret.creditNoteFolio}` : ''}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <strong className="tabular-nums">{money(ret.total, ret.currency)}</strong>
                    </td>
                    <td>
                      <div className="ret-primary-cell">
                        {renderStatusLabel(ret.status)}
                        {ret.approvalStatus === 'pending' && ret.pendingTargetStatus && (
                          <span className="ret-approval-pending-meta">
                            <Lock size={11} aria-hidden="true" /> Aprob. → {ret.pendingTargetStatus}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="ret-row-actions">
                        {ret.approvalStatus === 'pending' && ret.pendingTargetStatus ? (
                          (() => {
                            const pendingRule = workflowConfig.steps.find(
                              (s) => s.status === ret.pendingTargetStatus
                            )
                            const canApprove = canUserApproveWorkflowStep(
                              pendingRule?.approverRole || 'Administrador',
                              userRoleIds,
                              isFullAdmin,
                              canEdit
                            )
                            return canApprove && onApproveTransition ? (
                              <button
                                type="button"
                                className="button button-primary button-sm"
                                onClick={() => onApproveTransition(ret.id)}
                                title={`Aprobar transición a ${ret.pendingTargetStatus}`}
                              >
                                <ShieldCheck size={12} /> Aprobar → {ret.pendingTargetStatus === 'Nota de crédito emitida' ? 'NC' : ret.pendingTargetStatus}
                              </button>
                            ) : (
                              <span className="ret-approval-role-hint">
                                Requiere {pendingRule?.approverRole || 'Aprobador'}
                              </span>
                            )
                          })()
                        ) : (
                          canEdit &&
                          getAllowedNextStatusesForReturn(workflowConfig, ret.status)
                            .filter((st) => st !== 'Rechazada')
                            .map((nextSt) => {
                              const needsApproval = doesTransitionRequireApproval(
                                workflowConfig,
                                nextSt,
                                ret.total
                              )
                              const targetRule = workflowConfig.steps.find((s) => s.status === nextSt)
                              const shortBtnLabel =
                                nextSt === 'En tránsito a almacén'
                                  ? 'Autorizar tránsito'
                                  : nextSt === 'Recibida en almacén'
                                  ? 'Recibir en almacén'
                                  : nextSt === 'Nota de crédito emitida'
                                  ? 'Emitir NC'
                                  : nextSt
                              const handleActionClick = () => {
                                if (targetRule?.requireNotesOnEntry && !ret.notes?.trim()) {
                                  setViewingReturnId(ret.id)
                                  setConfirmDelete(false)
                                  setTransitionNoteInput('')
                                  toast.info(
                                    `Captura una nota justificativa antes de pasar a "${nextSt}".`,
                                    'Nota obligatoria'
                                  )
                                  return
                                }
                                if (needsApproval && onRequestApproval) {
                                  onRequestApproval(ret.id, nextSt)
                                } else {
                                  onAdvanceReturnStatus(ret.id, nextSt)
                                }
                              }
                              return (
                                <button
                                  key={nextSt}
                                  type="button"
                                  className={`button ${
                                    nextSt === 'En tránsito a almacén'
                                      ? 'button-secondary'
                                      : 'button-primary'
                                  } button-sm`}
                                  onClick={handleActionClick}
                                >
                                  {needsApproval ? (
                                    <Lock size={12} />
                                  ) : nextSt === 'Recibida en almacén' ? (
                                    <PackageCheck size={12} />
                                  ) : nextSt === 'Nota de crédito emitida' ? (
                                    <ReceiptText size={12} />
                                  ) : null}{' '}
                                  {needsApproval ? `Solicitar ${shortBtnLabel}` : shortBtnLabel}
                                </button>
                              )
                            })
                        )}
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => {
                            setViewingReturnId(ret.id)
                            setConfirmDelete(false)
                            setTransitionNoteInput('')
                          }}
                          title="Ver detalle de devolución"
                          aria-label={`Ver detalle ${ret.folio}`}
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {isNewModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsNewModalOpen(false)
          }}
        >
          <form
            className="create-modal modal-wide ret-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-cli-ret-title"
            onSubmit={handleSubmitCreate}
          >
            <div className="create-modal-heading">
              <div>
                <div className="eyebrow">
                  <span className="eyebrow-line" /> VENTAS · LOGÍSTICA INVERSA DE CLIENTES
                </div>
                <h2 id="new-cli-ret-title">Registrar Devolución de Cliente (RMA)</h2>
                <p>
                  Vincula un pedido existente o captura artículos manualmente para rastrear recepción en almacén y nota de crédito.
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setIsNewModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="form-grid-2">
              <label className="form-field">
                <span>Pedido de venta origen *</span>
                <select value={selectedOrderId} onChange={(e) => handleOrderChange(e.target.value)}>
                  {orders.map((ord) => (
                    <option key={ord.id} value={ord.id}>
                      {ord.folio} · {ord.clientCompany} ({money(ord.total, ord.currency)})
                    </option>
                  ))}
                  <option value="manual">Captura manual sin pedido vinculado</option>
                </select>
              </label>

              <label className="form-field">
                <span>Almacén de recepción *</span>
                <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>Empresa / Cliente *</span>
                <input
                  type="text"
                  required
                  value={clientCompany}
                  onChange={(e) => setClientCompany(e.target.value)}
                  placeholder="Razón social del cliente"
                />
              </label>

              <label className="form-field">
                <span>Contacto del cliente</span>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nombre de quien solicita"
                />
              </label>

              <label className="form-field">
                <span>Motivo de devolución *</span>
                <select value={reason} onChange={(e) => setReason(e.target.value as ReturnReason)}>
                  {RETURN_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>Resolución administrativa *</span>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as CustomerReturnResolution)}
                >
                  <option value="Nota de crédito (CxC)">Nota de crédito (CxC)</option>
                  <option value="Reposición sin costo">Reposición sin costo</option>
                  <option value="Reembolso">Reembolso</option>
                </select>
              </label>
            </div>

            {/* Line selector */}
            <div className="ret-modal-lines-block">
              <div className="ret-modal-lines-head">
                <strong>Partidas incluidas en la devolución</strong>
                <div className="ret-manual-add-row">
                  <select
                    value={manualProductSku}
                    onChange={(e) => setManualProductSku(e.target.value)}
                    aria-label="Agregar SKU del catálogo"
                  >
                    {catalogProducts.map((p) => (
                      <option key={p.sku} value={p.sku}>
                        {p.sku} · {p.name}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="button button-secondary button-sm" onClick={handleAddManualLine}>
                    <Plus size={12} /> Agregar artículo
                  </button>
                </div>
              </div>

              <div className="ret-table-wrap">
                <table className="ret-table">
                  <thead>
                    <tr>
                      <th style={{ width: '36px' }}>Inc.</th>
                      <th>SKU / Producto</th>
                      <th style={{ width: '88px' }}>Cantidad</th>
                      <th>Condición física</th>
                      <th>Disposición almacén</th>
                      <th style={{ textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draftLines.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="ret-empty-cell">
                          Agrega al menos un artículo del catálogo o selecciona un pedido de venta.
                        </td>
                      </tr>
                    ) : (
                      draftLines.map((line, idx) => (
                        <tr key={`${line.sku}_${idx}`}>
                          <td>
                            <input
                              type="checkbox"
                              checked={line.selected}
                              onChange={(e) =>
                                setDraftLines((prev) =>
                                  prev.map((row, i) =>
                                    i === idx ? { ...row, selected: e.target.checked } : row
                                  )
                                )
                              }
                            />
                          </td>
                          <td>
                            <div className="ret-primary-cell">
                              <code className="ret-folio">{line.sku}</code>
                              <span>{line.name}</span>
                            </div>
                          </td>
                          <td>
                            <input
                              type="number"
                              min={1}
                              max={line.maxQty}
                              value={line.quantity}
                              disabled={!line.selected}
                              className="ret-qty-input tabular-nums"
                              onChange={(e) => {
                                const q = Math.max(1, Math.min(line.maxQty, parseInt(e.target.value, 10) || 1))
                                setDraftLines((prev) =>
                                  prev.map((row, i) => (i === idx ? { ...row, quantity: q } : row))
                                )
                              }}
                            />
                          </td>
                          <td>
                            <select
                              value={line.condition}
                              disabled={!line.selected}
                              className="ret-inline-select"
                              onChange={(e) =>
                                setDraftLines((prev) =>
                                  prev.map((row, i) =>
                                    i === idx
                                      ? { ...row, condition: e.target.value as ReturnItemCondition }
                                      : row
                                  )
                                )
                              }
                            >
                              {RETURN_CONDITIONS.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              value={line.disposition}
                              disabled={!line.selected}
                              className="ret-inline-select"
                              onChange={(e) =>
                                setDraftLines((prev) =>
                                  prev.map((row, i) =>
                                    i === idx
                                      ? { ...row, disposition: e.target.value as ReturnDisposition }
                                      : row
                                  )
                                )
                              }
                            >
                              {CUSTOMER_RETURN_DISPOSITIONS.map((d) => (
                                <option key={d} value={d}>
                                  {d}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td style={{ textAlign: 'right' }} className="tabular-nums">
                            {money(line.quantity * line.unitAmount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <label className="form-field" style={{ marginTop: '12px' }}>
              <span>Observaciones e inspección inicial</span>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detalle de falla, serie del equipo o número de guía de retorno..."
              />
            </label>

            <div className="ret-modal-footer">
              <div className="ret-modal-summary tabular-nums">
                <span>
                  {draftTotals.units} ud(s.) · Subtotal {money(draftTotals.subtotal)} · IVA {money(draftTotals.taxTotal)}
                </span>
                <strong>Total a acreditar: {money(draftTotals.total)}</strong>
              </div>
              <div className="create-modal-actions">
                <button type="button" className="button button-ghost" onClick={() => setIsNewModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="button button-primary">
                  <CheckCircle2 size={14} /> Registrar devolución
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Detail Modal */}
      {viewingReturn && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setViewingReturnId(null)
          }}
        >
          <section className="create-modal modal-wide ret-modal" role="dialog" aria-modal="true">
            <div className="create-modal-heading">
              <div>
                <div className="eyebrow">
                  <span className="eyebrow-line" /> EXPEDIENTE RMA · {viewingReturn.folio}
                </div>
                <h2>{viewingReturn.clientCompany}</h2>
                <p>
                  {viewingReturn.orderFolio}
                  {viewingReturn.invoiceFolio ? ` · Factura ${viewingReturn.invoiceFolio}` : ''} ·{' '}
                  {viewingReturn.warehouseName} · Registró {viewingReturn.createdBy}
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setViewingReturnId(null)}
                aria-label="Cerrar detalle"
              >
                <X size={18} />
              </button>
            </div>

            <div className="ret-detail-meta-grid">
              <div>
                <span>Estado actual</span>
                <div>{renderStatusLabel(viewingReturn.status)}</div>
              </div>
              <div>
                <span>Motivo · Resolución</span>
                <strong>
                  {viewingReturn.reason} · {viewingReturn.resolution}
                </strong>
              </div>
              <div>
                <span>Impacto en inventario</span>
                <strong>
                  {viewingReturn.inventoryApplied
                    ? 'Aplicado en almacén y Kardex'
                    : 'Pendiente de recepción física'}
                </strong>
              </div>
              <div>
                <span>Documento fiscal / CxC</span>
                <strong>
                  {viewingReturn.creditNoteFolio
                    ? `NC ${viewingReturn.creditNoteFolio}`
                    : viewingReturn.invoiceFolio
                    ? `Vinculado a ${viewingReturn.invoiceFolio}`
                    : 'Sin factura vinculada'}
                </strong>
              </div>
            </div>

            {viewingReturn.approvalStatus === 'pending' && viewingReturn.pendingTargetStatus && (
              <div className="retwf-pending-box" role="status">
                <div>
                  <strong>
                    Aprobación pendiente para pasar a &ldquo;{viewingReturn.pendingTargetStatus}&rdquo;
                  </strong>
                  <span>
                    Solicitado por {viewingReturn.approvalRequestedBy || viewingReturn.createdBy} · Requiere rol:{' '}
                    {workflowConfig.steps.find((s) => s.status === viewingReturn.pendingTargetStatus)
                      ?.approverRole || 'Administrador'}
                  </span>
                </div>
              </div>
            )}

            {viewingReturn.notes && <p className="ret-detail-notes">{viewingReturn.notes}</p>}

            {canEdit &&
              viewingReturn.approvalStatus !== 'pending' &&
              getAllowedNextStatusesForReturn(workflowConfig, viewingReturn.status).some(
                (st) => workflowConfig.steps.find((s) => s.status === st)?.requireNotesOnEntry
              ) && (
                <label className="form-field" style={{ marginTop: '10px' }}>
                  <span>Nota de validación / dictamen de estado</span>
                  <input
                    type="text"
                    value={transitionNoteInput}
                    onChange={(e) => setTransitionNoteInput(e.target.value)}
                    placeholder="Agrega evidencia o motivo requerido por las reglas del flujo..."
                  />
                </label>
              )}

            <div className="ret-table-wrap" style={{ marginTop: '12px' }}>
              <table className="ret-table">
                <thead>
                  <tr>
                    <th>SKU / Producto</th>
                    <th style={{ textAlign: 'right' }}>Cant.</th>
                    <th>Condición</th>
                    <th>Disposición</th>
                    <th style={{ textAlign: 'right' }}>Importe total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingReturn.items.map((it) => (
                    <tr key={it.id}>
                      <td>
                        <div className="ret-primary-cell">
                          <code className="ret-folio">{it.sku}</code>
                          <strong>{it.name}</strong>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }} className="tabular-nums">
                        {it.quantity} {it.unitOfMeasure}
                      </td>
                      <td>{it.condition}</td>
                      <td>{it.disposition}</td>
                      <td style={{ textAlign: 'right' }} className="tabular-nums">
                        <strong>{money(it.total, viewingReturn.currency)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {viewingReturn.workflowHistory && viewingReturn.workflowHistory.length > 0 && (
              <div className="retwf-history-strip">
                <strong>Bitácora de estados del expediente</strong>
                <ul>
                  {viewingReturn.workflowHistory.slice(0, 5).map((h) => (
                    <li key={h.id}>
                      <span>
                        {h.fromStatus ? `${h.fromStatus} → ${h.toStatus}` : `Inicio: ${h.toStatus}`}
                      </span>
                      <span className="tabular-nums">
                        {h.actor} ·{' '}
                        {new Date(h.timestampIso).toLocaleDateString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                        })}
                        {h.note ? ` · ${h.note}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="ret-modal-footer">
              <div className="ret-row-actions">
                {(() => {
                  const stepRule = workflowConfig.steps.find(
                    (s) => s.status === viewingReturn.status
                  )
                  const deleteBlocked =
                    workflowConfig.preventDeleteAfterSettlement &&
                    (Boolean(stepRule?.isFinalState) ||
                      Boolean(viewingReturn.inventoryApplied) ||
                      Boolean(viewingReturn.financeApplied))
                  if (!onDeleteReturn) return null
                  if (deleteBlocked) {
                    return (
                      <span className="ret-approval-role-hint">
                        <Lock size={11} aria-hidden="true" /> Eliminación bloqueada por flujo
                      </span>
                    )
                  }
                  return confirmDelete ? (
                    <>
                      <button
                        type="button"
                        className="button button-ghost button-sm"
                        onClick={() => setConfirmDelete(false)}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="button button-danger button-sm"
                        onClick={() => {
                          onDeleteReturn(viewingReturn.id)
                          setViewingReturnId(null)
                          setConfirmDelete(false)
                        }}
                      >
                        <Trash2 size={13} /> Confirmar eliminación
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="button button-ghost button-sm"
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 size={13} /> Eliminar RMA
                    </button>
                  )
                })()}
                {onNavigateFinanceReceivables && (
                  <button
                    type="button"
                    className="button button-secondary button-sm"
                    onClick={() => {
                      setViewingReturnId(null)
                      onNavigateFinanceReceivables()
                    }}
                  >
                    Ver CxC <ArrowRight size={13} />
                  </button>
                )}
              </div>

              <div className="create-modal-actions">
                {viewingReturn.approvalStatus === 'pending' && viewingReturn.pendingTargetStatus ? (
                  (() => {
                    const pendingRule = workflowConfig.steps.find(
                      (s) => s.status === viewingReturn.pendingTargetStatus
                    )
                    const canApprove = canUserApproveWorkflowStep(
                      pendingRule?.approverRole || 'Administrador',
                      userRoleIds,
                      isFullAdmin,
                      canEdit
                    )
                    return canApprove ? (
                      <>
                        {onRejectApproval && (
                          <button
                            type="button"
                            className="button button-ghost"
                            onClick={() => {
                              onRejectApproval(
                                viewingReturn.id,
                                transitionNoteInput.trim() || undefined
                              )
                              setTransitionNoteInput('')
                            }}
                          >
                            Rechazar solicitud
                          </button>
                        )}
                        {onApproveTransition && (
                          <button
                            type="button"
                            className="button button-primary"
                            onClick={() => {
                              onApproveTransition(viewingReturn.id)
                              setTransitionNoteInput('')
                            }}
                          >
                            <ShieldCheck size={14} /> Aprobar → {viewingReturn.pendingTargetStatus}
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="ret-approval-role-hint">
                        Requiere aprobación de {pendingRule?.approverRole || 'Administrador'}
                      </span>
                    )
                  })()
                ) : (
                  canEdit &&
                  getAllowedNextStatusesForReturn(workflowConfig, viewingReturn.status).map(
                    (nextSt) => {
                      const needsApproval = doesTransitionRequireApproval(
                        workflowConfig,
                        nextSt,
                        viewingReturn.total
                      )
                      const targetRule = workflowConfig.steps.find((s) => s.status === nextSt)
                      const isRejectAction = nextSt === 'Rechazada'
                      return (
                        <button
                          key={nextSt}
                          type="button"
                          className={`button ${
                            isRejectAction ? 'button-ghost' : 'button-primary'
                          }`}
                          onClick={() => {
                            const finalNote =
                              transitionNoteInput.trim() || viewingReturn.notes?.trim() || ''
                            if (targetRule?.requireNotesOnEntry && !finalNote) {
                              toast.warning(
                                `El estado "${nextSt}" exige capturar una nota u observación antes de continuar.`,
                                'Nota requerida por flujo'
                              )
                              return
                            }
                            if (needsApproval && onRequestApproval) {
                              onRequestApproval(
                                viewingReturn.id,
                                nextSt,
                                transitionNoteInput.trim() || undefined
                              )
                            } else {
                              onAdvanceReturnStatus(
                                viewingReturn.id,
                                nextSt,
                                transitionNoteInput.trim() || undefined
                              )
                            }
                            setTransitionNoteInput('')
                          }}
                        >
                          {needsApproval ? <Lock size={13} /> : null}{' '}
                          {needsApproval ? `Solicitar: ${nextSt}` : nextSt}
                        </button>
                      )
                    }
                  )
                )}
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setViewingReturnId(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
