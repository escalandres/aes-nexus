# CRM · Actividades (`Activities`)

Especificación funcional, modelo de datos y reglas de validación para la entidad **Actividades / Agenda Comercial** (`/api/v1/crm/activities`), basada en `src/data/dashboard.ts`, `src/components/CrmActivitiesSection.tsx` y `src/App.tsx`.

---

## 1. Descripción Funcional

Administra la agenda comercial de seguimientos, llamadas, envíos de propuestas y reuniones asociadas a clientes o prospectos. Soporta vista de lista y calendario (mensual y semanal), cambio rápido de estado (`Pendiente`, `Completada`, `Reprogramada`) y filtrado por fecha, tipo y estado.

---

## 2. Campos Obligatorios vs. Opcionales (`CreateActivityDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `title` | `string` (max 180) | **Sí** | — | Título o descripción corta de la actividad (ej. `"Enviar propuesta comercial"`). |
| `date` | `string` (`YYYY-MM-DD`) | **Sí** | Fecha actual CRM | Fecha programada en formato ISO-8601 (`date`). |
| `time` | `string` (`HH:mm`) | **Sí** | — | Hora programada en formato 24h (`^([01]\d|2[0-3]):[0-5]\d$`). |
| `company` | `string` (max 180) | No | `'Sin empresa'` | Empresa o cliente relacionado. |
| `clientId` | `string` (uuid) | No | `null` | FK opcional hacia `crm_customers(id)`. |
| `opportunityId` | `string` (uuid) | No | `null` | FK opcional hacia `crm_opportunities(id)`. |
| `icon` | `enum` | No | `'check'` | Tipo de seguimiento: `'send'` (Envío/Correo), `'phone'` (Llamada), `'check'` (Revisión/Reunión/Tarea). |
| `status` | `enum` | No | `'Pendiente'` | `'Pendiente'` \| `'Completada'` \| `'Reprogramada'`. |
| `owner` | `string` (max 150) | No | Usuario de sesión | Nombre del responsable asignado. |
| `ownerEmployeeId` | `string` (uuid) | No | `null` | FK opcional hacia `crm_employees(id)`. |
| `notes` | `string` (max 2000) | No | `null` | Puntos clave a tratar, acuerdos o contexto de seguimiento. |

### Campos Derivados / Generados por el Servidor (Salida `ActivityRecord`)

- `id` (`uuid` / `act_*`): Identificador único de la actividad.
- `tone` (`enum`): Derivado automáticamente de `icon`:
  - `'send'` → `'blue'`
  - `'phone'` → `'amber'`
  - `'check'` (u otros) → `'green'`
- `createdAt`, `updatedAt` (`date-time`).

---

## 3. Endpoints REST

| Método | Ruta | Descripción | RBAC |
|---|---|---|---|
| `GET` | `/api/v1/crm/activities` | Lista ordenable por `date, time` con filtros `search`, `status`, `icon`, `dateFrom`, `dateTo` + KPIs (`todayCount`, `thisWeekCount`, `pendingCount`, `completedCount`) | `CRM.Actividades` (`read`) |
| `GET` | `/api/v1/crm/activities/:id` | Detalle de actividad | `CRM.Actividades` (`read`) |
| `POST` | `/api/v1/crm/activities` | Programar nueva actividad | `CRM.Actividades` (`write`) |
| `PATCH` | `/api/v1/crm/activities/:id` | Editar título, empresa, fecha, hora, tipo, estado o notas | `CRM.Actividades` (`write`) |
| `PATCH` | `/api/v1/crm/activities/:id/toggle-complete` | Alternar rápidamente entre `Completada` y `Pendiente` | `CRM.Actividades` (`write`) |
| `DELETE` | `/api/v1/crm/activities/:id` | Eliminar actividad de la agenda | `CRM.Actividades` (`full`) |

---

## 4. Auditoría

Registrar en `audit_logs`:
- `crm.activity.created`
- `crm.activity.updated` / `crm.activity.status_changed`
- `crm.activity.deleted`
