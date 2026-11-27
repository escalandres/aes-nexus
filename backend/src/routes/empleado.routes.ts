import { Router } from 'express'
import { EmpleadoController } from '../controllers/empleado.controller.ts'
import { authenticateTenantMiddleware, requireSectionAccess } from '../middlewares/tenantAuth.ts'

export const empleadoRouter = Router()
const controller = new EmpleadoController()

empleadoRouter.use(authenticateTenantMiddleware)

empleadoRouter.get('/', requireSectionAccess('CRM', 'Empleados', 'view'), controller.list)
empleadoRouter.get(
  '/external/:externalSource/:externalId',
  requireSectionAccess('CRM', 'Empleados', 'view'),
  controller.getByExternal
)
empleadoRouter.get('/:id', requireSectionAccess('CRM', 'Empleados', 'view'), controller.getById)
empleadoRouter.post('/', requireSectionAccess('CRM', 'Empleados', 'create'), controller.create)
empleadoRouter.put('/:id', requireSectionAccess('CRM', 'Empleados', 'edit'), controller.update)
empleadoRouter.patch('/:id', requireSectionAccess('CRM', 'Empleados', 'edit'), controller.update)
empleadoRouter.delete('/:id', requireSectionAccess('CRM', 'Empleados', 'full'), controller.delete)
