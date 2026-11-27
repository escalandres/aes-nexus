-- ============================================================================
-- AES Nexus · DDL Maestro PostgreSQL 16+
-- Multi-tenancy (organization_id), Identificadores Externos (external_id /
-- external_source / external_synced_at + int_external_id_mappings) y RLS.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. CORE, TENANCY, FOLIOS E IDEMPOTENCIA
-- ----------------------------------------------------------------------------

CREATE TABLE core_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  plan_tier VARCHAR(24) NOT NULL DEFAULT 'Enterprise' CHECK (plan_tier IN ('Growth', 'Enterprise', 'Corporate')),
  reporting_currency VARCHAR(8) NOT NULL DEFAULT 'MXN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE core_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oidc_subject VARCHAR(180) NOT NULL UNIQUE,
  email VARCHAR(180) NOT NULL UNIQUE,
  full_name VARCHAR(160) NOT NULL,
  avatar_initials VARCHAR(4) NOT NULL,
  mfa_enrolled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE core_organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES core_users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  primary_role_id VARCHAR(80) NOT NULL,
  role_ids TEXT[] NOT NULL DEFAULT '{}',
  last_login_at TIMESTAMPTZ NULL,
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  UNIQUE (organization_id, user_id)
);

CREATE TABLE core_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE CASCADE,
  email VARCHAR(180) NOT NULL,
  role_ids TEXT[] NOT NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ NULL,
  created_by UUID NULL REFERENCES core_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sys_folio_sequences (
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE CASCADE,
  prefix VARCHAR(24) NOT NULL,
  fiscal_year INTEGER NOT NULL,
  current_value INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (organization_id, prefix, fiscal_year)
);

CREATE TABLE sys_idempotency_keys (
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE CASCADE,
  idempotency_key VARCHAR(120) NOT NULL,
  request_hash VARCHAR(64) NOT NULL,
  status_code INTEGER NOT NULL,
  response_body JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (organization_id, idempotency_key)
);

CREATE TABLE obj_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE CASCADE,
  entity_type VARCHAR(64) NOT NULL,
  entity_id UUID NOT NULL,
  storage_bucket VARCHAR(120) NOT NULL,
  storage_key VARCHAR(400) NOT NULL,
  file_name VARCHAR(240) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  sha256_checksum VARCHAR(64) NOT NULL,
  is_encrypted_secret BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NULL REFERENCES core_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. MAPEO MULTI-SISTEMA DE IDENTIFICADORES EXTERNOS
-- ----------------------------------------------------------------------------

CREATE TABLE int_external_id_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE CASCADE,
  entity_type VARCHAR(64) NOT NULL,
  entity_id UUID NOT NULL,
  external_system VARCHAR(80) NOT NULL,
  external_id VARCHAR(120) NOT NULL,
  external_url VARCHAR(500) NULL,
  sync_direction VARCHAR(20) NOT NULL DEFAULT 'bidirectional' CHECK (sync_direction IN ('inbound', 'outbound', 'bidirectional')),
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload_hash VARCHAR(64) NULL,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, external_system, entity_type, external_id),
  UNIQUE (organization_id, entity_type, entity_id, external_system)
);

CREATE INDEX idx_ext_map_entity ON int_external_id_mappings (organization_id, entity_type, entity_id);

-- ----------------------------------------------------------------------------
-- 3. ADMINISTRACIÓN Y AUDITORÍA
-- ----------------------------------------------------------------------------

CREATE TABLE admin_subsidiaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE RESTRICT,
  code VARCHAR(30) NOT NULL,
  legal_name VARCHAR(200) NOT NULL,
  trade_name VARCHAR(160) NOT NULL,
  tax_id VARCHAR(24) NOT NULL,
  country VARCHAR(80) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'MXN',
  status VARCHAR(20) NOT NULL DEFAULT 'Activa',
  is_headquarters BOOLEAN NOT NULL DEFAULT FALSE,
  linked_department_ids UUID[] NOT NULL DEFAULT '{}',
  linked_location_ids UUID[] NOT NULL DEFAULT '{}',
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  UNIQUE (organization_id, code)
);

