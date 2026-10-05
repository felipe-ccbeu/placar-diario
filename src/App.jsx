import { useState } from 'react'
import AdminPage from './pages/AdminPage'
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

  return (
    <>
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
        {ready && tab === 'ADMIN' && role === 'editor' && <AdminPage actions={actions} />}
      </div>
      <Toast message={message} />
    </>
  )
}

export default function App() {
  const { role, loading, signInEditor, enterViewer, leave } = useSession()
  if (loading) return null
  if (!role) return <LoginGate onEditor={signInEditor} onViewer={enterViewer} />
  return <Placar key={role} role={role} onLeave={leave} />
}
