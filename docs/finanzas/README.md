# Documentación Backend · Módulo Finanzas (`/docs/finanzas`)

Especificación técnica y esquemas de datos para la implementación del módulo **Finanzas y Tesorería** de **AES Nexus** en el backend (`/api/v1/finance/*`).

## 1. Entidades y Recursos Documentados

| Entidad / Recurso | Endpoint REST | Especificación Markdown | Esquema JSON | Tabla(s) PostgreSQL |
|---|---|---|---|---|
| **Cobros / Cuentas por Cobrar (CxC)** | `/api/v1/finance/receivables` | [`cobros.md`](./cobros.md) | [`cobros.schema.json`](./cobros.schema.json) | `ar_invoices`, `ar_invoice_items` |
| **Pagos / Cuentas por Pagar (CxP)** | `/api/v1/finance/payables` | [`pagos.md`](./pagos.md) | [`pagos.schema.json`](./pagos.schema.json) | `ap_bills` |
| **Tesorería (Bancos y Movimientos)** | `/api/v1/finance/bank-accounts` & `/transactions` | [`tesoreria.md`](./tesoreria.md) | [`tesoreria.schema.json`](./tesoreria.schema.json) | `fin_bank_accounts`, `fin_payment_transactions` |
| **Pagos Bancarios (EBP y Layouts)** | `/api/v1/finance/ebp/batches` & `/packs` | [`pagos-bancarios-ebp.md`](./pagos-bancarios-ebp.md) | [`pagos-bancarios-ebp.schema.json`](./pagos-bancarios-ebp.schema.json) | `ebp_format_packs`, `ebp_payment_batches`, `ebp_payment_batch_lines` |
| **Cuentas Contables (Catálogo)** | `/api/v1/finance/chart-accounts` | [`cuentas-contables.md`](./cuentas-contables.md) | [`cuentas-contables.schema.json`](./cuentas-contables.schema.json) | `fin_chart_accounts` |
| **Resumen y Simulador Financiero** | `/api/v1/finance/summary` | Ver sección 5 abajo | N/A (agregado / simulación de solo lectura) | Vista consolidada (`fin_bank_accounts`, `ar_invoices`, `ap_bills`, `fin_expenses`, `fin_chart_accounts`, `sales_orders`, `payroll_runs`) |

> **Nota sobre Gastos:** El sub-módulo **Gastos** (`ExpenseRecord`, `ExpenseBudgetRule`, `RecurringExpenseTemplate`) comparte modelo base en `src/data/finance.ts`, pero cuenta con su propia ruta y navegación independiente (`/docs/gastos/`).

---

## 2. Convenciones Transversales del Módulo

- **Multi-Tenancy (H1):** Toda petición requiere `X-Organization-Id` validado contra el JWT de sesión. Todas las tablas incluyen `organization_id UUID NOT NULL` con restricciones de unicidad por organización (`UNIQUE (organization_id, folio)` o `UNIQUE (organization_id, code)`).
- **Encabezados estándar:**
  - `Content-Type: application/json`
  - `Accept: application/json`
  - `X-Organization-Id: <organization_id>`
  - `X-Client-App: aes-nexus-frontend`
- **Folios Secuenciales Atómicos:**
  - Cuentas por cobrar (CxC): `FAC-YYYY-NNN`
  - Cuentas por pagar (CxP): `CXP-YYYY-NNN` (y retenciones de nómina `CXP-<AUTH>-<PERIODO>`)
  - Transacciones de tesorería: `PAG-YYYY-NNN` / `TXN-YYYY-NNN`
  - Lotes de dispersión bancaria EBP: `EBP-YYYY-NNNN`
- **Perfil Fiscal y Bancario por País (`countryProfile`):**
  - El cálculo de IVA por defecto (`16%`, `8%`, `0%`), método bancario default (`Transferencia SPEI`, etc.), validación de cuenta/routing (`CLABE` Mod-10 en MX o `countryProfile.bank.validateRouting`) y tasa corporativa base se obtienen del perfil país configurado en la organización.
- **Integridad Financiera Transaccional:**
  - Todo cobro o pago actualiza en una sola transacción ACID: (1) `paidAmount`, `balance` y `status` de la factura/bill, (2) `balance` de `fin_bank_accounts`, (3) inserción en `fin_payment_transactions`, y (4) actualización de cuentas contables relacionadas (`1002-*`, `2001-001`, `1005-001`, etc.) cuando aplica.
- **Auditoría:** Todas las operaciones (emisión, cobro, pago, aplicación de lote EBP, edición contable y eliminación) escriben un evento en `audit_logs` con `category: 'finance'`.

---

## 3. Matriz de Permisos RBAC (`src/data/accessControl.ts`)

