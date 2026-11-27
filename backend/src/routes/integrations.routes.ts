import { Router } from 'express'
import { IntegrationsController } from '../controllers/integrations.controller.ts'
import { authenticateTenantMiddleware, requireSectionAccess } from '../middlewares/tenantAuth.ts'

export const integrationsRouter = Router()
const controller = new IntegrationsController()

integrationsRouter.use(authenticateTenantMiddleware)

integrationsRouter.get('/lookup', controller.lookup)
integrationsRouter.get('/mappings', controller.listMappings)
integrationsRouter.post(
  '/mappings',
  requireSectionAccess('Configuración', 'Integraciones', 'edit'),
  controller.upsertMapping
)
integrationsRouter.delete(
  '/mappings/:mappingId',
  requireSectionAccess('Configuración', 'Integraciones', 'full'),
  controller.deleteMapping
)
