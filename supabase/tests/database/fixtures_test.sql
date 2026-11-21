-- Testes dos helpers de fixture (Fase 1, STEP 1.2), definidos em
-- `supabase/tests/helpers/ambiente.psql`: os testes de RLS montam empresas e usuários com eles, e
-- um helper que criasse o dado errado (empresa ativa no lugar da bloqueada, usuário sem profile)
-- faria uma policy errada passar.
--
-- Roda no projeto de dev, pelo MCP e por `npx supabase test db --remote=<ref do dev>`, numa
-- transação desfeita no fim. Nunca em produção.
begin;

\ir ../helpers/ambiente.psql

insert into tap (linha) select plan(9);

insert into fixture select 'ativa', pg_temp.criar_empresa('TSTA0000000199');
insert into fixture select 'bloqueada', pg_temp.criar_empresa('TSTB0000000170', false);
insert into fixture select 'usuario', pg_temp.criar_usuario('user', pg_temp.id('ativa'));
insert into fixture select 'inativo', pg_temp.criar_usuario('user', pg_temp.id('ativa'), false);
insert into fixture select 'super', pg_temp.criar_usuario('super_admin', null);

insert into tap (linha) select ok(
  exists (
    select 1 from public.empresas
    where id = pg_temp.id('ativa') and cnpj = 'TSTA0000000199' and ativo and bloqueada_em is null
  ),
  'criar_empresa cria a empresa ativa com o CNPJ pedido'
);
insert into tap (linha) select ok(
  exists (
    select 1 from public.empresas
    where id = pg_temp.id('bloqueada') and not ativo and bloqueada_em is not null
  ),
  'criar_empresa(…, false) cria a empresa bloqueada'
);
insert into tap (linha) select ok(
  exists (select 1 from auth.users where id = pg_temp.id('usuario')),
  'criar_usuario cria o usuário no Auth'
);
insert into tap (linha) select ok(
  exists (
    select 1 from public.profiles
    where id = pg_temp.id('usuario') and papel = 'user' and tenant_id = pg_temp.id('ativa')
      and ativo
  ),
  'criar_usuario cria o profile com o papel, o tenant e ativo'
);
insert into tap (linha) select ok(
  (select p.email = u.email and p.email like '%@exemplo.test'
   from public.profiles as p join auth.users as u on u.id = p.id
   where p.id = pg_temp.id('usuario')),
  'criar_usuario usa o mesmo e-mail no Auth e no profile, em domínio reservado'
);
insert into tap (linha) select ok(
  (select not ativo from public.profiles where id = pg_temp.id('inativo')),
  'criar_usuario(…, false) cria o usuário inativo'
);
insert into tap (linha) select ok(
  (select papel = 'super_admin' and tenant_id is null
   from public.profiles where id = pg_temp.id('super')),
  'criar_usuario cria o super_admin sem tenant'
);
insert into tap (linha) select is(
  pg_temp.id('nao_existe'), null,
  'id de fixture inexistente devolve nulo'
);
insert into tap (linha) select is(
  (select count(*)::integer from pg_temp.fixture), 5,
  'cada fixture fica guardada uma vez, pelo nome'
);

insert into tap (linha) select * from finish();
select linha from tap order by ordem;

rollback;
