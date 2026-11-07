# Alcance del producto

**Nombre comercial:** AES Nexus.

## Fuente y estado

La propuesta v2 es la especificación de trabajo más reciente; conserva fortalezas de v1 y corrige alcance, ciclos de vida, multi-tenancy y fases. Los valores marcados `[POR DEFECTO]` o `[PENDIENTE]` no se consideran aprobados.

## Hitos

- **H1 — Núcleo seguro:** organizaciones, identidad, membresías, permisos, módulos, auditoría y operación base.
- **H2 — Piloto comercial:** terceros, contactos, prospectos, oportunidades, actividades, catálogo, cotizaciones y pedidos. El piloto termina en el pedido.
- **H3 — MVP operativo:** inventario, compras, entregas, cobros, CxC/CxP, gastos e indicadores operativos.
- **H4 — Versión comercial:** fiscalidad de la primera jurisdicción comercial, suscripciones y endurecimiento de producción.

## Decisiones confirmadas por el propietario (2026-11-06)

- Segmento: **ERP horizontal**.
- Mercado: **México primero**, con expansión internacional posterior.
- Multimoneda: **sí desde H3**, con una moneda de reporte por organización y documentos en otras monedas con tipo de cambio guardado por documento. Faltan reglas de fecha efectiva y redondeo.
- Finanzas H3: **finanzas operativas**, sin contabilidad de doble partida.
- Capacidad de desarrollo: **una persona a tiempo parcial, 10–20 horas por semana**; las fechas deben reestimarse frente a la estimación original de 2–3 personas a tiempo completo.
- Entidad legal: **una por organización en el MVP**, con modelo preparado para ampliar.

## Primer incremento

Se construye un shell de frontend y un dashboard CRM en español con datos de demostración identificados como tales. La navegación presenta los módulos CRM, Ventas, Operaciones, Finanzas y Administración, alineados con H1–H3. Sus pantallas iniciales describen áreas previstas y no son flujos conectados a persistencia ni autenticación. El mercado inicial es México; los importes demo en MXN no son datos reales.

## Decisiones pendientes

- Reglas precisas de multimoneda: fuente/fecha del tipo de cambio, monedas permitidas, conversiones y redondeo.
- Proveedor de identidad, roles, MFA e idiomas: resolver antes de H1.
- Alcance fiscal/PAC: México está definido como primer país, pero el PAC requiere pruebas y revisión antes de H4.

No se presenta ningún valor por defecto de la propuesta como decisión aprobada.
