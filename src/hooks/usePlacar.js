import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { defaults, loadState, normalize, saveState } from '../lib/storage'
import { fetchRemote, saveRemote } from '../lib/remote'
import { weekDates } from '../lib/dates'

// Estado do placar + ações. O banco (Supabase) é a fonte da verdade; o localStorage
// só guarda uma cópia local do editor (backup/offline).
// role: 'editor' grava no banco; 'viewer' só lê e as ações viram no-op.
export function usePlacar(role) {
  const editor = role === 'editor'
  const [state, setState] = useState(() => (editor ? loadState() : defaults()))
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [sync, setSync] = useState('idle') // idle | saving | saved | error
  const [message, setMessage] = useState('')
  const timer = useRef()
  const dirty = useRef(false)
  const canSave = useRef(false) // só libera gravação depois de ler o banco com sucesso

  const toast = useCallback((msg) => {
    setMessage(msg)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMessage(''), 1800)
  }, [])

  // Carga inicial do banco. Se ainda não há nada lá, o editor sobe os dados locais.
  useEffect(() => {
    let alive = true
    fetchRemote()
      .then((row) => {
        if (!alive) return
        if (row) setState(normalize(row))
        else if (editor) dirty.current = true
        canSave.current = editor
        setReady(true)
      })
      .catch(() => {
        if (!alive) return
        setLoadError(true)
        setReady(true)
      })
    return () => { alive = false }
  }, [editor])

  // Atualiza sozinho a cada minuto e ao voltar para a aba, para não sobrescrever o que
  // a API gravou. O editor só recarrega sem alteração pendente (antes e depois da leitura);
  // o setState daqui não marca dirty, então não regrava o que acabou de ler.
  useEffect(() => {
    if (!ready || loadError) return
    const refresh = () => {
      if (dirty.current) return
      fetchRemote().then((row) => row && !dirty.current && setState(normalize(row))).catch(() => {})
    }
    const id = setInterval(refresh, 60000)
    const onVis = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
  }, [ready, loadError])

  // Editor: cópia local imediata + gravação no banco com pequeno atraso
  useEffect(() => {
    if (!ready || !editor) return
    if (!saveState(state)) toast('Não foi possível salvar neste navegador')
    if (!canSave.current || !dirty.current) return
    setSync('saving')
    const t = setTimeout(async () => {
      try {
        await saveRemote(state)
        dirty.current = false
        setSync('saved')
      } catch {
        setSync('error')
        toast('Não foi possível salvar no servidor')
      }
    }, 800)
    return () => clearTimeout(t)
  }, [state, ready, editor, toast])

  useEffect(() => {
    const warn = (e) => { if (dirty.current && canSave.current) e.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])

  const update = useCallback((fn) => {
    dirty.current = true
    setState((prev) => {
      const next = structuredClone(prev)
      fn(next)
      return next
    })
  }, [])

  const actions = useMemo(() => ({
    toast,

    setNumber(b, date, metric, origin, raw) {
      const trimmed = raw.trim()
      const n = trimmed === '' ? null : Math.max(0, Number(trimmed))
      const empty = n === null || Number.isNaN(n)
      update((s) => {
        const d = s.days[b + '|' + date] = s.days[b + '|' + date] || {}
        if (metric.type === 'group') {
          const g = d[metric.id] = d[metric.id] || {}
          if (empty) delete g[origin]
          else g[origin] = n
          if (!Object.keys(g).length) delete d[metric.id]
        } else if (empty) delete d[metric.id]
        else d[metric.id] = n
      })
    },

    toggleBool(b, date, id) {
      update((s) => {
        const d = s.days[b + '|' + date] = s.days[b + '|' + date] || {}
        // vazio → ✓ → ✗ → vazio
        if (d[id] === true) d[id] = false
        else if (d[id] === false) delete d[id]
        else d[id] = true
      })
    },

    setFocus(b, weekStart, areaId, field, value) {
      update((s) => {
        const w = s.weeks[b + '|' + weekStart] = s.weeks[b + '|' + weekStart] || {}
        w.focus = w.focus || {}
        const f = w.focus[areaId] = w.focus[areaId] || {}
        f[field] = value
      })
    },

    setNote(b, weekStart, value) {
      update((s) => {
        const w = s.weeks[b + '|' + weekStart] = s.weeks[b + '|' + weekStart] || {}
        w.notes = value
      })
    },

    clearWeek(b, weekStart) {
      update((s) => {
        for (const d of weekDates(weekStart)) delete s.days[b + '|' + d]
        delete s.weeks[b + '|' + weekStart]
      })
      toast('Semana limpa')
    },

    adjustObjection(b, month, cat, delta) {
      update((s) => {
        const cur = s.obj[b + '|' + month] = s.obj[b + '|' + month] || {}
        cur[cat] = Math.max(0, (cur[cat] || 0) + delta)
        if (!cur[cat]) delete cur[cat]
      })
    },

    setAccountValue(b, accId, date, field, raw) {
      const trimmed = raw.trim()
      const n = trimmed === '' ? null : Math.max(0, Number(trimmed))
      update((s) => {
        const k = b + '|' + accId + '|' + date
        const d = s.acc[k] = s.acc[k] || {}
        if (n === null || Number.isNaN(n)) delete d[field]
        else d[field] = n
        if (!Object.keys(d).length) delete s.acc[k]
      })
    },

    updateAccount(b, accId, patch) {
      update((s) => {
        const a = s.accounts[b].find((x) => x.id === accId)
        if (a) Object.assign(a, patch)
      })
    },

    addAccount(b, accId) {
      update((s) => {
        const list = s.accounts[b]
        let n = list.length + 1
        while (list.some((a) => a.name === 'Conta ' + n)) n++
        list.push({ id: accId, name: 'Conta ' + n })
      })
    },

    removeAccount(b, accId) {
      update((s) => {
        s.accounts[b] = s.accounts[b].filter((a) => a.id !== accId)
        const prefix = b + '|' + accId + '|'
        for (const k of Object.keys(s.acc)) if (k.startsWith(prefix)) delete s.acc[k]
      })
      toast('Conta excluída')
    },

    setAccountImage(b, accId, img) {
      update((s) => {
        const a = s.accounts[b].find((x) => x.id === accId)
        if (a) { if (img) a.img = img; else delete a.img }
      })
    },

    saveConfig(config) {
      update((s) => { s.config = config })
      toast('Ajustes salvos')
    },

    importState(data) {
      dirty.current = true
      setState(normalize(data))
      toast('Backup importado')
    },

    wipe() {
      dirty.current = true
      setState(defaults())
      toast('Dados apagados')
    },
  }), [update, toast])

  // Visualizador: toda ação que altera dados vira aviso (o banco também bloqueia por RLS)
  const guarded = useMemo(() => {
    if (editor) return actions
    return Object.fromEntries(Object.entries(actions).map(([k, fn]) => [k, k === 'toast' ? fn : () => toast('Somente leitura')]))
  }, [actions, editor, toast])

  return { state, actions: guarded, message, ready, loadError, sync }
}
