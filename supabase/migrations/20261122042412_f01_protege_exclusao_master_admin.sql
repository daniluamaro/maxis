-- Fase 1, STEP 1.3 (achado do code-review): o master_admin também não é excluído por engano. A
-- migration anterior protege só o update; a exclusão chegava pela cascata do Auth
-- (`auth.admin.deleteUser` numa Edge Function, `on delete cascade` de `profiles.id`) ou por um
-- `delete` do dono do banco. Vale a mesma autorização da transação. A compensação do
-- provisionamento (STEP 1.9) não muda: ela apaga o usuário do Auth quando o profile ainda não
-- existe.

-- Funções: a mesma checagem para o update e o delete. No delete, o trigger devolve `old` —
-- devolver `new`, que é nulo, cancelaria a exclusão em silêncio. O `create or replace` mantém os
-- grants (o `execute` segue revogado de PUBLIC)
create or replace function private.proteger_master_admin()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_catalog.current_setting('maxis.alteracao_master_admin', true)
    is distinct from pg_catalog.pg_current_xact_id()::text then
    raise exception using
      errcode = 'insufficient_privilege',
      message = case tg_op
        when 'DELETE' then 'master_admin imutável: a exclusão só ocorre pela operação privilegiada'
        else 'master_admin imutável: papel, tenant_id e ativo só mudam pela operação privilegiada'
      end;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- Trigger. Também dispara na cascata do `auth.users`
create trigger trg_proteger_exclusao_master_admin
before delete on public.profiles
for each row
when (old.papel = 'master_admin')
execute function private.proteger_master_admin();

-- Comentários
comment on function private.proteger_master_admin() is
  'Trigger de profiles: recusa mudar papel, tenant_id ou ativo de um master_admin, ou excluí-lo, sem a autorização da transação.';
comment on procedure private.autorizar_alteracao_master_admin() is
  'Operação privilegiada: libera, só na transação corrente, a alteração de papel, tenant_id e ativo de um master_admin e a exclusão dele. Só o dono do banco executa.';
