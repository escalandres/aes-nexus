import { useState, useMemo } from 'react'
import {
  ClipboardList,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  ArrowRightCircle,
  Eye,
  X,
  Trash2,
  AlertTriangle,
  LockKeyhole,
} from 'lucide-react'
import type {
  PurchaseRequisition,
  RequisitionLineItem,
  RequisitionPriority,
} from '../data/purchases'
import type { Warehouse, InventoryItemLocation } from '../data/operations'
import { useToast } from './Toast'

interface CatalogProductOption {
  id: string
  sku: string
  name: string
  cost: number
  unitOfMeasure: string
}

interface SupplierOption {
  name: string
  company: string
  email: string
}

interface PurchasesRequisitionsProps {
  requisitions: PurchaseRequisition[]
  warehouses: Warehouse[]
  inventory: InventoryItemLocation[]
  catalogProducts: CatalogProductOption[]
  suppliers: SupplierOption[]
  departments: string[]
  currentUserName: string
  canApprovePurchases: boolean
  onCreateRequisition: (req: PurchaseRequisition) => void
  onUpdateRequisitionStatus: (
    reqId: string,
    status: 'Aprobada' | 'Rechazada'
  ) => void
  onConvertToPurchaseOrder: (
    req: PurchaseRequisition,
    supplierCompany: string,
    expectedDate: string
  ) => void
  onDeleteRequisition?: (reqId: string) => void
  onNavigateToOrder?: () => void
}

