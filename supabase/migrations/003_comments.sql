-- Comentários nas partes do placar (estilo Google Docs). Renato entra sem login,
-- então o papel anon pode ler, comentar, responder e resolver.
-- Rode no Supabase: SQL Editor > New query > Run.

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  view       text not null,              -- tela + período, ex.: 'VIVR|2026-10-05' ou 'PARETO|2026-10'
  anchor     text not null,              -- parte da tela, ex.: 'cell:views:2026-10-06'
  label      text not null check (char_length(label) <= 200),
  parent_id  uuid references public.comments(id) on delete cascade, -- null = abre uma conversa
  author     text not null check (author in ('Felipe', 'Renato')),
  body       text not null check (char_length(body) between 1 and 2000),
  resolved   boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists comments_view_idx on public.comments (view, anchor);

alter table public.comments enable row level security;

drop policy if exists "comments leitura publica" on public.comments;
create policy "comments leitura publica" on public.comments
  for select to anon, authenticated using (true);

-- Quem não fez login só comenta como Renato; quem fez login (Felipe), como Felipe.
drop policy if exists "comments insert anon" on public.comments;
create policy "comments insert anon" on public.comments
  for insert to anon with check (author = 'Renato' and resolved = false);

drop policy if exists "comments insert logado" on public.comments;
create policy "comments insert logado" on public.comments
  for insert to authenticated with check (author = 'Felipe');

-- Renato pode resolver/reabrir conversas, mas não alterar mais nada (grant por coluna).
revoke update on public.comments from anon;
grant update (resolved) on public.comments to anon;

drop policy if exists "comments resolver anon" on public.comments;
create policy "comments resolver anon" on public.comments
  for update to anon using (parent_id is null) with check (parent_id is null);

drop policy if exists "comments update logado" on public.comments;
create policy "comments update logado" on public.comments
  for update to authenticated using (true) with check (true);

-- Renato apaga só o que ele escreveu; Felipe apaga qualquer comentário.
drop policy if exists "comments delete anon" on public.comments;
create policy "comments delete anon" on public.comments
  for delete to anon using (author = 'Renato');

drop policy if exists "comments delete logado" on public.comments;
create policy "comments delete logado" on public.comments
  for delete to authenticated using (true);
