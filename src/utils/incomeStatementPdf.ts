import { jsPDF } from 'jspdf'
import autoTable, { type RowInput } from 'jspdf-autotable'
import type { ComputedIncomeStatement } from '../components/IncomeStatementReport'

export interface CompanyBrandSnapshot {
  workspaceName: string
  tradeName: string
  legalName: string
  rfc: string
  taxRegime: string
  fiscalAddress: string
  avatarColor: string
  logoDataUrl: string
  primaryEmail: string
  phone: string
}

const DEFAULT_BRAND: CompanyBrandSnapshot = {
  workspaceName: 'Brújula Estudio',
  tradeName: 'Brújula Estudio',
  legalName: 'Brújula Arquitectura & Tecnología S.A.P.I. de C.V.',
  rfc: 'BAT1904128N2',
  taxRegime: '601 - General de Ley Personas Morales',
  fiscalAddress: 'Av. Insurgentes Sur 1458, Piso 7 · Ciudad de México, CDMX',
  avatarColor: '#456a61',
  logoDataUrl: '',
  primaryEmail: 'contacto@brujulaestudio.mx',
  phone: '+52 (55) 4162-8900',
}

export function loadCompanyBrandSnapshot(): CompanyBrandSnapshot {
  let orgParsed: Record<string, unknown> = {}
  let genParsed: Record<string, unknown> = {}

  try {
    const rawOrg = window.localStorage.getItem('aes_nexus_settings_org')
    if (rawOrg) orgParsed = JSON.parse(rawOrg) as Record<string, unknown>
  } catch {
    // fallback to defaults
  }

  try {
    const rawGen = window.localStorage.getItem('aes_nexus_settings_general')
    if (rawGen) genParsed = JSON.parse(rawGen) as Record<string, unknown>
  } catch {
    // fallback to defaults
  }

  const workspaceName =
    typeof genParsed.workspaceName === 'string' && genParsed.workspaceName.trim()
      ? genParsed.workspaceName.trim()
      : DEFAULT_BRAND.workspaceName

  const tradeName =
    typeof orgParsed.tradeName === 'string' && orgParsed.tradeName.trim()
      ? orgParsed.tradeName.trim()
      : workspaceName

  const legalName =
    typeof orgParsed.legalName === 'string' && orgParsed.legalName.trim()
      ? orgParsed.legalName.trim()
      : DEFAULT_BRAND.legalName

  const rfc =
    typeof orgParsed.rfc === 'string' && orgParsed.rfc.trim()
      ? orgParsed.rfc.trim()
      : DEFAULT_BRAND.rfc

  const taxRegime =
    typeof orgParsed.taxRegime === 'string' && orgParsed.taxRegime.trim()
      ? orgParsed.taxRegime.trim()
      : DEFAULT_BRAND.taxRegime

  const street = typeof orgParsed.fiscalStreet === 'string' ? orgParsed.fiscalStreet.trim() : ''
  const city = typeof orgParsed.fiscalCity === 'string' ? orgParsed.fiscalCity.trim() : ''
  const state = typeof orgParsed.fiscalState === 'string' ? orgParsed.fiscalState.trim() : ''
  const addressParts = [street, city, state].filter(Boolean)

  return {
    workspaceName,
    tradeName,
    legalName,
    rfc,
    taxRegime,
    fiscalAddress: addressParts.length > 0 ? addressParts.join(' · ') : DEFAULT_BRAND.fiscalAddress,
    avatarColor:
      typeof genParsed.avatarColor === 'string' && genParsed.avatarColor.trim()
        ? genParsed.avatarColor.trim()
        : DEFAULT_BRAND.avatarColor,
    logoDataUrl: typeof orgParsed.logoDataUrl === 'string' ? orgParsed.logoDataUrl.trim() : '',
    primaryEmail:
      typeof genParsed.primaryEmail === 'string' && genParsed.primaryEmail.trim()
        ? genParsed.primaryEmail.trim()
        : DEFAULT_BRAND.primaryEmail,
    phone:
      typeof genParsed.phone === 'string' && genParsed.phone.trim()
        ? genParsed.phone.trim()
        : DEFAULT_BRAND.phone,
  }
}

