import { useMemo, useState } from 'react'
import {
  ArrowRight,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit3,
  ListTodo,
  Plus,
  Search,
  Send,
  Users,
} from 'lucide-react'
import {
  CRM_TODAY_ISO,
  type CrmActivity,
  type CrmActivityStatus,
} from '../data/dashboard'

interface CrmActivitiesSectionProps {
  activities: CrmActivity[]
  canCreate: boolean
  canEdit: boolean
  onOpenCreate: (presetDate?: string) => void
  onOpenEdit: (index: number, activity: CrmActivity) => void
  onToggleComplete: (index: number) => void
}

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTH_NAMES_ES = [
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

function parseIsoParts(iso: string): { year: number; month: number; day: number } {
  const [y, m, d] = iso.split('-').map(Number)
  return {
    year: Number.isFinite(y) ? y : 2026,
    month: Number.isFinite(m) ? m : 11,
    day: Number.isFinite(d) ? d : 24,
  }
}

function toIsoDate(year: number, monthIndex0: number, day: number): string {
  const dt = new Date(year, monthIndex0, day)
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const d = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatReadableDateEs(iso: string): string {
  const { year, month, day } = parseIsoParts(iso)
  const monthLabel = MONTH_NAMES_ES[(month - 1 + 12) % 12] || 'Noviembre'
  return `${String(day).padStart(2, '0')} de ${monthLabel.toLowerCase()} de ${year}`
}

function formatShortDayEs(iso: string): string {
  const { month, day } = parseIsoParts(iso)
  const shortMonths = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${String(day).padStart(2, '0')} ${shortMonths[(month - 1 + 12) % 12] || 'nov'}`
}

function getMondayStartIso(anchorIso: string): string {
  const { year, month, day } = parseIsoParts(anchorIso)
  const dt = new Date(year, month - 1, day)
  const weekday = (dt.getDay() + 6) % 7 // 0=Mon ... 6=Sun
  dt.setDate(dt.getDate() - weekday)
  return toIsoDate(dt.getFullYear(), dt.getMonth(), dt.getDate())
}

function addDaysIso(iso: string, offsetDays: number): string {
  const { year, month, day } = parseIsoParts(iso)
  const dt = new Date(year, month - 1, day + offsetDays)
  return toIsoDate(dt.getFullYear(), dt.getMonth(), dt.getDate())
}

function getActivityTypeLabel(icon: string): string {
  if (icon === 'send') return 'Envío / Correo'
  if (icon === 'phone') return 'Llamada'
  return 'Revisión / Tarea'
}

function renderActivityIcon(icon: string) {
  if (icon === 'send') return <Send size={14} />
  if (icon === 'phone') return <Clock3 size={14} />
  return <Users size={14} />
}

export function CrmActivitiesSection({
  activities,
  canCreate,
  canEdit,
  onOpenCreate,
  onOpenEdit,
  onToggleComplete,
}: CrmActivitiesSectionProps) {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [calendarScale, setCalendarScale] = useState<'month' | 'week'>('month')
  const [selectedDate, setSelectedDate] = useState<string>(CRM_TODAY_ISO)
  const [cursorMonth, setCursorMonth] = useState<{ year: number; month: number }>(() => {
    const p = parseIsoParts(CRM_TODAY_ISO)
    return { year: p.year, month: p.month - 1 }
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'Todas' | CrmActivityStatus>('Todas')
  const [typeFilter, setTypeFilter] = useState<'Todos' | 'send' | 'phone' | 'check'>('Todos')

  const indexedActivities = useMemo(() => {
    return activities
      .map((item, originalIndex) => ({ item, originalIndex }))
      .sort((a, b) => {
        const dA = a.item.date || CRM_TODAY_ISO
        const dB = b.item.date || CRM_TODAY_ISO
        if (dA !== dB) return dA.localeCompare(dB)
        return a.item.time.localeCompare(b.item.time)
      })
  }, [activities])

  const filteredActivities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return indexedActivities.filter(({ item }) => {
      if (statusFilter !== 'Todas' && item.status !== statusFilter) return false
      if (typeFilter !== 'Todos' && item.icon !== typeFilter) return false
      if (!q) return true
      const hay = `${item.title} ${item.company} ${item.owner || ''} ${item.notes || ''} ${item.date || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [indexedActivities, searchQuery, statusFilter, typeFilter])

  const activitiesByDate = useMemo(() => {
    const map = new Map<string, Array<{ item: CrmActivity; originalIndex: number }>>()
    for (const entry of filteredActivities) {
      const dateKey = entry.item.date || CRM_TODAY_ISO
      const existing = map.get(dateKey) || []
      existing.push(entry)
      map.set(dateKey, existing)
    }
    return map
  }, [filteredActivities])

  const kpiMetrics = useMemo(() => {
    const weekStart = getMondayStartIso(CRM_TODAY_ISO)
    const weekEnd = addDaysIso(weekStart, 6)
    let todayCount = 0
    let pendingCount = 0
    let completedCount = 0
    let thisWeekCount = 0

    for (const item of activities) {
      const dt = item.date || CRM_TODAY_ISO
      if (dt === CRM_TODAY_ISO) todayCount += 1
      if (dt >= weekStart && dt <= weekEnd) thisWeekCount += 1
      if (item.status === 'Completada') completedCount += 1
      else pendingCount += 1
    }

    return {
      total: activities.length,
      todayCount,
      pendingCount,
      completedCount,
      thisWeekCount,
    }
  }, [activities])

  // 42-cell calendar matrix starting Monday
  const monthCells = useMemo(() => {
    const firstOfMonth = new Date(cursorMonth.year, cursorMonth.month, 1)
    const startOffset = (firstOfMonth.getDay() + 6) % 7
    const gridStart = new Date(cursorMonth.year, cursorMonth.month, 1 - startOffset)
    const cells: Array<{ iso: string; dayNumber: number; inCurrentMonth: boolean }> = []
    for (let i = 0; i < 42; i++) {
      const cellDate = new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + i
      )
      cells.push({
        iso: toIsoDate(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate()),
        dayNumber: cellDate.getDate(),
        inCurrentMonth: cellDate.getMonth() === cursorMonth.month,
      })
    }
    return cells
  }, [cursorMonth])

  const weekDays = useMemo(() => {
    const mondayIso = getMondayStartIso(selectedDate)
    return Array.from({ length: 7 }, (_, i) => {
      const iso = addDaysIso(mondayIso, i)
      const { day } = parseIsoParts(iso)
      return {
        iso,
        weekdayLabel: WEEKDAY_LABELS[i],
        dayNumber: day,
      }
    })
  }, [selectedDate])

  const selectedDayItems = activitiesByDate.get(selectedDate) || []

  const handleShiftPeriod = (direction: -1 | 1) => {
    if (calendarScale === 'month') {
      const next = new Date(cursorMonth.year, cursorMonth.month + direction, 1)
      setCursorMonth({ year: next.getFullYear(), month: next.getMonth() })
    } else {
      const shifted = addDaysIso(selectedDate, direction * 7)
      setSelectedDate(shifted)
      const p = parseIsoParts(shifted)
      setCursorMonth({ year: p.year, month: p.month - 1 })
    }
  }

  const handleJumpToday = () => {
    setSelectedDate(CRM_TODAY_ISO)
    const p = parseIsoParts(CRM_TODAY_ISO)
    setCursorMonth({ year: p.year, month: p.month - 1 })
  }

  const activeMonthTitle = `${MONTH_NAMES_ES[cursorMonth.month]} ${cursorMonth.year}`
  const weekRangeLabel = `${formatShortDayEs(weekDays[0].iso)} – ${formatShortDayEs(weekDays[6].iso)}`

  return (
    <>
      <div className="crm-section-heading">
        <div>
          <div className="panel-kicker">AGENDA COMERCIAL</div>
          <h2>Actividades</h2>
          <p>
            Reúne llamadas, envíos y reuniones de seguimiento con agenda diaria y calendario interactivo.
          </p>
        </div>
        <div className="crm-section-heading-actions">
          <div className="crm-act-view-switch" role="tablist" aria-label="Modo de vista de actividades">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'list'}
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
            >
              <ListTodo size={14} /> Lista
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'calendar'}
              className={viewMode === 'calendar' ? 'active' : ''}
              onClick={() => setViewMode('calendar')}
            >
              <Calendar size={14} /> Calendario
            </button>
          </div>
          {canCreate && (
            <button
              type="button"
              className="button button-primary"
              onClick={() =>
                onOpenCreate(viewMode === 'calendar' ? selectedDate : CRM_TODAY_ISO)
              }
            >
              <Plus size={15} /> Nueva actividad
            </button>
          )}
        </div>
      </div>

      <div className="crm-act-kpi-strip">
        <article>
          <span>Actividades registradas</span>
          <strong className="mono">{kpiMetrics.total}</strong>
          <small>{kpiMetrics.thisWeekCount} en la semana actual</small>
        </article>
        <article>
          <span>Agenda de hoy</span>
          <strong className="mono">{kpiMetrics.todayCount}</strong>
          <small>{formatReadableDateEs(CRM_TODAY_ISO)}</small>
        </article>
        <article>
          <span>Pendientes</span>
          <strong className="mono">{kpiMetrics.pendingCount}</strong>
          <small>Requieren seguimiento</small>
        </article>
        <article>
          <span>Completadas</span>
          <strong className="mono">{kpiMetrics.completedCount}</strong>
          <small>Cerradas en historial</small>
        </article>
      </div>

      <div className="crm-act-toolbar">
        <label className="clients-search">
          <Search size={15} />
          <input
            aria-label="Buscar actividades"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por actividad, empresa, responsable o nota..."
          />
        </label>
        <div className="crm-act-toolbar-filters">
          <select
            aria-label="Filtrar por estado"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'Todas' | CrmActivityStatus)
            }
          >
            <option value="Todas">Estado: Todas</option>
            <option value="Pendiente">Pendientes</option>
            <option value="Completada">Completadas</option>
            <option value="Reprogramada">Reprogramadas</option>
          </select>
          <select
            aria-label="Filtrar por tipo"
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as 'Todos' | 'send' | 'phone' | 'check')
            }
          >
            <option value="Todos">Tipo: Todos</option>
            <option value="send">Envíos y propuestas</option>
            <option value="phone">Llamadas</option>
            <option value="check">Revisión y reuniones</option>
          </select>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="activities-layout">
          <div className="activities-card">
            <div className="activities-card-heading">
              <div>
                <h3>Agenda cronológica · {formatReadableDateEs(CRM_TODAY_ISO)}</h3>
                <p>
                  Mostrando {filteredActivities.length} de {activities.length} actividades programadas
                </p>
              </div>
              {canCreate && (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => onOpenCreate(CRM_TODAY_ISO)}
                >
                  <Plus size={14} /> Nueva actividad
                </button>
              )}
            </div>

            {filteredActivities.length === 0 ? (
              <div className="crm-act-empty">
                <CalendarDays size={20} />
                <strong>Sin actividades que coincidan con el filtro</strong>
                <p>Ajusta tu búsqueda o agenda una nueva tarea comercial.</p>
                {canCreate && (
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => onOpenCreate(CRM_TODAY_ISO)}
                  >
                    <Plus size={14} /> Agendar actividad
                  </button>
                )}
              </div>
            ) : (
              <div className="activities-list">
                {filteredActivities.map(({ item, originalIndex }) => {
                  const isDone = item.status === 'Completada'
                  return (
                    <article
                      className={`activity-item ${isDone ? 'is-completed' : ''}`}
                      key={item.id || `${item.title}-${item.time}-${originalIndex}`}
                    >
                      <button
                        type="button"
                        disabled={!canEdit}
                        className={`crm-act-check-btn ${isDone ? 'is-checked' : ''}`}
                        aria-label={
                          isDone
                            ? `Marcar "${item.title}" como pendiente`
                            : `Marcar "${item.title}" como completada`
                        }
                        title={
                          canEdit
                            ? isDone
                              ? 'Reabrir actividad'
                              : 'Marcar como completada'
                            : 'Solo lectura'
                        }
                        onClick={() => onToggleComplete(originalIndex)}
                      >
                        {isDone && <Check size={12} />}
                      </button>

                      <div className={`activity-icon tone-${item.tone}`}>
                        {renderActivityIcon(item.icon)}
                      </div>

                      <div className="activity-item-copy">
                        <strong>{item.title}</strong>
                        <span>
                          {item.company}
                          {item.owner ? ` · ${item.owner}` : ''} · {item.status}
                        </span>
                      </div>

                      <div className="crm-act-datetime mono">
                        <span>{formatShortDayEs(item.date || CRM_TODAY_ISO)}</span>
                        <time>{item.time}</time>
                      </div>

                      {canEdit && (
                        <button
                          type="button"
                          className="button-icon-action"
                          aria-label={`Editar actividad ${item.title}`}
                          title="Editar o eliminar actividad"
                          onClick={() => onOpenEdit(originalIndex, item)}
                        >
                          <Edit3 size={12} /> Editar
                        </button>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </div>

          <aside className="activities-side">
            <span className="kpi-icon">
              <CalendarDays size={17} />
            </span>
            <strong>{kpiMetrics.thisWeekCount} actividades</strong>
            <p>
              programadas esta semana ({kpiMetrics.pendingCount} pendientes)
            </p>
            <button
              type="button"
              className="text-link"
              onClick={() => setViewMode('calendar')}
            >
              Ver calendario <ArrowRight size={13} />
            </button>
          </aside>
        </div>
      ) : (
        <div className="crm-calendar-shell">
          <div className="crm-calendar-main">
            <div className="crm-calendar-header">
              <div className="crm-calendar-nav">
                <button
                  type="button"
                  className="crm-cal-nav-btn"
                  aria-label={calendarScale === 'month' ? 'Mes anterior' : 'Semana anterior'}
                  onClick={() => handleShiftPeriod(-1)}
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  type="button"
                  className="crm-cal-today-btn"
                  onClick={handleJumpToday}
                >
                  Hoy
                </button>
                <button
                  type="button"
                  className="crm-cal-nav-btn"
                  aria-label={calendarScale === 'month' ? 'Mes siguiente' : 'Semana siguiente'}
                  onClick={() => handleShiftPeriod(1)}
                >
                  <ChevronRight size={15} />
                </button>
                <h3>
                  {calendarScale === 'month'
                    ? activeMonthTitle
                    : `Semana ${weekRangeLabel}`}
                </h3>
              </div>

              <div className="crm-cal-scale-switch" role="tablist" aria-label="Escala del calendario">
                <button
                  type="button"
                  role="tab"
                  aria-selected={calendarScale === 'month'}
                  className={calendarScale === 'month' ? 'active' : ''}
                  onClick={() => setCalendarScale('month')}
                >
                  Mes
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={calendarScale === 'week'}
                  className={calendarScale === 'week' ? 'active' : ''}
                  onClick={() => setCalendarScale('week')}
                >
                  Semana
                </button>
              </div>
            </div>

            {calendarScale === 'month' ? (
              <div className="crm-cal-month-grid-wrap">
                <div className="crm-cal-weekdays">
                  {WEEKDAY_LABELS.map((dayName) => (
                    <div key={dayName} className="crm-cal-weekday">
                      {dayName}
                    </div>
                  ))}
                </div>
                <div className="crm-cal-month-grid">
                  {monthCells.map((cell) => {
                    const dayEvents = activitiesByDate.get(cell.iso) || []
                    const isToday = cell.iso === CRM_TODAY_ISO
                    const isSelected = cell.iso === selectedDate
                    return (
                      <div
                        key={cell.iso}
                        role="button"
                        tabIndex={0}
                        aria-label={`${formatReadableDateEs(cell.iso)}: ${dayEvents.length} actividades`}
                        className={`crm-cal-cell ${
                          !cell.inCurrentMonth ? 'is-outside' : ''
                        } ${isToday ? 'is-today' : ''} ${
                          isSelected ? 'is-selected' : ''
                        }`}
                        onClick={() => setSelectedDate(cell.iso)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setSelectedDate(cell.iso)
                          }
                        }}
                      >
                        <div className="crm-cal-cell-top">
                          <span className="crm-cal-day-num mono">{cell.dayNumber}</span>
                          {isToday && <span className="crm-cal-today-tag">Hoy</span>}
                        </div>
                        <div className="crm-cal-cell-events">
                          {dayEvents.slice(0, 3).map(({ item, originalIndex }) => (
                            <button
                              key={item.id || `${cell.iso}-${originalIndex}`}
                              type="button"
                              className={`crm-cal-event tone-${item.tone} ${
                                item.status === 'Completada' ? 'is-completed' : ''
                              }`}
                              title={`${item.time} · ${item.title} (${item.company})`}
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedDate(cell.iso)
                                if (canEdit) onOpenEdit(originalIndex, item)
                              }}
                            >
                              <span className="mono">{item.time}</span>
                              <span>{item.title}</span>
                            </button>
                          ))}
                          {dayEvents.length > 3 && (
                            <span className="crm-cal-more mono">
                              +{dayEvents.length - 3} más
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="crm-cal-week-grid">
                {weekDays.map((wd) => {
                  const dayEvents = activitiesByDate.get(wd.iso) || []
                  const isToday = wd.iso === CRM_TODAY_ISO
                  const isSelected = wd.iso === selectedDate
                  return (
                    <div
                      key={wd.iso}
                      className={`crm-cal-week-col ${isToday ? 'is-today' : ''} ${
                        isSelected ? 'is-selected' : ''
                      }`}
                    >
                      <button
                        type="button"
                        className="crm-cal-week-col-head"
                        onClick={() => setSelectedDate(wd.iso)}
                      >
                        <span>{wd.weekdayLabel}</span>
                        <strong className="mono">{wd.dayNumber}</strong>
                      </button>
                      <div className="crm-cal-week-col-body">
                        {dayEvents.length === 0 ? (
                          <div className="crm-cal-week-empty">Sin eventos</div>
                        ) : (
                          dayEvents.map(({ item, originalIndex }) => {
                            const isDone = item.status === 'Completada'
                            return (
                              <article
                                key={item.id || `${wd.iso}-${originalIndex}`}
                                className={`crm-cal-week-card tone-${item.tone} ${
                                  isDone ? 'is-completed' : ''
                                }`}
                              >
                                <div className="crm-cal-week-card-top">
                                  <time className="mono">{item.time}</time>
                                  {canEdit && (
                                    <button
                                      type="button"
                                      className={`crm-act-check-btn compact ${
                                        isDone ? 'is-checked' : ''
                                      }`}
                                      aria-label={`Completar ${item.title}`}
                                      onClick={() => onToggleComplete(originalIndex)}
                                    >
                                      {isDone && <Check size={10} />}
                                    </button>
                                  )}
                                </div>
                                <strong>{item.title}</strong>
                                <span>{item.company}</span>
                                {canEdit && (
                                  <button
                                    type="button"
                                    className="crm-cal-week-edit-link"
                                    onClick={() => onOpenEdit(originalIndex, item)}
                                  >
                                    Editar
                                  </button>
                                )}
                              </article>
                            )
                          })
                        )}
                      </div>
                      {canCreate && (
                        <button
                          type="button"
                          className="crm-cal-week-add-btn"
                          onClick={() => {
                            setSelectedDate(wd.iso)
                            onOpenCreate(wd.iso)
                          }}
                        >
                          <Plus size={12} /> Agendar
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <aside className="crm-calendar-day-panel" aria-label="Detalle del día seleccionado">
            <div className="crm-cal-day-head">
              <div>
                <div className="panel-kicker">
                  {selectedDate === CRM_TODAY_ISO ? 'HOY' : 'DÍA SELECCIONADO'}
                </div>
                <h4>{formatReadableDateEs(selectedDate)}</h4>
              </div>
              <span className="crm-cal-day-count mono">
                {selectedDayItems.length} {selectedDayItems.length === 1 ? 'evento' : 'eventos'}
              </span>
            </div>

            <div className="crm-cal-day-list">
              {selectedDayItems.length === 0 ? (
                <div className="crm-cal-day-empty">
                  <CalendarDays size={18} />
                  <strong>Agenda libre en esta fecha</strong>
                  <p>No hay llamadas ni seguimientos programados para este día.</p>
                </div>
              ) : (
                selectedDayItems.map(({ item, originalIndex }) => {
                  const isDone = item.status === 'Completada'
                  return (
                    <article
                      key={item.id || `side-${originalIndex}`}
                      className={`crm-cal-day-item ${isDone ? 'is-completed' : ''}`}
                    >
                      <div className="crm-cal-day-item-top">
                        <span className={`activity-icon tone-${item.tone}`}>
                          {renderActivityIcon(item.icon)}
                        </span>
                        <div className="crm-cal-day-item-meta">
                          <span className="mono">{item.time}</span>
                          <span>·</span>
                          <span>{getActivityTypeLabel(item.icon)}</span>
                        </div>
                        <span className={`crm-cal-status-text ${isDone ? 'done' : 'pending'}`}>
                          {isDone ? <CheckCircle2 size={12} /> : null} {item.status}
                        </span>
                      </div>

                      <strong>{item.title}</strong>
                      <p className="crm-cal-day-company">
                        {item.company}
                        {item.owner ? ` · Responsable: ${item.owner}` : ''}
                      </p>
                      {item.notes && <p className="crm-cal-day-notes">{item.notes}</p>}

                      <div className="crm-cal-day-actions">
                        {canEdit && (
                          <button
                            type="button"
                            className="button button-secondary"
                            onClick={() => onToggleComplete(originalIndex)}
                          >
                            {isDone ? 'Reabrir' : 'Completar'}
                          </button>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            className="button-icon-action"
                            onClick={() => onOpenEdit(originalIndex, item)}
                          >
                            <Edit3 size={12} /> Editar
                          </button>
                        )}
                      </div>
                    </article>
                  )
                })
              )}
            </div>

            {canCreate && (
              <button
                type="button"
                className="button button-primary crm-cal-schedule-btn"
                onClick={() => onOpenCreate(selectedDate)}
              >
                <Plus size={14} /> Agendar en este día
              </button>
            )}
          </aside>
        </div>
      )}
    </>
  )
}
