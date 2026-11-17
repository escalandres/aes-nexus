import { makeValidClabe } from './ebp'

export type PayrollFrequency = 'Quincenal' | 'Semanal' | 'Mensual' | 'Extraordinaria'

export type PayrollStatus = 'Pagada' | 'Aprobada' | 'Borrador'

export interface PayrollReceiptLine {
  id: string
  employeeId: string
  employeeCode: string
  employeeName: string
  roleTitle: string
  departmentName: string
  bankName?: string
  clabe?: string
  daysWorked: number
  baseGross: number
  bonuses: number
  isrDeduction: number
  imssDeduction: number
  otherDeductions: number
  netPay: number
}

export interface PayrollRunRecord {
  id: string
  folio: string
  periodLabel: string
  frequency: PayrollFrequency
  startDate: string
  endDate: string
  paymentDate: string
  status: PayrollStatus
  paymentMethod: string
  bankAccountId?: string
  employeesCount: number
  totalGross: number
  totalBonuses: number
  totalDeductions: number
  totalNet: number
  notes?: string
  receipts: PayrollReceiptLine[]
}

import type { EmployeeRecord } from './employees'

export function getDefaultDaysForFrequency(frequency: PayrollFrequency): number {
  switch (frequency) {
    case 'Semanal':
      return 7
    case 'Quincenal':
      return 15
    case 'Mensual':
    case 'Extraordinaria':
      return 30
  }
}

