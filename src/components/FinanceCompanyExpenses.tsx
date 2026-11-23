import { useMemo, useState } from 'react'
import {
  Building,
  Building2,
  Calendar,
  CreditCard,
  Download,
  Eye,
  FileSpreadsheet,
  Landmark,
  Layers,
  Monitor,
  PieChart,
  Plane,
  Plus,
  Receipt,
  Search,
  Settings2,
  Trash2,
  Truck,
  Users,
  X,
  Zap,
} from 'lucide-react'
import {
  resolveCompanyExpenseCategory,
  type BankAccount,
  type CompanyExpenseCategory,
  type ExpenseCategory,
  type ExpenseRecord,
  type PaymentTransaction,
} from '../data/finance'
import type { DepartmentRecord } from './AdministrationSection'
import { useToast } from './Toast'

interface FinanceCompanyExpensesProps {
  expenses: ExpenseRecord[]
  bankAccounts: BankAccount[]
  departments: DepartmentRecord[]
  activeUserName: string
  canCreate?: boolean
  onAddExpense: (expense: ExpenseRecord) => void
  onDeleteExpense?: (expenseId: string) => void
  onAddTransaction: (txn: PaymentTransaction) => void
  onUpdateBankAccountBalance: (accountId: string, delta: number) => void
  onExportAudit?: (reportName: string, rowCount: number) => void
}

const ALL_SUBCATEGORIES: ExpenseCategory[] = [
  'Arrendamiento',
  'Servicios',
  'Nómina y honorarios',
  'Logística y fletes',
  'Software y herramientas',
  'Impuestos y derechos',
  'Viáticos y representación',
  'Comisiones e intereses',
]

const COMPANY_CATEGORIES: Array<{
  id: CompanyExpenseCategory
  label: string
  description: string
  defaultSubCategory: ExpenseCategory
  subCategories: ExpenseCategory[]
  defaultBehavior: 'Fijo' | 'Variable'
  dotColor: string
}> = [
  {
    id: 'Gastos administrativos',
    label: 'Gastos administrativos',
    description: 'Renta, honorarios, software, licencias e impuestos corporativos.',
    defaultSubCategory: 'Arrendamiento',
    subCategories: [
      'Arrendamiento',
      'Nómina y honorarios',
      'Software y herramientas',
      'Impuestos y derechos',
    ],
    defaultBehavior: 'Fijo',
    dotColor: '#3b6ca8',
  },
  {
    id: 'Gastos operativos',
    label: 'Gastos operativos',
    description: 'Servicios en sede, logística, fletes, viáticos y operación diaria.',
    defaultSubCategory: 'Servicios',
    subCategories: ['Servicios', 'Logística y fletes', 'Viáticos y representación'],
    defaultBehavior: 'Variable',
    dotColor: '#2e7d5b',
  },
  {
    id: 'Gastos financieros',
    label: 'Gastos financieros',
    description: 'Comisiones bancarias, intereses de crédito y cargos financieros.',
    defaultSubCategory: 'Comisiones e intereses',
    subCategories: ['Comisiones e intereses'],
    defaultBehavior: 'Variable',
    dotColor: '#b45309',
  },
]

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const formatIsoToErpDate = (isoDate: string): string => {
  const parts = isoDate.split('-')
  if (parts.length !== 3) {
    const now = new Date()
    return `${String(now.getDate()).padStart(2, '0')} ${MONTHS_ES[now.getMonth()]} ${now.getFullYear()}`
  }
  const year = Number(parts[0])
  const monthIdx = Math.max(0, Math.min(11, Number(parts[1]) - 1))
  const day = String(Number(parts[2])).padStart(2, '0')
  return `${day} ${MONTHS_ES[monthIdx]} ${year}`
}

const getTodayIso = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const money = (val: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(val)

const getSubCategoryIcon = (cat: ExpenseCategory) => {
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
    case 'Comisiones e intereses':
      return <CreditCard size={12} />
    default:
      return <Receipt size={12} />
  }
}

