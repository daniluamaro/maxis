# Fase 5 — Perfis de Acesso & Permissões

> Plano detalhado da Fase 5. Fase ativa e progresso: `@project_manager.md`. Schema: `@docs/plans/modelo-dados.md` (§4, §6).
> Convenções: `@frontend/CLAUDE.md` (§4 permissões), `@supabase/CLAUDE.md` (§6 RLS, §7 testes). Skill `frontend-design` nos STEPs de UI. TDD para catálogo, funções, RLS e lógica do editor.

**Status:** ⬜ Não iniciada · **Depende de:** Fase 4 ✅ · **Libera:** Fases 6 e 7

---

## 1. Objetivo

Ligar de ponta a ponta o modelo de permissões do `CLAUDE.md §4/§6`:
- catálogo `modulos → funcionalidades → abas → permissoes` **gerado do objeto de menu**, sem digitação manual;
- `master_admin` cria, edita e exclui perfis por módulo/funcionalidade/aba + visualizar/editar;
- perfil com usuários vinculados não pode ser excluído;
- permissão aplicada nas **duas pontas**: tela (sidebar, rotas, botões) e banco (`private.tem_permissao`);
- gate "sem perfil" passa a valer.

## 2. Pré-requisitos

- [ ] Fase 4 ✅ (componentes de dados, painel com id na rota).
- [ ] Objeto de menu só com dados (Fase 3, STEP 3.1) — o gerador do catálogo depende disso.

## 3. Decisões desta fase

