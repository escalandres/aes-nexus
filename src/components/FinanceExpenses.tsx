import { useState, useMemo } from 'react'
import {
  FileSpreadsheet,
  Search,
  Plus,
  X,
  CreditCard,
  Building,
  Zap,
  Users,
  Truck,
  Monitor,
  Landmark,
  Plane,
  Receipt,
  PieChart,
} from 'lucide-react'
import type {
  ExpenseRecord,
  ExpenseCategory,
  BankAccount,
  PaymentTransaction,
} from '../data/finance'
import { useToast } from './Toast'

interface FinanceExpensesProps {
  expenses: ExpenseRecord[]
  bankAccounts: BankAccount[]
  onAddExpense: (expense: ExpenseRecord) => void
  onAddTransaction: (txn: PaymentTransaction) => void
  onUpdateBankAccountBalance: (accountId: string, delta: number) => void
}

const CATEGORIES: ExpenseCategory[] = [
  'Arrendamiento',
  'Servicios',
  'Nómina y honorarios',
  'Logística y fletes',
  'Software y herramientas',
  'Impuestos y derechos',
  'Viáticos y representación',
]

const money = (val: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(val)

export function FinanceExpenses({
  expenses,
  bankAccounts,
  onAddExpense,
  onAddTransaction,
  onUpdateBankAccountBalance,
}: FinanceExpensesProps) {
  const toast = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas')

  // Modal
  const [isNewExpenseModalOpen, setIsNewExpenseModalOpen] = useState(false)

  // Form state
  const [category, setCategory] = useState<ExpenseCategory>('Servicios')
  const [description, setDescription] = useState('')
  const [beneficiary, setBeneficiary] = useState('')
  const [amount, setAmount] = useState<number>(3500)
  const [hasTax, setHasTax] = useState(true)
  const [paymentMethod, setPaymentMethod] = useState('Transferencia SPEI')
  const [bankAccountId, setBankAccountId] = useState(bankAccounts[0]?.id || '')
  const [referenceDoc, setReferenceDoc] = useState('')

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const matchCat = selectedCategory === 'Todas' || exp.category === selectedCategory
      const q = searchQuery.toLowerCase()
      const matchSearch =
        !q ||
        exp.folio.toLowerCase().includes(q) ||
        exp.description.toLowerCase().includes(q) ||
        exp.beneficiary.toLowerCase().includes(q) ||
        (exp.referenceDoc && exp.referenceDoc.toLowerCase().includes(q))
      return matchCat && matchSearch
    })
  }, [expenses, selectedCategory, searchQuery])

  // Summary counts
  const totalExpensesAmount = useMemo(() => {
    return expenses.reduce((acc, exp) => acc + exp.total, 0)
  }, [expenses])

  // Category breakdown calculation
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {}
    CATEGORIES.forEach((cat) => (stats[cat] = 0))
    expenses.forEach((exp) => {
      stats[exp.category] = (stats[exp.category] || 0) + exp.total
    })
    return stats
  }, [expenses])

  const topCategory = useMemo(() => {
    let top = 'N/A'
    let max = -1
    Object.entries(categoryStats).forEach(([cat, val]) => {
      if (val > max) {
        max = val
        top = cat
      }
    })
    return { name: top, amount: max }
  }, [categoryStats])

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim() || !beneficiary.trim()) {
      toast.error('Completa la descripción y el beneficiario del gasto.', 'Campos requeridos')
      return
    }

    if (amount <= 0) {
      toast.warning('Ingresa un importe mayor a cero.', 'Importe inválido')
      return
    }

    const sub = Number(amount) || 0
    const taxVal = hasTax ? sub * 0.16 : 0
    const totalVal = sub + taxVal

    const selectedBank = bankAccounts.find((b) => b.id === bankAccountId) || bankAccounts[0]

    if (selectedBank.balance < totalVal) {
      toast.warning(
        `Saldo insuficiente en ${selectedBank.bankName} (Disponible: ${money(selectedBank.balance)}).`,
        'Saldo insuficiente'
      )
      return
    }

    const nextNum = expenses.length + 1
    const folio = `GST-2026-${String(nextNum).padStart(3, '0')}`
    const today = new Date()

    const formatDate = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][d.getMonth()]} ${d.getFullYear()}`

    const todayStr = formatDate(today)

    const newExpense: ExpenseRecord = {
      id: `exp_${Date.now()}`,
      folio,
      date: todayStr,
      category,
      description: description.trim(),
      beneficiary: beneficiary.trim(),
      amount: sub,
      tax: taxVal,
      total: totalVal,
      paymentMethod,
      referenceDoc: referenceDoc.trim() || undefined,
      user: 'Andrea Morales',
    }

    onAddExpense(newExpense)

    // Deduct from bank account
    onUpdateBankAccountBalance(selectedBank.id, -totalVal)

    // Record Transaction
    const newTxn: PaymentTransaction = {
      id: `txn_${Date.now()}`,
      folio: `PAG-2026-${String(Math.floor(100 + Math.random() * 900))}`,
      date: todayStr,
      type: 'Gasto operativo',
      entityName: beneficiary.trim(),
      reference: `${referenceDoc.trim() || 'GASTO'} · ${description.trim()}`,
      amount: totalVal,
      method: paymentMethod,
      account: selectedBank.bankName,
    }
    onAddTransaction(newTxn)

    toast.success(
      `Gasto ${folio} por ${money(totalVal)} registrado y debitado de ${selectedBank.bankName}.`,
      'Gasto registrado'
    )

    setIsNewExpenseModalOpen(false)
    setDescription('')
    setBeneficiary('')
    setAmount(3500)
    setReferenceDoc('')
  }

  const getCategoryIcon = (cat: ExpenseCategory) => {
    switch (cat) {
      case 'Arrendamiento':
        return <Building size={12} />
      case 'Servicios':
        return <Zap size={12} />
      case 'Nómina y honorarios':
        return <Users size={12} />
      case 'Logística y fletes':
        return <Truck size={12} />
      case 'Software y herramientas':
        return <Monitor size={12} />
      case 'Impuestos y derechos':
        return <Landmark size={12} />
      case 'Viáticos y representación':
        return <Plane size={12} />
      default:
        return <Receipt size={12} />
    }
  }

  return (
    <div className="finance-section-container">
      {/* Top Header & Metrics Bar */}
      <div className="ops-header-strip">
        <div className="ops-header-left">
          <div className="ops-icon-box fin-icon-box">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <h2>Gastos y egresos operativos</h2>
            <p>Registro de gastos corrientes, comprobantes de pago, deducciones fiscales y centros de costo.</p>
          </div>
        </div>

        <div className="ops-header-right">
          <div className="ops-stat-item">
            <span className="ops-stat-label">Total egresos del mes</span>
            <strong className="ops-stat-val text-alert">{money(totalExpensesAmount)}</strong>
          </div>
          <div className="ops-stat-item">
            <span className="ops-stat-label">Mayor centro de costo</span>
            <span className="ops-stat-pill alert">
              <PieChart size={12} /> {topCategory.name}
            </span>
          </div>
          <div className="ops-stat-item">
            <span className="ops-stat-label">Comprobantes</span>
            <span className="ops-stat-pill ok">{expenses.length} pólizas</span>
          </div>
        </div>
      </div>

      {/* Category Breakdown Cards */}
      <div className="expense-category-grid">
        {CATEGORIES.map((cat) => {
          const catTotal = categoryStats[cat] || 0
          const percentage = totalExpensesAmount > 0 ? Math.round((catTotal / totalExpensesAmount) * 100) : 0
          return (
            <div
              key={cat}
              className={`expense-category-card ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(selectedCategory === cat ? 'Todas' : cat)}
            >
              <div className="exp-cat-header">
                <span className="exp-cat-icon">{getCategoryIcon(cat)}</span>
                <span className="exp-cat-percent">{percentage}%</span>
              </div>
              <strong>{cat}</strong>
              <div className="exp-cat-val">{money(catTotal)}</div>
            </div>
          )
        })}
      </div>

      {/* Toolbar */}
      <div className="ops-toolbar">
        <div className="ops-filter-group">
          <div className="warehouse-tab-selector">
            <button
              className={`wh-tab ${selectedCategory === 'Todas' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('Todas')}
            >
              Todos los gastos
              <span className="wh-badge">{expenses.length}</span>
            </button>
            {CATEGORIES.map((cat) => {
              const count = expenses.filter((e) => e.category === cat).length
              if (count === 0) return null
              return (
                <button
                  key={cat}
                  className={`wh-tab ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                  <span className="wh-badge">{count}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="ops-actions-group">
          <button
            className="button button-primary"
            onClick={() => setIsNewExpenseModalOpen(true)}
          >
            <Plus size={14} /> Registrar nuevo gasto
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="ops-subbar">
        <div className="ops-search-input-wrap" style={{ maxWidth: '420px', width: '100%' }}>
          <Search size={14} />
          <input
            type="text"
            placeholder="Buscar por descripción, beneficiario o comprobante..."
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

      {/* Expenses Table */}
      <div className="table-wrap ops-table-wrap">
        <table className="data-table ops-data-table">
          <thead>
            <tr>
              <th>PÓLIZA / FOLIO</th>
              <th>FECHA</th>
              <th>CATEGORÍA</th>
              <th>DESCRIPCIÓN</th>
              <th>BENEFICIARIO</th>
              <th>FORMA DE PAGO</th>
              <th>REF. COMPROBANTE</th>
              <th style={{ textAlign: 'right' }}>SUBTOTAL</th>
              <th style={{ textAlign: 'right' }}>IVA</th>
              <th style={{ textAlign: 'right' }}>TOTAL GASTO</th>
              <th>RESPONSABLE</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={11} className="empty-cell">
                  No se encontraron gastos registrados en esta categoría o búsqueda.
                </td>
              </tr>
            ) : (
              filteredExpenses.map((exp) => (
                <tr key={exp.id}>
                  <td>
                    <span className="fin-folio-tag">{exp.folio}</span>
                  </td>
                  <td className="date-cell">{exp.date}</td>
                  <td>
                    <span className="exp-badge">
                      {getCategoryIcon(exp.category)} {exp.category}
                    </span>
                  </td>
                  <td>
                    <strong style={{ fontSize: '9.5px', color: '#2e3d34' }}>{exp.description}</strong>
                  </td>
                  <td>
                    <span className="supplier-cell">
                      <strong style={{ fontSize: '9px' }}>{exp.beneficiary}</strong>
                    </span>
                  </td>
                  <td>
                    <span className="payment-method-tag">
                      <CreditCard size={10} /> {exp.paymentMethod}
                    </span>
                  </td>
                  <td>
                    <span className="ref-tag">{exp.referenceDoc || '—'}</span>
                  </td>
                  <td style={{ textAlign: 'right' }} className="money-cell">
                    {money(exp.amount)}
                  </td>
                  <td style={{ textAlign: 'right', color: '#7a8980' }} className="money-cell">
                    {exp.tax > 0 ? money(exp.tax) : '—'}
                  </td>
                  <td style={{ textAlign: 'right' }} className="money-cell">
                    <strong className="text-negative">{money(exp.total)}</strong>
                  </td>
                  <td className="user-cell">{exp.user}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Registrar Nuevo Gasto */}
      {isNewExpenseModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsNewExpenseModalOpen(false)
          }}
        >
          <section className="create-modal modal-wide" role="dialog" aria-modal="true">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">FINANZAS · REGISTRO DE EGRESO</div>
                <h2>Registrar Gasto Operativo</h2>
                <p>Captura el comprobante de compra o servicio y debita de la cuenta correspondiente.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setIsNewExpenseModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateExpense}>
              <div className="form-grid">
                <label className="form-field">
                  <span>Categoría de gasto *</span>
                  <select
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-field">
                  <span>Beneficiario / Proveedor *</span>
                  <input
                    required
                    placeholder="Ej. CFE, Despacho Contable, AWS"
                    value={beneficiary}
                    onChange={(e) => setBeneficiary(e.target.value)}
                  />
                </label>
              </div>

              <label className="form-field">
                <span>Concepto o descripción *</span>
                <input
                  required
                  placeholder="Ej. Mantenimiento correctivo de compresor de aire y andenes"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>

              <div className="form-grid">
                <label className="form-field">
                  <span>Importe base (MXN) *</span>
                  <input
                    type="number"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  />
                </label>

                <label className="form-field">
                  <span>Cuenta de retiro bancario *</span>
                  <select
                    required
                    value={bankAccountId}
                    onChange={(e) => setBankAccountId(e.target.value)}
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
                  <span>Forma de pago</span>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="Transferencia SPEI">Transferencia electrónica SPEI</option>
                    <option value="Tarjeta corporativa">Tarjeta corporativa de débito/crédito</option>
                    <option value="Domiciliación bancaria">Domiciliación bancaria</option>
                    <option value="Caja chica">Efectivo caja chica</option>
                  </select>
                </label>

                <label className="form-field">
                  <span>Folio de factura o comprobante</span>
                  <input
                    placeholder="Ej. FAC-SERV-9901 o TICKET-14"
                    value={referenceDoc}
                    onChange={(e) => setReferenceDoc(e.target.value)}
                  />
                </label>
              </div>

              <div style={{ margin: '8px 0' }}>
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={hasTax}
                    onChange={(e) => setHasTax(e.target.checked)}
                  />
                  <span>Calcular y desglosar IVA trasladado (16%)</span>
                </label>
              </div>

              <div className="po-totals-box">
                <div className="po-totals-row">
                  <span>Subtotal:</span>
                  <strong>{money(amount)}</strong>
                </div>
                <div className="po-totals-row">
                  <span>IVA (16%):</span>
                  <strong>{hasTax ? money(amount * 0.16) : '$0'}</strong>
                </div>
                <div className="po-totals-row grand">
                  <span>Total egreso:</span>
                  <strong className="text-negative">
                    {hasTax ? money(amount * 1.16) : money(amount)} MXN
                  </strong>
                </div>
              </div>

              <div className="create-modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsNewExpenseModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="button button-primary">
                  <Receipt size={14} /> Registrar egreso y debitar
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
