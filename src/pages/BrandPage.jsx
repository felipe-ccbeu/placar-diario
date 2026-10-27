import { useState } from 'react'
import AreaChart from '../components/AreaChart'
import { Cmt } from '../components/Comments'
import FocusBlock from '../components/FocusBlock'
import MetricRows from '../components/MetricRows'
import WeekBar from '../components/WeekBar'
import UgcSection from './UgcSection'
import { AREAS, BNAME } from '../lib/constants'
import { DAYN, ddmm, monthLabel, monthOfWeek, todayIso, weekDates } from '../lib/dates'

export default function BrandPage({ brand, state, actions, weekStart, onWeek }) {
  const [charts, setCharts] = useState({})
  const wd = weekDates(weekStart)
  const today = todayIso()
  const month = monthOfWeek(weekStart)
  const note = state.weeks[brand + '|' + weekStart]?.notes || ''
  const wk = `${BNAME[brand]} · semana de ${ddmm(wd[0])}`

  return (
    <>
      <WeekBar weekStart={weekStart} onWeek={onWeek} />
      <main className={'brand-' + brand}>
        {AREAS.map((a) => (
          <section className="area" key={a.id}>
            <div className="area-bar">
            <Cmt className="area-head" anchor={'area:' + a.id} label={`${wk} · ${a.name}`}><h2>{a.name}</h2><span>{a.sub}</span></Cmt>
            {[
              ['bars', 'Ver gráfico de barras', <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />],
              ...(a.metrics.some((m) => m.id === 'active_accounts')
                ? [['rel', 'Ver relação entre contas, stories e reels', <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />]]
                : []),
            ].map(([v, label, icon]) => (
              <button
                key={v}
                className={'chart-toggle' + (charts[a.id] === v ? ' on' : '')}
                aria-pressed={charts[a.id] === v}
                aria-label={charts[a.id] === v ? 'Ver tabela' : label}
                title={charts[a.id] === v ? 'Ver tabela' : label}
                onClick={() => setCharts((c) => ({ ...c, [a.id]: c[a.id] === v ? null : v }))}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
              </button>
            ))}
            </div>
            {charts[a.id] ? <AreaChart state={state} b={brand} area={a} wd={wd} today={today} view={charts[a.id]} /> : <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th className="ind">Indicador</th>
                    {wd.map((d, i) => (
                      <th key={d} className={d === today ? 'today' : ''}>{DAYN[i]}<small>{ddmm(d)}</small></th>
                    ))}
                    <th>Semana</th><th>Mês ({monthLabel(month)})</th><th>Média ou %</th>
                  </tr>
                </thead>
                <tbody>
                  {a.metrics.filter((m) => !m.part).map((m) => (
                    <MetricRows key={m.id} state={state} actions={actions} b={brand} m={m} wd={wd} today={today} weekStart={weekStart} wk={wk} />
                  ))}
                </tbody>
              </table>
            </div>}
            <FocusBlock state={state} actions={actions} b={brand} area={a} weekStart={weekStart} wk={wk} />
          </section>
        ))}
        <section className="area">
          <Cmt className="notes" anchor="notes" label={`${wk} · Anotações da semana`}>
            <label htmlFor="note">Anotações da semana</label>
            <textarea
              id="note"
              placeholder="O que foi testado, o que se aprendeu, próximos ajustes"
              value={note}
              onChange={(e) => actions.setNote(brand, weekStart, e.target.value)}
            />
          </Cmt>
        </section>
        <UgcSection brand={brand} state={state} actions={actions} />
      </main>
    </>
  )
}
