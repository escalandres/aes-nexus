# Ventas · Cotizaciones (`Quotes`)

Especificación funcional, modelo de datos y reglas de validación para la entidad **Cotizaciones** (`/api/v1/sales/quotes`).

---

## 1. Descripción Funcional

Gestiona propuestas económicas dirigidas a clientes o prospectos del CRM, con cálculo multi-tasa de IVA por partida, vigencia en días, términos comerciales, clonación como borrador y conversión directa a **Pedido de Venta** (`PED-YYYY-NNN`).

---

## 2. Campos Obligatorios vs. Opcionales (`CreateQuoteDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `clientId` | `string` (max 64) | **Sí*** | `'cli_manual'` | ID del cliente en CRM (`crm_customers`) o `'cli_manual'` para captura libre. |
| `clientCompany` | `string` (max 180) | **Sí** | — | Razón social o nombre comercial del cliente. |
| `clientName` | `string` (max 150) | **Sí** | — | Nombre del contacto receptor de la propuesta. |
| `clientEmail` | `string` (email, max 180) | **Sí** | — | Correo electrónico del contacto para envío de cotización. |
| `items` | `SalesLineItemInput[]` | **Sí** | — | Lista de partidas (`minItems: 1`). Cada línea requiere al menos SKU/nombre, cantidad (`> 0`) y precio unitario (`>= 0`). |
| `validDays` | `integer` (`>= 1`) | No | `15` | Días de vigencia para calcular `expiryDate` a partir de `date`. |
| `expiryDate` | `string` | No | Calculada | Fecha límite explícita (si se envía, prevalece sobre `validDays`). |
| `currency` | `enum` | No | `'MXN'` | `'MXN'` \| `'USD'`. |
| `status` | `enum` (`QuoteStatus`) | No | `'Enviada'` | `'Borrador'` \| `'Enviada'` \| `'Aprobada'` \| `'Rechazada'` \| `'Vencida'`. |
| `notes` | `string` (max 2000) | No | `null` | Notas internas o alcance de la propuesta. |
| `terms` | `string` (max 1000) | No | `null` | Condiciones de pago, vigencia y entrega. |

### Sub-entidad `SalesLineItem`

| Campo | Tipo | Obligatorio | Default | Descripción |
|---|---|---|---|---|
| `id` | `string` | No (generado) | UUID | Identificador único de línea. |
| `itemId` | `string` | No | `null` | Referencia opcional a `sales_catalog_items.id`. |
| `sku` | `string` (max 48) | **Sí** | — | SKU del producto o servicio. |
| `name` | `string` (max 180) | **Sí** | — | Descripción de la partida. |
| `type` | `enum` | **Sí** | `'product'` | `'product'` \| `'service'`. |
| `quantity` | `number` (`> 0`) | **Sí** | `1` | Cantidad cotizada. |
| `unitPrice` | `number` (`>= 0`) | **Sí** | — | Precio unitario sin IVA. |
| `taxRate` | `enum` | **Sí** | `'16%'` | `'16%'` \| `'8%'` \| `'0%'` \| `'Exento'`. |
| `unitOfMeasure` | `string` (max 24) | **Sí** | `'Pza'` | Unidad de medida. |
| `subtotal` | `number` | Servidor | `qty * unitPrice` | Subtotal neto de la línea. |
| `taxAmount` | `number` | Servidor | Calculado | IVA de la línea (`0.16` / `0.08` / `0`). |
| `total` | `number` | Servidor | `subtotal + taxAmount` | Total de la línea. |

### Campos Generados por el Servidor (`QuoteRecord`)

- `id` (`string` / UUID, prefijo frontend `quote_<ts>`), `folio` (`COT-YYYY-NNN`), `date`, `expiryDate`, `subtotal`, `taxTotal`, `total`, `convertedToOrderId` (`string | null`), `createdAt`, `updatedAt`.

---

## 3. Endpoints REST

| Método | Ruta | Descripción | RBAC |
|---|---|---|---|
| `GET` | `/api/v1/sales/quotes` | Lista filtrable por `search`, `status`, `clientId`, `sortBy` (`folio` \| `total` \| `date`) | `Ventas.Cotizaciones` (`read`) |
| `GET` | `/api/v1/sales/quotes/:id` | Detalle completo de cotización y partidas | `Ventas.Cotizaciones` (`read`) |
| `POST` | `/api/v1/sales/quotes` | Alta de cotización (`Borrador` o `Enviada`) | `Ventas.Cotizaciones` (`write`) |
| `PATCH` | `/api/v1/sales/quotes/:id` | Edición de partidas, vigencia o términos | `Ventas.Cotizaciones` (`write`) |
| `PATCH` | `/api/v1/sales/quotes/:id/status` | Cambio de estado (`Borrador`, `Enviada`, `Aprobada`, `Rechazada`, `Vencida`) | `Ventas.Cotizaciones` (`write`) |
| `POST` | `/api/v1/sales/quotes/:id/duplicate` | Duplica cotización con nuevo folio en estado `'Borrador'` | `Ventas.Cotizaciones` (`write`) |
| `POST` | `/api/v1/sales/quotes/:id/convert-to-order` | Convierte a pedido (`PED-YYYY-NNN`), marca la cotización como `'Aprobada'` y asigna `convertedToOrderId` | `Ventas.Cotizaciones` (`write`) + `issueOrders` |
| `DELETE` | `/api/v1/sales/quotes/:id` | Eliminación de cotización (si no tiene pedido convertido o según política) | `Ventas.Cotizaciones` (`full`) |

---

## 4. Reglas de Negocio y Conversión a Pedido

1. **Partidas Mínimas:** No se permite guardar una cotización sin al menos 1 partida (`422 Unprocessable Entity`).
2. **Conversión Transaccional (`convert-to-order`):**
   - Rechazar con `409 Conflict` si `convertedToOrderId` ya está poblado o si el estado es `'Rechazada'` / `'Vencida'`.
   - Crea un `SalesOrder` en estado `'Confirmado'` copiando cliente, partidas, montos y divisa, con `deliveryDate = today + 7 días`, `quoteId` y `quoteFolio`.
   - Actualiza la cotización a `status = 'Aprobada'` y `convertedToOrderId = order.id`.
   - Emite registro en `audit_logs` (`category: 'sales'`, `'Generación de pedido de venta'`).
