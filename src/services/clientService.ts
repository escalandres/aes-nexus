/**
 * Servicio de Clientes para AES Nexus (CRM/ERP).
 * 
 * Preparado para comunicarse con el backend REST/JSON (/api/v1/crm/customers).
 * Cuando el backend no está disponible o no responde, utiliza un mecanismo
 * de fallback local para no interrumpir la experiencia de usuario ni la sesión demo.
 */

export interface ClientAddress {
  id?: string
  street?: string
  colony?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
  isShipping?: boolean
  isBilling?: boolean
}

export interface ClientRecord {
  id: string
  clientCode?: string
  name: string
  company: string
  email: string
  phone: string
  status: 'Activo' | 'Prospecto' | 'Inactivo'
  lastActivity: string
  initials: string
  color: string
  rfc?: string
  entityType?: 'company' | 'individual'
  currency?: 'MXN' | 'USD'
  paymentTerms?: string
  address?: ClientAddress
  addresses?: ClientAddress[]
  notes?: string
  createdAt?: string
}

export interface CreateClientDTO {
  clientCode?: string
  name: string
  company: string
  email: string
  phone?: string
  rfc?: string
  entityType?: 'company' | 'individual'
  status?: 'Activo' | 'Prospecto' | 'Inactivo'
  currency?: 'MXN' | 'USD'
  paymentTerms?: string
  city?: string
  state?: string
  country?: string
  notes?: string
  addresses?: ClientAddress[]
}

export interface ClientApiResponse<T> {
  success: boolean
  data: T
  isMock: boolean
  message: string
  statusHttp?: number
}

// Configuración de endpoint base con fallback a variable de entorno de Vite
const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '/api/v1'

/**
 * Genera iniciales y color para la tarjeta visual del cliente
 */
export function generateClientAvatar(name: string, company: string): { initials: string; color: string } {
  const reference = (company || name || 'CL').trim()
  const parts = reference.split(/\s+/).filter(Boolean)
  const initials = parts.length >= 2 
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : reference.slice(0, 2).toUpperCase()

  const colors = ['lilac', 'peach', 'sage', 'blue', 'amber']
  const colorIndex = Math.abs(reference.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length
  return { initials, color: colors[colorIndex] }
}

/**
 * Envía la petición HTTP POST al backend para dar de alta a un cliente en el CRM.
 */
export async function createClientApi(dto: CreateClientDTO): Promise<ClientApiResponse<ClientRecord>> {
  const endpoint = `${API_BASE_URL}/crm/customers`
  const { initials, color } = generateClientAvatar(dto.name, dto.company)

  const payload = {
    ...dto,
    status: dto.status || 'Activo',
    currency: dto.currency || 'MXN',
    paymentTerms: dto.paymentTerms || 'Contado',
    entityType: dto.entityType || 'company',
  }

  // Objeto local formateado para actualizar estado inmediato en UI
  const localClient: ClientRecord = {
    id: `cli_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    clientCode: dto.clientCode?.trim() || undefined,
    name: dto.name.trim(),
    company: (dto.company.trim()) || dto.name.trim(),
    email: dto.email.trim(),
    phone: dto.phone?.trim() || 'Sin teléfono',
    status: dto.status || 'Activo',
    lastActivity: 'Ahora',
    initials,
    color,
    rfc: dto.rfc?.trim().toUpperCase(),
    entityType: dto.entityType || 'company',
    currency: dto.currency || 'MXN',
    paymentTerms: dto.paymentTerms || 'Contado',
    address: dto.addresses && dto.addresses.length > 0
      ? dto.addresses[0]
      : {
          city: dto.city?.trim(),
          state: dto.state?.trim(),
          country: dto.country?.trim() || 'México',
        },
    addresses: dto.addresses || [],
    notes: dto.notes?.trim(),
    createdAt: new Date().toISOString(),
  }

  try {
    console.info(`[AES Nexus API] Enviando POST a ${endpoint}...`, payload)
    
    // Controlador de timeout a 4 segundos para evitar que la interfaz se congele si la red no responde
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // Encabezados listos para arquitectura H1 (multi-tenancy y sesión)
        'X-Organization-Id': 'org_brujula_default',
        'X-Client-App': 'aes-nexus-frontend',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      const json = await response.json()
      console.info('[AES Nexus API] Cliente creado con éxito en backend:', json)
      return {
        success: true,
        data: json.data || json || localClient,
        isMock: false,
        message: 'Cliente creado y sincronizado con el backend exitosamente.',
        statusHttp: response.status,
      }
    } else {
      console.warn(`[AES Nexus API] El backend respondió con código ${response.status}. Usando fallback local.`)
      return {
        success: true,
        data: localClient,
        isMock: true,
        message: `Petición HTTP enviada (HTTP ${response.status}). Registrado localmente en esta sesión.`,
        statusHttp: response.status,
      }
    }
  } catch (error) {
    // Si no hay backend levantado (Connection Refused / Failed to fetch / Abort)
    console.info(
      `[AES Nexus API] Backend en ${endpoint} no disponible aún (${(error as Error).message}). Guardando en sesión demo de forma transparente.`,
      payload
    )
    return {
      success: true,
      data: localClient,
      isMock: true,
      message: `Petición HTTP a "${endpoint}" preparada. Registrado en la sesión demo.`,
    }
  }
}

/**
 * Obtiene la lista de clientes desde el backend o fallback local.
 */
export async function getClientsApi(): Promise<ClientApiResponse<ClientRecord[]>> {
  const endpoint = `${API_BASE_URL}/crm/customers`

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Organization-Id': 'org_brujula_default',
      },
    })

    if (response.ok) {
      const json = await response.json()
      return {
        success: true,
        data: json.data || json,
        isMock: false,
        message: 'Clientes cargados del servidor.',
      }
    }
  } catch (error) {
    console.info(`[AES Nexus API] No se pudo conectar a ${endpoint}. Se mantienen los datos locales demo.`)
  }

  return {
    success: true,
    data: [],
    isMock: true,
    message: 'Operando en modo local/demo.',
  }
}
