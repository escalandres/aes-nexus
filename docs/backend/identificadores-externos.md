# Backend · Estándar de Identificadores Externos e Integraciones (`/docs/backend/identificadores-externos.md`)

Especificación transversal obligatoria para garantizar interoperabilidad bidireccional, deduplicación e idempotencia en **todos los registros de negocio** de **AES Nexus** cuando se sincronizan con sistemas externos (Shopify, Tiendanube, WMS, Contpaqi/ERP legacy, BI, Stripe/STP, HRIS, etc.).

- **Esquema JSON:** [`identificadores-externos.schema.json`](./identificadores-externos.schema.json)
- **Tablas afectadas:** **Todas las entidades maestras y transaccionales** (`crm_*`, `admin_*`, `sal_*`, `pur_*`, `ops_*`, `fin_*`, `cfg_workspace_users`, `cfg_roles`, `cfg_category_stock_thresholds`, `sup_tickets`) + tabla multi-sistema `int_external_id_mappings`.

---

## 1. Modelo Híbrido (Campo Directo + Tabla Multi-Sistema)

Para equilibrar simplicidad en consultas REST/SQL y soporte cuando un mismo registro de AES Nexus se sincroniza con **más de un sistema externo simultáneamente** (ej. un cliente creado en **Shopify** que también se sincroniza hacia **Contabilidad Externa** y **WMS**), se adopta un **modelo híbrido**:

### A. Campos Estándar en Todo Registro (`ExternalReferenceMixin`)
Toda entidad de negocio expone en sus DTOs de entrada (`Create*DTO`, `Update*DTO`), respuestas (`*Record`) y tabla PostgreSQL los siguientes 3 atributos opcionales:

| Campo JSON | Columna PostgreSQL | Tipo | Obligatorio | Descripción |
|---|---|---|---|---|
| `externalId` | `external_id` | `VARCHAR(120)` (`null` permitido) | No | Identificador único del registro en el sistema externo de origen o principal (ej. `"shp_cus_894210"`, `"CONTPAQ-CLI-0042"`) |
| `externalSource` | `external_source` | `VARCHAR(80)` (`null` permitido) | Condicional (requerido si viene `externalId`) | Clave normalizada del conector/sistema externo (ej. `"shopify"`, `"contpaqi"`, `"sap_b1"`, `"wms_custom"`, o `integration.id` de `cfg_external_integrations`) |
| `externalSyncedAt` | `external_synced_at` | `TIMESTAMPTZ` (`null` permitido) | No (solo lectura / servidor) | Fecha y hora UTC de la última sincronización exitosa confirmada |

**Regla de Unicidad en PostgreSQL (por Tenant):**
Cada tabla maestra/transaccional define un índice único parcial:
```sql
CREATE UNIQUE INDEX uq_<table>_org_external
  ON <table> (organization_id, external_source, external_id)
  WHERE external_id IS NOT NULL AND deleted_at IS NULL;
```
- **Regla de validación:** Si el payload incluye `externalId`, debe venir acompañado de `externalSource` (o inferirse automáticamente del header `X-External-System` o de la API Key autenticada en `cfg_external_integrations`). De lo contrario, el servidor responde `422 Unprocessable Entity` (`EXTERNAL_SOURCE_REQUIRED`).

---

### B. Tabla Polimórfica Multi-Sistema (`int_external_id_mappings`)
Cuando un mismo registro (`entity_type`, `entity_id`) interactúa con **múltiples integraciones**, la tabla `int_external_id_mappings` almacena los enlaces secundarios o adicionales sin sobrescribir `external_id` primario:

