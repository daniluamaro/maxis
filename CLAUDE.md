# CLAUDE.md — Maxis

> Contrato operacional do projeto. Curto e estável: stack, convenções, regras e fase ativa.
> **Não** é runbook — detalhes de execução vivem em `@frontend/CLAUDE.md`, `@supabase/CLAUDE.md` e nos planos de fase.
> Linguagem imperativa: cada linha muda como você (Claude Code) age. Se não muda, não entra aqui.

---

## 1. Produto

Maxis é um **SaaS multi-tenant por assinatura** para empresas de transporte, logística e supply chain (micro e pequenas, 5–100 usuários). Unifica DMS, TMS, WMS e YMS numa única plataforma web. Cresce por módulos ao longo do tempo — nasce preparado para receber novos módulos/funcionalidades sem reescrita.

**Padrão de qualidade (severo):** é produto pago, não protótipo. Se uma tela parecer template genérico, admin do Bootstrap ou demo de faculdade, **está reprovada**. Visual premium e profissional em toda tela.

- Domínio: `maxis.vemperformar.com.br` · Publicação: GitHub Pages (estático).
- Supabase **só online**, em dois projetos: **`maxis` = desenvolvimento** (já criado) e **produção** separada em São Paulo (`sa-east-1`). Plano Pro desde nov/2026, nos dois projetos. Nenhum ambiente Supabase local.

---

## 2. Stack fixa

| Camada | Tecnologia |
|---|---|
| Runtime | Node 24 LTS (fixado em `.nvmrc`, `engines` e no CI) |
| Build/Frontend | Vite + React + TypeScript (strict) |
| Estilo | Tailwind CSS + shadcn/ui (tema via design tokens — §7) |
| Gráficos | Apache ECharts (`echarts-for-react`) com tema custom |
| Estado/Dados | TanStack Query (server) + Zustand (UI) |
| Ícones | lucide-react |
| Rotas | React Router (`BrowserRouter` + fallback SPA via `404.html`) |
| Backend/Dados | Supabase: Postgres + Auth + RLS + Edge Functions (Deno) |
| Cliente API | `@supabase/supabase-js` (somente a chave publishable no frontend) |
| Formatação | `Intl` pt-BR (moeda, número, data) |
| Deploy | GitHub Actions → GitHub Pages (domínio custom). Build estático, agnóstico de hospedagem — pronto para migrar para a Vercel (`@frontend/CLAUDE.md §14`) |

Não há servidor Node próprio. O "backend" **é** o Supabase, versionado na pasta `supabase/` (migrations, `functions/`, `seed.sql`, `config.toml`). Desenvolve-se direto no projeto de dev pelo MCP; produção só recebe o que está versionado, pelo CI (`@supabase/CLAUDE.md §2`).

---

## 3. Estrutura de pastas e fonte da verdade

```
/CLAUDE.md                     ← este arquivo (contrato)
/project_manager.md            ← fase ativa, progresso, entregáveis, log
/frontend/                     ← app React          (ver @frontend/CLAUDE.md)
/supabase/                     ← migrations, functions/, seed.sql, config.toml (ver @supabase/CLAUDE.md)
/docs/plans/modelo-dados.md    ← FONTE ÚNICA do schema (nunca divergir do banco real)
/docs/plans/fase-XX-*.md       ← plano detalhado de cada fase
/docs/design/                  ← referência visual aprovada (mockup tema claro)
```

- **Schema** → só em `docs/plans/modelo-dados.md`. Introduziu tabela/coluna nova numa fase? Atualize esse arquivo no mesmo commit.
- **Fase ativa / progresso** → só em `project_manager.md`.
- **Plano de fase** → `docs/plans/fase-XX-*.md`.

---

## 4. Regras inegociáveis do produto

