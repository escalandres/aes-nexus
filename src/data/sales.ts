export interface SalesLineItem {
  id: string
  itemId?: string
  sku: string
  name: string
  type: 'product' | 'service'
  quantity: number
  unitPrice: number
  taxRate: '16%' | '8%' | '0%' | 'Exento'
  unitOfMeasure: string
  subtotal: number
  taxAmount: number
  total: number
}

export type QuoteStatus = 'Borrador' | 'Enviada' | 'Aprobada' | 'Rechazada' | 'Vencida'

export interface Quote {
  id: string
  folio: string
  clientId: string
  clientName: string
  clientCompany: string
  clientEmail: string
  date: string
  expiryDate: string
  items: SalesLineItem[]
  subtotal: number
  taxTotal: number
  total: number
  currency: 'MXN' | 'USD'
  status: QuoteStatus
  notes?: string
  terms?: string
  convertedToOrderId?: string
}

export type OrderStatus = 'Confirmado' | 'En preparación' | 'Enviado' | 'Entregado' | 'Cancelado'

export interface SalesOrder {
  id: string
  folio: string
  quoteId?: string
  quoteFolio?: string
  clientId: string
  clientName: string
  clientCompany: string
  date: string
  deliveryDate: string
  items: SalesLineItem[]
  subtotal: number
  taxTotal: number
  total: number
  currency: 'MXN' | 'USD'
  status: OrderStatus
  shippingAddress?: string
  notes?: string
  invoiceIds?: string[]
  invoiceFolios?: string[]
}

