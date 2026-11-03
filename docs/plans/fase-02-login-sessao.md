# Fase 2 — Login & Ciclo de sessão

> Plano detalhado da Fase 2. Fase ativa e progresso: `@project_manager.md`. Schema: `@docs/plans/modelo-dados.md`.
> Convenções: `@frontend/CLAUDE.md` (dados, rotas e guards, sessão, estados, texto). TDD para lógica (`CLAUDE.md §9`); estilo puro sem TDD.

**Status:** ⬜ Não iniciada · **Depende de:** Fase 1 ✅ · **Libera:** Fase 3

---

## 1. Objetivo

Levar o usuário com segurança do login até a área autenticada, cumprindo as regras do `CLAUDE.md §4`:
- login minimalista (e-mail, senha, Entrar);
- troca obrigatória da senha provisória antes de qualquer outra tela;
- gates: "acesso suspenso" (usuário inativo ou empresa bloqueada) e "sem perfil";
- guards na ordem fixa de `frontend/CLAUDE.md §4`;
- sessão encerrada após 8h de inatividade, inclusive com o navegador fechado.

Ao final, cada usuário do seed cai exatamente na tela certa, e o primeiro `super_admin` de produção faz o primeiro login trocando a senha temporária.

## 2. Pré-requisitos

- [ ] Fase 1 ✅: `obter_meu_acesso()`, `trocar-senha` e Auth endurecido em produção.
- [ ] Variáveis públicas do Supabase com os nomes definidos pela pendência #3 (local `.env.local` e *variables* do GitHub).
- [ ] API atual do `supabase-js` (sessão, `onAuthStateChange`, `signOut` com escopo, `functions.invoke`) conferida via Context7.

## 3. Decisões desta fase

