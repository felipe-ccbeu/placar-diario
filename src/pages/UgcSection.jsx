import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { addDays, iso, nf, parse, todayIso } from '../lib/dates'

const FIELDS = [
  { id: 'followers', label: 'Seguidores' },
  { id: 'views', label: 'Views do dia' },
  { id: 'posts', label: 'Posts' },
  { id: 'leads', label: 'Leads' },
  { id: 'engagement', label: 'Engajamento', wide: true },
]
const MAIN_FIELDS = FIELDS.slice(0, 2)

const hubH = (n) => 600 + Math.max(0, n - 6) * 70 // altura do grafo cresce com o nº de contas
const HALF = 58 // metade da altura do card fechado: âncora vertical
const LIST_BELOW = 760 // abaixo disso vira lista (sem grafo)
const MAX_PULL = 110 // quanto o card pode se afastar do ponto de repouso
const K = 0.06 // força da mola
const DAMP = 0.82

const val = (state, b, accId, date, f) => state.acc[b + '|' + accId + '|' + date]?.[f]
const dayBefore = (date, n = 1) => iso(addDays(parse(date), -n))

// Seguidores é estoque: usa o último valor lançado em ou antes do dia
function lastFollowers(state, b, accId, date) {
  for (let i = 0; i < 60; i++) {
    const d = dayBefore(date, i)
    const v = val(state, b, accId, d, 'followers')
    if (v != null) return { v, date: d }
  }
  return null
}

function avgViews7(state, b, accId, date) {
  let sum = 0
  for (let i = 0; i < 7; i++) sum += val(state, b, accId, dayBefore(date, i), 'views') || 0
  return sum / 7
}

function Delta({ now, prev }) {
  if (now == null || prev == null) return <span className="d flat">—</span>
  const d = now - prev
  return <span className={'d ' + (d > 0 ? 'up' : d < 0 ? 'down' : 'flat')}>{d > 0 ? '+' : ''}{nf(d)}</span>
}

// Reduz a foto para um avatar pequeno (cabe no localStorage)
function toAvatar(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const S = 160
      const c = document.createElement('canvas')
      c.width = c.height = S
      const side = Math.min(img.width, img.height)
      c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, S, S)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagem inválida')) }
    img.src = url
  })
}

const restOf = (i, n, w) => {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
  const h = hubH(n)
  return { x: w / 2 + Math.cos(a) * Math.min(w / 2 - 130, 520), y: h / 2 + Math.sin(a) * (h / 2 - 110) }
}

const stop = (e) => e.stopPropagation()

