-- Fase 1, STEP 1.3: o master_admin é imutável (docs/plans/modelo-dados.md §5.2). Papel, tenant e
-- ativo do dono da empresa não mudam por engano — nem por bug numa Edge Function (`service_role`),
-- nem por um seed ou uma manutenção (`postgres`). Os outros campos dele (senha, contato) seguem o
-- fluxo normal, e os outros papéis não são afetados.
--
-- A alteração legítima (troca do titular, suporte do Maxis) é uma operação privilegiada explícita:
-- o dono do banco chama `private.autorizar_alteracao_master_admin()` na mesma transação. A marca
-- leva o id da transação: se vazar para a sessão (um `set_config` sem o `true`, numa conexão do
-- pool), não vale em nenhuma outra. É proteção contra engano, não contra o dono do banco, que pode
-- tudo.

-- Funções
create function private.proteger_master_admin()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_catalog.current_setting('maxis.alteracao_master_admin', true)
    is distinct from pg_catalog.pg_current_xact_id()::text then
    raise exception using
      errcode = 'insufficient_privilege',
      message = 'master_admin imutável: papel, tenant_id e ativo só mudam pela operação privilegiada';
  end if;
  return new;
end;
$$;

create procedure private.autorizar_alteracao_master_admin()
language plpgsql
set search_path = ''
as $$
begin
  perform pg_catalog.set_config(
    'maxis.alteracao_master_admin', pg_catalog.pg_current_xact_id()::text, true
  );
end;
$$;

-- Trigger. Sem lista de colunas (`update of`): o `when` compara os valores, inclusive os que outro
-- trigger anterior tenha mudado, e a função só roda quando um dos três campos muda de fato
create trigger trg_proteger_master_admin
before update on public.profiles
for each row
when (
  old.papel = 'master_admin'
  and (new.papel, new.tenant_id, new.ativo) is distinct from (old.papel, old.tenant_id, old.ativo)
)
execute function private.proteger_master_admin();

-- Grants. Função nova nasce com `execute` para PUBLIC: a do trigger não precisa dele (o trigger
-- dispara sem conferir o `execute`), e a autorização é só do dono do banco
revoke execute on function private.proteger_master_admin() from public;
revoke execute on procedure private.autorizar_alteracao_master_admin() from public;

-- Comentários
comment on function private.proteger_master_admin() is
  'Trigger de profiles: recusa mudar papel, tenant_id ou ativo de um master_admin sem a autorização da transação.';
comment on procedure private.autorizar_alteracao_master_admin() is
  'Operação privilegiada: libera, só na transação corrente, a alteração de papel, tenant_id e ativo de um master_admin. Só o dono do banco executa.';
