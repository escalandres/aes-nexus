import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Code2,
  Crown,
  Download,
  Eye,
  FileCode2,
  Globe,
  KeyRound,
  Landmark,
  Layers,
  ListChecks,
  Lock,
  PackageCheck,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Unlock,
  Upload,
  X,
} from 'lucide-react'
import type { BankAccount, BillPayable } from '../data/finance'
import type { EmployeeRecord } from '../data/employees'
import type { PayrollRunRecord } from '../data/payroll'
import {
  downloadEncodedEbpFile,
  makeValidClabe,
  renderEbpTemplate,
  validateEbpFieldValue,
  type BankFormatPack,
  type EbpCurrency,
  type EbpDynamicFieldSchema,
  type EbpEncoding,
  type EbpFieldType,
  type EbpLicenseTier,
  type EbpOperationType,
  type EbpRenderContext,
  type ElectronicPaymentBatch,
} from '../data/ebp'
import { EbpBatchWizardModal, type EbpWizardCandidateLine } from './EbpBatchWizardModal'
import { useToast } from './Toast'

export interface SupplierBankProfile {
  name: string
  company: string
  email: string
  rfc?: string
  bankName?: string
  clabe?: string
  accountNumber?: string
  defaultReference?: string
  bankPackValues?: Record<string, Record<string, string>>
}

interface FinanceEbpProps {
  packs: BankFormatPack[]
  batches: ElectronicPaymentBatch[]
  bankAccounts: BankAccount[]
  employees: EmployeeRecord[]
  suppliers: SupplierBankProfile[]
  payrollRuns: PayrollRunRecord[]
  payables: BillPayable[]
  onUpdatePacks: (next: BankFormatPack[]) => void
  onCreateBatch: (batch: ElectronicPaymentBatch) => void
  onApplyBatchInFinance: (batch: ElectronicPaymentBatch) => void
  onUpdateBankAccountPackValues: (
    accountId: string,
    packId: string,
    values: Record<string, string>
  ) => void
}

const money = (val: number, currency: string = 'MXN') =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(val)

const DSL_SNIPPETS = [
  { label: '{{#each payments}}', code: '{{#each payments}}\n\n{{/each}}' },
  { label: '{{#groupBy}}', code: '{{#groupBy payments "channelType"}}\n\n{{/groupBy}}' },
  { label: 'padLeft(val,len,"0")', code: '{{padLeft(payment.clabe,18,"0")}}' },
  { label: 'padRight(val,len," ")', code: '{{padRight(upper(payment.beneficiaryName),40," ")}}' },
  { label: 'cents(amt,15)', code: '{{cents(payment.amount,15)}}' },
  { label: 'dateFmt(yyyyMMdd)', code: '{{dateFmt(batch.executionDate,"yyyyMMdd")}}' },
  { label: 'lineSeq(6)', code: '{{lineSeq(6)}}' },
  { label: 'count(6)', code: '{{count(6)}}' },
  { label: 'sumCents("amount",18)', code: '{{sumCents("amount",18)}}' },
  { label: 'xmlEscape(...)', code: '{{xmlEscape(payment.beneficiaryName)}}' },
]

