# CRM · Clientes (`Customers`)

Especificación funcional, modelo de datos y reglas de validación para la entidad **Clientes** (`/api/v1/crm/customers`).

---

## 1. Descripción Funcional

Administra el catálogo de personas físicas/naturales y empresas/personas morales con las que la organización mantiene una relación comercial. Sirve como fuente maestra para Ventas (cotizaciones, pedidos, facturas, devoluciones), Finanzas (Cuentas por Cobrar) y CRM (Oportunidades y Actividades).

---

## 2. Campos Obligatorios vs. Opcionales (`CreateClientDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `company` | `string` (max 180) | **Sí** | — | Razón social o nombre comercial. Si `entityType === 'individual'` y llega vacío en integraciones, fallback a `name`. |
| `name` | `string` (max 150) | **Sí** | — | Nombre del contacto principal. |
| `email` | `string` (email, max 180) | **Sí** | — | Correo electrónico principal; normalizado a minúsculas. |
| `clientCode` | `string` (max 40) | No | `null` | Código externo o de catálogo (ej. `CLI-001`). Único por `organization_id` cuando se informa. |
| `entityType` | `enum` | No | `'company'` | `'company'` \| `'individual'`. |
| `phone` | `string` (max 40) | No | `""` | Teléfono de contacto. |
| `rfc` | `string` (max 24) | No | `null` | Identificador fiscal normalizado a mayúsculas (`RFC` en MX, `NIF/CIF` en ES, `RIF` en VE, `Tax ID` en GLOBAL). |
| `status` | `enum` | No | `'Activo'` | `'Activo'` \| `'Prospecto'` \| `'Inactivo'`. |
| `country` | `string` (ISO-2 \| `GLOBAL`) | No | `'MX'` | País fiscal principal del cliente. |
| `currency` | `enum` (ISO-4217) | No | `'MXN'` | `'MXN'`, `'USD'`, `'EUR'`, `'VES'`, `'COP'`, `'BRL'`. |
| `paymentTerms` | `enum` | No | `'Contado'` | `'Contado'`, `'Crédito 15 días'`, `'Crédito 30 días'`, `'Crédito 60 días'`. |
| `city` | `string` (max 120) | No | `null` | Ciudad principal (sincronizada con `addresses[0].city`). |
| `state` | `string` (max 120) | No | `null` | Estado/Provincia principal (sincronizada con `addresses[0].state`). |
| `notes` | `string` (max 2000) | No | `null` | Notas y acuerdos comerciales. |
| `addresses` | `ClientAddress[]` | No | `[]` | Lista de direcciones de envío y/o facturación. |

### Sub-entidad `ClientAddress`

| Campo | Tipo | Obligatorio | Default | Descripción |
|---|---|---|---|---|
| `id` | `string` | No (generado) | UUID | Identificador de dirección. |
| `street` | `string` (max 200) | Condicional* | — | Calle, número y referencias. |
| `colony` | `string` (max 140) | No | `null` | Subdivisión localizada: Colonia (MX), Barrio (ES), Parroquia (VE), Distrito (GLOBAL). |
| `city` | `string` (max 120) | Condicional* | — | Ciudad o municipio. |
| `state` | `string` (max 120) | No | `null` | Estado (MX/VE), Provincia/Comunidad (ES), Región (GLOBAL). |
| `zipCode` | `string` (max 20) | Condicional* | — | Código postal (MX/ES/GLOBAL) o Zona postal (VE). |
| `country` | `string` (max 8) | No | `customer.country` | País de la dirección. |
| `isShipping` | `boolean` | No | `true` | Dirección habilitada para envíos/entregas. |
| `isBilling` | `boolean` | No | `true` | Dirección habilitada para facturación fiscal. |

*\*Cada dirección debe incluir al menos uno de: `street`, `city` o `zipCode`.*

### Campos Generados por el Servidor (Salida `ClientRecord`)

- `id` (`uuid`), `initials` (`string`, 2 letras), `color` (`'lilac' | 'peach' | 'sage' | 'blue' | 'amber'`), `lastActivity` (`string`), `address` (`ClientAddress`, espejo de `addresses[0]`), `createdAt` (`date-time`), `updatedAt` (`date-time`).
- Opcional en detalle (`GET /:id` o `?includeFinancialSummary=true`): `openBalance` (`number`), `totalVolume` (`number`), `documentsCount` (`integer`).

---

## 3. Endpoints REST

| Método | Ruta | Descripción | RBAC |
|---|---|---|---|
| `GET` | `/api/v1/crm/customers` | Lista paginada con filtros `search`, `status`, `country`, `entityType` | `CRM.Clientes` (`read`) |
| `GET` | `/api/v1/crm/customers/:id` | Ficha completa con direcciones y resumen CxC | `CRM.Clientes` (`read`) |
| `POST` | `/api/v1/crm/customers` | Alta de cliente y direcciones | `CRM.Clientes` (`write`) |
| `PATCH` | `/api/v1/crm/customers/:id` | Edición parcial de ficha y direcciones | `CRM.Clientes` (`write`) |
| `PATCH` | `/api/v1/crm/customers/:id/status` | Cambio rápido de estado (`Activo`/`Prospecto`/`Inactivo`) | `CRM.Clientes` (`write`) |
| `DELETE` | `/api/v1/crm/customers/:id` | Eliminación lógica (`deleted_at`) o `409` si tiene documentos CxC | `CRM.Clientes` (`full`) |

---

## 4. Validaciones Fiscales Multi-País (`rfc`)

- **MX:** `^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$` (12 chars Persona Moral / 13 chars Persona Física).
- **ES:** `^([A-HJNPQRSUVW]\d{7}[0-9A-J]|\d{8}[A-Z]|[XYZ]\d{7}[A-Z])$` (9 chars CIF/NIF/NIE).
- **VE:** `^[JGVEPC]-?\d{8}-?\d$` (RIF SENIAT).
- **GLOBAL:** `^[A-Z0-9-]{5,24}$`.