CREATE TABLE admin_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE RESTRICT,
  code VARCHAR(30) NOT NULL,
  name VARCHAR(140) NOT NULL,
  cost_center VARCHAR(40) NOT NULL,
  leader VARCHAR(150) NOT NULL,
  subsidiary_id UUID NULL REFERENCES admin_subsidiaries(id),
  location_id UUID NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Activo',
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  UNIQUE (organization_id, code)
);

CREATE TABLE admin_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE RESTRICT,
  code VARCHAR(30) NOT NULL,
  name VARCHAR(140) NOT NULL,
  type VARCHAR(40) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  address VARCHAR(250) NOT NULL,
  subsidiary_id UUID NULL REFERENCES admin_subsidiaries(id),
  status VARCHAR(20) NOT NULL DEFAULT 'Activa',
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  UNIQUE (organization_id, code)
);

CREATE TABLE admin_return_workflows (
  organization_id UUID PRIMARY KEY REFERENCES core_organizations(id) ON DELETE CASCADE,
  config JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE CASCADE,
  category VARCHAR(24) NOT NULL,
  operation VARCHAR(16) NULL,
  action_kind VARCHAR(16) NULL,
  actor_user_id UUID NULL,
  actor_name VARCHAR(160) NOT NULL,
  entity_type VARCHAR(120) NOT NULL,
  entity_id VARCHAR(120) NULL,
  summary TEXT NOT NULL,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_org_created ON audit_logs (organization_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 4. CRM Y NÓMINA
-- ----------------------------------------------------------------------------

CREATE TABLE crm_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE RESTRICT,
  client_code VARCHAR(40) NULL,
  entity_type VARCHAR(20) NOT NULL DEFAULT 'company',
  company VARCHAR(180) NOT NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(180) NOT NULL,
  phone VARCHAR(40) NOT NULL DEFAULT '',
  rfc VARCHAR(24) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Activo',
  country VARCHAR(8) NULL DEFAULT 'MX',
  currency VARCHAR(8) NOT NULL DEFAULT 'MXN',
  payment_terms VARCHAR(40) NOT NULL DEFAULT 'Contado',
  city VARCHAR(120) NULL,
  state VARCHAR(120) NULL,
  notes TEXT NULL,
  addresses JSONB NOT NULL DEFAULT '[]',
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE crm_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE RESTRICT,
  vendor_code VARCHAR(40) NULL,
  entity_type VARCHAR(20) NOT NULL DEFAULT 'company',
  company VARCHAR(180) NOT NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(180) NOT NULL,
  phone VARCHAR(40) NOT NULL DEFAULT '',
  rfc VARCHAR(24) NULL,
  category VARCHAR(80) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Activo',
  country VARCHAR(8) NULL DEFAULT 'MX',
  currency VARCHAR(8) NOT NULL DEFAULT 'MXN',
  payment_terms VARCHAR(40) NOT NULL DEFAULT 'Crédito 30 días',
  addresses JSONB NOT NULL DEFAULT '[]',
  notes TEXT NULL,
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE crm_supplier_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES crm_suppliers(id) ON DELETE CASCADE,
  alias VARCHAR(120) NOT NULL,
  bank_name VARCHAR(120) NOT NULL,
  clabe VARCHAR(24) NULL,
  account_number VARCHAR(40) NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'MXN',
  default_reference VARCHAR(120) NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  bank_pack_values JSONB NULL,
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE crm_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE RESTRICT,
  employee_code VARCHAR(30) NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  email VARCHAR(180) NOT NULL,
  phone VARCHAR(40) NULL,
  position VARCHAR(120) NOT NULL,
  department_id UUID NULL REFERENCES admin_departments(id),
  location_id UUID NULL REFERENCES admin_locations(id),
  subsidiary_id UUID NULL REFERENCES admin_subsidiaries(id),
  status VARCHAR(24) NOT NULL DEFAULT 'Activo',
  contract_type VARCHAR(40) NOT NULL,
  payment_frequency VARCHAR(24) NOT NULL,
  gross_monthly_salary NUMERIC(18,2) NOT NULL CHECK (gross_monthly_salary >= 0),
  rfc VARCHAR(24) NULL,
  curp VARCHAR(24) NULL,
  nss VARCHAR(20) NULL,
  bank_pack_values JSONB NULL,
  user_id UUID NULL REFERENCES core_users(id),
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  UNIQUE (organization_id, employee_code)
);

CREATE TABLE crm_payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE RESTRICT,
  folio VARCHAR(30) NOT NULL,
  period_label VARCHAR(120) NOT NULL,
  frequency VARCHAR(24) NOT NULL,
  payment_date DATE NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'Borrador',
  total_gross NUMERIC(18,2) NOT NULL,
  total_deductions NUMERIC(18,2) NOT NULL,
  total_net NUMERIC(18,2) NOT NULL,
  receipts JSONB NOT NULL DEFAULT '[]',
  bank_account_id UUID NULL,
  expense_policy_id UUID NULL,
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  UNIQUE (organization_id, folio)
);

