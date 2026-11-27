# Operaciones · Traslados entre Almacenes (`InventoryTransfer`)

Especificación funcional, modelo de datos y reglas de transición para la entidad **Traslados** (`/api/v1/operations/transfers`).

---

## 1. Descripción Funcional

Gestiona la reubicación de mercancía entre dos almacenes distintos de la organización (`sourceWarehouseId !== targetWarehouseId`). Soporta dos modalidades de ejecución:
1. **`immediate` (Traslado directo):** Descuenta existencias en el almacén origen, suma inmediatamente en el almacén destino y nace en estado `'Completado'`.
2. **`in_transit` (Envío en tránsito):** Descuenta `stock` del almacén origen, suma `inTransit` en el almacén destino y nace en estado `'En tránsito'` hasta que el destino confirme recepción (`POST /receive`) o se cancele (`POST /cancel`).

---

## 2. Campos Obligatorios vs. Opcionales (`CreateTransferDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `sourceWarehouseId` | `string` (max 64) | **Sí** | — | ID del almacén origen (`ops_warehouses.id`). |
| `targetWarehouseId` | `string` (max 64) | **Sí** | — | ID del almacén destino (`!= sourceWarehouseId`). |
| `transferMode` | `enum` | No | `'in_transit'` | `'immediate'` \| `'in_transit'`. |
| `items` | `TransferItemInput[]` | **Sí** | — | Líneas a trasladar (`minItems: 1`). Cada línea debe tener `quantity > 0` y `<= stock` disponible en origen. |
| `carrierOrMethod` | `string` (max 120) | **Sí** | — | Medio de traslado o flotilla (ej. `'Flotilla Interna'`, `'DHL Express'`, `'Estafeta Terrestre'`). |
| `responsibleUser` | `string` (max 120) | No | Usuario de sesión | Responsable logístico que autoriza/despacha el traslado. |
| `expectedArrival` | `string \| null` (ISO date) | No | `null` | Fecha estimada de llegada (solo aplica cuando `transferMode === 'in_transit'`). |
| `notes` | `string \| null` (max 1000) | No | Auto según modo | Observaciones operativas del traslado. |

### Sub-entidad `InventoryTransferItem`

| Campo | Tipo | Obligatorio | Default | Descripción |
|---|---|---|---|---|
| `id` | `string` | Servidor | `trfi_<ts>_<idx>` | Identificador único de línea. |
| `inventoryItemId` | `string` | **Sí** | — | ID del registro origen en `ops_inventory`. |
| `productId` | `string` | Servidor / Origen | — | ID del producto en catálogo (`cat_products`). |
| `sku` | `string` (max 48) | Servidor / Origen | — | SKU del producto. |
| `name` | `string` (max 180) | Servidor / Origen | — | Nombre del artículo. |
| `unitOfMeasure` | `string` (max 32) | Servidor / Origen | — | Unidad de medida. |
| `quantity` | `integer` (`> 0`) | **Sí** | — | Cantidad a trasladar (`<= origin.stock`). |
| `unitCost` | `number` (`>= 0`) | Servidor / Origen | — | Costo unitario de valuación al momento del despacho. |
| `sourceBin` | `string` (max 80) | Servidor / Origen | — | Ubicación/rack de salida en almacén origen. |
| `targetBin` | `string` (max 80) | No | Rack existente o `'Recepción <target.code>'` | Ubicación/rack asignado en almacén destino. |

### Campos Generados por el Servidor (`InventoryTransferRecord`)

- `id` (`trf_<ts>`), `folio` (`TRF-YYYY-NNN`), `date`, `completedDate` (solo si `immediate` o al recibir), `sourceWarehouseName`, `targetWarehouseName`, `totalUnits`, `totalValue`, `status` (`'En tránsito' | 'Completado' | 'Cancelado'`), `createdAt`, `updatedAt`.

---

## 3. Endpoints REST

| Método | Ruta | Descripción | RBAC |
|---|---|---|---|
| `GET` | `/api/v1/operations/transfers` | Lista traslados filtrables por `status`, `warehouseId`, `search` (folio, almacén, SKU, responsable) | `Operaciones.Traslados` (`read`) |
| `GET` | `/api/v1/operations/transfers/export.csv` | Exporta CSV con BOM UTF-8 (`traslados_almacenes_<YYYY-MM-DD>.csv`) | `Operaciones.Traslados` (`read`) |
| `GET` | `/api/v1/operations/transfers/:id` | Detalle completo del traslado y sus partidas | `Operaciones.Traslados` (`read`) |
| `POST` | `/api/v1/operations/transfers` | Crea traslado (`immediate` o `in_transit`), ajusta inventarios y genera Kardex `'Transferencia'` | `Operaciones.Traslados` (`write`) |
| `POST` | `/api/v1/operations/transfers/:id/receive` | Confirma recepción en destino (`En tránsito → Completado`) | `Operaciones.Traslados` (`write`) |
| `POST` | `/api/v1/operations/transfers/:id/cancel` | Cancela traslado en tránsito (`En tránsito → Cancelado`) y revierte stock a origen | `Operaciones.Traslados` (`write`) |
| `DELETE` | `/api/v1/operations/transfers/:id` | Elimina registro histórico (`409` si está `'En tránsito'`) | `Operaciones.Traslados` (`full`) |

---

## 4. Reglas de Negocio y Transacciones Atómicas

1. **Validación de Stock Previa (Todo o Nada):** En `POST /transfers`, antes de mutar registros, el backend bloquea (`SELECT ... FOR UPDATE`) cada fila origen de `ops_inventory` y verifica `origin.stock >= line.quantity`. Si el SKU aún no existe en el almacén destino, crea automáticamente la fila en `ops_inventory` heredando `minStock`, `cost` y `targetBin`.
2. **Emisión en `POST /transfers`:**
   - Siempre resta `origin.stock -= line.quantity`.
   - Si `transferMode === 'immediate'`: suma `dest.stock += line.quantity`, marca `status = 'Completado'` y `completedDate = today`.
   - Si `transferMode === 'in_transit'`: suma `dest.inTransit += line.quantity` y marca `status = 'En tránsito'`.
   - Por cada línea emite `StockMovement` tipo `'Transferencia'` con `referenceDoc = folio`.
3. **Confirmación de Recepción (`POST /transfers/:id/receive`):**
   - Solo permitida si `status === 'En tránsito'` (de lo contrario `409 Conflict`).
   - En destino: `dest.inTransit = Math.max(0, dest.inTransit - line.quantity)` y `dest.stock += line.quantity`.
   - Actualiza `status = 'Completado'`, `completedDate = today`.
   - Por cada línea emite `StockMovement` tipo `'Entrada'` hacia `targetWarehouseName` (`referenceDoc = folio`).
4. **Cancelación y Retorno (`POST /transfers/:id/cancel`):**
   - Solo permitida si `status === 'En tránsito'`.
   - En destino: `dest.inTransit = Math.max(0, dest.inTransit - line.quantity)`.
   - En origen: `origin.stock += line.quantity`.
   - Actualiza `status = 'Cancelado'`.
   - Por cada línea emite `StockMovement` tipo `'Ajuste'` positivo en `sourceWarehouseName` (`referenceDoc = folio`, motivo `'Cancelación de traslado ...'`).
5. **Auditoría:** Creación, recepción, cancelación y eliminación emiten evento en `audit_logs` (`category: 'inventory'`).
