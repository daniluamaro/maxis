-- Seed do projeto de DESENVOLVIMENTO (`maxis`, ref ddaqbcfrplzdywpgilbf). NUNCA em produção: o
-- pipeline não usa `--include-seed`, e o MCP da produção é somente leitura. Fase 1, STEP 1.7
-- (docs/plans/fase-01-dados-seguranca.md, decisões 12 e 13).
--
-- Aplicar no dev, como `postgres`: pelo MCP (`execute_sql` com o arquivo inteiro) ou, a partir do
-- STEP 1.9, pelo job `integracao` do CI.
--
-- Idempotente e sem apagar nada (decisão 13: o dev é compartilhado, e a auditoria imutável prende o
-- que existe). Reaplicar cria o que falta e devolve os dados do seed ao estado canônico do que muda
-- no uso: senha e o que o login exige no Auth, `senha_provisoria` e `senha_alterada_em`, o `ativo`
-- de quem não é `master_admin`, nome e e-mail, e o cadastro e o bloqueio das empresas. Não reescreve o que é imutável: `papel`,
-- `tenant_id` e o `ativo` do `master_admin` (STEP 1.3). Reaplicar sem mudança não grava nenhuma
-- linha: o resumo do fim mostra quantas cada passo gravou.
--
-- Senha: uma só para todos os usuários do seed, aleatória e forte. Aqui só o hash bcrypt; o valor
-- fica na variável SENHA_SEED_DEV do `.env.local` da raiz (fora do git) e, a partir do STEP 1.9, no
-- secret do environment `development`. O hash sai de `deno task hash-senha-seed`, na pasta
-- `supabase/functions`. Trocar a senha exige hash novo aqui, no `.env.local` e no secret, juntos.
--
-- Teste que muda o estado de um usuário (como a troca de senha) usa um usuário criado pela
-- `provisionar-usuario`, nunca um destes: todo run do job `integracao` reaplica o seed.
--
-- Usuários (e-mails em @exemplo.test, domínio reservado; ids fixos, começados por 5eed):
--   super.admin                         super_admin
--   master.alfa · master.beta           master_admin das empresas ativas
--   admin.alfa · admin.beta             admin
--   user.alfa · user.beta               user
--   inativo.alfa · inativo.beta         user inativo (gate "acesso suspenso")
--   provisoria.alfa · provisoria.beta   user com senha provisória (troca obrigatória no login)
--   master.gama · user.gama             empresa bloqueada (gate "acesso suspenso")

begin;

-- Empresas fictícias: CNPJ alfanumérico (decisão 14) com o prefixo SEED, que não colide com o TST
-- dos testes pgTAP nem com o CNPJ de uma empresa real
create temporary table seed_empresas on commit drop as
select *
from (
  values
    (
      '5eed0000-0000-4000-8000-00000000a000'::uuid, 'Alfa Logística Exemplo Ltda',
      'Alfa Logística', 'SEED0001000147', true, null::timestamptz, null::text
    ),
    (
      '5eed0000-0000-4000-8000-00000000b000', 'Beta Transportes Exemplo Ltda',
      'Beta Transportes', 'SEED0002000191', true, null, null
    ),
    (
      '5eed0000-0000-4000-8000-00000000c000', 'Gama Armazéns Exemplo Ltda', 'Gama Armazéns',
      'SEED0003000136', false, '2026-11-01 09:00:00-03', 'Assinatura em atraso'
    )
) as e (id, razao_social, nome_fantasia, cnpj, ativo, bloqueada_em, motivo_bloqueio);

create temporary table seed_usuarios on commit drop as
select
  u.id, u.email || '@exemplo.test' as email, u.nome, u.papel::public.papel_usuario as papel,
  u.tenant_id, u.ativo, u.senha_provisoria, u.created_by
