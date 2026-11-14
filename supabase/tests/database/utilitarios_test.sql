-- Testes do schema `private` e dos utilitários das tabelas (Fase 1, STEP 1.1):
--   - `private.cnpj_valido(text)`: CNPJ numérico e alfanumérico (Receita, a partir de jul/2026):
--     12 caracteres [0-9A-Z] + 2 dígitos verificadores, sem máscara, em maiúsculas. Os casos
--     válidos e os de formato vieram de um cálculo independente da regra oficial (valor do
--     caractere = código ASCII − 48, módulo 11), que reproduz o exemplo da Receita
--     (12ABC34501DE35);
--   - `private.set_updated_at()`: trigger de `updated_at`.
-- Nenhum dos dois é executável por `anon` ou `authenticated`: não são funções de policy.
--
-- Roda no projeto de dev, pelo MCP e por `npx supabase test db --remote=<ref do dev>`, numa
-- transação desfeita no fim. Nunca em produção.
begin;

\ir ../helpers/ambiente.psql

insert into tap (linha) select plan(42);

-- Schema privado
insert into tap (linha) select has_schema('private', 'o schema private existe');
insert into tap (linha) select ok(
  not has_schema_privilege('anon', 'private', 'usage'),
  'anon não usa o schema private'
);

-- cnpj_valido: assinatura e privilégios
insert into tap (linha) select has_function(
  'private', 'cnpj_valido', array['text'], 'private.cnpj_valido(text) existe'
);
insert into tap (linha) select function_returns(
  'private', 'cnpj_valido', array['text'], 'boolean', 'cnpj_valido devolve boolean'
);
insert into tap (linha) select volatility_is(
  'private', 'cnpj_valido', array['text'], 'immutable',
  'cnpj_valido é immutable (usada em check)'
);
insert into tap (linha) select is_strict(
  'private', 'cnpj_valido', array['text'], 'cnpj_valido é strict'
);
insert into tap (linha) select ok(
  not has_function_privilege('anon', 'private.cnpj_valido(text)', 'execute'),
  'anon não executa cnpj_valido'
);
insert into tap (linha) select ok(
  not has_function_privilege('authenticated', 'private.cnpj_valido(text)', 'execute'),
  'authenticated não executa cnpj_valido'
);
insert into tap (linha) select ok(
  (select proconfig from pg_catalog.pg_proc where oid = 'private.cnpj_valido(text)'::regprocedure)
    = array['search_path=""'],
  'cnpj_valido tem search_path fixo e vazio'
);

-- cnpj_valido: aceita
insert into tap (linha) select ok(
  private.cnpj_valido('11222333000181'), 'aceita CNPJ numérico válido'
);
insert into tap (linha) select ok(
  private.cnpj_valido('12345678000195'), 'aceita outro CNPJ numérico válido'
);
insert into tap (linha) select ok(
  private.cnpj_valido('12ABC34501DE35'), 'aceita o exemplo alfanumérico da Receita'
);
insert into tap (linha) select ok(
  private.cnpj_valido('A1B2C3D4E5F668'), 'aceita alfanumérico que começa por letra'
);
insert into tap (linha) select ok(
  private.cnpj_valido('ZZZZZZZZ000191'), 'aceita a letra Z (o maior valor, 42)'
);
-- A borda do cálculo: resto 0 ou 1 dá verificador 0
insert into tap (linha) select ok(
  private.cnpj_valido('00000000001406'), 'aceita resto 0 no 1º verificador'
);
insert into tap (linha) select ok(
  private.cnpj_valido('00000000000604'), 'aceita resto 1 no 1º verificador'
);
insert into tap (linha) select ok(
  private.cnpj_valido('00000000001910'), 'aceita resto 0 no 2º verificador'
);
insert into tap (linha) select ok(
  private.cnpj_valido('00000000001830'), 'aceita resto 1 no 2º verificador'
);
insert into tap (linha) select ok(
  private.cnpj_valido('AB12CD34EF5602'), 'aceita resto 1 no alfanumérico'
);

-- cnpj_valido: recusa dígito verificador errado
insert into tap (linha) select ok(
  not private.cnpj_valido('11222333000171'), 'recusa o 1º dígito verificador errado'
);
insert into tap (linha) select ok(
  not private.cnpj_valido('11222333000182'), 'recusa o 2º dígito verificador errado'
);
insert into tap (linha) select ok(
  not private.cnpj_valido('12ABC34501DE36'), 'recusa dígito verificador errado no alfanumérico'
);
insert into tap (linha) select ok(
  not private.cnpj_valido('12ABC34501DF35'), 'recusa letra trocada (o dígito não confere)'
);

