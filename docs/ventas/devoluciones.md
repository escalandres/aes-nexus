# Ventas · Devoluciones de Clientes (`CustomerReturns` / RMA)

Especificación funcional, modelo de datos, máquina de estados y reglas de validación para la entidad **Devoluciones de Clientes** (`/api/v1/sales/returns`).

---

## 1. Descripción Funcional

Gestiona solicitudes de devolución de mercancía (RMA) vinculadas a un Pedido de Venta (o registradas de forma directa), gobernadas dinámicamente por la configuración definida en **Administración → Flujos de devoluciones** (`admin_return_workflows.customer`). Automatiza el reingreso a inventario/Kardex al recibir mercancía y la emisión de notas de crédito (`NC-CLI-YYYY-NNN`) sobre Cuentas por Cobrar.

---

## 2. Campos Obligatorios vs. Opcionales (`CreateCustomerReturnDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `clientCompany` | `string` (max 180) | **Sí** | — | Razón social del cliente que solicita la devolución. |
| `warehouseId` | `string` (max 64) | **Sí** | — | ID del almacén receptor (`ops_warehouses`). |
| `reason` | `enum` (`ReturnReason`) | **Sí** | `'Defecto de fábrica'` | `'Defecto de fábrica'`, `'Daño en tránsito'`, `'Error en surtido'`, `'No cumple especificaciones'`, `'Excedente / cambio comercial'`, `'Garantía'`. |
| `resolution` | `enum` (`CustomerReturnResolution`) | **Sí** | `'Nota de crédito (CxC)'` | `'Nota de crédito (CxC)'` \| `'Reembolso'` \| `'Reposición sin costo'`. |
| `items` | `ReturnLineItemInput[]` | **Sí** | — | Líneas devueltas (`minItems: 1`), cada una con `quantity > 0`, `condition` y `disposition`. |
| `orderId` | `string` (max 64) | No | `null` | ID del pedido origen (`sales_orders`). |
| `orderFolio` | `string` (max 40) | No | `'DIRECTA'` | Folio del pedido origen o `'DIRECTA'`. |
| `invoiceId` / `invoiceFolio` | `string` | No | Del pedido | Factura CxC vinculada para acreditar saldo automáticamente al emitir nota de crédito. |
| `clientName` | `string` (max 150) | No | `clientCompany` | Nombre del contacto del cliente. |
| `currency` | `enum` | No | `'MXN'` | `'MXN'` \| `'USD'` (heredada del pedido si existe). |
| `notes` | `string` (max 2000) | Condicional* | `null` | *Obligatoria al crear si el paso inicial del flujo configurado tiene `requireNotesOnEntry === true`.* |

### Sub-entidad `ReturnLineItem`

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `sku`, `name`, `unitOfMeasure` | `string` | **Sí** | Datos del producto devuelto. |
| `quantity` | `number` (`> 0`) | **Sí** | Cantidad devuelta. |
| `unitAmount` | `number` (`>= 0`) | **Sí** | Precio unitario de referencia. |
| `taxRate` | `enum` | **Sí** | `'16%'` \| `'8%'` \| `'0%'` \| `'Exento'`. |
| `condition` | `enum` | **Sí** | `'Sellado / intacto'` \| `'Empaque abierto'` \| `'Dañado / defectuoso'`. |
| `disposition` | `enum` | **Sí** | `'Reingreso a almacén'` \| `'Cuarentena / revisión'` \| `'Merma / baja definitiva'` \| `'Reposición con proveedor'`. |
| `subtotal`, `taxAmount`, `total` | `number` | Servidor | Calculados en servidor por línea. |

### Campos Gestionados por el Servidor (`CustomerReturnRecord`)

- `id` (`rma_cli_<ts>`), `folio` (`DEV-CLI-YYYY-NNN`), `date`, `warehouseName`, `status` (resuelto desde `admin_return_workflows.customer.initialStatus`).
- `subtotal`, `taxTotal`, `total`, `inventoryApplied` (`boolean`), `financeApplied` (`boolean`), `creditNoteFolio` (`NC-CLI-YYYY-NNN` cuando aplica).
- Gobernanza de aprobaciones: `approvalStatus` (`'not_required' | 'pending' | 'approved' | 'rejected'`), `pendingTargetStatus`, `approvalRequestedBy`, `approvalRequestedAtIso`, `approvedBy`, `approvedAtIso`, `rejectionReason`, `workflowHistory[]`.
- `createdBy`, `updatedAtIso`.

---

## 3. Endpoints REST

| Método | Ruta | Descripción | RBAC |
|---|---|---|---|
| `GET` | `/api/v1/sales/returns` | Lista filtrable por `search`, `status`, `warehouseId` | `Ventas.Devoluciones` (`read`) |
| `GET` | `/api/v1/sales/returns/:id` | Expediente RMA completo con `workflowHistory` | `Ventas.Devoluciones` (`read`) |
| `POST` | `/api/v1/sales/returns` | Crea RMA asignando `initialStatus` vigente y aplicando stock si dicho estado es `'Recibida en almacén'` | `Ventas.Devoluciones` (`write`) |
| `PATCH` | `/api/v1/sales/returns/:id/notes` | Agrega notas al expediente (bloqueado en estados finales) | `Ventas.Devoluciones` (`write`) |
| `POST` | `/api/v1/sales/returns/:id/transition` | Avanza estado (`nextStatus`, `note?`); si requiere aprobación según umbral, pasa a `approvalStatus = 'pending'` | `Ventas.Devoluciones` (`write`) |
| `POST` | `/api/v1/sales/returns/:id/approve` | Aprueba la transición pendiente si el rol cumple `approverRole` | `Ventas.Devoluciones` (`write`) + rol aprobador |
| `POST` | `/api/v1/sales/returns/:id/reject-approval` | Rechaza transición pendiente registrando `rejectionReason` | `Ventas.Devoluciones` (`write`) + rol aprobador |
| `DELETE` | `/api/v1/sales/returns/:id` | Elimina RMA (`409` si está en estado final o tiene `inventoryApplied`/`financeApplied` con protección activa) | `Ventas.Devoluciones` (`full`) |

---

## 4. Efectos Transaccionales y Validaciones del Flujo

1. **Validación de Transición:** Rechazar con `422` si el estado actual tiene `isFinalState === true` o si `nextStatus` no está en `allowedNextStatuses`. Si `requireNotesOnEntry === true` en `nextStatus`, exigir `note` no vacía.
2. **Aprobación por Umbral:** Si `stepRule.requiresApproval === true` y `return.total >= stepRule.approvalThresholdAmount`, la transición queda en cola (`approvalStatus: 'pending'`, `pendingTargetStatus: nextStatus`) hasta que un aprobador autorizado llame `/approve`.
3. **Impacto en Inventario (`Recibida en almacén`):** Si `!inventoryApplied`, suma `quantity` al almacén `warehouseId` en `ops_inventory` únicamente para líneas con `disposition === 'Reingreso a almacén'`, inserta movimientos `'Entrada'` (`MOV-DEV-NNN`) en `ops_stock_movements` y marca `inventoryApplied = true`.
4. **Impacto Financiero (`Nota de crédito emitida`):** Si `!financeApplied`, asigna `creditNoteFolio = 'NC-CLI-YYYY-NNN'`, descuenta `total` de `ar_invoices.balance` (`Math.max(0, balance - total)`), actualiza el estado de la factura (`'Pagada'` si saldo 0, `'Parcial'` si abonado parcial) y marca `financeApplied = true`. Emite registro en `audit_logs` (`category: 'finance'`).
