export type ReturnReason =
  | 'Defecto de fábrica'
  | 'Daño en tránsito'
  | 'Error en surtido'
  | 'No cumple especificaciones'
  | 'Excedente / cambio comercial'
  | 'Garantía'

export type ReturnDisposition =
  | 'Reingreso a almacén'
  | 'Cuarentena / revisión'
  | 'Merma / baja definitiva'
  | 'Reposición con proveedor'

export type ReturnItemCondition =
  | 'Sellado / intacto'
  | 'Empaque abierto'
  | 'Dañado / defectuoso'

export type CustomerReturnStatus =
  | 'Solicitada'
  | 'En tránsito a almacén'
  | 'Recibida en almacén'
  | 'Nota de crédito emitida'
  | 'Rechazada'

export type CustomerReturnResolution =
  | 'Nota de crédito (CxC)'
  | 'Reembolso'
  | 'Reposición sin costo'

export type SupplierReturnStatus =
  | 'Borrador'
  | 'Autorizada por proveedor'
  | 'Enviada a proveedor'
  | 'Acreditada / compensada'
  | 'Cancelada'

export type SupplierReturnResolution =
  | 'Nota de crédito (CxP)'
  | 'Reposición de mercancía'
  | 'Reembolso proveedor'

export type WorkflowApproverRole =
  | 'Cualquier editor'
  | 'Operaciones'
  | 'Finanzas'
  | 'Administrador'

export interface ReturnWorkflowHistoryEntry {
  id: string
  timestampIso: string
  fromStatus?: string
  toStatus: string
  actor: string
  action: 'created' | 'transition' | 'approval_requested' | 'approved' | 'approval_rejected'
  note?: string
}

export interface ReturnWorkflowStepRule<TStatus extends string> {
  status: TStatus
  enabled: boolean
  isFinalState: boolean
  requiresApproval: boolean
  approverRole: WorkflowApproverRole
  approvalThresholdAmount: number
  requireNotesOnEntry: boolean
  requireDocumentRefOnEntry?: boolean
  allowedNextStatuses: TStatus[]
}

export interface ReturnEntityWorkflowConfig<TStatus extends string> {
  initialStatus: TStatus
  preventDeleteAfterSettlement: boolean
  updatedAtIso: string
  updatedBy: string
  steps: ReturnWorkflowStepRule<TStatus>[]
}

export interface ReturnWorkflowsSettings {
  customer: ReturnEntityWorkflowConfig<CustomerReturnStatus>
  supplier: ReturnEntityWorkflowConfig<SupplierReturnStatus>
}

export type ReturnApprovalStatus = 'not_required' | 'pending' | 'approved' | 'rejected'

export interface ReturnLineItem {
  id: string
  sku: string
  name: string
  quantity: number
  unitAmount: number
  taxRate: '16%' | '8%' | '0%' | 'Exento'
  unitOfMeasure: string
  subtotal: number
  taxAmount: number
  total: number
  condition: ReturnItemCondition
  disposition: ReturnDisposition
}

export interface CustomerReturn {
  id: string
  folio: string
  date: string
  orderId?: string
  orderFolio: string
  invoiceId?: string
  invoiceFolio?: string
  clientCompany: string
  clientName: string
  warehouseId: string
  warehouseName: string
  reason: ReturnReason
  resolution: CustomerReturnResolution
  status: CustomerReturnStatus
  items: ReturnLineItem[]
  subtotal: number
  taxTotal: number
  total: number
  currency: 'MXN' | 'USD'
  inventoryApplied?: boolean
  financeApplied?: boolean
  creditNoteFolio?: string
  notes?: string
  createdBy: string
  updatedAtIso: string
  approvalStatus?: ReturnApprovalStatus
  pendingTargetStatus?: CustomerReturnStatus
  approvalRequestedBy?: string
  approvalRequestedAtIso?: string
  approvedBy?: string
  approvedAtIso?: string
  rejectionReason?: string
  workflowHistory?: ReturnWorkflowHistoryEntry[]
}

export interface SupplierReturn {
  id: string
  folio: string
  date: string
  purchaseOrderId?: string
  purchaseOrderFolio: string
  billId?: string
  billFolio?: string
  supplierCompany: string
  supplierContact: string
  warehouseId: string
  warehouseName: string
  reason: ReturnReason
  resolution: SupplierReturnResolution
  status: SupplierReturnStatus
  items: ReturnLineItem[]
  subtotal: number
  taxTotal: number
  total: number
  currency: 'MXN' | 'USD'
  inventoryApplied?: boolean
  financeApplied?: boolean
  creditNoteFolio?: string
  rmaSupplierCode?: string
  notes?: string
  createdBy: string
  updatedAtIso: string
  approvalStatus?: ReturnApprovalStatus
  pendingTargetStatus?: SupplierReturnStatus
  approvalRequestedBy?: string
  approvalRequestedAtIso?: string
  approvedBy?: string
  approvedAtIso?: string
  rejectionReason?: string
  workflowHistory?: ReturnWorkflowHistoryEntry[]
}

