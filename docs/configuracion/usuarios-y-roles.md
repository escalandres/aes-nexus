# Configuración · Usuarios y Roles RBAC (`/docs/configuracion/usuarios-y-roles.md`)

Especificación técnica para la gestión de **Usuarios del Espacio de Trabajo (`WorkspaceUserRecord`)** y **Perfiles/Roles Granulares (`RoleDefinition`)** con matriz de 5 niveles por sección en **AES Nexus**.

- **Endpoints REST:**
  - `GET / POST / PUT / DELETE /api/v1/settings/users`
  - `PATCH /api/v1/settings/users/:id/status` (activar / suspender acceso)
  - `GET / POST / PUT / DELETE /api/v1/settings/roles`
  - `GET / PUT /api/v1/settings/roles/default-new-user` (`defaultNewUserRole`)
- **Esquema JSON:** [`usuarios-y-roles.schema.json`](./usuarios-y-roles.schema.json)
- **Tablas PostgreSQL sugeridas:** `cfg_workspace_users`, `cfg_roles`, `cfg_user_roles`
- **Fuente en Frontend:** `src/data/settings.ts` y `src/data/accessControl.ts`

---

## 1. Modelo RBAC Granular (`5 Niveles × 9 Módulos`)

Cada `RoleDefinition` define permisos por módulo y sección (`sectionPermissions: Record<SystemModuleName, Record<string, SectionAccessLevel>>`):

| Nivel (`SectionAccessLevel`) | Rango (`rank`) | Etiqueta | Métodos HTTP Permitidos |
|---|---|---|---|
| `'none'` | `0` | Sin acceso | Ninguno (módulo/sección oculta y bloqueada) |
| `'view'` | `1` | Ver | `GET` |
| `'create'` | `2` | Crear | `GET`, `POST` |
| `'edit'` | `3` | Editar | `GET`, `POST`, `PUT` |
| `'full'` | `4` | Completo | `GET`, `POST`, `PUT`, `DELETE` |

### Reglas Clave del Motor RBAC
1. **Unión Multi-Rol (`maxSectionAccessLevel`):** Un usuario puede tener múltiples roles en `roles[]`. El acceso efectivo por sección es siempre el **nivel máximo** (`rank` más alto) otorgado por cualquiera de sus roles asignados.
2. **Inmutabilidad del Administrador General (`isGeneralAdminRole`):** El rol `Administrador` (`builtInKey: 'admin'`) conserva nivel `'full'` en todas las secciones, nunca tiene `forApiIntegration = true` y no puede degradarse ni eliminarse.
3. **Roles Exclusivos para API (`forApiIntegration: true`):** Permiten asignar permisos granulares a conectores externos (`ExternalIntegrationRecord`) sin aparecer como rol operativo humano predeterminado ni consumir asiento de usuario.
4. **Puente de Compatibilidad (`deriveCapabilitiesFromSectionPermissions`):** Al guardar `sectionPermissions`, el backend deriva automáticamente el arreglo legado `capabilities: RoleCapabilityId[]` para compatibilidad con compuertas transversales.
5. **Rol por Defecto (`defaultNewUserRole`):** Determina el rol preseleccionado al invitar/crear nuevos usuarios (fallback `'Operaciones'`).

---

## 2. Entidad `WorkspaceUserRecord` (`cfg_workspace_users`)

| Campo | Tipo JSON | Columna SQL | Obligatorio | Descripción |
|---|---|---|---|---|
| `id` | `string` | `id UUID PRIMARY KEY` | Sí | Identificador único (`usr_...`) |
| `name` | `string` | `name VARCHAR(160) NOT NULL` | Sí | Nombre completo del colaborador |
| `email` | `string` (email) | `email VARCHAR(180) NOT NULL` | Sí | Correo corporativo (`UNIQUE (organization_id, email)`) |
| `role` | `string` (`RoleKey`) | `primary_role_id VARCHAR(80)` | Sí | Rol principal asignado |
| `roles` | `string[]` | `cfg_user_roles` (M:N) | Opcional | Arreglo completo de roles asignados (multi-rol) |
| `status` | `'active' \| 'suspended'` | `status VARCHAR(20) NOT NULL` | Sí | Estatus operativo (`suspended` bloquea autenticación y endpoints) |
| `lastLogin` | `string` | `last_login_label VARCHAR(120)` | Sí | Fecha/descripción legible o ISO del último acceso |
| `avatarInitials` | `string` (`2..3` chars) | `avatar_initials VARCHAR(4)` | Sí | Iniciales para avatar en Topbar y tabla |

---

## 3. Entidad `RoleDefinition` (`cfg_roles`)

| Campo | Tipo JSON | Obligatorio | Descripción |
|---|---|---|---|
| `id` | `string` | Sí | Clave única del rol (`Administrador`, `Operaciones`, `Ventas`, `Finanzas`, o `role_<slug>`) |
| `name` | `string` | Sí | Nombre legible del perfil |
| `description` | `string` | Sí | Descripción de responsabilidades del rol |
| `capabilities` | `RoleCapabilityId[]` | Sí | Arreglo de 16 capabilities posibles derivadas de la matriz |
| `sectionPermissions` | `Record<string, Record<string, SectionAccessLevel>>` | Opcional | Matriz completa módulo → sección → nivel (`none..full`) |
| `builtInKey` | `'admin' \| 'ops' \| 'sales' \| 'fin'` | Opcional | Marca si es un rol integrado de fábrica |
| `forApiIntegration` | `boolean` | Opcional | Si es `true`, perfil destinado a integraciones API externas |

---

## 4. Seguridad y Auditoría

- **Auto-protección:** No se permite suspender ni degradar al único usuario administrador activo (`status === 'active'` con rol `Administrador`).
- **Auditoría:** Altas, cambios de rol, suspensiones y ediciones de permisos generan registro inmediato en `audit_logs` (`category: 'security'`).
