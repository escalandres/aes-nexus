# AES Nexus — CRM/ERP modular para PyMES

Aplicación en etapa inicial. El frontend actual es un dashboard de demostración; todavía no hay API, autenticación ni persistencia.

**AES Nexus** es el nombre comercial del sistema. La navegación agrupa los módulos previstos: CRM, Ventas, Operaciones, Finanzas y Administración. Sus pantallas son esqueletos de alcance, no funcionalidades conectadas.

## Requisitos locales

- Node.js y npm.
- .NET 10 SDK para el backend cuando inicie H1.
- Docker Desktop para PostgreSQL local (verificado con una instancia temporal PostgreSQL 16).

## Ejecutar el frontend

```powershell
npm install
npm run dev
```

También se puede iniciar en Windows con `iniciar.bat`.

Rutas principales durante el desarrollo: `/settings` para configuración, `/crm` para el módulo CRM, `/crm/customers` para clientes, `/crm/vendors` para proveedores, `/crm/opportunities` para oportunidades y `/crm/activities` para actividades. La navegación del resto de módulos usa `/sales`, `/operations`, `/finance` y `/admin`. Los endpoints de la API se estandarizan en inglés (`/api/v1/crm/customers`, etc.).

## Construir

```powershell
npm run build
```

## Estado del producto

Consulta [docs/PRODUCT_SCOPE.md](docs/PRODUCT_SCOPE.md), [docs/PHASE_0.md](docs/PHASE_0.md) y [docs/DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md). Los datos visibles del dashboard son ficticios y sólo ilustrativos.
