import { useState, useMemo, useEffect } from 'react'
import {
  CalendarDays,
  ChevronDown,
  Plus,
  ArrowUpRight,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Package,
  Truck,
  CreditCard,
  Landmark,
  Scale,
  Sparkles,
  CheckCircle2,
  Clock3,
  Users,
  FileText,
  FileSpreadsheet,
  ShieldAlert,
  Percent,
  UserPlus,
  Trophy,
  Mail,
  Send,
  Trash2,
  X,
  Check,
  Sliders,
  RefreshCw,
  Bell,
  BellRing,
  SlidersHorizontal,
  Volume2,
  Smartphone,
  Search,
  Minus,
  Info,
  LockKeyhole,
  Warehouse as WarehouseIcon,
  WalletCards,
  Receipt,
  ClipboardList,
  ShoppingCart,
  Layers,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { Skeleton } from 'boneyard-js/react'
import {
  executiveKpiBones,
  executiveChartBones,
  executiveAlertHubBones,
} from '../bones/registry'
import type { SalesOrder, Quote } from '../data/sales'
import type {
  InventoryItemLocation,
  PurchaseOrder,
  ShipmentDelivery,
} from '../data/operations'
import type { PurchaseRequisition } from '../data/purchases'
import type {
  InvoiceReceivable,
  BillPayable,
  ExpenseRecord,
  BankAccount,
  ChartAccount,
} from '../data/finance'
import type { Opportunity } from '../data/dashboard'
import {
  resolveEffectiveStockThreshold,
  type CategoryStockThresholdRule,
  type EffectiveThresholdSource,
  type RoleCapabilityId,
} from '../data/settings'
import { canAccessModule, canAccessSection } from '../data/accessControl'
import { RevenueTargetChart } from './RevenueTargetChart'
import { useToast } from './Toast'
import { useI18n } from '../i18n/I18nContext'

type PurchasesKpiPeriod = 'Mensual' | 'Trimestral' | 'Anual'

const SPANISH_MONTH_INDEX: Record<string, number> = {
  ene: 0, enero: 0,
  feb: 1, febrero: 1,
  mar: 2, marzo: 2,
  abr: 3, abril: 3,
  may: 4, mayo: 4,
  jun: 5, junio: 5,
  jul: 6, julio: 6,
  ago: 7, agosto: 7,
  sep: 8, sept: 8, septiembre: 8,
  oct: 9, octubre: 9,
  nov: 10, noviembre: 10,
  dic: 11, diciembre: 11,
}

const isDateInPurchasesPeriod = (
  rawDate: string,
  targetPeriod: PurchasesKpiPeriod,
  reference: Date
): boolean => {
  const refMonth = reference.getMonth()
  const refQuarter = Math.floor(refMonth / 3)
  const refYear = reference.getFullYear()
  const trimmed = rawDate.trim().toLowerCase()

  let parsedMonth = -1
  let parsedYear = -1

  const spanishMatch = trimmed.match(/^(\d{1,2})\s+([a-záéíóú]+)\.?\s+(\d{4})$/i)
  if (spanishMatch) {
    parsedMonth = SPANISH_MONTH_INDEX[spanishMatch[2]] ?? -1
    parsedYear = Number(spanishMatch[3])
  } else {
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (isoMatch) {
      parsedYear = Number(isoMatch[1])
      parsedMonth = Number(isoMatch[2]) - 1
    } else {
      const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
      if (slashMatch) {
        parsedYear = Number(slashMatch[3])
        parsedMonth = Number(slashMatch[2]) - 1
      }
    }
  }

  if (parsedYear !== refYear || parsedMonth < 0) return false
  if (targetPeriod === 'Mensual') return parsedMonth === refMonth
  if (targetPeriod === 'Trimestral') return Math.floor(parsedMonth / 3) === refQuarter
  return true
}

interface ExecutiveDashboardProps {
  orders: SalesOrder[]
  quotes: Quote[]
  inventory: InventoryItemLocation[]
  categoryThresholds?: CategoryStockThresholdRule[]
  productCategoryMap?: Map<string, string>
  onOpenCategoryThresholds?: () => void
  purchaseOrders?: PurchaseOrder[]
  requisitions?: PurchaseRequisition[]
  shipments?: ShipmentDelivery[]
  onUpdateInventory?: (items: InventoryItemLocation[]) => void
  isStockConfigOpen?: boolean
  onCloseStockConfig?: () => void
  initialStockConfigTab?: 'thresholds' | 'push' | 'email'
  receivables: InvoiceReceivable[]
  payables: BillPayable[]
  expenses: ExpenseRecord[]
  bankAccounts: BankAccount[]
  chartAccounts: ChartAccount[]
  opportunities: Opportunity[]
  activities: Array<{
    title: string
    company: string
    time: string
    icon: string
    tone: string
  }>
  activeUserName?: string
  activeUserRolesSummary?: string
  isFullAdmin?: boolean
  capabilities?: Set<RoleCapabilityId>
  isAccountActive?: boolean
  onNavigateSales: (section: 'Catálogo' | 'Cotizaciones' | 'Pedidos' | 'Resumen') => void
  onNavigatePurchases?: (
    section: 'Resumen' | 'Requisiciones' | 'Órdenes de compra' | 'Recepciones' | 'Facturas'
  ) => void
  onNavigateOperations: (section: 'Inventario' | 'Compras' | 'Entregas' | 'Resumen') => void
  onNavigateFinance: (
    section: 'Cobros' | 'Pagos' | 'Cuentas contables' | 'Resumen'
  ) => void
  onNavigateExpenses?: (
    section?: 'Resumen y control' | 'Registro y pólizas' | 'Presupuestos y alertas' | 'Gastos recurrentes'
  ) => void
  onNavigateCrm: (section?: string) => void
  onOpenCreateOpportunity: () => void
}

const EMPTY_CAPABILITIES = new Set<RoleCapabilityId>()

export function ExecutiveDashboard({
  orders,
  quotes: _quotes,
  inventory,
  categoryThresholds = [],
  productCategoryMap,
  onOpenCategoryThresholds,
  purchaseOrders = [],
  requisitions = [],
  shipments = [],
  onUpdateInventory,
  isStockConfigOpen,
  onCloseStockConfig,
  initialStockConfigTab,
  receivables,
  payables,
  expenses,
  bankAccounts,
  chartAccounts: _chartAccounts,
  opportunities,
  activities,
  activeUserName = 'Andrea Morales',
  activeUserRolesSummary = 'Administrador General',
  isFullAdmin = true,
  capabilities = EMPTY_CAPABILITIES,
  isAccountActive = true,
  onNavigateSales,
  onNavigatePurchases,
  onNavigateOperations,
  onNavigateFinance,
  onNavigateExpenses,
  onNavigateCrm,
  onOpenCreateOpportunity,
}: ExecutiveDashboardProps) {
  const toast = useToast()
  const { locale, regional, t, formatCurrency } = useI18n()
  const money = (val: number) => formatCurrency(val, undefined, 0)
  const [period, setPeriod] = useState<'Este mes' | 'Este trimestre' | 'Año 2026'>('Este mes')
  const [purchasesPeriod, setPurchasesPeriod] = useState<PurchasesKpiPeriod>('Mensual')
  const [showAlertHub, setShowAlertHub] = useState(true)
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false)

  const handlePeriodChange = (nextPeriod: 'Este mes' | 'Este trimestre' | 'Año 2026') => {
    setIsLoadingDashboard(true)
    setPeriod(nextPeriod)
    setTimeout(() => {
      setIsLoadingDashboard(false)
    }, 450)
    toast.info(`Período de análisis actualizado a: ${nextPeriod}`, 'Filtro temporal')
  }

  const handleRefreshDashboard = () => {
    setIsLoadingDashboard(true)
    setTimeout(() => {
      setIsLoadingDashboard(false)
      toast.success('Métricas ejecutivas sincronizadas con el ERP en tiempo real.', 'Datos actualizados')
    }, 480)
  }

  // Audio chime player for notifications
  const playNotificationChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.connect(gain)
      gain.connect(ctx.destination)
      gain.gain.setValueAtTime(0.12, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
      osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1) // A5
      osc.start()
      osc.stop(ctx.currentTime + 0.35)
    } catch {
      // browser audio policy
    }
  }

  // Panel de Control Ejecutivo: Umbrales de Stock y Notificaciones (Push & Correo)
  const [internalShowModal, setInternalShowModal] = useState(false)
  const showStockConfigModal = isStockConfigOpen !== undefined ? isStockConfigOpen : internalShowModal
  const setShowStockConfigModal = (open: boolean) => {
    setInternalShowModal(open)
    if (!open && onCloseStockConfig) {
      onCloseStockConfig()
    }
  }

  const [stockConfigTab, setStockConfigTab] = useState<'thresholds' | 'push' | 'email'>(
    initialStockConfigTab || 'thresholds'
  )

  useEffect(() => {
    if (initialStockConfigTab) {
      setStockConfigTab(initialStockConfigTab)
    }
  }, [initialStockConfigTab])

  const [thresholdSearch, setThresholdSearch] = useState('')
  const [thresholdFilter, setThresholdFilter] = useState<'all' | 'critical' | 'safe'>('all')
  const [thresholdWarehouseFilter, setThresholdWarehouseFilter] = useState<string>('all')
  const [batchThresholdVal, setBatchThresholdVal] = useState<number>(5)

  // Configuración de Notificaciones Push
  const [pushConfig, setPushConfig] = useState<{
    enabled: boolean
    permission: 'granted' | 'denied' | 'default'
    notifyOnCritical: boolean
    sound: boolean
    vibrate: boolean
    highPriority: boolean
  }>(() => {
    try {
      const saved = localStorage.getItem('nexus_stock_push_alerts_config')
      if (saved) return JSON.parse(saved)
    } catch {
      // fallback
    }
    const hasNotif = typeof window !== 'undefined' && 'Notification' in window
    return {
      enabled: true,
      permission: hasNotif ? (Notification.permission as 'granted' | 'denied' | 'default') : 'default',
      notifyOnCritical: true,
      sound: true,
      vibrate: true,
      highPriority: true,
    }
  })

  // Sincronizar estado de notificaciones push si se modifica desde el centro de notificaciones superior
  useEffect(() => {
    const handlePushEvent = (e: Event) => {
      const custom = e as CustomEvent<{ enabled: boolean }>
      if (custom.detail && typeof custom.detail.enabled === 'boolean') {
        setPushConfig((prev) => ({ ...prev, enabled: custom.detail.enabled }))
      }
    }
    window.addEventListener('nexus_push_config_changed', handlePushEvent)
    return () => window.removeEventListener('nexus_push_config_changed', handlePushEvent)
  }, [])

  // Configuración de Alertas por Correo
  const [emailConfig, setEmailConfig] = useState<{
    enabled: boolean
    recipients: string[]
    frequency: 'immediate' | 'daily_morning' | 'daily_evening'
    alertTrigger: 'at_threshold' | 'below_zero'
    includePurchaseLink: boolean
    includeAttachment: boolean
    selectedWarehouse: string
  }>(() => {
    try {
      const saved = localStorage.getItem('nexus_stock_email_alerts_config')
      if (saved) return JSON.parse(saved)
    } catch {
      // fallback
    }
    return {
      enabled: true,
      recipients: ['andres.escala.344@gmail.com', 'compras@nexus.mx'],
      frequency: 'immediate',
      alertTrigger: 'at_threshold',
      includePurchaseLink: true,
      includeAttachment: false,
      selectedWarehouse: 'all',
    }
  })

  const [newEmailInput, setNewEmailInput] = useState('')
  const [newEmailError, setNewEmailError] = useState('')
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [lastTestSentAt, setLastTestSentAt] = useState<string | null>(null)
  const [showPreviewTemplate, setShowPreviewTemplate] = useState(false)

  const { effectiveInventory, thresholdMetaById } = useMemo(() => {
    const meta = new Map<
      string,
      { source: EffectiveThresholdSource; category: string; ruleMinStock?: number }
    >()
    const resolvedList = inventory.map((item) => {
      if (categoryThresholds.length === 0) {
        meta.set(item.id, {
          source: 'sku',
          category: item.category || productCategoryMap?.get(item.productId) || 'Hardware',
        })
        return item
      }
      const res = resolveEffectiveStockThreshold(item, categoryThresholds, productCategoryMap)
      meta.set(item.id, {
        source: res.source,
        category: res.category,
        ruleMinStock: res.categoryRule?.minStock,
      })
      if (res.effectiveMinStock === item.minStock && item.category === res.category) {
        return item
      }
      return {
        ...item,
        category: res.category,
        minStock: res.effectiveMinStock,
      }
    })
    return { effectiveInventory: resolvedList, thresholdMetaById: meta }
  }, [inventory, categoryThresholds, productCategoryMap])

  // Unique warehouses for filter in threshold table
  const uniqueWarehouses = useMemo(() => {
    const map = new Map<string, string>()
    effectiveInventory.forEach((i) => {
      if (!map.has(i.warehouseId)) map.set(i.warehouseId, i.warehouseName)
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [effectiveInventory])

  // Filtered items in threshold configuration table
  const filteredConfigItems = useMemo(() => {
    return effectiveInventory.filter((item) => {
      const q = thresholdSearch.toLowerCase().trim()
      const meta = thresholdMetaById.get(item.id)
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.warehouseName.toLowerCase().includes(q) ||
        (meta?.category || '').toLowerCase().includes(q)
      const matchWarehouse =
        thresholdWarehouseFilter === 'all' || item.warehouseId === thresholdWarehouseFilter
      const isCritical = item.stock <= item.minStock
      const matchStatus =
        thresholdFilter === 'all'
          ? true
          : thresholdFilter === 'critical'
          ? isCritical
          : !isCritical
      return matchSearch && matchWarehouse && matchStatus
    })
  }, [effectiveInventory, thresholdMetaById, thresholdSearch, thresholdWarehouseFilter, thresholdFilter])

  // Handlers for Stock Threshold updates
  const handleUpdateItemThreshold = (itemId: string, newMinStock: number) => {
    const safeMin = Math.max(0, newMinStock)
    const meta = thresholdMetaById.get(itemId)
    const updated = inventory.map((item) =>
      item.id === itemId
        ? { ...item, minStock: safeMin, thresholdSource: 'sku' as const }
        : item
    )
    if (onUpdateInventory) {
      onUpdateInventory(updated)
    }
    const item = updated.find((i) => i.id === itemId)
    if (item) {
      if (meta?.source === 'category_override') {
        toast.info(
          `El ajuste individual de ${item.sku} se guardó como ${safeMin} ${item.unitOfMeasure}, pero la categoría "${meta.category}" tiene una regla maestra forzada activa.`,
          'Regla maestra activa en categoría'
        )
      } else if (item.stock <= safeMin) {
        toast.warning(
          `Umbral para ${item.sku} (${item.name}) establecido en ${safeMin} ${item.unitOfMeasure}. Stock actual (${item.stock}) bajo umbral mínimo.`,
          'Umbral actualizado · Alerta activa'
        )
      } else {
        toast.success(
          `Umbral para ${item.sku} actualizado a ${safeMin} ${item.unitOfMeasure}. Existencias en nivel seguro.`,
          'Umbral actualizado'
        )
      }
    }
  }

  const handleStepItemThreshold = (itemId: string, delta: number) => {
    const item = effectiveInventory.find((i) => i.id === itemId) || inventory.find((i) => i.id === itemId)
    if (!item) return
    handleUpdateItemThreshold(itemId, item.minStock + delta)
  }

  const handleBatchSetThreshold = () => {
    const safeVal = Math.max(0, batchThresholdVal)
    const updated = inventory.map((item) => ({
      ...item,
      minStock: safeVal,
      thresholdSource: 'sku' as const,
    }))
    if (onUpdateInventory) {
      onUpdateInventory(updated)
    }
    toast.success(
      `Se aplicó un umbral mínimo de ${safeVal} unidades a todos los productos del inventario.`,
      'Umbral global aplicado'
    )
  }

  // Push handlers
  const handleRequestPushPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission()
        const next = {
          ...pushConfig,
          permission: perm as 'granted' | 'denied' | 'default',
          enabled: perm === 'granted',
        }
        setPushConfig(next)
        localStorage.setItem('nexus_stock_push_alerts_config', JSON.stringify(next))
        if (perm === 'granted') {
          toast.success(
            'Permiso de notificaciones push concedido. Recibirás alertas instantáneas cuando un producto caiga bajo el umbral mínimo.',
            'Notificaciones Push activadas'
          )
          if (pushConfig.sound) playNotificationChime()
        } else if (perm === 'denied') {
          toast.warning(
            'Permiso denegado por el navegador. Puedes habilitarlo en la configuración de permisos del sitio.',
            'Permiso bloqueado'
          )
        }
      } catch (err) {
        console.error(err)
        toast.info('Modo de notificaciones push de escritorio activo.', 'Notificaciones')
      }
    } else {
      toast.info('Este navegador admite notificaciones push en pantalla.', 'Notificaciones Push')
    }
  }

  const handleTogglePushEnabled = () => {
    const nextEnabled = !pushConfig.enabled
    const next = { ...pushConfig, enabled: nextEnabled }
    setPushConfig(next)
    localStorage.setItem('nexus_stock_push_alerts_config', JSON.stringify(next))
    window.dispatchEvent(
      new CustomEvent('nexus_push_config_changed', { detail: { enabled: nextEnabled } })
    )
    if (nextEnabled) {
      toast.success(
        'Notificaciones push activadas. Se mostrará una alerta persistente en el centro de notificaciones superior si un producto cae bajo su umbral.',
        'Push activado · Alerta persistente'
      )
      if (pushConfig.sound) playNotificationChime()
    } else {
      toast.info('Notificaciones push de stock pausadas.', 'Push desactivado')
    }
  }

  const handleSendTestPush = () => {
    if (pushConfig.sound) playNotificationChime()
    const criticalCount = lowStockItems.length > 0 ? lowStockItems.length : 2
    const sampleItem = lowStockItems[0] || inventory[0] || {
      sku: 'HW-SRV-RACK',
      name: 'Servidor Rack 1U Xeon',
      stock: 1,
      minStock: 3,
      unitOfMeasure: 'Pza',
    }

    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        new Notification('AES Nexus ERP · Alerta de Stock Crítico', {
          body: `⚠️ ${criticalCount} producto(s) bajo umbral mínimo. Reorden necesario para ${sampleItem.sku} (${sampleItem.stock} disp. / umbral mín. ${sampleItem.minStock}).`,
          icon: '/favicon.ico',
        })
      } catch {
        // iframe fallback
      }
    }

    toast.warning(
      `[PUSH] ⚠️ ${criticalCount} producto(s) bajo umbral de seguridad: ${sampleItem.sku} disponible ${sampleItem.stock} (umbral mín. ${sampleItem.minStock}).`,
      'Notificación Push recibida'
    )
  }

  // Email handlers
  const handleToggleEmailEnabled = () => {
    const nextEnabled = !emailConfig.enabled
    const next = { ...emailConfig, enabled: nextEnabled }
    setEmailConfig(next)
    localStorage.setItem('nexus_stock_email_alerts_config', JSON.stringify(next))
    if (nextEnabled) {
      toast.success(
        'Alertas por correo electrónico activadas. Se notificará a los destinatarios cuando las existencias alcancen su umbral mínimo.',
        'Notificaciones por correo habilitadas'
      )
    } else {
      toast.info(
        'Alertas por correo electrónico pausadas. Solo se mostrarán alertas visuales en pantalla.',
        'Notificaciones en pausa'
      )
    }
  }

  const handleAddRecipient = () => {
    const email = newEmailInput.trim().toLowerCase()
    if (!email) return
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setNewEmailError('Ingresa una dirección de correo válida (ej. usuario@dominio.com)')
      return
    }
    if (emailConfig.recipients.includes(email)) {
      setNewEmailError('Esta dirección ya se encuentra en la lista de destinatarios')
      return
    }
    const next = { ...emailConfig, recipients: [...emailConfig.recipients, email] }
    setEmailConfig(next)
    localStorage.setItem('nexus_stock_email_alerts_config', JSON.stringify(next))
    setNewEmailInput('')
    setNewEmailError('')
    toast.success(`Se agregó ${email} a la lista de destinatarios.`, 'Destinatario añadido')
  }

  const handleRemoveRecipient = (emailToRemove: string) => {
    if (emailConfig.recipients.length <= 1) {
      toast.warning('Debe existir al menos un destinatario para despachar alertas.', 'Acción no permitida')
      return
    }
    const next = {
      ...emailConfig,
      recipients: emailConfig.recipients.filter((r) => r !== emailToRemove),
    }
    setEmailConfig(next)
    localStorage.setItem('nexus_stock_email_alerts_config', JSON.stringify(next))
    toast.info(`Se eliminó ${emailToRemove} de la lista de alertas.`, 'Destinatario eliminado')
  }

  const handleSendTestEmail = () => {
    if (emailConfig.recipients.length === 0) {
      toast.warning('Agrega al menos un destinatario para realizar la prueba.', 'Sin destinatarios')
      return
    }
    setIsSendingTest(true)
    setTimeout(() => {
      setIsSendingTest(false)
      const now = new Date()
      const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
      setLastTestSentAt(timeStr)
      const count = lowStockItems.length > 0 ? lowStockItems.length : 1
      toast.success(
        `Correo de prueba despachado a ${emailConfig.recipients.join(', ')} con el reporte de ${count} producto(s) en umbral mínimo.`,
        'Prueba de correo enviada'
      )
    }, 450)
  }

  const handleSaveAllStockConfig = () => {
    localStorage.setItem('nexus_stock_email_alerts_config', JSON.stringify(emailConfig))
    localStorage.setItem('nexus_stock_push_alerts_config', JSON.stringify(pushConfig))
    toast.success(
      `Configuración de umbrales y notificaciones guardada. Push: ${
        pushConfig.enabled ? 'Activo' : 'Pausado'
      } · Correo: ${
        emailConfig.enabled ? `${emailConfig.recipients.length} suscritos` : 'Pausado'
      }.`,
      'Preferencias actualizadas'
    )
    setShowStockConfigModal(false)
  }

  // Granular Role / Capability Permissions for Dashboard Sections
  const hasActiveAccess = isAccountActive && (isFullAdmin || capabilities.size > 0)

  const canViewSalesQuotes =
    hasActiveAccess &&
    canAccessSection('Ventas', 'Cotizaciones', capabilities, isFullAdmin, isAccountActive)
  const canViewSalesOrders =
    hasActiveAccess &&
    canAccessSection('Ventas', 'Pedidos', capabilities, isFullAdmin, isAccountActive)
  const canViewSalesSummary =
    hasActiveAccess &&
    canAccessSection('Ventas', 'Resumen', capabilities, isFullAdmin, isAccountActive)

  const canViewCrmClients =
    hasActiveAccess &&
    canAccessSection('CRM', 'Clientes', capabilities, isFullAdmin, isAccountActive)
  const canViewCrmOpportunities =
    hasActiveAccess &&
    canAccessSection('CRM', 'Oportunidades', capabilities, isFullAdmin, isAccountActive)
  const canViewCrmActivities =
    hasActiveAccess &&
    canAccessSection('CRM', 'Actividades', capabilities, isFullAdmin, isAccountActive)

  const canViewInventory =
    hasActiveAccess &&
    canAccessSection('Operaciones', 'Inventario', capabilities, isFullAdmin, isAccountActive)
  const canAdjustThresholds =
    hasActiveAccess && (isFullAdmin || capabilities.has('adjustThresholds'))
  const canViewOperationsDeliveries =
    hasActiveAccess &&
    canAccessSection('Operaciones', 'Entregas', capabilities, isFullAdmin, isAccountActive)
  const canViewOperationsPurchases =
    hasActiveAccess &&
    (canAccessModule('Compras', capabilities, isFullAdmin, isAccountActive) ||
      canAccessSection('Operaciones', 'Compras', capabilities, isFullAdmin, isAccountActive))
  const canViewOperationsSummary =
    hasActiveAccess &&
    canAccessSection('Operaciones', 'Resumen', capabilities, isFullAdmin, isAccountActive)

  const canViewReceivables =
    hasActiveAccess &&
    canAccessSection('Finanzas', 'Cobros', capabilities, isFullAdmin, isAccountActive)
  const canViewPayables =
    hasActiveAccess &&
    canAccessSection('Finanzas', 'Pagos', capabilities, isFullAdmin, isAccountActive)
  const canViewExpenses =
    hasActiveAccess &&
    (canAccessSection('Gastos', 'Resumen y control', capabilities, isFullAdmin, isAccountActive) ||
      canAccessSection('Gastos', 'Registro y pólizas', capabilities, isFullAdmin, isAccountActive))
  const canViewChartAccounts =
    hasActiveAccess &&
    canAccessSection('Finanzas', 'Cuentas contables', capabilities, isFullAdmin, isAccountActive)
  const canViewFinanceSummary =
    hasActiveAccess &&
    canAccessSection('Finanzas', 'Resumen', capabilities, isFullAdmin, isAccountActive)

  const canViewRequisitionsCol =
    hasActiveAccess &&
    canAccessSection('Compras', 'Requisiciones', capabilities, isFullAdmin, isAccountActive)
  const canViewPoTransitCol =
    hasActiveAccess &&
    (canAccessSection('Compras', 'Órdenes de compra', capabilities, isFullAdmin, isAccountActive) ||
      canAccessSection('Compras', 'Recepciones', capabilities, isFullAdmin, isAccountActive) ||
      canViewOperationsPurchases)
  const canViewSupplierBillsCol =
    hasActiveAccess &&
    (canAccessSection('Compras', 'Facturas', capabilities, isFullAdmin, isAccountActive) ||
      canViewPayables)
  const canViewPurchasesExecSummary =
    canViewRequisitionsCol || canViewPoTransitCol || canViewSupplierBillsCol
  const visiblePurchasesColsCount =
    (canViewRequisitionsCol ? 1 : 0) +
    (canViewPoTransitCol ? 1 : 0) +
    (canViewSupplierBillsCol ? 1 : 0)

  const canViewSalesChart =
    canViewSalesOrders || canViewSalesQuotes || canViewSalesSummary
  const canViewFinanceChart =
    canViewReceivables || canViewExpenses || canViewFinanceSummary

  const activeFirstName = useMemo(() => {
    const trimmed = (activeUserName || '').trim()
    if (!trimmed) return 'Usuario'
    return trimmed.split(/\s+/)[0]
  }, [activeUserName])

  // Dynamic Greeting & Localized Date aware of selected language, user and corporate timezone
  const greeting = useMemo(() => {
    const hourStr = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: regional.timezone,
    }).format(new Date())
    const hour = Number(hourStr) || new Date().getHours()
    if (hour < 12) return t('dashboard.greetingMorning', { name: activeFirstName })
    if (hour < 19) return t('dashboard.greetingAfternoon', { name: activeFirstName })
    return t('dashboard.greetingEvening', { name: activeFirstName })
  }, [regional.timezone, t, activeFirstName])

  const formattedDate = useMemo(() => {
    const now = new Date()
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: regional.timezone,
    }
    try {
      const str = new Intl.DateTimeFormat(locale, options).format(now)
      return str.toUpperCase()
    } catch {
      return new Intl.DateTimeFormat('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
        .format(now)
        .toUpperCase()
    }
  }, [locale, regional.timezone])

  const periodDisplayLabel =
    period === 'Este mes'
      ? t('dashboard.period.month')
      : period === 'Este trimestre'
      ? t('dashboard.period.quarter')
      : t('dashboard.period.year')

  // Top Sales KPIs (Ventas, Margen, Clientes, Oportunidades)
  const monthlySales = useMemo(() => {
    const sum = orders.reduce((acc, o) => acc + (o.total || 0), 0)
    return Math.max(sum, 284500)
  }, [orders])

  const grossMarginPercent = 38.4
  const grossMarginValue = useMemo(() => {
    return Math.round(monthlySales * (grossMarginPercent / 100))
  }, [monthlySales])

  const newClientsCount = 5
  const totalClientsActive = 14

  const wonOpportunitiesCount = 8
  const wonOpportunitiesValue = 194200

  // Finance KPIs
  const totalReceivableBalance = useMemo(() => {
    return receivables.reduce((acc, r) => acc + (r.balance || 0), 0)
  }, [receivables])

  const totalCashInBanks = useMemo(() => {
    return bankAccounts.reduce((acc, b) => acc + b.balance, 0)
  }, [bankAccounts])

  const monthlyExpensesTotal = useMemo(() => {
    return expenses.reduce((acc, e) => acc + (e.total || 0), 0)
  }, [expenses])

  // Operations KPIs
  const totalInventoryValue = useMemo(() => {
    return inventory.reduce((acc, item) => acc + item.stock * item.cost, 0)
  }, [inventory])

  const lowStockItems = useMemo(() => {
    return effectiveInventory.filter((item) => item.stock <= item.minStock)
  }, [effectiveInventory])

  const activeShipments = useMemo(() => {
    return shipments.filter((s) => s.status === 'Preparando' || s.status === 'En ruta')
  }, [shipments])

  const activePurchaseOrders = useMemo(() => {
    return purchaseOrders.filter(
      (po) => po.status !== 'Recibida' && po.status !== 'Cancelada'
    )
  }, [purchaseOrders])

  const pendingRequisitionsList = useMemo(() => {
    return [...requisitions]
      .filter((r) => r.status === 'Pendiente' || r.status === 'Aprobada')
      .sort((a, b) => (a.status === 'Pendiente' ? -1 : b.status === 'Pendiente' ? 1 : 0))
  }, [requisitions])

  const pendingRequisitionsTotal = useMemo(() => {
    return pendingRequisitionsList.reduce((acc, r) => acc + r.estimatedTotal, 0)
  }, [pendingRequisitionsList])

  const awaitingApprovalReqsCount = useMemo(() => {
    return pendingRequisitionsList.filter((r) => r.status === 'Pendiente').length
  }, [pendingRequisitionsList])

  const transitPurchaseOrders = useMemo(() => {
    return purchaseOrders.filter(
      (po) => po.status === 'Emitida' || po.status === 'Recepción parcial'
    )
  }, [purchaseOrders])

  const transitPurchaseOrdersTotal = useMemo(() => {
    return transitPurchaseOrders.reduce((acc, po) => acc + po.total, 0)
  }, [transitPurchaseOrders])

  const transitPendingUnits = useMemo(() => {
    return transitPurchaseOrders.reduce(
      (acc, po) =>
        acc +
        po.items.reduce(
          (itemSum, item) => itemSum + Math.max(0, item.quantity - item.receivedQty),
          0
        ),
      0
    )
  }, [transitPurchaseOrders])

  const expiringVendorBills = useMemo(() => {
    return [...payables]
      .filter((b) => b.balance > 0 && b.status !== 'Pagada')
      .sort((a, b) => {
        if (a.status === 'Vencida' && b.status !== 'Vencida') return -1
        if (b.status === 'Vencida' && a.status !== 'Vencida') return 1
        return b.balance - a.balance
      })
  }, [payables])

  const expiringVendorBillsBalance = useMemo(() => {
    return expiringVendorBills.reduce((acc, b) => acc + b.balance, 0)
  }, [expiringVendorBills])

  const overdueVendorBillsCount = useMemo(() => {
    return expiringVendorBills.filter((b) => b.status === 'Vencida').length
  }, [expiringVendorBills])

  const purchasesPeriodKpis = useMemo(() => {
    const now = new Date()
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1
    const periodTag =
      purchasesPeriod === 'Mensual'
        ? new Intl.DateTimeFormat('es-MX', { month: 'short', year: 'numeric' })
            .format(now)
            .replace('.', '')
        : purchasesPeriod === 'Trimestral'
        ? `T${currentQuarter} ${now.getFullYear()}`
        : `Año ${now.getFullYear()}`

    const reqsInPeriod = requisitions.filter((r) =>
      isDateInPurchasesPeriod(r.date, purchasesPeriod, now)
    )
    const reqsTotal = reqsInPeriod.reduce((sum, r) => sum + r.estimatedTotal, 0)
    const reqsConverted = reqsInPeriod.filter((r) => r.status === 'Convertida a OC').length
    const reqsPending = reqsInPeriod.filter(
      (r) => r.status === 'Pendiente' || r.status === 'Aprobada'
    ).length

    const posInPeriod = purchaseOrders.filter(
      (po) => po.status !== 'Cancelada' && isDateInPurchasesPeriod(po.date, purchasesPeriod, now)
    )
    const posTotal = posInPeriod.reduce((sum, po) => sum + po.total, 0)
    const posReceived = posInPeriod.filter((po) => po.status === 'Recibida').length
    const posOpen = posInPeriod.filter((po) => po.status !== 'Recibida').length

    const billsInPeriod = payables.filter((b) =>
      isDateInPurchasesPeriod(b.issueDate, purchasesPeriod, now)
    )
    const billsTotal = billsInPeriod.reduce((sum, b) => sum + b.total, 0)
    const billsPaid = billsInPeriod.reduce((sum, b) => sum + b.paidAmount, 0)
    const billsBalance = billsInPeriod.reduce((sum, b) => sum + b.balance, 0)

    return {
      periodTag,
      reqsCount: reqsInPeriod.length,
      reqsTotal,
      reqsConverted,
      reqsPending,
      posCount: posInPeriod.length,
      posTotal,
      posReceived,
      posOpen,
      billsCount: billsInPeriod.length,
      billsTotal,
      billsPaid,
      billsBalance,
    }
  }, [requisitions, purchaseOrders, payables, purchasesPeriod])

  const warehouseBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        warehouseName: string
        skus: number
        units: number
        critical: number
        value: number
      }
    >()
    for (const item of effectiveInventory) {
      const current = map.get(item.warehouseName) || {
        warehouseName: item.warehouseName,
        skus: 0,
        units: 0,
        critical: 0,
        value: 0,
      }
      current.skus += 1
      current.units += item.stock
      if (item.stock <= item.minStock) current.critical += 1
      current.value += item.stock * item.cost
      map.set(item.warehouseName, current)
    }
    return Array.from(map.values())
  }, [effectiveInventory])

  const inventoryChartData = useMemo(() => {
    return [...effectiveInventory]
      .sort((a, b) => (a.stock - a.minStock) - (b.stock - b.minStock))
      .slice(0, 7)
      .map((item) => ({
        sku: item.sku,
        name: item.name,
        stock: item.stock,
        minStock: item.minStock,
      }))
  }, [effectiveInventory])

  const overdueInvoices = useMemo(() => {
    return receivables.filter((r) => r.status === 'Vencida' && r.balance > 0)
  }, [receivables])

  const pendingDeliveries = useMemo(() => {
    return orders.filter(
      (o) => o.status === 'En preparación' || o.status === 'Confirmado'
    )
  }, [orders])

  const pendingPayablesCount = useMemo(() => {
    return payables.filter((p) => p.status === 'Pendiente' || p.status === 'Vencida')
  }, [payables])

  const totalPayablesBalance = useMemo(() => {
    return pendingPayablesCount.reduce((s, p) => s + p.balance, 0)
  }, [pendingPayablesCount])

  // Alert Cards visible to active role
  const showAlertReceivables = canViewReceivables
  const showAlertStock = canViewInventory || canAdjustThresholds
  const showAlertDeliveries = canViewSalesOrders || canViewOperationsDeliveries
  const showAlertPayables = canViewPayables

  const visibleAlertCardsCount =
    (showAlertReceivables ? 1 : 0) +
    (showAlertStock ? 1 : 0) +
    (showAlertDeliveries ? 1 : 0) +
    (showAlertPayables ? 1 : 0)

  const totalAlertsCount =
    (showAlertStock && lowStockItems.length > 0 ? 1 : 0) +
    (showAlertReceivables && overdueInvoices.length > 0 ? 1 : 0) +
    (showAlertDeliveries &&
    (canViewSalesOrders ? pendingDeliveries.length > 0 : activeShipments.length > 0)
      ? 1
      : 0) +
    (showAlertPayables && pendingPayablesCount.length > 0 ? 1 : 0)

  // Quick actions visible to active role
  const quickActionCount =
    (canViewSalesQuotes ? 1 : 0) +
    (canViewSalesOrders ? 1 : 0) +
    (canViewReceivables ? 1 : 0) +
    (canViewExpenses ? 1 : 0) +
    (canViewPayables && !canViewSalesQuotes ? 1 : 0) +
    (canViewInventory ? 1 : 0) +
    (canViewOperationsDeliveries && !canViewSalesOrders ? 1 : 0) +
    (canViewOperationsPurchases ? 1 : 0) +
    (canViewChartAccounts ? 1 : 0) +
    (canAdjustThresholds ? 1 : 0)

  // Determine which top KPI cards render based on role permissions
  const salesKpiSlots =
    (canViewSalesOrders || canViewSalesSummary ? 1 : 0) +
    (canViewSalesSummary ? 1 : 0) +
    (canViewCrmClients ? 1 : 0) +
    (canViewCrmOpportunities ? 1 : 0)

  const showSalesKpiSales = canViewSalesOrders || canViewSalesSummary
  const showSalesKpiMargin = canViewSalesSummary
  const showSalesKpiClients = canViewCrmClients
  const showSalesKpiOpps = canViewCrmOpportunities

  const fillSecondaryKpisIntoTopRow = salesKpiSlots < 4
  const showTopFinReceivables = fillSecondaryKpisIntoTopRow && canViewReceivables
  const showTopFinBanks = fillSecondaryKpisIntoTopRow && canViewFinanceSummary
  const showTopFinPayables = fillSecondaryKpisIntoTopRow && canViewPayables
  const showTopFinExpenses = fillSecondaryKpisIntoTopRow && canViewExpenses

  const showTopOpsInventoryVal = fillSecondaryKpisIntoTopRow && canViewInventory
  const showTopOpsCritical =
    fillSecondaryKpisIntoTopRow && (canViewInventory || canAdjustThresholds)
  const showTopOpsDeliveries =
    fillSecondaryKpisIntoTopRow && canViewOperationsDeliveries
  const showTopOpsPurchases =
    fillSecondaryKpisIntoTopRow && canViewOperationsPurchases

  const visibleTopKpiCount =
    (showSalesKpiSales ? 1 : 0) +
    (showSalesKpiMargin ? 1 : 0) +
    (showSalesKpiClients ? 1 : 0) +
    (showSalesKpiOpps ? 1 : 0) +
    (showTopFinReceivables ? 1 : 0) +
    (showTopFinBanks ? 1 : 0) +
    (showTopFinPayables ? 1 : 0) +
    (showTopFinExpenses ? 1 : 0) +
    (showTopOpsInventoryVal ? 1 : 0) +
    (showTopOpsCritical ? 1 : 0) +
    (showTopOpsDeliveries ? 1 : 0) +
    (showTopOpsPurchases ? 1 : 0)

  // Secondary strip avoids duplicating KPIs already elevated into the top row
  const showStripReceivables = canViewReceivables && !showTopFinReceivables
  const showStripBanks = canViewFinanceSummary && !showTopFinBanks
  const showStripInventory = canViewInventory && !showTopOpsInventoryVal
  const visibleStripCount =
    (showStripReceivables ? 1 : 0) +
    (showStripBanks ? 1 : 0) +
    (showStripInventory ? 1 : 0)

  // Main Grid Left & Right panels
  const showMainRevenueChart = canViewSalesChart || canViewFinanceChart
  const showMainOperationsChart =
    !showMainRevenueChart && (canViewInventory || canViewOperationsSummary)

  const showRightCrmActivities = canViewCrmActivities
  const showRightFinancePanel =
    !showRightCrmActivities &&
    (canViewReceivables || canViewPayables || canViewFinanceSummary)
  const showRightOperationsPanel =
    !showRightCrmActivities &&
    !showRightFinancePanel &&
    (canViewInventory || canViewOperationsDeliveries || canViewOperationsPurchases)

  const hasLeftMainPanel = showMainRevenueChart || showMainOperationsChart
  const hasRightMainPanel =
    showRightCrmActivities || showRightFinancePanel || showRightOperationsPanel
  const isSingleColumnDashboardGrid =
    (hasLeftMainPanel && !hasRightMainPanel) || (!hasLeftMainPanel && hasRightMainPanel)
  const hasAnyDashboardSection =
    visibleAlertCardsCount > 0 ||
    visibleTopKpiCount > 0 ||
    visibleStripCount > 0 ||
    hasLeftMainPanel ||
    hasRightMainPanel ||
    canViewPurchasesExecSummary ||
    canViewFinanceSummary ||
    canViewCrmOpportunities

  return (
    <div className="executive-dashboard-container">
      {/* Top Welcome Strip */}
      <section className="welcome-row">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" /> {formattedDate}
          </div>
          <h1>
            {greeting}
            <span className="wave">✳</span>
          </h1>
          <p className="welcome-subtitle">
            {!isAccountActive ? (
              <>
                Tu cuenta se encuentra suspendida temporalmente.{' '}
                <span>Contacta a un administrador para restablecer tu acceso.</span>
              </>
            ) : !hasActiveAccess ? (
              <>
                Tu perfil aún no tiene permisos operativos asignados.{' '}
                <span>Solicita acceso a tu administrador.</span>
              </>
            ) : (
              <>
                Vista adaptada a tu perfil ({activeUserRolesSummary}).{' '}
                <span>{t('dashboard.welcomeAllGood')}</span>
              </>
            )}
          </p>
        </div>

        {hasActiveAccess && (
          <div className="header-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={handleRefreshDashboard}
              title="Sincronizar métricas con el ERP en tiempo real"
              disabled={isLoadingDashboard}
            >
              <RefreshCw size={14} className={isLoadingDashboard ? 'animate-spin' : ''} />
              {isLoadingDashboard ? t('dashboard.loading') : t('dashboard.refresh')}
            </button>
            {(canAdjustThresholds || canViewInventory) && (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  setStockConfigTab('thresholds')
                  setShowStockConfigModal(true)
                }}
                title="Panel de configuración: definir umbrales mínimos de stock por producto y notificaciones push / correo"
              >
                <SlidersHorizontal size={14} />
                {t('dashboard.thresholdsBtn')}
                {lowStockItems.length > 0 ? (
                  <span
                    className="mini-alert-dot"
                    title={`${lowStockItems.length} SKUs bajo umbral mínimo`}
                  >
                    {lowStockItems.length}
                  </span>
                ) : (
                  (pushConfig.enabled || emailConfig.enabled) && (
                    <span className="mini-active-dot" title="Notificaciones activas" />
                  )
                )}
              </button>
            )}
            <button
              type="button"
              className="button button-secondary"
              disabled={isLoadingDashboard}
              onClick={() => {
                const next =
                  period === 'Este mes'
                    ? 'Este trimestre'
                    : period === 'Este trimestre'
                    ? 'Año 2026'
                    : 'Este mes'
                handlePeriodChange(next)
              }}
            >
              <CalendarDays size={15} />
              {periodDisplayLabel}
              <ChevronDown size={14} />
            </button>
            {canViewCrmOpportunities ? (
              <button
                type="button"
                className="button button-primary"
                onClick={onOpenCreateOpportunity}
              >
                <Plus size={16} /> {t('dashboard.newOpportunity')}
              </button>
            ) : canViewInventory ? (
              <button
                type="button"
                className="button button-primary"
                onClick={() => onNavigateOperations('Inventario')}
              >
                <Package size={15} /> Ir a inventario
              </button>
            ) : canViewReceivables ? (
              <button
                type="button"
                className="button button-primary"
                onClick={() => onNavigateFinance('Cobros')}
              >
                <CreditCard size={15} /> Gestionar cobros
              </button>
            ) : canViewPayables ? (
              <button
                type="button"
                className="button button-primary"
                onClick={() => onNavigateFinance('Pagos')}
              >
                <WalletCards size={15} /> Programar pagos
              </button>
            ) : null}
          </div>
        )}
      </section>

      {!hasActiveAccess ? (
        <section className="panel dashboard-restricted-panel" aria-label="Acceso restringido">
          <div className="dashboard-restricted-icon">
            <LockKeyhole size={22} />
          </div>
          <div>
            <h2>
              {!isAccountActive
                ? 'Cuenta suspendida en el espacio de trabajo'
                : 'Sin módulos operativos asignados'}
            </h2>
            <p>
              {!isAccountActive
                ? 'Las métricas, alertas y acciones rápidas del tablero están ocultas mientras la cuenta permanezca suspendida.'
                : 'El contenido del tablero se ajusta automáticamente a los permisos de cada rol. Actualmente tu rol no incluye secciones operativas activas.'}
            </p>
          </div>
        </section>
      ) : (
        <>
          {/* Alerta Visual Prioritaria: Stock por debajo del Umbral Mínimo */}
          {(canViewInventory || canAdjustThresholds) && lowStockItems.length > 0 && (
            <aside className="executive-stock-alert-banner" role="alert">
              <div className="stock-alert-banner-left">
                <div className="stock-alert-icon-pulse">
                  <AlertTriangle size={18} />
                </div>
                <div className="stock-alert-text-block">
                  <div className="stock-alert-banner-header">
                    <span className="stock-alert-tag-kicker">
                      Alerta Visual · Control de Stock
                    </span>
                    <strong className="stock-alert-banner-title">
                      {lowStockItems.length === 1
                        ? '1 producto ha caído en o por debajo de su umbral mínimo configurado'
                        : `${lowStockItems.length} productos han caído en o por debajo de su umbral mínimo configurado`}
                    </strong>
                    <span className="stock-alert-pill-count">
                      {lowStockItems.length} en nivel crítico
                    </span>
                  </div>
                  <p className="stock-alert-banner-desc">
                    La cantidad física disponible alcanzó o cayó por debajo del umbral mínimo de
                    seguridad configurado en Operaciones. Se requiere reorden o compra para prevenir
                    roturas de inventario.
                  </p>
                  <div className="stock-alert-items-list">
                    {lowStockItems.map((item) => (
                      <div key={item.id} className="stock-alert-chip">
                        <span className="sku-tag">{item.sku}</span>
                        <span className="item-name">{item.name}</span>
                        <span className="wh-tag">({item.warehouseName})</span>
                        <span className="stock-badge-critical">
                          <strong>
                            {item.stock} {item.unitOfMeasure}
                          </strong>{' '}
                          disp. / Umbral mín. <strong>{item.minStock}</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="stock-alert-banner-actions">
                {canAdjustThresholds && (
                  <button
                    type="button"
                    className="button button-secondary stock-banner-notify-btn"
                    onClick={() => {
                      setStockConfigTab('thresholds')
                      setShowStockConfigModal(true)
                    }}
                    title="Configurar umbrales mínimos por producto y alertas push o por correo"
                  >
                    <SlidersHorizontal size={13} /> Configurar umbrales y alertas
                  </button>
                )}
                {canViewInventory && (
                  <button
                    type="button"
                    className="button button-primary stock-banner-action-btn"
                    onClick={() => onNavigateOperations('Inventario')}
                  >
                    <Package size={14} /> Gestionar en Inventario &rarr;
                  </button>
                )}
              </div>
            </aside>
          )}

          {/* Executive Quick Actions Bar */}
          {quickActionCount > 0 && (
            <section
              className="quick-actions-strip"
              aria-label={t('dashboard.quickActionsLabel')}
            >
              <span className="quick-actions-label">{t('dashboard.quickActionsLabel')}</span>
              {canViewSalesQuotes && (
                <button
                  type="button"
                  className="quick-action-item"
                  onClick={() => onNavigateSales('Cotizaciones')}
                >
                  <FileText size={13} /> {t('dashboard.quickQuote')}
                </button>
              )}
              {canViewSalesOrders && (
                <button
                  type="button"
                  className="quick-action-item"
                  onClick={() => onNavigateSales('Pedidos')}
                >
                  <Truck size={13} /> {t('dashboard.quickOrder')}
                </button>
              )}
              {canViewReceivables && (
                <button
                  type="button"
                  className="quick-action-item"
                  onClick={() => onNavigateFinance('Cobros')}
                >
                  <CreditCard size={13} /> {t('dashboard.quickPayment')}
                </button>
              )}
              {canViewPayables && !canViewSalesQuotes && (
                <button
                  type="button"
                  className="quick-action-item"
                  onClick={() => onNavigateFinance('Pagos')}
                >
                  <WalletCards size={13} /> Pagos a proveedores
                </button>
              )}
              {canViewExpenses && (
                <button
                  type="button"
                  className="quick-action-item"
                  onClick={() =>
                    onNavigateExpenses ? onNavigateExpenses('Registro y pólizas') : onNavigateFinance('Pagos')
                  }
                >
                  <Scale size={13} /> {t('dashboard.quickExpense')}
                </button>
              )}
              {canViewInventory && (
                <button
                  type="button"
                  className="quick-action-item"
                  onClick={() => onNavigateOperations('Inventario')}
                >
                  <Package size={13} /> {t('dashboard.quickInventory')}
                </button>
              )}
              {canViewOperationsDeliveries && !canViewSalesOrders && (
                <button
                  type="button"
                  className="quick-action-item"
                  onClick={() => onNavigateOperations('Entregas')}
                >
                  <Truck size={13} /> Entregas y envíos
                </button>
              )}
              {canViewOperationsPurchases && (
                <button
                  type="button"
                  className="quick-action-item"
                  onClick={() =>
                    onNavigatePurchases
                      ? onNavigatePurchases('Resumen')
                      : onNavigateOperations('Compras')
                  }
                >
                  <Receipt size={13} /> Compras
                </button>
              )}
              {canViewChartAccounts && (
                <button
                  type="button"
                  className="quick-action-item"
                  onClick={() => onNavigateFinance('Cuentas contables')}
                >
                  <FileSpreadsheet size={13} /> {t('dashboard.quickChartAccounts')}
                </button>
              )}
              {canAdjustThresholds && (
                <button
                  type="button"
                  className="quick-action-item"
                  onClick={() => {
                    setStockConfigTab('thresholds')
                    setShowStockConfigModal(true)
                  }}
                  title="Panel de configuración: definir umbrales mínimos de stock por producto y habilitar alertas push o correo"
                >
                  <SlidersHorizontal size={13} /> Umbrales y alertas de stock{' '}
                  {lowStockItems.length > 0 ? (
                    <span className="mini-alert-pill-count">
                      {lowStockItems.length} críticos
                    </span>
                  ) : (
                    (pushConfig.enabled || emailConfig.enabled) && (
                      <span className="mini-active-dot" title="Notificaciones activas" />
                    )
                  )}
                </button>
              )}
            </section>
          )}

          {/* Operational Alert Hub ("Semáforo Ejecutivo") */}
          {showAlertHub && visibleAlertCardsCount > 0 && (
            <Skeleton
              name="executive-alerts"
              loading={isLoadingDashboard}
              initialBones={executiveAlertHubBones}
              className="alerts-skeleton-container"
            >
              <section className="executive-alert-hub" aria-label="Semáforo operativo">
                <div className="alert-hub-header">
                  <span className="alert-hub-title">
                    <ShieldAlert
                      size={14}
                      style={{ color: totalAlertsCount > 0 ? '#ba4836' : '#3c7d5c' }}
                    />
                    Semáforo Operativo y Financiero ({totalAlertsCount} avisos prioritarios)
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {(canAdjustThresholds || canViewInventory) && (
                      <button
                        type="button"
                        className="email-hub-tag-btn"
                        onClick={() => {
                          setStockConfigTab('thresholds')
                          setShowStockConfigModal(true)
                        }}
                        title="Configurar umbrales mínimos de stock y notificaciones push o correo"
                      >
                        <SlidersHorizontal size={11} /> Umbrales:{' '}
                        <strong
                          className={lowStockItems.length > 0 ? 'text-alert' : 'text-positive'}
                        >
                          {lowStockItems.length > 0
                            ? `${lowStockItems.length} críticos`
                            : 'Óptimos'}
                        </strong>
                        <span className="hub-sep">·</span>
                        <Bell size={11} />{' '}
                        <strong className={pushConfig.enabled ? 'text-positive' : 'text-muted'}>
                          {pushConfig.enabled ? 'Push On' : 'Push Off'}
                        </strong>
                        <span className="hub-sep">·</span>
                        <Mail size={11} />{' '}
                        <strong className={emailConfig.enabled ? 'text-positive' : 'text-muted'}>
                          {emailConfig.enabled
                            ? `${emailConfig.recipients.length} suscritos`
                            : 'Correo Off'}
                        </strong>
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-link"
                      style={{ fontSize: '8.5px' }}
                      onClick={() => setShowAlertHub(false)}
                    >
                      Ocultar alertas
                    </button>
                  </div>
                </div>

                <div className={`alert-hub-grid alert-hub-grid--cols-${visibleAlertCardsCount}`}>
                  {/* Alert 1: Cobranza Vencida */}
                  {showAlertReceivables && (
                    <article className="executive-alert-card">
                      <div>
                        <div className="alert-card-top">
                          <span
                            className={`alert-status-badge ${
                              overdueInvoices.length > 0 ? 'alert' : 'ok'
                            }`}
                          >
                            {overdueInvoices.length > 0 ? (
                              <>
                                <AlertTriangle size={11} /> Cobranza en riesgo
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={11} /> Al día
                              </>
                            )}
                          </span>
                          <span style={{ fontSize: '8px', color: '#88958c' }}>Finanzas</span>
                        </div>
                        <div className="alert-card-copy">
                          <strong>
                            {overdueInvoices.length > 0
                              ? `${overdueInvoices.length} facturas vencidas`
                              : 'Sin facturas vencidas'}
                          </strong>
                          <span>
                            {overdueInvoices.length > 0
                              ? `${money(
                                  overdueInvoices.reduce((sum, r) => sum + r.balance, 0)
                                )} requieren gestión inmediata.`
                              : 'Todos los clientes mantienen sus pagos al corriente.'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="alert-action-btn"
                        onClick={() => onNavigateFinance('Cobros')}
                      >
                        Ver módulo de cobros <ArrowRight size={11} />
                      </button>
                    </article>
                  )}

                  {/* Alert 2: Stock Crítico */}
                  {showAlertStock && (
                    <article
                      className={`executive-alert-card ${
                        lowStockItems.length > 0 ? 'card-alert-critical' : ''
                      }`}
                    >
                      <div>
                        <div className="alert-card-top">
                          <span
                            className={`alert-status-badge ${
                              lowStockItems.length > 0 ? 'alert' : 'ok'
                            }`}
                          >
                            {lowStockItems.length > 0 ? (
                              <>
                                <AlertTriangle size={11} /> Reorden requerido
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={11} /> Stock óptimo
                              </>
                            )}
                          </span>
                          <span style={{ fontSize: '8px', color: '#88958c' }}>Almacén</span>
                        </div>
                        <div className="alert-card-copy">
                          <strong>
                            {lowStockItems.length > 0
                              ? `${lowStockItems.length} producto${
                                  lowStockItems.length > 1 ? 's' : ''
                                } bajo umbral mínimo`
                              : 'Inventario en niveles normales'}
                          </strong>
                          <span>
                            {lowStockItems.length > 0
                              ? `${lowStockItems
                                  .map((i) => `${i.sku} (${i.stock}/${i.minStock} mín.)`)
                                  .slice(0, 2)
                                  .join(', ')}${
                                  lowStockItems.length > 2
                                    ? ` y ${lowStockItems.length - 2} más`
                                    : ''
                                } por debajo del umbral mínimo.`
                              : 'Todos los productos superan su umbral mínimo de seguridad.'}
                          </span>
                        </div>
                      </div>
                      <div className="alert-card-footer-btns">
                        {canViewInventory && (
                          <button
                            type="button"
                            className="alert-action-btn"
                            onClick={() => onNavigateOperations('Inventario')}
                          >
                            Ver inventario <ArrowRight size={11} />
                          </button>
                        )}
                        {canAdjustThresholds && (
                          <button
                            type="button"
                            className="alert-sub-btn"
                            onClick={() => {
                              setStockConfigTab('thresholds')
                              setShowStockConfigModal(true)
                            }}
                            title="Configurar umbrales de stock mínimo y alertas"
                          >
                            <SlidersHorizontal size={10} /> Umbrales y alertas
                          </button>
                        )}
                      </div>
                    </article>
                  )}

                  {/* Alert 3: Pedidos en preparación / Entregas */}
                  {showAlertDeliveries && (
                    <article className="executive-alert-card">
                      <div>
                        <div className="alert-card-top">
                          <span
                            className={`alert-status-badge ${
                              (canViewSalesOrders
                                ? pendingDeliveries.length
                                : activeShipments.length) > 0
                                ? 'info'
                                : 'ok'
                            }`}
                          >
                            <Truck size={11} />
                            {(canViewSalesOrders
                              ? pendingDeliveries.length
                              : activeShipments.length) > 0
                              ? 'Por despachar'
                              : 'Al día'}
                          </span>
                          <span style={{ fontSize: '8px', color: '#88958c' }}>
                            {canViewSalesOrders ? 'Ventas' : 'Entregas'}
                          </span>
                        </div>
                        <div className="alert-card-copy">
                          <strong>
                            {canViewSalesOrders
                              ? `${pendingDeliveries.length} pedidos en preparación`
                              : `${activeShipments.length} envíos activos en logística`}
                          </strong>
                          <span>
                            {canViewSalesOrders
                              ? 'Compromisos de entrega activos con clientes confirmados.'
                              : 'Guías en preparación o ruta hacia clientes.'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="alert-action-btn"
                        onClick={() =>
                          canViewSalesOrders
                            ? onNavigateSales('Pedidos')
                            : onNavigateOperations('Entregas')
                        }
                      >
                        {canViewSalesOrders ? 'Ver pedidos de venta' : 'Ver entregas'}{' '}
                        <ArrowRight size={11} />
                      </button>
                    </article>
                  )}

                  {/* Alert 4: Pagos a Proveedores */}
                  {showAlertPayables && (
                    <article className="executive-alert-card">
                      <div>
                        <div className="alert-card-top">
                          <span
                            className={`alert-status-badge ${
                              pendingPayablesCount.length > 0 ? 'warning' : 'ok'
                            }`}
                          >
                            <CreditCard size={11} />
                            {pendingPayablesCount.length > 0 ? 'Por liquidar' : 'Sin pendientes'}
                          </span>
                          <span style={{ fontSize: '8px', color: '#88958c' }}>Tesorería</span>
                        </div>
                        <div className="alert-card-copy">
                          <strong>{pendingPayablesCount.length} facturas de proveedores</strong>
                          <span>Saldo total a liquidar: {money(totalPayablesBalance)}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="alert-action-btn"
                        onClick={() => onNavigateFinance('Pagos')}
                      >
                        Ver cuentas por pagar <ArrowRight size={11} />
                      </button>
                    </article>
                  )}
                </div>
              </section>
            </Skeleton>
          )}

          {/* Fila Superior de KPIs Adaptados por Rol */}
          {visibleTopKpiCount > 0 && (
            <Skeleton
              name="executive-kpis"
              loading={isLoadingDashboard}
              initialBones={executiveKpiBones}
              className="kpi-skeleton-container"
            >
              <section
                className={`kpi-grid sales-kpi-grid kpi-grid--cols-${Math.min(
                  visibleTopKpiCount,
                  4
                )}`}
                aria-label="Indicadores clave del rol"
              >
                {/* Sales KPI 1: Ventas Totales del Mes */}
                {showSalesKpiSales && (
                  <article
                    className="kpi-card kpi-featured kpi-card-clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      onNavigateSales(canViewSalesOrders ? 'Pedidos' : 'Resumen')
                    }
                    onKeyDown={(e) =>
                      e.key === 'Enter' &&
                      onNavigateSales(canViewSalesOrders ? 'Pedidos' : 'Resumen')
                    }
                    title="Ver pedidos de venta del mes"
                  >
                    <div className="kpi-top">
                      <span>Ventas Totales del Mes</span>
                      <span className="kpi-icon">
                        <TrendingUp size={16} />
                      </span>
                    </div>
                    <div className="kpi-value">
                      {money(monthlySales)}
                      <span className="kpi-currency"> MXN</span>
                    </div>
                    <p className="kpi-subtext">{orders.length} pedidos confirmados este mes</p>
                    <div className="kpi-foot">
                      <span className="trend trend-up">
                        <ArrowUpRight size={13} /> +12.8%
                      </span>
                      <span>vs. mes anterior</span>
                      <span className="kpi-click-hint">
                        Ver pedidos <ArrowRight size={11} />
                      </span>
                    </div>
                  </article>
                )}

                {/* Sales KPI 2: Margen Bruto */}
                {showSalesKpiMargin && (
                  <article
                    className="kpi-card kpi-card-clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() => onNavigateSales('Resumen')}
                    onKeyDown={(e) => e.key === 'Enter' && onNavigateSales('Resumen')}
                    title="Ver análisis de rentabilidad y margen comercial"
                  >
                    <div className="kpi-top">
                      <span>Margen Bruto</span>
                      <span className="kpi-icon icon-green">
                        <Percent size={16} />
                      </span>
                    </div>
                    <div className="kpi-value">
                      {grossMarginPercent}%
                      <span className="kpi-currency"> ({money(grossMarginValue)})</span>
                    </div>
                    <p className="kpi-subtext">Utilidad bruta sobre facturación comercial</p>
                    <div className="kpi-foot">
                      <span className="trend trend-up">
                        <ArrowUpRight size={13} /> +2.1 pts
                      </span>
                      <span>vs. mes anterior</span>
                      <span className="kpi-click-hint">
                        Ver margen <ArrowRight size={11} />
                      </span>
                    </div>
                  </article>
                )}

                {/* Sales KPI 3: Nuevos Clientes */}
                {showSalesKpiClients && (
                  <article
                    className="kpi-card kpi-card-clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() => onNavigateCrm('Clientes')}
                    onKeyDown={(e) => e.key === 'Enter' && onNavigateCrm('Clientes')}
                    title="Ver directorio de nuevos clientes"
                  >
                    <div className="kpi-top">
                      <span>Nuevos Clientes</span>
                      <span className="kpi-icon icon-lilac">
                        <UserPlus size={16} />
                      </span>
                    </div>
                    <div className="kpi-value">
                      {newClientsCount}
                      <span className="kpi-currency"> nuevos</span>
                    </div>
                    <p className="kpi-subtext">{totalClientsActive} clientes activos en cartera</p>
                    <div className="kpi-foot">
                      <span className="trend trend-up">
                        <ArrowUpRight size={13} /> +3 cuentas
                      </span>
                      <span>vs. mes anterior</span>
                      <span className="kpi-click-hint">
                        Ver clientes <ArrowRight size={11} />
                      </span>
                    </div>
                  </article>
                )}

                {/* Sales KPI 4: Oportunidades Ganadas */}
                {showSalesKpiOpps && (
                  <article
                    className="kpi-card kpi-card-clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() => onNavigateCrm('Oportunidades')}
                    onKeyDown={(e) => e.key === 'Enter' && onNavigateCrm('Oportunidades')}
                    title="Ver oportunidades comerciales ganadas"
                  >
                    <div className="kpi-top">
                      <span>Oportunidades Ganadas</span>
                      <span className="kpi-icon icon-sand">
                        <Trophy size={16} />
                      </span>
                    </div>
                    <div className="kpi-value">
                      {wonOpportunitiesCount}
                      <span className="kpi-currency"> ({money(wonOpportunitiesValue)})</span>
                    </div>
                    <p className="kpi-subtext">Tasa de conversión del pipeline: 34.2%</p>
                    <div className="kpi-foot">
                      <span className="trend trend-up">
                        <ArrowUpRight size={13} /> +18.5%
                      </span>
                      <span>vs. mes anterior</span>
                      <span className="kpi-click-hint">
                        Ver pipeline <ArrowRight size={11} />
                      </span>
                    </div>
                  </article>
                )}

                {/* Finance KPI 1: Cuentas por Cobrar */}
                {showTopFinReceivables && (
                  <article
                    className="kpi-card kpi-featured kpi-card-clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() => onNavigateFinance('Cobros')}
                    onKeyDown={(e) => e.key === 'Enter' && onNavigateFinance('Cobros')}
                    title="Ver cuentas por cobrar"
                  >
                    <div className="kpi-top">
                      <span>Cuentas por Cobrar</span>
                      <span className="kpi-icon">
                        <CreditCard size={16} />
                      </span>
                    </div>
                    <div className="kpi-value">
                      {money(totalReceivableBalance)}
                      <span className="kpi-currency"> MXN</span>
                    </div>
                    <p className="kpi-subtext">
                      {receivables.filter((r) => r.balance > 0).length} facturas pendientes de
                      cobro
                    </p>
                    <div className="kpi-foot">
                      <span
                        className={`trend ${
                          overdueInvoices.length > 0 ? 'trend-down' : 'trend-up'
                        }`}
                      >
                        {overdueInvoices.length > 0
                          ? `${overdueInvoices.length} vencidas`
                          : 'Cartera sana'}
                      </span>
                      <span>seguimiento CxC</span>
                      <span className="kpi-click-hint">
                        Ver cobros <ArrowRight size={11} />
                      </span>
                    </div>
                  </article>
                )}

                {/* Finance KPI 2: Disponibilidad en Bancos */}
                {showTopFinBanks && (
                  <article
                    className="kpi-card kpi-card-clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() => onNavigateFinance('Resumen')}
                    onKeyDown={(e) => e.key === 'Enter' && onNavigateFinance('Resumen')}
                    title="Ver tesorería y cuentas bancarias"
                  >
                    <div className="kpi-top">
                      <span>Disponibilidad en Bancos</span>
                      <span className="kpi-icon icon-sand">
                        <Landmark size={16} />
                      </span>
                    </div>
                    <div className="kpi-value">
                      {money(totalCashInBanks)}
                      <span className="kpi-currency"> MXN</span>
                    </div>
                    <p className="kpi-subtext">
                      {bankAccounts.length} cuentas bancarias conciliadas
                    </p>
                    <div className="kpi-foot">
                      <span className="trend trend-up">Tesorería activa</span>
                      <span>saldo consolidado</span>
                      <span className="kpi-click-hint">
                        Ver bancos <ArrowRight size={11} />
                      </span>
                    </div>
                  </article>
                )}

                {/* Finance KPI 3: Cuentas por Pagar */}
                {showTopFinPayables && (
                  <article
                    className="kpi-card kpi-card-clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() => onNavigateFinance('Pagos')}
                    onKeyDown={(e) => e.key === 'Enter' && onNavigateFinance('Pagos')}
                    title="Ver cuentas por pagar"
                  >
                    <div className="kpi-top">
                      <span>Cuentas por Pagar</span>
                      <span className="kpi-icon icon-lilac">
                        <WalletCards size={16} />
                      </span>
                    </div>
                    <div className="kpi-value">
                      {money(totalPayablesBalance)}
                      <span className="kpi-currency"> MXN</span>
                    </div>
                    <p className="kpi-subtext">
                      {pendingPayablesCount.length} documentos pendientes a proveedores
                    </p>
                    <div className="kpi-foot">
                      <span className="trend trend-neutral">Compromisos vigentes</span>
                      <span>programación</span>
                      <span className="kpi-click-hint">
                        Ver pagos <ArrowRight size={11} />
                      </span>
                    </div>
                  </article>
                )}

                {/* Finance KPI 4: Gastos Operativos */}
                {showTopFinExpenses && (
                  <article
                    className="kpi-card kpi-card-clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      onNavigateExpenses ? onNavigateExpenses('Resumen y control') : onNavigateFinance('Resumen')
                    }
                    onKeyDown={(e) =>
                      e.key === 'Enter' &&
                      (onNavigateExpenses ? onNavigateExpenses('Resumen y control') : onNavigateFinance('Resumen'))
                    }
                    title="Ver control de gastos"
                  >
                    <div className="kpi-top">
                      <span>Gastos Registrados</span>
                      <span className="kpi-icon icon-green">
                        <Scale size={16} />
                      </span>
                    </div>
                    <div className="kpi-value">
                      {money(monthlyExpensesTotal)}
                      <span className="kpi-currency"> MXN</span>
                    </div>
                    <p className="kpi-subtext">
                      {expenses.length} comprobantes operativos contabilizados
                    </p>
                    <div className="kpi-foot">
                      <span className="trend trend-neutral">Control presupuestal</span>
                      <span>egresos</span>
                      <span className="kpi-click-hint">
                        Ver gastos <ArrowRight size={11} />
                      </span>
                    </div>
                  </article>
                )}

                {/* Operations KPI 1: Inventario Valorado */}
                {showTopOpsInventoryVal && (
                  <article
                    className="kpi-card kpi-featured kpi-card-clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() => onNavigateOperations('Inventario')}
                    onKeyDown={(e) => e.key === 'Enter' && onNavigateOperations('Inventario')}
                    title="Ver inventario valorado"
                  >
                    <div className="kpi-top">
                      <span>Inventario Valorado</span>
                      <span className="kpi-icon icon-green">
                        <WarehouseIcon size={16} />
                      </span>
                    </div>
                    <div className="kpi-value">
                      {money(totalInventoryValue)}
                      <span className="kpi-currency"> MXN</span>
                    </div>
                    <p className="kpi-subtext">
                      {inventory.length} ubicaciones SKU en {warehouseBreakdown.length} almacenes
                    </p>
                    <div className="kpi-foot">
                      <span className="trend trend-up">Existencia física</span>
                      <span>costo promedio</span>
                      <span className="kpi-click-hint">
                        Ver inventario <ArrowRight size={11} />
                      </span>
                    </div>
                  </article>
                )}

                {/* Operations KPI 2: SKUs Bajo Umbral Mínimo */}
                {showTopOpsCritical && (
                  <article
                    className="kpi-card kpi-card-clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (canViewInventory) {
                        onNavigateOperations('Inventario')
                      } else {
                        setStockConfigTab('thresholds')
                        setShowStockConfigModal(true)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (canViewInventory) onNavigateOperations('Inventario')
                        else {
                          setStockConfigTab('thresholds')
                          setShowStockConfigModal(true)
                        }
                      }
                    }}
                    title="Ver SKUs bajo umbral mínimo"
                  >
                    <div className="kpi-top">
                      <span>SKUs Bajo Umbral Mínimo</span>
                      <span className="kpi-icon icon-sand">
                        <AlertTriangle size={16} />
                      </span>
                    </div>
                    <div className="kpi-value">
                      {lowStockItems.length}
                      <span className="kpi-currency"> de {inventory.length} SKUs</span>
                    </div>
                    <p className="kpi-subtext">
                      {lowStockItems.length > 0
                        ? 'Requieren reposición o orden de compra'
                        : 'Todos los artículos por encima del mínimo'}
                    </p>
                    <div className="kpi-foot">
                      <span
                        className={`trend ${
                          lowStockItems.length > 0 ? 'trend-down' : 'trend-up'
                        }`}
                      >
                        {lowStockItems.length > 0 ? 'Atención requerida' : 'Nivel óptimo'}
                      </span>
                      <span>stock seguridad</span>
                      <span className="kpi-click-hint">
                        Revisar <ArrowRight size={11} />
                      </span>
                    </div>
                  </article>
                )}

                {/* Operations KPI 3: Entregas y Despachos Activos */}
                {showTopOpsDeliveries && (
                  <article
                    className="kpi-card kpi-card-clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() => onNavigateOperations('Entregas')}
                    onKeyDown={(e) => e.key === 'Enter' && onNavigateOperations('Entregas')}
                    title="Ver entregas y despachos"
                  >
                    <div className="kpi-top">
                      <span>Entregas en Proceso</span>
                      <span className="kpi-icon">
                        <Truck size={16} />
                      </span>
                    </div>
                    <div className="kpi-value">
                      {activeShipments.length}
                      <span className="kpi-currency"> envíos activos</span>
                    </div>
                    <p className="kpi-subtext">
                      {shipments.filter((s) => s.status === 'Entregado').length} entregas
                      completadas en el periodo
                    </p>
                    <div className="kpi-foot">
                      <span className="trend trend-up">Última milla</span>
                      <span>seguimiento</span>
                      <span className="kpi-click-hint">
                        Ver entregas <ArrowRight size={11} />
                      </span>
                    </div>
                  </article>
                )}

                {/* Operations KPI 4: Órdenes de Compra */}
                {showTopOpsPurchases && (
                  <article
                    className="kpi-card kpi-card-clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      onNavigatePurchases
                        ? onNavigatePurchases('Órdenes de compra')
                        : onNavigateOperations('Compras')
                    }
                    onKeyDown={(e) =>
                      e.key === 'Enter' &&
                      (onNavigatePurchases
                        ? onNavigatePurchases('Órdenes de compra')
                        : onNavigateOperations('Compras'))
                    }
                    title="Ver órdenes de compra y recepciones"
                  >
                    <div className="kpi-top">
                      <span>Órdenes de Abasto</span>
                      <span className="kpi-icon icon-lilac">
                        <Receipt size={16} />
                      </span>
                    </div>
                    <div className="kpi-value">
                      {activePurchaseOrders.length}
                      <span className="kpi-currency"> abiertas</span>
                    </div>
                    <p className="kpi-subtext">
                      {purchaseOrders.length} órdenes totales registradas en compras
                    </p>
                    <div className="kpi-foot">
                      <span className="trend trend-neutral">Abastecimiento</span>
                      <span>recepciones</span>
                      <span className="kpi-click-hint">
                        Ver compras <ArrowRight size={11} />
                      </span>
                    </div>
                  </article>
                )}
              </section>
            </Skeleton>
          )}

          {/* Tira Secundaria de Resumen Operativo y Financiero */}
          {visibleStripCount > 0 && (
            <section
              className={`ops-summary-strip ops-summary-strip--cols-${visibleStripCount}`}
              aria-label="Balance operativo y financiero"
            >
              {showStripReceivables && (
                <div
                  className="ops-summary-item"
                  role="button"
                  tabIndex={0}
                  onClick={() => onNavigateFinance('Cobros')}
                  onKeyDown={(e) => e.key === 'Enter' && onNavigateFinance('Cobros')}
                  title="Ver cuentas por cobrar"
                >
                  <div className="ops-summary-item-left">
                    <CreditCard size={15} style={{ color: '#356fa6' }} />
                    <div>
                      <span>Cuentas por cobrar:</span>
                      <strong>{money(totalReceivableBalance)}</strong>
                    </div>
                  </div>
                  <span className="text-link" style={{ fontSize: '8.5px' }}>
                    {receivables.filter((r) => r.balance > 0).length} pendientes{' '}
                    <ArrowRight size={10} />
                  </span>
                </div>
              )}

              {showStripBanks && (
                <div
                  className="ops-summary-item"
                  role="button"
                  tabIndex={0}
                  onClick={() => onNavigateFinance('Resumen')}
                  onKeyDown={(e) => e.key === 'Enter' && onNavigateFinance('Resumen')}
                  title="Ver tesorería y cuentas bancarias"
                >
                  <div className="ops-summary-item-left">
                    <Landmark size={15} style={{ color: '#a08362' }} />
                    <div>
                      <span>Disponibilidad en bancos:</span>
                      <strong>{money(totalCashInBanks)}</strong>
                    </div>
                  </div>
                  <span className="text-link" style={{ fontSize: '8.5px' }}>
                    {bankAccounts.length} cuentas <ArrowRight size={10} />
                  </span>
                </div>
              )}

              {showStripInventory && (
                <div
                  className="ops-summary-item"
                  role="button"
                  tabIndex={0}
                  onClick={() => onNavigateOperations('Inventario')}
                  onKeyDown={(e) => e.key === 'Enter' && onNavigateOperations('Inventario')}
                  title="Ver inventario valorado"
                >
                  <div className="ops-summary-item-left">
                    <Package
                      size={15}
                      style={{ color: lowStockItems.length > 0 ? '#ba4836' : '#3c7d5c' }}
                    />
                    <div>
                      <span>Inventario valorado:</span>
                      <strong>{money(totalInventoryValue)}</strong>
                    </div>
                  </div>
                  <span
                    className={`text-link ${lowStockItems.length > 0 ? 'text-alert' : ''}`}
                    style={{ fontSize: '8.5px', fontWeight: lowStockItems.length > 0 ? 700 : 500 }}
                  >
                    {lowStockItems.length > 0
                      ? `⚠️ ${lowStockItems.length} bajo umbral mín.`
                      : `${inventory.length} referencias`}{' '}
                    <ArrowRight size={10} />
                  </span>
                </div>
              )}
            </section>
          )}

          {/* Main Grid: Chart + Role Side Panel + Bank Accounts + CRM Opportunities */}
          {(hasLeftMainPanel ||
            hasRightMainPanel ||
            canViewFinanceSummary ||
            canViewCrmOpportunities) && (
            <section
              className={`dashboard-grid ${
                isSingleColumnDashboardGrid ? 'dashboard-grid--single' : ''
              }`}
            >
              {/* Left Panel 1: Sales/Finance Recharts Chart */}
              {showMainRevenueChart && (
                <Skeleton
                  name="executive-chart"
                  loading={isLoadingDashboard}
                  initialBones={executiveChartBones}
                  className="chart-skeleton-container"
                >
                  <RevenueTargetChart
                    orders={orders}
                    receivables={receivables}
                    expenses={expenses}
                    allowSalesSeries={canViewSalesChart}
                    allowFinanceSeries={canViewFinanceChart}
                  />
                </Skeleton>
              )}

              {/* Left Panel 2: Operations Inventory Stock Chart (for Operations-only roles) */}
              {showMainOperationsChart && (
                <article
                  className="panel exec-chart-panel"
                  aria-label="Disponibilidad de inventario vs umbral mínimo"
                >
                  <div className="exec-chart-top-bar">
                    <div>
                      <div className="panel-kicker">CONTROL LOGÍSTICO · INVENTARIO ACTIVO</div>
                      <h2>Existencias actuales vs. umbral mínimo por SKU</h2>
                      <p className="panel-subtitle">
                        Monitoreo operativo de los artículos prioritarios y balance por almacén
                      </p>
                    </div>
                    {canViewInventory && (
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => onNavigateOperations('Inventario')}
                      >
                        Ver inventario completo <ArrowRight size={14} />
                      </button>
                    )}
                  </div>

                  <div style={{ width: '100%', height: 225, marginTop: 10 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={inventoryChartData}
                        margin={{ top: 10, right: 12, left: -12, bottom: 0 }}
                        barGap={4}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="rgba(139, 150, 143, 0.18)"
                        />
                        <XAxis
                          dataKey="sku"
                          stroke="#8b968f"
                          fontSize={9}
                          tickLine={false}
                          axisLine={{ stroke: 'rgba(139, 150, 143, 0.25)' }}
                        />
                        <YAxis
                          stroke="#8b968f"
                          fontSize={9}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: 'rgba(139, 150, 143, 0.08)' }}
                          content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null
                            const data = payload[0].payload as (typeof inventoryChartData)[number]
                            const isLow = data.stock <= data.minStock
                            return (
                              <div className="exec-chart-tooltip">
                                <strong>
                                  {data.sku} · {data.name}
                                </strong>
                                <div className="exec-tooltip-row">
                                  <span>Stock actual:</span>
                                  <strong style={{ color: isLow ? '#b84b34' : '#1d7a65' }}>
                                    {data.stock} uds
                                  </strong>
                                </div>
                                <div className="exec-tooltip-row">
                                  <span>Umbral mínimo:</span>
                                  <strong>{data.minStock} uds</strong>
                                </div>
                              </div>
                            )
                          }}
                        />
                        <Bar
                          name="Stock actual"
                          dataKey="stock"
                          fill="#1d7a65"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={26}
                        />
                        <Bar
                          name="Umbral mínimo"
                          dataKey="minStock"
                          fill="#d97706"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={26}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="ops-warehouse-strip">
                    {warehouseBreakdown.map((wh) => (
                      <div key={wh.warehouseName} className="ops-warehouse-card">
                        <span className="ops-warehouse-name">{wh.warehouseName}</span>
                        <strong>{wh.units} unidades</strong>
                        <small>
                          {wh.skus} SKUs · {money(wh.value)}
                          {wh.critical > 0 ? ` · ${wh.critical} críticos` : ''}
                        </small>
                      </div>
                    ))}
                  </div>
                </article>
              )}

              {/* Right Panel 1: CRM Agenda / Next Follow-ups */}
              {showRightCrmActivities && (
                <article className="panel activity-panel">
                  <div className="panel-heading">
                    <div>
                      <div className="panel-kicker">EN TU AGENDA</div>
                      <h2>Lo que sigue</h2>
                    </div>
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => onNavigateCrm('Actividades')}
                    >
                      Ver agenda <ArrowRight size={14} />
                    </button>
                  </div>
                  <div className="today-label">
                    <span>HOY</span>
                    <span>
                      {new Date()
                        .toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
                        .toUpperCase()}
                    </span>
                  </div>
                  <div className="activity-list">
                    {activities.map((activity) => (
                      <div className="activity-row" key={activity.title}>
                        <div className={`activity-icon tone-${activity.tone}`}>
                          {activity.icon === 'send' ? (
                            <ArrowRight size={15} />
                          ) : activity.icon === 'phone' ? (
                            <Clock3 size={15} />
                          ) : (
                            <Users size={15} />
                          )}
                        </div>
                        <div className="activity-copy">
                          <strong>{activity.title}</strong>
                          <span>{activity.company}</span>
                        </div>
                        <time>{activity.time}</time>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="add-activity"
                    onClick={() => {
                      toast.info(
                        'Puedes programar nuevas actividades en el módulo CRM > Actividades.',
                        'Agenda comercial'
                      )
                      onNavigateCrm('Actividades')
                    }}
                  >
                    <Plus size={15} /> Agregar actividad comercial
                  </button>
                  <div className="activity-note">
                    <span className="note-spark">
                      <Sparkles size={14} />
                    </span>
                    <p>
                      Un seguimiento a tiempo con tus cuentas clave puede aumentar la conversión
                      hasta en 35%.
                    </p>
                  </div>
                </article>
              )}

              {/* Right Panel 2: Finance Priorities (for Finance roles without CRM) */}
              {showRightFinancePanel && (
                <article className="panel activity-panel">
                  <div className="panel-heading">
                    <div>
                      <div className="panel-kicker">TESORERÍA Y COMPROMISOS</div>
                      <h2>Vencimientos prioritarios</h2>
                    </div>
                    {canViewReceivables && (
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => onNavigateFinance('Cobros')}
                      >
                        Ir a Cobros <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                  <div className="today-label">
                    <span>PENDIENTES</span>
                    <span>CXC · CXP</span>
                  </div>
                  <div className="activity-list">
                    {receivables
                      .filter((r) => r.balance > 0)
                      .slice(0, 3)
                      .map((inv) => (
                        <div className="activity-row" key={inv.id}>
                          <div
                            className={`activity-icon ${
                              inv.status === 'Vencida' ? 'tone-amber' : 'tone-green'
                            }`}
                          >
                            <CreditCard size={15} />
                          </div>
                          <div className="activity-copy">
                            <strong>
                              {inv.folio} · {inv.clientCompany}
                            </strong>
                            <span>
                              Cobro {inv.status.toLowerCase()} · Vence {inv.dueDate}
                            </span>
                          </div>
                          <time>{money(inv.balance)}</time>
                        </div>
                      ))}
                    {canViewPayables &&
                      pendingPayablesCount.slice(0, 2).map((bill) => (
                        <div className="activity-row" key={bill.id}>
                          <div className="activity-icon tone-blue">
                            <WalletCards size={15} />
                          </div>
                          <div className="activity-copy">
                            <strong>
                              {bill.folio} · {bill.supplierCompany}
                            </strong>
                            <span>Pago a proveedor · Vence {bill.dueDate}</span>
                          </div>
                          <time>{money(bill.balance)}</time>
                        </div>
                      ))}
                  </div>
                  {canViewPayables && (
                    <button
                      type="button"
                      className="add-activity"
                      onClick={() => onNavigateFinance('Pagos')}
                    >
                      <ArrowRight size={15} /> Programar pagos a proveedores
                    </button>
                  )}
                </article>
              )}

              {/* Right Panel 3: Operations Priorities (for Operations roles without CRM) */}
              {showRightOperationsPanel && (
                <article className="panel activity-panel">
                  <div className="panel-heading">
                    <div>
                      <div className="panel-kicker">LOGÍSTICA Y ALMACÉN</div>
                      <h2>Prioridades operativas</h2>
                    </div>
                    {canViewOperationsDeliveries && (
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => onNavigateOperations('Entregas')}
                      >
                        Ver entregas <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                  <div className="today-label">
                    <span>EN CURSO</span>
                    <span>STOCK · ENVÍOS</span>
                  </div>
                  <div className="activity-list">
                    {lowStockItems.slice(0, 3).map((item) => (
                      <div className="activity-row" key={item.id}>
                        <div className="activity-icon tone-amber">
                          <AlertTriangle size={15} />
                        </div>
                        <div className="activity-copy">
                          <strong>
                            {item.sku} · {item.name}
                          </strong>
                          <span>
                            {item.warehouseName} · Mín. {item.minStock} {item.unitOfMeasure}
                          </span>
                        </div>
                        <time>
                          {item.stock} {item.unitOfMeasure}
                        </time>
                      </div>
                    ))}
                    {canViewOperationsDeliveries &&
                      activeShipments.slice(0, 2).map((ship) => (
                        <div className="activity-row" key={ship.id}>
                          <div className="activity-icon tone-blue">
                            <Truck size={15} />
                          </div>
                          <div className="activity-copy">
                            <strong>
                              {ship.folio} · {ship.clientCompany}
                            </strong>
                            <span>
                              {ship.carrier} · {ship.status}
                            </span>
                          </div>
                          <time>{ship.estimatedDelivery}</time>
                        </div>
                      ))}
                  </div>
                  {canViewOperationsPurchases && (
                    <button
                      type="button"
                      className="add-activity"
                      onClick={() =>
                        onNavigatePurchases
                          ? onNavigatePurchases('Órdenes de compra')
                          : onNavigateOperations('Compras')
                      }
                    >
                      <ArrowRight size={15} /> Revisar órdenes de compra ({activePurchaseOrders.length})
                    </button>
                  )}
                </article>
              )}

              {/* Procurement Executive Summary (Compras / Operaciones / Finanzas / Admin) */}
              {canViewPurchasesExecSummary && (
                <article
                  className="panel purchases-exec-panel"
                  style={{ gridColumn: '1 / -1' }}
                  aria-label="Resumen ejecutivo de compras"
                >
                  <div className="panel-heading">
                    <div>
                      <div className="panel-kicker">COMPRAS Y ABASTECIMIENTO</div>
                      <h2>Resumen ejecutivo de compras</h2>
                      <p className="panel-subtitle">
                        Visibilidad en tiempo real de solicitudes internas, órdenes en tránsito hacia almacén y pasivos con proveedores
                      </p>
                    </div>
                    <div className="purchases-exec-heading-actions">
                      <div className="purchases-period-select-wrap">
                        <CalendarDays size={13} className="purchases-period-select-icon" aria-hidden="true" />
                        <select
                          aria-label="Periodo de visualización de KPIs de compras"
                          value={purchasesPeriod}
                          onChange={(e) =>
                            setPurchasesPeriod(e.target.value as PurchasesKpiPeriod)
                          }
                        >
                          <option value="Mensual">Mensual</option>
                          <option value="Trimestral">Trimestral</option>
                          <option value="Anual">Anual</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        className="text-link"
                        onClick={() =>
                          onNavigatePurchases
                            ? onNavigatePurchases('Resumen')
                            : onNavigateOperations('Compras')
                        }
                      >
                        Ir al módulo de Compras <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Period-Responsive Procurement KPIs */}
                  <div
                    className={`purchases-exec-kpi-strip cols-${visiblePurchasesColsCount}`}
                    aria-label={`KPIs de compras (${purchasesPeriod})`}
                  >
                    {canViewRequisitionsCol && (
                      <div className="purchases-exec-kpi-card">
                        <div className="purchases-exec-kpi-top">
                          <span>Requisiciones · {purchasesPeriod}</span>
                          <span className="purchases-exec-kpi-period tabular-nums">
                            {purchasesPeriodKpis.periodTag}
                          </span>
                        </div>
                        <div className="purchases-exec-kpi-main tabular-nums">
                          <strong>{purchasesPeriodKpis.reqsCount}</strong>
                          <span>{money(purchasesPeriodKpis.reqsTotal)} est.</span>
                        </div>
                        <small className="tabular-nums">
                          {purchasesPeriodKpis.reqsConverted} convertidas a OC ·{' '}
                          {purchasesPeriodKpis.reqsPending} en gestión
                        </small>
                      </div>
                    )}

                    {canViewPoTransitCol && (
                      <div className="purchases-exec-kpi-card">
                        <div className="purchases-exec-kpi-top">
                          <span>Órdenes de compra · {purchasesPeriod}</span>
                          <span className="purchases-exec-kpi-period tabular-nums">
                            {purchasesPeriodKpis.periodTag}
                          </span>
                        </div>
                        <div className="purchases-exec-kpi-main tabular-nums">
                          <strong>{money(purchasesPeriodKpis.posTotal)}</strong>
                          <span>
                            {purchasesPeriodKpis.posCount}{' '}
                            {purchasesPeriodKpis.posCount === 1 ? 'orden' : 'órdenes'}
                          </span>
                        </div>
                        <small className="tabular-nums">
                          {purchasesPeriodKpis.posReceived} recibidas ·{' '}
                          {purchasesPeriodKpis.posOpen} abiertas / en tránsito
                        </small>
                      </div>
                    )}

                    {canViewSupplierBillsCol && (
                      <div className="purchases-exec-kpi-card">
                        <div className="purchases-exec-kpi-top">
                          <span>Facturación recibida · {purchasesPeriod}</span>
                          <span className="purchases-exec-kpi-period tabular-nums">
                            {purchasesPeriodKpis.periodTag}
                          </span>
                        </div>
                        <div className="purchases-exec-kpi-main tabular-nums">
                          <strong>{money(purchasesPeriodKpis.billsTotal)}</strong>
                          <span>
                            {purchasesPeriodKpis.billsCount}{' '}
                            {purchasesPeriodKpis.billsCount === 1 ? 'factura' : 'facturas'}
                          </span>
                        </div>
                        <small className="tabular-nums">
                          Pagado {money(purchasesPeriodKpis.billsPaid)} · Saldo{' '}
                          {money(purchasesPeriodKpis.billsBalance)}
                        </small>
                      </div>
                    )}
                  </div>

                  <div className={`purchases-exec-cols cols-${visiblePurchasesColsCount}`}>
                    {/* Column 1: Requisiciones pendientes */}
                    {canViewRequisitionsCol && (
                      <section className="purchases-exec-col">
                        <button
                          type="button"
                          className="purchases-exec-col-card"
                          onClick={() =>
                            onNavigatePurchases
                              ? onNavigatePurchases('Requisiciones')
                              : onNavigateOperations('Compras')
                          }
                        >
                          <div className="purchases-exec-card-top">
                            <span>Requisiciones pendientes</span>
                            <ClipboardList size={15} />
                          </div>
                          <div className="purchases-exec-card-metrics">
                            <strong className="tabular-nums">{pendingRequisitionsList.length}</strong>
                            <span className="tabular-nums">{money(pendingRequisitionsTotal)} est.</span>
                          </div>
                          <small>
                            {awaitingApprovalReqsCount} por aprobar ·{' '}
                            {pendingRequisitionsList.length - awaitingApprovalReqsCount} listas para OC
                          </small>
                        </button>

                        <div className="purchases-exec-list">
                          {pendingRequisitionsList.length === 0 ? (
                            <div className="purchases-exec-empty">
                              Sin requisiciones pendientes de atención.
                            </div>
                          ) : (
                            pendingRequisitionsList.slice(0, 3).map((req) => (
                              <div key={req.id} className="purchases-exec-item">
                                <div className="purchases-exec-item-main">
                                  <strong>
                                    <span className="tabular-nums">{req.folio}</span> · {req.department}
                                  </strong>
                                  <span>
                                    {req.requestedBy} · {req.status} · Req. {req.neededByDate}
                                  </span>
                                </div>
                                <div className="purchases-exec-item-end tabular-nums">
                                  <strong>{money(req.estimatedTotal)}</strong>
                                  <small>{req.priority}</small>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <button
                          type="button"
                          className="purchases-exec-col-link"
                          onClick={() =>
                            onNavigatePurchases
                              ? onNavigatePurchases('Requisiciones')
                              : onNavigateOperations('Compras')
                          }
                        >
                          Gestionar requisiciones <ArrowRight size={12} />
                        </button>
                      </section>
                    )}

                    {/* Column 2: Órdenes de compra en tránsito */}
                    {canViewPoTransitCol && (
                      <section className="purchases-exec-col">
                        <button
                          type="button"
                          className="purchases-exec-col-card"
                          onClick={() =>
                            onNavigatePurchases
                              ? onNavigatePurchases('Órdenes de compra')
                              : onNavigateOperations('Compras')
                          }
                        >
                          <div className="purchases-exec-card-top">
                            <span>Órdenes en tránsito</span>
                            <ShoppingCart size={15} />
                          </div>
                          <div className="purchases-exec-card-metrics">
                            <strong className="tabular-nums">{transitPurchaseOrders.length}</strong>
                            <span className="tabular-nums">{money(transitPurchaseOrdersTotal)}</span>
                          </div>
                          <small>{transitPendingUnits} unidades pendientes de ingreso en andén</small>
                        </button>

                        <div className="purchases-exec-list">
                          {transitPurchaseOrders.length === 0 ? (
                            <div className="purchases-exec-empty">
                              Todas las órdenes emitidas han sido recibidas.
                            </div>
                          ) : (
                            transitPurchaseOrders.slice(0, 3).map((po) => {
                              const pendingU = po.items.reduce(
                                (sum, it) => sum + Math.max(0, it.quantity - it.receivedQty),
                                0
                              )
                              return (
                                <div key={po.id} className="purchases-exec-item">
                                  <div className="purchases-exec-item-main">
                                    <strong>
                                      <span className="tabular-nums">{po.folio}</span> · {po.supplierCompany}
                                    </strong>
                                    <span>
                                      {po.warehouseName} · Llega {po.expectedDeliveryDate}
                                    </span>
                                  </div>
                                  <div className="purchases-exec-item-end tabular-nums">
                                    <strong>{money(po.total)}</strong>
                                    <small>{pendingU} pzas pend.</small>
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>

                        <button
                          type="button"
                          className="purchases-exec-col-link"
                          onClick={() =>
                            onNavigatePurchases
                              ? onNavigatePurchases('Recepciones')
                              : onNavigateOperations('Compras')
                          }
                        >
                          Ir a recepciones y órdenes <ArrowRight size={12} />
                        </button>
                      </section>
                    )}

                    {/* Column 3: Facturas de proveedor por vencer */}
                    {canViewSupplierBillsCol && (
                      <section className="purchases-exec-col">
                        <button
                          type="button"
                          className={`purchases-exec-col-card ${
                            overdueVendorBillsCount > 0 ? 'has-warning' : ''
                          }`}
                          onClick={() =>
                            onNavigatePurchases
                              ? onNavigatePurchases('Facturas')
                              : onNavigateFinance('Pagos')
                          }
                        >
                          <div className="purchases-exec-card-top">
                            <span>Facturas de proveedor por vencer</span>
                            <Receipt size={15} />
                          </div>
                          <div className="purchases-exec-card-metrics">
                            <strong className="tabular-nums">{expiringVendorBills.length}</strong>
                            <span className="tabular-nums">{money(expiringVendorBillsBalance)}</span>
                          </div>
                          <small>
                            {overdueVendorBillsCount > 0
                              ? `${overdueVendorBillsCount} factura(s) vencida(s) requieren atención`
                              : 'Sin facturas vencidas al día de hoy'}
                          </small>
                        </button>

                        <div className="purchases-exec-list">
                          {expiringVendorBills.length === 0 ? (
                            <div className="purchases-exec-empty">
                              No existen saldos pendientes con proveedores.
                            </div>
                          ) : (
                            expiringVendorBills.slice(0, 3).map((bill) => (
                              <div
                                key={bill.id}
                                className={`purchases-exec-item ${
                                  bill.status === 'Vencida' ? 'is-overdue' : ''
                                }`}
                              >
                                <div className="purchases-exec-item-main">
                                  <strong>
                                    <span className="tabular-nums">{bill.folio}</span> · {bill.supplierCompany}
                                  </strong>
                                  <span>
                                    {bill.purchaseOrderFolio || 'Factura directa'} · Vence {bill.dueDate}
                                  </span>
                                </div>
                                <div className="purchases-exec-item-end tabular-nums">
                                  <strong>{money(bill.balance)}</strong>
                                  <small>{bill.status}</small>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <button
                          type="button"
                          className="purchases-exec-col-link"
                          onClick={() =>
                            onNavigatePurchases
                              ? onNavigatePurchases('Facturas')
                              : onNavigateFinance('Pagos')
                          }
                        >
                          Revisar facturas CxP <ArrowRight size={12} />
                        </button>
                      </section>
                    )}
                  </div>
                </article>
              )}

              {/* Bank Accounts Mini Summary (Finance / Admin only) */}
              {canViewFinanceSummary && (
                <div style={{ gridColumn: '1 / -1' }} className="bank-summary-card">
                  <div className="bank-summary-header">
                    <h3>Disponibilidad en Cuentas Bancarias</h3>
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => onNavigateFinance('Resumen')}
                    >
                      Gestionar tesorería <ArrowRight size={12} />
                    </button>
                  </div>
                  <div className="bank-accounts-list">
                    {bankAccounts.map((acc) => (
                      <div key={acc.id} className="bank-mini-item">
                        <span className="bank-mini-name">
                          {acc.bankName} · {acc.accountNumber}
                        </span>
                        <span className="bank-mini-balance">{money(acc.balance)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent CRM Opportunities (CRM / Admin only) */}
              {canViewCrmOpportunities && (
                <article className="panel opportunities-panel">
                  <div className="panel-heading">
                    <div>
                      <div className="panel-kicker">SEGUIMIENTO COMERCIAL</div>
                      <h2>Oportunidades recientes</h2>
                      <p className="panel-subtitle">Las conversaciones más activas de tu equipo</p>
                    </div>
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => onNavigateCrm('Oportunidades')}
                    >
                      Ver todas <ArrowRight size={14} />
                    </button>
                  </div>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>EMPRESA</th>
                          <th>ETAPA</th>
                          <th>VALOR ESTIMADO</th>
                          <th>ACTUALIZACIÓN</th>
                          <th style={{ textAlign: 'right' }}>ACCIÓN</th>
                        </tr>
                      </thead>
                      <tbody>
                        {opportunities.map((opportunity) => (
                          <tr key={opportunity.company}>
                            <td>
                              <div className="company-cell">
                                <div className={`company-avatar ${opportunity.color}`}>
                                  {opportunity.initials}
                                </div>
                                <div>
                                  <strong>{opportunity.company}</strong>
                                  <span>{opportunity.person}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={`stage-badge stage-${opportunity.stageTone}`}>
                                <i />
                                {opportunity.stage}
                              </span>
                            </td>
                            <td className="money-cell">{money(opportunity.value)}</td>
                            <td className="date-cell">{opportunity.date}</td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className="button button-secondary"
                                style={{ minHeight: '26px', padding: '0 8px', fontSize: '8.5px' }}
                                onClick={() => onNavigateCrm('Oportunidades')}
                              >
                                Ver en CRM
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    type="button"
                    className="table-footer"
                    onClick={() => onNavigateCrm('Oportunidades')}
                  >
                    Ver pipeline completo en CRM <ArrowRight size={14} />
                  </button>
                </article>
              )}
            </section>
          )}

          {!hasAnyDashboardSection && (
            <section
              className="panel dashboard-restricted-panel"
              aria-label="Resumen del alcance del rol"
            >
              <div className="dashboard-restricted-icon">
                <ShieldAlert size={22} />
              </div>
              <div>
                <h2>Panel adaptado a tu alcance administrativo</h2>
                <p>
                  Tu perfil ({activeUserRolesSummary}) está orientado a gestión y configuración del
                  espacio de trabajo. Utiliza el menú lateral para acceder a tus secciones
                  habilitadas.
                </p>
              </div>
            </section>
          )}
        </>
      )}

      <footer className="page-footer">
        <span>Última sincronización en tiempo real · Datos conectados al ERP</span>
        <span>
          <Sparkles size={12} /> AES Nexus · Gestión clara y precisa para tu negocio.
        </span>
      </footer>

      {/* Panel de Control Ejecutivo: Umbrales de Stock y Notificaciones (Push & Correo) */}
      {showStockConfigModal && (canViewInventory || canAdjustThresholds) && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowStockConfigModal(false)
          }}
        >
          <section className="create-modal stock-config-modal" role="dialog" aria-modal="true">
            <div className="create-modal-heading">
              <div className="notify-modal-header-icon-wrap">
                <div className="notify-header-icon-box">
                  <SlidersHorizontal size={22} />
                </div>
                <div>
                  <div className="panel-kicker">CONTROL EJECUTIVO DE INVENTARIO · REGLAS & AVISOS</div>
                  <h2>Umbrales de Stock Mínimo y Notificaciones</h2>
                  <p>
                    Define los niveles mínimos de seguridad por producto para prevenir quiebres de existencias y activa notificaciones push instantáneas o por correo electrónico.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {onOpenCategoryThresholds && (
                  <button
                    type="button"
                    className="button button-secondary button-sm"
                    onClick={() => {
                      setShowStockConfigModal(false)
                      onOpenCategoryThresholds()
                    }}
                    title="Abrir configuración de umbrales por categoría de producto"
                  >
                    <Layers size={13} /> Por categoría &rarr;
                  </button>
                )}
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setShowStockConfigModal(false)}
                  aria-label="Cerrar panel de control"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Pestañas de Navegación del Panel */}
            <div className="stock-config-tabs-nav">
              <button
                type="button"
                className={`stock-config-tab-btn ${stockConfigTab === 'thresholds' ? 'active' : ''}`}
                onClick={() => setStockConfigTab('thresholds')}
              >
                <SlidersHorizontal size={14} />
                Umbrales por Producto
                <span className={`tab-mini-badge ${lowStockItems.length > 0 ? 'badge-alert' : ''}`}>
                  {lowStockItems.length > 0 ? `${lowStockItems.length} críticos` : `${inventory.length} SKUs`}
                </span>
              </button>

              <button
                type="button"
                className={`stock-config-tab-btn ${stockConfigTab === 'push' ? 'active' : ''}`}
                onClick={() => setStockConfigTab('push')}
              >
                <Bell size={14} />
                Notificaciones Push en Navegador
                <span className={`tab-mini-badge ${pushConfig.enabled ? 'badge-active' : ''}`}>
                  {pushConfig.enabled ? 'Activo' : 'Pausado'}
                </span>
              </button>

              <button
                type="button"
                className={`stock-config-tab-btn ${stockConfigTab === 'email' ? 'active' : ''}`}
                onClick={() => setStockConfigTab('email')}
              >
                <Mail size={14} />
                Alertas por Correo Electrónico
                <span className={`tab-mini-badge ${emailConfig.enabled ? 'badge-active' : ''}`}>
                  {emailConfig.enabled ? `${emailConfig.recipients.length} suscritos` : 'Pausado'}
                </span>
              </button>
            </div>

            <div className="stock-config-modal-scroll">
              {/* TAB 1: UMBRALES POR PRODUCTO */}
              {stockConfigTab === 'thresholds' && (
                <div className="stock-thresholds-body">
                  {/* Interruptor destacado para habilitar Notificaciones Push y Alerta Persistente */}
                  <div className={`stock-push-quick-switch-card ${pushConfig.enabled ? 'switch-active' : 'switch-inactive'}`}>
                    <div className="switch-card-left">
                      <div className="switch-card-icon-wrap">
                        <BellRing size={18} />
                        <span className={`switch-status-dot ${pushConfig.enabled ? 'dot-on' : 'dot-off'}`} />
                      </div>
                      <div className="switch-card-info">
                        <div className="switch-card-title-row">
                          <strong>Notificaciones Push y Alerta Persistente de Stock</strong>
                          <span className={`push-permission-pill perm-${pushConfig.permission}`}>
                            {pushConfig.enabled ? '✓ Habilitadas' : '✕ Desactivadas'}
                          </span>
                          {lowStockItems.length > 0 && (
                            <span className="persistent-alert-pill">
                              ⚠️ Alerta persistente en barra superior ({lowStockItems.length})
                            </span>
                          )}
                        </div>
                        <p>
                          Al activar este interruptor, cuando cualquier producto caiga por debajo de su umbral mínimo se emitirá una notificación push y el sistema mostrará una <strong>alerta persistente en el centro de notificaciones superior</strong> hasta su reorden o ajuste.
                        </p>
                      </div>
                    </div>
                    <div className="switch-card-right">
                      <label
                        className="toggle-switch-wrap"
                        title={pushConfig.enabled ? 'Deshabilitar notificaciones push' : 'Habilitar notificaciones push'}
                      >
                        <input
                          type="checkbox"
                          checked={pushConfig.enabled}
                          onChange={handleTogglePushEnabled}
                        />
                        <span className="toggle-slider" />
                      </label>
                      <button
                        type="button"
                        className="link-btn-push-opts"
                        onClick={() => setStockConfigTab('push')}
                        title="Ver ajustes avanzados de audio, vibración y permisos"
                      >
                        Ajustes push &rarr;
                      </button>
                    </div>
                  </div>

                  {/* Summary Bar */}
                  <div className="stock-config-summary-bar">
                    <div className="summary-stat-chip">
                      <span className="summary-stat-val">{inventory.length}</span>
                      <span className="summary-stat-label">SKUs en Catálogo</span>
                    </div>
                    <div className={`summary-stat-chip ${lowStockItems.length > 0 ? 'critical' : ''}`}>
                      <span className="summary-stat-val text-alert">{lowStockItems.length}</span>
                      <span className="summary-stat-label">En Umbral Crítico / Reorden</span>
                    </div>
                    <div className="summary-stat-chip safe">
                      <span className="summary-stat-val text-safe">{inventory.length - lowStockItems.length}</span>
                      <span className="summary-stat-label">En Nivel Seguro</span>
                    </div>
                  </div>

                  {/* Toolbar */}
                  <div className="stock-config-toolbar">
                    <div className="search-wrap">
                      <Search size={14} className="search-icon" />
                      <input
                        type="text"
                        placeholder="Buscar por SKU, producto o almacén..."
                        value={thresholdSearch}
                        onChange={(e) => setThresholdSearch(e.target.value)}
                        className="search-input"
                      />
                    </div>

                    <div className="filter-chips-row">
                      <button
                        type="button"
                        className={`filter-pill-btn ${thresholdFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setThresholdFilter('all')}
                      >
                        Todos ({inventory.length})
                      </button>
                      <button
                        type="button"
                        className={`filter-pill-btn ${thresholdFilter === 'critical' ? 'active' : ''}`}
                        onClick={() => setThresholdFilter('critical')}
                      >
                        Bajo Umbral ({lowStockItems.length})
                      </button>
                      <button
                        type="button"
                        className={`filter-pill-btn ${thresholdFilter === 'safe' ? 'active' : ''}`}
                        onClick={() => setThresholdFilter('safe')}
                      >
                        Nivel Seguro ({inventory.length - lowStockItems.length})
                      </button>
                    </div>

                    <div className="warehouse-select-wrap">
                      <select
                        value={thresholdWarehouseFilter}
                        onChange={(e) => setThresholdWarehouseFilter(e.target.value)}
                        className="config-select"
                      >
                        <option value="all">Todos los almacenes</option>
                        {uniqueWarehouses.map((wh) => (
                          <option key={wh.id} value={wh.id}>
                            {wh.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="batch-threshold-tool">
                      <span className="batch-label">Fijar mín. masivo:</span>
                      <input
                        type="number"
                        min="0"
                        value={batchThresholdVal}
                        onChange={(e) => setBatchThresholdVal(Math.max(0, parseInt(e.target.value) || 0))}
                        className="batch-input"
                      />
                      <button
                        type="button"
                        className="button button-secondary batch-btn"
                        onClick={handleBatchSetThreshold}
                        title="Aplicar este umbral a todos los productos"
                      >
                        Aplicar a todos
                      </button>
                    </div>
                  </div>

                  {/* Tabla de Productos y Umbrales */}
                  <div className="table-responsive stock-config-table-wrap">
                    <table className="stock-config-table">
                      <thead>
                        <tr>
                          <th>Producto / SKU</th>
                          <th>Almacén</th>
                          <th style={{ textAlign: 'right' }}>Stock Disponible</th>
                          <th style={{ textAlign: 'center' }}>Umbral Mínimo</th>
                          <th>Estado de Stock</th>
                          <th style={{ textAlign: 'right' }}>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredConfigItems.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '28px', color: '#747875' }}>
                              No se encontraron productos con los filtros aplicados.
                            </td>
                          </tr>
                        ) : (
                          filteredConfigItems.map((item) => {
                            const isCritical = item.stock <= item.minStock
                            const meta = thresholdMetaById.get(item.id)
                            const sourceLabel =
                              meta?.source === 'category_override'
                                ? `Categoría (${meta.category} · Maestra)`
                                : meta?.source === 'category_inherit'
                                ? `Categoría (${meta.category})`
                                : 'Personalizado por SKU'
                            return (
                              <tr key={item.id} className={isCritical ? 'row-critical' : ''}>
                                <td>
                                  <div className="table-product-cell">
                                    <span className="sku-badge"><code>{item.sku}</code></span>
                                    <strong className="product-name">{item.name}</strong>
                                    {meta?.category && (
                                      <small style={{ color: '#747875', fontSize: '10px' }}>
                                        {meta.category}
                                      </small>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <span className="warehouse-label">{item.warehouseName}</span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <span className={`stock-qty ${isCritical ? 'stock-qty-critical' : ''}`}>
                                    {item.stock} {item.unitOfMeasure}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <div className="stepper-control">
                                    <button
                                      type="button"
                                      className="stepper-btn"
                                      onClick={() => handleStepItemThreshold(item.id, -1)}
                                      disabled={item.minStock <= 0}
                                      aria-label={`Disminuir umbral para ${item.sku}`}
                                    >
                                      <Minus size={12} />
                                    </button>
                                    <input
                                      type="number"
                                      min="0"
                                      value={item.minStock}
                                      onChange={(e) =>
                                        handleUpdateItemThreshold(item.id, parseInt(e.target.value) || 0)
                                      }
                                      className="stepper-input"
                                    />
                                    <button
                                      type="button"
                                      className="stepper-btn"
                                      onClick={() => handleStepItemThreshold(item.id, 1)}
                                      aria-label={`Aumentar umbral para ${item.sku}`}
                                    >
                                      <Plus size={12} />
                                    </button>
                                  </div>
                                  <div style={{ fontSize: '10px', color: '#747875', marginTop: '3px' }}>
                                    {sourceLabel}
                                  </div>
                                </td>
                                <td>
                                  {isCritical ? (
                                    <span className="stock-badge-critical">
                                      <AlertTriangle size={11} /> Bajo umbral mín.
                                    </span>
                                  ) : (
                                    <span className="stock-badge-safe">
                                      <CheckCircle2 size={11} /> Nivel seguro
                                    </span>
                                  )}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <button
                                    type="button"
                                    className="button button-ghost button-sm"
                                    onClick={() => {
                                      setShowStockConfigModal(false)
                                      onNavigateOperations('Inventario')
                                      toast.info(`Accediendo a inventario para gestionar ${item.sku}.`, 'Gestión de almacén')
                                    }}
                                  >
                                    Ver en Inventario <ArrowRight size={12} />
                                  </button>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Informative footer tip */}
                  <div className="threshold-info-tip">
                    <Info size={14} className="tip-icon" />
                    <span>
                      Los umbrales se sincronizan en tiempo real con el control de inventario de AES Nexus ERP. Si las existencias caen en o por debajo de este valor, se detonarán automáticamente las alertas push y los resúmenes por correo electrónico según las reglas configuradas.
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 2: NOTIFICACIONES PUSH */}
              {stockConfigTab === 'push' && (
                <div className="push-notify-body">
                  {/* Status Banner */}
                  <div className={`notify-status-banner ${pushConfig.enabled ? 'banner-active' : 'banner-inactive'}`}>
                    <div className="notify-status-text">
                      <div className="notify-status-label-row">
                        <span className={`status-indicator-dot ${pushConfig.enabled ? 'dot-active' : 'dot-inactive'}`} />
                        <strong>
                          {pushConfig.enabled
                            ? 'Notificaciones Push en navegador activadas'
                            : 'Notificaciones Push en navegador pausadas'}
                        </strong>
                        <span className={`push-permission-pill perm-${pushConfig.permission}`}>
                          {pushConfig.permission === 'granted'
                            ? '✓ Permiso concedido'
                            : pushConfig.permission === 'denied'
                            ? '✕ Permiso denegado'
                            : '! Permiso pendiente'}
                        </span>
                      </div>
                      <p>
                        {pushConfig.enabled
                          ? 'Recibirás avisos emergentes inmediatos en el escritorio y navegador cuando cualquier SKU caiga por debajo de su umbral de seguridad, incluso mientras estés en otra pestaña del ERP.'
                          : 'Las notificaciones push están pausadas. Activa este switch para recibir alertas sonoras y de escritorio en tiempo real.'}
                      </p>
                    </div>
                    <label
                      className="toggle-switch-wrap"
                      title={pushConfig.enabled ? 'Pausar notificaciones push' : 'Activar notificaciones push'}
                    >
                      <input
                        type="checkbox"
                        checked={pushConfig.enabled}
                        onChange={handleTogglePushEnabled}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>

                  {/* Permission Request Prompt if not granted */}
                  {pushConfig.permission !== 'granted' && (
                    <div className="push-permission-box">
                      <div className="permission-box-content">
                        <BellRing size={20} className="permission-icon" />
                        <div>
                          <strong>Permiso de notificaciones del navegador requerido</strong>
                          <p>
                            Para que el navegador pueda emitir alertas cuando minimices el dashboard o trabajes en otros módulos, autoriza las notificaciones push.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="button button-primary"
                        onClick={handleRequestPushPermission}
                      >
                        <Bell size={13} /> Solicitar permiso al navegador
                      </button>
                    </div>
                  )}

                  {/* Push Preferences Cards Grid */}
                  <div className="push-cards-grid">
                    <div className="push-config-card">
                      <div className="push-card-header">
                        <div className="push-card-icon-title">
                          <Volume2 size={16} className="card-icon" />
                          <div>
                            <strong>Alerta sonora (Chime Web Audio)</strong>
                            <p>Emite un tono audible discreto sintetizado en el navegador al disparar una alerta de stock crítico.</p>
                          </div>
                        </div>
                        <label className="toggle-switch-wrap">
                          <input
                            type="checkbox"
                            checked={pushConfig.sound}
                            onChange={(e) => {
                              const next = { ...pushConfig, sound: e.target.checked }
                              setPushConfig(next)
                              localStorage.setItem('nexus_stock_push_alerts_config', JSON.stringify(next))
                              if (e.target.checked) playNotificationChime()
                            }}
                          />
                          <span className="toggle-slider" />
                        </label>
                      </div>
                      <div className="push-card-footer">
                        <button
                          type="button"
                          className="button button-ghost button-sm"
                          onClick={playNotificationChime}
                        >
                          <Volume2 size={12} /> Probar sonido de alerta
                        </button>
                      </div>
                    </div>

                    <div className="push-config-card">
                      <div className="push-card-header">
                        <div className="push-card-icon-title">
                          <Smartphone size={16} className="card-icon" />
                          <div>
                            <strong>Vibración háptica</strong>
                            <p>Emite un patrón háptico de vibración en dispositivos móviles y tabletas compatibles al detectar un quiebre de stock.</p>
                          </div>
                        </div>
                        <label className="toggle-switch-wrap">
                          <input
                            type="checkbox"
                            checked={pushConfig.vibrate}
                            onChange={(e) => {
                              const next = { ...pushConfig, vibrate: e.target.checked }
                              setPushConfig(next)
                              localStorage.setItem('nexus_stock_push_alerts_config', JSON.stringify(next))
                            }}
                          />
                          <span className="toggle-slider" />
                        </label>
                      </div>
                      <div className="push-card-footer">
                        <span className="subtle-note">Patrón: [200ms, 100ms, 200ms] para máxima notoriedad operativa.</span>
                      </div>
                    </div>

                    <div className="push-config-card">
                      <div className="push-card-header">
                        <div className="push-card-icon-title">
                          <AlertTriangle size={16} className="card-icon" />
                          <div>
                            <strong>Prioridad alta e interrupción inmediata</strong>
                            <p>Fuerza la visualización emergente de la notificación push en primer plano sin agruparla en segundo plano.</p>
                          </div>
                        </div>
                        <label className="toggle-switch-wrap">
                          <input
                            type="checkbox"
                            checked={pushConfig.highPriority}
                            onChange={(e) => {
                              const next = { ...pushConfig, highPriority: e.target.checked }
                              setPushConfig(next)
                              localStorage.setItem('nexus_stock_push_alerts_config', JSON.stringify(next))
                            }}
                          />
                          <span className="toggle-slider" />
                        </label>
                      </div>
                      <div className="push-card-footer">
                        <span className="subtle-note">Recomendado para almacenes con alto volumen de rotación diaria.</span>
                      </div>
                    </div>
                  </div>

                  {/* Test Push Section */}
                  <div className="notify-test-preview-box">
                    <div className="test-preview-header">
                      <div className="test-preview-header-left">
                        <BellRing size={16} style={{ color: '#456a61' }} />
                        <div>
                          <strong>Simular Notificación Push de Emergencia</strong>
                          <p>Comprueba la llegada del aviso push en pantalla, el timbre sonoro y la alerta Toast integrada.</p>
                        </div>
                      </div>
                      <div className="test-preview-actions">
                        <button
                          type="button"
                          className="button button-primary btn-send-test"
                          onClick={handleSendTestPush}
                        >
                          <BellRing size={13} /> Probar Notificación Push Ahora
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: ALERTAS POR CORREO */}
              {stockConfigTab === 'email' && (
                <div className="email-notify-body">
                  {/* Switch Principal: Estado de las notificaciones */}
                  <div className={`notify-status-banner ${emailConfig.enabled ? 'banner-active' : 'banner-inactive'}`}>
                    <div className="notify-status-text">
                      <div className="notify-status-label-row">
                        <span className={`status-indicator-dot ${emailConfig.enabled ? 'dot-active' : 'dot-inactive'}`} />
                        <strong>{emailConfig.enabled ? 'Alertas por correo activadas' : 'Alertas por correo pausadas'}</strong>
                        <span className="status-badge-pill">
                          {emailConfig.enabled ? 'En tiempo real' : 'Inactivo'}
                        </span>
                      </div>
                      <p>
                        {emailConfig.enabled
                          ? `El sistema enviará un correo con el detalle de existencias a los destinatarios configurados cada vez que un producto alcance su umbral mínimo.`
                          : 'No se enviarán correos electrónicos cuando el inventario caiga por debajo del stock mínimo. Solo se mostrará la alerta en el dashboard.'}
                      </p>
                    </div>
                    <label className="toggle-switch-wrap" title={emailConfig.enabled ? 'Desactivar notificaciones' : 'Activar notificaciones'}>
                      <input
                        type="checkbox"
                        checked={emailConfig.enabled}
                        onChange={handleToggleEmailEnabled}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>

              {/* Formulario de Configuración */}
              <div className="notify-config-grid">
                {/* Columna Izquierda: Destinatarios & Alcance */}
                <div className="notify-config-col">
                  <div className="notify-card-box">
                    <div className="notify-card-title-row">
                      <h4>
                        <Users size={13} /> Destinatarios de correo ({emailConfig.recipients.length})
                      </h4>
                      <small>¿Quiénes recibirán el aviso?</small>
                    </div>

                    {/* Lista de Destinatarios */}
                    <div className="recipients-list">
                      {emailConfig.recipients.map((rec) => (
                        <div key={rec} className="recipient-chip">
                          <Mail size={11} className="chip-icon" />
                          <span className="chip-email">{rec}</span>
                          {rec === 'andres.escala.344@gmail.com' && (
                            <span className="chip-badge-primary">Principal</span>
                          )}
                          <button
                            type="button"
                            className="chip-remove-btn"
                            onClick={() => handleRemoveRecipient(rec)}
                            title={`Eliminar ${rec}`}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Agregar nuevo destinatario */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        handleAddRecipient()
                      }}
                      className="add-recipient-row"
                    >
                      <div className="add-email-input-wrap">
                        <input
                          type="email"
                          placeholder="nuevo.destinatario@empresa.com"
                          value={newEmailInput}
                          onChange={(e) => {
                            setNewEmailInput(e.target.value)
                            if (newEmailError) setNewEmailError('')
                          }}
                        />
                        <button
                          type="submit"
                          className="button button-secondary button-add-email"
                          disabled={!newEmailInput.trim()}
                        >
                          <Plus size={13} /> Agregar
                        </button>
                      </div>
                      {newEmailError && <span className="field-error-msg">{newEmailError}</span>}
                    </form>
                  </div>

                  {/* Alcance de Almacén */}
                  <div className="notify-card-box" style={{ marginTop: '12px' }}>
                    <div className="notify-card-title-row">
                      <h4>
                        <Package size={13} /> Alcance de almacenes
                      </h4>
                      <small>Filtra qué almacenes disparan el correo</small>
                    </div>

                    <select
                      className="notify-select"
                      value={emailConfig.selectedWarehouse}
                      onChange={(e) => {
                        const next = { ...emailConfig, selectedWarehouse: e.target.value }
                        setEmailConfig(next)
                        localStorage.setItem('nexus_stock_email_alerts_config', JSON.stringify(next))
                      }}
                    >
                      <option value="all">Todos los almacenes logísticos (Vallejo + Monterrey)</option>
                      <option value="wh_central">Solo Almacén Central Vallejo</option>
                      <option value="wh_norte">Solo Almacén Norte Monterrey</option>
                    </select>
                  </div>
                </div>

                {/* Columna Derecha: Frecuencia & Criterios */}
                <div className="notify-config-col">
                  <div className="notify-card-box">
                    <div className="notify-card-title-row">
                      <h4>
                        <Clock3 size={13} /> Frecuencia de envío
                      </h4>
                      <small>Momento en el que se despacha el email</small>
                    </div>

                    <div className="frequency-options">
                      <label className={`freq-option-card ${emailConfig.frequency === 'immediate' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="emailFrequency"
                          value="immediate"
                          checked={emailConfig.frequency === 'immediate'}
                          onChange={() => {
                            const next = { ...emailConfig, frequency: 'immediate' as const }
                            setEmailConfig(next)
                            localStorage.setItem('nexus_stock_email_alerts_config', JSON.stringify(next))
                          }}
                        />
                        <div className="freq-content">
                          <div className="freq-title">
                            <strong>⚡ Inmediata</strong>
                            <span className="rec-pill">Recomendado</span>
                          </div>
                          <p>Se envía un correo al instante en cuanto un movimiento de salida o ajuste deje el stock en o por debajo del umbral mínimo.</p>
                        </div>
                      </label>

                      <label className={`freq-option-card ${emailConfig.frequency === 'daily_morning' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="emailFrequency"
                          value="daily_morning"
                          checked={emailConfig.frequency === 'daily_morning'}
                          onChange={() => {
                            const next = { ...emailConfig, frequency: 'daily_morning' as const }
                            setEmailConfig(next)
                            localStorage.setItem('nexus_stock_email_alerts_config', JSON.stringify(next))
                          }}
                        />
                        <div className="freq-content">
                          <div className="freq-title">
                            <strong>🌅 Resumen diario matutino (08:00 hrs)</strong>
                          </div>
                          <p>Un único correo matutino con el consolidado de todos los artículos que amanecen bajo el límite de seguridad.</p>
                        </div>
                      </label>

                      <label className={`freq-option-card ${emailConfig.frequency === 'daily_evening' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="emailFrequency"
                          value="daily_evening"
                          checked={emailConfig.frequency === 'daily_evening'}
                          onChange={() => {
                            const next = { ...emailConfig, frequency: 'daily_evening' as const }
                            setEmailConfig(next)
                            localStorage.setItem('nexus_stock_email_alerts_config', JSON.stringify(next))
                          }}
                        />
                        <div className="freq-content">
                          <div className="freq-title">
                            <strong>🌙 Resumen vespertino (18:00 hrs)</strong>
                          </div>
                          <p>Consolidado al cierre de operaciones para preparar órdenes de compra con proveedores al día siguiente.</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Criterios y Opciones adicionales */}
                  <div className="notify-card-box" style={{ marginTop: '12px' }}>
                    <div className="notify-card-title-row">
                      <h4>
                        <Sliders size={13} /> Contenido y opciones del correo
                      </h4>
                      <small>Personaliza el correo automático</small>
                    </div>

                    <div className="checkbox-options-list">
                      <label className="checkbox-option-row">
                        <input
                          type="checkbox"
                          checked={emailConfig.includePurchaseLink}
                          onChange={(e) => {
                            const next = { ...emailConfig, includePurchaseLink: e.target.checked }
                            setEmailConfig(next)
                            localStorage.setItem('nexus_stock_email_alerts_config', JSON.stringify(next))
                          }}
                        />
                        <div>
                          <strong>Incluir botón de compra automática</strong>
                          <span>Agrega un botón en el correo para crear la orden de compra con el proveedor predeterminado en 1 clic.</span>
                        </div>
                      </label>

                      <label className="checkbox-option-row">
                        <input
                          type="checkbox"
                          checked={emailConfig.includeAttachment}
                          onChange={(e) => {
                            const next = { ...emailConfig, includeAttachment: e.target.checked }
                            setEmailConfig(next)
                            localStorage.setItem('nexus_stock_email_alerts_config', JSON.stringify(next))
                          }}
                        />
                        <div>
                          <strong>Adjuntar reporte CSV/PDF de existencias</strong>
                          <span>Adjunta la hoja de cálculo con el kardex y rotación del producto alertado.</span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección de Prueba y Vista Previa del Correo */}
              <div className="notify-test-preview-box">
                <div className="test-preview-header">
                  <div className="test-preview-header-left">
                    <Mail size={14} style={{ color: '#456a61' }} />
                    <div>
                      <strong>Simulación y prueba de entrega</strong>
                      <p>Verifica cómo recibirán tus colaboradores el correo electrónico antes de activar las alertas automáticas.</p>
                    </div>
                  </div>

                  <div className="test-preview-actions">
                    <button
                      type="button"
                      className="button button-ghost"
                      onClick={() => setShowPreviewTemplate(!showPreviewTemplate)}
                    >
                      {showPreviewTemplate ? 'Ocultar plantilla' : 'Ver plantilla de correo'}
                    </button>
                    <button
                      type="button"
                      className="button button-secondary btn-send-test"
                      disabled={isSendingTest || !emailConfig.enabled || emailConfig.recipients.length === 0}
                      onClick={handleSendTestEmail}
                      title="Despachar un correo de prueba a los destinatarios configurados"
                    >
                      <Send size={13} /> {isSendingTest ? 'Enviando correo...' : 'Enviar correo de prueba ahora'}
                    </button>
                  </div>
                </div>

                {lastTestSentAt && (
                  <div className="test-sent-confirmation">
                    <CheckCircle2 size={13} style={{ color: '#3c7d5c' }} />
                    <span>Último correo de prueba despachado a las <strong>{lastTestSentAt}</strong> hacia <strong>{emailConfig.recipients.join(', ')}</strong>.</span>
                  </div>
                )}

                {/* Plantilla simulada de correo */}
                {showPreviewTemplate && (
                  <div className="email-preview-envelope">
                    <div className="email-preview-topbar">
                      <div>
                        <span className="email-meta-label">De:</span>
                        <span className="email-meta-val">AES Nexus ERP &lt;alertas-stock@nexus-erp.com&gt;</span>
                      </div>
                      <div>
                        <span className="email-meta-label">Para:</span>
                        <span className="email-meta-val">{emailConfig.recipients.join(', ')}</span>
                      </div>
                      <div>
                        <span className="email-meta-label">Asunto:</span>
                        <strong className="email-meta-val text-alert">
                          [ALERTA DE INVENTARIO] ⚠️ {lowStockItems.length > 0 ? lowStockItems.length : 1} producto(s) en o por debajo de su umbral mínimo de stock
                        </strong>
                      </div>
                    </div>

                    <div className="email-preview-body">
                      <div className="email-brand-banner">
                        <span className="brand-dot">✳</span>
                        <strong>AES Nexus ERP · Notificación de Control Operativo</strong>
                      </div>

                      <h3 className="email-heading">Alerta de Existencias Críticas en Almacén</h3>
                      <p className="email-intro">
                        Estimado equipo de Compras y Operaciones,
                        <br />
                        Se ha registrado una variación en las existencias que sitúa a los siguientes productos en o por debajo del umbral mínimo de seguridad establecido:
                      </p>

                      <div className="email-table-wrap">
                        <table className="email-table">
                          <thead>
                            <tr>
                              <th>SKU</th>
                              <th>PRODUCTO</th>
                              <th>ALMACÉN</th>
                              <th style={{ textAlign: 'right' }}>STOCK DISP.</th>
                              <th style={{ textAlign: 'right' }}>UMBRAL MÍN.</th>
                              <th>ESTADO</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(lowStockItems.length > 0 ? lowStockItems : [
                              { id: 'sample', sku: 'HW-SRV-RACK', name: 'Servidor Rack 1U Xeon 64GB ECC', warehouseName: 'Almacén Central Vallejo', stock: 2, minStock: 3, unitOfMeasure: 'Pza' }
                            ]).map((item) => (
                              <tr key={item.id}>
                                <td><code>{item.sku}</code></td>
                                <td><strong>{item.name}</strong></td>
                                <td>{item.warehouseName}</td>
                                <td style={{ textAlign: 'right', color: '#ba4836', fontWeight: 700 }}>
                                  {item.stock} {item.unitOfMeasure}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  {item.minStock} {item.unitOfMeasure}
                                </td>
                                <td>
                                  <span className="email-alert-pill">Reorden necesario</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {emailConfig.includePurchaseLink && (
                        <div className="email-cta-box">
                          <span className="email-btn-mock">
                            <Package size={13} /> Generar Orden de Compra Automática en Nexus ERP &rarr;
                          </span>
                        </div>
                      )}

                      {emailConfig.includeAttachment && (
                        <div className="email-attachment-box">
                          <span>📎 Archivo adjunto: <code>reporte_existencias_criticas_{new Date().toISOString().slice(0, 10)}.pdf</code> (184 KB)</span>
                        </div>
                      )}

                      <div className="email-footer-note">
                        Has recibido este correo porque tu dirección está configurada en las reglas de notificación de umbrales mínimos de stock de AES Nexus ERP.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

            <div className="create-modal-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setShowStockConfigModal(false)}
              >
                Cerrar
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={handleSaveAllStockConfig}
              >
                <Check size={14} /> Guardar cambios y sincronizar
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