export const ALL_CUSTOMER_RETURN_STATUSES: CustomerReturnStatus[] = [
  'Solicitada',
  'En tránsito a almacén',
  'Recibida en almacén',
  'Nota de crédito emitida',
  'Rechazada',
]

export const ALL_SUPPLIER_RETURN_STATUSES: SupplierReturnStatus[] = [
  'Borrador',
  'Autorizada por proveedor',
  'Enviada a proveedor',
  'Acreditada / compensada',
  'Cancelada',
]

export const WORKFLOW_APPROVER_ROLES: WorkflowApproverRole[] = [
  'Cualquier editor',
  'Operaciones',
  'Finanzas',
  'Administrador',
]

export const DEFAULT_RETURN_WORKFLOWS: ReturnWorkflowsSettings = {
  customer: {
    initialStatus: 'Solicitada',
    preventDeleteAfterSettlement: true,
    updatedAtIso: '2026-11-21T12:00:00.000Z',
    updatedBy: 'Sistema (Estándar)',
    steps: [
      {
        status: 'Solicitada',
        enabled: true,
        isFinalState: false,
        requiresApproval: false,
        approverRole: 'Cualquier editor',
        approvalThresholdAmount: 0,
        requireNotesOnEntry: false,
        allowedNextStatuses: ['En tránsito a almacén', 'Recibida en almacén', 'Rechazada'],
      },
      {
        status: 'En tránsito a almacén',
        enabled: true,
        isFinalState: false,
        requiresApproval: false,
        approverRole: 'Operaciones',
        approvalThresholdAmount: 0,
        requireNotesOnEntry: false,
        allowedNextStatuses: ['Recibida en almacén', 'Rechazada'],
      },
      {
        status: 'Recibida en almacén',
        enabled: true,
        isFinalState: false,
        requiresApproval: false,
        approverRole: 'Operaciones',
        approvalThresholdAmount: 0,
        requireNotesOnEntry: false,
        allowedNextStatuses: ['Nota de crédito emitida', 'Rechazada'],
      },
      {
        status: 'Nota de crédito emitida',
        enabled: true,
        isFinalState: true,
        requiresApproval: true,
        approverRole: 'Finanzas',
        approvalThresholdAmount: 0,
        requireNotesOnEntry: false,
        allowedNextStatuses: [],
      },
      {
        status: 'Rechazada',
        enabled: true,
        isFinalState: true,
        requiresApproval: true,
        approverRole: 'Administrador',
        approvalThresholdAmount: 0,
        requireNotesOnEntry: true,
        allowedNextStatuses: [],
      },
    ],
  },
  supplier: {
    initialStatus: 'Borrador',
    preventDeleteAfterSettlement: true,
    updatedAtIso: '2026-11-21T12:00:00.000Z',
    updatedBy: 'Sistema (Estándar)',
    steps: [
      {
        status: 'Borrador',
        enabled: true,
        isFinalState: false,
        requiresApproval: false,
        approverRole: 'Cualquier editor',
        approvalThresholdAmount: 0,
        requireNotesOnEntry: false,
        requireDocumentRefOnEntry: false,
        allowedNextStatuses: ['Autorizada por proveedor', 'Enviada a proveedor', 'Cancelada'],
      },
      {
        status: 'Autorizada por proveedor',
        enabled: true,
        isFinalState: false,
        requiresApproval: false,
        approverRole: 'Operaciones',
        approvalThresholdAmount: 0,
        requireNotesOnEntry: false,
        requireDocumentRefOnEntry: false,
        allowedNextStatuses: ['Enviada a proveedor', 'Cancelada'],
      },
      {
        status: 'Enviada a proveedor',
        enabled: true,
        isFinalState: false,
        requiresApproval: false,
        approverRole: 'Operaciones',
        approvalThresholdAmount: 0,
        requireNotesOnEntry: false,
        requireDocumentRefOnEntry: false,
        allowedNextStatuses: ['Acreditada / compensada', 'Cancelada'],
      },
      {
        status: 'Acreditada / compensada',
        enabled: true,
        isFinalState: true,
        requiresApproval: true,
        approverRole: 'Finanzas',
        approvalThresholdAmount: 0,
        requireNotesOnEntry: false,
        requireDocumentRefOnEntry: false,
        allowedNextStatuses: [],
      },
      {
        status: 'Cancelada',
        enabled: true,
        isFinalState: true,
        requiresApproval: true,
        approverRole: 'Administrador',
        approvalThresholdAmount: 0,
        requireNotesOnEntry: true,
        requireDocumentRefOnEntry: false,
        allowedNextStatuses: [],
      },
    ],
  },
}

