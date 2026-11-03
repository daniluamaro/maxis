# Fase 3 — App Shell & Navegação

> Plano detalhado da Fase 3. Fase ativa e progresso: `@project_manager.md`. Schema: `@docs/plans/modelo-dados.md`.
> Convenções: `@frontend/CLAUDE.md` (estrutura, componentes, rotas e guards, tema, estados, acessibilidade). Contrato visual: `CLAUDE.md §7` + `docs/design/maxis-tema-claro.html`.
> Skill `frontend-design` obrigatória nos STEPs de UI (`CLAUDE.md §8`). TDD para a lógica de navegação e permissões; estilo puro sem TDD.

**Status:** ⬜ Não iniciada · **Depende de:** Fase 2 ✅ · **Libera:** Fase 4

---

## 1. Objetivo

Entregar a casca do produto em que todo módulo futuro vai morar, **dirigida por configuração**:
- objeto de menu como fonte única de sidebar, rotas, breadcrumb, abas e (na Fase 5) catálogo de permissões;
- sidebar navy em **drill-down** (painel que troca de nível) + workspace claro com abas por segmento de rota;
- componentes reutilizáveis do `CLAUDE.md §4` e os estados de tela (skeleton, vazio, erro);
- Home de boas-vindas com dados reais, menu do usuário com troca voluntária de senha, módulos do backlog como "em breve".

Critério central: **adicionar um módulo, funcionalidade ou aba = editar só o objeto de menu.**

## 2. Pré-requisitos

- [ ] Fase 2 ✅ (sessão, guards, gates, idle).
- [ ] Componentes shadcn necessários conferidos (sheet/drawer, dropdown-menu, tooltip, dialog, separator, avatar) — adicionados só quando usados.

## 3. Decisões desta fase

| # | Decisão | Origem |
|---|---|---|
| 1 | Sidebar em **drill-down literal**: nível 1 = módulos; clicar num módulo troca a lista pelas funcionalidades dele, com "Voltar" no topo. Ao entrar por deep link, o nível do módulo atual já abre. | Danilo |
| 2 | O objeto de menu é **só dados** (sem componentes React): ícone como nome do ícone lucide; o mapeamento aba → componente de tela fica num registro separado. Assim um script consegue ler o config e gerar o seed de permissões na Fase 5. | proposta |
| 3 | Chaves do config em `snake_case` (usadas nas permissões: `modulo.funcionalidade.aba.acao`); o **segmento de rota é derivado** trocando `_` por `-` (`perfis_acesso` → `/configuracoes/perfis-acesso/...`). Nunca escritos à mão em dois lugares. | proposta |
| 4 | Abas são **links de navegação** (`aria-current="page"`), não abas ARIA: cada aba é uma URL. Funcionalidade com uma única aba não mostra barra de abas. | proposta |
| 5 | v1 **sem trilho recolhido** no desktop: sidebar fixa de 248px (mockup) a partir de 900px; abaixo disso, gaveta. Reduz escopo; reavaliar quando houver demanda. | proposta |
| 6 | `usePermissao()` nasce com a API definitiva; nesta fase a **fonte** é provisória (usuário de tenant vê tudo o que está disponível; `super_admin` vê só o Admin SaaS). A Fase 5 troca a fonte, não a API. A lógica de filtro já é testada aqui com fontes simuladas. | roadmap |
| 7 | **Home só com dados reais**: saudação, empresa e atalhos para o que o usuário pode acessar. Nada de KPI de exemplo ou gráfico decorativo. | `CLAUDE.md §1` |
| 8 | Nome da empresa no rodapé da sidebar lido da tabela `empresas` (o usuário enxerga a própria pela RLS) — sem mudança de schema. | proposta |
| 9 | Home é a raiz `/` — única rota fora do padrão de três segmentos. | proposta |

## 4. Objeto de menu proposto (estado ao fim da Fase 3)

