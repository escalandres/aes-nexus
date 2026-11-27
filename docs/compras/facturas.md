# Compras · Facturas de Proveedor (`BillPayable` / CxP)

Especificación funcional, modelo de datos y reglas contables para la entidad **Facturas de Proveedor / Cuentas por Pagar** (`/api/v1/purchases/invoices`).

---

## 1. Descripción Funcional

Registra facturas recibidas de proveedores (`CXP-YYYY-NNN`), ya sea vinculadas a una **Orden de Compra** existente o de forma directa sin OC previa. Cada factura registrada se sincroniza inmediatamente con **Finanzas → Cuentas por Pagar** (`ap_bills`), actualiza la póliza contable de pasivo e inventario en tránsito y permite seleccionar múltiples facturas pendientes para lanzar un lote de dispersión bancaria **EBP**.

---

## 2. Campos Obligatorios vs. Opcionales (`CreateSupplierBillDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `supplierCompany` | `string` (max 180) | **Sí** | — | Razón social del proveedor (`crm_vendors`). |
| `subtotal` | `number` (`> 0`) | **Sí** | — | Importe neto antes de impuestos. Debe ser mayor a cero. |
| `purchaseOrderFolio` | `string` (max 40) | No | `null` | Folio de la orden de compra relacionada (ej. `OC-2026-002`). |
| `supplierContact` | `string` (max 180) | No | Email proveedor | Correo de facturación o contacto del proveedor. |
| `dueDate` | `string` (max 40) | No | `+15 días` | Fecha límite de pago al proveedor. Si se omite, se calcula `issueDate + 15 días`. |
| `currency` | `enum` | No | `'MXN'` | `'MXN'` \| `'USD'`. |
| `paymentMethod` | `string` (max 80) | No | Perfil país | Método de pago configurado (ej. `'Transferencia SPEI'`, `'Transferencia SEPA'`). |

### Campos Generados y Calculados por el Servidor (`BillPayableRecord`)

- `id` (`cxp_<ts>`), `folio` (`CXP-YYYY-NNN`), `issueDate` (`string`).
- `tax` (`Math.round(subtotal * standardVatRate)` según perfil fiscal país, p. ej. `16%`), `total` (`subtotal + tax`).
- `paidAmount` (`0`), `balance` (`= total`), `status` (`'Pendiente'` al registrar; evoluciona a `'Parcial'`, `'Pagada'` o `'Vencida'` con abonos, lotes EBP o notas de crédito RTV).
- `createdAt`, `updatedAt` (`date-time`).

---

## 3. Endpoints REST

| Método | Ruta | Descripción | RBAC |
|---|---|---|---|
| `GET` | `/api/v1/purchases/invoices` | Lista filtrable por `search` (folio CxP, proveedor, OC) y `status` (`Pendiente`, `Parcial`, `Pagada`, `Vencida`) | `Compras.Facturas` (`read`) |
| `GET` | `/api/v1/purchases/invoices/:id` | Detalle de factura CxP, saldo pendiente e historial de pagos EBP | `Compras.Facturas` (`read`) |
| `POST` | `/api/v1/purchases/invoices` | Registra factura CxP, actualiza cuentas contables (`2001-001` y `1150-001`) y audita | `Compras.Facturas` (`write`) |
| `POST` | `/api/v1/purchases/invoices/ebp-batch-preview` | Prepara selección de facturas con `balance > 0` para el asistente de dispersión bancaria **EBP** | `Compras.Facturas` (`write`) + `schedulePayments` |
| `DELETE` | `/api/v1/purchases/invoices/:id` | Elimina factura CxP (`409` si ya tiene pagos o notas de crédito aplicadas) | `Compras.Facturas` (`full`) |

---

## 4. Reglas de Negocio e Impacto Contable

1. **Validación de Importe:** Rechazar con `422 Unprocessable Entity` si `subtotal <= 0`.
2. **Prevención de Duplicidad por OC:** Si se provee `purchaseOrderFolio` (o al generar desde OC), verificar que no exista ya otra factura activa ligada a la misma OC (`409 Conflict`).
3. **Asiento Contable Automático (`finance_chart_accounts`):**
   - `2001-001` (Proveedores / CxP): `+total`
   - `1150-001` (Almacén / Compras por recibir): `+subtotal`
4. **Auditoría:** Emite evento en `audit_logs` con `category: 'finance'`, `action: 'Factura de proveedor registrada (CxP)'` (o `'Eliminación de factura de proveedor (CxP)'`).
