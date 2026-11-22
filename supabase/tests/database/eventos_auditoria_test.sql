-- Testes de `eventos_auditoria` (Fase 1, STEP 1.4): o rastro das ações privilegiadas
-- (docs/plans/modelo-dados.md §5.3):
--   - `super_admin` lê tudo; `master_admin` lê só os eventos do próprio tenant; `admin`, `user`,
--     inativo e empresa bloqueada não leem nada; `anon` não acessa;
--   - ninguém escreve pelo cliente;
--   - a Edge Function (`service_role`) só insere, sem escolher `id` nem `created_at`, e não lê;
--   - `update`, `delete` e `truncate` falham para todos, inclusive para o dono do banco;
--   - a ação segue o formato `dominio.evento`; o ator de um evento não sai do Auth.
-- O seed e a integração deixam eventos no dev (a auditoria imutável os prende): as asserções
-- olham só as fixtures deste teste, e onde a RLS deixa ver mais (o super_admin) a prova é de
-- inclusão, não de igualdade.
--
-- Roda no projeto de dev, pelo MCP e por `npx supabase test db --remote=<ref do dev>`, numa
-- transação desfeita no fim. Nunca em produção.
begin;

\ir ../helpers/ambiente.psql

insert into tap (linha) select plan(49);

-- Evento de teste, gravado como postgres (o dono da tabela). Só este arquivo grava eventos
create function pg_temp.criar_evento(acao_evento text, tenant uuid, ator uuid)
returns uuid
language plpgsql
as $$
declare
  id_novo uuid;
begin
  insert into public.eventos_auditoria (
    tenant_id, ator_profile_id, acao, alvo_tabela, alvo_id, detalhes
  )
  values (tenant, ator, acao_evento, 'profiles', ator, '{"origem": "teste"}')
  returning id into id_novo;
  return id_novo;
end;
$$;

-- Fixtures: A e B ativas, C bloqueada, D ativa com o master_admin inativo
insert into fixture select 'A', pg_temp.criar_empresa('TSTA0000000199');
insert into fixture select 'B', pg_temp.criar_empresa('TSTB0000000170');
insert into fixture select 'C', pg_temp.criar_empresa('TSTC0000000150', false);
insert into fixture select 'D', pg_temp.criar_empresa('TSTD0000000131');
insert into fixture select 'S', pg_temp.criar_usuario('super_admin', null);
insert into fixture select 'SI', pg_temp.criar_usuario('super_admin', null, false);
insert into fixture select 'MA', pg_temp.criar_usuario('master_admin', pg_temp.id('A'));
insert into fixture select 'AA', pg_temp.criar_usuario('admin', pg_temp.id('A'));
insert into fixture select 'UA', pg_temp.criar_usuario('user', pg_temp.id('A'));
insert into fixture select 'MB', pg_temp.criar_usuario('master_admin', pg_temp.id('B'));
insert into fixture select 'MC', pg_temp.criar_usuario('master_admin', pg_temp.id('C'));
insert into fixture select 'MD', pg_temp.criar_usuario('master_admin', pg_temp.id('D'), false);
-- Eventos: três em A (do master_admin, do super_admin e do admin), um em cada outra empresa e um
-- do SaaS, sem empresa e sem ator (o sistema)
insert into fixture
select 'EA_MA', pg_temp.criar_evento('usuario.criado', pg_temp.id('A'), pg_temp.id('MA'));
insert into fixture
select 'EA_S', pg_temp.criar_evento('usuario.criado', pg_temp.id('A'), pg_temp.id('S'));
insert into fixture
select 'EA_AA', pg_temp.criar_evento('usuario.senha_alterada', pg_temp.id('A'), pg_temp.id('AA'));
insert into fixture
select 'EB', pg_temp.criar_evento('usuario.criado', pg_temp.id('B'), pg_temp.id('MB'));
insert into fixture
select 'EC', pg_temp.criar_evento('usuario.criado', pg_temp.id('C'), pg_temp.id('MC'));
insert into fixture
select 'ED', pg_temp.criar_evento('usuario.criado', pg_temp.id('D'), pg_temp.id('MD'));
insert into fixture select 'ES', pg_temp.criar_evento('usuario.criado', null, null);

