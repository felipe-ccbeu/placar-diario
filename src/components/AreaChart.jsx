import { fmt, ratio, val } from '../lib/calc'
import { METRIC } from '../lib/constants'
import { DAYN, ddmm, nf } from '../lib/dates'

// Valor do dia para o gráfico; null quando nada foi lançado
function dayValue(state, b, m, d) {
  if (m.type === 'ratio') return ratio(state, b, m, [d])
  const v = val(state, b, d, m)
  return v === '' ? null : Number(v)
}

function Bars({ state, b, m, wd, today }) {
  const vals = wd.map((d) => dayValue(state, b, m, d))
  const max = Math.max(...vals.map((v) => v ?? 0), 0)
  const H = 90
  return (
    <div className={'chart-card' + (m.top ? ' top' : '')}>
      <div className="chart-title"><b>{m.label}</b><span>{m.hint}</span></div>
      <div className="chart-bars">
        {wd.map((d, i) => {
          const v = vals[i]
          const h = v && max ? Math.max(3, (v / max) * H) : 0
          return (
            <div key={d} className={'chart-col' + (d === today ? ' today' : '')} title={`${DAYN[i]} ${ddmm(d)}: ${v === null ? '—' : fmt(m, v)}`}>
              <span className="chart-val">{v === null ? '' : fmt(m, v)}</span>
              <div className="chart-bar" style={{ height: h }} />
              <span className="chart-day">{DAYN[i]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const pct = (n, t) => (t ? Math.round((n / t) * 1000) / 10 : 0).toLocaleString('pt-BR') + '%'

// Views por dia divididas pela origem (ex.: Instagram e TikTok), cada coluna = 100% do dia
function Split({ state, b, m, wd, today }) {
  const [pa, pb] = m.parts.map((id) => METRIC[id])
  const num = (v) => (v === '' ? null : Number(v))
  const cols = wd.map((d) => {
    const a = num(val(state, b, d, pa))
    const c = num(val(state, b, d, pb))
    const has = a !== null || c !== null
    return { a: a || 0, c: c || 0, has, t: (a || 0) + (c || 0), legacy: has ? null : num(val(state, b, d, m)) }
  })
  const ta = cols.reduce((s, x) => s + x.a, 0)
  const tc = cols.reduce((s, x) => s + x.c, 0)
  return (
    <div className="split">
      <div className="split-legend">
        <span><i className="sa" />{pa.label} <b>{pct(ta, ta + tc)}</b></span>
        <span><i className="sb" />{pb.label} <b>{pct(tc, ta + tc)}</b></span>
        <small>da semana · {nf(ta + tc)} views</small>
      </div>
      <div className="split-cols">
        {cols.map((x, i) => (
          <div key={wd[i]} className={'split-col' + (wd[i] === today ? ' today' : '')}>
            <span className="chart-val">{x.has ? nf(x.t) : x.legacy !== null ? nf(x.legacy) : ''}</span>
            <div className="split-stack" title={x.has ? `${DAYN[i]} ${ddmm(wd[i])}: ${pa.label} ${nf(x.a)} (${pct(x.a, x.t)}) · ${pb.label} ${nf(x.c)} (${pct(x.c, x.t)})` : ''}>
              {x.has && x.t > 0 ? (
                <>
                  <div className="seg sb" style={{ flex: x.c }}>{x.c / x.t >= 0.12 && pct(x.c, x.t)}</div>
                  <div className="seg sa" style={{ flex: x.a }}>{x.a / x.t >= 0.12 && pct(x.a, x.t)}</div>
                </>
              ) : x.legacy ? <div className="seg sn" style={{ flex: 1 }} title="Sem divisão por origem" /> : <div className="split-empty">—</div>}
            </div>
            <span className="chart-day">{DAYN[i]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Views por conta em cada dia (views do dia ÷ contas ativas), com o número de contas embaixo do dia
function Relation({ state, b, wd, today }) {
  const num = (v) => (v === '' ? null : Number(v))
  const cols = wd.map((d) => {
    const v = num(val(state, b, d, METRIC.views))
    const c = num(val(state, b, d, METRIC.active_accounts))
    return { v, c, r: v !== null && c ? v / c : null }
  })
  const ratios = cols.filter((x) => x.r !== null).map((x) => x.r)
  const max = Math.max(1, ...ratios)
  const avg = ratios.length ? ratios.reduce((s, v) => s + v, 0) / ratios.length : 0
  return (
    <div className="split">
      <div className="split-legend">
        <span><b>Views por conta</b> em cada dia</span>
        <small>média de {nf(Math.round(avg))} por conta por dia</small>
      </div>
      <div className="split-cols">
        {cols.map((x, i) => (
          <div key={wd[i]} className={'split-col' + (wd[i] === today ? ' today' : '')}>
            <span className="chart-val">{x.r === null ? '' : nf(Math.round(x.r))}</span>
            <div className="split-stack rel-stack" title={x.r === null ? '' : `${DAYN[i]} ${ddmm(wd[i])}: ${nf(x.v)} views ÷ ${x.c} contas`}>
              {x.r === null ? <div className="split-empty">—</div> : <div className="rel-bar" style={{ height: Math.max(2, (x.r / max) * 100) + '%' }} />}
            </div>
            <span className="chart-day">{DAYN[i]}</span>
            <span className="rel-acc">{x.c === null ? '' : `${x.c} ${x.c === 1 ? 'conta' : 'contas'}`}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AreaChart({ state, b, area, wd, today, view }) {
  if (view === 'rel') return <div className="chart-grid one"><Relation state={state} b={b} wd={wd} today={today} /></div>
  const sm = area.metrics.find((m) => m.type === 'sum')
  if (sm) return <div className="chart-grid one"><Split state={state} b={b} m={sm} wd={wd} today={today} /></div>
  const metrics = area.metrics.filter((m) => !m.part && m.type !== 'bool')
  return (
    <div className="chart-grid">
      {metrics.map((m) => <Bars key={m.id} state={state} b={b} m={m} wd={wd} today={today} />)}
    </div>
  )
}
