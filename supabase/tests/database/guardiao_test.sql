-- Teste guardião (Fase 0, STEP 0.10): regras de segurança que valem para todo objeto do schema
-- `public`, hoje e em qualquer fase (supabase/CLAUDE.md §5 e §6):
--   1. toda tabela tem RLS habilitada;
--   2. `anon` não alcança tabela, view, sequência nem função (o app inteiro exige login);
--   3. toda view tem `security_invoker` (sem ele, a view ignora a RLS).
-- Passa com zero tabelas. Por isso cada regra também prova, mais abaixo, que acusa a violação e
-- não acusa o objeto conforme: sem essa prova, uma consulta errada passaria para sempre.
--
-- Roda no projeto de dev, pelo MCP e por `npx supabase test db --remote=<ref do dev>`, numa
-- transação desfeita no fim: o pgTAP e os objetos de prova não ficam no banco. Nunca em produção.
begin;

-- O papel de login que o CLI cria para o `test db --remote` só ganha os privilégios do `postgres`
-- assumindo o papel; sem isso, nem enxerga o schema `extensions`, onde fica o pgTAP. Assim os dois
-- caminhos rodam como `postgres` (o MCP já roda), com o mesmo search_path dele
set local role postgres;
set local search_path = "$user", public, extensions;

-- pgTAP só durante o teste. O `test db` do CLI já o instala antes e o remove depois; pelo MCP,
-- quem instala é esta linha, e o rollback desfaz
create extension if not exists pgtap with schema extensions;

-- O MCP devolve só o resultado do último comando. Cada linha de TAP vai para esta tabela, e o
-- `select` do fim entrega a saída inteira, em ordem, aos dois caminhos (MCP e pg_prove)
create temporary table tap (ordem integer generated always as identity, linha text);

insert into tap (linha) select plan(12);

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
    and pg_catalog.has_table_privilege(
      'anon', c.oid, 'select, insert, update, delete, truncate, references, trigger'
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

insert into tap (linha) select ok(
  'guardiao_violacao' in (select * from pg_temp.tabelas_sem_rls()),
  'acusa tabela sem RLS'
);
insert into tap (linha) select ok(
  'relação guardiao_violacao' in (select * from pg_temp.privilegios_de_anon()),
  'acusa tabela acessível a anon'
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

-- E não acusa o objeto conforme (o que as migrations das próximas fases vão criar)
create table public.guardiao_conforme (id integer);
alter table public.guardiao_conforme enable row level security;
revoke all on public.guardiao_conforme from anon, public;
create view public.guardiao_conforme_view
with (security_invoker = true)
as select id from public.guardiao_conforme;
revoke all on public.guardiao_conforme_view from anon, public;
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

insert into tap (linha) select * from finish();
select linha from tap order by ordem;

rollback;
