export interface Warehouse {
  id: string
  code: string
  name: string
  city: string
  state: string
  address: string
  capacityPercentage: number
  isDefault: boolean
  active: boolean
  locationId?: string
  locationType?: string
}

export type TransferStatus = 'En tránsito' | 'Completado' | 'Cancelado'

export interface InventoryTransferItem {
  id: string
  inventoryItemId: string
  productId: string
  sku: string
  name: string
  unitOfMeasure: string
  quantity: number
  unitCost: number
  sourceBin: string
  targetBin: string
}

export interface InventoryTransfer {
  id: string
  folio: string
  date: string
  expectedArrival?: string
  completedDate?: string
  sourceWarehouseId: string
  sourceWarehouseName: string
  targetWarehouseId: string
  targetWarehouseName: string
  items: InventoryTransferItem[]
  totalUnits: number
  totalValue: number
  status: TransferStatus
  carrierOrMethod: string
  responsibleUser: string
  notes?: string
}

export interface InventoryItemLocation {
  id: string
  productId: string
  sku: string
  name: string
  warehouseId: string
  warehouseName: string
  stock: number
  reserved: number
  inTransit: number
  minStock: number
  cost: number
  unitOfMeasure: string
  locationBin: string
}

export type MovementType = 'Entrada' | 'Salida' | 'Transferencia' | 'Ajuste'

export interface StockMovement {
  id: string
  folio: string
  date: string
  type: MovementType
  sku: string
  productName: string
  quantity: number
  sourceWarehouse?: string
  targetWarehouse?: string
  referenceDoc?: string
  reason: string
  user: string
}

export type PurchaseOrderStatus =
  | 'Borrador'
  | 'Emitida'
  | 'Recepción parcial'
  | 'Recibida'
  | 'Cancelada'

export interface PurchaseOrderItem {
  id: string
  sku: string
  name: string
  quantity: number
  receivedQty: number
  unitCost: number
  taxRate: '16%' | '8%' | '0%'
  subtotal: number
  taxAmount: number
  total: number
}

export interface PurchaseOrder {
  id: string
  folio: string
  supplierCompany: string
  supplierContact: string
  supplierEmail: string
  date: string
  expectedDeliveryDate: string
  warehouseId: string
  warehouseName: string
  items: PurchaseOrderItem[]
  subtotal: number
  taxTotal: number
  total: number
  currency: 'MXN' | 'USD'
  status: PurchaseOrderStatus
  notes?: string
}

export type DeliveryStatus = 'Preparando' | 'En ruta' | 'Entregado' | 'Devuelto'

export interface ShipmentDelivery {
  id: string
  folio: string
  orderFolio: string
  clientCompany: string
  clientName: string
  carrier: string
  trackingNumber: string
  shippingDate: string
  estimatedDelivery: string
  actualDeliveryDate?: string
  address: string
  status: DeliveryStatus
  packages: number
  notes?: string
}

export const initialWarehouses: Warehouse[] = [
  {
    id: 'wh_central',
    code: 'ALM-CDMX',
    name: 'Almacén Central Vallejo',
    city: 'Ciudad de México',
    state: 'CDMX',
    address: 'Calz. Vallejo 1020, Bodega 4, Azcapotzalco',
    capacityPercentage: 74,
    isDefault: true,
    active: true,
    locationId: 'loc_2',
    locationType: 'Almacén / Bodega',
  },
  {
    id: 'wh_norte',
    code: 'ALM-MTY',
    name: 'Almacén Norte Monterrey',
    city: 'Monterrey',
    state: 'Nuevo León',
    address: 'Av. Gonzalitos 840, Col. Mitras, Monterrey',
    capacityPercentage: 48,
    isDefault: false,
    active: true,
    locationId: 'loc_3',
    locationType: 'Sucursal',
  },
  {
    id: 'wh_gdl',
    code: 'SUC-GDL',
    name: 'Punto de Operación Guadalajara',
    city: 'Guadalajara',
    state: 'Jalisco',
    address: 'Av. Chapultepec 480, Guadalajara',
    capacityPercentage: 32,
    isDefault: false,
    active: true,
    locationId: 'loc_4',
    locationType: 'Punto de venta',
  },
]

