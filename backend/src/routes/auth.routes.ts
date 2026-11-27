import { Router } from 'express'
import { AuthController } from '../controllers/auth.controller.ts'
import { authenticateTenantMiddleware, requireSectionAccess } from '../middlewares/tenantAuth.ts'

export const authRouter = Router()
const controller = new AuthController()

authRouter.get('/bootstrap-status', controller.bootstrapStatus)
authRouter.post('/bootstrap-admin', controller.bootstrapAdmin)
authRouter.post('/login', controller.login)

authRouter.get('/me', authenticateTenantMiddleware, controller.me)
authRouter.post(
  '/api-keys',
  authenticateTenantMiddleware,
  requireSectionAccess('Configuración', 'Integraciones', 'create'),
  controller.issueApiKey
)