export const RETURN_WORKFLOWS_STORAGE_KEY = 'aes_nexus_return_workflows_v1'
export const RETURN_WORKFLOWS_CHANGED_EVENT = 'aes-nexus-return-workflows-changed'

export const RETURN_REASONS: ReturnReason[] = [
  'Defecto de fábrica',
  'Daño en tránsito',
  'Error en surtido',
  'No cumple especificaciones',
  'Excedente / cambio comercial',
  'Garantía',
]

export const RETURN_CONDITIONS: ReturnItemCondition[] = [
  'Sellado / intacto',
  'Empaque abierto',
  'Dañado / defectuoso',
]

export const CUSTOMER_RETURN_DISPOSITIONS: ReturnDisposition[] = [
  'Reingreso a almacén',
  'Cuarentena / revisión',
  'Merma / baja definitiva',
]

export const SUPPLIER_RETURN_DISPOSITIONS: ReturnDisposition[] = [
  'Reposición con proveedor',
  'Merma / baja definitiva',
  'Cuarentena / revisión',
]

export const CUSTOMER_RETURNS_STORAGE_KEY = 'aes_nexus_customer_returns_v1'
export const SUPPLIER_RETURNS_STORAGE_KEY = 'aes_nexus_supplier_returns_v1'

export const initialCustomerReturns: CustomerReturn[] = [
  {
    id: 'rma_cli_1',
    folio: 'DEV-CLI-2026-001',
    date: '08 nov 2026',
    orderId: 'order_2',
    orderFolio: 'PED-2026-002',
    invoiceId: 'cxc_2',
    invoiceFolio: 'FAC-2026-002',
    clientCompany: 'Casa Oliva',
    clientName: 'Valentina Ruiz',
    warehouseId: 'wh_central',
    warehouseName: 'Almacén Central Vallejo',
    reason: 'Error en surtido',
    resolution: 'Nota de crédito (CxC)',
    status: 'Recibida en almacén',
    currency: 'MXN',
    inventoryApplied: true,
    financeApplied: false,
    notes: 'Cliente solicitó devolución de 1 lector óptico excedente respecto a su sucursal Roma Norte.',
    createdBy: 'Sofía Mendoza',
    updatedAtIso: '2026-11-08T14:20:00.000Z',
    items: [
      {
        id: 'rli_c_1',
        sku: 'HW-LECT-BAR',
        name: 'Lector Óptico de Código de Barras 2D Inalámbrico',
        quantity: 1,
        unitAmount: 2950,
        taxRate: '16%',
        unitOfMeasure: 'Pza',
        subtotal: 2950,
        taxAmount: 472,
        total: 3422,
        condition: 'Sellado / intacto',
        disposition: 'Reingreso a almacén',
      },
    ],
    subtotal: 2950,
    taxTotal: 472,
    total: 3422,
  },
  {
    id: 'rma_cli_2',
    folio: 'DEV-CLI-2026-002',
    date: '14 nov 2026',
    orderId: 'order_1',
    orderFolio: 'PED-2026-001',
    invoiceId: 'cxc_1',
    invoiceFolio: 'FAC-2026-001',
    clientCompany: 'Estudio Nómada',
    clientName: 'Sofía Ramírez',
    warehouseId: 'wh_central',
    warehouseName: 'Almacén Central Vallejo',
    reason: 'Defecto de fábrica',
    resolution: 'Reposición sin costo',
    status: 'En tránsito a almacén',
    currency: 'MXN',
    inventoryApplied: false,
    financeApplied: false,
    notes: 'Terminal POS reporta falla táctil en esquina inferior derecha al encender en sucursal.',
    createdBy: 'Andrea Morales Escala',
    updatedAtIso: '2026-11-14T11:10:00.000Z',
    items: [
      {
        id: 'rli_c_2',
        sku: 'HW-TERM-POS',
        name: 'Terminal Punto de Venta Touch 15.6" IP65',
        quantity: 1,
        unitAmount: 12400,
        taxRate: '16%',
        unitOfMeasure: 'Pza',
        subtotal: 12400,
        taxAmount: 1984,
        total: 14384,
        condition: 'Dañado / defectuoso',
        disposition: 'Cuarentena / revisión',
      },
    ],
    subtotal: 12400,
    taxTotal: 1984,
    total: 14384,
  },
  {
    id: 'rma_cli_3',
    folio: 'DEV-CLI-2026-003',
    date: '18 nov 2026',
    orderId: 'order_2',
    orderFolio: 'PED-2026-002',
    invoiceId: 'cxc_2',
    invoiceFolio: 'FAC-2026-002',
    clientCompany: 'Casa Oliva',
    clientName: 'Valentina Ruiz',
    warehouseId: 'wh_central',
    warehouseName: 'Almacén Central Vallejo',
    reason: 'No cumple especificaciones',
    resolution: 'Nota de crédito (CxC)',
    status: 'Solicitada',
    currency: 'MXN',
    inventoryApplied: false,
    financeApplied: false,
    notes: 'Requieren reemplazo de router industrial por modelo con doble ranura SIM redundante.',
    createdBy: 'Andrea Morales Escala',
    updatedAtIso: '2026-11-18T16:40:00.000Z',
    items: [
      {
        id: 'rli_c_3',
        sku: 'HW-RTR-GIGA',
        name: 'Router Industrial Gigabit con Failover 4G',
        quantity: 1,
        unitAmount: 7850,
        taxRate: '16%',
        unitOfMeasure: 'Pza',
        subtotal: 7850,
        taxAmount: 1256,
        total: 9106,
        condition: 'Empaque abierto',
        disposition: 'Reingreso a almacén',
      },
    ],
    subtotal: 7850,
    taxTotal: 1256,
    total: 9106,
  },
]

