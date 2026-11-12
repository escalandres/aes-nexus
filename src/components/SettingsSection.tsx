import { useState, useMemo } from 'react'
import {
  Settings2,
  Building2,
  Globe2,
  UserRoundPlus,
  ShieldCheck,
  LockKeyhole,
  Palette,
  Mail,
  ClipboardList,
  Plug,
  CreditCard,
  Check,
  CheckCircle2,
  Plus,
  Trash2,
  MapPin,
  Phone,
  ExternalLink,
  Moon,
  Sun,
  Laptop,
  X,
  Building,
  UserCheck,
} from 'lucide-react'
import { useToast } from './Toast'
import CountryDropdown from './CountryDropdown'
import type { Warehouse } from '../data/operations'

export interface GeneralSettings {
  workspaceName: string
  slug: string
  description: string
  mainCountry: string
  reportingCurrency: string
  primaryEmail: string
  phone: string
  website: string
  avatarColor: string
}

export interface OrganizationSettings {
  legalName: string
  tradeName: string
  rfc: string
  taxRegime: string
  fiscalStreet: string
  fiscalColony: string
  fiscalZip: string
  fiscalCity: string
  fiscalState: string
  fiscalCountry: string
  legalRep: string
  certificateStatus: 'valid' | 'expiring' | 'none'
  branches: Array<{
    id: string
    name: string
    type: string
    city: string
    address: string
    isMain: boolean
  }>
}

export interface RegionalSettings {
  language: string
  timezone: string
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
  numberFormat: 'comma_dot' | 'dot_comma'
  firstDayOfWeek: 'monday' | 'sunday'
}

export interface UserMember {
  id: string
  name: string
  email: string
  role: 'Administrador' | 'Operaciones' | 'Ventas' | 'Finanzas'
  status: 'active' | 'suspended'
  lastLogin: string
  avatarInitials: string
}

export interface SecuritySettings {
  twoFactorEnabled: boolean
  sessionTimeoutMinutes: number
  enforcePasswordExpiry: boolean
  recentSessions: Array<{
    id: string
    device: string
    browser: string
    ip: string
    location: string
    lastActive: string
    isCurrent: boolean
  }>
}

export interface SettingsSectionProps {
  activeSetting: string
  onSelectSetting: (setting: string) => void
  accentTheme: string
  onSelectAccentTheme: (themeId: string) => void
  darkMode: boolean
  onToggleDarkMode: () => void
  accentOptions: ReadonlyArray<{ id: string; label: string; color: string; description: string }>
  warehouses?: Warehouse[]
}

