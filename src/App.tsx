import { useEffect, useState, type FormEvent } from 'react'
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, Bell, BriefcaseBusiness,
  CalendarDays, ChartNoAxesCombined, ChevronDown, CircleHelp, Clock3,
  Command, FolderKanban, LayoutDashboard, Menu,
  MoreHorizontal, Plus, Search, Settings2, ShoppingBag, Sparkles,
  Target, Users, WalletCards, Warehouse, ShieldCheck, X, Building2,
  UserRoundPlus, LockKeyhole, Plug, CreditCard, Mail,
  ClipboardList, Globe2, Palette, Check, Moon, Sun,
} from 'lucide-react'
import { activities, opportunities, revenueBars } from './data/dashboard'

const sections: { label: string; items: { name: string; icon: typeof LayoutDashboard; count?: string }[] }[] = [
  { label: 'ESPACIO DE TRABAJO', items: [{ name: 'Inicio', icon: LayoutDashboard }] },
  { label: 'MÓDULOS', items: [
    { name: 'CRM', icon: Users, count: 'H2' },
    { name: 'Ventas', icon: ShoppingBag, count: 'H2' },
    { name: 'Operaciones', icon: Warehouse, count: 'H3' },
    { name: 'Finanzas', icon: WalletCards, count: 'H3' },
    { name: 'Administración', icon: ShieldCheck, count: 'H1' },
  ] },
]

const moduleDetails = {
  CRM: { icon: Users, phase: 'H2 · Piloto comercial', description: 'Centraliza las relaciones y el seguimiento comercial de tu organización.', areas: ['Empresas y contactos', 'Oportunidades y pipeline', 'Actividades y seguimiento'] },
  Ventas: { icon: ShoppingBag, phase: 'H2 · Piloto comercial', description: 'Acompaña el proceso desde una cotización hasta la confirmación del pedido.', areas: ['Catálogo de productos y servicios', 'Cotizaciones y aprobaciones', 'Pedidos de venta'] },
  Operaciones: { icon: Warehouse, phase: 'H3 · MVP operativo', description: 'Organiza el movimiento de productos desde compras y recepción hasta la entrega.', areas: ['Inventario por almacén', 'Compras y recepciones', 'Entregas y devoluciones'] },
  Finanzas: { icon: WalletCards, phase: 'H3 · MVP operativo', description: 'Da seguimiento a saldos, cobros, pagos y gastos con finanzas operativas.', areas: ['Cuentas por cobrar y cobros', 'Cuentas por pagar', 'Gastos y reportes'] },
  Administración: { icon: ShieldCheck, phase: 'H1 · Núcleo del sistema', description: 'Configura la organización, el acceso de las personas y los controles de operación.', areas: ['Organización y entidad legal', 'Usuarios, membresías y roles', 'Auditoría y configuración'] },
} as const

type DirectoryRecord = { name: string; company: string; email: string; phone: string; status: string; lastActivity: string; initials: string; color: string }

const clients: DirectoryRecord[] = [
  { name: 'Sofía Ramírez', company: 'Estudio Nómada', email: 'sofia@estudionomada.mx', phone: '55 2184 6301', status: 'Activo', lastActivity: 'Hoy', initials: 'SR', color: 'lilac' },
  { name: 'Diego Fernández', company: 'Taller Norte', email: 'diego@tallernorte.mx', phone: '81 3045 1120', status: 'Activo', lastActivity: 'Ayer', initials: 'DF', color: 'peach' },
  { name: 'Valentina Ruiz', company: 'Casa Oliva', email: 'valentina@casaoliva.mx', phone: '33 1470 9822', status: 'Prospecto', lastActivity: 'Ayer', initials: 'VR', color: 'sage' },
  { name: 'Mateo Cruz', company: 'Lumen Studio', email: 'mateo@lumenstudio.mx', phone: '55 7740 2108', status: 'Activo', lastActivity: '12 nov', initials: 'MC', color: 'blue' },
  { name: 'Camila Torres', company: 'Punto Cero', email: 'camila@puntocero.mx', phone: '55 4402 7718', status: 'Inactivo', lastActivity: '28 oct', initials: 'CT', color: 'amber' },
]

const suppliers: DirectoryRecord[] = [
  { name: 'Distribuidora Atlas', company: 'Atlas Comercial', email: 'contacto@atlascomercial.mx', phone: '55 3055 4820', status: 'Activo', lastActivity: 'Hoy', initials: 'DA', color: 'blue' },
  { name: 'Papelería Central', company: 'Central de Insumos', email: 'ventas@centralinsumos.mx', phone: '81 2104 6651', status: 'Activo', lastActivity: '3 nov', initials: 'PC', color: 'sage' },
  { name: 'Logística del Valle', company: 'Logística del Valle', email: 'operaciones@logisticavalle.mx', phone: '33 3810 9920', status: 'Prospecto', lastActivity: '30 oct', initials: 'LV', color: 'lilac' },
  { name: 'Servicios Nube', company: 'Nube Digital', email: 'soporte@nubedigital.mx', phone: '55 7284 1176', status: 'Activo', lastActivity: '25 oct', initials: 'SN', color: 'peach' },
]

const accentOptions = [
  { id: 'green', label: 'Verde', color: '#456a61', description: 'Natural y equilibrado' },
  { id: 'blue', label: 'Azul', color: '#3f6f9f', description: 'Claro y profesional' },
  { id: 'purple', label: 'Morado', color: '#7860a6', description: 'Creativo y distintivo' },
  { id: 'terracotta', label: 'Terracota', color: '#b96e56', description: 'Cálido y cercano' },
] as const
type AccentTheme = typeof accentOptions[number]['id']
type CreateKind = 'supplier' | 'opportunity' | 'activity'

