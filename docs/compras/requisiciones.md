# Compras · Requisiciones (`PurchaseRequisitions`)

Especificación funcional, modelo de datos y reglas de validación para la entidad **Requisiciones de Compra** (`/api/v1/purchases/requisitions`).

---

## 1. Descripción Funcional

Permite a los departamentos operativos capturar solicitudes internas de abastecimiento (manuales o prellenadas automáticamente con artículos cuyo inventario esté por debajo de `minStock`), someterlas a aprobación por rol (`approvePurchases`) y convertir requisiciones aprobadas directamente en **Órdenes de Compra** (`OC-YYYY-NNN`).

---

## 2. Campos Obligatorios vs. Opcionales (`CreateRequisitionDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `department` | `string` (max 150) | **Sí** | Primer depto activo | Nombre o referencia del departamento solicitante (`admin_departments`). |
| `warehouseId` | `string` (max 64) | **Sí** | — | ID del almacén destino donde se requiere el abastecimiento (`ops_warehouses`). |
| `items` | `RequisitionLineItemInput[]` | **Sí** | — | Partidas solicitadas (`minItems: 1`) con `sku`, `name`, `quantity > 0` y `estimatedUnitCost >= 0`. |
| `priority` | `enum` (`RequisitionPriority`) | No | `'Normal'` | `'Normal'` \| `'Alta'` \| `'Urgente'`. |
| `neededByDate` | `string` (max 40) | No | `+7 días` | Fecha requerida de entrega en almacén. |
| `notes` | `string` (max 2000) | No | `null` | Justificación operativa o referencia de proyecto. |

### Sub-entidad `RequisitionLineItem`

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | `string` | Servidor | Identificador de partida (`reqi_<ts>_<idx>`). |
| `sku` | `string` (max 48) | **Sí** | SKU del catálogo comercial/inventario. |
| `name` | `string` (max 180) | **Sí** | Nombre del artículo. |
| `quantity` | `number` (`> 0`) | **Sí** | Cantidad solicitada. |
| `estimatedUnitCost` | `number` (`>= 0`) | **Sí** | Costo unitario estimado (fallback al costo en catálogo). |
| `subtotal` | `number` | Servidor | `quantity * estimatedUnitCost`. |
| `currentStock` | `number` | No | Snapshot de existencia al momento de detectar alerta de stock bajo. |
| `minStock` | `number` | No | Umbral mínimo de referencia al momento de solicitar reposición. |

### Campos Generados por el Servidor (`PurchaseRequisitionRecord`)

- `id` (`req_<ts>`), `folio` (`REQ-YYYY-NNN`), `date` (`string`), `requestedBy` (nombre del usuario JWT), `warehouseName`, `status` (`'Pendiente'` al crear), `estimatedTotal` (suma de subtotales), `linkedPoFolio` (`string | null`), `approvedBy` (`string | null`), `approvedAt` (`string | null`), `createdAt`, `updatedAt`.

---

## 3. Endpoints REST

| Método | Ruta | Descripción | RBAC |
|---|---|---|---|
| `GET` | `/api/v1/purchases/requisitions` | Lista filtrable por `search` (folio, solicitante, depto, almacén, SKU), `status`, `priority` | `Compras.Requisiciones` (`read`) |
| `GET` | `/api/v1/purchases/requisitions/low-stock-suggestions` | Obtiene artículos bajo `minStock` con cantidad sugerida `max(2, minStock * 2 - stock)` | `Compras.Requisiciones` (`read`) |
| `GET` | `/api/v1/purchases/requisitions/:id` | Detalle completo de requisición | `Compras.Requisiciones` (`read`) |
| `POST` | `/api/v1/purchases/requisitions` | Alta de requisición en estado `'Pendiente'` | `Compras.Requisiciones` (`write`) |
| `PATCH` | `/api/v1/purchases/requisitions/:id/status` | Aprobar (`'Aprobada'`) o rechazar (`'Rechazada'`) | `Compras.Requisiciones` (`write`) + `approvePurchases` |
| `POST` | `/api/v1/purchases/requisitions/:id/convert-to-po` | Convierte requisición `'Aprobada'` en OC asignando proveedor y fecha esperada | `Compras.Requisiciones` (`write`) + `approvePurchases` |
| `DELETE` | `/api/v1/purchases/requisitions/:id` | Elimina requisición (`409` si ya fue convertida a OC) | `Compras.Requisiciones` (`full`) |

---

## 4. Reglas de Negocio y Conversión a OC

1. **Aprobación Restringida:** Solo usuarios con capacidad `approvePurchases` (o Administrador General) pueden ejecutar `PATCH /:id/status` hacia `'Aprobada'` o `'Rechazada'`. Al aprobar, se registran `approvedBy` y `approvedAt`.
2. **Conversión a Orden de Compra (`convert-to-po`):**
   - Requiere `supplierCompany` válido y `expectedDeliveryDate` (fallback `requisition.neededByDate`).
   - Rechazar con `409 Conflict` si `status === 'Convertida a OC'` o `status === 'Rechazada'`.
   - Crea una `PurchaseOrder` en estado `'Emitida'` calculando el IVA estándar sobre `estimatedUnitCost`, marca la requisición con `status = 'Convertida a OC'` y `linkedPoFolio = newPO.folio`.
3. **Auditoría:** Emite eventos en `audit_logs` (`category: 'inventory'`) al crear, aprobar/rechazar, convertir a OC y eliminar requisiciones.
