import { useState, type FormEvent } from 'react'
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  Edit3,
  Globe,
  IdCard,
  Landmark,
  Mail,
  MapPin,
  Phone,
  Wallet,
  X,
} from 'lucide-react'
import type { ClientAddress } from '../services/clientService'
import { countries, findCountry } from './CountryDropdown'
import CountryDropdown from './CountryDropdown'
import { CountryFlag } from './CountryFlag'
import { validateClabeMod10, validateEbpFieldValue, type BankFormatPack } from '../data/ebp'

export interface DirectoryProfile {
  clientCode?: string
  supplierCode?: string
  name: string
  company: string
  email: string
  phone: string
  status: string
  lastActivity: string
  initials: string
  color: string
  rfc?: string
  entityType?: 'company' | 'individual'
  currency?: 'MXN' | 'USD'
  paymentTerms?: string
  city?: string
  state?: string
  country?: string
  notes?: string
  addresses?: ClientAddress[]
  bankName?: string
  clabe?: string
  accountNumber?: string
  defaultReference?: string
  bankPackValues?: Record<string, Record<string, string>>
}

const formatMoney = (value: number, currency: 'MXN' | 'USD' = 'MXN') =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)

interface DirectorySheetModalProps {
  kind: 'client' | 'supplier'
  record: DirectoryProfile
  installedPacks?: BankFormatPack[]
  openBalance: number
  totalVolume: number
  documentsCount: number
  onClose: () => void
  onQuickStatusChange: (nextStatus: 'Activo' | 'Prospecto' | 'Inactivo') => void
  onEdit: () => void
  onEditBank?: () => void
}

