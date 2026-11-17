import { useState, useMemo } from 'react'
import {
  Truck,
  CheckCircle2,
  Building2,
  Clock,
  FileCheck2,
  ArrowDownLeft,
  X,
  Search,
} from 'lucide-react'
import type {
  PurchaseOrder,
  PurchaseOrderStatus,
  InventoryItemLocation,
  StockMovement,
} from '../data/operations'
import { useToast } from './Toast'

interface PurchasesReceptionsProps {
  purchaseOrders: PurchaseOrder[]
  inventory: InventoryItemLocation[]
  movements: StockMovement[]
  canReceiveGoods: boolean
  onUpdatePurchaseOrders: (orders: PurchaseOrder[]) => void
  onUpdateInventory: (inventory: InventoryItemLocation[]) => void
  onAddMovement: (movement: StockMovement) => void
}

export function PurchasesReceptions({
  purchaseOrders,
  inventory,
  movements,
  canReceiveGoods,
  onUpdatePurchaseOrders,
  onUpdateInventory,
  onAddMovement,
}: PurchasesReceptionsProps) {
  const toast = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
  const [receptionQuantities, setReceptionQuantities] = useState<Record<string, number>>({})

  const awaitingDockOrders = useMemo(
    () =>
      purchaseOrders.filter(
        (po) => po.status === 'Emitida' || po.status === 'Recepción parcial'
      ),
    [purchaseOrders]
  )

  const pendingUnitsCount = useMemo(
    () =>
      awaitingDockOrders.reduce(
        (sum, po) =>
          sum +
          po.items.reduce(
            (itemAcc, item) => itemAcc + Math.max(0, item.quantity - item.receivedQty),
            0
          ),
        0
      ),
    [awaitingDockOrders]
  )

  const purchaseMovements = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return movements
      .filter((m) => m.type === 'Entrada')
      .filter((m) => {
        if (!q) return true
        return (
          m.folio.toLowerCase().includes(q) ||
          m.sku.toLowerCase().includes(q) ||
          m.productName.toLowerCase().includes(q) ||
          (m.referenceDoc && m.referenceDoc.toLowerCase().includes(q)) ||
          (m.targetWarehouse && m.targetWarehouse.toLowerCase().includes(q))
        )
      })
  }, [movements, searchQuery])

  const handleOpenReception = (po: PurchaseOrder) => {
    if (!canReceiveGoods) {
      toast.warning(
        'Tu rol actual no tiene permiso para recepcionar mercancía en almacén.',
        'Acceso restringido'
      )
      return
    }
    setSelectedOrder(po)
    const initialMap: Record<string, number> = {}
    po.items.forEach((it) => {
      initialMap[it.id] = Math.max(0, it.quantity - it.receivedQty)
    })
    setReceptionQuantities(initialMap)
  }

  const handleConfirmReception = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrder) return

    let totalReceivingNow = 0
    for (const item of selectedOrder.items) {
      const qtyToReceive = receptionQuantities[item.id] ?? 0
      const remaining = Math.max(0, item.quantity - item.receivedQty)
      if (qtyToReceive < 0 || qtyToReceive > remaining) {
        toast.warning(
          `Cantidad inválida para ${item.name}. Máximo pendiente: ${remaining}.`,
          'Cantidad fuera de rango'
        )
        return
      }
      totalReceivingNow += qtyToReceive
    }

    if (totalReceivingNow === 0) {
      toast.warning(
        'Ingresa al menos una unidad física para confirmar el ingreso.',
        'Sin unidades recibidas'
      )
      return
    }

    const updatedItems = selectedOrder.items.map((item) => {
      const qtyNow = receptionQuantities[item.id] ?? 0
      return { ...item, receivedQty: item.receivedQty + qtyNow }
    })

    const allCompleted = updatedItems.every((it) => it.receivedQty >= it.quantity)
    const nextStatus: PurchaseOrderStatus = allCompleted ? 'Recibida' : 'Recepción parcial'

    onUpdatePurchaseOrders(
      purchaseOrders.map((po) =>
        po.id === selectedOrder.id
          ? { ...po, items: updatedItems, status: nextStatus }
          : po
      )
    )

    const today = new Date()
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    const todayStr = `${String(today.getDate()).padStart(2, '0')} ${months[today.getMonth()]} ${today.getFullYear()}`

    const nextInventory = [...inventory]
    let movIndex = movements.length + 1

    for (const item of selectedOrder.items) {
      const qtyNow = receptionQuantities[item.id] ?? 0
      if (qtyNow <= 0) continue

      const existingIdx = nextInventory.findIndex(
        (inv) => inv.sku === item.sku && inv.warehouseId === selectedOrder.warehouseId
      )

      if (existingIdx >= 0) {
        nextInventory[existingIdx] = {
          ...nextInventory[existingIdx],
          stock: nextInventory[existingIdx].stock + qtyNow,
        }
      } else {
        nextInventory.push({
          id: `inv_${Date.now()}_${movIndex}`,
          productId: `prod_${Date.now()}_${movIndex}`,
          sku: item.sku,
          name: item.name,
          warehouseId: selectedOrder.warehouseId,
          warehouseName: selectedOrder.warehouseName,
          stock: qtyNow,
          reserved: 0,
          inTransit: 0,
          minStock: 2,
          unitOfMeasure: 'pza',
          cost: item.unitCost,
          locationBin: 'Andén Recepción',
        })
      }

      onAddMovement({
        id: `mov_${Date.now()}_${movIndex}`,
        folio: `MOV-2026-${String(movIndex).padStart(3, '0')}`,
        date: todayStr,
        type: 'Entrada',
        sku: item.sku,
        productName: item.name,
        quantity: qtyNow,
        targetWarehouse: selectedOrder.warehouseName,
        referenceDoc: selectedOrder.folio,
        reason: `Recepción en andén (${selectedOrder.supplierCompany})`,
        user: 'Almacén / Compras',
      })
      movIndex++
    }

    onUpdateInventory(nextInventory)
    toast.success(
      `Se recibieron ${totalReceivingNow} unidad(es) de ${selectedOrder.folio} en ${selectedOrder.warehouseName}.`,
      allCompleted ? 'Orden recibida completa' : 'Recepción parcial registrada'
    )
    setSelectedOrder(null)
  }

  return (
    <div className="operations-section-container">
      {/* Header Strip */}
      <div className="ops-header-strip">
        <div className="ops-header-left">
          <div className="ops-icon-box">
            <Truck size={20} />
          </div>
          <div>
            <h2>Andén de Recepciones de Compra</h2>
            <p>
              Valida físicamente las entregas de proveedores e impacta existencias en inventario y Kardex.
            </p>
          </div>
        </div>

        <div className="ops-header-right">
          <div className="ops-stat-item">
            <span className="ops-stat-label">Órdenes en espera</span>
            <strong className="ops-stat-val tabular-nums">{awaitingDockOrders.length}</strong>
          </div>
          <div className="ops-stat-item">
            <span className="ops-stat-label">Unidades por ingresar</span>
            <strong className="ops-stat-val tabular-nums">{pendingUnitsCount} pzas</strong>
          </div>
        </div>
      </div>

      {/* Pending Dock Receptions */}
      <section className="overview-panel-card">
        <div className="panel-heading">
          <div>
            <div className="panel-kicker">ENTREGAS PROGRAMADAS</div>
            <h2>Órdenes listas para recepción física</h2>
          </div>
        </div>

        {awaitingDockOrders.length === 0 ? (
          <div className="ops-all-stocked-note">
            <CheckCircle2 size={15} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
            No hay órdenes de compra pendientes de descarga en andén.
          </div>
        ) : (
          <div className="receptions-dock-grid">
            {awaitingDockOrders.map((po) => {
              const totalOrdered = po.items.reduce((s, it) => s + it.quantity, 0)
              const totalReceived = po.items.reduce((s, it) => s + it.receivedQty, 0)
              const progressPct =
                totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0

              return (
                <article key={po.id} className="reception-dock-card">
                  <div className="reception-dock-top">
                    <div>
                      <span className="po-folio-tag tabular-nums">{po.folio}</span>
                      <h3>{po.supplierCompany}</h3>
                      <small>
                        {po.warehouseName} · Esperada: {po.expectedDeliveryDate}
                      </small>
                    </div>
                    <span
                      className={`order-status-badge ${
                        po.status === 'Recepción parcial' ? 'status-parcial' : 'status-emitida'
                      }`}
                    >
                      {po.status}
                    </span>
                  </div>

                  <div className="reception-progress-wrap">
                    <div className="reception-progress-labels">
                      <span>Avance de descarga</span>
                      <strong className="tabular-nums">
                        {totalReceived} / {totalOrdered} pzas ({progressPct}%)
                      </strong>
                    </div>
                    <div className="wh-progress-track">
                      <span style={{ width: `${progressPct}%`, backgroundColor: '#456a61' }} />
                    </div>
                  </div>

                  <div className="reception-dock-items">
                    {po.items.map((item) => (
                      <div key={item.id} className="reception-dock-item-line">
                        <span>
                          <code>{item.sku}</code> {item.name}
                        </span>
                        <strong className="tabular-nums">
                          {item.receivedQty}/{item.quantity}
                        </strong>
                      </div>
                    ))}
                  </div>

                  <div className="reception-dock-footer">
                    <button
                      type="button"
                      className="button button-primary"
                      onClick={() => handleOpenReception(po)}
                    >
                      <FileCheck2 size={14} /> Recepcionar en almacén
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* Inbound Kardex History */}
      <section className="overview-panel-card">
        <div className="panel-heading">
          <div>
            <div className="panel-kicker">TRAZABILIDAD DE ENTRADAS</div>
            <h2>Historial de ingresos a almacén</h2>
          </div>
          <div className="ops-search-input-wrap" style={{ maxWidth: '320px', width: '100%' }}>
            <Search size={14} />
            <input
              type="text"
              placeholder="Buscar folio, SKU u OC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="table-wrap ops-table-wrap">
          <table className="data-table ops-data-table">
            <thead>
              <tr>
                <th>FOLIO KARDEX</th>
                <th>FECHA</th>
                <th>SKU / ARTÍCULO</th>
                <th style={{ textAlign: 'right' }}>CANTIDAD</th>
                <th>ALMACÉN RECEPTOR</th>
                <th>ORDEN REFERENCIA</th>
                <th>RESPONSABLE</th>
              </tr>
            </thead>
            <tbody>
              {purchaseMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-cell">
                    No se encontraron registros de entrada de mercancía.
                  </td>
                </tr>
              ) : (
                purchaseMovements.map((mov) => (
                  <tr key={mov.id}>
                    <td>
                      <strong className="tabular-nums">{mov.folio}</strong>
                    </td>
                    <td className="date-cell">
                      <div className="date-icon-cell">
                        <Clock size={12} /> {mov.date}
                      </div>
                    </td>
                    <td>
                      <div className="prod-cell">
                        <span className="sku-badge-small">{mov.sku}</span>
                        <strong>{mov.productName}</strong>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }} className="tabular-nums">
                      <strong className="text-positive">
                        <ArrowDownLeft size={12} style={{ verticalAlign: 'text-bottom' }} /> +
                        {mov.quantity}
                      </strong>
                    </td>
                    <td>{mov.targetWarehouse || '—'}</td>
                    <td>
                      <span className="ref-tag">{mov.referenceDoc || '—'}</span>
                    </td>
                    <td className="user-cell">{mov.user}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal: Recepción Física */}
      {selectedOrder && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedOrder(null)
          }}
        >
          <section className="create-modal modal-wide" role="dialog" aria-modal="true">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">COMPRAS · RECEPCIÓN EN ANDÉN</div>
                <h2>Recepcionar {selectedOrder.folio}</h2>
                <p>
                  Confirma cantidades recibidas de <strong>{selectedOrder.supplierCompany}</strong> para{' '}
                  <strong>{selectedOrder.warehouseName}</strong>.
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setSelectedOrder(null)}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmReception}>
              <div className="reception-alert-box">
                <Building2 size={16} />
                <span>
                  El stock se sumará automáticamente a <strong>{selectedOrder.warehouseName}</strong> y generará los folios de entrada correspondientes en el Kardex.
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
                    const currentVal = receptionQuantities[item.id] ?? remaining
                    return (
                      <tr key={item.id}>
                        <td>
                          <span className="sku-badge-small">{item.sku}</span>
                        </td>
                        <td>
                          <strong>{item.name}</strong>
                        </td>
                        <td style={{ textAlign: 'right' }} className="tabular-nums">
                          {item.quantity}
                        </td>
                        <td style={{ textAlign: 'right' }} className="tabular-nums text-positive">
                          {item.receivedQty}
                        </td>
                        <td style={{ textAlign: 'right' }} className="tabular-nums text-alert">
                          <strong>{remaining}</strong>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <input
                            type="number"
                            min="0"
                            max={remaining}
                            className="receiving-qty-input tabular-nums"
                            value={currentVal}
                            onChange={(e) => {
                              const val = Math.max(
                                0,
                                Math.min(remaining, parseInt(e.target.value, 10) || 0)
                              )
                              setReceptionQuantities((prev) => ({ ...prev, [item.id]: val }))
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
                  onClick={() => setSelectedOrder(null)}
                >
                  Cancelar
                </button>
                <button type="submit" className="button button-primary">
                  <CheckCircle2 size={14} /> Confirmar ingreso a inventario
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
