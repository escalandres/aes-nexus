import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Download,
  FileCode2,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import type { BankAccount } from '../data/finance'
import {
  downloadEncodedEbpFile,
  formatEbpFilename,
  renderEbpTemplate,
  validateClabeMod10,
  validateEbpFieldValue,
  type BankFormatPack,
  type EbpCurrency,
  type EbpRenderContext,
  type ElectronicPaymentBatch,
  type ElectronicPaymentBatchLine,
} from '../data/ebp'
import { useToast } from './Toast'

export interface EbpWizardCandidateLine {
  sourceLineId: string
  beneficiaryName: string
  beneficiaryCode: string
  rfc?: string
  bankName: string
  clabe: string
  accountNumber?: string
  amount: number
  reference: string
  concept: string
  bankPackValues?: Record<string, Record<string, string>>
}

interface EbpBatchWizardModalProps {
  isOpen: boolean
  batchType: 'Nómina' | 'Proveedores'
  sourceRefId: string
  sourceFolio: string
  currency?: EbpCurrency
  candidates: EbpWizardCandidateLine[]
  packs: BankFormatPack[]
  bankAccounts: BankAccount[]
  existingBatchesCount: number
  onClose: () => void
  onUpdateBankAccountPackValues: (
    accountId: string,
    packId: string,
    values: Record<string, string>
  ) => void
  onCreateBatch: (batch: ElectronicPaymentBatch) => void
}

const money = (value: number, currency: string = 'MXN') =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value)

