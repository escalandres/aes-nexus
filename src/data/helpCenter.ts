export type HelpCenterTab =
  | 'Guías por módulo'
  | 'Flujos del sistema'
  | 'Preguntas frecuentes'
  | 'Glosario y referencia'
  | 'Soporte y tickets'

export type HelpModuleTarget =
  | { page: 'Inicio' }
  | { page: 'CRM'; section?: string }
  | {
      page: 'Ventas'
      section: 'Resumen' | 'Catálogo' | 'Cotizaciones' | 'Pedidos' | 'Facturas' | 'Devoluciones'
    }
  | {
      page: 'Compras'
      section: 'Resumen' | 'Requisiciones' | 'Órdenes de compra' | 'Recepciones' | 'Facturas' | 'Devoluciones'
    }
  | {
      page: 'Operaciones'
      section: 'Resumen' | 'Inventario' | 'Traslados' | 'Compras' | 'Entregas'
    }
  | {
      page: 'Finanzas'
      section: 'Resumen' | 'Cobros' | 'Pagos' | 'Pagos Bancarios' | 'Cuentas contables'
    }
  | {
      page: 'Gastos'
      section: 'Resumen y control' | 'Registro y pólizas' | 'Presupuestos y alertas' | 'Gastos recurrentes'
    }
  | {
      page: 'Reportes'
      section:
        | 'Resumen ejecutivo'
        | 'Estado de Resultados'
        | 'Finanzas y Tesorería'
        | 'CxP y Pagos EBP'
        | 'Ventas y CxC'
        | 'Compras e Inventario'
        | 'Nómina y RRHH'
    }
  | {
      page: 'Administración'
      section:
        | 'Resumen'
        | 'Subsidiarias'
        | 'Departamentos'
        | 'Ubicaciones'
        | 'Flujos de devoluciones'
        | 'Historial de Auditoría'
    }
  | { page: 'Configuración'; section: string }

export interface HelpCategory {
  id: string
  title: string
  moduleLabel: string
  summary: string
}

export interface HelpArticleStep {
  title: string
  detail: string
}

export interface HelpArticle {
  id: string
  categoryId: string
  title: string
  summary: string
  readTimeMin: number
  updatedAt: string
  target: HelpModuleTarget
  targetLabel: string
  prerequisites: string[]
  steps: HelpArticleStep[]
  validations: string[]
}

export interface HelpWorkflowStep {
  stepNumber: number
  moduleName: string
  actionTitle: string
  detail: string
  target: HelpModuleTarget
}

export interface HelpWorkflow {
  id: string
  code: string
  title: string
  domain: string
  description: string
  outcome: string
  steps: HelpWorkflowStep[]
}

export type FaqModuleTag =
  | 'CRM'
  | 'Ventas'
  | 'Finanzas'
  | 'Gastos'
  | 'Compras y Operaciones'
  | 'Reportes'
  | 'Administración y RBAC'

export const HELP_FAQ_MODULES: Array<'Todos' | FaqModuleTag> = [
  'Todos',
  'CRM',
  'Ventas',
  'Finanzas',
  'Gastos',
  'Compras y Operaciones',
  'Reportes',
  'Administración y RBAC',
]

export type FaqComplexityLevel = 'Básico' | 'Intermedio' | 'Avanzado'

export const HELP_FAQ_COMPLEXITY_LEVELS: Array<{
  value: 'Todos' | FaqComplexityLevel
  hint: string
}> = [
  { value: 'Todos', hint: 'Todos los niveles de experiencia' },
  { value: 'Básico', hint: 'Operación diaria y consultas rápidas' },
  { value: 'Intermedio', hint: 'Flujos entre áreas y validaciones' },
  { value: 'Avanzado', hint: 'Contabilidad, EBP, P&L y RBAC' },
]

export type FaqAnswerFormat = 'Todas' | 'Con pasos rápidos' | 'Con acceso directo'

export const HELP_FAQ_FORMATS: FaqAnswerFormat[] = [
  'Todas',
  'Con pasos rápidos',
  'Con acceso directo',
]

export type FaqVisualCategory =
  | 'Operación diaria'
  | 'Flujo comercial'
  | 'Bancario y EBP'
  | 'Control y alertas'
  | 'Contabilidad y P&L'
  | 'Seguridad y RBAC'

export const HELP_FAQ_VISUAL_CATEGORIES: Array<'Todas' | FaqVisualCategory> = [
  'Todas',
  'Operación diaria',
  'Flujo comercial',
  'Bancario y EBP',
  'Control y alertas',
  'Contabilidad y P&L',
  'Seguridad y RBAC',
]

export interface HelpFaq {
  id: string
  categoryId: string
  moduleTag: FaqModuleTag
  visualCategory: FaqVisualCategory
  tags: string[]
  complexity: FaqComplexityLevel
  question: string
  answer: string
  quickSteps?: string[]
  relatedTarget?: HelpModuleTarget
  relatedLabel?: string
}

export type GlossaryDomain =
  | 'Fiscal y CFDI'
  | 'Bancario y EBP'
  | 'Finanzas y P&L'
  | 'Operaciones y RBAC'

export interface HelpGlossaryItem {
  id: string
  term: string
  domain: GlossaryDomain
  formulaOrRule: string
  definition: string
}

export type TicketPriority = 'Baja' | 'Media' | 'Alta'
export type TicketStatus = 'Abierto' | 'En revisión' | 'Resuelto'

export interface SupportTicketNote {
  id: string
  author: string
  date: string
  message: string
}

export interface SupportTicketRecord {
  id: string
  code: string
  subject: string
  moduleName: string
  priority: TicketPriority
  status: TicketStatus
  requesterName: string
  createdAt: string
  updatedAt: string
  description: string
  notes: SupportTicketNote[]
}

