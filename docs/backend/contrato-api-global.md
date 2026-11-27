# Backend · Contrato Global de la API REST (`/docs/backend/contrato-api-global.md`)

Convenciones transversales para todos los endpoints bajo `/api/v1/*` de **AES Nexus** (ASP.NET Core 10 Web API): encabezados HTTP, paginación, filtrado, formato estándar de errores (`RFC 7807 ProblemDetails`) e idempotencia.

- **Esquema JSON:** [`contrato-api-global.schema.json`](./contrato-api-global.schema.json)

---

## 1. Encabezados HTTP Estándar

| Header | Obligatorio | Descripción |
|---|---|---|
| `Authorization` | Sí (excepto `/auth/callback` / `/health`) | `Bearer <jwt_oidc>` para usuarios o `Bearer <nexus_live_/sbx_...>` para integraciones externas |
| `X-Organization-Id` | Sí (en todo endpoint tenant-scoped) | UUID de la organización activa; validado contra membresías del actor (`403` si no pertenece) |
| `Content-Type` | En `POST/PUT/PATCH` | `application/json; charset=utf-8` (o `multipart/form-data` en adjuntos) |
| `Accept` | Recomendado | `application/json` |
| `X-Request-Id` | Opcional (generado si falta) | UUID de trazabilidad distribuida devuelto en respuesta y registrado en `audit_logs` |
| `Idempotency-Key` | Recomendado en mutaciones críticas | UUIDv4 obligatorio en cobros CxC, pagos CxP, lotes EBP, recepciones y timbrado CFDI |
| `X-External-System` | Opcional (integraciones) | Identificador del sistema externo (`shopify`, `contpaqi`, etc.); sirve como fallback de `externalSource` |

---

## 2. Paginación, Ordenamiento y Búsqueda

Todos los endpoints `GET` de colecciones soportan parámetros uniformes:

| Query Param | Tipo | Default | Regla |
|---|---|---|---|
| `page` | `integer` | `1` | Base 1 (`>= 1`) |
| `pageSize` | `integer` | `25` | Rango `1..200` (el servidor limita a `200`) |
| `sortBy` | `string` | `updatedAt` | Campo permitido en whitelist del recurso |
| `sortDir` | `'asc' \| 'desc'` | `'desc'` | Dirección de ordenamiento |
| `search` | `string` | `""` | Búsqueda case-insensitive sobre campos clave (incluye `externalId` y folio) |
| `externalSource` | `string` | — | Filtra registros provenientes de un sistema externo específico |
| `externalId` | `string` | — | Filtra coincidencia exacta por ID externo |
| `includeDeleted` | `boolean` | `false` | Solo administradores; incluye registros con `deleted_at IS NOT NULL` |

### Formato de Respuesta Paginada (`PaginatedResponse<T>`)
```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "totalItems": 142,
    "totalPages": 6,
    "hasNext": true,
    "hasPrev": false,
    "requestId": "req_01J..."
  }
}
```

---

## 3. Formato Estándar de Errores (`RFC 7807 ProblemDetails`)

Toda respuesta `4xx` / `5xx` devuelve `Content-Type: application/problem+json` con estructura uniforme:

| Campo | Tipo | Descripción |
|---|---|---|
| `type` | `string` (URI) | Identificador del error (`https://aes-nexus.local/errors/<errorCode>`) |
| `title` | `string` | Título legible breve |
| `status` | `integer` | Código HTTP (`400`, `401`, `403`, `404`, `409`, `422`, `429`, `500`) |
| `detail` | `string` | Explicación clara para diagnóstico sin exponer stack traces en producción |
| `instance` | `string` | Ruta de la petición |
| `errorCode` | `string` | Código estable de máquina (ver tabla abajo) |
| `traceId` | `string` | Correlación con logs/telemetría |
| `errors` | `Record<string, string[]>` | Opcional; errores de validación por campo (`400`/`422`) |

### Códigos de Error de Dominio (`errorCode`)

| `errorCode` | HTTP | Caso de Uso |
|---|---|---|
| `VALIDATION_ERROR` | `400` / `422` | Fallo de esquema JSON, campos requeridos o tipos inválidos |
| `UNAUTHORIZED` | `401` | JWT expirado/inválido o API Key revocada (`status = 'revoked'`) |
| `TENANT_MISMATCH` | `403` | `X-Organization-Id` faltante o el actor no pertenece a esa organización |
| `RBAC_FORBIDDEN` | `403` | Rol sin nivel suficiente (`none/view/create/edit/full`) o capability faltante |
| `RESOURCE_NOT_FOUND` | `404` | Entidad inexistente o perteneciente a otro tenant (no revelar existencia cross-tenant) |
| `DUPLICATE_FOLIO` / `DUPLICATE_EXTERNAL_ID` | `409` | Colisión de folio, SKU, RFC, código o `(organization_id, external_source, external_id)` |
| `INVALID_STATE_TRANSITION` | `409` | Transición de estado no permitida (ej. editar pedido ya `Entregado` o pagar póliza `Cancelado`) |
| `INSUFFICIENT_STOCK` | `422` | Salida/traslado/entrega superior al stock disponible en almacén origen |
| `INSUFFICIENT_FUNDS` | `422` | Saldo insuficiente en cuenta bancaria al liquidar pago, gasto o lote EBP |
| `EXTERNAL_SOURCE_REQUIRED` | `422` | Se envió `externalId` sin `externalSource` ni header `X-External-System` |
| `IDEMPOTENCY_CONFLICT` | `409` | Misma `Idempotency-Key` reutilizada con payload distinto |
| `RATE_LIMIT_EXCEEDED` | `429` | Excedió `rateLimitPerMin` configurado en `ExternalIntegrationRecord` |

---

## 4. Política de Idempotencia (`Idempotency-Key`)

- Aplica obligatoriamente en: `POST /finance/receivables/:id/collect`, `POST /finance/payables/:id/pay`, `POST /finance/ebp-batches`, `POST /purchases/orders/:id/receive`, `POST /expenses/policies` (cuando `status === 'Pagado'`), `POST /crm/payroll/:id/stamp` y `PUT /integrations/records/*`.
- El backend guarda `(organization_id, idempotency_key, request_hash, status_code, response_body, expires_at)` durante **24 horas** en `sys_idempotency_keys`.
- Reintento con mismo key y mismo `request_hash`: devuelve la respuesta cacheada exacta sin re-ejecutar débitos ni movimientos de inventario.
- Reintento con mismo key y distinto `request_hash`: devuelve `409 IDEMPOTENCY_CONFLICT`.
