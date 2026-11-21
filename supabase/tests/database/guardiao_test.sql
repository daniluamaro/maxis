-- Teste guardião (Fase 0, STEP 0.10; regra 4 no STEP 1.1): regras de segurança que valem para
-- todo objeto, hoje e em qualquer fase (supabase/CLAUDE.md §5 e §6):
--   1. toda tabela de `public` tem RLS habilitada;
--   2. `anon` não alcança tabela, view, sequência nem função de `public` (o app exige login);
--   3. toda view de `public` tem `security_invoker` (sem ele, a view ignora a RLS);
--   4. no schema `private`, `anon` não alcança nada, e `authenticated` só executa as funções de
--      policy, listadas na regra (uma função nova nasce com `execute` para PUBLIC).
-- Passa com zero tabelas. Por isso cada regra também prova, mais abaixo, que acusa a violação e
-- não acusa o objeto conforme: sem essa prova, uma consulta errada passaria para sempre.
--
-- Roda no projeto de dev, pelo MCP e por `npx supabase test db --remote=<ref do dev>`, numa
-- transação desfeita no fim: o pgTAP e os objetos de prova não ficam no banco. Nunca em produção.
begin;

\ir ../helpers/ambiente.psql

insert into tap (linha) select plan(19);

-- Regra 1: tabelas (comuns e particionadas) de `public` sem RLS habilitada
create function pg_temp.tabelas_sem_rls() returns setof text
language sql stable
as $$
  select c.relname::text
  from pg_catalog.pg_class as c
  join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
    and not c.relrowsecurity
$$;

-- Regra 2: o que `anon` alcança em `public`, por grant direto ou herdado de PUBLIC
create function pg_temp.privilegios_de_anon() returns setof text
language sql stable
as $$
  select 'relação ' || c.relname
  from pg_catalog.pg_class as c
  join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p', 'v', 'm', 'f')
    and (
      pg_catalog.has_table_privilege(
        'anon', c.oid, 'select, insert, update, delete, truncate, references, trigger, maintain'
      )
      -- O grant numa coluna não aparece no privilégio da tabela
      or pg_catalog.has_any_column_privilege('anon', c.oid, 'select, insert, update, references')
    )
  union all
  select 'sequência ' || c.relname
  from pg_catalog.pg_class as c
  join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'S'
    -- O `where` não tem ordem garantida, e esta função falha em relação que não é sequência
    -- (o índice de outro schema chega até ela); o `case` garante a ordem
    and case
      when c.relkind = 'S'
        then pg_catalog.has_sequence_privilege('anon', c.oid, 'usage, select, update')
    end
  union all
  select 'função ' || p.proname
  from pg_catalog.pg_proc as p
  join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and pg_catalog.has_function_privilege('anon', p.oid, 'execute')
$$;

-- Regra 3: views de `public` sem `security_invoker`. A materialized view não aceita a opção e
-- ignora a RLS: em `public`, ela sempre aparece aqui.
create function pg_temp.views_sem_security_invoker() returns setof text
language sql stable
as $$
  select c.relname::text
  from pg_catalog.pg_class as c
  join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('v', 'm')
    and not exists (
      select 1
      from unnest(coalesce(c.reloptions, '{}')) as opcao
      where lower(opcao) in (
        'security_invoker=true', 'security_invoker=on', 'security_invoker=1', 'security_invoker=yes'
      )
    )
$$;

-- Regra 4: o que `anon` e `authenticated` alcançam no schema `private`. A lista das funções de
-- policy cresce com elas (STEP 1.2). O schema é localizado pelo catálogo: num banco sem ele, a
-- regra não acusa nada
create function pg_temp.alcance_no_private() returns setof text
language sql stable
as $$
  select 'usage do schema private para anon'
  from pg_catalog.pg_namespace as n
  where n.nspname = 'private'
    and pg_catalog.has_schema_privilege('anon', n.oid, 'usage')
  union all
  select 'função ' || p.proname || ' para ' || papel.nome
  from pg_catalog.pg_proc as p
  join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
  cross join (values ('anon'), ('authenticated')) as papel (nome)
  where n.nspname = 'private'
    and pg_catalog.has_function_privilege(papel.nome, p.oid, 'execute')
    -- Funções de policy, as únicas que `authenticated` executa
    and not (
      papel.nome = 'authenticated'
      and p.proname = any (array['tenant_atual', 'papel_atual', 'is_super_admin']::name[])
    )
$$;

-- O banco de verdade
insert into tap (linha) select is_empty(
  'select * from pg_temp.tabelas_sem_rls()',
  'toda tabela de public tem RLS habilitada'
);
insert into tap (linha) select is_empty(
  'select * from pg_temp.privilegios_de_anon()',
  'anon não tem privilégio em tabela, view, sequência ou função de public'
);
insert into tap (linha) select is_empty(
  'select * from pg_temp.views_sem_security_invoker()',
  'toda view de public tem security_invoker'
);
insert into tap (linha) select is_empty(
  'select * from pg_temp.alcance_no_private()',
  'anon não alcança o schema private, e authenticated só executa as funções de policy'
);

