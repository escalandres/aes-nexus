import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export type DbProviderSetting = 'auto' | 'neon' | 'docker' | 'local'

function isRealEnvValue(key: string, val: string | undefined): boolean {
  if (!val) return false
  const trimmed = val.trim()
  if (!trimmed || trimmed === 'a') return false
  if (key === 'DATABASE_URL' || key === 'DOCKER_DATABASE_URL') {
    return /^postgres(?:ql)?:\/\//i.test(trimmed)
  }
  if (key === 'PGPORT' || key === 'PORT') {
    const n = Number(trimmed)
    return Number.isInteger(n) && n > 0 && n <= 65535
  }
  return true
}

function loadDotEnvIfPresent(): void {
  const envPath = path.resolve(import.meta.dirname, '../../../.env')
  if (!fs.existsSync(envPath)) return
  try {
    const content = fs.readFileSync(envPath, 'utf8')
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      const eqIdx = line.indexOf('=')
      if (eqIdx <= 0) continue
      const key = line.slice(0, eqIdx).trim()
      let val = line.slice(eqIdx + 1).trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      if (val !== '' && !isRealEnvValue(key, process.env[key])) {
        process.env[key] = val
      }
    }
  } catch {
    // Ignore unreadable .env and fall back to process.env
  }
}

loadDotEnvIfPresent()

const EPHEMERAL_SIGNING_SECRET = crypto.randomBytes(32).toString('hex')

function normalizeEnvString(raw: string | undefined): string {
  const trimmed = raw?.trim() || ''
  return trimmed === 'a' ? '' : trimmed
}

function parsePort(raw: string | undefined, fallback: number): number {
  const n = Number(raw?.trim())
  return Number.isInteger(n) && n > 0 && n <= 65535 ? n : fallback
}

const VALID_SSL_MODES = new Set(['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full'])
function parseSslMode(raw: string | undefined): string {
  const mode = raw?.trim().toLowerCase() || ''
  return VALID_SSL_MODES.has(mode) ? mode : ''
}

const VALID_PROVIDERS = new Set<DbProviderSetting>(['auto', 'neon', 'docker', 'local'])
function parseDbProvider(raw: string | undefined): DbProviderSetting {
  const normalized = normalizeEnvString(raw).toLowerCase() as DbProviderSetting
  return VALID_PROVIDERS.has(normalized) ? normalized : 'auto'
}

export function isValidPostgresUrl(raw: string): boolean {
  if (!raw || !/^postgres(?:ql)?:\/\//i.test(raw)) return false
  try {
    const parsed = new URL(raw)
    return Boolean(parsed.hostname && parsed.hostname.length > 1)
  } catch {
    return false
  }
}

const rawDatabaseUrl = normalizeEnvString(process.env.DATABASE_URL)
const rawDockerDatabaseUrl = normalizeEnvString(process.env.DOCKER_DATABASE_URL)
const resolvedJwtSecret =
  normalizeEnvString(process.env.JWT_SECRET) ||
  normalizeEnvString(process.env.SESSION_SECRET) ||
  EPHEMERAL_SIGNING_SECRET

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(normalizeEnvString(raw))
  return Number.isInteger(n) && n > 0 ? n : fallback
}

export const env = {
  nodeEnv: normalizeEnvString(process.env.NODE_ENV) || 'development',
  port: parsePort(process.env.PORT, 3000),
  dbProvider: parseDbProvider(process.env.DB_PROVIDER),
  databaseUrl: isValidPostgresUrl(rawDatabaseUrl) ? rawDatabaseUrl : '',
  dockerDatabaseUrl: isValidPostgresUrl(rawDockerDatabaseUrl) ? rawDockerDatabaseUrl : '',
  pg: {
    host: normalizeEnvString(process.env.PGHOST),
    port: parsePort(process.env.PGPORT, 5432),
    database: normalizeEnvString(process.env.PGDATABASE),
    user: normalizeEnvString(process.env.PGUSER),
    password: normalizeEnvString(process.env.PGPASSWORD),
    sslMode: parseSslMode(process.env.PGSSLMODE),
  },
  corsOrigin: normalizeEnvString(process.env.CORS_ORIGIN),
  jwtSecret: resolvedJwtSecret,
  jwtIssuer: normalizeEnvString(process.env.JWT_ISSUER) || 'aes-nexus-api',
  jwtAudience: normalizeEnvString(process.env.JWT_AUDIENCE) || 'aes-nexus-app',
  jwtExpiresInSeconds: parsePositiveInt(process.env.JWT_EXPIRES_IN_SECONDS, 8 * 60 * 60),
  sessionSigningSecret: resolvedJwtSecret,
  adminBootstrapPasscode: normalizeEnvString(process.env.ADMIN_BOOTSTRAP_PASSCODE),
  oidcJwksUri: normalizeEnvString(process.env.OIDC_JWKS_URI),
  oidcIssuer: normalizeEnvString(process.env.OIDC_ISSUER),
  oidcAudience: normalizeEnvString(process.env.OIDC_AUDIENCE),
} as const
