# Fase 1 — Dados base & Segurança multi-tenant

> Plano detalhado da Fase 1. Fase ativa e progresso: `@project_manager.md`. Schema: `@docs/plans/modelo-dados.md` (§3, §4, §5).
> Convenções: `@supabase/CLAUDE.md` (migrations, RLS, testes, Edge Functions). Vale a partir daqui: **TDD** para lógica, RLS e Edge Functions (`CLAUDE.md §9`).

**Status:** ⬜ Não iniciada · **Depende de:** Fase 0 ✅ · **Libera:** Fase 2

---

## 1. Objetivo

Construir e **provar por testes** a fundação de segurança multi-tenant, antes de qualquer tela depender dela:
- `empresas`, `profiles` e `eventos_auditoria` com RLS por `tenant_id`;
- funções de apoio à RLS que cortam o acesso **na hora** quando o usuário ou a empresa estão inativos;
- provisionamento de usuário por Edge Function (cascata, senha provisória, `email_confirm: true`);
- troca da própria senha sem caminho de escape;
- primeiro `super_admin` em produção.

Nenhuma tela nesta fase — a Fase 2 consome o que for entregue aqui.

## 2. Pré-requisitos

- [ ] Fase 0 ✅ (pipeline com deploy em ordem, Supabase local, teste guardião, base `_shared/`).
- [ ] Pendência de governança #3 resolvida (formato das chaves) — define os nomes de variáveis nas Edge Functions.
- [ ] API atual de autenticação das Edge Functions (`@supabase/server` / `withSupabase`) conferida via Context7 antes do STEP 1.8.

## 3. Decisões desta fase

