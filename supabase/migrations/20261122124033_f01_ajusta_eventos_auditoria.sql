-- Fase 1, STEP 1.4 (achados do code-review): dois ajustes em `eventos_auditoria`, antes de qualquer
-- evento real.
--   1. `created_at` passa a `clock_timestamp()`: o `now()` é o início da transação, e os eventos
--      gravados numa transação só (um trigger de auditoria num update de várias linhas, uma RPC
--      com dois passos) ficariam com a mesma data, sem ordem entre eles.
--   2. A ação exige letra no começo e no fim de cada segmento, sem sublinhado repetido: `_._` e
--      `usuario_.criado` passavam. Classes por extenso, como no cnpj_valido.
alter table public.eventos_auditoria
  alter column created_at set default clock_timestamp(),
  drop constraint eventos_auditoria_acao_check,
  add constraint eventos_auditoria_acao_check check (
    acao ~ '^[abcdefghijklmnopqrstuvwxyz]+(_[abcdefghijklmnopqrstuvwxyz]+)*[.][abcdefghijklmnopqrstuvwxyz]+(_[abcdefghijklmnopqrstuvwxyz]+)*$'
  );

comment on column public.eventos_auditoria.created_at is
  'Momento da gravação (clock_timestamp), sempre do banco: ordena também os eventos de uma mesma transação.';
comment on column public.eventos_auditoria.acao is
  'dominio.evento (ex.: usuario.senha_alterada): minúsculas, cada segmento começa e termina com letra, sublinhado só entre letras.';
