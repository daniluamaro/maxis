# frontend/CLAUDE.md — Convenções do frontend

> Complementa `@CLAUDE.md` (em conflito, o raiz prevalece). Referência de convenções — **não** é runbook e não contém código.
> Comandos: §15. Editar só com autorização explícita do Danilo (`CLAUDE.md §10`).

---

## 1. Estrutura de pastas

```
frontend/src/
  app/                          ← bootstrap: providers, router, guards, layout raiz
  config/menu.ts                ← objeto de menu: fonte única de navegação, rotas e catálogo de permissões
  features/<modulo>/<funcionalidade>/
                                ← telas por aba, hooks de dados, repositório, componentes locais
  components/
    ui/                         ← primitivos shadcn
    shell/                      ← Sidebar, SidebarModule, SidebarItem, Breadcrumb, PageHeader, TabLayout, Tab, Workspace
    feedback/                   ← skeletons, EmptyState, ErrorState
    charts/                     ← wrapper ECharts com o tema do produto, criado a partir dos tokens
  lib/                          ← cliente Supabase, QueryClient, formatadores pt-BR
  theme/                        ← tokens CSS (espelho do §7) e tema ECharts
  types/database.ts             ← tipos gerados do schema (nunca editar à mão)
```

- Uma feature **não importa** de outra feature. O que é compartilhado sobe para `components/` ou `lib/`.
- Import absoluto via alias `@/`; sem `../../..`.

## 2. Componentes

- Componente = função TypeScript; um componente exportado por arquivo; arquivo `PascalCase.tsx`; hook `useXxx.ts`; demais `camelCase.ts`.
- **Exceção — `components/ui/`:** os primitivos do shadcn mantêm o nome de arquivo do CLI (`button.tsx`) e vários exports por arquivo (`dialog.tsx`), para `shadcn add` e `add --diff` continuarem funcionando (os primitivos importam uns aos outros por esses caminhos). No resto do app, vale a regra acima.
- **Named exports.** Default export só onde uma ferramenta exigir.
- Props em `type <Nome>Props`; sem `any` (raiz §6), sem `React.FC`. Funções, hooks e métodos públicos com **tipo de retorno explícito**.
- Primitivos de `components/ui` são **compostos**, não reescritos. Variante nova = variante no próprio primitivo, construída só com tokens.
- Toda tela é montada com os componentes de `shell/` — nenhuma tela recria sidebar, cabeçalho, breadcrumb ou abas.
- Componente de tela não acessa dados diretamente: consome hooks da feature.

## 3. Dados

- **Estado de servidor: só TanStack Query.** Estado de UI (sidebar recolhida, preferências de tela): Zustand. Nunca copiar dado do servidor para Zustand.
- Acesso ao Supabase isolado em **repositório por feature** (classe com dependências injetadas via construtor `private readonly` — raiz §6), consumido por hooks `useXxx`. Componentes nunca chamam o cliente `supabase`.
- Query keys por fábrica da feature (ex.: `veiculosKeys.lista(filtros)`); toda mutation invalida as keys que afeta.
- Tipos do banco sempre de `types/database.ts` (gerado). Schema mudou → regenerar no mesmo commit.
- Soma, contagem, média, ranking, série de gráfico: **view/RPC no Postgres**. O browser só exibe e formata.
- Isolamento por tenant **não** é papel do frontend (a RLS faz). Nunca usar um `tenant_id` escolhido pela UI como filtro de segurança.
- Ao sair (logout manual ou idle): `queryClient.clear()` + reset dos stores **antes** de redirecionar. Nenhum dado de um usuário sobrevive para o próximo.
- Nunca persistir dado de negócio em `localStorage`/`sessionStorage` (a sessão do Supabase é a única exceção).

## 4. Rotas, navegação e guards

- Rotas **derivadas do objeto de menu**: `/modulo/funcionalidade/aba`. Nenhuma rota de módulo declarada à mão fora do config.
- Aba = **segmento de rota** (nunca estado local nem query param). `/modulo/funcionalidade` redireciona para a primeira aba permitida.
- Rotas fora do shell: `/login`, `/trocar-senha`, `/acesso-suspenso`, `/sem-perfil` e a 404.
- **Ordem dos guards (fixa):** sessão → usuário e empresa ativos → senha provisória → possui perfil (`admin`/`user`) → permissão `…view` da aba.
- Acesso decidido **só** pelo hook `usePermissao()` (`podeVer(chave)`, `podeEditar(chave)`). Nenhum componente lê papel ou perfil direto para decidir o que mostrar.
- Sidebar e abas filtradas por `view`; controles de edição só com `edit`. `master_admin` vê tudo do tenant; `super_admin` vê apenas o Admin SaaS.
- A UI é conveniência — quem barra é o banco (RLS + `tem_permissao`). Nunca tratar o esconder de um botão como segurança.
- Módulos do backlog aparecem como "em breve": visíveis, desabilitados, sem rota navegável.

