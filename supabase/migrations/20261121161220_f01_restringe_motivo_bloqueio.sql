-- Fase 1, STEP 1.2 (achado do code-review): o motivo do bloqueio só existe enquanto a empresa está
-- bloqueada. O modelo o quer visível só no Admin SaaS (docs/plans/modelo-dados.md §5.1), e o
-- `select` de `empresas` vale para a tabela inteira: com o motivo sobrando depois do desbloqueio,
-- qualquer usuário da empresa o leria. Enquanto bloqueada, ninguém do tenant lê a empresa (a RLS
-- zera o tenant dele); ao desbloquear, o motivo sai junto com a data. O histórico fica na
-- auditoria (empresa.bloqueada / empresa.desbloqueada).
alter table public.empresas
  add constraint empresas_motivo_bloqueio_check check (not ativo or motivo_bloqueio is null);

comment on column public.empresas.motivo_bloqueio is
  'Motivo do bloqueio, só enquanto a empresa está bloqueada; visível só no Admin SaaS.';
