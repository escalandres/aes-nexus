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

export const opportunities: Opportunity[] = [
  { company: 'Estudio Nómada', person: 'Sofía Ramírez', initials: 'SN', color: 'lilac', value: 68500, stage: 'Propuesta', stageTone: 'blue', date: 'Hoy' },
  { company: 'Taller Norte', person: 'Diego Fernández', initials: 'TN', color: 'peach', value: 42300, stage: 'Negociación', stageTone: 'amber', date: 'Ayer' },
  { company: 'Casa Oliva', person: 'Valentina Ruiz', initials: 'CO', color: 'sage', value: 31800, stage: 'Calificada', stageTone: 'green', date: 'Ayer' },
  { company: 'Lumen Studio', person: 'Mateo Cruz', initials: 'LS', color: 'blue', value: 24700, stage: 'Propuesta', stageTone: 'blue', date: '12 nov' },
]

export const activities = [
  { title: 'Enviar propuesta comercial', company: 'Estudio Nómada', time: '10:30', icon: 'send', tone: 'blue' },
  { title: 'Llamada de seguimiento', company: 'Taller Norte', time: '13:00', icon: 'phone', tone: 'amber' },
  { title: 'Revisar necesidades', company: 'Casa Oliva', time: '15:30', icon: 'check', tone: 'green' },
]

export const revenueBars = [
  { month: 'Jun', actual: 46, target: 62 },
  { month: 'Jul', actual: 67, target: 73 },
  { month: 'Ago', actual: 55, target: 68 },
  { month: 'Sep', actual: 80, target: 76 },
  { month: 'Oct', actual: 72, target: 82 },
  { month: 'Nov', actual: 91, target: 88 },
]
