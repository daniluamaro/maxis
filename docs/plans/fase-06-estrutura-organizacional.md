# Fase 6 — Estrutura Organizacional

> Plano detalhado da Fase 6. Fase ativa e progresso: `@project_manager.md`. Schema: `@docs/plans/modelo-dados.md` (§5.2, §7).
> Convenções: `@frontend/CLAUDE.md`, `@supabase/CLAUDE.md`. Skill `frontend-design` nos STEPs de UI. TDD para tabelas, RLS, funções e lógica de tela.

**Status:** ⬜ Não iniciada · **Depende de:** Fase 5 ✅ · **Libera:** Fase 7

---

## 1. Objetivo

Dar a cada empresa a sua estrutura — **unidades gerenciais, setores e líderes** — que todas as tabelas de negócio vão referenciar como atributo de filtro e relatório (`CLAUDE.md §4`: não é barreira de RLS na v1). E, com isso:
- `profiles` ganha unidade e setor (`admin` com unidade obrigatória);
- o catálogo de permissões recebe os **primeiros itens concedíveis reais**;
- nasce o seletor de registros reutilizado no cadastro de usuários (Fase 7).

## 2. Pré-requisitos

- [ ] Fase 5 ✅ (catálogo gerado do config, `tem_permissao`, editor de perfis, auditoria por trigger).

## 3. Decisões desta fase

| # | Decisão | Origem |
|---|---|---|
| 1 | Unidade gerencial: **nome, código (opcional), cidade e UF**. Endereço completo e CNPJ de filial ficam no backlog. | Danilo |
| 2 | Líder: **uma unidade e um setor, ambos obrigatórios**. Quem lidera dois setores tem dois cadastros de líder. | Danilo |
| 3 | Desativar unidade ou setor com vínculos ativos é **permitido, com aviso** prévio de quantos vínculos existem. Os vínculos atuais continuam (histórico); o item inativo some das opções de **novos** vínculos. | Danilo |
| 4 | Cidade e UF **obrigatórias** (toda unidade tem localização); UF validada contra as 27 siglas. Cidade em texto livre na v1 (sem tabela de municípios). | proposta |
| 5 | Escrita na estrutura: `master_admin` **e** quem tiver a permissão `configuracoes.estrutura.<aba>.edit` — via `private.tem_permissao` (já verdadeiro para o `master_admin`). Estrutura é **concedível** por perfil. | `modelo-dados.md §7` |
| 6 | Nenhuma exclusão física: desativar e reativar. | `modelo-dados.md §1.3` |
| 7 | Vínculo novo (usuário ou líder) só com unidade e setor **ativos** — garantido por trigger no banco, não só na tela. | proposta |
| 8 | Funcionalidade **Estrutura Organizacional** com três abas: Unidades, Setores, Líderes. | `fase-03 §4` |

## 4. STEPs (na ordem; não pular)

### STEP 6.1 — `unidades_gerenciais` e `setores`
**Entrega:** as duas tabelas-base da estrutura, com isolamento e regras provadas.
- [ ] **Testes primeiro (pgTAP):**
  - casos mínimos de `supabase/CLAUDE.md §7` (tenant A × B, inativo, empresa bloqueada, `anon`);
  - leitura por qualquer usuário ativo do tenant; inserção e alteração só com `…unidades.edit` / `…setores.edit` ou `master_admin`; **nenhuma** exclusão;
  - nome único por tenant (sem diferenciar maiúsculas); código único por tenant quando preenchido; UF válida (decisão 4);
  - desativar e reativar geram `unidade_gerencial.desativada` / `.reativada` (e equivalentes de setor); criar e alterar geram `.criada` / `.atualizada` — com ator = usuário logado
- [ ] Migration `f06_cria_unidades_setores`: tabelas conforme `modelo-dados.md §7.1–7.2`, `unique (tenant_id, id)`, índices, triggers (`updated_at`, `private.registrar_auditoria()`), RLS, policies (`…_select_tenant`, `…_insert_permissao`, `…_update_permissao`), grants `select/insert/update`
- [ ] RPCs `listar_unidades_gerenciais(busca, situacao)` e `listar_setores(busca, situacao)` (`security invoker`) com contagem de usuários e líderes ativos vinculados

**Verificação:** testes verdes; advisors sem alerta.

### STEP 6.2 — `lideres`
**Entrega:** o cadastro de líderes, com ou sem login.
- [ ] **Testes primeiro (pgTAP):**
  - casos mínimos de isolamento; escrita só com `…lideres.edit` ou `master_admin`; sem exclusão;
  - unidade e setor obrigatórios (decisão 2) e **ativos** no momento do vínculo (decisão 7);
  - `profile_id` opcional, do **mesmo tenant**, e no máximo um líder por usuário;
  - auditoria `lider.criado` / `.atualizado` / `.desativado` / `.reativado`
