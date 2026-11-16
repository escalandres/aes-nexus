import { useState, useMemo, useEffect } from 'react'
import {
  Settings2,
  Building2,
  Globe2,
  UserRoundPlus,
  ShieldCheck,
  LockKeyhole,
  Palette,
  Mail,
  ClipboardList,
  Plug,
  CreditCard,
  Check,
  CheckCircle2,
  Plus,
  Trash2,
  MapPin,
  Phone,
  ExternalLink,
  Moon,
  Sun,
  Laptop,
  X,
  Building,
  UserCheck,
  Download,
  Search,
  RotateCcw,
  RefreshCw,
} from 'lucide-react'
import { useToast } from './Toast'
import CountryDropdown from './CountryDropdown'
import { CountryFlag } from './CountryFlag'
import { useI18n } from '../i18n/I18nContext'
import { SUPPORTED_LANGUAGES } from '../i18n/translations'
import type { SupportedLocale } from '../i18n/types'
import type { Warehouse } from '../data/operations'
import type { PhysicalLocationRecord, LocationType } from './AdministrationSection'
import {
  ALL_CAPABILITIES,
  DEFAULT_INTEGRATIONS,
  DEFAULT_PLAN_SETTINGS,
  DEFAULT_ROLE_PERMISSIONS,
  INITIAL_AUDIT_EVENTS,
  ROLES_CHANGED_EVENT,
  STORAGE_KEYS,
  USERS_CHANGED_EVENT,
  appendAuditLog,
  isGeneralAdminRole,
  loadStoredRoleDefinitions,
  loadStoredWorkspaceUsers,
  readStoredJson,
  writeStoredJson,
  type AuditEventRecord,
  type BuiltInRoleKey,
  type IntegrationConfig,
  type IntegrationId,
  type PlanSubscriptionSettings,
  type PlanTier,
  type RoleCapabilityId,
  type RoleDefinition,
  type RoleKey,
  type WorkspaceUserRecord,
} from '../data/settings'
import { canAccessSection } from '../data/accessControl'

export interface GeneralSettings {
  workspaceName: string
  slug: string
  description: string
  mainCountry: string
  reportingCurrency: string
  primaryEmail: string
  phone: string
  website: string
  avatarColor: string
}

export interface OrganizationSettings {
  legalName: string
  tradeName: string
  rfc: string
  taxRegime: string
  fiscalStreet: string
  fiscalColony: string
  fiscalZip: string
  fiscalCity: string
  fiscalState: string
  fiscalCountry: string
  legalRep: string
  certificateStatus: 'valid' | 'expiring' | 'none'
  branches: Array<{
    id: string
    name: string
    type: string
    city: string
    address: string
    isMain: boolean
  }>
}

export interface RegionalSettings {
  language: string
  timezone: string
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
  numberFormat: 'comma_dot' | 'dot_comma'
  firstDayOfWeek: 'monday' | 'sunday'
}

export type UserMember = WorkspaceUserRecord

export interface SecuritySettings {
  twoFactorEnabled: boolean
  sessionTimeoutMinutes: number
  enforcePasswordExpiry: boolean
  recentSessions: Array<{
    id: string
    device: string
    browser: string
    ip: string
    location: string
    lastActive: string
    isCurrent: boolean
  }>
}

export interface SettingsSectionProps {
  activeSetting: string
  onSelectSetting: (setting: string) => void
  accentTheme: string
  onSelectAccentTheme: (themeId: string) => void
  darkMode: boolean
  onToggleDarkMode: () => void
  accentOptions: ReadonlyArray<{ id: string; label: string; color: string; description: string }>
  warehouses?: Warehouse[]
  locations?: PhysicalLocationRecord[]
  onAddLocation?: (loc: PhysicalLocationRecord) => void
  onRemoveLocation?: (locationId: string) => void
  onNavigateAdminLocations?: () => void
  onWorkspaceMetaChange?: (meta: { workspaceName: string; avatarColor: string }) => void
  receivablesCount?: number
  activeCapabilities?: Set<RoleCapabilityId>
  isFullAdmin?: boolean
  isAccountActive?: boolean
}

const WORKSPACE_AVATAR_SWATCHES = ['#456a61', '#3f6f9f', '#7860a6', '#b96e56', '#2d4739'] as const

