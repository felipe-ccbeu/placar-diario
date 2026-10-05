import ParetoPanel, { ParetoBody } from '../components/ParetoPanel'
import { aggregate, originTotals, toItems } from '../lib/calc'
import { BNAME, BRANDS } from '../lib/constants'
import { monthLabel, nf } from '../lib/dates'

const pct = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '—')

// Quanto de cada origem vira venda: a origem que traz muito lead e pouca venda aparece aqui
function ConversionPanel({ state, brand, month, ml }) {
  const leads = originTotals(state, brand, 'leads', month)
  const sales = originTotals(state, brand, 'sales', month)
  const rows = [...new Set([...Object.keys(leads), ...Object.keys(sales)])]
    .map((k) => ({ k, l: leads[k] || 0, s: sales[k] || 0 }))
    .filter((r) => r.l || r.s)
    .sort((a, b) => b.l - a.l || b.s - a.s)
  const tl = rows.reduce((a, r) => a + r.l, 0)
  const ts = rows.reduce((a, r) => a + r.s, 0)
  const avg = tl ? ts / tl : 0
  return (
    <div className="panel wide">
      <h3>Conversão por origem</h3>
      {!rows.length ? (
        <p className="empty">Nenhum lead ou venda registrado em {ml}.</p>
      ) : (
        <>
          <table className="conv">
            <thead>
              <tr><th>Origem</th><th>Leads</th><th>% dos leads</th><th>Vendas</th><th>% das vendas</th><th>Conversão</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const rate = r.l ? r.s / r.l : null
                const cls = rate === null || !tl ? '' : rate >= avg ? 'good' : 'bad'
                return (
                  <tr key={r.k}>
                    <td>{r.k}</td>
                    <td>{nf(r.l)}</td>
                    <td>{pct(r.l, tl)}</td>
                    <td>{nf(r.s)}</td>
                    <td>{pct(r.s, ts)}</td>
                    <td className={'rate ' + cls}>{rate === null ? '—' : pct(r.s, r.l)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr><td>Total</td><td>{nf(tl)}</td><td></td><td>{nf(ts)}</td><td></td><td>{pct(ts, tl)}</td></tr>
            </tfoot>
          </table>
          <p className="hint">Verde: converte acima da média da marca. Laranja: abaixo. Vendas do mês divididas pelos leads do mês, então quem fecha com atraso pode cair no mês seguinte.</p>
        </>
      )}
    </div>
  )
}

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
            <ConversionPanel state={state} brand={b} month={month} ml={ml} />
            <ParetoPanel title="Leads por origem" items={aggregate(state, b, 'leads', month)} empty={`Nenhum lead registrado em ${ml}.`} />
            <ParetoPanel title="Vendas por origem" items={aggregate(state, b, 'sales', month)} empty={`Nenhuma venda registrada em ${ml}.`} />
            <ObjectionsPanel state={state} actions={actions} brand={b} month={month} />
          </div>
        </section>
      ))}
    </main>
  )
}
