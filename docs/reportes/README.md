# Documentación Backend · Módulo Reportes (`/docs/reportes`)

Especificación técnica y esquemas de datos para la implementación del módulo **Reportes y Analítica Ejecutiva** de **AES Nexus** en el backend (`/api/v1/reports/*`).

## 1. Entidades y Recursos Documentados

| Entidad / Recurso | Endpoint REST | Especificación Markdown | Esquema JSON | Fuente(s) PostgreSQL |
|---|---|---|---|---|
| **Estado de Resultados (P&L) & Centros de Costo** | `/api/v1/reports/income-statement` | [`estado-resultados.md`](./estado-resultados.md) | [`estado-resultados.schema.json`](./estado-resultados.schema.json) | Vista analítica (`fin_receivables`, `fin_expenses`, `fin_chart_accounts`, `sal_orders`, `pur_orders`, `crm_payroll_runs`, `admin_locations`, `admin_departments`) |
| **Alertas de Margen (EBIT / Neto)** | `/api/v1/reports/margin-alerts` | [`alertas-margen.md`](./alertas-margen.md) | [`alertas-margen.schema.json`](./alertas-margen.schema.json) | `rpt_margin_alert_settings` |
| **Resumen Ejecutivo** | `/api/v1/reports/executive-summary` | Ver sección 5 abajo | Ref. `ReportFilterState` | Agregado transversal multi-módulo |
| **Finanzas y Tesorería** | `/api/v1/reports/finance-treasury` | Ver sección 5 abajo | Ref. `ReportFilterState` | `fin_bank_accounts`, `fin_payment_transactions`, `fin_expenses`, `fin_chart_accounts` |
| **CxP y Pagos EBP** | `/api/v1/reports/payables-ebp` | Ver sección 5 abajo | Ref. `ReportFilterState` | `fin_payables`, `fin_ebp_batches`, `crm_suppliers`, `crm_supplier_bank_accounts` |
| **Ventas y CxC** | `/api/v1/reports/sales-receivables` | Ver sección 5 abajo | Ref. `ReportFilterState` | `sal_quotes`, `sal_orders`, `fin_receivables`, `crm_clients` |
| **Compras e Inventario** | `/api/v1/reports/purchases-inventory` | Ver sección 5 abajo | Ref. `ReportFilterState` | `pur_requisitions`, `pur_orders`, `ops_inventory`, `ops_stock_movements`, `ops_warehouses` |
| **Nómina y RRHH** | `/api/v1/reports/payroll-hr` | Ver sección 5 abajo | Ref. `ReportFilterState` | `crm_employees`, `crm_payroll_runs`, `admin_departments`, `admin_locations` |
| **Exportación CSV / PDF** | `/api/v1/reports/:tab/export` | Ver sección 6 abajo | N/A | Auditoría en `audit_logs` (`category: 'finance' | 'settings'`) |

---

## 2. Convenciones Transversales del Módulo

- **Multi-Tenancy (H1):** Todas las consultas filtran obligatoriamente por `organization_id` resuelto desde el header `X-Organization-Id` validado contra el JWT de sesión.
- **Encabezados estándar:**
  - `Content-Type: application/json`
  - `Accept: application/json`
  - `X-Organization-Id: <organization_id>`
  - `X-Client-App: aes-nexus-frontend`
- **Contrato de Filtros Compartido (`ReportFilterState`):**
  Todos los endpoints de reporte aceptan los siguientes query params:
  - `searchQuery` (`string`, búsqueda textual libre)
  - `datePreset` (`'all' | 'this_month' | 'last_30' | 'this_quarter' | 'ytd' | 'custom'`, default `'all'`)
  - `dateFrom` / `dateTo` (`string` ISO `YYYY-MM-DD`, requeridos cuando `datePreset === 'custom'`)
  - `locationId` (`string`, `'all'` o ID de `admin_locations`)
  - `departmentId` (`string`, `'all'` o ID de `admin_departments`)
  - `statusFilter` (`'Todos' | 'Pendiente' | 'Liquidado' | 'Alerta'`, default `'Todos'`)
  - `currencyFilter` (`'Todas' | 'MXN' | 'USD'`, default `'Todas'`)
  - `compareYoY` (`boolean`, default `true` — calcula serie comparativa del ejercicio anterior)
- **Conversión Multimoneda:** Cuando `currencyFilter === 'Todas'` o una moneda de reporte difiere de la moneda de origen de un documento (`MXN` ↔ `USD`), el backend convierte los importes usando el tipo de cambio vigente configurado en `currencyService` y expone la tasa aplicada en metadatos.

---

## 3. Matriz de Permisos RBAC (`src/data/accessControl.ts`)

Cada una de las 7 pestañas del módulo `Reportes` posee compuerta de acceso independiente:

