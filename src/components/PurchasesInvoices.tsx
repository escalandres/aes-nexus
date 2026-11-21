import { useState, useMemo } from 'react'
import {
  ReceiptText,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CreditCard,
  X,
  ArrowRight,
  Eye,
  Landmark,
  Trash2,
} from 'lucide-react'
import type { BillPayable } from '../data/finance'
import type { PurchaseOrder } from '../data/operations'
import type { EbpAggregationMode } from '../data/ebp'
import { useToast } from './Toast'

interface SupplierOption {
  name: string
  company: string
  email: string
}

interface PurchasesInvoicesProps {
  payables: BillPayable[]
  purchaseOrders: PurchaseOrder[]
  suppliers: SupplierOption[]
  onCreateSupplierBill: (bill: BillPayable) => void
  onDeleteSupplierBill?: (billId: string) => void
  onNavigateToFinancePayables?: () => void
  onOpenEbpBatchFromBills?: (bills: BillPayable[], mode?: EbpAggregationMode) => void
}

const money = (val: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(val)

export function PurchasesInvoices({
  payables,
  purchaseOrders,
  suppliers,
  onCreateSupplierBill,
  onDeleteSupplierBill,
  onNavigateToFinancePayables,
  onOpenEbpBatchFromBills,
}: PurchasesInvoicesProps) {
  const toast = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('Todas')
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [viewingBill, setViewingBill] = useState<BillPayable | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [selectedBillIds, setSelectedBillIds] = useState<Record<string, boolean>>({})

  // Modal state
  const [selectedPoId, setSelectedPoId] = useState('')
  const [supplierCompany, setSupplierCompany] = useState(suppliers[0]?.company || '')
  const [poReference, setPoReference] = useState('')
  const [subtotal, setSubtotal] = useState<number>(15000)
  const [dueDate, setDueDate] = useState('')

  const billedPoFolios = useMemo(
    () => new Set(payables.map((b) => b.purchaseOrderFolio).filter(Boolean)),
    [payables]
  )

  const unbilledOrders = useMemo(
    () =>
      purchaseOrders.filter(
        (po) => po.status !== 'Cancelada' && !billedPoFolios.has(po.folio)
      ),
    [purchaseOrders, billedPoFolios]
  )

  const filteredBills = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return payables.filter((b) => {
      const matchStatus = statusFilter === 'Todas' || b.status === statusFilter
      const matchSearch =
        !q ||
        b.folio.toLowerCase().includes(q) ||
        b.supplierCompany.toLowerCase().includes(q) ||
        (b.purchaseOrderFolio && b.purchaseOrderFolio.toLowerCase().includes(q))
      return matchStatus && matchSearch
    })
  }, [payables, statusFilter, searchQuery])

  const totalPendingBalance = useMemo(
    () => payables.reduce((sum, b) => sum + b.balance, 0),
    [payables]
  )

  const selectedBillsList = useMemo(
    () => payables.filter((b) => b.balance > 0 && selectedBillIds[b.id]),
    [payables, selectedBillIds]
  )

  const handleSelectPo = (poId: string) => {
    setSelectedPoId(poId)
    const po = purchaseOrders.find((p) => p.id === poId)
    if (po) {
      setSupplierCompany(po.supplierCompany)
      setPoReference(po.folio)
      setSubtotal(Math.round(po.subtotal))
    }
  }

  const handleOpenNewModal = () => {
    const firstUnbilled = unbilledOrders[0]
    if (firstUnbilled) {
      setSelectedPoId(firstUnbilled.id)
      setSupplierCompany(firstUnbilled.supplierCompany)
      setPoReference(firstUnbilled.folio)
      setSubtotal(Math.round(firstUnbilled.subtotal))
    } else {
      setSelectedPoId('')
      setSupplierCompany(suppliers[0]?.company || '')
      setPoReference('')
      setSubtotal(15000)
    }
    setDueDate('')
    setIsNewModalOpen(true)
  }

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplierCompany) {
      toast.warning('Selecciona un proveedor.', 'Campo requerido')
      return
    }
    if (subtotal <= 0) {
      toast.warning('El subtotal debe ser mayor a cero.', 'Importe inválido')
      return
    }

    const sup = suppliers.find((s) => s.company === supplierCompany)
    const maxNum = payables.reduce((max, b) => {
      const n = parseInt(b.folio.split('-').pop() || '0', 10)
      return Number.isNaN(n) ? max : Math.max(max, n)
    }, payables.length)
    const folio = `CXP-2026-${String(maxNum + 1).padStart(3, '0')}`

    const today = new Date()
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    const fmt = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`
    const due = new Date()
    due.setDate(today.getDate() + 15)

    const tax = Math.round(subtotal * 0.16)
    const total = subtotal + tax

    const newBill: BillPayable = {
      id: `cxp_${Date.now()}`,
      folio,
      purchaseOrderFolio: poReference.trim() || undefined,
      supplierCompany,
      supplierContact: sup?.email || 'facturacion@proveedor.mx',
      issueDate: fmt(today),
      dueDate: dueDate.trim() || fmt(due),
      subtotal,
      tax,
      total,
      paidAmount: 0,
      balance: total,
      status: 'Pendiente',
      currency: 'MXN',
      paymentMethod: 'Transferencia SPEI',
    }

    onCreateSupplierBill(newBill)
    toast.success(
      `Factura ${folio} registrada para ${supplierCompany} (${money(total)}) y sincronizada con Cuentas por pagar.`,
      'Factura de proveedor registrada'
    )
    setIsNewModalOpen(false)
  }

  const getStatusBadge = (status: BillPayable['status']) => {
    switch (status) {
      case 'Pagada':
        return (
          <span className="fin-badge fin-badge-paid">
            <CheckCircle2 size={11} /> Pagada
          </span>
        )
      case 'Pendiente':
        return (
          <span className="fin-badge fin-badge-pending">
            <Clock size={11} /> Pendiente
          </span>
        )
      case 'Parcial':
        return (
          <span className="fin-badge fin-badge-partial">
            <CreditCard size={11} /> Parcial
          </span>
        )
      case 'Vencida':
        return (
          <span className="fin-badge fin-badge-overdue">
            <AlertTriangle size={11} /> Vencida
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="operations-section-container">
      {/* Header Strip */}
      <div className="ops-header-strip">
        <div className="ops-header-left">
          <div className="ops-icon-box">
            <ReceiptText size={20} />
          </div>
          <div>
            <h2>Facturas de Proveedor (CxP)</h2>
            <p>
              Vincula comprobantes fiscales con órdenes de compra y sincronízalos automáticamente con Finanzas · Pagos.
            </p>
          </div>
        </div>

        <div className="ops-header-right">
          <div className="ops-stat-item">
            <span className="ops-stat-label">Saldo por liquidar</span>
            <strong className="ops-stat-val tabular-nums">{money(totalPendingBalance)}</strong>
          </div>
          <div className="ops-stat-item">
            <span className="ops-stat-label">OC sin facturar</span>
            <strong className="ops-stat-val tabular-nums">{unbilledOrders.length}</strong>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="ops-toolbar">
        <div className="ops-filter-group">
          <div className="warehouse-tab-selector">
            {['Todas', 'Pendiente', 'Parcial', 'Vencida', 'Pagada'].map((st) => (
              <button
                key={st}
                type="button"
                className={`wh-tab ${statusFilter === st ? 'active' : ''}`}
                onClick={() => setStatusFilter(st)}
              >
                {st}
                <span className="wh-badge">
                  {st === 'Todas'
                    ? payables.length
                    : payables.filter((b) => b.status === st).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="ops-actions-group">
          {onOpenEbpBatchFromBills && selectedBillsList.length > 0 && (
            <>
              {selectedBillsList.length > 1 && (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => onOpenEbpBatchFromBills(selectedBillsList, 'individual')}
                >
                  <Landmark size={13} /> EBP individual ({selectedBillsList.length})
                </button>
              )}
              <button
                type="button"
                className="button button-secondary"
                onClick={() =>
                  onOpenEbpBatchFromBills(
                    selectedBillsList,
                    selectedBillsList.length > 1 ? 'consolidated' : 'individual'
                  )
                }
              >
                <Landmark size={13} />{' '}
                {selectedBillsList.length > 1
                  ? `Consolidar en EBP (${selectedBillsList.length})`
                  : 'Pagar con EBP'}
              </button>
            </>
          )}
          {onNavigateToFinancePayables && (
            <button
              type="button"
              className="button button-secondary"
              onClick={onNavigateToFinancePayables}
            >
              Programar pagos en Finanzas <ArrowRight size={13} />
            </button>
          )}
          <button
            type="button"
            className="button button-primary"
            onClick={handleOpenNewModal}
          >
            <Plus size={14} /> Registrar factura de proveedor
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="ops-subbar">
        <div className="ops-search-input-wrap" style={{ maxWidth: '420px', width: '100%' }}>
          <Search size={14} />
          <input
            type="text"
            placeholder="Buscar por folio CxP, proveedor u orden de compra..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap ops-table-wrap">
        <table className="data-table ops-data-table">
          <thead>
            <tr>
              {onOpenEbpBatchFromBills && <th style={{ width: 28 }}>EBP</th>}
              <th>FOLIO CXP</th>
              <th>PROVEEDOR</th>
              <th>ORDEN DE COMPRA</th>
              <th>EMISIÓN</th>
              <th>VENCIMIENTO</th>
              <th style={{ textAlign: 'right' }}>TOTAL C/ IVA</th>
              <th style={{ textAlign: 'right' }}>PAGADO</th>
              <th style={{ textAlign: 'right' }}>SALDO</th>
              <th>ESTADO</th>
              <th style={{ textAlign: 'right' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {filteredBills.length === 0 ? (
              <tr>
                <td colSpan={onOpenEbpBatchFromBills ? 11 : 10} className="empty-cell">
                  No se encontraron facturas de proveedor con los filtros actuales.
                </td>
              </tr>
            ) : (
              filteredBills.map((b) => {
                const canPay = b.balance > 0
                return (
                <tr key={b.id} className={b.status === 'Vencida' ? 'row-warning' : ''}>
                  {onOpenEbpBatchFromBills && (
                    <td>
                      <input
                        type="checkbox"
                        disabled={!canPay}
                        checked={Boolean(canPay && selectedBillIds[b.id])}
                        onChange={(e) =>
                          setSelectedBillIds((prev) => ({
                            ...prev,
                            [b.id]: e.target.checked,
                          }))
                        }
                        title={
                          canPay
                            ? 'Seleccionar para pago individual o consolidado en EBP'
                            : 'Factura liquidada'
                        }
                      />
                    </td>
                  )}
                  <td>
                    <span className="fin-folio-tag tabular-nums">{b.folio}</span>
                  </td>
                  <td>
                    <div className="supplier-cell">
                      <strong>{b.supplierCompany}</strong>
                      <small>{b.supplierContact}</small>
                    </div>
                  </td>
                  <td>
                    <span className="ref-tag">{b.purchaseOrderFolio || 'Directa'}</span>
                  </td>
                  <td className="date-cell tabular-nums">{b.issueDate}</td>
                  <td className="date-cell tabular-nums">
                    <strong>{b.dueDate}</strong>
                  </td>
                  <td style={{ textAlign: 'right' }} className="money-cell tabular-nums">
                    {money(b.total)}
                  </td>
                  <td style={{ textAlign: 'right' }} className="money-cell tabular-nums text-positive">
                    {b.paidAmount > 0 ? money(b.paidAmount) : '—'}
                  </td>
                  <td style={{ textAlign: 'right' }} className="money-cell tabular-nums">
                    <strong className={b.balance > 0 ? 'text-alert' : 'text-positive'}>
                      {money(b.balance)}
                    </strong>
                  </td>
                  <td>{getStatusBadge(b.status)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="po-actions-row">
                      <button
                        type="button"
                        className="button-icon-action"
                        title="Ver detalle de la factura de proveedor"
                        onClick={() => {
                          setConfirmingDelete(false)
                          setViewingBill(b)
                        }}
                      >
                        <Eye size={12} /> Ver
                      </button>
                      {onOpenEbpBatchFromBills && canPay && (
                        <button
                          type="button"
                          className="button-icon-action action-pay"
                          title="Pagar esta factura con EBP eligiendo cuenta bancaria del proveedor"
                          onClick={() => onOpenEbpBatchFromBills([b], 'individual')}
                        >
                          <Landmark size={12} /> Pagar EBP
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Registrar Factura de Proveedor */}
      {isNewModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsNewModalOpen(false)
          }}
        >
          <section className="create-modal" role="dialog" aria-modal="true">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">COMPRAS · FACTURACIÓN DE PROVEEDOR</div>
                <h2>Registrar Factura en CxP</h2>
                <p>
                  Asocia una orden de compra existente o registra un comprobante directo para programar pago en Tesorería.
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

            <form onSubmit={handleCreateSubmit}>
              {unbilledOrders.length > 0 && (
                <label className="form-field">
                  <span>Vincular desde Orden de Compra (opcional)</span>
                  <select
                    value={selectedPoId}
                    onChange={(e) => handleSelectPo(e.target.value)}
                  >
                    <option value="">Factura directa sin OC vinculada</option>
                    {unbilledOrders.map((po) => (
                      <option key={po.id} value={po.id}>
                        {po.folio} — {po.supplierCompany} ({money(po.total)})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="form-field">
                <span>Proveedor *</span>
                <select
                  required
                  value={supplierCompany}
                  onChange={(e) => setSupplierCompany(e.target.value)}
                >
                  <option value="">Selecciona proveedor...</option>
                  {suppliers.map((s) => (
                    <option key={s.company} value={s.company}>
                      {s.company} ({s.name})
                    </option>
                  ))}
                </select>
              </label>

              <div className="form-grid">
                <label className="form-field">
                  <span>Referencia OC / Folio factura</span>
                  <input
                    value={poReference}
                    onChange={(e) => setPoReference(e.target.value)}
                    placeholder="Ej. OC-2026-003"
                  />
                </label>

                <label className="form-field">
                  <span>Fecha de vencimiento</span>
                  <input
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    placeholder="Ej. 28 nov 2026"
                  />
                </label>
              </div>

              <label className="form-field">
                <span>Subtotal antes de IVA (MXN) *</span>
                <input
                  type="number"
                  min="1"
                  required
                  value={subtotal}
                  onChange={(e) => setSubtotal(Math.max(0, parseFloat(e.target.value) || 0))}
                />
              </label>

              <div className="po-totals-box" style={{ marginTop: 10 }}>
                <div className="po-totals-row">
                  <span>Subtotal:</span>
                  <strong className="tabular-nums">{money(subtotal)}</strong>
                </div>
                <div className="po-totals-row">
                  <span>IVA (16%):</span>
                  <strong className="tabular-nums">{money(subtotal * 0.16)}</strong>
                </div>
                <div className="po-totals-row grand">
                  <span>Total factura CxP:</span>
                  <strong className="tabular-nums">{money(subtotal * 1.16)} MXN</strong>
                </div>
              </div>

              <div className="create-modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsNewModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="button button-primary">
                  <ReceiptText size={14} /> Guardar y enviar a Finanzas CxP
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal: Detalle de Factura de Proveedor */}
      {viewingBill && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setViewingBill(null)
              setConfirmingDelete(false)
            }
          }}
        >
          <section className="create-modal" role="dialog" aria-modal="true">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">COMPRAS · DETALLE DE FACTURA CXP</div>
                <h2>Factura {viewingBill.folio}</h2>
                <p>
                  {viewingBill.supplierCompany} · {viewingBill.supplierContact}
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => {
                  setViewingBill(null)
                  setConfirmingDelete(false)
                }}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="po-detail-meta-grid">
              <div>
                <small>Proveedor</small>
                <strong>{viewingBill.supplierCompany}</strong>
                <span>{viewingBill.supplierContact}</span>
              </div>
              <div>
                <small>Orden vinculada / Fecha</small>
                <strong>{viewingBill.purchaseOrderFolio || 'Factura directa'}</strong>
                <span>Emisión: {viewingBill.issueDate} · Vence: {viewingBill.dueDate}</span>
              </div>
              <div>
                <small>Estado de pago</small>
                <div>{getStatusBadge(viewingBill.status)}</div>
                <span>Método: {viewingBill.paymentMethod}</span>
              </div>
            </div>

            <div className="po-totals-box" style={{ marginTop: 14 }}>
              <div className="po-totals-row">
                <span>Subtotal:</span>
                <strong className="tabular-nums">{money(viewingBill.subtotal)}</strong>
              </div>
              <div className="po-totals-row">
                <span>IVA trasladado (16%):</span>
                <strong className="tabular-nums">{money(viewingBill.tax)}</strong>
              </div>
              <div className="po-totals-row grand">
                <span>Total facturado:</span>
                <strong className="tabular-nums">{money(viewingBill.total)} {viewingBill.currency || 'MXN'}</strong>
              </div>
              <div className="po-totals-row">
                <span>Monto pagado:</span>
                <strong className="tabular-nums text-positive">{money(viewingBill.paidAmount)}</strong>
              </div>
              <div className="po-totals-row" style={{ borderTop: '1px dashed #d5dcd6', paddingTop: 4 }}>
                <span>Saldo pendiente:</span>
                <strong className={`tabular-nums ${viewingBill.balance > 0 ? 'text-alert' : 'text-positive'}`}>
                  {money(viewingBill.balance)} {viewingBill.currency || 'MXN'}
                </strong>
              </div>
            </div>

            <div className={`create-modal-actions ${onDeleteSupplierBill ? 'has-delete-action' : ''}`}>
              {onDeleteSupplierBill && (
                <div className="modal-delete-slot">
                  {!confirmingDelete ? (
                    <button
                      type="button"
                      className="button button-danger-outline"
                      onClick={() => setConfirmingDelete(true)}
                    >
                      <Trash2 size={14} /> Eliminar factura
                    </button>
                  ) : (
                    <div className="modal-delete-confirm">
                      <span>
                        ¿Eliminar <strong>{viewingBill.folio}</strong>?
                      </span>
                      <button
                        type="button"
                        className="button button-danger-solid"
                        onClick={() => {
                          onDeleteSupplierBill(viewingBill.id)
                          setViewingBill(null)
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
                    setViewingBill(null)
                    setConfirmingDelete(false)
                  }}
                >
                  Cerrar
                </button>
                {onOpenEbpBatchFromBills && viewingBill.balance > 0 && (
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => {
                      const target = viewingBill
                      setViewingBill(null)
                      setConfirmingDelete(false)
                      onOpenEbpBatchFromBills([target], 'individual')
                    }}
                  >
                    <Landmark size={14} /> Pagar con EBP
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
