const TABS = [
  { id: 'VIVR', label: 'Vivr' },
  { id: 'SKOLEN', label: 'Skolen' },
  { id: 'PARETO', label: 'Pareto do mês' },
  { id: 'CFG', label: 'Ajustes', editorOnly: true },
]

const SYNC = { saving: 'Salvando…', saved: 'Salvo', error: 'Erro ao salvar' }

export default function Header({ tab, onTab, role, sync, onLeave }) {
  const tabs = TABS.filter((t) => !t.editorOnly || role === 'editor')
  return (
    <header>
      <h1>Dashboard de resultados</h1>
      <nav className="tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" data-tab={t.id} aria-selected={tab === t.id} onClick={() => onTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      <div className="who">
        {role === 'editor' && SYNC[sync] && <span className={'sync ' + sync}>{SYNC[sync]}</span>}
        <span>{role === 'editor' ? 'Felipe' : 'Renato · somente leitura'}</span>
        <button className="btn" onClick={onLeave}>Trocar</button>
      </div>
    </header>
  )
}
