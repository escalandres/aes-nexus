# Finanzas · Cobros / Cuentas por Cobrar (`InvoiceReceivable`)

Especificación funcional, modelo de datos y reglas de cobranza para la entidad **Cuentas por Cobrar (CxC)** (`/api/v1/finance/receivables`).

---

## 1. Descripción Funcional

Administra las facturas comerciales emitidas a clientes (`crm_clients`), ya sea generadas automáticamente desde **Ventas → Pedidos / Facturas** o emitidas manualmente desde **Finanzas → Cobros**. Permite consultar saldos insolutos, identificar vencimientos, registrar cobros parciales o totales contra una cuenta bancaria receptora y mantener sincronizadas las referencias en `sales_orders`.

---

## 2. Campos Obligatorios vs. Opcionales (`CreateReceivableDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `clientCompany` | `string` (max 180) | **Sí** | — | Razón social del cliente (`crm_clients`). |
| `subtotal` | `number` (`>= 0`) | **Sí** | — | Importe neto antes de impuestos (cuando no se envían `items[]`). |
| `orderId` | `string \| null` (max 64) | No | `null` | ID del pedido origen (`sales_orders.id`) cuando proviene de Ventas. |
| `orderFolio` | `string` (max 32) | No | `PED-YYYY-NNN` | Folio del pedido comercial vinculado. |
| `clientName` | `string` (max 150) | No | Del cliente | Contacto comercial del cliente. |
| `clientRfc` | `string` (max 24) | No | Del cliente / perfil país | Tax ID / RFC del receptor para facturación. |
| `paymentTerms` | `enum` | No | `'30 días'` | `'Contado'` (`+3 días`) \| `'15 días'` \| `'30 días'` — calcula `dueDate`. |
| `dueDate` | `string` (max 40) | No | Calculado | Fecha explícita de vencimiento (sobreescribe `paymentTerms` si se provee). |
| `currency` | `enum` | No | Moneda organización (`'MXN'`) | `'MXN'` \| `'USD'`. |
| `paymentMethod` | `string` (max 80) | No | Método default país | Ej. `'Transferencia SPEI'`, `'Tarjeta de crédito'`. |
| `cfdiUse` | `string` (max 80) | No | `null` | Uso fiscal de CFDI (ej. `'G03 - Gastos en general'`). |
| `billingPercentage` | `number` (`0–100`) | No | `100` | Porcentaje facturado del pedido (anticipos / parcialidades desde Ventas). |
| `notes` | `string \| null` (max 1000) | No | `null` | Observaciones de cobranza o referencia fiscal. |
| `items` | `SalesLineItem[]` | No | `null` | Partidas detalladas heredadas del pedido de ventas. |

### DTO de Registro de Cobro (`CollectReceivableDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción |
|---|---|---|---|---|
| `amount` | `number` (`> 0`) | **Sí** | — | Monto cobrado (`<= invoice.balance`). |
| `bankAccountId` | `string` (max 64) | **Sí** | — | ID de la cuenta bancaria receptora (`fin_bank_accounts.id`). |
| `method` | `string` (max 80) | No | Método default país | Instrumento de cobro (`Transferencia SPEI`, `Tarjeta de crédito`, `Efectivo`). |
| `reference` | `string` (max 120) | No | Auto-generado | Referencia bancaria o clave de rastreo SPEI / autorización TPV. |

### Campos Generados por el Servidor (`InvoiceReceivableRecord`)

- `id` (`cxc_<ts>`), `folio` (`FAC-YYYY-NNN`), `issueDate`, `dueDate`, `tax` (`subtotal * vatRate`), `total` (`subtotal + tax`), `paidAmount` (`0` inicial), `balance` (`total - paidAmount`), `status` (`'Pendiente' | 'Parcial' | 'Pagada' | 'Vencida'`), `createdAt`, `updatedAt`.

---

## 3. Endpoints REST

| Método | Ruta | Descripción | RBAC |
|---|---|---|---|
| `GET` | `/api/v1/finance/receivables` | Lista CxC filtrables por `status`, `search` (folio, cliente, RFC, pedido), `overdueOnly` | `Finanzas.Cobros` (`read`) |
| `GET` | `/api/v1/finance/receivables/:id` | Detalle de factura CxC, partidas y pagos aplicados | `Finanzas.Cobros` (`read`) |
| `POST` | `/api/v1/finance/receivables` | Emite una nueva factura CxC con folio `FAC-YYYY-NNN` | `Finanzas.Cobros` (`write`) + `manageReceivables` |
| `POST` | `/api/v1/finance/receivables/:id/collect` | Registra cobro total o parcial, abona cuenta bancaria y genera transacción `PAG-YYYY-NNN` | `Finanzas.Cobros` (`write`) + `manageReceivables` |
| `DELETE` | `/api/v1/finance/receivables/:id` | Elimina CxC y limpia referencias (`invoiceIds`, `invoiceFolios`) en `sales_orders` | `Finanzas.Cobros` (`full`) |

---

## 4. Reglas de Negocio y Transacciones

1. **Validación de Saldo en Cobro:** `collect.amount` debe ser `> 0` y `<= invoice.balance`. Si excede el saldo insoluto, rechaza con `422 Unprocessable Entity`.
2. **Transición Automática de Estado al Cobrar:**
   - `newPaidAmount = invoice.paidAmount + amount`
   - `newBalance = max(0, invoice.total - newPaidAmount)`
   - `status = newBalance === 0 ? 'Pagada' : 'Parcial'`.
3. **Impacto en Tesorería (`POST /collect`):**
   - Incrementa `fin_bank_accounts.balance += amount` en la cuenta seleccionada.
   - Inserta registro en `fin_payment_transactions` con `type: 'Cobro de cliente'`, `entityName: invoice.clientCompany`, `reference: '<ref> · Cobro <folio>'`.
4. **Limpieza Referencial en Eliminación (`DELETE`):** Desvincula `invoice.id` y `invoice.folio` de `sales_orders.invoiceIds` / `invoiceFolios` si existiera relación.
5. **Auditoría:** Emisión, cobro y eliminación emiten eventos en `audit_logs` (`category: 'finance'`).
