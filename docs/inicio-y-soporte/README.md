# Documentación Backend · Inicio (Dashboard Ejecutivo) y Centro de Ayuda (`/docs/inicio-y-soporte`)

Especificación técnica para los módulos transversales de **Inicio (`ExecutiveDashboard`)** y **Centro de Ayuda (`HelpCenterSection` / Soporte y Tickets)** de **AES Nexus** (`/api/v1/dashboard/*` y `/api/v1/help-center/*`).

## 1. Recursos Documentados

| Módulo / Recurso | Endpoint REST | Especificación Markdown | Esquema JSON | Fuente(s) PostgreSQL |
|---|---|---|---|---|
| **Dashboard Ejecutivo (`Inicio`)** | `GET /api/v1/dashboard/executive` | Ver sección 2 abajo | Agregado de solo lectura | Vista transversal (`sal_orders`, `sal_quotes`, `crm_opportunities`, `ops_inventory`, `ops_shipments`, `pur_orders`, `pur_requisitions`, `fin_receivables`, `fin_payables`, `fin_expenses`, `fin_bank_accounts`, `cfg_category_stock_thresholds`) |
| **Base de Conocimiento (`Centro de ayuda`)** | `GET /api/v1/help-center/knowledge-base` | Ver sección 3 abajo | Catálogo estático / CMS | `help_guides`, `help_faqs`, `help_glossary` |
| **Soporte y Tickets** | `/api/v1/help-center/tickets` | [`soporte-tickets.md`](./soporte-tickets.md) | [`soporte-tickets.schema.json`](./soporte-tickets.schema.json) | `sup_tickets`, `sup_ticket_notes` |

---

## 2. Dashboard Ejecutivo (`GET /api/v1/dashboard/executive`)

Pantalla de inicio consolidada (solo lectura para KPIs; permite disparo rápido a módulos autorizados y ajuste inline de umbrales si el usuario posee permiso):

- **Encabezados estándar:** `X-Organization-Id` obligatorio, `Accept: application/json`.
- **Query Params soportados:**
  - `purchasesPeriod`: `'Mensual' | 'Trimestral' | 'Anual'` (agrupa métricas de compras del periodo).
- **Bloques devueltos en la respuesta:**
  1. **KPIs Comerciales y Pipeline:** Ingresos del periodo, pedidos en curso (`sal_orders`), cotizaciones abiertas (`sal_quotes`), oportunidades activas (`crm_opportunities`) y gráfica meta vs real (`RevenueTargetChart`).
  2. **Alert Hub de Inventario y Operaciones:** Evalúa cada SKU en `ops_inventory` aplicando `resolveEffectiveStockThreshold` (reglas `cfg_category_stock_thresholds` + mínimo SKU), devolviendo conteo de SKUs críticos/bajo umbral, entregas pendientes (`ops_shipments`) y órdenes de compra por recibir (`pur_orders`).
  3. **Resumen Financiero y Tesorería:** Saldo consolidado de `fin_bank_accounts`, cuentas por cobrar (`fin_receivables`, vencidas vs vigentes), cuentas por pagar (`fin_payables`) y gastos del periodo (`fin_expenses`).
  4. **Seguridad RBAC en Respuesta:** El backend debe omitir o devolver en `null` las tarjetas/bloques cuyos módulos el usuario autenticado no tiene autorizados en su rol (`canAccessModule` / `canAccessSection`).

---

## 3. Centro de Ayuda (`GET /api/v1/help-center/knowledge-base`)

Sirve las 4 pestañas informativas de `HELP_CENTER_TABS` (`Guías por módulo`, `Flujos del sistema`, `Preguntas frecuentes`, `Glosario y referencia`) consumidas por `HelpCenterSection.tsx`:

- `categories`: 7 `HelpCategory[]` temáticas (`getting-started`, `crm-payroll`, `sales-rma`, `purchases-ops`, `finance-ebp`, `expenses-budgets`, `admin-rbac`).
- `guides`: `HelpModuleGuide[]` con pasos accionables y `relatedTarget` hacia secciones del ERP.
- `workflows`: `HelpWorkflowBlueprint[]` con flujos end-to-end (ej. Cotización → Pedido → Entrega → CxC).
- `faqs`: `HelpFaqItem[]` con filtrado por `visualCategory`, `complexity` y búsqueda por `tags`.
- `glossary`: `HelpGlossaryItem[]` con `domain` (`Fiscal y CFDI`, `Bancario y EBP`, `Finanzas y P&L`, `Operaciones y RBAC`) y `formulaOrRule`.
