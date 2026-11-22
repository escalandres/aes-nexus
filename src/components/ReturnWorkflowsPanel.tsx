import { useEffect, useMemo, useState } from 'react'
import {
  GitBranch,
  ShieldCheck,
  Check,
  RotateCcw,
  ArrowRight,
  Lock,
  AlertTriangle,
  SlidersHorizontal,
  Save,
  ExternalLink,
} from 'lucide-react'
import {
  ALL_CUSTOMER_RETURN_STATUSES,
  ALL_SUPPLIER_RETURN_STATUSES,
  DEFAULT_RETURN_WORKFLOWS,
  WORKFLOW_APPROVER_ROLES,
  buildReturnWorkflowPreset,
  cloneReturnWorkflows,
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

  useEffect(() => {
    setDraft(cloneReturnWorkflows(workflows))
  }, [workflows])

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(workflows),
    [draft, workflows]
  )

  const summaryStats = useMemo(() => {
    const customerApprovals = draft.customer.steps.filter((s) => s.enabled && s.requiresApproval).length
    const supplierApprovals = draft.supplier.steps.filter((s) => s.enabled && s.requiresApproval).length
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
    const activeUpdatedAt =
      activeEntity === 'customer' ? draft.customer.updatedAtIso : draft.supplier.updatedAtIso
    return {
      customerApprovals,
      supplierApprovals,
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
  }, [draft, customerReturns, supplierReturns, activeEntity])

  const activeConfig = activeEntity === 'customer' ? draft.customer : draft.supplier
  const allStatuses =
    activeEntity === 'customer' ? ALL_CUSTOMER_RETURN_STATUSES : ALL_SUPPLIER_RETURN_STATUSES

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

      const nextSteps = cfg.steps.map((step) => {
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
        if (updated.isFinalState && patch.isFinalState === true && cfg.initialStatus === status) {
          toast.warning(
            'El estado inicial al crear no puede marcarse simultáneamente como estado final.',
            'Regla de flujo'
          )
          return step
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

  const handleApplyPreset = (preset: ReturnWorkflowPresetKey) => {
    if (!canEdit) return
    setDraft((prev) => {
      const built = buildReturnWorkflowPreset(activeEntity, preset, currentUserName)
      return activeEntity === 'customer'
        ? {
            ...prev,
            customer: built as ReturnWorkflowsSettings['customer'],
          }
        : {
            ...prev,
            supplier: built as ReturnWorkflowsSettings['supplier'],
          }
    })
    const presetLabel =
      preset === 'strict_final'
        ? 'Control estricto en estados finales'
        : preset === 'agile'
        ? 'Operación ágil por umbral'
        : 'Estándar balanceado'
    toast.info(
      `Plantilla "${presetLabel}" cargada en borrador. Presiona "Guardar cambios" para aplicarla.`,
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

    // Validate both customer and supplier workflows before saving
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

    const custApprovalList = payload.customer.steps
      .filter((s) => s.enabled && s.requiresApproval)
      .map((s) => `${s.status} (${s.approverRole})`)
    const supApprovalList = payload.supplier.steps
      .filter((s) => s.enabled && s.requiresApproval)
      .map((s) => `${s.status} (${s.approverRole})`)

    const summaryDetail = `Cliente [${custApprovalList.length > 0 ? custApprovalList.join(', ') : 'sin aprobaciones obligatorias'}] · Proveedor [${supApprovalList.length > 0 ? supApprovalList.join(', ') : 'sin aprobaciones obligatorias'}]`
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

  return (
    <div className="finance-section-container retwf-container">
      {/* Header strip */}
      <div className="ops-header-strip retwf-header">
        <div className="ops-header-left">
          <div className="ops-icon-box fin-icon-box">
            <GitBranch size={20} />
          </div>
          <div>
            <h2>Flujos de Trabajo de Devoluciones</h2>
            <p>
              Define las transiciones permitidas entre estados, aprobadores por rol y candados financieros para{' '}
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
          <span className="ret-kpi-label">TRANSICIONES CONFIGURADAS</span>
          <strong className="ret-kpi-val tabular-nums">{summaryStats.totalTransitions}</strong>
          <small>Rutas válidas activas entre etapas</small>
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

      {/* Visual Pipeline Strip */}
      <section className="retwf-pipeline-panel" aria-label="Vista previa de secuencia de estados">
        <div className="retwf-pipeline-head">
          <div>
            <h3>Secuencia activa de estados</h3>
            <p>
              Mapa operativo de etapas habilitadas, controles de aprobación y estados terminales para{' '}
              {activeEntity === 'customer' ? 'Devoluciones de cliente' : 'Devoluciones de proveedor'}.
            </p>
          </div>

          <div className="retwf-global-rules">
            <label className="retwf-inline-field">
              <span>Estado inicial al crear</span>
              <select
                value={activeConfig.initialStatus}
                disabled={!canEdit}
                onChange={(e) => {
                  const nextInit = e.target.value
                  updateActiveConfig((cfg) => ({
                    ...cfg,
                    initialStatus: nextInit,
                  }))
                }}
              >
                {activeConfig.steps
                  .filter((s) => s.enabled && !s.isFinalState)
                  .map((s) => (
                    <option key={s.status} value={s.status}>
                      {s.status}
                    </option>
                  ))}
              </select>
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
          </div>
        </div>

        <div className="retwf-pipeline-track">
          {activeConfig.steps.map((step, index) => {
            const isInitial = activeConfig.initialStatus === step.status
            const liveCount = liveCountsByStatus.get(step.status) || 0
            const pendingCount = pendingByTargetStatus.get(step.status) || 0
            return (
              <div key={step.status} className="retwf-pipeline-node-wrap">
                <div
                  className={`retwf-pipeline-node ${!step.enabled ? 'is-disabled' : ''} ${
                    step.isFinalState ? 'is-final' : ''
                  } ${isInitial ? 'is-initial' : ''}`}
                >
                  <div className="retwf-node-top">
                    <span className="retwf-node-kind">
                      {!step.enabled
                        ? 'Desactivado'
                        : isInitial
                        ? 'Inicio'
                        : step.isFinalState
                        ? 'Estado final'
                        : 'Etapa'}
                    </span>
                    <span className="retwf-node-count tabular-nums" title="Expedientes actualmente en este estado">
                      {liveCount} exp.
                    </span>
                  </div>
                  <strong className="retwf-node-title">{step.status}</strong>
                  <div className="retwf-node-meta">
                    {step.requiresApproval ? (
                      <span className="retwf-node-lock">
                        <Lock size={11} aria-hidden="true" /> Aprob. {step.approverRole}
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
                </div>
                {index < activeConfig.steps.length - 1 && (
                  <ArrowRight size={14} className="retwf-pipeline-arrow" aria-hidden="true" />
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Matrix Rules Table */}
      <div className="ret-table-wrap">
        <table className="ret-table retwf-rules-table">
          <thead>
            <tr>
              <th>Estado y uso actual</th>
              <th>Habilitado</th>
              <th>Estado final</th>
              <th>Control de aprobación</th>
              <th>Rol aprobador y umbral MXN</th>
              <th>Validaciones de entrada</th>
              <th>Transiciones permitidas desde este estado</th>
            </tr>
          </thead>
          <tbody>
            {activeConfig.steps.map((step) => {
              const isInitial = activeConfig.initialStatus === step.status
              const liveCount = liveCountsByStatus.get(step.status) || 0
              const possibleTargets = allStatuses.filter((st) => st !== step.status)

              return (
                <tr key={step.status} className={!step.enabled ? 'retwf-row-disabled' : ''}>
                  <td>
                    <div className="ret-primary-cell">
                      <strong>{step.status}</strong>
                      <span className="ret-meta-text tabular-nums">
                        {isInitial ? 'Estado inicial · ' : ''}
                        {liveCount} {liveCount === 1 ? 'expediente activo' : 'expedientes activos'}
                      </span>
                    </div>
                  </td>

                  <td>
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

                  <td>
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
                      <span>{step.isFinalState ? 'Final' : 'Intermedio'}</span>
                    </label>
                  </td>

                  <td>
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

                  <td>
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

                  <td>
                    <div className="retwf-entry-checks">
                      <label>
                        <input
                          type="checkbox"
                          checked={step.requireNotesOnEntry}
                          disabled={!canEdit || !step.enabled}
                          onChange={(e) =>
                            updateStepRule(step.status, { requireNotesOnEntry: e.target.checked })
                          }
                        />
                        <span>Exigir notas</span>
                      </label>
                      {activeEntity === 'supplier' && (
                        <label>
                          <input
                            type="checkbox"
                            checked={Boolean(step.requireDocumentRefOnEntry)}
                            disabled={!canEdit || !step.enabled}
                            onChange={(e) =>
                              updateStepRule(step.status, {
                                requireDocumentRefOnEntry: e.target.checked,
                              })
                            }
                          />
                          <span>Exigir RMA proveedor</span>
                        </label>
                      )}
                    </div>
                  </td>

                  <td>
                    {!step.enabled ? (
                      <span className="ret-meta-text">Estado deshabilitado</span>
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
