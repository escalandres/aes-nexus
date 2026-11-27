# Compras · Recepciones en Almacén (`PurchaseReceptions`)

Especificación funcional, modelo de datos y reglas transaccionales para el proceso de **Recepciones de Mercancía** (`/api/v1/purchases/receptions`).

---

## 1. Descripción Funcional

Orquesta el ingreso físico en andén de las órdenes de compra en estado `'Emitida'` o `'Recepción parcial'`. Permite capturar recepciones parciales o totales por partida, incrementa automáticamente el inventario en el almacén destino (`ops_inventory`), actualiza el costo unitario más reciente, genera movimientos `'Entrada'` en el Kardex (`ops_stock_movements`) y recalcula el estado de la Orden de Compra (`'Recepción parcial'` o `'Recibida'`).

---

## 2. Campos de Entrada (`ReceivePurchaseOrderDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `purchaseOrderId` | `string` (max 64) | **Sí** | — | ID de la OC a recepcionar (debe estar en estado `'Emitida'` o `'Recepción parcial'`). |
| `items` | `ReceptionLineInput[]` | **Sí** | — | Lista de partidas con cantidades recibidas (`minItems: 1`). Al menos una línea debe tener `quantityReceived > 0`. |
| `locationBin` | `string` (max 64) | No | `'Andén Recepción'` | Ubicación/pasillo asignado si el SKU es nuevo en el almacén destino. |
| `notes` | `string` (max 500) | No | `null` | Observaciones de andén o número de remisión del transportista. |

### Sub-objeto `ReceptionLineInput`

| Campo | Tipo | Obligatorio | Descripción y Reglas |
|---|---|---|---|
| `orderItemId` | `string` (max 64) | **Sí** | ID de la partida dentro de `purchase_order_items`. |
| `quantityReceived` | `number` (`>= 0`) | **Sí** | Cantidad física ingresada en este evento. Debe cumplir `0 <= quantityReceived <= (item.quantity - item.receivedQty)`. |

### Respuesta Transaccional (`ReceptionConfirmationRecord`)

- `purchaseOrderId`, `purchaseOrderFolio`, `newOrderStatus` (`'Recepción parcial' | 'Recibida'`), `totalUnitsReceived` (`number > 0`), `warehouseId`, `warehouseName`.
- `movementsCreated`: lista de movimientos generados en Kardex (`id`, `folio: 'MOV-YYYY-NNN'`, `type: 'Entrada'`, `sku`, `productName`, `quantity`, `targetWarehouse`, `referenceDoc: po.folio`, `reason`, `user`, `date`).

---

## 3. Endpoints REST

| Método | Ruta | Descripción | RBAC |
|---|---|---|---|
| `GET` | `/api/v1/purchases/receptions/pending` | Lista de OC en estado `'Emitida'` o `'Recepción parcial'` con unidades pendientes | `Compras.Recepciones` (`read`) |
| `GET` | `/api/v1/purchases/receptions/history` | Historial de movimientos `'Entrada'` en Kardex vinculados a recepciones OC (filtrable por `search`) | `Compras.Recepciones` (`read`) |
| `POST` | `/api/v1/purchases/receptions` | Ejecuta la recepción en una transacción atómica (OC + Inventario + Kardex + Auditoría) | `Compras.Recepciones` (`write`) + `receiveGoods` |

---

## 4. Validaciones y Transacción Atómica

1. **Validación de Rangos:** Por cada partida en `items`, verificar `quantityReceived <= (quantity - receivedQty)`. Si alguna línea excede el saldo pendiente, abortar con `422 Unprocessable Entity`.
2. **Cantidad Total Positiva:** La suma de `quantityReceived` de todas las partidas debe ser `> 0` (`422` en caso contrario).
3. **Actualización Atómica en BD (`BEGIN ... COMMIT`):**
   - Incrementar `purchase_order_items.received_qty += quantityReceived`.
   - Calcular nuevo estado de la OC: `'Recibida'` si todas las líneas cumplen `received_qty >= quantity`; `'Recepción parcial'` en caso contrario.
   - En `ops_inventory` para `(sku, warehouseId)`: si existe la fila, sumar `stock += quantityReceived` y actualizar `cost = item.unitCost`; si no existe, insertar nueva fila con `reserved: 0`, `inTransit: 0`, `minStock: 2`, `locationBin`.
   - Insertar un movimiento `'Entrada'` en `ops_stock_movements` por cada SKU recibido con `referenceDoc = po.folio`.
   - Emitir registro en `audit_logs` (`category: 'inventory'`).