CREATE TABLE crm_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE RESTRICT,
  title VARCHAR(200) NOT NULL,
  client_id UUID NULL REFERENCES crm_clients(id),
  company VARCHAR(180) NOT NULL,
  owner_name VARCHAR(150) NOT NULL,
  stage VARCHAR(40) NOT NULL,
  value NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency VARCHAR(8) NOT NULL DEFAULT 'MXN',
  probability INTEGER NOT NULL DEFAULT 50 CHECK (probability BETWEEN 0 AND 100),
  expected_close_date DATE NULL,
  notes TEXT NULL,
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  related_entity VARCHAR(180) NULL,
  client_id UUID NULL REFERENCES crm_clients(id),
  opportunity_id UUID NULL REFERENCES crm_opportunities(id),
  assignee VARCHAR(150) NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'Pendiente',
  icon VARCHAR(24) NULL,
  tone VARCHAR(24) NULL,
  notes TEXT NULL,
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

-- ----------------------------------------------------------------------------
-- 5. VENTAS
-- ----------------------------------------------------------------------------

CREATE TABLE sal_catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE RESTRICT,
  sku VARCHAR(64) NOT NULL,
  name VARCHAR(200) NOT NULL,
  item_type VARCHAR(20) NOT NULL,
  category VARCHAR(80) NOT NULL,
  unit VARCHAR(32) NOT NULL DEFAULT 'Pieza',
  unit_price NUMERIC(18,4) NOT NULL CHECK (unit_price >= 0),
  cost_price NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  tax_rate NUMERIC(7,4) NOT NULL DEFAULT 16,
  currency VARCHAR(8) NOT NULL DEFAULT 'MXN',
  billing_model VARCHAR(24) NOT NULL DEFAULT 'Único',
  status VARCHAR(20) NOT NULL DEFAULT 'Activo',
  track_inventory BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT NULL,
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  UNIQUE (organization_id, sku)
);

CREATE TABLE sal_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE RESTRICT,
  folio VARCHAR(30) NOT NULL,
  client_id UUID NULL REFERENCES crm_clients(id),
  client_name VARCHAR(180) NOT NULL,
  issue_date DATE NOT NULL,
  valid_until DATE NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'Borrador',
  currency VARCHAR(8) NOT NULL DEFAULT 'MXN',
  exchange_rate NUMERIC(18,6) NOT NULL DEFAULT 1,
  subtotal NUMERIC(18,2) NOT NULL,
  tax_amount NUMERIC(18,2) NOT NULL,
  total NUMERIC(18,2) NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  notes TEXT NULL,
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  UNIQUE (organization_id, folio)
);

