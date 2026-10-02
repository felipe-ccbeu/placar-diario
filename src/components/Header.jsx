const TABS = [
  { id: 'VIVR', label: 'Vivr' },
  { id: 'SKOLEN', label: 'Skolen' },
  { id: 'PARETO', label: 'Pareto do mês' },
  { id: 'CFG', label: 'Ajustes' },
]

export default function Header({ tab, onTab }) {
  return (
    <header>
      <h1>Placar Vivr + Skolen</h1>
      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" data-tab={t.id} aria-selected={tab === t.id} onClick={() => onTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
    </header>
  )
}