| Grupo | Módulo (`chave`) | Nome na UI | Ícone | Funcionalidades | Status |
|---|---|---|---|---|---|
| — | `inicio` | Início | `House` | — (rota `/`) | disponível |
| Operação | `dados_rota` | Dados de Rota | `Route` | Dashboard | em breve |
| Operação | `dados_armazem` | Dados de Armazém | `Warehouse` | Dashboard | em breve |
| Operação | `fretes` | Fretes | `Truck` | Simulador · Tabela de Fretes · Gestão de Fretes · Parâmetros de Cálculo | em breve |
| Operação | `produtividade` | Produtividade | `Gauge` | Armazém · Transporte | em breve |
| Operação | `campeoes` | Campeões | `Trophy` | Ranking | em breve |
| Gestão | `cadastros` | Cadastros | `ClipboardList` | Veículos · Transportadores | em breve |
| Gestão | `configuracoes` | Configurações | `Settings` | Perfis de Acesso (Fase 5) · Estrutura Organizacional (Fase 6) · Usuários (Fase 7) | em breve |
| — | `admin_saas` | Admin SaaS | `Building2` | Empresas (Fase 4) — **só `super_admin`** | em breve |

Abas de cada funcionalidade são definidas quando a fase dela for planejada. Grupos, nomes e ícones são propostos — revisar na aprovação.

## 5. STEPs (na ordem; não pular)

### STEP 3.1 — Objeto de menu, tipos e derivações
**Entrega:** a fonte única da navegação, validada por teste.
- [ ] **Testes primeiro:**
  - chaves únicas em cada nível e no formato `^[a-z0-9_]+$`;
  - toda funcionalidade **disponível** tem ao menos uma aba; itens "em breve" podem não ter abas;
  - ícone existe no lucide; papéis permitidos são valores válidos;
  - derivações corretas: rota de cada aba, segmento kebab, breadcrumb, chave de permissão `modulo.funcionalidade.aba.view|edit`
- [ ] Tipos do config (módulo, funcionalidade, aba, grupo, status, papéis permitidos)
- [ ] `config/menu.ts` com o conteúdo da §4 (só dados — decisão 2)
- [ ] Registro separado aba → componente de tela (carregamento sob demanda)

**Verificação:** testes verdes; o config importa sem React (um teste roda em ambiente Node puro).

### STEP 3.2 — Permissões no cliente (`usePermissao`)
**Entrega:** a API de permissão definitiva, com fonte provisória.
- [ ] **Testes primeiro** (fontes simuladas): filtragem de módulos, funcionalidades e abas por `view`; `edit` só libera ação; módulo sem nenhum item visível some; `super_admin` só vê `admin_saas`; usuário de tenant nunca vê `admin_saas`
- [ ] Provider de permissões + `usePermissao()` (`podeVer(chave)`, `podeEditar(chave)`), conforme `frontend/CLAUDE.md §4`
- [ ] Fonte provisória (decisão 6) isolada num único ponto, trocada na Fase 5

**Verificação:** testes verdes; nenhum componente decide acesso lendo papel diretamente (busca no código).

### STEP 3.3 — Rotas geradas, 404 no shell e títulos
**Entrega:** toda URL de módulo nasce do config.
- [ ] **Testes primeiro** (roteador em memória):
  - deep link para `/modulo/funcionalidade/aba` abre a aba certa; refresh, voltar e avançar preservam a aba;
  - `/modulo/funcionalidade` redireciona para a primeira aba **permitida**;
  - aba, funcionalidade ou módulo inexistente → 404 dentro do shell;
  - item "em breve" ou sem permissão não tem rota navegável (vai para 404 ou para a primeira rota permitida — regra fixada no teste);
  - título do navegador derivado do config (aba, funcionalidade, Maxis)
- [ ] Geração das rotas a partir do config, com carregamento sob demanda por aba
- [ ] 404 autenticada dentro do shell (a pública da Fase 0 continua para quem não está logado)

**Verificação:** testes verdes; um config de teste com módulo fictício gera rotas sem tocar em outro arquivo.

