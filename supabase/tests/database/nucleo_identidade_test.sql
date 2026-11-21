-- Testes do núcleo de identidade (Fase 1, STEP 1.2): `empresas`, `profiles` e as funções de RLS
-- (`private.tenant_atual`, `private.papel_atual`, `private.is_super_admin`). Cobre os casos
-- mínimos do supabase/CLAUDE.md §7 e o plano da fase:
--   - o usuário do tenant A só enxerga a própria empresa e os profiles de A;
--   - ninguém escreve pelo cliente (escrita só por Edge Function, papel `service_role`);
--   - usuário inativo e empresa bloqueada enxergam zero linhas, exceto o próprio profile;
--   - `anon` não acessa nada;
--   - `super_admin` enxerga todas as empresas e, dos profiles, só os `master_admin`;
--   - as constraints do modelo (docs/plans/modelo-dados.md §5.1 e §5.2).
-- O seed do dev convive no mesmo banco: as asserções olham só as fixtures deste teste, e onde a
-- RLS deixa ver mais (o super_admin) a prova é de inclusão, não de igualdade.
--
-- Roda no projeto de dev, pelo MCP e por `npx supabase test db --remote=<ref do dev>`, numa
-- transação desfeita no fim. Nunca em produção.
begin;

\ir ../helpers/ambiente.psql

insert into tap (linha) select plan(72);

-- Fixtures: A e B ativas, C bloqueada; usuários de cada papel, um inativo em A e um super_admin
-- inativo
insert into fixture select 'A', pg_temp.criar_empresa('TSTA0000000199');
insert into fixture select 'B', pg_temp.criar_empresa('TSTB0000000170');
insert into fixture select 'C', pg_temp.criar_empresa('TSTC0000000150', false);
insert into fixture select 'S', pg_temp.criar_usuario('super_admin', null);
insert into fixture select 'SI', pg_temp.criar_usuario('super_admin', null, false);
insert into fixture select 'MA', pg_temp.criar_usuario('master_admin', pg_temp.id('A'));
insert into fixture select 'AA', pg_temp.criar_usuario('admin', pg_temp.id('A'));
insert into fixture select 'UA', pg_temp.criar_usuario('user', pg_temp.id('A'));
insert into fixture select 'IA', pg_temp.criar_usuario('user', pg_temp.id('A'), false);
insert into fixture select 'MB', pg_temp.criar_usuario('master_admin', pg_temp.id('B'));
insert into fixture select 'UB', pg_temp.criar_usuario('user', pg_temp.id('B'));
insert into fixture select 'MC', pg_temp.criar_usuario('master_admin', pg_temp.id('C'));
insert into fixture select 'UC', pg_temp.criar_usuario('user', pg_temp.id('C'));
-- Usuário autenticado sem profile (o JWT vale, mas não há linha em profiles)
insert into fixture values ('SEM_PROFILE', '00000000-0000-4000-8000-0000000000ff');

-- Tipo
insert into tap (linha) select enum_has_labels(
  'public', 'papel_usuario', array['super_admin', 'master_admin', 'admin', 'user'],
  'papel_usuario tem os quatro papéis, nessa ordem'
);