from (
  values
    (
      '5eed0000-0000-4000-8000-000000000001'::uuid, 'super.admin', 'Helena Prado', 'super_admin',
      null::uuid, true, false, null::uuid
    ),
    -- Alfa
    (
      '5eed0000-0000-4000-8000-00000000a001', 'master.alfa', 'Marcos Alves', 'master_admin',
      '5eed0000-0000-4000-8000-00000000a000', true, false, '5eed0000-0000-4000-8000-000000000001'
    ),
    (
      '5eed0000-0000-4000-8000-00000000a002', 'admin.alfa', 'Ana Ribeiro', 'admin',
      '5eed0000-0000-4000-8000-00000000a000', true, false, '5eed0000-0000-4000-8000-00000000a001'
    ),
    (
      '5eed0000-0000-4000-8000-00000000a003', 'user.alfa', 'Lucas Teixeira', 'user',
      '5eed0000-0000-4000-8000-00000000a000', true, false, '5eed0000-0000-4000-8000-00000000a001'
    ),
    (
      '5eed0000-0000-4000-8000-00000000a004', 'inativo.alfa', 'Paulo Nogueira', 'user',
      '5eed0000-0000-4000-8000-00000000a000', false, false, '5eed0000-0000-4000-8000-00000000a001'
    ),
    (
      '5eed0000-0000-4000-8000-00000000a005', 'provisoria.alfa', 'Carla Mendes', 'user',
      '5eed0000-0000-4000-8000-00000000a000', true, true, '5eed0000-0000-4000-8000-00000000a001'
    ),
    -- Beta
    (
      '5eed0000-0000-4000-8000-00000000b001', 'master.beta', 'Beatriz Costa', 'master_admin',
      '5eed0000-0000-4000-8000-00000000b000', true, false, '5eed0000-0000-4000-8000-000000000001'
    ),
    (
      '5eed0000-0000-4000-8000-00000000b002', 'admin.beta', 'Rafael Lima', 'admin',
      '5eed0000-0000-4000-8000-00000000b000', true, false, '5eed0000-0000-4000-8000-00000000b001'
    ),
    (
      '5eed0000-0000-4000-8000-00000000b003', 'user.beta', 'Juliana Rocha', 'user',
      '5eed0000-0000-4000-8000-00000000b000', true, false, '5eed0000-0000-4000-8000-00000000b001'
    ),
    (
      '5eed0000-0000-4000-8000-00000000b004', 'inativo.beta', 'Diego Martins', 'user',
      '5eed0000-0000-4000-8000-00000000b000', false, false, '5eed0000-0000-4000-8000-00000000b001'
    ),
    (
      '5eed0000-0000-4000-8000-00000000b005', 'provisoria.beta', 'Fernanda Dias', 'user',
      '5eed0000-0000-4000-8000-00000000b000', true, true, '5eed0000-0000-4000-8000-00000000b001'
    ),
    -- Gama (bloqueada)
    (
      '5eed0000-0000-4000-8000-00000000c001', 'master.gama', 'Gustavo Moreira', 'master_admin',
      '5eed0000-0000-4000-8000-00000000c000', true, false, '5eed0000-0000-4000-8000-000000000001'
    ),
    (
      '5eed0000-0000-4000-8000-00000000c002', 'user.gama', 'Larissa Pinto', 'user',
      '5eed0000-0000-4000-8000-00000000c000', true, false, '5eed0000-0000-4000-8000-00000000c001'
    )
) as u (id, email, nome, papel, tenant_id, ativo, senha_provisoria, created_by);

create temporary table seed_resumo (
  ordem integer generated always as identity,
  passo text not null,
  gravadas bigint not null
) on commit drop;

-- Usuários do Auth no formato que o GoTrue grava: `instance_id` nulo (zeros), `aud` e `role`
-- `authenticated`, e-mail confirmado (sem SMTP, a confirmação nunca chegaria) e as colunas de token
-- como texto vazio (nulas, o GoTrue não lê a linha e recusa o login). Hash de custo 10, o do GoTrue
with gravados as (
  insert into auth.users as atual (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data,
    raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change, email_change_token_current, phone_change,
    phone_change_token, reauthentication_token
  )
  select
    '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
    senha.hash, now(), '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}',
    now(), now(), '', '', '', '', '', '', '', ''
  from seed_usuarios as u
    cross join (values ('$2b$10$IZR6AQD9f9u40YX5ZdmQsOylwDOOTEK3AHGPWJFmTlPXKTkiqcugi')) as senha (hash)
  -- O que o login exige volta ao canônico: e-mail, senha, confirmação, sem ban, sem exclusão
  -- lógica e o provedor no app_metadata
  on conflict (id) do update set
    email = excluded.email,
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = coalesce(atual.email_confirmed_at, excluded.email_confirmed_at),
    banned_until = null,
    deleted_at = null,
    raw_app_meta_data = excluded.raw_app_meta_data,
    updated_at = now()
  where (atual.email, atual.encrypted_password, atual.email_confirmed_at is not null,
      atual.banned_until, atual.deleted_at, atual.raw_app_meta_data)
    is distinct from (excluded.email, excluded.encrypted_password, true, null, null,
      excluded.raw_app_meta_data)
  returning 1
)
insert into seed_resumo (passo, gravadas) select 'auth.users', count(*) from gravados;

