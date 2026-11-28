-- Fase 1, STEP 1.9: a gravação do usuário provisionado (docs/plans/modelo-dados.md §4). A Edge
-- Function `provisionar-usuario` cria o usuário no Auth e chama esta RPC, que grava o profile e o
-- evento `usuario.criado` na mesma transação: se um falha, nenhum fica, e a função apaga o usuário
-- do Auth (compensação). Assim todo usuário provisionado tem rastro (decisão do Danilo,
-- 27/11/2026). É `security invoker`: roda com os grants da `service_role` (insert em `profiles`
-- e nas colunas do evento), sem passar por cima de nada. A senha não passa por aqui: vai só ao
-- Auth.

-- Funções
create function public.registrar_usuario_provisionado(
  usuario_id uuid,
  tenant_id uuid,
  papel public.papel_usuario,
  nome text,
  email text,
  ator_profile_id uuid,
  telefone text default null
)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  -- O primeiro super_admin vem do procedimento manual (decisão 3 da fase); outro, só fora da v1
  if registrar_usuario_provisionado.papel = 'super_admin' then
    raise exception 'O provisionamento não cria super_admin.' using errcode = '42501';
  end if;
  if registrar_usuario_provisionado.ator_profile_id is null then
    raise exception 'O provisionamento exige o ator.' using errcode = '22004';
  end if;

  insert into public.profiles (
    id, tenant_id, papel, nome, email, telefone, senha_provisoria, created_by
  )
  values (
    registrar_usuario_provisionado.usuario_id,
    registrar_usuario_provisionado.tenant_id,
    registrar_usuario_provisionado.papel,
    registrar_usuario_provisionado.nome,
    registrar_usuario_provisionado.email,
    registrar_usuario_provisionado.telefone,
    true,
    registrar_usuario_provisionado.ator_profile_id
  );

  insert into public.eventos_auditoria (
    tenant_id, ator_profile_id, acao, alvo_tabela, alvo_id, detalhes
  )
  values (
    registrar_usuario_provisionado.tenant_id,
    registrar_usuario_provisionado.ator_profile_id,
    'usuario.criado',
    'profiles',
    registrar_usuario_provisionado.usuario_id,
    pg_catalog.jsonb_build_object('papel', registrar_usuario_provisionado.papel)
  );
end;
$$;

-- Grants. A função nova nasce com `execute` para PUBLIC e, em `public`, também para anon,
-- authenticated e service_role (privilégios padrão do projeto): revoga-se tudo e concede-se só à
-- Edge Function
revoke execute on function public.registrar_usuario_provisionado(
  uuid, uuid, public.papel_usuario, text, text, uuid, text
) from public, anon, authenticated, service_role;
grant execute on function public.registrar_usuario_provisionado(
  uuid, uuid, public.papel_usuario, text, text, uuid, text
) to service_role;

-- Comentários
comment on function public.registrar_usuario_provisionado(
  uuid, uuid, public.papel_usuario, text, text, uuid, text
) is
  'Grava o profile (ativo, com senha provisória) e o evento usuario.criado na mesma transação. Só a Edge Function provisionar-usuario chama, depois de criar o usuário no Auth; não cria super_admin.';