export const initialInventory: InventoryItemLocation[] = [
  {
    id: 'inv_1',
    productId: 'prod_3',
    sku: 'HW-SRV-RACK',
    name: 'Servidor Rack 1U Xeon 64GB ECC',
    warehouseId: 'wh_central',
    warehouseName: 'Almacén Central Vallejo',
    stock: 6,
    reserved: 1,
    inTransit: 2,
    minStock: 3,
    cost: 43200,
    unitOfMeasure: 'Pza',
    locationBin: 'Rack A-01',
  },
  {
    id: 'inv_2',
    productId: 'prod_3',
    sku: 'HW-SRV-RACK',
    name: 'Servidor Rack 1U Xeon 64GB ECC',
    warehouseId: 'wh_norte',
    warehouseName: 'Almacén Norte Monterrey',
    stock: 2,
    reserved: 0,
    inTransit: 0,
    minStock: 2,
    cost: 43200,
    unitOfMeasure: 'Pza',
    locationBin: 'Rack N-04',
  },
  {
    id: 'inv_3',
    productId: 'prod_5',
    sku: 'HW-TERM-POS',
    name: 'Terminal Punto de Venta Touch 15.6" IP65',
    warehouseId: 'wh_central',
    warehouseName: 'Almacén Central Vallejo',
    stock: 16,
    reserved: 3,
    inTransit: 10,
    minStock: 5,
    cost: 8650,
    unitOfMeasure: 'Pza',
    locationBin: 'Pasillo B-12',
  },
  {
    id: 'inv_4',
    productId: 'prod_5',
    sku: 'HW-TERM-POS',
    name: 'Terminal Punto de Venta Touch 15.6" IP65',
    warehouseId: 'wh_norte',
    warehouseName: 'Almacén Norte Monterrey',
    stock: 6,
    reserved: 0,
    inTransit: 0,
    minStock: 3,
    cost: 8650,
    unitOfMeasure: 'Pza',
    locationBin: 'Pasillo N-02',
  },
  {
    id: 'inv_5',
    productId: 'prod_7',
    sku: 'HW-LECT-BAR',
    name: 'Lector Óptico de Código de Barras 2D Inalámbrico',
    warehouseId: 'wh_central',
    warehouseName: 'Almacén Central Vallejo',
    stock: 28,
    reserved: 3,
    inTransit: 15,
    minStock: 10,
    cost: 1820,
    unitOfMeasure: 'Pza',
    locationBin: 'Gaveta C-05',
  },
  {
    id: 'inv_6',
    productId: 'prod_7',
    sku: 'HW-LECT-BAR',
    name: 'Lector Óptico de Código de Barras 2D Inalámbrico',
    warehouseId: 'wh_norte',
    warehouseName: 'Almacén Norte Monterrey',
    stock: 7,
    reserved: 0,
    inTransit: 0,
    minStock: 4,
    cost: 1820,
    unitOfMeasure: 'Pza',
    locationBin: 'Gaveta N-08',
  },
  {
    id: 'inv_7',
    productId: 'prod_8',
    sku: 'HW-RTR-GIGA',
    name: 'Router Industrial Gigabit con Failover 4G',
    warehouseId: 'wh_central',
    warehouseName: 'Almacén Central Vallejo',
    stock: 4,
    reserved: 2,
    inTransit: 5,
    minStock: 5,
    cost: 5100,
    unitOfMeasure: 'Pza',
    locationBin: 'Rack D-02',
  },
  {
    id: 'inv_8',
    productId: 'prod_5',
    sku: 'HW-TERM-POS',
    name: 'Terminal Punto de Venta Touch 15.6" IP65',
    warehouseId: 'wh_gdl',
    warehouseName: 'Punto de Operación Guadalajara',
    stock: 4,
    reserved: 0,
    inTransit: 2,
    minStock: 2,
    cost: 8650,
    unitOfMeasure: 'Pza',
    locationBin: 'Mostrador G-01',
  },
]

