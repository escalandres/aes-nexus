# Configuración · General, Organización, Regional, Seguridad, Apariencia y Notificaciones (`/docs/configuracion/general-organizacion-regional.md`)

Especificación técnica para las secciones base de identidad corporativa, datos fiscales, preferencias regionales, políticas de seguridad, apariencia y preferencias de notificaciones en **AES Nexus**.

- **Endpoints REST:**
  - `GET / PUT /api/v1/settings/general` (`GeneralSettings`)
  - `GET / PUT /api/v1/settings/organization` (`OrganizationSettings`)
  - `GET / PUT /api/v1/settings/regional` (`RegionalSettings`)
  - `GET / PUT /api/v1/settings/security` (`SecuritySettings`) + `DELETE /api/v1/settings/security/sessions/:id`
  - `GET / PUT /api/v1/settings/appearance` (`AppearanceSettings`)
  - `GET / PUT /api/v1/settings/notifications` (`NotificationPreferences`)
- **Esquema JSON:** [`general-organizacion-regional.schema.json`](./general-organizacion-regional.schema.json)
- **Fuente en Frontend:** `src/components/SettingsSection.tsx` (`GeneralSettings`, `OrganizationSettings`, `RegionalSettings`, `SecuritySettings`, `notifPreferences`)

---

## 1. `GeneralSettings` (`cfg_workspace_settings`)

| Campo | Tipo JSON | Obligatorio | Descripción |
|---|---|---|---|
| `workspaceName` | `string` | Sí | Nombre visible del espacio de trabajo en Topbar y reportes |
| `slug` | `string` (`^[a-z0-9-]+$`) | Sí | Identificador URL único de la organización |
| `description` | `string` | Sí | Descripción operativa breve |
| `mainCountry` | `string` | Sí | País principal de operación (ej. `México`) |
| `reportingCurrency` | `string` | Sí | Moneda base de consolidación (`MXN`, `USD`, etc.) |
| `primaryEmail` | `string` (email) | Sí | Correo administrativo principal |
| `phone` | `string` | Sí | Teléfono de contacto corporativo |
| `website` | `string` (uri) | Sí | Sitio web oficial |
| `avatarColor` | `string` (hex `#RRGGBB`) | Sí | Color corporativo de marca (swatches o hex válido) |

---

## 2. `OrganizationSettings` (`cfg_organization_settings`)

Incluye domicilio fiscal SAT/CFDI, estatus del Certificado de Sello Digital (CSD), logotipo corporativo y catálogo de sucursales sincronizado con `admin_locations`.

| Campo | Tipo JSON | Obligatorio | Descripción |
|---|---|---|---|
| `legalName` | `string` | Sí | Razón social oficial |
| `tradeName` | `string` | Sí | Nombre comercial |
| `rfc` | `string` (`^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$`) | Sí | Registro Federal de Contribuyentes |
| `taxRegime` | `string` | Sí | Régimen fiscal SAT (ej. `601 · General de Ley Personas Morales`) |
| `fiscalStreet` | `string` | Sí | Calle y número exterior/interior |
| `fiscalColony` | `string` | Sí | Colonia o fraccionamiento |
| `fiscalZip` | `string` (`^\d{5}$`) | Sí | Código postal fiscal |
| `fiscalCity` | `string` | Sí | Ciudad / Municipio |
| `fiscalState` | `string` | Sí | Estado / Entidad federativa |
| `fiscalCountry` | `string` | Sí | País fiscal |
| `legalRep` | `string` | Sí | Nombre completo del representante legal |
| `certificateStatus` | `'valid' \| 'expiring' \| 'none'` | Sí | Estado del Certificado de Sello Digital (CSD) |
| `logoDataUrl` | `string` (base64 data URI) | Opcional | Imagen de logotipo corporativo (PNG/JPG/SVG) usado en PDFs |
| `logoFileName` | `string` | Opcional | Nombre original del archivo de logotipo |
| `branches` | `OrganizationBranch[]` | Sí | Arreglo de sedes (`id, name, type, city, address, isMain`) |

---

## 3. `RegionalSettings` & `AppearanceSettings` (`cfg_user_preferences`)

### `RegionalSettings`
| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `language` | `string` (`es`, `en`, etc.) | Sí | Idioma activo de la interfaz (`SupportedLocale`) |
| `timezone` | `string` (IANA) | Sí | Zona horaria (ej. `America/Mexico_City`) |
| `dateFormat` | `'DD/MM/YYYY' \| 'MM/DD/YYYY' \| 'YYYY-MM-DD'` | Sí | Formato de presentación de fechas |
| `numberFormat` | `'comma_dot' \| 'dot_comma'` | Sí | Separadores de miles y decimales |
| `firstDayOfWeek` | `'monday' \| 'sunday'` | Sí | Primer día de semana en calendarios |

### `AppearanceSettings`
| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `accentTheme` | `string` | Sí | Identificador de paleta de acento (`emerald`, `ocean`, etc.) |
| `darkMode` | `boolean` | Sí | Activa modo oscuro en el cliente |

---

## 4. `SecuritySettings` (`cfg_security_settings`)

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `twoFactorEnabled` | `boolean` | Sí | Exige autenticación de dos factores (2FA/TOTP) |
| `sessionTimeoutMinutes` | `integer` (`5..1440`) | Sí | Minutos de inactividad antes de expirar sesión |
| `enforcePasswordExpiry` | `boolean` | Sí | Política de rotación periódica de contraseñas |
| `recentSessions` | `SecuritySessionRecord[]` | Sí | Sesiones activas/recientes (`id, device, browser, ip, location, lastActive, isCurrent`) |

---

## 5. `NotificationPreferences` (`cfg_notification_preferences`)

| Campo | Tipo | Default | Descripción |
|---|---|---|---|
| `pushStockAlerts` | `boolean` | `true` | Notificaciones en navegador / app por stock bajo |
| `emailStockAlerts` | `boolean` | `true` | Envío de alertas de reorden por correo electrónico |
| `salesOrdersAlerts` | `boolean` | `true` | Alertas de nuevos pedidos firmes y cotizaciones aprobadas |
| `receivablesAlerts` | `boolean` | `true` | Alertas de facturas CxC próximas a vencer o vencidas |
| `weeklySummaryEmail` | `boolean` | `true` | Resumen ejecutivo semanal por correo |
| `audioChime` | `boolean` | `true` | Señal sonora al disparar alertas críticas |