- **Login** por e-mail/senha. Ao autenticar, identificar o **`tenant_id`** do usuário e filtrar **tudo** por ele.
- **`tenant_id` (uuid, PK de `empresas`) é a ÚNICA parede de RLS.** `cnpj` é atributo único/validado da empresa (identidade/exibição), **nunca** chave de join ou filtro de segurança.
- **Unidade Gerencial e Setor** são atributos nas tabelas de negócio (`unidade_gerencial_id`, `setor_id`) para filtro/agrupamento/relatório — **não** são parede de RLS na v1. A diferença entre papéis é *quais telas* (perfil de acesso), não *quais linhas*.
- **Navegação:** sidebar esquerda com módulos em **drill-down** + área principal com **abas internas**. Dirigida por **configuração** (objeto de menu), nunca por código duplicado. Componentes reutilizáveis (`Sidebar`, `SidebarModule`, `SidebarItem`, `Breadcrumb`, `PageHeader`, `TabLayout`, `Tab`, `Workspace`).
- **Dados dinâmicos:** novo registro no Supabase reflete na UI sem redeploy. Agregações **no Postgres** (views/RPC) — nunca somar linhas cruas no browser.
- **Papéis:** `super_admin` (dono do SaaS), `master_admin` (dono da empresa, 1 por CNPJ, imutável), `admin` (unidade gerencial), `user` (colaborador).
- **Provisionamento em cascata (sem SMTP):**
  - `super_admin` cria e reseta o `master_admin`; cadastra/bloqueia CNPJ (tela exclusiva **Admin SaaS**).
  - `master_admin` cadastra/gerencia `admin` e `user`, cria perfis de acesso e **reseta senha** de `admin`/`user` da sua empresa.
  - Toda criação/reset gera **senha provisória** (`senha_provisoria = true`) repassada por fora (WhatsApp); troca forçada no 1º login. Edge Function cria usuário com `email_confirm: true` (sem SMTP ele não logaria).
- **Perfis de acesso:** criados pelo `master_admin`, por **módulo/funcionalidade/aba + leitura/edição**. Não excluir perfil com usuários vinculados. Usuário **sem perfil** vê apenas tela de alerta ("procure a equipe de tecnologia"), sem acesso a mais nada.
- **Gate comercial:** `profile.ativo = false` → tela "acesso suspenso", sem vazar dados.
- **Sessão:** expira após **8h de inatividade** — implementar idle-timer no cliente (`signOut()`); o Supabase sozinho não faz isso.
- **Login minimalista:** só e-mail, senha e botão Entrar (logo discreta ok). **Proibido** "esqueci a senha", cadastro ou login social.

---

## 5. Segurança de chaves (CRÍTICO)

- A **chave secreta** (`sb_secret_…`) **nunca** no frontend, no build, em secret do frontend ou em arquivo versionado. Só no ambiente das **Edge Functions**, onde a plataforma a injeta.
- A chave **publishable** (`sb_publishable_…`) é pública por design; a **RLS** é quem protege. Nenhum dado de um tenant acessível por outro, em hipótese alguma.
- Chaves legadas (`anon`/`service_role`, JWT): **desativadas** nos dois projetos.
- Criação de usuário e qualquer escrita privilegiada: só em **Edge Function** com a chave secreta. Escrita em `profiles` só via Edge Function/RPC restrito (única exceção: RPC de troca da própria senha).
- Supabase → Auth → Email, **nos dois projetos**: **cadastro público desabilitado**. Site URL e Redirect = `https://maxis.vemperformar.com.br` (o dev aceita também o localhost de desenvolvimento).
- Segredos locais em `.env.local` (no `.gitignore`). Nenhum segredo versionado.

| Variável | Onde vive | Público? |
|---|---|---|
| `VITE_SUPABASE_URL` | build frontend / GH Actions | Sim |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | build frontend / GH Actions | Sim |
| `SUPABASE_SECRET_KEYS` | ambiente das Edge Functions apenas (injetada pela plataforma) | **NÃO** |

Valores do projeto de **dev** só no `.env.local`; os de **produção** só nas variables do GitHub. Chave de um projeto nunca é usada no outro.

---

## 6. Convenções globais

**Banco (Postgres):** tabela `snake_case` plural (`order_items`); coluna `snake_case` (`created_at`); FK `<tabela_singular>_id` (`tenant_id`, `user_id`).

**TypeScript:** `strict: true` em `frontend/` e nas Edge Functions. **`any` é banido** (sem exceção; prefira `unknown` + narrowing, genéricos ou union types). Injeção de dependência via construtor `private readonly` camelCase. Métodos públicos com **tipo de retorno explícito**. Comentários explicam intenção/trade-off, não o óbvio. Sem código morto/comentado.

**Rotas:** **segmentos de rota** (não query param), padrão único em todo o sistema: `/modulo/funcionalidade/aba` (ex.: `/operacoes/gestao/pedidos`). Refresh/voltar/avançar/deep-link preservam a aba.

