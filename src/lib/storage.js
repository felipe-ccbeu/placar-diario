import { BRANDS, METRIC } from './constants'

const KEY = 'placar_v2'

export function defaults() {
  return {
    version: 2,
    config: {
      VIVR: { origins: ['Orgânico', 'Meta B2C', 'Meta B2B', 'Indicação'], objections: ['Preço', 'Sem tempo para estudar', 'Dúvida sobre o app', 'Falha técnica'], goals: { views: 0, leads: 0, sales: 0, revenue: 0 } },
      SKOLEN: { origins: ['Orgânico', 'Meta', 'CNAE', 'Indicação'], objections: ['Preço', 'Já usa outro sistema', 'Falta funcionalidade', 'Falha técnica'], goals: { views: 0, leads: 0, sales: 0, revenue: 0 } },
    },
    days: {}, weeks: {}, obj: {},
    accounts: defaultAccounts(), acc: {},
  }
}

// Rede UGC: 5 contas satélite por marca. Dados diários em acc['MARCA|contaId|data']
function defaultAccounts() {
  const out = {}
  for (const b of BRANDS) out[b] = [1, 2, 3, 4, 5].map((n) => ({ id: 'c' + n, name: 'Conta ' + n }))
  return out
}

export function normalize(s) {
  const d = defaults()
  s.config = s.config || {}
  for (const b of BRANDS) {
    s.config[b] = Object.assign({}, d.config[b], s.config[b] || {})
    s.config[b].goals = Object.assign({}, d.config[b].goals, s.config[b].goals || {})
  }
  s.days = s.days || {}
  s.weeks = s.weeks || {}
  s.obj = s.obj || {}
  s.acc = s.acc || {}
  s.accounts = Object.assign(defaultAccounts(), s.accounts || {})
  s.version = 2
  return s
}

// Formato antigo ("opsdash:*"): converte para o estado atual
function migrateOld() {
  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith('opsdash:')) keys.push(k)
  }
  if (!keys.length) return null
  const s = defaults()
  const map = { improvement_reach: 'imp_alcance', improvement_traffic: 'imp_trafego', improvement_sales: 'imp_vendas', lp_correct: 'lp_ok' }
  for (const k of keys) {
    const p = k.split(':')
    const v = localStorage.getItem(k)
    if (p[1] === 'note') { if (v) s.weeks[p[2] + '|' + p[3]] = { notes: v }; continue }
    const [, b, metric, date] = p
    if (!BRANDS.includes(b) || !date) continue
    const d = s.days[b + '|' + date] = s.days[b + '|' + date] || {}
    if (metric === 'leads_generated') d._lg = Number(v)
    else if (metric === 'leads_cnae') d._lc = Number(v)
    else if (metric === 'sales') { if (v !== '') d.sales = { 'Sem origem': Number(v) } }
    else {
      const id = map[metric] || metric
      const m = METRIC[id]
      if (!m) continue
      if (m.type === 'bool') { if (v === '1') d[id] = true } else if (v !== '') d[id] = Number(v)
    }
  }
  for (const d of Object.values(s.days)) {
    if ('_lg' in d || '_lc' in d) {
      const g = {}
      const lc = d._lc || 0
      const lg = d._lg || 0
      if (lc) g['CNAE'] = lc
      if (lg - lc > 0) g['Sem origem'] = lg - lc
      if (Object.keys(g).length) d.leads = g
      delete d._lg
      delete d._lc
    }
  }
  return s
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return normalize(JSON.parse(raw))
  } catch { /* cai para migração/defaults */ }
  try {
    const m = migrateOld()
    if (m) return m
  } catch { /* cai para defaults */ }
  return defaults()
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}