-- cnpj_valido: recusa tamanho errado
insert into tap (linha) select ok(
  not private.cnpj_valido('1122233300018'), 'recusa 13 caracteres'
);
insert into tap (linha) select ok(
  not private.cnpj_valido('112223330001810'), 'recusa 15 caracteres'
);
insert into tap (linha) select ok(not private.cnpj_valido(''), 'recusa texto vazio');

-- cnpj_valido: recusa caractere fora do formato. Os casos de 14 caracteres passam no cálculo
-- (o valor de qualquer caractere é o código − 48): só a checagem de formato os recusa
insert into tap (linha) select ok(
  not private.cnpj_valido('11.222.333/0001-81'), 'recusa máscara (pontos, barra e hífen)'
);
insert into tap (linha) select ok(
  not private.cnpj_valido('11.22233300048'), 'recusa ponto, mesmo com o cálculo conferindo'
);
insert into tap (linha) select ok(
  not private.cnpj_valido('12abc34501de05'), 'recusa minúscula, mesmo com o cálculo conferindo'
);
insert into tap (linha) select ok(
  not private.cnpj_valido('11222333 00103'), 'recusa espaço, mesmo com o cálculo conferindo'
);
insert into tap (linha) select ok(
  not private.cnpj_valido('12ÁBC34501DE48'), 'recusa letra acentuada, mesmo com o cálculo conferindo'
);
insert into tap (linha) select ok(
  not private.cnpj_valido('12ABC34501DE3A'), 'recusa letra no dígito verificador'
);

-- cnpj_valido: recusa sequência repetida. Só a de zeros passa no dígito verificador: é ela que
-- prova a regra; a de uns já cai no cálculo
insert into tap (linha) select ok(
  not private.cnpj_valido('00000000000000'), 'recusa zeros repetidos (o dígito confere)'
);
insert into tap (linha) select ok(
  not private.cnpj_valido('11111111111111'), 'recusa uns repetidos'
);

-- cnpj_valido: nulo devolve nulo (o `not null` da coluna é quem decide)
insert into tap (linha) select ok(private.cnpj_valido(null) is null, 'nulo devolve nulo');

-- set_updated_at: assinatura e privilégios
insert into tap (linha) select has_function(
  'private', 'set_updated_at', array[]::text[], 'private.set_updated_at() existe'
);
insert into tap (linha) select function_returns(
  'private', 'set_updated_at', array[]::text[], 'trigger', 'set_updated_at é função de trigger'
);
insert into tap (linha) select ok(
  not has_function_privilege('anon', 'private.set_updated_at()', 'execute'),
  'anon não executa set_updated_at'
);
insert into tap (linha) select ok(
  not has_function_privilege('authenticated', 'private.set_updated_at()', 'execute'),
  'authenticated não executa set_updated_at'
);
insert into tap (linha) select ok(
  (select proconfig from pg_catalog.pg_proc where oid = 'private.set_updated_at()'::regprocedure)
    = array['search_path=""'],
  'set_updated_at tem search_path fixo e vazio'
);

-- set_updated_at: comportamento, numa tabela temporária. O update é feito como `authenticated`,
-- que não executa a função: o trigger dispara assim mesmo (como vai acontecer nas tabelas de
-- tenant). Na transação, `now()` é fixo: o valor esperado é ele
create temporary table relogio (id integer primary key, nome text, updated_at timestamptz not null);
create trigger trg_set_updated_at
before update on relogio
for each row execute function private.set_updated_at();
insert into relogio (id, nome, updated_at) values
  (1, 'antes', '2000-01-01 00:00:00+00'),
  (2, 'antes', '2000-01-01 00:00:00+00');
grant select, update on relogio to authenticated;

call pg_temp.autenticar_como('00000000-0000-4000-8000-000000000001');
update relogio set nome = 'depois' where id = 1;
update relogio set nome = 'depois', updated_at = '1999-01-01 00:00:00+00' where id = 2;
call pg_temp.voltar_ao_postgres();

insert into tap (linha) select is(
  (select updated_at from relogio where id = 1), now(),
  'set_updated_at grava o horário do update'
);
insert into tap (linha) select is(
  (select updated_at from relogio where id = 2), now(),
  'set_updated_at ignora o updated_at enviado no update'
);

insert into tap (linha) select * from finish();
select linha from tap order by ordem;

rollback;
