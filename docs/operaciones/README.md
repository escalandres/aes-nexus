# Documentación Backend · Módulo Operaciones (`/docs/operaciones`)

Especificación técnica y esquemas de datos para la implementación del módulo **Operaciones y Logística** de **AES Nexus** en el backend (`/api/v1/operations/*`).

## 1. Entidades y Recursos Documentados

| Entidad / Recurso | Endpoint REST | Especificación Markdown | Esquema JSON | Tabla(s) PostgreSQL |
|---|---|---|---|---|
| **Almacenes** | `/api/v1/operations/warehouses` | [`almacenes.md`](./almacenes.md) | [`almacenes.schema.json`](./almacenes.schema.json) | `ops_warehouses` (sincronizada 1:1 con `admin_locations`) |
| **Inventario por Almacén** | `/api/v1/operations/inventory` | [`inventario.md`](./inventario.md) | [`inventario.schema.json`](./inventario.schema.json) | `ops_inventory`, `cat_products` |
| **Movimientos / Kardex** | `/api/v1/operations/movements` | [`movimientos.md`](./movimientos.md) | [`movimientos.schema.json`](./movimientos.schema.json) | `ops_stock_movements` |
| **Traslados entre Almacenes** | `/api/v1/operations/transfers` | [`traslados.md`](./traslados.md) | [`traslados.schema.json`](./traslados.schema.json) | `ops_transfers`, `ops_transfer_items` |
| **Entregas / Despachos** | `/api/v1/operations/shipments` | [`entregas.md`](./entregas.md) | [`entregas.schema.json`](./entregas.schema.json) | `ops_shipments` |
| **Compras (Pestaña embebida)** | `/api/v1/purchases/orders` | [`../compras/ordenes-compra.md`](../compras/ordenes-compra.md) | [`../compras/ordenes-compra.schema.json`](../compras/ordenes-compra.schema.json) | `purchase_orders`, `purchase_order_items` |
| **Resumen y Rotación Consolidada** | `/api/v1/operations/summary` | Ver sección 5 abajo | N/A (agregado de solo lectura) | Vista agregada (`ops_inventory`, `ops_stock_movements`, `sales_orders`, `ops_shipments`, `purchase_orders`) |

---

## 2. Convenciones Transversales del Módulo

- **Multi-Tenancy (H1):** Toda petición requiere `X-Organization-Id` validado contra el JWT de sesión. Todas las tablas incluyen `organization_id UUID NOT NULL` con `UNIQUE (organization_id, folio)` o `UNIQUE (organization_id, warehouse_id, sku)` según aplique.
- **Encabezados estándar:**
  - `Content-Type: application/json`
  - `Accept: application/json`
  - `X-Organization-Id: <organization_id>`
  - `X-Client-App: aes-nexus-frontend`
- **Folios Secuenciales Atómicos:**
  - Movimientos / Kardex: `MOV-YYYY-NNN`
  - Traslados entre almacenes: `TRF-YYYY-NNN`
  - Entregas / Despachos: `DESP-YYYY-NNN`
  - Guías automáticas de embarque: `TRK-<carrier_prefix>-<random_6>` (cuando el operador no captura tracking propio).
- **Sincronización Bidireccional Catálogo ↔ Inventario:**
  - Las altas o ediciones de productos tangibles (`type: 'product'`) en Ventas → Catálogo (`cat_products`) crean/actualizan filas en `ops_inventory` y emiten movimientos iniciales en `ops_stock_movements`.
  - Inversamente, el alta directa de un SKU nuevo desde **Inventario** crea/sincroniza automáticamente el artículo en `cat_products`.
- **Sincronización 1:1 Administración → Almacenes:**
  - Los registros de `admin_locations` (excepto sedes estrictamente administrativas si se filtran, o sincronizados vía `locationId`) se reflejan en `ops_warehouses`. Ver [`almacenes.md`](./almacenes.md) y [`../administracion/ubicaciones.md`](../administracion/ubicaciones.md).
- **Auditoría:** Toda mutación relevante (ajustes manuales, cambios de umbral, traslados, recepciones, despachos, devoluciones y bajas) escribe un registro en `audit_logs` con `category: 'inventory'` (o `category: 'sales'` cuando ocurre alta automática en catálogo).

---

## 3. Matriz de Permisos RBAC (`src/data/accessControl.ts`)

| Sección Operaciones | Capabilities Requeridas | Niveles HTTP (`read` / `write` / `full`) |
|---|---|---|
| `Operaciones.Resumen` | `inventoryControl`, `adjustThresholds`, `receiveGoods`, `stockLedger`, `approvePurchases` | `read` / `write` / `full`: `GET /api/v1/operations/summary` |
| `Operaciones.Inventario` | `inventoryControl`, `adjustThresholds`, `stockLedger` | `read`: `GET` · `write`: `GET, POST, ajustes, umbrales` · `full`: `+ DELETE` |
| `Operaciones.Traslados` | `inventoryControl`, `stockLedger` | `read`: `GET` · `write`: `GET, POST, receive, cancel` · `full`: `+ DELETE` |
| `Operaciones.Compras` | `approvePurchases`, `receiveGoods` | Ver matriz en [`../compras/README.md`](../compras/README.md) |
| `Operaciones.Entregas` | `receiveGoods` | `read`: `GET` · `write`: `GET, POST, advance, return` · `full`: `+ DELETE` |