export function DirectorySheetModal({
  kind,
  record,
  installedPacks = [],
  openBalance,
  totalVolume,
  documentsCount,
  onClose,
  onQuickStatusChange,
  onEdit,
  onEditBank,
}: DirectorySheetModalProps) {
  const isSupplier = kind === 'supplier'
  const countryObj = findCountry(record.country)
  const currency = record.currency || 'MXN'
  const primaryAddress = record.addresses?.[0]
  const locationText =
    primaryAddress?.city || record.city
      ? `${primaryAddress?.city || record.city}${(primaryAddress?.state || record.state) ? `, ${primaryAddress?.state || record.state}` : ''}`
      : countryObj?.name || 'Sin ubicación registrada'

  const vendorPacks = isSupplier
    ? installedPacks.filter(
        (p) =>
          p.installed &&
          (p.operationType === 'vendor_payment' || p.operationType === 'both') &&
          p.beneficiaryBankSchema.length > 0
      )
    : []

  const getStatusClass = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'activo') return 'status-activo'
    if (s === 'prospecto') return 'status-prospecto'
    return 'status-inactivo'
  }

  const clabeCheck = isSupplier && record.clabe ? validateClabeMod10(record.clabe) : null

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <section
        className="create-modal emp-sheet-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dir-sheet-name"
      >
        {/* Header Banner — mismo diseño que Ficha de Empleados */}
        <header className="emp-sheet-header">
          <div className="emp-sheet-identity">
            <div className={`company-avatar emp-sheet-avatar ${record.color}`}>
              {record.initials}
            </div>
            <div className="emp-sheet-title-block">
              <div className="emp-sheet-kicker-row">
                <span className="emp-code-pill">
                  {isSupplier
                    ? record.supplierCode || 'PROVEEDOR'
                    : record.clientCode || 'CLIENTE'}
                </span>
                <span className={`client-status ${getStatusClass(record.status)}`}>
                  <i />
                  {record.status}
                </span>
                <span className="emp-contract-chip">
                  {record.entityType === 'individual'
                    ? 'Persona física'
                    : 'Empresa / Moral'}
                </span>
                {countryObj && (
                  <span className="emp-contract-chip">
                    <CountryFlag
                      code={countryObj.code}
                      className="d2-flag-icon"
                      style={{
                        display: 'inline-block',
                        verticalAlign: 'middle',
                        marginRight: 5,
                        width: 13,
                        height: 9,
                      }}
                    />
                    {countryObj.name}
                  </span>
                )}
              </div>
              <h2 id="dir-sheet-name">{record.company}</h2>
              <p className="emp-sheet-subtitle">
                Contacto principal: {record.name}
                {record.rfc ? ` · RFC: ${record.rfc}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Cerrar ficha"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>

        {/* Scrollable Content */}
        <div className="emp-sheet-body">
          {/* Highlight Summary Row */}
          <div className="emp-sheet-highlights">
            <div className="emp-highlight-card accent">
              <span className="emp-field-label">
                {isSupplier
                  ? 'Saldo pendiente por pagar'
                  : 'Saldo pendiente por cobrar'}
              </span>
              <strong className="emp-highlight-money">
                {formatMoney(openBalance, currency)}
              </strong>
              <small>
                {documentsCount > 0
                  ? `${documentsCount} documento(s) · Total histórico ${formatMoney(totalVolume, currency)}`
                  : `Condiciones: ${record.paymentTerms || 'Contado'} · Moneda ${currency}`}
              </small>
            </div>
            <div className="emp-highlight-card">
              <span className="emp-field-label">Ubicación y actividad</span>
              <strong className="emp-highlight-val">
                <MapPin size={13} /> {locationText}
              </strong>
              <small>
                <CalendarDays size={11} /> Última actividad: {record.lastActivity}
              </small>
            </div>
          </div>

          {/* Section 1: Contacto y Relación Comercial */}
          <div className="emp-sheet-section">
            <div className="emp-sheet-section-title">
              <Mail size={13} /> Contacto y relación comercial
            </div>
            <div className="emp-sheet-fields-grid cols-3">
              <div className="emp-sheet-field">
                <span className="emp-field-label">Contacto principal</span>
                <strong className="emp-field-val">
                  <Building2 size={12} /> {record.name}
                </strong>
              </div>
              <div className="emp-sheet-field">
                <span className="emp-field-label">Correo electrónico</span>
                <strong className="emp-field-val wrap-anywhere">
                  <Mail size={12} /> {record.email}
                </strong>
              </div>
              <div className="emp-sheet-field">
                <span className="emp-field-label">Teléfono</span>
                <strong className="emp-field-val">
                  <Phone size={12} /> {record.phone || 'No registrado'}
                </strong>
              </div>
            </div>
          </div>

          {/* Section 2: Datos Fiscales y Condiciones */}
          <div className="emp-sheet-section">
            <div className="emp-sheet-section-title">
              <IdCard size={13} /> Datos fiscales y condiciones comerciales
            </div>
            <div className="emp-sheet-fields-grid cols-3">
              <div className="emp-sheet-field">
                <span className="emp-field-label">
                  {isSupplier ? 'Código de proveedor' : 'Código de cliente'}
                </span>
                <strong className="emp-field-val mono">
                  {(isSupplier ? record.supplierCode : record.clientCode) || 'Sin código asignado'}
                </strong>
              </div>
              <div className="emp-sheet-field">
                <span className="emp-field-label">RFC / Tax ID</span>
                <strong className="emp-field-val mono">
                  {record.rfc || 'No registrado'}
                </strong>
              </div>
              <div className="emp-sheet-field">
                <span className="emp-field-label">Condiciones de pago</span>
                <strong className="emp-field-val">
                  {record.paymentTerms || 'Contado'}
                </strong>
              </div>
              <div className="emp-sheet-field">
                <span className="emp-field-label">Moneda y país</span>
                <strong className="emp-field-val">
                  <Globe size={12} /> {currency}
                  {countryObj ? ` · ${countryObj.name}` : ''}
                </strong>
              </div>
            </div>
          </div>

          {/* Section 3: Direcciones Registradas */}
          <div className="emp-sheet-section">
            <div className="emp-sheet-section-title">
              <MapPin size={13} /> Direcciones registradas (
              {record.addresses?.length || 0})
            </div>
            {record.addresses && record.addresses.length > 0 ? (
              <div
                className={`emp-sheet-fields-grid ${
                  record.addresses.length > 1 ? 'cols-2' : 'cols-1'
                }`}
              >
                {record.addresses.map((addr, idx) => {
                  const addrCountry = findCountry(addr.country)
                  const fullAddr = [
                    addr.street,
                    addr.colony ? `Col. ${addr.colony}` : '',
                    addr.city,
                    addr.state,
                    addr.zipCode ? `C.P. ${addr.zipCode}` : '',
                    addrCountry ? addrCountry.name : addr.country,
                  ]
                    .filter(Boolean)
                    .join(', ')
                  return (
                    <div key={addr.id || idx} className="emp-sheet-field">
                      <span className="emp-field-label">
                        Dirección #{idx + 1}
                      </span>
                      <strong className="emp-field-val wrap-anywhere">
                        <MapPin size={12} /> {fullAddr || 'Dirección sin detalle'}
                      </strong>
                      <div className="address-card-badges">
                        {addr.isShipping && (
                          <span className="address-badge shipping">Envío</span>
                        )}
                        {addr.isBilling && (
                          <span className="address-badge billing">
                            Facturación
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="emp-sheet-field">
                <strong className="emp-field-val">
                  {record.city || record.state
                    ? `${record.city || ''}${record.state ? `, ${record.state}` : ''}`
                    : 'Sin direcciones detalladas registradas'}
                </strong>
              </div>
            )}
          </div>

          {/* Section 4 (Proveedores): Datos Bancarios y Dispersión EBP */}
          {isSupplier && (
            <div className="emp-sheet-section">
              <div className="emp-sheet-section-title">
                <Wallet size={13} /> Datos bancarios para pagos (EBP)
              </div>
              <div className="emp-sheet-fields-grid cols-3">
                <div className="emp-sheet-field">
                  <span className="emp-field-label">Institución bancaria</span>
                  <strong className="emp-field-val">
                    {record.bankName || 'No registrada'}
                  </strong>
                </div>
                <div className="emp-sheet-field">
                  <span className="emp-field-label">CLABE interbancaria</span>
                  <strong className="emp-field-val mono wrap-anywhere">
                    {record.clabe || 'No registrada'}
                  </strong>
                  {clabeCheck && (
                    <small
                      className={
                        clabeCheck.valid ? 'ebp-field-hint' : 'ebp-field-err'
                      }
                    >
                      {clabeCheck.valid
                        ? `Banxico Mod-10 válida${clabeCheck.bankLabel ? ` (${clabeCheck.bankLabel})` : ''}`
                        : clabeCheck.reason}
                    </small>
                  )}
                </div>
                <div className="emp-sheet-field">
                  <span className="emp-field-label">Cuenta / Referencia</span>
                  <strong className="emp-field-val mono">
                    {record.accountNumber || '—'}
                    {record.defaultReference
                      ? ` · Ref. ${record.defaultReference}`
                      : ''}
                  </strong>
                </div>
              </div>

              {vendorPacks.length > 0 && (
                <div className="ebp-sheet-packs-row">
                  {vendorPacks.map((pack) => {
                    const vals = record.bankPackValues?.[pack.id] || {}
                    return (
                      <div key={pack.id} className="ebp-sheet-pack-pill">
                        <span className="emp-field-label">
                          {pack.bankName} (EBP)
                        </span>
                        <div className="ebp-mini-kv-list">
                          {pack.beneficiaryBankSchema.map((f) => {
                            const raw = vals[f.key] ?? f.defaultValue ?? '—'
                            const catLabel =
                              f.catalogRef && pack.embeddedCatalogs[f.catalogRef]
                                ? pack.embeddedCatalogs[f.catalogRef].options.find(
                                    (o) => o.code === raw
                                  )?.label || raw
                                : raw
                            return (
                              <span key={f.key} className="ebp-mini-kv">
                                {f.label}: <strong>{catLabel}</strong>
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {record.notes && (
            <div className="emp-sheet-notes">
              <span className="emp-field-label">
                Notas y acuerdos comerciales
              </span>
              <p>{record.notes}</p>
            </div>
          )}
        </div>

        {/* Footer Actions — idéntico al de Empleados */}
        <footer className="emp-sheet-footer">
          <div className="emp-sheet-status-actions">
            <span className="emp-status-switch-label">Cambiar estado:</span>
            {(['Activo', 'Prospecto', 'Inactivo'] as const)
              .filter((st) => st !== record.status)
              .map((st) => (
                <button
                  key={st}
                  type="button"
                  className="button button-secondary emp-status-btn"
                  onClick={() => onQuickStatusChange(st)}
                >
                  {st}
                </button>
              ))}
          </div>
          <div className="emp-sheet-primary-actions">
            {isSupplier && onEditBank && (
              <button
                type="button"
                className="button button-secondary"
                onClick={onEditBank}
              >
                <Landmark size={13} /> Datos bancarios EBP
              </button>
            )}
            <button
              type="button"
              className="button button-secondary"
              onClick={onEdit}
            >
              <Edit3 size={13} /> Editar ficha
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>
        </footer>
      </section>
    </div>
  )
}

interface DirectoryEditModalProps {
  kind: 'client' | 'supplier'
  record: DirectoryProfile
  installedPacks?: BankFormatPack[]
  onClose: () => void
  onSave: (updated: DirectoryProfile) => void
}

export function DirectoryEditModal({
  kind,
  record,
  installedPacks = [],
  onClose,
  onSave,
}: DirectoryEditModalProps) {
  const isSupplier = kind === 'supplier'
  const [clientCode, setClientCode] = useState(record.clientCode || '')
  const [supplierCode, setSupplierCode] = useState(record.supplierCode || '')
  const [name, setName] = useState(record.name)
  const [company, setCompany] = useState(record.company)
  const [email, setEmail] = useState(record.email)
  const [phone, setPhone] = useState(record.phone)
  const [rfc, setRfc] = useState(record.rfc || '')
  const [entityType, setEntityType] = useState<'company' | 'individual'>(
    record.entityType || 'company'
  )
  const [status, setStatus] = useState(record.status || 'Activo')
  const [currency, setCurrency] = useState<'MXN' | 'USD'>(
    record.currency || 'MXN'
  )
  const [paymentTerms, setPaymentTerms] = useState(
    record.paymentTerms || 'Contado'
  )
  const [country, setCountry] = useState(record.country || 'MX')
  const [city, setCity] = useState(record.city || record.addresses?.[0]?.city || '')
  const [stateVal, setStateVal] = useState(
    record.state || record.addresses?.[0]?.state || ''
  )
  const [notes, setNotes] = useState(record.notes || '')
  const [bankName, setBankName] = useState(record.bankName || '')
  const [clabe, setClabe] = useState(record.clabe || '')
  const [accountNumber, setAccountNumber] = useState(record.accountNumber || '')
  const [defaultReference, setDefaultReference] = useState(
    record.defaultReference || ''
  )
  const [bankPackValues, setBankPackValues] = useState<
    Record<string, Record<string, string>>
  >(record.bankPackValues ? JSON.parse(JSON.stringify(record.bankPackValues)) : {})

  const vendorPacks = isSupplier
    ? installedPacks.filter(
        (p) =>
          p.installed &&
          (p.operationType === 'vendor_payment' || p.operationType === 'both') &&
          p.beneficiaryBankSchema.length > 0
      )
    : []

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const cleanCompany = company.trim() || name.trim()
    const cleanName = name.trim() || cleanCompany
    const initials = cleanName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('')

    onSave({
      ...record,
      clientCode: !isSupplier ? clientCode.trim() || undefined : record.clientCode,
      supplierCode: isSupplier ? supplierCode.trim() || undefined : record.supplierCode,
      name: cleanName,
      company: cleanCompany,
      initials: initials || record.initials,
      email: email.trim(),
      phone: phone.trim(),
      rfc: rfc.trim().toUpperCase() || undefined,
      entityType,
      status,
      currency,
      paymentTerms,
      country,
      city: city.trim() || undefined,
      state: stateVal.trim() || undefined,
      notes: notes.trim() || undefined,
      lastActivity: 'Ahora',
      ...(isSupplier
        ? {
            bankName: bankName.trim() || undefined,
            clabe: clabe.trim() || undefined,
            accountNumber: accountNumber.trim() || undefined,
            defaultReference: defaultReference.trim() || undefined,
            bankPackValues,
          }
        : {}),
    })
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <section className="create-modal modal-wide" role="dialog" aria-modal="true">
        <div className="create-modal-heading">
          <div>
            <div className="panel-kicker">
              {isSupplier ? 'DIRECTORIO · PROVEEDOR' : 'DIRECTORIO · CLIENTE'}
            </div>
            <h2>
              Editar ficha de {isSupplier ? 'proveedor' : 'cliente'}
            </h2>
            <p>
              Actualiza datos comerciales, fiscales{isSupplier ? ', bancarios' : ''} y condiciones de operación.
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Cerrar"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid-3">
            <label className="form-field">
              <span>{isSupplier ? 'Código de proveedor' : 'Código de cliente'}</span>
              <input
                className="mono"
                value={isSupplier ? supplierCode : clientCode}
                onChange={(e) =>
                  isSupplier
                    ? setSupplierCode(e.target.value)
                    : setClientCode(e.target.value)
                }
                placeholder={isSupplier ? 'Ej. PRV-001 / ID previo' : 'Ej. CLI-001 / ID previo'}
              />
            </label>
            <label className="form-field">
              <span>Empresa / Razón social *</span>
              <input
                required
                autoFocus
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </label>
            <label className="form-field">
              <span>Nombre del contacto *</span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          </div>

          <div className="form-grid-3">
            <label className="form-field">
              <span>Correo electrónico *</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="form-field">
              <span>Teléfono</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <label className="form-field">
              <span>RFC / Tax ID</span>
              <input
                className="mono"
                maxLength={13}
                value={rfc}
                onChange={(e) => setRfc(e.target.value.toUpperCase())}
              />
            </label>
          </div>

          <div className="form-grid-4">
            <label className="form-field">
              <span>Tipo de entidad</span>
              <select
                value={entityType}
                onChange={(e) =>
                  setEntityType(e.target.value as 'company' | 'individual')
                }
              >
                <option value="company">Empresa / Moral</option>
                <option value="individual">Persona física</option>
              </select>
            </label>
            <label className="form-field">
              <span>Estado</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Activo">Activo</option>
                <option value="Prospecto">Prospecto</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </label>
            <label className="form-field">
              <span>Condiciones de pago</span>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
              >
                <option value="Contado">Contado</option>
                <option value="Crédito 15 días">Crédito 15 días</option>
                <option value="Crédito 30 días">Crédito 30 días</option>
                <option value="Crédito 60 días">Crédito 60 días</option>
              </select>
            </label>
            <label className="form-field">
              <span>Moneda</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as 'MXN' | 'USD')}
              >
                <option value="MXN">MXN</option>
                <option value="USD">USD</option>
              </select>
            </label>
          </div>

          <div className="form-grid-3">
            <label className="form-field">
              <span>Ciudad</span>
              <input value={city} onChange={(e) => setCity(e.target.value)} />
            </label>
            <label className="form-field">
              <span>Estado / Provincia</span>
              <input
                value={stateVal}
                onChange={(e) => setStateVal(e.target.value)}
              />
            </label>
            <CountryDropdown
              countries={countries}
              value={country}
              onChange={(code) => setCountry(code)}
              placeholder="Seleccionar país"
              id="edit-dir-country"
              label="País"
            />
          </div>

          {isSupplier && (
            <>
              <div className="form-section-divider">
                Datos bancarios para pagos electrónicos (EBP)
              </div>
              <div className="form-grid-4">
                <label className="form-field">
                  <span>Banco receptor</span>
                  <input
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                  />
                </label>
                <label className="form-field">
                  <span>CLABE (18 dígitos)</span>
                  <input
                    className="mono"
                    maxLength={18}
                    value={clabe}
                    onChange={(e) => setClabe(e.target.value)}
                  />
                </label>
                <label className="form-field">
                  <span>Cuenta</span>
                  <input
                    className="mono"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                  />
                </label>
                <label className="form-field">
                  <span>Referencia default</span>
                  <input
                    value={defaultReference}
                    onChange={(e) => setDefaultReference(e.target.value)}
                  />
                </label>
              </div>

              {vendorPacks.length > 0 && (
                <div className="ebp-dynamic-packs-stack">
                  {vendorPacks.map((pack) => {
                    const vals = bankPackValues[pack.id] || {}
                    return (
                      <div key={pack.id} className="ebp-dynamic-pack-subbox">
                        <div className="ebp-subbox-title">
                          <strong>{pack.name}</strong>
                          <span className="emp-code-pill">{pack.bankName}</span>
                        </div>
                        <div className="form-grid">
                          {pack.beneficiaryBankSchema.map((field) => {
                            const val = vals[field.key] ?? field.defaultValue ?? ''
                            const err = validateEbpFieldValue(
                              field,
                              val,
                              pack.embeddedCatalogs
                            )
                            const cat = field.catalogRef
                              ? pack.embeddedCatalogs[field.catalogRef]
                              : undefined
                            return (
                              <label key={field.key} className="form-field">
                                <span>
                                  {field.label} {field.validators.required ? '*' : ''}
                                </span>
                                {field.type === 'select_catalog' && cat ? (
                                  <select
                                    value={val}
                                    onChange={(e) =>
                                      setBankPackValues((prev) => ({
                                        ...prev,
                                        [pack.id]: {
                                          ...(prev[pack.id] || {}),
                                          [field.key]: e.target.value,
                                        },
                                      }))
                                    }
                                  >
                                    <option value="">Selecciona opción...</option>
                                    {cat.options.map((opt) => (
                                      <option key={opt.code} value={opt.code}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    value={val}
                                    placeholder={field.placeholder}
                                    onChange={(e) =>
                                      setBankPackValues((prev) => ({
                                        ...prev,
                                        [pack.id]: {
                                          ...(prev[pack.id] || {}),
                                          [field.key]: e.target.value,
                                        },
                                      }))
                                    }
                                  />
                                )}
                                {err && <small className="ebp-field-err">{err}</small>}
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          <label className="form-field">
            <span>Notas y acuerdos comerciales</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Acuerdos comerciales, observaciones fiscales o referencias..."
            />
          </label>

          <div className="create-modal-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button type="submit" className="button button-primary">
              <BadgeCheck size={14} /> Guardar cambios
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
