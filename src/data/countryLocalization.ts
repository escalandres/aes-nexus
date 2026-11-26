import { validateClabeMod10 } from './ebp'
import { resolveCountryCode } from '../i18n/timezones'

export type FocusCountryCode = 'MX' | 'ES' | 'VE' | 'GLOBAL'

export interface CountryTaxIdValidation {
  valid: boolean
  kindLabel?: string
  reason?: string
}

export interface CountryRoutingValidation {
  valid: boolean
  reason?: string
  normalized: string
}

export interface CountryLocalizationProfile {
  code: FocusCountryCode
  countryName: string
  isFocusCountry: boolean
  defaultCurrency: 'MXN' | 'EUR' | 'VES' | 'USD'
  taxId: {
    label: string
    shortLabel: string
    placeholder: string
    formatHint: string
    authority: string
    validate: (raw: string) => CountryTaxIdValidation
  }
  vat: {
    label: string
    standardRatePct: number
    reducedRatePct: number
    standardOptionLabel: string
    reducedOptionLabel: string
    exemptOptionLabel: string
    transferredLabel: string
  }
  fiscalDoc: {
    documentName: string
    documentShort: string
    documentKicker: string
    uuidLabel: string
    usageLabel: string
    defaultUsageCode: string
    usageOptions: ReadonlyArray<{ code: string; label: string }>
    taxAuthorityVendorName: string
    taxAuthorityPaymentMethod: string
    externalAccountingLabel: string
    billingEmailLabel: string
  }
  bank: {
    routingLabel: string
    routingShortLabel: string
    routingFormatHint: string
    routingPlaceholder: string
    networkName: string
    defaultTransferMethod: string
    sameBankOrLocalLabel: string
    sampleBanks: ReadonlyArray<string>
    validateRouting: (raw: string) => CountryRoutingValidation
  }
  territory: {
    stateLabel: string
    districtLabel: string
    districtShortLabel: string
    postalLabel: string
    postalShortLabel: string
    postalPlaceholder: string
    streetPlaceholder: string
    districtPlaceholder: string
    cityPlaceholder: string
    statePlaceholder: string
  }
  hr: {
    socialSecurityLabel: string
  }
  regimes: ReadonlyArray<{ value: string; label: string }>
  supportedCurrencies: ReadonlyArray<{ code: string; label: string }>
}

const MX_RFC_REGEX = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/
const ES_TAX_ID_REGEX = /^([A-HJNPQRSUVW]\d{7}[0-9A-J]|\d{8}[A-Z]|[XYZ]\d{7}[A-Z])$/
const VE_RIF_REGEX = /^[JGVEPC]-?\d{8}-?\d$/

function cleanAlnumUpper(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '')
}

function validateMxTaxId(raw: string): CountryTaxIdValidation {
  const clean = cleanAlnumUpper(raw)
  if (!clean) return { valid: false, reason: 'Ingresa el RFC del emisor o receptor.' }
  if (clean.length !== 12 && clean.length !== 13) {
    return { valid: false, reason: 'Longitud esperada: 12 (Moral) o 13 (Física) caracteres SAT.' }
  }
  if (!MX_RFC_REGEX.test(clean)) {
    return { valid: false, reason: 'Formato esperado: 3-4 letras + fecha YYMMDD + homoclave SAT.' }
  }
  return {
    valid: true,
    kindLabel: clean.length === 12 ? 'Persona Moral' : 'Persona Física',
  }
}

function validateEsTaxId(raw: string): CountryTaxIdValidation {
  const clean = cleanAlnumUpper(raw).replace(/-/g, '')
  if (!clean) return { valid: false, reason: 'Introduce el NIF o CIF.' }
  if (!ES_TAX_ID_REGEX.test(clean)) {
    return { valid: false, reason: 'Formato esperado: 9 caracteres AEAT (ej. B12345678 o 12345678Z).' }
  }
  const isCif = /^[A-HJNPQRSUVW]/.test(clean)
  return {
    valid: true,
    kindLabel: isCif ? 'CIF / Sociedad' : 'NIF / NIE',
  }
}