---

## 4. Diagrama de Flujo Operativo e Integración Inter-Módulo

```
admin_locations (Ubicaciones) ──1:1──> ops_warehouses (Almacenes)
                                              │
cat_products (Catálogo) <───sync───> ops_inventory (Existencias por Almacén)
                                       │     ▲     ▲
          ┌────────────────────────────┘     │     └────────────────────────┐
          ▼                                  │                              │
  ops_transfers (TRF-YYYY-NNN)      purchase_receptions             sales_orders / returns
  ├── immediate: stock origen->dest   (Compras -> Andén)            (Reservas / Salidas / RMA)
  └── in_transit: stock -> inTransit
          │
          ▼
  ops_stock_movements (Kardex MOV-YYYY-NNN: Entrada | Salida | Transferencia | Ajuste)
          │
          ▼
  ops_shipments (DESP-YYYY-NNN: Preparando -> En ruta -> Entregado | Devuelto)
```

---

## 5. Endpoint de Resumen Consolidado y Rotación de Stock (`GET /api/v1/operations/summary`)

Calcula en tiempo real los KPIs y tablas analíticas de `OperationsOverview.tsx`:

### Parámetros de Consulta (`Query Params`)

| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| `windowDays` | `30 \| 60 \| 90` | `30` | Ventana de días naturales (`[today - windowDays, today]`) para calcular salidas y velocidad de rotación. |
| `warehouseId` | `string` | `'ALL'` | ID de almacén específico (`ops_warehouses.id`) o `'ALL'` para consolidado multi-almacén. |
| `category` | `string` | `'Todas'` | Filtro por categoría de producto (`Hardware`, `Redes`, etc.). |
| `velocity` | `'Todas' \| 'Alta' \| 'Media' \| 'Baja'` | `'Todas'` | Filtro por nivel de velocidad de rotación. |
| `search` | `string` | `''` | Búsqueda por `sku`, `name` o `category`. |
| `sortBy` | `'value' \| 'turnover' \| 'unitsOut' \| 'stock' \| 'coverage'` | `'value'` | Columna de ordenamiento en la tabla de rotación. |
| `sortDir` | `'asc' \| 'desc'` | `'desc'` | Dirección de ordenamiento. |
| `reportingCurrency` | `'MXN' \| 'USD'` | `'MXN'` | Moneda de presentación para valoración monetaria. |

### Reglas de Cálculo en Servidor

1. **KPIs Globales:**
   - `totalValuation`: $\sum (\text{stock} \times \text{cost})$ convertido a `reportingCurrency`.
   - `totalPhysicalUnits`: $\sum \text{stock}$.
   - `lowStockCount`: Cantidad de registros en `ops_inventory` donde `stock <= effectiveMinStock`.
   - `pendingPurchaseOrdersCount` / `pendingPurchaseOrdersValue`: Órdenes en `Emitida` o `Recepción parcial`.
   - `activeShipmentsCount`: Despachos en estado `'En ruta'`.
2. **Desglose por Categoría (`categoryBreakdown[]`):**
   - Agrupa `scopedInventory` por categoría efectiva (`resolveInventoryItemCategory`), devolviendo `skuCount`, `locationsCount`, `units`, `reserved`, `inTransit`, `totalValue`, `sharePct` (`(totalValue / grandTotal) * 100`).
3. **Tabla de Rotación de Stock por SKU (`stockRotation[]`):**
   - **Salidas del periodo (`unitsOut`):** Suma absoluta de movimientos `'Salida'` y `'Ajuste'` negativo (`quantity < 0`) dentro de `windowDays` (respetando `warehouseId` si no es `'ALL'`). Si `warehouseId === 'ALL'`, suma también las cantidades de `sales_orders` no cancelados dentro del periodo cuyo `(sku, folio)` no haya sido registrado ya como movimiento `'Salida'` (evita doble conteo).
   - **Rotación del periodo (`periodTurnoverPct`):** `stock > 0 ? (unitsOut / stock) * 100 : (unitsOut > 0 ? 100 : 0)`.
   - **Rotación anualizada (`annualizedTurnover`):** `stock > 0 ? (unitsOut / stock) * (360 / windowDays) : (unitsOut > 0 ? 360 / windowDays : 0)`.
   - **Días de cobertura (`daysOfSupply`):** `unitsOut > 0 ? Math.round((stock / unitsOut) * windowDays) : null`.
   - **Nivel de velocidad (`velocity`):**
     - `'Alta'`: `annualizedTurnover >= 2.0`
     - `'Media'`: `0 < annualizedTurnover < 2.0`
     - `'Baja'`: `annualizedTurnover === 0`
   - **Exportación CSV:** `GET /api/v1/operations/summary/export.csv` acepta los mismos query params y genera el consolidado con BOM UTF-8 (`inventario_categorias_rotacion_<windowDays>d_<currency>_<YYYY-MM-DD>.csv`).
