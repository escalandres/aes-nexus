import type { InventoryItemLocation } from '../data/operations'
import type { ProductServiceItem, UnitOfMeasure } from '../data/products'

export interface ProductWarehouseSummary {
  totalStock: number
  totalReserved: number
  totalInTransit: number
  warehouseCount: number
  lowStockWarehouseCount: number
  totalValuation: number
  locations: InventoryItemLocation[]
}

export function normalizeCatalogSku(sku: string): string {
  return sku.trim().toLowerCase()
}

export function doesInventoryMatchProduct(
  inv: InventoryItemLocation,
  product: Pick<ProductServiceItem, 'id' | 'sku'>,
  previousSku?: string
): boolean {
  if (inv.productId && inv.productId === product.id) return true
  const invSku = normalizeCatalogSku(inv.sku)
  if (invSku && invSku === normalizeCatalogSku(product.sku)) return true
  if (previousSku && invSku && invSku === normalizeCatalogSku(previousSku)) return true
  return false
}

export function normalizeUnitOfMeasure(raw?: string): UnitOfMeasure {
  const val = (raw || '').trim().toLowerCase()
  if (val === 'hrs' || val === 'hora' || val === 'horas') return 'Hrs'
  if (val === 'servicio') return 'Servicio'
  if (val === 'mes') return 'Mes'
  if (val === 'licencia') return 'Licencia'
  if (val === 'paquete') return 'Paquete'
  return 'Pza'
}

export function buildProductInventorySummaryMap(
  catalogProducts: ProductServiceItem[],
  effectiveInventory: InventoryItemLocation[]
): Map<string, ProductWarehouseSummary> {
  const map = new Map<string, ProductWarehouseSummary>()

  catalogProducts.forEach((product) => {
    if (product.type !== 'product') return
    const locations = effectiveInventory.filter((inv) =>
      doesInventoryMatchProduct(inv, product)
    )
    const totalStock = locations.reduce((sum, inv) => sum + inv.stock, 0)
    const totalReserved = locations.reduce((sum, inv) => sum + inv.reserved, 0)
    const totalInTransit = locations.reduce((sum, inv) => sum + inv.inTransit, 0)
    const lowStockWarehouseCount = locations.filter(
      (inv) => inv.stock <= inv.minStock
    ).length
    const totalValuation = locations.reduce(
      (sum, inv) => sum + inv.stock * (inv.cost ?? product.cost ?? product.unitPrice * 0.7),
      0
    )

    map.set(product.id, {
      totalStock,
      totalReserved,
      totalInTransit,
      warehouseCount: locations.length,
      lowStockWarehouseCount,
      totalValuation,
      locations,
    })
  })

  return map
}

export function deriveSyncedProducts(
  catalogProducts: ProductServiceItem[],
  effectiveInventory: InventoryItemLocation[]
): ProductServiceItem[] {
  const summaryMap = buildProductInventorySummaryMap(catalogProducts, effectiveInventory)

  return catalogProducts.map((product) => {
    if (product.type !== 'product') return product
    const summary = summaryMap.get(product.id)
    if (!summary) return product

    const primaryLoc = summary.locations[0]
    return {
      ...product,
      stock: summary.totalStock,
      minStock: primaryLoc ? primaryLoc.minStock : product.minStock,
      cost: primaryLoc ? primaryLoc.cost : product.cost,
    }
  })
}

export function findUnlinkedInventorySkus(
  nextInventory: InventoryItemLocation[],
  existingProducts: ProductServiceItem[]
): InventoryItemLocation[] {
  const seenSkus = new Set(
    existingProducts.map((p) => normalizeCatalogSku(p.sku)).filter(Boolean)
  )
  const seenIds = new Set(existingProducts.map((p) => p.id))
  const missing: InventoryItemLocation[] = []

  for (const inv of nextInventory) {
    const skuKey = normalizeCatalogSku(inv.sku)
    if (!skuKey) continue
    if (seenIds.has(inv.productId) || seenSkus.has(skuKey)) continue
    seenSkus.add(skuKey)
    missing.push(inv)
  }
  return missing
}

export function buildCatalogProductFromInventory(
  inv: InventoryItemLocation,
  todayLabel: string
): ProductServiceItem {
  const cost = Math.max(0, Number(inv.cost) || 0)
  const suggestedPrice = cost > 0 ? Math.round(cost * 1.35 * 100) / 100 : 0
  return {
    id: inv.productId && !inv.productId.startsWith('prod_auto_') ? inv.productId : `prod_${Date.now()}_${inv.sku}`,
    sku: inv.sku.trim().toUpperCase(),
    name: inv.name.trim(),
    type: 'product',
    category:
      inv.category === 'Software y Licencias' ||
      inv.category === 'Consultoría' ||
      inv.category === 'Diseño y Desarrollo' ||
      inv.category === 'Mantenimiento' ||
      inv.category === 'Capacitación'
        ? inv.category
        : 'Hardware',
    description: `Artículo sincronizado automáticamente desde ${inv.warehouseName} (${inv.locationBin}).`,
    unitPrice: suggestedPrice,
    currency: 'MXN',
    taxRate: '16%',
    unitOfMeasure: normalizeUnitOfMeasure(inv.unitOfMeasure),
    status: 'Activo',
    stock: inv.stock,
    minStock: inv.minStock,
    cost,
    lastUpdated: todayLabel,
  }
}