**Permissões:** chave estável `modulo.funcionalidade.aba.acao` (ex.: `operacoes.gestao.pedidos.view` / `.edit`). O objeto de menu (config) é a origem do catálogo; um seed popula as tabelas de permissões a partir dele. Deixar a arquitetura pronta para permissões mesmo antes de aplicá-las em toda tela.

**Formatação pt-BR (sem exceção):** moeda `R$` via `Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'})`; número/percentual com milhar e vírgula decimal; data `dd/mm/aaaa` (e `dd/mm HH:mm` quando relevante). **Nunca** exibir número cru, `null`, `NaN`, JSON ou nome técnico de coluna na UI.

**UI:** **zero emoji** na interface — ícones só via lucide. Skeletons no loading (não spinner central), estado vazio orientado, erro amigável com "tentar de novo" (nunca stack trace). Foco visível, contraste AA, alvos de clique confortáveis. Sem preto/branco puro. 404 estilizada, favicon e `<title>` corretos.

**Git:** Conventional Commits (`feat:`, `fix:`, `chore:`…). Uma unidade de valor por commit. Rodar `code-review` antes de commitar/abrir PR.

> A convenção de status `⬜ Não iniciada · 🔄 Em andamento · ✅ Concluída · ⛔ Bloqueada · 📋 Manual/checklist` vale **apenas nos `.md` de governança** — não é UI, não viola a regra de "zero emoji".

---

## 7. Design System (contrato visual)

Referência visual aprovada: `docs/design/maxis-tema-claro.html`. Princípios:

- **Dual-tone:** sidebar **navy escura** + workspace **claro**. Superfícies claras se separam por **sombra suave**, não por borda forte.
- **Ouro = marca** (logo, item ativo, destaques). **Verde/âmbar/vermelho/azul = funções** semânticas (sucesso, atenção, alerta, informação). Nunca usar função como enfeite.
- **Contraste AA obrigatório:** sobre branco, acentos usam a variante escurecida para texto; a variante viva fica para preenchimento (barras, pontos, fills).
- **Tipografia:** Manrope (títulos) · Inter (corpo/UI) · JetBrains Mono (todo número, moeda, métrica).

Tokens canônicos (fonte única; replicar no Tailwind/shadcn e no tema do ECharts):

```
Superfícies  --bg-base:#F4F6FB  --bg-panel:#FFFFFF  --bg-panel-alt:#EEF1F7  --bg-hover:#E8ECF4
Bordas       --border:#DDE3EE   --border-soft:#E8ECF3
Sidebar      --sidebar-bg:#0E1A33  --sidebar-bg-alt:#16233F
Marca        --gold:#C79A2E (marca/barras)  --gold-strong:#8A6D1A (ouro como texto, AA)  --navy:#14294D
             --gold-bright:#F0CC5C (só dentro da sidebar escura)  --gold-dim:#8A7328 (só no gradiente do logo)
Texto        --text-primary:#0F1A2E  --text-secondary:#52607A  --text-tertiary:#8A94A9
Funcionais   --green:#1F9D57/--green-text:#157F43  --red:#D64545/--red-text:#C0392B
             --amber:#E0A106/--amber-text:#8A5A00  --blue:#2563C4/--blue-text:#1E4FA0
Sombra       --shadow-sm:0 1px 2px rgba(16,26,46,.04),0 1px 3px rgba(16,26,46,.06)
             --shadow-md:0 4px 14px rgba(16,26,46,.08) (só elementos flutuantes: popover, dropdown, diálogo)
Forma        --radius:10px
```

Item ativo da sidebar: `--gold` com transparência (nunca outro tom de ouro).

Gráficos ECharts: grid/eixos `--border`, rótulos `--text-secondary`, série `[navy, gold, green, blue, cinza]` (cinza = `--text-tertiary`), tooltip branco com sombra. **Nunca** usar cores default do ECharts.

---

## 8. Ferramentas (skills/MCPs) — protocolo de bootstrap obrigatório

Nenhuma skill/MCP está pré-instalada. Para **cada uma** abaixo, antes de usar: (1) **verifique** se está disponível; (2) se faltar e for instalável, **instale avisando** numa linha; (3) se exigir credencial, **pare e peça ao Danilo**; (4) se não existir ou não instalar, **não falhe** — marque como indisponível e use o fallback manual. Nunca presuma que está instalada.

