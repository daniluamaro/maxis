-- Fase 1, STEP 1.4: `eventos_auditoria`, o rastro das ações privilegiadas
-- (docs/plans/modelo-dados.md §5.3). Só inserção: a Edge Function (`service_role`) grava, e
-- ninguém altera, exclui ou esvazia — nem o dono do banco. A leitura é do `super_admin` (tudo) e do
-- `master_admin` (o próprio tenant), sem tela na v1.

-- Tabela. As FKs não têm `on delete`: o evento prende a empresa e o ator (cadastro se desativa)
create table public.eventos_auditoria (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.empresas (id),
  ator_profile_id uuid references public.profiles (id),
  acao text not null,
  alvo_tabela text,
  alvo_id uuid,
  detalhes jsonb,
  created_at timestamptz not null default now(),
  -- `dominio.evento`, em minúsculas com sublinhado; classes por extenso, como no cnpj_valido
  constraint eventos_auditoria_acao_check
    check (acao ~ '^[abcdefghijklmnopqrstuvwxyz_]+[.][abcdefghijklmnopqrstuvwxyz_]+$')
);

-- Índices: o tenant (FK e policy) com a data, o ator (FK) e o alvo
create index eventos_auditoria_tenant_id_created_at_idx
  on public.eventos_auditoria (tenant_id, created_at desc);
create index eventos_auditoria_ator_profile_id_idx on public.eventos_auditoria (ator_profile_id);
create index eventos_auditoria_alvo_tabela_alvo_id_idx
  on public.eventos_auditoria (alvo_tabela, alvo_id);

-- Funções. O trigger é por comando, não por linha: assim barra também o `truncate` e o comando que
-- não acha linha nenhuma
create function private.impedir_alteracao_auditoria()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using
    errcode = 'insufficient_privilege',
    message = 'eventos_auditoria é imutável: só aceita inserção';
end;
$$;

-- Triggers
create trigger trg_impedir_alteracao_auditoria
before update or delete or truncate on public.eventos_auditoria
for each statement execute function private.impedir_alteracao_auditoria();

-- RLS
alter table public.eventos_auditoria enable row level security;

-- Policies: só leitura, uma por escopo (supabase/CLAUDE.md §6); nenhuma de escrita
create policy eventos_auditoria_select_super_admin on public.eventos_auditoria
for select to authenticated
using ((select private.is_super_admin()));

create policy eventos_auditoria_select_master_admin on public.eventos_auditoria
for select to authenticated
using (
  tenant_id = (select private.tenant_atual())
  and (select private.papel_atual()) = 'master_admin'
);

-- Grants. Os privilégios padrão do projeto dão tudo a anon, authenticated e service_role em toda
-- tabela nova de `public`: revoga-se tudo e concede-se o mínimo. O cliente só lê (a RLS filtra).
-- A Edge Function só insere, e só as colunas do evento: `id` e `created_at` vêm do banco (o rastro
-- não escolhe a própria data). O insert padrão da Data API (`return=minimal`) não precisa de `select`
revoke all on table public.eventos_auditoria from public, anon, authenticated, service_role;
grant select on table public.eventos_auditoria to authenticated;
grant insert (tenant_id, ator_profile_id, acao, alvo_tabela, alvo_id, detalhes)
  on table public.eventos_auditoria to service_role;

-- O trigger dispara sem conferir o `execute`: ninguém precisa dele
revoke execute on function private.impedir_alteracao_auditoria() from public;

-- Comentários
comment on table public.eventos_auditoria is
  'Rastro das ações privilegiadas. Só inserção, pela Edge Function; imutável para todos. Leitura: super_admin (tudo) e master_admin (o próprio tenant).';
comment on column public.eventos_auditoria.tenant_id is
  'Empresa afetada; nula só em evento do SaaS sem empresa.';
comment on column public.eventos_auditoria.ator_profile_id is
  'Quem executou; nulo = o sistema.';
comment on column public.eventos_auditoria.acao is
  'dominio.evento (ex.: usuario.criado), em minúsculas com sublinhado.';
comment on column public.eventos_auditoria.detalhes is
  'Contexto (antes/depois relevantes). Nunca senha, token ou chave.';
comment on function private.impedir_alteracao_auditoria() is
  'Trigger de eventos_auditoria: recusa update, delete e truncate, para qualquer papel.';
