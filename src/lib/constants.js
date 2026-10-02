export const BRANDS = ['VIVR', 'SKOLEN']
export const BNAME = { VIVR: 'Vivr', SKOLEN: 'Skolen' }

export const AREAS = [
  { id: 'alcance', name: 'Alcance', sub: 'Social media', metrics: [
    { id: 'active_accounts', label: 'Contas ativas', hint: 'nº de contas no dia', type: 'number', agg: 'last' },
    { id: 'reels', label: 'Reels', hint: 'publicados', type: 'number' },
    { id: 'stories', label: 'Stories', hint: 'publicados', type: 'number' },
    { id: 'tiktok', label: 'TikTok', hint: 'vídeos publicados', type: 'number' },
    { id: 'views', label: 'Views', hint: 'visualizações do dia', type: 'number', top: true, goal: 'views' },
    { id: 'imp_alcance', label: 'Melhoria implementada?', hint: 'marcar na sexta', type: 'bool', weekly: true },
  ] },
  { id: 'trafego', name: 'Tráfego', sub: 'Anúncios no Meta', metrics: [
    { id: 'leads', label: 'Leads', hint: 'total do dia', type: 'group', top: true, goal: 'leads' },
    { id: 'ads_running', label: 'Anúncio rodando?', hint: 'checagem diária', type: 'bool' },
    { id: 'lp_ok', label: 'LP correta?', hint: 'link, oferta e formulário', type: 'bool' },
    { id: 'insights', label: 'Insights revisados?', hint: 'marcar na sexta', type: 'bool', weekly: true },
    { id: 'imp_trafego', label: 'Melhoria implementada?', hint: 'marcar na sexta', type: 'bool', weekly: true },
  ] },
  { id: 'vendas', name: 'Vendas', sub: 'Clientes fechados', metrics: [
    { id: 'sales', label: 'Vendas', hint: 'total do dia', type: 'group', top: true, goal: 'sales' },
    { id: 'ai_running', label: 'IA rodando?', hint: 'atendimento automático ativo', type: 'bool' },
    { id: 'imp_vendas', label: 'Melhoria implementada?', hint: 'marcar na sexta', type: 'bool', weekly: true },
  ] },
  { id: 'produto', name: 'Produto', sub: 'Funcionamento e melhorias', metrics: [
    { id: 'app_ok', label: 'Produto funcionando?', hint: 'teste rápido do fluxo principal', type: 'bool' },
    { id: 'bugs', label: 'Falhas reportadas', hint: 'novas no dia', type: 'number' },
    { id: 'imp_produto', label: 'Melhoria entregue?', hint: 'marcar na sexta', type: 'bool', weekly: true },
  ] },
]

export const METRIC = {}
AREAS.forEach((a) => a.metrics.forEach((m) => { METRIC[m.id] = m }))
