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
  ImagePlus,
  Upload,
  AlertTriangle,
  Eye,
  EyeOff,
  Sparkles,
  ArrowUpRight,
  KeyRound,
  Copy,
  Play,
  Pause,
  Terminal,
  ShieldAlert,
  Code2,
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
  AUDIT_CHANGED_EVENT,
  DEFAULT_EXTERNAL_INTEGRATIONS,
  DEFAULT_INTEGRATIONS,
  DEFAULT_NEW_USER_ROLE_CHANGED_EVENT,
  DEFAULT_PLAN_SETTINGS,
  DEFAULT_ROLE_PERMISSIONS,
  EMPTY_EXTERNAL_PERMISSIONS,
  EXTERNAL_API_ACTIONS,
  EXTERNAL_API_RESOURCES,
  PLAN_ADDONS_CATALOG,
  PLAN_TIER_CATALOG,
  ROLES_CHANGED_EVENT,
  STORAGE_KEYS,
  USERS_CHANGED_EVENT,
  appendAuditLog,
  generateExternalApiKey,
  getWorkspaceUserRoleIds,
  isGeneralAdminRole,
  loadDefaultNewUserRole,
  loadStoredAuditEvents,
  loadStoredRoleDefinitions,
  loadStoredWorkspaceUsers,
  readStoredJson,
  saveDefaultNewUserRole,
  writeStoredJson,
  type AuditEventRecord,
  type BuiltInRoleKey,
  type ExternalApiAction,
  type ExternalApiResource,
  type ExternalIntegrationLog,
  type ExternalIntegrationRecord,
  type ExternalSystemType,
  type IntegrationConfig,
  type IntegrationId,
  type PlanAddonsState,
  type PlanBillingInvoice,
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
  logoDataUrl?: string
  logoFileName?: string
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
      logoDataUrl: '',
      logoFileName: '',
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
  const [defaultNewUserRole, setDefaultNewUserRole] = useState<RoleKey>(() =>
    loadDefaultNewUserRole(loadStoredRoleDefinitions())
  )
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null)
  const [roleCapsDraft, setRoleCapsDraft] = useState<RoleCapabilityId[]>([])
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDesc, setNewRoleDesc] = useState('')
  const [newRoleCapsDraft, setNewRoleCapsDraft] = useState<RoleCapabilityId[]>([])

  useEffect(() => {
    const syncDefaultRole = () => {
      setDefaultNewUserRole(loadDefaultNewUserRole(roleDefinitions))
    }
    window.addEventListener(DEFAULT_NEW_USER_ROLE_CHANGED_EVENT, syncDefaultRole)
    window.addEventListener('storage', syncDefaultRole)
    return () => {
      window.removeEventListener(DEFAULT_NEW_USER_ROLE_CHANGED_EVENT, syncDefaultRole)
      window.removeEventListener('storage', syncDefaultRole)
    }
  }, [roleDefinitions])

  // 8. INTEGRATIONS STATE
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>(() =>
    readStoredJson(STORAGE_KEYS.integrations, DEFAULT_INTEGRATIONS)
  )
  const [editingIntegration, setEditingIntegration] = useState<IntegrationConfig | null>(null)

  // 8B. EXTERNAL SYSTEMS API INTEGRATIONS (CRUD REGISTRY)
  const [externalIntegrations, setExternalIntegrations] = useState<ExternalIntegrationRecord[]>(() =>
    readStoredJson(STORAGE_KEYS.externalIntegrations, DEFAULT_EXTERNAL_INTEGRATIONS)
  )
  const [extSearch, setExtSearch] = useState('')
  const [extStatusFilter, setExtStatusFilter] = useState<'all' | 'active' | 'paused' | 'revoked'>('all')
  const [revealedKeyId, setRevealedKeyId] = useState<string | null>(null)
  const [newlyIssuedKeyBanner, setNewlyIssuedKeyBanner] = useState<{
    integrationId: string
    integrationName: string
    apiKeySecret: string
  } | null>(null)
  const [extModalOpen, setExtModalOpen] = useState(false)
  const [extEditingId, setExtEditingId] = useState<string | null>(null)
  const [extDraft, setExtDraft] = useState<{
    name: string
    systemType: ExternalSystemType
    description: string
    environment: 'production' | 'sandbox'
    status: 'active' | 'paused' | 'revoked'
    webhookCallbackUrl: string
    ipAllowlist: string
    rateLimitPerMin: number
    permissions: Record<ExternalApiResource, ExternalApiAction[]>
  }>({
    name: '',
    systemType: 'Ecommerce',
    description: '',
    environment: 'production',
    status: 'active',
    webhookCallbackUrl: '',
    ipAllowlist: '',
    rateLimitPerMin: 120,
    permissions: {
      ...EMPTY_EXTERNAL_PERMISSIONS,
      clientes: ['read'],
    },
  })
  const [simIntegrationId, setSimIntegrationId] = useState<string | null>(null)
  const [simMethod, setSimMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET')
  const [simResource, setSimResource] = useState<ExternalApiResource>('clientes')
  const [simPayload, setSimPayload] = useState('')
  const [simResult, setSimResult] = useState<{
    statusCode: 200 | 201 | 401 | 403
    latencyMs: number
    body: string
  } | null>(null)

  // 9. AUDIT TRAIL STATE
  const [auditEvents, setAuditEvents] = useState<AuditEventRecord[]>(() =>
    loadStoredAuditEvents()
  )
  const [auditSearch, setAuditSearch] = useState('')
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<'all' | 'settings' | 'users' | 'security' | 'integrations' | 'ops'>('all')

  useEffect(() => {
    const syncAudit = () => setAuditEvents(loadStoredAuditEvents())
    window.addEventListener(AUDIT_CHANGED_EVENT, syncAudit)
    window.addEventListener('storage', syncAudit)
    return () => {
      window.removeEventListener(AUDIT_CHANGED_EVENT, syncAudit)
      window.removeEventListener('storage', syncAudit)
    }
  }, [])

  // 10. PLAN & BILLING STATE
  const [planSettings, setPlanSettings] = useState<PlanSubscriptionSettings>(() => {
    const stored = readStoredJson<Partial<PlanSubscriptionSettings>>(
      STORAGE_KEYS.plan,
      DEFAULT_PLAN_SETTINGS
    )
    const mergedInvoices =
      Array.isArray(stored.billingInvoices) && stored.billingInvoices.length >= 4
        ? stored.billingInvoices.map((inv, idx) => ({
            ...DEFAULT_PLAN_SETTINGS.billingInvoices[idx % DEFAULT_PLAN_SETTINGS.billingInvoices.length],
            ...inv,
          }))
        : DEFAULT_PLAN_SETTINGS.billingInvoices
    return {
      ...DEFAULT_PLAN_SETTINGS,
      ...stored,
      addons: {
        ...DEFAULT_PLAN_SETTINGS.addons,
        ...(stored.addons || {}),
      },
      billingInvoices: mergedInvoices,
    }
  })
  const [billingSearch, setBillingSearch] = useState('')
  const [billingStatusFilter, setBillingStatusFilter] = useState<'all' | 'paid' | 'pending'>('all')
  const [selectedBillingInvoice, setSelectedBillingInvoice] = useState<PlanBillingInvoice | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentDraft, setPaymentDraft] = useState({
    paymentBrand: planSettings.paymentBrand,
    paymentLast4: planSettings.paymentLast4,
    paymentExpiry: planSettings.paymentExpiry,
    paymentHolder: planSettings.paymentHolder,
    billingEmail: planSettings.billingEmail,
  })

  const recordAudit = (entry: Omit<AuditEventRecord, 'id' | 'timestampIso'>) => {
    const next = appendAuditLog(entry)
    setAuditEvents(next)
  }

  // Modal for inviting user
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRoles, setInviteRoles] = useState<RoleKey[]>(() => [
    loadDefaultNewUserRole(loadStoredRoleDefinitions()),
  ])
  const [hoveredRolesPopover, setHoveredRolesPopover] = useState<{
    userId: string
    roles: string[]
    rect: { top: number; left: number; bottom: number; width: number }
  } | null>(null)

  useEffect(() => {
    if (!hoveredRolesPopover) return
    const handleDismiss = () => setHoveredRolesPopover(null)
    window.addEventListener('scroll', handleDismiss, true)
    window.addEventListener('resize', handleDismiss)
    return () => {
      window.removeEventListener('scroll', handleDismiss, true)
      window.removeEventListener('resize', handleDismiss)
    }
  }, [hoveredRolesPopover])

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
          ? ev.category === 'inventory' ||
            ev.category === 'sales' ||
            ev.category === 'finance' ||
            ev.category === 'admin'
          : auditCategoryFilter === 'security'
          ? ev.category === 'security' || ev.category === 'session'
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

  const [logoPreviewError, setLogoPreviewError] = useState(false)

  const persistAndBroadcastOrg = (next: OrganizationSettings) => {
    localStorage.setItem(STORAGE_KEYS.org, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent('aes_nexus_org_changed', { detail: next }))
  }

  const handleOrgLogoFileChange = (file: File | null | undefined) => {
    if (!file) return
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
    if (!allowed.includes(file.type) && !file.type.startsWith('image/')) {
      toast.warning(t('settings.org.logoInvalidTypeToast'), t('settings.org.logoCardTitle'))
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.warning(t('settings.org.logoTooLargeToast'), t('settings.org.logoCardTitle'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : ''
      if (!dataUrl) return
      setLogoPreviewError(false)
      const next: OrganizationSettings = {
        ...org,
        logoDataUrl: dataUrl,
        logoFileName: file.name,
      }
      setOrg(next)
      persistAndBroadcastOrg(next)
      toast.success(t('settings.org.logoLoadedToast'), t('settings.org.logoCardTitle'))
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveOrgLogo = () => {
    setLogoPreviewError(false)
    const next: OrganizationSettings = { ...org, logoDataUrl: '', logoFileName: '' }
    setOrg(next)
    persistAndBroadcastOrg(next)
    toast.info(t('settings.org.logoRemovedToast'), t('settings.org.logoCardTitle'))
  }

  const handleSaveOrg = () => {
    persistAndBroadcastOrg(org)
    recordAudit({
      category: 'settings',
      action: t('settings.org.heading'),
      detail: `${org.legalName} · ${org.rfc}${org.logoDataUrl ? ' · Logo actualizado' : ''}`,
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
    const validRoleIds = new Set(roleDefinitions.map((r) => r.id))
    const selectedRoleIds = inviteRoles.filter((id) => validRoleIds.has(id))
    if (selectedRoleIds.length === 0) {
      toast.warning(
        t('settings.modal.invite.selectAtLeastOneRole'),
        t('settings.users.missingFieldsTitle')
      )
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
      role: selectedRoleIds[0],
      roles: selectedRoleIds,
      status: 'active',
      lastLogin: t('settings.users.pendingInviteLogin'),
      avatarInitials: initials,
    }

    const roleSummary = selectedRoleIds
      .map((rId) => getRoleLabel(rId))
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      .join(', ')

    const updated = [...users, newUser]
    persistUsers(updated)
    recordAudit({
      category: 'users',
      action: t('settings.users.invitedTitle'),
      detail: `${newUser.name} (${newUser.email}) · ${roleSummary}`,
      user: 'Andrea Morales',
    })
    setInviteName('')
    setInviteEmail('')
    setInviteRoles([loadDefaultNewUserRole(roleDefinitions)])
    setShowInviteModal(false)
    toast.success(
      t('settings.users.invitedToast', {
        email: newUser.email,
        role: roleSummary,
      }),
      t('settings.users.invitedTitle')
    )
  }

  const handleOpenInviteModal = () => {
    const resolvedDefault = loadDefaultNewUserRole(roleDefinitions)
    setInviteRoles([resolvedDefault])
    setShowInviteModal(true)
  }

  const handleChangeDefaultNewUserRole = (nextRoleId: RoleKey) => {
    if (!isFullAdmin) {
      toast.warning(
        'Solo un administrador puede modificar el rol predeterminado para nuevos usuarios.',
        'Acceso restringido'
      )
      return
    }
    const targetRole = roleDefinitions.find((r) => r.id === nextRoleId)
    if (!targetRole || nextRoleId === defaultNewUserRole) return
    setDefaultNewUserRole(nextRoleId)
    saveDefaultNewUserRole(nextRoleId)
    setInviteRoles([nextRoleId])
    const roleLabel = getRoleCardTitle(targetRole)
    recordAudit({
      category: 'users',
      action: 'Rol predeterminado de registro actualizado',
      detail: `Nuevos usuarios recibirán: ${roleLabel}`,
      user: 'Andrea Morales',
    })
    toast.success(
      `Todo usuario nuevo registrado o invitado recibirá automáticamente el rol "${roleLabel}".`,
      'Rol predeterminado actualizado'
    )
  }

  const isUserAdminRole = (user: WorkspaceUserRecord) => {
    const validRoleIds = new Set(roleDefinitions.map((r) => r.id))
    const userRoleIds = getWorkspaceUserRoleIds(user, validRoleIds)
    return userRoleIds.some((rId) => {
      if (rId === 'Administrador') return true
      const def = roleDefinitions.find((r) => r.id === rId)
      return isGeneralAdminRole(def)
    })
  }

  const handleToggleUserStatus = (userId: string) => {
    const targetUser = users.find((u) => u.id === userId)
    if (targetUser && targetUser.status === 'active' && isUserAdminRole(targetUser)) {
      toast.warning(
        'Los usuarios con el rol Administrador no pueden ser suspendidos.',
        'Usuario protegido'
      )
      return
    }
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
    const affectedCount = users.filter((u) => getWorkspaceUserRoleIds(u).includes(role.id)).length
    if (affectedCount > 0 && fallbackRole) {
      const reassignedUsers = users.map((u) => {
        const currentIds = getWorkspaceUserRoleIds(u)
        if (!currentIds.includes(role.id)) return u
        const nextIds = currentIds.filter((id) => id !== role.id)
        const normalizedIds = nextIds.length > 0 ? nextIds : [fallbackRole.id]
        return {
          ...u,
          role: normalizedIds[0],
          roles: normalizedIds,
        }
      })
      persistUsers(reassignedUsers)
    }
    setInviteRoles((prev) => {
      const filtered = prev.filter((id) => id !== role.id)
      return filtered.length > 0 ? filtered : fallbackRole ? [fallbackRole.id] : []
    })
    if (defaultNewUserRole === role.id && fallbackRole) {
      setDefaultNewUserRole(fallbackRole.id)
      saveDefaultNewUserRole(fallbackRole.id)
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

  const persistExternalIntegrations = (updated: ExternalIntegrationRecord[]) => {
    setExternalIntegrations(updated)
    writeStoredJson(STORAGE_KEYS.externalIntegrations, updated)
  }

  const cloneExtPermissions = (
    perms: Record<ExternalApiResource, ExternalApiAction[]>
  ): Record<ExternalApiResource, ExternalApiAction[]> => ({
    clientes: [...perms.clientes],
    productos: [...perms.productos],
    ventas: [...perms.ventas],
    compras: [...perms.compras],
    finanzas: [...perms.finanzas],
    rrhh: [...perms.rrhh],
  })

  const getSamplePayloadForCrud = (
    resource: ExternalApiResource,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  ): string => {
    if (method === 'GET') return ''
    if (method === 'DELETE') {
      return JSON.stringify(
        {
          id: `${resource.slice(0, 3).toUpperCase()}-9042`,
          reason: 'Depuración solicitada por sistema externo autorizado',
        },
        null,
        2
      )
    }
    const samples: Record<ExternalApiResource, Record<string, unknown>> = {
      clientes: {
        razonSocial: 'Distribuidora Industrial Bajío S.A. de C.V.',
        rfc: 'DIB180412KX9',
        correo: 'cuentas@bajioindustrial.mx',
        limiteCreditoMxn: 250000,
      },
      productos: {
        sku: 'NX-VALV-440',
        nombre: 'Válvula Check Acero Inox 2"',
        precioUnitarioMxn: 3420,
        stockInicial: 48,
      },
      ventas: {
        clienteId: 'CLI-1084',
        sucursal: 'CDMX Insurgentes',
        moneda: 'MXN',
        partidas: [{ sku: 'NX-VALV-440', cantidad: 6, precio: 3420 }],
      },
      compras: {
        proveedorId: 'PROV-302',
        almacenDestino: 'Vallejo Central',
        partidas: [{ sku: 'NX-VALV-440', cantidad: 30, costoUnitario: 2150 }],
      },
      finanzas: {
        tipoPoliza: 'Ingreso',
        referencia: 'SPEI-994120',
        montoMxn: 20520,
        cuentaContable: '102.01-Banorte',
      },
      rrhh: {
        numeroEmpleado: 'EMP-0294',
        departamento: 'Operaciones',
        estatus: 'Activo',
        puesto: 'Analista de Inventarios',
      },
    }
    return JSON.stringify(samples[resource], null, 2)
  }

  const handleOpenCreateExternalInteg = () => {
    setExtEditingId(null)
    setExtDraft({
      name: '',
      systemType: 'Ecommerce',
      description: '',
      environment: 'production',
      status: 'active',
      webhookCallbackUrl: '',
      ipAllowlist: '',
      rateLimitPerMin: 120,
      permissions: {
        ...cloneExtPermissions(EMPTY_EXTERNAL_PERMISSIONS),
        clientes: ['read', 'create'],
        productos: ['read'],
      },
    })
    setExtModalOpen(true)
  }

  const handleOpenEditExternalInteg = (rec: ExternalIntegrationRecord) => {
    setExtEditingId(rec.id)
    setExtDraft({
      name: rec.name,
      systemType: rec.systemType,
      description: rec.description,
      environment: rec.environment,
      status: rec.status,
      webhookCallbackUrl: rec.webhookCallbackUrl,
      ipAllowlist: rec.ipAllowlist,
      rateLimitPerMin: rec.rateLimitPerMin,
      permissions: cloneExtPermissions(rec.permissions),
    })
    setExtModalOpen(true)
  }

  const handleToggleExtPermission = (
    resource: ExternalApiResource,
    action: ExternalApiAction
  ) => {
    setExtDraft((prev) => {
      const current = prev.permissions[resource]
      const exists = current.includes(action)
      const nextActions = exists
        ? current.filter((a) => a !== action)
        : [...current, action]
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [resource]: nextActions,
        },
      }
    })
  }

  const handleApplyExtPreset = (preset: 'readonly' | 'readwrite' | 'full' | 'clear') => {
    setExtDraft((prev) => {
      const next = cloneExtPermissions(EMPTY_EXTERNAL_PERMISSIONS)
      for (const res of EXTERNAL_API_RESOURCES) {
        if (preset === 'readonly') next[res.id] = ['read']
        else if (preset === 'readwrite') next[res.id] = ['read', 'create', 'update']
        else if (preset === 'full') next[res.id] = ['read', 'create', 'update', 'delete']
        else next[res.id] = []
      }
      return { ...prev, permissions: next }
    })
  }

  const countGrantedCrudOps = (perms: Record<ExternalApiResource, ExternalApiAction[]>) =>
    Object.values(perms).reduce((sum, list) => sum + list.length, 0)

  const handleSaveExternalIntegration = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanName = extDraft.name.trim()
    if (!cleanName) {
      toast.warning('Ingresa el nombre del sistema externo a integrar.', 'Registro de integraciones API')
      return
    }
    const totalPerms = countGrantedCrudOps(extDraft.permissions)
    if (totalPerms === 0) {
      toast.warning(
        'Asigna al menos un permiso CRUD (Consultar, Insertar, Editar o Borrar) en la matriz.',
        'Matriz de permisos CRUD'
      )
      return
    }
    const cleanRate = Math.min(5000, Math.max(10, Number(extDraft.rateLimitPerMin) || 120))
    const nowIso = new Date().toISOString()

    if (extEditingId) {
      const updated = externalIntegrations.map((rec) =>
        rec.id === extEditingId
          ? {
              ...rec,
              name: cleanName,
              systemType: extDraft.systemType,
              description: extDraft.description.trim() || `Integración API para ${cleanName}`,
              environment: extDraft.environment,
              status: extDraft.status,
              webhookCallbackUrl: extDraft.webhookCallbackUrl.trim(),
              ipAllowlist: extDraft.ipAllowlist.trim(),
              rateLimitPerMin: cleanRate,
              permissions: cloneExtPermissions(extDraft.permissions),
            }
          : rec
      )
      persistExternalIntegrations(updated)
      recordAudit({
        category: 'integrations',
        action: 'Integración API externa actualizada',
        detail: `${cleanName} · ${totalPerms} permisos CRUD (${extDraft.environment})`,
        user: 'Andrea Morales',
      })
      toast.success(
        `Permisos y configuración de "${cleanName}" actualizados.`,
        'Integraciones API'
      )
    } else {
      const { apiKeyPrefix, apiKeySecret } = generateExternalApiKey(extDraft.environment)
      const newRecord: ExternalIntegrationRecord = {
        id: `ext_${Date.now().toString(36)}`,
        name: cleanName,
        systemType: extDraft.systemType,
        description:
          extDraft.description.trim() ||
          `Acceso API externo (${extDraft.systemType}) con permisos granulares en AES Nexus.`,
        environment: extDraft.environment,
        status: extDraft.status,
        apiKeyPrefix,
        apiKeySecret,
        webhookCallbackUrl: extDraft.webhookCallbackUrl.trim(),
        ipAllowlist: extDraft.ipAllowlist.trim(),
        rateLimitPerMin: cleanRate,
        permissions: cloneExtPermissions(extDraft.permissions),
        createdAtIso: nowIso,
        lastUsedAtIso: '',
        requestsCount: 0,
        recentLogs: [],
      }
      persistExternalIntegrations([newRecord, ...externalIntegrations])
      setRevealedKeyId(newRecord.id)
      setNewlyIssuedKeyBanner({
        integrationId: newRecord.id,
        integrationName: newRecord.name,
        apiKeySecret: newRecord.apiKeySecret,
      })
      recordAudit({
        category: 'integrations',
        action: 'Nueva integración API registrada',
        detail: `${newRecord.name} (${newRecord.systemType}) · ${totalPerms} operaciones CRUD habilitadas`,
        user: 'Andrea Morales',
      })
      toast.success(
        `Integración "${newRecord.name}" creada con llave Bearer lista para usar.`,
        'Integraciones API'
      )
    }
    setExtModalOpen(false)
  }

  const handleRotateExternalKey = (rec: ExternalIntegrationRecord) => {
    const { apiKeyPrefix, apiKeySecret } = generateExternalApiKey(rec.environment)
    const updated = externalIntegrations.map((item) =>
      item.id === rec.id
        ? {
            ...item,
            apiKeyPrefix,
            apiKeySecret,
            status: item.status === 'revoked' ? ('active' as const) : item.status,
          }
        : item
    )
    persistExternalIntegrations(updated)
    setRevealedKeyId(rec.id)
    setNewlyIssuedKeyBanner({
      integrationId: rec.id,
      integrationName: rec.name,
      apiKeySecret,
    })
    recordAudit({
      category: 'security',
      action: 'Rotación de credencial API externa',
      detail: `${rec.name} · Nuevo prefijo ${apiKeyPrefix}`,
      user: 'Andrea Morales',
    })
    toast.success(
      `Nueva llave API generada para "${rec.name}". La credencial anterior fue invalidada.`,
      'Seguridad API'
    )
  }

  const handleSetExternalStatus = (
    rec: ExternalIntegrationRecord,
    nextStatus: 'active' | 'paused' | 'revoked'
  ) => {
    const updated = externalIntegrations.map((item) =>
      item.id === rec.id ? { ...item, status: nextStatus } : item
    )
    persistExternalIntegrations(updated)
    const statusText =
      nextStatus === 'active'
        ? 'Reactivada'
        : nextStatus === 'paused'
        ? 'Pausada'
        : 'Revocada'
    recordAudit({
      category: 'integrations',
      action: `Integración API ${statusText.toLowerCase()}`,
      detail: `${rec.name} (${rec.apiKeyPrefix}••••)`,
      user: 'Andrea Morales',
    })
    toast.info(`Integración "${rec.name}" marcada como ${statusText}.`, 'Integraciones API')
  }

  const handleDeleteExternalIntegration = (rec: ExternalIntegrationRecord) => {
    const remaining = externalIntegrations.filter((item) => item.id !== rec.id)
    persistExternalIntegrations(remaining)
    if (newlyIssuedKeyBanner?.integrationId === rec.id) setNewlyIssuedKeyBanner(null)
    if (simIntegrationId === rec.id) setSimIntegrationId(null)
    recordAudit({
      category: 'integrations',
      action: 'Registro de integración API eliminado',
      detail: `${rec.name} (${rec.systemType})`,
      user: 'Andrea Morales',
    })
    toast.info(`Registro "${rec.name}" eliminado permanentemente.`, 'Integraciones API')
  }

  const handleCopyApiKey = (secret: string, label: string) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(secret).catch(() => {})
    }
    toast.success(`Credencial de ${label} copiada al portapapeles.`, 'Llave API copiada')
  }

  const handleOpenCrudSimulator = (rec: ExternalIntegrationRecord) => {
    const firstEnabledResource =
      EXTERNAL_API_RESOURCES.find((r) => rec.permissions[r.id].length > 0)?.id || 'clientes'
    const allowedActions = rec.permissions[firstEnabledResource]
    const defaultAction = allowedActions[0] || 'read'
    const methodMap: Record<ExternalApiAction, 'GET' | 'POST' | 'PUT' | 'DELETE'> = {
      read: 'GET',
      create: 'POST',
      update: 'PUT',
      delete: 'DELETE',
    }
    const defaultMethod = methodMap[defaultAction]
    setSimIntegrationId(rec.id)
    setSimResource(firstEnabledResource)
    setSimMethod(defaultMethod)
    setSimPayload(getSamplePayloadForCrud(firstEnabledResource, defaultMethod))
    setSimResult(null)
  }

  const handleRunCrudSimulation = () => {
    const rec = externalIntegrations.find((item) => item.id === simIntegrationId)
    if (!rec) return
    const actionMap: Record<'GET' | 'POST' | 'PUT' | 'DELETE', ExternalApiAction> = {
      GET: 'read',
      POST: 'create',
      PUT: 'update',
      DELETE: 'delete',
    }
    const requiredAction = actionMap[simMethod]
    const hasPermission = rec.permissions[simResource].includes(requiredAction)
    const resourceMeta =
      EXTERNAL_API_RESOURCES.find((r) => r.id === simResource) || EXTERNAL_API_RESOURCES[0]
    const nowIso = new Date().toISOString()
    const latencyMs = 28 + Math.floor(Math.random() * 54)

    let statusCode: 200 | 201 | 401 | 403 = 200
    let summary = ''
    let bodyObj: Record<string, unknown>

    if (rec.status === 'revoked') {
      statusCode = 401
      summary = `Petición ${simMethod} ${resourceMeta.endpoint} rechazada: credencial revocada`
      bodyObj = {
        ok: false,
        error: 'TOKEN_REVOKED',
        message: 'La llave Bearer proporcionada fue revocada y no puede operar en AES Nexus.',
      }
    } else if (rec.status === 'paused') {
      statusCode = 403
      summary = `Petición ${simMethod} ${resourceMeta.endpoint} bloqueada: integración pausada`
      bodyObj = {
        ok: false,
        error: 'INTEGRATION_PAUSED',
        message: 'La integración está temporalmente pausada por el administrador.',
      }
    } else if (!hasPermission) {
      statusCode = 403
      const actionLabel =
        EXTERNAL_API_ACTIONS.find((a) => a.id === requiredAction)?.label || requiredAction
      summary = `Acceso denegado a ${simMethod} ${resourceMeta.endpoint} (falta permiso ${actionLabel})`
      bodyObj = {
        ok: false,
        error: 'INSUFFICIENT_CRUD_SCOPE',
        requiredScope: `${simResource}:${requiredAction}`,
        grantedScopesForResource: rec.permissions[simResource],
        message: `El sistema "${rec.name}" no tiene permiso de "${actionLabel}" sobre ${resourceMeta.label}.`,
      }
    } else {
      statusCode = simMethod === 'POST' ? 201 : 200
      if (simMethod === 'GET') {
        summary = `Consulta ${resourceMeta.endpoint} ejecutada (25 registros devueltos)`
        bodyObj = {
          ok: true,
          resource: simResource,
          total: 25,
          page: 1,
          data: [
            {
              id: `${simResource.slice(0, 3).toUpperCase()}-1001`,
              estado: 'activo',
              actualizadoEn: nowIso,
            },
          ],
        }
      } else if (simMethod === 'POST') {
        const createdId = `${simResource.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 8999)}`
        summary = `Registro ${createdId} insertado vía API en ${resourceMeta.label}`
        bodyObj = {
          ok: true,
          operation: 'INSERT',
          id: createdId,
          createdAt: nowIso,
          message: `Registro creado correctamente en ${resourceMeta.label}.`,
        }
      } else if (simMethod === 'PUT') {
        summary = `Registro actualizado vía API en ${resourceMeta.label}`
        bodyObj = {
          ok: true,
          operation: 'UPDATE',
          updatedAt: nowIso,
          affectedRows: 1,
          message: `Cambios aplicados en ${resourceMeta.label}.`,
        }
      } else {
        summary = `Registro eliminado vía API en ${resourceMeta.label}`
        bodyObj = {
          ok: true,
          operation: 'DELETE',
          deletedAt: nowIso,
          affectedRows: 1,
          message: `Registro dado de baja correctamente en ${resourceMeta.label}.`,
        }
      }
    }

    const newLog: ExternalIntegrationLog = {
      id: `extlog_${Date.now().toString(36)}`,
      method: simMethod,
      resource: simResource,
      statusCode,
      summary,
      timestampIso: nowIso,
    }

    const updated = externalIntegrations.map((item) =>
      item.id === rec.id
        ? {
            ...item,
            lastUsedAtIso: nowIso,
            requestsCount: item.requestsCount + 1,
            recentLogs: [newLog, ...item.recentLogs].slice(0, 12),
          }
        : item
    )
    persistExternalIntegrations(updated)
    setSimResult({
      statusCode,
      latencyMs,
      body: JSON.stringify(bodyObj, null, 2),
    })
    recordAudit({
      category: 'integrations',
      action: `API Externa · ${simMethod} ${resourceMeta.endpoint}`,
      detail: `${rec.name} → HTTP ${statusCode} (${summary})`,
      user: 'Andrea Morales',
    })
  }

  const filteredExternalIntegrations = useMemo(() => {
    const q = extSearch.trim().toLowerCase()
    return externalIntegrations.filter((rec) => {
      if (extStatusFilter !== 'all' && rec.status !== extStatusFilter) return false
      if (!q) return true
      return `${rec.name} ${rec.systemType} ${rec.description} ${rec.apiKeyPrefix}`
        .toLowerCase()
        .includes(q)
    })
  }, [externalIntegrations, extSearch, extStatusFilter])

  const activeSimulatorIntegration = useMemo(
    () => externalIntegrations.find((item) => item.id === simIntegrationId) || null,
    [externalIntegrations, simIntegrationId]
  )

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

  const persistPlanSettings = (updated: PlanSubscriptionSettings) => {
    setPlanSettings(updated)
    writeStoredJson(STORAGE_KEYS.plan, updated)
  }

  const handleUpdatePlan = (tier: PlanTier, billingCycle: 'monthly' | 'annual') => {
    const updated: PlanSubscriptionSettings = { ...planSettings, tier, billingCycle }
    persistPlanSettings(updated)
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

  const handleToggleAutoRenew = () => {
    const nextAuto = !planSettings.autoRenew
    const updated: PlanSubscriptionSettings = { ...planSettings, autoRenew: nextAuto }
    persistPlanSettings(updated)
    recordAudit({
      category: 'settings',
      action: 'Renovación automática de suscripción',
      detail: nextAuto ? 'Activada' : 'Pausada al fin del periodo actual',
      user: 'Andrea Morales',
    })
    toast.info(
      nextAuto
        ? 'Renovación automática activada para el siguiente periodo.'
        : 'Renovación automática pausada; tu suscripción seguirá activa hasta la fecha de corte.',
      t('settings.item.Plan y facturación')
    )
  }

  const handleToggleAddon = (key: keyof PlanAddonsState) => {
    const addonMeta = PLAN_ADDONS_CATALOG.find((a) => a.key === key)
    const nextEnabled = !planSettings.addons[key]
    const updated: PlanSubscriptionSettings = {
      ...planSettings,
      addons: {
        ...planSettings.addons,
        [key]: nextEnabled,
      },
    }
    persistPlanSettings(updated)
    recordAudit({
      category: 'settings',
      action: 'Complemento de suscripción actualizado',
      detail: `${addonMeta?.name || key} → ${nextEnabled ? 'Activo' : 'Desactivado'}`,
      user: 'Andrea Morales',
    })
    toast.success(
      `${addonMeta?.name || key} ${nextEnabled ? 'agregado a tu suscripción' : 'removido de tu próximo cargo'}.`,
      t('settings.item.Plan y facturación')
    )
  }

  const handleOpenPaymentModal = () => {
    setPaymentDraft({
      paymentBrand: planSettings.paymentBrand,
      paymentLast4: planSettings.paymentLast4,
      paymentExpiry: planSettings.paymentExpiry,
      paymentHolder: planSettings.paymentHolder,
      billingEmail: planSettings.billingEmail,
    })
    setShowPaymentModal(true)
  }

  const handleSavePaymentMethod = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanLast4 = paymentDraft.paymentLast4.replace(/\D/g, '').slice(-4)
    if (cleanLast4.length !== 4) {
      toast.warning('Ingresa los últimos 4 dígitos de la tarjeta o cuenta CLABE.', 'Método de pago')
      return
    }
    const cleanEmail = paymentDraft.billingEmail.trim()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      toast.warning('Ingresa un correo electrónico válido para envío de comprobantes.', 'Método de pago')
      return
    }
    const updated: PlanSubscriptionSettings = {
      ...planSettings,
      paymentBrand: paymentDraft.paymentBrand,
      paymentLast4: cleanLast4,
      paymentExpiry: paymentDraft.paymentBrand === 'SPEI' ? 'Cuenta STP' : paymentDraft.paymentExpiry.trim() || '09/2028',
      paymentHolder: paymentDraft.paymentHolder.trim() || org.legalRep,
      billingEmail: cleanEmail,
    }
    persistPlanSettings(updated)
    recordAudit({
      category: 'finance',
      action: 'Actualización de método de pago de suscripción',
      detail: `${updated.paymentBrand} •••• ${updated.paymentLast4} (${updated.billingEmail})`,
      user: 'Andrea Morales',
    })
    setShowPaymentModal(false)
    toast.success(
      `Método de pago actualizado a ${updated.paymentBrand} terminación ${updated.paymentLast4}.`,
      'Facturación de suscripción'
    )
  }

  const handleDownloadInvoiceReceipt = (inv: PlanBillingInvoice) => {
    const receiptText = [
      'COMPROBANTE FISCAL DE SUSCRIPCIÓN · AES NEXUS ERP',
      '======================================================',
      `Folio:             ${inv.folio}`,
      `UUID Fiscal:       ${inv.cfdiUuid}`,
      `Fecha de emisión:  ${formatDate(new Date(inv.dateIso))}`,
      `Periodo cubierto:  ${inv.periodLabel}`,
      `Estado:            ${inv.status === 'paid' ? 'PAGADA' : 'PENDIENTE'}`,
      '------------------------------------------------------',
      `Receptor:          ${org.legalName}`,
      `RFC:               ${org.rfc}`,
      `Régimen Fiscal:    ${org.taxRegime}`,
      `Domicilio Fiscal:  ${org.fiscalStreet}, CP ${org.fiscalZip}, ${org.fiscalCity}`,
      `Correo de envío:   ${planSettings.billingEmail}`,
      '------------------------------------------------------',
      `Concepto:          ${inv.concept}`,
      `Método de pago:    ${inv.paymentMethod}`,
      `Subtotal:          ${formatCurrency(inv.subtotalMxn, general.reportingCurrency)}`,
      `IVA (16%):         ${formatCurrency(inv.taxMxn, general.reportingCurrency)}`,
      `Total:             ${formatCurrency(inv.amountMxn, general.reportingCurrency)}`,
      '======================================================',
    ].join('\n')
    const blob = new Blob([receiptText], { type: 'text/plain;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `comprobante_${inv.folio}.txt`
    link.click()
    URL.revokeObjectURL(url)
    toast.success(`Comprobante ${inv.folio} descargado correctamente.`, 'Historial de facturación')
  }

  const handleExportBillingHistory = () => {
    const header = [
      'Folio',
      'Periodo',
      'Concepto',
      'Fecha',
      'Método de Pago',
      'UUID Fiscal',
      'Subtotal (MXN)',
      'IVA 16% (MXN)',
      'Total (MXN)',
      'Estado',
    ]
    const rows = filteredBillingInvoices.map((inv) =>
      [
        inv.folio,
        inv.periodLabel,
        inv.concept,
        formatDate(new Date(inv.dateIso)),
        inv.paymentMethod,
        inv.cfdiUuid,
        inv.subtotalMxn,
        inv.taxMxn,
        inv.amountMxn,
        inv.status === 'paid' ? t('settings.plan.statusPaid') : 'Pendiente',
      ]
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

  const activeTierSpec = useMemo(
    () => PLAN_TIER_CATALOG.find((p) => p.tier === planSettings.tier) || PLAN_TIER_CATALOG[1],
    [planSettings.tier]
  )

  const planPricingSummary = useMemo(() => {
    const baseMonthly =
      planSettings.billingCycle === 'annual'
        ? Math.round(activeTierSpec.monthlyMxn * 0.85)
        : activeTierSpec.monthlyMxn
    const addonsMonthly = PLAN_ADDONS_CATALOG.reduce(
      (sum, addon) => sum + (planSettings.addons[addon.key] ? addon.monthlyMxn : 0),
      0
    )
    const subtotalMonthly = baseMonthly + addonsMonthly
    const subtotalCharge =
      planSettings.billingCycle === 'annual' ? subtotalMonthly * 12 : subtotalMonthly
    const taxCharge = Math.round(subtotalCharge * 0.16)
    const totalCharge = subtotalCharge + taxCharge
    const effectiveWarehousesLimit =
      activeTierSpec.maxWarehouses === null
        ? null
        : activeTierSpec.maxWarehouses + (planSettings.addons.extraWarehouses ? 5 : 0)

    return {
      baseMonthly,
      addonsMonthly,
      subtotalMonthly,
      subtotalCharge,
      taxCharge,
      totalCharge,
      effectiveWarehousesLimit,
    }
  }, [activeTierSpec, planSettings.billingCycle, planSettings.addons])

  const filteredBillingInvoices = useMemo(() => {
    const q = billingSearch.trim().toLowerCase()
    return planSettings.billingInvoices.filter((inv) => {
      if (billingStatusFilter !== 'all' && inv.status !== billingStatusFilter) return false
      if (!q) return true
      return `${inv.folio} ${inv.periodLabel} ${inv.concept} ${inv.cfdiUuid} ${inv.paymentMethod}`
        .toLowerCase()
        .includes(q)
    })
  }, [planSettings.billingInvoices, billingSearch, billingStatusFilter])

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
                      {org.logoDataUrl && !logoPreviewError ? (
                        <img
                          className="workspace-avatar-logo-img"
                          src={org.logoDataUrl}
                          alt={org.legalName || general.workspaceName || 'Logo de la empresa'}
                          onError={() => setLogoPreviewError(true)}
                        />
                      ) : (
                        <div
                          className="workspace-avatar-preview"
                          style={{ backgroundColor: general.avatarColor }}
                          title={t('settings.general.avatarTitle')}
                        >
                          {(
                            general.workspaceName
                              .trim()
                              .split(/\s+/)
                              .slice(0, 2)
                              .map((w) => w[0])
                              .join('') || 'BE'
                          ).toUpperCase()}
                        </div>
                      )}
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
                {/* Logotipo de la Empresa */}
                <div className="settings-section-card">
                  <div className="card-header-row">
                    <div>
                      <h3>{t('settings.org.logoCardTitle')}</h3>
                      <p>{t('settings.org.logoCardDesc')}</p>
                    </div>
                    {org.logoDataUrl && (
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={handleRemoveOrgLogo}
                      >
                        <Trash2 size={13} /> {t('settings.org.logoRemoveBtn')}
                      </button>
                    )}
                  </div>

                  <div className="org-logo-editor">
                    <div
                      className={`org-logo-preview-box ${org.logoDataUrl && !logoPreviewError ? 'has-logo' : ''}`}
                      aria-live="polite"
                    >
                      {org.logoDataUrl && !logoPreviewError ? (
                        <img
                          src={org.logoDataUrl}
                          alt={org.legalName || org.tradeName || 'Logo de la empresa'}
                          onError={() => setLogoPreviewError(true)}
                        />
                      ) : (
                        <div className="org-logo-empty-state">
                          <ImagePlus size={22} />
                          <strong>{t('settings.org.logoEmptyTitle')}</strong>
                          <span>{t('settings.org.logoEmptyHint')}</span>
                        </div>
                      )}
                    </div>

                    <div className="org-logo-inputs">
                      <div className="form-field">
                        <label htmlFor="org-logo-file-input">{t('settings.org.logoUploadLabel')}</label>
                        <label
                          htmlFor="org-logo-file-input"
                          className="org-logo-dropzone"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault()
                            handleOrgLogoFileChange(e.dataTransfer.files?.[0])
                          }}
                        >
                          <Upload size={15} />
                          <span className="org-logo-dropzone-text">
                            {org.logoFileName ? org.logoFileName : t('settings.org.logoUploadLabel')}
                          </span>
                          <input
                            id="org-logo-file-input"
                            type="file"
                            accept="image/png,image/jpeg,image/svg+xml,image/webp"
                            className="org-logo-file-input"
                            onChange={(e) => {
                              handleOrgLogoFileChange(e.target.files?.[0])
                              e.target.value = ''
                            }}
                          />
                        </label>
                        <small>{t('settings.org.logoUploadHint')}</small>
                      </div>

                      <div className="form-field">
                        <label htmlFor="org-logo-url-input">{t('settings.org.logoUrlLabel')}</label>
                        <input
                          id="org-logo-url-input"
                          type="url"
                          value={org.logoDataUrl?.startsWith('data:') ? '' : org.logoDataUrl || ''}
                          onChange={(e) => {
                            const urlVal = e.target.value.trim()
                            setLogoPreviewError(false)
                            const next: OrganizationSettings = {
                              ...org,
                              logoDataUrl: urlVal,
                              logoFileName: urlVal ? 'URL externa' : '',
                            }
                            setOrg(next)
                            persistAndBroadcastOrg(next)
                          }}
                          placeholder={t('settings.org.logoUrlPlaceholder')}
                        />
                      </div>
                    </div>
                  </div>
                </div>

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
                <button className="button button-primary" onClick={handleOpenInviteModal}>
                  <Plus size={14} /> {t('settings.users.inviteBtn')}
                </button>
              </div>

              {(() => {
                const selectedDefaultDef =
                  roleDefinitions.find((r) => r.id === defaultNewUserRole) || roleDefinitions[0]
                const isDefaultAdmin = isGeneralAdminRole(selectedDefaultDef)
                const capsCount = selectedDefaultDef?.capabilities?.length || 0
                return (
                  <div className="settings-section-card default-role-config-card">
                    <div className="default-role-config-body">
                      <div className="default-role-config-copy">
                        <div className="default-role-kicker">POLÍTICA DE ALTA DE USUARIOS</div>
                        <h3>Rol predeterminado para usuarios nuevos</h3>
                        <p>
                          Define el rol que se asignará automáticamente cada vez que se invite un colaborador o se registre un empleado nuevo en la plataforma.
                        </p>
                      </div>

                      <div className="default-role-select-group">
                        <label htmlFor="default-new-user-role-select">
                          Rol inicial al registrar
                        </label>
                        <div className="default-role-control-row">
                          <select
                            id="default-new-user-role-select"
                            className="default-role-select"
                            value={defaultNewUserRole}
                            disabled={!isFullAdmin}
                            aria-label="Rol predeterminado para usuarios nuevos"
                            onChange={(e) => handleChangeDefaultNewUserRole(e.target.value)}
                          >
                            {roleDefinitions.map((r) => (
                              <option key={r.id} value={r.id}>
                                {getRoleCardTitle(r)} ({r.capabilities.length} permisos)
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="button button-ghost button-sm"
                            onClick={() => onSelectSetting('Roles y permisos')}
                          >
                            Ver permisos &rarr;
                          </button>
                        </div>
                      </div>
                    </div>

                    {selectedDefaultDef && (
                      <div className="default-role-preview-bar">
                        <span className="default-role-preview-title">
                          <ShieldCheck size={13} />
                          <span>
                            Perfil activo: <strong>{getRoleCardTitle(selectedDefaultDef)}</strong>
                          </span>
                        </span>
                        <span className="default-role-preview-meta tabular-nums">
                          {capsCount} permisos incluidos · {getRoleCardDesc(selectedDefaultDef)}
                        </span>
                      </div>
                    )}

                    {isDefaultAdmin && (
                      <div className="default-role-security-note" role="status">
                        <AlertTriangle size={14} />
                        <span>
                          Advertencia de seguridad: asignar <strong>Administrador</strong> de forma predeterminada otorga acceso completo e irrestricto a cada usuario recién registrado.
                        </span>
                      </div>
                    )}

                    {!isFullAdmin && (
                      <div className="default-role-lock-note">
                        <LockKeyhole size={13} />
                        <span>
                          Solo el perfil de Administrador puede modificar el rol predeterminado de registro.
                        </span>
                      </div>
                    )}
                  </div>
                )
              })()}

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
                      {users.map((user) => {
                        const validRoleIds = new Set(roleDefinitions.map((r) => r.id))
                        const userRoleIds = getWorkspaceUserRoleIds(user, validRoleIds)
                        const sortedRoleNames = userRoleIds
                          .map((rId) => getRoleLabel(rId))
                          .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
                        const visibleRoles = sortedRoleNames.slice(0, 2)
                        const hasExtraRoles = sortedRoleNames.length > 2
                        const showPopoverFromEl = (el: HTMLElement) => {
                          const rect = el.getBoundingClientRect()
                          setHoveredRolesPopover({
                            userId: user.id,
                            roles: sortedRoleNames,
                            rect: {
                              top: rect.top,
                              left: rect.left,
                              bottom: rect.bottom,
                              width: rect.width,
                            },
                          })
                        }
                        const hidePopoverForUser = () => {
                          setHoveredRolesPopover((prev) =>
                            prev?.userId === user.id ? null : prev
                          )
                        }
                        const isPopoverActive = hoveredRolesPopover?.userId === user.id
                        const isAdminUser = isUserAdminRole(user)

                        return (
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
                              <div className="user-roles-inline-wrap">
                                {sortedRoleNames.length === 0 ? (
                                  <span className="emp-no-roles-text">
                                    {t('settings.users.noRoles')}
                                  </span>
                                ) : !hasExtraRoles ? (
                                  <span className="user-roles-inline-text">
                                    {visibleRoles.join(' · ')}
                                  </span>
                                ) : (
                                  <>
                                    <span className="user-roles-inline-text">
                                      {visibleRoles.join(' · ')}
                                    </span>
                                    <span
                                      tabIndex={0}
                                      className="user-roles-more-trigger"
                                      aria-label={`${t('settings.users.allRolesTitle', { count: sortedRoleNames.length })}: ${sortedRoleNames.join(', ')}`}
                                      aria-describedby={isPopoverActive ? 'user-roles-hover-tooltip' : undefined}
                                      onMouseEnter={(e) => showPopoverFromEl(e.currentTarget)}
                                      onMouseLeave={hidePopoverForUser}
                                      onFocus={(e) => showPopoverFromEl(e.currentTarget)}
                                      onBlur={hidePopoverForUser}
                                    >
                                      ...
                                    </span>
                                  </>
                                )}
                              </div>
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
                              {isAdminUser && user.status === 'active' ? (
                                <button
                                  type="button"
                                  className="button button-ghost button-sm user-admin-protected-btn"
                                  disabled
                                  title="Los usuarios con el rol Administrador no pueden ser suspendidos"
                                  aria-label="Usuario Administrador protegido contra suspensión"
                                >
                                  <LockKeyhole size={12} /> Protegido
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="button button-ghost button-sm"
                                  onClick={() => handleToggleUserStatus(user.id)}
                                >
                                  {user.status === 'active'
                                    ? t('settings.users.actionSuspend')
                                    : t('settings.users.actionReactivate')}
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {hoveredRolesPopover && (
                <div
                  id="user-roles-hover-tooltip"
                  className="user-roles-hover-popover"
                  role="tooltip"
                  style={{
                    top:
                      hoveredRolesPopover.rect.top > 130
                        ? hoveredRolesPopover.rect.top - 8
                        : hoveredRolesPopover.rect.bottom + 8,
                    left: Math.max(
                      12,
                      Math.min(
                        hoveredRolesPopover.rect.left + hoveredRolesPopover.rect.width / 2,
                        typeof window !== 'undefined' ? window.innerWidth - 135 : 900
                      )
                    ),
                    transform:
                      hoveredRolesPopover.rect.top > 130
                        ? 'translate(-50%, -100%)'
                        : 'translate(-50%, 0)',
                  }}
                >
                  <div className="user-roles-hover-header">
                    {t('settings.users.allRolesTitle', {
                      count: hoveredRolesPopover.roles.length,
                    })}
                  </div>
                  <ul className="user-roles-hover-list">
                    {hoveredRolesPopover.roles.map((roleName) => (
                      <li key={roleName} className="user-roles-hover-item">
                        <Check size={10} aria-hidden="true" />
                        <span>{roleName}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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

              <div className="default-role-roles-strip">
                <div className="default-role-roles-strip-info">
                  <ShieldCheck size={15} />
                  <div>
                    <strong>Rol predeterminado para usuarios nuevos</strong>
                    <span>
                      Se preselecciona al invitar miembros o registrar empleados nuevos.
                    </span>
                  </div>
                </div>
                <div className="default-role-roles-strip-control">
                  <select
                    aria-label="Seleccionar rol predeterminado para nuevos usuarios"
                    className="default-role-select compact"
                    value={defaultNewUserRole}
                    disabled={!isFullAdmin}
                    onChange={(e) => handleChangeDefaultNewUserRole(e.target.value)}
                  >
                    {roleDefinitions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {getRoleCardTitle(r)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="roles-grid">
                {roleDefinitions.map((role) => {
                  const usersCount = users.filter((u) =>
                    getWorkspaceUserRoleIds(u).includes(role.id)
                  ).length
                  const assignedCaps = role.capabilities || []
                  const roleTitle = getRoleCardTitle(role)
                  const roleDesc = getRoleCardDesc(role)
                  const isDefaultRole = role.id === defaultNewUserRole
                  return (
                    <div
                      key={role.id}
                      className={`role-profile-card ${isDefaultRole ? 'is-default-role' : ''}`}
                    >
                      <div className="role-header">
                        <div>
                          <div className="role-title-inline">
                            <h3>{roleTitle}</h3>
                            {isDefaultRole && (
                              <span className="role-default-tag">Predeterminado</span>
                            )}
                          </div>
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
                {activeSetting === 'Integraciones' && (
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={handleOpenCreateExternalInteg}
                  >
                    <Plus size={14} /> Nueva integración API
                  </button>
                )}
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
                <>
                  {/* REGISTRO DE INTEGRACIONES API PARA SISTEMAS EXTERNOS (CRUD) */}
                  <div className="settings-section-card">
                    <div className="card-header-row" style={{ flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div className="plan-title-row">
                          <h3>Registro de Integraciones API para Sistemas Externos</h3>
                          <span className="org-tax-badge">REST API v1 · Bearer Auth</span>
                        </div>
                        <p>
                          Autoriza aplicaciones de terceros para consultar, insertar, editar o borrar información de AES Nexus bajo permisos granulares por módulo.
                        </p>
                      </div>
                      <div className="ext-integ-kpis">
                        <div className="ext-integ-kpi-box">
                          <span>Activas</span>
                          <strong>
                            {externalIntegrations.filter((r) => r.status === 'active').length} /{' '}
                            {externalIntegrations.length}
                          </strong>
                        </div>
                        <div className="ext-integ-kpi-box">
                          <span>Peticiones</span>
                          <strong className="tabular-nums">
                            {externalIntegrations
                              .reduce((sum, r) => sum + r.requestsCount, 0)
                              .toLocaleString('es-MX')}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {newlyIssuedKeyBanner && (
                      <div className="ext-key-banner" role="status">
                        <div className="ext-key-banner-copy">
                          <div className="ext-key-banner-title">
                            <KeyRound size={14} />
                            <strong>
                              Llave API emitida para {newlyIssuedKeyBanner.integrationName}
                            </strong>
                          </div>
                          <p>
                            Copia e instala este token Bearer en tu sistema externo. Puedes consultarlo o rotarlo desde la tarjeta cuando lo necesites.
                          </p>
                          <code className="ext-key-secret-code">{newlyIssuedKeyBanner.apiKeySecret}</code>
                        </div>
                        <div className="ext-key-banner-actions">
                          <button
                            type="button"
                            className="button button-primary button-sm"
                            onClick={() =>
                              handleCopyApiKey(
                                newlyIssuedKeyBanner.apiKeySecret,
                                newlyIssuedKeyBanner.integrationName
                              )
                            }
                          >
                            <Copy size={13} /> Copiar token
                          </button>
                          <button
                            type="button"
                            className="modal-close-btn"
                            onClick={() => setNewlyIssuedKeyBanner(null)}
                            aria-label="Cerrar aviso de llave"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="audit-toolbar">
                      <label className="audit-search-wrap">
                        <Search size={13} />
                        <input
                          type="search"
                          value={extSearch}
                          onChange={(e) => setExtSearch(e.target.value)}
                          placeholder="Buscar por sistema, tipo o prefijo de llave..."
                          aria-label="Buscar integraciones API"
                        />
                      </label>
                      <div className="audit-filter-tabs" role="tablist" aria-label="Filtrar estado de integraciones">
                        {[
                          { id: 'all' as const, label: 'Todas' },
                          { id: 'active' as const, label: 'Activas' },
                          { id: 'paused' as const, label: 'Pausadas' },
                          { id: 'revoked' as const, label: 'Revocadas' },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={extStatusFilter === tab.id}
                            className={`audit-filter-btn ${extStatusFilter === tab.id ? 'active' : ''}`}
                            onClick={() => setExtStatusFilter(tab.id)}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {filteredExternalIntegrations.length === 0 ? (
                      <div className="audit-empty-state">
                        <strong>Sin integraciones externas que coincidan</strong>
                        <p>
                          Crea un nuevo registro de integración API o ajusta los filtros de búsqueda.
                        </p>
                      </div>
                    ) : (
                      <div className="ext-integ-list">
                        {filteredExternalIntegrations.map((rec) => {
                          const isKeyRevealed = revealedKeyId === rec.id
                          const maskedKey = `${rec.apiKeyPrefix}••••••••••••••••••••${rec.apiKeySecret.slice(-4)}`
                          const enabledModules = EXTERNAL_API_RESOURCES.filter(
                            (res) => rec.permissions[res.id].length > 0
                          )
                          const statusLabel =
                            rec.status === 'active'
                              ? 'Activa'
                              : rec.status === 'paused'
                              ? 'Pausada'
                              : 'Revocada'
                          const statusClass =
                            rec.status === 'active'
                              ? ''
                              : rec.status === 'paused'
                              ? 'status-paused'
                              : 'status-revoked'
                          return (
                            <article key={rec.id} className="ext-integ-item">
                              <div className="ext-integ-item-head">
                                <div>
                                  <div className="ext-integ-title-row">
                                    <strong>{rec.name}</strong>
                                    <span className="branch-type-pill">{rec.systemType}</span>
                                    <span
                                      className={`integ-status-pill ${
                                        rec.environment === 'sandbox' ? 'status-sandbox' : ''
                                      }`}
                                    >
                                      {rec.environment === 'production' ? 'Producción' : 'Sandbox'}
                                    </span>
                                    <span className={`integ-status-pill ${statusClass}`}>
                                      {statusLabel}
                                    </span>
                                  </div>
                                  <p className="ext-integ-desc">{rec.description}</p>
                                </div>

                                <div className="ext-integ-actions">
                                  <button
                                    type="button"
                                    className="button button-secondary button-sm"
                                    onClick={() => handleOpenCrudSimulator(rec)}
                                  >
                                    <Terminal size={13} /> Probar CRUD
                                  </button>
                                  <button
                                    type="button"
                                    className="button button-ghost button-sm"
                                    onClick={() => handleOpenEditExternalInteg(rec)}
                                  >
                                    Editar permisos
                                  </button>
                                  {rec.status === 'active' ? (
                                    <button
                                      type="button"
                                      className="button button-ghost button-sm"
                                      onClick={() => handleSetExternalStatus(rec, 'paused')}
                                      title="Pausar temporalmente"
                                    >
                                      <Pause size={13} /> Pausar
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="button button-ghost button-sm"
                                      onClick={() => handleSetExternalStatus(rec, 'active')}
                                      title="Reactivar acceso API"
                                    >
                                      <Play size={13} /> Activar
                                    </button>
                                  )}
                                  {rec.status !== 'revoked' && (
                                    <button
                                      type="button"
                                      className="button button-ghost button-sm"
                                      onClick={() => handleSetExternalStatus(rec, 'revoked')}
                                      title="Revocar credencial"
                                    >
                                      <ShieldAlert size={13} /> Revocar
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="icon-danger-btn"
                                    onClick={() => handleDeleteExternalIntegration(rec)}
                                    title="Eliminar registro de integración"
                                    aria-label={`Eliminar ${rec.name}`}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>

                              <div className="ext-integ-cred-bar">
                                <div className="ext-integ-cred-token">
                                  <span className="ext-cred-label">Bearer Token</span>
                                  <code>{isKeyRevealed ? rec.apiKeySecret : maskedKey}</code>
                                </div>
                                <div className="ext-integ-cred-btns">
                                  <button
                                    type="button"
                                    className="button button-ghost button-sm"
                                    onClick={() =>
                                      setRevealedKeyId(isKeyRevealed ? null : rec.id)
                                    }
                                  >
                                    {isKeyRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                                    {isKeyRevealed ? 'Ocultar' : 'Revelar'}
                                  </button>
                                  <button
                                    type="button"
                                    className="button button-ghost button-sm"
                                    onClick={() => handleCopyApiKey(rec.apiKeySecret, rec.name)}
                                  >
                                    <Copy size={13} /> Copiar
                                  </button>
                                  <button
                                    type="button"
                                    className="button button-ghost button-sm"
                                    onClick={() => handleRotateExternalKey(rec)}
                                  >
                                    <RefreshCw size={13} /> Rotar llave
                                  </button>
                                </div>
                              </div>

                              <div className="ext-integ-perms-grid">
                                {enabledModules.map((mod) => {
                                  const acts = rec.permissions[mod.id]
                                  return (
                                    <div key={mod.id} className="ext-perm-module-chip">
                                      <span className="ext-perm-module-name">{mod.label}</span>
                                      <div className="ext-perm-verbs">
                                        {EXTERNAL_API_ACTIONS.map((act) => {
                                          const active = acts.includes(act.id)
                                          return (
                                            <span
                                              key={act.id}
                                              className={`ext-verb-tag verb-${act.id} ${
                                                active ? 'is-granted' : 'is-off'
                                              }`}
                                              title={`${act.label} (${act.httpMethod})`}
                                            >
                                              {act.shortTag}
                                            </span>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>

                              <div className="ext-integ-foot-meta">
                                <span>
                                  Límite: <strong>{rec.rateLimitPerMin} req/min</strong>
                                </span>
                                <span>
                                  Peticiones:{' '}
                                  <strong className="tabular-nums">
                                    {rec.requestsCount.toLocaleString('es-MX')}
                                  </strong>
                                </span>
                                <span>
                                  Último uso:{' '}
                                  <strong className="tabular-nums">
                                    {rec.lastUsedAtIso
                                      ? `${formatDate(new Date(rec.lastUsedAtIso))} · ${formatTime(new Date(rec.lastUsedAtIso))}`
                                      : 'Sin peticiones aún'}
                                  </strong>
                                </span>
                                {rec.ipAllowlist && (
                                  <span>
                                    IPs: <code className="mono">{rec.ipAllowlist}</code>
                                  </span>
                                )}
                                {rec.webhookCallbackUrl && (
                                  <span>
                                    Callback: <code className="mono">{rec.webhookCallbackUrl}</code>
                                  </span>
                                )}
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* CONECTORES NATIVOS EXISTENTES */}
                  <div className="settings-section-card">
                    <div className="card-header-row">
                      <div>
                        <h3>Conectores Nativos del Sistema</h3>
                        <p>
                          Canales preconfigurados para timbrado fiscal SAT, dispersión bancaria STP y alertas corporativas.
                        </p>
                      </div>
                    </div>
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
                  </div>
                </>
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
                  {/* 1. RESUMEN DE PLAN ACTUAL Y CONSUMO DE CUOTAS */}
                  <div className="settings-section-card">
                    <div className="card-header-row" style={{ flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div className="plan-title-row">
                          <h3>{t('settings.plan.cardTitle')} · {planSettings.tier}</h3>
                          <span className="user-status-pill status-active">
                            <span className="status-dot" />
                            {planSettings.autoRenew ? 'Activa · Renovación automática' : 'Activa · Sin renovación'}
                          </span>
                        </div>
                        <p>
                          {t('settings.plan.cardDesc', { workspace: general.workspaceName })} · {activeTierSpec.supportSla}
                        </p>
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
                      {(() => {
                        const activeUsersCount = users.filter((u) => u.status === 'active').length
                        const whCount = activeWarehouses.length > 0 ? activeWarehouses.length : warehouses.length
                        const storagePct = Math.min(
                          100,
                          Math.round((planSettings.storageUsedGb / activeTierSpec.storageGb) * 100)
                        )
                        const usersPct = activeTierSpec.maxUsers
                          ? Math.min(100, Math.round((users.length / activeTierSpec.maxUsers) * 100))
                          : Math.min(100, Math.max(12, users.length * 8))
                        const whPct = planPricingSummary.effectiveWarehousesLimit
                          ? Math.min(
                              100,
                              Math.round((whCount / planPricingSummary.effectiveWarehousesLimit) * 100)
                            )
                          : Math.min(100, Math.max(15, whCount * 12))
                        const cfdiPct = activeTierSpec.monthlyCfdiLimit
                          ? Math.min(100, Math.round((receivablesCount / activeTierSpec.monthlyCfdiLimit) * 100))
                          : 18

                        return (
                          <>
                            <div className="plan-stat-box">
                              <span className="stat-label">{t('settings.plan.activeUsersLabel')}</span>
                              <strong className="tabular-nums">
                                {activeTierSpec.maxUsers
                                  ? `${users.length} / ${activeTierSpec.maxUsers}`
                                  : t('settings.plan.activeUsersVal', { count: users.length })}
                              </strong>
                              <div className="plan-quota-track">
                                <span style={{ width: `${usersPct}%` }} />
                              </div>
                              <span className="stat-sub">
                                {t('settings.plan.activeUsersDetail', {
                                  active: activeUsersCount,
                                  total: users.length,
                                })}
                              </span>
                            </div>

                            <div className="plan-stat-box">
                              <span className="stat-label">{t('settings.plan.warehousesLabel')}</span>
                              <strong className="tabular-nums">
                                {planPricingSummary.effectiveWarehousesLimit
                                  ? `${whCount} / ${planPricingSummary.effectiveWarehousesLimit} sedes`
                                  : `${whCount} / Ilimitadas`}
                              </strong>
                              <div className="plan-quota-track">
                                <span style={{ width: `${whPct}%` }} />
                              </div>
                              <span className="stat-sub">
                                {activeWarehouses.length > 0
                                  ? activeWarehouses.map((w) => w.code).join(' · ')
                                  : organizationSites.map((s) => s.name).slice(0, 2).join(' · ')}
                              </span>
                            </div>

                            <div className="plan-stat-box">
                              <span className="stat-label">{t('settings.plan.cfdiLabel')}</span>
                              <strong className="tabular-nums">
                                {activeTierSpec.monthlyCfdiLimit
                                  ? `${receivablesCount} / ${activeTierSpec.monthlyCfdiLimit}`
                                  : t('settings.plan.invoicesIssuedVal', { count: receivablesCount })}
                              </strong>
                              <div className="plan-quota-track">
                                <span style={{ width: `${cfdiPct}%` }} />
                              </div>
                              <span className="stat-sub">
                                {activeTierSpec.monthlyCfdiLimit
                                  ? 'Timbres CFDI 4.0 del periodo'
                                  : t('settings.plan.cfdiSub')}
                              </span>
                            </div>

                            <div className="plan-stat-box">
                              <span className="stat-label">BÓVEDA Y ALMACENAMIENTO</span>
                              <strong className="tabular-nums">
                                {planSettings.storageUsedGb.toFixed(1)} / {activeTierSpec.storageGb} GB
                              </strong>
                              <div className="plan-quota-track">
                                <span style={{ width: `${storagePct}%` }} />
                              </div>
                              <span className="stat-sub">
                                {storagePct}% utilizado · XML, PDF y adjuntos
                              </span>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>

                  {/* 2. COMPARATIVA DE PLANES DISPONIBLES */}
                  <div className="settings-section-card">
                    <div className="card-header-row" style={{ flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <h3>Planes y Comparativa de Capacidades</h3>
                        <p>
                          Cambia de nivel en cualquier momento con ajuste prorrateado y descuento del 15% en facturación anual.
                        </p>
                      </div>
                      <div className="plan-autorenew-inline">
                        <span>Renovación automática</span>
                        <label className="toggle-switch-wrap">
                          <input
                            type="checkbox"
                            checked={planSettings.autoRenew}
                            onChange={handleToggleAutoRenew}
                            aria-label="Renovación automática"
                          />
                          <span className="toggle-slider" />
                        </label>
                      </div>
                    </div>

                    <div className="plan-tiers-grid">
                      {PLAN_TIER_CATALOG.map((spec) => {
                        const isCurrent = spec.tier === planSettings.tier
                        const displayPrice =
                          planSettings.billingCycle === 'annual'
                            ? Math.round(spec.monthlyMxn * 0.85)
                            : spec.monthlyMxn
                        return (
                          <article
                            key={spec.tier}
                            className={`plan-tier-card ${isCurrent ? 'is-current' : ''}`}
                          >
                            <div className="plan-tier-card-top">
                              <div>
                                <div className="plan-tier-name-row">
                                  <strong>{spec.tier}</strong>
                                  {isCurrent && (
                                    <span className="plan-current-badge">
                                      <CheckCircle2 size={11} /> Plan actual
                                    </span>
                                  )}
                                  {spec.tier === 'Enterprise' && !isCurrent && (
                                    <span className="plan-rec-badge">
                                      <Sparkles size={11} /> Recomendado
                                    </span>
                                  )}
                                </div>
                                <small>{spec.tagline}</small>
                              </div>
                              <div className="plan-tier-price">
                                <strong className="tabular-nums">
                                  {formatCurrency(displayPrice, general.reportingCurrency)}
                                </strong>
                                <span>/mes {planSettings.billingCycle === 'annual' ? '(anual)' : ''}</span>
                              </div>
                            </div>

                            <ul className="plan-tier-features">
                              {spec.features.map((feat) => (
                                <li key={feat}>
                                  <Check size={12} />
                                  <span>{feat}</span>
                                </li>
                              ))}
                            </ul>

                            <div className="plan-tier-card-foot">
                              <span className="plan-tier-sla">{spec.supportSla}</span>
                              <button
                                type="button"
                                className={`button button-sm ${isCurrent ? 'button-secondary' : 'button-primary'}`}
                                disabled={isCurrent}
                                onClick={() => handleUpdatePlan(spec.tier, planSettings.billingCycle)}
                              >
                                {isCurrent ? 'Plan activo' : `Cambiar a ${spec.tier}`}
                              </button>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  </div>

                  {/* 3. MÉTODO DE PAGO, COMPLEMENTOS Y PERFIL FISCAL */}
                  <div className="plan-billing-split">
                    <div className="settings-section-card">
                      <div className="card-header-row" style={{ flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <h3>Método de Pago y Complementos</h3>
                          <p>
                            Próximo cargo el {formatDate(new Date(planSettings.nextBillingIso))} · Envío a{' '}
                            <strong className="mono">{planSettings.billingEmail}</strong>
                          </p>
                        </div>
                        <button
                          type="button"
                          className="button button-secondary button-sm"
                          onClick={handleOpenPaymentModal}
                        >
                          <CreditCard size={13} /> Actualizar método
                        </button>
                      </div>

                      <div className="plan-payment-banner">
                        <div className="plan-payment-card-info">
                          <div className="plan-payment-brand-chip mono">
                            {planSettings.paymentBrand}
                          </div>
                          <div>
                            <strong>
                              {planSettings.paymentBrand === 'SPEI'
                                ? `Transferencia STP •••• ${planSettings.paymentLast4}`
                                : `${planSettings.paymentBrand} terminación •••• ${planSettings.paymentLast4}`}
                            </strong>
                            <small>
                              Titular: {planSettings.paymentHolder} · Vigencia: {planSettings.paymentExpiry}
                            </small>
                          </div>
                        </div>
                        <div className="plan-charge-preview">
                          <span>Próximo cargo estimado (c/ IVA)</span>
                          <strong className="tabular-nums">
                            {formatCurrency(planPricingSummary.totalCharge, general.reportingCurrency)}
                          </strong>
                        </div>
                      </div>

                      <div className="plan-addons-list">
                        <div className="plan-addons-head">
                          <span>Complementos activos en tu espacio</span>
                          <strong className="tabular-nums">
                            +{formatCurrency(planPricingSummary.addonsMonthly, general.reportingCurrency)}/mes
                          </strong>
                        </div>
                        {PLAN_ADDONS_CATALOG.map((addon) => {
                          const enabled = planSettings.addons[addon.key]
                          return (
                            <div key={addon.key} className="plan-addon-row">
                              <div>
                                <strong>{addon.name}</strong>
                                <p>{addon.description}</p>
                              </div>
                              <div className="plan-addon-controls">
                                <span className="mono">
                                  +{formatCurrency(addon.monthlyMxn, general.reportingCurrency)}/mes
                                </span>
                                <label className="toggle-switch-wrap">
                                  <input
                                    type="checkbox"
                                    checked={enabled}
                                    onChange={() => handleToggleAddon(addon.key)}
                                    aria-label={addon.name}
                                  />
                                  <span className="toggle-slider" />
                                </label>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="settings-section-card">
                      <div className="card-header-row" style={{ flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <h3>Datos Fiscales de Facturación</h3>
                          <p>Receptor CFDI 4.0 vinculado automáticamente con tu perfil de Organización.</p>
                        </div>
                        <button
                          type="button"
                          className="button button-secondary button-sm"
                          onClick={() => onSelectSetting('Organización')}
                        >
                          Editar en Organización <ArrowUpRight size={12} />
                        </button>
                      </div>

                      <div className="plan-fiscal-summary-list">
                        <div className="plan-fiscal-row">
                          <span>Razón Social</span>
                          <strong>{org.legalName}</strong>
                        </div>
                        <div className="plan-fiscal-row">
                          <span>RFC</span>
                          <strong className="mono">{org.rfc}</strong>
                        </div>
                        <div className="plan-fiscal-row">
                          <span>Régimen Fiscal</span>
                          <strong>{org.taxRegime}</strong>
                        </div>
                        <div className="plan-fiscal-row">
                          <span>Domicilio Fiscal</span>
                          <strong>
                            {org.fiscalStreet}, CP {org.fiscalZip}, {org.fiscalCity}
                          </strong>
                        </div>
                        <div className="plan-fiscal-row">
                          <span>Uso CFDI predeterminado</span>
                          <strong>G03 - Gastos en general</strong>
                        </div>
                      </div>

                      <div className="plan-cost-breakdown">
                        <div className="plan-cost-row">
                          <span>
                            Plan {planSettings.tier} ({planSettings.billingCycle === 'annual' ? '12 meses -15%' : 'Mensual'})
                          </span>
                          <span className="mono">
                            {formatCurrency(
                              planSettings.billingCycle === 'annual'
                                ? planPricingSummary.baseMonthly * 12
                                : planPricingSummary.baseMonthly,
                              general.reportingCurrency
                            )}
                          </span>
                        </div>
                        <div className="plan-cost-row">
                          <span>Complementos ({Object.values(planSettings.addons).filter(Boolean).length})</span>
                          <span className="mono">
                            {formatCurrency(
                              planSettings.billingCycle === 'annual'
                                ? planPricingSummary.addonsMonthly * 12
                                : planPricingSummary.addonsMonthly,
                              general.reportingCurrency
                            )}
                          </span>
                        </div>
                        <div className="plan-cost-row">
                          <span>IVA (16%)</span>
                          <span className="mono">
                            {formatCurrency(planPricingSummary.taxCharge, general.reportingCurrency)}
                          </span>
                        </div>
                        <div className="plan-cost-row is-total">
                          <span>Total por periodo</span>
                          <strong className="mono">
                            {formatCurrency(planPricingSummary.totalCharge, general.reportingCurrency)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. HISTORIAL COMPLETO DE FACTURACIÓN */}
                  <div className="settings-section-card">
                    <div className="card-header-row" style={{ flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <h3>{t('settings.plan.billingHistoryTitle')} ({filteredBillingInvoices.length})</h3>
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

                    <div className="audit-toolbar">
                      <label className="audit-search-wrap">
                        <Search size={13} />
                        <input
                          type="search"
                          value={billingSearch}
                          onChange={(e) => setBillingSearch(e.target.value)}
                          placeholder="Buscar por folio, periodo, concepto, UUID fiscal o método..."
                          aria-label="Buscar en historial de facturación"
                        />
                      </label>
                      <div className="audit-filter-tabs" role="tablist" aria-label="Filtrar facturas por estado">
                        {(
                          [
                            { id: 'all', label: 'Todas' },
                            { id: 'paid', label: 'Pagadas' },
                            { id: 'pending', label: 'Pendientes' },
                          ] as const
                        ).map((st) => (
                          <button
                            key={st.id}
                            type="button"
                            role="tab"
                            aria-selected={billingStatusFilter === st.id}
                            className={`audit-filter-btn ${billingStatusFilter === st.id ? 'active' : ''}`}
                            onClick={() => setBillingStatusFilter(st.id)}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="settings-users-table">
                        <thead>
                          <tr>
                            <th>{t('settings.plan.colFolio')}</th>
                            <th>PERIODO Y CONCEPTO</th>
                            <th>{t('settings.plan.colDate')}</th>
                            <th>MÉTODO</th>
                            <th style={{ textAlign: 'right' }}>SUBTOTAL / IVA</th>
                            <th style={{ textAlign: 'right' }}>{t('settings.plan.colAmount')}</th>
                            <th>{t('settings.plan.colStatus')}</th>
                            <th style={{ textAlign: 'right' }}>COMPROBANTE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredBillingInvoices.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="empty-cell">
                                No hay facturas de suscripción que coincidan con los filtros aplicados.
                              </td>
                            </tr>
                          ) : (
                            filteredBillingInvoices.map((inv) => {
                              const tierFactor =
                                planSettings.tier === 'Growth'
                                  ? 0.6
                                  : planSettings.tier === 'Corporate'
                                  ? 1.45
                                  : 1
                              const cycleFactor = planSettings.billingCycle === 'monthly' ? 1 / 0.85 : 1
                              const factor = tierFactor * cycleFactor
                              const subtotal = Math.round(inv.subtotalMxn * factor)
                              const tax = Math.round(inv.taxMxn * factor)
                              const total = subtotal + tax

                              return (
                                <tr key={inv.id}>
                                  <td>
                                    <code className="radio-sample-code">{inv.folio}</code>
                                  </td>
                                  <td>
                                    <div className="plan-invoice-concept">
                                      <strong>{inv.periodLabel}</strong>
                                      <small>{inv.concept}</small>
                                    </div>
                                  </td>
                                  <td className="tabular-nums">{formatDate(new Date(inv.dateIso))}</td>
                                  <td className="mono">{inv.paymentMethod}</td>
                                  <td style={{ textAlign: 'right' }} className="tabular-nums">
                                    <div className="plan-invoice-tax-cell">
                                      <span>{formatCurrency(subtotal, general.reportingCurrency)}</span>
                                      <small>IVA {formatCurrency(tax, general.reportingCurrency)}</small>
                                    </div>
                                  </td>
                                  <td style={{ textAlign: 'right' }} className="tabular-nums">
                                    <strong>{formatCurrency(total, general.reportingCurrency)}</strong>
                                  </td>
                                  <td>
                                    <span className={`user-status-pill ${inv.status === 'paid' ? 'status-active' : 'status-suspended'}`}>
                                      <span className="status-dot" />
                                      {inv.status === 'paid' ? t('settings.plan.statusPaid') : 'Pendiente'}
                                    </span>
                                  </td>
                                  <td style={{ textAlign: 'right' }}>
                                    <div className="plan-invoice-actions">
                                      <button
                                        type="button"
                                        className="button-icon-action"
                                        title="Ver detalle fiscal de la factura"
                                        onClick={() =>
                                          setSelectedBillingInvoice({
                                            ...inv,
                                            subtotalMxn: subtotal,
                                            taxMxn: tax,
                                            amountMxn: total,
                                          })
                                        }
                                      >
                                        <Eye size={12} /> Ver
                                      </button>
                                      <button
                                        type="button"
                                        className="button-icon-action"
                                        title="Descargar comprobante CFDI"
                                        onClick={() =>
                                          handleDownloadInvoiceReceipt({
                                            ...inv,
                                            subtotalMxn: subtotal,
                                            taxMxn: tax,
                                            amountMxn: total,
                                          })
                                        }
                                      >
                                        <Download size={12} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })
                          )}
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
                <label>{t('settings.modal.invite.roleLabel')} ({inviteRoles.length})</label>
                <div className="invite-roles-checklist">
                  {roleDefinitions.map((r) => {
                    const checked = inviteRoles.includes(r.id)
                    const isDefault = r.id === defaultNewUserRole
                    const labelText =
                      r.id === 'Operaciones'
                        ? t('settings.modal.invite.roleOps')
                        : r.id === 'Ventas'
                        ? t('settings.modal.invite.roleSales')
                        : r.id === 'Finanzas'
                        ? t('settings.modal.invite.roleFin')
                        : r.id === 'Administrador'
                        ? t('settings.modal.invite.roleAdmin')
                        : r.name
                    return (
                      <label
                        key={r.id}
                        className={`invite-role-option ${checked ? 'checked' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setInviteRoles((prev) =>
                              prev.includes(r.id)
                                ? prev.filter((id) => id !== r.id)
                                : [...prev, r.id]
                            )
                          }
                        />
                        <span>{labelText}</span>
                        {isDefault && (
                          <span className="invite-role-default-badge">Predeterminado</span>
                        )}
                      </label>
                    )
                  })}
                </div>
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
      {/* MODAL: ACTUALIZAR MÉTODO DE PAGO */}
      {showPaymentModal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowPaymentModal(false)
          }}
        >
          <section
            className="create-modal"
            style={{ maxWidth: '470px' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-modal-title"
          >
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">FACTURACIÓN DE SUSCRIPCIÓN</div>
                <h2 id="payment-modal-title">Actualizar Método de Pago</h2>
                <p>Configura la tarjeta corporativa o cuenta STP SPEI para cargos de renovación.</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowPaymentModal(false)}
                aria-label={t('settings.modal.closeAria')}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSavePaymentMethod}>
              <div className="form-grid-2">
                <div className="form-field">
                  <label htmlFor="plan-pay-brand">Red / Medio de Pago</label>
                  <select
                    id="plan-pay-brand"
                    value={paymentDraft.paymentBrand}
                    onChange={(e) =>
                      setPaymentDraft({
                        ...paymentDraft,
                        paymentBrand: e.target.value as PlanSubscriptionSettings['paymentBrand'],
                      })
                    }
                  >
                    <option value="VISA">Tarjeta VISA</option>
                    <option value="Mastercard">Mastercard</option>
                    <option value="AMEX">American Express</option>
                    <option value="SPEI">Transferencia SPEI STP</option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="plan-pay-last4">Últimos 4 dígitos</label>
                  <input
                    id="plan-pay-last4"
                    type="text"
                    maxLength={4}
                    placeholder="4821"
                    value={paymentDraft.paymentLast4}
                    onChange={(e) =>
                      setPaymentDraft({
                        ...paymentDraft,
                        paymentLast4: e.target.value.replace(/\D/g, '').slice(0, 4),
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-grid-2" style={{ marginTop: '12px' }}>
                <div className="form-field">
                  <label htmlFor="plan-pay-expiry">Vigencia (MM/AAAA)</label>
                  <input
                    id="plan-pay-expiry"
                    type="text"
                    placeholder="09/2028"
                    disabled={paymentDraft.paymentBrand === 'SPEI'}
                    value={paymentDraft.paymentBrand === 'SPEI' ? 'Cuenta STP' : paymentDraft.paymentExpiry}
                    onChange={(e) =>
                      setPaymentDraft({ ...paymentDraft, paymentExpiry: e.target.value })
                    }
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="plan-pay-holder">Titular / Apoderado</label>
                  <input
                    id="plan-pay-holder"
                    type="text"
                    value={paymentDraft.paymentHolder}
                    onChange={(e) =>
                      setPaymentDraft({ ...paymentDraft, paymentHolder: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-field" style={{ marginTop: '12px' }}>
                <label htmlFor="plan-pay-email">Correo de envío de facturas CFDI</label>
                <input
                  id="plan-pay-email"
                  type="email"
                  value={paymentDraft.billingEmail}
                  onChange={(e) =>
                    setPaymentDraft({ ...paymentDraft, billingEmail: e.target.value })
                  }
                  required
                />
              </div>

              <div className="create-modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setShowPaymentModal(false)}
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="button button-primary">
                  <Check size={14} /> Guardar método de pago
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* MODAL: DETALLE DE FACTURA / COMPROBANTE DE SUSCRIPCIÓN */}
      {selectedBillingInvoice && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedBillingInvoice(null)
          }}
        >
          <section
            className="create-modal"
            style={{ maxWidth: '520px' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="billing-invoice-modal-title"
          >
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">COMPROBANTE FISCAL DIGITAL · CFDI 4.0</div>
                <h2 id="billing-invoice-modal-title">Factura {selectedBillingInvoice.folio}</h2>
                <p>{selectedBillingInvoice.periodLabel}</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedBillingInvoice(null)}
                aria-label={t('settings.modal.closeAria')}
              >
                <X size={16} />
              </button>
            </div>

            <div className="plan-receipt-box">
              <div className="plan-fiscal-summary-list">
                <div className="plan-fiscal-row">
                  <span>Receptor Fiscal</span>
                  <strong>{org.legalName}</strong>
                </div>
                <div className="plan-fiscal-row">
                  <span>RFC Receptor</span>
                  <strong className="mono">{org.rfc}</strong>
                </div>
                <div className="plan-fiscal-row">
                  <span>Folio Fiscal (UUID)</span>
                  <strong className="mono" style={{ fontSize: '9.5px' }}>{selectedBillingInvoice.cfdiUuid}</strong>
                </div>
                <div className="plan-fiscal-row">
                  <span>Fecha de Timbrado</span>
                  <strong className="tabular-nums">{formatDate(new Date(selectedBillingInvoice.dateIso))}</strong>
                </div>
                <div className="plan-fiscal-row">
                  <span>Método de Pago</span>
                  <strong className="mono">{selectedBillingInvoice.paymentMethod}</strong>
                </div>
                <div className="plan-fiscal-row">
                  <span>Concepto</span>
                  <strong>{selectedBillingInvoice.concept}</strong>
                </div>
              </div>

              <div className="plan-cost-breakdown">
                <div className="plan-cost-row">
                  <span>Subtotal</span>
                  <span className="mono">{formatCurrency(selectedBillingInvoice.subtotalMxn, general.reportingCurrency)}</span>
                </div>
                <div className="plan-cost-row">
                  <span>IVA (16%)</span>
                  <span className="mono">{formatCurrency(selectedBillingInvoice.taxMxn, general.reportingCurrency)}</span>
                </div>
                <div className="plan-cost-row is-total">
                  <span>Total Facturado</span>
                  <strong className="mono">{formatCurrency(selectedBillingInvoice.amountMxn, general.reportingCurrency)}</strong>
                </div>
              </div>
            </div>

            <div className="create-modal-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setSelectedBillingInvoice(null)}
              >
                Cerrar
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={() => handleDownloadInvoiceReceipt(selectedBillingInvoice)}
              >
                <Download size={14} /> Descargar comprobante
              </button>
            </div>
          </section>
        </div>
      )}

      {/* MODAL: CREAR / EDITAR REGISTRO DE INTEGRACIÓN API EXTERNA */}
      {extModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setExtModalOpen(false)
          }}
        >
          <section
            className="create-modal ext-integ-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ext-integ-modal-title"
          >
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">API EXTERNA AES NEXUS · CONTROL DE ACCESO CRUD</div>
                <h2 id="ext-integ-modal-title">
                  {extEditingId
                    ? 'Editar Registro de Integración Externa'
                    : 'Registrar Nuevo Sistema Externo'}
                </h2>
                <p>
                  Define las credenciales y qué operaciones puede ejecutar el sistema externo sobre cada módulo de AES Nexus.
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setExtModalOpen(false)}
                aria-label={t('settings.modal.closeAria')}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveExternalIntegration}>
              <div className="form-grid-2">
                <div className="form-field">
                  <label htmlFor="ext-integ-name">Nombre del sistema o conector *</label>
                  <input
                    id="ext-integ-name"
                    type="text"
                    placeholder="Ej. ERP Contable / Tienda WooCommerce"
                    value={extDraft.name}
                    onChange={(e) => setExtDraft({ ...extDraft, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="ext-integ-type">Categoría del sistema</label>
                  <select
                    id="ext-integ-type"
                    value={extDraft.systemType}
                    onChange={(e) =>
                      setExtDraft({
                        ...extDraft,
                        systemType: e.target.value as ExternalSystemType,
                      })
                    }
                  >
                    <option value="Ecommerce">Ecommerce / Tienda en Línea</option>
                    <option value="BI / Analítica">BI / Analítica / Data Warehouse</option>
                    <option value="Contabilidad Externa">Contabilidad Externa / SAT</option>
                    <option value="WMS / Logística">WMS / Logística / 3PL</option>
                    <option value="Webhook / Middleware">Middleware / iPaaS / Zapier</option>
                    <option value="ERP / Legacy">ERP / Sistema Legacy</option>
                    <option value="Otro">Otro sistema</option>
                  </select>
                </div>
              </div>

              <div className="form-field" style={{ marginTop: '10px' }}>
                <label htmlFor="ext-integ-desc">Propósito operativo</label>
                <input
                  id="ext-integ-desc"
                  type="text"
                  placeholder="Describe qué flujos sincroniza este sistema con AES Nexus"
                  value={extDraft.description}
                  onChange={(e) => setExtDraft({ ...extDraft, description: e.target.value })}
                />
              </div>

              <div className="form-grid-3" style={{ marginTop: '10px' }}>
                <div className="form-field">
                  <label htmlFor="ext-integ-env">Ambiente</label>
                  <select
                    id="ext-integ-env"
                    value={extDraft.environment}
                    onChange={(e) =>
                      setExtDraft({
                        ...extDraft,
                        environment: e.target.value as 'production' | 'sandbox',
                      })
                    }
                  >
                    <option value="production">Producción (nexus_live_)</option>
                    <option value="sandbox">Sandbox / Pruebas (nexus_sbx_)</option>
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="ext-integ-status">Estado inicial</label>
                  <select
                    id="ext-integ-status"
                    value={extDraft.status}
                    onChange={(e) =>
                      setExtDraft({
                        ...extDraft,
                        status: e.target.value as 'active' | 'paused' | 'revoked',
                      })
                    }
                  >
                    <option value="active">Activa (permitir tráfico)</option>
                    <option value="paused">Pausada</option>
                    <option value="revoked">Revocada</option>
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="ext-integ-rate">Límite (req / minuto)</label>
                  <input
                    id="ext-integ-rate"
                    type="number"
                    min={10}
                    max={5000}
                    value={extDraft.rateLimitPerMin}
                    onChange={(e) =>
                      setExtDraft({
                        ...extDraft,
                        rateLimitPerMin: Number(e.target.value) || 120,
                      })
                    }
                  />
                </div>
              </div>

              <div className="form-grid-2" style={{ marginTop: '10px' }}>
                <div className="form-field">
                  <label htmlFor="ext-integ-ips">IPs o CIDR permitidos (opcional)</label>
                  <input
                    id="ext-integ-ips"
                    type="text"
                    placeholder="Ej. 189.204.112.44, 34.192.18.0/24"
                    value={extDraft.ipAllowlist}
                    onChange={(e) => setExtDraft({ ...extDraft, ipAllowlist: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="ext-integ-webhook">URL Callback de eventos (opcional)</label>
                  <input
                    id="ext-integ-webhook"
                    type="url"
                    placeholder="https://api.sistema-externo.mx/callbacks/nexus"
                    value={extDraft.webhookCallbackUrl}
                    onChange={(e) =>
                      setExtDraft({ ...extDraft, webhookCallbackUrl: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="crud-matrix-section">
                <div className="crud-matrix-header">
                  <div>
                    <strong>Matriz de Permisos CRUD por Módulo</strong>
                    <span>
                      {countGrantedCrudOps(extDraft.permissions)} operaciones autorizadas
                    </span>
                  </div>
                  <div className="crud-preset-btns">
                    <button
                      type="button"
                      className="button button-ghost button-sm"
                      onClick={() => handleApplyExtPreset('readonly')}
                    >
                      Solo consultar
                    </button>
                    <button
                      type="button"
                      className="button button-ghost button-sm"
                      onClick={() => handleApplyExtPreset('readwrite')}
                    >
                      Consultar + Insertar/Editar
                    </button>
                    <button
                      type="button"
                      className="button button-ghost button-sm"
                      onClick={() => handleApplyExtPreset('full')}
                    >
                      CRUD completo
                    </button>
                    <button
                      type="button"
                      className="button button-ghost button-sm"
                      onClick={() => handleApplyExtPreset('clear')}
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                <div className="crud-matrix-table-wrap">
                  <table className="crud-matrix-table">
                    <thead>
                      <tr>
                        <th>Módulo &amp; Endpoint</th>
                        {EXTERNAL_API_ACTIONS.map((act) => (
                          <th key={act.id} className="crud-th-center">
                            <span>{act.label}</span>
                            <small>{act.httpMethod}</small>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {EXTERNAL_API_RESOURCES.map((res) => (
                        <tr key={res.id}>
                          <td>
                            <div className="crud-resource-cell">
                              <strong>{res.label}</strong>
                              <code>{res.endpoint}</code>
                            </div>
                          </td>
                          {EXTERNAL_API_ACTIONS.map((act) => {
                            const checked = extDraft.permissions[res.id].includes(act.id)
                            return (
                              <td key={act.id} className="crud-td-center">
                                <label
                                  className={`crud-check-pill ${
                                    checked ? `is-checked verb-${act.id}` : ''
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => handleToggleExtPermission(res.id, act.id)}
                                    aria-label={`${act.label} en ${res.label}`}
                                  />
                                  <span>{act.shortTag}</span>
                                </label>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="create-modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setExtModalOpen(false)}
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="button button-primary">
                  <Check size={14} />{' '}
                  {extEditingId ? 'Guardar permisos y cambios' : 'Crear registro y generar llave'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* MODAL: SIMULADOR DE PETICIONES CRUD Y DOCUMENTACIÓN DE ENDPOINTS */}
      {activeSimulatorIntegration && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSimIntegrationId(null)
          }}
        >
          <section
            className="create-modal ext-integ-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sim-integ-modal-title"
          >
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">
                  CONSOLA DE PRUEBAS API · {activeSimulatorIntegration.name.toUpperCase()}
                </div>
                <h2 id="sim-integ-modal-title">Simulador CRUD de Endpoints AES Nexus</h2>
                <p>
                  Valida en vivo cómo responde la API según los permisos de Consultar (GET), Insertar (POST), Editar (PUT) y Borrar (DELETE) asignados.
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSimIntegrationId(null)}
                aria-label={t('settings.modal.closeAria')}
              >
                <X size={16} />
              </button>
            </div>

            <div className="api-sim-controls">
              <div className="form-field">
                <label htmlFor="sim-method-select">Operación HTTP</label>
                <select
                  id="sim-method-select"
                  value={simMethod}
                  onChange={(e) => {
                    const nextMethod = e.target.value as 'GET' | 'POST' | 'PUT' | 'DELETE'
                    setSimMethod(nextMethod)
                    setSimPayload(getSamplePayloadForCrud(simResource, nextMethod))
                    setSimResult(null)
                  }}
                >
                  <option value="GET">GET · Consultar</option>
                  <option value="POST">POST · Insertar</option>
                  <option value="PUT">PUT · Editar</option>
                  <option value="DELETE">DELETE · Borrar</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="sim-resource-select">Módulo / Recurso</label>
                <select
                  id="sim-resource-select"
                  value={simResource}
                  onChange={(e) => {
                    const nextRes = e.target.value as ExternalApiResource
                    setSimResource(nextRes)
                    setSimPayload(getSamplePayloadForCrud(nextRes, simMethod))
                    setSimResult(null)
                  }}
                >
                  {EXTERNAL_API_RESOURCES.map((res) => (
                    <option key={res.id} value={res.id}>
                      {res.label} ({res.endpoint})
                    </option>
                  ))}
                </select>
              </div>
              <div className="api-sim-run-wrap">
                <button
                  type="button"
                  className="button button-primary"
                  onClick={handleRunCrudSimulation}
                >
                  <Play size={14} /> Ejecutar petición
                </button>
              </div>
            </div>

            <div className="api-sim-endpoint-preview">
              <Code2 size={14} />
              <code>
                {simMethod} https://api.aesnexus.mx
                {EXTERNAL_API_RESOURCES.find((r) => r.id === simResource)?.endpoint || '/api/v1/clientes'}
              </code>
              <span className="mono">
                Authorization: Bearer {activeSimulatorIntegration.apiKeyPrefix}••••
              </span>
            </div>

            {simMethod !== 'GET' && (
              <div className="form-field" style={{ marginTop: '10px' }}>
                <label htmlFor="sim-payload-textarea">Cuerpo JSON de la petición</label>
                <textarea
                  id="sim-payload-textarea"
                  className="api-sim-textarea"
                  rows={5}
                  value={simPayload}
                  onChange={(e) => setSimPayload(e.target.value)}
                />
              </div>
            )}

            {simResult && (
              <div className="api-sim-response-box">
                <div className="api-sim-response-head">
                  <span
                    className={`integ-status-pill ${
                      simResult.statusCode >= 400 ? 'status-revoked' : ''
                    }`}
                  >
                    HTTP {simResult.statusCode}{' '}
                    {simResult.statusCode === 200
                      ? 'OK'
                      : simResult.statusCode === 201
                      ? 'Created'
                      : simResult.statusCode === 401
                      ? 'Unauthorized'
                      : 'Forbidden'}
                  </span>
                  <span className="tabular-nums">{simResult.latencyMs} ms</span>
                </div>
                <pre className="api-sim-pre">{simResult.body}</pre>
              </div>
            )}

            <div className="api-sim-logs-section">
              <strong>Bitácora reciente de este sistema externo</strong>
              {activeSimulatorIntegration.recentLogs.length === 0 ? (
                <p className="api-sim-empty-logs">
                  Aún no hay peticiones registradas. Ejecuta una prueba arriba para ver la traza.
                </p>
              ) : (
                <div className="api-sim-logs-list">
                  {activeSimulatorIntegration.recentLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="api-sim-log-row">
                      <span
                        className={`ext-verb-tag is-granted ${
                          log.statusCode >= 400 ? 'verb-delete' : 'verb-read'
                        }`}
                      >
                        {log.method} · {log.statusCode}
                      </span>
                      <span className="api-sim-log-summary">{log.summary}</span>
                      <small className="tabular-nums">
                        {formatDate(new Date(log.timestampIso))} ·{' '}
                        {formatTime(new Date(log.timestampIso))}
                      </small>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="create-modal-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setSimIntegrationId(null)}
              >
                Cerrar consola
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}