-- Estrutura
insert into tap (linha) select policies_are(
  'public', 'eventos_auditoria',
  array['eventos_auditoria_select_super_admin', 'eventos_auditoria_select_master_admin'],
  'eventos_auditoria tem só as duas policies de leitura'
);
insert into tap (linha) select trigger_is(
  'public', 'eventos_auditoria', 'trg_impedir_alteracao_auditoria',
  'private', 'impedir_alteracao_auditoria',
  'eventos_auditoria barra alteração por trigger'
);
insert into tap (linha) select ok(
  coalesce(
    (select not prosecdef and proconfig = array['search_path=""']
     from pg_catalog.pg_proc
     where oid = to_regprocedure('private.impedir_alteracao_auditoria()')),
    false
  ),
  'a função do trigger é security invoker e com search_path vazio'
);
insert into tap (linha) select ok(
  has_table_privilege('authenticated', 'public.eventos_auditoria', 'select')
    and not has_table_privilege(
      'authenticated', 'public.eventos_auditoria',
      'insert, update, delete, truncate, references, trigger, maintain'
    ),
  'authenticated só lê eventos_auditoria'
);
insert into tap (linha) select ok(
  not has_table_privilege(
    'service_role', 'public.eventos_auditoria',
    'select, insert, update, delete, truncate, references, trigger, maintain'
  )
    and (select bool_and(
           has_column_privilege('service_role', 'public.eventos_auditoria', coluna, 'insert')
         )
         from unnest(array[
           'tenant_id', 'ator_profile_id', 'acao', 'alvo_tabela', 'alvo_id', 'detalhes'
         ]) as coluna)
    and not has_any_column_privilege(
      'service_role', 'public.eventos_auditoria', 'select, update, references'
    )
    and not has_column_privilege('service_role', 'public.eventos_auditoria', 'id', 'insert')
    and not has_column_privilege('service_role', 'public.eventos_auditoria', 'created_at', 'insert'),
  'service_role só insere, e só as colunas do evento (id e created_at vêm do banco)'
);
insert into tap (linha) select has_index(
  'public', 'eventos_auditoria', 'eventos_auditoria_tenant_id_created_at_idx',
  array['tenant_id', 'created_at'], 'índice por empresa e data (policy e FK do tenant)'
);
insert into tap (linha) select has_index(
  'public', 'eventos_auditoria', 'eventos_auditoria_ator_profile_id_idx', 'ator_profile_id',
  'índice da FK do ator'
);
insert into tap (linha) select has_index(
  'public', 'eventos_auditoria', 'eventos_auditoria_alvo_tabela_alvo_id_idx',
  array['alvo_tabela', 'alvo_id'], 'índice do alvo'
);

