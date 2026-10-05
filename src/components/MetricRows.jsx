import { fmt, originsFor, ratio, summary, val } from '../lib/calc'
import { DAYN, ddmm, nf } from '../lib/dates'
import { Cmt } from './Comments'

// Cada linha tem uma chave (id da métrica + origem) usada nas âncoras dos comentários
const rowKey = (m, origin) => m.id + (origin ? ':' + origin : '')
const rowName = (m, origin) => m.label + (origin ? ' / ' + origin : '')

function LabelCell({ m, extra, origin, wk }) {
  return (
    <Cmt as="td" className="ind" anchor={'row:' + rowKey(m, origin)} label={`${wk} · ${rowName(m, origin)}`}>
      <b>
        {m.label}
        {m.top && <span className="pill">principal</span>}
        {m.weekly && <span className="pill wk">semanal</span>}
        {m.type === 'ratio' && <span className="pill wk">automático</span>}
      </b>
      <span className="hint">{extra || m.hint}</span>
    </Cmt>
  )
}

function SummaryCells({ state, b, m, origin = '', weekStart, wk }) {
  const s = summary(state, b, m, origin, weekStart)
  let monthText = s.m
  let cls = ''
  let title
  if (!origin && m.goal) {
    const goal = Number(state.config[b].goals[m.goal]) || 0
    if (goal > 0) {
      monthText = `${s.m} de ${fmt(m, goal)}`
      if (s.frac > 0) cls = s.mRaw >= goal * s.frac ? 'good' : 'bad'
      title = 'Verde: no ritmo da meta do mês até hoje. Laranja: abaixo do ritmo.'
    }
  }
  return (
    <>
      <Cmt as="td" className="s" anchor={`sum:${rowKey(m, origin)}:w`} label={`${wk} · ${rowName(m, origin)} · total da semana`}>{s.w}</Cmt>
      <Cmt as="td" className={'s ' + cls} title={title} anchor={`sum:${rowKey(m, origin)}:m`} label={`${wk} · ${rowName(m, origin)} · total do mês`}>{monthText}</Cmt>
      <Cmt as="td" className="s" anchor={`sum:${rowKey(m, origin)}:a`} label={`${wk} · ${rowName(m, origin)} · média ou %`}>{s.a}</Cmt>
    </>
  )
}

// Célula de um dia, comentável
function DayCell({ m, d, origin, wd, wk, today, className = '', children }) {
  return (
    <Cmt as="td" className={(className + (d === today ? ' today' : '')).trim()} anchor={`cell:${rowKey(m, origin)}:${d}`}
      label={`${wk.split(' · ')[0]} · ${rowName(m, origin)} · ${DAYN[wd.indexOf(d)]} ${ddmm(d)}`}>
      {children}
    </Cmt>
  )
}

function NumInput({ value, label, money, onChange }) {
  return (
    <input
      className={'num' + (money ? ' money' : '')}
      type="number"
      min="0"
      step={money ? 'any' : undefined}
      inputMode={money ? 'decimal' : 'numeric'}
      placeholder={money ? 'R$' : undefined}
      value={value}
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export default function MetricRows({ state, actions, b, m, wd, today, weekStart, wk }) {
  const tc = (d) => (d === today ? 'today' : '')
  const cell = (d, origin) => ({ m, d, origin, wd, wk, today })

  if (m.type === 'number') {
    return (
      <tr className={m.top ? 'top' : ''}>
        <LabelCell m={m} wk={wk} />
        {wd.map((d) => (
          <DayCell key={d} {...cell(d)}>
            <NumInput value={val(state, b, d, m)} label={`${m.label} ${ddmm(d)}`} money={m.money} onChange={(v) => actions.setNumber(b, d, m, '', v)} />
          </DayCell>
        ))}
        <SummaryCells state={state} b={b} m={m} weekStart={weekStart} wk={wk} />
      </tr>
    )
  }

  if (m.type === 'group') {
    const cfg = state.config[b].origins
    return (
      <>
        <tr className="top">
          <LabelCell m={m} wk={wk} />
          {wd.map((d) => {
            const v = val(state, b, d, m)
            return <DayCell key={d} {...cell(d)} className="calc">{v === '' ? '' : nf(v)}</DayCell>
          })}
          <SummaryCells state={state} b={b} m={m} weekStart={weekStart} wk={wk} />
        </tr>
        {originsFor(state, b, m, wd).map((o) => (
          <tr key={o} className="sub">
            <LabelCell m={{ ...m, label: o, top: false }} extra={cfg.includes(o) ? 'origem' : 'fora da lista atual'} origin={o} wk={wk} />
            {wd.map((d) => (
              <DayCell key={d} {...cell(d, o)}>
                <NumInput value={val(state, b, d, m, o)} label={`${m.label} ${o} ${ddmm(d)}`} onChange={(v) => actions.setNumber(b, d, m, o, v)} />
              </DayCell>
            ))}
            <SummaryCells state={state} b={b} m={m} origin={o} weekStart={weekStart} wk={wk} />
          </tr>
        ))}
      </>
    )
  }

  if (m.type === 'ratio') {
    return (
      <tr className="derived">
        <LabelCell m={m} wk={wk} />
        {wd.map((d) => {
          const v = ratio(state, b, m, [d])
          return <DayCell key={d} {...cell(d)} className="calc">{v === null ? '' : fmt(m, v)}</DayCell>
        })}
        <SummaryCells state={state} b={b} m={m} weekStart={weekStart} wk={wk} />
      </tr>
    )
  }

  return (
    <tr>
      <LabelCell m={m} wk={wk} />
      {wd.map((d, i) => {
        if (m.weekly && i !== 4) return <td key={d} className={'off ' + tc(d)}>—</td>
        const on = val(state, b, d, m)
        const off = state.days[b + '|' + d]?.[m.id] === false
        return (
          <DayCell key={d} {...cell(d)}>
            <button
              className={'check' + (on ? ' on' : off ? ' no' : '')}
              aria-pressed={on ? true : off ? 'mixed' : false}
              aria-label={`${m.label} ${ddmm(d)}`}
              title="Clique para alternar: sim, não, vazio"
              onClick={() => actions.toggleBool(b, d, m.id)}
            >
              {on ? '✓' : off ? '✗' : '–'}
            </button>
          </DayCell>
        )
      })}
      <SummaryCells state={state} b={b} m={m} weekStart={weekStart} wk={wk} />
    </tr>
  )
}
