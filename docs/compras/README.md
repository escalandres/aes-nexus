# Documentación Backend · Módulo Compras (`/docs/compras`)

Especificación técnica y esquemas de datos para la implementación del módulo **Compras y Abastecimiento** de **AES Nexus** en el backend (`/api/v1/purchases/*`).

## 1. Entidades y Recursos Documentados

| Entidad / Recurso | Endpoint REST | Especificación Markdown | Esquema JSON | Tabla(s) PostgreSQL |
|---|---|---|---|---|
| **Requisiciones** | `/api/v1/purchases/requisitions` | [`requisiciones.md`](./requisiciones.md) | [`requisiciones.schema.json`](./requisiciones.schema.json) | `purchase_requisitions`, `purchase_requisition_items` |
| **Órdenes de Compra** | `/api/v1/purchases/orders` | [`ordenes-compra.md`](./ordenes-compra.md) | [`ordenes-compra.schema.json`](./ordenes-compra.schema.json) | `purchase_orders`, `purchase_order_items` |
| **Recepciones de Mercancía** | `/api/v1/purchases/receptions` | [`recepciones.md`](./recepciones.md) | [`recepciones.schema.json`](./recepciones.schema.json) | `purchase_receptions`, `ops_stock_movements`, `ops_inventory` |
| **Facturas de Proveedor (CxP)** | `/api/v1/purchases/invoices` | [`facturas.md`](./facturas.md) | [`facturas.schema.json`](./facturas.schema.json) | `ap_bills` |
| **Devoluciones a Proveedor (RTV)** | `/api/v1/purchases/returns` | [`devoluciones.md`](./devoluciones.md) | [`devoluciones.schema.json`](./devoluciones.schema.json) | `purchase_supplier_returns`, `purchase_supplier_return_items`, `purchase_return_workflow_history` |
| **Resumen y Presupuestos** | `/api/v1/purchases/summary` | Ver sección 5 abajo | N/A (agregado de solo lectura) | Vista agregada + `department_procurement_plans` |

---

## 2. Convenciones Transversales del Módulo

- **Multi-Tenancy (H1):** Toda petición requiere `X-Organization-Id` validado contra el JWT de sesión. Todas las tablas incluyen `organization_id UUID NOT NULL` con `UNIQUE (organization_id, folio)`.
- **Encabezados estándar:**
  - `Content-Type: application/json`
  - `Accept: application/json`
  - `X-Organization-Id: <organization_id>`
  - `X-Client-App: aes-nexus-frontend`
- **Folios Secuenciales Atómicos:**
  - Requisiciones: `REQ-YYYY-NNN`
  - Órdenes de compra: `OC-YYYY-NNN`
  - Movimientos de entrada / salida RTV: `MOV-YYYY-NNN` / `MOV-RTV-NNN`
  - Facturas CxP: `CXP-YYYY-NNN`
  - Devoluciones a proveedor (RTV): `DEV-PRV-YYYY-NNN`
  - Notas de crédito CxP derivadas: `NC-PRV-YYYY-NNN`
- **Tasa de IVA Parametrizada:** Las órdenes de compra utilizan la tasa estándar del perfil país (`16%`, `8%`, `0%`), recalculando `subtotal`, `taxAmount`/`taxTotal` y `total` en backend.
- **Auditoría:** Todas las acciones emiten eventos en `audit_logs` (`category: 'inventory'` para requisiciones, OC, recepciones y RTV; `category: 'finance'` al registrar/compensar/eliminar facturas CxP).

---

## 3. Matriz de Permisos RBAC (`src/data/accessControl.ts`)

| Sección Compras | Capabilities Requeridas | Niveles HTTP (`read` / `write` / `full`) |
|---|---|---|
| `Compras.Resumen` | `approvePurchases`, `receiveGoods`, `inventoryControl`, `schedulePayments` | `read` / `write` / `full`: `GET /api/v1/purchases/summary` |
| `Compras.Requisiciones` | `approvePurchases`, `inventoryControl`, `adjustThresholds`, `receiveGoods` | `read`: `GET` · `write`: `GET, POST, approve/convert` · `full`: `+ DELETE` |
| `Compras.Órdenes de compra` | `approvePurchases`, `receiveGoods` | `read`: `GET` · `write`: `GET, POST, PATCH, receive` · `full`: `+ DELETE` |
| `Compras.Recepciones` | `receiveGoods`, `inventoryControl` | `read`: `GET` · `write`: `GET, POST /receptions` · `full`: `GET, POST` |
| `Compras.Facturas` | `approvePurchases`, `schedulePayments`, `expenseControl` | `read`: `GET` · `write`: `GET, POST` · `full`: `+ DELETE` |
| `Compras.Devoluciones` | `approvePurchases`, `receiveGoods`, `inventoryControl` | `read`: `GET` · `write`: `GET, POST, transiciones/aprobaciones` · `full`: `+ DELETE` |

---

## 4. Diagrama de Abastecimiento e Integración Inter-Módulo

```
admin_departments + ops_inventory (Alertas bajo umbral)
        │
        ▼
  purchase_requisitions (REQ-YYYY-NNN: Pendiente -> Aprobada -> Convertida a OC)
        │  POST /convert-to-po
        ▼
  purchase_orders (OC-YYYY-NNN: Borrador / Emitida -> Recepción parcial -> Recibida)
        ├─── POST /api/v1/purchases/receptions (Andén)
        │         └──> Suma stock en ops_inventory + Entrada en ops_stock_movements (MOV)
        ├─── POST /api/v1/purchases/invoices (CxP CXP-YYYY-NNN)
        │         └──> Finanzas (Pagos CxP / Dispersión EBP + Póliza 2001-001 / 1150-001)
        └─── POST /api/v1/purchases/returns (RTV DEV-PRV-YYYY-NNN, flujo admin_return_workflows.supplier)
                  ├── Estado 'Enviada a proveedor' ──> Resta ops_inventory + Salida Kardex (MOV-RTV)
                  └── Estado 'Acreditada / compensada' ──> NC-PRV-YYYY-NNN + abono a ap_bills.balance
```

---

## 5. Endpoint de Resumen de Compras (`GET /api/v1/purchases/summary`)

Calcula las métricas del encabezado superior de Compras y de `PurchasesOverview.tsx`:

- `topKpis`: `monthlyOrdersCount`, `monthlyOrdersTotal`, `receivedInvoicesCount`, `receivedInvoicesTotal`, `receivedInvoicesPending`, `pendingDeliveryCount`, `pendingDeliveryUnits`.
- `overview`: `totalCommittedSpend`, `pendingRequisitionsCount`, `awaitingApprovalCount`, `pendingReceptionsCount`, `lowStockAlertsCount`, `departmentalBudgetVsActual[]` (`Jun..Nov` por departamento filtrable).
