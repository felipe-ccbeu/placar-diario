import { useEffect, useState } from 'react'
import { createToken, listTokens, revokeToken } from '../lib/apiTokens'

const fmt = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'nunca')

export default function ApiTokens({ toast }) {
  const [tokens, setTokens] = useState([])
  const [name, setName] = useState('')
  const [fresh, setFresh] = useState(null)
  const [busy, setBusy] = useState(false)

  const reload = () => listTokens().then(setTokens).catch(() => toast('Não foi possível carregar os tokens'))
  useEffect(() => { reload() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function generate() {
    const n = name.trim()
    if (!n) return toast('Dê um nome ao token (ex.: o repositório que vai usar)')
    setBusy(true)
    try {
      setFresh({ name: n, token: await createToken(n) })
      setName('')
      await reload()
    } catch {
      toast('Não foi possível gerar o token')
    } finally {
      setBusy(false)
    }
  }

  async function revoke(t) {
    if (!window.confirm(`Revogar o token "${t.name}"? Quem usa ele perde o acesso na hora.`)) return
    try {
      await revokeToken(t.id)
      await reload()
    } catch {
      toast('Não foi possível revogar o token')
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(fresh.token)
      toast('Token copiado')
    } catch {
      toast('Copie manualmente o token')
    }
  }

  return (
    <section className="area">
      <div className="area-head"><h2>Tokens de API</h2><span>Um por repositório; revogue se vazar</span></div>
      <div className="actions">
        <input className="tok-name" placeholder="Nome (ex.: repo-vivr-site)" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && generate()} />
        <button className="btn primary" onClick={generate} disabled={busy}>Gerar token</button>
      </div>
      {fresh && (
        <div className="tok-fresh">
          <p>Token <b>{fresh.name}</b> criado. Copie agora: ele não será mostrado de novo.</p>
          <code>{fresh.token}</code>
          <div className="actions">
            <button className="btn" onClick={copy}>Copiar</button>
            <button className="btn" onClick={() => setFresh(null)}>Já copiei</button>
          </div>
        </div>
      )}
      {tokens.length > 0 && (
        <table className="tok-list">
          <thead><tr><th>Nome</th><th>Criado</th><th>Último uso</th><th /></tr></thead>
          <tbody>
            {tokens.map((t) => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td>{fmt(t.created_at)}</td>
                <td>{fmt(t.last_used_at)}</td>
                <td><button className="btn danger" onClick={() => revoke(t)}>Revogar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
