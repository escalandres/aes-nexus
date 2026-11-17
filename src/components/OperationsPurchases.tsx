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
  Send,
  ReceiptText,
  ArrowRight,
  Ban,
  SlidersHorizontal,
  Calendar,
  Layers,
} from 'lucide-react'
import type {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
  Warehouse,
  InventoryItemLocation,
  StockMovement,
} from '../data/operations'
import type { BillPayable } from '../data/finance'
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
  payables?: BillPayable[]
  onRegisterSupplierBillFromPO?: (po: PurchaseOrder) => void
  onOpenFullPurchasesModule?: () => void
  canApprovePurchases?: boolean
}

const money = (val: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(val)

const ALL_PO_STATUSES: PurchaseOrderStatus[] = [
  'Emitida',
  'Recepción parcial',
  'Recibida',
  'Borrador',
  'Cancelada',
]

const SPANISH_MONTH_NUM: Record<string, number> = {
  ene: 1, enero: 1,
  feb: 2, febrero: 2,
  mar: 3, marzo: 3,
  abr: 4, abril: 4,
  may: 5, mayo: 5,
  jun: 6, junio: 6,
  jul: 7, julio: 7,
  ago: 8, agosto: 8,
  sep: 9, sept: 9, septiembre: 9,
  oct: 10, octubre: 10,
  nov: 11, noviembre: 11,
  dic: 12, diciembre: 12,
}

const MONTH_LABEL_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

const parsePoDateToIso = (rawDate: string): string => {
  const trimmed = rawDate.trim().toLowerCase()
  const esMatch = trimmed.match(/^(\d{1,2})\s+([a-záéíóú]+)\.?\s+(\d{4})$/i)
  if (esMatch) {
    const day = Number(esMatch[1])
    const month = SPANISH_MONTH_NUM[esMatch[2]]
    const year = Number(esMatch[3])
    if (month && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
  }
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashMatch) {
    return `${slashMatch[3]}-${String(Number(slashMatch[2])).padStart(2, '0')}-${String(Number(slashMatch[1])).padStart(2, '0')}`
  }
  return ''
}

const toLocalIsoDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

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
  payables = [],
  onRegisterSupplierBillFromPO,
  onOpenFullPurchasesModule,
  canApprovePurchases = true,
}: OperationsPurchasesProps) {
  const toast = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<PurchaseOrderStatus[]>([])
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [groupBy, setGroupBy] = useState<'none' | 'supplier' | 'status' | 'month'>('none')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

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

  // Supplier filter options with order counts
  const supplierOptions = useMemo(() => {
    const names = new Set<string>()
    suppliers.forEach((s) => {
      if (s.company.trim()) names.add(s.company.trim())
    })
    purchaseOrders.forEach((po) => {
      if (po.supplierCompany.trim()) names.add(po.supplierCompany.trim())
    })
    return Array.from(names)
      .sort((a, b) => a.localeCompare(b, 'es'))
      .map((company) => {
        const companyOrders = purchaseOrders.filter((po) => po.supplierCompany === company)
        const pendingCount = companyOrders.filter(
          (po) => po.status === 'Emitida' || po.status === 'Recepción parcial'
        ).length
        const pendingAmount = companyOrders
          .filter((po) => po.status === 'Emitida' || po.status === 'Recepción parcial')
          .reduce((acc, po) => acc + po.total, 0)
        return {
          company,
          totalCount: companyOrders.length,
          pendingCount,
          pendingAmount,
        }
      })
  }, [suppliers, purchaseOrders])

  // Orders scoped to selected suppliers and emission date range (used for status tab badges)
  const ordersBySupplierAndDate = useMemo(() => {
    return purchaseOrders.filter((po) => {
      if (selectedSuppliers.length > 0 && !selectedSuppliers.includes(po.supplierCompany)) {
        return false
      }
      if (dateFrom || dateTo) {
        const poIso = parsePoDateToIso(po.date)
        if (!poIso) return false
        if (dateFrom && poIso < dateFrom) return false
        if (dateTo && poIso > dateTo) return false
      }
      return true
    })
  }, [purchaseOrders, selectedSuppliers, dateFrom, dateTo])

  // Filtered orders
  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return ordersBySupplierAndDate.filter((po) => {
      const matchStatus =
        selectedStatuses.length === 0 || selectedStatuses.includes(po.status)
      const matchSearch =
        !q ||
        po.folio.toLowerCase().includes(q) ||
        po.supplierCompany.toLowerCase().includes(q) ||
        po.warehouseName.toLowerCase().includes(q) ||
        po.items.some((item) => item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q))
      return matchStatus && matchSearch
    })
  }, [ordersBySupplierAndDate, selectedStatuses, searchQuery])

  const groupedOrders = useMemo(() => {
    if (groupBy === 'none') {
      return [
        {
          key: '__all__',
          label: '',
          orders: filteredOrders,
          total: filteredOrders.reduce((acc, po) => acc + po.total, 0),
        },
      ]
    }
    const groups = new Map<string, { label: string; orders: PurchaseOrder[]; sortKey: string }>()
    for (const po of filteredOrders) {
      let key = ''
      let label = ''
      let sortKey = ''
      if (groupBy === 'supplier') {
        key = po.supplierCompany
        label = po.supplierCompany
        sortKey = po.supplierCompany
      } else if (groupBy === 'status') {
        key = po.status
        label = po.status
        sortKey = String(ALL_PO_STATUSES.indexOf(po.status))
      } else {
        const iso = parsePoDateToIso(po.date)
        if (iso) {
          const [y, m] = iso.split('-')
          const monthIdx = Math.max(0, Number(m) - 1)
          key = `${y}-${m}`
          label = `${MONTH_LABEL_ES[monthIdx] || m} ${y}`
          sortKey = key
        } else {
          key = 'sin-fecha'
          label = 'Sin fecha'
          sortKey = '0000-00'
        }
      }
      const existing = groups.get(key)
      if (existing) {
        existing.orders.push(po)
      } else {
        groups.set(key, { label, orders: [po], sortKey })
      }
    }
    return Array.from(groups.entries())
      .sort(([, a], [, b]) =>
        groupBy === 'month'
          ? b.sortKey.localeCompare(a.sortKey)
          : a.sortKey.localeCompare(b.sortKey, 'es')
      )
      .map(([key, g]) => ({
        key,
        label: g.label,
        orders: g.orders,
        total: g.orders.reduce((acc, po) => acc + po.total, 0),
      }))
  }, [filteredOrders, groupBy])

  const singleSelectedSupplierStats = useMemo(() => {
    if (selectedSuppliers.length !== 1) return null
    return supplierOptions.find((s) => s.company === selectedSuppliers[0]) ?? null
  }, [supplierOptions, selectedSuppliers])

  const activeAdvancedFiltersCount =
    (dateFrom || dateTo ? 1 : 0) +
    (selectedStatuses.length > 0 ? 1 : 0) +
    (selectedSuppliers.length > 0 ? 1 : 0) +
    (groupBy !== 'none' ? 1 : 0)

  const hasAnyActiveFilter = Boolean(
    searchQuery.trim() ||
      dateFrom ||
      dateTo ||
      selectedStatuses.length > 0 ||
      selectedSuppliers.length > 0 ||
      groupBy !== 'none'
  )

  const handleToggleStatus = (st: PurchaseOrderStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(st) ? prev.filter((item) => item !== st) : [...prev, st]
    )
  }

  const handleToggleSupplier = (company: string) => {
    setSelectedSuppliers((prev) =>
      prev.includes(company) ? prev.filter((c) => c !== company) : [...prev, company]
    )
  }

  const handleApplyDatePreset = (preset: 'month' | '30d' | 'quarter' | 'year') => {
    const now = new Date()
    const toStr = toLocalIsoDate(now)
    if (preset === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      setDateFrom(toLocalIsoDate(start))
      setDateTo(toStr)
    } else if (preset === '30d') {
      const start = new Date(now)
      start.setDate(now.getDate() - 30)
      setDateFrom(toLocalIsoDate(start))
      setDateTo(toStr)
    } else if (preset === 'quarter') {
      const qStartMonth = Math.floor(now.getMonth() / 3) * 3
      const start = new Date(now.getFullYear(), qStartMonth, 1)
      setDateFrom(toLocalIsoDate(start))
      setDateTo(toStr)
    } else {
      setDateFrom(`${now.getFullYear()}-01-01`)
      setDateTo(`${now.getFullYear()}-12-31`)
    }
  }

  const handleClearAllFilters = () => {
    setSearchQuery('')
    setSelectedStatuses([])
    setSelectedSuppliers([])
    setDateFrom('')
    setDateTo('')
    setGroupBy('none')
  }

  // Summary counts
  const totalPurchasesAmount = useMemo(() => {
    return filteredOrders.reduce((acc, po) => acc + po.total, 0)
  }, [filteredOrders])

  const pendingReceptionCount = useMemo(() => {
    return filteredOrders.filter((po) => po.status === 'Emitida' || po.status === 'Recepción parcial').length
  }, [filteredOrders])

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
            {(['Todas', 'Emitida', 'Recepción parcial', 'Recibida', 'Borrador'] as const).map((st) => {
              const isActive =
                st === 'Todas'
                  ? selectedStatuses.length === 0
                  : selectedStatuses.length === 1 && selectedStatuses[0] === st
              return (
                <button
                  key={st}
                  type="button"
                  className={`wh-tab ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedStatuses(st === 'Todas' ? [] : [st])}
                >
                  {st}
                  <span className="wh-badge">
                    {st === 'Todas'
                      ? ordersBySupplierAndDate.length
                      : ordersBySupplierAndDate.filter((po) => po.status === st).length}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="ops-actions-group">
          {onOpenFullPurchasesModule && (
            <button
              type="button"
              className="button button-secondary"
              onClick={onOpenFullPurchasesModule}
            >
              Módulo de Compras <ArrowRight size={13} />
            </button>
          )}
          <button
            className="button button-primary"
            onClick={() => {
              if (selectedSuppliers.length === 1) {
                setNewSupplierCompany(selectedSuppliers[0])
              } else if (suppliers.length > 0) {
                setNewSupplierCompany(suppliers[0].company)
              }
              setIsNewOrderModalOpen(true)
            }}
          >
            <Plus size={14} /> Nueva orden de compra
          </button>
        </div>
      </div>

      {/* Search, Quick Supplier Filter & Advanced Filter Toggle */}
      <div className="ops-subbar">
        <div className="ops-subbar-filters">
          <div className="ops-search-input-wrap ops-po-search">
            <Search size={14} />
            <input
              type="text"
              placeholder="Buscar por folio, proveedor, almacén o producto..."
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

          <div className="ops-supplier-filter-wrap">
            <Building2 size={14} className="ops-supplier-filter-icon" />
            <select
              aria-label="Filtrar por proveedor"
              value={
                selectedSuppliers.length === 0
                  ? 'Todos'
                  : selectedSuppliers.length === 1
                  ? selectedSuppliers[0]
                  : '__MULTI__'
              }
              onChange={(e) => {
                const val = e.target.value
                if (val === 'Todos') {
                  setSelectedSuppliers([])
                } else if (val !== '__MULTI__') {
                  setSelectedSuppliers([val])
                }
              }}
            >
              <option value="Todos">
                Todos los proveedores ({purchaseOrders.length})
              </option>
              {selectedSuppliers.length > 1 && (
                <option value="__MULTI__">
                  {selectedSuppliers.length} proveedores seleccionados
                </option>
              )}
              {supplierOptions.map((sup) => (
                <option key={sup.company} value={sup.company}>
                  {sup.company} —{' '}
                  {sup.pendingCount > 0
                    ? `${sup.pendingCount} ${sup.pendingCount === 1 ? 'pendiente' : 'pendientes'}`
                    : `${sup.totalCount} ${sup.totalCount === 1 ? 'orden' : 'órdenes'}`}
                </option>
              ))}
            </select>
            {selectedSuppliers.length > 0 && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSelectedSuppliers([])}
                title="Mostrar todos los proveedores"
                aria-label="Limpiar filtro de proveedor"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <button
            type="button"
            className={`ops-adv-toggle-btn ${
              showAdvancedFilters || activeAdvancedFiltersCount > 0 ? 'active' : ''
            }`}
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
            aria-expanded={showAdvancedFilters}
          >
            <SlidersHorizontal size={13} />
            Filtros avanzados
            {activeAdvancedFiltersCount > 0 && (
              <span className="ops-adv-count tabular-nums">{activeAdvancedFiltersCount}</span>
            )}
          </button>
        </div>

        <div className="ops-filter-meta">
          {singleSelectedSupplierStats ? (
            <span className="ops-supplier-summary-text">
              <strong>{singleSelectedSupplierStats.company}</strong>:{' '}
              {singleSelectedSupplierStats.pendingCount}{' '}
              {singleSelectedSupplierStats.pendingCount === 1 ? 'pendiente' : 'pendientes'} (
              {money(singleSelectedSupplierStats.pendingAmount)})
            </span>
          ) : selectedSuppliers.length > 1 ? (
            <span className="ops-supplier-summary-text">
              <strong>{selectedSuppliers.length} proveedores</strong> activos
            </span>
          ) : null}
          <span className="ops-supplier-summary-text">
            {filteredOrders.length} {filteredOrders.length === 1 ? 'orden' : 'órdenes'}
          </span>
          {hasAnyActiveFilter && (
            <button
              type="button"
              className="ops-clear-filters-btn"
              onClick={handleClearAllFilters}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <section
          className="ops-advanced-filter-panel"
          aria-label="Panel de filtros avanzados de órdenes de compra"
        >
          <div className="ops-adv-panel-header">
            <div className="ops-adv-panel-title">
              <SlidersHorizontal size={14} />
              <div>
                <strong>Filtros avanzados y agrupación</strong>
                <span>
                  Combina rango de fechas de emisión, múltiples estados y varios proveedores simultáneamente.
                </span>
              </div>
            </div>

            <div className="ops-adv-header-controls">
              <label className="ops-adv-groupby">
                <Layers size={13} aria-hidden="true" />
                <span>Agrupar por:</span>
                <select
                  aria-label="Agrupar órdenes por"
                  value={groupBy}
                  onChange={(e) =>
                    setGroupBy(e.target.value as 'none' | 'supplier' | 'status' | 'month')
                  }
                >
                  <option value="none">Sin agrupar</option>
                  <option value="supplier">Proveedor</option>
                  <option value="status">Estado de orden</option>
                  <option value="month">Mes de emisión</option>
                </select>
              </label>

              {hasAnyActiveFilter && (
                <button
                  type="button"
                  className="ops-clear-filters-btn"
                  onClick={handleClearAllFilters}
                >
                  Restablecer todo
                </button>
              )}
            </div>
          </div>

          <div className="ops-adv-grid">
            {/* Block 1: Emission Date Range */}
            <div className="ops-adv-block">
              <div className="ops-adv-block-head">
                <span>
                  <Calendar size={13} aria-hidden="true" /> Rango de fechas de emisión
                </span>
                {(dateFrom || dateTo) && (
                  <button
                    type="button"
                    className="ops-adv-inline-clear"
                    onClick={() => {
                      setDateFrom('')
                      setDateTo('')
                    }}
                  >
                    Limpiar fechas
                  </button>
                )}
              </div>

              <div className="ops-adv-date-inputs">
                <label className="ops-adv-date-field">
                  <span>Desde</span>
                  <input
                    type="date"
                    aria-label="Fecha de emisión desde"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </label>
                <label className="ops-adv-date-field">
                  <span>Hasta</span>
                  <input
                    type="date"
                    aria-label="Fecha de emisión hasta"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </label>
              </div>

              <div className="ops-adv-presets">
                <button type="button" onClick={() => handleApplyDatePreset('month')}>
                  Este mes
                </button>
                <button type="button" onClick={() => handleApplyDatePreset('30d')}>
                  Últimos 30 días
                </button>
                <button type="button" onClick={() => handleApplyDatePreset('quarter')}>
                  Este trimestre
                </button>
                <button type="button" onClick={() => handleApplyDatePreset('year')}>
                  Todo el año
                </button>
              </div>
            </div>

            {/* Block 2: Specific Order Statuses (multi-select) */}
            <div className="ops-adv-block">
              <div className="ops-adv-block-head">
                <span>Estados específicos de la orden</span>
                <div className="ops-adv-head-links">
                  <button
                    type="button"
                    className="ops-adv-inline-clear"
                    onClick={() => setSelectedStatuses(['Emitida', 'Recepción parcial'])}
                  >
                    Solo pendientes
                  </button>
                  {selectedStatuses.length > 0 && (
                    <button
                      type="button"
                      className="ops-adv-inline-clear"
                      onClick={() => setSelectedStatuses([])}
                    >
                      Todos
                    </button>
                  )}
                </div>
              </div>

              <div className="ops-adv-checklist">
                {ALL_PO_STATUSES.map((st) => {
                  const checked = selectedStatuses.includes(st)
                  const count = ordersBySupplierAndDate.filter((po) => po.status === st).length
                  return (
                    <label
                      key={st}
                      className={`ops-adv-check-item ${checked ? 'is-checked' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleStatus(st)}
                      />
                      <span className="ops-adv-check-label">{st}</span>
                      <span className="ops-adv-check-count tabular-nums">{count}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Block 3: Multi-Supplier Selector */}
            <div className="ops-adv-block">
              <div className="ops-adv-block-head">
                <span>
                  <Building2 size={13} aria-hidden="true" /> Múltiples proveedores (
                  {selectedSuppliers.length === 0 ? 'Todos' : selectedSuppliers.length})
                </span>
                <div className="ops-adv-head-links">
                  <button
                    type="button"
                    className="ops-adv-inline-clear"
                    onClick={() =>
                      setSelectedSuppliers(supplierOptions.map((s) => s.company))
                    }
                  >
                    Todos
                  </button>
                  {selectedSuppliers.length > 0 && (
                    <button
                      type="button"
                      className="ops-adv-inline-clear"
                      onClick={() => setSelectedSuppliers([])}
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              <div className="ops-adv-checklist ops-adv-suppliers-scroll">
                {supplierOptions.map((sup) => {
                  const checked = selectedSuppliers.includes(sup.company)
                  return (
                    <label
                      key={sup.company}
                      className={`ops-adv-check-item ${checked ? 'is-checked' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleSupplier(sup.company)}
                      />
                      <span className="ops-adv-check-label">{sup.company}</span>
                      <span className="ops-adv-check-count tabular-nums">
                        {sup.pendingCount > 0 ? `${sup.pendingCount} pend. · ` : ''}
                        {sup.totalCount} OC
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
      )}

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
                  No se encontraron órdenes de compra con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              groupedOrders.flatMap((group) => {
                const headerRow =
                  groupBy !== 'none' ? (
                    <tr key={`grp_${group.key}`} className="ops-group-header-row">
                      <td colSpan={9}>
                        <div className="ops-group-header-inner tabular-nums">
                          <strong>{group.label}</strong>
                          <span>
                            {group.orders.length}{' '}
                            {group.orders.length === 1 ? 'orden' : 'órdenes'} ·{' '}
                            {money(group.total)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : null

                const orderRows = group.orders.map((po) => {
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
                        {po.status === 'Borrador' && (
                          <button
                            className="button-icon-action action-receive"
                            title="Emitir orden de compra a proveedor"
                            onClick={() => {
                              if (!canApprovePurchases) {
                                toast.warning(
                                  'Tu rol actual no tiene permiso para emitir órdenes de compra.',
                                  'Permiso requerido'
                                )
                                return
                              }
                              onUpdatePurchaseOrders(
                                purchaseOrders.map((item) =>
                                  item.id === po.id ? { ...item, status: 'Emitida' } : item
                                )
                              )
                              toast.success(
                                `Orden ${po.folio} emitida y enviada a ${po.supplierCompany}.`,
                                'Orden emitida'
                              )
                            }}
                          >
                            <Send size={13} /> Emitir
                          </button>
                        )}
                        {canReceive && (
                          <button
                            className="button-icon-action action-receive"
                            title="Registrar recepción de mercancía"
                            onClick={() => handleOpenReception(po)}
                          >
                            <FileCheck2 size={13} /> Recepcionar
                          </button>
                        )}
                        {onRegisterSupplierBillFromPO &&
                          (po.status === 'Emitida' ||
                            po.status === 'Recepción parcial' ||
                            po.status === 'Recibida') &&
                          !payables.some((b) => b.purchaseOrderFolio === po.folio) && (
                            <button
                              className="button-icon-action"
                              title="Generar factura de proveedor en Cuentas por pagar"
                              onClick={() => onRegisterSupplierBillFromPO(po)}
                            >
                              <ReceiptText size={13} /> Facturar CxP
                            </button>
                          )}
                        {(po.status === 'Borrador' ||
                          (po.status === 'Emitida' && totalReceivedQty === 0)) && (
                          <button
                            className="button-icon-action"
                            title="Cancelar orden de compra"
                            onClick={() => {
                              if (!canApprovePurchases) {
                                toast.warning(
                                  'Tu rol actual no tiene permiso para cancelar órdenes de compra.',
                                  'Permiso requerido'
                                )
                                return
                              }
                              onUpdatePurchaseOrders(
                                purchaseOrders.map((item) =>
                                  item.id === po.id ? { ...item, status: 'Cancelada' } : item
                                )
                              )
                              toast.info(`Orden ${po.folio} marcada como cancelada.`, 'Orden cancelada')
                            }}
                          >
                            <Ban size={12} /> Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
                return headerRow ? [headerRow, ...orderRows] : orderRows
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