-- Constraints (como postgres, o dono das tabelas)
insert into tap (linha) select throws_ok(
  $$select pg_temp.criar_usuario('user', null)$$, '23514', null,
  'profile que não é super_admin exige tenant'
);
insert into tap (linha) select throws_ok(
  $$select pg_temp.criar_usuario('super_admin', pg_temp.id('A'))$$, '23514', null,
  'super_admin não tem tenant'
);
insert into tap (linha) select throws_ok(
  $$select pg_temp.criar_usuario('master_admin', pg_temp.id('A'))$$, '23505', null,
  'um único master_admin por empresa'
);
insert into tap (linha) select lives_ok(
  $$insert into fixture select 'AA2', pg_temp.criar_usuario('admin', pg_temp.id('A'))$$,
  'a empresa aceita mais de um admin'
);
insert into tap (linha) select throws_ok(
  $$select pg_temp.criar_empresa('TSTH0000000166')$$, '23514', null,
  'CNPJ com dígito verificador errado é recusado'
);
insert into tap (linha) select throws_ok(
  $$select pg_temp.criar_empresa('TSTA0000000199')$$, '23505', null,
  'CNPJ repetido é recusado'
);
insert into tap (linha) select throws_ok(
  $$with u as (
      insert into auth.users (id, email)
      values (gen_random_uuid(), 'maiuscula-' || gen_random_uuid() || '@exemplo.test')
      returning id
    )
    insert into public.profiles (id, tenant_id, papel, nome, email)
    select id, pg_temp.id('A'), 'user', 'Teste', 'Maiuscula-' || id || '@exemplo.test' from u$$,
  '23514', null,
  'e-mail do profile só em minúsculas'
);
insert into tap (linha) select throws_ok(
  $$with u as (
      insert into auth.users (id, email)
      values (gen_random_uuid(), 'outro-' || gen_random_uuid() || '@exemplo.test')
      returning id
    )
    insert into public.profiles (id, tenant_id, papel, nome, email)
    select id, pg_temp.id('A'), 'user', 'Teste',
      (select email from public.profiles where id = pg_temp.id('UA'))
    from u$$,
  '23505', null,
  'e-mail repetido em profiles é recusado (mesmo com outro e-mail no Auth)'
);
insert into tap (linha) select throws_ok(
  $$insert into public.profiles (id, tenant_id, papel, nome, email)
    values (
      gen_random_uuid(), pg_temp.id('A'), 'user', 'Teste',
      'sem-auth-' || gen_random_uuid() || '@exemplo.test'
    )$$,
  '23503', null,
  'profile exige o usuário correspondente no Auth'
);
insert into tap (linha) select throws_ok(
  $$update public.profiles set telefone = '+5571999998888' where id = pg_temp.id('UA')$$,
  '23514', null,
  'telefone só com dígitos (E.164 sem o +)'
);
insert into tap (linha) select throws_ok(
  $$update public.profiles set telefone = '071999998888' where id = pg_temp.id('UA')$$,
  '23514', null,
  'telefone não começa por zero (E.164 começa pelo código do país)'
);
insert into tap (linha) select lives_ok(
  $$update public.profiles set telefone = '5571999998888' where id = pg_temp.id('UA')$$,
  'telefone E.164 sem o + é aceito'
);
insert into tap (linha) select throws_ok(
  $$update public.empresas set ativo = false where id = pg_temp.id('A')$$,
  '23514', null,
  'empresa bloqueada exige bloqueada_em'
);
insert into tap (linha) select throws_ok(
  $$update public.empresas set bloqueada_em = now() where id = pg_temp.id('A')$$,
  '23514', null,
  'empresa ativa não tem bloqueada_em'
);
insert into tap (linha) select throws_ok(
  $$delete from public.empresas where id = pg_temp.id('A')$$,
  '23503', null,
  'empresa com profiles não é excluída (on delete restrict)'
);
insert into tap (linha) select throws_ok(
  $$update public.empresas set motivo_bloqueio = 'Teste' where id = pg_temp.id('A')$$,
  '23514', null,
  'empresa ativa não guarda motivo de bloqueio (o tenant lê a própria empresa)'
);
insert into tap (linha) select lives_ok(
  $$update public.empresas set motivo_bloqueio = 'Teste' where id = pg_temp.id('C')$$,
  'empresa bloqueada aceita o motivo (o tenant dela não lê nada)'
);
insert into tap (linha) select throws_ok(
  $$update public.empresas set ativo = true, bloqueada_em = null where id = pg_temp.id('C')$$,
  '23514', null,
  'desbloquear sem limpar o motivo é recusado'
);
-- Exclusão no Auth: o usuário que já cadastrou algo fica (as FKs de rastro o prendem; cadastro
-- se desativa); o recém-criado, sem nada, sai em cascata (a compensação do provisionamento)
update public.empresas set created_by = pg_temp.id('S') where id = pg_temp.id('A');
insert into fixture select 'DESCARTAVEL', pg_temp.criar_usuario('user', pg_temp.id('B'));
insert into tap (linha) select throws_ok(
  $$delete from auth.users where id = pg_temp.id('S')$$,
  '23503', null,
  'usuário que cadastrou algo não sai do Auth (desativa-se)'
);
insert into tap (linha) select lives_ok(
  $$delete from auth.users where id = pg_temp.id('DESCARTAVEL')$$,
  'usuário recém-criado sai do Auth, e o profile vai junto (compensação)'
);

