-- Testes da imutabilidade do master_admin (Fase 1, STEP 1.3): o dono da empresa não é rebaixado,
-- movido nem desativado por engano (docs/plans/modelo-dados.md §5.2):
--   - alterar `papel`, `tenant_id` ou `ativo` de um master_admin falha, para a Edge Function
--     (`service_role`) e para o dono do banco (`postgres`: seed, manutenção);
--   - um update que não muda esses campos passa (troca de senha, dados de contato, o seed
--     reaplicado com os mesmos valores);
--   - os outros papéis não são afetados;
--   - o caminho privilegiado continua possível: `private.autorizar_alteracao_master_admin()`, só
--     do dono do banco, libera a alteração na transação em que é chamado, e em nenhuma outra.
-- O cliente (`authenticated`) já não altera profile algum (sem grant de escrita, STEP 1.2).
--
-- Roda no projeto de dev, pelo MCP e por `npx supabase test db --remote=<ref do dev>`, numa
-- transação desfeita no fim. Nunca em produção.
begin;

\ir ../helpers/ambiente.psql

insert into tap (linha) select plan(22);

-- Fixtures: A com o master_admin, um admin e um user; B sem master_admin, para que mover o de A
-- só possa falhar pela proteção (e não pelo único master_admin por empresa)
insert into fixture select 'A', pg_temp.criar_empresa('TSTA0000000199');
insert into fixture select 'B', pg_temp.criar_empresa('TSTB0000000170');
insert into fixture select 'MA', pg_temp.criar_usuario('master_admin', pg_temp.id('A'));
insert into fixture select 'AA', pg_temp.criar_usuario('admin', pg_temp.id('A'));
insert into fixture select 'UA', pg_temp.criar_usuario('user', pg_temp.id('A'));

-- Estrutura
insert into tap (linha) select trigger_is(
  'public', 'profiles', 'trg_proteger_master_admin', 'private', 'proteger_master_admin',
  'profiles protege o master_admin por trigger'
);
insert into tap (linha) select ok(
  (select count(*) = 2
     and bool_and(not prosecdef and proconfig = array['search_path=""'])
   from pg_catalog.pg_proc
   where oid in (
     to_regprocedure('private.proteger_master_admin()'),
     to_regprocedure('private.autorizar_alteracao_master_admin()')
   )),
  'a proteção e a autorização são security invoker e com search_path vazio'
);
insert into tap (linha) select ok(
  coalesce(
    not has_function_privilege(
      'anon', to_regprocedure('private.autorizar_alteracao_master_admin()'), 'execute'
    )
      and not has_function_privilege(
        'authenticated', to_regprocedure('private.autorizar_alteracao_master_admin()'), 'execute'
      )
      and not has_function_privilege(
        'service_role', to_regprocedure('private.autorizar_alteracao_master_admin()'), 'execute'
      ),
    false
  ),
  'só o dono do banco autoriza: nem o cliente nem a Edge Function executam a autorização'
);

-- A Edge Function (service_role) não altera o master_admin
call pg_temp.acessar_como_service_role();
insert into tap (linha) select throws_ok(
  $$update public.profiles set papel = 'admin' where id = pg_temp.id('MA')$$,
  '42501',
  'master_admin imutável: papel, tenant_id e ativo só mudam pela operação privilegiada',
  'a Edge Function não rebaixa o master_admin'
);
insert into tap (linha) select throws_ok(
  $$update public.profiles set tenant_id = pg_temp.id('B') where id = pg_temp.id('MA')$$,
  '42501',
  'master_admin imutável: papel, tenant_id e ativo só mudam pela operação privilegiada',
  'a Edge Function não move o master_admin para outra empresa'
);
insert into tap (linha) select throws_ok(
  $$update public.profiles set ativo = false where id = pg_temp.id('MA')$$,
  '42501',
  'master_admin imutável: papel, tenant_id e ativo só mudam pela operação privilegiada',
  'a Edge Function não desativa o master_admin'
);
insert into tap (linha) select throws_ok(
  $$update public.profiles set papel = 'super_admin', tenant_id = null
    where id = pg_temp.id('MA')$$,
  '42501',
  'master_admin imutável: papel, tenant_id e ativo só mudam pela operação privilegiada',
  'a Edge Function não tira o master_admin da empresa (nem como super_admin)'
);

