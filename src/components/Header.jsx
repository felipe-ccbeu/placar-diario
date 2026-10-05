import { CommentsButton } from './Comments'

const TABS = [
  { id: 'VIVR', label: 'Vivr' },
  { id: 'SKOLEN', label: 'Skolen' },
  { id: 'PARETO', label: 'Pareto do mês' },
  { id: 'RESUMO', label: 'Resumo' },
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
        <CommentsButton />
        <span>{role === 'editor' ? 'Felipe' : 'Renato · Comentador'}</span>
        <button className="btn icon" onClick={onLeave} aria-label="Sair" title="Sair">
          <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
        </button>
      </div>
    </header>
  )
}
