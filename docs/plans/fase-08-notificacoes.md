# Fase 8 — Notificações in-app

> Plano detalhado da Fase 8 — **última fase da fundação**. Fase ativa e progresso: `@project_manager.md`. Schema: `@docs/plans/modelo-dados.md` (§8).
> Convenções: `@frontend/CLAUDE.md`, `@supabase/CLAUDE.md`. Skill `frontend-design` nos STEPs de UI. TDD para tabela, RLS, RPCs, emissão e lógica do sino.

**Status:** ⬜ Não iniciada · **Depende de:** Fase 3 ✅ (técnica) e Fase 7 ✅ (ordem do roadmap) · **Libera:** módulos de negócio (backlog)

---

## 1. Objetivo

Entregar a infraestrutura de avisos dentro do produto, pronta para os módulos de negócio:
- tabela `notificacoes` (uma linha por destinatário) com RLS;
- sino com contador na barra superior, lista com lida/não lida, "marcar todas como lidas" e filtro por tipo;
- o primeiro aviso real: **"Sua senha foi alterada"**.

## 2. Pré-requisitos

- [ ] Fases 3 a 7 ✅ (barra superior com o espaço do sino; `trocar-senha` com troca voluntária).

## 3. Decisões desta fase

| # | Decisão | Origem |
|---|---|---|
| 1 | Contador atualizado por **consulta a cada 60 segundos e no foco da janela** — sem Realtime na v1. Um aviso pode levar até 1 minuto para aparecer. | Danilo |
| 2 | **Único aviso da v1: "Sua senha foi alterada"**, para o próprio usuário, após troca **voluntária** de senha (a troca obrigatória da senha provisória não avisa). | Danilo |
| 3 | Backlog de avisos (não entram agora): usuário sem perfil tentou entrar; primeiro acesso concluído; perfil de acesso alterado. Entram junto com os eventos dos módulos de negócio. | Danilo |
| 4 | Tipos: a lista do `check` começa só com `seguranca` e cresce por migration quando um aviso novo nascer. O **filtro por tipo** é construído e testado, mas só aparece quando o usuário tiver avisos de mais de um tipo. | consequência do item 2 |
| 5 | Lista no **painel do sino** (últimos 20 + "Carregar mais"), sem página própria de notificações na v1. | proposta |
| 6 | Emissão pela Edge Function que causa o evento (aqui, `trocar-senha`), com o cliente admin — nenhum caminho de criação pelo cliente. | `modelo-dados.md §8.1` |
| 7 | Marcar como lida por RPCs `security invoker`; o destinatário só pode alterar a coluna `lida_em` das **próprias** linhas (grant de coluna + policy). | proposta |
| 8 | Sem expurgo automático na v1 (volume baixo). Reavaliar com os módulos de negócio. | proposta |

## 4. STEPs (na ordem; não pular)

### STEP 8.1 — Tabela `notificacoes` e RPCs de leitura
**Entrega:** os avisos guardados com isolamento por destinatário.
- [ ] **Testes primeiro (pgTAP):**
  - só o destinatário lê as próprias notificações — colegas do mesmo tenant, outro tenant, `super_admin` e `anon` não leem;
  - usuário inativo ou de empresa bloqueada não lê nada;
  - nenhum cliente insere ou exclui; o destinatário só altera `lida_em` das próprias linhas (qualquer outra coluna é recusada);
  - `tipo` fora da lista é recusado;
  - `marcar_notificacoes_lidas(ids)` marca só as próprias (ids de outros são ignorados); `marcar_todas_notificacoes_lidas(tipo)` marca todas as não lidas do usuário, opcionalmente de um tipo
- [ ] Migration `f08_cria_notificacoes`: tabela conforme `modelo-dados.md §8.1`, índices (`(profile_id, created_at desc)` e parcial de não lidas), RLS, policies (`notificacoes_select_destinatario`, `notificacoes_update_destinatario`), grants (`select`; `update (lida_em)`), RPCs `security invoker`

**Verificação:** testes verdes; teste guardião e advisors verdes.

### STEP 8.2 — Emissão do aviso "Sua senha foi alterada"
**Entrega:** o primeiro aviso real do produto.
- [ ] **Testes primeiro** (`deno test` + integração local):
  - troca **voluntária** cria uma notificação `seguranca` para o próprio usuário;
  - troca **obrigatória** (senha provisória) não cria;
  - falha ao criar o aviso **não desfaz** a troca de senha (o aviso é complementar) — o erro vai para o log, sem dado sensível;
  - o texto nunca contém a senha nem dado técnico
- [ ] Módulo compartilhado de emissão em `_shared/` (destinatário, tipo, título, mensagem, link opcional), reutilizável pelos avisos futuros
- [ ] `trocar-senha` (Fase 1) passa a emitir o aviso no caminho voluntário

**Verificação:** unidade + integração verdes.

### STEP 8.3 — Tempo relativo em `lib/format`
**Entrega:** "há 5 min" do jeito certo, em pt-BR.
- [ ] **Testes primeiro:** "agora", "há 5 min", "há 2 h", "ontem", e data `dd/mm` (ou `dd/mm/aaaa` em outro ano) a partir de 7 dias; data completa disponível para leitor de tela e dica ao passar o mouse
- [ ] Implementação com `Intl` (sem biblioteca nova)

**Verificação:** testes verdes.

