# CRM · Oportunidades (`Opportunities`)

Especificación funcional, modelo de datos y reglas de validación para la entidad **Oportunidades** (`/api/v1/crm/opportunities`), basada en `src/data/dashboard.ts` y `src/App.tsx`.

---

## 1. Descripción Funcional

Administra el pipeline comercial de oportunidades de venta desde la calificación inicial hasta el cierre (`Calificada`, `Propuesta`, `Negociación`, `Ganada`, `Perdida`). Alimenta los KPIs del Resumen CRM, el Tablero Ejecutivo y la conversión hacia Ventas (`Cotizaciones` / `Pedidos`).

---

## 2. Campos Obligatorios vs. Opcionales (`CreateOpportunityDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `company` | `string` (max 180) | **Sí** | — | Nombre de la empresa o prospecto comercial. |
| `person` | `string` (max 150) | No | `'Sin contacto'` | Nombre del contacto principal de la oportunidad. |
| `value` | `number` (`>= 0`) | No | `0` | Valor económico estimado de la oportunidad. Persistir como `numeric(14,2)`. |
| `currency` | `enum` (ISO-4217) | No | `'MXN'` | Moneda del monto estimado (`MXN`, `USD`, `EUR`, `VES`). |
| `stage` | `enum` | No | `'Calificada'` | `'Calificada'` \| `'Propuesta'` \| `'Negociación'` \| `'Ganada'` \| `'Perdida'`. |
| `date` | `string` (max 40) | No | `'Ahora'` / fecha ISO | Fecha de seguimiento o cierre estimado (en backend guardar `follow_up_date` o etiqueta legible). |
| `clientId` | `string` (uuid) | No | `null` | FK opcional hacia `crm_customers(id)` cuando la empresa ya existe en Clientes. |
| `ownerEmployeeId` | `string` (uuid) | No | `null` | FK opcional hacia `crm_employees(id)` (ejecutivo responsable). |
| `notes` | `string` (max 2000) | No | `null` | Notas de negociación y próximos pasos. |

### Campos Derivados / Generados por el Servidor (Salida `OpportunityRecord`)

- `id` (`uuid`): Identificador único de la oportunidad.
- `initials` (`string`, 2 caracteres): Primeras letras de las dos primeras palabras de `company`, fallback `'OP'`.
- `color` (`enum`): `'lilac' | 'peach' | 'sage' | 'blue' | 'amber'` (default `'blue'` en alta).
- `stageTone` (`enum`): Derivado automáticamente de `stage`:
  - `'Negociación'` → `'amber'`
  - `'Calificada'` o `'Ganada'` → `'green'`
  - `'Propuesta'` o `'Perdida'` (y otros) → `'blue'`
- `createdAt`, `updatedAt` (`date-time`).

---

## 3. Endpoints REST

| Método | Ruta | Descripción | RBAC |
|---|---|---|---|
| `GET` | `/api/v1/crm/opportunities` | Lista de oportunidades + resumen de pipeline (`totalValue`, `openCount`, `winRate`) | `CRM.Oportunidades` (`read`) |
| `GET` | `/api/v1/crm/opportunities/:id` | Detalle de oportunidad | `CRM.Oportunidades` (`read`) |
| `POST` | `/api/v1/crm/opportunities` | Alta de oportunidad en el pipeline | `CRM.Oportunidades` (`write`) |
| `PATCH` | `/api/v1/crm/opportunities/:id` | Actualización de etapa, monto, contacto o fecha | `CRM.Oportunidades` (`write`) |
| `DELETE` | `/api/v1/crm/opportunities/:id` | Eliminación de oportunidad | `CRM.Oportunidades` (`full`) |

---

## 4. Reglas de Negocio y Auditoría

1. **No negatividad del monto:** `value` debe ser mayor o igual a `0`.
2. **Consistencia de `stageTone`:** El backend debe recalcular `stageTone` cada vez que cambia `stage`.
3. **Métricas agregadas del endpoint `GET`:** Calcular `conversionRate = count(Ganada) / count(Ganada + Perdida)` (o pipeline histórico configurado) para reemplazar el porcentaje estático en frontend.
4. **Auditoría:** Registrar `crm.opportunity.created`, `crm.opportunity.updated` (incluyendo cambio de etapa) y `crm.opportunity.deleted`.
