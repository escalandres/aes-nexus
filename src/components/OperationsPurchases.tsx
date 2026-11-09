import { useState, useMemo } from 'react'
import {
  ShoppingBag,
  Search,
  Plus,
  Truck,
  CheckCircle2,
  Clock,
  X,
  Eye,
  FileCheck2,
  FileText,
  AlertCircle,
  Building2,
  Trash2,
} from 'lucide-react'
import type {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
  Warehouse,
  InventoryItemLocation,
  StockMovement,
} from '../data/operations'
import { useToast } from './Toast'

interface SupplierOption {
  name: string
  company: string
  email: string
}

interface ProductCatalogOption {
  id: string
  sku: string
  name: string
  cost: number
  unitOfMeasure: string
}

interface OperationsPurchasesProps {
  purchaseOrders: PurchaseOrder[]
  warehouses: Warehouse[]
  suppliers: SupplierOption[]
  catalogProducts: ProductCatalogOption[]
  onUpdatePurchaseOrders: (orders: PurchaseOrder[]) => void
  onUpdateInventory: (inventory: InventoryItemLocation[]) => void
  inventory: InventoryItemLocation[]
  onAddMovement: (movement: StockMovement) => void
  movementsCount: number
}

const money = (val: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(val)

export function OperationsPurchases({
  purchaseOrders,
  warehouses,
  suppliers,
  catalogProducts,
  onUpdatePurchaseOrders,
  onUpdateInventory,
  inventory,
  onAddMovement,
  movementsCount,
}: OperationsPurchasesProps) {
  const toast = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('Todas')

  // Modals
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false)
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)

  // New PO form state
  const [newSupplierCompany, setNewSupplierCompany] = useState('')
  const [newWarehouseId, setNewWarehouseId] = useState(warehouses[0]?.id || '')
  const [newExpectedDelivery, setNewExpectedDelivery] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [newItems, setNewItems] = useState<
    Array<{
      productId: string
      sku: string
      name: string
      quantity: number
      unitCost: number
      taxRate: '16%' | '8%' | '0%'
    }>
  >([])

  // Line item adder state
  const [selectedCatalogProdId, setSelectedCatalogProdId] = useState('')
  const [lineQty, setLineQty] = useState(1)
  const [lineCost, setLineCost] = useState(0)

  // Reception form state (holds quantity being received per item ID)
  const [receptionQuantities, setReceptionQuantities] = useState<Record<string, number>>({})

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const matchStatus = statusFilter === 'Todas' || po.status === statusFilter
      const q = searchQuery.toLowerCase()
      const matchSearch =
        !q ||
        po.folio.toLowerCase().includes(q) ||
        po.supplierCompany.toLowerCase().includes(q) ||
        po.warehouseName.toLowerCase().includes(q) ||
        po.items.some((item) => item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q))
      return matchStatus && matchSearch
    })
  }, [purchaseOrders, statusFilter, searchQuery])

  // Summary counts
  const totalPurchasesAmount = useMemo(() => {
    return purchaseOrders.reduce((acc, po) => acc + po.total, 0)
  }, [purchaseOrders])

  const pendingReceptionCount = useMemo(() => {
    return purchaseOrders.filter((po) => po.status === 'Emitida' || po.status === 'Recepción parcial').length
  }, [purchaseOrders])

  // Helpers for line calculation
  const newPOSubtotal = useMemo(() => {
    return newItems.reduce((acc, it) => acc + it.quantity * it.unitCost, 0)
  }, [newItems])

  const newPOTax = useMemo(() => {
    return newPOSubtotal * 0.16
  }, [newPOSubtotal])

  const newPOTotal = newPOSubtotal + newPOTax

  const handleAddLineItem = () => {
    const prod = catalogProducts.find((p) => p.id === selectedCatalogProdId)
    if (!prod) {
      toast.warning('Selecciona un artículo del catálogo para agregar.', 'Selección requerida')
      return
    }

    if (lineQty <= 0) {
      toast.warning('La cantidad debe ser mayor a cero.', 'Cantidad inválida')
      return
    }

    const cost = lineCost > 0 ? lineCost : prod.cost

    setNewItems((prev) => [
      ...prev,
      {
        productId: prod.id,
        sku: prod.sku,
        name: prod.name,
        quantity: lineQty,
        unitCost: cost,
        taxRate: '16%',
      },
    ])

    setSelectedCatalogProdId('')
    setLineQty(1)
    setLineCost(0)
  }

  const handleRemoveLineItem = (idx: number) => {
    setNewItems((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleCreatePurchaseOrder = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSupplierCompany) {
      toast.error('Selecciona un proveedor.', 'Campo requerido')
      return
    }
    if (newItems.length === 0) {
      toast.warning('Agrega al menos una partida a la orden de compra.', 'Sin partidas')
      return
    }

    const sup = suppliers.find((s) => s.company === newSupplierCompany)
    const wh = warehouses.find((w) => w.id === newWarehouseId) || warehouses[0]

    const nextNum = purchaseOrders.length + 1
    const folio = `OC-2026-${String(nextNum).padStart(3, '0')}`

    const today = new Date()
    const formatDate = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][d.getMonth()]} ${d.getFullYear()}`

    const todayStr = formatDate(today)
    const expectedStr = newExpectedDelivery || '15 nov 2026'

    const orderItems: PurchaseOrderItem[] = newItems.map((item, idx) => {
      const sub = item.quantity * item.unitCost
      const tax = sub * 0.16
      return {
        id: `poi_${Date.now()}_${idx}`,
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        receivedQty: 0,
        unitCost: item.unitCost,
        taxRate: item.taxRate,
        subtotal: sub,
        taxAmount: tax,
        total: sub + tax,
      }
    })

    const newPO: PurchaseOrder = {
      id: `po_${Date.now()}`,
      folio,
      supplierCompany: newSupplierCompany,
      supplierContact: sup?.email || 'ventas@proveedor.mx',
      supplierEmail: sup?.email || 'ventas@proveedor.mx',
      date: todayStr,
      expectedDeliveryDate: expectedStr,
      warehouseId: wh.id,
      warehouseName: wh.name,
      items: orderItems,
      subtotal: newPOSubtotal,
      taxTotal: newPOTax,
      total: newPOTotal,
      currency: 'MXN',
      status: 'Emitida',
      notes: newNotes.trim() || undefined,
    }

    onUpdatePurchaseOrders([newPO, ...purchaseOrders])
    toast.success(`Orden de compra ${folio} emitida correctamente para ${newSupplierCompany}.`, 'Orden emitida')

    setIsNewOrderModalOpen(false)
    setNewSupplierCompany('')
    setNewNotes('')
    setNewExpectedDelivery('')
    setNewItems([])
  }

  // Open Reception Modal
  const handleOpenReception = (po: PurchaseOrder) => {
    setSelectedOrder(po)
    // Pre-populate receiving quantities with remaining unreceived qty
    const initialQtyMap: Record<string, number> = {}
    po.items.forEach((item) => {
      const remaining = Math.max(0, item.quantity - item.receivedQty)
      initialQtyMap[item.id] = remaining
    })
    setReceptionQuantities(initialQtyMap)
    setIsReceiveModalOpen(true)
  }

  // Confirm Reception
  const handleConfirmReception = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrder) return

    let totalNewlyReceived = 0
    let allCompleted = true

    const updatedItems = selectedOrder.items.map((item) => {
      const newlyReceived = Number(receptionQuantities[item.id]) || 0
      const currentTotalReceived = item.receivedQty + newlyReceived
      totalNewlyReceived += newlyReceived

      if (currentTotalReceived < item.quantity) {
        allCompleted = false
      }

      return {
        ...item,
        receivedQty: Math.min(item.quantity, currentTotalReceived),
      }
    })

    if (totalNewlyReceived <= 0) {
      toast.warning('Ingresa una cantidad mayor a 0 para recepcionar.', 'Sin mercancía recibida')
      return
    }

    const newStatus: PurchaseOrderStatus = allCompleted ? 'Recibida' : 'Recepción parcial'

    // Update PO in state
    const updatedPOs = purchaseOrders.map((po) =>
      po.id === selectedOrder.id ? { ...po, items: updatedItems, status: newStatus } : po
    )
    onUpdatePurchaseOrders(updatedPOs)

    // Update physical inventory in destination warehouse
    let updatedInventory = [...inventory]
    selectedOrder.items.forEach((item) => {
      const qtyReceived = Number(receptionQuantities[item.id]) || 0
      if (qtyReceived > 0) {
        const invIndex = updatedInventory.findIndex(
          (inv) => inv.sku === item.sku && inv.warehouseId === selectedOrder.warehouseId
        )

        if (invIndex >= 0) {
          updatedInventory[invIndex] = {
            ...updatedInventory[invIndex],
            stock: updatedInventory[invIndex].stock + qtyReceived,
            cost: item.unitCost, // update with latest purchase cost
          }
        } else {
          // Add new inventory location item
          updatedInventory.push({
            id: `inv_${Date.now()}_${item.sku}`,
            productId: `prod_auto_${item.sku}`,
            sku: item.sku,
            name: item.name,
            warehouseId: selectedOrder.warehouseId,
            warehouseName: selectedOrder.warehouseName,
            stock: qtyReceived,
            reserved: 0,
            inTransit: 0,
            minStock: 2,
            cost: item.unitCost,
            unitOfMeasure: 'Pza',
            locationBin: 'Andén 01',
          })
        }

        // Add Stock Movement
        const today = new Date()
        const dateStr = `${String(today.getDate()).padStart(2, '0')} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][today.getMonth()]} ${today.getFullYear()}`
        const newMov: StockMovement = {
          id: `mov_${Date.now()}_${item.sku}`,
          folio: `MOV-2026-${String(movementsCount + 1).padStart(3, '0')}`,
          date: dateStr,
          type: 'Entrada',
          sku: item.sku,
          productName: item.name,
          quantity: qtyReceived,
          targetWarehouse: selectedOrder.warehouseName,
          referenceDoc: selectedOrder.folio,
          reason: `Recepción de compra a ${selectedOrder.supplierCompany}`,
          user: 'Andrea Morales',
        }
        onAddMovement(newMov)
      }
    })

    onUpdateInventory(updatedInventory)

    toast.success(
      `Se registraron ${totalNewlyReceived} unidades en ${selectedOrder.warehouseName}. Folio ${selectedOrder.folio} actualizado.`,
      'Mercancía recepcionada con éxito'
    )

    setIsReceiveModalOpen(false)
    setSelectedOrder(null)
  }

  const getStatusBadge = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'Recibida':
        return (
          <span className="order-status-badge status-recibida">
            <CheckCircle2 size={11} /> Recibida
          </span>
        )
      case 'Emitida':
        return (
          <span className="order-status-badge status-emitida">
            <Clock size={11} /> Emitida
          </span>
        )
      case 'Recepción parcial':
        return (
          <span className="order-status-badge status-parcial">
            <Truck size={11} /> Recepción parcial
          </span>
        )
      case 'Borrador':
        return (
          <span className="order-status-badge status-borrador">
            <FileText size={11} /> Borrador
          </span>
        )
      case 'Cancelada':
        return (
          <span className="order-status-badge status-cancelada">
            <AlertCircle size={11} /> Cancelada
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
            <ShoppingBag size={20} />
          </div>
          <div>
            <h2>Compras y recepciones</h2>
            <p>Genera órdenes de compra a proveedores, valida andenes de descarga e incrementa el stock de almacén.</p>
          </div>
        </div>

        <div className="ops-header-right">
          <div className="ops-stat-item">
            <span className="ops-stat-label">Inversión en compras</span>
            <strong className="ops-stat-val">{money(totalPurchasesAmount)}</strong>
          </div>
          <div className="ops-stat-item">
            <span className="ops-stat-label">Pendientes de entrega</span>
            <span className={`ops-stat-pill ${pendingReceptionCount > 0 ? 'alert' : 'ok'}`}>
              <Truck size={12} /> {pendingReceptionCount} órdenes activas
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="ops-toolbar">
        <div className="ops-filter-group">
          <div className="warehouse-tab-selector">
            {['Todas', 'Emitida', 'Recepción parcial', 'Recibida', 'Borrador'].map((st) => (
              <button
                key={st}
                className={`wh-tab ${statusFilter === st ? 'active' : ''}`}
                onClick={() => setStatusFilter(st)}
              >
                {st}
                <span className="wh-badge">
                  {st === 'Todas'
                    ? purchaseOrders.length
                    : purchaseOrders.filter((po) => po.status === st).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="ops-actions-group">
          <button
            className="button button-primary"
            onClick={() => {
              if (suppliers.length > 0) setNewSupplierCompany(suppliers[0].company)
              setIsNewOrderModalOpen(true)
            }}
          >
            <Plus size={14} /> Nueva orden de compra
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="ops-subbar">
        <div className="ops-search-input-wrap" style={{ maxWidth: '420px', width: '100%' }}>
          <Search size={14} />
          <input
            type="text"
            placeholder="Buscar por folio, proveedor, almacén o producto..."
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

      {/* Orders Table */}
      <div className="table-wrap ops-table-wrap">
        <table className="data-table ops-data-table">
          <thead>
            <tr>
              <th>FOLIO</th>
              <th>PROVEEDOR</th>
              <th>FECHA EMISIÓN</th>
              <th>FECHA ESPERADA</th>
              <th>ALMACÉN DESTINO</th>
              <th>PARTIDAS</th>
              <th style={{ textAlign: 'right' }}>TOTAL (CON IVA)</th>
              <th>ESTADO</th>
              <th style={{ textAlign: 'right' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-cell">
                  No se encontraron órdenes de compra registradas.
                </td>
              </tr>
            ) : (
              filteredOrders.map((po) => {
                const canReceive = po.status === 'Emitida' || po.status === 'Recepción parcial'
                const totalItemsQty = po.items.reduce((acc, it) => acc + it.quantity, 0)
                const totalReceivedQty = po.items.reduce((acc, it) => acc + it.receivedQty, 0)

                return (
                  <tr key={po.id}>
                    <td>
                      <span className="po-folio-tag">{po.folio}</span>
                    </td>
                    <td>
                      <div className="supplier-cell">
                        <strong>{po.supplierCompany}</strong>
                        <small>{po.supplierContact}</small>
                      </div>
                    </td>
                    <td className="date-cell">{po.date}</td>
                    <td className="date-cell">{po.expectedDeliveryDate}</td>
                    <td>
                      <span className="warehouse-name-cell">{po.warehouseName}</span>
                    </td>
                    <td>
                      <div className="order-items-summary">
                        <strong>
                          {po.items.length} {po.items.length === 1 ? 'partida' : 'partidas'}
                        </strong>
                        <small>
                          {totalReceivedQty} de {totalItemsQty} u. recibidas
                        </small>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }} className="money-cell">
                      <strong>{money(po.total)}</strong>
                      <small style={{ display: 'block', color: '#88948d', fontSize: '8px' }}>
                        {po.currency}
                      </small>
                    </td>
                    <td>{getStatusBadge(po.status)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="po-actions-row">
                        <button
                          className="button-icon-action"
                          title="Ver detalle de la orden"
                          onClick={() => {
                            setSelectedOrder(po)
                            setIsDetailModalOpen(true)
                          }}
                        >
                          <Eye size={13} /> Detalle
                        </button>
                        {canReceive && (
                          <button
                            className="button-icon-action action-receive"
                            title="Registrar recepción de mercancía"
                            onClick={() => handleOpenReception(po)}
                          >
                            <FileCheck2 size={13} /> Recepcionar
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

      {/* Modal: Nueva Orden de Compra */}
      {isNewOrderModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsNewOrderModalOpen(false)
          }}
        >
          <section className="create-modal modal-wide" role="dialog" aria-modal="true">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">OPERACIONES · ABASTECIMIENTO</div>
                <h2>Nueva Orden de Compra</h2>
                <p>Genera el documento de solicitud de mercancía a proveedores autorizados.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setIsNewOrderModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePurchaseOrder}>
              <div className="form-grid">
                <label className="form-field">
                  <span>Proveedor *</span>
                  <select
                    required
                    value={newSupplierCompany}
                    onChange={(e) => setNewSupplierCompany(e.target.value)}
                  >
                    <option value="">Selecciona proveedor...</option>
                    {suppliers.map((s) => (
                      <option key={s.company} value={s.company}>
                        {s.company} ({s.name})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-field">
                  <span>Almacén de destino *</span>
                  <select
                    required
                    value={newWarehouseId}
                    onChange={(e) => setNewWarehouseId(e.target.value)}
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.city})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form-grid">
                <label className="form-field">
                  <span>Fecha esperada de entrega</span>
                  <input
                    type="text"
                    placeholder="Ej. 18 nov 2026"
                    value={newExpectedDelivery}
                    onChange={(e) => setNewExpectedDelivery(e.target.value)}
                  />
                </label>

                <label className="form-field">
                  <span>Notas e instrucciones de descarga</span>
                  <input
                    placeholder="Ej. Entregar en andén con copia de factura impresa"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                  />
                </label>
              </div>

              {/* Items Section */}
              <div className="po-items-builder-box">
                <div className="po-builder-title">
                  <ShoppingBag size={14} /> Partidas de la orden de compra
                </div>

                {newItems.length > 0 ? (
                  <table className="po-builder-table">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>DESCRIPCIÓN</th>
                        <th style={{ textAlign: 'right' }}>CANTIDAD</th>
                        <th style={{ textAlign: 'right' }}>COSTO UNIT.</th>
                        <th style={{ textAlign: 'right' }}>SUBTOTAL</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {newItems.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            <span className="sku-badge-small">{item.sku}</span>
                          </td>
                          <td>
                            <strong>{item.name}</strong>
                          </td>
                          <td style={{ textAlign: 'right' }}>{item.quantity} pzas</td>
                          <td style={{ textAlign: 'right' }}>{money(item.unitCost)}</td>
                          <td style={{ textAlign: 'right' }}>
                            <strong>{money(item.quantity * item.unitCost)}</strong>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn-remove-line"
                              onClick={() => handleRemoveLineItem(idx)}
                              title="Eliminar partida"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="po-empty-lines-hint">
                    No has agregado partidas. Utiliza la barra inferior para añadir productos a esta orden.
                  </div>
                )}

                {/* Line Item Adder */}
                <div className="po-add-line-strip">
                  <div className="po-add-prod-select">
                    <label>Producto o servicio de catálogo</label>
                    <select
                      value={selectedCatalogProdId}
                      onChange={(e) => {
                        const pid = e.target.value
                        setSelectedCatalogProdId(pid)
                        const found = catalogProducts.find((p) => p.id === pid)
                        if (found) setLineCost(found.cost)
                      }}
                    >
                      <option value="">Selecciona artículo de catálogo...</option>
                      {catalogProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.sku}] {p.name} (Costo base: {money(p.cost)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="po-add-qty">
                    <label>Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      value={lineQty}
                      onChange={(e) => setLineQty(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>

                  <div className="po-add-cost">
                    <label>Costo pactado (MXN)</label>
                    <input
                      type="number"
                      min="0"
                      value={lineCost}
                      onChange={(e) => setLineCost(Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                  </div>

                  <button
                    type="button"
                    className="button button-secondary po-add-btn"
                    onClick={handleAddLineItem}
                  >
                    <Plus size={13} /> Añadir partida
                  </button>
                </div>

                {/* Totals Preview */}
                <div className="po-totals-box">
                  <div className="po-totals-row">
                    <span>Subtotal:</span>
                    <strong>{money(newPOSubtotal)}</strong>
                  </div>
                  <div className="po-totals-row">
                    <span>IVA (16%):</span>
                    <strong>{money(newPOTax)}</strong>
                  </div>
                  <div className="po-totals-row grand">
                    <span>Total de la orden:</span>
                    <strong>{money(newPOTotal)} MXN</strong>
                  </div>
                </div>
              </div>

              <div className="create-modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsNewOrderModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="button button-primary">
                  <ShoppingBag size={14} /> Emitir orden de compra
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal: Recepción de Mercancía */}
      {isReceiveModalOpen && selectedOrder && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsReceiveModalOpen(false)
          }}
        >
          <section className="create-modal modal-wide" role="dialog" aria-modal="true">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">OPERACIONES · ANDÉN DE DESCARGA</div>
                <h2>Recepción de Mercancía · {selectedOrder.folio}</h2>
                <p>
                  Confirma las cantidades físicas recibidas de <strong>{selectedOrder.supplierCompany}</strong> para el{' '}
                  <strong>{selectedOrder.warehouseName}</strong>.
                </p>
              </div>
              <button
                className="icon-button"
                onClick={() => setIsReceiveModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmReception}>
              <div className="reception-alert-box">
                <Building2 size={16} />
                <span>
                  Al confirmar la recepción, las cantidades ingresadas se sumarán automáticamente al stock físico de{' '}
                  <strong>{selectedOrder.warehouseName}</strong> y se generará un movimiento de entrada en el Kardex.
                </span>
              </div>

              <table className="po-builder-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>PRODUCTO</th>
                    <th style={{ textAlign: 'right' }}>ORDENADO</th>
                    <th style={{ textAlign: 'right' }}>YA RECIBIDO</th>
                    <th style={{ textAlign: 'right' }}>PENDIENTE</th>
                    <th style={{ textAlign: 'right', width: '130px' }}>RECIBIR AHORA</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map((item) => {
                    const remaining = Math.max(0, item.quantity - item.receivedQty)
                    const currentReceiving = receptionQuantities[item.id] ?? remaining
                    return (
                      <tr key={item.id}>
                        <td>
                          <span className="sku-badge-small">{item.sku}</span>
                        </td>
                        <td>
                          <strong>{item.name}</strong>
                        </td>
                        <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right', color: '#5b8971' }}>{item.receivedQty}</td>
                        <td style={{ textAlign: 'right', color: '#c07b62' }}>
                          <strong>{remaining}</strong>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <input
                            type="number"
                            min="0"
                            max={remaining}
                            className="receiving-qty-input"
                            value={currentReceiving}
                            onChange={(e) => {
                              const val = Math.max(
                                0,
                                Math.min(remaining, parseInt(e.target.value) || 0)
                              )
                              setReceptionQuantities((prev) => ({
                                ...prev,
                                [item.id]: val,
                              }))
                            }}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <div className="create-modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsReceiveModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="button button-primary">
                  <CheckCircle2 size={14} /> Confirmar recepción en almacén
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal: Detalle de Orden */}
      {isDetailModalOpen && selectedOrder && (
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
                <div className="panel-kicker">ORDEN DE COMPRA · DETALLE</div>
                <h2>{selectedOrder.folio}</h2>
                <p>Información de proveedor, partidas contratadas y estatus de recepción.</p>
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
                <span>Proveedor</span>
                <strong>{selectedOrder.supplierCompany}</strong>
                <small>{selectedOrder.supplierContact}</small>
              </div>
              <div className="po-detail-card">
                <span>Almacén de destino</span>
                <strong>{selectedOrder.warehouseName}</strong>
                <small>Fecha esperada: {selectedOrder.expectedDeliveryDate}</small>
              </div>
              <div className="po-detail-card">
                <span>Estatus</span>
                <div>{getStatusBadge(selectedOrder.status)}</div>
                <small>Fecha emisión: {selectedOrder.date}</small>
              </div>
            </div>

            <table className="po-builder-table" style={{ marginTop: '14px' }}>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>DESCRIPCIÓN</th>
                  <th style={{ textAlign: 'right' }}>ORDENADO</th>
                  <th style={{ textAlign: 'right' }}>RECIBIDO</th>
                  <th style={{ textAlign: 'right' }}>COSTO UNIT.</th>
                  <th style={{ textAlign: 'right' }}>SUBTOTAL</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrder.items.map((it) => (
                  <tr key={it.id}>
                    <td>
                      <span className="sku-badge-small">{it.sku}</span>
                    </td>
                    <td>
                      <strong>{it.name}</strong>
                    </td>
                    <td style={{ textAlign: 'right' }}>{it.quantity} pzas</td>
                    <td style={{ textAlign: 'right' }}>{it.receivedQty} pzas</td>
                    <td style={{ textAlign: 'right' }}>{money(it.unitCost)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <strong>{money(it.subtotal)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="po-totals-box" style={{ marginTop: '14px' }}>
              <div className="po-totals-row">
                <span>Subtotal:</span>
                <strong>{money(selectedOrder.subtotal)}</strong>
              </div>
              <div className="po-totals-row">
                <span>IVA (16%):</span>
                <strong>{money(selectedOrder.taxTotal)}</strong>
              </div>
              <div className="po-totals-row grand">
                <span>Total:</span>
                <strong>{money(selectedOrder.total)} MXN</strong>
              </div>
            </div>

            {selectedOrder.notes && (
              <div className="po-notes-preview">
                <strong>Notas de entrega:</strong>
                <p>{selectedOrder.notes}</p>
              </div>
            )}

            <div className="create-modal-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setIsDetailModalOpen(false)}
              >
                Cerrar
              </button>
              {(selectedOrder.status === 'Emitida' || selectedOrder.status === 'Recepción parcial') && (
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => {
                    setIsDetailModalOpen(false)
                    handleOpenReception(selectedOrder)
                  }}
                >
                  <FileCheck2 size={14} /> Proceder a recepcionar
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