-- Constraints (como postgres)
insert into tap (linha) select ok(
  (select id is not null and created_at is not null
   from public.eventos_auditoria where id = pg_temp.id('EA_MA')),
  'id e created_at vêm do banco'
);
insert into tap (linha) select ok(
  (select created_at from public.eventos_auditoria where id = pg_temp.id('ES'))
    > (select created_at from public.eventos_auditoria where id = pg_temp.id('EA_MA')),
  'eventos da mesma transação ficam em ordem (a data é a da gravação, não a do início)'
);
insert into tap (linha) select lives_ok(
  $$select pg_temp.criar_evento('unidade_gerencial.reativada', null, null)$$,
  'ação no formato dominio.evento, com sublinhado, é aceita'
);
insert into tap (linha) select throws_ok(
  $$select pg_temp.criar_evento('Usuario.criado', null, null)$$, '23514', null,
  'ação com maiúscula é recusada'
);
insert into tap (linha) select throws_ok(
  $$select pg_temp.criar_evento('usuario', null, null)$$, '23514', null,
  'ação sem o domínio é recusada'
);
insert into tap (linha) select throws_ok(
  $$select pg_temp.criar_evento('usuario.senha.alterada', null, null)$$, '23514', null,
  'ação com três segmentos é recusada'
);
insert into tap (linha) select throws_ok(
  $$select pg_temp.criar_evento('usuário.criado', null, null)$$, '23514', null,
  'ação com acento é recusada'
);
insert into tap (linha) select throws_ok(
  $$select pg_temp.criar_evento('usuario-criado.x', null, null)$$, '23514', null,
  'ação com hífen é recusada'
);
insert into tap (linha) select throws_ok(
  $$select pg_temp.criar_evento('perfil2.criado', null, null)$$, '23514', null,
  'ação com dígito é recusada'
);
insert into tap (linha) select throws_ok(
  $$select pg_temp.criar_evento('_._', null, null)$$, '23514', null,
  'ação só com sublinhados é recusada'
);
insert into tap (linha) select throws_ok(
  $$select pg_temp.criar_evento('_usuario.criado', null, null)$$, '23514', null,
  'segmento começando com sublinhado é recusado'
);
insert into tap (linha) select throws_ok(
  $$select pg_temp.criar_evento('usuario_.criado', null, null)$$, '23514', null,
  'segmento terminando com sublinhado é recusado'
);
insert into tap (linha) select throws_ok(
  $$select pg_temp.criar_evento('usuario.senha__alterada', null, null)$$, '23514', null,
  'sublinhado repetido é recusado'
);
insert into tap (linha) select throws_ok(
  $$select pg_temp.criar_evento(null, null, null)$$, '23502', null,
  'ação é obrigatória'
);
insert into tap (linha) select throws_ok(
  $$select pg_temp.criar_evento('usuario.criado', gen_random_uuid(), null)$$, '23503', null,
  'o tenant do evento existe em empresas'
);
insert into tap (linha) select throws_ok(
  $$select pg_temp.criar_evento('usuario.criado', null, gen_random_uuid())$$, '23503', null,
  'o ator do evento existe em profiles'
);
insert into tap (linha) select throws_ok(
  $$delete from auth.users where id = pg_temp.id('AA')$$, '23503', null,
  'o ator de um evento não sai do Auth (a auditoria o prende)'
);

-- Imutável inclusive para o dono do banco
insert into tap (linha) select throws_ok(
  $$update public.eventos_auditoria set detalhes = '{}' where id = pg_temp.id('EB')$$,
  '42501', 'eventos_auditoria é imutável: só aceita inserção',
  'o dono do banco não altera evento'
);
insert into tap (linha) select throws_ok(
  $$delete from public.eventos_auditoria where id = pg_temp.id('EB')$$,
  '42501', 'eventos_auditoria é imutável: só aceita inserção',
  'o dono do banco não exclui evento'
);
insert into tap (linha) select throws_ok(
  'truncate public.eventos_auditoria',
  '42501', 'eventos_auditoria é imutável: só aceita inserção',
  'o dono do banco não esvazia a tabela'
);
-- O trigger é por comando: barra até o que não acha linha
insert into tap (linha) select throws_ok(
  'update public.eventos_auditoria set detalhes = null where false',
  '42501', 'eventos_auditoria é imutável: só aceita inserção',
  'nem um update que não acha linha passa'
);
insert into tap (linha) select throws_ok(
  'delete from public.eventos_auditoria where false',
  '42501', 'eventos_auditoria é imutável: só aceita inserção',
  'nem um delete que não acha linha passa'
);

-- Nenhuma escrita pelo cliente, nem pelo master_admin
call pg_temp.autenticar_como(pg_temp.id('MA'));
insert into tap (linha) select throws_ok(
  $$insert into public.eventos_auditoria (tenant_id, acao)
    values (pg_temp.id('A'), 'usuario.criado')$$,
  '42501', null, 'o cliente não insere evento'
);
insert into tap (linha) select throws_ok(
  $$update public.eventos_auditoria set detalhes = '{}' where id = pg_temp.id('EA_MA')$$,
  '42501', null, 'o cliente não altera evento'
);
insert into tap (linha) select throws_ok(
  $$delete from public.eventos_auditoria where id = pg_temp.id('EA_MA')$$,
  '42501', null, 'o cliente não exclui evento'
);