export const initialQuotes: Quote[] = [
  {
    id: 'quote_1',
    folio: 'COT-2026-001',
    clientId: 'cli_nomada',
    clientName: 'Sofía Ramírez',
    clientCompany: 'Estudio Nómada',
    clientEmail: 'sofia@estudionomada.mx',
    date: '02 nov 2026',
    expiryDate: '17 nov 2026',
    currency: 'MXN',
    status: 'Aprobada',
    notes: 'Cotización aprobada por gerencia de operaciones para rollout en 2 sucursales.',
    terms: '50% de anticipo al confirmar pedido y 50% al completar la entrega.',
    convertedToOrderId: 'order_1',
    items: [
      {
        id: 'li_1',
        sku: 'HW-TERM-POS',
        name: 'Terminal Punto de Venta Touch 15.6" IP65',
        type: 'product',
        quantity: 3,
        unitPrice: 12400,
        taxRate: '16%',
        unitOfMeasure: 'Pza',
        subtotal: 37200,
        taxAmount: 5952,
        total: 43152,
      },
      {
        id: 'li_2',
        sku: 'SRV-IMP-ERP',
        name: 'Implementación y Parametrización Base',
        type: 'service',
        quantity: 1,
        unitPrice: 42000,
        taxRate: '16%',
        unitOfMeasure: 'Paquete',
        subtotal: 42000,
        taxAmount: 6720,
        total: 48720,
      },
    ],
    subtotal: 79200,
    taxTotal: 12672,
    total: 91872,
  },
  {
    id: 'quote_2',
    folio: 'COT-2026-002',
    clientId: 'cli_taller',
    clientName: 'Diego Fernández',
    clientCompany: 'Taller Norte',
    clientEmail: 'diego@tallernorte.mx',
    date: '05 nov 2026',
    expiryDate: '20 nov 2026',
    currency: 'MXN',
    status: 'Enviada',
    notes: 'Pendiente de aprobación presupuestal tras demostración en vivo.',
    terms: 'Pago a 30 días con orden de compra autorizada.',
    items: [
      {
        id: 'li_3',
        sku: 'HW-SRV-RACK',
        name: 'Servidor Rack 1U Xeon 64GB ECC',
        type: 'product',
        quantity: 1,
        unitPrice: 58900,
        taxRate: '16%',
        unitOfMeasure: 'Pza',
        subtotal: 58900,
        taxAmount: 9424,
        total: 68324,
      },
      {
        id: 'li_4',
        sku: 'SRV-SUP-GOLD',
        name: 'Póliza de Soporte Técnico Gold 24/7',
        type: 'service',
        quantity: 3,
        unitPrice: 8500,
        taxRate: '16%',
        unitOfMeasure: 'Mes',
        subtotal: 25500,
        taxAmount: 4080,
        total: 29580,
      },
    ],
    subtotal: 84400,
    taxTotal: 13504,
    total: 97904,
  },
  {
    id: 'quote_3',
    folio: 'COT-2026-003',
    clientId: 'cli_oliva',
    clientName: 'Valentina Ruiz',
    clientCompany: 'Casa Oliva',
    clientEmail: 'valentina@casaoliva.com',
    date: '06 nov 2026',
    expiryDate: '21 nov 2026',
    currency: 'MXN',
    status: 'Borrador',
    notes: 'Borrador preliminar preparado para revisión técnica con su departamento de TI.',
    terms: 'Pago de contado con 5% de descuento por pronto pago.',
    items: [
      {
        id: 'li_5',
        sku: 'AES-LIC-ENT',
        name: 'Licencia Nexus ERP Anual',
        type: 'service',
        quantity: 1,
        unitPrice: 28500,
        taxRate: '16%',
        unitOfMeasure: 'Licencia',
        subtotal: 28500,
        taxAmount: 4560,
        total: 33060,
      },
      {
        id: 'li_6',
        sku: 'SRV-CAP-USR',
        name: 'Taller de Capacitación a Equipos de Operación',
        type: 'service',
        quantity: 2,
        unitPrice: 6200,
        taxRate: '16%',
        unitOfMeasure: 'Servicio',
        subtotal: 12400,
        taxAmount: 1984,
        total: 14384,
      },
    ],
    subtotal: 40900,
    taxTotal: 6544,
    total: 47444,
  },
  {
    id: 'quote_4',
    folio: 'COT-2026-004',
    clientId: 'cli_lumen',
    clientName: 'Mateo Cruz',
    clientCompany: 'Lumen Studio',
    clientEmail: 'mateo@lumenstudio.mx',
    date: '28 oct 2026',
    expiryDate: '05 nov 2026',
    currency: 'MXN',
    status: 'Vencida',
    notes: 'Venció el periodo de vigencia de 8 días. El cliente solicitó re-cotización con más terminales.',
    terms: 'Anticipo del 50%.',
    items: [
      {
        id: 'li_7',
        sku: 'HW-LECT-BAR',
        name: 'Lector Óptico de Código de Barras 2D Inalámbrico',
        type: 'product',
        quantity: 4,
        unitPrice: 2950,
        taxRate: '16%',
        unitOfMeasure: 'Pza',
        subtotal: 11800,
        taxAmount: 1888,
        total: 13688,
      },
    ],
    subtotal: 11800,
    taxTotal: 1888,
    total: 13688,
  },
]

