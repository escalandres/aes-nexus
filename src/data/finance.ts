export interface InvoiceReceivable {
  id: string
  folio: string
  orderFolio: string
  clientCompany: string
  clientName: string
  clientRfc?: string
  issueDate: string
  dueDate: string
  subtotal: number
  tax: number
  total: number
  paidAmount: number
  balance: number
  status: 'Pendiente' | 'Pagada' | 'Parcial' | 'Vencida'
  currency: 'MXN' | 'USD'
  paymentMethod?: string
}

export interface BillPayable {
  id: string
  folio: string
  purchaseOrderFolio?: string
  supplierCompany: string
  supplierContact: string
  issueDate: string
  dueDate: string
  subtotal: number
  tax: number
  total: number
  paidAmount: number
  balance: number
  status: 'Pendiente' | 'Pagada' | 'Parcial' | 'Vencida'
  currency: 'MXN' | 'USD'
  paymentMethod?: string
}

export type ExpenseCategory =
  | 'Arrendamiento'
  | 'Servicios'
  | 'Nómina y honorarios'
  | 'Logística y fletes'
  | 'Software y herramientas'
  | 'Impuestos y derechos'
  | 'Viáticos y representación'

export interface ExpenseRecord {
  id: string
  folio: string
  date: string
  category: ExpenseCategory
  description: string
  beneficiary: string
  amount: number
  tax: number
  total: number
  paymentMethod: string
  referenceDoc?: string
  user: string
}

export type TransactionType = 'Cobro de cliente' | 'Pago a proveedor' | 'Gasto operativo'

export interface PaymentTransaction {
  id: string
  folio: string
  date: string
  type: TransactionType
  entityName: string
  reference: string
  amount: number
  method: string
  account: string
}

export interface BankAccount {
  id: string
  bankName: string
  accountNumber: string
  clabe: string
  balance: number
  currency: 'MXN' | 'USD'
  type: 'Cheques / Operativa' | 'Concentradora' | 'Caja chica'
}

export const initialBankAccounts: BankAccount[] = [
  {
    id: 'bank_1',
    bankName: 'BBVA México',
    accountNumber: '**** 4920',
    clabe: '012180004920192841',
    balance: 512400,
    currency: 'MXN',
    type: 'Cheques / Operativa',
  },
  {
    id: 'bank_2',
    bankName: 'Banorte',
    accountNumber: '**** 8812',
    clabe: '072180008812049182',
    balance: 310800,
    currency: 'MXN',
    type: 'Concentradora',
  },
  {
    id: 'bank_3',
    bankName: 'Caja Operativa Vallejo',
    accountNumber: 'Efectivo',
    clabe: 'N/A',
    balance: 19300,
    currency: 'MXN',
    type: 'Caja chica',
  },
]

export const initialReceivables: InvoiceReceivable[] = [
  {
    id: 'cxc_1',
    folio: 'FAC-2026-001',
    orderFolio: 'PED-2026-001',
    clientCompany: 'Estudio Nómada',
    clientName: 'Sofía Ramírez',
    clientRfc: 'ENO190412TK8',
    issueDate: '01 nov 2026',
    dueDate: '16 nov 2026',
    subtotal: 51870,
    tax: 8299,
    total: 60169,
    paidAmount: 0,
    balance: 60169,
    status: 'Pendiente',
    currency: 'MXN',
    paymentMethod: 'Transferencia SPEI',
  },
  {
    id: 'cxc_2',
    folio: 'FAC-2026-002',
    orderFolio: 'PED-2026-002',
    clientCompany: 'Casa Oliva',
    clientName: 'Valentina Ruiz',
    clientRfc: 'COL180905M12',
    issueDate: '26 oct 2026',
    dueDate: '10 nov 2026',
    subtotal: 48600,
    tax: 7776,
    total: 56376,
    paidAmount: 25000,
    balance: 31376,
    status: 'Parcial',
    currency: 'MXN',
    paymentMethod: 'Transferencia SPEI',
  },
  {
    id: 'cxc_3',
    folio: 'FAC-2026-003',
    orderFolio: 'PED-2026-003',
    clientCompany: 'Lumen Studio',
    clientName: 'Mateo Cruz',
    clientRfc: 'LST210314R77',
    issueDate: '15 oct 2026',
    dueDate: '30 oct 2026',
    subtotal: 34500,
    tax: 5520,
    total: 40020,
    paidAmount: 0,
    balance: 40020,
    status: 'Vencida',
    currency: 'MXN',
    paymentMethod: 'Transferencia SPEI',
  },
  {
    id: 'cxc_4',
    folio: 'FAC-2026-004',
    orderFolio: 'PED-2026-000',
    clientCompany: 'Taller 44',
    clientName: 'Daniel Gómez',
    clientRfc: 'TCT200115H33',
    issueDate: '18 oct 2026',
    dueDate: '02 nov 2026',
    subtotal: 28000,
    tax: 4480,
    total: 32480,
    paidAmount: 32480,
    balance: 0,
    status: 'Pagada',
    currency: 'MXN',
    paymentMethod: 'Tarjeta de crédito',
  },
]