export const initialSupplierReturns: SupplierReturn[] = [
  {
    id: 'rtv_prv_1',
    folio: 'DEV-PRV-2026-001',
    date: '05 nov 2026',
    purchaseOrderId: 'po_1',
    purchaseOrderFolio: 'OC-2026-001',
    billId: 'cxp_1',
    billFolio: 'CXP-2026-001',
    supplierCompany: 'Atlas Comercial',
    supplierContact: 'contacto@atlascomercial.mx',
    warehouseId: 'wh_central',
    warehouseName: 'Almacén Central Vallejo',
    reason: 'Garantía',
    resolution: 'Nota de crédito (CxP)',
    status: 'Enviada a proveedor',
    currency: 'MXN',
    inventoryApplied: true,
    financeApplied: false,
    rmaSupplierCode: 'RMA-ATL-4410',
    notes: 'Fuente redundante de servidor con ruido en ventilador detectada en pruebas de recepción.',
    createdBy: 'Roberto Santos',
    updatedAtIso: '2026-11-05T13:15:00.000Z',
    items: [
      {
        id: 'rli_p_1',
        sku: 'HW-SRV-RACK',
        name: 'Servidor Rack 1U Xeon 64GB ECC',
        quantity: 1,
        unitAmount: 43200,
        taxRate: '16%',
        unitOfMeasure: 'Pza',
        subtotal: 43200,
        taxAmount: 6912,
        total: 50112,
        condition: 'Dañado / defectuoso',
        disposition: 'Reposición con proveedor',
      },
    ],
    subtotal: 43200,
    taxTotal: 6912,
    total: 50112,
  },
  {
    id: 'rtv_prv_2',
    folio: 'DEV-PRV-2026-002',
    date: '12 nov 2026',
    purchaseOrderId: 'po_hist_q3_1',
    purchaseOrderFolio: 'OC-2026-Q3-01',
    billId: 'cxp_hist_q3_1',
    billFolio: 'CXP-2026-Q3-01',
    supplierCompany: 'Central de Insumos',
    supplierContact: 'ventas@centralinsumos.mx',
    warehouseId: 'wh_central',
    warehouseName: 'Almacén Central Vallejo',
    reason: 'Daño en tránsito',
    resolution: 'Nota de crédito (CxP)',
    status: 'Autorizada por proveedor',
    currency: 'MXN',
    inventoryApplied: false,
    financeApplied: false,
    rmaSupplierCode: 'CI-DEV-892',
    notes: 'Embalaje aplastado en 1 switch PoE+ con puerto SFP doblado en inspección de calidad.',
    createdBy: 'Roberto Santos',
    updatedAtIso: '2026-11-12T10:30:00.000Z',
    items: [
      {
        id: 'rli_p_2',
        sku: 'HW-SWT-POE',
        name: 'Switch Administrable 24 Puertos Gigabit PoE+',
        quantity: 1,
        unitAmount: 6800,
        taxRate: '16%',
        unitOfMeasure: 'Pza',
        subtotal: 6800,
        taxAmount: 1088,
        total: 7888,
        condition: 'Dañado / defectuoso',
        disposition: 'Reposición con proveedor',
      },
    ],
    subtotal: 6800,
    taxTotal: 1088,
    total: 7888,
  },
  {
    id: 'rtv_prv_3',
    folio: 'DEV-PRV-2026-003',
    date: '17 nov 2026',
    purchaseOrderId: 'po_hist_q3_2',
    purchaseOrderFolio: 'OC-2026-Q3-02',
    supplierCompany: 'Atlas Comercial',
    supplierContact: 'contacto@atlascomercial.mx',
    warehouseId: 'wh_norte',
    warehouseName: 'Almacén Norte Monterrey',
    reason: 'Excedente / cambio comercial',
    resolution: 'Nota de crédito (CxP)',
    status: 'Borrador',
    currency: 'MXN',
    inventoryApplied: false,
    financeApplied: false,
    notes: 'Ajuste de sobreinventario acordado con ejecutivo de Atlas Comercial para rotación Q4.',
    createdBy: 'Andrea Morales Escala',
    updatedAtIso: '2026-11-17T09:50:00.000Z',
    items: [
      {
        id: 'rli_p_3',
        sku: 'HW-TERM-POS',
        name: 'Terminal Punto de Venta Touch 15.6" IP65',
        quantity: 2,
        unitAmount: 8333,
        taxRate: '16%',
        unitOfMeasure: 'Pza',
        subtotal: 16666,
        taxAmount: 2667,
        total: 19333,
        condition: 'Sellado / intacto',
        disposition: 'Reposición con proveedor',
      },
    ],
    subtotal: 16666,
    taxTotal: 2667,
    total: 19333,
  },
]