| Ferramenta | Uso | Fallback |
|---|---|---|
| `frontend-design` (skill) | sempre, para UI/UX e qualidade visual | design manual seguindo §7 |
| Context7 (MCP) | sempre, docs de libs/frameworks/SDKs | docs via web |
| Supabase (MCP) | sempre, para tabelas/banco Supabase — **escrita só no dev** (`maxis`); produção somente leitura | Supabase CLI (`--remote`) + SQL |
| `supabase/agent-skills` | padrões Supabase — já incluídas no plugin oficial `supabase` (skills `supabase` e `supabase-postgres-best-practices`); não instalar de novo | convenções de `@supabase/CLAUDE.md` |
| `code-review` (skill) | antes de commit/PR | revisão manual (legibilidade, erros, segurança, aderência a este arquivo) |
| superpowers (skills) | brainstorming antes de codar; TDD; debugging root-cause | processo manual equivalente |
| `typescript-lsp` | `goToDefinition`/`findReferences`/`hover` em vez de `grep` | leitura cuidadosa |
| `/revise-claude-md` | ao final de tarefas relevantes (respeitando §10) | proposta manual de mudança |

MCPs Supabase e Context7 autenticam via **OAuth** pelo `/mcp` (login no navegador, feito pelo Danilo) — nenhum token ou API key no chat nem em arquivo; o `.mcp.json` do projeto não guarda segredo. MCP pedindo autenticação → **pare e peça ao Danilo** para autorizar. Ferramentas de escrita do MCP (`apply_migration`, `execute_sql`, `deploy_edge_function`…) **nunca** entram na allowlist de permissões: toda escrita passa pela aprovação do Danilo. Exceção: o `execute_sql` do `supabase-prod`, que roda somente leitura (`read_only=true`), pode entrar; o do `supabase-dev`, nunca.

---

## 9. Testes

- **Frontend:** Vitest + React Testing Library.
- **Edge Functions (Deno):** `deno test`.
- **RLS/policies:** pgTAP no projeto online de **dev** (pelo MCP e no CI), cada teste em transação com rollback. **Nunca** contra produção. Sem Supabase local (nem Docker).
- **Portões locais** (verdes antes de todo commit; o CI roda os mesmos, mais auditoria e varreduras): frontend em `@frontend/CLAUDE.md §15`; Edge Functions e banco em `@supabase/CLAUDE.md §12`.
- **TDD** (Red-Green-Refactor) para **lógica, RLS e Edge Functions**, a partir da **Fase 1**. Não exigir TDD em STEPs puramente de estilo/CSS. Fase 0 é infra/setup.

---

## 10. Workflow de fases e governança

- Desenvolver **somente a fase ativa** indicada em `@project_manager.md`. Seguir os STEPs **na ordem** (0.1 → 0.2 → …); não pular.
- Entregas **pequenas e verificáveis**; marcar TODOs `[ ]`→`[x]`. Ao concluir cada step, atualizar `project_manager.md` (progresso, log, entregáveis).
- **Não iniciar a fase N+1** antes dos entregáveis da fase atual estarem ✅ (ou explicitamente adiados). Validar **todos** os critérios de aceite antes de marcar a fase ✅.
- Abrir cada fase referenciando `@docs/plans/fase-XX-*.md` (+ `@project_manager.md` e `@docs/plans/modelo-dados.md` quando necessário).
- **Governança dos `CLAUDE.md`:** os três (`/CLAUDE.md`, `frontend/CLAUDE.md`, `supabase/CLAUDE.md`) só podem ser editados com **autorização explícita do Danilo**. Nunca reescrever, reordenar ou remover conteúdo por conta própria — mesmo ao concluir fase, notar convenção desatualizada ou perceber inconsistência. **Proponha** a mudança (o quê, onde, por quê) e aguarde confirmação.

---

## 11. Fase ativa

**Fase 1 — Dados base & Segurança multi-tenant** — próxima; abre com aprovação do Danilo, depois da revisão do plano para o projeto de dev online. Plano: `@docs/plans/fase-01-dados-seguranca.md`.

Fase 0 (Infraestrutura & Setup) ✅ concluída em 14/11/2026: produto no ar em `https://maxis.vemperformar.com.br`, deploy em ordem pelo pipeline e `main` protegida. Pendências de governança ainda abertas: tabela em `@project_manager.md` (aplicar cada uma só com autorização, no prazo indicado).