export const initialPayables: BillPayable[] = [
  {
    id: 'cxp_1',
    folio: 'CXP-2026-001',
    purchaseOrderFolio: 'OC-2026-001',
    supplierCompany: 'Atlas Comercial',
    supplierContact: 'contacto@atlascomercial.mx',
    issueDate: '28 oct 2026',
    dueDate: '12 nov 2026',
    subtotal: 172800,
    tax: 27648,
    total: 200448,
    paidAmount: 100000,
    balance: 100448,
    status: 'Parcial',
    currency: 'MXN',
    paymentMethod: 'Transferencia SPEI',
  },
  {
    id: 'cxp_2',
    folio: 'CXP-2026-002',
    purchaseOrderFolio: 'OC-2026-002',
    supplierCompany: 'Atlas Comercial',
    supplierContact: 'contacto@atlascomercial.mx',
    issueDate: '04 nov 2026',
    dueDate: '19 nov 2026',
    subtotal: 113800,
    tax: 18208,
    total: 132008,
    paidAmount: 0,
    balance: 132008,
    status: 'Pendiente',
    currency: 'MXN',
    paymentMethod: 'Transferencia SPEI',
  },
  {
    id: 'cxp_3',
    folio: 'CXP-2026-003',
    purchaseOrderFolio: 'FAC-LOG-992',
    supplierCompany: 'Logística del Valle',
    supplierContact: 'operaciones@logisticavalle.mx',
    issueDate: '20 oct 2026',
    dueDate: '04 nov 2026',
    subtotal: 12500,
    tax: 2000,
    total: 14500,
    paidAmount: 0,
    balance: 14500,
    status: 'Vencida',
    currency: 'MXN',
    paymentMethod: 'Transferencia SPEI',
  },
  {
    id: 'cxp_4',
    folio: 'CXP-2026-004',
    purchaseOrderFolio: 'INS-SEP-04',
    supplierCompany: 'Central de Insumos',
    supplierContact: 'ventas@centralinsumos.mx',
    issueDate: '10 oct 2026',
    dueDate: '25 oct 2026',
    subtotal: 8200,
    tax: 1312,
    total: 9512,
    paidAmount: 9512,
    balance: 0,
    status: 'Pagada',
    currency: 'MXN',
    paymentMethod: 'Transferencia SPEI',
  },
]

export const initialExpenses: ExpenseRecord[] = [
  {
    id: 'exp_1',
    folio: 'GST-2026-001',
    date: '05 nov 2026',
    category: 'Arrendamiento',
    description: 'Renta mensual de bodega y oficinas Calz. Vallejo',
    beneficiary: 'Inmobiliaria Industrial Vallejo S.A.',
    amount: 32000,
    tax: 5120,
    total: 37120,
    paymentMethod: 'Transferencia SPEI',
    referenceDoc: 'FAC-INM-8821',
    user: 'Andrea Morales',
  },
  {
    id: 'exp_2',
    folio: 'GST-2026-002',
    date: '04 nov 2026',
    category: 'Servicios',
    description: 'Suministro de energía eléctrica CFE Nave A y B',
    beneficiary: 'Comisión Federal de Electricidad',
    amount: 7450,
    tax: 1192,
    total: 8642,
    paymentMethod: 'Domiciliación bancaria',
    referenceDoc: 'CFE-OCT-9901',
    user: 'Andrea Morales',
  },
  {
    id: 'exp_3',
    folio: 'GST-2026-003',
    date: '02 nov 2026',
    category: 'Software y herramientas',
    description: 'Suscripción nube, hosting servidores y respaldos dedicados',
    beneficiary: 'Nube Digital / Cloud Services',
    amount: 6800,
    tax: 1088,
    total: 7888,
    paymentMethod: 'Tarjeta corporativa',
    referenceDoc: 'INV-CLOUD-44',
    user: 'Andrea Morales',
  },
  {
    id: 'exp_4',
    folio: 'GST-2026-004',
    date: '31 oct 2026',
    category: 'Logística y fletes',
    description: 'Flete consolidado traslado de stock CDMX - Monterrey',
    beneficiary: 'Logística del Valle',
    amount: 14200,
    tax: 2272,
    total: 16472,
    paymentMethod: 'Transferencia SPEI',
    referenceDoc: 'FLET-TRF-001',
    user: 'Andrea Morales',
  },
  {
    id: 'exp_5',
    folio: 'GST-2026-005',
    date: '30 oct 2026',
    category: 'Nómina y honorarios',
    description: 'Honorarios asesoría contable y dictamen fiscal mensual',
    beneficiary: 'Despacho Contable García & Asoc.',
    amount: 12000,
    tax: 1920,
    total: 13920,
    paymentMethod: 'Transferencia SPEI',
    referenceDoc: 'HON-OCT-2026',
    user: 'Andrea Morales',
  },
]

export const initialTransactions: PaymentTransaction[] = [
  {
    id: 'txn_1',
    folio: 'PAG-2026-001',
    date: '06 nov 2026',
    type: 'Pago a proveedor',
    entityName: 'Atlas Comercial',
    reference: 'SPEI-884920 · Anticipo OC-2026-001',
    amount: 100000,
    method: 'Transferencia SPEI',
    account: 'BBVA México',
  },
  {
    id: 'txn_2',
    folio: 'PAG-2026-002',
    date: '05 nov 2026',
    type: 'Gasto operativo',
    entityName: 'Inmobiliaria Industrial Vallejo S.A.',
    reference: 'SPEI-192840 · Renta bodega Vallejo',
    amount: 37120,
    method: 'Transferencia SPEI',
    account: 'BBVA México',
  },
  {
    id: 'txn_3',
    folio: 'PAG-2026-003',
    date: '02 nov 2026',
    type: 'Cobro de cliente',
    entityName: 'Casa Oliva',
    reference: 'SPEI-772104 · Anticipo FAC-2026-002',
    amount: 25000,
    method: 'Transferencia SPEI',
    account: 'BBVA México',
  },
  {
    id: 'txn_4',
    folio: 'PAG-2026-004',
    date: '28 oct 2026',
    type: 'Cobro de cliente',
    entityName: 'Taller 44',
    reference: 'TPV-AUTH-99120 · Liquidación FAC-2026-004',
    amount: 32480,
    method: 'Tarjeta de crédito',
    account: 'Banorte',
  },
]
