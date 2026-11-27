# Operaciones · Movimientos / Kardex (`StockMovement`)

Especificación funcional, modelo de datos y reglas de trazabilidad para la bitácora de **Movimientos y Kardex** (`/api/v1/operations/movements`).

---

## 1. Descripción Funcional

Bitácora inmutable (*append-only*) que registra cada entrada, salida, traslado entre almacenes y ajuste físico de inventario en la organización. Alimenta directamente el cálculo de rotación de stock en el **Resumen de Operaciones** (ventanas de 30, 60 y 90 días) y la trazabilidad de documentos origen (OC, Pedidos, Traslados, Devoluciones RTV/RMA).

---

## 2. Campos del Registro (`StockMovementRecord`)

Los movimientos son generados automáticamente por el backend dentro de transacciones de Inventario, Traslados, Ventas y Compras; no deben editarse ni eliminarse manualmente.

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `id` | `string` (max 64) | Servidor | `mov_<ts>` | Identificador único del movimiento. |
| `folio` | `string` (max 32) | Servidor | `MOV-YYYY-NNN` | Folio consecutivo por organización. |
| `date` | `string` (max 40) | Servidor | Fecha actual | Fecha del movimiento (formato ISO o fecha ERP localizada). |
| `type` | `enum` (`MovementType`) | **Sí** | — | `'Entrada'` \| `'Salida'` \| `'Transferencia'` \| `'Ajuste'`. |
| `sku` | `string` (max 48) | **Sí** | — | SKU del producto afectado. |
| `productName` | `string` (max 180) | **Sí** | — | Nombre del artículo al momento del movimiento. |
| `quantity` | `number` (`!= 0`) | **Sí** | — | Cantidad movida. Positiva en `Entrada`/`Transferencia`; negativa o positiva en `Ajuste` (`+N` / `-N`); positiva o magnitud absoluta en `Salida`. |
| `sourceWarehouse` | `string \| null` (max 150) | Condicional | `null` | Almacén origen (requerido en `Salida`, `Transferencia` y `Ajuste`). |
| `targetWarehouse` | `string \| null` (max 150) | Condicional | `null` | Almacén destino (requerido en `Entrada` y `Transferencia`). |
| `referenceDoc` | `string \| null` (max 80) | No | `null` | Folio documental asociado (`OC-2026-NNN`, `PED-2026-NNN`, `TRF-2026-NNN`, `AJUSTE-MANUAL`, `DEV-PRV-...`). |
| `reason` | `string` (max 500) | **Sí** | — | Descripción legible del motivo del movimiento. |
| `user` | `string` (max 120) | Servidor | Actor de sesión | Usuario o proceso que originó el movimiento. |

---

## 3. Endpoints REST

| Método | Ruta | Descripción | RBAC |
|---|---|---|---|
| `GET` | `/api/v1/operations/movements` | Lista paginada del Kardex filtrable por `type`, `warehouseName`, `sku`, `referenceDoc`, `fromDate`, `toDate`, `search` | `Operaciones.Inventario` (`read`) + `stockLedger` |
| `GET` | `/api/v1/operations/movements/export.csv` | Exporta el Kardex filtrado a CSV con BOM UTF-8 (`kardex_movimientos_<YYYY-MM-DD>.csv`) | `Operaciones.Inventario` (`read`) + `stockLedger` |

> **Nota:** No se exponen endpoints `POST`, `PATCH` ni `DELETE` directos sobre `/movements` para garantizar integridad contable del Kardex; toda inserción ocurre vía transacciones de negocio (`/inventory/adjust`, `/transfers`, `/purchases/receptions`, `/sales/orders`, `/returns`).

---

## 4. Reglas de Negocio y Contribución a Rotación

1. **Inmutabilidad (*Append-Only*):** Un asiento del Kardex nunca se sobrescribe ni borra. Cualquier corrección (como cancelar un traslado `'En tránsito'`) genera un nuevo movimiento compensatorio (ej. `type: 'Ajuste'`, referencia `TRF-YYYY-NNN`).
2. **Cálculo de Salidas para Rotación (`OperationsOverview`):**
   - Se contabilizan como salidas reales los registros donde `type === 'Salida'` o `(type === 'Ajuste' && quantity < 0)`, sumando `Math.abs(quantity)`.
   - Los movimientos `type === 'Transferencia'` se reportan en el contador `transfersCount` por SKU pero no inflan el indicador de salidas comerciales (`unitsOut`).
3. **Auditoría:** Cada inserción en `ops_stock_movements` dispara un evento en `audit_logs` con `category: 'inventory'` indicando SKU, delta de cantidad y almacén.
