import { Router } from 'express'
import { CrmController } from '../controllers/crm.controller.ts'
import { authenticateTenantMiddleware, requireSectionAccess } from '../middlewares/tenantAuth.ts'
import { empleadoRouter } from './empleado.routes.ts'

export const crmRouter = Router()
const controller = new CrmController()

crmRouter.use('/employees', empleadoRouter)
crmRouter.use(authenticateTenantMiddleware)

// Customers
crmRouter.get('/customers', requireSectionAccess('CRM', 'Clientes', 'view'), controller.listClients)
crmRouter.get('/customers/:id', requireSectionAccess('CRM', 'Clientes', 'view'), controller.getClient)
crmRouter.post('/customers', requireSectionAccess('CRM', 'Clientes', 'create'), controller.createClient)
crmRouter.put('/customers/:id', requireSectionAccess('CRM', 'Clientes', 'edit'), controller.updateClient)
crmRouter.patch('/customers/:id', requireSectionAccess('CRM', 'Clientes', 'edit'), controller.updateClient)
crmRouter.delete('/customers/:id', requireSectionAccess('CRM', 'Clientes', 'full'), controller.deleteClient)

// Vendors
crmRouter.get('/vendors', requireSectionAccess('CRM', 'Proveedores', 'view'), controller.listVendors)
crmRouter.get('/vendors/:id', requireSectionAccess('CRM', 'Proveedores', 'view'), controller.getVendor)
crmRouter.post('/vendors', requireSectionAccess('CRM', 'Proveedores', 'create'), controller.createVendor)
crmRouter.put('/vendors/:id', requireSectionAccess('CRM', 'Proveedores', 'edit'), controller.updateVendor)
crmRouter.patch('/vendors/:id', requireSectionAccess('CRM', 'Proveedores', 'edit'), controller.updateVendor)
crmRouter.delete('/vendors/:id', requireSectionAccess('CRM', 'Proveedores', 'full'), controller.deleteVendor)