export const HELP_CENTER_TABS: HelpCenterTab[] = [
  'Guías por módulo',
  'Flujos del sistema',
  'Preguntas frecuentes',
  'Glosario y referencia',
  'Soporte y tickets',
]

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: 'getting-started',
    title: 'Primeros pasos y acceso',
    moduleLabel: 'Inicio y Configuración',
    summary: 'Navegación principal, cambio de perfil activo y notificaciones operativas.',
  },
  {
    id: 'crm-payroll',
    title: 'CRM, Proveedores y Nómina',
    moduleLabel: 'CRM',
    summary: 'Clientes, cuentas bancarias de proveedores, plantilla laboral y timbrado de nómina.',
  },
  {
    id: 'sales-rma',
    title: 'Ventas y Devoluciones (RMA)',
    moduleLabel: 'Ventas',
    summary: 'Catálogo de precios, cotizaciones, pedidos firmes, facturación CxC y devoluciones.',
  },
  {
    id: 'purchases-ops',
    title: 'Compras, Almacenes e Inventario',
    moduleLabel: 'Compras y Operaciones',
    summary: 'Requisiciones, órdenes de compra, recepciones, traslados y umbrales de stock.',
  },
  {
    id: 'finance-ebp',
    title: 'Finanzas, Tesorería y EBP',
    moduleLabel: 'Finanzas',
    summary: 'Cobranza CxC, cuentas por pagar, dispersión bancaria EBP y catálogo contable.',
  },
  {
    id: 'expenses-budgets',
    title: 'Gastos, Presupuestos y P&L',
    moduleLabel: 'Gastos y Reportes',
    summary: 'Pólizas, alertas automáticas 80%/95%, gastos recurrentes y Estado de Resultados.',
  },
  {
    id: 'admin-rbac',
    title: 'Administración y Seguridad RBAC',
    moduleLabel: 'Administración y Auditoría',
    summary: 'Subsidiarias, centros de costo, roles granulares y bitácora de auditoría.',
  },
]

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: 'guide-navigation-roles',
    categoryId: 'getting-started',
    title: 'Navegación, notificaciones y cambio rápido de perfil activo',
    summary: 'Aprende a moverte entre áreas del ERP, validar permisos de distintos roles y atender alertas en tiempo real.',
    readTimeMin: 3,
    updatedAt: 'Nov 2026',
    target: { page: 'Inicio' },
    targetLabel: 'Inicio · Tablero ejecutivo',
    prerequisites: [
      'Contar con un usuario o empleado asignado a al menos un rol en Configuración.',
      'Mantener habilitadas las notificaciones operativas si deseas alertas de stock bajo.',
    ],
    steps: [
      {
        title: 'Usa el buscador lateral o la barra de navegación',
        detail: 'Desde la barra izquierda accede a cualquier módulo habilitado para tu rol. El buscador superior del menú lateral filtra vistas y accesos al instante.',
      },
      {
        title: 'Revisa el Centro de Notificaciones superior',
        detail: 'Haz clic en la campana de la barra superior para consultar quiebres de inventario bajo umbral y avisos del sistema, con enlace directo a la pantalla afectada.',
      },
      {
        title: 'Alterna perfiles para probar permisos RBAC',
        detail: 'En la esquina inferior izquierda, abre el selector de usuario/rol para cambiar entre Administrador, Ventas, Operaciones o Finanzas sin perder tu sesión demo.',
      },
    ],
    validations: [
      'Los módulos sin permiso quedan bloqueados automáticamente o muestran el aviso de Acceso restringido.',
      'Cada cambio de usuario queda reflejado en la barra inferior y en los registros de auditoría.',
    ],
  },
  {
    id: 'guide-workspace-preferences',
    categoryId: 'getting-started',
    title: 'Configuración de idioma, apariencia y umbrales de stock',
    summary: 'Personaliza el idioma de la interfaz, tema claro/oscuro y políticas globales de inventario mínimo.',
    readTimeMin: 3,
    updatedAt: 'Nov 2026',
    target: { page: 'Configuración', section: 'Umbrales de stock' },
    targetLabel: 'Configuración · Umbrales de stock',
    prerequisites: [
      'Permiso de edición en las secciones de Configuración correspondientes.',
    ],
    steps: [
      {
        title: 'Ajusta región, moneda e idioma',
        detail: 'En Configuración > Idioma y región define el formato local (ES-MX, ES-ES, EN-US o PT-BR) y los parámetros fiscales base.',
      },
      {
        title: 'Activa modo oscuro o color de acento',
        detail: 'Desde Apariencia alterna entre modo claro y oscuro; la preferencia se persiste localmente entre recargas.',
      },
      {
        title: 'Define umbrales por categoría de producto',
        detail: 'En Umbrales de stock decide si la regla por categoría se hereda o sobrescribe el mínimo individual de cada SKU.',
      },
    ],
    validations: [
      'Al guardar un umbral, el tablero ejecutivo y Operaciones recalculan las alertas de reposición.',
    ],
  },
  {
    id: 'guide-crm-suppliers-clabe',
    categoryId: 'crm-payroll',
    title: 'Alta de proveedores y validación de cuentas CLABE Mod-10',
    summary: 'Registra cuentas bancarias múltiples por proveedor y define la cuenta predeterminada para dispersión bancaria EBP.',
    readTimeMin: 4,
    updatedAt: 'Nov 2026',
    target: { page: 'CRM', section: 'Proveedores' },
    targetLabel: 'CRM · Proveedores',
    prerequisites: [
      'RFC válido del proveedor y carátula bancaria con CLABE interbancaria de 18 dígitos.',
      'Permiso de edición en CRM · Proveedores.',
    ],
    steps: [
      {
        title: 'Abre la ficha de un proveedor en CRM',
        detail: 'Ingresa a CRM > Proveedores y selecciona el proveedor desde la tabla o da de alta uno nuevo con su RFC y moneda principal.',
      },
      {
        title: 'Registra una o más cuentas bancarias',
        detail: 'Dentro del gestor bancario del proveedor ingresa Banco, alias, moneda (MXN o USD) y CLABE de 18 dígitos. El sistema valida automáticamente el dígito verificador Mod-10.',
      },
      {
        title: 'Marca la cuenta predeterminada y layout compatible',
        detail: 'Asigna qué cuenta se seleccionará por defecto al generar lotes en Finanzas > Pagos Bancarios (EBP).',
      },
    ],
    validations: [
      'No es posible incluir en un lote EBP a un proveedor que carezca de una cuenta bancaria activa en la misma moneda de sus facturas.',
    ],
  },
  {
    id: 'guide-crm-payroll',
    categoryId: 'crm-payroll',
    title: 'Gestión de plantilla y cálculo de corridas de nómina',
    summary: 'Administra empleados, sueldos netos y genera corridas quincenales listas para dispersión bancaria y reporte P&L.',
    readTimeMin: 4,
    updatedAt: 'Nov 2026',
    target: { page: 'CRM', section: 'Nómina' },
    targetLabel: 'CRM · Nómina',
    prerequisites: [
      'Empleados activos en CRM · Empleados con departamento, ubicación y sueldo configurado.',
    ],
    steps: [
      {
        title: 'Verifica empleados activos y centro de costo',
        detail: 'Revisa en CRM > Empleados que cada colaborador tenga departamento y estatus Activo antes de abrir la corrida.',
      },
      {
        title: 'Crea o revisa la corrida de nómina',
        detail: 'En CRM > Nómina selecciona el periodo, valida percepciones, deducciones e ISR retenido por empleado.',
      },
      {
        title: 'Aprueba y canaliza a dispersión EBP',
        detail: 'Una vez aprobada la corrida, Finanzas puede dispersarla vía Pagos Bancarios (EBP) y el costo laboral se refleja automáticamente en el Estado de Resultados.',
      },
    ],
    validations: [
      'Cada corrida aprobada actualiza los reportes de Nómina y RRHH y suma al rubro de Gastos operativos y de administración en Reportes.',
    ],
  },
  {
    id: 'guide-sales-quote-to-invoice',
    categoryId: 'sales-rma',
    title: 'Del catálogo y cotización al pedido y factura CxC',
    summary: 'Convierte cotizaciones aprobadas en pedidos firmes con reserva de inventario y emisión de factura por cobrar.',
    readTimeMin: 5,
    updatedAt: 'Nov 2026',
    target: { page: 'Ventas', section: 'Cotizaciones' },
    targetLabel: 'Ventas · Cotizaciones',
    prerequisites: [
      'Cliente activo registrado en CRM · Clientes.',
      'Productos y servicios activos en Ventas · Catálogo con stock disponible si aplica entrega física.',
    ],
    steps: [
      {
        title: 'Genera una cotización comercial',
        detail: 'En Ventas > Cotizaciones elige al cliente, agrega líneas del catálogo, revisa impuestos y guarda el documento en borrador o enviada.',
      },
      {
        title: 'Convierte a Pedido de venta',
        detail: 'Usa la acción de conversión en la cotización para crear el pedido en Ventas > Pedidos conservando partidas, precios y condiciones.',
      },
      {
        title: 'Emite la factura CxC vinculada',
        detail: 'Desde el pedido confirmado genera la factura en Ventas > Facturas. El saldo pendiente aparecerá de inmediato en Finanzas > Cobros.',
      },
    ],
    validations: [
      'Las facturas emitidas impactan Ingresos totales en Reportes > Estado de Resultados excluyendo documentos cancelados.',
    ],
  },
  {
    id: 'guide-sales-returns',
    categoryId: 'sales-rma',
    title: 'Gestión de devoluciones de clientes (RMA) y aprobaciones',
    summary: 'Registra devoluciones con flujo controlado por reglas configurables y ajuste neto en ingresos.',
    readTimeMin: 4,
    updatedAt: 'Nov 2026',
    target: { page: 'Ventas', section: 'Devoluciones' },
    targetLabel: 'Ventas · Devoluciones',
    prerequisites: [
      'Pedido o factura de venta previa para referenciar los artículos devueltos.',
      'Políticas de aprobación definidas en Administración > Flujos de devoluciones.',
    ],
    steps: [
      {
        title: 'Crea la solicitud RMA',
        detail: 'Selecciona el cliente, el motivo de devolución y las cantidades a retornar en Ventas > Devoluciones.',
      },
      {
        title: 'Solicita validación si supera el umbral',
        detail: 'Cuando la regla de flujo exige aprobación de supervisor o finanzas, el cambio de estado bloqueará edición hasta contar con autorización del rol permitido.',
      },
      {
        title: 'Cierra la devolución y acredita saldo',
        detail: 'Al completar la recepción/nota de crédito, el descuento se refleja automáticamente en el análisis de ingresos netos.',
      },
    ],
    validations: [
      'Un RMA aprobado o cerrado no puede eliminarse sin revertir permisos de flujo.',
    ],
  },
  {
    id: 'guide-purchases-cycle',
    categoryId: 'purchases-ops',
    title: 'Requisiciones, órdenes de compra, recepciones y facturas CxP',
    summary: 'Controla el ciclo completo de abastecimiento desde la solicitud interna hasta la recepción en almacén y cuenta por pagar.',
    readTimeMin: 5,
    updatedAt: 'Nov 2026',
    target: { page: 'Compras', section: 'Requisiciones' },
    targetLabel: 'Compras · Requisiciones',
    prerequisites: [
      'Proveedor registrado y artículos creados en el catálogo.',
      'Almacén destino activo en Operaciones o Administración > Ubicaciones.',
    ],
    steps: [
      {
        title: 'Captura y aprueba la requisición',
        detail: 'En Compras > Requisiciones indica centro de costo, artículos requeridos y justificación. Un rol con approvePurchases autoriza el gasto.',
      },
      {
        title: 'Emite la Orden de Compra (OC)',
        detail: 'Convierte la requisición a OC en Compras > Órdenes de compra seleccionando al proveedor y fechas compromiso.',
      },
      {
        title: 'Registra recepción física y factura de proveedor',
        detail: 'Confirma entrada de mercancía en Compras > Recepciones para sumar inventario y captura el comprobante en Compras > Facturas para habilitar el pago en Tesorería y EBP.',
      },
    ],
    validations: [
      'La recepción incrementa existencias en Operaciones > Inventario y genera movimientos en el kardex.',
    ],
  },
  {
    id: 'guide-operations-inventory',
    categoryId: 'purchases-ops',
    title: 'Control de inventario, traslados entre almacenes y entregas',
    summary: 'Supervisa existencias por sucursal, ejecuta traslados internos y da seguimiento a embarques de última milla.',
    readTimeMin: 4,
    updatedAt: 'Nov 2026',
    target: { page: 'Operaciones', section: 'Inventario' },
    targetLabel: 'Operaciones · Inventario',
    prerequisites: [
      'Mínimo dos almacenes o ubicaciones activas para realizar traslados.',
    ],
    steps: [
      {
        title: 'Filtra existencias y detecta alertas',
        detail: 'En Operaciones > Inventario consulta stock disponible, comprometido y artículos por debajo del umbral configurado.',
      },
      {
        title: 'Programa traslados entre bodegas',
        detail: 'En Operaciones > Traslados especifica almacén origen, destino y unidades a mover para equilibrar inventario sin nuevas compras.',
      },
      {
        title: 'Actualiza entregas a clientes',
        detail: 'Desde Operaciones > Entregas cambia el estado de preparación, en ruta y entregado con folio de seguimiento.',
      },
    ],
    validations: [
      'Cada traslado actualiza simultáneamente las existencias de origen y destino.',
    ],
  },
  {
    id: 'guide-finance-receivables-payables',
    categoryId: 'finance-ebp',
    title: 'Cobranza CxC, pagos a proveedores y conciliación de tesorería',
    summary: 'Registra cobros de clientes, controla vencimientos por pagar y consulta los saldos en cuentas bancarias.',
    readTimeMin: 4,
    updatedAt: 'Nov 2026',
    target: { page: 'Finanzas', section: 'Cobros' },
    targetLabel: 'Finanzas · Cobros',
    prerequisites: [
      'Cuentas bancarias empresariales registradas y facturas vigentes en CxC o CxP.',
    ],
    steps: [
      {
        title: 'Aplica cobros sobre facturas de venta',
        detail: 'En Finanzas > Cobros selecciona la factura pendiente, define el monto recibido (total o parcial) y elige la cuenta bancaria receptora.',
      },
      {
        title: 'Gestiona cuentas por pagar individuales',
        detail: 'En Finanzas > Pagos monitorea facturas de proveedores próximas a vencer para liquidarlas directamente o enviarlas a lote EBP.',
      },
      {
        title: 'Consulta saldos y pólizas contables',
        detail: 'Verifica movimientos de tesorería en Finanzas > Resumen y cuentas de mayor (4xxx–8xxx) en Finanzas > Cuentas contables.',
      },
    ],
    validations: [
      'Los cobros y pagos actualizan en tiempo real el saldo disponible de la cuenta bancaria elegida.',
    ],
  },
  {
    id: 'guide-finance-ebp',
    categoryId: 'finance-ebp',
    title: 'Dispersión de Pagos Bancarios Electrónicos (EBP)',
    summary: 'Arma lotes individuales o consolidados para BBVA, Banamex y Banorte exclusivamente para facturas de proveedor y nóminas.',
    readTimeMin: 5,
    updatedAt: 'Nov 2026',
    target: { page: 'Finanzas', section: 'Pagos Bancarios' },
    targetLabel: 'Finanzas · Pagos Bancarios',
    prerequisites: [
      'Facturas de proveedor aprobadas o corridas de nómina autorizadas.',
      'Proveedores con cuenta CLABE válida en la misma moneda del documento.',
    ],
    steps: [
      {
        title: 'Abre el Asistente EBP',
        detail: 'Desde Finanzas > Pagos Bancarios selecciona el paquete bancario (BBVA Cash Windows, Citibanamex BancaNet o Banorte) y elige modo Individual o Consolidado.',
      },
      {
        title: 'Edita montos y captura motivo de pago',
        detail: 'El modo Consolidado agrupa facturas del mismo proveedor y cuenta destino en 1 sola línea bancaria. Ajusta abonos parciales si lo necesitas y escribe el motivo obligatorio.',
      },
      {
        title: 'Exporta el layout y aplica en banco',
        detail: 'Genera el archivo de layout, valida el resumen financiero y presiona Aplicar en banco para liquidar facturas, descontar tesorería y dejar rastro en auditoría.',
      },
    ],
    validations: [
      'Por seguridad financiera, los gastos operativos generales de la empresa están desacoplados del motor EBP y se controlan en el módulo Gastos.',
    ],
  },
  {
    id: 'guide-expenses-kpis-ledger',
    categoryId: 'expenses-budgets',
    title: 'Registro fiscal de pólizas y lectura de KPIs del periodo',
    summary: 'Captura gastos con RFC, UUID y desglose de IVA, clasificando su naturaleza y comportamiento fijo o variable.',
    readTimeMin: 4,
    updatedAt: 'Nov 2026',
    target: { page: 'Gastos', section: 'Resumen y control' },
    targetLabel: 'Gastos · Resumen y control',
    prerequisites: [
      'Cuenta contable (5xxx/6xxx/7xxx), departamento y ubicación destino disponibles.',
    ],
    steps: [
      {
        title: 'Analiza los KPIs del periodo y tendencias mensuales',
        detail: 'En Gastos > Resumen y control revisa Gasto total, Ahorro vs. presupuesto, Margen de maniobra y las gráficas comparativas de Gasto vs. Presupuesto, Fijo vs. Variable y Ahorro mensual.',
      },
      {
        title: 'Registra una nueva póliza de gasto',
        detail: 'En Gastos > Registro y pólizas captura concepto, proveedor, RFC emisor, UUID fiscal, subtotal, IVA, naturaleza analítica y comportamiento (Fijo o Variable).',
      },
      {
        title: 'Vincula centro de costo y estatus',
        detail: 'Asigna departamento, sucursal y cuenta bancaria si el gasto ya fue pagado para descontar el saldo en tesorería.',
      },
    ],
    validations: [
      'Al guardar un gasto del mes activo, se evalúan automáticamente los umbrales de presupuesto y se disparan alertas preventivas o críticas si aplica.',
    ],
  },
  {
    id: 'guide-expenses-budgets-recurring',
    categoryId: 'expenses-budgets',
    title: 'Presupuestos por naturaleza, alertas 80%/95% y gastos recurrentes',
    summary: 'Configura topes mensuales, edita en matriz rápida y automatiza pólizas periódicas sin duplicados.',
    readTimeMin: 4,
    updatedAt: 'Nov 2026',
    target: { page: 'Gastos', section: 'Presupuestos y alertas' },
    targetLabel: 'Gastos · Presupuestos y alertas',
    prerequisites: [
      'Permiso de edición en el módulo Gastos.',
    ],
    steps: [
      {
        title: 'Configura los umbrales globales de alerta',
        detail: 'En Gastos > Presupuestos y alertas ajusta el porcentaje de alerta preventiva (por defecto 80%) y crítica (por defecto 95%) o personalízalos por regla.',
      },
      {
        title: 'Edita límites en Tarjetas o Matriz por naturaleza',
        detail: 'Cambia entre vista de tarjetas detalladas y Matriz por naturaleza para definir límites mensuales, centros de costo y umbrales en una sola tabla.',
      },
      {
        title: 'Genera lotes desde Gastos recurrentes',
        detail: 'En Gastos > Gastos recurrentes programa rentas, SaaS o servicios y usa Generar lote del mes; el sistema omite automáticamente plantillas ya ejecutadas en el mismo mes.',
      },
    ],
    validations: [
      'Cuando el consumo alcanza el 80% o el 95%, tanto los indicadores visuales como la barra de alertas reflejan el nivel de riesgo.',
    ],
  },
  {
    id: 'guide-reports-pnl',
    categoryId: 'expenses-budgets',
    title: 'Estado de Resultados (P&L), Márgenes y Punto de Equilibrio',
    summary: 'Evalúa la rentabilidad real conectando Ventas, Costos, Nómina, Gastos y simula escenarios de equilibrio.',
    readTimeMin: 5,
    updatedAt: 'Nov 2026',
    target: { page: 'Reportes', section: 'Estado de Resultados' },
    targetLabel: 'Reportes · Estado de Resultados',
    prerequisites: [
      'Movimientos registrados en Ventas, Compras, Nómina o Gastos dentro del rango de fechas elegido.',
    ],
    steps: [
      {
        title: 'Aplica filtros ejecutivos globales',
        detail: 'Selecciona rango de fechas, sucursal, departamento, moneda (MXN/USD) y activa el comparativo contra periodo anterior si deseas medir variaciones.',
      },
      {
        title: 'Inspecciona la cascada contable y desgloses',
        detail: 'Expande las líneas del P&L para auditar Ingresos totales, Costos de venta, Utilidad bruta, Gastos operativos/administrativos/nómina, EBIT, Gastos financieros, Otros ingresos, ISR y Utilidad Neta.',
      },
      {
        title: 'Usa el simulador de Punto de Equilibrio',
        detail: 'Ajusta la tasa fiscal estimada o varía hipotéticamente costos fijos y margen de contribución para conocer las ventas mínimas necesarias sin alterar los datos reales.',
      },
    ],
    validations: [
      'Puedes exportar el Estado de Resultados completo en CSV o imprimir una vista limpia en PDF.',
    ],
  },
  {
    id: 'guide-admin-structure',
    categoryId: 'admin-rbac',
    title: 'Subsidiarias, Departamentos, Ubicaciones y Auditoría',
    summary: 'Administra la estructura legal y operativa de tu organización y audita cada cambio relevante en el ERP.',
    readTimeMin: 4,
    updatedAt: 'Nov 2026',
    target: { page: 'Administración', section: 'Subsidiarias' },
    targetLabel: 'Administración · Subsidiarias',
    prerequisites: [
      'Perfil de Administrador o permisos explícitos sobre Administración.',
    ],
    steps: [
      {
        title: 'Da de alta entidades legales y sucursales',
        detail: 'En Administración > Subsidiarias y Ubicaciones registra razones sociales, RFC, moneda base y sedes físicas o almacenes.',
      },
      {
        title: 'Organiza centros de costo por departamento',
        detail: 'En Administración > Departamentos crea las áreas operativas que luego aparecerán disponibles al capturar gastos, requisiciones y reportes P&L.',
      },
      {
        title: 'Consulta el Historial de Auditoría',
        detail: 'En Administración > Historial de Auditoría filtra eventos CRUD por usuario, módulo y fecha para validar trazabilidad completa.',
      },
    ],
    validations: [
      'Altas y modificaciones críticas generan automáticamente un registro inmutable en la bitácora de auditoría.',
    ],
  },
  {
    id: 'guide-rbac-roles',
    categoryId: 'admin-rbac',
    title: 'Control granular de roles y permisos por sección',
    summary: 'Diseña roles a la medida asignando niveles Ver, Crear, Editar o Total para cada submódulo del sistema.',
    readTimeMin: 4,
    updatedAt: 'Nov 2026',
    target: { page: 'Configuración', section: 'Roles y permisos' },
    targetLabel: 'Configuración · Roles y permisos',
    prerequisites: [
      'Rol de Administrador activo.',
    ],
    steps: [
      {
        title: 'Selecciona o crea un rol de trabajo',
        detail: 'En Configuración > Roles y permisos elige uno de los roles integrados o crea un nuevo perfil personalizado.',
      },
      {
        title: 'Ajusta capacidades y matriz por submódulo',
        detail: 'Define el nivel de acceso (Sin acceso, Ver, Crear, Editar, Control total) por cada módulo y pestaña del ERP.',
      },
      {
        title: 'Asigna el rol a usuarios o empleados',
        detail: 'Vincula el perfil en Configuración > Usuarios y valida el resultado inmediatamente usando el selector de rol en la barra lateral.',
      },
    ],
    validations: [
      'Los botones de creación, edición o eliminación se ocultan o bloquean según el nivel otorgado al rol.',
    ],
  },
]