export function SettingsSection({
  activeSetting,
  onSelectSetting,
  accentTheme,
  onSelectAccentTheme,
  darkMode,
  onToggleDarkMode,
  accentOptions,
  warehouses = [],
}: SettingsSectionProps) {
  const toast = useToast()

  // 1. GENERAL SETTINGS
  const [general, setGeneral] = useState<GeneralSettings>(() => {
    try {
      const saved = localStorage.getItem('aes_nexus_settings_general')
      if (saved) return JSON.parse(saved)
    } catch {
      // fallback
    }
    return {
      workspaceName: 'Brújula Estudio',
      slug: 'brujula-estudio',
      description: 'Estudio de arquitectura, diseño industrial y tecnología aplicada para proyectos comerciales y corporativos.',
      mainCountry: 'México',
      reportingCurrency: 'MXN',
      primaryEmail: 'contacto@brujulaestudio.mx',
      phone: '+52 (55) 4162-8900',
      website: 'https://brujulaestudio.mx',
      avatarColor: '#456a61',
    }
  })

  // 2. ORGANIZATION SETTINGS
  const [org, setOrg] = useState<OrganizationSettings>(() => {
    try {
      const saved = localStorage.getItem('aes_nexus_settings_org')
      if (saved) return JSON.parse(saved)
    } catch {
      // fallback
    }
    return {
      legalName: 'Brújula Arquitectura & Tecnología S.A.P.I. de C.V.',
      tradeName: 'Brújula Estudio',
      rfc: 'BAT1904128N2',
      taxRegime: '601 - General de Ley Personas Morales',
      fiscalStreet: 'Av. Insurgentes Sur 1458, Piso 7',
      fiscalColony: 'Actipan, Benito Juárez',
      fiscalZip: '03230',
      fiscalCity: 'Ciudad de México',
      fiscalState: 'CDMX',
      fiscalCountry: 'México',
      legalRep: 'Andrea Morales Escala',
      certificateStatus: 'valid',
      branches: [
        {
          id: 'br_1',
          name: 'Sede Corporativa Insurgentes',
          type: 'Oficina corporativa',
          city: 'Ciudad de México',
          address: 'Av. Insurgentes Sur 1458, Piso 7',
          isMain: true,
        },
        {
          id: 'br_2',
          name: 'Almacén Logístico Central Vallejo',
          type: 'Centro de Distribución / Almacén',
          city: 'Ciudad de México',
          address: 'Calz. Vallejo 1020, Nave 4',
          isMain: false,
        },
        {
          id: 'br_3',
          name: 'Almacén Regional Norte Monterrey',
          type: 'Almacén / Punto Logístico',
          city: 'Monterrey, NL',
          address: 'Av. Gonzalitos 840, Col. Vista Hermosa',
          isMain: false,
        },
      ],
    }
  })

  // 3. REGIONAL SETTINGS
  const [regional, setRegional] = useState<RegionalSettings>(() => {
    try {
      const saved = localStorage.getItem('aes_nexus_settings_regional')
      if (saved) return JSON.parse(saved)
    } catch {
      // fallback
    }
    return {
      language: 'es-MX',
      timezone: 'America/Mexico_City',
      dateFormat: 'DD/MM/YYYY',
      numberFormat: 'comma_dot',
      firstDayOfWeek: 'monday',
    }
  })

  // 4. USERS & ACCESS
  const [users, setUsers] = useState<UserMember[]>(() => {
    try {
      const saved = localStorage.getItem('aes_nexus_settings_users')
      if (saved) return JSON.parse(saved)
    } catch {
      // fallback
    }
    return [
      {
        id: 'usr_1',
        name: 'Andrea Morales Escala',
        email: 'andrea.morales@brujulaestudio.mx',
        role: 'Administrador',
        status: 'active',
        lastLogin: 'Hace 5 minutos · Sesión actual',
        avatarInitials: 'AM',
      },
      {
        id: 'usr_2',
        name: 'Carlos Mendoza Ríos',
        email: 'carlos.mendoza@brujulaestudio.mx',
        role: 'Operaciones',
        status: 'active',
        lastLogin: 'Hoy, 08:15 hrs',
        avatarInitials: 'CM',
      },
      {
        id: 'usr_3',
        name: 'Sofía Valenzuela Treviño',
        email: 'sofia.valenzuela@brujulaestudio.mx',
        role: 'Ventas',
        status: 'active',
        lastLogin: 'Ayer, 18:40 hrs',
        avatarInitials: 'SV',
      },
      {
        id: 'usr_4',
        name: 'Roberto Garza Hinojosa',
        email: 'roberto.garza@brujulaestudio.mx',
        role: 'Finanzas',
        status: 'active',
        lastLogin: '10 nov 2026',
        avatarInitials: 'RG',
      },
    ]
  })

  // 5. SECURITY SETTINGS
  const [security, setSecurity] = useState<SecuritySettings>(() => {
    try {
      const saved = localStorage.getItem('aes_nexus_settings_security')
      if (saved) return JSON.parse(saved)
    } catch {
      // fallback
    }
    return {
      twoFactorEnabled: true,
      sessionTimeoutMinutes: 30,
      enforcePasswordExpiry: false,
      recentSessions: [
        {
          id: 'ses_1',
          device: 'MacBook Pro 16"',
          browser: 'Chrome 131 · MacOS Sonoma',
          ip: '189.204.112.44',
          location: 'Ciudad de México, México',
          lastActive: 'Activa ahora',
          isCurrent: true,
        },
        {
          id: 'ses_2',
          device: 'iPhone 15 Pro',
          browser: 'Safari Mobile 18 · iOS',
          ip: '187.188.42.12',
          location: 'Ciudad de México, México',
          lastActive: 'Hace 2 horas',
          isCurrent: false,
        },
      ],
    }
  })

  // 6. NOTIFICATION PREFERENCES (Linked with our push alerts state)
  const [notifPreferences, setNotifPreferences] = useState(() => {
    let pushEnabled = true
    let emailEnabled = true
    try {
      const savedPush = localStorage.getItem('nexus_stock_push_alerts_config')
      if (savedPush) pushEnabled = JSON.parse(savedPush).enabled !== false
      const savedEmail = localStorage.getItem('nexus_stock_email_alerts_config')
      if (savedEmail) emailEnabled = JSON.parse(savedEmail).enabled !== false
    } catch {
      // fallback
    }
    return {
      pushStockAlerts: pushEnabled,
      emailStockAlerts: emailEnabled,
      salesOrdersAlerts: true,
      receivablesAlerts: true,
      weeklySummaryEmail: true,
      audioChime: true,
    }
  })

  // Modal for inviting user
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'Administrador' | 'Operaciones' | 'Ventas' | 'Finanzas'>('Operaciones')

  // Modal for new branch
  const [showBranchModal, setShowBranchModal] = useState(false)
  const [branchName, setBranchName] = useState('')
  const [branchType, setBranchType] = useState('Almacén / Punto Logístico')
  const [branchCity, setBranchCity] = useState('Guadalajara, JAL')
  const [branchAddress, setBranchAddress] = useState('')

  // Live preview clock & formatted sample date/number
  const livePreviewValues = useMemo(() => {
    const sampleAmount = 1450200.5
    const sampleDate = new Date()

    const formattedCurrency = new Intl.NumberFormat(
      regional.numberFormat === 'dot_comma' ? 'es-ES' : 'es-MX',
      { style: 'currency', currency: 'MXN' }
    ).format(sampleAmount)

    let formattedDateStr = '12/11/2026'
    if (regional.dateFormat === 'MM/DD/YYYY') {
      formattedDateStr = '11/12/2026'
    } else if (regional.dateFormat === 'YYYY-MM-DD') {
      formattedDateStr = '2026-11-12'
    }

    return {
      currency: formattedCurrency,
      date: formattedDateStr,
      time: sampleDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    }
  }, [regional])

  // SAVE HANDLERS
  const handleSaveGeneral = () => {
    localStorage.setItem('aes_nexus_settings_general', JSON.stringify(general))
    toast.success('Los datos del espacio de trabajo han sido guardados correctamente.', 'Configuración General')
  }

  const handleSaveOrg = () => {
    localStorage.setItem('aes_nexus_settings_org', JSON.stringify(org))
    toast.success('La información fiscal y sedes de la organización han sido actualizadas.', 'Organización')
  }

  const handleSaveRegional = () => {
    localStorage.setItem('aes_nexus_settings_regional', JSON.stringify(regional))
    toast.success('Las preferencias de idioma, formato de fecha y moneda han sido guardadas.', 'Idioma y Región')
  }

  const handleSaveSecurity = () => {
    localStorage.setItem('aes_nexus_settings_security', JSON.stringify(security))
    toast.success('Las políticas de seguridad y autenticación han sido actualizadas.', 'Seguridad')
  }

  const handleSaveNotifications = () => {
    try {
      const savedPush = localStorage.getItem('nexus_stock_push_alerts_config')
      const parsedPush = savedPush ? JSON.parse(savedPush) : {}
      parsedPush.enabled = notifPreferences.pushStockAlerts
      localStorage.setItem('nexus_stock_push_alerts_config', JSON.stringify(parsedPush))

      const savedEmail = localStorage.getItem('nexus_stock_email_alerts_config')
      const parsedEmail = savedEmail ? JSON.parse(savedEmail) : {}
      parsedEmail.enabled = notifPreferences.emailStockAlerts
      localStorage.setItem('nexus_stock_email_alerts_config', JSON.stringify(parsedEmail))

      window.dispatchEvent(new CustomEvent('nexus_push_config_changed', { detail: { enabled: notifPreferences.pushStockAlerts } }))
    } catch {
      // fallback
    }
    toast.success('Las preferencias de notificaciones han sido sincronizadas.', 'Notificaciones')
  }

  // Invite user handler
  const handleInviteUserSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteName.trim() || !inviteEmail.trim()) {
      toast.warning('Ingresa el nombre y correo del colaborador.', 'Datos incompletos')
      return
    }
    const initials = inviteName
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase() || '')
      .join('') || 'US'

    const newUser: UserMember = {
      id: `usr_${Date.now()}`,
      name: inviteName.trim(),
      email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
      status: 'active',
      lastLogin: 'Invitación enviada · Pendiente',
      avatarInitials: initials,
    }

    const updated = [...users, newUser]
    setUsers(updated)
    localStorage.setItem('aes_nexus_settings_users', JSON.stringify(updated))
    setInviteName('')
    setInviteEmail('')
    setShowInviteModal(false)
    toast.success(`Se envió la invitación de acceso a ${newUser.email} con rol de ${newUser.role}.`, 'Usuario Invitado')
  }

  const handleToggleUserStatus = (userId: string) => {
    const updated = users.map((u) => {
      if (u.id === userId) {
        const nextStatus = u.status === 'active' ? ('suspended' as const) : ('active' as const)
        toast.info(`Usuario ${u.name} cambiado a estado ${nextStatus === 'active' ? 'Activo' : 'Suspendido'}.`, 'Estado de Usuario')
        return { ...u, status: nextStatus }
      }
      return u
    })
    setUsers(updated)
    localStorage.setItem('aes_nexus_settings_users', JSON.stringify(updated))
  }

  const handleAddBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!branchName.trim()) {
      toast.warning('Ingresa el nombre de la sede.', 'Faltan datos')
      return
    }
    const newBranch = {
      id: `br_${Date.now()}`,
      name: branchName.trim(),
      type: branchType,
      city: branchCity.trim(),
      address: branchAddress.trim() || 'Dirección pendiente de asignar',
      isMain: false,
    }
    const updated = { ...org, branches: [...org.branches, newBranch] }
    setOrg(updated)
    localStorage.setItem('aes_nexus_settings_org', JSON.stringify(updated))
    setShowBranchModal(false)
    setBranchName('')
    setBranchAddress('')
    toast.success(`Se añadió la sede «${newBranch.name}» a la estructura de la organización.`, 'Sede Agregada')
  }

  const settingsGroups = [
    {
      label: 'ESPACIO DE TRABAJO',
      items: [
        { name: 'General', icon: Settings2, badge: 'Principal' },
        { name: 'Organización', icon: Building2, badge: 'Fiscal' },
        { name: 'Idioma y región', icon: Globe2, badge: 'Localización' },
      ],
    },
    {
      label: 'PERSONAS Y ACCESO',
      items: [
        { name: 'Usuarios', icon: UserRoundPlus, count: users.length },
        { name: 'Roles y permisos', icon: ShieldCheck },
        { name: 'Seguridad', icon: LockKeyhole, badge: security.twoFactorEnabled ? '2FA Activo' : undefined },
      ],
    },
    {
      label: 'PREFERENCIAS',
      items: [
        { name: 'Apariencia', icon: Palette },
        { name: 'Notificaciones', icon: Mail, badge: notifPreferences.pushStockAlerts ? 'Push On' : undefined },
        { name: 'Auditoría', icon: ClipboardList },
      ],
    },
    {
      label: 'SERVICIOS',
      items: [
        { name: 'Integraciones', icon: Plug, badge: 'Conectores' },
        { name: 'Plan y facturación', icon: CreditCard },
      ],
    },
  ]

  return (
    <section className="settings-page" aria-labelledby="settings-title">
      {/* Heading */}
      <div className="settings-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" /> AES NEXUS · CONFIGURACIÓN Y GOBERNANZA
          </div>
          <h1 id="settings-title">Configuración del Sistema</h1>
          <p>
            Administra los datos generales de tu espacio, la estructura legal y fiscal de tu organización, la localización regional y los accesos de tu equipo.
          </p>
        </div>
        <div className="settings-badge-status">
          <span className="live-dot" />
          <span>Espacio Operativo · Brújula Estudio</span>
        </div>
      </div>

      <div className="settings-layout">
        {/* Navigation Sidebar */}
        <nav className="settings-nav" aria-label="Menú de configuración">
          {settingsGroups.map((group) => (
            <div className="settings-nav-group" key={group.label}>
              <p className="nav-label">{group.label}</p>
              {group.items.map(({ name, icon: Icon, badge, count }) => (
                <button
                  key={name}
                  className={`settings-nav-item ${activeSetting === name ? 'active' : ''}`}
                  aria-current={activeSetting === name ? 'page' : undefined}
                  onClick={() => onSelectSetting(name)}
                >
                  <Icon size={16} strokeWidth={1.8} />
                  <span>{name}</span>
                  {badge && <span className="settings-nav-badge">{badge}</span>}
                  {typeof count === 'number' && <span className="settings-nav-count">{count}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Dynamic Settings Content Panel */}
        <div className="settings-panel">
          {/* 1. GENERAL */}
          {activeSetting === 'General' && (
            <div className="settings-form-container">
              <div className="settings-panel-heading">
                <div>
                  <h2>Configuración General del Espacio</h2>
                  <p>Define la identidad visual, datos de contacto y parámetros principales que ven tus clientes y colaboradores.</p>
                </div>
                <button className="button button-primary" onClick={handleSaveGeneral}>
                  <Check size={14} /> Guardar cambios
                </button>
              </div>

              <div className="settings-card-group">
                {/* Identidad del espacio */}
                <div className="settings-section-card">
                  <div className="card-header-row">
                    <div>
                      <h3>Identidad del Espacio de Trabajo</h3>
                      <p>Nombre público y apariencia representativa en la cabecera del ERP.</p>
                    </div>
                    <div
                      className="workspace-avatar-preview"
                      style={{ backgroundColor: general.avatarColor }}
                      title="Color del avatar institucional"
                    >
                      {general.workspaceName.slice(0, 2).toUpperCase()}
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-field">
                      <label>Nombre del espacio de trabajo</label>
                      <input
                        type="text"
                        value={general.workspaceName}
                        onChange={(e) => setGeneral({ ...general, workspaceName: e.target.value })}
                        placeholder="ej. Brújula Estudio"
                      />
                      <small>Aparece en la barra superior, reportes y cotizaciones emitidas.</small>
                    </div>

                    <div className="form-field">
                      <label>Identificador web (Slug)</label>
                      <div className="input-prefix-wrap">
                        <span className="input-prefix">nexus.app/</span>
                        <input
                          type="text"
                          value={general.slug}
                          onChange={(e) => setGeneral({ ...general, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                        />
                      </div>
                      <small>Dirección amigable para accesos rápidos de tu equipo.</small>
                    </div>
                  </div>

                  <div className="form-field" style={{ marginTop: '12px' }}>
                    <label>Descripción y giro de la empresa</label>
                    <textarea
                      rows={2}
                      value={general.description}
                      onChange={(e) => setGeneral({ ...general, description: e.target.value })}
                      placeholder="Breve resumen de actividades del negocio..."
                    />
                  </div>
                </div>

                {/* Parámetros Operativos Base */}
                <div className="settings-section-card">
                  <div className="card-header-row">
                    <div>
                      <h3>Localización y Moneda Base</h3>
                      <p>Parámetros utilizados por defecto en transacciones comerciales y contables.</p>
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-field">
                      <CountryDropdown
                        value={general.mainCountry}
                        onChange={(code) => setGeneral({ ...general, mainCountry: code })}
                        id="settings-main-country"
                        label="País principal de operación"
                      />
                      <small>Define catálogos fiscales y normas contables aplicables.</small>
                    </div>

                    <div className="form-field">
                      <label>Moneda de reporte consolidado</label>
                      <select
                        value={general.reportingCurrency}
                        onChange={(e) => setGeneral({ ...general, reportingCurrency: e.target.value })}
                      >
                        <option value="MXN">MXN · Peso Mexicano ($)</option>
                        <option value="USD">USD · Dólar Estadounidense ($)</option>
                        <option value="EUR">EUR · Euro (€)</option>
                        <option value="COP">COP · Peso Colombiano ($)</option>
                      </select>
                      <small>Moneda en la que se unifican las métricas del Dashboard Ejecutivo.</small>
                    </div>
                  </div>
                </div>

                {/* Contacto Institucional */}
                <div className="settings-section-card">
                  <div className="card-header-row">
                    <div>
                      <h3>Datos de Contacto Institucional</h3>
                      <p>Información de soporte visible en órdenes de entrega y correos automáticos.</p>
                    </div>
                  </div>

                  <div className="form-grid-3">
                    <div className="form-field">
                      <label>Correo electrónico oficial</label>
                      <div className="input-icon-wrap">
                        <Mail size={13} className="field-icon" />
                        <input
                          type="email"
                          value={general.primaryEmail}
                          onChange={(e) => setGeneral({ ...general, primaryEmail: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-field">
                      <label>Teléfono corporativo</label>
                      <div className="input-icon-wrap">
                        <Phone size={13} className="field-icon" />
                        <input
                          type="text"
                          value={general.phone}
                          onChange={(e) => setGeneral({ ...general, phone: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-field">
                      <label>Sitio web</label>
                      <div className="input-icon-wrap">
                        <ExternalLink size={13} className="field-icon" />
                        <input
                          type="text"
                          value={general.website}
                          onChange={(e) => setGeneral({ ...general, website: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. ORGANIZACIÓN */}
          {activeSetting === 'Organización' && (
            <div className="settings-form-container">
              <div className="settings-panel-heading">
                <div>
                  <h2>Estructura Legal, Fiscal y Sedes</h2>
                  <p>Administra la razón social de la entidad, certificados digitales y sucursales operativas vinculadas con almacenes.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="button button-secondary" onClick={() => setShowBranchModal(true)}>
                    <Plus size={14} /> Nueva sede
                  </button>
                  <button className="button button-primary" onClick={handleSaveOrg}>
                    <Check size={14} /> Guardar organización
                  </button>
                </div>
              </div>

              <div className="settings-card-group">
                {/* Entidad Legal & RFC */}
                <div className="settings-section-card">
                  <div className="card-header-row">
                    <div>
                      <h3>Entidad Jurídica Principal</h3>
                      <p>Datos fiscales para timbrado de facturas, recepción de pagos y contratos.</p>
                    </div>
                    <span className="org-tax-badge">
                      <CheckCircle2 size={12} /> CSD SAT Vigente hasta 2028
                    </span>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-field">
                      <label>Razón Social (Denominación Legal)</label>
                      <input
                        type="text"
                        value={org.legalName}
                        onChange={(e) => setOrg({ ...org, legalName: e.target.value })}
                      />
                    </div>

                    <div className="form-field">
                      <label>RFC / Identificador Fiscal</label>
                      <input
                        type="text"
                        value={org.rfc}
                        onChange={(e) => setOrg({ ...org, rfc: e.target.value.toUpperCase() })}
                      />
                    </div>
                  </div>

                  <div className="form-grid-2" style={{ marginTop: '12px' }}>
                    <div className="form-field">
                      <label>Régimen Fiscal (SAT)</label>
                      <select
                        value={org.taxRegime}
                        onChange={(e) => setOrg({ ...org, taxRegime: e.target.value })}
                      >
                        <option value="601 - General de Ley Personas Morales">601 - General de Ley Personas Morales</option>
                        <option value="626 - Régimen Simplificado de Confianza (RESICO)">626 - Régimen Simplificado de Confianza (RESICO)</option>
                        <option value="603 - Personas Morales con Fines no Lucrativos">603 - Personas Morales con Fines no Lucrativos</option>
                      </select>
                    </div>

                    <div className="form-field">
                      <label>Representante Legal Apoderado</label>
                      <input
                        type="text"
                        value={org.legalRep}
                        onChange={(e) => setOrg({ ...org, legalRep: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Domicilio Fiscal */}
                <div className="settings-section-card">
                  <div className="card-header-row">
                    <div>
                      <h3>Domicilio Fiscal Oficial</h3>
                      <p>Dirección registrada ante la autoridad tributaria para comprobantes fiscales.</p>
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-field">
                      <label>Calle y Número</label>
                      <input
                        type="text"
                        value={org.fiscalStreet}
                        onChange={(e) => setOrg({ ...org, fiscalStreet: e.target.value })}
                      />
                    </div>

                    <div className="form-field">
                      <label>Colonia / Barrio</label>
                      <input
                        type="text"
                        value={org.fiscalColony}
                        onChange={(e) => setOrg({ ...org, fiscalColony: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-grid-3" style={{ marginTop: '12px' }}>
                    <div className="form-field">
                      <label>Código Postal</label>
                      <input
                        type="text"
                        value={org.fiscalZip}
                        onChange={(e) => setOrg({ ...org, fiscalZip: e.target.value })}
                      />
                    </div>

                    <div className="form-field">
                      <label>Ciudad / Municipio</label>
                      <input
                        type="text"
                        value={org.fiscalCity}
                        onChange={(e) => setOrg({ ...org, fiscalCity: e.target.value })}
                      />
                    </div>

                    <div className="form-field">
                      <label>Estado / Entidad</label>
                      <input
                        type="text"
                        value={org.fiscalState}
                        onChange={(e) => setOrg({ ...org, fiscalState: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Sedes y Sucursales Operativas */}
                <div className="settings-section-card">
                  <div className="card-header-row">
                    <div>
                      <h3>Sedes Físicas y Almacenes de la Organización</h3>
                      <p>Puntos de despacho, oficinas corporativas y bodegas con control de inventario.</p>
                    </div>
                  </div>

                  <div className="branches-list-wrap">
                    {org.branches.map((branch) => (
                      <div key={branch.id} className="branch-row-card">
                        <div className="branch-icon-box">
                          {branch.isMain ? <Building size={16} /> : <MapPin size={16} />}
                        </div>
                        <div className="branch-copy">
                          <div className="branch-title-row">
                            <strong>{branch.name}</strong>
                            {branch.isMain && <span className="branch-main-pill">Sede Principal</span>}
                            <span className="branch-type-pill">{branch.type}</span>
                          </div>
                          <span className="branch-address">{branch.address} · {branch.city}</span>
                        </div>
                        {!branch.isMain && (
                          <button
                            type="button"
                            className="icon-button icon-button-sm"
                            title="Eliminar sede"
                            onClick={() => {
                              const updated = { ...org, branches: org.branches.filter((b) => b.id !== branch.id) }
                              setOrg(updated)
                              localStorage.setItem('aes_nexus_settings_org', JSON.stringify(updated))
                              toast.info(`Se eliminó la sede ${branch.name}.`, 'Sede eliminada')
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. IDIOMA Y REGIÓN */}
          {activeSetting === 'Idioma y región' && (
            <div className="settings-form-container">
              <div className="settings-panel-heading">
                <div>
                  <h2>Idioma, Zona Horaria y Preferencias Regionales</h2>
                  <p>Configura la localización de formatos de fecha, divisas y nomenclatura para adaptar el ERP a tu contexto de negocio.</p>
                </div>
                <button className="button button-primary" onClick={handleSaveRegional}>
                  <Check size={14} /> Guardar preferencias
                </button>
              </div>

              <div className="settings-card-group">
                {/* Idioma & Zona Horaria */}
                <div className="settings-section-card">
                  <div className="card-header-row">
                    <div>
                      <h3>Localización de Idioma y Horario</h3>
                      <p>Afecta a la presentación de etiquetas, calendarios y marcas de tiempo.</p>
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-field">
                      <label>Idioma de la interfaz</label>
                      <select
                        value={regional.language}
                        onChange={(e) => setRegional({ ...regional, language: e.target.value })}
                      >
                        <option value="es-MX">Español (México) · Predeterminado</option>
                        <option value="es-ES">Español (España / Internacional)</option>
                        <option value="en-US">English (United States)</option>
                        <option value="pt-BR">Português (Brasil)</option>
                      </select>
                      <small>Traducción de módulos, descripciones y mensajes del sistema.</small>
                    </div>

                    <div className="form-field">
                      <label>Zona horaria corporativa</label>
                      <select
                        value={regional.timezone}
                        onChange={(e) => setRegional({ ...regional, timezone: e.target.value })}
                      >
                        <option value="America/Mexico_City">Ciudad de México, Guadalajara, MTY (UTC-06:00)</option>
                        <option value="America/Tijuana">Tijuana, Baja California (UTC-08:00)</option>
                        <option value="America/Bogota">Bogotá, Lima, Quito (UTC-05:00)</option>
                        <option value="Europe/Madrid">Madrid, Barcelona (UTC+01:00)</option>
                        <option value="America/New_York">New York, Miami (UTC-05:00)</option>
                      </select>
                      <small>Utilizada para calcular vencimientos y registrar auditorías de eventos.</small>
                    </div>
                  </div>
                </div>

                {/* Formatos de Fecha y Números */}
                <div className="settings-section-card">
                  <div className="card-header-row">
                    <div>
                      <h3>Formatos Numéricos y Calendario</h3>
                      <p>Selecciona cómo prefieres visualizar fechas de entrega, facturación y montos contables.</p>
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-field">
                      <label>Formato de visualización de fecha</label>
                      <div className="radio-options-grid">
                        <label className={`radio-card-option ${regional.dateFormat === 'DD/MM/YYYY' ? 'selected' : ''}`}>
                          <input
                            type="radio"
                            name="dateFormat"
                            checked={regional.dateFormat === 'DD/MM/YYYY'}
                            onChange={() => setRegional({ ...regional, dateFormat: 'DD/MM/YYYY' })}
                          />
                          <div className="radio-option-copy">
                            <strong>DD/MM/AAAA</strong>
                            <span>ej. 12/11/2026 (Estándar México y LatAm)</span>
                          </div>
                        </label>

                        <label className={`radio-card-option ${regional.dateFormat === 'YYYY-MM-DD' ? 'selected' : ''}`}>
                          <input
                            type="radio"
                            name="dateFormat"
                            checked={regional.dateFormat === 'YYYY-MM-DD'}
                            onChange={() => setRegional({ ...regional, dateFormat: 'YYYY-MM-DD' })}
                          />
                          <div className="radio-option-copy">
                            <strong>AAAA-MM-DD</strong>
                            <span>ej. 2026-11-12 (Estándar ISO 8601)</span>
                          </div>
                        </label>

                        <label className={`radio-card-option ${regional.dateFormat === 'MM/DD/YYYY' ? 'selected' : ''}`}>
                          <input
                            type="radio"
                            name="dateFormat"
                            checked={regional.dateFormat === 'MM/DD/YYYY'}
                            onChange={() => setRegional({ ...regional, dateFormat: 'MM/DD/YYYY' })}
                          />
                          <div className="radio-option-copy">
                            <strong>MM/DD/AAAA</strong>
                            <span>ej. 11/12/2026 (Formato EE. UU.)</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="form-field">
                      <label>Separadores numéricos y decimales</label>
                      <div className="radio-options-grid">
                        <label className={`radio-card-option ${regional.numberFormat === 'comma_dot' ? 'selected' : ''}`}>
                          <input
                            type="radio"
                            name="numFormat"
                            checked={regional.numberFormat === 'comma_dot'}
                            onChange={() => setRegional({ ...regional, numberFormat: 'comma_dot' })}
                          />
                          <div className="radio-option-copy">
                            <strong>1,234,567.89</strong>
                            <span>Comas para miles, punto para centavos</span>
                          </div>
                        </label>

                        <label className={`radio-card-option ${regional.numberFormat === 'dot_comma' ? 'selected' : ''}`}>
                          <input
                            type="radio"
                            name="numFormat"
                            checked={regional.numberFormat === 'dot_comma'}
                            onChange={() => setRegional({ ...regional, numberFormat: 'dot_comma' })}
                          />
                          <div className="radio-option-copy">
                            <strong>1.234.567,89</strong>
                            <span>Puntos para miles, coma para centavos</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="form-field" style={{ marginTop: '16px' }}>
                    <label>Primer día de la semana en calendarios</label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <label className="checkbox-row-inline">
                        <input
                          type="radio"
                          name="firstDay"
                          checked={regional.firstDayOfWeek === 'monday'}
                          onChange={() => setRegional({ ...regional, firstDayOfWeek: 'monday' })}
                        />
                        <span>Lunes (Semana laboral ISO)</span>
                      </label>
                      <label className="checkbox-row-inline">
                        <input
                          type="radio"
                          name="firstDay"
                          checked={regional.firstDayOfWeek === 'sunday'}
                          onChange={() => setRegional({ ...regional, firstDayOfWeek: 'sunday' })}
                        />
                        <span>Domingo</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Vista Previa en Vivo */}
                <div className="settings-preview-banner">
                  <div className="preview-banner-left">
                    <Globe2 size={20} className="preview-icon" />
                    <div>
                      <strong>Vista Previa de Localización en Tiempo Real</strong>
                      <p>Así es como se visualizan los registros contables y operacionales en todo el sistema:</p>
                    </div>
                  </div>
                  <div className="preview-metrics-chips">
                    <div className="preview-chip">
                      <span className="chip-label">Monto Ejemplo</span>
                      <strong className="chip-value">{livePreviewValues.currency}</strong>
                    </div>
                    <div className="preview-chip">
                      <span className="chip-label">Fecha Ejemplo</span>
                      <strong className="chip-value">{livePreviewValues.date}</strong>
                    </div>
                    <div className="preview-chip">
                      <span className="chip-label">Hora Sistema</span>
                      <strong className="chip-value">{livePreviewValues.time} hrs</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. APARIENCIA */}
          {activeSetting === 'Apariencia' && (
            <div className="appearance-card">
              <div className="appearance-card-heading">
                <div>
                  <h3>Color de Acento Institucional</h3>
                  <p>Elige el color que acompaña a la paleta neutra de AES Nexus en botones y selección.</p>
                </div>
                <span className="appearance-current">
                  <i style={{ backgroundColor: accentOptions.find((o) => o.id === accentTheme)?.color }} />
                  {accentOptions.find((o) => o.id === accentTheme)?.label}
                </span>
              </div>
              <div className="appearance-options" role="group" aria-label="Opciones de color de acento">
                {accentOptions.map((option) => (
                  <button
                    key={option.id}
                    className={`appearance-option ${accentTheme === option.id ? 'selected' : ''}`}
                    aria-pressed={accentTheme === option.id}
                    onClick={() => {
                      onSelectAccentTheme(option.id)
                      toast.info(`Color de acento actualizado a ${option.label}.`, 'Apariencia')
                    }}
                  >
                    <span className="appearance-swatch" style={{ backgroundColor: option.color }}>
                      {accentTheme === option.id && <Check size={17} />}
                    </span>
                    <span className="appearance-option-copy">
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </span>
                    {accentTheme === option.id && <span className="appearance-selected">Seleccionado</span>}
                  </button>
                ))}
              </div>
              <div className="appearance-mode-row">
                <div className="appearance-mode-copy">
                  <span className="appearance-mode-icon">{darkMode ? <Moon size={16} /> : <Sun size={16} />}</span>
                  <span>
                    <strong>Modo oscuro</strong>
                    <small>Reduce el brillo de la interfaz para entornos de baja luminosidad.</small>
                  </span>
                </div>
                <button
                  className={`theme-toggle ${darkMode ? 'on' : ''}`}
                  type="button"
                  role="switch"
                  aria-checked={darkMode}
                  aria-label="Activar modo oscuro"
                  onClick={onToggleDarkMode}
                >
                  <span />
                </button>
              </div>
              <div className="appearance-preview">
                <div className="appearance-preview-copy">
                  <span className="panel-kicker">VISTA PREVIA</span>
                  <strong>{darkMode ? 'Una paleta oscura para tu espacio' : 'Una paleta clara para tu espacio'}</strong>
                  <small>El color de acento aparece en botones primarios, badges y navegación activa.</small>
                </div>
                <button className="button button-primary" type="button">
                  Acción principal de prueba
                </button>
              </div>
            </div>
          )}

          {/* 5. USUARIOS */}
          {activeSetting === 'Usuarios' && (
            <div className="settings-form-container">
              <div className="settings-panel-heading">
                <div>
                  <h2>Directorio de Usuarios y Miembros</h2>
                  <p>Administra las cuentas de las personas con acceso a los módulos operativos y de gestión.</p>
                </div>
                <button className="button button-primary" onClick={() => setShowInviteModal(true)}>
                  <Plus size={14} /> Invitar colaborador
                </button>
              </div>

              <div className="settings-section-card">
                <div className="card-header-row">
                  <div>
                    <h3>Miembros del Espacio ({users.length})</h3>
                    <p>Usuarios autorizados con credenciales para acceder a AES Nexus.</p>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="settings-users-table">
                    <thead>
                      <tr>
                        <th>COLABORADOR</th>
                        <th>CORREO ELECTRÓNICO</th>
                        <th>ROL ASIGNADO</th>
                        <th>ESTADO</th>
                        <th>ÚLTIMO ACCESO</th>
                        <th style={{ textAlign: 'right' }}>ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td>
                            <div className="user-table-cell">
                              <span className="user-avatar-badge">{user.avatarInitials}</span>
                              <strong>{user.name}</strong>
                            </div>
                          </td>
                          <td>
                            <span className="user-email-text">{user.email}</span>
                          </td>
                          <td>
                            <span className={`user-role-badge role-${user.role.toLowerCase()}`}>
                              {user.role}
                            </span>
                          </td>
                          <td>
                            <span className={`user-status-pill status-${user.status}`}>
                              <span className="status-dot" />
                              {user.status === 'active' ? 'Activo' : 'Suspendido'}
                            </span>
                          </td>
                          <td>
                            <span className="user-last-login">{user.lastLogin}</span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="button button-ghost button-sm"
                              onClick={() => handleToggleUserStatus(user.id)}
                            >
                              {user.status === 'active' ? 'Suspender' : 'Reactivar'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 6. ROLES Y PERMISOS */}
          {activeSetting === 'Roles y permisos' && (
            <div className="settings-form-container">
              <div className="settings-panel-heading">
                <div>
                  <h2>Roles y Niveles de Permisos</h2>
                  <p>Define las facultades de visualización, edición y autorización por cada área de trabajo.</p>
                </div>
              </div>

              <div className="roles-grid">
                {[
                  {
                    name: 'Administrador General',
                    usersCount: users.filter((u) => u.role === 'Administrador').length,
                    desc: 'Control total de la configuración, usuarios, facturación, auditorías y módulos.',
                    capabilities: ['Configuración del sistema', 'Gestión de roles', 'Aprobación de compras', 'Visualización total'],
                  },
                  {
                    name: 'Gerencia de Operaciones',
                    usersCount: users.filter((u) => u.role === 'Operaciones').length,
                    desc: 'Gestión integral de almacenes, existencias mínimas, recepciones y transferencias.',
                    capabilities: ['Control de inventario', 'Ajuste de umbrales', 'Generar recepciones', 'Kardex de movimientos'],
                  },
                  {
                    name: 'Equipo Comercial & Ventas',
                    usersCount: users.filter((u) => u.role === 'Ventas').length,
                    desc: 'Administración del catálogo, cotizaciones, órdenes de venta y seguimiento en CRM.',
                    capabilities: ['Crear cotizaciones', 'Emitir pedidos', 'Gestión de clientes CRM', 'Reportes de pipeline'],
                  },
                  {
                    name: 'Finanzas & Contabilidad',
                    usersCount: users.filter((u) => u.role === 'Finanzas').length,
                    desc: 'Conciliación bancaria, cuentas por cobrar, pagos a proveedores y flujo de caja.',
                    capabilities: ['Gestión de cobros', 'Programación de pagos', 'Reportes de balance', 'Control de egresos'],
                  },
                ].map((role) => (
                  <div key={role.name} className="role-profile-card">
                    <div className="role-header">
                      <div>
                        <h3>{role.name}</h3>
                        <span className="role-users-tag">{role.usersCount} usuario(s) asignado(s)</span>
                      </div>
                      <ShieldCheck size={18} className="role-icon" />
                    </div>
                    <p className="role-desc">{role.desc}</p>
                    <div className="role-caps-list">
                      {role.capabilities.map((cap) => (
                        <span key={cap} className="role-cap-item">
                          <Check size={11} /> {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. SEGURIDAD */}
          {activeSetting === 'Seguridad' && (
            <div className="settings-form-container">
              <div className="settings-panel-heading">
                <div>
                  <h2>Seguridad y Políticas de Acceso</h2>
                  <p>Protege la cuenta de tu organización mediante autenticación de dos factores y control de sesiones.</p>
                </div>
                <button className="button button-primary" onClick={handleSaveSecurity}>
                  <Check size={14} /> Guardar seguridad
                </button>
              </div>

              <div className="settings-card-group">
                <div className="settings-section-card">
                  <div className="card-header-row">
                    <div>
                      <h3>Autenticación en Dos Factores (2FA)</h3>
                      <p>Solicita un código de verificación temporal mediante aplicación autenticadora (Google Authenticator / Authy).</p>
                    </div>
                    <label className="toggle-switch-wrap">
                      <input
                        type="checkbox"
                        checked={security.twoFactorEnabled}
                        onChange={(e) => setSecurity({ ...security, twoFactorEnabled: e.target.checked })}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                  <div className="security-status-tip">
                    <CheckCircle2 size={14} style={{ color: '#3c7d5c' }} />
                    <span>
                      {security.twoFactorEnabled
                        ? 'La política 2FA está activa para todos los usuarios administradores y gerentes de área.'
                        : 'El doble factor está deshabilitado. Se recomienda activarlo para resguardar la información contable.'}
                    </span>
                  </div>
                </div>

                <div className="settings-section-card">
                  <div className="card-header-row">
                    <div>
                      <h3>Tiempo de Inactividad de Sesión</h3>
                      <p>Cierra la sesión automáticamente si no se detecta actividad en el navegador.</p>
                    </div>
                  </div>
                  <div className="form-field" style={{ maxWidth: '320px' }}>
                    <select
                      value={security.sessionTimeoutMinutes}
                      onChange={(e) => setSecurity({ ...security, sessionTimeoutMinutes: parseInt(e.target.value) || 30 })}
                    >
                      <option value="15">15 minutos de inactividad</option>
                      <option value="30">30 minutos (Recomendado)</option>
                      <option value="60">1 hora de inactividad</option>
                      <option value="240">4 horas de inactividad</option>
                    </select>
                  </div>
                </div>

                <div className="settings-section-card">
                  <div className="card-header-row">
                    <div>
                      <h3>Sesiones Activas Recientes</h3>
                      <p>Equipos y navegadores que han iniciado sesión recientemente en tu cuenta.</p>
                    </div>
                    <button
                      type="button"
                      className="button button-secondary button-sm"
                      onClick={() => {
                        setSecurity({
                          ...security,
                          recentSessions: security.recentSessions.filter((s) => s.isCurrent),
                        })
                        toast.success('Se cerraron todas las demás sesiones remotas.', 'Sesiones revocadas')
                      }}
                    >
                      Cerrar otras sesiones
                    </button>
                  </div>

                  <div className="sessions-list">
                    {security.recentSessions.map((session) => (
                      <div key={session.id} className="session-item-row">
                        <div className="session-icon">
                          <Laptop size={16} />
                        </div>
                        <div className="session-info">
                          <div className="session-title-line">
                            <strong>{session.device}</strong>
                            {session.isCurrent && <span className="current-session-tag">Esta sesión</span>}
                          </div>
                          <span>{session.browser} · IP {session.ip} ({session.location})</span>
                        </div>
                        <span className="session-time">{session.lastActive}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 8. NOTIFICACIONES */}
          {activeSetting === 'Notificaciones' && (
            <div className="settings-form-container">
              <div className="settings-panel-heading">
                <div>
                  <h2>Preferencias de Notificaciones del Sistema</h2>
                  <p>Configura las alertas de stock crítico, avisos de ventas, facturas por cobrar y resúmenes semanales.</p>
                </div>
                <button className="button button-primary" onClick={handleSaveNotifications}>
                  <Check size={14} /> Guardar notificaciones
                </button>
              </div>

              <div className="settings-section-card">
                <div className="card-header-row">
                  <div>
                    <h3>Alertas de Inventario y Almacenes</h3>
                    <p>Sincronizadas con el sistema de umbrales mínimos y la alerta persistente superior.</p>
                  </div>
                </div>

                <div className="notif-toggle-row">
                  <div>
                    <strong>Notificaciones Push en Navegador</strong>
                    <p>Emite alertas emergentes de escritorio cuando un producto cae por debajo de su umbral mínimo.</p>
                  </div>
                  <label className="toggle-switch-wrap">
                    <input
                      type="checkbox"
                      checked={notifPreferences.pushStockAlerts}
                      onChange={(e) => setNotifPreferences({ ...notifPreferences, pushStockAlerts: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="notif-toggle-row">
                  <div>
                    <strong>Alertas por Correo Electrónico para Reorden</strong>
                    <p>Envía reportes con detalle de existencias a los destinatarios configurados en compras.</p>
                  </div>
                  <label className="toggle-switch-wrap">
                    <input
                      type="checkbox"
                      checked={notifPreferences.emailStockAlerts}
                      onChange={(e) => setNotifPreferences({ ...notifPreferences, emailStockAlerts: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="notif-toggle-row">
                  <div>
                    <strong>Tono audible Web Audio (Chime)</strong>
                    <p>Sintetiza un sonido de confirmación al recibir avisos prioritarios de almacén.</p>
                  </div>
                  <label className="toggle-switch-wrap">
                    <input
                      type="checkbox"
                      checked={notifPreferences.audioChime}
                      onChange={(e) => setNotifPreferences({ ...notifPreferences, audioChime: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              <div className="settings-section-card" style={{ marginTop: '14px' }}>
                <div className="card-header-row">
                  <div>
                    <h3>Alertas Comerciales y Financieras</h3>
                    <p>Avisos sobre órdenes aprobadas, cobranza y oportunidades ganadas.</p>
                  </div>
                </div>

                <div className="notif-toggle-row">
                  <div>
                    <strong>Avisos de Pedidos de Venta</strong>
                    <p>Notificar cuando una cotización sea confirmada como pedido de venta y pase a preparación.</p>
                  </div>
                  <label className="toggle-switch-wrap">
                    <input
                      type="checkbox"
                      checked={notifPreferences.salesOrdersAlerts}
                      onChange={(e) => setNotifPreferences({ ...notifPreferences, salesOrdersAlerts: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="notif-toggle-row">
                  <div>
                    <strong>Vencimiento de Facturas y Cobros</strong>
                    <p>Alerta previa 5 días antes del vencimiento de facturas comerciales con clientes.</p>
                  </div>
                  <label className="toggle-switch-wrap">
                    <input
                      type="checkbox"
                      checked={notifPreferences.receivablesAlerts}
                      onChange={(e) => setNotifPreferences({ ...notifPreferences, receivablesAlerts: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="notif-toggle-row">
                  <div>
                    <strong>Resumen Ejecutivo Semanal</strong>
                    <p>Envía cada lunes a las 08:00 hrs el reporte de ventas, flujo de caja e inventario crítico.</p>
                  </div>
                  <label className="toggle-switch-wrap">
                    <input
                      type="checkbox"
                      checked={notifPreferences.weeklySummaryEmail}
                      onChange={(e) => setNotifPreferences({ ...notifPreferences, weeklySummaryEmail: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 9. INTEGRACIONES & DEMÁS */}
          {(activeSetting === 'Integraciones' || activeSetting === 'Auditoría' || activeSetting === 'Plan y facturación') && (
            <div className="settings-form-container">
              <div className="settings-panel-heading">
                <div>
                  <h2>{activeSetting}</h2>
                  <p>
                    {activeSetting === 'Integraciones'
                      ? 'Conecta AES Nexus con proveedores autorizados de certificación (PAC CFDI 4.0), banca y pasarelas.'
                      : activeSetting === 'Auditoría'
                      ? 'Registro auditable de modificaciones de inventario, cotizaciones y accesos de usuario.'
                      : 'Información de tu suscripción Enterprise, consumo de almacenamiento y comprobantes emitidos.'}
                  </p>
                </div>
              </div>

              {activeSetting === 'Integraciones' && (
                <div className="integrations-grid">
                  {[
                    {
                      title: 'PAC Facturación CFDI 4.0 SAT',
                      category: 'Fiscal México',
                      status: 'Conectado',
                      desc: 'Timbrado fiscal automático de facturas, complementos de pago y notas de crédito.',
                    },
                    {
                      title: 'Conciliación Bancaria STP / SPEI',
                      category: 'Finanzas',
                      status: 'Activo',
                      desc: 'Identificación instantánea de transferencias interbancarias y aplicación a cuentas por cobrar.',
                    },
                    {
                      title: 'Google Workspace / Gmail',
                      category: 'Productividad',
                      status: 'Configurado',
                      desc: 'Despacho de cotizaciones y resúmenes de almacén mediante dominio corporativo.',
                    },
                    {
                      title: 'API REST & Webhooks de Inventario',
                      category: 'Desarrollo',
                      status: 'Disponible',
                      desc: 'Sincronización bidireccional con terminales de punto de venta y sistemas externos.',
                    },
                  ].map((integ) => (
                    <div key={integ.title} className="integration-card">
                      <div className="integration-header">
                        <div>
                          <strong>{integ.title}</strong>
                          <span className="integ-cat">{integ.category}</span>
                        </div>
                        <span className="integ-status-pill">{integ.status}</span>
                      </div>
                      <p>{integ.desc}</p>
                      <button
                        type="button"
                        className="button button-ghost button-sm"
                        onClick={() => toast.info(`Ajustes de integración para ${integ.title} en preparación.`, 'Integración')}
                      >
                        Configurar conector &rarr;
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {activeSetting === 'Auditoría' && (
                <div className="settings-section-card">
                  <div className="card-header-row">
                    <div>
                      <h3>Historial de Eventos del Espacio</h3>
                      <p>Trazabilidad completa con marcas de tiempo y usuario responsable.</p>
                    </div>
                  </div>
                  <div className="audit-timeline">
                    {[
                      { action: 'Actualización de umbral mínimo', user: 'Andrea Morales', detail: 'HW-SRV-RACK fijado a 3 unidades', time: 'Hoy, 10:14 hrs' },
                      { action: 'Notificaciones push activadas', user: 'Andrea Morales', detail: 'Habilitado sonido y alerta persistente', time: 'Hoy, 09:40 hrs' },
                      { action: 'Generación de Orden de Venta', user: 'Carlos Mendoza', detail: 'Folio ORD-2026-088 por $148,000 MXN', time: 'Ayer, 16:20 hrs' },
                      { action: 'Recepción de Mercancía en Vallejo', user: 'Carlos Mendoza', detail: 'Entrada de 15 Terminales POS IP65', time: '10 nov 2026' },
                    ].map((item, idx) => (
                      <div key={idx} className="audit-item">
                        <span className="audit-dot" />
                        <div className="audit-content">
                          <div className="audit-title-row">
                            <strong>{item.action}</strong>
                            <span className="audit-time">{item.time}</span>
                          </div>
                          <span className="audit-detail">{item.detail} · <em>{item.user}</em></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSetting === 'Plan y facturación' && (
                <div className="settings-section-card">
                  <div className="card-header-row">
                    <div>
                      <h3>Plan AES Nexus Enterprise</h3>
                      <p>Licenciamiento institucional para Brújula Estudio con soporte dedicado.</p>
                    </div>
                    <span className="plan-badge-enterprise">Enterprise Demo</span>
                  </div>

                  <div className="plan-stats-grid">
                    <div className="plan-stat-box">
                      <span className="stat-label">Usuarios Activos</span>
                      <strong>4 / Ilimitados</strong>
                      <span className="stat-sub">Licencias de colaborador</span>
                    </div>
                    <div className="plan-stat-box">
                      <span className="stat-label">Almacenes Conectados</span>
                      <strong>{warehouses.length > 0 ? warehouses.length : 2} Almacenes</strong>
                      <span className="stat-sub">Vallejo + Monterrey</span>
                    </div>
                    <div className="plan-stat-box">
                      <span className="stat-label">Timbrado Fiscal CFDI</span>
                      <strong>Ilimitado</strong>
                      <span className="stat-sub">Válido hasta dic 2028</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: INVITAR COLABORADOR */}
      {showInviteModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="invite-modal-title">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div>
                <h3 id="invite-modal-title">Invitar Nuevo Colaborador</h3>
                <p>El usuario recibirá un correo con el enlace de acceso al espacio de trabajo.</p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowInviteModal(false)}
                aria-label="Cerrar modal"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleInviteUserSubmit} className="modal-body">
              <div className="form-field">
                <label>Nombre y Apellidos</label>
                <input
                  type="text"
                  placeholder="ej. Mariana Torres"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  required
                />
              </div>

              <div className="form-field" style={{ marginTop: '12px' }}>
                <label>Correo Electrónico Corporativo</label>
                <input
                  type="email"
                  placeholder="mariana.torres@brujulaestudio.mx"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-field" style={{ marginTop: '12px' }}>
                <label>Rol de Permisos Asignado</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                >
                  <option value="Operaciones">Operaciones (Inventario, Almacén y Compras)</option>
                  <option value="Ventas">Ventas (Catálogo, Cotizaciones y CRM)</option>
                  <option value="Finanzas">Finanzas (Cobros, Pagos y Facturación)</option>
                  <option value="Administrador">Administrador (Control total del espacio)</option>
                </select>
              </div>

              <div className="modal-footer" style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setShowInviteModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="button button-primary">
                  <UserCheck size={14} /> Enviar invitación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AGREGAR SEDE */}
      {showBranchModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="branch-modal-title">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div>
                <h3 id="branch-modal-title">Nueva Sede u Oficina Operativa</h3>
                <p>Registra una sucursal o bodega física para el control de la organización.</p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowBranchModal(false)}
                aria-label="Cerrar modal"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddBranchSubmit} className="modal-body">
              <div className="form-field">
                <label>Nombre de la Sede</label>
                <input
                  type="text"
                  placeholder="ej. Bodega Occidente Guadalajara"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  required
                />
              </div>

              <div className="form-field" style={{ marginTop: '12px' }}>
                <label>Tipo de Sede</label>
                <select value={branchType} onChange={(e) => setBranchType(e.target.value)}>
                  <option value="Almacén / Punto Logístico">Almacén / Punto Logístico</option>
                  <option value="Oficina corporativa">Oficina corporativa</option>
                  <option value="Sucursal comercial">Sucursal comercial</option>
                  <option value="Taller de ensamble">Taller de ensamble</option>
                </select>
              </div>

              <div className="form-field" style={{ marginTop: '12px' }}>
                <label>Ciudad y Estado</label>
                <input
                  type="text"
                  placeholder="ej. Guadalajara, Jalisco"
                  value={branchCity}
                  onChange={(e) => setBranchCity(e.target.value)}
                  required
                />
              </div>

              <div className="form-field" style={{ marginTop: '12px' }}>
                <label>Dirección</label>
                <input
                  type="text"
                  placeholder="ej. Av. Vallarta 2450, Col. Arcos"
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                />
              </div>

              <div className="modal-footer" style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setShowBranchModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="button button-primary">
                  <Check size={14} /> Registrar sede
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
