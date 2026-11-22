-- Testes da RPC `obter_meu_acesso()` (Fase 1, STEP 1.5): o estado de acesso que os gates da
-- Fase 2 consultam (docs/plans/modelo-dados.md §3 e §4):
--   - devolve, só do próprio usuário (`auth.uid()`), `papel`, `nome`, `ativo`, `empresa_ativa`
--     (nula para o `super_admin`) e `senha_provisoria`, e nenhum outro campo;
--   - funciona para o usuário inativo e para o de empresa bloqueada, que não leem a própria
--     empresa pela RLS: é por isso que a leitura é `security definer`. Ela fica em
--     `private.acesso_atual()`, fora da API; a RPC exposta é `security invoker` e só a chama;
--   - o bloqueio tem efeito imediato (lookup, não claim do JWT);
--   - só `authenticated` executa: nem `anon` nem a Edge Function (`service_role`).
-- Cada caso compara o JSON que a API devolveria: um campo a mais ou a menos falha.
--
-- Roda no projeto de dev, pelo MCP e por `npx supabase test db --remote=<ref do dev>`, numa
-- transação desfeita no fim. Nunca em produção.
begin;

\ir ../helpers/ambiente.psql

insert into tap (linha) select plan(18);

-- Fixtures: A ativa e C bloqueada; em A, o master_admin, um user que já trocou a senha e um
-- inativo; em C, o master_admin e um user; dois super_admin, um inativo; e um JWT sem profile.
-- Cada usuário tem um nome próprio: a RPC que devolvesse a linha de outro falharia
insert into fixture select 'A', pg_temp.criar_empresa('TSTA0000000199');
insert into fixture select 'C', pg_temp.criar_empresa('TSTC0000000150', false);
insert into fixture select 'MA', pg_temp.criar_usuario('master_admin', pg_temp.id('A'));
insert into fixture select 'UA', pg_temp.criar_usuario('user', pg_temp.id('A'));
insert into fixture select 'IA', pg_temp.criar_usuario('user', pg_temp.id('A'), false);
insert into fixture select 'MC', pg_temp.criar_usuario('master_admin', pg_temp.id('C'));
insert into fixture select 'UC', pg_temp.criar_usuario('user', pg_temp.id('C'));
insert into fixture select 'S', pg_temp.criar_usuario('super_admin', null);
insert into fixture select 'SI', pg_temp.criar_usuario('super_admin', null, false);
insert into fixture values ('SEM_PROFILE', '00000000-0000-4000-8000-0000000000ff');

update public.profiles as p
set nome = n.nome
from (values
  ('MA', 'Master de A'), ('UA', 'User de A'), ('IA', 'Inativo de A'), ('MC', 'Master de C'),
  ('UC', 'User de C'), ('S', 'Super'), ('SI', 'Super inativo')
) as n (fixture, nome)
where p.id = pg_temp.id(n.fixture);
update public.profiles set senha_provisoria = false, senha_alterada_em = now()
where id = pg_temp.id('UA');

-- Estrutura: a RPC exposta não passa por cima da RLS; quem passa é a função do private
insert into tap (linha) select ok(
  coalesce(
    (select not prosecdef
       and provolatile = 's'
       and proconfig = array['search_path=""']
       and prorettype = to_regtype('public.acesso_usuario')
     from pg_catalog.pg_proc
     where oid = to_regprocedure('public.obter_meu_acesso()')),
    false
  ),
  'a RPC é security invoker, stable, com search_path vazio, e devolve acesso_usuario'
);
insert into tap (linha) select is(
  (select count(*)::integer
   from pg_catalog.pg_proc
   where proname = 'obter_meu_acesso' and pronamespace = 'public'::regnamespace),
  1,
  'a RPC não tem sobrecarga: não recebe argumento, não escolhe o usuário'
);
insert into tap (linha) select ok(
  coalesce(
    (select prosecdef
       and provolatile = 's'
       and proconfig = array['search_path=""']
       and prorettype = to_regtype('public.acesso_usuario')
     from pg_catalog.pg_proc
     where oid = to_regprocedure('private.acesso_atual()')),
    false
  ),
  'a leitura é security definer no private, stable, com search_path vazio'
);

-- Privilégios
insert into tap (linha) select ok(
  coalesce(
    has_function_privilege('authenticated', to_regprocedure('public.obter_meu_acesso()'), 'execute')
      and has_function_privilege(
        'authenticated', to_regprocedure('private.acesso_atual()'), 'execute'
      ),
    false
  ),
  'o usuário logado executa a RPC e a leitura do private'
);
insert into tap (linha) select ok(
  coalesce(
    not has_function_privilege('anon', to_regprocedure('public.obter_meu_acesso()'), 'execute')
      and not has_function_privilege(
        'service_role', to_regprocedure('public.obter_meu_acesso()'), 'execute'
      ),
    false
  ),
  'nem anon nem a Edge Function executam a RPC'
);
insert into tap (linha) select ok(
  coalesce(
    not has_function_privilege('anon', to_regprocedure('private.acesso_atual()'), 'execute')
      and not has_function_privilege(
        'service_role', to_regprocedure('private.acesso_atual()'), 'execute'
      ),
    false
  ),
  'nem anon nem a Edge Function executam a leitura do private'
);

