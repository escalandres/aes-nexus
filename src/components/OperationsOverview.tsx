import { useMemo } from 'react'
import {
  Boxes,
  ShoppingBag,
  Truck,
  AlertTriangle,
  ArrowRight,
  MapPin,
  TrendingUp,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  SlidersHorizontal,
} from 'lucide-react'
import type {
  Warehouse,
  InventoryItemLocation,
  StockMovement,
  PurchaseOrder,
  ShipmentDelivery,
  MovementType,
} from '../data/operations'

interface OperationsOverviewProps {
  warehouses: Warehouse[]
  inventory: InventoryItemLocation[]
  movements: StockMovement[]
  purchaseOrders: PurchaseOrder[]
  shipments: ShipmentDelivery[]
  onNavigateSection: (sec: 'Inventario' | 'Traslados' | 'Compras' | 'Entregas' | 'Resumen') => void
}

const money = (val: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(val)

export function OperationsOverview({
  warehouses,
  inventory,
  movements,
  purchaseOrders,
  shipments,
  onNavigateSection,
}: OperationsOverviewProps) {
  // Inventory valuation
  const totalValuation = useMemo(() => {
    return inventory.reduce((acc, it) => acc + it.stock * it.cost, 0)
  }, [inventory])

  // Low stock items
  const lowStockItems = useMemo(() => {
    return inventory.filter((it) => it.stock <= it.minStock)
  }, [inventory])

  // Active in-transit shipments
  const activeShipmentsCount = useMemo(() => {
    return shipments.filter((s) => s.status === 'En ruta').length
  }, [shipments])

  // Pending purchase orders
  const pendingPOs = useMemo(() => {
    return purchaseOrders.filter((po) => po.status === 'Emitida' || po.status === 'Recepción parcial')
  }, [purchaseOrders])

  const pendingPOValue = useMemo(() => {
    return pendingPOs.reduce((acc, po) => acc + po.total, 0)
  }, [pendingPOs])

  const getMovementBadgeClass = (type: MovementType) => {
    switch (type) {
      case 'Entrada':
        return 'badge-entry'
      case 'Salida':
        return 'badge-exit'
      case 'Transferencia':
        return 'badge-transfer'
      case 'Ajuste':
        return 'badge-adjust'
      default:
        return ''
    }
  }

  return (
    <div className="operations-overview-container">
      {/* KPI Top Cards */}
      <div className="ops-kpi-grid">
        <article className="ops-kpi-card highlight">
          <div className="ops-kpi-top">
            <span>VALOR DEL INVENTARIO</span>
            <span className="ops-kpi-icon icon-green">
              <Boxes size={16} />
            </span>
          </div>
          <div className="ops-kpi-val">{money(totalValuation)}</div>
          <div className="ops-kpi-foot">
            <span className="trend trend-up">
              <TrendingUp size={13} /> {inventory.reduce((acc, i) => acc + i.stock, 0)} unidades físicas
            </span>
            <small>en almacenes</small>
          </div>
        </article>

        <article className="ops-kpi-card">
          <div className="ops-kpi-top">
            <span>ALERTAS DE STOCK MÍNIMO</span>
            <span className={`ops-kpi-icon ${lowStockItems.length > 0 ? 'icon-amber' : 'icon-green'}`}>
              <AlertTriangle size={16} />
            </span>
          </div>
          <div className={`ops-kpi-val ${lowStockItems.length > 0 ? 'text-alert' : ''}`}>
            {lowStockItems.length}
          </div>
          <div className="ops-kpi-foot">
            {lowStockItems.length > 0 ? (
              <span className="trend trend-down">Requieren reabastecimiento</span>
            ) : (
              <span className="trend trend-up">Niveles óptimos</span>
            )}
            <small>de {inventory.length} referencias</small>
          </div>
        </article>

        <article className="ops-kpi-card">
          <div className="ops-kpi-top">
            <span>COMPRAS EN ESPERA</span>
            <span className="ops-kpi-icon icon-blue">
              <ShoppingBag size={16} />
            </span>
          </div>
          <div className="ops-kpi-val">{pendingPOs.length}</div>
          <div className="ops-kpi-foot">
            <span className="trend trend-neutral">{money(pendingPOValue)}</span>
            <small>por ingresar a andén</small>
          </div>
        </article>

        <article className="ops-kpi-card">
          <div className="ops-kpi-top">
            <span>DESPACHOS EN RUTA</span>
            <span className="ops-kpi-icon icon-sand">
              <Truck size={16} />
            </span>
          </div>
          <div className="ops-kpi-val">{activeShipmentsCount}</div>
          <div className="ops-kpi-foot">
            <span className="trend trend-up">
              {shipments.filter((s) => s.status === 'Entregado').length} entregados
            </span>
            <small>este periodo</small>
          </div>
        </article>
      </div>

      {/* Middle Split: Warehouses Capacity & Critical Stock Alerts */}
      <div className="ops-overview-split">
        {/* Warehouses Capacity Panel */}
        <section className="ops-panel-card">
          <div className="ops-panel-header">
            <div>
              <div className="panel-kicker">CAPACIDAD Y ALMACENAMIENTO</div>
              <h3>Infraestructura de Almacenes</h3>
            </div>
            <button
              className="text-link"
              onClick={() => onNavigateSection('Inventario')}
            >
              Ver inventario completo <ArrowRight size={13} />
            </button>
          </div>

          <div className="warehouses-capacity-list">
            {warehouses.map((w) => {
              const whItems = inventory.filter((i) => i.warehouseId === w.id)
              const totalUnits = whItems.reduce((acc, i) => acc + i.stock, 0)
              const whValuation = whItems.reduce((acc, i) => acc + i.stock * i.cost, 0)

              return (
                <div key={w.id} className="warehouse-capacity-card">
                  <div className="wh-cap-top">
                    <div>
                      <div className="wh-code-badge">{w.code}</div>
                      <strong>{w.name}</strong>
                      <div className="wh-address-text">
                        <MapPin size={11} /> {w.address}
                      </div>
                    </div>
                    <div className="wh-percent-badge">
                      <span>{w.capacityPercentage}%</span>
                      <small>Ocupación</small>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="wh-progress-track">
                    <span
                      style={{
                        width: `${w.capacityPercentage}%`,
                        backgroundColor:
                          w.capacityPercentage > 85
                            ? '#d6755b'
                            : w.capacityPercentage > 65
                            ? '#456a61'
                            : '#7ba28e',
                      }}
                    />
                  </div>

                  <div className="wh-cap-metrics">
                    <div>
                      <small>Referencias únicas:</small> <strong>{whItems.length} SKUs</strong>
                    </div>
                    <div>
                      <small>Unidades en stock:</small> <strong>{totalUnits} pzas</strong>
                    </div>
                    <div>
                      <small>Valuación:</small> <strong>{money(whValuation)}</strong>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Low Stock Reorder Alerts */}
        <section className="ops-panel-card">
          <div className="ops-panel-header">
            <div>
              <div className="panel-kicker">ATENCIÓN REQUERIDA</div>
              <h3>Puntos de Reorden / Stock Bajo</h3>
            </div>
            <button
              className="text-link"
              onClick={() => onNavigateSection('Compras')}
            >
              Ir a Compras <ArrowRight size={13} />
            </button>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="ops-all-stocked-note">
              <span>¡Excelente! Todos los artículos superan el inventario mínimo de seguridad.</span>
            </div>
          ) : (
            <div className="reorder-items-list">
              {lowStockItems.map((item) => (
                <div key={item.id} className="reorder-item-row">
                  <div className="reorder-item-info">
                    <span className="sku-badge-small">{item.sku}</span>
                    <strong>{item.name}</strong>
                    <div className="reorder-wh-text">
                      <MapPin size={11} /> {item.warehouseName} · Ubicación: {item.locationBin}
                    </div>
                  </div>

                  <div className="reorder-stock-status">
                    <div className="reorder-nums">
                      <span className="current-stock-tag text-alert">
                        {item.stock} disp.
                      </span>
                      <small>Mínimo: {item.minStock}</small>
                    </div>
                    <button
                      className="button button-secondary reorder-btn"
                      onClick={() => onNavigateSection('Compras')}
                      title="Generar orden de reabastecimiento"
                    >
                      <ShoppingBag size={12} /> Comprar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Shortcuts */}
          <div className="ops-shortcuts-box">
            <span className="shortcuts-title">Acciones rápidas operativas</span>
            <div className="shortcuts-grid">
              <button
                className="shortcut-btn"
                onClick={() => onNavigateSection('Inventario')}
              >
                <Boxes size={14} /> Kardex y existencias
              </button>
              <button
                className="shortcut-btn"
                onClick={() => onNavigateSection('Traslados')}
              >
                <ArrowLeftRight size={14} /> Traslados entre ubicaciones
              </button>
              <button
                className="shortcut-btn"
                onClick={() => onNavigateSection('Compras')}
              >
                <ShoppingBag size={14} /> Nueva orden de compra
              </button>
              <button
                className="shortcut-btn"
                onClick={() => onNavigateSection('Entregas')}
              >
                <Truck size={14} /> Rastrear despachos
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Bottom Activity Section: Recent Movements Log */}
      <section className="ops-panel-card" style={{ marginTop: '14px' }}>
        <div className="ops-panel-header">
          <div>
            <div className="panel-kicker">TRAZABILIDAD Y AUDITORÍA</div>
            <h3>Últimos Movimientos de Almacén</h3>
          </div>
          <button
            className="text-link"
            onClick={() => onNavigateSection('Inventario')}
          >
            Ver todos en el Kardex <ArrowRight size={13} />
          </button>
        </div>

        <div className="table-wrap ops-table-wrap">
          <table className="data-table ops-data-table">
            <thead>
              <tr>
                <th>FOLIO</th>
                <th>FECHA</th>
                <th>TIPO</th>
                <th>SKU / PRODUCTO</th>
                <th style={{ textAlign: 'right' }}>CANTIDAD</th>
                <th>UBICACIÓN / TRAYECTO</th>
                <th>REFERENCIA</th>
                <th>RESPONSABLE</th>
              </tr>
            </thead>
            <tbody>
              {movements.slice(0, 5).map((mov) => {
                const isPositive = mov.quantity > 0
                return (
                  <tr key={mov.id}>
                    <td>
                      <strong>{mov.folio}</strong>
                    </td>
                    <td className="date-cell">
                      <div className="date-icon-cell">
                        <Clock size={12} /> {mov.date}
                      </div>
                    </td>
                    <td>
                      <span className={`movement-type-badge ${getMovementBadgeClass(mov.type)}`}>
                        {mov.type === 'Entrada' && <ArrowDownLeft size={11} />}
                        {mov.type === 'Salida' && <ArrowUpRight size={11} />}
                        {mov.type === 'Transferencia' && <ArrowLeftRight size={11} />}
                        {mov.type === 'Ajuste' && <SlidersHorizontal size={11} />}
                        {mov.type}
                      </span>
                    </td>
                    <td>
                      <div className="prod-cell">
                        <span className="sku-badge-small">{mov.sku}</span>
                        <strong>{mov.productName}</strong>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <strong
                        className={
                          mov.type === 'Salida' || mov.quantity < 0
                            ? 'text-negative'
                            : 'text-positive'
                        }
                      >
                        {isPositive && mov.type !== 'Salida' ? `+${mov.quantity}` : mov.quantity}
                      </strong>
                    </td>
                    <td>
                      <div className="warehouse-route-cell">
                        {mov.sourceWarehouse && (
                          <span>
                            {mov.sourceWarehouse}
                            {mov.targetWarehouse ? ' → ' : ''}
                          </span>
                        )}
                        {mov.targetWarehouse && <strong>{mov.targetWarehouse}</strong>}
                      </div>
                    </td>
                    <td>
                      <span className="ref-tag">{mov.referenceDoc || '—'}</span>
                    </td>
                    <td className="user-cell">{mov.user}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