export const initialOrders: SalesOrder[] = [
  {
    id: 'order_1',
    folio: 'PED-2026-001',
    quoteId: 'quote_1',
    quoteFolio: 'COT-2026-001',
    clientId: 'cli_nomada',
    clientName: 'Sofía Ramírez',
    clientCompany: 'Estudio Nómada',
    date: '03 nov 2026',
    deliveryDate: '12 nov 2026',
    currency: 'MXN',
    status: 'En preparación',
    shippingAddress: 'Av. Paseo de la Reforma 222, Piso 14, Cuauhtémoc, CDMX',
    notes: 'Configurar terminales con la imagen predeterminada antes del despacho.',
    invoiceIds: ['cxc_1'],
    invoiceFolios: ['FAC-2026-001'],
    items: [
      {
        id: 'li_1',
        sku: 'HW-TERM-POS',
        name: 'Terminal Punto de Venta Touch 15.6" IP65',
        type: 'product',
        quantity: 3,
        unitPrice: 12400,
        taxRate: '16%',
        unitOfMeasure: 'Pza',
        subtotal: 37200,
        taxAmount: 5952,
        total: 43152,
      },
      {
        id: 'li_2',
        sku: 'SRV-IMP-ERP',
        name: 'Implementación y Parametrización Base',
        type: 'service',
        quantity: 1,
        unitPrice: 42000,
        taxRate: '16%',
        unitOfMeasure: 'Paquete',
        subtotal: 42000,
        taxAmount: 6720,
        total: 48720,
      },
    ],
    subtotal: 79200,
    taxTotal: 12672,
    total: 91872,
  },
  {
    id: 'order_2',
    folio: 'PED-2026-002',
    clientId: 'cli_oliva',
    clientName: 'Valentina Ruiz',
    clientCompany: 'Casa Oliva',
    date: '29 oct 2026',
    deliveryDate: '04 nov 2026',
    currency: 'MXN',
    status: 'Entregado',
    shippingAddress: 'Colima 180, Roma Norte, Cuauhtémoc, CDMX',
    notes: 'Entrega en recepción con acuse firmado por almacenista.',
    invoiceIds: ['cxc_2'],
    invoiceFolios: ['FAC-2026-002'],
    items: [
      {
        id: 'li_8',
        sku: 'HW-RTR-GIGA',
        name: 'Router Industrial Gigabit con Failover 4G',
        type: 'product',
        quantity: 2,
        unitPrice: 7850,
        taxRate: '16%',
        unitOfMeasure: 'Pza',
        subtotal: 15700,
        taxAmount: 2512,
        total: 18212,
      },
      {
        id: 'li_9',
        sku: 'HW-LECT-BAR',
        name: 'Lector Óptico de Código de Barras 2D Inalámbrico',
        type: 'product',
        quantity: 3,
        unitPrice: 2950,
        taxRate: '16%',
        unitOfMeasure: 'Pza',
        subtotal: 8850,
        taxAmount: 1416,
        total: 10266,
      },
    ],
    subtotal: 24550,
    taxTotal: 3928,
    total: 28478,
  },
  {
    id: 'order_3',
    folio: 'PED-2026-003',
    clientId: 'cli_lumen',
    clientName: 'Mateo Cruz',
    clientCompany: 'Lumen Studio',
    date: '06 nov 2026',
    deliveryDate: '15 nov 2026',
    currency: 'MXN',
    status: 'Confirmado',
    shippingAddress: 'Orizaba 42, Roma Norte, Cuauhtémoc, CDMX',
    notes: 'Confirmado con anticipo recibido en banco.',
    invoiceIds: ['cxc_3'],
    invoiceFolios: ['FAC-2026-003'],
    items: [
      {
        id: 'li_10',
        sku: 'AES-LIC-STARTER',
        name: 'Licencia Nexus Cloud Starter Mensual',
        type: 'service',
        quantity: 12,
        unitPrice: 1450,
        taxRate: '16%',
        unitOfMeasure: 'Mes',
        subtotal: 17400,
        taxAmount: 2784,
        total: 20184,
      },
    ],
    subtotal: 17400,
    taxTotal: 2784,
    total: 20184,
  },
  {
    id: 'order_4',
    folio: 'PED-2026-004',
    clientId: 'cli_taller',
    clientName: 'Diego Fernández',
    clientCompany: 'Taller Norte',
    date: '10 nov 2026',
    deliveryDate: '18 nov 2026',
    currency: 'MXN',
    status: 'Confirmado',
    shippingAddress: 'Av. Constitución 1400, Monterrey, Nuevo León',
    notes: 'Pedido confirmado pendiente de emitir factura al 100% o anticipo.',
    items: [
      {
        id: 'li_11',
        sku: 'HW-TERM-POS',
        name: 'Terminal Punto de Venta Touch 15.6" IP65',
        type: 'product',
        quantity: 2,
        unitPrice: 12400,
        taxRate: '16%',
        unitOfMeasure: 'Pza',
        subtotal: 24800,
        taxAmount: 3968,
        total: 28768,
      },
      {
        id: 'li_12',
        sku: 'SRV-SUP-GOLD',
        name: 'Póliza de Soporte Técnico Gold 24/7',
        type: 'service',
        quantity: 1,
        unitPrice: 8500,
        taxRate: '16%',
        unitOfMeasure: 'Mes',
        subtotal: 8500,
        taxAmount: 1360,
        total: 9860,
      },
    ],
    subtotal: 33300,
    taxTotal: 5328,
    total: 38628,
  },
]