export function loadStoredCustomerReturns(): CustomerReturn[] {
  try {
    const raw = window.localStorage.getItem(CUSTOMER_RETURNS_STORAGE_KEY)
    if (!raw) return initialCustomerReturns
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : initialCustomerReturns
  } catch {
    return initialCustomerReturns
  }
}

export function saveStoredCustomerReturns(list: CustomerReturn[]): void {
  try {
    window.localStorage.setItem(CUSTOMER_RETURNS_STORAGE_KEY, JSON.stringify(list))
  } catch {
    // ignore storage quota errors
  }
}

export function loadStoredSupplierReturns(): SupplierReturn[] {
  try {
    const raw = window.localStorage.getItem(SUPPLIER_RETURNS_STORAGE_KEY)
    if (!raw) return initialSupplierReturns
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : initialSupplierReturns
  } catch {
    return initialSupplierReturns
  }
}

export function saveStoredSupplierReturns(list: SupplierReturn[]): void {
  try {
    window.localStorage.setItem(SUPPLIER_RETURNS_STORAGE_KEY, JSON.stringify(list))
  } catch {
    // ignore storage quota errors
  }
}

export function cloneReturnWorkflows(
  src: ReturnWorkflowsSettings = DEFAULT_RETURN_WORKFLOWS
): ReturnWorkflowsSettings {
  return {
    customer: {
      ...src.customer,
      steps: src.customer.steps.map((s) => ({
        ...s,
        allowedNextStatuses: [...s.allowedNextStatuses],
      })),
    },
    supplier: {
      ...src.supplier,
      steps: src.supplier.steps.map((s) => ({
        ...s,
        allowedNextStatuses: [...s.allowedNextStatuses],
      })),
    },
  }
}

function normalizeEntityWorkflow<TStatus extends string>(
  raw: Partial<ReturnEntityWorkflowConfig<TStatus>> | undefined,
  fallback: ReturnEntityWorkflowConfig<TStatus>
): ReturnEntityWorkflowConfig<TStatus> {
  if (!raw || !Array.isArray(raw.steps)) {
    return {
      ...fallback,
      steps: fallback.steps.map((s) => ({
        ...s,
        allowedNextStatuses: [...s.allowedNextStatuses],
      })),
    }
  }

  const validStatuses = new Set<TStatus>(fallback.steps.map((s) => s.status))
  const fallbackByStatus = new Map<TStatus, ReturnWorkflowStepRule<TStatus>>(
    fallback.steps.map((s) => [s.status, s])
  )
  const orderedRawSteps: ReturnWorkflowStepRule<TStatus>[] = []
  const seen = new Set<TStatus>()

  raw.steps.forEach((step) => {
    if (step && typeof step.status === 'string' && validStatuses.has(step.status) && !seen.has(step.status)) {
      seen.add(step.status)
      orderedRawSteps.push(step)
    }
  })

  // Append any missing default steps at the end in fallback order
  fallback.steps.forEach((defStep) => {
    if (!seen.has(defStep.status)) {
      seen.add(defStep.status)
      orderedRawSteps.push(defStep)
    }
  })

  const normalizedSteps = orderedRawSteps.map((found) => {
    const defStep = fallbackByStatus.get(found.status)!
    return {
      status: defStep.status,
      enabled: typeof found.enabled === 'boolean' ? found.enabled : defStep.enabled,
      isFinalState:
        typeof found.isFinalState === 'boolean' ? found.isFinalState : defStep.isFinalState,
      requiresApproval:
        typeof found.requiresApproval === 'boolean'
          ? found.requiresApproval
          : defStep.requiresApproval,
      approverRole: WORKFLOW_APPROVER_ROLES.includes(found.approverRole)
        ? found.approverRole
        : defStep.approverRole,
      approvalThresholdAmount:
        typeof found.approvalThresholdAmount === 'number' &&
        Number.isFinite(found.approvalThresholdAmount) &&
        found.approvalThresholdAmount >= 0
          ? found.approvalThresholdAmount
          : defStep.approvalThresholdAmount,
      requireNotesOnEntry:
        typeof found.requireNotesOnEntry === 'boolean'
          ? found.requireNotesOnEntry
          : defStep.requireNotesOnEntry,
      requireDocumentRefOnEntry:
        typeof found.requireDocumentRefOnEntry === 'boolean'
          ? found.requireDocumentRefOnEntry
          : Boolean(defStep.requireDocumentRefOnEntry),
      allowedNextStatuses: Array.isArray(found.allowedNextStatuses)
        ? found.allowedNextStatuses.filter((st): st is TStatus => validStatuses.has(st) && st !== defStep.status)
        : [...defStep.allowedNextStatuses],
    }
  })

  const initialCandidate = raw.initialStatus
  const validInitial = normalizedSteps.some(
    (s) => s.status === initialCandidate && s.enabled && !s.isFinalState
  )
    ? (initialCandidate as TStatus)
    : (normalizedSteps.find((s) => s.enabled && !s.isFinalState)?.status ?? fallback.initialStatus)

  return {
    initialStatus: validInitial,
    preventDeleteAfterSettlement:
      typeof raw.preventDeleteAfterSettlement === 'boolean'
        ? raw.preventDeleteAfterSettlement
        : fallback.preventDeleteAfterSettlement,
    updatedAtIso: raw.updatedAtIso || fallback.updatedAtIso,
    updatedBy: raw.updatedBy || fallback.updatedBy,
    steps: normalizedSteps,
  }
}

