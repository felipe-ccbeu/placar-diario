import ParetoPanel, { ParetoBody } from '../components/ParetoPanel'
import { aggregate, toItems } from '../lib/calc'
import { BNAME, BRANDS } from '../lib/constants'
import { monthLabel } from '../lib/dates'

function ObjectionsPanel({ state, actions, brand, month }) {
  const cur = state.obj[brand + '|' + month] || {}
  const cats = [...state.config[brand].objections]
  for (const k of Object.keys(cur)) if (!cats.includes(k)) cats.push(k)
  return (
    <div className="panel">
      <h3>Objeções e falhas</h3>
      <div>
        {cats.map((c) => (
          <div className="objrow" key={c}>
            <span>{c}</span>
            <button className="btn icon" aria-label={`Tirar uma: ${c}`} onClick={() => actions.adjustObjection(brand, month, c, -1)}>−</button>
            <b>{cur[c] || 0}</b>
            <button className="btn icon" aria-label={`Somar uma: ${c}`} onClick={() => actions.adjustObjection(brand, month, c, 1)}>+</button>
          </div>
        ))}
      </div>
      <ParetoBody items={toItems(cur)} empty="Some uma ocorrência sempre que um cliente travar por um desses motivos ou alguém relatar uma falha." />
    </div>
  )
}

export default function ParetoPage({ state, actions, month, onMonth }) {
  const ml = monthLabel(month, true)
  return (
    <main>
      <div className="pbar">
        <label>Mês <input type="month" value={month} onChange={(e) => e.target.value && onMonth(e.target.value)} /></label>
        <p>Os itens marcados como vitais somam cerca de 80% do resultado de {ml}. É deles que saem as tasks Vitais das semanas seguintes.</p>
      </div>
      {BRANDS.map((b) => (
        <section className={'area brand-' + b} key={b}>
          <div className="area-head"><h2>{BNAME[b]}</h2></div>
          <div className="pgrid">
            <ParetoPanel title="Leads por origem" items={aggregate(state, b, 'leads', month)} empty={`Nenhum lead registrado em ${ml}.`} />
            <ParetoPanel title="Vendas por origem" items={aggregate(state, b, 'sales', month)} empty={`Nenhuma venda registrada em ${ml}.`} />
            <ObjectionsPanel state={state} actions={actions} brand={b} month={month} />
          </div>
        </section>
      ))}
    </main>
  )
}