export function FinanceCompanyExpenses({
  expenses,
  bankAccounts,
  departments,
  activeUserName,
  canCreate = true,
  onAddExpense,
  onDeleteExpense,
  onAddTransaction,
  onUpdateBankAccountBalance,
  onExportAudit,
}: FinanceCompanyExpensesProps) {
  const toast = useToast()

  // Filters & view state
  const [selectedCategory, setSelectedCategory] = useState<'Todas' | CompanyExpenseCategory>('Todas')
  const [selectedSubCategory, setSelectedSubCategory] = useState<'Todos' | ExpenseCategory>('Todos')
  const [selectedBehavior, setSelectedBehavior] = useState<'Todos' | 'Fijo' | 'Variable'>('Todos')
  const [searchQuery, setSearchQuery] = useState('')
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [viewingExpense, setViewingExpense] = useState<ExpenseRecord | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // Registration form state
  const [companyCategory, setCompanyCategory] = useState<CompanyExpenseCategory>('Gastos administrativos')
  const [subCategory, setSubCategory] = useState<ExpenseCategory>('Arrendamiento')
  const [costBehavior, setCostBehavior] = useState<'Fijo' | 'Variable'>('Fijo')
  const [expenseDateIso, setExpenseDateIso] = useState<string>(getTodayIso)
  const [beneficiary, setBeneficiary] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState<string>('4500')
  const [hasTax, setHasTax] = useState(true)
  const [paymentMethod, setPaymentMethod] = useState('Transferencia SPEI')
  const [bankAccountId, setBankAccountId] = useState(bankAccounts[0]?.id || '')
  const [departmentName, setDepartmentName] = useState(
    departments.find((d) => d.active)?.name || 'Finanzas y Tesorería'
  )
  const [referenceDoc, setReferenceDoc] = useState('')

  const activeCategoryMeta = useMemo(
    () => COMPANY_CATEGORIES.find((c) => c.id === companyCategory) || COMPANY_CATEGORIES[0],
    [companyCategory]
  )

  const handleSelectCompanyCategory = (catId: CompanyExpenseCategory) => {
    const meta = COMPANY_CATEGORIES.find((c) => c.id === catId)
    setCompanyCategory(catId)
    if (meta) {
      setSubCategory(meta.defaultSubCategory)
      setCostBehavior(meta.defaultBehavior)
    }
  }

  const handleFilterCompanyCategory = (cat: 'Todas' | CompanyExpenseCategory) => {
    setSelectedCategory(cat)
    // Reset subCategory filter if it does not belong to the newly chosen macro category
    if (cat !== 'Todas' && selectedSubCategory !== 'Todos') {
      const meta = COMPANY_CATEGORIES.find((c) => c.id === cat)
      if (meta && !meta.subCategories.includes(selectedSubCategory)) {
        setSelectedSubCategory('Todos')
      }
    }
  }

  // Normalized records with resolved companyCategory
  const normalizedExpenses = useMemo(
    () =>
      expenses.map((exp) => ({
        ...exp,
        resolvedCompanyCategory: resolveCompanyExpenseCategory(exp),
      })),
    [expenses]
  )

  // Summary metrics across macro categories and rubros
  const summaryStats = useMemo(() => {
    const totals: Record<CompanyExpenseCategory, { total: number; count: number; subtotal: number }> = {
      'Gastos administrativos': { total: 0, count: 0, subtotal: 0 },
      'Gastos operativos': { total: 0, count: 0, subtotal: 0 },
      'Gastos financieros': { total: 0, count: 0, subtotal: 0 },
    }
    const subStats: Record<string, { total: number; count: number }> = {}
    ALL_SUBCATEGORIES.forEach((s) => {
      subStats[s] = { total: 0, count: 0 }
    })

    let grandTotal = 0
    normalizedExpenses.forEach((exp) => {
      const cat = exp.resolvedCompanyCategory
      totals[cat].total += exp.total
      totals[cat].subtotal += exp.amount
      totals[cat].count += 1

      if (!subStats[exp.category]) {
        subStats[exp.category] = { total: 0, count: 0 }
      }
      subStats[exp.category].total += exp.total
      subStats[exp.category].count += 1

      grandTotal += exp.total
    })

    let topRubroName = 'N/A'
    let topRubroAmount = 0
    Object.entries(subStats).forEach(([rubro, stat]) => {
      if (stat.total > topRubroAmount) {
        topRubroAmount = stat.total
        topRubroName = rubro
      }
    })

    return { totals, subStats, grandTotal, topRubroName, topRubroAmount }
  }, [normalizedExpenses])

  // Subcategories visible in the secondary filter row
  const visibleSubCategories = useMemo(() => {
    const pool =
      selectedCategory === 'Todas'
        ? ALL_SUBCATEGORIES
        : COMPANY_CATEGORIES.find((c) => c.id === selectedCategory)?.subCategories || ALL_SUBCATEGORIES
    return pool.filter((sub) => {
      if (selectedCategory === 'Todas') return (summaryStats.subStats[sub]?.count || 0) > 0
      return true
    })
  }, [selectedCategory, summaryStats.subStats])

  // Filtered list for table
  const filteredExpenses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return normalizedExpenses.filter((exp) => {
      if (selectedCategory !== 'Todas' && exp.resolvedCompanyCategory !== selectedCategory) {
        return false
      }
      if (selectedSubCategory !== 'Todos' && exp.category !== selectedSubCategory) {
        return false
      }
      const behavior = exp.costBehavior || 'Fijo'
      if (selectedBehavior !== 'Todos' && behavior !== selectedBehavior) {
        return false
      }
      if (!q) return true
      return (
        exp.folio.toLowerCase().includes(q) ||
        exp.description.toLowerCase().includes(q) ||
        exp.beneficiary.toLowerCase().includes(q) ||
        exp.category.toLowerCase().includes(q) ||
        exp.resolvedCompanyCategory.toLowerCase().includes(q) ||
        (exp.referenceDoc && exp.referenceDoc.toLowerCase().includes(q)) ||
        (exp.departmentName && exp.departmentName.toLowerCase().includes(q)) ||
        exp.user.toLowerCase().includes(q)
      )
    })
  }, [normalizedExpenses, selectedCategory, selectedSubCategory, selectedBehavior, searchQuery])

  const filteredTotals = useMemo(() => {
    return filteredExpenses.reduce(
      (acc, exp) => {
        acc.subtotal += exp.amount
        acc.tax += exp.tax
        acc.total += exp.total
        return acc
      },
      { subtotal: 0, tax: 0, total: 0 }
    )
  }, [filteredExpenses])

  const parsedAmount = Math.max(0, Number(amount) || 0)
  const previewTax = hasTax ? Number((parsedAmount * 0.16).toFixed(2)) : 0
  const previewTotal = Number((parsedAmount + previewTax).toFixed(2))

  const handleRegisterExpense = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canCreate) {
      toast.warning('Tu rol actual no tiene permisos para registrar gastos.', 'Permiso requerido')
      return
    }
    if (!beneficiary.trim() || !description.trim()) {
      toast.error('Ingresa el beneficiario y la descripción del gasto.', 'Campos requeridos')
      return
    }
    if (parsedAmount <= 0) {
      toast.warning('El importe base debe ser mayor a cero.', 'Importe inválido')
      return
    }

    const selectedBank = bankAccounts.find((b) => b.id === bankAccountId) || bankAccounts[0]
    if (!selectedBank) {
      toast.error('No hay una cuenta bancaria disponible para registrar el cargo.', 'Cuenta requerida')
      return
    }
    if (selectedBank.balance < previewTotal) {
      toast.warning(
        `Saldo insuficiente en ${selectedBank.bankName} (Disponible: ${money(selectedBank.balance)}).`,
        'Saldo insuficiente'
      )
      return
    }

    const nextSeq = expenses.length + 1
    const folio = `GST-2026-${String(nextSeq).padStart(3, '0')}`
    const formattedDate = formatIsoToErpDate(expenseDateIso)

    const newExpense: ExpenseRecord = {
      id: `exp_${Date.now()}`,
      folio,
      date: formattedDate,
      category: subCategory,
      companyCategory,
      costBehavior,
      departmentName: departmentName || undefined,
      bankAccountName: selectedBank.bankName,
      description: description.trim(),
      beneficiary: beneficiary.trim(),
      amount: parsedAmount,
      tax: previewTax,
      total: previewTotal,
      paymentMethod,
      referenceDoc: referenceDoc.trim() || undefined,
      user: activeUserName || 'Administrador General',
    }

    onAddExpense(newExpense)
    onUpdateBankAccountBalance(selectedBank.id, -previewTotal)

    const newTxn: PaymentTransaction = {
      id: `txn_${Date.now()}`,
      folio: `PAG-2026-${String(Math.floor(100 + Math.random() * 900))}`,
      date: formattedDate,
      type: 'Gasto operativo',
      entityName: beneficiary.trim(),
      reference: `${companyCategory} · ${referenceDoc.trim() || folio} · ${description.trim()}`,
      amount: previewTotal,
      method: paymentMethod,
      account: selectedBank.bankName,
    }
    onAddTransaction(newTxn)

    toast.success(
      `${folio} (${companyCategory}) por ${money(previewTotal)} registrado y debitado de ${selectedBank.bankName}.`,
      'Gasto de empresa registrado'
    )

    setBeneficiary('')
    setDescription('')
    setReferenceDoc('')
    setAmount('4500')
    setIsRegisterOpen(false)
  }

  const handleExportCsv = () => {
    const headers = [
      'Folio',
      'Fecha',
      'Categoría empresarial',
      'Rubro contable',
      'Comportamiento',
      'Departamento',
      'Descripción',
      'Beneficiario',
      'Forma de pago',
      'Cuenta bancaria',
      'Comprobante',
      'Subtotal',
      'IVA',
      'Total',
      'Responsable',
    ]
    const escapeCell = (val: unknown) => {
      const s = String(val ?? '')
      return `"${s.replace(/"/g, '""')}"`
    }
    const rows = filteredExpenses.map((exp) => [
      exp.folio,
      exp.date,
      exp.resolvedCompanyCategory,
      exp.category,
      exp.costBehavior || 'Fijo',
      exp.departmentName || 'General',
      exp.description,
      exp.beneficiary,
      exp.paymentMethod,
      exp.bankAccountName || 'Cuenta operativa',
      exp.referenceDoc || '',
      exp.amount.toFixed(2),
      exp.tax.toFixed(2),
      exp.total.toFixed(2),
      exp.user,
    ])
    const csv = '\uFEFF' + [headers, ...rows].map((r) => r.map(escapeCell).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `gastos-empresa-${getTodayIso()}.csv`
    link.click()
    URL.revokeObjectURL(url)
    onExportAudit?.('Histórico de gastos de la empresa', filteredExpenses.length)
    toast.success(`Exportados ${filteredExpenses.length} registros a CSV.`, 'Exportación completada')
  }

  const getMacroCategoryIcon = (cat: CompanyExpenseCategory) => {
    switch (cat) {
      case 'Gastos administrativos':
        return <Building2 size={15} />
      case 'Gastos operativos':
        return <Settings2 size={15} />
      case 'Gastos financieros':
        return <Landmark size={15} />
    }
  }

  const getDotColor = (cat: CompanyExpenseCategory) => {
    return COMPANY_CATEGORIES.find((c) => c.id === cat)?.dotColor || '#436b64'
  }

  const hasActiveSubFilters =
    selectedCategory !== 'Todas' ||
    selectedSubCategory !== 'Todos' ||
    selectedBehavior !== 'Todos' ||
    searchQuery.trim() !== ''

  return (
    <div className="finance-section-container">
      {/* Header Strip */}
      <div className="ops-header-strip">
        <div className="ops-header-left">
          <div className="ops-icon-box fin-icon-box">
            <Layers size={20} />
          </div>
          <div>
            <h2>Gastos de la empresa</h2>
            <p>
              Registro de egresos, clasificación corporativa (administrativos, operativos y
              financieros), desglose por rubro operativo e histórico completo.
            </p>
          </div>
        </div>

        <div className="ops-header-right">
          <div className="ops-stat-item">
            <span className="ops-stat-label">Total egresos acumulados</span>
            <strong className="ops-stat-val text-alert tabular-nums">
              {money(summaryStats.grandTotal)}
            </strong>
          </div>
          <div className="ops-stat-item">
            <span className="ops-stat-label">Mayor rubro operativo</span>
            <strong className="ops-stat-val tabular-nums" style={{ fontSize: 12 }}>
              <PieChart size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} />
              {summaryStats.topRubroName}
            </strong>
          </div>
          <div className="ops-stat-item">
            <span className="ops-stat-label">Comprobantes</span>
            <strong className="ops-stat-val tabular-nums">{normalizedExpenses.length} pólizas</strong>
          </div>
        </div>
      </div>

      {/* 3 Main Corporate Category Summary Filter Cards */}
      <div className="company-expense-summary-grid">
        {COMPANY_CATEGORIES.map((cat) => {
          const stat = summaryStats.totals[cat.id]
          const share =
            summaryStats.grandTotal > 0
              ? Math.round((stat.total / summaryStats.grandTotal) * 100)
              : 0
          const isActive = selectedCategory === cat.id
          return (
            <button
              key={cat.id}
              type="button"
              className={`company-expense-card ${isActive ? 'active' : ''}`}
              onClick={() => handleFilterCompanyCategory(isActive ? 'Todas' : cat.id)}
            >
              <div className="company-expense-card-top">
                <span className="company-expense-card-icon">{getMacroCategoryIcon(cat.id)}</span>
                <span className="company-expense-card-share tabular-nums">
                  {share}% · {stat.count} {stat.count === 1 ? 'póliza' : 'pólizas'}
                </span>
              </div>
              <div className="company-expense-card-title">
                <span
                  className="company-expense-dot"
                  style={{ backgroundColor: cat.dotColor }}
                  aria-hidden="true"
                />
                <strong>{cat.label}</strong>
              </div>
              <p className="company-expense-card-desc">{cat.description}</p>
              <div className="company-expense-card-amount tabular-nums">{money(stat.total)}</div>
            </button>
          )
        })}
      </div>

      {/* Primary Toolbar: Corporate Category Tabs + CSV + Register Button */}
      <div className="ops-toolbar">
        <div className="ops-filter-group">
          <div
            className="warehouse-tab-selector"
            role="tablist"
            aria-label="Filtrar por categoría empresarial"
          >
            <button
              type="button"
              className={`wh-tab ${selectedCategory === 'Todas' ? 'active' : ''}`}
              onClick={() => handleFilterCompanyCategory('Todas')}
            >
              Todos
              <span className="wh-badge">{normalizedExpenses.length}</span>
            </button>
            {COMPANY_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`wh-tab ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => handleFilterCompanyCategory(cat.id)}
              >
                {cat.label}
                <span className="wh-badge">{summaryStats.totals[cat.id].count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="ops-actions-group">
          <button
            type="button"
            className="button button-secondary"
            onClick={handleExportCsv}
            disabled={filteredExpenses.length === 0}
          >
            <Download size={14} /> Exportar CSV
          </button>
          {canCreate && (
            <button
              type="button"
              className="button button-primary"
              onClick={() => setIsRegisterOpen((prev) => !prev)}
            >
              {isRegisterOpen ? <X size={14} /> : <Plus size={14} />}
              {isRegisterOpen ? 'Cerrar formulario' : 'Registrar nuevo gasto'}
            </button>
          )}
        </div>
      </div>

      {/* Secondary Operational Rubro Breakdown Filter Bar (from Gastos y egresos) */}
      <div className="filter-chips-row" role="group" aria-label="Filtrar por rubro operativo">
        <button
          type="button"
          className={`filter-pill-btn ${selectedSubCategory === 'Todos' ? 'active' : ''}`}
          onClick={() => setSelectedSubCategory('Todos')}
        >
          Todos los rubros
        </button>
        {visibleSubCategories.map((sub) => {
          const stat = summaryStats.subStats[sub] || { total: 0, count: 0 }
          return (
            <button
              key={sub}
              type="button"
              className={`filter-pill-btn ${selectedSubCategory === sub ? 'active' : ''}`}
              onClick={() => setSelectedSubCategory(selectedSubCategory === sub ? 'Todos' : sub)}
              title={`${sub}: ${money(stat.total)}`}
            >
              {getSubCategoryIcon(sub)}
              <span>{sub}</span>
              <span className="tabular-nums">({stat.count})</span>
            </button>
          )
        })}
      </div>

      {/* Inline Collapsible Expense Registration Panel */}
      {isRegisterOpen && (
        <section className="company-expense-form-panel" aria-label="Formulario de registro de gasto">
          <div className="company-expense-form-head">
            <div>
              <h3>Registrar nuevo gasto de la empresa</h3>
              <p>
                Clasifica el gasto como administrativo, operativo o financiero, define su rubro
                operativo y debítalo de la cuenta correspondiente.
              </p>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={() => setIsRegisterOpen(false)}
              aria-label="Cerrar formulario"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleRegisterExpense} className="company-expense-form">
            {/* Categorization Selector */}
            <div className="company-expense-cat-picker">
              <span className="company-expense-field-label">Categoría empresarial *</span>
              <div className="company-expense-segmented">
                {COMPANY_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`company-expense-seg-btn ${companyCategory === cat.id ? 'active' : ''}`}
                    onClick={() => handleSelectCompanyCategory(cat.id)}
                  >
                    <span
                      className="company-expense-dot"
                      style={{ backgroundColor: cat.dotColor }}
                      aria-hidden="true"
                    />
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="company-expense-form-grid">
              <label className="form-field">
                <span>Rubro / Subcategoría contable *</span>
                <select
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value as ExpenseCategory)}
                  required
                >
                  {activeCategoryMeta.subCategories.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>Comportamiento del costo</span>
                <select
                  value={costBehavior}
                  onChange={(e) => setCostBehavior(e.target.value as 'Fijo' | 'Variable')}
                >
                  <option value="Fijo">Fijo</option>
                  <option value="Variable">Variable</option>
                </select>
              </label>

              <label className="form-field">
                <span>Fecha del gasto *</span>
                <input
                  type="date"
                  value={expenseDateIso}
                  onChange={(e) => setExpenseDateIso(e.target.value)}
                  required
                />
              </label>

              <label className="form-field">
                <span>Departamento / Centro de costo</span>
                <select
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                >
                  {departments
                    .filter((d) => d.active)
                    .map((dep) => (
                      <option key={dep.id} value={dep.name}>
                        {dep.name} ({dep.costCenter})
                      </option>
                    ))}
                  {departments.filter((d) => d.active).length === 0 && (
                    <option value="General">General</option>
                  )}
                </select>
              </label>
            </div>

            <div className="company-expense-form-grid">
              <label className="form-field">
                <span>Beneficiario / Proveedor *</span>
                <input
                  type="text"
                  required
                  placeholder="Ej. CFE, BBVA, Inmobiliaria Industrial"
                  value={beneficiary}
                  onChange={(e) => setBeneficiary(e.target.value)}
                />
              </label>

              <label className="form-field" style={{ gridColumn: 'span 2' }}>
                <span>Descripción / Concepto *</span>
                <input
                  type="text"
                  required
                  placeholder="Ej. Pago de comisiones por dispersión SPEI o mantenimiento preventivo"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>

              <label className="form-field">
                <span>Importe base (MXN) *</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
            </div>

            <div className="company-expense-form-grid">
              <label className="form-field">
                <span>Cuenta bancaria de cargo *</span>
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

              <label className="form-field">
                <span>Forma de pago</span>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="Transferencia SPEI">Transferencia electrónica SPEI</option>
                  <option value="Domiciliación bancaria">Domiciliación bancaria</option>
                  <option value="Tarjeta corporativa">Tarjeta corporativa</option>
                  <option value="Cargo bancario automático">Cargo bancario automático</option>
                  <option value="Caja chica">Efectivo caja chica</option>
                </select>
              </label>

              <label className="form-field">
                <span>Referencia / Folio fiscal</span>
                <input
                  type="text"
                  placeholder="Ej. FAC-2026-881 o EDO-CTA-11"
                  value={referenceDoc}
                  onChange={(e) => setReferenceDoc(e.target.value)}
                />
              </label>

              <div className="company-expense-tax-toggle">
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={hasTax}
                    onChange={(e) => setHasTax(e.target.checked)}
                  />
                  <span>Desglosar IVA (16%)</span>
                </label>
              </div>
            </div>

            <div className="company-expense-form-footer">
              <div className="company-expense-totals-preview tabular-nums">
                <span>
                  Subtotal: <strong>{money(parsedAmount)}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  IVA: <strong>{money(previewTax)}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Total a registrar:{' '}
                  <strong className="text-negative">{money(previewTotal)} MXN</strong>
                </span>
              </div>

              <div className="company-expense-form-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsRegisterOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="button button-primary">
                  <Receipt size={14} /> Guardar gasto
                </button>
              </div>
            </div>
          </form>
        </section>
      )}

      {/* Search, Behavior Filter & Historical Table Header */}
      <div className="ops-subbar company-expense-subbar">
        <div className="company-expense-history-title">
          <FileSpreadsheet size={15} />
          <strong>Histórico de gastos registrados</strong>
          <span className="company-expense-muted-sep">
            · {filteredExpenses.length} {filteredExpenses.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        <div className="company-expense-search-controls">
          <select
            className="company-expense-behavior-select"
            aria-label="Filtrar por comportamiento del costo"
            value={selectedBehavior}
            onChange={(e) => setSelectedBehavior(e.target.value as 'Todos' | 'Fijo' | 'Variable')}
          >
            <option value="Todos">Costo: Todos</option>
            <option value="Fijo">Solo fijos</option>
            <option value="Variable">Solo variables</option>
          </select>

          <div className="ops-search-input-wrap" style={{ maxWidth: '360px', width: '100%' }}>
            <Search size={14} />
            <input
              type="text"
              placeholder="Buscar por folio, descripción, beneficiario o comprobante..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
                title="Limpiar búsqueda"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {hasActiveSubFilters && (
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                setSelectedCategory('Todas')
                setSelectedSubCategory('Todos')
                setSelectedBehavior('Todos')
                setSearchQuery('')
              }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Historical Expenses Table */}
      <div className="table-wrap ops-table-wrap">
        <table className="data-table ops-data-table company-expense-table">
          <thead>
            <tr>
              <th>FOLIO</th>
              <th>FECHA</th>
              <th>CATEGORÍA</th>
              <th>RUBRO Y CENTRO DE COSTO</th>
              <th>DESCRIPCIÓN</th>
              <th>BENEFICIARIO</th>
              <th>FORMA DE PAGO</th>
              <th>COMPROBANTE</th>
              <th style={{ textAlign: 'right' }}>SUBTOTAL</th>
              <th style={{ textAlign: 'right' }}>IVA</th>
              <th style={{ textAlign: 'right' }}>TOTAL</th>
              <th>RESPONSABLE</th>
              <th style={{ textAlign: 'right' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={13} className="empty-cell">
                  No se encontraron gastos registrados con los filtros actuales.
                </td>
              </tr>
            ) : (
              filteredExpenses.map((exp) => (
                <tr key={exp.id}>
                  <td>
                    <span className="fin-folio-tag tabular-nums">{exp.folio}</span>
                  </td>
                  <td className="date-cell tabular-nums">{exp.date}</td>
                  <td>
                    <span className="company-expense-inline-cat">
                      <span
                        className="company-expense-dot"
                        style={{ backgroundColor: getDotColor(exp.resolvedCompanyCategory) }}
                        aria-hidden="true"
                      />
                      <span>{exp.resolvedCompanyCategory}</span>
                    </span>
                  </td>
                  <td>
                    <div className="company-expense-subconcept">
                      <span className="company-expense-rubro-line">
                        {getSubCategoryIcon(exp.category)} {exp.category}
                      </span>
                      <small>
                        {exp.costBehavior || 'Fijo'}
                        {exp.departmentName ? ` · ${exp.departmentName}` : ''}
                      </small>
                    </div>
                  </td>
                  <td>
                    <strong className="company-expense-desc-cell">{exp.description}</strong>
                  </td>
                  <td>
                    <span className="supplier-cell">{exp.beneficiary}</span>
                  </td>
                  <td>
                    <div className="company-expense-payment-cell">
                      <span>
                        <CreditCard size={11} /> {exp.paymentMethod}
                      </span>
                      {exp.bankAccountName && <small>{exp.bankAccountName}</small>}
                    </div>
                  </td>
                  <td>
                    <span className="ref-tag tabular-nums">{exp.referenceDoc || '—'}</span>
                  </td>
                  <td style={{ textAlign: 'right' }} className="money-cell tabular-nums">
                    {money(exp.amount)}
                  </td>
                  <td style={{ textAlign: 'right' }} className="money-cell tabular-nums company-expense-iva-cell">
                    {exp.tax > 0 ? money(exp.tax) : '—'}
                  </td>
                  <td style={{ textAlign: 'right' }} className="money-cell tabular-nums">
                    <strong className="text-negative">{money(exp.total)}</strong>
                  </td>
                  <td className="user-cell">{exp.user}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="po-actions-row">
                      <button
                        type="button"
                        className="button-icon-action"
                        title={`Ver detalle de ${exp.folio}`}
                        onClick={() => {
                          setConfirmingDelete(false)
                          setViewingExpense(exp)
                        }}
                      >
                        <Eye size={12} /> Ver
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {filteredExpenses.length > 0 && (
            <tfoot>
              <tr className="company-expense-table-footer">
                <td colSpan={8}>
                  <strong>
                    Totales del histórico mostrado ({filteredExpenses.length}{' '}
                    {filteredExpenses.length === 1 ? 'registro' : 'registros'})
                  </strong>
                </td>
                <td style={{ textAlign: 'right' }} className="tabular-nums">
                  <strong>{money(filteredTotals.subtotal)}</strong>
                </td>
                <td style={{ textAlign: 'right' }} className="tabular-nums">
                  <strong>{money(filteredTotals.tax)}</strong>
                </td>
                <td style={{ textAlign: 'right' }} className="tabular-nums">
                  <strong className="text-negative">{money(filteredTotals.total)}</strong>
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Expense Detail Modal */}
      {viewingExpense && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setViewingExpense(null)
              setConfirmingDelete(false)
            }
          }}
        >
          <section className="create-modal" role="dialog" aria-modal="true">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">FINANZAS · GASTOS DE LA EMPRESA</div>
                <h2>{viewingExpense.folio}</h2>
                <p>
                  {resolveCompanyExpenseCategory(viewingExpense)} · {viewingExpense.category} ·{' '}
                  <Calendar size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />{' '}
                  {viewingExpense.date}
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => {
                  setViewingExpense(null)
                  setConfirmingDelete(false)
                }}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="po-detail-meta-grid">
              <div>
                <small>Beneficiario / Proveedor</small>
                <strong>{viewingExpense.beneficiary}</strong>
                <span>Responsable: {viewingExpense.user}</span>
              </div>
              <div>
                <small>Pago y cuenta</small>
                <strong>{viewingExpense.paymentMethod}</strong>
                <span>
                  {viewingExpense.bankAccountName || 'Cuenta operativa'} · Ref:{' '}
                  {viewingExpense.referenceDoc || 'Sin folio adjunto'}
                </span>
              </div>
              <div>
                <small>Clasificación analítica</small>
                <strong>{resolveCompanyExpenseCategory(viewingExpense)}</strong>
                <span>
                  {viewingExpense.costBehavior || 'Fijo'}
                  {viewingExpense.departmentName ? ` · ${viewingExpense.departmentName}` : ''}
                </span>
              </div>
              <div>
                <small>Descripción</small>
                <strong>{viewingExpense.description}</strong>
              </div>
            </div>

            <div className="po-totals-box" style={{ marginTop: 14 }}>
              <div className="po-totals-row">
                <span>Subtotal:</span>
                <strong className="tabular-nums">{money(viewingExpense.amount)}</strong>
              </div>
              <div className="po-totals-row">
                <span>IVA (16%):</span>
                <strong className="tabular-nums">
                  {viewingExpense.tax > 0 ? money(viewingExpense.tax) : '$0.00'}
                </strong>
              </div>
              <div className="po-totals-row grand">
                <span>Total del gasto:</span>
                <strong className="text-negative tabular-nums">
                  {money(viewingExpense.total)} MXN
                </strong>
              </div>
            </div>

            <div className={`create-modal-actions ${onDeleteExpense ? 'has-delete-action' : ''}`}>
              {onDeleteExpense && (
                <div className="modal-delete-slot">
                  {!confirmingDelete ? (
                    <button
                      type="button"
                      className="button button-danger-outline"
                      onClick={() => setConfirmingDelete(true)}
                    >
                      <Trash2 size={14} /> Eliminar gasto
                    </button>
                  ) : (
                    <div className="modal-delete-confirm">
                      <span>
                        ¿Eliminar <strong>{viewingExpense.folio}</strong>?
                      </span>
                      <button
                        type="button"
                        className="button button-danger-solid"
                        onClick={() => {
                          onDeleteExpense(viewingExpense.id)
                          setViewingExpense(null)
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
                    setViewingExpense(null)
                    setConfirmingDelete(false)
                  }}
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
