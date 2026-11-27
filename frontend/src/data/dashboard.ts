export type Opportunity = {
  company: string
  person: string
  initials: string
  color: string
  value: number
  stage: string
  stageTone: 'blue' | 'amber' | 'green'
  date: string
}

export type CrmActivityStatus = 'Pendiente' | 'Completada' | 'Reprogramada'

export type CrmActivity = {
  id: string
  title: string
  company: string
  date: string
  time: string
  icon: 'send' | 'phone' | 'check' | string
  tone: 'blue' | 'amber' | 'green'
  status: CrmActivityStatus
  owner?: string
  notes?: string
}

export const CRM_TODAY_ISO = '2026-11-24'

export const opportunities: Opportunity[] = [
  { company: 'Estudio Nómada', person: 'Sofía Ramírez', initials: 'SN', color: 'lilac', value: 68500, stage: 'Propuesta', stageTone: 'blue', date: 'Hoy' },
  { company: 'Taller Norte', person: 'Diego Fernández', initials: 'TN', color: 'peach', value: 42300, stage: 'Negociación', stageTone: 'amber', date: 'Ayer' },
  { company: 'Casa Oliva', person: 'Valentina Ruiz', initials: 'CO', color: 'sage', value: 31800, stage: 'Calificada', stageTone: 'green', date: 'Ayer' },
  { company: 'Lumen Studio', person: 'Mateo Cruz', initials: 'LS', color: 'blue', value: 24700, stage: 'Propuesta', stageTone: 'blue', date: '12 nov' },
]

export const activities: CrmActivity[] = [
  {
    id: 'act_1',
    title: 'Enviar propuesta comercial',
    company: 'Estudio Nómada',
    date: '2026-11-24',
    time: '10:30',
    icon: 'send',
    tone: 'blue',
    status: 'Pendiente',
    owner: 'Andrea Morales',
    notes: 'Incluir desglose de licencias anuales y tiempos de entrega.',
  },
  {
    id: 'act_2',
    title: 'Llamada de seguimiento',
    company: 'Taller Norte',
    date: '2026-11-24',
    time: '13:00',
    icon: 'phone',
    tone: 'amber',
    status: 'Pendiente',
    owner: 'Sofía Mendoza',
    notes: 'Validar condiciones de crédito a 15 días con Diego Fernández.',
  },
  {
    id: 'act_3',
    title: 'Revisar necesidades',
    company: 'Casa Oliva',
    date: '2026-11-24',
    time: '15:30',
    icon: 'check',
    tone: 'green',
    status: 'Pendiente',
    owner: 'Carlos Herrera',
    notes: 'Confirmar dirección de facturación en Guadalajara.',
  },
  {
    id: 'act_4',
    title: 'Demo técnica de inventario',
    company: 'Lumen Studio',
    date: '2026-11-25',
    time: '11:00',
    icon: 'check',
    tone: 'green',
    status: 'Pendiente',
    owner: 'Andrea Morales',
    notes: 'Presentar flujo de cotización a pedido y factura automática.',
  },
  {
    id: 'act_5',
    title: 'Renovación de contrato anual',
    company: 'Estudio Nómada',
    date: '2026-11-26',
    time: '16:00',
    icon: 'send',
    tone: 'blue',
    status: 'Pendiente',
    owner: 'Carlos Herrera',
    notes: 'Enviar anexo fiscal con CFDI 4.0 actualizado.',
  },
  {
    id: 'act_6',
    title: 'Confirmar orden de compra',
    company: 'Taller Norte',
    date: '2026-11-27',
    time: '09:30',
    icon: 'phone',
    tone: 'amber',
    status: 'Pendiente',
    owner: 'Sofía Mendoza',
    notes: 'Seguimiento previo al cierre de mes.',
  },
  {
    id: 'act_7',
    title: 'Cierre de cotización COT-2026-014',
    company: 'Casa Oliva',
    date: '2026-11-23',
    time: '17:00',
    icon: 'check',
    tone: 'green',
    status: 'Completada',
    owner: 'Andrea Morales',
    notes: 'Aprobada por cliente; convertida en pedido.',
  },
  {
    id: 'act_8',
    title: 'Envío de ficha técnica y catálogo',
    company: 'Punto Cero',
    date: '2026-11-20',
    time: '12:15',
    icon: 'send',
    tone: 'blue',
    status: 'Completada',
    owner: 'Carlos Herrera',
    notes: 'Catálogo Q4 enviado por correo electrónico.',
  },
]

export const revenueBars = [
  { month: 'Jun', actual: 46, target: 62 },
  { month: 'Jul', actual: 67, target: 73 },
  { month: 'Ago', actual: 55, target: 68 },
  { month: 'Sep', actual: 80, target: 76 },
  { month: 'Oct', actual: 72, target: 82 },
  { month: 'Nov', actual: 91, target: 88 },
]
