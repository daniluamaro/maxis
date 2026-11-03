# project_manager.md — Maxis

> **Maestro do projeto.** Controla fase ativa, progresso, entregáveis e log.
> Carregado junto de `@CLAUDE.md`. Aponta para os planos em `@docs/plans/`.
>
> **Regra de ouro:** antes de implementar qualquer módulo/funcionalidade nova, escreva **aqui** o plano e as etapas — só depois implemente. A fonte do schema é `@docs/plans/modelo-dados.md`; o detalhe de cada fase é `@docs/plans/fase-XX-*.md`.

---

## Legenda de status

`⬜ Não iniciada` · `🔄 Em andamento` · `✅ Concluída` · `⛔ Bloqueada` · `📋 Manual/checklist`

---

## Progresso geral

**Fundação:** `░░░░░░░░░░` 0% · 0 de 9 fases concluídas
**Fase ativa:** Fase 0 — Infraestrutura & Setup (🔄 em andamento — STEPs 0.1–0.2 ✅; próximo: 0.3)

---

## Roadmap da fundação

> Roadmap **aprovado pelo Danilo em 18/10/2026**. Os planos `docs/plans/fase-XX-*.md` são criados um a um, cada um com aprovação explícita.

| Fase | Objetivo | Plano | Status |
|---|---|---|---|
| **0 — Infra & Setup** | Repositório git + GitHub, monorepo (`frontend/`, `supabase/`), Node 24 LTS fixado, Vite+React+TS strict, Tailwind+shadcn com os design tokens e fontes, ESLint/Prettier/Vitest, Supabase online (dev `maxis` + produção em São Paulo) via MCP e CLI remoto, Deno, `.mcp.json` com escrita só no dev, CI GitHub Actions (lint, tipos, testes, build) → Pages (portável para Vercel) + domínio + `404.html`, tema base do ECharts. Sem lógica de negócio. | `docs/plans/fase-00-infra-setup.md` | 🔄 |
| **1 — Dados base & Segurança multi-tenant** | Schema base (`empresas`, `profiles`, papéis), funções auxiliares de tenant/papel do usuário logado, **RLS por `tenant_id`**, Auth (cadastro público off, Site URL/Redirect), Edge Function de provisionamento base (`service_role`, `email_confirm:true`, senha provisória), RPC de troca da própria senha, bootstrap do primeiro `super_admin`. TDD com testes de isolamento entre tenants. | `docs/plans/fase-01-dados-seguranca.md` | ⬜ |
| **2 — Login & Ciclo de sessão** | Login minimalista, troca obrigatória de senha no 1º acesso (`senha_provisoria`), gate "acesso suspenso" (usuário ou empresa inativos), tela de alerta "sem perfil", guarda de rota autenticada, idle-timer 8h. | `docs/plans/fase-02-login-sessao.md` | ⬜ |
| **3 — App Shell & Navegação** | Layout dual-tone, componentes reutilizáveis (`Sidebar`, `SidebarModule`, `SidebarItem`, `Breadcrumb`, `PageHeader`, `TabLayout`, `Tab`, `Workspace`), navegação dirigida por config + rotas por segmento + abas com deep-link, estados skeleton/vazio/erro, 404 estilizada, Home de boas-vindas, menu do usuário (trocar senha, sair), módulos do backlog como "em breve", hook de permissões placeholder. | `docs/plans/fase-03-app-shell.md` | ⬜ |
| **4 — Admin SaaS (super_admin)** | Tela exclusiva do `super_admin`: cadastrar/bloquear CNPJ, criar o `master_admin` da empresa, resetar senha do `master_admin`. | `docs/plans/fase-04-admin-saas.md` | ⬜ |
| **5 — Perfis de Acesso & Permissões** | Catálogo de permissões (seed a partir do menu-config), chaves `modulo.funcionalidade.aba.acao`, CRUD de perfis pelo `master_admin` (módulo/funcionalidade/aba + leitura/edição), bloqueio de exclusão de perfil com usuários vinculados, enforcement (sidebar filtrada + guards de rota). | `docs/plans/fase-05-perfis-permissoes.md` | ⬜ |
| **6 — Estrutura Organizacional** | CRUD de unidades gerenciais, setores e líderes pelo `master_admin`, já sob permissões. Semântica de "líder" definida em `docs/plans/modelo-dados.md`. | `docs/plans/fase-06-estrutura-organizacional.md` | ⬜ |
| **7 — Gestão de Usuários** | O `master_admin` cadastra/gerencia `admin` e `user`, vincula perfil + unidade gerencial/setor, reseta senha (provisória), ativa/desativa. Alerta "sem perfil vinculado". Imutabilidade do `master_admin`. | `docs/plans/fase-07-usuarios.md` | ⬜ |
| **8 — Notificações in-app** | Tabela `notificacoes`, sino + contador na barra superior, leitura individual (lida/não lida), "marcar todas como lidas", filtro por tipo. Primeiras notificações a partir de eventos das Fases 4–7. | `docs/plans/fase-08-notificacoes.md` | ⬜ |

