import { originsFor, summary, val } from '../lib/calc'
import { ddmm, nf } from '../lib/dates'

function LabelCell({ m, extra }) {
  return (
    <td className="ind">
      <b>
        {m.label}
        {m.top && <span className="pill">principal</span>}
        {m.weekly && <span className="pill wk">semanal</span>}
      </b>
      <span className="hint">{extra || m.hint}</span>
    </td>
  )
}

function SummaryCells({ state, b, m, origin = '', weekStart }) {
  const s = summary(state, b, m, origin, weekStart)
  let monthText = s.m
  let cls = ''
  let title
  if (!origin && m.goal) {
    const goal = Number(state.config[b].goals[m.goal]) || 0
    if (goal > 0) {
      monthText = `${s.m} de ${nf(goal)}`
      if (s.frac > 0) cls = s.mRaw >= goal * s.frac ? 'good' : 'bad'
      title = 'Verde: no ritmo da meta do mês até hoje. Laranja: abaixo do ritmo.'
    }
  }
  return (
    <>
      <td className="s">{s.w}</td>
      <td className={'s ' + cls} title={title}>{monthText}</td>
      <td className="s">{s.a}</td>
    </>
  )
}

function NumInput({ value, label, onChange }) {
  return (
    <input className="num" type="number" min="0" inputMode="numeric" value={value} aria-label={label} onChange={(e) => onChange(e.target.value)} />
  )
}

export default function MetricRows({ state, actions, b, m, wd, today, weekStart }) {
  const tc = (d) => (d === today ? 'today' : '')

  if (m.type === 'number') {
    return (
      <tr className={m.top ? 'top' : ''}>
        <LabelCell m={m} />
        {wd.map((d) => (
          <td key={d} className={tc(d)}>
            <NumInput value={val(state, b, d, m)} label={`${m.label} ${ddmm(d)}`} onChange={(v) => actions.setNumber(b, d, m, '', v)} />
          </td>
        ))}
        <SummaryCells state={state} b={b} m={m} weekStart={weekStart} />
      </tr>
    )
  }

  if (m.type === 'group') {
    const cfg = state.config[b].origins
    return (
      <>
        <tr className="top">
          <LabelCell m={m} />
          {wd.map((d) => {
            const v = val(state, b, d, m)
            return <td key={d} className={'calc ' + tc(d)}>{v === '' ? '' : nf(v)}</td>
          })}
          <SummaryCells state={state} b={b} m={m} weekStart={weekStart} />
        </tr>
        {originsFor(state, b, m, wd).map((o) => (
          <tr key={o} className="sub">
            <LabelCell m={{ ...m, label: o, top: false }} extra={cfg.includes(o) ? 'origem' : 'fora da lista atual'} />
            {wd.map((d) => (
              <td key={d} className={tc(d)}>
                <NumInput value={val(state, b, d, m, o)} label={`${m.label} ${o} ${ddmm(d)}`} onChange={(v) => actions.setNumber(b, d, m, o, v)} />
              </td>
            ))}
            <SummaryCells state={state} b={b} m={m} origin={o} weekStart={weekStart} />
          </tr>
        ))}
      </>
    )
  }

  return (
    <tr>
      <LabelCell m={m} />
      {wd.map((d, i) => {
        if (m.weekly && i !== 4) return <td key={d} className={'off ' + tc(d)}>—</td>
        const on = val(state, b, d, m)
        return (
          <td key={d} className={tc(d)}>
            <button className={'check' + (on ? ' on' : '')} aria-pressed={on} aria-label={`${m.label} ${ddmm(d)}`} onClick={() => actions.toggleBool(b, d, m.id)}>
              {on ? '✓' : '–'}
            </button>
          </td>
        )
      })}
      <SummaryCells state={state} b={b} m={m} weekStart={weekStart} />
    </tr>
  )
}
