import express from 'express'
import path from 'node:path'
import { createApiRouter, createV1Router } from './backend/src/app.ts'
import { env } from './backend/src/config/env.ts'

async function startServer() {
  const app = express()
  app.set('trust proxy', 1)

  // Mount versioned backend API under /api/v1 and /v1
  app.use('/api', createApiRouter())
  app.use('/v1', createV1Router())

  if (env.nodeEnv !== 'production') {
    const { createServer: createViteServer } = await import('vite')
    const vite = await createViteServer({
      configFile: path.resolve(import.meta.dirname, 'vite.config.ts'),
      server: { middlewareMode: true },
      appType: 'spa',
    })
    app.use(vite.middlewares)
  } else {
    const distDir = path.resolve(import.meta.dirname, 'dist')
    app.use(express.static(distDir))
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'))
    })
  }

  app.listen(env.port, '0.0.0.0', () => {
    console.log(`AES Nexus server running on http://0.0.0.0:${env.port}`)
  })
}

startServer().catch((err) => {
  console.error('Failed to start AES Nexus server:', err)
  process.exit(1)
})
