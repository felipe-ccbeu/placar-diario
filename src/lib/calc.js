import { METRIC } from './constants'
import { brl, monthDates, monthOfWeek, nf, parse, prevMonth, todayIso, weekDates } from './dates'

export const fmt = (m, n) => (m.money ? brl(n) : m.unit === 'x' ? nf(n) + 'x' : nf(n))

// Soma de uma métrica numérica (ou de todas as origens) nas datas; null se nada foi lançado
export function total(state, b, id, dates) {
  const m = METRIC[id]
  let sum = null
  for (const d of dates) {
    const v = val(state, b, d, m)
    if (v !== '') sum = (sum ?? 0) + Number(v)
  }
  return sum
}

// Métrica calculada (ex.: investido ÷ leads); null quando falta numerador ou o divisor é zero
export function ratio(state, b, m, dates) {
  const n = total(state, b, m.num, dates)
  const d = total(state, b, m.den, dates)
  return n === null || !d ? null : n / d
}

// Dias do mês até hoje e o mesmo trecho do mês anterior, para projeção e comparação
export function monthPeriod(month) {
  const md = monthDates(month)
  const t = todayIso()
  const elapsed = md.filter((d) => d <= t).length
  const prev = prevMonth(month)
  const pd = monthDates(prev)
  const done = elapsed === md.length
  return { md, cur: md.slice(0, elapsed), elapsed, days: md.length, done, prev, prevSame: done ? pd : pd.slice(0, elapsed) }
}

export function val(state, b, date, m, origin) {
  const d = state.days[b + '|' + date]
  if (m.type === 'bool') return !!(d && d[m.id])
  if (!d) return ''
  if (m.type === 'group') {
    const g = d[m.id]
    if (!g) return ''
    if (origin) return g[origin] ?? ''
    const vs = Object.values(g)
    return vs.length ? vs.reduce((a, x) => a + Number(x), 0) : ''
  }
  return d[m.id] ?? ''
}

export function originsFor(state, b, m, dates) {
  const list = [...state.config[b].origins]
  for (const date of dates) {
    const g = state.days[b + '|' + date]?.[m.id]
    if (g) for (const k of Object.keys(g)) if (!list.includes(k)) list.push(k)
  }
  return list
}

export function summary(state, b, m, origin, weekStart) {
  const wd = weekDates(weekStart)
  const md = monthDates(monthOfWeek(weekStart))
  const t = todayIso()
  const mEl = md.filter((d) => d <= t).length
  const frac = mEl / md.length
  const f = (n) => fmt(m, n)
  if (m.type === 'ratio') {
    const w = ratio(state, b, m, wd)
    const mo = ratio(state, b, m, md)
    return { w: w === null ? '—' : f(w), m: mo === null ? '—' : f(mo), a: '—' }
  }
  if (m.type === 'bool' && !m.weekly) {
    const wOn = wd.filter((d) => val(state, b, d, m)).length
    const wEl = wd.filter((d) => d <= t).length
    const mOn = md.filter((d) => val(state, b, d, m)).length
    return { w: `${wOn}/${wEl}`, m: `${mOn} dia${mOn === 1 ? '' : 's'}`, a: mEl ? Math.round((mOn / mEl) * 100) + '%' : '—' }
  }
  if (m.weekly) {
    const fri = md.filter((d) => parse(d).getDay() === 5)
    const fEl = fri.filter((d) => d <= t).length
    const mOn = fri.filter((d) => val(state, b, d, m)).length
    return { w: val(state, b, wd[4], m) ? 'Feito' : '—', m: `${mOn}/${fri.length}`, a: fEl ? Math.round((mOn / fEl) * 100) + '%' : '—' }
  }
  const wv = wd.map((d) => val(state, b, d, m, origin)).filter((x) => x !== '').map(Number)
  const mv = md.map((d) => val(state, b, d, m, origin)).filter((x) => x !== '').map(Number)
  const sum = (a) => a.reduce((x, y) => x + y, 0)
  const avg = mv.length ? f(sum(mv) / mv.length) : '—'
  if (m.agg === 'last') return { w: wv.length ? f(wv.at(-1)) : '—', m: mv.length ? f(mv.at(-1)) : '—', a: avg }
  return { w: f(sum(wv)), m: f(sum(mv)), mRaw: sum(mv), a: avg, frac }
}

export function toItems(obj) {
  const items = Object.entries(obj).filter(([, v]) => v > 0).map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v)
  const total = items.reduce((a, x) => a + x.v, 0)
  let cum = 0
  for (const it of items) {
    it.vital = total > 0 && cum / total < 0.8
    cum += it.v
    it.pct = (it.v / total) * 100
    it.cum = (cum / total) * 100
  }
  return items
}

export function originTotals(state, b, metricId, month) {
  const tot = {}
  for (const d of monthDates(month)) {
    const g = state.days[b + '|' + d]?.[metricId]
    if (g) for (const [k, v] of Object.entries(g)) tot[k] = (tot[k] || 0) + Number(v)
  }
  return tot
}

export function aggregate(state, b, metricId, month) {
  return toItems(originTotals(state, b, metricId, month))
}
