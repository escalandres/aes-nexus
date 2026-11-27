import { Router } from 'express'
import { ProductoController } from '../controllers/producto.controller.ts'
import { authenticateTenantMiddleware, requireSectionAccess } from '../middlewares/tenantAuth.ts'

export const productoRouter = Router()
const controller = new ProductoController()

productoRouter.use(authenticateTenantMiddleware)

productoRouter.get('/', requireSectionAccess('Ventas', 'Catálogo', 'view'), controller.list)
productoRouter.get(
  '/external/:externalSource/:externalId',
  requireSectionAccess('Ventas', 'Catálogo', 'view'),
  controller.getByExternal
)
productoRouter.get('/:id', requireSectionAccess('Ventas', 'Catálogo', 'view'), controller.getById)
productoRouter.post('/', requireSectionAccess('Ventas', 'Catálogo', 'create'), controller.create)
productoRouter.put('/:id', requireSectionAccess('Ventas', 'Catálogo', 'edit'), controller.update)
productoRouter.patch('/:id', requireSectionAccess('Ventas', 'Catálogo', 'edit'), controller.update)
productoRouter.delete('/:id', requireSectionAccess('Ventas', 'Catálogo', 'full'), controller.delete)
