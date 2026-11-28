-- Testes da RPC `registrar_usuario_provisionado()` (Fase 1, STEP 1.9): a gravação do profile e do
-- evento `usuario.criado` que a Edge Function `provisionar-usuario` faz depois de criar o usuário
-- no Auth (docs/plans/modelo-dados.md §4, §5.2 e §5.3):
--   - grava os dois na mesma transação: se um falha, nenhum fica, e a função apaga o usuário do
--     Auth (compensação). Todo usuário provisionado tem rastro;
--   - o profile nasce ativo, com senha provisória e `created_by` = ator; o evento leva o tenant,
--     o ator, o alvo e só o papel nos detalhes;
--   - nenhum argumento é de senha: ela vai só ao Auth;
--   - não cria `super_admin` (decisão 3 da fase) nem grava sem ator;
--   - os conflitos saem com o nome da constraint, que a função traduz em 409;
--   - só a Edge Function (`service_role`) executa, e sem passar por cima dos grants.
--
-- Roda no projeto de dev, pelo MCP e por `npx supabase test db --remote=<ref do dev>`, numa
-- transação desfeita no fim. Nunca em produção.
begin;

\ir ../helpers/ambiente.psql

insert into tap (linha) select plan(21);

-- Fixtures: A com o master_admin, B ainda sem dono, um super_admin; e os usuários "recém-criados
-- no Auth", que ainda não têm profile (é o estado em que a função chama a RPC)
create function pg_temp.criar_usuario_no_auth() returns uuid
language plpgsql
as $$
declare
  id_novo uuid := pg_catalog.gen_random_uuid();
begin
  insert into auth.users (id, email) values (id_novo, 'teste-' || id_novo || '@exemplo.test');
  return id_novo;
end;
$$;

insert into fixture select 'A', pg_temp.criar_empresa('TSTA0000000199');
insert into fixture select 'B', pg_temp.criar_empresa('TSTB0000000170');
insert into fixture select 'MA', pg_temp.criar_usuario('master_admin', pg_temp.id('A'));
insert into fixture select 'S', pg_temp.criar_usuario('super_admin', null);
insert into fixture
select 'N' || n, pg_temp.criar_usuario_no_auth() from generate_series(1, 7) as n;

-- Os dados que a função manda, por usuário novo: o e-mail é o do Auth
create function pg_temp.email(nome_fixture text) returns text
language sql stable
as $$
  select 'teste-' || pg_temp.id(nome_fixture) || '@exemplo.test'
$$;

-- O profile e os eventos de um usuário, como o `postgres` lê
create function pg_temp.profile(nome_fixture text) returns jsonb
language sql stable
as $$
  select to_jsonb(p) - array['id', 'created_at', 'updated_at']
  from public.profiles as p
  where p.id = pg_temp.id(nome_fixture)
$$;

create function pg_temp.eventos(nome_fixture text) returns jsonb
language sql stable
as $$
  select coalesce(
    jsonb_agg(to_jsonb(e) - array['id', 'created_at'] order by e.created_at),
    '[]'::jsonb
  )
  from public.eventos_auditoria as e
  where e.alvo_id = pg_temp.id(nome_fixture)
$$;

-- A RPC pela assinatura exata: nula se não existir (o `coalesce` de cada asserção reprova), e uma
-- sobrecarga não muda o que ela aponta
create function pg_temp.rpc() returns regprocedure
language sql stable
as $$
  select to_regprocedure(
    'public.registrar_usuario_provisionado(uuid, uuid, public.papel_usuario, text, text, uuid, text)'
  )
$$;

-- Estrutura
insert into tap (linha) select ok(
  coalesce(
    (select not prosecdef
       and provolatile = 'v'
       and proconfig = array['search_path=""']
       and prorettype = 'void'::regtype
     from pg_catalog.pg_proc
     where oid = pg_temp.rpc()),
    false
  ),
  'a RPC é security invoker, volatile, com search_path vazio, e não devolve nada'
);
insert into tap (linha) select is(
  (select proargnames from pg_catalog.pg_proc where oid = pg_temp.rpc()),
  array['usuario_id', 'tenant_id', 'papel', 'nome', 'email', 'ator_profile_id', 'telefone'],
  'os argumentos são os dados do profile e o ator: nenhum de senha'
);
insert into tap (linha) select is(
  (select count(*)::integer
   from pg_catalog.pg_proc
   where proname = 'registrar_usuario_provisionado' and pronamespace = 'public'::regnamespace),
  1,
  'a RPC não tem sobrecarga (com outros argumentos, como uma senha)'
);

