# Backend · Almacenamiento de Archivos y Jobs en Segundo Plano (`/docs/backend/almacenamiento-y-jobs.md`)

Especificación para el manejo seguro de archivos binarios (evitando Base64 en tablas operativas) y los procesos programados en segundo plano del backend de **AES Nexus**.

---

## 1. Almacenamiento Documental (`obj_attachments` + Object Storage S3/GCS)

En el prototipo frontend, elementos como `logoDataUrl` o comprobantes se representan en memoria/DataURL. En producción:

1. **Tabla índice en PostgreSQL (`obj_attachments`):**
   - `id UUID PRIMARY KEY`
   - `organization_id UUID NOT NULL`
   - `entity_type VARCHAR(64) NOT NULL` (`organization_logo`, `csd_certificate`, `csd_key`, `cfdi_xml`, `cfdi_pdf`, `expense_receipt`, `ebp_file`, `support_ticket_file`)
   - `entity_id UUID NOT NULL`
   - `storage_bucket VARCHAR(120) NOT NULL`
   - `storage_key VARCHAR(400) NOT NULL` (`tenants/{org_id}/{entity_type}/{uuid}.{ext}`)
   - `file_name VARCHAR(240) NOT NULL`
   - `mime_type VARCHAR(120) NOT NULL`
   - `size_bytes BIGINT NOT NULL`
   - `sha256_checksum VARCHAR(64) NOT NULL`
   - `is_encrypted_secret BOOLEAN NOT NULL DEFAULT FALSE` (KMS/AES-256 obligatorio para `.cer`/`.key` y llaves CSD)
   - `created_by UUID NULL`, `created_at TIMESTAMPTZ NOT NULL`
2. **Flujo de Carga y Descarga:**
   - Subida mediante URL prefirmada (`POST /api/v1/attachments/presign`) o `multipart/form-data` con validación de tamaño máximo (logos ≤ 2 MB; comprobantes/XML ≤ 15 MB) y whitelist de MIME types.
   - Descarga mediante URL prefirmada de corta duración (TTL 5 min) previa validación de `X-Organization-Id` y RBAC.
   - Actualización automática de `cfg_plan_subscriptions.storage_used_gb` sumando `size_bytes` por tenant.

---

## 2. Catálogo de Jobs / Tareas Programadas (`Background Workers`)

Todos los trabajos programados ejecutan un bucle aislado **por cada `organization_id` activo**, fijando contexto de tenant explícito antes de leer o escribir:

| Job | Frecuencia / Trigger | Responsabilidad |
|---|---|---|
| **`RecurringExpensesJob`** | Diario `01:00 UTC` (o zona del tenant) | Evalúa `fin_recurring_expenses` con `active = true` y `next_run_date <= CURRENT_DATE`; si `auto_post = true`, genera póliza `GST-YYYY-NNN`, recalcula `next_run_date` y evalúa presupuestos |
| **`BudgetAndMarginAlertJob`** | Cada 15 min / Post-cierre de póliza | Recalcula consumo de `fin_expense_budgets` (umbrales 80% / 95% / 100%) y `MarginAlertSettings` (EBIT / Neto), insertando notificaciones in-app y cola de correo |
| **`CommercialIntegrationSyncJob`** | Según `sync_interval` (`5m..24h`) | Ejecuta sincronización incremental de `cfg_commercial_integrations` activas (Shopify, etc.) usando `int_external_id_mappings` e idempotencia |
| **`OutboundWebhookDispatcherJob`** | Cola asíncrona / reintento exponencial | Envía webhooks firmados (`HMAC-SHA256` en header `X-Nexus-Signature`) a `webhook_callback_url` de `cfg_external_integrations` con hasta 5 reintentos (`1m, 5m, 15m, 1h, 6h`) |
| **`ReceivablesOverdueCheckJob`** | Diario `06:00` local | Marca `fin_receivables` y `fin_payables` como `'Vencida'` / `'Vencido'` cuando `due_date < CURRENT_DATE` y `balance > 0` |
| **`FxRatesSyncJob`** | Lunes–Viernes `18:10 UTC` | Consulta tipo de cambio oficial Banxico FIX y actualiza `fin_fx_rates` |
| **`CleanupAndRetentionJob`** | Diario `03:00 UTC` | Purga `sys_idempotency_keys` expiradas (>24h), sesiones vencidas y aplica política de retención en `audit_logs` (7 años si addon `audit_archive = true`) |
