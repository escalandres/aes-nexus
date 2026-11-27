import { Router } from 'express'
import { EmpresaController } from '../controllers/empresa.controller.ts'
import { authenticateTenantMiddleware, requireSectionAccess } from '../middlewares/tenantAuth.ts'

export const empresaRouter = Router()
const controller = new EmpresaController()

empresaRouter.use(authenticateTenantMiddleware)

empresaRouter.get('/', requireSectionAccess('Administración', 'Subsidiarias', 'view'), controller.list)
empresaRouter.get(
  '/external/:externalSource/:externalId',
  requireSectionAccess('Administración', 'Subsidiarias', 'view'),
  controller.getByExternal
)
empresaRouter.get('/:id', requireSectionAccess('Administración', 'Subsidiarias', 'view'), controller.getById)
empresaRouter.post('/', requireSectionAccess('Administración', 'Subsidiarias', 'create'), controller.create)
empresaRouter.put('/:id', requireSectionAccess('Administración', 'Subsidiarias', 'edit'), controller.update)
empresaRouter.patch('/:id', requireSectionAccess('Administración', 'Subsidiarias', 'edit'), controller.update)
empresaRouter.delete('/:id', requireSectionAccess('Administración', 'Subsidiarias', 'full'), controller.delete)
