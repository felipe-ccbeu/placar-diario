import { supabase } from './supabaseClient'

// Comentários ficam na tabela public.comments (ver supabase/migrations/003_comments.sql).
export async function fetchComments() {
  const { data, error } = await supabase.from('comments').select('*').order('created_at')
  if (error) throw error
  return data
}

export async function addComment(row) {
  const { data, error } = await supabase.from('comments').insert(row).select().single()
  if (error) throw error
  return data
}

export async function setResolved(id, resolved) {
  const { error } = await supabase.from('comments').update({ resolved }).eq('id', id)
  if (error) throw error
}

export async function deleteComment(id) {
  const { error } = await supabase.from('comments').delete().eq('id', id)
  if (error) throw error
}