### STEP 3.4 — Componentes de estado (`components/feedback`)
**Entrega:** os três estados obrigatórios, prontos para reuso em toda tela.
- [ ] Skeletons com o formato do conteúdo (página, tabela, lista, bloco de indicadores)
- [ ] `EmptyState`: ícone, título, texto orientado e ação opcional (respeitando `podeEditar`)
- [ ] `ErrorState`: o que aconteceu + como resolver + "Tentar de novo" (refaz a consulta)
- [ ] Padrão de confirmação de mutação (toast com o mesmo verbo do botão)
- [ ] **Testes** (RTL): cada componente renderiza o conteúdo e a ação; "Tentar de novo" chama o refetch

**Verificação:** testes verdes; nenhum spinner central no código.

### STEP 3.5 — Sidebar em drill-down
**Entrega:** a navegação principal do produto.
- [ ] Desenho com a skill `frontend-design`, fiel ao mockup: navy `--sidebar-bg`, marca no topo, rótulos de grupo, item ativo em ouro, rodapé com a empresa (decisão 8; para `super_admin`, "Administração do SaaS")
- [ ] `Sidebar`, `SidebarModule`, `SidebarItem` lendo só o config + `usePermissao`
- [ ] Nível 1 (módulos) e nível 2 (funcionalidades do módulo, com "Voltar"); clicar numa funcionalidade leva à primeira aba permitida
- [ ] "Em breve": visível, desabilitado (`aria-disabled`), com selo "Em breve", sem navegação
- [ ] Movimento só na troca de nível (resposta à ação), respeitando `prefers-reduced-motion`
- [ ] Abaixo de 900px: gaveta aberta por botão na barra superior; fecha ao navegar
- [ ] **Testes** (RTL): entrar e sair de nível; deep link abre o nível certo; item ativo marcado (`aria-current`); "em breve" não navega; itens filtrados por permissão; navegação completa por teclado

**Verificação:** testes verdes; conferência visual contra o mockup em 1280px; gaveta funcional em 360px.

### STEP 3.6 — Workspace: barra superior, Breadcrumb, PageHeader e abas
**Entrega:** a área de trabalho padrão de toda tela.
- [ ] `Workspace` com barra superior (breadcrumb à esquerda; à direita, o espaço do menu do usuário e, na Fase 8, do sino), `PageHeader` (título, descrição opcional, ações) e `TabLayout`/`Tab` (decisão 4)
- [ ] Link "Pular para o conteúdo"; landmarks (`nav`, `header`, `main`); ao trocar de rota, o foco vai para o título da página
- [ ] **Testes** (RTL): breadcrumb derivado do config; aba ativa com `aria-current`; uma única aba → sem barra; foco no título após navegar

**Verificação:** testes verdes; navegação só por teclado do início ao fim de uma aba.

### STEP 3.7 — Menu do usuário e troca voluntária de senha
**Entrega:** o usuário se identifica e cuida da própria senha.
- [ ] Menu na barra superior: iniciais, nome, papel (pelo mapa de exibição — ex.: "Administrador master"), empresa; ações "Trocar senha" e "Sair"
- [ ] Diálogo "Trocar senha": senha atual, nova e confirmação (com mostrar/ocultar), lista da política, Edge Function `trocar-senha` (exige a senha atual quando não é provisória — Fase 1)
- [ ] **Testes primeiro** (RTL): senha atual errada → mensagem no campo; sucesso → "Senha salva" e diálogo fechado; "Sair" executa a limpeza da Fase 2

**Verificação:** testes verdes; troca voluntária funciona com usuário do seed.

### STEP 3.8 — Home de boas-vindas
**Entrega:** a primeira tela depois do login, com dados reais.
- [ ] Desenho com a skill `frontend-design` (decisão 7): saudação com o nome, empresa, atalhos para as funcionalidades que o usuário pode acessar e, discretos, os módulos que chegam em breve
- [ ] `super_admin`: atalho para o Admin SaaS (em breve até a Fase 4)
- [ ] Substitui a área autenticada provisória da Fase 2 (que é removida)
- [ ] **Testes** (RTL): atalhos refletem `usePermissao`; nenhum dado fictício na tela

**Verificação:** testes verdes; checklist de tela (`frontend/CLAUDE.md §13`).

