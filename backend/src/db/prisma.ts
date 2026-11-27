import { PrismaClient } from '@prisma/client'
import { ensurePostgresReady, resolvePostgresTarget } from './postgres.ts'

let prismaInstance: PrismaClient | null = null

function buildPrismaDatasourceUrl(): string | null {
  const target = resolvePostgresTarget()
  if (!target) return null

  if (target.connectionString) {
    return target.connectionString
  }

  if (target.host && target.database && target.user && target.password) {
    const url = new URL('postgresql://localhost')
    url.hostname = target.host
    url.port = String(target.port || 5432)
    url.pathname = `/${encodeURIComponent(target.database)}`
    url.username = target.user
    url.password = target.password
    if (target.ssl === false) {
      url.searchParams.set('sslmode', 'disable')
    } else {
      url.searchParams.set('sslmode', 'require')
    }
    return url.toString()
  }

  return null
}

export function getPrismaClient(): PrismaClient | null {
  const url = buildPrismaDatasourceUrl()
  if (!url) return null

  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      datasources: {
        db: { url },
      },
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
  }

  return prismaInstance
}

export async function getPrismaClientReady(): Promise<PrismaClient | null> {
  const client = getPrismaClient()
  if (!client) return null
  await ensurePostgresReady()
  return client
}