-- A identidade do provedor de e-mail, como o GoTrue cria: `provider_id` é o id do usuário
with gravados as (
  insert into auth.identities as atual (
    provider_id, user_id, provider, identity_data, created_at, updated_at
  )
  select
    u.id::text, u.id, 'email',
    jsonb_build_object(
      'sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false
    ),
    now(), now()
  from seed_usuarios as u
  on conflict (provider_id, provider) do update set
    identity_data = excluded.identity_data,
    updated_at = now()
  where atual.identity_data is distinct from excluded.identity_data
  returning 1
)
insert into seed_resumo (passo, gravadas) select 'auth.identities', count(*) from gravados;

-- `created_by` das empresas aponta para o profile do super_admin, que só existe no passo seguinte:
-- entra no fim
with gravados as (
  insert into public.empresas as atual (
    id, razao_social, nome_fantasia, cnpj, ativo, bloqueada_em, motivo_bloqueio
  )
  select id, razao_social, nome_fantasia, cnpj, ativo, bloqueada_em, motivo_bloqueio
  from seed_empresas
  on conflict (id) do update set
    razao_social = excluded.razao_social,
    nome_fantasia = excluded.nome_fantasia,
    cnpj = excluded.cnpj,
    ativo = excluded.ativo,
    bloqueada_em = excluded.bloqueada_em,
    motivo_bloqueio = excluded.motivo_bloqueio
  where (atual.razao_social, atual.nome_fantasia, atual.cnpj, atual.ativo, atual.bloqueada_em,
      atual.motivo_bloqueio)
    is distinct from (excluded.razao_social, excluded.nome_fantasia, excluded.cnpj, excluded.ativo,
      excluded.bloqueada_em, excluded.motivo_bloqueio)
  returning 1
)
insert into seed_resumo (passo, gravadas) select 'public.empresas', count(*) from gravados;

-- `papel` e `tenant_id` não entram no update (imutáveis), e o `ativo` do master_admin fica como
-- está: o trigger do STEP 1.3 recusaria a mudança, e regravar o mesmo valor não o dispara
with gravados as (
  insert into public.profiles as atual (
    id, tenant_id, papel, nome, email, ativo, senha_provisoria, senha_alterada_em, created_by
  )
  select id, tenant_id, papel, nome, email, ativo, senha_provisoria, null, created_by
  from seed_usuarios
  on conflict (id) do update set
    nome = excluded.nome,
    email = excluded.email,
    ativo = case when atual.papel = 'master_admin' then atual.ativo else excluded.ativo end,
    senha_provisoria = excluded.senha_provisoria,
    senha_alterada_em = excluded.senha_alterada_em
  where (atual.nome, atual.email, atual.ativo, atual.senha_provisoria, atual.senha_alterada_em)
    is distinct from (excluded.nome, excluded.email,
      case when atual.papel = 'master_admin' then atual.ativo else excluded.ativo end,
      excluded.senha_provisoria, excluded.senha_alterada_em)
  returning 1
)
insert into seed_resumo (passo, gravadas) select 'public.profiles', count(*) from gravados;

with gravados as (
  update public.empresas
  set created_by = '5eed0000-0000-4000-8000-000000000001'
  where id in (select id from seed_empresas)
    and created_by is distinct from '5eed0000-0000-4000-8000-000000000001'
  returning 1
)
insert into seed_resumo (passo, gravadas)
select 'public.empresas (created_by)', count(*) from gravados;

select passo, gravadas from seed_resumo order by ordem;

commit;