export function syncWorkflowTransitionsToOrder<TStatus extends string>(
  config: ReturnEntityWorkflowConfig<TStatus>
): ReturnEntityWorkflowConfig<TStatus> {
  const enabledNonFinal = config.steps.filter((s) => s.enabled && !s.isFinalState)
  const enabledFinals = config.steps.filter((s) => s.enabled && s.isFinalState)
  const firstFinal = enabledFinals[0]
  const rejectionFinals = enabledFinals.filter(
    (s) => s.status === 'Rechazada' || s.status === 'Cancelada'
  )

  const nextSteps = config.steps.map((step) => {
    if (!step.enabled || step.isFinalState) {
      return { ...step, allowedNextStatuses: [] as TStatus[] }
    }
    const idxInActive = enabledNonFinal.findIndex((s) => s.status === step.status)
    const targets: TStatus[] = []
    if (idxInActive >= 0 && idxInActive < enabledNonFinal.length - 1) {
      targets.push(enabledNonFinal[idxInActive + 1].status)
    } else if (firstFinal) {
      targets.push(firstFinal.status)
    }
    // Also allow branching to terminal rejection/cancellation states
    rejectionFinals.forEach((rej) => {
      if (!targets.includes(rej.status)) {
        targets.push(rej.status)
      }
    })
    return { ...step, allowedNextStatuses: targets }
  })

  const nextInitial = enabledNonFinal.some((s) => s.status === config.initialStatus)
    ? config.initialStatus
    : (enabledNonFinal[0]?.status ?? config.initialStatus)

  return {
    ...config,
    initialStatus: nextInitial,
    steps: nextSteps,
  }
}

export function loadStoredReturnWorkflows(): ReturnWorkflowsSettings {
  try {
    const raw = window.localStorage.getItem(RETURN_WORKFLOWS_STORAGE_KEY)
    if (!raw) return cloneReturnWorkflows(DEFAULT_RETURN_WORKFLOWS)
    const parsed = JSON.parse(raw) as Partial<ReturnWorkflowsSettings>
    return {
      customer: normalizeEntityWorkflow(parsed.customer, DEFAULT_RETURN_WORKFLOWS.customer),
      supplier: normalizeEntityWorkflow(parsed.supplier, DEFAULT_RETURN_WORKFLOWS.supplier),
    }
  } catch {
    return cloneReturnWorkflows(DEFAULT_RETURN_WORKFLOWS)
  }
}

export function saveStoredReturnWorkflows(next: ReturnWorkflowsSettings): void {
  try {
    window.localStorage.setItem(RETURN_WORKFLOWS_STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent(RETURN_WORKFLOWS_CHANGED_EVENT, { detail: next }))
  } catch {
    // ignore storage quota errors
  }
}

export type ReturnWorkflowPresetKey = 'standard' | 'strict_final' | 'agile'

