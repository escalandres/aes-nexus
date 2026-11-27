# Reportes · Alertas de Margen (EBIT y Neto) (`/docs/reportes/alertas-margen.md`)

Especificación técnica para la configuración, evaluación automática y notificación de **Alertas de Margen Operativo (EBIT) y Margen Neto** vinculadas al Estado de Resultados en el backend de **AES Nexus**.

- **Endpoints REST:**
  - `GET /api/v1/reports/margin-alerts` — Obtiene configuración vigente (`MarginAlertSettings`) y la última evaluación (`MarginAlertEvaluation`).
  - `PUT /api/v1/reports/margin-alerts` — Actualiza metas porcentuales y canales de notificación.
  - `POST /api/v1/reports/margin-alerts/evaluate` — Evalúa umbrales contra los resultados de P&L recibidos o calculados.
- **Esquema JSON:** [`alertas-margen.schema.json`](./alertas-margen.schema.json)
- **Tabla PostgreSQL sugerida:** `rpt_margin_alert_settings`
- **Fuente en Frontend:** `src/data/marginAlerts.ts` (`MarginAlertSettings`, `TriggeredMarginAlert`, `MarginAlertEvaluation`, `evaluateMarginAlerts`)

---

## 1. Reglas de Negocio y Evaluación

1. **Rangos Válidos de Metas (`clampPct`):**
   - `operatingMarginTargetPct`: número entre `0` y `80` (default `20.0`, redondeado a 1 decimal).
   - `netMarginTargetPct`: número entre `0` y `80` (default `12.0`, redondeado a 1 decimal).
2. **Condición de Evaluación (`isEvaluated`):**
   - Solo se evalúan rupturas si `totalRevenue > 0 || operatingIncome !== 0 || netIncome !== 0`.
3. **Reglas de Disparo (`evaluateMarginAlerts`):**
   - `operatingBreached = isEvaluated && enabled && operatingAlertActive && operatingMarginPct < operatingMarginTargetPct`
   - `netBreached = isEvaluated && enabled && netAlertActive && netMarginPct < netMarginTargetPct`
4. **Severidad:**
   - `'critical'` si el margen actual es negativo (`< 0%`) o si la brecha absoluta (`|currentPct - targetPct|`) es `>= 5.0` puntos porcentuales.
   - `'warning'` en cualquier otra desviación por debajo de la meta (`0 < gap < 5.0`).
5. **Despacho de Notificaciones:**
   - Si `notifyInAppToast === true`, el cliente muestra alerta inmediata en pantalla al detectar ruptura en Reportes.
   - Si `notifyNotificationCenter === true`, el backend/cliente registra notificación persistente en el Centro de Notificaciones (campana global).

---

## 2. Entidad `MarginAlertSettings` (`rpt_margin_alert_settings`)

| Campo | Tipo JSON | Columna SQL | Obligatorio | Default | Descripción |
|---|---|---|---|---|---|
| `enabled` | `boolean` | `enabled BOOLEAN NOT NULL` | Sí | `true` | Interruptor maestro de monitoreo |
| `operatingMarginTargetPct` | `number` (`0..80`) | `operating_margin_target_pct NUMERIC(5,2)` | Sí | `20` | Meta mínima de margen operativo (EBIT %) |
| `netMarginTargetPct` | `number` (`0..80`) | `net_margin_target_pct NUMERIC(5,2)` | Sí | `12` | Meta mínima de margen neto (%) |
| `operatingAlertActive` | `boolean` | `operating_alert_active BOOLEAN NOT NULL` | Sí | `true` | Habilita vigilancia específica sobre EBIT |
| `netAlertActive` | `boolean` | `net_alert_active BOOLEAN NOT NULL` | Sí | `true` | Habilita vigilancia específica sobre Margen Neto |
| `notifyInAppToast` | `boolean` | `notify_in_app_toast BOOLEAN NOT NULL` | Sí | `true` | Emitir toast en interfaz |
| `notifyNotificationCenter` | `boolean` | `notify_notification_center BOOLEAN NOT NULL` | Sí | `true` | Enviar alerta al centro de notificaciones |
| `updatedAt` | `string` (ISO-8601) | `updated_at TIMESTAMPTZ NOT NULL` | Sí | `NOW()` | Última actualización de parámetros |

---

## 3. Estructura de Evaluación (`MarginAlertEvaluation`)

| Campo | Tipo | Descripción |
|---|---|---|
| `isEvaluated` | `boolean` | `true` si existen cifras base para evaluar |
| `operatingBreached` | `boolean` | `true` si EBIT cayó bajo la meta |
| `netBreached` | `boolean` | `true` si margen neto cayó bajo la meta |
| `operatingGapPts` | `number` | Diferencia en puntos (`operatingMarginPct - operatingMarginTargetPct`) |
| `netGapPts` | `number` | Diferencia en puntos (`netMarginPct - netMarginTargetPct`) |
| `triggeredAlerts` | `TriggeredMarginAlert[]` | Arreglo con detalle de alertas activadas (`id: 'operating' \| 'net'`, `metricLabel`, `currentPct`, `targetPct`, `gapPts`, `currentAmount`, `severity`, `message`) |

---

## 4. Seguridad y Auditoría

- **Restricción RBAC:** Lectura permitida con `view` en `Reportes.Estado de Resultados`; modificación (`PUT`) requiere permiso `edit` o `full` y capability `balanceReports` o `fullReports`.
- **Auditoría:** Todo cambio de umbrales registra evento en `audit_logs` (`category: 'finance'`, `entityType: 'Alerta de margen P&L'`).