-- Privilégios e funções de RLS (como postgres)
insert into tap (linha) select ok(
  has_schema_privilege('authenticated', 'private', 'usage'),
  'authenticated usa o schema private (as funções de policy)'
);
insert into tap (linha) select ok(
  has_function_privilege('authenticated', 'private.tenant_atual()', 'execute')
    and has_function_privilege('authenticated', 'private.papel_atual()', 'execute')
    and has_function_privilege('authenticated', 'private.is_super_admin()', 'execute'),
  'authenticated executa as três funções de policy'
);
insert into tap (linha) select ok(
  (select bool_and(prosecdef and provolatile = 's' and proconfig = array['search_path=""'])
   from pg_catalog.pg_proc
   where oid in (
     'private.tenant_atual()'::regprocedure, 'private.papel_atual()'::regprocedure,
     'private.is_super_admin()'::regprocedure
   )),
  'as funções de policy são security definer, stable e com search_path vazio'
);
insert into tap (linha) select ok(
  not has_table_privilege(
    'authenticated', 'public.empresas',
    'insert, update, delete, truncate, references, trigger, maintain'
  )
    and not has_table_privilege(
      'authenticated', 'public.profiles',
      'insert, update, delete, truncate, references, trigger, maintain'
    ),
  'authenticated não tem privilégio de escrita em empresas nem em profiles'
);
insert into tap (linha) select ok(
  not has_table_privilege(
    'service_role', 'public.empresas', 'delete, truncate, references, trigger, maintain'
  )
    and not has_table_privilege(
      'service_role', 'public.profiles', 'delete, truncate, references, trigger, maintain'
    ),
  'service_role só lê, insere e atualiza (sem delete nem truncate)'
);
insert into tap (linha) select trigger_is(
  'public', 'empresas', 'trg_set_updated_at', 'private', 'set_updated_at',
  'empresas mantém updated_at por trigger'
);
insert into tap (linha) select trigger_is(
  'public', 'profiles', 'trg_set_updated_at', 'private', 'set_updated_at',
  'profiles mantém updated_at por trigger'
);

-- Usuário ativo de empresa ativa (UA, em A)
call pg_temp.autenticar_como(pg_temp.id('UA'));
insert into tap (linha) select is(
  private.tenant_atual(), pg_temp.id('A'), 'tenant_atual devolve a empresa do usuário'
);
insert into tap (linha) select is(
  private.papel_atual(), 'user'::public.papel_usuario, 'papel_atual devolve o papel do usuário'
);
insert into tap (linha) select is(
  private.is_super_admin(), false, 'is_super_admin é falso para o user'
);
insert into tap (linha) select set_eq(
  'select id from public.empresas', array[pg_temp.id('A')],
  'o user de A só enxerga a própria empresa'
);
insert into tap (linha) select set_eq(
  'select id from public.profiles',
  array[
    pg_temp.id('MA'), pg_temp.id('AA'), pg_temp.id('AA2'), pg_temp.id('UA'), pg_temp.id('IA')
  ],
  'o user de A enxerga os profiles de A (inclusive o inativo) e nenhum outro'
);
insert into tap (linha) select throws_ok(
  $$update public.profiles set senha_provisoria = false where id = pg_temp.id('UA')$$,
  '42501', null,
  'o usuário não altera o próprio profile (nem a senha provisória)'
);

-- master_admin de A: a RLS é por tenant, igual para qualquer papel
call pg_temp.autenticar_como(pg_temp.id('MA'));
insert into tap (linha) select set_eq(
  'select id from public.empresas', array[pg_temp.id('A')],
  'o master_admin de A só enxerga a própria empresa'
);
insert into tap (linha) select ok(
  not exists (
    select 1 from public.profiles where tenant_id is distinct from pg_temp.id('A')
  ),
  'o master_admin de A não enxerga profile de outro tenant nem super_admin'
);

