# Documentación Backend · Módulo Configuración (`/docs/configuracion`)

Especificación técnica y esquemas de datos para la implementación del módulo **Configuración del Espacio de Trabajo, Gobernanza RBAC, Umbrales e Integraciones** de **AES Nexus** en el backend (`/api/v1/settings/*`).

## 1. Secciones, Entidades y Recursos Documentados

| Sección / Entidad | Endpoint REST | Especificación Markdown | Esquema JSON | Tabla(s) PostgreSQL |
|---|---|---|---|---|
| **General, Organización, Idioma/Región, Seguridad, Apariencia y Notificaciones** | `/api/v1/settings/workspace` | [`general-organizacion-regional.md`](./general-organizacion-regional.md) | [`general-organizacion-regional.schema.json`](./general-organizacion-regional.schema.json) | `cfg_workspace_settings`, `cfg_organization_settings`, `cfg_user_preferences`, `cfg_security_settings` |
| **Usuarios y Roles (RBAC Granular)** | `/api/v1/settings/users`, `/api/v1/settings/roles` | [`usuarios-y-roles.md`](./usuarios-y-roles.md) | [`usuarios-y-roles.schema.json`](./usuarios-y-roles.schema.json) | `cfg_workspace_users`, `cfg_roles`, `cfg_user_roles` |
| **Umbrales de Stock por Categoría** | `/api/v1/settings/stock-thresholds` | [`umbrales-stock.md`](./umbrales-stock.md) | [`umbrales-stock.schema.json`](./umbrales-stock.schema.json) | `cfg_category_stock_thresholds` |
| **Integraciones (Nativas, Marketplace y API Externa)** | `/api/v1/settings/integrations/*` | [`integraciones.md`](./integraciones.md) | [`integraciones.schema.json`](./integraciones.schema.json) | `cfg_native_integrations`, `cfg_commercial_integrations`, `cfg_external_integrations`, `cfg_integration_logs` |
| **Plan, Facturación y Reinicio del Workspace** | `/api/v1/settings/billing`, `/api/v1/settings/workspace/reset-*` | [`plan-facturacion.md`](./plan-facturacion.md) | [`plan-facturacion.schema.json`](./plan-facturacion.schema.json) | `cfg_plan_subscriptions`, `cfg_plan_invoices` |
| **Auditoría (Vista de Configuración)** | `/api/v1/admin/audit-logs` | Ver [`/docs/administracion/auditoria.md`](../administracion/auditoria.md) | Ver [`/docs/administracion/auditoria.schema.json`](../administracion/auditoria.schema.json) | `audit_logs` |

---

## 2. Convenciones Transversales del Módulo

- **Multi-Tenancy (H1):** Toda configuración está aislada por `organization_id` resuelto desde `X-Organization-Id` validado contra el JWT. Las preferencias personales (`Idioma y región`, `Apariencia`, preferencias de notificación personal) se asocian además a `(organization_id, user_id)`.
- **Encabezados estándar:**
  - `Content-Type: application/json`
  - `Accept: application/json`
  - `X-Organization-Id: <organization_id>`
  - `X-Client-App: aes-nexus-frontend`
- **Sincronización Inter-Módulos:**
  - **Organización (`logoDataUrl`, `legalName`, `rfc`) ↔ Reportes (`P&L PDF`):** El snapshot de marca corporativa usado en la exportación PDF de Estado de Resultados lee directamente `cfg_organization_settings` + `cfg_workspace_settings.avatarColor`.
  - **Organización (`branches[]`) ↔ Administración (`Ubicaciones físicas`):** Las sucursales configuradas en Organización se sincronizan bidireccionalmente con `admin_locations`.
  - **Umbrales de Stock ↔ Operaciones (`Inventario`) & Inicio (`Dashboard`):** Los cambios en `cfg_category_stock_thresholds` recalculan el umbral efectivo (`resolveEffectiveStockThreshold`) en Inventario y en el Alert Hub del Dashboard.
  - **Notificaciones ↔ Topbar & Dashboard:** `pushStockAlerts`, `emailStockAlerts` y `audioChime` sincronizan con las preferencias de alertas operativas globales.
- **Auditoría:** Todo cambio en configuración general, fiscal, usuarios, roles, seguridad, integraciones, plan o umbrales registra un evento en `audit_logs` (`category: 'settings' | 'security' | 'session'`).

---

## 3. Matriz de Permisos RBAC (`src/data/accessControl.ts`)

Las 12 secciones de `Configuración` tienen compuertas individuales:

| Sección | Capabilities Requeridas | Notas de Acceso |
|---|---|---|
| `Configuración.General` | `sysConfig` | Lectura/edición de metadatos del workspace |
| `Configuración.Organización` | `sysConfig` | Datos fiscales SAT/RFC, CSD, logotipo y sucursales |
| `Configuración.Idioma y región` | Preferencia personal (cualquier usuario activo) | `edit` por defecto en todos los roles integrados |
| `Configuración.Usuarios` | `manageUsers`, `sysConfig` | Alta, edición multi-rol y suspensión (`active \| suspended`) |
| `Configuración.Roles y permisos` | `manageUsers`, `sysConfig` | Matriz granular `5 niveles × 9 módulos` y rol por defecto |
| `Configuración.Seguridad` | `sysConfig` | Política 2FA, timeout, expiración y revocación de sesiones |
| `Configuración.Apariencia` | Preferencia personal (cualquier usuario activo) | Tema de acento (`accentTheme`) y modo oscuro (`darkMode`) |
| `Configuración.Notificaciones` | `adjustThresholds`, `sysConfig` | Canales push, email, CxC, ventas y timbre sonoro |
| `Configuración.Umbrales de stock` | `adjustThresholds`, `inventoryControl`, `sysConfig` | Reglas por categoría (`inherit_default \| override_sku`) |
| `Configuración.Auditoría` | `sysConfig`, `fullReports` | Vista filtrada de `audit_logs` con exportación CSV |
| `Configuración.Integraciones` | `sysConfig` | Conectores nativos, marketplace comercial y API Keys |
| `Configuración.Plan y facturación` | `sysConfig` | Suscripción SaaS, add-ons, CFDI de cobro y reinicio controlado |

---

## 4. Diagrama de Flujo de Gobernanza

```
General & Organización (Identidad, RFC, Sucursales, Logo)
        │
        ├──> Sincroniza admin_locations & PDF Corporativo P&L
        │
Roles & Permisos (Matriz 5 Niveles: none < view < create < edit < full)
        │
        ├──> Asignados a WorkspaceUserRecord[] (Multi-rol, unión por máximo nivel)
        └──> Asignados a ExternalIntegrationRecord (API Key sin consumir asiento)
        │
Umbrales de Stock (Categoría: override_sku | inherit_default)
        │
        └──> Evalúa ops_inventory -> Alertas en Dashboard y Notificaciones
```
