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

### Rutas del frontend

La navegación usa rutas del navegador sin añadir una dependencia de router en esta etapa. El contrato inicial es:

| Pantalla | Ruta |
|---|---|
| Inicio | `/` |
| Configuración | `/settings` |
| CRM | `/crm` |
| Clientes del CRM | `/crm/clientes` |
| Proveedores del CRM | `/crm/proveedores` |
| Oportunidades del CRM | `/crm/oportunidades` |
| Actividades del CRM | `/crm/actividades` |
| Ventas | `/ventas` |
| Operaciones | `/operaciones` |
| Finanzas | `/finanzas` |
| Administración | `/administracion` |

Las rutas se sincronizan con el historial del navegador y deben conservar el fallback de `index.html` al desplegarse en un servidor estático.

## Composición visual

Shell responsivo → navegación lateral → encabezado de página → tarjetas KPI y paneles CRM. El dashboard usa una capa de datos de demostración aislada de los componentes. En iteraciones posteriores esta fuente será reemplazada por servicios API y estados de carga/error/vacío.
