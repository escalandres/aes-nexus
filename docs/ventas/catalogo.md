# Ventas · Catálogo de Productos y Servicios (`CatalogItems`)

Especificación funcional, modelo de datos y reglas de validación para la entidad **Catálogo** (`/api/v1/sales/catalog`).

---

## 1. Descripción Funcional

Administra el catálogo maestro de productos inventariables (`type = 'product'`) y servicios facturables (`type = 'service'`) disponibles para cotizaciones, pedidos, facturación y devoluciones. Para artículos de tipo `product`, mantiene **sincronización bidireccional** con el inventario físico por almacén en **Operaciones** (`ops_inventory` y `ops_stock_movements`).

---

## 2. Campos Obligatorios vs. Opcionales (`CreateCatalogItemDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `sku` | `string` (max 48) | **Sí** | — | Código único del artículo/servicio (ej. `HW-TERM-POS`). Normalizado a `UPPERCASE`; único por `organization_id`. |
| `name` | `string` (max 180) | **Sí** | — | Nombre comercial del producto o servicio. |
| `type` | `enum` (`ItemType`) | **Sí** | `'product'` | `'product'` \| `'service'`. |
| `category` | `enum` (`ItemCategory`) | **Sí** | `'Hardware'` | `'Hardware'`, `'Software y Licencias'`, `'Consultoría'`, `'Diseño y Desarrollo'`, `'Mantenimiento'`, `'Capacitación'`. |
| `unitPrice` | `number` (`>= 0`) | **Sí** | `0` | Precio unitario de venta sin impuestos. |
| `currency` | `enum` | **Sí** | `'MXN'` | `'MXN'` \| `'USD'`. |
| `taxRate` | `enum` (`TaxRate`) | **Sí** | `'16%'` | `'16%'` \| `'8%'` \| `'0%'` \| `'Exento'`. |
| `unitOfMeasure` | `enum` (`UnitOfMeasure`) | **Sí** | `'Pza'` | `'Pza'` \| `'Hrs'` \| `'Servicio'` \| `'Mes'` \| `'Licencia'` \| `'Paquete'`. |
| `description` | `string` (max 1000) | No | `""` | Descripción comercial y técnica mostrada en cotizaciones y fichas. |
| `status` | `enum` | No | `'Activo'` | `'Activo'` \| `'Inactivo'`. |
| `stock` | `number` (`>= 0`) | Solo `product` | `0` | Existencia física agregada (sincronizada con almacenes). Ignorado si `type = 'service'`. |
| `minStock` | `number` (`>= 0`) | Solo `product` | `2` | Umbral mínimo para alertas de reorden en Operaciones. |
| `cost` | `number` (`>= 0`) | Solo `product` | `0` | Costo unitario de adquisición / valuación de inventario. |
| `billingModel` | `enum` | Solo `service` | `'Precio fijo'` | `'Por hora'` \| `'Precio fijo'` \| `'Recurrente'`. Ignorado si `type = 'product'`. |
| `leadTimeDays` | `integer` (`>= 1`) | Solo `service` | `1` | Días estimados de entrega/implementación del servicio. |
| `warehouseId` | `string` | No (sync) | Almacén default | Opcional al crear/editar un `product` para asignar existencias iniciales/ajuste en `ops_inventory`. |
| `locationBin` | `string` (max 64) | No (sync) | `'Recepción 01'` | Ubicación o pasillo dentro del almacén destino en `ops_inventory`. |

### Campos Generados por el Servidor (`CatalogItemRecord`)

- `id` (`string` / UUID, prefijo frontend `prod_<ts>`).
- `lastUpdated` (`string` legible o ISO, p. ej. `'04 nov 2026'` / `'Hoy'`), `createdAt` (`date-time`), `updatedAt` (`date-time`).
- Derivados opcionales en vista detalle: `warehouseBreakdown[]` (`warehouseId`, `warehouseName`, `stock`, `locationBin`).

---

## 3. Endpoints REST

| Método | Ruta | Descripción | RBAC |
|---|---|---|---|
| `GET` | `/api/v1/sales/catalog` | Lista filtrable por `search` (SKU, nombre, categoría), `type`, `category`, `status`, `sortBy` (`name` \| `sku` \| `price`) | `Ventas.Catálogo` (`read`) |
| `GET` | `/api/v1/sales/catalog/:id` | Detalle de producto/servicio con desglose de stock por almacén | `Ventas.Catálogo` (`read`) |
| `POST` | `/api/v1/sales/catalog` | Alta en catálogo y sincronización inicial con `ops_inventory` si es producto | `Ventas.Catálogo` (`write`) |
| `PATCH` | `/api/v1/sales/catalog/:id` | Actualización de ficha comercial y propagación de costos/umbrales/stock a Operaciones | `Ventas.Catálogo` (`write`) |
| `POST` | `/api/v1/sales/catalog/:id/duplicate` | Clona artículo generando SKU `<SKU>-COPIA[-N]` (con `stock = 0` si es producto) | `Ventas.Catálogo` (`write`) |
| `PATCH` | `/api/v1/sales/catalog/:id/status` | Alterna estado `'Activo'` / `'Inactivo'` | `Ventas.Catálogo` (`write`) |
| `DELETE` | `/api/v1/sales/catalog/:id` | Elimina artículo del catálogo y desvincula filas en `ops_inventory` | `Ventas.Catálogo` (`full`) |

---

## 4. Reglas de Negocio e Integración

1. **Unicidad de SKU:** El `sku` normalizado a mayúsculas debe ser único por `organization_id` (`409 Conflict` si ya existe).
2. **Separación Producto vs. Servicio:**
   - Si `type === 'product'`, limpiar `billingModel` y `leadTimeDays` (`null`).
   - Si `type === 'service'`, limpiar `stock`, `minStock` y `cost` (`null`).
3. **Sincronización con Operaciones (`ops_inventory` & Kardex):**
   - Al crear o editar un `product` con stock inicial o delta respecto a las existencias actuales en el almacén seleccionado (`warehouseId`), el backend crea/actualiza la fila en `ops_inventory` y registra el movimiento correspondiente en `ops_stock_movements`.
4. **Auditoría:** Alta (`CREATE`), actualización (`UPDATE`) y eliminación (`DELETE`) registran evento en `audit_logs` con `category: 'sales'` y `entityType: 'Producto' | 'Servicio'`.
