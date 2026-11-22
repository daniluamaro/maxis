-- Fase 1, STEP 1.5: o estado de acesso do usuário logado, que os gates da Fase 2 consultam
-- (docs/plans/modelo-dados.md §3 e §4). O usuário inativo ou de empresa bloqueada precisa saber
-- **que** está bloqueado sem enxergar mais nada: a RLS não lhe mostra a própria empresa, então a
-- leitura é `security definer`. Ela fica no `private`, fora da API, e devolve só os cinco campos
-- do próprio usuário; a RPC exposta é `security invoker` e só a chama.

-- Tipos
create type public.acesso_usuario as (
  papel public.papel_usuario,
  nome text,
  ativo boolean,
  empresa_ativa boolean,
  senha_provisoria boolean
);

-- Funções. Sem profile (o JWT de quem não tem linha em `profiles`), o resultado é nulo
create function private.acesso_atual()
returns public.acesso_usuario
language sql
stable
security definer
set search_path = ''
as $$
  select p.papel, p.nome, p.ativo, e.ativo, p.senha_provisoria
  from public.profiles as p
  left join public.empresas as e on e.id = p.tenant_id
  where p.id = (select auth.uid())
$$;

create function public.obter_meu_acesso()
returns public.acesso_usuario
language sql
stable
security invoker
set search_path = ''
as $$
  select private.acesso_atual()
$$;

-- Grants. A função nova nasce com `execute` para PUBLIC e, em `public`, também para anon,
-- authenticated e service_role (privilégios padrão do projeto): revoga-se tudo e concede-se só
-- ao usuário logado
revoke execute on function private.acesso_atual() from public;
grant execute on function private.acesso_atual() to authenticated;
revoke execute on function public.obter_meu_acesso()
  from public, anon, authenticated, service_role;
grant execute on function public.obter_meu_acesso() to authenticated;

-- Comentários
comment on type public.acesso_usuario is
  'Estado de acesso do usuário logado: papel, nome, ativo, empresa_ativa (nula para o super_admin) e senha_provisoria.';
comment on function private.acesso_atual() is
  'Estado de acesso do usuário logado (auth.uid()), inclusive inativo ou de empresa bloqueada; nulo sem profile. Chamada só pela RPC obter_meu_acesso().';
comment on function public.obter_meu_acesso() is
  'RPC dos gates do app: o estado de acesso do próprio usuário, sem nenhum outro dado.';
