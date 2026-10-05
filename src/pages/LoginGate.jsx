import { useState } from 'react'

const PEOPLE = [
  { id: 'felipe', name: 'Felipe', role: 'Edita os dados', initial: 'F' },
  { id: 'renato', name: 'Renato', role: 'Só visualiza', initial: 'R' },
]

export default function LoginGate({ onEditor, onViewer }) {
  const [asking, setAsking] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const pick = (id) => (id === 'felipe' ? setAsking(true) : onViewer())
  const back = () => { setAsking(false); setPassword(''); setError('') }

  const submit = async (e) => {
    e.preventDefault()
    if (!password || busy) return
    setBusy(true)
    setError('')
    const err = await onEditor(password)
    if (err) { setError(err); setBusy(false) }
  }

  return (
    <div className="gate">
      <span className="gate-blob a" aria-hidden="true" />
      <span className="gate-blob b" aria-hidden="true" />

      <div className="gate-inner">
        <div className="gate-hero">
          <span className="gate-brand">Vivr · Skolen</span>
          <h1>Dashboard de resultados</h1>
          <p>Os números do dia, da semana e do mês.</p>
        </div>

        <section className="gate-glass">
          {!asking ? (
            <>
              <h2>Quem está entrando?</h2>
              <div className="gate-list">
                {PEOPLE.map((p) => (
                  <button key={p.id} className={'gate-person ' + p.id} onClick={() => pick(p.id)}>
                    <span className="gate-avatar" aria-hidden="true">{p.initial}</span>
                    <span className="gate-info">
                      <b>{p.name}</b>
                      <small>{p.role}</small>
                    </span>
                    <span className="gate-arrow" aria-hidden="true">→</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <form onSubmit={submit}>
              <button type="button" className="gate-back" onClick={back}>← Voltar</button>
              <h2>Olá, Felipe</h2>
              <input
                className="gate-input"
                type="password"
                placeholder="Senha"
                autoFocus
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                aria-label="Senha"
                aria-invalid={!!error}
              />
              {error && <div className="gate-err" role="alert">{error}</div>}
              <button className="gate-submit" disabled={!password || busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
