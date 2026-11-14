export type EbpOperationType = 'payroll' | 'vendor_payment' | 'both'
export type EbpChannel = 'same_bank' | 'interbank_spei' | 'mixed'
export type EbpEncoding = 'UTF-8' | 'UTF-8-BOM' | 'ISO-8859-1' | 'ASCII'
export type EbpLicenseTier = 'included' | 'promo' | 'paid'
export type EbpFieldType = 'text' | 'number' | 'select_catalog'
export type EbpCurrency = 'MXN' | 'USD' | 'EUR'

export interface EbpFieldValidator {
  required?: boolean
  minLength?: number
  maxLength?: number
  digitsOnly?: boolean
  clabeMod10?: boolean
  regex?: string
  regexHint?: string
}

export interface EbpDynamicFieldSchema {
  key: string
  label: string
  type: EbpFieldType
  catalogRef?: string
  placeholder?: string
  helpText?: string
  defaultValue?: string
  validators: EbpFieldValidator
}

export interface EbpCatalogOption {
  code: string
  label: string
}

export interface EbpEmbeddedCatalog {
  title: string
  options: EbpCatalogOption[]
}

export interface BankFormatPack {
  id: string
  packCode: string
  version: string
  name: string
  bankName: string
  country: string
  operationType: EbpOperationType
  channel: EbpChannel
  description: string
  // 7 Pilares estilo NetSuite EBP
  companyBankSchema: EbpDynamicFieldSchema[]
  beneficiaryBankSchema: EbpDynamicFieldSchema[]
  embeddedCatalogs: Record<string, EbpEmbeddedCatalog>
  templateBody: string
  encoding: EbpEncoding
  outputExtension: string
  lineEnding: 'CRLF' | 'LF'
  filenamePattern: string
  supportedCurrencies: EbpCurrency[]
  // Marketplace & Licenciamiento
  licenseTier: EbpLicenseTier
  promoBadge?: string
  priceLabel: string
  installed: boolean
  licenseActive: boolean
  changelog?: string
  isCustomPack?: boolean
}

export interface ElectronicPaymentBatchLine {
  id: string
  sourceLineId: string
  beneficiaryName: string
  beneficiaryCode: string
  rfc?: string
  bankName: string
  clabe: string
  accountNumber?: string
  amount: number
  reference: string
  concept: string
  isSameBank: boolean
  customValues: Record<string, string>
  validationErrors: string[]
  included: boolean
}

export type EbpBatchStatus =
  | 'Validado'
  | 'Archivo generado'
  | 'Aplicado en banco'
  | 'Rechazado'

export interface ElectronicPaymentBatch {
  id: string
  folio: string
  batchType: 'Nómina' | 'Proveedores'
  packId: string
  packName: string
  packVersion: string
  bankAccountId: string
  bankAccountName: string
  currency: EbpCurrency
  sourceRefId: string
  sourceFolio: string
  executionDate: string
  operationsCount: number
  totalAmount: number
  status: EbpBatchStatus
  generatedFilename: string
  generatedContent: string
  encoding: EbpEncoding
  createdAt: string
  appliedAt?: string
  lines: ElectronicPaymentBatchLine[]
}

// ---------------------------------------------------------------------------
// Banxico CLABE Mod-10 Validation & Helpers
// ---------------------------------------------------------------------------

export const BANXICO_BANK_NAMES: Record<string, string> = {
  '002': 'Citibanamex',
  '012': 'BBVA México',
  '014': 'Santander',
  '021': 'HSBC',
  '030': 'Bajío',
  '036': 'Inbursa',
  '044': 'Scotiabank',
  '058': 'Banregio',
  '072': 'Banorte',
  '127': 'Azteca',
  '137': 'BanCoppel',
}

export function computeClabeCheckDigit(first17: string): string {
  const weights = [3, 7, 1]
  let sum = 0
  for (let i = 0; i < 17; i++) {
    const d = Number(first17[i])
    sum += (d * weights[i % 3]) % 10
  }
  return String((10 - (sum % 10)) % 10)
}

export function makeValidClabe(first17: string): string {
  const clean = first17.replace(/\D/g, '').padEnd(17, '0').slice(0, 17)
  return `${clean}${computeClabeCheckDigit(clean)}`
}

export function validateClabeMod10(rawClabe?: string): {
  valid: boolean
  reason?: string
  bankCode?: string
  bankLabel?: string
} {
  const clabe = (rawClabe || '').replace(/\s+/g, '')
  if (!clabe) {
    return { valid: false, reason: 'CLABE interbancaria faltante' }
  }
  if (!/^\d{18}$/.test(clabe)) {
    return {
      valid: false,
      reason: `CLABE debe tener 18 dígitos numéricos (actual: ${clabe.length})`,
    }
  }
  const expected = computeClabeCheckDigit(clabe.slice(0, 17))
  if (clabe[17] !== expected) {
    return {
      valid: false,
      reason: `Dígito verificador CLABE inválido (esperado ${expected}, recibido ${clabe[17]})`,
    }
  }
  const bankCode = clabe.slice(0, 3)
  return {
    valid: true,
    bankCode,
    bankLabel: BANXICO_BANK_NAMES[bankCode] || `Banco ${bankCode}`,
  }
}

