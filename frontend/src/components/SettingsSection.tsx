import { useState, useMemo, useEffect, useRef } from 'react'
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
  ChevronDown,
  ChevronRight,
  Store,
  Clock,
  Loader2,
  Boxes,
  SlidersHorizontal,
  Minus,
  Layers,
  ArrowRight,
  Database,
} from 'lucide-react'
import { useToast } from './Toast'
import CountryDropdown from './CountryDropdown'
import { CountryFlag } from './CountryFlag'
import { useI18n } from '../i18n/I18nContext'
import { SUPPORTED_LANGUAGES } from '../i18n/translations'
import type { SupportedLocale } from '../i18n/types'
import type { InventoryItemLocation, Warehouse } from '../data/operations'
import { PRODUCT_CATALOG_CATEGORIES, type ProductServiceItem } from '../data/products'
import type { PhysicalLocationRecord, LocationType } from './AdministrationSection'
import {
  ERP_PERSISTENCE_CHANGED_EVENT,
  getErpPersistenceSummary,
  type ErpPersistenceSummary,
} from '../utils/erpPersistence'
import {
  AUDIT_CHANGED_EVENT,
  CATEGORY_STOCK_THRESHOLDS_CHANGED_EVENT,
  COMMERCIAL_INTEGRATIONS_CHANGED_EVENT,
  DEFAULT_CATEGORY_STOCK_THRESHOLDS,
  COMMERCIAL_MARKETPLACE_CATALOG,
  COMMERCIAL_SYNC_INTERVALS,
  DEFAULT_INTEGRATIONS,
  DEFAULT_NEW_USER_ROLE_CHANGED_EVENT,
  DEFAULT_PLAN_SETTINGS,
  DEFAULT_ROLE_SECTION_PERMISSIONS,
  EMPTY_EXTERNAL_PERMISSIONS,
  INTEGRATIONS_CHANGED_EVENT,
  PLAN_ADDONS_CATALOG,
  PLAN_TIER_CATALOG,
  ROLES_CHANGED_EVENT,
  SECTION_ACCESS_LEVELS,
  STORAGE_KEYS,
  SYSTEM_MODULE_SECTIONS,
  USERS_CHANGED_EVENT,
  appendAuditLog,
  buildProductCategoryLookup,
  buildSectionPermissionsMap,
  cloneSectionPermissions,
  deriveCapabilitiesFromSectionPermissions,
  deriveSectionPermissionsFromCapabilities,
  generateExternalApiKey,
  getSectionApiEndpoint,
  getWorkspaceUserRoleIds,
  isGeneralAdminRole,
  levelAllowsHttpMethod,
  loadDefaultNewUserRole,
  loadStoredAuditEvents,
  loadStoredCategoryStockThresholds,
  loadStoredCommercialIntegrations,
  loadStoredExternalIntegrations,
  loadStoredRoleDefinitions,
  loadStoredWorkspaceUsers,
  readStoredJson,
  resolveEffectiveStockThreshold,
  saveDefaultNewUserRole,
  saveStoredCategoryStockThresholds,
  writeStoredJson,
  type AuditEventRecord,
  type BuiltInRoleKey,
  type CategoryStockThresholdRule,
  type CategoryThresholdMode,
  type CommercialCategory,
  type CommercialIntegrationRecord,
  type CommercialMarketplaceApp,
  type CommercialSyncInterval,
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
  type RoleSectionPermissions,
  type SectionAccessLevel,
  type WorkspaceUserRecord,
} from '../data/settings'
import {
  canAccessSection,
  canCreateInSection,
  canDeleteInSection,
  canEditInSection,
} from '../data/accessControl'

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
  inventory?: InventoryItemLocation[]
  products?: ProductServiceItem[]
  onUpdateInventory?: (items: InventoryItemLocation[]) => void
  categoryThresholds?: CategoryStockThresholdRule[]
  onUpdateCategoryThresholds?: (rules: CategoryStockThresholdRule[]) => void
  currentUserName?: string
  currentUserId?: string
  activeCapabilities?: Set<RoleCapabilityId>
  activeSectionAccess?: RoleSectionPermissions
  isFullAdmin?: boolean
  isAccountActive?: boolean
  onResetTransactionalData?: () => void
  onResetAllWorkspaceData?: () => void
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
  inventory = [],
  products = [],
  onUpdateInventory,
  categoryThresholds,
  onUpdateCategoryThresholds,
  currentUserName = 'Andrea Morales',
  currentUserId,
  activeCapabilities,
  activeSectionAccess,
  isFullAdmin = true,
  isAccountActive = true,
  onResetTransactionalData,
  onResetAllWorkspaceData,
}: SettingsSectionProps) {
  const toast = useToast()
  const {
    regional,
    updateRegional,
    mainCountry,
    mainCountryName,
    countryProfile,
    reportingCurrency,
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

  useEffect(() => {
    setGeneral((prev) =>
      prev.reportingCurrency === reportingCurrency
        ? prev
        : { ...prev, reportingCurrency }
    )
  }, [reportingCurrency])

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
  const [editRoleName, setEditRoleName] = useState('')
  const [editRoleDesc, setEditRoleDesc] = useState('')
  const [editRoleForApiIntegration, setEditRoleForApiIntegration] = useState(false)
  const [roleSectionDraft, setRoleSectionDraft] = useState<RoleSectionPermissions>(() =>
    buildSectionPermissionsMap('none')
  )
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDesc, setNewRoleDesc] = useState('')
  const [newRoleForApiIntegration, setNewRoleForApiIntegration] = useState(false)
  const [newRoleSectionDraft, setNewRoleSectionDraft] = useState<RoleSectionPermissions>(() =>
    buildSectionPermissionsMap('none')
  )
  const [roleMatrixFilter, setRoleMatrixFilter] = useState('')
  const [openModuleAccordions, setOpenModuleAccordions] = useState<Record<string, boolean>>({})

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

  // 8A. COMMERCIAL OUTBOUND INTEGRATIONS & MARKETPLACE (CREDENTIALS + POLLING ONLY)
  const [commercialIntegrations, setCommercialIntegrations] = useState<
    CommercialIntegrationRecord[]
  >(() => loadStoredCommercialIntegrations())
  const [commDraftsById, setCommDraftsById] = useState<
    Record<string, CommercialIntegrationRecord>
  >({})
  const [editingCommercialId, setEditingCommercialId] = useState<string | null>(null)
  const [revealedCommSecretIds, setRevealedCommSecretIds] = useState<Record<string, boolean>>({})
  const [marketplaceSearch, setMarketplaceSearch] = useState('')
  const [marketplaceCategory, setMarketplaceCategory] = useState<'all' | CommercialCategory>('all')
  const [marketplaceStatusFilter, setMarketplaceStatusFilter] = useState<
    'all' | 'installed' | 'available'
  >('all')
  const [marketplaceIntervalDrafts, setMarketplaceIntervalDrafts] = useState<
    Record<string, CommercialSyncInterval>
  >({})
  const [installingMarketplaceIds, setInstallingMarketplaceIds] = useState<
    Record<string, boolean>
  >({})
  const installTimersRef = useRef<number[]>([])

  useEffect(() => {
    return () => {
      installTimersRef.current.forEach((timerId) => window.clearTimeout(timerId))
      installTimersRef.current = []
    }
  }, [])

  // 8B. EXTERNAL SYSTEMS API INTEGRATIONS (LINKED TO ROLE, 0 USER SLOTS)
  const [externalIntegrations, setExternalIntegrations] = useState<ExternalIntegrationRecord[]>(() =>
    loadStoredExternalIntegrations(loadStoredRoleDefinitions())
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
  const [extRoleMode, setExtRoleMode] = useState<'existing' | 'newRole'>('existing')
  const [extNewRoleName, setExtNewRoleName] = useState('')
  const [extRolePermsDraft, setExtRolePermsDraft] = useState<RoleSectionPermissions>(() =>
    buildSectionPermissionsMap('none')
  )
  const [extDraft, setExtDraft] = useState<{
    name: string
    systemType: ExternalSystemType
    description: string
    environment: 'production' | 'sandbox'
    status: 'active' | 'paused' | 'revoked'
    roleId: RoleKey
    webhookCallbackUrl: string
    ipAllowlist: string
    rateLimitPerMin: number
  }>({
    name: '',
    systemType: 'Ecommerce',
    description: '',
    environment: 'production',
    status: 'active',
    roleId: 'role_integracion_ecommerce',
    webhookCallbackUrl: '',
    ipAllowlist: '',
    rateLimitPerMin: 120,
  })
  const [cfgTargetId, setCfgTargetId] = useState<string>(() => {
    const initialRoles = loadStoredRoleDefinitions()
    const initialIntegs = loadStoredExternalIntegrations(initialRoles)
    return initialIntegs[0]?.id || '__new__'
  })
  const [cfgName, setCfgName] = useState<string>(() => {
    const initialRoles = loadStoredRoleDefinitions()
    const initialIntegs = loadStoredExternalIntegrations(initialRoles)
    return initialIntegs[0]?.name || ''
  })
  const [cfgSystemType, setCfgSystemType] = useState<ExternalSystemType>(() => {
    const initialRoles = loadStoredRoleDefinitions()
    const initialIntegs = loadStoredExternalIntegrations(initialRoles)
    return initialIntegs[0]?.systemType || 'Ecommerce'
  })
  const [cfgRoleMode, setCfgRoleMode] = useState<'existing' | 'newRole'>('existing')
  const [cfgRoleId, setCfgRoleId] = useState<RoleKey>(() => {
    const initialRoles = loadStoredRoleDefinitions()
    const initialIntegs = loadStoredExternalIntegrations(initialRoles)
    return (
      initialIntegs[0]?.roleId ||
      initialRoles.find((r) => r.id === 'role_integracion_ecommerce')?.id ||
      initialRoles.find((r) => !isGeneralAdminRole(r))?.id ||
      initialRoles[0]?.id ||
      'Ventas'
    )
  })
  const [cfgNewRoleName, setCfgNewRoleName] = useState('')
  const [cfgPerms, setCfgPerms] = useState<RoleSectionPermissions>(() => {
    const initialRoles = loadStoredRoleDefinitions()
    const initialIntegs = loadStoredExternalIntegrations(initialRoles)
    const targetRoleId =
      initialIntegs[0]?.roleId ||
      initialRoles.find((r) => r.id === 'role_integracion_ecommerce')?.id ||
      initialRoles.find((r) => !isGeneralAdminRole(r))?.id ||
      initialRoles[0]?.id
    const roleDef = initialRoles.find((r) => r.id === targetRoleId)
    return cloneSectionPermissions(
      roleDef?.sectionPermissions ||
        deriveSectionPermissionsFromCapabilities(roleDef?.capabilities || [], roleDef?.builtInKey)
    )
  })
  const [cfgMatrixFilter, setCfgMatrixFilter] = useState('')
  const [simIntegrationId, setSimIntegrationId] = useState<string | null>(null)
  const [simMethod, setSimMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET')
  const [simModule, setSimModule] = useState<string>('CRM')
  const [simSection, setSimSection] = useState<string>('Clientes')
  const [simPayload, setSimPayload] = useState('')
  const [simResult, setSimResult] = useState<{
    statusCode: 200 | 201 | 401 | 403
    latencyMs: number
    body: string
  } | null>(null)
  const [integLogSearch, setIntegLogSearch] = useState('')
  const [integLogIntegrationFilter, setIntegLogIntegrationFilter] = useState<string>('all')
  const [integLogStatusFilter, setIntegLogStatusFilter] = useState<'all' | 'success' | 'error'>('all')
  const [integLogMethodFilter, setIntegLogMethodFilter] = useState<
    'all' | 'GET' | 'POST' | 'PUT' | 'DELETE'
  >('all')
  const [expandedIntegLogIds, setExpandedIntegLogIds] = useState<Record<string, boolean>>({})
  const [integViewTab, setIntegViewTab] = useState<'all' | 'commercial' | 'custom' | 'analyzer'>('all')
  const [analyzerIntegrationId, setAnalyzerIntegrationId] = useState<string>(() => {
    const initialRoles = loadStoredRoleDefinitions()
    const initialIntegs = loadStoredExternalIntegrations(initialRoles)
    return initialIntegs[0]?.id || ''
  })

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
    const next = appendAuditLog({
      ...entry,
      userId: entry.userId || currentUserId,
    })
    setAuditEvents(next)
  }

  // Category Critical Stock Thresholds State
  const [categoryRulesDraft, setCategoryRulesDraft] = useState<CategoryStockThresholdRule[]>(() =>
    categoryThresholds && categoryThresholds.length > 0
      ? categoryThresholds
      : loadStoredCategoryStockThresholds()
  )
  const [catThresholdSearch, setCatThresholdSearch] = useState('')
  const [catThresholdStatusFilter, setCatThresholdStatusFilter] = useState<
    'all' | 'enabled' | 'critical' | 'custom'
  >('all')
  const [skuPreviewCategoryFilter, setSkuPreviewCategoryFilter] = useState<string>('all')
  const [skuPreviewSourceFilter, setSkuPreviewSourceFilter] = useState<
    'all' | 'sku' | 'category' | 'critical'
  >('all')
  const [showAddCategoryRuleModal, setShowAddCategoryRuleModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryMinStock, setNewCategoryMinStock] = useState<number>(5)
  const [newCategoryMode, setNewCategoryMode] = useState<CategoryThresholdMode>('inherit_default')
  const [newCategoryNotes, setNewCategoryNotes] = useState('')
  const [hasUnsavedCategoryThresholds, setHasUnsavedCategoryThresholds] = useState(false)

  useEffect(() => {
    if (categoryThresholds && categoryThresholds.length > 0 && !hasUnsavedCategoryThresholds) {
      setCategoryRulesDraft(categoryThresholds)
    }
  }, [categoryThresholds, hasUnsavedCategoryThresholds])

  useEffect(() => {
    const handleSyncRules = (e: Event) => {
      const custom = e as CustomEvent<{ rules?: CategoryStockThresholdRule[] }>
      if (Array.isArray(custom.detail?.rules)) {
        setCategoryRulesDraft(custom.detail.rules)
        setHasUnsavedCategoryThresholds(false)
      }
    }
    window.addEventListener(CATEGORY_STOCK_THRESHOLDS_CHANGED_EVENT, handleSyncRules)
    return () =>
      window.removeEventListener(CATEGORY_STOCK_THRESHOLDS_CHANGED_EVENT, handleSyncRules)
  }, [])

  const productCategoryLookup = useMemo(() => buildProductCategoryLookup(products), [products])

  const canEditStockThresholds = canEditInSection(
    'Configuración',
    'Umbrales de stock',
    activeSectionAccess,
    isFullAdmin,
    isAccountActive
  )

  const categoryCoverageStats = useMemo(() => {
    const map = new Map<
      string,
      {
        catalogSkuCount: number
        inventoryRowsCount: number
        criticalRowsCount: number
        totalPhysicalStock: number
      }
    >()

    const ensureEntry = (cat: string) => {
      const key = cat.trim().toLowerCase()
      let entry = map.get(key)
      if (!entry) {
        entry = {
          catalogSkuCount: 0,
          inventoryRowsCount: 0,
          criticalRowsCount: 0,
          totalPhysicalStock: 0,
        }
        map.set(key, entry)
      }
      return entry
    }

    products.forEach((p) => {
      const entry = ensureEntry(p.category)
      entry.catalogSkuCount += 1
    })

    inventory.forEach((item) => {
      const resolved = resolveEffectiveStockThreshold(
        item,
        categoryRulesDraft,
        productCategoryLookup
      )
      const entry = ensureEntry(resolved.category)
      entry.inventoryRowsCount += 1
      entry.totalPhysicalStock += item.stock
      if (item.stock <= resolved.effectiveMinStock) {
        entry.criticalRowsCount += 1
      }
    })

    return map
  }, [products, inventory, categoryRulesDraft, productCategoryLookup])

  const filteredCategoryRules = useMemo(() => {
    const q = catThresholdSearch.trim().toLowerCase()
    return categoryRulesDraft.filter((rule) => {
      const stats = categoryCoverageStats.get(rule.category.trim().toLowerCase())
      const matchesSearch =
        !q ||
        rule.category.toLowerCase().includes(q) ||
        (rule.notes || '').toLowerCase().includes(q)
      if (!matchesSearch) return false
      if (catThresholdStatusFilter === 'enabled') return rule.enabled
      if (catThresholdStatusFilter === 'critical') return (stats?.criticalRowsCount || 0) > 0
      if (catThresholdStatusFilter === 'custom') {
        return Boolean(
          rule.isCustom ||
            !PRODUCT_CATALOG_CATEGORIES.some(
              (c) => c.toLowerCase() === rule.category.trim().toLowerCase()
            )
        )
      }
      return true
    })
  }, [categoryRulesDraft, catThresholdSearch, catThresholdStatusFilter, categoryCoverageStats])

  const resolvedInventoryPreview = useMemo(() => {
    return inventory.map((item) => {
      const resolved = resolveEffectiveStockThreshold(
        item,
        categoryRulesDraft,
        productCategoryLookup
      )
      const isCritical = item.stock <= resolved.effectiveMinStock
      return {
        item,
        ...resolved,
        isCritical,
      }
    })
  }, [inventory, categoryRulesDraft, productCategoryLookup])

  const filteredSkuPreviewRows = useMemo(() => {
    return resolvedInventoryPreview.filter((row) => {
      if (
        skuPreviewCategoryFilter !== 'all' &&
        row.category.trim().toLowerCase() !== skuPreviewCategoryFilter.trim().toLowerCase()
      ) {
        return false
      }
      if (skuPreviewSourceFilter === 'sku') return row.source === 'sku'
      if (skuPreviewSourceFilter === 'category') {
        return row.source === 'category_override' || row.source === 'category_inherit'
      }
      if (skuPreviewSourceFilter === 'critical') return row.isCritical
      return true
    })
  }, [resolvedInventoryPreview, skuPreviewCategoryFilter, skuPreviewSourceFilter])

  const stockThresholdsKpis = useMemo(() => {
    const activeCount = categoryRulesDraft.filter((r) => r.enabled).length
    const overrideCount = categoryRulesDraft.filter(
      (r) => r.enabled && r.mode === 'override_sku'
    ).length
    const criticalCount = resolvedInventoryPreview.filter((r) => r.isCritical).length
    const categoryDrivenCount = resolvedInventoryPreview.filter(
      (r) => r.source === 'category_override' || r.source === 'category_inherit'
    ).length
    return {
      activeCount,
      totalCategories: categoryRulesDraft.length,
      overrideCount,
      criticalCount,
      categoryDrivenCount,
    }
  }, [categoryRulesDraft, resolvedInventoryPreview])

  const persistCategoryThresholdRules = (
    nextRules: CategoryStockThresholdRule[],
    auditAction: string,
    auditDetail: string
  ) => {
    setCategoryRulesDraft(nextRules)
    setHasUnsavedCategoryThresholds(false)
    if (onUpdateCategoryThresholds) {
      onUpdateCategoryThresholds(nextRules)
    } else {
      saveStoredCategoryStockThresholds(nextRules)
      recordAudit({
        category: 'settings',
        crudOperation: 'UPDATE',
        entityType: 'Umbral por categoría',
        action: auditAction,
        detail: auditDetail,
        user: currentUserName,
      })
    }
  }

  const updateDraftRule = (
    ruleId: string,
    patch: Partial<CategoryStockThresholdRule>
  ) => {
    if (!canEditStockThresholds) return
    setCategoryRulesDraft((prev) =>
      prev.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              ...patch,
              minStock:
                patch.minStock !== undefined
                  ? Math.max(0, Math.round(patch.minStock))
                  : rule.minStock,
              updatedAtIso: new Date().toISOString(),
            }
          : rule
      )
    )
    setHasUnsavedCategoryThresholds(true)
  }

  const handleSaveCategoryThresholds = () => {
    if (!canEditStockThresholds) return
    const activeSummary = categoryRulesDraft
      .filter((r) => r.enabled)
      .map((r) => `${r.category}: ${r.minStock} uds. (${r.mode === 'override_sku' ? 'Forzado' : 'Heredado'})`)
      .join(' · ')
    persistCategoryThresholdRules(
      categoryRulesDraft,
      'Actualización de umbrales de stock por categoría',
      activeSummary || `${categoryRulesDraft.length} categoría(s) configuradas`
    )
    toast.success(
      'Los umbrales críticos por categoría se guardaron y están sincronizados con las alertas de inventario.',
      'Umbrales guardados'
    )
  }

  const handleResetCategoryThresholds = () => {
    if (!canEditStockThresholds) return
    const defaults = DEFAULT_CATEGORY_STOCK_THRESHOLDS.map((d) => ({
      ...d,
      updatedAtIso: new Date().toISOString(),
    }))
    persistCategoryThresholdRules(
      defaults,
      'Restablecimiento de umbrales de stock por categoría',
      'Se restauraron los umbrales críticos recomendados para todas las categorías.'
    )
    toast.info('Umbrales por categoría restablecidos a valores recomendados.', 'Umbrales restaurados')
  }

  const handleSyncCategoryToSkus = (rule: CategoryStockThresholdRule) => {
    if (!canEditStockThresholds || !onUpdateInventory) return
    const normalizedCat = rule.category.trim().toLowerCase()
    let updatedCount = 0
    const nextInventory = inventory.map((item) => {
      const itemCat = resolveEffectiveStockThreshold(
        item,
        categoryRulesDraft,
        productCategoryLookup
      ).category
      if (itemCat.trim().toLowerCase() === normalizedCat) {
        updatedCount += 1
        return {
          ...item,
          category: itemCat,
          minStock: Math.max(0, rule.minStock),
          thresholdSource: 'category' as const,
        }
      }
      return item
    })

    if (updatedCount === 0) {
      toast.info(
        `Actualmente no hay existencias registradas en almacén bajo la categoría “${rule.category}”. La regla aplicará en cuanto ingresen productos.`,
        'Sin registros en almacén'
      )
      return
    }

    onUpdateInventory(nextInventory)
    if (hasUnsavedCategoryThresholds) {
      persistCategoryThresholdRules(
        categoryRulesDraft,
        'Sincronización de umbral por categoría a SKUs',
        `${rule.category} (${rule.minStock} uds.) aplicado a ${updatedCount} registro(s) de almacén`
      )
    } else {
      recordAudit({
        category: 'inventory',
        crudOperation: 'UPDATE',
        entityType: 'Umbral por categoría',
        entityId: rule.id,
        action: 'Sincronización de umbral por categoría a SKUs',
        detail: `${rule.category} → ${rule.minStock} uds. aplicado a ${updatedCount} registro(s) en almacén`,
        user: currentUserName,
      })
    }

    toast.success(
      `Umbral crítico de ${rule.minStock} uds. sincronizado en ${updatedCount} registro(s) de “${rule.category}”.`,
      'SKUs sincronizados'
    )
  }

  const handleSyncAllEnabledCategories = () => {
    if (!canEditStockThresholds || !onUpdateInventory) return
    const activeRuleMap = new Map(
      categoryRulesDraft
        .filter((r) => r.enabled)
        .map((r) => [r.category.trim().toLowerCase(), r])
    )
    let updatedCount = 0
    const nextInventory = inventory.map((item) => {
      const cat = resolveEffectiveStockThreshold(
        item,
        categoryRulesDraft,
        productCategoryLookup
      ).category
      const matched = activeRuleMap.get(cat.trim().toLowerCase())
      if (matched) {
        updatedCount += 1
        return {
          ...item,
          category: cat,
          minStock: Math.max(0, matched.minStock),
          thresholdSource: 'category' as const,
        }
      }
      return item
    })
    onUpdateInventory(nextInventory)
    persistCategoryThresholdRules(
      categoryRulesDraft,
      'Aplicación global de umbrales por categoría',
      `Reglas por categoría sincronizadas en ${updatedCount} registro(s) de almacén`
    )
    toast.success(
      `Se actualizaron ${updatedCount} registro(s) de inventario conforme a su categoría.`,
      'Sincronización masiva completada'
    )
  }

  const handleInheritSingleSkuFromCategory = (itemId: string, catMinStock: number, categoryName: string) => {
    if (!canEditStockThresholds || !onUpdateInventory) return
    const target = inventory.find((i) => i.id === itemId)
    if (!target) return
    onUpdateInventory(
      inventory.map((i) =>
        i.id === itemId
          ? {
              ...i,
              category: categoryName,
              minStock: Math.max(0, catMinStock),
              thresholdSource: 'category',
            }
          : i
      )
    )
    recordAudit({
      category: 'inventory',
      crudOperation: 'UPDATE',
      entityType: 'Umbral por SKU',
      entityId: itemId,
      action: 'Vinculación de SKU a umbral de categoría',
      detail: `${target.sku} (${categoryName}) ahora hereda umbral de categoría (${catMinStock} uds.)`,
      user: currentUserName,
    })
    toast.success(
      `${target.sku} ahora hereda el umbral de la categoría “${categoryName}” (${catMinStock} uds.).`,
      'Umbral heredado'
    )
  }

  const handleCreateCustomCategoryRule = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEditStockThresholds) return
    const cleanName = newCategoryName.trim()
    if (!cleanName) {
      toast.warning('Indica el nombre de la categoría de producto.', 'Nombre requerido')
      return
    }
    const exists = categoryRulesDraft.some(
      (r) => r.category.trim().toLowerCase() === cleanName.toLowerCase()
    )
    if (exists) {
      toast.warning(`Ya existe una regla configurada para “${cleanName}”.`, 'Categoría duplicada')
      return
    }
    const created: CategoryStockThresholdRule = {
      id: `cat_thr_${Date.now()}`,
      category: cleanName,
      minStock: Math.max(0, Math.round(newCategoryMinStock)),
      enabled: true,
      mode: newCategoryMode,
      notes: newCategoryNotes.trim() || undefined,
      updatedAtIso: new Date().toISOString(),
      isCustom: true,
    }
    const nextRules = [...categoryRulesDraft, created]
    persistCategoryThresholdRules(
      nextRules,
      'Creación de umbral por categoría de producto',
      `${created.category} · Mín. ${created.minStock} uds. (${created.mode === 'override_sku' ? 'Forzado' : 'Heredado'})`
    )
    setShowAddCategoryRuleModal(false)
    setNewCategoryName('')
    setNewCategoryMinStock(5)
    setNewCategoryMode('inherit_default')
    setNewCategoryNotes('')
    toast.success(`Regla creada para la categoría “${created.category}”.`, 'Categoría agregada')
  }

  const handleDeleteCustomCategoryRule = (rule: CategoryStockThresholdRule) => {
    if (!canEditStockThresholds || !rule.isCustom) return
    const nextRules = categoryRulesDraft.filter((r) => r.id !== rule.id)
    persistCategoryThresholdRules(
      nextRules,
      'Eliminación de umbral por categoría personalizada',
      `${rule.category} (Mín. ${rule.minStock} uds.)`
    )
    toast.info(`Se eliminó la regla personalizada para “${rule.category}”.`, 'Categoría eliminada')
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

  const getRoleSectionPermissions = (role: RoleDefinition | undefined): RoleSectionPermissions => {
    if (!role) return buildSectionPermissionsMap('none')
    return (
      role.sectionPermissions ||
      deriveSectionPermissionsFromCapabilities(role.capabilities || [], role.builtInKey)
    )
  }

  const getEnabledSectionEntries = (perms: RoleSectionPermissions) => {
    const entries: Array<{
      moduleName: string
      sectionName: string
      level: SectionAccessLevel
    }> = []
    for (const [mod, sections] of Object.entries(SYSTEM_MODULE_SECTIONS)) {
      for (const sec of sections) {
        const lvl = perms[mod]?.[sec] || 'none'
        if (lvl !== 'none') {
          entries.push({ moduleName: mod, sectionName: sec, level: lvl })
        }
      }
    }
    return entries
  }

  const getLevelLabel = (level: SectionAccessLevel) =>
    SECTION_ACCESS_LEVELS.find((l) => l.id === level)?.label || level

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
  const [persistenceSummary, setPersistenceSummary] = useState<ErpPersistenceSummary>(() =>
    getErpPersistenceSummary()
  )
  const [confirmResetMode, setConfirmResetMode] = useState<null | 'transactional' | 'all'>(null)

  useEffect(() => {
    if (activeSetting === 'General') {
      setPersistenceSummary(getErpPersistenceSummary())
    }
    const refreshSummary = () => setPersistenceSummary(getErpPersistenceSummary())
    window.addEventListener(ERP_PERSISTENCE_CHANGED_EVENT, refreshSummary)
    window.addEventListener('storage', refreshSummary)
    return () => {
      window.removeEventListener(ERP_PERSISTENCE_CHANGED_EVENT, refreshSummary)
      window.removeEventListener('storage', refreshSummary)
    }
  }, [activeSetting])

  const canResetWorkspace =
    isFullAdmin ||
    canEditInSection('Configuración', 'General', activeSectionAccess, isFullAdmin, isAccountActive)

  const formatPersistenceSavedTime = (iso: string | null) => {
    if (!iso) return 'Sin cambios pendientes'
    try {
      return new Intl.DateTimeFormat('es-MX', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso))
    } catch {
      return iso
    }
  }

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
        subsidiaryIds: [],
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
    const rolePerms = cloneSectionPermissions(getRoleSectionPermissions(role))
    const initialAccordions: Record<string, boolean> = {}
    for (const [modName, secs] of Object.entries(SYSTEM_MODULE_SECTIONS)) {
      initialAccordions[modName] = secs.some((sec) => (rolePerms[modName]?.[sec] || 'none') !== 'none')
    }
    setEditingRole(role)
    setEditRoleName(getRoleCardTitle(role))
    setEditRoleDesc(getRoleCardDesc(role))
    setEditRoleForApiIntegration(Boolean(role.forApiIntegration))
    setRoleMatrixFilter('')
    setOpenModuleAccordions(initialAccordions)
    setRoleSectionDraft(rolePerms)
  }

  const handleSaveRolePermissions = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRole) return
    const canEditRoles = canEditInSection(
      'Configuración',
      'Roles y permisos',
      activeSectionAccess,
      isFullAdmin,
      isAccountActive
    )
    if (isGeneralAdminRole(editingRole) || !canEditRoles) {
      toast.warning(
        t('settings.roles.protectedAdminEditToast'),
        t('settings.item.Roles y permisos')
      )
      setEditingRole(null)
      return
    }
    const cleanName = editRoleName.trim()
    if (!editingRole.builtInKey && !cleanName) {
      toast.warning(
        t('settings.roles.createModal.missingNameToast'),
        t('settings.item.Roles y permisos')
      )
      return
    }
    if (
      !editingRole.builtInKey &&
      roleDefinitions.some(
        (r) =>
          r.id !== editingRole.id &&
          (r.id.toLowerCase() === cleanName.toLowerCase() ||
            r.name.toLowerCase() === cleanName.toLowerCase() ||
            getRoleLabel(r.id).toLowerCase() === cleanName.toLowerCase() ||
            getRoleCardTitle(r).toLowerCase() === cleanName.toLowerCase())
      )
    ) {
      toast.warning(
        t('settings.roles.createModal.duplicateNameToast'),
        t('settings.item.Roles y permisos')
      )
      return
    }
    const cleanPerms = cloneSectionPermissions(roleSectionDraft)
    const derivedCaps = deriveCapabilitiesFromSectionPermissions(cleanPerms)
    const enabledCount = getEnabledSectionEntries(cleanPerms).length
    const nextName = editingRole.builtInKey ? editingRole.name : cleanName
    const nextDesc = editingRole.builtInKey
      ? editingRole.description
      : editRoleDesc.trim() || editingRole.description
    const updated = roleDefinitions.map((r) =>
      r.id === editingRole.id
        ? {
            ...r,
            name: nextName,
            description: nextDesc,
            forApiIntegration: editingRole.builtInKey ? false : editRoleForApiIntegration,
            sectionPermissions: cleanPerms,
            capabilities: derivedCaps,
          }
        : r
    )
    persistRoleDefinitions(updated)
    const syncedIntegs = externalIntegrations.map((ext) =>
      ext.roleId === editingRole.id
        ? { ...ext, permissions: deriveLegacyCrudSummaryFromRole(cleanPerms) }
        : ext
    )
    if (externalIntegrations.some((ext) => ext.roleId === editingRole.id)) {
      persistExternalIntegrations(syncedIntegs)
    }
    if (cfgRoleMode === 'existing' && cfgRoleId === editingRole.id) {
      setCfgPerms(cloneSectionPermissions(cleanPerms))
    }
    const roleLabel = editingRole.builtInKey ? getRoleCardTitle(editingRole) : nextName
    recordAudit({
      category: 'users',
      action: t('settings.roles.modal.savedTitle'),
      detail: `${roleLabel} · ${enabledCount} secciones configuradas`,
      user: 'Andrea Morales',
    })
    toast.success(
      `Permisos actualizados para ${roleLabel} (${enabledCount} secciones activas).`,
      t('settings.roles.modal.savedTitle')
    )
    setEditingRole(null)
  }

  const handleOpenCreateRoleModal = () => {
    setNewRoleName('')
    setNewRoleDesc('')
    setNewRoleForApiIntegration(false)
    setRoleMatrixFilter('')
    setOpenModuleAccordions({})
    setNewRoleSectionDraft(buildSectionPermissionsMap('none'))
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
    const cleanDesc =
      newRoleDesc.trim() ||
      (newRoleForApiIntegration
        ? 'Rol dedicado para integración API sin consumo de espacio de usuario.'
        : t('settings.roles.defaultCustomDesc'))
    const cleanPerms = cloneSectionPermissions(newRoleSectionDraft)
    const enabledCount = getEnabledSectionEntries(cleanPerms).length
    const created: RoleDefinition = {
      id: `role_${Date.now()}`,
      name: cleanName,
      description: cleanDesc,
      forApiIntegration: newRoleForApiIntegration,
      capabilities: deriveCapabilitiesFromSectionPermissions(cleanPerms),
      sectionPermissions: cleanPerms,
    }
    const updated = [...roleDefinitions, created]
    persistRoleDefinitions(updated)
    recordAudit({
      category: 'users',
      action: t('settings.roles.createModal.createdTitle'),
      detail: `${cleanName} · ${enabledCount} secciones habilitadas${
        newRoleForApiIntegration ? ' · Para integración API' : ''
      }`,
      user: 'Andrea Morales',
    })
    toast.success(
      `Rol «${cleanName}» creado con ${enabledCount} secciones habilitadas${
        newRoleForApiIntegration ? ' (para integración API).' : '.'
      }`,
      t('settings.roles.createModal.createdTitle')
    )
    setShowCreateRoleModal(false)
    setNewRoleName('')
    setNewRoleDesc('')
    setNewRoleForApiIntegration(false)
    setNewRoleSectionDraft(buildSectionPermissionsMap('none'))
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
    const affectedIntegs = externalIntegrations.filter((ext) => ext.roleId === role.id).length
    if (affectedIntegs > 0 && fallbackRole) {
      const reassignedIntegs = externalIntegrations.map((ext) =>
        ext.roleId === role.id ? { ...ext, roleId: fallbackRole.id } : ext
      )
      persistExternalIntegrations(reassignedIntegs)
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
        (affectedCount > 0 || affectedIntegs > 0) && fallbackRole
          ? `${roleDisplay} (${affectedCount} usuarios, ${affectedIntegs} integraciones → ${getRoleLabel(fallbackRole.id)})`
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
    window.dispatchEvent(
      new CustomEvent(INTEGRATIONS_CHANGED_EVENT, { detail: { integrations: updated } })
    )
  }

  const mapModuleToLegacyResource = (moduleName: string): ExternalApiResource => {
    if (moduleName === 'CRM') return 'clientes'
    if (moduleName === 'Operaciones') return 'productos'
    if (moduleName === 'Ventas') return 'ventas'
    if (moduleName === 'Compras') return 'compras'
    if (moduleName === 'Finanzas') return 'finanzas'
    return 'rrhh'
  }

  const deriveLegacyCrudSummaryFromRole = (
    perms: RoleSectionPermissions
  ): Record<ExternalApiResource, ExternalApiAction[]> => {
    const out: Record<ExternalApiResource, ExternalApiAction[]> = {
      clientes: [],
      productos: [],
      ventas: [],
      compras: [],
      finanzas: [],
      rrhh: [],
    }
    const enabled = getEnabledSectionEntries(perms)
    for (const entry of enabled) {
      const resKey = mapModuleToLegacyResource(entry.moduleName)
      const set = new Set<ExternalApiAction>(out[resKey])
      if (levelAllowsHttpMethod(entry.level, 'GET')) set.add('read')
      if (levelAllowsHttpMethod(entry.level, 'POST')) set.add('create')
      if (levelAllowsHttpMethod(entry.level, 'PUT')) set.add('update')
      if (levelAllowsHttpMethod(entry.level, 'DELETE')) set.add('delete')
      out[resKey] = Array.from(set)
    }
    return out
  }

  const getSamplePayloadForSection = (
    moduleName: string,
    sectionName: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  ): string => {
    if (method === 'GET') return ''
    if (method === 'DELETE') {
      return JSON.stringify(
        {
          modulo: moduleName,
          seccion: sectionName,
          registroId: `${moduleName.slice(0, 3).toUpperCase()}-9042`,
          motivo: 'Baja ejecutada mediante rol asignado a integración',
        },
        null,
        2
      )
    }
    return JSON.stringify(
      {
        modulo: moduleName,
        seccion: sectionName,
        referencia: `${moduleName.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 8999)}`,
        sucursal: 'CDMX Insurgentes',
        actualizadoPorIntegracion: true,
      },
      null,
      2
    )
  }

  const getDefaultRoleForIntegration = (): RoleKey => {
    const ecommerceRole = roleDefinitions.find((r) => r.id === 'role_integracion_ecommerce')
    if (ecommerceRole) return ecommerceRole.id
    const nonAdmin = roleDefinitions.find((r) => !isGeneralAdminRole(r))
    return nonAdmin?.id || roleDefinitions[0]?.id || 'Ventas'
  }

  const handleOpenCreateExternalInteg = () => {
    const defaultRoleId = getDefaultRoleForIntegration()
    const roleObj = roleDefinitions.find((r) => r.id === defaultRoleId)
    setExtEditingId(null)
    setExtRoleMode('existing')
    setExtNewRoleName('')
    setRoleMatrixFilter('')
    setExtRolePermsDraft(cloneSectionPermissions(getRoleSectionPermissions(roleObj)))
    setExtDraft({
      name: '',
      systemType: 'Ecommerce',
      description: '',
      environment: 'production',
      status: 'active',
      roleId: defaultRoleId,
      webhookCallbackUrl: '',
      ipAllowlist: '',
      rateLimitPerMin: 120,
    })
    setExtModalOpen(true)
  }

  const handleOpenEditExternalInteg = (rec: ExternalIntegrationRecord) => {
    setExtEditingId(rec.id)
    const fallbackRoleId = getDefaultRoleForIntegration()
    const validRoleId = roleDefinitions.some((r) => r.id === rec.roleId) ? rec.roleId : fallbackRoleId
    const roleObj = roleDefinitions.find((r) => r.id === validRoleId)
    setExtRoleMode('existing')
    setExtNewRoleName('')
    setRoleMatrixFilter('')
    setExtRolePermsDraft(cloneSectionPermissions(getRoleSectionPermissions(roleObj)))
    setExtDraft({
      name: rec.name,
      systemType: rec.systemType,
      description: rec.description,
      environment: rec.environment,
      status: rec.status,
      roleId: validRoleId,
      webhookCallbackUrl: rec.webhookCallbackUrl,
      ipAllowlist: rec.ipAllowlist,
      rateLimitPerMin: rec.rateLimitPerMin,
    })
    setExtModalOpen(true)
  }

  const commitIntegrationAndRoleToGlobal = (params: {
    targetIntegrationId: string | null
    name: string
    systemType: ExternalSystemType
    description: string
    environment: 'production' | 'sandbox'
    status: 'active' | 'paused' | 'revoked'
    webhookCallbackUrl: string
    ipAllowlist: string
    rateLimitPerMin: number
    roleMode: 'existing' | 'newRole'
    roleId: RoleKey
    newRoleName: string
    perms: RoleSectionPermissions
  }): { ok: boolean; savedIntegrationId?: string; savedRoleId?: RoleKey } => {
    const cleanName = params.name.trim()
    if (!cleanName) {
      toast.warning(
        'Ingresa el nombre de la integración o sistema externo.',
        'Integraciones API'
      )
      return { ok: false }
    }

    let nextRolesList = roleDefinitions
    let resolvedRole: RoleDefinition | undefined
    let effectivePerms: RoleSectionPermissions = cloneSectionPermissions(params.perms)

    if (params.roleMode === 'newRole') {
      const cleanRoleName = params.newRoleName.trim() || `API · ${cleanName}`
      const normalized = cleanRoleName.toLowerCase()
      const duplicate = roleDefinitions.some(
        (r) =>
          r.id.toLowerCase() === normalized ||
          r.name.toLowerCase() === normalized ||
          getRoleLabel(r.id).toLowerCase() === normalized ||
          getRoleCardTitle(r).toLowerCase() === normalized
      )
      if (duplicate) {
        toast.warning(
          `Ya existe un rol llamado "${cleanRoleName}". Elige otro nombre o selecciona el rol existente.`,
          'Rol duplicado'
        )
        return { ok: false }
      }
      const enabledCount = getEnabledSectionEntries(effectivePerms).length
      if (enabledCount === 0) {
        toast.warning(
          'Asigna al menos una sección con nivel Ver, Crear, Editar o Completo antes de guardar.',
          'Permisos requeridos'
        )
        return { ok: false }
      }
      const newRoleId = `role_integ_${Date.now().toString(36)}`
      const newRoleDef: RoleDefinition = {
        id: newRoleId,
        name: cleanRoleName,
        description: `Rol dedicado para la integración "${cleanName}" (${enabledCount} secciones configuradas sin consumo de usuario).`,
        forApiIntegration: true,
        capabilities: deriveCapabilitiesFromSectionPermissions(effectivePerms),
        sectionPermissions: effectivePerms,
      }
      nextRolesList = [newRoleDef, ...roleDefinitions]
      resolvedRole = newRoleDef
    } else {
      const existingRole = roleDefinitions.find((r) => r.id === params.roleId)
      if (!existingRole) {
        toast.warning('Selecciona un rol válido para vincular a la integración.', 'Rol requerido')
        return { ok: false }
      }
      if (isGeneralAdminRole(existingRole)) {
        effectivePerms = cloneSectionPermissions(DEFAULT_ROLE_SECTION_PERMISSIONS.Administrador)
        resolvedRole = existingRole
      } else {
        const enabledCount = getEnabledSectionEntries(effectivePerms).length
        if (enabledCount === 0) {
          toast.warning(
            `El rol "${getRoleCardTitle(existingRole)}" debe tener al menos una sección con nivel Ver, Crear, Editar o Completo.`,
            'Permisos requeridos'
          )
          return { ok: false }
        }
        const updatedRole: RoleDefinition = {
          ...existingRole,
          sectionPermissions: effectivePerms,
          capabilities: deriveCapabilitiesFromSectionPermissions(effectivePerms),
        }
        nextRolesList = roleDefinitions.map((r) =>
          r.id === existingRole.id ? updatedRole : r
        )
        resolvedRole = updatedRole
      }
    }

    persistRoleDefinitions(nextRolesList)

    const enabledCount = getEnabledSectionEntries(effectivePerms).length
    const derivedLegacyPerms = deriveLegacyCrudSummaryFromRole(effectivePerms)
    const roleDisplay = resolvedRole ? getRoleCardTitle(resolvedRole) : params.roleId
    const resolvedRoleId = resolvedRole?.id || params.roleId
    const cleanRate = Math.min(5000, Math.max(10, Number(params.rateLimitPerMin) || 120))
    const nowIso = new Date().toISOString()

    if (params.targetIntegrationId) {
      const updatedIntegs = externalIntegrations.map((rec) => {
        if (rec.id === params.targetIntegrationId) {
          return {
            ...rec,
            name: cleanName,
            systemType: params.systemType,
            description:
              params.description.trim() || `Integración API vinculada al rol ${roleDisplay}`,
            environment: params.environment,
            status: params.status,
            roleId: resolvedRoleId,
            webhookCallbackUrl: params.webhookCallbackUrl.trim(),
            ipAllowlist: params.ipAllowlist.trim(),
            rateLimitPerMin: cleanRate,
            permissions: derivedLegacyPerms,
          }
        }
        if (rec.roleId === resolvedRoleId) {
          return {
            ...rec,
            permissions: derivedLegacyPerms,
          }
        }
        return rec
      })
      persistExternalIntegrations(updatedIntegs)
      recordAudit({
        category: 'integrations',
        action: 'Configuración global de integración y rol actualizada',
        detail: `${cleanName} · Rol: ${roleDisplay} (${enabledCount} secciones, 0 usuarios consumidos)`,
        user: 'Andrea Morales',
      })
      toast.success(
        `"${cleanName}" y los permisos de "${roleDisplay}" (${enabledCount} secciones) se guardaron en la configuración global.`,
        'Configuración global guardada'
      )
      return {
        ok: true,
        savedIntegrationId: params.targetIntegrationId,
        savedRoleId: resolvedRoleId,
      }
    }

    const { apiKeyPrefix, apiKeySecret } = generateExternalApiKey(params.environment)
    const newRecord: ExternalIntegrationRecord = {
      id: `ext_${Date.now().toString(36)}`,
      name: cleanName,
      systemType: params.systemType,
      origin: 'custom',
      description:
        params.description.trim() ||
        `Acceso API externo (${params.systemType}) gobernado por el rol ${roleDisplay}.`,
      environment: params.environment,
      status: params.status,
      roleId: resolvedRoleId,
      apiKeyPrefix,
      apiKeySecret,
      webhookCallbackUrl: params.webhookCallbackUrl.trim(),
      ipAllowlist: params.ipAllowlist.trim(),
      rateLimitPerMin: cleanRate,
      permissions: derivedLegacyPerms || { ...EMPTY_EXTERNAL_PERMISSIONS },
      createdAtIso: nowIso,
      lastUsedAtIso: '',
      requestsCount: 0,
      recentLogs: [],
    }
    const updatedOtherIntegs = externalIntegrations.map((rec) =>
      rec.roleId === resolvedRoleId ? { ...rec, permissions: derivedLegacyPerms } : rec
    )
    persistExternalIntegrations([newRecord, ...updatedOtherIntegs])
    setRevealedKeyId(newRecord.id)
    setNewlyIssuedKeyBanner({
      integrationId: newRecord.id,
      integrationName: newRecord.name,
      apiKeySecret: newRecord.apiKeySecret,
    })
    recordAudit({
      category: 'integrations',
      action: 'Nueva integración API y permisos registrados globalmente',
      detail: `${newRecord.name} (${newRecord.systemType}) · Rol: ${roleDisplay} (${enabledCount} secciones) · 0 usuarios consumidos`,
      user: 'Andrea Morales',
    })
    toast.success(
      `Integración "${newRecord.name}" vinculada a "${roleDisplay}" (${enabledCount} secciones) guardada en configuración global.`,
      'Configuración global guardada'
    )
    return { ok: true, savedIntegrationId: newRecord.id, savedRoleId: resolvedRoleId }
  }

  const handleSelectCfgTarget = (
    targetId: string,
    rolesSource = roleDefinitions,
    integsSource = externalIntegrations
  ) => {
    setCfgTargetId(targetId)
    setCfgRoleMode('existing')
    setCfgNewRoleName('')
    if (targetId === '__new__') {
      const defaultRoleId =
        rolesSource.find((r) => r.id === 'role_integracion_ecommerce')?.id ||
        rolesSource.find((r) => !isGeneralAdminRole(r))?.id ||
        rolesSource[0]?.id ||
        'Ventas'
      const roleObj = rolesSource.find((r) => r.id === defaultRoleId)
      setCfgName('')
      setCfgSystemType('Ecommerce')
      setCfgRoleId(defaultRoleId)
      setCfgPerms(cloneSectionPermissions(getRoleSectionPermissions(roleObj)))
      return
    }
    const rec = integsSource.find((item) => item.id === targetId)
    if (!rec) return
    const validRoleId = rolesSource.some((r) => r.id === rec.roleId)
      ? rec.roleId
      : getDefaultRoleForIntegration()
    const roleObj = rolesSource.find((r) => r.id === validRoleId)
    setCfgName(rec.name)
    setCfgSystemType(rec.systemType)
    setCfgRoleId(validRoleId)
    setCfgPerms(cloneSectionPermissions(getRoleSectionPermissions(roleObj)))
  }

  const handleSelectCfgRole = (nextRoleId: RoleKey) => {
    setCfgRoleMode('existing')
    setCfgRoleId(nextRoleId)
    const roleObj = roleDefinitions.find((r) => r.id === nextRoleId)
    setCfgPerms(cloneSectionPermissions(getRoleSectionPermissions(roleObj)))
  }

  const handleSelectModalRole = (nextRoleId: RoleKey) => {
    setExtRoleMode('existing')
    setExtDraft((prev) => ({ ...prev, roleId: nextRoleId }))
    const roleObj = roleDefinitions.find((r) => r.id === nextRoleId)
    setExtRolePermsDraft(cloneSectionPermissions(getRoleSectionPermissions(roleObj)))
  }

  const handleSaveInlineIntegrationConfig = (e: React.FormEvent) => {
    e.preventDefault()
    const isCreatingNew = cfgTargetId === '__new__'
    const existingRec = !isCreatingNew
      ? externalIntegrations.find((item) => item.id === cfgTargetId)
      : undefined
    const res = commitIntegrationAndRoleToGlobal({
      targetIntegrationId: existingRec ? existingRec.id : null,
      name: cfgName,
      systemType: cfgSystemType,
      description: existingRec?.description || '',
      environment: existingRec?.environment || 'production',
      status: existingRec?.status || 'active',
      webhookCallbackUrl: existingRec?.webhookCallbackUrl || '',
      ipAllowlist: existingRec?.ipAllowlist || '',
      rateLimitPerMin: existingRec?.rateLimitPerMin || 120,
      roleMode: cfgRoleMode,
      roleId: cfgRoleId,
      newRoleName: cfgNewRoleName,
      perms: cfgPerms,
    })
    if (res.ok && res.savedIntegrationId && res.savedRoleId) {
      setCfgTargetId(res.savedIntegrationId)
      setCfgRoleMode('existing')
      setCfgNewRoleName('')
      setCfgRoleId(res.savedRoleId)
    }
  }

  const handleSaveExternalIntegration = (e: React.FormEvent) => {
    e.preventDefault()
    const res = commitIntegrationAndRoleToGlobal({
      targetIntegrationId: extEditingId,
      name: extDraft.name,
      systemType: extDraft.systemType,
      description: extDraft.description,
      environment: extDraft.environment,
      status: extDraft.status,
      webhookCallbackUrl: extDraft.webhookCallbackUrl,
      ipAllowlist: extDraft.ipAllowlist,
      rateLimitPerMin: extDraft.rateLimitPerMin,
      roleMode: extRoleMode,
      roleId: extDraft.roleId,
      newRoleName: extNewRoleName,
      perms: extRolePermsDraft,
    })
    if (res.ok) {
      if (res.savedIntegrationId && (cfgTargetId === res.savedIntegrationId || cfgTargetId === '__new__')) {
        setCfgTargetId(res.savedIntegrationId)
        setCfgName(extDraft.name.trim())
        setCfgSystemType(extDraft.systemType)
        if (res.savedRoleId) setCfgRoleId(res.savedRoleId)
        setCfgRoleMode('existing')
        setCfgNewRoleName('')
        setCfgPerms(cloneSectionPermissions(extRolePermsDraft))
      }
      setExtModalOpen(false)
    }
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
    if (cfgTargetId === rec.id) {
      handleSelectCfgTarget(remaining[0]?.id || '__new__', roleDefinitions, remaining)
    }
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
    const role = roleDefinitions.find((r) => r.id === rec.roleId)
    const perms = getRoleSectionPermissions(role)
    const enabledEntries = getEnabledSectionEntries(perms)
    const first = enabledEntries[0] || { moduleName: 'CRM', sectionName: 'Clientes', level: 'view' as SectionAccessLevel }
    setSimIntegrationId(rec.id)
    setSimModule(first.moduleName)
    setSimSection(first.sectionName)
    setSimMethod('GET')
    setSimPayload(getSamplePayloadForSection(first.moduleName, first.sectionName, 'GET'))
    setSimResult(null)
  }

  const handleRunCrudSimulation = (overrideIntegrationId?: unknown) => {
    const targetId =
      typeof overrideIntegrationId === 'string' && overrideIntegrationId
        ? overrideIntegrationId
        : simIntegrationId || analyzerIntegrationId || externalIntegrations[0]?.id
    const rec = externalIntegrations.find((item) => item.id === targetId)
    if (!rec) return
    const linkedRole = roleDefinitions.find((r) => r.id === rec.roleId)
    const roleName = linkedRole ? getRoleCardTitle(linkedRole) : rec.roleId
    const perms = getRoleSectionPermissions(linkedRole)
    const sectionLevel: SectionAccessLevel = perms[simModule]?.[simSection] || 'none'
    const allowedByRole = levelAllowsHttpMethod(sectionLevel, simMethod)
    const endpoint = getSectionApiEndpoint(simModule, simSection)
    const nowIso = new Date().toISOString()
    const latencyMs = 28 + Math.floor(Math.random() * 54)

    let statusCode: 200 | 201 | 401 | 403 = 200
    let summary = ''
    let bodyObj: Record<string, unknown>

    const requiredLevelMap: Record<'GET' | 'POST' | 'PUT' | 'DELETE', SectionAccessLevel> = {
      GET: 'view',
      POST: 'create',
      PUT: 'edit',
      DELETE: 'full',
    }

    if (rec.status === 'revoked') {
      statusCode = 401
      summary = `Petición ${simMethod} ${endpoint} rechazada: credencial revocada`
      bodyObj = {
        ok: false,
        error: 'TOKEN_REVOKED',
        message: 'La llave Bearer proporcionada fue revocada y no puede operar en AES Nexus.',
      }
    } else if (rec.status === 'paused') {
      statusCode = 403
      summary = `Petición ${simMethod} ${endpoint} bloqueada: integración pausada`
      bodyObj = {
        ok: false,
        error: 'INTEGRATION_PAUSED',
        message: 'La integración está temporalmente pausada por el administrador.',
      }
    } else if (!allowedByRole) {
      statusCode = 403
      const reqLevelLabel = getLevelLabel(requiredLevelMap[simMethod])
      const currLevelLabel = getLevelLabel(sectionLevel)
      summary = `Denegado ${simMethod} ${endpoint} · Rol "${roleName}" tiene nivel "${currLevelLabel}"`
      bodyObj = {
        ok: false,
        error: 'ROLE_SECTION_ACCESS_DENIED',
        linkedRole: roleName,
        module: simModule,
        section: simSection,
        currentLevel: currLevelLabel,
        requiredLevel: reqLevelLabel,
        message: `El rol "${roleName}" tiene nivel "${currLevelLabel}" en ${simModule} › ${simSection}. Se requiere al menos nivel "${reqLevelLabel}" para ejecutar ${simMethod}.`,
      }
    } else {
      statusCode = simMethod === 'POST' ? 201 : 200
      if (simMethod === 'GET') {
        summary = `Consulta ${simModule} › ${simSection} permitida (Rol: ${roleName} · ${getLevelLabel(sectionLevel)})`
        bodyObj = {
          ok: true,
          linkedRole: roleName,
          accessLevel: getLevelLabel(sectionLevel),
          endpoint,
          total: 25,
          data: [
            {
              id: `${simModule.slice(0, 3).toUpperCase()}-1001`,
              modulo: simModule,
              seccion: simSection,
              actualizadoEn: nowIso,
            },
          ],
        }
      } else if (simMethod === 'POST') {
        const createdId = `${simModule.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 8999)}`
        summary = `Registro ${createdId} insertado en ${simModule} › ${simSection}`
        bodyObj = {
          ok: true,
          operation: 'INSERT',
          linkedRole: roleName,
          accessLevel: getLevelLabel(sectionLevel),
          id: createdId,
          createdAt: nowIso,
          message: `Registro insertado correctamente en ${simModule} › ${simSection}.`,
        }
      } else if (simMethod === 'PUT') {
        summary = `Registro editado en ${simModule} › ${simSection} (Rol: ${roleName})`
        bodyObj = {
          ok: true,
          operation: 'UPDATE',
          linkedRole: roleName,
          accessLevel: getLevelLabel(sectionLevel),
          updatedAt: nowIso,
          affectedRows: 1,
          message: `Cambios aplicados en ${simModule} › ${simSection}.`,
        }
      } else {
        summary = `Registro eliminado en ${simModule} › ${simSection} (Acceso Completo)`
        bodyObj = {
          ok: true,
          operation: 'DELETE',
          linkedRole: roleName,
          accessLevel: getLevelLabel(sectionLevel),
          deletedAt: nowIso,
          affectedRows: 1,
          message: `Registro eliminado correctamente en ${simModule} › ${simSection}.`,
        }
      }
    }

    const responseJson = JSON.stringify(bodyObj, null, 2)
    const newLog: ExternalIntegrationLog = {
      id: `extlog_${Date.now().toString(36)}`,
      method: simMethod,
      resource: mapModuleToLegacyResource(simModule),
      moduleName: simModule,
      sectionName: simSection,
      endpoint,
      statusCode,
      latencyMs,
      summary,
      responsePayload: responseJson,
      timestampIso: nowIso,
    }

    const updated = externalIntegrations.map((item) =>
      item.id === rec.id
        ? {
            ...item,
            lastUsedAtIso: nowIso,
            requestsCount: item.requestsCount + 1,
            recentLogs: [newLog, ...item.recentLogs].slice(0, 25),
          }
        : item
    )
    persistExternalIntegrations(updated)
    setExpandedIntegLogIds((prev) => ({ ...prev, [newLog.id]: true }))
    setSimResult({
      statusCode,
      latencyMs,
      body: responseJson,
    })
    recordAudit({
      category: 'integrations',
      action: `API Externa (${roleName}) · ${simMethod} ${endpoint}`,
      detail: `${rec.name} → HTTP ${statusCode} (${summary})`,
      user: 'Andrea Morales',
    })
  }

  const persistCommercialIntegrations = (updated: CommercialIntegrationRecord[]) => {
    setCommercialIntegrations(updated)
    writeStoredJson(STORAGE_KEYS.commercialIntegrations, updated)
    window.dispatchEvent(
      new CustomEvent(COMMERCIAL_INTEGRATIONS_CHANGED_EVENT, {
        detail: { commercialIntegrations: updated },
      })
    )
  }

  const getCommercialDraft = (rec: CommercialIntegrationRecord): CommercialIntegrationRecord =>
    commDraftsById[rec.id] || rec

  const updateCommercialDraft = (
    rec: CommercialIntegrationRecord,
    patch: Partial<CommercialIntegrationRecord>
  ) => {
    setCommDraftsById((prev) => ({
      ...prev,
      [rec.id]: {
        ...(prev[rec.id] || rec),
        ...patch,
      },
    }))
  }

  const handleInstallMarketplaceApp = (app: CommercialMarketplaceApp) => {
    if (installingMarketplaceIds[app.id]) return

    const existing = commercialIntegrations.find((item) => item.marketplaceId === app.id)
    if (existing) {
      setEditingCommercialId(existing.id)
      return
    }

    setInstallingMarketplaceIds((prev) => ({ ...prev, [app.id]: true }))
    const chosenInterval = marketplaceIntervalDrafts[app.id] || app.defaultSyncInterval

    const timerId = window.setTimeout(() => {
      const nowIso = new Date().toISOString()
      const newRecord: CommercialIntegrationRecord = {
        id: `comm_${app.id.replace(/^mkt_/, '')}_${Date.now().toString(36)}`,
        marketplaceId: app.id,
        name: app.name,
        vendor: app.vendor,
        category: app.category,
        description: app.description,
        enabled: true,
        environment: 'production',
        syncInterval: chosenInterval,
        endpointLabel: app.endpointLabel,
        endpointUrl: '',
        apiKeyLabel: app.apiKeyLabel,
        apiKey: '',
        apiSecretLabel: app.apiSecretLabel,
        apiSecret: '',
        dataSyncedLabel: app.dataSyncedLabel,
        lastSyncAtIso: '',
        lastSyncStatus: 'idle',
        installedAtIso: nowIso,
        recentLogs: [],
      }

      setCommercialIntegrations((prev) => {
        if (prev.some((item) => item.marketplaceId === app.id)) return prev
        const updated = [newRecord, ...prev]
        writeStoredJson(STORAGE_KEYS.commercialIntegrations, updated)
        window.dispatchEvent(
          new CustomEvent(COMMERCIAL_INTEGRATIONS_CHANGED_EVENT, {
            detail: { commercialIntegrations: updated },
          })
        )
        return updated
      })

      setInstallingMarketplaceIds((prev) => {
        const next = { ...prev }
        delete next[app.id]
        return next
      })

      const syncMeta =
        COMMERCIAL_SYNC_INTERVALS.find((s) => s.id === chosenInterval) ||
        COMMERCIAL_SYNC_INTERVALS[1]
      recordAudit({
        category: 'integrations',
        action: 'Dependencias e integración comercial instaladas',
        detail: `${app.name} (${app.category}) · Intervalo inicial: ${syncMeta.label} · Pendiente de configurar credenciales`,
        user: 'Andrea Morales',
      })
      toast.success(
        `Dependencias de "${app.name}" instaladas correctamente. Ahora haz clic en "Configurar" para ingresar tus credenciales.`,
        'Marketplace de Integraciones'
      )
    }, 650)

    installTimersRef.current.push(timerId)
  }

  const handleChangeCommercialSyncInterval = (
    rec: CommercialIntegrationRecord,
    nextInterval: CommercialSyncInterval
  ) => {
    const updated = commercialIntegrations.map((item) =>
      item.id === rec.id ? { ...item, syncInterval: nextInterval } : item
    )
    persistCommercialIntegrations(updated)
    setCommDraftsById((prev) =>
      prev[rec.id] ? { ...prev, [rec.id]: { ...prev[rec.id], syncInterval: nextInterval } } : prev
    )
    const syncMeta =
      COMMERCIAL_SYNC_INTERVALS.find((s) => s.id === nextInterval) || COMMERCIAL_SYNC_INTERVALS[1]
    recordAudit({
      category: 'integrations',
      action: 'Intervalo de sincronización actualizado',
      detail: `${rec.name} · Nueva frecuencia: ${syncMeta.label}`,
      user: 'Andrea Morales',
    })
    toast.success(
      `AES Nexus sincronizará "${rec.name}" ${syncMeta.label.toLowerCase()}.`,
      'Intervalo de sincronización'
    )
  }

  const handleSaveCommercialConfig = (rec: CommercialIntegrationRecord, e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const draft = getCommercialDraft(rec)
    const cleanEndpoint = draft.endpointUrl.trim()
    const cleanKey = draft.apiKey.trim()
    const cleanSecret = draft.apiSecret.trim()

    if (!cleanEndpoint || !cleanKey || !cleanSecret) {
      toast.warning(
        `Completa ${draft.endpointLabel}, ${draft.apiKeyLabel} y ${draft.apiSecretLabel} para guardar las credenciales de "${draft.name}".`,
        'Credenciales requeridas'
      )
      return
    }

    const syncMeta =
      COMMERCIAL_SYNC_INTERVALS.find((s) => s.id === draft.syncInterval) ||
      COMMERCIAL_SYNC_INTERVALS[1]

    const nextRecord: CommercialIntegrationRecord = {
      ...draft,
      endpointUrl: cleanEndpoint,
      apiKey: cleanKey,
      apiSecret: cleanSecret,
    }

    const updated = commercialIntegrations.map((item) =>
      item.id === rec.id ? nextRecord : item
    )
    persistCommercialIntegrations(updated)
    setCommDraftsById((prev) => {
      const next = { ...prev }
      delete next[rec.id]
      return next
    })
    setEditingCommercialId(null)
    recordAudit({
      category: 'integrations',
      action: 'Credenciales y frecuencia comercial guardadas',
      detail: `${draft.name} · Entorno ${draft.environment === 'production' ? 'Producción' : 'Sandbox'} · Consulta: ${syncMeta.label}`,
      user: 'Andrea Morales',
    })
    toast.success(
      `Credenciales de "${draft.name}" guardadas. AES Nexus consultará este sistema: ${syncMeta.label.toLowerCase()}.`,
      'Integración comercial actualizada'
    )
  }

  const handleRunCommercialSync = (rec: CommercialIntegrationRecord) => {
    const current = getCommercialDraft(rec)
    const nowIso = new Date().toISOString()
    const latencyMs = 34 + Math.floor(Math.random() * 58)
    const catalogApp = COMMERCIAL_MARKETPLACE_CATALOG.find(
      (app) => app.id === current.marketplaceId
    )
    const endpoint =
      catalogApp?.sampleOutboundEndpoint.replace(/^(GET|POST)\s+/i, '') ||
      current.endpointUrl.trim() ||
      `https://api.${current.name.toLowerCase().replace(/\s+/g, '')}.com/v1/sync`
    const hasAllCredentials =
      Boolean(current.endpointUrl.trim()) &&
      Boolean(current.apiKey.trim()) &&
      Boolean(current.apiSecret.trim())

    let statusCode: 200 | 401 | 403 = 200
    let summary = ''
    let bodyObj: Record<string, unknown>

    if (!current.enabled) {
      statusCode = 403
      summary = `Consulta saliente omitida: el conector "${current.name}" está pausado`
      bodyObj = {
        ok: false,
        direction: 'outbound_poll',
        error: 'CONNECTOR_PAUSED',
        provider: current.name,
        message: 'Reactiva el conector comercial para reanudar las consultas programadas de AES Nexus.',
      }
    } else if (!hasAllCredentials) {
      statusCode = 401
      summary = `Error de autenticación al consultar ${current.name}: faltan credenciales`
      bodyObj = {
        ok: false,
        direction: 'outbound_poll',
        error: 'MISSING_CREDENTIALS',
        provider: current.name,
        message: `Completa ${current.endpointLabel}, ${current.apiKeyLabel} y ${current.apiSecretLabel} antes de consultar.`,
      }
    } else {
      const syncMeta =
        COMMERCIAL_SYNC_INTERVALS.find((s) => s.id === current.syncInterval) ||
        COMMERCIAL_SYNC_INTERVALS[1]
      summary = `Consulta manual (${syncMeta.shortLabel}): información sincronizada desde ${current.name}`
      bodyObj = {
        ...(catalogApp?.sampleOutboundPayload || {
          ok: true,
          direction: 'outbound_poll',
          provider: current.name,
        }),
        environment: current.environment,
        syncInterval: syncMeta.label,
        polledAt: nowIso,
      }
    }

    const newLog: ExternalIntegrationLog = {
      id: `commlog_${Date.now().toString(36)}`,
      method: 'GET',
      resource: 'ventas',
      moduleName: current.category,
      sectionName: current.name,
      endpoint,
      statusCode,
      latencyMs,
      summary,
      responsePayload: JSON.stringify(bodyObj, null, 2),
      timestampIso: nowIso,
    }

    const updated = commercialIntegrations.map((item) =>
      item.id === rec.id
        ? {
            ...current,
            lastSyncAtIso: nowIso,
            lastSyncStatus: (statusCode >= 400 ? 'error' : 'success') as 'error' | 'success',
            recentLogs: [newLog, ...(item.recentLogs || [])].slice(0, 25),
          }
        : item
    )
    persistCommercialIntegrations(updated)
    setCommDraftsById((prev) => {
      const next = { ...prev }
      delete next[rec.id]
      return next
    })
    setExpandedIntegLogIds((prev) => ({ ...prev, [newLog.id]: true }))
    recordAudit({
      category: 'integrations',
      action: `Consulta saliente a ${current.name}`,
      detail: `HTTP ${statusCode} · ${summary}`,
      user: 'Andrea Morales',
    })
    if (statusCode >= 400) {
      toast.warning(summary, 'Consulta comercial')
    } else {
      toast.success(
        `AES Nexus consultó "${current.name}" correctamente (${latencyMs} ms). Revisa el payload en Logs de Integración.`,
        'Sincronización completada'
      )
    }
  }

  const handleToggleCommercialStatus = (rec: CommercialIntegrationRecord) => {
    const nextEnabled = !rec.enabled
    const updated = commercialIntegrations.map((item) =>
      item.id === rec.id ? { ...item, enabled: nextEnabled } : item
    )
    persistCommercialIntegrations(updated)
    setCommDraftsById((prev) =>
      prev[rec.id] ? { ...prev, [rec.id]: { ...prev[rec.id], enabled: nextEnabled } } : prev
    )
    recordAudit({
      category: 'integrations',
      action: nextEnabled ? 'Conector comercial activado' : 'Conector comercial pausado',
      detail: `${rec.name} (${rec.category})`,
      user: 'Andrea Morales',
    })
    toast.info(
      `Conector "${rec.name}" ${nextEnabled ? 'activado' : 'pausado'}.`,
      'Integraciones comerciales'
    )
  }

  const handleUninstallCommercialInteg = (rec: CommercialIntegrationRecord) => {
    const remaining = commercialIntegrations.filter((item) => item.id !== rec.id)
    persistCommercialIntegrations(remaining)
    setCommDraftsById((prev) => {
      const next = { ...prev }
      delete next[rec.id]
      return next
    })
    if (editingCommercialId === rec.id) setEditingCommercialId(null)
    recordAudit({
      category: 'integrations',
      action: 'Conector comercial desinstalado',
      detail: `${rec.name} (${rec.category})`,
      user: 'Andrea Morales',
    })
    toast.info(
      `"${rec.name}" desinstalada. Puedes volver a instalarla cuando quieras desde el Marketplace.`,
      'Integraciones comerciales'
    )
  }

  const handleClearIntegrationLogs = () => {
    const targetIntegrationId = integLogIntegrationFilter
    const updatedExternal = externalIntegrations.map((item) => {
      if (targetIntegrationId !== 'all' && item.id !== targetIntegrationId) return item
      return {
        ...item,
        recentLogs: [],
      }
    })
    const updatedCommercial = commercialIntegrations.map((item) => {
      if (targetIntegrationId !== 'all' && item.id !== targetIntegrationId) return item
      return {
        ...item,
        recentLogs: [],
      }
    })
    persistExternalIntegrations(updatedExternal)
    persistCommercialIntegrations(updatedCommercial)
    setExpandedIntegLogIds({})
    toast.info(
      targetIntegrationId === 'all'
        ? 'Se limpió el historial de llamadas API registradas.'
        : 'Se limpiaron los logs de la integración seleccionada.',
      'Logs de Integración'
    )
  }

  const customExternalIntegrations = useMemo(
    () => externalIntegrations.filter((rec) => rec.origin !== 'commercial'),
    [externalIntegrations]
  )

  const allIntegrationLogs = useMemo(() => {
    const customLogs = customExternalIntegrations.flatMap((rec) =>
      (rec.recentLogs || []).map((log) => {
        const resolvedEndpoint =
          log.endpoint ||
          (log.moduleName && log.sectionName
            ? getSectionApiEndpoint(log.moduleName, log.sectionName)
            : `/api/v1/${log.resource}`)
        const resolvedPayload =
          log.responsePayload ||
          JSON.stringify(
            {
              ok: log.statusCode < 400,
              statusCode: log.statusCode,
              method: log.method,
              endpoint: resolvedEndpoint,
              summary: log.summary,
              timestamp: log.timestampIso,
            },
            null,
            2
          )
        return {
          ...log,
          endpoint: resolvedEndpoint,
          responsePayload: resolvedPayload,
          latencyMs: log.latencyMs ?? (log.statusCode >= 400 ? 22 : 38),
          integrationId: rec.id,
          integrationName: rec.name,
          integrationEnv: rec.environment,
          sourceKind: 'custom' as const,
        }
      })
    )

    const commercialLogs = commercialIntegrations.flatMap((rec) =>
      (rec.recentLogs || []).map((log) => {
        const resolvedEndpoint =
          log.endpoint || rec.endpointUrl || `https://api.${rec.name.toLowerCase()}.com`
        const resolvedPayload =
          log.responsePayload ||
          JSON.stringify(
            {
              ok: log.statusCode < 400,
              direction: 'outbound_poll',
              provider: rec.name,
              statusCode: log.statusCode,
              summary: log.summary,
              timestamp: log.timestampIso,
            },
            null,
            2
          )
        return {
          ...log,
          endpoint: resolvedEndpoint,
          responsePayload: resolvedPayload,
          latencyMs: log.latencyMs ?? (log.statusCode >= 400 ? 25 : 44),
          integrationId: rec.id,
          integrationName: rec.name,
          integrationEnv: rec.environment,
          sourceKind: 'commercial' as const,
        }
      })
    )

    return [...commercialLogs, ...customLogs].sort(
      (a, b) => new Date(b.timestampIso).getTime() - new Date(a.timestampIso).getTime()
    )
  }, [commercialIntegrations, customExternalIntegrations])

  const filteredIntegrationLogs = useMemo(() => {
    const q = integLogSearch.trim().toLowerCase()
    return allIntegrationLogs.filter((log) => {
      if (integLogIntegrationFilter !== 'all' && log.integrationId !== integLogIntegrationFilter) {
        return false
      }
      const isError = log.statusCode >= 400
      if (integLogStatusFilter === 'success' && isError) return false
      if (integLogStatusFilter === 'error' && !isError) return false
      if (integLogMethodFilter !== 'all' && log.method !== integLogMethodFilter) return false
      if (!q) return true
      return `${log.integrationName} ${log.method} ${log.endpoint} ${log.moduleName || ''} ${log.sectionName || ''} ${log.summary} ${log.responsePayload}`
        .toLowerCase()
        .includes(q)
    })
  }, [
    allIntegrationLogs,
    integLogSearch,
    integLogIntegrationFilter,
    integLogStatusFilter,
    integLogMethodFilter,
  ])

  const installedMarketplaceIds = useMemo(
    () => new Set(commercialIntegrations.map((rec) => rec.marketplaceId)),
    [commercialIntegrations]
  )

  const availableMarketplaceApps = useMemo(
    () => COMMERCIAL_MARKETPLACE_CATALOG.filter((app) => !installedMarketplaceIds.has(app.id)),
    [installedMarketplaceIds]
  )

  const filteredMarketplaceApps = useMemo(() => {
    const q = marketplaceSearch.trim().toLowerCase()
    return COMMERCIAL_MARKETPLACE_CATALOG.filter((app) => {
      if (marketplaceCategory !== 'all' && app.category !== marketplaceCategory) return false
      const isInstalled = installedMarketplaceIds.has(app.id)
      if (marketplaceStatusFilter === 'installed' && !isInstalled) return false
      if (marketplaceStatusFilter === 'available' && isInstalled) return false
      if (!q) return true
      return `${app.name} ${app.vendor} ${app.category} ${app.description} ${app.dataSyncedLabel}`
        .toLowerCase()
        .includes(q)
    })
  }, [marketplaceSearch, marketplaceCategory, marketplaceStatusFilter, installedMarketplaceIds])

  const activeCommercialEditorRecord = useMemo(
    () => commercialIntegrations.find((item) => item.id === editingCommercialId) || null,
    [commercialIntegrations, editingCommercialId]
  )

  const filteredCustomIntegrations = useMemo(() => {
    const q = extSearch.trim().toLowerCase()
    return customExternalIntegrations.filter((rec) => {
      if (extStatusFilter !== 'all' && rec.status !== extStatusFilter) return false
      if (!q) return true
      return `${rec.name} ${rec.systemType} ${rec.description} ${rec.apiKeyPrefix}`
        .toLowerCase()
        .includes(q)
    })
  }, [customExternalIntegrations, extSearch, extStatusFilter])

  const customNativeWebhooks = useMemo(
    () => integrations.filter((integ) => integ.id === 'webhooks'),
    [integrations]
  )

  const integrationLogMetrics = useMemo(() => {
    const total = allIntegrationLogs.length
    const successCount = allIntegrationLogs.filter((l) => l.statusCode < 400).length
    const errorCount = total - successCount
    const successRate = total > 0 ? Math.round((successCount / total) * 100) : 100
    const avgLatencyMs =
      total > 0
        ? Math.round(allIntegrationLogs.reduce((sum, l) => sum + l.latencyMs, 0) / total)
        : 0
    return { total, successCount, errorCount, successRate, avgLatencyMs }
  }, [allIntegrationLogs])

  const activeSimulatorIntegration = useMemo(
    () => externalIntegrations.find((item) => item.id === simIntegrationId) || null,
    [externalIntegrations, simIntegrationId]
  )

  const handleExportAuditCsv = () => {
    const header = [
      'Fecha/Hora',
      'Timestamp ISO',
      'Categoría',
      'Operación CRUD',
      'Entidad',
      'ID Entidad',
      'Acción',
      'Detalle',
      'Responsable',
      'ID Usuario',
    ]
    const rows = filteredAuditEvents.map((ev) => {
      const actionText = ev.seedKey ? t(`settings.audit.${ev.seedKey}.action` as const) : ev.action
      const detailText = ev.seedKey ? t(`settings.audit.${ev.seedKey}.detail` as const) : ev.detail
      const timeText = ev.seedKey
        ? t(`settings.audit.${ev.seedKey}.time` as const)
        : `${formatDate(new Date(ev.timestampIso))} ${formatTime(new Date(ev.timestampIso))}`
      return [
        timeText,
        ev.timestampIso,
        ev.category,
        ev.crudOperation || '—',
        ev.entityType || '—',
        ev.entityId || '—',
        actionText,
        detailText,
        ev.user,
        ev.userId || '—',
      ]
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
      toast.warning(`Ingresa los últimos 4 dígitos de la tarjeta o ${countryProfile.bank.routingShortLabel}.`, 'Método de pago')
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
      paymentExpiry: paymentDraft.paymentBrand === 'SPEI' ? `Cuenta ${countryProfile.bank.networkName}` : paymentDraft.paymentExpiry.trim() || '09/2028',
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
      `${countryProfile.fiscalDoc.uuidLabel}: ${inv.cfdiUuid}`,
      `Fecha de emisión:  ${formatDate(new Date(inv.dateIso))}`,
      `Periodo cubierto:  ${inv.periodLabel}`,
      `Estado:            ${inv.status === 'paid' ? 'PAGADA' : 'PENDIENTE'}`,
      '------------------------------------------------------',
      `Receptor:          ${org.legalName}`,
      `${countryProfile.taxId.shortLabel}:               ${org.rfc}`,
      `Régimen Fiscal:    ${org.taxRegime}`,
      `Domicilio Fiscal:  ${org.fiscalStreet}, ${countryProfile.territory.postalShortLabel} ${org.fiscalZip}, ${org.fiscalCity}`,
      `Correo de envío:   ${planSettings.billingEmail}`,
      '------------------------------------------------------',
      `Concepto:          ${inv.concept}`,
      `Método de pago:    ${inv.paymentMethod}`,
      `Subtotal:          ${formatCurrency(inv.subtotalMxn, general.reportingCurrency)}`,
      `${countryProfile.vat.label} (${countryProfile.vat.standardRatePct}%):         ${formatCurrency(inv.taxMxn, general.reportingCurrency)}`,
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
        { name: 'Umbrales de stock', label: t('settings.item.Umbrales de stock'), icon: Boxes, count: categoryRulesDraft.filter((r) => r.enabled).length },
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

  const renderRoleSectionMatrix = (
    perms: RoleSectionPermissions,
    onChange: (next: RoleSectionPermissions) => void,
    options?: {
      readOnly?: boolean
      readOnlyNotice?: string
      filterValue?: string
      onFilterChange?: (next: string) => void
    }
  ) => {
    const isReadOnly = Boolean(options?.readOnly)
    const activeFilter = options?.filterValue ?? roleMatrixFilter
    const handleFilterChange = options?.onFilterChange ?? setRoleMatrixFilter
    const enabledCount = getEnabledSectionEntries(perms).length
    const totalSectionsCount = Object.values(SYSTEM_MODULE_SECTIONS).reduce(
      (sum, secs) => sum + secs.length,
      0
    )

    const setModuleLevel = (moduleName: string, level: SectionAccessLevel) => {
      if (isReadOnly) return
      const next = cloneSectionPermissions(perms)
      const sections = SYSTEM_MODULE_SECTIONS[moduleName as keyof typeof SYSTEM_MODULE_SECTIONS] || []
      for (const sec of sections) {
        next[moduleName][sec] = level
      }
      onChange(next)
    }

    const setSectionLevel = (
      moduleName: string,
      sectionName: string,
      level: SectionAccessLevel
    ) => {
      if (isReadOnly) return
      const next = cloneSectionPermissions(perms)
      next[moduleName][sectionName] = level
      onChange(next)
    }

    const query = activeFilter.trim().toLowerCase()
    const filteredModuleEntries = Object.entries(SYSTEM_MODULE_SECTIONS)
      .map(([moduleName, sections]) => {
        if (!query) return [moduleName, sections] as const
        const moduleMatch = moduleName.toLowerCase().includes(query)
        const matchingSections = moduleMatch
          ? sections
          : sections.filter((sec) => sec.toLowerCase().includes(query))
        return [moduleName, matchingSections] as const
      })
      .filter(([, sections]) => sections.length > 0)

    const accessLevelOptions = SECTION_ACCESS_LEVELS.filter((lvl) => lvl.id !== 'none')

    const toggleModuleAccordion = (moduleName: string) => {
      setOpenModuleAccordions((prev) => ({
        ...prev,
        [moduleName]: !prev[moduleName],
      }))
    }

    const allExpanded =
      filteredModuleEntries.length > 0 &&
      filteredModuleEntries.every(([moduleName]) => Boolean(openModuleAccordions[moduleName]))

    const toggleAllAccordions = () => {
      const nextState = !allExpanded
      setOpenModuleAccordions((prev) => {
        const updated = { ...prev }
        for (const [moduleName] of filteredModuleEntries) {
          updated[moduleName] = nextState
        }
        return updated
      })
    }

    return (
      <div className="role-hierarchy-builder">
        {isReadOnly && options?.readOnlyNotice && (
          <div className="ext-matrix-readonly-note" role="status">
            <LockKeyhole size={14} />
            <span>{options.readOnlyNotice}</span>
          </div>
        )}
        <div className="role-hierarchy-legend">
          <div className="role-hierarchy-legend-items">
            <span><strong>Ver</strong>: Visualizar</span>
            <span><strong>Crear</strong>: Ver + Crear</span>
            <span><strong>Editar</strong>: Ver + Crear + Editar</span>
            <span><strong>Completo</strong>: Todo + Borrar</span>
          </div>
          <div className="role-hierarchy-global-actions">
            <span className="tabular-nums">
              {enabledCount} / {totalSectionsCount} secciones activas
            </span>
            <button
              type="button"
              className="button button-ghost button-sm"
              onClick={toggleAllAccordions}
            >
              {allExpanded ? 'Contraer módulos' : 'Expandir módulos'}
            </button>
            <button
              type="button"
              className="button button-ghost button-sm"
              disabled={isReadOnly}
              onClick={() => onChange(buildSectionPermissionsMap('view'))}
            >
              Todo en Ver
            </button>
            <button
              type="button"
              className="button button-ghost button-sm"
              disabled={isReadOnly}
              onClick={() => onChange(buildSectionPermissionsMap('none'))}
            >
              Limpiar todo
            </button>
          </div>
        </div>

        <label className="audit-search-wrap">
          <Search size={13} />
          <input
            type="search"
            value={activeFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            placeholder="Filtrar módulo o sección (ej. Ventas, Facturas, Inventario, Cobros)..."
            aria-label="Filtrar módulos y secciones"
          />
        </label>

        <div className="role-modules-accordion-list">
          {filteredModuleEntries.length === 0 ? (
            <div className="ext-role-preview-empty">
              Ningún módulo o sección coincide con «{activeFilter}».
            </div>
          ) : (
            filteredModuleEntries.map(([moduleName, sections]) => {
              const allSectionsForModule =
                SYSTEM_MODULE_SECTIONS[moduleName as keyof typeof SYSTEM_MODULE_SECTIONS] || []
              const activeInModule = allSectionsForModule.filter(
                (sec) => (perms[moduleName]?.[sec] || 'none') !== 'none'
              ).length
              const isExpanded = Boolean(query) || Boolean(openModuleAccordions[moduleName])
              return (
                <div
                  key={moduleName}
                  className={`role-module-block ${isExpanded ? 'is-open' : 'is-collapsed'}`}
                >
                  <div className="role-module-block-head">
                    <button
                      type="button"
                      className="role-accordion-trigger"
                      aria-expanded={isExpanded}
                      onClick={() => toggleModuleAccordion(moduleName)}
                    >
                      <span className="role-accordion-chevron" aria-hidden="true">
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </span>
                      <div className="role-module-block-title">
                        <strong>{moduleName}</strong>
                        <span className={`tabular-nums ${activeInModule > 0 ? 'has-active' : ''}`}>
                          {activeInModule} / {allSectionsForModule.length} secciones activas
                        </span>
                      </div>
                    </button>

                    <div
                      className="role-module-bulk-select-wrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <select
                        className="role-module-bulk-select"
                        value=""
                        disabled={isReadOnly}
                        aria-label={`Aplicar nivel de acceso a todo ${moduleName}`}
                        onChange={(e) => {
                          const nextLevel = e.target.value as SectionAccessLevel
                          if (!nextLevel) return
                          setModuleLevel(moduleName, nextLevel)
                          setOpenModuleAccordions((prev) => ({ ...prev, [moduleName]: true }))
                        }}
                      >
                        <option value="" disabled>
                          Nivel para todo {moduleName}…
                        </option>
                        <option value="none">Sin acceso</option>
                        <optgroup label="4 niveles de acceso">
                          {accessLevelOptions.map((lvl) => (
                            <option key={lvl.id} value={lvl.id}>
                              {lvl.label} — {lvl.description}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="role-sections-rows">
                      {sections.map((sectionName) => {
                        const currentLevel = perms[moduleName]?.[sectionName] || 'none'
                        return (
                          <div key={sectionName} className="role-section-row">
                            <div className="role-section-name">
                              <span>{sectionName}</span>
                              <code>{getSectionApiEndpoint(moduleName, sectionName)}</code>
                            </div>
                            <select
                              className={`role-level-select level-${currentLevel}`}
                              value={currentLevel}
                              disabled={isReadOnly}
                              aria-label={`Nivel de acceso en ${moduleName} ${sectionName}`}
                              onChange={(e) =>
                                setSectionLevel(
                                  moduleName,
                                  sectionName,
                                  e.target.value as SectionAccessLevel
                                )
                              }
                            >
                              <option value="none">Sin acceso</option>
                              <optgroup label="4 niveles de acceso">
                                {accessLevelOptions.map((lvl) => (
                                  <option key={lvl.id} value={lvl.id}>
                                    {lvl.label} — {lvl.description}
                                  </option>
                                ))}
                              </optgroup>
                            </select>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    )
  }

  const settingsGroups = rawSettingsGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        canAccessSection(
          'Configuración',
          item.name,
          effectiveCaps,
          isFullAdmin,
          isAccountActive,
          activeSectionAccess
        )
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
                        <option value="VES">VES — Bolívar venezolano</option>
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

                {/* Almacenamiento local y restablecimiento demo */}
                <div className="settings-section-card">
                  <div className="card-header-row">
                    <div>
                      <h3>Persistencia local y datos de demostración</h3>
                      <p>
                        Los cambios en Ventas, Compras, Catálogo, Inventario, Finanzas, Gastos, Nómina y CRM se guardan automáticamente en este navegador entre recargas.
                      </p>
                    </div>
                    <Database size={18} className="settings-persistence-icon" aria-hidden="true" />
                  </div>

                  <div className="settings-persistence-grid">
                    <div className="settings-persistence-stat">
                      <span>Módulos persistidos</span>
                      <strong>{persistenceSummary.transactionalDatasetsCount} / 25</strong>
                    </div>
                    <div className="settings-persistence-stat">
                      <span>Claves activas</span>
                      <strong>{persistenceSummary.totalAppKeysCount}</strong>
                    </div>
                    <div className="settings-persistence-stat">
                      <span>Espacio utilizado</span>
                      <strong>{persistenceSummary.estimatedSizeKb} KB</strong>
                    </div>
                    <div className="settings-persistence-stat">
                      <span>Último guardado</span>
                      <strong>{formatPersistenceSavedTime(persistenceSummary.lastSavedIso)}</strong>
                    </div>
                  </div>

                  <div className="settings-persistence-actions">
                    <div className="settings-persistence-copy">
                      <strong>Restaurar escenario de pruebas</strong>
                      <span>
                        Reinicia cotizaciones, pedidos, inventario, movimientos, finanzas, gastos y directorios sin perder usuarios ni configuración, o reinicia todo el entorno desde cero.
                      </span>
                    </div>
                    <div className="settings-persistence-buttons">
                      <button
                        type="button"
                        className="button button-secondary"
                        disabled={!canResetWorkspace || !onResetTransactionalData}
                        onClick={() => setConfirmResetMode('transactional')}
                      >
                        <RotateCcw size={14} /> Restablecer transacciones
                      </button>
                      <button
                        type="button"
                        className="button button-danger-outline"
                        disabled={!canResetWorkspace || !onResetAllWorkspaceData}
                        onClick={() => setConfirmResetMode('all')}
                      >
                        <RefreshCw size={14} /> Reinicio completo
                      </button>
                    </div>
                  </div>

                  {confirmResetMode && (
                    <div className="settings-persistence-confirm" role="alert">
                      <div>
                        <strong>
                          {confirmResetMode === 'all'
                            ? 'Confirmar reinicio completo del entorno'
                            : 'Confirmar restablecimiento de datos operativos y comerciales'}
                        </strong>
                        <p>
                          {confirmResetMode === 'all'
                            ? 'Se eliminarán todos los registros, usuarios personalizados, roles, tema visual y configuraciones guardadas en este navegador, recargando el sistema con valores iniciales.'
                            : 'Se restaurarán los registros demo de Ventas, Compras, Catálogo, Inventario, Devoluciones, Finanzas, Gastos, Nómina y CRM. Tu empresa, usuarios, roles y apariencia permanecerán intactos.'}
                        </p>
                      </div>
                      <div className="settings-persistence-confirm-actions">
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => setConfirmResetMode(null)}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className={`button ${
                            confirmResetMode === 'all' ? 'button-danger-solid' : 'button-primary'
                          }`}
                          onClick={() => {
                            const mode = confirmResetMode
                            setConfirmResetMode(null)
                            if (mode === 'all') {
                              onResetAllWorkspaceData?.()
                            } else {
                              onResetTransactionalData?.()
                              setPersistenceSummary(getErpPersistenceSummary())
                              window.setTimeout(() => {
                                setPersistenceSummary(getErpPersistenceSummary())
                              }, 60)
                            }
                          }}
                        >
                          {confirmResetMode === 'all'
                            ? 'Sí, reiniciar todo'
                            : 'Sí, restablecer datos'}
                        </button>
                      </div>
                    </div>
                  )}
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
                      <label>{countryProfile.taxId.label}</label>
                      <input
                        type="text"
                        value={org.rfc}
                        placeholder={countryProfile.taxId.placeholder}
                        onChange={(e) => setOrg({ ...org, rfc: e.target.value.toUpperCase() })}
                      />
                      <small>{countryProfile.taxId.formatHint}</small>
                    </div>
                  </div>

                  <div className="form-grid-2" style={{ marginTop: '12px' }}>
                    <div className="form-field">
                      <label>{t('settings.org.taxRegimeLabel')}</label>
                      <select
                        value={org.taxRegime}
                        onChange={(e) => setOrg({ ...org, taxRegime: e.target.value })}
                      >
                        {!countryProfile.regimes.some((r) => r.value === org.taxRegime) && org.taxRegime && (
                          <option value={org.taxRegime}>{org.taxRegime}</option>
                        )}
                        {countryProfile.regimes.map((reg) => (
                          <option key={reg.value} value={reg.value}>
                            {reg.label}
                          </option>
                        ))}
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
                      <label>{countryProfile.territory.districtLabel}</label>
                      <input
                        type="text"
                        value={org.fiscalColony}
                        onChange={(e) => setOrg({ ...org, fiscalColony: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-grid-3" style={{ marginTop: '12px' }}>
                    <div className="form-field">
                      <label>{countryProfile.territory.postalLabel}</label>
                      <input
                        type="text"
                        value={org.fiscalZip}
                        placeholder={countryProfile.territory.postalPlaceholder}
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
                      <label>{countryProfile.territory.stateLabel}</label>
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
                const sectionsCount = selectedDefaultDef
                  ? getEnabledSectionEntries(getRoleSectionPermissions(selectedDefaultDef)).length
                  : 0
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
                            {roleDefinitions.map((r) => {
                              const activeSecs = getEnabledSectionEntries(
                                getRoleSectionPermissions(r)
                              ).length
                              return (
                                <option key={r.id} value={r.id}>
                                  {getRoleCardTitle(r)} ({activeSecs} secciones)
                                </option>
                              )
                            })}
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
                          {sectionsCount} secciones habilitadas · {getRoleCardDesc(selectedDefaultDef)}
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
          {activeSetting === 'Roles y permisos' && (() => {
            const canCreateRoles = canCreateInSection(
              'Configuración',
              'Roles y permisos',
              activeSectionAccess,
              isFullAdmin,
              isAccountActive
            )
            const canEditRoles = canEditInSection(
              'Configuración',
              'Roles y permisos',
              activeSectionAccess,
              isFullAdmin,
              isAccountActive
            )
            const canDeleteRoles = canDeleteInSection(
              'Configuración',
              'Roles y permisos',
              activeSectionAccess,
              isFullAdmin,
              isAccountActive
            )
            return (
              <div className="settings-form-container">
                <div className="settings-panel-heading">
                  <div>
                    <h2>{t('settings.roles.heading')}</h2>
                    <p>{t('settings.roles.subheading')}</p>
                  </div>
                  {canCreateRoles && (
                    <button
                      type="button"
                      className="button button-primary"
                      onClick={handleOpenCreateRoleModal}
                    >
                      <Plus size={14} /> {t('settings.roles.createBtn')}
                    </button>
                  )}
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
                    const integCount = externalIntegrations.filter(
                      (ext) => ext.roleId === role.id
                    ).length
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
                              {role.forApiIntegration && (
                                <span className="role-integ-count-tag">
                                  <Plug size={10} /> Rol API
                                </span>
                              )}
                            </div>
                            <div className="role-assigned-counters">
                              <span className="role-users-tag">
                                {t('settings.roles.usersAssigned', { count: usersCount })}
                              </span>
                              {integCount > 0 && (
                                <span className="role-integ-count-tag">
                                  <Plug size={10} /> {integCount}{' '}
                                  {integCount === 1 ? 'integración API' : 'integraciones API'}
                                </span>
                              )}
                            </div>
                          </div>
                          <ShieldCheck size={18} className="role-icon" />
                        </div>
                        <p className="role-desc">{roleDesc}</p>
                        <div className="role-card-footer">
                          {isGeneralAdminRole(role) ? (
                            <>
                              <span className="role-locked-meta">
                                <LockKeyhole size={12} /> {t('settings.roles.protectedLabel')}
                              </span>
                              <button
                                type="button"
                                className="button button-ghost button-sm"
                                onClick={() => handleOpenRoleModal(role)}
                              >
                                Ver permisos &rarr;
                              </button>
                            </>
                          ) : (
                            <>
                              {canDeleteRoles ? (
                                <button
                                  type="button"
                                  className="button button-ghost button-sm role-delete-btn"
                                  onClick={() => handleDeleteRole(role)}
                                  aria-label={`${t('settings.roles.deleteBtn')} ${roleTitle}`}
                                >
                                  <Trash2 size={13} /> {t('settings.roles.deleteBtn')}
                                </button>
                              ) : (
                                <span className="role-protected-meta">
                                  {canEditRoles ? 'Solo edición' : 'Solo lectura'}
                                </span>
                              )}
                              <button
                                type="button"
                                className="button button-ghost button-sm"
                                onClick={() => handleOpenRoleModal(role)}
                              >
                                {canEditRoles
                                  ? `${t('settings.roles.editPermissionsBtn')} →`
                                  : 'Ver permisos →'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

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
                  <button
                    type="button"
                    className="button button-secondary button-sm"
                    onClick={() => onSelectSetting('Umbrales de stock')}
                  >
                    <Boxes size={13} /> Umbrales por categoría <ArrowRight size={12} />
                  </button>
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

          {/* 8B. UMBRALES DE STOCK CRÍTICO POR CATEGORÍA */}
          {activeSetting === 'Umbrales de stock' && (
            <div className="settings-form-container">
              <div className="settings-panel-heading">
                <div>
                  <h2>Umbrales de Stock Crítico por Categoría</h2>
                  <p>
                    Personaliza el mínimo de seguridad por categoría de producto para disparar alertas de reorden en grupo, o prioriza ajustes individuales por SKU.
                  </p>
                </div>
                <div className="settings-cat-thr-header-actions">
                  {canEditStockThresholds && (
                    <>
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => setShowAddCategoryRuleModal(true)}
                      >
                        <Plus size={14} /> Nueva categoría
                      </button>
                      <button
                        type="button"
                        className="button button-ghost"
                        onClick={handleResetCategoryThresholds}
                        title="Restaurar valores sugeridos para cada categoría"
                      >
                        <RotateCcw size={14} /> Restablecer
                      </button>
                      <button
                        type="button"
                        className="button button-primary"
                        onClick={handleSaveCategoryThresholds}
                      >
                        <Check size={14} /> Guardar políticas
                      </button>
                    </>
                  )}
                </div>
              </div>

              {hasUnsavedCategoryThresholds && (
                <div className="settings-cat-thr-unsaved-bar" role="status">
                  <span>
                    <AlertTriangle size={14} /> Tienes cambios sin guardar en los umbrales por categoría.
                  </span>
                  <button
                    type="button"
                    className="button button-primary button-sm"
                    onClick={handleSaveCategoryThresholds}
                  >
                    Guardar ahora
                  </button>
                </div>
              )}

              {/* Resumen cuantitativo limpio (sin píldoras decorativas) */}
              <div className="settings-cat-thr-kpis">
                <article className="settings-cat-thr-kpi">
                  <span className="settings-cat-thr-kpi-label">CATEGORÍAS MONITOREADAS</span>
                  <strong className="settings-cat-thr-kpi-value tabular-nums">
                    {stockThresholdsKpis.activeCount} / {stockThresholdsKpis.totalCategories}
                  </strong>
                  <small>Reglas activas para control de stock</small>
                </article>
                <article className="settings-cat-thr-kpi">
                  <span className="settings-cat-thr-kpi-label">REGLAS MAESTRAS</span>
                  <strong className="settings-cat-thr-kpi-value tabular-nums">
                    {stockThresholdsKpis.overrideCount}
                  </strong>
                  <small>Priorizan categoría sobre SKU individual</small>
                </article>
                <article className="settings-cat-thr-kpi">
                  <span className="settings-cat-thr-kpi-label">EXISTENCIAS CUBIERTAS</span>
                  <strong className="settings-cat-thr-kpi-value tabular-nums">
                    {inventory.length}
                  </strong>
                  <small>
                    {stockThresholdsKpis.categoryDrivenCount} regidas por regla de categoría
                  </small>
                </article>
                <article className="settings-cat-thr-kpi">
                  <span className="settings-cat-thr-kpi-label">EN STOCK CRÍTICO</span>
                  <strong
                    className={`settings-cat-thr-kpi-value tabular-nums ${
                      stockThresholdsKpis.criticalCount > 0 ? 'is-critical' : 'is-safe'
                    }`}
                  >
                    {stockThresholdsKpis.criticalCount}
                  </strong>
                  <small>Alertas activas con la política actual</small>
                </article>
              </div>

              {/* Reglas por Categoría */}
              <div className="settings-section-card">
                <div className="card-header-row">
                  <div>
                    <h3>Políticas de Stock Crítico por Categoría de Producto</h3>
                    <p>
                      Define cuántas unidades mínimas activan la alerta crítica en cada familia y si la regla prevalece sobre el umbral individual del SKU.
                    </p>
                  </div>
                  {canEditStockThresholds && onUpdateInventory && (
                    <button
                      type="button"
                      className="button button-secondary button-sm"
                      onClick={handleSyncAllEnabledCategories}
                      title="Sincronizar el mínimo de cada categoría activa en los registros existentes de inventario"
                    >
                      <RefreshCw size={13} /> Sincronizar todos los SKU
                    </button>
                  )}
                </div>

                <div className="settings-cat-thr-toolbar">
                  <div className="settings-cat-thr-search">
                    <Search size={14} />
                    <input
                      type="text"
                      value={catThresholdSearch}
                      onChange={(e) => setCatThresholdSearch(e.target.value)}
                      placeholder="Buscar categoría o descripción..."
                      aria-label="Buscar categoría de producto"
                    />
                    {catThresholdSearch && (
                      <button
                        type="button"
                        className="search-clear-btn"
                        onClick={() => setCatThresholdSearch('')}
                        aria-label="Limpiar búsqueda"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  <div className="audit-filter-tabs" role="tablist" aria-label="Filtrar categorías">
                    {(
                      [
                        { id: 'all', label: `Todas (${categoryRulesDraft.length})` },
                        {
                          id: 'enabled',
                          label: `Activas (${categoryRulesDraft.filter((r) => r.enabled).length})`,
                        },
                        { id: 'critical', label: 'Con alertas críticas' },
                        { id: 'custom', label: 'Personalizadas' },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={catThresholdStatusFilter === tab.id}
                        className={`audit-filter-btn ${
                          catThresholdStatusFilter === tab.id ? 'active' : ''
                        }`}
                        onClick={() => setCatThresholdStatusFilter(tab.id)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-cat-thr-table-wrap">
                  <table className="settings-cat-thr-table">
                    <thead>
                      <tr>
                        <th>Categoría de producto</th>
                        <th>Monitoreo</th>
                        <th style={{ textAlign: 'center' }}>Umbral crítico</th>
                        <th>Precedencia frente a SKU</th>
                        <th>Evaluación actual</th>
                        <th style={{ textAlign: 'right' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCategoryRules.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="settings-cat-thr-empty">
                            No hay categorías que coincidan con los filtros seleccionados.
                          </td>
                        </tr>
                      ) : (
                        filteredCategoryRules.map((rule) => {
                          const stats = categoryCoverageStats.get(
                            rule.category.trim().toLowerCase()
                          ) || {
                            catalogSkuCount: 0,
                            inventoryRowsCount: 0,
                            criticalRowsCount: 0,
                            totalPhysicalStock: 0,
                          }
                          const isCustom = Boolean(
                            rule.isCustom ||
                              !PRODUCT_CATALOG_CATEGORIES.some(
                                (c) => c.toLowerCase() === rule.category.trim().toLowerCase()
                              )
                          )

                          return (
                            <tr
                              key={rule.id}
                              className={!rule.enabled ? 'is-muted-row' : undefined}
                            >
                              <td>
                                <div className="settings-cat-thr-name-cell">
                                  <div className="settings-cat-thr-title-line">
                                    <strong>{rule.category}</strong>
                                    {isCustom && (
                                      <span className="settings-cat-thr-meta-sep">
                                        · Personalizada
                                      </span>
                                    )}
                                  </div>
                                  {rule.notes && <p>{rule.notes}</p>}
                                  <span className="settings-cat-thr-meta-line tabular-nums">
                                    {stats.catalogSkuCount} SKU(s) en catálogo ·{' '}
                                    {stats.inventoryRowsCount} registro(s) en almacén
                                    {stats.inventoryRowsCount > 0
                                      ? ` · ${stats.totalPhysicalStock} uds. físicas`
                                      : ''}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <label
                                  className="toggle-switch-wrap"
                                  title={
                                    rule.enabled
                                      ? `Pausar regla de ${rule.category}`
                                      : `Activar regla de ${rule.category}`
                                  }
                                >
                                  <input
                                    type="checkbox"
                                    checked={rule.enabled}
                                    disabled={!canEditStockThresholds}
                                    onChange={(e) =>
                                      updateDraftRule(rule.id, { enabled: e.target.checked })
                                    }
                                  />
                                  <span className="toggle-slider" />
                                </label>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <div className="settings-cat-thr-stepper">
                                  <button
                                    type="button"
                                    className="stepper-btn"
                                    disabled={!canEditStockThresholds || rule.minStock <= 0}
                                    onClick={() =>
                                      updateDraftRule(rule.id, {
                                        minStock: Math.max(0, rule.minStock - 1),
                                      })
                                    }
                                    aria-label={`Disminuir umbral para ${rule.category}`}
                                  >
                                    <Minus size={12} />
                                  </button>
                                  <input
                                    type="number"
                                    min={0}
                                    disabled={!canEditStockThresholds}
                                    value={rule.minStock}
                                    onChange={(e) =>
                                      updateDraftRule(rule.id, {
                                        minStock: Math.max(0, parseInt(e.target.value, 10) || 0),
                                      })
                                    }
                                    className="stepper-input tabular-nums"
                                    aria-label={`Umbral crítico para ${rule.category}`}
                                  />
                                  <button
                                    type="button"
                                    className="stepper-btn"
                                    disabled={!canEditStockThresholds}
                                    onClick={() =>
                                      updateDraftRule(rule.id, { minStock: rule.minStock + 1 })
                                    }
                                    aria-label={`Aumentar umbral para ${rule.category}`}
                                  >
                                    <Plus size={12} />
                                  </button>
                                  <span className="settings-cat-thr-unit">uds.</span>
                                </div>
                              </td>
                              <td>
                                <select
                                  className="settings-cat-thr-mode-select"
                                  value={rule.mode}
                                  disabled={!canEditStockThresholds || !rule.enabled}
                                  aria-label={`Modo de precedencia para ${rule.category}`}
                                  onChange={(e) =>
                                    updateDraftRule(rule.id, {
                                      mode: e.target.value as CategoryThresholdMode,
                                    })
                                  }
                                >
                                  <option value="inherit_default">
                                    Heredado (respetar ajuste por SKU)
                                  </option>
                                  <option value="override_sku">
                                    Regla maestra (forzar sobre SKU)
                                  </option>
                                </select>
                              </td>
                              <td>
                                {!rule.enabled ? (
                                  <span className="settings-cat-thr-status is-neutral">
                                    Regla pausada
                                  </span>
                                ) : stats.inventoryRowsCount === 0 ? (
                                  <span className="settings-cat-thr-status is-neutral">
                                    Sin existencias en almacén
                                  </span>
                                ) : stats.criticalRowsCount > 0 ? (
                                  <span className="settings-cat-thr-status is-critical tabular-nums">
                                    <AlertTriangle size={12} aria-hidden="true" />
                                    {stats.criticalRowsCount} en stock crítico
                                  </span>
                                ) : (
                                  <span className="settings-cat-thr-status is-safe">
                                    <CheckCircle2 size={12} aria-hidden="true" />
                                    Nivel seguro
                                  </span>
                                )}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div className="settings-cat-thr-row-actions">
                                  {canEditStockThresholds && onUpdateInventory && (
                                    <button
                                      type="button"
                                      className="button button-ghost button-sm"
                                      onClick={() => handleSyncCategoryToSkus(rule)}
                                      disabled={stats.inventoryRowsCount === 0}
                                      title="Aplicar este umbral directamente a todos los SKUs de la categoría"
                                    >
                                      Sincronizar SKUs
                                    </button>
                                  )}
                                  {canEditStockThresholds && isCustom && (
                                    <button
                                      type="button"
                                      className="icon-button"
                                      onClick={() => handleDeleteCustomCategoryRule(rule)}
                                      title={`Eliminar categoría ${rule.category}`}
                                      aria-label={`Eliminar categoría ${rule.category}`}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
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

              {/* Cobertura por SKU y Excepciones Individuales */}
              <div className="settings-section-card">
                <div className="card-header-row">
                  <div>
                    <h3>Resolución por SKU y Excepciones Individuales</h3>
                    <p>
                      Comprueba qué umbral efectivo aplica en cada almacén según la regla de categoría y las personalizaciones puntuales por SKU.
                    </p>
                  </div>
                  <div className="settings-cat-thr-preview-filters">
                    <select
                      className="settings-cat-thr-mode-select"
                      value={skuPreviewCategoryFilter}
                      onChange={(e) => setSkuPreviewCategoryFilter(e.target.value)}
                      aria-label="Filtrar preview por categoría"
                    >
                      <option value="all">Todas las categorías</option>
                      {categoryRulesDraft.map((rule) => (
                        <option key={rule.id} value={rule.category}>
                          {rule.category}
                        </option>
                      ))}
                    </select>
                    <select
                      className="settings-cat-thr-mode-select"
                      value={skuPreviewSourceFilter}
                      onChange={(e) =>
                        setSkuPreviewSourceFilter(
                          e.target.value as 'all' | 'sku' | 'category' | 'critical'
                        )
                      }
                      aria-label="Filtrar preview por origen de umbral"
                    >
                      <option value="all">Todos los orígenes ({resolvedInventoryPreview.length})</option>
                      <option value="category">Regidos por categoría</option>
                      <option value="sku">Con ajuste individual por SKU</option>
                      <option value="critical">Solo en stock crítico</option>
                    </select>
                  </div>
                </div>

                <div className="settings-cat-thr-table-wrap">
                  <table className="settings-cat-thr-table">
                    <thead>
                      <tr>
                        <th>SKU / Producto</th>
                        <th>Categoría · Almacén</th>
                        <th style={{ textAlign: 'right' }}>Stock actual</th>
                        <th style={{ textAlign: 'right' }}>Umbral efectivo</th>
                        <th>Origen aplicado</th>
                        <th style={{ textAlign: 'right' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSkuPreviewRows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="settings-cat-thr-empty">
                            No hay referencias de inventario que coincidan con este filtro.
                          </td>
                        </tr>
                      ) : (
                        filteredSkuPreviewRows.map(
                          ({ item, effectiveMinStock, source, category, categoryRule, isCritical }) => (
                            <tr key={item.id} className={isCritical ? 'is-critical-row' : undefined}>
                              <td>
                                <div className="settings-cat-thr-name-cell">
                                  <div className="settings-cat-thr-title-line">
                                    <code className="settings-cat-thr-sku">{item.sku}</code>
                                    <strong>{item.name}</strong>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className="settings-cat-thr-meta-line">
                                  {category} · {item.warehouseName}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <strong
                                  className={`tabular-nums ${
                                    isCritical ? 'settings-cat-thr-val-critical' : ''
                                  }`}
                                >
                                  {item.stock} {item.unitOfMeasure}
                                </strong>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div className="settings-cat-thr-effective-cell tabular-nums">
                                  <strong>
                                    {effectiveMinStock} {item.unitOfMeasure}
                                  </strong>
                                  {source === 'category_override' &&
                                    item.minStock !== effectiveMinStock && (
                                      <small>SKU base: {item.minStock}</small>
                                    )}
                                </div>
                              </td>
                              <td>
                                <span className="settings-cat-thr-source-text">
                                  {source === 'category_override' ? (
                                    <>
                                      <Layers size={12} aria-hidden="true" /> Categoría (Regla maestra)
                                    </>
                                  ) : source === 'category_inherit' ? (
                                    <>
                                      <Layers size={12} aria-hidden="true" /> Categoría (Heredado)
                                    </>
                                  ) : (
                                    <>
                                      <SlidersHorizontal size={12} aria-hidden="true" /> Ajuste por SKU
                                    </>
                                  )}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {source === 'sku' &&
                                  categoryRule &&
                                  categoryRule.enabled &&
                                  canEditStockThresholds &&
                                  onUpdateInventory && (
                                    <button
                                      type="button"
                                      className="button button-ghost button-sm"
                                      onClick={() =>
                                        handleInheritSingleSkuFromCategory(
                                          item.id,
                                          categoryRule.minStock,
                                          category
                                        )
                                      }
                                    >
                                      Heredar ({categoryRule.minStock})
                                    </button>
                                  )}
                              </td>
                            </tr>
                          )
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {showAddCategoryRuleModal && (
                <div
                  className="modal-backdrop"
                  role="presentation"
                  onMouseDown={(e) => {
                    if (e.target === e.currentTarget) setShowAddCategoryRuleModal(false)
                  }}
                >
                  <form
                    className="create-modal settings-cat-thr-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="new-cat-thr-title"
                    onSubmit={handleCreateCustomCategoryRule}
                  >
                    <div className="create-modal-heading">
                      <div>
                        <div className="eyebrow">
                          <span className="eyebrow-line" /> CONFIGURACIÓN · UMBRALES POR CATEGORÍA
                        </div>
                        <h2 id="new-cat-thr-title">Nueva Regla por Categoría de Producto</h2>
                      </div>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => setShowAddCategoryRuleModal(false)}
                        aria-label="Cerrar modal"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="form-grid-2">
                      <label className="form-field">
                        <span>Nombre de la categoría *</span>
                        <input
                          type="text"
                          required
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="ej. Refacciones y Consumibles"
                        />
                      </label>
                      <label className="form-field">
                        <span>Umbral crítico inicial (uds.) *</span>
                        <input
                          type="number"
                          min={0}
                          required
                          value={newCategoryMinStock}
                          onChange={(e) =>
                            setNewCategoryMinStock(Math.max(0, parseInt(e.target.value, 10) || 0))
                          }
                        />
                      </label>
                    </div>

                    <label className="form-field" style={{ marginTop: '12px' }}>
                      <span>Precedencia frente a ajuste por SKU</span>
                      <select
                        value={newCategoryMode}
                        onChange={(e) => setNewCategoryMode(e.target.value as CategoryThresholdMode)}
                      >
                        <option value="inherit_default">
                          Heredado (aplica si el SKU hereda categoría o al sincronizar)
                        </option>
                        <option value="override_sku">
                          Regla maestra (forzar este umbral sobre cualquier SKU de la categoría)
                        </option>
                      </select>
                    </label>

                    <label className="form-field" style={{ marginTop: '12px' }}>
                      <span>Notas o alcance operativo (opcional)</span>
                      <input
                        type="text"
                        value={newCategoryNotes}
                        onChange={(e) => setNewCategoryNotes(e.target.value)}
                        placeholder="ej. Cables, fuentes de poder y refacciones críticas"
                      />
                    </label>

                    <div className="create-modal-actions" style={{ marginTop: '18px' }}>
                      <button
                        type="button"
                        className="button button-ghost"
                        onClick={() => setShowAddCategoryRuleModal(false)}
                      >
                        Cancelar
                      </button>
                      <button type="submit" className="button button-primary">
                        <Check size={14} /> Crear categoría
                      </button>
                    </div>
                  </form>
                </div>
              )}
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
                  <div className="ext-integ-actions">
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => {
                        if (integViewTab !== 'all' && integViewTab !== 'commercial') {
                          setIntegViewTab('commercial')
                        }
                        window.setTimeout(() => {
                          document
                            .getElementById('integ-sec-commercial')
                            ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }, 40)
                      }}
                    >
                      <Store size={14} /> Marketplace
                      {availableMarketplaceApps.length > 0
                        ? ` (${availableMarketplaceApps.length} por instalar)`
                        : ''}
                    </button>
                    {canCreateInSection(
                      'Configuración',
                      'Integraciones',
                      activeSectionAccess,
                      isFullAdmin,
                      isAccountActive
                    ) && (
                      <button
                        type="button"
                        className="button button-primary"
                        onClick={handleOpenCreateExternalInteg}
                      >
                        <Plus size={14} /> Nueva integración API
                      </button>
                    )}
                  </div>
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

              {activeSetting === 'Integraciones' && (() => {
                const canCreateInteg = canCreateInSection(
                  'Configuración',
                  'Integraciones',
                  activeSectionAccess,
                  isFullAdmin,
                  isAccountActive
                )
                const canEditInteg = canEditInSection(
                  'Configuración',
                  'Integraciones',
                  activeSectionAccess,
                  isFullAdmin,
                  isAccountActive
                )
                const canDeleteInteg = canDeleteInSection(
                  'Configuración',
                  'Integraciones',
                  activeSectionAccess,
                  isFullAdmin,
                  isAccountActive
                )
                const canSaveInlineConfig =
                  cfgTargetId === '__new__' ? canCreateInteg : canEditInteg
                const selectedCfgRoleObj = roleDefinitions.find((r) => r.id === cfgRoleId)
                const isCfgAdminLocked =
                  cfgRoleMode === 'existing' && isGeneralAdminRole(selectedCfgRoleObj)
                const sharedUsersCount =
                  cfgRoleMode === 'existing'
                    ? users.filter((u) => getWorkspaceUserRoleIds(u).includes(cfgRoleId)).length
                    : 0
                const sharedOtherIntegsCount =
                  cfgRoleMode === 'existing'
                    ? externalIntegrations.filter(
                        (ext) => ext.roleId === cfgRoleId && ext.id !== cfgTargetId
                      ).length
                    : 0

                const resolvedAnalyzerInteg =
                  customExternalIntegrations.find((r) => r.id === analyzerIntegrationId) ||
                  customExternalIntegrations[0] ||
                  null
                const analyzerRole = resolvedAnalyzerInteg
                  ? roleDefinitions.find((r) => r.id === resolvedAnalyzerInteg.roleId)
                  : undefined
                const analyzerRoleTitle = resolvedAnalyzerInteg
                  ? analyzerRole
                    ? getRoleCardTitle(analyzerRole)
                    : resolvedAnalyzerInteg.roleId
                  : ''
                const analyzerPerms = getRoleSectionPermissions(analyzerRole)
                const analyzerAvailableSections =
                  SYSTEM_MODULE_SECTIONS[simModule as keyof typeof SYSTEM_MODULE_SECTIONS] || []
                const analyzerSectionLevel: SectionAccessLevel =
                  analyzerPerms[simModule]?.[simSection] || 'none'
                const analyzerLevelMeta =
                  SECTION_ACCESS_LEVELS.find((l) => l.id === analyzerSectionLevel) ||
                  SECTION_ACCESS_LEVELS[0]
                const analyzerAllowedByRole =
                  Boolean(resolvedAnalyzerInteg) &&
                  resolvedAnalyzerInteg?.status === 'active' &&
                  levelAllowsHttpMethod(analyzerSectionLevel, simMethod)

                const renderNativeIntegrationCard = (integ: IntegrationConfig) => {
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
                }

                const renderExternalIntegrationCard = (rec: ExternalIntegrationRecord) => {
                  const isKeyRevealed = revealedKeyId === rec.id
                  const maskedKey = `${rec.apiKeyPrefix}••••••••••••••••••••${rec.apiKeySecret.slice(-4)}`
                  const linkedRole = roleDefinitions.find((r) => r.id === rec.roleId)
                  const linkedRoleTitle = linkedRole ? getRoleCardTitle(linkedRole) : rec.roleId
                  const rolePerms = getRoleSectionPermissions(linkedRole)
                  const enabledSections = getEnabledSectionEntries(rolePerms)
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
                            <span className="ext-role-link-pill">
                              <ShieldCheck size={11} /> Rol: {linkedRoleTitle}
                            </span>
                            <span className="ext-no-seat-pill">0 espacios de usuario</span>
                            <span
                              className={`integ-status-pill ${
                                rec.environment === 'sandbox' ? 'status-sandbox' : ''
                              }`}
                            >
                              {rec.environment === 'production' ? 'Producción' : 'Sandbox'}
                            </span>
                            <span className={`integ-status-pill ${statusClass}`}>{statusLabel}</span>
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
                          {canEditInteg && (
                            <>
                              <button
                                type="button"
                                className="button button-ghost button-sm"
                                onClick={() => {
                                  handleSelectCfgTarget(rec.id)
                                  if (integViewTab !== 'all' && integViewTab !== 'custom') {
                                    setIntegViewTab('custom')
                                  }
                                  window.setTimeout(() => {
                                    document
                                      .getElementById('ext-integ-configurator')
                                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                  }, 40)
                                }}
                              >
                                Configurar permisos
                              </button>
                              <button
                                type="button"
                                className="button button-ghost button-sm"
                                onClick={() => handleOpenEditExternalInteg(rec)}
                              >
                                Editar rol / config
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
                            </>
                          )}
                          {canDeleteInteg && rec.origin !== 'commercial' && (
                            <button
                              type="button"
                              className="icon-danger-btn"
                              onClick={() => handleDeleteExternalIntegration(rec)}
                              title="Eliminar registro de integración"
                              aria-label={`Eliminar ${rec.name}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
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
                            onClick={() => setRevealedKeyId(isKeyRevealed ? null : rec.id)}
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
                          {canEditInteg && (
                            <button
                              type="button"
                              className="button button-ghost button-sm"
                              onClick={() => handleRotateExternalKey(rec)}
                            >
                              <RefreshCw size={13} /> Rotar llave
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="ext-integ-perms-grid">
                        {enabledSections.slice(0, 8).map((entry) => (
                          <div
                            key={`${entry.moduleName}:${entry.sectionName}`}
                            className="ext-perm-module-chip"
                          >
                            <span className="ext-perm-module-name">
                              {entry.moduleName} › {entry.sectionName}
                            </span>
                            <div className="ext-perm-verbs">
                              <span className={`ext-level-badge level-${entry.level}`}>
                                {getLevelLabel(entry.level)}
                              </span>
                            </div>
                          </div>
                        ))}
                        {enabledSections.length > 8 && (
                          <div className="ext-perm-module-chip ext-perm-more-chip">
                            <span className="ext-perm-module-name">
                              +{enabledSections.length - 8} secciones adicionales heredadas del rol
                            </span>
                          </div>
                        )}
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
                }

                return (
                <>
                  {/* NAVEGACIÓN DE BLOQUES EN INTEGRACIONES */}
                  <div className="integ-section-nav" role="tablist" aria-label="Secciones de integraciones">
                    {(
                      [
                        { id: 'all' as const, label: 'Vista completa (3 secciones)' },
                        {
                          id: 'commercial' as const,
                          label: `1. Integraciones comerciales (${commercialIntegrations.length})`,
                        },
                        {
                          id: 'custom' as const,
                          label: `2. Integraciones personalizadas (${customExternalIntegrations.length + customNativeWebhooks.length})`,
                        },
                        {
                          id: 'analyzer' as const,
                          label: `3. Analizador y logs (${allIntegrationLogs.length})`,
                        },
                      ]
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={integViewTab === tab.id}
                        className={`integ-section-nav-btn ${integViewTab === tab.id ? 'active' : ''}`}
                        onClick={() => setIntegViewTab(tab.id)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* SECCIÓN 1: MARKETPLACE DE INTEGRACIONES COMERCIALES */}
                  {(integViewTab === 'all' || integViewTab === 'commercial') && (() => {
                    const readyCredsCount = commercialIntegrations.filter(
                      (c) =>
                        Boolean(c.endpointUrl.trim()) &&
                        Boolean(c.apiKey.trim()) &&
                        Boolean(c.apiSecret.trim())
                    ).length
                    const pendingCredsCount = commercialIntegrations.length - readyCredsCount

                    return (
                      <section className="integ-major-section" aria-labelledby="integ-sec-commercial">
                        <div className="mkt-header-band">
                          <div className="mkt-header-copy">
                            <span className="integ-section-kicker">01. Marketplace de conectores comerciales</span>
                            <h3 id="integ-sec-commercial">Marketplace de Integraciones</h3>
                            <p>
                              Conecta plataformas comerciales externas para que AES Nexus consulte automáticamente pedidos, inventario, documentos fiscales ({countryProfile.fiscalDoc.documentShort}) y conciliaciones. Instala cada conector, configura sus credenciales y define su intervalo de sincronización.
                            </p>
                          </div>

                          <div className="mkt-summary-metrics">
                            <div className="mkt-summary-stat">
                              <span>Catálogo</span>
                              <strong className="tabular-nums">
                                {COMMERCIAL_MARKETPLACE_CATALOG.length} apps
                              </strong>
                            </div>
                            <div className="mkt-summary-stat">
                              <span>Instaladas</span>
                              <strong className="tabular-nums">
                                {commercialIntegrations.length}
                              </strong>
                            </div>
                            <div className="mkt-summary-stat">
                              <span>Listas para sincronizar</span>
                              <strong className="tabular-nums is-success">{readyCredsCount}</strong>
                            </div>
                            <div className="mkt-summary-stat">
                              <span>Credenciales pendientes</span>
                              <strong
                                className={`tabular-nums ${
                                  pendingCredsCount > 0 ? 'is-warning' : ''
                                }`}
                              >
                                {pendingCredsCount}
                              </strong>
                            </div>
                          </div>
                        </div>

                        <div className="mkt-controls-bar">
                          <label className="audit-search-wrap mkt-search-field">
                            <Search size={13} />
                            <input
                              type="search"
                              value={marketplaceSearch}
                              onChange={(e) => setMarketplaceSearch(e.target.value)}
                              placeholder="Buscar Shopify, WooCommerce, Mercado Libre, Finkok PAC, STP..."
                              aria-label="Buscar integraciones en el Marketplace"
                            />
                          </label>

                          <div className="mkt-filter-groups">
                            <div
                              className="audit-filter-tabs"
                              role="tablist"
                              aria-label="Categorías del Marketplace"
                            >
                              {(
                                [
                                  { id: 'all' as const, label: 'Todas' },
                                  { id: 'Ecommerce' as const, label: 'Ecommerce' },
                                  { id: 'PAC Fiscal' as const, label: 'PAC Fiscal' },
                                  { id: 'Banca & Pagos' as const, label: 'Banca & Pagos' },
                                  { id: 'Productividad' as const, label: 'Productividad' },
                                ]
                              ).map((cat) => (
                                <button
                                  key={cat.id}
                                  type="button"
                                  role="tab"
                                  aria-selected={marketplaceCategory === cat.id}
                                  className={`audit-filter-btn ${
                                    marketplaceCategory === cat.id ? 'active' : ''
                                  }`}
                                  onClick={() => setMarketplaceCategory(cat.id)}
                                >
                                  {cat.label}
                                </button>
                              ))}
                            </div>

                            <div
                              className="audit-filter-tabs"
                              role="tablist"
                              aria-label="Estado de instalación"
                            >
                              {(
                                [
                                  { id: 'all' as const, label: 'Todos' },
                                  {
                                    id: 'installed' as const,
                                    label: `Instaladas (${commercialIntegrations.length})`,
                                  },
                                  {
                                    id: 'available' as const,
                                    label: `Disponibles (${availableMarketplaceApps.length})`,
                                  },
                                ]
                              ).map((st) => (
                                <button
                                  key={st.id}
                                  type="button"
                                  role="tab"
                                  aria-selected={marketplaceStatusFilter === st.id}
                                  className={`audit-filter-btn ${
                                    marketplaceStatusFilter === st.id ? 'active' : ''
                                  }`}
                                  onClick={() => setMarketplaceStatusFilter(st.id)}
                                >
                                  {st.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {filteredMarketplaceApps.length === 0 ? (
                          <div className="audit-empty-state">
                            <strong>No hay integraciones que coincidan con este filtro</strong>
                            <p>
                              Limpia la búsqueda o cambia la categoría para ver todo el catálogo de Shopify, WooCommerce, PACs y Banca.
                            </p>
                          </div>
                        ) : (
                          <div className="mkt-showcase-grid">
                            {filteredMarketplaceApps.map((app) => {
                              const installedRec = commercialIntegrations.find(
                                (c) => c.marketplaceId === app.id
                              )
                              const isInstalling = Boolean(installingMarketplaceIds[app.id])
                              const currentInterval: CommercialSyncInterval = installedRec
                                ? installedRec.syncInterval
                                : marketplaceIntervalDrafts[app.id] || app.defaultSyncInterval
                              const credentialsConfigured = Boolean(
                                installedRec &&
                                  installedRec.endpointUrl.trim() &&
                                  installedRec.apiKey.trim() &&
                                  installedRec.apiSecret.trim()
                              )
                              const stateKind = isInstalling
                                ? 'installing'
                                : !installedRec
                                ? 'available'
                                : !credentialsConfigured
                                ? 'pending'
                                : !installedRec.enabled
                                ? 'paused'
                                : 'connected'
                              const stateLabel =
                                stateKind === 'installing'
                                  ? 'Instalando...'
                                  : stateKind === 'available'
                                  ? 'Disponible'
                                  : stateKind === 'pending'
                                  ? 'Por configurar'
                                  : stateKind === 'paused'
                                  ? 'Pausada'
                                  : 'Conectada'

                              return (
                                <article
                                  key={app.id}
                                  className={`mkt-card ${installedRec ? 'is-installed' : ''} ${
                                    stateKind === 'pending' ? 'is-pending' : ''
                                  }`}
                                >
                                  <div className="mkt-card-top">
                                    <div className="mkt-brand-block">
                                      <div
                                        className="mkt-brand-emblem"
                                        style={{
                                          backgroundColor: app.brandBg,
                                          color: app.brandColor,
                                        }}
                                        aria-hidden="true"
                                      >
                                        {app.brandCode}
                                      </div>
                                      <div className="mkt-brand-titles">
                                        <h4 title={app.name}>{app.name}</h4>
                                        <div className="mkt-meta-line" title={`${app.category} · ${app.vendor}`}>
                                          <span>{app.category}</span>
                                          <span aria-hidden="true">&middot;</span>
                                          <span className="mkt-meta-vendor">{app.vendor}</span>
                                        </div>
                                      </div>
                                    </div>

                                    <span className={`mkt-state-text state-${stateKind}`}>
                                      {stateKind === 'installing' && (
                                        <Loader2 size={12} className="mkt-spin" />
                                      )}
                                      {stateKind === 'connected' && <CheckCircle2 size={12} />}
                                      {stateKind === 'pending' && <AlertTriangle size={12} />}
                                      {stateKind === 'paused' && <Pause size={12} />}
                                      {stateLabel}
                                    </span>
                                  </div>

                                  <p className="mkt-card-desc" title={app.description}>
                                    {app.description}
                                  </p>

                                  <div className="mkt-card-specs">
                                    <div className="mkt-spec-row">
                                      <span>Sincroniza</span>
                                      <strong title={app.dataSyncedLabel}>{app.dataSyncedLabel}</strong>
                                    </div>
                                    <div className="mkt-spec-row">
                                      <span>Autenticación</span>
                                      <strong title={app.authMethodLabel}>{app.authMethodLabel}</strong>
                                    </div>
                                    <div className="mkt-spec-row">
                                      <span>Última consulta</span>
                                      <strong className="tabular-nums">
                                        {!installedRec
                                          ? 'Sin instalar'
                                          : !credentialsConfigured
                                          ? 'Pendiente de configurar'
                                          : installedRec.lastSyncAtIso
                                          ? `${formatDate(new Date(installedRec.lastSyncAtIso))} · ${formatTime(new Date(installedRec.lastSyncAtIso))}`
                                          : 'Lista para sincronizar'}
                                      </strong>
                                    </div>
                                  </div>

                                  <div className="mkt-interval-box">
                                    <label htmlFor={`mkt-interval-${app.id}`}>
                                      <Clock size={12} /> Intervalo de sincronización
                                    </label>
                                    <select
                                      id={`mkt-interval-${app.id}`}
                                      value={currentInterval}
                                      disabled={isInstalling || Boolean(installedRec && !canEditInteg)}
                                      onChange={(e) => {
                                        const nextInt = e.target.value as CommercialSyncInterval
                                        if (installedRec) {
                                          handleChangeCommercialSyncInterval(installedRec, nextInt)
                                        } else {
                                          setMarketplaceIntervalDrafts((prev) => ({
                                            ...prev,
                                            [app.id]: nextInt,
                                          }))
                                        }
                                      }}
                                    >
                                      {COMMERCIAL_SYNC_INTERVALS.map((opt) => (
                                        <option key={opt.id} value={opt.id}>
                                          {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div
                                    className={`mkt-card-actions ${
                                      installedRec && credentialsConfigured ? 'is-configured-actions' : ''
                                    }`}
                                  >
                                    {!installedRec ? (
                                      <button
                                        type="button"
                                        className="button button-primary button-sm mkt-btn-grow"
                                        disabled={!canCreateInteg || isInstalling}
                                        onClick={() => handleInstallMarketplaceApp(app)}
                                      >
                                        {isInstalling ? (
                                          <>
                                            <Loader2 size={13} className="mkt-spin" /> Instalando dependencias...
                                          </>
                                        ) : (
                                          <>
                                            <Plus size={13} /> Instalar
                                          </>
                                        )}
                                      </button>
                                    ) : !credentialsConfigured ? (
                                      <button
                                        type="button"
                                        className="button button-primary button-sm mkt-btn-grow"
                                        disabled={!canEditInteg}
                                        onClick={() => setEditingCommercialId(installedRec.id)}
                                      >
                                        <KeyRound size={13} /> Configurar
                                      </button>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          className="button button-primary button-sm mkt-btn-compact"
                                          onClick={() => setEditingCommercialId(installedRec.id)}
                                        >
                                          <KeyRound size={12} /> Credenciales
                                        </button>
                                        <button
                                          type="button"
                                          className="button button-secondary button-sm mkt-btn-compact"
                                          onClick={() => handleRunCommercialSync(installedRec)}
                                        >
                                          <RefreshCw size={12} /> Sincronizar
                                        </button>
                                        {canEditInteg && (
                                          <button
                                            type="button"
                                            className="button button-ghost button-sm mkt-btn-compact"
                                            onClick={() =>
                                              handleToggleCommercialStatus(installedRec)
                                            }
                                            title={
                                              installedRec.enabled
                                                ? 'Pausar sincronización'
                                                : 'Reanudar sincronización'
                                            }
                                          >
                                            {installedRec.enabled ? (
                                              <>
                                                <Pause size={12} /> Pausa
                                              </>
                                            ) : (
                                              <>
                                                <Play size={12} /> Reanudar
                                              </>
                                            )}
                                          </button>
                                        )}
                                        {canDeleteInteg && (
                                          <button
                                            type="button"
                                            className="button button-ghost button-sm mkt-btn-compact mkt-btn-danger"
                                            onClick={() =>
                                              handleUninstallCommercialInteg(installedRec)
                                            }
                                            title="Desinstalar integración"
                                          >
                                            <Trash2 size={12} /> Borrar
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </article>
                              )
                            })}
                          </div>
                        )}
                      </section>
                    )
                  })()}

                  {/* SECCIÓN 2: INTEGRACIONES PERSONALIZADAS (CREADAS POR EL ADMIN) */}
                  {(integViewTab === 'all' || integViewTab === 'custom') && (
                    <section className="integ-major-section" aria-labelledby="integ-sec-custom">
                      <div className="integ-major-section-head">
                        <div>
                          <span className="integ-section-kicker">02 · Creadas por el administrador</span>
                          <h3 id="integ-sec-custom">Integraciones personalizadas</h3>
                          <p>
                            Integraciones API, conectores a medida y webhooks creados por el administrador del sistema, asociados directamente a un rol sin gastar licencias de usuario.
                          </p>
                        </div>
                        <div className="ext-integ-kpis">
                          <div className="ext-integ-kpi-box">
                            <span>Espacios usuario</span>
                            <strong>0 usados</strong>
                          </div>
                          <div className="ext-integ-kpi-box">
                            <span>Activas</span>
                            <strong>
                              {customExternalIntegrations.filter((r) => r.status === 'active').length}{' '}
                              / {customExternalIntegrations.length}
                            </strong>
                          </div>
                          <div className="ext-integ-kpi-box">
                            <span>Peticiones</span>
                            <strong className="tabular-nums">
                              {customExternalIntegrations
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

                      <div className="settings-section-card">
                        <div className="card-header-row" style={{ flexWrap: 'wrap', gap: '10px' }}>
                          <div>
                            <div className="plan-title-row">
                              <h3>Integraciones API Personalizadas</h3>
                              <span className="org-tax-badge">REST API v1 · Vinculada a Rol</span>
                            </div>
                            <p>
                              Sistemas internos, BI, ERP legacy o middleware registrados por el administrador del sistema.
                            </p>
                          </div>
                          {canCreateInteg && (
                            <button
                              type="button"
                              className="button button-secondary button-sm"
                              onClick={handleOpenCreateExternalInteg}
                            >
                              <Plus size={13} /> Nueva integración API
                            </button>
                          )}
                        </div>

                        <div className="audit-toolbar">
                          <label className="audit-search-wrap">
                            <Search size={13} />
                            <input
                              type="search"
                              value={extSearch}
                              onChange={(e) => setExtSearch(e.target.value)}
                              placeholder="Buscar por nombre, categoría o prefijo de llave..."
                              aria-label="Buscar integraciones personalizadas"
                            />
                          </label>
                          <div className="audit-filter-tabs" role="tablist" aria-label="Filtrar estado de integraciones personalizadas">
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

                        {filteredCustomIntegrations.length === 0 ? (
                          <div className="audit-empty-state">
                            <strong>Sin integraciones personalizadas que coincidan</strong>
                            <p>
                              Crea una integración nueva desde el configurador inferior o el botón «+ Nueva integración API».
                            </p>
                          </div>
                        ) : (
                          <div className="ext-integ-list">
                            {filteredCustomIntegrations.map(renderExternalIntegrationCard)}
                          </div>
                        )}
                      </div>

                      {customNativeWebhooks.length > 0 && (
                        <div className="settings-section-card">
                          <div className="card-header-row">
                            <div>
                              <h3>Webhooks de Eventos Salientes</h3>
                              <p>
                                Endpoints personalizados configurados por el administrador para recibir notificaciones en tiempo real.
                              </p>
                            </div>
                          </div>
                          <div className="integrations-grid">
                            {customNativeWebhooks.map(renderNativeIntegrationCard)}
                          </div>
                        </div>
                      )}

                      {/* CONFIGURADOR GLOBAL DE INTEGRACIÓN PERSONALIZADA, ROL Y PERMISOS */}
                      <form
                        id="ext-integ-configurator"
                        className="settings-section-card ext-configurator-card"
                        onSubmit={handleSaveInlineIntegrationConfig}
                      >
                        <div className="card-header-row" style={{ flexWrap: 'wrap', gap: '12px' }}>
                          <div>
                            <div className="plan-title-row">
                              <h3>Configurador de Integración, Rol y Permisos por Sección</h3>
                              <span className="org-tax-badge">Configuración Global · 0 asientos</span>
                            </div>
                            <p>
                              Define el nombre de la integración, vincula un rol operativo (o crea uno dedicado) y ajusta los permisos granulares (Ver, Crear, Editar, Completo) para cada sección de cada módulo.
                            </p>
                          </div>
                          <div className="ext-config-selector-wrap">
                            <label htmlFor="cfg-integ-target">Integración a configurar</label>
                            <select
                              id="cfg-integ-target"
                              value={cfgTargetId}
                              onChange={(e) => handleSelectCfgTarget(e.target.value)}
                            >
                              {customExternalIntegrations.map((rec) => (
                                <option key={rec.id} value={rec.id}>
                                  {rec.name} ({rec.systemType})
                                </option>
                              ))}
                              {canCreateInteg && (
                                <option value="__new__">+ Registrar nueva integración</option>
                              )}
                            </select>
                          </div>
                        </div>

                        <div className="ext-config-top-grid">
                          <div className="form-field">
                            <label htmlFor="cfg-integ-name">Nombre de la integración *</label>
                            <input
                              id="cfg-integ-name"
                              type="text"
                              placeholder="Ej. Sincronizador ERP Contable / WMS"
                              value={cfgName}
                              disabled={!canSaveInlineConfig}
                              onChange={(e) => setCfgName(e.target.value)}
                              required
                            />
                          </div>

                          <div className="form-field">
                            <label htmlFor="cfg-integ-type">Categoría del sistema</label>
                            <select
                              id="cfg-integ-type"
                              value={cfgSystemType}
                              disabled={!canSaveInlineConfig}
                              onChange={(e) =>
                                setCfgSystemType(e.target.value as ExternalSystemType)
                              }
                            >
                              <option value="Ecommerce">Ecommerce / Tienda en Línea</option>
                              <option value="BI / Analítica">BI / Analítica / Data Warehouse</option>
                              <option value="Contabilidad Externa">{countryProfile.fiscalDoc.externalAccountingLabel}</option>
                              <option value="WMS / Logística">WMS / Logística / 3PL</option>
                              <option value="Webhook / Middleware">Middleware / iPaaS / Zapier</option>
                              <option value="ERP / Legacy">ERP / Sistema Legacy</option>
                              <option value="Otro">Otro sistema</option>
                            </select>
                          </div>

                          <div className="form-field">
                            <div className="ext-cfg-role-label-row">
                              <label htmlFor="cfg-integ-role">Rol asociado *</label>
                              <div className="ext-role-mode-tabs" role="tablist" aria-label="Modo de rol">
                                <button
                                  type="button"
                                  role="tab"
                                  aria-selected={cfgRoleMode === 'existing'}
                                  disabled={!canSaveInlineConfig}
                                  className={cfgRoleMode === 'existing' ? 'active' : ''}
                                  onClick={() => handleSelectCfgRole(cfgRoleId)}
                                >
                                  Rol existente
                                </button>
                                <button
                                  type="button"
                                  role="tab"
                                  aria-selected={cfgRoleMode === 'newRole'}
                                  disabled={!canSaveInlineConfig}
                                  className={cfgRoleMode === 'newRole' ? 'active' : ''}
                                  onClick={() => {
                                    setCfgRoleMode('newRole')
                                    if (!cfgNewRoleName.trim()) {
                                      setCfgNewRoleName(
                                        cfgName.trim() ? `Rol · ${cfgName.trim()}` : ''
                                      )
                                    }
                                  }}
                                >
                                  + Crear rol nuevo
                                </button>
                              </div>
                            </div>
                            {cfgRoleMode === 'existing' ? (
                              <select
                                id="cfg-integ-role"
                                value={cfgRoleId}
                                disabled={!canSaveInlineConfig}
                                onChange={(e) => handleSelectCfgRole(e.target.value)}
                              >
                                {roleDefinitions.map((r) => {
                                  const count = getEnabledSectionEntries(
                                    getRoleSectionPermissions(r)
                                  ).length
                                  return (
                                    <option key={r.id} value={r.id}>
                                      {getRoleCardTitle(r)}
                                      {r.forApiIntegration ? ' · API' : ''} ({count} secciones)
                                    </option>
                                  )
                                })}
                              </select>
                            ) : (
                              <input
                                id="cfg-integ-role"
                                type="text"
                                placeholder="Nombre del nuevo rol (ej. API Portal Clientes)"
                                value={cfgNewRoleName}
                                disabled={!canSaveInlineConfig}
                                onChange={(e) => setCfgNewRoleName(e.target.value)}
                                required
                              />
                            )}
                          </div>
                        </div>

                        {cfgRoleMode === 'existing' &&
                          !isCfgAdminLocked &&
                          (sharedUsersCount > 0 || sharedOtherIntegsCount > 0) && (
                            <div className="ext-shared-role-note" role="status">
                              <ShieldCheck size={14} />
                              <span>
                                Los cambios en la matriz actualizarán globalmente al rol{' '}
                                <strong>
                                  {selectedCfgRoleObj ? getRoleCardTitle(selectedCfgRoleObj) : cfgRoleId}
                                </strong>{' '}
                                (aplicado actualmente a {sharedUsersCount} usuario(s) y{' '}
                                {sharedOtherIntegsCount} integración(es) adicional(es)). Si deseas
                                aislar sus permisos, cambia a <strong>+ Crear rol nuevo</strong>.
                              </span>
                            </div>
                          )}

                        <div className="ext-config-matrix-wrap">
                          <div className="ext-config-matrix-head">
                            <strong>
                              Permisos granulares por módulo y sección (Sin acceso · Ver · Crear · Editar · Completo)
                            </strong>
                            <span>
                              Al guardar se actualizan simultáneamente la integración y los permisos del rol en la configuración global.
                            </span>
                          </div>
                          {renderRoleSectionMatrix(cfgPerms, setCfgPerms, {
                            readOnly: !canSaveInlineConfig || isCfgAdminLocked,
                            readOnlyNotice: isCfgAdminLocked
                              ? 'El rol Administrador General mantiene acceso Completo protegido. Selecciona otro rol o cambia a "+ Crear rol nuevo" para personalizar permisos granulares.'
                              : !canSaveInlineConfig
                              ? 'Tu sesión actual solo tiene permiso de lectura en Configuración › Integraciones.'
                              : undefined,
                            filterValue: cfgMatrixFilter,
                            onFilterChange: setCfgMatrixFilter,
                          })}
                        </div>

                        <div className="ext-config-footer">
                          <button
                            type="button"
                            className="button button-ghost button-sm"
                            onClick={() => handleSelectCfgTarget(cfgTargetId)}
                          >
                            <RotateCcw size={13} /> Restablecer cambios
                          </button>
                          {canSaveInlineConfig && (
                            <button type="submit" className="button button-primary">
                              <Check size={14} />{' '}
                              {cfgTargetId === '__new__'
                                ? 'Crear integración y guardar en configuración global'
                                : 'Guardar en configuración global'}
                            </button>
                          )}
                        </div>
                      </form>
                    </section>
                  )}

                  {/* SECCIÓN 3: ANALIZADOR Y LOGS DE LAS INTEGRACIONES */}
                  {(integViewTab === 'all' || integViewTab === 'analyzer') && (
                    <section className="integ-major-section" aria-labelledby="integ-sec-analyzer">
                      <div className="integ-major-section-head">
                        <div>
                          <span className="integ-section-kicker">03 · Diagnóstico y trazabilidad</span>
                          <h3 id="integ-sec-analyzer">Analizador y logs de las integraciones</h3>
                          <p>
                            Valida en tiempo real los permisos por endpoint según el rol vinculado, ejecuta llamadas de prueba y revisa el historial de respuestas para depuración.
                          </p>
                        </div>
                      </div>

                      {/* ANALIZADOR INTERACTIVO DE ENDPOINTS Y SALUD */}
                      <div className="settings-section-card integ-analyzer-card">
                        <div className="card-header-row" style={{ flexWrap: 'wrap', gap: '10px' }}>
                          <div>
                            <div className="plan-title-row">
                              <h3>Analizador de Endpoints y Permisos en Vivo</h3>
                              <span className="org-tax-badge">Diagnóstico API</span>
                            </div>
                            <p>
                              Selecciona una integración y un endpoint para comprobar si su rol permite la operación antes o después de ejecutar la petición.
                            </p>
                          </div>
                        </div>

                        <div className="integ-analyzer-kpis">
                          <div className="integ-analyzer-kpi">
                            <span>Llamadas registradas</span>
                            <strong className="tabular-nums">{integrationLogMetrics.total}</strong>
                          </div>
                          <div className="integ-analyzer-kpi">
                            <span>Exitosas (2xx)</span>
                            <strong className="tabular-nums is-success">
                              {integrationLogMetrics.successCount}
                            </strong>
                          </div>
                          <div className="integ-analyzer-kpi">
                            <span>Errores (4xx / 5xx)</span>
                            <strong className="tabular-nums is-error">
                              {integrationLogMetrics.errorCount}
                            </strong>
                          </div>
                          <div className="integ-analyzer-kpi">
                            <span>Tasa de éxito</span>
                            <strong className="tabular-nums">
                              {integrationLogMetrics.successRate}%
                            </strong>
                          </div>
                          <div className="integ-analyzer-kpi">
                            <span>Latencia promedio</span>
                            <strong className="tabular-nums">
                              {integrationLogMetrics.avgLatencyMs} ms
                            </strong>
                          </div>
                        </div>

                        {resolvedAnalyzerInteg && (
                          <>
                            <div className="api-sim-controls api-sim-controls-4">
                              <div className="form-field">
                                <label htmlFor="analyzer-integ-select">Integración</label>
                                <select
                                  id="analyzer-integ-select"
                                  value={resolvedAnalyzerInteg.id}
                                  onChange={(e) => {
                                    setAnalyzerIntegrationId(e.target.value)
                                    setSimResult(null)
                                  }}
                                >
                                  {customExternalIntegrations.map((rec) => (
                                    <option key={rec.id} value={rec.id}>
                                      {rec.name} · Rol {rec.roleId}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="form-field">
                                <label htmlFor="analyzer-method-select">Método / Acción</label>
                                <select
                                  id="analyzer-method-select"
                                  value={simMethod}
                                  onChange={(e) => {
                                    const nextMethod = e.target.value as 'GET' | 'POST' | 'PUT' | 'DELETE'
                                    setSimMethod(nextMethod)
                                    setSimPayload(
                                      getSamplePayloadForSection(simModule, simSection, nextMethod)
                                    )
                                    setSimResult(null)
                                  }}
                                >
                                  <option value="GET">GET (Consultar · Ver)</option>
                                  <option value="POST">POST (Insertar · Crear)</option>
                                  <option value="PUT">PUT (Actualizar · Editar)</option>
                                  <option value="DELETE">DELETE (Borrar · Completo)</option>
                                </select>
                              </div>
                              <div className="form-field">
                                <label htmlFor="analyzer-module-select">Módulo</label>
                                <select
                                  id="analyzer-module-select"
                                  value={simModule}
                                  onChange={(e) => {
                                    const nextMod = e.target.value
                                    const firstSec =
                                      SYSTEM_MODULE_SECTIONS[
                                        nextMod as keyof typeof SYSTEM_MODULE_SECTIONS
                                      ]?.[0] || ''
                                    setSimModule(nextMod)
                                    setSimSection(firstSec)
                                    setSimPayload(
                                      getSamplePayloadForSection(nextMod, firstSec, simMethod)
                                    )
                                    setSimResult(null)
                                  }}
                                >
                                  {Object.keys(SYSTEM_MODULE_SECTIONS).map((mod) => (
                                    <option key={mod} value={mod}>
                                      {mod}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="form-field">
                                <label htmlFor="analyzer-section-select">Sección</label>
                                <select
                                  id="analyzer-section-select"
                                  value={simSection}
                                  onChange={(e) => {
                                    const nextSec = e.target.value
                                    setSimSection(nextSec)
                                    setSimPayload(
                                      getSamplePayloadForSection(simModule, nextSec, simMethod)
                                    )
                                    setSimResult(null)
                                  }}
                                >
                                  {analyzerAvailableSections.map((sec) => (
                                    <option key={sec} value={sec}>
                                      {sec}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="api-sim-endpoint-preview">
                              <Code2 size={14} />
                              <code>
                                {simMethod} https://api.aesnexus.mx
                                {getSectionApiEndpoint(simModule, simSection)}
                              </code>
                              <span className={`ext-level-badge level-${analyzerSectionLevel}`}>
                                Rol {analyzerRoleTitle}: {analyzerLevelMeta.label}
                              </span>
                              <span
                                className={`integ-log-status-badge ${
                                  analyzerAllowedByRole ? 'is-success' : 'is-error'
                                }`}
                              >
                                {analyzerAllowedByRole
                                  ? 'Autorizado'
                                  : resolvedAnalyzerInteg.status !== 'active'
                                  ? `Estado: ${resolvedAnalyzerInteg.status}`
                                  : 'Sin permiso suficiente'}
                              </span>
                              <button
                                type="button"
                                className="button button-primary button-sm"
                                style={{ marginLeft: 'auto' }}
                                onClick={() => handleRunCrudSimulation(resolvedAnalyzerInteg.id)}
                              >
                                <Play size={13} /> Ejecutar y registrar log
                              </button>
                            </div>

                            {simMethod !== 'GET' && (
                              <div className="form-field">
                                <label htmlFor="analyzer-payload-textarea">
                                  Payload JSON de prueba
                                </label>
                                <textarea
                                  id="analyzer-payload-textarea"
                                  className="api-sim-textarea"
                                  rows={3}
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
                          </>
                        )}
                      </div>

                      {/* LOGS DE INTEGRACIÓN PARA DEPURACIÓN API */}
                      <div className="settings-section-card integ-logs-card">
                        <div className="card-header-row" style={{ flexWrap: 'wrap', gap: '10px' }}>
                          <div>
                            <div className="plan-title-row">
                              <h3>Logs de Integración</h3>
                              <span className="org-tax-badge tabular-nums">
                                {filteredIntegrationLogs.length}{' '}
                                {filteredIntegrationLogs.length === 1 ? 'llamada' : 'llamadas'}
                              </span>
                            </div>
                            <p>
                              Últimas llamadas API realizadas por sistemas externos con fecha, tipo de acción, endpoint, estado (éxito/error) y payload de respuesta JSON.
                            </p>
                          </div>
                          <div className="ext-integ-actions">
                            {canEditInteg && allIntegrationLogs.length > 0 && (
                              <button
                                type="button"
                                className="button button-ghost button-sm"
                                onClick={handleClearIntegrationLogs}
                              >
                                <Trash2 size={13} /> Limpiar logs
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="integ-logs-toolbar">
                          <label className="audit-search-wrap">
                            <Search size={13} />
                            <input
                              type="search"
                              value={integLogSearch}
                              onChange={(e) => setIntegLogSearch(e.target.value)}
                              placeholder="Buscar por endpoint, integración, error o campo del payload..."
                              aria-label="Filtrar logs de integración"
                            />
                          </label>

                          <select
                            className="integ-logs-filter-select"
                            aria-label="Filtrar por integración"
                            value={integLogIntegrationFilter}
                            onChange={(e) => setIntegLogIntegrationFilter(e.target.value)}
                          >
                            <option value="all">Todas las integraciones</option>
                            {commercialIntegrations.length > 0 && (
                              <optgroup label="Integraciones comerciales (Salientes)">
                                {commercialIntegrations.map((rec) => (
                                  <option key={rec.id} value={rec.id}>
                                    {rec.name}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            {customExternalIntegrations.length > 0 && (
                              <optgroup label="Integraciones personalizadas (Entrantes)">
                                {customExternalIntegrations.map((rec) => (
                                  <option key={rec.id} value={rec.id}>
                                    {rec.name}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </select>

                          <select
                            className="integ-logs-filter-select"
                            aria-label="Filtrar por tipo de acción"
                            value={integLogMethodFilter}
                            onChange={(e) =>
                              setIntegLogMethodFilter(
                                e.target.value as 'all' | 'GET' | 'POST' | 'PUT' | 'DELETE'
                              )
                            }
                          >
                            <option value="all">Todas las acciones</option>
                            <option value="GET">GET · Consulta</option>
                            <option value="POST">POST · Creación</option>
                            <option value="PUT">PUT · Edición</option>
                            <option value="DELETE">DELETE · Eliminación</option>
                          </select>

                          <select
                            className="integ-logs-filter-select"
                            aria-label="Filtrar por estado de respuesta"
                            value={integLogStatusFilter}
                            onChange={(e) =>
                              setIntegLogStatusFilter(e.target.value as 'all' | 'success' | 'error')
                            }
                          >
                            <option value="all">Todos los estados</option>
                            <option value="success">Solo Éxito (2xx)</option>
                            <option value="error">Solo Error (4xx / 5xx)</option>
                          </select>
                        </div>

                        {filteredIntegrationLogs.length === 0 ? (
                          <div className="audit-empty-state">
                            <strong>Sin llamadas API registradas con estos filtros</strong>
                            <p>
                              Ejecuta una consulta en Integraciones comerciales o una llamada en el Analizador superior para revisar el historial completo.
                            </p>
                          </div>
                        ) : (
                          <div className="integ-logs-list">
                            {filteredIntegrationLogs.map((log, index) => {
                              const isError = log.statusCode >= 400
                              const actionTypeLabel =
                                log.method === 'GET'
                                  ? 'Consulta'
                                  : log.method === 'POST'
                                  ? 'Creación'
                                  : log.method === 'PUT'
                                  ? 'Edición'
                                  : 'Eliminación'
                              const isExpanded =
                                expandedIntegLogIds[log.id] !== undefined
                                  ? expandedIntegLogIds[log.id]
                                  : index === 0
                              const compactPayload = log.responsePayload
                                .replace(/\s+/g, ' ')
                                .trim()
                              return (
                                <article
                                  key={log.id}
                                  className={`integ-log-entry ${isError ? 'is-error' : 'is-success'}`}
                                >
                                  <div className="integ-log-entry-grid">
                                    <div className="integ-log-col integ-log-col-date">
                                      <span className="integ-log-col-label">Fecha</span>
                                      <strong className="tabular-nums">
                                        {formatDate(new Date(log.timestampIso))} ·{' '}
                                        {formatTime(new Date(log.timestampIso))}
                                      </strong>
                                      <div className="integ-log-source">
                                        <span>{log.integrationName}</span>
                                        <span
                                          className={`integ-direction-pill ${
                                            log.sourceKind === 'commercial'
                                              ? 'is-outbound'
                                              : 'is-inbound'
                                          }`}
                                        >
                                          {log.sourceKind === 'commercial' ? 'Saliente' : 'Entrante'}
                                        </span>
                                        <span
                                          className={`integ-status-pill ${
                                            log.integrationEnv === 'sandbox' ? 'status-sandbox' : ''
                                          }`}
                                        >
                                          {log.integrationEnv === 'production'
                                            ? 'Producción'
                                            : 'Sandbox'}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="integ-log-col integ-log-col-action">
                                      <span className="integ-log-col-label">Tipo de acción</span>
                                      <div className="integ-log-action-row">
                                        <span
                                          className={`integ-method-badge method-${log.method.toLowerCase()}`}
                                        >
                                          {log.method}
                                        </span>
                                        <strong>{actionTypeLabel}</strong>
                                      </div>
                                      {log.moduleName && (
                                        <span className="integ-log-submeta">
                                          {log.moduleName}
                                          {log.sectionName ? ` › ${log.sectionName}` : ''}
                                        </span>
                                      )}
                                    </div>

                                    <div className="integ-log-col integ-log-col-endpoint">
                                      <span className="integ-log-col-label">Endpoint</span>
                                      <code className="mono integ-log-endpoint-code">
                                        {log.endpoint}
                                      </code>
                                      <span className="integ-log-submeta">{log.summary}</span>
                                    </div>

                                    <div className="integ-log-col integ-log-col-status">
                                      <span className="integ-log-col-label">Estado</span>
                                      <span
                                        className={`integ-log-status-badge ${
                                          isError ? 'is-error' : 'is-success'
                                        }`}
                                      >
                                        {isError ? (
                                          <AlertTriangle size={11} />
                                        ) : (
                                          <CheckCircle2 size={11} />
                                        )}
                                        {isError ? 'Error' : 'Éxito'} · HTTP {log.statusCode}
                                      </span>
                                      <span className="integ-log-submeta tabular-nums">
                                        Latencia: {log.latencyMs} ms
                                      </span>
                                    </div>
                                  </div>

                                  <div className="integ-log-payload-bar">
                                    <div className="integ-log-payload-preview">
                                      <span className="integ-log-col-label">Payload de respuesta:</span>
                                      <code className="mono">{compactPayload}</code>
                                    </div>
                                    <div className="integ-log-payload-actions">
                                      <button
                                        type="button"
                                        className="button button-ghost button-sm"
                                        onClick={() =>
                                          setExpandedIntegLogIds((prev) => ({
                                            ...prev,
                                            [log.id]: !isExpanded,
                                          }))
                                        }
                                        aria-expanded={isExpanded}
                                      >
                                        {isExpanded ? (
                                          <ChevronDown size={13} />
                                        ) : (
                                          <ChevronRight size={13} />
                                        )}
                                        {isExpanded ? 'Ocultar JSON' : 'Ver payload'}
                                      </button>
                                      <button
                                        type="button"
                                        className="button button-ghost button-sm"
                                        onClick={() => {
                                          if (navigator.clipboard?.writeText) {
                                            navigator.clipboard
                                              .writeText(log.responsePayload)
                                              .catch(() => {})
                                          }
                                          toast.success(
                                            'Payload JSON copiado al portapapeles.',
                                            'Logs de Integración'
                                          )
                                        }}
                                      >
                                        <Copy size={12} /> Copiar JSON
                                      </button>
                                    </div>
                                  </div>

                                  {isExpanded && (
                                    <pre className="integ-log-payload-pre">{log.responsePayload}</pre>
                                  )}
                                </article>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </section>
                  )}
                </>
                )
              })()}

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
                                {item.userId ? ` (${item.userId})` : ''}
                                {item.crudOperation ? ` · ${item.crudOperation}` : ''}
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
                                })}{' '}
                                · {externalIntegrations.length} integraciones API (0 asientos)
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
                                  ? `Emisiones ${countryProfile.fiscalDoc.documentShort} del periodo`
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
                          <p>Receptor {countryProfile.fiscalDoc.documentName} vinculado automáticamente con tu perfil de Organización.</p>
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
                          <span>{countryProfile.taxId.label}</span>
                          <strong className="mono">{org.rfc}</strong>
                        </div>
                        <div className="plan-fiscal-row">
                          <span>Régimen Fiscal</span>
                          <strong>{org.taxRegime}</strong>
                        </div>
                        <div className="plan-fiscal-row">
                          <span>Domicilio Fiscal</span>
                          <strong>
                            {org.fiscalStreet}, {countryProfile.territory.postalShortLabel} {org.fiscalZip}, {org.fiscalCity}
                          </strong>
                        </div>
                        <div className="plan-fiscal-row">
                          <span>{countryProfile.fiscalDoc.usageLabel} predeterminado</span>
                          <strong>{countryProfile.fiscalDoc.defaultUsageCode}</strong>
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
                                        title={`Descargar comprobante ${countryProfile.fiscalDoc.documentShort}`}
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

      {/* MODAL: CREAR NUEVO ROL CON PERMISOS JERÁRQUICOS POR SECCIÓN */}
      {showCreateRoleModal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowCreateRoleModal(false)
          }}
        >
          <section
            className="create-modal role-hierarchy-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-role-modal-title"
          >
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">{t('settings.roles.createModal.kicker')}</div>
                <h2 id="create-role-modal-title">{t('settings.roles.createModal.title')}</h2>
                <p>
                  Configura el nivel de acceso jerárquico para cada sección de cada módulo. Este rol puede asignarse a usuarios o vincularse directamente a integraciones API sin gastar licencias de usuario.
                </p>
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
              <div className="form-grid-2">
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
              </div>

              <div className="form-field">
                <label htmlFor="create-role-api-usage">
                  ¿Se usará este rol para una integración API?
                </label>
                <select
                  id="create-role-api-usage"
                  value={newRoleForApiIntegration ? 'api' : 'standard'}
                  onChange={(e) => setNewRoleForApiIntegration(e.target.value === 'api')}
                >
                  <option value="standard">No — Rol operativo para usuarios del sistema</option>
                  <option value="api">
                    Sí — Rol dedicado para integración API (sin licencia de usuario)
                  </option>
                </select>
                <span className="role-api-field-hint">
                  {newRoleForApiIntegration
                    ? 'Se marcará como Rol API para vincularlo directamente a conectores o webhooks sin gastar asientos de usuario.'
                    : 'Podrás asignarlo a miembros del equipo o vincularlo después en Integraciones.'}
                </span>
              </div>

              <div className="role-matrix-field-block">
                <span className="settings-field-label">
                  Matriz de acceso por módulo y sección
                </span>
                {renderRoleSectionMatrix(newRoleSectionDraft, setNewRoleSectionDraft)}
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

      {/* MODAL: VISUALIZAR / EDITAR PERMISOS DE ROL POR SECCIÓN */}
      {editingRole && (() => {
        const canEditRoleModal = canEditInSection(
          'Configuración',
          'Roles y permisos',
          activeSectionAccess,
          isFullAdmin,
          isAccountActive
        )
        const isRoleModalReadOnly = isGeneralAdminRole(editingRole) || !canEditRoleModal
        const readOnlyReason = isGeneralAdminRole(editingRole)
          ? t('settings.roles.protectedAdminEditToast')
          : 'Modo solo lectura: tu cuenta no tiene permisos de edición en Roles y permisos.'
        return (
          <div
            className="modal-backdrop"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setEditingRole(null)
            }}
          >
            <section
              className="create-modal role-hierarchy-modal"
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
                  <p>
                    {isRoleModalReadOnly
                      ? 'Visualización de solo lectura de los niveles de acceso asignados en cada sección de los módulos del sistema.'
                      : 'Define el nivel de acceso en cada sección (Ver, Crear, Editar o Completo). Cualquier usuario o integración API vinculada a este rol heredará estos cambios de inmediato.'}
                  </p>
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
                {!editingRole.builtInKey && (
                  <>
                    <div className="form-grid-2" style={{ marginBottom: '12px' }}>
                      <div className="form-field">
                        <label htmlFor="edit-role-name">{t('settings.roles.createModal.nameLabel')}</label>
                        <input
                          id="edit-role-name"
                          type="text"
                          value={editRoleName}
                          onChange={(e) => setEditRoleName(e.target.value)}
                          disabled={isRoleModalReadOnly}
                          required
                        />
                      </div>
                      <div className="form-field">
                        <label htmlFor="edit-role-desc">{t('settings.roles.createModal.descLabel')}</label>
                        <input
                          id="edit-role-desc"
                          type="text"
                          value={editRoleDesc}
                          onChange={(e) => setEditRoleDesc(e.target.value)}
                          disabled={isRoleModalReadOnly}
                        />
                      </div>
                    </div>
                    <div className="form-field" style={{ marginBottom: '12px' }}>
                      <label htmlFor="edit-role-api-usage">
                        ¿Se usará este rol para una integración API?
                      </label>
                      <select
                        id="edit-role-api-usage"
                        value={editRoleForApiIntegration ? 'api' : 'standard'}
                        onChange={(e) => setEditRoleForApiIntegration(e.target.value === 'api')}
                        disabled={isRoleModalReadOnly}
                      >
                        <option value="standard">No — Rol operativo para usuarios del sistema</option>
                        <option value="api">
                          Sí — Rol dedicado para integración API (sin licencia de usuario)
                        </option>
                      </select>
                    </div>
                  </>
                )}

                {renderRoleSectionMatrix(roleSectionDraft, setRoleSectionDraft, {
                  readOnly: isRoleModalReadOnly,
                  readOnlyNotice: isRoleModalReadOnly ? readOnlyReason : undefined,
                })}

                <div className="create-modal-actions" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    {!isRoleModalReadOnly &&
                      Object.prototype.hasOwnProperty.call(DEFAULT_ROLE_SECTION_PERMISSIONS, editingRole.id) && (
                        <button
                          type="button"
                          className="button button-ghost button-sm"
                          onClick={() => {
                            const defaultPerms =
                              DEFAULT_ROLE_SECTION_PERMISSIONS[editingRole.id as BuiltInRoleKey]
                            setRoleSectionDraft(cloneSectionPermissions(defaultPerms))
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
                      {isRoleModalReadOnly ? 'Cerrar' : t('common.cancel')}
                    </button>
                    {!isRoleModalReadOnly && (
                      <button type="submit" className="button button-primary">
                        <Check size={14} /> {t('settings.roles.modal.saveBtn')}
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </section>
          </div>
        )
      })()}

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
                <p>Configura la tarjeta corporativa o cuenta {countryProfile.bank.networkName} para cargos de renovación.</p>
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
                    <option value="SPEI">{countryProfile.bank.defaultTransferMethod}</option>
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
                    value={paymentDraft.paymentBrand === 'SPEI' ? `Cuenta ${countryProfile.bank.networkName}` : paymentDraft.paymentExpiry}
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
                <label htmlFor="plan-pay-email">{countryProfile.fiscalDoc.billingEmailLabel}</label>
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
                <div className="panel-kicker">{countryProfile.fiscalDoc.documentKicker}</div>
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
                  <span>{countryProfile.taxId.label} Receptor</span>
                  <strong className="mono">{org.rfc}</strong>
                </div>
                <div className="plan-fiscal-row">
                  <span>{countryProfile.fiscalDoc.uuidLabel}</span>
                  <strong className="mono" style={{ fontSize: '9.5px' }}>{selectedBillingInvoice.cfdiUuid}</strong>
                </div>
                <div className="plan-fiscal-row">
                  <span>Fecha de Emisión</span>
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
                  <span>{countryProfile.vat.label} ({countryProfile.vat.standardRatePct}%)</span>
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
                  Configura las credenciales de acceso y vincula un rol operativo para heredar sus permisos por sección (Ver, Crear, Editar o Completo) sin gastar espacios de usuario.
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
                    <option value="Contabilidad Externa">{countryProfile.fiscalDoc.externalAccountingLabel}</option>
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

              <div className="ext-role-binding-box">
                <div className="ext-role-binding-head">
                  <div>
                    <strong>Rol asociado y permisos granulares por módulo y sección</strong>
                    <p>
                      Selecciona un rol existente o crea uno dedicado y ajusta sus niveles (Ver, Crear, Editar, Completo). Los cambios se guardan en la configuración global de roles e integraciones sin consumir asientos de usuario.
                    </p>
                  </div>
                  <div className="ext-role-mode-tabs" role="tablist" aria-label="Modo de rol en modal">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={extRoleMode === 'existing'}
                      className={extRoleMode === 'existing' ? 'active' : ''}
                      onClick={() => handleSelectModalRole(extDraft.roleId)}
                    >
                      Rol existente
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={extRoleMode === 'newRole'}
                      className={extRoleMode === 'newRole' ? 'active' : ''}
                      onClick={() => {
                        setExtRoleMode('newRole')
                        if (!extNewRoleName.trim()) {
                          setExtNewRoleName(
                            extDraft.name.trim() ? `Rol · ${extDraft.name.trim()}` : ''
                          )
                        }
                      }}
                    >
                      + Crear rol dedicado
                    </button>
                  </div>
                </div>

                {extRoleMode === 'existing' ? (
                  <div className="form-field">
                    <label htmlFor="ext-integ-role">Seleccionar rol operativo *</label>
                    <select
                      id="ext-integ-role"
                      value={extDraft.roleId}
                      onChange={(e) => handleSelectModalRole(e.target.value)}
                      required
                    >
                      {roleDefinitions.map((r) => {
                        const count = getEnabledSectionEntries(getRoleSectionPermissions(r)).length
                        return (
                          <option key={r.id} value={r.id}>
                            {getRoleCardTitle(r)}
                            {r.forApiIntegration ? ' · API' : ''} ({count} secciones habilitadas)
                          </option>
                        )
                      })}
                    </select>
                  </div>
                ) : (
                  <div className="form-field">
                    <label htmlFor="ext-integ-new-role-name">Nombre del nuevo rol dedicado *</label>
                    <input
                      id="ext-integ-new-role-name"
                      type="text"
                      placeholder="Ej. Rol · Conector WMS Externo"
                      value={extNewRoleName}
                      onChange={(e) => setExtNewRoleName(e.target.value)}
                      required
                    />
                  </div>
                )}

                {(() => {
                  const chosenRole = roleDefinitions.find((r) => r.id === extDraft.roleId)
                  const isModalAdminLocked =
                    extRoleMode === 'existing' && isGeneralAdminRole(chosenRole)
                  return renderRoleSectionMatrix(extRolePermsDraft, setExtRolePermsDraft, {
                    readOnly: isModalAdminLocked,
                    readOnlyNotice: isModalAdminLocked
                      ? 'El rol Administrador General mantiene acceso Completo en todas las secciones. Cambia a otro rol o elige "+ Crear rol dedicado" para personalizar permisos.'
                      : undefined,
                  })
                })()}
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
                  {extEditingId
                    ? 'Guardar en configuración global'
                    : 'Crear registro y guardar globalmente'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* MODAL: SIMULADOR DE PETICIONES CRUD POR MÓDULO Y SECCIÓN DEL ROL */}
      {activeSimulatorIntegration && (() => {
        const simLinkedRole = roleDefinitions.find((r) => r.id === activeSimulatorIntegration.roleId)
        const simLinkedRoleTitle = simLinkedRole
          ? getRoleCardTitle(simLinkedRole)
          : activeSimulatorIntegration.roleId
        const simRolePerms = getRoleSectionPermissions(simLinkedRole)
        const simCurrentLevel: SectionAccessLevel =
          simRolePerms[simModule]?.[simSection] || 'none'
        const simLevelMeta =
          SECTION_ACCESS_LEVELS.find((l) => l.id === simCurrentLevel) || SECTION_ACCESS_LEVELS[0]
        const availableSections =
          SYSTEM_MODULE_SECTIONS[simModule as keyof typeof SYSTEM_MODULE_SECTIONS] || []

        return (
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
                    CONSOLA API · {activeSimulatorIntegration.name.toUpperCase()} · ROL: {simLinkedRoleTitle.toUpperCase()}
                  </div>
                  <h2 id="sim-integ-modal-title">Simulador CRUD según Rol Vinculado</h2>
                  <p>
                    Prueba en vivo qué peticiones permite o bloquea el nivel jerárquico del rol ({simLevelMeta.label}) en cada sección de AES Nexus.
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

              <div className="api-sim-controls api-sim-controls-4">
                <div className="form-field">
                  <label htmlFor="sim-method-select">Operación HTTP</label>
                  <select
                    id="sim-method-select"
                    value={simMethod}
                    onChange={(e) => {
                      const nextMethod = e.target.value as 'GET' | 'POST' | 'PUT' | 'DELETE'
                      setSimMethod(nextMethod)
                      setSimPayload(getSamplePayloadForSection(simModule, simSection, nextMethod))
                      setSimResult(null)
                    }}
                  >
                    <option value="GET">GET · Ver</option>
                    <option value="POST">POST · Crear</option>
                    <option value="PUT">PUT · Editar</option>
                    <option value="DELETE">DELETE · Completo</option>
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="sim-module-select">Módulo</label>
                  <select
                    id="sim-module-select"
                    value={simModule}
                    onChange={(e) => {
                      const nextMod = e.target.value
                      const firstSec =
                        SYSTEM_MODULE_SECTIONS[nextMod as keyof typeof SYSTEM_MODULE_SECTIONS]?.[0] ||
                        ''
                      setSimModule(nextMod)
                      setSimSection(firstSec)
                      setSimPayload(getSamplePayloadForSection(nextMod, firstSec, simMethod))
                      setSimResult(null)
                    }}
                  >
                    {Object.keys(SYSTEM_MODULE_SECTIONS).map((mod) => (
                      <option key={mod} value={mod}>
                        {mod}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="sim-section-select">Sección</label>
                  <select
                    id="sim-section-select"
                    value={simSection}
                    onChange={(e) => {
                      const nextSec = e.target.value
                      setSimSection(nextSec)
                      setSimPayload(getSamplePayloadForSection(simModule, nextSec, simMethod))
                      setSimResult(null)
                    }}
                  >
                    {availableSections.map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
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
                    <Play size={14} /> Ejecutar
                  </button>
                </div>
              </div>

              <div className="api-sim-endpoint-preview">
                <Code2 size={14} />
                <code>
                  {simMethod} https://api.aesnexus.mx{getSectionApiEndpoint(simModule, simSection)}
                </code>
                <span className={`ext-level-badge level-${simCurrentLevel}`}>
                  Rol {simLinkedRoleTitle}: {simLevelMeta.label}
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
        )
      })()}
      {/* MODAL: CONFIGURAR CREDENCIALES E INTERVALO DE SINCRONIZACIÓN (MARKETPLACE) */}
      {activeCommercialEditorRecord && (() => {
        const draft = getCommercialDraft(activeCommercialEditorRecord)
        const catalogApp = COMMERCIAL_MARKETPLACE_CATALOG.find(
          (a) => a.id === activeCommercialEditorRecord.marketplaceId
        )
        const isSecretRevealed = Boolean(revealedCommSecretIds[activeCommercialEditorRecord.id])
        const canEditInteg = canEditInSection(
          'Configuración',
          'Integraciones',
          activeSectionAccess,
          isFullAdmin,
          isAccountActive
        )

        return (
          <div
            className="modal-backdrop"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setEditingCommercialId(null)
            }}
          >
            <section
              className="create-modal comm-cred-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="comm-cred-modal-title"
            >
              <div className="create-modal-heading">
                <div className="mkt-modal-title-group">
                  {catalogApp && (
                    <div
                      className="mkt-brand-emblem"
                      style={{
                        backgroundColor: catalogApp.brandBg,
                        color: catalogApp.brandColor,
                      }}
                      aria-hidden="true"
                    >
                      {catalogApp.brandCode}
                    </div>
                  )}
                  <div className="mkt-modal-title-copy">
                    <div className="panel-kicker">
                      {activeCommercialEditorRecord.category} · {activeCommercialEditorRecord.vendor}
                    </div>
                    <h2 id="comm-cred-modal-title">
                      Configurar {activeCommercialEditorRecord.name}
                    </h2>
                    <p>
                      Ingresa las credenciales de acceso y define cada cuánto tiempo AES Nexus consultará la información de este sistema.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setEditingCommercialId(null)}
                  aria-label={t('settings.modal.closeAria')}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="comm-modal-meta-strip">
                <div className="comm-modal-meta-item">
                  <span>Autenticación</span>
                  <strong title={catalogApp?.authMethodLabel || 'Credenciales API'}>
                    {catalogApp?.authMethodLabel || 'Credenciales API'}
                  </strong>
                </div>
                <div className="comm-modal-meta-item">
                  <span>Información a consultar</span>
                  <strong title={activeCommercialEditorRecord.dataSyncedLabel}>
                    {activeCommercialEditorRecord.dataSyncedLabel}
                  </strong>
                </div>
              </div>

              <form
                className="comm-cred-form"
                onSubmit={(e) => handleSaveCommercialConfig(activeCommercialEditorRecord, e)}
              >
                <div className="comm-toggle-card">
                  <div className="comm-toggle-copy">
                    <strong>Sincronización automática activa</strong>
                    <p>Permite que AES Nexus consulte este proveedor según el intervalo configurado.</p>
                  </div>
                  <label className="toggle-switch-wrap">
                    <input
                      type="checkbox"
                      checked={draft.enabled}
                      disabled={!canEditInteg}
                      onChange={(e) =>
                        updateCommercialDraft(activeCommercialEditorRecord, {
                          enabled: e.target.checked,
                        })
                      }
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="form-field">
                  <label htmlFor="comm-modal-endpoint">{draft.endpointLabel} *</label>
                  <input
                    id="comm-modal-endpoint"
                    type="text"
                    value={draft.endpointUrl}
                    disabled={!canEditInteg}
                    placeholder={catalogApp?.endpointPlaceholder || 'https://...'}
                    onChange={(e) =>
                      updateCommercialDraft(activeCommercialEditorRecord, {
                        endpointUrl: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label htmlFor="comm-modal-apikey">{draft.apiKeyLabel} *</label>
                    <input
                      id="comm-modal-apikey"
                      type="text"
                      value={draft.apiKey}
                      disabled={!canEditInteg}
                      placeholder={catalogApp?.apiKeyPlaceholder || 'API Key / Usuario'}
                      onChange={(e) =>
                        updateCommercialDraft(activeCommercialEditorRecord, {
                          apiKey: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="comm-modal-secret">{draft.apiSecretLabel} *</label>
                    <div className="comm-secret-input-wrap">
                      <input
                        id="comm-modal-secret"
                        type={isSecretRevealed ? 'text' : 'password'}
                        value={draft.apiSecret}
                        disabled={!canEditInteg}
                        placeholder={catalogApp?.apiSecretPlaceholder || 'Token / Secret'}
                        onChange={(e) =>
                          updateCommercialDraft(activeCommercialEditorRecord, {
                            apiSecret: e.target.value,
                          })
                        }
                        required
                      />
                      <button
                        type="button"
                        className="comm-secret-eye-btn"
                        onClick={() =>
                          setRevealedCommSecretIds((prev) => ({
                            ...prev,
                            [activeCommercialEditorRecord.id]: !isSecretRevealed,
                          }))
                        }
                        title={isSecretRevealed ? 'Ocultar secreto' : 'Mostrar secreto'}
                        aria-label={isSecretRevealed ? 'Ocultar secreto' : 'Mostrar secreto'}
                      >
                        {isSecretRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label htmlFor="comm-modal-interval">Intervalo de sincronización</label>
                    <select
                      id="comm-modal-interval"
                      value={draft.syncInterval}
                      disabled={!canEditInteg}
                      onChange={(e) =>
                        updateCommercialDraft(activeCommercialEditorRecord, {
                          syncInterval: e.target.value as CommercialSyncInterval,
                        })
                      }
                    >
                      {COMMERCIAL_SYNC_INTERVALS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label htmlFor="comm-modal-env">Entorno</label>
                    <select
                      id="comm-modal-env"
                      value={draft.environment}
                      disabled={!canEditInteg}
                      onChange={(e) =>
                        updateCommercialDraft(activeCommercialEditorRecord, {
                          environment: e.target.value as 'production' | 'sandbox',
                        })
                      }
                    >
                      <option value="production">Producción</option>
                      <option value="sandbox">Sandbox / Pruebas</option>
                    </select>
                  </div>
                </div>

                <div className="create-modal-actions mkt-modal-actions">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => handleRunCommercialSync(activeCommercialEditorRecord)}
                  >
                    <RefreshCw size={13} /> Probar conexión
                  </button>
                  <div className="mkt-modal-actions-right">
                    <button
                      type="button"
                      className="button button-ghost"
                      onClick={() => setEditingCommercialId(null)}
                    >
                      Cancelar
                    </button>
                    {canEditInteg && (
                      <button type="submit" className="button button-primary">
                        <Check size={14} /> Guardar credenciales
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </section>
          </div>
        )
      })()}
    </section>
  )
}
