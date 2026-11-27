# Backend · Modelo Físico de Base de Datos y DDL Maestro (`/docs/backend/modelo-base-datos-ddl.md`)

Guía arquitectónica del esquema relacional unificado en **PostgreSQL 16+** ([`schema-maestro.sql`](./schema-maestro.sql)), cubriendo los 11 prefijos de dominio de **AES Nexus**.

---

## 1. Convenciones Obligatorias en Todas las Tablas de Negocio

1. **Clave Primaria:** `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`.
2. **Aislamiento Multi-Tenant (H1):** `organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE RESTRICT`.
3. **Integración Externa Universal:** Todas las tablas maestras y transaccionales incluyen:
   - `external_id VARCHAR(120) NULL`
   - `external_source VARCHAR(80) NULL`
   - `external_synced_at TIMESTAMPTZ NULL`
   - Índice único parcial por tenant: `UNIQUE (organization_id, external_source, external_id) WHERE external_id IS NOT NULL AND deleted_at IS NULL`.
4. **Trazabilidad Temporal y Soft Delete:** `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `deleted_at TIMESTAMPTZ NULL`.
5. **Secuencias Atómicas de Folios:** Tabla `sys_folio_sequences (organization_id, prefix, fiscal_year, current_value)` con `INSERT ... ON CONFLICT DO UPDATE SET current_value = current_value + 1 RETURNING current_value` para garantizar folios sin colisiones bajo concurrencia (`COT-`, `PED-`, `FAC-`, `OC-`, `REC-`, `GST-`, `PAG-`, `EBP-`, `TKT-`, etc.).

---

## 2. Mapa de Tablas por Dominio (`schema-maestro.sql`)

| Prefijo | Dominio | Tablas Principales |
|---|---|---|
| `core_*` / `sys_*` | Fundación y Tenancy | `core_organizations`, `core_users`, `core_organization_memberships`, `core_invitations`, `sys_folio_sequences`, `sys_idempotency_keys`, `obj_attachments` |
| `int_*` | Integraciones | `int_external_id_mappings` |
| `admin_*` | Administración | `admin_subsidiaries`, `admin_departments`, `admin_locations`, `admin_return_workflows`, `audit_logs` |
| `crm_*` | CRM y RRHH | `crm_clients`, `crm_suppliers`, `crm_supplier_bank_accounts`, `crm_employees`, `crm_payroll_runs`, `crm_opportunities`, `crm_activities` |
| `sal_*` | Ventas | `sal_catalog_items`, `sal_quotes`, `sal_orders`, `sal_invoices`, `sal_customer_returns` |
| `pur_*` | Compras | `pur_requisitions`, `pur_orders`, `pur_receptions`, `pur_supplier_returns` |
| `ops_*` | Operaciones | `ops_warehouses`, `ops_inventory`, `ops_stock_movements`, `ops_transfers`, `ops_shipments` |
| `fin_*` | Finanzas y Gastos | `fin_chart_accounts`, `fin_bank_accounts`, `fin_receivables`, `fin_payables`, `fin_payment_transactions`, `fin_ebp_batches`, `fin_expenses`, `fin_expense_budgets`, `fin_recurring_expenses`, `fin_fx_rates` |
| `rpt_*` | Reportes | `rpt_margin_alert_settings` |
| `cfg_*` | Configuración | `cfg_workspace_settings`, `cfg_organization_settings`, `cfg_security_settings`, `cfg_user_preferences`, `cfg_roles`, `cfg_workspace_users`, `cfg_category_stock_thresholds`, `cfg_native_integrations`, `cfg_commercial_integrations`, `cfg_external_integrations`, `cfg_integration_logs`, `cfg_plan_subscriptions`, `cfg_plan_invoices` |
| `sup_*` | Soporte | `sup_tickets`, `sup_ticket_notes` |

---

## 3. Reglas de Integridad Referencial Inter-Módulo

- **Terceros y Operaciones:** `sal_orders.client_id -> crm_clients(id)` (`ON DELETE RESTRICT`); `pur_orders.supplier_id -> crm_suppliers(id)` (`ON DELETE RESTRICT`).
- **Inventario Único por SKU + Almacén:** `ops_inventory` impone `UNIQUE (organization_id, product_id, warehouse_id) WHERE deleted_at IS NULL` y `CHECK (stock_quantity >= 0 AND reserved_quantity >= 0)`.
- **Kardex Inmutable:** `ops_stock_movements` y `audit_logs` son tablas **append-only** (sin `UPDATE`/`DELETE` en aplicación).
- **Row-Level Security (RLS):** El script incluye la plantilla de habilitación RLS mediante `current_setting('app.current_organization_id', true)::uuid`.
