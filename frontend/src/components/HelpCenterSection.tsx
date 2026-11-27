import { Fragment, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileText,
  GitBranch,
  LifeBuoy,
  MessageSquarePlus,
  RotateCcw,
  Search,
  Send,
  SlidersHorizontal,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react'
import {
  HELP_ARTICLES,
  HELP_CATEGORIES,
  HELP_CENTER_TABS,
  HELP_FAQ_COMPLEXITY_LEVELS,
  HELP_FAQ_FORMATS,
  HELP_FAQ_MODULES,
  HELP_FAQ_VISUAL_CATEGORIES,
  HELP_FAQS,
  HELP_GLOSSARY,
  HELP_WORKFLOWS,
  loadStoredHelpFeedback,
  loadStoredHelpTickets,
  saveStoredHelpFeedback,
  saveStoredHelpTickets,
  type FaqAnswerFormat,
  type FaqComplexityLevel,
  type FaqModuleTag,
  type FaqVisualCategory,
  type GlossaryDomain,
  type HelpCenterTab,
  type HelpModuleTarget,
  type SupportTicketRecord,
  type TicketPriority,
  type TicketStatus,
} from '../data/helpCenter'
import { useToast } from './Toast'

interface HelpCenterSectionProps {
  activeUserName: string
  activeUserSubtitle: string
  onNavigateTarget: (target: HelpModuleTarget) => void
  onAuditTicket?: (action: string, detail: string) => void
}

const SUPPORT_MODULE_OPTIONS = [
  'Inicio · Tablero ejecutivo',
  'CRM · Clientes, Proveedores y Nómina',
  'Ventas · Cotizaciones, Pedidos, Facturas y RMA',
  'Compras · Requisiciones, OC y Facturas CxP',
  'Operaciones · Inventario, Traslados y Entregas',
  'Finanzas · Cobros, Pagos y EBP',
  'Gastos · Pólizas, Presupuestos 80%/95% y Recurrentes',
  'Reportes · Estado de Resultados (P&L)',
  'Administración · Subsidiarias, Departamentos y Auditoría',
  'Configuración · Roles, Permisos y Umbrales',
]

const GLOSSARY_DOMAINS: Array<'Todos' | GlossaryDomain> = [
  'Todos',
  'Fiscal y CFDI',
  'Bancario y EBP',
  'Finanzas y P&L',
  'Operaciones y RBAC',
]

const FAQ_QUICK_KEYWORDS = ['CLABE', 'Nómina', 'Cotización', 'EBP', '80%', 'RMA', 'P&L']

function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function getSearchTokens(query: string): string[] {
  return normalizeSearchText(query)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
}

function matchesSearchTokens(haystack: string, tokens: string[]): boolean {
  if (tokens.length === 0) return true
  const normalized = normalizeSearchText(haystack)
  return tokens.every((token) => normalized.includes(token))
}

function renderHighlightedText(text: string, tokens: string[]): ReactNode {
  if (tokens.length === 0 || !text) return text

  // Map each normalized character back to original indices so accent-insensitive highlights align cleanly.
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
    let fromIdx = 0
    while (fromIdx <= normalized.length - token.length) {
      const matchIdx = normalized.indexOf(token, fromIdx)
      if (matchIdx === -1) break
      const startOrig = origStarts[matchIdx]
      const endOrig = origEnds[matchIdx + token.length - 1]
      ranges.push([startOrig, endOrig])
      fromIdx = matchIdx + token.length
    }
  }

  if (ranges.length === 0) return text

  ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const merged: Array<[number, number]> = []
  for (const [s, e] of ranges) {
    const last = merged[merged.length - 1]
    if (!last || s > last[1]) {
      merged.push([s, e])
    } else {
      last[1] = Math.max(last[1], e)
    }
  }

  const nodes: ReactNode[] = []
  let cursor = 0
  merged.forEach(([start, end], idx) => {
    if (cursor < start) {
      nodes.push(text.slice(cursor, start))
    }
    nodes.push(
      <mark key={`hl-${idx}-${start}`} className="help-search-mark">
        {text.slice(start, end)}
      </mark>
    )
    cursor = end
  })
  if (cursor < text.length) {
    nodes.push(text.slice(cursor))
  }

  return <Fragment>{nodes}</Fragment>
}

function formatNowShort(): string {
  const now = new Date()
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const day = String(now.getDate()).padStart(2, '0')
  const month = months[now.getMonth()] ?? 'Nov'
  const year = now.getFullYear()
  const hours = String(now.getHours()).padStart(2, '0')
  const mins = String(now.getMinutes()).padStart(2, '0')
  return `${day} ${month} ${year} · ${hours}:${mins}`
}

