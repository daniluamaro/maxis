-- Testes dos helpers de simulação de usuário (Fase 1, STEP 1.1), definidos em
-- `supabase/tests/helpers/ambiente.psql`. Os testes de RLS das próximas fases dependem deles: se
-- `autenticar_como` não trocar o papel e as claims, uma policy errada passaria sem ninguém ver.
--
-- Roda no projeto de dev, pelo MCP e por `npx supabase test db --remote=<ref do dev>`, numa
-- transação desfeita no fim. Nunca em produção.
begin;

\ir ../helpers/ambiente.psql

insert into tap (linha) select plan(9);

call pg_temp.autenticar_como('00000000-0000-4000-8000-000000000001');
insert into tap (linha) select is(
  current_user::text, 'authenticated',
  'autenticar_como assume o papel authenticated'
);
insert into tap (linha) select is(
  auth.uid(), '00000000-0000-4000-8000-000000000001'::uuid,
  'autenticar_como faz o auth.uid() devolver o usuário simulado'
);
insert into tap (linha) select is(
  auth.jwt() ->> 'role', 'authenticated',
  'autenticar_como põe o papel nas claims do JWT, como a Data API'
);

call pg_temp.autenticar_como('00000000-0000-4000-8000-000000000002');
insert into tap (linha) select is(
  auth.uid(), '00000000-0000-4000-8000-000000000002'::uuid,
  'autenticar_como troca de usuário sem passar pelo postgres'
);

call pg_temp.voltar_ao_postgres();
insert into tap (linha) select is(
  current_user::text, 'postgres',
  'voltar_ao_postgres devolve o papel postgres'
);
insert into tap (linha) select ok(
  auth.uid() is null,
  'voltar_ao_postgres limpa as claims do usuário simulado'
);

call pg_temp.acessar_como_anon();
insert into tap (linha) select is(
  current_user::text, 'anon',
  'acessar_como_anon assume o papel anon'
);
insert into tap (linha) select ok(
  auth.uid() is null,
  'acessar_como_anon não tem usuário'
);
insert into tap (linha) select is(
  auth.jwt() ->> 'role', 'anon',
  'acessar_como_anon põe o papel anon nas claims'
);

call pg_temp.voltar_ao_postgres();
insert into tap (linha) select * from finish();
select linha from tap order by ordem;

rollback;