- [ ] Migration `f06_cria_lideres`: tabela conforme `modelo-dados.md §7.3`, FKs compostas, índices `(tenant_id, unidade_gerencial_id)`, `(tenant_id, setor_id)`, trigger de vínculo ativo, auditoria, RLS, policies, grants

**Verificação:** testes verdes.

### STEP 6.3 — Unidade e setor no usuário
**Entrega:** `profiles` passa a carregar a estrutura.
- [ ] **Testes primeiro (pgTAP):** `admin` sem unidade é recusado; `master_admin`/`super_admin` com unidade ou setor são recusados; `user` com ou sem; vínculo novo só com unidade/setor ativos; FK composta impede unidade de outro tenant
- [ ] Migration `f06_vincula_profiles_estrutura`: colunas `profiles.unidade_gerencial_id` e `profiles.setor_id` (FKs compostas), `check`s por papel (`modelo-dados.md §5.2`), trigger de vínculo ativo, índices
- [ ] **Segurança da migration:** antes de criar o `check` do `admin`, verificar se existe `admin` sem unidade; se existir, a migration **falha com mensagem clara** (corrigir os dados primeiro) — nunca inventar unidade
- [ ] `provisionar-usuario` aceita `unidade_gerencial_id` (obrigatória para `admin`) e `setor_id`, do mesmo tenant e ativos — testes de unidade e integração atualizados
- [ ] Seed local atualizado (unidades, setores e líderes nas empresas fictícias; `admin` com unidade)

**Verificação:** testes verdes; `db reset` com o seed novo sem erro.

### STEP 6.4 — Estrutura no menu e no catálogo
**Entrega:** os primeiros itens reais concedíveis por perfil.
- [ ] Objeto de menu: funcionalidade `estrutura` disponível em `configuracoes`, abas `unidades`, `setores`, `lideres` (concedíveis). Rotas `/configuracoes/estrutura/unidades|setores|lideres`
- [ ] Migration de catálogo regenerada pelo gerador da Fase 5; verificação do CI verde
- [ ] Editor de perfis mostra a estrutura com Visualizar/Editar por aba (teste com o catálogo real)

**Verificação:** chaves `configuracoes.estrutura.<aba>.view|edit` presentes no banco; CI de verificação verde.

### STEP 6.5 — Seletor de registros
**Entrega:** o campo de escolha reutilizável (unidade, setor, usuário…), usado aqui e na Fase 7.
- [ ] Combobox com busca, só itens **ativos** como opção; se o valor atual estiver inativo, aparece marcado como "Inativo" (sem sumir do formulário)
- [ ] Integração com react-hook-form + zod; estados de carregando/vazio/erro; acessível por teclado e leitor de tela
- [ ] **Testes primeiro** (RTL): busca, seleção, valor inativo exibido, teclado

**Verificação:** testes verdes.

### STEP 6.6 — Tela Unidades
**Entrega:** gestão das unidades gerenciais.
- [ ] Lista: nome, código, cidade/UF, usuários e líderes ativos vinculados (fonte mono), situação (selo), atualizado em; busca e filtro de situação; ação "Cadastrar unidade" (só com `edit`)
- [ ] Painel `/configuracoes/estrutura/unidades/<id>`: dados, vínculos, ações "Editar", "Desativar unidade" (aviso com a contagem de vínculos — decisão 3) / "Reativar unidade"
- [ ] Sem `edit`: tela em modo leitura (sem ações)
- [ ] **Testes primeiro** (RTL): validações (UF, nome e código duplicados como erro no campo), aviso de desativação com contagem, modo leitura

**Verificação:** testes verdes; checklist de tela.

### STEP 6.7 — Tela Setores
**Entrega:** gestão dos setores, no mesmo padrão.
- [ ] Lista, painel, cadastrar/editar, desativar com aviso / reativar, modo leitura — mesmo padrão do STEP 6.6
- [ ] **Testes primeiro** (RTL)

**Verificação:** testes verdes; checklist de tela.

### STEP 6.8 — Tela Líderes
**Entrega:** gestão dos líderes, com ou sem login.
- [ ] Lista: nome, unidade, setor, usuário vinculado (ou "Sem acesso ao sistema"), situação; filtros por unidade, setor e situação
- [ ] Painel: nome, telefone, unidade e setor (seletores, só ativos), usuário vinculado opcional (seletor de usuários do tenant ainda não vinculados a outro líder)
- [ ] **Testes primeiro** (RTL): unidade/setor obrigatórios; usuário já vinculado a outro líder não aparece; modo leitura

**Verificação:** testes verdes; checklist de tela; conferência visual das três abas em 1280px e 360px.

### STEP 6.9 — Roteiro ponta a ponta 📋
- [ ] 📋 Local: `master_admin` cadastra unidades, setores e líderes → cria perfil "Supervisão" com Estrutura só **Visualizar** → vincula a um `user` → o `user` vê as três abas sem ações → perfil com **Editar** em Setores para um `admin` → o `admin` edita só setores
- [ ] 📋 Desativar uma unidade com vínculos mostra a contagem; depois ela não aparece como opção em novos vínculos, e os vínculos antigos continuam
- [ ] Eventos de auditoria da estrutura conferidos

