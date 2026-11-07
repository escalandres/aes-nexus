# Arquitectura inicial

## Estado actual

El repositorio estaba vacío al inicio de este trabajo. Esta primera entrega es una aplicación frontend de demostración; no implementa backend, autenticación, base de datos ni aislamiento multiempresa.

## Dirección propuesta por la especificación

- Frontend: React, TypeScript, Vite y React Router; API tipada a partir de OpenAPI en fases posteriores.
- Backend: monolito modular ASP.NET Core Web API con Entity Framework Core.
- Persistencia: PostgreSQL como fuente de verdad.
- Los límites de módulos y el modelo de tenancy se definirán antes de conectar datos reales.
- Decisiones de producto confirmadas: AES Nexus; ERP horizontal; México primero y expansión internacional posterior; finanzas operativas en H3; multimoneda desde H3 y una entidad legal por organización en el MVP.
- Modelo multimoneda aprobado a alto nivel: una moneda de reporte por organización y documentos en otras monedas con tipo de cambio guardado por documento. Fecha efectiva, fuente, conversiones y redondeo siguen pendientes.

Esta entrega sólo usa React + TypeScript + Vite y CSS. No introduce dependencias UI adicionales. El frontend muestra esqueletos navegables para CRM, Ventas, Operaciones, Finanzas y Administración; no hay servicios ni datos persistidos.

## Composición visual

Shell responsivo → navegación lateral → encabezado de página → tarjetas KPI y paneles CRM. El dashboard usa una capa de datos de demostración aislada de los componentes. En iteraciones posteriores esta fuente será reemplazada por servicios API y estados de carga/error/vacío.
