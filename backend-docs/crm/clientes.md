# Módulo CRM · Submódulo Clientes (`Customers`)

Especificación técnica para la implementación del backend de **Clientes** en AES Nexus, alineada con los contratos actuales del frontend (`src/services/clientService.ts`, `src/components/DirectorySheetModal.tsx`, `src/data/countryLocalization.ts`, `src/data/accessControl.ts` y `src/App.tsx`).

---

## 1. Propósito y Alcance

El submódulo **Clientes** administra el directorio comercial de personas físicas y morales con relación comercial activa, en prospección o inactiva dentro de una organización (`X-Organization-Id`).

Además del CRUD principal, este recurso alimenta:
- **Ventas:** selección de clientes en Cotizaciones, Pedidos, Facturas de Venta y Devoluciones.
- **Finanzas (CxC):** cálculo de saldo pendiente por cobrar (`openBalance`), volumen histórico (`totalVolume`) y conteo de documentos (`documentsCount`).
- **CRM:** vinculación con Oportunidades y Agenda de Actividades.

---

## 2. Seguridad, Multi-Tenancy y RBAC

| Concepto | Valor / Regla |
|---|---|
| **Módulo RBAC** | `CRM` |
| **Sección RBAC** | `Clientes` |
| **Capability principal** | `crmClients` |
| **Niveles de acceso** | `none` (sin acceso), `read` (`GET`), `write` (`GET`, `POST`, `PUT`, `PATCH`), `full` (incluye `DELETE`) |
| **Aislamiento Tenant** | Toda consulta y mutación debe filtrar obligatoriamente por `organization_id` proveniente de la sesión/token y validado contra `X-Organization-Id`. |

---

## 3. Endpoints REST (`/api/v1/crm/customers`)

### 3.1 Listar clientes
`GET /api/v1/crm/customers`

**Query Parameters:**
- `search` *(string, opcional)*: búsqueda case-insensitive sobre `clientCode`, `name`, `company`, `email`, `rfc` (Tax ID) y `country`.
- `status` *(enum, opcional)*: `Activo` | `Prospecto` | `Inactivo`. Omitir o enviar `Todos` devuelve todos los estados.
- `country` *(string ISO-2, opcional)*: filtra por país principal del cliente (ej. `MX`, `ES`, `VE`, `US`).
- `entityType` *(enum, opcional)*: `company` | `individual`.
- `includeAddresses` *(boolean, default `true`)*: incluye arreglo `addresses[]` en cada elemento.
- `includeFinancialSummary` *(boolean, default `false`)*: adjunta `openBalance`, `totalVolume` y `documentsCount` calculados desde CxC.
- `page` *(number, default `1`)* y `pageSize` *(number, default `50`, máx `200`)*.

### 3.2 Obtener detalle de cliente (Ficha)
`GET /api/v1/crm/customers/:id`

Devuelve el registro completo (`ClientRecord`) junto con sus direcciones (`addresses[]`) y métricas financieras calculadas (`openBalance`, `totalVolume`, `documentsCount`).

### 3.3 Crear cliente
`POST /api/v1/crm/customers`

- **Payload de entrada:** `CreateClientDTO` (ver `clientes.schema.json`).
- **Respuesta exitosa:** `201 Created` con `ClientRecord` persistido.
- **Reglas automáticas de servidor:**
  1. Si `clientCode` no se envía, opcionalmente generar código secuencial por organización (`CLI-001`, `CLI-002`, ...) o permitir `null` si se captura manualmente después; si se envía, validar unicidad por `organization_id`.
  2. Normalizar `rfc` a mayúsculas y sin espacios extra.
  3. Generar `initials` (2 letras) y `color` (`lilac` | `peach` | `sage` | `blue` | `amber`) si el cliente API requiere persistencia visual consistente.
  4. Si se envían `addresses[]`, persistirlas en la tabla hija `crm_customer_addresses`. Si no se envía `addresses[]` pero sí `city` / `state` / `country`, sincronizar los campos base y opcionalmente crear dirección primaria.
  5. Establecer `lastActivityAt = NOW()` (`lastActivity` formateado o ISO).

### 3.4 Actualizar cliente
`PATCH /api/v1/crm/customers/:id` (o `PUT /api/v1/crm/customers/:id`)

- **Payload de entrada:** `UpdateClientDTO`.
- Permite actualizar datos generales, fiscales, condiciones comerciales, país, notas y reemplazar/sincronizar `addresses[]`.
- Actualiza `updated_at` y `last_activity_at`.

### 3.5 Cambio rápido de estado
`PATCH /api/v1/crm/customers/:id/status`