| Columna SQL | Tipo | Descripción |
|---|---|---|
| `id` | `UUID PRIMARY KEY` | Identificador del enlace |
| `organization_id` | `UUID NOT NULL` | Tenant propietario (`X-Organization-Id`) |
| `entity_type` | `VARCHAR(64) NOT NULL` | Tipo canónico (`client`, `supplier`, `employee`, `payroll_run`, `opportunity`, `activity`, `product`, `quote`, `sales_order`, `sales_invoice`, `customer_return`, `purchase_requisition`, `purchase_order`, `reception`, `supplier_bill`, `supplier_return`, `warehouse`, `inventory_item`, `stock_movement`, `inventory_transfer`, `shipment`, `bank_account`, `receivable`, `payable`, `payment_transaction`, `ebp_batch`, `chart_account`, `expense`, `expense_budget`, `recurring_expense`, `subsidiary`, `department`, `location`, `support_ticket`) |
| `entity_id` | `UUID NOT NULL` | UUID interno en AES Nexus |
| `external_system` | `VARCHAR(80) NOT NULL` | Identificador del sistema externo (`shopify`, `hubspot`, `contpaqi`, `ext_...`) |
| `external_id` | `VARCHAR(120) NOT NULL` | ID del registro en ese sistema externo |
| `external_url` | `VARCHAR(500) NULL` | Deep-link opcional hacia el registro en el sistema externo |
| `sync_direction` | `VARCHAR(20) NOT NULL` | `'inbound' \| 'outbound' \| 'bidirectional'` |
| `last_synced_at` | `TIMESTAMPTZ NOT NULL` | Última sincronización confirmada |
| `payload_hash` | `VARCHAR(64) NULL` | SHA-256 del último payload sincronizado (evita escrituras redundantes) |
| `metadata` | `JSONB NULL` | Metadatos crudos útiles de integración (ej. `shopDomain`, `etag`, `version`) |

**Restricciones únicas en `int_external_id_mappings`:**
1. `UNIQUE (organization_id, external_system, entity_type, external_id)` — Evita duplicados al recibir webhooks o polling desde un sistema externo.
2. `UNIQUE (organization_id, entity_type, entity_id, external_system)` — Un registro interno tiene a lo más un vínculo activo por sistema externo.

---

## 2. Endpoints Transversales para Integraciones

Además de aceptar `externalId` y `externalSource` directamente en todos los `POST` / `PUT` / `PATCH` de cada módulo:

1. **Búsqueda Universal por ID Externo:**
   `GET /api/v1/integrations/lookup?entityType=client&externalSystem=shopify&externalId=shp_cus_894210`
   - Resuelve el UUID interno de AES Nexus (`entityId`) buscando primero en `int_external_id_mappings` y como respaldo en la tabla nativa (`external_source`, `external_id`).
   - Devuelve `200 OK` con `{ entityType, entityId, externalSystem, externalId, lastSyncedAt }` o `404 Not Found`.

2. **Upsert Idempotente por ID Externo:**
   `PUT /api/v1/integrations/records/:entityType/:externalSystem/:externalId`
   - Si no existe mapeo, ejecuta el flujo de alta del módulo destino, asigna UUID interno, persiste `external_id` + `external_source` y crea fila en `int_external_id_mappings`, devolviendo `201 Created`.
   - Si ya existe, actualiza solo si `payload_hash` cambió (o fuerza actualización si `force=true`), devolviendo `200 OK`.

3. **Gestión de Mapeos Adicionales:**
   - `GET /api/v1/integrations/mappings?entityType=...&entityId=...` — Lista todos los sistemas externos vinculados a un registro.
   - `POST /api/v1/integrations/mappings` — Vincula un ID externo adicional a un registro existente.
   - `DELETE /api/v1/integrations/mappings/:mappingId` — Desvincula un sistema externo sin borrar el registro ERP.

---

## 3. Reglas de Seguridad e Integridad

- **Permisos:** Toda operación de lookup/upsert por integración valida la `RoleDefinition` asociada a la API Key (`cfg_external_integrations.role_id`) sobre el módulo/sección de `entity_type`.
- **Soft Delete y Re-sincronización:** Si un registro fue borrado lógicamente (`deleted_at IS NOT NULL`), los índices parciales permiten re-importar el mismo `external_id` creando un registro nuevo limpio o restaurando según bandera `restoreIfDeleted`.
- **Propagación en Esquemas JSON:** Todos los esquemas `.schema.json` de entidades de negocio en `/docs/*` incluyen las propiedades opcionales `externalId`, `externalSource` y `externalSyncedAt` compatibles con `additionalProperties: false`.