| Pestaña (`ReportsSectionTab`) | Capabilities Requeridas (al menos una) | Niveles HTTP (`read` / `write` / `full`) |
|---|---|---|
| `Reportes.Resumen ejecutivo` | `fullReports`, `balanceReports`, `pipelineReports` | `read`+: `GET /api/v1/reports/executive-summary` + `POST /export` |
| `Reportes.Estado de Resultados` | `fullReports`, `balanceReports` | `read`: `GET` · `write`: `+ PUT /margin-alerts` · `full`: `+ reset` |
| `Reportes.Finanzas y Tesorería` | `balanceReports`, `fullReports` | `read`+: `GET /api/v1/reports/finance-treasury` + `POST /export` |
| `Reportes.CxP y Pagos EBP` | `schedulePayments`, `balanceReports`, `fullReports` | `read`+: `GET /api/v1/reports/payables-ebp` + `POST /export` |
| `Reportes.Ventas y CxC` | `pipelineReports`, `manageReceivables`, `fullReports` | `read`+: `GET /api/v1/reports/sales-receivables` + `POST /export` |
| `Reportes.Compras e Inventario` | `inventoryControl`, `approvePurchases`, `fullReports` | `read`+: `GET /api/v1/reports/purchases-inventory` + `POST /export` |
| `Reportes.Nómina y RRHH` | `manageUsers`, `schedulePayments`, `fullReports` | `read`+: `GET /api/v1/reports/payroll-hr` + `POST /export` |

---

## 4. Diagrama de Flujo Analítico

```
Módulos Transaccionales (Ventas, CxC, CxP, Gastos, Compras, Operaciones, Nómina)
        │  Filtros ReportFilterState (Fechas, Sucursal, Depto, Moneda, YoY)
        ▼
  Motor de Agregación /api/v1/reports/*
        ├──> Estado de Resultados (P&L): Consolidated vs Accounting + Punto Equilibrio
        │       └──> Evalúa MarginAlertSettings (EBIT / Neto) -> Notificaciones / Toast
        ├──> 6 Pestañas Analíticas Especializadas (Tesorería, EBP, Ventas, Inventario, RRHH)
        └──> Exportación Auditada: CSV (UTF-8 BOM) y PDF Corporativo (P&L) -> audit_logs
```

---

## 5. Contratos de Lectura por Pestaña Analítica

1. **`GET /api/v1/reports/executive-summary`**:
   - KPIs consolidados: ingresos facturados/órdenes, cuentas por cobrar abiertas, cuentas por pagar vigentes, liquidez bancaria total, valor de inventario y nómina ejecutada.
   - Series temporales mensuales (ingresos vs egresos vs flujo neto) con comparativa YoY opcional.
2. **`GET /api/v1/reports/finance-treasury`**:
   - Saldos por cuenta bancaria (`fin_bank_accounts`), flujo neto de cobros vs pagos (`fin_payment_transactions`), desglose de gastos por naturaleza (`fin_expenses`) y saldos por tipo de cuenta contable (`fin_chart_accounts`).
3. **`GET /api/v1/reports/payables-ebp`**:
   - Antigüedad de saldos CxP (`fin_payables`), volumen dispersado en lotes EBP (`fin_ebp_batches`), estatus de validación CLABE/cuentas bancarias por proveedor (`crm_supplier_bank_accounts`).
4. **`GET /api/v1/reports/sales-receivables`**:
   - Embudo cotizado vs pedido firme (`sal_quotes`, `sal_orders`), tasa de conversión, cobranza vencida vs al corriente (`fin_receivables`), top clientes.
5. **`GET /api/v1/reports/purchases-inventory`**:
   - Requisiciones y órdenes de compra (`pur_requisitions`, `pur_orders`), valorización de inventario por almacén (`ops_inventory`, `ops_warehouses`), SKUs bajo umbral mínimo y rotación de movimientos (`ops_stock_movements`).
6. **`GET /api/v1/reports/payroll-hr`**:
   - Plantilla activa por departamento y sede (`crm_employees`), costo acumulado de nóminas timbradas/aplicadas (`crm_payroll_runs`), desglose percepciones, retenciones ISR/IMSS y neto pagado.

---

## 6. Exportación Auditada (CSV y PDF)

- **CSV con BOM UTF-8 (`POST /api/v1/reports/:tab/export?format=csv`):** Todas las 7 pestañas generan CSV con encabezado BOM (`\uFEFF`) compatible con Microsoft Excel, respetando los filtros activos (`ReportFilterState`).
- **PDF Corporativo P&L (`POST /api/v1/reports/income-statement/export?format=pdf`):** Utiliza la instantánea de marca corporativa de la organización (`OrganizationSettings`: `legalName`, `rfc`, `logoDataUrl`, `avatarColor`) e incluye resumen ejecutivo P&L, cascada de resultados, análisis de punto de equilibrio y comparativo YoY.
- **Bitácora de Auditoría:** Toda exportación registra en `audit_logs` el nombre del reporte, cantidad de filas (`rowCount`), usuario actor y filtros aplicados.
