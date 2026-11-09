import { useState, useMemo } from 'react'
import {
  Building2,
  MapPin,
  Plus,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  Users,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import { useToast } from './Toast'

export interface DepartmentRecord {
  id: string
  code: string
  name: string
  leader: string
  costCenter?: string
  description?: string
  active: boolean
}

export type LocationType =
  | 'Oficina corporativa'
  | 'Sucursal'
  | 'Almacén / Bodega'
  | 'Taller / Operación'
  | 'Punto de venta'

export interface PhysicalLocationRecord {
  id: string
  code: string
  name: string
  type: LocationType
  address: string
  city: string
  state: string
  country: string
  manager?: string
  active: boolean
}

interface AdministrationSectionProps {
  departments: DepartmentRecord[]
  locations: PhysicalLocationRecord[]
  onAddDepartment: (dep: DepartmentRecord) => void
  onAddLocation: (loc: PhysicalLocationRecord) => void
  onUpdateDepartments: (deps: DepartmentRecord[]) => void
  onUpdateLocations: (locs: PhysicalLocationRecord[]) => void
  adminSection: 'Departamentos' | 'Ubicaciones' | 'Resumen'
  onNavigateSection: (sec: 'Departamentos' | 'Ubicaciones' | 'Resumen') => void
}

const LOCATION_TYPES: LocationType[] = [
  'Oficina corporativa',
  'Sucursal',
  'Almacén / Bodega',
  'Taller / Operación',
  'Punto de venta',
]

export function AdministrationSection({
  departments,
  locations,
  onAddDepartment,
  onAddLocation,
  onUpdateDepartments,
  onUpdateLocations,
  adminSection,
  onNavigateSection,
}: AdministrationSectionProps) {
  const toast = useToast()

  // Search queries
  const [departmentSearch, setDepartmentSearch] = useState('')
  const [locationSearch, setLocationSearch] = useState('')
  const [locationTypeFilter, setLocationTypeFilter] = useState<string>('Todos')

  // Modals state
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false)
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)

  // Department form state
  const [deptCode, setDeptCode] = useState('')
  const [deptName, setDeptName] = useState('')
  const [deptLeader, setDeptLeader] = useState('')
  const [deptCostCenter, setDeptCostCenter] = useState('')
  const [deptDescription, setDeptDescription] = useState('')

  // Location form state
  const [locCode, setLocCode] = useState('')
  const [locName, setLocName] = useState('')
  const [locType, setLocType] = useState<LocationType>('Sucursal')
  const [locAddress, setLocAddress] = useState('')
  const [locCity, setLocCity] = useState('')
  const [locState, setLocState] = useState('')
  const [locCountry, setLocCountry] = useState('México')
  const [locManager, setLocManager] = useState('')

  // Filtered departments
  const filteredDepartments = useMemo(() => {
    const q = departmentSearch.toLowerCase().trim()
    if (!q) return departments
    return departments.filter(
      (d) =>
        d.code.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        d.leader.toLowerCase().includes(q) ||
        (d.costCenter && d.costCenter.toLowerCase().includes(q)) ||
        (d.description && d.description.toLowerCase().includes(q))
    )
  }, [departments, departmentSearch])

  // Filtered locations
  const filteredLocations = useMemo(() => {
    const q = locationSearch.toLowerCase().trim()
    return locations.filter((loc) => {
      const matchType = locationTypeFilter === 'Todos' || loc.type === locationTypeFilter
      const matchQuery =
        !q ||
        loc.code.toLowerCase().includes(q) ||
        loc.name.toLowerCase().includes(q) ||
        loc.city.toLowerCase().includes(q) ||
        loc.state.toLowerCase().includes(q) ||
        loc.address.toLowerCase().includes(q) ||
        (loc.manager && loc.manager.toLowerCase().includes(q))
      return matchType && matchQuery
    })
  }, [locations, locationSearch, locationTypeFilter])

  // Handle department creation
  const handleCreateDepartment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!deptCode.trim() || !deptName.trim() || !deptLeader.trim()) {
      toast.error('Indica el código, nombre y líder del departamento.', 'Campos requeridos')
      return
    }

    if (departments.some((d) => d.code.trim().toLowerCase() === deptCode.trim().toLowerCase())) {
      toast.warning(`Ya existe un departamento con el código ${deptCode.trim()}.`, 'Código duplicado')
      return
    }

    const newDept: DepartmentRecord = {
      id: `dep_${Date.now()}`,
      code: deptCode.trim().toUpperCase(),
      name: deptName.trim(),
      leader: deptLeader.trim(),
      costCenter: deptCostCenter.trim() || undefined,
      description: deptDescription.trim() || undefined,
      active: true,
    }

    onAddDepartment(newDept)
    toast.success(`Departamento “${newDept.name}” creado exitosamente.`, 'Departamento registrado')

    setIsDeptModalOpen(false)
    setDeptCode('')
    setDeptName('')
    setDeptLeader('')
    setDeptCostCenter('')
    setDeptDescription('')
  }

  // Handle location creation
  const handleCreateLocation = (e: React.FormEvent) => {
    e.preventDefault()
    if (!locCode.trim() || !locName.trim() || !locAddress.trim() || !locCity.trim()) {
      toast.error('Completa el código, nombre, dirección y ciudad de la sede.', 'Campos requeridos')
      return
    }

    if (locations.some((l) => l.code.trim().toLowerCase() === locCode.trim().toLowerCase())) {
      toast.warning(`Ya existe una ubicación con el código ${locCode.trim()}.`, 'Código duplicado')
      return
    }

    const newLocation: PhysicalLocationRecord = {
      id: `loc_${Date.now()}`,
      code: locCode.trim().toUpperCase(),
      name: locName.trim(),
      type: locType,
      address: locAddress.trim(),
      city: locCity.trim(),
      state: locState.trim() || locCity.trim(),
      country: locCountry.trim() || 'México',
      manager: locManager.trim() || undefined,
      active: true,
    }

    onAddLocation(newLocation)
    toast.success(`Ubicación física “${newLocation.name}” agregada al sistema.`, 'Ubicación registrada')

    setIsLocationModalOpen(false)
    setLocCode('')
    setLocName('')
    setLocType('Sucursal')
    setLocAddress('')
    setLocCity('')
    setLocState('')
    setLocManager('')
  }

  const toggleDepartmentStatus = (id: string) => {
    const updated = departments.map((d) => (d.id === id ? { ...d, active: !d.active } : d))
    onUpdateDepartments(updated)
    const dept = departments.find((d) => d.id === id)
    toast.info(
      `Departamento ${dept?.name} ahora está ${dept?.active ? 'Inactivo' : 'Activo'}.`,
      'Estado actualizado'
    )
  }

  const toggleLocationStatus = (id: string) => {
    const updated = locations.map((l) => (l.id === id ? { ...l, active: !l.active } : l))
    onUpdateLocations(updated)
    const loc = locations.find((l) => l.id === id)
    toast.info(
      `Ubicación ${loc?.name} ahora está ${loc?.active ? 'Inactiva' : 'Activa'}.`,
      'Estado actualizado'
    )
  }

  const getLocationTypeBadgeClass = (type: LocationType) => {
    switch (type) {
      case 'Oficina corporativa':
        return 'badge-transfer'
      case 'Almacén / Bodega':
        return 'badge-entry'
      case 'Sucursal':
        return 'fin-badge-paid'
      case 'Taller / Operación':
        return 'badge-adjust'
      case 'Punto de venta':
        return 'badge-exit'
    }
  }

  return (
    <section className="sales-page" aria-labelledby="admin-title">
      {/* Header */}
      <div className="crm-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" /> AES NEXUS · H1 NÚCLEO DEL SISTEMA
          </div>
          <h1 id="admin-title">Administración</h1>
          <p>
            Configuración y estructura de la organización: gestión de departamentos, líderes, centros de costos y sedes físicas.
          </p>
        </div>
      </div>

      {/* Navigation tabs */}
      <nav className="crm-tabs" aria-label="Secciones de Administración">
        <button
          className={adminSection === 'Departamentos' ? 'active' : ''}
          onClick={() => onNavigateSection('Departamentos')}
        >
          <Building2 size={13} />
          Departamentos <span>{departments.length}</span>
        </button>
        <button
          className={adminSection === 'Ubicaciones' ? 'active' : ''}
          onClick={() => onNavigateSection('Ubicaciones')}
        >
          <MapPin size={13} />
          Ubicaciones físicas <span>{locations.length}</span>
        </button>
        <button
          className={adminSection === 'Resumen' ? 'active' : ''}
          onClick={() => onNavigateSection('Resumen')}
        >
          <Layers size={13} />
          Resumen organizacional
        </button>
      </nav>

      {/* Section 1: Departamentos */}
      {adminSection === 'Departamentos' && (
        <div className="finance-section-container">
          {/* Header strip */}
          <div className="ops-header-strip">
            <div className="ops-header-left">
              <div className="ops-icon-box fin-icon-box">
                <Building2 size={20} />
              </div>
              <div>
                <h2>Departamentos y Unidades de Negocio</h2>
                <p>Estructura departamental, responsables de área y asignación de centros de costos.</p>
              </div>
            </div>

            <div className="ops-header-right">
              <div className="ops-stat-item">
                <span className="ops-stat-label">Total departamentos</span>
                <strong className="ops-stat-val">{departments.length}</strong>
              </div>
              <div className="ops-stat-item">
                <span className="ops-stat-label">Departamentos activos</span>
                <span className="ops-stat-pill ok">
                  {departments.filter((d) => d.active).length} activos
                </span>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="ops-toolbar">
            <div className="ops-filter-group">
              <div className="ops-search-input-wrap" style={{ minWidth: '320px' }}>
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Buscar por código, departamento, líder o centro de costos..."
                  value={departmentSearch}
                  onChange={(e) => setDepartmentSearch(e.target.value)}
                />
                {departmentSearch && (
                  <button
                    className="search-clear-btn"
                    onClick={() => setDepartmentSearch('')}
                    title="Limpiar búsqueda"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            <div className="ops-actions-group">
              <button
                className="button button-primary"
                onClick={() => setIsDeptModalOpen(true)}
              >
                <Plus size={14} /> Nuevo departamento
              </button>
            </div>
          </div>

          {/* Departments Table */}
          <div className="table-wrap ops-table-wrap">
            <table className="data-table ops-data-table">
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>CÓDIGO</th>
                  <th>DEPARTAMENTO / ÁREA</th>
                  <th>LÍDER / RESPONSABLE</th>
                  <th>CENTRO DE COSTOS</th>
                  <th>ESTADO</th>
                  <th style={{ textAlign: 'right', width: '110px' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-cell">
                      No se encontraron departamentos registrados con los criterios de búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredDepartments.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <span className="accounting-code-badge">{d.code}</span>
                      </td>
                      <td>
                        <div className="prod-cell">
                          <strong>{d.name}</strong>
                          {d.description && <small>{d.description}</small>}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Users size={12} color="#65766b" />
                          <span>{d.leader}</span>
                        </div>
                      </td>
                      <td>
                        {d.costCenter ? (
                          <span className="location-bin-tag">{d.costCenter}</span>
                        ) : (
                          <span style={{ color: '#9aa59d' }}>—</span>
                        )}
                      </td>
                      <td>
                        {d.active ? (
                          <span className="stock-ok-badge">
                            <CheckCircle2 size={11} /> Activo
                          </span>
                        ) : (
                          <span className="stock-alert-badge">
                            <AlertCircle size={11} /> Inactivo
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="button-icon-action"
                          onClick={() => toggleDepartmentStatus(d.id)}
                          title={d.active ? 'Desactivar departamento' : 'Activar departamento'}
                        >
                          {d.active ? 'Desactivar' : 'Reactivar'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 2: Ubicaciones Físicas */}
      {adminSection === 'Ubicaciones' && (
        <div className="finance-section-container">
          {/* Header strip */}
          <div className="ops-header-strip">
            <div className="ops-header-left">
              <div className="ops-icon-box fin-icon-box">
                <MapPin size={20} />
              </div>
              <div>
                <h2>Sedes y Ubicaciones Físicas</h2>
                <p>Direcciones de oficinas, almacenes, sucursales y puntos de operación de la entidad.</p>
              </div>
            </div>

            <div className="ops-header-right">
              <div className="ops-stat-item">
                <span className="ops-stat-label">Total sedes</span>
                <strong className="ops-stat-val">{locations.length}</strong>
              </div>
              <div className="ops-stat-item">
                <span className="ops-stat-label">Sedes operativas</span>
                <span className="ops-stat-pill ok">
                  {locations.filter((l) => l.active).length} activas
                </span>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="ops-toolbar">
            <div className="ops-filter-group" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <div className="ops-search-input-wrap" style={{ minWidth: '280px' }}>
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Buscar por sede, ciudad, dirección o responsable..."
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                />
                {locationSearch && (
                  <button
                    className="search-clear-btn"
                    onClick={() => setLocationSearch('')}
                    title="Limpiar búsqueda"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="accounting-select-wrap">
                <label htmlFor="filter-loc-type">Tipo:</label>
                <select
                  id="filter-loc-type"
                  className="accounting-filter-select"
                  value={locationTypeFilter}
                  onChange={(e) => setLocationTypeFilter(e.target.value)}
                >
                  <option value="Todos">Todos los tipos ({locations.length})</option>
                  {LOCATION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t} ({locations.filter((l) => l.type === t).length})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="ops-actions-group">
              <button
                className="button button-primary"
                onClick={() => setIsLocationModalOpen(true)}
              >
                <Plus size={14} /> Nueva ubicación
              </button>
            </div>
          </div>

          {/* Locations Table */}
          <div className="table-wrap ops-table-wrap">
            <table className="data-table ops-data-table">
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>CÓDIGO</th>
                  <th>SEDE / UBICACIÓN</th>
                  <th>TIPO</th>
                  <th>DIRECCIÓN Y CIUDAD</th>
                  <th>ENCARGADO</th>
                  <th>ESTADO</th>
                  <th style={{ textAlign: 'right', width: '110px' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filteredLocations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-cell">
                      No se encontraron ubicaciones físicas registradas.
                    </td>
                  </tr>
                ) : (
                  filteredLocations.map((loc) => (
                    <tr key={loc.id}>
                      <td>
                        <span className="accounting-code-badge">{loc.code}</span>
                      </td>
                      <td>
                        <div className="prod-cell">
                          <strong>{loc.name}</strong>
                          <small>{loc.country}</small>
                        </div>
                      </td>
                      <td>
                        <span className={`movement-type-badge ${getLocationTypeBadgeClass(loc.type)}`}>
                          {loc.type}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '9px', color: '#2f3e35' }}>{loc.address}</span>
                          <small style={{ color: '#7f8f84' }}>
                            {loc.city}, {loc.state}
                          </small>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '9px', color: '#44554b' }}>
                          {loc.manager || 'No asignado'}
                        </span>
                      </td>
                      <td>
                        {loc.active ? (
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
                        <button
                          type="button"
                          className="button-icon-action"
                          onClick={() => toggleLocationStatus(loc.id)}
                          title={loc.active ? 'Inhabilitar sede' : 'Habilitar sede'}
                        >
                          {loc.active ? 'Inhabilitar' : 'Habilitar'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 3: Resumen Organizacional */}
      {adminSection === 'Resumen' && (
        <div className="finance-section-container">
          <div className="ops-overview-split" style={{ marginBottom: '14px' }}>
            <div className="ops-panel-card">
              <div className="ops-panel-header">
                <div>
                  <div className="panel-kicker">ESTRUCTURA DEPARTAMENTAL</div>
                  <h3>Departamentos y Líderes</h3>
                </div>
                <button
                  className="button button-secondary"
                  onClick={() => onNavigateSection('Departamentos')}
                >
                  Ver todos ({departments.length}) <ArrowRight size={13} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {departments.slice(0, 4).map((d) => (
                  <div
                    key={d.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      background: '#fafbfa',
                      border: '1px solid #edf1eb',
                      borderRadius: '7px',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '10px', color: '#2a3830', display: 'block' }}>
                        {d.name}
                      </strong>
                      <small style={{ fontSize: '8.5px', color: '#7a8980' }}>
                        Líder: {d.leader} {d.costCenter && `· CC: ${d.costCenter}`}
                      </small>
                    </div>
                    <span className="accounting-code-badge">{d.code}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="ops-panel-card">
              <div className="ops-panel-header">
                <div>
                  <div className="panel-kicker">INFRAESTRUCTURA FÍSICA</div>
                  <h3>Sedes y Sucursales</h3>
                </div>
                <button
                  className="button button-secondary"
                  onClick={() => onNavigateSection('Ubicaciones')}
                >
                  Ver todas ({locations.length}) <ArrowRight size={13} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {locations.slice(0, 4).map((l) => (
                  <div
                    key={l.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      background: '#fafbfa',
                      border: '1px solid #edf1eb',
                      borderRadius: '7px',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '10px', color: '#2a3830', display: 'block' }}>
                        {l.name}
                      </strong>
                      <small style={{ fontSize: '8.5px', color: '#7a8980' }}>
                        {l.city}, {l.state} · {l.type}
                      </small>
                    </div>
                    <span className="accounting-code-badge">{l.code}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '14px 16px',
              borderRadius: '9px',
              background: '#f4f7f4',
              border: '1px solid #dce6dc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={22} color="#3c7d5c" />
              <div>
                <strong style={{ fontSize: '11px', color: '#27362d', display: 'block' }}>
                  Estructura organizacional configurada
                </strong>
                <span style={{ fontSize: '9px', color: '#68776e' }}>
                  Los departamentos y ubicaciones registrados alimentan los centros de costos y almacenes operativos del sistema.
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="button button-secondary"
                onClick={() => setIsDeptModalOpen(true)}
              >
                <Plus size={13} /> Agregar departamento
              </button>
              <button
                className="button button-primary"
                onClick={() => setIsLocationModalOpen(true)}
              >
                <Plus size={13} /> Agregar ubicación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Crear Departamento */}
      {isDeptModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsDeptModalOpen(false)
          }}
        >
          <section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="modal-dept-title">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">ADMINISTRACIÓN · ESTRUCTURA</div>
                <h2 id="modal-dept-title">Nuevo Departamento</h2>
                <p>Crea una nueva unidad funcional en la organización para asignación de personal y centros de costos.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setIsDeptModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateDepartment}>
              <div className="form-grid">
                <label className="form-field">
                  <span>Código de departamento *</span>
                  <input
                    required
                    autoFocus
                    placeholder="Ej. RH-06 o CAL-07"
                    value={deptCode}
                    onChange={(e) => setDeptCode(e.target.value)}
                  />
                </label>

                <label className="form-field">
                  <span>Centro de costos asignado</span>
                  <input
                    placeholder="Ej. CC-600"
                    value={deptCostCenter}
                    onChange={(e) => setDeptCostCenter(e.target.value)}
                  />
                </label>
              </div>

              <div className="form-grid">
                <label className="form-field">
                  <span>Nombre del departamento *</span>
                  <input
                    required
                    placeholder="Ej. Recursos Humanos y Talento"
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                  />
                </label>

                <label className="form-field">
                  <span>Líder o responsable *</span>
                  <input
                    required
                    placeholder="Ej. Sofía Ramírez"
                    value={deptLeader}
                    onChange={(e) => setDeptLeader(e.target.value)}
                  />
                </label>
              </div>

              <label className="form-field">
                <span>Descripción o funciones del departamento</span>
                <input
                  placeholder="Ej. Gestión de nómina, desarrollo organizacional y contrataciones."
                  value={deptDescription}
                  onChange={(e) => setDeptDescription(e.target.value)}
                />
              </label>

              <div className="create-modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsDeptModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="button button-primary">
                  <Plus size={14} /> Guardar departamento
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal: Crear Ubicación Física */}
      {isLocationModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsLocationModalOpen(false)
          }}
        >
          <section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="modal-loc-title">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">ADMINISTRACIÓN · INFRAESTRUCTURA</div>
                <h2 id="modal-loc-title">Nueva Ubicación Física</h2>
                <p>Registra una nueva sede, almacén o sucursal operativa para la empresa.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setIsLocationModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateLocation}>
              <div className="form-grid">
                <label className="form-field">
                  <span>Código de la sede *</span>
                  <input
                    required
                    autoFocus
                    placeholder="Ej. SUC-QRO o ALM-GDL"
                    value={locCode}
                    onChange={(e) => setLocCode(e.target.value)}
                  />
                </label>

                <label className="form-field">
                  <span>Tipo de ubicación *</span>
                  <select
                    required
                    value={locType}
                    onChange={(e) => setLocType(e.target.value as LocationType)}
                  >
                    {LOCATION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form-grid">
                <label className="form-field">
                  <span>Nombre de la sede o sucursal *</span>
                  <input
                    required
                    placeholder="Ej. Centro Operativo Querétaro"
                    value={locName}
                    onChange={(e) => setLocName(e.target.value)}
                  />
                </label>

                <label className="form-field">
                  <span>Encargado / Administrador</span>
                  <input
                    placeholder="Ej. Rodrigo Vargas"
                    value={locManager}
                    onChange={(e) => setLocManager(e.target.value)}
                  />
                </label>
              </div>

              <label className="form-field">
                <span>Dirección física completa *</span>
                <input
                  required
                  placeholder="Ej. Av. 5 de Febrero 1300, Parque Industrial Benito Juárez"
                  value={locAddress}
                  onChange={(e) => setLocAddress(e.target.value)}
                />
              </label>

              <div className="form-grid">
                <label className="form-field">
                  <span>Ciudad o Municipio *</span>
                  <input
                    required
                    placeholder="Ej. Querétaro"
                    value={locCity}
                    onChange={(e) => setLocCity(e.target.value)}
                  />
                </label>

                <label className="form-field">
                  <span>Estado / Entidad</span>
                  <input
                    placeholder="Ej. Querétaro"
                    value={locState}
                    onChange={(e) => setLocState(e.target.value)}
                  />
                </label>
              </div>

              <label className="form-field">
                <span>País</span>
                <input
                  placeholder="Ej. México"
                  value={locCountry}
                  onChange={(e) => setLocCountry(e.target.value)}
                />
              </label>

              <div className="create-modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsLocationModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="button button-primary">
                  <Plus size={14} /> Guardar ubicación
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  )
}