-- Privilégios
insert into tap (linha) select ok(
  coalesce(has_function_privilege('service_role', pg_temp.rpc(), 'execute'), false),
  'a Edge Function executa a RPC'
);
insert into tap (linha) select ok(
  coalesce(
    not has_function_privilege('anon', pg_temp.rpc(), 'execute')
      and not has_function_privilege('authenticated', pg_temp.rpc(), 'execute'),
    false
  ),
  'nem anon nem o usuário logado executam a RPC'
);

-- O master_admin de A cria um user, com telefone
call pg_temp.acessar_como_service_role();
insert into tap (linha) select lives_ok(
  format(
    $$select public.registrar_usuario_provisionado(
      usuario_id => %L, tenant_id => %L, papel => 'user', nome => 'Usuário novo', email => %L,
      ator_profile_id => %L, telefone => '5511987654321'
    )$$,
    pg_temp.id('N1'), pg_temp.id('A'), pg_temp.email('N1'), pg_temp.id('MA')
  ),
  'a Edge Function grava o user criado pelo master_admin'
);
call pg_temp.voltar_ao_postgres();
insert into tap (linha) select is(
  pg_temp.profile('N1'),
  jsonb_build_object(
    'tenant_id', pg_temp.id('A'), 'papel', 'user', 'nome', 'Usuário novo',
    'email', pg_temp.email('N1'), 'telefone', '5511987654321', 'ativo', true,
    'senha_provisoria', true, 'senha_alterada_em', null, 'created_by', pg_temp.id('MA'),
    'updated_by', null
  ),
  'o profile nasce ativo, com senha provisória e criado pelo ator'
);
insert into tap (linha) select is(
  pg_temp.eventos('N1'),
  jsonb_build_array(jsonb_build_object(
    'tenant_id', pg_temp.id('A'), 'ator_profile_id', pg_temp.id('MA'), 'acao', 'usuario.criado',
    'alvo_tabela', 'profiles', 'alvo_id', pg_temp.id('N1'), 'detalhes', '{"papel": "user"}'::jsonb
  )),
  'um evento usuario.criado, com o tenant, o ator, o alvo e só o papel nos detalhes'
);

-- O super_admin cria o master_admin de B, sem telefone
call pg_temp.acessar_como_service_role();
insert into tap (linha) select lives_ok(
  format(
    $$select public.registrar_usuario_provisionado(
      usuario_id => %L, tenant_id => %L, papel => 'master_admin', nome => 'Dono de B',
      email => %L, ator_profile_id => %L
    )$$,
    pg_temp.id('N2'), pg_temp.id('B'), pg_temp.email('N2'), pg_temp.id('S')
  ),
  'a Edge Function grava o master_admin criado pelo super_admin'
);
call pg_temp.voltar_ao_postgres();
insert into tap (linha) select is(
  pg_temp.profile('N2')
    - array['nome', 'email', 'ativo', 'senha_provisoria', 'senha_alterada_em', 'updated_by'],
  jsonb_build_object(
    'tenant_id', pg_temp.id('B'), 'papel', 'master_admin', 'telefone', null,
    'created_by', pg_temp.id('S')
  ),
  'o master_admin nasce na empresa pedida, sem telefone, criado pelo super_admin'
);
insert into tap (linha) select is(
  pg_temp.eventos('N2'),
  jsonb_build_array(jsonb_build_object(
    'tenant_id', pg_temp.id('B'), 'ator_profile_id', pg_temp.id('S'), 'acao', 'usuario.criado',
    'alvo_tabela', 'profiles', 'alvo_id', pg_temp.id('N2'),
    'detalhes', '{"papel": "master_admin"}'::jsonb
  )),
  'o evento do master_admin vai para o tenant de B, com o super_admin como ator'
);

