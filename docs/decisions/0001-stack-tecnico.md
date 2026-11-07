# ADR 0001: Stack técnico de la plataforma

- **Estado:** Propuesta técnica; pendiente de ratificación del propietario.
- **Fecha:** 2026-11-06.
- **Contexto:** La propuesta v2 recomienda un solo runtime de backend, React/TypeScript, ASP.NET Core, PostgreSQL y monolito modular. Este repositorio sólo contiene el frontend inicial.

## Decisión propuesta

- Frontend: React, TypeScript, Vite; React Router para rutas de producto.
- Backend: C# / ASP.NET Core 10 LTS y Entity Framework Core.
- Persistencia: PostgreSQL.
- Arquitectura inicial: monolito modular con API REST versionada y contrato OpenAPI.
- No añadir Redis, microservicios ni una cola externa sin una necesidad medida.

## Evidencia y límites

- El equipo local tiene .NET SDK 10.0.403, Node v26.12.1 y npm 12.2.0.
- La política de Microsoft consultada el 2026-11-06 muestra .NET 10 LTS activo y con fin de soporte el 14-11-2028.
- El Docker CLI y Compose están instalados, pero el acceso al daemon denegó permiso. `psql` no está instalado; PostgreSQL/EF no se han probado en este repo.
- El build del frontend sí se verificó; no es evidencia de funcionamiento de una API.

## Consecuencias

- .NET 10 es compatible con el entorno actual; se debe mantener en el último patch para conservar soporte.
- Resolver acceso a PostgreSQL local o elegir un entorno administrado antes del primer incremento persistente.
- Elegir proveedor OIDC antes de diseñar el login real.
- La decisión no autoriza publicar el repositorio. Licencia y distribución siguen pendientes.

## Referencias

- [Política oficial de soporte de .NET](https://dotnet.microsoft.com/es-es/platform/support/policy/dotnet-core)
- Propuesta CRM/ERP v2, secciones 5–8 y 12.
