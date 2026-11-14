import { useState, useMemo } from 'react'
import {
  Wallet,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  CreditCard,
  ArrowUpRight,
  Eye,
  Landmark,
} from 'lucide-react'
import type {
  BillPayable,
  BankAccount,
  PaymentTransaction,
} from '../data/finance'
import { useToast } from './Toast'

interface SupplierOption {
  company: string
  name: string
  email?: string
}

interface FinancePayablesProps {
  payables: BillPayable[]
  bankAccounts: BankAccount[]
  suppliersList: SupplierOption[]
  onUpdatePayables: (items: BillPayable[]) => void
  onAddTransaction: (txn: PaymentTransaction) => void
  onUpdateBankAccountBalance: (accountId: string, delta: number) => void
  onOpenEbpBatchFromBills?: (bills: BillPayable[]) => void
}

const money = (val: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(val)

export function FinancePayables({
  payables,
  bankAccounts,
  suppliersList,
  onUpdatePayables,
  onAddTransaction,
  onUpdateBankAccountBalance,
  onOpenEbpBatchFromBills,
}: FinancePayablesProps) {
  const toast = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('Todas')
  const [selectedBillIds, setSelectedBillIds] = useState<Record<string, boolean>>({})

  // Modals
  const [isPayModalOpen, setIsPayModalOpen] = useState(false)
  const [isNewBillModalOpen, setIsNewBillModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedBill, setSelectedBill] = useState<BillPayable | null>(null)

  // Payment form state
  const [payAmount, setPayAmount] = useState<number>(0)
  const [payBankId, setPayBankId] = useState<string>(bankAccounts[0]?.id || '')
  const [payMethod, setPayMethod] = useState('Transferencia SPEI')
  const [payReference, setPayReference] = useState('')

  // New Bill form state
  const [newSupplierCompany, setNewSupplierCompany] = useState(suppliersList[0]?.company || '')
  const [newPoFolio, setNewPoFolio] = useState('')
  const [newSubtotal, setNewSubtotal] = useState<number>(18000)
  const [newDueDate, setNewDueDate] = useState('')

  // Filtered payables
  const filteredPayables = useMemo(() => {
    return payables.filter((b) => {
      const matchStatus = statusFilter === 'Todas' || b.status === statusFilter
      const q = searchQuery.toLowerCase()
      const matchSearch =
        !q ||
        b.folio.toLowerCase().includes(q) ||
        b.supplierCompany.toLowerCase().includes(q) ||
        b.supplierContact.toLowerCase().includes(q) ||
        (b.purchaseOrderFolio && b.purchaseOrderFolio.toLowerCase().includes(q))
      return matchStatus && matchSearch
    })
  }, [payables, statusFilter, searchQuery])

  // Summary figures
  const totalPayableBalance = useMemo(() => {
    return payables.reduce((acc, b) => acc + b.balance, 0)
  }, [payables])

  const overdueBills = useMemo(() => {
    return payables.filter((b) => b.status === 'Vencida')
  }, [payables])

  const overdueAmount = useMemo(() => {
    return overdueBills.reduce((acc, b) => acc + b.balance, 0)
  }, [overdueBills])

  const paidAmountTotal = useMemo(() => {
    return payables.reduce((acc, b) => acc + b.paidAmount, 0)
  }, [payables])

  const selectedBillsList = useMemo(
    () => payables.filter((b) => b.balance > 0 && selectedBillIds[b.id]),
    [payables, selectedBillIds]
  )

  // Open Payment Modal
  const handleOpenPayModal = (bill: BillPayable) => {
    setSelectedBill(bill)
    setPayAmount(bill.balance)
    setPayBankId(bankAccounts[0]?.id || '')
    setPayMethod('Transferencia SPEI')
    setPayReference(`SPEI-${Math.floor(100000 + Math.random() * 900000)}`)
    setIsPayModalOpen(true)
  }

  // Handle Confirm Payment to Supplier
  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBill) return

    if (payAmount <= 0) {
      toast.warning('Ingresa un monto válido mayor a cero.', 'Monto inválido')
      return
    }

    if (payAmount > selectedBill.balance) {
      toast.warning(
        `El monto a pagar no puede ser mayor al saldo pendiente (${money(selectedBill.balance)}).`,
        'Monto excede saldo'
      )
      return
    }

    const sourceAccount = bankAccounts.find((b) => b.id === payBankId) || bankAccounts[0]

    if (sourceAccount.balance < payAmount) {
      toast.warning(
        `Fondos insuficientes en ${sourceAccount.bankName} (Saldo disponible: ${money(sourceAccount.balance)}).`,
        'Saldo insuficiente en cuenta'
      )
      return
    }

    const newPaidAmount = selectedBill.paidAmount + payAmount
    const newBalance = Math.max(0, selectedBill.total - newPaidAmount)
    const newStatus = newBalance === 0 ? 'Pagada' : 'Parcial'

    // Update Bill
    const updated = payables.map((b) =>
      b.id === selectedBill.id
        ? {
            ...b,
            paidAmount: newPaidAmount,
            balance: newBalance,
            status: newStatus as any,
          }
        : b
    )
    onUpdatePayables(updated)

    // Deduct from bank account
    onUpdateBankAccountBalance(sourceAccount.id, -payAmount)

    // Record Transaction
    const today = new Date()
    const formatDate = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][d.getMonth()]} ${d.getFullYear()}`

    const newTxn: PaymentTransaction = {
      id: `txn_${Date.now()}`,
      folio: `PAG-2026-${String(Math.floor(100 + Math.random() * 900))}`,
      date: formatDate(today),
      type: 'Pago a proveedor',
      entityName: selectedBill.supplierCompany,
      reference: `${payReference.trim() || 'SPEI'} · Pago ${selectedBill.folio}`,
      amount: payAmount,
      method: payMethod,
      account: sourceAccount.bankName,
    }
    onAddTransaction(newTxn)

    toast.success(
      `Pago de ${money(payAmount)} aplicado a ${selectedBill.supplierCompany} debitado de ${sourceAccount.bankName}.`,
      'Pago registrado con éxito'
    )

    setIsPayModalOpen(false)
    setSelectedBill(null)
  }

  // Handle Create Bill
  const handleCreateBill = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSupplierCompany) {
      toast.error('Selecciona un proveedor.', 'Campo requerido')
      return
    }

    const sup = suppliersList.find((s) => s.company === newSupplierCompany)
    const nextNum = payables.length + 1
    const folio = `CXP-2026-${String(nextNum).padStart(3, '0')}`
    const today = new Date()

    const formatDate = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][d.getMonth()]} ${d.getFullYear()}`

    const issueDateStr = formatDate(today)
    const due = new Date()
    due.setDate(today.getDate() + 15)
    const dueDateStr = newDueDate.trim() || formatDate(due)

    const sub = Number(newSubtotal) || 0
    const tax = sub * 0.16
    const total = sub + tax

    const newBill: BillPayable = {
      id: `cxp_${Date.now()}`,
      folio,
      purchaseOrderFolio: newPoFolio.trim() || `OC-2026-${String(nextNum).padStart(3, '0')}`,
      supplierCompany: newSupplierCompany,
      supplierContact: sup?.email || 'contacto@proveedor.mx',
      issueDate: issueDateStr,
      dueDate: dueDateStr,
      subtotal: sub,
      tax: tax,
      total: total,
      paidAmount: 0,
      balance: total,
      status: 'Pendiente',
      currency: 'MXN',
      paymentMethod: 'Transferencia SPEI',
    }

    onUpdatePayables([newBill, ...payables])
    toast.success(
      `Cuenta por pagar ${folio} registrada para ${newSupplierCompany} por ${money(total)}.`,
      'Cuenta por pagar guardada'
    )

    setIsNewBillModalOpen(false)
    setNewPoFolio('')
    setNewSubtotal(18000)
    setNewDueDate('')
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
    <div className="finance-section-container">
      {/* Top Header & Metrics Bar */}
      <div className="ops-header-strip">
        <div className="ops-header-left">
          <div className="ops-icon-box fin-icon-box">
            <Wallet size={20} />
          </div>
          <div>
            <h2>Cuentas por pagar a proveedores</h2>
            <p>Programación de dispersiones a proveedores, compromisos de compra y control de vencimientos.</p>
          </div>
        </div>

        <div className="ops-header-right">
          <div className="ops-stat-item">
            <span className="ops-stat-label">Total por liquidar</span>
            <strong className="ops-stat-val">{money(totalPayableBalance)}</strong>
          </div>
          <div className="ops-stat-item">
            <span className="ops-stat-label">Cuentas vencidas</span>
            <span className={`ops-stat-pill ${overdueAmount > 0 ? 'alert' : 'ok'}`}>
              {overdueAmount > 0 ? (
                <>
                  <AlertTriangle size={12} /> {money(overdueAmount)} ({overdueBills.length})
                </>
              ) : (
                <>
                  <CheckCircle2 size={12} /> Al corriente
                </>
              )}
            </span>
          </div>
          <div className="ops-stat-item">
            <span className="ops-stat-label">Pagado en periodo</span>
            <span className="ops-stat-pill ok">
              <CheckCircle2 size={12} /> {money(paidAmountTotal)}
            </span>
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
            <button
              type="button"
              className="button button-secondary"
              onClick={() => onOpenEbpBatchFromBills(selectedBillsList)}
            >
              <Landmark size={14} /> Dispersar lote EBP ({selectedBillsList.length})
            </button>
          )}
          <button
            className="button button-primary"
            onClick={() => {
              if (suppliersList.length > 0) setNewSupplierCompany(suppliersList[0].company)
              setIsNewBillModalOpen(true)
            }}
          >
            <Plus size={14} /> Registrar cuenta por pagar
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="ops-subbar">
        <div className="ops-search-input-wrap" style={{ maxWidth: '420px', width: '100%' }}>
          <Search size={14} />
          <input
            type="text"
            placeholder="Buscar por folio, proveedor u orden de compra..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
              title="Limpiar búsqueda"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Payables Table */}
      <div className="table-wrap ops-table-wrap">
        <table className="data-table ops-data-table">
          <thead>
            <tr>
              <th style={{ width: 28 }}>EBP</th>
              <th>FOLIO CXP</th>
              <th>PROVEEDOR</th>
              <th>ORDEN DE COMPRA</th>
              <th>EMISIÓN</th>
              <th>VENCIMIENTO</th>
              <th style={{ textAlign: 'right' }}>TOTAL CON IVA</th>
              <th style={{ textAlign: 'right' }}>ABONADO</th>
              <th style={{ textAlign: 'right' }}>SALDO PENDIENTE</th>
              <th>ESTADO</th>
              <th style={{ textAlign: 'right' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayables.length === 0 ? (
              <tr>
                <td colSpan={11} className="empty-cell">
                  No se encontraron cuentas por pagar con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              filteredPayables.map((b) => {
                const canPay = b.balance > 0
                const isOverdue = b.status === 'Vencida'

                return (
                  <tr key={b.id} className={isOverdue ? 'row-warning' : ''}>
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
                            ? 'Incluir en lote de pago bancario EBP'
                            : 'Factura ya liquidada'
                        }
                      />
                    </td>
                    <td>
                      <span className="fin-folio-tag">{b.folio}</span>
                    </td>
                    <td>
                      <div className="supplier-cell">
                        <strong>{b.supplierCompany}</strong>
                        <small>{b.supplierContact}</small>
                      </div>
                    </td>
                    <td>
                      <span className="ref-tag">{b.purchaseOrderFolio || '—'}</span>
                    </td>
                    <td className="date-cell">{b.issueDate}</td>
                    <td className={`date-cell ${isOverdue ? 'text-alert' : ''}`}>
                      <strong>{b.dueDate}</strong>
                    </td>
                    <td style={{ textAlign: 'right' }} className="money-cell">
                      {money(b.total)}
                    </td>
                    <td style={{ textAlign: 'right', color: '#387856' }} className="money-cell">
                      {b.paidAmount > 0 ? money(b.paidAmount) : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }} className="money-cell">
                      <strong className={b.balance > 0 ? 'text-alert' : 'text-positive'}>
                        {money(b.balance)}
                      </strong>
                    </td>
                    <td>{getStatusBadge(b.status)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="po-actions-row">
                        <button
                          className="button-icon-action"
                          title="Ver detalle del pasivo"
                          onClick={() => {
                            setSelectedBill(b)
                            setIsDetailModalOpen(true)
                          }}
                        >
                          <Eye size={13} /> Detalle
                        </button>
                        {canPay && (
                          <button
                            className="button-icon-action action-pay"
                            title="Dispersar pago a proveedor"
                            onClick={() => handleOpenPayModal(b)}
                          >
                            <ArrowUpRight size={13} /> Pagar
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

      {/* Modal: Registrar Pago a Proveedor */}
      {isPayModalOpen && selectedBill && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsPayModalOpen(false)
          }}
        >
          <section className="create-modal modal-wide" role="dialog" aria-modal="true">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">FINANZAS · PAGO A PROVEEDOR</div>
                <h2>Dispersión de Pago · {selectedBill.folio}</h2>
                <p>
                  Registra la salida de capital hacia <strong>{selectedBill.supplierCompany}</strong>.
                </p>
              </div>
              <button
                className="icon-button"
                onClick={() => setIsPayModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment}>
              <div className="po-detail-summary-grid">
                <div className="po-detail-card">
                  <span>Proveedor</span>
                  <strong>{selectedBill.supplierCompany}</strong>
                  <small>{selectedBill.supplierContact}</small>
                </div>
                <div className="po-detail-card">
                  <span>Importe total factura</span>
                  <strong>{money(selectedBill.total)} MXN</strong>
                  <small>Ya pagado: {money(selectedBill.paidAmount)}</small>
                </div>
                <div className="po-detail-card">
                  <span>Saldo a liquidar</span>
                  <strong className="text-alert">{money(selectedBill.balance)} MXN</strong>
                  <small>Vencimiento: {selectedBill.dueDate}</small>
                </div>
              </div>

              <div className="form-grid" style={{ marginTop: '14px' }}>
                <label className="form-field">
                  <span>Monto a dispersar (MXN) *</span>
                  <input
                    type="number"
                    min="1"
                    max={selectedBill.balance}
                    required
                    value={payAmount}
                    onChange={(e) =>
                      setPayAmount(
                        Math.min(
                          selectedBill.balance,
                          Math.max(0, parseFloat(e.target.value) || 0)
                        )
                      )
                    }
                  />
                </label>

                <label className="form-field">
                  <span>Cuenta bancaria de retiro *</span>
                  <select
                    required
                    value={payBankId}
                    onChange={(e) => setPayBankId(e.target.value)}
                  >
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} ({b.accountNumber}) — Saldo disponible: {money(b.balance)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form-grid">
                <label className="form-field">
                  <span>Método de dispersión</span>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                  >
                    <option value="Transferencia SPEI">Transferencia electrónica SPEI</option>
                    <option value="Cheque nominativo">Cheque de empresa</option>
                    <option value="Tarjeta corporativa">Tarjeta corporativa de débito</option>
                    <option value="Caja chica">Efectivo de caja chica</option>
                  </select>
                </label>

                <label className="form-field">
                  <span>Folio de rastreo SPEI / Comprobante</span>
                  <input
                    placeholder="Ej. SPEI-992104 o REF-40192"
                    value={payReference}
                    onChange={(e) => setPayReference(e.target.value)}
                  />
                </label>
              </div>

              <div className="create-modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsPayModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="button button-primary">
                  <ArrowUpRight size={14} /> Confirmar dispersión y debitar de banco
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal: Registrar Nueva Cuenta por Pagar */}
      {isNewBillModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsNewBillModalOpen(false)
          }}
        >
          <section className="create-modal" role="dialog" aria-modal="true">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">FINANZAS · PROVEEDORES</div>
                <h2>Registrar Cuenta por Pagar</h2>
                <p>Captura la factura de un proveedor o servicio recibido para programar pago.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setIsNewBillModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateBill}>
              <label className="form-field">
                <span>Proveedor *</span>
                <select
                  required
                  value={newSupplierCompany}
                  onChange={(e) => setNewSupplierCompany(e.target.value)}
                >
                  <option value="">Selecciona proveedor...</option>
                  {suppliersList.map((s) => (
                    <option key={s.company} value={s.company}>
                      {s.company} ({s.name})
                    </option>
                  ))}
                </select>
              </label>

              <div className="form-grid">
                <label className="form-field">
                  <span>Orden de compra vinculada</span>
                  <input
                    placeholder="Ej. OC-2026-003 o FAC-EXT-99"
                    value={newPoFolio}
                    onChange={(e) => setNewPoFolio(e.target.value)}
                  />
                </label>

                <label className="form-field">
                  <span>Fecha de pago programada</span>
                  <input
                    placeholder="Ej. 24 nov 2026"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                  />
                </label>
              </div>

              <label className="form-field">
                <span>Subtotal antes de IVA (MXN) *</span>
                <input
                  type="number"
                  min="1"
                  required
                  value={newSubtotal}
                  onChange={(e) => setNewSubtotal(Math.max(0, parseFloat(e.target.value) || 0))}
                />
              </label>

              <div className="po-totals-box" style={{ marginTop: '10px' }}>
                <div className="po-totals-row">
                  <span>Subtotal:</span>
                  <strong>{money(newSubtotal)}</strong>
                </div>
                <div className="po-totals-row">
                  <span>IVA Trasladado (16%):</span>
                  <strong>{money(newSubtotal * 0.16)}</strong>
                </div>
                <div className="po-totals-row grand">
                  <span>Total pasivo:</span>
                  <strong>{money(newSubtotal * 1.16)} MXN</strong>
                </div>
              </div>

              <div className="create-modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsNewBillModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="button button-primary">
                  <Plus size={14} /> Registrar cuenta por pagar
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal: Detalle de Cuenta por Pagar */}
      {isDetailModalOpen && selectedBill && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsDetailModalOpen(false)
          }}
        >
          <section className="create-modal modal-wide" role="dialog" aria-modal="true">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">CUENTA POR PAGAR · DETALLE</div>
                <h2>{selectedBill.folio}</h2>
                <p>Información del pasivo, proveedor acreedor y registro de pagos.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setIsDetailModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="po-detail-summary-grid">
              <div className="po-detail-card">
                <span>Acreedor / Proveedor</span>
                <strong>{selectedBill.supplierCompany}</strong>
                <small>{selectedBill.supplierContact}</small>
              </div>
              <div className="po-detail-card">
                <span>Orden de compra</span>
                <strong>{selectedBill.purchaseOrderFolio || 'Sin OC asociada'}</strong>
                <small>Fecha emisión: {selectedBill.issueDate}</small>
              </div>
              <div className="po-detail-card">
                <span>Fecha de vencimiento</span>
                <strong className={selectedBill.status === 'Vencida' ? 'text-alert' : ''}>
                  {selectedBill.dueDate}
                </strong>
                <div>{getStatusBadge(selectedBill.status)}</div>
              </div>
            </div>

            <div className="po-totals-box" style={{ marginTop: '16px' }}>
              <div className="po-totals-row">
                <span>Subtotal:</span>
                <strong>{money(selectedBill.subtotal)}</strong>
              </div>
              <div className="po-totals-row">
                <span>IVA Trasladado (16%):</span>
                <strong>{money(selectedBill.tax)}</strong>
              </div>
              <div className="po-totals-row grand">
                <span>Total Facturado:</span>
                <strong>{money(selectedBill.total)} MXN</strong>
              </div>
              <div className="po-totals-row">
                <span>Total pagado:</span>
                <strong style={{ color: '#3c7d5c' }}>{money(selectedBill.paidAmount)}</strong>
              </div>
              <div className="po-totals-row" style={{ borderTop: '1px dashed #d5dcd6', paddingTop: '4px' }}>
                <span>Saldo por liquidar:</span>
                <strong style={{ color: selectedBill.balance > 0 ? '#ba4c32' : '#3c7d5c' }}>
                  {money(selectedBill.balance)} MXN
                </strong>
              </div>
            </div>

            <div className="create-modal-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setIsDetailModalOpen(false)}
              >
                Cerrar
              </button>
              {selectedBill.balance > 0 && (
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => {
                    setIsDetailModalOpen(false)
                    handleOpenPayModal(selectedBill)
                  }}
                >
                  <ArrowUpRight size={14} /> Pagar cuenta ahora
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
