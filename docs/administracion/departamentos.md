# Administración · Departamentos (`Departments`)

Especificación funcional, modelo de datos y reglas de validación para la entidad **Departamentos y Áreas Operativas** (`/api/v1/admin/departments`).

---

## 1. Descripción Funcional

Define la estructura organizacional de áreas funcionales, sus líderes responsables, centros de costos contables (`CC-100`, etc.) y la vinculación múltiple (N:M) con las subsidiarias en las que operan. Alimenta directamente el catálogo de departamentos en **CRM → Empleados** y la segmentación presupuestaria/de gastos.

---

## 2. Campos Obligatorios vs. Opcionales (`CreateDepartmentDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `code` | `string` (max 32) | **Sí** | — | Código único del departamento (ej. `DIR-01`, `OPE-02`). Normalizado a `UPPERCASE`. |
| `name` | `string` (max 150) | **Sí** | — | Nombre oficial del departamento o área funcional. |
| `leader` | `string` (max 150) | **Sí** | — | Nombre del responsable o director del área. |
| `subsidiaryIds` | `string[]` | **Sí*** | `[]` | IDs de subsidiarias vinculadas. *Obligatorio (`minItems: 1`) cuando la organización ya tiene subsidiarias registradas.* |
| `costCenter` | `string` (max 40) | No | `null` | Código de centro de costos para imputación contable y presupuestos (ej. `CC-200`). |
| `description` | `string` (max 1000) | No | `null` | Descripción de funciones y alcance del área. |
| `active` | `boolean` | No | `true` | Estado operativo del departamento (`true` = Activo, `false` = Inactivo). |

### Campos Generados por el Servidor (`DepartmentRecord`)

- `id` (`string` / UUID, prefijo frontend `dep_<ts>`).
- `createdAt` (`date-time` ISO-8601), `updatedAt` (`date-time` ISO-8601).
- Opcional en listados/detalle: `employeesCount` (`integer`, conteo de colaboradores en `crm_employees`).

---

## 3. Endpoints REST

| Método | Ruta | Descripción | RBAC |
|---|---|---|---|
| `GET` | `/api/v1/admin/departments` | Lista filtrable por `search`, `subsidiaryId` y `status` | `Administración.Departamentos` (`read`) |
| `GET` | `/api/v1/admin/departments/:id` | Detalle de departamento con subsidiarias vinculadas | `Administración.Departamentos` (`read`) |
| `POST` | `/api/v1/admin/departments` | Alta de departamento y relaciones en `admin_department_subsidiaries` | `Administración.Departamentos` (`write`) |
| `PATCH` | `/api/v1/admin/departments/:id` | Edición de datos, líder, centro de costos y subsidiarias vinculadas | `Administración.Departamentos` (`write`) |
| `PATCH` | `/api/v1/admin/departments/:id/status` | Cambio rápido de estado (`active: boolean`) | `Administración.Departamentos` (`write`) |
| `POST` | `/api/v1/admin/departments/bulk-subsidiary-link` | Vinculación o desvinculación masiva de múltiples departamentos a una subsidiaria (`SubsidiaryDetailView`) | `Administración.Departamentos` (`write`) |
| `DELETE` | `/api/v1/admin/departments/:id` | Eliminación lógica o física (`409` opcional si existen empleados activos asignados) | `Administración.Departamentos` (`full`) |

---

## 4. Reglas de Negocio y Auditoría

1. **Unicidad de Código:** Rechazar con `409 Conflict` si existe otro departamento en el mismo `organization_id` con igual `code` (case-insensitive).
2. **Validación de Subsidiarias:** Todos los elementos de `subsidiaryIds` deben existir en `admin_subsidiaries` dentro del mismo tenant. Si existen subsidiarias registradas en la organización, rechazar `subsidiaryIds` vacío con `422 Unprocessable Entity`.
3. **Auditoría Granular vs. Masiva:**
   - Creación: `crudOperation: 'CREATE'`, `entityType: 'Departamento'`, detallando `code`, `name`, `leader` y códigos de subsidiarias.
   - Edición individual: registra diff por campo (`Código`, `Nombre`, `Líder`, `CC`, `Descripción`, `+Vinculado a`, `-Desvinculado de`, o cambio de estado).
   - Operación masiva (`bulk-subsidiary-link`): cuando desde la vista de detalle de una subsidiaria se vinculan o desvinculan varios departamentos a la vez, se emite **un único evento consolidado** (`Vinculación masiva de departamentos` / `Desvinculación masiva de departamentos`).