export const initialTransfers: InventoryTransfer[] = [
  {
    id: 'trf_2',
    folio: 'TRF-2026-002',
    date: '12 nov 2026',
    expectedArrival: '14 nov 2026',
    sourceWarehouseId: 'wh_central',
    sourceWarehouseName: 'Almacén Central Vallejo',
    targetWarehouseId: 'wh_gdl',
    targetWarehouseName: 'Punto de Operación Guadalajara',
    items: [
      {
        id: 'trfi_2',
        inventoryItemId: 'inv_3',
        productId: 'prod_5',
        sku: 'HW-TERM-POS',
        name: 'Terminal Punto de Venta Touch 15.6" IP65',
        unitOfMeasure: 'Pza',
        quantity: 2,
        unitCost: 8650,
        sourceBin: 'Pasillo B-12',
        targetBin: 'Mostrador G-01',
      },
    ],
    totalUnits: 2,
    totalValue: 17300,
    status: 'En tránsito',
    carrierOrMethod: 'Logística del Valle',
    responsibleUser: 'Andrea Morales',
    notes: 'Reposición programada para demostraciones y entregas en punto de venta Guadalajara.',
  },
  {
    id: 'trf_1',
    folio: 'TRF-2026-001',
    date: '04 nov 2026',
    expectedArrival: '05 nov 2026',
    completedDate: '05 nov 2026',
    sourceWarehouseId: 'wh_central',
    sourceWarehouseName: 'Almacén Central Vallejo',
    targetWarehouseId: 'wh_norte',
    targetWarehouseName: 'Almacén Norte Monterrey',
    items: [
      {
        id: 'trfi_1',
        inventoryItemId: 'inv_5',
        productId: 'prod_7',
        sku: 'HW-LECT-BAR',
        name: 'Lector Óptico de Código de Barras 2D Inalámbrico',
        unitOfMeasure: 'Pza',
        quantity: 5,
        unitCost: 1820,
        sourceBin: 'Gaveta C-05',
        targetBin: 'Gaveta N-08',
      },
    ],
    totalUnits: 5,
    totalValue: 9100,
    status: 'Completado',
    carrierOrMethod: 'Mensajería interna',
    responsibleUser: 'Andrea Morales',
    notes: 'Rebalanceo de stock para sucursal norte.',
  },
]

export const initialMovements: StockMovement[] = [
  {
    id: 'mov_1',
    folio: 'MOV-2026-001',
    date: '06 nov 2026',
    type: 'Salida',
    sku: 'HW-TERM-POS',
    productName: 'Terminal Punto de Venta Touch 15.6" IP65',
    quantity: 3,
    sourceWarehouse: 'Almacén Central Vallejo',
    referenceDoc: 'PED-2026-001',
    reason: 'Despacho para pedido de cliente Estudio Nómada',
    user: 'Andrea Morales',
  },
  {
    id: 'mov_2',
    folio: 'MOV-2026-002',
    date: '04 nov 2026',
    type: 'Transferencia',
    sku: 'HW-LECT-BAR',
    productName: 'Lector Óptico de Código de Barras 2D Inalámbrico',
    quantity: 5,
    sourceWarehouse: 'Almacén Central Vallejo',
    targetWarehouse: 'Almacén Norte Monterrey',
    referenceDoc: 'TRF-2026-001',
    reason: 'Rebalanceo de stock para sucursal norte',
    user: 'Andrea Morales',
  },
  {
    id: 'mov_3',
    folio: 'MOV-2026-003',
    date: '02 nov 2026',
    type: 'Entrada',
    sku: 'HW-SRV-RACK',
    productName: 'Servidor Rack 1U Xeon 64GB ECC',
    quantity: 4,
    targetWarehouse: 'Almacén Central Vallejo',
    referenceDoc: 'OC-2026-001',
    reason: 'Recepción de compra a Distribuidora Atlas',
    user: 'Andrea Morales',
  },
  {
    id: 'mov_4',
    folio: 'MOV-2026-004',
    date: '30 oct 2026',
    type: 'Ajuste',
    sku: 'HW-RTR-GIGA',
    productName: 'Router Industrial Gigabit con Failover 4G',
    quantity: -1,
    sourceWarehouse: 'Almacén Central Vallejo',
    referenceDoc: 'AUD-INV-OCT',
    reason: 'Merma por daño cosmético en empaque durante auditoría',
    user: 'Andrea Morales',
  },
]