-- Usuário de B
call pg_temp.autenticar_como(pg_temp.id('UB'));
insert into tap (linha) select set_eq(
  'select id from public.empresas', array[pg_temp.id('B')],
  'o user de B só enxerga a própria empresa'
);
insert into tap (linha) select set_eq(
  'select id from public.profiles', array[pg_temp.id('MB'), pg_temp.id('UB')],
  'o user de B só enxerga os profiles de B'
);

-- Usuário inativo (IA, em A): zero linhas, exceto o próprio profile
call pg_temp.autenticar_como(pg_temp.id('IA'));
insert into tap (linha) select is(
  private.tenant_atual(), null, 'tenant_atual é nulo para o usuário inativo'
);
insert into tap (linha) select is(
  private.papel_atual(), null, 'papel_atual é nulo para o usuário inativo'
);
insert into tap (linha) select is_empty(
  'select id from public.empresas', 'o usuário inativo não enxerga empresa'
);
insert into tap (linha) select set_eq(
  'select id from public.profiles', array[pg_temp.id('IA')],
  'o usuário inativo só enxerga o próprio profile'
);

-- Usuário de empresa bloqueada (UC, em C): zero linhas, exceto o próprio profile
call pg_temp.autenticar_como(pg_temp.id('UC'));
insert into tap (linha) select is(
  private.tenant_atual(), null, 'tenant_atual é nulo para empresa bloqueada'
);
insert into tap (linha) select is(
  private.papel_atual(), null, 'papel_atual é nulo para empresa bloqueada'
);
insert into tap (linha) select is_empty(
  'select id from public.empresas', 'o usuário de empresa bloqueada não enxerga empresa'
);
insert into tap (linha) select set_eq(
  'select id from public.profiles', array[pg_temp.id('UC')],
  'o usuário de empresa bloqueada só enxerga o próprio profile'
);
call pg_temp.autenticar_como(pg_temp.id('MC'));
insert into tap (linha) select set_eq(
  'select id from public.profiles', array[pg_temp.id('MC')],
  'o master_admin de empresa bloqueada também só enxerga o próprio profile'
);

-- super_admin ativo (S): todas as empresas; dos profiles, só os master_admin (e o próprio)
call pg_temp.autenticar_como(pg_temp.id('S'));
insert into tap (linha) select is(
  private.tenant_atual(), null, 'tenant_atual é nulo para o super_admin'
);
insert into tap (linha) select is(
  private.papel_atual(), 'super_admin'::public.papel_usuario,
  'papel_atual devolve super_admin'
);
insert into tap (linha) select is(
  private.is_super_admin(), true, 'is_super_admin é verdadeiro para o super_admin ativo'
);
insert into tap (linha) select set_has(
  'select id from public.empresas',
  $$select id from pg_temp.fixture where nome in ('A', 'B', 'C')$$,
  'o super_admin enxerga todas as empresas, inclusive a bloqueada'
);
insert into tap (linha) select set_has(
  'select id from public.profiles',
  $$select id from pg_temp.fixture where nome in ('S', 'MA', 'MB', 'MC')$$,
  'o super_admin enxerga o próprio profile e os master_admin'
);
insert into tap (linha) select ok(
  not exists (
    select 1 from public.profiles
    where papel <> 'master_admin' and id <> pg_temp.id('S')
  ),
  'o super_admin não enxerga admin, user nem outro super_admin'
);

