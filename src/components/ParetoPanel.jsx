import { nf } from '../lib/dates'

function Chart({ items }) {
  const W = 520, H = 220, L = 14, R = 40, T = 14, B = 44
  const pw = W - L - R
  const ph = H - T - B
  const step = pw / items.length
  const bw = Math.min(54, step * 0.62)
  const max = items[0].v
  const pts = items.map((it, i) => [L + step * i + step / 2, T + ph - (it.cum / 100) * ph])
  const y80 = T + ph * 0.2
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gráfico de Pareto">
      <line x1={L} y1={T + ph} x2={W - R} y2={T + ph} className="ax" />
      <line x1={L} y1={y80} x2={W - R} y2={y80} className="l80" />
      <text x={W - R + 6} y={y80 + 4} className="cl">80%</text>
      {items.map((it, i) => {
        const x = L + step * i + (step - bw) / 2
        const h = Math.max(2, (it.v / max) * ph)
        const label = it.k.length > 11 ? it.k.slice(0, 10) + '…' : it.k
        return (
          <g key={it.k}>
            <rect x={x} y={T + ph - h} width={bw} height={h} rx="3" className={it.vital ? 'bv' : 'bt'}>
              <title>{it.k}: {nf(it.v)}</title>
            </rect>
            <text x={x + bw / 2} y={T + ph + 16} textAnchor="middle" className="cl">{label}</text>
          </g>
        )
      })}
      <polyline points={pts.map((p) => p.join(',')).join(' ')} className="cum" />
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" className="cd" />)}
    </svg>
  )
}

function ItemsTable({ items }) {
  return (
    <table>
      <thead><tr><th>Item</th><th>Qtde</th><th>%</th><th>Acum.</th></tr></thead>
      <tbody>
        {items.map((it) => (
          <tr key={it.k}>
            <td>{it.k}{it.vital && <span className="vital">vital</span>}</td>
            <td>{nf(it.v)}</td>
            <td>{Math.round(it.pct)}%</td>
            <td>{Math.round(it.cum)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function ParetoBody({ items, empty }) {
  if (!items.length) return <p className="empty">{empty}</p>
  return (
    <>
      <Chart items={items} />
      <ItemsTable items={items} />
    </>
  )
}

export default function ParetoPanel({ title, items, empty }) {
  return (
    <div className="panel">
      <h3>{title}</h3>
      <ParetoBody items={items} empty={empty} />
    </div>
  )
}
