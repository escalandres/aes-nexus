import { useEffect, useMemo, useState } from 'react'
import {
  GitBranch,
  ShieldCheck,
  Check,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Lock,
  AlertTriangle,
  SlidersHorizontal,
  Save,
  ExternalLink,
  Play,
  Link2,
  Activity,
  BarChart3,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  DEFAULT_RETURN_WORKFLOWS,
  WORKFLOW_APPROVER_ROLES,
  buildReturnWorkflowPreset,
  cloneReturnWorkflows,
  syncWorkflowTransitionsToOrder,
  type CustomerReturn,
  type CustomerReturnStatus,
  type ReturnEntityWorkflowConfig,
  type ReturnWorkflowPresetKey,
  type ReturnWorkflowStepRule,
  type ReturnWorkflowsSettings,
  type SupplierReturn,
  type SupplierReturnStatus,
  type WorkflowApproverRole,
} from '../data/returns'
import { useToast } from './Toast'

interface ReturnWorkflowsPanelProps {
  workflows: ReturnWorkflowsSettings
  customerReturns: CustomerReturn[]
  supplierReturns: SupplierReturn[]
  canEdit: boolean
  currentUserName: string
  onSaveWorkflows: (next: ReturnWorkflowsSettings, summaryDetail: string) => void
  onNavigateReturns?: (kind: 'customer' | 'supplier') => void
}

type WorkflowEntityTab = 'customer' | 'supplier'

const formatCurrencyThreshold = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value)

const ROLE_DESCRIPTIONS: Record<WorkflowApproverRole, string> = {
  'Cualquier editor': 'Usuario con permiso de edición en el módulo',
  Operaciones: 'Supervisión logística y control de almacén',
  Finanzas: 'Autorización contable, CxC / CxP y notas de crédito',
  Administrador: 'Gobierno total y cierres críticos o cancelaciones',
}

