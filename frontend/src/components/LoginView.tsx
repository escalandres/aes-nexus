import { useEffect, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserCheck,
} from 'lucide-react'
import {
  bootstrapInitialAdmin,
  fetchBootstrapStatus,
  loginWithPassword,
  type AuthSession,
  type BootstrapStatusResponse,
} from '../services/authService'

interface LoginViewProps {
  onAuthenticated: (session: AuthSession) => void
  redirectedFromPath?: string | null
}

export function LoginView({ onAuthenticated, redirectedFromPath }: LoginViewProps) {
  const [bootstrapStatus, setBootstrapStatus] = useState<BootstrapStatusResponse | null>(null)
  const [statusError, setStatusError] = useState<string>('')
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [passcode, setPasscode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    const checkStatus = async () => {
      setIsCheckingStatus(true)
      setStatusError('')
      try {
        const status = await fetchBootstrapStatus()
        if (!cancelled) {
          setBootstrapStatus(status)
        }
      } catch (err) {
        if (!cancelled) {
          setBootstrapStatus({ requiresBootstrap: false, passcodeRequired: false })
          setStatusError(
            err instanceof Error
              ? err.message
              : 'No se pudo comprobar el estado inicial de acceso.'
          )
        }
      } finally {
        if (!cancelled) {
          setIsCheckingStatus(false)
        }
      }
    }
    void checkStatus()
    return () => {
      cancelled = true
    }
  }, [])

  const isBootstrapMode = Boolean(bootstrapStatus?.requiresBootstrap)
  const passcodeRequired = Boolean(bootstrapStatus?.passcodeRequired)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      setErrorMessage('Ingresa tu correo electrónico y contraseña para continuar.')
      return
    }

    if (isBootstrapMode) {
      if (fullName.trim().length < 2) {
        setErrorMessage('Ingresa el nombre completo del administrador inicial.')
        return
      }
      if (password.length < 8) {
        setErrorMessage('La contraseña del administrador debe tener al menos 8 caracteres.')
        return
      }
      if (passcodeRequired && !passcode.trim()) {
        setErrorMessage('Ingresa el código de inicialización configurado en el servidor.')
        return
      }
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const session = isBootstrapMode
        ? await bootstrapInitialAdmin({
            email: trimmedEmail,
            fullName: fullName.trim(),
            password,
            passcode: passcodeRequired ? passcode.trim() : undefined,
          })
        : await loginWithPassword({
            email: trimmedEmail,
            password,
          })

      onAuthenticated(session)
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'No fue posible validar tus credenciales. Verifica e intenta de nuevo.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-shell">
        <section className="login-card" aria-labelledby="login-heading">
          <div className="login-brand">
            <div className="brand-mark" aria-hidden="true">
              <span>A</span>
              <i />
            </div>
            <div className="brand-name">
              AES <span>Nexus</span>
            </div>
          </div>

          <div className="login-copy">
            <div className="eyebrow">
              <span className="eyebrow-line" />
              {isBootstrapMode
                ? 'INICIALIZACIÓN ÚNICA DE PLATAFORMA'
                : 'ACCESO CORPORATIVO AUTORIZADO'}
            </div>
            <h1 id="login-heading">
              {isBootstrapMode
                ? 'Configurar administrador principal'
                : 'Iniciar sesión'}
            </h1>
            <p>
              {isBootstrapMode
                ? 'No se detectaron usuarios registrados todavía. Define la cuenta administradora inicial para habilitar el acceso al espacio de trabajo.'
                : 'Ingresa tus credenciales asignadas para acceder al panel operativo de AES Nexus.'}
            </p>
          </div>

          {redirectedFromPath && redirectedFromPath !== '/' && !errorMessage && (
            <div className="login-info-banner" role="status">
              <LockKeyhole size={15} />
              <span>
                Inicia sesión para continuar hacia <strong>{redirectedFromPath}</strong>.
              </span>
            </div>
          )}

          {statusError && (
            <div className="login-error-banner" role="alert">
              <AlertCircle size={15} />
              <span>{statusError}</span>
            </div>
          )}

          {errorMessage && (
            <div className="login-error-banner" role="alert">
              <AlertCircle size={15} />
              <span>{errorMessage}</span>
            </div>
          )}

          {isCheckingStatus ? (
            <div className="login-skeleton" aria-busy="true" aria-label="Verificando acceso">
              <div className="login-skeleton-line wide" />
              <div className="login-skeleton-line" />
              <div className="login-skeleton-line" />
              <div className="login-skeleton-btn" />
            </div>
          ) : (
            <form className="login-form" onSubmit={handleSubmit} noValidate>
              {isBootstrapMode && (
                <label className="login-field">
                  <span>Nombre completo</span>
                  <div className="login-input-wrap">
                    <UserCheck size={15} className="login-input-icon" aria-hidden="true" />
                    <input
                      type="text"
                      name="fullName"
                      autoComplete="name"
                      placeholder="Ej. Carlos Mendoza"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </label>
              )}

              <label className="login-field">
                <span>Correo electrónico</span>
                <div className="login-input-wrap">
                  <Mail size={15} className="login-input-icon" aria-hidden="true" />
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="nombre@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isSubmitting}
                    autoFocus={!isBootstrapMode}
                  />
                </div>
              </label>

              <label className="login-field">
                <span>Contraseña</span>
                <div className="login-input-wrap">
                  <KeyRound size={15} className="login-input-icon" aria-hidden="true" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete={isBootstrapMode ? 'new-password' : 'current-password'}
                    placeholder={
                      isBootstrapMode
                        ? 'Mínimo 8 caracteres'
                        : 'Ingresa tu contraseña'
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    className="login-visibility-btn"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </label>

              {isBootstrapMode && passcodeRequired && (
                <label className="login-field">
                  <span>Código de inicialización del servidor</span>
                  <div className="login-input-wrap">
                    <ShieldCheck size={15} className="login-input-icon" aria-hidden="true" />
                    <input
                      type="password"
                      name="passcode"
                      autoComplete="one-time-code"
                      placeholder="ADMIN_BOOTSTRAP_PASSCODE"
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </label>
              )}

              <button
                type="submit"
                className="button button-primary login-submit-btn"
                disabled={isSubmitting}
              >
                <span>
                  {isSubmitting
                    ? 'Verificando credenciales...'
                    : isBootstrapMode
                    ? 'Crear administrador y entrar'
                    : 'Iniciar sesión'}
                </span>
                <ArrowRight size={15} />
              </button>
            </form>
          )}

          <footer className="login-card-footer">
            <LockKeyhole size={13} aria-hidden="true" />
            <span>
              Acceso sin registro público. Solicita tu alta de usuario al área de administración.
            </span>
          </footer>
        </section>

        <aside className="login-aside" aria-label="Resumen de entorno">
          <div className="login-aside-head">
            <span className="login-aside-kicker">PLATAFORMA OPERATIVA MULTI-EMPRESA</span>
            <h2>Control unificado de comercio, inventario y finanzas</h2>
            <p>
              Consola empresarial lista para despliegues dedicados por cliente con aislamiento organizacional y trazabilidad completa.
            </p>
          </div>

          <div className="login-aside-specs">
            <div className="login-spec-row">
              <div className="login-spec-icon">
                <ShieldCheck size={16} />
              </div>
              <div>
                <strong>Sesión cifrada por token en memoria</strong>
                <span>Las credenciales y permisos se validan directamente contra el servidor en cada operación.</span>
              </div>
            </div>

            <div className="login-spec-row">
              <div className="login-spec-icon">
                <Building2 size={16} />
              </div>
              <div>
                <strong>Contexto multi-empresa y subsidiarias</strong>
                <span>Aislamiento por organización y control granular de acceso por rol en CRM, Ventas, Compras y Finanzas.</span>
              </div>
            </div>

            <div className="login-spec-row">
              <div className="login-spec-icon">
                <LockKeyhole size={16} />
              </div>
              <div>
                <strong>Alta restringida por administración</strong>
                <span>No existe registro abierto al público; cada usuario se habilita bajo política interna.</span>
              </div>
            </div>
          </div>

          <div className="login-aside-foot">
            <span>Ruta de inicio autenticada</span>
            <code>/app</code>
          </div>
        </aside>
      </div>
    </div>
  )
}
