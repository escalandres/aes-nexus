import { findCountry } from '../components/CountryDropdown'

export interface TimezoneEntry {
  id: string
  label: string
  cities: string
}

export interface TimezoneOption extends TimezoneEntry {
  offsetLabel: string
  displayLabel: string
}

const COUNTRY_TIMEZONES: Record<string, TimezoneEntry[]> = {
  MX: [
    { id: 'America/Mexico_City', label: 'Centro de México', cities: 'Ciudad de México, Guadalajara, Puebla' },
    { id: 'America/Monterrey', label: 'Noreste de México', cities: 'Monterrey, Saltillo, Tampico' },
    { id: 'America/Cancun', label: 'Sureste (Quintana Roo)', cities: 'Cancún, Playa del Carmen, Chetumal' },
    { id: 'America/Chihuahua', label: 'Zona Montaña / Norte', cities: 'Chihuahua, Torreón' },
    { id: 'America/Hermosillo', label: 'Pacífico (Sonora)', cities: 'Hermosillo, Ciudad Obregón' },
    { id: 'America/Tijuana', label: 'Noroeste (Baja California)', cities: 'Tijuana, Mexicali, Ensenada' },
  ],
  US: [
    { id: 'America/New_York', label: 'Eastern Time (ET)', cities: 'New York, Miami, Atlanta, Boston' },
    { id: 'America/Chicago', label: 'Central Time (CT)', cities: 'Chicago, Dallas, Houston, Austin' },
    { id: 'America/Denver', label: 'Mountain Time (MT)', cities: 'Denver, Salt Lake City' },
    { id: 'America/Phoenix', label: 'Arizona (MST)', cities: 'Phoenix, Tucson' },
    { id: 'America/Los_Angeles', label: 'Pacific Time (PT)', cities: 'Los Angeles, San Francisco, Seattle' },
    { id: 'America/Anchorage', label: 'Alaska Time (AKT)', cities: 'Anchorage, Fairbanks' },
    { id: 'Pacific/Honolulu', label: 'Hawaii-Aleutian (HST)', cities: 'Honolulu' },
  ],
  CA: [
    { id: 'America/Toronto', label: 'Eastern Time', cities: 'Toronto, Ottawa, Montreal' },
    { id: 'America/Winnipeg', label: 'Central Time', cities: 'Winnipeg' },
    { id: 'America/Edmonton', label: 'Mountain Time', cities: 'Calgary, Edmonton' },
    { id: 'America/Vancouver', label: 'Pacific Time', cities: 'Vancouver, Victoria' },
    { id: 'America/Halifax', label: 'Atlantic Time', cities: 'Halifax' },
  ],
  ES: [
    { id: 'Europe/Madrid', label: 'España Peninsular y Baleares', cities: 'Madrid, Barcelona, Valencia, Bilbao' },
    { id: 'Atlantic/Canary', label: 'Islas Canarias', cities: 'Las Palmas, Santa Cruz de Tenerife' },
  ],
  CO: [{ id: 'America/Bogota', label: 'Hora de Colombia', cities: 'Bogotá, Medellín, Cali, Barranquilla' }],
  AR: [{ id: 'America/Argentina/Buenos_Aires', label: 'Hora de Argentina', cities: 'Buenos Aires, Córdoba, Rosario' }],
  CL: [
    { id: 'America/Santiago', label: 'Chile Continental', cities: 'Santiago, Valparaíso, Concepción' },
    { id: 'Pacific/Easter', label: 'Isla de Pascua', cities: 'Rapa Nui' },
  ],
  PE: [{ id: 'America/Lima', label: 'Hora de Perú', cities: 'Lima, Arequipa, Trujillo' }],
  BR: [
    { id: 'America/Sao_Paulo', label: 'Horário de Brasília', cities: 'São Paulo, Rio de Janeiro, Brasília' },
    { id: 'America/Manaus', label: 'Horário do Amazonas', cities: 'Manaus, Porto Velho' },
    { id: 'America/Cuiaba', label: 'Centro-Oeste (MT/MS)', cities: 'Cuiabá, Campo Grande' },
    { id: 'America/Rio_Branco', label: 'Horário do Acre', cities: 'Rio Branco' },
  ],
  EC: [
    { id: 'America/Guayaquil', label: 'Ecuador Continental', cities: 'Quito, Guayaquil, Cuenca' },
    { id: 'Pacific/Galapagos', label: 'Islas Galápagos', cities: 'Puerto Ayora' },
  ],
  UY: [{ id: 'America/Montevideo', label: 'Hora de Uruguay', cities: 'Montevideo, Punta del Este' }],
  PY: [{ id: 'America/Asuncion', label: 'Hora de Paraguay', cities: 'Asunción, Ciudad del Este' }],
  BO: [{ id: 'America/La_Paz', label: 'Hora de Bolivia', cities: 'La Paz, Santa Cruz, Cochabamba' }],
  VE: [{ id: 'America/Caracas', label: 'Hora de Venezuela', cities: 'Caracas, Maracaibo, Valencia' }],
  PA: [{ id: 'America/Panama', label: 'Hora de Panamá', cities: 'Ciudad de Panamá, Colón' }],
  CR: [{ id: 'America/Costa_Rica', label: 'Hora de Costa Rica', cities: 'San José, Alajuela' }],
  GT: [{ id: 'America/Guatemala', label: 'Hora de Guatemala', cities: 'Ciudad de Guatemala, Quetzaltenango' }],
  HN: [{ id: 'America/Tegucigalpa', label: 'Hora de Honduras', cities: 'Tegucigalpa, San Pedro Sula' }],
  SV: [{ id: 'America/El_Salvador', label: 'Hora de El Salvador', cities: 'San Salvador, Santa Ana' }],
  NI: [{ id: 'America/Managua', label: 'Hora de Nicaragua', cities: 'Managua, León' }],
  DO: [{ id: 'America/Santo_Domingo', label: 'República Dominicana', cities: 'Santo Domingo, Santiago' }],
  PR: [{ id: 'America/Puerto_Rico', label: 'Atlantic Standard Time', cities: 'San Juan, Ponce' }],
  GB: [{ id: 'Europe/London', label: 'Reino Unido (GMT/BST)', cities: 'Londres, Manchester, Edimburgo' }],
  DE: [{ id: 'Europe/Berlin', label: 'Europa Central (CET)', cities: 'Berlín, Múnich, Fráncfort' }],
  FR: [{ id: 'Europe/Paris', label: 'Europa Central (CET)', cities: 'París, Lyon, Marsella' }],
  IT: [{ id: 'Europe/Rome', label: 'Europa Central (CET)', cities: 'Roma, Milán, Turín' }],
  PT: [
    { id: 'Europe/Lisbon', label: 'Portugal Continental', cities: 'Lisboa, Oporto' },
    { id: 'Atlantic/Azores', label: 'Azores', cities: 'Ponta Delgada' },
  ],
  NL: [{ id: 'Europe/Amsterdam', label: 'Países Bajos', cities: 'Ámsterdam, Róterdam' }],
  BE: [{ id: 'Europe/Brussels', label: 'Bélgica', cities: 'Bruselas, Amberes' }],
  CH: [{ id: 'Europe/Zurich', label: 'Suiza', cities: 'Zúrich, Ginebra, Basilea' }],
  AT: [{ id: 'Europe/Vienna', label: 'Austria', cities: 'Viena, Salzburgo' }],
  CZ: [{ id: 'Europe/Prague', label: 'República Checa', cities: 'Praga, Brno' }],
  DK: [{ id: 'Europe/Copenhagen', label: 'Dinamarca', cities: 'Copenhague, Aarhus' }],
  EE: [{ id: 'Europe/Tallinn', label: 'Estonia', cities: 'Tallin' }],
  FI: [{ id: 'Europe/Helsinki', label: 'Finlandia', cities: 'Helsinki, Tampere' }],
  GR: [{ id: 'Europe/Athens', label: 'Grecia', cities: 'Atenas, Salónica' }],
  HR: [{ id: 'Europe/Zagreb', label: 'Croacia', cities: 'Zagreb, Split' }],
  HU: [{ id: 'Europe/Budapest', label: 'Hungría', cities: 'Budapest' }],
  IE: [{ id: 'Europe/Dublin', label: 'Irlanda', cities: 'Dublín, Cork' }],
  LT: [{ id: 'Europe/Vilnius', label: 'Lituania', cities: 'Vilna' }],
  LU: [{ id: 'Europe/Luxembourg', label: 'Luxemburgo', cities: 'Ciudad de Luxemburgo' }],
  LV: [{ id: 'Europe/Riga', label: 'Letonia', cities: 'Riga' }],
  MT: [{ id: 'Europe/Malta', label: 'Malta', cities: 'La Valeta' }],
  NO: [{ id: 'Europe/Oslo', label: 'Noruega', cities: 'Oslo, Bergen' }],
  PL: [{ id: 'Europe/Warsaw', label: 'Polonia', cities: 'Varsovia, Cracovia' }],
  RO: [{ id: 'Europe/Bucharest', label: 'Rumania', cities: 'Bucarest, Cluj-Napoca' }],
  SE: [{ id: 'Europe/Stockholm', label: 'Suecia', cities: 'Estocolmo, Gotemburgo' }],
  SI: [{ id: 'Europe/Ljubljana', label: 'Eslovenia', cities: 'Liubliana' }],
  SK: [{ id: 'Europe/Bratislava', label: 'Eslovaquia', cities: 'Bratislava' }],
  AU: [
    { id: 'Australia/Sydney', label: 'Eastern Time (AEST)', cities: 'Sídney, Melbourne, Canberra' },
    { id: 'Australia/Brisbane', label: 'Queensland (AEST)', cities: 'Brisbane' },
    { id: 'Australia/Adelaide', label: 'Central Time (ACST)', cities: 'Adelaida' },
    { id: 'Australia/Perth', label: 'Western Time (AWST)', cities: 'Perth' },
  ],
  NZ: [{ id: 'Pacific/Auckland', label: 'Nueva Zelanda', cities: 'Auckland, Wellington' }],
  FJ: [{ id: 'Pacific/Fiji', label: 'Fiyi', cities: 'Suva' }],
  PG: [{ id: 'Pacific/Port_Moresby', label: 'Papúa Nueva Guinea', cities: 'Port Moresby' }],
  CN: [{ id: 'Asia/Shanghai', label: 'Hora Estándar de China', cities: 'Shanghái, Pekín, Shenzhen' }],
  HK: [{ id: 'Asia/Hong_Kong', label: 'Hong Kong', cities: 'Hong Kong' }],
  ID: [
    { id: 'Asia/Jakarta', label: 'Indonesia Occidental (WIB)', cities: 'Yakarta, Surabaya' },
    { id: 'Asia/Makassar', label: 'Indonesia Central (WITA)', cities: 'Bali, Makassar' },
    { id: 'Asia/Jayapura', label: 'Indonesia Oriental (WIT)', cities: 'Jayapura' },
  ],
  IL: [{ id: 'Asia/Jerusalem', label: 'Israel', cities: 'Tel Aviv, Jerusalén' }],
  IN: [{ id: 'Asia/Kolkata', label: 'India Standard Time', cities: 'Nueva Delhi, Bombay, Bangalore' }],
  JP: [{ id: 'Asia/Tokyo', label: 'Japón (JST)', cities: 'Tokio, Osaka, Kioto' }],
  KR: [{ id: 'Asia/Seoul', label: 'Corea del Sur (KST)', cities: 'Seúl, Busan' }],
  MY: [{ id: 'Asia/Kuala_Lumpur', label: 'Malasia', cities: 'Kuala Lumpur, Penang' }],
  PH: [{ id: 'Asia/Manila', label: 'Filipinas', cities: 'Manila, Cebú' }],
  SG: [{ id: 'Asia/Singapore', label: 'Singapur', cities: 'Singapur' }],
  TH: [{ id: 'Asia/Bangkok', label: 'Tailandia', cities: 'Bangkok, Chiang Mai' }],
  TW: [{ id: 'Asia/Taipei', label: 'Taiwán', cities: 'Taipéi, Kaohsiung' }],
  VN: [{ id: 'Asia/Ho_Chi_Minh', label: 'Vietnam', cities: 'Ciudad Ho Chi Minh, Hanói' }],
  ZA: [{ id: 'Africa/Johannesburg', label: 'Sudáfrica', cities: 'Johannesburgo, Ciudad del Cabo' }],
  EG: [{ id: 'Africa/Cairo', label: 'Egipto', cities: 'El Cairo, Alejandría' }],
  KE: [{ id: 'Africa/Nairobi', label: 'Kenia', cities: 'Nairobi, Mombasa' }],
  MA: [{ id: 'Africa/Casablanca', label: 'Marruecos', cities: 'Casablanca, Rabat' }],
  NG: [{ id: 'Africa/Lagos', label: 'Nigeria', cities: 'Lagos, Abuya' }],
  TN: [{ id: 'Africa/Tunis', label: 'Túnez', cities: 'Túnez' }],
  AE: [{ id: 'Asia/Dubai', label: 'Emiratos Árabes Unidos', cities: 'Dubái, Abu Dabi' }],
  SA: [{ id: 'Asia/Riyadh', label: 'Arabia Saudita', cities: 'Riad, Yeda' }],
  QA: [{ id: 'Asia/Qatar', label: 'Catar', cities: 'Doha' }],
  KW: [{ id: 'Asia/Kuwait', label: 'Kuwait', cities: 'Ciudad de Kuwait' }],
  BH: [{ id: 'Asia/Bahrain', label: 'Baréin', cities: 'Manama' }],
  TR: [{ id: 'Europe/Istanbul', label: 'Turquía', cities: 'Estambul, Ankara' }],
}