export const HELP_WORKFLOWS: HelpWorkflow[] = [
  {
    id: 'wf-order-to-cash',
    code: 'FLUJO O2C',
    title: 'Ciclo Comercial: Cotización a Cobranza e Ingresos',
    domain: 'Comercial y Tesorería',
    description: 'Recorre la operación completa desde el alta del prospecto hasta el ingreso efectivo en cuenta bancaria y el P&L.',
    outcome: 'Factura liquidada, stock descontado e ingreso auditado en Estado de Resultados.',
    steps: [
      {
        stepNumber: 1,
        moduleName: 'CRM · Clientes',
        actionTitle: 'Validar ficha del cliente',
        detail: 'Asegura razón social, RFC y condiciones de crédito.',
        target: { page: 'CRM', section: 'Clientes' },
      },
      {
        stepNumber: 2,
        moduleName: 'Ventas · Cotizaciones',
        actionTitle: 'Crear y aprobar cotización',
        detail: 'Agrega productos del catálogo y convierte a pedido firme.',
        target: { page: 'Ventas', section: 'Cotizaciones' },
      },
      {
        stepNumber: 3,
        moduleName: 'Operaciones · Entregas',
        actionTitle: 'Despachar desde almacén',
        detail: 'Confirma preparación y salida de inventario al cliente.',
        target: { page: 'Operaciones', section: 'Entregas' },
      },
      {
        stepNumber: 4,
        moduleName: 'Ventas · Facturas',
        actionTitle: 'Emitir factura CxC',
        detail: 'Genera el documento fiscal por cobrar vinculado al pedido.',
        target: { page: 'Ventas', section: 'Facturas' },
      },
      {
        stepNumber: 5,
        moduleName: 'Finanzas · Cobros',
        actionTitle: 'Registrar cobro en banco',
        detail: 'Concilia el abono contra la cuenta bancaria receptora.',
        target: { page: 'Finanzas', section: 'Cobros' },
      },
    ],
  },
  {
    id: 'wf-procure-to-ebp',
    code: 'FLUJO P2P',
    title: 'Abastecimiento y Dispersión Bancaria EBP',
    domain: 'Compras y Pagos Bancarios',
    description: 'Conecta la necesidad interna de compra con la recepción en bodega y el pago consolidado vía layout bancario.',
    outcome: 'Inventario reabastecido, CxP saldada y layout EBP aplicado en banco.',
    steps: [
      {
        stepNumber: 1,
        moduleName: 'CRM · Proveedores',
        actionTitle: 'Verificar CLABE Mod-10',
        detail: 'Confirma cuenta bancaria predeterminada y moneda del proveedor.',
        target: { page: 'CRM', section: 'Proveedores' },
      },
      {
        stepNumber: 2,
        moduleName: 'Compras · Requisiciones',
        actionTitle: 'Aprobar requisición interna',
        detail: 'Autoriza partidas y conviértelas en orden de compra.',
        target: { page: 'Compras', section: 'Requisiciones' },
      },
      {
        stepNumber: 3,
        moduleName: 'Compras · Recepciones',
        actionTitle: 'Recibir mercancía en almacén',
        detail: 'Acredita existencias en Operaciones y registra factura CxP.',
        target: { page: 'Compras', section: 'Recepciones' },
      },
      {
        stepNumber: 4,
        moduleName: 'Finanzas · Pagos Bancarios',
        actionTitle: 'Generar lote EBP y aplicar',
        detail: 'Consolida facturas, ingresa motivo, exporta layout y aplica pago.',
        target: { page: 'Finanzas', section: 'Pagos Bancarios' },
      },
    ],
  },
  {
    id: 'wf-expense-to-pnl',
    code: 'FLUJO FP&A',
    title: 'Control Presupuestal de Gastos y Rentabilidad P&L',
    domain: 'Control Financiero',
    description: 'Establece límites mensuales con alertas automáticas 80%/95%, registra pólizas y mide su impacto en el Punto de Equilibrio.',
    outcome: 'Presupuestos vigilados y Estado de Resultados actualizado al centavo.',
    steps: [
      {
        stepNumber: 1,
        moduleName: 'Administración · Departamentos',
        actionTitle: 'Definir centros de costo',
        detail: 'Asegura departamentos y sucursales activos para imputación.',
        target: { page: 'Administración', section: 'Departamentos' },
      },
      {
        stepNumber: 2,
        moduleName: 'Gastos · Presupuestos y alertas',
        actionTitle: 'Configurar topes y alertas 80%/95%',
        detail: 'Fija presupuestos mensuales por naturaleza y umbrales de aviso.',
        target: { page: 'Gastos', section: 'Presupuestos y alertas' },
      },
      {
        stepNumber: 3,
        moduleName: 'Gastos · Registro y pólizas',
        actionTitle: 'Capturar pólizas fiscales',
        detail: 'Clasifica comportamiento Fijo/Variable, RFC, UUID e impuestos.',
        target: { page: 'Gastos', section: 'Registro y pólizas' },
      },
      {
        stepNumber: 4,
        moduleName: 'Reportes · Estado de Resultados',
        actionTitle: 'Evaluar márgenes y equilibrio',
        detail: 'Audita Utilidad Neta y simula escenarios en el Punto de Equilibrio.',
        target: { page: 'Reportes', section: 'Estado de Resultados' },
      },
    ],
  },
  {
    id: 'wf-governance-rbac',
    code: 'FLUJO RBAC',
    title: 'Gobierno Organizacional, Roles y Auditoría',
    domain: 'Seguridad y Cumplimiento',
    description: 'Prepara una nueva entidad operativa definiendo su estructura, permisos mínimos por sección y trazabilidad de acciones.',
    outcome: 'Operación segregada por roles con historial de auditoría verificable.',
    steps: [
      {
        stepNumber: 1,
        moduleName: 'Administración · Subsidiarias',
        actionTitle: 'Configurar subsidiaria y sedes',
        detail: 'Registra entidad legal, RFC, moneda base y almacenes.',
        target: { page: 'Administración', section: 'Subsidiarias' },
      },
      {
        stepNumber: 2,
        moduleName: 'Configuración · Roles y permisos',
        actionTitle: 'Definir matriz granular',
        detail: 'Asigna permisos Ver, Crear, Editar o Total por cada pestaña.',
        target: { page: 'Configuración', section: 'Roles y permisos' },
      },
      {
        stepNumber: 3,
        moduleName: 'Administración · Flujos de devoluciones',
        actionTitle: 'Establecer aprobaciones RMA',
        detail: 'Configura montos y roles autorizadores para devoluciones.',
        target: { page: 'Administración', section: 'Flujos de devoluciones' },
      },
      {
        stepNumber: 4,
        moduleName: 'Administración · Historial de Auditoría',
        actionTitle: 'Auditar movimientos',
        detail: 'Inspecciona eventos registrados por usuario, módulo y marca de tiempo.',
        target: { page: 'Administración', section: 'Historial de Auditoría' },
      },
    ],
  },
]

