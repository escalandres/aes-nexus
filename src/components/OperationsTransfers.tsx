import { useState, useMemo, useEffect } from 'react'
import {
  ArrowLeftRight,
  Boxes,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  MapPin,
  PackageCheck,
  Plus,
  Search,
  Trash2,
  Truck,
  X,
  XCircle,
} from 'lucide-react'
import type {
  Warehouse,
  InventoryItemLocation,
  InventoryTransfer,
  InventoryTransferItem,
  TransferStatus,
  StockMovement,
} from '../data/operations'
import { useToast } from './Toast'

interface OperationsTransfersProps {
  warehouses: Warehouse[]
  inventory: InventoryItemLocation[]
  transfers: InventoryTransfer[]
  movementsCount: number
  presetItem?: InventoryItemLocation | null
  onClearPresetItem?: () => void
  onUpdateInventory: (items: InventoryItemLocation[]) => void
  onUpdateTransfers: (transfers: InventoryTransfer[]) => void
  onAddMovement: (movement: StockMovement) => void
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

export function OperationsTransfers({
  warehouses,
  inventory,
  transfers,
  movementsCount,
  presetItem,
  onClearPresetItem,
  onUpdateInventory,
  onUpdateTransfers,
  onAddMovement,
}: OperationsTransfersProps) {
  const toast = useToast()

  const activeWarehouses = useMemo(
    () => warehouses.filter((w) => w.active),
    [warehouses]
  )

  // Builder form state
  const [sourceWarehouseId, setSourceWarehouseId] = useState<string>(
    () => activeWarehouses[0]?.id || ''
  )
  const [targetWarehouseId, setTargetWarehouseId] = useState<string>(
    () => activeWarehouses[1]?.id || ''
  )
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

  // History filter & detail modal state
  const [statusFilter, setStatusFilter] = useState<'Todos' | TransferStatus>('Todos')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTransferDetail, setSelectedTransferDetail] = useState<InventoryTransfer | null>(null)

  const getDefaultTargetBin = (sku: string, productId: string, destWhId: string) => {
    const existing = inventory.find(
      (i) => i.warehouseId === destWhId && (i.productId === productId || i.sku === sku)
    )
    if (existing) return existing.locationBin
    const destWh = warehouses.find((w) => w.id === destWhId)
    return destWh ? `Recepción ${destWh.code}` : 'Recepción N-01'
  }

