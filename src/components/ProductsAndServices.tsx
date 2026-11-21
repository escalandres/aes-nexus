import { useState, useMemo, useRef, useEffect, type ReactNode, type KeyboardEvent } from 'react'
import {
  Plus, Search, MoreHorizontal, Package, Tag, Boxes,
  DollarSign, CheckCircle2, XCircle, ArrowUpDown, Eye, Edit3,
  Trash2, Copy, X, FolderTree, CornerDownLeft
} from 'lucide-react'
import type { ProductServiceItem, ItemType, ItemCategory, TaxRate, UnitOfMeasure } from '../data/products'
import { initialProductsAndServices } from '../data/products'
import { useToast } from './Toast'

const CATEGORIES: ItemCategory[] = [
  'Hardware',
  'Software y Licencias',
  'Consultoría',
  'Diseño y Desarrollo',
  'Mantenimiento',
  'Capacitación',
]

const UNITS: UnitOfMeasure[] = ['Pza', 'Hrs', 'Servicio', 'Mes', 'Licencia', 'Paquete']

const TAX_RATES: { label: string; value: TaxRate; multiplier: number }[] = [
  { label: '16% (IVA general)', value: '16%', multiplier: 0.16 },
  { label: '8% (Región fronteriza)', value: '8%', multiplier: 0.08 },
  { label: '0% (Tasa cero)', value: '0%', multiplier: 0 },
  { label: 'Exento de IVA', value: 'Exento', multiplier: 0 },
]

const formatMoney = (amount: number, currency: 'MXN' | 'USD' = 'MXN') => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const normalizeSearchText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

function renderHighlightedText(text: string, rawQuery: string): ReactNode {
  const tokens = normalizeSearchText(rawQuery)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!tokens.length || !text) return text

  // Map each normalized character back to its original index in `text`
  const normChars: string[] = []
  const indexMap: number[] = []
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const stripped = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    for (let j = 0; j < stripped.length; j++) {
      normChars.push(stripped[j])
      indexMap.push(i)
    }
  }
  const normText = normChars.join('')

  const ranges: Array<[number, number]> = []
  for (const token of tokens) {
    let startAt = 0
    while (startAt < normText.length) {
      const idx = normText.indexOf(token, startAt)
      if (idx === -1) break
      const origStart = indexMap[idx]
      const origEnd = indexMap[idx + token.length - 1] + 1
      ranges.push([origStart, origEnd])
      startAt = idx + token.length
    }
  }

  if (!ranges.length) return text

  // Merge overlapping highlight ranges
  ranges.sort((a, b) => a[0] - b[0])
  const merged: Array<[number, number]> = [ranges[0]]
  for (let i = 1; i < ranges.length; i++) {
    const prev = merged[merged.length - 1]
    const curr = ranges[i]
    if (curr[0] <= prev[1]) {
      prev[1] = Math.max(prev[1], curr[1])
    } else {
      merged.push(curr)
    }
  }

  const parts: ReactNode[] = []
  let cursor = 0
  merged.forEach(([start, end], idx) => {
    if (start > cursor) {
      parts.push(text.slice(cursor, start))
    }
    parts.push(
      <mark key={`${start}-${end}-${idx}`} className="catalog-search-mark">
        {text.slice(start, end)}
      </mark>
    )
    cursor = end
  })
  if (cursor < text.length) {
    parts.push(text.slice(cursor))
  }
  return parts
}

function scoreCatalogItemMatch(item: ProductServiceItem, rawQuery: string): { matched: boolean; score: number } {
  const normQuery = normalizeSearchText(rawQuery).trim()
  if (!normQuery) return { matched: true, score: 0 }

  const tokens = normQuery.split(/\s+/).filter(Boolean)
  const normSku = normalizeSearchText(item.sku)
  const normName = normalizeSearchText(item.name)
  const normCategory = normalizeSearchText(item.category)

  const allTokensMatch = tokens.every(
    (token) => normSku.includes(token) || normName.includes(token) || normCategory.includes(token)
  )
  if (!allTokensMatch) return { matched: false, score: -1 }

  let score = 0
  if (normSku === normQuery) score += 120
  else if (normSku.startsWith(normQuery)) score += 90
  else if (normSku.includes(normQuery)) score += 65

  if (normName === normQuery) score += 110
  else if (normName.startsWith(normQuery)) score += 80
  else if (normName.includes(normQuery)) score += 50

  if (normCategory === normQuery) score += 70
  else if (normCategory.startsWith(normQuery)) score += 55
  else if (normCategory.includes(normQuery)) score += 35

  for (const token of tokens) {
    if (normSku.startsWith(token)) score += 20
    else if (normSku.includes(token)) score += 12
    if (normName.startsWith(token)) score += 16
    else if (normName.includes(token)) score += 10
    if (normCategory.includes(token)) score += 8
  }

  return { matched: true, score }
}

interface ProductFormData {
  id?: string
  sku: string
  name: string
  type: ItemType
  category: ItemCategory
  description: string
  unitPrice: number
  currency: 'MXN' | 'USD'
  taxRate: TaxRate
  unitOfMeasure: UnitOfMeasure
  status: 'Activo' | 'Inactivo'
  stock?: number
  minStock?: number
  cost?: number
  billingModel?: 'Por hora' | 'Precio fijo' | 'Recurrente'
  leadTimeDays?: number
}

const emptyFormData: ProductFormData = {
  sku: '',
  name: '',
  type: 'product',
  category: 'Hardware',
  description: '',
  unitPrice: 0,
  currency: 'MXN',
  taxRate: '16%',
  unitOfMeasure: 'Pza',
  status: 'Activo',
  stock: 10,
  minStock: 2,
  cost: 0,
  billingModel: 'Precio fijo',
}

interface ProductsAndServicesProps {
  canDelete?: boolean
  onItemDeleted?: (item: ProductServiceItem) => void
}