export function getBrandInitials(name: string): string {
  const tokens = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
  if (tokens.length === 0) return 'BE'
  return tokens.map((t) => t[0]).join('').toUpperCase()
}

function renderMonogramLogoPng(name: string, accentHex: string): {
  dataUrl: string
  width: number
  height: number
} {
  const size = 240
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return { dataUrl: '', width: 1, height: 1 }
  }

  // Background rounded square matching the ERP workspace mark
  const radius = 44
  ctx.fillStyle = accentHex || '#456a61'
  ctx.beginPath()
  ctx.moveTo(radius, 0)
  ctx.lineTo(size - radius, 0)
  ctx.quadraticCurveTo(size, 0, size, radius)
  ctx.lineTo(size, size - radius)
  ctx.quadraticCurveTo(size, size, size - radius, size)
  ctx.lineTo(radius, size)
  ctx.quadraticCurveTo(0, size, 0, size - radius)
  ctx.lineTo(0, radius)
  ctx.quadraticCurveTo(0, 0, radius, 0)
  ctx.closePath()
  ctx.fill()

  // Subtle inner hairline frame
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
  ctx.lineWidth = 5
  ctx.strokeRect(18, 18, size - 36, size - 36)

  // Initials monogram
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 104px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(getBrandInitials(name), size / 2, size / 2 + 5)

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: size,
    height: size,
  }
}

async function resolveBrandLogoPng(brand: CompanyBrandSnapshot): Promise<{
  dataUrl: string
  width: number
  height: number
}> {
  if (!brand.logoDataUrl) {
    return renderMonogramLogoPng(brand.tradeName || brand.workspaceName, brand.avatarColor)
  }

  return new Promise((resolve) => {
    const img = new Image()
    if (!brand.logoDataUrl.startsWith('data:')) {
      img.crossOrigin = 'anonymous'
    }

    const timeoutId = window.setTimeout(() => {
      resolve(renderMonogramLogoPng(brand.tradeName || brand.workspaceName, brand.avatarColor))
    }, 2500)

    img.onload = () => {
      window.clearTimeout(timeoutId)
      try {
        const naturalW = img.naturalWidth || 240
        const naturalH = img.naturalHeight || 240
        const maxSide = 360
        const scale = Math.min(maxSide / naturalW, maxSide / naturalH, 2.5)
        const targetW = Math.max(40, Math.round(naturalW * scale))
        const targetH = Math.max(40, Math.round(naturalH * scale))

        const canvas = document.createElement('canvas')
        canvas.width = targetW
        canvas.height = targetH
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(renderMonogramLogoPng(brand.tradeName || brand.workspaceName, brand.avatarColor))
          return
        }
        ctx.clearRect(0, 0, targetW, targetH)
        ctx.drawImage(img, 0, 0, targetW, targetH)
        resolve({
          dataUrl: canvas.toDataURL('image/png'),
          width: targetW,
          height: targetH,
        })
      } catch {
        resolve(renderMonogramLogoPng(brand.tradeName || brand.workspaceName, brand.avatarColor))
      }
    }

    img.onerror = () => {
      window.clearTimeout(timeoutId)
      resolve(renderMonogramLogoPng(brand.tradeName || brand.workspaceName, brand.avatarColor))
    }

    img.src = brand.logoDataUrl
  })
}

