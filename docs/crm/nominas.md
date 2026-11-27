# CRM · Nómina (`Payroll Runs & Receipts`)

Especificación funcional, modelo de datos, cálculo automático y reglas de integración financiera/EBP para el submódulo **Nómina** (`/api/v1/crm/payroll-runs`), basada en `src/data/payroll.ts`, `src/components/CrmPayroll.tsx` y `src/App.tsx`.

---

## 1. Descripción Funcional

Gestiona las corridas o periodos de nómina (`PayrollRunRecord`) y sus recibos individuales por colaborador (`PayrollReceiptLine`). Calcula automáticamente percepciones prorrateadas por días trabajados, bonos, retenciones fiscales/seguridad social localizadas (`ISR/IMSS` en MX, `IRPF/Seg. Social` en ES, `ISLR/IVSS` en VE) y se integra con **Finanzas** (egreso de tesorería / saldo bancario) y **EBP** (generación de lotes de dispersión bancaria).

---

## 2. Campos Obligatorios vs. Opcionales (`CreatePayrollRunDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `periodLabel` | `string` (max 150) | **Sí** | — | Etiqueta descriptiva (ej. `"2da Quincena Noviembre 2026"`). |
| `frequency` | `enum` | **Sí** | `'Quincenal'` | `'Quincenal'` \| `'Semanal'` \| `'Mensual'` \| `'Extraordinaria'`. |
| `startDate` | `string` (`YYYY-MM-DD`) | **Sí** | — | Fecha inicial del periodo. |
| `endDate` | `string` (`YYYY-MM-DD`) | **Sí** | — | Fecha final del periodo (`endDate >= startDate`). |
| `paymentDate` | `string` (`YYYY-MM-DD`) | **Sí** | `endDate` | Fecha programada o efectiva de pago. |
| `receipts` | `PayrollReceiptInput[]` | **Sí** (`minItems: 1`) | — | Recibos de colaboradores incluidos en el periodo. |
| `status` | `enum` | No | `'Borrador'` | `'Borrador'` \| `'Aprobada'` \| `'Pagada'`. |
| `bankAccountId` | `string` | No | Primera cuenta org. | FK a la cuenta bancaria de la empresa desde la cual se dispersa. |
| `paymentMethod` | `string` (max 160) | No (derivado) | — | Etiqueta de método y cuenta (ej. `"Transferencia SPEI · BBVA México **** 4920"`). |
| `applyAutomaticTaxes` | `boolean` | No | `true` | Si el backend calcula ISR/IMSS (o equivalente país) automáticamente. |
| `notes` | `string` (max 2000) | No | `null` | Notas u observaciones del periodo. |

### Sub-entidad `PayrollReceiptLine` (`crm_payroll_receipts`)

| Campo | Tipo | Obligatorio | Default | Descripción |
|---|---|---|---|---|
| `id` | `string` | Generado | UUID | Identificador del recibo. |
| `employeeId` | `string` | **Sí** | — | FK a `crm_employees(id)`. |
| `employeeCode` | `string` | Proyectado | — | Código del empleado al momento de la corrida (`EMP-001`). |
| `employeeName` | `string` | Proyectado | — | Nombre completo snapshot. |
| `roleTitle` | `string` | Proyectado | — | Puesto snapshot. |
| `departmentName` | `string` | Proyectado | — | Departamento snapshot. |
| `bankName` | `string` | Proyectado | `null` | Banco destino del empleado. |
| `clabe` | `string` | Proyectado | `null` | Cuenta/CLABE/IBAN destino snapshot. |
| `daysWorked` | `integer` (`0..31`) | **Sí** | `periodDays` | Días laborados calculados del rango (`7` Semanal, `15` Quincenal, `30` Mensual). |
| `baseGross` | `number` (`>= 0`) | Calculado | — | `round((baseSalaryMonthly / 30) * daysWorked)`. |
| `bonuses` | `number` (`>= 0`) | No | `0` | Percepciones adicionales / bonos. |
| `isrDeduction` | `number` (`>= 0`) | Calculado | `0` | Retención de impuesto sobre la renta según tabla progresiva. |
| `imssDeduction` | `number` (`>= 0`) | Calculado | `0` | Cuota seguridad social (`0` si `contractType === 'Honorarios'`). |
| `otherDeductions` | `number` (`>= 0`) | No | `0` | Otras deducciones manuales (préstamos, faltas, etc.). |
| `netPay` | `number` (`>= 0`) | Calculado | — | `max(0, baseGross + bonuses - isrDeduction - imssDeduction - otherDeductions)`. |

### Totales Calculados en Servidor (`PayrollRunRecord`)

- `id` (`uuid` / `pay_*`), `folio` (`NOM-YYYY-{Q|S|M|EXT}##`), `employeesCount`, `totalGross`, `totalBonuses`, `totalDeductions`, `totalNet`, `createdAt`, `updatedAt`.

---

## 3. Endpoints REST

| Método | Ruta | Descripción | RBAC |
|---|---|---|---|
| `GET` | `/api/v1/crm/payroll-runs` | Lista filtrable por `search`, `frequency`, `status` + KPIs (`totalPaidAmount`, `pendingRunsCount`) | `CRM.Nómina` (`read`) |
| `GET` | `/api/v1/crm/payroll-runs/:id` | Detalle de corrida con todos sus `receipts[]` | `CRM.Nómina` (`read`) |
| `POST` | `/api/v1/crm/payroll-runs/preview` | Simula cálculo automático sin persistir (`automatePayrollCalculation`) | `CRM.Nómina` (`read`) |
| `POST` | `/api/v1/crm/payroll-runs` | Crea corrida (y si `status === 'Pagada'`, impacta Finanzas) | `CRM.Nómina` (`write`) |
| `PATCH` | `/api/v1/crm/payroll-runs/:id` | Edita corrida en estado `Borrador` o `Aprobada` | `CRM.Nómina` (`write`) |
| `POST` | `/api/v1/crm/payroll-runs/:id/pay` | Marca como `Pagada`, actualiza `paymentDate` y registra egreso en Finanzas | `CRM.Nómina` (`write`) + `schedulePayments` |
| `DELETE` | `/api/v1/crm/payroll-runs/:id` | Elimina corrida (solo si no está `Pagada` o sin lote EBP aplicado) | `CRM.Nómina` (`full`) |

---

## 4. Integración Cross-Módulo (Finanzas y EBP)

1. **Impacto en Tesorería (`settlePayrollInFinance`):** Cuando una corrida pasa a estado `Pagada` (ya sea al crearse, editarse o mediante `POST /:id/pay` o al aplicar un lote EBP en banco), el backend debe descontar `totalNet` de la cuenta bancaria `bankAccountId` (validando saldo suficiente) y registrar el movimiento/póliza de egreso en Finanzas/Gastos.
2. **Dispersión EBP:** Una corrida aprobada o en borrador puede enviarse al asistente EBP (`batchType: 'Nómina'`), tomando `bankName`, `clabe` y `bankPackValues` de cada `EmployeeRecord`.
3. **Auditoría:** Registrar bajo categoría `finance`: `crm.payroll_run.created`, `crm.payroll_run.updated`, `crm.payroll_run.paid` y `crm.payroll_run.deleted`.