-- Conflitos: saem com o nome da constraint, e nada fica
call pg_temp.acessar_como_service_role();
insert into tap (linha) select throws_ok(
  format(
    $$select public.registrar_usuario_provisionado(%L, %L, 'master_admin', 'Outro dono', %L, %L)$$,
    pg_temp.id('N3'), pg_temp.id('B'), pg_temp.email('N3'), pg_temp.id('S')
  ),
  '23505',
  'duplicate key value violates unique constraint "profiles_tenant_id_master_admin_key"',
  'o segundo master_admin da empresa é recusado pelo índice único'
);
insert into tap (linha) select throws_ok(
  format(
    $$select public.registrar_usuario_provisionado(%L, %L, 'user', 'Mesmo e-mail', %L, %L)$$,
    pg_temp.id('N4'), pg_temp.id('A'), pg_temp.email('N1'), pg_temp.id('MA')
  ),
  '23505',
  'duplicate key value violates unique constraint "profiles_email_key"',
  'o e-mail que já está num profile é recusado pela constraint única'
);
call pg_temp.voltar_ao_postgres();
insert into tap (linha) select ok(
  pg_temp.profile('N3') is null and pg_temp.profile('N4') is null
    and pg_temp.eventos('N3') = '[]' and pg_temp.eventos('N4') = '[]',
  'o conflito não deixa profile nem evento'
);

-- O provisionamento nunca cria super_admin, nem grava sem ator
call pg_temp.acessar_como_service_role();
insert into tap (linha) select throws_ok(
  format(
    $$select public.registrar_usuario_provisionado(%L, null, 'super_admin', 'Super', %L, %L)$$,
    pg_temp.id('N5'), pg_temp.email('N5'), pg_temp.id('S')
  ),
  '42501',
  'O provisionamento não cria super_admin.',
  'o super_admin é recusado, mesmo sem tenant (o que a constraint do profile aceitaria)'
);
insert into tap (linha) select throws_ok(
  format(
    $$select public.registrar_usuario_provisionado(%L, %L, 'user', 'Sem ator', %L, null)$$,
    pg_temp.id('N6'), pg_temp.id('A'), pg_temp.email('N6')
  ),
  '22004',
  'O provisionamento exige o ator.',
  'sem ator, nada é gravado: todo usuário provisionado tem quem o criou'
);
call pg_temp.voltar_ao_postgres();
insert into tap (linha) select ok(
  pg_temp.profile('N5') is null and pg_temp.profile('N6') is null
    and pg_temp.eventos('N5') = '[]' and pg_temp.eventos('N6') = '[]',
  'as recusas não deixam profile nem evento'
);

-- Atomicidade: sem permissão de gravar o evento, o profile também não fica
revoke insert on public.eventos_auditoria from service_role;
call pg_temp.acessar_como_service_role();
insert into tap (linha) select throws_ok(
  format(
    $$select public.registrar_usuario_provisionado(%L, %L, 'user', 'Sem rastro', %L, %L)$$,
    pg_temp.id('N7'), pg_temp.id('A'), pg_temp.email('N7'), pg_temp.id('MA')
  ),
  '42501',
  null,
  'a falha do evento derruba a chamada'
);
call pg_temp.voltar_ao_postgres();
insert into tap (linha) select ok(
  pg_temp.profile('N7') is null,
  'sem o evento, o profile não fica'
);

-- A RPC não passa por cima dos grants: sem o insert em profiles, nada é gravado
grant insert on public.eventos_auditoria to service_role;
revoke insert on public.profiles from service_role;
call pg_temp.acessar_como_service_role();
insert into tap (linha) select throws_ok(
  format(
    $$select public.registrar_usuario_provisionado(%L, %L, 'user', 'Sem grant', %L, %L)$$,
    pg_temp.id('N7'), pg_temp.id('A'), pg_temp.email('N7'), pg_temp.id('MA')
  ),
  '42501',
  null,
  'a RPC roda com os grants de quem chama'
);
call pg_temp.voltar_ao_postgres();
insert into tap (linha) select ok(
  pg_temp.profile('N7') is null and pg_temp.eventos('N7') = '[]',
  'e não deixa profile nem evento'
);

insert into tap (linha) select * from finish();
select linha from tap order by ordem;

rollback;