-- Prova de que cada regra acusa a violação. Os objetos somem no rollback; o estado de cada um é
-- explícito, sem depender dos padrões do projeto (RLS automática, grants padrão a anon).
create table public.guardiao_violacao (id integer);
alter table public.guardiao_violacao disable row level security;
grant select on public.guardiao_violacao to anon;
create sequence public.guardiao_violacao_seq;
grant usage on sequence public.guardiao_violacao_seq to anon;
create function public.guardiao_violacao_funcao() returns integer
language sql
as 'select 1';
grant execute on function public.guardiao_violacao_funcao() to anon;
create view public.guardiao_violacao_view as select id from public.guardiao_violacao;
create materialized view public.guardiao_violacao_mat as select 1 as id;
-- Grants que escapam ao privilégio da tabela: só numa coluna, e o MAINTAIN do PG 17 (VACUUM,
-- ANALYZE, LOCK), que o `grant all` padrão inclui
create table public.guardiao_violacao_coluna (id integer, nome text);
alter table public.guardiao_violacao_coluna enable row level security;
revoke all on public.guardiao_violacao_coluna from anon, public;
grant select (nome) on public.guardiao_violacao_coluna to anon;
create table public.guardiao_violacao_maintain (id integer);
alter table public.guardiao_violacao_maintain enable row level security;
revoke all on public.guardiao_violacao_maintain from anon, public;
grant maintain on public.guardiao_violacao_maintain to anon;

insert into tap (linha) select ok(
  'guardiao_violacao' in (select * from pg_temp.tabelas_sem_rls()),
  'acusa tabela sem RLS'
);
insert into tap (linha) select ok(
  'relação guardiao_violacao' in (select * from pg_temp.privilegios_de_anon()),
  'acusa tabela acessível a anon'
);
insert into tap (linha) select ok(
  'relação guardiao_violacao_coluna' in (select * from pg_temp.privilegios_de_anon()),
  'acusa coluna acessível a anon'
);
insert into tap (linha) select ok(
  'relação guardiao_violacao_maintain' in (select * from pg_temp.privilegios_de_anon()),
  'acusa MAINTAIN concedido a anon'
);
insert into tap (linha) select ok(
  'sequência guardiao_violacao_seq' in (select * from pg_temp.privilegios_de_anon()),
  'acusa sequência acessível a anon'
);
insert into tap (linha) select ok(
  'função guardiao_violacao_funcao' in (select * from pg_temp.privilegios_de_anon()),
  'acusa função executável por anon'
);
insert into tap (linha) select ok(
  'guardiao_violacao_view' in (select * from pg_temp.views_sem_security_invoker()),
  'acusa view sem security_invoker'
);
insert into tap (linha) select ok(
  'guardiao_violacao_mat' in (select * from pg_temp.views_sem_security_invoker()),
  'acusa materialized view em public'
);

-- Violações no schema `private`: a função que nasce sem `revoke` (execute para PUBLIC), a
-- função de fora da lista concedida a `authenticated` e o `usage` do schema concedido a `anon`
create function private.guardiao_violacao_publica() returns integer
language sql
as 'select 1';
create function private.guardiao_violacao_authenticated() returns integer
language sql
as 'select 1';
revoke execute on function private.guardiao_violacao_authenticated() from public;
grant execute on function private.guardiao_violacao_authenticated() to authenticated;
grant usage on schema private to anon;

insert into tap (linha) select ok(
  'função guardiao_violacao_publica para anon' in (select * from pg_temp.alcance_no_private()),
  'acusa função de private executável por anon (execute de PUBLIC)'
);
insert into tap (linha) select ok(
  'função guardiao_violacao_authenticated para authenticated'
    in (select * from pg_temp.alcance_no_private()),
  'acusa função de private fora da lista executável por authenticated'
);
insert into tap (linha) select ok(
  'usage do schema private para anon' in (select * from pg_temp.alcance_no_private()),
  'acusa usage do schema private concedido a anon'
);

-- E não acusa o objeto conforme (o que as migrations das próximas fases vão criar)
create table public.guardiao_conforme (id integer);
alter table public.guardiao_conforme enable row level security;
revoke all on public.guardiao_conforme from anon, public;
create view public.guardiao_conforme_view
with (security_invoker = true)
as select id from public.guardiao_conforme;
revoke all on public.guardiao_conforme_view from anon, public;
create sequence public.guardiao_conforme_seq;
revoke all on sequence public.guardiao_conforme_seq from anon, public;
create function public.guardiao_conforme_funcao() returns integer
language sql
as 'select 1';
revoke execute on function public.guardiao_conforme_funcao() from anon, public;

insert into tap (linha) select ok(
  'guardiao_conforme' not in (select * from pg_temp.tabelas_sem_rls()),
  'não acusa tabela com RLS'
);
insert into tap (linha) select ok(
  not exists (
    select 1 from pg_temp.privilegios_de_anon() as achado where achado like '%guardiao_conforme%'
  ),
  'não acusa o que anon não alcança'
);
insert into tap (linha) select ok(
  'guardiao_conforme_view' not in (select * from pg_temp.views_sem_security_invoker()),
  'não acusa view com security_invoker'
);

create function private.guardiao_conforme_privada() returns integer
language sql
as 'select 1';
revoke execute on function private.guardiao_conforme_privada() from public;

insert into tap (linha) select ok(
  not exists (
    select 1 from pg_temp.alcance_no_private() as achado where achado like '%guardiao_conforme%'
  ),
  'não acusa função de private com o execute revogado'
);

insert into tap (linha) select * from finish();
select linha from tap order by ordem;

rollback;
