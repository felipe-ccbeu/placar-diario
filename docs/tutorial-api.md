# API do Placar: continuar daqui

Objetivo: o Claude de outros repositórios conseguir **ler, criar, editar e apagar** dados do placar publicado, usando um token gerado na aba **Ajustes**.

## Onde paramos (04/10/2026)

**Feito (ainda não commitado nem publicado):**
- `supabase/migrations/002_api_tokens.sql`: tabela `api_tokens` (só o hash do token; só quem fez login lê/escreve).
- `src/lib/apiTokens.js`: gerar, listar e revogar tokens.
- `src/components/ApiTokens.jsx` + `src/pages/AdminPage.jsx`: aba **Admin** (só no login do Felipe), com o botão **Gerar token**, a lista e o botão **Revogar**.
- Aba registrada em `src/components/Header.jsx` e `src/App.jsx`; estilos `.tok-*` em `src/index.css`.

**Falta:**
1. Rodar a migração no Supabase
2. Publicar (com a decisão sobre as alterações pendentes)
3. Gerar o primeiro token
4. Criar o Worker da API (`/api/*`)
5. Corrigir a sincronização do app para não apagar o que a API gravou
6. Testar com `curl`
7. Configurar os outros repositórios

---

## 1. Rodar a migração

Supabase → **SQL Editor** → **New query** → cole o conteúdo de `supabase/migrations/002_api_tokens.sql` → **Run**.

Para conferir, abra **Table Editor**: a tabela `api_tokens` deve aparecer vazia.

## 2. Publicar

O Cloudflare publica sozinho a cada push na `main` (github.com/felipe-ccbeu/placar-diario).

⚠️ **Antes do commit:** o working tree tem alterações de antes de hoje (aba Resumo/`SummaryPage.jsx`, Pareto, `calc.js`, `MetricRows.jsx`, `constants.js`, `dates.js`, `storage.js`, `LoginGate.jsx`, `index.css`, tutorial UGC). Decida:
- **Já estão prontas?** Commite tudo junto.
- **Não estão?** Commite só os arquivos da API e deixe o resto para depois. Atenção: `src/index.css`, `src/App.jsx` e `src/components/Header.jsx` têm as duas coisas misturadas. Use `git add -p` nesses arquivos e escolha só os trechos do Admin/tokens.

```bash
npm run build        # confere se compila
git add ...          # conforme a decisão acima
git commit -m "feat: aba Admin para gerar tokens de API"
git push
```

## 3. Gerar o primeiro token

No site publicado: entre como Felipe → aba **Ajustes** → dê um nome (ex.: `repo-teste`) → **Gerar token** → **Copiar**.

O token (`plc_...`) só aparece **uma vez**. Se perder, revogue e gere outro.

## 4. Criar o Worker da API

### 4.1 `worker.js` (na raiz do projeto)

```js
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

    const body = req.method === 'DELETE' ? undefined : await req.json()
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
```

### 4.2 `wrangler.jsonc`

```jsonc
{
  "name": "placar-diario",
  "compatibility_date": "2026-10-02",
  "main": "worker.js",
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*"]
  }
}
```

`run_worker_first` garante que `/api/*` chegue ao Worker em vez de cair no `index.html` do SPA.

### 4.3 Segredos do Worker

No painel do Cloudflare (Workers → placar-diario → Settings → Variables and Secrets), como **Secret**:
- `SUPABASE_URL`: o mesmo valor de `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`: Supabase → Project Settings → API Keys → **service_role** (ou secret key)

⚠️ A service key ignora o RLS. Ela **nunca** vai para o `.env` com prefixo `VITE_` nem para o front.

## 5. Corrigir a sincronização do app

**Problema:** o app do editor grava o estado **inteiro** (`saveRemote` em `src/lib/remote.js`). Se a aba estiver aberta com dados antigos e você editar algo, o que a API gravou nesse intervalo se perde.

**Correção mínima,** em `src/hooks/usePlacar.js`: hoje só o visualizador recarrega ao voltar para a aba (efeito "Visualizador: atualiza sozinho..."). Faça o editor recarregar também, **desde que não haja alteração pendente** (`!dirty.current`):
- no `visibilitychange` (voltar para a aba)
- e/ou a cada 60 s

Cuidado: o `setState` vindo do servidor **não** pode marcar `dirty`, senão ele regrava o que acabou de ler.

## 6. Testar

```bash
TOKEN=plc_...   # o token gerado no passo 3
SITE=https://<endereço do site>

curl -H "Authorization: Bearer $TOKEN" $SITE/api                     # tudo
curl -H "Authorization: Bearer $TOKEN" $SITE/api/config/VIVR/goals   # algo específico
curl -X PATCH -H "Authorization: Bearer $TOKEN" \
  $SITE/api/days/VIVR%7C2026-10-05 -d '{"views": 100}'                # edita/cria
curl $SITE/api                                                        # sem token: 401
```

O `|` das chaves vira `%7C` na URL.

Depois, confira na aba Ajustes se a coluna **Último uso** mudou, e no site se o número apareceu.

## 7. Configurar os outros repositórios

Em cada repositório que vai usar a API:
1. Gere um token **próprio** na aba Ajustes, com o nome do repositório.
2. Coloque no `.env` desse repositório (fora do git): `PLACAR_TOKEN=plc_...`
3. Adicione ao `CLAUDE.md` dele:

```md
## Placar (API)
Base: https://<endereço do site>/api — header `Authorization: Bearer $PLACAR_TOKEN`.
O estado é um JSON; o caminho da URL navega por ele:
- `config/<MARCA>`: origens, objeções, metas (MARCA = VIVR | SKOLEN)
- `days/<MARCA>|<AAAA-MM-DD>`: números do dia
- `weeks/...`, `obj/...`, `accounts/<MARCA>`, `acc/<MARCA>|<contaId>|<data>`
Métodos: GET lê · PUT substitui/cria · PATCH mescla campos · DELETE remove.
Codifique `|` como `%7C`. Prefira PATCH para não apagar campos existentes.
```

## Referência rápida

| Coisa | Onde |
|---|---|
| Gerar/revogar token | Site → aba **Ajustes** |
| Tabela de tokens | Supabase → `api_tokens` |
| Dados do placar | Supabase → `placar` (linha `id = main`, coluna `data`) |
| Segredos do Worker | Cloudflare → Workers → placar-diario → Settings |
| Publicar | `git push` na `main` |