function validateVeTaxId(raw: string): CountryTaxIdValidation {
  const clean = cleanAlnumUpper(raw)
  if (!clean) return { valid: false, reason: 'Ingresa el número de RIF.' }
  if (!VE_RIF_REGEX.test(clean)) {
    return { valid: false, reason: 'Formato esperado SENIAT: J-12345678-9 o V-12345678-0.' }
  }
  const prefix = clean[0]
  const kindMap: Record<string, string> = {
    J: 'Jurídico',
    G: 'Gubernamental',
    V: 'Venezolano',
    E: 'Extranjero',
    P: 'Pasaporte',
    C: 'Comuna / Consejo',
  }
  return {
    valid: true,
    kindLabel: kindMap[prefix] || 'Contribuyente SENIAT',
  }
}

function validateGlobalTaxId(raw: string): CountryTaxIdValidation {
  const clean = cleanAlnumUpper(raw)
  if (!clean) return { valid: false, reason: 'Ingresa el identificador fiscal.' }
  if (clean.length < 5 || !/^[A-Z0-9-]+$/.test(clean)) {
    return { valid: false, reason: 'Debe contener al menos 5 caracteres alfanuméricos válidos.' }
  }
  return {
    valid: true,
    kindLabel: 'Tax ID válido',
  }
}

function validateEsIban(raw: string): CountryRoutingValidation {
  const normalized = cleanAlnumUpper(raw)
  if (!normalized) {
    return { valid: false, reason: 'El código IBAN es obligatorio.', normalized }
  }
  if (/^ES\d{22}$/.test(normalized)) {
    return { valid: true, normalized }
  }
  if (/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(normalized)) {
    return { valid: true, normalized }
  }
  return {
    valid: false,
    reason: 'Formato esperado SEPA: ES + 22 dígitos (24 caracteres) o IBAN internacional.',
    normalized,
  }
}

function validateVeAccount20(raw: string): CountryRoutingValidation {
  const normalized = raw.replace(/\D/g, '')
  if (!normalized) {
    return { valid: false, reason: 'La cuenta bancaria de 20 dígitos es obligatoria.', normalized }
  }
  if (!/^\d{20}$/.test(normalized)) {
    return {
      valid: false,
      reason: 'Las cuentas nacionales en Venezuela requieren exactamente 20 dígitos (SUDEBAN).',
      normalized,
    }
  }
  return { valid: true, normalized }
}

function validateGlobalRouting(raw: string): CountryRoutingValidation {
  const normalized = cleanAlnumUpper(raw)
  if (!normalized) {
    return { valid: false, reason: 'El número de cuenta o IBAN es obligatorio.', normalized }
  }
  if (normalized.length < 8 || normalized.length > 34 || !/^[A-Z0-9-]+$/.test(normalized)) {
    return {
      valid: false,
      reason: 'Ingresa un IBAN, routing o número de cuenta válido (8 a 34 caracteres).',
      normalized,
    }
  }
  return { valid: true, normalized }
}