  // Sync defaults when warehouses list changes or presetItem is passed from Inventario
  useEffect(() => {
    if (presetItem) {
      const originId = presetItem.warehouseId
      const destId =
        activeWarehouses.find((w) => w.id !== originId)?.id || ''
      setSourceWarehouseId(originId)
      setTargetWarehouseId(destId)

      if (presetItem.stock > 0 && destId) {
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
            targetBin: getDefaultTargetBin(presetItem.sku, presetItem.productId, destId),
          },
        ])
      }
      const nextCand = inventory.find(
        (i) => i.warehouseId === originId && i.stock > 0 && i.id !== presetItem.id
      )
      setLineItemId(nextCand?.id || '')
      setLineQty(1)
      setLineTargetBin(
        nextCand && destId
          ? getDefaultTargetBin(nextCand.sku, nextCand.productId, destId)
          : ''
      )
      onClearPresetItem?.()
    }
  }, [presetItem])

  // Ensure valid initial lineItemId when sourceWarehouseId is set
  const sourceAvailableItems = useMemo(() => {
    return inventory.filter(
      (i) => i.warehouseId === sourceWarehouseId && i.stock > 0
    )
  }, [inventory, sourceWarehouseId])

  useEffect(() => {
    if (!sourceWarehouseId && activeWarehouses.length > 0) {
      setSourceWarehouseId(activeWarehouses[0].id)
    }
    if ((!targetWarehouseId || targetWarehouseId === sourceWarehouseId) && activeWarehouses.length > 1) {
      const nextDest = activeWarehouses.find((w) => w.id !== sourceWarehouseId)?.id || ''
      setTargetWarehouseId(nextDest)
    }
  }, [activeWarehouses, sourceWarehouseId, targetWarehouseId])

  useEffect(() => {
    if (sourceAvailableItems.length > 0 && !sourceAvailableItems.some((i) => i.id === lineItemId)) {
      const first = sourceAvailableItems[0]
      setLineItemId(first.id)
      setLineQty(1)
      if (targetWarehouseId) {
        setLineTargetBin(getDefaultTargetBin(first.sku, first.productId, targetWarehouseId))
      }
    } else if (sourceAvailableItems.length === 0) {
      setLineItemId('')
    }
  }, [sourceAvailableItems, lineItemId, targetWarehouseId])

  const sourceWarehouse = useMemo(
    () => warehouses.find((w) => w.id === sourceWarehouseId) || null,
    [warehouses, sourceWarehouseId]
  )

  const targetWarehouse = useMemo(
    () => warehouses.find((w) => w.id === targetWarehouseId) || null,
    [warehouses, targetWarehouseId]
  )

  const selectedLineItemObj = useMemo(
    () => sourceAvailableItems.find((i) => i.id === lineItemId) || null,
    [sourceAvailableItems, lineItemId]
  )

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

  const draftTotals = useMemo(() => {
    return draftItems.reduce(
      (acc, item) => ({
        units: acc.units + item.quantity,
        value: acc.value + item.quantity * item.unitCost,
      }),
      { units: 0, value: 0 }
    )
  }, [draftItems])

  // Summary metrics
  const inTransitCount = useMemo(
    () => transfers.filter((t) => t.status === 'En tránsito').length,
    [transfers]
  )
  const completedCount = useMemo(
    () => transfers.filter((t) => t.status === 'Completado').length,
    [transfers]
  )
  const totalMovedUnits = useMemo(
    () =>
      transfers
        .filter((t) => t.status !== 'Cancelado')
        .reduce((acc, t) => acc + t.totalUnits, 0),
    [transfers]
  )

  const filteredTransfers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return transfers.filter((trf) => {
      const matchStatus = statusFilter === 'Todos' || trf.status === statusFilter
      const matchSearch =
        !q ||
        trf.folio.toLowerCase().includes(q) ||
        trf.sourceWarehouseName.toLowerCase().includes(q) ||
        trf.targetWarehouseName.toLowerCase().includes(q) ||
        trf.responsibleUser.toLowerCase().includes(q) ||
        trf.items.some(
          (it) => it.sku.toLowerCase().includes(q) || it.name.toLowerCase().includes(q)
        )
      return matchStatus && matchSearch
    })
  }, [transfers, statusFilter, searchQuery])

  const handleSourceChange = (newSourceId: string) => {
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

  const handleTargetChange = (newTargetId: string) => {
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

  const handleSwapLocations = () => {
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

  const handleAddArticle = () => {
    if (!selectedLineItemObj) {
      toast.warning('Selecciona un artículo con stock disponible en la ubicación de origen.', 'Artículo requerido')
      return
    }
    if (lineQty <= 0 || lineQty > remainingForSelectedLine) {
      toast.warning(
        `Cantidad inválida. Disponible restante de ${selectedLineItemObj.sku}: ${remainingForSelectedLine} uds.`,
        'Stock insuficiente'
      )
      return
    }

    const targetBinVal =
      lineTargetBin.trim() ||
      getDefaultTargetBin(selectedLineItemObj.sku, selectedLineItemObj.productId, targetWarehouseId)

    const existingIdx = draftItems.findIndex(
      (d) => d.inventoryItemId === selectedLineItemObj.id
    )
    if (existingIdx >= 0) {
      setDraftItems((prev) =>
        prev.map((d, idx) =>
          idx === existingIdx
            ? { ...d, quantity: d.quantity + lineQty, targetBin: targetBinVal }
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
          targetBin: targetBinVal,
        },
      ])
    }

    setLineQty(1)
  }

  const handleUpdateDraftQty = (id: string, nextQty: number) => {
    const targetDraft = draftItems.find((d) => d.id === id)
    if (!targetDraft) return
    const maxStock =
      inventory.find((i) => i.id === targetDraft.inventoryItemId)?.stock || 1
    const clamped = Math.max(1, Math.min(maxStock, nextQty))
    setDraftItems((prev) =>
      prev.map((d) => (d.id === id ? { ...d, quantity: clamped } : d))
    )
  }

  const handleUpdateDraftBin = (id: string, bin: string) => {
    setDraftItems((prev) =>
      prev.map((d) => (d.id === id ? { ...d, targetBin: bin } : d))
    )
  }

  const handleRemoveDraftItem = (id: string) => {
    setDraftItems((prev) => prev.filter((d) => d.id !== id))
  }

  const handleSubmitTransfer = (e: React.FormEvent) => {
    e.preventDefault()

    if (!sourceWarehouse || !targetWarehouse || sourceWarehouse.id === targetWarehouse.id) {
      toast.warning('Selecciona ubicaciones de origen y destino diferentes.', 'Ubicación inválida')
      return
    }

    let itemsToTransfer = [...draftItems]
    if (itemsToTransfer.length === 0 && selectedLineItemObj && lineQty > 0) {
      if (lineQty > selectedLineItemObj.stock) {
        toast.warning(
          `Stock insuficiente en ${sourceWarehouse.name}: solo hay ${selectedLineItemObj.stock} unidades disponibles.`,
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
            getDefaultTargetBin(selectedLineItemObj.sku, selectedLineItemObj.productId, targetWarehouse.id),
        },
      ]
    }

    if (itemsToTransfer.length === 0) {
      toast.warning('Agrega al menos un artículo para trasladar.', 'Sin artículos')
      return
    }

    // Validate live stock
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

    const updatedInventory = [...inventory]
    for (const line of itemsToTransfer) {
      const srcIdx = updatedInventory.findIndex((i) => i.id === line.inventoryItemId)
      if (srcIdx === -1) continue
      const srcItem = updatedInventory[srcIdx]
      updatedInventory[srcIdx] = {
        ...srcItem,
        stock: Math.max(0, srcItem.stock - line.quantity),
      }

      const destIdx = updatedInventory.findIndex(
        (i) =>
          i.warehouseId === targetWarehouse.id &&
          (i.productId === line.productId || i.sku === line.sku)
      )

      if (destIdx !== -1) {
        const destItem = updatedInventory[destIdx]
        updatedInventory[destIdx] = {
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
    const transferFolio = `TRF-2026-${String(transfers.length + 1).padStart(3, '0')}`
    const totalUnits = itemsToTransfer.reduce((s, it) => s + it.quantity, 0)
    const totalValue = itemsToTransfer.reduce((s, it) => s + it.quantity * it.unitCost, 0)

    let formattedExpected: string | undefined
    if (transferMode === 'in_transit' && transferExpectedDate) {
      const parsed = new Date(`${transferExpectedDate}T12:00:00`)
      if (!Number.isNaN(parsed.getTime())) {
        formattedExpected = formatSpanishDate(parsed)
      }
    }

    const newTransfer: InventoryTransfer = {
      id: `trf_${Date.now()}`,
      folio: transferFolio,
      date: todayStr,
      expectedArrival: formattedExpected,
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

    itemsToTransfer.forEach((line, idx) => {
      onAddMovement({
        id: `mov_${Date.now()}_${idx}`,
        folio: `MOV-2026-${String(movementsCount + 1 + idx).padStart(3, '0')}`,
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
        ? `Traslado ${transferFolio} completado: ${totalUnits} uds. movidas de ${sourceWarehouse.name} a ${targetWarehouse.name}.`
        : `Traslado ${transferFolio} despachado en tránsito (${totalUnits} uds.) hacia ${targetWarehouse.name}.`,
      transferMode === 'immediate' ? 'Traslado completado' : 'Traslado en tránsito'
    )

    setDraftItems([])
    setTransferNotes('')
    setLineQty(1)
  }

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
        folio: `MOV-2026-${String(movementsCount + 1 + idx).padStart(3, '0')}`,
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
        folio: `MOV-2026-${String(movementsCount + 1 + idx).padStart(3, '0')}`,
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

  const handleExportTransfersCSV = () => {
    if (filteredTransfers.length === 0) {
      toast.warning('No hay traslados para exportar con los filtros actuales.', 'Sin registros')
      return
    }
    const escapeCSV = (value: string | number | null | undefined): string => {
      if (value === null || value === undefined) return '""'
      return `"${String(value).replace(/"/g, '""')}"`
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
    const rows = filteredTransfers.map((trf) =>
      [
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
      ].join(',')
    )
    const csvContent = '\uFEFF' + [headers.map(escapeCSV).join(','), ...rows].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `traslados_ubicaciones_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(
      `Se descargó el CSV con ${filteredTransfers.length} traslados entre ubicaciones.`,
      'Descarga completada'
    )
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
      {/* Header Strip */}
      <div className="ops-header-strip">
        <div className="ops-header-left">
          <div className="ops-icon-box">
            <ArrowLeftRight size={20} />
          </div>
          <div>
            <h2>Traslados entre ubicaciones</h2>
            <p>
              Selecciona el almacén o ubicación de origen y destino, agrega los artículos a trasladar y controla entregas en tránsito.
            </p>
          </div>
        </div>

        <div className="ops-header-right">
          <div className="ops-stat-item">
            <span className="ops-stat-label">Ubicaciones activas</span>
            <strong className="ops-stat-val">{activeWarehouses.length}</strong>
          </div>
          <div className="ops-stat-item">
            <span className="ops-stat-label">En tránsito</span>
            <strong className="ops-stat-val" style={{ color: inTransitCount > 0 ? '#386494' : undefined }}>
              {inTransitCount}
            </strong>
          </div>
          <div className="ops-stat-item">
            <span className="ops-stat-label">Completados</span>
            <strong className="ops-stat-val">{completedCount}</strong>
          </div>
          <div className="ops-stat-item">
            <span className="ops-stat-label">Unidades movilizadas</span>
            <strong className="ops-stat-val">{totalMovedUnits}</strong>
          </div>
        </div>
      </div>

      {/* Inline Transfer Builder Card */}
      <section className="ops-panel-card transfer-builder-panel" aria-label="Formulario de nuevo traslado entre ubicaciones">
        <div className="ops-panel-header">
          <div>
            <div className="panel-kicker">CREAR NUEVO TRASLADO</div>
            <h3>Programar o ejecutar traslado entre almacenes / ubicaciones</h3>
          </div>
          {draftItems.length > 0 && (
            <span className="transfer-draft-summary-pill">
              {draftItems.length} {draftItems.length === 1 ? 'artículo agregado' : 'artículos agregados'} · {draftTotals.units} uds. · {money(draftTotals.value)}
            </span>
          )}
        </div>

        <form onSubmit={handleSubmitTransfer} className="transfer-inline-form">
          {/* Paso 1: Ubicación Origen -> Ubicación Destino */}
          <div className="transfer-route-selector-card">
            <div className="transfer-loc-col">
              <label className="form-field" style={{ margin: 0 }}>
                <span>Ubicación de origen *</span>
                <select
                  required
                  value={sourceWarehouseId}
                  onChange={(e) => handleSourceChange(e.target.value)}
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
              {sourceWarehouse && (
                <small className="transfer-loc-meta">
                  <MapPin size={11} /> {sourceWarehouse.address} · {sourceWarehouse.city}, {sourceWarehouse.state}
                </small>
              )}
            </div>

            <button
              type="button"
              className="transfer-swap-btn"
              onClick={handleSwapLocations}
              title="Intercambiar ubicación de origen y destino"
              aria-label="Intercambiar ubicación de origen y destino"
            >
              <ArrowLeftRight size={15} />
            </button>

            <div className="transfer-loc-col">
              <label className="form-field" style={{ margin: 0 }}>
                <span>Ubicación de destino *</span>
                <select
                  required
                  value={targetWarehouseId}
                  onChange={(e) => handleTargetChange(e.target.value)}
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
              {targetWarehouse && (
                <small className="transfer-loc-meta">
                  <MapPin size={11} /> {targetWarehouse.address} · {targetWarehouse.city}, {targetWarehouse.state}
                </small>
              )}
            </div>
          </div>

          {/* Paso 2: Agregar artículos a trasladar */}
          <div className="po-items-builder-box" style={{ margin: 0 }}>
            <div className="po-builder-title">
              <Boxes size={14} /> Agregar artículos a trasladar desde {sourceWarehouse?.name || 'origen'}
            </div>

            <div className="po-add-line-strip" style={{ paddingTop: 0, borderTop: 0, paddingBottom: 10, borderBottom: '1px solid #e8ede6' }}>
              <div className="po-add-prod-select">
                <label>Artículo disponible en origen</label>
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
                      ? 'Sin artículos con existencias en esta ubicación...'
                      : 'Selecciona un artículo...'}
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
                className="button button-primary po-add-btn"
                onClick={handleAddArticle}
                disabled={!selectedLineItemObj || remainingForSelectedLine <= 0}
              >
                <Plus size={13} /> Agregar artículo
              </button>
            </div>

            {selectedLineItemObj && (
              <div className="transfer-line-hint-bar">
                <span>
                  Stock en origen ({selectedLineItemObj.locationBin}): <strong>{remainingForSelectedLine} uds. disponibles</strong>
                </span>
                <span>·</span>
                <span>
                  Stock en destino:{' '}
                  <strong>
                    {destinationExistingItem
                      ? `${destinationExistingItem.stock} uds. en ${destinationExistingItem.locationBin}`
                      : 'Se dará de alta en ubicación destino'}
                  </strong>
                </span>
              </div>
            )}

            {draftItems.length === 0 ? (
              <div className="po-empty-lines-hint">
                Selecciona los artículos arriba y haz clic en <strong>Agregar artículo</strong> para incluir múltiples productos en el traslado.
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
                            onChange={(e) => handleUpdateDraftBin(line.id, e.target.value)}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="inline-threshold-input-group">
                            <button
                              type="button"
                              className="mini-stepper-btn"
                              onClick={() => handleUpdateDraftQty(line.id, line.quantity - 1)}
                            >
                              -
                            </button>
                            <span className="current-min-badge">{line.quantity}</span>
                            <button
                              type="button"
                              className="mini-stepper-btn"
                              disabled={line.quantity >= maxQty}
                              onClick={() => handleUpdateDraftQty(line.id, line.quantity + 1)}
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
                            title="Quitar artículo"
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

          {/* Paso 3: Modalidad y datos logísticos */}
          <div className="transfer-mode-grid" style={{ marginBottom: 0 }}>
            <button
              type="button"
              className={`transfer-mode-card ${transferMode === 'immediate' ? 'active' : ''}`}
              onClick={() => setTransferMode('immediate')}
            >
              <div className="mode-card-top">
                <CheckCircle2 size={14} />
                <strong>Traslado inmediato</strong>
              </div>
              <small>Descuenta existencias del origen y las ingresa al instante en la ubicación destino.</small>
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
              <small>Descuenta del origen, marca unidades en tránsito y confirma la recepción al llegar.</small>
            </button>
          </div>

          <div className={transferMode === 'in_transit' ? 'form-grid-4' : 'form-grid-3'}>
            <label className="form-field">
              <span>Transporte / Método</span>
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
              <span>Responsable</span>
              <input
                type="text"
                value={transferResponsible}
                onChange={(e) => setTransferResponsible(e.target.value)}
                placeholder="Nombre del responsable"
              />
            </label>

            <label className="form-field">
              <span>Motivo / Notas</span>
              <input
                type="text"
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="Ej. Rebalanceo de stock para sucursal"
              />
            </label>
          </div>

          <div className="transfer-submit-bar">
            <span className="transfer-submit-summary">
              {sourceWarehouse && targetWarehouse
                ? `${sourceWarehouse.name} → ${targetWarehouse.name}`
                : 'Selecciona ubicaciones de origen y destino'}
            </span>
            <button
              type="submit"
              className="button button-primary"
              disabled={!sourceWarehouse || !targetWarehouse || (draftItems.length === 0 && !selectedLineItemObj)}
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

      {/* Toolbar & Filters for Transfer History */}
      <div className="ops-subbar">
        <div className="transfer-status-filter-pills">
          {(['Todos', 'En tránsito', 'Completado', 'Cancelado'] as const).map((st) => (
            <button
              key={st}
              type="button"
              className={`transfer-filter-chip ${statusFilter === st ? 'active' : ''}`}
              onClick={() => setStatusFilter(st)}
            >
              {st}
              {st === 'Todos'
                ? ` (${transfers.length})`
                : ` (${transfers.filter((t) => t.status === st).length})`}
            </button>
          ))}
        </div>

        <div className="ops-search-row">
          <div className="ops-search-input-wrap">
            <Search size={14} />
            <input
              type="text"
              placeholder="Buscar por folio, ubicación o SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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

          <button
            type="button"
            className="button button-secondary ops-export-csv-btn"
            onClick={handleExportTransfersCSV}
          >
            <Download size={13} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Transfers History Table */}
      <div className="table-wrap ops-table-wrap">
        <table className="data-table ops-data-table">
          <thead>
            <tr>
              <th>FOLIO</th>
              <th>FECHA</th>
              <th>RUTA (ORIGEN → DESTINO)</th>
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
                  No se encontraron traslados entre ubicaciones con los filtros actuales.
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
                        {trf.items.length} {trf.items.length === 1 ? 'artículo' : 'artículos'}
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
                            title="Confirmar recepción física en destino"
                          >
                            <PackageCheck size={12} /> Recibir
                          </button>
                          <button
                            type="button"
                            className="button-icon-action action-cancel-trf"
                            onClick={() => handleCancelTransfer(trf)}
                            title="Cancelar traslado y devolver unidades al origen"
                          >
                            <XCircle size={12} />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="button-icon-action"
                        onClick={() => setSelectedTransferDetail(trf)}
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
                <span>Ubicación Origen</span>
                <strong>{selectedTransferDetail.sourceWarehouseName}</strong>
                <small>
                  {warehouses.find((w) => w.id === selectedTransferDetail.sourceWarehouseId)?.city || '—'}
                </small>
              </div>
              <div className="po-detail-card">
                <span>Ubicación Destino</span>
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
    </div>
  )
}