-- Nenhuma escrita pelo cliente, nem pelo super_admin
insert into tap (linha) select throws_ok(
  $$insert into public.empresas (razao_social, cnpj) values ('Teste', 'TSTH0000000165')$$,
  '42501', null, 'o cliente não insere empresa'
);
insert into tap (linha) select throws_ok(
  $$update public.empresas set nome_fantasia = 'Teste' where id = pg_temp.id('A')$$,
  '42501', null, 'o cliente não altera empresa'
);
insert into tap (linha) select throws_ok(
  $$delete from public.empresas where id = pg_temp.id('C')$$,
  '42501', null, 'o cliente não exclui empresa'
);
insert into tap (linha) select throws_ok(
  $$insert into public.profiles (id, papel, nome, email)
    values (
      gen_random_uuid(), 'super_admin', 'Teste', 'cliente-' || gen_random_uuid() || '@exemplo.test'
    )$$,
  '42501', null, 'o cliente não insere profile'
);
insert into tap (linha) select throws_ok(
  $$update public.profiles set papel = 'user' where id = pg_temp.id('MA')$$,
  '42501', null, 'o cliente não altera profile'
);
insert into tap (linha) select throws_ok(
  $$delete from public.profiles where id = pg_temp.id('UB')$$,
  '42501', null, 'o cliente não exclui profile'
);

-- super_admin inativo (SI): perde tudo, menos o próprio profile
call pg_temp.autenticar_como(pg_temp.id('SI'));
insert into tap (linha) select is(
  private.is_super_admin(), false, 'is_super_admin é falso para o super_admin inativo'
);
insert into tap (linha) select is(
  private.papel_atual(), null, 'papel_atual é nulo para o super_admin inativo'
);
insert into tap (linha) select is_empty(
  'select id from public.empresas', 'o super_admin inativo não enxerga empresa'
);
insert into tap (linha) select set_eq(
  'select id from public.profiles', array[pg_temp.id('SI')],
  'o super_admin inativo só enxerga o próprio profile'
);

-- JWT válido sem profile
call pg_temp.autenticar_como(pg_temp.id('SEM_PROFILE'));
insert into tap (linha) select ok(
  private.tenant_atual() is null and private.papel_atual() is null
    and not private.is_super_admin(),
  'sem profile, as funções de policy não devolvem tenant nem papel'
);
insert into tap (linha) select is_empty(
  'select id from public.empresas union all select id from public.profiles',
  'sem profile, nada é visível'
);

-- anon: nem o grant das tabelas, nem o schema private
call pg_temp.acessar_como_anon();
insert into tap (linha) select throws_ok(
  'select id from public.empresas', '42501', null, 'anon não lê empresas'
);
insert into tap (linha) select throws_ok(
  'select id from public.profiles', '42501', null, 'anon não lê profiles'
);
insert into tap (linha) select throws_ok(
  'select private.tenant_atual()', '42501', null, 'anon não chega às funções de policy'
);

-- service_role (Edge Functions): insere e atualiza; o check do CNPJ executa por ele
call pg_temp.voltar_ao_postgres();
insert into fixture values ('AUTH_SERVICO', gen_random_uuid());
insert into auth.users (id, email)
values (pg_temp.id('AUTH_SERVICO'), 'servico-' || pg_temp.id('AUTH_SERVICO') || '@exemplo.test');
call pg_temp.acessar_como_service_role();
insert into tap (linha) select lives_ok(
  $$insert into public.empresas (razao_social, cnpj) values ('Teste', 'TSTD0000000131')$$,
  'service_role insere empresa (o check do CNPJ roda com o privilégio dele)'
);
insert into tap (linha) select lives_ok(
  $$update public.empresas set nome_fantasia = 'Teste' where cnpj = 'TSTD0000000131'$$,
  'service_role atualiza empresa (o check roda de novo no update)'
);
insert into tap (linha) select lives_ok(
  $$insert into public.profiles (id, tenant_id, papel, nome, email)
    values (
      pg_temp.id('AUTH_SERVICO'), pg_temp.id('B'), 'admin', 'Teste',
      'servico-' || pg_temp.id('AUTH_SERVICO') || '@exemplo.test'
    )$$,
  'service_role insere profile'
);
insert into tap (linha) select throws_ok(
  $$delete from public.empresas where cnpj = 'TSTD0000000131'$$,
  '42501', null, 'service_role não exclui empresa'
);

call pg_temp.voltar_ao_postgres();
insert into tap (linha) select * from finish();
select linha from tap order by ordem;

rollback;