export const COUNTRY_LOCALIZATION_CATALOG: Record<FocusCountryCode, CountryLocalizationProfile> = {
  MX: {
    code: 'MX',
    countryName: 'México',
    isFocusCountry: true,
    defaultCurrency: 'MXN',
    taxId: {
      label: 'RFC',
      shortLabel: 'RFC',
      placeholder: 'XAXX010101000',
      formatHint: '12 o 13 caracteres SAT',
      authority: 'SAT',
      validate: validateMxTaxId,
    },
    vat: {
      label: 'IVA',
      standardRatePct: 16,
      reducedRatePct: 8,
      standardOptionLabel: 'IVA 16% (Estándar)',
      reducedOptionLabel: 'IVA 8% (Zona fronteriza)',
      exemptOptionLabel: 'Tasa 0% / Exento de IVA',
      transferredLabel: 'IVA trasladado',
    },
    fiscalDoc: {
      documentName: 'CFDI 4.0',
      documentShort: 'CFDI',
      documentKicker: 'COMPROBANTE FISCAL DIGITAL · CFDI 4.0',
      uuidLabel: 'UUID / Folio fiscal',
      usageLabel: 'Uso CFDI',
      defaultUsageCode: 'G03 · Gastos en general',
      usageOptions: [
        { code: 'G03 · Gastos en general', label: 'G03 · Gastos en general' },
        { code: 'G01 · Adquisición de mercancías', label: 'G01 · Adquisición de mercancías' },
        { code: 'I04 · Equipo de cómputo y accesorios', label: 'I04 · Equipo de cómputo y accesorios' },
        { code: 'S01 · Sin efectos fiscales', label: 'S01 · Sin efectos fiscales' },
        { code: 'CP01 · Pagos', label: 'CP01 · Pagos' },
      ],
      taxAuthorityVendorName: 'SAT / IMSS · Retenciones de Nómina',
      taxAuthorityPaymentMethod: 'Línea de captura SAT',
      externalAccountingLabel: 'Contabilidad Externa / SAT',
      billingEmailLabel: 'Correo de envío de facturas CFDI',
    },
    bank: {
      routingLabel: 'CLABE interbancaria',
      routingShortLabel: 'CLABE',
      routingFormatHint: '18 dígitos (SPEI)',
      routingPlaceholder: '012180001234567890',
      networkName: 'SPEI',
      defaultTransferMethod: 'Transferencia SPEI',
      sameBankOrLocalLabel: 'SPEI',
      sampleBanks: ['BBVA México', 'Banorte', 'Santander', 'Citibanamex', 'HSBC', 'Scotiabank'],
      validateRouting: (raw) => {
        const res = validateClabeMod10(raw)
        return {
          valid: res.valid,
          reason: res.reason,
          normalized: String(raw || '').replace(/\s+/g, ''),
        }
      },
    },
    territory: {
      stateLabel: 'Estado',
      districtLabel: 'Colonia / Alcaldía',
      districtShortLabel: 'Col.',
      postalLabel: 'Código postal',
      postalShortLabel: 'C.P.',
      postalPlaceholder: '06700',
      streetPlaceholder: 'Ej. Av. Insurgentes Sur 1602, Piso 4',
      districtPlaceholder: 'Ej. Crédito Constructor',
      cityPlaceholder: 'Ej. Benito Juárez',
      statePlaceholder: 'Ej. Ciudad de México',
    },
    hr: {
      socialSecurityLabel: 'NSS',
    },
    regimes: [
      { value: '601 - General de Ley Personas Morales', label: '601 · General de Ley Personas Morales' },
      { value: '612 - Personas Físicas con Actividades Empresariales', label: '612 · Actividades Empresariales y Profesionales' },
      { value: '626 - Régimen Simplificado de Confianza (RESICO)', label: '626 · Régimen Simplificado de Confianza (RESICO)' },
      { value: '603 - Personas Morales con Fines no Lucrativos', label: '603 · Personas Morales con Fines no Lucrativos' },
    ],
    supportedCurrencies: [
      { code: 'MXN', label: 'MXN — Peso mexicano' },
      { code: 'USD', label: 'USD — Dólar estadounidense' },
      { code: 'EUR', label: 'EUR — Euro' },
      { code: 'VES', label: 'VES — Bolívar venezolano' },
    ],
  },
  ES: {
    code: 'ES',
    countryName: 'España',
    isFocusCountry: true,
    defaultCurrency: 'EUR',
    taxId: {
      label: 'NIF / CIF',
      shortLabel: 'NIF',
      placeholder: 'B12345678',
      formatHint: '9 caracteres AEAT (NIF/CIF)',
      authority: 'AEAT',
      validate: validateEsTaxId,
    },
    vat: {
      label: 'IVA',
      standardRatePct: 21,
      reducedRatePct: 10,
      standardOptionLabel: 'IVA 21% (Tipo general)',
      reducedOptionLabel: 'IVA 10% (Tipo reducido)',
      exemptOptionLabel: 'Exento / Tipo 0% (Art. 20)',
      transferredLabel: 'IVA repercutido',
    },
    fiscalDoc: {
      documentName: 'Factura AEAT / Verifactu',
      documentShort: 'Verifactu',
      documentKicker: 'FACTURA ELECTRÓNICA · AEAT / VERIFACTU',
      uuidLabel: 'CSV / Ref. Verifactu',
      usageLabel: 'Clave de régimen / SII',
      defaultUsageCode: '01 · Operación de régimen general',
      usageOptions: [
        { code: '01 · Operación de régimen general', label: '01 · Operación de régimen general' },
        { code: '02 · Exportación / Entrega intracomunitaria', label: '02 · Exportación / Intracomunitaria' },
        { code: '07 · Régimen especial criterio de caja', label: '07 · Criterio de caja' },
        { code: '08 · Operaciones sujetas a IPSI / IGIC', label: '08 · Sujeta a IGIC / IPSI' },
      ],
      taxAuthorityVendorName: 'AEAT / Seguridad Social · Retenciones',
      taxAuthorityPaymentMethod: 'Domiciliación / Modelo AEAT',
      externalAccountingLabel: 'Contabilidad Externa / AEAT SII',
      billingEmailLabel: 'Correo de envío de facturas electrónicas',
    },
    bank: {
      routingLabel: 'Código IBAN',
      routingShortLabel: 'IBAN',
      routingFormatHint: '24 caracteres (ES + 22 dígitos SEPA)',
      routingPlaceholder: 'ES9121000418450200051332',
      networkName: 'SEPA',
      defaultTransferMethod: 'Transferencia SEPA',
      sameBankOrLocalLabel: 'SEPA',
      sampleBanks: ['Banco Santander', 'BBVA España', 'CaixaBank', 'Banco Sabadell', 'Bankinter', 'ING España'],
      validateRouting: validateEsIban,
    },
    territory: {
      stateLabel: 'Provincia / Comunidad',
      districtLabel: 'Barrio / Distrito',
      districtShortLabel: 'Barrio',
      postalLabel: 'Código postal',
      postalShortLabel: 'C.P.',
      postalPlaceholder: '28001',
      streetPlaceholder: 'Ej. Paseo de la Castellana 95, Planta 4',
      districtPlaceholder: 'Ej. Salamanca',
      cityPlaceholder: 'Ej. Madrid',
      statePlaceholder: 'Ej. Comunidad de Madrid',
    },
    hr: {
      socialSecurityLabel: 'Núm. Seg. Social',
    },
    regimes: [
      { value: 'Régimen General IVA · Impuesto sobre Sociedades', label: 'Régimen General IVA · Impuesto sobre Sociedades' },
      { value: 'Régimen Especial Criterio de Caja (RECC)', label: 'Régimen Especial Criterio de Caja (RECC)' },
      { value: 'Autónomos · Estimación Directa Normal/Simplificada', label: 'Autónomos · Estimación Directa' },
      { value: 'Entidad sin ánimo de lucro (Ley 49/2002)', label: 'Entidad sin ánimo de lucro' },
    ],
    supportedCurrencies: [
      { code: 'EUR', label: 'EUR — Euro' },
      { code: 'USD', label: 'USD — Dólar estadounidense' },
      { code: 'MXN', label: 'MXN — Peso mexicano' },
      { code: 'VES', label: 'VES — Bolívar venezolano' },
    ],
  },
  VE: {
    code: 'VE',
    countryName: 'Venezuela',
    isFocusCountry: true,
    defaultCurrency: 'VES',
    taxId: {
      label: 'RIF',
      shortLabel: 'RIF',
      placeholder: 'J-12345678-9',
      formatHint: 'Letra + 9 dígitos SENIAT',
      authority: 'SENIAT',
      validate: validateVeTaxId,
    },
    vat: {
      label: 'IVA',
      standardRatePct: 16,
      reducedRatePct: 8,
      standardOptionLabel: 'IVA 16% (Alícuota general)',
      reducedOptionLabel: 'IVA 8% (Alícuota reducida)',
      exemptOptionLabel: 'Exento / No sujeto a IVA',
      transferredLabel: 'IVA débito fiscal',
    },
    fiscalDoc: {
      documentName: 'Factura SENIAT',
      documentShort: 'SENIAT',
      documentKicker: 'DOCUMENTO FISCAL · PROVIDENCIA SENIAT',
      uuidLabel: 'Núm. de Control SENIAT',
      usageLabel: 'Condición de contribuyente',
      defaultUsageCode: 'Contribuyente Ordinario IVA',
      usageOptions: [
        { code: 'Contribuyente Ordinario IVA', label: 'Contribuyente Ordinario IVA' },
        { code: 'Contribuyente Especial (Agente Retención)', label: 'Contribuyente Especial (Retención 75%/100%)' },
        { code: 'Operación Exenta / No Sujeta', label: 'Operación Exenta / No Sujeta' },
        { code: 'Exportación / Divisas IGTF', label: 'Operación en Divisas / IGTF' },
      ],
      taxAuthorityVendorName: 'SENIAT / IVSS · Retenciones y Parafiscales',
      taxAuthorityPaymentMethod: 'Planilla de pago SENIAT',
      externalAccountingLabel: 'Contabilidad Externa / SENIAT',
      billingEmailLabel: 'Correo de envío de facturas fiscales',
    },
    bank: {
      routingLabel: 'Cuenta bancaria (20 dígitos)',
      routingShortLabel: 'Cuenta (20d)',
      routingFormatHint: '20 dígitos SUDEBAN',
      routingPlaceholder: '01020112345678901234',
      networkName: 'Transferencia Nacional / Pago Móvil',
      defaultTransferMethod: 'Transferencia bancaria VE',
      sameBankOrLocalLabel: 'Pago Móvil / Transf.',
      sampleBanks: ['Banesco', 'Banco de Venezuela', 'Banco Mercantil', 'BBVA Provincial', 'BNC', 'Bancamiga'],
      validateRouting: validateVeAccount20,
    },
    territory: {
      stateLabel: 'Estado',
      districtLabel: 'Parroquia / Urbanización',
      districtShortLabel: 'Parroquia',
      postalLabel: 'Zona postal',
      postalShortLabel: 'Z.P.',
      postalPlaceholder: '1060',
      streetPlaceholder: 'Ej. Av. Francisco de Miranda, Torre Empresarial',
      districtPlaceholder: 'Ej. Chacao / El Rosal',
      cityPlaceholder: 'Ej. Caracas',
      statePlaceholder: 'Ej. Distrito Capital / Miranda',
    },
    hr: {
      socialSecurityLabel: 'IVSS',
    },
    regimes: [
      { value: 'Contribuyente Especial (Agente de Retención IVA/ISLR)', label: 'Contribuyente Especial (SENIAT)' },
      { value: 'Contribuyente Ordinario (IVA + ISLR)', label: 'Contribuyente Ordinario (IVA + ISLR)' },
      { value: 'Firma Personal / Actividad Comercial', label: 'Firma Personal / Emprendimiento' },
      { value: 'Entidad exenta o sin fines de lucro', label: 'Entidad exenta' },
    ],
    supportedCurrencies: [
      { code: 'VES', label: 'VES — Bolívar venezolano' },
      { code: 'USD', label: 'USD — Dólar estadounidense' },
      { code: 'EUR', label: 'EUR — Euro' },
      { code: 'MXN', label: 'MXN — Peso mexicano' },
    ],
  },
  GLOBAL: {
    code: 'GLOBAL',
    countryName: 'Global',
    isFocusCountry: false,
    defaultCurrency: 'USD',
    taxId: {
      label: 'Tax ID',
      shortLabel: 'Tax ID',
      placeholder: 'TAX-00000000',
      formatHint: 'Identificador fiscal oficial',
      authority: 'Autoridad tributaria',
      validate: validateGlobalTaxId,
    },
    vat: {
      label: 'Impuesto / VAT',
      standardRatePct: 16,
      reducedRatePct: 10,
      standardOptionLabel: 'Impuesto estándar (16%)',
      reducedOptionLabel: 'Tasa reducida (10%)',
      exemptOptionLabel: 'Tasa 0% / Exento',
      transferredLabel: 'Impuesto aplicado',
    },
    fiscalDoc: {
      documentName: 'Comprobante fiscal',
      documentShort: 'Fiscal',
      documentKicker: 'COMPROBANTE FISCAL INTERNACIONAL',
      uuidLabel: 'ID / Referencia fiscal',
      usageLabel: 'Uso / Clasificación fiscal',
      defaultUsageCode: 'Operación comercial estándar',
      usageOptions: [
        { code: 'Operación comercial estándar', label: 'Operación comercial estándar' },
        { code: 'Adquisición de inventario / bienes', label: 'Adquisición de inventario / bienes' },
        { code: 'Servicios profesionales / B2B', label: 'Servicios profesionales / B2B' },
        { code: 'Exportación / Tasa cero', label: 'Exportación / Tasa cero' },
      ],
      taxAuthorityVendorName: 'Autoridad Fiscal · Retenciones de Nómina',
      taxAuthorityPaymentMethod: 'Pago institucional',
      externalAccountingLabel: 'Contabilidad Externa / Fiscal',
      billingEmailLabel: 'Correo de envío de comprobantes fiscales',
    },
    bank: {
      routingLabel: 'IBAN / Cuenta / Routing',
      routingShortLabel: 'Cuenta / IBAN',
      routingFormatHint: 'Código bancario internacional',
      routingPlaceholder: 'IBAN o número de cuenta',
      networkName: 'Transferencia bancaria',
      defaultTransferMethod: 'Transferencia bancaria',
      sameBankOrLocalLabel: 'Transf. bancaria',
      sampleBanks: ['Citibank', 'JPMorgan Chase', 'HSBC Global', 'Banco Santander', 'BBVA'],
      validateRouting: validateGlobalRouting,
    },
    territory: {
      stateLabel: 'Estado / Región',
      districtLabel: 'Distrito / Zona',
      districtShortLabel: 'Zona',
      postalLabel: 'Código postal',
      postalShortLabel: 'C.P.',
      postalPlaceholder: '00000',
      streetPlaceholder: 'Ej. Main Avenue 100, Suite 400',
      districtPlaceholder: 'Ej. Downtown / District 1',
      cityPlaceholder: 'Ej. Ciudad',
      statePlaceholder: 'Ej. Región / Estado',
    },
    hr: {
      socialSecurityLabel: 'ID Seguridad Social',
    },
    regimes: [
      { value: 'Régimen Corporativo Estándar', label: 'Régimen Corporativo Estándar' },
      { value: 'Pequeña y Mediana Empresa (PyME)', label: 'Pequeña y Mediana Empresa (PyME)' },
      { value: 'Profesional Independiente / Consultor', label: 'Profesional Independiente / Consultor' },
      { value: 'Organización sin fines de lucro', label: 'Organización sin fines de lucro' },
    ],
    supportedCurrencies: [
      { code: 'USD', label: 'USD — Dólar estadounidense' },
      { code: 'EUR', label: 'EUR — Euro' },
      { code: 'MXN', label: 'MXN — Peso mexicano' },
      { code: 'VES', label: 'VES — Bolívar venezolano' },
      { code: 'COP', label: 'COP — Peso colombiano' },
      { code: 'BRL', label: 'BRL — Real brasileño' },
    ],
  },
}

