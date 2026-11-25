import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  FileCode2,
  Landmark,
  Layers,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import type { BankAccount } from '../data/finance'
import {
  downloadEncodedEbpFile,
  formatEbpFilename,
  getPreferredSupplierBankAccount,
  normalizeSupplierBankAccounts,
  renderEbpTemplate,
  validateClabeMod10,
  validateEbpFieldValue,
  type BankFormatPack,
  type EbpAggregationMode,
  type EbpBillAllocation,
  type EbpCurrency,
  type EbpRenderContext,
  type ElectronicPaymentBatch,
  type ElectronicPaymentBatchLine,
  type SupplierBankAccount,
  type SupplierBankProfile,
} from '../data/ebp'
import { SupplierBankAccountsManager } from './SupplierBankAccountsManager'
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
  // Multi-banco y consolidación de facturas de proveedor
  supplierKey?: string
  billId?: string
  billFolio?: string
  purchaseOrderFolio?: string
  dueDate?: string
  currency?: EbpCurrency
  availableBankAccounts?: SupplierBankAccount[]
  selectedBankAccountId?: string
}

interface EbpBatchWizardModalProps {
  isOpen: boolean
  batchType: 'Nómina' | 'Proveedores'
  defaultAggregationMode?: EbpAggregationMode
  sourceRefId: string
  sourceFolio: string
  currency?: EbpCurrency
  candidates: EbpWizardCandidateLine[]
  suppliers?: SupplierBankProfile[]
  usedSupplierBankAccountIds?: Set<string>
  packs: BankFormatPack[]
  bankAccounts: BankAccount[]
  existingBatchesCount: number
  onClose: () => void
  onUpdateBankAccountPackValues: (
    accountId: string,
    packId: string,
    values: Record<string, string>
  ) => void
  onUpdateSupplierBankAccounts?: (
    supplierCompany: string,
    nextAccounts: SupplierBankAccount[]
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
  defaultAggregationMode,
  sourceRefId,
  sourceFolio,
  currency = 'MXN',
  candidates,
  suppliers,
  usedSupplierBankAccountIds,
  packs,
  bankAccounts,
  existingBatchesCount,
  onClose,
  onUpdateBankAccountPackValues,
  onUpdateSupplierBankAccounts,
  onCreateBatch,
}: EbpBatchWizardModalProps) {
  const toast = useToast()
  const isVendorBatch = batchType === 'Proveedores'

  const effectiveCurrency: EbpCurrency = useMemo(() => {
    if (!isVendorBatch) return currency
    return candidates[0]?.currency || currency
  }, [isVendorBatch, candidates, currency])

  const compatiblePacks = useMemo(() => {
    const targetOp = batchType === 'Nómina' ? 'payroll' : 'vendor_payment'
    return packs.filter(
      (p) =>
        p.installed &&
        p.licenseActive &&
        (p.operationType === targetOp || p.operationType === 'both') &&
        p.supportedCurrencies.includes(effectiveCurrency)
    )
  }, [packs, batchType, effectiveCurrency])

  const transferAccounts = useMemo(
    () => bankAccounts.filter((b) => b.type !== 'Caja chica'),
    [bankAccounts]
  )

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [aggregationMode, setAggregationMode] = useState<EbpAggregationMode>(() => {
    if (!isVendorBatch) return 'individual'
    if (defaultAggregationMode) return defaultAggregationMode
    return candidates.length > 1 ? 'consolidated' : 'individual'
  })

  const [selectedBankId, setSelectedBankId] = useState<string>(() => {
    const matchingCurrencyAcc = transferAccounts.find((b) => b.currency === effectiveCurrency)
    return matchingCurrencyAcc?.id || transferAccounts[0]?.id || bankAccounts[0]?.id || ''
  })
  const [selectedPackId, setSelectedPackId] = useState<string>(
    () => compatiblePacks[0]?.id || ''
  )
  const [executionDate, setExecutionDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  )

  // Per-candidate inclusion & editable payment amount (bill balances / partial payments)
  const [excludedSourceIds, setExcludedSourceIds] = useState<Record<string, boolean>>({})
  const [amountOverrides, setAmountOverrides] = useState<Record<string, number>>({})

  // Dynamic lookup of supplier accounts managed by SupplierBankAccountsManager
  const supplierAccountsByKey = useMemo(() => {
    const map = new Map<string, { company: string; currency: EbpCurrency; accounts: SupplierBankAccount[] }>()
    if (suppliers) {
      suppliers.forEach((sup) => {
        const key = sup.company.toLowerCase()
        const normalized = normalizeSupplierBankAccounts({
          company: sup.company,
          currency: sup.currency || currency,
          bankName: sup.bankName,
          clabe: sup.clabe,
          accountNumber: sup.accountNumber,
          defaultReference: sup.defaultReference,
          bankPackValues: sup.bankPackValues,
          bankAccounts: sup.bankAccounts,
        })
        map.set(key, {
          company: sup.company,
          currency: sup.currency || currency,
          accounts: normalized,
        })
      })
    }
    return map
  }, [suppliers, currency])

  const resolveCandidateAccounts = (c: EbpWizardCandidateLine): SupplierBankAccount[] => {
    const sKey = (c.supplierKey || c.beneficiaryName).toLowerCase()
    const live = supplierAccountsByKey.get(sKey)
    if (live) return live.accounts
    return c.availableBankAccounts || []
  }

  // Destination supplier bank account selection:
  // - in individual mode: keyed by sourceLineId
  // - in consolidated mode: keyed by supplierKey
  const [individualBankSelection, setIndividualBankSelection] = useState<Record<string, string>>(
    () => {
      const init: Record<string, string> = {}
      candidates.forEach((c) => {
        const liveAccounts = resolveCandidateAccounts(c)
        if (c.selectedBankAccountId && liveAccounts.some((a) => a.id === c.selectedBankAccountId)) {
          init[c.sourceLineId] = c.selectedBankAccountId
        } else if (liveAccounts.length > 0) {
          const pref = getPreferredSupplierBankAccount(
            liveAccounts,
            c.currency || effectiveCurrency
          )
          if (pref) init[c.sourceLineId] = pref.id
        }
      })
      return init
    }
  )

  const [consolidatedBankSelection, setConsolidatedBankSelection] = useState<
    Record<string, string>
  >(() => {
    const init: Record<string, string> = {}
    candidates.forEach((c) => {
      const sKey = (c.supplierKey || c.beneficiaryName).toLowerCase()
      if (init[sKey]) return
      const liveAccounts = resolveCandidateAccounts(c)
      if (c.selectedBankAccountId && liveAccounts.some((a) => a.id === c.selectedBankAccountId)) {
        init[sKey] = c.selectedBankAccountId
      } else if (liveAccounts.length > 0) {
        const pref = getPreferredSupplierBankAccount(
          liveAccounts,
          c.currency || effectiveCurrency
        )
        if (pref) init[sKey] = pref.id
      }
    })
    return init
  })

  // Mandatory consolidated payment reason per supplier + optional individual concept edit
  const [consolidatedReasons, setConsolidatedReasons] = useState<Record<string, string>>({})
  const [individualReasons, setIndividualReasons] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    candidates.forEach((c) => {
      init[c.sourceLineId] = c.concept
    })
    return init
  })

  // Expandable consolidated bill breakdown accordion
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    candidates.forEach((c) => {
      const sKey = (c.supplierKey || c.beneficiaryName).toLowerCase()
      init[sKey] = true
    })
    return init
  })

  // Inline overrides for quick fixes (CLABE / RFC / dynamic pack fields)
  const [inlineOverrides, setInlineOverrides] = useState<
    Record<string, { clabe?: string; rfc?: string; custom?: Record<string, string> }>
  >({})
  const [editingLineId, setEditingLineId] = useState<string | null>(null)
  const [editedSupplierCatalogs, setEditedSupplierCatalogs] = useState<Record<string, boolean>>({})
  const [previewSubTab, setPreviewSubTab] = useState<'verification' | 'raw'>('verification')

  // Freeze initial per-line / per-supplier baseline when wizard opens for accurate change diffing
  const [initialBaseline] = useState(() => {
    const byLine: Record<
      string,
      {
        supplierKey: string
        beneficiaryName: string
        billFolio: string
        accountId?: string
        alias: string
        bankName: string
        clabe: string
        amount: number
        concept: string
      }
    > = {}
    candidates.forEach((c) => {
      const sKey = (c.supplierKey || c.beneficiaryName).toLowerCase()
      const liveAccs = resolveCandidateAccounts(c)
      const initAcc =
        liveAccs.find((a) => a.id === c.selectedBankAccountId) ||
        getPreferredSupplierBankAccount(liveAccs, c.currency || effectiveCurrency)
      byLine[c.sourceLineId] = {
        supplierKey: sKey,
        beneficiaryName: c.beneficiaryName,
        billFolio: c.billFolio || c.beneficiaryCode,
        accountId: initAcc?.id ?? c.selectedBankAccountId,
        alias: initAcc?.alias || (initAcc?.bankName ? `${initAcc.bankName} (Única)` : 'Sin alias'),
        bankName: initAcc?.bankName || c.bankName || '',
        clabe: (initAcc?.clabe || c.clabe || '').replace(/\s+/g, ''),
        amount: c.amount,
        concept: c.concept,
      }
    })
    return byLine
  })

  // Inline modal to manage supplier bank details via SupplierBankAccountsManager without leaving wizard
  const [bankManagerTarget, setBankManagerTarget] = useState<{
    supplierKey: string
    supplierCompany: string
    targetSelectionKey: string
    selectionMode: 'individual' | 'consolidated'
    draftAccounts: SupplierBankAccount[]
    defaultCurrency: EbpCurrency
  } | null>(null)

  const selectedBank = useMemo(
    () =>
      bankAccounts.find((b) => b.id === selectedBankId) ||
      transferAccounts[0] ||
      bankAccounts[0],
    [bankAccounts, transferAccounts, selectedBankId]
  )

  const selectedPack = useMemo(
    () => compatiblePacks.find((p) => p.id === selectedPackId) || compatiblePacks[0],
    [compatiblePacks, selectedPackId]
  )

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

  // Check if mixed currencies were passed in vendor bills
  const distinctCandidateCurrencies = useMemo(() => {
    if (!isVendorBatch) return [effectiveCurrency]
    const set = new Set<EbpCurrency>()
    candidates.forEach((c) => {
      if (!excludedSourceIds[c.sourceLineId]) {
        set.add(c.currency || effectiveCurrency)
      }
    })
    return Array.from(set)
  }, [isVendorBatch, candidates, excludedSourceIds, effectiveCurrency])

  const hasMixedCurrencies = distinctCandidateCurrencies.length > 1

  // Build validated lines (Individual OR Consolidated by supplier)
  const auditedLines: ElectronicPaymentBatchLine[] = useMemo(() => {
    if (!selectedPack || !selectedBank) return []
    const originBankCode = selectedBank.clabe.replace(/\D/g, '').slice(0, 3)

    // Payroll or Individual Vendor Mode
    if (!isVendorBatch || aggregationMode === 'individual') {
      return candidates.map((c, idx) => {
        const lineKey = c.sourceLineId
        const ov = inlineOverrides[lineKey]
        const availableAccounts = resolveCandidateAccounts(c)
        const selectedAccId = individualBankSelection[c.sourceLineId]
        const chosenAcc =
          availableAccounts.find((a) => a.id === selectedAccId) ||
          getPreferredSupplierBankAccount(availableAccounts, c.currency || effectiveCurrency)

        const rawClabe = ov?.clabe ?? chosenAcc?.clabe ?? c.clabe ?? ''
        const clabe = rawClabe.replace(/\s+/g, '')
        const rfc = (ov?.rfc ?? c.rfc ?? '').trim().toUpperCase()
        const sourcePackValues = chosenAcc?.bankPackValues || c.bankPackValues || {}
        const savedPack = sourcePackValues[selectedPack.id] || {}
        const customValues: Record<string, string> = {}
        selectedPack.beneficiaryBankSchema.forEach((field) => {
          customValues[field.key] =
            ov?.custom?.[field.key] ?? savedPack[field.key] ?? field.defaultValue ?? ''
        })

        const payAmt =
          amountOverrides[c.sourceLineId] !== undefined
            ? amountOverrides[c.sourceLineId]
            : c.amount

        const billCurrency = c.currency || effectiveCurrency
        const errors: string[] = []
        if (payAmt <= 0) {
          errors.push('El monto a dispersar debe ser mayor a $0.00')
        }
        if (isVendorBatch && payAmt > c.amount) {
          errors.push(`El importe excede el saldo pendiente (${money(c.amount, billCurrency)})`)
        }
        if (isVendorBatch && availableAccounts.length === 0 && !clabe) {
          errors.push('Proveedor sin detalle bancario registrado')
        }
        if (chosenAcc && chosenAcc.active === false) {
          errors.push(`La cuenta "${chosenAcc.alias}" está inactiva`)
        }
        if (chosenAcc && chosenAcc.currency !== billCurrency) {
          errors.push(
            `Moneda incompatible: factura ${billCurrency} vs cuenta ${chosenAcc.currency}`
          )
        }
        if (selectedBank.currency !== billCurrency) {
          errors.push(
            `Cuenta empresa (${selectedBank.currency}) no coincide con factura (${billCurrency})`
          )
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
        const isSameBank = Boolean(
          originBankCode && destBankCode && originBankCode === destBankCode
        )
        const reason = (individualReasons[c.sourceLineId] ?? c.concept ?? '').trim()

        const allocations: EbpBillAllocation[] | undefined = isVendorBatch
          ? [
              {
                billId: c.billId || c.sourceLineId,
                billFolio: c.billFolio || c.beneficiaryCode,
                purchaseOrderFolio: c.purchaseOrderFolio,
                dueDate: c.dueDate,
                currency: billCurrency,
                originalBalance: c.amount,
                amountToPay: payAmt,
              },
            ]
          : undefined

        return {
          id: `ebpl_${idx + 1}_${c.sourceLineId}`,
          sourceLineId: c.sourceLineId,
          beneficiaryName: c.beneficiaryName,
          beneficiaryCode: c.beneficiaryCode,
          rfc,
          bankName: clabeRes.bankLabel || chosenAcc?.bankName || c.bankName || 'Por identificar',
          clabe,
          accountNumber: chosenAcc?.accountNumber ?? c.accountNumber,
          amount: payAmt,
          reference: chosenAcc?.defaultReference || c.reference,
          concept: reason || c.concept,
          paymentReason: reason || c.concept,
          isSameBank,
          customValues,
          validationErrors: errors,
          included: !excludedSourceIds[c.sourceLineId],
          aggregationMode: 'individual',
          selectedBankAccountId: chosenAcc?.id,
          selectedBankAlias: chosenAcc?.alias,
          billAllocations: allocations,
        }
      })
    }

    // Consolidated Vendor Mode: 1 line per supplier (aggregating all open bills of that supplier)
    const groupsMap = new Map<
      string,
      {
        supplierKey: string
        beneficiaryName: string
        rfc?: string
        items: EbpWizardCandidateLine[]
      }
    >()

    candidates.forEach((c) => {
      const sKey = (c.supplierKey || c.beneficiaryName).toLowerCase()
      const existing = groupsMap.get(sKey)
      if (existing) {
        existing.items.push(c)
      } else {
        groupsMap.set(sKey, {
          supplierKey: sKey,
          beneficiaryName: c.beneficiaryName,
          rfc: c.rfc,
          items: [c],
        })
      }
    })

    const groupedLines: ElectronicPaymentBatchLine[] = []
    let groupIdx = 0

    groupsMap.forEach((group) => {
      groupIdx += 1
      const sKey = group.supplierKey
      const lineKey = `group_${sKey}`
      const firstItem = group.items[0]
      const availableAccounts = resolveCandidateAccounts(firstItem)
      const selectedAccId = consolidatedBankSelection[sKey]
      const chosenAcc =
        availableAccounts.find((a) => a.id === selectedAccId) ||
        getPreferredSupplierBankAccount(
          availableAccounts,
          firstItem.currency || effectiveCurrency
        )

      const includedItems = group.items.filter((it) => !excludedSourceIds[it.sourceLineId])
      const activeItems = includedItems.length > 0 ? includedItems : group.items

      const allocations: EbpBillAllocation[] = activeItems.map((it) => {
        const payAmt =
          amountOverrides[it.sourceLineId] !== undefined
            ? amountOverrides[it.sourceLineId]
            : it.amount
        return {
          billId: it.billId || it.sourceLineId,
          billFolio: it.billFolio || it.beneficiaryCode,
          purchaseOrderFolio: it.purchaseOrderFolio,
          dueDate: it.dueDate,
          currency: it.currency || effectiveCurrency,
          originalBalance: it.amount,
          amountToPay: payAmt,
        }
      })

      const totalGroupAmount = allocations.reduce((sum, a) => sum + a.amountToPay, 0)
      const foliosSummary = allocations.map((a) => a.billFolio).join(', ')

      const ov = inlineOverrides[lineKey]
      const rawClabe = ov?.clabe ?? chosenAcc?.clabe ?? firstItem.clabe ?? ''
      const clabe = rawClabe.replace(/\s+/g, '')
      const rfc = (ov?.rfc ?? group.rfc ?? '').trim().toUpperCase()
      const sourcePackValues = chosenAcc?.bankPackValues || firstItem.bankPackValues || {}
      const savedPack = sourcePackValues[selectedPack.id] || {}
      const customValues: Record<string, string> = {}
      selectedPack.beneficiaryBankSchema.forEach((field) => {
        customValues[field.key] =
          ov?.custom?.[field.key] ?? savedPack[field.key] ?? field.defaultValue ?? ''
      })

      const reason = (consolidatedReasons[sKey] || '').trim()
      const errors: string[] = []

      if (!reason) {
        errors.push(
          `Captura el motivo del pago para ${group.beneficiaryName}`
        )
      }
      if (totalGroupAmount <= 0) {
        errors.push('El monto consolidado a dispersar debe ser mayor a $0.00')
      }
      allocations.forEach((alloc) => {
        if (alloc.amountToPay <= 0) {
          errors.push(`Factura ${alloc.billFolio}: el abono debe ser mayor a $0.00`)
        } else if (alloc.amountToPay > alloc.originalBalance) {
          errors.push(
            `Factura ${alloc.billFolio}: excede saldo pendiente (${money(alloc.originalBalance, alloc.currency)})`
          )
        }
      })

      const groupCurrencies = Array.from(new Set(allocations.map((a) => a.currency)))
      if (groupCurrencies.length > 1) {
        errors.push(`Facturas en monedas distintas (${groupCurrencies.join(' / ')})`)
      }
      const primaryBillCurrency = groupCurrencies[0] || effectiveCurrency

      if (availableAccounts.length === 0 && !clabe) {
        errors.push('Proveedor sin detalle bancario registrado')
      }
      if (chosenAcc && chosenAcc.active === false) {
        errors.push(`La cuenta "${chosenAcc.alias}" está inactiva`)
      }
      if (chosenAcc && chosenAcc.currency !== primaryBillCurrency) {
        errors.push(
          `Moneda incompatible: facturas ${primaryBillCurrency} vs cuenta ${chosenAcc.currency}`
        )
      }
      if (selectedBank.currency !== primaryBillCurrency) {
        errors.push(
          `Cuenta empresa (${selectedBank.currency}) no coincide con facturas (${primaryBillCurrency})`
        )
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
      const isSameBank = Boolean(
        originBankCode && destBankCode && originBankCode === destBankCode
      )

      groupedLines.push({
        id: `ebpl_grp_${groupIdx}_${sKey}`,
        sourceLineId: lineKey,
        beneficiaryName: group.beneficiaryName,
        beneficiaryCode:
          allocations.length > 1
            ? `${allocations.length} fact. (${foliosSummary})`
            : allocations[0]?.billFolio || firstItem.beneficiaryCode,
        rfc,
        bankName:
          clabeRes.bankLabel || chosenAcc?.bankName || firstItem.bankName || 'Por identificar',
        clabe,
        accountNumber: chosenAcc?.accountNumber ?? firstItem.accountNumber,
        amount: totalGroupAmount,
        reference: chosenAcc?.defaultReference || firstItem.reference,
        concept: reason ? `${reason} · ${foliosSummary}` : `PAGO ${foliosSummary}`,
        paymentReason: reason,
        isSameBank,
        customValues,
        validationErrors: errors,
        included: includedItems.length > 0,
        aggregationMode: 'consolidated',
        selectedBankAccountId: chosenAcc?.id,
        selectedBankAlias: chosenAcc?.alias,
        billAllocations: allocations,
      })
    })

    return groupedLines
  }, [
    selectedPack,
    selectedBank,
    isVendorBatch,
    aggregationMode,
    candidates,
    inlineOverrides,
    individualBankSelection,
    consolidatedBankSelection,
    amountOverrides,
    excludedSourceIds,
    individualReasons,
    consolidatedReasons,
    effectiveCurrency,
    supplierAccountsByKey,
  ])

  const includedLines = useMemo(
    () => auditedLines.filter((l) => l.included),
    [auditedLines]
  )

  const linesWithErrors = useMemo(
    () => includedLines.filter((l) => l.validationErrors.length > 0),
    [includedLines]
  )

  const missingConsolidatedReasons = useMemo(
    () =>
      isVendorBatch && aggregationMode === 'consolidated'
        ? includedLines.filter((l) => !(l.paymentReason || '').trim())
        : [],
    [isVendorBatch, aggregationMode, includedLines]
  )

  const totalBatchAmount = useMemo(
    () => includedLines.reduce((sum, l) => sum + l.amount, 0),
    [includedLines]
  )

  const totalBillsIncluded = useMemo(() => {
    if (!isVendorBatch) return includedLines.length
    return includedLines.reduce(
      (sum, l) => sum + (l.billAllocations?.length || 1),
      0
    )
  }, [isVendorBatch, includedLines])

  const hasSufficientFunds = selectedBank ? selectedBank.balance >= totalBatchAmount : false

  // Per-supplier change summary comparing current batch configuration vs initial baseline
  const supplierChangesSummary = useMemo(() => {
    const groups = new Map<
      string,
      {
        supplierKey: string
        beneficiaryName: string
        initialBillsCount: number
        includedBillsCount: number
        initialTotal: number
        currentTotal: number
        hasChanges: boolean
        changes: Array<{ kind: 'bank' | 'amount' | 'excluded' | 'override' | 'catalog' | 'reason'; title: string; detail: string }>
        selectedAliases: string[]
      }
    >()

    candidates.forEach((c) => {
      const sKey = (c.supplierKey || c.beneficiaryName).toLowerCase()
      if (!groups.has(sKey)) {
        groups.set(sKey, {
          supplierKey: sKey,
          beneficiaryName: c.beneficiaryName,
          initialBillsCount: 0,
          includedBillsCount: 0,
          initialTotal: 0,
          currentTotal: 0,
          hasChanges: false,
          changes: [],
          selectedAliases: [],
        })
      }
      const g = groups.get(sKey)!
      g.initialBillsCount += 1
      g.initialTotal += c.amount
    })

    groups.forEach((g, sKey) => {
      const supCandidates = candidates.filter(
        (c) => (c.supplierKey || c.beneficiaryName).toLowerCase() === sKey
      )
      const excludedCandidates = supCandidates.filter((c) => excludedSourceIds[c.sourceLineId])
      const activeCandidates = supCandidates.filter((c) => !excludedSourceIds[c.sourceLineId])
      g.includedBillsCount = activeCandidates.length

      if (editedSupplierCatalogs[sKey]) {
        g.hasChanges = true
        g.changes.push({
          kind: 'catalog',
          title: 'Catálogo de cuentas actualizado',
          detail: 'Se modificaron o agregaron detalles bancarios del proveedor durante este lote.',
        })
      }

      if (excludedCandidates.length > 0) {
        g.hasChanges = true
        g.changes.push({
          kind: 'excluded',
          title:
            excludedCandidates.length === supCandidates.length
              ? 'Proveedor excluido del lote'
              : `${excludedCandidates.length} documento(s) excluido(s)`,
          detail: excludedCandidates.map((e) => e.billFolio || e.beneficiaryCode).join(', '),
        })
      }

      if (!isVendorBatch || aggregationMode === 'individual') {
        const supLines = includedLines.filter((l) => {
          const base = initialBaseline[l.sourceLineId]
          return (base?.supplierKey || l.beneficiaryName.toLowerCase()) === sKey
        })
        supLines.forEach((line) => {
          g.currentTotal += line.amount
          const base = initialBaseline[line.sourceLineId]
          const currentAlias = line.selectedBankAlias || `${line.bankName} (••••${line.clabe.slice(-4)})`
          if (!g.selectedAliases.includes(currentAlias)) g.selectedAliases.push(currentAlias)

          if (base && isVendorBatch) {
            if (
              (line.selectedBankAccountId && base.accountId && line.selectedBankAccountId !== base.accountId) ||
              (!line.selectedBankAccountId && line.clabe !== base.clabe)
            ) {
              g.hasChanges = true
              g.changes.push({
                kind: 'bank',
                title: `Cuenta cambiada (${base.billFolio})`,
                detail: `"${base.alias}" → "${currentAlias}" (CLABE ••••${line.clabe.slice(-4)})`,
              })
            }
            if (Math.abs(line.amount - base.amount) > 0.009) {
              g.hasChanges = true
              g.changes.push({
                kind: 'amount',
                title: `Abono modificado (${base.billFolio})`,
                detail: `${money(base.amount, effectiveCurrency)} → ${money(line.amount, effectiveCurrency)}`,
              })
            }
            if (inlineOverrides[line.sourceLineId]) {
              g.hasChanges = true
              g.changes.push({
                kind: 'override',
                title: `Ajuste manual CLABE / Pack (${base.billFolio})`,
                detail: `Se aplicaron valores personalizados para la dispersión.`,
              })
            }
            if ((line.paymentReason || '').trim() && (line.paymentReason || '').trim() !== base.concept.trim()) {
              g.hasChanges = true
              g.changes.push({
                kind: 'reason',
                title: `Concepto / Motivo editado (${base.billFolio})`,
                detail: line.paymentReason || '',
              })
            }
          }
        })
      } else {
        const groupLine = includedLines.find((l) => l.sourceLineId === `group_${sKey}`)
        const firstBase = supCandidates[0] ? initialBaseline[supCandidates[0].sourceLineId] : undefined
        if (groupLine) {
          g.currentTotal = groupLine.amount
          const currentAlias =
            groupLine.selectedBankAlias || `${groupLine.bankName} (••••${groupLine.clabe.slice(-4)})`
          g.selectedAliases.push(currentAlias)

          if (firstBase) {
            if (
              (groupLine.selectedBankAccountId &&
                firstBase.accountId &&
                groupLine.selectedBankAccountId !== firstBase.accountId) ||
              (!groupLine.selectedBankAccountId && groupLine.clabe !== firstBase.clabe)
            ) {
              g.hasChanges = true
              g.changes.push({
                kind: 'bank',
                title: 'Cuenta bancaria destino modificada',
                detail: `"${firstBase.alias}" → "${currentAlias}" (${groupLine.bankName} · ••••${groupLine.clabe.slice(-4)})`,
              })
            }
          }

          (groupLine.billAllocations || []).forEach((alloc) => {
            if (Math.abs(alloc.amountToPay - alloc.originalBalance) > 0.009) {
              g.hasChanges = true
              g.changes.push({
                kind: 'amount',
                title: `Abono parcial en ${alloc.billFolio}`,
                detail: `${money(alloc.originalBalance, alloc.currency)} → ${money(alloc.amountToPay, alloc.currency)}`,
              })
            }
          })

          if (inlineOverrides[groupLine.sourceLineId]) {
            g.hasChanges = true
            g.changes.push({
              kind: 'override',
              title: 'Ajuste manual CLABE / Pack',
              detail: `CLABE verificada: ${groupLine.clabe}`,
            })
          }

          if (groupLine.paymentReason?.trim()) {
            g.changes.push({
              kind: 'reason',
              title: 'Motivo del pago asignado',
              detail: groupLine.paymentReason.trim(),
            })
          }
        }
      }
    })

    return Array.from(groups.values())
  }, [
    candidates,
    excludedSourceIds,
    editedSupplierCatalogs,
    isVendorBatch,
    aggregationMode,
    includedLines,
    initialBaseline,
    inlineOverrides,
    effectiveCurrency,
  ])

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
        currency: effectiveCurrency,
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
        concept: line.paymentReason || line.concept,
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
    effectiveCurrency,
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

  const candidateBySourceId = new Map(candidates.map((c) => [c.sourceLineId, c]))

  const handleSelectIndividualBankAccount = (sourceLineId: string, accountId: string) => {
    setIndividualBankSelection((prev) => ({
      ...prev,
      [sourceLineId]: accountId,
    }))
    // Clear stale manual overrides so the selected SupplierBankAccount details take effect immediately
    setInlineOverrides((prev) => {
      if (!prev[sourceLineId]) return prev
      const next = { ...prev }
      delete next[sourceLineId]
      return next
    })
  }

  const handleSelectConsolidatedBankAccount = (supplierKey: string, accountId: string) => {
    setConsolidatedBankSelection((prev) => ({
      ...prev,
      [supplierKey]: accountId,
    }))
    const lineKey = `group_${supplierKey}`
    setInlineOverrides((prev) => {
      if (!prev[lineKey]) return prev
      const next = { ...prev }
      delete next[lineKey]
      return next
    })
  }

  const openBankAccountsManagerFor = (
    sampleCandidate: EbpWizardCandidateLine,
    targetSelectionKey: string,
    selectionMode: 'individual' | 'consolidated'
  ) => {
    const sKey = (sampleCandidate.supplierKey || sampleCandidate.beneficiaryName).toLowerCase()
    const currentAccounts = resolveCandidateAccounts(sampleCandidate)
    setBankManagerTarget({
      supplierKey: sKey,
      supplierCompany: sampleCandidate.beneficiaryName,
      targetSelectionKey,
      selectionMode,
      draftAccounts: JSON.parse(JSON.stringify(currentAccounts)),
      defaultCurrency: sampleCandidate.currency || effectiveCurrency,
    })
  }

  const handleAttemptStepChange = (targetStep: 1 | 2 | 3) => {
    if (targetStep === 3) {
      if (companyFieldErrors.length > 0) {
        toast.warning(companyFieldErrors[0], 'Faltan datos bancarios de la empresa')
        setStep(1)
        return
      }
      if (hasMixedCurrencies) {
        toast.warning(
          'No es posible combinar facturas en diferentes monedas dentro de un mismo lote EBP.',
          'Monedas incompatibles'
        )
        setStep(2)
        return
      }
      if (includedLines.length === 0) {
        toast.warning('Incluye al menos un pago en el lote antes de continuar.', 'Lote vacío')
        setStep(2)
        return
      }
      if (missingConsolidatedReasons.length > 0) {
        const names = missingConsolidatedReasons.map((l) => l.beneficiaryName).join(', ')
        toast.warning(
          `El campo "Motivo del pago" es obligatorio para cada grupo consolidado. Captúralo para: ${names}.`,
          'Motivo del pago requerido'
        )
        setStep(2)
        return
      }
      if (linesWithErrors.length > 0) {
        toast.warning(
          linesWithErrors[0].validationErrors[0] ||
            `Corrige las ${linesWithErrors.length} línea(s) con incidencias antes de revisar el resumen.`,
          'Validación pendiente'
        )
        setStep(2)
        return
      }
    }
    setStep(targetStep)
  }

  const handleGenerateAndDownload = () => {
    if (!selectedPack || !selectedBank) return
    if (companyFieldErrors.length > 0) {
      toast.warning(companyFieldErrors[0], 'Faltan datos bancarios de la empresa')
      setStep(1)
      return
    }
    if (hasMixedCurrencies) {
      toast.warning(
        'No es posible combinar facturas en diferentes monedas dentro de un mismo lote EBP.',
        'Monedas incompatibles'
      )
      setStep(2)
      return
    }
    if (includedLines.length === 0) {
      toast.warning('Incluye al menos un pago en el lote.', 'Lote vacío')
      setStep(2)
      return
    }
    if (missingConsolidatedReasons.length > 0) {
      const names = missingConsolidatedReasons.map((l) => l.beneficiaryName).join(', ')
      toast.warning(
        `El campo "Motivo del pago" es obligatorio para cada grupo consolidado. Captúralo para: ${names}.`,
        'Motivo del pago requerido'
      )
      setStep(2)
      return
    }
    if (linesWithErrors.length > 0) {
      toast.warning(
        linesWithErrors[0].validationErrors[0] ||
          `Corrige las ${linesWithErrors.length} líneas con errores de validación antes de generar el archivo.`,
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
      aggregationMode: isVendorBatch ? aggregationMode : 'individual',
      packId: selectedPack.id,
      packName: selectedPack.name,
      packVersion: selectedPack.version,
      bankAccountId: selectedBank.id,
      bankAccountName: `${selectedBank.bankName} (${selectedBank.accountNumber})`,
      currency: effectiveCurrency,
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
      `Archivo ${generatedFilename} (${selectedPack.encoding}) descargado y lote ${batchFolio} registrado (${includedLines.length} instrucción(es) / ${totalBillsIncluded} documento(s)).`,
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
              {isVendorBatch
                ? aggregationMode === 'consolidated'
                  ? ' · PAGO CONSOLIDADO'
                  : ' · PAGO INDIVIDUAL'
                : ''}
            </div>
            <h2>
              Generar Dispersión Bancaria · {sourceFolio}
            </h2>
            <p>
              {isVendorBatch
                ? 'Selecciona la cuenta bancaria destino de cada proveedor y elige entre pago individual por factura o consolidado.'
                : 'Valida parámetros bancarios y exporta el layout oficial de nómina listo para el portal del banco.'}
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
            <span>1</span> Banco, Modo y Plantilla
          </button>
          <button
            type="button"
            className={`ebp-step-pill ${step === 2 ? 'active' : step > 2 ? 'done' : ''}`}
            onClick={() => compatiblePacks.length > 0 && setStep(2)}
            disabled={compatiblePacks.length === 0}
          >
            <span>2</span> Cuentas Destino y Validador ({includedLines.length})
          </button>
          <button
            type="button"
            className={`ebp-step-pill ${step === 3 ? 'active' : ''}`}
            onClick={() => compatiblePacks.length > 0 && handleAttemptStepChange(3)}
            disabled={compatiblePacks.length === 0}
          >
            <span>3</span> Resumen, Vista Previa y Descarga
          </button>
        </div>

        {compatiblePacks.length === 0 ? (
          <div className="clients-empty" style={{ margin: '18px 0' }}>
            <AlertTriangle size={22} />
            <strong>
              No hay plantillas bancarias instaladas compatibles con {batchType} ({effectiveCurrency})
            </strong>
            <span>
              Ingresa a Finanzas &gt; Pagos Bancarios (EBP) &gt; Catálogo de Bancos para instalar o activar una licencia compatible.
            </span>
          </div>
        ) : (
          <div className="ebp-wizard-body">
            {/* STEP 1 */}
            {step === 1 && (
              <div className="ebp-step-content">
                {isVendorBatch && (
                  <div className="ebp-aggregation-box">
                    <div className="ebp-aggregation-head">
                      <div>
                        <Layers size={14} />
                        <strong>Modo de dispersión para facturas de proveedor</strong>
                      </div>
                      <span className="emp-code-pill">
                        {candidates.length} factura(s) seleccionada(s)
                      </span>
                    </div>
                    <div className="ebp-mode-cards-grid">
                      <button
                        type="button"
                        className={`ebp-mode-card ${aggregationMode === 'individual' ? 'active' : ''}`}
                        onClick={() => {
                          setAggregationMode('individual')
                          setEditingLineId(null)
                        }}
                      >
                        <strong>Pago individual (1 factura = 1 pago)</strong>
                        <small>
                          Genera una transferencia por cada factura y permite elegir una cuenta bancaria destino distinta por factura.
                        </small>
                      </button>
                      <button
                        type="button"
                        className={`ebp-mode-card ${aggregationMode === 'consolidated' ? 'active' : ''}`}
                        onClick={() => {
                          setAggregationMode('consolidated')
                          setEditingLineId(null)
                        }}
                      >
                        <strong>Consolidar facturas por proveedor (N facturas = 1 pago)</strong>
                        <small>
                          Agrupa todas las facturas del mismo proveedor en 1 solo pago hacia su cuenta seleccionada, solicitando motivo de pago por proveedor.
                        </small>
                      </button>
                    </div>
                  </div>
                )}

                <div className="form-grid-3" style={{ marginTop: isVendorBatch ? 12 : 0 }}>
                  <label className="form-field">
                    <span>Cuenta bancaria ordenante *</span>
                    <select
                      value={selectedBank?.id || ''}
                      onChange={(e) => setSelectedBankId(e.target.value)}
                    >
                      {transferAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.bankName} ({acc.accountNumber}) · {acc.currency} · {money(acc.balance, acc.currency)}
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
                    <span>
                      {isVendorBatch && aggregationMode === 'consolidated'
                        ? 'Pagos consolidados'
                        : 'Pagos incluidos'}
                    </span>
                    <strong>
                      {includedLines.length} de {auditedLines.length}
                      {isVendorBatch ? ` (${totalBillsIncluded} fact.)` : ''}
                    </strong>
                  </div>
                  <div className="ebp-audit-stat">
                    <span>Importe total del lote</span>
                    <strong className="mono">{money(totalBatchAmount, effectiveCurrency)}</strong>
                  </div>
                  <div className="ebp-audit-stat">
                    <span>Saldo en {selectedBank.bankName}</span>
                    <strong className={`mono ${hasSufficientFunds ? 'text-positive' : 'text-alert'}`}>
                      {money(selectedBank.balance, selectedBank.currency)}
                    </strong>
                  </div>
                  <div className="ebp-audit-stat">
                    <span>Estado de validación</span>
                    {linesWithErrors.length === 0 &&
                    companyFieldErrors.length === 0 &&
                    hasSufficientFunds &&
                    !hasMixedCurrencies ? (
                      <span className="ebp-valid-tag ok">
                        <ShieldCheck size={12} /> Listo para exportar
                      </span>
                    ) : (
                      <span className="ebp-valid-tag err">
                        <AlertTriangle size={12} /> {linesWithErrors.length || 1} incidencia(s)
                      </span>
                    )}
                  </div>
                </div>

                {isVendorBatch && (
                  <div className="ebp-step2-toolbar">
                    <div className="ebp-mode-inline-switch">
                      <span>Modo de agrupación:</span>
                      <button
                        type="button"
                        className={`wh-tab ${aggregationMode === 'individual' ? 'active' : ''}`}
                        onClick={() => {
                          setAggregationMode('individual')
                          setEditingLineId(null)
                        }}
                      >
                        Individual ({candidates.length})
                      </button>
                      <button
                        type="button"
                        className={`wh-tab ${aggregationMode === 'consolidated' ? 'active' : ''}`}
                        onClick={() => {
                          setAggregationMode('consolidated')
                          setEditingLineId(null)
                        }}
                      >
                        Consolidado por proveedor
                      </button>
                    </div>
                    {hasMixedCurrencies && (
                      <span className="ebp-valid-tag err">
                        <AlertTriangle size={11} /> No mezcles monedas ({distinctCandidateCurrencies.join(' / ')}) en un mismo lote
                      </span>
                    )}
                  </div>
                )}

                {/* CONSOLIDATED VENDOR CARDS */}
                {isVendorBatch && aggregationMode === 'consolidated' ? (
                  <div className="ebp-consolidated-list">
                    {auditedLines.map((line) => {
                      const sKey = line.sourceLineId.replace(/^group_/, '')
                      const groupBills = candidates.filter(
                        (c) => (c.supplierKey || c.beneficiaryName).toLowerCase() === sKey
                      )
                      const availableAccounts = groupBills[0]
                        ? resolveCandidateAccounts(groupBills[0])
                        : []
                      const selectedAccId =
                        consolidatedBankSelection[sKey] || line.selectedBankAccountId || ''
                      const chosenAccountObj = availableAccounts.find(
                        (a) => a.id === selectedAccId
                      )
                      const reasonVal = consolidatedReasons[sKey] ?? ''
                      const isExpanded = Boolean(expandedGroups[sKey])
                      const isEditing = editingLineId === line.sourceLineId
                      const hasErr = line.validationErrors.length > 0
                      const missingReason = !reasonVal.trim()

                      return (
                        <article
                          key={line.id}
                          className={`ebp-consolidated-card ${!line.included ? 'muted' : hasErr ? 'has-error' : ''}`}
                        >
                          <div className="ebp-consolidated-card-head">
                            <div className="ebp-consolidated-title-block">
                              <input
                                type="checkbox"
                                checked={line.included}
                                onChange={(e) => {
                                  const nextExcluded = { ...excludedSourceIds }
                                  groupBills.forEach((gb) => {
                                    nextExcluded[gb.sourceLineId] = !e.target.checked
                                  })
                                  setExcludedSourceIds(nextExcluded)
                                }}
                              />
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                  <strong>{line.beneficiaryName}</strong>
                                  <span className="emp-code-pill mono">
                                    {line.billAllocations?.length || groupBills.length} factura(s) → 1 pago
                                  </span>
                                  {line.rfc && (
                                    <span className="ebp-mini-kv mono">{line.rfc}</span>
                                  )}
                                </div>
                                <small>
                                  Folios:{' '}
                                  <span className="mono">
                                    {(line.billAllocations || [])
                                      .map((a) => a.billFolio)
                                      .join(', ')}
                                  </span>
                                </small>
                              </div>
                            </div>

                            <div className="ebp-consolidated-amount-block">
                              <span className="emp-field-label">Total pago consolidado</span>
                              <strong className="mono">{money(line.amount, effectiveCurrency)}</strong>
                              {!line.included ? (
                                <span className="emp-code-pill">Excluido</span>
                              ) : hasErr ? (
                                <span className="ebp-valid-tag err">
                                  <AlertTriangle size={10} /> {line.validationErrors.length} pendiente(s)
                                </span>
                              ) : (
                                <span className="ebp-valid-tag ok">
                                  <CheckCircle2 size={11} /> Listo
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="ebp-consolidated-controls">
                            {/* Destination supplier bank selector (dynamic from SupplierBankAccountsManager) */}
                            <label className="form-field">
                              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                                <span>
                                  <Landmark size={11} style={{ display: 'inline', marginRight: 4 }} />
                                  Cuenta bancaria destino del proveedor * ({availableAccounts.length})
                                </span>
                                {onUpdateSupplierBankAccounts && groupBills[0] && (
                                  <button
                                    type="button"
                                    className="button-icon-action"
                                    style={{ padding: '2px 7px', fontSize: 10 }}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      openBankAccountsManagerFor(groupBills[0], sKey, 'consolidated')
                                    }}
                                  >
                                    <SlidersHorizontal size={10} /> Gestionar cuentas
                                  </button>
                                )}
                              </span>
                              {availableAccounts.length > 0 ? (
                                <select
                                  aria-label={`Cuenta bancaria destino para ${line.beneficiaryName}`}
                                  value={selectedAccId}
                                  onChange={(e) =>
                                    handleSelectConsolidatedBankAccount(sKey, e.target.value)
                                  }
                                >
                                  {availableAccounts.map((acc) => {
                                    const clabeOk = validateClabeMod10(acc.clabe).valid
                                    return (
                                      <option key={acc.id} value={acc.id}>
                                        {acc.alias || acc.bankName} ({acc.bankName || 'Banco'} · ••••
                                        {acc.clabe.slice(-4) || acc.accountNumber || '0000'}) ·{' '}
                                        {acc.currency}
                                        {acc.isDefault ? ' ★ Predeterminada' : ''}
                                        {!acc.active ? ' [Inactiva]' : !clabeOk ? ' [Revisar CLABE]' : ''}
                                      </option>
                                    )
                                  })}
                                </select>
                              ) : (
                                <div className="ebp-inline-no-bank">
                                  Sin cuentas registradas en el catálogo bancario del proveedor.
                                </div>
                              )}
                              <small className="mono ebp-field-hint">
                                {chosenAccountObj ? `${chosenAccountObj.alias} · ` : ''}
                                CLABE: {line.clabe || 'Sin capturar'} · {line.bankName} ·{' '}
                                {line.isSameBank ? 'Mismo banco' : 'SPEI'}
                                {line.reference ? ` · Ref: ${line.reference}` : ''}
                              </small>
                            </label>

                            {/* Mandatory consolidated payment reason per supplier */}
                            <label className="form-field">
                              <span>Motivo del pago *</span>
                              <input
                                type="text"
                                required
                                aria-label={`Motivo del pago para ${line.beneficiaryName}`}
                                className={missingReason ? 'ebp-input-required-empty' : ''}
                                placeholder={`Ej. Liquidación consolidada ${line.beneficiaryName}`}
                                value={reasonVal}
                                onChange={(e) =>
                                  setConsolidatedReasons((prev) => ({
                                    ...prev,
                                    [sKey]: e.target.value,
                                  }))
                                }
                              />
                              {missingReason ? (
                                <small className="ebp-field-err">
                                  Campo obligatorio: ingresa el motivo del pago para este grupo de facturas.
                                </small>
                              ) : (
                                <small className="ebp-field-hint">
                                  Se validará e incluirá en el resumen del pago, el layout bancario y Tesorería.
                                </small>
                              )}
                            </label>
                          </div>

                          {/* Validation alerts if any */}
                          {hasErr && line.included && (
                            <div className="ebp-consolidated-errors-row">
                              {line.validationErrors.map((err, ei) => (
                                <span key={ei} className="ebp-valid-tag err">
                                  <AlertTriangle size={10} /> {err}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Inline pack/CLABE fix if needed */}
                          {isEditing && (
                            <div className="ebp-consolidated-inline-fix">
                              <div className="form-grid-3">
                                <label className="form-field">
                                  <span>CLABE destino (override)</span>
                                  <input
                                    className="mono"
                                    maxLength={18}
                                    value={line.clabe}
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
                                </label>
                                {selectedPack.beneficiaryBankSchema.map((field) => {
                                  const cat = field.catalogRef
                                    ? selectedPack.embeddedCatalogs[field.catalogRef]
                                    : undefined
                                  const val = line.customValues[field.key] ?? ''
                                  return (
                                    <label key={field.key} className="form-field">
                                      <span>{field.label}</span>
                                      {field.type === 'select_catalog' && cat ? (
                                        <select
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
                                          <option value="">Selecciona...</option>
                                          {cat.options.map((opt) => (
                                            <option key={opt.code} value={opt.code}>
                                              {opt.label}
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <input
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
                                      )}
                                    </label>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          <div className="ebp-consolidated-footer">
                            <button
                              type="button"
                              className="button-icon-action"
                              onClick={() =>
                                setExpandedGroups((prev) => ({
                                  ...prev,
                                  [sKey]: !isExpanded,
                                }))
                              }
                            >
                              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                              {isExpanded ? 'Ocultar' : 'Ver'} desglose de {groupBills.length} factura(s)
                            </button>
                            <button
                              type="button"
                              className="button-icon-action"
                              onClick={() =>
                                setEditingLineId(isEditing ? null : line.sourceLineId)
                              }
                            >
                              <SlidersHorizontal size={11} />{' '}
                              {isEditing ? 'Cerrar ajuste' : 'Corregir CLABE / Pack'}
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="ebp-bills-breakdown-wrap">
                              <table className="data-table ops-data-table ebp-breakdown-table">
                                <thead>
                                  <tr>
                                    <th style={{ width: 32 }}>INC.</th>
                                    <th>FOLIO CXP</th>
                                    <th>ORDEN COMPRA</th>
                                    <th>VENCIMIENTO</th>
                                    <th style={{ textAlign: 'right' }}>SALDO PENDIENTE</th>
                                    <th style={{ textAlign: 'right', width: 155 }}>ABONO EN PAGO</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {groupBills.map((gb) => {
                                    const billIncluded = !excludedSourceIds[gb.sourceLineId]
                                    const payAmt =
                                      amountOverrides[gb.sourceLineId] !== undefined
                                        ? amountOverrides[gb.sourceLineId]
                                        : gb.amount
                                    return (
                                      <tr
                                        key={gb.sourceLineId}
                                        className={!billIncluded ? 'payroll-row-muted' : ''}
                                      >
                                        <td>
                                          <input
                                            type="checkbox"
                                            checked={billIncluded}
                                            onChange={(e) =>
                                              setExcludedSourceIds((prev) => ({
                                                ...prev,
                                                [gb.sourceLineId]: !e.target.checked,
                                              }))
                                            }
                                          />
                                        </td>
                                        <td className="mono">
                                          <strong>{gb.billFolio || gb.beneficiaryCode}</strong>
                                        </td>
                                        <td>{gb.purchaseOrderFolio || '—'}</td>
                                        <td>{gb.dueDate || '—'}</td>
                                        <td style={{ textAlign: 'right' }} className="mono">
                                          {money(gb.amount, gb.currency || effectiveCurrency)}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                          <input
                                            type="number"
                                            min="1"
                                            max={gb.amount}
                                            step="0.01"
                                            disabled={!billIncluded}
                                            className="ebp-inline-input mono"
                                            style={{ textAlign: 'right' }}
                                            value={payAmt}
                                            onChange={(e) =>
                                              setAmountOverrides((prev) => ({
                                                ...prev,
                                                [gb.sourceLineId]: Math.max(
                                                  0,
                                                  parseFloat(e.target.value) || 0
                                                ),
                                              }))
                                            }
                                          />
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  /* INDIVIDUAL TABLE (Payroll or Individual Vendor Invoices with per-bill Bank Selector) */
                  <div className="table-wrap ops-table-wrap" style={{ maxHeight: 350, overflowY: 'auto' }}>
                    <table className="data-table ops-data-table">
                      <thead>
                        <tr>
                          <th style={{ width: 32 }}>INC.</th>
                          <th>{isVendorBatch ? 'PROVEEDOR / FACTURA' : 'BENEFICIARIO'}</th>
                          <th>{isVendorBatch ? 'CUENTA BANCARIA DESTINO' : 'CLABE / BANCO'}</th>
                          <th>{isVendorBatch ? 'MOTIVO / PACK' : 'CAMPOS DEL PACK'}</th>
                          <th style={{ textAlign: 'right' }}>IMPORTE</th>
                          <th>VALIDACIÓN</th>
                          <th style={{ textAlign: 'right' }}>AJUSTE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditedLines.map((line) => {
                          const isEditing = editingLineId === line.sourceLineId
                          const hasErr = line.validationErrors.length > 0
                          const cand = candidateBySourceId.get(line.sourceLineId)
                          const availableAccounts = cand ? resolveCandidateAccounts(cand) : []
                          const selectedAccId =
                            individualBankSelection[line.sourceLineId] ||
                            line.selectedBankAccountId ||
                            ''

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
                                    setExcludedSourceIds((prev) => ({
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
                                    {line.beneficiaryCode}
                                    {line.rfc ? ` · ${line.rfc}` : ''}
                                  </small>
                                </div>
                              </td>
                              <td>
                                {isVendorBatch ? (
                                  <div className="ebp-cell-bank-picker">
                                    {availableAccounts.length > 0 ? (
                                      <select
                                        aria-label={`Detalle bancario para ${line.beneficiaryName} (${line.beneficiaryCode})`}
                                        className="ebp-inline-input"
                                        value={selectedAccId}
                                        onChange={(e) =>
                                          handleSelectIndividualBankAccount(
                                            line.sourceLineId,
                                            e.target.value
                                          )
                                        }
                                      >
                                        {availableAccounts.map((acc) => {
                                          const clabeOk = validateClabeMod10(acc.clabe).valid
                                          return (
                                            <option key={acc.id} value={acc.id}>
                                              {acc.alias || acc.bankName} ({acc.bankName || 'Banco'} · ••••
                                              {acc.clabe.slice(-4) || acc.accountNumber || '0000'}) ·{' '}
                                              {acc.currency}
                                              {acc.isDefault ? ' ★' : ''}
                                              {!acc.active ? ' [Inactiva]' : !clabeOk ? ' [CLABE!]' : ''}
                                            </option>
                                          )
                                        })}
                                      </select>
                                    ) : (
                                      <small className="ebp-field-err">
                                        Sin cuentas registradas en proveedor
                                      </small>
                                    )}
                                    {isEditing && (
                                      <input
                                        className="ebp-inline-input mono"
                                        placeholder="Override CLABE 18 dígitos"
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
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                                      <small className="mono">
                                        {line.clabe || 'Sin CLABE'} · {line.isSameBank ? 'Mismo banco' : 'SPEI'}
                                      </small>
                                      {onUpdateSupplierBankAccounts && cand && (
                                        <button
                                          type="button"
                                          className="button-icon-action"
                                          style={{ padding: '1px 5px', fontSize: 9.5 }}
                                          onClick={() =>
                                            openBankAccountsManagerFor(
                                              cand,
                                              line.sourceLineId,
                                              'individual'
                                            )
                                          }
                                        >
                                          {availableAccounts.length === 0 ? '+ Cuenta' : 'Cuentas'}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ) : isEditing ? (
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
                                    {isVendorBatch && (
                                      <input
                                        className="ebp-inline-input"
                                        placeholder="Motivo / concepto de pago"
                                        value={individualReasons[line.sourceLineId] ?? line.concept}
                                        onChange={(e) =>
                                          setIndividualReasons((prev) => ({
                                            ...prev,
                                            [line.sourceLineId]: e.target.value,
                                          }))
                                        }
                                      />
                                    )}
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
                                    {isVendorBatch && (
                                      <span className="ebp-mini-kv">
                                        Motivo: <strong>{line.paymentReason || line.concept}</strong>
                                      </span>
                                    )}
                                    {selectedPack.beneficiaryBankSchema.map((f) => (
                                      <span key={f.key} className="ebp-mini-kv">
                                        {f.label}: <strong className="mono">{line.customValues[f.key] || '—'}</strong>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td style={{ textAlign: 'right' }} className="money-cell mono">
                                {isEditing && isVendorBatch && cand ? (
                                  <input
                                    type="number"
                                    min="1"
                                    max={cand.amount}
                                    step="0.01"
                                    className="ebp-inline-input mono"
                                    style={{ width: 110, textAlign: 'right' }}
                                    value={line.amount}
                                    onChange={(e) =>
                                      setAmountOverrides((prev) => ({
                                        ...prev,
                                        [line.sourceLineId]: Math.max(
                                          0,
                                          parseFloat(e.target.value) || 0
                                        ),
                                      }))
                                    }
                                  />
                                ) : (
                                  <strong>{money(line.amount, effectiveCurrency)}</strong>
                                )}
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
                )}
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
                    {isVendorBatch && (
                      <span className="emp-code-pill">
                        {aggregationMode === 'consolidated'
                          ? `Consolidado: ${includedLines.length} pago(s) / ${totalBillsIncluded} fact.`
                          : `Individual: ${includedLines.length} pago(s)`}
                      </span>
                    )}
                    <span className="emp-code-pill">Codificación: {selectedPack.encoding}</span>
                    <span className="emp-code-pill">Fin de línea: {selectedPack.lineEnding}</span>
                    <span className="emp-code-pill">
                      {renderedOutput.split(/\r?\n/).length} líneas · {renderedOutput.length} chars
                    </span>
                  </div>
                </div>

                {/* Preview Switch Tabs: Bank Verification + Supplier Changes vs Raw Layout File */}
                <div className="ebp-preview-tabs-bar">
                  <div className="ebp-mode-inline-switch">
                    <button
                      type="button"
                      className={`wh-tab ${previewSubTab === 'verification' ? 'active' : ''}`}
                      onClick={() => setPreviewSubTab('verification')}
                    >
                      <ShieldCheck size={12} /> Verificación bancaria y cambios por proveedor
                    </button>
                    <button
                      type="button"
                      className={`wh-tab ${previewSubTab === 'raw' ? 'active' : ''}`}
                      onClick={() => setPreviewSubTab('raw')}
                    >
                      <Eye size={12} /> Vista previa del archivo ({selectedPack.outputExtension})
                    </button>
                  </div>
                  <span className="ebp-mini-kv">
                    Ordenante: <strong>{selectedBank?.bankName}</strong> · Aplicación:{' '}
                    <strong className="mono">{executionDate}</strong>
                  </span>
                </div>

                {(linesWithErrors.length > 0 ||
                  companyFieldErrors.length > 0 ||
                  !hasSufficientFunds ||
                  hasMixedCurrencies) && (
                  <div className="ebp-warning-box">
                    <AlertTriangle size={15} />
                    <div>
                      <strong>No es posible descargar hasta resolver las validaciones:</strong>
                      <p>
                        {companyFieldErrors[0] ||
                          (hasMixedCurrencies
                            ? 'No es posible mezclar facturas en diferentes monedas en un mismo lote.'
                            : !hasSufficientFunds
                              ? 'Saldo insuficiente en la cuenta bancaria seleccionada.'
                              : linesWithErrors[0]?.validationErrors[0] ||
                                `${linesWithErrors.length} línea(s) de pago presentan incidencias.`)}
                      </p>
                    </div>
                  </div>
                )}

                {previewSubTab === 'verification' ? (
                  <div className="ebp-preview-verification-wrap">
                    {/* Resumen claro de los cambios realizados por proveedor */}
                    {isVendorBatch && supplierChangesSummary.length > 0 && (
                      <div className="ebp-changes-summary-box">
                        <div className="ebp-summary-header">
                          <div>
                            <strong>
                              <ArrowLeftRight size={13} style={{ display: 'inline', marginRight: 5 }} />
                              Resumen de cambios realizados por proveedor ({supplierChangesSummary.length})
                            </strong>
                            <small>
                              Comparativo frente a los valores iniciales de cuentas predeterminadas, facturas e importes al abrir el asistente.
                            </small>
                          </div>
                          <span className="emp-code-pill">
                            {supplierChangesSummary.filter((s) => s.hasChanges).length} proveedor(es) con ajustes
                          </span>
                        </div>

                        <div className="ebp-supplier-changes-grid">
                          {supplierChangesSummary.map((sup) => (
                            <article
                              key={sup.supplierKey}
                              className={`ebp-supplier-change-card ${sup.hasChanges ? 'modified' : ''}`}
                            >
                              <div className="ebp-supplier-change-head">
                                <div>
                                  <strong>{sup.beneficiaryName}</strong>
                                  <small>
                                    {sup.includedBillsCount} de {sup.initialBillsCount} factura(s) ·{' '}
                                    {sup.selectedAliases.length > 0
                                      ? `Alias destino: ${sup.selectedAliases.join(', ')}`
                                      : 'Sin instrucciones activas'}
                                  </small>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <span className={`ebp-valid-tag ${sup.hasChanges ? 'warn' : 'ok'}`}>
                                    {sup.hasChanges ? 'Con cambios aplicados' : 'Cuenta predeterminada'}
                                  </span>
                                  <div className="mono" style={{ fontSize: 11.5, fontWeight: 700, marginTop: 3 }}>
                                    {money(sup.currentTotal, effectiveCurrency)}
                                  </div>
                                </div>
                              </div>

                              {sup.changes.length > 0 ? (
                                <ul className="ebp-change-items-list">
                                  {sup.changes.map((chg, ci) => (
                                    <li key={ci} className={`chg-${chg.kind}`}>
                                      <strong>{chg.title}:</strong> <span>{chg.detail}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="ebp-no-changes-note">
                                  Se conserva la configuración bancaria predeterminada y los saldos completos originales.
                                </div>
                              )}
                            </article>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Verificación detallada de detalles bancarios y alias seleccionado */}
                    <div className="ebp-batch-lines-detail" style={{ marginTop: 0 }}>
                      <div className="ebp-summary-header">
                        <div>
                          <strong>Verificación de detalles bancarios y resumen del pago</strong>
                          <small>
                            Confirma el alias bancario seleccionado, banco receptor, CLABE, motivo del pago y facturas antes de generar el lote.
                          </small>
                        </div>
                        <div className="ebp-summary-total">
                          <span>
                            Total a dispersar ({includedLines.length} operación
                            {includedLines.length === 1 ? '' : 'es'})
                          </span>
                          <strong className="mono">{money(totalBatchAmount, effectiveCurrency)}</strong>
                        </div>
                      </div>

                      <div className="ebp-batch-lines-stack ebp-verification-stack">
                        {includedLines.map((line, idx) => {
                          const base = initialBaseline[line.sourceLineId]
                          const aliasLabel =
                            line.selectedBankAlias ||
                            (isVendorBatch ? 'Detalle manual / sin alias' : 'Cuenta de nómina')
                          const accountChanged =
                            isVendorBatch &&
                            base &&
                            ((line.selectedBankAccountId &&
                              base.accountId &&
                              line.selectedBankAccountId !== base.accountId) ||
                              (!line.selectedBankAccountId && line.clabe !== base.clabe))

                          return (
                            <div key={line.id} className="ebp-batch-line-row ebp-verify-line-card">
                              <div className="ebp-verify-line-main">
                                <div className="ebp-verify-line-title">
                                  <span className="emp-code-pill mono">#{String(idx + 1).padStart(2, '0')}</span>
                                  <strong>{line.beneficiaryName}</strong>
                                  {line.rfc && <span className="ebp-mini-kv mono">{line.rfc}</span>}
                                  <span className={`ebp-alias-badge ${accountChanged ? 'changed' : ''}`}>
                                    <Landmark size={10} /> Alias: <strong>{aliasLabel}</strong>
                                    {accountChanged ? ' (Modificada)' : ''}
                                  </span>
                                </div>

                                <div className="ebp-verify-bank-grid">
                                  <div>
                                    <span>Banco / Canal</span>
                                    <strong>
                                      {line.bankName} · {line.isSameBank ? 'Mismo banco' : 'SPEI'}
                                    </strong>
                                  </div>
                                  <div>
                                    <span>CLABE interbancaria</span>
                                    <strong className="mono">{line.clabe}</strong>
                                  </div>
                                  <div>
                                    <span>Cuenta / Referencia</span>
                                    <strong className="mono">
                                      {line.accountNumber || '—'} · Ref {line.reference || '—'}
                                    </strong>
                                  </div>
                                </div>

                                <small className="ebp-reason-line">
                                  Motivo del pago: <strong>{line.paymentReason || line.concept}</strong>
                                </small>

                                {Object.keys(line.customValues).length > 0 && (
                                  <div className="ebp-mini-kv-list" style={{ marginTop: 4 }}>
                                    {selectedPack.beneficiaryBankSchema.map((f) => (
                                      <span key={f.key} className="ebp-mini-kv">
                                        {f.label}:{' '}
                                        <strong className="mono">{line.customValues[f.key] || '—'}</strong>
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {line.billAllocations && line.billAllocations.length > 0 && (
                                  <small className="mono" style={{ marginTop: 4 }}>
                                    Facturas ({line.billAllocations.length}):{' '}
                                    {line.billAllocations
                                      .map((a) => `${a.billFolio} (${money(a.amountToPay, a.currency)})`)
                                      .join(' · ')}
                                  </small>
                                )}
                              </div>
                              <div className="ebp-verify-line-amount">
                                <span className="emp-field-label">Importe</span>
                                <strong className="mono">{money(line.amount, effectiveCurrency)}</strong>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
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
                )}
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
                onClick={() => handleAttemptStepChange(step === 1 ? 2 : 3)}
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
                  missingConsolidatedReasons.length > 0 ||
                  companyFieldErrors.length > 0 ||
                  includedLines.length === 0 ||
                  !hasSufficientFunds ||
                  hasMixedCurrencies
                }
                onClick={handleGenerateAndDownload}
              >
                <Download size={14} /> Confirmar, descargar {selectedPack?.outputExtension} y crear lote
              </button>
            )}
          </div>
        </div>
      </section>

      {bankManagerTarget && onUpdateSupplierBankAccounts && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 1300 }}
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setBankManagerTarget(null)
          }}
        >
          <section className="create-modal modal-wide" role="dialog" aria-modal="true">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">DETALLES BANCARIOS DEL PROVEEDOR · EBP</div>
                <h2>{bankManagerTarget.supplierCompany}</h2>
                <p>
                  Administra las cuentas bancarias almacenadas para este proveedor; al guardar se actualizará el selector del lote inmediatamente.
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Cerrar administrador de cuentas"
                onClick={() => setBankManagerTarget(null)}
              >
                <X size={18} />
              </button>
            </div>

            <SupplierBankAccountsManager
              accounts={bankManagerTarget.draftAccounts}
              installedPacks={packs}
              usedAccountIds={usedSupplierBankAccountIds}
              defaultCurrency={bankManagerTarget.defaultCurrency}
              onChange={(nextAccounts) =>
                setBankManagerTarget((prev) =>
                  prev ? { ...prev, draftAccounts: nextAccounts } : null
                )
              }
            />

            <div className="create-modal-actions" style={{ marginTop: 14 }}>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setBankManagerTarget(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={() => {
                  const savedAccounts = bankManagerTarget.draftAccounts
                  onUpdateSupplierBankAccounts(
                    bankManagerTarget.supplierCompany,
                    savedAccounts
                  )
                  setEditedSupplierCatalogs((prev) => ({
                    ...prev,
                    [bankManagerTarget.supplierKey]: true,
                  }))
                  const preferred = getPreferredSupplierBankAccount(
                    savedAccounts,
                    bankManagerTarget.defaultCurrency
                  )
                  if (preferred) {
                    if (bankManagerTarget.selectionMode === 'consolidated') {
                      handleSelectConsolidatedBankAccount(
                        bankManagerTarget.targetSelectionKey,
                        preferred.id
                      )
                    } else {
                      handleSelectIndividualBankAccount(
                        bankManagerTarget.targetSelectionKey,
                        preferred.id
                      )
                    }
                  }
                  toast.success(
                    `Cuentas bancarias de ${bankManagerTarget.supplierCompany} actualizadas (${savedAccounts.length} disponible(s)).`,
                    'Detalles bancarios guardados'
                  )
                  setBankManagerTarget(null)
                }}
              >
                <CheckCircle2 size={14} /> Guardar y usar en lote
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
