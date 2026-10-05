-- Tokens de API: gerados na aba Ajustes. Guardamos só o hash SHA-256; o token
-- aparece uma única vez na tela. Rode no Supabase: SQL Editor > New query > Run.

create table if not exists public.api_tokens (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  token_hash   text not null unique,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.api_tokens enable row level security;

-- Sem leitura pública: só quem fez login (o Felipe) vê, cria e revoga.
drop policy if exists "api_tokens logado" on public.api_tokens;
create policy "api_tokens logado" on public.api_tokens
  for all to authenticated using (true) with check (true);