- **Payload de entrada:** `{ "status": "Activo" | "Prospecto" | "Inactivo" }`.
- Usado por los botones de acción rápida en `DirectorySheetModal`.

### 3.6 Eliminar cliente (Soft Delete recomendado)
`DELETE /api/v1/crm/customers/:id`

- Requiere nivel RBAC `full` (`DELETE`).
- **Regla de integridad:** Si existen pedidos, facturas o movimientos de CxC asociados, aplicar **soft delete** (`deleted_at = NOW()`, `status = 'Inactivo'`) o rechazar con `409 Conflict` según política contable de la organización.

---

## 4. Modelo de Datos Relacional Sugerido (PostgreSQL)

### Tabla `crm_customers`

| Columna | Tipo PostgreSQL | Null | Default | Descripción |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | PK interno (expuesto en API como `id`, prefijo opcional en vistas `cli_*`) |
| `organization_id` | `uuid` | NO | — | FK a `organizations(id)` (aislamiento multi-tenant) |
| `client_code` | `varchar(40)` | SÍ | `NULL` | Código externo o de catálogo (`CLI-001`). Único por `(organization_id, client_code)` donde no sea nulo |
| `entity_type` | `varchar(20)` | NO | `'company'` | `'company'` \| `'individual'` |
| `company` | `varchar(180)` | NO | — | Razón social o nombre comercial principal |
| `name` | `varchar(150)` | NO | — | Nombre del contacto principal |
| `email` | `varchar(180)` | NO | — | Correo electrónico principal |
| `phone` | `varchar(40)` | SÍ | `NULL` | Teléfono de contacto |
| `tax_id` | `varchar(24)` | SÍ | `NULL` | En API JSON se serializa como `rfc` (RFC / NIF / CIF / RIF / Tax ID según país) |
| `status` | `varchar(20)` | NO | `'Activo'` | `'Activo'` \| `'Prospecto'` \| `'Inactivo'` |
| `currency` | `char(3)` | NO | `'MXN'` | Código ISO-4217 (`MXN`, `USD`, `EUR`, `VES`, etc.) |
| `payment_terms` | `varchar(40)` | NO | `'Contado'` | `'Contado'`, `'Crédito 15 días'`, `'Crédito 30 días'`, `'Crédito 60 días'` |
| `country` | `varchar(8)` | NO | `'MX'` | Código ISO-3166-1 alpha-2 (`MX`, `ES`, `VE`, `US`, etc.) o `'GLOBAL'` |
| `city` | `varchar(120)` | SÍ | `NULL` | Ciudad principal (sincronizada con `addresses[0].city` si existe) |
| `state` | `varchar(120)` | SÍ | `NULL` | Estado / Provincia principal |
| `notes` | `text` | SÍ | `NULL` | Notas y acuerdos comerciales |
| `initials` | `varchar(4)` | NO | — | Iniciales para avatar (2 caracteres) |
| `color` | `varchar(16)` | NO | `'blue'` | Token de color avatar (`lilac`, `peach`, `sage`, `blue`, `amber`) |
| `last_activity_at` | `timestamptz` | NO | `now()` | Marca temporal de última actividad (proyectada en `lastActivity`) |
| `created_at` | `timestamptz` | NO | `now()` | Fecha de creación |
| `updated_at` | `timestamptz` | NO | `now()` | Última modificación |
| `deleted_at` | `timestamptz` | SÍ | `NULL` | Borrado lógico |

### Tabla `crm_customer_addresses`

| Columna | Tipo PostgreSQL | Null | Default | Descripción |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | PK de la dirección |
| `organization_id` | `uuid` | NO | — | FK a `organizations(id)` |
| `customer_id` | `uuid` | NO | — | FK a `crm_customers(id)` (`ON DELETE CASCADE`) |
| `street` | `varchar(200)` | SÍ | `NULL` | Calle y número / piso / interior |
| `colony` | `varchar(140)` | SÍ | `NULL` | Subdivisión territorial localizada (Colonia MX, Barrio ES, Parroquia VE, Distrito GLOBAL) |
| `city` | `varchar(120)` | SÍ | `NULL` | Ciudad o municipio |
| `state` | `varchar(120)` | SÍ | `NULL` | Estado (MX/VE), Provincia/Comunidad (ES) o Región |
| `zip_code` | `varchar(20)` | SÍ | `NULL` | Código postal / Zona postal |
| `country` | `varchar(8)` | NO | `'MX'` | País de esta dirección específica |
| `is_shipping` | `boolean` | NO | `true` | Habilitada para envío/entregas |
| `is_billing` | `boolean` | NO | `true` | Habilitada para facturación fiscal |
| `sort_order` | `integer` | NO | `0` | Orden de despliegue (`addresses[0]` es la primaria) |
| `created_at` | `timestamptz` | NO | `now()` | Fecha de registro |