export function buildReturnWorkflowPreset(
  kind: 'customer' | 'supplier',
  preset: ReturnWorkflowPresetKey,
  actorName: string
): ReturnWorkflowsSettings['customer'] | ReturnWorkflowsSettings['supplier'] {
  const nowIso = new Date().toISOString()
  if (kind === 'customer') {
    if (preset === 'strict_final') {
      return {
        initialStatus: 'Solicitada',
        preventDeleteAfterSettlement: true,
        updatedAtIso: nowIso,
        updatedBy: actorName,
        steps: [
          {
            status: 'Solicitada',
            enabled: true,
            isFinalState: false,
            requiresApproval: false,
            approverRole: 'Cualquier editor',
            approvalThresholdAmount: 0,
            requireNotesOnEntry: false,
            allowedNextStatuses: ['En tránsito a almacén', 'Rechazada'],
          },
          {
            status: 'En tránsito a almacén',
            enabled: true,
            isFinalState: false,
            requiresApproval: true,
            approverRole: 'Operaciones',
            approvalThresholdAmount: 0,
            requireNotesOnEntry: false,
            allowedNextStatuses: ['Recibida en almacén', 'Rechazada'],
          },
          {
            status: 'Recibida en almacén',
            enabled: true,
            isFinalState: false,
            requiresApproval: false,
            approverRole: 'Operaciones',
            approvalThresholdAmount: 0,
            requireNotesOnEntry: true,
            allowedNextStatuses: ['Nota de crédito emitida', 'Rechazada'],
          },
          {
            status: 'Nota de crédito emitida',
            enabled: true,
            isFinalState: true,
            requiresApproval: true,
            approverRole: 'Finanzas',
            approvalThresholdAmount: 0,
            requireNotesOnEntry: false,
            allowedNextStatuses: [],
          },
          {
            status: 'Rechazada',
            enabled: true,
            isFinalState: true,
            requiresApproval: true,
            approverRole: 'Administrador',
            approvalThresholdAmount: 0,
            requireNotesOnEntry: true,
            allowedNextStatuses: [],
          },
        ],
      }
    }
    if (preset === 'agile') {
      return {
        initialStatus: 'Solicitada',
        preventDeleteAfterSettlement: false,
        updatedAtIso: nowIso,
        updatedBy: actorName,
        steps: [
          {
            status: 'Solicitada',
            enabled: true,
            isFinalState: false,
            requiresApproval: false,
            approverRole: 'Cualquier editor',
            approvalThresholdAmount: 0,
            requireNotesOnEntry: false,
            allowedNextStatuses: ['En tránsito a almacén', 'Recibida en almacén', 'Rechazada'],
          },
          {
            status: 'En tránsito a almacén',
            enabled: true,
            isFinalState: false,
            requiresApproval: false,
            approverRole: 'Cualquier editor',
            approvalThresholdAmount: 0,
            requireNotesOnEntry: false,
            allowedNextStatuses: ['Recibida en almacén', 'Rechazada'],
          },
          {
            status: 'Recibida en almacén',
            enabled: true,
            isFinalState: false,
            requiresApproval: false,
            approverRole: 'Operaciones',
            approvalThresholdAmount: 0,
            requireNotesOnEntry: false,
            allowedNextStatuses: ['Nota de crédito emitida', 'Rechazada'],
          },
          {
            status: 'Nota de crédito emitida',
            enabled: true,
            isFinalState: true,
            requiresApproval: true,
            approverRole: 'Finanzas',
            approvalThresholdAmount: 15000,
            requireNotesOnEntry: false,
            allowedNextStatuses: [],
          },
          {
            status: 'Rechazada',
            enabled: true,
            isFinalState: true,
            requiresApproval: false,
            approverRole: 'Cualquier editor',
            approvalThresholdAmount: 0,
            requireNotesOnEntry: false,
            allowedNextStatuses: [],
          },
        ],
      }
    }
    return {
      ...cloneReturnWorkflows(DEFAULT_RETURN_WORKFLOWS).customer,
      updatedAtIso: nowIso,
      updatedBy: actorName,
    }
  }

  // supplier
  if (preset === 'strict_final') {
    return {
      initialStatus: 'Borrador',
      preventDeleteAfterSettlement: true,
      updatedAtIso: nowIso,
      updatedBy: actorName,
      steps: [
        {
          status: 'Borrador',
          enabled: true,
          isFinalState: false,
          requiresApproval: false,
          approverRole: 'Cualquier editor',
          approvalThresholdAmount: 0,
          requireNotesOnEntry: false,
          requireDocumentRefOnEntry: false,
          allowedNextStatuses: ['Autorizada por proveedor', 'Cancelada'],
        },
        {
          status: 'Autorizada por proveedor',
          enabled: true,
          isFinalState: false,
          requiresApproval: true,
          approverRole: 'Operaciones',
          approvalThresholdAmount: 0,
          requireNotesOnEntry: false,
          requireDocumentRefOnEntry: true,
          allowedNextStatuses: ['Enviada a proveedor', 'Cancelada'],
        },
        {
          status: 'Enviada a proveedor',
          enabled: true,
          isFinalState: false,
          requiresApproval: false,
          approverRole: 'Operaciones',
          approvalThresholdAmount: 0,
          requireNotesOnEntry: false,
          requireDocumentRefOnEntry: true,
          allowedNextStatuses: ['Acreditada / compensada', 'Cancelada'],
        },
        {
          status: 'Acreditada / compensada',
          enabled: true,
          isFinalState: true,
          requiresApproval: true,
          approverRole: 'Finanzas',
          approvalThresholdAmount: 0,
          requireNotesOnEntry: false,
          requireDocumentRefOnEntry: false,
          allowedNextStatuses: [],
        },
        {
          status: 'Cancelada',
          enabled: true,
          isFinalState: true,
          requiresApproval: true,
          approverRole: 'Administrador',
          approvalThresholdAmount: 0,
          requireNotesOnEntry: true,
          requireDocumentRefOnEntry: false,
          allowedNextStatuses: [],
        },
      ],
    }
  }
  if (preset === 'agile') {
    return {
      initialStatus: 'Borrador',
      preventDeleteAfterSettlement: false,
      updatedAtIso: nowIso,
      updatedBy: actorName,
      steps: [
        {
          status: 'Borrador',
          enabled: true,
          isFinalState: false,
          requiresApproval: false,
          approverRole: 'Cualquier editor',
          approvalThresholdAmount: 0,
          requireNotesOnEntry: false,
          requireDocumentRefOnEntry: false,
          allowedNextStatuses: ['Autorizada por proveedor', 'Enviada a proveedor', 'Cancelada'],
        },
        {
          status: 'Autorizada por proveedor',
          enabled: true,
          isFinalState: false,
          requiresApproval: false,
          approverRole: 'Cualquier editor',
          approvalThresholdAmount: 0,
          requireNotesOnEntry: false,
          requireDocumentRefOnEntry: false,
          allowedNextStatuses: ['Enviada a proveedor', 'Cancelada'],
        },
        {
          status: 'Enviada a proveedor',
          enabled: true,
          isFinalState: false,
          requiresApproval: false,
          approverRole: 'Operaciones',
          approvalThresholdAmount: 0,
          requireNotesOnEntry: false,
          requireDocumentRefOnEntry: false,
          allowedNextStatuses: ['Acreditada / compensada', 'Cancelada'],
        },
        {
          status: 'Acreditada / compensada',
          enabled: true,
          isFinalState: true,
          requiresApproval: true,
          approverRole: 'Finanzas',
          approvalThresholdAmount: 20000,
          requireNotesOnEntry: false,
          requireDocumentRefOnEntry: false,
          allowedNextStatuses: [],
        },
        {
          status: 'Cancelada',
          enabled: true,
          isFinalState: true,
          requiresApproval: false,
          approverRole: 'Cualquier editor',
          approvalThresholdAmount: 0,
          requireNotesOnEntry: false,
          requireDocumentRefOnEntry: false,
          allowedNextStatuses: [],
        },
      ],
    }
  }
  return {
    ...cloneReturnWorkflows(DEFAULT_RETURN_WORKFLOWS).supplier,
    updatedAtIso: nowIso,
    updatedBy: actorName,
  }
}