## 5. Sessão

- Idle-timer de **8h** no root autenticado. Atividade (ponteiro, teclado, rolagem, foco da janela) reinicia o contador.
- Atividade em uma aba do navegador vale para todas (sincronizar entre abas); a expiração também desloga todas.
- Ao expirar: limpeza da §3 → `signOut()` → `/login`.

## 6. Tema e estilo (contrato visual = `CLAUDE.md §7`)

- **Tokens:** a única fonte é o `§7`. Espelhados **uma vez** em `theme/` como CSS variables e mapeados no Tailwind, no shadcn e no tema ECharts.
  - Proibido em componente: hex/rgb literal, paleta default do Tailwind (`blue-500`, `gray-*`, `slate-*`…), cor em `style` inline.
- **Utilitários de tema:** o nome do utilitário é o nome exato do token (`bg-bg-panel`, `text-text-secondary`, `border-border-soft`, `text-gold-strong`); a escala tipográfica é só `text-2xs` … `text-2xl`. Um vocabulário por camada: em `components/ui/`, os primitivos usam os nomes semânticos do shadcn (`bg-card`, `text-muted-foreground`); no resto do app, os nomes dos tokens.
- **Ouro = marca:** logo, item ativo, destaques. Ouro como texto sobre claro = `--gold-strong`. Item ativo da sidebar = `--gold` com transparência — nunca outro tom de ouro.
- **Funcionais** (verde, âmbar, vermelho, azul) só com significado: sucesso, atenção, alerta, informação. Sobre fundo claro, texto e ícone usam `--*-text`; a cor viva fica para preenchimento (barras, pontos, fundos translúcidos).
- **Superfícies** separadas por sombra, não por borda forte: `--shadow-sm` em painéis; `--shadow-md` só em elementos flutuantes (popover, dropdown, diálogo). Bordas com `--border-soft`, discretas. Hierarquia visual por tamanho, peso e espaço — nem tudo vira card.
- **Sidebar navy** redefine os tokens neutros localmente (claro sobre escuro), como no mockup.
- Preto puro nunca; branco puro só via `--bg-panel`. Fundo de página = `--bg-base`; texto = `--text-*`.
- **Tipografia:** Manrope em títulos; Inter em corpo e UI; **JetBrains Mono em todo número, moeda e métrica**, com algarismos tabulares. Escala tipográfica fixa definida na Fase 0 — sem tamanhos avulsos.
- **Caixa alta** só onde o mockup usa: cabeçalho de tabela, rótulo de KPI, rótulo de grupo da sidebar. Títulos e botões em *sentence case*. Rótulo acima de título só quando carrega informação.
- **Responsividade:** desktop primeiro (alvo ≥ 1280px), funcional até 360px. Abaixo de 900px a sidebar vira gaveta. Tabela larga rola dentro do próprio contêiner — a página nunca rola na horizontal.
- **Movimento** só em resposta a uma ação (abrir, expandir, confirmar). Sem animação de entrada em cada seção. Respeitar `prefers-reduced-motion`.

## 7. Estados de tela (obrigatórios em toda tela com dados)

- **Carregando:** skeleton com o formato do conteúdo final. Nunca spinner central.
- **Vazio:** diz o que falta e oferece a próxima ação (ex.: "Nenhum veículo cadastrado" + "Cadastrar veículo", se houver `edit`).
- **Erro:** o que aconteceu + como resolver + botão "Tentar de novo" (refaz a consulta). Nunca stack trace, código HTTP cru ou mensagem do Postgres.
- **Mutação:** botão em estado de envio enquanto processa; confirmação com o mesmo verbo do botão ("Salvar" → "Alterações salvas").

## 8. Formatação e texto

- Número, moeda, percentual, data e data-hora **só via `lib/format`** (`Intl` pt-BR; data `dd/mm/aaaa`, data-hora `dd/mm HH:mm`). Proibido `toFixed`, concatenar `"R$"`, `toLocaleString` avulso.
- Valor ausente → "—". Nunca `null`, `undefined`, `NaN`, zero inventado, JSON ou nome de coluna.
- Valores técnicos passam por mapa de exibição (`master_admin` → "Administrador master"); enum e coluna nunca aparecem crus na UI.
- **Microcopy pt-BR:** voz ativa, *sentence case*, verbo que diz o que acontece ("Resetar senha", não "Enviar"). A ação mantém o mesmo nome em todo o fluxo. Mensagem de erro não pede desculpas e não é vaga.
- Zero emoji. Ícones só `lucide-react`, com tamanho e traço consistentes.

