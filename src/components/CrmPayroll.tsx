import { useState, useMemo, type FormEvent } from 'react'
import {
  BadgeCheck,
  Banknote,
  Calculator,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  Landmark,
  Plus,
  RefreshCw,
  Search,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import type { EmployeeRecord } from '../data/employees'
import type { BankAccount } from '../data/finance'
import {
  automatePayrollCalculation,
  calculateEmployeePayrollReceipt,
  calculatePeriodDays,
  type PayrollFrequency,
  type PayrollRunRecord,
  type PayrollStatus,
} from '../data/payroll'
import { useToast } from './Toast'

interface CrmPayrollProps {
  employees: EmployeeRecord[]
  payrollRuns: PayrollRunRecord[]
  bankAccounts: BankAccount[]
  onAddPayrollRun: (run: PayrollRunRecord) => void
  onUpdatePayrollRun: (run: PayrollRunRecord) => void
  onPayPayrollRun?: (run: PayrollRunRecord) => void
  onOpenEbpWizard?: (run: PayrollRunRecord) => void
}

interface DraftReceiptRow {
  included: boolean
  employee: EmployeeRecord
  daysWorked: number
  bonuses: number
  otherDeductions: number
}

const money = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value)

export function CrmPayroll({
  employees,
  payrollRuns,
  bankAccounts,
  onAddPayrollRun,
  onUpdatePayrollRun,
  onPayPayrollRun,
  onOpenEbpWizard,
}: CrmPayrollProps) {
  const toast = useToast()

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [frequencyFilter, setFrequencyFilter] = useState<'Todas' | PayrollFrequency>('Todas')
  const [statusFilter, setStatusFilter] = useState<'Todos' | PayrollStatus>('Todos')

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [detailRun, setDetailRun] = useState<PayrollRunRecord | null>(null)

  // New Payroll Run Form State
  const [frequency, setFrequency] = useState<PayrollFrequency>('Quincenal')
  const [periodLabel, setPeriodLabel] = useState('2da Quincena Noviembre 2026')
  const [startDate, setStartDate] = useState('2026-11-16')
  const [endDate, setEndDate] = useState('2026-11-30')
  const [paymentDate, setPaymentDate] = useState('2026-11-30')
  const [bankAccountId, setBankAccountId] = useState<string>(
    () => bankAccounts[0]?.id || ''
  )
  const [initialStatus, setInitialStatus] = useState<PayrollStatus>('Pagada')
  const [notes, setNotes] = useState('')
  const [includeAllActive, setIncludeAllActive] = useState(false)
  const [applyAutomaticTaxes, setApplyAutomaticTaxes] = useState(true)
  const [draftRows, setDraftRows] = useState<DraftReceiptRow[]>([])

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status === 'Activo'),
    [employees]
  )

  // KPI metrics
  const totalPaidAmount = useMemo(
    () =>
      payrollRuns
        .filter((r) => r.status === 'Pagada')
        .reduce((sum, r) => sum + r.totalNet, 0),
    [payrollRuns]
  )

  const latestPaidRun = useMemo(
    () => payrollRuns.find((r) => r.status === 'Pagada') || null,
    [payrollRuns]
  )

  const pendingRunsCount = useMemo(
    () => payrollRuns.filter((r) => r.status !== 'Pagada').length,
    [payrollRuns]
  )

  const filteredRuns = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return payrollRuns.filter((run) => {
      const matchFreq = frequencyFilter === 'Todas' || run.frequency === frequencyFilter
      const matchStatus = statusFilter === 'Todos' || run.status === statusFilter
      const matchQuery =
        !q ||
        run.folio.toLowerCase().includes(q) ||
        run.periodLabel.toLowerCase().includes(q) ||
        run.paymentMethod.toLowerCase().includes(q) ||
        run.receipts.some((rec) => rec.employeeName.toLowerCase().includes(q))
      return matchFreq && matchStatus && matchQuery
    })
  }, [payrollRuns, searchQuery, frequencyFilter, statusFilter])

  const buildDraftRowsForFrequency = (
    freq: PayrollFrequency,
    forceAll: boolean,
    periodStart: string = startDate,
    periodEnd: string = endDate
  ) => {
    const periodDays = calculatePeriodDays(periodStart, periodEnd, freq)
    return activeEmployees.map((emp) => ({
      included:
        forceAll || freq === 'Extraordinaria'
          ? true
          : emp.paymentFrequency === freq,
      employee: emp,
      daysWorked: periodDays,
      bonuses: 0,
      otherDeductions: 0,
    }))
  }

  const openNewPayrollModal = () => {
    const defaultFreq: PayrollFrequency = 'Quincenal'
    const defaultStart = '2026-11-16'
    const defaultEnd = '2026-11-30'
    setFrequency(defaultFreq)
    setPeriodLabel('2da Quincena Noviembre 2026')
    setStartDate(defaultStart)
    setEndDate(defaultEnd)
    setPaymentDate(defaultEnd)
    setBankAccountId(bankAccounts[0]?.id || '')
    setInitialStatus('Pagada')
    setNotes('')
    setIncludeAllActive(false)
    setApplyAutomaticTaxes(true)
    setDraftRows(buildDraftRowsForFrequency(defaultFreq, false, defaultStart, defaultEnd))
    setIsNewModalOpen(true)
  }

  const handleFrequencyChange = (nextFreq: PayrollFrequency) => {
    setFrequency(nextFreq)
    let nextStart = startDate
    let nextEnd = endDate
    if (nextFreq === 'Quincenal') {
      setPeriodLabel('2da Quincena Noviembre 2026')
      nextStart = '2026-11-16'
      nextEnd = '2026-11-30'
    } else if (nextFreq === 'Semanal') {
      setPeriodLabel('Semana 46 · Noviembre 2026')
      nextStart = '2026-11-09'
      nextEnd = '2026-11-15'
    } else if (nextFreq === 'Mensual') {
      setPeriodLabel('Mensual Noviembre 2026')
      nextStart = '2026-11-01'
      nextEnd = '2026-11-30'
    } else {
      setPeriodLabel('Nómina Extraordinaria / Bonos Noviembre 2026')
      nextStart = '2026-11-01'
      nextEnd = '2026-11-15'
    }
    setStartDate(nextStart)
    setEndDate(nextEnd)
    setPaymentDate(nextEnd)
    setDraftRows(buildDraftRowsForFrequency(nextFreq, includeAllActive, nextStart, nextEnd))
  }

  const handleSyncDaysFromRange = (nextStart = startDate, nextEnd = endDate) => {
    const syncedDays = calculatePeriodDays(nextStart, nextEnd, frequency)
    setDraftRows((prev) =>
      prev.map((row) => ({
        ...row,
        daysWorked: syncedDays,
      }))
    )
    toast.info(
      `Se recalcularon salarios y retenciones para ${syncedDays} días laborados.`,
      'Cálculo actualizado'
    )
  }

  const handleToggleIncludeAll = (checked: boolean) => {
    setIncludeAllActive(checked)
    setDraftRows((prev) =>
      prev.map((row) => ({
        ...row,
        included:
          checked || frequency === 'Extraordinaria'
            ? true
            : row.employee.paymentFrequency === frequency,
      }))
    )
  }

  const updateDraftRow = (
    employeeId: string,
    patch: Partial<Pick<DraftReceiptRow, 'included' | 'daysWorked' | 'bonuses' | 'otherDeductions'>>
  ) => {
    setDraftRows((prev) =>
      prev.map((r) => (r.employee.id === employeeId ? { ...r, ...patch } : r))
    )
  }

  // Automated payroll calculation from employee profiles, days worked & deductions
  const automatedCalculation = useMemo(() => {
    const overrides = Object.fromEntries(
      draftRows.map((row) => [
        row.employee.id,
        {
          included: row.included,
          daysWorked: row.daysWorked,
          bonuses: row.bonuses,
          otherDeductions: row.otherDeductions,
        },
      ])
    )
    return automatePayrollCalculation({
      employees,
      frequency,
      startDate,
      endDate,
      includeAllActive,
      applyTaxes: applyAutomaticTaxes,
      overrides,
    })
  }, [employees, draftRows, frequency, startDate, endDate, includeAllActive, applyAutomaticTaxes])

  const computedDraftLines = automatedCalculation.receipts
  const draftTotals = {
    gross: automatedCalculation.totals.totalGross,
    bonuses: automatedCalculation.totals.totalBonuses,
    deductions: automatedCalculation.totals.totalDeductions,
    net: automatedCalculation.totals.totalNet,
  }

  const handleSubmitNewPayroll = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!periodLabel.trim()) {
      toast.warning('Indica el nombre o descripción del periodo de nómina.', 'Periodo requerido')
      return
    }
    if (computedDraftLines.length === 0) {
      toast.warning('Selecciona al menos un empleado para generar el pago de nómina.', 'Sin colaboradores')
      return
    }

    const prefix =
      frequency === 'Quincenal'
        ? 'Q'
        : frequency === 'Semanal'
        ? 'S'
        : frequency === 'Mensual'
        ? 'M'
        : 'EXT'
    const folio = `NOM-2026-${prefix}${String(payrollRuns.length + 22).padStart(2, '0')}`
    const bankObj = bankAccounts.find((b) => b.id === bankAccountId)
    const paymentMethodLabel = bankObj
      ? `Transferencia SPEI · ${bankObj.bankName} ${bankObj.accountNumber}`
      : 'Transferencia SPEI'

    const newRun: PayrollRunRecord = {
      id: `pay_${Date.now()}`,
      folio,
      periodLabel: periodLabel.trim(),
      frequency,
      startDate,
      endDate,
      paymentDate,
      status: initialStatus,
      paymentMethod: paymentMethodLabel,
      bankAccountId: bankObj?.id,
      employeesCount: computedDraftLines.length,
      totalGross: draftTotals.gross,
      totalBonuses: draftTotals.bonuses,
      totalDeductions: draftTotals.deductions,
      totalNet: draftTotals.net,
      notes: notes.trim() || undefined,
      receipts: computedDraftLines,
    }

    onAddPayrollRun(newRun)
    if (newRun.status === 'Pagada') {
      onPayPayrollRun?.(newRun)
    }

    toast.success(
      newRun.status === 'Pagada'
        ? `Nómina ${newRun.folio} registrada y dispersada por ${money(newRun.totalNet)} (${newRun.employeesCount} empleados).`
        : `Periodo ${newRun.folio} guardado como ${newRun.status} por ${money(newRun.totalNet)}.`,
      newRun.status === 'Pagada' ? 'Pago de nómina realizado' : 'Periodo creado'
    )
    setIsNewModalOpen(false)
  }

  const handleMarkAsPaid = (run: PayrollRunRecord) => {
    if (run.status === 'Pagada') return
    const updated: PayrollRunRecord = {
      ...run,
      status: 'Pagada',
      paymentDate: new Date().toISOString().split('T')[0],
    }
    onUpdatePayrollRun(updated)
    onPayPayrollRun?.(updated)
    if (detailRun?.id === run.id) {
      setDetailRun(updated)
    }
    toast.success(
      `Se registró el pago de la nómina ${run.folio} por ${money(run.totalNet)}.`,
      'Nómina dispersada'
    )
  }

  const handleExportSummaryCSV = () => {
    if (filteredRuns.length === 0) {
      toast.warning('No hay periodos de nómina visibles para exportar.', 'Sin registros')
      return
    }
    const esc = (v: string | number | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const headers = [
      'FOLIO',
      'PERIODO',
      'PERIODICIDAD',
      'INICIO',
      'FIN',
      'FECHA DE PAGO',
      'EMPLEADOS',
      'SUELDO BRUTO',
      'BONOS',
      'DEDUCCIONES (ISR/IMSS)',
      'TOTAL NETO PAGADO',
      'METODO / CUENTA',
      'ESTADO',
    ]
    const rows = filteredRuns.map((r) =>
      [
        esc(r.folio),
        esc(r.periodLabel),
        esc(r.frequency),
        esc(r.startDate),
        esc(r.endDate),
        esc(r.paymentDate),
        esc(r.employeesCount),
        esc(r.totalGross.toFixed(2)),
        esc(r.totalBonuses.toFixed(2)),
        esc(r.totalDeductions.toFixed(2)),
        esc(r.totalNet.toFixed(2)),
        esc(r.paymentMethod),
        esc(r.status),
      ].join(',')
    )
    const csv = '\uFEFF' + [headers.map(esc).join(','), ...rows].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `nomina_periodos_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success(`Se exportaron ${filteredRuns.length} periodos de nómina a CSV.`, 'Descarga completa')
  }

  const handleExportDispersionCSV = (run: PayrollRunRecord) => {
    const esc = (v: string | number | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const headers = [
      'FOLIO NOMINA',
      'CODIGO EMPLEADO',
      'NOMBRE',
      'PUESTO',
      'DEPARTAMENTO',
      'BANCO',
      'CLABE',
      'DIAS',
      'SUELDO BRUTO',
      'BONOS',
      'ISR',
      'IMSS',
      'OTRAS DEDUCCIONES',
      'NETO A PAGAR',
    ]
    const rows = run.receipts.map((rec) =>
      [
        esc(run.folio),
        esc(rec.employeeCode),
        esc(rec.employeeName),
        esc(rec.roleTitle),
        esc(rec.departmentName),
        esc(rec.bankName || '—'),
        esc(rec.clabe || '—'),
        esc(rec.daysWorked),
        esc(rec.baseGross.toFixed(2)),
        esc(rec.bonuses.toFixed(2)),
        esc(rec.isrDeduction.toFixed(2)),
        esc(rec.imssDeduction.toFixed(2)),
        esc(rec.otherDeductions.toFixed(2)),
        esc(rec.netPay.toFixed(2)),
      ].join(',')
    )
    const csv = '\uFEFF' + [headers.map(esc).join(','), ...rows].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `dispersion_${run.folio.toLowerCase()}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success(`Layout de dispersión ${run.folio} descargado.`, 'Archivo generado')
  }

  const getStatusClass = (st: PayrollStatus) => {
    if (st === 'Pagada') return 'status-activo'
    if (st === 'Aprobada') return 'status-prospecto'
    return 'status-inactivo'
  }

  return (
    <div className="crm-employees-container">
      {/* Header */}
      <div className="crm-section-heading">
        <div>
          <div className="panel-kicker">COMPENSACIÓN Y DISPERSIÓN</div>
          <h2>Nómina de empleados</h2>
          <p>
            Visualiza los pagos realizados, periodos de nómina y montos totales, o genera un nuevo pago para el equipo.
          </p>
        </div>
        <div className="crm-section-heading-actions">
          <button type="button" className="button button-secondary" onClick={handleExportSummaryCSV}>
            <Download size={14} /> Exportar CSV
          </button>
          <button type="button" className="button button-primary" onClick={openNewPayrollModal}>
            <Plus size={15} /> Nuevo pago de nómina
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="emp-kpi-grid">
        <article className="emp-kpi-card">
          <span className="kpi-icon icon-green">
            <Banknote size={17} />
          </span>
          <div>
            <strong>{money(totalPaidAmount)}</strong>
            <small>Total pagado en nóminas</small>
          </div>
        </article>
        <article className="emp-kpi-card">
          <span className="kpi-icon">
            <CalendarDays size={17} />
          </span>
          <div>
            <strong>{payrollRuns.length}</strong>
            <small>
              Periodos registrados ({pendingRunsCount} pendientes)
            </small>
          </div>
        </article>
        <article className="emp-kpi-card">
          <span className="kpi-icon icon-sand">
            <Wallet size={17} />
          </span>
          <div>
            <strong>{latestPaidRun ? money(latestPaidRun.totalNet) : money(0)}</strong>
            <small>
              {latestPaidRun
                ? `Último pago · ${latestPaidRun.folio}`
                : 'Sin pagos aplicados'}
            </small>
          </div>
        </article>
        <article className="emp-kpi-card">
          <span className="kpi-icon icon-lilac">
            <Users size={17} />
          </span>
          <div>
            <strong>{activeEmployees.length}</strong>
            <small>Colaboradores activos en plantilla</small>
          </div>
        </article>
      </div>

      {/* Filters Toolbar */}
      <div className="clients-toolbar emp-toolbar">
        <label className="clients-search">
          <Search size={15} />
          <input
            aria-label="Buscar periodos de nómina"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por folio, periodo, empleado o cuenta bancaria..."
          />
        </label>
        <select
          aria-label="Filtrar por periodicidad"
          value={frequencyFilter}
          onChange={(e) => setFrequencyFilter(e.target.value as 'Todas' | PayrollFrequency)}
        >
          <option value="Todas">Todas las periodicidades</option>
          <option value="Quincenal">Quincenal</option>
          <option value="Semanal">Semanal</option>
          <option value="Mensual">Mensual</option>
          <option value="Extraordinaria">Extraordinaria</option>
        </select>
        <select
          aria-label="Filtrar por estado de nómina"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'Todos' | PayrollStatus)}
        >
          <option value="Todos">Todos los estados</option>
          <option value="Pagada">Pagada</option>
          <option value="Aprobada">Aprobada</option>
          <option value="Borrador">Borrador</option>
        </select>
      </div>

      <div className="clients-summary">
        <span>
          <strong>{filteredRuns.length}</strong> de {payrollRuns.length} periodos de nómina visibles
        </span>
        <span>Cálculo integrado con plantilla de Empleados y cuentas de Finanzas</span>
      </div>

      {/* Main Payroll Runs Table */}
      <div className="clients-table-wrap">
        <table className="clients-table">
          <thead>
            <tr>
              <th>FOLIO / TIPO</th>
              <th>PERIODO DE NÓMINA</th>
              <th>FECHA Y DISPERSIÓN</th>
              <th style={{ textAlign: 'center' }}>EMPLEADOS</th>
              <th style={{ textAlign: 'right' }}>PERCEPCIONES / DED.</th>
              <th style={{ textAlign: 'right' }}>MONTO TOTAL NETO</th>
              <th>ESTADO</th>
              <th style={{ textAlign: 'right' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {filteredRuns.map((run) => (
              <tr key={run.id}>
                <td>
                  <div className="payroll-folio-cell">
                    <strong>{run.folio}</strong>
                    <span className="emp-code-pill">{run.frequency}</span>
                  </div>
                </td>
                <td>
                  <div className="emp-role-cell">
                    <strong>{run.periodLabel}</strong>
                    <small>
                      <CalendarDays size={10} /> {run.startDate} al {run.endDate}
                    </small>
                  </div>
                </td>
                <td>
                  <div className="emp-loc-cell">
                    <span style={{ fontWeight: 600, fontSize: 10 }}>
                      <Clock size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                      {run.paymentDate}
                    </span>
                    <small>{run.paymentMethod}</small>
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span className="payroll-emp-count-pill">
                    <Users size={11} /> {run.employeesCount}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div className="emp-salary-cell" style={{ alignItems: 'flex-end' }}>
                    <span>Bruto: {money(run.totalGross + run.totalBonuses)}</span>
                    <small style={{ color: '#b44f3e' }}>
                      Ret.: -{money(run.totalDeductions)}
                    </small>
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div className="payroll-net-total">
                    <strong>{money(run.totalNet)}</strong>
                    <small>MXN neto</small>
                  </div>
                </td>
                <td>
                  <span className={`client-status ${getStatusClass(run.status)}`}>
                    <i />
                    {run.status}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div className="emp-row-actions">
                    {run.status !== 'Pagada' && (
                      <button
                        type="button"
                        className="button-icon-action action-receive"
                        onClick={() => handleMarkAsPaid(run)}
                        title="Registrar pago y dispersar nómina"
                      >
                        <CheckCircle2 size={12} /> Pagar
                      </button>
                    )}
                    {onOpenEbpWizard && (
                      <button
                        type="button"
                        className="button-icon-action"
                        onClick={() => onOpenEbpWizard(run)}
                        title="Generar archivo bancario (.txt, .csv, .xml) con Pack EBP"
                      >
                        <Landmark size={12} /> Layout EBP
                      </button>
                    )}
                    <button
                      type="button"
                      className="button-icon-action"
                      onClick={() => setDetailRun(run)}
                      title="Ver recibos por empleado y desglose del periodo"
                    >
                      <Eye size={12} /> Detalle
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredRuns.length === 0 && (
          <div className="clients-empty">
            <Banknote size={20} />
            <strong>No hay periodos de nómina registrados</strong>
            <span>Ajusta los filtros o haz clic en "Nuevo pago de nómina" para generar uno.</span>
          </div>
        )}
      </div>

      {/* Modal: Nuevo pago de nómina */}
      {isNewModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsNewModalOpen(false)
          }}
        >
          <section className="create-modal modal-wide payroll-modal-xl" role="dialog" aria-modal="true">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">GENERACIÓN Y PAGO DE NÓMINA</div>
                <h2>Nuevo pago de nómina</h2>
                <p>
                  Configura el periodo de pago, ajusta bonos o deducciones por colaborador y registra la dispersión.
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Cerrar"
                onClick={() => setIsNewModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitNewPayroll}>
              <div className="form-grid-3">
                <label className="form-field">
                  <span>Periodicidad *</span>
                  <select
                    value={frequency}
                    onChange={(e) => handleFrequencyChange(e.target.value as PayrollFrequency)}
                  >
                    <option value="Quincenal">Quincenal (15 días)</option>
                    <option value="Semanal">Semanal (7 días)</option>
                    <option value="Mensual">Mensual (30 días)</option>
                    <option value="Extraordinaria">Extraordinaria (Bonos / Aguinaldo)</option>
                  </select>
                </label>

                <label className="form-field" style={{ gridColumn: 'span 2' }}>
                  <span>Nombre del periodo de nómina *</span>
                  <input
                    required
                    autoFocus
                    value={periodLabel}
                    onChange={(e) => setPeriodLabel(e.target.value)}
                    placeholder="Ej. 2da Quincena Noviembre 2026"
                  />
                </label>
              </div>

              <div className="form-grid-4">
                <label className="form-field">
                  <span>Inicio del periodo</span>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => {
                      const next = e.target.value
                      setStartDate(next)
                      const nextDays = calculatePeriodDays(next, endDate, frequency)
                      setDraftRows((prev) =>
                        prev.map((row) => ({ ...row, daysWorked: nextDays }))
                      )
                    }}
                  />
                </label>
                <label className="form-field">
                  <span>Fin del periodo</span>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => {
                      const next = e.target.value
                      setEndDate(next)
                      const nextDays = calculatePeriodDays(startDate, next, frequency)
                      setDraftRows((prev) =>
                        prev.map((row) => ({ ...row, daysWorked: nextDays }))
                      )
                    }}
                  />
                </label>
                <label className="form-field">
                  <span>Fecha de pago</span>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </label>
                <label className="form-field">
                  <span>Estado del registro</span>
                  <select
                    value={initialStatus}
                    onChange={(e) => setInitialStatus(e.target.value as PayrollStatus)}
                  >
                    <option value="Pagada">Pagada (Dispersión inmediata)</option>
                    <option value="Aprobada">Aprobada (Pendiente de dispersar)</option>
                    <option value="Borrador">Borrador</option>
                  </select>
                </label>
              </div>

              <div className="form-grid">
                <label className="form-field">
                  <span>Cuenta bancaria de dispersión</span>
                  <select
                    value={bankAccountId}
                    onChange={(e) => setBankAccountId(e.target.value)}
                  >
                    {bankAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.bankName} ({acc.accountNumber}) · Saldo: {money(acc.balance)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Notas del periodo</span>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej. Incluye bonos de productividad comercial"
                  />
                </label>
              </div>

              {/* Employee lines builder */}
              <div className="po-items-builder-box" style={{ marginTop: 10 }}>
                <div className="payroll-builder-head">
                  <div className="po-builder-title" style={{ margin: 0 }}>
                    <Calculator size={14} /> Cálculo automático desde fichas ({computedDraftLines.length} empleados · {automatedCalculation.periodDays} días)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <label className="low-stock-toggle" style={{ fontSize: 9 }}>
                      <input
                        type="checkbox"
                        checked={applyAutomaticTaxes}
                        onChange={(e) => setApplyAutomaticTaxes(e.target.checked)}
                      />
                      <span>Calcular ISR / IMSS</span>
                    </label>
                    <label className="low-stock-toggle" style={{ fontSize: 9 }}>
                      <input
                        type="checkbox"
                        checked={includeAllActive}
                        onChange={(e) => handleToggleIncludeAll(e.target.checked)}
                      />
                      <span>Incluir todos los activos</span>
                    </label>
                    <button
                      type="button"
                      className="button-icon-action"
                      onClick={() => handleSyncDaysFromRange()}
                      title="Recalcular días laborados según el rango de fechas del periodo"
                    >
                      <RefreshCw size={11} /> Recalcular ({automatedCalculation.periodDays}d)
                    </button>
                  </div>
                </div>

                <div className="payroll-draft-table-wrap">
                  <table className="po-builder-table">
                    <thead>
                      <tr>
                        <th style={{ width: 28 }}>INC.</th>
                        <th>COLABORADOR / SALARIO FICHA</th>
                        <th style={{ textAlign: 'center', width: 68 }}>DÍAS</th>
                        <th style={{ textAlign: 'right' }}>SUELDO PROP.</th>
                        <th style={{ textAlign: 'right', width: 92 }}>BONOS</th>
                        <th style={{ textAlign: 'right', width: 92 }}>OTRAS DED.</th>
                        <th style={{ textAlign: 'right' }}>ISR + IMSS</th>
                        <th style={{ textAlign: 'right' }}>NETO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {draftRows.map((row) => {
                        const calc = calculateEmployeePayrollReceipt(row.employee, {
                          frequency,
                          daysWorked: row.daysWorked,
                          bonuses: row.bonuses,
                          otherDeductions: row.otherDeductions,
                          applyTaxes: applyAutomaticTaxes,
                        })
                        const dailySalary = Math.round(row.employee.baseSalaryMonthly / 30)
                        return (
                          <tr
                            key={row.employee.id}
                            className={!row.included ? 'payroll-row-muted' : ''}
                          >
                            <td>
                              <input
                                type="checkbox"
                                checked={row.included}
                                onChange={(e) =>
                                  updateDraftRow(row.employee.id, {
                                    included: e.target.checked,
                                  })
                                }
                              />
                            </td>
                            <td>
                              <div>
                                <strong>{row.employee.fullName}</strong>
                                <div style={{ fontSize: 8, color: '#7b8a81' }}>
                                  {row.employee.employeeCode} · Base {money(row.employee.baseSalaryMonthly)}/mes ({money(dailySalary)}/día)
                                </div>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="number"
                                min={0}
                                max={31}
                                disabled={!row.included}
                                className="payroll-mini-num-input"
                                value={row.daysWorked}
                                onChange={(e) =>
                                  updateDraftRow(row.employee.id, {
                                    daysWorked: Math.max(0, Math.min(31, parseInt(e.target.value) || 0)),
                                  })
                                }
                              />
                            </td>
                            <td style={{ textAlign: 'right' }}>{money(calc.baseGross)}</td>
                            <td style={{ textAlign: 'right' }}>
                              <input
                                type="number"
                                min={0}
                                step={100}
                                disabled={!row.included}
                                className="payroll-mini-num-input"
                                value={row.bonuses}
                                onChange={(e) =>
                                  updateDraftRow(row.employee.id, {
                                    bonuses: Math.max(0, Number(e.target.value) || 0),
                                  })
                                }
                              />
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <input
                                type="number"
                                min={0}
                                step={50}
                                disabled={!row.included}
                                className="payroll-mini-num-input"
                                value={row.otherDeductions}
                                onChange={(e) =>
                                  updateDraftRow(row.employee.id, {
                                    otherDeductions: Math.max(0, Number(e.target.value) || 0),
                                  })
                                }
                              />
                            </td>
                            <td style={{ textAlign: 'right', color: '#b44f3e' }}>
                              -{money(calc.isrDeduction + calc.imssDeduction)}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <strong>{row.included ? money(calc.netPay) : '—'}</strong>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Live Totals Bar */}
                <div className="payroll-totals-strip">
                  <div>
                    <small>Sueldo bruto + bonos</small>
                    <strong>{money(draftTotals.gross + draftTotals.bonuses)}</strong>
                  </div>
                  <div>
                    <small>ISR + IMSS + Otras ded.</small>
                    <strong style={{ color: '#b44f3e' }}>-{money(draftTotals.deductions)}</strong>
                  </div>
                  <div>
                    <small>Total neto a dispersar</small>
                    <strong className="payroll-grand-net">{money(draftTotals.net)}</strong>
                  </div>
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
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={computedDraftLines.length === 0}
                >
                  <BadgeCheck size={14} />{' '}
                  {initialStatus === 'Pagada'
                    ? `Confirmar y pagar ${money(draftTotals.net)}`
                    : `Guardar periodo (${money(draftTotals.net)})`}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal: Detalle del Periodo de Nómina */}
      {detailRun && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDetailRun(null)
          }}
        >
          <section className="create-modal modal-wide payroll-modal-xl" role="dialog" aria-modal="true">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">RECIBOS Y DESGLOSE DE NÓMINA · {detailRun.frequency.toUpperCase()}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h2 style={{ margin: 0 }}>{detailRun.folio}</h2>
                  <span className={`client-status ${getStatusClass(detailRun.status)}`}>
                    <i />
                    {detailRun.status}
                  </span>
                </div>
                <p>
                  {detailRun.periodLabel} · Del {detailRun.startDate} al {detailRun.endDate} · Fecha pago: {detailRun.paymentDate}
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Cerrar detalle"
                onClick={() => setDetailRun(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="po-detail-summary-grid" style={{ marginBottom: 14 }}>
              <div className="po-detail-card">
                <span>Percepciones brutas</span>
                <strong>{money(detailRun.totalGross + detailRun.totalBonuses)}</strong>
                <small>
                  Base: {money(detailRun.totalGross)} · Bonos: {money(detailRun.totalBonuses)}
                </small>
              </div>
              <div className="po-detail-card">
                <span>Retenciones y deducciones</span>
                <strong style={{ color: '#b44f3e' }}>-{money(detailRun.totalDeductions)}</strong>
                <small>ISR, cuota IMSS y descuentos internos</small>
              </div>
              <div className="po-detail-card">
                <span>Total neto dispersado</span>
                <strong>{money(detailRun.totalNet)}</strong>
                <small>
                  {detailRun.employeesCount} colaboradores · {detailRun.paymentMethod}
                </small>
              </div>
            </div>

            <div className="table-wrap ops-table-wrap">
              <table className="data-table ops-data-table">
                <thead>
                  <tr>
                    <th>COLABORADOR</th>
                    <th>BANCO / CLABE</th>
                    <th style={{ textAlign: 'center' }}>DÍAS</th>
                    <th style={{ textAlign: 'right' }}>SUELDO BASE</th>
                    <th style={{ textAlign: 'right' }}>BONOS</th>
                    <th style={{ textAlign: 'right' }}>ISR + IMSS</th>
                    <th style={{ textAlign: 'right' }}>OTRAS DED.</th>
                    <th style={{ textAlign: 'right' }}>NETO PAGADO</th>
                  </tr>
                </thead>
                <tbody>
                  {detailRun.receipts.map((rec) => (
                    <tr key={rec.id}>
                      <td>
                        <div className="prod-cell">
                          <span className="sku-badge-small">{rec.employeeCode}</span>
                          <strong>{rec.employeeName}</strong>
                          <small>{rec.roleTitle}</small>
                        </div>
                      </td>
                      <td>
                        <div className="supplier-cell">
                          <strong>{rec.bankName || 'Sin banco'}</strong>
                          <small>{rec.clabe || 'Sin CLABE registrada'}</small>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>{rec.daysWorked}</td>
                      <td style={{ textAlign: 'right' }}>{money(rec.baseGross)}</td>
                      <td style={{ textAlign: 'right' }}>{money(rec.bonuses)}</td>
                      <td style={{ textAlign: 'right', color: '#b44f3e' }}>
                        -{money(rec.isrDeduction + rec.imssDeduction)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {rec.otherDeductions > 0 ? `-${money(rec.otherDeductions)}` : '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <strong>{money(rec.netPay)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {detailRun.notes && (
              <div className="po-notes-preview" style={{ marginTop: 10 }}>
                <strong>Notas del periodo:</strong> {detailRun.notes}
              </div>
            )}

            <div className="create-modal-actions" style={{ justifyContent: 'space-between', marginTop: 14 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => handleExportDispersionCSV(detailRun)}
                >
                  <FileSpreadsheet size={14} /> Descargar CSV simple
                </button>
                {onOpenEbpWizard && (
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => {
                      const run = detailRun
                      setDetailRun(null)
                      onOpenEbpWizard(run)
                    }}
                  >
                    <Landmark size={14} /> Generar archivo bancario (EBP)
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {detailRun.status !== 'Pagada' && (
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => handleMarkAsPaid(detailRun)}
                  >
                    <CheckCircle2 size={14} /> Confirmar pago ({money(detailRun.totalNet)})
                  </button>
                )}
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setDetailRun(null)}
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
