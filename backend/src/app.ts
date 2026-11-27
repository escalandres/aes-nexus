import express from 'express'
import { env } from './config/env.ts'
import { AppError } from './errors/AppError.ts'
import { errorHandlerMiddleware } from './middlewares/errorHandler.ts'
import { requestContextMiddleware } from './middlewares/requestContext.ts'
import { adminRouter } from './routes/admin.routes.ts'
import { authRouter } from './routes/auth.routes.ts'
import { compraRouter } from './routes/compra.routes.ts'
import { crmRouter } from './routes/crm.routes.ts'
import { empleadoRouter } from './routes/empleado.routes.ts'
import { empresaRouter } from './routes/empresa.routes.ts'
import { healthRouter } from './routes/health.routes.ts'
import { integrationsRouter } from './routes/integrations.routes.ts'
import { inventarioRouter } from './routes/inventario.routes.ts'
import { productoRouter } from './routes/producto.routes.ts'
import { salesRouter } from './routes/sales.routes.ts'

export function createApiRouter() {
  const api = express.Router()

  api.use(requestContextMiddleware)

  // Strict origin handling for cross-origin API calls (no wildcard with auth)
  const allowedOrigins = env.corsOrigin
    ? env.corsOrigin.split(',').map((o) => o.trim()).filter(Boolean)
    : []

  api.use((req, res, next) => {
    const origin = req.header('Origin')
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Vary', 'Origin')
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Organization-Id, X-External-System, Idempotency-Key, X-Request-Id')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
      if (req.method === 'OPTIONS') {
        res.status(204).send()
        return
      }
    }
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    next()
  })

  api.use(express.json({ limit: '2mb' }))

  api.use('/v1/health', healthRouter)
  api.use('/v1/auth', authRouter)
  api.use('/v1/integrations', integrationsRouter)
  api.use('/v1/crm', crmRouter)
  api.use('/v1/sales', salesRouter)
  api.use('/v1/admin', adminRouter)
  api.use('/v1/empresas', empresaRouter)
  api.use('/v1/empleados', empleadoRouter)
  api.use('/v1/productos', productoRouter)
  api.use('/v1/compras', compraRouter)
  api.use('/v1/inventario', inventarioRouter)

  api.use((_req, _res, next) => {
    next(new AppError(404, 'RESOURCE_NOT_FOUND', 'Endpoint de API no encontrado.'))
  })

  api.use(errorHandlerMiddleware)
  return api
}
