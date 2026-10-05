import { useState } from 'react'
import { BNAME, BRANDS } from '../lib/constants'
import { todayIso } from '../lib/dates'
import ApiTokens from '../components/ApiTokens'

const toLines = (text) => [...new Set(text.split('\n').map((s) => s.trim()).filter(Boolean))]

function toDraft(config) {
  const draft = {}
  for (const b of BRANDS) {
    const c = config[b]
    draft[b] = { origins: c.origins.join('\n'), objections: c.objections.join('\n'), goals: { ...c.goals } }
  }
  return draft
}

function SettingsForm({ state, actions }) {
  const [draft, setDraft] = useState(() => toDraft(state.config))
  const patch = (b, key, value) => setDraft((d) => ({ ...d, [b]: { ...d[b], [key]: value } }))
  const setGoal = (b, goal, value) => setDraft((d) => ({ ...d, [b]: { ...d[b], goals: { ...d[b].goals, [goal]: value } } }))

  function save() {
    const config = {}
    for (const b of BRANDS) {
      config[b] = {
        origins: toLines(draft[b].origins),
        objections: toLines(draft[b].objections),
        goals: Object.fromEntries(Object.entries(draft[b].goals).map(([k, v]) => [k, Number(v) || 0])),
      }
    }
    actions.saveConfig(config)
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `placar-backup-${todayIso()}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  function importBackup(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const s = JSON.parse(reader.result)
        if (!s || typeof s !== 'object' || !s.days) throw new Error('invalid')
        if (!window.confirm('Substituir os dados atuais pelos do backup?')) return
        actions.importState(s)
      } catch {
        actions.toast('Arquivo inválido: use um backup exportado por este placar')
      }
    }
    reader.readAsText(file)
  }

  function wipe() {
    if (window.confirm('Apagar todos os números, focos, objeções e ajustes deste navegador? Exporte um backup antes se quiser guardar.')) actions.wipe()
  }

  return (
    <main>
      {BRANDS.map((b) => (
        <section className={'area brand-' + b} key={b}>
          <div className="area-head"><h2>{BNAME[b]}</h2></div>
          <div className="cfg">
            <div>
              <label htmlFor={'o-' + b}>Origens de leads e vendas</label>
              <textarea id={'o-' + b} value={draft[b].origins} onChange={(e) => patch(b, 'origins', e.target.value)} />
              <p className="hint">Uma por linha. Renomear cria uma origem nova; os números antigos continuam guardados.</p>
            </div>
            <div>
              <label htmlFor={'j-' + b}>Objeções e falhas</label>
              <textarea id={'j-' + b} value={draft[b].objections} onChange={(e) => patch(b, 'objections', e.target.value)} />
              <p className="hint">Uma por linha. Aparecem na aba Pareto do mês.</p>
            </div>
            <div>
              <label>Metas do mês</label>
              {[['views', 'Views'], ['leads', 'Leads'], ['sales', 'Vendas'], ['revenue', 'Faturamento (R$)']].map(([g, label]) => (
                <div key={g}>
                  <label className="goal-l" htmlFor={`g-${g}-${b}`}>{label}</label>
                  <input id={`g-${g}-${b}`} type="number" min="0" value={draft[b].goals[g] || ''} onChange={(e) => setGoal(b, g, e.target.value)} />
                </div>
              ))}
              <p className="hint">Em branco, a meta não aparece no placar.</p>
            </div>
          </div>
        </section>
      ))}
      <section className="area">
        <div className="area-head"><h2>Dados</h2><span>Ficam só neste navegador</span></div>
        <div className="actions">
          <button className="btn" onClick={save}>Salvar ajustes</button>
          <button className="btn" onClick={exportBackup}>Exportar backup</button>
          <label className="btn" htmlFor="imp">Importar backup</label>
          <input id="imp" type="file" accept="application/json" hidden onChange={importBackup} />
          <button className="btn danger" onClick={wipe}>Apagar todos os dados</button>
        </div>
      </section>
      <ApiTokens toast={actions.toast} />
    </main>
  )
}

// Remonta o formulário quando a config muda por fora (importar/apagar)
export default function SettingsPage(props) {
  return <SettingsForm key={JSON.stringify(props.state.config)} {...props} />
}