CREATE TABLE sal_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE RESTRICT,
  folio VARCHAR(30) NOT NULL,
  quote_id UUID NULL REFERENCES sal_quotes(id),
  client_id UUID NULL REFERENCES crm_clients(id),
  client_name VARCHAR(180) NOT NULL,
  order_date DATE NOT NULL,
  delivery_date DATE NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'Confirmado',
  currency VARCHAR(8) NOT NULL DEFAULT 'MXN',
  exchange_rate NUMERIC(18,6) NOT NULL DEFAULT 1,
  subtotal NUMERIC(18,2) NOT NULL,
  tax_amount NUMERIC(18,2) NOT NULL,
  total NUMERIC(18,2) NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  notes TEXT NULL,
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  UNIQUE (organization_id, folio)
);

CREATE TABLE sal_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE RESTRICT,
  folio VARCHAR(30) NOT NULL,
  order_id UUID NULL REFERENCES sal_orders(id),
  client_id UUID NULL REFERENCES crm_clients(id),
  client_name VARCHAR(180) NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'Emitida',
  billing_mode VARCHAR(24) NOT NULL DEFAULT 'Fiscal',
  cfdi_uuid VARCHAR(36) NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'MXN',
  exchange_rate NUMERIC(18,6) NOT NULL DEFAULT 1,
  subtotal NUMERIC(18,2) NOT NULL,
  tax_amount NUMERIC(18,2) NOT NULL,
  total NUMERIC(18,2) NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  UNIQUE (organization_id, folio)
);

CREATE TABLE sal_customer_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE RESTRICT,
  folio VARCHAR(30) NOT NULL,
  order_id UUID NULL REFERENCES sal_orders(id),
  invoice_id UUID NULL REFERENCES sal_invoices(id),
  client_id UUID NULL REFERENCES crm_clients(id),
  client_name VARCHAR(180) NOT NULL,
  reason VARCHAR(80) NOT NULL,
  resolution VARCHAR(60) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'Solicitada',
  currency VARCHAR(8) NOT NULL DEFAULT 'MXN',
  total_refund NUMERIC(18,2) NOT NULL DEFAULT 0,
  items JSONB NOT NULL DEFAULT '[]',
  workflow_history JSONB NOT NULL DEFAULT '[]',
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  UNIQUE (organization_id, folio)
);

-- ----------------------------------------------------------------------------
-- 6. COMPRAS Y OPERACIONES
-- ----------------------------------------------------------------------------

CREATE TABLE ops_warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE RESTRICT,
  code VARCHAR(30) NOT NULL,
  name VARCHAR(140) NOT NULL,
  location_id UUID NULL REFERENCES admin_locations(id),
  manager VARCHAR(150) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Activo',
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  UNIQUE (organization_id, code)
);

CREATE TABLE ops_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES sal_catalog_items(id) ON DELETE RESTRICT,
  sku VARCHAR(64) NOT NULL,
  warehouse_id UUID NOT NULL REFERENCES ops_warehouses(id) ON DELETE RESTRICT,
  stock_quantity NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  reserved_quantity NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  min_stock NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  threshold_source VARCHAR(20) NOT NULL DEFAULT 'sku' CHECK (threshold_source IN ('sku', 'category')),
  unit_cost NUMERIC(18,4) NOT NULL DEFAULT 0,
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX uq_ops_inventory_prod_wh
  ON ops_inventory (organization_id, product_id, warehouse_id)
  WHERE deleted_at IS NULL;

CREATE TABLE ops_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE RESTRICT,
  folio VARCHAR(30) NOT NULL,
  product_id UUID NOT NULL REFERENCES sal_catalog_items(id),
  warehouse_id UUID NOT NULL REFERENCES ops_warehouses(id),
  movement_type VARCHAR(24) NOT NULL,
  quantity NUMERIC(18,4) NOT NULL,
  reference_doc VARCHAR(80) NULL,
  notes TEXT NULL,
  actor_name VARCHAR(150) NOT NULL,
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, folio)
);

