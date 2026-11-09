import { useState, useMemo } from 'react'
import {
  Truck,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  MapPin,
  PackageCheck,
  X,
  RotateCcw,
  Boxes,
} from 'lucide-react'
import type { ShipmentDelivery, DeliveryStatus } from '../data/operations'
import { useToast } from './Toast'

interface OperationsDeliveriesProps {
  shipments: ShipmentDelivery[]
  onUpdateShipments: (shipments: ShipmentDelivery[]) => void
  salesOrderFolios?: string[]
}

const CARRIERS = [
  'Logística del Valle',
  'Estafeta Express',
  'DHL Express México',
  'FedEx México',
  'Paquetexpress',
  'Mensajería Interna',
]

export function OperationsDeliveries({
  shipments,
  onUpdateShipments,
  salesOrderFolios = ['PED-2026-001', 'PED-2026-002', 'PED-2026-003'],
}: OperationsDeliveriesProps) {
  const toast = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('Todas')

  // Modals
  const [isNewShipmentModalOpen, setIsNewShipmentModalOpen] = useState(false)
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)
  const [selectedShipment, setSelectedShipment] = useState<ShipmentDelivery | null>(null)
  const [returnReason, setReturnReason] = useState('')

  // New Shipment Form State
  const [newOrderFolio, setNewOrderFolio] = useState(salesOrderFolios[0] || 'PED-2026-001')
  const [newClientCompany, setNewClientCompany] = useState('')
  const [newClientName, setNewClientName] = useState('')
  const [newCarrier, setNewCarrier] = useState(CARRIERS[0])
  const [newTracking, setNewTracking] = useState('')
  const [newEstDelivery, setNewEstDelivery] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [newPackages, setNewPackages] = useState(1)
  const [newNotes, setNewNotes] = useState('')

  // Filtered shipments
  const filteredShipments = useMemo(() => {
    return shipments.filter((shp) => {
      const matchStatus = statusFilter === 'Todas' || shp.status === statusFilter
      const q = searchQuery.toLowerCase()
      const matchSearch =
        !q ||
        shp.folio.toLowerCase().includes(q) ||
        shp.orderFolio.toLowerCase().includes(q) ||
        shp.clientCompany.toLowerCase().includes(q) ||
        shp.clientName.toLowerCase().includes(q) ||
        shp.carrier.toLowerCase().includes(q) ||
        shp.trackingNumber.toLowerCase().includes(q)
      return matchStatus && matchSearch
    })
  }, [shipments, statusFilter, searchQuery])

  // Summary counts
  const inPrepCount = useMemo(
    () => shipments.filter((s) => s.status === 'Preparando').length,
    [shipments]
  )
  const inTransitCount = useMemo(
    () => shipments.filter((s) => s.status === 'En ruta').length,
    [shipments]
  )
  const deliveredCount = useMemo(
    () => shipments.filter((s) => s.status === 'Entregado').length,
    [shipments]
  )
  const returnedCount = useMemo(
    () => shipments.filter((s) => s.status === 'Devuelto').length,
    [shipments]
  )

  // Handlers
  const handleCreateShipment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newClientCompany.trim()) {
      toast.error('Indica la empresa del cliente.', 'Campo requerido')
      return
    }

    const nextNum = shipments.length + 1
    const folio = `DESP-2026-${String(nextNum).padStart(3, '0')}`
    const today = new Date()
    const formatDate = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][d.getMonth()]} ${d.getFullYear()}`

    const autoTracking =
      newTracking.trim() ||
      `${newCarrier.substring(0, 3).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`

    const newShipment: ShipmentDelivery = {
      id: `shp_${Date.now()}`,
      folio,
      orderFolio: newOrderFolio,
      clientCompany: newClientCompany.trim(),
      clientName: newClientName.trim() || newClientCompany.trim(),
      carrier: newCarrier,
      trackingNumber: autoTracking,
      shippingDate: formatDate(today),
      estimatedDelivery: newEstDelivery.trim() || '14 nov 2026',
      address: newAddress.trim() || 'Dirección acordada en pedido de venta',
      status: 'Preparando',
      packages: newPackages,
      notes: newNotes.trim() || undefined,
    }

    onUpdateShipments([newShipment, ...shipments])
    toast.success(
      `Despacho ${folio} registrado con guía ${autoTracking} vía ${newCarrier}.`,
      'Despacho creado'
    )

    setIsNewShipmentModalOpen(false)
    setNewClientCompany('')
    setNewClientName('')
    setNewTracking('')
    setNewAddress('')
    setNewPackages(1)
    setNewNotes('')
  }

  const handleAdvanceStatus = (shipment: ShipmentDelivery) => {
    let nextStatus: DeliveryStatus = shipment.status
    let actualDeliveryDate: string | undefined = shipment.actualDeliveryDate

    if (shipment.status === 'Preparando') {
      nextStatus = 'En ruta'
      toast.info(`El envío ${shipment.folio} ha sido recolectado por ${shipment.carrier} y va en ruta.`, 'En tránsito')
    } else if (shipment.status === 'En ruta') {
      nextStatus = 'Entregado'
      const today = new Date()
      actualDeliveryDate = `${String(today.getDate()).padStart(2, '0')} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][today.getMonth()]} ${today.getFullYear()}`
      toast.success(`Entrega del despacho ${shipment.folio} confirmada con firma en destino.`, 'Envío entregado')
    }

    const updated = shipments.map((s) =>
      s.id === shipment.id
        ? { ...s, status: nextStatus, actualDeliveryDate: actualDeliveryDate ?? s.actualDeliveryDate }
        : s
    )
    onUpdateShipments(updated)
  }

  const handleConfirmReturn = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedShipment) return

    const updated = shipments.map((s) =>
      s.id === selectedShipment.id
        ? {
            ...s,
            status: 'Devuelto' as DeliveryStatus,
            notes: `${s.notes ? s.notes + ' · ' : ''}Devolución: ${returnReason.trim() || 'Mercancía devuelta a almacén'}`,
          }
        : s
    )
    onUpdateShipments(updated)
    toast.warning(`Se registró la devolución del despacho ${selectedShipment.folio}.`, 'Devolución registrada')
    setIsReturnModalOpen(false)
    setSelectedShipment(null)
    setReturnReason('')
  }

  const getStatusBadge = (status: DeliveryStatus) => {
    switch (status) {
      case 'Preparando':
        return (
          <span className="ship-status-badge status-prep">
            <Clock size={11} /> Preparando
          </span>
        )
      case 'En ruta':
        return (
          <span className="ship-status-badge status-en-ruta">
            <Truck size={11} /> En ruta
          </span>
        )
      case 'Entregado':
        return (
          <span className="ship-status-badge status-entregado">
            <CheckCircle2 size={11} /> Entregado
          </span>
        )
      case 'Devuelto':
        return (
          <span className="ship-status-badge status-devuelto">
            <RotateCcw size={11} /> Devuelto
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="operations-section-container">
      {/* Top Header & Metrics Bar */}
      <div className="ops-header-strip">
        <div className="ops-header-left">
          <div className="ops-icon-box">
            <Truck size={20} />
          </div>
          <div>
            <h2>Entregas y devoluciones</h2>
            <p>Control de paqueterías, números de guía, confirmaciones de entrega y logística inversa.</p>
          </div>
        </div>

        <div className="ops-header-right">
          <div className="ops-stat-item">
            <span className="ops-stat-label">En preparación</span>
            <strong className="ops-stat-val">{inPrepCount}</strong>
          </div>
          <div className="ops-stat-item">
            <span className="ops-stat-label">En ruta / fletera</span>
            <span className="ops-stat-pill alert">
              <Truck size={12} /> {inTransitCount} en camino
            </span>
          </div>
          <div className="ops-stat-item">
            <span className="ops-stat-label">Entregados</span>
            <span className="ops-stat-pill ok">
              <CheckCircle2 size={12} /> {deliveredCount} cumplidos
            </span>
          </div>
          {returnedCount > 0 && (
            <div className="ops-stat-item">
              <span className="ops-stat-label">Devoluciones</span>
              <strong className="ops-stat-val text-alert">{returnedCount}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="ops-toolbar">
        <div className="ops-filter-group">
          <div className="warehouse-tab-selector">
            {['Todas', 'Preparando', 'En ruta', 'Entregado', 'Devuelto'].map((st) => (
              <button
                key={st}
                className={`wh-tab ${statusFilter === st ? 'active' : ''}`}
                onClick={() => setStatusFilter(st)}
              >
                {st}
                <span className="wh-badge">
                  {st === 'Todas'
                    ? shipments.length
                    : shipments.filter((s) => s.status === st).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="ops-actions-group">
          <button
            className="button button-primary"
            onClick={() => setIsNewShipmentModalOpen(true)}
          >
            <Plus size={14} /> Nuevo despacho
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="ops-subbar">
        <div className="ops-search-input-wrap" style={{ maxWidth: '420px', width: '100%' }}>
          <Search size={14} />
          <input
            type="text"
            placeholder="Buscar por guía, pedido, cliente o transportista..."
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

      {/* Shipments Cards Grid */}
      <div className="shipments-grid">
        {filteredShipments.length === 0 ? (
          <div className="shipments-empty-box">
            No se encontraron despachos con los filtros seleccionados.
          </div>
        ) : (
          filteredShipments.map((shp) => (
            <article key={shp.id} className="shipment-card">
              <div className="ship-card-header">
                <div>
                  <div className="ship-card-folio-row">
                    <span className="ship-folio">{shp.folio}</span>
                    <span className="ship-order-link">Pedido: {shp.orderFolio}</span>
                  </div>
                  <h3>{shp.clientCompany}</h3>
                  <small className="ship-client-name">Receptor: {shp.clientName}</small>
                </div>
                <div>{getStatusBadge(shp.status)}</div>
              </div>

              {/* Carrier & Tracking box */}
              <div className="ship-carrier-box">
                <div className="ship-carrier-left">
                  <Truck size={15} />
                  <div>
                    <strong>{shp.carrier}</strong>
                    <div className="ship-tracking-row">
                      <span>Guía:</span>
                      <code>{shp.trackingNumber}</code>
                    </div>
                  </div>
                </div>
                <div className="ship-packages-badge">
                  <Boxes size={12} /> {shp.packages} {shp.packages === 1 ? 'bulto' : 'bultos'}
                </div>
              </div>

              {/* Address */}
              <div className="ship-address-row">
                <MapPin size={13} />
                <span>{shp.address}</span>
              </div>

              {/* Timeline dates */}
              <div className="ship-dates-row">
                <div>
                  <small>Despacho</small>
                  <strong>{shp.shippingDate}</strong>
                </div>
                <div>
                  <small>Entrega estimada</small>
                  <strong>{shp.estimatedDelivery}</strong>
                </div>
                {shp.actualDeliveryDate && (
                  <div>
                    <small>Recibido en destino</small>
                    <strong style={{ color: '#447b59' }}>{shp.actualDeliveryDate}</strong>
                  </div>
                )}
              </div>

              {shp.notes && <div className="ship-notes-strip">{shp.notes}</div>}

              {/* Stepper visual */}
              <div className="ship-progress-stepper">
                <div className={`step-dot ${shp.status !== 'Devuelto' ? 'active' : ''}`}>
                  <span>1</span>
                  <small>Empaque</small>
                </div>
                <div className="step-bar" />
                <div
                  className={`step-dot ${
                    shp.status === 'En ruta' || shp.status === 'Entregado' ? 'active' : ''
                  }`}
                >
                  <span>2</span>
                  <small>En ruta</small>
                </div>
                <div className="step-bar" />
                <div className={`step-dot ${shp.status === 'Entregado' ? 'active' : ''}`}>
                  <span>3</span>
                  <small>Entregado</small>
                </div>
              </div>

              {/* Actions footer */}
              <div className="ship-card-footer">
                {shp.status === 'Preparando' && (
                  <button
                    className="button button-secondary ship-action-btn"
                    onClick={() => handleAdvanceStatus(shp)}
                  >
                    <Truck size={13} /> Marcar como "En ruta"
                  </button>
                )}
                {shp.status === 'En ruta' && (
                  <button
                    className="button button-primary ship-action-btn"
                    onClick={() => handleAdvanceStatus(shp)}
                  >
                    <PackageCheck size={13} /> Confirmar entrega
                  </button>
                )}
                {shp.status !== 'Devuelto' && shp.status !== 'Entregado' && (
                  <button
                    className="button button-ghost-danger ship-return-btn"
                    onClick={() => {
                      setSelectedShipment(shp)
                      setIsReturnModalOpen(true)
                    }}
                    title="Registrar devolución por incidencia"
                  >
                    <RotateCcw size={12} /> Devolución
                  </button>
                )}
                {shp.status === 'Entregado' && (
                  <div className="delivery-verified-note">
                    <CheckCircle2 size={13} /> Entrega finalizada con éxito
                  </div>
                )}
              </div>
            </article>
          ))
        )}
      </div>

      {/* Modal: Nuevo Despacho */}
      {isNewShipmentModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsNewShipmentModalOpen(false)
          }}
        >
          <section className="create-modal modal-wide" role="dialog" aria-modal="true">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">OPERACIONES · EMBARQUES Y ENTREGAS</div>
                <h2>Nuevo Despacho de Mercancía</h2>
                <p>Genera la guía y registra el envío para seguimiento de transportista.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setIsNewShipmentModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateShipment}>
              <div className="form-grid">
                <label className="form-field">
                  <span>Pedido de venta relacionado *</span>
                  <select
                    value={newOrderFolio}
                    onChange={(e) => setNewOrderFolio(e.target.value)}
                  >
                    {salesOrderFolios.map((folio) => (
                      <option key={folio} value={folio}>
                        {folio}
                      </option>
                    ))}
                    <option value="PED-DIRECTO">Venta directa en mostrador</option>
                  </select>
                </label>

                <label className="form-field">
                  <span>Empresa destinataria *</span>
                  <input
                    required
                    placeholder="Ej. Estudio Nómada"
                    value={newClientCompany}
                    onChange={(e) => setNewClientCompany(e.target.value)}
                  />
                </label>
              </div>

              <div className="form-grid">
                <label className="form-field">
                  <span>Persona que recibe</span>
                  <input
                    placeholder="Ej. Sofía Ramírez"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                  />
                </label>

                <label className="form-field">
                  <span>Empresa transportista *</span>
                  <select
                    value={newCarrier}
                    onChange={(e) => setNewCarrier(e.target.value)}
                  >
                    {CARRIERS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form-grid">
                <label className="form-field">
                  <span>Número de guía o rastreo</span>
                  <input
                    placeholder="Ej. LV-MEX-998201 (vacío para generar automático)"
                    value={newTracking}
                    onChange={(e) => setNewTracking(e.target.value)}
                  />
                </label>

                <label className="form-field">
                  <span>Fecha estimada de entrega</span>
                  <input
                    placeholder="Ej. 14 nov 2026"
                    value={newEstDelivery}
                    onChange={(e) => setNewEstDelivery(e.target.value)}
                  />
                </label>
              </div>

              <div className="form-grid">
                <label className="form-field">
                  <span>Dirección de destino</span>
                  <input
                    placeholder="Ej. Av. Reforma 222, Piso 14, Cuauhtémoc, CDMX"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                  />
                </label>

                <label className="form-field">
                  <span>Número de bultos / cajas *</span>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newPackages}
                    onChange={(e) => setNewPackages(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </label>
              </div>

              <label className="form-field">
                <span>Notas de empaque o manipulación</span>
                <input
                  placeholder="Ej. Frágil, mantener en posición vertical con fleje de seguridad"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                />
              </label>

              <div className="create-modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsNewShipmentModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="button button-primary">
                  <Truck size={14} /> Registrar despacho
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal: Registrar Devolución */}
      {isReturnModalOpen && selectedShipment && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsReturnModalOpen(false)
          }}
        >
          <section className="create-modal" role="dialog" aria-modal="true">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">LOGÍSTICA INVERSA · DEVOLUCIÓN</div>
                <h2>Registrar Devolución · {selectedShipment.folio}</h2>
                <p>Indica la causa por la que el paquete no pudo ser entregado al cliente.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setIsReturnModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmReturn}>
              <label className="form-field">
                <span>Motivo de devolución o incidencia *</span>
                <input
                  required
                  autoFocus
                  placeholder="Ej. Domicilio cerrado en 3 intentos / Rechazado por cliente"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                />
              </label>

              <div className="create-modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsReturnModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="button button-primary">
                  <RotateCcw size={14} /> Confirmar estatus de devuelto
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