**Verificação:** roteiro registrado no log do `project_manager.md`.

### STEP 6.10 — Fechamento da fase
- [ ] Tipos do frontend regenerados; `modelo-dados.md` conferido contra o banco real
- [ ] `project_manager.md`: entregáveis ✅, Fase 6 ✅, progresso, log; fase ativa → Fase 7

## 5. Critérios de aceite da fase

1. Unidades, setores e líderes isolados por tenant, com os casos mínimos de teste verdes.
2. Escrita só com `master_admin` ou permissão `…edit` da aba — provada no banco e refletida na tela (modo leitura).
3. Nenhuma exclusão física; desativar/reativar com aviso de vínculos.
4. Vínculo novo só com unidade e setor ativos — garantido no banco.
5. `admin` sempre com unidade; `master_admin` e `super_admin` sem unidade/setor.
6. Líder sempre com unidade e setor; no máximo um líder por usuário.
7. Catálogo com as chaves da Estrutura; editor de perfis as oferece.
8. Toda alteração na estrutura gera evento de auditoria pelo trigger.
9. Seletor de registros pronto e testado para a Fase 7.
10. Telas aprovadas no checklist de tela e na conferência visual.

## 6. Modelagem de dados afetada

Atualizado no `modelo-dados.md` junto com este plano:
- §7.1 `unidades_gerenciais`: `cidade` e `uf` obrigatórias (UF validada); endereço e CNPJ de filial no backlog.
- §7.3 `lideres`: unidade e setor obrigatórios; um setor por cadastro.
- §7: vínculo novo só com unidade/setor ativos (trigger).
- §5.2 `profiles`: `unidade_gerencial_id`, `setor_id` e `check`s por papel (já previstos).
- §5.3: ações de auditoria da estrutura.
- §4: RPCs `listar_unidades_gerenciais` e `listar_setores`.

## 7. Rotas, Edge Functions e RPCs

| Tipo | Item | Observação |
|---|---|---|
| Rota | `/configuracoes/estrutura/unidades[/<id>]` | lista e painel de unidades |
| Rota | `/configuracoes/estrutura/setores[/<id>]` | lista e painel de setores |
| Rota | `/configuracoes/estrutura/lideres[/<id>]` | lista e painel de líderes |
| Edge Function | `provisionar-usuario` | passa a aceitar unidade e setor |
| RPC | `listar_unidades_gerenciais(busca, situacao)` | com contagem de vínculos |
| RPC | `listar_setores(busca, situacao)` | com contagem de vínculos |

**Textos propostos (revisar na aprovação)**

| Situação | Texto |
|---|---|
| Ações principais | "Cadastrar unidade" / "Cadastrar setor" / "Cadastrar líder" → "Unidade cadastrada" / "Setor cadastrado" / "Líder cadastrado" |
| Aviso de desativação | "Desativar {nome}?" · "{n} usuários e {m} líderes estão vinculados. Eles continuam vinculados, mas a unidade deixa de aparecer em novos cadastros." · "Desativar unidade" → "Unidade desativada" |
| Reativar | "Reativar unidade" → "Unidade reativada" |
| Líder sem login | "Sem acesso ao sistema" |
| Opção inativa | selo "Inativo" |
| Vazio | "Nenhuma unidade cadastrada" · "Cadastre as unidades da empresa para organizar usuários, líderes e relatórios." |

## 8. Riscos e atenção

- **Migration do `check` do `admin` (STEP 6.3):** em produção pode existir `admin` criado pela API antes desta fase. A migration falha de propósito em vez de corromper dado — conferir via MCP antes do merge.
- **Contagens nas listas:** feitas no Postgres (RPCs), nunca somando linhas no browser.
- **Desativação não é exclusão:** relatórios futuros precisam tratar unidade/setor inativos como válidos para o histórico.

## 9. Status dos Entregáveis

| # | Entregável | STEP | Status |
|---|---|---|---|
| 1 | `unidades_gerenciais` e `setores` + RPCs de listagem | 6.1 | ⬜ |
| 2 | `lideres` | 6.2 | ⬜ |
| 3 | Unidade e setor no usuário (+ `provisionar-usuario`) | 6.3 | ⬜ |
| 4 | Estrutura no menu e no catálogo | 6.4 | ⬜ |
| 5 | Seletor de registros | 6.5 | ⬜ |
| 6 | Tela Unidades | 6.6 | ⬜ |
| 7 | Tela Setores | 6.7 | ⬜ |
| 8 | Tela Líderes | 6.8 | ⬜ |
| 9 | Roteiro ponta a ponta | 6.9 | ⬜ |
| 10 | Fechamento da fase | 6.10 | ⬜ |
