import { Cmt } from './Comments'

function Card({ kind, title, subtitle, resultField, f, fields, onChange, anchor, label }) {
  const result = f[resultField]
  return (
    <Cmt className={`fcard ${kind} ${result ? 'res-' + result : ''}`} anchor={anchor} label={label}>
      <div className="ftag">{title} <span>{subtitle}</span></div>
      {fields.map(([field, placeholder]) => (
        <input key={field} placeholder={placeholder} value={f[field] ?? ''} onChange={(e) => onChange(field, e.target.value)} />
      ))}
      <select value={result ?? ''} onChange={(e) => onChange(resultField, e.target.value)}>
        <option value="">Resultado na sexta: pendente</option>
        <option value="moveu">Moveu o placar</option>
        <option value="nao">Não moveu</option>
      </select>
    </Cmt>
  )
}

export default function FocusBlock({ state, actions, b, area, weekStart, wk }) {
  const f = state.weeks[b + '|' + weekStart]?.focus?.[area.id] || {}
  const change = (field, value) => actions.setFocus(b, weekStart, area.id, field, value)
  return (
    <div className="focus">
      <Card
        kind="vital" title="Vital" subtitle="da semana" resultField="vital_result" f={f} onChange={change}
        anchor={`focus:${area.id}:vital`} label={`${wk} · ${area.name} · Vital`}
        fields={[['vital', 'Task que mexe num item do topo do ranking'], ['vital_metric', 'Métrica que deve mudar']]}
      />
      <Card
        kind="teste" title="Teste" subtitle="da semana" resultField="test_result" f={f} onChange={change}
        anchor={`focus:${area.id}:teste`} label={`${wk} · ${area.name} · Teste`}
        fields={[['test', 'Aposta pequena, com prazo curto'], ['test_hyp', 'Se fizermos X, esperamos Y']]}
      />
    </div>
  )
}