const formatMxn = (val: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(val)

export interface ExportIncomeStatementPdfOptions {
  data: ComputedIncomeStatement
  compareYoY: boolean
  activeScopeSummary: string
  generatedAt?: Date
}

export async function exportIncomeStatementPdf({
  data,
  compareYoY,
  activeScopeSummary,
  generatedAt = new Date(),
}: ExportIncomeStatementPdfOptions): Promise<{ filename: string; rowCount: number }> {
  const brand = loadCompanyBrandSnapshot()
  const logo = await resolveBrandLogoPng(brand)

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
    compress: true,
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 40
  const contentWidth = pageWidth - marginX * 2

  const dateIso = generatedAt.toISOString().split('T')[0]
  const formattedDateLong = new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(generatedAt)
  const formattedTime = new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(generatedAt)

  const pineDark: [number, number, number] = [24, 36, 29]
  const pineAccent: [number, number, number] = [69, 106, 97]
  const mutedText: [number, number, number] = [92, 107, 99]
  const hairlineGray: [number, number, number] = [214, 222, 212]
  const positiveGreen: [number, number, number] = [30, 107, 67]
  const negativeRed: [number, number, number] = [185, 28, 28]
  const expenseAmber: [number, number, number] = [154, 52, 18]

  // ---------------------------------------------------------------------------
  // 1. CORPORATE PRINT HEADER (Logo + Company Fiscal Details + Report Metadata)
  // ---------------------------------------------------------------------------
  let cursorY = 38

  // Top accent rule
  doc.setDrawColor(...pineAccent)
  doc.setLineWidth(2)
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY)
  cursorY += 14

  // Logo placement (left)
  let textStartX = marginX
  if (logo.dataUrl) {
    const maxLogoH = 44
    const maxLogoW = 92
    const logoRatio = Math.min(maxLogoW / Math.max(1, logo.width), maxLogoH / Math.max(1, logo.height))
    const drawW = logo.width * logoRatio
    const drawH = logo.height * logoRatio
    doc.addImage(logo.dataUrl, 'PNG', marginX, cursorY, drawW, drawH)
    textStartX = marginX + drawW + 12
  }

  // Company details next to logo
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12.5)
  doc.setTextColor(...pineDark)
  doc.text(brand.tradeName, textStartX, cursorY + 11)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.2)
  doc.setTextColor(...mutedText)
  doc.text(brand.legalName, textStartX, cursorY + 23)
  doc.text(`RFC: ${brand.rfc}  ·  ${brand.taxRegime}`, textStartX, cursorY + 34)
  doc.text(brand.fiscalAddress, textStartX, cursorY + 45)

  // Report title + Current date right-aligned
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13.5)
  doc.setTextColor(...pineDark)
  doc.text('ESTADO DE RESULTADOS INTEGRAL', pageWidth - marginX, cursorY + 11, {
    align: 'right',
  })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.2)
  doc.setTextColor(...pineAccent)
  doc.text(`Fecha de emisión: ${formattedDateLong} · ${formattedTime} hrs`, pageWidth - marginX, cursorY + 24, {
    align: 'right',
  })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...mutedText)
  doc.text(
    `Fuente: ${
      data.sourceMode === 'consolidated'
        ? 'Consolidado (Gastos empresa + Contabilidad)'
        : 'Solo Cuentas Contables (4xxx–8xxx)'
    }  ·  ISR: ${data.taxRate.toFixed(0)}%`,
    pageWidth - marginX,
    cursorY + 35,
    { align: 'right' }
  )
  doc.text('Moneda base: MXN (Cifras en pesos mexicanos)', pageWidth - marginX, cursorY + 46, {
    align: 'right',
  })

  cursorY += 58

  // Scope filter summary bar
  doc.setFillColor(246, 249, 246)
  doc.setDrawColor(...hairlineGray)
  doc.setLineWidth(0.7)
  doc.roundedRect(marginX, cursorY, contentWidth, 22, 4, 4, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.6)
  doc.setTextColor(...pineDark)
  doc.text('ALCANCE:', marginX + 10, cursorY + 13.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...mutedText)
  const scopeMaxW = contentWidth - 62
  const scopeClipped = doc.splitTextToSize(activeScopeSummary, scopeMaxW)[0] || activeScopeSummary
  doc.text(scopeClipped, marginX + 54, cursorY + 13.5)

  cursorY += 34

  // ---------------------------------------------------------------------------
  // 2. EXECUTIVE PROFITABILITY & BREAK-EVEN STRIP (4 Clean Bordered Cards)
  // ---------------------------------------------------------------------------
  const gap = 8
  const cardW = (contentWidth - gap * 3) / 4
  const cardH = 52
  const kpiCards = [
    {
      label: 'MARGEN BRUTO',
      value: `${data.grossMarginPct.toFixed(1)}%`,
      sub: `Utilidad: ${formatMxn(data.grossProfit)}`,
      tone: pineDark,
    },
    {
      label: 'MARGEN OPERATIVO',
      value: `${data.operatingMarginPct.toFixed(1)}%`,
      sub: `EBIT: ${formatMxn(data.operatingIncome)}`,
      tone: pineDark,
    },
    {
      label: 'MARGEN NETO',
      value: `${data.netMarginPct.toFixed(1)}%`,
      sub: `Neto: ${formatMxn(data.netIncome)}`,
      tone: data.netIncome >= 0 ? positiveGreen : negativeRed,
    },
    {
      label: 'PUNTO DE EQUILIBRIO',
      value: formatMxn(data.breakEvenSales),
      sub:
        data.breakEvenSales > 0
          ? `Cobertura: ${data.coverageRatioPct.toFixed(0)}%`
          : 'Sin margen positivo',
      tone: pineDark,
    },
  ]

  kpiCards.forEach((card, idx) => {
    const x = marginX + idx * (cardW + gap)
    doc.setFillColor(idx === 2 ? 241 : 250, idx === 2 ? 247 : 252, idx === 2 ? 243 : 250)
    doc.setDrawColor(...hairlineGray)
    doc.setLineWidth(0.75)
    doc.roundedRect(x, cursorY, cardW, cardH, 5, 5, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...mutedText)
    doc.text(card.label, x + 9, cursorY + 14)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...card.tone)
    doc.text(card.value, x + 9, cursorY + 31)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...mutedText)
    doc.text(card.sub, x + 9, cursorY + 44)
  })

  cursorY += cardH + 16

  // ---------------------------------------------------------------------------
  // 3. MAIN INCOME STATEMENT TABLE (P&L)
  // ---------------------------------------------------------------------------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...pineDark)
  doc.text('1. Estado de Resultados Integral (P&L)', marginX, cursorY)
  cursorY += 6

  const pnlHead = compareYoY
    ? [['Signo', 'Concepto Contable', 'Origen en ERP', 'Importe (MXN)', '% Ing.', 'Periodo Ant.', 'YoY %']]
    : [['Signo', 'Concepto Contable', 'Origen en ERP', 'Importe (MXN)', '% Ing.']]

  const pnlBody: RowInput[] = data.lines.map((row) => {
    const amountText =
      row.sign === '−' && row.amount > 0 ? `(${formatMxn(row.amount)})` : formatMxn(row.amount)
    const pctText = `${row.pctOfRevenue.toFixed(1)}%`
    if (compareYoY) {
      const yoyText =
        row.yoyPct === null
          ? '—'
          : `${row.yoyPct >= 0 ? '+' : ''}${row.yoyPct.toFixed(1)}%`
      return [row.sign, row.label, row.sourceLabel, amountText, pctText, formatMxn(row.priorAmount), yoyText]
    }
    return [row.sign, row.label, row.sourceLabel, amountText, pctText]
  })

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX, bottom: 52 },
    head: pnlHead,
    body: pnlBody,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 8.2,
      cellPadding: { top: 5.5, bottom: 5.5, left: 6, right: 6 },
      textColor: [31, 43, 36],
      lineColor: hairlineGray,
      lineWidth: { bottom: 0.4 },
    },
    headStyles: {
      fillColor: [238, 243, 238],
      textColor: pineDark,
      fontStyle: 'bold',
      fontSize: 7.5,
      lineWidth: { top: 0.8, bottom: 0.8 },
      lineColor: pineAccent,
    },
    columnStyles: compareYoY
      ? {
          0: { halign: 'center', cellWidth: 32 },
          1: { cellWidth: 162 },
          2: { cellWidth: 122 },
          3: { halign: 'right', cellWidth: 74 },
          4: { halign: 'right', cellWidth: 42 },
          5: { halign: 'right', cellWidth: 58 },
          6: { halign: 'right', cellWidth: 42 },
        }
      : {
          0: { halign: 'center', cellWidth: 36 },
          1: { cellWidth: 196 },
          2: { cellWidth: 158 },
          3: { halign: 'right', cellWidth: 88 },
          4: { halign: 'right', cellWidth: 54 },
        },
    didParseCell: (hookData) => {
      if (hookData.section !== 'body') return
      const line = data.lines[hookData.row.index]
      if (!line) return

      if (line.rowKind === 'detail') {
        hookData.cell.styles.fillColor = [250, 252, 250]
        hookData.cell.styles.textColor = [78, 92, 84]
        hookData.cell.styles.fontSize = 7.7
        if (hookData.column.index === 1) {
          hookData.cell.styles.cellPadding = { top: 4.5, bottom: 4.5, left: 16, right: 6 }
        }
      } else if (line.rowKind === 'subtotal') {
        hookData.cell.styles.fillColor = [240, 245, 240]
        hookData.cell.styles.fontStyle = 'bold'
        hookData.cell.styles.lineWidth = { top: 0.7, bottom: 0.7 }
        hookData.cell.styles.lineColor = [196, 209, 198]
      } else if (line.rowKind === 'final') {
        hookData.cell.styles.fillColor = [229, 239, 233]
        hookData.cell.styles.fontStyle = 'bold'
        hookData.cell.styles.fontSize = 9
        hookData.cell.styles.lineWidth = { top: 1.2, bottom: 1.2 }
        hookData.cell.styles.lineColor = pineAccent
        if (hookData.column.index === 3) {
          hookData.cell.styles.textColor = line.amount >= 0 ? positiveGreen : negativeRed
        }
      } else if (line.negativeHighlight && line.amount > 0 && hookData.column.index === 3) {
        hookData.cell.styles.textColor = expenseAmber
      }

      if (hookData.column.index === 2) {
        hookData.cell.styles.textColor = mutedText
        hookData.cell.styles.fontSize = 7.4
      }
    },
  })

  const getLastY = () =>
    (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? cursorY + 200

  let nextY = getLastY() + 18

  // ---------------------------------------------------------------------------
  // 4. BREAK-EVEN & COST STRUCTURE TABLE
  // ---------------------------------------------------------------------------
  if (nextY > pageHeight - 150) {
    doc.addPage()
    nextY = 44
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...pineDark)
  doc.text('2. Análisis de Punto de Equilibrio y Estructura de Costos', marginX, nextY)
  nextY += 6

  autoTable(doc, {
    startY: nextY,
    margin: { left: marginX, right: marginX, bottom: 52 },
    head: [['Indicador de Equilibrio', 'Valor / Importe', 'Interpretación Financiera']],
    body: [
      [
        'Costos y gastos fijos',
        formatMxn(data.fixedCosts),
        'Incluye gastos fijos de empresa, nómina y renta/servicios.',
      ],
      [
        'Costos variables (Venta + variables)',
        formatMxn(data.variableCosts),
        'Costo de ventas y partidas variables proporcionales al ingreso.',
      ],
      [
        'Margen de contribución',
        `${formatMxn(data.contributionMargin)} (${data.contributionMarginRatioPct.toFixed(1)}%)`,
        'Porción de cada peso vendido disponible para cubrir costos fijos.',
      ],
      [
        'Punto de equilibrio en ventas',
        formatMxn(data.breakEvenSales),
        `Cobertura actual del ${data.coverageRatioPct.toFixed(1)}% sobre la meta de equilibrio.`,
      ],
      [
        'Margen de seguridad',
        `${formatMxn(data.safetyMarginAmount)} (${data.safetyMarginPct.toFixed(1)}%)`,
        data.safetyMarginAmount >= 0
          ? 'Superávit de ingresos por encima del punto de equilibrio.'
          : 'Déficit requerido para alcanzar el punto de equilibrio.',
      ],
    ],
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: { top: 4.5, bottom: 4.5, left: 6, right: 6 },
      textColor: [31, 43, 36],
      lineColor: hairlineGray,
      lineWidth: { bottom: 0.4 },
    },
    headStyles: {
      fillColor: [238, 243, 238],
      textColor: pineDark,
      fontStyle: 'bold',
      fontSize: 7.4,
      lineWidth: { top: 0.7, bottom: 0.7 },
      lineColor: pineAccent,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 165 },
      1: { halign: 'right', fontStyle: 'bold', cellWidth: 118 },
      2: { textColor: mutedText, cellWidth: 249 },
    },
  })

  nextY = getLastY() + 18

  // ---------------------------------------------------------------------------
  // 5. ORIGIN AUDIT TABLES (FinanceCompanyExpenses + FinanceAccounting)
  // ---------------------------------------------------------------------------
  if (nextY > pageHeight - 170) {
    doc.addPage()
    nextY = 44
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...pineDark)
  doc.text('3. Origen: Gastos de la Empresa', marginX, nextY)
  nextY += 6

  autoTable(doc, {
    startY: nextY,
    margin: { left: marginX, right: marginX, bottom: 52 },
    head: [['Categoría Empresarial', 'Pólizas', 'Importe Total', 'Composición Fijo / Variable']],
    body: [
      [
        'Gastos administrativos',
        String(data.companyExpenseBreakdown.adminCount),
        formatMxn(data.companyExpenseBreakdown.adminTotal),
        'Integrado a Gastos operativos y de administración',
      ],
      [
        'Gastos operativos',
        String(data.companyExpenseBreakdown.operatingCount),
        formatMxn(data.companyExpenseBreakdown.operatingTotal),
        'Integrado a Gastos operativos y de administración',
      ],
      [
        'Gastos financieros',
        String(data.companyExpenseBreakdown.financialCount),
        formatMxn(data.companyExpenseBreakdown.financialTotal),
        'Integrado a Gastos financieros (después de EBIT)',
      ],
      [
        'Total clasificación Fijo / Variable',
        String(
          data.companyExpenseBreakdown.adminCount +
            data.companyExpenseBreakdown.operatingCount +
            data.companyExpenseBreakdown.financialCount
        ),
        formatMxn(
          data.companyExpenseBreakdown.fixedTotal + data.companyExpenseBreakdown.variableTotal
        ),
        `Fijo: ${formatMxn(data.companyExpenseBreakdown.fixedTotal)} · Variable: ${formatMxn(
          data.companyExpenseBreakdown.variableTotal
        )}`,
      ],
    ],
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 7.9,
      cellPadding: { top: 4.5, bottom: 4.5, left: 6, right: 6 },
      textColor: [31, 43, 36],
      lineColor: hairlineGray,
      lineWidth: { bottom: 0.4 },
    },
    headStyles: {
      fillColor: [238, 243, 238],
      textColor: pineDark,
      fontStyle: 'bold',
      fontSize: 7.3,
      lineWidth: { top: 0.7, bottom: 0.7 },
      lineColor: pineAccent,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 152 },
      1: { halign: 'right', cellWidth: 48 },
      2: { halign: 'right', fontStyle: 'bold', cellWidth: 92 },
      3: { textColor: mutedText, cellWidth: 240 },
    },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.row.index === 3) {
        hookData.cell.styles.fillColor = [240, 245, 240]
        hookData.cell.styles.fontStyle = 'bold'
      }
    },
  })

  nextY = getLastY() + 18

  const usedAccounts = [
    ...data.accountBreakdown.revenueAccounts,
    ...data.accountBreakdown.cogsAccounts,
    ...data.accountBreakdown.opExAccounts,
    ...data.accountBreakdown.finExAccounts,
    ...data.accountBreakdown.otherIncomeAccounts,
  ]

  if (usedAccounts.length > 0) {
    if (nextY > pageHeight - 150) {
      doc.addPage()
      nextY = 44
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...pineDark)
    doc.text('4. Origen: Cuentas Contables Activas (4xxx–8xxx)', marginX, nextY)
    nextY += 6

    autoTable(doc, {
      startY: nextY,
      margin: { left: marginX, right: marginX, bottom: 52 },
      head: [['Código', 'Cuenta Contable', 'Grupo P&L', 'Saldo']],
      body: usedAccounts.map((acc) => [acc.code, acc.name, acc.type, formatMxn(acc.balance)]),
      theme: 'plain',
      styles: {
        font: 'helvetica',
        fontSize: 7.8,
        cellPadding: { top: 4, bottom: 4, left: 6, right: 6 },
        textColor: [31, 43, 36],
        lineColor: hairlineGray,
        lineWidth: { bottom: 0.4 },
      },
      headStyles: {
        fillColor: [238, 243, 238],
        textColor: pineDark,
        fontStyle: 'bold',
        fontSize: 7.3,
        lineWidth: { top: 0.7, bottom: 0.7 },
        lineColor: pineAccent,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 74 },
        1: { cellWidth: 222 },
        2: { textColor: mutedText, cellWidth: 136 },
        3: { halign: 'right', fontStyle: 'bold', cellWidth: 100 },
      },
    })

    nextY = getLastY() + 26
  }

  // Signature block on final page if room available (otherwise add clean page break)
  if (nextY > pageHeight - 90) {
    doc.addPage()
    nextY = 64
  }
  const sigWidth = 190
  const leftSigX = marginX + 20
  const rightSigX = pageWidth - marginX - sigWidth - 20
  doc.setDrawColor(...hairlineGray)
  doc.setLineWidth(0.8)
  doc.line(leftSigX, nextY + 20, leftSigX + sigWidth, nextY + 20)
  doc.line(rightSigX, nextY + 20, rightSigX + sigWidth, nextY + 20)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.8)
  doc.setTextColor(...pineDark)
  doc.text('Elaboró · Finanzas y Contabilidad', leftSigX + sigWidth / 2, nextY + 32, {
    align: 'center',
  })
  doc.text('Autorizó · Dirección General', rightSigX + sigWidth / 2, nextY + 32, {
    align: 'center',
  })

  // ---------------------------------------------------------------------------
  // 6. RUNNING PRINT FOOTER ON ALL PAGES
  // ---------------------------------------------------------------------------
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p += 1) {
    doc.setPage(p)
    const footerY = pageHeight - 28
    doc.setDrawColor(...hairlineGray)
    doc.setLineWidth(0.6)
    doc.line(marginX, footerY - 10, pageWidth - marginX, footerY - 10)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.4)
    doc.setTextColor(...mutedText)
    doc.text(
      `${brand.tradeName} · RFC ${brand.rfc} · Estado de Resultados (${formattedDateLong})`,
      marginX,
      footerY
    )
    doc.text(`Página ${p} de ${totalPages}`, pageWidth - marginX, footerY, {
      align: 'right',
    })
  }

  const filename = `estado_de_resultados_${dateIso}.pdf`
  doc.save(filename)
  return { filename, rowCount: data.lines.length }
}
