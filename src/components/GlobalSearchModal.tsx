import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  CircleHelp,
  Clock3,
  Compass,
  FileText,
  Landmark,
  LayoutDashboard,
  Loader2,
  Package,
  Plus,
  Receipt,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Users,
  WalletCards,
  Warehouse,
  X,
} from 'lucide-react'
import {
  DIRECTED_SEARCH_KEYWORDS,
  matchesEntityFilter,
  parseDirectedSearchQuery,
  searchGlobalIndexApi,
  type DirectedKeywordPreset,
  type GlobalSearchApiResponse,
  type GlobalSearchEntityType,
  type GlobalSearchFilter,
  type GlobalSearchIconKind,
  type GlobalSearchItem,
} from '../services/globalSearchService'

export type {
  GlobalSearchEntityType,
  GlobalSearchFilter,
  GlobalSearchIconKind,
  GlobalSearchItem,
}

interface GlobalSearchModalProps {
  isOpen: boolean
  items: GlobalSearchItem[]
  onClose: () => void
}

const RECENT_SEARCHES_KEY = 'aes_nexus_global_search_recent_v1'

const FILTER_TABS: Array<{ id: GlobalSearchFilter; label: string }> = [
  { id: 'all', label: 'Todo' },
  { id: 'modules', label: 'Módulos' },
  { id: 'clients', label: 'Clientes' },
  { id: 'suppliers', label: 'Proveedores' },
  { id: 'invoices', label: 'Facturas' },
  { id: 'operations', label: 'Operación y stock' },
  { id: 'help', label: 'Ayuda' },
]

function renderItemIcon(kind: GlobalSearchIconKind) {
  switch (kind) {
    case 'home':
      return <LayoutDashboard size={15} />
    case 'crm':
      return <Users size={15} />
    case 'sales':
      return <ShoppingBag size={15} />
    case 'purchases':
      return <ShoppingCart size={15} />
    case 'operations':
      return <Warehouse size={15} />
    case 'finance':
      return <WalletCards size={15} />
    case 'expenses':
      return <Receipt size={15} />
    case 'reports':
      return <BarChart3 size={15} />
    case 'admin':
      return <ShieldCheck size={15} />
    case 'settings':
      return <Settings2 size={15} />
    case 'help':
      return <CircleHelp size={15} />
    case 'invoice':
      return <FileText size={15} />
    case 'order':
      return <Package size={15} />
    case 'product':
      return <Package size={15} />
    case 'bank':
      return <Landmark size={15} />
    case 'action':
      return <Plus size={15} />
    default:
      return <Building2 size={15} />
  }
}

function renderHighlightedText(text: string, tokens: string[]): ReactNode {
  if (tokens.length === 0 || !text) return text

  const normChars: string[] = []
  const origStarts: number[] = []
  const origEnds: number[] = []

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const base = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    for (let j = 0; j < base.length; j++) {
      normChars.push(base[j])
      origStarts.push(i)
      origEnds.push(i + 1)
    }
  }

  const normalized = normChars.join('')
  const ranges: Array<[number, number]> = []

  for (const token of tokens) {
    if (!token) continue
    let from = 0
    while (from < normalized.length) {
      const idx = normalized.indexOf(token, from)
      if (idx === -1) break
      const start = origStarts[idx]
      const end = origEnds[idx + token.length - 1]
      if (typeof start === 'number' && typeof end === 'number') {
        ranges.push([start, end])
      }
      from = idx + token.length
    }
  }

  if (ranges.length === 0) return text
  ranges.sort((a, b) => a[0] - b[0])

  const merged: Array<[number, number]> = []
  for (const r of ranges) {
    const last = merged[merged.length - 1]
    if (last && r[0] <= last[1]) {
      last[1] = Math.max(last[1], r[1])
    } else {
      merged.push([r[0], r[1]])
    }
  }

  const parts: ReactNode[] = []
  let cursor = 0
  merged.forEach(([start, end], i) => {
    if (start > cursor) {
      parts.push(<Fragment key={`t-${i}`}>{text.slice(cursor, start)}</Fragment>)
    }
    parts.push(
      <mark key={`m-${i}`} className="global-search-mark">
        {text.slice(start, end)}
      </mark>
    )
    cursor = end
  })
  if (cursor < text.length) {
    parts.push(<Fragment key="tail">{text.slice(cursor)}</Fragment>)
  }
  return parts
}

