import { Router } from 'express'
import { InventarioController } from '../controllers/inventario.controller.ts'
import { authenticateTenantMiddleware, requireSectionAccess } from '../middlewares/tenantAuth.ts'

export const inventarioRouter = Router()
const controller = new InventarioController()

inventarioRouter.use(authenticateTenantMiddleware)

inventarioRouter.get('/', requireSectionAccess('Operaciones', 'Inventario', 'view'), controller.list)
inventarioRouter.get(
  '/external/:externalSource/:externalId',
  requireSectionAccess('Operaciones', 'Inventario', 'view'),
  controller.getByExternal
)
inventarioRouter.get('/:id', requireSectionAccess('Operaciones', 'Inventario', 'view'), controller.getById)
inventarioRouter.post('/', requireSectionAccess('Operaciones', 'Inventario', 'create'), controller.create)
inventarioRouter.put('/:id', requireSectionAccess('Operaciones', 'Inventario', 'edit'), controller.update)
inventarioRouter.patch('/:id', requireSectionAccess('Operaciones', 'Inventario', 'edit'), controller.update)
inventarioRouter.delete('/:id', requireSectionAccess('Operaciones', 'Inventario', 'full'), controller.delete)
