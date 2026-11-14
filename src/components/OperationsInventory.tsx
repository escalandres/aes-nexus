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
  Truck,
  Plus,
  Trash2,
  Eye,
  XCircle,
  Clock,
  PackageCheck,
} from 'lucide-react'
import type {
  Warehouse,
  InventoryItemLocation,
  InventoryTransfer,
  InventoryTransferItem,
  TransferStatus,
  StockMovement,
  MovementType,
} from '../data/operations'
import { Skeleton } from 'boneyard-js/react'
import { inventoryTableBones } from '../bones/registry'
import { useToast } from './Toast'

interface OperationsInventoryProps {
  warehouses: Warehouse[]
  inventory: InventoryItemLocation[]
  transfers: InventoryTransfer[]
  movements: StockMovement[]
  onUpdateInventory: (items: InventoryItemLocation[]) => void
  onUpdateTransfers: (transfers: InventoryTransfer[]) => void
  onAddMovement: (movement: StockMovement) => void
  onStartTransfer?: (item?: InventoryItemLocation) => void
}

const money = (val: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(val)

const formatSpanishDate = (date: Date = new Date()) => {
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`
}

export function OperationsInventory({
  warehouses,
  inventory,
  transfers,
  movements,
  onUpdateInventory,
  onUpdateTransfers,
  onAddMovement,
  onStartTransfer,
}: OperationsInventoryProps) {
  const toast = useToast()
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'stock' | 'transfers' | 'movements'>('stock')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false)
  const [transferStatusFilter, setTransferStatusFilter] = useState<'Todos' | TransferStatus>('Todos')
  const [isInventoryLoading, setIsInventoryLoading] = useState(false)

  const handleWarehouseChange = (whId: string) => {
    setSelectedWarehouseId(whId)
    setIsInventoryLoading(true)
    setTimeout(() => setIsInventoryLoading(false), 320)
  }

  const handleTabChange = (tab: 'stock' | 'transfers' | 'movements') => {
    setActiveTab(tab)
    setIsInventoryLoading(true)
    setTimeout(() => setIsInventoryLoading(false), 320)
  }

  // Active warehouses for operations & transfers
  const activeWarehouses = useMemo(
    () => warehouses.filter((w) => w.active),
    [warehouses]
  )

  // Modals
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false)
  const [selectedTransferDetail, setSelectedTransferDetail] = useState<InventoryTransfer | null>(null)

  // Threshold configuration state
  const [thresholdItemId, setThresholdItemId] = useState('')
  const [thresholdValue, setThresholdValue] = useState<number>(0)

  // Adjustment form state
  const [adjustItemId, setAdjustItemId] = useState('')
  const [adjustType, setAdjustType] = useState<'Ajuste positivo' | 'Ajuste negativo'>('Ajuste positivo')
  const [adjustQty, setAdjustQty] = useState(1)
  const [adjustReason, setAdjustReason] = useState('')
  const [adjustReference, setAdjustReference] = useState('')

  // Enhanced Multi-item Transfer Form State
  const [sourceWarehouseId, setSourceWarehouseId] = useState('')
  const [targetWarehouseId, setTargetWarehouseId] = useState('')
  const [transferMode, setTransferMode] = useState<'immediate' | 'in_transit'>('immediate')
  const [transferCarrier, setTransferCarrier] = useState('Mensajería interna')
  const [transferExpectedDate, setTransferExpectedDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 2)
    return d.toISOString().split('T')[0]
  })
  const [transferResponsible, setTransferResponsible] = useState('Andrea Morales')
  const [transferNotes, setTransferNotes] = useState('')
  const [draftItems, setDraftItems] = useState<InventoryTransferItem[]>([])
  const [lineItemId, setLineItemId] = useState('')
  const [lineQty, setLineQty] = useState(1)
  const [lineTargetBin, setLineTargetBin] = useState('')

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
        item.locationBin.toLowerCase().includes(q) ||
        item.warehouseName.toLowerCase().includes(q)
      const matchLowStock = filterLowStockOnly ? item.stock <= item.minStock : true
      return matchWarehouse && matchSearch && matchLowStock
    })
  }, [inventory, selectedWarehouseId, searchQuery, filterLowStockOnly])

  // Filtered transfers
  const filteredTransfers = useMemo(() => {
    return transfers.filter((trf) => {
      const matchWarehouse =
        selectedWarehouseId === 'all' ||
        trf.sourceWarehouseId === selectedWarehouseId ||
        trf.targetWarehouseId === selectedWarehouseId
      const matchStatus =
        transferStatusFilter === 'Todos' || trf.status === transferStatusFilter
      const q = searchQuery.toLowerCase()
      const matchSearch =
        !q ||
        trf.folio.toLowerCase().includes(q) ||
        trf.sourceWarehouseName.toLowerCase().includes(q) ||
        trf.targetWarehouseName.toLowerCase().includes(q) ||
        trf.responsibleUser.toLowerCase().includes(q) ||
        trf.items.some(
          (it) =>
            it.sku.toLowerCase().includes(q) || it.name.toLowerCase().includes(q)
        )
      return matchWarehouse && matchStatus && matchSearch
    })
  }, [transfers, selectedWarehouseId, transferStatusFilter, searchQuery])

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
        (mov.sourceWarehouse && mov.sourceWarehouse.toLowerCase().includes(q)) ||
        (mov.targetWarehouse && mov.targetWarehouse.toLowerCase().includes(q)) ||
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

  const inTransitTransfersCount = useMemo(() => {
    return transfers.filter((t) => t.status === 'En tránsito').length
  }, [transfers])

  // Available items in selected source warehouse for transfer
  const sourceAvailableItems = useMemo(() => {
    return inventory.filter(
      (i) => i.warehouseId === sourceWarehouseId && i.stock > 0
    )
  }, [inventory, sourceWarehouseId])

  const selectedLineItemObj = useMemo(() => {
    return sourceAvailableItems.find((i) => i.id === lineItemId) || null
  }, [sourceAvailableItems, lineItemId])

  const destinationExistingItem = useMemo(() => {
    if (!selectedLineItemObj || !targetWarehouseId) return null
    return (
      inventory.find(
        (i) =>
          i.warehouseId === targetWarehouseId &&
          (i.productId === selectedLineItemObj.productId || i.sku === selectedLineItemObj.sku)
      ) || null
    )
  }, [inventory, selectedLineItemObj, targetWarehouseId])

  const remainingForSelectedLine = useMemo(() => {
    if (!selectedLineItemObj) return 0
    const alreadyDrafted = draftItems
      .filter((d) => d.inventoryItemId === selectedLineItemObj.id)
      .reduce((sum, d) => sum + d.quantity, 0)
    return Math.max(0, selectedLineItemObj.stock - alreadyDrafted)
  }, [selectedLineItemObj, draftItems])

  const transferDraftTotals = useMemo(() => {
    return draftItems.reduce(
      (acc, item) => ({
        units: acc.units + item.quantity,
        value: acc.value + item.quantity * item.unitCost,
      }),
      { units: 0, value: 0 }
    )
  }, [draftItems])

  const getDefaultTargetBin = (sku: string, productId: string, destWhId: string) => {
    const existing = inventory.find(
      (i) => i.warehouseId === destWhId && (i.productId === productId || i.sku === sku)
    )
    if (existing) return existing.locationBin
    const destWh = warehouses.find((w) => w.id === destWhId)
    return destWh ? `Recepción ${destWh.code}` : 'Recepción N-01'
  }

  // Open Transfer Modal (optionally preloaded from an inventory row)
  const handleOpenTransferModal = (presetItem?: InventoryItemLocation) => {
    if (activeWarehouses.length < 2) {
      toast.warning(
        'Se necesitan al menos 2 ubicaciones/almacenes activos para realizar traslados.',
        'Ubicaciones insuficientes'
      )
      return
    }

    const initialSourceId = presetItem
      ? presetItem.warehouseId
      : selectedWarehouseId !== 'all'
      ? selectedWarehouseId
      : activeWarehouses[0].id

    const firstValidTarget =
      activeWarehouses.find((w) => w.id !== initialSourceId)?.id || ''

    setSourceWarehouseId(initialSourceId)
    setTargetWarehouseId(firstValidTarget)
    setTransferMode('immediate')
    setTransferCarrier('Mensajería interna')
    setTransferResponsible('Andrea Morales')
    setTransferNotes('')

    if (presetItem && presetItem.stock > 0 && firstValidTarget) {
      const destBin = getDefaultTargetBin(presetItem.sku, presetItem.productId, firstValidTarget)
      setDraftItems([
        {
          id: `trfi_${Date.now()}`,
          inventoryItemId: presetItem.id,
          productId: presetItem.productId,
          sku: presetItem.sku,
          name: presetItem.name,
          unitOfMeasure: presetItem.unitOfMeasure,
          quantity: 1,
          unitCost: presetItem.cost,
          sourceBin: presetItem.locationBin,
          targetBin: destBin,
        },
      ])
      const nextCandidate = inventory.find(
        (i) => i.warehouseId === initialSourceId && i.stock > 0 && i.id !== presetItem.id
      )
      setLineItemId(nextCandidate?.id || '')
      setLineQty(1)
      setLineTargetBin(
        nextCandidate
          ? getDefaultTargetBin(nextCandidate.sku, nextCandidate.productId, firstValidTarget)
          : ''
      )
    } else {
      setDraftItems([])
      const firstItem = inventory.find(
        (i) => i.warehouseId === initialSourceId && i.stock > 0
      )
      setLineItemId(firstItem?.id || '')
      setLineQty(1)
      setLineTargetBin(
        firstItem && firstValidTarget
          ? getDefaultTargetBin(firstItem.sku, firstItem.productId, firstValidTarget)
          : ''
      )
    }

    setIsTransferModalOpen(true)
  }

  const handleSourceWarehouseSelect = (newSourceId: string) => {
    setSourceWarehouseId(newSourceId)
    setDraftItems([])
    let nextTarget = targetWarehouseId
    if (!nextTarget || nextTarget === newSourceId) {
      nextTarget = activeWarehouses.find((w) => w.id !== newSourceId)?.id || ''
      setTargetWarehouseId(nextTarget)
    }
    const firstItem = inventory.find((i) => i.warehouseId === newSourceId && i.stock > 0)
    setLineItemId(firstItem?.id || '')
    setLineQty(1)
    setLineTargetBin(
      firstItem && nextTarget
        ? getDefaultTargetBin(firstItem.sku, firstItem.productId, nextTarget)
        : ''
    )
  }

  const handleTargetWarehouseSelect = (newTargetId: string) => {
    setTargetWarehouseId(newTargetId)
    setDraftItems((prev) =>
      prev.map((d) => ({
        ...d,
        targetBin: getDefaultTargetBin(d.sku, d.productId, newTargetId),
      }))
    )
    if (selectedLineItemObj) {
      setLineTargetBin(
        getDefaultTargetBin(selectedLineItemObj.sku, selectedLineItemObj.productId, newTargetId)
      )
    }
  }

  const handleSwapWarehouses = () => {
    if (!sourceWarehouseId || !targetWarehouseId) return
    const prevSource = sourceWarehouseId
    const prevTarget = targetWarehouseId
    setSourceWarehouseId(prevTarget)
    setTargetWarehouseId(prevSource)
    setDraftItems([])
    const firstItem = inventory.find((i) => i.warehouseId === prevTarget && i.stock > 0)
    setLineItemId(firstItem?.id || '')
    setLineQty(1)
    setLineTargetBin(
      firstItem
        ? getDefaultTargetBin(firstItem.sku, firstItem.productId, prevSource)
        : ''
    )
  }

  const handleAddDraftItem = () => {
    if (!selectedLineItemObj) {
      toast.warning('Selecciona un producto disponible en el almacén origen.', 'Producto requerido')
      return
    }
    if (lineQty <= 0 || lineQty > remainingForSelectedLine) {
      toast.warning(
        `Cantidad no válida. Quedan ${remainingForSelectedLine} unidades disponibles para asignar de ${selectedLineItemObj.sku}.`,
        'Stock insuficiente'
      )
      return
    }

    const binToUse =
      lineTargetBin.trim() ||
      getDefaultTargetBin(selectedLineItemObj.sku, selectedLineItemObj.productId, targetWarehouseId)

    const existingIdx = draftItems.findIndex(
      (d) => d.inventoryItemId === selectedLineItemObj.id
    )
    if (existingIdx >= 0) {
      setDraftItems((prev) =>
        prev.map((d, idx) =>
          idx === existingIdx
            ? { ...d, quantity: d.quantity + lineQty, targetBin: binToUse }
            : d
        )
      )
    } else {
      setDraftItems((prev) => [
        ...prev,
        {
          id: `trfi_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          inventoryItemId: selectedLineItemObj.id,
          productId: selectedLineItemObj.productId,
          sku: selectedLineItemObj.sku,
          name: selectedLineItemObj.name,
          unitOfMeasure: selectedLineItemObj.unitOfMeasure,
          quantity: lineQty,
          unitCost: selectedLineItemObj.cost,
          sourceBin: selectedLineItemObj.locationBin,
          targetBin: binToUse,
        },
      ])
    }

    setLineQty(1)
  }

  const handleUpdateDraftItemQty = (itemId: string, nextQty: number) => {
    const targetDraft = draftItems.find((d) => d.id === itemId)
    if (!targetDraft) return
    const sourceStock =
      inventory.find((i) => i.id === targetDraft.inventoryItemId)?.stock || 1
    const clamped = Math.max(1, Math.min(sourceStock, nextQty))
    setDraftItems((prev) =>
      prev.map((d) => (d.id === itemId ? { ...d, quantity: clamped } : d))
    )
  }

  const handleUpdateDraftItemBin = (itemId: string, bin: string) => {
    setDraftItems((prev) =>
      prev.map((d) => (d.id === itemId ? { ...d, targetBin: bin } : d))
    )
  }

  const handleRemoveDraftItem = (itemId: string) => {
    setDraftItems((prev) => prev.filter((d) => d.id !== itemId))
  }

  // Confirm Transfer Submission
  const handleConfirmTransfer = (e: React.FormEvent) => {
    e.preventDefault()

    if (!sourceWarehouseId || !targetWarehouseId || sourceWarehouseId === targetWarehouseId) {
      toast.warning('Selecciona ubicaciones de origen y destino diferentes.', 'Ubicación inválida')
      return
    }

    // If user didn't click "Agregar" yet but selected a valid item & qty and draftItems is empty, include it automatically
    let itemsToTransfer = [...draftItems]
    if (itemsToTransfer.length === 0 && selectedLineItemObj && lineQty > 0) {
      if (lineQty > selectedLineItemObj.stock) {
        toast.warning(
          `Cantidad no válida. Disponible en ${selectedLineItemObj.warehouseName}: ${selectedLineItemObj.stock} unidades.`,
          'Stock insuficiente'
        )
        return
      }
      itemsToTransfer = [
        {
          id: `trfi_${Date.now()}`,
          inventoryItemId: selectedLineItemObj.id,
          productId: selectedLineItemObj.productId,
          sku: selectedLineItemObj.sku,
          name: selectedLineItemObj.name,
          unitOfMeasure: selectedLineItemObj.unitOfMeasure,
          quantity: lineQty,
          unitCost: selectedLineItemObj.cost,
          sourceBin: selectedLineItemObj.locationBin,
          targetBin:
            lineTargetBin.trim() ||
            getDefaultTargetBin(selectedLineItemObj.sku, selectedLineItemObj.productId, targetWarehouseId),
        },
      ]
    }

    if (itemsToTransfer.length === 0) {
      toast.warning('Agrega al menos un producto para trasladar.', 'Sin artículos')
      return
    }

    const sourceWarehouse = warehouses.find((w) => w.id === sourceWarehouseId)
    const targetWarehouse = warehouses.find((w) => w.id === targetWarehouseId)
    if (!sourceWarehouse || !targetWarehouse) return

    // Validate all lines against live stock
    for (const line of itemsToTransfer) {
      const src = inventory.find((i) => i.id === line.inventoryItemId)
      if (!src || line.quantity <= 0 || line.quantity > src.stock) {
        toast.warning(
          `Stock insuficiente para ${line.sku} en ${sourceWarehouse.name} (Disp: ${src?.stock ?? 0}).`,
          'Stock insuficiente'
        )
        return
      }
    }

    // Apply stock adjustments across origin and destination
    let updatedInventory = [...inventory]

    for (const line of itemsToTransfer) {
      const srcIndex = updatedInventory.findIndex((i) => i.id === line.inventoryItemId)
      if (srcIndex === -1) continue

      const srcItem = updatedInventory[srcIndex]
      updatedInventory[srcIndex] = {
        ...srcItem,
        stock: Math.max(0, srcItem.stock - line.quantity),
      }

      const targetIndex = updatedInventory.findIndex(
        (i) =>
          i.warehouseId === targetWarehouse.id &&
          (i.productId === line.productId || i.sku === line.sku)
      )

      if (targetIndex !== -1) {
        const destItem = updatedInventory[targetIndex]
        updatedInventory[targetIndex] = {
          ...destItem,
          stock:
            transferMode === 'immediate'
              ? destItem.stock + line.quantity
              : destItem.stock,
          inTransit:
            transferMode === 'in_transit'
              ? destItem.inTransit + line.quantity
              : destItem.inTransit,
        }
      } else {
        updatedInventory.push({
          id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          productId: line.productId,
          sku: line.sku,
          name: line.name,
          warehouseId: targetWarehouse.id,
          warehouseName: targetWarehouse.name,
          stock: transferMode === 'immediate' ? line.quantity : 0,
          reserved: 0,
          inTransit: transferMode === 'in_transit' ? line.quantity : 0,
          minStock: srcItem.minStock,
          cost: line.unitCost,
          unitOfMeasure: line.unitOfMeasure,
          locationBin: line.targetBin || `Recepción ${targetWarehouse.code}`,
        })
      }
    }

    onUpdateInventory(updatedInventory)

    const todayStr = formatSpanishDate()
    const nextTransferNum = transfers.length + 1
    const transferFolio = `TRF-2026-${String(nextTransferNum).padStart(3, '0')}`
    const totalUnits = itemsToTransfer.reduce((s, it) => s + it.quantity, 0)
    const totalValue = itemsToTransfer.reduce((s, it) => s + it.quantity * it.unitCost, 0)

    let formattedExpectedArrival: string | undefined
    if (transferMode === 'in_transit' && transferExpectedDate) {
      const parsed = new Date(`${transferExpectedDate}T12:00:00`)
      if (!Number.isNaN(parsed.getTime())) {
        formattedExpectedArrival = formatSpanishDate(parsed)
      }
    }

    const newTransfer: InventoryTransfer = {
      id: `trf_${Date.now()}`,
      folio: transferFolio,
      date: todayStr,
      expectedArrival: formattedExpectedArrival,
      completedDate: transferMode === 'immediate' ? todayStr : undefined,
      sourceWarehouseId: sourceWarehouse.id,
      sourceWarehouseName: sourceWarehouse.name,
      targetWarehouseId: targetWarehouse.id,
      targetWarehouseName: targetWarehouse.name,
      items: itemsToTransfer,
      totalUnits,
      totalValue,
      status: transferMode === 'immediate' ? 'Completado' : 'En tránsito',
      carrierOrMethod: transferCarrier,
      responsibleUser: transferResponsible.trim() || 'Andrea Morales',
      notes:
        transferNotes.trim() ||
        (transferMode === 'immediate'
          ? 'Traslado directo entre ubicaciones'
          : 'Despacho en tránsito pendiente de recepción en destino'),
    }

    onUpdateTransfers([newTransfer, ...transfers])

    // Add Kardex movement(s)
    itemsToTransfer.forEach((line, index) => {
      const nextMovFolio = `MOV-2026-${String(movements.length + 1 + index).padStart(3, '0')}`
      onAddMovement({
        id: `mov_${Date.now()}_${index}`,
        folio: nextMovFolio,
        date: todayStr,
        type: 'Transferencia',
        sku: line.sku,
        productName: line.name,
        quantity: line.quantity,
        sourceWarehouse: sourceWarehouse.name,
        targetWarehouse: targetWarehouse.name,
        referenceDoc: transferFolio,
        reason:
          transferMode === 'immediate'
            ? transferNotes.trim() || `Traslado directo (${line.sourceBin} → ${line.targetBin})`
            : transferNotes.trim() || `Envío en tránsito hacia ${targetWarehouse.name}`,
        user: transferResponsible.trim() || 'Andrea Morales',
      })
    })

    toast.success(
      transferMode === 'immediate'
        ? `Traslado ${transferFolio} completado: ${totalUnits} uds. reubicadas de ${sourceWarehouse.name} a ${targetWarehouse.name}.`
        : `Traslado ${transferFolio} despachado en tránsito (${totalUnits} uds.) hacia ${targetWarehouse.name}.`,
      transferMode === 'immediate' ? 'Traslado completado' : 'Traslado en tránsito'
    )

    setIsTransferModalOpen(false)
    setActiveTab('transfers')
  }

  // Receive an in-transit transfer at destination
  const handleReceiveTransfer = (transfer: InventoryTransfer) => {
    if (transfer.status !== 'En tránsito') return

    const updatedInventory = [...inventory]
    for (const line of transfer.items) {
      const destIdx = updatedInventory.findIndex(
        (i) =>
          i.warehouseId === transfer.targetWarehouseId &&
          (i.productId === line.productId || i.sku === line.sku)
      )
      if (destIdx !== -1) {
        const dest = updatedInventory[destIdx]
        updatedInventory[destIdx] = {
          ...dest,
          stock: dest.stock + line.quantity,
          inTransit: Math.max(0, dest.inTransit - line.quantity),
        }
      } else {
        updatedInventory.push({
          id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          productId: line.productId,
          sku: line.sku,
          name: line.name,
          warehouseId: transfer.targetWarehouseId,
          warehouseName: transfer.targetWarehouseName,
          stock: line.quantity,
          reserved: 0,
          inTransit: 0,
          minStock: 2,
          cost: line.unitCost,
          unitOfMeasure: line.unitOfMeasure,
          locationBin: line.targetBin || 'Recepción N-01',
        })
      }
    }
    onUpdateInventory(updatedInventory)

    const todayStr = formatSpanishDate()
    const updatedTransfer: InventoryTransfer = {
      ...transfer,
      status: 'Completado',
      completedDate: todayStr,
    }
    onUpdateTransfers(
      transfers.map((t) => (t.id === transfer.id ? updatedTransfer : t))
    )
    if (selectedTransferDetail?.id === transfer.id) {
      setSelectedTransferDetail(updatedTransfer)
    }

    transfer.items.forEach((line, idx) => {
      onAddMovement({
        id: `mov_${Date.now()}_rec_${idx}`,
        folio: `MOV-2026-${String(movements.length + 1 + idx).padStart(3, '0')}`,
        date: todayStr,
        type: 'Entrada',
        sku: line.sku,
        productName: line.name,
        quantity: line.quantity,
        sourceWarehouse: transfer.sourceWarehouseName,
        targetWarehouse: transfer.targetWarehouseName,
        referenceDoc: transfer.folio,
        reason: `Recepción confirmada de traslado en ${transfer.targetWarehouseName}`,
        user: 'Andrea Morales',
      })
    })

    toast.success(
      `Se confirmó la recepción del traslado ${transfer.folio} (${transfer.totalUnits} uds.) en ${transfer.targetWarehouseName}.`,
      'Recepción confirmada'
    )
  }

  // Cancel an in-transit transfer and return stock to origin
  const handleCancelTransfer = (transfer: InventoryTransfer) => {
    if (transfer.status !== 'En tránsito') return

    const updatedInventory = [...inventory]
    for (const line of transfer.items) {
      const srcIdx = updatedInventory.findIndex(
        (i) =>
          i.warehouseId === transfer.sourceWarehouseId &&
          (i.productId === line.productId || i.sku === line.sku)
      )
      if (srcIdx !== -1) {
        updatedInventory[srcIdx] = {
          ...updatedInventory[srcIdx],
          stock: updatedInventory[srcIdx].stock + line.quantity,
        }
      }
      const destIdx = updatedInventory.findIndex(
        (i) =>
          i.warehouseId === transfer.targetWarehouseId &&
          (i.productId === line.productId || i.sku === line.sku)
      )
      if (destIdx !== -1) {
        updatedInventory[destIdx] = {
          ...updatedInventory[destIdx],
          inTransit: Math.max(0, updatedInventory[destIdx].inTransit - line.quantity),
        }
      }
    }
    onUpdateInventory(updatedInventory)

    const updatedTransfer: InventoryTransfer = {
      ...transfer,
      status: 'Cancelado',
    }
    onUpdateTransfers(
      transfers.map((t) => (t.id === transfer.id ? updatedTransfer : t))
    )
    if (selectedTransferDetail?.id === transfer.id) {
      setSelectedTransferDetail(updatedTransfer)
    }

    const todayStr = formatSpanishDate()
    transfer.items.forEach((line, idx) => {
      onAddMovement({
        id: `mov_${Date.now()}_can_${idx}`,
        folio: `MOV-2026-${String(movements.length + 1 + idx).padStart(3, '0')}`,
        date: todayStr,
        type: 'Ajuste',
        sku: line.sku,
        productName: line.name,
        quantity: line.quantity,
        sourceWarehouse: transfer.targetWarehouseName,
        targetWarehouse: transfer.sourceWarehouseName,
        referenceDoc: transfer.folio,
        reason: `Cancelación de traslado ${transfer.folio}: retorno de stock a origen`,
        user: 'Andrea Morales',
      })
    })

    toast.info(
      `Traslado ${transfer.folio} cancelado. Se devolvieron ${transfer.totalUnits} unidades a ${transfer.sourceWarehouseName}.`,
      'Traslado cancelado'
    )
  }

  // Helper to escape values safely for CSV format
  const escapeCSV = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return '""'
    const stringVal = String(value)
    return `"${stringVal.replace(/"/g, '""')}"`
  }

  // Handle Export CSV of current view
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
    } else if (activeTab === 'transfers') {
      if (filteredTransfers.length === 0) {
        toast.warning('No hay traslados para exportar con los filtros actuales.', 'Sin registros')
        return
      }

      const headers = [
        'FOLIO',
        'FECHA',
        'ORIGEN',
        'DESTINO',
        'PRODUCTOS (SKU)',
        'TOTAL UNIDADES',
        'VALOR TOTAL (MXN)',
        'TRANSPORTE',
        'RESPONSABLE',
        'ESTADO',
        'NOTAS',
      ]

      const rows = filteredTransfers.map((trf) => [
        escapeCSV(trf.folio),
        escapeCSV(trf.date),
        escapeCSV(trf.sourceWarehouseName),
        escapeCSV(trf.targetWarehouseName),
        escapeCSV(trf.items.map((i) => `${i.sku} (x${i.quantity})`).join(' | ')),
        escapeCSV(trf.totalUnits),
        escapeCSV(trf.totalValue.toFixed(2)),
        escapeCSV(trf.carrierOrMethod),
        escapeCSV(trf.responsibleUser),
        escapeCSV(trf.status),
        escapeCSV(trf.notes || ''),
      ].join(','))

      const csvContent = '\uFEFF' + [headers.map(escapeCSV).join(','), ...rows].join('\r\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const dateStr = new Date().toISOString().split('T')[0]

      link.href = url
      link.download = `traslados_almacenes_${dateStr}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(
        `Se descargó el CSV con ${filteredTransfers.length} traslados entre ubicaciones.`,
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
    const dateStr = formatSpanishDate()

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

  const getTransferStatusBadge = (status: TransferStatus) => {
    switch (status) {
      case 'Completado':
        return 'status-recibida'
      case 'En tránsito':
        return 'status-emitida'
      case 'Cancelado':
        return 'status-cancelada'
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
            <p>Monitorea existencias físicas, ubicaciones de rack y traslados entre almacenes en tiempo real.</p>
          </div>
        </div>

        <div className="ops-header-right">
          <div className="ops-stat-item">
            <span className="ops-stat-label">Traslados en tránsito</span>
            <strong className="ops-stat-val" style={{ color: inTransitTransfersCount > 0 ? '#386494' : undefined }}>
              {inTransitTransfersCount}
            </strong>
          </div>
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
                  title={`${w.name} · ${w.city}${!w.active ? ' (Inactiva)' : ''}`}
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
                : activeTab === 'transfers'
                ? `Exportar ${filteredTransfers.length} traslados a archivo CSV`
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
            onClick={() => (onStartTransfer ? onStartTransfer() : handleOpenTransferModal())}
          >
            <ArrowLeftRight size={14} /> Traslado entre ubicaciones
          </button>
        </div>
      </div>

      {/* View Switcher: Stock vs Transfers vs Movements & Search Filter */}
      <div className="ops-subbar">
        <div className="ops-view-tabs">
          <button
            className={`ops-view-btn ${activeTab === 'stock' ? 'active' : ''}`}
            onClick={() => handleTabChange('stock')}
          >
            <Boxes size={14} /> Existencias por almacén ({filteredInventory.length})
          </button>
          <button
            className={`ops-view-btn ${activeTab === 'transfers' ? 'active' : ''}`}
            onClick={() => handleTabChange('transfers')}
          >
            <ArrowLeftRight size={14} /> Traslados entre ubicaciones ({transfers.length})
            {inTransitTransfersCount > 0 && (
              <span className="transfer-transit-pill" title="Traslados en ruta pendientes de recepción">
                {inTransitTransfersCount} en tránsito
              </span>
            )}
          </button>
          <button
            className={`ops-view-btn ${activeTab === 'movements' ? 'active' : ''}`}
            onClick={() => handleTabChange('movements')}
          >
            <History size={14} /> Kardex / Movimientos ({movements.length})
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

          {activeTab === 'transfers' && (
            <div className="transfer-status-filter-pills">
              {(['Todos', 'En tránsito', 'Completado', 'Cancelado'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`transfer-filter-chip ${transferStatusFilter === st ? 'active' : ''}`}
                  onClick={() => setTransferStatusFilter(st)}
                >
                  {st}
                </button>
              ))}
            </div>
          )}

          <div className="ops-search-input-wrap">
            <Search size={14} />
            <input
              type="text"
              placeholder={
                activeTab === 'stock'
                  ? 'Buscar por SKU, producto o ubicación...'
                  : activeTab === 'transfers'
                  ? 'Buscar por folio, almacén o SKU...'
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
                : activeTab === 'transfers'
                ? `Exportar traslados actuales (${filteredTransfers.length} registros) a CSV`
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
                  <th>ALMACÉN / UBICACIÓN</th>
                  <th>RACK</th>
                  <th style={{ textAlign: 'right' }}>DISPONIBLE</th>
                  <th style={{ textAlign: 'right' }}>RESERVADO</th>
                  <th style={{ textAlign: 'right' }}>EN TRÁNSITO</th>
                  <th style={{ textAlign: 'right' }}>COSTO UNIT.</th>
                  <th style={{ textAlign: 'right' }}>VALOR TOTAL</th>
                  <th>ESTADO</th>
                  <th style={{ textAlign: 'right' }}>TRASLADAR</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="empty-cell">
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
                        <td style={{ textAlign: 'right', color: '#386494', fontWeight: item.inTransit > 0 ? 700 : 400 }}>
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
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="button-icon-action"
                            disabled={item.stock <= 0 || activeWarehouses.length < 2}
                            onClick={() => (onStartTransfer ? onStartTransfer(item) : handleOpenTransferModal(item))}
                            title={
                              item.stock > 0
                                ? `Trasladar ${item.sku} desde ${item.warehouseName} hacia otra ubicación`
                                : 'Sin existencias disponibles para trasladar'
                            }
                          >
                            <ArrowLeftRight size={12} /> Trasladar
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'transfers' ? (
          <div className="table-wrap ops-table-wrap">
            <table className="data-table ops-data-table">
              <thead>
                <tr>
                  <th>FOLIO</th>
                  <th>FECHA</th>
                  <th>RUTA DE TRASLADO (ORIGEN → DESTINO)</th>
                  <th>ARTÍCULOS</th>
                  <th style={{ textAlign: 'right' }}>UDS. / VALOR</th>
                  <th>LOGÍSTICA / RESPONSABLE</th>
                  <th>ESTADO</th>
                  <th style={{ textAlign: 'right' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-cell">
                      No se encontraron traslados entre almacenes con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredTransfers.map((trf) => (
                    <tr key={trf.id}>
                      <td>
                        <div className="po-folio-tag">{trf.folio}</div>
                        {trf.expectedArrival && trf.status === 'En tránsito' && (
                          <small style={{ fontSize: '8px', color: '#386494', display: 'block', marginTop: 2 }}>
                            Llegada est.: {trf.expectedArrival}
                          </small>
                        )}
                      </td>
                      <td className="date-cell">
                        <div className="date-icon-cell">
                          <Clock size={12} /> {trf.date}
                        </div>
                      </td>
                      <td>
                        <div className="transfer-route-box">
                          <span className="route-node origin">
                            <MapPin size={11} /> {trf.sourceWarehouseName}
                          </span>
                          <span className="route-arrow">→</span>
                          <span className="route-node dest">
                            <MapPin size={11} /> {trf.targetWarehouseName}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="order-items-summary">
                          <strong>
                            {trf.items.length} {trf.items.length === 1 ? 'producto' : 'productos'}
                          </strong>
                          <small>
                            {trf.items
                              .slice(0, 2)
                              .map((it) => `${it.sku} (×${it.quantity})`)
                              .join(', ')}
                            {trf.items.length > 2 ? ` +${trf.items.length - 2} más` : ''}
                          </small>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="order-items-summary" style={{ alignItems: 'flex-end' }}>
                          <strong>{trf.totalUnits} uds.</strong>
                          <small>{money(trf.totalValue)}</small>
                        </div>
                      </td>
                      <td>
                        <div className="supplier-cell">
                          <strong>{trf.carrierOrMethod}</strong>
                          <small>Resp.: {trf.responsibleUser}</small>
                        </div>
                      </td>
                      <td>
                        <span className={`order-status-badge ${getTransferStatusBadge(trf.status)}`}>
                          {trf.status === 'En tránsito' && <Truck size={11} />}
                          {trf.status === 'Completado' && <CheckCircle2 size={11} />}
                          {trf.status === 'Cancelado' && <XCircle size={11} />}
                          {trf.status}
                        </span>
                      </td>
                      <td>
                        <div className="po-actions-row">
                          {trf.status === 'En tránsito' && (
                            <>
                              <button
                                type="button"
                                className="button-icon-action action-receive"
                                onClick={() => handleReceiveTransfer(trf)}
                                title="Confirmar llegada física e ingresar al stock del destino"
                              >
                                <PackageCheck size={12} /> Recibir
                              </button>
                              <button
                                type="button"
                                className="button-icon-action action-cancel-trf"
                                onClick={() => handleCancelTransfer(trf)}
                                title="Cancelar traslado y devolver existencias al origen"
                              >
                                <XCircle size={12} />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className="button-icon-action"
                            onClick={() => setSelectedTransferDetail(trf)}
                            title="Ver remisión y detalle completo del traslado"
                          >
                            <Eye size={12} /> Detalle
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
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
                    onChange={(e) => setAdjustType(e.target.value as 'Ajuste positivo' | 'Ajuste negativo')}
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

      {/* Modal: Traslado de Inventario entre Almacenes (Ubicaciones) */}
      {isTransferModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsTransferModalOpen(false)
          }}
        >
          <section className="create-modal modal-wide" role="dialog" aria-modal="true">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">OPERACIONES · LOGÍSTICA ENTRE UBICACIONES</div>
                <h2>Nuevo traslado entre almacenes</h2>
                <p>Reubica uno o varios productos entre almacenes, sucursales y puntos de venta con trazabilidad en Kardex.</p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setIsTransferModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmTransfer}>
              {/* Route Selector: Origin <-> Destination */}
              <div className="transfer-route-selector-card">
                <label className="form-field" style={{ flex: 1, margin: 0 }}>
                  <span>Ubicación / Almacén de origen *</span>
                  <select
                    required
                    value={sourceWarehouseId}
                    onChange={(e) => handleSourceWarehouseSelect(e.target.value)}
                  >
                    <option value="">Selecciona origen...</option>
                    {activeWarehouses.map((w) => {
                      const skus = inventory.filter((i) => i.warehouseId === w.id && i.stock > 0).length
                      return (
                        <option key={w.id} value={w.id}>
                          [{w.code}] {w.name} · {w.city} ({skus} SKUs disp.)
                        </option>
                      )
                    })}
                  </select>
                </label>

                <button
                  type="button"
                  className="transfer-swap-btn"
                  onClick={handleSwapWarehouses}
                  title="Intercambiar almacén origen y destino"
                  aria-label="Intercambiar origen y destino"
                >
                  <ArrowLeftRight size={15} />
                </button>

                <label className="form-field" style={{ flex: 1, margin: 0 }}>
                  <span>Ubicación / Almacén de destino *</span>
                  <select
                    required
                    value={targetWarehouseId}
                    onChange={(e) => handleTargetWarehouseSelect(e.target.value)}
                  >
                    <option value="">Selecciona destino...</option>
                    {activeWarehouses
                      .filter((w) => w.id !== sourceWarehouseId)
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          [{w.code}] {w.name} · {w.city} {w.locationType ? `(${w.locationType})` : ''}
                        </option>
                      ))}
                  </select>
                </label>
              </div>

              {/* Execution Mode */}
              <div className="transfer-mode-grid">
                <button
                  type="button"
                  className={`transfer-mode-card ${transferMode === 'immediate' ? 'active' : ''}`}
                  onClick={() => setTransferMode('immediate')}
                >
                  <div className="mode-card-top">
                    <CheckCircle2 size={14} />
                    <strong>Traslado inmediato</strong>
                  </div>
                  <small>Descuenta del origen e ingresa de forma directa al stock del destino.</small>
                </button>

                <button
                  type="button"
                  className={`transfer-mode-card ${transferMode === 'in_transit' ? 'active' : ''}`}
                  onClick={() => setTransferMode('in_transit')}
                >
                  <div className="mode-card-top">
                    <Truck size={14} />
                    <strong>Despacho en tránsito</strong>
                  </div>
                  <small>Descuenta del origen, marca unidades en tránsito y confirma al recibir en destino.</small>
                </button>
              </div>

              {/* Multi-Product Builder */}
              <div className="po-items-builder-box">
                <div className="po-builder-title" style={{ justifyContent: 'space-between' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Boxes size={14} /> Productos a trasladar
                  </span>
                  {draftItems.length > 0 && (
                    <span className="transfer-draft-summary-pill">
                      {draftItems.length} {draftItems.length === 1 ? 'SKU' : 'SKUs'} · {transferDraftTotals.units} uds. · {money(transferDraftTotals.value)}
                    </span>
                  )}
                </div>

                {/* Add Line Controls */}
                <div className="po-add-line-strip" style={{ paddingTop: 0, borderTop: 0, paddingBottom: 10, borderBottom: '1px solid #e8ede6' }}>
                  <div className="po-add-prod-select">
                    <label>Producto disponible en origen</label>
                    <select
                      value={lineItemId}
                      onChange={(e) => {
                        const nextId = e.target.value
                        setLineItemId(nextId)
                        const obj = sourceAvailableItems.find((i) => i.id === nextId)
                        if (obj && targetWarehouseId) {
                          setLineTargetBin(getDefaultTargetBin(obj.sku, obj.productId, targetWarehouseId))
                        }
                        setLineQty(1)
                      }}
                    >
                      <option value="">
                        {sourceAvailableItems.length === 0
                          ? 'Sin existencias disponibles en este almacén...'
                          : 'Selecciona un producto...'}
                      </option>
                      {sourceAvailableItems.map((inv) => {
                        const already = draftItems
                          .filter((d) => d.inventoryItemId === inv.id)
                          .reduce((s, d) => s + d.quantity, 0)
                        const avail = Math.max(0, inv.stock - already)
                        return (
                          <option key={inv.id} value={inv.id} disabled={avail === 0}>
                            [{inv.sku}] {inv.name} · Rack {inv.locationBin} (Disp: {avail} {inv.unitOfMeasure})
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  <div className="po-add-qty">
                    <label>Cantidad</label>
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, remainingForSelectedLine)}
                      value={lineQty}
                      onChange={(e) =>
                        setLineQty(
                          Math.max(
                            1,
                            Math.min(
                              Math.max(1, remainingForSelectedLine),
                              parseInt(e.target.value) || 1
                            )
                          )
                        )
                      }
                    />
                  </div>

                  <div className="po-add-cost">
                    <label>Rack / Ubicación destino</label>
                    <input
                      type="text"
                      placeholder="Ej. Recepción N-01"
                      value={lineTargetBin}
                      onChange={(e) => setLineTargetBin(e.target.value)}
                    />
                  </div>

                  <button
                    type="button"
                    className="button button-secondary po-add-btn"
                    onClick={handleAddDraftItem}
                    disabled={!selectedLineItemObj || remainingForSelectedLine <= 0}
                  >
                    <Plus size={13} /> Agregar
                  </button>
                </div>

                {selectedLineItemObj && (
                  <div className="transfer-line-hint-bar">
                    <span>
                      En origen ({selectedLineItemObj.locationBin}): <strong>{remainingForSelectedLine} disp.</strong>
                    </span>
                    <span>·</span>
                    <span>
                      En destino:{' '}
                      <strong>
                        {destinationExistingItem
                          ? `${destinationExistingItem.stock} uds. en ${destinationExistingItem.locationBin}`
                          : 'Se creará registro de inventario en ubicación destino'}
                      </strong>
                    </span>
                  </div>
                )}

                {/* Draft Items Table */}
                {draftItems.length === 0 ? (
                  <div className="po-empty-lines-hint">
                    Selecciona un producto arriba y haz clic en <strong>Agregar</strong> para armar un traslado múltiple, o confirma directamente la selección actual.
                  </div>
                ) : (
                  <table className="po-builder-table">
                    <thead>
                      <tr>
                        <th>SKU / PRODUCTO</th>
                        <th>RACK ORIGEN</th>
                        <th>RACK DESTINO</th>
                        <th style={{ textAlign: 'center' }}>CANTIDAD</th>
                        <th style={{ textAlign: 'right' }}>VALOR</th>
                        <th style={{ width: 32 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {draftItems.map((line) => {
                        const maxQty =
                          inventory.find((i) => i.id === line.inventoryItemId)?.stock || line.quantity
                        return (
                          <tr key={line.id}>
                            <td>
                              <span className="sku-badge-small">{line.sku}</span>
                              <strong>{line.name}</strong>
                            </td>
                            <td>
                              <span className="location-bin-tag">{line.sourceBin}</span>
                            </td>
                            <td>
                              <input
                                type="text"
                                className="transfer-inline-bin-input"
                                value={line.targetBin}
                                onChange={(e) => handleUpdateDraftItemBin(line.id, e.target.value)}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div className="inline-threshold-input-group">
                                <button
                                  type="button"
                                  className="mini-stepper-btn"
                                  onClick={() => handleUpdateDraftItemQty(line.id, line.quantity - 1)}
                                >
                                  -
                                </button>
                                <span className="current-min-badge">{line.quantity}</span>
                                <button
                                  type="button"
                                  className="mini-stepper-btn"
                                  disabled={line.quantity >= maxQty}
                                  onClick={() => handleUpdateDraftItemQty(line.id, line.quantity + 1)}
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <strong>{money(line.quantity * line.unitCost)}</strong>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn-remove-line"
                                onClick={() => handleRemoveDraftItem(line.id)}
                                title="Quitar producto del traslado"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Logistics Metadata */}
              <div className={transferMode === 'in_transit' ? 'form-grid-3' : 'form-grid'}>
                <label className="form-field">
                  <span>Método / Transporte</span>
                  <select
                    value={transferCarrier}
                    onChange={(e) => setTransferCarrier(e.target.value)}
                  >
                    <option value="Mensajería interna">Mensajería interna</option>
                    <option value="Flete propio">Flete propio</option>
                    <option value="Logística del Valle">Logística del Valle</option>
                    <option value="Estafeta Express">Estafeta Express</option>
                    <option value="Recolección en sucursal">Recolección en sucursal</option>
                  </select>
                </label>

                {transferMode === 'in_transit' && (
                  <label className="form-field">
                    <span>Llegada estimada</span>
                    <input
                      type="date"
                      value={transferExpectedDate}
                      onChange={(e) => setTransferExpectedDate(e.target.value)}
                    />
                  </label>
                )}

                <label className="form-field">
                  <span>Responsable del envío</span>
                  <input
                    type="text"
                    value={transferResponsible}
                    onChange={(e) => setTransferResponsible(e.target.value)}
                    placeholder="Nombre del responsable"
                  />
                </label>
              </div>

              <label className="form-field">
                <span>Motivo o notas de traslado</span>
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
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={!sourceWarehouseId || !targetWarehouseId || (draftItems.length === 0 && !selectedLineItemObj)}
                >
                  {transferMode === 'immediate' ? (
                    <>
                      <CheckCircle2 size={14} /> Confirmar traslado inmediato
                    </>
                  ) : (
                    <>
                      <Truck size={14} /> Despachar en tránsito
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal: Detalle / Remisión de Traslado */}
      {selectedTransferDetail && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedTransferDetail(null)
          }}
        >
          <section className="create-modal modal-wide" role="dialog" aria-modal="true">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">REMISIÓN DE TRASLADO ENTRE UBICACIONES</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h2 style={{ margin: 0 }}>{selectedTransferDetail.folio}</h2>
                  <span className={`order-status-badge ${getTransferStatusBadge(selectedTransferDetail.status)}`}>
                    {selectedTransferDetail.status}
                  </span>
                </div>
                <p>Emitido el {selectedTransferDetail.date} · Responsable: {selectedTransferDetail.responsibleUser}</p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setSelectedTransferDetail(null)}
                aria-label="Cerrar detalle"
              >
                <X size={18} />
              </button>
            </div>

            <div className="po-detail-summary-grid" style={{ marginBottom: 14 }}>
              <div className="po-detail-card">
                <span>Almacén / Ubicación Origen</span>
                <strong>{selectedTransferDetail.sourceWarehouseName}</strong>
                <small>
                  {warehouses.find((w) => w.id === selectedTransferDetail.sourceWarehouseId)?.city || '—'}
                </small>
              </div>
              <div className="po-detail-card">
                <span>Almacén / Ubicación Destino</span>
                <strong>{selectedTransferDetail.targetWarehouseName}</strong>
                <small>
                  {warehouses.find((w) => w.id === selectedTransferDetail.targetWarehouseId)?.city || '—'}
                </small>
              </div>
              <div className="po-detail-card">
                <span>Logística & Valor</span>
                <strong>{money(selectedTransferDetail.totalValue)}</strong>
                <small>
                  {selectedTransferDetail.totalUnits} uds. · {selectedTransferDetail.carrierOrMethod}
                </small>
              </div>
            </div>

            <div className="table-wrap ops-table-wrap">
              <table className="data-table ops-data-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>PRODUCTO</th>
                    <th>RACK ORIGEN</th>
                    <th>RACK DESTINO</th>
                    <th style={{ textAlign: 'right' }}>CANTIDAD</th>
                    <th style={{ textAlign: 'right' }}>COSTO UNIT.</th>
                    <th style={{ textAlign: 'right' }}>SUBTOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTransferDetail.items.map((it) => (
                    <tr key={it.id}>
                      <td>
                        <span className="sku-badge">{it.sku}</span>
                      </td>
                      <td>
                        <strong>{it.name}</strong>
                      </td>
                      <td>
                        <span className="location-bin-tag">{it.sourceBin}</span>
                      </td>
                      <td>
                        <span className="location-bin-tag">{it.targetBin}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <strong>
                          {it.quantity} {it.unitOfMeasure}
                        </strong>
                      </td>
                      <td style={{ textAlign: 'right' }}>{money(it.unitCost)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <strong>{money(it.quantity * it.unitCost)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedTransferDetail.notes && (
              <div className="po-notes-preview">
                <strong>Notas logísticas:</strong> {selectedTransferDetail.notes}
              </div>
            )}

            <div className="create-modal-actions">
              {selectedTransferDetail.status === 'En tránsito' && (
                <>
                  <button
                    type="button"
                    className="button button-secondary"
                    style={{ color: '#ba4836' }}
                    onClick={() => handleCancelTransfer(selectedTransferDetail)}
                  >
                    <XCircle size={14} /> Cancelar traslado
                  </button>
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => handleReceiveTransfer(selectedTransferDetail)}
                  >
                    <PackageCheck size={14} /> Confirmar recepción en destino
                  </button>
                </>
              )}
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setSelectedTransferDetail(null)}
              >
                Cerrar
              </button>
            </div>
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
