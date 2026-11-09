export type ItemType = 'product' | 'service'

export type ItemCategory =
  | 'Hardware'
  | 'Software y Licencias'
  | 'Consultoría'
  | 'Diseño y Desarrollo'
  | 'Mantenimiento'
  | 'Capacitación'

export type TaxRate = '16%' | '8%' | '0%' | 'Exento'

export type UnitOfMeasure =
  | 'Pza'
  | 'Hrs'
  | 'Servicio'
  | 'Mes'
  | 'Licencia'
  | 'Paquete'

export interface ProductServiceItem {
  id: string
  sku: string
  name: string
  type: ItemType
  category: ItemCategory
  description: string
  unitPrice: number
  currency: 'MXN' | 'USD'
  taxRate: TaxRate
  unitOfMeasure: UnitOfMeasure
  status: 'Activo' | 'Inactivo'
  // Product specific
  stock?: number
  minStock?: number
  cost?: number
  // Service specific
  billingModel?: 'Por hora' | 'Precio fijo' | 'Recurrente'
  leadTimeDays?: number
  lastUpdated: string
}

export const initialProductsAndServices: ProductServiceItem[] = [
  {
    id: 'prod_1',
    sku: 'AES-LIC-ENT',
    name: 'Licencia Nexus ERP Anual',
    type: 'service',
    category: 'Software y Licencias',
    description: 'Acceso completo para hasta 25 usuarios con módulos CRM, Ventas, Finanzas y Almacén.',
    unitPrice: 28500,
    currency: 'MXN',
    taxRate: '16%',
    unitOfMeasure: 'Licencia',
    status: 'Activo',
    billingModel: 'Recurrente',
    lastUpdated: '04 nov 2026',
  },
  {
    id: 'prod_2',
    sku: 'SRV-CONS-BIZ',
    name: 'Consultoría en Procesos y Transformación Digital',
    type: 'service',
    category: 'Consultoría',
    description: 'Diagnóstico operacional, rediseño de flujos comerciales e integración de sistemas.',
    unitPrice: 1800,
    currency: 'MXN',
    taxRate: '16%',
    unitOfMeasure: 'Hrs',
    status: 'Activo',
    billingModel: 'Por hora',
    lastUpdated: '05 nov 2026',
  },
  {
    id: 'prod_3',
    sku: 'HW-SRV-RACK',
    name: 'Servidor Rack 1U Xeon 64GB ECC',
    type: 'product',
    category: 'Hardware',
    description: 'Equipo de cómputo para despliegues locales, doble fuente redundante y 2TB NVMe.',
    unitPrice: 58900,
    currency: 'MXN',
    taxRate: '16%',
    unitOfMeasure: 'Pza',
    status: 'Activo',
    stock: 8,
    minStock: 3,
    cost: 43200,
    lastUpdated: '02 nov 2026',
  },
  {
    id: 'prod_4',
    sku: 'SRV-IMP-ERP',
    name: 'Implementación y Parametrización Base',
    type: 'service',
    category: 'Diseño y Desarrollo',
    description: 'Puesta en marcha del ERP, migración inicial de catálogo de clientes y capacitación al líder de proyecto.',
    unitPrice: 42000,
    currency: 'MXN',
    taxRate: '16%',
    unitOfMeasure: 'Paquete',
    status: 'Activo',
    billingModel: 'Precio fijo',
    leadTimeDays: 14,
    lastUpdated: '28 oct 2026',
  },
  {
    id: 'prod_5',
    sku: 'HW-TERM-POS',
    name: 'Terminal Punto de Venta Touch 15.6" IP65',
    type: 'product',
    category: 'Hardware',
    description: 'Terminal con pantalla táctil capacitiva, lector magnético integrado y montaje VESA.',
    unitPrice: 12400,
    currency: 'MXN',
    taxRate: '16%',
    unitOfMeasure: 'Pza',
    status: 'Activo',
    stock: 22,
    minStock: 5,
    cost: 8650,
    lastUpdated: '01 nov 2026',
  },
  {
    id: 'prod_6',
    sku: 'SRV-SUP-GOLD',
    name: 'Póliza de Soporte Técnico Gold 24/7',
    type: 'service',
    category: 'Mantenimiento',
    description: 'Monitoreo proactivo, atención prioritaria con SLA de 2 horas y respaldos automatizados.',
    unitPrice: 8500,
    currency: 'MXN',
    taxRate: '16%',
    unitOfMeasure: 'Mes',
    status: 'Activo',
    billingModel: 'Recurrente',
    lastUpdated: '03 nov 2026',
  },
  {
    id: 'prod_7',
    sku: 'HW-LECT-BAR',
    name: 'Lector Óptico de Código de Barras 2D Inalámbrico',
    type: 'product',
    category: 'Hardware',
    description: 'Escáner Bluetooth y 2.4Ghz de alto rendimiento para almacén e inventario.',
    unitPrice: 2950,
    currency: 'MXN',
    taxRate: '16%',
    unitOfMeasure: 'Pza',
    status: 'Activo',
    stock: 35,
    minStock: 10,
    cost: 1820,
    lastUpdated: '04 nov 2026',
  },
  {
    id: 'prod_8',
    sku: 'HW-RTR-GIGA',
    name: 'Router Industrial Gigabit con Failover 4G',
    type: 'product',
    category: 'Hardware',
    description: 'Enrutador empresarial para sucursales con soporte de VPN IPsec y balanceo de carga.',
    unitPrice: 7850,
    currency: 'MXN',
    taxRate: '16%',
    unitOfMeasure: 'Pza',
    status: 'Inactivo',
    stock: 4,
    minStock: 5,
    cost: 5100,
    lastUpdated: '25 oct 2026',
  },
  {
    id: 'prod_9',
    sku: 'SRV-CAP-USR',
    name: 'Taller de Capacitación a Equipos de Operación',
    type: 'service',
    category: 'Capacitación',
    description: 'Sesión presencial o remota de 4 horas con material didáctico y constancia de participación.',
    unitPrice: 6200,
    currency: 'MXN',
    taxRate: '16%',
    unitOfMeasure: 'Servicio',
    status: 'Activo',
    billingModel: 'Precio fijo',
    lastUpdated: '20 oct 2026',
  },
  {
    id: 'prod_10',
    sku: 'AES-LIC-STARTER',
    name: 'Licencia Nexus Cloud Starter Mensual',
    type: 'service',
    category: 'Software y Licencias',
    description: 'Plan para microempresas hasta 3 usuarios concurrentes con facturación en la nube.',
    unitPrice: 1450,
    currency: 'MXN',
    taxRate: '16%',
    unitOfMeasure: 'Mes',
    status: 'Activo',
    billingModel: 'Recurrente',
    lastUpdated: '06 nov 2026',
  },
]
