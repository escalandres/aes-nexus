import { useState } from 'react'
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, Bell, BriefcaseBusiness,
  CalendarDays, ChartNoAxesCombined, ChevronDown, CircleHelp, Clock3,
  Command, FolderKanban, LayoutDashboard, Menu,
  MoreHorizontal, Plus, Search, Settings2, ShoppingBag, Sparkles,
  Target, Users, WalletCards, Warehouse, ShieldCheck, X, Building2,
  UserRoundPlus, LockKeyhole, Plug, CreditCard, Mail,
  ClipboardList, Globe2, Palette, Check,
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

const accentOptions = [
  { id: 'green', label: 'Verde', color: '#456a61', description: 'Natural y equilibrado' },
  { id: 'blue', label: 'Azul', color: '#3f6f9f', description: 'Claro y profesional' },
  { id: 'purple', label: 'Morado', color: '#7860a6', description: 'Creativo y distintivo' },
  { id: 'terracotta', label: 'Terracota', color: '#b96e56', description: 'Cálido y cercano' },
] as const
type AccentTheme = typeof accentOptions[number]['id']

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

function App() {
  const [activePage, setActivePage] = useState('Inicio')
  const [activeSetting, setActiveSetting] = useState('General')
  const [accentTheme, setAccentTheme] = useState<AccentTheme>(() => {
    const savedTheme = window.localStorage.getItem('aes-nexus-accent')
    return accentOptions.some((option) => option.id === savedTheme) ? savedTheme as AccentTheme : 'green'
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const [period, setPeriod] = useState('Este mes')
  const [notice, setNotice] = useState('')

  const handleCreate = () => setNotice('El formulario de creación estará disponible al conectar el módulo comercial.')

  return (
    <div className="app-frame" data-accent={accentTheme}>
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
                  <button key={name} className={`nav-item ${activePage === name ? 'active' : ''}`} aria-current={activePage === name ? 'page' : undefined} onClick={() => { setActivePage(name); setNotice(''); setMenuOpen(false) }}>
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
        <button className={`nav-item quiet ${activePage === 'Configuración' ? 'active' : ''}`} aria-current={activePage === 'Configuración' ? 'page' : undefined} onClick={() => { setActivePage('Configuración'); setActiveSetting('General'); setNotice(''); setMenuOpen(false) }}><Settings2 size={17} /><span>Configuración</span></button>
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
                    <div className="appearance-preview"><div className="appearance-preview-copy"><span className="panel-kicker">VISTA PREVIA</span><strong>Una paleta clara para tu espacio</strong><small>El color de acento aparece en botones, selección y detalles de navegación.</small></div><button className="button button-primary" type="button">Acción principal</button></div>
                  </div> : <div className="settings-card">{settingsDetails[activeSetting].rows.map((row) => <div className="settings-row" key={row.label}><div><h3>{row.label}</h3><p>{row.description}</p></div><span className="settings-value">{row.value}</span></div>)}</div>}
                  <p className="settings-footnote">{activeSetting === 'Apariencia' ? 'La preferencia se guarda en este navegador.' : 'La configuración de esta pantalla es ilustrativa y todavía no se guarda.'}</p>
                </div>
              </div>
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

                <article className="panel activity-panel"><div className="panel-heading"><div><div className="panel-kicker">EN TU AGENDA</div><h2>Lo que sigue</h2></div><button className="text-link" onClick={() => setActivePage('CRM')}>Ver agenda <ArrowRight size={14} /></button></div>
                  <div className="today-label"><span>HOY</span><span>06 NOV</span></div>
                  <div className="activity-list">{activities.map((activity) => <div className="activity-row" key={activity.title}><div className={`activity-icon tone-${activity.tone}`}>{activity.icon === 'send' ? <ArrowRight size={15} /> : activity.icon === 'phone' ? <Clock3 size={15} /> : <Users size={15} />}</div><div className="activity-copy"><strong>{activity.title}</strong><span>{activity.company}</span></div><time>{activity.time}</time></div>)}</div>
                  <button className="add-activity" onClick={() => setNotice('La creación de actividades estará disponible al conectar el CRM.')}><Plus size={15} /> Agregar actividad</button>
                  <div className="activity-note"><span className="note-spark"><Sparkles size={14} /></span><p>Un seguimiento a tiempo puede cambiar el rumbo de una oportunidad.</p></div>
                </article>

                <article className="panel opportunities-panel"><div className="panel-heading"><div><div className="panel-kicker">SEGUIMIENTO COMERCIAL</div><h2>Oportunidades recientes</h2><p className="panel-subtitle">Las conversaciones más activas de tu equipo</p></div><button className="text-link" onClick={() => setActivePage('CRM')}>Ver todas <ArrowRight size={14} /></button></div>
                  <div className="table-wrap"><table className="data-table"><thead><tr><th>EMPRESA</th><th>ETAPA</th><th>VALOR ESTIMADO</th><th>ACTUALIZACIÓN</th><th><span className="sr-only">Opciones</span></th></tr></thead><tbody>{opportunities.map((opportunity) => <tr key={opportunity.company}><td><div className="company-cell"><div className={`company-avatar ${opportunity.color}`}>{opportunity.initials}</div><div><strong>{opportunity.company}</strong><span>{opportunity.person}</span></div></div></td><td><span className={`stage-badge stage-${opportunity.stageTone}`}><i />{opportunity.stage}</span></td><td className="money-cell">{money(opportunity.value)}</td><td className="date-cell">{opportunity.date}</td><td><button className="row-more" aria-label={`Opciones para ${opportunity.company}`}><MoreHorizontal size={17} /></button></td></tr>)}</tbody></table></div>
                  <button className="table-footer" onClick={() => setActivePage('CRM')}>Ver pipeline completo <ArrowRight size={14} /></button>
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
                <button className="button button-secondary" onClick={() => setActivePage('Inicio')}>Volver al inicio <ArrowRight size={15} /></button>
              </section>
            })()
          )}
        </div>
      </main>
    </div>
  )
}

export default App
