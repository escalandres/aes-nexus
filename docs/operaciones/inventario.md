# Operaciones · Inventario por Almacén (`InventoryItemLocation`)

Especificación funcional, modelo de datos y reglas de validación para la entidad **Existencias por Almacén** (`/api/v1/operations/inventory`).

---

## 1. Descripción Funcional

Controla el nivel físico de existencias, stock reservado por pedidos, unidades en tránsito por traslados entre almacenes, ubicación de rack/pasillo (`locationBin`), costo promedio/unitario y umbrales mínimos de reabastecimiento por cada combinación única `(warehouseId, sku)`.

Soporta:
1. **Asignación desde Catálogo o Alta Directa de SKU** (`POST /api/v1/operations/inventory`).
2. **Ajuste manual de existencias** (`POST /api/v1/operations/inventory/:id/adjust`) con registro automático en Kardex.
3. **Configuración de umbral mínimo individual** (`PATCH /api/v1/operations/inventory/:id/threshold`) respetando reglas maestras por categoría (`categoryThresholds`).
4. **Exportación CSV** de la vista filtrada.

---

## 2. Campos Obligatorios vs. Opcionales (`AddSkuToWarehouseDTO`)

El endpoint de alta/asignación admite dos modos (`mode: 'catalog' | 'new'`):

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `mode` | `enum` | **Sí** | `'catalog'` | `'catalog'` (vincula producto existente de `cat_products`) \| `'new'` (alta directa de SKU y sincronización a catálogo). |
| `warehouseId` | `string` (max 64) | **Sí** | — | ID del almacén activo de destino (`ops_warehouses.id`). |
| `productId` | `string` (max 64) | Condicional (`mode='catalog'`) | — | ID del producto tangible (`type = 'product'`) en `cat_products`. |
| `sku` | `string` (max 48) | Condicional (`mode='new'`) | Del catálogo | Código SKU en mayúsculas (`trim().toUpperCase()`). |
| `name` | `string` (max 180) | Condicional (`mode='new'`) | Del catálogo | Nombre del artículo. |
| `category` | `string` (max 80) | No | `'Hardware'` / del catálogo | Categoría de producto (según `PRODUCT_CATALOG_CATEGORIES`). |
| `unitOfMeasure` | `string` (max 32) | No | `'Pza'` / del catálogo | Unidad de medida (`Pza`, `Caja`, `Metro`, `Kit`, `Litro`, `Kg`, etc.). |
| `initialStock` | `integer` (`>= 0`) | No | `5` | Existencia física inicial a sumar en el almacén. Si `> 0`, genera movimiento `'Entrada'` en Kardex. |
| `minStock` | `integer` (`>= 0`) | No | `2` / del producto | Umbral mínimo individual para alertas de reabastecimiento. |
| `cost` | `number` (`>= 0`) | No | `0` / del producto | Costo unitario de referencia en moneda base. |
| `locationBin` | `string` (max 80) | No | `'Recepción <warehouse.code>'` | Pasillo, rack o ubicación física dentro del almacén (ej. `'Rack A-12'`). |

### DTO de Ajuste Manual (`AdjustInventoryDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción |
|---|---|---|---|---|
| `adjustmentType` | `enum` | **Sí** | — | `'Ajuste positivo'` (suma `quantity`) \| `'Ajuste negativo'` (resta `quantity`). |
| `quantity` | `number` (`> 0`) | **Sí** | — | Magnitud absoluta del ajuste. Si es negativo, no puede exceder `stock` actual. |
| `reason` | `string` (max 500) | No | `'Ajuste de inventario físico verificado'` | Motivo operativo o resultado de conteo cíclico. |
| `referenceDoc` | `string` (max 80) | No | `'AJUSTE-MANUAL'` | Folio o referencia documental del ajuste. |

### DTO de Umbral Mínimo (`UpdateThresholdDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción |
|---|---|---|---|---|
| `minStock` | `integer` (`>= 0`) | **Sí** | — | Nuevo umbral mínimo específico del SKU en el almacén. Fija `thresholdSource = 'sku'`. |

