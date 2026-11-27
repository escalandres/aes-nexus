export type WorkspaceSetupStepId =
  | 'org_structure'
  | 'commercial_directory'
  | 'sales_purchases'
  | 'finance_budgets'
  | 'governance_help'

export interface WorkspaceSetupPersistedState {
  latchedMilestones: Partial<Record<WorkspaceSetupStepId, boolean>>
  manualOverrides: Partial<Record<WorkspaceSetupStepId, boolean>>
  updatedAt: string
}

export interface WorkspaceSetupStepView {
  id: WorkspaceSetupStepId
  order: number
  title: string
  description: string
  evidenceText: string
  autoCompleted: boolean
  completed: boolean
  isManualOverride: boolean
  targetLabel: string
}

export const WORKSPACE_SETUP_STORAGE_KEY = 'aes_nexus_workspace_setup_v1'

export const DEFAULT_WORKSPACE_SETUP_STATE: WorkspaceSetupPersistedState = {
  latchedMilestones: {},
  manualOverrides: {},
  updatedAt: '',
}

const VALID_STEP_IDS: WorkspaceSetupStepId[] = [
  'org_structure',
  'commercial_directory',
  'sales_purchases',
  'finance_budgets',
  'governance_help',
]

export function loadWorkspaceSetupState(): WorkspaceSetupPersistedState {
  if (typeof window === 'undefined') return DEFAULT_WORKSPACE_SETUP_STATE
  try {
    const raw = window.localStorage.getItem(WORKSPACE_SETUP_STORAGE_KEY)
    if (!raw) return DEFAULT_WORKSPACE_SETUP_STATE
    const parsed = JSON.parse(raw) as Partial<WorkspaceSetupPersistedState>
    const latchedMilestones: Partial<Record<WorkspaceSetupStepId, boolean>> = {}
    const manualOverrides: Partial<Record<WorkspaceSetupStepId, boolean>> = {}

    for (const id of VALID_STEP_IDS) {
      if (typeof parsed.latchedMilestones?.[id] === 'boolean') {
        latchedMilestones[id] = parsed.latchedMilestones[id]
      }
      if (typeof parsed.manualOverrides?.[id] === 'boolean') {
        manualOverrides[id] = parsed.manualOverrides[id]
      }
    }

    return {
      latchedMilestones,
      manualOverrides,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    }
  } catch {
    return DEFAULT_WORKSPACE_SETUP_STATE
  }
}

export function saveWorkspaceSetupState(state: WorkspaceSetupPersistedState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(WORKSPACE_SETUP_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore storage quota errors
  }
}
