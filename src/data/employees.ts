import { makeValidClabe } from './ebp'

export type EmployeeStatus = 'Activo' | 'En licencia' | 'Inactivo'

export type ContractType =
  | 'Tiempo completo'
  | 'Medio tiempo'
  | 'Por proyecto'
  | 'Honorarios'

export type PaymentFrequency = 'Quincenal' | 'Semanal' | 'Mensual'

export interface EmployeeRecord {
  id: string
  employeeCode: string
  fullName: string
  initials: string
  avatarColor: 'sage' | 'blue' | 'peach' | 'lilac' | 'amber'
  email: string
  phone: string
  roleTitle: string
  departmentId: string
  departmentName: string
  locationId: string
  locationName: string
  contractType: ContractType
  hireDate: string
  status: EmployeeStatus
  rfc?: string
  curp?: string
  nss?: string
  baseSalaryMonthly: number
  paymentFrequency: PaymentFrequency
  bankName?: string
  clabe?: string
  accountNumber?: string
  bankPackValues?: Record<string, Record<string, string>>
  emergencyContact?: string
  notes?: string
}

export const initialEmployees: EmployeeRecord[] = [
  {
    id: 'emp_1',
    employeeCode: 'EMP-001',
    fullName: 'Andrea Morales',
    initials: 'AM',
    avatarColor: 'sage',
    email: 'andrea.morales@aesnexus.mx',
    phone: '55 4120 8801',
    roleTitle: 'Directora General',
    departmentId: 'dep_1',
    departmentName: 'Dirección General',
    locationId: 'loc_1',
    locationName: 'Sede Corporativa Reforma',
    contractType: 'Tiempo completo',
    hireDate: '2023-03-15',
    status: 'Activo',
    rfc: 'MOAA880412H31',
    curp: 'MOAA880412MDFRND04',
    nss: '11088812345',
    baseSalaryMonthly: 68000,
    paymentFrequency: 'Quincenal',
    bankName: 'BBVA México',
    clabe: makeValidClabe('01218000192837465'),
    accountNumber: '0192837465',
    bankPackValues: {
      pack_bbva_netcash_nomina: { abonoMode: '01', plazaCode: '001' },
      pack_banorte_bem_pagos: { operationCode: '04', destBankCode: '012' },
    },
    emergencyContact: 'Luis Morales · 55 8810 2231',
    notes: 'Responsable de aprobaciones financieras y operación general.',
  },
  {
    id: 'emp_2',
    employeeCode: 'EMP-002',
    fullName: 'Roberto Santos',
    initials: 'RS',
    avatarColor: 'blue',
    email: 'roberto.santos@aesnexus.mx',
    phone: '55 3910 4412',
    roleTitle: 'Gerente de Operaciones y Logística',
    departmentId: 'dep_2',
    departmentName: 'Operaciones y Logística',
    locationId: 'loc_2',
    locationName: 'Almacén Central Vallejo',
    contractType: 'Tiempo completo',
    hireDate: '2023-06-01',
    status: 'Activo',
    rfc: 'SAPR851109K90',
    curp: 'SAPR851109HDFNRB01',
    nss: '11058549201',
    baseSalaryMonthly: 44500,
    paymentFrequency: 'Quincenal',
    bankName: 'Santander',
    clabe: makeValidClabe('01418000554433221'),
    accountNumber: '5544332210',
    bankPackValues: {
      pack_bbva_netcash_nomina: { abonoMode: '40', plazaCode: '001' },
      pack_banorte_bem_pagos: { operationCode: '04', destBankCode: '014' },
    },
    emergencyContact: 'Elena Santos · 55 2911 4088',
    notes: 'Líder de inventario multi-almacén y traslados entre ubicaciones.',
  },
  {
    id: 'emp_3',
    employeeCode: 'EMP-003',
    fullName: 'Gabriela Morales',
    initials: 'GM',
    avatarColor: 'lilac',
    email: 'gabriela.morales@aesnexus.mx',
    phone: '55 5092 1830',
    roleTitle: 'Contralora y Tesorería',
    departmentId: 'dep_3',
    departmentName: 'Finanzas y Tesorería',
    locationId: 'loc_1',
    locationName: 'Sede Corporativa Reforma',
    contractType: 'Tiempo completo',
    hireDate: '2023-08-20',
    status: 'Activo',
    rfc: 'MOGG900218T42',
    curp: 'MOGG900218MDFRGR07',
    nss: '11099011223',
    baseSalaryMonthly: 42000,
    paymentFrequency: 'Quincenal',
    bankName: 'Banorte',
    clabe: makeValidClabe('07218000881234567'),
    accountNumber: '0881234567',
    bankPackValues: {
      pack_bbva_netcash_nomina: { abonoMode: '40', plazaCode: '001' },
      pack_banorte_bem_pagos: { operationCode: '01', destBankCode: '072' },
    },
    emergencyContact: 'Carlos Morales · 55 7712 0019',
  },
  {
    id: 'emp_4',
    employeeCode: 'EMP-004',
    fullName: 'Carlos Méndez',
    initials: 'CM',
    avatarColor: 'peach',
    email: 'carlos.mendez@aesnexus.mx',
    phone: '55 6120 7743',
    roleTitle: 'Coordinador Comercial B2B',
    departmentId: 'dep_4',
    departmentName: 'Ventas y Comercial',
    locationId: 'loc_1',
    locationName: 'Sede Corporativa Reforma',
    contractType: 'Tiempo completo',
    hireDate: '2024-01-10',
    status: 'Activo',
    rfc: 'MECC920725B18',
    nss: '11129266712',
    baseSalaryMonthly: 32000,
    paymentFrequency: 'Quincenal',
    bankName: 'BBVA México',
    clabe: makeValidClabe('01218000994411223'),
    accountNumber: '0994411223',
    bankPackValues: {
      pack_bbva_netcash_nomina: { abonoMode: '01', plazaCode: '001' },
      pack_banorte_bem_pagos: { operationCode: '04', destBankCode: '012' },
    },
    notes: 'Esquema base + comisiones sobre cierre de pedidos.',
  },
  {
    id: 'emp_5',
    employeeCode: 'EMP-005',
    fullName: 'Laura Ramírez',
    initials: 'LR',
    avatarColor: 'blue',
    email: 'laura.ramirez@aesnexus.mx',
    phone: '55 8320 9104',
    roleTitle: 'Arquitecta de Sistemas ERP',
    departmentId: 'dep_5',
    departmentName: 'Tecnología y Sistemas',
    locationId: 'loc_1',
    locationName: 'Sede Corporativa Reforma',
    contractType: 'Tiempo completo',
    hireDate: '2024-04-02',
    status: 'Activo',
    rfc: 'RARL940914P22',
    nss: '11149477890',
    baseSalaryMonthly: 46000,
    paymentFrequency: 'Mensual',
    bankName: 'HSBC',
    clabe: makeValidClabe('02118000334455667'),
    accountNumber: '3344556670',
    bankPackValues: {
      pack_bbva_netcash_nomina: { abonoMode: '40', plazaCode: '001' },
      pack_banorte_bem_pagos: { operationCode: '04', destBankCode: '021' },
    },
  },
  {
    id: 'emp_6',
    employeeCode: 'EMP-006',
    fullName: 'Mateo Navarro',
    initials: 'MN',
    avatarColor: 'amber',
    email: 'mateo.navarro@aesnexus.mx',
    phone: '81 3011 5640',
    roleTitle: 'Jefe de Sucursal Monterrey',
    departmentId: 'dep_2',
    departmentName: 'Operaciones y Logística',
    locationId: 'loc_3',
    locationName: 'Sucursal y Bodega Monterrey',
    contractType: 'Tiempo completo',
    hireDate: '2024-07-15',
    status: 'En licencia',
    rfc: 'NAVM910305Q14',
    nss: '11119133445',
    baseSalaryMonthly: 29500,
    paymentFrequency: 'Quincenal',
    bankName: 'Banorte',
    clabe: makeValidClabe('07258000445566778'),
    accountNumber: '0445566778',
    bankPackValues: {
      pack_bbva_netcash_nomina: { abonoMode: '40', plazaCode: '058' },
      pack_banorte_bem_pagos: { operationCode: '01', destBankCode: '072' },
    },
    notes: 'Incapacidad temporal programada hasta fin de mes.',
  },
  {
    id: 'emp_7',
    employeeCode: 'EMP-007',
    fullName: 'Sofía Herrera',
    initials: 'SH',
    avatarColor: 'sage',
    email: 'sofia.herrera@aesnexus.mx',
    phone: '33 2190 4871',
    roleTitle: 'Especialista de Punto de Operación',
    departmentId: 'dep_4',
    departmentName: 'Ventas y Comercial',
    locationId: 'loc_4',
    locationName: 'Punto de Operación Guadalajara',
    contractType: 'Medio tiempo',
    hireDate: '2025-02-01',
    status: 'Activo',
    rfc: 'HEGS961201A55',
    nss: '11169688991',
    baseSalaryMonthly: 18500,
    paymentFrequency: 'Semanal',
    bankName: 'Santander',
    clabe: makeValidClabe('01432000778899001'),
    accountNumber: '7788990011',
    bankPackValues: {
      pack_bbva_netcash_nomina: { abonoMode: '40', plazaCode: '320' },
      pack_banorte_bem_pagos: { operationCode: '04', destBankCode: '014' },
    },
  },
]
