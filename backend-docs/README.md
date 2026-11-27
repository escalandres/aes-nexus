# Documentación Técnica de Backend · AES Nexus

Esta carpeta contiene las especificaciones funcionales, contratos REST/JSON, modelos de persistencia y esquemas de validación por módulo para construir el backend de **AES Nexus**.

## Convenciones Globales de la API

- **Prefijo base:** `/api/v1`
- **Formato de intercambio:** `application/json` (UTF-8)
- **Arquitectura objetivo:** Monolito modular con aislamiento multi-empresa (**Multi-Tenancy H1**), PostgreSQL como fuente de verdad y auditoría transversal.
- **Encabezados estándar por petición:**
  - `Authorization`: `Bearer <jwt_token>`
  - `X-Organization-Id`: Identificador de la organización/tenant activo (ej. `org_brujula_default`)
  - `X-Client-App`: Identificador del cliente consumidor (`aes-nexus-frontend`)
  - `Accept`: `application/json`
  - `Content-Type`: `application/json`

## Envelope Estándar de Respuesta

```json
{
  "success": true,
  "data": {},
  "message": "Operación ejecutada correctamente.",
  "meta": {
    "timestamp": "2026-11-26T15:00:00Z",
    "organizationId": "org_brujula_default"
  }
}
```

## Estructura de Módulos

| Módulo | Entidad / Submódulo | Especificación Markdown | Esquemas JSON de Campos | Estado |
|---|---|---|---|---|
| **CRM** | Clientes | [`crm/clientes.md`](./crm/clientes.md) | [`crm/clientes.schema.json`](./crm/clientes.schema.json) · [`crm/clientes.fields.json`](./crm/clientes.fields.json) | Documentado |
| **CRM** | Proveedores | *Pendiente* | *Pendiente* | Próximo |
| **CRM** | Empleados y Nómina | *Pendiente* | *Pendiente* | Planeado |
| **CRM** | Oportunidades y Actividades | *Pendiente* | *Pendiente* | Planeado |
| **Ventas** | Catálogo, Cotizaciones, Pedidos, Facturas, Devoluciones | *Pendiente* | *Pendiente* | Planeado |
| **Compras** | Requisiciones, OC, Recepciones, Facturas, Devoluciones | *Pendiente* | *Pendiente* | Planeado |
| **Operaciones** | Inventario, Traslados, Entregas | *Pendiente* | *Pendiente* | Planeado |
| **Finanzas y Gastos** | CxC, CxP, EBP, Gastos y Presupuestos | *Pendiente* | *Pendiente* | Planeado |
| **Administración y Config.** | Subsidiarias, Departamentos, RBAC, Auditoría | *Pendiente* | *Pendiente* | Planeado |
