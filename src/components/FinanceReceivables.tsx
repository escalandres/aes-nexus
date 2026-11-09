import { useState, useMemo } from 'react'
import {
  FileText,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  Eye,
  CreditCard,
  Building2,
  DollarSign,
  ReceiptText,
} from 'lucide-react'
import type {
  InvoiceReceivable,
  BankAccount,
  PaymentTransaction,
} from '../data/finance'
import { useToast } from './Toast'

interface ClientOption {
  company: string
  name: string
  email?: string
  rfc?: string
}

interface FinanceReceivablesProps {
  receivables: InvoiceReceivable[]
  bankAccounts: BankAccount[]
  clientsList: ClientOption[]
  onUpdateReceivables: (items: InvoiceReceivable[]) => void
  onAddTransaction: (txn: PaymentTransaction) => void
  onUpdateBankAccountBalance: (accountId: string, delta: number) => void
}

const money = (val: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(val)

export function FinanceReceivables({
  receivables,
  bankAccounts,
  clientsList,
  onUpdateReceivables,
  onAddTransaction,
  onUpdateBankAccountBalance,
}: FinanceReceivablesProps) {
  const toast = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('Todas')

  // Modals
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false)
  const [isNewInvoiceModalOpen, setIsNewInvoiceModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceReceivable | null>(null)

  // Payment registration form
  const [collectAmount, setCollectAmount] = useState<number>(0)
  const [collectBankId, setCollectBankId] = useState<string>(bankAccounts[0]?.id || '')
  const [collectMethod, setCollectMethod] = useState('Transferencia SPEI')
  const [collectReference, setCollectReference] = useState('')

  // New Invoice form
  const [newClientCompany, setNewClientCompany] = useState(clientsList[0]?.company || '')
  const [newOrderFolio, setNewOrderFolio] = useState('')
  const [newSubtotal, setNewSubtotal] = useState<number>(25000)
  const [newPaymentTerms, setNewPaymentTerms] = useState<'15 días' | '30 días' | 'Contado'>('30 días')
  const [newRfc, setNewRfc] = useState('')

  // Filtered invoices
  const filteredReceivables = useMemo(() => {
    return receivables.filter((inv) => {
      const matchStatus = statusFilter === 'Todas' || inv.status === statusFilter
      const q = searchQuery.toLowerCase()
      const matchSearch =
        !q ||
        inv.folio.toLowerCase().includes(q) ||
        inv.clientCompany.toLowerCase().includes(q) ||
        inv.clientName.toLowerCase().includes(q) ||
        inv.orderFolio.toLowerCase().includes(q) ||
        (inv.clientRfc && inv.clientRfc.toLowerCase().includes(q))
      return matchStatus && matchSearch
    })
  }, [receivables, statusFilter, searchQuery])

  // Summary figures
  const totalReceivableBalance = useMemo(() => {
    return receivables.reduce((acc, inv) => acc + inv.balance, 0)
  }, [receivables])

  const overdueReceivables = useMemo(() => {
    return receivables.filter((inv) => inv.status === 'Vencida')
  }, [receivables])

  const overdueAmount = useMemo(() => {
    return overdueReceivables.reduce((acc, inv) => acc + inv.balance, 0)
  }, [overdueReceivables])

  const collectedAmount = useMemo(() => {
    return receivables.reduce((acc, inv) => acc + inv.paidAmount, 0)
  }, [receivables])

  // Open Payment Modal for an invoice
  const handleOpenCollectModal = (inv: InvoiceReceivable) => {
    setSelectedInvoice(inv)
    setCollectAmount(inv.balance)
    setCollectBankId(bankAccounts[0]?.id || '')
    setCollectMethod('Transferencia SPEI')
    setCollectReference(`SPEI-${Math.floor(100000 + Math.random() * 900000)}`)
    setIsCollectModalOpen(true)
  }

  // Handle Confirm Payment Collection
  const handleConfirmCollection = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInvoice) return

    if (collectAmount <= 0) {
      toast.warning('Ingresa un monto válido a cobrar mayor a cero.', 'Monto inválido')
      return
    }

    if (collectAmount > selectedInvoice.balance) {
      toast.warning(
        `El monto a cobrar no puede exceder el saldo insoluto (${money(selectedInvoice.balance)}).`,
        'Monto excede saldo'
      )
      return
    }

    const targetAccount = bankAccounts.find((b) => b.id === collectBankId) || bankAccounts[0]
    const newPaidAmount = selectedInvoice.paidAmount + collectAmount
    const newBalance = Math.max(0, selectedInvoice.total - newPaidAmount)
    const newStatus = newBalance === 0 ? 'Pagada' : 'Parcial'

    // Update Invoice
    const updated = receivables.map((inv) =>
      inv.id === selectedInvoice.id
        ? {
            ...inv,
            paidAmount: newPaidAmount,
            balance: newBalance,
            status: newStatus as any,
          }
        : inv
    )
    onUpdateReceivables(updated)

    // Update Bank Account balance
    onUpdateBankAccountBalance(targetAccount.id, collectAmount)

    // Create Payment Transaction
    const today = new Date()
    const formatDate = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][d.getMonth()]} ${d.getFullYear()}`

    const newTxn: PaymentTransaction = {
      id: `txn_${Date.now()}`,
      folio: `PAG-2026-${String(Math.floor(100 + Math.random() * 900))}`,
      date: formatDate(today),
      type: 'Cobro de cliente',
      entityName: selectedInvoice.clientCompany,
      reference: `${collectReference.trim() || 'SPEI'} · Cobro ${selectedInvoice.folio}`,
      amount: collectAmount,
      method: collectMethod,
      account: targetAccount.bankName,
    }
    onAddTransaction(newTxn)

    toast.success(
      `Cobro de ${money(collectAmount)} registrado en ${targetAccount.bankName} para ${selectedInvoice.folio}.`,
      'Cobro procesado con éxito'
    )

    setIsCollectModalOpen(false)
    setSelectedInvoice(null)
  }

  // Handle Create New Invoice
  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newClientCompany) {
      toast.error('Selecciona una empresa cliente.', 'Campo requerido')
      return
    }

    const client = clientsList.find((c) => c.company === newClientCompany)
    const nextNum = receivables.length + 1
    const folio = `FAC-2026-${String(nextNum).padStart(3, '0')}`
    const today = new Date()

    const formatDate = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][d.getMonth()]} ${d.getFullYear()}`

    const issueDateStr = formatDate(today)
    const dueDate = new Date()
    if (newPaymentTerms === '15 días') dueDate.setDate(today.getDate() + 15)
    else if (newPaymentTerms === '30 días') dueDate.setDate(today.getDate() + 30)
    else dueDate.setDate(today.getDate() + 3)

    const dueDateStr = formatDate(dueDate)
    const sub = Number(newSubtotal) || 0
    const tax = sub * 0.16
    const total = sub + tax

    const newInvoice: InvoiceReceivable = {
      id: `cxc_${Date.now()}`,
      folio,
      orderFolio: newOrderFolio.trim() || `PED-2026-${String(nextNum).padStart(3, '0')}`,
      clientCompany: newClientCompany,
      clientName: client?.name || newClientCompany,
      clientRfc: newRfc.trim() || client?.rfc || 'XAXX010101000',
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

    onUpdateReceivables([newInvoice, ...receivables])
    toast.success(
      `Factura ${folio} por ${money(total)} emitida correctamente a ${newClientCompany}.`,
      'Factura emitida'
    )

    setIsNewInvoiceModalOpen(false)
    setNewOrderFolio('')
    setNewSubtotal(25000)
    setNewRfc('')
  }

  const getStatusBadge = (status: InvoiceReceivable['status']) => {
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
            <ReceiptText size={20} />
          </div>
          <div>
            <h2>Cuentas por cobrar y cobros</h2>
            <p>Control de facturación emitida, saldos por cobrar, cartera vencida y registro de pagos bancarios.</p>
          </div>
        </div>

        <div className="ops-header-right">
          <div className="ops-stat-item">
            <span className="ops-stat-label">Saldo total por cobrar</span>
            <strong className="ops-stat-val">{money(totalReceivableBalance)}</strong>
          </div>
          <div className="ops-stat-item">
            <span className="ops-stat-label">Cartera vencida</span>
            <span className={`ops-stat-pill ${overdueAmount > 0 ? 'alert' : 'ok'}`}>
              {overdueAmount > 0 ? (
                <>
                  <AlertTriangle size={12} /> {money(overdueAmount)} ({overdueReceivables.length})
                </>
              ) : (
                <>
                  <CheckCircle2 size={12} /> Sin morosidad
                </>
              )}
            </span>
          </div>
          <div className="ops-stat-item">
            <span className="ops-stat-label">Cobrado en periodo</span>
            <span className="ops-stat-pill ok">
              <CheckCircle2 size={12} /> {money(collectedAmount)}
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
                    ? receivables.length
                    : receivables.filter((inv) => inv.status === st).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="ops-actions-group">
          <button
            className="button button-primary"
            onClick={() => {
              if (clientsList.length > 0) setNewClientCompany(clientsList[0].company)
              setIsNewInvoiceModalOpen(true)
            }}
          >
            <Plus size={14} /> Nueva factura por cobrar
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="ops-subbar">
        <div className="ops-search-input-wrap" style={{ maxWidth: '420px', width: '100%' }}>
          <Search size={14} />
          <input
            type="text"
            placeholder="Buscar por folio, cliente, pedido o RFC..."
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

      {/* Invoices Table */}
      <div className="table-wrap ops-table-wrap">
        <table className="data-table ops-data-table">
          <thead>
            <tr>
              <th>FOLIO FACTURA</th>
              <th>CLIENTE</th>
              <th>PEDIDO VINCULADO</th>
              <th>EMISIÓN</th>
              <th>VENCIMIENTO</th>
              <th style={{ textAlign: 'right' }}>TOTAL CON IVA</th>
              <th style={{ textAlign: 'right' }}>COBRADO</th>
              <th style={{ textAlign: 'right' }}>SALDO PENDIENTE</th>
              <th>ESTADO</th>
              <th style={{ textAlign: 'right' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {filteredReceivables.length === 0 ? (
              <tr>
                <td colSpan={10} className="empty-cell">
                  No se encontraron facturas o cuentas por cobrar con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              filteredReceivables.map((inv) => {
                const canCollect = inv.balance > 0
                const isOverdue = inv.status === 'Vencida'

                return (
                  <tr key={inv.id} className={isOverdue ? 'row-warning' : ''}>
                    <td>
                      <span className="fin-folio-tag">{inv.folio}</span>
                    </td>
                    <td>
                      <div className="supplier-cell">
                        <strong>{inv.clientCompany}</strong>
                        <small>{inv.clientName}</small>
                      </div>
                    </td>
                    <td>
                      <span className="ref-tag">{inv.orderFolio}</span>
                    </td>
                    <td className="date-cell">{inv.issueDate}</td>
                    <td className={`date-cell ${isOverdue ? 'text-alert' : ''}`}>
                      <strong>{inv.dueDate}</strong>
                    </td>
                    <td style={{ textAlign: 'right' }} className="money-cell">
                      {money(inv.total)}
                    </td>
                    <td style={{ textAlign: 'right', color: '#387856' }} className="money-cell">
                      {inv.paidAmount > 0 ? money(inv.paidAmount) : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }} className="money-cell">
                      <strong className={inv.balance > 0 ? 'text-alert' : 'text-positive'}>
                        {money(inv.balance)}
                      </strong>
                    </td>
                    <td>{getStatusBadge(inv.status)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="po-actions-row">
                        <button
                          className="button-icon-action"
                          title="Ver detalle del CFDI"
                          onClick={() => {
                            setSelectedInvoice(inv)
                            setIsDetailModalOpen(true)
                          }}
                        >
                          <Eye size={13} /> Detalle
                        </button>
                        {canCollect && (
                          <button
                            className="button-icon-action action-receive"
                            title="Registrar cobro o pago de cliente"
                            onClick={() => handleOpenCollectModal(inv)}
                          >
                            <DollarSign size={13} /> Cobrar
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

      {/* Modal: Registrar Cobro */}
      {isCollectModalOpen && selectedInvoice && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsCollectModalOpen(false)
          }}
        >
          <section className="create-modal modal-wide" role="dialog" aria-modal="true">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">FINANZAS · REGISTRO DE COBRO</div>
                <h2>Cobro a Cliente · {selectedInvoice.folio}</h2>
                <p>
                  Aplica el abono o liquidación total recibido de <strong>{selectedInvoice.clientCompany}</strong>.
                </p>
              </div>
              <button
                className="icon-button"
                onClick={() => setIsCollectModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmCollection}>
              <div className="po-detail-summary-grid">
                <div className="po-detail-card">
                  <span>Factura & Cliente</span>
                  <strong>{selectedInvoice.folio}</strong>
                  <small>{selectedInvoice.clientCompany}</small>
                </div>
                <div className="po-detail-card">
                  <span>Importe total factura</span>
                  <strong>{money(selectedInvoice.total)} MXN</strong>
                  <small>Ya cobrado: {money(selectedInvoice.paidAmount)}</small>
                </div>
                <div className="po-detail-card">
                  <span>Saldo actual pendiente</span>
                  <strong className="text-alert">{money(selectedInvoice.balance)} MXN</strong>
                  <small>Vencimiento: {selectedInvoice.dueDate}</small>
                </div>
              </div>

              <div className="form-grid" style={{ marginTop: '14px' }}>
                <label className="form-field">
                  <span>Monto recibido a aplicar (MXN) *</span>
                  <input
                    type="number"
                    min="1"
                    max={selectedInvoice.balance}
                    required
                    value={collectAmount}
                    onChange={(e) =>
                      setCollectAmount(
                        Math.min(
                          selectedInvoice.balance,
                          Math.max(0, parseFloat(e.target.value) || 0)
                        )
                      )
                    }
                  />
                </label>

                <label className="form-field">
                  <span>Cuenta bancaria de ingreso *</span>
                  <select
                    required
                    value={collectBankId}
                    onChange={(e) => setCollectBankId(e.target.value)}
                  >
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} ({b.accountNumber}) — Saldo: {money(b.balance)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form-grid">
                <label className="form-field">
                  <span>Método de cobro</span>
                  <select
                    value={collectMethod}
                    onChange={(e) => setCollectMethod(e.target.value)}
                  >
                    <option value="Transferencia SPEI">Transferencia electrónica SPEI</option>
                    <option value="Tarjeta de crédito">Tarjeta de crédito / TPV</option>
                    <option value="Tarjeta de débito">Tarjeta de débito</option>
                    <option value="Cheque nominativo">Cheque nominativo</option>
                    <option value="Efectivo en caja">Efectivo en caja</option>
                  </select>
                </label>

                <label className="form-field">
                  <span>Referencia / Clave de rastreo bancaria</span>
                  <input
                    placeholder="Ej. SPEI-882104 o AUTH-9941"
                    value={collectReference}
                    onChange={(e) => setCollectReference(e.target.value)}
                  />
                </label>
              </div>

              <div className="create-modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsCollectModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="button button-primary">
                  <CheckCircle2 size={14} /> Aplicar cobro y actualizar saldo
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal: Nueva Factura */}
      {isNewInvoiceModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsNewInvoiceModalOpen(false)
          }}
        >
          <section className="create-modal" role="dialog" aria-modal="true">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">FINANZAS · EMISIÓN DE FACTURA</div>
                <h2>Nueva Factura por Cobrar</h2>
                <p>Genera la cuenta por cobrar a partir de una entrega o servicio concluido.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setIsNewInvoiceModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice}>
              <label className="form-field">
                <span>Cliente receptor *</span>
                <select
                  required
                  value={newClientCompany}
                  onChange={(e) => {
                    const comp = e.target.value
                    setNewClientCompany(comp)
                    const found = clientsList.find((c) => c.company === comp)
                    if (found?.rfc) setNewRfc(found.rfc)
                  }}
                >
                  <option value="">Selecciona cliente...</option>
                  {clientsList.map((c) => (
                    <option key={c.company} value={c.company}>
                      {c.company} ({c.name})
                    </option>
                  ))}
                </select>
              </label>

              <div className="form-grid">
                <label className="form-field">
                  <span>Pedido de venta origen</span>
                  <input
                    placeholder="Ej. PED-2026-004"
                    value={newOrderFolio}
                    onChange={(e) => setNewOrderFolio(e.target.value)}
                  />
                </label>

                <label className="form-field">
                  <span>RFC receptor</span>
                  <input
                    placeholder="Ej. ENO190412TK8"
                    value={newRfc}
                    onChange={(e) => setNewRfc(e.target.value)}
                  />
                </label>
              </div>

              <div className="form-grid">
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

                <label className="form-field">
                  <span>Plazo de crédito</span>
                  <select
                    value={newPaymentTerms}
                    onChange={(e) => setNewPaymentTerms(e.target.value as any)}
                  >
                    <option value="Contado">Contado (3 días)</option>
                    <option value="15 días">Crédito 15 días</option>
                    <option value="30 días">Crédito 30 días</option>
                  </select>
                </label>
              </div>

              <div className="po-totals-box" style={{ marginTop: '10px' }}>
                <div className="po-totals-row">
                  <span>Subtotal:</span>
                  <strong>{money(newSubtotal)}</strong>
                </div>
                <div className="po-totals-row">
                  <span>IVA (16%):</span>
                  <strong>{money(newSubtotal * 0.16)}</strong>
                </div>
                <div className="po-totals-row grand">
                  <span>Total a facturar:</span>
                  <strong>{money(newSubtotal * 1.16)} MXN</strong>
                </div>
              </div>

              <div className="create-modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsNewInvoiceModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="button button-primary">
                  <FileText size={14} /> Emitir cuenta por cobrar
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal: Detalle de Factura */}
      {isDetailModalOpen && selectedInvoice && (
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
                <div className="panel-kicker">COMPROBANTE FISCAL DIGITAL · CFDI</div>
                <h2>{selectedInvoice.folio}</h2>
                <p>Información fiscal, fechas de devengo y registro de cobranza.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setIsDetailModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="cfdi-mockup-card">
              <div className="cfdi-header-row">
                <div className="cfdi-emisor">
                  <strong>Brújula Estudio S.A. de C.V.</strong>
                  <small>RFC: BES180320AB1</small>
                  <small>Régimen General de Ley Personas Morales (601)</small>
                  <small>Lugar de Expedición: 03940, Ciudad de México</small>
                </div>
                <div className="cfdi-meta">
                  <span className="cfdi-badge">Ingreso (I)</span>
                  <strong>Folio: {selectedInvoice.folio}</strong>
                  <small>Fecha: {selectedInvoice.issueDate}</small>
                  <small>Método de Pago: PPD · Pago en parcialidades o diferido</small>
                </div>
              </div>

              <div className="cfdi-divider" />

              <div className="cfdi-receptor-row">
                <Building2 size={16} />
                <div>
                  <strong>Receptor: {selectedInvoice.clientCompany}</strong>
                  <span>Contacto: {selectedInvoice.clientName}</span>
                  <span>RFC: {selectedInvoice.clientRfc || 'XAXX010101000'}</span>
                  <span>Uso de CFDI: G03 · Gastos en general</span>
                </div>
              </div>

              <div className="cfdi-status-strip">
                <div>
                  <small>Estado actual</small>
                  <div>{getStatusBadge(selectedInvoice.status)}</div>
                </div>
                <div>
                  <small>Fecha de vencimiento</small>
                  <strong>{selectedInvoice.dueDate}</strong>
                </div>
                <div>
                  <small>Pedido de venta</small>
                  <strong>{selectedInvoice.orderFolio}</strong>
                </div>
              </div>

              <div className="po-totals-box" style={{ marginTop: '12px' }}>
                <div className="po-totals-row">
                  <span>Subtotal:</span>
                  <strong>{money(selectedInvoice.subtotal)}</strong>
                </div>
                <div className="po-totals-row">
                  <span>IVA Trasladado (16%):</span>
                  <strong>{money(selectedInvoice.tax)}</strong>
                </div>
                <div className="po-totals-row grand">
                  <span>Total Facturado:</span>
                  <strong>{money(selectedInvoice.total)} MXN</strong>
                </div>
                <div className="po-totals-row">
                  <span>Monto ya cobrado:</span>
                  <strong style={{ color: '#3c7d5c' }}>{money(selectedInvoice.paidAmount)}</strong>
                </div>
                <div className="po-totals-row" style={{ borderTop: '1px dashed #d5dcd6', paddingTop: '4px' }}>
                  <span>Saldo insoluto:</span>
                  <strong style={{ color: selectedInvoice.balance > 0 ? '#ba4c32' : '#3c7d5c' }}>
                    {money(selectedInvoice.balance)} MXN
                  </strong>
                </div>
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
              {selectedInvoice.balance > 0 && (
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => {
                    setIsDetailModalOpen(false)
                    handleOpenCollectModal(selectedInvoice)
                  }}
                >
                  <DollarSign size={14} /> Registrar cobro ahora
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
