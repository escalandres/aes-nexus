# Finanzas · Pagos / Cuentas por Pagar (`BillPayable`)

Especificación funcional, modelo de datos y reglas de liquidación para la entidad **Cuentas por Pagar (CxP)** (`/api/v1/finance/payables`).

---

## 1. Descripción Funcional

Gestiona las obligaciones de pago contraídas con proveedores del CRM (`crm_vendors`), facturas generadas desde **Compras → Órdenes de Compra / Facturas**, y provisiones fiscales derivadas del timbrado/pago de **Nómina** (retenciones ISR e IMSS por enterar). Permite pagar facturas de forma individual contra cuentas bancarias con saldo suficiente o agrupar múltiples facturas pendientes para dispersión electrónica masiva (**Pagos Bancarios / EBP**).

---

## 2. Campos Obligatorios vs. Opcionales (`CreatePayableDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `supplierCompany` | `string` (max 180) | **Sí** | — | Razón social del proveedor o autoridad fiscal acreedora. |
| `subtotal` | `number` (`>= 0`) | **Sí** | — | Importe neto antes de IVA. |
| `purchaseOrderFolio` | `string \| null` (max 40) | No | `OC-YYYY-NNN` | Folio de la orden de compra, factura externa o corrida de nómina origen. |
| `supplierContact` | `string` (max 180) | No | Correo del proveedor | Correo o nombre del contacto de cobranza del proveedor. |
| `dueDate` | `string` (max 40) | No | `+15 días` | Fecha límite de pago. |
| `currency` | `enum` | No | Moneda organización (`'MXN'`) | `'MXN'` \| `'USD'`. |
| `paymentMethod` | `string` (max 80) | No | Método default país | Ej. `'Transferencia SPEI'`. |

### DTO de Pago Individual (`PayBillDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción |
|---|---|---|---|---|
| `amount` | `number` (`> 0`) | **Sí** | — | Monto a liquidar (`<= bill.balance` y `<= bankAccount.balance`). |
| `bankAccountId` | `string` (max 64) | **Sí** | — | ID de la cuenta bancaria origen del cargo (`fin_bank_accounts.id`). |
| `method` | `string` (max 80) | No | Método default país | Medio de pago utilizado. |
| `reference` | `string` (max 120) | No | Auto-generado | Folio de rastreo SPEI o comprobante bancario. |

### Campos Generados por el Servidor (`BillPayableRecord`)

- `id` (`cxp_<ts>`), `folio` (`CXP-YYYY-NNN`), `issueDate`, `dueDate`, `tax` (`subtotal * vatRate`), `total` (`subtotal + tax`), `paidAmount` (`0` inicial), `balance` (`total - paidAmount`), `status` (`'Pendiente' | 'Parcial' | 'Pagada' | 'Vencida'`), `createdAt`, `updatedAt`.

---

## 3. Endpoints REST

| Método | Ruta | Descripción | RBAC |
|---|---|---|---|
| `GET` | `/api/v1/finance/payables` | Lista CxP filtrables por `status`, `search` (folio, proveedor, contacto, OC), `overdueOnly` | `Finanzas.Pagos` (`read`) |
| `GET` | `/api/v1/finance/payables/:id` | Detalle de factura CxP | `Finanzas.Pagos` (`read`) |
| `POST` | `/api/v1/finance/payables` | Registra nueva factura CxP (`CXP-YYYY-NNN`) | `Finanzas.Pagos` (`write`) + `schedulePayments` |
| `POST` | `/api/v1/finance/payables/:id/pay` | Aplica pago total o parcial descontando de cuenta bancaria y generando transacción | `Finanzas.Pagos` (`write`) + `schedulePayments` |
| `DELETE` | `/api/v1/finance/payables/:id` | Elimina registro de CxP | `Finanzas.Pagos` (`full`) |

---

## 4. Reglas de Negocio y Transacciones

1. **Validación de Saldo de Bill y Fondos Bancarios (`POST /pay`):**
   - Rechaza con `422` si `amount <= 0` o `amount > bill.balance`.
   - Bloquea (`SELECT ... FOR UPDATE`) la cuenta bancaria origen y verifica `bankAccount.balance >= amount`; si no hay fondos suficientes, rechaza con `409 Conflict`.
2. **Actualización Atómica de Tesorería:**
   - Deduce `fin_bank_accounts.balance -= amount`.
   - Actualiza `bill.paidAmount += amount`, `bill.balance = max(0, bill.total - newPaidAmount)` y `bill.status = newBalance === 0 ? 'Pagada' : 'Parcial'`.
   - Inserta en `fin_payment_transactions` con `type: 'Pago a proveedor'`, `reference: '<ref> · Pago <folio>'`.
3. **Selección Múltiple hacia Lote Bancario (EBP):** El usuario puede seleccionar múltiples facturas con `balance > 0` y enviarlas al asistente de dispersión EBP (`POST /api/v1/finance/ebp/batches`) en modo `individual` (una línea por factura) o `consolidated` (agrupado por proveedor con desglose en `billAllocations[]`).
4. **Provisiones de Retenciones de Nómina:** Al dispersar una corrida de nómina (`payroll_runs`), si existen retenciones ISR/IMSS (`> 0`), el sistema genera automáticamente un registro `BillPayable` a nombre de la autoridad fiscal correspondiente con vencimiento día 17 del mes siguiente.
5. **Auditoría:** Registro de alta, pago y eliminación emiten evento en `audit_logs` (`category: 'finance'`).
