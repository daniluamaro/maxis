# Fase 4 — Admin SaaS (super_admin)

> Plano detalhado da Fase 4. Fase ativa e progresso: `@project_manager.md`. Schema: `@docs/plans/modelo-dados.md` (§4, §5).
> Convenções: `@frontend/CLAUDE.md`, `@supabase/CLAUDE.md`. Skill `frontend-design` nos STEPs de UI. TDD para RPC, Edge Functions e lógica de tela.

**Status:** ⬜ Não iniciada · **Depende de:** Fase 3 ✅ · **Libera:** Fase 5

---

## 1. Objetivo

Dar ao `super_admin` a tela exclusiva **Admin SaaS** para operar a base de clientes, conforme o `CLAUDE.md §4`:
- cadastrar, editar, bloquear e desbloquear empresas (CNPJ);
- criar o `master_admin` de cada empresa (senha provisória, sem SMTP);
- resetar a senha do `master_admin`.

De quebra, a fase cria os **componentes de dados reutilizáveis** (tabela, filtros, painel de registro, confirmação, exibição de senha provisória) que as Fases 5–7 vão usar.

## 2. Pré-requisitos

- [ ] Fase 3 ✅ (shell, objeto de menu, rotas geradas, componentes de estado).
- [ ] `provisionar-usuario` e o código compartilhado das Edge Functions (Fase 1).

## 3. Decisões desta fase

