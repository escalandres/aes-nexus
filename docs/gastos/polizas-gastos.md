# Gastos · Registro y Pólizas (`ExpenseRecord`)

Especificación funcional, modelo de datos y reglas de flujo contable para **Pólizas de Gasto** (`/api/v1/expenses/policies`).

---

## 1. Descripción Funcional

Administra cada erogación operativa, administrativa, financiera, fiscal o de costo de venta de la organización, vinculándola a su **naturaleza contable**, **rubro**, **comportamiento (`Fijo` / `Variable`)**, **sucursal (`admin_locations`)**, **departamento / centro de costos (`admin_departments`)**, **cuenta contable (`fin_chart_accounts`)** y **comprobante fiscal (`referenceDoc`, `issuerRfc`)**.

---

## 2. Campos Obligatorios vs. Opcionales (`CreateExpenseDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `beneficiary` | `string` (max 180) | **Sí** | — | Proveedor, acreedor o beneficiario del gasto. |
| `description` | `string` (max 500) | **Sí** | — | Concepto detallado de la póliza. |
| `amount` | `number` (`> 0`) | **Sí** | — | Importe base antes de impuestos. |
| `expenseNature` | `enum` (`ExpenseNature`) | **Sí** | `'Administrativo'` | `'Administrativo'` \| `'Operativo'` \| `'Financiero'` \| `'Costo de venta'` \| `'Impuestos'`. |
| `category` | `enum` (`ExpenseCategory`) | **Sí** | Según `expenseNature` | `'Arrendamiento'` \| `'Servicios'` \| `'Nómina y honorarios'` \| `'Logística y fletes'` \| `'Software y herramientas'` \| `'Impuestos y derechos'` \| `'Viáticos y representación'` \| `'Comisiones e intereses'`. |
| `date` | `string` (`YYYY-MM-DD` o ERP) | No | Fecha actual | Fecha contable del gasto. |
| `status` | `enum` (`ExpenseStatus`) | No | `'Pagado'` | `'Pendiente'` \| `'Aprobado'` \| `'Pagado'` \| `'Cancelado'`. |
| `costBehavior` | `enum` | No | `'Fijo'` / `'Variable'` | `'Fijo'` \| `'Variable'` (para punto de equilibrio en P&L). |
| `taxMode` | `enum` | No | `'16'` | `'16'` (tasa estándar país) \| `'0'` \| `'custom'` (requiere `customTaxAmount >= 0`). |
| `tax` | `number` (`>= 0`) | Condicional | Calculado | Impuesto explícito (calculado por servidor salvo `taxMode === 'custom'`). |
| `paymentMethod` | `string` (max 80) | **Sí** | `'Transferencia SPEI'` | Forma de pago (`Transferencia SPEI`, `Domiciliación bancaria`, `Tarjeta corporativa`, `Efectivo`). |
| `bankAccountId` | `string` (max 64) | Condicional | — | Requerido si `status === 'Pagado'` para descontar fondos de `fin_bank_accounts`. |
| `departmentId` / `departmentName` | `string` | No | Primer dept activo | Departamento responsable; hereda `costCenter`. |
| `locationId` | `string` | No | Sede matriz | Sucursal / ubicación física (`admin_locations.id`). |
| `accountCode` | `string` (max 16) | No | Default según naturaleza | Código en `fin_chart_accounts` (`6001-001`, `6003-001`, `5001-001`, `7001-001`, `2005-001`). |
| `referenceDoc` | `string \| null` (max 80) | No | `null` | Folio de factura CFDI, recibo o póliza externa. |
| `issuerRfc` | `string \| null` (max 24) | No | `null` | Tax ID / RFC del emisor (normalizado a mayúsculas). |

### Campos Generados por el Servidor (`ExpenseRecord`)

- `id` (`exp_<ts>`), `folio` (`GST-YYYY-NNN`), `companyCategory` (derivada con `mapExpenseNatureToCompanyCategory`), `total` (`amount + tax`), `costCenter`, `locationName`, `accountName`, `bankAccountName`, `user`, `isRecurring`, `recurrenceId`, `createdAt`, `updatedAt`.

---

## 3. Endpoints REST

| Método | Ruta | Descripción | RBAC |
|---|---|---|---|
| `GET` | `/api/v1/expenses/policies` | Lista pólizas filtrables por `nature`, `category`, `status`, `costBehavior`, `locationId`, `departmentName`, `paymentMethod`, `fiscalVerified`, `fromDate`, `toDate`, `search` | `Gastos.Registro y pólizas` (`read`) |
| `GET` | `/api/v1/expenses/policies/export.csv` | Exporta histórico filtrado a CSV con BOM UTF-8 y audita la descarga | `Gastos.Registro y pólizas` (`read`) |
| `POST` | `/api/v1/expenses/policies` | Crea póliza (`Pagado` verifica saldo bancario, debita cuenta y genera transacción `PAG`) | `Gastos.Registro y pólizas` (`write`) |
| `PATCH` | `/api/v1/expenses/policies/:id` | Edita clasificación contable, sucursal, departamento, cuenta contable, comprobante o descripción | `Gastos.Registro y pólizas` (`write`) |
| `POST` | `/api/v1/expenses/policies/:id/status` | Transiciona estado (`Pendiente ↔ Aprobado → Pagado / Cancelado`). Al pasar a `Pagado`, valida fondos y debita `bankAccountId` | `Gastos.Registro y pólizas` (`write`) |
| `DELETE` | `/api/v1/expenses/policies/:id` | Elimina póliza y registra evento en `audit_logs` | `Gastos.Registro y pólizas` (`full`) |

---

## 4. Reglas de Negocio y Alertas Presupuestales

1. **Validación de Fondos al Pagar:** Tanto en `POST /policies` con `status = 'Pagado'` como en `POST /policies/:id/status` hacia `'Pagado'`, el servidor verifica `bankAccount.balance >= total`. Si no alcanza, rechaza con `409 Conflict`.
2. **Evaluación Inmediata de Presupuesto Mensual:** Al registrar una póliza no cancelada, el backend suma el consumo acumulado del mes (`YYYY-MM`) de su `expenseNature` y lo compara contra la regla activa en `fin_expense_budgets`, retornando en la respuesta un bloque `budgetEvaluation`:
   - `>= 100%`: `exceeded`
   - `>= criticalThresholdPct` (default `95%`): `critical`
   - `>= warningThresholdPct` (default `80%`): `warning`
3. **Mapeo de Rubro Corporativo (`mapExpenseNatureToCompanyCategory`):**
   - `Financiero` → `'Gastos financieros'`
   - `Operativo` / `Costo de venta` → `'Gastos operativos'`
   - `Administrativo` / `Impuestos` → `'Gastos administrativos'`
