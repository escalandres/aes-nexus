# Ventas · Pedidos de Venta (`SalesOrders`)

Especificación funcional, modelo de datos y reglas de validación para la entidad **Pedidos de Venta** (`/api/v1/sales/orders`).

---

## 1. Descripción Funcional

Registra órdenes comerciales confirmadas por el cliente (de forma directa o por conversión desde una cotización aprobada), rastrea el avance logístico (`Confirmado → En preparación → Enviado → Entregado`) y controla el saldo facturado vs. pendiente por facturar mediante su vínculo con **Facturas de Venta (CxC)**.

---

## 2. Campos Obligatorios vs. Opcionales (`CreateOrderDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `clientId` | `string` (max 64) | **Sí*** | `'cli_manual'` | ID del cliente en CRM o `'cli_manual'`. |
| `clientCompany` | `string` (max 180) | **Sí** | — | Razón social o empresa compradora. |
| `clientName` | `string` (max 150) | **Sí** | — | Contacto responsable de recepción del pedido. |
| `items` | `SalesLineItemInput[]` | **Sí** | — | Partidas del pedido (`minItems: 1`). Comparte estructura `SalesLineItem`. |
| `quoteId` | `string` (max 64) | No | `null` | ID de la cotización origen cuando proviene de conversión. |
| `quoteFolio` | `string` (max 40) | No | `null` | Folio de la cotización origen (ej. `COT-2026-001`). |
| `deliveryDays` | `integer` (`>= 1`) | No | `7` | Días para calcular `deliveryDate` a partir de `date`. |
| `deliveryDate` | `string` | No | Calculada | Fecha comprometida de entrega (prevalece sobre `deliveryDays` si se informa). |
| `currency` | `enum` | No | `'MXN'` | `'MXN'` \| `'USD'`. |
| `status` | `enum` (`OrderStatus`) | No | `'Confirmado'` | `'Confirmado'` \| `'En preparación'` \| `'Enviado'` \| `'Entregado'` \| `'Cancelado'`. |
| `shippingAddress` | `string` (max 300) | No | `'Dirección fiscal registrada'` | Dirección de entrega logística o sede destino. |
| `notes` | `string` (max 2000) | No | `null` | Instrucciones operativas, horarios de entrega o referencia de compra del cliente. |

### Campos Generados / Gestionados por el Servidor (`SalesOrderRecord`)

- `id` (`string` / UUID, prefijo frontend `order_<ts>`).
- `folio` (`string`, formato `PED-YYYY-NNN`).
- `date` (`string`), `deliveryDate` (`string`).
- `subtotal`, `taxTotal`, `total` (recalculados desde `items`).
- `invoiceIds` (`string[]`), `invoiceFolios` (`string[]`) — actualizados automáticamente al emitir o eliminar facturas vinculadas.
- Derivados opcionales en respuesta: `billedAmount` (`number`), `remainingToInvoice` (`number`).
- `createdAt` (`date-time`), `updatedAt` (`date-time`).

---

## 3. Endpoints REST

| Método | Ruta | Descripción | RBAC |
|---|---|---|---|
| `GET` | `/api/v1/sales/orders` | Lista filtrable por `search` (folio, cotización, cliente, dirección), `status`, `sortBy` (`folio` \| `total` \| `deliveryDate`) | `Ventas.Pedidos` (`read`) |
| `GET` | `/api/v1/sales/orders/:id` | Detalle de pedido con monto facturado y facturas vinculadas | `Ventas.Pedidos` (`read`) |
| `POST` | `/api/v1/sales/orders` | Creación directa de pedido en estado `'Confirmado'` | `Ventas.Pedidos` (`write`) |
| `PATCH` | `/api/v1/sales/orders/:id` | Edición de fecha de entrega, dirección, notas o partidas (si no está entregado/facturado) | `Ventas.Pedidos` (`write`) |
| `PATCH` | `/api/v1/sales/orders/:id/status` | Avance de estado logístico (`Confirmado → En preparación → Enviado → Entregado` o `Cancelado`) | `Ventas.Pedidos` (`write`) |
| `DELETE` | `/api/v1/sales/orders/:id` | Eliminación de pedido (`409 Conflict` si ya posee facturas o devoluciones vinculadas) | `Ventas.Pedidos` (`full`) |

---

## 4. Reglas de Negocio

1. **Secuencia de Estados:** El flujo estándar progresivo es `Confirmado → En preparación → Enviado → Entregado`. Un pedido en estado `'Cancelado'` queda excluido de KPIs de facturación confirmada y no es elegible para emitir nuevas facturas ni devoluciones por defecto.
2. **Control de Facturación Parcial / Total:** Un mismo pedido puede ligarse a múltiples facturas (`invoiceIds[]`, `invoiceFolios[]`) siempre que `sum(ar_invoices.total) <= order.total` (con tolerancia de redondeo `0.50`).
3. **Auditoría:** Emite registros en `audit_logs` (`category: 'sales'`) al confirmar pedidos, cambiar estados logísticos o eliminar pedidos.
