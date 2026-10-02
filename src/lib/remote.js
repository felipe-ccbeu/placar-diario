import { supabase } from './supabaseClient'

const ROW = 'main'

// Estado inteiro numa linha só (tabela public.placar). Retorna null se ainda não existe.
export async function fetchRemote() {
  const { data, error } = await supabase.from('placar').select('data').eq('id', ROW).maybeSingle()
  if (error) throw error
  return data?.data ?? null
}

export async function saveRemote(state) {
  const { error } = await supabase.from('placar').upsert({ id: ROW, data: state, updated_at: new Date().toISOString() })
  if (error) throw error
}
