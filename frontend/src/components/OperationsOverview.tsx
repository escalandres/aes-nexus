import { useMemo, useState } from 'react'
import {
  Boxes,
  ShoppingBag,
  Truck,
  AlertTriangle,
  ArrowRight,
  MapPin,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  SlidersHorizontal,
  Search,
  Download,
  ArrowUpDown,
  Layers,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import type {
  Warehouse,
  InventoryItemLocation,
  StockMovement,
  PurchaseOrder,
  ShipmentDelivery,
  MovementType,
} from '../data/operations'
import type { ProductServiceItem } from '../data/products'
import type { SalesOrder } from '../data/sales'
import { buildProductCategoryLookup, resolveInventoryItemCategory } from '../data/settings'
import { useI18n } from '../i18n/I18nContext'
import { getCurrencySymbol } from '../services/currencyService'
import { useToast } from './Toast'

interface OperationsOverviewProps {
  warehouses: Warehouse[]
  inventory: InventoryItemLocation[]
  movements: StockMovement[]
  purchaseOrders: PurchaseOrder[]
  shipments: ShipmentDelivery[]
  orders?: SalesOrder[]
  products?: ProductServiceItem[]
  onNavigateSection: (sec: 'Inventario' | 'Traslados' | 'Compras' | 'Entregas' | 'Resumen') => void
  onNavigatePurchases?: () => void
}

type VelocityTier = 'Alta' | 'Media' | 'Baja'
type VelocityFilter = 'Todas' | VelocityTier
type RotationWindowDays = 30 | 60 | 90
type RotationSortKey = 'value' | 'turnover' | 'unitsOut' | 'stock' | 'coverage'

const ES_MONTH_INDEX: Record<string, number> = {
  ene: 0,
  enero: 0,
  jan: 0,
  feb: 1,
  febrero: 1,
  mar: 2,
  marzo: 2,
  abr: 3,
  abril: 3,
  apr: 3,
  may: 4,
  mayo: 4,
  jun: 5,
  junio: 5,
  jul: 6,
  julio: 6,
  ago: 7,
  agosto: 7,
  aug: 7,
  sep: 8,
  sept: 8,
  septiembre: 8,
  oct: 9,
  octubre: 9,
  nov: 10,
  noviembre: 10,
  dic: 11,
  diciembre: 11,
  dec: 11,
}

function parseErpDateIso(raw?: string): string | null {
  if (!raw) return null
  const trimmed = raw.trim().toLowerCase()
  if (!trimmed) return null

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashMatch) {
    const day = Number(slashMatch[1])
    const monthIdx = Number(slashMatch[2]) - 1
    const year = Number(slashMatch[3])
    if (monthIdx >= 0 && monthIdx <= 11 && day >= 1 && day <= 31) {
      return `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
  }

  const humanMatch = trimmed.match(/^(\d{1,2})\s+([a-záéíóú]+)\.?\s+(\d{4})$/i)
  if (humanMatch) {
    const day = Number(humanMatch[1])
    const monthIdx = ES_MONTH_INDEX[humanMatch[2]]
    const year = Number(humanMatch[3])
    if (monthIdx !== undefined && day >= 1 && day <= 31) {
      return `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
  }

  return null
}

function shiftDateToIso(base: Date, deltaDays: number): string {
  const copy = new Date(base.getFullYear(), base.getMonth(), base.getDate() + deltaDays)
  return `${copy.getFullYear()}-${String(copy.getMonth() + 1).padStart(2, '0')}-${String(copy.getDate()).padStart(2, '0')}`
}

function formatCompactAxis(val: number, symbol: string): string {
  const abs = Math.abs(val)
  const sign = val < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}${symbol}${Math.round(abs / 1_000)}k`
  return `${sign}${symbol}${Math.round(abs)}`
}

function escapeCsvCell(value: string | number | undefined | null): string {
  const str = String(value ?? '')
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function OperationsOverview({
  warehouses,
  inventory,
  movements,
  purchaseOrders,
  shipments,
  orders = [],
  products = [],
  onNavigateSection,
  onNavigatePurchases,
}: OperationsOverviewProps) {
  const { reportingCurrency, convertAmount, formatCurrency } = useI18n()
  const toast = useToast()
  const money = (val: number) => formatCurrency(val, reportingCurrency, 0)
  const currencySymbol = getCurrencySymbol(reportingCurrency)

  // Consolidated view filter & sorting state
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('ALL')
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas')
  const [rotationWindowDays, setRotationWindowDays] = useState<RotationWindowDays>(30)
  const [velocityFilter, setVelocityFilter] = useState<VelocityFilter>('Todas')
  const [rotationQuery, setRotationQuery] = useState<string>('')
  const [sortBy, setSortBy] = useState<RotationSortKey>('value')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const rotationDateBounds = useMemo(() => {
    const now = new Date()
    const toIso = shiftDateToIso(now, 0)
    const fromIso = shiftDateToIso(now, -rotationWindowDays)
    const fmt = (iso: string) => {
      const [y, m, d] = iso.split('-')
      return `${d}/${m}/${y}`
    }
    return {
      fromIso,
      toIso,
      label: `${fmt(fromIso)} – ${fmt(toIso)}`,
    }
  }, [rotationWindowDays])

  // Lookup maps from product catalog (for category & currency)
  const productCategoryMap = useMemo(() => buildProductCategoryLookup(products), [products])
  const productCurrencyMap = useMemo(() => {
    const map = new Map<string, string>()
    products.forEach((p) => {
      if (p.id) map.set(p.id, p.currency || 'MXN')
      if (p.sku) map.set(p.sku.trim().toLowerCase(), p.currency || 'MXN')
    })
    return map
  }, [products])

  const resolveItemCurrency = (item: Pick<InventoryItemLocation, 'productId' | 'sku'>): string => {
    return (
      productCurrencyMap.get(item.productId) ||
      productCurrencyMap.get(item.sku.trim().toLowerCase()) ||
      'MXN'
    )
  }

  // Overall Inventory valuation (converted to reportingCurrency)
  const totalValuation = useMemo(() => {
    return inventory.reduce(
      (acc, it) => acc + convertAmount(it.stock * it.cost, resolveItemCurrency(it)),
      0
    )
  }, [inventory, convertAmount, productCurrencyMap])

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
    return pendingPOs.reduce((acc, po) => acc + convertAmount(po.total, po.currency || 'MXN'), 0)
  }, [pendingPOs, convertAmount])

  // Scoped inventory according to warehouse selector
  const scopedInventory = useMemo(() => {
    if (selectedWarehouseId === 'ALL') return inventory
    return inventory.filter((it) => it.warehouseId === selectedWarehouseId)
  }, [inventory, selectedWarehouseId])

  const selectedWarehouseName = useMemo(() => {
    if (selectedWarehouseId === 'ALL') return null
    return warehouses.find((w) => w.id === selectedWarehouseId)?.name || null
  }, [warehouses, selectedWarehouseId])

  // Consolidated Inventory Valuation by Category
  const categoryBreakdown = useMemo(() => {
    const catMap = new Map<
      string,
      {
        category: string
        skus: Set<string>
        locationsCount: number
        units: number
        reserved: number
        inTransit: number
        totalValue: number
      }
    >()

    scopedInventory.forEach((item) => {
      const cat = resolveInventoryItemCategory(item, productCategoryMap)
      const val = convertAmount(item.stock * item.cost, resolveItemCurrency(item))
      const entry = catMap.get(cat) || {
        category: cat,
        skus: new Set<string>(),
        locationsCount: 0,
        units: 0,
        reserved: 0,
        inTransit: 0,
        totalValue: 0,
      }
      entry.skus.add(item.sku.trim().toUpperCase())
      entry.locationsCount += 1
      entry.units += item.stock
      entry.reserved += item.reserved
      entry.inTransit += item.inTransit
      entry.totalValue += val
      catMap.set(cat, entry)
    })

    const list = Array.from(catMap.values()).sort((a, b) => b.totalValue - a.totalValue)
    const grandTotal = list.reduce((sum, item) => sum + item.totalValue, 0)

    return {
      grandTotal,
      rows: list.map((item) => ({
        category: item.category,
        skuCount: item.skus.size,
        locationsCount: item.locationsCount,
        units: item.units,
        reserved: item.reserved,
        inTransit: item.inTransit,
        totalValue: item.totalValue,
        sharePct: grandTotal > 0 ? (item.totalValue / grandTotal) * 100 : 0,
      })),
    }
  }, [scopedInventory, productCategoryMap, convertAmount, productCurrencyMap])

  // Consolidated Stock Rotation by SKU (combining warehouse stock + exits + non-cancelled orders)
  const stockRotationAll = useMemo(() => {
    type SkuBucket = {
      sku: string
      name: string
      category: string
      unitOfMeasure: string
      warehouses: Set<string>
      stock: number
      reserved: number
      inTransit: number
      minStock: number
      inventoryValue: number
    }

    const skuBuckets = new Map<string, SkuBucket>()
    scopedInventory.forEach((item) => {
      const key = item.sku.trim().toUpperCase()
      const cat = resolveInventoryItemCategory(item, productCategoryMap)
      const itemVal = convertAmount(item.stock * item.cost, resolveItemCurrency(item))
      const existing = skuBuckets.get(key)
      if (!existing) {
        skuBuckets.set(key, {
          sku: item.sku,
          name: item.name,
          category: cat,
          unitOfMeasure: item.unitOfMeasure,
          warehouses: new Set([item.warehouseName]),
          stock: item.stock,
          reserved: item.reserved,
          inTransit: item.inTransit,
          minStock: item.minStock,
          inventoryValue: itemVal,
        })
      } else {
        existing.warehouses.add(item.warehouseName)
        existing.stock += item.stock
        existing.reserved += item.reserved
        existing.inTransit += item.inTransit
        existing.minStock += item.minStock
        existing.inventoryValue += itemVal
      }
    })

    // Collect outward stock movements per SKU (avoiding double counting orders already logged as Salida)
    const movementOutBySku = new Map<string, number>()
    const transferBySku = new Map<string, number>()
    const loggedOrderFolios = new Set<string>()

    movements.forEach((mov) => {
      const movIso = parseErpDateIso(mov.date)
      if (movIso && (movIso < rotationDateBounds.fromIso || movIso > rotationDateBounds.toIso)) {
        return
      }
      const key = mov.sku.trim().toUpperCase()
      if (selectedWarehouseName) {
        const matchesSource = mov.sourceWarehouse === selectedWarehouseName
        const matchesTarget = mov.targetWarehouse === selectedWarehouseName
        if (!matchesSource && !matchesTarget) return
      }

      if (mov.type === 'Salida' || (mov.type === 'Ajuste' && mov.quantity < 0)) {
        if (selectedWarehouseName && mov.sourceWarehouse && mov.sourceWarehouse !== selectedWarehouseName) {
          return
        }
        movementOutBySku.set(key, (movementOutBySku.get(key) || 0) + Math.abs(mov.quantity))
        if (mov.referenceDoc) {
          loggedOrderFolios.add(`${key}::${mov.referenceDoc.trim().toUpperCase()}`)
        }
      } else if (mov.type === 'Transferencia') {
        transferBySku.set(key, (transferBySku.get(key) || 0) + Math.abs(mov.quantity))
      }
    })

    // Add active non-cancelled sales order quantities within the date range not yet reflected as Salida movements
    const orderDemandBySku = new Map<string, number>()
    if (selectedWarehouseId === 'ALL') {
      orders.forEach((ord) => {
        if (ord.status === 'Cancelado') return
        const ordIso = parseErpDateIso(ord.date)
        if (ordIso && (ordIso < rotationDateBounds.fromIso || ordIso > rotationDateBounds.toIso)) {
          return
        }
        const folioUpper = ord.folio.trim().toUpperCase()
        ord.items.forEach((li) => {
          if (li.type !== 'product') return
          const key = li.sku.trim().toUpperCase()
          if (loggedOrderFolios.has(`${key}::${folioUpper}`)) return
          orderDemandBySku.set(key, (orderDemandBySku.get(key) || 0) + li.quantity)
        })
      })
    }

    return Array.from(skuBuckets.values()).map((bucket) => {
      const key = bucket.sku.trim().toUpperCase()
      const unitsOut = (movementOutBySku.get(key) || 0) + (orderDemandBySku.get(key) || 0)
      const transfersCount = transferBySku.get(key) || 0
      const periodTurnoverPct =
        bucket.stock > 0 ? (unitsOut / bucket.stock) * 100 : unitsOut > 0 ? 100 : 0
      const annualizedTurnover =
        bucket.stock > 0
          ? (unitsOut / bucket.stock) * (360 / rotationWindowDays)
          : unitsOut > 0
            ? 360 / rotationWindowDays
            : 0
      const daysOfSupply =
        unitsOut > 0 ? Math.round((bucket.stock / unitsOut) * rotationWindowDays) : null

      const velocity: VelocityTier =
        annualizedTurnover >= 2.0 ? 'Alta' : annualizedTurnover > 0 ? 'Media' : 'Baja'

      return {
        sku: bucket.sku,
        name: bucket.name,
        category: bucket.category,
        unitOfMeasure: bucket.unitOfMeasure,
        warehousesCount: bucket.warehouses.size,
        stock: bucket.stock,
        reserved: bucket.reserved,
        inTransit: bucket.inTransit,
        minStock: bucket.minStock,
        inventoryValue: bucket.inventoryValue,
        unitsOut,
        transfersCount,
        periodTurnoverPct,
        annualizedTurnover,
        daysOfSupply,
        velocity,
        isLowStock: bucket.stock <= bucket.minStock,
      }
    })
  }, [
    scopedInventory,
    movements,
    orders,
    productCategoryMap,
    convertAmount,
    productCurrencyMap,
    selectedWarehouseId,
    selectedWarehouseName,
    rotationDateBounds,
    rotationWindowDays,
  ])

  const velocitySummary = useMemo(() => {
    const highItems = stockRotationAll.filter((r) => r.velocity === 'Alta')
    const medItems = stockRotationAll.filter((r) => r.velocity === 'Media')
    const lowItems = stockRotationAll.filter((r) => r.velocity === 'Baja')
    return {
      totalSkus: stockRotationAll.length,
      highCount: highItems.length,
      highValue: highItems.reduce((s, r) => s + r.inventoryValue, 0),
      medCount: medItems.length,
      medValue: medItems.reduce((s, r) => s + r.inventoryValue, 0),
      lowCount: lowItems.length,
      lowValue: lowItems.reduce((s, r) => s + r.inventoryValue, 0),
    }
  }, [stockRotationAll])

  const filteredAndSortedRotation = useMemo(() => {
    const q = rotationQuery.trim().toLowerCase()
    const filtered = stockRotationAll.filter((row) => {
      if (selectedCategory !== 'Todas' && row.category !== selectedCategory) return false
      if (velocityFilter !== 'Todas' && row.velocity !== velocityFilter) return false
      if (q) {
        const hay = `${row.sku} ${row.name} ${row.category}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })

    return filtered.sort((a, b) => {
      let diff = 0
      if (sortBy === 'value') diff = a.inventoryValue - b.inventoryValue
      else if (sortBy === 'turnover') diff = a.annualizedTurnover - b.annualizedTurnover
      else if (sortBy === 'unitsOut') diff = a.unitsOut - b.unitsOut
      else if (sortBy === 'stock') diff = a.stock - b.stock
      else if (sortBy === 'coverage') {
        const covA = a.daysOfSupply ?? Number.MAX_SAFE_INTEGER
        const covB = b.daysOfSupply ?? Number.MAX_SAFE_INTEGER
        diff = covA - covB
      }
      return sortDir === 'desc' ? -diff : diff
    })
  }, [stockRotationAll, selectedCategory, velocityFilter, rotationQuery, sortBy, sortDir])

  const handleToggleSort = (column: RotationSortKey) => {
    if (sortBy === column) {
      setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortBy(column)
      setSortDir('desc')
    }
  }

  const handleToggleCategoryFilter = (cat: string) => {
    setSelectedCategory((prev) => (prev === cat ? 'Todas' : cat))
  }

  const handleExportConsolidatedCsv = () => {
    const todayIso = new Date().toISOString().slice(0, 10)
    const warehouseLabel = selectedWarehouseName || 'Todos los almacenes'
    const roundNum = (n: number) => Number(n.toFixed(2))

    const rows: Array<Array<string | number>> = [
      ['Vista Consolidada de Inventario por Categoría y Rotación de Stock', '', '', '', '', '', '', ''],
      ['Fecha', todayIso, 'Almacén', warehouseLabel, 'Moneda', reportingCurrency, 'Rango análisis', `Últimos ${rotationWindowDays} días (${rotationDateBounds.label})`],
      ['', '', '', '', '', '', '', ''],
      ['VALOR MONETARIO POR CATEGORÍA', 'SKUS', 'UNIDADES', `VALOR (${reportingCurrency})`, 'PARTICIPACIÓN (%)', '', '', ''],
      ...categoryBreakdown.rows.map((cat) => [
        cat.category,
        cat.skuCount,
        cat.units,
        roundNum(cat.totalValue),
        `${cat.sharePct.toFixed(1)}%`,
        '',
        '',
        '',
      ]),
      ['', '', '', '', '', '', '', ''],
      [
        'SKU',
        'PRODUCTO',
        'CATEGORÍA',
        'STOCK ACTUAL',
        `VALOR (${reportingCurrency})`,
        `SALIDAS (${rotationWindowDays}D)`,
        'ROTACIÓN ANUAL (X)',
        'VELOCIDAD',
      ],
      ...filteredAndSortedRotation.map((row) => [
        row.sku,
        row.name,
        row.category,
        row.stock,
        roundNum(row.inventoryValue),
        row.unitsOut,
        `${row.annualizedTurnover.toFixed(1)}x`,
        `${row.velocity} velocidad`,
      ]),
    ]

    const csv = rows.map((r) => r.map(escapeCsvCell).join(',')).join('\r\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `inventario_categorias_rotacion_${rotationWindowDays}d_${reportingCurrency.toLowerCase()}_${todayIso}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success(`Consolidado de inventario y rotación (${rotationWindowDays} días) exportado.`, 'Exportación CSV')
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
              const whValuation = whItems.reduce(
                (acc, i) => acc + convertAmount(i.stock * i.cost, resolveItemCurrency(i)),
                0
              )

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
              onClick={() => (onNavigatePurchases ? onNavigatePurchases() : onNavigateSection('Compras'))}
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
                      onClick={() => (onNavigatePurchases ? onNavigatePurchases() : onNavigateSection('Compras'))}
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
                onClick={() => (onNavigatePurchases ? onNavigatePurchases() : onNavigateSection('Compras'))}
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

      {/* Consolidated Category Valuation & Stock Rotation View */}
      <section
        className="ops-panel-card ops-consolidated-section"
        aria-label="Vista consolidada de inventario por categoría y rotación de stock"
      >
        <div className="ops-consolidated-head">
          <div>
            <div className="panel-kicker">VISTA CONSOLIDADA · VALUACIÓN Y ROTACIÓN</div>
            <h3>Valor por Categoría y Velocidad de Rotación de Stock</h3>
            <div className="ops-consolidated-meta">
              <span>{selectedWarehouseName || 'Consolidado multi-almacén'}</span>
              <span aria-hidden="true">·</span>
              <span>Moneda: {reportingCurrency}</span>
              <span aria-hidden="true">·</span>
              <span>
                Salidas reales {rotationWindowDays} días ({rotationDateBounds.label})
              </span>
            </div>
          </div>

          <div className="ops-consolidated-controls">
            <div
              className="ops-velocity-tabs"
              role="group"
              aria-label="Rango de días para cálculo de rotación"
            >
              {([30, 60, 90] as RotationWindowDays[]).map((days) => (
                <button
                  key={days}
                  type="button"
                  className={`ops-velocity-tab ${rotationWindowDays === days ? 'active' : ''}`}
                  onClick={() => setRotationWindowDays(days)}
                >
                  {days} días
                </button>
              ))}
            </div>

            <select
              aria-label="Filtrar consolidado por almacén"
              className="ops-consolidated-select"
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
            >
              <option value="ALL">Todos los almacenes ({warehouses.length})</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.code} · {wh.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="ops-consolidated-export-btn"
              onClick={handleExportConsolidatedCsv}
              title="Descargar valuación por categoría y tabla de rotación en CSV"
            >
              <Download size={13} /> Exportar CSV
            </button>
          </div>
        </div>

        {/* Summary Strip */}
        <div className="ops-cat-summary-strip">
          <div className="ops-cat-summary-item">
            <span>VALUACIÓN CONSOLIDADA</span>
            <strong>{money(categoryBreakdown.grandTotal)}</strong>
            <small>{categoryBreakdown.rows.length} categorías activas</small>
          </div>

          <div className="ops-cat-summary-item">
            <span>ALTA VELOCIDAD</span>
            <strong className="text-positive">{velocitySummary.highCount} SKUs</strong>
            <small>{money(velocitySummary.highValue)} en stock activo</small>
          </div>

          <div className="ops-cat-summary-item">
            <span>VELOCIDAD MEDIA</span>
            <strong>{velocitySummary.medCount} SKUs</strong>
            <small>{money(velocitySummary.medValue)} rotación moderada</small>
          </div>

          <div className="ops-cat-summary-item">
            <span>BAJA VELOCIDAD / SIN SALIDAS</span>
            <strong className={velocitySummary.lowCount > 0 ? 'text-negative' : ''}>
              {velocitySummary.lowCount} SKUs
            </strong>
            <small>{money(velocitySummary.lowValue)} capital inmovilizado</small>
          </div>
        </div>

        {/* Category Valuation Chart + Category Table */}
        <div className="ops-cat-grid">
          <div className="ops-cat-chart-panel">
            <div className="ops-cat-subhead">
              <h4>Valor Monetario del Inventario por Categoría</h4>
              <span>Haz clic en una categoría para filtrar</span>
            </div>

            <div className="ops-cat-chart-wrap">
              {categoryBreakdown.rows.length === 0 ? (
                <div className="ops-all-stocked-note">
                  No hay existencias registradas para el almacén seleccionado.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categoryBreakdown.rows}
                    margin={{ top: 10, right: 12, left: 6, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(130, 145, 136, 0.22)" />
                    <XAxis
                      dataKey="category"
                      tick={{ fontSize: 11, fill: '#6e7e74' }}
                      axisLine={{ stroke: 'rgba(130, 145, 136, 0.35)' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#6e7e74' }}
                      tickFormatter={(v: number) => formatCompactAxis(v, currencySymbol)}
                      axisLine={false}
                      tickLine={false}
                      width={58}
                    />
                    <Tooltip
                      formatter={(value) => money(Number(value ?? 0))}
                      contentStyle={{
                        fontSize: '11px',
                        borderRadius: '8px',
                        border: '1px solid #d9e2da',
                      }}
                    />
                    <Bar
                      dataKey="totalValue"
                      name={`Valor (${reportingCurrency})`}
                      radius={[5, 5, 0, 0]}
                      maxBarSize={44}
                      onClick={(_data, index) => {
                        const row = categoryBreakdown.rows[index]
                        if (row?.category) {
                          handleToggleCategoryFilter(row.category)
                        }
                      }}
                    >
                      {categoryBreakdown.rows.map((entry) => {
                        const isSelected =
                          selectedCategory === 'Todas' || selectedCategory === entry.category
                        return (
                          <Cell
                            key={entry.category}
                            cursor="pointer"
                            fill={isSelected ? '#456a61' : '#b7c7be'}
                          />
                        )
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="ops-cat-table-panel">
            <div className="ops-cat-subhead">
              <h4>Desglose de Capital por Categoría</h4>
              <span>
                {selectedCategory === 'Todas'
                  ? 'Todas las categorías'
                  : `Filtro activo: ${selectedCategory}`}
              </span>
            </div>

            <div className="table-wrap">
              <table className="ops-cat-table">
                <thead>
                  <tr>
                    <th>CATEGORÍA</th>
                    <th className="is-num">SKUS</th>
                    <th className="is-num">UNIDADES</th>
                    <th className="is-num">VALOR ({reportingCurrency})</th>
                    <th className="is-num">% DEL TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryBreakdown.rows.map((cat) => {
                    const isSelected = selectedCategory === cat.category
                    return (
                      <tr
                        key={cat.category}
                        className={isSelected ? 'is-selected' : ''}
                        onClick={() => handleToggleCategoryFilter(cat.category)}
                        title="Clic para filtrar la tabla de rotación por esta categoría"
                      >
                        <td>
                          <strong>
                            <Layers size={12} style={{ verticalAlign: '-2px', marginRight: '5px' }} />
                            {cat.category}
                          </strong>
                        </td>
                        <td className="is-num">{cat.skuCount}</td>
                        <td className="is-num">{cat.units}</td>
                        <td className="is-num">
                          <strong>{money(cat.totalValue)}</strong>
                        </td>
                        <td className="is-num">
                          <div className="ops-cat-share-bar">
                            <span className="ops-cat-share-track">
                              <span style={{ width: `${Math.min(100, cat.sharePct)}%` }} />
                            </span>
                            <span>{cat.sharePct.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {categoryBreakdown.rows.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '18px' }}>
                        Sin categorías registradas en el alcance seleccionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Stock Rotation Table */}
        <div className="ops-rotation-block">
          <div className="ops-cat-subhead">
            <h4>Tabla de Rotación de Stock (Baja y Alta Velocidad)</h4>
            <span>
              Mostrando {filteredAndSortedRotation.length} de {stockRotationAll.length} SKUs
            </span>
          </div>

          <div className="ops-rotation-toolbar">
            <div className="ops-velocity-tabs" role="group" aria-label="Filtrar por velocidad de rotación">
              {(
                [
                  { id: 'Todas', label: `Todos (${velocitySummary.totalSkus})` },
                  { id: 'Alta', label: `Alta velocidad (${velocitySummary.highCount})` },
                  { id: 'Media', label: `Media (${velocitySummary.medCount})` },
                  { id: 'Baja', label: `Baja velocidad (${velocitySummary.lowCount})` },
                ] as Array<{ id: VelocityFilter; label: string }>
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`ops-velocity-tab ${velocityFilter === tab.id ? 'active' : ''}`}
                  onClick={() => setVelocityFilter(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="ops-rotation-filters">
              <select
                aria-label="Filtrar tabla de rotación por categoría"
                className="ops-consolidated-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="Todas">Todas las categorías</option>
                {categoryBreakdown.rows.map((cat) => (
                  <option key={cat.category} value={cat.category}>
                    {cat.category}
                  </option>
                ))}
              </select>

              <label className="ops-rotation-search">
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Buscar SKU o producto..."
                  aria-label="Buscar SKU o producto en rotación"
                  value={rotationQuery}
                  onChange={(e) => setRotationQuery(e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="table-wrap ops-table-wrap">
            <table className="data-table ops-data-table">
              <thead>
                <tr>
                  <th>SKU / PRODUCTO</th>
                  <th>CATEGORÍA</th>
                  <th style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="ops-sort-btn"
                      onClick={() => handleToggleSort('stock')}
                    >
                      STOCK ACTUAL <ArrowUpDown size={11} />
                    </button>
                  </th>
                  <th style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="ops-sort-btn"
                      onClick={() => handleToggleSort('value')}
                    >
                      VALOR ({reportingCurrency}) <ArrowUpDown size={11} />
                    </button>
                  </th>
                  <th style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="ops-sort-btn"
                      onClick={() => handleToggleSort('unitsOut')}
                    >
                      SALIDAS ({rotationWindowDays}D) <ArrowUpDown size={11} />
                    </button>
                  </th>
                  <th style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="ops-sort-btn"
                      onClick={() => handleToggleSort('turnover')}
                    >
                      ROTACIÓN ANUAL <ArrowUpDown size={11} />
                    </button>
                  </th>
                  <th style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="ops-sort-btn"
                      onClick={() => handleToggleSort('coverage')}
                    >
                      COBERTURA EST. <ArrowUpDown size={11} />
                    </button>
                  </th>
                  <th>VELOCIDAD</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedRotation.map((row) => (
                  <tr key={row.sku}>
                    <td>
                      <div className="prod-cell">
                        <span className="sku-badge-small">{row.sku}</span>
                        <div>
                          <strong>{row.name}</strong>
                          <div style={{ fontSize: '9px', color: '#7a887f' }}>
                            {row.warehousesCount}{' '}
                            {row.warehousesCount === 1 ? 'almacén' : 'almacenes'}
                            {row.reserved > 0 ? ` · ${row.reserved} reservadas` : ''}
                            {row.inTransit > 0 ? ` · ${row.inTransit} en tránsito` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{row.category}</td>
                    <td style={{ textAlign: 'right' }} className="ops-num">
                      <strong className={row.isLowStock ? 'text-alert' : ''}>
                        {row.stock} {row.unitOfMeasure}
                      </strong>
                    </td>
                    <td style={{ textAlign: 'right' }} className="ops-num">
                      <strong>{money(row.inventoryValue)}</strong>
                    </td>
                    <td style={{ textAlign: 'right' }} className="ops-num">
                      <strong>{row.unitsOut}</strong> {row.unitOfMeasure}
                    </td>
                    <td style={{ textAlign: 'right' }} className="ops-num">
                      <strong>{row.annualizedTurnover.toFixed(1)}x</strong>
                      <div style={{ fontSize: '9px', color: '#7a887f' }}>
                        {row.periodTurnoverPct.toFixed(1)}% / {rotationWindowDays}d
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }} className="ops-num">
                      {row.daysOfSupply !== null ? (
                        <span>{row.daysOfSupply} días</span>
                      ) : (
                        <span style={{ color: '#8a978f' }}>Sin salidas</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`ops-velocity-tag ${
                          row.velocity === 'Alta'
                            ? 'is-high'
                            : row.velocity === 'Media'
                              ? 'is-medium'
                              : 'is-low'
                        }`}
                      >
                        {row.velocity === 'Alta' && <TrendingUp size={11} />}
                        {row.velocity === 'Media' && <Clock size={11} />}
                        {row.velocity === 'Baja' && <TrendingDown size={11} />}
                        {row.velocity === 'Alta'
                          ? 'Alta velocidad'
                          : row.velocity === 'Media'
                            ? 'Velocidad media'
                            : 'Baja velocidad'}
                      </span>
                    </td>
                  </tr>
                ))}

                {filteredAndSortedRotation.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '20px' }}>
                      No hay SKUs que coincidan con los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

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