---

## 5. Reglas Multi-País (Localización Fiscal y Territorial)

El campo de entrada `rfc` y los campos territoriales cambian de etiqueta, formato y validación según el país del cliente (`country`) o de la dirección (`addresses[i].country`):

| País (`country`) | Campo `rfc` (Etiqueta) | Regla / Regex de validación (cuando `rfc` se envía) | Campo `colony` | Campo `state` | Campo `zipCode` | Moneda por defecto sugerida |
|---|---|---|---|---|---|---|
| **MX** (México) | `RFC` | `^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$` (12 Moral / 13 Física) | `Colonia / Alcaldía` | `Estado` | `Código postal` | `MXN` |
| **ES** (España) | `NIF / CIF` | `^([A-HJNPQRSUVW]\d{7}[0-9A-J]|\d{8}[A-Z]|[XYZ]\d{7}[A-Z])$` (9 caracteres AEAT) | `Barrio / Distrito` | `Provincia / Comunidad` | `Código postal` | `EUR` (o `USD`/`MXN`) |
| **VE** (Venezuela) | `RIF` | `^[JGVEPC]-?\d{8}-?\d$` (Prefijo SENIAT + 9 dígitos) | `Parroquia / Urbanización` | `Estado` | `Zona postal` | `VES` (o `USD`) |
| **GLOBAL** / Otros (`US`, `CO`, etc.) | `Tax ID` | Mínimo 5 caracteres `^[A-Z0-9-]+$` | `Distrito / Zona` | `Estado / Región` | `Código postal` | `USD` |

> **Nota sobre compatibilidad frontend:** Aunque el frontend actual (`clientService.ts` y `DirectorySheetModal.tsx`) restringe el selector de moneda de cliente a `'MXN' | 'USD'`, el backend debe aceptar cualquier código ISO-4217 soportado en `countryLocalization.ts` (`MXN`, `USD`, `EUR`, `VES`, `COP`, `BRL`) para habilitar multimoneda completa en H3.

---

## 6. Reglas de Negocio y Validación en Servidor

1. **Campos obligatorios en alta (`POST`):** `company`, `name`, `email`. (Si en una integración externa `company` viene vacío cuando `entityType === 'individual'`, el servidor puede hacer fallback a `name`, igual que el modal del frontend).
2. **Normalización automática:**
   - `email`: `trim().toLowerCase()` y validación de formato RFC 5322.
   - `rfc`: `trim().toUpperCase()`. Validar con el perfil de `country` si viene no vacío.
   - `clientCode`: `trim()` (opcional; único por `organization_id`).
   - `phone`: si no se envía en `POST`, puede guardarse `null` en BD y devolverse `""` o `"Sin teléfono"` en UI.
3. **Coherencia de direcciones:**
   - Si una dirección enviada en `addresses[]` no tiene `street`, `city` ni `zipCode`, descartarla o devolver `422 Unprocessable Entity`.
   - Si `addresses[i].country` viene vacío, heredar el `country` del cliente.
   - Si `city`/`state` raíz no se envían pero `addresses[0]` sí los tiene, poblar `city`/`state` raíz desde `addresses[0]`.
4. **Eventos de Auditoría (`audit_logs`):**
   - `crm.customer.created` al crear cliente.
   - `crm.customer.updated` al editar ficha o direcciones.
   - `crm.customer.status_changed` al cambiar estado (`Activo` / `Prospecto` / `Inactivo`).
   - `crm.customer.deleted` al eliminar o desactivar lógicamente.

---

## 7. Códigos de Error Esperados

| HTTP | Código interno | Cuándo ocurre |
|---|---|---|
| `400` | `INVALID_PAYLOAD` | JSON malformado o tipos de datos inválidos |
| `401` | `UNAUTHORIZED` | Token ausente o expirado |
| `403` | `FORBIDDEN` | Usuario sin capability `crmClients` o nivel insuficiente en `CRM.Clientes` |
| `404` | `CUSTOMER_NOT_FOUND` | El `id` no existe dentro del `X-Organization-Id` activo |
| `409` | `DUPLICATE_CLIENT_CODE` / `DUPLICATE_TAX_ID` / `CUSTOMER_HAS_DOCUMENTS` | Conflicto de unicidad o restricción al eliminar |
| `422` | `VALIDATION_ERROR` | Error de validación de email, formato fiscal por país (`RFC`/`NIF`/`RIF`), o dirección vacía |