export const FOCUS_COUNTRIES: ReadonlyArray<{ code: FocusCountryCode; label: string }> = [
  { code: 'MX', label: 'México' },
  { code: 'ES', label: 'España' },
  { code: 'VE', label: 'Venezuela' },
  { code: 'GLOBAL', label: 'Global (otros países)' },
]

export function getCountryProfile(countryCodeOrName?: string): CountryLocalizationProfile {
  if (countryCodeOrName?.trim().toUpperCase() === 'GLOBAL') {
    return COUNTRY_LOCALIZATION_CATALOG.GLOBAL
  }
  const code = resolveCountryCode(countryCodeOrName)
  if (code === 'MX') return COUNTRY_LOCALIZATION_CATALOG.MX
  if (code === 'ES') return COUNTRY_LOCALIZATION_CATALOG.ES
  if (code === 'VE') return COUNTRY_LOCALIZATION_CATALOG.VE
  return COUNTRY_LOCALIZATION_CATALOG.GLOBAL
}

export interface EntityCountryFields {
  countryCode: FocusCountryCode
  countryName: string
  taxIdLabel: string
  taxIdShortLabel: string
  taxIdPlaceholder: string
  taxIdFormatHint: string
  validateTaxId: (raw: string) => CountryTaxIdValidation
  entityTypeLabels: {
    company: string
    individual: string
  }
  stateLabel: string
  statePlaceholder: string
  districtLabel: string
  districtShortLabel: string
  districtDisplayPrefix: string
  districtPlaceholder: string
  cityPlaceholder: string
  streetPlaceholder: string
  postalLabel: string
  postalShortLabel: string
  postalPlaceholder: string
  contactEmailPlaceholder: string
  phonePlaceholder: string
  bankRoutingLabel: string
  bankRoutingShortLabel: string
  bankRoutingFormatHint: string
  bankRoutingPlaceholder: string
  bankRoutingMaxLength: number
  bankNetworkName: string
  bankSampleBanks: ReadonlyArray<string>
  validateBankRouting: (raw: string) => CountryRoutingValidation
}