CREATE TABLE ops_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE RESTRICT,
  folio VARCHAR(30) NOT NULL,
  from_warehouse_id UUID NOT NULL REFERENCES ops_warehouses(id),
  to_warehouse_id UUID NOT NULL REFERENCES ops_warehouses(id),
  status VARCHAR(24) NOT NULL DEFAULT 'Solicitado',
  transfer_mode VARCHAR(24) NOT NULL DEFAULT 'Estándar',
  items JSONB NOT NULL DEFAULT '[]',
  notes TEXT NULL,
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  UNIQUE (organization_id, folio)
);

CREATE TABLE ops_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE RESTRICT,
  folio VARCHAR(30) NOT NULL,
  order_id UUID NULL REFERENCES sal_orders(id),
  warehouse_id UUID NULL REFERENCES ops_warehouses(id),
  carrier VARCHAR(120) NOT NULL,
  tracking_number VARCHAR(120) NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'Preparando',
  shipped_at TIMESTAMPTZ NULL,
  delivered_at TIMESTAMPTZ NULL,
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  UNIQUE (organization_id, folio)
);

CREATE TABLE pur_requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE RESTRICT,
  folio VARCHAR(30) NOT NULL,
  requester_name VARCHAR(150) NOT NULL,
  department_id UUID NULL REFERENCES admin_departments(id),
  priority VARCHAR(20) NOT NULL DEFAULT 'Media',
  status VARCHAR(24) NOT NULL DEFAULT 'Pendiente',
  needed_by DATE NULL,
  items JSONB NOT NULL DEFAULT '[]',
  notes TEXT NULL,
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  UNIQUE (organization_id, folio)
);

CREATE TABLE pur_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE RESTRICT,
  folio VARCHAR(30) NOT NULL,
  requisition_id UUID NULL REFERENCES pur_requisitions(id),
  supplier_id UUID NULL REFERENCES crm_suppliers(id),
  supplier_name VARCHAR(180) NOT NULL,
  warehouse_id UUID NULL REFERENCES ops_warehouses(id),
  order_date DATE NOT NULL,
  expected_date DATE NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'Emitida',
  currency VARCHAR(8) NOT NULL DEFAULT 'MXN',
  exchange_rate NUMERIC(18,6) NOT NULL DEFAULT 1,
  subtotal NUMERIC(18,2) NOT NULL,
  tax_amount NUMERIC(18,2) NOT NULL,
  total NUMERIC(18,2) NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  UNIQUE (organization_id, folio)
);

CREATE TABLE pur_receptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE RESTRICT,
  folio VARCHAR(30) NOT NULL,
  purchase_order_id UUID NOT NULL REFERENCES pur_orders(id),
  warehouse_id UUID NOT NULL REFERENCES ops_warehouses(id),
  received_by VARCHAR(150) NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lines JSONB NOT NULL DEFAULT '[]',
  notes TEXT NULL,
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, folio)
);

CREATE TABLE pur_supplier_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE RESTRICT,
  folio VARCHAR(30) NOT NULL,
  purchase_order_id UUID NULL REFERENCES pur_orders(id),
  supplier_id UUID NULL REFERENCES crm_suppliers(id),
  supplier_name VARCHAR(180) NOT NULL,
  reason VARCHAR(80) NOT NULL,
  resolution VARCHAR(60) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'Solicitada',
  currency VARCHAR(8) NOT NULL DEFAULT 'MXN',
  total_credit NUMERIC(18,2) NOT NULL DEFAULT 0,
  items JSONB NOT NULL DEFAULT '[]',
  workflow_history JSONB NOT NULL DEFAULT '[]',
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  UNIQUE (organization_id, folio)
);

-- ----------------------------------------------------------------------------
-- 7. FINANZAS, TESORERÍA, EBP, GASTOS Y FX
-- ----------------------------------------------------------------------------

CREATE TABLE fin_chart_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE RESTRICT,
  code VARCHAR(24) NOT NULL,
  name VARCHAR(160) NOT NULL,
  account_type VARCHAR(32) NOT NULL,
  nature VARCHAR(32) NOT NULL,
  parent_code VARCHAR(24) NULL,
  balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'Activa',
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  UNIQUE (organization_id, code)
);

