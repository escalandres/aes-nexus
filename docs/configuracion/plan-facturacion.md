# Configuración · Plan, Facturación y Reinicio del Workspace (`/docs/configuracion/plan-facturacion.md`)

Especificación técnica para la gestión de la **Suscripción SaaS (`PlanSubscriptionSettings`)**, complementos (`PlanAddonsState`), historial de facturas CFDI de la suscripción (`PlanBillingInvoice`) y las operaciones controladas de reinicio de datos del espacio de trabajo en **AES Nexus**.

- **Endpoints REST:**
  - `GET / PUT /api/v1/settings/billing` (`PlanSubscriptionSettings`)
  - `PATCH /api/v1/settings/billing/tier` (cambio de plan `Growth | Enterprise | Corporate` y ciclo `monthly | annual`)
  - `PATCH /api/v1/settings/billing/payment-method` (actualización de medio de pago)
  - `GET /api/v1/settings/billing/invoices` (+ `GET /:id/cfdi`)
  - `POST /api/v1/settings/workspace/reset-transactional` (`onResetTransactionalData`)
  - `POST /api/v1/settings/workspace/reset-all` (`onResetAllWorkspaceData`)
- **Esquema JSON:** [`plan-facturacion.schema.json`](./plan-facturacion.schema.json)
- **Tablas PostgreSQL sugeridas:** `cfg_plan_subscriptions`, `cfg_plan_invoices`
- **Fuente en Frontend:** `src/data/settings.ts` (`PLAN_TIER_CATALOG`, `PLAN_ADDONS_CATALOG`, `PlanSubscriptionSettings`, `PlanBillingInvoice`, `PlanAddonsState`) y `src/components/SettingsSection.tsx`

---

## 1. Catálogo de Planes y Complementos (`PLAN_TIER_CATALOG` & `PLAN_ADDONS_CATALOG`)

| Plan (`PlanTier`) | Tarifa Mensual MXN | Máx. Usuarios | Máx. Almacenes | Bóveda GB | Límite CFDI/mes |
|---|---|---|---|---|---|
| `'Growth'` | `$8,900` | `10` | `2` | `25 GB` | `250` |
| `'Enterprise'` | `$14,900` | Ilimitados (`null`) | `10` | `100 GB` | Ilimitados (`null`) |
| `'Corporate'` | `$21,600` | Ilimitados (`null`) | Ilimitados (`null`) | `500 GB` | Ilimitados (`null`) |

### Add-ons (`PlanAddonsState`)
- `extraWarehouses` (`boolean`, `+$1,800 MXN/mes`): +5 almacenes adicionales.
- `speiH2H` (`boolean`, `+$2,400 MXN/mes`): Conector SPEI Host-to-Host.
- `auditArchive` (`boolean`, `+$950 MXN/mes`): Archivo fiscal y auditoría extendida a 7 años.

---

## 2. Entidad `PlanSubscriptionSettings` (`cfg_plan_subscriptions`)

| Campo | Tipo JSON | Obligatorio | Descripción |
|---|---|---|---|
| `tier` | `'Growth' \| 'Enterprise' \| 'Corporate'` | Sí | Plan contratado vigente |
| `billingCycle` | `'monthly' \| 'annual'` | Sí | Ciclo de facturación (anual aplica descuento prorrateado) |
| `autoRenew` | `boolean` | Sí | Renovación automática habilitada |
| `paymentBrand` | `'VISA' \| 'Mastercard' \| 'AMEX' \| 'SPEI'` | Sí | Franquicia o método de cobro |
| `paymentLast4` | `string` (4 dígitos) | Sí | Últimos 4 dígitos de tarjeta o CLABE |
| `paymentExpiry` | `string` (`MM/YYYY`) | Sí | Vigencia del instrumento de pago |
| `paymentHolder` | `string` | Sí | Nombre del tarjetahabiente / titular |
| `billingEmail` | `string` (email) | Sí | Correo receptor de facturas CFDI de suscripción |
| `nextBillingIso` | `string` (date-time) | Sí | Fecha ISO del próximo cargo |
| `storageUsedGb` | `number` (`>= 0`) | Sí | Almacenamiento XML/PDF consumido (calculado por backend) |
| `addons` | `PlanAddonsState` | Sí | Estado booleano de los 3 complementos |
| `billingInvoices` | `PlanBillingInvoice[]` | Sí | Historial de facturas (`id, folio, dateIso, periodLabel, concept, paymentMethod, subtotalMxn, taxMxn, amountMxn, status: 'paid' \| 'pending', cfdiUuid`) |

---

## 3. Reinicio Controlado de Datos del Workspace

El backend debe proteger estas operaciones destructivas detrás de confirmación explícita (`confirmationToken` / contraseña) y rol `Administrador` (`isFullAdmin === true`):

1. **`POST /api/v1/settings/workspace/reset-transactional` (`Operación Transaccional Limpia`):**
   - Limpia movimientos operativos y transaccionales (cotizaciones, pedidos, órdenes de compra, recepciones, CxC, CxP, pólizas, corridas de nómina, movimientos de kardex, lotes EBP) preservando catálogos maestros, estructura organizacional, usuarios, roles e integraciones.
2. **`POST /api/v1/settings/workspace/reset-all` (`Reinicio Total / Restauración de Fábrica`):**
   - Restaura todas las tablas del tenant al estado inicial semilla o plantilla limpia del entorno, invalidando cachés y registrando evento irreversible en `audit_logs` (`category: 'security'`).
