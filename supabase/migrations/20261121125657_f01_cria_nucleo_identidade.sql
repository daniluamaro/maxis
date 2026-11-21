-- Fase 1, STEP 1.2: núcleo de identidade — `empresas` (o tenant), `profiles` (os usuários) e as
-- funções de RLS (docs/plans/modelo-dados.md §3, §4, §5.1, §5.2 e §10). O cliente
-- (`authenticated`) só lê, e só o que a RLS deixa; a escrita é das Edge Functions (`service_role`).

-- Tipos
create type public.papel_usuario as enum ('super_admin', 'master_admin', 'admin', 'user');

-- Tabelas. `empresas.created_by` aponta para `profiles`, criada depois: a FK entra no fim
create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  razao_social text not null,
  nome_fantasia text,
  cnpj text not null,
  ativo boolean not null default true,
  bloqueada_em timestamptz,
  motivo_bloqueio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  constraint empresas_cnpj_key unique (cnpj),
  constraint empresas_cnpj_check check (private.cnpj_valido(cnpj)),
  -- Bloqueada se e somente se tem a data do bloqueio (limpa ao desbloquear)
  constraint empresas_bloqueio_check check (ativo = (bloqueada_em is null))
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  tenant_id uuid references public.empresas (id) on delete restrict,
  papel public.papel_usuario not null,
  nome text not null,
  email text not null,
  telefone text,
  ativo boolean not null default true,
  senha_provisoria boolean not null default true,
  senha_alterada_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  constraint profiles_email_key unique (email),
  -- Alvo das FKs compostas das tabelas de tenant (modelo-dados.md §1.3)
  constraint profiles_tenant_id_id_key unique (tenant_id, id),
  -- Só o super_admin vive fora de uma empresa
  constraint profiles_papel_tenant_check check ((papel = 'super_admin') = (tenant_id is null)),
  constraint profiles_email_check check (email = lower(email)),
  -- E.164 sem o +: começa pelo código do país; classes por extenso, como no cnpj_valido
  constraint profiles_telefone_check
    check (telefone ~ '^[123456789][0123456789]{7,14}$')
);

alter table public.empresas
  add constraint empresas_created_by_fkey foreign key (created_by) references public.profiles (id);

-- Índices: o tenant (FK e policy), o único master_admin por empresa e as FKs de rastro
create index profiles_tenant_id_papel_idx on public.profiles (tenant_id, papel);
create unique index profiles_tenant_id_master_admin_key
  on public.profiles (tenant_id)
  where papel = 'master_admin';
create index profiles_created_by_idx on public.profiles (created_by);
create index profiles_updated_by_idx on public.profiles (updated_by);
create index empresas_created_by_idx on public.empresas (created_by);

-- Funções de RLS. `security definer` (só no private): leem `profiles` e `empresas` como o dono,
-- sem passar pela RLS — senão a policy de `profiles` chamaria a si mesma. Partem sempre do
-- `auth.uid()`. Usuário inativo ou de empresa bloqueada fica sem tenant e sem papel: é o que zera
-- as linhas dele em toda tabela de tenant, mesmo com um JWT válido.
create function private.tenant_atual()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.tenant_id
  from public.profiles as p
  join public.empresas as e on e.id = p.tenant_id
  where p.id = (select auth.uid())
    and p.ativo
    and e.ativo
$$;

create function private.papel_atual()
returns public.papel_usuario
language sql
stable
security definer
set search_path = ''
as $$
  select p.papel
  from public.profiles as p
  left join public.empresas as e on e.id = p.tenant_id
  where p.id = (select auth.uid())
    and p.ativo
    and (p.tenant_id is null or e.ativo)
$$;

create function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select private.papel_atual()) = 'super_admin', false)
$$;

-- Triggers
create trigger trg_set_updated_at
before update on public.empresas
for each row execute function private.set_updated_at();

create trigger trg_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

-- RLS
alter table public.empresas enable row level security;
alter table public.profiles enable row level security;

-- Policies: só leitura, uma por escopo (supabase/CLAUDE.md §6); nenhuma de escrita
create policy empresas_select_tenant on public.empresas
for select to authenticated
using (id = (select private.tenant_atual()));

create policy empresas_select_super_admin on public.empresas
for select to authenticated
using ((select private.is_super_admin()));

create policy profiles_select_proprio on public.profiles
for select to authenticated
using (id = (select auth.uid()));

create policy profiles_select_tenant on public.profiles
for select to authenticated
using (tenant_id = (select private.tenant_atual()));

create policy profiles_select_super_admin on public.profiles
for select to authenticated
using ((select private.is_super_admin()) and papel = 'master_admin');

-- Grants. Os privilégios padrão do projeto dão tudo a anon, authenticated e service_role em toda
-- tabela nova de `public`: revoga-se tudo e concede-se o mínimo. O cliente só lê; a Edge Function
-- lê, insere e atualiza (nada de delete: cadastro se desativa)
revoke all on table public.empresas, public.profiles
  from public, anon, authenticated, service_role;
grant select on table public.empresas, public.profiles to authenticated;
grant select, insert, update on table public.empresas, public.profiles to service_role;

-- O private: `authenticated` usa o schema e executa só as funções de policy. Quem grava em
-- `empresas` executa o `cnpj_valido`, que o check chama no insert e em todo update
grant usage on schema private to authenticated;
revoke execute on function
  private.tenant_atual(), private.papel_atual(), private.is_super_admin()
  from public;
grant execute on function
  private.tenant_atual(), private.papel_atual(), private.is_super_admin()
  to authenticated;
grant execute on function private.cnpj_valido(text) to service_role;

-- Comentários
comment on type public.papel_usuario is
  'Papel do usuário: super_admin (dono do SaaS), master_admin (dono da empresa), admin (unidade gerencial), user (colaborador).';
comment on table public.empresas is
  'Empresas clientes: o tenant. O id é o tenant_id de todo o sistema. Escrita só por Edge Function.';
comment on column public.empresas.cnpj is
  'CNPJ numérico ou alfanumérico, sem máscara e em maiúsculas. Atributo de identidade, nunca chave de segurança.';
comment on table public.profiles is
  'Usuários do Maxis, um por auth.users. Escrita só por Edge Function, inclusive a troca da própria senha.';
comment on column public.profiles.senha_provisoria is
  'Verdadeiro até o usuário trocar a senha provisória; volta a verdadeiro em todo reset.';
comment on function private.tenant_atual() is
  'Empresa do usuário logado; nula se o usuário estiver inativo, a empresa bloqueada ou for super_admin.';
comment on function private.papel_atual() is
  'Papel do usuário logado; nulo se o usuário estiver inativo ou a empresa bloqueada.';
comment on function private.is_super_admin() is
  'Verdadeiro só para o super_admin ativo.';
