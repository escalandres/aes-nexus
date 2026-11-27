# Compras · Órdenes de Compra (`PurchaseOrders`)

Especificación funcional, modelo de datos y reglas de validación para la entidad **Órdenes de Compra** (`/api/v1/purchases/orders`).

---

## 1. Descripción Funcional

Administra los pedidos formales emitidos a proveedores del CRM (`crm_vendors`), especificando el almacén receptor (`ops_warehouses`), fecha estimada de entrega, costos unitarios por partida y seguimiento de unidades recibidas (`receivedQty` vs `quantity`). Se conecta directamente con **Recepciones**, **Facturas CxP** y **Devoluciones a Proveedor**.

---

## 2. Campos Obligatorios vs. Opcionales (`CreatePurchaseOrderDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `supplierCompany` | `string` (max 180) | **Sí** | — | Razón social del proveedor (`crm_vendors`). |
| `warehouseId` | `string` (max 64) | **Sí** | Almacén default | ID del almacén donde ingresará la mercancía (`ops_warehouses`). |
| `items` | `PurchaseOrderItemInput[]` | **Sí** | — | Partidas de compra (`minItems: 1`), cada una con `quantity > 0` y `unitCost >= 0`. |
| `supplierContact` | `string` (max 150) | No | Del proveedor | Nombre o correo del contacto comercial del proveedor. |
| `supplierEmail` | `string` (email, max 180) | No | Del proveedor | Correo del proveedor para envío de la OC. |
| `expectedDeliveryDate` | `string` (max 40) | No | `+7 días` | Fecha comprometida de arribo en andén. |
| `currency` | `enum` | No | `'MXN'` | `'MXN'` \| `'USD'`. |
| `status` | `enum` (`PurchaseOrderStatus`) | No | `'Emitida'` | `'Borrador'` \| `'Emitida'` \| `'Recepción parcial'` \| `'Recibida'` \| `'Cancelada'`. |
| `notes` | `string` (max 2000) | No | `null` | Condiciones de entrega, número de requisición origen o comentarios. |

### Sub-entidad `PurchaseOrderItem`

| Campo | Tipo | Obligatorio | Default | Descripción |
|---|---|---|---|---|
| `id` | `string` | Servidor | `poi_<ts>_<idx>` | Identificador de partida. |
| `sku` | `string` (max 48) | **Sí** | — | SKU del producto solicitado. |
| `name` | `string` (max 180) | **Sí** | — | Nombre del artículo. |
| `quantity` | `number` (`> 0`) | **Sí** | — | Cantidad ordenada. |
| `receivedQty` | `number` (`>= 0`) | Servidor | `0` | Unidades acumuladas recepcionadas en almacén (`<= quantity`). |
| `unitCost` | `number` (`>= 0`) | **Sí** | — | Costo unitario pactado sin IVA. |
| `taxRate` | `enum` | No | `'16%'` | `'16%'` \| `'8%'` \| `'0%'` (según perfil fiscal país). |
| `subtotal` | `number` | Servidor | `quantity * unitCost` | Importe neto de partida. |
| `taxAmount` | `number` | Servidor | Calculado | Impuesto de la partida. |
| `total` | `number` | Servidor | `subtotal + taxAmount` | Total de la partida. |

### Campos Generados por el Servidor (`PurchaseOrderRecord`)

- `id` (`po_<ts>`), `folio` (`OC-YYYY-NNN`), `date`, `warehouseName`, `subtotal`, `taxTotal`, `total`, `createdAt`, `updatedAt`.
- Derivado opcional: `hasLinkedBill` (`boolean`, indica si ya existe `ap_bills.purchase_order_folio = po.folio`).

---

## 3. Endpoints REST

| Método | Ruta | Descripción | RBAC |
|---|---|---|---|
| `GET` | `/api/v1/purchases/orders` | Lista filtrable por `search` (folio, proveedor, almacén, SKU), `status`, `warehouseId` | `Compras.Órdenes de compra` (`read`) |
| `GET` | `/api/v1/purchases/orders/:id` | Detalle de OC, progreso de recepción por partida y facturas CxP ligadas | `Compras.Órdenes de compra` (`read`) |
| `POST` | `/api/v1/purchases/orders` | Emisión de nueva OC (`Emitida` o `Borrador`) | `Compras.Órdenes de compra` (`write`) + `approvePurchases` |
| `PATCH` | `/api/v1/purchases/orders/:id/status` | Emitir borrador (`Borrador → Emitida`) o cancelar (`→ Cancelada`) | `Compras.Órdenes de compra` (`write`) + `approvePurchases` |
| `POST` | `/api/v1/purchases/orders/:id/register-bill` | Genera automáticamente factura CxP (`CXP-YYYY-NNN`) desde la OC si aún no existe | `Compras.Facturas` (`write`) |
| `DELETE` | `/api/v1/purchases/orders/:id` | Elimina OC (`409` si ya tuvo recepciones o facturas CxP ligadas) | `Compras.Órdenes de compra` (`full`) |

---

## 4. Reglas de Negocio

1. **Control de Aprobación:** Crear, emitir desde borrador o cancelar órdenes requiere `approvePurchases` (`403 Forbidden` si el rol no cuenta con esa capacidad).
2. **No Duplicar Factura CxP desde OC:** Al invocar `/register-bill`, si ya existe una factura en `ap_bills` con `purchaseOrderFolio === po.folio`, devolver `409 Conflict` indicando el folio existente.
3. **Transición Automática por Recepción:** Los estados `'Recepción parcial'` y `'Recibida'` se actualizan exclusivamente mediante el flujo de **Recepciones** conforme `receivedQty` iguala `quantity` en todas las partidas.