export function ProductsAndServices({
  canDelete = true,
  onItemDeleted,
}: ProductsAndServicesProps) {
  const toast = useToast()
  const [items, setItems] = useState<ProductServiceItem[]>(initialProductsAndServices)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<'all' | 'product' | 'service'>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'sku'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Predictive search UI state
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(-1)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [formData, setFormData] = useState<ProductFormData>(emptyFormData)
  const [viewingItem, setViewingItem] = useState<ProductServiceItem | null>(null)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // Filtered and sorted items (instant live filter by name, SKU, or category)
  const filteredItems = useMemo(() => {
    const hasQuery = searchQuery.trim().length > 0
    return items
      .map((item) => {
        if (selectedType !== 'all' && item.type !== selectedType) return null
        if (selectedCategory !== 'all' && item.category !== selectedCategory) return null
        if (selectedStatus !== 'all' && item.status !== selectedStatus) return null

        if (hasQuery) {
          const match = scoreCatalogItemMatch(item, searchQuery)
          if (!match.matched) return null
          return { item, score: match.score }
        }

        return { item, score: 0 }
      })
      .filter((entry): entry is { item: ProductServiceItem; score: number } => entry !== null)
      .sort((a, b) => {
        if (hasQuery && b.score !== a.score) {
          return b.score - a.score
        }
        let comp = 0
        if (sortBy === 'name') comp = a.item.name.localeCompare(b.item.name)
        else if (sortBy === 'sku') comp = a.item.sku.localeCompare(b.item.sku)
        else if (sortBy === 'price') comp = a.item.unitPrice - b.item.unitPrice
        return sortOrder === 'asc' ? comp : -comp
      })
      .map((entry) => entry.item)
  }, [items, selectedType, selectedCategory, selectedStatus, searchQuery, sortBy, sortOrder])

  // Predictive dropdown suggestions (categories + ranked items across full/type-filtered catalog)
  const predictiveSuggestions = useMemo(() => {
    const trimmed = searchQuery.trim()
    const basePool = items.filter((item) => {
      if (selectedType !== 'all' && item.type !== selectedType) return false
      if (selectedStatus !== 'all' && item.status !== selectedStatus) return false
      return true
    })

    if (!trimmed) {
      const categoryCounts = CATEGORIES.map((category) => ({
        category,
        count: basePool.filter((item) => item.category === category).length,
      })).filter((c) => c.count > 0)

      return {
        hasQuery: false,
        categories: categoryCounts,
        items: [] as ProductServiceItem[],
        totalMatches: basePool.length,
      }
    }

    const tokens = normalizeSearchText(trimmed).split(/\s+/).filter(Boolean)
    const matchingCategories = CATEGORIES.map((category) => {
      const normCat = normalizeSearchText(category)
      const catMatches = tokens.every((t) => normCat.includes(t))
      const count = basePool.filter((item) => item.category === category).length
      return catMatches && count > 0 ? { category, count } : null
    }).filter((c): c is { category: ItemCategory; count: number } => c !== null)

    const rankedItems = basePool
      .filter((item) => selectedCategory === 'all' || item.category === selectedCategory)
      .map((item) => ({ item, match: scoreCatalogItemMatch(item, trimmed) }))
      .filter((entry) => entry.match.matched)
      .sort((a, b) => b.match.score - a.match.score || a.item.name.localeCompare(b.item.name))

    return {
      hasQuery: true,
      categories: matchingCategories,
      items: rankedItems.slice(0, 6).map((entry) => entry.item),
      totalMatches: rankedItems.length,
    }
  }, [items, searchQuery, selectedType, selectedCategory, selectedStatus])

  const totalSuggestionCount =
    predictiveSuggestions.categories.length + predictiveSuggestions.items.length

  const handleSelectSuggestedCategory = (category: ItemCategory) => {
    setSelectedCategory(category)
    setSearchQuery('')
    setActiveSuggestionIdx(-1)
    setIsSearchOpen(false)
  }

  const handleSelectSuggestedItem = (item: ProductServiceItem) => {
    setSearchQuery(item.name)
    setActiveSuggestionIdx(-1)
    setIsSearchOpen(false)
  }

  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (isSearchOpen) {
        setIsSearchOpen(false)
        setActiveSuggestionIdx(-1)
      } else if (searchQuery) {
        setSearchQuery('')
      }
      return
    }

    if (!isSearchOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsSearchOpen(true)
      return
    }

    if (!totalSuggestionCount) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveSuggestionIdx((prev) => (prev + 1) % totalSuggestionCount)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveSuggestionIdx((prev) => (prev <= 0 ? totalSuggestionCount - 1 : prev - 1))
    } else if (e.key === 'Enter' && isSearchOpen && activeSuggestionIdx >= 0) {
      e.preventDefault()
      const catCount = predictiveSuggestions.categories.length
      if (activeSuggestionIdx < catCount) {
        handleSelectSuggestedCategory(predictiveSuggestions.categories[activeSuggestionIdx].category)
      } else {
        const item = predictiveSuggestions.items[activeSuggestionIdx - catCount]
        if (item) handleSelectSuggestedItem(item)
      }
    }
  }

  // Summary KPIs
  const totalCount = items.length
  const productsCount = items.filter((i) => i.type === 'product').length
  const servicesCount = items.filter((i) => i.type === 'service').length
  const activeCount = items.filter((i) => i.status === 'Activo').length
  const totalInventoryValue = items
    .filter((i) => i.type === 'product' && i.stock)
    .reduce((sum, item) => sum + (item.cost || item.unitPrice * 0.7) * (item.stock || 0), 0)
  const avgPrice = items.reduce((sum, item) => sum + item.unitPrice, 0) / (totalCount || 1)

  // Helper to generate a sensible SKU suggestion
  const generateSkuSuggestion = (type: ItemType, category: string, name: string) => {
    const prefix = type === 'product' ? 'PRD' : 'SRV'
    const catCode = category.slice(0, 3).toUpperCase()
    const nameCode = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'ITM'
    const randomSuffix = Math.floor(100 + Math.random() * 900)
    return `${prefix}-${catCode}-${nameCode}${randomSuffix}`
  }

  const handleOpenCreate = () => {
    setModalMode('create')
    setConfirmingDelete(false)
    setFormData({
      ...emptyFormData,
      sku: generateSkuSuggestion('product', 'Hardware', ''),
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item: ProductServiceItem) => {
    setModalMode('edit')
    setConfirmingDelete(false)
    setFormData({
      id: item.id,
      sku: item.sku,
      name: item.name,
      type: item.type,
      category: item.category,
      description: item.description,
      unitPrice: item.unitPrice,
      currency: item.currency,
      taxRate: item.taxRate,
      unitOfMeasure: item.unitOfMeasure,
      status: item.status,
      stock: item.stock,
      minStock: item.minStock,
      cost: item.cost,
      billingModel: item.billingModel,
      leadTimeDays: item.leadTimeDays,
    })
    setActiveMenuId(null)
    setIsModalOpen(true)
  }

  const handleDuplicate = (item: ProductServiceItem) => {
    const newItem: ProductServiceItem = {
      ...item,
      id: `prod_${Date.now()}`,
      sku: `${item.sku}-COPIA`,
      name: `${item.name} (Copia)`,
      lastUpdated: 'Hoy',
    }
    setItems((prev) => [newItem, ...prev])
    setActiveMenuId(null)
    toast.success(`Se duplicó el artículo "${item.name}".`, 'Artículo duplicado')
  }

  const handleToggleStatus = (item: ProductServiceItem) => {
    const nextStatus = item.status === 'Activo' ? 'Inactivo' : 'Activo'
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: nextStatus, lastUpdated: 'Hoy' } : i))
    )
    setActiveMenuId(null)
    toast.info(`El artículo ahora está ${nextStatus.toLowerCase()}.`, 'Estado actualizado')
  }

  const handleConfirmDeleteItem = (itemId: string) => {
    const target = items.find((i) => i.id === itemId)
    setItems((prev) => prev.filter((i) => i.id !== itemId))
    if (viewingItem?.id === itemId) setViewingItem(null)
    if (isModalOpen && formData.id === itemId) setIsModalOpen(false)
    setActiveMenuId(null)
    setConfirmingDelete(false)
    if (target) {
      onItemDeleted?.(target)
      toast.info(`"${target.name}" fue eliminado del catálogo.`, 'Artículo eliminado')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.warning('Ingresa el nombre del producto o servicio.', 'Campo requerido')
      return
    }
    if (!formData.sku.trim()) {
      toast.warning('Ingresa un código SKU único.', 'Campo requerido')
      return
    }
    if (formData.unitPrice < 0) {
      toast.warning('El precio de venta debe ser un número positivo.', 'Valor inválido')
      return
    }

    if (modalMode === 'create') {
      // Check duplicate SKU
      if (items.some((i) => i.sku.toLowerCase() === formData.sku.trim().toLowerCase())) {
        toast.error(`Ya existe un artículo con el código SKU ${formData.sku}.`, 'SKU duplicado')
        return
      }

      const newItem: ProductServiceItem = {
        id: `prod_${Date.now()}`,
        sku: formData.sku.trim().toUpperCase(),
        name: formData.name.trim(),
        type: formData.type,
        category: formData.category,
        description: formData.description.trim(),
        unitPrice: Number(formData.unitPrice),
        currency: formData.currency,
        taxRate: formData.taxRate,
        unitOfMeasure: formData.unitOfMeasure,
        status: formData.status,
        stock: formData.type === 'product' ? Number(formData.stock || 0) : undefined,
        minStock: formData.type === 'product' ? Number(formData.minStock || 0) : undefined,
        cost: formData.type === 'product' ? Number(formData.cost || 0) : undefined,
        billingModel: formData.type === 'service' ? formData.billingModel : undefined,
        leadTimeDays: formData.type === 'service' ? Number(formData.leadTimeDays || 1) : undefined,
        lastUpdated: 'Hoy',
      }

      setItems((prev) => [newItem, ...prev])
      toast.success(`"${newItem.name}" se guardó en el catálogo de ventas.`, 'Artículo registrado')
    } else {
      setItems((prev) =>
        prev.map((i) =>
          i.id === formData.id
            ? {
                ...i,
                sku: formData.sku.trim().toUpperCase(),
                name: formData.name.trim(),
                type: formData.type,
                category: formData.category,
                description: formData.description.trim(),
                unitPrice: Number(formData.unitPrice),
                currency: formData.currency,
                taxRate: formData.taxRate,
                unitOfMeasure: formData.unitOfMeasure,
                status: formData.status,
                stock: formData.type === 'product' ? Number(formData.stock || 0) : undefined,
                minStock: formData.type === 'product' ? Number(formData.minStock || 0) : undefined,
                cost: formData.type === 'product' ? Number(formData.cost || 0) : undefined,
                billingModel: formData.type === 'service' ? formData.billingModel : undefined,
                leadTimeDays: formData.type === 'service' ? Number(formData.leadTimeDays || 1) : undefined,
                lastUpdated: 'Hoy',
              }
            : i
        )
      )
      toast.success(`Los cambios en "${formData.name}" fueron guardados.`, 'Artículo actualizado')
    }

    setIsModalOpen(false)
  }

  // Calculate taxes for form preview
  const taxMultiplier = TAX_RATES.find((t) => t.value === formData.taxRate)?.multiplier || 0
  const calculatedTax = (Number(formData.unitPrice) || 0) * taxMultiplier
  const calculatedTotalWithTax = (Number(formData.unitPrice) || 0) + calculatedTax
  const calculatedMargin =
    formData.type === 'product' && formData.cost && formData.unitPrice > 0
      ? (((formData.unitPrice - formData.cost) / formData.unitPrice) * 100).toFixed(1)
      : null

  return (
    <div className="catalog-wrapper">
      {/* Top Heading */}
      <div className="crm-section-heading">
        <div>
          <div className="panel-kicker">MÓDULO DE VENTAS · H2 PILOTO COMERCIAL</div>
          <h2>Catálogo de productos y servicios</h2>
          <p>
            Centraliza los artículos comercializables, precios de venta, unidades de medida y esquemas de impuestos para tus cotizaciones y pedidos.
          </p>
        </div>
        <div className="crm-section-heading-actions">
          <button className="button button-primary" onClick={handleOpenCreate}>
            <Plus size={15} /> Nuevo artículo
          </button>
          <span className="demo-pill">
            <i /> CATÁLOGO ACTIVO
          </span>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <section className="catalog-kpis" aria-label="Resumen del catálogo comercial">
        <article className="catalog-kpi-card">
          <div className="catalog-kpi-header">
            <span>Total en catálogo</span>
            <span className="kpi-icon"><Boxes size={16} /></span>
          </div>
          <div className="catalog-kpi-val tabular-nums">{totalCount}</div>
          <div className="catalog-kpi-sub">
            <span>{productsCount} productos</span>
            <span aria-hidden="true">·</span>
            <span>{servicesCount} servicios</span>
          </div>
        </article>

        <article className="catalog-kpi-card">
          <div className="catalog-kpi-header">
            <span>Precio promedio</span>
            <span className="kpi-icon icon-sand"><DollarSign size={16} /></span>
          </div>
          <div className="catalog-kpi-val tabular-nums">{formatMoney(avgPrice)}</div>
          <div className="catalog-kpi-sub">
            <span className="trend trend-up">Base comercial en MXN</span>
          </div>
        </article>

        <article className="catalog-kpi-card">
          <div className="catalog-kpi-header">
            <span>Valor inventario estimado</span>
            <span className="kpi-icon icon-green"><Package size={16} /></span>
          </div>
          <div className="catalog-kpi-val tabular-nums">{formatMoney(totalInventoryValue)}</div>
          <div className="catalog-kpi-sub">
            <span>En artículos físicos de hardware</span>
          </div>
        </article>

        <article className="catalog-kpi-card">
          <div className="catalog-kpi-header">
            <span>Disponibilidad comercial</span>
            <span className="kpi-icon icon-lilac"><Tag size={16} /></span>
          </div>
          <div className="catalog-kpi-val tabular-nums">
            {activeCount} <small className="text-xs font-normal text-muted">/ {totalCount}</small>
          </div>
          <div className="catalog-kpi-sub">
            <span>{Math.round((activeCount / (totalCount || 1)) * 100)}% listos para cotizar</span>
          </div>
        </article>
      </section>

      {/* Search & Filters Bar */}
      <div className="catalog-toolbar">
        <div
          ref={searchContainerRef}
          className={`catalog-search ${isSearchOpen ? 'is-open' : ''}`}
        >
          <Search size={14} className="search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            role="combobox"
            aria-expanded={isSearchOpen}
            aria-controls="catalog-predictive-listbox"
            aria-autocomplete="list"
            aria-label="Buscar en catálogo por nombre, SKU o categoría"
            placeholder="Buscar predictivamente por nombre, SKU o categoría..."
            value={searchQuery}
            onFocus={() => setIsSearchOpen(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setIsSearchOpen(true)
              setActiveSuggestionIdx(-1)
            }}
            onKeyDown={handleSearchKeyDown}
          />
          {searchQuery && (
            <span className="catalog-search-count tabular-nums">
              {filteredItems.length} {filteredItems.length === 1 ? 'resultado' : 'resultados'}
            </span>
          )}
          {searchQuery && (
            <button
              type="button"
              className="clear-search"
              onClick={() => {
                setSearchQuery('')
                setActiveSuggestionIdx(-1)
                searchInputRef.current?.focus()
              }}
              aria-label="Limpiar búsqueda"
            >
              <X size={12} />
            </button>
          )}

          {isSearchOpen && (
            <div
              id="catalog-predictive-listbox"
              role="listbox"
              aria-label="Sugerencias del catálogo"
              className="catalog-predictive-dropdown"
            >
              {!predictiveSuggestions.hasQuery ? (
                <div className="predictive-section">
                  <div className="predictive-section-title">
                    Explorar rápido por categoría
                  </div>
                  <div className="predictive-category-grid">
                    {predictiveSuggestions.categories.map(({ category, count }, idx) => (
                      <button
                        key={category}
                        type="button"
                        role="option"
                        aria-selected={activeSuggestionIdx === idx}
                        className={`predictive-category-item ${
                          activeSuggestionIdx === idx ? 'is-active' : ''
                        }`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectSuggestedCategory(category)}
                      >
                        <span className="predictive-cat-left">
                          <FolderTree size={13} />
                          <span>{category}</span>
                        </span>
                        <span className="predictive-cat-count tabular-nums">{count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : totalSuggestionCount === 0 ? (
                <div className="predictive-empty">
                  <span>
                    Sin coincidencias en nombre, SKU o categoría para{' '}
                    <strong>&ldquo;{searchQuery.trim()}&rdquo;</strong>
                  </span>
                  <button
                    type="button"
                    className="predictive-reset-btn"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSearchQuery('')
                      searchInputRef.current?.focus()
                    }}
                  >
                    Limpiar búsqueda
                  </button>
                </div>
              ) : (
                <>
                  {predictiveSuggestions.categories.length > 0 && (
                    <div className="predictive-section">
                      <div className="predictive-section-title">
                        Categorías coincidentes
                      </div>
                      <div className="predictive-list">
                        {predictiveSuggestions.categories.map(({ category, count }, idx) => (
                          <button
                            key={category}
                            type="button"
                            role="option"
                            aria-selected={activeSuggestionIdx === idx}
                            className={`predictive-row predictive-row-cat ${
                              activeSuggestionIdx === idx ? 'is-active' : ''
                            }`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelectSuggestedCategory(category)}
                          >
                            <div className="predictive-row-main">
                              <FolderTree size={13} className="predictive-row-icon" />
                              <span className="predictive-row-title">
                                {renderHighlightedText(category, searchQuery)}
                              </span>
                              <span className="predictive-row-meta">
                                Filtrar categoría · {count} {count === 1 ? 'artículo' : 'artículos'}
                              </span>
                            </div>
                            <span className="predictive-row-action">
                              Aplicar filtro <CornerDownLeft size={11} />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {predictiveSuggestions.items.length > 0 && (
                    <div className="predictive-section">
                      <div className="predictive-section-title">
                        <span>Productos y servicios coincidentes</span>
                        <span className="tabular-nums">
                          {predictiveSuggestions.totalMatches} en total
                        </span>
                      </div>
                      <div className="predictive-list">
                        {predictiveSuggestions.items.map((item, idx) => {
                          const optionIdx = predictiveSuggestions.categories.length + idx
                          const isActive = activeSuggestionIdx === optionIdx
                          return (
                            <div
                              key={item.id}
                              role="option"
                              aria-selected={isActive}
                              className={`predictive-row ${isActive ? 'is-active' : ''}`}
                            >
                              <button
                                type="button"
                                className="predictive-row-select"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handleSelectSuggestedItem(item)}
                              >
                                <div className="predictive-row-top">
                                  <span className="predictive-sku font-mono tabular-nums">
                                    {renderHighlightedText(item.sku, searchQuery)}
                                  </span>
                                  <span className="predictive-row-title">
                                    {renderHighlightedText(item.name, searchQuery)}
                                  </span>
                                </div>
                                <div className="predictive-row-sub">
                                  <span>{item.type === 'product' ? 'Producto' : 'Servicio'}</span>
                                  <span aria-hidden="true">·</span>
                                  <span>{renderHighlightedText(item.category, searchQuery)}</span>
                                  <span aria-hidden="true">·</span>
                                  <span>{item.unitOfMeasure}</span>
                                </div>
                              </button>

                              <div className="predictive-row-right">
                                <span className="predictive-price font-mono tabular-nums">
                                  {formatMoney(item.unitPrice, item.currency)}
                                </span>
                                <button
                                  type="button"
                                  className="predictive-preview-btn"
                                  title={`Ver ficha técnica de ${item.name}`}
                                  aria-label={`Ver ficha técnica de ${item.name}`}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    setViewingItem(item)
                                    setIsSearchOpen(false)
                                  }}
                                >
                                  <Eye size={13} />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div className="predictive-footer">
                    <span>↑↓ navegar · Enter seleccionar · Esc cerrar</span>
                    <span className="tabular-nums">
                      Tabla filtrada: {filteredItems.length} de {items.length}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Type Segmented Control */}
        <div className="catalog-segmented-filter" role="group" aria-label="Filtrar por tipo de artículo">
          <button
            type="button"
            className={selectedType === 'all' ? 'active' : ''}
            onClick={() => setSelectedType('all')}
          >
            Todos <span className="filter-count tabular-nums">{items.length}</span>
          </button>
          <button
            type="button"
            className={selectedType === 'product' ? 'active' : ''}
            onClick={() => setSelectedType('product')}
          >
            Productos <span className="filter-count tabular-nums">{productsCount}</span>
          </button>
          <button
            type="button"
            className={selectedType === 'service' ? 'active' : ''}
            onClick={() => setSelectedType('service')}
          >
            Servicios <span className="filter-count tabular-nums">{servicesCount}</span>
          </button>
        </div>

        {/* Category filter */}
        <div className="catalog-filter-select">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filtrar por categoría"
          >
            <option value="all">Todas las categorías</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div className="catalog-filter-select">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            aria-label="Filtrar por estado"
          >
            <option value="all">Todos los estados</option>
            <option value="Activo">Activos</option>
            <option value="Inactivo">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Catalog Table */}
      <div className="clients-table-wrap">
        <table className="clients-table">
          <thead>
            <tr>
              <th>
                <button
                  type="button"
                  className="table-sort-btn"
                  onClick={() => {
                    if (sortBy === 'sku') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                    else {
                      setSortBy('sku')
                      setSortOrder('asc')
                    }
                  }}
                >
                  SKU / CÓDIGO <ArrowUpDown size={11} />
                </button>
              </th>
              <th>
                <button
                  type="button"
                  className="table-sort-btn"
                  onClick={() => {
                    if (sortBy === 'name') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                    else {
                      setSortBy('name')
                      setSortOrder('asc')
                    }
                  }}
                >
                  NOMBRE Y DESCRIPCIÓN <ArrowUpDown size={11} />
                </button>
              </th>
              <th>TIPO</th>
              <th>CATEGORÍA</th>
              <th>UNIDAD</th>
              <th>
                <button
                  type="button"
                  className="table-sort-btn text-right"
                  onClick={() => {
                    if (sortBy === 'price') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                    else {
                      setSortBy('price')
                      setSortOrder('asc')
                    }
                  }}
                >
                  PRECIO UNITARIO <ArrowUpDown size={11} />
                </button>
              </th>
              <th>INVENTARIO / MODALIDAD</th>
              <th>ESTADO</th>
              <th><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.id} className="catalog-table-row">
                <td className="catalog-sku-cell">
                  <span className="catalog-sku-code font-mono tabular-nums">
                    {searchQuery.trim() ? renderHighlightedText(item.sku, searchQuery) : item.sku}
                  </span>
                </td>
                <td className="catalog-name-cell">
                  <button
                    type="button"
                    className="catalog-item-title-btn"
                    onClick={() => setViewingItem(item)}
                  >
                    <strong>
                      {searchQuery.trim() ? renderHighlightedText(item.name, searchQuery) : item.name}
                    </strong>
                  </button>
                  <p className="catalog-item-desc">{item.description}</p>
                </td>
                <td>
                  <span className={`catalog-type-badge type-${item.type}`}>
                    {item.type === 'product' ? 'Producto' : 'Servicio'}
                  </span>
                </td>
                <td className="catalog-cat-cell">
                  {searchQuery.trim()
                    ? renderHighlightedText(item.category, searchQuery)
                    : item.category}
                </td>
                <td>
                  <span className="catalog-unit-pill font-mono">{item.unitOfMeasure}</span>
                </td>
                <td className="catalog-price-cell">
                  <strong className="catalog-unit-price font-mono tabular-nums">
                    {formatMoney(item.unitPrice, item.currency)}
                  </strong>
                  <small className="catalog-tax-hint text-muted">
                    + {item.taxRate} IVA
                  </small>
                </td>
                <td>
                  {item.type === 'product' ? (
                    <div className="catalog-stock-indicator">
                      <span className={`stock-number font-mono tabular-nums ${(item.stock ?? 0) <= (item.minStock ?? 2) ? 'stock-low' : ''}`}>
                        {item.stock ?? 0} {item.unitOfMeasure}
                      </span>
                      <small className="text-muted">en almacén</small>
                    </div>
                  ) : (
                    <div className="catalog-service-model">
                      <span>{item.billingModel || 'Precio fijo'}</span>
                    </div>
                  )}
                </td>
                <td>
                  <span className={`client-status status-${item.status.toLowerCase()}`}>
                    <i />
                    {item.status}
                  </span>
                </td>
                <td className="catalog-actions-cell">
                  <div className="row-action-wrapper">
                    <button
                      type="button"
                      className="row-more"
                      aria-label={`Acciones para ${item.name}`}
                      onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                    >
                      <MoreHorizontal size={17} />
                    </button>

                    {activeMenuId === item.id && (
                      <div className="catalog-action-menu">
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmingDelete(false)
                            setViewingItem(item)
                            setActiveMenuId(null)
                          }}
                        >
                          <Eye size={13} /> Ver detalles
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                        >
                          <Edit3 size={13} /> Editar artículo
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicate(item)}
                        >
                          <Copy size={13} /> Duplicar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                        >
                          {item.status === 'Activo' ? (
                            <>
                              <XCircle size={13} /> Desactivar
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={13} /> Activar
                            </>
                          )}
                        </button>
                        {canDelete && (
                          <button
                            type="button"
                            className="action-danger"
                            onClick={() => {
                              handleOpenEdit(item)
                              setConfirmingDelete(true)
                            }}
                          >
                            <Trash2 size={13} /> Eliminar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredItems.length === 0 && (
          <div className="clients-empty">
            <Package size={24} />
            <strong>No se encontraron artículos en el catálogo</strong>
            <span>Intenta ajustando el término de búsqueda o restableciendo los filtros.</span>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                setSearchQuery('')
                setSelectedType('all')
                setSelectedCategory('all')
                setSelectedStatus('all')
              }}
            >
              Restablecer filtros
            </button>
          </div>
        )}
      </div>

      {/* Modal: Create / Edit Product or Service */}
      {isModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false)
          }}
        >
          <section
            className="create-modal catalog-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="catalog-modal-title"
          >
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">MÓDULO DE VENTAS · CATÁLOGO</div>
                <h2 id="catalog-modal-title">
                  {modalMode === 'create' ? 'Nuevo producto o servicio' : 'Editar artículo comercial'}
                </h2>
                <p>
                  Define las propiedades comerciales, precio de lista, unidad de medida y esquema impositivo para usar en cotizaciones y facturación.
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Type selector */}
              <div className="catalog-form-type-selector">
                <button
                  type="button"
                  className={`type-btn ${formData.type === 'product' ? 'selected' : ''}`}
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      type: 'product',
                      unitOfMeasure: 'Pza',
                      sku: prev.sku || generateSkuSuggestion('product', prev.category, prev.name),
                    }))
                  }}
                >
                  <Package size={16} />
                  <div>
                    <strong>Producto tangible</strong>
                    <small>Bienes físicos, equipos o consumibles con control de existencias.</small>
                  </div>
                </button>

                <button
                  type="button"
                  className={`type-btn ${formData.type === 'service' ? 'selected' : ''}`}
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      type: 'service',
                      unitOfMeasure: 'Hrs',
                      sku: prev.sku || generateSkuSuggestion('service', prev.category, prev.name),
                    }))
                  }}
                >
                  <Tag size={16} />
                  <div>
                    <strong>Servicio profesional</strong>
                    <small>Consultoría, horas técnicas, licencias, proyectos o soporte recurrente.</small>
                  </div>
                </button>
              </div>

              {/* Basic Fields */}
              <div className="form-grid">
                <label className="form-field">
                  <span>Nombre del {formData.type === 'product' ? 'producto' : 'servicio'} *</span>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Servidor Rack Xeon, Consultoría TI..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </label>

                <label className="form-field">
                  <div className="field-label-row">
                    <span>Código SKU / Identificador *</span>
                    <button
                      type="button"
                      className="text-subtle-action"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          sku: generateSkuSuggestion(prev.type, prev.category, prev.name),
                        }))
                      }
                    >
                      Sugerir SKU
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    className="font-mono"
                    placeholder="Ej. HW-SRV-001"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                  />
                </label>
              </div>

              <div className="form-grid">
                <label className="form-field">
                  <span>Categoría comercial *</span>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as ItemCategory })
                    }
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-field">
                  <span>Unidad de medida *</span>
                  <select
                    value={formData.unitOfMeasure}
                    onChange={(e) =>
                      setFormData({ ...formData, unitOfMeasure: e.target.value as UnitOfMeasure })
                    }
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u === 'Pza'
                          ? 'Pieza (Pza)'
                          : u === 'Hrs'
                          ? 'Horas de servicio (Hrs)'
                          : u === 'Servicio'
                          ? 'Servicio integral'
                          : u === 'Mes'
                          ? 'Mensualidad (Mes)'
                          : u === 'Licencia'
                          ? 'Licencia de software'
                          : 'Paquete de entrega'}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Pricing & Tax calculation */}
              <div className="form-section-divider">PRECIOS E IMPUESTOS</div>

              <div className="form-grid">
                <label className="form-field">
                  <span>Precio de venta unitario (sin IVA) *</span>
                  <div className="input-with-prefix">
                    <span className="input-prefix">$</span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      className="font-mono tabular-nums"
                      placeholder="0.00"
                      value={formData.unitPrice || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })
                      }
                    />
                    <span className="input-suffix">MXN</span>
                  </div>
                </label>

                <label className="form-field">
                  <span>Tasa de impuesto (IVA)</span>
                  <select
                    value={formData.taxRate}
                    onChange={(e) =>
                      setFormData({ ...formData, taxRate: e.target.value as TaxRate })
                    }
                  >
                    {TAX_RATES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Dynamic Tax Calculation Banner */}
              <div className="price-calculation-preview">
                <div className="calc-col">
                  <span>Precio base</span>
                  <strong className="font-mono tabular-nums">
                    {formatMoney(formData.unitPrice, formData.currency)}
                  </strong>
                </div>
                <div className="calc-sign">+</div>
                <div className="calc-col">
                  <span>IVA ({formData.taxRate})</span>
                  <strong className="font-mono tabular-nums">
                    {formatMoney(calculatedTax, formData.currency)}
                  </strong>
                </div>
                <div className="calc-sign">=</div>
                <div className="calc-col highlight">
                  <span>Precio total al cliente</span>
                  <strong className="font-mono tabular-nums">
                    {formatMoney(calculatedTotalWithTax, formData.currency)}
                  </strong>
                </div>
              </div>

              {/* Conditional section: Product vs Service specific attributes */}
              {formData.type === 'product' ? (
                <>
                  <div className="form-section-divider">CONTROL DE EXISTENCIAS Y COSTOS</div>
                  <div className="form-grid form-grid-3">
                    <label className="form-field">
                      <span>Existencia actual</span>
                      <input
                        type="number"
                        min="0"
                        className="font-mono tabular-nums"
                        value={formData.stock ?? 0}
                        onChange={(e) =>
                          setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })
                        }
                      />
                    </label>

                    <label className="form-field">
                      <span>Stock mínimo de alerta</span>
                      <input
                        type="number"
                        min="0"
                        className="font-mono tabular-nums"
                        value={formData.minStock ?? 2}
                        onChange={(e) =>
                          setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })
                        }
                      />
                    </label>

                    <label className="form-field">
                      <span>Costo unitario de compra</span>
                      <div className="input-with-prefix">
                        <span className="input-prefix">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="font-mono tabular-nums"
                          placeholder="0.00"
                          value={formData.cost || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>
                    </label>
                  </div>

                  {calculatedMargin && (
                    <div className="margin-indicator-banner">
                      <span>Margen comercial estimado: </span>
                      <strong className="font-mono tabular-nums">{calculatedMargin}%</strong>
                      <small className="text-muted">
                        (Ganancia bruta de {formatMoney(formData.unitPrice - (formData.cost || 0))} por unidad)
                      </small>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="form-section-divider">MODALIDAD DE SERVICIO</div>
                  <div className="form-grid">
                    <label className="form-field">
                      <span>Modelo de facturación</span>
                      <select
                        value={formData.billingModel}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            billingModel: e.target.value as 'Por hora' | 'Precio fijo' | 'Recurrente',
                          })
                        }
                      >
                        <option value="Por hora">Por hora laborada</option>
                        <option value="Precio fijo">Precio fijo por paquete/proyecto</option>
                        <option value="Recurrente">Recurrente mensual / suscripción</option>
                      </select>
                    </label>

                    <label className="form-field">
                      <span>Tiempo estimado de entrega (días)</span>
                      <input
                        type="number"
                        min="1"
                        className="font-mono tabular-nums"
                        value={formData.leadTimeDays ?? 1}
                        onChange={(e) =>
                          setFormData({ ...formData, leadTimeDays: parseInt(e.target.value) || 1 })
                        }
                      />
                    </label>
                  </div>
                </>
              )}

              {/* Description & Status */}
              <label className="form-field">
                <span>Descripción comercial para cotizaciones</span>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre alcance, especificaciones técnicas o condiciones del servicio..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </label>

              <div className="form-grid">
                <label className="form-field">
                  <span>Estado del artículo</span>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as 'Activo' | 'Inactivo' })
                    }
                  >
                    <option value="Activo">Activo (Disponible en ventas)</option>
                    <option value="Inactivo">Inactivo (Oculto en cotizador)</option>
                  </select>
                </label>
              </div>

              {/* Modal Actions */}
              <div
                className={`create-modal-actions ${
                  modalMode === 'edit' && formData.id && canDelete ? 'has-delete-action' : ''
                }`}
              >
                {modalMode === 'edit' && formData.id && canDelete && (
                  <div className="modal-delete-slot">
                    {!confirmingDelete ? (
                      <button
                        type="button"
                        className="button button-danger-outline"
                        onClick={() => setConfirmingDelete(true)}
                      >
                        <Trash2 size={14} /> Eliminar artículo
                      </button>
                    ) : (
                      <div className="modal-delete-confirm">
                        <span>
                          ¿Eliminar <strong>{formData.name.trim() || formData.sku}</strong>?
                        </span>
                        <button
                          type="button"
                          className="button button-danger-solid"
                          onClick={() => handleConfirmDeleteItem(formData.id!)}
                        >
                          <Trash2 size={13} /> Confirmar
                        </button>
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => setConfirmingDelete(false)}
                        >
                          Conservar
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <div className="modal-primary-actions-slot">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => {
                      setIsModalOpen(false)
                      setConfirmingDelete(false)
                    }}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="button button-primary">
                    {modalMode === 'create' ? 'Guardar en catálogo' : 'Actualizar artículo'}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Quick View / Detail Modal */}
      {viewingItem && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setViewingItem(null)
              setConfirmingDelete(false)
            }
          }}
        >
          <section
            className="create-modal catalog-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-modal-title"
          >
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">FICHA TÉCNICA Y COMERCIAL</div>
                <h2 id="detail-modal-title">{viewingItem.name}</h2>
                <div className="detail-header-meta">
                  <span className="font-mono text-sm">{viewingItem.sku}</span>
                  <span aria-hidden="true">·</span>
                  <span className={`catalog-type-badge type-${viewingItem.type}`}>
                    {viewingItem.type === 'product' ? 'Producto' : 'Servicio'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{viewingItem.category}</span>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setViewingItem(null)}
                aria-label="Cerrar ficha"
              >
                <X size={18} />
              </button>
            </div>

            <div className="detail-modal-content">
              {/* Pricing Cards */}
              <div className="detail-price-grid">
                <div className="detail-stat-card">
                  <span>Precio de lista</span>
                  <strong className="font-mono tabular-nums">
                    {formatMoney(viewingItem.unitPrice, viewingItem.currency)}
                  </strong>
                  <small>Por {viewingItem.unitOfMeasure}</small>
                </div>

                <div className="detail-stat-card">
                  <span>Impuesto ({viewingItem.taxRate})</span>
                  <strong className="font-mono tabular-nums">
                    {formatMoney(
                      viewingItem.unitPrice *
                        (TAX_RATES.find((t) => t.value === viewingItem.taxRate)?.multiplier || 0),
                      viewingItem.currency
                    )}
                  </strong>
                  <small>IVA desglosado</small>
                </div>

                <div className="detail-stat-card highlight">
                  <span>Precio final al cliente</span>
                  <strong className="font-mono tabular-nums">
                    {formatMoney(
                      viewingItem.unitPrice *
                        (1 +
                          (TAX_RATES.find((t) => t.value === viewingItem.taxRate)?.multiplier || 0)),
                      viewingItem.currency
                    )}
                  </strong>
                  <small>Con impuestos incluidos</small>
                </div>
              </div>

              {/* Description */}
              <div className="detail-section">
                <h3>Descripción comercial</h3>
                <p>{viewingItem.description || 'Sin descripción adicional registrada.'}</p>
              </div>

              {/* Operational & Inventory Details */}
              <div className="detail-section">
                <h3>Información operativa</h3>
                <div className="detail-info-grid">
                  <div className="detail-info-row">
                    <span>Unidad de medida:</span>
                    <strong>{viewingItem.unitOfMeasure}</strong>
                  </div>
                  <div className="detail-info-row">
                    <span>Moneda de venta:</span>
                    <strong>{viewingItem.currency}</strong>
                  </div>
                  <div className="detail-info-row">
                    <span>Estado:</span>
                    <strong className={viewingItem.status === 'Activo' ? 'text-green' : 'text-muted'}>
                      {viewingItem.status}
                    </strong>
                  </div>
                  {viewingItem.type === 'product' ? (
                    <>
                      <div className="detail-info-row">
                        <span>Existencia en almacén:</span>
                        <strong className="font-mono tabular-nums">
                          {viewingItem.stock ?? 0} {viewingItem.unitOfMeasure}
                        </strong>
                      </div>
                      <div className="detail-info-row">
                        <span>Stock mínimo de seguridad:</span>
                        <strong className="font-mono tabular-nums">
                          {viewingItem.minStock ?? 0} {viewingItem.unitOfMeasure}
                        </strong>
                      </div>
                      {viewingItem.cost ? (
                        <div className="detail-info-row">
                          <span>Costo unitario de compra:</span>
                          <strong className="font-mono tabular-nums">
                            {formatMoney(viewingItem.cost, viewingItem.currency)}
                          </strong>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <div className="detail-info-row">
                        <span>Modelo de facturación:</span>
                        <strong>{viewingItem.billingModel || 'Precio fijo'}</strong>
                      </div>
                      {viewingItem.leadTimeDays ? (
                        <div className="detail-info-row">
                          <span>Tiempo estimado de entrega:</span>
                          <strong>{viewingItem.leadTimeDays} días hábiles</strong>
                        </div>
                      ) : null}
                    </>
                  )}
                  <div className="detail-info-row">
                    <span>Última actualización:</span>
                    <span>{viewingItem.lastUpdated}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={`create-modal-actions ${canDelete ? 'has-delete-action' : ''}`}>
              {canDelete && (
                <div className="modal-delete-slot">
                  {!confirmingDelete ? (
                    <button
                      type="button"
                      className="button button-danger-outline"
                      onClick={() => setConfirmingDelete(true)}
                    >
                      <Trash2 size={14} /> Eliminar artículo
                    </button>
                  ) : (
                    <div className="modal-delete-confirm">
                      <span>
                        ¿Eliminar <strong>{viewingItem.name}</strong>?
                      </span>
                      <button
                        type="button"
                        className="button button-danger-solid"
                        onClick={() => handleConfirmDeleteItem(viewingItem.id)}
                      >
                        <Trash2 size={13} /> Confirmar
                      </button>
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => setConfirmingDelete(false)}
                      >
                        Conservar
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div className="modal-primary-actions-slot">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => {
                    setViewingItem(null)
                    setConfirmingDelete(false)
                  }}
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => {
                    const item = viewingItem
                    setViewingItem(null)
                    handleOpenEdit(item)
                  }}
                >
                  <Edit3 size={15} /> Editar artículo
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