| # | Decisão | Origem |
|---|---|---|
| 1 | **Registro abre em painel lateral, com o id como 4º segmento opcional da rota:** `/modulo/funcionalidade/aba/<id>`. Deep link e refresh reabrem o painel; fechar volta à lista. Vira convenção para todo cadastro. Ajuste no `CLAUDE.md §6` e no `frontend/CLAUDE.md §4` (pendência de governança #8). | Danilo |
| 2 | Tabela própria fina sobre o primitivo Table do shadcn — **sem nova biblioteca** de tabela. Paginação e busca no servidor. | proposta |
| 3 | Lista vem da RPC `listar_empresas_admin()` (`security definer`, justificado): o `super_admin` precisa do **total de usuários ativos** por empresa sem ganhar leitura sobre os profiles de tenant (a RLS só lhe mostra os `master_admin`). | proposta |
| 4 | CNPJ **editável** pelo `super_admin` (correção de digitação), com validação, unicidade e registro de antes/depois em `eventos_auditoria`. | proposta |
| 5 | Bloqueio exige **motivo**. Não é preciso encerrar sessões: a RLS corta os dados na hora e a tela muda em até 5 min (Fase 2). | proposta |
| 6 | Senha provisória exibida **uma única vez**, com "Copiar senha" e "Copiar mensagem" (texto pronto para colar no WhatsApp). **Sem link `wa.me`**: a senha iria parar no histórico do navegador. | proposta |
| 7 | Cadastro de empresa e do `master_admin` num fluxo só, em duas etapas. Se a segunda falhar, a empresa fica "Sem administrador master", com ação para criá-lo depois — estado válido, não erro. | proposta |
| 8 | `resetar-senha` nasce com a **cascata completa** (`super_admin` → `master_admin`; `master_admin` → `admin`/`user` do próprio tenant). A tela do `master_admin` chega na Fase 7. | roadmap |
| 9 | Para o `super_admin`, `/` redireciona para o Admin SaaS (ajuste na tabela de destinos da Fase 2). | `frontend/CLAUDE.md §4` |
| 10 | Fora do escopo v1 (backlog): troca do titular (`master_admin`) de uma empresa e edição dos dados dele. | roadmap |

## 4. STEPs (na ordem; não pular)

### STEP 4.1 — Componentes de dados reutilizáveis
**Entrega:** o kit de lista e registro que todo cadastro vai usar.
- [ ] **Testes primeiro** (RTL + roteador em memória)
- [ ] Gerador de rotas (Fase 3) aceita o segmento opcional `/<id>` (decisão 1); deep link com id abre o painel; id inexistente → estado "registro não encontrado" no painel
- [ ] `DataTable`: colunas tipadas, paginação no servidor, ordenação quando a fonte permitir, skeleton/vazio/erro de `components/feedback`, números e datas por `lib/format` em fonte mono, rolagem horizontal no próprio contêiner
- [ ] Barra de filtros: busca com espera de digitação e filtros simples, refletidos no estado da consulta
- [ ] `PainelRegistro`: painel lateral ligado ao segmento `/<id>`; fechar = voltar para a lista mantendo filtros; foco preso no painel enquanto aberto; Esc fecha
- [ ] `DialogoConfirmacao`: título e botão com o verbo da ação; campo de motivo opcional ou obrigatório

**Verificação:** testes verdes; checklist de tela nos itens aplicáveis.

### STEP 4.2 — CNPJ no cliente e exibição de senha provisória
**Entrega:** os dois utilitários sensíveis do Admin SaaS.
- [ ] **Testes primeiro:** formatação (`12.345.678/0001-90`), máscara de digitação e validação de CNPJ no cliente — **mesma lista de casos** usada no teste de `private.cnpj_valido` (Fase 1), para as duas pontas concordarem
- [ ] Componente `SenhaProvisoria` (decisão 6): senha em fonte mono, "Copiar senha", "Copiar mensagem" (link do sistema, e-mail, senha e aviso de troca no 1º acesso), aviso "Esta senha não será mostrada de novo."; confirmação ao fechar
- [ ] Testes (RTL): copiar coloca o texto certo na área de transferência; fechar exige confirmação; nada é persistido

**Verificação:** testes verdes.

### STEP 4.3 — RPC `listar_empresas_admin()`
**Entrega:** a fonte da lista de empresas.
- [ ] **Testes primeiro (pgTAP):**
  - só `super_admin` executa — usuário de tenant e `anon` recebem erro de permissão;
  - retorna dados da empresa, `master_admin` (id, nome, e-mail, se ainda está com senha provisória) e **total de usuários ativos** corretos;
  - busca por razão social, nome fantasia ou dígitos do CNPJ; filtro por situação (ativas/bloqueadas);
  - paginação estável com total de registros
- [ ] Migration `f04_cria_rpc_listar_empresas_admin`: função `security definer` (decisão 3), `search_path` vazio, checagem de `is_super_admin()` como primeira instrução; `execute` só para `authenticated`
- [ ] `modelo-dados.md` já atualizado com esta RPC (junto com este plano)

**Verificação:** testes verdes; advisors sem alerta (definer justificado no PR).

### STEP 4.4 — Edge Function `gerenciar-empresa`
**Entrega:** todas as escritas em `empresas`.
- [ ] **Testes primeiro** (`deno test` + integração local):

  | Ação | Entrada | Regras | Auditoria |
  |---|---|---|---|
  | `criar` | razão social, nome fantasia?, CNPJ | só `super_admin`; CNPJ válido e único (409) | `empresa.criada` |
  | `atualizar` | id + campos alterados | CNPJ válido e único; empresa existe (404) | `empresa.atualizada` (antes/depois) |
  | `bloquear` | id, motivo (obrigatório) | empresa ativa | `empresa.bloqueada` (motivo) |
  | `desbloquear` | id | empresa bloqueada | `empresa.desbloqueada` |

  Qualquer chamador que não seja `super_admin` ativo → 403.
- [ ] Handler fino sobre módulo puro, seguindo o fluxo de `supabase/CLAUDE.md §8`
- [ ] Integração: bloquear empresa do seed → usuário dela passa a receber zero linhas e `obter_meu_acesso()` informa empresa bloqueada; desbloquear restaura

**Verificação:** unidade + integração verdes.

### STEP 4.5 — Edge Function `resetar-senha`
**Entrega:** reset de senha em cascata, sem SMTP.
- [ ] **Testes primeiro** — cascata como módulo puro:

  | Chamador | Alvo permitido | Falha |
  |---|---|---|
  | `super_admin` | `master_admin` de qualquer empresa | — |
  | `master_admin` | `admin`/`user` do **próprio** tenant | o próprio `master_admin` (usa `trocar-senha`) → 403 |
  | qualquer | — | alvo `super_admin` → 403 |
  | `admin`, `user`, inativo | nada | 403 |
  | qualquer | alvo inexistente ou de outro tenant | 404 (não revela existência) |

- [ ] Efeitos: nova senha provisória (gerador da Fase 1) → troca no Auth → `senha_provisoria = true` → **encerra as sessões do alvo** → `usuario.senha_resetada` (sem a senha) → resposta com a senha uma única vez
- [ ] Integração: após o reset, a sessão antiga do alvo é encerrada e o próximo login cai em `/trocar-senha`

**Verificação:** unidade + integração verdes; logs sem senha.

### STEP 4.6 — Tela Empresas (lista)
**Entrega:** a visão geral da base de clientes.
- [ ] Objeto de menu: `admin_saas` disponível, funcionalidade `empresas`, aba `lista` (aba única → sem barra de abas). Rota `/admin-saas/empresas/lista`
- [ ] `/` do `super_admin` redireciona para cá (decisão 9; teste da tabela de destinos atualizado)
- [ ] Colunas: empresa (nome fantasia, com a razão social de apoio), CNPJ formatado, administrador master (nome ou selo "Sem administrador master"; selo "Aguardando primeiro acesso" se ainda com senha provisória), usuários ativos, situação (selo funcional: ativa / bloqueada), cadastrada em
- [ ] Busca e filtro de situação; paginação; ação principal "Cadastrar empresa"
- [ ] Estado vazio orientado ("Nenhuma empresa cadastrada" + "Cadastrar empresa")
- [ ] **Testes** (RTL): colunas formatadas; busca e filtro refletem na consulta; selos corretos; vazio e erro

**Verificação:** testes verdes; checklist de tela; conferência visual em 1280px e 360px.

### STEP 4.7 — Cadastro de empresa e do administrador master
**Entrega:** um cliente novo pronto para usar o Maxis em um fluxo.
- [ ] Etapa 1 — empresa: razão social, nome fantasia, CNPJ (máscara + validação no campo) → `gerenciar-empresa/criar`
- [ ] Etapa 2 — administrador master: nome, e-mail, telefone (opcional) → `provisionar-usuario` → `SenhaProvisoria`
- [ ] Falha na etapa 2 → empresa fica "Sem administrador master", com mensagem clara e ação para tentar de novo (decisão 7)
- [ ] **Testes primeiro** (RTL): validações por campo; CNPJ duplicado (409) vira erro no campo; fluxo completo mostra a senha uma vez; falha na etapa 2 deixa a empresa listada sem master

**Verificação:** testes verdes; fluxo completo no ambiente local.

### STEP 4.8 — Painel da empresa
**Entrega:** tudo sobre uma empresa, num lugar só.
- [ ] Painel em `/admin-saas/empresas/lista/<id>`: dados da empresa, situação (com motivo e data do bloqueio), administrador master, últimos eventos de auditoria da empresa (leitura direta pela RLS do `super_admin`)
- [ ] Ações: "Editar dados" (decisão 4), "Bloquear empresa" (confirmação com motivo obrigatório) / "Desbloquear empresa", "Criar administrador master" (quando não houver) ou "Resetar senha" do master (confirmação → `SenhaProvisoria`)
- [ ] **Testes primeiro** (RTL): cada ação chama a função certa, atualiza lista e painel (invalidação das consultas) e confirma com o mesmo verbo; erros traduzidos

**Verificação:** testes verdes; checklist de tela.

### STEP 4.9 — Roteiro ponta a ponta 📋
- [ ] 📋 Local: cadastrar empresa + master → login do master com senha provisória → troca obrigatória → Home; bloquear a empresa com o master logado → tela de acesso suspenso em até 5 min; desbloquear → acesso volta; resetar senha do master → sessão encerrada → novo login cai na troca obrigatória
- [ ] 📋 Produção: Danilo cadastra a primeira empresa real (ou piloto) e entrega o acesso ao master
- [ ] Conferência via MCP (somente leitura): eventos de auditoria gravados para cada ação, sem senha em `detalhes`

**Verificação:** roteiro registrado no log do `project_manager.md` (sem dados pessoais).

### STEP 4.10 — Fechamento da fase
- [ ] Pendência de governança #8 aplicada no `CLAUDE.md §6` e no `frontend/CLAUDE.md §4` *(sob autorização)*
- [ ] Tipos do frontend regenerados; `modelo-dados.md` conferido contra o banco real
- [ ] `project_manager.md`: entregáveis ✅, Fase 4 ✅, progresso, log; fase ativa → Fase 5

## 5. Critérios de aceite da fase

1. Só o `super_admin` acessa o Admin SaaS (tela, RPC e Edge Functions) — provado por teste em cada camada.
2. Cadastrar, editar, bloquear e desbloquear empresa funcionam; CNPJ inválido ou duplicado é recusado no campo e no servidor.
3. Bloquear uma empresa corta os dados de todos os usuários dela na hora e leva quem estiver logado à tela de acesso suspenso em até 5 min.
4. Criação do `master_admin` gera senha provisória exibida uma única vez; o primeiro login exige a troca.
5. Reset de senha do `master_admin` encerra as sessões dele e força nova troca.
6. `resetar-senha` cobre a cascata completa em testes (inclusive os casos da Fase 7).
7. Toda ação grava em `eventos_auditoria`, nunca com senha.
8. Registro abre em painel com o id na rota; deep link e refresh reabrem o painel.
9. Lista com busca, filtro e paginação no servidor; estados vazio, carregando e erro.
10. Telas aprovadas no checklist de tela e na conferência visual (1280px e 360px).

## 6. Modelagem de dados afetada

- **Nova RPC:** `listar_empresas_admin()` — registrada em `modelo-dados.md §4` junto com este plano.
- Escritas em `empresas` (§5.1) e em `profiles` (§5.2, via `provisionar-usuario` e `resetar-senha`) só por Edge Function.
- Ações de auditoria usadas: `empresa.criada`, `empresa.atualizada`, `empresa.bloqueada`, `empresa.desbloqueada`, `usuario.criado`, `usuario.senha_resetada` (§5.3).
- Nenhuma tabela ou coluna nova.

## 7. Rotas, Edge Functions e RPCs

| Tipo | Item | Observação |
|---|---|---|
| Rota | `/admin-saas/empresas/lista` | lista de empresas (só `super_admin`) |
| Rota | `/admin-saas/empresas/lista/<id>` | painel da empresa |
| Edge Function | `gerenciar-empresa` | criar, atualizar, bloquear, desbloquear |
| Edge Function | `provisionar-usuario` (Fase 1) | criação do `master_admin` |
| Edge Function | `resetar-senha` | nova nesta fase; cascata completa |
| RPC | `listar_empresas_admin()` | nova nesta fase |

**Textos propostos (revisar na aprovação)**

| Situação | Texto |
|---|---|
| Ação principal | "Cadastrar empresa" → "Empresa cadastrada" |
| Sem master | selo "Sem administrador master" · ação "Criar administrador master" |
| Master sem 1º acesso | selo "Aguardando primeiro acesso" |
| Confirmar bloqueio | "Bloquear {empresa}?" · "Todos os usuários da empresa perdem o acesso na hora." · botão "Bloquear empresa" → "Empresa bloqueada" |
| Desbloquear | "Desbloquear empresa" → "Empresa desbloqueada" |
| Confirmar reset | "Resetar a senha de {nome}?" · "A sessão atual será encerrada e uma nova senha provisória será gerada." · botão "Resetar senha" → "Senha resetada" |
| Senha provisória | "Esta senha não será mostrada de novo." · "Copiar senha" · "Copiar mensagem" |
| CNPJ duplicado | "Já existe uma empresa com este CNPJ." |
| Vazio | "Nenhuma empresa cadastrada" · "Cadastre a primeira empresa para liberar o acesso do cliente." |

## 8. Riscos e atenção

- **`security definer` na RPC de listagem:** a checagem de `super_admin` precisa ser a primeira instrução; teste de permissão é obrigatório (STEP 4.3).
- **Senha em trânsito:** a senha provisória só existe na resposta da função e na tela; nada de log, cache persistente ou URL.
- **Primeiro cliente real em produção (STEP 4.9):** dados reais nunca vão para seed, teste ou repositório.

## 9. Status dos Entregáveis

| # | Entregável | STEP | Status |
|---|---|---|---|
| 1 | Componentes de dados (tabela, filtros, painel, confirmação) + id na rota | 4.1 | ⬜ |
| 2 | CNPJ no cliente e exibição de senha provisória | 4.2 | ⬜ |
| 3 | RPC `listar_empresas_admin()` | 4.3 | ⬜ |
| 4 | Edge Function `gerenciar-empresa` | 4.4 | ⬜ |
| 5 | Edge Function `resetar-senha` | 4.5 | ⬜ |
| 6 | Tela Empresas (lista) | 4.6 | ⬜ |
| 7 | Cadastro de empresa + administrador master | 4.7 | ⬜ |
| 8 | Painel da empresa | 4.8 | ⬜ |
| 9 | Roteiro ponta a ponta (local + produção) | 4.9 | ⬜ |
| 10 | Fechamento da fase | 4.10 | ⬜ |
