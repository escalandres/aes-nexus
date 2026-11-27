# Backend · Autenticación (OIDC / API Keys), Multi-Tenancy y RBAC (`/docs/backend/auth-y-tenancy.md`)

Especificación técnica para la capa de identidad, aislamiento multiempresa (**H1**), evaluación de permisos RBAC de 5 niveles y defensa en profundidad en PostgreSQL para **AES Nexus**.

- **Esquema JSON:** [`auth-y-tenancy.schema.json`](./auth-y-tenancy.schema.json)
- **Endpoints `/api/v1/auth/*`:**
  - `GET /api/v1/auth/me` — Devuelve perfil del usuario, organizaciones permitidas, rol(es) activos y matriz efectiva `sectionPermissions`.
  - `POST /api/v1/auth/switch-organization` — Valida membresía y emite contexto/claims actualizados.
  - `POST /api/v1/auth/invitations` / `POST /api/v1/auth/invitations/:token/accept` — Invitación de colaboradores al workspace.
  - `GET / DELETE /api/v1/auth/sessions` — Consulta y revocación de sesiones activas (`SecuritySettings.recentSessions`).

---

## 1. Estrategia Dual de Autenticación

### A. Usuarios Interactivos (OIDC + JWT)
1. El frontend autentica mediante proveedor OIDC externo (candidatos evaluados en `PHASE_0.md`: WorkOS AuthKit, Auth0, Clerk o Microsoft Entra External ID).
2. El backend ASP.NET Core valida la firma RS256/ES256 contra el endpoint JWKS del proveedor (`iss`, `aud`, `exp`, `sub`).
3. **Regla crítica de Tenancy:** El backend **nunca** confía únicamente en el `org_id` del proveedor OIDC; resuelve `(oidc_subject -> core_users -> core_organization_memberships)` en PostgreSQL para confirmar que el usuario tiene membresía `status = 'active'` dentro del tenant solicitado en `X-Organization-Id`.
4. Si `cfg_security_settings.twoFactorEnabled === true`, los tokens sin claim `amr: ["mfa"]` son rechazados con `403 MFA_REQUIRED`.

### B. Integraciones Externas (API Key Bearer)
1. El middleware detecta tokens con prefijo `nexus_live_` o `nexus_sbx_` (`cfg_external_integrations`).
2. Calcula `SHA-256(token)` y busca el hash en `cfg_external_integrations` (nunca se almacena ni compara en texto plano).
3. Valida:
   - `status === 'active'` (`paused` o `revoked` devuelven `401`).
   - IP de origen contra `ip_allowlist` si está configurada (`403`).
   - Ventana de tasa `rate_limit_per_min` (`429 RATE_LIMIT_EXCEEDED`).
   - Permisos en `permissions[resource]` + matriz `RoleDefinition` vinculada (`role_id`).
4. Registra traza asíncrona en `cfg_integration_logs` y actualiza `last_used_at`, `requests_count`.

---

## 2. Resolución de Tenant y Aislamiento (H1)

```
Request (Authorization + X-Organization-Id)
   │
   ▼
[AuthMiddleware] -> Resuelve Actor (user_id | integration_id)
   │
   ▼
[TenantMiddleware] -> Verifica membresía activa en core_organization_memberships
   │                  Fija ITenantContext.OrganizationId (UUID)
   │                  Ejecuta: SET LOCAL app.current_organization_id = '<uuid>';
   ▼
[RbacFilter] -> Resuelve unión multi-rol maxSectionAccessLevel()
   │            Valida GET(view) / POST(create) / PUT|PATCH(edit) / DELETE(full)
   ▼
[EF Core Global Query Filter + PostgreSQL RLS] -> WHERE organization_id = current_setting('app.current_organization_id')::uuid
```

- **Defensa en Profundidad:** Todas las tablas de negocio incluyen `organization_id UUID NOT NULL` con índice compuesto `(organization_id, ...)` y política PostgreSQL RLS (`ENABLE ROW LEVEL SECURITY`) para impedir fugas incluso ante consultas SQL crudas o errores en EF Core.
- **Jobs en Segundo Plano:** Todo job asíncrono debe abrir un `DbContext` con `TenantScope` explícito por cada organización iterada; nunca ejecutar queries sin contexto de tenant salvo procesos del sistema marcados explícitamente.

---

## 3. Modelo de Entidades Core (`core_*`)

| Tabla | Campos Principales | Descripción |
|---|---|---|
| `core_organizations` | `id`, `slug`, `name`, `status ('active'\|'suspended')`, `plan_tier`, `created_at` | Entidad raíz del tenant |
| `core_users` | `id`, `oidc_subject`, `email`, `full_name`, `avatar_initials`, `mfa_enrolled`, `created_at` | Identidad global del usuario |
| `core_organization_memberships` | `id`, `organization_id`, `user_id`, `status ('active'\|'suspended')`, `primary_role_id`, `last_login_at` | Vínculo usuario ↔ organización |
| `core_invitations` | `id`, `organization_id`, `email`, `role_ids[]`, `token_hash`, `expires_at`, `accepted_at` | Flujo de invitación segura |
| `sys_idempotency_keys` | `organization_id`, `idempotency_key`, `request_hash`, `status_code`, `response_body`, `expires_at` | Control de idempotencia 24h |
