# Operaciones · Almacenes (`Warehouses`)

Especificación funcional, modelo de datos y reglas de sincronización para la entidad **Almacenes** (`/api/v1/operations/warehouses`).

---

## 1. Descripción Funcional

Representa los centros de distribución, bodegas y sucursales con capacidad logística habilitadas para almacenar inventario (`ops_inventory`), recibir órdenes de compra (`purchase_orders`) y originar/recibir traslados (`ops_transfers`). Mantiene sincronización 1:1 con **Administración → Ubicaciones** (`admin_locations`).

---

## 2. Campos Obligatorios vs. Opcionales (`CreateWarehouseDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `code` | `string` (max 32) | **Sí** | — | Código corto único por organización (ej. `'ALM-CDMX'`). Se normaliza en mayúsculas. |
| `name` | `string` (max 150) | **Sí** | — | Nombre operativo del almacén (ej. `'Almacén Central Vallejo'`). |
| `city` | `string` (max 100) | **Sí** | — | Ciudad o municipio donde se ubica la bodega. |
| `state` | `string` (max 100) | **Sí** | — | Estado o entidad federativa. |
| `address` | `string` (max 255) | **Sí** | — | Dirección física completa (calle, número, colonia, bodega/parque). |
| `capacityPercentage` | `number` (`0–100`) | No | `0` | Porcentaje estimado de ocupación física (`0` a `100`). |
| `isDefault` | `boolean` | No | `false` | Indica si es el almacén predeterminado para recepciones y altas de catálogo. |
| `active` | `boolean` | No | `true` | Habilitado para nuevas operaciones, traslados y compras. |
| `locationId` | `string \| null` (max 64) | No | `null` | Llave foránea a `admin_locations.id` cuando proviene de Administración. |
| `locationType` | `string \| null` (max 80) | No | `'Almacén / Bodega'` | Clasificación logística heredada (`'Almacén / Bodega'`, `'Sucursal'`, `'Oficina / Corporativo'`, etc.). |

### Campos Generados por el Servidor (`WarehouseRecord`)

- `id` (`wh_<ts>` o `wh_<locationId>`), `createdAt`, `updatedAt`.
- Campos calculados opcionales en listado (`GET /api/v1/operations/warehouses`): `skuCount`, `totalUnits`, `totalValuation`.

---

## 3. Endpoints REST

| Método | Ruta | Descripción | RBAC |
|---|---|---|---|
| `GET` | `/api/v1/operations/warehouses` | Lista almacenes filtrables por `active`, `isDefault`, `search` | `Operaciones.Inventario` (`read`) |
| `GET` | `/api/v1/operations/warehouses/:id` | Detalle del almacén y métricas de ocupación/valoración | `Operaciones.Inventario` (`read`) |
| `POST` | `/api/v1/operations/warehouses` | Alta manual de almacén (crea registro espejo en `admin_locations` si `locationId` es nulo) | `Operaciones.Inventario` (`write`) |
| `PATCH` | `/api/v1/operations/warehouses/:id` | Actualiza datos operativos, `capacityPercentage`, `isDefault` o `active` | `Operaciones.Inventario` (`write`) |
| `DELETE` | `/api/v1/operations/warehouses/:id` | Elimina almacén (`409 Conflict` si tiene `stock > 0`, `inTransit > 0` o traslados activos) | `Operaciones.Inventario` (`full`) |

---

## 4. Reglas de Negocio y Sincronización

1. **Unicidad de `isDefault`:** Solo puede existir un almacén con `isDefault = true` por `organization_id`. Al marcar uno nuevo como predeterminado, el backend desmarca el anterior en la misma transacción.
2. **Sincronización con `admin_locations`:** Al crear o actualizar una ubicación en Administración (excepto la sede matriz puramente administrativa si está marcada como no operativa, p.ej. `loc_1` si aplica), el backend sincroniza `code`, `name`, `city`, `state`, `address`, `active` y `locationType` en `ops_warehouses`.
3. **Protección de Almacén Inactivo o con Existencias:**
   - Un almacén con `active = false` no puede seleccionarse como destino en nuevas OC, altas de inventario ni traslados.
   - No se permite eliminar un almacén que posea existencias físicas (`stock > 0`), inventario en tránsito (`inTransit > 0`) u órdenes/traslados abiertos.
4. **Auditoría:** Las altas, cambios de `isDefault` o desactivaciones registran evento en `audit_logs` (`category: 'inventory'`).
