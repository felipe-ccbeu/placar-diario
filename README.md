# Placar Diário

Aplicação web em React (Vite) com backend Supabase.

## Começando

1. `npm install`
2. Copie `.env.example` para `.env` e preencha com os dados do seu projeto Supabase
   (Project Settings > API).
3. `npm run dev`

## Estrutura

- `src/lib/` – clientes e utilitários (`supabaseClient.js`)
- `src/pages/` – telas
- `src/components/` – componentes reutilizáveis
- `src/hooks/` – hooks customizados
- `supabase/` – migrations/SQL do banco

> Use apenas a `anon key` no front-end. Nunca coloque a `service_role` key no `.env` do Vite.