| # | Decisão | Origem |
|---|---|---|
| 1 | O objeto de menu ganha a marcação **"restrito a papel"**. Itens restritos (Admin SaaS → `super_admin`; Perfis de Acesso e Usuários → `master_admin`) **não entram no catálogo** e não podem ser concedidos por perfil. Só entram itens **disponíveis** e **concedíveis**. | `CLAUDE.md §4` + Etapa C |
| 2 | **Consequência:** ao fim desta fase o catálogo concedível ainda está quase vazio — os primeiros itens reais chegam com a Estrutura Organizacional (Fase 6) e depois com os módulos de negócio. O editor de perfis é validado com um **catálogo de teste**. | consequência do item 1 |
| 3 | Catálogo gerado por **script** que lê o objeto de menu e escreve uma migration (cria, atualiza nome/ordem e desativa o que saiu — nunca apaga). O CI **falha** se o catálogo do banco divergir do config. | `modelo-dados.md §1.3` |
| 4 | Perfil salvo de forma **atômica** pela RPC `salvar_perfil_acesso()` (`security invoker` — a RLS continua valendo), que também normaliza "editar implica visualizar". Um trigger garante a mesma regra para qualquer escrita. | `modelo-dados.md §6.3` |
| 5 | Auditoria de tabelas escritas pelo cliente por **trigger `security definer` em `private`** (`private.registrar_auditoria()`) — sem dar ao cliente permissão de escrever em `eventos_auditoria`. Padrão reutilizado na Fase 6. Proposta de registro no `supabase/CLAUDE.md` (pendência de governança #9). | proposta |
| 6 | O frontend busca as próprias permissões por `listar_minhas_permissoes()` (com cache, reconsulta no foco e a cada 5 min, como o estado de acesso). Mudar um perfil vale **na hora no banco** e em até 5 min na tela. | proposta |
| 7 | Rota existente sem permissão → tela "Você não tem acesso a esta tela" (com link para o Início), distinta da 404. Dentro do próprio tenant, revelar que a tela existe não expõe dado. | proposta |
| 8 | Criar perfil abre o mesmo painel em modo "novo", **sem segmento na URL** (não há registro para linkar). | proposta |
| 9 | Fora do escopo v1 (backlog): duplicar perfil. | proposta |

## 4. STEPs (na ordem; não pular)

### STEP 5.1 — Catálogo de permissões e gerador
**Entrega:** as tabelas do catálogo, populadas a partir do config.
- [ ] **Testes primeiro:**
  - pgTAP: catálogo legível por `authenticated`, sem escrita por cliente; `unique` e formato da `chave`; toda funcionalidade tem ≥ 1 aba; RLS e guardião verdes;
  - Vitest (gerador): só itens disponíveis e concedíveis entram (decisão 1); item removido do config vira `ativo = false`; renomear atualiza nome/ordem sem trocar `id`; saída determinística (rodar duas vezes não gera diferença)
- [ ] Objeto de menu: marcação "restrito a papel" (decisão 1); testes da Fase 3 ajustados
- [ ] Migration `f05_cria_catalogo_permissoes`: enum `acao_permissao`; `modulos`, `funcionalidades`, `abas`, `permissoes` conforme `modelo-dados.md §6.1`; RLS (`select` para `authenticated`), grants
- [ ] Script gerador (lê o config → cria migration de dados via CLI) e **modo verificação** no CI: após `db reset`, compara banco × config; diferença = falha (decisão 3)

**Verificação:** testes verdes; alterar uma aba no config sem gerar migration faz o CI falhar.

### STEP 5.2 — Perfis: tabelas, RLS e auditoria por trigger
**Entrega:** `perfis_acesso` e `perfil_permissoes` com isolamento e regras provadas.
- [ ] **Testes primeiro (pgTAP):**
  - casos mínimos de `supabase/CLAUDE.md §7` (tenant A × B, inativo, empresa bloqueada, `anon`);
  - só `master_admin` insere, altera e exclui; `admin`/`user` só leem os perfis do próprio tenant; `super_admin` não enxerga;
  - nome único por tenant (sem diferenciar maiúsculas);
  - "editar implica visualizar": conceder `edit` cria o `view`; retirar o `view` retira o `edit`;
  - perfil vinculado a usuário não é excluído (FK `restrict`);
  - toda criação/alteração/exclusão gera `perfil.criado` / `perfil.atualizado` / `perfil.excluido` com o retrato das permissões (decisão 5), com ator = usuário logado
- [ ] Migration `f05_cria_perfis_acesso`: `perfis_acesso`, `perfil_permissoes` (`modelo-dados.md §6.2–6.3`), FKs compostas, índices, triggers (`updated_at`, editar→visualizar, auditoria), RLS, policies e grants
- [ ] `private.registrar_auditoria()` (trigger genérico) — registrado em `modelo-dados.md §4`
- [ ] Policies:

  | Tabela | Policy | Regra |
  |---|---|---|
  | `perfis_acesso` | `perfis_acesso_select_tenant` | `tenant_id` = `tenant_atual()` |
  | `perfis_acesso` | `perfis_acesso_insert_master_admin` / `_update_` / `_delete_` | tenant + `papel_atual() = 'master_admin'` (update com `using` e `with check`) |
  | `perfil_permissoes` | `perfil_permissoes_select_tenant` | `tenant_id` = `tenant_atual()` |
  | `perfil_permissoes` | `perfil_permissoes_insert_master_admin` / `_delete_` | tenant + `master_admin` |

**Verificação:** testes verdes; advisors sem alerta.

### STEP 5.3 — Vínculo do usuário ao perfil e funções de permissão
**Entrega:** o banco sabe o que cada usuário pode fazer.
- [ ] **Testes primeiro (pgTAP):**
  - `private.tem_permissao(chave)`: `master_admin` → verdadeiro para qualquer chave do tenant; `admin`/`user` → só as do perfil; sem perfil → falso; `super_admin` → falso; inativo/empresa bloqueada → falso; permissão desativada no catálogo → falso;
  - `obter_meu_acesso()` passa a devolver `tem_perfil` (`master_admin`/`super_admin` → verdadeiro; `admin`/`user` → perfil vinculado);
  - `listar_minhas_permissoes()` devolve as chaves do próprio usuário (todas as ativas para `master_admin`);
  - `listar_perfis_acesso(busca)` devolve perfis do tenant com total de usuários vinculados;
  - `salvar_perfil_acesso()` cria/atualiza nome, descrição e conjunto de chaves numa transação; chave inexistente ou inativa → erro; só `master_admin`
- [ ] Migration `f05_vincula_profiles_perfil_acesso`: `profiles.perfil_acesso_id` (FK composta `restrict`) + `check` (só `admin`/`user` têm perfil) + índice
- [ ] Migration `f05_cria_funcoes_permissao`: `private.tem_permissao`, RPCs `listar_minhas_permissoes`, `listar_perfis_acesso`, `salvar_perfil_acesso` (todas `security invoker`) e nova versão de `obter_meu_acesso`
- [ ] `provisionar-usuario` aceita `perfil_acesso_id` (opcional, do mesmo tenant) — testes de unidade e integração atualizados; a tela que o usa chega na Fase 7

**Verificação:** testes verdes; advisors sem alerta.

### STEP 5.4 — Permissões reais no frontend
**Entrega:** `usePermissao()` deixa a fonte provisória e passa a obedecer o banco.
- [ ] **Testes primeiro:**
  - fonte = `listar_minhas_permissoes()`; itens restritos a papel seguem a marcação do config;
  - sidebar, abas e atalhos da Home filtrados pelas permissões reais;
  - rota sem `view` → tela "Você não tem acesso a esta tela" (decisão 7); sem perfil → `/sem-perfil` (gate ativado na tabela de destinos da Fase 2);
  - controles de edição só com `edit`;
  - mudança de perfil refletida após reconsulta (decisão 6)
- [ ] Troca da fonte provisória da Fase 3 (um único ponto, sem mudar a API)
- [ ] Limpeza ao sair inclui as permissões em cache

**Verificação:** testes verdes; com usuários do seed, cada um vê só o que o perfil permite.

### STEP 5.5 — Tela Perfis de Acesso (lista)
**Entrega:** a visão dos perfis da empresa.
- [ ] Objeto de menu: `configuracoes` disponível; funcionalidade `perfis_acesso` (restrita a `master_admin`), aba `lista`. Rota `/configuracoes/perfis-acesso/lista`
- [ ] Colunas: nome, descrição, usuários vinculados (fonte mono), atualizado em
- [ ] Busca; ação principal "Criar perfil"; vazio orientado ("Nenhum perfil criado" + explicação de que usuários sem perfil não acessam o sistema)
- [ ] **Testes** (RTL): lista, busca, estados; tela inacessível para `admin`/`user`

**Verificação:** testes verdes; checklist de tela.

### STEP 5.6 — Editor de perfil
**Entrega:** o `master_admin` monta um perfil em poucos cliques, sem ambiguidade.
- [ ] Painel `/configuracoes/perfis-acesso/lista/<id>` (criação no mesmo painel, sem URL — decisão 8); desenho com a skill `frontend-design` (painel largo, árvore legível)
- [ ] Campos: nome, descrição; árvore módulo → funcionalidade → aba com **Visualizar** e **Editar** por aba
- [ ] Marcação em lote por módulo e por funcionalidade (estado misto quando parcial); marcar "Editar" marca "Visualizar"; desmarcar "Visualizar" desmarca "Editar"
- [ ] Resumo das alterações antes de salvar; "Salvar perfil" → `salvar_perfil_acesso()` → "Perfil salvo"
- [ ] Excluir: bloqueado com explicação quando há usuários vinculados ("Este perfil está vinculado a {n} usuários. Troque o perfil deles antes de excluir."); sem vínculo → confirmação → "Perfil excluído"
- [ ] **Testes primeiro** (RTL, com catálogo de teste — decisão 2): regras da árvore, lote, estado misto, resumo, salvar, exclusão bloqueada e permitida, nome duplicado vira erro no campo
- [ ] Navegação por teclado completa na árvore; rótulos acessíveis em cada caixa de seleção

**Verificação:** testes verdes; checklist de tela; conferência visual em 1280px e 360px.

### STEP 5.7 — Roteiro ponta a ponta 📋
- [ ] 📋 Local, com o catálogo de teste carregado só no ambiente local: `master_admin` cria um perfil com uma aba só de visualização → vincula a um `user` do seed (via função, até a tela da Fase 7) → o `user` vê só essa aba, sem botões de edição → tentativa de escrita direta pela API é negada pelo banco → alterar o perfil reflete em até 5 min
- [ ] 📋 `user` sem perfil cai em `/sem-perfil`; tentar excluir perfil vinculado é bloqueado
- [ ] Eventos `perfil.*` conferidos na auditoria

**Verificação:** roteiro registrado no log do `project_manager.md`.

### STEP 5.8 — Fechamento da fase
- [ ] Pendência de governança #9 aplicada no `supabase/CLAUDE.md` *(sob autorização)*
- [ ] Tipos do frontend regenerados; `modelo-dados.md` conferido contra o banco real
- [ ] `project_manager.md`: entregáveis ✅, Fase 5 ✅, progresso, log; fase ativa → Fase 6

## 5. Critérios de aceite da fase

1. Catálogo gerado do objeto de menu; o CI falha se banco e config divergirem.
2. Itens restritos a papel nunca aparecem no editor nem no catálogo.
3. Só o `master_admin` cria, edita e exclui perfis — provado no banco e na tela.
4. "Editar implica visualizar" garantido no banco e no editor.
5. Perfil com usuários vinculados não pode ser excluído; a UI explica o motivo.
6. `tem_permissao`, `listar_minhas_permissoes` e `obter_meu_acesso.tem_perfil` corretos para todos os papéis e estados (testes).
7. Sidebar, rotas, abas e botões obedecem às permissões reais; rota sem permissão mostra a tela de acesso negado; sem perfil cai em `/sem-perfil`.
8. Toda alteração de perfil gera evento de auditoria com o retrato das permissões, sem o cliente ter permissão de escrita em `eventos_auditoria`.
9. Isolamento entre tenants provado para `perfis_acesso` e `perfil_permissoes`.
10. Telas aprovadas no checklist de tela e na conferência visual.

## 6. Modelagem de dados afetada

- **Tabelas:** `modulos`, `funcionalidades`, `abas`, `permissoes` (§6.1); `perfis_acesso` (§6.2); `perfil_permissoes` (§6.3); coluna `profiles.perfil_acesso_id` (§5.2).
- **Funções e RPCs** (registradas em `modelo-dados.md §4` junto com este plano): `private.tem_permissao`, `private.registrar_auditoria` (trigger), `listar_minhas_permissoes`, `listar_perfis_acesso`, `salvar_perfil_acesso`; `obter_meu_acesso` ganha `tem_perfil`.
- **Regra do catálogo** (§6.1): só itens disponíveis e concedíveis por perfil.

## 7. Rotas, Edge Functions e RPCs

| Tipo | Item | Observação |
|---|---|---|
| Rota | `/configuracoes/perfis-acesso/lista` | lista de perfis (só `master_admin`) |
| Rota | `/configuracoes/perfis-acesso/lista/<id>` | editor do perfil |
| Edge Function | `provisionar-usuario` (Fase 1) | passa a aceitar `perfil_acesso_id` |
| RPC | `listar_minhas_permissoes()` | fonte do `usePermissao` |
| RPC | `listar_perfis_acesso(busca)` | lista com total de usuários |
| RPC | `salvar_perfil_acesso(...)` | criação/edição atômica |
| RPC | `obter_meu_acesso()` | ganha `tem_perfil` |

## 8. Riscos e atenção

- **Catálogo quase vazio (decisão 2):** não é defeito — é efeito de só o `master_admin` gerir perfis e usuários. Comunicar ao cliente piloto que os perfis ganham opções conforme os módulos forem liberados.
- **Divergência config × banco:** o modo verificação no CI é a única proteção; não desligar.
- **Desempenho:** `tem_permissao` roda em toda policy de escrita de negócio — sempre envolvida em `(select …)` e coberta pelos índices de `perfil_permissoes` e `permissoes.chave`.

## 9. Status dos Entregáveis

| # | Entregável | STEP | Status |
|---|---|---|---|
| 1 | Catálogo de permissões, gerador e verificação no CI | 5.1 | ⬜ |
| 2 | Perfis: tabelas, RLS e auditoria por trigger | 5.2 | ⬜ |
| 3 | Vínculo do usuário ao perfil e funções de permissão | 5.3 | ⬜ |
| 4 | Permissões reais no frontend | 5.4 | ⬜ |
| 5 | Tela Perfis de Acesso (lista) | 5.5 | ⬜ |
| 6 | Editor de perfil | 5.6 | ⬜ |
| 7 | Roteiro ponta a ponta | 5.7 | ⬜ |
| 8 | Fechamento da fase | 5.8 | ⬜ |
