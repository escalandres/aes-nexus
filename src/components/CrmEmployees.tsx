import { useState, useMemo, type FormEvent } from 'react'
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  Download,
  Edit3,
  Eye,
  IdCard,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import type {
  ContractType,
  EmployeeRecord,
  EmployeeStatus,
  PaymentFrequency,
} from '../data/employees'
import {
  validateEbpFieldValue,
  type BankFormatPack,
} from '../data/ebp'
import type {
  DepartmentRecord,
  PhysicalLocationRecord,
} from './AdministrationSection'
import { useToast } from './Toast'

interface CrmEmployeesProps {
  employees: EmployeeRecord[]
  departments: DepartmentRecord[]
  locations: PhysicalLocationRecord[]
  installedPacks?: BankFormatPack[]
  onAddEmployee: (employee: EmployeeRecord) => void
  onUpdateEmployee: (employee: EmployeeRecord) => void
}

const money = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value)

const AVATAR_COLORS: EmployeeRecord['avatarColor'][] = [
  'sage',
  'blue',
  'peach',
  'lilac',
  'amber',
]

export function CrmEmployees({
  employees,
  departments,
  locations,
  installedPacks = [],
  onAddEmployee,
  onUpdateEmployee,
}: CrmEmployeesProps) {
  const toast = useToast()

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('Todos')
  const [locationFilter, setLocationFilter] = useState('Todos')
  const [statusFilter, setStatusFilter] = useState<'Todos' | EmployeeStatus>('Todos')

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [detailEmployee, setDetailEmployee] = useState<EmployeeRecord | null>(null)

  // Form fields
  const [employeeCode, setEmployeeCode] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [roleTitle, setRoleTitle] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [contractType, setContractType] = useState<ContractType>('Tiempo completo')
  const [hireDate, setHireDate] = useState(() => new Date().toISOString().split('T')[0])
  const [status, setStatus] = useState<EmployeeStatus>('Activo')
  const [rfc, setRfc] = useState('')
  const [curp, setCurp] = useState('')
  const [nss, setNss] = useState('')
  const [baseSalaryMonthly, setBaseSalaryMonthly] = useState('25000')
  const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency>('Quincenal')
  const [bankName, setBankName] = useState('BBVA México')
  const [clabe, setClabe] = useState('')
  const [bankPackValues, setBankPackValues] = useState<Record<string, Record<string, string>>>({})
  const [emergencyContact, setEmergencyContact] = useState('')
  const [notes, setNotes] = useState('')

  const payrollPacks = useMemo(
    () =>
      installedPacks.filter(
        (p) =>
          p.installed &&
          (p.operationType === 'payroll' || p.operationType === 'both') &&
          p.beneficiaryBankSchema.length > 0
      ),
    [installedPacks]
  )

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status === 'Activo'),
    [employees]
  )

  const monthlyPayrollEstimate = useMemo(
    () =>
      employees
        .filter((e) => e.status !== 'Inactivo')
        .reduce((sum, e) => sum + e.baseSalaryMonthly, 0),
    [employees]
  )

  const coveredDepartmentsCount = useMemo(() => {
    const set = new Set(employees.filter((e) => e.status !== 'Inactivo').map((e) => e.departmentId))
    return set.size
  }, [employees])

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return employees.filter((emp) => {
      const matchesDept = departmentFilter === 'Todos' || emp.departmentId === departmentFilter
      const matchesLoc = locationFilter === 'Todos' || emp.locationId === locationFilter
      const matchesStatus = statusFilter === 'Todos' || emp.status === statusFilter
      const matchesQuery =
        !q ||
        emp.fullName.toLowerCase().includes(q) ||
        emp.employeeCode.toLowerCase().includes(q) ||
        emp.roleTitle.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.departmentName.toLowerCase().includes(q) ||
        emp.locationName.toLowerCase().includes(q) ||
        (emp.rfc && emp.rfc.toLowerCase().includes(q))
      return matchesDept && matchesLoc && matchesStatus && matchesQuery
    })
  }, [employees, searchQuery, departmentFilter, locationFilter, statusFilter])

  const openCreateModal = () => {
    setEditingId(null)
    const nextNum = employees.length + 1
    setEmployeeCode(`EMP-${String(nextNum).padStart(3, '0')}`)
    setFullName('')
    setEmail('')
    setPhone('')
    setRoleTitle('')
    setDepartmentId(departments[0]?.id || '')
    setLocationId(locations[0]?.id || '')
    setContractType('Tiempo completo')
    setHireDate(new Date().toISOString().split('T')[0])
    setStatus('Activo')
    setRfc('')
    setCurp('')
    setNss('')
    setBaseSalaryMonthly('25000')
    setPaymentFrequency('Quincenal')
    setBankName('BBVA México')
    setClabe('')
    setBankPackValues({})
    setEmergencyContact('')
    setNotes('')
    setIsFormOpen(true)
  }

  const openEditModal = (emp: EmployeeRecord) => {
    setEditingId(emp.id)
    setEmployeeCode(emp.employeeCode)
    setFullName(emp.fullName)
    setEmail(emp.email)
    setPhone(emp.phone)
    setRoleTitle(emp.roleTitle)
    setDepartmentId(emp.departmentId)
    setLocationId(emp.locationId)
    setContractType(emp.contractType)
    setHireDate(emp.hireDate)
    setStatus(emp.status)
    setRfc(emp.rfc || '')
    setCurp(emp.curp || '')
    setNss(emp.nss || '')
    setBaseSalaryMonthly(String(emp.baseSalaryMonthly))
    setPaymentFrequency(emp.paymentFrequency)
    setBankName(emp.bankName || '')
    setClabe(emp.clabe || '')
    setBankPackValues(emp.bankPackValues ? JSON.parse(JSON.stringify(emp.bankPackValues)) : {})
    setEmergencyContact(emp.emergencyContact || '')
    setNotes(emp.notes || '')
    setIsFormOpen(true)
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const cleanName = fullName.trim()
    if (!cleanName || !email.trim() || !roleTitle.trim()) {
      toast.warning('Completa nombre, correo y puesto del empleado.', 'Campos obligatorios')
      return
    }

    const salaryNum = Math.max(0, Number(baseSalaryMonthly) || 0)
    const deptObj = departments.find((d) => d.id === departmentId)
    const locObj = locations.find((l) => l.id === locationId)
    const initials = cleanName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('')

    if (editingId) {
      const existing = employees.find((item) => item.id === editingId)
      if (!existing) return
      const updated: EmployeeRecord = {
        ...existing,
        employeeCode: employeeCode.trim() || existing.employeeCode,
        fullName: cleanName,
        initials: initials || existing.initials,
        email: email.trim(),
        phone: phone.trim(),
        roleTitle: roleTitle.trim(),
        departmentId,
        departmentName: deptObj?.name || existing.departmentName || 'Sin departamento',
        locationId,
        locationName: locObj?.name || existing.locationName || 'Sin ubicación',
        contractType,
        hireDate,
        status,
        rfc: rfc.trim().toUpperCase() || undefined,
        curp: curp.trim().toUpperCase() || undefined,
        nss: nss.trim() || undefined,
        baseSalaryMonthly: salaryNum,
        paymentFrequency,
        bankName: bankName.trim() || undefined,
        clabe: clabe.trim() || undefined,
        bankPackValues,
        emergencyContact: emergencyContact.trim() || undefined,
        notes: notes.trim() || undefined,
      }
      onUpdateEmployee(updated)
      if (detailEmployee?.id === updated.id) setDetailEmployee(updated)
      toast.success(`Ficha de ${updated.fullName} actualizada.`, 'Empleado actualizado')
    } else {
      const color = AVATAR_COLORS[employees.length % AVATAR_COLORS.length]
      const created: EmployeeRecord = {
        id: `emp_${Date.now()}`,
        employeeCode: employeeCode.trim() || `EMP-${String(employees.length + 1).padStart(3, '0')}`,
        fullName: cleanName,
        initials: initials || 'EM',
        avatarColor: color,
        email: email.trim(),
        phone: phone.trim(),
        roleTitle: roleTitle.trim(),
        departmentId,
        departmentName: deptObj?.name || 'General',
        locationId,
        locationName: locObj?.name || 'Sede principal',
        contractType,
        hireDate,
        status,
        rfc: rfc.trim().toUpperCase() || undefined,
        curp: curp.trim().toUpperCase() || undefined,
        nss: nss.trim() || undefined,
        baseSalaryMonthly: salaryNum,
        paymentFrequency,
        bankName: bankName.trim() || undefined,
        clabe: clabe.trim() || undefined,
        bankPackValues,
        emergencyContact: emergencyContact.trim() || undefined,
        notes: notes.trim() || undefined,
      }
      onAddEmployee(created)
      toast.success(
        `${created.fullName} (${created.employeeCode}) se integró al directorio de empleados.`,
        'Empleado registrado'
      )
    }
    setIsFormOpen(false)
  }

  const handleQuickStatusChange = (emp: EmployeeRecord, nextStatus: EmployeeStatus) => {
    const updated = { ...emp, status: nextStatus }
    onUpdateEmployee(updated)
    if (detailEmployee?.id === emp.id) setDetailEmployee(updated)
    toast.info(`Estado de ${emp.fullName} cambiado a ${nextStatus}.`, 'Estado actualizado')
  }

  const handleExportCSV = () => {
    if (filteredEmployees.length === 0) {
      toast.warning('No hay empleados visibles para exportar.', 'Sin registros')
      return
    }
    const esc = (val: string | number | undefined) =>
      `"${String(val ?? '').replace(/"/g, '""')}"`
    const headers = [
      'CÓDIGO',
      'NOMBRE COMPLETO',
      'PUESTO',
      'DEPARTAMENTO',
      'UBICACIÓN',
      'CORREO',
      'TELÉFONO',
      'CONTRATO',
      'INGRESO',
      'RFC',
      'NSS',
      'SUELDO MENSUAL (MXN)',
      'FRECUENCIA PAGO',
      'ESTADO',
    ]
    const rows = filteredEmployees.map((emp) =>
      [
        esc(emp.employeeCode),
        esc(emp.fullName),
        esc(emp.roleTitle),
        esc(emp.departmentName),
        esc(emp.locationName),
        esc(emp.email),
        esc(emp.phone),
        esc(emp.contractType),
        esc(emp.hireDate),
        esc(emp.rfc || ''),
        esc(emp.nss || ''),
        esc(emp.baseSalaryMonthly.toFixed(2)),
        esc(emp.paymentFrequency),
        esc(emp.status),
      ].join(',')
    )
    const csv = '\uFEFF' + [headers.map(esc).join(','), ...rows].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `directorio_empleados_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success(`Se exportaron ${filteredEmployees.length} empleados a CSV.`, 'Exportación completa')
  }

  const getStatusClass = (empStatus: EmployeeStatus) => {
    if (empStatus === 'Activo') return 'status-activo'
    if (empStatus === 'En licencia') return 'status-prospecto'
    return 'status-inactivo'
  }

  return (
    <div className="crm-employees-container">
      <div className="crm-section-heading">
        <div>
          <div className="panel-kicker">TALENTO Y ORGANIZACIÓN</div>
          <h2>Empleados</h2>
          <p>
            Administra el directorio interno de colaboradores, puestos, sedes asignadas y datos base para nómina.
          </p>
        </div>
        <div className="crm-section-heading-actions">
          <button type="button" className="button button-secondary" onClick={handleExportCSV}>
            <Download size={14} /> Exportar CSV
          </button>
          <button type="button" className="button button-primary" onClick={openCreateModal}>
            <Plus size={15} /> Nuevo empleado
          </button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="emp-kpi-grid">
        <article className="emp-kpi-card">
          <span className="kpi-icon icon-green">
            <UserCheck size={17} />
          </span>
          <div>
            <strong>{activeEmployees.length}</strong>
            <small>Empleados activos</small>
          </div>
        </article>
        <article className="emp-kpi-card">
          <span className="kpi-icon">
            <Wallet size={17} />
          </span>
          <div>
            <strong>{money(monthlyPayrollEstimate)}</strong>
            <small>Masa salarial mensual base</small>
          </div>
        </article>
        <article className="emp-kpi-card">
          <span className="kpi-icon icon-sand">
            <Building2 size={17} />
          </span>
          <div>
            <strong>{coveredDepartmentsCount} / {departments.length}</strong>
            <small>Departamentos con equipo</small>
          </div>
        </article>
        <article className="emp-kpi-card">
          <span className="kpi-icon icon-lilac">
            <Users size={17} />
          </span>
          <div>
            <strong>{employees.filter((e) => e.status !== 'Activo').length}</strong>
            <small>En licencia o inactivos</small>
          </div>
        </article>
      </div>

      {/* Toolbar */}
      <div className="clients-toolbar emp-toolbar">
        <label className="clients-search">
          <Search size={15} />
          <input
            aria-label="Buscar empleados"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, código, puesto, RFC o departamento..."
          />
        </label>
        <select
          aria-label="Filtrar por departamento"
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
        >
          <option value="Todos">Todos los departamentos</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por ubicación"
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
        >
          <option value="Todos">Todas las ubicaciones</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por estado"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'Todos' | EmployeeStatus)}
        >
          <option value="Todos">Todos los estados</option>
          <option value="Activo">Activo</option>
          <option value="En licencia">En licencia</option>
          <option value="Inactivo">Inactivo</option>
        </select>
      </div>

      <div className="clients-summary">
        <span>
          <strong>{filteredEmployees.length}</strong> de {employees.length} empleados visibles
        </span>
        <span>Vinculados a {locations.filter((l) => l.active).length} sedes activas</span>
      </div>

      {/* Table */}
      <div className="clients-table-wrap">
        <table className="clients-table">
          <thead>
            <tr>
              <th>COLABORADOR</th>
              <th>PUESTO Y ÁREA</th>
              <th>SEDE / UBICACIÓN</th>
              <th>COMPENSACIÓN BASE</th>
              <th>ESTADO</th>
              <th style={{ textAlign: 'right' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((emp) => (
              <tr key={emp.id}>
                <td>
                  <div className="company-cell">
                    <div className={`company-avatar ${emp.avatarColor}`}>{emp.initials}</div>
                    <div>
                      <div className="emp-name-row">
                        <strong>{emp.fullName}</strong>
                        <span className="emp-code-pill">{emp.employeeCode}</span>
                      </div>
                      <span>
                        {emp.email} {emp.phone ? `· ${emp.phone}` : ''}
                      </span>
                      {emp.rfc && (
                        <small className="emp-fiscal-sub">
                          RFC: {emp.rfc} {emp.nss ? `· NSS: ${emp.nss}` : ''}
                        </small>
                      )}
                    </div>
                  </div>
                </td>
                <td>
                  <div className="emp-role-cell">
                    <strong>{emp.roleTitle}</strong>
                    <span>{emp.departmentName}</span>
                    <small>{emp.contractType}</small>
                  </div>
                </td>
                <td>
                  <div className="emp-loc-cell">
                    <span className="warehouse-name-cell">
                      <MapPin size={12} /> {emp.locationName}
                    </span>
                    <small>
                      <CalendarDays size={10} /> Ingreso: {emp.hireDate}
                    </small>
                  </div>
                </td>
                <td>
                  <div className="emp-salary-cell">
                    <strong>{money(emp.baseSalaryMonthly)} / mes</strong>
                    <small>Pago {emp.paymentFrequency.toLowerCase()}</small>
                  </div>
                </td>
                <td>
                  <span className={`client-status ${getStatusClass(emp.status)}`}>
                    <i />
                    {emp.status}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div className="emp-row-actions">
                    <button
                      type="button"
                      className="button-icon-action"
                      onClick={() => setDetailEmployee(emp)}
                      title="Ver ficha completa del empleado"
                    >
                      <Eye size={12} /> Ficha
                    </button>
                    <button
                      type="button"
                      className="button-icon-action"
                      onClick={() => openEditModal(emp)}
                      title="Editar datos del empleado"
                    >
                      <Edit3 size={12} /> Editar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredEmployees.length === 0 && (
          <div className="clients-empty">
            <Users size={20} />
            <strong>No encontramos empleados</strong>
            <span>Ajusta los filtros de departamento, ubicación o estado, o registra un nuevo colaborador.</span>
          </div>
        )}
      </div>

      {/* Modal: Create / Edit Employee */}
      {isFormOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsFormOpen(false)
          }}
        >
          <section className="create-modal modal-wide" role="dialog" aria-modal="true">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">DIRECTORIO DE TALENTO</div>
                <h2>{editingId ? 'Editar ficha de empleado' : 'Registrar nuevo empleado'}</h2>
                <p>Asigna puesto, departamento, sede de operación y condiciones base de compensación.</p>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Cerrar"
                onClick={() => setIsFormOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid-3">
                <label className="form-field">
                  <span>Código de empleado *</span>
                  <input
                    required
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    placeholder="Ej. EMP-008"
                  />
                </label>
                <label className="form-field" style={{ gridColumn: 'span 2' }}>
                  <span>Nombre completo *</span>
                  <input
                    required
                    autoFocus
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ej. Mariana Ortega"
                  />
                </label>
              </div>

              <div className="form-grid">
                <label className="form-field">
                  <span>Correo corporativo *</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nombre@aesnexus.mx"
                  />
                </label>
                <label className="form-field">
                  <span>Teléfono</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="55 0000 0000"
                  />
                </label>
              </div>

              <div className="form-section-divider">Puesto y adscripción</div>
              <div className="form-grid-3">
                <label className="form-field">
                  <span>Puesto / Cargo *</span>
                  <input
                    required
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    placeholder="Ej. Analista de Compras"
                  />
                </label>
                <label className="form-field">
                  <span>Departamento</span>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Ubicación / Sede</span>
                  <select
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.city})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form-grid-3">
                <label className="form-field">
                  <span>Tipo de contrato</span>
                  <select
                    value={contractType}
                    onChange={(e) => setContractType(e.target.value as ContractType)}
                  >
                    <option value="Tiempo completo">Tiempo completo</option>
                    <option value="Medio tiempo">Medio tiempo</option>
                    <option value="Por proyecto">Por proyecto</option>
                    <option value="Honorarios">Honorarios</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>Fecha de ingreso</span>
                  <input
                    type="date"
                    value={hireDate}
                    onChange={(e) => setHireDate(e.target.value)}
                  />
                </label>
                <label className="form-field">
                  <span>Estado</span>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as EmployeeStatus)}
                  >
                    <option value="Activo">Activo</option>
                    <option value="En licencia">En licencia</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </label>
              </div>

              <div className="form-section-divider">Datos fiscales y base de nómina</div>
              <div className="form-grid-3">
                <label className="form-field">
                  <span>RFC</span>
                  <input
                    value={rfc}
                    onChange={(e) => setRfc(e.target.value)}
                    placeholder="AAAA900101XXX"
                  />
                </label>
                <label className="form-field">
                  <span>CURP</span>
                  <input
                    value={curp}
                    onChange={(e) => setCurp(e.target.value)}
                    placeholder="18 caracteres"
                  />
                </label>
                <label className="form-field">
                  <span>NSS (IMSS)</span>
                  <input
                    value={nss}
                    onChange={(e) => setNss(e.target.value)}
                    placeholder="11 dígitos"
                  />
                </label>
              </div>

              <div className="form-grid-4">
                <label className="form-field">
                  <span>Sueldo mensual bruto (MXN)</span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={baseSalaryMonthly}
                    onChange={(e) => setBaseSalaryMonthly(e.target.value)}
                  />
                </label>
                <label className="form-field">
                  <span>Periodicidad de pago</span>
                  <select
                    value={paymentFrequency}
                    onChange={(e) => setPaymentFrequency(e.target.value as PaymentFrequency)}
                  >
                    <option value="Quincenal">Quincenal</option>
                    <option value="Semanal">Semanal</option>
                    <option value="Mensual">Mensual</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>Banco</span>
                  <input
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Ej. BBVA México"
                  />
                </label>
                <label className="form-field">
                  <span>CLABE interbancaria</span>
                  <input
                    value={clabe}
                    onChange={(e) => setClabe(e.target.value)}
                    placeholder="18 dígitos"
                  />
                </label>
              </div>

              {payrollPacks.length > 0 && (
                <>
                  <div className="form-section-divider">
                    Campos dinámicos de dispersión bancaria (Packs EBP instalados)
                  </div>
                  <div className="ebp-dynamic-packs-stack">
                    {payrollPacks.map((pack) => {
                      const packVals = bankPackValues[pack.id] || {}
                      return (
                        <div key={pack.id} className="ebp-dynamic-pack-subbox">
                          <div className="ebp-subbox-title">
                            <strong>{pack.name}</strong>
                            <span className="emp-code-pill">{pack.bankName}</span>
                          </div>
                          <div className="form-grid">
                            {pack.beneficiaryBankSchema.map((field) => {
                              const val = packVals[field.key] ?? field.defaultValue ?? ''
                              const err = validateEbpFieldValue(
                                field,
                                val,
                                pack.embeddedCatalogs
                              )
                              const cat = field.catalogRef
                                ? pack.embeddedCatalogs[field.catalogRef]
                                : undefined
                              return (
                                <label key={field.key} className="form-field">
                                  <span>
                                    {field.label} {field.validators.required ? '*' : ''}
                                  </span>
                                  {field.type === 'select_catalog' && cat ? (
                                    <select
                                      value={val}
                                      onChange={(e) =>
                                        setBankPackValues((prev) => ({
                                          ...prev,
                                          [pack.id]: {
                                            ...(prev[pack.id] || {}),
                                            [field.key]: e.target.value,
                                          },
                                        }))
                                      }
                                    >
                                      <option value="">Selecciona opción...</option>
                                      {cat.options.map((opt) => (
                                        <option key={opt.code} value={opt.code}>
                                          {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      value={val}
                                      placeholder={field.placeholder}
                                      onChange={(e) =>
                                        setBankPackValues((prev) => ({
                                          ...prev,
                                          [pack.id]: {
                                            ...(prev[pack.id] || {}),
                                            [field.key]: e.target.value,
                                          },
                                        }))
                                      }
                                    />
                                  )}
                                  {err ? (
                                    <small className="ebp-field-err">{err}</small>
                                  ) : field.helpText ? (
                                    <small className="ebp-field-hint">{field.helpText}</small>
                                  ) : null}
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              <div className="form-grid">
                <label className="form-field">
                  <span>Contacto de emergencia</span>
                  <input
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="Nombre y teléfono"
                  />
                </label>
                <label className="form-field">
                  <span>Notas internas</span>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Observaciones de contratación o esquema"
                  />
                </label>
              </div>

              <div className="create-modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="button button-primary">
                  <BadgeCheck size={14} /> {editingId ? 'Guardar cambios' : 'Registrar empleado'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal: Employee Detail Sheet */}
      {detailEmployee && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDetailEmployee(null)
          }}
        >
          <section className="create-modal emp-sheet-modal" role="dialog" aria-modal="true" aria-labelledby="emp-sheet-name">
            {/* Header Banner */}
            <header className="emp-sheet-header">
              <div className="emp-sheet-identity">
                <div className={`company-avatar emp-sheet-avatar ${detailEmployee.avatarColor}`}>
                  {detailEmployee.initials}
                </div>
                <div className="emp-sheet-title-block">
                  <div className="emp-sheet-kicker-row">
                    <span className="emp-code-pill">{detailEmployee.employeeCode}</span>
                    <span className={`client-status ${getStatusClass(detailEmployee.status)}`}>
                      <i />
                      {detailEmployee.status}
                    </span>
                    <span className="emp-contract-chip">{detailEmployee.contractType}</span>
                  </div>
                  <h2 id="emp-sheet-name">{detailEmployee.fullName}</h2>
                  <p className="emp-sheet-subtitle">
                    {detailEmployee.roleTitle} · {detailEmployee.departmentName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Cerrar ficha"
                onClick={() => setDetailEmployee(null)}
              >
                <X size={18} />
              </button>
            </header>

            {/* Scrollable Content */}
            <div className="emp-sheet-body">
              {/* Highlight Summary Row */}
              <div className="emp-sheet-highlights">
                <div className="emp-highlight-card accent">
                  <span className="emp-field-label">Compensación mensual bruta</span>
                  <strong className="emp-highlight-money">{money(detailEmployee.baseSalaryMonthly)}</strong>
                  <small>Periodicidad de pago: {detailEmployee.paymentFrequency}</small>
                </div>
                <div className="emp-highlight-card">
                  <span className="emp-field-label">Sede / Ubicación asignada</span>
                  <strong className="emp-highlight-val">
                    <MapPin size={13} /> {detailEmployee.locationName}
                  </strong>
                  <small>
                    <CalendarDays size={11} /> Fecha de ingreso: {detailEmployee.hireDate}
                  </small>
                </div>
              </div>

              {/* Section: Contacto y Emergencia */}
              <div className="emp-sheet-section">
                <div className="emp-sheet-section-title">
                  <Mail size={13} /> Contacto y Emergencia
                </div>
                <div className="emp-sheet-fields-grid cols-3">
                  <div className="emp-sheet-field">
                    <span className="emp-field-label">Correo corporativo</span>
                    <strong className="emp-field-val wrap-anywhere">
                      <Mail size={12} /> {detailEmployee.email}
                    </strong>
                  </div>
                  <div className="emp-sheet-field">
                    <span className="emp-field-label">Teléfono</span>
                    <strong className="emp-field-val">
                      <Phone size={12} /> {detailEmployee.phone || 'No registrado'}
                    </strong>
                  </div>
                  <div className="emp-sheet-field">
                    <span className="emp-field-label">Contacto de emergencia</span>
                    <strong className="emp-field-val">
                      {detailEmployee.emergencyContact || 'No registrado'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Section: Datos Fiscales y Seguridad Social */}
              <div className="emp-sheet-section">
                <div className="emp-sheet-section-title">
                  <IdCard size={13} /> Datos fiscales y seguridad social
                </div>
                <div className="emp-sheet-fields-grid cols-3">
                  <div className="emp-sheet-field">
                    <span className="emp-field-label">RFC</span>
                    <strong className="emp-field-val mono">
                      {detailEmployee.rfc || 'No registrado'}
                    </strong>
                  </div>
                  <div className="emp-sheet-field">
                    <span className="emp-field-label">CURP</span>
                    <strong className="emp-field-val mono wrap-anywhere">
                      {detailEmployee.curp || 'No registrado'}
                    </strong>
                  </div>
                  <div className="emp-sheet-field">
                    <span className="emp-field-label">NSS (IMSS)</span>
                    <strong className="emp-field-val mono">
                      {detailEmployee.nss || 'No registrado'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Section: Datos Bancarios para Dispersión */}
              <div className="emp-sheet-section">
                <div className="emp-sheet-section-title">
                  <Wallet size={13} /> Datos bancarios para dispersión de nómina
                </div>
                <div className="emp-sheet-fields-grid cols-2">
                  <div className="emp-sheet-field">
                    <span className="emp-field-label">Institución bancaria</span>
                    <strong className="emp-field-val">
                      {detailEmployee.bankName || 'No registrada'}
                    </strong>
                  </div>
                  <div className="emp-sheet-field">
                    <span className="emp-field-label">CLABE interbancaria</span>
                    <strong className="emp-field-val mono wrap-anywhere">
                      {detailEmployee.clabe || 'No registrada'}
                    </strong>
                  </div>
                </div>
                {payrollPacks.length > 0 && (
                  <div className="ebp-sheet-packs-row">
                    {payrollPacks.map((pack) => {
                      const vals = detailEmployee.bankPackValues?.[pack.id] || {}
                      return (
                        <div key={pack.id} className="ebp-sheet-pack-pill">
                          <span className="emp-field-label">{pack.bankName} (EBP)</span>
                          <div className="ebp-mini-kv-list">
                            {pack.beneficiaryBankSchema.map((f) => {
                              const raw = vals[f.key] ?? f.defaultValue ?? '—'
                              const catLabel =
                                f.catalogRef && pack.embeddedCatalogs[f.catalogRef]
                                  ? pack.embeddedCatalogs[f.catalogRef].options.find(
                                      (o) => o.code === raw
                                    )?.label || raw
                                  : raw
                              return (
                                <span key={f.key} className="ebp-mini-kv">
                                  {f.label}: <strong>{catLabel}</strong>
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {detailEmployee.notes && (
                <div className="emp-sheet-notes">
                  <span className="emp-field-label">Notas internas</span>
                  <p>{detailEmployee.notes}</p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <footer className="emp-sheet-footer">
              <div className="emp-sheet-status-actions">
                <span className="emp-status-switch-label">Cambiar estado:</span>
                {(['Activo', 'En licencia', 'Inactivo'] as const)
                  .filter((st) => st !== detailEmployee.status)
                  .map((st) => (
                    <button
                      key={st}
                      type="button"
                      className="button button-secondary emp-status-btn"
                      onClick={() => handleQuickStatusChange(detailEmployee, st)}
                    >
                      {st}
                    </button>
                  ))}
              </div>
              <div className="emp-sheet-primary-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => {
                    const target = detailEmployee
                    setDetailEmployee(null)
                    openEditModal(target)
                  }}
                >
                  <Edit3 size={13} /> Editar ficha
                </button>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => setDetailEmployee(null)}
                >
                  Cerrar
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </div>
  )
}
