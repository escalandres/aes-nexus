# Compras · Devoluciones a Proveedor (`SupplierReturns` / RTV)

Especificación funcional, modelo de datos, máquina de estados y reglas de validación para la entidad **Devoluciones a Proveedor** (`/api/v1/purchases/returns`).

---

## 1. Descripción Funcional

Administra devoluciones de mercancía hacia proveedores (*Return to Vendor* - RTV) ligadas a una **Orden de Compra** (o registradas manualmente), gobernadas por la máquina de estados configurada en **Administración → Flujos de devoluciones** (`admin_return_workflows.supplier`). Automatiza la salida física en inventario/Kardex (`MOV-RTV-NNN`) al despachar al proveedor y la compensación de saldo (`NC-PRV-YYYY-NNN`) sobre Cuentas por Pagar (`ap_bills`).

---

## 2. Campos Obligatorios vs. Opcionales (`CreateSupplierReturnDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `supplierCompany` | `string` (max 180) | **Sí** | — | Razón social del proveedor receptor de la devolución. |
| `warehouseId` | `string` (max 64) | **Sí** | — | ID del almacén desde donde saldrá la mercancía (`ops_warehouses`). |
| `reason` | `enum` (`ReturnReason`) | **Sí** | `'Defecto de fábrica'` | `'Defecto de fábrica'`, `'Daño en tránsito'`, `'Error en surtido'`, `'No cumple especificaciones'`, `'Excedente / cambio comercial'`, `'Garantía'`. |
| `resolution` | `enum` (`SupplierReturnResolution`) | **Sí** | `'Nota de crédito (CxP)'` | `'Nota de crédito (CxP)'` \| `'Reposición de mercancía'` \| `'Reembolso proveedor'`. |
| `items` | `ReturnLineItemInput[]` | **Sí** | — | Líneas devueltas (`minItems: 1`) con `quantity > 0`, `unitAmount >= 0`, `condition` y `disposition`. |
| `purchaseOrderId` | `string` (max 64) | No | `null` | ID de la OC origen (`purchase_orders`). |
| `purchaseOrderFolio` | `string` (max 40) | No | `'DIRECTA'` | Folio de la OC origen o `'DIRECTA'`. |
| `billId` / `billFolio` | `string` | No | De la OC | Factura CxP (`ap_bills`) vinculada para compensar saldo al acreditarse. |
| `supplierContact` | `string` (max 150) | No | `supplierCompany` | Contacto comercial del proveedor. |
| `currency` | `enum` | No | `'MXN'` | `'MXN'` \| `'USD'` (heredada de la OC si existe). |
| `rmaSupplierCode` | `string` (max 80) | Condicional* | `null` | Código de autorización/RMA otorgado por el proveedor. *Obligatorio al crear/transicionar si el paso tiene `requireDocumentRefOnEntry === true`.* |
| `notes` | `string` (max 2000) | Condicional* | `null` | Observaciones. *Obligatorio si el paso inicial/destino tiene `requireNotesOnEntry === true`.* |

### Campos Gestionados por el Servidor (`SupplierReturnRecord`)

- `id` (`rtv_prv_<ts>`), `folio` (`DEV-PRV-YYYY-NNN`), `date`, `warehouseName`, `status` (resuelto desde `admin_return_workflows.supplier.initialStatus`).
- `subtotal`, `taxTotal`, `total`, `inventoryApplied` (`boolean`), `financeApplied` (`boolean`), `creditNoteFolio` (`NC-PRV-YYYY-NNN` al acreditar).
- Gobernanza de aprobaciones: `approvalStatus`, `pendingTargetStatus`, `approvalRequestedBy`, `approvalRequestedAtIso`, `approvedBy`, `approvedAtIso`, `rejectionReason`, `workflowHistory[]`.
- `createdBy`, `updatedAtIso`.

---

## 3. Endpoints REST

| Método | Ruta | Descripción | RBAC |
|---|---|---|---|
| `GET` | `/api/v1/purchases/returns` | Lista filtrable por `search` (folio, OC, CxP, `rmaSupplierCode`, proveedor, SKU), `status`, `warehouseId` | `Compras.Devoluciones` (`read`) |
| `GET` | `/api/v1/purchases/returns/:id` | Expediente RTV completo con `workflowHistory` | `Compras.Devoluciones` (`read`) |
| `POST` | `/api/v1/purchases/returns` | Registra RTV aplicando salida inicial si el `initialStatus` configurado es `'Enviada a proveedor'` | `Compras.Devoluciones` (`write`) |
| `PATCH` | `/api/v1/purchases/returns/:id/details` | Actualiza `notes` o `rmaSupplierCode` (bloqueado en estados finales) | `Compras.Devoluciones` (`write`) |
| `POST` | `/api/v1/purchases/returns/:id/transition` | Avanza estado (`nextStatus`, `note?`, `rmaSupplierCode?`); encola aprobación si aplica umbral | `Compras.Devoluciones` (`write`) |
| `POST` | `/api/v1/purchases/returns/:id/approve` | Aprueba la transición pendiente si el rol cumple `approverRole` | `Compras.Devoluciones` (`write`) + rol aprobador |
| `POST` | `/api/v1/purchases/returns/:id/reject-approval` | Rechaza transición pendiente registrando `rejectionReason` | `Compras.Devoluciones` (`write`) + rol aprobador |
| `DELETE` | `/api/v1/purchases/returns/:id` | Elimina RTV (`409` si está en estado final o tiene impacto en Kardex/CxP con bloqueo activo) | `Compras.Devoluciones` (`full`) |

---

## 4. Efectos Transaccionales y Validaciones del Flujo

1. **Validación de Requisitos por Etapa:**
   - Bloquear edición y transición si `isFinalState === true` en el estado actual.
   - Si el paso destino exige `requireNotesOnEntry === true`, requerir `note`.
   - Si el paso destino exige `requireDocumentRefOnEntry === true`, requerir `rmaSupplierCode` (ya capturado o enviado en la transición).
2. **Impacto en Inventario (`Enviada a proveedor`):** Si `!inventoryApplied`, descuenta `quantity` de `ops_inventory` en `warehouseId` (`max(0, stock - quantity)`), inserta movimiento `'Salida'` (`MOV-RTV-NNN`) en `ops_stock_movements` y marca `inventoryApplied = true`.
3. **Impacto en Cuentas por Pagar (`Acreditada / compensada`):** Si `!financeApplied`, genera `creditNoteFolio = 'NC-PRV-YYYY-NNN'`, descuenta `total` de `ap_bills.balance` (`Math.max(0, balance - total)`), recalcula estado (`'Pagada'` / `'Parcial'`) y marca `financeApplied = true`. Emite auditoría en categoría `'finance'`.
