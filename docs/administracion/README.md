# Documentación Backend · Módulo Administración (`/docs/administracion`)

Especificación técnica y esquemas de datos para la implementación del módulo **Administración** (`Núcleo del Sistema`) de **AES Nexus** en el backend (`/api/v1/admin/*`).

## 1. Entidades y Recursos Documentados

| Entidad / Recurso | Endpoint REST | Especificación Markdown | Esquema JSON | Tabla(s) PostgreSQL |
|---|---|---|---|---|
| **Subsidiarias** | `/api/v1/admin/subsidiaries` | [`subsidiarias.md`](./subsidiarias.md) | [`subsidiarias.schema.json`](./subsidiarias.schema.json) | `admin_subsidiaries` |
| **Departamentos** | `/api/v1/admin/departments` | [`departamentos.md`](./departamentos.md) | [`departamentos.schema.json`](./departamentos.schema.json) | `admin_departments`, `admin_department_subsidiaries` |
| **Ubicaciones Físicas** | `/api/v1/admin/locations` | [`ubicaciones.md`](./ubicaciones.md) | [`ubicaciones.schema.json`](./ubicaciones.schema.json) | `admin_locations`, `admin_location_subsidiaries` |
| **Flujos de Devoluciones** | `/api/v1/admin/return-workflows` | [`flujos-devoluciones.md`](./flujos-devoluciones.md) | [`flujos-devoluciones.schema.json`](./flujos-devoluciones.schema.json) | `admin_return_workflows`, `admin_return_workflow_steps` |
| **Historial de Auditoría** | `/api/v1/admin/audit-logs` | [`auditoria.md`](./auditoria.md) | [`auditoria.schema.json`](./auditoria.schema.json) | `audit_logs` |
| **Resumen Organizacional** | `/api/v1/admin/summary` | Ver sección 5 abajo | N/A (agregado de solo lectura) | Vista agregada multi-tabla |

---

## 2. Convenciones Transversales del Módulo

- **Multi-Tenancy (H1):** Toda petición requiere `X-Organization-Id` validado contra el token de sesión (`Authorization: Bearer <jwt>`). Todas las tablas incluyen `organization_id UUID NOT NULL` con índices compuestos y restricciones `UNIQUE (organization_id, code)` donde aplique.
- **Encabezados estándar:**
  - `Content-Type: application/json`
  - `Accept: application/json`
  - `X-Organization-Id: <organization_id>`
  - `X-Client-App: aes-nexus-frontend`
- **Relaciones N:M con Subsidiarias:** Tanto `Departamentos` como `Ubicaciones Físicas` operan mediante tablas pivote (`admin_department_subsidiaries` y `admin_location_subsidiaries`), permitiendo que un departamento o sede dé servicio a una o múltiples razones sociales del grupo.
- **Regla de Matriz / Holding Único:** Solo puede existir **una** subsidiaria con `isHolding = true` por `organization_id` (enforced con índice parcial único en PostgreSQL: `CREATE UNIQUE INDEX ... ON admin_subsidiaries (organization_id) WHERE is_holding = true`).
- **Localización Fiscal Multi-País (`MX`, `ES`, `VE`, `GLOBAL`):** El campo `taxId` de las subsidiarias almacena identificadores normalizados a mayúsculas (`RFC`, `NIF/CIF`, `RIF`, `Tax ID`), con divisas operativas soportadas (`MXN`, `USD`, `EUR`, `VES`, `COP`, `CLP`, `PEN`).
- **Trazabilidad Obligatoria:** Toda operación de alta, actualización, cambio de estado, vinculación/desvinculación masiva, modificación de flujos de aprobación o eliminación debe insertar un evento inmutable en `audit_logs` (`category = 'admin'`).

---

## 3. Matriz de Permisos RBAC (`src/data/accessControl.ts`)

| Sección Administración | Capabilities Requeridas | Niveles HTTP (`read` / `write` / `full`) |
|---|---|---|
| `Administración.Subsidiarias` | `sysConfig`, `manageUsers` | `read`: `GET` · `write`: `GET, POST, PUT, PATCH` · `full`: `+ DELETE` |
| `Administración.Departamentos` | `sysConfig`, `manageUsers` | `read`: `GET` · `write`: `GET, POST, PUT, PATCH` · `full`: `+ DELETE` |
| `Administración.Ubicaciones` | `sysConfig`, `manageUsers` | `read`: `GET` · `write`: `GET, POST, PUT, PATCH` · `full`: `+ DELETE` |
| `Administración.Flujos de devoluciones` | `sysConfig`, `manageUsers` | `read`: `GET` · `write`: `GET, PUT, PATCH, POST (preset)` · `full`: `+ reset` |
| `Administración.Resumen` | `sysConfig`, `manageUsers` | `read` / `write` / `full`: `GET /api/v1/admin/summary` |
| `Administración.Historial de Auditoría` | `sysConfig`, `manageUsers`, `fullReports` | `read` / `write` / `full`: `GET` y `GET /export` (sin `PUT`/`PATCH`/`DELETE`) |

---

## 4. Diagrama de Relaciones con Otros Módulos

```
organizations (H1 Tenant)
 ├── admin_subsidiaries (Razones sociales / Holding único)
 │     ├──< admin_department_subsidiaries >── admin_departments
 │     │                                            └──< crm_employees (department_id)
 │     ├──< admin_location_subsidiaries >──── admin_locations
 │     │                                            ├──< crm_employees (location_id)
 │     │                                            └──1:1 ops_warehouses (location_id / sincronización bidireccional)
 │     └──< (Contexto KPI: ops_warehouses, purchase_orders, purchase_requisitions, ap_bills)
 ├── admin_return_workflows (customer | supplier)
 │     ├──< admin_return_workflow_steps
 │     └──> Gobierna transiciones y aprobaciones en:
 │            ├── sales_customer_returns (Ventas -> Devoluciones)
 │            └── purchase_supplier_returns (Compras -> Devoluciones)
 └── audit_logs (Bitácora inmutable transversal a todos los módulos)
```

---

## 5. Endpoint de Resumen Organizacional (`GET /api/v1/admin/summary`)

Agrega indicadores de la pestaña **Resumen organizacional**:

- `subsidiaries`: `{ total, active, holdingCode, holdingName, currencies[] }`
- `departments`: `{ total, active, withoutSubsidiaryCount, costCentersCount }`
- `locations`: `{ total, active, byType: Record<LocationType, number>, linkedWarehousesCount }`
- `workflows`: `{ customerApprovalStepsCount, supplierApprovalStepsCount, customerUpdatedAtIso, supplierUpdatedAtIso }`
- `audit`: `{ totalEvents, last24hEvents, byCategory: Record<AuditCategory, number> }`