export function GlobalSearchModal({
  isOpen,
  items,
  onClose,
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<GlobalSearchFilter>('all')
  const [activeIndex, setActiveIndex] = useState(0)
  const [isSearching, setIsSearching] = useState(false)
  const [apiResponse, setApiResponse] = useState<GlobalSearchApiResponse | null>(null)
  const [recentIds, setRecentIds] = useState<string[]>(() => {
    try {
      const saved = window.localStorage.getItem(RECENT_SEARCHES_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === 'string')
      }
    } catch {
      // ignore storage errors
    }
    return []
  })

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    setQuery('')
    setActiveFilter('all')
    setActiveIndex(0)
    const timer = window.setTimeout(() => {
      inputRef.current?.focus()
    }, 10)
    return () => window.clearTimeout(timer)
  }, [isOpen])

  const parsedPreview = useMemo(
    () => parseDirectedSearchQuery(query, activeFilter),
    [query, activeFilter]
  )

  // Consulta asíncrona mediante API simulada de búsqueda local con cancelación
  useEffect(() => {
    if (!isOpen) return
    const controller = new AbortController()
    setIsSearching(true)

    searchGlobalIndexApi({
      items,
      query,
      filter: activeFilter,
      signal: controller.signal,
    })
      .then((res) => {
        if (!controller.signal.aborted) {
          setApiResponse(res)
          setIsSearching(false)
        }
      })
      .catch((err) => {
        if ((err as Error)?.name !== 'AbortError') {
          setIsSearching(false)
        }
      })

    return () => controller.abort()
  }, [isOpen, items, query, activeFilter])

  const effectiveFilter = apiResponse?.parsed.effectiveFilter ?? parsedPreview.effectiveFilter
  const activeTokens = apiResponse?.parsed.searchTokens ?? parsedPreview.searchTokens
  const isEmptyTerms = activeTokens.length === 0

  const { recentItems, mainResults } = useMemo(() => {
    const results = apiResponse?.results ?? []
    if (!isEmptyTerms) {
      return { recentItems: [] as GlobalSearchItem[], mainResults: results }
    }
    const scopedRecents = recentIds
      .map((id) => items.find((it) => it.id === id))
      .filter((it): it is GlobalSearchItem =>
        Boolean(it && matchesEntityFilter(it, effectiveFilter))
      )
      .slice(0, 4)
    const recentSet = new Set(scopedRecents.map((it) => it.id))
    return {
      recentItems: scopedRecents,
      mainResults: results.filter((it) => !recentSet.has(it.id)).slice(0, 12),
    }
  }, [apiResponse, effectiveFilter, isEmptyTerms, items, recentIds])

  const flatSelectableItems = useMemo(
    () => [...recentItems, ...mainResults],
    [recentItems, mainResults]
  )

  useEffect(() => {
    setActiveIndex(0)
  }, [query, activeFilter, isOpen])

  useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.querySelector<HTMLElement>(
      `[data-search-idx="${activeIndex}"]`
    )
    activeEl?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const handleChooseItem = (item: GlobalSearchItem) => {
    setRecentIds((prev) => {
      const next = [item.id, ...prev.filter((id) => id !== item.id)].slice(0, 6)
      try {
        window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next))
      } catch {
        // ignore storage errors
      }
      return next
    })
    onClose()
    item.onSelect()
  }

  const handleApplyDirectedKeyword = (preset: DirectedKeywordPreset) => {
    setQuery(preset.queryText)
    if (preset.targetFilter) {
      setActiveFilter(preset.targetFilter)
    }
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (flatSelectableItems.length > 0) {
        setActiveIndex((prev) => (prev + 1) % flatSelectableItems.length)
      }
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (flatSelectableItems.length > 0) {
        setActiveIndex((prev) =>
          prev === 0 ? flatSelectableItems.length - 1 : prev - 1
        )
      }
      return
    }
    if (e.key === 'Enter') {
      const chosen = flatSelectableItems[activeIndex]
      if (chosen) {
        e.preventDefault()
        handleChooseItem(chosen)
      }
    }
  }

  if (!isOpen) return null

  const groupedSections: Array<{
    label: string
    rows: Array<{ item: GlobalSearchItem; idx: number }>
  }> = []
  let runningIdx = 0

  if (recentItems.length > 0) {
    groupedSections.push({
      label: 'Recientes',
      rows: recentItems.map((item) => ({
        item,
        idx: runningIdx++,
      })),
    })
  }

  if (mainResults.length > 0) {
    if (isEmptyTerms) {
      groupedSections.push({
        label:
          effectiveFilter === 'all'
            ? 'Accesos sugeridos y acciones'
            : `Sugeridos en ${FILTER_TABS.find((t) => t.id === effectiveFilter)?.label || 'selección'}`,
        rows: mainResults.map((item) => ({
          item,
          idx: runningIdx++,
        })),
      })
    } else {
      const byGroup = new Map<string, Array<{ item: GlobalSearchItem; idx: number }>>()
      mainResults.forEach((item) => {
        const list = byGroup.get(item.groupLabel) || []
        list.push({ item, idx: runningIdx++ })
        byGroup.set(item.groupLabel, list)
      })
      byGroup.forEach((rows, label) => {
        groupedSections.push({ label, rows })
      })
    }
  }

  const counts = apiResponse?.countsByFilter

  return (
    <div
      className="modal-backdrop global-search-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <section
        className="global-search-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Buscador global del ERP"
        onKeyDown={handleKeyDown}
      >
        <div className="global-search-input-row">
          {isSearching ? (
            <Loader2 size={17} className="global-search-leading-icon global-search-spinner" />
          ) : (
            <Search size={17} className="global-search-leading-icon" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar módulos, clientes, proveedores, facturas o usa prefijos (mod:, cli:, prov:, fac:)..."
            aria-label="Buscar en todo el sistema"
          />
          {parsedPreview.detectedDirectiveLabel && (
            <span className="global-search-directive-hint">
              Ámbito: {parsedPreview.detectedDirectiveLabel}
            </span>
          )}
          {(query || activeFilter !== 'all') && (
            <button
              type="button"
              className="global-search-clear-btn"
              aria-label="Limpiar búsqueda y filtro"
              onClick={() => {
                setQuery('')
                setActiveFilter('all')
                inputRef.current?.focus()
              }}
            >
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            className="global-search-esc-btn"
            onClick={onClose}
            aria-label="Cerrar buscador global"
          >
            ESC
          </button>
        </div>

        <div className="global-search-tabs" role="tablist" aria-label="Filtrar resultados por entidad">
          {FILTER_TABS.map((tab) => {
            const isTabActive = effectiveFilter === tab.id
            const tabCount = counts ? counts[tab.id] : undefined
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isTabActive}
                className={`global-search-tab ${isTabActive ? 'active' : ''}`}
                onClick={() => setActiveFilter(tab.id)}
              >
                <span>{tab.label}</span>
                {typeof tabCount === 'number' && (
                  <span className="global-search-tab-count mono">{tabCount}</span>
                )}
              </button>
            )
          })}
        </div>

        <div className="global-search-keywords-row" aria-label="Palabras clave para dirigir la búsqueda">
          <span className="global-search-keywords-label">
            <Compass size={13} /> Palabras clave:
          </span>
          <div className="global-search-keywords-list">
            {DIRECTED_SEARCH_KEYWORDS.map((preset) => {
              const isSelected = query.trim().toLowerCase() === preset.queryText.toLowerCase()
              return (
                <button
                  key={preset.id}
                  type="button"
                  title={preset.description}
                  className={`global-search-keyword-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => handleApplyDirectedKeyword(preset)}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="global-search-results" ref={listRef}>
          {flatSelectableItems.length === 0 && !isSearching ? (
            <div className="global-search-empty">
              <BookOpen size={20} />
              <strong>Sin coincidencias para &ldquo;{query.trim() || FILTER_TABS.find((t) => t.id === effectiveFilter)?.label}&rdquo;</strong>
              <span>
                Prueba usando palabras clave directas como <b>modulo:</b>, <b>cliente:</b>, <b>proveedor:</b>, <b>factura:</b> o términos como <i>vencida</i>, <i>clabe</i>, <i>p&amp;l</i> o <i>ebp</i>.
              </span>
              {(activeFilter !== 'all' || query) && (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => {
                    setActiveFilter('all')
                    setQuery('')
                    inputRef.current?.focus()
                  }}
                >
                  Restablecer búsqueda
                </button>
              )}
            </div>
          ) : (
            groupedSections.map((group) => (
              <div key={group.label} className="global-search-group">
                <div className="global-search-group-title">{group.label}</div>
                <div className="global-search-group-items">
                  {group.rows.map(({ item, idx }) => {
                    const isActive = idx === activeIndex
                    const isRecent = group.label === 'Recientes'
                    return (
                      <button
                        key={`${group.label}-${item.id}`}
                        type="button"
                        data-search-idx={idx}
                        className={`global-search-item ${isActive ? 'is-active' : ''}`}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => handleChooseItem(item)}
                      >
                        <span className="global-search-item-icon">
                          {isRecent ? <Clock3 size={14} /> : renderItemIcon(item.iconKind)}
                        </span>
                        <span className="global-search-item-copy">
                          <strong>{renderHighlightedText(item.title, activeTokens)}</strong>
                          <span>{renderHighlightedText(item.subtitle, activeTokens)}</span>
                        </span>
                        {item.meta && (
                          <span className="global-search-item-meta mono">
                            {renderHighlightedText(item.meta, activeTokens)}
                          </span>
                        )}
                        <ArrowRight size={13} className="global-search-item-arrow" />
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <footer className="global-search-footer">
          <div className="global-search-hints">
            <span><kbd>↑</kbd><kbd>↓</kbd> Navegar</span>
            <span><kbd>↵</kbd> Abrir</span>
            <span><kbd>mod:</kbd> <kbd>cli:</kbd> <kbd>prov:</kbd> <kbd>fac:</kbd> Dirigir</span>
          </div>
          <span className="global-search-count mono">
            {isSearching
              ? 'Buscando en índice local...'
              : `${apiResponse?.totalMatched ?? flatSelectableItems.length} resultados · ${items.length} indexados`}
          </span>
        </footer>
      </section>
    </div>
  )
}
