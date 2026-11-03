# Fase 7 — Gestão de Usuários

> Plano detalhado da Fase 7. Fase ativa e progresso: `@project_manager.md`. Schema: `@docs/plans/modelo-dados.md` (§5.2, §5.3).
> Convenções: `@frontend/CLAUDE.md`, `@supabase/CLAUDE.md` (§8 Edge Functions). Skill `frontend-design` nos STEPs de UI. TDD para Edge Functions e lógica de tela.

**Status:** ⬜ Não iniciada · **Depende de:** Fases 5 e 6 ✅ · **Libera:** Fase 8

---

## 1. Objetivo

Fechar a cascata de provisionamento do `CLAUDE.md §4` no nível da empresa: o **`master_admin`** cadastra e gerencia `admin` e `user` da própria empresa:
- cria usuários com perfil, unidade e setor (senha provisória, sem SMTP);
- edita dados, papel, e-mail, perfil e vínculos;
- reseta senha; ativa e desativa;
- vê quem está **sem perfil** (e, por isso, sem acesso);
- não consegue alterar o próprio cadastro de `master_admin` (imutável).

## 2. Pré-requisitos

- [ ] Fase 5 ✅ (perfis e `usePermissao` real) e Fase 6 ✅ (unidade/setor em `profiles`, seletor de registros).
- [ ] `provisionar-usuario` (Fases 1, 5, 6) e `resetar-senha` (Fase 4) com a cascata completa.

## 3. Decisões desta fase

| # | Decisão | Origem |
|---|---|---|
| 1 | Só o `master_admin` gerencia usuários — tela **restrita a papel**, fora do catálogo de perfis. | Etapa C + Fase 5 |
| 2 | O `master_admin` pode **mudar o papel** `admin` ↔ `user` (virar `admin` exige unidade). | Danilo |
| 3 | O `master_admin` pode **corrigir o e-mail**: a Edge Function atualiza o login no Auth (já confirmado) e o profile, encerra as sessões do usuário e audita antes/depois. | Danilo |
| 4 | Todas as alterações de usuário pela nova Edge Function **`gerenciar-usuario`** (atualizar, ativar, desativar) — `profiles` continua sem escrita pelo cliente (`CLAUDE.md §5`). | `supabase/CLAUDE.md §8` |
| 5 | Desativar **encerra as sessões** do usuário; os dados já são cortados na hora pela RLS. Nenhuma exclusão de usuário: só desativar/reativar. | Fase 1 + `modelo-dados.md §1.3` |
| 6 | Perfil **opcional** na criação, com aviso claro no formulário ("Sem perfil, o usuário só verá um aviso ao entrar"). Permite cadastrar a equipe antes de montar os perfis. | proposta |
| 7 | O `master_admin` aparece na lista (a equipe fica completa), mas em **modo leitura**, com a explicação de que o cadastro dele só é alterado pelo suporte do Maxis. Ninguém age sobre si mesmo nesta tela (a própria senha é trocada pelo menu do usuário). | `CLAUDE.md §4` |
| 8 | Lista lida direto de `profiles` pela RLS (com perfil, unidade e setor relacionados) — não há agregação, então não precisa de RPC. | proposta |
| 9 | Fora do escopo v1 (backlog): limite de usuários por empresa (assinatura/plano) e último acesso na lista. | proposta |

## 4. STEPs (na ordem; não pular)

### STEP 7.1 — Edge Function `gerenciar-usuario`
**Entrega:** todas as alterações de usuário, com as regras da cascata.
- [ ] **Testes primeiro** (`deno test` + integração local) — regras como módulo puro:

  | Ação | Entrada | Regras | Auditoria |
  |---|---|---|---|
  | `atualizar` | `profile_id` + campos alterados: nome, telefone, papel, e-mail, perfil, unidade, setor | papel só `admin` ↔ `user`; `admin` exige unidade; perfil, unidade e setor do **mesmo tenant** e ativos; e-mail único (409) | `usuario.atualizado` (antes/depois) |
  | `desativar` | `profile_id` | usuário ativo | `usuario.desativado` |
  | `reativar` | `profile_id` | usuário inativo | `usuario.ativado` |

  Para qualquer ação: chamador `master_admin` ativo de empresa ativa; alvo `admin`/`user` do **próprio** tenant. Alvo `master_admin`, `super_admin` ou o próprio chamador → 403; alvo inexistente ou de outro tenant → 404 (não revela existência).
