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
**Fase ativa:** Fase 0 — Infraestrutura & Setup (🔄 em andamento — STEPs 0.1–0.12 ✅; próximo: 0.13)

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

**Status:** 🔄 Em andamento (STEPs 0.1–0.12 ✅ · próximo: 0.13)
**Objetivo:** deixar o repositório pronto para desenvolvimento — build, lint, testes, CI/CD, Supabase local e tema visual — sem nenhuma lógica de negócio.

**Plano:** `docs/plans/fase-00-infra-setup.md` (14 STEPs). Pendências #1, #2 e #4 já aplicadas. MCPs Supabase e Context7 autorizados e verificados em 02/11/2026 (pré-requisito do plano, §2). Plano revisado em 03/11/2026: decisões #5 (TypeScript 6.0.x), #11 (Supabase só online, dev + produção) e #12 (hospedagem portátil para Vercel).

**Entregáveis** *(espelho da §9 do plano)*

| # | Entregável | STEP | Status |
|---|---|---|---|
| 1 | Ferramentas locais (Node 24, Deno, gh, CLI logado) | 0.1 | ✅ |
| 2 | Repositório público com governança versionada | 0.2 | ✅ |
| 3 | Frontend Vite + React + TS strict, sem boilerplate | 0.3 | ✅ |
| 4 | Lint, formatação e testes do frontend | 0.4 | ✅ |
| 5 | Tokens, Tailwind e tipografia (fonte única) | 0.5 | ✅ |
| 6 | shadcn/ui no tema | 0.6 | ✅ |
| 7 | Formatadores pt-BR com testes | 0.7 | ✅ |
| 8 | Tema ECharts e wrapper | 0.8 | ✅ |
| 9 | Rotas mínimas, abertura, referência do tema e 404 | 0.9 | ✅ |
| 10 | Projetos Supabase online (dev + produção), MCP por projeto, teste guardião | 0.10 | ✅ |
| 11 | Base Deno das Edge Functions com testes | 0.11 | ✅ |
| 12 | Pipeline CI/CD com deploy em ordem | 0.12 | ✅ |
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
| 3 | `CLAUDE.md §2/§5` · `supabase/CLAUDE.md §9` · `frontend/CLAUDE.md §11` | Chaves novas nos dois projetos: `sb_publishable_…` no frontend (`VITE_SUPABASE_PUBLISHABLE_KEY`) e `sb_secret_…` só nas Edge Functions (`SUPABASE_SECRET_KEYS`, injetada pela plataforma); legadas `anon`/`service_role` desativadas. Verificado no STEP 0.10: os dois projetos nasceram com as duas famílias ativas, e as legadas param de funcionar no fim de 2026. | ✅ Aplicada em 07/11/2026 |
| 4 | `CLAUDE.md §7` | Tornar canônicos os tokens do mockup ausentes no §7 (`--gold-bright` só na sidebar, `--gold-dim` só no logo, `--radius`, `--shadow-md`); item ativo da sidebar passa a usar `--gold` com transparência no lugar de `rgba(212,175,55)`. **Aplicar antes da Fase 0** (o shadcn exige `--radius`). | ✅ Aplicada em 02/11/2026 |
| 5 | `CLAUDE.md §5` | Escrita em `profiles` só via Edge Function, **inclusive a troca da própria senha** (Edge Function `trocar-senha`), no lugar de "única exceção: RPC de troca da própria senha". Mais estrito: não há caminho para desmarcar a senha provisória sem trocá-la. | Aprovada · aplicar sob autorização (até o fechamento da Fase 1) |
| 6 | `CLAUDE.md §2` | Incluir na stack **react-hook-form + zod** para formulários (padrão do componente Form do shadcn; zod também nas Edge Functions). | Aprovada · aplicar sob autorização (até o fechamento da Fase 2) |
| 7 | `CLAUDE.md §4` | Esclarecer o "login minimalista": o botão de mostrar/ocultar senha **dentro do campo** é permitido; seguem proibidos "esqueci a senha", cadastro e login social. | Aprovada · aplicar sob autorização (até o fechamento da Fase 2) |
| 8 | `CLAUDE.md §6` + `frontend/CLAUDE.md §4` | Registro aberto em **painel lateral com o id como 4º segmento opcional** da rota: `/modulo/funcionalidade/aba/<id>`. Deep link e refresh reabrem o painel; fechar volta à lista. Convenção de todo cadastro. | Aprovada · aplicar sob autorização (até o fechamento da Fase 4) |
| 9 | `supabase/CLAUDE.md §6/§8` | Registrar o padrão: tabelas **escritas pelo cliente** (sob RLS) são auditadas por trigger `security definer` em `private` (`private.registrar_auditoria()`), sem conceder ao cliente escrita em `eventos_auditoria`. | Aprovada · aplicar sob autorização (até o fechamento da Fase 5) |
| 10 | `CLAUDE.md §1/§2/§5/§8/§9` · `supabase/CLAUDE.md §1/§2/§3/§7/§8/§9/§10/§11` · `frontend/CLAUDE.md §11` | Supabase **só online**, sem ambiente local: `maxis` = desenvolvimento (MCP com escrita, testes pgTAP, seed sem senha no repositório); produção separada em São Paulo, escrita só pelo CI, MCP somente leitura; CLI sempre com `--remote`; ferramentas de escrita do MCP fora da allowlist. | ✅ Aplicada em 03/11/2026 |
| 11 | `CLAUDE.md §2` · `frontend/CLAUDE.md §14` | Hospedagem portátil: GitHub Pages agora, Vercel no futuro. Build estático agnóstico; o específico da hospedagem fica no passo de publicação, dentro do pipeline e depois do backend. | ✅ Aplicada em 03/11/2026 |
| 12 | `frontend/CLAUDE.md §6` | Remover a nota "Pendência de governança #4 (aprovada, aplicar sob autorização)": a #4 já foi aplicada no `CLAUDE.md §7` em 02/11/2026, e a nota ficou desatualizada. | ✅ Aplicada em 03/11/2026 |
| 13 | `frontend/CLAUDE.md §6` | Registrar a nomenclatura dos utilitários de tema: o nome do utilitário é o nome exato do token (`bg-bg-panel`, `text-text-secondary`, `border-border-soft`, `text-gold-strong`); a escala tipográfica é só `text-2xs` … `text-2xl`. Evita colisão com os nomes do shadcn (`primary`, `secondary`…) e torna óbvio, ao ler a classe, de qual token vem a cor. **Complemento (06/11/2026):** dentro de `components/ui/` os primitivos usam os nomes semânticos do shadcn (`bg-card`, `text-muted-foreground`); no resto do app, os nomes dos tokens — um vocabulário por camada. | Aprovada · aplicar sob autorização (até o fechamento da Fase 0, STEP 0.14) |
| 14 | `frontend/CLAUDE.md §2` | Exceção para `components/ui/`: os primitivos do shadcn mantêm o nome de arquivo do CLI (`button.tsx`) e vários exports por arquivo (`dialog.tsx`), para `shadcn add` e `add --diff` continuarem funcionando (os primitivos importam uns aos outros por esses caminhos). PascalCase e um componente por arquivo seguem valendo para o resto do app. | Aprovada (05/11/2026) · aplicar sob autorização (até o fechamento da Fase 0, STEP 0.14) |
| 15 | `CLAUDE.md §7` | Série dos gráficos com **5 cores**: `[navy, gold, green, blue, cinza]` (cinza = `--text-tertiary`). Sai o âmbar: com o ouro, dá ΔE 4,7 em visão normal (mínimo 15) — num mesmo gráfico as duas mal se distinguem — e é cor funcional ("atenção"), que o §7 não usa como enfeite. O ouro fica, por ser a marca, embora dê 2,6:1 como marca sobre o painel (abaixo de 3:1, WCAG 1.4.11): o alívio é a legenda, a dica e a tabela equivalente do `GraficoCartesiano`. No mesmo commit, o código: `CORES_DAS_SERIES` em `theme/echarts.ts` e o limite de séries (6 → 5). | ✅ Aplicada em 07/11/2026 |
| 16 | `CLAUDE.md §7` | Rótulos dos gráficos (eixos) em **`--text-secondary`** (6,3:1 sobre o painel) no lugar de `--text-tertiary` (3,05:1, abaixo do AA de texto, 4,5:1). No mesmo commit, o código: a cor do rótulo em `criarTemaECharts`. | ✅ Aplicada em 07/11/2026 |
| 17 | `frontend/CLAUDE.md §1/§10` | Gráficos "com o tema do produto, criado a partir dos tokens" no lugar de "com o tema registrado": desde o code-review do STEP 0.8, o tema é criado por gráfico, com os tokens lidos ao montar, e não registrado no ECharts. | ✅ Aplicada em 07/11/2026 |
| 18 | `CLAUDE.md §7` | Tokens da sidebar para os neutros sobre a navy, hoje valores literais no `.sidebar` do mockup: texto primário `#FFFFFF`, secundário `#A9B4CC`, terciário **revisto** (o `#6B7793` dá 3,86:1 sobre `--sidebar-bg`, abaixo do AA para o rótulo de grupo de 10,5px; valor definido na aplicação, com contraste medido) e bordas brancas translúcidas. São os valores que a sidebar redefine localmente (`frontend/CLAUDE.md §6`). No mesmo commit, o `tokens.css` e a referência do tema. | Aprovada (07/11/2026) · aplicar sob autorização (antes da abertura da Fase 3) |
| 19 | `supabase/CLAUDE.md §2` | Caminho de reserva para aplicar migration no dev: quando o `apply_migration` do MCP voltar "declined" (o servidor pede confirmação para instrução destrutiva, e ela não chega à sessão), criar o arquivo com `npx supabase migration new <nome>` e aplicar com `npx supabase db push --remote=<ref do dev> --skip-vault`. A versão do arquivo continua sendo a registrada no dev, conferida no `list_migrations`. Aconteceu na primeira migration (STEP 0.10). | ✅ Aplicada em 07/11/2026 |
| 20 | `CLAUDE.md §8` | A regra "ferramentas de escrita do MCP nunca na allowlist" distingue o servidor: o `execute_sql` do `supabase-prod` (`read_only=true`; roda como `supabase_read_only_user` em transação somente leitura, e recusar escrita foi provado no STEP 0.10) pode ficar na allowlist. O do `supabase-dev`, nunca. | ✅ Aplicada em 07/11/2026 |
| 21 | `supabase/CLAUDE.md §8/§9` | Registrar a decisão do STEP 0.11. **§8:** a autenticação usa `@supabase/server` com **`createSupabaseContext`** e `auth: 'user'`, dentro do `comCors` do `_shared`, no lugar de "com `withSupabase`": o CORS do `withSupabase` é fixo (`*` ou cabeçalho estático, sem allowlist por origem) e o erro dele sai no formato do SDK, não em `{ error: { codigo, mensagem } }`. `verify_jwt` segue ligado nas funções de usuário: são duas camadas. A resposta padrão inclui o **405** (método fora de POST, recusado pelo `comCors`). **§9:** no lugar de "se decidem no STEP 0.11", o `verify_jwt` confere o JWT de sessão do usuário, que continua sendo JWT; as chaves novas vão só no cabeçalho `apikey`; o SDK exige JWT assinado pela chave assimétrica (ES256), que os dois projetos publicam no JWKS. | ✅ Aplicada em 08/11/2026 |
| 22 | `CLAUDE.md §1` | "Plano Pro na conclusão do SaaS" → **plano Pro desde nov/2026**, nos dois projetos: assinado pelo Danilo depois da pausa da produção no 1º deploy (o plano free pausa projeto parado). | Proposta (14/11/2026) · aplicar sob autorização |

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
| 03/11/2026 | **STEP 0.3 ✅** (branch `chore/step-0.3-frontend`, PR). Workspace npm na raiz (`engines.node` 24.x; `.npmrc` com `save-exact` e `engine-strict`; lockfile único). Frontend a partir do template `react-ts` do create-vite 9.3.3, versões exatas: Vite 8.3.5, React 19.3.1, `@vitejs/plugin-react` 6.2.1, TypeScript 6.0.3, `@types/react`/`react-dom` 19.3.0, `@types/node` 24.19.2; `npm audit` sem vulnerabilidades. `tsconfig` strict + `noUncheckedIndexedAccess` + `noImplicitOverride` + `noFallthroughCasesInSwitch`; alias `@/`; boilerplate removido; `App` em `src/app/` (named export); `index.html` em pt-BR com favicon do monograma. Verificado: `typecheck` e `build` limpos, servidor de dev responde 200 e resolve o alias. Decisões: ESLint da variante `--eslint` do template fora — entra configurado no 0.4 (o padrão do create-vite 9 é o Oxlint); alias por `resolve.alias` + `paths` (o `resolve.tsconfigPaths` do Vite 8 tem custo e é desaconselhado pelo time do TypeScript); favicon com o "M" em path, maior que no mockup para ser legível em 16 px, e letra em `--text-primary` (o `#0A0D14` do mockup não é token). Bug achado ao renderizar o favicon e corrigido: comentário XML com `--` deixava o SVG inválido. **Code-review (medium), 10 achados:** corrigidos `devEngines` (antes só a instalação era barrada fora do Node 24; os scripts rodavam no 22 — reproduzido e conferido), portas fixas 5173/4173 com `strictPort`, `tsconfig.base.json` com o rigor compartilhado, comentário errado herdado do template e texto sobre o linter do template; exceção do favicon registrada na verificação do STEP 0.5. Mantidos: tela sem estilo até o 0.5/0.9 (placeholder; nada é publicado antes), alias em `paths` + `resolve.alias` (padrão do shadcn), typecheck duplo no CI (decidir no 0.12). Adiados para decisão do Danilo: `apple-touch-icon` e favicon PNG/ICO de reserva para Safari antigo. Próximo: STEP 0.4, aguardando aprovação. |
| 03/11/2026 | PR #1 (STEP 0.3) mergeado com rebase na `main`. Ícones complementares (`apple-touch-icon` + favicon PNG de reserva) aprovados para o STEP 0.9. |
| 03/11/2026 | **STEP 0.4 ✅** (branch `chore/step-0.4-qualidade`, PR). ESLint **10.14** (flat config) com typescript-eslint 8.72.1 `strictTypeChecked` via `projectService`, react-hooks 7.1.1, react-refresh 0.5.7 e jsx-a11y 6.10.2 *strict*; `no-explicit-any` e `explicit-module-boundary-types` como erro; `noInlineConfig` (exceção a regra só no config). Prettier 3.9.10 na raiz para o repositório todo (fora `*.md`, `docs/`, `supabase/`, lockfile) + `eslint-config-prettier`. Vitest 5.1 + Testing Library 16.3 + jsdom 30.1 + jest-dom 7.0, com restauração de mocks/envs/globais. Scripts `lint`, `format`, `format:check`, `typecheck`, `test`, `build` na raiz. Node passa a `^24.15.0` (exigência do jsdom). Verificado: os cinco portões verdes e sem aviso, inclusive após `npm ci` limpo; provas com arquivos temporários — `any`, retorno sem tipo, promise solta (regra com tipos) e `img` sem `alt` barrados; `eslint-disable` reprovado; teste falha com a marca errada e volta a passar. **Decisão do Danilo:** ESLint 10 + jsx-a11y oficial, que não declara suporte ao 10 — o `overrides` restrito ao jsx-a11y aponta para o ESLint da raiz (`$eslint`). **Risco aceito:** 15 alertas moderados do `minimatch` só em dependências de desenvolvimento, sem correção compatível (produção: 0). **Code-review (medium), 14 achados:** corrigidos override global que travava o ESLint em silêncio, Prettier que reformataria os `CLAUDE.md` se rodado da raiz, faixa do Node abaixo do que o jsdom exige, `eslint-disable` burlando o `any`, falta de isolamento entre testes, import relativo no teste, extensões `.mjs/.cjs/.mts/.cts` fora do lint, `globals` sem efeito e script `format` na raiz. Mantidos: testes no typecheck do build, jsdom como ambiente padrão, `no-explicit-any` explícito. Próximo: STEP 0.5, aguardando aprovação. |
| 03/11/2026 | **STEP 0.5 ✅** (branch `chore/step-0.5-tema`, PR). Tailwind **4.3.4** + `@tailwindcss/vite` 4.3.4 (devDependencies; saiu em 02/11, registro e atestações conferidos por `npm audit signatures`) e `@fontsource` 5.3.0 de Manrope, Inter e JetBrains Mono (dependencies, vão no build). `src/theme/tokens.css` é a fonte única: os 24 tokens de cor do §7, sombras, `--radius`, famílias e escala tipográfica; o Prettier grava os hex em minúsculas. `src/index.css` desliga no Tailwind cores, sombras (inclusive inset/drop/text), raios, famílias, tamanhos e pesos padrão, e mapeia com `@theme inline reference`: utilitário com o nome exato do token (`bg-bg-panel`, `text-text-secondary`, `border-border-soft`), sem colidir com os nomes do shadcn. Raios derivados de `--radius` como no shadcn (6 · 8 · 10 · 14px = os do mockup). **Escala fixa** com os nomes padrão (o shadcn herda): `2xs` 10,5 · `xs` 11,5 · `sm` 12,5 · `base` 13,5 · `lg` 17 · `xl` 22 · `2xl` 25px, em rem; os 14 tamanhos do mockup se consolidam assim: 9–10,5 → `2xs`, 11–11,5 → `xs`, 12–12,5 → `sm`, 13–13,5 → `base`, 15–17 → `lg`. Pesos: 400–800. Base: fundo `--bg-base`, texto `--text-primary`, corpo em `base`, borda padrão `--border`, seleção `--gold` com texto `--navy` (o branco do mockup dá 2,6:1, abaixo do AA) e foco `--gold-strong` 2px. Fontes nunca embutidas em base64 no CSS (`assetsInlineLimit`): os subconjuntos pequenos iam para todo usuário (CSS caiu de 67 para 25 kB). **Verificado:** prova dupla no build com arquivo-sonda temporário — 22 classes proibidas não geradas (`bg-blue-500`, `bg-white`, `shadow-lg`, `rounded`/`shadow` sem sufixo, `font-serif`, `text-4xl`, `font-black`…), 34 permitidas geradas; Chromium headless (do cache do Playwright, com bibliotecas extraídas sem sudo no scratchpad) conferiu cascata, valores dos tokens, redefinição local de token num contêiner, foco, seleção, fontes carregadas e um único host nas requisições (só woff2 do subconjunto latin, só os pesos usados); nenhuma cor literal fora do `tokens.css` além da exceção do favicon; cinco portões verdes e sem aviso; `npm audit --omit=dev` 0. Um `tsc -b` travou uma vez (processo parado em espera, sem CPU) e não se repetiu em 8 execuções seguidas — anotado para observar no CI. **Code-review (medium), 8 achados:** corrigidos autorreferência de sombras/famílias na camada `theme` (frágil em shadow root ou camada; agora `reference`), borda padrão na cor do texto, comentários imprecisos (utilitários legados, pesos por família, sombra sem tingimento). Mantidos: `shadow-<cor>` sem efeito (só as duas sombras do §7), todos os subconjuntos do `@fontsource` (o `unicode-range` baixa só o latin; CSS 4,2 kB gzip), registro em docs neste commit. **Para decisão do Danilo:** a consolidação da escala (o mockup usa 11, 12 e 15px, que não existem como passo). Próximo: STEP 0.6, aguardando aprovação. |
| 05/11/2026 | Danilo aprova o STEP 0.5 e a **escala consolidada em 7 passos** (sem passo próprio para 11, 12 e 15px). Pendência #13 (nomenclatura dos utilitários de tema no `frontend/CLAUDE.md §6`) registrada como aprovada, a aplicar sob autorização até o STEP 0.14. |
| 05/11/2026 | PR #3 (STEP 0.5) mergeado com rebase na `main`; portões verdes na `main` após `npm ci` limpo. |
| 05/11/2026 | **STEP 0.6 ✅** (branch `chore/step-0.6-shadcn`, PR). **Decisões do Danilo:** primitivos sobre **Base UI** (padrão do shadcn para projeto novo desde jul/2026; markup idêntico ao do Radix), utilitário **`cn`** (pacote do shadcn que substitui clsx + tailwind-merge) e **exceção do §2 para `components/ui/`** (pendência #14). shadcn **4.23.0** (estilo `base-nova`); dependências exatas: `@base-ui/react` 1.9.0, `class-variance-authority` 0.7.1, `cn` 0.5.2, `lucide-react` 1.69.0 (saiu hoje), `sonner` 2.0.8, `tw-animate-css` 1.4.0. O `init` trouxe paleta `oklch` própria com tema escuro, um `--border` que sobrescreveria o token, a fonte Geist e o CLI como dependência de produção — tudo descartado: os nomes do shadcn apontam direto para os tokens no `@theme` (sem variável intermediária), `dark:` fica inerte por variante, e as 6 variantes de estado usadas foram copiadas do `shadcn/tailwind.css` (o build não depende do CLI, ~2.400 linhas a menos no lockfile; o CLI passa a ser `npx shadcn@4.23.0`). Bug do `init`: gravou `frontend/@/lib/utils.ts` literal porque o alias só estava no `tsconfig.app.json`; corrigido com `paths` também no `tsconfig.json` raiz. **Primitivos** (button, input, label, badge, skeleton, tabs, dialog, sonner) adaptados: alvo ≥ 40px (saem `xs`/`sm`), anel `ring-2` em `--gold-strong` cheio (o `ring-ring/50` do shadcn dá ~2:1) com `outline-hidden` (alto contraste do Windows), hover em `--bg-hover`, input e botão outline brancos com sombra como os filtros do mockup, badge no padrão do mockup (variantes `success`/`warning`/`destructive`/`info`), destructive translúcido em repouso e sólido no hover, overlay `--navy` a 20% com desfoque, título do dialog em Manrope 800, painel de aba focável com anel (o upstream tem `outline-none` sem indicador), textos em pt-BR, sem `"use client"` nem `next-themes`; sonner vestido no `index.css` (a lib injeta CSS sem camada depois do nosso; regras fora de camada com `:root` a mais, sem cor em `style`). Desvios da tabela do plano, por AA: `destructive` → `--red-text`; `secondary-foreground`/`accent-foreground` → `--text-primary`. Token técnico novo, fora da escala: `--font-size-touch-input` (16px abaixo de `md`, contra o zoom do iOS). Lint: exceções só no config (variantes exportadas, `Label` genérico) e `Label` sem campo associado barrado no app (provado). **Verificado:** auditor de classes contra o design system real do Tailwind (nenhuma classe morta: saíram `bg-black/10`, `rounded-4xl`, `cn-toast`; nenhuma `var()` órfã); sonda temporária no build de produção medida no Chromium — 22 pares texto/fundo AA (menor: badge de sucesso 4,51:1, par do mockup), alvos ≥ 40px, foco por **Tab real** via protocolo de depuração (anel 2px `--gold-strong`), toast/dialog com `--shadow-md`, campo 16px em 375px e 12,5px em 1280px; `src/theme/cn.test.ts` (o `cn` resolve os nomes do tema sem configuração); cinco portões verdes e sem aviso; `npm audit --omit=dev` 0; dev 12 (só `minimatch`). Skill `shadcn` indisponível nesta sessão (roda `info` na raiz do monorepo e falha) — fallback: Context7 + `--help` do CLI. **Code-review (medium), 9 achados:** corrigidos build dependente do CLI, `lib/utils.ts` ausente para o alias `utils`, zoom do iOS no campo, botão desabilitado pelo Base UI parecendo ativo, cursor em `role=button` desabilitado, título sob o botão de fechar e `outline-none` no popup. Mantidos (upstream, sem defeito): props do `Input` tipadas como `<input>` e `data-orientation` explícito nas abas. Próximo: STEP 0.7, aguardando aprovação. |
| 06/11/2026 | Danilo aprova o STEP 0.6 com os desvios registrados: `destructive` → `--red-text` e `secondary-foreground`/`accent-foreground` → `--text-primary` (AA), token técnico `--font-size-touch-input` (16px, fora da escala), botão sem os tamanhos `xs`/`sm` e badge com as variantes `success`/`warning`/`info`. Pendência #13 ganha o complemento de um vocabulário por camada (nomes do shadcn em `components/ui/`, nomes dos tokens no app). |
| 06/11/2026 | PR #4 (STEP 0.6) mergeado com rebase na `main`; portões verdes na `main` após `npm ci` limpo. |
| 06/11/2026 | **STEP 0.7 ✅** (branch `chore/step-0.7-formatadores`, PR). `src/lib/format.ts` com `formatarMoeda`, `formatarNumero` (inteiro por padrão, `casas` fixa as decimais), `formatarPercentual` (recebe **fração**, 1 casa por padrão), `formatarData` e `formatarDataHora`, todos com `Intl` pt-BR, mais a constante `VALOR_AUSENTE` ("—"). Regras: ausente/inválido (`null`, `undefined`, `NaN`, `Infinity`, data impossível, formato não ISO) → "—"; nunca "-0"; arredondamento meio-para-longe-do-zero sobre o decimal escrito (1,005 → 1,01; o `toFixed` daria 1,00); data de calendário (`date` do Postgres) não muda com o fuso, instante sai no fuso de quem vê; aceita o JSON do Supabase (microssegundos, `+00:00`) e o texto do Postgres (espaço, `+00`), normalizado para ISO; "06/11/2026" na entrada é recusado (o `Date` leria 11 de junho); data com hora em `dd/mm HH:mm` montada pelas partes (o pt-BR do `Intl` põe ", " e escreve o ano 26 como "26"). Formatadores reaproveitados (criar um `Intl` custa 10–15× usar um pronto); os do fuso local são refeitos quando o deslocamento muda. **TDD:** testes antes de cada implementação, RED conferido pela razão certa (asserção, não erro), GREEN mínimo, depois refactor; 79 casos em tabela com valores escritos à mão. Fuso dos testes fixo em `America/Sao_Paulo` no `vite.config.ts` (provado: com o processo em Tóquio e em Pago Pago os testes seguem verdes). **Teste de mutação:** 11 mutações realistas aplicadas uma a uma, todas pegas; a troca do espaço por `T` só importa no Safari (o V8 aceita o espaço), então não há teste que a isole. Cinco portões verdes e sem aviso (86 testes). **Code-review (medium), 8 achados:** corrigidos `signDisplay: 'negative'` (o Firefox < 116, dentro do alvo `firefox114` do Vite 8, o recusa com RangeError e todo número quebraria), texto do Postgres recusado, dia impossível aceito no caminho com hora, ano 0–99 tratado como inválido, formatador local preso ao primeiro fuso, falta de teste de instante em outro fuso e regex executada duas vezes. Mantido: `casas` fora da faixa estoura (é erro de programação, não valor inválido; deve aparecer no desenvolvimento). Fora do commit: `.claude/settings.json` (permissões aprovadas pelo Danilo nesta sessão, configuração local). Próximo: STEP 0.8, aguardando aprovação. |
| 06/11/2026 | Danilo aprova o STEP 0.7 com as escolhas registradas: percentual recebe fração (0,125 → 12,5%), número inteiro e percentual com 1 casa por padrão, data no formato brasileiro recusada na entrada. |
| 07/11/2026 | **STEP 0.8 ✅** (branch `chore/step-0.8-echarts`, PR). **Versões:** `echarts` **6.1.0** e `echarts-for-react` **3.0.6** (dependencies, exatas; a 3.0.7 saiu marcada pelo autor como "publicada por engano" e as 3.1.7/3.2.7 foram despublicadas no mesmo dia — fica a `latest`); entram junto `zrender` 6.1.0, `size-sensor` 1.0.3, `tslib` 2.3.0 e `fast-deep-equal` 3.1.3; `npm audit signatures` ok; `npm audit --omit=dev` 0. **Estrutura:** `theme/echarts.ts` (leitura dos tokens + `criarTemaECharts`, sem importar o ECharts), `components/charts/echarts.ts` (único ponto de entrada; registra só barra, linha, grade, dica e **SVG**), `opcoesCartesiano.ts` (dados → opções), `GraficoCartesiano.tsx` (componente público), `DesenhoCartesiano.tsx` (a parte com ECharts, carregada sob demanda), `exemplos.ts` (dados fictícios) e `graficoDeTeste.ts` (só testes). **Decisões tomadas no STEP (para conferência):** (1) o wrapper recebe **dados, não opções do ECharts** — sem prop de cor, um eixo de valor só (`moeda`/`numero`/`percentual`; duas unidades = dois gráficos, nunca eixo duplo), no máximo 6 séries (a 7ª repetiria a cor da 1ª: erro com mensagem); (2) renderizador **SVG**: o navegador redesenha o texto quando a fonte self-hosted carrega (no canvas ficaria a fonte reserva), nítido em zoom e impressão; (3) desenho **sob demanda** (`lazy`) com skeleton da altura do gráfico e **limite de erro** ("Recarregar a página"): o ECharts fica fora do bundle das telas sem gráfico; (4) **legenda em HTML**, acima do desenho, cores por classe do token — a do ECharts, no SVG, invadia a grade ao quebrar linha a 360px; perde-se o clique para esconder série, que nenhum plano pede; (5) **tema criado por gráfico** com os tokens lidos ao montar, em vez de registrado no módulo (sem estado global); (6) **novos formatadores** `formatarMoedaCompacta` ("R$ 40 mil") e `formatarNumeroCompacto` ("1,5 mi") em `lib/format`, só para rótulo de eixo — com centavos, "R$ 40.000,00" em cada marca; o valor exato fica na dica e na tabela; (7) percentual no eixo com as casas que o passo pede ("0,5%", "1%"); (8) **tabela equivalente** (`sr-only`) com os mesmos valores formatados — o desenho fica `aria-hidden`; (9) sem animação de entrada (só ao atualizar, 300ms) e sem animação para quem pede menos movimento, acompanhando a mudança com o gráfico aberto; (10) "cinza" do contrato = `--text-tertiary` (3,05:1 sobre o painel, o neutro mais claro com 3:1); (11) dica montada com `textContent` (nome de série do banco nunca vira HTML), chave de traço curto na cor da série, valor em mono à direita. **Bundle:** sem gráfico em tela, o build é idêntico ao da `main` (219,6 kB · 68,6 kB gzip); o pedaço do gráfico tem 547 kB (187 kB gzip) — o ECharts inteiro daria ~1.144 kB (~380 kB gzip). **Lint:** `@typescript-eslint/no-restricted-imports` barra qualquer import do ECharts fora de `components/charts` (regex ancorada: o padrão de `.gitignore` casava `@/theme/echarts`) e, dentro, as entradas inteiras; importação só de tipo de `echarts` permitida (alguns tipos só existem ali) — provado com arquivos-sonda. **Testes:** o setup aplica o `tokens.css` real ao documento (o Vitest transforma CSS em string vazia, inclusive com `?raw`; exceção só para ele em `test.css.include`) e simula a falta de canvas do jsdom. **Verificado:** TDD com RED por asserção antes de cada GREEN; 154 testes; o teste do tema **desenha de verdade** (SVG no jsdom) e confere toda cor contra o `tokens.css` (prova negativa: sem o tema aparecem `#dbdee4`, `#54555a`…) e toda fonte (Inter na UI, JetBrains Mono em número); **teste de mutação** com 24 mutações realistas, todas pegas (a única que escapou na 1ª rodada, eixo de valor sem mono, levou a um teste mais preciso); toda classe usada gera regra no CSS do build; sonda temporária no build de produção (Chromium headless por CDP, 900px e 360px, depois desfeita): dica "03/11/2026 · Realizado R$ 48.320,00 · Meta R$ 45.000,00" com a sombra `--shadow-md` computada, fundo `--bg-panel`, borda `--border-soft`, raio 10px; nenhum texto fora do SVG; sem rolagem horizontal; dica dentro da tela a 360px; legenda nas cores dos tokens; pedaço do gráfico baixado só sob demanda; barra negativa com a ponta embaixo. Conferidos só no navegador (o jsdom não faz layout): altura de linha dos rótulos, faixa do indicador por baixo das séries e dica contida. **Bugs achados na sonda e corrigidos:** rótulo do eixo cortado na borda (o ECharts estima a altura do texto pela largura de "国", que a JetBrains Mono não tem — altura de linha passa a vir do `--line-height-body`); faixa do indicador desenhada por cima da barra em foco (parecia desabilitada; `z` abaixo das séries); dica saindo da tela a 360px (`confine`); legenda do ECharts invadindo a grade. Teste intermitente (`waitFor` de 1 s contra a primeira carga do ECharts no Vitest) corrigido com limite de 5 s e provado em 6 rodadas. **Code-review (medium), 10 achados:** corrigidos limite de erro ausente no desenho sob demanda, barra negativa com a base arredondada, chaves por nome (repetíveis), opções refeitas a cada render do pai (memo pelo conteúdo), tokens lidos uma vez por módulo, "reduzir movimento" lido uma vez, `casas` documentado para moeda, comentário impreciso da forma compacta e testes duplicados. Mantido: rótulo compacto repetido no eixo — inatingível com o eixo partindo do zero e passos de 1, 2, 3 ou 5 × 10ⁿ (premissa registrada no código). **Para decisão do Danilo:** o validador de paleta (skill `dataviz`) acusa na série do §7 que **ouro e âmbar são quase iguais** (ΔE 4,7 em visão normal; o mínimo é 15) e ficam **abaixo de 3:1** sobre o painel como marca (ouro 2,6:1, âmbar 2,27:1; WCAG 1.4.11), e que os **rótulos em `--text-tertiary` dão 3,05:1**, abaixo do AA de texto (4,5:1). Fora do commit: `.claude/`. Próximo: STEP 0.9, aguardando aprovação. |
| 07/11/2026 | Danilo aprova o STEP 0.8 com os desvios registrados: exemplo do gráfico em `components/charts/exemplos.ts` (entra na página de referência no STEP 0.9), legenda em HTML (sem clique para esconder série), tema criado por gráfico, desenho carregado sob demanda e os formatadores compactos `formatarMoedaCompacta`/`formatarNumeroCompacto` em `lib/format`. Aprovadas as recomendações sobre a paleta do §7, registradas como pendências #15 (série com 5 cores, sem o âmbar; ouro mantido com o alívio da legenda, da dica e da tabela) e #16 (rótulos dos gráficos em `--text-secondary`) — o código do gráfico muda junto, quando cada uma for aplicada sob autorização. |
| 07/11/2026 | Com autorização do Danilo: pendências **#15** (série dos gráficos com 5 cores, sem o âmbar) e **#16** (rótulos dos gráficos em `--text-secondary`) aplicadas no `CLAUDE.md §7`, com o código no mesmo commit (`CORES_DAS_SERIES` sem o âmbar, limite de 5 séries, cor do rótulo no tema; sai o campo `textoTerciario`, que ficou sem uso); **#17** registrada e aplicada no `frontend/CLAUDE.md §1/§10` ("tema do produto, criado a partir dos tokens", no lugar de "tema registrado"). Validador de paleta na série nova: piso de visão normal ok em todos os pares (pior: cinza × ouro, ΔE 17,0); seguem como aviso o ouro a 2,6:1 como marca (alívio: legenda, dica e tabela) e ouro × verde para protanopia (ΔE 6,2, faixa permitida com codificação secundária — legenda, tabela, barra × linha); navy e cinza fora da faixa de luminosidade/croma por desenho (âncora da marca e neutro de "Outros"). Rótulos: 6,34:1. TDD: testes da ordem das 5 cores, da 6ª série recusada e da cor dos rótulos vistos falhar antes do código; 155 testes. **Code-review (medium), 6 achados:** corrigidos o item do STEP 0.8 no plano ainda com a série antiga, o nome de um teste que prometia conferir a ordem (a ordem é provada na leitura dos tokens e no `color` do tema) e o teste do limite de séries com números fixos (agora deriva do tamanho da paleta e prova os dois lados do limite). Mantidos: o teste da cor do rótulo (sem cor própria o ECharts usa o cinza dele, `#54555a`, não a cor global — a mutação foi pega), a cor do rótulo igual à do texto global (precisa ser explícita pelo mesmo motivo). **Para o Danilo:** o 5º lugar da série (cinza) vale para qualquer 5ª série, não só para "Outros" — já valia para a 6ª antes; tratar quando o primeiro painel agrupar séries. STEP 0.9 não iniciado, por pedido do Danilo. |
| 07/11/2026 | Danilo aprova o PR das pendências #15, #16 e #17 e a sugestão sobre o 5º lugar da série: o cinza vai para "Outros" de propósito quando o primeiro painel agrupar séries (até lá, vale para qualquer 5ª série). |
| 07/11/2026 | **STEP 0.9 ✅** (branch `chore/step-0.9-rotas`, PR). **Versão:** `react-router` **8.5.1** (dependency, exata; saiu em 27/10), modo declarativo, tudo importado de `react-router` (o 8 removeu o `react-router-dom`); `npm audit signatures` ok; `npm audit --omit=dev` 0. **Estrutura:** `app/App.tsx` (rotas), `app/paginas/` (`Abertura`, `PaginaNaoEncontrada`), `app/referencia/` (referência do tema, só em desenvolvimento), `components/shell/` (`Marca`, `MolduraDaMarca`), `theme/lerToken.ts` (leitor de token extraído do tema do ECharts, que passa a usá-lo). **Decisões tomadas no STEP (para conferência):** (1) **moldura das telas fora do shell** — marca na navy (`--sidebar-bg`), conteúdo no claro com o fundo radial do mockup, lado a lado a partir de 900px e empilhada abaixo: hoje abertura e 404, na Fase 2 login, troca de senha e alertas; (2) breakpoint `sidebar:` (56,25rem = 900px, o corte do `frontend/CLAUDE.md §6`) no tema do Tailwind e utilitário `bg-workspace` (o fundo do `body` do mockup) no `index.css`; (3) texto da abertura: "Gestão de transporte, armazém e logística em uma só plataforma."; (4) nome da marca em `--bg-panel` (o branco do contrato, o mesmo do texto do botão navy desde o 0.6) e letra do monograma em `--text-primary`, como no favicon; (5) rótulo de KPI e cabeçalho de tabela em `--text-secondary` (o `--text-tertiary` do mockup dá 3,05:1, abaixo do AA); (6) sem rótulo em caixa alta acima dos títulos de seção (o mockup tem; o `frontend/CLAUDE.md §6` só permite caixa alta em cabeçalho de tabela, rótulo de KPI e grupo da sidebar); (7) título da aba pelo `<title>` do React 19 (conferido no Chromium: vale sobre o do `index.html`); (8) a 404 mostra o endereço pedido, decodificado. **Bundle:** principal 260,9 kB (83,1 kB gzip), +41 kB (+14,5 kB gzip) sobre o 0.8, quase tudo React Router (35 kB); o `cn` (25 kB) ficou fora tirando-o da marca, que não precisava dele. Em produção nem o pedaço do ECharts é gerado: nenhuma rota de produção tem gráfico. **Achado e corrigido num primitivo do 0.6:** com `aria-invalid`, o anel de erro sobrepunha o de foco e o campo inválido ficava igual focado ou não; agora o anel `--gold-strong` vence e a borda vermelha fica (campo e botão). **Verificado:** TDD com RED por asserção antes de cada GREEN; 178 testes; nenhum texto da referência no `dist` e `/dev/tema` caindo na 404 no build servido pelo `vite preview`; auditoria de classes no compilador do Tailwind (toda classe escrita gera CSS); nenhuma cor literal fora do `tokens.css`; sonda no Chromium headless por CDP, a 1280 e 360px: todo par texto/fundo no AA (menor: selo "Entregue", 4,51:1), foco por Tab real em todas as paradas (anel 2px `--gold-strong`), diálogo pelo teclado (Enter abre com o foco em "Continuar editando", Tab preso dentro, Escape devolve ao gatilho), sem rolagem horizontal, sem erro no console; lado a lado com o mockup (KPIs, painéis de seção, tabela, marca); ícones conferidos pixel a pixel (cantos transparentes no favicon, ícone do iOS opaco); **teste de mutação** com 25 mutações realistas, todas pegas (a única que escapou na 1ª rodada, o `trim()` do valor do token, levou a um teste com o estilo injetado). Os servidores do Vite respondem 404 vazio a URL malformada antes de chegar ao app; a 404 do app trata o caso (provado no teste). **Code-review (medium), 8 achados:** corrigidos endereço codificado na 404 (`/opera%C3%A7%C3%B5es`), `lerTokenEmPx` aceitando qualquer unidade em silêncio, teste de produção com o roteador de outro carregamento, token ausente derrubando a referência, `Suspense` sem fallback e dois comentários imprecisos (px lidos ao abrir a página; borda de erro mantida de propósito no campo focado). Mantido: nome da marca em `--bg-panel` (o branco do contrato; precedente no 0.6). **Para decisão do Danilo:** (a) o texto da abertura; (b) proposta de pendência para antes da Fase 3 — a sidebar do mockup redefine os neutros sobre a navy com valores fora do §7 (`#FFFFFF`, `#A9B4CC`, `#6B7793` e bordas brancas translúcidas); registrá-los no §7 como tokens da sidebar, com o terciário revisto: `#6B7793` dá 3,86:1 sobre `--sidebar-bg`, abaixo do AA para o rótulo de grupo (10,5px). Fora do commit: `.claude/`. Próximo: STEP 0.10, aguardando aprovação. |
| 07/11/2026 | Danilo aprova o STEP 0.9 com os desvios registrados: estrutura de pastas (`app/paginas/`, `app/referencia/`, `Marca` e `MolduraDaMarca` em `components/shell/`, `theme/lerToken.ts`), breakpoint `sidebar:` e utilitário `bg-workspace`, nome da marca em `--bg-panel` e monograma em `--text-primary`, rótulo de KPI e cabeçalho de tabela em `--text-secondary`, sem caixa alta acima dos títulos de seção, bundle principal de 260,9 kB e a correção do anel de foco no campo e no botão inválidos. Aprovados o texto da abertura ("Gestão de transporte, armazém e logística em uma só plataforma.") e a proposta sobre os neutros da sidebar, registrada como pendência #18 (aplicar sob autorização, antes da abertura da Fase 3). |
| 07/11/2026 | **STEP 0.10 ✅** (branch `chore/step-0.10-supabase`, PR). **Projetos:** dev `maxis` (us-west-2) e produção `maxis-producao` (sa-east-1, ref `ktcryodtgxpmgatihaic`, criada pelo Danilo), vazios, Postgres 17.11 nos dois. A senha do banco do dev foi redefinida pelo Danilo: o MCP e o CLI recebiam `28P01` em toda consulta. **Versão:** Supabase CLI **3.0.0** (devDependency da raiz), sempre com `--remote=<ref>` e sem `link`. **Entregue:** `supabase/` inicializado (`CLAUDE.md` preservado); `config.toml` como fonte do Auth dos dois projetos (base = produção, `[remotes.dev]` acrescenta o localhost) com cadastro desligado, `site_url`/redirect no domínio e senha mínima 8 com letras e dígitos, aplicado com `config push` e conferido com `config diff --exit-code` nos dois; `.mcp.json` com `supabase-dev`, `supabase-prod` (`read_only=true`) e Context7, com os MCPs dos plugins desativados no projeto; teste guardião pgTAP (14 asserções); migration `20261107231525_f00_remove_rls_automatica`; `frontend/src/types/database.ts` gerado do dev; `modelo-dados.md §13` com o estado real. **Decisões do Danilo:** (1) tirar do dev a RLS automática (`ensure_rls` + `public.rls_auto_enable()`, executável por `anon`), que a produção não tem — só no dev, ela esconderia a migration sem `enable row level security`; (2) pendência #3 aplicada (chaves novas nos `CLAUDE.md`, inclusive a linha do `frontend/CLAUDE.md §11` que dependia dela) e chaves legadas desativadas nos dois projetos; (3) saem da allowlist o `execute_sql` do plugin e o `Bash(npx supabase *)`, que deixavam o `config push` e o `test db` rodarem sem aprovação; (4) o `test db --remote` usa um contêiner Docker do `pg_prove` (o banco segue online; o "nem Docker" do §9 vale para o Supabase local); (5) senha mínima 8 com letras e dígitos (decisão 2 da Fase 1, antecipada). **Desvios:** a migration foi aplicada no dev por `db push --remote`, porque o `apply_migration` do MCP voltou "declined" duas vezes sem diálogo (pendência #19), e a versão do arquivo é a registrada no dev; o guardião assume o papel `postgres` (o papel de login do CLI só herda assumindo) e junta a saída TAP numa tabela temporária para o MCP, que devolve só o último resultado; os tipos gerados ficam fora do ESLint e do Prettier (o `tsc` checa); o Auth foi conferido pelo `config diff`, que lê a mesma API do Dashboard. **Achados no caminho:** o `has_sequence_privilege` falhava num índice do schema `auth` porque o `where` não tem ordem garantida (resolvido com `case`); o `execute_sql` do `supabase-prod` entrou na allowlist por escolha do Danilo — lá ele só lê (pendência #20). **Verificado:** guardião 14/14 pelos dois caminhos, sem resíduo; antes da migration, 11/12 acusando a `rls_auto_enable` (RED real); mutantes pegos (grant por coluna e `MAINTAIN` falharam com a consulta antiga; sem o `revoke` da sequência conforme, o teste 13 falha); `supabase-dev` e `supabase-prod` só alcançam o próprio projeto, e o `supabase-prod` recusa escrita (`25006`, papel `supabase_read_only_user`); `migration list --remote` alinhado no dev; advisors sem alerta nos dois; os 5 portões verdes (178 testes). **Code-review (medium), 7 achados:** corrigidos grant por coluna e `MAINTAIN` escapando da regra de `anon` e a prova de conformidade sem sequência; aplicada a política de senha (decisão do Danilo). Mantidos: o seed (o `enabled = false` não impede o `--include-seed` — provado em dry-run —, então a proteção é o CI nunca usar `--include-seed`, STEP 0.12); o TOTP ligado (padrão da plataforma; nada exige `aal2`, então o usuário não se tranca); o CLI na raiz (decisão do plano; rever o custo do download no CI no STEP 0.12). **Incidente:** um `sed` sem intervalo trocou localmente todos os `enabled = false` do `config.toml`; o arquivo voltou ao commit antes de qualquer push, e o `config diff` dos dois projetos seguiu sem diferença. **Para os próximos STEPs:** 0.11 decide o `verify_jwt` e o SDK `@supabase/server` (as chaves novas não são JWT); 0.12 sem `--include-seed`, com `--skip-vault` e Docker no runner para o `test db`. Fora do commit: `.claude/`. Próximo: STEP 0.11, aguardando aprovação. |
| 07/11/2026 | Com autorização do Danilo: pendências **#19** (caminho de reserva para aplicar migration no dev, `migration new` + `db push --remote --skip-vault`, no `supabase/CLAUDE.md §2`) e **#20** (o `execute_sql` do `supabase-prod`, somente leitura, pode ficar na allowlist; o do `supabase-dev` nunca — `CLAUDE.md §8`) aplicadas no PR do STEP 0.10. |
| 07/11/2026 | Danilo aprova o STEP 0.10 (PR #9) com os desvios registrados: migration aplicada no dev por `db push --remote` (o `apply_migration` voltou "declined" sem diálogo; caminho registrado pela pendência #19), guardião assumindo o papel `postgres` e juntando a saída TAP numa tabela temporária para o MCP, tipos gerados fora do ESLint e do Prettier, Auth conferido pelo `config diff` (a API do Dashboard), `pg_prove` em contêiner Docker no `test db --remote`, linha do `frontend/CLAUDE.md §11` incluída na pendência #3 e `supabase-prod` sem a feature `functions`. Mantidos do code-review: seed com `enabled = true` (a proteção é o CI sem `--include-seed`), TOTP no padrão da plataforma e CLI na raiz. Ficam para o STEP 0.11 o `verify_jwt` e o SDK `@supabase/server`; para o 0.12, CI sem `--include-seed`, com `--skip-vault`, Docker no runner para o `test db` e o custo do download do CLI. |
| 07/11/2026 | **Achado da conferência pós-merge do STEP 0.10:** `npm audit` com **12 vulnerabilidades moderadas, só em desenvolvimento**; produção (`npm audit --omit=dev`) com **0**. Todas vêm do `minimatch` **10.2.6** (GHSA-g3hv-75wg-m249, faixa `>=7.0.0 <11.0.1`), puxado pelo typescript-eslint 8.72.1 (`@typescript-eslint/typescript-estree`) e pelo ESLint 10.14 (direto e via `@eslint/config-array`); a cópia 3.1.5 do jsx-a11y fica fora da faixa. O lockfile anterior ao 0.10 (`4b10f6b`) já tinha essa versão: o 0.10 não a trouxe. **Decisão adiada para o STEP 0.12** (política de audit do CI). |
| 07/11/2026 | **STEP 0.11 ✅** (branch `chore/step-0.11-edge-functions`, PR).

**Versões:** Deno **2.9.8** (a instalada é a última estável, de 21/10/2026); `@std/assert` **1.0.19** (jsr, só testes; puxa `@std/internal` 1.0.14). Consultados para a decisão: `@supabase/server` 1.9.2 (12/10) e `@supabase/supabase-js` 2.119.0 (04/11).

**Decisão do Danilo:** as funções do app usam **`verify_jwt` ligado + `@supabase/server`**, com `createSupabaseContext({ auth: 'user' })` dentro do `comCors`. São duas camadas: a plataforma barra a chamada sem JWT de usuário antes do código, e o SDK confere de novo no JWKS. O `withSupabase` não entra: o CORS dele é fixo (`*` ou cabeçalho estático) e o erro sai no formato do SDK. O SDK entra só na Fase 1, com a primeira função. Pendência **#21** proposta, para o `supabase/CLAUDE.md §8/§9`.

**Base da decisão** (search_docs do `supabase-dev` + Context7):
- O `verify_jwt` confere o JWT **de sessão do usuário**, HS256 ou ES256. O "as chaves novas não são JWT" só pesa se a chave for no `Authorization`, e no app ela vai no `apikey`.
- A página "Securing Edge Functions" manda manter o `verify_jwt` com `auth: 'user'`; o guia de migração das chaves manda desligar. Prevaleceu a referência de cabeçalhos ("Authorization headers"): ligado nas funções chamadas só com JWT de usuário.
- O `@supabase/server` recusa JWT HS256 legado (exige `kid`). O JWKS público dos dois projetos (`/auth/v1/.well-known/jwks.json`, só leitura) tem uma chave ES256.
- O runtime embutido no CLI 3.0.0 pula a checagem de JWT no `OPTIONS`.

**Entregue:**
- `supabase/functions/deno.json`: rigor do `tsconfig.base.json`, lint `recommended` + 9 regras, fmt como o Prettier e `deno.lock` congelado.
- `_shared/resposta.ts`: `sucesso`, `erro` (400/401/403/404/405/409) e `erroInterno` (500 genérico); `Cache-Control: no-store` em todas.
- `_shared/cors.ts`: `comCors`, com allowlist por igualdade exata, preflight, 405 e exceção → 500 com CORS.
- `_shared/consoleDeTeste.ts`, só para testes.

**Decisões tomadas no STEP (para conferência):**
1. O 500 só sai por `erroInterno()`. O tipo de `erro` não o aceita, e em execução um status fora da lista vira o 500 genérico.
2. Origem negada recebe **403** antes de qualquer trabalho, inclusive no preflight. A chamada sem `Origin` (servidor a servidor) passa sem cabeçalhos CORS: o JWT continua exigido.
3. Só **POST** (as funções são comandos). Outro método recebe 405 com `Allow`.
4. Os cabeçalhos permitidos são a lista do supabase-js 2.119.0 (`@supabase/supabase-js/cors`), copiada à mão. `Max-Age` 7200 (teto do Chrome).
5. `Vary: Origin` em toda resposta e `Cache-Control: no-store` em toda resposta padrão.
6. O log de exceção leva só o tipo e a pilha, nunca a mensagem.
7. Nomes em pt-BR, como no frontend; testes em `*.test.ts`, como no frontend.

**Verificado:**
- `deno fmt --check`, `deno lint`, `deno check` e `deno test` com saída 0 (14 testes).
- TDD com RED por asserção antes de cada GREEN. O contrato de tipo teve o RED pelo `deno check` (`@ts-expect-error` sem uso), e a exceção, pelo erro escapando do wrapper. O teste "sem `Origin`" passou já no esqueleto, que só repassava a chamada: a garantia de passagem foi provada pela mutação.
- Sonda temporária barrada pelas 7 regras (`any`, retorno sem tipo, `enum`, variável sem uso, índice sem checagem, `!`, `==`).
- O lockfile congelado recusou a instalação até ser gerado de propósito.
- **Teste de mutação:** 33 mutações realistas, todas pegas, entre elas origem por prefixo e por sufixo de domínio, preflight caindo no handler, curinga no Allow-Origin, exceção escapando e log com a mensagem.
- Os cinco portões do frontend verdes (178 testes), com o Prettier e o ESLint da raiz fora de `supabase/`.
- `list_edge_functions` do dev vazio; nada mudou nos dois projetos.

**Code-review (medium), 8 achados.**

Corrigidos:
- o método fora de POST chegava ao handler (agora 405);
- a exceção ia inteira para o log: a mensagem pode trazer dado pessoal ou segredo, e o `JSON.parse` do V8 cita a entrada;
- a barreira do `erro()` virava 500 em silêncio (agora registra o status; o 405 entrou na lista).

Mantidos:
- **localhost aceito também na produção:** decisão do Danilo neste STEP e no §8. A autenticação é por token no cabeçalho, não por cookie: uma página em localhost não tem o token da sessão de produção. Fica como proposta abaixo.
- **lista de cabeçalhos copiada à mão:** o supabase-js ainda não está em lugar nenhum. Na Fase 1 a lista passa a vir do `corsHeaders` do pacote.
- **preflight negado com corpo JSON:** o navegador o descarta.
- **`Vary` acrescentado sem checar o do handler:** nenhum handler define `Vary`.
- **`deno.json` único:** o código de produção do `_shared` só usa import relativo; o `deno.json` por função entra com a primeira função.

**Para o Danilo:**
- (a) Restringir o localhost ao projeto de dev, pelo `SUPABASE_URL` que a plataforma injeta: o mesmo desenho do `[remotes.dev]` do `config.toml`.
- (b) 📋 Conferir no Dashboard dos dois projetos (Project Settings → JWT Keys) que a **chave atual** é a ECC P-256. O SDK recusa token HS256, e o JWKS também mostraria uma chave de reserva.
- (c) No VS Code, a extensão do Deno com `deno.enablePaths: ["supabase/functions"]`: sem ela, o TypeScript do editor marca `Deno` e `@std/assert` como desconhecidos nessa pasta (só no editor; o `deno check` é o portão).

**Para os próximos STEPs:**
- 0.12: o job `edge-functions` com Deno 2.9.8 fixado, rodando os quatro portões em `supabase/functions`. Proposta: falhar se aparecer `deno-lint-ignore`, `@ts-ignore` ou `@ts-nocheck`.
- Fase 1: `deno.json` da `provisionar-usuario` com o `@supabase/server` exato; `[functions.provisionar-usuario] verify_jwt = true` explícito no `config.toml`; provar no dev publicado o preflight com `verify_jwt`; provar que o 401 da plataforma chega legível ao navegador.

Fora do commit: `.claude/`. Próximo: STEP 0.12, aguardando aprovação. |
| 08/11/2026 | Com autorização do Danilo: pendência **#21** aplicada no `supabase/CLAUDE.md`, no PR do STEP 0.11.
- **§8, autenticação:** `@supabase/server` com `createSupabaseContext` dentro do `comCors`; o `withSupabase` fica de fora; `verify_jwt` ligado, em duas camadas.
- **§8, resposta padrão:** inclui o 405.
- **§9:** a frase "se decidem no STEP 0.11" sai. No lugar dela: o `verify_jwt` confere o JWT de sessão, as chaves novas vão só no `apikey`, e o SDK exige ES256.

Item (c) do STEP 0.11 resolvido: a extensão do Deno para o VS Code (`denoland.vscode-deno` 3.53.1) foi instalada no WSL, com `deno.enablePaths`, `deno.path` e `deno.config` no `.vscode/settings.json` local, fora do git. O painel de problemas deixou de acusar `Deno` e `@std/assert` em `supabase/functions/`. |
| 08/11/2026 | Danilo aprova o STEP 0.11 (PR #10).

**Desvios aceitos:**
- o 405 na resposta padrão;
- `Cache-Control: no-store` em toda resposta padrão;
- o 500 da exceção com CORS e, no log, só o tipo e a pilha;
- a correção do entregável 10 na §9 do plano.

**Também aceitas:** as decisões 1–7 do STEP e os achados mantidos do code-review.

**Proposta (a) aprovada:** o localhost passa a valer só no projeto de dev, decidido pelo `SUPABASE_URL` que a plataforma injeta, no mesmo desenho do `[remotes.dev]` do `config.toml`. Entra na Fase 1, com a primeira função publicada no dev, onde dá para provar o ambiente real. Até lá, o `comCors` aceita as duas origens nos dois projetos.

**Segue pendente com o Danilo:** 📋 confirmar no Dashboard dos dois projetos (Project Settings → JWT Keys) que a chave atual é a ECC P-256, antes da abertura da Fase 1. |
| 08/11/2026 | Confirmações do Danilo depois do merge do PR #10 (STEP 0.11), registradas na abertura do STEP 0.12:
- **Localhost só no dev** (proposta (a) do 0.11): confirmado. Entra na Fase 1, com a primeira função publicada no dev, decidido pelo `SUPABASE_URL` que a plataforma injeta (o mesmo desenho do `[remotes.dev]` do `config.toml`).
- 📋 **Chave atual de assinatura de JWT = ECC P-256 nos dois projetos** (dev `maxis` e `maxis-producao`), conferida pelo Danilo no Dashboard (Project Settings → JWT Keys). Fecha o 📋 pendente do registro anterior e resolve o risco "JWT de usuário assinado com ES256" da §8 do plano da Fase 0. |
| 12/11/2026 | **STEP 0.12 ✅** (branch `chore/step-0.12-pipeline`, PR #11).

**Versões** (Actions por SHA de commit, a última estável de cada uma):
- `actions/checkout` v7.0.1 (`3d3c42e`), `actions/setup-node` v7.1.0 (`949feb2`) e `denoland/setup-deno` v2.0.5 (`22d081f`);
- `actions/upload-artifact` v7.0.2 (`cf430e0`) e `actions/download-artifact` v8.0.2 (`9000827`);
- `actions/upload-pages-artifact` v5.0.0 (`fc324d3`) e `actions/deploy-pages` v5.0.1 (`368f825`);
- runner `ubuntu-24.04`, Node pela `.nvmrc`, Deno 2.9.8 e Supabase CLI 3.0.0 (o do lockfile; a 3.1.0 saiu e não foi adotada).

Na conferência local, fora do repositório: `actionlint` 1.7.12, `shellcheck` 0.11.0 e `jq` 1.7.1 (a linha do runner), todos com SHA-256 conferido.

**Decisões do Danilo:**
1. **Só o token, sem a senha do banco.** Sem senha, o CLI cria um papel de login temporário pela API de gestão (provado no dev), e o `test db` nem aceita senha. São tokens com escopo, um por projeto, como `SUPABASE_ACCESS_TOKEN` em cada environment.
2. **Pages habilitado já no 0.12**, com origem "GitHub Actions" e sem domínio (o domínio fica no 0.13).
3. **`npm audit`:** produção barra qualquer alerta; todas as dependências barram alto ou crítico.
4. **Actions:** SHA obrigatório e lista fechada (as do GitHub + `denoland/setup-deno`) nas configurações do repositório.

**Configurado no GitHub:**
- environments `development` (sem restrição de branch) e `production` (só a `main`); o `github-pages` foi criado pelo Pages, também só para a `main`;
- variáveis públicas de produção no `production`.

**Decisões tomadas no STEP (para conferência):**
1. **Seis jobs.** O deploy-frontend do plano virou dois. O **build-frontend** é agnóstico de hospedagem, roda junto com o deploy-backend e guarda o `dist` como artefato. O **deploy-frontend** espera os dois e só publica. `pages`/`id-token` ficam num job onde não roda código de dependência, e migrar para a Vercel troca só ele.
2. **Refs dos dois projetos fixos no `env` do workflow**, e não em variável cadastrada. São públicos, e cada comando leva o `--remote` explícito.
3. **`npm ci --ignore-scripts`.** No Linux, só o `fsevents` (macOS) tem script de instalação.
4. **`deployment: false` no banco e no build-frontend**, para não criar registro de deployment a cada PR. A regra de branch do environment vale assim mesmo (provado).
5. **`timeout-minutes` em todo job.** É a resposta ao `tsc -b` que travou uma vez no 0.5: um job preso cai em minutos, não em 6 horas.
6. **`functions deploy` pulado enquanto não houver função.** Sem nenhuma, o CLI sai 1 (provado no dev). Não usa `--prune`: tirar uma função de produção é decisão explícita.
7. **Conferência das migrations com `jq` sobre o JSON.** O `migration list` sai 0 mesmo com diferença (provado com arquivo-sonda). No JSON, o lado ausente vem como `""`, nos dois sentidos (provado).
8. **Barreira de supressões no Deno** (proposta do 0.11). O `@ts-expect-error` segue permitido.
9. **Barreiras de chave:**
   - varredura de `sb_secret_…` no `dist`, no build do PR e no de produção, com `grep -l` (o valor nunca vai para o log);
   - no build de produção, a URL tem de ser a do projeto de produção e a chave tem de ser publishable.
10. **Typecheck e build mantidos os dois** (pendência do 0.3). No CI, tipos levam 3s e o build 4s: o `tsc -b` do build é incremental.
11. **`npx --no`.** No CI, um `npx` sem o pacote instalado baixaria a última versão do CLI; com `--no`, falha.
12. **`.env.example` em `frontend/`**, o `envDir` do Vite.
13. **Variáveis públicas cadastradas pelo Claude.** São públicas por desenho; no plano, o cadastro era do Danilo.

**Achado no CI:** sem terminal, o `test db` recusa rodar num projeto hospedado ("Confirmation required … Nothing was changed"). Ganhou `--yes`.

**Incidente:** no primeiro cadastro, os dois tokens viraram o **nome** dos segredos, em vez do valor. Os nomes apareceram na listagem e, com eles, nesta conversa.
- O Danilo revogou os dois tokens no Supabase.
- Os segredos com nome errado foram apagados.
- Os tokens novos foram cadastrados como `SUPABASE_ACCESS_TOKEN`, conferido pelo nome (nenhum valor exposto desta vez).

**Verificado:**
- **PR #11:** `frontend` (1min47), `banco` (1min23) e `edge-functions` (10s) verdes; os três jobs de deploy pulados.
- **pgTAP pelo CI:** 14/14, PASS.
- **Log público sem segredo:** nenhum token, chave ou URL com senha; o token aparece como `***`.
- **PR descartável #12**, fechado sem merge e com a branch apagada. Cada job falhou no passo esperado:
  - chave no build;
  - migration sem aplicação no dev, com a linha "repositório: 20261112000000 · dev: —";
  - `@ts-ignore`.
- **Sondas do `production` num PR**, com e sem `deployment: false`: as duas foram recusadas pelo GitHub antes de rodar ("not allowed to deploy to production due to environment protection rules").
- **Cada passo de shell testado à parte**, com o `npx` simulado:
  - migrations: 10 casos (alinhado, vazio, só no repositório, só no dev, versões trocadas, `null`, `""`, JSON sem a chave, saída vazia e erro do CLI);
  - supressões: 5 formas barradas e o `@ts-expect-error` permitido;
  - desvio do `functions deploy`;
  - varredura de chave: só o prefixo `sb_secret_`, que o supabase-js usa para avisar, não dispara;
  - variáveis de produção: 7 casos;
  - fallback `404.html`.
- **`actionlint` + `shellcheck`** sem achado. A sonda com erro de chave, expressão e aspas foi pega.
- **`config diff --exit-code` sem diferença nos dois projetos.** O `list_migrations` da produção está vazio: o primeiro deploy aplica a `f00_remove_rls_automatica`, que lá não muda nada.

**Code-review (medium), 10 achados.**

Corrigidos:
- a varredura de chave só rodava no build do PR (agora também no de produção);
- a conferência das migrations aceitava versão vazia ou `null` dos dois lados;
- o ref de produção aparecia duas vezes no workflow (agora um lugar só para cada projeto);
- além do achado: o erro do CLI ficava escondido no arquivo JSON.

Já atendido: o `production` restrito à `main` (configurado e provado pelas sondas).

Mantidos:
- **o bundle publicado não passa por lint e testes:** é o mesmo código do job `frontend`, e o build roda o `tsc -b`;
- **o token do dev roda em PR:** a proteção é o escopo (só o projeto de dev); um token clássico ali alcançaria a produção;
- **PRs simultâneos com migration se bloqueiam:** é o contrato do `supabase/CLAUDE.md §2` (repositório e dev sempre alinhados), e os STEPs são um por vez;
- **o `npm audit` pode barrar um hotfix:** decisão do Danilo; tratar é decidir num PR;
- **preparo do Node repetido em 4 jobs:** explícito por job num arquivo sensível, mais fácil de auditar;
- **deploy sem transação:** registrado como risco na §8, com a mitigação.

**Riscos novos na §8:** permissão de escrita do `config push`, deploy parcial, instalação de ~58s por job (cerca de um quarto do `node_modules` é o binário do CLI) e o CLI 3.1.0.

**Para os próximos STEPs:**
- **0.13:**
  - o primeiro deploy (o merge deste PR) é conferido e registrado no 1º commit da branch;
  - o Pages já está habilitado; falta o domínio, o HTTPS e a verificação do domínio.
- **0.14:** os checks obrigatórios do ruleset são os nomes dos jobs: `frontend`, `banco` e `edge-functions`.
- **Fase 1:**
  - a primeira função sai pelo deploy-backend (o token de produção já tem Edge Functions em leitura-escrita);
  - mudança de Auth no `config.toml` exige decidir a permissão de escrita do token.

Fora do commit: `.claude/`. Próximo: STEP 0.13, aguardando aprovação. |
| 12/11/2026 | Danilo aprova o STEP 0.12 (PR #11).

**Desvios aceitos:**
- o deploy-frontend do plano em dois jobs: build agnóstico de hospedagem e publicação com `pages`/`id-token`;
- os refs dos projetos fixos no workflow, não em variável cadastrada;
- sem a senha do banco no GitHub;
- o Pages habilitado no 0.12, com `daniluamaro.github.io/maxis/` em branco até o 0.13;
- as variáveis públicas de produção cadastradas pelo Claude.

**Também aceitas:** as decisões 1–13 do STEP e os achados mantidos do code-review.

**Pontos decididos com a aprovação:**
- a permissão de escrita do `config push` só é decidida quando a primeira mudança de Auth no `config.toml` aparecer (até lá, o token de produção só lê a configuração);
- o Supabase CLI segue no 3.0.0; atualizar para a 3.1.0 é decisão à parte.

**Depois do merge:** o primeiro deploy é acompanhado, e o resultado entra no 1º commit da branch do STEP 0.13. |
| 14/11/2026 | **Primeiro deploy do pipeline (merge do PR #11): duas falhas, registradas na branch `fix/step-0.12-config-pro`.**

**1ª tentativa (12/11): o `db push` falhou** com "IPv6 is not supported on your current network".
- Causa: o `maxis-producao` estava **pausado** (`INACTIVE` na API de gestão). O plano free pausa projeto parado; a produção tinha 5 dias, não os 7 do risco da §8.
- Projeto pausado devolve a configuração do pooler vazia (`[]`, HTTP 200). Sem pooler, o CLI cai na conexão direta, que é só IPv6, e o runner não tem IPv6. O erro engana.
- O mesmo erro se repetiu localmente com o login do CLI do Danilo (acesso total), o que descarta o token.
- Nada mudou na produção. O frontend não saiu: a ordem do pipeline funcionou.

**O Danilo reativou os dois projetos e assinou o plano Pro**, antecipado (a decisão #11 o previa para a conclusão do SaaS). Com o Pro, a pausa por inatividade deixa de existir. Pendência **#22** proposta, para o `CLAUDE.md §1`.

**2ª tentativa (14/11, run inteiro de novo; o artefato de 12/11 tinha expirado):**
- `db push` aplicou a `f00_remove_rls_automatica` na produção, onde ela não muda nada (dois `if exists`).
- `config push` parou em 403 (`storage_config_write`). Ao assinar o Pro, a plataforma ligou nos dois projetos `storage.analytics` (com `max_namespaces` 10) e `storage.image_transformation`. O `config.toml`, vindo do `config pull` no plano free, dizia o contrário.
- Nada foi escrito na configuração; o frontend não saiu.

Logs das duas tentativas sem segredo.

**Proposta para o Danilo:** a checagem do status do projeto antes do CLI (sugerida no chat, para trocar o erro de IPv6 por "projeto pausado") perde a urgência com o Pro. Recomendação: não implementar agora.

**Decisões do Danilo:**
- alinhar o `config.toml` ao Pro: os dois recursos ligados, sem uso, e o token de produção segue sem escrita no Storage;
- corrigir num PR curto, que fecha o deploy do 0.12 antes de abrir o 0.13.

**Correção:**
- `[storage.analytics]` com `enabled = true` e `max_namespaces = 10`;
- `[storage.image_transformation]` declarado com `enabled = true`.

Ao ligar o analytics, o CLI passou a comparar também os limites dele, e o `max_namespaces` (5 no modelo do CLI) apareceu como diferença.

**Verificado:**
- `config diff --remote=<ref> --exit-code` sem diferença nos dois projetos (produção pela base; dev pelo `[remotes.dev]`);
- na produção, pela API de gestão: `vectorBuckets` desligado com 10/5, iguais ao arquivo; os limites dele ficam fora da comparação só porque o recurso está desligado.

**Code-review (medium), 6 achados.**

Corrigidos:
- o risco do `config push` só previa mudança de Auth no arquivo; agora inclui a mudança feita pela própria plataforma;
- o risco da pausa dizia 7 dias, e a produção pausou com 5.

Refutados pela conferência acima:
- `config diff` não registrado;
- `storage.vector` possivelmente divergente;
- "como nos dois projetos" sem prova.

**Proposta para o Danilo:** o job `banco` rodar `config diff --remote=<dev> --exit-code`, como já faz com as migrations (repositório e dev alinhados). Uma mudança da plataforma apareceria no PR, antes de qualquer `db push` na produção. Exige dar ao token do dev a leitura de configuração que o `config push` usa (Add-ons, Database Config, SSL Enforcement, Network Restrictions, Auth Config, Data API Config, Realtime Config, Storage Config). Sugestão: entrar no 0.13, se aprovado. |

---

## Como manter este arquivo (lembrete de workflow)

1. Trabalhar **somente na fase ativa**; STEPs na ordem; entregas pequenas e verificáveis.
2. Ao concluir cada entregável: atualizar a tabela de **Entregáveis** da fase ativa.
3. Ao concluir a fase: atualizar a **barra de progresso**, o **status no Roadmap** e o **Log** (com data).
4. Não iniciar a fase N+1 sem os entregáveis da fase atual ✅ (ou explicitamente adiados) e os critérios de aceite validados.
5. Nova tabela/coluna numa fase → atualizar `@docs/plans/modelo-dados.md` no mesmo commit.
6. Editar os `CLAUDE.md` só com autorização explícita do Danilo (propor, aguardar).
