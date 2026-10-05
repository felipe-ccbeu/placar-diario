import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { addComment, deleteComment, fetchComments, setResolved } from '../lib/comments'

// Comentários estilo Google Docs: com o painel aberto, qualquer <Cmt> vira clicável
// e abre a conversa daquela parte. Partes com conversa aberta ganham um marcador no canto.
const Ctx = createContext(null)
const SEEN_KEY = 'placar_cmt_seen'
const seen = {
  get() { try { return localStorage.getItem(SEEN_KEY) || '' } catch { return '' } },
  set(v) { try { localStorage.setItem(SEEN_KEY, v) } catch { /* sem storage */ } },
}

const keyOf = (c) => c.view + '#' + c.anchor
const when = (ts) => {
  const d = new Date(ts)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// view: tela atual ('VIVR|2026-10-05', 'PARETO|2026-10'…) ou null onde não há comentários.
// onGo(view): troca de aba/período para mostrar uma conversa de outra tela.
export function CommentsProvider({ role, view, onGo, toast, children }) {
  const author = role === 'editor' ? 'Felipe' : 'Renato'
  const [list, setList] = useState([])
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState(null) // { key, view, anchor, label }
  const [lastSeen, setLastSeen] = useState(seen.get)

  const load = useCallback(() => {
    fetchComments().then((rows) => { setList(rows); setFailed(false) }).catch(() => setFailed(true))
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 30000)
    const onVis = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
  }, [load])

  const threads = useMemo(() => {
    const roots = list.filter((c) => !c.parent_id).map((c) => ({ ...c, replies: [] }))
    const byId = new Map(roots.map((r) => [r.id, r]))
    for (const c of list) if (c.parent_id) byId.get(c.parent_id)?.replies.push(c)
    return roots
  }, [list])

  const openCount = useMemo(() => {
    const m = new Map()
    for (const t of threads) if (!t.resolved) m.set(keyOf(t), (m.get(keyOf(t)) || 0) + 1)
    return m
  }, [threads])

  const unread = list.filter((c) => c.author !== author && c.created_at > lastSeen).length

  // Painel aberto = já viu tudo que chegou
  useEffect(() => {
    if (!open || !list.length) return
    const latest = list.reduce((a, c) => (c.created_at > a ? c.created_at : a), '')
    if (latest > lastSeen) { seen.set(latest); setLastSeen(latest) }
  }, [open, list, lastSeen])

  // Com o painel aberto, o clique numa parte comentável escolhe a parte (não edita)
  useEffect(() => {
    document.body.classList.toggle('commenting', open && !!view)
    document.body.classList.toggle('cdrawer-open', open)
    return () => document.body.classList.remove('commenting', 'cdrawer-open')
  }, [open, view])

  const pick = useCallback((t) => { setTarget(t); setOpen(true) }, [])

  const run = useCallback(async (fn, fail) => {
    try { await fn(); load() } catch { toast(fail) }
  }, [load, toast])

  const value = {
    author, role, view, threads, openCount, unread, failed, open, target,
    setOpen, setTarget, pick, onGo,
    post: (t, body, parent_id = null) => run(
      () => addComment({ view: t.view, anchor: t.anchor, label: t.label, parent_id, author, body }),
      'Não foi possível comentar',
    ),
    resolve: (id, v) => run(() => setResolved(id, v), 'Não foi possível atualizar'),
    remove: (id) => run(() => deleteComment(id), 'Não foi possível excluir'),
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useComments = () => useContext(Ctx)

// Parte comentável do placar. anchor é único dentro da tela; label descreve a parte por extenso.
export function Cmt({ as: Tag = 'div', anchor, label, className = '', children, ...rest }) {
  const c = useContext(Ctx)
  if (!c?.view || c.failed) return <Tag className={className} {...rest}>{children}</Tag>
  const key = c.view + '#' + anchor
  const n = c.openCount.get(key) || 0
  const t = { key, view: c.view, anchor, label }
  const cls = [className, 'cmt', n && 'has-cmt', c.target?.key === key && 'cmt-on'].filter(Boolean).join(' ')
  const picking = c.open && {
    tabIndex: 0,
    title: 'Comentar: ' + label,
    onClick: () => c.pick(t),
    onKeyDown: (e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); c.pick(t) } },
  }
  return (
    <Tag {...rest} {...picking} className={cls} data-anchor={key}>
      {n > 0 && (
        <button
          type="button"
          className="cmark"
          aria-label={`${n} ${n > 1 ? 'conversas abertas' : 'conversa aberta'} em ${label}`}
          onClick={(e) => { e.stopPropagation(); c.pick(t) }}
        />
      )}
      {children}
    </Tag>
  )
}

export function CommentsButton() {
  const c = useContext(Ctx)
  if (!c) return null
  const total = [...c.openCount.values()].reduce((a, n) => a + n, 0)
  return (
    <button className={'btn cbtn' + (c.open ? ' on' : '')} aria-expanded={c.open} onClick={() => c.setOpen(!c.open)}>
      <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
      Comentários
      {c.unread > 0 ? <span className="cbadge new" title="Novos desde a última vez">{c.unread}</span>
        : total > 0 && <span className="cbadge" title="Conversas abertas">{total}</span>}
    </button>
  )
}

