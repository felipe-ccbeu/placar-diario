import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const VIEWER_KEY = 'placar_viewer'
const flag = {
  get() { try { return localStorage.getItem(VIEWER_KEY) === '1' } catch { return false } },
  set() { try { localStorage.setItem(VIEWER_KEY, '1') } catch { /* sem storage */ } },
  clear() { try { localStorage.removeItem(VIEWER_KEY) } catch { /* sem storage */ } },
}

// role: 'editor' (Felipe, logado no Supabase) | 'viewer' (Renato, só leitura) | null (tela de escolha)
export function useSession() {
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      setRole(data.session ? 'editor' : flag.get() ? 'viewer' : null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((evt) => {
      if (evt === 'SIGNED_OUT') setRole((r) => (r === 'editor' ? null : r))
    })
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [])

  const signInEditor = useCallback(async (password) => {
    const email = import.meta.env.VITE_EDITOR_EMAIL
    if (!email) return 'Falta definir VITE_EDITOR_EMAIL.'
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return error.message === 'Invalid login credentials' ? 'Senha incorreta.' : 'Não foi possível entrar: ' + error.message
    flag.clear()
    setRole('editor')
    return null
  }, [])

  const enterViewer = useCallback(() => {
    flag.set()
    setRole('viewer')
  }, [])

  const leave = useCallback(async () => {
    flag.clear()
    await supabase.auth.signOut()
    setRole(null)
  }, [])

  return { role, loading, signInEditor, enterViewer, leave }
}
