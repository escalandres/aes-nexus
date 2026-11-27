# Documentación Backend · Módulo Ventas (`/docs/ventas`)

Especificación técnica y esquemas de datos para la implementación del módulo **Ventas** (`Piloto Comercial`) de **AES Nexus** en el backend (`/api/v1/sales/*`).

## 1. Entidades y Recursos Documentados

| Entidad / Recurso | Endpoint REST | Especificación Markdown | Esquema JSON | Tabla(s) PostgreSQL |
|---|---|---|---|---|
| **Catálogo (Productos y Servicios)** | `/api/v1/sales/catalog` | [`catalogo.md`](./catalogo.md) | [`catalogo.schema.json`](./catalogo.schema.json) | `sales_catalog_items` |
| **Cotizaciones** | `/api/v1/sales/quotes` | [`cotizaciones.md`](./cotizaciones.md) | [`cotizaciones.schema.json`](./cotizaciones.schema.json) | `sales_quotes`, `sales_quote_items` |
| **Pedidos de Venta** | `/api/v1/sales/orders` | [`pedidos.md`](./pedidos.md) | [`pedidos.schema.json`](./pedidos.schema.json) | `sales_orders`, `sales_order_items` |
| **Facturas de Venta (CxC)** | `/api/v1/sales/invoices` | [`facturas.md`](./facturas.md) | [`facturas.schema.json`](./facturas.schema.json) | `ar_invoices`, `ar_invoice_items` |
| **Devoluciones de Clientes (RMA)** | `/api/v1/sales/returns` | [`devoluciones.md`](./devoluciones.md) | [`devoluciones.schema.json`](./devoluciones.schema.json) | `sales_customer_returns`, `sales_customer_return_items`, `sales_return_workflow_history` |
| **Resumen Comercial** | `/api/v1/sales/summary` | Ver sección 5 abajo | N/A (agregado de solo lectura) | Vista agregada multi-tabla |

---

## 2. Convenciones Transversales del Módulo

- **Multi-Tenancy (H1):** Toda petición requiere `X-Organization-Id` validado contra el token de sesión (`Authorization: Bearer <jwt>`). Todas las tablas incluyen `organization_id UUID NOT NULL` con restricciones de unicidad por tenant (ej. `UNIQUE (organization_id, sku)` en catálogo y `UNIQUE (organization_id, folio)` en documentos).
- **Encabezados estándar:**
  - `Content-Type: application/json`
  - `Accept: application/json`
  - `X-Organization-Id: <organization_id>`
  - `X-Client-App: aes-nexus-frontend`
- **Folios Secuenciales Atómicos:** Generados en servidor mediante secuencias por organización y año:
  - Cotizaciones: `COT-YYYY-NNN`
  - Pedidos: `PED-YYYY-NNN`
  - Facturas: `FAC-YYYY-NNN`
  - Devoluciones (RMA): `DEV-CLI-YYYY-NNN`
  - Notas de crédito derivadas: `NC-CLI-YYYY-NNN`
- **Cálculo de Impuestos por Partida (`SalesLineItem`):**
  - Tasas soportadas: `'16%'` (`0.16`), `'8%'` (`0.08`), `'0%'` (`0`), `'Exento'` (`0`).
  - Los totales de documento (`subtotal`, `taxTotal`/`tax`, `total`) deben recalcularse autoritativamente en backend a partir de las partidas.
- **Auditoría:** Todas las altas, ediciones, conversiones (`Cotización -> Pedido -> Factura`), aprobaciones RMA y eliminaciones emiten un registro inmutable en `audit_logs` (`category = 'sales'` o `'finance'` al emitir notas de crédito).

---

## 3. Matriz de Permisos RBAC (`src/data/accessControl.ts`)

| Sección Ventas | Capabilities Requeridas | Niveles HTTP (`read` / `write` / `full`) |
|---|---|---|
| `Ventas.Catálogo` | `createQuotes`, `issueOrders` | `read`: `GET` · `write`: `GET, POST, PUT, PATCH` · `full`: `+ DELETE` |
| `Ventas.Cotizaciones` | `createQuotes` | `read`: `GET` · `write`: `GET, POST, PUT, PATCH, POST /convert-to-order` · `full`: `+ DELETE` |
| `Ventas.Pedidos` | `issueOrders`, `createQuotes` | `read`: `GET` · `write`: `GET, POST, PUT, PATCH` · `full`: `+ DELETE` |
| `Ventas.Facturas` | `issueOrders` | `read`: `GET` · `write`: `GET, POST` · `full`: `+ DELETE` |
| `Ventas.Devoluciones` | `issueOrders`, `createQuotes`, `receiveGoods` | `read`: `GET` · `write`: `GET, POST, PATCH, transiciones/aprobaciones` · `full`: `+ DELETE` |
| `Ventas.Resumen` | `createQuotes`, `issueOrders`, `pipelineReports` | `read` / `write` / `full`: `GET /api/v1/sales/summary` |

---

## 4. Diagrama de Flujo Comercial e Integración Inter-Módulo

```
crm_customers (CRM) + sales_catalog_items <──sync──> ops_inventory / ops_warehouses (Operaciones)
        │
        ▼
  sales_quotes (COT-YYYY-NNN)
        │  POST /convert-to-order
        ▼
  sales_orders (PED-YYYY-NNN)
        ├─── POST /api/v1/sales/invoices (total o parcial % / anticipo)
        │         ▼
        │    ar_invoices (FAC-YYYY-NNN) ──> Finanzas (Cobros CxC + Póliza 1005-001 / 4001-001 / 2005-001)
        │
        └─── POST /api/v1/sales/returns (RMA DEV-CLI-YYYY-NNN, gobernado por admin_return_workflows.customer)
                  ├── Estado 'Recibida en almacén' ──> Reingreso ops_inventory + ops_stock_movements (MOV-DEV)
                  └── Estado 'Nota de crédito emitida' ──> NC-CLI-YYYY-NNN + abono a ar_invoices.balance
```

---

## 5. Endpoint de Resumen Comercial (`GET /api/v1/sales/summary`)

Agrega los indicadores de la pestaña **Resumen** (`SalesOverview.tsx`):

- `kpis`:
  - `confirmedOrdersTotal`: suma de `total` en `sales_orders` con `status != 'Cancelado'`
  - `quotesPipelineTotal`: suma de `total` en `sales_quotes`
  - `quotesCount`: total de cotizaciones
  - `approvedQuotesCount`: cotizaciones con `status = 'Aprobada'`
  - `conversionRatePct`: `Math.round((approvedQuotesCount / quotesCount) * 100)`
  - `averageOrderTicket`: `confirmedOrdersTotal / ordersCount`
- `funnel`: conteo y monto acumulado por etapa (`Cotizadas`, `Aprobadas`, `En preparación`, `Entregadas`).
- `topItems`: top 4 SKUs por ingreso acumulado (`sum(item.total)`) en pedidos.
