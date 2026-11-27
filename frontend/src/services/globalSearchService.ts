export type GlobalSearchFilter =
  | 'all'
  | 'modules'
  | 'clients'
  | 'suppliers'
  | 'invoices'
  | 'operations'
  | 'help'

export type GlobalSearchEntityType =
  | 'module'
  | 'client'
  | 'supplier'
  | 'invoice'
  | 'operations'
  | 'help'

export type GlobalSearchIconKind =
  | 'home'
  | 'crm'
  | 'sales'
  | 'purchases'
  | 'operations'
  | 'finance'
  | 'expenses'
  | 'reports'
  | 'admin'
  | 'settings'
  | 'help'
  | 'invoice'
  | 'order'
  | 'product'
  | 'bank'
  | 'action'

export interface GlobalSearchItem {
  id: string
  entityType: GlobalSearchEntityType
  groupLabel: string
  title: string
  subtitle: string
  meta?: string
  keywords?: string
  matchedTags?: string[]
  iconKind: GlobalSearchIconKind
  priorityBoost?: number
  onSelect: () => void
}

export interface DirectedKeywordPreset {
  id: string
  label: string
  queryText: string
  targetFilter?: GlobalSearchFilter
  description: string
}

export const DIRECTED_SEARCH_KEYWORDS: DirectedKeywordPreset[] = [
  {
    id: 'kw-modules-pnl',
    label: 'Estado de Resultados',
    queryText: 'modulo: resultados margen',
    targetFilter: 'modules',
    description: 'Ir directo al reporte P&L y márgenes',
  },
  {
    id: 'kw-clients-active',
    label: 'Clientes activos',
    queryText: 'cliente: activo',
    targetFilter: 'clients',
    description: 'Filtrar clientes activos en CRM',
  },
  {
    id: 'kw-suppliers-clabe',
    label: 'Proveedores CLABE',
    queryText: 'proveedor: clabe',
    targetFilter: 'suppliers',
    description: 'Buscar proveedores con cuenta bancaria',
  },
  {
    id: 'kw-invoices-pending',
    label: 'Facturas pendientes',
    queryText: 'factura: pendiente',
    targetFilter: 'invoices',
    description: 'Ver facturas CxC y CxP por liquidar',
  },
  {
    id: 'kw-invoices-overdue',
    label: 'Facturas vencidas',
    queryText: 'factura: vencida',
    targetFilter: 'invoices',
    description: 'Localizar folios con saldo vencido',
  },
  {
    id: 'kw-ebp-banks',
    label: 'Pagos EBP',
    queryText: 'ebp dispersion bancaria',
    targetFilter: 'all',
    description: 'Lotes y layouts bancarios',
  },
  {
    id: 'kw-stock-alerts',
    label: 'Stock y almacén',
    queryText: 'inventario almacen stock',
    targetFilter: 'operations',
    description: 'Existencias y ubicaciones',
  },
  {
    id: 'kw-quick-create',
    label: 'Alta rápida',
    queryText: 'nuevo crear',
    targetFilter: 'modules',
    description: 'Acciones rápidas de creación',
  },
]

export interface ParsedSearchQuery {
  rawQuery: string
  effectiveFilter: GlobalSearchFilter
  detectedDirectiveLabel: string | null
  searchTokens: string[]
  normalizedTerms: string
}

export interface GlobalSearchApiResponse {
  results: GlobalSearchItem[]
  totalMatched: number
  countsByFilter: Record<GlobalSearchFilter, number>
  parsed: ParsedSearchQuery
  source: 'local-simulated-api'
}

