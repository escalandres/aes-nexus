# Configuración · Umbrales de Stock por Categoría (`/docs/configuracion/umbrales-stock.md`)

Especificación técnica para la entidad **Reglas de Umbral Mínimo de Stock por Categoría (`CategoryStockThresholdRule`)** y la función de resolución de precedencia frente a umbrales individuales por SKU en **AES Nexus**.

- **Endpoints REST:**
  - `GET /api/v1/settings/stock-thresholds`
  - `POST /api/v1/settings/stock-thresholds`
  - `PUT /api/v1/settings/stock-thresholds/:id`
  - `DELETE /api/v1/settings/stock-thresholds/:id` (solo reglas con `isCustom: true` o restauración de defaults)
- **Esquema JSON:** [`umbrales-stock.schema.json`](./umbrales-stock.schema.json)
- **Tabla PostgreSQL sugerida:** `cfg_category_stock_thresholds`
- **Fuente en Frontend:** `src/data/settings.ts` (`CategoryStockThresholdRule`, `CategoryThresholdMode`, `resolveEffectiveStockThreshold`, `DEFAULT_CATEGORY_STOCK_THRESHOLDS`)

---

## 1. Reglas de Precedencia (`resolveEffectiveStockThreshold`)

Cada registro de inventario (`ops_inventory`: `productId`, `sku`, `category`, `minStock`, `thresholdSource?: 'sku' | 'category'`) resuelve su umbral mínimo efectivo en este orden estricto:

1. **Búsqueda de Categoría:** Se resuelve `category` desde `item.category` o buscando `productId` / `sku` en el catálogo de productos (`sal_products`), con fallback `'Hardware'`.
2. **Evaluación de Regla Activa (`rule && rule.enabled`):**
   - Si `rule.mode === 'override_sku'`: **Prevalece la regla de categoría** (`effectiveMinStock = Math.max(0, rule.minStock)`, `source = 'category_override'`), ignorando el mínimo particular del SKU.
   - Si `rule.mode === 'inherit_default'` y `item.thresholdSource === 'category'`: **Hereda el mínimo de la categoría** (`effectiveMinStock = Math.max(0, rule.minStock)`, `source = 'category_inherit'`).
3. **Fallback a Nivel SKU (`source = 'sku'`):** Si la regla está deshabilitada (`enabled === false`) o `item.thresholdSource === 'sku'` bajo modo `'inherit_default'`, se conserva `Math.max(0, item.minStock)`.

### Categorías Integradas de Fábrica
`Hardware` (5, active), `Software y Licencias` (3, active), `Mantenimiento` (2, active), `Diseño y Desarrollo` (2, active), `Consultoría` (1, disabled), `Capacitación` (1, disabled).

---

## 2. Entidad `CategoryStockThresholdRule` (`cfg_category_stock_thresholds`)

| Campo | Tipo JSON | Columna SQL | Obligatorio | Descripción |
|---|---|---|---|---|
| `id` | `string` | `id UUID PRIMARY KEY` | Sí | Identificador único (`cat_thr_...`) |
| `category` | `string` | `category VARCHAR(120) NOT NULL` | Sí | Nombre de categoría (`UNIQUE (organization_id, LOWER(category))`) |
| `minStock` | `integer` (`>= 0`) | `min_stock INTEGER NOT NULL` | Sí | Cantidad mínima de unidades antes de alertar |
| `enabled` | `boolean` | `enabled BOOLEAN NOT NULL` | Sí | Activa o desactiva la vigilancia para esta categoría |
| `mode` | `'inherit_default' \| 'override_sku'` | `mode VARCHAR(24) NOT NULL` | Sí | Modo de precedencia respecto al mínimo del SKU |
| `notes` | `string` | `notes TEXT` | Opcional | Notas operativas / política de reorden |
| `updatedAtIso` | `string` (date-time) | `updated_at TIMESTAMPTZ NOT NULL` | Sí | Última actualización ISO-8601 |
| `isCustom` | `boolean` | `is_custom BOOLEAN DEFAULT FALSE` | Opcional | Indica categoría agregada por el usuario (eliminable) |

---

## 3. Seguridad y Auditoría

- **Restricción RBAC:** Requiere `adjustThresholds`, `inventoryControl` o `sysConfig` y permiso `edit` / `full` en `Configuración.Umbrales de stock`.
- **Auditoría:** Cambios en umbrales registran evento en `audit_logs` (`category: 'settings'`, `entityType: 'Umbral de stock'`).
