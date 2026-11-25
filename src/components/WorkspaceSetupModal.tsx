import {
  ArrowRight,
  Check,
  CheckCheck,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react'
import type {
  WorkspaceSetupStepId,
  WorkspaceSetupStepView,
} from '../data/workspaceSetup'

interface WorkspaceSetupModalProps {
  isOpen: boolean
  workspaceName: string
  steps: WorkspaceSetupStepView[]
  completedCount: number
  totalCount: number
  progressPercent: number
  onClose: () => void
  onToggleStep: (stepId: WorkspaceSetupStepId) => void
  onNavigateStep: (stepId: WorkspaceSetupStepId) => void
  onCompleteAll: () => void
  onResetProgress: () => void
}

export function WorkspaceSetupModal({
  isOpen,
  workspaceName,
  steps,
  completedCount,
  totalCount,
  progressPercent,
  onClose,
  onToggleStep,
  onNavigateStep,
  onCompleteAll,
  onResetProgress,
}: WorkspaceSetupModalProps) {
  if (!isOpen) return null

  const isAllComplete = completedCount === totalCount
  const remainingCount = Math.max(0, totalCount - completedCount)

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <section
        className="create-modal setup-checklist-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-setup-modal-title"
      >
        <div className="create-modal-heading">
          <div>
            <div className="panel-kicker">PUESTA EN MARCHA · {workspaceName.toUpperCase()}</div>
            <h2 id="workspace-setup-modal-title">
              {isAllComplete ? 'Tu espacio está 100% configurado' : 'Completa la puesta en marcha'}
            </h2>
            <p>
              El avance se actualiza automáticamente conforme operas los módulos del ERP, o puedes marcar y ajustar pasos manualmente.
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            aria-label="Cerrar checklist"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        <div className={`setup-summary-banner ${isAllComplete ? 'is-complete' : ''}`}>
          <div className="setup-summary-top">
            <div className="setup-summary-title">
              {isAllComplete ? <CheckCircle2 size={16} /> : <Sparkles size={16} />}
              <span>
                {isAllComplete
                  ? 'Configuración operativa completa'
                  : `${completedCount} de ${totalCount} pasos completados · faltan ${remainingCount}`}
              </span>
            </div>
            <strong className="setup-summary-pct">{progressPercent}%</strong>
          </div>
          <div className="progress-track setup-modal-track" aria-hidden="true">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="setup-steps-list" role="list">
          {steps.map((step) => {
            const stepLabel = String(step.order).padStart(2, '0')
            const originTag = step.completed
              ? step.isManualOverride
                ? 'Marcado manual'
                : 'Detectado en el ERP'
              : 'Pendiente'
            return (
              <article
                key={step.id}
                role="listitem"
                className={`setup-step-card ${step.completed ? 'completed' : 'pending'}`}
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={step.completed}
                  aria-label={`${step.completed ? 'Reabrir' : 'Completar'} paso ${step.order}: ${step.title}`}
                  className={`setup-step-check ${step.completed ? 'checked' : ''}`}
                  onClick={() => onToggleStep(step.id)}
                >
                  {step.completed ? <Check size={13} strokeWidth={2.6} /> : <span>{stepLabel}</span>}
                </button>

                <div className="setup-step-body">
                  <div className="setup-step-top">
                    <h3>{step.title}</h3>
                    <span className={`setup-step-state ${step.completed ? 'done' : 'todo'}`}>
                      {originTag}
                    </span>
                  </div>
                  <p>{step.description}</p>
                  <div className="setup-step-foot">
                    <small>{step.evidenceText}</small>
                    <button
                      type="button"
                      className="setup-step-nav-btn"
                      onClick={() => onNavigateStep(step.id)}
                    >
                      <span>{step.targetLabel}</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        <div className="create-modal-actions setup-modal-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={onResetProgress}
          >
            <RotateCcw size={13} />
            <span>Restablecer seguimiento</span>
          </button>

          <div className="setup-modal-actions-right">
            {!isAllComplete && (
              <button
                type="button"
                className="button button-secondary"
                onClick={onCompleteAll}
              >
                <CheckCheck size={14} />
                <span>Marcar todo listo</span>
              </button>
            )}
            <button
              type="button"
              className="button button-primary"
              onClick={onClose}
            >
              <span>Listo</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