export const HELP_FAQS: HelpFaq[] = [
  {
    id: 'faq-crm-clabe-validation',
    categoryId: 'crm-payroll',
    moduleTag: 'CRM',
    visualCategory: 'Bancario y EBP',
    tags: ['CLABE Mod-10', 'Proveedores'],
    complexity: 'Intermedio',
    question: '¿Por qué el sistema rechaza una CLABE al registrar un proveedor en CRM?',
    answer:
      'AES Nexus aplica validación matemática Mod-10 sobre los 18 dígitos de la CLABE interbancaria antes de habilitarla para dispersión bancaria. Si un dígito verificador no coincide o la longitud no es exacta, se bloquea el guardado para prevenir rechazos en banco.',
    quickSteps: [
      'Verifica que la CLABE tenga exactamente 18 dígitos numéricos sin espacios ni guiones.',
      'Confirma que la moneda de la cuenta (MXN o USD) coincida con las facturas del proveedor.',
      'Marca una cuenta como predeterminada si el proveedor maneja múltiples bancos.',
    ],
    relatedTarget: { page: 'CRM', section: 'Proveedores' },
    relatedLabel: 'Revisar proveedores en CRM',
  },
  {
    id: 'faq-crm-payroll-employees',
    categoryId: 'crm-payroll',
    moduleTag: 'CRM',
    visualCategory: 'Operación diaria',
    tags: ['Nómina', 'Plantilla activa'],
    complexity: 'Intermedio',
    question: '¿Qué requisitos necesita un empleado en CRM para aparecer en una corrida de nómina?',
    answer:
      'Solo los colaboradores con estatus Activo y salario configurado en CRM > Empleados se incluyen automáticamente en el cálculo de percepciones y retenciones de nómina. Adicionalmente, si deseas que inicien sesión en el ERP debes asignarles al menos un rol de acceso.',
    quickSteps: [
      'Abre CRM > Empleados y edita la ficha del colaborador.',
      'Asigna departamento, ubicación y confirma que el estatus sea Activo.',
      'Genera o recalcula la corrida en CRM > Nómina para enviarla a EBP y P&L.',
    ],
    relatedTarget: { page: 'CRM', section: 'Empleados' },
    relatedLabel: 'Ir a CRM · Empleados',
  },
  {
    id: 'faq-crm-opportunities-follow',
    categoryId: 'crm-payroll',
    moduleTag: 'CRM',
    visualCategory: 'Flujo comercial',
    tags: ['Oportunidades', 'Seguimiento'],
    complexity: 'Básico',
    question: '¿Cómo dar seguimiento a oportunidades comerciales y actividades sin perder trazabilidad?',
    answer:
      'Desde CRM > Oportunidades puedes actualizar la etapa y probabilidad de cierre de cada negocio, mientras que CRM > Actividades registra llamadas, visitas y tareas vinculadas a clientes existentes para mantener sincronizado el tablero ejecutivo.',
    relatedTarget: { page: 'CRM', section: 'Oportunidades' },
    relatedLabel: 'Abrir CRM · Oportunidades',
  },
  {
    id: 'faq-sales-quote-to-order',
    categoryId: 'sales-rma',
    moduleTag: 'Ventas',
    visualCategory: 'Flujo comercial',
    tags: ['Cotizaciones', 'Facturación CxC'],
    complexity: 'Intermedio',
    question: '¿Cómo convertir una cotización en pedido firme y factura por cobrar sin recapturar?',
    answer:
      'Las cotizaciones aprobadas pueden convertirse directamente a Pedido desde Ventas > Cotizaciones conservando cliente, partidas, descuentos e impuestos. Posteriormente, desde el pedido confirmado se emite la factura CxC que aparece al instante en Finanzas > Cobros.',
    quickSteps: [
      'Asegura que la cotización tenga cliente y productos válidos en Ventas > Cotizaciones.',
      'Ejecuta la conversión a Pedido para comprometer unidades del catálogo.',
      'Genera la factura desde Ventas > Pedidos o Ventas > Facturas.',
    ],
    relatedTarget: { page: 'Ventas', section: 'Cotizaciones' },
    relatedLabel: 'Ir a Ventas · Cotizaciones',
  },
  {
    id: 'faq-sales-rma-approval',
    categoryId: 'sales-rma',
    moduleTag: 'Ventas',
    visualCategory: 'Control y alertas',
    tags: ['Devoluciones RMA', 'Aprobaciones'],
    complexity: 'Avanzado',
    question: '¿Por qué una devolución de cliente (RMA) queda bloqueada o solicita aprobación?',
    answer:
      'Cuando el flujo configurado en Administración > Flujos de devoluciones exige autorización para ciertos estados o montos, el RMA bloquea edición y eliminación hasta que un perfil con el permiso requerido valide la transición.',
    relatedTarget: { page: 'Ventas', section: 'Devoluciones' },
    relatedLabel: 'Ir a Ventas · Devoluciones',
  },
  {
    id: 'faq-sales-catalog-stock',
    categoryId: 'sales-rma',
    moduleTag: 'Ventas',
    visualCategory: 'Operación diaria',
    tags: ['Catálogo SKU', 'Servicios'],
    complexity: 'Básico',
    question: '¿El catálogo de Ventas distingue entre productos inventariables y servicios?',
    answer:
      'Sí. En Ventas > Catálogo los artículos físicos muestran disponibilidad por almacén y descuentan existencias al despacharse, mientras que los servicios facturan sin requerir saldo en inventario ni generar entregas físicas.',
    relatedTarget: { page: 'Ventas', section: 'Catálogo' },
    relatedLabel: 'Explorar Ventas · Catálogo',
  },
  {
    id: 'faq-finance-ebp-scope',
    categoryId: 'finance-ebp',
    moduleTag: 'Finanzas',
    visualCategory: 'Bancario y EBP',
    tags: ['Alcance EBP', 'Política CxP'],
    complexity: 'Avanzado',
    question: '¿Por qué los gastos de la empresa no aparecen en Pagos Bancarios (EBP)?',
    answer:
      'Por política de control y seguridad financiera de AES Nexus, el motor de dispersión bancaria electrónica (EBP) está restringido exclusivamente a Facturas de Proveedor (CxP) individuales o consolidadas y corridas de Nómina autorizadas. Los gastos operativos generales se registran, presupuestan y concilian en el módulo independiente Gastos.',
    relatedTarget: { page: 'Finanzas', section: 'Pagos Bancarios' },
    relatedLabel: 'Ir a Finanzas · Pagos Bancarios',
  },
  {
    id: 'faq-finance-ebp-consolidation',
    categoryId: 'finance-ebp',
    moduleTag: 'Finanzas',
    visualCategory: 'Bancario y EBP',
    tags: ['EBP Consolidado', 'Layouts bancarios'],
    complexity: 'Intermedio',
    question: '¿Cuándo conviene usar el modo Consolidado en Pagos Bancarios (EBP)?',
    answer:
      'El modo Consolidado agrupa múltiples facturas abiertas del mismo proveedor siempre que compartan idéntica moneda y cuenta CLABE destino, generando una sola línea de transferencia bancaria y reduciendo comisiones. Requiere capturar un motivo de pago consolidado obligatorio antes de exportar el layout.',
    quickSteps: [
      'Abre el Asistente EBP y selecciona modo Consolidado.',
      'Ajusta montos parciales si no liquidarás el 100% de cada factura.',
      'Captura el motivo de pago consolidado, exporta el layout y presiona Aplicar en banco.',
    ],
    relatedTarget: { page: 'Finanzas', section: 'Pagos Bancarios' },
    relatedLabel: 'Abrir Asistente EBP',
  },
  {
    id: 'faq-finance-partial-collections',
    categoryId: 'finance-ebp',
    moduleTag: 'Finanzas',
    visualCategory: 'Operación diaria',
    tags: ['Cobranza CxC', 'Tesorería'],
    complexity: 'Básico',
    question: '¿Puedo registrar cobros parciales sobre una factura de venta en Finanzas?',
    answer:
      'Sí. Desde Finanzas > Cobros puedes aplicar un abono parcial indicando la cuenta bancaria receptora; el sistema recalcula automáticamente el saldo insoluto, actualiza la tesorería y cambia el estado de la factura a Parcial hasta cubrir el total.',
    relatedTarget: { page: 'Finanzas', section: 'Cobros' },
    relatedLabel: 'Ir a Finanzas · Cobros',
  },
  {
    id: 'faq-finance-chart-accounts',
    categoryId: 'finance-ebp',
    moduleTag: 'Finanzas',
    visualCategory: 'Contabilidad y P&L',
    tags: ['Catálogo 4xxx–8xxx', 'Conciliación'],
    complexity: 'Avanzado',
    question: '¿Cómo se estructuran las cuentas contables (4xxx–8xxx) para alimentar los reportes?',
    answer:
      'El catálogo en Finanzas > Cuentas contables reserva el rango 4xxx para ingresos, 5xxx para costos de venta, 6xxx para gastos operativos y administrativos, 7xxx para gastos financieros y 8xxx para otros ingresos, manteniendo conciliación directa con el Estado de Resultados.',
    relatedTarget: { page: 'Finanzas', section: 'Cuentas contables' },
    relatedLabel: 'Ver Cuentas contables',
  },
  {
    id: 'faq-expenses-moved',
    categoryId: 'expenses-budgets',
    moduleTag: 'Gastos',
    visualCategory: 'Operación diaria',
    tags: ['Navegación', 'Control de gastos'],
    complexity: 'Básico',
    question: '¿Dónde quedó la pestaña de Gastos de la empresa que estaba dentro de Finanzas?',
    answer:
      'Se promovió a un módulo principal propio llamado Gastos en la barra lateral izquierda para evitar duplicidad de rutas y ofrecer herramientas ampliadas: KPIs de ahorro y margen de maniobra, gráficas mensuales, presupuestos con alertas automáticas al 80% y 95%, y gastos recurrentes en lote.',
    relatedTarget: { page: 'Gastos', section: 'Resumen y control' },
    relatedLabel: 'Abrir módulo Gastos',
  },
  {
    id: 'faq-expenses-budget-alerts',
    categoryId: 'expenses-budgets',
    moduleTag: 'Gastos',
    visualCategory: 'Control y alertas',
    tags: ['Alertas 80%/95%', 'Presupuestos'],
    complexity: 'Avanzado',
    question: '¿Cómo se calculan las alertas automáticas del 80% y 95% en Presupuestos?',
    answer:
      'El sistema suma los gastos activos del mes en curso (excluyendo cancelados) agrupados por naturaleza analítica y los divide entre el límite mensual asignado. Al superar el 80% se activa una alerta preventiva; al llegar al 95% cambia a crítica y al rebasar el 100% se marca como excedido tanto en tarjetas/matriz como al capturar nuevas pólizas.',
    relatedTarget: { page: 'Gastos', section: 'Presupuestos y alertas' },
    relatedLabel: 'Configurar alertas en Presupuestos',
  },
  {
    id: 'faq-expenses-recurring-duplicates',
    categoryId: 'expenses-budgets',
    moduleTag: 'Gastos',
    visualCategory: 'Control y alertas',
    tags: ['Gastos recurrentes', 'Lote mensual'],
    complexity: 'Intermedio',
    question: '¿Qué pasa si presiono dos veces "Generar lote del mes" en Gastos recurrentes?',
    answer:
      'El motor valida la fecha de última generación y la referencia del periodo contra las pólizas existentes. Si una plantilla mensual ya fue generada en el mes activo, se omite automáticamente para evitar pólizas duplicadas.',
    relatedTarget: { page: 'Gastos', section: 'Gastos recurrentes' },
    relatedLabel: 'Ir a Gastos recurrentes',
  },
  {
    id: 'faq-ops-stock-thresholds',
    categoryId: 'purchases-ops',
    moduleTag: 'Compras y Operaciones',
    visualCategory: 'Control y alertas',
    tags: ['Umbrales de stock', 'Alertas inventario'],
    complexity: 'Intermedio',
    question: '¿Qué diferencia hay entre umbral heredado y umbral forzado por categoría?',
    answer:
      'En modo Heredado el mínimo de la categoría aplica sólo cuando el producto no tiene un umbral propio definido. En modo Forzado (override), la regla de la categoría prevalece sobre todos los SKU pertenecientes a ella para homogenizar alertas de reposición.',
    relatedTarget: { page: 'Configuración', section: 'Umbrales de stock' },
    relatedLabel: 'Configurar umbrales',
  },
  {
    id: 'faq-purchases-reception-stock',
    categoryId: 'purchases-ops',
    moduleTag: 'Compras y Operaciones',
    visualCategory: 'Operación diaria',
    tags: ['Recepciones', 'Almacenes'],
    complexity: 'Básico',
    question: '¿En qué momento una Orden de Compra incrementa el inventario disponible?',
    answer:
      'El stock físico no aumenta al emitir la Orden de Compra sino hasta confirmar la entrada de mercancía en Compras > Recepciones, momento en el que también queda trazado el movimiento de almacén y habilitada la factura de proveedor.',
    relatedTarget: { page: 'Compras', section: 'Recepciones' },
    relatedLabel: 'Ir a Compras · Recepciones',
  },
  {
    id: 'faq-reports-pnl-breakeven',
    categoryId: 'expenses-budgets',
    moduleTag: 'Reportes',
    visualCategory: 'Contabilidad y P&L',
    tags: ['Punto de equilibrio', 'Fijo vs Variable'],
    complexity: 'Avanzado',
    question: '¿Cómo distingue el Punto de Equilibrio entre costos fijos y variables?',
    answer:
      'Cada gasto registrado en el módulo Gastos lleva la etiqueta Fijo o Variable además de su naturaleza. El reporte de Estado de Resultados suma Costos de venta más Gastos variables para obtener el Margen de Contribución, y divide los Costos Fijos totales (gastos fijos + nómina fija) entre dicha razón para calcular las ventas de equilibrio.',
    relatedTarget: { page: 'Reportes', section: 'Estado de Resultados' },
    relatedLabel: 'Ver Estado de Resultados',
  },
  {
    id: 'faq-admin-rbac-testing',
    categoryId: 'admin-rbac',
    moduleTag: 'Administración y RBAC',
    visualCategory: 'Seguridad y RBAC',
    tags: ['Roles RBAC', 'Selector de perfil'],
    complexity: 'Básico',
    question: '¿Cómo puedo comprobar qué ve otro puesto sin cerrar el navegador?',
    answer:
      'Haz clic en el selector de perfil ubicado en la parte inferior de la barra lateral izquierda (o en el menú superior derecho) para cambiar entre roles como Ventas, Operaciones, Finanzas o empleados específicos en tiempo real.',
    relatedTarget: { page: 'Configuración', section: 'Roles y permisos' },
    relatedLabel: 'Administrar Roles y permisos',
  },
  {
    id: 'faq-admin-audit-retention',
    categoryId: 'admin-rbac',
    moduleTag: 'Administración y RBAC',
    visualCategory: 'Seguridad y RBAC',
    tags: ['Auditoría CRUD', 'Trazabilidad'],
    complexity: 'Avanzado',
    question: '¿Qué acciones quedan registradas en el Historial de Auditoría?',
    answer:
      'Se registran altas, ediciones y eliminaciones de clientes, proveedores, cuentas CLABE, presupuestos, gastos, lotes EBP, umbrales de stock, roles, usuarios, subsidiarias y tickets de soporte, indicando usuario activo, marca temporal e información detallada.',
    relatedTarget: { page: 'Administración', section: 'Historial de Auditoría' },
    relatedLabel: 'Consultar auditoría',
  },
]