function Card({ row, brand, date, state, actions, open, onToggle, onRemove, rank, total, drag, grip, style, growUp }) {
  const pick = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try { actions.setAccountImage(brand, row.id, await toAvatar(f)) } catch { actions.toast('Não foi possível ler a imagem') }
  }
  const [confirm, setConfirm] = useState(false)
  useEffect(() => { if (!open) setConfirm(false) }, [open])
  const fields = open ? FIELDS : MAIN_FIELDS
  const cls = 'ucard' + (open ? ' open' : '') + (drag ? ' drag' : '') + (growUp ? ' up' : '') + (grip ? '' : ' static')
  return (
    <div className={cls} style={style}>
      <div className="uhead" {...grip}>
        <label
          className={'uavatar' + (row.img ? ' has' : '')}
          style={row.img ? { backgroundImage: `url(${row.img})` } : undefined}
          title={row.img ? 'Trocar imagem da conta' : 'Enviar imagem da conta'}
          onPointerDown={stop}
        >
          {!row.img && <span aria-hidden="true">+</span>}
          <input type="file" accept="image/*" onChange={pick} aria-label="Imagem da conta" />
        </label>
        <div className="uid">
          <b>{row.name || 'Sem nome'}</b>
          <small>{row.handle ? '@' + row.handle.replace(/^@/, '') : 'sem @'}</small>
        </div>
        <button className="uexp" onPointerDown={stop} onClick={onToggle} aria-expanded={open} title={open ? 'Recolher' : 'Ver informações completas'}>
          {open ? '−' : '+'}
        </button>
      </div>
      <div className="ubody">
        {open && (
          <>
            <label>Nome
              <input className="txt" value={row.name} onChange={(e) => actions.updateAccount(brand, row.id, { name: e.target.value })} />
            </label>
            <label>@ no Instagram
              <input className="txt" value={row.handle || ''} placeholder="usuario" onChange={(e) => actions.updateAccount(brand, row.id, { handle: e.target.value })} />
            </label>
          </>
        )}
        {fields.map((f) => {
          const v = val(state, brand, row.id, date, f.id)
          const carried = f.id === 'followers' && v == null && row.followers != null
          return (
            <label key={f.id} className={f.wide ? 'wide' : ''}>
              {f.label}
              <input
                className={'num' + (carried ? ' carried' : '')}
                type="number"
                min="0"
                inputMode="numeric"
                value={v ?? ''}
                placeholder={carried ? nf(row.followers) : '—'}
                title={carried ? 'Último valor lançado; digite para atualizar' : undefined}
                onWheel={(e) => e.currentTarget.blur()}
                onChange={(e) => actions.setAccountValue(brand, row.id, date, f.id, e.target.value)}
              />
            </label>
          )
        })}
        {open && (
          <div className="ustats">
            <span>Δ seguidores <Delta now={row.followers} prev={row.followersPrev} /></span>
            <span>Δ views vs. ontem <Delta now={row.views} prev={row.viewsPrev} /></span>
            <span>Média 7d <b>{row.avg7 ? nf(row.avg7) : '—'}</b> views/dia</span>
            <span>Ranking <b>{row.avg7 > 0 ? rank + 'º' : '—'}</b> de {total}</span>
            <div className="uacts">
              {row.img && <button className="ulink" onClick={() => actions.setAccountImage(brand, row.id, null)}>Remover foto</button>}
              {onRemove && (confirm ? (
                <span className="uconfirm">
                  Excluir conta e seus dados?
                  <button className="ulink" onClick={onRemove}>Sim, excluir</button>
                  <button className="ulink muted" onClick={() => setConfirm(false)}>Cancelar</button>
                </span>
              ) : (
                <button className="ulink" onClick={() => setConfirm(true)}>Excluir conta</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Graph({ rows, totals, brandName, brand, date, state, actions, openId, setOpenId }) {
  const n = rows.length
  const H = hubH(n)
  const box = useRef(null)
  const [w, setW] = useState(0)
  const rests = useRef({})
  const pos = useRef({}) // posição física por id de conta
  const drag = useRef(null)
  const raf = useRef(0)
  const [, force] = useState(0)

  rests.current = Object.fromEntries(rows.map((r, i) => [r.id, restOf(i, n, w)]))
  const list = w > 0 && w < LIST_BELOW

  const step = () => {
    let moving = false
    for (const [id, p] of Object.entries(pos.current)) {
      const r = rests.current[id]
      if (!r) { delete pos.current[id]; continue }
      if (drag.current?.id === id) { moving = true; continue }
      p.vx = (p.vx + (r.x - p.x) * K) * DAMP
      p.vy = (p.vy + (r.y - p.y) * K) * DAMP
      p.x += p.vx
      p.y += p.vy
      if (Math.abs(p.vx) + Math.abs(p.vy) + Math.abs(r.x - p.x) + Math.abs(r.y - p.y) > 0.05) moving = true
      else { p.x = r.x; p.y = r.y; p.vx = p.vy = 0 }
    }
    force((t) => t + 1)
    raf.current = moving ? requestAnimationFrame(step) : 0
  }
  const kick = () => { if (!raf.current) raf.current = requestAnimationFrame(step) }

  // Mede a largura real; ao redimensionar, os cards vão direto para o novo lugar
  useLayoutEffect(() => {
    const el = box.current
    const measure = () => setW(el.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useLayoutEffect(() => {
    for (const [id, r] of Object.entries(rests.current)) {
      if (drag.current?.id === id) continue
      pos.current[id] = { ...r, vx: 0, vy: 0 }
    }
    force((t) => t + 1)
  }, [w])
  // Conta nova nasce no centro e é empurrada para o lugar; as demais se reacomodam
  const ids = rows.map((r) => r.id).join(',')
  useLayoutEffect(() => {
    if (!w) return
    for (const id of Object.keys(rests.current)) {
      if (!pos.current[id]) pos.current[id] = { x: w / 2, y: H / 2, vx: 0, vy: 0 }
    }
    kick()
  }, [ids]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { cancelAnimationFrame(raf.current); raf.current = 0 }, [])
  useEffect(() => {
    if (!openId) return
    const onKey = (e) => e.key === 'Escape' && setOpenId(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openId, setOpenId])

  const local = (e) => {
    const r = box.current.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const grip = (id) => ({
    onPointerDown(e) {
      if (e.button !== 0) return
      e.currentTarget.setPointerCapture(e.pointerId)
      const p = local(e)
      drag.current = { id, ox: p.x - pos.current[id].x, oy: p.y - pos.current[id].y }
      kick()
    },
    onPointerMove(e) {
      const d = drag.current
      if (!d || d.id !== id) return
      const p = local(e)
      const r = rests.current[id]
      let dx = p.x - d.ox - r.x
      let dy = p.y - d.oy - r.y
      const len = Math.hypot(dx, dy)
      if (len > 0) {
        // resistência elástica: quanto mais longe, mais difícil de puxar
        const eff = (MAX_PULL * len) / (MAX_PULL + len)
        dx = (dx / len) * eff
        dy = (dy / len) * eff
      }
      Object.assign(pos.current[id], { x: r.x + dx, y: r.y + dy, vx: 0, vy: 0 })
      force((t) => t + 1)
    },
    onPointerUp() { drag.current = null; kick() },
    onPointerCancel() { drag.current = null; kick() },
  })

  const ranked = [...rows].sort((a, b) => b.avg7 - a.avg7)
  const maxViews = Math.max(1, ...rows.map((r) => r.views || 0))
  const cx = w / 2
  const cy = H / 2

  const card = (r, extra) => (
    <Card
      key={r.id}
      row={r}
      brand={brand}
      date={date}
      state={state}
      actions={actions}
      open={openId === r.id}
      onToggle={() => setOpenId((o) => (o === r.id ? null : r.id))}
      onRemove={n > 1 ? () => { setOpenId(null); actions.removeAccount(brand, r.id) } : undefined}
      rank={ranked.findIndex((x) => x.id === r.id) + 1}
      total={n}
      {...extra}
    />
  )

  return (
    <>
      <div ref={box} className={'hub' + (list ? ' list' : '')} style={list || !w ? undefined : { height: H }}>
        {list ? (
          <div className="ugc-list">{rows.map((r) => card(r, {}))}</div>
        ) : w > 0 && (
          <>
            <svg aria-hidden="true">
              {rows.map((r) => {
                const p = pos.current[r.id] || rests.current[r.id]
                return (
                  <line
                    key={r.id}
                    className={'edge' + (r.views ? ' on' : '')}
                    style={{ strokeWidth: 1.5 + 5 * ((r.views || 0) / maxViews) }}
                    x1={cx} y1={cy} x2={p.x} y2={p.y}
                  />
                )
              })}
            </svg>
            <div className="hub-core" style={{ left: cx, top: cy }}>
              <small>{brandName}</small>
              <b>{nf(totals.followers)}</b>
              <span>seguidores · {nf(totals.views)} views</span>
            </div>
            {rows.map((r) => {
              const p = pos.current[r.id] || rests.current[r.id]
              return card(r, {
                drag: drag.current?.id === r.id,
                grip: grip(r.id),
                growUp: rests.current[r.id].y > cy + 10,
                style: { left: p.x, top: p.y },
              })
            })}
          </>
        )}
      </div>
      <p className="hub-hint">
        {!list && <>A espessura da linha mostra quanto cada conta contribuiu nas views do dia. Segure o topo de um card para afastá-lo. </>}
        <b>+</b> abre as informações completas e o círculo envia a foto da conta.
      </p>
    </>
  )
}

export default function UgcSection({ brand, state, actions }) {
  const [date, setDate] = useState(todayIso)
  const [openId, setOpenId] = useState(null)
  const accounts = state.accounts[brand]
  const addAccount = () => {
    const id = 'c' + Date.now().toString(36)
    actions.addAccount(brand, id)
    setOpenId(id)
  }
  const brandName = brand === 'VIVR' ? 'Vivr' : 'Skolen'

  const rows = accounts.map((a) => {
    const f = lastFollowers(state, brand, a.id, date)
    const fPrev = lastFollowers(state, brand, a.id, dayBefore(f?.date || date))
    return {
      ...a,
      followers: f?.v ?? null,
      followersPrev: fPrev?.v ?? null,
      views: val(state, brand, a.id, date, 'views') ?? null,
      viewsPrev: val(state, brand, a.id, dayBefore(date), 'views') ?? null,
      avg7: avgViews7(state, brand, a.id, date),
    }
  })

  const sumRows = (k) => rows.reduce((t, r) => t + (r[k] || 0), 0)
  const sumField = (f) => accounts.reduce((t, a) => t + (val(state, brand, a.id, date, f) || 0), 0)
  const totals = { followers: sumRows('followers'), views: sumRows('views') }
  const fDelta = rows.some((r) => r.followersPrev != null) ? totals.followers - sumRows('followersPrev') : null
  const vDelta = rows.some((r) => r.viewsPrev != null) ? totals.views - sumRows('viewsPrev') : null

  return (
    <section className="area">
      <div className="area-head">
        <h2>UGC</h2>
        <span>rede de {accounts.length} contas · {brandName}</span>
        <div className="ugc-bar">
          <button className="btn icon" onClick={() => setDate(dayBefore(date))} aria-label="Dia anterior">‹</button>
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Dia do UGC" />
          <button className="btn icon" onClick={() => setDate(dayBefore(date, -1))} aria-label="Próximo dia">›</button>
          {date !== todayIso() && <button className="btn" onClick={() => setDate(todayIso())}>Hoje</button>}
          <button className="btn primary" onClick={addAccount}>+ Nova conta</button>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi"><small>Seguidores</small><b>{nf(totals.followers)}</b>{fDelta != null && <Delta now={fDelta} prev={0} />}</div>
        <div className="kpi"><small>Views no dia</small><b>{nf(totals.views)}</b>{vDelta != null && <Delta now={vDelta} prev={0} />}</div>
        <div className="kpi"><small>Posts</small><b>{nf(sumField('posts'))}</b></div>
        <div className="kpi"><small>Leads</small><b>{nf(sumField('leads'))}</b></div>
        <div className="kpi"><small>Engajamento</small><b>{nf(sumField('engagement'))}</b></div>
      </div>

      <Graph rows={rows} totals={totals} brandName={brandName} brand={brand} date={date} state={state} actions={actions} openId={openId} setOpenId={setOpenId} />
    </section>
  )
}
