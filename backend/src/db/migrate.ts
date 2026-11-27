import { getActiveDbMode, isPostgresEnabled, migratePostgresSchema } from './postgres.ts'

async function main() {
  if (!isPostgresEnabled()) {
    console.error(
      'No hay una base PostgreSQL configurada en .env. Configura DATABASE_URL (Neon) o DOCKER_DATABASE_URL (Docker) con DB_PROVIDER=neon|docker|auto.'
    )
    process.exit(1)
  }

  const mode = getActiveDbMode()
  await migratePostgresSchema()
  console.log(`Esquema maestro e índices de ID externo aplicados correctamente en ${mode}.`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Error ejecutando migración en PostgreSQL:', err instanceof Error ? err.message : err)
  process.exit(1)
})