export const initialPurchaseOrders: PurchaseOrder[] = [
  {
    id: 'po_1',
    folio: 'OC-2026-001',
    supplierCompany: 'Atlas Comercial',
    supplierContact: 'contacto@atlascomercial.mx',
    supplierEmail: 'contacto@atlascomercial.mx',
    date: '28 oct 2026',
    expectedDeliveryDate: '04 nov 2026',
    warehouseId: 'wh_central',
    warehouseName: 'Almacén Central Vallejo',
    status: 'Recibida',
    notes: 'Recepción completa validada en andén de descarga.',
    items: [
      {
        id: 'poi_1',
        sku: 'HW-SRV-RACK',
        name: 'Servidor Rack 1U Xeon 64GB ECC',
        quantity: 4,
        receivedQty: 4,
        unitCost: 43200,
        taxRate: '16%',
        subtotal: 172800,
        taxAmount: 27648,
        total: 200448,
      },
    ],
    subtotal: 172800,
    taxTotal: 27648,
    total: 200448,
    currency: 'MXN',
  },
  {
    id: 'po_2',
    folio: 'OC-2026-002',
    supplierCompany: 'Atlas Comercial',
    supplierContact: 'contacto@atlascomercial.mx',
    supplierEmail: 'contacto@atlascomercial.mx',
    date: '04 nov 2026',
    expectedDeliveryDate: '12 nov 2026',
    warehouseId: 'wh_central',
    warehouseName: 'Almacén Central Vallejo',
    status: 'Emitida',
    notes: 'Reabastecimiento de terminales touch y lectores para pedidos del mes.',
    items: [
      {
        id: 'poi_2',
        sku: 'HW-TERM-POS',
        name: 'Terminal Punto de Venta Touch 15.6" IP65',
        quantity: 10,
        receivedQty: 0,
        unitCost: 8650,
        taxRate: '16%',
        subtotal: 86500,
        taxAmount: 13840,
        total: 100340,
      },
      {
        id: 'poi_3',
        sku: 'HW-LECT-BAR',
        name: 'Lector Óptico de Código de Barras 2D Inalámbrico',
        quantity: 15,
        receivedQty: 0,
        unitCost: 1820,
        taxRate: '16%',
        subtotal: 27300,
        taxAmount: 4368,
        total: 31668,
      },
    ],
    subtotal: 113800,
    taxTotal: 18208,
    total: 132008,
    currency: 'MXN',
  },
  {
    id: 'po_3',
    folio: 'OC-2026-003',
    supplierCompany: 'Central de Insumos',
    supplierContact: 'ventas@centralinsumos.mx',
    supplierEmail: 'ventas@centralinsumos.mx',
    date: '06 nov 2026',
    expectedDeliveryDate: '15 nov 2026',
    warehouseId: 'wh_norte',
    warehouseName: 'Almacén Norte Monterrey',
    status: 'Borrador',
    notes: 'Borrador de routers industriales para reposición de stock mínimo en Monterrey.',
    items: [
      {
        id: 'poi_4',
        sku: 'HW-RTR-GIGA',
        name: 'Router Industrial Gigabit con Failover 4G',
        quantity: 5,
        receivedQty: 0,
        unitCost: 5100,
        taxRate: '16%',
        subtotal: 25500,
        taxAmount: 4080,
        total: 29580,
      },
    ],
    subtotal: 25500,
    taxTotal: 4080,
    total: 29580,
    currency: 'MXN',
  },
]

export const initialShipments: ShipmentDelivery[] = [
  {
    id: 'shp_1',
    folio: 'DESP-2026-001',
    orderFolio: 'PED-2026-001',
    clientCompany: 'Estudio Nómada',
    clientName: 'Sofía Ramírez',
    carrier: 'Logística del Valle',
    trackingNumber: 'LV-MEX-882104',
    shippingDate: '06 nov 2026',
    estimatedDelivery: '10 nov 2026',
    address: 'Av. Paseo de la Reforma 222, Piso 14, Cuauhtémoc, CDMX',
    status: 'En ruta',
    packages: 3,
    notes: '3 cajas debidamente embaladas con cinta de seguridad.',
  },
  {
    id: 'shp_2',
    folio: 'DESP-2026-002',
    orderFolio: 'PED-2026-002',
    clientCompany: 'Casa Oliva',
    clientName: 'Valentina Ruiz',
    carrier: 'Estafeta Express',
    trackingNumber: 'EST-994108821',
    shippingDate: '01 nov 2026',
    estimatedDelivery: '04 nov 2026',
    actualDeliveryDate: '04 nov 2026',
    address: 'Colima 180, Roma Norte, Cuauhtémoc, CDMX',
    status: 'Entregado',
    packages: 2,
    notes: 'Entregado con firma de recibido de almacenista.',
  },
  {
    id: 'shp_3',
    folio: 'DESP-2026-003',
    orderFolio: 'PED-2026-003',
    clientCompany: 'Lumen Studio',
    clientName: 'Mateo Cruz',
    carrier: 'Mensajería Interna',
    trackingNumber: 'INT-CDMX-014',
    shippingDate: '07 nov 2026',
    estimatedDelivery: '12 nov 2026',
    address: 'Orizaba 42, Roma Norte, Cuauhtémoc, CDMX',
    status: 'Preparando',
    packages: 1,
    notes: 'En proceso de etiquetado y packing en almacén central.',
  },
]
