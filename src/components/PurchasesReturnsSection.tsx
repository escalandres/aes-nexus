import { useMemo, useState } from 'react'
import {
  RotateCcw,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  ReceiptText,
  XCircle,
  Eye,
  Trash2,
  X,
  ArrowRight,
  Send,
  ShieldCheck,
  GitBranch,
  Lock,
} from 'lucide-react'
import type { PurchaseOrder, Warehouse } from '../data/operations'
import type { BillPayable } from '../data/finance'
import {
  DEFAULT_RETURN_WORKFLOWS,
  RETURN_CONDITIONS,
  RETURN_REASONS,
  SUPPLIER_RETURN_DISPOSITIONS,
  canUserApproveWorkflowStep,
  doesTransitionRequireApproval,
  getAllowedNextStatusesForReturn,
  type ReturnDisposition,
  type ReturnEntityWorkflowConfig,
  type ReturnItemCondition,
  type ReturnLineItem,
  type ReturnReason,
  type SupplierReturn,
  type SupplierReturnResolution,
  type SupplierReturnStatus,
} from '../data/returns'
import { useToast } from './Toast'

interface CatalogProductCostOption {
  id: string
  sku: string
  name: string
  cost: number
  unitOfMeasure: string
}

interface PurchasesReturnsSectionProps {
  returns: SupplierReturn[]
  purchaseOrders: PurchaseOrder[]
  payables: BillPayable[]
  warehouses: Warehouse[]
  catalogProducts: CatalogProductCostOption[]
  currentUserName: string
  userRoleIds?: string[]
  isFullAdmin?: boolean
  workflowConfig?: ReturnEntityWorkflowConfig<SupplierReturnStatus>
  canCreate?: boolean
  canEdit?: boolean
  onCreateReturn: (ret: SupplierReturn) => void
  onAdvanceReturnStatus: (
    returnId: string,
    nextStatus: SupplierReturnStatus,
    noteOverride?: string,
    rmaOverride?: string
  ) => void
  onRequestApproval?: (
    returnId: string,
    targetStatus: SupplierReturnStatus,
    noteOverride?: string,
    rmaOverride?: string
  ) => void
  onApproveTransition?: (returnId: string) => void
  onRejectApproval?: (returnId: string, reason?: string) => void
  onDeleteReturn?: (returnId: string) => void
  onNavigateFinancePayables?: () => void
  onNavigatePurchaseOrders?: () => void
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

interface DraftSupplierLine {
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

export function PurchasesReturnsSection({
  returns,
  purchaseOrders,
  payables,
  warehouses,
  catalogProducts,
  currentUserName,
  userRoleIds = [],
  isFullAdmin = true,
  workflowConfig = DEFAULT_RETURN_WORKFLOWS.supplier,
  canCreate = true,
  canEdit = true,
  onCreateReturn,
  onAdvanceReturnStatus,
  onRequestApproval,
  onApproveTransition,
  onRejectApproval,
  onDeleteReturn,
  onNavigateFinancePayables,
  onNavigatePurchaseOrders,
  onConfigureWorkflow,
}: PurchasesReturnsSectionProps) {
  const toast = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'Todas' | SupplierReturnStatus>('Todas')
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all')

  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [viewingReturnId, setViewingReturnId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [transitionNoteInput, setTransitionNoteInput] = useState('')
  const [transitionRmaInput, setTransitionRmaInput] = useState('')

  const viewingReturn = useMemo(
    () => (viewingReturnId ? returns.find((r) => r.id === viewingReturnId) || null : null),
    [viewingReturnId, returns]
  )

  // Create form state
  const defaultPo = purchaseOrders.find((p) => p.status !== 'Cancelada') || purchaseOrders[0]
  const [selectedPoId, setSelectedPoId] = useState<string>(defaultPo?.id || 'manual')
  const [supplierCompany, setSupplierCompany] = useState<string>(defaultPo?.supplierCompany || '')
  const [supplierContact, setSupplierContact] = useState<string>(defaultPo?.supplierContact || '')
  const [warehouseId, setWarehouseId] = useState<string>(
    defaultPo?.warehouseId || warehouses[0]?.id || 'wh_central'
  )
  const [reason, setReason] = useState<ReturnReason>('Defecto de fábrica')
  const [resolution, setResolution] = useState<SupplierReturnResolution>('Nota de crédito (CxP)')
  const [rmaSupplierCode, setRmaSupplierCode] = useState('')
  const [notes, setNotes] = useState('')
  const [draftLines, setDraftLines] = useState<DraftSupplierLine[]>([])
  const [manualProductSku, setManualProductSku] = useState<string>(catalogProducts[0]?.sku || '')

  const buildLinesFromPo = (po: PurchaseOrder): DraftSupplierLine[] =>
    po.items.map((it) => ({
      selected: true,
      sku: it.sku,
      name: it.name,
      maxQty: Math.max(1, it.receivedQty > 0 ? it.receivedQty : it.quantity),
      quantity: 1,
      unitAmount: it.unitCost,
      taxRate: it.taxRate,
      unitOfMeasure: 'Pza',
      condition: 'Dañado / defectuoso',
      disposition: 'Reposición con proveedor',
    }))

  const openCreateModal = () => {
    const po = purchaseOrders.find((p) => p.status === 'Recibida' || p.status === 'Recepción parcial') || purchaseOrders[0]
    if (po) {
      setSelectedPoId(po.id)
      setSupplierCompany(po.supplierCompany)
      setSupplierContact(po.supplierContact)
      setWarehouseId(po.warehouseId)
      setDraftLines(buildLinesFromPo(po))
    } else {
      setSelectedPoId('manual')
      setSupplierCompany('')
      setSupplierContact('')
      setWarehouseId(warehouses[0]?.id || 'wh_central')
      setDraftLines([])
    }
    setReason('Defecto de fábrica')
    setResolution('Nota de crédito (CxP)')
    setRmaSupplierCode('')
    setNotes('')
    setIsNewModalOpen(true)
  }

  const handlePoChange = (poId: string) => {
    setSelectedPoId(poId)
    if (poId === 'manual') {
      setSupplierCompany('')
      setSupplierContact('')
      setDraftLines([])
      return
    }
    const po = purchaseOrders.find((p) => p.id === poId)
    if (po) {
      setSupplierCompany(po.supplierCompany)
      setSupplierContact(po.supplierContact)
      setWarehouseId(po.warehouseId)
      setDraftLines(buildLinesFromPo(po))
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
        unitAmount: prod.cost,
        taxRate: '16%',
        unitOfMeasure: prod.unitOfMeasure || 'Pza',
        condition: 'Dañado / defectuoso',
        disposition: 'Reposición con proveedor',
      },
    ])
  }

