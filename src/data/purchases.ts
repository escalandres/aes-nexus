export type PurchasesSectionTab =
  | 'Resumen'
  | 'Requisiciones'
  | 'Órdenes de compra'
  | 'Recepciones'
  | 'Facturas'
  | 'Devoluciones'

export type RequisitionStatus =
  | 'Pendiente'
  | 'Aprobada'
  | 'Convertida a OC'
  | 'Rechazada'

export type RequisitionPriority = 'Normal' | 'Alta' | 'Urgente'

export interface RequisitionLineItem {
  id: string
  sku: string
  name: string
  quantity: number
  estimatedUnitCost: number
  subtotal: number
  currentStock?: number
  minStock?: number
}

export interface PurchaseRequisition {
  id: string
  folio: string
  date: string
  neededByDate: string
  requestedBy: string
  department: string
  warehouseId: string
  warehouseName: string
  priority: RequisitionPriority
  status: RequisitionStatus
  notes?: string
  items: RequisitionLineItem[]
  estimatedTotal: number
  linkedPoFolio?: string
  approvedBy?: string
  approvedAt?: string
}

export type ProcurementChartMonth = 'Jun' | 'Jul' | 'Ago' | 'Sep' | 'Oct' | 'Nov'

export const PROCUREMENT_CHART_MONTHS: ProcurementChartMonth[] = [
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
]

export interface DepartmentProcurementPlan {
  department: string
  monthlyBudget: number
  historicalMonthlySpend: Record<ProcurementChartMonth, number>
}

export const DEPARTMENT_PROCUREMENT_PLANS: DepartmentProcurementPlan[] = [
  {
    department: 'Operaciones y Logística',
    monthlyBudget: 165000,
    historicalMonthlySpend: {
      Jun: 118400,
      Jul: 142800,
      Ago: 0, // populated from live PO OC-2026-Q3-01 ($98,600)
      Sep: 0, // populated from live PO OC-2026-Q3-02 ($145,000)
      Oct: 128500,
      Nov: 0, // populated from live POs OC-2026-002 + OC-2026-003 ($161,588)
    },
  },
  {
    department: 'Tecnología y Sistemas',
    monthlyBudget: 180000,
    historicalMonthlySpend: {
      Jun: 134000,
      Jul: 158200,
      Ago: 112500,
      Sep: 164800,
      Oct: 0, // populated from live PO OC-2026-001 ($200,448)
      Nov: 96000,
    },
  },
  {
    department: 'Finanzas y Tesorería',
    monthlyBudget: 45000,
    historicalMonthlySpend: {
      Jun: 28500,
      Jul: 34200,
      Ago: 39800,
      Sep: 31400,
      Oct: 41200,
      Nov: 36900,
    },
  },
  {
    department: 'Ventas y Comercial',
    monthlyBudget: 65000,
    historicalMonthlySpend: {
      Jun: 48200,
      Jul: 53900,
      Ago: 61400,
      Sep: 58000,
      Oct: 71500,
      Nov: 54800,
    },
  },
  {
    department: 'Dirección General',
    monthlyBudget: 50000,
    historicalMonthlySpend: {
      Jun: 32000,
      Jul: 44500,
      Ago: 29800,
      Sep: 46200,
      Oct: 38400,
      Nov: 41000,
    },
  },
]