export function FinanceEbp({
  packs,
  batches,
  bankAccounts,
  employees,
  suppliers,
  payrollRuns,
  payables,
  onUpdatePacks,
  onCreateBatch,
  onApplyBatchInFinance,
  onUpdateBankAccountPackValues,
}: FinanceEbpProps) {
  const toast = useToast()
  const jsonInputRef = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = useState<'batches' | 'marketplace' | 'studio'>('batches')
  const [isCentralAuthorMode, setIsCentralAuthorMode] = useState(false)

  // Marketplace filters
  const [marketView, setMarketView] = useState<'all' | 'installed' | 'available'>('all')
  const [marketExtFilter, setMarketExtFilter] = useState<'Todas' | '.txt' | '.csv' | '.xml'>('Todas')
  const [marketSearch, setMarketSearch] = useState('')

  // Company bank configuration modal for a selected installed pack
  const [configPack, setConfigPack] = useState<BankFormatPack | null>(null)
  const [configAccountId, setConfigAccountId] = useState<string>(bankAccounts[0]?.id || 'bank_1')

  // Batch preview modal
  const [previewBatch, setPreviewBatch] = useState<ElectronicPaymentBatch | null>(null)

  // Quick Launch Wizard state inside Finanzas > EBP
  const [wizardState, setWizardState] = useState<{
    isOpen: boolean
    batchType: 'Nómina' | 'Proveedores'
    sourceRefId: string
    sourceFolio: string
    candidates: EbpWizardCandidateLine[]
  }>({
    isOpen: false,
    batchType: 'Nómina',
    sourceRefId: '',
    sourceFolio: '',
    candidates: [],
  })

  // Quick source picker modal (select Payroll run or pending bills to create a batch)
  const [sourcePickerType, setSourcePickerType] = useState<'Nómina' | 'Proveedores' | null>(null)
  const [pickedBillIds, setPickedBillIds] = useState<Record<string, boolean>>({})

  // Central Studio state
  const [editingPackId, setEditingPackId] = useState<string>(packs[0]?.id || '')
  const [studioDraft, setStudioDraft] = useState<BankFormatPack>(() =>
    JSON.parse(JSON.stringify(packs[0]))
  )
  const [studioSection, setStudioSection] = useState<
    'meta' | 'catalogs' | 'companyFields' | 'beneficiaryFields' | 'template'
  >('template')

  // KPIs
  const installedPacks = useMemo(() => packs.filter((p) => p.installed), [packs])
  const pendingBatches = useMemo(
    () => batches.filter((b) => b.status === 'Archivo generado' || b.status === 'Validado'),
    [batches]
  )
  const appliedTotal = useMemo(
    () =>
      batches
        .filter((b) => b.status === 'Aplicado en banco')
        .reduce((sum, b) => sum + b.totalAmount, 0),
    [batches]
  )

  const filteredMarketplacePacks = useMemo(() => {
    const q = marketSearch.toLowerCase().trim()
    return packs.filter((p) => {
      const matchTab =
        marketView === 'all' ||
        (marketView === 'installed' && p.installed) ||
        (marketView === 'available' && !p.installed)
      const matchExt =
        marketExtFilter === 'Todas' || p.outputExtension.toLowerCase() === marketExtFilter
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.bankName.toLowerCase().includes(q) ||
        p.packCode.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      return matchTab && matchExt && matchQuery
    })
  }, [packs, marketView, marketExtFilter, marketSearch])

  // Pending bills available for batching
  const pendingVendorBills = useMemo(
    () => payables.filter((b) => b.balance > 0),
    [payables]
  )

  // Open wizard for a Payroll Run
  const launchPayrollWizard = (run: PayrollRunRecord) => {
    const empMap = new Map(employees.map((e) => [e.id, e]))
    const candidates: EbpWizardCandidateLine[] = run.receipts.map((rec) => {
      const emp = empMap.get(rec.employeeId)
      return {
        sourceLineId: rec.id,
        beneficiaryName: rec.employeeName,
        beneficiaryCode: rec.employeeCode,
        rfc: emp?.rfc,
        bankName: emp?.bankName || rec.bankName || '',
        clabe: emp?.clabe || rec.clabe || '',
        accountNumber: emp?.accountNumber,
        amount: rec.netPay,
        reference: `${run.folio.replace(/\D/g, '') || '202601'}`,
        concept: `NOMINA ${run.periodLabel}`,
        bankPackValues: emp?.bankPackValues,
      }
    })
    setSourcePickerType(null)
    setWizardState({
      isOpen: true,
      batchType: 'Nómina',
      sourceRefId: run.id,
      sourceFolio: run.folio,
      candidates,
    })
  }

  // Open wizard for selected vendor bills
  const launchVendorWizard = (selectedBills: BillPayable[]) => {
    if (selectedBills.length === 0) {
      toast.warning('Selecciona al menos una factura pendiente para armar el lote.', 'Sin selección')
      return
    }
    const supMap = new Map(suppliers.map((s) => [s.company.toLowerCase(), s]))
    const candidates: EbpWizardCandidateLine[] = selectedBills.map((bill) => {
      const sup = supMap.get(bill.supplierCompany.toLowerCase())
      return {
        sourceLineId: bill.id,
        beneficiaryName: bill.supplierCompany,
        beneficiaryCode: bill.folio,
        rfc: sup?.rfc,
        bankName: sup?.bankName || '',
        clabe: sup?.clabe || '',
        accountNumber: sup?.accountNumber,
        amount: bill.balance,
        reference: sup?.defaultReference || bill.folio.replace(/\D/g, '').slice(-7) || '100001',
        concept: `PAGO ${bill.folio}`,
        bankPackValues: sup?.bankPackValues,
      }
    })
    setSourcePickerType(null)
    setWizardState({
      isOpen: true,
      batchType: 'Proveedores',
      sourceRefId: selectedBills.map((b) => b.id).join(','),
      sourceFolio:
        selectedBills.length === 1
          ? selectedBills[0].folio
          : `LOTE-CXP (${selectedBills.length} fact.)`,
      candidates,
    })
  }

  const handleInstallPack = (pack: BankFormatPack) => {
    const next = packs.map((p) =>
      p.id === pack.id ? { ...p, installed: true, licenseActive: true } : p
    )
    onUpdatePacks(next)
    toast.success(
      `${pack.name} v${pack.version} instalado en tu instancia. Sus campos dinámicos y validadores ya están activos en Bancos, Empleados y Proveedores.`,
      'Pack bancario instalado'
    )
  }

  const handleUninstallPack = (pack: BankFormatPack) => {
    const next = packs.map((p) => (p.id === pack.id ? { ...p, installed: false } : p))
    onUpdatePacks(next)
    toast.info(`Se desactivó ${pack.name} de esta instancia.`, 'Pack desinstalado')
  }

  const handleExportPackJson = (pack: BankFormatPack) => {
    const json = JSON.stringify(pack, null, 2)
    downloadEncodedEbpFile(
      json,
      `${pack.packCode.toLowerCase()}_v${pack.version}.aespak.json`,
      'UTF-8'
    )
    toast.success(`Paquete ${pack.packCode} exportado en formato .aespak.json.`, 'Paquete exportado')
  }

  const handleImportPackJson = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}')) as BankFormatPack
        if (!parsed.id || !parsed.name || !parsed.templateBody) {
          toast.error('El archivo JSON no corresponde a un BankFormatPack válido.', 'Formato inválido')
          return
        }
        const exists = packs.some((p) => p.id === parsed.id)
        const hydrated: BankFormatPack = { ...parsed, installed: true, licenseActive: true }
        onUpdatePacks(
          exists
            ? packs.map((p) => (p.id === hydrated.id ? hydrated : p))
            : [hydrated, ...packs]
        )
        toast.success(
          `Paquete "${hydrated.name}" v${hydrated.version} importado e instalado sin modificar código.`,
          'Pack importado'
        )
      } catch {
        toast.error('No se pudo leer el archivo JSON seleccionado.', 'Error de lectura')
      } finally {
        e.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  // Studio helpers
  const loadPackIntoStudio = (packId: string) => {
    const target = packs.find((p) => p.id === packId)
    if (!target) return
    setEditingPackId(packId)
    setStudioDraft(JSON.parse(JSON.stringify(target)))
  }

  const createBlankPackInStudio = () => {
    const newId = `pack_custom_${Date.now()}`
    const blank: BankFormatPack = {
      id: newId,
      packCode: `CUSTOM-${packs.length + 1}`,
      version: '1.0.0',
      name: 'Nuevo Layout Bancario Personalizado',
      bankName: 'Banco Personalizado',
      country: 'MX',
      operationType: 'both',
      channel: 'mixed',
      description: 'Plantilla creada desde AES Template Studio basada en manual oficial del banco.',
      outputExtension: '.txt',
      encoding: 'ISO-8859-1',
      lineEnding: 'CRLF',
      filenamePattern: 'DISP_{{dateFmt(batch.executionDate,"yyyyMMdd")}}_{{batch.sequence}}.txt',
      supportedCurrencies: ['MXN'],
      licenseTier: 'paid',
      promoBadge: 'Pack Personalizado',
      priceLabel: 'Licencia Pro',
      installed: true,
      licenseActive: true,
      isCustomPack: true,
      embeddedCatalogs: {
        custom_op_codes: {
          title: 'Códigos internos de operación',
          options: [
            { code: '01', label: '01 · Mismo Banco' },
            { code: '04', label: '04 · Interbancario SPEI' },
          ],
        },
      },
      companyBankSchema: [
        {
          key: 'clientNumber',
          label: 'Número de Cliente / Emisora',
          type: 'text',
          defaultValue: '001234',
          validators: { required: true, digitsOnly: true, minLength: 4, maxLength: 10 },
        },
      ],
      beneficiaryBankSchema: [
        {
          key: 'opType',
          label: 'Tipo de Operación Banco',
          type: 'select_catalog',
          catalogRef: 'custom_op_codes',
          defaultValue: '04',
          validators: { required: true },
        },
      ],
      templateBody: [
        'H|{{bankAccount.custom.clientNumber}}|{{dateFmt(batch.executionDate,"yyyyMMdd")}}|{{count(4)}}',
        '{{#each payments}}',
        'D|{{lineSeq(4)}}|{{payment.custom.opType}}|{{payment.clabe}}|{{decimal(payment.amount,2)}}|{{upper(payment.beneficiaryName)}}',
        '{{/each}}',
      ].join('\n'),
    }
    setEditingPackId(newId)
    setStudioDraft(blank)
    setStudioSection('meta')
  }

  const handleSaveStudioPack = () => {
    const exists = packs.some((p) => p.id === studioDraft.id)
    const next = exists
      ? packs.map((p) => (p.id === studioDraft.id ? studioDraft : p))
      : [studioDraft, ...packs]
    onUpdatePacks(next)
    toast.success(
      `Pack "${studioDraft.name}" v${studioDraft.version} publicado en el Catálogo Global.`,
      'Publicado en Marketplace'
    )
  }

  const studioSandboxPreview = useMemo(() => {
    const acc = bankAccounts[0]
    const companyCustom: Record<string, string> = {}
    studioDraft.companyBankSchema.forEach((f) => {
      companyCustom[f.key] =
        acc?.bankPackValues?.[studioDraft.id]?.[f.key] ?? f.defaultValue ?? '0000'
    })
    const samplePayments = employees.slice(0, 3).map((emp, idx) => {
      const custom: Record<string, string> = {}
      studioDraft.beneficiaryBankSchema.forEach((f) => {
        custom[f.key] =
          emp.bankPackValues?.[studioDraft.id]?.[f.key] ?? f.defaultValue ?? '01'
      })
      return {
        index: idx + 1,
        beneficiaryName: emp.fullName,
        beneficiaryCode: emp.employeeCode,
        rfc: emp.rfc || 'XAXX010101000',
        bankName: emp.bankName || 'BBVA México',
        bankCode: (emp.clabe || '012').slice(0, 3),
        clabe: emp.clabe || makeValidClabe('01218000192837465'),
        accountNumber: emp.accountNumber || '1928374650',
        amount: Math.round(emp.baseSalaryMonthly / 2),
        reference: `20260${idx + 1}`,
        concept: 'PAGO NOMINA PRUEBA',
        isSameBank: (emp.clabe || '').startsWith((acc?.clabe || '012').slice(0, 3)),
        channelType: ((emp.clabe || '').startsWith((acc?.clabe || '012').slice(0, 3))
          ? 'MISMO_BANCO'
          : 'SPEI') as 'MISMO_BANCO' | 'SPEI',
        custom,
      }
    })
    const ctx: EbpRenderContext = {
      company: {
        name: 'AES Nexus Technologies SA de CV',
        rfc: 'AES210412AB1',
        custom: companyCustom,
      },
      bankAccount: {
        id: acc?.id || 'bank_1',
        bankName: acc?.bankName || 'BBVA México',
        accountNumber: acc?.accountNumber || '**** 4920',
        clabe: acc?.clabe || makeValidClabe('01218000492019284'),
        currency: acc?.currency || 'MXN',
        custom: companyCustom,
      },
      batch: {
        folio: 'EBP-TEST-0001',
        type: 'Nómina',
        executionDate: new Date().toISOString().split('T')[0],
        sequence: '0001',
        sourceFolio: 'NOM-TEST-01',
        currency: studioDraft.supportedCurrencies[0] || 'MXN',
        totalAmount: samplePayments.reduce((s, p) => s + p.amount, 0),
        operationsCount: samplePayments.length,
      },
      payments: samplePayments,
    }
    try {
      return renderEbpTemplate(studioDraft, ctx)
    } catch (err) {
      return `Error evaluando plantilla: ${String(err)}`
    }
  }, [studioDraft, bankAccounts, employees])

  const addSchemaField = (target: 'companyBankSchema' | 'beneficiaryBankSchema') => {
    const newField: EbpDynamicFieldSchema = {
      key: `campo_${studioDraft[target].length + 1}`,
      label: `Nuevo campo ${studioDraft[target].length + 1}`,
      type: 'text',
      placeholder: 'Captura valor...',
      defaultValue: '',
      validators: { required: true, maxLength: 20 },
    }
    setStudioDraft((prev) => ({
      ...prev,
      [target]: [...prev[target], newField],
    }))
  }

  return (
    <div className="finance-section-container">
      {/* Header */}
      <div className="ops-header-strip">
        <div className="ops-header-left">
          <div className="ops-icon-box fin-icon-box">
            <Landmark size={20} />
          </div>
          <div>
            <h2>Pagos Bancarios Electrónicos (EBP)</h2>
            <p>
              Catálogo licenciado de layouts bancarios (.txt, .csv, .xml) con validación de campos y dispersión directa de nómina y proveedores.
            </p>
          </div>
        </div>

        <div className="ops-header-right">
          <button
            type="button"
            className={`ebp-central-toggle ${isCentralAuthorMode ? 'active' : ''}`}
            onClick={() => {
              const next = !isCentralAuthorMode
              setIsCentralAuthorMode(next)
              if (!next && activeTab === 'studio') setActiveTab('marketplace')
              toast.info(
                next
                  ? 'Modo Fabricante activado: ahora puedes editar y empaquetar plantillas en AES Template Studio.'
                  : 'Vista Estándar de Cliente On-Premise activada (Constructor oculto).',
                next ? 'Sistema Central AES' : 'Modo Cliente Licenciado'
              )
            }}
            title="Alternar vista entre Instancia Cliente Licenciada y Sistema Central Fabricante"
          >
            {isCentralAuthorMode ? <Unlock size={13} /> : <Lock size={13} />}
            {isCentralAuthorMode ? 'Modo AES Central (Activo)' : 'Modo Cliente Licenciado'}
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="emp-kpi-grid">
        <article className="emp-kpi-card">
          <span className="kpi-icon icon-green">
            <PackageCheck size={17} />
          </span>
          <div>
            <strong>
              {installedPacks.length} / {packs.length}
            </strong>
            <small>Packs bancarios instalados</small>
          </div>
        </article>
        <article className="emp-kpi-card">
          <span className="kpi-icon icon-sand">
            <FileCode2 size={17} />
          </span>
          <div>
            <strong>{pendingBatches.length}</strong>
            <small>Archivos generados por confirmar</small>
          </div>
        </article>
        <article className="emp-kpi-card">
          <span className="kpi-icon">
            <Send size={17} />
          </span>
          <div>
            <strong className="mono">{money(appliedTotal)}</strong>
            <small>Dispersado vía layouts EBP</small>
          </div>
        </article>
        <article className="emp-kpi-card">
          <span className="kpi-icon icon-lilac">
            <Globe size={17} />
          </span>
          <div>
            <strong>.TXT · .CSV · .XML</strong>
            <small>Formatos soportados sin estructura fija</small>
          </div>
        </article>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="ops-toolbar">
        <div className="warehouse-tab-selector">
          <button
            type="button"
            className={`wh-tab ${activeTab === 'batches' ? 'active' : ''}`}
            onClick={() => setActiveTab('batches')}
          >
            Lotes de dispersión <span className="wh-badge">{batches.length}</span>
          </button>
          <button
            type="button"
            className={`wh-tab ${activeTab === 'marketplace' ? 'active' : ''}`}
            onClick={() => setActiveTab('marketplace')}
          >
            Catálogo Global / Marketplace <span className="wh-badge">{packs.length}</span>
          </button>
          {isCentralAuthorMode && (
            <button
              type="button"
              className={`wh-tab ${activeTab === 'studio' ? 'active' : ''}`}
              onClick={() => setActiveTab('studio')}
            >
              AES Template Studio (Central)
            </button>
          )}
        </div>

        <div className="ops-actions-group">
          {activeTab === 'batches' && (
            <>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  const initSel: Record<string, boolean> = {}
                  pendingVendorBills.forEach((b) => {
                    initSel[b.id] = true
                  })
                  setPickedBillIds(initSel)
                  setSourcePickerType('Proveedores')
                }}
              >
                <Plus size={14} /> Nuevo lote Proveedores
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={() => setSourcePickerType('Nómina')}
              >
                <Plus size={14} /> Nuevo lote Nómina
              </button>
            </>
          )}
          {activeTab === 'marketplace' && (
            <>
              <input
                ref={jsonInputRef}
                type="file"
                accept=".json,.aespak.json"
                style={{ display: 'none' }}
                onChange={handleImportPackJson}
              />
              <button
                type="button"
                className="button button-secondary"
                onClick={() => jsonInputRef.current?.click()}
              >
                <Upload size={14} /> Importar paquete (.json)
              </button>
            </>
          )}
          {activeTab === 'studio' && isCentralAuthorMode && (
            <>
              <button
                type="button"
                className="button button-secondary"
                onClick={createBlankPackInStudio}
              >
                <Plus size={14} /> Nuevo Pack
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => handleExportPackJson(studioDraft)}
              >
                <Download size={14} /> Exportar .aespak.json
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={handleSaveStudioPack}
              >
                <Sparkles size={14} /> Publicar en Marketplace
              </button>
            </>
          )}
        </div>
      </div>

      {/* TAB 1: BATCHES */}
      {activeTab === 'batches' && (
        <div className="table-wrap ops-table-wrap">
          <table className="data-table ops-data-table">
            <thead>
              <tr>
                <th>FOLIO LOTE</th>
                <th>ORIGEN / OPERACIÓN</th>
                <th>PLANTILLA BANCARIA</th>
                <th>CUENTA CARGO</th>
                <th>ARCHIVO GENERADO</th>
                <th style={{ textAlign: 'right' }}>TOTAL</th>
                <th>ESTADO</th>
                <th style={{ textAlign: 'right' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-cell">
                    Aún no has generado lotes de dispersión bancaria. Crea uno para Nómina o Proveedores.
                  </td>
                </tr>
              ) : (
                batches.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div className="payroll-folio-cell">
                        <strong className="mono">{b.folio}</strong>
                        <span className="emp-code-pill">{b.batchType}</span>
                      </div>
                    </td>
                    <td>
                      <div className="supplier-cell">
                        <strong>{b.sourceFolio}</strong>
                        <small>
                          {b.operationsCount} pagos · Ejecución {b.executionDate}
                        </small>
                      </div>
                    </td>
                    <td>
                      <div className="supplier-cell">
                        <strong>{b.packName}</strong>
                        <small>
                          v{b.packVersion} · {b.encoding}
                        </small>
                      </div>
                    </td>
                    <td>{b.bankAccountName}</td>
                    <td>
                      <span className="ref-tag mono">{b.generatedFilename}</span>
                    </td>
                    <td style={{ textAlign: 'right' }} className="money-cell mono">
                      <strong>{money(b.totalAmount, b.currency)}</strong>
                    </td>
                    <td>
                      {b.status === 'Aplicado en banco' ? (
                        <span className="fin-badge fin-badge-paid">
                          <CheckCircle2 size={11} /> Aplicado en banco
                        </span>
                      ) : (
                        <span className="fin-badge fin-badge-pending">
                          <FileCode2 size={11} /> {b.status}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="po-actions-row">
                        <button
                          type="button"
                          className="button-icon-action"
                          onClick={() => setPreviewBatch(b)}
                          title="Ver contenido del archivo y re-descargar"
                        >
                          <Eye size={12} /> Archivo
                        </button>
                        {b.status !== 'Aplicado en banco' && (
                          <button
                            type="button"
                            className="button-icon-action action-pay"
                            onClick={() => onApplyBatchInFinance(b)}
                            title="Confirmar dispersión ejecutada en portal bancario y aplicar en Finanzas"
                          >
                            <CheckCircle2 size={12} /> Aplicar en Finanzas
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: MARKETPLACE & INSTALLED PACKS */}
      {activeTab === 'marketplace' && (
        <div>
          <div className="ops-subbar" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="warehouse-tab-selector">
                {[
                  { id: 'all', label: 'Catálogo Global' },
                  { id: 'installed', label: 'Instaladas en este servidor' },
                  { id: 'available', label: 'Disponibles (Marketplace)' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`wh-tab ${marketView === opt.id ? 'active' : ''}`}
                    onClick={() => setMarketView(opt.id as 'all' | 'installed' | 'available')}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <select
                className="ebp-mini-select"
                value={marketExtFilter}
                onChange={(e) => setMarketExtFilter(e.target.value as 'Todas' | '.txt' | '.csv' | '.xml')}
              >
                <option value="Todas">Todos los formatos</option>
                <option value=".txt">Posicional / Texto (.txt)</option>
                <option value=".csv">Delimitado (.csv)</option>
                <option value=".xml">Estructurado ISO (.xml)</option>
              </select>
            </div>
            <input
              className="ebp-market-search"
              placeholder="Buscar banco o formato..."
              value={marketSearch}
              onChange={(e) => setMarketSearch(e.target.value)}
            />
          </div>

          <div className="ebp-marketplace-grid">
            {filteredMarketplacePacks.map((pack) => {
              const catalogsCount = Object.keys(pack.embeddedCatalogs).length
              return (
                <article
                  key={pack.id}
                  className={`ebp-pack-card ${pack.installed ? 'installed' : ''}`}
                >
                  <div className="ebp-pack-card-top">
                    <div>
                      <span className="emp-code-pill">{pack.bankName}</span>
                      <span className="ebp-version-tag">v{pack.version}</span>
                    </div>
                    <span
                      className={`ebp-license-badge tier-${pack.licenseTier}`}
                    >
                      {pack.licenseTier === 'paid' && <Crown size={11} />}
                      {pack.licenseTier === 'promo' && <Sparkles size={11} />}
                      {pack.licenseTier === 'included' && <ShieldCheck size={11} />}
                      {pack.promoBadge || pack.priceLabel}
                    </span>
                  </div>

                  <h3>{pack.name}</h3>
                  <p>{pack.description}</p>

                  <div className="ebp-pack-specs-row">
                    <span>
                      <strong>{pack.outputExtension.toUpperCase()}</strong> Extensión
                    </span>
                    <span>
                      <strong>{pack.encoding}</strong> Codif.
                    </span>
                    <span>
                      <strong>{pack.supportedCurrencies.join('/')}</strong> Moneda
                    </span>
                    <span>
                      <strong>
                        {pack.companyBankSchema.length + pack.beneficiaryBankSchema.length}
                      </strong>{' '}
                      Campos + {catalogsCount} listas
                    </span>
                  </div>

                  <div className="ebp-pack-card-footer">
                    {pack.installed ? (
                      <>
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => {
                            setConfigAccountId(bankAccounts[0]?.id || 'bank_1')
                            setConfigPack(pack)
                          }}
                        >
                          <Building2 size={13} /> Configurar empresa
                        </button>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {isCentralAuthorMode && (
                            <button
                              type="button"
                              className="button-icon-action"
                              onClick={() => {
                                loadPackIntoStudio(pack.id)
                                setActiveTab('studio')
                              }}
                              title="Editar en AES Template Studio"
                            >
                              <Code2 size={12} /> Studio
                            </button>
                          )}
                          <button
                            type="button"
                            className="button-icon-action"
                            onClick={() => handleUninstallPack(pack)}
                          >
                            Desactivar
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="button button-primary"
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={() => handleInstallPack(pack)}
                      >
                        <KeyRound size={13} />{' '}
                        {pack.licenseTier === 'paid'
                          ? 'Activar Licencia Pro e Instalar'
                          : 'Instalar en esta instancia'}
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB 3: AES TEMPLATE STUDIO (CENTRAL SYSTEM ONLY) */}
      {activeTab === 'studio' && isCentralAuthorMode && (
        <div className="ebp-studio-shell">
          <div className="ebp-studio-topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="ebp-studio-badge">SISTEMA CENTRAL AES · NO VISIBLE AL CLIENTE</span>
              <select
                value={editingPackId}
                onChange={(e) => loadPackIntoStudio(e.target.value)}
              >
                {packs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (v{p.version})
                  </option>
                ))}
              </select>
            </div>
            <div className="warehouse-tab-selector">
              {[
                { id: 'meta', label: '1. Extensión, Codif. y Monedas' },
                { id: 'catalogs', label: '2. Listas Internas Banco' },
                { id: 'companyFields', label: '3. Campos Empresa + Validador' },
                { id: 'beneficiaryFields', label: '4. Campos Beneficiario + Validador' },
                { id: 'template', label: '5. Plantilla DSL Libre + Sandbox' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`wh-tab ${studioSection === s.id ? 'active' : ''}`}
                  onClick={() => setStudioSection(s.id as typeof studioSection)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ebp-studio-workspace">
            {/* LEFT EDITOR */}
            <div className="ebp-studio-editor">
              {studioSection === 'meta' && (
                <div className="ebp-studio-form">
                  <div className="form-grid">
                    <label className="form-field">
                      <span>Nombre del Paquete Bancario *</span>
                      <input
                        value={studioDraft.name}
                        onChange={(e) => setStudioDraft({ ...studioDraft, name: e.target.value })}
                      />
                    </label>
                    <label className="form-field">
                      <span>Banco Emisor *</span>
                      <input
                        value={studioDraft.bankName}
                        onChange={(e) =>
                          setStudioDraft({ ...studioDraft, bankName: e.target.value })
                        }
                      />
                    </label>
                  </div>
                  <div className="form-grid-4">
                    <label className="form-field">
                      <span>Código Pack</span>
                      <input
                        value={studioDraft.packCode}
                        onChange={(e) =>
                          setStudioDraft({ ...studioDraft, packCode: e.target.value })
                        }
                      />
                    </label>
                    <label className="form-field">
                      <span>Versión</span>
                      <input
                        value={studioDraft.version}
                        onChange={(e) =>
                          setStudioDraft({ ...studioDraft, version: e.target.value })
                        }
                      />
                    </label>
                    <label className="form-field">
                      <span>Operación</span>
                      <select
                        value={studioDraft.operationType}
                        onChange={(e) =>
                          setStudioDraft({
                            ...studioDraft,
                            operationType: e.target.value as EbpOperationType,
                          })
                        }
                      >
                        <option value="payroll">Nómina</option>
                        <option value="vendor_payment">Proveedores</option>
                        <option value="both">Ambos (Nómina y Proveedores)</option>
                      </select>
                    </label>
                    <label className="form-field">
                      <span>Licenciamiento Marketplace</span>
                      <select
                        value={studioDraft.licenseTier}
                        onChange={(e) =>
                          setStudioDraft({
                            ...studioDraft,
                            licenseTier: e.target.value as EbpLicenseTier,
                          })
                        }
                      >
                        <option value="included">Incluida en Plan Base</option>
                        <option value="promo">Promoción</option>
                        <option value="paid">Licencia de Pago</option>
                      </select>
                    </label>
                  </div>

                  <div className="form-grid-4">
                    <label className="form-field">
                      <span>Extensión de salida</span>
                      <input
                        value={studioDraft.outputExtension}
                        onChange={(e) =>
                          setStudioDraft({ ...studioDraft, outputExtension: e.target.value })
                        }
                        placeholder=".txt / .csv / .xml"
                      />
                    </label>
                    <label className="form-field">
                      <span>Codificación</span>
                      <select
                        value={studioDraft.encoding}
                        onChange={(e) =>
                          setStudioDraft({
                            ...studioDraft,
                            encoding: e.target.value as EbpEncoding,
                          })
                        }
                      >
                        <option value="ISO-8859-1">ISO-8859-1 (Latin-1)</option>
                        <option value="ASCII">ASCII estricto 7-bit</option>
                        <option value="UTF-8">UTF-8</option>
                        <option value="UTF-8-BOM">UTF-8 con BOM</option>
                      </select>
                    </label>
                    <label className="form-field">
                      <span>Fin de línea</span>
                      <select
                        value={studioDraft.lineEnding}
                        onChange={(e) =>
                          setStudioDraft({
                            ...studioDraft,
                            lineEnding: e.target.value as 'CRLF' | 'LF',
                          })
                        }
                      >
                        <option value="CRLF">CRLF (Windows \r\n)</option>
                        <option value="LF">LF (Unix \n)</option>
                      </select>
                    </label>
                    <label className="form-field">
                      <span>Monedas soportadas</span>
                      <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
                        {(['MXN', 'USD', 'EUR'] as EbpCurrency[]).map((cur) => {
                          const checked = studioDraft.supportedCurrencies.includes(cur)
                          return (
                            <label key={cur} className="checkbox-field" style={{ fontSize: 10 }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const nextCurs = e.target.checked
                                    ? [...studioDraft.supportedCurrencies, cur]
                                    : studioDraft.supportedCurrencies.filter((c) => c !== cur)
                                  setStudioDraft({
                                    ...studioDraft,
                                    supportedCurrencies: nextCurs.length > 0 ? nextCurs : ['MXN'],
                                  })
                                }}
                              />
                              <span>{cur}</span>
                            </label>
                          )
                        })}
                      </div>
                    </label>
                  </div>

                  <label className="form-field">
                    <span>Patrón de nombre de archivo</span>
                    <input
                      className="mono"
                      value={studioDraft.filenamePattern}
                      onChange={(e) =>
                        setStudioDraft({ ...studioDraft, filenamePattern: e.target.value })
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Descripción para el Marketplace</span>
                    <textarea
                      rows={2}
                      value={studioDraft.description}
                      onChange={(e) =>
                        setStudioDraft({ ...studioDraft, description: e.target.value })
                      }
                    />
                  </label>
                </div>
              )}

              {studioSection === 'catalogs' && (
                <div className="ebp-studio-form">
                  <div className="ebp-box-head">
                    <strong>
                      <ListChecks size={14} /> Catálogos y listas internas empaquetadas del banco
                    </strong>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => {
                        const key = `lista_banco_${Object.keys(studioDraft.embeddedCatalogs).length + 1}`
                        setStudioDraft({
                          ...studioDraft,
                          embeddedCatalogs: {
                            ...studioDraft.embeddedCatalogs,
                            [key]: {
                              title: 'Nueva lista interna',
                              options: [{ code: '01', label: '01 · Opción inicial' }],
                            },
                          },
                        })
                      }}
                    >
                      <Plus size={13} /> Agregar lista interna
                    </button>
                  </div>
                  {Object.entries(studioDraft.embeddedCatalogs).map(([catKey, cat]) => (
                    <div key={catKey} className="ebp-studio-card">
                      <div className="ebp-box-head">
                        <strong className="mono">{catKey}</strong>
                        <input
                          style={{ maxWidth: 260 }}
                          value={cat.title}
                          onChange={(e) =>
                            setStudioDraft({
                              ...studioDraft,
                              embeddedCatalogs: {
                                ...studioDraft.embeddedCatalogs,
                                [catKey]: { ...cat, title: e.target.value },
                              },
                            })
                          }
                        />
                      </div>
                      <div className="ebp-catalog-opts-list">
                        {cat.options.map((opt, idx) => (
                          <div key={idx} className="ebp-catalog-opt-row">
                            <input
                              className="mono"
                              style={{ width: 90 }}
                              placeholder="Código"
                              value={opt.code}
                              onChange={(e) => {
                                const nextOpts = cat.options.map((o, i) =>
                                  i === idx ? { ...o, code: e.target.value } : o
                                )
                                setStudioDraft({
                                  ...studioDraft,
                                  embeddedCatalogs: {
                                    ...studioDraft.embeddedCatalogs,
                                    [catKey]: { ...cat, options: nextOpts },
                                  },
                                })
                              }}
                            />
                            <input
                              style={{ flex: 1 }}
                              placeholder="Etiqueta visible"
                              value={opt.label}
                              onChange={(e) => {
                                const nextOpts = cat.options.map((o, i) =>
                                  i === idx ? { ...o, label: e.target.value } : o
                                )
                                setStudioDraft({
                                  ...studioDraft,
                                  embeddedCatalogs: {
                                    ...studioDraft.embeddedCatalogs,
                                    [catKey]: { ...cat, options: nextOpts },
                                  },
                                })
                              }}
                            />
                            <button
                              type="button"
                              className="button-icon-action"
                              onClick={() => {
                                const nextOpts = cat.options.filter((_, i) => i !== idx)
                                setStudioDraft({
                                  ...studioDraft,
                                  embeddedCatalogs: {
                                    ...studioDraft.embeddedCatalogs,
                                    [catKey]: { ...cat, options: nextOpts },
                                  },
                                })
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="button-icon-action"
                          onClick={() =>
                            setStudioDraft({
                              ...studioDraft,
                              embeddedCatalogs: {
                                ...studioDraft.embeddedCatalogs,
                                [catKey]: {
                                  ...cat,
                                  options: [...cat.options, { code: '', label: '' }],
                                },
                              },
                            })
                          }
                        >
                          <Plus size={11} /> Añadir opción
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(studioSection === 'companyFields' || studioSection === 'beneficiaryFields') && (
                <div className="ebp-studio-form">
                  <div className="ebp-box-head">
                    <strong>
                      <Layers size={14} />{' '}
                      {studioSection === 'companyFields'
                        ? 'Campos de detalle bancario de EMPRESA + Validadores'
                        : 'Campos de detalle bancario de PROVEEDOR / EMPLEADO + Validadores'}
                    </strong>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() =>
                        addSchemaField(
                          studioSection === 'companyFields'
                            ? 'companyBankSchema'
                            : 'beneficiaryBankSchema'
                        )
                      }
                    >
                      <Plus size={13} /> Agregar campo personalizado
                    </button>
                  </div>

                  {(studioSection === 'companyFields'
                    ? studioDraft.companyBankSchema
                    : studioDraft.beneficiaryBankSchema
                  ).map((field, idx) => {
                    const targetKey =
                      studioSection === 'companyFields'
                        ? 'companyBankSchema'
                        : 'beneficiaryBankSchema'
                    const updateField = (patch: Partial<EbpDynamicFieldSchema>) => {
                      const nextList = studioDraft[targetKey].map((f, i) =>
                        i === idx ? { ...f, ...patch } : f
                      )
                      setStudioDraft({ ...studioDraft, [targetKey]: nextList })
                    }
                    return (
                      <div key={idx} className="ebp-studio-card">
                        <div className="form-grid-4">
                          <label className="form-field">
                            <span>Key token</span>
                            <input
                              className="mono"
                              value={field.key}
                              onChange={(e) => updateField({ key: e.target.value })}
                            />
                          </label>
                          <label className="form-field">
                            <span>Etiqueta visible</span>
                            <input
                              value={field.label}
                              onChange={(e) => updateField({ label: e.target.value })}
                            />
                          </label>
                          <label className="form-field">
                            <span>Tipo</span>
                            <select
                              value={field.type}
                              onChange={(e) =>
                                updateField({ type: e.target.value as EbpFieldType })
                              }
                            >
                              <option value="text">Texto</option>
                              <option value="number">Numérico</option>
                              <option value="select_catalog">Lista interna de banco</option>
                            </select>
                          </label>
                          <label className="form-field">
                            <span>Valor por defecto</span>
                            <input
                              value={field.defaultValue || ''}
                              onChange={(e) => updateField({ defaultValue: e.target.value })}
                            />
                          </label>
                        </div>
                        {field.type === 'select_catalog' && (
                          <label className="form-field" style={{ marginTop: 6 }}>
                            <span>Lista interna vinculada</span>
                            <select
                              value={field.catalogRef || ''}
                              onChange={(e) => updateField({ catalogRef: e.target.value })}
                            >
                              <option value="">Selecciona lista...</option>
                              {Object.keys(studioDraft.embeddedCatalogs).map((ck) => (
                                <option key={ck} value={ck}>
                                  {ck} ({studioDraft.embeddedCatalogs[ck].title})
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        <div className="ebp-validator-pills-row">
                          <label className="checkbox-field" style={{ fontSize: 9.5 }}>
                            <input
                              type="checkbox"
                              checked={Boolean(field.validators.required)}
                              onChange={(e) =>
                                updateField({
                                  validators: { ...field.validators, required: e.target.checked },
                                })
                              }
                            />
                            <span>Obligatorio</span>
                          </label>
                          <label className="checkbox-field" style={{ fontSize: 9.5 }}>
                            <input
                              type="checkbox"
                              checked={Boolean(field.validators.digitsOnly)}
                              onChange={(e) =>
                                updateField({
                                  validators: { ...field.validators, digitsOnly: e.target.checked },
                                })
                              }
                            />
                            <span>Solo dígitos</span>
                          </label>
                          <label className="checkbox-field" style={{ fontSize: 9.5 }}>
                            <input
                              type="checkbox"
                              checked={Boolean(field.validators.clabeMod10)}
                              onChange={(e) =>
                                updateField({
                                  validators: { ...field.validators, clabeMod10: e.target.checked },
                                })
                              }
                            />
                            <span>CLABE Mod-10</span>
                          </label>
                          <input
                            style={{ width: 70 }}
                            type="number"
                            placeholder="Mín"
                            value={field.validators.minLength ?? ''}
                            onChange={(e) =>
                              updateField({
                                validators: {
                                  ...field.validators,
                                  minLength: e.target.value ? Number(e.target.value) : undefined,
                                },
                              })
                            }
                          />
                          <input
                            style={{ width: 70 }}
                            type="number"
                            placeholder="Máx"
                            value={field.validators.maxLength ?? ''}
                            onChange={(e) =>
                              updateField({
                                validators: {
                                  ...field.validators,
                                  maxLength: e.target.value ? Number(e.target.value) : undefined,
                                },
                              })
                            }
                          />
                          <button
                            type="button"
                            className="button-icon-action"
                            onClick={() =>
                              setStudioDraft({
                                ...studioDraft,
                                [targetKey]: studioDraft[targetKey].filter((_, i) => i !== idx),
                              })
                            }
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {studioSection === 'template' && (
                <div className="ebp-studio-form">
                  <div className="ebp-snippets-bar">
                    {DSL_SNIPPETS.map((sn) => (
                      <button
                        key={sn.label}
                        type="button"
                        className="ebp-snippet-chip"
                        onClick={() =>
                          setStudioDraft((prev) => ({
                            ...prev,
                            templateBody: `${prev.templateBody}\n${sn.code}`,
                          }))
                        }
                      >
                        {sn.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="ebp-dsl-textarea mono"
                    rows={15}
                    value={studioDraft.templateBody}
                    onChange={(e) =>
                      setStudioDraft({ ...studioDraft, templateBody: e.target.value })
                    }
                    spellCheck={false}
                  />
                </div>
              )}
            </div>

            {/* RIGHT LIVE SANDBOX PREVIEW */}
            <aside className="ebp-studio-sandbox">
              <div className="ebp-preview-meta-bar">
                <div>
                  <Code2 size={14} />
                  <strong>Sandbox en Vivo ({studioDraft.outputExtension})</strong>
                </div>
                <span className="emp-code-pill">{studioDraft.encoding}</span>
              </div>
              <div className="ebp-code-preview-box" style={{ maxHeight: 420 }}>
                {studioSandboxPreview.split(/\r?\n/).map((line, idx) => (
                  <div key={idx} className="ebp-code-line">
                    <span className="ebp-line-no">{String(idx + 1).padStart(2, '0')}</span>
                    <span className="ebp-line-len">{line.length}c</span>
                    <code>{line || ' '}</code>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      )}

      {/* MODAL: Configure Company Bank Parameters for Installed Pack */}
      {configPack && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setConfigPack(null)
          }}
        >
          <section className="create-modal modal-wide" role="dialog" aria-modal="true">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">PARÁMETROS DE EMPRESA · {configPack.bankName.toUpperCase()}</div>
                <h2>{configPack.name}</h2>
                <p>
                  Captura los datos de contrato/emisora requeridos por este pack en tu cuenta bancaria ordenante.
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Cerrar"
                onClick={() => setConfigPack(null)}
              >
                <X size={18} />
              </button>
            </div>

            <label className="form-field">
              <span>Cuenta bancaria de la empresa</span>
              <select
                value={configAccountId}
                onChange={(e) => setConfigAccountId(e.target.value)}
              >
                {bankAccounts
                  .filter((b) => b.type !== 'Caja chica')
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} ({b.accountNumber}) · CLABE {b.clabe}
                    </option>
                  ))}
              </select>
            </label>

            {(() => {
              const targetAcc = bankAccounts.find((b) => b.id === configAccountId) || bankAccounts[0]
              const currentVals = targetAcc?.bankPackValues?.[configPack.id] || {}
              return (
                <div className="form-grid" style={{ marginTop: 12 }}>
                  {configPack.companyBankSchema.map((field) => {
                    const val = currentVals[field.key] ?? field.defaultValue ?? ''
                    const err = validateEbpFieldValue(field, val, configPack.embeddedCatalogs)
                    const cat = field.catalogRef
                      ? configPack.embeddedCatalogs[field.catalogRef]
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
                              onUpdateBankAccountPackValues(targetAcc.id, configPack.id, {
                                ...currentVals,
                                [field.key]: e.target.value,
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
                              onUpdateBankAccountPackValues(targetAcc.id, configPack.id, {
                                ...currentVals,
                                [field.key]: e.target.value,
                              })
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
              )
            })()}

            <div className="create-modal-actions">
              <button
                type="button"
                className="button button-primary"
                onClick={() => {
                  toast.success('Parámetros bancarios de empresa guardados.', 'Configuración guardada')
                  setConfigPack(null)
                }}
              >
                <CheckCircle2 size={14} /> Guardar y cerrar
              </button>
            </div>
          </section>
        </div>
      )}

      {/* MODAL: Batch File Content Preview & Re-download */}
      {previewBatch && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPreviewBatch(null)
          }}
        >
          <section className="create-modal modal-wide ebp-wizard-modal" role="dialog" aria-modal="true">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">ARCHIVO BANCARIO · {previewBatch.folio}</div>
                <h2 className="mono">{previewBatch.generatedFilename}</h2>
                <p>
                  {previewBatch.packName} (v{previewBatch.packVersion}) · {previewBatch.operationsCount} pagos · Total {money(previewBatch.totalAmount, previewBatch.currency)}
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Cerrar"
                onClick={() => setPreviewBatch(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="ebp-code-preview-box">
              {previewBatch.generatedContent.split(/\r?\n/).map((line, idx) => (
                <div key={idx} className="ebp-code-line">
                  <span className="ebp-line-no">{String(idx + 1).padStart(2, '0')}</span>
                  <span className="ebp-line-len">{line.length}c</span>
                  <code>{line || ' '}</code>
                </div>
              ))}
            </div>

            <div className="create-modal-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setPreviewBatch(null)}
              >
                Cerrar
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={() => {
                  downloadEncodedEbpFile(
                    previewBatch.generatedContent,
                    previewBatch.generatedFilename,
                    previewBatch.encoding
                  )
                  toast.success(`Archivo ${previewBatch.generatedFilename} descargado.`, 'Descarga')
                }}
              >
                <Download size={14} /> Descargar archivo ({previewBatch.encoding})
              </button>
            </div>
          </section>
        </div>
      )}

      {/* MODAL: Source Picker to start a new EBP Batch from Finanzas > EBP */}
      {sourcePickerType && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSourcePickerType(null)
          }}
        >
          <section className="create-modal modal-wide" role="dialog" aria-modal="true">
            <div className="create-modal-heading">
              <div>
                <div className="panel-kicker">NUEVO LOTE DE DISPERSIÓN EBP</div>
                <h2>
                  {sourcePickerType === 'Nómina'
                    ? 'Selecciona un periodo de nómina'
                    : 'Selecciona facturas por pagar a proveedores'}
                </h2>
                <p>
                  {sourcePickerType === 'Nómina'
                    ? 'Elige el periodo de nómina cuyos recibos deseas dispersar al banco.'
                    : 'Marca una o varias cuentas por pagar pendientes para agruparlas en un solo archivo bancario.'}
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Cerrar"
                onClick={() => setSourcePickerType(null)}
              >
                <X size={18} />
              </button>
            </div>

            {sourcePickerType === 'Nómina' ? (
              <div className="ebp-source-list">
                {payrollRuns.map((run) => (
                  <article key={run.id} className="ebp-source-item">
                    <div>
                      <strong className="mono">{run.folio}</strong> · <strong>{run.periodLabel}</strong>
                      <small>
                        {run.employeesCount} empleados · Neto: {money(run.totalNet)} · Estado: {run.status}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="button button-primary"
                      onClick={() => launchPayrollWizard(run)}
                    >
                      Generar layout EBP
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div>
                <div className="ebp-source-list">
                  {pendingVendorBills.length === 0 ? (
                    <div className="clients-empty">
                      <AlertTriangle size={18} />
                      <strong>Sin facturas pendientes por pagar</strong>
                    </div>
                  ) : (
                    pendingVendorBills.map((bill) => (
                      <label key={bill.id} className="ebp-source-item" style={{ cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <input
                            type="checkbox"
                            checked={Boolean(pickedBillIds[bill.id])}
                            onChange={(e) =>
                              setPickedBillIds((prev) => ({
                                ...prev,
                                [bill.id]: e.target.checked,
                              }))
                            }
                          />
                          <div>
                            <strong className="mono">{bill.folio}</strong> ·{' '}
                            <strong>{bill.supplierCompany}</strong>
                            <small>
                              Vence: {bill.dueDate} · Estado: {bill.status}
                            </small>
                          </div>
                        </div>
                        <strong className="mono">{money(bill.balance)}</strong>
                      </label>
                    ))
                  )}
                </div>
                <div className="create-modal-actions">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setSourcePickerType(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() =>
                      launchVendorWizard(
                        pendingVendorBills.filter((b) => pickedBillIds[b.id])
                      )
                    }
                  >
                    Continuar al asistente EBP
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* EBP Batch Wizard Modal */}
      {wizardState.isOpen && (
        <EbpBatchWizardModal
          isOpen={wizardState.isOpen}
          batchType={wizardState.batchType}
          sourceRefId={wizardState.sourceRefId}
          sourceFolio={wizardState.sourceFolio}
          candidates={wizardState.candidates}
          packs={packs}
          bankAccounts={bankAccounts}
          existingBatchesCount={batches.length}
          onClose={() => setWizardState((prev) => ({ ...prev, isOpen: false }))}
          onUpdateBankAccountPackValues={onUpdateBankAccountPackValues}
          onCreateBatch={(batch) => {
            onCreateBatch(batch)
            setActiveTab('batches')
          }}
        />
      )}
    </div>
  )
}