| Sección Finanzas | Capabilities Requeridas | Niveles HTTP (`read` / `write` / `full`) |
|---|---|---|
| `Finanzas.Cobros` | `manageReceivables` | `read`: `GET` · `write`: `GET, POST, collect` · `full`: `+ DELETE` |
| `Finanzas.Pagos` | `schedulePayments` | `read`: `GET` · `write`: `GET, POST, pay, launch EBP` · `full`: `+ DELETE` |
| `Finanzas.Pagos Bancarios` | `schedulePayments` | `read`: `GET` · `write`: `GET, POST packs/batches, apply` · `full`: `+ DELETE batches` |
| `Finanzas.Cuentas contables` | `balanceReports` | `read`: `GET, export` · `write`: `GET, POST, PATCH` · `full`: `+ DELETE` |
| `Finanzas.Resumen` | `manageReceivables`, `schedulePayments`, `balanceReports`, `expenseControl` | `read` / `write` / `full`: `GET /api/v1/finance/summary` y simulador |

---

## 4. Diagrama de Integración Inter-Módulo

```
  Ventas (sales_orders / sales_invoices) ──────> ar_invoices (FAC-YYYY-NNN)
                                                       │ POST /collect
                                                       ▼
  CRM (crm_vendors + cuentas bancarias) ───┐    fin_bank_accounts (+= monto)
  Compras (purchase_orders / receptions) ──┼──> fin_payment_transactions (PAG/TXN)
  Nómina (payroll_runs / retenciones) ─────┘           ▲
         │                                             │ POST /pay o POST /ebp/batches/:id/apply
         ▼                                             │
     ap_bills (CXP-YYYY-NNN) ───────(wizard EBP)───────┘
                                                       │
                                                       ▼
                                            fin_chart_accounts (1002-*, 2001-001, 2005-001, 6002-001)
```

---

## 5. Endpoint de Resumen de Tesorería y Simulador (`GET /api/v1/finance/summary`)

Alimenta el panel superior de **Finanzas → Resumen** (`FinanceOverview.tsx`) y el **Simulador de Gastos y Flujo de Caja Operativo**:

### Parámetros de Consulta (`Query Params`)

| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| `reportingCurrency` | `'MXN' \| 'USD'` | `'MXN'` | Moneda de conversión para KPIs y simulador. |
| `salesVolumeDeltaPct` | `number` | `0` | Variación simulada sobre ingresos base (`-50` a `+100`). |
| `variableCogsDeltaPct` | `number` | `0` | Variación simulada sobre costo variable unitario. |
| `opexDeltaPct` | `number` | `0` | Variación simulada sobre gastos operativos y administrativos (OpEx). |
| `cashCollectionPct` | `number` (`0–100`) | `100` | Porcentaje de cobranza efectiva en caja del periodo simulado. |

### Estructura Calculada por el Servidor

1. **KPIs de Liquidez y Capital de Trabajo:**
   - `totalCash`: Suma de `fin_bank_accounts.balance` convertida a `reportingCurrency`.
   - `totalReceivable`: Suma de `ar_invoices.balance` convertida.
   - `totalPayable`: Suma de `ap_bills.balance` convertida.
   - `workingCapital`: `totalCash + totalReceivable - totalPayable`.
   - `bankAccounts[]` y `recentTransactions[]` (últimos movimientos de tesorería).
2. **Estado de Resultados Base (`baselinePnl`):**
   - Calculado de forma consolidada (`computeIncomeStatementData`) a partir de `fin_expenses` (excluyendo `'Cancelado'`), `fin_chart_accounts`, `ar_invoices`, `sales_orders`, `ops_inventory` y `payroll_runs`.
   - Expone `totalRevenue`, `cogs`, `grossProfit`, `grossMarginPct`, `opAndAdminExpenses`, `operatingIncome`, `operatingMarginPct`, `financialExpenses`, `otherIncome`, `taxes` (tasa base `30%`), `netIncome`, `netMarginPct`, `breakEvenSales`.
3. **Simulación No Mutante (`simulation`):**
   - `simRevenue = max(0, baseRevenue * (1 + salesVolumeDeltaPct / 100))`
   - `simCogs = max(0, baseCogs * (1 + salesVolumeDeltaPct / 100) * (1 + variableCogsDeltaPct / 100))`
   - `simOpex = max(0, baseOpex * (1 + opexDeltaPct / 100))`
   - `simCollectedCash = simRevenue * (cashCollectionPct / 100)`
   - `simCollectionHoldback = simRevenue - simCollectedCash`
   - `simOperatingCashFlow = simCollectedCash - simCogs - simOpex - simTaxes`
   - `projectedClosingCash = totalCash + simOperatingCashFlow`
   - `simBreakEvenSales = simContributionRatio > 0 ? (simOpex + baseFinancial) / simContributionRatio : 0`
   - `statusTone`: `'danger'` (`simOperatingCashFlow < 0 || simOperatingMarginPct < 0`), `'warning'` (`simOperatingMarginPct < 12 || simNetMarginPct < 6`), o `'healthy'`.
   - **Exportación CSV:** `GET /api/v1/finance/summary/export.csv` descarga el puente de resultados y flujo de caja proyectado (`proyeccion_flujo_caja_<currency>_<YYYY-MM-DD>.csv`) con BOM UTF-8.