CREATE TABLE fin_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE RESTRICT,
  alias VARCHAR(120) NOT NULL,
  bank_name VARCHAR(120) NOT NULL,
  account_type VARCHAR(32) NOT NULL,
  account_number VARCHAR(40) NOT NULL,
  clabe VARCHAR(24) NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'MXN',
  balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'Activa',
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE fin_receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE RESTRICT,
  folio VARCHAR(30) NOT NULL,
  invoice_id UUID NULL REFERENCES sal_invoices(id),
  client_id UUID NULL REFERENCES crm_clients(id),
  client_name VARCHAR(180) NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'MXN',
  exchange_rate NUMERIC(18,6) NOT NULL DEFAULT 1,
  amount NUMERIC(18,2) NOT NULL,
  paid_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  status VARCHAR(24) NOT NULL DEFAULT 'Pendiente',
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  UNIQUE (organization_id, folio)
);

CREATE TABLE fin_payables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE RESTRICT,
  folio VARCHAR(30) NOT NULL,
  purchase_order_id UUID NULL REFERENCES pur_orders(id),
  supplier_id UUID NULL REFERENCES crm_suppliers(id),
  supplier_name VARCHAR(180) NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'MXN',
  exchange_rate NUMERIC(18,6) NOT NULL DEFAULT 1,
  amount NUMERIC(18,2) NOT NULL,
  paid_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  status VARCHAR(24) NOT NULL DEFAULT 'Pendiente',
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  UNIQUE (organization_id, folio)
);

CREATE TABLE fin_payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE RESTRICT,
  folio VARCHAR(30) NOT NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('Cobro', 'Pago')),
  bank_account_id UUID NOT NULL REFERENCES fin_bank_accounts(id),
  counterparty_name VARCHAR(180) NOT NULL,
  reference_doc VARCHAR(80) NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'MXN',
  exchange_rate NUMERIC(18,6) NOT NULL DEFAULT 1,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(60) NOT NULL,
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, folio)
);

CREATE TABLE fin_ebp_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE RESTRICT,
  folio VARCHAR(30) NOT NULL,
  bank_account_id UUID NOT NULL REFERENCES fin_bank_accounts(id),
  operation_type VARCHAR(40) NOT NULL,
  channel VARCHAR(24) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'MXN',
  total_amount NUMERIC(18,2) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'Generado',
  lines JSONB NOT NULL DEFAULT '[]',
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  UNIQUE (organization_id, folio)
);

CREATE TABLE fin_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE RESTRICT,
  folio VARCHAR(30) NOT NULL,
  expense_date DATE NOT NULL,
  expense_nature VARCHAR(32) NOT NULL,
  category VARCHAR(60) NOT NULL,
  cost_behavior VARCHAR(16) NOT NULL DEFAULT 'Fijo',
  status VARCHAR(24) NOT NULL DEFAULT 'Pagado',
  department_id UUID NULL REFERENCES admin_departments(id),
  location_id UUID NULL REFERENCES admin_locations(id),
  account_code VARCHAR(24) NULL,
  bank_account_id UUID NULL REFERENCES fin_bank_accounts(id),
  beneficiary VARCHAR(180) NOT NULL,
  description VARCHAR(500) NOT NULL,
  subtotal NUMERIC(18,2) NOT NULL,
  tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  total NUMERIC(18,2) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'MXN',
  exchange_rate NUMERIC(18,6) NOT NULL DEFAULT 1,
  payment_method VARCHAR(80) NOT NULL,
  reference_doc VARCHAR(80) NULL,
  issuer_rfc VARCHAR(24) NULL,
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  UNIQUE (organization_id, folio)
);

CREATE TABLE fin_expense_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES admin_departments(id),
  expense_nature VARCHAR(32) NOT NULL,
  monthly_limit NUMERIC(18,2) NOT NULL CHECK (monthly_limit >= 0),
  warning_pct NUMERIC(5,2) NOT NULL DEFAULT 80,
  critical_pct NUMERIC(5,2) NOT NULL DEFAULT 95,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  UNIQUE (organization_id, department_id, expense_nature)
);

