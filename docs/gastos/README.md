# Documentación Backend · Módulo Gastos (`/docs/gastos`)

Especificación técnica y esquemas de datos para la implementación del módulo **Control de Gastos y Pólizas** de **AES Nexus** en el backend (`/api/v1/expenses/*`).

## 1. Entidades y Recursos Documentados

| Entidad / Recurso | Endpoint REST | Especificación Markdown | Esquema JSON | Tabla(s) PostgreSQL |
|---|---|---|---|---|
| **Registro y Pólizas de Gasto** | `/api/v1/expenses/policies` | [`polizas-gastos.md`](./polizas-gastos.md) | [`polizas-gastos.schema.json`](./polizas-gastos.schema.json) | `fin_expenses` |
| **Presupuestos y Alertas** | `/api/v1/expenses/budgets` | [`presupuestos-alertas.md`](./presupuestos-alertas.md) | [`presupuestos-alertas.schema.json`](./presupuestos-alertas.schema.json) | `fin_expense_budgets` |
| **Gastos Recurrentes** | `/api/v1/expenses/recurring` | [`gastos-recurrentes.md`](./gastos-recurrentes.md) | [`gastos-recurrentes.schema.json`](./gastos-recurrentes.schema.json) | `fin_recurring_expenses` |
| **Resumen y Control de Gastos** | `/api/v1/expenses/summary` | Ver sección 5 abajo | N/A (agregado de solo lectura) | Vista agregada (`fin_expenses`, `fin_expense_budgets`, `fin_recurring_expenses`, `admin_departments`) |

---

## 2. Convenciones Transversales del Módulo

- **Multi-Tenancy (H1):** Toda petición requiere `X-Organization-Id` validado contra el JWT de sesión. Todas las tablas incluyen `organization_id UUID NOT NULL` con `UNIQUE (organization_id, folio)` para pólizas.
- **Encabezados estándar:**
  - `Content-Type: application/json`
  - `Accept: application/json`
  - `X-Organization-Id: <organization_id>`
  - `X-Client-App: aes-nexus-frontend`
- **Folios Secuenciales Atómicos:**
  - Pólizas de gasto: `GST-YYYY-NNN` (y `GAS-YYYY-NNN` cuando deriva de nómina).
  - Transacciones bancarias al pagar: `PAG-YYYY-NNN`.
- **Taxonomía Contable de 5 Naturalezas y 8 Rubros:**
  - `Administrativo` → `Arrendamiento`, `Nómina y honorarios`, `Software y herramientas` (`6001-001` default).
  - `Operativo` → `Servicios`, `Logística y fletes`, `Viáticos y representación` (`6003-001` default).
  - `Costo de venta` → `Logística y fletes`, `Servicios`, `Nómina y honorarios` (`5001-001` default).
  - `Financiero` → `Comisiones e intereses` (`7001-001` default).
  - `Impuestos` → `Impuestos y derechos` (`2005-001` default).
- **Auditoría:** Altas, ediciones, cambios de estado (`Pendiente → Aprobado → Pagado / Cancelado`), cambios de presupuestos, generaciones recurrentes y exportaciones CSV escriben evento en `audit_logs` (`category: 'finance'`).

---

## 3. Matriz de Permisos RBAC (`src/data/accessControl.ts`)

| Sección Gastos | Capabilities Requeridas | Niveles HTTP (`read` / `write` / `full`) |
|---|---|---|
| `Gastos.Resumen y control` | `expenseControl`, `balanceReports`, `fullReports` | `read` / `write` / `full`: `GET /api/v1/expenses/summary` |
| `Gastos.Registro y pólizas` | `expenseControl` | `read`: `GET` · `write`: `GET, POST, PATCH, transitions` · `full`: `+ DELETE` |
| `Gastos.Presupuestos y alertas` | `expenseControl`, `balanceReports` | `read`: `GET` · `write`: `GET, POST, PUT matrix/thresholds` · `full`: `+ DELETE` |
| `Gastos.Gastos recurrentes` | `expenseControl` | `read`: `GET` · `write`: `GET, POST, PATCH, generate` · `full`: `+ DELETE` |

---

## 4. Diagrama de Flujo Operativo

```
fin_recurring_expenses (Mensual | Quincenal | Anual)
        │  POST /generate o /generate-batch
        ▼
  fin_expenses (GST-YYYY-NNN) ──> Evalúa fin_expense_budgets (Alertas 80% / 95% / 100%)
        │  Status: Pendiente -> Aprobado -> Pagado
        ├──> Si Pagado: Verifica saldo -> Debita fin_bank_accounts
        │               + Registra fin_payment_transactions (PAG-YYYY-NNN)
        └──> Alimenta Reportes -> Estado de Resultados (P&L) y Costos por Sucursal/Depto
```

---

## 5. Endpoint de Resumen (`GET /api/v1/expenses/summary`)

Devuelve indicadores ejecutivos consolidados para `Resumen y control`:
- Totales del periodo activo excluyendo pólizas con `status === 'Cancelado'` (`subtotal`, `tax`, `total`, `verifiedFiscalCount` donde `referenceDoc` e `issuerRfc` están presentes).
- Distribución por `expenseNature`, `costBehavior` (`Fijo` vs `Variable`), `departmentName` / `costCenter` y `locationName`.
- Estado de semáforo por cada regla activa en `fin_expense_budgets` (`spent`, `limit`, `consumedPct`, `alertLevel: 'ok' | 'warning' | 'critical' | 'exceeded'`).
- Compromiso mensual proyectado de `fin_recurring_expenses` activas y conteo de plantillas vencidas por generar (`nextRunDate <= today`).