| # | Decisão | Origem |
|---|---|---|
| 1 | Formulários com **react-hook-form + zod**, via componente Form do shadcn. Proposta de inclusão no `CLAUDE.md §2` (pendência de governança #6). | Danilo |
| 2 | **Botão de mostrar/ocultar senha dentro do campo** (com `aria-label`), no login e na troca de senha. Continua proibido "esqueci a senha", cadastro e login social. Esclarecimento no `CLAUDE.md §4` (pendência #7). | Danilo |
| 3 | O destino de cada usuário sai de **uma função pura** (`resolverDestino`) com a ordem fixa: sessão → usuário e empresa ativos → senha provisória → possui perfil → permissão. Os guards só aplicam o resultado. | `frontend/CLAUDE.md §4` |
| 4 | O estado de acesso (`obter_meu_acesso`) é **reconsultado** ao voltar o foco para a janela e a cada 5 minutos — um bloqueio feito no Admin SaaS tira o usuário da tela em até 5 min (os dados já são cortados na hora pela RLS). | proposta |
| 5 | Idle de 8h: o instante da última atividade fica guardado no navegador (não é dado de negócio), sincronizado entre abas. Ao abrir o app, se já passou de 8h, a sessão é encerrada antes de qualquer tela. | proposta |
| 6 | "Sair" e expiração por inatividade encerram **só a sessão deste navegador** (escopo local), sem derrubar o usuário em outros dispositivos. | proposta |
| 7 | Credencial inválida tem mensagem **única e genérica** — nunca revela se o e-mail existe. | proposta |
| 8 | O gate "sem perfil" (tela e rota) nasce aqui; a condição passa a valer na Fase 5, quando `tem_perfil` existir em `obter_meu_acesso()`. | roadmap |
| 9 | A página de abertura da Fase 0 é **removida**: `/` passa a ser a área autenticada (provisória até a Home da Fase 3). | `§6` (sem código morto) |

## 4. STEPs (na ordem; não pular)

### STEP 2.1 — Cliente Supabase e camada de dados base
**Entrega:** a fundação de dados do frontend, sem nenhuma tela.
- [ ] **Testes primeiro** (Vitest, Supabase simulado na fronteira do repositório)
- [ ] Leitura e validação das variáveis públicas no início do app (falha clara no build e na inicialização se faltar alguma)
- [ ] `lib/supabase`: cliente tipado com `types/database.ts`
- [ ] `QueryClient` com padrões do projeto (retentativa só para erro de rede; nunca para 401/403)
- [ ] Tradução de erros (Auth, PostgREST e Edge Function → mensagem pt-BR da §7 deste plano); nunca repassar mensagem técnica
- [ ] Repositórios (classe com DI via construtor — `CLAUDE.md §6`):
  - `AuthRepository` — entrar, sair (escopo local), sessão atual, escuta de mudanças;
  - `AcessoRepository` — `obter_meu_acesso()`;
  - `SenhaRepository` — `trocar-senha`
- [ ] Componente Form do shadcn + react-hook-form + zod instalados (versões fixas)

**Verificação:** testes verdes; nenhum componente importa o cliente `supabase` diretamente (busca no código).

### STEP 2.2 — Sessão e estado de acesso
**Entrega:** o app sempre sabe quem está logado e em que situação.
- [ ] **Testes primeiro**
- [ ] Provider de sessão (escuta `onAuthStateChange`) e hook `useSessao()`
- [ ] Hook `useMeuAcesso()` (TanStack Query) com reconsulta no foco e a cada 5 min (decisão 4)
- [ ] **Limpeza ao sair:** `queryClient.clear()` + reset dos stores **antes** de redirecionar (`frontend/CLAUDE.md §3`)
- [ ] Sessão encerrada por fora (ex.: senha resetada pelo administrador, sessões revogadas) → limpeza → `/login` com "Sua sessão foi encerrada. Entre novamente."

**Verificação:** testes cobrem login, logout, sessão revogada e troca de usuário no mesmo navegador sem sobra de cache.

### STEP 2.3 — Guards, rotas e área autenticada provisória
**Entrega:** cada usuário vai para a tela certa, sempre.
- [ ] **Testes primeiro** — tabela de casos de `resolverDestino`:

  | Situação | Destino |
  |---|---|
  | sem sessão, rota protegida | `/login` (guardando a rota pedida) |
  | com sessão, em `/login` | rota guardada ou `/` |
  | usuário inativo | `/acesso-suspenso` (variante usuário) |
  | empresa bloqueada | `/acesso-suspenso` (variante empresa) |
  | `senha_provisoria = true` | `/trocar-senha` (qualquer outra rota redireciona para lá) |
  | sem perfil (`admin`/`user`) | `/sem-perfil` — condição ligada na Fase 5 |
  | tudo ok | rota pedida |
  | `super_admin` | `/` (o Admin SaaS chega na Fase 4) |

- [ ] Rotas públicas: `/login`. Rotas de gate: `/trocar-senha`, `/acesso-suspenso`, `/sem-perfil`. Protegidas: `/` e as futuras rotas de módulo
- [ ] Usuário de gate não acessa rota protegida; usuário liberado não fica preso em tela de gate (volta para `/`)
- [ ] Área autenticada provisória em `/`: nome do usuário + "Sair" — substituída pela Home da Fase 3
- [ ] Remover a página de abertura da Fase 0 (decisão 9)
- [ ] Carregando sessão/acesso: skeleton da tela de destino, nunca spinner central

**Verificação:** todos os casos da tabela verdes; deep link para rota protegida sem sessão volta à rota original depois do login.

### STEP 2.4 — Tela de login
**Entrega:** a primeira impressão do produto — mínima e premium.
- [ ] Layout definido com a skill `frontend-design` dentro do §7: dual-tone, marca discreta, formulário em superfície clara; nada de frase de boas-vindas genérica
- [ ] Campos: e-mail e senha (com mostrar/ocultar); botão "Entrar". `autocomplete` correto (`email`, `current-password`) para gerenciadores de senha
- [ ] **Testes primeiro** (RTL):
  - campos obrigatórios e e-mail inválido mostram erro no campo;
  - envio chama o repositório e redireciona conforme `resolverDestino`;
  - credencial inválida → mensagem genérica (decisão 7);
  - muitas tentativas (429) e falha de rede → mensagens da §7;
  - botão fica em estado de envio e não permite duplo envio;
  - **não existe** link de "esqueci a senha", cadastro ou login social (teste de ausência)
- [ ] Foco inicial no e-mail; Enter envia; erro anunciado para leitor de tela

**Verificação:** testes verdes; checklist de tela (`frontend/CLAUDE.md §13`) nos itens aplicáveis; conferência visual em 1280px e 360px.

### STEP 2.5 — Troca obrigatória de senha
**Entrega:** ninguém passa da senha provisória sem trocá-la.
- [ ] Campos: nova senha e confirmação (ambos com mostrar/ocultar; `autocomplete="new-password"`)
- [ ] Requisitos da política mostrados como lista que se marca em tempo real (mínimo 8, letras e números) — ícones lucide, sem cor como único sinal
- [ ] **Testes primeiro** (RTL): confirmação diferente → erro no campo; fora da política → botão desabilitado com motivo; erro da Edge Function traduzido; sucesso → "Senha salva" e ida para o destino seguinte
- [ ] "Sair" disponível; nenhuma outra navegação

**Verificação:** testes verdes; com usuário do seed com senha provisória, o fluxo completo funciona no ambiente local.

### STEP 2.6 — Telas de gate: acesso suspenso e sem perfil
**Entrega:** mensagens claras, sem vazar nada.
- [ ] `/acesso-suspenso` em duas variantes (usuário inativo × empresa bloqueada) e `/sem-perfil`, textos da §7
- [ ] Só a marca, a mensagem e "Sair" — nenhum dado da empresa, nenhum menu
- [ ] **Testes** (RTL): cada variante mostra o texto certo e só a ação "Sair"

**Verificação:** testes verdes; contraste e foco conferidos.

### STEP 2.7 — Idle-timer de 8h
**Entrega:** sessão encerrada por inatividade, como exige o `CLAUDE.md §4`.
- [ ] **Testes primeiro** (timers simulados):
  - atividade (ponteiro, teclado, rolagem, foco da janela) reinicia o contador;
  - 8h sem atividade → limpeza → sair (escopo local) → `/login` com "Sua sessão foi encerrada por inatividade. Entre novamente.";
  - atividade numa aba mantém as outras vivas; expiração numa aba desloga todas;
  - ao abrir o app depois de 8h+ parado (navegador fechado), a sessão é encerrada antes de qualquer tela
- [ ] Hook `useInatividade()` montado só na raiz autenticada; eventos de atividade com custo baixo (sem trabalho por evento de mouse)

**Verificação:** testes verdes; teste manual com o tempo de expiração reduzido só no ambiente local.

### STEP 2.8 — Roteiro de verificação ponta a ponta 📋
**Entrega:** prova de que cada perfil de usuário cai no lugar certo.
- [ ] 📋 Ambiente local, com os usuários do seed: `super_admin`, `master_admin`, `admin`, `user`, usuário inativo, usuário de empresa bloqueada e usuário com senha provisória — cada um conferido contra a tabela do STEP 2.3
- [ ] 📋 Produção, primeiro login do `super_admin` (bootstrap da Fase 1): senha temporária → troca obrigatória → área autenticada
- [ ] Resultado registrado no log do `project_manager.md` (sem dados pessoais)

**Verificação:** todos os casos conferidos local e o primeiro login de produção concluído.

### STEP 2.9 — Fechamento da fase
- [ ] Pendências de governança #6 e #7 aplicadas no `CLAUDE.md` *(sob autorização)*
- [ ] `project_manager.md`: entregáveis ✅, Fase 2 ✅, progresso, log; fase ativa → Fase 3

**Verificação:** todos os critérios de aceite (§5) conferidos.

## 5. Critérios de aceite da fase

1. Login só com e-mail, senha (com mostrar/ocultar) e "Entrar" — sem "esqueci a senha", cadastro ou login social (provado por teste).
2. Mensagem de credencial inválida não revela se o e-mail existe.
3. Usuário com senha provisória não acessa nenhuma rota além de `/trocar-senha` e "Sair".
4. Usuário inativo e usuário de empresa bloqueada veem só a tela de acesso suspenso correspondente; um bloqueio feito com o usuário logado o leva para lá em até 5 min.
5. Ordem dos guards conforme `frontend/CLAUDE.md §4`, coberta pela tabela de testes do STEP 2.3.
6. 8h sem atividade encerram a sessão — inclusive com o navegador fechado — e a limpeza remove todo dado do usuário anterior.
7. Deep link para rota protegida sobrevive ao login.
8. Nenhum componente acessa o Supabase diretamente; nenhuma mensagem técnica na UI.
9. Telas aprovadas no checklist de tela e na conferência visual (1280px e 360px).
10. Primeiro login do `super_admin` em produção concluído com troca de senha.

## 6. Modelagem de dados afetada

**Nenhuma mudança de schema.** A fase consome `obter_meu_acesso()` (`modelo-dados.md §4`) e a Edge Function `trocar-senha` (Fase 1). O campo `tem_perfil` da RPC chega na Fase 5.

## 7. Rotas, Edge Functions, RPCs e textos

**Rotas**

| Rota | Tipo | Conteúdo |
|---|---|---|
| `/login` | pública | formulário de login |
| `/trocar-senha` | gate | troca obrigatória da senha provisória |
| `/acesso-suspenso` | gate | variantes usuário inativo / empresa bloqueada |
| `/sem-perfil` | gate | alerta de usuário sem perfil (condição ativa na Fase 5) |
| `/` | protegida | área autenticada provisória (Home na Fase 3) |
| `*` | — | 404 com a marca |

**Consumidos:** RPC `obter_meu_acesso()` · Edge Function `trocar-senha` · Auth (entrar, sair, sessão).

**Textos (pt-BR, propostos — revisar na aprovação)**

| Situação | Texto |
|---|---|
| Credencial inválida | "E-mail ou senha incorretos." |
| Muitas tentativas | "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo." |
| Sem conexão | "Não foi possível conectar. Verifique sua conexão e tente de novo." |
| Troca obrigatória — título | "Crie sua senha" |
| Troca obrigatória — apoio | "Por segurança, troque a senha provisória antes de continuar." |
| Troca — botão / confirmação | "Salvar senha" / "Senha salva" |
| Usuário inativo | "Seu acesso está suspenso." · "Fale com o administrador da sua empresa para reativá-lo." |
| Empresa bloqueada | "O acesso da sua empresa está suspenso." · "Fale com o responsável pela conta da sua empresa." |
| Sem perfil | "Seu usuário ainda não tem um perfil de acesso." · "Procure a equipe de tecnologia da sua empresa para liberar seu acesso." |
| Fim por inatividade | "Sua sessão foi encerrada por inatividade. Entre novamente." |
| Sessão encerrada por fora | "Sua sessão foi encerrada. Entre novamente." |

## 8. Riscos e atenção

- **Bloqueio com usuário logado:** a tela muda em até 5 min (decisão 4), mas os **dados** são cortados na hora pela RLS — qualquer consulta nesse intervalo volta vazia. A UI deve tratar isso como estado vazio/erro amigável, nunca quebrar.
- **Relógio do cliente** no idle: o cálculo usa o relógio do navegador; o corte real de dados continua no banco. Aceito para a v1.
- **Cache entre usuários:** é o ponto mais fácil de errar — o teste de "troca de usuário no mesmo navegador" (STEP 2.2) é obrigatório.

## 9. Status dos Entregáveis

| # | Entregável | STEP | Status |
|---|---|---|---|
| 1 | Cliente Supabase, repositórios e tradução de erros | 2.1 | ⬜ |
| 2 | Sessão, estado de acesso e limpeza ao sair | 2.2 | ⬜ |
| 3 | Guards, rotas e área autenticada provisória | 2.3 | ⬜ |
| 4 | Tela de login | 2.4 | ⬜ |
| 5 | Troca obrigatória de senha | 2.5 | ⬜ |
| 6 | Telas de acesso suspenso e sem perfil | 2.6 | ⬜ |
| 7 | Idle-timer de 8h | 2.7 | ⬜ |
| 8 | Roteiro ponta a ponta (local + 1º login de produção) | 2.8 | ⬜ |
| 9 | Fechamento da fase | 2.9 | ⬜ |
