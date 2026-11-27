import {
  CUSTOMER_RETURNS_STORAGE_KEY,
  SUPPLIER_RETURNS_STORAGE_KEY,
} from '../data/returns'

export const ERP_DATA_STORAGE_KEYS = {
  quotes: 'aes_nexus_data_quotes_v1',
  orders: 'aes_nexus_data_orders_v1',
  products: 'aes_nexus_data_products_v1',
  inventory: 'aes_nexus_data_inventory_v1',
  transfers: 'aes_nexus_data_transfers_v1',
  movements: 'aes_nexus_data_movements_v1',
  purchaseOrders: 'aes_nexus_data_purchase_orders_v1',
  requisitions: 'aes_nexus_data_requisitions_v1',
  shipments: 'aes_nexus_data_shipments_v1',
  bankAccounts: 'aes_nexus_data_bank_accounts_v1',
  receivables: 'aes_nexus_data_receivables_v1',
  payables: 'aes_nexus_data_payables_v1',
  expenses: 'aes_nexus_data_expenses_v1',
  expenseBudgets: 'aes_nexus_data_expense_budgets_v1',
  recurringExpenses: 'aes_nexus_data_recurring_expenses_v1',
  transactions: 'aes_nexus_data_transactions_v1',
  chartAccounts: 'aes_nexus_data_chart_accounts_v1',
  payrollRuns: 'aes_nexus_data_payroll_runs_v1',
  ebpBatches: 'aes_nexus_data_ebp_batches_v1',
  clients: 'aes_nexus_data_clients_v1',
  suppliers: 'aes_nexus_data_suppliers_v1',
  opportunities: 'aes_nexus_data_opportunities_v1',
  activities: 'aes_nexus_data_activities_v1',
} as const

export const ERP_LAST_SAVED_ISO_KEY = 'aes_nexus_data_last_saved_iso_v1'
export const ERP_PERSISTENCE_CHANGED_EVENT = 'aes_nexus_erp_persistence_changed'

export function loadPersistedArray<T>(key: string, fallback: T[]): T[] {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return fallback
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : fallback
  } catch {
    return fallback
  }
}

export function savePersistedJson<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    window.localStorage.setItem(ERP_LAST_SAVED_ISO_KEY, new Date().toISOString())
  } catch {
    // ignore storage quota errors gracefully
  }
}

export function clearTransactionalErpStorage(): void {
  if (typeof window === 'undefined') return
  try {
    Object.values(ERP_DATA_STORAGE_KEYS).forEach((storageKey) => {
      window.localStorage.removeItem(storageKey)
    })
    window.localStorage.removeItem(CUSTOMER_RETURNS_STORAGE_KEY)
    window.localStorage.removeItem(SUPPLIER_RETURNS_STORAGE_KEY)
    window.localStorage.setItem(ERP_LAST_SAVED_ISO_KEY, new Date().toISOString())
    window.dispatchEvent(new CustomEvent(ERP_PERSISTENCE_CHANGED_EVENT))
  } catch {
    // ignore storage errors
  }
}

const APP_STORAGE_PREFIXES = ['aes_nexus', 'aes-nexus', 'nexus_stock'] as const

export function clearAllErpWorkspaceStorage(): void {
  if (typeof window === 'undefined') return
  try {
    const keysToRemove: string[] = []
    for (let idx = 0; idx < window.localStorage.length; idx += 1) {
      const k = window.localStorage.key(idx)
      if (!k) continue
      if (APP_STORAGE_PREFIXES.some((prefix) => k.startsWith(prefix))) {
        keysToRemove.push(k)
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k))
    window.dispatchEvent(new CustomEvent(ERP_PERSISTENCE_CHANGED_EVENT))
  } catch {
    // ignore storage errors
  }
}

export interface ErpPersistenceSummary {
  transactionalDatasetsCount: number
  totalAppKeysCount: number
  estimatedSizeKb: number
  lastSavedIso: string | null
}

export function getErpPersistenceSummary(): ErpPersistenceSummary {
  if (typeof window === 'undefined') {
    return {
      transactionalDatasetsCount: 0,
      totalAppKeysCount: 0,
      estimatedSizeKb: 0,
      lastSavedIso: null,
    }
  }
  try {
    const transactionalKeys = new Set<string>([
      ...Object.values(ERP_DATA_STORAGE_KEYS),
      CUSTOMER_RETURNS_STORAGE_KEY,
      SUPPLIER_RETURNS_STORAGE_KEY,
    ])
    let transactionalDatasetsCount = 0
    let totalAppKeysCount = 0
    let totalChars = 0

    for (let idx = 0; idx < window.localStorage.length; idx += 1) {
      const key = window.localStorage.key(idx)
      if (!key) continue
      if (!APP_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) continue
      const val = window.localStorage.getItem(key) || ''
      totalAppKeysCount += 1
      totalChars += key.length + val.length
      if (transactionalKeys.has(key)) {
        transactionalDatasetsCount += 1
      }
    }

    const lastSavedIso = window.localStorage.getItem(ERP_LAST_SAVED_ISO_KEY)
    return {
      transactionalDatasetsCount,
      totalAppKeysCount,
      estimatedSizeKb: Math.round((totalChars * 2) / 1024),
      lastSavedIso,
    }
  } catch {
    return {
      transactionalDatasetsCount: 0,
      totalAppKeysCount: 0,
      estimatedSizeKb: 0,
      lastSavedIso: null,
    }
  }
}
