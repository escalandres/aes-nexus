import { Router } from 'express'
import { env } from '../config/env.ts'
import { checkDatabaseHealth } from '../db/storage.ts'

export const healthRouter = Router()

healthRouter.get('/', async (_req, res) => {
  const db = await checkDatabaseHealth()
  res.status(db.ok ? 200 : 503).json({
    ok: db.ok,
    service: 'aes-nexus-api',
    dbProvider: env.dbProvider,
    storageMode: db.mode,
    timestamp: new Date().toISOString(),
  })
})
