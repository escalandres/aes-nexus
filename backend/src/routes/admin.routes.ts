import { Router } from 'express'
import { AdminController } from '../controllers/admin.controller.ts'
import { authenticateTenantMiddleware, requireSectionAccess } from '../middlewares/tenantAuth.ts'
import { empresaRouter } from './empresa.routes.ts'

export const adminRouter = Router()
const controller = new AdminController()

adminRouter.use('/empresas', empresaRouter)
adminRouter.use('/subsidiaries', empresaRouter)

adminRouter.use(authenticateTenantMiddleware)

adminRouter.get('/departments', requireSectionAccess('Administración', 'Departamentos', 'view'), controller.listDepartments)
adminRouter.post('/departments', requireSectionAccess('Administración', 'Departamentos', 'create'), controller.createDepartment)

adminRouter.get('/locations', requireSectionAccess('Administración', 'Ubicaciones', 'view'), controller.listLocations)
adminRouter.post('/locations', requireSectionAccess('Administración', 'Ubicaciones', 'create'), controller.createLocation)

adminRouter.get('/audit-logs', requireSectionAccess('Administración', 'Historial de Auditoría', 'view'), controller.listAuditLogs)