const settingsGroups = [
  { label: 'ESPACIO DE TRABAJO', items: [{ name: 'General', icon: Settings2 }, { name: 'Organización', icon: Building2 }, { name: 'Idioma y región', icon: Globe2 }] },
  { label: 'PERSONAS Y ACCESO', items: [{ name: 'Usuarios', icon: UserRoundPlus }, { name: 'Roles y permisos', icon: ShieldCheck }, { name: 'Seguridad', icon: LockKeyhole }] },
  { label: 'PREFERENCIAS', items: [{ name: 'Apariencia', icon: Palette }, { name: 'Notificaciones', icon: Mail }, { name: 'Auditoría', icon: ClipboardList }] },
  { label: 'SERVICIOS', items: [{ name: 'Integraciones', icon: Plug }, { name: 'Plan y facturación', icon: CreditCard }] },
]

const settingsDetails: Record<string, { description: string; rows: { label: string; description: string; value: string }[] }> = {
  General: { description: 'Administra los datos principales y las preferencias de tu espacio de trabajo.', rows: [
    { label: 'Nombre del espacio', description: 'Así lo identifican las personas de tu organización.', value: 'Brújula Estudio' },
    { label: 'País principal', description: 'Define el contexto inicial de operación.', value: 'México' },
    { label: 'Moneda de reporte', description: 'Moneda usada para presentar los reportes de la organización.', value: 'MXN · Peso mexicano' },
  ] },
  Organización: { description: 'Consulta la estructura legal y operativa de tu organización.', rows: [
    { label: 'Entidad legal', description: 'El MVP contempla una entidad por organización.', value: '1 entidad · Modelo ampliable' },
    { label: 'Identificador fiscal', description: 'Se configurará cuando se habilite el módulo fiscal.', value: 'Sin configurar' },
  ] },
  'Idioma y región': { description: 'Configura el idioma y las preferencias regionales de la interfaz.', rows: [
    { label: 'Idioma de la interfaz', description: 'Idioma predeterminado para este espacio.', value: 'Español (México)' },
    { label: 'Zona horaria', description: 'Usada para mostrar fechas y actividades.', value: 'Ciudad de México · UTC−06:00' },
    { label: 'Formato de fecha', description: 'Preferencia de visualización regional.', value: 'DD/MM/AAAA' },
  ] },
  Apariencia: { description: 'Personaliza el color de acento de AES Nexus. El fondo blanco se mantiene para conservar la claridad de lectura.', rows: [] },
  Usuarios: { description: 'Administra quién puede acceder al espacio de trabajo.', rows: [
    { label: 'Personas activas', description: 'Miembros con acceso al espacio.', value: '1 usuario · Andrea Morales' },
    { label: 'Invitaciones pendientes', description: 'Invitaciones que aún no se aceptan.', value: 'Ninguna' },
  ] },
  'Roles y permisos': { description: 'Controla el acceso a módulos y acciones según las responsabilidades.', rows: [
    { label: 'Administradora', description: 'Acceso completo a la configuración del espacio.', value: '1 persona' },
    { label: 'Roles personalizados', description: 'Disponibles al completar la base de identidad y permisos.', value: 'Próxima fase' },
  ] },
  Seguridad: { description: 'Revisa los controles de acceso y protección de la cuenta.', rows: [
    { label: 'Autenticación multifactor', description: 'La política MFA se definirá antes del inicio de H1.', value: 'Pendiente de configuración' },
    { label: 'Sesiones activas', description: 'Consulta y revoca sesiones de la organización.', value: 'Disponible al habilitar identidad' },
  ] },
  Notificaciones: { description: 'Elige qué novedades del sistema quieres recibir.', rows: [
    { label: 'Actividad comercial', description: 'Avisos sobre seguimientos y cambios de oportunidades.', value: 'Preferencias disponibles próximamente' },
    { label: 'Actualizaciones del sistema', description: 'Avisos de mantenimiento y nuevas funciones.', value: 'Preferencias disponibles próximamente' },
  ] },
  Auditoría: { description: 'Consulta el historial de cambios relevantes de tu organización.', rows: [
    { label: 'Registro de actividad', description: 'El registro auditable forma parte del núcleo H1.', value: 'En preparación' },
    { label: 'Retención de eventos', description: 'La política se definirá antes de almacenar actividad real.', value: 'Pendiente' },
  ] },
  Integraciones: { description: 'Conecta AES Nexus con las herramientas que ya usa tu equipo.', rows: [
    { label: 'Proveedores fiscales', description: 'La evaluación de PAC para México continúa en Fase 0.', value: 'Sin conexión' },
    { label: 'API y webhooks', description: 'Se definirán después de establecer los contratos de API.', value: 'Próxima fase' },
  ] },
  'Plan y facturación': { description: 'Consulta el plan de tu espacio y las opciones de suscripción.', rows: [
    { label: 'Plan actual', description: 'Este espacio es una demostración del producto.', value: 'Demo · Sin costo' },
    { label: 'Suscripción', description: 'La gestión comercial de planes pertenece a H4.', value: 'No configurada' },
  ] },
}

const money = (value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value)

const pageRoutes: Record<string, string> = {
  Inicio: '/',
  CRM: '/crm',
  Ventas: '/ventas',
  Operaciones: '/operaciones',
  Finanzas: '/finanzas',
  Administración: '/administracion',
  Configuración: '/settings',
}

