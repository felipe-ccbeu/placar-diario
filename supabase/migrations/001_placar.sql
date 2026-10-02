-- Placar: o estado inteiro do app fica numa única linha (id = 'main').
-- Rode este arquivo no Supabase: SQL Editor > New query > Run.

create table if not exists public.placar (
  id         text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.placar enable row level security;

-- Qualquer pessoa com o link pode LER (é assim que o Renato entra sem senha).
drop policy if exists "placar leitura publica" on public.placar;
create policy "placar leitura publica" on public.placar
  for select to anon, authenticated using (true);

-- Só quem fez login (o Felipe) pode GRAVAR.
drop policy if exists "placar insert logado" on public.placar;
create policy "placar insert logado" on public.placar
  for insert to authenticated with check (true);

drop policy if exists "placar update logado" on public.placar;
create policy "placar update logado" on public.placar
  for update to authenticated using (true) with check (true);

drop policy if exists "placar delete logado" on public.placar;
create policy "placar delete logado" on public.placar
  for delete to authenticated using (true);
