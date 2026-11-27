import { Router } from 'express'
import { CompraController } from '../controllers/compra.controller.ts'
import { authenticateTenantMiddleware, requireSectionAccess } from '../middlewares/tenantAuth.ts'

export const compraRouter = Router()
const controller = new CompraController()

compraRouter.use(authenticateTenantMiddleware)

compraRouter.get('/', requireSectionAccess('Compras', 'Órdenes de compra', 'view'), controller.list)
compraRouter.get(
  '/external/:externalSource/:externalId',
  requireSectionAccess('Compras', 'Órdenes de compra', 'view'),
  controller.getByExternal
)
compraRouter.get('/:id', requireSectionAccess('Compras', 'Órdenes de compra', 'view'), controller.getById)
compraRouter.post('/', requireSectionAccess('Compras', 'Órdenes de compra', 'create'), controller.create)
compraRouter.put('/:id', requireSectionAccess('Compras', 'Órdenes de compra', 'edit'), controller.update)
compraRouter.patch('/:id', requireSectionAccess('Compras', 'Órdenes de compra', 'edit'), controller.update)
compraRouter.delete('/:id', requireSectionAccess('Compras', 'Órdenes de compra', 'full'), controller.delete)
