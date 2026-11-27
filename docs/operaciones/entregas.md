# Operaciones · Entregas y Despachos (`ShipmentDelivery`)

Especificación funcional, modelo de datos y flujo de estados para la entidad **Entregas / Despachos** (`/api/v1/operations/shipments`).

---

## 1. Descripción Funcional

Administra la logística de salida (*outbound fulfillment*) vinculada a pedidos comerciales (`sales_orders`), controlando paquetería asignada, número de guía (`trackingNumber`), número de bultos (`packages`), dirección de entrega y trazabilidad de estados hasta su entrega final o retorno al almacén.

---

## 2. Campos Obligatorios vs. Opcionales (`CreateShipmentDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción y Reglas |
|---|---|---|---|---|
| `orderFolio` | `string` (max 32) | **Sí** | — | Folio del pedido de ventas asociado (ej. `'PED-2026-041'`). |
| `clientCompany` | `string` (max 180) | **Sí** | — | Razón social o empresa cliente (`crm_clients`). |
| `clientName` | `string` (max 150) | No | `'Contacto principal'` | Nombre de la persona receptora en sitio. |
| `carrier` | `string` (max 100) | No | `'DHL Express'` | Paquetería o método de entrega (`'DHL Express'`, `'FedEx'`, `'Estafeta'`, `'Flotilla Propia'`, etc.). |
| `trackingNumber` | `string` (max 80) | No | Auto-generado | Número de guía. Si se omite, el servidor genera `TRK-<prefijo_carrier>-<6_digitos>`. |
| `estimatedDelivery` | `string` (max 40) | No | `'Por confirmar'` | Fecha estimada de entrega al cliente. |
| `address` | `string` (max 255) | **Sí** | — | Domicilio completo de entrega. |
| `packages` | `integer` (`>= 1`) | No | `1` | Cantidad de cajas, tarimas o bultos despachados. |
| `notes` | `string \| null` (max 1000) | No | `null` | Instrucciones de entrega, acuses o motivo de devolución. |

### DTO de Retorno Logístico (`ReturnShipmentDTO`)

| Campo JSON | Tipo | Obligatorio | Default | Descripción |
|---|---|---|---|---|
| `reason` | `string` (max 500) | **Sí** | — | Causa de retorno (ej. `'Cliente ausente tras 3 intentos'`, `'Dirección errónea'`, `'Rechazo en andén'`). |

### Campos Generados por el Servidor (`ShipmentDeliveryRecord`)

- `id` (`ship_<ts>`), `folio` (`DESP-YYYY-NNN`), `shippingDate` (fecha actual), `actualDeliveryDate` (se asigna al pasar a `'Entregado'`), `status` (`'Preparando'`), `createdAt`, `updatedAt`.

---

## 3. Endpoints REST

| Método | Ruta | Descripción | RBAC |
|---|---|---|---|
| `GET` | `/api/v1/operations/shipments` | Lista despachos filtrables por `status`, `carrier`, `orderFolio`, `search` | `Operaciones.Entregas` (`read`) |
| `GET` | `/api/v1/operations/shipments/:id` | Detalle de la guía, bultos y bitácora de entrega | `Operaciones.Entregas` (`read`) |
| `POST` | `/api/v1/operations/shipments` | Crea nuevo despacho en estado `'Preparando'` | `Operaciones.Entregas` (`write`) + `receiveGoods` |
| `POST` | `/api/v1/operations/shipments/:id/advance` | Avanza estado operativo (`Preparando → En ruta → Entregado`) | `Operaciones.Entregas` (`write`) + `receiveGoods` |
| `POST` | `/api/v1/operations/shipments/:id/return` | Marca entrega como `'Devuelto'` y anexa el motivo en `notes` | `Operaciones.Entregas` (`write`) + `receiveGoods` |
| `DELETE` | `/api/v1/operations/shipments/:id` | Elimina registro de despacho | `Operaciones.Entregas` (`full`) |

---

## 4. Máquina de Estados y Reglas de Negocio

```
  [Preparando] ──(POST /advance)──> [En ruta] ──(POST /advance)──> [Entregado]
        │                               │
        └─────────(POST /return)────────┴──────────> [Devuelto]
```

1. **Avance de Estado (`/advance`):**
   - `'Preparando' → 'En ruta'`.
   - `'En ruta' → 'Entregado'`, fijando `actualDeliveryDate = today`.
   - Rechaza con `409 Conflict` si el despacho ya está en `'Entregado'` o `'Devuelto'`.
2. **Retorno Logístico (`/return`):**
   - Requiere `reason` no vacío (`minLength: 1`).
   - Transiciona `status = 'Devuelto'` y agrega `[Devolución: <reason>]` a `notes`. Puede vincularse opcionalmente con la creación de una devolución comercial (`RMA`) en **Ventas → Devoluciones**.
3. **Generación de Guía:** Si `trackingNumber` viene vacío, se construye `TRK-${carrier.slice(0, 3).toUpperCase()}-${random6}`.
4. **Auditoría:** La creación, avance de estado, devolución y eliminación registran evento en `audit_logs` (`category: 'inventory'`).
