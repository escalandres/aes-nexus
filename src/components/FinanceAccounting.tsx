import { useState, useMemo } from 'react'
import {
  BookOpen,
  Search,
  Plus,
  CheckCircle2,
  X,
  Layers,
  Scale,
  Pencil,
  AlertCircle,
  Check,
  Filter,
  RotateCcw,
  FileSpreadsheet,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import type { ChartAccount, AccountType } from '../data/finance'
import { useToast } from './Toast'
import { FinanceAccountingChart } from './FinanceAccountingChart'

interface FinanceAccountingProps {
  accounts: ChartAccount[]
  onUpdateAccounts: (accounts: ChartAccount[]) => void
}

export type MacroAccountType = 'Todos' | 'Activo' | 'Pasivo' | 'Capital' | 'Ingreso' | 'Gasto'

const ACCOUNT_TYPES: AccountType[] = [
  'Activo circulante',
  'Activo no circulante',
  'Pasivo a corto plazo',
  'Pasivo a largo plazo',
  'Capital contable',
  'Ingresos',
  'Costos',
  'Gastos de operación',
]

const matchesMacroType = (accType: AccountType, macro: MacroAccountType): boolean => {
  if (macro === 'Todos') return true
  if (macro === 'Activo') return accType === 'Activo circulante' || accType === 'Activo no circulante'
  if (macro === 'Pasivo') return accType === 'Pasivo a corto plazo' || accType === 'Pasivo a largo plazo'
  if (macro === 'Capital') return accType === 'Capital contable'
  if (macro === 'Ingreso') return accType === 'Ingresos'
  if (macro === 'Gasto') return accType === 'Costos' || accType === 'Gastos de operación'
  return false
}

const getSubTypesForMacro = (macro: MacroAccountType): AccountType[] => {
  if (macro === 'Activo') return ['Activo circulante', 'Activo no circulante']
  if (macro === 'Pasivo') return ['Pasivo a corto plazo', 'Pasivo a largo plazo']
  if (macro === 'Capital') return ['Capital contable']
  if (macro === 'Ingreso') return ['Ingresos']
  if (macro === 'Gasto') return ['Costos', 'Gastos de operación']
  return ACCOUNT_TYPES
}

const money = (val: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(val)

export function FinanceAccounting({
  accounts,
  onUpdateAccounts,
}: FinanceAccountingProps) {
  const toast = useToast()
  const [macroTypeFilter, setMacroTypeFilter] = useState<MacroAccountType>('Todos')
  const [subTypeFilter, setSubTypeFilter] = useState<string>('Todos')
  const [natureFilter, setNatureFilter] = useState<string>('Todas')
  const [statusFilter, setStatusFilter] = useState<string>('Todos')
  const [searchQuery, setSearchQuery] = useState('')

  // New Account Modal
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false)

  // Form state for creating account
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('Activo circulante')
  const [nature, setNature] = useState<'Deudora' | 'Acreedora'>('Deudora')
  const [balance, setBalance] = useState<number>(0)
  const [description, setDescription] = useState('')

  // Edit Account Modal & state
  const [editingAccount, setEditingAccount] = useState<ChartAccount | null>(null)
  const [editCode, setEditCode] = useState('')
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState<AccountType>('Activo circulante')
  const [editNature, setEditNature] = useState<'Deudora' | 'Acreedora'>('Deudora')
  const [editBalance, setEditBalance] = useState<number>(0)
  const [editDescription, setEditDescription] = useState('')
  const [editStatus, setEditStatus] = useState<'Activa' | 'Inactiva'>('Activa')

  const handleOpenEditModal = (account: ChartAccount) => {
    setEditingAccount(account)
    setEditCode(account.code)
    setEditName(account.name)
    setEditType(account.type)
    setEditNature(account.nature)
    setEditBalance(account.balance)
    setEditDescription(account.description || '')
    setEditStatus(account.status)
  }

  const handleEditTypeChange = (newType: AccountType) => {
    setEditType(newType)
    if (
      newType === 'Activo circulante' ||
      newType === 'Activo no circulante' ||
      newType === 'Costos' ||
      newType === 'Gastos de operación'
    ) {
      setEditNature('Deudora')
    } else {
      setEditNature('Acreedora')
    }
  }

  const handleUpdateAccount = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingAccount) return

    if (!editCode.trim() || !editName.trim()) {
      toast.error('Indica el código y el nombre de la cuenta contable.', 'Campos requeridos')
      return
    }

    const isDuplicate = accounts.some(
      (a) => a.id !== editingAccount.id && a.code.trim().toLowerCase() === editCode.trim().toLowerCase()
    )
    if (isDuplicate) {
      toast.warning(`Ya existe otra cuenta registrada con el código ${editCode.trim()}.`, 'Código duplicado')
      return
    }

    const updatedAccount: ChartAccount = {
      ...editingAccount,
      code: editCode.trim(),
      name: editName.trim(),
      type: editType,
      nature: editNature,
      balance: Number(editBalance) || 0,
      description: editDescription.trim() || undefined,
      status: editStatus,
    }

    const updatedAccounts = accounts.map((a) => (a.id === editingAccount.id ? updatedAccount : a))
    onUpdateAccounts(updatedAccounts)
    toast.success(
      `Cuenta contable [${updatedAccount.code}] ${updatedAccount.name} actualizada correctamente.`,
      'Cuenta actualizada'
    )
    setEditingAccount(null)
  }

  // Automatically adjust default nature when type changes
  const handleTypeChange = (newType: AccountType) => {
    setType(newType)
    if (
      newType === 'Activo circulante' ||
      newType === 'Activo no circulante' ||
      newType === 'Costos' ||
      newType === 'Gastos de operación'
    ) {
      setNature('Deudora')
    } else {
      setNature('Acreedora')
    }
  }

  // Available subtypes according to selected macro group
  const availableSubTypes = useMemo(() => {
    return getSubTypesForMacro(macroTypeFilter)
  }, [macroTypeFilter])

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const matchMacro = matchesMacroType(acc.type, macroTypeFilter)
      const matchSubType = subTypeFilter === 'Todos' || acc.type === subTypeFilter
      const matchNature = natureFilter === 'Todas' || acc.nature === natureFilter
      const matchStatus = statusFilter === 'Todos' || acc.status === statusFilter
      const q = searchQuery.toLowerCase().trim()
      const matchSearch =
        !q ||
        acc.code.toLowerCase().includes(q) ||
        acc.name.toLowerCase().includes(q) ||
        (acc.description && acc.description.toLowerCase().includes(q))
      return matchMacro && matchSubType && matchNature && matchStatus && matchSearch
    })
  }, [accounts, macroTypeFilter, subTypeFilter, natureFilter, statusFilter, searchQuery])

  const hasActiveFilters =
    macroTypeFilter !== 'Todos' ||
    subTypeFilter !== 'Todos' ||
    natureFilter !== 'Todas' ||
    statusFilter !== 'Todos' ||
    searchQuery.trim() !== ''

  const handleResetFilters = () => {
    setMacroTypeFilter('Todos')
    setSubTypeFilter('Todos')
    setNatureFilter('Todas')
    setStatusFilter('Todos')
    setSearchQuery('')
  }

  // Summary counts
  const totalDebitBalance = useMemo(() => {
    return accounts
      .filter((a) => a.nature === 'Deudora')
      .reduce((acc, a) => acc + a.balance, 0)
  }, [accounts])

  const totalCreditBalance = useMemo(() => {
    return accounts
      .filter((a) => a.nature === 'Acreedora')
      .reduce((acc, a) => acc + a.balance, 0)
  }, [accounts])

  const handleExportToExcel = () => {
    if (filteredAccounts.length === 0) {
      toast.warning('No hay cuentas contables en la tabla para exportar.', 'Sin datos')
      return
    }

    const dataToExport = filteredAccounts.map((acc) => ({
      'Código': acc.code,
      'Nombre de la Cuenta': acc.name,
      'Tipo de Cuenta': acc.type,
      'Naturaleza': acc.nature,
      'Saldo Actual (MXN)': acc.balance,
      'Estado': acc.status,
      'Descripción / Uso': acc.description || '',
    }))

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)

    worksheet['!cols'] = [
      { wch: 14 },
      { wch: 38 },
      { wch: 25 },
      { wch: 14 },
      { wch: 20 },
      { wch: 12 },
      { wch: 45 },
    ]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Catálogo Cuentas')

    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `Catalogo_Cuentas_Contables_${dateStr}.xlsx`
    XLSX.writeFile(workbook, filename)

    toast.success(
      `Se descargó el catálogo con ${filteredAccounts.length} cuentas en "${filename}".`,
      'Exportación exitosa'
    )
  }

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim() || !name.trim()) {
      toast.error('Indica el código y el nombre de la cuenta contable.', 'Campos requeridos')
      return
    }

    // Check if code already exists
    if (accounts.some((a) => a.code.trim().toLowerCase() === code.trim().toLowerCase())) {
      toast.warning(`Ya existe una cuenta registrada con el código ${code.trim()}.`, 'Código duplicado')
      return
    }

    const newAccount: ChartAccount = {
      id: `acc_${Date.now()}`,
      code: code.trim(),
      name: name.trim(),
      type,
      nature,
      balance: Number(balance) || 0,
      description: description.trim() || undefined,
      status: 'Activa',
    }

    onUpdateAccounts([...accounts, newAccount])
    toast.success(
      `Cuenta contable [${newAccount.code}] ${newAccount.name} agregada al catálogo.`,
      'Cuenta contable creada'
    )

    setIsNewAccountModalOpen(false)
    setCode('')
    setName('')
    setType('Activo circulante')
    setNature('Deudora')
    setBalance(0)
    setDescription('')
  }

  const getTypeBadgeClass = (accType: AccountType) => {
    if (accType.startsWith('Activo')) return 'badge-entry'
    if (accType.startsWith('Pasivo')) return 'badge-exit'
    if (accType === 'Capital contable') return 'badge-transfer'
    if (accType === 'Ingresos') return 'fin-badge-paid'
    return 'badge-adjust'
  }

  return (
    <div className="finance-section-container">
      {/* Top Header & Metrics Bar */}
      <div className="ops-header-strip">
        <div className="ops-header-left">
          <div className="ops-icon-box fin-icon-box">
            <BookOpen size={20} />
          </div>
          <div>
            <h2>Cuentas contables · Catálogo de cuentas</h2>
            <p>Estructura contable para el registro de activos, pasivos, capital, ingresos, costos y gastos.</p>
          </div>
        </div>

        <div className="ops-header-right">
          <div className="ops-stat-item">
            <span className="ops-stat-label">Cuentas activas</span>
            <strong className="ops-stat-val">{accounts.length}</strong>
          </div>
          <div className="ops-stat-item">
            <span className="ops-stat-label">Saldo deudor (Activo/Gasto)</span>
            <span className="ops-stat-pill ok">{money(totalDebitBalance)}</span>
          </div>
          <div className="ops-stat-item">
            <span className="ops-stat-label">Saldo acreedor (Pasivo/Capital)</span>
            <span className="ops-stat-pill alert">{money(totalCreditBalance)}</span>
          </div>
        </div>
      </div>

      {/* Recharts Visualization: Comparativo de Saldos Totales por Tipo */}
      <FinanceAccountingChart
        accounts={accounts}
        onSelectType={(selectedId) => {
          if (['Activo', 'Pasivo', 'Capital', 'Ingreso', 'Gasto'].includes(selectedId)) {
            setMacroTypeFilter(selectedId as MacroAccountType)
            setSubTypeFilter('Todos')
          } else {
            setSubTypeFilter(selectedId)
            if (selectedId.startsWith('Activo')) setMacroTypeFilter('Activo')
            else if (selectedId.startsWith('Pasivo')) setMacroTypeFilter('Pasivo')
            else if (selectedId === 'Capital contable') setMacroTypeFilter('Capital')
            else if (selectedId === 'Ingresos') setMacroTypeFilter('Ingreso')
            else if (selectedId === 'Costos' || selectedId === 'Gastos de operación') setMacroTypeFilter('Gasto')
          }
        }}
      />

      {/* Toolbar */}
      <div className="ops-toolbar">
        <div className="ops-filter-group">
          <div className="warehouse-tab-selector" role="tablist">
            <button
              className={`wh-tab ${macroTypeFilter === 'Todos' ? 'active' : ''}`}
              onClick={() => {
                setMacroTypeFilter('Todos')
                setSubTypeFilter('Todos')
              }}
            >
              <Layers size={13} />
              Todas las cuentas
              <span className="wh-badge">{accounts.length}</span>
            </button>
            {(['Activo', 'Pasivo', 'Capital', 'Ingreso', 'Gasto'] as MacroAccountType[]).map((group) => {
              const count = accounts.filter((a) => matchesMacroType(a.type, group)).length
              return (
                <button
                  key={group}
                  className={`wh-tab ${macroTypeFilter === group ? 'active' : ''}`}
                  onClick={() => {
                    setMacroTypeFilter(group)
                    setSubTypeFilter('Todos')
                  }}
                >
                  {group}
                  <span className="wh-badge">{count}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Real-time search field in toolbar */}
        <div className="ops-toolbar-search">
          <div className="ops-search-input-wrap">
            <Search size={14} />
            <input
              type="text"
              placeholder="Buscar por nombre o código en tiempo real..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Buscar cuentas contables por código o nombre"
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
        </div>

        <div className="ops-actions-group">
          <button
            type="button"
            className="button button-secondary"
            onClick={handleExportToExcel}
            title={
              hasActiveFilters
                ? `Exportar ${filteredAccounts.length} cuentas filtradas a archivo Excel (.xlsx)`
                : `Exportar catálogo completo (${filteredAccounts.length} cuentas) a Excel (.xlsx)`
            }
          >
            <FileSpreadsheet size={14} /> Exportar a Excel
          </button>
          <button
            className="button button-primary"
            onClick={() => setIsNewAccountModalOpen(true)}
          >
            <Plus size={14} /> Agregar cuenta
          </button>
        </div>
      </div>

      {/* Dropdown Filters Bar */}
      <div className="accounting-filters-bar">
        <div className="accounting-filters-left">
          {/* Desplegable de Tipo (Activo, Pasivo, Capital, Ingreso, Gasto) */}
          <div className="accounting-select-wrap">
            <Filter size={12} />
            <label htmlFor="filter-macro-type">Tipo:</label>
            <select
              id="filter-macro-type"
              className="accounting-filter-select"
              value={macroTypeFilter}
              onChange={(e) => {
                const val = e.target.value as MacroAccountType
                setMacroTypeFilter(val)
                setSubTypeFilter('Todos')
              }}
            >
              <option value="Todos">Todos los tipos ({accounts.length})</option>
              <option value="Activo">
                Activo ({accounts.filter((a) => matchesMacroType(a.type, 'Activo')).length})
              </option>
              <option value="Pasivo">
                Pasivo ({accounts.filter((a) => matchesMacroType(a.type, 'Pasivo')).length})
              </option>
              <option value="Capital">
                Capital ({accounts.filter((a) => matchesMacroType(a.type, 'Capital')).length})
              </option>
              <option value="Ingreso">
                Ingreso ({accounts.filter((a) => matchesMacroType(a.type, 'Ingreso')).length})
              </option>
              <option value="Gasto">
                Gasto ({accounts.filter((a) => matchesMacroType(a.type, 'Gasto')).length})
              </option>
            </select>
          </div>

          {/* Desplegable de Subtipo */}
          <div className="accounting-select-wrap">
            <label htmlFor="filter-sub-type">Subtipo:</label>
            <select
              id="filter-sub-type"
              className="accounting-filter-select"
              value={subTypeFilter}
              onChange={(e) => setSubTypeFilter(e.target.value)}
            >
              <option value="Todos">Todos los subtipos</option>
              {availableSubTypes.map((st) => {
                const count = accounts.filter((a) => a.type === st).length
                return (
                  <option key={st} value={st}>
                    {st} ({count})
                  </option>
                )
              })}
            </select>
          </div>

          {/* Desplegable de Naturaleza */}
          <div className="accounting-select-wrap">
            <label htmlFor="filter-nature">Naturaleza:</label>
            <select
              id="filter-nature"
              className="accounting-filter-select"
              value={natureFilter}
              onChange={(e) => setNatureFilter(e.target.value)}
            >
              <option value="Todas">Todas</option>
              <option value="Deudora">
                Deudora ({accounts.filter((a) => a.nature === 'Deudora').length})
              </option>
              <option value="Acreedora">
                Acreedora ({accounts.filter((a) => a.nature === 'Acreedora').length})
              </option>
            </select>
          </div>

          {/* Desplegable de Estado */}
          <div className="accounting-select-wrap">
            <label htmlFor="filter-status">Estado:</label>
            <select
              id="filter-status"
              className="accounting-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="Todos">Todos</option>
              <option value="Activa">
                Activa ({accounts.filter((a) => a.status === 'Activa').length})
              </option>
              <option value="Inactiva">
                Inactiva ({accounts.filter((a) => a.status === 'Inactiva').length})
              </option>
            </select>
          </div>

          {/* Botón para restablecer filtros */}
          {hasActiveFilters && (
            <button
              className="accounting-reset-btn"
              onClick={handleResetFilters}
              title="Restablecer todos los filtros aplicados"
            >
              <RotateCcw size={12} /> Limpiar filtros
            </button>
          )}
        </div>

        <div className="accounting-filters-right">
          <span className="accounting-counter-badge">
            Mostrando <strong>{filteredAccounts.length}</strong> de {accounts.length} cuentas
          </span>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="table-wrap ops-table-wrap">
        <table className="data-table ops-data-table">
          <thead>
            <tr>
              <th style={{ width: '130px' }}>CÓDIGO</th>
              <th>NOMBRE DE LA CUENTA</th>
              <th>TIPO</th>
              <th>NATURALEZA</th>
              <th style={{ textAlign: 'right' }}>SALDO ACTUAL</th>
              <th>ESTADO</th>
              <th style={{ textAlign: 'right', width: '95px' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-cell">
                  {searchQuery.trim() ? (
                    <div style={{ padding: '14px 0' }}>
                      <p style={{ margin: '0 0 6px', fontWeight: 600 }}>
                        No se encontraron cuentas contables que coincidan con «{searchQuery.trim()}».
                      </p>
                      <button
                        type="button"
                        className="button button-secondary"
                        style={{ minHeight: '26px', padding: '0 10px', fontSize: '9px', display: 'inline-flex' }}
                        onClick={() => setSearchQuery('')}
                      >
                        Limpiar búsqueda
                      </button>
                    </div>
                  ) : (
                    'No se encontraron cuentas contables con los criterios seleccionados.'
                  )}
                </td>
              </tr>
            ) : (
              filteredAccounts.map((acc) => (
                <tr key={acc.id}>
                  <td>
                    <span className="accounting-code-badge">{acc.code}</span>
                  </td>
                  <td>
                    <div className="prod-cell">
                      <strong>{acc.name}</strong>
                      {acc.description && <small>{acc.description}</small>}
                    </div>
                  </td>
                  <td>
                    <span className={`movement-type-badge ${getTypeBadgeClass(acc.type)}`}>
                      {acc.type}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`nature-badge ${
                        acc.nature === 'Deudora' ? 'nature-debit' : 'nature-credit'
                      }`}
                    >
                      <Scale size={11} /> {acc.nature}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }} className="money-cell">
                    <strong>{money(acc.balance)}</strong>
                  </td>
                  <td>
                    {acc.status === 'Activa' ? (
                      <span className="stock-ok-badge">
                        <CheckCircle2 size={11} /> Activa
                      </span>
                    ) : (
                      <span className="stock-alert-badge">
                        <AlertCircle size={11} /> Inactiva
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="po-actions-row">
                      <button
                        type="button"
                        className="button-icon-action"
                        title={`Editar cuenta [${acc.code}] ${acc.name}`}
                        onClick={() => handleOpenEditModal(acc)}
                      >
                        <Pencil size={12} /> Editar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Agregar Cuenta Contable */}
      {isNewAccountModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsNewAccountModalOpen(false)
          }}
        >
          <section className="create-modal" role="dialog" aria-modal="true">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">FINANZAS · CATÁLOGO DE CUENTAS</div>
                <h2>Agregar cuenta contable</h2>
                <p>Registra una nueva cuenta en la estructura del plan de cuentas de la organización.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setIsNewAccountModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAccount}>
              <div className="form-grid">
                <label className="form-field">
                  <span>Código de la cuenta *</span>
                  <input
                    required
                    autoFocus
                    placeholder="Ej. 1003-001 o 2002-001"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </label>

                <label className="form-field">
                  <span>Tipo de cuenta *</span>
                  <select
                    required
                    value={type}
                    onChange={(e) => handleTypeChange(e.target.value as AccountType)}
                  >
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="form-field">
                <span>Nombre de la cuenta *</span>
                <input
                  required
                  placeholder="Ej. Inversiones temporales en valores gubernamentales"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>

              <div className="form-grid">
                <label className="form-field">
                  <span>Naturaleza de la cuenta *</span>
                  <select
                    required
                    value={nature}
                    onChange={(e) => setNature(e.target.value as 'Deudora' | 'Acreedora')}
                  >
                    <option value="Deudora">Deudora (Aumenta al Debe / Activo y Gasto)</option>
                    <option value="Acreedora">Acreedora (Aumenta al Haber / Pasivo, Capital e Ingreso)</option>
                  </select>
                </label>

                <label className="form-field">
                  <span>Saldo inicial (MXN)</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={balance}
                    onChange={(e) => setBalance(Math.max(0, parseFloat(e.target.value) || 0))}
                  />
                </label>
              </div>

              <label className="form-field">
                <span>Descripción o uso contable</span>
                <input
                  placeholder="Ej. Registro de rendimientos e instrumentos de liquidez diaria"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>

              <div className="create-modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsNewAccountModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="button button-primary">
                  <Plus size={14} /> Guardar cuenta contable
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal: Editar Cuenta Contable */}
      {editingAccount && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEditingAccount(null)
          }}
        >
          <section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">FINANZAS · CATÁLOGO DE CUENTAS</div>
                <h2 id="edit-modal-title">Editar cuenta contable</h2>
                <p>
                  Modifica los datos generales, clasificación, naturaleza, saldo o estado de la cuenta.
                </p>
              </div>
              <button
                className="icon-button"
                onClick={() => setEditingAccount(null)}
                aria-label="Cerrar modal de edición"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateAccount}>
              <div className="form-grid">
                <label className="form-field">
                  <span>Código de la cuenta *</span>
                  <input
                    required
                    autoFocus
                    placeholder="Ej. 1003-001 o 2002-001"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                  />
                </label>

                <label className="form-field">
                  <span>Tipo de cuenta *</span>
                  <select
                    required
                    value={editType}
                    onChange={(e) => handleEditTypeChange(e.target.value as AccountType)}
                  >
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="form-field">
                <span>Nombre de la cuenta *</span>
                <input
                  required
                  placeholder="Ej. Nombre formal de la cuenta contable"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </label>

              <div className="form-grid">
                <label className="form-field">
                  <span>Naturaleza de la cuenta *</span>
                  <select
                    required
                    value={editNature}
                    onChange={(e) => setEditNature(e.target.value as 'Deudora' | 'Acreedora')}
                  >
                    <option value="Deudora">Deudora (Aumenta al Debe / Activo y Gasto)</option>
                    <option value="Acreedora">Acreedora (Aumenta al Haber / Pasivo, Capital e Ingreso)</option>
                  </select>
                </label>

                <label className="form-field">
                  <span>Saldo actual (MXN)</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={editBalance}
                    onChange={(e) => setEditBalance(Math.max(0, parseFloat(e.target.value) || 0))}
                  />
                </label>
              </div>

              <div className="form-grid">
                <label className="form-field">
                  <span>Estado de la cuenta *</span>
                  <select
                    required
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as 'Activa' | 'Inactiva')}
                  >
                    <option value="Activa">Activa (Disponible para movimientos y pólizas)</option>
                    <option value="Inactiva">Inactiva (Inhabilitada temporalmente)</option>
                  </select>
                </label>

                <label className="form-field">
                  <span>Descripción o notas contables</span>
                  <input
                    placeholder="Uso contable, normatividad o destino de la cuenta"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                </label>
              </div>

              <div className="create-modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setEditingAccount(null)}
                >
                  Cancelar
                </button>
                <button type="submit" className="button button-primary">
                  <Check size={14} /> Guardar cambios
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