export function validateEbpFieldValue(
  schema: EbpDynamicFieldSchema,
  rawValue: string | undefined,
  embeddedCatalogs: Record<string, EbpEmbeddedCatalog>
): string | null {
  const value = (rawValue ?? schema.defaultValue ?? '').trim()
  const v = schema.validators || {}

  if (v.required && !value) {
    return `Campo requerido "${schema.label}" sin capturar`
  }
  if (!value) return null

  if (v.digitsOnly && !/^\d+$/.test(value)) {
    return `"${schema.label}" solo acepta dígitos numéricos`
  }
  if (v.minLength !== undefined && value.length < v.minLength) {
    return `"${schema.label}" requiere al menos ${v.minLength} caracteres`
  }
  if (v.maxLength !== undefined && value.length > v.maxLength) {
    return `"${schema.label}" excede el máximo de ${v.maxLength} caracteres`
  }
  if (v.clabeMod10) {
    const res = validateClabeMod10(value)
    if (!res.valid) return `${schema.label}: ${res.reason}`
  }
  if (v.regex) {
    try {
      const re = new RegExp(v.regex)
      if (!re.test(value)) {
        return v.regexHint || `"${schema.label}" no cumple el formato esperado`
      }
    } catch {
      // ignore invalid regex
    }
  }
  if (schema.type === 'select_catalog' && schema.catalogRef) {
    const catalog = embeddedCatalogs[schema.catalogRef]
    if (catalog && !catalog.options.some((opt) => opt.code === value)) {
      return `"${schema.label}" contiene un código (${value}) fuera del catálogo del banco`
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Freeform DSL Engine (Agnostic of fixed Header / Body / Trailer)
// ---------------------------------------------------------------------------

export interface EbpRenderContext {
  company: {
    name: string
    rfc: string
    custom: Record<string, string>
  }
  bankAccount: {
    id: string
    bankName: string
    accountNumber: string
    clabe: string
    currency: EbpCurrency
    custom: Record<string, string>
  }
  batch: {
    folio: string
    type: 'Nómina' | 'Proveedores'
    executionDate: string
    sequence: string
    sourceFolio: string
    currency: EbpCurrency
    totalAmount: number
    operationsCount: number
  }
  payments: Array<{
    index: number
    beneficiaryName: string
    beneficiaryCode: string
    rfc: string
    bankName: string
    bankCode: string
    clabe: string
    accountNumber: string
    amount: number
    reference: string
    concept: string
    isSameBank: boolean
    channelType: 'MISMO_BANCO' | 'SPEI'
    custom: Record<string, string>
  }>
}

function stripAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n')
    .replace(/Ñ/g, 'N')
}

function formatDateToken(isoDate: string, pattern: string): string {
  const clean = (isoDate || '').trim()
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})/)
  const yyyy = match ? match[1] : '2026'
  const mm = match ? match[2] : '11'
  const dd = match ? match[3] : '15'
  const yy = yyyy.slice(2)
  switch (pattern) {
    case 'yyyyMMdd':
      return `${yyyy}${mm}${dd}`
    case 'yyMMdd':
      return `${yy}${mm}${dd}`
    case 'ddMMyyyy':
      return `${dd}${mm}${yyyy}`
    case 'dd/MM/yyyy':
      return `${dd}/${mm}/${yyyy}`
    case 'yyyy-MM-dd':
    case 'ISO':
    default:
      return `${yyyy}-${mm}-${dd}`
  }
}

function resolvePath(scope: Record<string, unknown>, path: string): unknown {
  const parts = path.trim().split('.')
  let cur: unknown = scope
  for (const part of parts) {
    if (cur === null || cur === undefined || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[part]
  }
  return cur
}

function parseArgs(rawArgs: string): string[] {
  const args: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null
  for (let i = 0; i < rawArgs.length; i++) {
    const ch = rawArgs[i]
    if (quote) {
      if (ch === quote) {
        quote = null
      } else {
        current += ch
      }
    } else if (ch === '"' || ch === "'") {
      quote = ch
    } else if (ch === ',') {
      args.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) args.push(current.trim())
  return args
}

function evalArg(
  token: string,
  scope: Record<string, unknown>,
  pack: BankFormatPack
): unknown {
  const t = token.trim()
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1)
  }
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t)
  if (t === 'true') return true
  if (t === 'false') return false
  // Check nested helper expression
  if (/^[a-zA-Z_]\w*\(.*\)$/.test(t)) {
    return evalExpression(t, scope, pack)
  }
  return resolvePath(scope, t)
}