  const draftTotals = useMemo(() => {
    const chosen = draftLines.filter((l) => l.selected && l.quantity > 0)
    const subtotal = chosen.reduce((s, l) => s + l.quantity * l.unitAmount, 0)
    const taxTotal = chosen.reduce(
      (s, l) => s + Math.round(l.quantity * l.unitAmount * taxRateFactor(l.taxRate)),
      0
    )
    return {
      units: chosen.reduce((s, l) => s + l.quantity, 0),
      subtotal,
      taxTotal,
      total: subtotal + taxTotal,
    }
  }, [draftLines])

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplierCompany.trim()) {
      toast.warning('Indica el proveedor para registrar la devolución.', 'Proveedor requerido')
      return
    }
    const chosen = draftLines.filter((l) => l.selected && l.quantity > 0)
    if (chosen.length === 0) {
      toast.warning('Selecciona al menos un SKU y cantidad para devolver al proveedor.', 'Partidas requeridas')
      return
    }

    const po = purchaseOrders.find((p) => p.id === selectedPoId)
    const linkedBill = po
      ? payables.find((b) => b.purchaseOrderFolio === po.folio)
      : undefined
    const wh = warehouses.find((w) => w.id === warehouseId)

    const items: ReturnLineItem[] = chosen.map((l, idx) => {
      const sub = Math.round(l.quantity * l.unitAmount)
      const tax = Math.round(sub * taxRateFactor(l.taxRate))
      return {
        id: `rli_p_${Date.now()}_${idx}`,
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

    const folio = `DEV-PRV-2026-${String(returns.length + 1).padStart(3, '0')}`
    const createdAtIso = new Date().toISOString()
    const created: SupplierReturn = {
      id: `rtv_prv_${Date.now()}`,
      folio,
      date: formatTodayShortEs(),
      purchaseOrderId: po?.id,
      purchaseOrderFolio: po?.folio || 'DIRECTA',
      billId: linkedBill?.id,
      billFolio: linkedBill?.folio,
      supplierCompany: supplierCompany.trim(),
      supplierContact: supplierContact.trim() || supplierCompany.trim(),
      warehouseId: wh?.id || warehouseId,
      warehouseName: wh?.name || 'Almacén Central Vallejo',
      reason,
      resolution,
      status: workflowConfig.initialStatus,
      items,
      subtotal,
      taxTotal,
      total,
      currency: po?.currency || 'MXN',
      inventoryApplied: false,
      financeApplied: false,
      rmaSupplierCode: rmaSupplierCode.trim() || undefined,
      notes: notes.trim() || undefined,
      createdBy: currentUserName,
      updatedAtIso: createdAtIso,
      approvalStatus: 'not_required',
      workflowHistory: [
        {
          id: `whist_p_${Date.now()}`,
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

  const kpis = useMemo(() => {
    const active = returns.filter((r) => r.status !== 'Cancelada')
    const totalValue = active.reduce((s, r) => s + r.total, 0)
    const pendingAuth = returns.filter(
      (r) => r.status === 'Borrador' || r.status === 'Autorizada por proveedor'
    ).length
    const awaitingCredit = returns.filter((r) => r.status === 'Enviada a proveedor').length
    const creditedValue = returns
      .filter((r) => r.status === 'Acreditada / compensada')
      .reduce((s, r) => s + r.total, 0)
    return { totalValue, pendingAuth, awaitingCredit, creditedValue }
  }, [returns])

  const filteredReturns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return returns.filter((ret) => {
      const matchStatus = statusFilter === 'Todas' || ret.status === statusFilter
      const matchWh = warehouseFilter === 'all' || ret.warehouseId === warehouseFilter
      const matchSearch =
        !q ||
        ret.folio.toLowerCase().includes(q) ||
        ret.purchaseOrderFolio.toLowerCase().includes(q) ||
        (ret.billFolio || '').toLowerCase().includes(q) ||
        (ret.rmaSupplierCode || '').toLowerCase().includes(q) ||
        ret.supplierCompany.toLowerCase().includes(q) ||
        ret.items.some((i) => i.sku.toLowerCase().includes(q) || i.name.toLowerCase().includes(q))
      return matchStatus && matchWh && matchSearch
    })
  }, [returns, statusFilter, warehouseFilter, searchQuery])

  const renderStatusLabel = (status: SupplierReturnStatus) => {
    switch (status) {
      case 'Borrador':
        return (
          <span className="ret-status is-pending">
            <Clock size={12} aria-hidden="true" /> Borrador
          </span>
        )
      case 'Autorizada por proveedor':
        return (
          <span className="ret-status is-transit">
            <ShieldCheck size={12} aria-hidden="true" /> Autorizada
          </span>
        )
      case 'Enviada a proveedor':
        return (
          <span className="ret-status is-received">
            <Truck size={12} aria-hidden="true" /> Enviada a proveedor
          </span>
        )
      case 'Acreditada / compensada':
        return (
          <span className="ret-status is-settled">
            <CheckCircle2 size={12} aria-hidden="true" /> Acreditada (CxP)
          </span>
        )
      case 'Cancelada':
        return (
          <span className="ret-status is-rejected">
            <XCircle size={12} aria-hidden="true" /> Cancelada
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
            <h2>Devoluciones a Proveedores (RTV)</h2>
            <p>
              Reclamaciones de garantía, salida física de almacén vinculada a órdenes de compra y aplicación de notas de crédito en CxP.
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
          {onNavigatePurchaseOrders && (
            <button
              type="button"
              className="button button-secondary button-sm"
              onClick={onNavigatePurchaseOrders}
            >
              Órdenes de compra
            </button>
          )}
          {canCreate && (
            <button type="button" className="button button-primary" onClick={openCreateModal}>
              <Plus size={14} /> Nueva devolución a proveedor
            </button>
          )}
        </div>
      </div>

      {/* Single-elevation 4-KPI strip */}
      <div className="ret-kpi-strip">
        <article className="ret-kpi-card">
          <span className="ret-kpi-label">VALOR RECLAMADO</span>
          <strong className="ret-kpi-val tabular-nums">{money(kpis.totalValue)}</strong>
          <small>{returns.filter((r) => r.status !== 'Cancelada').length} expedientes activos</small>
        </article>
        <article className="ret-kpi-card">
          <span className="ret-kpi-label">POR DESPACHAR DE ALMACÉN</span>
          <strong className={`ret-kpi-val tabular-nums ${kpis.pendingAuth > 0 ? 'is-amber' : ''}`}>
            {kpis.pendingAuth}
          </strong>
          <small>En borrador o autorizadas por proveedor</small>
        </article>
        <article className="ret-kpi-card">
          <span className="ret-kpi-label">PENDIENTES DE CRÉDITO CXP</span>
          <strong className={`ret-kpi-val tabular-nums ${kpis.awaitingCredit > 0 ? 'is-amber' : ''}`}>
            {kpis.awaitingCredit}
          </strong>
          <small>Enviadas esperando compensación fiscal</small>
        </article>
        <article className="ret-kpi-card">
          <span className="ret-kpi-label">ACREDITADO EN CXP</span>
          <strong className="ret-kpi-val is-ok tabular-nums">{money(kpis.creditedValue)}</strong>
          <small>Saldo descontado a proveedores</small>
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
            placeholder="Buscar folio, OC, factura CxP, RMA proveedor o SKU..."
            aria-label="Buscar devoluciones a proveedores"
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
              {st === 'Autorizada por proveedor'
                ? 'Autorizadas'
                : st === 'Acreditada / compensada'
                ? 'Acreditadas'
                : st}
            </button>
          ))}
        </div>

        <select
          className="ret-select-filter"
          value={warehouseFilter}
          onChange={(e) => setWarehouseFilter(e.target.value)}
          aria-label="Filtrar por almacén de salida"
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
              <th>Folio RTV · Fecha</th>
              <th>Proveedor / OC Origen</th>
              <th>Artículos · Motivo</th>
              <th>Almacén salida</th>
              <th style={{ textAlign: 'right' }}>Importe</th>
              <th>Estado</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredReturns.length === 0 ? (
              <tr>
                <td colSpan={7} className="ret-empty-cell">
                  No se encontraron devoluciones a proveedores con los filtros aplicados.
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
                        <span className="ret-meta-text tabular-nums">
                          {ret.date}
                          {ret.rmaSupplierCode ? ` · ${ret.rmaSupplierCode}` : ''}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="ret-primary-cell">
                        <strong>{ret.supplierCompany}</strong>
                        <span className="ret-meta-text tabular-nums">
                          {ret.purchaseOrderFolio}
                          {ret.billFolio ? ` · ${ret.billFolio}` : ''}
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
                          {ret.inventoryApplied ? 'Salida aplicada en Kardex' : 'En resguardo'}
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
                                <ShieldCheck size={12} /> Aprobar →{' '}
                                {ret.pendingTargetStatus === 'Acreditada / compensada'
                                  ? 'CxP'
                                  : ret.pendingTargetStatus}
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
                            .filter((st) => st !== 'Cancelada')
                            .map((nextSt) => {
                              const needsApproval = doesTransitionRequireApproval(
                                workflowConfig,
                                nextSt,
                                ret.total
                              )
                              const targetRule = workflowConfig.steps.find((s) => s.status === nextSt)
                              const shortBtnLabel =
                                nextSt === 'Autorizada por proveedor'
                                  ? 'Autorizar RMA'
                                  : nextSt === 'Enviada a proveedor'
                                  ? 'Despachar salida'
                                  : nextSt === 'Acreditada / compensada'
                                  ? 'Acreditar CxP'
                                  : nextSt
                              const handleActionClick = () => {
                                if (
                                  (targetRule?.requireNotesOnEntry && !ret.notes?.trim()) ||
                                  (targetRule?.requireDocumentRefOnEntry &&
                                    !ret.rmaSupplierCode?.trim())
                                ) {
                                  setViewingReturnId(ret.id)
                                  setConfirmDelete(false)
                                  setTransitionNoteInput('')
                                  setTransitionRmaInput(ret.rmaSupplierCode || '')
                                  toast.info(
                                    `Completa los campos obligatorios antes de pasar a "${nextSt}".`,
                                    'Validación de flujo'
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
                                    nextSt === 'Autorizada por proveedor'
                                      ? 'button-secondary'
                                      : 'button-primary'
                                  } button-sm`}
                                  onClick={handleActionClick}
                                >
                                  {needsApproval ? (
                                    <Lock size={12} />
                                  ) : nextSt === 'Enviada a proveedor' ? (
                                    <Send size={12} />
                                  ) : nextSt === 'Acreditada / compensada' ? (
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
                            setTransitionRmaInput(ret.rmaSupplierCode || '')
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
            aria-labelledby="new-prv-ret-title"
            onSubmit={handleSubmitCreate}
          >
            <div className="create-modal-heading">
              <div>
                <div className="eyebrow">
                  <span className="eyebrow-line" /> COMPRAS · DEVOLUCIONES A PROVEEDOR
                </div>
                <h2 id="new-prv-ret-title">Registrar Devolución a Proveedor (RTV)</h2>
                <p>
                  Vincula una orden de compra recibida, controla la salida de almacén y compensa el saldo en Cuentas por Pagar.
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
                <span>Orden de compra origen *</span>
                <select value={selectedPoId} onChange={(e) => handlePoChange(e.target.value)}>
                  {purchaseOrders.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.folio} · {po.supplierCompany} ({money(po.total, po.currency)})
                    </option>
                  ))}
                  <option value="manual">Captura manual sin orden de compra</option>
                </select>
              </label>

              <label className="form-field">
                <span>Almacén de salida *</span>
                <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>Proveedor *</span>
                <input
                  type="text"
                  required
                  value={supplierCompany}
                  onChange={(e) => setSupplierCompany(e.target.value)}
                  placeholder="Razón social del proveedor"
                />
              </label>

              <label className="form-field">
                <span>Código RMA del proveedor (opcional)</span>
                <input
                  type="text"
                  value={rmaSupplierCode}
                  onChange={(e) => setRmaSupplierCode(e.target.value)}
                  placeholder="ej. RMA-ATL-5012"
                />
              </label>

              <label className="form-field">
                <span>Motivo de reclamación *</span>
                <select value={reason} onChange={(e) => setReason(e.target.value as ReturnReason)}>
                  {RETURN_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>Resolución esperada *</span>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as SupplierReturnResolution)}
                >
                  <option value="Nota de crédito (CxP)">Nota de crédito (CxP)</option>
                  <option value="Reposición de mercancía">Reposición de mercancía</option>
                  <option value="Reembolso proveedor">Reembolso proveedor</option>
                </select>
              </label>
            </div>

            {/* Line selector */}
            <div className="ret-modal-lines-block">
              <div className="ret-modal-lines-head">
                <strong>Partidas incluidas en el retorno</strong>
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
                      <th>Condición</th>
                      <th>Disposición</th>
                      <th style={{ textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draftLines.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="ret-empty-cell">
                          Agrega artículos o selecciona una orden de compra origen.
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
                              {SUPPLIER_RETURN_DISPOSITIONS.map((d) => (
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
              <span>Notas para el proveedor y almacén</span>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detalle de falla, lote, guía de paquetería o acuerdo comercial..."
              />
            </label>

            <div className="ret-modal-footer">
              <div className="ret-modal-summary tabular-nums">
                <span>
                  {draftTotals.units} ud(s.) · Subtotal {money(draftTotals.subtotal)} · IVA {money(draftTotals.taxTotal)}
                </span>
                <strong>Total a reclamar: {money(draftTotals.total)}</strong>
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
                  <span className="eyebrow-line" /> EXPEDIENTE RTV · {viewingReturn.folio}
                </div>
                <h2>{viewingReturn.supplierCompany}</h2>
                <p>
                  {viewingReturn.purchaseOrderFolio}
                  {viewingReturn.billFolio ? ` · CxP ${viewingReturn.billFolio}` : ''} ·{' '}
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
                <span>Salida de inventario</span>
                <strong>
                  {viewingReturn.inventoryApplied
                    ? 'Descontado en almacén y Kardex'
                    : 'Pendiente de despacho físico'}
                </strong>
              </div>
              <div>
                <span>Nota de crédito / CxP</span>
                <strong>
                  {viewingReturn.creditNoteFolio
                    ? `NC ${viewingReturn.creditNoteFolio}`
                    : viewingReturn.billFolio
                    ? `Vinculado a ${viewingReturn.billFolio}`
                    : 'Sin factura CxP vinculada'}
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
              (() => {
                const nextStatuses = getAllowedNextStatusesForReturn(
                  workflowConfig,
                  viewingReturn.status
                )
                const needsNote = nextStatuses.some(
                  (st) => workflowConfig.steps.find((s) => s.status === st)?.requireNotesOnEntry
                )
                const needsRma = nextStatuses.some(
                  (st) =>
                    workflowConfig.steps.find((s) => s.status === st)?.requireDocumentRefOnEntry
                )
                if (!needsNote && !needsRma) return null
                return (
                  <div className="form-grid-2" style={{ marginTop: '10px' }}>
                    {needsRma && (
                      <label className="form-field">
                        <span>Código RMA del proveedor *</span>
                        <input
                          type="text"
                          value={transitionRmaInput}
                          onChange={(e) => setTransitionRmaInput(e.target.value)}
                          placeholder="ej. RMA-ATL-5012"
                        />
                      </label>
                    )}
                    {needsNote && (
                      <label className="form-field">
                        <span>Nota de validación / dictamen de estado</span>
                        <input
                          type="text"
                          value={transitionNoteInput}
                          onChange={(e) => setTransitionNoteInput(e.target.value)}
                          placeholder="Justificación requerida por reglas del flujo..."
                        />
                      </label>
                    )}
                  </div>
                )
              })()}

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
                      <Trash2 size={13} /> Eliminar RTV
                    </button>
                  )
                })()}
                {onNavigateFinancePayables && (
                  <button
                    type="button"
                    className="button button-secondary button-sm"
                    onClick={() => {
                      setViewingReturnId(null)
                      onNavigateFinancePayables()
                    }}
                  >
                    Ver CxP <ArrowRight size={13} />
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
                      const isCancelAction = nextSt === 'Cancelada'
                      return (
                        <button
                          key={nextSt}
                          type="button"
                          className={`button ${
                            isCancelAction ? 'button-ghost' : 'button-primary'
                          }`}
                          onClick={() => {
                            const finalNote =
                              transitionNoteInput.trim() || viewingReturn.notes?.trim() || ''
                            const finalRma =
                              transitionRmaInput.trim() || viewingReturn.rmaSupplierCode?.trim() || ''
                            if (targetRule?.requireNotesOnEntry && !finalNote) {
                              toast.warning(
                                `El estado "${nextSt}" exige capturar una nota antes de continuar.`,
                                'Nota requerida por flujo'
                              )
                              return
                            }
                            if (targetRule?.requireDocumentRefOnEntry && !finalRma) {
                              toast.warning(
                                `El estado "${nextSt}" exige capturar el código RMA del proveedor.`,
                                'Código RMA requerido'
                              )
                              return
                            }
                            if (needsApproval && onRequestApproval) {
                              onRequestApproval(
                                viewingReturn.id,
                                nextSt,
                                transitionNoteInput.trim() || undefined,
                                transitionRmaInput.trim() || undefined
                              )
                            } else {
                              onAdvanceReturnStatus(
                                viewingReturn.id,
                                nextSt,
                                transitionNoteInput.trim() || undefined,
                                transitionRmaInput.trim() || undefined
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
