export interface MarginAlertSettings {
  enabled: boolean
  operatingMarginTargetPct: number
  netMarginTargetPct: number
  operatingAlertActive: boolean
  netAlertActive: boolean
  notifyInAppToast: boolean
  notifyNotificationCenter: boolean
  updatedAt: string
}

export interface TriggeredMarginAlert {
  id: 'operating' | 'net'
  metricLabel: string
  currentPct: number
  targetPct: number
  gapPts: number
  currentAmount: number
  severity: 'warning' | 'critical'
  message: string
}

export interface MarginAlertEvaluation {
  isEvaluated: boolean
  operatingBreached: boolean
  netBreached: boolean
  operatingGapPts: number
  netGapPts: number
  triggeredAlerts: TriggeredMarginAlert[]
}

export const MARGIN_ALERTS_STORAGE_KEY = 'aes_nexus_pnl_margin_alerts_v1'
export const MARGIN_ALERTS_CHANGED_EVENT = 'aes_nexus_pnl_margin_alerts_changed'

export const DEFAULT_MARGIN_ALERT_SETTINGS: MarginAlertSettings = {
  enabled: true,
  operatingMarginTargetPct: 20,
  netMarginTargetPct: 12,
  operatingAlertActive: true,
  netAlertActive: true,
  notifyInAppToast: true,
  notifyNotificationCenter: true,
  updatedAt: '',
}

function clampPct(value: unknown, fallback: number): number {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.max(0, Math.min(80, Math.round(num * 10) / 10))
}

export function loadMarginAlertSettings(): MarginAlertSettings {
  if (typeof window === 'undefined') return DEFAULT_MARGIN_ALERT_SETTINGS
  try {
    const raw = window.localStorage.getItem(MARGIN_ALERTS_STORAGE_KEY)
    if (!raw) return DEFAULT_MARGIN_ALERT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<MarginAlertSettings>
    return {
      enabled:
        typeof parsed.enabled === 'boolean'
          ? parsed.enabled
          : DEFAULT_MARGIN_ALERT_SETTINGS.enabled,
      operatingMarginTargetPct: clampPct(
        parsed.operatingMarginTargetPct,
        DEFAULT_MARGIN_ALERT_SETTINGS.operatingMarginTargetPct
      ),
      netMarginTargetPct: clampPct(
        parsed.netMarginTargetPct,
        DEFAULT_MARGIN_ALERT_SETTINGS.netMarginTargetPct
      ),
      operatingAlertActive:
        typeof parsed.operatingAlertActive === 'boolean'
          ? parsed.operatingAlertActive
          : DEFAULT_MARGIN_ALERT_SETTINGS.operatingAlertActive,
      netAlertActive:
        typeof parsed.netAlertActive === 'boolean'
          ? parsed.netAlertActive
          : DEFAULT_MARGIN_ALERT_SETTINGS.netAlertActive,
      notifyInAppToast:
        typeof parsed.notifyInAppToast === 'boolean'
          ? parsed.notifyInAppToast
          : DEFAULT_MARGIN_ALERT_SETTINGS.notifyInAppToast,
      notifyNotificationCenter:
        typeof parsed.notifyNotificationCenter === 'boolean'
          ? parsed.notifyNotificationCenter
          : DEFAULT_MARGIN_ALERT_SETTINGS.notifyNotificationCenter,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    }
  } catch {
    return DEFAULT_MARGIN_ALERT_SETTINGS
  }
}

export function saveMarginAlertSettings(settings: MarginAlertSettings): void {
  if (typeof window === 'undefined') return
  const normalized: MarginAlertSettings = {
    ...settings,
    operatingMarginTargetPct: clampPct(
      settings.operatingMarginTargetPct,
      DEFAULT_MARGIN_ALERT_SETTINGS.operatingMarginTargetPct
    ),
    netMarginTargetPct: clampPct(
      settings.netMarginTargetPct,
      DEFAULT_MARGIN_ALERT_SETTINGS.netMarginTargetPct
    ),
    updatedAt: settings.updatedAt || new Date().toISOString(),
  }
  try {
    window.localStorage.setItem(MARGIN_ALERTS_STORAGE_KEY, JSON.stringify(normalized))
    window.dispatchEvent(
      new CustomEvent(MARGIN_ALERTS_CHANGED_EVENT, { detail: normalized })
    )
  } catch {
    // ignore storage quota errors
  }
}

export function evaluateMarginAlerts(params: {
  operatingMarginPct: number
  netMarginPct: number
  operatingIncome: number
  netIncome: number
  totalRevenue: number
  settings: MarginAlertSettings
}): MarginAlertEvaluation {
  const {
    operatingMarginPct,
    netMarginPct,
    operatingIncome,
    netIncome,
    totalRevenue,
    settings,
  } = params

  const isEvaluated =
    totalRevenue > 0 || operatingIncome !== 0 || netIncome !== 0

  const operatingGapPts = operatingMarginPct - settings.operatingMarginTargetPct
  const netGapPts = netMarginPct - settings.netMarginTargetPct

  const operatingBreached =
    isEvaluated &&
    settings.enabled &&
    settings.operatingAlertActive &&
    operatingMarginPct < settings.operatingMarginTargetPct

  const netBreached =
    isEvaluated &&
    settings.enabled &&
    settings.netAlertActive &&
    netMarginPct < settings.netMarginTargetPct

  const triggeredAlerts: TriggeredMarginAlert[] = []

  if (operatingBreached) {
    const gapAbs = Math.abs(operatingGapPts)
    const severity: 'warning' | 'critical' =
      operatingMarginPct < 0 || gapAbs >= 5 ? 'critical' : 'warning'
    triggeredAlerts.push({
      id: 'operating',
      metricLabel: 'Margen operativo (EBIT)',
      currentPct: operatingMarginPct,
      targetPct: settings.operatingMarginTargetPct,
      gapPts: operatingGapPts,
      currentAmount: operatingIncome,
      severity,
      message: `Margen operativo en ${operatingMarginPct.toFixed(1)}%, por debajo del objetivo de ${settings.operatingMarginTargetPct.toFixed(1)}% (${operatingGapPts.toFixed(1)} pts).`,
    })
  }

  if (netBreached) {
    const gapAbs = Math.abs(netGapPts)
    const severity: 'warning' | 'critical' =
      netMarginPct < 0 || gapAbs >= 5 ? 'critical' : 'warning'
    triggeredAlerts.push({
      id: 'net',
      metricLabel: 'Margen neto',
      currentPct: netMarginPct,
      targetPct: settings.netMarginTargetPct,
      gapPts: netGapPts,
      currentAmount: netIncome,
      severity,
      message: `Margen neto en ${netMarginPct.toFixed(1)}%, por debajo del objetivo de ${settings.netMarginTargetPct.toFixed(1)}% (${netGapPts.toFixed(1)} pts).`,
    })
  }

  return {
    isEvaluated,
    operatingBreached,
    netBreached,
    operatingGapPts,
    netGapPts,
    triggeredAlerts,
  }
}