const pageFromPath = (pathname: string) => pathname.startsWith('/crm') ? 'CRM' : Object.entries(pageRoutes).find(([, route]) => route === pathname.replace(/\/$/, '') || (pathname === '/' && route === '/'))?.[0] ?? 'Inicio'
const crmSectionFromPath = (pathname: string) => pathname === '/crm/clientes' ? 'Clientes' : pathname === '/crm/proveedores' ? 'Proveedores' : pathname === '/crm/oportunidades' ? 'Oportunidades' : pathname === '/crm/actividades' ? 'Actividades' : 'Resumen'

function App() {
  const [activePage, setActivePage] = useState(() => pageFromPath(window.location.pathname))
  const [crmSection, setCrmSection] = useState(() => crmSectionFromPath(window.location.pathname))
  const [clientQuery, setClientQuery] = useState('')
  const [clientStatus, setClientStatus] = useState('Todos')
  const [supplierRecords, setSupplierRecords] = useState(suppliers)
  const [opportunityRecords, setOpportunityRecords] = useState(opportunities)
  const [activityRecords, setActivityRecords] = useState(activities)
  const [createKind, setCreateKind] = useState<CreateKind | null>(null)
  const [createForm, setCreateForm] = useState({ name: '', company: '', email: '', phone: '', title: '', time: '10:00', value: '' })
  const [activeSetting, setActiveSetting] = useState('General')
  const [accentTheme, setAccentTheme] = useState<AccentTheme>(() => {
    const savedTheme = window.localStorage.getItem('aes-nexus-accent')
    return accentOptions.some((option) => option.id === savedTheme) ? savedTheme as AccentTheme : 'green'
  })
  const [darkMode, setDarkMode] = useState(() => window.localStorage.getItem('aes-nexus-dark-mode') === 'true')

  const navigateTo = (page: string) => {
    setActivePage(page)
    const route = pageRoutes[page] ?? '/'
    if (window.location.pathname !== route) window.history.pushState({}, '', route)
  }

  const navigateToCrmSection = (section: string) => {
    setActivePage('CRM')
    setCrmSection(section)
    const route = section === 'Clientes' ? '/crm/clientes' : section === 'Proveedores' ? '/crm/proveedores' : section === 'Oportunidades' ? '/crm/oportunidades' : section === 'Actividades' ? '/crm/actividades' : '/crm'
    if (window.location.pathname !== route) window.history.pushState({}, '', route)
  }

  const openCreate = (kind: CreateKind) => {
    setCreateKind(kind)
    setCreateForm({ name: '', company: '', email: '', phone: '', title: '', time: '10:00', value: '' })
  }

  const closeCreate = () => setCreateKind(null)

  const submitCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (createKind === 'supplier') {
      const name = createForm.name.trim()
      const company = createForm.company.trim() || name
      setSupplierRecords((records) => [...records, { name, company, email: createForm.email.trim(), phone: createForm.phone.trim(), status: 'Activo', lastActivity: 'Ahora', initials: name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase(), color: 'blue' }])
      setNotice(`Proveedor “${name}” creado en esta sesión.`)
      setCrmSection('Proveedores')
    }
    if (createKind === 'opportunity') {
      const company = createForm.company.trim()
      const value = Number(createForm.value) || 0
      setOpportunityRecords((records) => [...records, { company, person: createForm.name.trim() || 'Sin contacto', initials: company.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase(), color: 'blue', value, stage: 'Calificada', stageTone: 'green', date: 'Ahora' }])
      setNotice(`Oportunidad de “${company}” creada en esta sesión.`)
      setCrmSection('Oportunidades')
    }
    if (createKind === 'activity') {
      const title = createForm.title.trim()
      setActivityRecords((records) => [...records, { title, company: createForm.company.trim() || 'Sin empresa', time: createForm.time, icon: 'check', tone: 'green' }])
      setNotice(`Actividad “${title}” creada en esta sesión.`)
      setCrmSection('Actividades')
    }
    closeCreate()
  }

  useEffect(() => {
    const handlePopState = () => {
      setActivePage(pageFromPath(window.location.pathname))
      setCrmSection(crmSectionFromPath(window.location.pathname))
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])
  const [menuOpen, setMenuOpen] = useState(false)
  const [period, setPeriod] = useState('Este mes')
  const [notice, setNotice] = useState('')

  const handleCreate = () => setNotice('El formulario de creación estará disponible al conectar el módulo comercial.')
  const directoryRecords = crmSection === 'Proveedores' ? supplierRecords : clients
  const filteredDirectory = directoryRecords.filter((client) => {
    const query = clientQuery.trim().toLowerCase()
    const matchesQuery = !query || `${client.name} ${client.company} ${client.email}`.toLowerCase().includes(query)
    const matchesStatus = clientStatus === 'Todos' || client.status === clientStatus
    return matchesQuery && matchesStatus
  })

  return (
    <div className="app-frame" data-accent={accentTheme} data-theme={darkMode ? 'dark' : 'light'}>
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><span>A</span><i /></div>
          <span className="brand-name">AES <span>Nexus</span></span>
          <button className="icon-button sidebar-close" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)}><X size={18} /></button>
        </div>

        <button className="workspace-switch">
          <span className="workspace-avatar">B</span>
          <span className="workspace-copy"><strong>Brújula Estudio</strong><small>Plan inicial</small></span>
          <ChevronDown size={15} />
        </button>

        <label className="search-box"><Search size={15} /><input aria-label="Buscar" placeholder="Buscar en AES Nexus" /><kbd>⌘ K</kbd></label>

        <nav className="side-nav" aria-label="Navegación principal">
          {sections.map((section) => (
            <div className="nav-section" key={section.label}>
              <p className="nav-label">{section.label}</p>
              {section.items.map(({ name, icon: Icon, count }) => (
                  <button key={name} className={`nav-item ${activePage === name ? 'active' : ''}`} aria-current={activePage === name ? 'page' : undefined} onClick={() => { navigateTo(name); if (name === 'CRM') setCrmSection('Resumen'); setNotice(''); setMenuOpen(false) }}>
                  <Icon size={17} strokeWidth={1.8} /><span>{name}</span>{count && <em>{count}</em>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-spacer" />
        <div className="progress-card">
          <div className="progress-heading"><Sparkles size={15} /><span>Tu espacio está listo</span></div>
          <p>Ya diste el primer paso para organizar tu negocio.</p>
          <div className="progress-track"><span /></div>
          <small>2 de 5 pasos completados</small>
        </div>
        <button className="nav-item quiet"><CircleHelp size={17} /><span>Centro de ayuda</span></button>
        <button className={`nav-item quiet ${activePage === 'Configuración' ? 'active' : ''}`} aria-current={activePage === 'Configuración' ? 'page' : undefined} onClick={() => { navigateTo('Configuración'); setActiveSetting('General'); setNotice(''); setMenuOpen(false) }}><Settings2 size={17} /><span>Configuración</span></button>
        <div className="profile-row"><div className="profile-avatar">AM</div><div className="profile-copy"><strong>Andrea Morales</strong><small>Administradora</small></div><MoreHorizontal size={18} /></div>
      </aside>

      {menuOpen && <button className="mobile-scrim" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />}

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Abrir menú" onClick={() => setMenuOpen(true)}><Menu size={19} /></button>
          <div className="breadcrumbs"><span>AES Nexus</span><span className="crumb-slash">/</span><strong>{activePage}</strong></div>
          <div className="topbar-actions"><span className="demo-pill"><i /> DEMO</span><button className="icon-button notification-button" aria-label="Notificaciones"><Bell size={18} /><i /></button><div className="top-avatar">AM</div></div>
        </header>

        <div className="page-content">
          {activePage === 'Configuración' ? (
            <section className="settings-page" aria-labelledby="settings-title">
              <div className="settings-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> AES NEXUS · ESPACIO DE TRABAJO</div><h1 id="settings-title">Configuración</h1><p>Administra las preferencias y el acceso de tu organización desde un solo lugar.</p></div><span className="settings-demo-label">Datos de demostración</span></div>
              {notice && <div className="notice" role="status">{notice}<button aria-label="Cerrar aviso" onClick={() => setNotice('')}><X size={15} /></button></div>}
              <div className="settings-layout">
                <nav className="settings-nav" aria-label="Menú de configuración">
                  {settingsGroups.map((group) => <div className="settings-nav-group" key={group.label}><p className="nav-label">{group.label}</p>{group.items.map(({ name, icon: Icon }) => <button key={name} className={`settings-nav-item ${activeSetting === name ? 'active' : ''}`} aria-current={activeSetting === name ? 'page' : undefined} onClick={() => { setActiveSetting(name); setNotice('') }}><Icon size={16} strokeWidth={1.8} /><span>{name}</span></button>)}</div>)}
                </nav>
                <div className="settings-panel">
                  <div className="settings-panel-heading"><div><h2>{activeSetting}</h2><p>{settingsDetails[activeSetting].description}</p></div><button className="button button-secondary" onClick={() => setNotice('La edición se habilitará cuando la configuración se conecte al backend.')}>Editar</button></div>
                  {activeSetting === 'Apariencia' ? <div className="appearance-card">
                    <div className="appearance-card-heading"><div><h3>Color de acento</h3><p>Elige el color que acompaña a la paleta blanca de AES Nexus.</p></div><span className="appearance-current"><i style={{ backgroundColor: accentOptions.find((option) => option.id === accentTheme)?.color }} />{accentOptions.find((option) => option.id === accentTheme)?.label}</span></div>
                    <div className="appearance-options" role="group" aria-label="Opciones de color de acento">
                      {accentOptions.map((option) => <button key={option.id} className={`appearance-option ${accentTheme === option.id ? 'selected' : ''}`} aria-pressed={accentTheme === option.id} onClick={() => { setAccentTheme(option.id); window.localStorage.setItem('aes-nexus-accent', option.id) }}>
                        <span className="appearance-swatch" style={{ backgroundColor: option.color }}>{accentTheme === option.id && <Check size={17} />}</span><span className="appearance-option-copy"><strong>{option.label}</strong><small>{option.description}</small></span>{accentTheme === option.id && <span className="appearance-selected">Seleccionado</span>}
                      </button>)}
                    </div>
                    <div className="appearance-mode-row"><div className="appearance-mode-copy"><span className="appearance-mode-icon">{darkMode ? <Moon size={16} /> : <Sun size={16} />}</span><span><strong>Modo oscuro</strong><small>Reduce el brillo de la interfaz para trabajar con menos luz.</small></span></div><button className={`theme-toggle ${darkMode ? 'on' : ''}`} type="button" role="switch" aria-checked={darkMode} aria-label="Activar modo oscuro" onClick={() => { const nextMode = !darkMode; setDarkMode(nextMode); window.localStorage.setItem('aes-nexus-dark-mode', String(nextMode)) }}><span /></button></div>
                    <div className="appearance-preview"><div className="appearance-preview-copy"><span className="panel-kicker">VISTA PREVIA</span><strong>{darkMode ? 'Una paleta oscura para tu espacio' : 'Una paleta clara para tu espacio'}</strong><small>El color de acento aparece en botones, selección y detalles de navegación.</small></div><button className="button button-primary" type="button">Acción principal</button></div>
                  </div> : <div className="settings-card">{settingsDetails[activeSetting].rows.map((row) => <div className="settings-row" key={row.label}><div><h3>{row.label}</h3><p>{row.description}</p></div><span className="settings-value">{row.value}</span></div>)}</div>}
                  <p className="settings-footnote">{activeSetting === 'Apariencia' ? 'La preferencia se guarda en este navegador.' : 'La configuración de esta pantalla es ilustrativa y todavía no se guarda.'}</p>
                </div>
              </div>
            </section>
          ) : activePage === 'CRM' ? (
            <section className="crm-page" aria-labelledby="crm-title">
              <div className="crm-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> AES NEXUS · H2 PILOTO COMERCIAL</div><h1 id="crm-title">CRM</h1><p>Organiza tus relaciones, conversaciones y oportunidades desde un solo lugar.</p></div></div>
              {notice && <div className="notice" role="status">{notice}<button aria-label="Cerrar aviso" onClick={() => setNotice('')}><X size={15} /></button></div>}
              <nav className="crm-tabs" aria-label="Secciones de CRM">
                <button className={crmSection === 'Resumen' ? 'active' : ''} onClick={() => navigateToCrmSection('Resumen')}>Resumen</button>
                <button className={crmSection === 'Clientes' ? 'active' : ''} onClick={() => navigateToCrmSection('Clientes')}>Clientes <span>24</span></button>
                <button className={crmSection === 'Proveedores' ? 'active' : ''} onClick={() => navigateToCrmSection('Proveedores')}>Proveedores <span>8</span></button>
                <button className={crmSection === 'Oportunidades' ? 'active' : ''} onClick={() => navigateToCrmSection('Oportunidades')}>Oportunidades <span>12</span></button>
                <button className={crmSection === 'Actividades' ? 'active' : ''} onClick={() => navigateToCrmSection('Actividades')}>Actividades <span>8</span></button>
              </nav>
              {crmSection === 'Oportunidades' ? <>
                <div className="crm-section-heading"><div><div className="panel-kicker">SEGUIMIENTO COMERCIAL</div><h2>Oportunidades</h2><p>Da seguimiento a las conversaciones que pueden convertirse en negocio.</p></div><div className="crm-section-heading-actions"><button className="button button-primary" onClick={() => openCreate('opportunity')}><Plus size={15} /> Nueva oportunidad</button><span className="demo-pill"><i /> DATOS DEMO</span></div></div>
                <div className="opportunity-summary"><article><span className="kpi-icon"><Target size={17} /></span><div><strong>{opportunityRecords.length}</strong><small>Abiertas</small></div></article><article><span className="kpi-icon icon-sand"><BriefcaseBusiness size={17} /></span><div><strong>{money(opportunityRecords.reduce((total, opportunity) => total + opportunity.value, 0))}</strong><small>Valor del pipeline</small></div></article><article><span className="kpi-icon icon-green"><ArrowUpRight size={17} /></span><div><strong>32%</strong><small>Tasa de conversión</small></div></article></div>
                <div className="opportunities-board"><div className="opportunities-board-heading"><h3>Pipeline reciente</h3><button className="button button-secondary" onClick={() => openCreate('opportunity')}><Plus size={14} /> Nueva oportunidad</button></div><div className="opportunities-list">{opportunityRecords.map((opportunity) => <article className="opportunity-row" key={`${opportunity.company}-${opportunity.date}`}><div className={`company-avatar ${opportunity.color}`}>{opportunity.initials}</div><div className="opportunity-main"><strong>{opportunity.company}</strong><span>{opportunity.person}</span></div><span className={`stage-badge stage-${opportunity.stageTone}`}><i />{opportunity.stage}</span><strong className="opportunity-value">{money(opportunity.value)}</strong><span className="date-cell">{opportunity.date}</span><button className="row-more" aria-label={`Opciones para ${opportunity.company}`} onClick={() => setNotice(`Las acciones para ${opportunity.company} estarán disponibles al conectar el CRM.`)}><MoreHorizontal size={17} /></button></article>)}</div></div>
              </> : crmSection === 'Actividades' ? <>
                <div className="crm-section-heading"><div><div className="panel-kicker">AGENDA COMERCIAL</div><h2>Actividades</h2><p>Reúne llamadas, seguimientos y tareas para que ninguna conversación se quede atrás.</p></div><div className="crm-section-heading-actions"><button className="button button-primary" onClick={() => openCreate('activity')}><Plus size={15} /> Nueva actividad</button><span className="demo-pill"><i /> DATOS DEMO</span></div></div>
                <div className="activities-layout"><div className="activities-card"><div className="activities-card-heading"><div><h3>Hoy · 06 de noviembre</h3><p>Tu agenda de seguimiento</p></div><button className="button button-secondary" onClick={() => openCreate('activity')}><Plus size={14} /> Nueva actividad</button></div><div className="activities-list">{activityRecords.map((activity) => <article className="activity-item" key={`${activity.title}-${activity.time}`}><div className={`activity-icon tone-${activity.tone}`}>{activity.icon === 'send' ? <ArrowRight size={15} /> : activity.icon === 'phone' ? <Clock3 size={15} /> : <Users size={15} />}</div><div className="activity-item-copy"><strong>{activity.title}</strong><span>{activity.company}</span></div><time>{activity.time}</time><button className="row-more" aria-label={`Completar ${activity.title}`} onClick={() => setNotice(`La actividad “${activity.title}” se marcará al conectar el CRM.`)}><Check size={15} /></button></article>)}</div></div><aside className="activities-side"><span className="kpi-icon"><CalendarDays size={17} /></span><strong>{activityRecords.length + 5} actividades</strong><p>programadas esta semana</p><button className="text-link" onClick={() => setNotice('La agenda completa estará disponible en la siguiente iteración.')}>Ver calendario <ArrowRight size={13} /></button></aside></div>
              </> : crmSection === 'Clientes' || crmSection === 'Proveedores' ? <>
                <div className="crm-section-heading"><div><div className="panel-kicker">DIRECTORIO COMERCIAL</div><h2>{crmSection}</h2><p>{crmSection === 'Clientes' ? 'Personas y empresas con una relación comercial en tu espacio.' : 'Empresas y contactos que suministran productos o servicios a tu organización.'}</p></div><div className="crm-section-heading-actions">{crmSection === 'Clientes' ? <button className="button button-primary" onClick={() => setNotice('La creación de clientes estará disponible al conectar el CRM.')}><Plus size={15} /> Nuevo cliente</button> : <button className="button button-primary" onClick={() => openCreate('supplier')}><Plus size={15} /> Nuevo proveedor</button>}<span className="demo-pill"><i /> DATOS DEMO</span></div></div>
                <div className="clients-toolbar"><label className="clients-search"><Search size={15} /><input aria-label="Buscar clientes" value={clientQuery} onChange={(event) => setClientQuery(event.target.value)} placeholder="Buscar por nombre, empresa o correo" /></label><select aria-label="Filtrar clientes por estado" value={clientStatus} onChange={(event) => setClientStatus(event.target.value)}><option>Todos</option><option>Activo</option><option>Prospecto</option><option>Inactivo</option></select></div>
                <div className="clients-summary"><span><strong>{filteredDirectory.length}</strong> de {crmSection === 'Clientes' ? 24 : 8} registros visibles</span><span>Última actualización: hace unos momentos</span></div>
                <div className="clients-table-wrap"><table className="clients-table"><thead><tr><th>{crmSection === 'Clientes' ? 'CLIENTE' : 'PROVEEDOR'}</th><th>CONTACTO</th><th>ESTADO</th><th>ÚLTIMA ACTIVIDAD</th><th><span className="sr-only">Opciones</span></th></tr></thead><tbody>{filteredDirectory.map((client) => <tr key={client.email}><td><div className="company-cell"><div className={`company-avatar ${client.color}`}>{client.initials}</div><div><strong>{client.name}</strong><span>{client.company}</span></div></div></td><td><div className="client-contact"><span>{client.email}</span><small>{client.phone}</small></div></td><td><span className={`client-status status-${client.status.toLowerCase()}`}><i />{client.status}</span></td><td className="date-cell">{client.lastActivity}</td><td><button className="row-more" aria-label={`Opciones para ${client.name}`} onClick={() => setNotice(`Las acciones para ${client.name} estarán disponibles al conectar el CRM.`)}><MoreHorizontal size={17} /></button></td></tr>)}</tbody></table>{filteredDirectory.length === 0 && <div className="clients-empty"><Users size={20} /><strong>No encontramos {crmSection.toLowerCase()}</strong><span>Prueba con otro nombre, empresa o estado.</span></div>}</div>
              </> : <div className="crm-overview-grid"><article className="crm-overview-card crm-overview-highlight"><span className="kpi-icon"><Users size={17} /></span><div><strong>24</strong><span>Clientes y prospectos</span></div><button className="text-link" onClick={() => navigateToCrmSection('Clientes')}>Ver clientes <ArrowRight size={13} /></button></article><article className="crm-overview-card"><span className="kpi-icon icon-lilac"><Target size={17} /></span><div><strong>12</strong><span>Oportunidades abiertas</span></div><button className="text-link" onClick={() => setNotice('El pipeline estará disponible en la siguiente iteración.')}>Ver pipeline <ArrowRight size={13} /></button></article><article className="crm-overview-card"><span className="kpi-icon icon-sand"><Clock3 size={17} /></span><div><strong>8</strong><span>Actividades esta semana</span></div><button className="text-link" onClick={() => setNotice('La agenda estará disponible en la siguiente iteración.')}>Ver agenda <ArrowRight size={13} /></button></article></div>}
            </section>
          ) : activePage === 'Inicio' ? (
            <>
              <section className="welcome-row">
                <div><div className="eyebrow"><span className="eyebrow-line" /> VIERNES, 6 DE NOVIEMBRE</div><h1>Buenos días, Andrea<span className="wave">✳</span></h1><p className="welcome-subtitle">Aquí tienes el pulso de tu negocio. <span>Todo en orden.</span></p></div>
                <div className="header-actions"><button className="button button-secondary" onClick={() => setPeriod(period === 'Este mes' ? 'Este trimestre' : 'Este mes')}><CalendarDays size={15} />{period}<ChevronDown size={14} /></button><button className="button button-primary" onClick={handleCreate}><Plus size={17} /> Nueva oportunidad</button></div>
              </section>

              {notice && <div className="notice" role="status">{notice}<button aria-label="Cerrar aviso" onClick={() => setNotice('')}><X size={15} /></button></div>}
              <div className="demo-banner"><Sparkles size={15} /><span>Estás viendo un espacio de demostración.</span><span className="banner-divider" /><span>Los datos son de ejemplo y no representan información real.</span><button onClick={() => setNotice('La configuración inicial estará disponible al habilitar tu espacio de trabajo.')}>Configurar espacio <ArrowRight size={13} /></button></div>

              <section className="kpi-grid" aria-label="Resumen del negocio">
                <article className="kpi-card kpi-featured"><div className="kpi-top"><span>Ventas cerradas</span><span className="kpi-icon"><ChartNoAxesCombined size={16} /></span></div><div className="kpi-value">$284,500<span className="kpi-currency"> MXN</span></div><div className="kpi-foot"><span className="trend trend-up"><ArrowUpRight size={14} /> 12.8%</span><span>vs. mes anterior</span><div className="sparkline"><svg viewBox="0 0 98 32" aria-label="Tendencia ascendente"><path d="M2 25 C14 22 12 16 24 19 S40 22 48 13 S61 19 68 10 S80 14 96 3" /></svg></div></div></article>
                <article className="kpi-card"><div className="kpi-top"><span>Oportunidades abiertas</span><span className="kpi-icon icon-lilac"><Target size={16} /></span></div><div className="kpi-value">12</div><div className="kpi-foot"><span className="trend trend-up"><ArrowUpRight size={14} /> 3 nuevas</span><span>esta semana</span></div><div className="mini-segments"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></article>
                <article className="kpi-card"><div className="kpi-top"><span>Valor del pipeline</span><span className="kpi-icon icon-sand"><BriefcaseBusiness size={16} /></span></div><div className="kpi-value">$1.24<span className="kpi-currency"> M</span></div><div className="kpi-foot"><span className="subtle-label">Ticket promedio</span><strong>$38,750</strong><span className="trend trend-neutral">MXN</span></div></article>
                <article className="kpi-card"><div className="kpi-top"><span>Tasa de conversión</span><span className="kpi-icon icon-green"><ArrowDownRight size={17} /></span></div><div className="kpi-value">32<span className="kpi-percent">%</span></div><div className="kpi-foot"><span className="trend trend-down"><ArrowDownRight size={14} /> 2.4 pts</span><span>vs. mes anterior</span></div><div className="conversion-track"><span /></div></article>
              </section>

              <section className="dashboard-grid">
                <article className="panel revenue-panel"><div className="panel-heading"><div><div className="panel-kicker">PANORAMA</div><h2>Ventas y objetivos</h2><p className="panel-subtitle">Cómo avanza tu negocio en los últimos meses</p></div><button className="more-button" aria-label="Más opciones"><MoreHorizontal size={19} /></button></div>
                  <div className="chart-summary"><strong>$1,082,400</strong><span className="trend trend-up"><ArrowUpRight size={13} /> 8.6%</span><small>ingresos totales</small></div>
                  <div className="bar-chart" aria-label="Ventas mensuales frente al objetivo">
                    <div className="y-axis"><span>$200k</span><span>$150k</span><span>$100k</span><span>$50k</span></div>
                    <div className="chart-area"><div className="chart-gridlines"><i /><i /><i /><i /></div><div className="bars">{revenueBars.map(({ month, actual, target }) => <div className="bar-group" key={month}><div className="bar-pair"><i className="bar-target" style={{ height: `${target}%` }} /><i className={`bar-actual ${month === 'Nov' ? 'bar-current' : ''}`} style={{ height: `${actual}%` }} /></div><span>{month}</span></div>)}</div></div>
                  </div>
                  <div className="chart-legend"><span><i className="legend-dot legend-actual" />Ventas</span><span><i className="legend-dot legend-target" />Objetivo</span><small>Datos ilustrativos</small></div>
                </article>

                <article className="panel activity-panel"><div className="panel-heading"><div><div className="panel-kicker">EN TU AGENDA</div><h2>Lo que sigue</h2></div><button className="text-link" onClick={() => navigateTo('CRM')}>Ver agenda <ArrowRight size={14} /></button></div>
                  <div className="today-label"><span>HOY</span><span>06 NOV</span></div>
                  <div className="activity-list">{activities.map((activity) => <div className="activity-row" key={activity.title}><div className={`activity-icon tone-${activity.tone}`}>{activity.icon === 'send' ? <ArrowRight size={15} /> : activity.icon === 'phone' ? <Clock3 size={15} /> : <Users size={15} />}</div><div className="activity-copy"><strong>{activity.title}</strong><span>{activity.company}</span></div><time>{activity.time}</time></div>)}</div>
                  <button className="add-activity" onClick={() => setNotice('La creación de actividades estará disponible al conectar el CRM.')}><Plus size={15} /> Agregar actividad</button>
                  <div className="activity-note"><span className="note-spark"><Sparkles size={14} /></span><p>Un seguimiento a tiempo puede cambiar el rumbo de una oportunidad.</p></div>
                </article>

                <article className="panel opportunities-panel"><div className="panel-heading"><div><div className="panel-kicker">SEGUIMIENTO COMERCIAL</div><h2>Oportunidades recientes</h2><p className="panel-subtitle">Las conversaciones más activas de tu equipo</p></div><button className="text-link" onClick={() => navigateTo('CRM')}>Ver todas <ArrowRight size={14} /></button></div>
                  <div className="table-wrap"><table className="data-table"><thead><tr><th>EMPRESA</th><th>ETAPA</th><th>VALOR ESTIMADO</th><th>ACTUALIZACIÓN</th><th><span className="sr-only">Opciones</span></th></tr></thead><tbody>{opportunities.map((opportunity) => <tr key={opportunity.company}><td><div className="company-cell"><div className={`company-avatar ${opportunity.color}`}>{opportunity.initials}</div><div><strong>{opportunity.company}</strong><span>{opportunity.person}</span></div></div></td><td><span className={`stage-badge stage-${opportunity.stageTone}`}><i />{opportunity.stage}</span></td><td className="money-cell">{money(opportunity.value)}</td><td className="date-cell">{opportunity.date}</td><td><button className="row-more" aria-label={`Opciones para ${opportunity.company}`}><MoreHorizontal size={17} /></button></td></tr>)}</tbody></table></div>
                  <button className="table-footer" onClick={() => navigateTo('CRM')}>Ver pipeline completo <ArrowRight size={14} /></button>
                </article>
              </section>

              <footer className="page-footer"><span>Última actualización hace unos momentos</span><span><Command size={12} /> AES Nexus · Gestión clara para tu negocio.</span></footer>
            </>
          ) : (
            (() => {
              const detail = moduleDetails[activePage as keyof typeof moduleDetails]
              const Icon = detail?.icon ?? FolderKanban
              return <section className="module-page" aria-labelledby="module-title">
                <div className="module-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> AES NEXUS · MÓDULO</div><h1 id="module-title">{activePage}</h1><p>{detail?.description ?? 'Este espacio reúne las herramientas de trabajo de tu organización.'}</p></div><span className="module-phase">{detail?.phase ?? 'En preparación'}</span></div>
                <article className="module-overview"><div className="module-icon"><Icon size={21} /></div><div><div className="panel-kicker">ESTRUCTURA DEL MÓDULO</div><h2>Un espacio para trabajar con claridad</h2><p>Esta es la base de navegación de AES Nexus. Sus funciones se construirán por fases y se conectarán a servicios y datos cuando el alcance esté validado.</p></div></article>
                <div className="module-area-grid">{(detail?.areas ?? ['Información de la organización', 'Personas y accesos', 'Preferencias del espacio']).map((area, index) => <article className="module-area" key={area}><span className="module-area-index">0{index + 1}</span><div><h3>{area}</h3><p>Área prevista para este módulo.</p></div><span className="module-area-status">Planeado</span></article>)}</div>
                <button className="button button-secondary" onClick={() => navigateTo('Inicio')}>Volver al inicio <ArrowRight size={15} /></button>
              </section>
            })()
          )}
        </div>
      </main>
      {createKind && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeCreate() }}>
        <section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="create-modal-title">
          <div className="create-modal-heading"><div><div className="panel-kicker">AES NEXUS · CRM</div><h2 id="create-modal-title">{createKind === 'supplier' ? 'Nuevo proveedor' : createKind === 'opportunity' ? 'Nueva oportunidad' : 'Nueva actividad'}</h2><p>Completa los datos básicos. Se guardarán sólo durante esta sesión demo.</p></div><button className="icon-button" aria-label="Cerrar formulario" onClick={closeCreate}><X size={18} /></button></div>
          <form onSubmit={submitCreate}>
            {createKind === 'supplier' && <><label className="form-field"><span>Nombre del contacto</span><input required autoFocus value={createForm.name} onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })} placeholder="Ej. Laura Méndez" /></label><label className="form-field"><span>Empresa</span><input value={createForm.company} onChange={(event) => setCreateForm({ ...createForm, company: event.target.value })} placeholder="Ej. Suministros del Centro" /></label><div className="form-grid"><label className="form-field"><span>Correo</span><input type="email" required value={createForm.email} onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })} placeholder="correo@empresa.mx" /></label><label className="form-field"><span>Teléfono</span><input value={createForm.phone} onChange={(event) => setCreateForm({ ...createForm, phone: event.target.value })} placeholder="55 0000 0000" /></label></div></>}
            {createKind === 'opportunity' && <><label className="form-field"><span>Empresa</span><input required autoFocus value={createForm.company} onChange={(event) => setCreateForm({ ...createForm, company: event.target.value })} placeholder="Ej. Estudio Horizonte" /></label><div className="form-grid"><label className="form-field"><span>Contacto</span><input value={createForm.name} onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })} placeholder="Nombre del contacto" /></label><label className="form-field"><span>Valor estimado (MXN)</span><input type="number" min="0" value={createForm.value} onChange={(event) => setCreateForm({ ...createForm, value: event.target.value })} placeholder="25000" /></label></div></>}
            {createKind === 'activity' && <><label className="form-field"><span>Actividad</span><input required autoFocus value={createForm.title} onChange={(event) => setCreateForm({ ...createForm, title: event.target.value })} placeholder="Ej. Confirmar reunión" /></label><div className="form-grid"><label className="form-field"><span>Empresa</span><input value={createForm.company} onChange={(event) => setCreateForm({ ...createForm, company: event.target.value })} placeholder="Empresa relacionada" /></label><label className="form-field"><span>Hora</span><input type="time" required value={createForm.time} onChange={(event) => setCreateForm({ ...createForm, time: event.target.value })} /></label></div></>}
            <div className="create-modal-actions"><button className="button button-secondary" type="button" onClick={closeCreate}>Cancelar</button><button className="button button-primary" type="submit"><Plus size={14} /> Crear {createKind === 'supplier' ? 'proveedor' : createKind === 'opportunity' ? 'oportunidad' : 'actividad'}</button></div>
          </form>
        </section>
      </div>}
    </div>
  )
}

export default App
