# Fase 0 — Infraestrutura & Setup

> Plano detalhado da Fase 0. Fase ativa e progresso: `@project_manager.md`. Schema: `@docs/plans/modelo-dados.md`.
> Convenções: `@CLAUDE.md`, `@frontend/CLAUDE.md`, `@supabase/CLAUDE.md`.
> **Sem lógica de negócio.** TDD não é exigido nesta fase (`CLAUDE.md §9`), mas toda entrega tem verificação objetiva.

**Status:** 🔄 Em andamento · **Depende de:** — · **Libera:** Fase 1

---

## 1. Objetivo

Deixar o repositório pronto para desenvolver com segurança e no padrão visual do produto:
- build, lint, tipos e testes nas três camadas (frontend, banco, Edge Functions);
- dois projetos Supabase online — desenvolvimento (`maxis`) e produção (São Paulo) — operados pelo MCP e pelo CLI remoto, sem nada local;
- tema visual (tokens, fontes, shadcn, ECharts) aplicado e conferível numa página de referência;
- pipeline que valida todo PR e, no merge, publica backend e frontend **em ordem** em `https://maxis.performargestao.com.br`, com a publicação do frontend pronta para migrar para a Vercel.

## 2. Pré-requisitos (antes do STEP 0.1)

- [x] **Governança aplicada no `CLAUDE.md` raiz** (autorização do Danilo): pendências #1 (Node 24, §2), #2 (MCPs via OAuth, §8) e #4 (tokens, §7) — ver `project_manager.md`.
- [x] **MCPs autorizados** via `/mcp`: Supabase e Context7.
- [ ] 📋 Danilo com acesso a: conta GitHub, DNS de `performargestao.com.br`, Dashboard dos projetos Supabase (dev `maxis` e produção).

## 3. Decisões desta fase

| # | Decisão | Origem |
|---|---|---|
| 1 | Repositório **público** no GitHub (Pages gratuito). Consequência: nada sensível no código; logs do Actions são públicos — nunca imprimir segredo; PRs de fork não recebem secrets; deploy só em push na `main`. | Danilo |
| 2 | Deploy **automático e em ordem** no push na `main`: testes → migrations → Edge Functions → frontend. O frontend nunca chega antes do schema. | Danilo |
| 3 | **Um PR por STEP**, com CI verde e `code-review` antes do merge (exceto 0.1–0.2, que criam o próprio repositório). | Danilo |
| 4 | npm workspaces: `package.json` raiz (privado) com o workspace `frontend` e o Supabase CLI como devDependency; lockfile único na raiz. | proposta |
| 5 | Versões: a última estável no momento do STEP, conferida via Context7, **fixada exata** (sem `^`/`~`) + lockfile versionado. Tailwind v4 (configuração no CSS), padrão atual do shadcn. **Exceção: TypeScript 6.0.x** — o 7 (nativo) é o último estável, mas o typescript-eslint 8.72 só aceita `<6.1` e o `typescript-language-server` depende do `tsserver`, que o 7 não traz; é a mesma linha do Deno 2.9.8. Reavaliar o 7 quando o typescript-eslint suportar. | proposta · TypeScript: Danilo (03/11/2026) |
| 6 | Fontes **self-hosted** via pacotes `@fontsource` (sem requisição a terceiros, versão fixa). O mockup usa Google Fonts só por ser HTML estático. | proposta |
| 7 | **Fonte única de tokens = `frontend/src/theme/tokens.css`** (espelho do §7). Tailwind e shadcn leem dele; o tema ECharts lê as CSS variables em tempo de execução. A paleta padrão do Tailwind é **desligada** — `bg-blue-500` não existe no build. | proposta |
| 8 | Produção mostra só uma **página de abertura** com a marca até a Fase 2. A **página de referência do tema** existe apenas em desenvolvimento. | proposta |
| 9 | Sem hooks de pre-commit; o portão é o CI + proteção da `main`. | proposta |
| 10 | Actions fixadas por **SHA de commit**; permissões mínimas por job; `pages`/`id-token` só no job de deploy. | proposta |
| 11 | Supabase **só online**, em dois projetos: `maxis` (us-west-2) = **desenvolvimento** — MCP com escrita, testes e seed; **produção** nova em São Paulo (`sa-east-1`) — escrita só pelo CI, MCP somente leitura. Plano free até a conclusão do SaaS, depois Pro. Sem Supabase local nem Docker. | Danilo |
| 12 | Hospedagem **portátil**: GitHub Pages agora, Vercel no futuro (`frontend/CLAUDE.md §14`). O específico da hospedagem (fallback `404.html`, publicação) fica só no job `deploy-frontend`; na migração, a Vercel é publicada pelo pipeline, depois do backend — nunca pelo deploy automático por Git da Vercel. | Danilo |

## 4. STEPs (na ordem; não pular)

### STEP 0.1 — Ferramentas locais
**Entrega:** máquina com tudo o que as próximas fases usam.
- [x] 📋 Danilo: Node **24 LTS** via nvm (ativo no projeto) — v24.22.2 na sessão, 03/11/2026
- [x] Deno instalado (instalador oficial, sem sudo — instalar avisando)
- [x] 📋 Danilo: `gh` CLI (exige sudo) + login no GitHub — gh 2.103.3 em `~/.local/bin`, conta `daniluamaro`, escopos com `workflow`, git configurado (03/11/2026)
- [x] 📋 Danilo: login no Supabase CLI (navegador), para operar os projetos online pelo CLI (`config push`, `migration list`, sempre com `--remote`) — nada local · CLI 3.0.0 logado (03/11/2026)
- [x] Docker: **dispensado** pela decisão #11 (sem Supabase local)

**Verificação:** versões de `node` (24.x), `deno` e `gh` conferidas e registradas no log do `project_manager.md`; logins do `gh` e do Supabase CLI ativos.

