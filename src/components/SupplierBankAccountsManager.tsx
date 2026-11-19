import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Landmark,
  Plus,
  Star,
  Trash2,
} from 'lucide-react'
import {
  BANXICO_BANK_NAMES,
  validateClabeMod10,
  validateEbpFieldValue,
  type BankFormatPack,
  type EbpCurrency,
  type SupplierBankAccount,
} from '../data/ebp'

interface SupplierBankAccountsManagerProps {
  accounts: SupplierBankAccount[]
  installedPacks: BankFormatPack[]
  usedAccountIds?: Set<string>
  defaultCurrency?: EbpCurrency
  onChange: (nextAccounts: SupplierBankAccount[]) => void
}

export function SupplierBankAccountsManager({
  accounts,
  installedPacks,
  usedAccountIds,
  defaultCurrency = 'MXN',
  onChange,
}: SupplierBankAccountsManagerProps) {
  const [selectedId, setSelectedId] = useState<string>(() => accounts[0]?.id || '')

  const vendorPacks = useMemo(
    () =>
      installedPacks.filter(
        (p) =>
          p.installed &&
          (p.operationType === 'vendor_payment' || p.operationType === 'both') &&
          p.beneficiaryBankSchema.length > 0
      ),
    [installedPacks]
  )

  const activeAccount = useMemo(
    () => accounts.find((a) => a.id === selectedId) || accounts[0] || null,
    [accounts, selectedId]
  )

  const handleAddAccount = () => {
    const newId = `sba_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const nextAcc: SupplierBankAccount = {
      id: newId,
      alias: `Cuenta adicional ${accounts.length + 1}`,
      bankName: '',
      clabe: '',
      accountNumber: '',
      currency: defaultCurrency,
      defaultReference: '',
      isDefault: accounts.length === 0,
      active: true,
      bankPackValues: {},
    }
    const next = [...accounts, nextAcc]
    onChange(next)
    setSelectedId(newId)
  }

  const updateAccount = (accountId: string, patch: Partial<SupplierBankAccount>) => {
    const next = accounts.map((acc) => (acc.id === accountId ? { ...acc, ...patch } : acc))
    onChange(next)
  }

  const handleSetDefault = (accountId: string) => {
    const next = accounts.map((acc) => ({
      ...acc,
      isDefault: acc.id === accountId,
      active: acc.id === accountId ? true : acc.active,
    }))
    onChange(next)
  }

  const handleRemoveOrDeactivate = (acc: SupplierBankAccount) => {
    const isHistorical = usedAccountIds?.has(acc.id)
    if (isHistorical) {
      updateAccount(acc.id, { active: false, isDefault: false })
      return
    }
    const remaining = accounts.filter((a) => a.id !== acc.id)
    if (remaining.length > 0 && acc.isDefault) {
      const firstActive = remaining.find((a) => a.active) || remaining[0]
      firstActive.isDefault = true
    }
    onChange(remaining)
    if (selectedId === acc.id) {
      setSelectedId(remaining[0]?.id || '')
    }
  }

  const clabeCheck = activeAccount?.clabe ? validateClabeMod10(activeAccount.clabe) : null

  return (
    <div className="ebp-multi-bank-shell">
      <div className="ebp-multi-bank-topbar">
        <div>
          <strong>Detalles bancarios del proveedor ({accounts.length})</strong>
          <small>
            Cada proveedor puede registrar múltiples cuentas (por moneda, banco o servicio) con parámetros EBP independientes.
          </small>
        </div>
        <button
          type="button"
          className="button button-secondary"
          onClick={handleAddAccount}
        >
          <Plus size={13} /> Agregar cuenta bancaria
        </button>
      </div>

      {accounts.length === 0 ? (
        <div className="ebp-multi-bank-empty">
          <Landmark size={18} />
          <div>
            <strong>Sin detalles bancarios registrados</strong>
            <small>Agrega al menos una cuenta bancaria para habilitar dispersión de facturas por EBP.</small>
          </div>
          <button type="button" className="button button-primary" onClick={handleAddAccount}>
            <Plus size={13} /> Registrar primera cuenta
          </button>
        </div>
      ) : (
        <div className="ebp-multi-bank-grid">
          {/* Left rail: account list */}
          <div className="ebp-multi-bank-list" role="tablist" aria-label="Cuentas bancarias del proveedor">
            {accounts.map((acc) => {
              const isSelected = activeAccount?.id === acc.id
              const check = acc.clabe ? validateClabeMod10(acc.clabe) : null
              const isHistorical = Boolean(usedAccountIds?.has(acc.id))
              return (
                <button
                  key={acc.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  className={`ebp-bank-item-tab ${isSelected ? 'active' : ''} ${!acc.active ? 'inactive' : ''}`}
                  onClick={() => setSelectedId(acc.id)}
                >
                  <div className="ebp-bank-item-head">
                    <strong>{acc.alias || acc.bankName || 'Cuenta sin alias'}</strong>
                    <span className="emp-code-pill mono">{acc.currency}</span>
                  </div>
                  <div className="ebp-bank-item-sub mono">
                    {acc.bankName || 'Banco sin asignar'} ·{' '}
                    {acc.clabe ? `••••${acc.clabe.slice(-4)}` : 'Sin CLABE'}
                  </div>
                  <div className="ebp-bank-item-flags">
                    {acc.isDefault && (
                      <span className="ebp-mini-status default">
                        <Star size={9} /> Predeterminada
                      </span>
                    )}
                    {!acc.active ? (
                      <span className="ebp-mini-status muted">Inactiva</span>
                    ) : check?.valid ? (
                      <span className="ebp-mini-status ok">
                        <CheckCircle2 size={9} /> Mod-10
                      </span>
                    ) : (
                      <span className="ebp-mini-status err">
                        <AlertTriangle size={9} /> Revisar CLABE
                      </span>
                    )}
                    {isHistorical && <span className="ebp-mini-status muted">En historial</span>}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Right pane: selected account details & pack schemas */}
          {activeAccount && (
            <div className="ebp-multi-bank-editor">
              <div className="ebp-editor-head">
                <div>
                  <span className="emp-field-label">Detalle bancario seleccionado</span>
                  <strong>{activeAccount.alias || 'Sin alias'}</strong>
                </div>
                <div className="ebp-editor-actions">
                  {!activeAccount.isDefault && (
                    <button
                      type="button"
                      className="button-icon-action"
                      onClick={() => handleSetDefault(activeAccount.id)}
                    >
                      <Star size={12} /> Marcar predeterminada
                    </button>
                  )}
                  {(accounts.length > 1 || usedAccountIds?.has(activeAccount.id)) && (
                    <button
                      type="button"
                      className="button-icon-action"
                      title={
                        usedAccountIds?.has(activeAccount.id)
                          ? 'Cuenta usada en lotes históricos: se desactivará sin borrar auditoría'
                          : 'Eliminar detalle bancario'
                      }
                      onClick={() => handleRemoveOrDeactivate(activeAccount)}
                    >
                      <Trash2 size={12} />{' '}
                      {usedAccountIds?.has(activeAccount.id) ? 'Desactivar' : 'Eliminar'}
                    </button>
                  )}
                </div>
              </div>

              <div className="form-grid-3">
                <label className="form-field">
                  <span>Alias identificador *</span>
                  <input
                    required
                    value={activeAccount.alias}
                    placeholder="Ej. BBVA Principal Operativa"
                    onChange={(e) =>
                      updateAccount(activeAccount.id, { alias: e.target.value })
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Moneda de la cuenta *</span>
                  <select
                    value={activeAccount.currency}
                    onChange={(e) =>
                      updateAccount(activeAccount.id, {
                        currency: e.target.value as EbpCurrency,
                      })
                    }
                  >
                    <option value="MXN">MXN · Peso Mexicano</option>
                    <option value="USD">USD · Dólar Americano</option>
                    <option value="EUR">EUR · Euro</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>Banco receptor *</span>
                  <input
                    value={activeAccount.bankName}
                    placeholder="Ej. BBVA México"
                    onChange={(e) =>
                      updateAccount(activeAccount.id, { bankName: e.target.value })
                    }
                  />
                </label>
              </div>

              <div className="form-grid-3">
                <label className="form-field">
                  <span>CLABE interbancaria (18 dígitos) *</span>
                  <input
                    className="mono"
                    maxLength={18}
                    value={activeAccount.clabe}
                    placeholder="012180..."
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\s+/g, '')
                      const detectedBank =
                        raw.length >= 3 ? BANXICO_BANK_NAMES[raw.slice(0, 3)] : undefined
                      updateAccount(activeAccount.id, {
                        clabe: raw,
                        bankName:
                          !activeAccount.bankName && detectedBank
                            ? detectedBank
                            : activeAccount.bankName,
                      })
                    }}
                  />
                  {clabeCheck && (
                    <small className={clabeCheck.valid ? 'ebp-field-hint' : 'ebp-field-err'}>
                      {clabeCheck.valid
                        ? `Banxico Mod-10 válida${clabeCheck.bankLabel ? ` (${clabeCheck.bankLabel})` : ''}`
                        : clabeCheck.reason}
                    </small>
                  )}
                </label>
                <label className="form-field">
                  <span>Número de cuenta</span>
                  <input
                    className="mono"
                    value={activeAccount.accountNumber || ''}
                    placeholder="Últimos dígitos o cuenta"
                    onChange={(e) =>
                      updateAccount(activeAccount.id, { accountNumber: e.target.value })
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Referencia numérica default</span>
                  <input
                    className="mono"
                    value={activeAccount.defaultReference || ''}
                    placeholder="Ej. 1049201"
                    onChange={(e) =>
                      updateAccount(activeAccount.id, { defaultReference: e.target.value })
                    }
                  />
                </label>
              </div>

              <div className="ebp-account-toggles-row">
                <label className="checkbox-field" style={{ fontSize: 10.5 }}>
                  <input
                    type="checkbox"
                    checked={activeAccount.isDefault}
                    onChange={(e) => {
                      if (e.target.checked) handleSetDefault(activeAccount.id)
                      else updateAccount(activeAccount.id, { isDefault: false })
                    }}
                  />
                  <span>Usar como cuenta predeterminada al pagar facturas</span>
                </label>
                <label className="checkbox-field" style={{ fontSize: 10.5 }}>
                  <input
                    type="checkbox"
                    checked={activeAccount.active !== false}
                    onChange={(e) =>
                      updateAccount(activeAccount.id, {
                        active: e.target.checked,
                        isDefault: e.target.checked ? activeAccount.isDefault : false,
                      })
                    }
                  />
                  <span>Cuenta activa para dispersión EBP</span>
                </label>
              </div>

              {vendorPacks.length > 0 && (
                <div className="ebp-dynamic-packs-stack" style={{ marginTop: 10, marginBottom: 0 }}>
                  {vendorPacks.map((pack) => {
                    const vals = activeAccount.bankPackValues?.[pack.id] || {}
                    return (
                      <div key={pack.id} className="ebp-dynamic-pack-subbox">
                        <div className="ebp-subbox-title">
                          <strong>{pack.name} · Parámetros de esta cuenta</strong>
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
                                      updateAccount(activeAccount.id, {
                                        bankPackValues: {
                                          ...(activeAccount.bankPackValues || {}),
                                          [pack.id]: {
                                            ...vals,
                                            [field.key]: e.target.value,
                                          },
                                        },
                                      })
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
                                      updateAccount(activeAccount.id, {
                                        bankPackValues: {
                                          ...(activeAccount.bankPackValues || {}),
                                          [pack.id]: {
                                            ...vals,
                                            [field.key]: e.target.value,
                                          },
                                        },
                                      })
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
            </div>
          )}
        </div>
      )}
    </div>
  )
}
