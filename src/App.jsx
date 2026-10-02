import { useState } from 'react'
import Header from './components/Header'
import Toast from './components/Toast'
import { usePlacar } from './hooks/usePlacar'
import { BRANDS } from './lib/constants'
import { iso, mondayOf, todayIso } from './lib/dates'
import BrandPage from './pages/BrandPage'
import ParetoPage from './pages/ParetoPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  const { state, actions, message } = usePlacar()
  const [tab, setTab] = useState('VIVR')
  const [weekStart, setWeekStart] = useState(() => iso(mondayOf(new Date())))
  const [paretoMonth, setParetoMonth] = useState(() => todayIso().slice(0, 7))

  return (
    <>
      <div className="wrap">
        <Header tab={tab} onTab={setTab} />
        {BRANDS.includes(tab) && (
          <BrandPage brand={tab} state={state} actions={actions} weekStart={weekStart} onWeek={setWeekStart} />
        )}
        {tab === 'PARETO' && <ParetoPage state={state} actions={actions} month={paretoMonth} onMonth={setParetoMonth} />}
        {tab === 'CFG' && <SettingsPage state={state} actions={actions} />}
        <p className="foot">Os dados ficam salvos só neste navegador. Exporte um backup de vez em quando em Ajustes.</p>
      </div>
      <Toast message={message} />
    </>
  )
}
