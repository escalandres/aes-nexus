export type PrimaryDisplayCurrency = 'MXN' | 'USD' | 'EUR' | 'VES'

export interface DisplayCurrencyOption {
  code: PrimaryDisplayCurrency
  label: string
  shortLabel: string
  symbol: string
}

/**
 * Simulated FX reference table expressed as MXN per 1 unit of currency.
 * Designed as an isolated service so the future backend FX provider can
 * replace these static rates without changing UI components.
 */
export const SIMULATED_FX_RATES_TO_MXN: Record<string, number> = {
  MXN: 1,
  USD: 17.5,
  EUR: 19.1,
  VES: 0.39,
  COP: 0.0042,
  BRL: 3.05,
}

export const SIMULATED_FX_UPDATED_LABEL = 'Tasa simulada de referencia'

export const DISPLAY_CURRENCY_OPTIONS: ReadonlyArray<DisplayCurrencyOption> = [
  { code: 'MXN', label: 'MXN · Peso mexicano', shortLabel: 'MXN', symbol: '$' },
  { code: 'USD', label: 'USD · Dólar EE.UU.', shortLabel: 'USD', symbol: 'US$' },
  { code: 'EUR', label: 'EUR · Euro', shortLabel: 'EUR', symbol: '€' },
  { code: 'VES', label: 'VES · Bolívar', shortLabel: 'VES', symbol: 'Bs.' },
]

export function normalizeCurrencyCode(currency?: string): string {
  const code = String(currency || 'MXN').trim().toUpperCase()
  return SIMULATED_FX_RATES_TO_MXN[code] ? code : 'MXN'
}

export function getRateToMxn(currency?: string): number {
  const code = normalizeCurrencyCode(currency)
  return SIMULATED_FX_RATES_TO_MXN[code] ?? 1
}

export function getExchangeRate(fromCurrency: string = 'MXN', toCurrency: string = 'MXN'): number {
  const from = normalizeCurrencyCode(fromCurrency)
  const to = normalizeCurrencyCode(toCurrency)
  if (from === to) return 1
  const fromMxn = getRateToMxn(from)
  const toMxn = getRateToMxn(to)
  return fromMxn / toMxn
}

export function convertCurrency(
  amount: number,
  fromCurrency: string = 'MXN',
  toCurrency: string = 'MXN'
): number {
  if (!Number.isFinite(amount)) return 0
  const from = normalizeCurrencyCode(fromCurrency)
  const to = normalizeCurrencyCode(toCurrency)
  if (from === to) return amount
  return amount * getExchangeRate(from, to)
}

export function getCurrencySymbol(currency?: string): string {
  const code = normalizeCurrencyCode(currency)
  const match = DISPLAY_CURRENCY_OPTIONS.find((item) => item.code === code)
  if (match) return match.symbol
  if (code === 'BRL') return 'R$'
  return '$'
}

export function getRateSummaryLabel(targetCurrency: string = 'MXN'): string {
  const code = normalizeCurrencyCode(targetCurrency)
  if (code === 'MXN') return 'Base operativa 1.00 MXN'
  const rateFromMxn = getExchangeRate('MXN', code)
  const rateToMxn = getRateToMxn(code)
  if (rateToMxn >= 1) {
    return `1 ${code} = ${rateToMxn.toFixed(2)} MXN (${SIMULATED_FX_UPDATED_LABEL.toLowerCase()})`
  }
  return `1 MXN = ${rateFromMxn.toFixed(2)} ${code} (${SIMULATED_FX_UPDATED_LABEL.toLowerCase()})`
}

export function getStoredReportingCurrency(): string {
  if (typeof window === 'undefined') return 'MXN'
  try {
    const saved = window.localStorage.getItem('aes_nexus_settings_general')
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed?.reportingCurrency) {
        return normalizeCurrencyCode(parsed.reportingCurrency)
      }
    }
  } catch {
    // fallback
  }
  return 'MXN'
}
