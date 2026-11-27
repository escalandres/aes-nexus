# Centro de Ayuda · Soporte y Tickets (`/docs/inicio-y-soporte/soporte-tickets.md`)

Especificación técnica para la mesa de ayuda interna **Soporte y Tickets (`SupportTicketRecord` y `SupportTicketNote`)** dentro del Centro de Ayuda de **AES Nexus**.

- **Endpoints REST:**
  - `GET /api/v1/help-center/tickets` — Listado filtrable por `status`, `priority`, `moduleName` y búsqueda textual.
  - `POST /api/v1/help-center/tickets` — Alta de ticket con folio atómico `TKT-YYYY-NNN`.
  - `PATCH /api/v1/help-center/tickets/:id/status` — Cambio de estatus (`Abierto | En revisión | Resuelto`).
  - `POST /api/v1/help-center/tickets/:id/notes` — Agrega nota de seguimiento (`SupportTicketNote`).
- **Esquema JSON:** [`soporte-tickets.schema.json`](./soporte-tickets.schema.json)
- **Tablas PostgreSQL sugeridas:** `sup_tickets`, `sup_ticket_notes`
- **Fuente en Frontend:** `src/data/helpCenter.ts` (`SupportTicketRecord`, `SupportTicketNote`, `TicketPriority`, `TicketStatus`) y `src/components/HelpCenterSection.tsx`

---

## 1. Reglas de Negocio y Flujo de Estados

1. **Multi-Tenancy (H1):** Todo ticket pertenece a `organization_id` (`X-Organization-Id`) con unicidad `UNIQUE (organization_id, code)`.
2. **Folio Atómico:** Al crear un ticket, el backend asigna `code` secuencial `TKT-YYYY-NNN` (ej. `TKT-2026-004`).
3. **Máquina de Estados (`TicketStatus`):**
   - `'Abierto'` (estado inicial obligatorio al crear) ↔ `'En revisión'` → `'Resuelto'` (permite reapertura a `'En revisión'` si persiste la incidencia).
4. **Bitácora de Notas (`notes`):**
   - Cada nota registra `author`, `date` (timestamp ISO/legible) y `message`, y actualiza `updatedAt` del ticket padre.
5. **Auditoría:**
   - La creación de tickets, notas y cambios de estatus registran evento en `audit_logs` (`category: 'settings'`, `entityType: 'Ticket Centro de ayuda'`).

---

## 2. Entidad `SupportTicketRecord` (`sup_tickets`)

| Campo | Tipo JSON | Columna SQL | Obligatorio | Descripción |
|---|---|---|---|---|
| `id` | `string` | `id UUID PRIMARY KEY` | Sí | Identificador único del ticket (`tkt_...`) |
| `code` | `string` (`^TKT-\d{4}-\d{3,}$`) | `code VARCHAR(24) NOT NULL` | Sí | Folio visible secuencial (`TKT-2026-001`) |
| `subject` | `string` | `subject VARCHAR(200) NOT NULL` | Sí | Asunto breve de la solicitud o incidencia |
| `moduleName` | `string` | `module_name VARCHAR(80) NOT NULL` | Sí | Módulo afectado (ej. `Finanzas · Pagos EBP`, `Ventas`, `General`) |
| `priority` | `'Baja' \| 'Media' \| 'Alta'` | `priority VARCHAR(16) NOT NULL` | Sí | Nivel de urgencia |
| `status` | `'Abierto' \| 'En revisión' \| 'Resuelto'` | `status VARCHAR(24) NOT NULL` | Sí | Estado de atención |
| `requesterName` | `string` | `requester_name VARCHAR(160) NOT NULL` | Sí | Nombre del usuario solicitante |
| `createdAt` | `string` | `created_at TIMESTAMPTZ NOT NULL` | Sí | Fecha de apertura |
| `updatedAt` | `string` | `updated_at TIMESTAMPTZ NOT NULL` | Sí | Última actualización (cambio de estatus o nota) |
| `description` | `string` | `description TEXT NOT NULL` | Sí | Detalle técnico o funcional del reporte |
| `notes` | `SupportTicketNote[]` | `sup_ticket_notes` (1:N) | Sí | Hilo cronológico de respuestas (`id, author, date, message`) |

---

## 3. Seguridad y Permisos

- Cualquier usuario autenticado del espacio de trabajo puede consultar y abrir tickets de soporte (`POST /tickets`) asociados a su organización, y agregar notas de seguimiento en sus tickets.
- Los usuarios con rol `Administrador` pueden consultar todos los tickets de la organización y transicionar cualquier ticket entre `'Abierto'`, `'En revisión'` y `'Resuelto'`.