export const initialRequisitions: PurchaseRequisition[] = [
  {
    id: 'req_1',
    folio: 'REQ-2026-001',
    date: '03 nov 2026',
    neededByDate: '12 nov 2026',
    requestedBy: 'Roberto Santos',
    department: 'Operaciones y Logística',
    warehouseId: 'wh_central',
    warehouseName: 'Almacén Central Vallejo',
    priority: 'Alta',
    status: 'Convertida a OC',
    notes: 'Reposición programada para surtido de terminales punto de venta y lectores 2D.',
    items: [
      {
        id: 'reqi_1',
        sku: 'HW-TERM-POS',
        name: 'Terminal Punto de Venta Touch 15.6" IP65',
        quantity: 10,
        estimatedUnitCost: 8650,
        subtotal: 86500,
      },
      {
        id: 'reqi_2',
        sku: 'HW-LECT-BAR',
        name: 'Lector Óptico de Código de Barras 2D Inalámbrico',
        quantity: 15,
        estimatedUnitCost: 1820,
        subtotal: 27300,
      },
    ],
    estimatedTotal: 113800,
    linkedPoFolio: 'OC-2026-002',
    approvedBy: 'Andrea Morales',
    approvedAt: '04 nov 2026',
  },
  {
    id: 'req_2',
    folio: 'REQ-2026-002',
    date: '07 nov 2026',
    neededByDate: '16 nov 2026',
    requestedBy: 'Diego Fernández',
    department: 'Operaciones y Logística',
    warehouseId: 'wh_norte',
    warehouseName: 'Almacén Norte Monterrey',
    priority: 'Urgente',
    status: 'Aprobada',
    notes: 'Stock crítico detectado bajo umbral mínimo en sucursal Norte tras auditoría semanal.',
    items: [
      {
        id: 'reqi_3',
        sku: 'HW-RTR-GIGA',
        name: 'Router Industrial Gigabit con Failover 4G',
        quantity: 6,
        estimatedUnitCost: 5100,
        subtotal: 30600,
        currentStock: 2,
        minStock: 4,
      },
    ],
    estimatedTotal: 30600,
    approvedBy: 'Andrea Morales',
    approvedAt: '07 nov 2026',
  },
  {
    id: 'req_3',
    folio: 'REQ-2026-003',
    date: '08 nov 2026',
    neededByDate: '20 nov 2026',
    requestedBy: 'Laura R.',
    department: 'Tecnología y Sistemas',
    warehouseId: 'wh_central',
    warehouseName: 'Almacén Central Vallejo',
    priority: 'Normal',
    status: 'Pendiente',
    notes: 'Ampliación de reserva de switches PoE y servidores para proyectos Q4.',
    items: [
      {
        id: 'reqi_4',
        sku: 'HW-SWT-POE',
        name: 'Switch Administrable 24 Puertos Gigabit PoE+',
        quantity: 4,
        estimatedUnitCost: 6900,
        subtotal: 27600,
      },
      {
        id: 'reqi_5',
        sku: 'HW-SRV-RACK',
        name: 'Servidor Rack 1U Xeon 64GB ECC',
        quantity: 2,
        estimatedUnitCost: 43200,
        subtotal: 86400,
      },
    ],
    estimatedTotal: 114000,
  },
  {
    id: 'req_hist_q4',
    folio: 'REQ-2026-Q4-00',
    date: '25 oct 2026',
    neededByDate: '04 nov 2026',
    requestedBy: 'Andrea Morales',
    department: 'Tecnología y Sistemas',
    warehouseId: 'wh_central',
    warehouseName: 'Almacén Central Vallejo',
    priority: 'Alta',
    status: 'Convertida a OC',
    notes: 'Requisición de servidores rack Q4 ya recepcionada en almacén.',
    items: [
      {
        id: 'reqi_hist_1',
        sku: 'HW-SRV-RACK',
        name: 'Servidor Rack 1U Xeon 64GB ECC',
        quantity: 4,
        estimatedUnitCost: 43200,
        subtotal: 172800,
      },
    ],
    estimatedTotal: 172800,
    linkedPoFolio: 'OC-2026-001',
    approvedBy: 'Andrea Morales',
    approvedAt: '26 oct 2026',
  },
  {
    id: 'req_hist_q3',
    folio: 'REQ-2026-Q3-01',
    date: '12 ago 2026',
    neededByDate: '22 ago 2026',
    requestedBy: 'Roberto Santos',
    department: 'Operaciones y Logística',
    warehouseId: 'wh_central',
    warehouseName: 'Almacén Central Vallejo',
    priority: 'Normal',
    status: 'Convertida a OC',
    notes: 'Abastecimiento Q3 de equipo de red y lectores ópticos.',
    items: [
      {
        id: 'reqi_hist_2',
        sku: 'HW-RTR-GIGA',
        name: 'Router Industrial Gigabit con Failover 4G',
        quantity: 10,
        estimatedUnitCost: 5100,
        subtotal: 51000,
      },
      {
        id: 'reqi_hist_3',
        sku: 'HW-SWT-POE',
        name: 'Switch Administrable 24 Puertos Gigabit PoE+',
        quantity: 5,
        estimatedUnitCost: 6800,
        subtotal: 34000,
      },
    ],
    estimatedTotal: 85000,
    linkedPoFolio: 'OC-2026-Q3-01',
    approvedBy: 'Andrea Morales',
    approvedAt: '13 ago 2026',
  },
]