- [ ] Mudança de e-mail (decisão 3): Auth + profile na mesma operação, com compensação se a segunda parte falhar; sessões encerradas
- [ ] Desativar (decisão 5): `ativo = false` + sessões encerradas
- [ ] Integração: desativar usuário do seed → próxima consulta dele volta vazia e `obter_meu_acesso()` informa inativo; trocar e-mail → login antigo falha e o novo funciona; promover `user` a `admin` sem unidade → 400

**Verificação:** unidade + integração verdes; logs sem dados sensíveis.

### STEP 7.2 — Usuários no menu e consulta da lista
**Entrega:** a rota e a fonte de dados da tela.
- [ ] Objeto de menu: funcionalidade `usuarios` disponível em `configuracoes` (restrita a `master_admin`), aba `lista`. Rota `/configuracoes/usuarios/lista`
- [ ] Repositório da lista: `profiles` do tenant com perfil, unidade e setor; filtros por papel, perfil, unidade, setor, situação e "sem perfil"; busca por nome ou e-mail; paginação no servidor
- [ ] **Testes primeiro** (repositório com Supabase simulado): filtros e busca viram a consulta certa; `admin`/`user` não acessam a rota

**Verificação:** testes verdes.

### STEP 7.3 — Tela Usuários (lista)
**Entrega:** a visão da equipe da empresa.
- [ ] Colunas: nome, e-mail, papel (mapa de exibição), perfil (ou selo de atenção **"Sem perfil"**), unidade, setor, situação; selo "Aguardando primeiro acesso" para quem ainda está com senha provisória
- [ ] Destaque no topo quando houver usuários sem perfil ("{n} usuários sem perfil não conseguem acessar o sistema" + filtro direto para eles)
- [ ] Linha do `master_admin` em modo leitura (decisão 7)
- [ ] Ação principal "Cadastrar usuário"; vazio orientado
- [ ] **Testes** (RTL): selos corretos; destaque de "sem perfil" com contagem e filtro; linha do master sem ações

**Verificação:** testes verdes; checklist de tela.

### STEP 7.4 — Cadastro de usuário
**Entrega:** um colaborador com acesso em um fluxo.
- [ ] Formulário (react-hook-form + zod): nome, e-mail, telefone (opcional), papel (`admin`/`user`), perfil (opcional, com aviso — decisão 6), unidade (obrigatória para `admin`), setor — seletores da Fase 6 (só ativos)
- [ ] Envio → `provisionar-usuario` → `SenhaProvisoria` (Fase 4): exibida uma vez, com "Copiar senha" e "Copiar mensagem"
- [ ] **Testes primeiro** (RTL): unidade passa a ser obrigatória ao escolher `admin`; e-mail duplicado (409) vira erro no campo; sem perfil mostra o aviso; sucesso mostra a senha uma vez e atualiza a lista

**Verificação:** testes verdes; fluxo completo no ambiente local.

### STEP 7.5 — Painel do usuário
**Entrega:** tudo sobre um usuário, num lugar só.
- [ ] Painel `/configuracoes/usuarios/lista/<id>`: dados, papel, perfil, unidade, setor, situação, se ainda aguarda o primeiro acesso, vínculo de líder (se houver), últimos eventos de auditoria do usuário
- [ ] Ações: "Editar" (todos os campos da decisão 2 e 3, com confirmação extra ao trocar e-mail: "O usuário passa a entrar com o novo e-mail e a sessão atual é encerrada."), "Resetar senha" (`resetar-senha` → `SenhaProvisoria`), "Desativar usuário" / "Reativar usuário" (confirmação)
- [ ] Painel do `master_admin`: só leitura (decisão 7)
- [ ] **Testes primeiro** (RTL): cada ação chama a função certa, confirma com o mesmo verbo e atualiza lista e painel; erros traduzidos; nenhuma ação no painel do master

**Verificação:** testes verdes; checklist de tela; conferência visual em 1280px e 360px.

### STEP 7.6 — Roteiro ponta a ponta 📋
- [ ] 📋 Local: `master_admin` cadastra um `user` sem perfil → login do user com a senha provisória → troca obrigatória → `/sem-perfil` → `master_admin` vincula um perfil → o user passa a ver as telas do perfil (em até 5 min)
- [ ] 📋 Promover o user a `admin` (exige unidade); corrigir o e-mail (login antigo falha, novo funciona); resetar a senha (sessão encerrada, troca obrigatória de novo); desativar (acesso suspenso); reativar
- [ ] 📋 Tentativas proibidas pela API: `master_admin` da empresa A alterando usuário da B; `admin` chamando `gerenciar-usuario`; alteração do próprio `master_admin` — todas negadas
- [ ] Eventos `usuario.*` conferidos na auditoria, sem senha