const ENTITY_COUNTRY_META: Record<
  FocusCountryCode,
  {
    entityTypeLabels: { company: string; individual: string }
    contactEmailPlaceholder: string
    phonePlaceholder: string
    bankRoutingMaxLength: number
  }
> = {
  MX: {
    entityTypeLabels: {
      company: 'Persona Moral (Empresa)',
      individual: 'Persona Física (Individual)',
    },
    contactEmailPlaceholder: 'contacto@empresa.mx',
    phonePlaceholder: '55 1234 5678',
    bankRoutingMaxLength: 18,
  },
  ES: {
    entityTypeLabels: {
      company: 'Sociedad / Empresa (CIF)',
      individual: 'Autónomo / Persona Física',
    },
    contactEmailPlaceholder: 'contacto@empresa.es',
    phonePlaceholder: '+34 91 123 45 67',
    bankRoutingMaxLength: 24,
  },
  VE: {
    entityTypeLabels: {
      company: 'Persona Jurídica (Empresa)',
      individual: 'Persona Natural (Firma Personal)',
    },
    contactEmailPlaceholder: 'contacto@empresa.com.ve',
    phonePlaceholder: '+58 212 123 4567',
    bankRoutingMaxLength: 20,
  },
  GLOBAL: {
    entityTypeLabels: {
      company: 'Empresa / Corporación',
      individual: 'Persona Individual / Profesional',
    },
    contactEmailPlaceholder: 'contact@company.com',
    phonePlaceholder: '+1 555 010 2030',
    bankRoutingMaxLength: 34,
  },
}