export function HelpCenterSection({
  activeUserName,
  activeUserSubtitle,
  onNavigateTarget,
  onAuditTicket,
}: HelpCenterSectionProps) {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<HelpCenterTab>('Guías por módulo')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all')
  const [selectedArticleId, setSelectedArticleId] = useState<string>(HELP_ARTICLES[0]?.id ?? '')
  const [openFaqIds, setOpenFaqIds] = useState<Record<string, boolean>>({
    [HELP_FAQS[0]?.id ?? '']: true,
  })
  const [faqModuleFilter, setFaqModuleFilter] = useState<'Todos' | FaqModuleTag>('Todos')
  const [faqVisualCategoryFilter, setFaqVisualCategoryFilter] = useState<'Todas' | FaqVisualCategory>('Todas')
  const [faqComplexityFilter, setFaqComplexityFilter] = useState<'Todos' | FaqComplexityLevel>('Todos')
  const [faqFormatFilter, setFaqFormatFilter] = useState<FaqAnswerFormat>('Todas')
  const [showAdvancedFaqFilters, setShowAdvancedFaqFilters] = useState(true)
  const [glossaryDomain, setGlossaryDomain] = useState<'Todos' | GlossaryDomain>('Todos')

  const [feedbackMap, setFeedbackMap] = useState<Record<string, 'up' | 'down'>>(() =>
    loadStoredHelpFeedback()
  )

  // Soporte y tickets
  const [tickets, setTickets] = useState<SupportTicketRecord[]>(() => loadStoredHelpTickets())
  const [ticketFilter, setTicketFilter] = useState<'Todos' | 'Abiertos' | 'Resueltos'>('Todos')
  const [ticketSubject, setTicketSubject] = useState('')
  const [ticketModule, setTicketModule] = useState(SUPPORT_MODULE_OPTIONS[6])
  const [ticketPriority, setTicketPriority] = useState<TicketPriority>('Media')
  const [ticketDescription, setTicketDescription] = useState('')
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})

  const searchTokens = useMemo(() => getSearchTokens(searchQuery), [searchQuery])
  const hasSearchQuery = searchTokens.length > 0

  const filteredArticles = useMemo(() => {
    return HELP_ARTICLES.filter((article) => {
      const categoryMatch = selectedCategoryId === 'all' || article.categoryId === selectedCategoryId
      if (!categoryMatch) return false
      if (!hasSearchQuery) return true
      const haystack = [
        article.title,
        article.summary,
        article.targetLabel,
        ...article.prerequisites,
        ...article.steps.map((s) => `${s.title} ${s.detail}`),
        ...article.validations,
      ].join(' ')
      return matchesSearchTokens(haystack, searchTokens)
    })
  }, [selectedCategoryId, hasSearchQuery, searchTokens])

  const activeArticle = useMemo(() => {
    const inFiltered = filteredArticles.find((a) => a.id === selectedArticleId)
    return inFiltered ?? filteredArticles[0] ?? null
  }, [filteredArticles, selectedArticleId])

  const filteredWorkflows = useMemo(() => {
    if (!hasSearchQuery) return HELP_WORKFLOWS
    return HELP_WORKFLOWS.filter((wf) => {
      const haystack = [
        wf.code,
        wf.title,
        wf.domain,
        wf.description,
        wf.outcome,
        ...wf.steps.map((s) => `${s.moduleName} ${s.actionTitle} ${s.detail}`),
      ].join(' ')
      return matchesSearchTokens(haystack, searchTokens)
    })
  }, [hasSearchQuery, searchTokens])

  const faqsMatchingKeywords = useMemo(() => {
    if (!hasSearchQuery) return HELP_FAQS
    return HELP_FAQS.filter((faq) => {
      const haystack = `${faq.moduleTag} ${faq.visualCategory} ${faq.tags.join(' ')} ${faq.complexity} ${faq.question} ${faq.answer} ${(faq.quickSteps ?? []).join(' ')} ${faq.relatedLabel ?? ''}`
      return matchesSearchTokens(haystack, searchTokens)
    })
  }, [hasSearchQuery, searchTokens])

  const faqsMatchingKeywordsAndModule = useMemo(() => {
    if (faqModuleFilter === 'Todos') return faqsMatchingKeywords
    return faqsMatchingKeywords.filter((faq) => faq.moduleTag === faqModuleFilter)
  }, [faqsMatchingKeywords, faqModuleFilter])

  const faqsMatchingAdvancedOnly = useMemo(() => {
    return faqsMatchingKeywords.filter((faq) => {
      const catMatch =
        faqVisualCategoryFilter === 'Todas' || faq.visualCategory === faqVisualCategoryFilter
      if (!catMatch) return false
      const levelMatch = faqComplexityFilter === 'Todos' || faq.complexity === faqComplexityFilter
      if (!levelMatch) return false
      if (faqFormatFilter === 'Con pasos rápidos') {
        return Boolean(faq.quickSteps && faq.quickSteps.length > 0)
      }
      if (faqFormatFilter === 'Con acceso directo') {
        return Boolean(faq.relatedTarget)
      }
      return true
    })
  }, [faqsMatchingKeywords, faqVisualCategoryFilter, faqComplexityFilter, faqFormatFilter])

  const filteredFaqs = useMemo(() => {
    if (faqModuleFilter === 'Todos') return faqsMatchingAdvancedOnly
    return faqsMatchingAdvancedOnly.filter((faq) => faq.moduleTag === faqModuleFilter)
  }, [faqsMatchingAdvancedOnly, faqModuleFilter])

  const faqCountByModule = useMemo(() => {
    const counts: Record<string, number> = { Todos: faqsMatchingAdvancedOnly.length }
    for (const faq of faqsMatchingAdvancedOnly) {
      counts[faq.moduleTag] = (counts[faq.moduleTag] ?? 0) + 1
    }
    return counts
  }, [faqsMatchingAdvancedOnly])

  const faqCountByVisualCategory = useMemo(() => {
    const counts: Record<string, number> = { Todas: faqsMatchingKeywordsAndModule.length }
    for (const faq of faqsMatchingKeywordsAndModule) {
      counts[faq.visualCategory] = (counts[faq.visualCategory] ?? 0) + 1
    }
    return counts
  }, [faqsMatchingKeywordsAndModule])

  const faqCountByComplexity = useMemo(() => {
    const counts: Record<string, number> = { Todos: faqsMatchingKeywordsAndModule.length }
    for (const faq of faqsMatchingKeywordsAndModule) {
      counts[faq.complexity] = (counts[faq.complexity] ?? 0) + 1
    }
    return counts
  }, [faqsMatchingKeywordsAndModule])

  const faqCountByFormat = useMemo(() => {
    const base = faqsMatchingKeywordsAndModule.filter(
      (f) =>
        (faqVisualCategoryFilter === 'Todas' || f.visualCategory === faqVisualCategoryFilter) &&
        (faqComplexityFilter === 'Todos' || f.complexity === faqComplexityFilter)
    )
    return {
      Todas: base.length,
      'Con pasos rápidos': base.filter((f) => Boolean(f.quickSteps && f.quickSteps.length > 0)).length,
      'Con acceso directo': base.filter((f) => Boolean(f.relatedTarget)).length,
    }
  }, [faqsMatchingKeywordsAndModule, faqVisualCategoryFilter, faqComplexityFilter])

  const activeAdvancedFaqFilterCount =
    (faqVisualCategoryFilter !== 'Todas' ? 1 : 0) +
    (faqComplexityFilter !== 'Todos' ? 1 : 0) +
    (faqFormatFilter !== 'Todas' ? 1 : 0)

  const expandedVisibleFaqCount = useMemo(
    () => filteredFaqs.filter((faq) => Boolean(openFaqIds[faq.id])).length,
    [filteredFaqs, openFaqIds]
  )

  const filteredGlossary = useMemo(() => {
    return HELP_GLOSSARY.filter((item) => {
      const domainMatch = glossaryDomain === 'Todos' || item.domain === glossaryDomain
      if (!domainMatch) return false
      if (!hasSearchQuery) return true
      return matchesSearchTokens(
        `${item.term} ${item.domain} ${item.formulaOrRule} ${item.definition}`,
        searchTokens
      )
    })
  }, [glossaryDomain, hasSearchQuery, searchTokens])

  const filteredTickets = useMemo(() => {
    return tickets.filter((tkt) => {
      const statusMatch =
        ticketFilter === 'Todos'
          ? true
          : ticketFilter === 'Abiertos'
          ? tkt.status !== 'Resuelto'
          : tkt.status === 'Resuelto'
      if (!statusMatch) return false
      if (!hasSearchQuery) return true
      return matchesSearchTokens(
        `${tkt.code} ${tkt.subject} ${tkt.moduleName} ${tkt.description} ${tkt.requesterName}`,
        searchTokens
      )
    })
  }, [tickets, ticketFilter, hasSearchQuery, searchTokens])

  const openTicketsCount = useMemo(
    () => tickets.filter((t) => t.status !== 'Resuelto').length,
    [tickets]
  )

  const handleToggleFeedback = (articleId: string, vote: 'up' | 'down') => {
    setFeedbackMap((prev) => {
      const next = { ...prev }
      if (next[articleId] === vote) {
        delete next[articleId]
      } else {
        next[articleId] = vote
      }
      saveStoredHelpFeedback(next)
      return next
    })
    toast.success('Gracias por tu valoración de la guía.', 'Centro de ayuda')
  }

  const handleToggleFaq = (faqId: string) => {
    setOpenFaqIds((prev) => ({
      ...prev,
      [faqId]: !prev[faqId],
    }))
  }

  const handleExpandAllVisibleFaqs = () => {
    setOpenFaqIds((prev) => {
      const next = { ...prev }
      for (const faq of filteredFaqs) {
        next[faq.id] = true
      }
      return next
    })
  }

  const handleCollapseAllVisibleFaqs = () => {
    setOpenFaqIds((prev) => {
      const next = { ...prev }
      for (const faq of filteredFaqs) {
        next[faq.id] = false
      }
      return next
    })
  }

  const handleSubmitTicket = (event: FormEvent) => {
    event.preventDefault()
    const cleanSubject = ticketSubject.trim()
    const cleanDesc = ticketDescription.trim()
    if (!cleanSubject || !cleanDesc) {
      toast.warning('Captura el asunto y la descripción del caso para registrar tu ticket.', 'Datos requeridos')
      return
    }
    const maxNum = tickets.reduce((acc, item) => {
      const match = item.code.match(/(\d+)$/)
      return Math.max(acc, match ? Number(match[1]) : 100)
    }, 104)
    const nextCode = `SOP-2026-${maxNum + 1}`
    const stamp = formatNowShort()
    const newTicket: SupportTicketRecord = {
      id: `tkt-${Date.now()}`,
      code: nextCode,
      subject: cleanSubject,
      moduleName: ticketModule,
      priority: ticketPriority,
      status: 'Abierto',
      requesterName: activeUserName,
      createdAt: stamp,
      updatedAt: stamp,
      description: cleanDesc,
      notes: [],
    }
    const nextTickets = [newTicket, ...tickets]
    setTickets(nextTickets)
    saveStoredHelpTickets(nextTickets)
    setTicketSubject('')
    setTicketDescription('')
    setTicketFilter('Todos')
    onAuditTicket?.(
      `Creación de ticket de soporte ${nextCode}`,
      `${cleanSubject} · Módulo: ${ticketModule} · Prioridad: ${ticketPriority}`
    )
    toast.success(`Ticket ${nextCode} registrado en la mesa de ayuda.`, 'Solicitud enviada')
  }

  const handleChangeTicketStatus = (ticketId: string, nextStatus: TicketStatus) => {
    const stamp = formatNowShort()
    const target = tickets.find((t) => t.id === ticketId)
    const nextTickets = tickets.map((t) =>
      t.id === ticketId ? { ...t, status: nextStatus, updatedAt: stamp } : t
    )
    setTickets(nextTickets)
    saveStoredHelpTickets(nextTickets)
    if (target) {
      onAuditTicket?.(
        `Actualización de ticket ${target.code} a ${nextStatus}`,
        target.subject
      )
    }
    toast.info(`Ticket actualizado a "${nextStatus}".`, 'Mesa de ayuda')
  }

  const handleAddTicketNote = (ticketId: string) => {
    const text = (noteDrafts[ticketId] ?? '').trim()
    if (!text) return
    const stamp = formatNowShort()
    const nextTickets = tickets.map((t) =>
      t.id === ticketId
        ? {
            ...t,
            updatedAt: stamp,
            notes: [
              ...t.notes,
              {
                id: `note-${Date.now()}`,
                author: activeUserName,
                date: stamp,
                message: text,
              },
            ],
          }
        : t
    )
    setTickets(nextTickets)
    saveStoredHelpTickets(nextTickets)
    setNoteDrafts((prev) => ({ ...prev, [ticketId]: '' }))
    toast.success('Comentario agregado al seguimiento del ticket.', 'Soporte interno')
  }

  const tabCountFor = (tab: HelpCenterTab): number => {
    if (tab === 'Guías por módulo') return filteredArticles.length
    if (tab === 'Flujos del sistema') return filteredWorkflows.length
    if (tab === 'Preguntas frecuentes') return filteredFaqs.length
    if (tab === 'Glosario y referencia') return filteredGlossary.length
    return openTicketsCount
  }

  const activeCategoryObj = activeArticle
    ? HELP_CATEGORIES.find((c) => c.id === activeArticle.categoryId)
    : undefined

  return (
    <section className="help-center-page" aria-labelledby="help-center-title">
      <div className="crm-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" /> AES NEXUS · DOCUMENTACIÓN Y SOPORTE OPERATIVO
          </div>
          <h1 id="help-center-title">Centro de ayuda</h1>
          <p>
            Guías paso a paso, flujos interconectados entre módulos, diccionario fiscal y mesa de tickets para{' '}
            <span>{activeUserName}</span> ({activeUserSubtitle}).
          </p>
        </div>

        <div className="help-heading-actions">
          <div className="help-search-box" role="search" aria-label="Buscar en el Centro de ayuda">
            <Search size={15} />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar guías, CLABE, EBP, 80%, P&L, RMA o tickets..."
              aria-label="Buscar documentación o preguntas"
            />
            {searchQuery && (
              <button
                type="button"
                className="help-search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Limpiar búsqueda"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => setActiveTab('Soporte y tickets')}
          >
            <LifeBuoy size={14} /> Abrir ticket ({openTicketsCount})
          </button>
        </div>
      </div>

      {hasSearchQuery && (
        <div className="help-search-meta" role="status" aria-live="polite">
          <span>
            Resultados para <strong>“{searchQuery.trim()}”</strong>
          </span>
          <span className="help-meta-sep">·</span>
          <span className="tabular-nums">{filteredArticles.length} guías</span>
          <span className="help-meta-sep">·</span>
          <span className="tabular-nums">{filteredWorkflows.length} flujos</span>
          <span className="help-meta-sep">·</span>
          <button
            type="button"
            className="help-meta-jump-btn tabular-nums"
            onClick={() => setActiveTab('Preguntas frecuentes')}
          >
            {faqsMatchingKeywords.length} preguntas frecuentes
          </button>
          <span className="help-meta-sep">·</span>
          <span className="tabular-nums">{filteredGlossary.length} términos</span>
        </div>
      )}

      <nav className="crm-tabs" aria-label="Secciones del Centro de ayuda">
        {HELP_CENTER_TABS.map((tab) => {
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              type="button"
              className={isActive ? 'active' : ''}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => setActiveTab(tab)}
            >
              {tab} <span className="tabular-nums">{tabCountFor(tab)}</span>
            </button>
          )
        })}
      </nav>

      {/* TAB 1: GUÍAS POR MÓDULO */}
      {activeTab === 'Guías por módulo' && (
        <div className="help-guides-layout">
          <aside className="help-guides-sidebar" aria-label="Categorías y guías operativas">
            <div className="help-category-strip" role="group" aria-label="Filtrar por área">
              <button
                type="button"
                className={`help-filter-btn ${selectedCategoryId === 'all' ? 'active' : ''}`}
                aria-pressed={selectedCategoryId === 'all'}
                onClick={() => setSelectedCategoryId('all')}
              >
                Todas las áreas ({HELP_ARTICLES.length})
              </button>
              {HELP_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`help-filter-btn ${selectedCategoryId === cat.id ? 'active' : ''}`}
                  aria-pressed={selectedCategoryId === cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                >
                  {cat.moduleLabel}
                </button>
              ))}
            </div>

            <div className="help-article-list">
              {filteredArticles.length === 0 ? (
                <div className="help-empty-box">
                  <BookOpen size={18} />
                  <strong>Sin guías coincidentes</strong>
                  <p>Prueba otra palabra clave o selecciona “Todas las áreas”.</p>
                </div>
              ) : (
                filteredArticles.map((article) => {
                  const cat = HELP_CATEGORIES.find((c) => c.id === article.categoryId)
                  const isSelected = activeArticle?.id === article.id
                  return (
                    <button
                      key={article.id}
                      type="button"
                      className={`help-article-nav-item ${isSelected ? 'active' : ''}`}
                      aria-current={isSelected ? 'true' : undefined}
                      onClick={() => setSelectedArticleId(article.id)}
                    >
                      <div className="help-article-nav-meta">
                        <span>{cat?.moduleLabel ?? 'ERP'}</span>
                        <span className="tabular-nums">
                          <Clock3 size={11} /> {article.readTimeMin} min
                        </span>
                      </div>
                      <strong>{article.title}</strong>
                      <p>{article.summary}</p>
                    </button>
                  )
                })
              )}
            </div>
          </aside>

          <article className="help-article-reader" aria-live="polite">
            {activeArticle ? (
              <>
                <header className="help-reader-header">
                  <div className="help-reader-kicker">
                    <span>{activeCategoryObj?.title ?? 'Guía operativa'}</span>
                    <span className="help-meta-sep">·</span>
                    <span className="tabular-nums">Lectura {activeArticle.readTimeMin} min</span>
                    <span className="help-meta-sep">·</span>
                    <span>Actualizado {activeArticle.updatedAt}</span>
                  </div>
                  <h2>{activeArticle.title}</h2>
                  <p className="help-reader-summary">{activeArticle.summary}</p>
                  <div className="help-reader-cta-row">
                    <button
                      type="button"
                      className="button button-primary"
                      onClick={() => onNavigateTarget(activeArticle.target)}
                    >
                      Abrir {activeArticle.targetLabel} <ArrowRight size={14} />
                    </button>
                  </div>
                </header>

                {activeArticle.prerequisites.length > 0 && (
                  <section className="help-reader-block">
                    <h3>Requisitos previos</h3>
                    <ul className="help-check-list">
                      {activeArticle.prerequisites.map((req) => (
                        <li key={req}>
                          <CheckCircle2 size={14} />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <section className="help-reader-block">
                  <h3>Procedimiento paso a paso</h3>
                  <ol className="help-steps-list">
                    {activeArticle.steps.map((step, index) => (
                      <li key={step.title} className="help-step-item">
                        <span className="help-step-num tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                        <div className="help-step-copy">
                          <strong>{step.title}</strong>
                          <p>{step.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>

                <section className="help-reader-block help-validation-box">
                  <h3>Controles y validaciones del sistema</h3>
                  <ul className="help-bullet-list">
                    {activeArticle.validations.map((val) => (
                      <li key={val}>{val}</li>
                    ))}
                  </ul>
                </section>

                <footer className="help-reader-footer">
                  <div className="help-feedback-row">
                    <span>¿Te resultó útil esta guía?</span>
                    <div className="help-feedback-actions">
                      <button
                        type="button"
                        className={`help-feedback-btn ${feedbackMap[activeArticle.id] === 'up' ? 'active-up' : ''}`}
                        aria-pressed={feedbackMap[activeArticle.id] === 'up'}
                        onClick={() => handleToggleFeedback(activeArticle.id, 'up')}
                      >
                        <ThumbsUp size={13} /> Sí, clara
                      </button>
                      <button
                        type="button"
                        className={`help-feedback-btn ${feedbackMap[activeArticle.id] === 'down' ? 'active-down' : ''}`}
                        aria-pressed={feedbackMap[activeArticle.id] === 'down'}
                        onClick={() => handleToggleFeedback(activeArticle.id, 'down')}
                      >
                        <ThumbsDown size={13} /> Falta detalle
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="button button-ghost button-sm"
                    onClick={() => {
                      setTicketModule(
                        SUPPORT_MODULE_OPTIONS.find((m) =>
                          m.toLowerCase().includes(activeArticle.target.page.toLowerCase())
                        ) ?? SUPPORT_MODULE_OPTIONS[0]
                      )
                      setTicketSubject(`Consulta sobre: ${activeArticle.title}`)
                      setActiveTab('Soporte y tickets')
                    }}
                  >
                    <MessageSquarePlus size={13} /> Reportar duda sobre este proceso
                  </button>
                </footer>
              </>
            ) : (
              <div className="help-empty-box help-empty-reader">
                <FileText size={24} />
                <strong>Selecciona o ajusta tu búsqueda para leer una guía</strong>
                <p>Las guías operativas detallan requisitos, pasos numerados y accesos directos.</p>
              </div>
            )}
          </article>
        </div>
      )}

      {/* TAB 2: FLUJOS DEL SISTEMA */}
      {activeTab === 'Flujos del sistema' && (
        <div className="help-workflows-grid">
          {filteredWorkflows.length === 0 ? (
            <div className="help-empty-box">
              <GitBranch size={20} />
              <strong>No hay flujos que coincidan con tu búsqueda</strong>
              <p>Limpia el buscador para revisar los 4 procesos integrados del ERP.</p>
            </div>
          ) : (
            filteredWorkflows.map((wf) => (
              <article key={wf.id} className="help-workflow-card">
                <header className="help-workflow-header">
                  <div>
                    <div className="help-workflow-meta">
                      <span className="tabular-nums">{wf.code}</span>
                      <span className="help-meta-sep">·</span>
                      <span>{wf.domain}</span>
                      <span className="help-meta-sep">·</span>
                      <span className="tabular-nums">{wf.steps.length} etapas</span>
                    </div>
                    <h2>{wf.title}</h2>
                    <p>{wf.description}</p>
                  </div>
                  <div className="help-workflow-outcome">
                    <small>RESULTADO ESPERADO</small>
                    <strong>{wf.outcome}</strong>
                  </div>
                </header>

                <div className="help-workflow-steps">
                  {wf.steps.map((step) => (
                    <button
                      key={`${wf.id}-${step.stepNumber}`}
                      type="button"
                      className="help-workflow-step-btn"
                      onClick={() => onNavigateTarget(step.target)}
                      title={`Abrir ${step.moduleName}`}
                    >
                      <div className="help-workflow-step-top">
                        <span className="help-step-num tabular-nums">
                          {String(step.stepNumber).padStart(2, '0')}
                        </span>
                        <span className="help-workflow-module">{step.moduleName}</span>
                        <ArrowRight size={13} className="help-workflow-arrow" />
                      </div>
                      <strong>{step.actionTitle}</strong>
                      <p>{step.detail}</p>
                    </button>
                  ))}
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {/* TAB 3: PREGUNTAS FRECUENTES */}
      {activeTab === 'Preguntas frecuentes' && (
        <div className="help-faq-section">
          <div className="help-faq-controls-panel">
            <div className="help-faq-search-row">
              <div className="help-faq-search-input-wrap" role="search" aria-label="Buscar preguntas frecuentes por palabras clave">
                <Search size={15} />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrar preguntas frecuentes por palabras clave (ej. CLABE, cotización, EBP, 95%, nómina)..."
                  aria-label="Filtrar preguntas frecuentes por palabras clave"
                />
                {hasSearchQuery && (
                  <button
                    type="button"
                    className="help-search-clear"
                    onClick={() => setSearchQuery('')}
                    aria-label="Limpiar palabras clave"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="help-faq-quick-keywords" aria-label="Búsquedas rápidas sugeridas">
                <span className="help-quick-label">Sugeridas:</span>
                {FAQ_QUICK_KEYWORDS.map((kw) => {
                  const isActiveKw = normalizeSearchText(searchQuery.trim()) === normalizeSearchText(kw)
                  return (
                    <button
                      key={kw}
                      type="button"
                      className={`help-quick-keyword-btn ${isActiveKw ? 'active' : ''}`}
                      aria-pressed={isActiveKw}
                      onClick={() => setSearchQuery(isActiveKw ? '' : kw)}
                    >
                      {kw}
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                className={`help-filter-btn help-advanced-toggle-btn ${
                  showAdvancedFaqFilters || activeAdvancedFaqFilterCount > 0 ? 'active' : ''
                }`}
                aria-expanded={showAdvancedFaqFilters}
                aria-controls="help-faq-advanced-panel"
                onClick={() => setShowAdvancedFaqFilters((prev) => !prev)}
              >
                <SlidersHorizontal size={13} />
                <span>Filtros avanzados</span>
                {activeAdvancedFaqFilterCount > 0 && (
                  <span className="help-filter-count tabular-nums">
                    ({activeAdvancedFaqFilterCount})
                  </span>
                )}
              </button>
            </div>

            <div className="help-category-strip" role="group" aria-label="Filtrar preguntas frecuentes por módulo">
              {HELP_FAQ_MODULES.map((mod) => {
                const count = faqCountByModule[mod] ?? 0
                const modSlug =
                  mod === 'CRM'
                    ? 'crm'
                    : mod === 'Ventas'
                    ? 'ventas'
                    : mod === 'Finanzas'
                    ? 'finanzas'
                    : mod === 'Gastos'
                    ? 'gastos'
                    : mod === 'Compras y Operaciones'
                    ? 'operaciones'
                    : mod === 'Reportes'
                    ? 'reportes'
                    : mod === 'Administración y RBAC'
                    ? 'admin'
                    : 'all'
                return (
                  <button
                    key={mod}
                    type="button"
                    className={`help-filter-btn ${faqModuleFilter === mod ? 'active' : ''}`}
                    aria-pressed={faqModuleFilter === mod}
                    onClick={() => setFaqModuleFilter(mod)}
                  >
                    {mod !== 'Todos' && <span className={`help-tag-dot mod-${modSlug}`} aria-hidden="true" />}
                    <span>{mod}</span>
                    <span className="help-filter-count tabular-nums">({count})</span>
                  </button>
                )
              })}
            </div>

            {showAdvancedFaqFilters && (
              <div
                id="help-faq-advanced-panel"
                className="help-faq-advanced-panel"
                role="region"
                aria-label="Filtros avanzados por categoría visual, complejidad y formato"
              >
                <div className="help-faq-advanced-group">
                  <div className="help-faq-advanced-label">
                    <strong>Categoría visual temática</strong>
                    <small>Agrupa preguntas frecuentes según su tipo de operación en el ERP</small>
                  </div>
                  <div className="help-category-strip" role="group" aria-label="Filtrar por categoría visual">
                    {HELP_FAQ_VISUAL_CATEGORIES.map((vCat) => {
                      const count = faqCountByVisualCategory[vCat] ?? 0
                      const isSelected = faqVisualCategoryFilter === vCat
                      return (
                        <button
                          key={vCat}
                          type="button"
                          className={`help-filter-btn ${isSelected ? 'active' : ''}`}
                          aria-pressed={isSelected}
                          onClick={() => setFaqVisualCategoryFilter(vCat)}
                        >
                          {vCat}{' '}
                          <span className="help-filter-count tabular-nums">({count})</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="help-faq-advanced-grid">
                  <div className="help-faq-advanced-group">
                    <div className="help-faq-advanced-label">
                      <strong>Complejidad de configuración / Nivel de usuario</strong>
                      <small>
                        {HELP_FAQ_COMPLEXITY_LEVELS.find((lvl) => lvl.value === faqComplexityFilter)?.hint}
                      </small>
                    </div>
                    <div className="help-category-strip" role="group" aria-label="Filtrar por nivel de usuario">
                      {HELP_FAQ_COMPLEXITY_LEVELS.map((lvl) => {
                        const count = faqCountByComplexity[lvl.value] ?? 0
                        const isSelected = faqComplexityFilter === lvl.value
                        return (
                          <button
                            key={lvl.value}
                            type="button"
                            className={`help-filter-btn ${isSelected ? 'active' : ''}`}
                            aria-pressed={isSelected}
                            title={lvl.hint}
                            onClick={() => setFaqComplexityFilter(lvl.value)}
                          >
                            {lvl.value}{' '}
                            <span className="help-filter-count tabular-nums">({count})</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="help-faq-advanced-group">
                    <div className="help-faq-advanced-label">
                      <strong>Formato de guía</strong>
                      <small>Segmenta respuestas según el nivel de detalle requerido</small>
                    </div>
                    <div className="help-category-strip" role="group" aria-label="Filtrar por formato de guía">
                      {HELP_FAQ_FORMATS.map((fmt) => {
                        const count = faqCountByFormat[fmt] ?? 0
                        const isSelected = faqFormatFilter === fmt
                        return (
                          <button
                            key={fmt}
                            type="button"
                            className={`help-filter-btn ${isSelected ? 'active' : ''}`}
                            aria-pressed={isSelected}
                            onClick={() => setFaqFormatFilter(fmt)}
                          >
                            {fmt}{' '}
                            <span className="help-filter-count tabular-nums">({count})</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {activeAdvancedFaqFilterCount > 0 && (
                  <div className="help-faq-advanced-footer">
                    <button
                      type="button"
                      className="button button-ghost button-sm"
                      onClick={() => {
                        setFaqVisualCategoryFilter('Todas')
                        setFaqComplexityFilter('Todos')
                        setFaqFormatFilter('Todas')
                      }}
                    >
                      <RotateCcw size={12} /> Restablecer filtros avanzados
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="help-faq-toolbar">
              <div className="help-faq-summary-line">
                <strong className="tabular-nums">{filteredFaqs.length}</strong>{' '}
                <span>{filteredFaqs.length === 1 ? 'pregunta disponible' : 'preguntas disponibles'}</span>
                {faqModuleFilter !== 'Todos' && (
                  <>
                    <span className="help-meta-sep">·</span>
                    <span>Módulo: <strong>{faqModuleFilter}</strong></span>
                  </>
                )}
                {faqVisualCategoryFilter !== 'Todas' && (
                  <>
                    <span className="help-meta-sep">·</span>
                    <span>Categoría: <strong>{faqVisualCategoryFilter}</strong></span>
                  </>
                )}
                {faqComplexityFilter !== 'Todos' && (
                  <>
                    <span className="help-meta-sep">·</span>
                    <span>Nivel: <strong>{faqComplexityFilter}</strong></span>
                  </>
                )}
                {faqFormatFilter !== 'Todas' && (
                  <>
                    <span className="help-meta-sep">·</span>
                    <span>Formato: <strong>{faqFormatFilter}</strong></span>
                  </>
                )}
                {hasSearchQuery && (
                  <>
                    <span className="help-meta-sep">·</span>
                    <span>Palabras clave: <strong>“{searchQuery.trim()}”</strong></span>
                  </>
                )}
                <span className="help-meta-sep">·</span>
                <span className="tabular-nums">{expandedVisibleFaqCount} expandidas</span>
              </div>
              {filteredFaqs.length > 0 && (
                <div className="help-faq-bulk-actions">
                  <button
                    type="button"
                    className="button button-ghost button-sm"
                    onClick={handleExpandAllVisibleFaqs}
                    disabled={expandedVisibleFaqCount === filteredFaqs.length}
                  >
                    Expandir todas
                  </button>
                  <button
                    type="button"
                    className="button button-ghost button-sm"
                    onClick={handleCollapseAllVisibleFaqs}
                    disabled={expandedVisibleFaqCount === 0}
                  >
                    Contraer todas
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="help-faq-list">
            {filteredFaqs.length === 0 ? (
              <div className="help-empty-box">
                <CircleHelp size={20} />
                <strong>
                  Sin preguntas coincidentes
                  {faqModuleFilter !== 'Todos' ? ` en ${faqModuleFilter}` : ''}
                  {faqComplexityFilter !== 'Todos' ? ` · Nivel ${faqComplexityFilter}` : ''}
                </strong>
                <p>Ajusta la palabra clave, la categoría visual o cambia el módulo para ampliar los resultados.</p>
                <div className="help-empty-actions">
                  {hasSearchQuery && (
                    <button
                      type="button"
                      className="button button-secondary button-sm"
                      onClick={() => setSearchQuery('')}
                    >
                      Limpiar búsqueda
                    </button>
                  )}
                  {faqModuleFilter !== 'Todos' && (
                    <button
                      type="button"
                      className="button button-secondary button-sm"
                      onClick={() => setFaqModuleFilter('Todos')}
                    >
                      Ver todos los módulos
                    </button>
                  )}
                  {activeAdvancedFaqFilterCount > 0 && (
                    <button
                      type="button"
                      className="button button-secondary button-sm"
                      onClick={() => {
                        setFaqVisualCategoryFilter('Todas')
                        setFaqComplexityFilter('Todos')
                        setFaqFormatFilter('Todas')
                      }}
                    >
                      Restablecer filtros avanzados
                    </button>
                  )}
                </div>
              </div>
            ) : (
              filteredFaqs.map((faq) => {
                const isOpen = Boolean(openFaqIds[faq.id])
                const panelId = `faq-panel-${faq.id}`
                const faqVote = feedbackMap[faq.id]
                const matchesOnlyInAnswer =
                  hasSearchQuery &&
                  !matchesSearchTokens(faq.question, searchTokens) &&
                  matchesSearchTokens(`${faq.answer} ${(faq.quickSteps ?? []).join(' ')}`, searchTokens)
                const levelSlug =
                  faq.complexity === 'Básico'
                    ? 'basico'
                    : faq.complexity === 'Intermedio'
                    ? 'intermedio'
                    : 'avanzado'
                const modSlug =
                  faq.moduleTag === 'CRM'
                    ? 'crm'
                    : faq.moduleTag === 'Ventas'
                    ? 'ventas'
                    : faq.moduleTag === 'Finanzas'
                    ? 'finanzas'
                    : faq.moduleTag === 'Gastos'
                    ? 'gastos'
                    : faq.moduleTag === 'Compras y Operaciones'
                    ? 'operaciones'
                    : faq.moduleTag === 'Reportes'
                    ? 'reportes'
                    : 'admin'
                const vCatSlug =
                  faq.visualCategory === 'Bancario y EBP'
                    ? 'bancario'
                    : faq.visualCategory === 'Flujo comercial'
                    ? 'comercial'
                    : faq.visualCategory === 'Control y alertas'
                    ? 'control'
                    : faq.visualCategory === 'Contabilidad y P&L'
                    ? 'contabilidad'
                    : faq.visualCategory === 'Seguridad y RBAC'
                    ? 'rbac'
                    : 'operacion'

                return (
                  <div key={faq.id} className={`help-faq-item ${isOpen ? 'open' : ''}`}>
                    <button
                      type="button"
                      className="help-faq-trigger"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => handleToggleFaq(faq.id)}
                    >
                      <div className="help-faq-trigger-copy">
                        <div className="help-faq-card-tags">
                          <span className={`help-tag-badge mod-${modSlug}`}>
                            <span className={`help-tag-dot mod-${modSlug}`} aria-hidden="true" />
                            {faq.moduleTag}
                          </span>
                          <span className={`help-tag-badge cat-${vCatSlug}`}>
                            {faq.visualCategory}
                          </span>
                          <span className={`help-faq-level-label level-${levelSlug}`}>
                            · Nivel {faq.complexity}
                          </span>
                          {matchesOnlyInAnswer && !isOpen && (
                            <span className="help-faq-answer-match-hint">
                              · Coincidencia en la respuesta
                            </span>
                          )}
                        </div>
                        <strong>{renderHighlightedText(faq.question, searchTokens)}</strong>
                      </div>
                      <ChevronDown size={16} className="help-faq-chevron" />
                    </button>
                    {isOpen && (
                      <div id={panelId} className="help-faq-body" role="region" aria-label={faq.question}>
                        <div className="help-faq-topic-tags-bar" aria-label="Etiquetas del artículo">
                          {faq.tags.map((topicTag) => (
                            <button
                              key={topicTag}
                              type="button"
                              className="help-topic-tag-btn"
                              title={`Filtrar preguntas relacionadas con "${topicTag}"`}
                              onClick={() => setSearchQuery(topicTag)}
                            >
                              #{topicTag}
                            </button>
                          ))}
                          <button
                            type="button"
                            className="help-topic-tag-btn is-module-filter"
                            title={`Filtrar todas las preguntas de ${faq.moduleTag}`}
                            onClick={() => setFaqModuleFilter(faq.moduleTag)}
                          >
                            Filtrar módulo: {faq.moduleTag}
                          </button>
                          <button
                            type="button"
                            className="help-topic-tag-btn"
                            title={`Filtrar por categoría ${faq.visualCategory}`}
                            onClick={() => setFaqVisualCategoryFilter(faq.visualCategory)}
                          >
                            Categoría: {faq.visualCategory}
                          </button>
                        </div>
                        <p>{renderHighlightedText(faq.answer, searchTokens)}</p>
                        {faq.quickSteps && faq.quickSteps.length > 0 && (
                          <ul className="help-faq-steps">
                            {faq.quickSteps.map((step, idx) => (
                              <li key={step}>
                                <span className="tabular-nums">{idx + 1}.</span>
                                <span>{renderHighlightedText(step, searchTokens)}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="help-faq-body-footer">
                          <div className="help-faq-body-links">
                            {faq.relatedTarget && (
                              <button
                                type="button"
                                className="button button-secondary button-sm"
                                onClick={() => onNavigateTarget(faq.relatedTarget!)}
                              >
                                {faq.relatedLabel ?? `Ir a ${faq.moduleTag}`} <ArrowRight size={13} />
                              </button>
                            )}
                            <button
                              type="button"
                              className="button button-ghost button-sm"
                              onClick={() => {
                                setTicketModule(
                                  SUPPORT_MODULE_OPTIONS.find((m) =>
                                    m.toLowerCase().includes(faq.moduleTag.split(' ')[0].toLowerCase())
                                  ) ?? SUPPORT_MODULE_OPTIONS[0]
                                )
                                setTicketSubject(`Duda FAQ: ${faq.question}`)
                                setActiveTab('Soporte y tickets')
                              }}
                            >
                              <MessageSquarePlus size={13} /> Consultar con soporte
                            </button>
                          </div>

                          <div className="help-feedback-actions">
                            <button
                              type="button"
                              className={`help-feedback-btn ${faqVote === 'up' ? 'active-up' : ''}`}
                              aria-pressed={faqVote === 'up'}
                              onClick={() => handleToggleFeedback(faq.id, 'up')}
                            >
                              <ThumbsUp size={12} /> Útil
                            </button>
                            <button
                              type="button"
                              className={`help-feedback-btn ${faqVote === 'down' ? 'active-down' : ''}`}
                              aria-pressed={faqVote === 'down'}
                              onClick={() => handleToggleFeedback(faq.id, 'down')}
                            >
                              <ThumbsDown size={12} /> Mejorar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 4: GLOSARIO Y REFERENCIA */}
      {activeTab === 'Glosario y referencia' && (
        <div className="help-glossary-section">
          <div className="help-category-strip" role="group" aria-label="Filtrar glosario por dominio">
            {GLOSSARY_DOMAINS.map((dom) => (
              <button
                key={dom}
                type="button"
                className={`help-filter-btn ${glossaryDomain === dom ? 'active' : ''}`}
                aria-pressed={glossaryDomain === dom}
                onClick={() => setGlossaryDomain(dom)}
              >
                {dom}
              </button>
            ))}
          </div>

          <div className="help-glossary-table-wrap">
            <table className="data-table help-glossary-table">
              <thead>
                <tr>
                  <th>Concepto / Término</th>
                  <th>Dominio</th>
                  <th>Fórmula o Regla de validación</th>
                  <th>Definición operativa en AES Nexus</th>
                </tr>
              </thead>
              <tbody>
                {filteredGlossary.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="help-table-empty">
                      No se encontraron términos que coincidan con el filtro aplicado.
                    </td>
                  </tr>
                ) : (
                  filteredGlossary.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.term}</strong>
                      </td>
                      <td className="help-glossary-domain">{item.domain}</td>
                      <td className="tabular-nums help-glossary-rule">{item.formulaOrRule}</td>
                      <td>{item.definition}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: SOPORTE Y TICKETS */}
      {activeTab === 'Soporte y tickets' && (
        <div className="help-support-layout">
          <form className="help-ticket-form panel" onSubmit={handleSubmitTicket}>
            <div className="help-form-header">
              <div className="panel-kicker">MESA DE AYUDA INTERNA</div>
              <h2>Registrar nuevo ticket</h2>
              <p>
                Documenta incidencias operativas, dudas fiscales o solicitudes de permisos. El caso quedará guardado y enlazado al historial.
              </p>
            </div>

            <label className="help-field">
              <span>Asunto del caso</span>
              <input
                type="text"
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                placeholder="Ej. Error al timbrar nómina o duda en alerta 95%"
                required
              />
            </label>

            <div className="help-field-row">
              <label className="help-field">
                <span>Módulo relacionado</span>
                <select
                  value={ticketModule}
                  onChange={(e) => setTicketModule(e.target.value)}
                >
                  {SUPPORT_MODULE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>

              <label className="help-field">
                <span>Prioridad</span>
                <select
                  value={ticketPriority}
                  onChange={(e) => setTicketPriority(e.target.value as TicketPriority)}
                >
                  <option value="Baja">Baja</option>
                  <option value="Media">Media</option>
                  <option value="Alta">Alta</option>
                </select>
              </label>
            </div>

            <label className="help-field">
              <span>Descripción detallada</span>
              <textarea
                rows={4}
                value={ticketDescription}
                onChange={(e) => setTicketDescription(e.target.value)}
                placeholder="Describe folio, proveedor o paso exacto donde necesitas asistencia..."
                required
              />
            </label>

            <div className="help-form-footer">
              <small>Solicitante: {activeUserName}</small>
              <button type="submit" className="button button-primary">
                <Send size={13} /> Enviar ticket
              </button>
            </div>
          </form>

          <div className="help-ticket-queue">
            <div className="help-queue-toolbar">
              <div>
                <strong>Solicitudes registradas</strong>
                <span className="help-meta-sep">·</span>
                <span className="tabular-nums">{filteredTickets.length} visibles</span>
              </div>
              <div className="help-category-strip" role="group" aria-label="Filtrar tickets por estado">
                {(['Todos', 'Abiertos', 'Resueltos'] as const).map((statusTab) => (
                  <button
                    key={statusTab}
                    type="button"
                    className={`help-filter-btn ${ticketFilter === statusTab ? 'active' : ''}`}
                    aria-pressed={ticketFilter === statusTab}
                    onClick={() => setTicketFilter(statusTab)}
                  >
                    {statusTab}
                  </button>
                ))}
              </div>
            </div>

            <div className="help-ticket-list">
              {filteredTickets.length === 0 ? (
                <div className="help-empty-box">
                  <LifeBuoy size={20} />
                  <strong>No hay tickets en esta vista</strong>
                  <p>Crea un nuevo ticket en el formulario o cambia el filtro de estado.</p>
                </div>
              ) : (
                filteredTickets.map((ticket) => (
                  <article key={ticket.id} className="help-ticket-card">
                    <div className="help-ticket-top">
                      <div className="help-ticket-meta-line">
                        <strong className="help-ticket-code tabular-nums">{ticket.code}</strong>
                        <span className="help-meta-sep">·</span>
                        <span>{ticket.moduleName}</span>
                        <span className="help-meta-sep">·</span>
                        <span
                          className={`help-priority-text priority-${ticket.priority.toLowerCase()}`}
                        >
                          Prioridad {ticket.priority}
                        </span>
                      </div>
                      <span
                        className={`help-status-text status-${
                          ticket.status === 'Resuelto'
                            ? 'resolved'
                            : ticket.status === 'En revisión'
                            ? 'review'
                            : 'open'
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </div>

                    <h3>{ticket.subject}</h3>
                    <p className="help-ticket-desc">{ticket.description}</p>

                    <div className="help-ticket-submeta">
                      <span>Por {ticket.requesterName}</span>
                      <span className="help-meta-sep">·</span>
                      <span className="tabular-nums">Creado {ticket.createdAt}</span>
                      <span className="help-meta-sep">·</span>
                      <span className="tabular-nums">Actualizado {ticket.updatedAt}</span>
                    </div>

                    {ticket.notes.length > 0 && (
                      <div className="help-ticket-notes">
                        {ticket.notes.map((note) => (
                          <div key={note.id} className="help-ticket-note-item">
                            <div className="help-ticket-note-head">
                              <strong>{note.author}</strong>
                              <span className="tabular-nums">{note.date}</span>
                            </div>
                            <p>{note.message}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="help-ticket-actions-row">
                      <div className="help-ticket-note-input-wrap">
                        <input
                          type="text"
                          value={noteDrafts[ticket.id] ?? ''}
                          onChange={(e) =>
                            setNoteDrafts((prev) => ({ ...prev, [ticket.id]: e.target.value }))
                          }
                          placeholder="Agregar nota de seguimiento..."
                          aria-label={`Agregar nota al ticket ${ticket.code}`}
                        />
                        <button
                          type="button"
                          className="button button-secondary button-sm"
                          onClick={() => handleAddTicketNote(ticket.id)}
                        >
                          Comentar
                        </button>
                      </div>
                      <div className="help-ticket-status-btns">
                        {ticket.status === 'Abierto' && (
                          <button
                            type="button"
                            className="button button-secondary button-sm"
                            onClick={() => handleChangeTicketStatus(ticket.id, 'En revisión')}
                          >
                            Pasar a revisión
                          </button>
                        )}
                        {ticket.status !== 'Resuelto' ? (
                          <button
                            type="button"
                            className="button button-primary button-sm"
                            onClick={() => handleChangeTicketStatus(ticket.id, 'Resuelto')}
                          >
                            Marcar resuelto
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="button button-secondary button-sm"
                            onClick={() => handleChangeTicketStatus(ticket.id, 'Abierto')}
                          >
                            Reabrir
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