CREATE TABLE fin_recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL,
  beneficiary VARCHAR(180) NOT NULL,
  expense_nature VARCHAR(32) NOT NULL,
  category VARCHAR(60) NOT NULL,
  cost_behavior VARCHAR(16) NOT NULL DEFAULT 'Fijo',
  department_id UUID NULL REFERENCES admin_departments(id),
  location_id UUID NULL REFERENCES admin_locations(id),
  frequency VARCHAR(24) NOT NULL,
  next_run_date DATE NOT NULL,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  tax_mode VARCHAR(16) NOT NULL DEFAULT '16',
  auto_post BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE fin_fx_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency VARCHAR(8) NOT NULL,
  quote_currency VARCHAR(8) NOT NULL,
  rate NUMERIC(18,6) NOT NULL CHECK (rate > 0),
  effective_date DATE NOT NULL,
  source VARCHAR(40) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (base_currency, quote_currency, effective_date, source)
);

-- ----------------------------------------------------------------------------
-- 8. REPORTES, CONFIGURACIÓN Y SOPORTE
-- ----------------------------------------------------------------------------

CREATE TABLE rpt_margin_alert_settings (
  organization_id UUID PRIMARY KEY REFERENCES core_organizations(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  operating_margin_target_pct NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  net_margin_target_pct NUMERIC(5,2) NOT NULL DEFAULT 12.00,
  operating_alert_active BOOLEAN NOT NULL DEFAULT TRUE,
  net_alert_active BOOLEAN NOT NULL DEFAULT TRUE,
  notify_in_app_toast BOOLEAN NOT NULL DEFAULT TRUE,
  notify_notification_center BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cfg_workspace_settings (
  organization_id UUID PRIMARY KEY REFERENCES core_organizations(id) ON DELETE CASCADE,
  workspace_name VARCHAR(140) NOT NULL,
  slug VARCHAR(80) NOT NULL,
  description VARCHAR(400) NOT NULL DEFAULT '',
  main_country VARCHAR(80) NOT NULL DEFAULT 'México',
  reporting_currency VARCHAR(8) NOT NULL DEFAULT 'MXN',
  primary_email VARCHAR(180) NOT NULL,
  phone VARCHAR(40) NOT NULL DEFAULT '',
  website VARCHAR(240) NOT NULL DEFAULT '',
  avatar_color VARCHAR(7) NOT NULL DEFAULT '#456a61',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cfg_organization_settings (
  organization_id UUID PRIMARY KEY REFERENCES core_organizations(id) ON DELETE CASCADE,
  legal_name VARCHAR(200) NOT NULL,
  trade_name VARCHAR(160) NOT NULL,
  rfc VARCHAR(13) NOT NULL,
  tax_regime VARCHAR(160) NOT NULL,
  fiscal_street VARCHAR(180) NOT NULL DEFAULT '',
  fiscal_colony VARCHAR(120) NOT NULL DEFAULT '',
  fiscal_zip VARCHAR(12) NOT NULL DEFAULT '',
  fiscal_city VARCHAR(100) NOT NULL DEFAULT '',
  fiscal_state VARCHAR(100) NOT NULL DEFAULT '',
  fiscal_country VARCHAR(80) NOT NULL DEFAULT 'México',
  legal_rep VARCHAR(160) NOT NULL DEFAULT '',
  certificate_status VARCHAR(20) NOT NULL DEFAULT 'none',
  logo_attachment_id UUID NULL REFERENCES obj_attachments(id),
  branches JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cfg_roles (
  id VARCHAR(80) NOT NULL,
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(400) NOT NULL DEFAULT '',
  capabilities TEXT[] NOT NULL DEFAULT '{}',
  section_permissions JSONB NOT NULL,
  built_in_key VARCHAR(16) NULL,
  for_api_integration BOOLEAN NOT NULL DEFAULT FALSE,
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  PRIMARY KEY (organization_id, id)
);

CREATE TABLE cfg_category_stock_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE CASCADE,
  category VARCHAR(120) NOT NULL,
  min_stock INTEGER NOT NULL CHECK (min_stock >= 0),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  mode VARCHAR(24) NOT NULL DEFAULT 'inherit_default' CHECK (mode IN ('inherit_default', 'override_sku')),
  notes VARCHAR(400) NULL,
  is_custom BOOLEAN NOT NULL DEFAULT FALSE,
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE cfg_external_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE CASCADE,
  name VARCHAR(140) NOT NULL,
  system_type VARCHAR(40) NOT NULL,
  description VARCHAR(400) NOT NULL DEFAULT '',
  environment VARCHAR(16) NOT NULL CHECK (environment IN ('production', 'sandbox')),
  status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'revoked')),
  role_id VARCHAR(80) NOT NULL,
  api_key_prefix VARCHAR(24) NOT NULL,
  api_key_hash VARCHAR(64) NOT NULL UNIQUE,
  webhook_callback_url VARCHAR(300) NOT NULL DEFAULT '',
  ip_allowlist VARCHAR(300) NOT NULL DEFAULT '',
  rate_limit_per_min INTEGER NOT NULL DEFAULT 120,
  permissions JSONB NOT NULL,
  requests_count BIGINT NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sup_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE CASCADE,
  code VARCHAR(24) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  module_name VARCHAR(80) NOT NULL,
  priority VARCHAR(16) NOT NULL DEFAULT 'Media',
  status VARCHAR(24) NOT NULL DEFAULT 'Abierto',
  requester_name VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  external_id VARCHAR(120) NULL,
  external_source VARCHAR(80) NULL,
  external_synced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  UNIQUE (organization_id, code)
);

CREATE TABLE sup_ticket_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core_organizations(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES sup_tickets(id) ON DELETE CASCADE,
  author VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 9. ÍNDICES PARCIALES PARA external_id POR TENANT Y POLÍTICA RLS BASE
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  t TEXT;
  tables_with_ext TEXT[] := ARRAY[
    'core_organization_memberships', 'admin_subsidiaries', 'admin_departments',
    'admin_locations', 'crm_clients', 'crm_suppliers', 'crm_supplier_bank_accounts',
    'crm_employees', 'crm_payroll_runs', 'crm_opportunities', 'crm_activities',
    'sal_catalog_items', 'sal_quotes', 'sal_orders', 'sal_invoices',
    'sal_customer_returns', 'ops_warehouses', 'ops_inventory', 'ops_stock_movements',
    'ops_transfers', 'ops_shipments', 'pur_requisitions', 'pur_orders',
    'pur_receptions', 'pur_supplier_returns', 'fin_chart_accounts',
    'fin_bank_accounts', 'fin_receivables', 'fin_payables', 'fin_payment_transactions',
    'fin_ebp_batches', 'fin_expenses', 'fin_expense_budgets', 'fin_recurring_expenses',
    'cfg_roles', 'cfg_category_stock_thresholds', 'sup_tickets'
  ];
BEGIN
  FOREACH t IN ARRAY tables_with_ext LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = t AND column_name = 'deleted_at'
    ) THEN
      EXECUTE format(
        'CREATE UNIQUE INDEX IF NOT EXISTS uq_%I_org_ext ON %I (organization_id, external_source, external_id) WHERE external_id IS NOT NULL AND deleted_at IS NULL;',
        t, t
      );
    ELSE
      EXECUTE format(
        'CREATE UNIQUE INDEX IF NOT EXISTS uq_%I_org_ext ON %I (organization_id, external_source, external_id) WHERE external_id IS NOT NULL;',
        t, t
      );
    END IF;
  END LOOP;
END $$;

-- Plantilla de Row-Level Security (activar por cada tabla tenant-scoped):
-- ALTER TABLE crm_clients ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY tenant_isolation_crm_clients ON crm_clients
--   USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);
