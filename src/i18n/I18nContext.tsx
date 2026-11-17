import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { findCountry } from '../components/CountryDropdown'
import {
  getDefaultTimezoneForCountry,
  getTimezonesForCountry,
  resolveCountryCode,
  type TimezoneOption,
} from './timezones'
import { translate, type TranslationKey } from './translations'
import {
  DEFAULT_REGIONAL_SETTINGS,
  normalizeLocale,
  type RegionalSettings,
  type SupportedLocale,
} from './types'

interface I18nContextValue {
  locale: SupportedLocale
  regional: RegionalSettings
  mainCountry: string
  mainCountryName: string
  reportingCurrency: string
  countryTimezones: TimezoneOption[]
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
  updateRegional: (next: RegionalSettings) => void
  updateGeneralLocalization: (mainCountry: string, reportingCurrency?: string) => void
  formatDate: (date?: Date) => string
  formatTime: (date?: Date) => string
  formatNumber: (value: number, decimals?: number) => string
  formatCurrency: (value: number, currencyOverride?: string, decimals?: number) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function loadInitialGeneralLocalization(): { mainCountry: string; reportingCurrency: string } {
  try {
    const saved = localStorage.getItem('aes_nexus_settings_general')
    if (saved) {
      const parsed = JSON.parse(saved)
      return {
        mainCountry: resolveCountryCode(parsed.mainCountry || 'MX'),
        reportingCurrency: parsed.reportingCurrency || 'MXN',
      }
    }
  } catch {
    // fallback
  }
  return { mainCountry: 'MX', reportingCurrency: 'MXN' }
}

function loadInitialRegional(countryCode: string): RegionalSettings {
  const countryTzs = getTimezonesForCountry(countryCode)
  const fallbackTz = countryTzs[0]?.id || DEFAULT_REGIONAL_SETTINGS.timezone
  try {
    const saved = localStorage.getItem('aes_nexus_settings_regional')
    if (saved) {
      const parsed = JSON.parse(saved)
      const tzValid = countryTzs.some((t) => t.id === parsed.timezone)
      return {
        language: normalizeLocale(parsed.language),
        timezone: tzValid ? parsed.timezone : fallbackTz,
        dateFormat:
          parsed.dateFormat === 'MM/DD/YYYY' || parsed.dateFormat === 'YYYY-MM-DD'
            ? parsed.dateFormat
            : 'DD/MM/YYYY',
        numberFormat: parsed.numberFormat === 'dot_comma' ? 'dot_comma' : 'comma_dot',
        firstDayOfWeek: parsed.firstDayOfWeek === 'sunday' ? 'sunday' : 'monday',
      }
    }
  } catch {
    // fallback
  }
  return {
    ...DEFAULT_REGIONAL_SETTINGS,
    timezone: fallbackTz,
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const initialGen = loadInitialGeneralLocalization()
  const [mainCountry, setMainCountry] = useState<string>(initialGen.mainCountry)
  const [reportingCurrency, setReportingCurrency] = useState<string>(initialGen.reportingCurrency)
  const [regional, setRegional] = useState<RegionalSettings>(() =>
    loadInitialRegional(initialGen.mainCountry)
  )

  const countryTimezones = useMemo(() => getTimezonesForCountry(mainCountry), [mainCountry])
  const mainCountryName = useMemo(
    () => findCountry(mainCountry)?.name || mainCountry,
    [mainCountry]
  )

  useEffect(() => {
    document.documentElement.lang = regional.language
  }, [regional.language])

  const updateRegional = (next: RegionalSettings) => {
    const normalized: RegionalSettings = {
      ...next,
      language: normalizeLocale(next.language),
    }
    setRegional(normalized)
    try {
      localStorage.setItem('aes_nexus_settings_regional', JSON.stringify(normalized))
    } catch {
      // ignore storage quota errors
    }
  }

  const updateGeneralLocalization = (countryInput: string, currencyOverride?: string) => {
    const resolvedCode = resolveCountryCode(countryInput)
    setMainCountry(resolvedCode)
    if (currencyOverride) {
      setReportingCurrency(currencyOverride)
    }

    const nextCountryTzs = getTimezonesForCountry(resolvedCode)
    setRegional((prev) => {
      const isCurrentValid = nextCountryTzs.some((tz) => tz.id === prev.timezone)
      if (isCurrentValid) return prev
      const nextTz = getDefaultTimezoneForCountry(resolvedCode)
      const updated = { ...prev, timezone: nextTz }
      try {
        localStorage.setItem('aes_nexus_settings_regional', JSON.stringify(updated))
      } catch {
        // ignore
      }
      return updated
    })
  }

  const value = useMemo<I18nContextValue>(() => {
    const intlLocale = regional.numberFormat === 'dot_comma' ? 'es-ES' : regional.language

    const formatDate = (date: Date = new Date()) => {
      try {
        const parts = new Intl.DateTimeFormat('en-CA', {
          timeZone: regional.timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).formatToParts(date)
        const y = parts.find((p) => p.type === 'year')?.value || '2026'
        const m = parts.find((p) => p.type === 'month')?.value || '11'
        const d = parts.find((p) => p.type === 'day')?.value || '15'
        if (regional.dateFormat === 'MM/DD/YYYY') return `${m}/${d}/${y}`
        if (regional.dateFormat === 'YYYY-MM-DD') return `${y}-${m}-${d}`
        return `${d}/${m}/${y}`
      } catch {
        return '15/11/2026'
      }
    }

    const formatTime = (date: Date = new Date()) => {
      try {
        return new Intl.DateTimeFormat(regional.language, {
          timeZone: regional.timezone,
          hour: '2-digit',
          minute: '2-digit',
        }).format(date)
      } catch {
        return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
      }
    }

    const formatNumber = (num: number, decimals = 2) =>
      new Intl.NumberFormat(intlLocale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(num)

    const formatCurrency = (num: number, currencyOverride?: string, decimals = 2) =>
      new Intl.NumberFormat(intlLocale, {
        style: 'currency',
        currency: currencyOverride || reportingCurrency || 'MXN',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(num)

    return {
      locale: regional.language,
      regional,
      mainCountry,
      mainCountryName,
      reportingCurrency,
      countryTimezones,
      t: (key, vars) => translate(regional.language, key, vars),
      updateRegional,
      updateGeneralLocalization,
      formatDate,
      formatTime,
      formatNumber,
      formatCurrency,
    }
  }, [regional, mainCountry, mainCountryName, reportingCurrency, countryTimezones])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useI18n must be used inside an I18nProvider')
  }
  return ctx
}
