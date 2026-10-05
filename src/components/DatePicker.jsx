import { useEffect, useRef, useState } from 'react'
import { DAYN, addDays, iso, mondayOf, monthLabel, parse, todayIso } from '../lib/dates'

// Calendário no estilo do placar (o seletor nativo do navegador não aceita estilo).
// value: 'aaaa-mm-dd', ou 'aaaa-mm' com month. week: destaca a semana (seg–dom) do valor.
const MES = Array.from({ length: 12 }, (_, i) => monthLabel('2000-' + String(i + 1).padStart(2, '0')))

const shiftMonth = (ym, n) => {
  const [y, m] = ym.split('-').map(Number)
  return iso(new Date(y, m - 1 + n, 15)).slice(0, 7)
}

export default function DatePicker({ value, onChange, label, month = false, week = false, align = 'left' }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(value.slice(0, month ? 4 : 7)) // ano (month) ou mês exibido
  const [hover, setHover] = useState(null)
  const ref = useRef()
  const today = todayIso()

  useEffect(() => {
    if (!open) return
    setView(value.slice(0, month ? 4 : 7))
    const out = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', out)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', out); document.removeEventListener('keydown', esc) }
  }, [open, value, month])

  const pick = (v) => { onChange(v); setOpen(false) }
  const text = month ? monthLabel(value, true) : value.split('-').reverse().join('/')

  let body
  if (month) {
    body = (
      <>
        <div className="dp-head">
          <button type="button" className="dp-nav" aria-label="Ano anterior" onClick={() => setView(String(+view - 1))}>‹</button>
          <b>{view}</b>
          <button type="button" className="dp-nav" aria-label="Próximo ano" onClick={() => setView(String(+view + 1))}>›</button>
        </div>
        <div className="dp-months">
          {MES.map((m, i) => {
            const v = view + '-' + String(i + 1).padStart(2, '0')
            const cls = [v === value && 'sel', v === today.slice(0, 7) && 'now'].filter(Boolean).join(' ')
            return <button type="button" key={v} className={cls} aria-pressed={v === value} onClick={() => pick(v)}>{m}</button>
          })}
        </div>
        <div className="dp-foot"><button type="button" className="clink" onClick={() => pick(today.slice(0, 7))}>Este mês</button></div>
      </>
    )
  } else {
    const start = mondayOf(parse(view + '-01'))
    const weeks = Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => iso(addDays(start, w * 7 + d))))
    const selWeek = week && iso(mondayOf(parse(value)))
    body = (
      <>
        <div className="dp-head">
          <button type="button" className="dp-nav" aria-label="Mês anterior" onClick={() => setView(shiftMonth(view, -1))}>‹</button>
          <b>{monthLabel(view, true)}</b>
          <button type="button" className="dp-nav" aria-label="Próximo mês" onClick={() => setView(shiftMonth(view, 1))}>›</button>
        </div>
        <div className={'dp-grid' + (week ? ' wk' : '')} onPointerLeave={() => setHover(null)}>
          {DAYN.map((d) => <span key={d} className="dp-dow">{d.slice(0, 3)}</span>)}
          {weeks.map((days) => {
            const on = week && days[0] === selWeek
            const hov = week && days[0] === hover
            return days.map((d) => {
              const cls = [
                'dp-day',
                d.slice(0, 7) !== view && 'out',
                d === today && 'now',
                (week ? on : d === value) && 'sel',
                hov && !on && 'hov',
              ].filter(Boolean).join(' ')
              return (
                <button
                  type="button" key={d} className={cls} aria-pressed={week ? on : d === value}
                  aria-label={d.split('-').reverse().join('/')}
                  onPointerEnter={() => week && setHover(days[0])}
                  onClick={() => pick(d)}
                >
                  {Number(d.slice(8))}
                </button>
              )
            })
          })}
        </div>
        <div className="dp-foot"><button type="button" className="clink" onClick={() => pick(today)}>{week ? 'Esta semana' : 'Hoje'}</button></div>
      </>
    )
  }

  return (
    <div className="dp" ref={ref}>
      <button type="button" className={'btn dp-btn' + (open ? ' on' : '')} aria-label={label} aria-expanded={open} onClick={() => setOpen(!open)}>
        {text}
        <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
      </button>
      {open && <div className={'dp-pop ' + align} role="dialog" aria-label={label}>{body}</div>}
    </div>
  )
}
