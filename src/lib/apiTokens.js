import { supabase } from './supabaseClient'

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function listTokens() {
  const { data, error } = await supabase.from('api_tokens').select('id, name, created_at, last_used_at').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// Retorna o token em texto puro: é a única vez que ele existe fora do banco (lá fica só o hash).
export async function createToken(name) {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const token = 'plc_' + [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  const { error } = await supabase.from('api_tokens').insert({ name, token_hash: await sha256(token) })
  if (error) throw error
  return token
}

export async function revokeToken(id) {
  const { error } = await supabase.from('api_tokens').delete().eq('id', id)
  if (error) throw error
}