export const HELP_GLOSSARY: HelpGlossaryItem[] = [
  {
    id: 'gl-clabe',
    term: 'CLABE Interbancaria (Mod-10)',
    domain: 'Bancario y EBP',
    formulaOrRule: '18 dígitos · Ponderación 3-7-1 módulo 10',
    definition: 'Cuenta bancaria estandarizada en México validada matemáticamente antes de permitir dispersión de pagos a proveedores.',
  },
  {
    id: 'gl-ebp',
    term: 'EBP (Electronic Bank Payments)',
    domain: 'Bancario y EBP',
    formulaOrRule: 'Solo CxP y Nómina · Formato BBVA / Banamex / Banorte',
    definition: 'Motor de generación de layouts bancarios para pagos individuales o consolidados desde las cuentas de tesorería de la empresa.',
  },
  {
    id: 'gl-uuid',
    term: 'UUID / Folio Fiscal CFDI',
    domain: 'Fiscal y CFDI',
    formulaOrRule: '36 caracteres alfanuméricos (8-4-4-4-12)',
    definition: 'Identificador único del Comprobante Fiscal Digital por Internet utilizado para comprobar pólizas de gastos y deducibilidad.',
  },
  {
    id: 'gl-rfc',
    term: 'RFC Emisor / Receptor',
    domain: 'Fiscal y CFDI',
    formulaOrRule: '12 caracteres (Persona Moral) · 13 (Física)',
    definition: 'Clave del Registro Federal de Contribuyentes asociada a clientes, proveedores, subsidiarias y comprobantes de gasto.',
  },
  {
    id: 'gl-gross-margin',
    term: 'Margen Bruto (%)',
    domain: 'Finanzas y P&L',
    formulaOrRule: '((Ingresos totales − Costos de venta) / Ingresos) × 100',
    definition: 'Rentabilidad directa generada después de descontar el costo de la mercancía vendida y costos directos de venta.',
  },
  {
    id: 'gl-ebit',
    term: 'Utilidad Operativa (EBIT)',
    domain: 'Finanzas y P&L',
    formulaOrRule: 'Utilidad Bruta − Gastos operativos, admin. y nómina',
    definition: 'Resultado operativo del negocio antes de intereses, gastos o productos financieros e impuestos.',
  },
  {
    id: 'gl-breakeven',
    term: 'Punto de Equilibrio ($)',
    domain: 'Finanzas y P&L',
    formulaOrRule: 'Costos Fijos Totales / Razón de Margen de Contribución',
    definition: 'Nivel mínimo de ingresos requerido durante el periodo para cubrir el 100% de los costos fijos y variables sin pérdidas.',
  },
  {
    id: 'gl-budget-headroom',
    term: 'Margen de maniobra presupuestal',
    domain: 'Finanzas y P&L',
    formulaOrRule: 'Presupuesto Total del Periodo − Gasto Devengado',
    definition: 'Saldo remanente disponible dentro de los límites mensuales antes de alcanzar sobrecosto presupuestal.',
  },
  {
    id: 'gl-alert-80-95',
    term: 'Umbrales Preventivo (80%) y Crítico (95%)',
    domain: 'Finanzas y P&L',
    formulaOrRule: 'Consumo >= 80% (Preventiva) · >= 95% (Crítica)',
    definition: 'Niveles de alerta visual automática en Presupuestos para anticipar desviaciones por naturaleza de gasto antes de rebasar el 100%.',
  },
  {
    id: 'gl-fixed-variable',
    term: 'Comportamiento Fijo vs. Variable',
    domain: 'Finanzas y P&L',
    formulaOrRule: 'Fijo (Renta, SaaS, Nómina) · Variable (Fletes, Comisiones)',
    definition: 'Clasificación contable obligatoria en cada póliza de gasto para proyectar correctamente el Punto de Equilibrio.',
  },
  {
    id: 'gl-rma',
    term: 'RMA (Devolución autorizada)',
    domain: 'Operaciones y RBAC',
    formulaOrRule: 'Solicitud → Aprobación según regla → Cierre',
    definition: 'Flujo formal para procesar devoluciones de clientes o hacia proveedores respetando umbrales de autorización.',
  },
  {
    id: 'gl-rbac',
    term: 'Matriz RBAC por submódulo',
    domain: 'Operaciones y RBAC',
    formulaOrRule: 'none · view · create · edit · full',
    definition: 'Esquema de control de acceso basado en roles que delimita qué pestañas y acciones puede ejecutar cada perfil en el ERP.',
  },
]