### STEP 8.4 — Dados das notificações no frontend
**Entrega:** contador, lista e ações prontos para o sino.
- [ ] **Testes primeiro** (repositório e hooks com Supabase simulado):
  - contador de não lidas reconsultado a cada 60 s e no foco (decisão 1);
  - lista paginada (20 por vez), com filtro por tipo;
  - marcar uma, marcar várias e marcar todas atualizam contador e lista;
  - limpeza ao sair inclui as notificações em cache
- [ ] `NotificacoesRepository` + hooks `useContadorNotificacoes`, `useNotificacoes`, mutations de leitura

**Verificação:** testes verdes.

### STEP 8.5 — Sino e painel de notificações
**Entrega:** o sino na barra superior, no padrão visual do produto.
- [ ] Desenho com a skill `frontend-design`: sino no espaço reservado na Fase 3; selo com o número de não lidas em fonte mono (acima de 9, "9+"); `aria-label` com a contagem ("Notificações, 3 não lidas")
- [ ] Painel: últimos 20 + "Carregar mais"; cada item com ícone do tipo, título, mensagem, tempo relativo e marcação de não lida (ouro = destaque); "Marcar todas como lidas"; filtro por tipo só com mais de um tipo (decisão 4)
- [ ] Clicar num item marca como lido e, se houver link, navega
- [ ] Estado vazio bem resolvido (será o mais visto na v1): "Nenhuma notificação" · "Avisos sobre a sua conta aparecem aqui."; erro com "Tentar de novo"; skeleton ao carregar
- [ ] Navegação completa por teclado; foco volta ao sino ao fechar; Esc fecha
- [ ] **Testes** (RTL): selo e `aria-label` refletem a contagem; "9+"; marcar todas; clique marca e navega; vazio; filtro aparece só com mais de um tipo

**Verificação:** testes verdes; checklist de tela; conferência visual em 1280px e 360px.

### STEP 8.6 — Roteiro ponta a ponta 📋
- [ ] 📋 Local: usuário troca a senha pelo menu do usuário → em até 1 minuto o sino mostra 1 não lida → abrir, ler, marcar → contador zera; troca obrigatória (usuário novo) **não** gera aviso
- [ ] 📋 Outro usuário do mesmo tenant não vê a notificação (conferir também pela API)
- [ ] 📋 Produção: a mesma verificação com o usuário do Danilo

**Verificação:** roteiro registrado no log do `project_manager.md`.

### STEP 8.7 — Fechamento da fase e da fundação
- [ ] `modelo-dados.md` conferido contra o banco real (via MCP, só leitura); tipos regenerados
- [ ] Revisão das **pendências de governança**: todas aplicadas ou explicitamente adiadas *(sob autorização)*
- [ ] `/revise-claude-md` ao fim da fundação, respeitando o `CLAUDE.md §10` (só propostas)
- [ ] `project_manager.md`: Fase 8 ✅, **fundação 100%**, log; registrar no backlog os avisos adiados (decisão 3); próxima decisão: qual módulo de negócio abre primeiro (sugestão registrada: Cadastros)

## 5. Critérios de aceite da fase

1. Só o destinatário lê as próprias notificações; ninguém as cria pelo cliente; o destinatário só altera `lida_em` — provado por teste.
2. Troca voluntária de senha gera o aviso; troca obrigatória não gera; falha no aviso não desfaz a troca.
3. Contador correto, atualizado em até 60 s e no foco; "9+" acima de nove.
4. Marcar uma e marcar todas funcionam e refletem no contador.
5. Filtro por tipo funcional e testado (visível com mais de um tipo).
6. Tempo relativo em pt-BR, com data completa acessível.
7. Estados vazio, carregando e erro; navegação por teclado completa.
8. Fundação concluída: todas as fases ✅ e pendências de governança resolvidas ou adiadas com registro.

## 6. Modelagem de dados afetada

Atualizado no `modelo-dados.md` junto com este plano:
- §8.1 `notificacoes`: lista inicial de `tipo` = `seguranca` (cresce por migration); grant de coluna `update (lida_em)` + policy do destinatário.
- §4: RPCs `marcar_notificacoes_lidas(ids)` e `marcar_todas_notificacoes_lidas(tipo)`.
- Contador e lista lidos direto da tabela pela RLS (sem RPC).

## 7. Rotas, Edge Functions e RPCs

| Tipo | Item | Observação |
|---|---|---|
| Rota | — | sem página própria (painel do sino) |
| Edge Function | `trocar-senha` (Fase 1) | passa a emitir o aviso na troca voluntária |
| RPC | `marcar_notificacoes_lidas(ids)` | nova |
| RPC | `marcar_todas_notificacoes_lidas(tipo)` | nova |

## 8. Riscos e atenção

- **Sino quase sempre vazio na v1:** é o esperado (decisão 2) — o estado vazio precisa parecer intencional, não quebrado.
- **Aviso como efeito colateral:** nunca pode bloquear nem desfazer a ação principal (STEP 8.2).
- **Crescimento futuro:** com os módulos de negócio, reavaliar Realtime (decisão 1) e expurgo (decisão 8).

## 9. Status dos Entregáveis

| # | Entregável | STEP | Status |
|---|---|---|---|
| 1 | Tabela `notificacoes` e RPCs de leitura | 8.1 | ⬜ |
| 2 | Emissão do aviso "Sua senha foi alterada" | 8.2 | ⬜ |
| 3 | Tempo relativo em `lib/format` | 8.3 | ⬜ |
| 4 | Dados das notificações no frontend | 8.4 | ⬜ |
| 5 | Sino e painel de notificações | 8.5 | ⬜ |
| 6 | Roteiro ponta a ponta | 8.6 | ⬜ |
| 7 | Fechamento da fase e da fundação | 8.7 | ⬜ |
