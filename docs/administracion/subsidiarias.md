# Administración · Subsidiarias (`Subsidiaries`)

Especificación funcional, modelo de datos y reglas de validación para la entidad **Subsidiarias y Entidades Legales** (`/api/v1/admin/subsidiaries`).

---

## 1. Descripción Funcional

Administra las razones sociales y entidades jurídicas pertenecientes al grupo empresarial (Tenant H1), definiendo su identificador fiscal (`RFC`, `NIF/CIF`, `RIF` o `Tax ID`), divisa funcional, país de operación, representante legal, domicilio fiscal y bandera de **Empresa Matriz / Holding**. Centraliza además la vista detallada (`SubsidiaryDetailView`) con KPIs operativos/financieros derivados y la vinculación N:M con Departamentos y Ubicaciones Físicas.

---

## 2. Campos Obligatorios vs. Opcionales (`CreateSubsidiaryDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `code` | `string` (max 32) | **Sí** | — | Código corto identificador (ej. `SUB-MX`). Normalizado a `UPPERCASE`; único por `organization_id`. |
| `name` | `string` (max 150) | **Sí** | — | Nombre comercial o alias operativo dentro del grupo. |
| `legalName` | `string` (max 220) | **Sí** | — | Razón social completa ante autoridad tributaria. |
| `taxId` | `string` (max 30) | **Sí** | — | Identificador fiscal (`RFC`, `NIF/CIF`, `RIF`, `Tax ID`). Normalizado a `UPPERCASE`. |
| `country` | `string` (max 80) | No | `'México'` | País de constitución/operación de la entidad legal. |
| `currency` | `enum` (ISO-4217) | No | `'MXN'` | Divisa base de la subsidiaria: `'MXN'`, `'USD'`, `'EUR'`, `'VES'`, `'COP'`, `'CLP'`, `'PEN'`. |
| `legalRep` | `string` (max 150) | No | `null` | Nombre del representante o apoderado legal. |
| `fiscalAddress` | `string` (max 300) | No | `null` | Domicilio fiscal completo para facturación y contratos. |
| `isHolding` | `boolean` | No | `false` | Indica si es la empresa matriz principal del grupo. Máximo 1 activa por organización. |
| `active` | `boolean` | No | `true` | Estado operativo de la subsidiaria (`true` = Activa, `false` = Inactiva). |
| `linkedDepartmentIds` | `string[]` | No | `[]` | Lista de IDs de departamentos a vincular atómicamente en `admin_department_subsidiaries`. |
| `linkedLocationIds` | `string[]` | No | `[]` | Lista de IDs de ubicaciones físicas a vincular atómicamente en `admin_location_subsidiaries`. |

### Campos Generados / Enriquecidos por el Servidor (`SubsidiaryRecord`)

- `id` (`string` / UUID, prefijo frontend `sub_<ts>`).
- `createdAt` (`date-time` ISO-8601), `updatedAt` (`date-time` ISO-8601).
- Opcional en vista detalle (`GET /api/v1/admin/subsidiaries/:id`):
  - `linkedDepartmentIds` (`string[]`) y `linkedLocationIds` (`string[]`).
  - `kpis`: conteo de departamentos vinculados, ubicaciones vinculadas, colaboradores asociados (por sede/depto), almacenes sincronizados, órdenes de compra, requisiciones y CxP atribuibles.

---

## 3. Endpoints REST

| Método | Ruta | Descripción | RBAC |
|---|---|---|---|
| `GET` | `/api/v1/admin/subsidiaries` | Lista filtrable por `search` (código, nombre, razón social, `taxId`, país) y `status` (`Todas` / `Activas` / `Inactivas`) | `Administración.Subsidiarias` (`read`) |
| `GET` | `/api/v1/admin/subsidiaries/:id` | Ficha detallada con vínculos N:M y KPIs operativos/MoM | `Administración.Subsidiarias` (`read`) |
| `POST` | `/api/v1/admin/subsidiaries` | Alta de subsidiaria y sincronización inicial de departamentos/ubicaciones | `Administración.Subsidiarias` (`write`) |
| `PATCH` | `/api/v1/admin/subsidiaries/:id` | Actualización parcial de datos fiscales, matriz (`isHolding`) y vínculos | `Administración.Subsidiarias` (`write`) |
| `PATCH` | `/api/v1/admin/subsidiaries/:id/status` | Cambio rápido de estado (`active: boolean`) | `Administración.Subsidiarias` (`write`) |
| `DELETE` | `/api/v1/admin/subsidiaries/:id` | Eliminación de subsidiaria y desvinculación automática en tablas pivote | `Administración.Subsidiarias` (`full`) |

---

## 4. Reglas de Negocio y Transaccionalidad

1. **Unicidad de Código:** Rechazar con `409 Conflict` si existe otra subsidiaria en la misma organización con el mismo `code` (comparación insensible a mayúsculas/minúsculas).
2. **Exclusividad de Matriz (`isHolding`):** Si en `POST` o `PATCH` se envía `isHolding: true`, el backend debe ejecutar dentro de la misma transacción SQL un `UPDATE` que establezca `is_holding = false` en las demás subsidiarias de la organización antes de activar la nueva matriz.
3. **Sincronización N:M:** Cuando se envían `linkedDepartmentIds` o `linkedLocationIds` al guardar desde la ficha de subsidiaria, el servidor reconcilia exactamente las relaciones en `admin_department_subsidiaries` y `admin_location_subsidiaries`.
4. **Eliminación Segura:** Al eliminar (`DELETE`), se remueven los vínculos en `admin_department_subsidiaries` y `admin_location_subsidiaries` (registrando en el detalle de auditoría cuántos departamentos y sedes quedaron desvinculados). Opcionalmente, si se desea protección estricta fiscal en producción, validar que no existan CFDI/facturas emitidas bajo esa razón social antes del borrado físico.
5. **Auditoría:**
   - `POST` -> `crudOperation: 'CREATE'`, `entityType: 'Subsidiaria'`.
   - `PATCH` de solo estado -> acción `'Cambio de estado de subsidiaria'`; edición de campos -> `'Actualización de subsidiaria'` con diff de campos modificados.
   - `DELETE` -> `crudOperation: 'DELETE'`, detallando departamentos y sedes desvinculadas.