export function ReturnWorkflowsPanel({
  workflows,
  customerReturns,
  supplierReturns,
  canEdit,
  currentUserName,
  onSaveWorkflows,
  onNavigateReturns,
}: ReturnWorkflowsPanelProps) {
  const toast = useToast()
  const [activeEntity, setActiveEntity] = useState<WorkflowEntityTab>('customer')
  const [draft, setDraft] = useState<ReturnWorkflowsSettings>(() => cloneReturnWorkflows(workflows))
  const [selectedStatus, setSelectedStatus] = useState<string>(
    () => workflows.customer.steps[0]?.status || workflows.customer.initialStatus
  )
  const [autoChainOnReorder, setAutoChainOnReorder] = useState<boolean>(true)
  const [draggedStatus, setDraggedStatus] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null)

  useEffect(() => {
    setDraft(cloneReturnWorkflows(workflows))
  }, [workflows])

  const activeConfig = activeEntity === 'customer' ? draft.customer : draft.supplier

  // Keep selectedStatus valid when switching between Customer and Supplier or applying presets
  useEffect(() => {
    const exists = activeConfig.steps.some((s) => s.status === selectedStatus)
    if (!exists) {
      setSelectedStatus(activeConfig.steps[0]?.status || activeConfig.initialStatus)
    }
  }, [activeEntity, activeConfig, selectedStatus])

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(workflows),
    [draft, workflows]
  )

  const summaryStats = useMemo(() => {
    const customerApprovals = draft.customer.steps.filter((s) => s.enabled && s.requiresApproval).length
    const supplierApprovals = draft.supplier.steps.filter((s) => s.enabled && s.requiresApproval).length
    const finalCount = activeConfig.steps.filter((s) => s.enabled && s.isFinalState).length
    const totalTransitions =
      draft.customer.steps
        .filter((s) => s.enabled)
        .reduce((sum, s) => sum + s.allowedNextStatuses.length, 0) +
      draft.supplier.steps
        .filter((s) => s.enabled)
        .reduce((sum, s) => sum + s.allowedNextStatuses.length, 0)
    const pendingApprovals =
      customerReturns.filter((r) => r.approvalStatus === 'pending').length +
      supplierReturns.filter((r) => r.approvalStatus === 'pending').length
    const activeUpdatedAt = activeConfig.updatedAtIso
    return {
      customerApprovals,
      supplierApprovals,
      finalCount,
      totalApprovals: customerApprovals + supplierApprovals,
      totalTransitions,
      pendingApprovals,
      lastUpdatedShort: activeUpdatedAt
        ? new Intl.DateTimeFormat('es-MX', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          }).format(new Date(activeUpdatedAt))
        : 'Estándar',
    }
  }, [draft, activeConfig, customerReturns, supplierReturns])

  const liveCountsByStatus = useMemo(() => {
    const map = new Map<string, number>()
    if (activeEntity === 'customer') {
      customerReturns.forEach((r) => map.set(r.status, (map.get(r.status) || 0) + 1))
    } else {
      supplierReturns.forEach((r) => map.set(r.status, (map.get(r.status) || 0) + 1))
    }
    return map
  }, [activeEntity, customerReturns, supplierReturns])

  const pendingByTargetStatus = useMemo(() => {
    const map = new Map<string, number>()
    const list = activeEntity === 'customer' ? customerReturns : supplierReturns
    list.forEach((r) => {
      if (r.approvalStatus === 'pending' && r.pendingTargetStatus) {
        map.set(r.pendingTargetStatus, (map.get(r.pendingTargetStatus) || 0) + 1)
      }
    })
    return map
  }, [activeEntity, customerReturns, supplierReturns])

  const activityChartStats = useMemo(() => {
    const activeReturnsList = activeEntity === 'customer' ? customerReturns : supplierReturns
    const valueByStatus = new Map<string, number>()
    activeReturnsList.forEach((ret) => {
      valueByStatus.set(ret.status, (valueByStatus.get(ret.status) || 0) + (ret.total || 0))
    })

    const rawRows = activeConfig.steps.map((step, index) => {
      const count = liveCountsByStatus.get(step.status) || 0
      const totalValue = valueByStatus.get(step.status) || 0
      const pendingApprovalCount = pendingByTargetStatus.get(step.status) || 0
      const shortLabel =
        step.status.length > 18 ? `${step.status.slice(0, 17).trim()}…` : step.status
      return {
        order: index + 1,
        status: step.status,
        shortLabel,
        count,
        totalValue,
        pendingApprovalCount,
        isFinal: step.isFinalState,
        isInitial: activeConfig.initialStatus === step.status,
        enabled: step.enabled,
      }
    })

    // Detect bottleneck among enabled non-final stages with at least 1 active return
    let bottleneckStatus: string | null = null
    let bestScore = -1
    rawRows.forEach((row) => {
      if (!row.enabled || row.isFinal || row.count <= 0) return
      const score = row.count * 1_000_000 + row.pendingApprovalCount * 10_000 + row.totalValue
      if (score > bestScore) {
        bestScore = score
        bottleneckStatus = row.status
      }
    })

    const totalCount = activeReturnsList.length
    const rows = rawRows.map((r) => ({
      ...r,
      isBottleneck: bottleneckStatus === r.status,
      sharePct: totalCount > 0 ? Math.round((r.count / totalCount) * 100) : 0,
    }))

    const bottleneckRow = rows.find((r) => r.isBottleneck) || null
    const openCount = rows
      .filter((r) => !r.isFinal)
      .reduce((sum, r) => sum + r.count, 0)
    const closedCount = rows
      .filter((r) => r.isFinal)
      .reduce((sum, r) => sum + r.count, 0)
    const pendingQueueCount = activeReturnsList.filter((r) => r.approvalStatus === 'pending').length
    const pendingQueueValue = activeReturnsList
      .filter((r) => r.approvalStatus === 'pending')
      .reduce((sum, r) => sum + (r.total || 0), 0)

    return {
      rows,
      totalCount,
      openCount,
      closedCount,
      pendingQueueCount,
      pendingQueueValue,
      bottleneckRow,
    }
  }, [
    activeEntity,
    activeConfig,
    customerReturns,
    supplierReturns,
    liveCountsByStatus,
    pendingByTargetStatus,
  ])

  const updateActiveConfig = <TStatus extends string>(
    updater: (prev: ReturnEntityWorkflowConfig<TStatus>) => ReturnEntityWorkflowConfig<TStatus>
  ) => {
    if (!canEdit) return
    setDraft((prev) => {
      if (activeEntity === 'customer') {
        const nextCustomer = updater(
          prev.customer as unknown as ReturnEntityWorkflowConfig<TStatus>
        ) as unknown as ReturnEntityWorkflowConfig<CustomerReturnStatus>
        return { ...prev, customer: nextCustomer }
      }
      const nextSupplier = updater(
        prev.supplier as unknown as ReturnEntityWorkflowConfig<TStatus>
      ) as unknown as ReturnEntityWorkflowConfig<SupplierReturnStatus>
      return { ...prev, supplier: nextSupplier }
    })
  }

  const applyInitialStatusToConfig = <TStatus extends string>(
    cfg: ReturnEntityWorkflowConfig<TStatus>,
    targetStatus: TStatus
  ): ReturnEntityWorkflowConfig<TStatus> => {
    const targetRule = cfg.steps.find((s) => s.status === targetStatus)
    if (!targetRule || !targetRule.enabled || targetRule.isFinalState) {
      return cfg
    }
    const targetIdx = cfg.steps.findIndex((s) => s.status === targetStatus)
    return {
      ...cfg,
      initialStatus: targetStatus,
      steps: cfg.steps.map((s) => {
        if (s.status !== targetStatus) return s
        let nextAllowed = [...s.allowedNextStatuses]
        if (nextAllowed.length === 0) {
          const nextInOrder = cfg.steps.find(
            (cand, idx) => idx > targetIdx && cand.enabled && cand.status !== targetStatus
          )
          const fallbackTarget = cfg.steps.find(
            (cand) => cand.enabled && cand.status !== targetStatus
          )
          const picked = nextInOrder || fallbackTarget
          if (picked) {
            nextAllowed = [picked.status]
          }
        }
        return {
          ...s,
          enabled: true,
          isFinalState: false,
          requiresApproval: false,
          allowedNextStatuses: nextAllowed,
        }
      }),
    }
  }

  const setInitialStatusForEntity = (kind: WorkflowEntityTab, targetStatus: string) => {
    if (!canEdit) return
    setDraft((prev) => {
      if (kind === 'customer') {
        return {
          ...prev,
          customer: applyInitialStatusToConfig(
            prev.customer,
            targetStatus as CustomerReturnStatus
          ),
        }
      }
      return {
        ...prev,
        supplier: applyInitialStatusToConfig(
          prev.supplier,
          targetStatus as SupplierReturnStatus
        ),
      }
    })
  }

  const reorderStepByStatus = (sourceStatus: string, targetStatus: string) => {
    if (!canEdit || sourceStatus === targetStatus) return
    updateActiveConfig((cfg) => {
      const fromIndex = cfg.steps.findIndex((s) => s.status === sourceStatus)
      const toIndex = cfg.steps.findIndex((s) => s.status === targetStatus)
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return cfg
      const nextSteps = [...cfg.steps]
      const [moved] = nextSteps.splice(fromIndex, 1)
      nextSteps.splice(toIndex, 0, moved)
      const reordered = { ...cfg, steps: nextSteps }
      return autoChainOnReorder ? syncWorkflowTransitionsToOrder(reordered) : reordered
    })
  }

  const moveStepByOffset = (status: string, offset: -1 | 1) => {
    if (!canEdit) return
    const idx = activeConfig.steps.findIndex((s) => s.status === status)
    const targetIdx = idx + offset
    if (idx < 0 || targetIdx < 0 || targetIdx >= activeConfig.steps.length) return
    reorderStepByStatus(status, activeConfig.steps[targetIdx].status)
  }

  const updateStepRule = <TStatus extends string>(
    status: TStatus,
    patch: Partial<ReturnWorkflowStepRule<TStatus>>
  ) => {
    updateActiveConfig<TStatus>((cfg) => {
      if (patch.enabled === false) {
        if (cfg.initialStatus === status) {
          toast.warning(
            'No puedes desactivar el estado configurado actualmente como estado inicial.',
            'Estado inicial protegido'
          )
          return cfg
        }
        const remainingEnabledFinals = cfg.steps.filter(
          (s) => s.status !== status && s.enabled && s.isFinalState
        )
        if (remainingEnabledFinals.length === 0) {
          toast.warning(
            'Debe permanecer habilitado al menos un estado final en el flujo.',
            'Estado final requerido'
          )
          return cfg
        }
      }

      if (patch.isFinalState === false) {
        const remainingEnabledFinals = cfg.steps.filter(
          (s) => s.status !== status && s.enabled && s.isFinalState
        )
        if (remainingEnabledFinals.length === 0) {
          toast.warning(
            'El flujo debe conservar al menos un estado marcado como final.',
            'Estado final requerido'
          )
          return cfg
        }
      }

      if (patch.isFinalState === true && cfg.initialStatus === status) {
        toast.warning(
          'El estado inicial al crear no puede marcarse simultáneamente como estado final.',
          'Regla de flujo'
        )
        return cfg
      }

      const nextSteps = cfg.steps.map((step, stepIdx) => {
        if (step.status !== status) {
          if (patch.enabled === false) {
            return {
              ...step,
              allowedNextStatuses: step.allowedNextStatuses.filter((st) => st !== status),
            }
          }
          return step
        }
        const updated = { ...step, ...patch }
        if (patch.isFinalState === true) {
          updated.allowedNextStatuses = []
        } else if (patch.isFinalState === false && updated.allowedNextStatuses.length === 0) {
          // Restore next enabled state(s) in current order so returns in this state become editable/transitionable immediately
          const nextStep = cfg.steps.find((s, i) => i > stepIdx && s.enabled && s.status !== status)
          const fallbackTarget = cfg.steps.find((s) => s.enabled && s.status !== status)
          const target = nextStep || fallbackTarget
          if (target) {
            updated.allowedNextStatuses = [target.status]
          }
        }
        return updated
      })

      return { ...cfg, steps: nextSteps }
    })
  }

  const toggleAllowedTransition = <TStatus extends string>(
    fromStatus: TStatus,
    targetStatus: TStatus
  ) => {
    updateActiveConfig<TStatus>((cfg) => ({
      ...cfg,
      steps: cfg.steps.map((step) => {
        if (step.status !== fromStatus) return step
        const exists = step.allowedNextStatuses.includes(targetStatus)
        const nextAllowed = exists
          ? step.allowedNextStatuses.filter((s) => s !== targetStatus)
          : [...step.allowedNextStatuses, targetStatus]
        return { ...step, allowedNextStatuses: nextAllowed }
      }),
    }))
  }

  const handleSyncSequenceTransitions = () => {
    if (!canEdit) return
    updateActiveConfig((cfg) => syncWorkflowTransitionsToOrder(cfg))
    toast.info(
      'Las transiciones permitidas se ajustaron al orden visual actual de las etapas.',
      'Rutas sincronizadas'
    )
  }

  const handleApplyPreset = (preset: ReturnWorkflowPresetKey) => {
    if (!canEdit) return
    const built = buildReturnWorkflowPreset(activeEntity, preset, currentUserName)
    setDraft((prev) =>
      activeEntity === 'customer'
        ? {
            ...prev,
            customer: built as ReturnWorkflowsSettings['customer'],
          }
        : {
            ...prev,
            supplier: built as ReturnWorkflowsSettings['supplier'],
          }
    )
    setSelectedStatus(built.steps[0]?.status || built.initialStatus)
    const presetLabel =
      preset === 'strict_final'
        ? 'Control estricto en estados finales'
        : preset === 'agile'
        ? 'Operación ágil por umbral'
        : 'Estándar balanceado'
    toast.info(
      `Plantilla "${presetLabel}" cargada en borrador. Presiona "Guardar flujo" para aplicarla.`,
      'Plantilla aplicada'
    )
  }

  const handleSave = () => {
    if (!canEdit) {
      toast.warning(
        'Tu rol actual solo tiene permiso de lectura sobre Administración.',
        'Edición restringida'
      )
      return
    }

    for (const key of ['customer', 'supplier'] as const) {
      const cfg = draft[key]
      const label = key === 'customer' ? 'Devoluciones de cliente' : 'Devoluciones de proveedor'
      const initRule = cfg.steps.find((s) => s.status === cfg.initialStatus)
      if (!initRule || !initRule.enabled || initRule.isFinalState) {
        toast.warning(
          `El estado inicial de ${label} debe estar habilitado y no ser un estado final.`,
          'Validación de flujo'
        )
        return
      }
      if (initRule.allowedNextStatuses.length === 0) {
        toast.warning(
          `El estado inicial "${cfg.initialStatus}" de ${label} debe permitir al menos una transición siguiente.`,
          'Flujo sin salida'
        )
        return
      }
      const hasFinal = cfg.steps.some((s) => s.enabled && s.isFinalState)
      if (!hasFinal) {
        toast.warning(
          `${label} debe tener al menos un estado habilitado marcado como final.`,
          'Estado final requerido'
        )
        return
      }
    }

    const nowIso = new Date().toISOString()
    const payload: ReturnWorkflowsSettings = {
      customer: {
        ...draft.customer,
        updatedAtIso: nowIso,
        updatedBy: currentUserName,
      },
      supplier: {
        ...draft.supplier,
        updatedAtIso: nowIso,
        updatedBy: currentUserName,
      },
    }

    const custOrder = payload.customer.steps.filter((s) => s.enabled).map((s) => s.status).join(' → ')
    const supOrder = payload.supplier.steps.filter((s) => s.enabled).map((s) => s.status).join(' → ')
    const custApprovalList = payload.customer.steps
      .filter((s) => s.enabled && s.requiresApproval)
      .map((s) => `${s.status} (${s.approverRole})`)
    const supApprovalList = payload.supplier.steps
      .filter((s) => s.enabled && s.requiresApproval)
      .map((s) => `${s.status} (${s.approverRole})`)

    const summaryDetail = `Cliente [inicio: ${payload.customer.initialStatus} · orden: ${custOrder} · aprob: ${
      custApprovalList.length > 0 ? custApprovalList.join(', ') : 'ninguna'
    }] | Proveedor [inicio: ${payload.supplier.initialStatus} · orden: ${supOrder} · aprob: ${
      supApprovalList.length > 0 ? supApprovalList.join(', ') : 'ninguna'
    }]`
    onSaveWorkflows(payload, summaryDetail)
  }

  const handleResetDefault = () => {
    if (!canEdit) return
    const next = cloneReturnWorkflows(DEFAULT_RETURN_WORKFLOWS)
    next.customer.updatedAtIso = new Date().toISOString()
    next.customer.updatedBy = currentUserName
    next.supplier.updatedAtIso = new Date().toISOString()
    next.supplier.updatedBy = currentUserName
    setDraft(next)
    toast.info(
      'Configuración restablecida al borrador estándar. Guarda para persistir en el sistema.',
      'Valores predeterminados'
    )
  }

  const selectedStep =
    activeConfig.steps.find((s) => s.status === selectedStatus) || activeConfig.steps[0]
  const selectedIndex = activeConfig.steps.findIndex((s) => s.status === selectedStep?.status)
  const isSelectedInitial = selectedStep?.status === activeConfig.initialStatus
  const allStatusesInOrder = activeConfig.steps.map((s) => s.status)

  return (
    <div className="finance-section-container retwf-container">
      {/* Header strip */}
      <div className="ops-header-strip retwf-header">
        <div className="ops-header-left">
          <div className="ops-icon-box fin-icon-box">
            <GitBranch size={20} />
          </div>
          <div>
            <h2>Configuración Visual de Flujos de Devoluciones</h2>
            <p>
              Diseña el orden de las etapas arrastrando los bloques, define estados finales y asigna roles aprobadores para transiciones críticas en{' '}
              <strong>Devoluciones de cliente (RMA)</strong> y <strong>Devoluciones de proveedor (RTV)</strong>.
            </p>
          </div>
        </div>

        <div className="retwf-header-actions">
          {onNavigateReturns && (
            <button
              type="button"
              className="button button-secondary button-sm"
              onClick={() => onNavigateReturns(activeEntity)}
            >
              Ir a {activeEntity === 'customer' ? 'RMA Clientes' : 'RTV Proveedores'}{' '}
              <ExternalLink size={12} />
            </button>
          )}
          {canEdit && (
            <>
              <button
                type="button"
                className="button button-ghost button-sm"
                onClick={handleResetDefault}
              >
                <RotateCcw size={13} /> Predeterminado
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={handleSave}
                disabled={!isDirty}
              >
                <Save size={14} /> {isDirty ? 'Guardar flujo' : 'Flujo guardado'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="ret-kpi-strip">
        <article className="ret-kpi-card">
          <span className="ret-kpi-label">ESTADOS CON APROBACIÓN</span>
          <strong className="ret-kpi-val tabular-nums">{summaryStats.totalApprovals}</strong>
          <small>
            {summaryStats.customerApprovals} cliente · {summaryStats.supplierApprovals} proveedor
          </small>
        </article>
        <article className="ret-kpi-card">
          <span className="ret-kpi-label">ESTADOS FINALES ACTIVOS</span>
          <strong className="ret-kpi-val tabular-nums">{summaryStats.finalCount}</strong>
          <small>Cierres configurados en vista actual</small>
        </article>
        <article className="ret-kpi-card">
          <span className="ret-kpi-label">APROBACIONES PENDIENTES</span>
          <strong
            className={`ret-kpi-val tabular-nums ${
              summaryStats.pendingApprovals > 0 ? 'is-amber' : 'is-ok'
            }`}
          >
            {summaryStats.pendingApprovals}
          </strong>
          <small>Expedientes en cola de autorización</small>
        </article>
        <article className="ret-kpi-card">
          <span className="ret-kpi-label">ÚLTIMA MODIFICACIÓN</span>
          <strong className="ret-kpi-val tabular-nums retwf-date-kpi">
            {summaryStats.lastUpdatedShort}
          </strong>
          <small>Por {activeConfig.updatedBy}</small>
        </article>
      </div>

      {/* Explicit Default Initial Status Configuration for Both Return Types */}
      <section
        className="retwf-defaults-panel"
        aria-label="Estado inicial por defecto para cada tipo de flujo"
      >
        <div className="retwf-defaults-head">
          <div className="retwf-defaults-title">
            <Play size={14} aria-hidden="true" />
            <div>
              <h3>Estado inicial por defecto para nuevas devoluciones</h3>
              <p>
                Selecciona mediante el menú desplegable el estado inicial predeterminado que se asignará al crear solicitudes en Ventas (RMA) y Compras (RTV).
              </p>
            </div>
          </div>
        </div>

        <div className="retwf-defaults-grid">
          <div className="retwf-default-col">
            <div className="retwf-default-col-head">
              <div>
                <strong>Devoluciones de cliente (RMA)</strong>
                <span>Aplicado al registrar nuevas solicitudes en Ventas</span>
              </div>
              <label className="retwf-default-select-field">
                <span>Estado inicial por defecto</span>
                <select
                  value={draft.customer.initialStatus}
                  disabled={!canEdit}
                  className="retwf-default-select"
                  aria-label="Estado inicial por defecto para devoluciones de cliente"
                  onChange={(e) => setInitialStatusForEntity('customer', e.target.value)}
                >
                  {draft.customer.steps.map((s) => {
                    const ineligible = !s.enabled || s.isFinalState
                    return (
                      <option key={s.status} value={s.status} disabled={ineligible}>
                        {s.status}
                        {!s.enabled ? ' (Etapa omitida)' : s.isFinalState ? ' (Estado final)' : ''}
                      </option>
                    )
                  })}
                </select>
              </label>
            </div>
            <div className="retwf-default-chips" role="group" aria-label="Selector rápido estado inicial cliente">
              {draft.customer.steps
                .filter((s) => s.enabled && !s.isFinalState)
                .map((s) => {
                  const isInit = draft.customer.initialStatus === s.status
                  return (
                    <button
                      key={s.status}
                      type="button"
                      disabled={!canEdit}
                      className={`retwf-trans-btn ${isInit ? 'is-active' : ''}`}
                      onClick={() => setInitialStatusForEntity('customer', s.status)}
                    >
                      {isInit ? <Play size={11} /> : null}
                      <span>{s.status}</span>
                    </button>
                  )
                })}
            </div>
            <small className="ret-meta-text">
              Al crear una RMA iniciará en <strong>{draft.customer.initialStatus}</strong>
              {draft.customer.initialStatus === 'Recibida en almacén'
                ? ' (aplicará reingreso a inventario automáticamente).'
                : '.'}
            </small>
          </div>

          <div className="retwf-default-col">
            <div className="retwf-default-col-head">
              <div>
                <strong>Devoluciones de proveedor (RTV)</strong>
                <span>Aplicado al registrar nuevas solicitudes en Compras</span>
              </div>
              <label className="retwf-default-select-field">
                <span>Estado inicial por defecto</span>
                <select
                  value={draft.supplier.initialStatus}
                  disabled={!canEdit}
                  className="retwf-default-select"
                  aria-label="Estado inicial por defecto para devoluciones de proveedor"
                  onChange={(e) => setInitialStatusForEntity('supplier', e.target.value)}
                >
                  {draft.supplier.steps.map((s) => {
                    const ineligible = !s.enabled || s.isFinalState
                    return (
                      <option key={s.status} value={s.status} disabled={ineligible}>
                        {s.status}
                        {!s.enabled ? ' (Etapa omitida)' : s.isFinalState ? ' (Estado final)' : ''}
                      </option>
                    )
                  })}
                </select>
              </label>
            </div>
            <div className="retwf-default-chips" role="group" aria-label="Selector rápido estado inicial proveedor">
              {draft.supplier.steps
                .filter((s) => s.enabled && !s.isFinalState)
                .map((s) => {
                  const isInit = draft.supplier.initialStatus === s.status
                  return (
                    <button
                      key={s.status}
                      type="button"
                      disabled={!canEdit}
                      className={`retwf-trans-btn ${isInit ? 'is-active' : ''}`}
                      onClick={() => setInitialStatusForEntity('supplier', s.status)}
                    >
                      {isInit ? <Play size={11} /> : null}
                      <span>{s.status}</span>
                    </button>
                  )
                })}
            </div>
            <small className="ret-meta-text">
              Al crear una RTV iniciará en <strong>{draft.supplier.initialStatus}</strong>
              {draft.supplier.initialStatus === 'Enviada a proveedor'
                ? ' (descontará inventario en Kardex automáticamente).'
                : '.'}
            </small>
          </div>
        </div>
      </section>

      {/* Switcher + Presets Toolbar */}
      <div className="retwf-toolbar">
        <div className="retwf-entity-switch" role="tablist" aria-label="Tipo de devolución a configurar">
          <button
            type="button"
            role="tab"
            aria-selected={activeEntity === 'customer'}
            className={`retwf-entity-tab ${activeEntity === 'customer' ? 'active' : ''}`}
            onClick={() => setActiveEntity('customer')}
          >
            Devoluciones de cliente (RMA)
            <span className="tabular-nums">{summaryStats.customerApprovals} aprob.</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeEntity === 'supplier'}
            className={`retwf-entity-tab ${activeEntity === 'supplier' ? 'active' : ''}`}
            onClick={() => setActiveEntity('supplier')}
          >
            Devoluciones de proveedor (RTV)
            <span className="tabular-nums">{summaryStats.supplierApprovals} aprob.</span>
          </button>
        </div>

        {canEdit && (
          <div className="retwf-presets-group">
            <span>
              <SlidersHorizontal size={12} aria-hidden="true" /> Plantillas rápidas:
            </span>
            <button
              type="button"
              className="button button-secondary button-sm"
              onClick={() => handleApplyPreset('standard')}
            >
              Estándar
            </button>
            <button
              type="button"
              className="button button-secondary button-sm"
              onClick={() => handleApplyPreset('strict_final')}
            >
              Aprobación estricta en estados finales
            </button>
            <button
              type="button"
              className="button button-secondary button-sm"
              onClick={() => handleApplyPreset('agile')}
            >
              Ágil por monto
            </button>
          </div>
        )}
      </div>

      {/* Unsaved draft warning */}
      {isDirty && (
        <div className="retwf-dirty-banner" role="status">
          <div className="retwf-dirty-copy">
            <AlertTriangle size={15} aria-hidden="true" />
            <span>
              Tienes cambios pendientes en el flujo de trabajo. Guarda los cambios para que apliquen en tiempo real en Ventas y Compras.
            </span>
          </div>
          {canEdit && (
            <div className="retwf-dirty-actions">
              <button
                type="button"
                className="button button-ghost button-sm"
                onClick={() => setDraft(cloneReturnWorkflows(workflows))}
              >
                Descartar
              </button>
              <button type="button" className="button button-primary button-sm" onClick={handleSave}>
                <Check size={13} /> Guardar ahora
              </button>
            </div>
          )}
        </div>
      )}

      {/* Real-time Flow Activity & Bottleneck Mini-Dashboard */}
      <section className="retwf-activity-panel" aria-label="Dashboard de actividad del flujo">
        <div className="retwf-activity-head">
          <div className="retwf-activity-title">
            <div className="retwf-activity-icon">
              <BarChart3 size={16} aria-hidden="true" />
            </div>
            <div>
              <h3>Actividad del flujo</h3>
              <p>
                Conteo en tiempo real por estado para{' '}
                {activeEntity === 'customer'
                  ? 'Devoluciones de cliente (RMA)'
                  : 'Devoluciones de proveedor (RTV)'}{' '}
                siguiendo el orden actual · Haz clic en una barra para editar esa etapa.
              </p>
            </div>
          </div>

          <div className="retwf-activity-legend" aria-hidden="true">
            <span className="retwf-legend-item">
              <span className="retwf-legend-swatch is-bottleneck" /> Cuello de botella
            </span>
            <span className="retwf-legend-item">
              <span className="retwf-legend-swatch is-active" /> Etapa en curso
            </span>
            <span className="retwf-legend-item">
              <span className="retwf-legend-swatch is-final" /> Estado final
            </span>
          </div>
        </div>

        <div className="retwf-activity-body">
          <div className="retwf-activity-chart-wrap">
            {activityChartStats.totalCount === 0 ? (
              <div className="retwf-activity-empty">
                <Activity size={16} aria-hidden="true" />
                <span>Aún no hay devoluciones registradas para visualizar actividad en este flujo.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={208}>
                <BarChart
                  data={activityChartStats.rows}
                  margin={{ top: 10, right: 12, left: -18, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.35} />
                  <XAxis
                    dataKey="shortLabel"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    tick={{ fontSize: 10.5, fill: '#6b776f' }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10.5, fill: '#6b776f' }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(27, 122, 88, 0.08)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null
                      const row = payload[0].payload as {
                        order: number
                        status: string
                        count: number
                        totalValue: number
                        pendingApprovalCount: number
                        isFinal: boolean
                        isInitial: boolean
                        isBottleneck: boolean
                        sharePct: number
                      }
                      return (
                        <div className="retwf-chart-tooltip">
                          <strong>
                            {String(row.order).padStart(2, '0')}. {row.status}
                          </strong>
                          <span className="tabular-nums">
                            {row.count} {row.count === 1 ? 'devolución' : 'devoluciones'} ({row.sharePct}%)
                          </span>
                          <span className="tabular-nums">
                            Importe acumulado: {formatCurrencyThreshold(row.totalValue)}
                          </span>
                          {row.pendingApprovalCount > 0 && (
                            <span className="retwf-tooltip-warn tabular-nums">
                              {row.pendingApprovalCount} esperando aprobación de entrada
                            </span>
                          )}
                          {row.isBottleneck && (
                            <span className="retwf-tooltip-warn">
                              Cuello de botella actual del flujo
                            </span>
                          )}
                          {row.isFinal && <span>Etapa de cierre final</span>}
                        </div>
                      )
                    }}
                  />
                  <Bar
                    dataKey="count"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                    onClick={(data) => {
                      const clickedStatus = (data as { status?: string } | undefined)?.status
                      if (clickedStatus) setSelectedStatus(clickedStatus)
                    }}
                  >
                    {activityChartStats.rows.map((entry) => {
                      const fill = !entry.enabled
                        ? '#94a3b8'
                        : entry.isBottleneck
                        ? '#d97706'
                        : entry.isFinal
                        ? '#52655c'
                        : '#1b7a58'
                      const isSelectedBar = selectedStatus === entry.status
                      return (
                        <Cell
                          key={entry.status}
                          fill={fill}
                          fillOpacity={isSelectedBar ? 1 : 0.86}
                          stroke={isSelectedBar ? '#0f4c36' : 'none'}
                          strokeWidth={isSelectedBar ? 1.5 : 0}
                          style={{ cursor: 'pointer' }}
                        />
                      )
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <aside className="retwf-activity-insights" aria-label="Resumen de cuello de botella">
            <div className="retwf-insight-row">
              <span className="retwf-insight-label">CUELLO DE BOTELLA ACTUAL</span>
              {activityChartStats.bottleneckRow ? (
                <>
                  <strong className="retwf-insight-value is-bottleneck">
                    {activityChartStats.bottleneckRow.status}
                  </strong>
                  <span className="retwf-insight-meta tabular-nums">
                    {activityChartStats.bottleneckRow.count}{' '}
                    {activityChartStats.bottleneckRow.count === 1 ? 'expediente' : 'expedientes'} (
                    {activityChartStats.bottleneckRow.sharePct}% del total) ·{' '}
                    {formatCurrencyThreshold(activityChartStats.bottleneckRow.totalValue)}
                  </span>
                </>
              ) : (
                <>
                  <strong className="retwf-insight-value">Sin retención activa</strong>
                  <span className="retwf-insight-meta">
                    No hay expedientes abiertos acumulados en etapas intermedias.
                  </span>
                </>
              )}
            </div>

            <div className="retwf-insight-row">
              <span className="retwf-insight-label">BALANCE DEL PROCESO</span>
              <strong className="retwf-insight-value tabular-nums">
                {activityChartStats.openCount} abiertas / {activityChartStats.closedCount} cerradas
              </strong>
              <span className="retwf-insight-meta tabular-nums">
                {activityChartStats.totalCount} devoluciones totales en este flujo
              </span>
            </div>

            <div className="retwf-insight-row">
              <span className="retwf-insight-label">RETENIDAS POR APROBACIÓN</span>
              <strong
                className={`retwf-insight-value tabular-nums ${
                  activityChartStats.pendingQueueCount > 0 ? 'is-bottleneck' : ''
                }`}
              >
                {activityChartStats.pendingQueueCount}{' '}
                {activityChartStats.pendingQueueCount === 1 ? 'solicitud' : 'solicitudes'}
              </strong>
              <span className="retwf-insight-meta tabular-nums">
                {activityChartStats.pendingQueueCount > 0
                  ? `${formatCurrencyThreshold(activityChartStats.pendingQueueValue)} esperando firma de rol`
                  : 'Cola de autorizaciones al día'}
              </span>
            </div>
          </aside>
        </div>
      </section>

      {/* Interactive Visual Drag-and-Drop Canvas */}
      <section className="retwf-pipeline-panel" aria-label="Lienzo visual interactivo de estados">
        <div className="retwf-pipeline-head">
          <div>
            <h3>Lienzo visual del flujo · Arrastra para reordenar estados</h3>
            <p>
              Arrastra cualquier tarjeta de etapa (o usa las flechas) para editar el orden del ciclo. Haz clic en una etapa para editar sus transiciones críticas y roles aprobadores abajo.
            </p>
          </div>

          <div className="retwf-global-rules">
            <label className="retwf-inline-field">
              <span>Estado inicial</span>
              <select
                value={activeConfig.initialStatus}
                disabled={!canEdit}
                aria-label="Estado inicial del flujo activo"
                onChange={(e) => setInitialStatusForEntity(activeEntity, e.target.value)}
              >
                {activeConfig.steps.map((s) => {
                  const ineligible = !s.enabled || s.isFinalState
                  return (
                    <option key={s.status} value={s.status} disabled={ineligible}>
                      {s.status}
                      {!s.enabled ? ' (Omitida)' : s.isFinalState ? ' (Final)' : ''}
                    </option>
                  )
                })}
              </select>
            </label>

            <label className="retwf-check-toggle">
              <input
                type="checkbox"
                checked={autoChainOnReorder}
                disabled={!canEdit}
                onChange={(e) => setAutoChainOnReorder(e.target.checked)}
              />
              <span>Auto-enlazar rutas al reordenar</span>
            </label>

            <label className="retwf-check-toggle">
              <input
                type="checkbox"
                checked={activeConfig.preventDeleteAfterSettlement}
                disabled={!canEdit}
                onChange={(e) =>
                  updateActiveConfig((cfg) => ({
                    ...cfg,
                    preventDeleteAfterSettlement: e.target.checked,
                  }))
                }
              />
              <span>Bloquear eliminación en estados finales</span>
            </label>

            {canEdit && (
              <button
                type="button"
                className="button button-secondary button-sm"
                onClick={handleSyncSequenceTransitions}
                title="Reconstruir las transiciones permitidas siguiendo el orden actual de los estados"
              >
                <Link2 size={13} /> Sincronizar rutas
              </button>
            )}
          </div>
        </div>

        <div className="retwf-pipeline-track">
          {activeConfig.steps.map((step, index) => {
            const isInitial = activeConfig.initialStatus === step.status
            const isSelected = selectedStep?.status === step.status
            const isDragging = draggedStatus === step.status
            const isDragOver = dragOverStatus === step.status && draggedStatus !== step.status
            const liveCount = liveCountsByStatus.get(step.status) || 0
            const pendingCount = pendingByTargetStatus.get(step.status) || 0

            return (
              <div key={step.status} className="retwf-pipeline-node-wrap">
                <div
                  draggable={canEdit}
                  onDragStart={(e) => {
                    if (!canEdit) return
                    setDraggedStatus(step.status)
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setData('text/plain', step.status)
                  }}
                  onDragOver={(e) => {
                    if (!canEdit || !draggedStatus) return
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    if (dragOverStatus !== step.status) {
                      setDragOverStatus(step.status)
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverStatus === step.status) {
                      setDragOverStatus(null)
                    }
                  }}
                  onDrop={(e) => {
                    if (!canEdit) return
                    e.preventDefault()
                    const source = draggedStatus || e.dataTransfer.getData('text/plain')
                    if (source && source !== step.status) {
                      reorderStepByStatus(source, step.status)
                    }
                    setDraggedStatus(null)
                    setDragOverStatus(null)
                  }}
                  onDragEnd={() => {
                    setDraggedStatus(null)
                    setDragOverStatus(null)
                  }}
                  onClick={() => setSelectedStatus(step.status)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedStatus(step.status)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={`Etapa ${index + 1}: ${step.status}`}
                  className={`retwf-pipeline-node retwf-draggable-node ${!step.enabled ? 'is-disabled' : ''} ${
                    step.isFinalState ? 'is-final' : ''
                  } ${isInitial ? 'is-initial' : ''} ${isSelected ? 'is-selected' : ''} ${
                    isDragging ? 'is-dragging' : ''
                  } ${isDragOver ? 'is-drag-over' : ''}`}
                >
                  <div className="retwf-node-top">
                    <span className="retwf-node-order">
                      {canEdit && <GripVertical size={13} className="retwf-drag-grip" aria-hidden="true" />}
                      <span className="tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                      <span className="retwf-node-kind">
                        {!step.enabled
                          ? 'Desactivado'
                          : isInitial
                          ? 'Inicio'
                          : step.isFinalState
                          ? 'Final'
                          : 'Etapa'}
                      </span>
                    </span>
                    <span className="retwf-node-count tabular-nums" title="Expedientes actualmente en este estado">
                      {liveCount} exp.
                    </span>
                  </div>

                  <strong className="retwf-node-title">{step.status}</strong>

                  <div className="retwf-node-meta">
                    {step.requiresApproval ? (
                      <span className="retwf-node-lock">
                        <Lock size={11} aria-hidden="true" /> {step.approverRole}
                        {step.approvalThresholdAmount > 0
                          ? ` (≥ ${formatCurrencyThreshold(step.approvalThresholdAmount)})`
                          : ''}
                      </span>
                    ) : (
                      <span>Transición directa</span>
                    )}
                    {pendingCount > 0 && (
                      <span className="retwf-node-pending tabular-nums">
                        · {pendingCount} por aprobar
                      </span>
                    )}
                  </div>

                  <label
                    className="retwf-node-final-check"
                    onClick={(e) => e.stopPropagation()}
                    title="Los estados finales bloquean la edición y transiciones de las devoluciones en esa etapa"
                  >
                    <input
                      type="checkbox"
                      checked={step.isFinalState}
                      disabled={!canEdit || !step.enabled || isInitial}
                      onChange={(e) =>
                        updateStepRule(step.status, { isFinalState: e.target.checked })
                      }
                      aria-label={`Marcar ${step.status} como estado final`}
                    />
                    <span>{step.isFinalState ? 'Estado final (bloqueado)' : 'Marcar como final'}</span>
                  </label>

                  <div className="retwf-node-footer">
                    <span className="retwf-node-routes">
                      {step.isFinalState
                        ? 'Edición bloqueada'
                        : step.allowedNextStatuses.length > 0
                        ? `→ ${step.allowedNextStatuses.length} ruta${
                            step.allowedNextStatuses.length === 1 ? '' : 's'
                          }`
                        : 'Sin salidas'}
                    </span>

                    {canEdit && (
                      <div
                        className="retwf-node-move-btns"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="retwf-mini-icon-btn"
                          disabled={index === 0}
                          onClick={() => moveStepByOffset(step.status, -1)}
                          title="Mover etapa hacia la izquierda"
                          aria-label={`Mover ${step.status} antes`}
                        >
                          <ArrowLeft size={12} />
                        </button>
                        <button
                          type="button"
                          className="retwf-mini-icon-btn"
                          disabled={index === activeConfig.steps.length - 1}
                          onClick={() => moveStepByOffset(step.status, 1)}
                          title="Mover etapa hacia la derecha"
                          aria-label={`Mover ${step.status} después`}
                        >
                          <ArrowRight size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {index < activeConfig.steps.length - 1 && (
                  <ArrowRight size={14} className="retwf-pipeline-arrow" aria-hidden="true" />
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Interactive Stage & Critical Transitions Inspector */}
      {selectedStep && (
        <section className="retwf-inspector-grid" aria-label="Inspector interactivo de etapa">
          {/* Left column: Stage Definition & Final State Controls */}
          <div className="retwf-inspector-card">
            <div className="retwf-inspector-head">
              <div>
                <span className="retwf-inspector-kicker tabular-nums">
                  ETAPA {String(selectedIndex + 1).padStart(2, '0')} DE {String(activeConfig.steps.length).padStart(2, '0')}
                </span>
                <h3>{selectedStep.status}</h3>
              </div>
              {canEdit && (
                <div className="retwf-inspector-order-actions">
                  <button
                    type="button"
                    className="button button-secondary button-sm"
                    disabled={selectedIndex <= 0}
                    onClick={() => moveStepByOffset(selectedStep.status, -1)}
                  >
                    <ArrowLeft size={12} /> Subir orden
                  </button>
                  <button
                    type="button"
                    className="button button-secondary button-sm"
                    disabled={selectedIndex >= activeConfig.steps.length - 1}
                    onClick={() => moveStepByOffset(selectedStep.status, 1)}
                  >
                    Bajar orden <ArrowRight size={12} />
                  </button>
                </div>
              )}
            </div>

            <div className="retwf-inspector-controls">
              <div className="retwf-control-row">
                <div className="retwf-control-label">
                  <strong>Estado final y bloqueo de edición</strong>
                  <span>
                    Cuando una devolución alcanza un estado final, se bloquean sus ediciones, notas y nuevas transiciones.
                  </span>
                </div>
                <label className="retwf-switch">
                  <input
                    type="checkbox"
                    checked={selectedStep.isFinalState}
                    disabled={!canEdit || !selectedStep.enabled || isSelectedInitial}
                    onChange={(e) =>
                      updateStepRule(selectedStep.status, { isFinalState: e.target.checked })
                    }
                    aria-label={`Marcar ${selectedStep.status} como estado final`}
                  />
                  <span>
                    {selectedStep.isFinalState
                      ? 'Estado final (bloquea edición)'
                      : 'Etapa editable (intermedia)'}
                  </span>
                </label>
              </div>

              <div className="retwf-control-row">
                <div className="retwf-control-label">
                  <strong>Disponibilidad y punto de arranque</strong>
                  <span>Controla si la etapa participa en el flujo o inicia nuevas devoluciones.</span>
                </div>
                <div className="retwf-inline-actions-wrap">
                  <button
                    type="button"
                    disabled={!canEdit || isSelectedInitial}
                    className={`retwf-trans-btn ${selectedStep.enabled ? 'is-active' : ''}`}
                    onClick={() =>
                      updateStepRule(selectedStep.status, { enabled: !selectedStep.enabled })
                    }
                  >
                    <Check size={12} /> {selectedStep.enabled ? 'Etapa habilitada' : 'Etapa omitida'}
                  </button>
                  <button
                    type="button"
                    disabled={!canEdit || !selectedStep.enabled || selectedStep.isFinalState || isSelectedInitial}
                    className={`retwf-trans-btn ${isSelectedInitial ? 'is-active' : ''}`}
                    onClick={() =>
                      setInitialStatusForEntity(activeEntity, selectedStep.status as string)
                    }
                  >
                    <Play size={11} />{' '}
                    {isSelectedInitial ? 'Es el estado inicial' : 'Fijar como estado inicial'}
                  </button>
                </div>
              </div>

              <div className="retwf-control-row">
                <div className="retwf-control-label">
                  <strong>Requisitos obligatorios al entrar</strong>
                  <span>Candados de captura antes de permitir el cambio hacia esta etapa.</span>
                </div>
                <div className="retwf-entry-checks">
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedStep.requireNotesOnEntry}
                      disabled={!canEdit || !selectedStep.enabled}
                      onChange={(e) =>
                        updateStepRule(selectedStep.status, { requireNotesOnEntry: e.target.checked })
                      }
                    />
                    <span>Exigir notas justificativas o dictamen</span>
                  </label>
                  {activeEntity === 'supplier' && (
                    <label>
                      <input
                        type="checkbox"
                        checked={Boolean(selectedStep.requireDocumentRefOnEntry)}
                        disabled={!canEdit || !selectedStep.enabled}
                        onChange={(e) =>
                          updateStepRule(selectedStep.status, {
                            requireDocumentRefOnEntry: e.target.checked,
                          })
                        }
                      />
                      <span>Exigir folio RMA del proveedor</span>
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right column: Role Approval Policy & Critical Outgoing Transitions */}
          <div className="retwf-inspector-card">
            <div className="retwf-inspector-head">
              <div>
                <span className="retwf-inspector-kicker">GOBERNANZA DE TRANSICIONES CRÍTICAS</span>
                <h3>Aprobación al entrar y rutas de salida</h3>
              </div>
            </div>

            <div className="retwf-inspector-controls">
              <div className="retwf-control-row">
                <div className="retwf-control-label">
                  <strong>Política de autorización al entrar a &ldquo;{selectedStep.status}&rdquo;</strong>
                  <span>Define si pasar a este estado ejecuta el cambio directo o exige firma de un rol.</span>
                </div>
                <div className="retwf-segmented-pair" role="group" aria-label="Control de aprobación">
                  <button
                    type="button"
                    disabled={!canEdit || !selectedStep.enabled || isSelectedInitial}
                    className={`retwf-seg-btn ${!selectedStep.requiresApproval ? 'is-active' : ''}`}
                    onClick={() =>
                      updateStepRule(selectedStep.status, { requiresApproval: false })
                    }
                  >
                    Transición directa
                  </button>
                  <button
                    type="button"
                    disabled={!canEdit || !selectedStep.enabled || isSelectedInitial}
                    className={`retwf-seg-btn ${selectedStep.requiresApproval ? 'is-active' : ''}`}
                    onClick={() =>
                      updateStepRule(selectedStep.status, { requiresApproval: true })
                    }
                  >
                    <ShieldCheck size={12} /> Requiere aprobación
                  </button>
                </div>
              </div>

              {selectedStep.requiresApproval && selectedStep.enabled && (
                <div className="retwf-role-selector-block">
                  <div className="retwf-role-header">
                    <strong>Rol requerido para aprobar esta transición</strong>
                    <div className="retwf-threshold-inline">
                      <span>Umbral mínimo MXN:</span>
                      <div className="retwf-threshold-input">
                        <span>≥ $</span>
                        <input
                          type="number"
                          min={0}
                          step={500}
                          disabled={!canEdit}
                          value={selectedStep.approvalThresholdAmount}
                          aria-label={`Umbral mínimo MXN para aprobación en ${selectedStep.status}`}
                          onChange={(e) =>
                            updateStepRule(selectedStep.status, {
                              approvalThresholdAmount: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="retwf-role-cards">
                    {WORKFLOW_APPROVER_ROLES.map((roleOpt) => {
                      const active = selectedStep.approverRole === roleOpt
                      return (
                        <button
                          key={roleOpt}
                          type="button"
                          disabled={!canEdit}
                          className={`retwf-role-card ${active ? 'is-selected' : ''}`}
                          onClick={() =>
                            updateStepRule(selectedStep.status, { approverRole: roleOpt })
                          }
                        >
                          <div className="retwf-role-card-top">
                            <strong>{roleOpt}</strong>
                            {active && <Check size={13} />}
                          </div>
                          <span>{ROLE_DESCRIPTIONS[roleOpt]}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="retwf-routes-block">
                <div className="retwf-control-label">
                  <strong>
                    Transiciones salientes permitidas desde &ldquo;{selectedStep.status}&rdquo;
                  </strong>
                  <span>
                    {selectedStep.isFinalState
                      ? 'Los estados finales concluyen el flujo; si deseas reabrir rutas, cámbialo a etapa intermedia.'
                      : 'Activa o desactiva hacia qué estados puede avanzar un expediente desde esta etapa.'}
                  </span>
                </div>

                {!selectedStep.enabled ? (
                  <span className="ret-meta-text">Habilita la etapa para configurar sus rutas salientes.</span>
                ) : selectedStep.isFinalState ? (
                  <span className="ret-meta-text">Estado final configurado como cierre de ciclo.</span>
                ) : (
                  <div className="retwf-routes-selector">
                    {allStatusesInOrder
                      .filter((targetSt) => targetSt !== selectedStep.status)
                      .map((targetSt) => {
                        const targetRule = activeConfig.steps.find((s) => s.status === targetSt)
                        const targetEnabled = Boolean(targetRule?.enabled)
                        const checked =
                          targetEnabled &&
                          (selectedStep.allowedNextStatuses as string[]).includes(targetSt)
                        return (
                          <button
                            key={targetSt}
                            type="button"
                            disabled={!canEdit || !targetEnabled}
                            className={`retwf-route-option ${checked ? 'is-active' : ''}`}
                            onClick={() =>
                              toggleAllowedTransition(
                                selectedStep.status as string,
                                targetSt as string
                              )
                            }
                          >
                            <div className="retwf-route-option-main">
                              {checked ? <Check size={13} /> : <ArrowRight size={13} />}
                              <span>{targetSt}</span>
                            </div>
                            <small>
                              {!targetEnabled
                                ? 'Etapa omitida'
                                : targetRule?.requiresApproval
                                ? `Crítica · ${targetRule.approverRole}`
                                : targetRule?.isFinalState
                                ? 'Final directo'
                                : 'Directa'}
                            </small>
                          </button>
                        )
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Full Sequence & Transition Matrix Overview */}
      <div className="ret-table-wrap">
        <table className="ret-table retwf-rules-table">
          <thead>
            <tr>
              <th>Orden</th>
              <th>Estado y uso actual</th>
              <th>Habilitado</th>
              <th>Estado final (bloquea edición)</th>
              <th>Control de aprobación</th>
              <th>Rol aprobador y umbral MXN</th>
              <th>Transiciones permitidas desde este estado</th>
            </tr>
          </thead>
          <tbody>
            {activeConfig.steps.map((step, idx) => {
              const isInitial = activeConfig.initialStatus === step.status
              const liveCount = liveCountsByStatus.get(step.status) || 0
              const possibleTargets = allStatusesInOrder.filter((st) => st !== step.status)

              return (
                <tr
                  key={step.status}
                  draggable={canEdit}
                  onDragStart={(e) => {
                    if (!canEdit) return
                    setDraggedStatus(step.status)
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setData('text/plain', step.status)
                  }}
                  onDragOver={(e) => {
                    if (!canEdit || !draggedStatus) return
                    e.preventDefault()
                    if (dragOverStatus !== step.status) setDragOverStatus(step.status)
                  }}
                  onDrop={(e) => {
                    if (!canEdit) return
                    e.preventDefault()
                    const source = draggedStatus || e.dataTransfer.getData('text/plain')
                    if (source && source !== step.status) {
                      reorderStepByStatus(source, step.status)
                    }
                    setDraggedStatus(null)
                    setDragOverStatus(null)
                  }}
                  onDragEnd={() => {
                    setDraggedStatus(null)
                    setDragOverStatus(null)
                  }}
                  onClick={() => setSelectedStatus(step.status)}
                  className={`${!step.enabled ? 'retwf-row-disabled' : ''} ${
                    selectedStep?.status === step.status ? 'retwf-row-selected' : ''
                  }`}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="retwf-row-order-cell">
                      {canEdit && <GripVertical size={13} className="retwf-drag-grip" aria-hidden="true" />}
                      <span className="tabular-nums">{String(idx + 1).padStart(2, '0')}</span>
                      {canEdit && (
                        <div className="retwf-row-order-btns">
                          <button
                            type="button"
                            className="retwf-mini-icon-btn"
                            disabled={idx === 0}
                            onClick={() => moveStepByOffset(step.status, -1)}
                            aria-label={`Subir ${step.status}`}
                          >
                            <ArrowUp size={11} />
                          </button>
                          <button
                            type="button"
                            className="retwf-mini-icon-btn"
                            disabled={idx === activeConfig.steps.length - 1}
                            onClick={() => moveStepByOffset(step.status, 1)}
                            aria-label={`Bajar ${step.status}`}
                          >
                            <ArrowDown size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  </td>

                  <td>
                    <div className="ret-primary-cell">
                      <strong>{step.status}</strong>
                      <span className="ret-meta-text tabular-nums">
                        {isInitial ? 'Estado inicial · ' : ''}
                        {liveCount} {liveCount === 1 ? 'expediente activo' : 'expedientes activos'}
                      </span>
                    </div>
                  </td>

                  <td onClick={(e) => e.stopPropagation()}>
                    <label className="retwf-switch">
                      <input
                        type="checkbox"
                        checked={step.enabled}
                        disabled={!canEdit || isInitial}
                        onChange={(e) =>
                          updateStepRule(step.status, { enabled: e.target.checked })
                        }
                        aria-label={`Habilitar estado ${step.status}`}
                      />
                      <span>{step.enabled ? 'Activo' : 'Omitido'}</span>
                    </label>
                  </td>

                  <td onClick={(e) => e.stopPropagation()}>
                    <label className="retwf-switch">
                      <input
                        type="checkbox"
                        checked={step.isFinalState}
                        disabled={!canEdit || !step.enabled || isInitial}
                        onChange={(e) =>
                          updateStepRule(step.status, { isFinalState: e.target.checked })
                        }
                        aria-label={`Marcar ${step.status} como estado final`}
                      />
                      <span className={step.isFinalState ? 'retwf-final-checked-label' : ''}>
                        {step.isFinalState ? 'Final (bloquea edición)' : 'Editable'}
                      </span>
                    </label>
                  </td>

                  <td onClick={(e) => e.stopPropagation()}>
                    <label className="retwf-switch">
                      <input
                        type="checkbox"
                        checked={step.requiresApproval}
                        disabled={!canEdit || !step.enabled || isInitial}
                        onChange={(e) =>
                          updateStepRule(step.status, { requiresApproval: e.target.checked })
                        }
                        aria-label={`Requerir aprobación para entrar a ${step.status}`}
                      />
                      <span className={step.requiresApproval ? 'retwf-approval-on' : ''}>
                        {step.requiresApproval ? (
                          <>
                            <ShieldCheck size={12} aria-hidden="true" /> Requiere aprobación
                          </>
                        ) : (
                          'Directo'
                        )}
                      </span>
                    </label>
                  </td>

                  <td onClick={(e) => e.stopPropagation()}>
                    {step.requiresApproval && step.enabled ? (
                      <div className="retwf-approver-controls">
                        <select
                          value={step.approverRole}
                          disabled={!canEdit}
                          className="ret-inline-select"
                          aria-label={`Rol aprobador para ${step.status}`}
                          onChange={(e) =>
                            updateStepRule(step.status, {
                              approverRole: e.target.value as WorkflowApproverRole,
                            })
                          }
                        >
                          {WORKFLOW_APPROVER_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                        <div className="retwf-threshold-input">
                          <span>≥ $</span>
                          <input
                            type="number"
                            min={0}
                            step={500}
                            disabled={!canEdit}
                            value={step.approvalThresholdAmount}
                            aria-label={`Umbral mínimo MXN para requerir aprobación en ${step.status}`}
                            onChange={(e) =>
                              updateStepRule(step.status, {
                                approvalThresholdAmount: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                          />
                        </div>
                        <small className="ret-meta-text">
                          {step.approvalThresholdAmount === 0
                            ? 'Aplica a cualquier monto'
                            : `Solo ≥ ${formatCurrencyThreshold(step.approvalThresholdAmount)}`}
                        </small>
                      </div>
                    ) : (
                      <span className="ret-meta-text">Sin restricción de rol</span>
                    )}
                  </td>

                  <td onClick={(e) => e.stopPropagation()}>
                    {!step.enabled ? (
                      <span className="ret-meta-text">Estado deshabilitado</span>
                    ) : step.isFinalState ? (
                      <span className="ret-meta-text">Estado final (sin salidas)</span>
                    ) : (
                      <div className="retwf-transitions-grid">
                        {possibleTargets.map((targetSt) => {
                          const targetRule = activeConfig.steps.find((s) => s.status === targetSt)
                          const targetEnabled = Boolean(targetRule?.enabled)
                          const checked =
                            targetEnabled &&
                            (step.allowedNextStatuses as string[]).includes(targetSt)
                          return (
                            <button
                              key={targetSt}
                              type="button"
                              disabled={!canEdit || !targetEnabled}
                              className={`retwf-trans-btn ${checked ? 'is-active' : ''}`}
                              onClick={() =>
                                toggleAllowedTransition(step.status as string, targetSt as string)
                              }
                              title={
                                targetEnabled
                                  ? `Permitir pasar de "${step.status}" a "${targetSt}"`
                                  : `Estado destino "${targetSt}" deshabilitado`
                              }
                            >
                              {checked ? <Check size={11} /> : null}
                              <span>{targetSt}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