function buildEntityCountryFields(code: FocusCountryCode): EntityCountryFields {
  const profile = COUNTRY_LOCALIZATION_CATALOG[code]
  const meta = ENTITY_COUNTRY_META[code]
  return {
    countryCode: profile.code,
    countryName: profile.countryName,
    taxIdLabel: profile.taxId.label,
    taxIdShortLabel: profile.taxId.shortLabel,
    taxIdPlaceholder: profile.taxId.placeholder,
    taxIdFormatHint: profile.taxId.formatHint,
    validateTaxId: profile.taxId.validate,
    entityTypeLabels: meta.entityTypeLabels,
    stateLabel: profile.territory.stateLabel,
    statePlaceholder: profile.territory.statePlaceholder,
    districtLabel: profile.territory.districtLabel,
    districtShortLabel: profile.territory.districtShortLabel,
    districtDisplayPrefix: profile.territory.districtLabel.split(' / ')[0],
    districtPlaceholder: profile.territory.districtPlaceholder,
    cityPlaceholder: profile.territory.cityPlaceholder,
    streetPlaceholder: profile.territory.streetPlaceholder,
    postalLabel: profile.territory.postalLabel,
    postalShortLabel: profile.territory.postalShortLabel,
    postalPlaceholder: profile.territory.postalPlaceholder,
    contactEmailPlaceholder: meta.contactEmailPlaceholder,
    phonePlaceholder: meta.phonePlaceholder,
    bankRoutingLabel: profile.bank.routingLabel,
    bankRoutingShortLabel: profile.bank.routingShortLabel,
    bankRoutingFormatHint: profile.bank.routingFormatHint,
    bankRoutingPlaceholder: profile.bank.routingPlaceholder,
    bankRoutingMaxLength: meta.bankRoutingMaxLength,
    bankNetworkName: profile.bank.networkName,
    bankSampleBanks: profile.bank.sampleBanks,
    validateBankRouting: profile.bank.validateRouting,
  }
}

export const ENTITY_COUNTRY_FIELD_MAP: Record<FocusCountryCode, EntityCountryFields> = {
  MX: buildEntityCountryFields('MX'),
  ES: buildEntityCountryFields('ES'),
  VE: buildEntityCountryFields('VE'),
  GLOBAL: buildEntityCountryFields('GLOBAL'),
}

export function getEntityCountryFields(
  countryCodeOrName?: string,
  fallbackCountry?: string
): EntityCountryFields {
  const target = countryCodeOrName?.trim() || fallbackCountry?.trim() || 'MX'
  const profile = getCountryProfile(target)
  return ENTITY_COUNTRY_FIELD_MAP[profile.code]
}

export function getStoredAccountCountryCode(): string {
  if (typeof window === 'undefined') return 'MX'
  try {
    const saved = window.localStorage.getItem('aes_nexus_settings_general')
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed?.mainCountry?.trim?.().toUpperCase() === 'GLOBAL') return 'GLOBAL'
      if (parsed?.mainCountry) return resolveCountryCode(parsed.mainCountry)
    }
  } catch {
    // fallback
  }
  return 'MX'
}

export function getStoredAccountCountryProfile(): CountryLocalizationProfile {
  return getCountryProfile(getStoredAccountCountryCode())
}