-- O que não muda papel, tenant nem ativo passa: a troca de senha (STEP 1.10), os dados de
-- contato e os três campos regravados com os mesmos valores
insert into tap (linha) select lives_ok(
  $$update public.profiles
    set nome = 'Master renomeado', telefone = '5571999998888', senha_provisoria = false,
      senha_alterada_em = now()
    where id = pg_temp.id('MA')$$,
  'a Edge Function troca a senha e os dados de contato do master_admin'
);
insert into tap (linha) select ok(
  (select nome = 'Master renomeado' and not senha_provisoria
   from public.profiles where id = pg_temp.id('MA')),
  'a alteração permitida é gravada'
);
insert into tap (linha) select lives_ok(
  $$update public.profiles set papel = 'master_admin', tenant_id = pg_temp.id('A'), ativo = true
    where id = pg_temp.id('MA')$$,
  'a Edge Function regrava papel, tenant e ativo com os mesmos valores'
);

-- Os outros papéis não são afetados
insert into tap (linha) select lives_ok(
  $$update public.profiles set papel = 'user' where id = pg_temp.id('AA')$$,
  'o admin muda de papel'
);
insert into tap (linha) select lives_ok(
  $$update public.profiles set tenant_id = pg_temp.id('B') where id = pg_temp.id('UA')$$,
  'o user muda de empresa'
);
insert into tap (linha) select lives_ok(
  $$update public.profiles set ativo = false where id = pg_temp.id('UA')$$,
  'o user é desativado'
);

-- O dono do banco (seed, manutenção) também não altera por engano
call pg_temp.voltar_ao_postgres();
insert into tap (linha) select throws_ok(
  $$update public.profiles set ativo = false where id = pg_temp.id('MA')$$,
  '42501',
  'master_admin imutável: papel, tenant_id e ativo só mudam pela operação privilegiada',
  'o dono do banco não desativa o master_admin sem a autorização'
);
-- O seed reaplicado (STEP 1.7): insere ou atualiza, com os mesmos valores
insert into tap (linha) select lives_ok(
  $$insert into public.profiles (id, tenant_id, papel, nome, email, ativo)
    select id, tenant_id, papel, 'Master do seed', email, ativo
    from public.profiles where id = pg_temp.id('MA')
    on conflict (id) do update
      set tenant_id = excluded.tenant_id, papel = excluded.papel, nome = excluded.nome,
        ativo = excluded.ativo$$,
  'o seed reaplicado com os mesmos valores passa'
);

-- A autorização não se falsifica com um valor qualquer: vale o id da transação corrente
do $$ begin perform pg_catalog.set_config('maxis.alteracao_master_admin', 'on', true); end $$;
insert into tap (linha) select throws_ok(
  $$update public.profiles set ativo = false where id = pg_temp.id('MA')$$,
  '42501',
  'master_admin imutável: papel, tenant_id e ativo só mudam pela operação privilegiada',
  'a marca com um valor qualquer não autoriza'
);
do $$ begin perform pg_catalog.set_config('maxis.alteracao_master_admin', '1', true); end $$;
insert into tap (linha) select throws_ok(
  $$update public.profiles set ativo = false where id = pg_temp.id('MA')$$,
  '42501',
  'master_admin imutável: papel, tenant_id e ativo só mudam pela operação privilegiada',
  'a marca de outra transação não autoriza (nem se vazar numa conexão reaproveitada)'
);
do $$ begin perform pg_catalog.set_config('maxis.alteracao_master_admin', '', true); end $$;

-- O caminho privilegiado: o dono do banco autoriza e altera, na mesma transação
insert into tap (linha) select lives_ok(
  'call private.autorizar_alteracao_master_admin()',
  'o dono do banco autoriza a alteração do master_admin'
);
insert into tap (linha) select is(
  current_setting('maxis.alteracao_master_admin', true), pg_current_xact_id()::text,
  'a autorização vale só para a transação corrente'
);
insert into tap (linha) select lives_ok(
  $$update public.profiles set ativo = false where id = pg_temp.id('MA')$$,
  'com a autorização, o master_admin é desativado'
);
insert into tap (linha) select lives_ok(
  $$update public.profiles set tenant_id = pg_temp.id('B') where id = pg_temp.id('MA')$$,
  'com a autorização, o master_admin é movido'
);
insert into tap (linha) select ok(
  (select not ativo and tenant_id = pg_temp.id('B')
   from public.profiles where id = pg_temp.id('MA')),
  'as alterações autorizadas são gravadas'
);

insert into tap (linha) select * from finish();
select linha from tap order by ordem;

rollback;