export function doesTransitionRequireApproval<TStatus extends string>(
  workflow: ReturnEntityWorkflowConfig<TStatus>,
  targetStatus: TStatus,
  totalAmount: number
): boolean {
  const stepRule = workflow.steps.find((s) => s.status === targetStatus)
  if (!stepRule || !stepRule.requiresApproval) return false
  if (stepRule.approvalThresholdAmount <= 0) return true
  return totalAmount >= stepRule.approvalThresholdAmount
}

export function canUserApproveWorkflowStep(
  approverRole: WorkflowApproverRole,
  userRoleIds: string[] = [],
  isFullAdmin = false,
  canEditSection = true
): boolean {
  if (!canEditSection) return false
  if (isFullAdmin) return true
  if (approverRole === 'Cualquier editor') return true
  const normalized = userRoleIds.map((r) => r.trim().toLowerCase())
  if (normalized.includes('administrador') || normalized.includes('admin')) return true
  if (approverRole === 'Administrador') return false
  if (approverRole === 'Finanzas') {
    return normalized.some((r) => r.includes('finanz') || r === 'fin')
  }
  if (approverRole === 'Operaciones') {
    return normalized.some((r) => r.includes('operac') || r === 'ops')
  }
  return false
}

export function getAllowedNextStatusesForReturn<TStatus extends string>(
  workflow: ReturnEntityWorkflowConfig<TStatus>,
  currentStatus: TStatus
): TStatus[] {
  const currentRule = workflow.steps.find((s) => s.status === currentStatus)
  if (!currentRule) return []
  return currentRule.allowedNextStatuses.filter((nextSt) => {
    const targetRule = workflow.steps.find((s) => s.status === nextSt)
    return Boolean(targetRule && targetRule.enabled)
  })
}

