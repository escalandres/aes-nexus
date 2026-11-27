import { Router } from 'express'
import { SalesController } from '../controllers/sales.controller.ts'
import { authenticateTenantMiddleware, requireSectionAccess } from '../middlewares/tenantAuth.ts'

export const salesRouter = Router()
const controller = new SalesController()

salesRouter.use(authenticateTenantMiddleware)

salesRouter.get('/catalog', requireSectionAccess('Ventas', 'Catálogo', 'view'), controller.listCatalog)
salesRouter.post('/catalog', requireSectionAccess('Ventas', 'Catálogo', 'create'), controller.createCatalogItem)

salesRouter.get('/quotes', requireSectionAccess('Ventas', 'Cotizaciones', 'view'), controller.listQuotes)
salesRouter.post('/quotes', requireSectionAccess('Ventas', 'Cotizaciones', 'create'), controller.createQuote)
salesRouter.post(
  '/quotes/:id/convert-to-order',
  requireSectionAccess('Ventas', 'Pedidos', 'create'),
  controller.convertQuoteToOrder
)

salesRouter.get('/orders', requireSectionAccess('Ventas', 'Pedidos', 'view'), controller.listOrders)
salesRouter.post('/orders', requireSectionAccess('Ventas', 'Pedidos', 'create'), controller.createOrder)