### Campos Generados / Persistidos en `InventoryItemLocationRecord`

- `id` (`inv_<ts>`), `productId`, `sku`, `name`, `category`, `warehouseId`, `warehouseName`, `stock`, `reserved`, `inTransit`, `minStock`, `thresholdSource` (`'sku' | 'category'`), `cost`, `unitOfMeasure`, `locationBin`.
- Campos derivados calculados al leer: `effectiveMinStock`, `effectiveThresholdSource` (`'sku' | 'category_inherit' | 'category_override'`), `isLowStock` (`stock <= effectiveMinStock`), `totalValuation` (`stock * cost`).

---

## 3. Endpoints REST

| Método | Ruta | Descripción | RBAC |
|---|---|---|---|
| `GET` | `/api/v1/operations/inventory` | Lista existencias filtrables por `warehouseId`, `search`, `lowStockOnly=true`, `category` | `Operaciones.Inventario` (`read`) |
| `GET` | `/api/v1/operations/inventory/export.csv` | Exporta CSV con BOM UTF-8 (`inventario_<almacen>_<YYYY-MM-DD>.csv`) | `Operaciones.Inventario` (`read`) |
| `POST` | `/api/v1/operations/inventory` | Asigna producto de catálogo o crea SKU nuevo en almacén (upsert por `warehouseId + sku`) | `Operaciones.Inventario` (`write`) |
| `POST` | `/api/v1/operations/inventory/:id/adjust` | Aplica ajuste positivo/negativo a `stock` y registra `StockMovement` (`type: 'Ajuste'`) | `Operaciones.Inventario` (`write`) + `inventoryControl` |
| `PATCH` | `/api/v1/operations/inventory/:id/threshold` | Actualiza `minStock` individual del SKU (`thresholdSource = 'sku'`) | `Operaciones.Inventario` (`write`) + `adjustThresholds` |
| `DELETE` | `/api/v1/operations/inventory/:id` | Elimina referencia en almacén (`409` si `stock > 0`, `reserved > 0` o `inTransit > 0`) | `Operaciones.Inventario` (`full`) |

---

## 4. Reglas de Negocio y Transacciones

1. **Resolución de Umbral Efectivo (`resolveEffectiveStockThreshold`):**
   - Si existe una regla activa en `settings_category_thresholds` para la categoría del SKU con `mode === 'override_sku'`, el umbral efectivo será `rule.minStock` (`source: 'category_override'`), prevaleciendo sobre el umbral individual del SKU.
   - Si `mode === 'inherit_if_unset'` (o equivalente) y `item.thresholdSource === 'category'`, hereda `rule.minStock` (`source: 'category_inherit'`).
   - En otro caso, utiliza `item.minStock` (`source: 'sku'`).
2. **Upsert en Alta de SKU por Almacén:** Si ya existe un registro para el mismo `(warehouseId, sku.toLowerCase())`, incrementa `stock += initialStock`, actualiza `minStock`, `cost` (si `> 0`) y `locationBin` en lugar de duplicar fila.
3. **Sincronización con Catálogo:** Si `mode === 'new'` y el SKU no existe en `cat_products`, el backend inserta el producto en `cat_products` y registra evento en `audit_logs` (`category: 'sales'`).
4. **Validación de Ajuste Negativo:** Rechaza con `409 Conflict` / `422 Unprocessable Entity` si `adjustmentType === 'Ajuste negativo'` y `quantity > currentItem.stock`. Nunca permite `stock < 0`.
5. **Trazabilidad Kardex:** Todo alta con `initialStock > 0` emite `MOV-YYYY-NNN` tipo `'Entrada'` (`referenceDoc`: `'ASIGNACIÓN-CATÁLOGO'` o `'ALTA-ALMACÉN'`); todo ajuste emite `MOV-YYYY-NNN` tipo `'Ajuste'` con `quantity` firmado (`+N` o `-N`).