export function SettingsSection({
  activeSetting,
  onSelectSetting,
  accentTheme,
  onSelectAccentTheme,
  darkMode,
  onToggleDarkMode,
  accentOptions,
  warehouses = [],
  locations = [],
  onAddLocation,
  onRemoveLocation,
  onNavigateAdminLocations,
  onWorkspaceMetaChange,
  receivablesCount = 0,
  activeCapabilities,
  isFullAdmin = true,
  isAccountActive = true,
}: SettingsSectionProps) {
  const toast = useToast()
  const {
    regional,
    updateRegional,
    mainCountry,
    mainCountryName,
    countryTimezones,
    updateGeneralLocalization,
    t,
    formatCurrency,
    formatDate,
    formatTime,
  } = useI18n()

  // 1. GENERAL SETTINGS
  const [general, setGeneral] = useState<GeneralSettings>(() => {
    try {
      const saved = localStorage.getItem('aes_nexus_settings_general')
      if (saved) return JSON.parse(saved)
    } catch {
      // fallback
    }
    return {
      workspaceName: 'Brújula Estudio',
      slug: 'brujula-estudio',
      description: 'Estudio de arquitectura, diseño industrial y tecnología aplicada para proyectos comerciales y corporativos.',
      mainCountry: 'México',
      reportingCurrency: 'MXN',
      primaryEmail: 'contacto@brujulaestudio.mx',
      phone: '+52 (55) 4162-8900',
      website: 'https://brujulaestudio.mx',
      avatarColor: '#456a61',
    }
  })

  // 2. ORGANIZATION SETTINGS
  const [org, setOrg] = useState<OrganizationSettings>(() => {
    try {
      const saved = localStorage.getItem('aes_nexus_settings_org')
      if (saved) return JSON.parse(saved)
    } catch {
      // fallback
    }
    return {
      legalName: 'Brújula Arquitectura & Tecnología S.A.P.I. de C.V.',
      tradeName: 'Brújula Estudio',
      rfc: 'BAT1904128N2',
      taxRegime: '601 - General de Ley Personas Morales',
      fiscalStreet: 'Av. Insurgentes Sur 1458, Piso 7',
      fiscalColony: 'Actipan, Benito Juárez',
      fiscalZip: '03230',
      fiscalCity: 'Ciudad de México',
      fiscalState: 'CDMX',
      fiscalCountry: 'México',
      legalRep: 'Andrea Morales Escala',
      certificateStatus: 'valid',
      branches: [
        {
          id: 'br_1',
          name: 'Sede Corporativa Insurgentes',
          type: 'Oficina corporativa',
          city: 'Ciudad de México',
          address: 'Av. Insurgentes Sur 1458, Piso 7',
          isMain: true,
        },
        {
          id: 'br_2',
          name: 'Almacén Logístico Central Vallejo',
          type: 'Centro de Distribución / Almacén',
          city: 'Ciudad de México',
          address: 'Calz. Vallejo 1020, Nave 4',
          isMain: false,
        },
        {
          id: 'br_3',
          name: 'Almacén Regional Norte Monterrey',
          type: 'Almacén / Punto Logístico',
          city: 'Monterrey, NL',
          address: 'Av. Gonzalitos 840, Col. Vista Hermosa',
          isMain: false,
        },
      ],
    }
  })

  // 3. REGIONAL SETTINGS synced via I18nContext

  // 4. USERS & ACCESS
  const [users, setUsers] = useState<UserMember[]>(() => loadStoredWorkspaceUsers())

  // 5. SECURITY SETTINGS
  const [security, setSecurity] = useState<SecuritySettings>(() => {
    try {
      const saved = localStorage.getItem('aes_nexus_settings_security')
      if (saved) return JSON.parse(saved)
    } catch {
      // fallback
    }
    return {
      twoFactorEnabled: true,
      sessionTimeoutMinutes: 30,
      enforcePasswordExpiry: false,
      recentSessions: [
        {
          id: 'ses_1',
          device: 'MacBook Pro 16"',
          browser: 'Chrome 131 · MacOS Sonoma',
          ip: '189.204.112.44',
          location: 'Ciudad de México, México',
          lastActive: 'Activa ahora',
          isCurrent: true,
        },
        {
          id: 'ses_2',
          device: 'iPhone 15 Pro',
          browser: 'Safari Mobile 18 · iOS',
          ip: '187.188.42.12',
          location: 'Ciudad de México, México',
          lastActive: 'Hace 2 horas',
          isCurrent: false,
        },
      ],
    }
  })

  // 6. NOTIFICATION PREFERENCES (Fully persisted & synchronized with push/email stock config)
  const [notifPreferences, setNotifPreferences] = useState(() => {
    let pushEnabled = true
    let audioChime = true
    let emailEnabled = true
    try {
      const savedPush = localStorage.getItem('nexus_stock_push_alerts_config')
      if (savedPush) {
        const parsed = JSON.parse(savedPush)
        pushEnabled = parsed.enabled !== false
        if (typeof parsed.sound === 'boolean') audioChime = parsed.sound
      }
      const savedEmail = localStorage.getItem('nexus_stock_email_alerts_config')
      if (savedEmail) emailEnabled = JSON.parse(savedEmail).enabled !== false
    } catch {
      // fallback
    }
    const savedNotif = readStoredJson(STORAGE_KEYS.notifications, {
      salesOrdersAlerts: true,
      receivablesAlerts: true,
      weeklySummaryEmail: true,
      audioChime,
    })
    return {
      pushStockAlerts: pushEnabled,
      emailStockAlerts: emailEnabled,
      salesOrdersAlerts: savedNotif.salesOrdersAlerts ?? true,
      receivablesAlerts: savedNotif.receivablesAlerts ?? true,
      weeklySummaryEmail: savedNotif.weeklySummaryEmail ?? true,
      audioChime: typeof savedNotif.audioChime === 'boolean' ? savedNotif.audioChime : audioChime,
    }
  })

  // Keep pushStockAlerts synchronized if toggled from Topbar or ExecutiveDashboard
  useEffect(() => {
    const onPushChanged = (e: Event) => {
      const custom = e as CustomEvent<{ enabled?: boolean }>
      if (custom.detail && typeof custom.detail.enabled === 'boolean') {
        setNotifPreferences((prev) => ({ ...prev, pushStockAlerts: custom.detail.enabled! }))
      }
    }
    window.addEventListener('nexus_push_config_changed', onPushChanged)
    return () => window.removeEventListener('nexus_push_config_changed', onPushChanged)
  }, [])

  // 7. ROLES & PERMISSIONS STATE
  const [roleDefinitions, setRoleDefinitions] = useState<RoleDefinition[]>(() =>
    loadStoredRoleDefinitions()
  )
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null)
  const [roleCapsDraft, setRoleCapsDraft] = useState<RoleCapabilityId[]>([])
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDesc, setNewRoleDesc] = useState('')
  const [newRoleCapsDraft, setNewRoleCapsDraft] = useState<RoleCapabilityId[]>([])

  // 8. INTEGRATIONS STATE
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>(() =>
    readStoredJson(STORAGE_KEYS.integrations, DEFAULT_INTEGRATIONS)
  )
  const [editingIntegration, setEditingIntegration] = useState<IntegrationConfig | null>(null)

  // 9. AUDIT TRAIL STATE
  const [auditEvents, setAuditEvents] = useState<AuditEventRecord[]>(() =>
    readStoredJson(STORAGE_KEYS.audit, INITIAL_AUDIT_EVENTS)
  )
  const [auditSearch, setAuditSearch] = useState('')
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<'all' | 'settings' | 'users' | 'security' | 'integrations' | 'ops'>('all')

  // 10. PLAN & BILLING STATE
  const [planSettings, setPlanSettings] = useState<PlanSubscriptionSettings>(() =>
    readStoredJson(STORAGE_KEYS.plan, DEFAULT_PLAN_SETTINGS)
  )

  const recordAudit = (entry: Omit<AuditEventRecord, 'id' | 'timestampIso'>) => {
    const next = appendAuditLog(entry)
    setAuditEvents(next)
  }

  // Modal for inviting user
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<RoleKey>('Operaciones')

  // Modal for new branch
  const [showBranchModal, setShowBranchModal] = useState(false)
  const [branchName, setBranchName] = useState('')
  const [branchType, setBranchType] = useState('Almacén / Punto Logístico')
  const [branchCity, setBranchCity] = useState('Guadalajara, JAL')
  const [branchAddress, setBranchAddress] = useState('')

  // Live preview clock & formatted sample date/number driven by I18nContext + timezone
  const livePreviewValues = useMemo(() => {
    const sampleAmount = 1450200.5
    const sampleDate = new Date()

    return {
      currency: formatCurrency(sampleAmount, general.reportingCurrency),
      date: formatDate(sampleDate),
      time: formatTime(sampleDate),
      weekStart:
        regional.firstDayOfWeek === 'monday'
          ? t('settings.regional.mondayShort')
          : t('settings.regional.sundayShort'),
    }
  }, [formatCurrency, formatDate, formatTime, general.reportingCurrency, regional.firstDayOfWeek, t])

  const getRoleLabel = (roleId: RoleKey) => {
    if (roleId === 'Administrador') return t('settings.roles.roleLabel.Administrador')
    if (roleId === 'Operaciones') return t('settings.roles.roleLabel.Operaciones')
    if (roleId === 'Ventas') return t('settings.roles.roleLabel.Ventas')
    if (roleId === 'Finanzas') return t('settings.roles.roleLabel.Finanzas')
    const found = roleDefinitions.find((r) => r.id === roleId)
    return found ? found.name : roleId
  }

  const getRoleCardTitle = (role: RoleDefinition) => {
    if (role.builtInKey === 'admin') return t('settings.roles.admin.name')
    if (role.builtInKey === 'ops') return t('settings.roles.ops.name')
    if (role.builtInKey === 'sales') return t('settings.roles.sales.name')
    if (role.builtInKey === 'fin') return t('settings.roles.fin.name')
    return role.name
  }

  const getRoleCardDesc = (role: RoleDefinition) => {
    if (role.builtInKey === 'admin') return t('settings.roles.admin.desc')
    if (role.builtInKey === 'ops') return t('settings.roles.ops.desc')
    if (role.builtInKey === 'sales') return t('settings.roles.sales.desc')
    if (role.builtInKey === 'fin') return t('settings.roles.fin.desc')
    return role.description || t('settings.roles.defaultCustomDesc')
  }

  const getCapabilityLabel = (capId: RoleCapabilityId) => {
    switch (capId) {
      case 'sysConfig': return t('settings.roles.cap.sysConfig')
      case 'manageUsers': return t('settings.roles.cap.manageUsers')
      case 'approvePurchases': return t('settings.roles.cap.approvePurchases')
      case 'fullReports': return t('settings.roles.cap.fullReports')
      case 'inventoryControl': return t('settings.roles.cap.inventoryControl')
      case 'adjustThresholds': return t('settings.roles.cap.adjustThresholds')
      case 'receiveGoods': return t('settings.roles.cap.receiveGoods')
      case 'stockLedger': return t('settings.roles.cap.stockLedger')
      case 'createQuotes': return t('settings.roles.cap.createQuotes')
      case 'issueOrders': return t('settings.roles.cap.issueOrders')
      case 'crmClients': return t('settings.roles.cap.crmClients')
      case 'pipelineReports': return t('settings.roles.cap.pipelineReports')
      case 'manageReceivables': return t('settings.roles.cap.manageReceivables')
      case 'schedulePayments': return t('settings.roles.cap.schedulePayments')
      case 'balanceReports': return t('settings.roles.cap.balanceReports')
      case 'expenseControl': return t('settings.roles.cap.expenseControl')
    }
  }

  const getIntegrationMeta = (id: IntegrationId) => {
    if (id === 'cfdi') {
      return {
        title: t('settings.integrations.int1.title'),
        category: t('settings.integrations.int1.cat'),
        desc: t('settings.integrations.int1.desc'),
      }
    }
    if (id === 'spei') {
      return {
        title: t('settings.integrations.int2.title'),
        category: t('settings.integrations.int2.cat'),
        desc: t('settings.integrations.int2.desc'),
      }
    }
    if (id === 'workspace') {
      return {
        title: t('settings.integrations.int3.title'),
        category: t('settings.integrations.int3.cat'),
        desc: t('settings.integrations.int3.desc'),
      }
    }
    return {
      title: t('settings.integrations.int4.title'),
      category: t('settings.integrations.int4.cat'),
      desc: t('settings.integrations.int4.desc'),
    }
  }

  const getAccentLabel = (id: string, fallback: string) => {
    if (id === 'green') return t('settings.appearance.accent.green.label')
    if (id === 'blue') return t('settings.appearance.accent.blue.label')
    if (id === 'purple') return t('settings.appearance.accent.purple.label')
    if (id === 'terracotta') return t('settings.appearance.accent.terracotta.label')
    return fallback
  }

  const getAccentDesc = (id: string, fallback: string) => {
    if (id === 'green') return t('settings.appearance.accent.green.desc')
    if (id === 'blue') return t('settings.appearance.accent.blue.desc')
    if (id === 'purple') return t('settings.appearance.accent.purple.desc')
    if (id === 'terracotta') return t('settings.appearance.accent.terracotta.desc')
    return fallback
  }

  // Synchronized organization sites: unified view backed by App locations + org.branches fallback
  const organizationSites = useMemo(() => {
    if (locations.length > 0) {
      return locations.map((loc, idx) => ({
        id: loc.id,
        name: loc.name,
        type: loc.type,
        city: `${loc.city}${loc.state ? `, ${loc.state}` : ''}`,
        address: loc.address,
        isMain: idx === 0 || loc.code === 'CORP-CDMX',
        syncedFromAdmin: true,
      }))
    }
    return org.branches.map((b) => ({ ...b, syncedFromAdmin: false }))
  }, [locations, org.branches])

  const activeWarehouses = useMemo(
    () => warehouses.filter((w) => w.active),
    [warehouses]
  )

  const filteredAuditEvents = useMemo(() => {
    const q = auditSearch.trim().toLowerCase()
    return auditEvents.filter((ev) => {
      const catMatch =
        auditCategoryFilter === 'all'
          ? true
          : auditCategoryFilter === 'ops'
          ? ev.category === 'inventory' || ev.category === 'sales'
          : ev.category === auditCategoryFilter
      if (!catMatch) return false
      if (!q) return true
      const actionText = ev.seedKey ? t(`settings.audit.${ev.seedKey}.action` as const) : ev.action
      const detailText = ev.seedKey ? t(`settings.audit.${ev.seedKey}.detail` as const) : ev.detail
      return (
        actionText.toLowerCase().includes(q) ||
        detailText.toLowerCase().includes(q) ||
        ev.user.toLowerCase().includes(q)
      )
    })
  }, [auditEvents, auditSearch, auditCategoryFilter, t])

  // SAVE HANDLERS
  const handleSaveGeneral = () => {
    localStorage.setItem(STORAGE_KEYS.general, JSON.stringify(general))
    updateGeneralLocalization(general.mainCountry, general.reportingCurrency)
    onWorkspaceMetaChange?.({
      workspaceName: general.workspaceName,
      avatarColor: general.avatarColor,
    })
    recordAudit({
      category: 'settings',
      action: t('settings.general.heading'),
      detail: `${general.workspaceName} (${mainCountryName} · ${general.reportingCurrency})`,
      user: 'Andrea Morales',
    })
    toast.success(
      t('settings.general.savedToast', {
        country: mainCountryName,
        currency: general.reportingCurrency,
      }),
      t('settings.item.General')
    )
  }

  const handleSaveOrg = () => {
    localStorage.setItem(STORAGE_KEYS.org, JSON.stringify(org))
    recordAudit({
      category: 'settings',
      action: t('settings.org.heading'),
      detail: `${org.legalName} · ${org.rfc}`,
      user: 'Andrea Morales',
    })
    toast.success(t('settings.org.savedToast'), t('settings.item.Organización'))
  }

  const handleSaveRegional = () => {
    updateRegional(regional)
    recordAudit({
      category: 'settings',
      action: t('settings.regional.heading'),
      detail: `${regional.language} · ${regional.timezone}`,
      user: 'Andrea Morales',
    })
    toast.success(
      t('settings.regional.savedToast', {
        language: regional.language,
        timezone: regional.timezone,
      }),
      t('settings.item.Idioma y región')
    )
  }

  const handleSaveSecurity = () => {
    localStorage.setItem(STORAGE_KEYS.security, JSON.stringify(security))
    recordAudit({
      category: 'security',
      action: t('settings.security.heading'),
      detail: `2FA: ${security.twoFactorEnabled ? 'ON' : 'OFF'} · Timeout: ${security.sessionTimeoutMinutes}m · 90d Rotation: ${security.enforcePasswordExpiry ? 'ON' : 'OFF'}`,
      user: 'Andrea Morales',
    })
    toast.success(t('settings.security.savedToast'), t('settings.item.Seguridad'))
  }

  const handleSaveNotifications = () => {
    try {
      const savedPush = localStorage.getItem('nexus_stock_push_alerts_config')
      const parsedPush = savedPush ? JSON.parse(savedPush) : {}
      parsedPush.enabled = notifPreferences.pushStockAlerts
      parsedPush.sound = notifPreferences.audioChime
      localStorage.setItem('nexus_stock_push_alerts_config', JSON.stringify(parsedPush))

      const savedEmail = localStorage.getItem('nexus_stock_email_alerts_config')
      const parsedEmail = savedEmail ? JSON.parse(savedEmail) : {}
      parsedEmail.enabled = notifPreferences.emailStockAlerts
      localStorage.setItem('nexus_stock_email_alerts_config', JSON.stringify(parsedEmail))

      writeStoredJson(STORAGE_KEYS.notifications, {
        salesOrdersAlerts: notifPreferences.salesOrdersAlerts,
        receivablesAlerts: notifPreferences.receivablesAlerts,
        weeklySummaryEmail: notifPreferences.weeklySummaryEmail,
        audioChime: notifPreferences.audioChime,
      })

      window.dispatchEvent(new CustomEvent('nexus_push_config_changed', { detail: { enabled: notifPreferences.pushStockAlerts } }))
    } catch {
      // fallback
    }
    recordAudit({
      category: 'settings',
      action: t('settings.notifications.heading'),
      detail: `Push: ${notifPreferences.pushStockAlerts ? 'ON' : 'OFF'} · Email: ${notifPreferences.emailStockAlerts ? 'ON' : 'OFF'} · Chime: ${notifPreferences.audioChime ? 'ON' : 'OFF'}`,
      user: 'Andrea Morales',
    })
    toast.success(t('settings.notifications.savedToast'), t('settings.item.Notificaciones'))
  }

  const persistUsers = (updated: UserMember[]) => {
    setUsers(updated)
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent(USERS_CHANGED_EVENT, { detail: { users: updated } }))
  }

  // Invite user handler
  const handleInviteUserSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteName.trim() || !inviteEmail.trim()) {
      toast.warning(t('settings.users.missingFieldsToast'), t('settings.users.missingFieldsTitle'))
      return
    }
    const initials = inviteName
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase() || '')
      .join('') || 'US'

    const newUser: UserMember = {
      id: `usr_${Date.now()}`,
      name: inviteName.trim(),
      email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
      status: 'active',
      lastLogin: t('settings.users.pendingInviteLogin'),
      avatarInitials: initials,
    }

    const updated = [...users, newUser]
    persistUsers(updated)
    recordAudit({
      category: 'users',
      action: t('settings.users.invitedTitle'),
      detail: `${newUser.name} (${newUser.email}) · ${getRoleLabel(newUser.role)}`,
      user: 'Andrea Morales',
    })
    setInviteName('')
    setInviteEmail('')
    setShowInviteModal(false)
    toast.success(
      t('settings.users.invitedToast', {
        email: newUser.email,
        role: getRoleLabel(newUser.role),
      }),
      t('settings.users.invitedTitle')
    )
  }

  const handleToggleUserStatus = (userId: string) => {
    const updated = users.map((u) => {
      if (u.id === userId) {
        const nextStatus = u.status === 'active' ? ('suspended' as const) : ('active' as const)
        const nextLabel = nextStatus === 'active'
          ? t('settings.users.statusActive')
          : t('settings.users.statusSuspended')
        recordAudit({
          category: 'users',
          action: t('settings.users.statusChangedTitle'),
          detail: `${u.name} → ${nextLabel}`,
          user: 'Andrea Morales',
        })
        toast.info(
          t('settings.users.statusChangedToast', {
            name: u.name,
            status: nextLabel,
          }),
          t('settings.users.statusChangedTitle')
        )
        return { ...u, status: nextStatus }
      }
      return u
    })
    persistUsers(updated)
  }

  const handleChangeUserRole = (userId: string, nextRole: RoleKey) => {
    const target = users.find((u) => u.id === userId)
    if (!target || target.role === nextRole) return
    const updated = users.map((u) => (u.id === userId ? { ...u, role: nextRole } : u))
    persistUsers(updated)
    recordAudit({
      category: 'users',
      action: t('settings.users.roleUpdatedTitle'),
      detail: `${target.name} → ${getRoleLabel(nextRole)}`,
      user: 'Andrea Morales',
    })
    toast.info(
      t('settings.users.roleUpdatedToast', { name: target.name, role: getRoleLabel(nextRole) }),
      t('settings.users.roleUpdatedTitle')
    )
  }

  const handleAddBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!branchName.trim()) {
      toast.warning(
        t('settings.modal.branch.missingNameToast'),
        t('settings.modal.branch.missingNameTitle')
      )
      return
    }
    const cleanName = branchName.trim()
    const cleanCity = branchCity.trim()
    const cleanAddress = branchAddress.trim() || t('settings.org.pendingAddress')

    const newBranch = {
      id: `loc_${Date.now()}`,
      name: cleanName,
      type: branchType,
      city: cleanCity,
      address: cleanAddress,
      isMain: false,
    }
    const updated = { ...org, branches: [...org.branches, newBranch] }
    setOrg(updated)
    localStorage.setItem(STORAGE_KEYS.org, JSON.stringify(updated))

    if (onAddLocation) {
      const mappedType: LocationType =
        branchType === 'Oficina corporativa'
          ? 'Oficina corporativa'
          : branchType === 'Sucursal comercial'
          ? 'Sucursal'
          : branchType === 'Taller de ensamble'
          ? 'Taller / Operación'
          : 'Almacén / Bodega'
      const [cityPart, statePart = ''] = cleanCity.split(',').map((s) => s.trim())
      const codePrefix = mappedType === 'Almacén / Bodega' ? 'ALM' : 'SUC'
      onAddLocation({
        id: newBranch.id,
        code: `${codePrefix}-${String(locations.length + 1).padStart(2, '0')}`,
        name: cleanName,
        type: mappedType,
        address: cleanAddress,
        city: cityPart || cleanCity,
        state: statePart || mainCountryName,
        country: mainCountryName,
        manager: org.legalRep,
        active: true,
      })
    }

    recordAudit({
      category: 'settings',
      action: t('settings.modal.branch.addedTitle'),
      detail: `${cleanName} (${cleanCity})`,
      user: 'Andrea Morales',
    })

    setShowBranchModal(false)
    setBranchName('')
    setBranchAddress('')
    toast.success(
      t('settings.modal.branch.addedToast', { name: newBranch.name }),
      t('settings.modal.branch.addedTitle')
    )
  }

  const persistRoleDefinitions = (nextRoles: RoleDefinition[]) => {
    setRoleDefinitions(nextRoles)
    writeStoredJson(STORAGE_KEYS.roleDefinitions, nextRoles)
    const permsMap: Record<string, RoleCapabilityId[]> = {}
    for (const r of nextRoles) {
      permsMap[r.id] = r.capabilities
    }
    writeStoredJson(STORAGE_KEYS.roles, permsMap)
    window.dispatchEvent(new CustomEvent(ROLES_CHANGED_EVENT, { detail: { roles: nextRoles } }))
  }

  const handleOpenRoleModal = (role: RoleDefinition) => {
    if (isGeneralAdminRole(role)) {
      toast.warning(
        t('settings.roles.protectedAdminEditToast'),
        t('settings.item.Roles y permisos')
      )
      return
    }
    setEditingRole(role)
    setRoleCapsDraft([...role.capabilities])
  }

  const handleSaveRolePermissions = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRole) return
    if (isGeneralAdminRole(editingRole)) {
      toast.warning(
        t('settings.roles.protectedAdminEditToast'),
        t('settings.item.Roles y permisos')
      )
      setEditingRole(null)
      return
    }
    const updated = roleDefinitions.map((r) =>
      r.id === editingRole.id ? { ...r, capabilities: roleCapsDraft } : r
    )
    persistRoleDefinitions(updated)
    const roleLabel = getRoleCardTitle(editingRole)
    recordAudit({
      category: 'users',
      action: t('settings.roles.modal.savedTitle'),
      detail: `${roleLabel} · ${roleCapsDraft.length}`,
      user: 'Andrea Morales',
    })
    toast.success(
      t('settings.roles.modal.savedToast', {
        role: roleLabel,
        count: roleCapsDraft.length,
      }),
      t('settings.roles.modal.savedTitle')
    )
    setEditingRole(null)
  }

  const handleOpenCreateRoleModal = () => {
    setNewRoleName('')
    setNewRoleDesc('')
    setNewRoleCapsDraft([])
    setShowCreateRoleModal(true)
  }

  const handleCreateRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanName = newRoleName.trim()
    if (!cleanName) {
      toast.warning(
        t('settings.roles.createModal.missingNameToast'),
        t('settings.item.Roles y permisos')
      )
      return
    }
    const normalized = cleanName.toLowerCase()
    const duplicate = roleDefinitions.some(
      (r) =>
        r.id.toLowerCase() === normalized ||
        r.name.toLowerCase() === normalized ||
        getRoleLabel(r.id).toLowerCase() === normalized ||
        getRoleCardTitle(r).toLowerCase() === normalized
    )
    if (duplicate) {
      toast.warning(
        t('settings.roles.createModal.duplicateNameToast'),
        t('settings.item.Roles y permisos')
      )
      return
    }
    const cleanDesc = newRoleDesc.trim() || t('settings.roles.defaultCustomDesc')
    const created: RoleDefinition = {
      id: `role_${Date.now()}`,
      name: cleanName,
      description: cleanDesc,
      capabilities: [...newRoleCapsDraft],
    }
    const updated = [...roleDefinitions, created]
    persistRoleDefinitions(updated)
    recordAudit({
      category: 'users',
      action: t('settings.roles.createModal.createdTitle'),
      detail: `${cleanName} · ${newRoleCapsDraft.length}`,
      user: 'Andrea Morales',
    })
    toast.success(
      t('settings.roles.createModal.createdToast', {
        role: cleanName,
        count: newRoleCapsDraft.length,
      }),
      t('settings.roles.createModal.createdTitle')
    )
    setShowCreateRoleModal(false)
    setNewRoleName('')
    setNewRoleDesc('')
    setNewRoleCapsDraft([])
  }

  const handleDeleteRole = (role: RoleDefinition) => {
    if (role.id === 'Administrador' || role.builtInKey === 'admin') {
      toast.warning(
        t('settings.roles.protectedAdminToast'),
        t('settings.item.Roles y permisos')
      )
      return
    }
    if (roleDefinitions.length <= 1) {
      toast.warning(
        t('settings.roles.deleteLastToast'),
        t('settings.item.Roles y permisos')
      )
      return
    }
    const remaining = roleDefinitions.filter((r) => r.id !== role.id)
    const fallbackRole = remaining[0]
    const affectedCount = users.filter((u) => u.role === role.id).length
    if (affectedCount > 0 && fallbackRole) {
      const reassignedUsers = users.map((u) =>
        u.role === role.id ? { ...u, role: fallbackRole.id } : u
      )
      persistUsers(reassignedUsers)
    }
    if (inviteRole === role.id && fallbackRole) {
      setInviteRole(fallbackRole.id)
    }
    persistRoleDefinitions(remaining)
    const roleDisplay = getRoleCardTitle(role)
    recordAudit({
      category: 'users',
      action: t('settings.roles.deletedTitle'),
      detail:
        affectedCount > 0 && fallbackRole
          ? `${roleDisplay} (${affectedCount} → ${getRoleLabel(fallbackRole.id)})`
          : roleDisplay,
      user: 'Andrea Morales',
    })
    toast.info(
      affectedCount > 0 && fallbackRole
        ? t('settings.roles.deletedReassignedToast', {
            role: roleDisplay,
            count: affectedCount,
            fallback: getRoleLabel(fallbackRole.id),
          })
        : t('settings.roles.deletedToast', { role: roleDisplay }),
      t('settings.roles.deletedTitle')
    )
  }

  const handleSaveIntegration = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingIntegration) return
    const meta = getIntegrationMeta(editingIntegration.id)
    const updated = integrations.map((item) =>
      item.id === editingIntegration.id ? editingIntegration : item
    )
    setIntegrations(updated)
    writeStoredJson(STORAGE_KEYS.integrations, updated)
    recordAudit({
      category: 'integrations',
      action: meta.title,
      detail: `${editingIntegration.enabled ? t('settings.integrations.statusConnected') : t('settings.integrations.statusPaused')} (${editingIntegration.environment})`,
      user: 'Andrea Morales',
    })
    toast.success(
      t('settings.integrations.modal.savedToast', { title: meta.title }),
      t('settings.integrations.toastTitle')
    )
    setEditingIntegration(null)
  }

  const handleTestIntegration = () => {
    if (!editingIntegration) return
    const meta = getIntegrationMeta(editingIntegration.id)
    if (!editingIntegration.enabled || !editingIntegration.endpointOrAccount.trim()) {
      toast.warning(
        t('settings.integrations.modal.testWarnToast'),
        t('settings.integrations.toastTitle')
      )
      return
    }
    const tested: IntegrationConfig = {
      ...editingIntegration,
      lastSyncAt: new Date().toISOString(),
    }
    setEditingIntegration(tested)
    const updated = integrations.map((item) => (item.id === tested.id ? tested : item))
    setIntegrations(updated)
    writeStoredJson(STORAGE_KEYS.integrations, updated)
    recordAudit({
      category: 'integrations',
      action: `${meta.title} · Test`,
      detail: `${tested.endpointOrAccount} (${tested.environment})`,
      user: 'Andrea Morales',
    })
    toast.success(
      t('settings.integrations.modal.testOkToast', {
        title: meta.title,
        env:
          tested.environment === 'production'
            ? t('settings.integrations.envProd')
            : t('settings.integrations.envSandbox'),
      }),
      t('settings.integrations.toastTitle')
    )
  }

  const handleExportAuditCsv = () => {
    const header = ['Fecha/Hora', 'Categoría', 'Acción', 'Detalle', 'Responsable']
    const rows = filteredAuditEvents.map((ev) => {
      const actionText = ev.seedKey ? t(`settings.audit.${ev.seedKey}.action` as const) : ev.action
      const detailText = ev.seedKey ? t(`settings.audit.${ev.seedKey}.detail` as const) : ev.detail
      const timeText = ev.seedKey
        ? t(`settings.audit.${ev.seedKey}.time` as const)
        : `${formatDate(new Date(ev.timestampIso))} ${formatTime(new Date(ev.timestampIso))}`
      return [timeText, ev.category, actionText, detailText, ev.user]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',')
    })
    const csvContent = `\uFEFF${header.join(',')}\n${rows.join('\n')}`
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `aes-nexus-audit-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success(
      t('settings.audit.exportedToast', { count: filteredAuditEvents.length }),
      t('settings.audit.exportedTitle')
    )
  }

  const handleUpdatePlan = (tier: PlanTier, billingCycle: 'monthly' | 'annual') => {
    const updated: PlanSubscriptionSettings = { ...planSettings, tier, billingCycle }
    setPlanSettings(updated)
    writeStoredJson(STORAGE_KEYS.plan, updated)
    const cycleLabel =
      billingCycle === 'annual' ? t('settings.plan.cycleAnnual') : t('settings.plan.cycleMonthly')
    recordAudit({
      category: 'settings',
      action: t('settings.item.Plan y facturación'),
      detail: `${tier} (${cycleLabel})`,
      user: 'Andrea Morales',
    })
    toast.success(
      t('settings.plan.updatedToast', { tier, cycle: cycleLabel }),
      t('settings.item.Plan y facturación')
    )
  }

  const handleExportBillingHistory = () => {
    const header = ['Folio', 'Fecha', 'Importe (MXN)', 'Estado']
    const rows = planSettings.billingInvoices.map((inv) =>
      [inv.folio, formatDate(new Date(inv.dateIso)), inv.amountMxn, t('settings.plan.statusPaid')]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(',')
    )
    const csvContent = `\uFEFF${header.join(',')}\n${rows.join('\n')}`
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `aes-nexus-billing-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success(t('settings.plan.exportedToast'), t('settings.item.Plan y facturación'))
  }

  const effectiveCaps = activeCapabilities ?? new Set<RoleCapabilityId>()
  const rawSettingsGroups = [
    {
      label: t('settings.group.workspace'),
      items: [
        { name: 'General', label: t('settings.item.General'), icon: Settings2, badge: t('settings.badge.principal') },
        { name: 'Organización', label: t('settings.item.Organización'), icon: Building2, badge: t('settings.badge.fiscal') },
        { name: 'Idioma y región', label: t('settings.item.Idioma y región'), icon: Globe2, badge: t('settings.badge.localization') },
      ],
    },
    {
      label: t('settings.group.people'),
      items: [
        { name: 'Usuarios', label: t('settings.item.Usuarios'), icon: UserRoundPlus, count: users.length },
        { name: 'Roles y permisos', label: t('settings.item.Roles y permisos'), icon: ShieldCheck },
        { name: 'Seguridad', label: t('settings.item.Seguridad'), icon: LockKeyhole, badge: security.twoFactorEnabled ? t('settings.badge.2fa') : undefined },
      ],
    },
    {
      label: t('settings.group.preferences'),
      items: [
        { name: 'Apariencia', label: t('settings.item.Apariencia'), icon: Palette },
        { name: 'Notificaciones', label: t('settings.item.Notificaciones'), icon: Mail, badge: notifPreferences.pushStockAlerts ? t('settings.badge.pushOn') : undefined },
        { name: 'Auditoría', label: t('settings.item.Auditoría'), icon: ClipboardList },
      ],
    },
    {
      label: t('settings.group.services'),
      items: [
        { name: 'Integraciones', label: t('settings.item.Integraciones'), icon: Plug, badge: t('settings.badge.connectors') },
        { name: 'Plan y facturación', label: t('settings.item.Plan y facturación'), icon: CreditCard },
      ],
    },
  ]

  const settingsGroups = rawSettingsGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        canAccessSection('Configuración', item.name, effectiveCaps, isFullAdmin, isAccountActive)
      ),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <section className="settings-page" aria-labelledby="settings-title">
      {/* Heading */}
      <div className="settings-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" /> {t('settings.eyebrow')}
          </div>
          <h1 id="settings-title">{t('settings.title')}</h1>
          <p>{t('settings.subtitle')}</p>
        </div>
        <div className="settings-badge-status">
          <span className="live-dot" />
          <span>{t('settings.activeBadge')} · {general.workspaceName}</span>
        </div>
      </div>

      <div className="settings-layout">
        {/* Navigation Sidebar */}
        <nav className="settings-nav" aria-label={t('settings.title')}>
          {settingsGroups.map((group) => (
            <div className="settings-nav-group" key={group.label}>
              <p className="nav-label">{group.label}</p>
              {group.items.map(({ name, label, icon: Icon, badge, count }) => (
                <button
                  key={name}
                  className={`settings-nav-item ${activeSetting === name ? 'active' : ''}`}
                  aria-current={activeSetting === name ? 'page' : undefined}
                  onClick={() => onSelectSetting(name)}
                >
                  <Icon size={16} strokeWidth={1.8} />
                  <span>{label}</span>
                  {badge && <span className="settings-nav-badge">{badge}</span>}
                  {typeof count === 'number' && <span className="settings-nav-count">{count}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Dynamic Settings Content Panel */}
        <div className="settings-panel">
          {/* 1. GENERAL */}
          {activeSetting === 'General' && (
            <div className="settings-form-container">
              <div className="settings-panel-heading">
                <div>
                  <h2>{t('settings.general.heading')}</h2>
                  <p>{t('settings.general.subheading')}</p>
                </div>
                <button className="button button-primary" onClick={handleSaveGeneral}>
                  <Check size={14} /> {t('settings.general.saveBtn')}
                </button>
              </div>

              <div className="settings-card-group">
                {/* Identidad del espacio */}
                <div className="settings-section-card">
                  <div className="card-header-row">
                    <div>
                      <h3>{t('settings.general.identityTitle')}</h3>
                      <p>{t('settings.general.identityDesc')}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="workspace-swatch-picker" role="group" aria-label={t('settings.general.avatarColorLabel')}>
                        {WORKSPACE_AVATAR_SWATCHES.map((swatch) => (
                          <button
                            key={swatch}
                            type="button"
                            className={`workspace-swatch-dot ${general.avatarColor === swatch ? 'active' : ''}`}
                            style={{ backgroundColor: swatch }}
                            aria-label={swatch}
                            aria-pressed={general.avatarColor === swatch}
                            onClick={() => {
                              const next = { ...general, avatarColor: swatch }
                              setGeneral(next)
                              localStorage.setItem(STORAGE_KEYS.general, JSON.stringify(next))
                              onWorkspaceMetaChange?.({
                                workspaceName: next.workspaceName,
                                avatarColor: swatch,
                              })
                            }}
                          />
                        ))}
                      </div>
                      <div
                        className="workspace-avatar-preview"
                        style={{ backgroundColor: general.avatarColor }}
                        title={t('settings.general.avatarTitle')}
                      >
                        {(general.workspaceName.slice(0, 2) || 'BE').toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-field">
                      <label>{t('settings.general.workspaceName')}</label>
                      <input
                        type="text"
                        value={general.workspaceName}
                        onChange={(e) => {
                          const nextName = e.target.value
                          setGeneral({ ...general, workspaceName: nextName })
                          onWorkspaceMetaChange?.({
                            workspaceName: nextName,
                            avatarColor: general.avatarColor,
                          })
                        }}
                        placeholder={t('settings.general.workspacePlaceholder')}
                      />
                      <small>{t('settings.general.workspaceNameHint')}</small>
                    </div>

                    <div className="form-field">
                      <label>{t('settings.general.slug')}</label>
                      <div className="input-prefix-wrap">
                        <span className="input-prefix">nexus.app/</span>
                        <input
                          type="text"
                          value={general.slug}
                          onChange={(e) => setGeneral({ ...general, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                        />
                      </div>
                      <small>{t('settings.general.slugHint')}</small>
                    </div>
                  </div>

                  <div className="form-field" style={{ marginTop: '12px' }}>
                    <label>{t('settings.general.description')}</label>
                    <textarea
                      rows={2}
                      value={general.description}
                      onChange={(e) => setGeneral({ ...general, description: e.target.value })}
                      placeholder={t('settings.general.descriptionPlaceholder')}
                    />
                  </div>
                </div>

                {/* Parámetros Operativos Base */}
                <div className="settings-section-card">
                  <div className="card-header-row">
                    <div>
                      <h3>{t('settings.general.localizationTitle')}</h3>
                      <p>{t('settings.general.localizationDesc')}</p>
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-field">
                      <CountryDropdown
                        value={general.mainCountry}
                        onChange={(code) => {
                          const updated = { ...general, mainCountry: code }
                          setGeneral(updated)
                          localStorage.setItem('aes_nexus_settings_general', JSON.stringify(updated))
                          updateGeneralLocalization(code, updated.reportingCurrency)
                        }}
                        id="settings-main-country"
                        label={t('settings.general.mainCountry')}
                      />
                      <small>{t('settings.general.mainCountryHint')}</small>
                    </div>

                    <div className="form-field">
                      <label>{t('settings.general.reportingCurrency')}</label>
                      <select
                        value={general.reportingCurrency}
                        onChange={(e) => {
                          const updated = { ...general, reportingCurrency: e.target.value }
                          setGeneral(updated)
                          localStorage.setItem('aes_nexus_settings_general', JSON.stringify(updated))
                          updateGeneralLocalization(updated.mainCountry, e.target.value)
                        }}
                      >
                        <option value="MXN">{t('settings.general.currency.MXN')}</option>
                        <option value="USD">{t('settings.general.currency.USD')}</option>
                        <option value="EUR">{t('settings.general.currency.EUR')}</option>
                        <option value="COP">{t('settings.general.currency.COP')}</option>
                        <option value="BRL">{t('settings.general.currency.BRL')}</option>
                      </select>
                      <small>{t('settings.general.reportingCurrencyHint')}</small>
                    </div>
                  </div>
                </div>

                {/* Contacto Institucional */}
                <div className="settings-section-card">
                  <div className="card-header-row">
                    <div>
                      <h3>{t('settings.general.contactTitle')}</h3>
                      <p>{t('settings.general.contactDesc')}</p>
                    </div>
                  </div>

                  <div className="form-grid-3">
                    <div className="form-field">
                      <label>{t('settings.general.email')}</label>
                      <div className="input-icon-wrap">
                        <Mail size={13} className="field-icon" />
                        <input
                          type="email"
                          value={general.primaryEmail}
                          onChange={(e) => setGeneral({ ...general, primaryEmail: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-field">
                      <label>{t('settings.general.phone')}</label>
                      <div className="input-icon-wrap">
                        <Phone size={13} className="field-icon" />
                        <input
                          type="text"
                          value={general.phone}
                          onChange={(e) => setGeneral({ ...general, phone: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-field">
                      <label>{t('settings.general.website')}</label>
                      <div className="input-icon-wrap">
                        <ExternalLink size={13} className="field-icon" />
                        <input
                          type="text"
                          value={general.website}
                          onChange={(e) => setGeneral({ ...general, website: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. ORGANIZACIÓN */}
          {activeSetting === 'Organización' && (
            <div className="settings-form-container">
              <div className="settings-panel-heading">
                <div>
                  <h2>{t('settings.org.heading')}</h2>
                  <p>{t('settings.org.subheading')}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="button button-secondary" onClick={() => setShowBranchModal(true)}>
                    <Plus size={14} /> {t('settings.org.newBranchBtn')}
                  </button>
                  <button className="button button-primary" onClick={handleSaveOrg}>
                    <Check size={14} /> {t('settings.org.saveBtn')}
                  </button>
                </div>
              </div>

              <div className="settings-card-group">
                {/* Entidad Legal & RFC */}
                <div className="settings-section-card">
                  <div className="card-header-row">
                    <div>
                      <h3>{t('settings.org.legalCardTitle')}</h3>
                      <p>{t('settings.org.legalCardDesc')}</p>
                    </div>
                    <span className="org-tax-badge">
                      <CheckCircle2 size={12} /> {t('settings.org.csdBadge')}
                    </span>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-field">
                      <label>{t('settings.org.legalNameLabel')}</label>
                      <input
                        type="text"
                        value={org.legalName}
                        onChange={(e) => setOrg({ ...org, legalName: e.target.value })}
                      />
                    </div>

                    <div className="form-field">
                      <label>{t('settings.org.rfcLabel')}</label>
                      <input
                        type="text"
                        value={org.rfc}
                        onChange={(e) => setOrg({ ...org, rfc: e.target.value.toUpperCase() })}
                      />
                    </div>
                  </div>

                  <div className="form-grid-2" style={{ marginTop: '12px' }}>
                    <div className="form-field">
                      <label>{t('settings.org.taxRegimeLabel')}</label>
                      <select
                        value={org.taxRegime}
                        onChange={(e) => setOrg({ ...org, taxRegime: e.target.value })}
                      >
                        <option value="601 - General de Ley Personas Morales">{t('settings.org.regime601')}</option>
                        <option value="626 - Régimen Simplificado de Confianza (RESICO)">{t('settings.org.regime626')}</option>
                        <option value="603 - Personas Morales con Fines no Lucrativos">{t('settings.org.regime603')}</option>
                      </select>
                    </div>

                    <div className="form-field">
                      <label>{t('settings.org.legalRepLabel')}</label>
                      <input
                        type="text"
                        value={org.legalRep}
                        onChange={(e) => setOrg({ ...org, legalRep: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Domicilio Fiscal */}
                <div className="settings-section-card">
                  <div className="card-header-row">
                    <div>
                      <h3>{t('settings.org.addressCardTitle')}</h3>
                      <p>{t('settings.org.addressCardDesc')}</p>
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-field">
                      <label>{t('settings.org.streetLabel')}</label>
                      <input
                        type="text"
                        value={org.fiscalStreet}
                        onChange={(e) => setOrg({ ...org, fiscalStreet: e.target.value })}
                      />
                    </div>

                    <div className="form-field">
                      <label>{t('settings.org.colonyLabel')}</label>
                      <input
                        type="text"
                        value={org.fiscalColony}
                        onChange={(e) => setOrg({ ...org, fiscalColony: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-grid-3" style={{ marginTop: '12px' }}>
                    <div className="form-field">
                      <label>{t('settings.org.zipLabel')}</label>
                      <input
                        type="text"
                        value={org.fiscalZip}
                        onChange={(e) => setOrg({ ...org, fiscalZip: e.target.value })}
                      />
                    </div>

                    <div className="form-field">
                      <label>{t('settings.org.cityLabel')}</label>
                      <input
                        type="text"
                        value={org.fiscalCity}
                        onChange={(e) => setOrg({ ...org, fiscalCity: e.target.value })}
                      />
                    </div>

                    <div className="form-field">
                      <label>{t('settings.org.stateLabel')}</label>
                      <input
                        type="text"
                        value={org.fiscalState}
                        onChange={(e) => setOrg({ ...org, fiscalState: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Sedes y Sucursales Operativas (Sincronizadas con Administración > Ubicaciones y Operaciones) */}
                <div className="settings-section-card">
                  <div className="card-header-row">
                    <div>
                      <h3>{t('settings.org.branchesCardTitle')}</h3>
                      <p>{t('settings.org.branchesCardDesc')}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span className="settings-sync-meta">
                        {t('settings.org.syncedSitesBadge', {
                          locations: organizationSites.length,
                          warehouses: activeWarehouses.length,
                        })}
                      </span>
                      {onNavigateAdminLocations && (
                        <button
                          type="button"
                          className="timezone-change-country-btn"
                          onClick={onNavigateAdminLocations}
                        >
                          {t('settings.org.viewInAdminBtn')} &rarr;
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="branches-list-wrap">
                    {organizationSites.map((branch) => (
                      <div key={branch.id} className="branch-row-card">
                        <div className="branch-icon-box">
                          {branch.isMain ? <Building size={16} /> : <MapPin size={16} />}
                        </div>
                        <div className="branch-copy">
                          <div className="branch-title-row">
                            <strong>{branch.name}</strong>
                            {branch.isMain && <span className="branch-main-pill">{t('settings.org.mainBranchPill')}</span>}
                            <span className="branch-type-pill">{branch.type}</span>
                          </div>
                          <span className="branch-address">{branch.address} · {branch.city}</span>
                        </div>
                        {!branch.isMain && (
                          <button
                            type="button"
                            className="icon-button icon-button-sm"
                            title={t('settings.org.deleteBranchTitle')}
                            onClick={() => {
                              const updated = { ...org, branches: org.branches.filter((b) => b.id !== branch.id) }
                              setOrg(updated)
                              localStorage.setItem(STORAGE_KEYS.org, JSON.stringify(updated))
                              if (branch.syncedFromAdmin && onRemoveLocation) {
                                onRemoveLocation(branch.id)
                              }
                              recordAudit({
                                category: 'settings',
                                action: t('settings.org.deletedBranchTitle'),
                                detail: branch.name,
                                user: 'Andrea Morales',
                              })
                              toast.info(
                                t('settings.org.deletedBranchToast', { name: branch.name }),
                                t('settings.org.deletedBranchTitle')
                              )
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. IDIOMA Y REGIÓN */}
          {activeSetting === 'Idioma y región' && (
            <div className="settings-form-container">
              <div className="settings-panel-heading">
                <div>
                  <h2>{t('settings.regional.heading')}</h2>
                  <p>{t('settings.regional.subheading')}</p>
                </div>
                <button className="button button-primary" onClick={handleSaveRegional}>
                  <Check size={14} /> {t('settings.regional.saveBtn')}
                </button>
              </div>

              <div className="settings-card-group">
                {/* Idioma & Zona Horaria */}
                <div className="settings-section-card">
                  <div className="card-header-row">
                    <div>
                      <h3>{t('settings.regional.langCardTitle')}</h3>
                      <p>{t('settings.regional.langCardDesc')}</p>
                    </div>
                    <div className="regional-country-pill">
                      <CountryFlag code={mainCountry} className="w-4 h-3 rounded-[2px] shrink-0" />
                      <span>{t('settings.regional.timezoneCountryBadge', { country: mainCountryName })}</span>
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-field">
                      <label>{t('settings.regional.interfaceLang')}</label>
                      <select
                        value={regional.language}
                        onChange={(e) =>
                          updateRegional({
                            ...regional,
                            language: e.target.value as SupportedLocale,
                          })
                        }
                      >
                        {SUPPORTED_LANGUAGES.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.label} · {lang.badge}
                          </option>
                        ))}
                      </select>
                      <small>{t('settings.regional.interfaceLangHint')}</small>
                    </div>

                    <div className="form-field">
                      <div className="timezone-label-row">
                        <label htmlFor="settings-timezone-select">{t('settings.regional.timezoneLabel')}</label>
                        <button
                          type="button"
                          className="timezone-change-country-btn"
                          onClick={() => onSelectSetting('General')}
                        >
                          {t('settings.regional.changeCountryLink')}
                        </button>
                      </div>
                      <select
                        id="settings-timezone-select"
                        value={regional.timezone}
                        onChange={(e) => updateRegional({ ...regional, timezone: e.target.value })}
                      >
                        {countryTimezones.map((tz) => (
                          <option key={tz.id} value={tz.id}>
                            {tz.displayLabel}
                          </option>
                        ))}
                      </select>
                      <small>{t('settings.regional.timezoneHint', { country: mainCountryName })}</small>
                    </div>
                  </div>
                </div>

                {/* Formatos de Fecha y Números */}
                <div className="settings-section-card">
                  <div className="card-header-row">
                    <div>
                      <h3>{t('settings.regional.formatsTitle')}</h3>
                      <p>{t('settings.regional.formatsDesc')}</p>
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-field">
                      <span className="settings-field-label">{t('settings.regional.dateFormatLabel')}</span>
                      <div className="radio-options-grid" role="radiogroup" aria-label={t('settings.regional.dateFormatLabel')}>
                        {[
                          {
                            value: 'DD/MM/YYYY' as const,
                            title: t('settings.regional.dateFormat.dmyTitle'),
                            sample: '12/11/2026',
                            desc: t('settings.regional.dateFormat.dmyDesc'),
                          },
                          {
                            value: 'YYYY-MM-DD' as const,
                            title: t('settings.regional.dateFormat.ymdTitle'),
                            sample: '2026-11-12',
                            desc: t('settings.regional.dateFormat.ymdDesc'),
                          },
                          {
                            value: 'MM/DD/YYYY' as const,
                            title: t('settings.regional.dateFormat.mdyTitle'),
                            sample: '11/12/2026',
                            desc: t('settings.regional.dateFormat.mdyDesc'),
                          },
                        ].map((opt) => {
                          const isSelected = regional.dateFormat === opt.value
                          return (
                            <label
                              key={opt.value}
                              className={`radio-card-option ${isSelected ? 'selected' : ''}`}
                            >
                              <input
                                type="radio"
                                name="dateFormat"
                                className="radio-card-input"
                                checked={isSelected}
                                onChange={() => updateRegional({ ...regional, dateFormat: opt.value })}
                              />
                              <span className="radio-custom-dot" aria-hidden="true" />
                              <div className="radio-option-copy">
                                <div className="radio-option-top">
                                  <strong>{opt.title}</strong>
                                  <code className="radio-sample-code">{opt.sample}</code>
                                </div>
                                <span>{opt.desc}</span>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>

                    <div className="form-field">
                      <span className="settings-field-label">{t('settings.regional.numberFormatLabel')}</span>
                      <div className="radio-options-grid" role="radiogroup" aria-label={t('settings.regional.numberFormatLabel')}>
                        {[
                          {
                            value: 'comma_dot' as const,
                            title: t('settings.regional.numFormat.commaDotTitle'),
                            sample: '1,234,567.89',
                            desc: t('settings.regional.numFormat.commaDotDesc'),
                          },
                          {
                            value: 'dot_comma' as const,
                            title: t('settings.regional.numFormat.dotCommaTitle'),
                            sample: '1.234.567,89',
                            desc: t('settings.regional.numFormat.dotCommaDesc'),
                          },
                        ].map((opt) => {
                          const isSelected = regional.numberFormat === opt.value
                          return (
                            <label
                              key={opt.value}
                              className={`radio-card-option ${isSelected ? 'selected' : ''}`}
                            >
                              <input
                                type="radio"
                                name="numFormat"
                                className="radio-card-input"
                                checked={isSelected}
                                onChange={() => updateRegional({ ...regional, numberFormat: opt.value })}
                              />
                              <span className="radio-custom-dot" aria-hidden="true" />
                              <div className="radio-option-copy">
                                <div className="radio-option-top">
                                  <strong>{opt.title}</strong>
                                  <code className="radio-sample-code">{opt.sample}</code>
                                </div>
                                <span>{opt.desc}</span>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="form-field" style={{ marginTop: '16px' }}>
                    <span className="settings-field-label">{t('settings.regional.firstDayLabel')}</span>
                    <div
                      className="radio-options-row"
                      role="radiogroup"
                      aria-label={t('settings.regional.firstDayLabel')}
                    >
                      {[
                        {
                          value: 'monday' as const,
                          title: t('settings.regional.mondayShort'),
                          tag: 'ISO 8601',
                          desc: t('settings.regional.week.mondayDays'),
                        },
                        {
                          value: 'sunday' as const,
                          title: t('settings.regional.sundayShort'),
                          tag: t('settings.regional.week.americasTag'),
                          desc: t('settings.regional.week.sundayDays'),
                        },
                      ].map((opt) => {
                        const isSelected = regional.firstDayOfWeek === opt.value
                        return (
                          <label
                            key={opt.value}
                            className={`radio-card-option ${isSelected ? 'selected' : ''}`}
                          >
                            <input
                              type="radio"
                              name="firstDay"
                              className="radio-card-input"
                              checked={isSelected}
                              onChange={() => updateRegional({ ...regional, firstDayOfWeek: opt.value })}
                            />
                            <span className="radio-custom-dot" aria-hidden="true" />
                            <div className="radio-option-copy">
                              <div className="radio-option-top">
                                <strong>{opt.title}</strong>
                                <span className="radio-option-meta">{opt.tag}</span>
                              </div>
                              <span>{opt.desc}</span>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Vista Previa en Vivo */}
                <div className="settings-preview-banner">
                  <div className="preview-banner-left">
                    <Globe2 size={20} className="preview-icon" />
                    <div>
                      <strong>{t('settings.regional.previewTitle')}</strong>
                      <p>{t('settings.regional.previewDesc', { country: mainCountryName })}</p>
                    </div>
                  </div>
                  <div className="preview-metrics-chips">
                    <div className="preview-chip">
                      <span className="chip-label">{t('settings.regional.sampleAmount')}</span>
                      <strong className="chip-value">{livePreviewValues.currency}</strong>
                    </div>
                    <div className="preview-chip">
                      <span className="chip-label">{t('settings.regional.sampleDate')}</span>
                      <strong className="chip-value">{livePreviewValues.date}</strong>
                    </div>
                    <div className="preview-chip">
                      <span className="chip-label">{t('settings.regional.sampleTime')}</span>
                      <strong className="chip-value">{livePreviewValues.time}</strong>
                    </div>
                    <div className="preview-chip">
                      <span className="chip-label">{t('settings.regional.sampleWeek')}</span>
                      <strong className="chip-value">{livePreviewValues.weekStart}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. APARIENCIA */}
          {activeSetting === 'Apariencia' && (
            <div className="appearance-card">
              <div className="appearance-card-heading">
                <div>
                  <h3>{t('settings.appearance.title')}</h3>
                  <p>{t('settings.appearance.subtitle')}</p>
                </div>
                <span className="appearance-current">
                  <i style={{ backgroundColor: accentOptions.find((o) => o.id === accentTheme)?.color }} />
                  {getAccentLabel(
                    accentTheme,
                    accentOptions.find((o) => o.id === accentTheme)?.label || ''
                  )}
                </span>
              </div>
              <div className="appearance-options" role="group" aria-label={t('settings.appearance.accentGroupAria')}>
                {accentOptions.map((option) => {
                  const optionLabel = getAccentLabel(option.id, option.label)
                  const optionDesc = getAccentDesc(option.id, option.description)
                  return (
                    <button
                      key={option.id}
                      className={`appearance-option ${accentTheme === option.id ? 'selected' : ''}`}
                      aria-pressed={accentTheme === option.id}
                      onClick={() => {
                        onSelectAccentTheme(option.id)
                        toast.info(
                          t('settings.appearance.accentToast', { label: optionLabel }),
                          t('settings.item.Apariencia')
                        )
                      }}
                    >
                      <span className="appearance-swatch" style={{ backgroundColor: option.color }}>
                        {accentTheme === option.id && <Check size={17} />}
                      </span>
                      <span className="appearance-option-copy">
                        <strong>{optionLabel}</strong>
                        <small>{optionDesc}</small>
                      </span>
                      {accentTheme === option.id && <span className="appearance-selected">{t('common.selected')}</span>}
                    </button>
                  )
                })}
              </div>
              <div className="appearance-mode-row">
                <div className="appearance-mode-copy">
                  <span className="appearance-mode-icon">{darkMode ? <Moon size={16} /> : <Sun size={16} />}</span>
                  <span>
                    <strong>{t('settings.appearance.darkMode')}</strong>
                    <small>{t('settings.appearance.darkModeDesc')}</small>
                  </span>
                </div>
                <button
                  className={`theme-toggle ${darkMode ? 'on' : ''}`}
                  type="button"
                  role="switch"
                  aria-checked={darkMode}
                  aria-label={t('settings.appearance.toggleDarkAria')}
                  onClick={onToggleDarkMode}
                >
                  <span />
                </button>
              </div>
              <div className="appearance-preview">
                <div className="appearance-preview-copy">
                  <span className="panel-kicker">{t('settings.appearance.previewKicker')}</span>
                  <strong>
                    {darkMode
                      ? t('settings.appearance.previewDarkTitle')
                      : t('settings.appearance.previewLightTitle')}
                  </strong>
                  <small>{t('settings.appearance.previewDesc')}</small>
                </div>
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => {
                    const activeAccent = getAccentLabel(
                      accentTheme,
                      accentOptions.find((o) => o.id === accentTheme)?.label || accentTheme
                    )
                    toast.success(
                      t('settings.appearance.previewToast', {
                        label: activeAccent,
                        mode: darkMode
                          ? t('settings.appearance.modeDark')
                          : t('settings.appearance.modeLight'),
                      }),
                      t('settings.item.Apariencia')
                    )
                  }}
                >
                  {t('settings.appearance.previewActionBtn')}
                </button>
              </div>
            </div>
          )}

          {/* 5. USUARIOS */}
          {activeSetting === 'Usuarios' && (
            <div className="settings-form-container">
              <div className="settings-panel-heading">
                <div>
                  <h2>{t('settings.users.heading')}</h2>
                  <p>{t('settings.users.subheading')}</p>
                </div>
                <button className="button button-primary" onClick={() => setShowInviteModal(true)}>
                  <Plus size={14} /> {t('settings.users.inviteBtn')}
                </button>
              </div>

              <div className="settings-section-card">
                <div className="card-header-row">
                  <div>
                    <h3>{t('settings.users.cardTitle', { count: users.length })}</h3>
                    <p>{t('settings.users.cardDesc')}</p>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="settings-users-table">
                    <thead>
                      <tr>
                        <th>{t('settings.users.colMember')}</th>
                        <th>{t('settings.users.colEmail')}</th>
                        <th>{t('settings.users.colRole')}</th>
                        <th>{t('settings.users.colStatus')}</th>
                        <th>{t('settings.users.colLastAccess')}</th>
                        <th style={{ textAlign: 'right' }}>{t('settings.users.colActions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td>
                            <div className="user-table-cell">
                              <span className="user-avatar-badge">{user.avatarInitials}</span>
                              <strong>{user.name}</strong>
                            </div>
                          </td>
                          <td>
                            <span className="user-email-text">{user.email}</span>
                          </td>
                          <td>
                            <select
                              aria-label={t('settings.users.colRole')}
                              className={`user-role-select role-${user.role.toLowerCase()}`}
                              value={user.role}
                              onChange={(e) => handleChangeUserRole(user.id, e.target.value as RoleKey)}
                            >
                              {roleDefinitions.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {getRoleLabel(r.id)}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <span className={`user-status-pill status-${user.status}`}>
                              <span className="status-dot" />
                              {user.status === 'active'
                                ? t('settings.users.statusActive')
                                : t('settings.users.statusSuspended')}
                            </span>
                          </td>
                          <td>
                            <span className="user-last-login">{user.lastLogin}</span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="button button-ghost button-sm"
                              onClick={() => handleToggleUserStatus(user.id)}
                            >
                              {user.status === 'active'
                                ? t('settings.users.actionSuspend')
                                : t('settings.users.actionReactivate')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 6. ROLES Y PERMISOS */}
          {activeSetting === 'Roles y permisos' && (
            <div className="settings-form-container">
              <div className="settings-panel-heading">
                <div>
                  <h2>{t('settings.roles.heading')}</h2>
                  <p>{t('settings.roles.subheading')}</p>
                </div>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={handleOpenCreateRoleModal}
                >
                  <Plus size={14} /> {t('settings.roles.createBtn')}
                </button>
              </div>

              <div className="roles-grid">
                {roleDefinitions.map((role) => {
                  const usersCount = users.filter((u) => u.role === role.id).length
                  const assignedCaps = role.capabilities || []
                  const roleTitle = getRoleCardTitle(role)
                  const roleDesc = getRoleCardDesc(role)
                  return (
                    <div key={role.id} className="role-profile-card">
                      <div className="role-header">
                        <div>
                          <h3>{roleTitle}</h3>
                          <span className="role-users-tag">
                            {t('settings.roles.usersAssigned', { count: usersCount })}
                          </span>
                        </div>
                        <ShieldCheck size={18} className="role-icon" />
                      </div>
                      <p className="role-desc">{roleDesc}</p>
                      <div className="role-caps-list">
                        {assignedCaps.length === 0 ? (
                          <span className="role-users-tag">{t('settings.roles.modal.noCaps')}</span>
                        ) : (
                          assignedCaps.slice(0, 6).map((capId) => (
                            <span key={capId} className="role-cap-item">
                              <Check size={11} /> {getCapabilityLabel(capId)}
                            </span>
                          ))
                        )}
                        {assignedCaps.length > 6 && (
                          <span className="role-users-tag">+{assignedCaps.length - 6}</span>
                        )}
                      </div>
                      <div className="role-card-footer">
                        {isGeneralAdminRole(role) ? (
                          <>
                            <span className="role-protected-meta">
                              {t('settings.roles.protectedLabel')}
                            </span>
                            <span className="role-locked-meta">
                              <LockKeyhole size={12} /> {t('settings.roles.lockedPermsLabel')}
                            </span>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="button button-ghost button-sm role-delete-btn"
                              onClick={() => handleDeleteRole(role)}
                              aria-label={`${t('settings.roles.deleteBtn')} ${roleTitle}`}
                            >
                              <Trash2 size={13} /> {t('settings.roles.deleteBtn')}
                            </button>
                            <button
                              type="button"
                              className="button button-ghost button-sm"
                              onClick={() => handleOpenRoleModal(role)}
                            >
                              {t('settings.roles.editPermissionsBtn')} &rarr;
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 7. SEGURIDAD */}
          {activeSetting === 'Seguridad' && (
            <div className="settings-form-container">
              <div className="settings-panel-heading">
                <div>
                  <h2>{t('settings.security.heading')}</h2>
                  <p>{t('settings.security.subheading')}</p>
                </div>
                <button className="button button-primary" onClick={handleSaveSecurity}>
                  <Check size={14} /> {t('settings.security.saveBtn')}
                </button>
              </div>

              <div className="settings-card-group">
                <div className="settings-section-card">
                  <div className="card-header-row">
                    <div>
                      <h3>{t('settings.security.twoFaTitle')}</h3>
                      <p>{t('settings.security.twoFaDesc')}</p>
                    </div>
                    <label className="toggle-switch-wrap">
                      <input
                        type="checkbox"
                        checked={security.twoFactorEnabled}
                        onChange={(e) => setSecurity({ ...security, twoFactorEnabled: e.target.checked })}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                  <div className="security-status-tip">
                    <CheckCircle2 size={14} style={{ color: '#3c7d5c' }} />
                    <span>
                      {security.twoFactorEnabled
                        ? t('settings.security.twoFaEnabledTip')
                        : t('settings.security.twoFaDisabledTip')}
                    </span>
                  </div>
                </div>

                <div className="settings-section-card">
                  <div className="card-header-row" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 0 }}>
                    <div>
                      <h3>{t('settings.security.passwordExpiryTitle')}</h3>
                      <p>
                        {t('settings.security.passwordExpiryDesc')} ·{' '}
                        <strong>
                          {security.enforcePasswordExpiry
                            ? t('settings.security.passwordExpiryEnabled')
                            : t('settings.security.passwordExpiryDisabled')}
                        </strong>
                      </p>
                    </div>
                    <label className="toggle-switch-wrap">
                      <input
                        type="checkbox"
                        checked={security.enforcePasswordExpiry}
                        onChange={(e) => setSecurity({ ...security, enforcePasswordExpiry: e.target.checked })}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </div>

                <div className="settings-section-card">
                  <div className="card-header-row">
                    <div>
                      <h3>{t('settings.security.timeoutTitle')}</h3>
                      <p>{t('settings.security.timeoutDesc')}</p>
                    </div>
                  </div>
                  <div className="form-field" style={{ maxWidth: '320px' }}>
                    <select
                      value={security.sessionTimeoutMinutes}
                      onChange={(e) => setSecurity({ ...security, sessionTimeoutMinutes: parseInt(e.target.value) || 30 })}
                    >
                      <option value="15">{t('settings.security.timeout15')}</option>
                      <option value="30">{t('settings.security.timeout30')}</option>
                      <option value="60">{t('settings.security.timeout60')}</option>
                      <option value="240">{t('settings.security.timeout240')}</option>
                    </select>
                  </div>
                </div>

                <div className="settings-section-card">
                  <div className="card-header-row">
                    <div>
                      <h3>{t('settings.security.sessionsTitle')}</h3>
                      <p>{t('settings.security.sessionsDesc')}</p>
                    </div>
                    {security.recentSessions.some((s) => !s.isCurrent) ? (
                      <button
                        type="button"
                        className="button button-secondary button-sm"
                        onClick={() => {
                          const updatedSec = {
                            ...security,
                            recentSessions: security.recentSessions.filter((s) => s.isCurrent),
                          }
                          setSecurity(updatedSec)
                          localStorage.setItem(STORAGE_KEYS.security, JSON.stringify(updatedSec))
                          recordAudit({
                            category: 'security',
                            action: t('settings.security.revokedTitle'),
                            detail: t('settings.security.revokedToast'),
                            user: 'Andrea Morales',
                          })
                          toast.success(
                            t('settings.security.revokedToast'),
                            t('settings.security.revokedTitle')
                          )
                        }}
                      >
                        {t('settings.security.revokeOthersBtn')}
                      </button>
                    ) : (
                      <span className="role-users-tag">{t('settings.security.noOtherSessions')}</span>
                    )}
                  </div>

                  <div className="sessions-list">
                    {security.recentSessions.map((session) => (
                      <div key={session.id} className="session-item-row">
                        <div className="session-icon">
                          <Laptop size={16} />
                        </div>
                        <div className="session-info">
                          <div className="session-title-line">
                            <strong>{session.device}</strong>
                            {session.isCurrent && (
                              <span className="current-session-tag">
                                {t('settings.security.currentSessionTag')}
                              </span>
                            )}
                          </div>
                          <span>{session.browser} · IP {session.ip} ({session.location})</span>
                        </div>
                        <span className="session-time">{session.lastActive}</span>
                        {!session.isCurrent && (
                          <button
                            type="button"
                            className="button button-ghost button-sm"
                            onClick={() => {
                              const updatedSec = {
                                ...security,
                                recentSessions: security.recentSessions.filter((s) => s.id !== session.id),
                              }
                              setSecurity(updatedSec)
                              localStorage.setItem(STORAGE_KEYS.security, JSON.stringify(updatedSec))
                              recordAudit({
                                category: 'security',
                                action: t('settings.security.revokedTitle'),
                                detail: `${session.device} (${session.ip})`,
                                user: 'Andrea Morales',
                              })
                              toast.info(`${session.device} · ${t('settings.security.revokedTitle')}`, t('settings.item.Seguridad'))
                            }}
                          >
                            {t('settings.security.revokeSingleBtn')}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 8. NOTIFICACIONES */}
          {activeSetting === 'Notificaciones' && (
            <div className="settings-form-container">
              <div className="settings-panel-heading">
                <div>
                  <h2>{t('settings.notifications.heading')}</h2>
                  <p>{t('settings.notifications.subheading')}</p>
                </div>
                <button className="button button-primary" onClick={handleSaveNotifications}>
                  <Check size={14} /> {t('settings.notifications.saveBtn')}
                </button>
              </div>

              <div className="settings-section-card">
                <div className="card-header-row">
                  <div>
                    <h3>{t('settings.notifications.inventoryTitle')}</h3>
                    <p>{t('settings.notifications.inventoryDesc')}</p>
                  </div>
                </div>

                <div className="notif-toggle-row">
                  <div>
                    <strong>{t('settings.notifications.pushTitle')}</strong>
                    <p>{t('settings.notifications.pushDesc')}</p>
                  </div>
                  <label className="toggle-switch-wrap">
                    <input
                      type="checkbox"
                      checked={notifPreferences.pushStockAlerts}
                      onChange={(e) => setNotifPreferences({ ...notifPreferences, pushStockAlerts: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="notif-toggle-row">
                  <div>
                    <strong>{t('settings.notifications.emailTitle')}</strong>
                    <p>{t('settings.notifications.emailDesc')}</p>
                  </div>
                  <label className="toggle-switch-wrap">
                    <input
                      type="checkbox"
                      checked={notifPreferences.emailStockAlerts}
                      onChange={(e) => setNotifPreferences({ ...notifPreferences, emailStockAlerts: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="notif-toggle-row">
                  <div>
                    <strong>{t('settings.notifications.chimeTitle')}</strong>
                    <p>{t('settings.notifications.chimeDesc')}</p>
                  </div>
                  <label className="toggle-switch-wrap">
                    <input
                      type="checkbox"
                      checked={notifPreferences.audioChime}
                      onChange={(e) => setNotifPreferences({ ...notifPreferences, audioChime: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              <div className="settings-section-card" style={{ marginTop: '14px' }}>
                <div className="card-header-row">
                  <div>
                    <h3>{t('settings.notifications.commercialTitle')}</h3>
                    <p>{t('settings.notifications.commercialDesc')}</p>
                  </div>
                </div>

                <div className="notif-toggle-row">
                  <div>
                    <strong>{t('settings.notifications.ordersTitle')}</strong>
                    <p>{t('settings.notifications.ordersDesc')}</p>
                  </div>
                  <label className="toggle-switch-wrap">
                    <input
                      type="checkbox"
                      checked={notifPreferences.salesOrdersAlerts}
                      onChange={(e) => setNotifPreferences({ ...notifPreferences, salesOrdersAlerts: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="notif-toggle-row">
                  <div>
                    <strong>{t('settings.notifications.receivablesTitle')}</strong>
                    <p>{t('settings.notifications.receivablesDesc')}</p>
                  </div>
                  <label className="toggle-switch-wrap">
                    <input
                      type="checkbox"
                      checked={notifPreferences.receivablesAlerts}
                      onChange={(e) => setNotifPreferences({ ...notifPreferences, receivablesAlerts: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="notif-toggle-row">
                  <div>
                    <strong>{t('settings.notifications.weeklyTitle')}</strong>
                    <p>{t('settings.notifications.weeklyDesc')}</p>
                  </div>
                  <label className="toggle-switch-wrap">
                    <input
                      type="checkbox"
                      checked={notifPreferences.weeklySummaryEmail}
                      onChange={(e) => setNotifPreferences({ ...notifPreferences, weeklySummaryEmail: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 9. INTEGRACIONES & DEMÁS */}
          {(activeSetting === 'Integraciones' || activeSetting === 'Auditoría' || activeSetting === 'Plan y facturación') && (
            <div className="settings-form-container">
              <div className="settings-panel-heading">
                <div>
                  <h2>
                    {activeSetting === 'Integraciones'
                      ? t('settings.item.Integraciones')
                      : activeSetting === 'Auditoría'
                      ? t('settings.item.Auditoría')
                      : t('settings.item.Plan y facturación')}
                  </h2>
                  <p>
                    {activeSetting === 'Integraciones'
                      ? t('settings.integrations.subheading')
                      : activeSetting === 'Auditoría'
                      ? t('settings.audit.subheading')
                      : t('settings.plan.subheading')}
                  </p>
                </div>
                {activeSetting === 'Auditoría' && (
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={handleExportAuditCsv}
                    disabled={filteredAuditEvents.length === 0}
                  >
                    <Download size={14} /> {t('settings.audit.exportCsvBtn')}
                  </button>
                )}
              </div>

              {activeSetting === 'Integraciones' && (
                <div className="integrations-grid">
                  {integrations.map((integ) => {
                    const meta = getIntegrationMeta(integ.id)
                    const statusLabel = !integ.enabled
                      ? t('settings.integrations.statusPaused')
                      : integ.environment === 'sandbox'
                      ? t('settings.integrations.statusSandbox')
                      : t('settings.integrations.statusConnected')
                    const syncDisplay = integ.lastSyncAt
                      ? t('settings.integrations.lastSyncLabel', {
                          time: `${formatDate(new Date(integ.lastSyncAt))} · ${formatTime(new Date(integ.lastSyncAt))}`,
                        })
                      : t('settings.integrations.neverSynced')
                    return (
                      <div key={integ.id} className="integration-card">
                        <div className="integration-header">
                          <div>
                            <strong>{meta.title}</strong>
                            <span className="integ-cat">
                              {meta.category} ·{' '}
                              {integ.environment === 'production'
                                ? t('settings.integrations.envProd')
                                : t('settings.integrations.envSandbox')}
                            </span>
                          </div>
                          <span
                            className={`integ-status-pill ${
                              !integ.enabled
                                ? 'status-paused'
                                : integ.environment === 'sandbox'
                                ? 'status-sandbox'
                                : ''
                            }`}
                          >
                            {statusLabel}
                          </span>
                        </div>
                        <p>{meta.desc}</p>
                        <div className="integration-meta-line">
                          <code>{integ.endpointOrAccount}</code>
                          <span>{syncDisplay}</span>
                        </div>
                        <button
                          type="button"
                          className="button button-ghost button-sm"
                          onClick={() => setEditingIntegration({ ...integ })}
                        >
                          {t('settings.integrations.configureBtn')} &rarr;
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {activeSetting === 'Auditoría' && (
                <div className="settings-section-card">
                  <div className="card-header-row" style={{ flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h3>{t('settings.audit.cardTitle')}</h3>
                      <p>
                        {t('settings.audit.countLabel', {
                          count: filteredAuditEvents.length,
                          total: auditEvents.length,
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="audit-toolbar">
                    <label className="audit-search-wrap">
                      <Search size={13} />
                      <input
                        type="search"
                        value={auditSearch}
                        onChange={(e) => setAuditSearch(e.target.value)}
                        placeholder={t('settings.audit.searchPlaceholder')}
                        aria-label={t('settings.audit.searchPlaceholder')}
                      />
                    </label>
                    <div className="audit-filter-tabs" role="tablist">
                      {(
                        [
                          { id: 'all', label: t('settings.audit.filterAll') },
                          { id: 'settings', label: t('settings.audit.filterSettings') },
                          { id: 'users', label: t('settings.audit.filterUsers') },
                          { id: 'security', label: t('settings.audit.filterSecurity') },
                          { id: 'integrations', label: t('settings.audit.filterIntegrations') },
                          { id: 'ops', label: t('settings.audit.filterOperations') },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          role="tab"
                          aria-selected={auditCategoryFilter === tab.id}
                          className={`audit-filter-btn ${auditCategoryFilter === tab.id ? 'active' : ''}`}
                          onClick={() => setAuditCategoryFilter(tab.id)}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredAuditEvents.length === 0 ? (
                    <div className="audit-empty-state">
                      <strong>{t('settings.audit.emptyTitle')}</strong>
                      <p>{t('settings.audit.emptyDesc')}</p>
                    </div>
                  ) : (
                    <div className="audit-timeline">
                      {filteredAuditEvents.map((item) => {
                        const actionText = item.seedKey
                          ? t(`settings.audit.${item.seedKey}.action` as const)
                          : item.action
                        const detailText = item.seedKey
                          ? t(`settings.audit.${item.seedKey}.detail` as const)
                          : item.detail
                        const timeText = item.seedKey
                          ? t(`settings.audit.${item.seedKey}.time` as const)
                          : `${formatDate(new Date(item.timestampIso))} · ${formatTime(new Date(item.timestampIso))}`
                        return (
                          <div key={item.id} className="audit-item">
                            <span className="audit-dot" />
                            <div className="audit-content">
                              <div className="audit-title-row">
                                <strong>{actionText}</strong>
                                <span className="audit-time">{timeText}</span>
                              </div>
                              <span className="audit-detail">
                                {detailText} · <em>{item.user}</em>
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeSetting === 'Plan y facturación' && (
                <div className="settings-card-group">
                  <div className="settings-section-card">
                    <div className="card-header-row" style={{ flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <h3>{t('settings.plan.cardTitle')} · {planSettings.tier}</h3>
                        <p>{t('settings.plan.cardDesc', { workspace: general.workspaceName })}</p>
                      </div>
                      <div className="plan-controls-inline">
                        <div className="plan-cycle-switch" role="group" aria-label={t('settings.plan.tierLabel')}>
                          <button
                            type="button"
                            className={`audit-filter-btn ${planSettings.billingCycle === 'monthly' ? 'active' : ''}`}
                            onClick={() => handleUpdatePlan(planSettings.tier, 'monthly')}
                          >
                            {t('settings.plan.cycleMonthly')}
                          </button>
                          <button
                            type="button"
                            className={`audit-filter-btn ${planSettings.billingCycle === 'annual' ? 'active' : ''}`}
                            onClick={() => handleUpdatePlan(planSettings.tier, 'annual')}
                          >
                            {t('settings.plan.cycleAnnual')}
                          </button>
                        </div>
                        <select
                          aria-label={t('settings.plan.tierLabel')}
                          className="plan-tier-select"
                          value={planSettings.tier}
                          onChange={(e) =>
                            handleUpdatePlan(e.target.value as PlanTier, planSettings.billingCycle)
                          }
                        >
                          <option value="Growth">{t('settings.plan.tierGrowth')}</option>
                          <option value="Enterprise">{t('settings.plan.tierEnterprise')}</option>
                          <option value="Corporate">{t('settings.plan.tierCorporate')}</option>
                        </select>
                      </div>
                    </div>

                    <div className="plan-stats-grid plan-stats-grid-4">
                      <div className="plan-stat-box">
                        <span className="stat-label">{t('settings.plan.activeUsersLabel')}</span>
                        <strong className="tabular-nums">
                          {t('settings.plan.activeUsersVal', { count: users.length })}
                        </strong>
                        <span className="stat-sub">
                          {t('settings.plan.activeUsersDetail', {
                            active: users.filter((u) => u.status === 'active').length,
                            total: users.length,
                          })}
                        </span>
                      </div>
                      <div className="plan-stat-box">
                        <span className="stat-label">{t('settings.plan.warehousesLabel')}</span>
                        <strong className="tabular-nums">
                          {t('settings.plan.warehousesVal', {
                            count: activeWarehouses.length > 0 ? activeWarehouses.length : warehouses.length,
                          })}
                        </strong>
                        <span className="stat-sub">
                          {activeWarehouses.length > 0
                            ? activeWarehouses.map((w) => w.code).join(' · ')
                            : organizationSites.map((s) => s.name).slice(0, 2).join(' · ')}
                        </span>
                      </div>
                      <div className="plan-stat-box">
                        <span className="stat-label">{t('settings.plan.cfdiLabel')}</span>
                        <strong className="tabular-nums">
                          {t('settings.plan.invoicesIssuedVal', { count: receivablesCount })}
                        </strong>
                        <span className="stat-sub">{t('settings.plan.cfdiSub')}</span>
                      </div>
                      <div className="plan-stat-box">
                        <span className="stat-label">{t('settings.plan.integrationsLabel')}</span>
                        <strong className="tabular-nums">
                          {t('settings.plan.integrationsVal', {
                            count: integrations.filter((i) => i.enabled).length,
                            total: integrations.length,
                          })}
                        </strong>
                        <span className="stat-sub">
                          {t('settings.plan.nextBilling', {
                            date: formatDate(new Date(planSettings.nextBillingIso)),
                            last4: planSettings.paymentLast4,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="settings-section-card">
                    <div className="card-header-row">
                      <div>
                        <h3>{t('settings.plan.billingHistoryTitle')}</h3>
                        <p>{t('settings.plan.billingHistoryDesc')}</p>
                      </div>
                      <button
                        type="button"
                        className="button button-secondary button-sm"
                        onClick={handleExportBillingHistory}
                      >
                        <Download size={12} /> {t('settings.plan.downloadReceiptBtn')}
                      </button>
                    </div>

                    <div className="table-responsive">
                      <table className="settings-users-table">
                        <thead>
                          <tr>
                            <th>{t('settings.plan.colFolio')}</th>
                            <th>{t('settings.plan.colDate')}</th>
                            <th>{t('settings.plan.colAmount')}</th>
                            <th style={{ textAlign: 'right' }}>{t('settings.plan.colStatus')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {planSettings.billingInvoices.map((inv) => {
                            const adjustedAmount =
                              planSettings.tier === 'Growth'
                                ? Math.round(inv.amountMxn * 0.6)
                                : planSettings.tier === 'Corporate'
                                ? Math.round(inv.amountMxn * 1.45)
                                : inv.amountMxn
                            const finalAmount =
                              planSettings.billingCycle === 'monthly'
                                ? Math.round(adjustedAmount / 0.85)
                                : adjustedAmount
                            return (
                              <tr key={inv.id}>
                                <td><code className="radio-sample-code">{inv.folio}</code></td>
                                <td className="tabular-nums">{formatDate(new Date(inv.dateIso))}</td>
                                <td className="tabular-nums">
                                  <strong>{formatCurrency(finalAmount, general.reportingCurrency)}</strong>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <span className="user-status-pill status-active">
                                    <span className="status-dot" />
                                    {t('settings.plan.statusPaid')}
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: INVITAR COLABORADOR */}
      {showInviteModal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowInviteModal(false)
          }}
        >
          <section
            className="create-modal"
            style={{ maxWidth: '460px' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-modal-title"
          >
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">{t('settings.modal.invite.kicker')}</div>
                <h2 id="invite-modal-title">{t('settings.modal.invite.title')}</h2>
                <p>{t('settings.modal.invite.desc')}</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowInviteModal(false)}
                aria-label={t('settings.modal.closeAria')}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleInviteUserSubmit}>
              <div className="form-field">
                <label htmlFor="invite-name-input">{t('settings.modal.invite.nameLabel')}</label>
                <input
                  id="invite-name-input"
                  type="text"
                  placeholder={t('settings.modal.invite.namePlaceholder')}
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="invite-email-input">{t('settings.modal.invite.emailLabel')}</label>
                <input
                  id="invite-email-input"
                  type="email"
                  placeholder={t('settings.modal.invite.emailPlaceholder')}
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="invite-role-select">{t('settings.modal.invite.roleLabel')}</label>
                <select
                  id="invite-role-select"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  {roleDefinitions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.id === 'Operaciones'
                        ? t('settings.modal.invite.roleOps')
                        : r.id === 'Ventas'
                        ? t('settings.modal.invite.roleSales')
                        : r.id === 'Finanzas'
                        ? t('settings.modal.invite.roleFin')
                        : r.id === 'Administrador'
                        ? t('settings.modal.invite.roleAdmin')
                        : r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="create-modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setShowInviteModal(false)}
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="button button-primary">
                  <UserCheck size={14} /> {t('settings.modal.invite.submitBtn')}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* MODAL: AGREGAR SEDE */}
      {showBranchModal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowBranchModal(false)
          }}
        >
          <section
            className="create-modal"
            style={{ maxWidth: '460px' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="branch-modal-title"
          >
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">{t('settings.modal.branch.kicker')}</div>
                <h2 id="branch-modal-title">{t('settings.modal.branch.title')}</h2>
                <p>{t('settings.modal.branch.desc')}</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowBranchModal(false)}
                aria-label={t('settings.modal.closeAria')}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddBranchSubmit}>
              <div className="form-field">
                <label htmlFor="branch-name-input">{t('settings.modal.branch.nameLabel')}</label>
                <input
                  id="branch-name-input"
                  type="text"
                  placeholder={t('settings.modal.branch.namePlaceholder')}
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="branch-type-select">{t('settings.modal.branch.typeLabel')}</label>
                <select
                  id="branch-type-select"
                  value={branchType}
                  onChange={(e) => setBranchType(e.target.value)}
                >
                  <option value="Almacén / Punto Logístico">{t('settings.modal.branch.typeLogistics')}</option>
                  <option value="Oficina corporativa">{t('settings.modal.branch.typeCorporate')}</option>
                  <option value="Sucursal comercial">{t('settings.modal.branch.typeRetail')}</option>
                  <option value="Taller de ensamble">{t('settings.modal.branch.typeWorkshop')}</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="branch-city-input">{t('settings.modal.branch.cityLabel')}</label>
                <input
                  id="branch-city-input"
                  type="text"
                  placeholder={t('settings.modal.branch.cityPlaceholder')}
                  value={branchCity}
                  onChange={(e) => setBranchCity(e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="branch-address-input">{t('settings.modal.branch.addressLabel')}</label>
                <input
                  id="branch-address-input"
                  type="text"
                  placeholder={t('settings.modal.branch.addressPlaceholder')}
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                />
              </div>

              <div className="create-modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setShowBranchModal(false)}
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="button button-primary">
                  <Check size={14} /> {t('settings.modal.branch.submitBtn')}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* MODAL: CREAR NUEVO ROL */}
      {showCreateRoleModal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowCreateRoleModal(false)
          }}
        >
          <section
            className="create-modal"
            style={{ maxWidth: '540px' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-role-modal-title"
          >
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">{t('settings.roles.createModal.kicker')}</div>
                <h2 id="create-role-modal-title">{t('settings.roles.createModal.title')}</h2>
                <p>{t('settings.roles.createModal.desc')}</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowCreateRoleModal(false)}
                aria-label={t('settings.modal.closeAria')}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateRoleSubmit}>
              <div className="form-field">
                <label htmlFor="create-role-name">{t('settings.roles.createModal.nameLabel')}</label>
                <input
                  id="create-role-name"
                  type="text"
                  placeholder={t('settings.roles.createModal.namePlaceholder')}
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="create-role-desc">{t('settings.roles.createModal.descLabel')}</label>
                <input
                  id="create-role-desc"
                  type="text"
                  placeholder={t('settings.roles.createModal.descPlaceholder')}
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                />
              </div>

              <div className="form-field">
                <span className="settings-field-label">
                  {t('settings.roles.createModal.capsLabel')} ({newRoleCapsDraft.length})
                </span>
                <div className="role-permissions-matrix">
                  {ALL_CAPABILITIES.map((cap) => {
                    const checked = newRoleCapsDraft.includes(cap.id)
                    return (
                      <label
                        key={cap.id}
                        className={`role-perm-checkbox-card ${checked ? 'checked' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setNewRoleCapsDraft((prev) =>
                              e.target.checked
                                ? [...prev, cap.id]
                                : prev.filter((c) => c !== cap.id)
                            )
                          }}
                        />
                        <div>
                          <strong>{getCapabilityLabel(cap.id)}</strong>
                          <small>{getRoleLabel(cap.group)}</small>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="create-modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setShowCreateRoleModal(false)}
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="button button-primary">
                  <Plus size={14} /> {t('settings.roles.createModal.submitBtn')}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* MODAL: EDITAR PERMISOS DE ROL */}
      {editingRole && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEditingRole(null)
          }}
        >
          <section
            className="create-modal"
            style={{ maxWidth: '540px' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-modal-title"
          >
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">{t('settings.roles.modal.kicker')}</div>
                <h2 id="role-modal-title">
                  {t('settings.roles.modal.title', { role: getRoleCardTitle(editingRole) })}
                </h2>
                <p>{t('settings.roles.modal.desc')}</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setEditingRole(null)}
                aria-label={t('settings.modal.closeAria')}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveRolePermissions}>
              <div className="role-permissions-matrix">
                {ALL_CAPABILITIES.map((cap) => {
                  const checked = roleCapsDraft.includes(cap.id)
                  return (
                    <label
                      key={cap.id}
                      className={`role-perm-checkbox-card ${checked ? 'checked' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setRoleCapsDraft((prev) =>
                            e.target.checked ? [...prev, cap.id] : prev.filter((c) => c !== cap.id)
                          )
                        }}
                      />
                      <div>
                        <strong>{getCapabilityLabel(cap.id)}</strong>
                        <small>{getRoleLabel(cap.group)}</small>
                      </div>
                    </label>
                  )
                })}
              </div>

              <div className="create-modal-actions" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  {Object.prototype.hasOwnProperty.call(DEFAULT_ROLE_PERMISSIONS, editingRole.id) && (
                    <button
                      type="button"
                      className="button button-ghost button-sm"
                      onClick={() => {
                        const defaultCaps =
                          DEFAULT_ROLE_PERMISSIONS[editingRole.id as BuiltInRoleKey]
                        setRoleCapsDraft([...defaultCaps])
                        toast.info(
                          t('settings.roles.modal.resetToast', { role: getRoleCardTitle(editingRole) }),
                          t('settings.item.Roles y permisos')
                        )
                      }}
                    >
                      <RotateCcw size={13} /> {t('settings.roles.modal.resetBtn')}
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setEditingRole(null)}
                  >
                    {t('common.cancel')}
                  </button>
                  <button type="submit" className="button button-primary">
                    <Check size={14} /> {t('settings.roles.modal.saveBtn')}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* MODAL: CONFIGURAR CONECTOR DE INTEGRACIÓN */}
      {editingIntegration && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEditingIntegration(null)
          }}
        >
          <section
            className="create-modal"
            style={{ maxWidth: '500px' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="integration-modal-title"
          >
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">{t('settings.integrations.modal.kicker')}</div>
                <h2 id="integration-modal-title">
                  {t('settings.integrations.modal.title', {
                    title: getIntegrationMeta(editingIntegration.id).title,
                  })}
                </h2>
                <p>{t('settings.integrations.modal.desc')}</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setEditingIntegration(null)}
                aria-label={t('settings.modal.closeAria')}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveIntegration}>
              <div className="notif-toggle-row" style={{ paddingTop: 0, marginBottom: '12px' }}>
                <div>
                  <strong>{t('settings.integrations.modal.enabledLabel')}</strong>
                  <p>{t('settings.integrations.modal.enabledHint')}</p>
                </div>
                <label className="toggle-switch-wrap">
                  <input
                    type="checkbox"
                    checked={editingIntegration.enabled}
                    onChange={(e) =>
                      setEditingIntegration({ ...editingIntegration, enabled: e.target.checked })
                    }
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label htmlFor="integ-env-select">{t('settings.integrations.modal.envLabel')}</label>
                  <select
                    id="integ-env-select"
                    value={editingIntegration.environment}
                    onChange={(e) =>
                      setEditingIntegration({
                        ...editingIntegration,
                        environment: e.target.value as 'production' | 'sandbox',
                      })
                    }
                  >
                    <option value="production">{t('settings.integrations.envProd')}</option>
                    <option value="sandbox">{t('settings.integrations.envSandbox')}</option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="integ-sync-select">{t('settings.integrations.modal.syncLabel')}</label>
                  <select
                    id="integ-sync-select"
                    value={editingIntegration.syncMode}
                    onChange={(e) =>
                      setEditingIntegration({
                        ...editingIntegration,
                        syncMode: e.target.value as 'realtime' | '15m' | 'hourly',
                      })
                    }
                  >
                    <option value="realtime">{t('settings.integrations.modal.syncRealtime')}</option>
                    <option value="15m">{t('settings.integrations.modal.sync15m')}</option>
                    <option value="hourly">{t('settings.integrations.modal.syncHourly')}</option>
                  </select>
                </div>
              </div>

              <div className="form-field" style={{ marginTop: '12px' }}>
                <label htmlFor="integ-endpoint-input">{t('settings.integrations.modal.endpointLabel')}</label>
                <input
                  id="integ-endpoint-input"
                  type="text"
                  value={editingIntegration.endpointOrAccount}
                  onChange={(e) =>
                    setEditingIntegration({ ...editingIntegration, endpointOrAccount: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-field" style={{ marginTop: '12px' }}>
                <label htmlFor="integ-cred-input">{t('settings.integrations.modal.credentialLabel')}</label>
                <input
                  id="integ-cred-input"
                  type="text"
                  value={editingIntegration.credentialMask}
                  onChange={(e) =>
                    setEditingIntegration({ ...editingIntegration, credentialMask: e.target.value })
                  }
                />
              </div>

              <div className="create-modal-actions" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  type="button"
                  className="button button-secondary button-sm"
                  onClick={handleTestIntegration}
                >
                  <RefreshCw size={13} /> {t('settings.integrations.modal.testBtn')}
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setEditingIntegration(null)}
                  >
                    {t('common.cancel')}
                  </button>
                  <button type="submit" className="button button-primary">
                    <Check size={14} /> {t('settings.integrations.modal.saveBtn')}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  )
}