export function EbpBatchWizardModal({
  isOpen,
  batchType,
  sourceRefId,
  sourceFolio,
  currency = 'MXN',
  candidates,
  packs,
  bankAccounts,
  existingBatchesCount,
  onClose,
  onUpdateBankAccountPackValues,
  onCreateBatch,
}: EbpBatchWizardModalProps) {
  const toast = useToast()

  const compatiblePacks = useMemo(() => {
    const targetOp = batchType === 'Nómina' ? 'payroll' : 'vendor_payment'
    return packs.filter(
      (p) =>
        p.installed &&
        p.licenseActive &&
        (p.operationType === targetOp || p.operationType === 'both') &&
        p.supportedCurrencies.includes(currency)
    )
  }, [packs, batchType, currency])

  const transferAccounts = useMemo(
    () => bankAccounts.filter((b) => b.type !== 'Caja chica'),
    [bankAccounts]
  )

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedBankId, setSelectedBankId] = useState<string>(
    () => transferAccounts[0]?.id || bankAccounts[0]?.id || ''
  )
  const [selectedPackId, setSelectedPackId] = useState<string>(
    () => compatiblePacks[0]?.id || ''
  )
  const [executionDate, setExecutionDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  )
  const [excludedIds, setExcludedIds] = useState<Record<string, boolean>>({})
  const [inlineOverrides, setInlineOverrides] = useState<
    Record<string, { clabe?: string; rfc?: string; custom?: Record<string, string> }>
  >({})
  const [editingLineId, setEditingLineId] = useState<string | null>(null)

  const selectedBank = useMemo(
    () => bankAccounts.find((b) => b.id === selectedBankId) || transferAccounts[0] || bankAccounts[0],
    [bankAccounts, transferAccounts, selectedBankId]
  )

  const selectedPack = useMemo(
    () => compatiblePacks.find((p) => p.id === selectedPackId) || compatiblePacks[0],
    [compatiblePacks, selectedPackId]
  )

  // Company custom values for selected bank + pack
  const companyCustomValues = useMemo(() => {
    if (!selectedPack || !selectedBank) return {}
    const saved = selectedBank.bankPackValues?.[selectedPack.id] || {}
    const merged: Record<string, string> = {}
    selectedPack.companyBankSchema.forEach((f) => {
      merged[f.key] = saved[f.key] ?? f.defaultValue ?? ''
    })
    return merged
  }, [selectedBank, selectedPack])

  const companyFieldErrors = useMemo(() => {
    if (!selectedPack) return []
    const errs: string[] = []
    selectedPack.companyBankSchema.forEach((field) => {
      const err = validateEbpFieldValue(
        field,
        companyCustomValues[field.key],
        selectedPack.embeddedCatalogs
      )
      if (err) errs.push(err)
    })
    return errs
  }, [selectedPack, companyCustomValues])

  // Build validated lines
  const auditedLines: ElectronicPaymentBatchLine[] = useMemo(() => {
    if (!selectedPack || !selectedBank) return []
    const originBankCode = selectedBank.clabe.replace(/\D/g, '').slice(0, 3)

    return candidates.map((c, idx) => {
      const ov = inlineOverrides[c.sourceLineId]
      const clabe = (ov?.clabe ?? c.clabe ?? '').replace(/\s+/g, '')
      const rfc = (ov?.rfc ?? c.rfc ?? '').trim().toUpperCase()
      const savedPack = c.bankPackValues?.[selectedPack.id] || {}
      const customValues: Record<string, string> = {}
      selectedPack.beneficiaryBankSchema.forEach((field) => {
        customValues[field.key] =
          ov?.custom?.[field.key] ?? savedPack[field.key] ?? field.defaultValue ?? ''
      })

      const errors: string[] = []
      if (c.amount <= 0) {
        errors.push('El monto a dispersar debe ser mayor a $0.00')
      }
      const clabeRes = validateClabeMod10(clabe)
      if (!clabeRes.valid) {
        errors.push(clabeRes.reason || 'CLABE inválida')
      }
      selectedPack.beneficiaryBankSchema.forEach((field) => {
        const err = validateEbpFieldValue(
          field,
          customValues[field.key],
          selectedPack.embeddedCatalogs
        )
        if (err) errors.push(err)
      })

      const destBankCode = clabe.slice(0, 3)
      const isSameBank = Boolean(originBankCode && destBankCode && originBankCode === destBankCode)

      return {
        id: `ebpl_${idx + 1}_${c.sourceLineId}`,
        sourceLineId: c.sourceLineId,
        beneficiaryName: c.beneficiaryName,
        beneficiaryCode: c.beneficiaryCode,
        rfc,
        bankName: clabeRes.bankLabel || c.bankName || 'Por identificar',
        clabe,
        accountNumber: c.accountNumber,
        amount: c.amount,
        reference: c.reference,
        concept: c.concept,
        isSameBank,
        customValues,
        validationErrors: errors,
        included: !excludedIds[c.sourceLineId],
      }
    })
  }, [candidates, selectedPack, selectedBank, inlineOverrides, excludedIds])

  const includedLines = useMemo(
    () => auditedLines.filter((l) => l.included),
    [auditedLines]
  )

  const linesWithErrors = useMemo(
    () => includedLines.filter((l) => l.validationErrors.length > 0),
    [includedLines]
  )

  const totalBatchAmount = useMemo(
    () => includedLines.reduce((sum, l) => sum + l.amount, 0),
    [includedLines]
  )

  const hasSufficientFunds = selectedBank ? selectedBank.balance >= totalBatchAmount : false

  const batchFolio = `EBP-2026-${String(existingBatchesCount + 1).padStart(4, '0')}`
  const batchSeq = String(existingBatchesCount + 1).padStart(4, '0')

  const renderContext: EbpRenderContext | null = useMemo(() => {
    if (!selectedBank || !selectedPack) return null
    return {
      company: {
        name: 'AES Nexus Technologies SA de CV',
        rfc: 'AES210412AB1',
        custom: companyCustomValues,
      },
      bankAccount: {
        id: selectedBank.id,
        bankName: selectedBank.bankName,
        accountNumber: selectedBank.accountNumber,
        clabe: selectedBank.clabe,
        currency: selectedBank.currency,
        custom: companyCustomValues,
      },
      batch: {
        folio: batchFolio,
        type: batchType,
        executionDate,
        sequence: batchSeq,
        sourceFolio,
        currency,
        totalAmount: totalBatchAmount,
        operationsCount: includedLines.length,
      },
      payments: includedLines.map((line, i) => ({
        index: i + 1,
        beneficiaryName: line.beneficiaryName,
        beneficiaryCode: line.beneficiaryCode,
        rfc: line.rfc || 'XAXX010101000',
        bankName: line.bankName,
        bankCode: line.clabe.slice(0, 3) || '000',
        clabe: line.clabe,
        accountNumber: line.accountNumber || line.clabe.slice(6, 17),
        amount: line.amount,
        reference: line.reference,
        concept: line.concept,
        isSameBank: line.isSameBank,
        channelType: line.isSameBank ? 'MISMO_BANCO' : 'SPEI',
        custom: line.customValues,
      })),
    }
  }, [
    selectedBank,
    selectedPack,
    companyCustomValues,
    batchFolio,
    batchType,
    executionDate,
    batchSeq,
    sourceFolio,
    currency,
    totalBatchAmount,
    includedLines,
  ])

  const renderedOutput = useMemo(() => {
    if (!selectedPack || !renderContext || includedLines.length === 0) return ''
    return renderEbpTemplate(selectedPack, renderContext)
  }, [selectedPack, renderContext, includedLines.length])

  const generatedFilename = useMemo(() => {
    if (!selectedPack || !renderContext) return `EBP_${batchFolio}.txt`
    return formatEbpFilename(selectedPack, renderContext)
  }, [selectedPack, renderContext, batchFolio])

  if (!isOpen) return null

  const handleGenerateAndDownload = () => {
    if (!selectedPack || !selectedBank) return
    if (companyFieldErrors.length > 0) {
      toast.warning(companyFieldErrors[0], 'Faltan datos bancarios de la empresa')
      setStep(1)
      return
    }
    if (includedLines.length === 0) {
      toast.warning('Incluye al menos un pago en el lote.', 'Lote vacío')
      setStep(2)
      return
    }
    if (linesWithErrors.length > 0) {
      toast.warning(
        `Corrige o excluye los ${linesWithErrors.length} pagos con errores de validación antes de generar el archivo.`,
        'Validación pendiente'
      )
      setStep(2)
      return
    }
    if (!hasSufficientFunds) {
      toast.warning(
        `Saldo insuficiente en ${selectedBank.bankName} (${money(selectedBank.balance)} disponible vs ${money(totalBatchAmount)}).`,
        'Saldo insuficiente'
      )
      return
    }

    const now = new Date()
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    const createdAt = `${String(now.getDate()).padStart(2, '0')} ${months[now.getMonth()]} ${now.getFullYear()} · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    downloadEncodedEbpFile(renderedOutput, generatedFilename, selectedPack.encoding)

    const newBatch: ElectronicPaymentBatch = {
      id: `ebp_batch_${Date.now()}`,
      folio: batchFolio,
      batchType,
      packId: selectedPack.id,
      packName: selectedPack.name,
      packVersion: selectedPack.version,
      bankAccountId: selectedBank.id,
      bankAccountName: `${selectedBank.bankName} (${selectedBank.accountNumber})`,
      currency,
      sourceRefId,
      sourceFolio,
      executionDate,
      operationsCount: includedLines.length,
      totalAmount: totalBatchAmount,
      status: 'Archivo generado',
      generatedFilename,
      generatedContent: renderedOutput,
      encoding: selectedPack.encoding,
      createdAt,
      lines: includedLines,
    }

    onCreateBatch(newBatch)
    toast.success(
      `Archivo ${generatedFilename} (${selectedPack.encoding}) descargado y lote ${batchFolio} registrado en Finanzas.`,
      'Layout bancario generado'
    )
    onClose()
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <section className="create-modal modal-wide ebp-wizard-modal" role="dialog" aria-modal="true">
        <div className="create-modal-heading">
          <div>
            <div className="panel-kicker">
              ELECTRONIC BANK PAYMENTS (EBP) · {batchType.toUpperCase()}
            </div>
            <h2>
              Generar Dispersión Bancaria · {sourceFolio}
            </h2>
            <p>
              Valida parámetros bancarios y exporta el layout oficial listo para cargar en el portal del banco.
            </p>
          </div>
          <button type="button" className="icon-button" aria-label="Cerrar asistente" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Stepper */}
        <div className="ebp-stepper">
          <button
            type="button"
            className={`ebp-step-pill ${step === 1 ? 'active' : step > 1 ? 'done' : ''}`}
            onClick={() => setStep(1)}
          >
            <span>1</span> Banco y Plantilla
          </button>
          <button
            type="button"
            className={`ebp-step-pill ${step === 2 ? 'active' : step > 2 ? 'done' : ''}`}
            onClick={() => compatiblePacks.length > 0 && setStep(2)}
            disabled={compatiblePacks.length === 0}
          >
            <span>2</span> Validador ({includedLines.length})
          </button>
          <button
            type="button"
            className={`ebp-step-pill ${step === 3 ? 'active' : ''}`}
            onClick={() => compatiblePacks.length > 0 && setStep(3)}
            disabled={compatiblePacks.length === 0}
          >
            <span>3</span> Vista Previa y Descarga
          </button>
        </div>

        {compatiblePacks.length === 0 ? (
          <div className="clients-empty" style={{ margin: '18px 0' }}>
            <AlertTriangle size={22} />
            <strong>No hay plantillas bancarias instaladas compatibles con {batchType} ({currency})</strong>
            <span>
              Ingresa a Finanzas &gt; Pagos Bancarios (EBP) &gt; Catálogo de Bancos para instalar o activar una licencia compatible.
            </span>
          </div>
        ) : (
          <div className="ebp-wizard-body">
            {/* STEP 1 */}
            {step === 1 && (
              <div className="ebp-step-content">
                <div className="form-grid-3">
                  <label className="form-field">
                    <span>Cuenta bancaria ordenante *</span>
                    <select
                      value={selectedBank?.id || ''}
                      onChange={(e) => setSelectedBankId(e.target.value)}
                    >
                      {transferAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.bankName} ({acc.accountNumber}) · {money(acc.balance, acc.currency)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Plantilla bancaria instalada (Pack EBP) *</span>
                    <select
                      value={selectedPack?.id || ''}
                      onChange={(e) => setSelectedPackId(e.target.value)}
                    >
                      {compatiblePacks.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.outputExtension} · {p.encoding})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Fecha de aplicación en banco</span>
                    <input
                      type="date"
                      value={executionDate}
                      onChange={(e) => setExecutionDate(e.target.value)}
                    />
                  </label>
                </div>

                {selectedPack && (
                  <div className="ebp-pack-meta-banner">
                    <div>
                      <strong>{selectedPack.name}</strong>
                      <small>{selectedPack.description}</small>
                    </div>
                    <div className="ebp-pack-meta-chips">
                      <span className="emp-code-pill">v{selectedPack.version}</span>
                      <span className="emp-code-pill">{selectedPack.outputExtension.toUpperCase()}</span>
                      <span className="emp-code-pill">{selectedPack.encoding}</span>
                      <span className="emp-code-pill">{selectedPack.supportedCurrencies.join(' / ')}</span>
                    </div>
                  </div>
                )}

                {selectedPack && selectedBank && (
                  <div className="ebp-company-fields-box">
                    <div className="ebp-box-head">
                      <div>
                        <Building2 size={14} />
                        <strong>
                          Parámetros de empresa requeridos por {selectedPack.bankName} ({selectedBank.bankName})
                        </strong>
                      </div>
                      {companyFieldErrors.length === 0 ? (
                        <span className="ebp-valid-tag ok">
                          <CheckCircle2 size={12} /> Datos de empresa completos
                        </span>
                      ) : (
                        <span className="ebp-valid-tag err">
                          <AlertTriangle size={12} /> {companyFieldErrors.length} campo(s) pendiente(s)
                        </span>
                      )}
                    </div>

                    <div className="form-grid-3" style={{ marginTop: 10 }}>
                      {selectedPack.companyBankSchema.map((field) => {
                        const val = companyCustomValues[field.key] ?? ''
                        const err = validateEbpFieldValue(
                          field,
                          val,
                          selectedPack.embeddedCatalogs
                        )
                        const cat = field.catalogRef
                          ? selectedPack.embeddedCatalogs[field.catalogRef]
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
                                  onUpdateBankAccountPackValues(
                                    selectedBank.id,
                                    selectedPack.id,
                                    { ...companyCustomValues, [field.key]: e.target.value }
                                  )
                                }
                              >
                                <option value="">Selecciona opción del banco...</option>
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
                                maxLength={field.validators.maxLength}
                                onChange={(e) =>
                                  onUpdateBankAccountPackValues(
                                    selectedBank.id,
                                    selectedPack.id,
                                    { ...companyCustomValues, [field.key]: e.target.value }
                                  )
                                }
                              />
                            )}
                            {err ? (
                              <small className="ebp-field-err">{err}</small>
                            ) : field.helpText ? (
                              <small className="ebp-field-hint">{field.helpText}</small>
                            ) : null}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && selectedPack && selectedBank && (
              <div className="ebp-step-content">
                <div className="ebp-audit-summary-row">
                  <div className="ebp-audit-stat">
                    <span>Pagos incluidos</span>
                    <strong>
                      {includedLines.length} de {auditedLines.length}
                    </strong>
                  </div>
                  <div className="ebp-audit-stat">
                    <span>Importe total del lote</span>
                    <strong className="mono">{money(totalBatchAmount, currency)}</strong>
                  </div>
                  <div className="ebp-audit-stat">
                    <span>Saldo en {selectedBank.bankName}</span>
                    <strong className={`mono ${hasSufficientFunds ? 'text-positive' : 'text-alert'}`}>
                      {money(selectedBank.balance, selectedBank.currency)}
                    </strong>
                  </div>
                  <div className="ebp-audit-stat">
                    <span>Estado de validación</span>
                    {linesWithErrors.length === 0 && companyFieldErrors.length === 0 && hasSufficientFunds ? (
                      <span className="ebp-valid-tag ok">
                        <ShieldCheck size={12} /> Listo para exportar
                      </span>
                    ) : (
                      <span className="ebp-valid-tag err">
                        <AlertTriangle size={12} /> {linesWithErrors.length} línea(s) con incidencias
                      </span>
                    )}
                  </div>
                </div>

                <div className="table-wrap ops-table-wrap" style={{ maxHeight: 330, overflowY: 'auto' }}>
                  <table className="data-table ops-data-table">
                    <thead>
                      <tr>
                        <th style={{ width: 32 }}>INC.</th>
                        <th>BENEFICIARIO</th>
                        <th>CLABE / BANCO</th>
                        <th>CAMPOS DEL PACK</th>
                        <th style={{ textAlign: 'right' }}>IMPORTE</th>
                        <th>VALIDACIÓN</th>
                        <th style={{ textAlign: 'right' }}>AJUSTE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditedLines.map((line) => {
                        const isEditing = editingLineId === line.sourceLineId
                        const hasErr = line.validationErrors.length > 0
                        return (
                          <tr
                            key={line.id}
                            className={!line.included ? 'payroll-row-muted' : hasErr ? 'row-warning' : ''}
                          >
                            <td>
                              <input
                                type="checkbox"
                                checked={line.included}
                                onChange={(e) =>
                                  setExcludedIds((prev) => ({
                                    ...prev,
                                    [line.sourceLineId]: !e.target.checked,
                                  }))
                                }
                              />
                            </td>
                            <td>
                              <div className="supplier-cell">
                                <strong>{line.beneficiaryName}</strong>
                                <small className="mono">
                                  {line.beneficiaryCode} · {line.rfc || 'Sin RFC'}
                                </small>
                              </div>
                            </td>
                            <td>
                              {isEditing ? (
                                <input
                                  className="ebp-inline-input mono"
                                  value={line.clabe}
                                  maxLength={18}
                                  onChange={(e) =>
                                    setInlineOverrides((prev) => ({
                                      ...prev,
                                      [line.sourceLineId]: {
                                        ...prev[line.sourceLineId],
                                        clabe: e.target.value,
                                      },
                                    }))
                                  }
                                />
                              ) : (
                                <div className="supplier-cell">
                                  <strong className="mono">{line.clabe || 'Sin CLABE'}</strong>
                                  <small>
                                    {line.bankName} · {line.isSameBank ? 'Mismo banco' : 'SPEI'}
                                  </small>
                                </div>
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <div className="ebp-inline-pack-edits">
                                  {selectedPack.beneficiaryBankSchema.map((field) => {
                                    const cat = field.catalogRef
                                      ? selectedPack.embeddedCatalogs[field.catalogRef]
                                      : undefined
                                    const val = line.customValues[field.key] ?? ''
                                    return field.type === 'select_catalog' && cat ? (
                                      <select
                                        key={field.key}
                                        className="ebp-inline-input"
                                        value={val}
                                        onChange={(e) =>
                                          setInlineOverrides((prev) => ({
                                            ...prev,
                                            [line.sourceLineId]: {
                                              ...prev[line.sourceLineId],
                                              custom: {
                                                ...line.customValues,
                                                [field.key]: e.target.value,
                                              },
                                            },
                                          }))
                                        }
                                      >
                                        <option value="">{field.label}...</option>
                                        {cat.options.map((opt) => (
                                          <option key={opt.code} value={opt.code}>
                                            {opt.label}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <input
                                        key={field.key}
                                        className="ebp-inline-input"
                                        placeholder={field.label}
                                        value={val}
                                        onChange={(e) =>
                                          setInlineOverrides((prev) => ({
                                            ...prev,
                                            [line.sourceLineId]: {
                                              ...prev[line.sourceLineId],
                                              custom: {
                                                ...line.customValues,
                                                [field.key]: e.target.value,
                                              },
                                            },
                                          }))
                                        }
                                      />
                                    )
                                  })}
                                </div>
                              ) : (
                                <div className="ebp-mini-kv-list">
                                  {selectedPack.beneficiaryBankSchema.map((f) => (
                                    <span key={f.key} className="ebp-mini-kv">
                                      {f.label}: <strong className="mono">{line.customValues[f.key] || '—'}</strong>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }} className="money-cell mono">
                              <strong>{money(line.amount, currency)}</strong>
                            </td>
                            <td>
                              {!line.included ? (
                                <span className="emp-code-pill">Excluido</span>
                              ) : hasErr ? (
                                <div className="ebp-err-stack">
                                  {line.validationErrors.map((err, ei) => (
                                    <span key={ei} className="ebp-valid-tag err">
                                      <AlertTriangle size={10} /> {err}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="ebp-valid-tag ok">
                                  <CheckCircle2 size={11} /> Válido
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className="button-icon-action"
                                onClick={() =>
                                  setEditingLineId(isEditing ? null : line.sourceLineId)
                                }
                              >
                                <SlidersHorizontal size={11} /> {isEditing ? 'Listo' : 'Corregir'}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && selectedPack && (
              <div className="ebp-step-content">
                <div className="ebp-preview-meta-bar">
                  <div>
                    <FileCode2 size={15} />
                    <strong>{generatedFilename}</strong>
                  </div>
                  <div className="ebp-pack-meta-chips">
                    <span className="emp-code-pill">Codificación: {selectedPack.encoding}</span>
                    <span className="emp-code-pill">Fin de línea: {selectedPack.lineEnding}</span>
                    <span className="emp-code-pill">
                      {renderedOutput.split(/\r?\n/).length} líneas · {renderedOutput.length} chars
                    </span>
                  </div>
                </div>

                {(linesWithErrors.length > 0 || companyFieldErrors.length > 0 || !hasSufficientFunds) && (
                  <div className="ebp-warning-box">
                    <AlertTriangle size={15} />
                    <div>
                      <strong>No es posible descargar hasta resolver las validaciones:</strong>
                      <p>
                        {companyFieldErrors[0] ||
                          (!hasSufficientFunds
                            ? 'Saldo insuficiente en la cuenta bancaria seleccionada.'
                            : `${linesWithErrors.length} línea(s) de pago presentan errores de CLABE o campos del banco.`)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="ebp-code-preview-box">
                  {renderedOutput
                    .split(/\r?\n/)
                    .map((line, idx) => (
                      <div key={idx} className="ebp-code-line">
                        <span className="ebp-line-no">{String(idx + 1).padStart(2, '0')}</span>
                        <span className="ebp-line-len">{line.length}c</span>
                        <code>{line || ' '}</code>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="create-modal-actions" style={{ justifyContent: 'space-between', marginTop: 14 }}>
          <div>
            {step > 1 && compatiblePacks.length > 0 && (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
              >
                <ArrowLeft size={14} /> Anterior
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="button button-secondary" onClick={onClose}>
              Cancelar
            </button>
            {compatiblePacks.length > 0 && step < 3 && (
              <button
                type="button"
                className="button button-primary"
                onClick={() => setStep((s) => (s === 1 ? 2 : 3))}
              >
                Siguiente <ArrowRight size={14} />
              </button>
            )}
            {compatiblePacks.length > 0 && step === 3 && (
              <button
                type="button"
                className="button button-primary"
                disabled={
                  linesWithErrors.length > 0 ||
                  companyFieldErrors.length > 0 ||
                  includedLines.length === 0 ||
                  !hasSufficientFunds
                }
                onClick={handleGenerateAndDownload}
              >
                <Download size={14} /> Descargar {selectedPack?.outputExtension} y registrar lote
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
