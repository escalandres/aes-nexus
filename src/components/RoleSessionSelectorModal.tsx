import { useState, useMemo, useEffect } from 'react'
import {
  ShieldCheck,
  Warehouse,
  ShoppingBag,
  Landmark,
  UserCheck,
  Check,
  LogIn,
  X,
  LockKeyhole,
  Layers,
} from 'lucide-react'
import {
  getWorkspaceUserRoleIds,
  isGeneralAdminRole,
  type RoleDefinition,
  type RoleKey,
  type WorkspaceUserRecord,
} from '../data/settings'
import {
  MODULE_SECTIONS,
  canAccessModule,
  resolveEffectiveAccess,
} from '../data/accessControl'

interface RoleSessionSelectorModalProps {
  isOpen: boolean
  mode: 'modal' | 'gate'
  roleDefinitions: RoleDefinition[]
  workspaceUsers: WorkspaceUserRecord[]
  currentUserId: string
  currentRoleId: RoleKey | 'COMBINED'
  onClose?: () => void
  onConfirmSession: (selection: {
    userId: string
    roleSelection: RoleKey | 'COMBINED'
  }) => void
}

const getRoleIcon = (role: RoleDefinition) => {
  if (isGeneralAdminRole(role)) return ShieldCheck
  if (role.builtInKey === 'ops' || role.id === 'Operaciones') return Warehouse
  if (role.builtInKey === 'sales' || role.id === 'Ventas') return ShoppingBag
  if (role.builtInKey === 'fin' || role.id === 'Finanzas') return Landmark
  return UserCheck
}