export function getUtcOffsetLabel(timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date())
    const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT'
    if (tzPart === 'GMT' || tzPart === 'UTC') return 'UTC+00:00'
    const normalized = tzPart.replace('GMT', 'UTC')
    const match = normalized.match(/^UTC([+-])(\d{1,2})(?::(\d{2}))?$/)
    if (!match) return normalized
    const [, sign, hrs, mins] = match
    return `UTC${sign}${hrs.padStart(2, '0')}:${mins || '00'}`
  } catch {
    return 'UTC'
  }
}

export function resolveCountryCode(countryCodeOrName?: string): string {
  const found = findCountry(countryCodeOrName)
  if (found) return found.code
  if (countryCodeOrName && COUNTRY_TIMEZONES[countryCodeOrName.toUpperCase()]) {
    return countryCodeOrName.toUpperCase()
  }
  return 'MX'
}

export function getTimezonesForCountry(countryCodeOrName?: string): TimezoneOption[] {
  const code = resolveCountryCode(countryCodeOrName)
  const rawList = COUNTRY_TIMEZONES[code] || COUNTRY_TIMEZONES.MX
  return rawList.map((entry) => {
    const offsetLabel = getUtcOffsetLabel(entry.id)
    return {
      ...entry,
      offsetLabel,
      displayLabel: `${entry.label} · ${entry.cities} (${offsetLabel})`,
    }
  })
}

export function getDefaultTimezoneForCountry(countryCodeOrName?: string): string {
  const options = getTimezonesForCountry(countryCodeOrName)
  return options[0]?.id || 'America/Mexico_City'
}
