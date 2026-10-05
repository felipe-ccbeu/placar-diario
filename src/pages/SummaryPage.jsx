import { fmt, monthPeriod, ratio, total } from '../lib/calc'
import { BNAME, BRANDS, METRIC } from '../lib/constants'
import { monthLabel } from '../lib/dates'

const MAIN = ['views', 'leads', 'sales', 'revenue']
const MONEY = ['ad_spend', 'cpl', 'cpa', 'roas']

const valueOf = (state, b, m, dates) => (m.type === 'ratio' ? ratio(state, b, m, dates) : total(state, b, m.id, dates))

function Delta({ now, prev, m, prevName }) {
  if (now === null || !prev) return <span className="sline muted">Sem dados de {prevName} para comparar</span>
  const ch = (now - prev) / prev
  const good = m.lowerBetter ? ch <= 0 : ch >= 0
  const flat = Math.abs(ch) < 0.005
  return (
    <span className="sline">
      vs {prevName}:{' '}
      <b className={flat ? 'flat' : good ? 'up' : 'down'}>
        {flat ? '=' : (ch > 0 ? '▲ ' : '▼ ') + Math.abs(Math.round(ch * 100)) + '%'}
      </b>{' '}
      <span className="muted">({fmt(m, prev)})</span>
    </span>
  )
}

function Card({ state, b, id, p, small }) {
  const m = METRIC[id]
  const now = valueOf(state, b, m, p.cur)
  const prev = valueOf(state, b, m, p.prevSame)
  const goal = m.goal ? Number(state.config[b].goals[m.goal]) || 0 : 0
  const proj = m.type !== 'ratio' && !p.done && p.elapsed && now !== null ? (now / p.elapsed) * p.days : null
  const end = p.done ? now : proj
  const status = goal > 0 && end !== null ? (end >= goal ? 'good' : 'bad') : ''
  const prevName = monthLabel(p.prev)

  return (
    <div className={'scard ' + status + (small ? ' small' : '')}>
      <small>{m.label}</small>
      <b className="sval">{now === null ? '—' : fmt(m, now)}</b>
      {goal > 0 && (
        <>
          <div className="sbar" title="Barra: quanto da meta já foi feito. Traço: onde deveria estar hoje.">
            <i style={{ width: Math.min(100, ((now || 0) / goal) * 100) + '%' }} />
            {!p.done && <em style={{ left: (p.elapsed / p.days) * 100 + '%' }} />}
          </div>
          <span className="sline">Meta {fmt(m, goal)} · {Math.round(((now || 0) / goal) * 100)}%</span>
        </>
      )}
      {proj !== null && (
        <span className="sline">Projeção do mês: <b className={status}>{fmt(m, proj)}</b></span>
      )}
      <Delta now={now} prev={prev} m={m} prevName={prevName} />
    </div>
  )
}

export default function SummaryPage({ state, month, onMonth }) {
  const p = monthPeriod(month)
  const ml = monthLabel(month, true)
  const prevName = monthLabel(p.prev)
  const note = p.done
    ? `Mês fechado. Comparação com ${monthLabel(p.prev, true)} inteiro.`
    : `${p.elapsed} de ${p.days} dias. Comparação com os primeiros ${p.elapsed} dias de ${prevName}.`

  return (
    <main>
      <div className="pbar">
        <label>Mês <input type="month" value={month} onChange={(e) => e.target.value && onMonth(e.target.value)} /></label>
        <p>{p.elapsed ? note : `${ml} ainda não começou.`}</p>
      </div>
      {p.elapsed > 0 && BRANDS.map((b) => (
        <section className={'area brand-' + b} key={b}>
          <div className="area-head"><h2>{BNAME[b]}</h2><span>{ml}</span></div>
          <div className="sgrid">
            {MAIN.map((id) => <Card key={id} state={state} b={b} id={id} p={p} />)}
          </div>
          <div className="sgrid">
            {MONEY.map((id) => <Card key={id} state={state} b={b} id={id} p={p} small />)}
          </div>
        </section>
      ))}
    </main>
  )
}
