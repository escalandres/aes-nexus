import type { ItemCategory, ProductServiceItem, UnitOfMeasure } from '../data/products'
import { PRODUCT_CATALOG_CATEGORIES } from '../data/products'
import type { InventoryItemLocation, StockMovement, Warehouse } from '../data/operations'

const VALID_UNITS: UnitOfMeasure[] = ['Pza', 'Hrs', 'Servicio', 'Mes', 'Licencia', 'Paquete']

export function formatShortSpanishDate(date: Date = new Date()): string {
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`
}

export function normalizeCatalogSku(sku: string): string {
  return sku.trim().toLowerCase()
}

export function matchesProductInventoryRow(
  inv: InventoryItemLocation,
  product: Pick<ProductServiceItem, 'id' | 'sku'>,
  previousSku?: string
): boolean {
  if (inv.productId && product.id && inv.productId === product.id) return true
  const invSku = normalizeCatalogSku(inv.sku)
  if (invSku && invSku === normalizeCatalogSku(product.sku)) return true
  if (previousSku && invSku && invSku === normalizeCatalogSku(previousSku)) return true
  return false
}

function normalizeUnitOfMeasure(raw?: string): UnitOfMeasure {
  if (!raw) return 'Pza'
  const found = VALID_UNITS.find((u) => u.toLowerCase() === raw.trim().toLowerCase())
  return found || 'Pza'
}

function normalizeCategory(raw?: string): ItemCategory {
  if (!raw) return 'Hardware'
  const found = PRODUCT_CATALOG_CATEGORIES.find(
    (c) => c.toLowerCase() === raw.trim().toLowerCase()
  )
  return found || 'Hardware'
}

export function deriveSyncedProducts(
  products: ProductServiceItem[],
  inventory: InventoryItemLocation[]
): ProductServiceItem[] {
  return products.map((prod) => {
    if (prod.type !== 'product') return prod

    const matchedRows = inventory.filter((inv) => matchesProductInventoryRow(inv, prod))
    const totalStock = matchedRows.reduce((sum, r) => sum + r.stock, 0)
    const latestCostRow = matchedRows.find((r) => r.cost > 0)
    const nextCost = latestCostRow ? latestCostRow.cost : prod.cost

    let nextMinStock = prod.minStock
    if (matchedRows.length === 1) {
      nextMinStock = matchedRows[0].minStock
    } else if (matchedRows.length > 1 && prod.minStock === undefined) {
      nextMinStock = matchedRows[0].minStock
    }

    if (
      prod.stock === totalStock &&
      prod.cost === nextCost &&
      prod.minStock === nextMinStock
    ) {
      return prod
    }

    return {
      ...prod,
      stock: totalStock,
      cost: nextCost,
      minStock: nextMinStock,
    }
  })
}

export interface CatalogToInventorySyncOptions {
  mode: 'create' | 'edit'
  prevItem?: ProductServiceItem
  savedItem: ProductServiceItem
  currentInventory: InventoryItemLocation[]
  warehouses: Warehouse[]
  preferredWarehouseId?: string
  preferredBin?: string
  movementsCount: number
  actorName: string
}

export interface CatalogToInventorySyncResult {
  nextInventory: InventoryItemLocation[]
  newMovements: StockMovement[]
  affectedWarehouses: string[]
}

export function syncCatalogToInventoryOnSave({
  mode,
  prevItem,
  savedItem,
  currentInventory,
  warehouses,
  preferredWarehouseId,
  preferredBin,
  movementsCount,
  actorName,
}: CatalogToInventorySyncOptions): CatalogToInventorySyncResult {
  const prevSku = prevItem?.sku
  const activeWarehouses = warehouses.filter((w) => w.active)
  const fallbackWarehouse =
    activeWarehouses.find((w) => w.id === preferredWarehouseId) ||
    warehouses.find((w) => w.id === preferredWarehouseId) ||
    activeWarehouses.find((w) => w.isDefault) ||
    activeWarehouses[0] ||
    warehouses[0]

  const todayStr = formatShortSpanishDate()
  const newMovements: StockMovement[] = []
  const affectedWarehouses = new Set<string>()
  let movOffset = 1

  // If saved as a service, remove any prior warehouse inventory rows (e.g. converted from product)
  if (savedItem.type !== 'product') {
    const filtered = currentInventory.filter(
      (inv) => !matchesProductInventoryRow(inv, savedItem, prevSku)
    )
    return {
      nextInventory: filtered,
      newMovements: [],
      affectedWarehouses: [],
    }
  }

  let nextInventory = [...currentInventory]

  // Propagate catalog metadata edits to all matching warehouse rows
  nextInventory = nextInventory.map((inv) => {
    if (!matchesProductInventoryRow(inv, savedItem, prevSku)) return inv
    const minStockChanged =
      prevItem && savedItem.minStock !== undefined && savedItem.minStock !== prevItem.minStock
    return {
      ...inv,
      productId: savedItem.id,
      sku: savedItem.sku,
      name: savedItem.name,
      category: savedItem.category,
      unitOfMeasure: savedItem.unitOfMeasure,
      cost: savedItem.cost ?? inv.cost,
      ...(minStockChanged
        ? { minStock: Math.max(0, savedItem.minStock ?? 0), thresholdSource: 'sku' as const }
        : {}),
    }
  })

  const matchedIndices: number[] = []
  nextInventory.forEach((inv, idx) => {
    if (matchesProductInventoryRow(inv, savedItem, prevSku)) {
      matchedIndices.push(idx)
    }
  })

  const desiredTotalStock = Math.max(0, Math.round(savedItem.stock ?? 0))

  if (matchedIndices.length === 0) {
    if (fallbackWarehouse && (mode === 'create' || desiredTotalStock >= 0)) {
      const createdRow: InventoryItemLocation = {
        id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        productId: savedItem.id,
        sku: savedItem.sku,
        name: savedItem.name,
        category: savedItem.category,
        warehouseId: fallbackWarehouse.id,
        warehouseName: fallbackWarehouse.name,
        stock: desiredTotalStock,
        reserved: 0,
        inTransit: 0,
        minStock: Math.max(0, savedItem.minStock ?? 2),
        thresholdSource: 'sku',
        cost: savedItem.cost ?? 0,
        unitOfMeasure: savedItem.unitOfMeasure,
        locationBin: preferredBin?.trim() || `Recepción ${fallbackWarehouse.code}`,
      }
      nextInventory = [createdRow, ...nextInventory]
      affectedWarehouses.add(fallbackWarehouse.name)

      if (desiredTotalStock > 0) {
        newMovements.push({
          id: `mov_cat_${Date.now()}_${movOffset}`,
          folio: `MOV-2026-${String(movementsCount + movOffset).padStart(3, '0')}`,
          date: todayStr,
          type: 'Entrada',
          sku: savedItem.sku,
          productName: savedItem.name,
          quantity: desiredTotalStock,
          targetWarehouse: fallbackWarehouse.name,
          referenceDoc: mode === 'create' ? 'CATÁLOGO-ALTA' : 'CATÁLOGO-SINCRONIZACIÓN',
          reason:
            mode === 'create'
              ? `Alta inicial desde Catálogo (${savedItem.sku})`
              : `Apertura de existencia desde Catálogo (${savedItem.sku})`,
          user: actorName,
        })
        movOffset += 1
      }
    }

    return {
      nextInventory,
      newMovements,
      affectedWarehouses: Array.from(affectedWarehouses),
    }
  }

  const currentTotalStock = matchedIndices.reduce(
    (sum, idx) => sum + nextInventory[idx].stock,
    0
  )

  if (savedItem.stock !== undefined && desiredTotalStock !== currentTotalStock) {
    let remainingDelta = desiredTotalStock - currentTotalStock

    // Pick primary row (preferred warehouse first, else first matched row)
    const preferredIdx = preferredWarehouseId
      ? matchedIndices.find((idx) => nextInventory[idx].warehouseId === preferredWarehouseId)
      : undefined
    const orderedIndices =
      preferredIdx !== undefined
        ? [preferredIdx, ...matchedIndices.filter((idx) => idx !== preferredIdx)]
        : matchedIndices

    if (remainingDelta > 0) {
      const targetIdx = orderedIndices[0]
      const targetRow = nextInventory[targetIdx]
      nextInventory[targetIdx] = {
        ...targetRow,
        stock: targetRow.stock + remainingDelta,
      }
      affectedWarehouses.add(targetRow.warehouseName)
      newMovements.push({
        id: `mov_cat_${Date.now()}_${movOffset}`,
        folio: `MOV-2026-${String(movementsCount + movOffset).padStart(3, '0')}`,
        date: todayStr,
        type: 'Ajuste',
        sku: savedItem.sku,
        productName: savedItem.name,
        quantity: remainingDelta,
        targetWarehouse: targetRow.warehouseName,
        referenceDoc: 'CATÁLOGO-AJUSTE',
        reason: `Ajuste positivo de existencias desde Catálogo (+${remainingDelta} ${savedItem.unitOfMeasure})`,
        user: actorName,
      })
      movOffset += 1
    } else {
      let toDeduct = Math.abs(remainingDelta)
      for (const idx of orderedIndices) {
        if (toDeduct <= 0) break
        const row = nextInventory[idx]
        if (row.stock <= 0) continue
        const deductedHere = Math.min(row.stock, toDeduct)
        nextInventory[idx] = {
          ...row,
          stock: Math.max(0, row.stock - deductedHere),
        }
        toDeduct -= deductedHere
        affectedWarehouses.add(row.warehouseName)
        newMovements.push({
          id: `mov_cat_${Date.now()}_${movOffset}`,
          folio: `MOV-2026-${String(movementsCount + movOffset).padStart(3, '0')}`,
          date: todayStr,
          type: 'Ajuste',
          sku: savedItem.sku,
          productName: savedItem.name,
          quantity: -deductedHere,
          sourceWarehouse: row.warehouseName,
          referenceDoc: 'CATÁLOGO-AJUSTE',
          reason: `Ajuste negativo de existencias desde Catálogo (-${deductedHere} ${savedItem.unitOfMeasure})`,
          user: actorName,
        })
        movOffset += 1
      }
    }
  }

  return {
    nextInventory,
    newMovements,
    affectedWarehouses: Array.from(affectedWarehouses),
  }
}

export interface InventoryToCatalogSyncResult {
  nextProducts: ProductServiceItem[]
  createdSkus: string[]
  updatedSkus: string[]
}

export function syncInventoryToCatalogOnUpdate(
  nextInventory: InventoryItemLocation[],
  currentProducts: ProductServiceItem[]
): InventoryToCatalogSyncResult {
  const createdSkus: string[] = []
  const updatedSkus: string[] = []

  // Group inventory rows by normalized SKU for fast aggregation
  const invBySku = new Map<string, InventoryItemLocation[]>()
  for (const inv of nextInventory) {
    const key = normalizeCatalogSku(inv.sku)
    if (!key) continue
    const list = invBySku.get(key) || []
    list.push(inv)
    invBySku.set(key, list)
  }

  let nextProducts = currentProducts.map((prod) => {
    if (prod.type !== 'product') return prod

    const matched = nextInventory.filter((inv) => matchesProductInventoryRow(inv, prod))
    const totalStock = matched.reduce((s, r) => s + r.stock, 0)
    const latestCostRow = matched.find((r) => r.cost > 0)
    const nextCost = latestCostRow ? latestCostRow.cost : prod.cost
    const nextMinStock =
      matched.length === 1 && matched[0].thresholdSource !== 'category'
        ? matched[0].minStock
        : prod.minStock

    const changed =
      prod.stock !== totalStock || prod.cost !== nextCost || prod.minStock !== nextMinStock
    if (!changed) return prod

    updatedSkus.push(prod.sku)
    return {
      ...prod,
      stock: totalStock,
      cost: nextCost,
      minStock: nextMinStock,
      lastUpdated: 'Hoy',
    }
  })

  // Auto-register any new SKU created in Inventory that is not yet in Catalog
  const existingSkuKeys = new Set(nextProducts.map((p) => normalizeCatalogSku(p.sku)))
  const existingIds = new Set(nextProducts.map((p) => p.id))

  for (const [skuKey, rows] of invBySku.entries()) {
    if (existingSkuKeys.has(skuKey)) continue
    const primary = rows[0]
    if (!primary || existingIds.has(primary.productId)) continue

    const totalStock = rows.reduce((s, r) => s + r.stock, 0)
    const estimatedPrice = primary.cost > 0 ? Math.round(primary.cost * 1.35) : 0
    const createdItem: ProductServiceItem = {
      id: primary.productId || `prod_${Date.now()}_${createdSkus.length}`,
      sku: primary.sku.trim().toUpperCase(),
      name: primary.name,
      type: 'product',
      category: normalizeCategory(primary.category),
      description: `Artículo sincronizado desde almacén (${primary.warehouseName}).`,
      unitPrice: estimatedPrice,
      currency: 'MXN',
      taxRate: '16%',
      unitOfMeasure: normalizeUnitOfMeasure(primary.unitOfMeasure),
      status: 'Activo',
      stock: totalStock,
      minStock: primary.minStock,
      cost: primary.cost,
      lastUpdated: 'Hoy',
    }
    nextProducts = [createdItem, ...nextProducts]
    existingSkuKeys.add(skuKey)
    createdSkus.push(createdItem.sku)
  }

  return {
    nextProducts,
    createdSkus,
    updatedSkus,
  }
}