-- Cada usuário recebe o próprio acesso, e só ele
call pg_temp.autenticar_como(pg_temp.id('MA'));
insert into tap (linha) select is(
  (select to_jsonb(a) from public.obter_meu_acesso() as a),
  jsonb_build_object(
    'papel', 'master_admin', 'nome', 'Master de A', 'ativo', true, 'empresa_ativa', true,
    'senha_provisoria', true
  ),
  'o master_admin de empresa ativa recebe o próprio acesso'
);
call pg_temp.autenticar_como(pg_temp.id('UA'));
insert into tap (linha) select is(
  (select to_jsonb(a) from public.obter_meu_acesso() as a),
  jsonb_build_object(
    'papel', 'user', 'nome', 'User de A', 'ativo', true, 'empresa_ativa', true,
    'senha_provisoria', false
  ),
  'o user que já trocou a senha recebe senha_provisoria falsa'
);
call pg_temp.autenticar_como(pg_temp.id('IA'));
insert into tap (linha) select is(
  (select to_jsonb(a) from public.obter_meu_acesso() as a),
  jsonb_build_object(
    'papel', 'user', 'nome', 'Inativo de A', 'ativo', false, 'empresa_ativa', true,
    'senha_provisoria', true
  ),
  'o usuário inativo sabe que está inativo'
);
call pg_temp.autenticar_como(pg_temp.id('UC'));
insert into tap (linha) select is(
  (select to_jsonb(a) from public.obter_meu_acesso() as a),
  jsonb_build_object(
    'papel', 'user', 'nome', 'User de C', 'ativo', true, 'empresa_ativa', false,
    'senha_provisoria', true
  ),
  'o user de empresa bloqueada sabe que a empresa está bloqueada'
);
insert into tap (linha) select is_empty(
  'select id from public.empresas',
  'e continua sem ler empresa alguma'
);
call pg_temp.autenticar_como(pg_temp.id('MC'));
insert into tap (linha) select is(
  (select to_jsonb(a) from public.obter_meu_acesso() as a),
  jsonb_build_object(
    'papel', 'master_admin', 'nome', 'Master de C', 'ativo', true, 'empresa_ativa', false,
    'senha_provisoria', true
  ),
  'o master_admin de empresa bloqueada sabe que a empresa está bloqueada'
);
call pg_temp.autenticar_como(pg_temp.id('S'));
insert into tap (linha) select is(
  (select to_jsonb(a) from public.obter_meu_acesso() as a),
  jsonb_build_object(
    'papel', 'super_admin', 'nome', 'Super', 'ativo', true, 'empresa_ativa', null,
    'senha_provisoria', true
  ),
  'o super_admin recebe empresa_ativa nula'
);
call pg_temp.autenticar_como(pg_temp.id('SI'));
insert into tap (linha) select is(
  (select to_jsonb(a) from public.obter_meu_acesso() as a),
  jsonb_build_object(
    'papel', 'super_admin', 'nome', 'Super inativo', 'ativo', false, 'empresa_ativa', null,
    'senha_provisoria', true
  ),
  'o super_admin inativo sabe que está inativo'
);
call pg_temp.autenticar_como(pg_temp.id('SEM_PROFILE'));
insert into tap (linha) select is(
  (select to_jsonb(a) from public.obter_meu_acesso() as a),
  jsonb_build_object(
    'papel', null, 'nome', null, 'ativo', null, 'empresa_ativa', null, 'senha_provisoria', null
  ),
  'o JWT sem profile recebe todos os campos nulos'
);

-- Efeito imediato: o bloqueio da empresa vale na chamada seguinte, com o mesmo JWT
call pg_temp.voltar_ao_postgres();
update public.empresas set ativo = false, bloqueada_em = now() where id = pg_temp.id('A');
call pg_temp.autenticar_como(pg_temp.id('MA'));
insert into tap (linha) select is(
  (select empresa_ativa from public.obter_meu_acesso()),
  false,
  'o bloqueio da empresa vale na chamada seguinte'
);

-- Quem não é usuário logado não executa
call pg_temp.acessar_como_anon();
insert into tap (linha) select throws_ok(
  'select public.obter_meu_acesso()',
  '42501',
  null,
  'anon não executa a RPC'
);
call pg_temp.acessar_como_service_role();
insert into tap (linha) select throws_ok(
  'select public.obter_meu_acesso()',
  '42501',
  null,
  'a Edge Function não executa a RPC'
);

insert into tap (linha) select * from finish();
select linha from tap order by ordem;

rollback;
