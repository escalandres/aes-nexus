# Reportes · Estado de Resultados (P&L) y Centros de Costo (`/docs/reportes/estado-resultados.md`)

Especificación técnica para el motor analítico de **Estado de Resultados (`IncomeStatementReport`)**, análisis **Costo-Volumen-Utilidad (Punto de Equilibrio)**, tendencia mensual a 12 meses y desglose por **Sucursales y Departamentos** en el backend de **AES Nexus**.

- **Endpoint principal:** `GET /api/v1/reports/income-statement`
- **Exportación PDF corporativa:** `POST /api/v1/reports/income-statement/export?format=pdf`
- **Exportación CSV:** `POST /api/v1/reports/income-statement/export?format=csv`
- **Esquema JSON:** [`estado-resultados.schema.json`](./estado-resultados.schema.json)
- **Fuente en Frontend:** `src/components/IncomeStatementReport.tsx` (`ComputedIncomeStatement`, `PnlLineItemRow`, `MonthlyMarginTrendPoint`, `CostCenterBranchRow`, `CostCenterDepartmentRow`) y `src/utils/incomeStatementPdf.ts`

---

## 1. Reglas de Negocio y Modos de Fuente (`sourceMode`)

El motor soporta dos modos contables seleccionables por el usuario:

| `sourceMode` | Descripción | Fuentes Primarias |
|---|---|---|
| `'consolidated'` | **Vista Operativa Consolidada (default):** Combina órdenes de venta/facturas CxC, costos de mercancía vendida (COGS), pólizas de gasto (`fin_expenses`), corridas de nómina (`crm_payroll_runs`) y cuentas contables de ajuste. Evita doble contabilización de gastos espejo (`MIRRORED_OPEX_ACCOUNT_BASE` / `MIRRORED_FINEX_ACCOUNT_BASE`). | `fin_receivables`, `sal_orders`, `fin_expenses`, `crm_payroll_runs`, `pur_orders`, `fin_chart_accounts` |
| `'accounting'` | **Vista Balanza Contable:** Deriva ingresos, costos, gastos operativos, financieros y otros ingresos directamente de los saldos acumulados del catálogo de cuentas (`fin_chart_accounts` tipos `Ingreso`, `Costo`, `Gasto`). | `fin_chart_accounts` |

### Parámetros de Entrada Específicos (`Query Params`)
Además del contrato global `ReportFilterState` (`searchQuery`, `datePreset`, `dateFrom`, `dateTo`, `locationId`, `departmentId`, `statusFilter`, `currencyFilter`, `compareYoY`), este endpoint recibe:
- `sourceMode`: `'consolidated' | 'accounting'` (default `'consolidated'`)
- `taxRate`: `number` decimal entre `0` y `0.60` (tasa efectiva ISR corporativa, default `0.30` = 30%).

---

## 2. Fórmulas y Reglas de Cálculo

1. **Cascada Principal del P&L:**
   - `grossProfit = totalRevenue - cogs`
   - `grossMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0`
   - `opAndAdminExpenses = adminExpenses + operatingExpenses + payrollAndChartOpEx`
   - `operatingIncome (EBIT) = grossProfit - opAndAdminExpenses`
   - `operatingMarginPct = totalRevenue > 0 ? (operatingIncome / totalRevenue) * 100 : 0`
   - `ebt = operatingIncome - financialExpenses + otherIncome`
   - `taxes = ebt > 0 ? ebt * taxRate : 0` (más impuestos directos capturados cuando aplica)
   - `netIncome = ebt - taxes`
   - `netMarginPct = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0`
2. **Análisis de Punto de Equilibrio (CVU):**
   - `variableCosts`: suma de `cogs` + gastos con `costBehavior === 'Variable'`.
   - `fixedCosts`: gastos con `costBehavior === 'Fijo'` + nómina fija + gastos administrativos/financieros fijos.
   - `contributionMargin = totalRevenue - variableCosts`
   - `contributionMarginRatioPct = totalRevenue > 0 ? (contributionMargin / totalRevenue) * 100 : 0`
   - `breakEvenSales = contributionMarginRatioPct > 0 ? fixedCosts / (contributionMarginRatioPct / 100) : 0`
   - `safetyMarginAmount = totalRevenue - breakEvenSales`
   - `safetyMarginPct = totalRevenue > 0 ? (safetyMarginAmount / totalRevenue) * 100 : 0`
   - `coverageRatioPct = breakEvenSales > 0 ? (totalRevenue / breakEvenSales) * 100 : 0`
