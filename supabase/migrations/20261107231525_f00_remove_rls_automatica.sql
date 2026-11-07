-- Remove a RLS automática que o projeto de dev ganhou na criação: o event trigger `ensure_rls` e a
-- função `public.rls_auto_enable()`, executável por `anon`. A produção nasceu sem ela. Só no dev,
-- ela esconderia a migration que esqueceu o `enable row level security`: o teste guardião passaria
-- no dev e a tabela chegaria à produção sem RLS. A RLS é sempre explícita na migration que cria a
-- tabela (supabase/CLAUDE.md §4). Na produção, os dois `if exists` não fazem nada.
drop event trigger if exists ensure_rls;
drop function if exists public.rls_auto_enable();
