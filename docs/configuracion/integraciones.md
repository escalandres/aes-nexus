# Configuración · Integraciones Nativas, Marketplace y API Externa (`/docs/configuracion/integraciones.md`)

Especificación técnica para los tres niveles de conectividad de **AES Nexus**: **Conectores Nativos Core (`IntegrationConfig`)**, **Marketplace Comercial (`CommercialIntegrationRecord`)** y **Llaves API Externas (`ExternalIntegrationRecord`)** con bitácora de peticiones (`ExternalIntegrationLog`).

- **Endpoints REST:**
  - `GET / PUT /api/v1/settings/integrations/native/:id` (`cfdi | spei | workspace | webhooks`)
  - `GET / POST / PUT / DELETE /api/v1/settings/integrations/commercial` (+ `POST /:id/sync`)
  - `GET / POST / PUT / DELETE /api/v1/settings/integrations/external` (+ `POST /:id/rotate-key`, `POST /:id/test`)
- **Esquema JSON:** [`integraciones.schema.json`](./integraciones.schema.json)
- **Tablas PostgreSQL sugeridas:** `cfg_native_integrations`, `cfg_commercial_integrations`, `cfg_external_integrations`, `cfg_integration_logs`
- **Fuente en Frontend:** `src/data/settings.ts` (`IntegrationConfig`, `CommercialIntegrationRecord`, `ExternalIntegrationRecord`, `ExternalIntegrationLog`, `generateExternalApiKey`)

---

## 1. Conectores Nativos Core (`IntegrationConfig`)

Representan los 4 conectores estructurales del ERP: `'cfdi'`, `'spei'`, `'workspace'`, `'webhooks'`.

| Campo | Tipo JSON | Obligatorio | Descripción |
|---|---|---|---|
| `id` | `'cfdi' \| 'spei' \| 'workspace' \| 'webhooks'` | Sí | Identificador del conector nativo |
| `enabled` | `boolean` | Sí | Activa o desactiva el conector |
| `environment` | `'production' \| 'sandbox'` | Sí | Ambiente de ejecución |
| `endpointOrAccount` | `string` | Sí | URL del PAC/webhook, CLABE STP o correo Workspace |
| `credentialMask` | `string` | Sí | Secreto enmascarado devuelto por backend (nunca exponer clave plana tras guardar) |
| `syncMode` | `'realtime' \| '15m' \| 'hourly'` | Sí | Cadencia de sincronización |
| `lastSyncAt` | `string` (ISO-8601 o vacío) | Sí | Última sincronización exitosa |

---

## 2. Integraciones Comerciales / Marketplace (`CommercialIntegrationRecord`)

Apps preconfiguradas del catálogo `COMMERCIAL_MARKETPLACE_CATALOG` (ej. Shopify, PACs, banca).

| Campo | Tipo JSON | Obligatorio | Descripción |
|---|---|---|---|
| `id` | `string` | Sí | ID de instancia instalada (`comm_...`) |
| `marketplaceId` | `string` | Sí | ID del catálogo (`mkt_shopify`, etc.) |
| `name` / `vendor` | `string` | Sí | Nombre de aplicación y proveedor |
| `category` | `'PAC Fiscal' \| 'Ecommerce' \| 'Banca & Pagos' \| 'Productividad'` | Sí | Categoría funcional |
| `description` | `string` | Sí | Alcance de sincronización |
| `enabled` | `boolean` | Sí | Estado activo/inactivo |
| `environment` | `'production' \| 'sandbox'` | Sí | Ambiente |
| `syncInterval` | `'5m' \| '15m' \| '30m' \| '1h' \| '6h' \| '24h' \| 'manual'` | Sí | Frecuencia programada |
| `endpointUrl` | `string` | Sí | URL destino/origen del servicio externo |
| `apiKey` / `apiSecret` | `string` | Sí | Credenciales cifradas en reposo (enmascaradas en respuestas `GET`) |
| `lastSyncAtIso` | `string` | Sí | Fecha ISO de último intento |
| `lastSyncStatus` | `'idle' \| 'success' \| 'error'` | Sí | Resultado de la última ejecución |
| `installedAtIso` | `string` | Sí | Fecha ISO de instalación |
| `recentLogs` | `ExternalIntegrationLog[]` | Sí | Últimas ejecuciones registradas |

---

## 3. API Externa y Webhooks (`ExternalIntegrationRecord`)

Permite emitir credenciales Bearer (`nexus_live_<28>` o `nexus_sbx_<28>`) vinculadas a un `RoleDefinition` (idealmente con `forApiIntegration: true`) y permisos explícitos por recurso.

| Campo | Tipo JSON | Obligatorio | Descripción |
|---|---|---|---|
| `id` | `string` | Sí | ID único (`ext_...`) |
| `name` | `string` | Sí | Nombre descriptivo de la integración |
| `systemType` | `ExternalSystemType` | Sí | `'Ecommerce' \| 'BI / Analítica' \| 'Contabilidad Externa' \| 'WMS / Logística' \| 'Webhook / Middleware' \| 'ERP / Legacy' \| 'Otro'` |
| `origin` | `'commercial' \| 'custom'` | Opcional | Origen del registro |
| `description` | `string` | Sí | Propósito técnico |
| `environment` | `'production' \| 'sandbox'` | Sí | Define prefijo `nexus_live_` vs `nexus_sbx_` |
| `status` | `'active' \| 'paused' \| 'revoked'` | Sí | Estado del token (`revoked` invalida permanentemente la key) |
| `roleId` | `string` (`RoleKey`) | Sí | Rol RBAC asociado al token (validado contra `cfg_roles`) |
| `apiKeyPrefix` | `string` (14 chars) | Sí | Prefijo visible para identificación rápida |
| `apiKeySecret` | `string` | Sí | Token secreto (almacenar con hash SHA-256/HMAC en backend; mostrar completo solo al crear/rotar) |
| `webhookCallbackUrl` | `string` | Sí | Endpoint receptor de eventos salientes |
| `ipAllowlist` | `string` | Sí | Lista CSV de IPs/CIDR permitidos (vacío = cualquier IP) |
| `rateLimitPerMin` | `integer` (`>= 1`) | Sí | Límite de peticiones por minuto (HTTP `429` al exceder) |
| `permissions` | `Record<ExternalApiResource, ExternalApiAction[]>` | Sí | Recursos (`clientes, productos, ventas, compras, finanzas, rrhh`) × Acciones (`read, create, update, delete`) |
| `createdAtIso` / `lastUsedAtIso` | `string` | Sí | Tiempos de alta y último uso |
| `requestsCount` | `integer` (`>= 0`) | Sí | Contador acumulado de llamadas |
| `recentLogs` | `ExternalIntegrationLog[]` | Sí | Trazas recientes (`method, resource, endpoint, statusCode, latencyMs, summary, responsePayload, timestampIso`) |

---

## 4. Seguridad y Auditoría

- **Restricción RBAC:** Requiere `sysConfig` y permiso en `Configuración.Integraciones`.
- **Cifrado de Secretos:** El backend debe cifrar con KMS/AES-256 los secretos de Marketplace y almacenar hash irreversible de `apiKeySecret`, devolviendo únicamente `apiKeyPrefix` + máscara en lecturas posteriores.
- **Auditoría:** Creación, rotación de llaves, pausa/revocación y cambios de permisos emiten evento en `audit_logs` (`category: 'security'`).