### STEP 0.2 — Repositório git e GitHub
**Entrega:** repositório público com a governança versionada.
- [x] `git init` com branch `main`
- [x] `.gitignore`: dependências, builds, `.env*` (exceto `.env.example`), temporários do Supabase CLI, coverage, arquivos de SO/editor (+ `.claude/settings.local.json`)
- [x] `.nvmrc` (24) e `.editorconfig`
- [x] `README.md` curto (o que é o Maxis e onde estão a governança e os planos; comandos entram no 0.14)
- [x] 1º commit: `chore: governança e planejamento iniciais` (CLAUDE.md, project_manager.md, docs/, frontend/CLAUDE.md, supabase/CLAUDE.md); os arquivos base foram num 2º commit, `chore: configuração base do repositório` (uma unidade de valor por commit)
- [x] Criar o repositório **público** no GitHub (`gh repo create` ou 📋 pela web), adicionar `origin` e enviar a `main` — `https://github.com/daniluamaro/maxis`

**Verificação:** `main` publicada no GitHub com o commit inicial; nenhum arquivo sensível versionado.

### STEP 0.3 — Workspace raiz e frontend Vite + React + TS strict
**Entrega:** app React compilando, sem boilerplate.
- [x] `package.json` raiz: privado, `workspaces: ["frontend"]`, `engines.node` 24, scripts que orquestram as camadas (+ `.npmrc` com `save-exact` e `engine-strict`)
- [x] Scaffold Vite + React + TypeScript (**6.0.x**, decisão #5) em `frontend/` **preservando `frontend/CLAUDE.md`** — template `react-ts` do create-vite 9.3.3, variante `--eslint` (o padrão do create-vite 9 é o Oxlint); o ESLint do template ficou de fora e entra configurado no 0.4
- [x] `tsconfig` com `strict` + `noUncheckedIndexedAccess` + `noImplicitOverride` + `noFallthroughCasesInSwitch`
- [x] Alias `@/` (TypeScript + Vite) — `paths` + `resolve.alias`, como no guia do shadcn para Vite
- [x] Remover todo o boilerplate do template (logos, contador, CSS demo)
- [x] `index.html`: `lang="pt-BR"`, `<title>Maxis</title>`, favicon SVG da marca (monograma "M" em ouro, como no mockup)
- [x] Pastas de `frontend/CLAUDE.md §1` criadas **à medida do uso** (sem pastas vazias) — só `src/app/`
- [x] Achados do code-review: `devEngines` barra também os scripts fora do Node 24; portas fixas do Vite (dev `5173`, preview `4173`, `strictPort`) — é esse localhost que entra no CORS e nos redirects do dev; rigor compartilhado em `tsconfig.base.json`

**Verificação:** servidor de dev sobe; build de produção sem erro; checagem de tipos limpa.

### STEP 0.4 — Lint, formatação e testes do frontend
**Entrega:** portões de qualidade locais.
- [x] ESLint (flat config): typescript-eslint *strict type-checked*, react-hooks, react-refresh, jsx-a11y; `no-explicit-any` como **erro** — ESLint 10.14 com `projectService`; jsx-a11y *strict*; `explicit-module-boundary-types` como erro; sem `eslint-disable` no código (`noInlineConfig`)
- [x] Prettier integrado ao ESLint (sem conflito de regras) — `eslint-config-prettier`; Prettier na raiz para o repositório todo, exceto `*.md`, `docs/`, `supabase/` e o lockfile
- [x] Vitest + React Testing Library + jsdom + matchers do jest-dom (arquivo de setup) — `src/setupTests.ts`; mocks, envs e globais restaurados entre testes
- [x] Scripts: `lint`, `format:check`, `typecheck`, `test`, `build` (+ `format`)
- [x] Primeiro teste real: a tela inicial renderiza a marca "Maxis"

**Verificação:** todos os scripts verdes, sem avisos; um `any` proposital é barrado pelo lint (e removido).

### STEP 0.5 — Tokens, Tailwind e tipografia
**Entrega:** o contrato visual do §7 virando código, em fonte única.
- [x] Tailwind v4 via plugin do Vite — 4.3.4; entrada em `src/index.css`
- [x] `theme/tokens.css` com **todos** os tokens do §7 (incluindo os da pendência #4) como CSS variables
- [x] Mapeamento dos tokens para utilitários (cores, sombras, raio, famílias); paleta padrão do Tailwind desligada — `@theme inline reference`, utilitário com o nome exato do token (`bg-bg-panel`, `text-text-secondary`); também desligados sombras, raios, famílias, tamanhos e pesos padrão; raios derivados de `--radius` como no shadcn (6 · 8 · 10 · 14px)
- [x] Fontes via `@fontsource`: Manrope 500/700/800, Inter 400/500/600, JetBrains Mono 400/500/700; famílias `display`, `sans`, `mono`; algarismos tabulares no mono — fonte nunca embutida em base64 no CSS (`assetsInlineLimit`)
- [x] **Escala tipográfica fixa** derivada do mockup (título de página 22, título de seção 17, corpo 13–13,5, rótulos 10,5–11, KPI 25 mono) registrada nos tokens — 7 passos com os nomes padrão do Tailwind (o shadcn herda): `2xs` 10,5 · `xs` 11,5 · `sm` 12,5 · `base` 13,5 · `lg` 17 · `xl` 22 · `2xl` 25
- [x] Base global: fundo `--bg-base`, texto `--text-primary`, seleção em ouro, anel de foco com token — seleção `--gold` com texto `--navy` (o branco do mockup dá 2,6:1); foco `--gold-strong` 2px; borda padrão `--border`; corpo em `base`

**Verificação:** build não gera CSS para `bg-blue-500`; nenhum hex/rgb fora de `tokens.css` (busca no código; exceção: `public/favicon.svg`, asset estático que não lê CSS variables — cores copiadas dos tokens e indicadas no próprio arquivo); fontes carregam sem requisição externa.

### STEP 0.6 — shadcn/ui no tema
**Entrega:** primitivos do shadcn vestidos com os tokens.
- [x] Inicializar o shadcn (`components.json`, alias `@/components/ui`, utilitário de classes) — shadcn 4.23.0, **Base UI** (decisão do Danilo, 05/11/2026), estilo `base-nova`; utilitário = pacote `cn` 0.5.2 (decisão do Danilo), reexportado em `lib/utils.ts`; alias também no `tsconfig.json` raiz (o CLI resolve por ele); CLI chamado com versão explícita (`npx shadcn@4.23.0`), sem pacote no projeto
- [x] Variáveis do shadcn **apontando para tokens** (nenhum valor novo) — direto no `@theme`, sem variável intermediária (a redefinição local de token vale também nos primitivos). Desvios da proposta, por AA: `destructive` → `--red-text` (o shadcn o usa como texto; `--red` como texto dá 4,4:1); `secondary-foreground` e `accent-foreground` → `--text-primary` (texto de botão e de item em hover; só `muted-foreground` é `--text-secondary`). Proposta:

  | shadcn | Token |
  |---|---|
  | `background` / `foreground` | `--bg-base` / `--text-primary` |
  | `card`, `popover` | `--bg-panel` |
  | `primary` (ação principal) | `--navy` |
  | `secondary`, `muted`, `accent` | `--bg-panel-alt` / `--bg-hover`, texto `--text-secondary` |
  | `destructive` | `--red` (texto `--red-text`) |
  | `border`, `input` | `--border` |
  | `ring` (foco) | `--gold-strong` (marca + contraste ≥ 3:1 sobre branco) |
  | `radius` | `--radius` |

- [x] Adicionar **só** os primitivos usados na página de referência: button, input, label, badge, skeleton, tabs, dialog, toast (sonner) — adaptados: alvo ≥ 40px (sem os tamanhos `xs`/`sm`), foco `ring-2` em `--gold-strong` cheio com `outline-hidden` (alto contraste do Windows), hover em `--bg-hover`, badge no padrão do mockup com variantes `success`/`warning`/`destructive`/`info`, campo com 16px abaixo de `md` (zoom do iOS), textos em pt-BR, sem `dark:` (variante neutralizada) e sem `next-themes`
- [x] Exceção de lint só no config: variantes exportadas pelos primitivos e o `Label` genérico; no app, `Label` sem campo associado é barrado

**Verificação:** primitivos exibidos na página de referência com os tokens; contraste AA conferido nos pares texto/fundo usados. *(A página de referência é do STEP 0.9; aqui, sonda temporária no build de produção, medida no Chromium.)*

### STEP 0.7 — Formatação pt-BR (`lib/format`)
**Entrega:** os únicos formatadores permitidos na UI.
- [x] Moeda BRL, número (casas configuráveis), percentual, data `dd/mm/aaaa`, data-hora `dd/mm HH:mm`, todos com `Intl` pt-BR — `src/lib/format.ts`: `formatarMoeda`, `formatarNumero` (inteiro por padrão), `formatarPercentual` (recebe **fração**: 0,125 → 12,5%; 1 casa por padrão), `formatarData` (data de calendário `YYYY-MM-DD` ou instante), `formatarDataHora` (instante, no fuso de quem vê); aceita o JSON do Supabase e o texto do Postgres; outros formatos de data são recusados
- [x] Valor ausente/inválido (`null`, `undefined`, `NaN`) → "—" — também `Infinity`, data impossível e formato não ISO; constante `VALOR_AUSENTE` exportada; nunca "-0"
- [x] Testes unitários: milhar, negativo, zero, arredondamento, ausentes, e **data `YYYY-MM-DD` sem deslocamento de fuso** (não pode virar o dia anterior em UTC−3) — 79 casos em tabela, fuso dos testes fixo em `America/Sao_Paulo` (`vite.config.ts`); data de calendário provada em 6 fusos (UTC−11 a UTC+14) e instante em 3

**Verificação:** testes verdes (escritos antes da implementação — recomendado já aqui). *(Feito: TDD com RED conferido antes de cada GREEN e teste de mutação — 11 mutações realistas, todas pegas.)*

### STEP 0.8 — Tema ECharts
**Entrega:** gráficos já nascem no padrão do produto.
- [x] `echarts` + `echarts-for-react`, com importação **modular** (só os tipos de gráfico usados, para conter o bundle) — echarts **6.1.0** e echarts-for-react **3.0.6** (a 3.0.7 foi marcada pelo autor como "publicada por engano"); registrados só barra, linha, grade, dica e o renderizador **SVG** (`components/charts/echarts.ts`). Lint barra qualquer import do ECharts fora de `components/charts` e, dentro, as entradas inteiras (`echarts`, `echarts-for-react`, `echarts-for-react/lib/*`); importação só de tipo de `echarts` é permitida
- [x] `theme/echarts.ts`: tema a partir das CSS variables — série `[navy, gold, green, blue, cinza]` (cinza = `--text-tertiary`; o âmbar saiu pela pendência #15), grid/eixos `--border`, rótulos `--text-secondary` (pendência #16), tooltip claro com sombra, fontes do produto — `criarTemaECharts(lerTokensDoGrafico())`; o tema é **criado por gráfico** com os tokens lidos ao montar, não registrado no módulo (sem estado global; o tamanho de fonte da raiz vale para o próximo gráfico). Também: dica `--bg-panel` + `--border-soft` + `var(--shadow-md)` + `--radius`, presa ao gráfico (`confine`); faixa do indicador `--bg-hover` por baixo das séries; barra ≤ 24px com ponta arredondada (negativa: embaixo); linha 2px; ponto 8px com anel `--bg-panel`; altura de linha dos rótulos pelo `--line-height-body`; sem animação de entrada; token ausente = erro com mensagem
- [x] Wrapper em `components/charts` que aplica o tema e formata eixos/tooltip via `lib/format` — `GraficoCartesiano`: recebe **dados, não opções do ECharts** (sem prop de cor, um eixo de valor só — `moeda`/`numero`/`percentual` —, até 5 séries); eixo em valor compacto (`formatarMoedaCompacta`/`formatarNumeroCompacto`, novos em `lib/format`), dica e tabela com o valor exato; categoria de data em `dd/mm/aaaa` e mono; dica montada com `textContent` (nome do banco nunca vira HTML); legenda em HTML; tabela equivalente para leitor de tela; desenho carregado **sob demanda** (`lazy`) com skeleton e limite de erro
- [x] Pendências #15 e #16 aplicadas em 07/11/2026 (autorização do Danilo), contrato e código no mesmo commit: série com **5 cores** `[navy, gold, green, blue, cinza]` — sem o âmbar, que ao lado do ouro dava ΔE 4,7 (com 5, o pior par fica em 17,0, acima do mínimo 15, em todos os pares) — e rótulos em **`--text-secondary`** (6,34:1; o `--text-tertiary` dava 3,05:1)
- [x] Exemplo (barras + linha) com dados fictícios — `components/charts/exemplos.ts`, usado nos testes e conferido por sonda no build de produção (Chromium, 900px e 360px). A página de referência é do STEP 0.9 e o recebe lá

**Verificação:** nenhuma cor default do ECharts aparece; tooltip mostra moeda e data em pt-BR. *(Feito: o teste desenha o gráfico de verdade — SVG no jsdom — e confere toda cor e fonte contra o `tokens.css`, com prova negativa sem o tema; no Chromium, a dica mostra "03/11/2026 · R$ 48.320,00", com a sombra `--shadow-md` computada. 24 mutações realistas, todas pegas.)*

### STEP 0.9 — Rotas mínimas, abertura e página de referência
**Entrega:** SPA com roteamento por segmento pronto para o GitHub Pages.
- [x] React Router com `BrowserRouter`. Rotas desta fase: `/` (abertura), `/dev/tema` (**só em desenvolvimento**), `*` (404 com a marca) — React Router **8.5.1** (exato), modo declarativo, tudo de `react-router` (o 8 removeu o `react-router-dom`); `BrowserRouter` no `main.tsx`, rotas em `app/App.tsx`. A rota de referência só existe com `import.meta.env.DEV`: no build, o import some junto
- [x] Página de abertura: marca Maxis em layout dual-tone discreto, sem texto de template — `MolduraDaMarca` (`components/shell/`), a moldura das telas fora do shell: marca na navy da sidebar, conteúdo no claro do workspace (fundo radial do mockup, utilitário `bg-workspace`), lado a lado a partir de 900px (breakpoint `sidebar:`, o corte do `frontend/CLAUDE.md §6`) e empilhadas abaixo; `Marca` (monograma em degradê sRGB `--gold-bright` → `--gold-dim` + nome) em dois tamanhos. Texto: só a marca como título e uma frase sobre o produto
- [x] Página de referência do tema: paleta com nomes dos tokens, escala tipográfica, primitivos shadcn, skeleton, números formatados, gráfico de exemplo (`GraficoCartesiano` com `components/charts/exemplos.ts`) — comparada lado a lado com `docs/design/maxis-tema-claro.html` — `app/referencia/`: KPIs com o fio de ouro, as 24 cores com o valor lido da página (token ausente aparece como tal, sem derrubar a página), sombras e raios, famílias e escala em px, botões, campos, selos, abas, diálogo, notificação, skeleton, tabela dos formatadores e o gráfico. Um teste prova que toda cor e todo passo da escala do `tokens.css` têm amostra com o utilitário do próprio token
- [x] 404 com a marca e link para o início (a versão no shell vem na Fase 3) — mostra o endereço pedido, decodificado (acentos legíveis; malformado aparece como veio), e "Voltar para o início"; título da aba pelo `<title>` do React 19
- [x] Ícones complementares: `apple-touch-icon` 180×180 e favicon PNG de reserva para navegadores sem favicon SVG (Safari < 26) — achado do code-review do 0.3, aprovado pelo Danilo em 03/11/2026 — rasterizados no Chromium a partir do `favicon.svg` (`favicon-32.png` com cantos transparentes, listado antes do SVG e com `sizes`; `apple-touch-icon.png` opaco e sem arredondamento, que o iOS aplica)

**Verificação:** `/dev/tema` inexistente no build de produção; contraste e foco visível conferidos; checklist de tela (`frontend/CLAUDE.md §13`) nos itens aplicáveis. *(Feito: nenhum texto da referência no `dist` e `/dev/tema` cai na 404 no build servido; sonda no Chromium por CDP a 1280 e 360px — todo par texto/fundo no AA (menor: selo "Entregue", 4,51:1), foco por Tab real com anel `--gold-strong` 2px em todas as paradas, diálogo pelo teclado (Enter abre, foco preso dentro, Escape devolve ao gatilho), sem rolagem horizontal, sem erro no console. 21 + 4 mutações realistas, todas pegas.)*

### STEP 0.10 — Projetos Supabase online, MCP e teste guardião
**Entrega:** backend versionado e operado direto nos projetos online — desenvolvimento (`maxis`) e produção (São Paulo) —, sem nada local (decisão #11).
- [x] 📋 Danilo: reativar o projeto `maxis` — `ACTIVE_HEALTHY` em 03/11/2026
- [x] 📋 Danilo: criar o projeto de **produção** em São Paulo (`sa-east-1`), plano free, na mesma organização — nome proposto `maxis-producao`; senha do banco forte, guardada fora do chat e do repositório — `maxis-producao` (ref `ktcryodtgxpmgatihaic`), criado em 07/11/2026; no mesmo dia, a senha do banco do dev redefinida (o MCP e o CLI recebiam `28P01` em toda consulta)
- [x] Mesma versão major do Postgres nos dois (dev hoje: 17.6); se a produção nascer em outra, igualar o dev antes da primeira migration (ele está vazio) — **17.11** nos dois em 07/11/2026
- [x] Supabase CLI como devDependency (versão fixa), usado só contra os projetos online, sempre com `--remote=<ref>` explícito e sem `link`; comandos conferidos via `--help` — **3.0.0** na raiz; mudança em projeto hospedado exige `--yes`, e cada uso passa pela aprovação do Danilo
- [x] Inicializar `supabase/` **preservando `supabase/CLAUDE.md`** — `supabase init` + o `.gitignore` do CLI
- [x] `config.toml` como fonte do Auth dos dois projetos: cadastro público desligado; `site_url` = domínio de produção; localhost de desenvolvimento só no dev (diferença por projeto pelo mecanismo que o CLI suportar — conferir na documentação; sem suporte, 📋 checklist no Dashboard) — a base vale para a produção e o bloco `[remotes.dev]` (`project_id` = ref do dev) acrescenta o `localhost:5173`; o CLI 3 escolhe o bloco pela ref. A base partiu do `config pull` do dev: o arquivo padrão do `init` mudaria mais 14 itens (entre eles a confirmação de e-mail e o MFA). Senha mínima 8 com letras e dígitos (decisão 2 da Fase 1, antecipada no code-review)
- [x] Aplicar o `config.toml` nos dois projetos (`config push --remote=<ref>`) e conferir no Dashboard — conferido pelo `config diff --remote=<ref> --exit-code`, que lê a configuração pela API de gestão (a mesma do Dashboard): sem diferença nos dois
- [x] `.mcp.json` versionado: `supabase-dev` (`project_ref` do `maxis`, com escrita, só as features usadas) + `supabase-prod` (`project_ref` da produção, `read_only=true`) + Context7 — OAuth, nenhum segredo no arquivo — dev com `database,debugging,development,functions,docs`; produção sem `functions`
- [x] O MCP do plugin `supabase` (alcance de conta inteira) fica desativado neste projeto: o único MCP com escrita é o `supabase-dev`; nenhuma ferramenta de escrita na allowlist — MCPs dos plugins `supabase` e `context7` desativados no `/mcp`; saíram da allowlist o `execute_sql` do plugin e o `Bash(npx supabase *)`. O `execute_sql` do `supabase-prod`, que só lê, entrou nela (pendência #20)
- [x] **Via MCP, nos dois projetos:** confirmar que estão vazios, a versão do Postgres e o formato das chaves → resolver a pendência #3 e registrar em `modelo-dados.md §13` (e trocar o default de PK para `uuidv7()` se for PG 18+) — vazios, PG 17 (PK segue `gen_random_uuid()`), as duas famílias de chaves ativas → pendência #3 aplicada e chaves legadas desativadas nos dois. Achado: o dev nasceu com a RLS automática (`ensure_rls` + `public.rls_auto_enable()`, executável por `anon`), que a produção não tem — removida pela migration `f00_remove_rls_automatica`
- [x] **Teste guardião (pgTAP)** em `supabase/tests/database/`: toda tabela de `public` com RLS habilitada; `anon` sem privilégio em tabela/view/função de `public`; nenhuma view de `public` sem `security_invoker`. Passa com zero tabelas e protege todas as fases seguintes. Roda no dev, pelo MCP e por `test db --remote`, em transação e sem resíduo — definir aqui como o pgTAP fica disponível no dev — `guardiao_test.sql`, 14 asserções: 3 no banco real, 8 provas de violação (inclui grant por coluna e `MAINTAIN`) e 3 de conformidade. O pgTAP: o `test db` do CLI instala e remove; pelo MCP, o próprio arquivo cria a extensão dentro da transação, e o rollback desfaz. A saída TAP vai para uma tabela temporária e sai no `select` final, porque o MCP devolve só o último resultado. O `set local role postgres` existe porque o papel de login do CLI só herda os privilégios assumindo o papel

**Verificação:** guardião verde no dev pelos dois caminhos; `supabase-prod` recusa escrita e `supabase-dev` só alcança o `maxis`; Auth dos dois projetos confere com o `config.toml`. *(Feito em 07/11/2026: guardião 14/14 pelo MCP e pelo `test db --remote`, sem resíduo (pgTAP e objetos de prova ausentes depois). Antes da migration, os dois caminhos davam 11/12 acusando a `rls_auto_enable`. Cada servidor MCP só devolve a URL do próprio projeto, e o `supabase-prod` roda como `supabase_read_only_user` em transação somente leitura, recusando `create table` com `25006`. `config diff --exit-code` sem diferença nos dois. Advisors de segurança e performance sem alerta nos dois. Chaves legadas desativadas nos dois, conferido pela API de gestão.)*

### STEP 0.11 — Base das Edge Functions (Deno)
**Entrega:** toolchain Deno e o código compartilhado que toda função da Fase 1 em diante usa.
- [x] `supabase/functions/deno.json`: strict, lint, fmt; lockfile versionado — Deno **2.9.8** (a última estável, de 21/10/2026). O rigor do `tsconfig.base.json` do frontend: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals`/`noUnusedParameters`, `verbatimModuleSyntax`, `erasableSyntaxOnly`. Lint `recommended` mais retorno explícito, `eqeqeq` e sem non-null. Fmt como o Prettier (aspas simples, 100 colunas). Única dependência: `@std/assert` **1.0.19**, só nos testes. `deno.lock` congelado (`lock.frozen`): dependência nova só entra com `--frozen=false`, de propósito. Este `deno.json` configura as ferramentas; cada função terá o seu, com as próprias dependências (`supabase/CLAUDE.md §8`), e o código de produção do `_shared` só usa import relativo
- [x] `_shared/`: resposta padrão (`{ data }` / `{ error: { codigo, mensagem } }` + status HTTP) e CORS com allowlist (produção + localhost) — conforme `supabase/CLAUDE.md §8`. `resposta.ts`:
  - `sucesso(data, 200 | 201)` responde `{ data }`.
  - `erro(status, codigo, mensagem)`, com 400/401/403/404/405/409, responde `{ error: { codigo, mensagem } }`.
  - `erroInterno()` responde 500 com mensagem genérica. O tipo de `erro` não aceita 500, e em execução um status fora da lista vira o 500 genérico, com o status no log.
  - `Cache-Control: no-store` em toda resposta (a senha provisória volta uma única vez).

  `cors.ts`, com `comCors(handler)`:
  - Origem por igualdade exata com `https://maxis.performargestao.com.br` e `http://localhost:5173`. Fora da lista: 403 `origem_nao_permitida`, antes do handler.
  - Preflight: 204 com os cabeçalhos do supabase-js 2.119.0, só `POST, OPTIONS`, `Max-Age` 7200.
  - Outro método: 405 com `Allow`.
  - Sem `Origin` (servidor a servidor): passa, sem cabeçalhos CORS.
  - `Vary: Origin` em toda resposta.
  - Exceção no handler: 500 genérico com CORS e, no log, só o tipo e a pilha.
- [x] Testes `deno test` da resposta padrão e do CORS (origem permitida, negada, preflight) — 14 testes; também método recusado, chamada sem `Origin`, exceção e o que vai para o log
- [x] Nenhuma função publicada ainda (a primeira é a `provisionar-usuario`, Fase 1) — `list_edge_functions` do dev vazio; nada mudou nos dois projetos
- [x] **Decisão do Danilo (07/11/2026):** as funções do app usam **`verify_jwt` ligado + `@supabase/server`** — `createSupabaseContext({ auth: 'user' })` dentro do `comCors`, duas camadas. O `withSupabase` fica de fora: o CORS dele é fixo e o erro sai no formato do SDK. O SDK entra na Fase 1, com a primeira função (pendência #21)

**Verificação:** `deno fmt --check`, `deno lint`, `deno check` e `deno test` verdes. *(Feito em 07/11/2026:*
- *os quatro com saída 0;*
- *TDD com RED por asserção antes de cada GREEN. O contrato de tipo teve o RED pelo `deno check` (`@ts-expect-error` sem uso), e a exceção, pelo erro escapando do wrapper;*
- *sonda temporária barrada pelas 7 regras (`any`, retorno sem tipo, `enum`, variável sem uso, índice sem checagem, `!`, `==`);*
- *lockfile congelado recusando a instalação;*
- *33 mutações realistas, todas pegas.)*

### STEP 0.12 — Pipeline CI/CD
**Entrega:** todo PR validado; todo merge na `main` publicado em ordem.
- [x] Workflow único com jobs — `.github/workflows/pipeline.yml`, runner fixo `ubuntu-24.04`, `timeout-minutes` em todo job:
  - **frontend:** Node pela `.nvmrc`, instalação limpa, lint, format, tipos, testes, build — instalação com `npm ci --ignore-scripts` (no Linux nenhuma dependência precisa de script); depois do build, varredura de chave secreta (`sb_secret_…`) no `dist`; `npm audit signatures`; auditoria (decisão do Danilo): produção barra qualquer alerta (`--omit=dev`), todas as dependências barram alto ou crítico (`--audit-level=high`)
  - **banco:** contra o projeto de **dev** — `migration list --remote` (repositório × dev alinhados; diferença = falha) + testes pgTAP (`test db --remote`) — o `migration list` sai 0 mesmo com diferença: a conferência é um `jq` sobre o JSON (`--output-format json`, lado ausente = `""`), e o erro do CLI aparece no log. O `test db` exige `--yes` sem terminal e roda o `pg_prove` num contêiner Docker do runner
  - **edge-functions:** Deno — fmt, lint, check, test — Deno **2.9.8** fixado; antes dos quatro, falha com `deno-lint-ignore`, `@ts-ignore` ou `@ts-nocheck` em `supabase/functions/` (proposta do 0.11; o `@ts-expect-error` segue permitido)
  - **deploy-backend** *(só push na `main`, após os três)*: no projeto de **produção**, com `--remote=<ref>` explícito — `db push`, `config push` e `functions deploy --use-api` — `db push --skip-vault --yes`, nunca `--include-seed`; `config push --yes`; o `functions deploy` é pulado enquanto não houver função (sem nenhuma, o CLI sai 1 — provado no dev), sem `--prune`
  - **deploy-frontend** *(após o backend)*: build com as variáveis públicas de **produção**; passo de hospedagem isolado (hoje: cópia de `index.html` → `404.html` + publicação no Pages — decisão #12) — dividido em dois jobs: **build-frontend** (agnóstico de hospedagem; confere que a URL é a do projeto de produção e que a chave é publishable, faz o build, varre o `dist` e o guarda como artefato; roda junto com o deploy-backend) e **deploy-frontend** (espera os dois; `404.html` + `upload-pages-artifact` + `deploy-pages`; é o único job com `pages`/`id-token`, e nele não roda código de dependência)
- [x] Environments no GitHub: `development` (credenciais do dev, usado pelo job **banco**) e `production` (credenciais da produção, só nos jobs de deploy) — `development` sem restrição de branch (os PRs o usam); `production` **só para a `main`** (regra de branch), usado pelo deploy-backend e, só pelas variáveis, pelo build-frontend; `github-pages` criado pelo próprio Pages, também só para a `main`. O banco e o build-frontend usam `deployment: false` (sem registro de deployment a cada PR); a regra de branch vale assim mesmo (provado)
- [x] 📋 Danilo cadastra (nunca pelo chat): por projeto, o **token de menor escopo** que o CLI aceitar (não o token clássico do login), a senha do banco e o project ref. Variáveis públicas do Supabase de produção como *variables* (nomes conforme a pendência #3) — **decisão do Danilo: só o token, sem a senha do banco**: sem senha, o CLI cria um papel de login temporário pela API de gestão (o `test db` nem aceita senha). Tokens **com escopo** (alpha público do Supabase), um por projeto, como segredo `SUPABASE_ACCESS_TOKEN` em cada environment — permissões na §8. O project ref fica fixo no workflow (público; `--remote` explícito em cada comando), não em variável. As variáveis públicas (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) foram cadastradas no `production` pelo Claude, por serem públicas por desenho
- [x] `.env.example` com os nomes das variáveis públicas (sem valores); consumo começa na Fase 2 — em `frontend/` (o `envDir` do Vite)
- [x] `concurrency`: um deploy por vez; runs antigos de PR cancelados — um grupo por ref: no PR, o run novo cancela o antigo; na `main`, um por vez, sem cancelar o que está rodando (um run novo que chega enquanto outro espera toma o lugar dele, e publica o estado mais recente)
- [x] Actions fixadas por SHA; `permissions` mínimas por job — `permissions: {}` no topo e `contents: read` por job (deploy-frontend: só `pages` e `id-token`); checkout sem credencial persistida; segredo só no `env` do passo que o usa. No repositório (decisão do Danilo): **SHA obrigatório** e lista fechada de Actions (as do GitHub + `denoland/setup-deno`)
- [x] Pages habilitado com origem "GitHub Actions" (antecipado do 0.13 por decisão do Danilo: sem ele, o deploy-frontend não publica) — sem domínio; até o 0.13, o site responde em `daniluamaro.github.io/maxis/` em branco (o build usa `base: '/'`)

**Verificação:** PR mostra os 3 checks verdes; merge dispara deploy-backend (sem migrations = no-op) e depois deploy-frontend; nenhum segredo aparece nos logs públicos. *(PR, feito em 12/11/2026:*
- *PR #11 com `frontend`, `banco` e `edge-functions` verdes e os três jobs de deploy pulados; pgTAP 14/14 pelo CI;*
- *log público sem token, chave ou URL com senha (o token aparece como `***`);*
- *PR descartável #12, fechado sem merge: cada job falhou no passo esperado (chave no build, migration sem aplicação no dev, `@ts-ignore`), e duas sondas que usavam o `production` num PR foram recusadas pelo GitHub antes de rodar, com e sem `deployment: false`;*
- *`actionlint` 1.7.12 + `shellcheck` 0.11.0 sem achado; cada passo de shell testado à parte, com casos de falha.*

*Merge: só a `main` alcança o `production`, então o deploy é provado no primeiro push na `main`, conferido e registrado no log logo depois. Esse primeiro deploy não é no-op: aplica em produção a `f00_remove_rls_automatica`, que lá não muda nada (dois `if exists`).)*

### STEP 0.13 — Domínio, HTTPS e fallback SPA
**Entrega:** produto no ar no domínio oficial.
- [ ] Pages com origem "GitHub Actions"; domínio `maxis.performargestao.com.br`; HTTPS forçado
- [ ] 📋 Danilo: registro `CNAME maxis → <conta>.github.io` no DNS; **verificação do domínio** na conta GitHub (evita sequestro de subdomínio)
- [ ] Com deploy via Actions, o arquivo `CNAME` é dispensado — confirmar na documentação do GitHub ao executar
- [ ] Vite com `base: '/'`
- [ ] Portabilidade (decisão #12): nada no app depende do Pages — trocar para a Vercel mexe só no job `deploy-frontend` e no DNS

**Verificação:** `https://maxis.performargestao.com.br` abre a página de abertura com certificado válido; deep link e refresh em `/qualquer/rota` mostram a 404 da SPA (não a do GitHub).

### STEP 0.14 — Proteção da `main`, comandos reais e fechamento
**Entrega:** fase fechada com o repositório protegido e a documentação com dados reais.
- [ ] Ruleset da `main`: PR obrigatório, checks `frontend`/`banco`/`edge-functions` obrigatórios, sem force-push
- [ ] Busca de segredos no histórico do git (nenhuma chave, token ou senha)
- [ ] **Sob autorização do Danilo** (`CLAUDE.md §10`): preencher os comandos reais no `CLAUDE.md` raiz, `frontend/CLAUDE.md` e `supabase/CLAUDE.md`
- [ ] `README.md` com os comandos de desenvolvimento
- [ ] `project_manager.md`: entregáveis ✅, Fase 0 ✅ no roadmap, barra de progresso, log; fase ativa → Fase 1

**Verificação:** push direto na `main` é recusado; todos os critérios de aceite (§5) conferidos.

## 5. Critérios de aceite da fase

1. Merge na `main` → pipeline verde → site publicado em `https://maxis.performargestao.com.br` com HTTPS.
2. Deep link e refresh em rota inexistente servem a SPA (404 com a marca), não a 404 do GitHub.
3. Lint, format, tipos, testes e build do frontend sem erro e sem aviso; `any` barrado pelo lint.
4. `tokens.css` é a única fonte de cor/sombra/raio/fonte; paleta padrão do Tailwind indisponível; ECharts sem cores default; página de referência fiel ao mockup (dual-tone, ouro como marca, mono em números).
5. Projetos de dev (`maxis`) e produção (São Paulo) ativos, na mesma versão major do Postgres; teste guardião pgTAP verde no dev; Auth dos dois com cadastro público desligado e Site URL correto.
6. `deno fmt/lint/check/test` verdes.
7. `main` protegida (PR + checks obrigatórios).
8. Nenhum segredo no repositório nem nos logs do Actions.
9. `.mcp.json` com Supabase MCP restrito por projeto: escrita só no dev, produção somente leitura.
10. Pendências de governança #1–#4, #10 e #11 resolvidas e refletidas nos `CLAUDE.md`.
11. Publicação do frontend isolada no job `deploy-frontend`, pronta para migrar para a Vercel.

## 6. Modelagem de dados afetada

**Nenhuma tabela.** A fase só cria o teste guardião (pgTAP) e a configuração do Supabase. As confirmações do `modelo-dados.md §13` (versão do Postgres, formato das chaves) são resolvidas no STEP 0.10 e registradas lá.

## 7. Rotas, Edge Functions e RPCs

| Tipo | Item | Observação |
|---|---|---|
| Rota | `/` | página de abertura (produção) |
| Rota | `/dev/tema` | referência do tema — **só em desenvolvimento** |
| Rota | `*` | 404 com a marca |
| Edge Function | — | só o código compartilhado `_shared/` (resposta padrão, CORS) |
| RPC | — | nenhuma |

## 8. Riscos e atenção

- **Repositório público:** qualquer `echo` de variável no CI pode vazar segredo — usar só secrets mascarados; revisar logs no primeiro deploy.
- **Token do CI:** o login do CLI pelo navegador gera token clássico com acesso à conta inteira; no CI usar o token de **menor escopo** que o CLI aceitar, um por projeto. *(STEP 0.12: tokens com escopo, alpha público do Supabase, cada um restrito ao próprio projeto. **Dev** (job banco, que roda em PR): Database leitura-escrita (o papel de login temporário), Connection Pooling e Production Branches em leitura. **Produção** (deploy-backend): os mesmos três, Project Settings em leitura, a leitura que o `config push` exige para comparar (Add-ons, Database Config, SSL Enforcement, Network Restrictions, Auth Config, Data API Config, Realtime Config, Storage Config) e Edge Functions leitura-escrita. Um token clássico no `development` deixaria um PR alcançar a produção: se o escopo deixar de existir, a decisão volta ao Danilo.)*
- **`config push` sem permissão de escrita:** hoje o `config.toml` não difere dos dois projetos, e o token de produção só lê a configuração. Quando o arquivo mudar o Auth, o deploy-backend falha no `config push`, já depois do `db push`. Aí se decide: dar ao token Auth Config **e** Project Settings em leitura-escrita (o segundo também permite pausar e apagar o projeto) ou aplicar à mão, com aprovação. A falha é visível e o frontend não sai.
- **Deploy parcial:** os passos do deploy-backend não formam uma transação; se o `config push` ou o `functions deploy` falhar depois do `db push`, a produção fica com o schema novo e o frontend anterior. Mitigação: migration compatível com o frontend publicado (expandir antes, contrair depois) e re-executar o job que falhou (o `db push` repetido não faz nada).
- **CLI do Supabase muda entre versões:** conferir comandos e flags com `--help` antes de usar (skill `supabase`).
- **DNS:** propagação pode levar horas; o STEP 0.13 só fecha com HTTPS válido.
- **Plano free pausa projeto parado há 7 dias:** o dev pausa se o trabalho parar; a produção, sem uso até o go-live, também — reativar antes de um deploy. Deixa de acontecer com o plano Pro, na conclusão do SaaS.
- **MCP com escrita no dev:** um comando errado (ou um texto malicioso lido de uma tabela) afeta o dev — por isso schema só por migration versionada, aprovação do Danilo a cada escrita e produção fora do alcance de escrita do MCP.
- **Comando no projeto errado:** dois projetos na mesma conta → sem `link`; todo comando do CLI com `--remote=<ref>` explícito.
- **jsx-a11y parado:** a 6.10.2 (out/2024) não declara suporte ao ESLint 10, embora funcione (testado). A versão do ESLint mora só no `package.json` raiz, e o `overrides` do jsx-a11y aponta para ela (`$eslint`): atualizar o ESLint é mudar uma linha. Revisar quando o jsx-a11y publicar suporte ao 10.
- **`cn` pré-1.0:** o utilitário de classes do shadcn 4 (`cn` 0.5.2, mantido pelo shadcn) é jovem. Mitigação: versão exata e `src/theme/cn.test.ts`, que prova a mesclagem com os nomes do tema — rodar a cada atualização do pacote.
- **Primitivos adaptados divergem do upstream:** um `npx shadcn@<versão> add <x> --overwrite` desfaz as adaptações do STEP 0.6 (alvo ≥ 40px, foco, cores, pt-BR). Atualizar primitivo é por `add <x> --diff`, aplicando à mão o que valer.
- **Peso do ECharts:** mesmo modular, barra + linha + grade + dica + SVG somam ~547 kB (~187 kB gzip; o pacote inteiro daria ~1.144 kB). Mitigação: o desenho é carregado sob demanda (`lazy`), num pedaço à parte, só nas telas com gráfico. Gráfico novo = registrar o tipo em `components/charts/echarts.ts` e estender o tema (o tema só cobre o que está registrado).
- **`echarts-for-react` com manutenção esparsa:** 3.0.6 (jan/2026) é a `latest`; a 3.0.7 saiu marcada "publicada por engano" e as 3.1.7/3.2.7 foram despublicadas no mesmo dia. Mitigação: versão exata, só a entrada `esm/core`, e o wrapper isola o pacote — trocar por um componente próprio (`init` + `setOption` + `ResizeObserver`) mexe só em `DesenhoCartesiano.tsx`.
- **Pedaço do gráfico após deploy:** quem está com a aba aberta durante um deploy pode pedir um pedaço que não existe mais. O limite de erro do gráfico mostra "Recarregar a página" no lugar do desenho; a Fase 3 trata o mesmo para as rotas.
- **Runtime das Edge Functions × Deno local:** o `deno check`/`deno test` roda no Deno 2.9.8, e o runtime hospedado pode estar numa versão anterior: uma API aceita aqui pode não existir lá. Mitigação: o `_shared` usa só as APIs da web (`Request`, `Response`, `Headers`); a primeira função é provada publicada no dev (Fase 1).
- **Preflight com `verify_jwt` ligado:** o runtime embutido no CLI 3.0.0 pula a checagem de JWT no `OPTIONS` (`method !== "OPTIONS" && verifyJWT`), e a documentação não diz isso da plataforma. Provar com a primeira função publicada no dev (Fase 1).
- **JWT de usuário assinado com ES256:** o `@supabase/server` recusa JWT HS256 legado (exige `kid`). Os dois projetos publicam uma chave ES256 no JWKS, mas uma chave de reserva também apareceria ali. Conferir que é a chave atual antes da primeira função (Fase 1): 📋 no Dashboard (JWT Keys) ou pelo cabeçalho do primeiro token emitido. ✅ **Resolvido em 08/11/2026:** o Danilo conferiu no Dashboard que a chave atual é a ECC P-256 nos dois projetos.
- **Cabeçalhos do CORS copiados à mão:** a lista do `comCors` é a do supabase-js 2.119.0. Um cabeçalho novo do cliente derruba o preflight no navegador, e o teste, também copiado à mão, não percebe. Mitigação: na Fase 1, com o supabase-js entrando pelo SDK, a lista passa a vir do `corsHeaders` do pacote fixado; na Fase 2, o frontend fica na mesma versão.
- **`deno-lint-ignore` não é barrado:** o `deno lint` não tem equivalente ao `noInlineConfig` do ESLint. Mitigação: code-review; proposta para o 0.12, o job `edge-functions` falhar se aparecer `deno-lint-ignore`, `@ts-ignore` ou `@ts-nocheck` em `supabase/functions/`. ✅ **Resolvido no STEP 0.12:** o job `edge-functions` falha antes dos quatro portões (provado no PR #12).
- **`npm audit` de desenvolvimento:** 12 alertas moderados (eram 15 no STEP 0.4) do `minimatch` < 11.0.1 (DoS por glob), via ESLint/typescript-eslint/jsx-a11y, sem correção compatível. Risco aceito: só ferramenta de desenvolvimento, com globs da própria configuração. Dependências de produção: 0 alertas. Um portão de auditoria no CI usa `npm audit --omit=dev`. *(STEP 0.12, decisão do Danilo: produção barra qualquer alerta; todas as dependências barram alto ou crítico — os moderados passam. Um alerta novo pode deixar o CI vermelho sem mudança de código, de propósito: tratar é decidir num PR.)*
- **Instalação lenta no CI:** o `npm ci` leva ~58s por job mesmo com o cache restaurado (188 MB), mais da metade do job `frontend`; o binário do Supabase CLI (dependência opcional `@supabase/cli-linux-x64`, ~140 MB) é cerca de um quarto do `node_modules`. Mantido: um só lockfile e a mesma versão do CLI em todo lugar. Rever se o tempo de PR incomodar.
- **Supabase CLI fixado em 3.0.0:** o próprio CLI avisa no CI que a 3.1.0 saiu. Atualizar é decisão à parte, com o `--help` de cada comando do pipeline conferido de novo (a linha 3 já mudou, em relação à 2, o `--yes` em projeto hospedado e o alvo `--remote`).

## 9. Status dos Entregáveis

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
