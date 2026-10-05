import { useState } from 'react'
import { CommentsDrawer, CommentsProvider } from './components/Comments'
import Header from './components/Header'
import Toast from './components/Toast'
import { usePlacar } from './hooks/usePlacar'
import { useSession } from './hooks/useSession'
import { BRANDS } from './lib/constants'
import { iso, mondayOf, todayIso } from './lib/dates'
import BrandPage from './pages/BrandPage'
import LoginGate from './pages/LoginGate'
import ParetoPage from './pages/ParetoPage'
import SettingsPage from './pages/SettingsPage'
import SummaryPage from './pages/SummaryPage'

function Placar({ role, onLeave }) {
  const { state, actions, message, ready, loadError, sync } = usePlacar(role)
  const [tab, setTab] = useState('VIVR')
  const [weekStart, setWeekStart] = useState(() => iso(mondayOf(new Date())))
  const [month, setMonth] = useState(() => todayIso().slice(0, 7))

  // Tela atual para os comentários: aba + semana (marcas) ou aba + mês (Pareto/Resumo)
  const view = BRANDS.includes(tab) ? tab + '|' + weekStart : tab === 'PARETO' || tab === 'RESUMO' ? tab + '|' + month : null
  const goTo = (v) => {
    const [t, period] = v.split('|')
    setTab(t)
    if (BRANDS.includes(t)) setWeekStart(period)
    else setMonth(period)
  }

  return (
    <CommentsProvider role={role} view={ready ? view : null} onGo={goTo} toast={actions.toast}>
      <div className={'wrap' + (role === 'viewer' ? ' viewer' : '')}>
        <Header tab={tab} onTab={setTab} role={role} sync={sync} onLeave={onLeave} />
        {!ready && <p className="empty">Carregando…</p>}
        {ready && loadError && (
          <p className="banner" role="alert">
            Não foi possível ler os dados do servidor.
            {role === 'editor' ? ' Nada será gravado até a conexão voltar; recarregue a página.' : ' Recarregue a página para tentar de novo.'}
          </p>
        )}
        {ready && BRANDS.includes(tab) && (
          <BrandPage brand={tab} state={state} actions={actions} weekStart={weekStart} onWeek={setWeekStart} />
        )}
        {ready && tab === 'PARETO' && <ParetoPage state={state} actions={actions} month={month} onMonth={setMonth} />}
        {ready && tab === 'RESUMO' && <SummaryPage state={state} month={month} onMonth={setMonth} />}
        {ready && tab === 'CFG' && role === 'editor' && <SettingsPage state={state} actions={actions} />}
      </div>
      <CommentsDrawer />
      <Toast message={message} />
    </CommentsProvider>
  )
}

export default function App() {
  const { role, loading, signInEditor, enterViewer, leave } = useSession()
  if (loading) return null
  if (!role) return <LoginGate onEditor={signInEditor} onViewer={enterViewer} />
  return <Placar key={role} role={role} onLeave={leave} />
}