### STEP 3.9 — Conferência visual e de acessibilidade 📋
**Entrega:** o shell aprovado como padrão premium do produto.
- [ ] Comparação lado a lado com `docs/design/maxis-tema-claro.html` em 1280px, 1024px e 360px
- [ ] Passeio completo só por teclado; contraste AA dos pares usados; foco visível; `prefers-reduced-motion`
- [ ] Revisão crítica com a skill `frontend-design` ("não parece template genérico" — `CLAUDE.md §1`); ajustes feitos neste STEP
- [ ] 📋 Danilo valida o visual do shell

**Verificação:** aprovação visual do Danilo registrada no log.

### STEP 3.10 — Fechamento da fase
- [ ] `project_manager.md`: entregáveis ✅, Fase 3 ✅, progresso, log; fase ativa → Fase 4

## 6. Critérios de aceite da fase

1. Adicionar módulo, funcionalidade ou aba exige editar **só** o objeto de menu (provado por teste com config fictício).
2. Deep link, refresh, voltar e avançar preservam a aba em qualquer rota gerada.
3. Sidebar em drill-down: nível certo ao entrar por deep link; "Voltar" funciona; "em breve" visível e não navegável.
4. Filtro por `usePermissao` coberto por testes; `super_admin` vê só o Admin SaaS; usuário de tenant nunca o vê.
5. Skeleton, vazio e erro vêm de `components/feedback` — nenhum spinner central.
6. Home sem nenhum dado fictício.
7. Troca voluntária de senha exige a senha atual e funciona.
8. Navegação completa por teclado, link "Pular para o conteúdo", foco no título a cada troca de rota, contraste AA.
9. Funcional de 360px a 1280px+, com gaveta abaixo de 900px.
10. Visual aprovado pelo Danilo contra o mockup e o checklist de tela.

## 7. Modelagem de dados afetada

**Nenhuma mudança de schema.** Leituras: `empresas` (a própria, pela RLS — nome no rodapé da sidebar) e RPC `obter_meu_acesso()` (`modelo-dados.md §4`). O config criado aqui é a origem do catálogo `modulos`/`funcionalidades`/`abas`/`permissoes` (`modelo-dados.md §6.1`), gerado na Fase 5.

## 8. Rotas, Edge Functions e RPCs

| Tipo | Item | Observação |
|---|---|---|
| Rota | `/` | Home (Início) |
| Rota | `/<modulo>/<funcionalidade>/<aba>` | geradas do config; segmentos em kebab-case |
| Rota | `/<modulo>/<funcionalidade>` | redireciona para a primeira aba permitida |
| Rota | `*` (autenticada) | 404 dentro do shell |
| Edge Function | `trocar-senha` (Fase 1) | troca voluntária no menu do usuário |
| RPC | `obter_meu_acesso()` (Fase 1) | identidade e papel no menu do usuário |

Nenhum item "em breve" tem rota nesta fase.

## 9. Riscos e atenção

- **Config acoplado a React:** se um componente entrar no config, o gerador de seed da Fase 5 quebra — o teste em Node puro (STEP 3.1) é a proteção.
- **Cara de template:** sidebar e Home são o rosto do produto; a conferência do STEP 3.9 não é opcional.
- **Drill-down e orientação:** o usuário precisa saber onde está — breadcrumb, título do módulo no nível 2 e item ativo em ouro resolvem; validar no passeio por teclado.

## 10. Status dos Entregáveis

| # | Entregável | STEP | Status |
|---|---|---|---|
| 1 | Objeto de menu, tipos e derivações | 3.1 | ⬜ |
| 2 | `usePermissao` com fonte provisória | 3.2 | ⬜ |
| 3 | Rotas geradas, 404 no shell e títulos | 3.3 | ⬜ |
| 4 | Componentes de estado | 3.4 | ⬜ |
| 5 | Sidebar em drill-down | 3.5 | ⬜ |
| 6 | Workspace, Breadcrumb, PageHeader e abas | 3.6 | ⬜ |
| 7 | Menu do usuário e troca voluntária de senha | 3.7 | ⬜ |
| 8 | Home de boas-vindas | 3.8 | ⬜ |
| 9 | Conferência visual e de acessibilidade | 3.9 | ⬜ |
| 10 | Fechamento da fase | 3.10 | ⬜ |