**Verificação:** roteiro registrado no log do `project_manager.md`.

### STEP 7.7 — Fechamento da fase
- [ ] `modelo-dados.md` conferido contra o banco real; tipos regenerados
- [ ] `project_manager.md`: entregáveis ✅, Fase 7 ✅, progresso, log; fase ativa → Fase 8

## 5. Critérios de aceite da fase

1. Só o `master_admin` da própria empresa cria, edita, reseta, desativa e reativa `admin`/`user` — provado na Edge Function, na API e na tela.
2. `master_admin` e `super_admin` nunca são alterados por esta tela nem pela `gerenciar-usuario`; ninguém age sobre si mesmo.
3. Criação gera senha provisória exibida uma vez; o primeiro login exige a troca.
4. Mudança de papel respeita "`admin` exige unidade"; perfil, unidade e setor sempre do mesmo tenant e ativos.
5. Correção de e-mail troca o login, encerra as sessões e fica auditada.
6. Desativar corta os dados na hora e encerra as sessões; reativar devolve o acesso.
7. Usuários sem perfil ficam evidentes na lista, com contagem e filtro.
8. Toda ação gera evento `usuario.*` na auditoria, nunca com senha.
9. Telas aprovadas no checklist de tela e na conferência visual.

## 6. Modelagem de dados afetada

**Nenhuma tabela ou coluna nova.** A fase escreve em `profiles` (§5.2) só por Edge Function (`provisionar-usuario`, `gerenciar-usuario`, `resetar-senha`) e usa as ações de auditoria já previstas em §5.3 (`usuario.criado`, `usuario.atualizado`, `usuario.senha_resetada`, `usuario.ativado`, `usuario.desativado`).

## 7. Rotas, Edge Functions e RPCs

| Tipo | Item | Observação |
|---|---|---|
| Rota | `/configuracoes/usuarios/lista` | lista de usuários (só `master_admin`) |
| Rota | `/configuracoes/usuarios/lista/<id>` | painel do usuário |
| Edge Function | `gerenciar-usuario` | nova: atualizar, desativar, reativar |
| Edge Function | `provisionar-usuario` | criação com perfil, unidade e setor |
| Edge Function | `resetar-senha` | reset pelo `master_admin` (regras desde a Fase 4) |
| RPC | — | nenhuma nova |

**Textos propostos (revisar na aprovação)**

| Situação | Texto |
|---|---|
| Ação principal | "Cadastrar usuário" → "Usuário cadastrado" |
| Sem perfil (selo) | "Sem perfil" |
| Destaque | "{n} usuários sem perfil não conseguem acessar o sistema." · "Ver usuários sem perfil" |
| Aviso no formulário | "Sem perfil, o usuário só verá um aviso ao entrar." |
| Troca de e-mail | "O usuário passa a entrar com o novo e-mail e a sessão atual é encerrada." |
| Desativar | "Desativar {nome}?" · "O acesso é suspenso na hora e a sessão atual é encerrada." · "Desativar usuário" → "Usuário desativado" |
| Reativar | "Reativar usuário" → "Usuário reativado" |
| Master em leitura | "O administrador master só é alterado pelo suporte do Maxis." |

## 8. Riscos e atenção

- **Troca de e-mail em duas partes (Auth + profile):** a compensação precisa de teste próprio — e-mail divergente entre Auth e profile quebraria a listagem e a auditoria.
- **Cache de permissões do usuário alterado:** a mudança de perfil vale na hora no banco; a tela dele atualiza em até 5 min (Fase 5). Aceito.
- **Limite de usuários por plano:** fora da v1 (decisão 9); se o modelo comercial exigir antes, entra como fase própria com `empresas` e o Admin SaaS.

## 9. Status dos Entregáveis

| # | Entregável | STEP | Status |
|---|---|---|---|
| 1 | Edge Function `gerenciar-usuario` | 7.1 | ⬜ |
| 2 | Usuários no menu e consulta da lista | 7.2 | ⬜ |
| 3 | Tela Usuários (lista) | 7.3 | ⬜ |
| 4 | Cadastro de usuário | 7.4 | ⬜ |
| 5 | Painel do usuário | 7.5 | ⬜ |
| 6 | Roteiro ponta a ponta | 7.6 | ⬜ |
| 7 | Fechamento da fase | 7.7 | ⬜ |
