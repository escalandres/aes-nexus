# Documentación Backend · Arquitectura Transversal y Base de Datos (`/docs/backend`)

Especificación transversal para iniciar la construcción del backend (**ASP.NET Core 10 LTS + Entity Framework Core** según [`ADR 0001`](../decisions/0001-stack-tecnico.md)) y la base de datos **PostgreSQL 16+** de **AES Nexus**, complementando las especificaciones de cada módulo funcional.

## 1. Documentos Transversales

| Tema | Especificación Markdown | Artefacto Técnico / Esquema JSON | Propósito |
|---|---|---|---|
| **Identificadores Externos e Integraciones** | [`identificadores-externos.md`](./identificadores-externos.md) | [`identificadores-externos.schema.json`](./identificadores-externos.schema.json) | `externalId`, `externalSource`, `externalSyncedAt`, mapeo N-sistemas (`int_external_id_mappings`) y upsert idempotente |
| **Contrato Global de API REST** | [`contrato-api-global.md`](./contrato-api-global.md) | [`contrato-api-global.schema.json`](./contrato-api-global.schema.json) | Paginación, ordenamiento, filtros, errores RFC 7807 `ProblemDetails`, códigos de negocio e `Idempotency-Key` |
| **Autenticación, OIDC y Multi-Tenancy** | [`auth-y-tenancy.md`](./auth-y-tenancy.md) | [`auth-y-tenancy.schema.json`](./auth-y-tenancy.schema.json) | Flujo OIDC/JWT, MFA, API Keys externas, `core_organizations`, membresías, RBAC y RLS PostgreSQL |
| **Modelo Físico de Base de Datos (DDL)** | [`modelo-base-datos-ddl.md`](./modelo-base-datos-ddl.md) | [`schema-maestro.sql`](./schema-maestro.sql) | DDL SQL completo con llaves foráneas inter-módulo, secuencias de folios, índices y políticas RLS |
| **Reglas de Multimoneda y Redondeo** | [`multimoneda-y-redondeo.md`](./multimoneda-y-redondeo.md) | N/A | Fuente y fecha efectiva FX, precisión decimal, redondeo y diferencia cambiaria en CxC/CxP |
| **Almacenamiento de Archivos y Jobs** | [`almacenamiento-y-jobs.md`](./almacenamiento-y-jobs.md) | N/A | Storage S3/Blob para XML/PDF/CSD/logos y cron jobs (gastos recurrentes, sync Marketplace, alertas) |

---

## 2. Mapa Completo de Módulos Documentados

| Módulo | Carpeta | Esquemas JSON | Estado |
|---|---|---|---|
| **CRM** (Clientes, Proveedores, Empleados, Nómina, Oportunidades, Actividades) | [`/docs/crm`](../crm/README.md) | 6 esquemas | Completo |
| **Administración** (Subsidiarias, Departamentos, Ubicaciones, Flujos RMA, Auditoría) | [`/docs/administracion`](../administracion/README.md) | 5 esquemas | Completo |
| **Ventas** (Catálogo, Cotizaciones, Pedidos, Facturas, Devoluciones) | [`/docs/ventas`](../ventas/README.md) | 5 esquemas | Completo |
| **Compras** (Requisiciones, Órdenes de Compra, Recepciones, Facturas, Devoluciones) | [`/docs/compras`](../compras/README.md) | 5 esquemas | Completo |
| **Operaciones** (Almacenes, Inventario, Movimientos, Traslados, Entregas) | [`/docs/operaciones`](../operaciones/README.md) | 5 esquemas | Completo |
| **Finanzas** (Cobros CxC, Pagos CxP, Tesorería, Pagos Bancarios EBP, Cuentas Contables) | [`/docs/finanzas`](../finanzas/README.md) | 5 esquemas | Completo |
| **Gastos** (Pólizas, Presupuestos y Alertas, Gastos Recurrentes) | [`/docs/gastos`](../gastos/README.md) | 3 esquemas | Completo |
| **Reportes** (P&L Estado de Resultados, Alertas de Margen, 7 pestañas analíticas) | [`/docs/reportes`](../reportes/README.md) | 2 esquemas | Completo |
| **Configuración** (General, Organización, Usuarios, Roles RBAC, Umbrales, Integraciones, Plan) | [`/docs/configuracion`](../configuracion/README.md) | 5 esquemas | Completo |
| **Inicio y Soporte** (Dashboard Ejecutivo, Base de Conocimiento, Tickets) | [`/docs/inicio-y-soporte`](../inicio-y-soporte/README.md) | 1 esquema | Completo |

---

## 3. Orden Recomendado de Implementación (Migraciones y Slices)

1. **Slice 0 (Fundación DB + Tenancy + Auth):** Ejecutar `schema-maestro.sql` bloques `core_*`, `int_external_id_mappings`, `audit_logs`, `obj_attachments`; implementar middleware `X-Organization-Id` + JWT/API Key + `ProblemDetails` + `Idempotency-Key`.
2. **Slice 1 (H1 Configuración & Administración):** `cfg_roles`, `cfg_workspace_users`, `admin_subsidiaries`, `admin_departments`, `admin_locations`, `cfg_organization_settings`.
3. **Slice 2 (H2 CRM & Ventas):** `crm_*`, `sal_catalog_items`, `sal_quotes`, `sal_orders`, `sal_invoices`.
4. **Slice 3 (H3 Compras, Operaciones, Finanzas & Gastos):** `pur_*`, `ops_*`, `fin_*`, `sup_tickets`, motor FX y jobs recurrentes.
5. **Slice 4 (Analítica y Conectores):** Vistas materializadas/consultas de `/api/v1/reports/*`, webhooks salientes, Marketplace sync y timbrado CFDI 4.0 (H4).