3. **Desglose por Centro de Costo (Sucursal y Departamento):**
   - `branchBreakdown: CostCenterBranchRow[]`: agrupa ingresos, costos fijos, costos variables, nómina, EBIT, punto de equilibrio local y cobertura (`coveragePct`) por `admin_locations`.
   - `departmentBreakdown: CostCenterDepartmentRow[]`: agrupa gastos fijos, variables, nómina, costo total, participación (`sharePct`) y ventas de soporte requeridas (`breakEvenSupportSales`) por `admin_departments`.

---

## 3. Estructura de Datos (`ComputedIncomeStatement`)

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `sourceMode` | `'consolidated' \| 'accounting'` | Sí | Modo de extracción financiera |
| `taxRate` | `number` | Sí | Tasa impositiva aplicada (`0`–`0.6`) |
| `totalRevenue` | `number` | Sí | Ingresos netos del periodo |
| `cogs` | `number` | Sí | Costo de ventas |
| `grossProfit` | `number` | Sí | Utilidad bruta |
| `grossMarginPct` | `number` | Sí | Margen bruto (%) |
| `adminExpenses` | `number` | Sí | Gastos administrativos |
| `operatingExpenses` | `number` | Sí | Gastos operativos |
| `payrollAndChartOpEx` | `number` | Sí | Nómina y cuentas contables OpEx |
| `opAndAdminExpenses` | `number` | Sí | Total OpEx + Administración |
| `operatingIncome` | `number` | Sí | Utilidad de operación (EBIT) |
| `operatingMarginPct` | `number` | Sí | Margen operativo (%) |
| `financialExpenses` | `number` | Sí | Gastos financieros (intereses/comisiones) |
| `otherIncome` | `number` | Sí | Otros ingresos / productos |
| `ebt` | `number` | Sí | Utilidad antes de impuestos |
| `taxes` | `number` | Sí | ISR / Impuestos calculados |
| `netIncome` | `number` | Sí | Utilidad neta del ejercicio |
| `netMarginPct` | `number` | Sí | Margen neto (%) |
| `variableCosts` | `number` | Sí | Costos variables totales |
| `fixedCosts` | `number` | Sí | Costos fijos totales |
| `contributionMargin` | `number` | Sí | Margen de contribución ($) |
| `contributionMarginRatioPct` | `number` | Sí | Razón de margen de contribución (%) |
| `breakEvenSales` | `number` | Sí | Ventas en punto de equilibrio |
| `safetyMarginAmount` | `number` | Sí | Margen de seguridad ($) |
| `safetyMarginPct` | `number` | Sí | Margen de seguridad (%) |
| `coverageRatioPct` | `number` | Sí | Porcentaje de cobertura sobre equilibrio |
| `lines` | `PnlLineItemRow[]` | Sí | Filas estructuradas de la tabla P&L con comparativo YoY |
| `waterfallData` | `Array<{ name, value, fill }>` | Sí | Serie para gráfica de cascada |
| `breakEvenCurveData` | `Array<{ volumeLabel, sales, totalCosts, fixedCosts }>` | Sí | Serie para curva CVU |
| `monthlyMarginTrend` | `MonthlyMarginTrendPoint[]` | Sí | Tendencia mensual (12 meses) con ingresos, costos y márgenes |
| `accountBreakdown` | `object` | Sí | Cuentas agrupadas (`revenueAccounts`, `cogsAccounts`, `opExAccounts`, `finExAccounts`, `otherIncomeAccounts`) |
| `companyExpenseBreakdown` | `object` | Sí | Conteos y totales por naturaleza + `fixedTotal` / `variableTotal` |
| `branchBreakdown` | `CostCenterBranchRow[]` | Opcional | Desglose por ubicación física / sucursal |
| `departmentBreakdown` | `CostCenterDepartmentRow[]` | Opcional | Desglose por departamento y centro de costos |

---

## 4. Consideraciones de Seguridad y Auditoría

- **Restricción RBAC:** Requiere al menos uno de `fullReports` o `balanceReports` y nivel mínimo `view` en `Reportes.Estado de Resultados`.
- **Auditoría:** La exportación a PDF o CSV registra entrada en `audit_logs` indicando `sourceMode`, `currencyFilter`, `datePreset` y `taxRate`.