function Composer({ placeholder, autoFocus, onSend, onCancel }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const send = async () => {
    const body = text.trim()
    if (!body || busy) return
    setBusy(true)
    await onSend(body)
    setBusy(false)
    setText('')
  }
  return (
    <div className="ccompose">
      <textarea
        value={text}
        placeholder={placeholder}
        autoFocus={autoFocus}
        maxLength={2000}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send() }}
      />
      <div className="cacts">
        {onCancel && <button className="btn" onClick={onCancel}>Cancelar</button>}
        <button className="btn primary" disabled={!text.trim() || busy} onClick={send}>Comentar</button>
      </div>
    </div>
  )
}

function Msg({ m, canDelete, onDelete }) {
  const [confirm, setConfirm] = useState(false)
  return (
    <div className="cmsg">
      <div className="cwho">
        <b>{m.author}</b><small>{when(m.created_at)}</small>
        {canDelete && !confirm && <button className="clink" onClick={() => setConfirm(true)}>Excluir</button>}
        {confirm && (
          <span className="cconfirm">
            Excluir?
            <button className="clink danger" onClick={onDelete}>Sim</button>
            <button className="clink" onClick={() => setConfirm(false)}>Não</button>
          </span>
        )}
      </div>
      <p>{m.body}</p>
    </div>
  )
}

function Thread({ t, showLabel }) {
  const c = useContext(Ctx)
  const [replying, setReplying] = useState(false)
  const mine = (m) => c.role === 'editor' || m.author === c.author
  const go = () => {
    if (t.view !== c.view) c.onGo(t.view)
    c.setTarget({ key: keyOf(t), view: t.view, anchor: t.anchor, label: t.label })
  }
  return (
    <article className={'cthread' + (t.resolved ? ' resolved' : '')}>
      {showLabel && <button className="cwhere" onClick={go}>{t.label}</button>}
      <Msg m={t} canDelete={mine(t)} onDelete={() => c.remove(t.id)} />
      {t.replies.map((r) => <Msg key={r.id} m={r} canDelete={mine(r)} onDelete={() => c.remove(r.id)} />)}
      {replying
        ? <Composer placeholder="Responder" autoFocus onSend={async (b) => { await c.post(t, b, t.id); setReplying(false) }} onCancel={() => setReplying(false)} />
        : (
          <div className="cacts">
            {!t.resolved && <button className="clink" onClick={() => setReplying(true)}>Responder</button>}
            <button className="clink" onClick={() => c.resolve(t.id, !t.resolved)}>{t.resolved ? 'Reabrir' : 'Resolver'}</button>
          </div>
        )}
    </article>
  )
}

export function CommentsDrawer() {
  const c = useContext(Ctx)
  const [scope, setScope] = useState('view') // view | all
  const [showResolved, setShowResolved] = useState(false)
  const target = c?.target

  // Leva a parte selecionada para a tela (inclusive depois de trocar de aba/semana)
  useEffect(() => {
    if (!target) return
    const raf = requestAnimationFrame(() => {
      document.querySelector(`[data-anchor="${CSS.escape(target.key)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(raf)
  }, [target])

  useEffect(() => {
    if (!c?.open) return
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (c.target) c.setTarget(null)
      else c.setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [c])

  if (!c?.open) return null

  const visible = (t) => showResolved || !t.resolved
  const all = scope === 'all' || !c.view
  const here = target ? c.threads.filter((t) => keyOf(t) === target.key && visible(t)) : []
  const listed = c.threads
    .filter((t) => visible(t) && (all || t.view === c.view))
    .sort((a, b) => Number(a.resolved) - Number(b.resolved) || (b.replies.at(-1)?.created_at || b.created_at).localeCompare(a.replies.at(-1)?.created_at || a.created_at))

  return (
    <aside className="cdrawer" aria-label="Comentários">
      <div className="chead">
        <h2>Comentários</h2>
        <button className="btn icon" aria-label="Fechar comentários" onClick={() => c.setOpen(false)}>×</button>
      </div>
      {c.failed && <p className="cerr">Não foi possível carregar os comentários. Confira se a migration 003 foi rodada no Supabase.</p>}

      {target ? (
        <>
          <button className="clink back" onClick={() => c.setTarget(null)}>‹ Todas as conversas</button>
          <p className="cfor">{target.label}</p>
          {here.map((t) => <Thread key={t.id} t={t} />)}
          <Composer
            key={target.key}
            placeholder={here.length ? 'Abrir outra conversa aqui' : 'Escreva um comentário'}
            autoFocus
            onSend={(b) => c.post(target, b)}
          />
          <p className="ctip">Ctrl+Enter envia. Clique em outra parte do placar para comentar nela.</p>
        </>
      ) : (
        <>
          <p className="ctip">{c.view ? 'Clique em qualquer parte do placar (célula, indicador, card, anotação) para comentar nela.' : 'Nesta aba não há o que comentar; veja abaixo as conversas das outras telas.'}</p>
          <div className="cfilters">
            <div className="seg" role="group" aria-label="Quais conversas">
              <button aria-pressed={!all} onClick={() => setScope('view')} disabled={!c.view}>Esta tela</button>
              <button aria-pressed={all} onClick={() => setScope('all')}>Todas</button>
            </div>
            <label><input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} /> Mostrar resolvidas</label>
          </div>
          {listed.length
            ? listed.map((t) => <Thread key={t.id} t={t} showLabel />)
            : <p className="empty">Nenhuma conversa {showResolved ? '' : 'aberta '}{all ? 'ainda' : 'nesta tela'}.</p>}
        </>
      )}
    </aside>
  )
}
