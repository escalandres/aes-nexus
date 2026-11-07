# Plan de desarrollo

## Estado actual

Fase 0 en progreso. Se creó un frontend de demostración; no hay API, autenticación, persistencia ni datos de negocio reales. México ya está definido como primer país; F0 aún depende de entrevistas, reglas detalladas de multimoneda, validación fiscal/PAC y reestimación por historia.

## Épicas propuestas

| Hito | Épica | Dependencias | Criterio de aceptación resumido | Estado |
|---|---|---|---|---|
| F0 | Validación de problema, segmento y mercado | Reclutar participantes; México como primer mercado | 8 entrevistas anonimizadas; problemas y diferenciación sintetizados; 4–6 alternativas comparadas | En progreso |
| F0 | Arquitectura y riesgos técnicos | Confirmar moneda, OIDC y entorno PostgreSQL | ADRs de stack, tenancy, identidad y moneda; pruebas de persistencia local; backlog reestimado | En progreso |
| H1 | Plataforma y tenancy | Cierre de F0 y proveedor OIDC | Organización, membresías y roles; todas las lecturas/escrituras autorizadas por tenant; pruebas negativas de aislamiento | Pendiente |
| H1 | Seguridad y operación base | Plataforma y política MFA | MFA, auditoría, configuración, entitlements, migraciones y observabilidad de base | Pendiente |
| H2 | Terceros y CRM | H1 | Cliente/proveedor unificado, contactos, prospectos, oportunidades y actividades | Pendiente |
| H2 | Catálogo, cotización y pedido | Terceros; aprobación de umbral de descuentos | Cotización versionada/aprobable convertible a pedido con snapshots; importación CSV | Pendiente |
| H3 | Moneda e inventario | País/segmento y política multimoneda aprobados | Existencias por almacén, reservas, movimientos auditables y conversiones monetarias reproducibles | Pendiente |
| H3 | Compras, entrega y finanzas operativas | H3 inventario; flujos definidos | Recepción independiente de factura; entrega, cobros parciales, saldos y reportes con métricas diferenciadas | Pendiente |
| H4 | Fiscalidad y salida comercial | PAC y asesoría legal para México; adapter extensible por país | Integración fiscal certificada, suscripciones, restauración tenant y hardening | Pendiente |

## Reestimación

No hay fecha aprobada. La capacidad confirmada es una persona, 10–20 horas por semana. La estimación original (28–40 semanas, equipo de 2–3 personas a tiempo completo) no aplica. Asumiendo 40 horas por persona, una extrapolación lineal daría 112–480 semanas antes de ajustar sinergias y trabajo no lineal; ese rango no sirve como compromiso. Hay que priorizar un piloto estrecho y estimar las historias después de las entrevistas.
