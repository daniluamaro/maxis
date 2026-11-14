-- Fase 1, STEP 1.1: schema `private` e os utilitários das tabelas (docs/plans/modelo-dados.md §4).
-- O `private` guarda as funções de apoio (policies, checks, triggers) e fica fora da Data API (não
-- está em `[api] schemas` do config.toml). Nesta migration ninguém além do dono recebe privilégio:
-- o `usage` de `authenticated` e o `execute` das funções de policy entram com elas (STEP 1.2).

create schema private;

-- CNPJ numérico ou alfanumérico (Receita, a partir de jul/2026): 12 caracteres [0-9A-Z] + 2
-- dígitos verificadores, sem máscara e em maiúsculas, a forma guardada. Cada caractere vale o
-- código ASCII − 48 (os dígitos seguem valendo 0–9, e o cálculo dos CNPJs numéricos não muda); os
-- verificadores saem do módulo 11. A sequência de um caractere só é recusada: a de zeros passa no
-- cálculo.
create function private.cnpj_valido(cnpj text)
returns boolean
language plpgsql
immutable
strict
parallel safe
set search_path = ''
as $$
declare
  pesos constant integer[] := array[6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  verificador integer;
  posicao integer;
  soma integer;
  resto integer;
begin
  -- Classes escritas por extenso: um intervalo como A-Z pode depender da collation
  if cnpj !~ '^[0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ]{12}[0123456789]{2}$' then
    return false;
  end if;
  if cnpj ~ '^(.)\1*$' then
    return false;
  end if;
  -- 1º verificador: os 12 primeiros caracteres, pesos 5..2 e 9..2 (pesos[2..13]);
  -- 2º verificador: os 13 primeiros, pesos 6..2 e 9..2 (pesos[1..13])
  for verificador in 1..2 loop
    soma := 0;
    for posicao in 1..(11 + verificador) loop
      soma := soma + (ascii(substr(cnpj, posicao, 1)) - 48) * pesos[posicao + 2 - verificador];
    end loop;
    resto := soma % 11;
    if (case when resto < 2 then 0 else 11 - resto end)
      <> ascii(substr(cnpj, 12 + verificador, 1)) - 48 then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

-- `updated_at` sempre no horário da transação, em todo update, ignorando o valor enviado.
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- O Postgres dá `execute` a PUBLIC (e, por herança, a `anon` e `authenticated`) em toda função
-- nova. Aqui só o dono executa; o trigger dispara sem depender do privilégio de quem faz o update.
revoke execute on function private.cnpj_valido(text) from public;
revoke execute on function private.set_updated_at() from public;

comment on schema private is
  'Funções de apoio do Maxis (policies, checks e triggers). Fora da Data API.';
comment on function private.cnpj_valido(text) is
  'CNPJ numérico ou alfanumérico, sem máscara e em maiúsculas: 12 caracteres [0-9A-Z] + 2 dígitos verificadores (valor ASCII − 48, módulo 11). Recusa sequência repetida. Nulo devolve nulo.';
comment on function private.set_updated_at() is
  'Trigger: grava em updated_at o horário da transação a cada update.';
