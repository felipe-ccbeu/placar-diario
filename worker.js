// Rotas /api/* leem e escrevem no JSON do placar (tabela placar, id 'main').
// Todo o resto continua servindo o site (dist/).
export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url)
    if (!url.pathname.startsWith('/api')) return env.ASSETS.fetch(req)

    const sb = (path, { headers, ...init } = {}) => fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
      ...init,
      headers: { apikey: env.SUPABASE_SERVICE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`, 'content-type': 'application/json', ...headers },
    })

    // Autenticação: o hash do token precisa existir em api_tokens
    const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '')
    if (!token) return Response.json({ error: 'unauthorized' }, { status: 401 })
    const [found] = await (await sb(`api_tokens?token_hash=eq.${await sha256(token)}&select=id`)).json()
    if (!found) return Response.json({ error: 'unauthorized' }, { status: 401 })
    ctx.waitUntil(sb(`api_tokens?id=eq.${found.id}`, { method: 'PATCH', body: JSON.stringify({ last_used_at: new Date().toISOString() }) }))

    // /api/days/VIVR|2026-10-04  ->  ['days', 'VIVR|2026-10-04']
    const path = url.pathname.slice(4).split('/').filter(Boolean).map(decodeURIComponent)
    const [row] = await (await sb('placar?id=eq.main&select=data')).json()
    const state = row?.data ?? {}

    if (req.method === 'GET') return Response.json(get(state, path) ?? null)
    if (!path.length) return Response.json({ error: 'informe um caminho, ex.: /api/days/...' }, { status: 400 })

    let body
    if (req.method !== 'DELETE') {
      try { body = await req.json() } catch { return Response.json({ error: 'corpo JSON inválido' }, { status: 400 }) }
    }
    const parent = path.slice(0, -1).reduce((o, k) => (o[k] ??= {}), state)
    const key = path.at(-1)
    if (req.method === 'PUT') parent[key] = body
    else if (req.method === 'PATCH') parent[key] = { ...parent[key], ...body }
    else if (req.method === 'DELETE') delete parent[key]
    else return Response.json({ error: 'método não suportado' }, { status: 405 })

    const save = await sb('placar', {
      method: 'POST',
      headers: { prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ id: 'main', data: state, updated_at: new Date().toISOString() }),
    })
    if (!save.ok) return Response.json({ error: 'falha ao gravar' }, { status: 500 })
    return Response.json(get(state, path) ?? { ok: true })
  },
}

const get = (o, p) => p.reduce((x, k) => x?.[k], o)

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