export function normalizeSearchValue(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

const DIRECTIVE_ALIASES: Array<{
  prefixes: string[]
  filter: GlobalSearchFilter
  label: string
}> = [
  {
    prefixes: ['mod:', 'modulo:', 'modulos:', '@modulos', '@modulo'],
    filter: 'modules',
    label: 'Módulos',
  },
  {
    prefixes: ['cli:', 'cliente:', 'clientes:', '@clientes', '@cliente'],
    filter: 'clients',
    label: 'Clientes',
  },
  {
    prefixes: ['prov:', 'proveedor:', 'proveedores:', '@proveedores', '@proveedor'],
    filter: 'suppliers',
    label: 'Proveedores',
  },
  {
    prefixes: ['fac:', 'factura:', 'facturas:', 'cxc:', 'cxp:', '@facturas', '@factura'],
    filter: 'invoices',
    label: 'Facturas',
  },
  {
    prefixes: ['ops:', 'op:', 'stock:', 'venta:', 'compra:', '@operaciones'],
    filter: 'operations',
    label: 'Operación y stock',
  },
  {
    prefixes: ['ayuda:', 'faq:', 'guia:', '@ayuda'],
    filter: 'help',
    label: 'Ayuda y estructura',
  },
]

const INTENT_SYNONYM_MAP: Record<string, string[]> = {
  pnl: ['estado de resultados', 'utilidad', 'margen'],
  pyl: ['estado de resultados', 'utilidad', 'margen'],
  breakeven: ['punto de equilibrio'],
  equilibrio: ['punto de equilibrio'],
  cxc: ['cobros', 'factura', 'cliente'],
  cxp: ['pagos', 'factura', 'proveedor'],
  cfdi: ['factura', 'rfc', 'fiscal'],
  alta: ['nuevo', 'crear'],
  dispersion: ['ebp', 'bancario', 'clabe'],
  impuestos: ['iva', 'isr', 'fiscal'],
  bodega: ['almacen', 'ubicacion', 'inventario'],
}

export function parseDirectedSearchQuery(
  rawQuery: string,
  explicitFilter: GlobalSearchFilter
): ParsedSearchQuery {
  const normalized = normalizeSearchValue(rawQuery)
  const rawTokens = normalized.split(/\s+/).filter(Boolean)

  let directiveFilter: GlobalSearchFilter | null = null
  let detectedDirectiveLabel: string | null = null
  const remainingTokens: string[] = []

  for (const token of rawTokens) {
    let matchedPrefix = false
    for (const rule of DIRECTIVE_ALIASES) {
      const hitPrefix = rule.prefixes.find((p) => token.startsWith(p))
      if (hitPrefix) {
        directiveFilter = rule.filter
        detectedDirectiveLabel = rule.label
        const suffix = token.slice(hitPrefix.length).trim()
        if (suffix) remainingTokens.push(suffix)
        matchedPrefix = true
        break
      }
    }
    if (!matchedPrefix) {
      remainingTokens.push(token)
    }
  }

  const effectiveFilter =
    explicitFilter !== 'all' ? explicitFilter : directiveFilter ?? 'all'

  return {
    rawQuery,
    effectiveFilter,
    detectedDirectiveLabel:
      explicitFilter === 'all' ? detectedDirectiveLabel : null,
    searchTokens: remainingTokens,
    normalizedTerms: remainingTokens.join(' '),
  }
}

export function scoreGlobalSearchItem(
  item: GlobalSearchItem,
  tokens: string[],
  normalizedTerms: string
): number {
  if (tokens.length === 0) return item.priorityBoost ?? 0

  const title = normalizeSearchValue(item.title)
  const subtitle = normalizeSearchValue(item.subtitle)
  const meta = normalizeSearchValue(item.meta || '')
  const keywords = normalizeSearchValue(item.keywords || '')
  const tags = normalizeSearchValue((item.matchedTags || []).join(' '))
  const group = normalizeSearchValue(item.groupLabel)

  const haystack = `${title} ${subtitle} ${meta} ${keywords} ${tags} ${group}`

  for (const token of tokens) {
    if (haystack.includes(token)) continue
    const synonyms = INTENT_SYNONYM_MAP[token]
    if (!synonyms || !synonyms.some((syn) => haystack.includes(syn))) {
      return -1
    }
  }

  let score = item.priorityBoost ?? 0
  if (title === normalizedTerms || meta === normalizedTerms) score += 130
  else if (title.startsWith(normalizedTerms)) score += 85
  else if (title.includes(normalizedTerms)) score += 55
  if (meta.includes(normalizedTerms)) score += 48
  if (tags.includes(normalizedTerms) || keywords.includes(normalizedTerms)) score += 32
  if (subtitle.includes(normalizedTerms)) score += 24
  if (item.entityType === 'module') score += 8
  return score
}

export function matchesEntityFilter(
  item: GlobalSearchItem,
  filter: GlobalSearchFilter
): boolean {
  if (filter === 'all') return true
  if (filter === 'modules') return item.entityType === 'module'
  if (filter === 'clients') return item.entityType === 'client'
  if (filter === 'suppliers') return item.entityType === 'supplier'
  if (filter === 'invoices') return item.entityType === 'invoice'
  if (filter === 'operations') return item.entityType === 'operations'
  if (filter === 'help') return item.entityType === 'help'
  return true
}

/**
 * API simulada de búsqueda local para AES Nexus (Cmd+K).
 * Emula una consulta asíncrona contra /api/v1/search con cancelación por AbortSignal,
 * soporte de palabras clave dirigidas (modulo:, cliente:, proveedor:, factura:) y ranking ponderado.
 */
export async function searchGlobalIndexApi({
  items,
  query,
  filter,
  signal,
}: {
  items: GlobalSearchItem[]
  query: string
  filter: GlobalSearchFilter
  signal?: AbortSignal
}): Promise<GlobalSearchApiResponse> {
  const parsed = parseDirectedSearchQuery(query, filter)

  // Latencia breve simulada cuando hay términos de búsqueda o cambio de filtro activo
  const simulatedDelayMs = parsed.searchTokens.length > 0 ? 110 : 40
  await new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Search aborted', 'AbortError'))
      return
    }
    const timer = window.setTimeout(() => {
      cleanup()
      resolve()
    }, simulatedDelayMs)
    const onAbort = () => {
      window.clearTimeout(timer)
      cleanup()
      reject(new DOMException('Search aborted', 'AbortError'))
    }
    const cleanup = () => {
      signal?.removeEventListener('abort', onAbort)
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })

  const scoredByQuery =
    parsed.searchTokens.length === 0
      ? items.map((item) => ({ item, score: item.priorityBoost ?? 0 }))
      : items
          .map((item) => ({
            item,
            score: scoreGlobalSearchItem(
              item,
              parsed.searchTokens,
              parsed.normalizedTerms
            ),
          }))
          .filter((entry) => entry.score >= 0)
          .sort((a, b) => b.score - a.score)

  const countsByFilter: Record<GlobalSearchFilter, number> = {
    all: scoredByQuery.length,
    modules: 0,
    clients: 0,
    suppliers: 0,
    invoices: 0,
    operations: 0,
    help: 0,
  }

  for (const { item } of scoredByQuery) {
    if (item.entityType === 'module') countsByFilter.modules += 1
    else if (item.entityType === 'client') countsByFilter.clients += 1
    else if (item.entityType === 'supplier') countsByFilter.suppliers += 1
    else if (item.entityType === 'invoice') countsByFilter.invoices += 1
    else if (item.entityType === 'operations') countsByFilter.operations += 1
    else if (item.entityType === 'help') countsByFilter.help += 1
  }

  const scoped = scoredByQuery
    .filter(({ item }) => matchesEntityFilter(item, parsed.effectiveFilter))
    .slice(0, parsed.searchTokens.length === 0 ? 18 : 32)
    .map(({ item }) => item)

  return {
    results: scoped,
    totalMatched: countsByFilter[parsed.effectiveFilter],
    countsByFilter,
    parsed,
    source: 'local-simulated-api',
  }
}
