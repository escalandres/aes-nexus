# Ventas · Facturas de Venta (`InvoiceReceivable`)

Especificación funcional, modelo de datos y reglas de validación para la entidad **Facturas de Venta / Cuentas por Cobrar** (`/api/v1/sales/invoices`).

---

## 1. Descripción Funcional

Emite comprobantes fiscales de venta (`FAC-YYYY-NNN`) ya sea vinculados a un **Pedido de Venta** (`sourceMode = 'order'`, con facturación total restante, anticipo 50% o porcentaje personalizado) o mediante **Facturación Directa** (`sourceMode = 'direct'`). Cada factura generada crea automáticamente su cuenta por cobrar en **Finanzas → Cobros**, actualiza los vínculos del pedido origen y registra la póliza contable en el catálogo de cuentas.

---

## 2. Campos Obligatorios vs. Opcionales (`CreateSalesInvoiceDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `sourceMode` | `enum` | **Sí** | `'order'` | `'order'` (desde pedido) \| `'direct'` (facturación libre). |
| `orderId` / `orderFolio` | `string` | Condicional (`order`) | `null` / `'DIRECTA'` | Obligatorio cuando `sourceMode === 'order'`. El pedido no puede estar `'Cancelado'` y debe tener saldo por facturar `> 0.50`. |
| `billingMode` | `enum` | Condicional (`order`) | `'full_remaining'` | `'full_remaining'` \| `'advance_50'` \| `'custom_pct'`. Determina el porcentaje a facturar sobre el pedido. |
| `customPct` | `number` (`1..100`) | Condicional (`custom_pct`) | `100` | Porcentaje personalizado a facturar, acotado al remanente disponible del pedido. |
| `clientCompany` | `string` (max 180) | Condicional (`direct`) | Del pedido | Razón social del cliente (heredada del pedido si `sourceMode === 'order'`). |
| `clientName` | `string` (max 150) | No | Del cliente/pedido | Nombre del contacto receptor. |
| `items` | `SalesLineItemInput[]` | Condicional (`direct`) | Del pedido | Partidas obligatorias (`minItems: 1`) si `sourceMode === 'direct'`; en modo pedido se prorratean por `ratio`. |
| `clientRfc` | `string` (max 24) | No | `'XAXX010101000'` | Identificador fiscal normalizado a mayúsculas (`RFC`, `NIF/CIF`, `RIF`, `Tax ID`). Fallback al RFC del cliente en CRM o público en general. |
| `paymentTerms` | `enum` | No | `'Contado'` | `'Contado'`, `'Crédito 15 días'`, `'Crédito 30 días'`, `'Crédito 60 días'`. Calcula `dueDate` (`+0`, `+15`, `+30`, `+60` días). |
| `paymentMethod` | `string` (max 80) | No | Perfil país | Método de pago/transferencia (ej. `'Transferencia SPEI'`, `'Transferencia SEPA'`, `'Pago Móvil / Transferencia'`). |
| `cfdiUse` | `string` (max 120) | No | Perfil país | Uso fiscal del comprobante según país (`'G03 · Gastos en general'` en MX, `'01 · Operación de régimen general'` en ES, `'Contribuyente Ordinario IVA'` en VE, `'Operación comercial estándar'` en GLOBAL). |
| `currency` | `enum` | No | `'MXN'` | `'MXN'` \| `'USD'` (heredada del pedido o ficha del cliente). |
| `notes` | `string` (max 2000) | No | `null` | Observaciones comerciales o anotaciones fiscales. |

### Campos Generados y Calculados por el Servidor (`SalesInvoiceRecord`)

- `id` (`string` / UUID, prefijo frontend `cxc_<ts>`).
- `folio` (`string`, formato `FAC-YYYY-NNN`).
- `issueDate` (`string`), `dueDate` (`string`, derivada de `issueDate + getDaysFromTerms(paymentTerms)`).
- `subtotal`, `tax`, `total` (`number`, debe ser `> 0`), `paidAmount` (`0` al emitir), `balance` (`= total`), `status` (`'Pendiente'` al emitir; evoluciona a `'Parcial'`, `'Pagada'` o `'Vencida'` desde Finanzas CxC o Notas de Crédito).
- `billingPercentage` (`integer`, 1..100).
- `createdAt`, `updatedAt` (`date-time`).

---

## 3. Endpoints REST

| Método | Ruta | Descripción | RBAC |
|---|---|---|---|
| `GET` | `/api/v1/sales/invoices` | Lista filtrable por `search` (folio, pedido, cliente, `clientRfc`) y `status` (`Todas`, `Pendiente`, `Pagada`, `Parcial`, `Vencida`) | `Ventas.Facturas` (`read`) |
| `GET` | `/api/v1/sales/invoices/:id` | Detalle fiscal de factura, partidas y saldo pendiente | `Ventas.Facturas` (`read`) |
| `POST` | `/api/v1/sales/invoices` | Emite factura desde pedido o directa, actualiza pedido y póliza contable | `Ventas.Facturas` (`write`) |
| `DELETE` | `/api/v1/sales/invoices/:id` | Cancela/elimina factura (`409` si ya tiene cobros registrados en Finanzas) y limpia vínculos en pedido | `Ventas.Facturas` (`full`) |

---

## 4. Reglas de Negocio e Impacto Contable / Financiero

1. **Validación de Monto y Remanente:** Rechazar con `422` si `total <= 0` o si en modo `order` el monto excede el remanente por facturar del pedido.
2. **Actualización del Pedido Origen:** Al emitir desde pedido, el backend agrega `invoice.id` a `sales_orders.invoice_ids` y `invoice.folio` a `sales_orders.invoice_folios`. Al eliminar una factura, se remueven de dicho arreglo.
3. **Asiento Contable Automático (`finance_chart_accounts`):**
   - `1005-001` (Clientes / CxC): `+total`
   - `4001-001` (Ingresos por Ventas): `+subtotal`
   - `2005-001` (IVA Trasladado): `+tax`
4. **Auditoría:** Registra evento en `audit_logs` con `category: 'sales'`, `action: 'Creación de factura de venta'` (o `'Eliminación de factura de venta'`).
