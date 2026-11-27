# CRM · Proveedores (`Vendors / Suppliers`)

Especificación funcional, modelo de datos y reglas de validación para la entidad **Proveedores** (`/api/v1/crm/vendors`), incluyendo direcciones múltiples y cuentas bancarias para dispersión electrónica (**EBP**).

---

## 1. Descripción Funcional

Administra las empresas y contactos que suministran mercancías o servicios a la organización. Alimenta los módulos de **Compras** (requisiciones, órdenes de compra, recepciones, facturas de proveedor, devoluciones) y **Finanzas** (Cuentas por Pagar y lotes de pago electrónico EBP).

---

## 2. Campos Obligatorios vs. Opcionales (`CreateVendorDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `name` | `string` (max 150) | **Sí** | — | Nombre del contacto principal. |
| `company` | `string` (max 180) | **Sí** | — | Razón social o empresa proveedora (fallback a `name` si se omite en integraciones). |
| `email` | `string` (email, max 180) | **Sí** | — | Correo electrónico principal del proveedor. |
| `country` | `string` (ISO-2 \| `GLOBAL`) | **Sí** | `'MX'` | País fiscal/operativo principal. |
| `supplierCode` | `string` (max 40) | No | `null` | Código externo o de catálogo (ej. `PRV-001`). Único por `organization_id`. |
| `entityType` | `enum` | No | `'company'` | `'company'` \| `'individual'`. |
| `phone` | `string` (max 40) | No | `""` | Teléfono de contacto. |
| `rfc` | `string` (max 24) | No | `null` | Identificador fiscal según país (`RFC` / `NIF-CIF` / `RIF` / `Tax ID`). |
| `status` | `enum` | No | `'Activo'` | `'Activo'` \| `'Prospecto'` \| `'Inactivo'`. |
| `currency` | `enum` (ISO-4217) | No | `'MXN'` | Moneda comercial principal (`MXN`, `USD`, `EUR`, `VES`, `COP`, `BRL`). |
| `paymentTerms` | `enum` | No | `'Contado'` | `'Contado'`, `'Crédito 15 días'`, `'Crédito 30 días'`, `'Crédito 60 días'`. |
| `city` | `string` (max 120) | No | `null` | Ciudad principal (sincronizada con `addresses[0].city`). |
| `state` | `string` (max 120) | No | `null` | Estado/Provincia principal. |
| `notes` | `string` (max 2000) | No | `null` | Condiciones comerciales, acuerdos de entrega u observaciones. |
| `addresses` | `VendorAddress[]` | No | `[]` | Direcciones fiscales y de recolección/entrega. |
| `bankAccounts` | `SupplierBankAccount[]` | No | `[]` | Cuentas bancarias multi-moneda para dispersión EBP. |

### Campos Bancarios Planos de Compatibilidad (Primary Mirror)
En el frontend actual (`DirectoryRecord`), la cuenta predeterminada activa (`isDefault === true`) se proyecta también en el objeto raíz:
- `bankName` (`string`), `clabe` (`string`, ruteo bancario según país), `accountNumber` (`string`), `defaultReference` (`string`), `bankPackValues` (`Record<packId, Record<fieldKey, string>>`).

### Sub-entidad `SupplierBankAccount` (`crm_vendor_bank_accounts`)

| Campo | Tipo | Obligatorio | Default | Descripción |
|---|---|---|---|---|
| `id` | `string` | No (generado) | UUID | Identificador único de la cuenta bancaria. |
| `alias` | `string` (max 100) | **Sí** | — | Nombre identificador (ej. `"BBVA Principal Mercancía"`). |
| `bankName` | `string` (max 100) | **Sí** | — | Institución bancaria receptora. En MX puede autodetectarse por los primeros 3 dígitos de `clabe` (`BANXICO_BANK_NAMES`). |
| `clabe` | `string` (max 34) | **Sí** | — | Ruteo bancario validado por país: CLABE 18 dígitos Mod-10 (`MX`), IBAN SEPA (`ES`), Cuenta 20 dígitos SUDEBAN (`VE`), IBAN/Routing (`GLOBAL`). |
| `currency` | `enum` | **Sí** | `'MXN'` | `'MXN'` \| `'USD'` \| `'EUR'`. |
| `accountNumber` | `string` (max 34) | No | `null` | Número de cuenta o últimos dígitos. |
| `defaultReference` | `string` (max 40) | No | `null` | Referencia numérica predeterminada para pagos EBP. |
| `isDefault` | `boolean` | No | `false` | Solo una cuenta activa puede ser predeterminada por proveedor (si hay cuentas activas, al menos una debe ser `isDefault: true`). |
| `active` | `boolean` | No | `true` | Si la cuenta ha sido usada en lotes EBP históricos, no se elimina físicamente; se desactiva (`active: false`, `isDefault: false`). |
| `bankPackValues` | `object` | No | `{}` | Valores dinámicos por Pack EBP (`{ [packId]: { [fieldKey]: string } }`). |

---

## 3. Endpoints REST

| Método | Ruta | Descripción | RBAC |
|---|---|---|---|
| `GET` | `/api/v1/crm/vendors` | Lista de proveedores con filtros `search`, `status`, `country` | `CRM.Proveedores` (`read`) |
| `GET` | `/api/v1/crm/vendors/:id` | Ficha completa con direcciones, cuentas EBP y resumen CxP | `CRM.Proveedores` (`read`) |
| `POST` | `/api/v1/crm/vendors` | Alta de proveedor, direcciones y cuenta(s) EBP | `CRM.Proveedores` (`write`) |
| `PATCH` | `/api/v1/crm/vendors/:id` | Actualización de datos comerciales y fiscales | `CRM.Proveedores` (`write`) |
| `PUT` | `/api/v1/crm/vendors/:id/bank-accounts` | Sincronización de cuentas bancarias y parámetros de packs EBP | `CRM.Proveedores` (`write`) |
| `PATCH` | `/api/v1/crm/vendors/:id/status` | Cambio rápido de estado (`Activo`/`Prospecto`/`Inactivo`) | `CRM.Proveedores` (`write`) |
| `DELETE` | `/api/v1/crm/vendors/:id` | Borrado lógico o `409` si existen facturas CxP o lotes EBP | `CRM.Proveedores` (`full`) |

---

## 4. Reglas de Integridad y Negocio

1. **Validación Bancaria por País:**
   - **MX:** 18 dígitos con algoritmo verificador Banxico Módulo-10 (`validateClabeMod10`).
   - **ES:** `^ES\d{22}$` o IBAN internacional `^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$`.
   - **VE:** Exactamente 20 dígitos numéricos (`^\d{20}$`, SUDEBAN).
   - **GLOBAL:** Alfanumérico 8 a 34 caracteres (`^[A-Z0-9-]{8,34}$`).
2. **Protección Histórica EBP:** Una cuenta bancaria referenciada en `electronic_payment_batch_lines` nunca debe eliminarse; se marca `active = false`.
3. **Auditoría:** Registrar `crm.vendor.created`, `crm.vendor.updated`, `crm.vendor.bank_accounts_updated`, `crm.vendor.status_changed` y `crm.vendor.deleted`.
