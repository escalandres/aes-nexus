# Administración · Historial de Auditoría (`AuditLogs`)

Especificación funcional, modelo de datos y reglas de trazabilidad para el recurso **Historial de Auditoría** (`/api/v1/admin/audit-logs`).

---

## 1. Descripción Funcional

Bitácora inmutable de solo inserción (*append-only*) que centraliza todos los eventos de seguridad, inicios de sesión, altas, ediciones, cambios de estado, transacciones operativas/financieras y eliminaciones ocurridas en todos los módulos de **AES Nexus**. Provee filtrado multi-criterio, analítica por categoría/usuario y exportación oficial en formato CSV (`UTF-8 BOM`).

---

## 2. Campos del Registro (`AuditEventRecord` / `CreateAuditEventInternalDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `category` | `enum` (`AuditCategory`) | **Sí** | — | Módulo origen: `'settings'`, `'users'`, `'security'`, `'session'`, `'integrations'`, `'inventory'`, `'sales'`, `'finance'`, `'admin'`. |
| `action` | `string` (max 180) | **Sí** | — | Título corto de la acción ejecutada (ej. `'Creación de subsidiaria'`, `'Inicio de sesión en el ambiente'`). |
| `detail` | `string` (max 2000) | **Sí** | — | Descripción detallada con códigos, folios, montos o diferencias (`campo: antes → después`). |
| `user` | `string` (max 150) | **Sí** | Actor JWT | Nombre completo del usuario que ejecutó la acción. |
| `userId` | `string` (max 64) | No | `req.user.id` | Identificador único del usuario actor. |
| `crudOperation` | `enum` (`AuditCrudOperation`) | No | `null` | Operación estándar: `'CREATE'` \| `'UPDATE'` \| `'DELETE'`. |
| `entityType` | `string` (max 80) | No | `null` | Tipo de entidad afectada (ej. `'Subsidiaria'`, `'Departamento'`, `'Ubicación física'`, `'Flujos de devoluciones'`, `'Cliente'`). |
| `entityId` | `string` (max 180) | No | `null` | ID de la entidad afectada (o IDs separados por coma en operaciones masivas). |
| `sessionMeta` | `AuditSessionMeta` | No | `null` | Metadatos de sesión técnica (`roleLabel`, `ipAddress`, `deviceBrowser`). Obligatorio cuando `category === 'session'`. |
| `seedKey` | `enum` | No | `null` | `'ev1' | 'ev2' | 'ev3' | 'ev4'` — Clave interna opcional para localización de eventos semilla. |

### Sub-objeto `AuditSessionMeta`

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `roleLabel` | `string` (max 200) | **Sí** | Nombre(s) del rol efectivo del usuario al momento del evento. |
| `ipAddress` | `string` (max 64) | **Sí** | Dirección IP origen (`IPv4` / `IPv6`, extraída de headers confiables en backend). |
| `deviceBrowser` | `string` (max 180) | **Sí** | Dispositivo, SO y navegador detectado (`User-Agent` parseado). |

### Campos Generados y Derivados por el Servidor (`AuditEventRecord`)

- `id` (`string` / UUID, prefijo frontend `aud_<ts>_<rand>`).
- `timestampIso` (`date-time` ISO-8601 UTC asignado estrictamente por el reloj del servidor).
- `actionKind` (derivado en consultas/DTO de lectura): `'create' | 'update' | 'delete' | 'status' | 'transaction' | 'access'`.

---

## 3. Endpoints REST

| Método | Ruta | Descripción | RBAC |
|---|---|---|---|
| `GET` | `/api/v1/admin/audit-logs` | Consulta paginada ordenada descendente por `timestampIso` con filtros avanzados | `Administración.Historial de Auditoría` (`read`) |
| `GET` | `/api/v1/admin/audit-logs/summary` | Conteos agregados por `category`, `actionKind` y usuarios más activos | `Administración.Historial de Auditoría` (`read`) |
| `GET` | `/api/v1/admin/audit-logs/export` | Descarga CSV UTF-8 con BOM (`\uFEFF`) respetando exactamente los filtros activos | `Administración.Historial de Auditoría` (`read`) |

*Nota de seguridad:* No se exponen endpoints públicos `PUT`, `PATCH` ni `DELETE` sobre `/api/v1/admin/audit-logs`; los registros solo se insertan internamente desde la capa de servicios (`appendAuditLog`) al completarse transacciones de negocio (o mediante servicio interno autenticado para eventos de sesión cliente).

---

## 4. Parámetros de Filtrado y Columnas de Exportación CSV

### Query Params (`GET /api/v1/admin/audit-logs`)
- `search`: búsqueda textual en `action`, `detail`, `user`, `entityType`, `entityId`, `sessionMeta.ipAddress`, `sessionMeta.deviceBrowser`.
- `category`: `'all'` o cualquiera de los 9 valores de `AuditCategory`.
- `actionKind`: `'all' | 'create' | 'update' | 'delete' | 'status' | 'transaction' | 'access'`.
- `action`: coincidencia exacta de acción específica.
- `user`: filtro por actor (`userId` o nombre).
- `datePreset`: `'today' | '7d' | '30d' | 'all'`.
- `dateFrom` / `dateTo`: rango explícito `YYYY-MM-DD`.
- `page` / `pageSize` (default `50`, max `200`).

### Clasificación Automática (`actionKind`)
1. `crudOperation === 'DELETE'` o texto que mencione eliminación/baja -> `'delete'`
2. `crudOperation === 'CREATE'` o texto de creación/alta -> `'create'`
3. `category === 'session'` o texto de inicio de sesión / 2FA -> `'access'`
4. Texto de cambio de estado / aprobación / rechazo / pausa -> `'status'`
5. Texto de factura / pago / póliza / orden / traslado / inventario -> `'transaction'`
6. En otro caso -> `'update'`

### Exportación CSV (`aes-nexus-auditoria-YYYY-MM-DD.csv`)
Columnas exactas en orden:
`Fecha y hora`, `Timestamp ISO`, `Módulo`, `Tipo de acción`, `Operación CRUD`, `Entidad`, `ID Entidad`, `Acción`, `Detalle`, `Usuario`, `ID Usuario`, `Rol`, `IP`, `Dispositivo / Navegador`.