| # | Decisão | Origem |
|---|---|---|
| 1 | Troca da própria senha pela **Edge Function `trocar-senha`**, numa chamada só — não existe caminho para desmarcar `senha_provisoria` sem trocar a senha. `profiles` fica **sem nenhuma escrita pelo cliente**. Exige ajuste no texto do `CLAUDE.md §5` (pendência de governança #5). | Danilo |
| 2 | Política de senha: **mínimo 8 caracteres, com letras e números** — no Auth (local e produção) e revalidada nas Edge Functions. | Danilo |
| 3 | Primeiro `super_admin` em produção por **procedimento manual documentado** (STEP 1.11). Nenhum endpoint de bootstrap no código. | Danilo |
| 4 | Senha provisória: 12 caracteres, gerador criptográfico, **sem caracteres ambíguos** (`0/O`, `1/l/I`), com ao menos uma letra e um número (atende a política). | proposta |
| 5 | Troca **voluntária** exige a senha atual; a troca **obrigatória** (senha provisória) não exige. Após trocar, as demais sessões do usuário são encerradas. | proposta |
| 6 | Estado de acesso para os gates da Fase 2 via RPC `obter_meu_acesso()` — `security definer` justificado: o usuário bloqueado precisa saber **que** está bloqueado, sem enxergar dado algum. | proposta |
| 7 | Validação de entrada das Edge Functions com biblioteca de schema tipado (zod via `npm:`, versão fixada). | proposta |
| 8 | Cada STEP é um PR com **teste e implementação juntos**, escritos nessa ordem (Red → Green → Refactor). O PR só entra com o CI verde. | `§9` + Fase 0 |
| 9 | Repositório público: **nenhum e-mail real** (nem o do Danilo) em migration, seed, teste ou plano. | Fase 0 |

## 4. STEPs (na ordem; não pular)

### STEP 1.1 — Utilitários do banco e helpers de teste
**Entrega:** schema `private` e as funções utilitárias que as tabelas usam.
- [ ] **Testes primeiro (pgTAP):** `private.cnpj_valido` aceita CNPJs válidos e recusa dígito verificador errado, tamanho errado, não dígitos e sequências repetidas (`00000000000000`, `11111111111111`…); `private.set_updated_at` atualiza `updated_at` num update
- [ ] Migration `f01_cria_schema_private_e_utilitarios`: schema `private` (sem exposição na API), `private.set_updated_at()`, `private.cnpj_valido(text)` (`immutable`)
- [ ] Helpers de teste para **simular usuário** (papel `authenticated` + claims do JWT) e criar fixtures, definidos em `supabase/tests/` — **nunca** em migration

**Verificação:** testes verdes; teste guardião verde; advisors sem alerta de segurança.

### STEP 1.2 — Núcleo de identidade: `empresas`, `profiles` e funções de RLS
**Entrega:** as duas tabelas centrais com isolamento por tenant provado.
- [ ] **Testes primeiro (pgTAP)** — para `empresas` e `profiles`, os casos mínimos de `supabase/CLAUDE.md §7`:
  - usuário do tenant A só enxerga a própria empresa e os profiles de A;
  - não insere, não atualiza, não exclui em nenhuma das duas tabelas (escrita só por Edge Function);
  - usuário inativo e usuário de empresa bloqueada enxergam **zero** linhas, exceto o próprio profile;
  - `anon` não acessa nada;
  - `super_admin` enxerga todas as empresas e só os profiles `master_admin` (não enxerga `admin`/`user`);
  - constraints: `tenant_id` nulo **se e somente se** `super_admin`; um único `master_admin` por empresa; `cnpj` único e válido; e-mail único e minúsculo
- [ ] Migration `f01_cria_nucleo_identidade`: enum `papel_usuario`; `empresas`; `profiles` (colunas da Fase 1 de `modelo-dados.md §5.2`); constraints e índices; triggers de `updated_at`; funções `private.tenant_atual()`, `private.papel_atual()`, `private.is_super_admin()`; RLS, policies e grants
- [ ] Policies (nomes conforme `supabase/CLAUDE.md §3`):

  | Tabela | Policy | Regra |
  |---|---|---|
  | `empresas` | `empresas_select_tenant` | `id` = `tenant_atual()` |
  | `empresas` | `empresas_select_super_admin` | `is_super_admin()` |
  | `profiles` | `profiles_select_proprio` | `id` = `auth.uid()` |
  | `profiles` | `profiles_select_tenant` | `tenant_id` = `tenant_atual()` |
  | `profiles` | `profiles_select_super_admin` | `is_super_admin()` e `papel = 'master_admin'` |

- [ ] Grants: `select` a `authenticated` nas duas tabelas; nada a `anon`; nenhuma policy nem grant de escrita

**Verificação:** todos os casos verdes; teste guardião verde; advisors sem alerta de segurança.

### STEP 1.3 — Imutabilidade do `master_admin`
**Entrega:** o dono da empresa não pode ser rebaixado, movido nem desativado por engano.
- [ ] **Testes primeiro:** alterar `papel`, `tenant_id` ou `ativo` de um `master_admin` falha; o caminho do Admin SaaS (operação privilegiada explícita) continua possível; outros papéis não são afetados
- [ ] Migration `f01_protege_master_admin`: trigger em `profiles` que bloqueia essas alterações fora do caminho privilegiado (mecanismo exato — ex.: flag de sessão definida só pela Edge Function — fixado no PR e registrado aqui)

**Verificação:** testes verdes.

### STEP 1.4 — `eventos_auditoria`
**Entrega:** rastro imutável das ações privilegiadas.
- [ ] **Testes primeiro:** `super_admin` lê tudo; `master_admin` lê só eventos do próprio tenant; `admin`/`user` não leem; ninguém insere pelo cliente; `update` e `delete` falham **inclusive com `service_role`**
- [ ] Migration `f01_cria_eventos_auditoria`: tabela conforme `modelo-dados.md §5.3`, `check` de formato da `acao`, índices, trigger que impede `update`/`delete`, RLS, policies (`eventos_auditoria_select_super_admin`, `eventos_auditoria_select_master_admin`), grant `select` a `authenticated`

**Verificação:** testes verdes.

### STEP 1.5 — RPC `obter_meu_acesso()`
**Entrega:** o estado de acesso que os gates da Fase 2 vão consultar.
- [ ] **Testes primeiro:** retorna, só para o próprio usuário, `papel`, `nome`, `ativo`, `empresa_ativa` (nulo para `super_admin`) e `senha_provisoria`; funciona para usuário inativo e para empresa bloqueada **sem** expor nenhum outro dado; `anon` não executa
- [ ] Migration `f01_cria_rpc_obter_meu_acesso`: função em `public`, `security definer` (justificativa na decisão 6), `search_path` vazio, baseada em `auth.uid()`; `execute` só para `authenticated`
- [ ] Campos que dependem de fases futuras (ex.: `tem_perfil`, Fase 5) entram na fase da tabela correspondente

**Verificação:** testes verdes; advisors sem alerta (a função definer fica justificada no PR).

### STEP 1.6 — Configuração do Auth e política de senha
**Entrega:** Auth endurecido, igual em local e produção.
- [x] `config.toml`: senha com mínimo 8 e letras + números; cadastro público desligado (já na Fase 0) — chaves de configuração conferidas com `--help`/docs da versão do CLI *(antecipado no STEP 0.10, 07/11/2026: `minimum_password_length = 8`, `password_requirements = "letters_digits"`)*
- [x] Produção igual ao `config.toml` (mesmo mecanismo definido no STEP 0.10) *(dev e produção com `config push --remote` e `config diff --exit-code` sem diferença, 07/11/2026)*
- [ ] Registrar em `supabase/CLAUDE.md` *(sob autorização)* se o mecanismo de sincronização mudar algo da convenção

**Verificação:** no ambiente local, cadastro público pela API é recusado e senha fraca é recusada pelo Auth; Dashboard de produção confere.

### STEP 1.7 — Seed local
**Entrega:** dados fictícios para desenvolver e testar à mão a partir da Fase 2.
- [ ] `seed.sql` (só local): 3 empresas fictícias com CNPJ válido — 2 ativas e 1 bloqueada; 1 `super_admin`; em cada empresa ativa, 1 `master_admin`, 1 `admin`, 1 `user` e 1 usuário inativo; todos com senha local conhecida e e-mails em domínio reservado (`@exemplo.test`)
- [ ] Usuários do seed criados em `auth.users` com e-mail confirmado + `profiles` correspondentes
- [ ] Senhas locais documentadas no próprio seed (ambiente local apenas; nunca aplicado em produção)

**Verificação:** `db reset` recria tudo; login local com cada usuário do seed funciona via API.

### STEP 1.8 — Código compartilhado das Edge Functions
**Entrega:** blocos reutilizáveis para toda função privilegiada.
- [ ] **Testes primeiro (`deno test`)** para cada módulo abaixo
- [ ] Identificação do chamador pelo JWT, no padrão oficial vigente (conferido via Context7)
- [ ] Carga do profile do chamador com checagem de `ativo` e empresa ativa
- [ ] Cliente admin criado **por requisição** (nunca exportado como instância)
- [ ] Validação de entrada com schema tipado → erro 400 com mensagem pt-BR por campo
- [ ] Política de senha (mínimo 8, letras + números) e gerador de senha provisória (decisão 4)
- [ ] Registro em `eventos_auditoria` (com garantia de nunca incluir senha/token em `detalhes`)

**Verificação:** `deno fmt/lint/check/test` verdes; teste prova que o gerador nunca produz caractere ambíguo e sempre atende a política.

### STEP 1.9 — Edge Function `provisionar-usuario`
**Entrega:** criação de usuário em cascata, sem SMTP.
- [ ] **Testes primeiro** — regras de cascata como módulo puro (`deno test`):

  | Chamador | Pode criar | Condições | Falha |
  |---|---|---|---|
  | `super_admin` | `master_admin` | `tenant_id` informado, empresa existe e está ativa, empresa ainda sem `master_admin` | 404 empresa inexistente · 409 já tem `master_admin` · 403 empresa bloqueada |
  | `master_admin` | `admin`, `user` | sempre no **próprio** tenant (`tenant_id` do input é recusado) | 403 papel não permitido |
  | `admin`, `user`, inativo, empresa bloqueada | nada | — | 403 |
  | qualquer | — | e-mail já existente | 409 |

- [ ] Handler fino: valida entrada (`papel`, `nome`, `email`, `telefone?`, `tenant_id?`) → aplica a cascata → cria no Auth com senha provisória e `email_confirm: true` → cria o profile (`senha_provisoria = true`, `created_by` = chamador) → **se o profile falhar, remove o usuário do Auth** → grava `usuario.criado` → responde `{ data: { profile_id, email, senha_provisoria } }`
- [ ] A senha provisória aparece **só** nessa resposta — nunca em log, banco ou auditoria
- [ ] **Teste de integração** contra o Supabase local (usuários do seed): `super_admin` cria `master_admin` numa empresa sem dono; `master_admin` da empresa A tenta criar na B → 403; segundo `master_admin` → 409; e-mail repetido → 409; usuário recém-criado consegue autenticar com a senha provisória
- [ ] Teste de compensação: falha forçada na criação do profile não deixa usuário órfão no Auth
- [ ] Ajustar o pipeline (Fase 0) para rodar os testes de integração com as funções servidas localmente
- [ ] Campos de perfil, unidade e setor entram no contrato nas Fases 5–7

**Verificação:** unidade + integração verdes no CI; logs da função sem senha.

### STEP 1.10 — Edge Function `trocar-senha`
**Entrega:** a única forma de trocar a própria senha — e de sair da senha provisória.
- [ ] **Testes primeiro** (`deno test` + integração local):
  - com `senha_provisoria = true`: troca sem exigir senha atual; desmarca `senha_provisoria` e grava `senha_alterada_em`;
  - com `senha_provisoria = false`: exige `senha_atual` correta (401 se errada);
  - nova senha fora da política → 400; igual à atual → 400;
  - usuário inativo ou de empresa bloqueada → 403;
  - não existe chamada que desmarque `senha_provisoria` sem trocar a senha
- [ ] Handler: identifica o chamador → valida → (se exigido) confere a senha atual → troca no Auth → atualiza o profile → encerra as demais sessões → grava `usuario.senha_alterada` → `{ data: { ok: true } }`
- [ ] Mecanismo de "encerrar as demais sessões" conferido na documentação atual do Auth e registrado no PR

**Verificação:** testes verdes; tentativa de update direto em `profiles` pelo cliente continua negada (já coberta no 1.2).

### STEP 1.11 — Primeiro `super_admin` em produção 📋
**Entrega:** o dono do SaaS existe em produção, sem nenhum atalho no código.
- [ ] 📋 Danilo, uma única vez, no Dashboard do projeto `maxis`:
  1. Auth → criar usuário com o e-mail do Danilo, senha temporária forte, **e-mail confirmado**;
  2. SQL Editor → `insert` do profile com `papel = 'super_admin'`, `tenant_id` nulo, `nome`, `email`, `senha_provisoria = true` — o texto exato do comando fica no PR deste STEP (sem o e-mail);
  3. SQL Editor → `insert` em `eventos_auditoria` com `acao = 'usuario.criado'`, `ator_profile_id` nulo e `detalhes` indicando bootstrap
- [ ] Exceção documentada: é uma operação de **dados**, única; schema continua só por migration (`supabase/CLAUDE.md §2`)
- [ ] Conferência via MCP (somente leitura): exatamente 1 `super_admin`, com `tenant_id` nulo, e o evento registrado
- [ ] A troca da senha temporária acontece no primeiro login, quando a Fase 2 estiver no ar

**Verificação:** conferência via MCP registrada no log do `project_manager.md` (sem dados pessoais).

### STEP 1.12 — Fechamento da fase
- [ ] Advisors de segurança e performance: zero alerta de segurança
- [ ] Tipos do frontend regenerados a partir do schema final da fase
- [ ] `modelo-dados.md` conferido contra o banco real (via MCP, somente leitura)
- [ ] Pendência de governança #5 aplicada no `CLAUDE.md §5` *(sob autorização)*
- [ ] `project_manager.md`: entregáveis ✅, Fase 1 ✅, progresso, log; fase ativa → Fase 2

**Verificação:** todos os critérios de aceite (§5) conferidos.

## 5. Critérios de aceite da fase

1. Testes pgTAP de `empresas`, `profiles` e `eventos_auditoria` cobrindo os casos mínimos de `supabase/CLAUDE.md §7` — verdes; teste guardião verde.
2. Usuário inativo ou de empresa bloqueada recebe **zero linhas** em qualquer tabela de tenant (exceto o próprio profile) e `obter_meu_acesso()` informa o motivo corretamente.
3. `super_admin` não enxerga dados de tenant além de `empresas` e dos `master_admin`.
4. Nenhuma escrita do cliente em `empresas`, `profiles` ou `eventos_auditoria` — provado por teste.
5. `eventos_auditoria` imutável, inclusive para `service_role`.
6. `provisionar-usuario`: matriz de cascata verde (unidade + integração); compensação provada; senha provisória ausente de logs, banco e auditoria.
7. `trocar-senha`: impossível sair da senha provisória sem trocar a senha; política aplicada; troca voluntária exige a senha atual.
8. Auth local e de produção: cadastro público recusado; política de senha ativa.
9. Advisors sem alerta de segurança.
10. Exatamente um `super_admin` em produção, com `tenant_id` nulo.
11. `modelo-dados.md` e tipos do frontend batem com o banco real.

## 6. Modelagem de dados afetada

Referência: `modelo-dados.md` §3 (`papel_usuario`), §4 (funções `private.*` e RPC `obter_meu_acesso`), §5.1 `empresas`, §5.2 `profiles` (colunas da Fase 1), §5.3 `eventos_auditoria`, §10 (matriz), §11 (ordem da Fase 1).
Atualizações feitas no `modelo-dados.md` junto com este plano: RPC `obter_meu_acesso()`; escrita em `profiles` só por Edge Function (inclusive a troca de senha); ação de auditoria `usuario.senha_alterada`.

## 7. Rotas, Edge Functions e RPCs

| Tipo | Item | Quem chama | Observação |
|---|---|---|---|
| Rota | — | — | nenhuma tela nesta fase |
| Edge Function | `provisionar-usuario` | `super_admin` (→ `master_admin`), `master_admin` (→ `admin`/`user`) | usada pelas telas das Fases 4 e 7 |
| Edge Function | `trocar-senha` | qualquer usuário autenticado ativo | usada pela Fase 2 (obrigatória) e pela Fase 3 (voluntária) |
| RPC | `obter_meu_acesso()` | qualquer usuário autenticado | usada pelos gates da Fase 2 |

## 8. Riscos e atenção

- **API das Edge Functions muda com frequência:** conferir o padrão de autenticação e os nomes de variáveis antes do STEP 1.8; não confiar em exemplo antigo.
- **Sessões já emitidas:** encerrar sessões revoga a renovação, mas um token de acesso já emitido vale até expirar. O corte de **dados** é imediato pela RLS (`tenant_atual()` retorna nulo para inativo/bloqueado) — esse é o mecanismo de segurança; o encerramento de sessão é complementar.
- **`security definer`:** só em `private` e na RPC `obter_meu_acesso()` (justificada); qualquer outra ocorrência é motivo de bloqueio do PR.
- **Repositório público:** comandos do bootstrap e fixtures sem dados pessoais reais.

## 9. Status dos Entregáveis

| # | Entregável | STEP | Status |
|---|---|---|---|
| 1 | Schema `private`, utilitários e helpers de teste | 1.1 | ⬜ |
| 2 | `empresas`, `profiles` e funções de RLS com isolamento provado | 1.2 | ⬜ |
| 3 | Imutabilidade do `master_admin` | 1.3 | ⬜ |
| 4 | `eventos_auditoria` imutável | 1.4 | ⬜ |
| 5 | RPC `obter_meu_acesso()` | 1.5 | ⬜ |
| 6 | Auth endurecido e política de senha (local + produção) | 1.6 | ⬜ |
| 7 | Seed local | 1.7 | ⬜ |
| 8 | Código compartilhado das Edge Functions | 1.8 | ⬜ |
| 9 | Edge Function `provisionar-usuario` | 1.9 | ⬜ |
| 10 | Edge Function `trocar-senha` | 1.10 | ⬜ |
| 11 | Primeiro `super_admin` em produção | 1.11 | ⬜ |
| 12 | Fechamento da fase | 1.12 | ⬜ |