## 9. Acessibilidade

- Contraste AA usando os pares de tokens do `§7` — não inventar combinações.
- Foco visível em todo elemento interativo (anel com token; nunca remover o outline sem substituto).
- Sidebar, abas, menus e diálogos navegáveis por teclado.
- Botão só com ícone tem `aria-label`; alvo de clique ≥ 40×40px.
- Todo campo com `label` associado; erro de validação ligado ao campo e anunciado.

## 10. Gráficos (ECharts)

- Sempre pelo wrapper de `components/charts`, com o tema do produto, criado a partir dos tokens (série na ordem do `§7`). Componente nunca passa cor.
- Eixos, rótulos e tooltip formatados por `lib/format`; tooltip claro com sombra.
- Dados chegam prontos de view/RPC.

## 11. Segurança no cliente

- Variáveis de ambiente: só `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. Nenhum outro segredo em `import.meta.env`. Em desenvolvimento apontam para o projeto de **dev** (`.env.local`); no build de produção, para o de **produção** (variables do GitHub).
- Nunca logar token ou sessão. Sem `dangerouslySetInnerHTML`. Link externo com `rel="noopener noreferrer"`.
- Login: só e-mail, senha e "Entrar" (raiz §4).

## 12. Testes e qualidade

- Vitest + React Testing Library; teste ao lado do arquivo (`Nome.test.tsx`). Consultar por papel e texto acessível (`getByRole`) antes de recorrer a test-id.
- **TDD a partir da Fase 1** para: guards e a ordem de redirecionamento, `usePermissao`, idle-timer, formatadores e repositórios (Supabase simulado na fronteira do repositório). Estilo puro não exige TDD.
- ESLint (typescript-eslint strict, react-hooks, jsx-a11y) e Prettier sem avisos; `no-explicit-any` como erro; checagem de tipos limpa.

## 13. Checklist de tela pronta

- [ ] Montada no shell (PageHeader + Breadcrumb + abas por rota)
- [ ] Skeleton, vazio e erro implementados
- [ ] Números e datas via `lib/format`, em fonte mono
- [ ] Só tokens; cores funcionais só com significado
- [ ] Permissões `view`/`edit` respeitadas via `usePermissao`
- [ ] Teclado, foco e contraste ok; funciona em 360px
- [ ] Zero emoji, zero nome técnico na UI
- [ ] Não parece template genérico (raiz §1)

## 14. Build e hospedagem (portável)

- O build é uma SPA estática (`frontend/dist/`) **agnóstica de hospedagem**: hoje GitHub Pages, no futuro Vercel. Nenhum código do app depende de uma hospedagem específica.
- `base: '/'` (domínio próprio nas duas). Rotas por History API (`BrowserRouter`).
- O que é da hospedagem fica **fora do app**, no passo de publicação: fallback SPA (`404.html` no Pages; rewrite para `index.html` na Vercel), domínio e cabeçalhos HTTP.
- Configuração só por variáveis `VITE_*` em tempo de build — mesmos nomes em qualquer hospedagem.
- Na migração para a Vercel, a publicação continua **dentro do pipeline**, depois do backend — nunca pelo deploy automático por Git da Vercel, que quebraria a ordem backend → frontend. O domínio continua o mesmo: Auth e CORS não mudam, só o DNS.

## 15. Comandos

Da **raiz** do repositório (workspace npm, lockfile único), com o Node da `.nvmrc` (`nvm install`). Os scripts exigem Node 24.15 ou mais novo da linha 24 e recusam rodar fora disso (`devEngines`).

| Comando | O que faz |
|---|---|
| `npm ci --ignore-scripts` | Instalação limpa, a partir do lockfile, sem scripts de instalação (como no CI) |
| `npm run dev` | Vite em `http://localhost:5173` (porta fixa: é a do CORS e dos redirects do dev) |
| `npm run build` | Checagem de tipos e build de produção em `frontend/dist/` |
| `npm run typecheck` | Checagem de tipos |
| `npm run lint` | ESLint; falha com qualquer aviso |
| `npm run format:check` · `npm run format` | Prettier do repositório: confere · grava |
| `npm test` | Vitest, uma execução |
| `npm run test:watch --workspace frontend` | Vitest observando os arquivos |
| `npm run preview --workspace frontend` | Serve o build em `http://localhost:4173` |

- **Portões** (os do job `frontend` do CI): `lint`, `format:check`, `typecheck`, `test` e `build`, verdes e sem aviso antes de todo commit. O CI roda também a varredura de chave secreta no build e a auditoria das dependências (`npm audit signatures`, `--omit=dev` e `--audit-level=high`).
- **Variáveis:** `frontend/.env.local` (fora do git), a partir do `frontend/.env.example`, com os valores do projeto de **dev** (§11).
