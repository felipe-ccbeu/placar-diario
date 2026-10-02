import { addDays, ddmm, iso, mondayOf, parse, weekDates } from '../lib/dates'

export default function WeekBar({ weekStart, onWeek }) {
  const wd = weekDates(weekStart)

  return (
    <div className="weekbar">
      <span className="range">Semana {ddmm(wd[0])} a {ddmm(wd[6])}</span>
      <button className="btn icon" aria-label="Semana anterior" onClick={() => onWeek(iso(addDays(parse(weekStart), -7)))}>‹</button>
      <input
        type="date"
        value={weekStart}
        aria-label="Escolher semana"
        onChange={(e) => e.target.value && onWeek(iso(mondayOf(parse(e.target.value))))}
      />
      <button className="btn icon" aria-label="Próxima semana" onClick={() => onWeek(iso(addDays(parse(weekStart), 7)))}>›</button>
      <button className="btn" onClick={() => onWeek(iso(mondayOf(new Date())))}>Esta semana</button>
    </div>
  )
}
