# Administración · Ubicaciones Físicas (`PhysicalLocations`)

Especificación funcional, modelo de datos y reglas de validación para la entidad **Ubicaciones Físicas y Sedes** (`/api/v1/admin/locations`).

---

## 1. Descripción Funcional

Gestiona las sedes corporativas, sucursales comerciales, almacenes/bodegas, talleres operativos y puntos de venta de la organización, vinculándolos N:M con las subsidiarias a las que dan soporte. Mantiene **sincronización bidireccional en tiempo real** con el catálogo de almacenes del módulo **Operaciones** (`ops_warehouses`) y sirve como ubicación de adscripción para **CRM → Empleados**.

---

## 2. Campos Obligatorios vs. Opcionales (`CreateLocationDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `code` | `string` (max 32) | **Sí** | — | Código corto de sede (ej. `CORP-CDMX`, `ALM-VALLEJO`). Normalizado a `UPPERCASE`; único por organización. |
| `name` | `string` (max 150) | **Sí** | — | Nombre descriptivo de la sede o almacén. |
| `address` | `string` (max 250) | **Sí** | — | Calle, número, parque industrial o referencias físicas. |
| `city` | `string` (max 120) | **Sí** | — | Ciudad, alcaldía o municipio. |
| `subsidiaryIds` | `string[]` | **Sí*** | `[holdingId]` | IDs de subsidiarias vinculadas. *Obligatorio (`minItems: 1`) si existen subsidiarias; en alta rápida desde Operaciones hereda la matriz activa.* |
| `type` | `enum` (`LocationType`) | No | `'Sucursal'` | `'Oficina corporativa'` \| `'Sucursal'` \| `'Almacén / Bodega'` \| `'Taller / Operación'` \| `'Punto de venta'`. |
| `state` | `string` (max 120) | No | `city` | Estado, provincia o entidad federativa. Si se omite en alta rápida, fallback automático a `city`. |
| `country` | `string` (max 80) | No | `'México'` | País de ubicación de la sede. |
| `manager` | `string` (max 150) | No | `null` | Nombre del responsable o encargado de la sede. |
| `active` | `boolean` | No | `true` | Estado operativo (`true` = Activa, `false` = Inactiva). |

### Campos Generados por el Servidor (`PhysicalLocationRecord`)

- `id` (`string` / UUID, prefijo frontend `loc_<ts>`).
- `linkedWarehouseId` (`string | null`, identificador del almacén espejo en `ops_warehouses`, por convención `wh_<locationId>`).
- `createdAt` (`date-time` ISO-8601), `updatedAt` (`date-time` ISO-8601).

---

## 3. Endpoints REST

| Método | Ruta | Descripción | RBAC |
|---|---|---|---|
| `GET` | `/api/v1/admin/locations` | Lista filtrable por `search`, `type`, `subsidiaryId` y `status` | `Administración.Ubicaciones` (`read`) |
| `GET` | `/api/v1/admin/locations/:id` | Detalle de sede con subsidiarias y almacén operativo vinculado | `Administración.Ubicaciones` (`read`) |
| `POST` | `/api/v1/admin/locations` | Alta de sede física + aprovisionamiento automático de almacén en Operaciones | `Administración.Ubicaciones` (`write`) |
| `PATCH` | `/api/v1/admin/locations/:id` | Edición de datos físicos, encargado, subsidiarias y propagación a almacén | `Administración.Ubicaciones` (`write`) |
| `PATCH` | `/api/v1/admin/locations/:id/status` | Cambio de estado (`active: boolean`) propagado al almacén vinculado | `Administración.Ubicaciones` (`write`) |
| `POST` | `/api/v1/admin/locations/bulk-subsidiary-link` | Vinculación o desvinculación masiva con una subsidiaria | `Administración.Ubicaciones` (`write`) |
| `DELETE` | `/api/v1/admin/locations/:id` | Eliminación de sede y del almacén espejo si no tiene existencias/movimientos | `Administración.Ubicaciones` (`full`) |

---

## 4. Reglas de Negocio e Integración con Operaciones

1. **Unicidad de Código:** El campo `code` (case-insensitive) debe ser único por `organization_id` (`409 Conflict` en caso de duplicado).
2. **Sincronización con Almacenes (`ops_warehouses`):**
   - **Al crear (`POST`):** Si no existe un almacén con el mismo `locationId`, `code` o `name`, se crea automáticamente un registro en `ops_warehouses` con `locationId = location.id`, `locationType = location.type`, `capacityPercentage = 0`, `isDefault = false` y `active = location.active`.
   - **Al actualizar (`PATCH`):** Cualquier cambio en `active`, `name`, `city`, `state`, `address` o `type` se replica inmediatamente al almacén vinculado en la misma transacción.
   - **Al eliminar (`DELETE`):** El servidor debe verificar en `ops_inventory` / `ops_stock_movements` que el almacén espejo no posea inventario positivo ni kardex histórico activo antes de permitir borrado físico (`409 Conflict` si tiene stock o movimientos; sugerir inactivación).
3. **Auditoría:** Emite eventos `CREATE` / `UPDATE` / `DELETE` bajo `entityType: 'Ubicación física'`, soportando eventos consolidados para vinculación/desvinculación masiva desde `SubsidiaryDetailView`.
