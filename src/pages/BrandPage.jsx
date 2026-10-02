import FocusBlock from '../components/FocusBlock'
import MetricRows from '../components/MetricRows'
import WeekBar from '../components/WeekBar'
import UgcSection from './UgcSection'
import { AREAS } from '../lib/constants'
import { DAYN, ddmm, monthLabel, monthOfWeek, todayIso, weekDates } from '../lib/dates'

export default function BrandPage({ brand, state, actions, weekStart, onWeek }) {
  const wd = weekDates(weekStart)
  const today = todayIso()
  const month = monthOfWeek(weekStart)
  const note = state.weeks[brand + '|' + weekStart]?.notes || ''

  return (
    <>
      <WeekBar weekStart={weekStart} onWeek={onWeek} />
      <main className={'brand-' + brand}>
        {AREAS.map((a) => (
          <section className="area" key={a.id}>
            <div className="area-head"><h2>{a.name}</h2><span>{a.sub}</span></div>
            <div className="tw">
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
                  {a.metrics.map((m) => (
                    <MetricRows key={m.id} state={state} actions={actions} b={brand} m={m} wd={wd} today={today} weekStart={weekStart} />
                  ))}
                </tbody>
              </table>
            </div>
            <FocusBlock state={state} actions={actions} b={brand} area={a} weekStart={weekStart} />
          </section>
        ))}
        <section className="area">
          <div className="notes">
            <label htmlFor="note">Anotações da semana</label>
            <textarea
              id="note"
              placeholder="O que foi testado, o que se aprendeu, próximos ajustes"
              value={note}
              onChange={(e) => actions.setNote(brand, weekStart, e.target.value)}
            />
          </div>
        </section>
        <UgcSection brand={brand} state={state} actions={actions} />
      </main>
    </>
  )
}