**Dependências:** sequência 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8.
- A Fase 1 precede a 2: a segurança multi-tenant fecha (testes de isolamento verdes) antes de qualquer tela depender dela.
- A Fase 4 precede as 5–7: o `master_admin`, criado no Admin SaaS, é quem cria perfis, estrutura e usuários.
- A Fase 5 precede as 6 e 7: as telas de Estrutura e de Usuários nascem protegidas por permissão.
- A Fase 6 precede a 7: o cadastro de usuário referencia unidade gerencial e setor.
- A Fase 8 depende tecnicamente só da 3; fica por último para consumir eventos reais das Fases 4–7.

> **Revisão pendente (03/11/2026):** os planos das Fases 1–8 ainda citam ambiente, seed e testes de integração "local". Ao abrir cada fase, revisar o plano para o projeto de dev online (pendência #10), com aprovação do Danilo.

---

## Backlog de módulos de negócio (a detalhar fase a fase)

> Sistema "vivo": estes módulos **não** são planejados em profundidade agora. Cada um vira uma fase própria (plano + schema) quando chegar a vez, com aprovação. Aparecem no sidebar como placeholders ("em breve") até lá.

- **Home** — dashboard real (inicialmente tela de boas-vindas, entregue na Fase 3).
- **Dados de Rota** → Dashboard.
- **Dados de Armazém** → Dashboard.
- **Fretes** → Simulador · Tabela de Fretes · Gestão de Fretes · Parâmetros de Cálculo.
- **Produtividade** → Armazém (Parâmetros) · Transporte.
- **Campeões** → Ranking.
- **Cadastros** → Veículos · Transportadores.
- **Configurações** → Usuários · Perfis de Acesso · Unidades Gerenciais/Setores (telas da fundação, entregues nas Fases 5–7).

> **Sugestão (não travada):** **Cadastros** (Veículos · Transportadores) como primeiro módulo de negócio após a fundação — Fretes, Dados de Rota e Produtividade dependem deles. A ordem do backlog é decidida quando a fundação fechar.

---

## Fase ativa — Fase 0: Infraestrutura & Setup

**Status:** 🔄 Em andamento (STEPs 0.1–0.2 ✅ · próximo: 0.3)
**Objetivo:** deixar o repositório pronto para desenvolvimento — build, lint, testes, CI/CD, Supabase local e tema visual — sem nenhuma lógica de negócio.

**Plano:** `docs/plans/fase-00-infra-setup.md` (14 STEPs). Pendências #1, #2 e #4 já aplicadas. MCPs Supabase e Context7 autorizados e verificados em 02/11/2026 (pré-requisito do plano, §2). Plano revisado em 03/11/2026: decisões #5 (TypeScript 6.0.x), #11 (Supabase só online, dev + produção) e #12 (hospedagem portátil para Vercel).

**Entregáveis** *(espelho da §9 do plano)*

| # | Entregável | STEP | Status |
|---|---|---|---|
| 1 | Ferramentas locais (Node 24, Deno, gh, CLI logado) | 0.1 | ✅ |
| 2 | Repositório público com governança versionada | 0.2 | ✅ |
| 3 | Frontend Vite + React + TS strict, sem boilerplate | 0.3 | ⬜ |
| 4 | Lint, formatação e testes do frontend | 0.4 | ⬜ |
| 5 | Tokens, Tailwind e tipografia (fonte única) | 0.5 | ⬜ |
| 6 | shadcn/ui no tema | 0.6 | ⬜ |
| 7 | Formatadores pt-BR com testes | 0.7 | ⬜ |
| 8 | Tema ECharts e wrapper | 0.8 | ⬜ |
| 9 | Rotas mínimas, abertura, referência do tema e 404 | 0.9 | ⬜ |
| 10 | Projetos Supabase online (dev + produção), MCP por projeto, teste guardião | 0.10 | ⬜ |
| 11 | Base Deno das Edge Functions com testes | 0.11 | ⬜ |
| 12 | Pipeline CI/CD com deploy em ordem | 0.12 | ⬜ |
| 13 | Domínio com HTTPS e fallback SPA | 0.13 | ⬜ |
| 14 | `main` protegida, comandos reais e fechamento | 0.14 | ⬜ |

**Critérios de aceite:** §5 do plano da fase.

---

## Pendências de governança

> Propostas de ajuste aos `CLAUDE.md`. Cada uma só é aplicada com autorização explícita do Danilo (`CLAUDE.md §10`); a coluna "Situação" registra quando foi aplicada.

| # | Onde | Proposta | Situação |
|---|---|---|---|
| 1 | `CLAUDE.md §2` | Node 20 LTS → **Node 24 LTS** (Node 20 sem suporte desde abr/2026), fixado em `.nvmrc`, `engines` e CI. | ✅ Aplicada em 02/11/2026 |
| 2 | `CLAUDE.md §8` | MCPs Supabase e Context7 autenticam via OAuth (`/mcp`), sem PAT/API key; `supabase/agent-skills` já vem no plugin oficial `supabase`. | ✅ Aplicada em 02/11/2026 |
| 3 | `CLAUDE.md §5` | Nomes das chaves: verificar se os projetos (dev `maxis` e produção) usam as chaves novas (`sb_publishable_…` / `sb_secret_…`) em vez de `anon` / `service_role`. | A verificar via Supabase MCP, nos dois projetos (STEP 0.10) |
| 4 | `CLAUDE.md §7` | Tornar canônicos os tokens do mockup ausentes no §7 (`--gold-bright` só na sidebar, `--gold-dim` só no logo, `--radius`, `--shadow-md`); item ativo da sidebar passa a usar `--gold` com transparência no lugar de `rgba(212,175,55)`. **Aplicar antes da Fase 0** (o shadcn exige `--radius`). | ✅ Aplicada em 02/11/2026 |
| 5 | `CLAUDE.md §5` | Escrita em `profiles` só via Edge Function, **inclusive a troca da própria senha** (Edge Function `trocar-senha`), no lugar de "única exceção: RPC de troca da própria senha". Mais estrito: não há caminho para desmarcar a senha provisória sem trocá-la. | Aprovada · aplicar sob autorização (até o fechamento da Fase 1) |
| 6 | `CLAUDE.md §2` | Incluir na stack **react-hook-form + zod** para formulários (padrão do componente Form do shadcn; zod também nas Edge Functions). | Aprovada · aplicar sob autorização (até o fechamento da Fase 2) |
| 7 | `CLAUDE.md §4` | Esclarecer o "login minimalista": o botão de mostrar/ocultar senha **dentro do campo** é permitido; seguem proibidos "esqueci a senha", cadastro e login social. | Aprovada · aplicar sob autorização (até o fechamento da Fase 2) |
| 8 | `CLAUDE.md §6` + `frontend/CLAUDE.md §4` | Registro aberto em **painel lateral com o id como 4º segmento opcional** da rota: `/modulo/funcionalidade/aba/<id>`. Deep link e refresh reabrem o painel; fechar volta à lista. Convenção de todo cadastro. | Aprovada · aplicar sob autorização (até o fechamento da Fase 4) |
| 9 | `supabase/CLAUDE.md §6/§8` | Registrar o padrão: tabelas **escritas pelo cliente** (sob RLS) são auditadas por trigger `security definer` em `private` (`private.registrar_auditoria()`), sem conceder ao cliente escrita em `eventos_auditoria`. | Aprovada · aplicar sob autorização (até o fechamento da Fase 5) |
| 10 | `CLAUDE.md §1/§2/§5/§8/§9` · `supabase/CLAUDE.md §1/§2/§3/§7/§8/§9/§10/§11` · `frontend/CLAUDE.md §11` | Supabase **só online**, sem ambiente local: `maxis` = desenvolvimento (MCP com escrita, testes pgTAP, seed sem senha no repositório); produção separada em São Paulo, escrita só pelo CI, MCP somente leitura; CLI sempre com `--remote`; ferramentas de escrita do MCP fora da allowlist. | ✅ Aplicada em 03/11/2026 |
| 11 | `CLAUDE.md §2` · `frontend/CLAUDE.md §14` | Hospedagem portátil: GitHub Pages agora, Vercel no futuro. Build estático agnóstico; o específico da hospedagem fica no passo de publicação, dentro do pipeline e depois do backend. | ✅ Aplicada em 03/11/2026 |
| 12 | `frontend/CLAUDE.md §6` | Remover a nota "Pendência de governança #4 (aprovada, aplicar sob autorização)": a #4 já foi aplicada no `CLAUDE.md §7` em 02/11/2026, e a nota ficou desatualizada. | ✅ Aplicada em 03/11/2026 |

---

## Log de atualizações

| Data | Evento |
|---|---|
| 18/10/2026 | Arquivo criado (scaffold + proposta de roadmap da fundação). Roadmap **pendente de validação** em PLAN MODE. |
| 18/10/2026 | Roadmap da fundação **aprovado** em PLAN MODE: 9 fases (0–8). Ajustes sobre a proposta: Fase 1 dividida em "Dados base & Segurança multi-tenant" e "Login & Ciclo de sessão"; nova fase "Estrutura Organizacional"; cadastro/reset de `admin`/`user` exclusivo do `master_admin` (alinhado ao `CLAUDE.md §4`). Pendências de governança registradas. |
| 18/10/2026 | Aprovados: `docs/plans/modelo-dados.md` (v1), `frontend/CLAUDE.md` e `supabase/CLAUDE.md` (Etapas E e F); mapa de fases validado (Etapa G). |
| 02/11/2026 | **Planejamento concluído:** planos das Fases 0–8 aprovados um a um (Etapa H); `modelo-dados.md` na v1.5 com os ajustes dos planos; 9 pendências de governança registradas. Próximo passo: aplicar #1, #2 e #4 no `CLAUDE.md` e abrir a Fase 0. |
| 02/11/2026 | Com autorização do Danilo: pendências #1 (Node 24, §2), #2 (MCPs via OAuth, §8) e #4 (tokens, §7) aplicadas no `CLAUDE.md`; §11 atualizada para "Fase 0 em implementação". |
| 02/11/2026 | **Fase 0 aberta** (🔄). STEP 0.1 executado; aguarda os itens 📋 do Danilo. Versões: Node **v24.22.2** (instalado, default do nvm; a sessão do VS Code ainda herda v22.21.1 no PATH), Deno **2.9.8** (instalado em `~/.deno/bin`), gh **2.103.3** (sem login), Docker **29.6.1** client/server (daemon ativo; WSL com ~3,8 GiB), git 2.34.1, Supabase CLI 3.0.0 (via npx, sem login). Bootstrap §8: skills/plugins disponíveis; MCPs Supabase e Context7 autenticados; `typescript-language-server` 6.0.3 + `typescript` 6.0.3 instalados globais no Node 24 (o TypeScript 7 não traz `tsserver`). Decisão: sem `unzip`/`7z`, o script oficial do Deno não roda sem sudo — binário oficial baixado de `dl.deno.land`, SHA-256 conferido, extraído via Python e PATH configurado pelo `installer-shell-setup` oficial. Achado: projeto `maxis` **pausado (INACTIVE)**, Postgres 17.6 — reativar antes do STEP 0.10. |
| 03/11/2026 | Com autorização do Danilo: **Supabase só online** em dois projetos — `maxis` vira desenvolvimento (MCP com escrita) e a produção nasce em São Paulo (escrita só pelo CI; plano Pro na conclusão do SaaS) — e **hospedagem portátil** (GitHub Pages agora, Vercel no futuro). Pendências #10 e #11 aplicadas nos três `CLAUDE.md`; #12 proposta. Plano da Fase 0 revisado (objetivo, decisões #5/#11/#12, STEPs 0.1, 0.3, 0.10, 0.12 e 0.13, critérios 5/9/10/11, riscos); `modelo-dados.md §13` ajustado aos dois projetos. Decisão #5: **TypeScript 6.0.x** (typescript-eslint 8.72.1 aceita só `<6.1`; o TS 7 não traz `tsserver`). Git `user.name` "daniluamaro" confirmado. STEP 0.1: Node v24.22.2 ativo na sessão; Docker dispensado; faltam os logins do gh e do Supabase CLI. |
| 03/11/2026 | Com autorização do Danilo: pendência #12 aplicada (nota obsoleta da #4 removida do `frontend/CLAUDE.md §6`). Login do Supabase CLI não roda fora de terminal interativo (`LoginMissingTokenError`) — feito pelo Danilo no terminal do VS Code, sem token no chat. |
| 03/11/2026 | **STEP 0.1 ✅.** gh logado como `daniluamaro` (escopos `gist`, `read:org`, `repo`, `workflow`; git usando a credencial do gh; token em `~/.config/gh/hosts.yml`, pois o WSL não tem chaveiro). Supabase CLI logado (lista os projetos; sem `link`). Projeto `maxis` reativado (`ACTIVE_HEALTHY`, PG 17.6). Versões finais: Node v24.22.2 · Deno 2.9.8 · gh 2.103.3 · git 2.34.1 · Supabase CLI 3.0.0. Próximo: STEP 0.2, aguardando aprovação. |
| 03/11/2026 | **STEP 0.2 ✅.** `git init` na `main`; `.gitignore` (inclui `.claude/settings.local.json` e `supabase/.temp/`), `.nvmrc` (24), `.editorconfig`, `README.md`. Commits `chore: governança e planejamento iniciais` e `chore: configuração base do repositório`. Repositório **público** `https://github.com/daniluamaro/maxis` criado e `main` enviada. Antes do envio: varredura de segredos e de dados pessoais limpa; 19 arquivos publicados, nenhum sensível. Mockup publicado como está (dados públicos do Preço da Hora, decisão do Danilo). Próximo: STEP 0.3, aguardando aprovação. |

---

## Como manter este arquivo (lembrete de workflow)

1. Trabalhar **somente na fase ativa**; STEPs na ordem; entregas pequenas e verificáveis.
2. Ao concluir cada entregável: atualizar a tabela de **Entregáveis** da fase ativa.
3. Ao concluir a fase: atualizar a **barra de progresso**, o **status no Roadmap** e o **Log** (com data).
4. Não iniciar a fase N+1 sem os entregáveis da fase atual ✅ (ou explicitamente adiados) e os critérios de aceite validados.
5. Nova tabela/coluna numa fase → atualizar `@docs/plans/modelo-dados.md` no mesmo commit.
6. Editar os `CLAUDE.md` só com autorização explícita do Danilo (propor, aguardar).
