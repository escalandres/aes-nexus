# Gastos · Gastos Recurrentes (`RecurringExpenseTemplate`)

Especificación funcional y reglas de programación automática para **Plantillas de Gastos Recurrentes** (`/api/v1/expenses/recurring`).

---

## 1. Descripción Funcional

Automatiza la generación periódica de pólizas de gasto fijas o programadas (rentas, servicios públicos, licencias SaaS, intereses bancarios) con periodicidad `Mensual`, `Quincenal` o `Anual`. Las pólizas generadas nacen en estado `'Pendiente'` vinculadas vía `recurrenceId` para trazabilidad y cálculo de compromiso mensual.

---

## 2. Campos Obligatorios vs. Opcionales (`CreateRecurringExpenseDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `title` | `string` (max 150) | **Sí** | — | Título corto de la plantilla recurrente. |
| `nature` | `enum` (`ExpenseNature`) | **Sí** | `'Administrativo'` | Naturaleza contable heredada a cada póliza generada. |
| `category` | `enum` (`ExpenseCategory`) | **Sí** | `'Arrendamiento'` | Rubro de gasto. |
| `costBehavior` | `enum` | No | `'Fijo'` | `'Fijo'` \| `'Variable'`. |
| `beneficiary` | `string` (max 180) | **Sí** | — | Beneficiario / proveedor recurrente. |
| `description` | `string` (max 500) | No | Igual a `title` | Descripción heredada a la póliza generada. |
| `amount` | `number` (`> 0`) | **Sí** | — | Importe base antes de impuestos. |
| `hasTax` | `boolean` | No | `true` | Si `true`, aplica la tasa estándar de IVA país al generar la póliza. |
| `paymentMethod` | `string` (max 80) | No | `'Transferencia SPEI'` | Forma de pago sugerida. |
| `bankAccountId` | `string` (max 64) | **Sí** | Cuenta operativa | Cuenta bancaria asociada. |
| `departmentName` | `string` (max 120) | **Sí** | Dept activo | Departamento asignado (y su `costCenter`). |
| `locationId` | `string \| null` (max 64) | No | Matriz | Sucursal / ubicación física (`admin_locations.id`). |
| `accountCode` | `string \| null` (max 16) | No | Default naturaleza | Cuenta contable (`fin_chart_accounts.code`). |
| `frequency` | `enum` | **Sí** | `'Mensual'` | `'Mensual'` \| `'Quincenal'` \| `'Anual'`. |
| `nextRunDate` | `string` (`YYYY-MM-DD`) | **Sí** | Fecha actual | Próxima fecha programada de ejecución. |
| `active` | `boolean` | No | `true` | Si la plantilla está activa o pausada. |

---

## 3. Endpoints REST

| Método | Ruta | Descripción | RBAC |
|---|---|---|---|
| `GET` | `/api/v1/expenses/recurring` | Lista plantillas filtrables por `active` y calcula `dueNowTemplates` (`nextRunDate <= today`) y compromiso mensual | `Gastos.Gastos recurrentes` (`read`) |
| `POST` | `/api/v1/expenses/recurring` | Crea plantilla recurrente | `Gastos.Gastos recurrentes` (`write`) |
| `PATCH` | `/api/v1/expenses/recurring/:id` | Actualiza parámetros, importe o frecuencia | `Gastos.Gastos recurrentes` (`write`) |
| `PATCH` | `/api/v1/expenses/recurring/:id/toggle` | Pausa o reactiva plantilla | `Gastos.Gastos recurrentes` (`write`) |
| `POST` | `/api/v1/expenses/recurring/:id/generate` | Genera inmediatamente una póliza `'Pendiente'` (`GST-YYYY-NNN`) y avanza `nextRunDate` | `Gastos.Gastos recurrentes` (`write`) |
| `POST` | `/api/v1/expenses/recurring/generate-batch` | Genera en lote todas las plantillas vencidas seleccionadas (`templateIds[]`) | `Gastos.Gastos recurrentes` (`write`) |
| `DELETE` | `/api/v1/expenses/recurring/:id` | Elimina plantilla recurrente (conserva pólizas históricas ya generadas) | `Gastos.Gastos recurrentes` (`full`) |

---

## 4. Reglas de Negocio

1. **Cálculo de Próxima Fecha (`nextRunDate`):**
   - `Quincenal`: `+15 días`
   - `Mensual`: `+1 mes`
   - `Anual`: `+1 año`
   Actualiza `lastGeneratedDate = executionIso` y `nextRunDate = nextIso` en la misma transacción que inserta la póliza.
2. **Compromiso Mensual Equivalente:** `Quincenal` multiplica por `2`, `Mensual` por `1`, `Anual` por `1/12` sobre `amount * (hasTax ? 1 + vatRate : 1)`.
3. **Auditoría:** Cada ejecución individual o por lote emite evento en `audit_logs` (`category: 'finance'`).