const money = (val: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(val)

export function PurchasesRequisitions({
  requisitions,
  warehouses,
  inventory,
  catalogProducts,
  suppliers,
  departments,
  currentUserName,
  canApprovePurchases,
  onCreateRequisition,
  onUpdateRequisitionStatus,
  onConvertToPurchaseOrder,
  onDeleteRequisition,
  onNavigateToOrder,
}: PurchasesRequisitionsProps) {
  const toast = useToast()
  const [statusFilter, setStatusFilter] = useState<string>('Todas')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [detailReq, setDetailReq] = useState<PurchaseRequisition | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [convertReq, setConvertReq] = useState<PurchaseRequisition | null>(null)

  // Convert to PO modal form
  const [convertSupplier, setConvertSupplier] = useState(suppliers[0]?.company || '')
  const [convertExpectedDate, setConvertExpectedDate] = useState('18 nov 2026')

  // New requisition form state
  const [newDepartment, setNewDepartment] = useState(
    departments[0] || 'Operaciones y Logística'
  )
  const [newWarehouseId, setNewWarehouseId] = useState(warehouses[0]?.id || '')
  const [newPriority, setNewPriority] = useState<RequisitionPriority>('Normal')
  const [newNeededDate, setNewNeededDate] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [newLines, setNewLines] = useState<
    Array<{
      sku: string
      name: string
      quantity: number
      estimatedUnitCost: number
      currentStock?: number
      minStock?: number
    }>
  >([])

  // Line adder
  const [selectedProdId, setSelectedProdId] = useState('')
  const [lineQty, setLineQty] = useState(1)
  const [lineCost, setLineCost] = useState(0)

  const lowStockItems = useMemo(
    () => inventory.filter((it) => it.stock <= it.minStock),
    [inventory]
  )

  const filteredRequisitions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return requisitions.filter((r) => {
      const matchStatus = statusFilter === 'Todas' || r.status === statusFilter
      const matchSearch =
        !q ||
        r.folio.toLowerCase().includes(q) ||
        r.requestedBy.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.warehouseName.toLowerCase().includes(q) ||
        r.items.some(
          (it) => it.name.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q)
        )
      return matchStatus && matchSearch
    })
  }, [requisitions, statusFilter, searchQuery])

  const newReqEstimatedTotal = useMemo(
    () => newLines.reduce((sum, l) => sum + l.quantity * l.estimatedUnitCost, 0),
    [newLines]
  )

  const handleOpenNewModal = (prefillLowStock = false) => {
    setNewDepartment(departments[0] || 'Operaciones y Logística')
    setNewWarehouseId(warehouses[0]?.id || '')
    setNewPriority(prefillLowStock ? 'Urgente' : 'Normal')
    setNewNeededDate('')
    setNewNotes(
      prefillLowStock
        ? 'Reposición sugerida automáticamente por existencias por debajo del umbral mínimo.'
        : ''
    )

    if (prefillLowStock && lowStockItems.length > 0) {
      const targetWh = lowStockItems[0].warehouseId
      setNewWarehouseId(targetWh)
      const mapped = lowStockItems.map((inv) => {
        const prod = catalogProducts.find((p) => p.sku === inv.sku)
        const suggestedQty = Math.max(2, inv.minStock * 2 - inv.stock)
        return {
          sku: inv.sku,
          name: inv.name,
          quantity: suggestedQty,
          estimatedUnitCost: prod?.cost || inv.cost || 0,
          currentStock: inv.stock,
          minStock: inv.minStock,
        }
      })
      setNewLines(mapped)
    } else {
      setNewLines([])
    }
    setIsNewModalOpen(true)
  }

  const handleAddLine = () => {
    const prod = catalogProducts.find((p) => p.id === selectedProdId)
    if (!prod) {
      toast.warning('Selecciona un artículo del catálogo.', 'Artículo requerido')
      return
    }
    if (lineQty <= 0) {
      toast.warning('La cantidad debe ser mayor a cero.', 'Cantidad inválida')
      return
    }
    const cost = lineCost > 0 ? lineCost : prod.cost
    setNewLines((prev) => [
      ...prev,
      {
        sku: prod.sku,
        name: prod.name,
        quantity: lineQty,
        estimatedUnitCost: cost,
      },
    ])
    setSelectedProdId('')
    setLineQty(1)
    setLineCost(0)
  }

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newLines.length === 0) {
      toast.warning('Agrega al menos una partida a la requisición.', 'Sin partidas')
      return
    }
    const wh = warehouses.find((w) => w.id === newWarehouseId) || warehouses[0]
    const maxNum = requisitions.reduce((max, r) => {
      const n = parseInt(r.folio.split('-').pop() || '0', 10)
      return Number.isNaN(n) ? max : Math.max(max, n)
    }, requisitions.length)
    const folio = `REQ-2026-${String(maxNum + 1).padStart(3, '0')}`
    const today = new Date()
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    const dateStr = `${String(today.getDate()).padStart(2, '0')} ${months[today.getMonth()]} ${today.getFullYear()}`
    const needed = new Date()
    needed.setDate(today.getDate() + 7)
    const neededStr =
      newNeededDate.trim() ||
      `${String(needed.getDate()).padStart(2, '0')} ${months[needed.getMonth()]} ${needed.getFullYear()}`

    const items: RequisitionLineItem[] = newLines.map((l, idx) => ({
      id: `reqi_${Date.now()}_${idx}`,
      sku: l.sku,
      name: l.name,
      quantity: l.quantity,
      estimatedUnitCost: l.estimatedUnitCost,
      subtotal: l.quantity * l.estimatedUnitCost,
      currentStock: l.currentStock,
      minStock: l.minStock,
    }))

    const created: PurchaseRequisition = {
      id: `req_${Date.now()}`,
      folio,
      date: dateStr,
      neededByDate: neededStr,
      requestedBy: currentUserName,
      department: newDepartment,
      warehouseId: wh.id,
      warehouseName: wh.name,
      priority: newPriority,
      status: 'Pendiente',
      notes: newNotes.trim() || undefined,
      items,
      estimatedTotal: newReqEstimatedTotal,
    }

    onCreateRequisition(created)
    setIsNewModalOpen(false)
    setNewLines([])
    setNewNotes('')
  }

  const handleOpenConvertModal = (req: PurchaseRequisition) => {
    setConvertReq(req)
    setConvertSupplier(suppliers[0]?.company || '')
    setConvertExpectedDate(req.neededByDate || '18 nov 2026')
  }

  const handleConfirmConvert = (e: React.FormEvent) => {
    e.preventDefault()
    if (!convertReq || !convertSupplier) {
      toast.warning('Selecciona un proveedor para generar la orden.', 'Proveedor requerido')
      return
    }
    onConvertToPurchaseOrder(convertReq, convertSupplier, convertExpectedDate)
    setConvertReq(null)
  }

  const getStatusClass = (status: PurchaseRequisition['status']) => {
    if (status === 'Aprobada') return 'status-recibida'
    if (status === 'Convertida a OC') return 'status-emitida'
    if (status === 'Rechazada') return 'status-cancelada'
    return 'status-parcial'
  }

  return (
    <div className="operations-section-container">
      {/* Header Strip */}
      <div className="ops-header-strip">
        <div className="ops-header-left">
          <div className="ops-icon-box">
            <ClipboardList size={20} />
          </div>
          <div>
            <h2>Requisiciones y Solicitudes de Compra</h2>
            <p>
              Captura necesidades internas de abasto, autoriza presupuesto y convierte solicitudes en órdenes de compra.
            </p>
          </div>
        </div>

        <div className="ops-header-right">
          <div className="ops-stat-item">
            <span className="ops-stat-label">Pendientes de aprobar</span>
            <strong className="ops-stat-val tabular-nums">
              {requisitions.filter((r) => r.status === 'Pendiente').length}
            </strong>
          </div>
          <div className="ops-stat-item">
            <span className="ops-stat-label">Listas para OC</span>
            <strong className="ops-stat-val tabular-nums">
              {requisitions.filter((r) => r.status === 'Aprobada').length}
            </strong>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="ops-toolbar">
        <div className="ops-filter-group">
          <div className="warehouse-tab-selector">
            {['Todas', 'Pendiente', 'Aprobada', 'Convertida a OC', 'Rechazada'].map((st) => (
              <button
                key={st}
                type="button"
                className={`wh-tab ${statusFilter === st ? 'active' : ''}`}
                onClick={() => setStatusFilter(st)}
              >
                {st}
                <span className="wh-badge">
                  {st === 'Todas'
                    ? requisitions.length
                    : requisitions.filter((r) => r.status === st).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="ops-actions-group">
          {lowStockItems.length > 0 && (
            <button
              type="button"
              className="button button-secondary"
              onClick={() => handleOpenNewModal(true)}
              title="Generar solicitud automática con productos en stock mínimo"
            >
              <AlertTriangle size={14} /> Reabastecer stock bajo ({lowStockItems.length})
            </button>
          )}
          <button
            type="button"
            className="button button-primary"
            onClick={() => handleOpenNewModal(false)}
          >
            <Plus size={14} /> Nueva requisición
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="ops-subbar">
        <div className="ops-search-input-wrap" style={{ maxWidth: '440px', width: '100%' }}>
          <Search size={14} />
          <input
            type="text"
            placeholder="Buscar por folio, solicitante, departamento, almacén o SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
              aria-label="Limpiar búsqueda"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Requisitions Table */}
      <div className="table-wrap ops-table-wrap">
        <table className="data-table ops-data-table">
          <thead>
            <tr>
              <th>FOLIO</th>
              <th>SOLICITANTE / ÁREA</th>
              <th>ALMACÉN DESTINO</th>
              <th>PARTIDAS</th>
              <th>REQUERIDA</th>
              <th>PRIORIDAD</th>
              <th style={{ textAlign: 'right' }}>ESTIMADO</th>
              <th>ESTADO</th>
              <th style={{ textAlign: 'right' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequisitions.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-cell">
                  No hay requisiciones que coincidan con el filtro aplicado.
                </td>
              </tr>
            ) : (
              filteredRequisitions.map((req) => (
                <tr key={req.id}>
                  <td>
                    <span className="po-folio-tag tabular-nums">{req.folio}</span>
                    {req.linkedPoFolio && (
                      <div className="req-linked-po">
                        OC: <strong>{req.linkedPoFolio}</strong>
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="supplier-cell">
                      <strong>{req.requestedBy}</strong>
                      <small>{req.department}</small>
                    </div>
                  </td>
                  <td>{req.warehouseName}</td>
                  <td>
                    <div className="order-items-summary">
                      <strong>{req.items.length} partida(s)</strong>
                      <small>{req.items.map((i) => `${i.quantity}x ${i.sku}`).join(', ')}</small>
                    </div>
                  </td>
                  <td className="date-cell tabular-nums">{req.neededByDate}</td>
                  <td>
                    <span
                      className={`req-priority-text ${
                        req.priority === 'Urgente'
                          ? 'priority-urgent'
                          : req.priority === 'Alta'
                          ? 'priority-high'
                          : ''
                      }`}
                    >
                      {req.priority}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }} className="money-cell tabular-nums">
                    <strong>{money(req.estimatedTotal)}</strong>
                  </td>
                  <td>
                    <span className={`order-status-badge ${getStatusClass(req.status)}`}>
                      {req.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="po-actions-row">
                      <button
                        type="button"
                        className="button-icon-action"
                        onClick={() => {
                          setConfirmingDelete(false)
                          setDetailReq(req)
                        }}
                        title="Ver partidas de la requisición"
                      >
                        <Eye size={13} /> Ver
                      </button>

                      {req.status === 'Pendiente' && (
                        <>
                          <button
                            type="button"
                            className={`button-icon-action ${
                              canApprovePurchases ? 'action-receive' : ''
                            }`}
                            onClick={() => {
                              if (!canApprovePurchases) {
                                toast.warning(
                                  'Tu rol actual no tiene permiso para aprobar requisiciones de compra.',
                                  'Permiso requerido'
                                )
                                return
                              }
                              onUpdateRequisitionStatus(req.id, 'Aprobada')
                            }}
                            title={
                              canApprovePurchases
                                ? 'Aprobar requisición para compra'
                                : 'Requiere capacidad de aprobación de compras'
                            }
                          >
                            {canApprovePurchases ? (
                              <CheckCircle2 size={13} />
                            ) : (
                              <LockKeyhole size={12} />
                            )}{' '}
                            Aprobar
                          </button>
                          <button
                            type="button"
                            className="button-icon-action"
                            onClick={() => {
                              if (!canApprovePurchases) {
                                toast.warning(
                                  'Tu rol actual no tiene permiso para rechazar requisiciones.',
                                  'Permiso requerido'
                                )
                                return
                              }
                              onUpdateRequisitionStatus(req.id, 'Rechazada')
                            }}
                          >
                            <XCircle size={13} /> Rechazar
                          </button>
                        </>
                      )}

                      {req.status === 'Aprobada' && (
                        <button
                          type="button"
                          className="button-icon-action action-receive"
                          onClick={() => handleOpenConvertModal(req)}
                        >
                          <ArrowRightCircle size={13} /> Generar OC
                        </button>
                      )}

                      {req.status === 'Convertida a OC' && onNavigateToOrder && (
                        <button
                          type="button"
                          className="button-icon-action"
                          onClick={onNavigateToOrder}
                        >
                          <ArrowRightCircle size={13} /> Ver OC
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Nueva Requisición */}
      {isNewModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsNewModalOpen(false)
          }}
        >
          <section className="create-modal modal-wide" role="dialog" aria-modal="true">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">COMPRAS · SOLICITUD INTERNA</div>
                <h2>Nueva Requisición de Compra</h2>
                <p>Especifica los insumos requeridos, prioridad operativa y almacén de recepción.</p>
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

            <form onSubmit={handleCreateSubmit}>
              <div className="form-grid">
                <label className="form-field">
                  <span>Departamento solicitante</span>
                  <select
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                  >
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-field">
                  <span>Almacén de entrega</span>
                  <select
                    value={newWarehouseId}
                    onChange={(e) => setNewWarehouseId(e.target.value)}
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form-grid">
                <label className="form-field">
                  <span>Prioridad operativa</span>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as RequisitionPriority)}
                  >
                    <option value="Normal">Normal</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </label>

                <label className="form-field">
                  <span>Fecha requerida</span>
                  <input
                    placeholder="Ej. 18 nov 2026"
                    value={newNeededDate}
                    onChange={(e) => setNewNeededDate(e.target.value)}
                  />
                </label>
              </div>

              <div className="po-items-builder-box">
                <div className="po-builder-title">
                  <ClipboardList size={14} /> Partidas solicitadas ({newLines.length})
                </div>

                {newLines.length > 0 ? (
                  <table className="po-builder-table">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>PRODUCTO</th>
                        <th style={{ textAlign: 'right' }}>CANT.</th>
                        <th style={{ textAlign: 'right' }}>COSTO EST.</th>
                        <th style={{ textAlign: 'right' }}>SUBTOTAL</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {newLines.map((line, idx) => (
                        <tr key={`${line.sku}_${idx}`}>
                          <td>
                            <span className="sku-badge-small">{line.sku}</span>
                          </td>
                          <td>
                            <strong>{line.name}</strong>
                          </td>
                          <td style={{ textAlign: 'right' }} className="tabular-nums">
                            {line.quantity}
                          </td>
                          <td style={{ textAlign: 'right' }} className="tabular-nums">
                            {money(line.estimatedUnitCost)}
                          </td>
                          <td style={{ textAlign: 'right' }} className="tabular-nums">
                            <strong>{money(line.quantity * line.estimatedUnitCost)}</strong>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn-remove-line"
                              onClick={() =>
                                setNewLines((prev) => prev.filter((_, i) => i !== idx))
                              }
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="po-empty-lines-hint">
                    Agrega artículos del catálogo para conformar la solicitud.
                  </div>
                )}

                <div className="po-add-line-strip">
                  <div className="po-add-prod-select">
                    <label>Artículo</label>
                    <select
                      value={selectedProdId}
                      onChange={(e) => {
                        const val = e.target.value
                        setSelectedProdId(val)
                        const p = catalogProducts.find((it) => it.id === val)
                        if (p) setLineCost(p.cost)
                      }}
                    >
                      <option value="">Selecciona artículo...</option>
                      {catalogProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} — {p.name} ({money(p.cost)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="po-add-qty">
                    <label>Cant.</label>
                    <input
                      type="number"
                      min="1"
                      value={lineQty}
                      onChange={(e) => setLineQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    />
                  </div>
                  <div className="po-add-cost">
                    <label>Costo Est. (MXN)</label>
                    <input
                      type="number"
                      min="0"
                      value={lineCost}
                      onChange={(e) => setLineCost(Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                  </div>
                  <button
                    type="button"
                    className="button button-secondary po-add-btn"
                    onClick={handleAddLine}
                  >
                    <Plus size={14} /> Agregar
                  </button>
                </div>

                {newLines.length > 0 && (
                  <div className="po-totals-box">
                    <div className="po-totals-row grand">
                      <span>Presupuesto estimado:</span>
                      <strong className="tabular-nums">{money(newReqEstimatedTotal)} MXN</strong>
                    </div>
                  </div>
                )}
              </div>

              <label className="form-field">
                <span>Justificación / Notas</span>
                <textarea
                  rows={2}
                  placeholder="Motivo de compra o proyecto asociado..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                />
              </label>

              <div className="create-modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsNewModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="button button-primary">
                  <ClipboardList size={14} /> Registrar requisición
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal: Detalle de Requisición */}
      {detailReq && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setDetailReq(null)
              setConfirmingDelete(false)
            }
          }}
        >
          <section className="create-modal modal-wide" role="dialog" aria-modal="true">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">REQUISICIÓN · DETALLE</div>
                <h2>{detailReq.folio}</h2>
                <p>
                  Solicitada por <strong>{detailReq.requestedBy}</strong> ({detailReq.department}) el {detailReq.date}.
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => {
                  setDetailReq(null)
                  setConfirmingDelete(false)
                }}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="po-detail-summary-grid">
              <div className="po-detail-card">
                <span>Almacén destino</span>
                <strong>{detailReq.warehouseName}</strong>
                <small>Fecha requerida: {detailReq.neededByDate}</small>
              </div>
              <div className="po-detail-card">
                <span>Prioridad</span>
                <strong>{detailReq.priority}</strong>
                <small>
                  {detailReq.approvedBy
                    ? `Aprobada por ${detailReq.approvedBy}`
                    : 'Pendiente de autorización'}
                </small>
              </div>
              <div className="po-detail-card">
                <span>Estado</span>
                <div>
                  <span className={`order-status-badge ${getStatusClass(detailReq.status)}`}>
                    {detailReq.status}
                  </span>
                </div>
                <small>
                  {detailReq.linkedPoFolio
                    ? `Convertida en ${detailReq.linkedPoFolio}`
                    : 'Sin OC generada'}
                </small>
              </div>
            </div>

            <table className="po-builder-table" style={{ marginTop: 14 }}>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>PRODUCTO</th>
                  <th style={{ textAlign: 'right' }}>CANTIDAD</th>
                  <th style={{ textAlign: 'right' }}>COSTO EST.</th>
                  <th style={{ textAlign: 'right' }}>SUBTOTAL</th>
                </tr>
              </thead>
              <tbody>
                {detailReq.items.map((it) => (
                  <tr key={it.id}>
                    <td>
                      <span className="sku-badge-small">{it.sku}</span>
                    </td>
                    <td>
                      <strong>{it.name}</strong>
                    </td>
                    <td style={{ textAlign: 'right' }} className="tabular-nums">
                      {it.quantity} pzas
                    </td>
                    <td style={{ textAlign: 'right' }} className="tabular-nums">
                      {money(it.estimatedUnitCost)}
                    </td>
                    <td style={{ textAlign: 'right' }} className="tabular-nums">
                      <strong>{money(it.subtotal)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {detailReq.notes && (
              <div className="po-notes-preview">
                <strong>Justificación:</strong>
                <p>{detailReq.notes}</p>
              </div>
            )}

            <div className={`create-modal-actions ${onDeleteRequisition ? 'has-delete-action' : ''}`}>
              {onDeleteRequisition && (
                <div className="modal-delete-slot">
                  {!confirmingDelete ? (
                    <button
                      type="button"
                      className="button button-danger-outline"
                      onClick={() => setConfirmingDelete(true)}
                    >
                      <Trash2 size={14} /> Eliminar requisición
                    </button>
                  ) : (
                    <div className="modal-delete-confirm">
                      <span>
                        ¿Eliminar <strong>{detailReq.folio}</strong>?
                      </span>
                      <button
                        type="button"
                        className="button button-danger-solid"
                        onClick={() => {
                          onDeleteRequisition(detailReq.id)
                          setDetailReq(null)
                          setConfirmingDelete(false)
                        }}
                      >
                        <Trash2 size={13} /> Confirmar
                      </button>
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => setConfirmingDelete(false)}
                      >
                        Conservar
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div className="modal-primary-actions-slot">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => {
                    setDetailReq(null)
                    setConfirmingDelete(false)
                  }}
                >
                  Cerrar
                </button>
                {detailReq.status === 'Aprobada' && (
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => {
                      const target = detailReq
                      setDetailReq(null)
                      setConfirmingDelete(false)
                      handleOpenConvertModal(target)
                    }}
                  >
                    <ArrowRightCircle size={14} /> Convertir a Orden de Compra
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Modal: Convertir Requisición en Orden de Compra */}
      {convertReq && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setConvertReq(null)
          }}
        >
          <section className="create-modal" role="dialog" aria-modal="true">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">CONVERSIÓN A ORDEN DE COMPRA</div>
                <h2>Generar OC desde {convertReq.folio}</h2>
                <p>
                  Asigna proveedor y fecha estimada de entrega para emitir la orden oficial en {convertReq.warehouseName}.
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setConvertReq(null)}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmConvert}>
              <label className="form-field">
                <span>Proveedor seleccionado *</span>
                <select
                  required
                  value={convertSupplier}
                  onChange={(e) => setConvertSupplier(e.target.value)}
                >
                  <option value="">Selecciona un proveedor...</option>
                  {suppliers.map((s) => (
                    <option key={s.company} value={s.company}>
                      {s.company} ({s.name})
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>Fecha esperada en almacén</span>
                <input
                  value={convertExpectedDate}
                  onChange={(e) => setConvertExpectedDate(e.target.value)}
                  placeholder="Ej. 18 nov 2026"
                />
              </label>

              <div className="po-totals-box" style={{ marginTop: 12 }}>
                <div className="po-totals-row">
                  <span>Subtotal ({convertReq.items.length} partidas):</span>
                  <strong className="tabular-nums">{money(convertReq.estimatedTotal)}</strong>
                </div>
                <div className="po-totals-row">
                  <span>IVA (16%):</span>
                  <strong className="tabular-nums">{money(convertReq.estimatedTotal * 0.16)}</strong>
                </div>
                <div className="po-totals-row grand">
                  <span>Total OC a emitir:</span>
                  <strong className="tabular-nums">{money(convertReq.estimatedTotal * 1.16)} MXN</strong>
                </div>
              </div>

              <div className="create-modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setConvertReq(null)}
                >
                  Cancelar
                </button>
                <button type="submit" className="button button-primary">
                  <ArrowRightCircle size={14} /> Emitir Orden de Compra
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