-- Leitura pela RLS
insert into tap (linha) select set_eq(
  'select id from public.eventos_auditoria',
  array[pg_temp.id('EA_MA'), pg_temp.id('EA_S'), pg_temp.id('EA_AA')],
  'o master_admin de A lê todos os eventos de A, e só eles'
);
call pg_temp.autenticar_como(pg_temp.id('MB'));
insert into tap (linha) select set_eq(
  'select id from public.eventos_auditoria', array[pg_temp.id('EB')],
  'o master_admin de B lê só os eventos de B'
);
call pg_temp.autenticar_como(pg_temp.id('AA'));
insert into tap (linha) select is_empty(
  'select id from public.eventos_auditoria', 'o admin não lê evento (nem o próprio)'
);
call pg_temp.autenticar_como(pg_temp.id('UA'));
insert into tap (linha) select is_empty(
  'select id from public.eventos_auditoria', 'o user não lê evento'
);
call pg_temp.autenticar_como(pg_temp.id('MC'));
insert into tap (linha) select is_empty(
  'select id from public.eventos_auditoria', 'o master_admin de empresa bloqueada não lê evento'
);
call pg_temp.autenticar_como(pg_temp.id('MD'));
insert into tap (linha) select is_empty(
  'select id from public.eventos_auditoria', 'o master_admin inativo não lê evento'
);
call pg_temp.autenticar_como(pg_temp.id('S'));
insert into tap (linha) select set_has(
  'select id from public.eventos_auditoria',
  $$select id from pg_temp.fixture
    where nome in ('EA_MA', 'EA_S', 'EA_AA', 'EB', 'EC', 'ED', 'ES')$$,
  'o super_admin lê os eventos de todas as empresas e os do SaaS'
);
call pg_temp.autenticar_como(pg_temp.id('SI'));
insert into tap (linha) select is_empty(
  'select id from public.eventos_auditoria', 'o super_admin inativo não lê evento'
);
call pg_temp.acessar_como_anon();
insert into tap (linha) select throws_ok(
  'select id from public.eventos_auditoria', '42501', null, 'anon não lê evento'
);

-- A Edge Function (service_role): insere o evento, sem escolher id nem data, e não lê
call pg_temp.acessar_como_service_role();
insert into tap (linha) select lives_ok(
  $$insert into public.eventos_auditoria (
      tenant_id, ator_profile_id, acao, alvo_tabela, alvo_id, detalhes
    )
    values (
      pg_temp.id('B'), pg_temp.id('MB'), 'usuario.criado', 'profiles', pg_temp.id('MB'), '{}'
    )$$,
  'a Edge Function grava o evento'
);
insert into tap (linha) select throws_ok(
  $$insert into public.eventos_auditoria (acao, created_at)
    values ('usuario.criado', now() - interval '1 day')$$,
  '42501', null, 'a Edge Function não escolhe a data do evento'
);
insert into tap (linha) select throws_ok(
  $$insert into public.eventos_auditoria (id, acao) values (gen_random_uuid(), 'usuario.criado')$$,
  '42501', null, 'a Edge Function não escolhe o id do evento'
);
insert into tap (linha) select throws_ok(
  'select id from public.eventos_auditoria', '42501', null, 'a Edge Function não lê evento'
);
insert into tap (linha) select throws_ok(
  $$update public.eventos_auditoria set detalhes = '{}' where id = pg_temp.id('EB')$$,
  '42501', null, 'a Edge Function não altera evento'
);
insert into tap (linha) select throws_ok(
  $$delete from public.eventos_auditoria where id = pg_temp.id('EB')$$,
  '42501', null, 'a Edge Function não exclui evento'
);
insert into tap (linha) select throws_ok(
  'truncate public.eventos_auditoria', '42501', null, 'a Edge Function não esvazia a tabela'
);

call pg_temp.voltar_ao_postgres();
insert into tap (linha) select * from finish();
select linha from tap order by ordem;

rollback;