export const INITIAL_HELP_TICKETS: SupportTicketRecord[] = [
  {
    id: 'tkt-seed-1',
    code: 'SOP-2026-104',
    subject: 'Validación de cuenta CLABE secundaria para proveedor NorteLogística',
    moduleName: 'Finanzas · Pagos Bancarios (EBP)',
    priority: 'Media',
    status: 'En revisión',
    requesterName: 'Ana Sofí Morales',
    createdAt: '21 Nov 2026 · 10:15',
    updatedAt: '22 Nov 2026 · 14:40',
    description:
      'Al consolidar dos facturas en USD para el proveedor NorteLogística necesitamos confirmar si su segunda cuenta Banamex tiene habilitado el layout internacional.',
    notes: [
      {
        id: 'tkt-note-1',
        author: 'Mesa de Soporte ERP',
        date: '22 Nov 2026 · 14:40',
        message: 'Se verificó que la cuenta predeterminada estaba en MXN; se recomendó marcar la cuenta USD como activa para facturas en dólares.',
      },
    ],
  },
  {
    id: 'tkt-seed-2',
    code: 'SOP-2026-103',
    subject: 'Ajuste de umbral crítico al 95% en Gastos operativos',
    moduleName: 'Gastos · Presupuestos y alertas',
    priority: 'Alta',
    status: 'Abierto',
    requesterName: 'Carlos Méndez',
    createdAt: '23 Nov 2026 · 09:30',
    updatedAt: '23 Nov 2026 · 09:30',
    description:
      'Requerimos habilitar notificación inmediata para el departamento Comercial cuando Logística y fletes alcance el 95% del tope mensual.',
    notes: [],
  },
  {
    id: 'tkt-seed-3',
    code: 'SOP-2026-098',
    subject: 'Acceso de solo lectura a Estado de Resultados para Dirección Regional',
    moduleName: 'Configuración · Roles y permisos',
    priority: 'Baja',
    status: 'Resuelto',
    requesterName: 'Dirección General',
    createdAt: '18 Nov 2026 · 16:05',
    updatedAt: '19 Nov 2026 · 11:20',
    description:
      'Se solicitó crear perfil de consulta para ver el P&L y Punto de Equilibrio sin permisos de edición sobre pólizas.',
    notes: [
      {
        id: 'tkt-note-2',
        author: 'Administrador ERP',
        date: '19 Nov 2026 · 11:20',
        message: 'Rol configurado con nivel Ver en Reportes > Estado de Resultados y Resumen ejecutivo.',
      },
    ],
  },
]

export const HELP_TICKETS_STORAGE_KEY = 'aes_nexus_help_tickets_v1'
export const HELP_FEEDBACK_STORAGE_KEY = 'aes_nexus_help_feedback_v1'

export function loadStoredHelpTickets(): SupportTicketRecord[] {
  try {
    const raw = window.localStorage.getItem(HELP_TICKETS_STORAGE_KEY)
    if (!raw) return INITIAL_HELP_TICKETS
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_HELP_TICKETS
  } catch {
    return INITIAL_HELP_TICKETS
  }
}

export function saveStoredHelpTickets(tickets: SupportTicketRecord[]) {
  try {
    window.localStorage.setItem(HELP_TICKETS_STORAGE_KEY, JSON.stringify(tickets))
  } catch {
    // ignore storage quota errors in demo mode
  }
}

export function loadStoredHelpFeedback(): Record<string, 'up' | 'down'> {
  try {
    const raw = window.localStorage.getItem(HELP_FEEDBACK_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveStoredHelpFeedback(map: Record<string, 'up' | 'down'>) {
  try {
    window.localStorage.setItem(HELP_FEEDBACK_STORAGE_KEY, JSON.stringify(map))
  } catch {
    // ignore storage quota errors in demo mode
  }
}
