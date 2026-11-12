import { useState, useMemo } from 'react'
import {
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  SlidersHorizontal,
  Search,
  AlertTriangle,
  CheckCircle2,
  X,
  History,
  Layers,
  MapPin,
  Download,
} from 'lucide-react'
import type {
  Warehouse,
  InventoryItemLocation,
  StockMovement,
  MovementType,
} from '../data/operations'
import { Skeleton } from 'boneyard-js/react'
import { inventoryTableBones } from '../bones/registry'
import { useToast } from './Toast'

interface OperationsInventoryProps {
  warehouses: Warehouse[]
  inventory: InventoryItemLocation[]
  movements: StockMovement[]
  onUpdateInventory: (items: InventoryItemLocation[]) => void
  onAddMovement: (movement: StockMovement) => void
}

const money = (val: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(val)

export function OperationsInventory({
  warehouses,
  inventory,
  movements,
  onUpdateInventory,
  onAddMovement,
}: OperationsInventoryProps) {
  const toast = useToast()
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'stock' | 'movements'>('stock')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false)
  const [isInventoryLoading, setIsInventoryLoading] = useState(false)

  const handleWarehouseChange = (whId: string) => {
    setSelectedWarehouseId(whId)
    setIsInventoryLoading(true)
    setTimeout(() => setIsInventoryLoading(false), 320)
  }

  const handleTabChange = (tab: 'stock' | 'movements') => {
    setActiveTab(tab)
    setIsInventoryLoading(true)
    setTimeout(() => setIsInventoryLoading(false), 320)
  }

  // Modals
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false)

  // Threshold configuration state
  const [thresholdItemId, setThresholdItemId] = useState('')
  const [thresholdValue, setThresholdValue] = useState<number>(0)

  // Adjustment form state
  const [adjustItemId, setAdjustItemId] = useState('')
  const [adjustType, setAdjustType] = useState<'Ajuste positivo' | 'Ajuste negativo'>('Ajuste positivo')
  const [adjustQty, setAdjustQty] = useState(1)
  const [adjustReason, setAdjustReason] = useState('')
  const [adjustReference, setAdjustReference] = useState('')

  // Transfer form state
  const [transferItemId, setTransferItemId] = useState('')
  const [targetWarehouseId, setTargetWarehouseId] = useState('')
  const [transferQty, setTransferQty] = useState(1)
  const [transferNotes, setTransferNotes] = useState('')

  // Currently selected item for threshold configuration
  const selectedThresholdItem = useMemo(() => {
    if (thresholdItemId) {
      const found = inventory.find((i) => i.id === thresholdItemId)
      if (found) return found
    }
    return inventory.find((i) => i.stock <= i.minStock) || inventory[0] || null
  }, [inventory, thresholdItemId])

  // Open threshold configuration modal
  const handleOpenThresholdModal = (itemId?: string) => {
    const target = itemId
      ? inventory.find((i) => i.id === itemId)
      : inventory.find((i) => i.stock <= i.minStock) || inventory[0]
    if (target) {
      setThresholdItemId(target.id)
      setThresholdValue(target.minStock)
    }
    setIsThresholdModalOpen(true)
  }

  // Save single threshold
  const handleSaveThreshold = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedThresholdItem) return

    const updatedVal = Math.max(0, thresholdValue)
    const updatedList = inventory.map((i) =>
      i.id === selectedThresholdItem.id ? { ...i, minStock: updatedVal } : i
    )
    onUpdateInventory(updatedList)

    if (selectedThresholdItem.stock <= updatedVal) {
      toast.warning(
        `Alerta activada: El stock disponible (${selectedThresholdItem.stock} uds.) de "${selectedThresholdItem.name}" quedó en o por debajo del nuevo umbral mínimo (${updatedVal}). Se disparó una alerta visual en el Dashboard Ejecutivo.`,
        'Alerta de stock activada'
      )
    } else {
      toast.success(
        `Umbral mínimo para ${selectedThresholdItem.sku} (${selectedThresholdItem.name}) actualizado a ${updatedVal} unidades. Nivel de existencias seguro.`,
        'Umbral configurado'
      )
    }
  }

  // Quick batch adjust from table
  const handleQuickSaveItemThreshold = (itemId: string, newMin: number) => {
    const target = inventory.find((i) => i.id === itemId)
    if (!target) return
    const safeMin = Math.max(0, newMin)
    const updatedList = inventory.map((i) =>
      i.id === itemId ? { ...i, minStock: safeMin } : i
    )
    onUpdateInventory(updatedList)
    if (target.stock <= safeMin) {
      toast.warning(
        `Alerta de stock: ${target.sku} (${target.stock} uds.) cayó en o por debajo del nuevo umbral (${safeMin}). Alerta visible en Dashboard.`,
        'Umbral mínimo modificado'
      )
    } else {
      toast.success(
        `Umbral de ${target.sku} ajustado a ${safeMin} unidades.`,
        'Umbral actualizado'
      )
    }
  }

  // Filtered inventory
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const matchWarehouse =
        selectedWarehouseId === 'all' || item.warehouseId === selectedWarehouseId
      const q = searchQuery.toLowerCase()
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.locationBin.toLowerCase().includes(q)
      const matchLowStock = filterLowStockOnly ? item.stock <= item.minStock : true
      return matchWarehouse && matchSearch && matchLowStock
    })
  }, [inventory, selectedWarehouseId, searchQuery, filterLowStockOnly])

  // Filtered movements
  const filteredMovements = useMemo(() => {
    return movements.filter((mov) => {
      const q = searchQuery.toLowerCase()
      const matchSearch =
        !q ||
        mov.sku.toLowerCase().includes(q) ||
        mov.productName.toLowerCase().includes(q) ||
        mov.folio.toLowerCase().includes(q) ||
        mov.reason.toLowerCase().includes(q) ||
        (mov.referenceDoc && mov.referenceDoc.toLowerCase().includes(q))
      return matchSearch
    })
  }, [movements, searchQuery])

  // Summary counts
  const totalStockValuation = useMemo(() => {
    return filteredInventory.reduce((acc, item) => acc + item.stock * item.cost, 0)
  }, [filteredInventory])

  const lowStockCount = useMemo(() => {
    return inventory.filter((i) => i.stock <= i.minStock).length
  }, [inventory])

  // Helper to escape values safely for CSV format
  const escapeCSV = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return '""'
    const stringVal = String(value)
    return `"${stringVal.replace(/"/g, '""')}"`
  }

  // Handle Export CSV of current view (existencias, almacén, estado de stock)
  const handleExportCSV = () => {
    if (activeTab === 'stock') {
      if (filteredInventory.length === 0) {
        toast.warning(
          'No hay existencias para exportar con los filtros seleccionados.',
          'Sin registros'
        )
        return
      }

      const headers = [
        'SKU',
        'PRODUCTO',
        'ALMACÉN',
        'UBICACIÓN',
        'EXISTENCIAS DISPONIBLES',
        'STOCK RESERVADO',
        'STOCK EN TRÁNSITO',
        'UMBRAL MÍNIMO',
        'UNIDAD DE MEDIDA',
        'COSTO UNITARIO (MXN)',
        'VALOR TOTAL (MXN)',
        'ESTADO DE STOCK',
      ]

      const rows = filteredInventory.map((item) => {
        const isLow = item.stock <= item.minStock
        const status = isLow ? 'Bajo umbral (Alerta crítica)' : 'Nivel seguro (Óptimo)'
        const lineTotal = (item.stock * item.cost).toFixed(2)

        return [
          escapeCSV(item.sku),
          escapeCSV(item.name),
          escapeCSV(item.warehouseName),
          escapeCSV(item.locationBin),
          escapeCSV(item.stock),
          escapeCSV(item.reserved),
          escapeCSV(item.inTransit),
          escapeCSV(item.minStock),
          escapeCSV(item.unitOfMeasure),
          escapeCSV(item.cost.toFixed(2)),
          escapeCSV(lineTotal),
          escapeCSV(status),
        ].join(',')
      })

      // UTF-8 BOM (\uFEFF) ensures Excel and spreadsheet readers render special characters correctly
      const csvContent = '\uFEFF' + [headers.map(escapeCSV).join(','), ...rows].join('\r\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const dateStr = new Date().toISOString().split('T')[0]
      const whName =
        selectedWarehouseId === 'all'
          ? 'todos_los_almacenes'
          : (warehouses.find((w) => w.id === selectedWarehouseId)?.name || 'almacen')
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '_')

      link.href = url
      link.download = `inventario_${whName}_${dateStr}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(
        `Se descargó el archivo CSV con ${filteredInventory.length} artículos del inventario.`,
        'Descarga completada'
      )
    } else {
      if (filteredMovements.length === 0) {
        toast.warning(
          'No hay movimientos en el kardex para exportar.',
          'Sin registros'
        )
        return
      }

      const headers = [
        'FOLIO',
        'FECHA',
        'TIPO',
        'SKU',
        'PRODUCTO',
        'CANTIDAD',
        'ALMACÉN ORIGEN',
        'ALMACÉN DESTINO',
        'DOC REFERENCIA',
        'MOTIVO',
        'USUARIO',
      ]

      const rows = filteredMovements.map((mov) => [
        escapeCSV(mov.folio),
        escapeCSV(mov.date),
        escapeCSV(mov.type),
        escapeCSV(mov.sku),
        escapeCSV(mov.productName),
        escapeCSV(mov.quantity),
        escapeCSV(mov.sourceWarehouse || '—'),
        escapeCSV(mov.targetWarehouse || '—'),
        escapeCSV(mov.referenceDoc || '—'),
        escapeCSV(mov.reason),
        escapeCSV(mov.user),
      ].join(','))

      const csvContent = '\uFEFF' + [headers.map(escapeCSV).join(','), ...rows].join('\r\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const dateStr = new Date().toISOString().split('T')[0]

      link.href = url
      link.download = `kardex_movimientos_${dateStr}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(
        `Se descargó el archivo CSV con ${filteredMovements.length} movimientos de inventario.`,
        'Descarga completada'
      )
    }
  }

  // Handle Adjustment Submit
  const handleConfirmAdjustment = (e: React.FormEvent) => {
    e.preventDefault()
    const targetItem = inventory.find((i) => i.id === adjustItemId)
    if (!targetItem) {
      toast.error('Selecciona un artículo de inventario.', 'Error')
      return
    }

    if (adjustQty <= 0) {
      toast.warning('La cantidad debe ser mayor a 0.', 'Cantidad inválida')
      return
    }

    const delta = adjustType === 'Ajuste positivo' ? adjustQty : -adjustQty
    if (adjustType === 'Ajuste negativo' && targetItem.stock - adjustQty < 0) {
      toast.warning(
        `El ajuste negativo no puede exceder el stock actual (${targetItem.stock} unidades).`,
        'Stock insuficiente'
      )
      return
    }

    const updatedStock = Math.max(0, targetItem.stock + delta)
    const updatedList = inventory.map((i) =>
      i.id === targetItem.id ? { ...i, stock: updatedStock } : i
    )
    onUpdateInventory(updatedList)

    const nextMovFolio = `MOV-2026-${String(movements.length + 1).padStart(3, '0')}`
    const today = new Date()
    const dateStr = `${String(today.getDate()).padStart(2, '0')} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][today.getMonth()]} ${today.getFullYear()}`

    const newMov: StockMovement = {
      id: `mov_${Date.now()}`,
      folio: nextMovFolio,
      date: dateStr,
      type: 'Ajuste',
      sku: targetItem.sku,
      productName: targetItem.name,
      quantity: delta,
      sourceWarehouse: targetItem.warehouseName,
      referenceDoc: adjustReference.trim() || 'AJUSTE-MANUAL',
      reason: adjustReason.trim() || 'Ajuste de inventario físico verificado',
      user: 'Andrea Morales',
    }
    onAddMovement(newMov)

    toast.success(
      `Se ajustó el stock de ${targetItem.sku} a ${updatedStock} unidades.`,
      'Ajuste registrado'
    )
    setIsAdjustModalOpen(false)
    setAdjustItemId('')
    setAdjustQty(1)
    setAdjustReason('')
    setAdjustReference('')
  }

  // Handle Transfer Submit
  const handleConfirmTransfer = (e: React.FormEvent) => {
    e.preventDefault()
    const sourceItem = inventory.find((i) => i.id === transferItemId)
    if (!sourceItem) {
      toast.error('Selecciona el artículo origen.', 'Error')
      return
    }

    if (!targetWarehouseId || targetWarehouseId === sourceItem.warehouseId) {
      toast.warning('Selecciona un almacén de destino diferente.', 'Almacén inválido')
      return
    }

    if (transferQty <= 0 || transferQty > sourceItem.stock) {
      toast.warning(
        `Cantidad no válida. Disponible en ${sourceItem.warehouseName}: ${sourceItem.stock} unidades.`,
        'Stock insuficiente'
      )
      return
    }

    const targetWarehouse = warehouses.find((w) => w.id === targetWarehouseId)
    if (!targetWarehouse) return

    // Update or create target item in that warehouse
    let targetItem = inventory.find(
      (i) => i.productId === sourceItem.productId && i.warehouseId === targetWarehouseId
    )

    let updatedInventory = inventory.map((i) => {
      if (i.id === sourceItem.id) {
        return { ...i, stock: i.stock - transferQty }
      }
      return i
    })

    if (targetItem) {
      updatedInventory = updatedInventory.map((i) =>
        i.id === targetItem!.id ? { ...i, stock: i.stock + transferQty } : i
      )
    } else {
      const newItem: InventoryItemLocation = {
        id: `inv_${Date.now()}`,
        productId: sourceItem.productId,
        sku: sourceItem.sku,
        name: sourceItem.name,
        warehouseId: targetWarehouse.id,
        warehouseName: targetWarehouse.name,
        stock: transferQty,
        reserved: 0,
        inTransit: 0,
        minStock: sourceItem.minStock,
        cost: sourceItem.cost,
        unitOfMeasure: sourceItem.unitOfMeasure,
        locationBin: 'Recepción N-01',
      }
      updatedInventory.push(newItem)
    }

    onUpdateInventory(updatedInventory)

    const nextMovFolio = `TRF-2026-${String(movements.length + 1).padStart(3, '0')}`
    const today = new Date()
    const dateStr = `${String(today.getDate()).padStart(2, '0')} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][today.getMonth()]} ${today.getFullYear()}`

    const newMov: StockMovement = {
      id: `mov_${Date.now()}`,
      folio: nextMovFolio,
      date: dateStr,
      type: 'Transferencia',
      sku: sourceItem.sku,
      productName: sourceItem.name,
      quantity: transferQty,
      sourceWarehouse: sourceItem.warehouseName,
      targetWarehouse: targetWarehouse.name,
      referenceDoc: nextMovFolio,
      reason: transferNotes.trim() || 'Rebalanceo entre almacenes',
      user: 'Andrea Morales',
    }
    onAddMovement(newMov)

    toast.success(
      `Se transfirieron ${transferQty} unidades a ${targetWarehouse.name}.`,
      'Transferencia exitosa'
    )
    setIsTransferModalOpen(false)
    setTransferItemId('')
    setTargetWarehouseId('')
    setTransferQty(1)
    setTransferNotes('')
  }

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
    <div className="operations-section-container">
      {/* Top Header & Metrics Bar */}
      <div className="ops-header-strip">
        <div className="ops-header-left">
          <div className="ops-icon-box">
            <Boxes size={20} />
          </div>
          <div>
            <h2>Inventario por almacén</h2>
            <p>Monitorea existencias físicas, ubicaciones de rack y trazabilidad de movimientos en tiempo real.</p>
          </div>
        </div>

        <div className="ops-header-right">
          <div className="ops-stat-item">
            <span className="ops-stat-label">Valoración total</span>
            <strong className="ops-stat-val">{money(totalStockValuation)}</strong>
          </div>
          <div className="ops-stat-item">
            <span className="ops-stat-label">Stock bajo mínimo</span>
            <span className={`ops-stat-pill ${lowStockCount > 0 ? 'alert' : 'ok'}`}>
              {lowStockCount > 0 ? (
                <>
                  <AlertTriangle size={12} /> {lowStockCount} artículos
                </>
              ) : (
                <>
                  <CheckCircle2 size={12} /> Óptimo
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Control bar: Warehouse Tabs, Search, Actions */}
      <div className="ops-toolbar">
        <div className="ops-filter-group">
          <div className="warehouse-tab-selector" role="tablist">
            <button
              className={`wh-tab ${selectedWarehouseId === 'all' ? 'active' : ''}`}
              onClick={() => handleWarehouseChange('all')}
            >
              <Layers size={13} />
              Todos los almacenes
              <span className="wh-badge">{inventory.length}</span>
            </button>
            {warehouses.map((w) => {
              const count = inventory.filter((i) => i.warehouseId === w.id).length
              return (
                <button
                  key={w.id}
                  className={`wh-tab ${selectedWarehouseId === w.id ? 'active' : ''}`}
                  onClick={() => handleWarehouseChange(w.id)}
                >
                  <MapPin size={13} />
                  {w.name}
                  <span className="wh-badge">{count}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="ops-actions-group">
          <button
            type="button"
            className="button button-secondary ops-export-main-btn"
            onClick={handleExportCSV}
            title={
              activeTab === 'stock'
                ? `Exportar ${filteredInventory.length} artículos de la vista actual a archivo CSV`
                : `Exportar ${filteredMovements.length} movimientos de la vista actual a archivo CSV`
            }
          >
            <Download size={14} /> Exportar CSV
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              if (inventory.length > 0) setAdjustItemId(inventory[0].id)
              setIsAdjustModalOpen(true)
            }}
          >
            <SlidersHorizontal size={14} /> Ajuste de inventario
          </button>
          <button
            type="button"
            className="button button-secondary ops-threshold-btn"
            onClick={() => handleOpenThresholdModal()}
            title="Configurar umbrales mínimos de stock por producto para disparar alertas"
          >
            <AlertTriangle size={14} style={{ color: lowStockCount > 0 ? '#ba4836' : 'inherit' }} />
            Umbrales de stock
            {lowStockCount > 0 && (
              <span className="threshold-alert-counter" title={`${lowStockCount} productos bajo umbral mínimo`}>
                {lowStockCount}
              </span>
            )}
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={() => {
              if (inventory.length > 0) setTransferItemId(inventory[0].id)
              if (warehouses.length > 1) setTargetWarehouseId(warehouses[1].id)
              setIsTransferModalOpen(true)
            }}
          >
            <ArrowLeftRight size={14} /> Transferencia entre almacenes
          </button>
        </div>
      </div>

      {/* View Switcher: Stock vs Movements & Search Filter */}
      <div className="ops-subbar">
        <div className="ops-view-tabs">
          <button
            className={`ops-view-btn ${activeTab === 'stock' ? 'active' : ''}`}
            onClick={() => handleTabChange('stock')}
          >
            <Boxes size={14} /> Existencias por almacén ({filteredInventory.length})
          </button>
          <button
            className={`ops-view-btn ${activeTab === 'movements' ? 'active' : ''}`}
            onClick={() => handleTabChange('movements')}
          >
            <History size={14} /> Kardex / Registro de movimientos ({movements.length})
          </button>
        </div>

        <div className="ops-search-row">
          {activeTab === 'stock' && (
            <label className="low-stock-toggle">
              <input
                type="checkbox"
                checked={filterLowStockOnly}
                onChange={(e) => setFilterLowStockOnly(e.target.checked)}
              />
              <span>Sólo alertas de stock bajo</span>
            </label>
          )}

          <div className="ops-search-input-wrap">
            <Search size={14} />
            <input
              type="text"
              placeholder={
                activeTab === 'stock'
                  ? 'Buscar por SKU, producto o ubicación...'
                  : 'Buscar por SKU, folio, motivo o referencia...'
              }
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

          <button
            type="button"
            className="button button-secondary ops-export-csv-btn"
            onClick={handleExportCSV}
            title={
              activeTab === 'stock'
                ? `Exportar existencias de la vista actual (${filteredInventory.length} artículos) a CSV`
                : `Exportar movimientos actuales (${filteredMovements.length} registros) a CSV`
            }
          >
            <Download size={13} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Table Content */}
      <Skeleton
        name="inventory-table"
        loading={isInventoryLoading}
        initialBones={inventoryTableBones}
        className="inventory-skeleton-container"
      >
        {activeTab === 'stock' ? (
          <div className="table-wrap ops-table-wrap">
          <table className="data-table ops-data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>PRODUCTO</th>
                <th>ALMACÉN</th>
                <th>UBICACIÓN</th>
                <th style={{ textAlign: 'right' }}>DISPONIBLE</th>
                <th style={{ textAlign: 'right' }}>RESERVADO</th>
                <th style={{ textAlign: 'right' }}>EN TRÁNSITO</th>
                <th style={{ textAlign: 'right' }}>COSTO UNIT.</th>
                <th style={{ textAlign: 'right' }}>VALOR TOTAL</th>
                <th>ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={10} className="empty-cell">
                    No se encontraron artículos con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => {
                  const isLow = item.stock <= item.minStock
                  const lineTotal = item.stock * item.cost
                  return (
                    <tr key={item.id} className={isLow ? 'row-warning' : ''}>
                      <td>
                        <span className="sku-badge">{item.sku}</span>
                      </td>
                      <td>
                        <div className="prod-cell">
                          <strong>{item.name}</strong>
                          <small>Unidad: {item.unitOfMeasure}</small>
                        </div>
                      </td>
                      <td>
                        <span className="warehouse-name-cell">
                          <MapPin size={12} /> {item.warehouseName}
                        </span>
                      </td>
                      <td>
                        <span className="location-bin-tag">{item.locationBin}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <strong className={`stock-number ${isLow ? 'text-alert' : ''}`}>
                          {item.stock}
                        </strong>
                      </td>
                      <td style={{ textAlign: 'right', color: '#88948d' }}>
                        {item.reserved}
                      </td>
                      <td style={{ textAlign: 'right', color: '#436b64' }}>
                        {item.inTransit > 0 ? `+${item.inTransit}` : '—'}
                      </td>
                      <td style={{ textAlign: 'right' }} className="money-cell">
                        {money(item.cost)}
                      </td>
                      <td style={{ textAlign: 'right' }} className="money-cell">
                        <strong>{money(lineTotal)}</strong>
                      </td>
                      <td>
                        <div className="stock-status-cell-wrap">
                          {isLow ? (
                            <button
                              type="button"
                              className="stock-alert-badge hover-clickable"
                              onClick={() => handleOpenThresholdModal(item.id)}
                              title="Stock por debajo o igual al umbral mínimo. Clic para ajustar umbral."
                            >
                              <AlertTriangle size={11} /> Stock bajo (mín. {item.minStock})
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="stock-ok-badge hover-clickable"
                              onClick={() => handleOpenThresholdModal(item.id)}
                              title="Stock adecuado. Clic para ajustar umbral mínimo."
                            >
                              <CheckCircle2 size={11} /> Abastecido (mín. {item.minStock})
                            </button>
                          )}
                          <button
                            type="button"
                            className="inline-config-btn"
                            onClick={() => handleOpenThresholdModal(item.id)}
                            title="Ajustar umbral mínimo de stock para este producto"
                          >
                            <SlidersHorizontal size={10} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-wrap ops-table-wrap">
          <table className="data-table ops-data-table">
            <thead>
              <tr>
                <th>FOLIO</th>
                <th>FECHA</th>
                <th>TIPO</th>
                <th>SKU / PRODUCTO</th>
                <th style={{ textAlign: 'right' }}>CANTIDAD</th>
                <th>ORIGEN / DESTINO</th>
                <th>DOC. REFERENCIA</th>
                <th>MOTIVO</th>
                <th>USUARIO</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty-cell">
                    No se encontraron movimientos registrados.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((mov) => {
                  const isPositive = mov.quantity > 0
                  return (
                    <tr key={mov.id}>
                      <td>
                        <strong>{mov.folio}</strong>
                      </td>
                      <td className="date-cell">{mov.date}</td>
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
                          {mov.targetWarehouse && (
                            <strong>{mov.targetWarehouse}</strong>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="ref-tag">{mov.referenceDoc || '—'}</span>
                      </td>
                      <td>
                        <span className="mov-reason-text">{mov.reason}</span>
                      </td>
                      <td className="user-cell">{mov.user}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
      </Skeleton>

      {/* Modal: Ajuste de Inventario */}
      {isAdjustModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsAdjustModalOpen(false)
          }}
        >
          <section className="create-modal" role="dialog" aria-modal="true">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">OPERACIONES · INVENTARIO</div>
                <h2>Ajuste de inventario físico</h2>
                <p>Modifica el conteo de existencias por merma, rotura o conciliación física.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setIsAdjustModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="adjust-modal-subnav">
              <span className="subnav-text">¿Deseas definir los límites de alerta por producto?</span>
              <button
                type="button"
                className="subnav-link-btn"
                onClick={() => {
                  setIsAdjustModalOpen(false)
                  handleOpenThresholdModal(adjustItemId)
                }}
              >
                Configurar umbrales mínimos de stock &rarr;
              </button>
            </div>

            <form onSubmit={handleConfirmAdjustment}>
              <label className="form-field">
                <span>Artículo de inventario *</span>
                <select
                  required
                  value={adjustItemId}
                  onChange={(e) => setAdjustItemId(e.target.value)}
                >
                  <option value="">Selecciona un artículo...</option>
                  {inventory.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      [{inv.sku}] {inv.name} — {inv.warehouseName} (Stock: {inv.stock})
                    </option>
                  ))}
                </select>
              </label>

              <div className="form-grid">
                <label className="form-field">
                  <span>Tipo de ajuste *</span>
                  <select
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value as any)}
                  >
                    <option value="Ajuste positivo">Ajuste positivo (+ entrada)</option>
                    <option value="Ajuste negativo">Ajuste negativo (- merma / salida)</option>
                  </select>
                </label>

                <label className="form-field">
                  <span>Cantidad de unidades *</span>
                  <input
                    type="number"
                    min="1"
                    required
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </label>
              </div>

              <label className="form-field">
                <span>Documento o folio de referencia</span>
                <input
                  placeholder="Ej. AUD-NOV-2026 o ACTA-04"
                  value={adjustReference}
                  onChange={(e) => setAdjustReference(e.target.value)}
                />
              </label>

              <label className="form-field">
                <span>Motivo de la variación *</span>
                <input
                  required
                  placeholder="Ej. Diferencia encontrada en conteo físico cíclico de andén"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                />
              </label>

              <div className="create-modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsAdjustModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="button button-primary">
                  <CheckCircle2 size={14} /> Aplicar ajuste al kardex
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal: Transferencia entre Almacenes */}
      {isTransferModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsTransferModalOpen(false)
          }}
        >
          <section className="create-modal" role="dialog" aria-modal="true">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">OPERACIONES · LOGÍSTICA INTERNA</div>
                <h2>Transferencia entre almacenes</h2>
                <p>Reubica existencias disponibles entre ubicaciones logísticas de la organización.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setIsTransferModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmTransfer}>
              <label className="form-field">
                <span>Artículo origen y almacén *</span>
                <select
                  required
                  value={transferItemId}
                  onChange={(e) => setTransferItemId(e.target.value)}
                >
                  <option value="">Selecciona artículo de origen...</option>
                  {inventory.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      [{inv.sku}] {inv.name} — Desde {inv.warehouseName} (Disp: {inv.stock})
                    </option>
                  ))}
                </select>
              </label>

              <div className="form-grid">
                <label className="form-field">
                  <span>Almacén de destino *</span>
                  <select
                    required
                    value={targetWarehouseId}
                    onChange={(e) => setTargetWarehouseId(e.target.value)}
                  >
                    <option value="">Selecciona destino...</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.city})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-field">
                  <span>Cantidad a transferir *</span>
                  <input
                    type="number"
                    min="1"
                    required
                    value={transferQty}
                    onChange={(e) => setTransferQty(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </label>
              </div>

              <label className="form-field">
                <span>Notas o motivo de reubicación</span>
                <input
                  placeholder="Ej. Rebalanceo de inventario para cubrir demanda en sucursal"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                />
              </label>

              <div className="create-modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsTransferModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="button button-primary">
                  <ArrowLeftRight size={14} /> Confirmar traslado
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal: Configuración de Umbrales Mínimos de Stock */}
      {isThresholdModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsThresholdModalOpen(false)
          }}
        >
          <section className="create-modal modal-wide" role="dialog" aria-modal="true">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">OPERACIONES · POLÍTICAS DE STOCK & CONTROL DE QUIEBRES</div>
                <h2>Configuración de umbrales mínimos de stock</h2>
                <p>
                  Establece el nivel mínimo de seguridad por producto. Cuando la cantidad física disponible caiga en o por debajo de este límite, el sistema disparará automáticamente una alerta visual en el Dashboard Principal.
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setIsThresholdModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="threshold-modal-body">
              {/* Formulario de producto seleccionado */}
              <form onSubmit={handleSaveThreshold} className="threshold-focus-card">
                <div className="threshold-card-header">
                  <h4>Ajuste de umbral por producto</h4>
                  <span className="threshold-hint-badge">Dispara alertas en tiempo real</span>
                </div>

                <div className="form-grid">
                  <label className="form-field" style={{ gridColumn: 'span 2' }}>
                    <span>Selecciona producto y almacén *</span>
                    <select
                      value={thresholdItemId || (selectedThresholdItem ? selectedThresholdItem.id : '')}
                      onChange={(e) => {
                        setThresholdItemId(e.target.value)
                        const itm = inventory.find((i) => i.id === e.target.value)
                        if (itm) setThresholdValue(itm.minStock)
                      }}
                    >
                      {inventory.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          [{inv.sku}] {inv.name} — {inv.warehouseName} (Stock actual: {inv.stock} {inv.unitOfMeasure})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {selectedThresholdItem && (
                  <div className="threshold-status-preview">
                    <div className="preview-stat-box">
                      <span className="stat-label">Stock físico disponible</span>
                      <strong className={`stat-num ${selectedThresholdItem.stock <= thresholdValue ? 'text-alert' : ''}`}>
                        {selectedThresholdItem.stock} {selectedThresholdItem.unitOfMeasure}
                      </strong>
                      <small>Reservado: {selectedThresholdItem.reserved} · En tránsito: {selectedThresholdItem.inTransit}</small>
                    </div>

                    <div className="preview-input-box">
                      <label className="form-field" style={{ margin: 0 }}>
                        <span>Umbral mínimo de stock (uds.) *</span>
                        <div className="stepper-input-wrap">
                          <button
                            type="button"
                            className="stepper-btn"
                            onClick={() => setThresholdValue(Math.max(0, thresholdValue - 1))}
                            title="Disminuir umbral"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            required
                            value={thresholdValue}
                            onChange={(e) => setThresholdValue(Math.max(0, parseInt(e.target.value) || 0))}
                          />
                          <button
                            type="button"
                            className="stepper-btn"
                            onClick={() => setThresholdValue(thresholdValue + 1)}
                            title="Aumentar umbral"
                          >
                            +
                          </button>
                        </div>
                      </label>
                    </div>

                    <div className="preview-action-box">
                      <button type="submit" className="button button-primary" style={{ width: '100%' }}>
                        <CheckCircle2 size={14} /> Guardar umbral
                      </button>
                    </div>
                  </div>
                )}

                {/* Previsualización dinámica de alerta */}
                {selectedThresholdItem && (
                  <div
                    className={`threshold-alert-callout ${
                      selectedThresholdItem.stock <= thresholdValue ? 'callout-alert' : 'callout-ok'
                    }`}
                  >
                    {selectedThresholdItem.stock <= thresholdValue ? (
                      <>
                        <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                        <div>
                          <strong>¡Atención! Este umbral activará la alerta visual en el Dashboard Principal</strong>
                          <p>
                            El stock actual ({selectedThresholdItem.stock} {selectedThresholdItem.unitOfMeasure}) es menor o igual al umbral fijado ({thresholdValue}).
                            En el Dashboard Ejecutivo se activará de inmediato el indicador prioritario de reorden y rotura de stock.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                        <div>
                          <strong>Nivel de inventario seguro</strong>
                          <p>
                            El stock disponible ({selectedThresholdItem.stock} {selectedThresholdItem.unitOfMeasure}) supera el umbral mínimo fijado ({thresholdValue}).
                            El Dashboard Ejecutivo no registrará alertas de desabasto para este producto.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </form>

              {/* Resumen global y ajuste rápido de todos los productos */}
              <div className="threshold-summary-section">
                <div className="threshold-table-header">
                  <h4>Políticas de umbral de stock en almacenes ({inventory.length} referencias)</h4>
                  <span className="threshold-legend">
                    <span className="dot-alert" /> {inventory.filter((i) => i.stock <= i.minStock).length} artículos bajo umbral mínimo
                  </span>
                </div>

                <div className="threshold-table-wrap">
                  <table className="threshold-table">
                    <thead>
                      <tr>
                        <th>SKU / PRODUCTO</th>
                        <th>ALMACÉN</th>
                        <th style={{ textAlign: 'right' }}>STOCK DISP.</th>
                        <th style={{ textAlign: 'center' }}>UMBRAL MÍNIMO</th>
                        <th>ESTADO DE ALERTA</th>
                        <th style={{ textAlign: 'right' }}>ACCIÓN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.map((inv) => {
                        const isUnder = inv.stock <= inv.minStock
                        return (
                          <tr key={inv.id} className={isUnder ? 'tr-warning' : ''}>
                            <td>
                              <span className="sku-badge-small">{inv.sku}</span>
                              <strong style={{ fontSize: '9.5px', color: '#27342c' }}>{inv.name}</strong>
                            </td>
                            <td style={{ fontSize: '9px', color: '#68776e' }}>{inv.warehouseName}</td>
                            <td style={{ textAlign: 'right' }}>
                              <strong className={`stock-number ${isUnder ? 'text-alert' : ''}`}>
                                {inv.stock}
                              </strong>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div className="inline-threshold-input-group">
                                <button
                                  type="button"
                                  className="mini-stepper-btn"
                                  onClick={() => handleQuickSaveItemThreshold(inv.id, inv.minStock - 1)}
                                  title="Reducir umbral en 1 unidad"
                                >
                                  -
                                </button>
                                <span className="current-min-badge">{inv.minStock}</span>
                                <button
                                  type="button"
                                  className="mini-stepper-btn"
                                  onClick={() => handleQuickSaveItemThreshold(inv.id, inv.minStock + 1)}
                                  title="Aumentar umbral en 1 unidad"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td>
                              {isUnder ? (
                                <span className="stock-alert-badge">
                                  <AlertTriangle size={10} /> Alerta activa ({inv.stock} ≤ {inv.minStock})
                                </span>
                              ) : (
                                <span className="stock-ok-badge">
                                  <CheckCircle2 size={10} /> Seguro ({inv.stock} &gt; {inv.minStock})
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className="button button-ghost"
                                style={{ fontSize: '8.5px', padding: '3px 7px' }}
                                onClick={() => {
                                  setThresholdItemId(inv.id)
                                  setThresholdValue(inv.minStock)
                                }}
                              >
                                Seleccionar
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="create-modal-actions">
              <button
                type="button"
                className="button button-primary"
                onClick={() => setIsThresholdModalOpen(false)}
              >
                Cerrar configuración
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