export function calculatePeriodDays(
  startDate?: string,
  endDate?: string,
  fallbackFrequency: PayrollFrequency = 'Quincenal'
): number {
  if (!startDate || !endDate) return getDefaultDaysForFrequency(fallbackFrequency)
  const start = new Date(`${startDate}T12:00:00`)
  const end = new Date(`${endDate}T12:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return getDefaultDaysForFrequency(fallbackFrequency)
  }
  const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  return Math.max(1, Math.min(31, diffDays))
}

export function calculateProratedBaseGross(
  monthlySalary: number,
  frequency: PayrollFrequency,
  daysWorked: number
): number {
  if (frequency === 'Extraordinaria') {
    return Math.round((monthlySalary / 30) * daysWorked)
  }
  const daily = monthlySalary / 30
  return Math.round(daily * daysWorked)
}

export function estimatePayrollTaxes(
  grossPlusBonuses: number,
  options?: { isHonorarios?: boolean; applyTaxes?: boolean }
) {
  if (options?.applyTaxes === false || grossPlusBonuses <= 0) {
    return { isr: 0, imss: 0 }
  }
  // Estimación simplificada progresiva para ISR + cuota obrera IMSS
  const isrRate =
    grossPlusBonuses > 25000
      ? 0.19
      : grossPlusBonuses > 15000
      ? 0.145
      : grossPlusBonuses > 8000
      ? 0.105
      : 0.065
  const isr = Math.round(grossPlusBonuses * isrRate)
  const imss = options?.isHonorarios ? 0 : Math.round(grossPlusBonuses * 0.025)
  return { isr, imss }
}

export interface EmployeePayrollOverride {
  included?: boolean
  daysWorked?: number
  bonuses?: number
  otherDeductions?: number
}

export interface AutomatePayrollParams {
  employees: EmployeeRecord[]
  frequency: PayrollFrequency
  startDate?: string
  endDate?: string
  includeAllActive?: boolean
  applyTaxes?: boolean
  overrides?: Record<string, EmployeePayrollOverride>
}

export interface AutomatedPayrollResult {
  periodDays: number
  receipts: PayrollReceiptLine[]
  totals: {
    employeesCount: number
    totalGross: number
    totalBonuses: number
    totalIsr: number
    totalImss: number
    totalOtherDeductions: number
    totalDeductions: number
    totalNet: number
  }
}

export function calculateEmployeePayrollReceipt(
  employee: EmployeeRecord,
  options: {
    frequency: PayrollFrequency
    daysWorked: number
    bonuses?: number
    otherDeductions?: number
    applyTaxes?: boolean
  }
): PayrollReceiptLine {
  const safeDays = Math.max(0, Math.min(31, options.daysWorked))
  const bonuses = Math.max(0, options.bonuses ?? 0)
  const otherDeductions = Math.max(0, options.otherDeductions ?? 0)
  const baseGross = calculateProratedBaseGross(
    employee.baseSalaryMonthly,
    options.frequency,
    safeDays
  )
  const grossTotal = baseGross + bonuses
  const { isr, imss } = estimatePayrollTaxes(grossTotal, {
    isHonorarios: employee.contractType === 'Honorarios',
    applyTaxes: options.applyTaxes,
  })
  const netPay = Math.max(0, grossTotal - isr - imss - otherDeductions)

  return {
    id: `rec_${employee.id}_${safeDays}_${bonuses}_${otherDeductions}`,
    employeeId: employee.id,
    employeeCode: employee.employeeCode,
    employeeName: employee.fullName,
    roleTitle: employee.roleTitle,
    departmentName: employee.departmentName,
    bankName: employee.bankName,
    clabe: employee.clabe,
    daysWorked: safeDays,
    baseGross,
    bonuses,
    isrDeduction: isr,
    imssDeduction: imss,
    otherDeductions,
    netPay,
  }
}

export function automatePayrollCalculation(
  params: AutomatePayrollParams
): AutomatedPayrollResult {
  const periodDays = calculatePeriodDays(
    params.startDate,
    params.endDate,
    params.frequency
  )
  const activeEmployees = params.employees.filter((emp) => emp.status === 'Activo')

  const receipts: PayrollReceiptLine[] = []
  for (const emp of activeEmployees) {
    const ov = params.overrides?.[emp.id]
    const defaultIncluded =
      params.includeAllActive || params.frequency === 'Extraordinaria'
        ? true
        : emp.paymentFrequency === params.frequency
    const isIncluded = ov?.included ?? defaultIncluded
    if (!isIncluded) continue

    receipts.push(
      calculateEmployeePayrollReceipt(emp, {
        frequency: params.frequency,
        daysWorked: ov?.daysWorked ?? periodDays,
        bonuses: ov?.bonuses ?? 0,
        otherDeductions: ov?.otherDeductions ?? 0,
        applyTaxes: params.applyTaxes,
      })
    )
  }

  const totals = receipts.reduce(
    (acc, line) => ({
      employeesCount: acc.employeesCount + 1,
      totalGross: acc.totalGross + line.baseGross,
      totalBonuses: acc.totalBonuses + line.bonuses,
      totalIsr: acc.totalIsr + line.isrDeduction,
      totalImss: acc.totalImss + line.imssDeduction,
      totalOtherDeductions: acc.totalOtherDeductions + line.otherDeductions,
      totalDeductions:
        acc.totalDeductions +
        line.isrDeduction +
        line.imssDeduction +
        line.otherDeductions,
      totalNet: acc.totalNet + line.netPay,
    }),
    {
      employeesCount: 0,
      totalGross: 0,
      totalBonuses: 0,
      totalIsr: 0,
      totalImss: 0,
      totalOtherDeductions: 0,
      totalDeductions: 0,
      totalNet: 0,
    }
  )

  return {
    periodDays,
    receipts,
    totals,
  }
}

export const initialPayrollRuns: PayrollRunRecord[] = [
  {
    id: 'pay_1',
    folio: 'NOM-2026-Q21',
    periodLabel: '1ra Quincena Noviembre 2026',
    frequency: 'Quincenal',
    startDate: '2026-11-01',
    endDate: '2026-11-15',
    paymentDate: '2026-11-15',
    status: 'Pagada',
    paymentMethod: 'Transferencia SPEI · BBVA México **** 4920',
    bankAccountId: 'bank_1',
    employeesCount: 4,
    totalGross: 93250,
    totalBonuses: 4500,
    totalDeductions: 17125,
    totalNet: 80625,
    notes: 'Dispersión ordinaria Q21 aplicada sin incidencias.',
    receipts: [
      {
        id: 'rec_1',
        employeeId: 'emp_1',
        employeeCode: 'EMP-001',
        employeeName: 'Andrea Morales',
        roleTitle: 'Directora General',
        departmentName: 'Dirección General',
        bankName: 'BBVA México',
        clabe: makeValidClabe('01218000192837465'),
        daysWorked: 15,
        baseGross: 34000,
        bonuses: 0,
        isrDeduction: 6460,
        imssDeduction: 850,
        otherDeductions: 0,
        netPay: 26690,
      },
      {
        id: 'rec_2',
        employeeId: 'emp_2',
        employeeCode: 'EMP-002',
        employeeName: 'Roberto Santos',
        roleTitle: 'Gerente de Operaciones y Logística',
        departmentName: 'Operaciones y Logística',
        bankName: 'Santander',
        clabe: makeValidClabe('01418000554433221'),
        daysWorked: 15,
        baseGross: 22250,
        bonuses: 1500,
        isrDeduction: 3444,
        imssDeduction: 594,
        otherDeductions: 0,
        netPay: 19712,
      },
      {
        id: 'rec_3',
        employeeId: 'emp_3',
        employeeCode: 'EMP-003',
        employeeName: 'Gabriela Morales',
        roleTitle: 'Contralora y Tesorería',
        departmentName: 'Finanzas y Tesorería',
        bankName: 'Banorte',
        clabe: makeValidClabe('07218000881234567'),
        daysWorked: 15,
        baseGross: 21000,
        bonuses: 0,
        isrDeduction: 3045,
        imssDeduction: 525,
        otherDeductions: 0,
        netPay: 17430,
      },
      {
        id: 'rec_4',
        employeeId: 'emp_4',
        employeeCode: 'EMP-004',
        employeeName: 'Carlos Méndez',
        roleTitle: 'Coordinador Comercial B2B',
        departmentName: 'Ventas y Comercial',
        bankName: 'BBVA México',
        clabe: makeValidClabe('01218000994411223'),
        daysWorked: 15,
        baseGross: 16000,
        bonuses: 3000,
        isrDeduction: 1732,
        imssDeduction: 475,
        otherDeductions: 0,
        netPay: 16793,
      },
    ],
  },
  {
    id: 'pay_2',
    folio: 'NOM-2026-S45',
    periodLabel: 'Semana 45 · Noviembre 2026',
    frequency: 'Semanal',
    startDate: '2026-11-02',
    endDate: '2026-11-08',
    paymentDate: '2026-11-08',
    status: 'Pagada',
    paymentMethod: 'Transferencia SPEI · BBVA México **** 4920',
    bankAccountId: 'bank_1',
    employeesCount: 1,
    totalGross: 4317,
    totalBonuses: 500,
    totalDeductions: 433,
    totalNet: 4384,
    notes: 'Nómina semanal de punto de operación Guadalajara.',
    receipts: [
      {
        id: 'rec_5',
        employeeId: 'emp_7',
        employeeCode: 'EMP-007',
        employeeName: 'Sofía Herrera',
        roleTitle: 'Especialista de Punto de Operación',
        departmentName: 'Ventas y Comercial',
        bankName: 'Santander',
        clabe: makeValidClabe('01432000778899001'),
        daysWorked: 7,
        baseGross: 4317,
        bonuses: 500,
        isrDeduction: 313,
        imssDeduction: 120,
        otherDeductions: 0,
        netPay: 4384,
      },
    ],
  },
  {
    id: 'pay_3',
    folio: 'NOM-2026-M10',
    periodLabel: 'Mensual Octubre 2026',
    frequency: 'Mensual',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    paymentDate: '2026-10-31',
    status: 'Pagada',
    paymentMethod: 'Transferencia SPEI · Banorte **** 8812',
    bankAccountId: 'bank_2',
    employeesCount: 1,
    totalGross: 46000,
    totalBonuses: 2000,
    totalDeductions: 10320,
    totalNet: 37680,
    notes: 'Pago mensual personal esquema gerencial TI.',
    receipts: [
      {
        id: 'rec_6',
        employeeId: 'emp_5',
        employeeCode: 'EMP-005',
        employeeName: 'Laura Ramírez',
        roleTitle: 'Arquitecta de Sistemas ERP',
        departmentName: 'Tecnología y Sistemas',
        bankName: 'HSBC',
        clabe: makeValidClabe('02118000334455667'),
        daysWorked: 30,
        baseGross: 46000,
        bonuses: 2000,
        isrDeduction: 9120,
        imssDeduction: 1200,
        otherDeductions: 0,
        netPay: 37680,
      },
    ],
  },
  {
    id: 'pay_4',
    folio: 'NOM-2026-Q20',
    periodLabel: '2da Quincena Octubre 2026',
    frequency: 'Quincenal',
    startDate: '2026-10-16',
    endDate: '2026-10-31',
    paymentDate: '2026-10-31',
    status: 'Pagada',
    paymentMethod: 'Transferencia SPEI · BBVA México **** 4920',
    bankAccountId: 'bank_1',
    employeesCount: 5,
    totalGross: 108000,
    totalBonuses: 2500,
    totalDeductions: 20140,
    totalNet: 90360,
    notes: 'Cierre de quincena octubre con plantilla quincenal completa.',
    receipts: [
      {
        id: 'rec_7',
        employeeId: 'emp_1',
        employeeCode: 'EMP-001',
        employeeName: 'Andrea Morales',
        roleTitle: 'Directora General',
        departmentName: 'Dirección General',
        bankName: 'BBVA México',
        clabe: makeValidClabe('01218000192837465'),
        daysWorked: 15,
        baseGross: 34000,
        bonuses: 0,
        isrDeduction: 6460,
        imssDeduction: 850,
        otherDeductions: 0,
        netPay: 26690,
      },
      {
        id: 'rec_8',
        employeeId: 'emp_2',
        employeeCode: 'EMP-002',
        employeeName: 'Roberto Santos',
        roleTitle: 'Gerente de Operaciones y Logística',
        departmentName: 'Operaciones y Logística',
        bankName: 'Santander',
        clabe: makeValidClabe('01418000554433221'),
        daysWorked: 15,
        baseGross: 22250,
        bonuses: 0,
        isrDeduction: 3226,
        imssDeduction: 556,
        otherDeductions: 0,
        netPay: 18468,
      },
      {
        id: 'rec_9',
        employeeId: 'emp_3',
        employeeCode: 'EMP-003',
        employeeName: 'Gabriela Morales',
        roleTitle: 'Contralora y Tesorería',
        departmentName: 'Finanzas y Tesorería',
        bankName: 'Banorte',
        clabe: makeValidClabe('07218000881234567'),
        daysWorked: 15,
        baseGross: 21000,
        bonuses: 0,
        isrDeduction: 3045,
        imssDeduction: 525,
        otherDeductions: 0,
        netPay: 17430,
      },
      {
        id: 'rec_10',
        employeeId: 'emp_4',
        employeeCode: 'EMP-004',
        employeeName: 'Carlos Méndez',
        roleTitle: 'Coordinador Comercial B2B',
        departmentName: 'Ventas y Comercial',
        bankName: 'BBVA México',
        clabe: makeValidClabe('01218000994411223'),
        daysWorked: 15,
        baseGross: 16000,
        bonuses: 2500,
        isrDeduction: 2683,
        imssDeduction: 463,
        otherDeductions: 0,
        netPay: 15354,
      },
      {
        id: 'rec_11',
        employeeId: 'emp_6',
        employeeCode: 'EMP-006',
        employeeName: 'Mateo Navarro',
        roleTitle: 'Jefe de Sucursal Monterrey',
        departmentName: 'Operaciones y Logística',
        bankName: 'Banorte',
        clabe: makeValidClabe('07258000445566778'),
        daysWorked: 15,
        baseGross: 14750,
        bonuses: 0,
        isrDeduction: 1963,
        imssDeduction: 369,
        otherDeductions: 0,
        netPay: 12418,
      },
    ],
  },
]
