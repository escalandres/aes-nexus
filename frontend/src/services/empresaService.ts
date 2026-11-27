import { apiRequest } from './apiClient'

export interface EmpresaApiRecord {
  id: string
  organizationId: string
  code: string
  legalName: string
  tradeName: string
  taxId: string
  country: string
  currency: string
  status: 'Activa' | 'Inactiva'
  isHeadquarters: boolean
  linkedDepartmentIds: string[]
  linkedLocationIds: string[]
  externalId: string | null
  externalSource: string | null
  externalSyncedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface EmpresaListResponse {
  data: EmpresaApiRecord[]
  meta: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface UpsertEmpresaPayload {
  code: string
  legalName: string
  tradeName: string
  taxId: string
  country: string
  currency?: string
  status?: 'Activa' | 'Inactiva'
  isHeadquarters?: boolean
  linkedDepartmentIds?: string[]
  linkedLocationIds?: string[]
  externalId?: string | null
  externalSource?: string | null
}

export async function listEmpresasApi(params?: {
  page?: number
  pageSize?: number
  search?: string
}): Promise<EmpresaListResponse> {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.pageSize) qs.set('pageSize', String(params.pageSize))
  if (params?.search) qs.set('search', params.search)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return apiRequest<EmpresaListResponse>(`/empresas${suffix}`, { method: 'GET' })
}

export async function createEmpresaApi(payload: UpsertEmpresaPayload): Promise<EmpresaApiRecord> {
  return apiRequest<EmpresaApiRecord>('/empresas', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateEmpresaApi(
  id: string,
  payload: Partial<UpsertEmpresaPayload>
): Promise<EmpresaApiRecord> {
  return apiRequest<EmpresaApiRecord>(`/empresas/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteEmpresaApi(id: string): Promise<void> {
  return apiRequest<void>(`/empresas/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
