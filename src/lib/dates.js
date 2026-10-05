export const DAYN = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MESL = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

const pad = (n) => String(n).padStart(2, '0')

export const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
export const parse = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}
export const addDays = (d, n) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
export const mondayOf = (d) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12)
  x.setDate(x.getDate() - (x.getDay() || 7) + 1)
  return x
}
export const todayIso = () => iso(new Date())
export const weekDates = (ws) => Array.from({ length: 7 }, (_, i) => iso(addDays(parse(ws), i)))
export const monthOfWeek = (ws) => iso(addDays(parse(ws), 3)).slice(0, 7)
export const monthDates = (m) => {
  const [y, mo] = m.split('-').map(Number)
  const n = new Date(y, mo, 0).getDate()
  return Array.from({ length: n }, (_, i) => m + '-' + pad(i + 1))
}
export const monthLabel = (m, long) => {
  const i = Number(m.slice(5, 7)) - 1
  return long ? MESL[i] + ' de ' + m.slice(0, 4) : MES[i]
}
export const ddmm = (s) => s.slice(8) + '/' + s.slice(5, 7)
export const nf = (n) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
export const brl = (n) => {
  const d = Math.abs(n) < 100 ? 2 : 0
  return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: d, maximumFractionDigits: d })
}
export const prevMonth = (m) => {
  const [y, mo] = m.split('-').map(Number)
  return iso(new Date(y, mo - 2, 15)).slice(0, 7)
}
