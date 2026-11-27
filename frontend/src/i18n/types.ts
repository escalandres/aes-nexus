export type SupportedLocale = 'es-MX' | 'es-ES' | 'en-US' | 'pt-BR'

export type DateDisplayFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
export type NumberSeparatorFormat = 'comma_dot' | 'dot_comma'
export type WeekStartDay = 'monday' | 'sunday'

export interface RegionalSettings {
  language: SupportedLocale
  timezone: string
  dateFormat: DateDisplayFormat
  numberFormat: NumberSeparatorFormat
  firstDayOfWeek: WeekStartDay
}

export const DEFAULT_REGIONAL_SETTINGS: RegionalSettings = {
  language: 'es-MX',
  timezone: 'America/Mexico_City',
  dateFormat: 'DD/MM/YYYY',
  numberFormat: 'comma_dot',
  firstDayOfWeek: 'monday',
}

export function normalizeLocale(value?: string): SupportedLocale {
  if (value === 'es-ES' || value === 'en-US' || value === 'pt-BR' || value === 'es-MX') {
    return value
  }
  return 'es-MX'
}
