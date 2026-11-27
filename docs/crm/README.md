# Documentación Backend · Módulo CRM (`/docs/crm`)

Especificación técnica y esquemas de datos para la implementación del módulo **CRM** de **AES Nexus** en el backend (`/api/v1/crm/*`).

## 1. Entidades Documentadas

| Entidad | Endpoint REST | Especificación Markdown | Esquema JSON | Tabla(s) PostgreSQL |
|---|---|---|---|---|
| **Clientes** | `/api/v1/crm/customers` | [`clientes.md`](./clientes.md) | [`clientes.schema.json`](./clientes.schema.json) | `crm_customers`, `crm_customer_addresses` |
| **Proveedores** | `/api/v1/crm/vendors` | [`proveedores.md`](./proveedores.md) | [`proveedores.schema.json`](./proveedores.schema.json) | `crm_vendors`, `crm_vendor_addresses`, `crm_vendor_bank_accounts` |
| **Oportunidades** | `/api/v1/crm/opportunities` | [`oportunidades.md`](./oportunidades.md) | [`oportunidades.schema.json`](./oportunidades.schema.json) | `crm_opportunities` |
| **Actividades** | `/api/v1/crm/activities` | [`actividades.md`](./actividades.md) | [`actividades.schema.json`](./actividades.schema.json) | `crm_activities` |
| **Empleados** | `/api/v1/crm/employees` | [`empleados.md`](./empleados.md) | [`empleados.schema.json`](./empleados.schema.json) | `crm_employees`, `crm_employee_roles` |
| **Nóminas** | `/api/v1/crm/payroll-runs` | [`nominas.md`](./nominas.md) | [`nominas.schema.json`](./nominas.schema.json) | `crm_payroll_runs`, `crm_payroll_receipts` |

---

## 2. Convenciones Transversales del Módulo

- **Multi-Tenancy (H1):** Toda petición requiere `X-Organization-Id` validado contra el token de sesión (`Authorization: Bearer <jwt>`). Todas las tablas incluyen `organization_id UUID NOT NULL` con índices compuestos para aislamiento por empresa.
- **Encabezados estándar:**
  - `Content-Type: application/json`
  - `Accept: application/json`
  - `X-Organization-Id: <organization_id>`
  - `X-Client-App: aes-nexus-frontend`
- **Localización Multi-País (`MX`, `ES`, `VE`, `GLOBAL`):** Las entidades fiscales y territoriales (`clientes`, `proveedores`, `empleados`) homologan identificadores tributarios (`rfc` → RFC / NIF / CIF / RIF / Tax ID), divisiones territoriales (`colony` → Colonia / Barrio / Parroquia / Distrito) y ruteo bancario (`clabe` → CLABE Mod-10 / IBAN SEPA / Cuenta 20 dígitos SUDEBAN / Routing).
- **Auditoría:** Todas las altas, ediciones, cambios de estado, cambios de acceso/roles y eliminaciones deben emitir un registro en `audit_logs`.

---

## 3. Matriz de Permisos RBAC (`src/data/accessControl.ts`)

| Sección CRM | Capabilities Requeridas | Niveles HTTP (`read` / `write` / `full`) |
|---|---|---|
| `CRM.Clientes` | `crmClients` | `read`: `GET` · `write`: `GET, POST, PUT, PATCH` · `full`: `+ DELETE` |
| `CRM.Proveedores` | `crmClients` | `read`: `GET` · `write`: `GET, POST, PUT, PATCH` · `full`: `+ DELETE` |
| `CRM.Oportunidades` | `pipelineReports`, `crmClients` | `read`: `GET` · `write`: `GET, POST, PUT, PATCH` · `full`: `+ DELETE` |
| `CRM.Actividades` | `crmClients`, `pipelineReports` | `read`: `GET` · `write`: `GET, POST, PUT, PATCH` · `full`: `+ DELETE` |
| `CRM.Empleados` | `manageUsers`, `sysConfig` | `read`: `GET` · `write`: `GET, POST, PUT, PATCH` · `full`: `+ DELETE` |
| `CRM.Nómina` | `schedulePayments`, `manageUsers` | `read`: `GET` · `write`: `GET, POST, PUT, PATCH` · `full`: `+ DELETE` |

---

## 4. Relaciones entre Entidades del CRM y Otros Módulos

```
organizations (H1 Tenant)
 ├── crm_customers ──< crm_customer_addresses
 │     ├──< crm_opportunities (client_id)
 │     ├──< crm_activities (client_id)
 │     └──< sales_quotes / sales_orders / ar_invoices (Ventas y Finanzas CxC)
 ├── crm_vendors ──< crm_vendor_addresses
 │     ├──< crm_vendor_bank_accounts (Dispersión EBP)
 │     └──< purchase_orders / ap_bills (Compras y Finanzas CxP)
 ├── crm_employees ──< crm_employee_roles (vinculación opcional con usuarios/RBAC)
 │     ├──> departments (department_id)
 │     ├──> physical_locations (location_id)
 │     ├──< crm_opportunities / crm_activities (owner_employee_id)
 │     └──< crm_payroll_receipts (employee_id)
 └── crm_payroll_runs ──< crm_payroll_receipts (Finanzas y Dispersión EBP)
```