export function RoleSessionSelectorModal({
  isOpen,
  mode,
  roleDefinitions,
  workspaceUsers,
  currentUserId,
  currentRoleId,
  onClose,
  onConfirmSession,
}: RoleSessionSelectorModalProps) {
  const activeUsers = useMemo(
    () => workspaceUsers.filter((u) => u.status === 'active'),
    [workspaceUsers]
  )

  const defaultUser = useMemo(() => {
    return (
      activeUsers.find((u) => u.id === currentUserId) ||
      activeUsers[0] ||
      workspaceUsers[0]
    )
  }, [activeUsers, workspaceUsers, currentUserId])

  const [selectedUserId, setSelectedUserId] = useState<string>(defaultUser?.id || 'usr_1')
  const [selectedRoleKey, setSelectedRoleKey] = useState<RoleKey | 'COMBINED'>(currentRoleId)

  useEffect(() => {
    if (!isOpen) return
    setSelectedUserId(defaultUser?.id || 'usr_1')
    setSelectedRoleKey(currentRoleId)
  }, [isOpen, defaultUser?.id, currentRoleId])

  useEffect(() => {
    if (!isOpen || mode !== 'modal' || !onClose) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, mode, onClose])

  const selectedUser = useMemo(
    () =>
      workspaceUsers.find((u) => u.id === selectedUserId) ||
      defaultUser,
    [workspaceUsers, selectedUserId, defaultUser]
  )

  const validRoleIds = useMemo(
    () => new Set(roleDefinitions.map((r) => r.id)),
    [roleDefinitions]
  )

  const selectedUserRoles = useMemo(() => {
    if (!selectedUser) return []
    return getWorkspaceUserRoleIds(selectedUser, validRoleIds)
  }, [selectedUser, validRoleIds])

  if (!isOpen) return null

  const getAccessibleModulesSummary = (rolesToCheck: RoleKey[]) => {
    const { isFullAdmin, capabilities } = resolveEffectiveAccess(rolesToCheck, roleDefinitions, true)
    if (isFullAdmin) return 'Acceso total a todos los módulos'
    const moduleNames = (Object.keys(MODULE_SECTIONS) as Array<keyof typeof MODULE_SECTIONS>).filter(
      (mod) => canAccessModule(mod, capabilities, false, true)
    )
    if (moduleNames.length === 0) return 'Solo vista general de Inicio'
    return `Módulos: Inicio, ${moduleNames.join(', ')}`
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    onConfirmSession({
      userId: selectedUser.id,
      roleSelection: selectedRoleKey,
    })
  }

  const dialogBody = (
    <section
      className={`role-login-card ${mode === 'gate' ? 'is-gate' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-login-title"
    >
      <div className="role-login-head">
        <div>
          <div className="panel-kicker">
            <LockKeyhole size={12} /> AES NEXUS · CONTROL DE ACCESO
          </div>
          <h2 id="role-login-title">
            {mode === 'gate'
              ? 'Iniciar sesión · Selecciona tu rol'
              : 'Iniciar sesión con otro rol'}
          </h2>
          <p>
            Elige el rol con el que deseas operar en el sistema. Los módulos, acciones y vistas se ajustarán de inmediato a los permisos del rol seleccionado.
          </p>
        </div>
        {mode === 'modal' && onClose && (
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Cerrar selector de rol"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="role-login-form">
        <label className="form-field">
          <span>Usuario de la sesión</span>
          <select
            value={selectedUser?.id || ''}
            onChange={(e) => {
              const nextUserId = e.target.value
              setSelectedUserId(nextUserId)
              const nextUser = workspaceUsers.find((u) => u.id === nextUserId)
              if (nextUser) {
                const nextRoles = getWorkspaceUserRoleIds(nextUser, validRoleIds)
                if (nextRoles.length > 1) {
                  setSelectedRoleKey('COMBINED')
                } else if (nextRoles.length === 1) {
                  setSelectedRoleKey(nextRoles[0])
                }
              }
            }}
          >
            {activeUsers.map((usr) => {
              const uRoles = getWorkspaceUserRoleIds(usr, validRoleIds)
              const roleNames = uRoles
                .map((rid) => roleDefinitions.find((r) => r.id === rid)?.name || rid)
                .join(', ')
              return (
                <option key={usr.id} value={usr.id}>
                  {usr.name} ({roleNames || 'Sin rol'})
                </option>
              )
            })}
          </select>
        </label>

        <div className="role-login-options-section">
          <div className="role-login-options-header">
            <span>Selecciona el rol para iniciar sesión *</span>
            <small>{roleDefinitions.length} roles configurados</small>
          </div>

          <div className="role-login-options-grid" role="radiogroup" aria-label="Roles disponibles">
            {selectedUserRoles.length > 1 && (
              <button
                type="button"
                role="radio"
                aria-checked={selectedRoleKey === 'COMBINED'}
                className={`role-login-option-card ${selectedRoleKey === 'COMBINED' ? 'active' : ''}`}
                onClick={() => setSelectedRoleKey('COMBINED')}
              >
                <div className="role-login-option-top">
                  <span className="role-login-option-icon">
                    <Layers size={15} />
                  </span>
                  <div className="role-login-option-title-wrap">
                    <strong>Todos mis roles asignados ({selectedUserRoles.length})</strong>
                    <small>
                      {selectedUserRoles
                        .map((rid) => roleDefinitions.find((r) => r.id === rid)?.name || rid)
                        .join(' + ')}
                    </small>
                  </div>
                  {selectedRoleKey === 'COMBINED' && (
                    <span className="role-login-check">
                      <Check size={14} />
                    </span>
                  )}
                </div>
                <span className="role-login-option-scope">
                  {getAccessibleModulesSummary(selectedUserRoles)}
                </span>
              </button>
            )}

            {roleDefinitions.map((role) => {
              const Icon = getRoleIcon(role)
              const isSelected = selectedRoleKey === role.id
              const isAssigned = selectedUserRoles.includes(role.id)
              return (
                <button
                  key={role.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`role-login-option-card ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedRoleKey(role.id)}
                >
                  <div className="role-login-option-top">
                    <span className="role-login-option-icon">
                      <Icon size={15} />
                    </span>
                    <div className="role-login-option-title-wrap">
                      <div className="role-login-title-line">
                        <strong>{role.name}</strong>
                        {isAssigned && <span className="role-assigned-tag">Asignado</span>}
                      </div>
                      <small>{role.description}</small>
                    </div>
                    {isSelected && (
                      <span className="role-login-check">
                        <Check size={14} />
                      </span>
                    )}
                  </div>
                  <span className="role-login-option-scope">
                    {role.capabilities.length} permisos · {getAccessibleModulesSummary([role.id])}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="role-login-actions">
          {mode === 'modal' && onClose && (
            <button
              type="button"
              className="button button-secondary"
              onClick={onClose}
            >
              Cancelar
            </button>
          )}
          <button type="submit" className="button button-primary">
            <LogIn size={14} /> Iniciar sesión con este rol
          </button>
        </div>
      </form>
    </section>
  )

  if (mode === 'gate') {
    return <div className="role-login-gate-backdrop">{dialogBody}</div>
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && onClose) onClose()
      }}
    >
      {dialogBody}
    </div>
  )
}
