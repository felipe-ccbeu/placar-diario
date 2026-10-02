import { monthDates, monthOfWeek, nf, parse, todayIso, weekDates } from './dates'

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
  const avg = mv.length ? nf(sum(mv) / mv.length) : '—'
  if (m.agg === 'last') return { w: wv.length ? nf(wv.at(-1)) : '—', m: mv.length ? nf(mv.at(-1)) : '—', a: avg }
  return { w: nf(sum(wv)), m: nf(sum(mv)), mRaw: sum(mv), a: avg, frac }
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

export function aggregate(state, b, metricId, month) {
  const tot = {}
  for (const d of monthDates(month)) {
    const g = state.days[b + '|' + d]?.[metricId]
    if (g) for (const [k, v] of Object.entries(g)) tot[k] = (tot[k] || 0) + Number(v)
  }
  return toItems(tot)
}