function evalExpression(
  expr: string,
  scope: Record<string, unknown>,
  pack: BankFormatPack
): string {
  const trimmed = expr.trim()
  const fnMatch = trimmed.match(/^([a-zA-Z_]\w*)\(([\s\S]*)\)$/)
  if (fnMatch) {
    const fnName = fnMatch[1]
    const rawArgs = parseArgs(fnMatch[2])
    const resolved = rawArgs.map((a) => evalArg(a, scope, pack))

    switch (fnName) {
      case 'padLeft': {
        const val = String(resolved[0] ?? '')
        const len = Math.max(0, Number(resolved[1]) || val.length)
        const pad = String(resolved[2] ?? '0') || '0'
        return val.slice(0, len).padStart(len, pad)
      }
      case 'padRight': {
        const val = String(resolved[0] ?? '')
        const len = Math.max(0, Number(resolved[1]) || val.length)
        const pad = String(resolved[2] ?? ' ') || ' '
        return val.slice(0, len).padEnd(len, pad)
      }
      case 'cents': {
        const num = Number(resolved[0]) || 0
        const len = Number(resolved[1]) || 0
        const str = String(Math.round(num * 100))
        return len > 0 ? str.slice(-len).padStart(len, '0') : str
      }
      case 'decimal': {
        const num = Number(resolved[0]) || 0
        const dec = Number(resolved[1]) ?? 2
        return num.toFixed(dec)
      }
      case 'noAccents':
        return stripAccents(String(resolved[0] ?? ''))
      case 'upper':
        return stripAccents(String(resolved[0] ?? '')).toUpperCase()
      case 'digits':
        return String(resolved[0] ?? '').replace(/\D/g, '')
      case 'trunc': {
        const val = String(resolved[0] ?? '')
        const len = Math.max(0, Number(resolved[1]) || val.length)
        return val.slice(0, len)
      }
      case 'dateFmt':
        return formatDateToken(String(resolved[0] ?? ''), String(resolved[1] ?? 'yyyyMMdd'))
      case 'clabeBank':
        return String(resolved[0] ?? '').replace(/\D/g, '').slice(0, 3).padStart(3, '0')
      case 'clabePlaza':
        return String(resolved[0] ?? '').replace(/\D/g, '').slice(3, 6).padStart(3, '0')
      case 'clabeAccount':
        return String(resolved[0] ?? '').replace(/\D/g, '').slice(6, 17).padStart(11, '0')
      case 'lineSeq': {
        const len = Number(resolved[0]) || 6
        const idx = Number(resolvePath(scope, 'payment.index') ?? resolvePath(scope, 'index') ?? 1)
        const offset = Number(resolved[1]) || 0
        return String(idx + offset).padStart(len, '0')
      }
      case 'sum': {
        const list =
          (resolvePath(scope, 'group.items') as Array<Record<string, unknown>> | undefined) ||
          (resolvePath(scope, 'payments') as Array<Record<string, unknown>> | undefined) ||
          []
        const field = String(resolved[0] ?? 'amount')
        const total = list.reduce((acc, item) => acc + (Number(item[field]) || 0), 0)
        return total.toFixed(2)
      }
      case 'sumCents': {
        const list =
          (resolvePath(scope, 'group.items') as Array<Record<string, unknown>> | undefined) ||
          (resolvePath(scope, 'payments') as Array<Record<string, unknown>> | undefined) ||
          []
        const field = String(resolved[0] ?? 'amount')
        const len = Number(resolved[1]) || 15
        const total = list.reduce((acc, item) => acc + (Number(item[field]) || 0), 0)
        return String(Math.round(total * 100)).slice(-len).padStart(len, '0')
      }
      case 'count': {
        const list =
          (resolvePath(scope, 'group.items') as unknown[] | undefined) ||
          (resolvePath(scope, 'payments') as unknown[] | undefined) ||
          []
        const len = Number(resolved[0]) || 0
        const c = String(list.length)
        return len > 0 ? c.padStart(len, '0') : c
      }
      case 'xmlEscape':
        return String(resolved[0] ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;')
      case 'csv': {
        const s = String(resolved[0] ?? '')
        if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
        return s
      }
      case 'catalogLabel': {
        const catKey = String(resolved[0] ?? '')
        const code = String(resolved[1] ?? '')
        const cat = pack.embeddedCatalogs[catKey]
        return cat?.options.find((o) => o.code === code)?.label || code
      }
      default:
        return ''
    }
  }

  const val = resolvePath(scope, trimmed)
  if (val === undefined || val === null) return ''
  return String(val)
}

function evalCondition(cond: string, scope: Record<string, unknown>): boolean {
  const eqMatch = cond.match(/^(.+?)\s*===\s*(.+)$/)
  if (eqMatch) {
    const left = resolvePath(scope, eqMatch[1].trim())
    const rightRaw = eqMatch[2].trim().replace(/^["']|["']$/g, '')
    return String(left ?? '') === rightRaw
  }
  const neqMatch = cond.match(/^(.+?)\s*!==\s*(.+)$/)
  if (neqMatch) {
    const left = resolvePath(scope, neqMatch[1].trim())
    const rightRaw = neqMatch[2].trim().replace(/^["']|["']$/g, '')
    return String(left ?? '') !== rightRaw
  }
  const val = resolvePath(scope, cond.trim())
  return Boolean(val)
}

function findMatchingTag(
  tpl: string,
  startIdx: number,
  openPrefix: string,
  closeTag: string
): { closeStart: number; closeEnd: number; elseIdx: number } {
  let depth = 1
  let i = startIdx
  let elseIdx = -1
  while (i < tpl.length) {
    const nextOpen = tpl.indexOf(`{{#${openPrefix}`, i)
    const nextClose = tpl.indexOf(closeTag, i)
    const nextElse = openPrefix === 'if' ? tpl.indexOf('{{else}}', i) : -1

    if (nextClose === -1) {
      return { closeStart: tpl.length, closeEnd: tpl.length, elseIdx }
    }

    if (nextElse !== -1 && nextElse < nextClose && (nextOpen === -1 || nextElse < nextOpen) && depth === 1 && elseIdx === -1) {
      elseIdx = nextElse
      i = nextElse + 8
      continue
    }

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++
      i = nextOpen + openPrefix.length + 3
    } else {
      depth--
      if (depth === 0) {
        return { closeStart: nextClose, closeEnd: nextClose + closeTag.length, elseIdx }
      }
      i = nextClose + closeTag.length
    }
  }
  return { closeStart: tpl.length, closeEnd: tpl.length, elseIdx }
}

function renderBlock(
  tpl: string,
  scope: Record<string, unknown>,
  pack: BankFormatPack
): string {
  let out = ''
  let i = 0

  while (i < tpl.length) {
    const tagStart = tpl.indexOf('{{', i)
    if (tagStart === -1) {
      out += tpl.slice(i)
      break
    }
    out += tpl.slice(i, tagStart)
    const tagEnd = tpl.indexOf('}}', tagStart + 2)
    if (tagEnd === -1) {
      out += tpl.slice(tagStart)
      break
    }

    const rawTag = tpl.slice(tagStart + 2, tagEnd).trim()

    if (rawTag.startsWith('#groupBy ')) {
      const args = parseArgs(rawTag.slice(9).trim())
      const listPath = (args[0] || 'payments').split(/\s+/)[0]
      const keyRaw = rawTag.slice(9).trim().replace(/^[^\s]+\s+/, '').replace(/^["']|["']$/g, '')
      const afterOpen = tagEnd + 2
      const { closeStart, closeEnd } = findMatchingTag(tpl, afterOpen, 'groupBy', '{{/groupBy}}')
      let body = tpl.slice(afterOpen, closeStart)
      if (body.startsWith('\n')) body = body.slice(1)
      else if (body.startsWith('\r\n')) body = body.slice(2)

      const list = (resolvePath(scope, listPath) as Array<Record<string, unknown>> | undefined) || []
      const groupsMap = new Map<string, Array<Record<string, unknown>>>()
      for (const item of list) {
        const gKey = String(resolvePath(item, keyRaw) ?? 'DEFAULT')
        if (!groupsMap.has(gKey)) groupsMap.set(gKey, [])
        groupsMap.get(gKey)!.push(item)
      }

      let gIndex = 1
      for (const [key, items] of groupsMap.entries()) {
        const groupScope = {
          ...scope,
          group: {
            key,
            index: gIndex++,
            count: items.length,
            totalAmount: items.reduce((s, it) => s + (Number(it.amount) || 0), 0),
            items,
          },
        }
        out += renderBlock(body, groupScope, pack)
      }
      i = closeEnd
      continue
    }

    if (rawTag.startsWith('#each ')) {
      const listPath = rawTag.slice(6).trim()
      const afterOpen = tagEnd + 2
      const { closeStart, closeEnd } = findMatchingTag(tpl, afterOpen, 'each', '{{/each}}')
      let body = tpl.slice(afterOpen, closeStart)
      if (body.startsWith('\n')) body = body.slice(1)
      else if (body.startsWith('\r\n')) body = body.slice(2)

      const list = (resolvePath(scope, listPath) as Array<Record<string, unknown>> | undefined) || []
      list.forEach((item, idx) => {
        const itemScope = {
          ...scope,
          payment: item,
          index: idx + 1,
        }
        out += renderBlock(body, itemScope, pack)
      })
      i = closeEnd
      continue
    }

    if (rawTag.startsWith('#if ')) {
      const cond = rawTag.slice(4).trim()
      const afterOpen = tagEnd + 2
      const { closeStart, closeEnd, elseIdx } = findMatchingTag(tpl, afterOpen, 'if', '{{/if}}')
      const trueBranch = elseIdx !== -1 ? tpl.slice(afterOpen, elseIdx) : tpl.slice(afterOpen, closeStart)
      const falseBranch = elseIdx !== -1 ? tpl.slice(elseIdx + 8, closeStart) : ''
      const chosen = evalCondition(cond, scope) ? trueBranch : falseBranch
      out += renderBlock(chosen, scope, pack)
      i = closeEnd
      continue
    }

    out += evalExpression(rawTag, scope, pack)
    i = tagEnd + 2
  }

  return out
}

export function renderEbpTemplate(
  pack: BankFormatPack,
  context: EbpRenderContext
): string {
  const scope: Record<string, unknown> = {
    company: context.company,
    bankAccount: context.bankAccount,
    batch: context.batch,
    payments: context.payments,
  }
  const raw = renderBlock(pack.templateBody, scope, pack)
  // Normalize line endings strictly to pack.lineEnding
  const lines = raw.replace(/\r\n/g, '\n').split('\n')
  // Trim trailing empty line artifacts if needed while preserving intentional lines
  while (lines.length > 1 && lines[lines.length - 1] === '') {
    lines.pop()
  }
  const joiner = pack.lineEnding === 'CRLF' ? '\r\n' : '\n'
  return lines.join(joiner)
}

export function formatEbpFilename(
  pack: BankFormatPack,
  context: EbpRenderContext
): string {
  const pattern = pack.filenamePattern || `EBP_{{batch.folio}}.${pack.outputExtension.replace(/^\./, '')}`
  const name = renderBlock(
    pattern,
    {
      company: context.company,
      bankAccount: context.bankAccount,
      batch: context.batch,
      payments: context.payments,
    },
    pack
  ).replace(/[^a-zA-Z0-9_.-]/g, '_')
  const ext = pack.outputExtension.startsWith('.')
    ? pack.outputExtension
    : `.${pack.outputExtension}`
  return name.toLowerCase().endsWith(ext.toLowerCase()) ? name : `${name}${ext}`
}

export function downloadEncodedEbpFile(
  content: string,
  filename: string,
  encoding: EbpEncoding
): void {
  let blob: Blob
  if (encoding === 'UTF-8-BOM') {
    blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8;' })
  } else if (encoding === 'UTF-8') {
    blob = new Blob([content], { type: 'text/plain;charset=utf-8;' })
  } else if (encoding === 'ISO-8859-1') {
    const bytes = new Uint8Array(content.length)
    for (let i = 0; i < content.length; i++) {
      const code = content.charCodeAt(i)
      bytes[i] = code <= 0xff ? code : 0x3f // '?'
    }
    blob = new Blob([bytes], { type: 'application/octet-stream' })
  } else {
    // ASCII strict 7-bit
    const ascii = stripAccents(content)
    const bytes = new Uint8Array(ascii.length)
    for (let i = 0; i < ascii.length; i++) {
      const code = ascii.charCodeAt(i)
      bytes[i] = code <= 0x7f ? code : 0x20
    }
    blob = new Blob([bytes], { type: 'application/octet-stream' })
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Seeded Marketplace Bank Format Packs (7 Pillars EBP)
// ---------------------------------------------------------------------------

export const initialBankFormatPacks: BankFormatPack[] = [
  {
    id: 'pack_bbva_netcash_nomina',
    packCode: 'BBVA-NC-NOM-MX',
    version: '2.4.0',
    name: 'BBVA Net Cash · Dispersión de Nómina',
    bankName: 'BBVA México',
    country: 'MX',
    operationType: 'payroll',
    channel: 'mixed',
    description:
      'Layout posicional ancho fijo (Header 01 + Detalle 02 + Tráiler 09) para dispersión de nómina en BBVA Net Cash con soporte mismo banco e interbancario.',
    outputExtension: '.txt',
    encoding: 'ISO-8859-1',
    lineEnding: 'CRLF',
    filenamePattern: 'BBVA_NOM_{{dateFmt(batch.executionDate,"yyyyMMdd")}}_{{batch.sequence}}.txt',
    supportedCurrencies: ['MXN'],
    licenseTier: 'included',
    priceLabel: 'Incluida en Plan Base',
    installed: true,
    licenseActive: true,
    changelog: 'Incluye catálogo de modalidades de abono BBVA y validación de emisora de 8 dígitos.',
    embeddedCatalogs: {
      bbva_service_types: {
        title: 'Tipos de servicio BBVA Net Cash',
        options: [
          { code: 'NOM', label: 'NOM · Dispersión de Nómina Tradicional' },
          { code: 'BON', label: 'BON · Bonos y Compensación Variable' },
          { code: 'LIQ', label: 'LIQ · Finiquitos y Liquidaciones' },
        ],
      },
      bbva_abono_modes: {
        title: 'Modalidad de abono destino BBVA',
        options: [
          { code: '01', label: '01 · Abono a Cuenta BBVA (Mismo banco)' },
          { code: '40', label: '40 · Transferencia Interbancaria CLABE' },
          { code: '03', label: '03 · Tarjeta de Débito / Nómina' },
        ],
      },
    },
    companyBankSchema: [
      {
        key: 'emisoraCode',
        label: 'Clave de Emisora BBVA',
        type: 'text',
        placeholder: 'Ej. 00048219',
        helpText: 'Asignada por BBVA en tu contrato de Net Cash (8 dígitos).',
        defaultValue: '00048219',
        validators: { required: true, digitsOnly: true, minLength: 8, maxLength: 8 },
      },
      {
        key: 'contractNumber',
        label: 'Número de Contrato Pago Electrónico',
        type: 'text',
        placeholder: 'Ej. 98210455',
        helpText: 'Contrato de dispersión de nómina vinculado a la cuenta.',
        defaultValue: '98210455',
        validators: { required: true, digitsOnly: true, minLength: 6, maxLength: 10 },
      },
      {
        key: 'serviceType',
        label: 'Clave de Servicio BBVA',
        type: 'select_catalog',
        catalogRef: 'bbva_service_types',
        defaultValue: 'NOM',
        validators: { required: true },
      },
    ],
    beneficiaryBankSchema: [
      {
        key: 'abonoMode',
        label: 'Modalidad de abono BBVA',
        type: 'select_catalog',
        catalogRef: 'bbva_abono_modes',
        defaultValue: '40',
        helpText: '01 para cuentas BBVA, 40 para CLABE de otros bancos.',
        validators: { required: true },
      },
      {
        key: 'plazaCode',
        label: 'Código de Plaza BBVA',
        type: 'text',
        placeholder: 'Ej. 001',
        defaultValue: '001',
        validators: { required: true, digitsOnly: true, minLength: 3, maxLength: 3 },
      },
    ],
    templateBody: [
      '01{{padLeft(bankAccount.custom.emisoraCode,8,"0")}}{{padLeft(bankAccount.custom.contractNumber,10,"0")}}{{padRight(bankAccount.custom.serviceType,3," ")}}{{dateFmt(batch.executionDate,"yyyyMMdd")}}{{padLeft(batch.sequence,4,"0")}}{{padRight(upper(company.rfc),13," ")}}{{padRight(upper(company.name),35," ")}}',
      '{{#each payments}}',
      '02{{lineSeq(6)}}{{padRight(payment.custom.abonoMode,2,"0")}}{{padLeft(payment.clabe,18,"0")}}{{padLeft(payment.custom.plazaCode,3,"0")}}{{cents(payment.amount,15)}}{{padRight(upper(payment.beneficiaryName),40," ")}}{{padRight(upper(payment.reference),20," ")}}{{padRight(upper(payment.rfc),13," ")}}',
      '{{/each}}',
      '09{{count(6)}}{{sumCents("amount",18)}}{{dateFmt(batch.executionDate,"yyyyMMdd")}}',
    ].join('\n'),
  },
  {
    id: 'pack_banorte_bem_pagos',
    packCode: 'BANORTE-BEM-PROV-MX',
    version: '3.1.2',
    name: 'Banorte BEM · Pagos Masivos Proveedores y Nómina',
    bankName: 'Banorte',
    country: 'MX',
    operationType: 'both',
    channel: 'mixed',
    description:
      'Layout multicontrol con agrupación por canal (Mismo Banco Banorte vs. SPEI Interbancario), listas internas de claves Banorte y codificación ASCII estricta.',
    outputExtension: '.txt',
    encoding: 'ASCII',
    lineEnding: 'CRLF',
    filenamePattern: 'BEM_{{bankAccount.custom.companyId}}_{{dateFmt(batch.executionDate,"yyMMdd")}}{{padLeft(batch.sequence,2,"0")}}.txt',
    supportedCurrencies: ['MXN'],
    licenseTier: 'included',
    priceLabel: 'Incluida en Plan Base',
    installed: true,
    licenseActive: true,
    changelog: 'Soporta agrupación automática por tipo de operación (01 Propio / 04 SPEI).',
    embeddedCatalogs: {
      banorte_op_types: {
        title: 'Tipo de Operación Banorte BEM',
        options: [
          { code: '01', label: '01 · Traspaso Cuentas Propias / Terceros Banorte' },
          { code: '02', label: '02 · TEF Programado (Mismo día / Siguiente)' },
          { code: '04', label: '04 · SPEI Interbancario Tiempo Real' },
        ],
      },
      banorte_bank_codes: {
        title: 'Catálogo Interno Bancos Banorte (3 dígitos)',
        options: [
          { code: '072', label: '072 · Banorte / IXE' },
          { code: '012', label: '012 · BBVA México' },
          { code: '014', label: '014 · Santander' },
          { code: '002', label: '002 · Citibanamex' },
          { code: '021', label: '021 · HSBC México' },
          { code: '044', label: '044 · Scotiabank' },
        ],
      },
    },
    companyBankSchema: [
      {
        key: 'companyId',
        label: 'ID Empresa Banorte BEM',
        type: 'text',
        placeholder: 'Ej. 008812',
        defaultValue: '008812',
        helpText: 'Identificador numérico asignado en Banorte en su Empresa.',
        validators: { required: true, digitsOnly: true, minLength: 4, maxLength: 8 },
      },
      {
        key: 'originAccount11',
        label: 'Cuenta Cargo Banorte (10-11 dígitos)',
        type: 'text',
        placeholder: 'Ej. 0881204918',
        defaultValue: '0881204918',
        validators: { required: true, digitsOnly: true, minLength: 10, maxLength: 11 },
      },
    ],
    beneficiaryBankSchema: [
      {
        key: 'operationCode',
        label: 'Tipo de Operación Banorte',
        type: 'select_catalog',
        catalogRef: 'banorte_op_types',
        defaultValue: '04',
        validators: { required: true },
      },
      {
        key: 'destBankCode',
        label: 'Clave Banco Destino (Banorte)',
        type: 'select_catalog',
        catalogRef: 'banorte_bank_codes',
        defaultValue: '012',
        validators: { required: true },
      },
    ],
    templateBody: [
      'H01|{{padLeft(bankAccount.custom.companyId,8,"0")}}|{{dateFmt(batch.executionDate,"yyyyMMdd")}}|{{batch.currency}}|{{padRight(upper(company.rfc),13," ")}}',
      '{{#groupBy payments "channelType"}}',
      'B02|{{group.key}}|{{count(4)}}|{{sumCents("amount",15)}}',
      '{{#each group.items}}',
      'D04|{{lineSeq(5)}}|{{payment.custom.operationCode}}|{{payment.custom.destBankCode}}|{{padLeft(bankAccount.custom.originAccount11,11,"0")}}|{{padLeft(payment.clabe,18,"0")}}|{{cents(payment.amount,15)}}|{{padRight(digits(payment.reference),7,"0")}}|{{padRight(upper(payment.beneficiaryName),35," ")}}|{{padRight(upper(payment.concept),30," ")}}',
      '{{/each}}',
      'T08|{{group.key}}|{{count(4)}}|{{sumCents("amount",15)}}',
      '{{/groupBy}}',
      'F09|{{count(6)}}|{{sumCents("amount",18)}}',
    ].join('\n'),
  },
  {
    id: 'pack_santander_enlace_csv',
    packCode: 'SANTANDER-CSV-SIMPLE',
    version: '1.5.0',
    name: 'Santander Enlace · Layout Plano (Solo Líneas)',
    bankName: 'Santander',
    country: 'MX',
    operationType: 'both',
    channel: 'mixed',
    description:
      'Ejemplo sin encabezado ni tráiler: genera únicamente las líneas de pago delimitadas por coma para carga directa en Santander Enlace.',
    outputExtension: '.csv',
    encoding: 'UTF-8',
    lineEnding: 'CRLF',
    filenamePattern: 'SANTANDER_{{batch.folio}}_{{dateFmt(batch.executionDate,"yyyyMMdd")}}.csv',
    supportedCurrencies: ['MXN'],
    licenseTier: 'promo',
    promoBadge: 'Promoción · Gratis por lanzamiento',
    priceLabel: 'Promoción $0 MXN',
    installed: false,
    licenseActive: true,
    changelog: 'Sin registros de control; cada fila representa una instrucción individual.',
    embeddedCatalogs: {
      santander_tx_type: {
        title: 'Tipo de Envío Santander',
        options: [
          { code: 'I', label: 'I · Transferencia Interbancaria SPEI' },
          { code: 'M', label: 'M · Traspaso Mismo Banco Santander' },
        ],
      },
    },
    companyBankSchema: [
      {
        key: 'clientCode',
        label: 'Código de Cliente Santander',
        type: 'text',
        placeholder: 'Ej. SAN-4091',
        defaultValue: 'SAN-4091',
        validators: { required: true, minLength: 4, maxLength: 16 },
      },
    ],
    beneficiaryBankSchema: [
      {
        key: 'txType',
        label: 'Tipo de envío Santander',
        type: 'select_catalog',
        catalogRef: 'santander_tx_type',
        defaultValue: 'I',
        validators: { required: true },
      },
    ],
    templateBody: [
      '{{#each payments}}',
      '{{csv(payment.custom.txType)}},{{csv(bankAccount.clabe)}},{{csv(payment.clabe)}},{{decimal(payment.amount,2)}},{{csv(upper(payment.beneficiaryName))}},{{csv(digits(payment.reference))}},{{csv(upper(payment.concept))}},{{csv(batch.currency)}}',
      '{{/each}}',
    ].join('\n'),
  },
  {
    id: 'pack_iso20022_pain001_xml',
    packCode: 'ISO20022-PAIN001-XML',
    version: '1.0.3',
    name: 'ISO 20022 pain.001.001.03 · XML Corporativo',
    bankName: 'Multibanco / ISO 20022',
    country: 'GLOBAL',
    operationType: 'both',
    channel: 'interbank_spei',
    description:
      'Estándar bancario internacional XML para tesorerías corporativas (HSBC, Citibanamex, Scotiabank y banca global). Soporta MXN y USD.',
    outputExtension: '.xml',
    encoding: 'UTF-8',
    lineEnding: 'LF',
    filenamePattern: 'PAIN001_{{batch.folio}}_{{dateFmt(batch.executionDate,"yyyyMMdd")}}.xml',
    supportedCurrencies: ['MXN', 'USD'],
    licenseTier: 'paid',
    promoBadge: 'Licencia Pro · Multimoneda',
    priceLabel: 'Licencia Pro ($2,490 MXN/año)',
    installed: false,
    licenseActive: false,
    changelog: 'Estructura completa CstmrCdtTrfInitn con GrpHdr, PmtInf y CdtTrfTxInf.',
    embeddedCatalogs: {
      iso_svc_level: {
        title: 'Nivel de Servicio ISO 20022',
        options: [
          { code: 'SEPA', label: 'SEPA / Estándar Doméstico' },
          { code: 'NURG', label: 'NURG · Transferencia Normal' },
          { code: 'URGP', label: 'URGP · Pago Urgente / SPEI' },
        ],
      },
    },
    companyBankSchema: [
      {
        key: 'bicOrigin',
        label: 'BIC / SWIFT Banco Ordenante',
        type: 'text',
        placeholder: 'Ej. BCMRMXMMPYM',
        defaultValue: 'BCMRMXMMPYM',
        validators: { required: true, minLength: 8, maxLength: 11 },
      },
      {
        key: 'serviceLevel',
        label: 'Nivel de Servicio (SvcLvl)',
        type: 'select_catalog',
        catalogRef: 'iso_svc_level',
        defaultValue: 'URGP',
        validators: { required: true },
      },
    ],
    beneficiaryBankSchema: [
      {
        key: 'beneficiaryEmail',
        label: 'Correo para notificación XML (opcional)',
        type: 'text',
        placeholder: 'tesoreria@beneficiario.mx',
        validators: { required: false, maxLength: 64 },
      },
    ],
    templateBody: [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">',
      '  <CstmrCdtTrfInitn>',
      '    <GrpHdr>',
      '      <MsgId>{{xmlEscape(batch.folio)}}</MsgId>',
      '      <CreDtTm>{{dateFmt(batch.executionDate,"yyyy-MM-dd")}}T09:00:00</CreDtTm>',
      '      <NbOfTxs>{{count()}}</NbOfTxs>',
      '      <CtrlSum>{{sum("amount")}}</CtrlSum>',
      '      <InitgPty>',
      '        <Nm>{{xmlEscape(upper(company.name))}}</Nm>',
      '        <Id><OrgId><Othr><Id>{{xmlEscape(company.rfc)}}</Id></Othr></OrgId></Id>',
      '      </InitgPty>',
      '    </GrpHdr>',
      '    <PmtInf>',
      '      <PmtInfId>LOTE-{{xmlEscape(batch.sequence)}}</PmtInfId>',
      '      <PmtMtd>TRF</PmtMtd>',
      '      <NbOfTxs>{{count()}}</NbOfTxs>',
      '      <CtrlSum>{{sum("amount")}}</CtrlSum>',
      '      <PmtTpInf><SvcLvl><Cd>{{xmlEscape(bankAccount.custom.serviceLevel)}}</Cd></SvcLvl></PmtTpInf>',
      '      <ReqdExctnDt>{{dateFmt(batch.executionDate,"yyyy-MM-dd")}}</ReqdExctnDt>',
      '      <Dbtr><Nm>{{xmlEscape(upper(company.name))}}</Nm></Dbtr>',
      '      <DbtrAcct><Id><Othr><Id>{{bankAccount.clabe}}</Id></Othr></Id><Ccy>{{batch.currency}}</Ccy></DbtrAcct>',
      '      <DbtrAgt><FinInstnId><BIC>{{xmlEscape(bankAccount.custom.bicOrigin)}}</BIC></FinInstnId></DbtrAgt>',
      '{{#each payments}}',
      '      <CdtTrfTxInf>',
      '        <PmtId><EndToEndId>{{xmlEscape(batch.folio)}}-{{lineSeq(4)}}</EndToEndId></PmtId>',
      '        <Amt><InstdAmt Ccy="{{batch.currency}}">{{decimal(payment.amount,2)}}</InstdAmt></Amt>',
      '        <Cdtr><Nm>{{xmlEscape(upper(payment.beneficiaryName))}}</Nm></Cdtr>',
      '        <CdtrAcct><Id><Othr><Id>{{payment.clabe}}</Id></Othr></Id></CdtrAcct>',
      '        <RmtInf><Ustrd>{{xmlEscape(payment.concept)}}</Ustrd></RmtInf>',
      '      </CdtTrfTxInf>',
      '{{/each}}',
      '    </PmtInf>',
      '  </CstmrCdtTrfInitn>',
      '</Document>',
    ].join('\n'),
  },
]

export const initialEbpBatches: ElectronicPaymentBatch[] = [
  {
    id: 'ebp_batch_1',
    folio: 'EBP-2026-0001',
    batchType: 'Nómina',
    packId: 'pack_bbva_netcash_nomina',
    packName: 'BBVA Net Cash · Dispersión de Nómina',
    packVersion: '2.4.0',
    bankAccountId: 'bank_1',
    bankAccountName: 'BBVA México (**** 4920)',
    currency: 'MXN',
    sourceRefId: 'pay_1',
    sourceFolio: 'NOM-2026-Q21',
    executionDate: '2026-11-15',
    operationsCount: 5,
    totalAmount: 98420,
    status: 'Aplicado en banco',
    generatedFilename: 'BBVA_NOM_20261115_0001.txt',
    generatedContent: '01000482190098210455NOM202611150001AESN210412AB1AES NEXUS TECHNOLOGIES SA DE CV',
    encoding: 'ISO-8859-1',
    createdAt: '15 nov 2026 · 09:42',
    appliedAt: '15 nov 2026 · 10:15',
    lines: [],
  },
]
