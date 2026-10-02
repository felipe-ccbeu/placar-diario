import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { defaults, loadState, normalize, saveState } from '../lib/storage'
import { weekDates } from '../lib/dates'

// Estado do placar + ações. Persistência isolada em lib/storage.js
// (ponto único para trocar localStorage por Supabase).
export function usePlacar() {
  const [state, setState] = useState(loadState)
  const [message, setMessage] = useState('')
  const timer = useRef()

  const toast = useCallback((msg) => {
    setMessage(msg)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMessage(''), 1800)
  }, [])

  useEffect(() => {
    if (!saveState(state)) toast('Não foi possível salvar neste navegador')
  }, [state, toast])

  const update = useCallback((fn) => {
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
        if (d[id]) delete d[id]
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
      setState(normalize(data))
      toast('Backup importado')
    },

    wipe() {
      setState(defaults())
      toast('Dados apagados')
    },
  }), [update, toast])

  return { state, actions, message }
}
